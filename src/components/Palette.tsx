import { memo, useState } from 'react';
import { Plus, WandSparkles } from 'lucide-react';
import { MIND_NODE_KINDS, PRIMARY_BRANCHES } from '@shared/domain';
import { scenarios } from '../data/scenarios';
import { useMindStore } from '../store/mindStore';
import { useUiStore } from '../store/uiStore';
import { NODE_META, type MindNodeKind } from '../types/mind';
import { iconFor } from './iconFor';

interface PaletteProps {
  onAdd: (kind: MindNodeKind, customKindId?: string) => void;
}

function Palette({ onAdd }: PaletteProps) {
  const activeScenario = useMindStore((state) => state.activeScenario);
  const setActiveScenario = useMindStore((state) => state.setActiveScenario);
  const customCategories = useMindStore((state) => state.customCategories);
  const addCustomCategory = useMindStore((state) => state.addCustomCategory);
  const setQuery = useUiStore((state) => state.setQuery);
  const [newCategory, setNewCategory] = useState('');
  const [, setExpanded] = useState(false);

  const createCategory = () => {
    const label = newCategory.trim();
    if (!label) return;
    const id = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    addCustomCategory({ id, label, color: '#9fb3c8', definition: 'A user-defined category.', baseKind: 'thought' });
    setNewCategory('');
    setExpanded(true);
  };

  return (
    <aside className="side-panel palette-panel">
      <div className="panel-kicker">BUILD YOUR MAP</div>
      <div className="panel-heading">Neural elements</div>
      <p className="panel-copy">Add a mental event, then connect it to what influences or follows it.</p>
      <div className="palette-list">
        {MIND_NODE_KINDS.filter((kind) => kind !== 'root').map((kind) => {
          const meta = NODE_META[kind];
          const Icon = iconFor(meta.icon);
          return (
            <button className="palette-item" key={kind} onClick={() => onAdd(kind)} title={meta.definition}>
              <span className="palette-icon" style={{ color: meta.color, background: meta.tint }}><Icon size={16} /></span>
              <span className="palette-label">{meta.label}</span>
              <Plus size={14} className="palette-plus" />
            </button>
          );
        })}
      </div>

      {customCategories.length > 0 && (
        <>
          <div className="panel-separator" />
          <div className="panel-kicker">CUSTOM CATEGORIES</div>
          <div className="palette-list">
            {customCategories.map((category) => (
              <button className="palette-item" key={category.id} onClick={() => onAdd(category.baseKind, category.id)} title={category.definition}>
                <span className="palette-icon" style={{ color: category.color, background: `${category.color}22` }}><WandSparkles size={16} /></span>
                <span className="palette-label">{category.label}</span>
                <Plus size={14} className="palette-plus" />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="inline-form">
        <input aria-label="New category name" placeholder="New category…" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createCategory(); }} />
        <button onClick={createCategory} aria-label="Add custom category"><Plus size={15} /></button>
      </div>

      <div className="panel-separator" />
      <div className="panel-kicker">MAJOR BRANCHES</div>
      <div className="branch-list">
        {PRIMARY_BRANCHES.map((branch) => (
          <button key={branch.id} onClick={() => { setQuery(branch.label); setExpanded(true); }} title={`Filter the map for ${branch.label}`}>
            <span className="branch-dot" style={{ background: branch.color }} />{branch.label}
          </button>
        ))}
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
