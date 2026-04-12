import { getAuthContext } from '@/lib/api/auth';
import { badRequest, serverError, unauthorized } from '@/lib/api/errors';
import { generateJson, type AIUsageContext } from '@/lib/ai/client';
import {
  detectCrisisLanguage,
  getCrisisSupportMessage,
} from '@/lib/safety/crisis-detection';
import { TAG_EXTRACT_PROMPT } from '@/lib/ai/prompts/tag-extract';
import { buildAIRequestConfig, canServeAIRequest } from '@/lib/ai/user-config.ts';
import { getAIProviderStatus } from '@/lib/ai/status';
import { getDailyAIUsageDecision, getDailyAIUsageSummary } from '@/lib/ai/usage.ts';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import type { Subscription } from '@/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/journal/extract
 * Extracts six-dimension tags from freewrite content using AI.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { content, aiConfig = null } = await req.json();

    if (!content || content.trim().length === 0) {
      return badRequest('Content is required');
    }

    if (detectCrisisLanguage(content)) {
      return NextResponse.json(
        {
          crisis: true,
          supportMessage: getCrisisSupportMessage(),
        },
        { status: 422 }
      );
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    const plan = resolvePlan((subscriptionData as Subscription | null) ?? null);
    const aiStatus = getAIProviderStatus();
    const aiRequestConfig = buildAIRequestConfig(plan, aiConfig, 'pipeline');
    const usageDecision = getDailyAIUsageDecision(
      await getDailyAIUsageSummary(supabase, user.id, todayStart.toISOString()),
      getEntitlements(plan),
      aiRequestConfig.source === 'user'
    );

    if (!canServeAIRequest(aiStatus.available, aiRequestConfig)) {
      return serverError(
        new Error('No AI provider is configured for extraction'),
        'journal/extract/config'
      );
    }

    if (!usageDecision.allowed) {
      return NextResponse.json(
        {
          error: 'Daily AI limit reached for journal extraction',
          code: usageDecision.reason,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const usageContext: AIUsageContext = {
      supabase,
      userId: user.id,
      feature: 'journal_extract',
      plan,
      usedUserKey: aiRequestConfig.source === 'user',
    };

    const tags = await generateJson<Record<string, unknown>>({
      model: aiRequestConfig.model,
      provider: aiRequestConfig.provider ?? undefined,
      apiKey: aiRequestConfig.apiKey,
      baseUrl: aiRequestConfig.baseUrl,
      maxTokens: 512,
      system: TAG_EXTRACT_PROMPT,
      usage: usageContext,
      messages: [{ role: 'user', content: content.trim() }],
    });

    if (!tags) {
      return serverError(new Error('AI returned no parseable JSON'), 'journal/extract');
    }

    return NextResponse.json(tags);
  } catch (error) {
    return serverError(error, 'journal/extract');
  }
}
