'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type {
  TreeLayoutResult,
  LayoutNode,
} from '@/lib/tree/layout-engine';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

/* ─── Types ─── */

interface DestinyTreeProps {
  layout: TreeLayoutResult;
  onNodeClick?: (node: LayoutNode) => void;
  breakingNodeIds?: string[];
}

/* ─── Constants ─── */

const NODE_COLORS: Record<string, string> = {
  milestone: '#22c55e',
  choice: '#3b82f6',
  insight: '#a855f7',
  crisis: '#ef4444',
};

/* ─── Helpers ─── */

/** Draw a curved thick branch from parent to child */
function drawBranch(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  thickness: number,
  alpha: number
) {
  const midY = (y1 + y2) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
  ctx.strokeStyle = `rgba(120, 80, 50, ${alpha})`;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Subtle inner glow for branch
  if (thickness > 3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
    ctx.strokeStyle = `rgba(160, 120, 80, ${alpha * 0.3})`;
    ctx.lineWidth = thickness * 0.4;
    ctx.stroke();
  }
}

/** Draw a leaf cluster around a node */
function drawLeaves(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  isLeaf: boolean,
  elapsed: number,
  nodeIndex: number
) {
  if (!isLeaf) return;

  const leafCount = 5 + (nodeIndex % 3);
  for (let i = 0; i < leafCount; i++) {
    const angle = (Math.PI * 2 * i) / leafCount + Math.sin(elapsed * 0.0005 + nodeIndex) * 0.1;
    const dist = 18 + Math.sin(elapsed * 0.001 + i * 2) * 3;
    const lx = x + Math.cos(angle) * dist;
    const ly = y + Math.sin(angle) * dist;
    const size = 4 + Math.sin(elapsed * 0.002 + i) * 1;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle + Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = color + '30';
    ctx.fill();
    ctx.restore();
  }
}

/* ─── Component ─── */

