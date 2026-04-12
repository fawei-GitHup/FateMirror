import type { TreeLayoutResult, JournalPreview } from './layout-engine';

export function attachJournalPreviewsToLayout(
  layout: TreeLayoutResult,
  journals: JournalPreview[],
): TreeLayoutResult {
  const journalMap = new Map(journals.map((journal) => [journal.id, journal]));

  return {
    ...layout,
    nodes: layout.nodes.map((node) => ({
      ...node,
      journals: node.journalIds
        .map((journalId) => journalMap.get(journalId))
        .filter((journal): journal is JournalPreview => Boolean(journal)),
    })),
  };
}
