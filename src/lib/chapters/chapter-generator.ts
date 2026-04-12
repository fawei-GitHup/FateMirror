import type { SupabaseClient } from '@supabase/supabase-js';
import type { Chapter } from '@/types';
import type { Locale } from '@/i18n/config';

export const CHAPTER_SIZE = 15;

export interface ChapterSourceJournal {
  id: string;
  created_at: string;
  themes: string[];
  emotions: string[];
  title: string | null;
}

interface ChapterDraft {
  number: number;
  title: string;
  subtitle: string;
  date_start: string;
  date_end: string;
  themes: string[];
  ai_narrative: string;
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function rankTags(values: string[][]): string[] {
  const counts = new Map<string, number>();

  for (const group of values) {
    for (const value of group) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
}

export function pickUnchapteredJournalBatch(
  journals: ChapterSourceJournal[],
  latestChapterEnd: string | null
): ChapterSourceJournal[] | null {
  const uncovered = journals
    .filter((journal) => {
      if (!latestChapterEnd) {
        return true;
      }

      return new Date(journal.created_at) > new Date(`${latestChapterEnd}T23:59:59.999Z`);
    })
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (uncovered.length < CHAPTER_SIZE) {
    return null;
  }

  return uncovered.slice(0, CHAPTER_SIZE);
}

export function buildChapterDraft(
  journals: ChapterSourceJournal[],
  nextNumber: number,
  locale: Locale = 'en'
): ChapterDraft {
  const rankedThemes = rankTags(journals.map((journal) => journal.themes)).slice(0, 3);
  const rankedEmotions = rankTags(journals.map((journal) => journal.emotions)).slice(0, 2);
  const primaryTheme = rankedThemes[0] ?? (locale === 'zh' ? '反思' : 'reflection');
  const secondaryTheme = rankedThemes[1];
  const primaryEmotion = rankedEmotions[0] ?? (locale === 'zh' ? '紧张' : 'tension');
  const start = toDateOnly(journals[0].created_at);
  const end = toDateOnly(journals[journals.length - 1].created_at);
  const readablePrimary = toTitleCase(primaryTheme);

  if (locale === 'zh') {
    return {
      number: nextNumber,
      title: `${readablePrimary}篇章`,
      subtitle: secondaryTheme
        ? `${toTitleCase(primaryTheme)}与${toTitleCase(secondaryTheme)}交织`
        : `${readablePrimary}反复浮现`,
      date_start: start,
      date_end: end,
      themes: rankedThemes,
      ai_narrative: `从 ${start} 到 ${end}，你的日记不断围绕"${primaryTheme}"展开。条目反复将"${primaryTheme}"${secondaryTheme ? `与"${secondaryTheme}"` : ''}联系在一起，情绪基调偏向"${primaryEmotion}"。这一章节标记了你故事中一段连贯的脉络，而非孤立事件。`,
    };
  }

  return {
    number: nextNumber,
    title: `The ${readablePrimary} Chapter`,
    subtitle: secondaryTheme
      ? `${toTitleCase(primaryTheme)} tangled with ${toTitleCase(secondaryTheme)}`
      : `${readablePrimary} kept resurfacing`,
    date_start: start,
    date_end: end,
    themes: rankedThemes,
    ai_narrative: `From ${start} to ${end}, your journal kept circling back to ${primaryTheme}. The entries repeatedly linked ${primaryTheme}${secondaryTheme ? ` with ${secondaryTheme}` : ''}, while the emotional tone leaned toward ${primaryEmotion}. This chapter marks a coherent stretch of your story rather than a one-off event.`,
  };
}

async function attachLifeNodesToChapter(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string,
  start: string,
  end: string
) {
  await supabase
    .from('life_nodes')
    .update({ chapter_id: chapterId })
    .eq('user_id', userId)
    .is('chapter_id', null)
    .gte('date', start)
    .lte('date', end);
}

export async function maybeGenerateChapters(
  supabase: SupabaseClient,
  userId: string,
  locale: Locale = 'en'
): Promise<Chapter[]> {
  const [{ data: chaptersData }, { data: journalsData }] = await Promise.all([
    supabase
      .from('chapters')
      .select('*')
      .eq('user_id', userId)
      .order('number', { ascending: true }),
    supabase
      .from('journals')
      .select('id, created_at, themes, emotions, title')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  const chapters = (chaptersData as Chapter[]) ?? [];
  const journals = (journalsData as ChapterSourceJournal[]) ?? [];
  const created: Chapter[] = [];
  let latestChapterEnd = chapters.at(-1)?.date_end ?? null;
  let nextNumber = (chapters.at(-1)?.number ?? 0) + 1;

  while (true) {
    const batch = pickUnchapteredJournalBatch(journals, latestChapterEnd);
    if (!batch) {
      break;
    }

    const draft = buildChapterDraft(batch, nextNumber, locale);
    const { data: inserted } = await supabase
      .from('chapters')
      .insert({
        user_id: userId,
        number: draft.number,
        title: draft.title,
        subtitle: draft.subtitle,
        date_start: draft.date_start,
        date_end: draft.date_end,
        themes: draft.themes,
        ai_narrative: draft.ai_narrative,
        status: 'open',
      })
      .select()
      .single();

    if (!inserted) {
      break;
    }

    await attachLifeNodesToChapter(
      supabase,
      userId,
      inserted.id,
      draft.date_start,
      draft.date_end
    );

    created.push(inserted as Chapter);
    latestChapterEnd = draft.date_end;
    nextNumber += 1;
  }

  return created;
}
