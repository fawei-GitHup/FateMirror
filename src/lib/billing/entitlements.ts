import type { PlanType, Subscription } from '@/types';

export interface Entitlements {
  chatSessionsPerDay: number | null;
  guidedSessionsPerMonth: number | null;
  treeNodeLimit: number | null;
  chaptersEnabled: boolean;
  maxLevel: number | null;
  aiRequestsPerDay: number | null;
  aiTokensPerDay: number | null;
  aiCostUsdPerDay: number | null;
}

const ENTITLEMENTS: Record<PlanType, Entitlements> = {
  free: {
    chatSessionsPerDay: 3,          // 3 guided sessions/day (DeepSeek = near-zero cost)
    guidedSessionsPerMonth: null,
    treeNodeLimit: 10,              // Generous free tier to prove value
    chaptersEnabled: false,
    maxLevel: 2,
    aiRequestsPerDay: 40,
    aiTokensPerDay: 120000,
    aiCostUsdPerDay: 0.2,
  },
  pro: {
    chatSessionsPerDay: 5,          // 5 guided sessions/day (Sonnet = cost control)
    guidedSessionsPerMonth: 150,
    treeNodeLimit: null,
    chaptersEnabled: true,
    maxLevel: null,
    aiRequestsPerDay: null,
    aiTokensPerDay: null,
    aiCostUsdPerDay: null,
  },
};

export function resolvePlan(subscription: Subscription | null | undefined): PlanType {
  return subscription?.plan === 'pro' ? 'pro' : 'free';
}

export function getEntitlements(plan: PlanType): Entitlements {
  return ENTITLEMENTS[plan];
}

export function capLevelForPlan(level: number, plan: PlanType): number {
  const maxLevel = ENTITLEMENTS[plan].maxLevel;
  return maxLevel === null ? level : Math.min(level, maxLevel);
}
