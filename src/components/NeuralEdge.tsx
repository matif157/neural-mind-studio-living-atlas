import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { MindEdge } from '../types/mind';
import { useMindStore } from '../store/mindStore';
import { isSignalEdge } from '../lib/mind3d';

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
  const suggested = props.data?.review === 'suggested';
  const structural = props.data?.structural === true;
  const signalBearing = isSignalEdge({ id: props.id, source: props.source, target: props.target, type: 'neural', data: props.data } as MindEdge);
  const stroke = suggested ? '#f5b94c' : structural ? '#4c617c' : selected ? '#eaf3ff' : props.style?.stroke?.toString() ?? '#6b83a8';

  const opacity = selected ? 1 : (typeof props.style?.opacity === 'number' ? props.style.opacity : suggested ? 0.7 : 0.56);

  return (
    <>
      <BaseEdge id={props.id} path={path} style={{ stroke, strokeWidth: selected ? 2.4 : 1 + weight * 1.4, opacity, strokeDasharray: suggested || structural || relation === 'conflicts with' ? '5 5' : undefined }} />
      {running && signalBearing && (
        <path d={path} className="neural-edge-pulse" style={{ stroke: selected ? '#ffffff' : stroke }} />
      )}
      <EdgeLabelRenderer>
        <div
          className={`edge-relation nodrag nopan ${selected ? 'is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {relation}{suggested ? ' · suggestion' : ''}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(NeuralEdgeView);
