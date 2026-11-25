interface EdgeLegendProps {
  compact?: boolean;
}

/** One line-style legend for the 2D map and both 3D presentations. */
export default function EdgeLegend({ compact = false }: EdgeLegendProps) {
  return (
    <div
      className={`edge-legend ${compact ? 'edge-legend-compact' : ''}`.trim()}
      data-testid="relationship-legend"
      aria-label="Relationship line legend"
    >
      <span><i className="edge-line confirmed" /> {compact ? 'Confirmed' : 'Confirmed / signal-bearing'}</span>
      <span><i className="edge-line suggested" /> {compact ? 'Suggested' : 'Suggested / review required'}</span>
      <span><i className="edge-line structural" /> Structural</span>
      <span><i className="edge-line excluded" /> {compact ? 'Excluded' : 'Rejected / non-signalling'}</span>
    </div>
  );
}
