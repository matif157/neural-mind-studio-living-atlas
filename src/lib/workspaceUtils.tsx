import type { ReactNode } from 'react';
import type { SeriesPoint } from './patterns';
import type { MindNode } from '../types/mind';

export function nextNodePosition(nodes: MindNode[]): { x: number; y: number } {
  return { x: 320 + (nodes.length % 8) * 190, y: 240 + (nodes.length % 5) * 150 };
}

export function WorkspaceIntro({ kicker, title, copy, children }: { kicker: string; title: string; copy: string; children?: ReactNode }) {
  return (
    <div className="workspace-intro">
      <div><div className="panel-kicker">{kicker}</div><h2>{title}</h2><p>{copy}</p></div>
      {children && <div className="intro-meta">{children}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function Sparkline({ points, color = '#70a7ff', height = 56 }: { points: SeriesPoint[]; color?: string; height?: number }) {
  if (points.length < 2) return <EmptyState>Record at least two reflections to see a trend.</EmptyState>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 320;
  const step = width / (points.length - 1);
  const coordinates = points.map((point, index) => `${index * step},${height - 6 - ((point.value - min) / span) * (height - 14)}`).join(' ');
  return (
    <div className="sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Self-reported values over time">
        <polyline points={coordinates} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => <circle key={`${point.date}-${index}`} cx={index * step} cy={height - 6 - ((point.value - min) / span) * (height - 14)} r="2.5" fill={color} />)}
      </svg>
      <div className="sparkline-axis"><span>{points[0].date}</span><span>{points[points.length - 1].date}</span></div>
    </div>
  );
}
