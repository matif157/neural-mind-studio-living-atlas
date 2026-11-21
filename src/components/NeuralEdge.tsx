import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { MindEdge } from '../types/mind';
import { useMindStore } from '../store/mindStore';
import { EDGE_VISUAL_COLORS, edgeVisualState } from '../lib/mind3d';

function NeuralEdgeView(props: EdgeProps<MindEdge>) {
  const running = useMindStore((state) => state.simulationRunning);
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
    sourcePosition: props.sourcePosition, targetPosition: props.targetPosition,
    curvature: 0.28,
  });
  const relation = props.data?.relation ?? 'influences';
  const weight = props.data?.weight ?? 0.6;
  const selected = props.selected;
  const visualState = edgeVisualState({ id: props.id, source: props.source, target: props.target, type: 'neural', data: props.data } as MindEdge);
  const signalBearing = visualState === 'confirmed';
  const stroke = visualState === 'confirmed'
    ? (selected ? '#eaf3ff' : props.style?.stroke?.toString() ?? EDGE_VISUAL_COLORS.confirmed)
    : EDGE_VISUAL_COLORS[visualState];
  const strokeDasharray = visualState === 'suggested'
    ? '6 5'
    : visualState === 'structural'
      ? '2 5'
      : visualState === 'excluded'
        ? '1 6'
        : undefined;

  const opacity = selected ? 1 : (visualState === 'confirmed' && typeof props.style?.opacity === 'number' ? props.style.opacity : 0.7);
  const stateLabel = visualState === 'suggested'
    ? ' · suggestion'
    : visualState === 'structural'
      ? ' · structural'
      : visualState === 'excluded'
        ? ' · not signal-bearing'
        : '';

  return (
    <>
      <BaseEdge id={props.id} path={path} style={{ stroke, strokeWidth: selected ? 2.4 : 1 + weight * 1.4, opacity, strokeDasharray }} />
      {running && signalBearing && (
        <path d={path} className="neural-edge-pulse" style={{ stroke: selected ? '#ffffff' : stroke }} />
      )}
      <EdgeLabelRenderer>
        <div
          className={`edge-relation nodrag nopan ${selected ? 'is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {relation}{stateLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(NeuralEdgeView);
