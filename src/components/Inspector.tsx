import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Link2, Save, Trash2, Unlink } from 'lucide-react';
import { NODE_META, getMindNodeColor, RELATIONS, type MindEdge, type MindNode, type MindNodeData, type MindNodeKind, type MindRelation, type ThoughtValence } from '../types/mind';
import { useMindStore } from '../store/mindStore';

interface InspectorProps {
  selectedNode: MindNode | null;
  selectedEdge: MindEdge | null;
}

function Inspector({ selectedNode, selectedEdge }: InspectorProps) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const updateNode = useMindStore((state) => state.updateNode);
  const updateEdge = useMindStore((state) => state.updateEdge);
  const deleteNode = useMindStore((state) => state.deleteNode);
  const deleteEdge = useMindStore((state) => state.deleteEdge);
  const connected = useMemo(() => selectedNode ? edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id) : [], [edges, selectedNode]);
  const [draft, setDraft] = useState<MindNodeData | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<{ relation: MindRelation; weight: number; note: string } | null>(null);

  useEffect(() => { setDraft(selectedNode ? { ...selectedNode.data, tags: [...selectedNode.data.tags] } : null); }, [selectedNode?.id, selectedNode?.data]);
  useEffect(() => { if (selectedEdge) setEdgeDraft({ relation: selectedEdge.data?.relation ?? 'activates', weight: selectedEdge.data?.weight ?? 0.6, note: selectedEdge.data?.note ?? '' }); else setEdgeDraft(null); }, [selectedEdge?.id]);

  if (selectedEdge && edgeDraft) {
    const source = nodes.find((node) => node.id === selectedEdge.source);
    const target = nodes.find((node) => node.id === selectedEdge.target);
    return (
      <aside className="side-panel inspector-panel">
        <div className="panel-kicker">SYNAPTIC CONNECTION</div>
        <div className="panel-heading">Relationship</div>
        <p className="panel-copy">Define what this pathway means in your conceptual model.</p>
        <div className="connection-card">
          <div className="connection-end"><span className="connection-node-dot" style={{ background: source ? getMindNodeColor(source.data) : '#8292aa' }} />{source?.data.label ?? 'Unknown node'}</div>
          <ArrowDownRight size={16} className="connection-arrow" />
          <div className="connection-end"><span className="connection-node-dot" style={{ background: target ? getMindNodeColor(target.data) : '#8292aa' }} />{target?.data.label ?? 'Unknown node'}</div>
        </div>
        <label className="field-label">Relationship type</label>
        <select className="field-control" value={edgeDraft.relation} onChange={(event) => setEdgeDraft({ ...edgeDraft, relation: event.target.value as MindRelation })}>
          {RELATIONS.map((relation) => <option key={relation} value={relation}>{relation}</option>)}
        </select>
        <label className="field-label field-label-row"><span>Connection weight</span><strong>{Math.round(edgeDraft.weight * 100)}%</strong></label>
        <input className="range-control" type="range" min="0.05" max="1" step="0.05" value={edgeDraft.weight} onChange={(event) => setEdgeDraft({ ...edgeDraft, weight: Number(event.target.value) })} />
        <label className="field-label">Interpretation / note</label>
        <textarea className="field-control field-textarea" rows={4} value={edgeDraft.note} placeholder="Why might these two nodes be connected?" onChange={(event) => setEdgeDraft({ ...edgeDraft, note: event.target.value })} />
        <button className="primary-button full-button" onClick={() => updateEdge(selectedEdge.id, edgeDraft)}><Save size={14} /> Save relationship</button>
        <button className="danger-button full-button" onClick={() => deleteEdge(selectedEdge.id)}><Unlink size={15} /> Remove connection</button>
      </aside>
    );
  }

  if (!selectedNode || !draft) {
    return (
      <aside className="side-panel inspector-panel inspector-empty">
        <div className="panel-kicker">NODE INSPECTOR</div>
        <div className="empty-inspector-orb"><Activity size={26} /></div>
        <div className="panel-heading">Select a neuron</div>
        <p className="panel-copy">Select any node to inspect its meaning, inner dialogue, intensity and connections. You can also drag from one node handle to another to create a synapse.</p>
        <div className="inspector-hint"><Link2 size={14} /> Connections are editable relationships, not fixed biological wiring.</div>
      </aside>
    );
  }

  const meta = NODE_META[draft.kind];
  const nodeColor = getMindNodeColor(draft);
  const patch = (value: Partial<MindNodeData>) => setDraft((current) => current ? { ...current, ...value } : current);
  const save = () => updateNode(selectedNode.id, draft);
  const valences: ThoughtValence[] = ['positive', 'negative', 'mixed', 'neutral'];

  return (
    <aside className="side-panel inspector-panel">
      <div className="inspector-node-heading">
        <span className="inspector-kind-icon" style={{ color: nodeColor, background: meta.tint }}>{meta.icon}</span>
        <div><div className="panel-kicker">{meta.label.toUpperCase()} NODE</div><div className="panel-heading">Node inspector</div></div>
      </div>
      <label className="field-label">Node type</label>
      <select className="field-control" value={draft.kind} onChange={(event) => patch({ kind: event.target.value as MindNodeKind })}>
        {(Object.keys(NODE_META) as MindNodeKind[]).map((kind) => <option key={kind} value={kind}>{NODE_META[kind].label}</option>)}
      </select>
      <label className="field-label">Node title</label>
      <input className="field-control" value={draft.label} onChange={(event) => patch({ label: event.target.value })} />
      <label className="field-label">Description</label>
      <textarea className="field-control field-textarea" rows={3} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
      <label className="field-label">Inner voice</label>
      <textarea className="field-control field-textarea voice-field" rows={3} value={draft.innerVoice} onChange={(event) => patch({ innerVoice: event.target.value })} />
      <label className="field-label">Balanced / alternative voice</label>
      <textarea className="field-control field-textarea" rows={3} value={draft.balancedVoice} onChange={(event) => patch({ balancedVoice: event.target.value })} />
      <label className="field-label field-label-row"><span>Perceived intensity</span><strong>{Math.round(draft.intensity * 100)}%</strong></label>
      <input className="range-control" type="range" min="0" max="1" step="0.01" value={draft.intensity} onChange={(event) => patch({ intensity: Number(event.target.value) })} />
      <label className="field-label">Valence</label>
      <select className="field-control" value={draft.valence} onChange={(event) => patch({ valence: event.target.value as ThoughtValence })}>
        {valences.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <label className="field-label">Tags (comma separated)</label>
      <input className="field-control" value={draft.tags.join(', ')} onChange={(event) => patch({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
      <div className="connected-heading"><span>Connected synapses</span><strong>{connected.length}</strong></div>
      <div className="connected-list">
        {connected.slice(0, 8).map((edge) => {
          const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
          const other = nodes.find((node) => node.id === otherId);
          const outgoing = edge.source === selectedNode.id;
          return <div className="connected-row" key={edge.id}><span className="connected-direction">{outgoing ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}</span><span>{other?.data.label ?? 'Unknown'}</span><small>{edge.data?.relation}</small></div>;
        })}
        {!connected.length && <div className="muted-note">No connections yet. Drag a handle to another node.</div>}
      </div>
      <div className="inspector-actions">
        <button className="primary-button" onClick={save}><Save size={14} /> Save changes</button>
        <button className="icon-danger" title="Delete node" onClick={() => deleteNode(selectedNode.id)}><Trash2 size={16} /></button>
      </div>
    </aside>
  );
}

export default Inspector;
