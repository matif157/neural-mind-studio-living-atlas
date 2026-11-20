import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Check, Link2,
  Pencil, Save, ShieldAlert, Trash2, Unlink, X,
} from 'lucide-react';
import {
  MIND_RELATIONS, NODE_STATUSES, PROVENANCE_LABELS, VALENCES,
  type MindRelation, type Provenance,
} from '@shared/domain';
import { useMindStore } from '../store/mindStore';
import { useUiStore } from '../store/uiStore';
import {
  getMindNodeColor, NODE_META, type MindEdge, type MindNode,
  type MindNodeData, type MindNodeKind, type ThoughtValence,
} from '../types/mind';

interface InspectorProps { selectedNode: MindNode | null; selectedEdge: MindEdge | null }

function Inspector({ selectedNode, selectedEdge }: InspectorProps) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const customCategories = useMindStore((state) => state.customCategories);
  const customRelations = useMindStore((state) => state.customRelations);
  const updateNode = useMindStore((state) => state.updateNode);
  const updateEdge = useMindStore((state) => state.updateEdge);
  const reverseEdge = useMindStore((state) => state.reverseEdge);
  const deleteNode = useMindStore((state) => state.deleteNode);
  const deleteEdge = useMindStore((state) => state.deleteEdge);
  const acceptNode = useMindStore((state) => state.acceptNode);
  const correctNode = useMindStore((state) => state.correctNode);
  const rejectNode = useMindStore((state) => state.rejectNode);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const [draft, setDraft] = useState<MindNodeData | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<{
    relation: MindRelation; customRelation: string; weight: number; note: string;
    explanation: string; direction: 'forward' | 'reverse' | 'bidirectional'; provenance: Provenance;
  } | null>(null);

  useEffect(() => {
    setDraft(selectedNode ? { ...selectedNode.data, tags: [...selectedNode.data.tags], evidence: [...selectedNode.data.evidence] } : null);
  }, [selectedNode?.id, selectedNode?.data]);
  useEffect(() => {
    if (selectedEdge) setEdgeDraft({
      relation: selectedEdge.data?.relation ?? 'activates',
      customRelation: selectedEdge.data?.customRelation ?? '',
      weight: selectedEdge.data?.weight ?? 0.6,
      note: selectedEdge.data?.note ?? '',
      explanation: selectedEdge.data?.explanation ?? '',
      direction: selectedEdge.data?.direction ?? 'forward',
      provenance: selectedEdge.data?.provenance ?? 'user-confirmed',
    });
    else setEdgeDraft(null);
  }, [selectedEdge?.id, selectedEdge?.data]);

  const connected = useMemo(() => selectedNode
    ? edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
    : [], [edges, selectedNode]);

  if (selectedEdge && edgeDraft) {
    const source = nodes.find((node) => node.id === selectedEdge.source);
    const target = nodes.find((node) => node.id === selectedEdge.target);
    const relationOptions = [
      ...MIND_RELATIONS.map((relation) => ({ value: relation, label: relation })),
      ...customRelations.map((relation) => ({ value: `custom:${relation.id}`, label: relation.label })),
    ];
    return (
      <aside className="side-panel inspector-panel">
        <div className="panel-kicker">SYNAPTIC CONNECTION</div>
        <div className="panel-heading">Relationship</div>
        <p className="panel-copy">Define what this pathway means in your conceptual model. Links are interpretations, not proof of cause.</p>
        <div className="connection-card">
          <div className="connection-end"><span className="connection-node-dot" style={{ background: source ? getMindNodeColor(source.data) : '#8292aa' }} />{source?.data.label ?? 'Unknown node'}</div>
          <ArrowDownRight size={16} className="connection-arrow" />
          <div className="connection-end"><span className="connection-node-dot" style={{ background: target ? getMindNodeColor(target.data) : '#8292aa' }} />{target?.data.label ?? 'Unknown node'}</div>
        </div>
        <label className="field-label">Relationship type</label>
        <select className="field-control" value={edgeDraft.customRelation ? `custom:${edgeDraft.customRelation}` : edgeDraft.relation}
          onChange={(event) => {
            const value = event.target.value;
            if (value.startsWith('custom:')) {
              const relation = customRelations.find((item) => item.id === value.slice(7));
              setEdgeDraft({ ...edgeDraft, customRelation: relation?.id ?? '', relation: relation?.baseRelation ?? 'associated with' });
            } else setEdgeDraft({ ...edgeDraft, customRelation: '', relation: value as MindRelation });
          }}>
          {relationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label className="field-label">Direction</label>
        <select className="field-control" value={edgeDraft.direction} onChange={(event) => setEdgeDraft({ ...edgeDraft, direction: event.target.value as typeof edgeDraft.direction })}>
          <option value="forward">Forward (source → target)</option>
          <option value="reverse">Reverse (target → source)</option>
          <option value="bidirectional">Bidirectional</option>
        </select>
        <label className="field-label field-label-row"><span>Connection weight</span><strong>{Math.round(edgeDraft.weight * 100)}%</strong></label>
        <input className="range-control" type="range" min={0} max={1} step={0.05} value={edgeDraft.weight} onChange={(event) => setEdgeDraft({ ...edgeDraft, weight: Number(event.target.value) })} />
        <label className="field-label">Explanation</label>
        <textarea className="field-control field-textarea" rows={3} value={edgeDraft.explanation} placeholder="Why might these two nodes be connected?" onChange={(event) => setEdgeDraft({ ...edgeDraft, explanation: event.target.value })} />
        <label className="field-label">Private note</label>
        <textarea className="field-control field-textarea" rows={2} value={edgeDraft.note} onChange={(event) => setEdgeDraft({ ...edgeDraft, note: event.target.value })} />
        <label className="field-label">Evidence label</label>
        <select className="field-control" value={edgeDraft.provenance} onChange={(event) => setEdgeDraft({ ...edgeDraft, provenance: event.target.value as Provenance })}>
          {PROVENANCE_LABELS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="inspector-actions">
          <button className="primary-button" onClick={() => updateEdge(selectedEdge.id, { ...edgeDraft })}><Save size={14} /> Save relationship</button>
          <button className="icon-button" title="Reverse source and target" onClick={() => reverseEdge(selectedEdge.id)}><ArrowLeftRight size={16} /></button>
          <button className="icon-danger" title="Remove connection" onClick={() => deleteEdge(selectedEdge.id)}><Unlink size={15} /></button>
        </div>
      </aside>
    );
  }

  if (!selectedNode || !draft) {
    return (
      <aside className="side-panel inspector-panel inspector-empty">
        <div className="panel-kicker">NODE INSPECTOR</div>
        <div className="empty-inspector-orb"><Activity size={26} /></div>
        <div className="panel-heading">Select a neuron</div>
        <p className="panel-copy">Select any node to inspect its meaning, original wording, intensity and connections. Drag from a handle to another node to create a relationship.</p>
        <div className="inspector-hint"><Link2 size={14} /> Connections are editable relationships, not fixed biological wiring.</div>
      </aside>
    );
  }

  const meta = NODE_META[draft.kind];
  const custom = draft.customKind ? customCategories.find((item) => item.id === draft.customKind) : undefined;
  const nodeColor = custom?.color ?? getMindNodeColor(draft);
  const patch = (value: Partial<MindNodeData>) => setDraft((current) => current ? { ...current, ...value } : current);
  const valences: ThoughtValence[] = [...VALENCES];

  return (
    <aside className="side-panel inspector-panel">
      <div className="inspector-node-heading">
        <span className="inspector-kind-icon" style={{ color: nodeColor, background: meta.tint }}>{meta.icon}</span>
        <div><div className="panel-kicker">{custom?.label ?? meta.label.toUpperCase()} NODE</div><div className="panel-heading">Node inspector</div></div>
      </div>

      {draft.status === 'draft' && (
        <div className="review-banner">
          <ShieldAlert size={16} />
          <span>AI-suggested draft. Nothing is confirmed until you review it.</span>
          <div className="review-actions">
            <button onClick={() => acceptNode(selectedNode.id)}><Check size={13} /> Confirm</button>
            <button onClick={() => correctNode(selectedNode.id, draft)}><Pencil size={13} /> Correct</button>
            <button onClick={() => { rejectNode(selectedNode.id); setSelectedNode(null); }}><X size={13} /> Reject</button>
          </div>
        </div>
      )}

      <label className="field-label">Node type</label>
      <select className="field-control" value={draft.kind} onChange={(event) => patch({ kind: event.target.value as MindNodeKind, customKind: undefined })}>
        {(Object.keys(NODE_META) as MindNodeKind[]).map((kind) => <option key={kind} value={kind}>{NODE_META[kind].label}</option>)}
      </select>
      {customCategories.length > 0 && (
        <select className="field-control spaced" value={draft.customKind ?? ''} onChange={(event) => {
          const category = customCategories.find((item) => item.id === event.target.value);
          patch({ customKind: category?.id, kind: category?.baseKind ?? draft.kind });
        }}>
          <option value="">Use standard category</option>
          {customCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
      )}
      <label className="field-label">Node title</label>
      <input className="field-control" value={draft.label} onChange={(event) => patch({ label: event.target.value })} />
      <label className="field-label">Description</label>
      <textarea className="field-control field-textarea" rows={2} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
      <label className="field-label">Original user wording (never rewritten)</label>
      <textarea className="field-control field-textarea" rows={2} value={draft.originalText ?? ''} placeholder="Exact words, if this node came from a conversation" onChange={(event) => patch({ originalText: event.target.value })} />
      <label className="field-label">Context / situation</label>
      <textarea className="field-control field-textarea" rows={2} value={draft.context ?? ''} onChange={(event) => patch({ context: event.target.value })} />
      <label className="field-label">Inner voice</label>
      <textarea className="field-control field-textarea voice-field" rows={2} value={draft.innerVoice} onChange={(event) => patch({ innerVoice: event.target.value })} />
      <label className="field-label">Balanced / alternative voice</label>
      <textarea className="field-control field-textarea" rows={2} value={draft.balancedVoice} onChange={(event) => patch({ balancedVoice: event.target.value })} />
      <label className="field-label field-label-row"><span>Self-reported intensity</span><strong>{draft.intensity === null ? 'Not reported' : `${Math.round(draft.intensity * 100)}%`}</strong></label>
      <input className="range-control" type="range" min={0} max={1} step={0.01} value={draft.intensity ?? 0} onChange={(event) => patch({ intensity: Number(event.target.value) })} />
      <button className="text-button" onClick={() => patch({ intensity: null })}>Clear intensity (AI must never infer one)</button>
      <label className="field-label">Valence</label>
      <select className="field-control" value={draft.valence} onChange={(event) => patch({ valence: event.target.value as ThoughtValence })}>
        {valences.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <div className="field-grid">
        <div><label className="field-label">Evidence label</label>
          <select className="field-control" value={draft.provenance} onChange={(event) => patch({ provenance: event.target.value as Provenance })}>
            {PROVENANCE_LABELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div><label className="field-label">Status</label>
          <select className="field-control" value={draft.status} onChange={(event) => patch({ status: event.target.value as MindNodeData['status'] })}>
            {NODE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {draft.confidence !== null && <p className="confidence-note">Interpretation confidence: {Math.round(draft.confidence * 100)}% (not a clinical probability)</p>}
      {draft.evidence.length > 0 && (
        <div className="evidence-block">
          <div className="connected-heading"><span>Supporting conversation evidence</span><strong>{draft.evidence.length}</strong></div>
          {draft.evidence.slice(0, 4).map((item) => <div className="evidence-row" key={`${item.eventId}-${item.date}`}><span>{item.date.slice(0, 10)}</span><p>“{item.excerpt}”</p></div>)}
        </div>
      )}
      <label className="field-label">Tags (comma separated)</label>
      <input className="field-control" value={draft.tags.join(', ')} onChange={(event) => patch({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
      <div className="connected-heading"><span>Connected relationships</span><strong>{connected.length}</strong></div>
      <div className="connected-list">
        {connected.slice(0, 8).map((edge) => {
          const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
          const other = nodes.find((node) => node.id === otherId);
          const outgoing = edge.source === selectedNode.id;
          return <div className="connected-row" key={edge.id}>
            {outgoing ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            <span>{other?.data.label ?? 'Unknown'}</span>
            <small>{edge.data?.customRelation ? customRelations.find((item) => item.id === edge.data?.customRelation)?.label : edge.data?.relation}</small>
          </div>;
        })}
        {!connected.length && <div className="muted-note">No connections yet. Drag a handle to another node.</div>}
      </div>
      <div className="inspector-actions">
        <button className="primary-button" onClick={() => updateNode(selectedNode.id, draft)}><Save size={14} /> Save changes</button>
        <button className="icon-danger" title="Delete node" onClick={() => { deleteNode(selectedNode.id); setSelectedNode(null); }}><Trash2 size={16} /></button>
      </div>
    </aside>
  );
}

export default Inspector;
