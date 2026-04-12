'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface BehaviorRadarProps {
  scores: Record<string, number>;
  size?: number;
}

const ARCHETYPES = [
  { key: 'over-compensate', label: 'Over-Compensate' },
  { key: 'avoid', label: 'Avoid' },
  { key: 'please', label: 'Please' },
  { key: 'control', label: 'Control' },
  { key: 'prove', label: 'Prove' },
  { key: 'victim', label: 'Victim' },
];

export function BehaviorRadar({ scores, size = 240 }: BehaviorRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const center = size / 2;
    const radius = size / 2 - 40;
    const levels = 4;
    const angleSlice = (Math.PI * 2) / ARCHETYPES.length;

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
    ARCHETYPES.forEach((arch, i) => {
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
        .text(arch.label);
    });

    // Draw data polygon
    const dataPoints = ARCHETYPES.map((arch, i) => {
      const value = scores[arch.key] || 0;
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

    const values = ARCHETYPES.map((arch) => scores[arch.key] || 0);

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
  }, [scores, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      className="mx-auto"
    />
  );
}
