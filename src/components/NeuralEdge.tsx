import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { MindEdge } from '../types/mind';
import { useMindStore } from '../store/mindStore';

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
  const stroke = selected ? '#eaf3ff' : props.style?.stroke?.toString() ?? '#6b83a8';

  const opacity = selected ? 1 : (typeof props.style?.opacity === 'number' ? props.style.opacity : 0.56);

  return (
    <>
      <BaseEdge id={props.id} path={path} style={{ stroke, strokeWidth: selected ? 2.4 : 1 + weight * 1.4, opacity, strokeDasharray: relation === 'conflicts with' ? '5 5' : undefined }} />
      {running && props.data?.signal !== false && (
        <path d={path} className="neural-edge-pulse" style={{ stroke: selected ? '#ffffff' : stroke }} />
      )}
      <EdgeLabelRenderer>
        <div
          className={`edge-relation nodrag nopan ${selected ? 'is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {relation}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(NeuralEdgeView);
