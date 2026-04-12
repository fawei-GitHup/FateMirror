/**
 * Destiny Tree Layout Engine
 *
 * Computes tree layout from life nodes using D3.js tree algorithm.
 * Tree grows bottom-up (root at bottom, branches grow upward).
 * Red dashed links connect nodes that belong to the same recurring pattern.
 */

import * as d3 from 'd3';
import type { LifeNode } from '@/types';

export interface JournalPreview {
  id: string;
  title: string | null;
  created_at: string;
}

export interface LayoutNode {
  id: string;
  title: string;
  type: string;
  status: string;
  themes: string[];
  emotions: string[];
  date: string;
  aiSummary: string | null;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
  journalIds: string[];
  journals?: JournalPreview[];
}

export interface LayoutLink {
  sourceId: string;
  targetId: string;
}

export interface PatternLink {
  sourceId: string;
  targetId: string;
  patternThemes: string[];
}

export interface TreeLayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  patternLinks: PatternLink[];
  width: number;
  height: number;
}

/**
 * Compute full tree layout from life nodes.
 */
export function computeTreeLayout(
  lifeNodes: LifeNode[],
  containerWidth: number = 800,
  containerHeight: number = 600
): TreeLayoutResult {
  if (lifeNodes.length === 0) {
    return { nodes: [], links: [], patternLinks: [], width: containerWidth, height: containerHeight };
  }

  // Ensure there's a root node (node with no parent)
  const hasRoot = lifeNodes.some((n) => !n.parent_id);
  if (!hasRoot) {
    // Use the oldest node as root
    const sorted = [...lifeNodes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    sorted[0] = { ...sorted[0], parent_id: null };
    lifeNodes = sorted;
  }

  // Filter to only nodes that form a connected tree from root
  const nodeMap = new Map(lifeNodes.map((n) => [n.id, n]));
  const rootNode = lifeNodes.find((n) => !n.parent_id)!;

  // Ensure all nodes have valid parents (orphans attach to root)
  const cleanedNodes = lifeNodes.map((n) => {
    if (n.id === rootNode.id) return n;
    if (n.parent_id && nodeMap.has(n.parent_id)) return n;
    return { ...n, parent_id: rootNode.id };
  });

  try {
    // Build D3 hierarchy
    const stratify = d3
      .stratify<LifeNode>()
      .id((d) => d.id)
      .parentId((d) => d.parent_id);

    const root = stratify(cleanedNodes);

    // Compute tree layout
    const treeLayout = d3
      .tree<LifeNode>()
      .size([containerWidth - 100, containerHeight - 100])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));

    const layoutRoot = treeLayout(root);

    // Flip Y-axis: tree grows bottom-up
    layoutRoot.each((node) => {
      node.y = containerHeight - 50 - (node.y || 0);
    });

    // Extract layout nodes
    const layoutNodes: LayoutNode[] = layoutRoot.descendants().map((d) => ({
      id: d.data.id,
      title: d.data.title,
      type: d.data.type,
      status: d.data.status,
      themes: d.data.themes,
      emotions: d.data.emotions,
      date: d.data.date,
      aiSummary: d.data.ai_summary,
      x: (d.x || 0) + 50,
      y: d.y || 0,
      depth: d.depth,
      parentId: d.data.parent_id,
      journalIds: d.data.journal_ids,
    }));

    // Extract parent-child links
    const layoutLinks: LayoutLink[] = layoutRoot.links().map((l) => ({
      sourceId: l.source.data.id,
      targetId: l.target.data.id,
    }));

    // Find pattern connections (nodes sharing recurring themes)
    const patternLinks = findPatternConnections(cleanedNodes);

    return {
      nodes: layoutNodes,
      links: layoutLinks,
      patternLinks,
      width: containerWidth,
      height: containerHeight,
    };
  } catch (error) {
    console.error('Tree layout error:', error);
    return { nodes: [], links: [], patternLinks: [], width: containerWidth, height: containerHeight };
  }
}

/**
 * Find nodes connected by shared recurring patterns.
 * Two nodes are pattern-linked if they share >= 2 themes AND
 * both have status "recurring".
 */
function findPatternConnections(nodes: LifeNode[]): PatternLink[] {
  const links: PatternLink[] = [];
  const recurringNodes = nodes.filter((n) => n.status === 'recurring');

  for (let i = 0; i < recurringNodes.length; i++) {
    for (let j = i + 1; j < recurringNodes.length; j++) {
      const a = recurringNodes[i];
      const b = recurringNodes[j];
      const shared = a.themes.filter((t) => b.themes.includes(t));
      if (shared.length >= 2) {
        links.push({
          sourceId: a.id,
          targetId: b.id,
          patternThemes: shared,
        });
      }
    }
  }

  return links;
}
