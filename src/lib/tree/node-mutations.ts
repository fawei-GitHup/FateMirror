import type { LifeNode, NodeStatus, NodeType } from '@/types';

type MutableLifeNodeFields = Pick<
  LifeNode,
  | 'title'
  | 'date'
  | 'type'
  | 'themes'
  | 'emotions'
  | 'parent_id'
  | 'ai_summary'
  | 'user_reflection'
  | 'status'
  | 'is_auto'
  | 'chapter_id'
  | 'journal_ids'
>;

interface LifeNodeCreateInput {
  title: string;
  date: string;
  type: NodeType;
  status?: NodeStatus;
  themes?: string[];
  emotions?: string[];
  parent_id?: string | null;
  ai_summary?: string | null;
  user_reflection?: string | null;
  is_auto?: boolean;
  chapter_id?: string | null;
  journal_ids?: string[];
}

type LifeNodePatchInput = Partial<LifeNodeCreateInput>;

function uniqueStrings(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function buildLifeNodeCreatePayload(userId: string, input: LifeNodeCreateInput) {
  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }

  return {
    user_id: userId,
    title: input.title.trim(),
    date: input.date,
    type: input.type,
    status: input.status ?? 'active',
    themes: uniqueStrings(input.themes),
    emotions: uniqueStrings(input.emotions),
    parent_id: input.parent_id ?? null,
    ai_summary: input.ai_summary ?? null,
    user_reflection: input.user_reflection ?? null,
    is_auto: input.is_auto ?? false,
    chapter_id: input.chapter_id ?? null,
    journal_ids: uniqueStrings(input.journal_ids),
  };
}

export function buildLifeNodePatchPayload(input: LifeNodePatchInput) {
  const payload: Partial<MutableLifeNodeFields> = {};

  if (typeof input.title !== 'undefined') payload.title = input.title.trim();
  if (typeof input.date !== 'undefined') payload.date = input.date;
  if (typeof input.type !== 'undefined') payload.type = input.type;
  if (typeof input.status !== 'undefined') payload.status = input.status;
  if (typeof input.parent_id !== 'undefined') payload.parent_id = input.parent_id ?? null;
  if (typeof input.ai_summary !== 'undefined') payload.ai_summary = input.ai_summary ?? null;
  if (typeof input.user_reflection !== 'undefined') payload.user_reflection = input.user_reflection ?? null;
  if (typeof input.is_auto !== 'undefined') payload.is_auto = input.is_auto;
  if (typeof input.chapter_id !== 'undefined') payload.chapter_id = input.chapter_id ?? null;
  if (typeof input.themes !== 'undefined') payload.themes = uniqueStrings(input.themes);
  if (typeof input.emotions !== 'undefined') payload.emotions = uniqueStrings(input.emotions);
  if (typeof input.journal_ids !== 'undefined') payload.journal_ids = uniqueStrings(input.journal_ids);

  return payload;
}
