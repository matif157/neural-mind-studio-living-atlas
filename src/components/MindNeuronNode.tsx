import { memo, type CSSProperties } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { Lock, Rows3 } from 'lucide-react';
import { getMindNodeColor, NODE_META } from '@shared/domain';
import { scenarios } from '../data/scenarios';
import { useMindStore } from '../store/mindStore';
import { useUiStore } from '../store/uiStore';
import { iconFor } from './iconFor';
import type { MindNode } from '../types/mind';

const RESIZABLE = new Set(['thought', 'memory', 'context', 'root']);

function MindNeuronNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const activeScenario = useMindStore((state) => state.activeScenario);
  const customCategories = useMindStore((state) => state.customCategories);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const scenario = scenarios.find((item) => item.id === activeScenario);
  const custom = data.customKind ? customCategories.find((item) => item.id === data.customKind) : undefined;
  const meta = custom
    ? { label: custom.label, color: custom.color, tint: `${custom.color}22`, icon: 'circle', definition: custom.definition }
    : NODE_META[data.kind];
  const nodeColor = custom?.color ?? getMindNodeColor(data);
  const Icon = iconFor(meta.icon);
  const isDimmed = Boolean(scenario && !scenario.nodeIds.includes(id));
  const intensity = data.intensity ?? 0;
  const isDraft = data.status === 'draft';

  return (
    <div
      className={`mind-node ${selected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''} ${isDraft ? 'is-draft' : ''} ${data.isGroup ? 'is-group' : ''} ${data.locked ? 'is-locked' : ''}`}
      style={{ '--node-color': nodeColor, '--node-tint': meta.tint, '--node-intensity': intensity } as CSSProperties}
      onClick={() => setSelectedNode(id)}
      title={`${data.label} · ${meta.label}`}
    >
      {selected && !data.locked && RESIZABLE.has(data.kind) && (
        <NodeResizer minWidth={190} minHeight={96} color={nodeColor} isVisible />
      )}
      <Handle type="target" position={Position.Top} id="top" className="mind-handle" />
      <Handle type="target" position={Position.Left} id="left" className="mind-handle" />
      <div className="neuron-shell">
        <span className="neuron-orbit neuron-orbit--one" />
        <span className="neuron-orbit neuron-orbit--two" />
        <span className="neuron-core"><Icon size={19} strokeWidth={1.8} /></span>
        <span className="neuron-pulse" />
      </div>
      <div className="mind-node-copy">
        <div className="mind-node-kind">{meta.label}{data.isGroup ? ' · GROUP' : ''}</div>
        <div className="mind-node-label">{data.label}</div>
        {data.description && <div className="mind-node-desc">{data.description}</div>}
        <div className="mind-node-badges">
          <span className={`provenance-badge prov-${data.provenance}`}>{data.provenance}</span>
          {data.intensity !== null && <span className="mini-badge">{Math.round(intensity * 100)}% reported</span>}
          {typeof data.frequency === 'number' && data.frequency > 0 && <span className="mini-badge">{data.frequency}× observed</span>}
          {data.locked && <Lock size={11} aria-label="Position locked" />}
          {data.collapsed && <Rows3 size={11} aria-label="Collapsed" />}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" className="mind-handle" />
      <Handle type="source" position={Position.Right} id="right" className="mind-handle" />
    </div>
  );
}

export default memo(MindNeuronNodeView);
