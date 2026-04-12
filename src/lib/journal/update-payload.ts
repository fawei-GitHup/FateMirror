import type { JournalMode } from '@/types';

interface JournalUpdateInput {
  title?: string | null;
  content?: string;
  mode?: JournalMode | null;
  emotions?: string[];
  themes?: string[];
  decisions?: string[];
  insights?: string[];
  thinking_patterns?: string[];
  behavior_patterns?: string[];
}

export function buildJournalUpdatePayload(input: JournalUpdateInput) {
  const payload: Record<string, string | number | string[] | null> = {};
  const normalizeArray = (values: string[] | undefined) =>
    [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];

  if (typeof input.title !== 'undefined') {
    const trimmedTitle = input.title?.trim() ?? '';
    payload.title = trimmedTitle || null;
  }

  if (typeof input.mode !== 'undefined') {
    payload.mode = input.mode ?? 'freewrite';
  }

  if (typeof input.content !== 'undefined') {
    const content = input.content.trim();
    if (!content) {
      throw new Error('Content is required');
    }

    const wordCount = content.split(/\s+/).length;
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const language = chineseChars / content.length > 0.3 ? 'zh' : 'en';

    payload.content = content;
    payload.word_count = wordCount;
    payload.language = language;
  }

  if (typeof input.emotions !== 'undefined') payload.emotions = normalizeArray(input.emotions);
  if (typeof input.themes !== 'undefined') payload.themes = normalizeArray(input.themes);
  if (typeof input.decisions !== 'undefined') payload.decisions = normalizeArray(input.decisions);
  if (typeof input.insights !== 'undefined') payload.insights = normalizeArray(input.insights);
  if (typeof input.thinking_patterns !== 'undefined') {
    payload.thinking_patterns = normalizeArray(input.thinking_patterns);
  }
  if (typeof input.behavior_patterns !== 'undefined') {
    payload.behavior_patterns = normalizeArray(input.behavior_patterns);
  }

  return payload;
}
