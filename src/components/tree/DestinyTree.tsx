'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as d3 from 'd3';
import type {
  TreeLayoutResult,
  LayoutNode,
  LayoutLink,
  PatternLink,
} from '@/lib/tree/layout-engine';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

/* ─── Types ─── */

interface DestinyTreeProps {
  layout: TreeLayoutResult;
  onNodeClick?: (node: LayoutNode) => void;
  /** Node IDs that just broke a loop — triggers red-ring-shatter animation */
  breakingNodeIds?: string[];
}

interface Particle {
  nodeId: string;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  color: string;
}

/* ─── Constants ─── */

const NODE_COLORS: Record<string, string> = {
  milestone: '#22c55e',
  choice: '#3b82f6',
  insight: '#a855f7',
  crisis: '#ef4444',
};

const STATUS_OPACITY: Record<string, number> = {
  active: 1,
  resolved: 0.6,
  recurring: 1,
};

/** Number of ambient particles per node type */
const PARTICLES_PER_NODE: Record<string, number> = {
  milestone: 5,
  insight: 4,
  crisis: 3,
  choice: 2,
};

const ENTRY_ANIMATION_DURATION = 800;
const PARTICLE_LAYER_ID = 'particle-layer';

/* ─── Helpers ─── */

function createParticlesForNode(node: LayoutNode): Particle[] {
  const count = PARTICLES_PER_NODE[node.type] ?? 2;
  const color = NODE_COLORS[node.type] || '#71717a';
  return Array.from({ length: count }, (_, i) => ({
    nodeId: node.id,
    angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
    radius: 16 + Math.random() * 12,
    speed: 0.003 + Math.random() * 0.004,
    size: 1 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.4,
    color,
  }));
}

/* ─── Component ─── */

