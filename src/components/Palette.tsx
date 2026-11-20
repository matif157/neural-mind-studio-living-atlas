import { memo } from 'react';
import { Activity, Brain, CircleDot, Heart, Lightbulb, Plus, Sparkles, Zap, GitBranch, ArrowUpRight } from 'lucide-react';
import { NODE_META, type MindNodeKind } from '../types/mind';
import { scenarios } from '../data/scenarios';
import { useMindStore } from '../store/mindStore';

const nodeIcons = {
  emotion: Heart, thought: Lightbulb, memory: Brain, pattern: GitBranch,
  need: Sparkles, body: Activity, behavior: ArrowUpRight, trigger: Zap, belief: CircleDot, context: CircleDot,
};

interface PaletteProps {
  onAdd: (kind: MindNodeKind) => void;
}

function Palette({ onAdd }: PaletteProps) {
  const activeScenario = useMindStore((state) => state.activeScenario);
  const setActiveScenario = useMindStore((state) => state.setActiveScenario);
  return (
    <aside className="side-panel palette-panel">
      <div className="panel-kicker">BUILD YOUR MAP</div>
      <div className="panel-heading">Neural elements</div>
      <p className="panel-copy">Add a mental event, then connect it to what influences or follows it.</p>
      <div className="palette-list">
        {(Object.keys(NODE_META) as MindNodeKind[]).map((kind) => {
          const meta = NODE_META[kind];
          const Icon = nodeIcons[kind];
          return (
            <button className="palette-item" key={kind} onClick={() => onAdd(kind)}>
              <span className="palette-icon" style={{ color: meta.color, background: meta.tint }}><Icon size={16} /></span>
              <span className="palette-label">{meta.label}</span>
              <Plus size={14} className="palette-plus" />
            </button>
          );
        })}
      </div>
      <div className="panel-separator" />
      <div className="panel-kicker">PATHWAY EXAMPLES</div>
      <div className="scenario-list">
        {scenarios.map((scenario) => (
          <button
            className={`scenario-button ${activeScenario === scenario.id ? 'is-active' : ''}`}
            key={scenario.id}
            onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
          >
            <span className="scenario-dot" style={{ background: scenario.color, boxShadow: `0 0 14px ${scenario.color}70` }} />
            <span><strong>{scenario.title}</strong><small>{scenario.subtitle}</small></span>
          </button>
        ))}
      </div>
      <div className="palette-tip"><span className="tip-glyph">⌘</span> Drag nodes to move · Drag a handle to connect</div>
    </aside>
  );
}

export default memo(Palette);
