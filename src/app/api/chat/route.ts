import {
  estimateTokens,
  streamText,
  type AIUsageContext,
} from '@/lib/ai/client';
import { getAIProviderStatus } from '@/lib/ai/status';
import { buildSystemPrompt, buildUserContext } from '@/lib/ai/prompts/lao-mo-system';
import { GUIDED_SESSION_PROMPT } from '@/lib/ai/prompts/guided-session';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { buildAIRequestConfig, canServeAIRequest } from '@/lib/ai/user-config.ts';
import { getDailyAIUsageDecision, getDailyAIUsageSummary } from '@/lib/ai/usage.ts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  Conversation,
  HabitLoop,
  Journal,
  Pattern,
  Profile,
  Subscription,
} from '@/types';
import {
  detectCrisisLanguage,
  getCrisisSupportMessage,
} from '@/lib/safety/crisis-detection';

export const runtime = 'nodejs';
export const maxDuration = 60;

function formatPatternContext(
  patterns: Pattern[],
  habitLoops: HabitLoop[],
  recentJournals: Journal[]
) {
  const sections: string[] = [];

  if (patterns.length > 0) {
    sections.push(
      [
        'Recurring patterns:',
        ...patterns.map((pattern, index) => {
          const quotes = pattern.user_quotes.slice(0, 2).map((quote) => `"${quote}"`).join(' | ');
          return `${index + 1}. ${pattern.name} (seen ${pattern.trigger_count}x, last ${pattern.last_seen.slice(0, 10)}). Quotes: ${quotes || 'No stored quotes yet.'}`;
        }),
      ].join('\n')
    );
  }

  if (habitLoops.length > 0) {
    sections.push(
      [
        'Active habit loops:',
        ...habitLoops.map(
          (loop, index) =>
            `${index + 1}. ${loop.name}: cue=${loop.cue}; response=${loop.response}; hidden_cost=${loop.hidden_cost || 'Not captured yet.'}`
        ),
      ].join('\n')
    );
  }

  if (recentJournals.length > 0) {
    sections.push(
      [
        'Recent journal context:',
        ...recentJournals.map(
          (journal, index) =>
            `${index + 1}. ${journal.created_at.slice(0, 10)} - ${journal.title || 'Untitled'}: ${journal.ai_summary || journal.content.slice(0, 160)}`
        ),
      ].join('\n')
    );
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined;
}

function isNewChatSession(
  messages: { role: string; content: string }[],
  mode: string
): boolean {
  if (mode !== 'chat') {
    return false;
  }

  const userMessages = messages.filter((message) => message.role === 'user');
  const assistantMessages = messages.filter((message) => message.role === 'assistant');
  return userMessages.length === 1 && assistantMessages.length === 0;
}

function getAIUsageLimitMessage(reason: 'daily_request_limit' | 'daily_token_limit' | 'daily_cost_limit') {
  switch (reason) {
    case 'daily_request_limit':
      return 'Free plan daily AI request limit reached';
    case 'daily_token_limit':
      return 'Free plan daily AI token limit reached';
    case 'daily_cost_limit':
      return 'Free plan daily AI budget reached';
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, mode = 'chat', journalId = null, aiConfig = null } = await req.json();

    const latestUserMessage = [...messages]
      .reverse()
      .find((message: { role: string; content: string }) => message.role === 'user');

    if (latestUserMessage?.content && detectCrisisLanguage(latestUserMessage.content)) {
      const supportMessage = getCrisisSupportMessage();

      await supabase.from('conversations').insert([
        {
          user_id: user.id,
          journal_id: journalId,
          role: 'user',
          content: latestUserMessage.content,
          tokens_used: estimateTokens(latestUserMessage.content),
        } satisfies Partial<Conversation>,
        {
          user_id: user.id,
          journal_id: journalId,
          role: 'assistant',
          content: supportMessage,
          tokens_used: estimateTokens(supportMessage),
        } satisfies Partial<Conversation>,
      ]);

      const encoder = new TextEncoder();
      const emergencyStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: supportMessage })}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(emergencyStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Use UTC to ensure consistent rate limiting across timezones
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      { data: profileData },
      { data: patternData },
      { data: habitLoopData },
      { data: recentJournalData },
      { data: subscriptionData },
      { count: chatSessionCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase
        .from('patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false })
        .limit(3),
      supabase
        .from('habit_loops')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'breaking', 'observed'])
        .order('last_seen', { ascending: false })
        .limit(2),
      supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('journal_id', null)
        .eq('role', 'user')
        .gte('created_at', todayStart.toISOString()),
    ]);

    const profile = profileData as Profile | null;
    const patterns = (patternData as Pattern[]) || [];
    const habitLoops = (habitLoopData as HabitLoop[]) || [];
    const recentJournals = (recentJournalData as Journal[]) || [];
    const subscription = (subscriptionData as Subscription | null) ?? null;
    const aiStatus = getAIProviderStatus();
    const plan = resolvePlan(subscription);
    const aiRequestConfig = buildAIRequestConfig(plan, aiConfig, 'chat');
    const entitlements = getEntitlements(plan);
    const patternContext = formatPatternContext(patterns, habitLoops, recentJournals);
    const bypassPlatformLimits = aiRequestConfig.source === 'user';

    if (!canServeAIRequest(aiStatus.available, aiRequestConfig)) {
      return new Response(
        JSON.stringify({
          error:
            'Lao Mo is not available yet. Configure a server AI key or save your own API key in Settings first.',
          code: 'AI_NOT_CONFIGURED',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (
      isNewChatSession(messages, mode) &&
      entitlements.chatSessionsPerDay !== null &&
      (chatSessionCount ?? 0) >= entitlements.chatSessionsPerDay
    ) {
      return new Response(
        JSON.stringify({
          error: 'Free plan daily chat limit reached',
          upgradeRequired: true,
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dailyUsage = await getDailyAIUsageSummary(
      supabase,
      user.id,
      todayStart.toISOString()
    );
    const usageDecision = getDailyAIUsageDecision(
      dailyUsage,
      entitlements,
      bypassPlatformLimits
    );

    if (!usageDecision.allowed && usageDecision.reason) {
      return new Response(
        JSON.stringify({
          error: getAIUsageLimitMessage(usageDecision.reason),
          upgradeRequired: true,
          code: usageDecision.reason.toUpperCase(),
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt with cognition awareness
    let systemPrompt: string;

    const profileOptions = profile ? {
      displayName: profile.display_name || undefined,
      lifeContext: profile.life_context || undefined,
      levelName: profile.level_name,
      thinkingLevel: profile.thinking_level_overall,
      thinkingDistortions: profile.thinking_distortions,
      behaviorPrimary: profile.behavior_primary || undefined,
      behaviorSecondary: profile.behavior_secondary || undefined,
      behaviorScores: profile.behavior_scores as Record<string, number>,
    } : undefined;

    if (mode === 'guided') {
      // Guided mode: dedicated prompt with user context appended (no duplicate Lao Mo personality)
      systemPrompt = GUIDED_SESSION_PROMPT + '\n' + buildUserContext({
        userProfile: profileOptions,
        patternContext,
      });
    } else {
      // Free chat mode: full Lao Mo personality + user context + output format
      systemPrompt = buildSystemPrompt({
        userProfile: profileOptions,
        patternContext,
      });
    }

    if (latestUserMessage?.content) {
      await supabase.from('conversations').insert({
        user_id: user.id,
        journal_id: journalId,
        role: 'user',
        content: latestUserMessage.content,
        tokens_used: estimateTokens(latestUserMessage.content),
      } satisfies Partial<Conversation>);
    }

    // Convert provider stream to ReadableStream for the client
    const usageContext: AIUsageContext = {
      supabase,
      userId: user.id,
      feature: mode === 'guided' ? 'guided_chat' : 'chat',
      plan,
      journalId,
      usedUserKey: aiRequestConfig.source === 'user',
    };
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let assistantText = '';
        try {
          for await (const text of streamText({
            model: aiRequestConfig.model,
            provider: aiRequestConfig.provider ?? undefined,
            apiKey: aiRequestConfig.apiKey,
            baseUrl: aiRequestConfig.baseUrl,
            maxTokens: 1024,
            system: systemPrompt,
            usage: usageContext,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          })) {
            assistantText += text;
            const chunk = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }

          if (assistantText.trim().length > 0) {
            await supabase.from('conversations').insert({
              user_id: user.id,
              journal_id: journalId,
              role: 'assistant',
              content: assistantText,
              tokens_used: estimateTokens(assistantText),
            } satisfies Partial<Conversation>);
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