export function DestinyTree({
  layout,
  onNodeClick,
  breakingNodeIds = [],
}: DestinyTreeProps) {
  const locale = useLocale();
  const t = useTranslations('tree');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{
    node: LayoutNode;
    x: number;
    y: number;
  } | null>(null);

  // Stable callback ref to avoid re-running D3 on every onNodeClick change
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  const handleNodeClick = useCallback(
    (node: LayoutNode) => onNodeClickRef.current?.(node),
    []
  );

  useEffect(() => {
    if (!svgRef.current || layout.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    /* ═══════════════════════════════════════════
     * 1. SVG Defs — Glow Filters + Pulse Anim
     * ═══════════════════════════════════════════ */
    const defs = svg.append('defs');

    // Glow filter per node color
    Object.entries(NODE_COLORS).forEach(([type, color]) => {
      const filter = defs
        .append('filter')
        .attr('id', `glow-${type}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter
        .append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 4)
        .attr('result', 'blur');

      filter
        .append('feFlood')
        .attr('flood-color', color)
        .attr('flood-opacity', 0.6)
        .attr('result', 'color');

      filter
        .append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'blur')
        .attr('operator', 'in')
        .attr('result', 'colorBlur');

      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'colorBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Recurring-node pulse filter (red)
    const pulseFilter = defs
      .append('filter')
      .attr('id', 'glow-pulse')
      .attr('x', '-80%')
      .attr('y', '-80%')
      .attr('width', '260%')
      .attr('height', '260%');

    pulseFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 6)
      .attr('result', 'blur');

    pulseFilter
      .append('feFlood')
      .attr('flood-color', '#ef4444')
      .attr('flood-opacity', 0.5)
      .attr('result', 'color');

    pulseFilter
      .append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'colorBlur');

    const pulseMerge = pulseFilter.append('feMerge');
    pulseMerge.append('feMergeNode').attr('in', 'colorBlur');
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // CSS animations via <style> element
    defs.append('style').text(`
      @keyframes pulse-ring {
        0%, 100% { opacity: 0.4; r: 14; }
        50% { opacity: 0.15; r: 20; }
      }
      @keyframes node-entry {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes shatter-ring {
        0% { opacity: 0.8; r: 14; stroke-width: 3; }
        40% { opacity: 1; r: 28; stroke-width: 1; }
        100% { opacity: 0; r: 40; stroke-width: 0; }
      }
      .pulse-ring {
        animation: pulse-ring 2.5s ease-in-out infinite;
      }
      .node-entry {
        transform-origin: center;
        animation: node-entry ${ENTRY_ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      .shatter-ring {
        animation: shatter-ring 1.2s ease-out forwards;
      }
    `);

    const g = svg.append('g').attr('class', 'tree-content');

    /* ═══════════════════════════════════════════
     * 2. Zoom/Pan
     * ═══════════════════════════════════════════ */
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    /* ═══════════════════════════════════════════
     * 3. Links — Parent-child (solid) + Pattern (red dashed)
     * ═══════════════════════════════════════════ */
    // Parent-child links with gradient opacity
    g.selectAll('.tree-link')
      .data(layout.links)
      .enter()
      .append('path')
      .attr('class', 'tree-link')
      .attr('d', (d: LayoutLink) => {
        const source = layout.nodes.find((n) => n.id === d.sourceId);
        const target = layout.nodes.find((n) => n.id === d.targetId);
        if (!source || !target) return '';
        return `M${source.x},${source.y} C${source.x},${(source.y + target.y) / 2} ${target.x},${(source.y + target.y) / 2} ${target.x},${target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(ENTRY_ANIMATION_DURATION)
      .delay((_, i) => i * 30)
      .attr('opacity', 0.8);

    // Pattern links (red dashed — recurring pattern connections)
    g.selectAll('.pattern-link')
      .data(layout.patternLinks)
      .enter()
      .append('line')
      .attr('class', 'pattern-link')
      .attr(
        'x1',
        (d: PatternLink) =>
          layout.nodes.find((n) => n.id === d.sourceId)?.x || 0
      )
      .attr(
        'y1',
        (d: PatternLink) =>
          layout.nodes.find((n) => n.id === d.sourceId)?.y || 0
      )
      .attr(
        'x2',
        (d: PatternLink) =>
          layout.nodes.find((n) => n.id === d.targetId)?.x || 0
      )
      .attr(
        'y2',
        (d: PatternLink) =>
          layout.nodes.find((n) => n.id === d.targetId)?.y || 0
      )
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay(ENTRY_ANIMATION_DURATION)
      .attr('opacity', 0.6);

    /* ═══════════════════════════════════════════
     * 4. Particle Layer (ambient floating particles)
     * ═══════════════════════════════════════════ */
    const particleGroup = g.append('g').attr('id', PARTICLE_LAYER_ID);

    const allParticles: Particle[] = layout.nodes.flatMap(createParticlesForNode);

    const particleElements = particleGroup
      .selectAll('.particle')
      .data(allParticles)
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0);

    // Node lookup for particle positioning
    const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

    // Particle animation loop
    let startTime: number | null = null;

    function animateParticles(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Fade in particles after entry animation
      const particleFadeIn = Math.min(
        1,
        Math.max(0, (elapsed - ENTRY_ANIMATION_DURATION) / 600)
      );

      particleElements.each(function (d) {
        const node = nodeById.get(d.nodeId);
        if (!node) return;

        const currentAngle = d.angle + elapsed * d.speed;
        const wobble = Math.sin(elapsed * 0.001 + d.angle * 3) * 3;
        const cx = node.x + Math.cos(currentAngle) * (d.radius + wobble);
        const cy = node.y + Math.sin(currentAngle) * (d.radius + wobble);

        d3.select(this)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('opacity', d.opacity * particleFadeIn);
      });

      animFrameRef.current = requestAnimationFrame(animateParticles);
    }

    animFrameRef.current = requestAnimationFrame(animateParticles);

    /* ═══════════════════════════════════════════
     * 5. Nodes — Glow + Entry Animation + Pulse
     * ═══════════════════════════════════════════ */
    const nodeGroups = g
      .selectAll('.tree-node')
      .data(layout.nodes)
      .enter()
      .append('g')
      .attr('class', () => 'tree-node node-entry')
      .attr('transform', (d: LayoutNode) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .style('animation-delay', (d: LayoutNode, i: number) => `${i * 60}ms`);

    // Glow halo (behind node circle)
    nodeGroups
      .append('circle')
      .attr('class', 'glow-halo')
      .attr('r', (d: LayoutNode) => (d.depth === 0 ? 20 : 14))
      .attr('fill', (d: LayoutNode) => NODE_COLORS[d.type] || '#71717a')
      .attr('opacity', 0.15)
      .attr('filter', (d: LayoutNode) => `url(#glow-${d.type})`);

    // Recurring pulse ring
    nodeGroups
      .filter((d: LayoutNode) => d.status === 'recurring')
      .append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', 14)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#glow-pulse)');

    // Break-loop shatter effect (for nodes that just broke a pattern)
    const breakingSet = new Set(breakingNodeIds);
    nodeGroups
      .filter((d: LayoutNode) => breakingSet.has(d.id))
      .append('circle')
      .attr('class', 'shatter-ring')
      .attr('r', 14)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3);

    // Main node circles
    nodeGroups
      .append('circle')
      .attr('class', 'node-core')
      .attr('r', 0) // start at 0 for entry animation
      .attr('fill', (d: LayoutNode) => NODE_COLORS[d.type] || '#71717a')
      .attr('opacity', (d: LayoutNode) => STATUS_OPACITY[d.status] || 1)
      .attr('stroke', (d: LayoutNode) =>
        d.status === 'recurring' ? '#ef4444' : 'transparent'
      )
      .attr('stroke-width', (d: LayoutNode) =>
        d.status === 'recurring' ? 2.5 : 0
      )
      .transition()
      .duration(500)
      .delay((d: LayoutNode, i: number) => i * 60)
      .ease(d3.easeBackOut.overshoot(1.7))
      .attr('r', (d: LayoutNode) => (d.depth === 0 ? 12 : 8));

    // Node labels
    nodeGroups
      .append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a1a1aa')
      .attr('font-size', '11px')
      .attr('opacity', 0)
      .text((d: LayoutNode) =>
        d.title.length > 20 ? d.title.slice(0, 18) + '...' : d.title
      )
      .transition()
      .duration(400)
      .delay((_, i) => i * 60 + 300)
      .attr('opacity', 1);

    /* ═══════════════════════════════════════════
     * 6. Hover & Click Interactions
     * ═══════════════════════════════════════════ */
    nodeGroups
      .on('mouseenter', function (event: MouseEvent, d: LayoutNode) {
        const group = d3.select(this);
        // Enlarge core circle
        group
          .select('.node-core')
          .transition()
          .duration(200)
          .attr('r', d.depth === 0 ? 15 : 11);
        // Brighten glow
        group
          .select('.glow-halo')
          .transition()
          .duration(200)
          .attr('opacity', 0.35)
          .attr('r', d.depth === 0 ? 26 : 20);

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            node: d,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', function (_event: MouseEvent, d: LayoutNode) {
        const group = d3.select(this);
        group
          .select('.node-core')
          .transition()
          .duration(200)
          .attr('r', d.depth === 0 ? 12 : 8);
        group
          .select('.glow-halo')
          .transition()
          .duration(200)
          .attr('opacity', 0.15)
          .attr('r', d.depth === 0 ? 20 : 14);

        setTooltip(null);
      })
      .on('click', (_event: MouseEvent, d: LayoutNode) => {
        handleNodeClick(d);
      });

    /* ═══════════════════════════════════════════
     * 7. Center Tree
     * ═══════════════════════════════════════════ */
    const bounds = g.node()?.getBBox();
    if (bounds && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scale = Math.min(
        containerWidth / (bounds.width + 100),
        containerHeight / (bounds.height + 100),
        1.5
      );
      const tx =
        containerWidth / 2 - (bounds.x + bounds.width / 2) * scale;
      const ty =
        containerHeight / 2 - (bounds.y + bounds.height / 2) * scale;

      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    }

    /* ═══════════════════════════════════════════
     * 8. Cleanup
     * ═══════════════════════════════════════════ */
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
    };
  }, [layout, breakingNodeIds, handleNodeClick]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
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
