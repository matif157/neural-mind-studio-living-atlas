import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Activity, Brain, CircleDot, Heart, Lightbulb, Link2, Sparkles } from 'lucide-react';
import { NODE_META, getMindNodeColor, type MindNode } from '../types/mind';
import { scenarios } from '../data/scenarios';
import { useMindStore } from '../store/mindStore';

const glyphs = {
  emotion: Heart, thought: Lightbulb, memory: Brain, pattern: Activity,
  need: Sparkles, body: CircleDot, behavior: Link2, trigger: Activity, belief: Brain, context: CircleDot,
};

function MindNeuronNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const activeScenario = useMindStore((state) => state.activeScenario);
  const scenario = scenarios.find((item) => item.id === activeScenario);
  const meta = NODE_META[data.kind];
  const nodeColor = getMindNodeColor(data);
  const Icon = glyphs[data.kind];
  const isDimmed = Boolean(scenario && !scenario.nodeIds.includes(id));
  const intensity = Math.max(0.08, Math.min(1, data.intensity ?? 0.5));

  return (
    <div
      className={`mind-node mind-node--${data.kind} ${selected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
      style={{ '--node-color': nodeColor, '--node-tint': meta.tint, '--node-intensity': intensity } as CSSProperties}
      title={`${data.label} · ${meta.label}`}
    >
      <Handle type="target" position={Position.Top} id="top" className="mind-handle" />
      <Handle type="target" position={Position.Left} id="left" className="mind-handle" />
      <div className="neuron-shell">
        <span className="neuron-orbit neuron-orbit--one" />
        <span className="neuron-orbit neuron-orbit--two" />
        <span className="neuron-dendrite dendrite-a" />
        <span className="neuron-dendrite dendrite-b" />
        <span className="neuron-dendrite dendrite-c" />
        <span className="neuron-core"><Icon size={20} strokeWidth={1.8} /></span>
        <span className="neuron-pulse" />
      </div>
      <div className="mind-node-copy">
        <div className="mind-node-kind">{meta.label}</div>
        <div className="mind-node-label">{data.label}</div>
        <div className="mind-node-meter"><span style={{ width: `${intensity * 100}%` }} /></div>
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" className="mind-handle" />
      <Handle type="source" position={Position.Right} id="right" className="mind-handle" />
    </div>
  );
}

export default memo(MindNeuronNodeView);
