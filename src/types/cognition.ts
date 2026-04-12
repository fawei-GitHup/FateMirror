// Cognition diagnosis types — the theoretical core of FateMirror

import type { ThinkingLevel } from './database';

// ============================================
// Thinking Layer (思维模式层)
// ============================================

export interface ThinkingAnalysis {
  level: ThinkingLevel;
  evidence: string;
  distortions: CognitiveDistortion[];
  upgradeHint: string;
}

export type CognitiveDistortion =
  | 'catastrophize'       // Worst-case scenario thinking
  | 'black-white'         // All-or-nothing thinking
  | 'overgeneralize'      // "I always..." / "It never..."
  | 'mind-reading'        // Assuming what others think
  | 'should-statements'   // Rigid rules about self/others
  | 'emotional-reasoning' // "I feel it, so it must be true"
  | 'personalize'         // Taking blame for everything
  | 'mental-filter';      // Only seeing the negative

// ============================================
// Behavior Layer (行为模式层)
// ============================================

export type BehaviorArchetype =
  | 'over-compensate'  // Overperforms in A to compensate insecurity in B
  | 'avoid'            // Sidesteps real problems
  | 'please'           // Sacrifices own boundaries for others
  | 'control'          // Manages externals to ease internal anxiety
  | 'prove'            // Uses achievement to validate self-worth
  | 'victim';          // Attributes failures to external forces

export interface BehaviorMatch {
  type: BehaviorArchetype;
  confidence: number;  // 0-1
  evidence: string;
}

export interface BehaviorAnalysis {
  patterns: BehaviorMatch[];
  primary: BehaviorArchetype | null;
  evidence: string;
}

// ============================================
// Habit Layer (习惯固化层)
// ============================================

export interface HabitLoopAnalysis {
  name: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  hiddenCost: string;
  userQuotes: string[];
}

// ============================================
// Combined AI Output (hidden JSON from each response)
// ============================================

export interface AICognitionOutput {
  emotions_detected: string[];
  themes_detected: string[];
  thinking_level: ThinkingLevel;
  thinking_evidence: string;
  thinking_distortions: CognitiveDistortion[];
  behavior_patterns: BehaviorArchetype[];
  behavior_evidence: string;
  habit_loop_match: string | null;  // existing loop ID if matched
  suggested_intervention: string;
}

// ============================================
// Mindset Dimensions (思维维度 — 穷人/富人思维)
// ============================================

export interface MindsetScores {
  time_horizon: number;    // 0=short-term only, 1=long-term planning
  causal_width: number;    // 0=single cause, 1=multi-factor analysis
  risk_attitude: number;   // 0=fear-driven, 1=calculated risk-taking
  resource_view: number;   // 0=zero-sum, 1=abundance mindset
  action_mode: number;     // 0=wait-until-ready, 1=iterate-fast
}

// ============================================
// Cognition Dashboard Data
// ============================================

export interface CognitionDashboard {
  thinkingLevel: ThinkingLevel;
  thinkingByTheme: Record<string, ThinkingLevel>;
  topDistortions: CognitiveDistortion[];
  behaviorTop3: BehaviorMatch[];
  activeLoops: {
    id: string;
    name: string;
    triggerCount: number;
    status: string;
    lastSeen: string;
  }[];
  mindsetScores: MindsetScores | null;
  cognitionVersion: number;
  journalCount: number;
}
