// Auto-generated types from Supabase schema
// Keep in sync with supabase/migrations/001_initial_schema.sql

export type ThinkingLevel = 'L1' | 'L2' | 'L3' | 'L4';
export type JournalMode = 'guided' | 'freewrite';
export type PatternStatus = 'active' | 'breaking' | 'resolved';
export type HabitLoopStatus = 'active' | 'observed' | 'breaking' | 'broken';
export type NodeType = 'milestone' | 'choice' | 'insight' | 'crisis';
export type NodeStatus = 'active' | 'resolved' | 'recurring';
export type ChapterStatus = 'open' | 'closed';
export type PlanType = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  level: number;
  level_name: string;
  life_context: string | null;
  personality: string | null;
  core_values: string[];

  // Cognition Profile
  thinking_level_overall: ThinkingLevel;
  thinking_levels_by_theme: Record<string, ThinkingLevel>;
  thinking_distortions: string[];
  behavior_primary: string | null;
  behavior_secondary: string | null;
  behavior_scores: Record<string, number>;
  mindset_scores: Record<string, number>;
  cognition_version: number;
  cognition_updated_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface Journal {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mode: JournalMode | null;

  // Six-dimension tags
  emotions: string[];
  themes: string[];
  decisions: string[];
  insights: string[];
  thinking_patterns: string[];
  behavior_patterns: string[];
  ai_summary: string | null;
  ai_cognition_note: string | null;

  // Pattern detection
  pattern_ids: string[];
  habit_loop_ids: string[];
  loop_count: number;

  // Metadata
  word_count: number;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Pattern {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  themes: string[];
  thinking_root: string | null;
  behavior_root: string | null;
  trigger_count: number;
  first_seen: string;
  last_seen: string;
  status: PatternStatus;
  journal_ids: string[];
  user_quotes: string[];
  created_at: string;
}

export interface HabitLoop {
  id: string;
  user_id: string;
  name: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  hidden_cost: string | null;
  behavior_type: string;
  thinking_type: string | null;
  trigger_count: number;
  first_seen: string;
  last_seen: string;
  status: HabitLoopStatus;
  pattern_id: string | null;
  journal_ids: string[];
  user_quotes: string[];
  breaking_since: string | null;
  created_at: string;
}

export interface ActionTask {
  id: string;
  user_id: string;
  title: string;
  reason: string | null;
  prompt: string;
  source: 'system';
  status: 'active' | 'completed' | 'dismissed';
  habit_loop_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface LifeNode {
  id: string;
  user_id: string;
  title: string;
  date: string;
  type: NodeType;
  themes: string[];
  emotions: string[];
  parent_id: string | null;
  ai_summary: string | null;
  user_reflection: string | null;
  status: NodeStatus;
  is_auto: boolean;
  chapter_id: string | null;
  journal_ids: string[];
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  user_id: string;
  number: number;
  title: string;
  subtitle: string | null;
  date_start: string | null;
  date_end: string | null;
  themes: string[];
  ai_narrative: string | null;
  status: ChapterStatus;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  journal_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  billing_provider: 'creem' | 'paypal' | null;
  creem_customer_id: string | null;
  creem_subscription_id: string | null;
  paypal_order_id: string | null;
  paypal_transaction_id: string | null;
  paypal_payer_email: string | null;
  paypal_verified_at: string | null;
  plan: PlanType;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIUsageEvent {
  id: string;
  user_id: string;
  journal_id: string | null;
  provider: string;
  model: string;
  feature: string;
  plan: PlanType;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  request_count: number;
  estimated_cost_usd: number;
  platform_cost_usd: number;
  used_user_key: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}
