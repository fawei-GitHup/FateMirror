import { getAuthContext } from '@/lib/api/auth';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/errors';
import { processJournal } from '@/lib/pipeline/journal-processor';
import { getDailyAIUsageDecision, getDailyAIUsageSummary } from '@/lib/ai/usage.ts';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { NextResponse } from 'next/server';
import type { Journal, Subscription } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/journal/process
 * Triggers the full journal processing pipeline.
 * Body: { journalId: string }
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { journalId } = await req.json();
    if (!journalId) return badRequest('journalId is required');

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    const plan = resolvePlan((subscriptionData as Subscription | null) ?? null);
    const usageDecision = getDailyAIUsageDecision(
      await getDailyAIUsageSummary(supabase, user.id, todayStart.toISOString()),
      getEntitlements(plan),
      false
    );

    if (!usageDecision.allowed) {
      return NextResponse.json(
        {
          error: 'Daily AI limit reached for journal processing',
          code: usageDecision.reason,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const { data: journalData, error: fetchError } = await supabase
      .from('journals')
      .select('*')
      .eq('id', journalId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !journalData) return notFound('Journal not found');

    const result = await processJournal(
      supabase,
      journalData as Journal,
      user.id,
      plan
    );

    return NextResponse.json({ result });
  } catch (error) {
    return serverError(error, 'journal/process');
  }
}
