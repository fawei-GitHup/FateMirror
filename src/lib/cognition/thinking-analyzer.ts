/**
 * Thinking Analyzer — diagnoses thinking level (L1-L4) from journal text.
 *
 * Uses Claude to analyze the user's causal reasoning depth and detect
 * cognitive distortions (CBT framework).
 */

import { generateJson, getLightModel, type AIUsageContext } from '@/lib/ai/client';
import type { ThinkingAnalysis, CognitiveDistortion } from '@/types/cognition';
import type { ThinkingLevel } from '@/types';

const THINKING_ANALYSIS_PROMPT = `Analyze the user's thinking level in this journal entry.

Thinking Level Criteria:
- L1 (Point): Single-cause attribution. "It's because of X." No other factors considered.
  Signals: frequent "because...", external blame, no "on the other hand", only events no analysis.
- L2 (Linear): Can see one cause-effect chain. "A causes B causes C."
  Signals: "if...then...", but only one chain, linear solutions ("if only I had more money").
- L3 (Systemic): Sees multiple factors interacting. "A, B, C are all connected."
  Signals: "on one hand...on the other...", multiple variables, but may have analysis paralysis.
- L4 (Meta): Sees structural patterns and leverage points. "The real issue is the system itself."
  Signals: identifies deep structures, finds root causes, distinguishes symptoms from disease.

Also detect cognitive distortions (CBT):
- catastrophize: "Everything is ruined"
- black-white: "Either perfect or worthless"
- overgeneralize: "I always...", "It never..."
- mind-reading: "She must think I'm..."
- should-statements: "I should be able to..."
- emotional-reasoning: "I feel X therefore X is true"
- personalize: "It's all my fault"
- mental-filter: Only seeing the negative

Output ONLY valid JSON:
{
  "thinking_level": "L1|L2|L3|L4",
  "evidence": "exact quote from the journal that demonstrates this level",
  "distortions": ["distortion1", "distortion2"],
  "upgrade_question": "A question Lao Mo could ask to push user to next level"
}`;

/**
 * Analyze thinking level from journal content.
 */
export async function analyzeThinking(
  content: string,
  model?: string,
  usage?: AIUsageContext
): Promise<ThinkingAnalysis | null> {
  try {
    const parsed = await generateJson<{
      thinking_level: ThinkingLevel;
      evidence: string;
      distortions: CognitiveDistortion[];
      upgrade_question: string;
    }>({
      model: model || getLightModel(),
      maxTokens: 300,
      system: THINKING_ANALYSIS_PROMPT,
      usage,
      messages: [{ role: 'user', content }],
    });

    if (!parsed) return null;

    return {
      level: parsed.thinking_level as ThinkingLevel,
      evidence: parsed.evidence || '',
      distortions: (parsed.distortions || []) as CognitiveDistortion[],
      upgradeHint: parsed.upgrade_question || '',
    };
  } catch (error) {
    console.error('Thinking analysis error:', error);
    return null;
  }
}
