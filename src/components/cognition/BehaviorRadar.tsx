'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface BehaviorRadarProps {
  scores: Record<string, number>;
  labels?: Record<string, string>;
  size?: number;
}

const ARCHETYPE_KEYS = [
  'over-compensate',
  'avoid',
  'please',
  'control',
  'prove',
  'victim',
] as const;

const DEFAULT_LABELS: Record<string, string> = {
  'over-compensate': 'Over-Compensate',
  avoid: 'Avoid',
  please: 'Please',
  control: 'Control',
  prove: 'Prove',
  victim: 'Victim',
};

export function BehaviorRadar({ scores, labels, size = 240 }: BehaviorRadarProps) {
  const resolvedLabels = labels ?? DEFAULT_LABELS;
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const center = size / 2;
    const radius = size / 2 - 40;
    const levels = 4;
    const angleSlice = (Math.PI * 2) / ARCHETYPE_KEYS.length;

    const g = svg
      .append('g')
      .attr('transform', `translate(${center},${center})`);

    // Draw grid circles
    for (let i = 1; i <= levels; i++) {
      const r = (radius / levels) * i;
      g.append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#27272a')
        .attr('stroke-width', 1);
    }

    // Draw axis lines + labels
    ARCHETYPE_KEYS.forEach((key, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#27272a')
        .attr('stroke-width', 1);

      const labelX = Math.cos(angle) * (radius + 24);
      const labelY = Math.sin(angle) * (radius + 24);

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#71717a')
        .attr('font-size', '10px')
        .text(resolvedLabels[key] ?? key);
    });

    // Draw data polygon
    const dataPoints = ARCHETYPE_KEYS.map((key, i) => {
      const value = scores[key] || 0;
      const angle = angleSlice * i - Math.PI / 2;
      return {
        x: Math.cos(angle) * radius * value,
        y: Math.sin(angle) * radius * value,
      };
    });

    const lineGen = d3
      .lineRadial<number>()
      .angle((_, i) => angleSlice * i)
      .radius((d) => radius * d)
      .curve(d3.curveLinearClosed);

    const values = ARCHETYPE_KEYS.map((key) => scores[key] || 0);

    g.append('path')
      .datum(values)
      .attr('d', lineGen)
      .attr('fill', 'rgba(168, 85, 247, 0.15)')
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 2);

    // Draw data points
    dataPoints.forEach((p) => {
      g.append('circle')
        .attr('cx', p.x)
        .attr('cy', p.y)
        .attr('r', 3)
        .attr('fill', '#a855f7');
    });
  }, [scores, resolvedLabels, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      className="mx-auto"
    />
  );
}