export function DestinyTree({
  layout,
  onNodeClick,
  breakingNodeIds = [],
}: DestinyTreeProps) {
  const locale = useLocale();
  const t = useTranslations('tree');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{
    node: LayoutNode;
    x: number;
    y: number;
  } | null>(null);

  // Positioned nodes after layout
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  const handleNodeClick = useCallback(
    (node: LayoutNode) => onNodeClickRef.current?.(node),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || layout.nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    /* ═══════════════════════════════════════════
     * 1. Compute tree layout using D3
     * ═══════════════════════════════════════════ */
    const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
    const rootNode = layout.nodes.find((n) => !n.parentId) || layout.nodes[0];

    // Build d3 hierarchy from layout nodes
    const hierarchyData = d3.stratify<LayoutNode>()
      .id((d) => d.id)
      .parentId((d) => d.parentId)(layout.nodes);

    // Compute layout — tree grows upward
    const PADDING_X = 60;
    const PADDING_TOP = 60;
    const PADDING_BOTTOM = 80;
    const treeW = W - PADDING_X * 2;
    const treeH = H - PADDING_TOP - PADDING_BOTTOM;

    const treeLayout = d3
      .tree<LayoutNode>()
      .size([treeW, treeH])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.8));

    const root = treeLayout(hierarchyData);

    // Collect positioned nodes: flip Y so tree grows upward from bottom
    const positions = new Map<string, { x: number; y: number; depth: number; isLeaf: boolean }>();
    const childCount = new Map<string, number>();

    root.descendants().forEach((d) => {
      const children = d.children?.length || 0;
      childCount.set(d.data.id, children);
    });

    root.descendants().forEach((d) => {
      positions.set(d.data.id, {
        x: (d.x || 0) + PADDING_X,
        y: H - PADDING_BOTTOM - (d.y || 0), // Flip Y: root at bottom
        depth: d.depth,
        isLeaf: !d.children || d.children.length === 0,
      });
    });

    // Store for hit testing
    const posMap = new Map<string, { x: number; y: number }>();
    positions.forEach((v, k) => posMap.set(k, { x: v.x, y: v.y }));
    positionsRef.current = posMap;

    // Collect links
    const links: { source: string; target: string }[] = [];
    root.links().forEach((l) => {
      links.push({ source: l.source.data.id, target: l.target.data.id });
    });

    // Breakingset
    const breakingSet = new Set(breakingNodeIds);

    /* ═══════════════════════════════════════════
     * 2. Zoom & Pan
     * ═══════════════════════════════════════════ */
    let transform = d3.zoomIdentity;
    const canvasSelection = d3.select(canvas);
    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        transform = event.transform;
      });
    canvasSelection.call(zoom);

    /* ═══════════════════════════════════════════
     * 3. Render Loop
     * ═══════════════════════════════════════════ */
    let startTime: number | null = null;

    function render(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const fadeIn = Math.min(1, elapsed / 1000);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      /* ─── Draw Branches (thick trunk → thin branches) ─── */
      links.forEach((link) => {
        const s = positions.get(link.source);
        const t = positions.get(link.target);
        if (!s || !t) return;

        const sNode = nodeMap.get(link.source);
        const tNode = nodeMap.get(link.target);
        const sDepth = s.depth;

        // Trunk gets thinner with depth
        const thickness = Math.max(2, 12 - sDepth * 3.5);

        drawBranch(ctx, s.x, s.y, t.x, t.y, thickness, fadeIn * 0.9);
      });

      /* ─── Draw Pattern Links (red constellation lines) ─── */
      layout.patternLinks.forEach((pl) => {
        const s = positions.get(pl.sourceId);
        const t = positions.get(pl.targetId);
        if (!s || !t) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * fadeIn})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      /* ─── Draw Nodes ─── */
      layout.nodes.forEach((node, idx) => {
        const pos = positions.get(node.id);
        if (!pos) return;

        const x = pos.x;
        const y = pos.y;
        const color = NODE_COLORS[node.type] || '#71717a';
        const isRoot = node.depth === 0;
        const isLeaf = pos.isLeaf;
        const r = isRoot ? 14 : isLeaf ? 10 : 8;

        const entryDelay = idx * 50;
        const nodeAlpha = Math.min(1, Math.max(0, (elapsed - entryDelay) / 500)) * fadeIn;
        if (nodeAlpha <= 0) return;

        ctx.globalAlpha = nodeAlpha;

        // Draw leaves around leaf nodes
        drawLeaves(ctx, x, y, color, isLeaf, elapsed, idx);

        // Outer glow
        const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
        glow.addColorStop(0, color + '50');
        glow.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Recurring pulse ring
        if (node.status === 'recurring') {
          const pulseR = r + 4 + Math.sin(elapsed * 0.003) * 3;
          ctx.beginPath();
          ctx.arc(x, y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = nodeAlpha * (0.3 + Math.sin(elapsed * 0.003) * 0.2);
          ctx.stroke();
          ctx.globalAlpha = nodeAlpha;
        }

        // Breaking shatter
        if (breakingSet.has(node.id)) {
          const p = Math.min(1, elapsed / 1500);
          const sr = r + p * 25;
          ctx.beginPath();
          ctx.arc(x, y, sr, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3 * (1 - p);
          ctx.globalAlpha = (1 - p) * nodeAlpha;
          ctx.stroke();
          ctx.globalAlpha = nodeAlpha;
        }

        // Core circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = nodeAlpha * (node.status === 'resolved' ? 0.65 : 1);
        ctx.fill();

        // Inner highlight (3D feel)
        const hl = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
        hl.addColorStop(0, 'rgba(255,255,255,0.45)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = hl;
        ctx.globalAlpha = nodeAlpha * 0.5;
        ctx.fill();

        ctx.globalAlpha = nodeAlpha;

        // Recurring red ring
        if (node.status === 'recurring') {
          ctx.beginPath();
          ctx.arc(x, y, r + 1, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        /* ─── Label ─── */
        const label = node.title.length > 12 ? node.title.slice(0, 10) + '…' : node.title;
        const fontSize = isRoot ? 13 : 11;
        ctx.font = `${isRoot ? '600' : '500'} ${fontSize}px -apple-system, "Segoe UI", sans-serif`;
        const tw = ctx.measureText(label).width;
        const pillW = tw + 16;
        const pillH = 22;
        // Alternate label above/below for dense layers to prevent overlap
        const labelAbove = idx % 2 === 0;
        const labelY = labelAbove ? y - r - 16 : y + r + 16;

        // Pill background
        ctx.globalAlpha = nodeAlpha * 0.9;
        ctx.beginPath();
        ctx.roundRect(x - pillW / 2, labelY - pillH / 2, pillW, pillH, 11);
        ctx.fillStyle = 'rgba(15, 16, 20, 0.88)';
        ctx.fill();
        ctx.strokeStyle = color + '55';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.globalAlpha = nodeAlpha;
        ctx.fillStyle = '#e4e4e7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, labelY);

        // Type indicator dot in label
        ctx.beginPath();
        ctx.arc(x - tw / 2 - 5, labelY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      /* ─── Ambient sparkle particles ─── */
      const sparkleAlpha = Math.min(1, Math.max(0, (elapsed - 600) / 800));
      if (sparkleAlpha > 0) {
        layout.nodes.forEach((node, i) => {
          const pos = positions.get(node.id);
          if (!pos) return;
          const color = NODE_COLORS[node.type] || '#71717a';
          const count = node.type === 'milestone' ? 3 : 2;

          for (let j = 0; j < count; j++) {
            const angle = (Math.PI * 2 * j) / count + elapsed * 0.0006 * (1 + j * 0.3);
            const dist = 20 + Math.sin(elapsed * 0.001 + j + i) * 4;
            const px = pos.x + Math.cos(angle) * dist;
            const py = pos.y + Math.sin(angle) * dist;

            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = sparkleAlpha * (0.25 + Math.sin(elapsed * 0.003 + j) * 0.15);
            ctx.fill();
          }
        });
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    /* ═══════════════════════════════════════════
     * 4. Mouse interactions
     * ═══════════════════════════════════════════ */
    function getNodeAt(clientX: number, clientY: number): LayoutNode | null {
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left - transform.x) / transform.k;
      const my = (clientY - rect.top - transform.y) / transform.k;

      for (const node of layout.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;
        const dx = mx - pos.x;
        const dy = my - pos.y;
        const hitR = (node.depth === 0 ? 18 : 14);
        if (dx * dx + dy * dy < hitR * hitR) {
          return node;
        }
      }
      return null;
    }

    function onMouseMove(e: MouseEvent) {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        canvas.style.cursor = 'pointer';
        const rect = canvas.getBoundingClientRect();
        setTooltip({
          node,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        canvas.style.cursor = 'grab';
        setTooltip(null);
      }
    }

    function onClick(e: MouseEvent) {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) handleNodeClick(node);
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvasSelection.on('.zoom', null);
    };
  }, [layout, breakingNodeIds, handleNodeClick]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ background: 'transparent' }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-60 rounded-lg border border-border bg-popover p-3 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: NODE_COLORS[tooltip.node.type] }}
            />
            <span className="text-xs font-medium">
              {t(
                tooltip.node.type as
                  | 'milestone'
                  | 'choice'
                  | 'insight'
                  | 'crisis'
              )}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold">{tooltip.node.title}</p>
          {tooltip.node.aiSummary && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {tooltip.node.aiSummary}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tooltip.node.themes.slice(0, 3).map((theme) => (
              <span
                key={theme}
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
              >
                {theme}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {formatLocalizedDate(tooltip.node.date, locale)}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] capitalize text-muted-foreground">
              {t(type as 'milestone' | 'choice' | 'insight' | 'crisis')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
