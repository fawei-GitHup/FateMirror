/**
 * Behavior Detector — identifies 6 behavior archetypes from journal text.
 *
 * Archetypes: over-compensate, avoid, please, control, prove, victim
 * Uses Claude to detect patterns with confidence scores.
 */

import { generateJson, getLightModel, type AIUsageContext } from '@/lib/ai/client';
import type { BehaviorAnalysis, BehaviorArchetype, BehaviorMatch } from '@/types/cognition';

const BEHAVIOR_ANALYSIS_PROMPT = `Detect behavior patterns in this journal entry.

Behavior Pattern Archetypes:
1. Over-Compensator: Overperforms in area A to compensate insecurity in area B.
   Signals: "At least I can...", disproportionate effort, using money/work to fix emotional issues.

2. Avoider: Sidesteps real problems by addressing peripheral ones.
   Signals: "Forget it", "I'll deal with it later", describing conflicts without any resolution attempt.

3. People-Pleaser: Sacrifices own boundaries to maintain relationships.
   Signals: "I promised...", "I couldn't say no", many "should"s for others, rare "I want/need".

4. Controller: Manages external variables to ease internal anxiety.
   Signals: Over-planning, micro-managing, difficulty delegating, discomfort with uncertainty.

5. Prover: Uses achievement to validate self-worth.
   Signals: Can't stop working, fears being seen as "not enough", ties identity to output.

6. Victim-Loop: Attributes failures to fate, luck, or others.
   Signals: "Why does this always happen to me?", "It's not fair", passive language.

Note: Users typically exhibit 2-3 overlapping patterns. Only include patterns with clear evidence.

Output ONLY valid JSON:
{
  "patterns": [
    {"type": "over-compensate", "confidence": 0.82, "evidence": "exact quote..."},
    {"type": "please", "confidence": 0.65, "evidence": "exact quote..."}
  ]
}`;

/**
 * Detect behavior archetypes from journal content.
 */
export async function detectBehavior(
  content: string,
  model?: string,
  usage?: AIUsageContext
): Promise<BehaviorAnalysis | null> {
  try {
    const parsed = await generateJson<{
      patterns: { type: string; confidence: number; evidence: string }[];
    }>({
      model: model || getLightModel(),
      maxTokens: 300,
      system: BEHAVIOR_ANALYSIS_PROMPT,
      usage,
      messages: [{ role: 'user', content }],
    });

    if (!parsed) return null;

    const patterns: BehaviorMatch[] = (parsed.patterns || []).map(
      (p: { type: string; confidence: number; evidence: string }) => ({
        type: p.type as BehaviorArchetype,
        confidence: p.confidence,
        evidence: p.evidence || '',
      })
    );

    // Sort by confidence descending
    patterns.sort((a, b) => b.confidence - a.confidence);

    return {
      patterns,
      primary: patterns.length > 0 ? patterns[0].type : null,
      evidence: patterns.length > 0 ? patterns[0].evidence : '',
    };
  } catch (error) {
    console.error('Behavior detection error:', error);
    return null;
  }
}
