/**
 * Tree Node Generator — decides if a journal entry warrants a new life node
 * and determines its type, parent, and metadata.
 *
 * Node types:
 * - milestone: significant achievement or life event
 * - choice: explicit decision point
 * - insight: moment of self-awareness
 * - crisis: conflict, breakdown, or major stress
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Journal, LifeNode } from '@/types';
import { generateJson, getPrimaryModel, type AIUsageContext } from '@/lib/ai/client';

const NODE_EVAL_PROMPT = `Evaluate whether this journal entry represents a significant life event worth placing on a "Destiny Tree" visualization.

A node should be created ONLY if the entry describes:
- A concrete decision with consequences (type: "choice")
- A significant life event or achievement (type: "milestone")
- A genuine moment of self-awareness or breakthrough (type: "insight")
- A crisis, breakdown, conflict, or major stress (type: "crisis")

Do NOT create nodes for routine entries, daily complaints, or minor events.

Output ONLY valid JSON:
{
  "should_create": true/false,
  "type": "milestone|choice|insight|crisis",
  "title": "short title for the node (3-8 words)",
  "reason": "why this deserves a tree node (1 sentence)"
}

If should_create is false, still provide type/title/reason as null.`;

interface NodeEvaluation {
  shouldCreate: boolean;
  type: 'milestone' | 'choice' | 'insight' | 'crisis';
  title: string;
}

/**
 * Evaluate if a journal should generate a tree node.
 */
async function evaluateForNode(
  content: string,
  aiSummary: string | null,
  model?: string,
  usage?: AIUsageContext
): Promise<NodeEvaluation | null> {
  try {
    const input = aiSummary
      ? `Summary: ${aiSummary}\n\nFull entry:\n${content.slice(0, 1000)}`
      : content.slice(0, 1500);

    const parsed = await generateJson<{
      should_create: boolean;
      type: NodeEvaluation['type'];
      title: string;
    }>({
      model: model || getPrimaryModel(),
      maxTokens: 200,
      system: NODE_EVAL_PROMPT,
      usage,
      messages: [{ role: 'user', content: input }],
    });

    if (!parsed) return null;
    if (!parsed.should_create) return null;

    return {
      shouldCreate: true,
      type: parsed.type,
      title: parsed.title,
    };
  } catch (error) {
    console.error('Node evaluation error:', error);
    return null;
  }
}

/**
 * Find the best parent node for a new node.
 * Strategy: most recent node that shares themes, or the root.
 */
async function findParentNode(
  supabase: SupabaseClient,
  userId: string,
  themes: string[]
): Promise<string | null> {
  // Try to find a recent node with overlapping themes
  if (themes.length > 0) {
    const { data: themeMatch } = await supabase
      .from('life_nodes')
      .select('id')
      .eq('user_id', userId)
      .overlaps('themes', themes)
      .order('created_at', { ascending: false })
      .limit(1);

    if (themeMatch && themeMatch.length > 0) {
      return themeMatch[0].id;
    }
  }

  // Fall back to most recent node
  const { data: latest } = await supabase
    .from('life_nodes')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  return latest && latest.length > 0 ? latest[0].id : null;
}

/**
 * Attempt to generate a tree node from a journal entry.
 * Returns the created node or null if the entry doesn't warrant one.
 */
export async function maybeGenerateNode(
  supabase: SupabaseClient,
  journal: Journal,
  userId: string,
  model?: string,
  usage?: AIUsageContext
): Promise<LifeNode | null> {
  const evaluation = await evaluateForNode(
    journal.content,
    journal.ai_summary,
    model,
    usage
  );
  if (!evaluation) return null;

  const parentId = await findParentNode(supabase, userId, journal.themes);

  // Count existing nodes to calculate position
  const { count } = await supabase
    .from('life_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const nodeCount = count || 0;

  const { data: node } = await supabase
    .from('life_nodes')
    .insert({
      user_id: userId,
      title: evaluation.title,
      date: journal.created_at,
      type: evaluation.type,
      themes: journal.themes,
      emotions: journal.emotions,
      parent_id: parentId,
      ai_summary: journal.ai_summary,
      status: 'active',
      is_auto: true,
      journal_ids: [journal.id],
      position_x: 0,
      position_y: nodeCount * 100, // temporary; layout engine recalculates
    })
    .select()
    .single();

  return node as LifeNode;
}
