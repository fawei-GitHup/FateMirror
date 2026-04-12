import type { Chapter, Journal, LifeNode } from '@/types';

interface ChapterJournalPreview {
  id: string;
  title: string | null;
  created_at: string;
}

interface ChapterSummary extends Chapter {
  journal_count: number;
  life_node_count: number;
  journals: ChapterJournalPreview[];
}

type ChapterDetail = ChapterSummary;

function getChapterWindow(chapter: Chapter) {
  const start = chapter.date_start ? new Date(chapter.date_start) : null;
  const end = chapter.date_end ? new Date(chapter.date_end) : null;

  return { start, end };
}

function collectChapterJournals(chapter: Chapter, journals: Journal[]) {
  const { start, end } = getChapterWindow(chapter);

  return journals
    .filter((journal) => {
      const createdAt = new Date(journal.created_at);
      if (start && createdAt < start) return false;
      if (end && createdAt > end) return false;
      return true;
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function collectChapterNodes(chapter: Chapter, nodes: LifeNode[]) {
  return nodes.filter((node) => node.chapter_id === chapter.id);
}

function toJournalPreview(journal: Journal): ChapterJournalPreview {
  return {
    id: journal.id,
    title: journal.title,
    created_at: journal.created_at,
  };
}

export function buildChapterSummaries(
  chapters: Chapter[],
  journals: Journal[],
  nodes: LifeNode[],
): ChapterSummary[] {
  return chapters.map((chapter) => {
    const chapterJournals = collectChapterJournals(chapter, journals);
    const chapterNodes = collectChapterNodes(chapter, nodes);

    return {
      ...chapter,
      journal_count: chapterJournals.length,
      life_node_count: chapterNodes.length,
      journals: chapterJournals.slice(0, 5).map(toJournalPreview),
    };
  });
}

export function buildChapterDetail(
  chapter: Chapter,
  journals: Journal[],
  nodes: LifeNode[],
): ChapterDetail {
  const chapterJournals = collectChapterJournals(chapter, journals);
  const chapterNodes = collectChapterNodes(chapter, nodes);

  return {
    ...chapter,
    journal_count: chapterJournals.length,
    life_node_count: chapterNodes.length,
    journals: chapterJournals.map(toJournalPreview),
  };
}
