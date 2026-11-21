import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, Check, ChevronDown, Download, Eye, EyeOff,
  FileText, Link2, Plus, Search, Shield, ShieldAlert, Sparkles, Trash2,
} from 'lucide-react';
import {
  EVIDENCE_CLASSES, MIND_DIMENSIONS, MIND_NODE_KINDS, NODE_META,
  TEMPORAL_STATUSES, TIMELINE_ERAS, eraRank, getNodeDimension,
  type MindNodeKind, type MindRelation,
} from '@shared/domain';
import {
  checkInEntrySchema, decisionRecordSchema, journalEntrySchema,
  type DecisionRecord, type JournalEntry,
} from '@shared/schemas';
import { BODY_SENSATIONS, EMOTION_TAXONOMY, NEEDS_TAXONOMY } from '@shared/taxonomy';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import type { MindNode, MindNodeData } from '../../types/mind';
import { suggestLinksForText, timelineGroups } from '../../lib/connectionDiscovery';
import { cognitiveLoops, thoughtRecurrence } from '../../lib/patterns';
import { deleteLocal, STORAGE_KEYS } from '../../lib/db';
import { createProjectFile } from '../../utils/projectFile';
import { displayLabel, effectivePrivacy, isNodeDisplayable, isNodeMasked, privacyPatch, sensitivityOf, type EffectivePrivacy } from '../../utils/privacy';
import { EmptyState, nextNodePosition, WorkspaceIntro } from '../../lib/workspaceUtils';

interface Props { notify: (message: string) => void }

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

function useAtlas() {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const revealSensitive = useMindStore((state) => state.sensitiveContentVisible);
  const hiddenKinds = useMindStore((state) => state.hiddenKinds);
  const privateMode = useConversationStore((state) => state.sensitivePrivateMode);
  const view = useMemo(() => ({ revealSensitive, privateMode, hiddenKinds }), [revealSensitive, privateMode, hiddenKinds]);
  const visible = useMemo(() => nodes.filter((node) => isNodeDisplayable(node, view)), [nodes, view]);
  const readable = useMemo(() => visible.filter((node) => !isNodeMasked(node, view)), [visible, view]);
  return { nodes, edges, view, visible, readable };
}

function labelOf(node: MindNode, view: ReturnType<typeof useAtlas>['view']) {
  return displayLabel(node, view);
}

function addNode(kind: MindNodeKind, label: string, patch: Partial<MindNodeData> = {}): string {
  const store = useMindStore.getState();
  return store.addNode(kind, nextNodePosition(store.nodes), label, {
    provenance: 'directly-stated',
    temporalStatus: 'current',
    evidenceClass: 'directly-reported',
    ...patch,
  });
}

function linkNodes(source: string, target: string, relation: MindRelation) {
  useMindStore.getState().addConnection({ source, target, sourceHandle: null, targetHandle: null }, relation);
}

function goToNode(nodeId: string, workspace = 'atlas') {
  const ui = useUiStore.getState();
  ui.setSelectedNode(nodeId);
  ui.setWorkspace(workspace as Parameters<typeof ui.setWorkspace>[0]);
  window.setTimeout(() => {
    const node = useMindStore.getState().nodes.find((item) => item.id === nodeId);
    if (node) useMindStore.getState().setNodes(useMindStore.getState().nodes.map((item) => ({ ...item, selected: item.id === nodeId })));
  }, 20);
}

function Field({ label, value, onChange, placeholder, rows }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className="mini-field">{label}
      {rows ? (
        <textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (value: string) => void;
}) {
  return (
    <label className="mini-field">{label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EvidenceNote({ children }: { children: React.ReactNode }) {
  return <div className="safety-banner compact"><ShieldAlert size={15} /><span>{children}</span></div>;
}

/* ------------------------------------------------------------------ */
/* C — Personal Timeline                                               */
/* ------------------------------------------------------------------ */

export function PersonalTimeline({ notify }: Props) {
  const { edges, readable, view } = useAtlas();
  const suggestions = useMindStore((state) => state.suggestions);
  const acceptSuggestion = useMindStore((state) => state.acceptSuggestion);
  const updateNode = useMindStore((state) => state.updateNode);
  const addConnection = useMindStore((state) => state.addConnection);
  const [era, setEra] = useState<string>('all');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  const groups = useMemo(() => timelineGroups(readable), [readable]);
  const shown = era === 'all' ? groups : groups.filter((group) => group.era === era);
  const timelineSuggestions = suggestions.filter((item) => item.rule === 'occurred-before' && item.status === 'pending');
  const presentNodes = readable.filter((node) => node.data.temporalStatus === 'current' || node.data.temporalStatus === 'recurring');
  const earlierNodes = readable.filter((node) => node.data.temporalStatus === 'historical' || eraRank(node.data.era) < eraRank('present'));

  const link = () => {
    if (!fromId || !toId || fromId === toId) { notify('Choose two different records to link.'); return; }
    addConnection({ source: fromId, target: toId, sourceHandle: null, targetHandle: null }, 'occurred before');
    notify('Order recorded. You can edit or delete this link at any time.');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="DIMENSION 1 / LIFE TIMELINE" title="Personal Timeline" copy="Place experiences in the order you stated. An earlier event is never treated as the cause of a later feeling — that link is yours to make or decline.">
        <span>{readable.length} readable records</span><span>{groups.length} era groups</span>
      </WorkspaceIntro>
      <div className="timeline-toolbar">
        <label className="chip-select">Era
          <select value={era} onChange={(event) => setEra(event.target.value)}>
            <option value="all">All eras</option>
            {TIMELINE_ERAS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <span className="timeline-hint">Undated records stay in their own group. Document order is never used as evidence of when something happened.</span>
      </div>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Your stated sequence</h3><span className="chip">Editable</span></div>
          {shown.length === 0 ? <EmptyState>No records in this era yet. Add a memory or observation in another workspace.</EmptyState> : (
            <div className="era-list">
              {shown.map((group) => (
                <div className="era-block" key={group.era}>
                  <div className="era-title"><span>{group.era}</span><small>{group.nodes.length} record(s)</small></div>
                  {group.nodes.map((node) => (
                    <div className="era-entry" key={node.id}>
                      <i style={{ background: NODE_META[node.data.kind].color }} />
                      <div className="era-entry-copy">
                        <strong>{labelOf(node, view)}</strong>
                        <small>{node.data.timePeriod || 'time not stated'} · {node.data.temporalStatus ?? 'unknown'} · {node.data.kind}</small>
                      </div>
                      <div className="era-entry-meta">
                        <select aria-label={`Era for ${node.data.label}`} value={node.data.era ?? 'undated'} onChange={(event) => updateNode(node.id, { era: event.target.value as MindNodeData['era'] }, 'Timeline era set')}>
                          {TIMELINE_ERAS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select aria-label={`Timeframe for ${node.data.label}`} value={node.data.temporalStatus ?? 'unknown'} onChange={(event) => updateNode(node.id, { temporalStatus: event.target.value as MindNodeData['temporalStatus'] }, 'Temporal status set')}>
                          {TEMPORAL_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <button className="text-button" onClick={() => goToNode(node.id)}>Open →</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Link an earlier and a later record</h3><span className="chip">Your confirmation</span></div>
          <label className="mini-field">Earlier experience
            <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
              <option value="">Select…</option>
              {earlierNodes.map((node) => <option key={node.id} value={node.id}>{labelOf(node, view)}</option>)}
            </select>
          </label>
          <label className="mini-field">Later observation
            <select value={toId} onChange={(event) => setToId(event.target.value)}>
              <option value="">Select…</option>
              {presentNodes.map((node) => <option key={node.id} value={node.id}>{labelOf(node, view)}</option>)}
            </select>
          </label>
          <button className="primary-button full-button" onClick={link}><Link2 size={14} /> Record order</button>
          <EvidenceNote>This only records sequence. It does not say that the earlier event caused the later observation.</EvidenceNote>
          <div className="card-head spaced"><h3>Suggested order</h3><span className="chip">{timelineSuggestions.length} pending</span></div>
          {timelineSuggestions.length === 0 ? <EmptyState>No order suggestions yet. Add timeframes to your records, then refresh in Connection Explorer.</EmptyState> : (
            <div className="node-record-list">
              {timelineSuggestions.slice(0, 10).map((item) => {
                const source = readable.find((node) => node.id === item.source);
                const target = readable.find((node) => node.id === item.target);
                if (!source || !target) return null;
                return (
                  <div className="node-record" key={item.id}>
                    <div className="node-record-head"><strong>{labelOf(source, view)} → {labelOf(target, view)}</strong><span className="chip">{item.confidenceBand}</span></div>
                    <small>{item.evidence}</small>
                    <div className="inline-actions"><button className="primary-button small" onClick={() => acceptSuggestion(item.id)}><Check size={12} /> Confirm</button></div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="panel-microcopy">{edges.length} relationship(s) currently in the map.</p>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B — Connection Explorer                                             */
/* ------------------------------------------------------------------ */

export function ConnectionExplorer({ notify }: Props) {
  const { nodes, edges, readable, view } = useAtlas();
  const suggestions = useMindStore((state) => state.suggestions);
  const refreshSuggestions = useMindStore((state) => state.refreshSuggestions);
  const acceptSuggestion = useMindStore((state) => state.acceptSuggestion);
  const rejectSuggestion = useMindStore((state) => state.rejectSuggestion);
  const deleteSuggestion = useMindStore((state) => state.deleteSuggestion);
  const updateSuggestion = useMindStore((state) => state.updateSuggestion);
  const deleteEdge = useMindStore((state) => state.deleteEdge);
  const [filter, setFilter] = useState<'pending' | 'all' | 'reviewed'>('pending');
  const [editingId, setEditingId] = useState('');
  const [draftRelation, setDraftRelation] = useState<MindRelation>('may influence');
  const [draftExplanation, setDraftExplanation] = useState('');

  const shown = suggestions.filter((item) => filter === 'all' || (filter === 'pending' ? item.status === 'pending' : item.status !== 'pending'));
  const pendingCount = suggestions.filter((item) => item.status === 'pending').length;
  const relationOptions: MindRelation[] = [
    'may influence', 'may trigger', 'associated with', 'occurred before', 'reinforces',
    'coping response to', 'supports', 'conflicts with', 'alternative explanation', 'requires further exploration',
  ];

  const startEdit = (item: typeof suggestions[number]) => {
    setEditingId(item.id);
    setDraftRelation(item.relation);
    setDraftExplanation(item.explanation);
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="RELATIONSHIP DISCOVERY" title="Connection Explorer" copy="Why might two concepts be related? Suggestions are questions generated offline from your own wording. Nothing enters the graph until you approve it.">
        <span>{pendingCount} awaiting review</span><span>{edges.length} confirmed links</span>
      </WorkspaceIntro>
      <div className="toolbar-inline">
        <button className="primary-button" onClick={() => {
          const count = refreshSuggestions();
          notify(count ? `${count} connection question(s) ready to review.` : 'No new suggestions from the current graph.');
        }}><Sparkles size={14} /> Discover connections</button>
        <div className="segmented" role="group" aria-label="Filter suggestions">
          {(['pending', 'reviewed', 'all'] as const).map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <span className="panel-microcopy">Discovery never calls a model and never edits your map by itself.</span>
      </div>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Connection questions</h3><span className="chip">Not established facts</span></div>
          {shown.length === 0 ? <EmptyState>No suggestions in this view. Add more concepts or run discovery again.</EmptyState> : (
            <div className="suggestion-list">
              {shown.map((item) => {
                const source = nodes.find((node) => node.id === item.source);
                const target = nodes.find((node) => node.id === item.target);
                const visible = source && target && readable.some((node) => node.id === source.id) && readable.some((node) => node.id === target.id);
                return (
                  <article className={`suggestion-card status-${item.status}`} key={item.id}>
                    <div className="suggestion-head">
                      <span className="chip">{item.status}</span>
                      <span className="chip relation">{item.relation}</span>
                      <span className="chip">{item.confidenceBand}</span>
                      <small>{item.rule}</small>
                    </div>
                    <div className="suggestion-path">
                      <button className="text-button" disabled={!visible || !source} onClick={() => source && goToNode(source.id)}>{source ? labelOf(source, view) : 'Unavailable'}</button>
                      <ArrowRight size={14} />
                      <button className="text-button" disabled={!visible || !target} onClick={() => target && goToNode(target.id)}>{target ? labelOf(target, view) : 'Unavailable'}</button>
                    </div>
                    <p>{item.explanation}</p>
                    <div className="suggestion-evidence"><strong>Supporting information</strong><span>{item.evidence || 'No excerpt recorded.'}</span></div>
                    <div className="suggestion-evidence"><strong>Evidence class</strong><span>{item.evidenceClass} · {item.rationale}</span></div>
                    {editingId === item.id ? (
                      <div className="suggestion-edit">
                        <SelectField label="Relationship type" value={draftRelation} options={relationOptions} onChange={(value) => setDraftRelation(value as MindRelation)} />
                        <Field label="Your revised explanation" value={draftExplanation} rows={3} onChange={setDraftExplanation} />
                        <div className="inline-actions">
                          <button className="primary-button small" onClick={() => {
                            updateSuggestion(item.id, { relation: draftRelation, explanation: draftExplanation });
                            setEditingId('');
                            notify('Suggestion edited. It stays a suggestion until confirmed.');
                          }}><Check size={12} /> Save edit</button>
                          <button className="text-button" onClick={() => setEditingId('')}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-actions">
                        {item.status !== 'approved' && <button className="primary-button small" onClick={() => { acceptSuggestion(item.id); notify('Reviewed connection added to your map.'); }}><Check size={12} /> Approve</button>}
                        {item.status === 'pending' && <button className="text-button" onClick={() => { rejectSuggestion(item.id); notify('Suggestion rejected.'); }}>Reject</button>}
                        <button className="text-button" onClick={() => startEdit(item)}>Edit</button>
                        <button className="text-button danger" onClick={() => deleteSuggestion(item.id)}><Trash2 size={12} /> Delete</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Confirmed relationships</h3><span className="chip">Editable in map</span></div>
          {edges.length === 0 ? <EmptyState>No confirmed links yet.</EmptyState> : (
            <div className="node-record-list">
              {[...edges].reverse().slice(0, 30).map((edge) => {
                const source = nodes.find((node) => node.id === edge.source);
                const target = nodes.find((node) => node.id === edge.target);
                if (!source || !target) return null;
                return (
                  <div className="node-record" key={edge.id}>
                    <div className="node-record-head"><strong>{labelOf(source, view)} → {labelOf(target, view)}</strong><span className="chip">{edge.data?.relation}</span></div>
                    {edge.data?.explanation && <small>{edge.data.explanation}</small>}
                    {edge.data?.confidenceBand && <small>Support: {edge.data.confidenceBand}</small>}
                    <button className="text-button danger" onClick={() => deleteEdge(edge.id)}><Trash2 size={12} /> Delete link</button>
                  </div>
                );
              })}
            </div>
          )}
          <EvidenceNote>Approving a link records your judgement. It does not prove a psychological cause.</EvidenceNote>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* D — Repetitive Thought Explorer                                     */
/* ------------------------------------------------------------------ */

export function RepetitiveThoughtExplorer({ notify }: Props) {
  const { edges, readable, view } = useAtlas();
  const analyses = useConversationStore((state) => state.analyses);
  const recurrence = useMemo(() => thoughtRecurrence(analyses), [analyses]);
  const loops = useMemo(() => cognitiveLoops(readable, edges, 6), [readable, edges]);
  const thoughts = readable.filter((node) => node.data.kind === 'thought' || node.data.kind === 'pattern');
  const [query, setQuery] = useState('');
  const matched = thoughts.filter((node) => `${node.data.label} ${node.data.description}`.toLowerCase().includes(query.toLowerCase()));
  const unresolved = readable.filter((node) => node.data.label.includes('?') || (node.data.tags ?? []).some((tag) => tag.toLowerCase().includes('unresolved')));

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="DIMENSION 3 / THOUGHTS & BELIEFS" title="Repetitive Thought Explorer" copy="See when a question returned and what else appeared alongside it. Repetition is a reason to look more closely, never evidence of an illness.">
        <span>{thoughts.length} thought nodes</span><span>{recurrence.length} recurring wordings</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Find a theme</h3><span className="chip">Your wording</span></div>
          <div className="search-field"><Search size={14} /><input aria-label="Search thoughts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search thought nodes…" /></div>
          {matched.length === 0 ? <EmptyState>No matching thoughts in readable records.</EmptyState> : (
            <div className="node-record-list">
              {matched.slice(0, 20).map((node) => {
                const neighbours = edges.filter((edge) => edge.source === node.id || edge.target === node.id).slice(0, 5);
                return (
                  <div className="node-record" key={node.id}>
                    <div className="node-record-head"><strong>{labelOf(node, view)}</strong><span className="chip">{node.data.provenance}</span></div>
                    <small>{node.data.firstSeen ? `First noted ${node.data.firstSeen}` : 'No first-noted date'} · {node.data.lastSeen ? `last ${node.data.lastSeen}` : 'no last date'}</small>
                    {neighbours.length > 0 && <small>Alongside: {neighbours.map((edge) => {
                      const other = readable.find((item) => item.id === (edge.source === node.id ? edge.target : edge.source));
                      return other ? labelOf(other, view) : '';
                    }).filter(Boolean).join(' · ')}</small>}
                    <button className="text-button" onClick={() => goToNode(node.id)}>Open in map →</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Repeated wording in reflections</h3><span className="chip">Exact matches only</span></div>
          {recurrence.length === 0 ? <EmptyState>No repeated exact wording has been recorded.</EmptyState> : (
            <div className="node-record-list">
              {recurrence.slice(0, 12).map((item) => (
                <div className="node-record" key={item.text}>
                  <div className="node-record-head"><strong>“{item.text.slice(0, 90)}”</strong><span className="chip">{item.count}×</span></div>
                  <small>Dates: {item.dates.join(', ')}</small>
                </div>
              ))}
            </div>
          )}
          <div className="card-head spaced"><h3>Unresolved questions</h3><span className="chip">{unresolved.length}</span></div>
          {unresolved.length === 0 ? <EmptyState>No questions tagged as unresolved yet.</EmptyState> : (
            <ul className="guidance-list compact-list">{unresolved.slice(0, 10).map((node) => <li key={node.id}><strong>{labelOf(node, view)}</strong><span>{node.data.timePeriod ?? 'no timeframe'}</span></li>)}</ul>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Descriptive loops</h3><span className="chip">From your links</span></div>
          {loops.length === 0 ? <EmptyState>No closed loops in the current map.</EmptyState> : (
            <div className="loop-list">
              {loops.map((loop, index) => (
                <div className="loop-row" key={index}>{loop.map((step, stepIndex) => <span key={`${step.id}-${stepIndex}`}><em>{step.relation}</em>{step.label}</span>)}</div>
              ))}
            </div>
          )}
          <EvidenceNote>A loop here is a shape in your own links. It is not a diagnosis, a prediction or a rule about how you will behave.</EvidenceNote>
          <button className="primary-button full-button" onClick={() => { const count = useMindStore.getState().refreshSuggestions(); notify(count ? `${count} connection question(s) added for review.` : 'No new suggestions.'); }}><Sparkles size={14} /> Refresh connected themes</button>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* E — Trigger and Response Explorer                                   */
/* ------------------------------------------------------------------ */

const TRIGGER_FIELDS = [
  { key: 'situation', label: '1. Situation', placeholder: 'What happened, as a camera could record it…' },
  { key: 'thoughts', label: '2. Thoughts', placeholder: 'What went through your mind, in your words…' },
  { key: 'emotions', label: '3. Emotions', placeholder: 'What you felt, if anything…' },
  { key: 'body', label: '4. Physical observations', placeholder: 'What you noticed in your body…' },
  { key: 'response', label: '5. Response', placeholder: 'What you did or did not do…' },
  { key: 'outcome', label: '6. Outcome', placeholder: 'What happened afterwards, as observed…' },
] as const;

export function TriggerResponseExplorer({ notify }: Props) {
  const { readable, view } = useAtlas();
  const [draft, setDraft] = useState({ situation: '', thoughts: '', emotions: '', body: '', response: '', outcome: '', alternative: '' });
  const situations = readable.filter((node) => node.data.kind === 'situation' || node.data.kind === 'context');

  const record = () => {
    const filled = TRIGGER_FIELDS.filter((field) => draft[field.key].trim());
    if (filled.length < 2) { notify('Record at least two parts of the sequence.'); return; }
    const stamp = now();
    const created: Array<{ id: string; kind: MindNodeKind; value: string; relation: MindRelation }> = [];
    TRIGGER_FIELDS.forEach((field, index) => {
      const value = draft[field.key].trim();
      if (!value) return;
      const kind: MindNodeKind = ['situation', 'thought', 'emotion', 'body', 'behavior', 'context'][index] as MindNodeKind;
      const nodeId = addNode(kind, value.slice(0, 110), {
        description: `${field.label.replace(/^\d+\.\s*/, '')}: ${value}`,
        evidenceClass: 'directly-reported',
        tags: ['trigger-chain', stamp.slice(0, 10)],
      });
      created.push({ id: nodeId, kind, value, relation: index === 0 ? 'context for' : 'leads to' as MindRelation });
    });
    for (let index = 1; index < created.length; index += 1) {
      linkNodes(created[index - 1].id, created[index].id, created[index].relation);
    }
    if (draft.alternative.trim()) {
      const alternativeId = addNode('coping', draft.alternative.trim().slice(0, 110), {
        description: 'An alternative response you chose to record. It is an option to consider, not an instruction.',
        tags: ['trigger-chain', 'alternative', stamp.slice(0, 10)],
      });
      if (created[0]) linkNodes(created[0].id, alternativeId, 'requires further exploration');
    }
    setDraft({ situation: '', thoughts: '', emotions: '', body: '', response: '', outcome: '', alternative: '' });
    notify(`${created.length} observation(s) added and linked in sequence.`);
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="DIMENSION 6 / BEHAVIOURAL PATTERNS" title="Trigger & Response Explorer" copy="Record a sequence as you observed it: situation → thoughts → emotions → body → response → outcome. Alternative responses stay optional and non-prescriptive.">
        <span>{situations.length} situation records</span><span>{readable.length} readable nodes</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Record a sequence</h3><span className="chip">No interpretation added</span></div>
          <div className="trigger-grid">
            {TRIGGER_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} rows={3} placeholder={field.placeholder}
                value={draft[field.key]} onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))} />
            ))}
          </div>
          <Field label="An alternative response you want to consider (optional)" placeholder="Something you could try, chosen by you…"
            value={draft.alternative} onChange={(value) => setDraft((current) => ({ ...current, alternative: value }))} />
          <div className="inline-actions"><button className="primary-button" onClick={record}><Plus size={14} /> Add sequence to map</button></div>
          <EvidenceNote>One sequence never proves a trigger. The links you create are descriptions you can edit or delete.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Recorded situations</h3><span className="chip">Observable</span></div>
          {situations.length === 0 ? <EmptyState>No situations recorded yet.</EmptyState> : (
            <div className="node-record-list">
              {situations.slice(0, 20).map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{labelOf(node, view)}</strong><span className="chip">{node.data.kind}</span></div>
                  <small>{node.data.description || 'No description.'}</small>
                  <button className="text-button" onClick={() => goToNode(node.id)}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
          <div className="card-head spaced"><h3>Body vocabulary</h3><span className="chip">Optional</span></div>
          <div className="chip-cloud">{BODY_SENSATIONS.slice(0, 14).map((item) => <span className="chip" key={item}>{item}</span>)}</div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* G — Decision Clarity Studio                                         */
/* ------------------------------------------------------------------ */

const DECISION_FIELDS: Array<{ key: keyof DecisionRecord; label: string; placeholder: string }> = [
  { key: 'facts', label: 'Facts', placeholder: 'What is actually known or has happened…' },
  { key: 'assumptions', label: 'Assumptions', placeholder: 'What you are taking for granted…' },
  { key: 'possibilities', label: 'Possibilities', placeholder: 'Options you can see…' },
  { key: 'risks', label: 'Risks', placeholder: 'What could go wrong…' },
  { key: 'unknowns', label: 'Unknowns', placeholder: 'What you cannot know yet…' },
  { key: 'values', label: 'Values involved', placeholder: 'What matters to you here…' },
  { key: 'reversible', label: 'Reversible parts', placeholder: 'What could be changed later…' },
  { key: 'irreversible', label: 'Harder to reverse', placeholder: 'What would be difficult to undo…' },
  { key: 'shortTerm', label: 'Short-term consequences', placeholder: 'Soon after the decision…' },
  { key: 'longTerm', label: 'Long-term consequences', placeholder: 'Further ahead…' },
];

export function DecisionClarityStudio({ notify }: Props) {
  const records = useConversationStore((state) => state.decisionRecords);
  const saveDecisionRecord = useConversationStore((state) => state.saveDecisionRecord);
  const deleteDecisionRecord = useConversationStore((state) => state.deleteDecisionRecord);
  const { readable, view } = useAtlas();
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState('');
  const relevant = readable.filter((node) => ['value', 'strength', 'goal', 'need', 'social'].includes(node.data.kind));

  const save = () => {
    if (!title.trim()) { notify('Give the decision a short title first.'); return; }
    const record = decisionRecordSchema.parse({
      id: makeId('decision'), createdAt: now(), title: title.trim(), question: question.trim(),
      ...Object.fromEntries(DECISION_FIELDS.map((field) => [field.key, fields[field.key] ?? ''])),
      linkedNodeIds: [], sensitivity: 'private',
    });
    saveDecisionRecord(record);
    const nodeId = addNode('context', title.trim().slice(0, 110), {
      description: question.trim() || 'A decision being explored. No recommendation is attached.',
      dimension: 'decisions', temporalStatus: 'future', evidenceClass: 'directly-reported',
      tags: ['decision'],
    });
    record.linkedNodeIds.push(nodeId);
    setTitle(''); setQuestion(''); setFields({});
    notify('Decision record saved privately. Nothing was recommended.');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="DIMENSION 10 / DECISIONS & FUTURE" title="Decision Clarity Studio" copy="Separate what is known from what is assumed. This space organises your own requirements; it does not tell you what to choose or judge other people.">
        <span>{records.length} decision record(s)</span><span>{relevant.length} relevant concepts</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>New decision record</h3><span className="chip">Private</span></div>
          <Field label="Decision" value={title} onChange={setTitle} placeholder="e.g. Timing of further study" />
          <Field label="Question you are holding" value={question} onChange={setQuestion} placeholder="What are you actually trying to decide?" />
          <div className="decision-grid">
            {DECISION_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} rows={3} placeholder={field.placeholder}
                value={fields[field.key] ?? ''} onChange={(value) => setFields((current) => ({ ...current, [field.key]: value }))} />
            ))}
          </div>
          <button className="primary-button full-button" onClick={save}><Plus size={14} /> Save decision record</button>
          <EvidenceNote>No ranking of people, prediction of loyalty or promise of an ideal outcome is produced here.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Saved records</h3><span className="chip">Local only</span></div>
          {records.length === 0 ? <EmptyState>Your decision records will appear here.</EmptyState> : (
            <div className="node-record-list">
              {[...records].reverse().map((record) => (
                <div className="node-record" key={record.id}>
                  <div className="node-record-head"><strong>{record.title}</strong><button className="icon-button small" onClick={() => setOpenId(openId === record.id ? '' : record.id)} aria-label="Toggle detail"><ChevronDown size={14} /></button></div>
                  <small>{new Date(record.createdAt).toLocaleDateString()}</small>
                  {openId === record.id && (
                    <div className="decision-detail">
                      {DECISION_FIELDS.filter((field) => record[field.key]).map((field) => (
                        <div key={field.key}><strong>{field.label}</strong><span>{String(record[field.key])}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="inline-actions">
                    {record.linkedNodeIds[0] && <button className="text-button" onClick={() => goToNode(record.linkedNodeIds[0])}>Open linked concept →</button>}
                    <button className="text-button danger" onClick={() => { deleteDecisionRecord(record.id); notify('Decision record deleted.'); }}><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="card-head spaced"><h3>Values, strengths and needs you recorded</h3><span className="chip">Context</span></div>
          <div className="chip-cloud">{relevant.slice(0, 20).map((node) => <span className="chip" key={node.id}>{labelOf(node, view)}</span>)}</div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* H — Personal Reflection Journal                                     */
/* ------------------------------------------------------------------ */

export function ReflectionJournal({ notify }: Props) {
  const entries = useConversationStore((state) => state.journalEntries);
  const saveJournalEntry = useConversationStore((state) => state.saveJournalEntry);
  const updateJournalEntry = useConversationStore((state) => state.updateJournalEntry);
  const deleteJournalEntry = useConversationStore((state) => state.deleteJournalEntry);
  const { readable, view } = useAtlas();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [temporalStatus, setTemporalStatus] = useState('current');
  const [evidenceClass, setEvidenceClass] = useState('directly-reported');
  const suggested = useMemo(() => suggestLinksForText(`${title} ${body}`, readable, 6).map((id) => readable.find((node) => node.id === id)!).filter(Boolean), [title, body, readable]);

  const save = () => {
    if (!body.trim()) { notify('Write something before saving.'); return; }
    saveJournalEntry(journalEntrySchema.parse({
      id: makeId('journal'), createdAt: now(), title: title.trim() || 'Untitled reflection',
      body: body.trim(), kind: 'reflection',
      temporalStatus: temporalStatus as JournalEntry['temporalStatus'],
      evidenceClass: evidenceClass as JournalEntry['evidenceClass'],
      sensitivity: 'private', linkedNodeIds: [],
      suggestedNodeIds: suggested.map((node) => node.id), tags: [],
    }));
    setTitle(''); setBody('');
    notify('Reflection saved privately on this device.');
  };

  const connect = (entry: JournalEntry) => {
    if (!entry.suggestedNodeIds.length) return;
    let nodeId = entry.linkedNodeIds[0];
    if (!nodeId) {
      nodeId = addNode('reflection', entry.title.slice(0, 110), {
        description: entry.body.slice(0, 1200),
        temporalStatus: entry.temporalStatus, evidenceClass: entry.evidenceClass,
        sensitivity: 'private', tags: ['journal'],
      });
    }
    let count = 0;
    for (const target of entry.suggestedNodeIds) {
      if (!readable.some((node) => node.id === target)) continue;
      linkNodes(nodeId, target, 'associated with');
      count += 1;
    }
    updateJournalEntry(entry.id, { linkedNodeIds: [nodeId, ...entry.linkedNodeIds] });
    notify(`${count} suggested link(s) added after your review.`);
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="FEATURE H / REFLECTION JOURNAL" title="Personal Reflection Journal" copy="Write in your own words. Possible links are suggestions drawn from existing concepts; you decide which, if any, are added to the map.">
        <span>{entries.length} journal entries</span><span>{readable.length} concepts available for links</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>New reflection</h3><span className="chip">Original wording preserved</span></div>
          <Field label="Title" value={title} onChange={setTitle} placeholder="A short heading…" />
          <Field label="Reflection" rows={9} value={body} onChange={setBody} placeholder="Write freely. Nothing is sent anywhere." />
          <div className="field-row">
            <SelectField label="Timeframe" value={temporalStatus} options={TEMPORAL_STATUSES} onChange={setTemporalStatus} />
            <SelectField label="Source of this statement" value={evidenceClass} options={EVIDENCE_CLASSES} onChange={setEvidenceClass} />
          </div>
          <div className="card-head spaced"><h3>Possible links</h3><span className="chip">Suggestions only</span></div>
          {suggested.length === 0 ? <EmptyState>Write a little more to see possible links.</EmptyState> : (
            <div className="chip-cloud">{suggested.map((node) => <span className="chip linked" key={node.id}>{labelOf(node, view)}</span>)}</div>
          )}
          <div className="inline-actions"><button className="primary-button" onClick={save}><BookOpen size={14} /> Save reflection</button></div>
          <EvidenceNote>Suggested links are word overlaps, not interpretations of what you meant.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Saved entries</h3><span className="chip">Private</span></div>
          {entries.length === 0 ? <EmptyState>Your journal entries will appear here.</EmptyState> : (
            <div className="node-record-list">
              {[...entries].reverse().map((entry) => (
                <div className="node-record" key={entry.id}>
                  <div className="node-record-head"><strong>{entry.title}</strong><small>{new Date(entry.createdAt).toLocaleDateString()}</small></div>
                  <p>{entry.body.slice(0, 240)}{entry.body.length > 240 ? '…' : ''}</p>
                  <small>{entry.temporalStatus} · {entry.evidenceClass}</small>
                  <div className="inline-actions">
                    {entry.suggestedNodeIds.length > 0 && <button className="text-button" onClick={() => connect(entry)}><Link2 size={12} /> {entry.linkedNodeIds.length ? 'Add more links' : 'Add suggested links'}</button>}
                    <button className="text-button danger" onClick={() => deleteJournalEntry(entry.id)}><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* I — Context and Continuity Journal                                  */
/* ------------------------------------------------------------------ */

export function ContinuityJournal({ notify }: Props) {
  const entries = useConversationStore((state) => state.journalEntries);
  const saveJournalEntry = useConversationStore((state) => state.saveJournalEntry);
  const deleteJournalEntry = useConversationStore((state) => state.deleteJournalEntry);
  const [title, setTitle] = useState('');
  const [happened, setHappened] = useState('');
  const [decided, setDecided] = useState('');
  const [remember, setRemember] = useState('');
  const [unknown, setUnknown] = useState('');
  const [period, setPeriod] = useState('present');

  const filtered = entries.filter((entry) => entry.kind === 'continuity');

  const save = () => {
    if (!title.trim() && !happened.trim()) { notify('Add at least a title or a short account.'); return; }
    const body = [
      happened.trim() && `WHAT HAPPENED\n${happened.trim()}`,
      decided.trim() && `WHAT I DECIDED\n${decided.trim()}`,
      remember.trim() && `WHAT I WANT TO REMEMBER\n${remember.trim()}`,
      unknown.trim() && `WHAT REMAINS UNKNOWN\n${unknown.trim()}`,
    ].filter(Boolean).join('\n\n');
    saveJournalEntry(journalEntrySchema.parse({
      id: makeId('continuity'), createdAt: now(), title: title.trim() || 'Continuity note',
      body, kind: 'continuity', temporalStatus: period as JournalEntry['temporalStatus'],
      evidenceClass: 'directly-reported', sensitivity: 'private',
      linkedNodeIds: [], suggestedNodeIds: [], tags: ['continuity', period],
    }));
    setTitle(''); setHappened(''); setDecided(''); setRemember(''); setUnknown('');
    notify('Continuity note saved. Your account stays separate from any interpretation.');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="FEATURE I / CONTEXT & CONTINUITY" title="Context and Continuity Journal" copy="Save the context you want to be able to return to: what happened, what you decided, what to remember and what remains unknown. The app never infers another person's motives.">
        <span>{filtered.length} continuity notes</span><span>Local device only</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>New continuity note</h3><span className="chip">Your account</span></div>
          <div className="field-row">
            <Field label="Title" value={title} onChange={setTitle} placeholder="A memorable heading…" />
            <SelectField label="Timeframe" value={period} options={TEMPORAL_STATUSES} onChange={setPeriod} />
          </div>
          <Field label="What happened" rows={4} value={happened} onChange={setHappened} placeholder="Observable events, in your words…" />
          <Field label="What I decided" rows={3} value={decided} onChange={setDecided} placeholder="Your decision, if there was one…" />
          <Field label="What I want to remember next time" rows={3} value={remember} onChange={setRemember} placeholder="Context you would otherwise lose…" />
          <Field label="What remains unknown" rows={3} value={unknown} onChange={setUnknown} placeholder="Do not fill gaps with guesses about other people…" />
          <button className="primary-button full-button" onClick={save}><FileText size={14} /> Save continuity note</button>
          <EvidenceNote>This journal records your perspective only. Other people's intentions stay unknown unless they tell you.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Earlier notes</h3><span className="chip">Chronological</span></div>
          {filtered.length === 0 ? <EmptyState>No continuity notes yet.</EmptyState> : (
            <div className="node-record-list">
              {[...filtered].reverse().map((entry) => (
                <div className="node-record" key={entry.id}>
                  <div className="node-record-head"><strong>{entry.title}</strong><small>{new Date(entry.createdAt).toLocaleDateString()}</small></div>
                  <p className="prewrap">{entry.body.slice(0, 400)}{entry.body.length > 400 ? '…' : ''}</p>
                  <button className="text-button danger" onClick={() => deleteJournalEntry(entry.id)}><Trash2 size={12} /> Delete</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* J — Emotional and Physical Check-In                                 */
/* ------------------------------------------------------------------ */

export function CheckInWorkspace({ notify }: Props) {
  const entries = useConversationStore((state) => state.checkIns);
  const saveCheckIn = useConversationStore((state) => state.saveCheckIn);
  const deleteCheckIn = useConversationStore((state) => state.deleteCheckIn);
  const [situation, setSituation] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [bodySignals, setBodySignals] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState('');
  const [response, setResponse] = useState('');
  const [outcome, setOutcome] = useState('');

  const toggle = (list: string[], set: (value: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);
  };

  const save = () => {
    if (!situation.trim() && emotions.length === 0 && bodySignals.length === 0) {
      notify('Add at least a situation, an emotion or a body observation.');
      return;
    }
    saveCheckIn(checkInEntrySchema.parse({
      id: makeId('checkin'), createdAt: now(), situation: situation.trim(),
      emotions: emotions.map((name) => ({ name, intensity: null })),
      bodySignals, thoughts: thoughts.trim(), response: response.trim(), outcome: outcome.trim(),
      linkedNodeIds: [], sensitivity: 'private',
    }));
    setSituation(''); setEmotions([]); setBodySignals([]); setThoughts(''); setResponse(''); setOutcome('');
    notify('Check-in saved privately. No score or streak was added.');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="FEATURE J / CHECK-IN" title="Emotional & Physical Check-In" copy="Optional, situation-based entries. Record only what you noticed. There are no streaks, targets, scores or pressure to keep logging.">
        <span>{entries.length} check-in(s)</span><span>Self-reported only</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Record a moment</h3><span className="chip">No tracking pressure</span></div>
          <Field label="Situation or context" rows={2} value={situation} onChange={setSituation} placeholder="Where and when, in your own words…" />
          <div className="card-head spaced"><h3>Emotions you noticed</h3><span className="chip">{emotions.length} selected</span></div>
          <div className="chip-cloud selectable">{EMOTION_TAXONOMY.slice(0, 24).map((item) => (
            <button key={item.name} className={`chip ${emotions.includes(item.name) ? 'selected' : ''}`} onClick={() => toggle(emotions, setEmotions, item.name)}>{item.name}</button>
          ))}</div>
          <div className="card-head spaced"><h3>Body observations</h3><span className="chip">{bodySignals.length} selected</span></div>
          <div className="chip-cloud selectable">{BODY_SENSATIONS.map((item) => (
            <button key={item} className={`chip ${bodySignals.includes(item) ? 'selected' : ''}`} onClick={() => toggle(bodySignals, setBodySignals, item)}>{item}</button>
          ))}</div>
          <Field label="Thoughts" rows={3} value={thoughts} onChange={setThoughts} placeholder="What went through your mind…" />
          <Field label="Response" rows={3} value={response} onChange={setResponse} placeholder="What you did or tried…" />
          <Field label="Outcome" rows={3} value={outcome} onChange={setOutcome} placeholder="What you noticed afterwards…" />
          <button className="primary-button full-button" onClick={save}><Activity size={14} /> Save check-in</button>
          <EvidenceNote>Body sensations can have many causes. This workspace records observations, not medical interpretation. Seek medical advice for new, severe or persistent symptoms.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Recent check-ins</h3><span className="chip">Private</span></div>
          {entries.length === 0 ? <EmptyState>Check in whenever it is useful. Nothing is expected of you.</EmptyState> : (
            <div className="node-record-list">
              {[...entries].reverse().slice(0, 20).map((entry) => (
                <div className="node-record" key={entry.id}>
                  <div className="node-record-head"><strong>{new Date(entry.createdAt).toLocaleString()}</strong></div>
                  {entry.situation && <small>{entry.situation}</small>}
                  {entry.emotions.length > 0 && <small>Emotions: {entry.emotions.map((item) => item.name).join(', ')}</small>}
                  {entry.bodySignals.length > 0 && <small>Body: {entry.bodySignals.join(', ')}</small>}
                  {entry.response && <small>Response: {entry.response}</small>}
                  <button className="text-button danger" onClick={() => deleteCheckIn(entry.id)}><Trash2 size={12} /> Delete</button>
                </div>
              ))}
            </div>
          )}
          <div className="card-head spaced"><h3>Needs vocabulary</h3><span className="chip">Optional</span></div>
          <div className="chip-cloud">{NEEDS_TAXONOMY.slice(0, 14).map((item) => <span className="chip" key={item}>{item}</span>)}</div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* K — Privacy and Sensitive Memory Controls                           */
/* ------------------------------------------------------------------ */

export function PrivacyControls({ notify }: Props) {
  const { nodes, edges, view } = useAtlas();
  const hiddenKinds = useMindStore((state) => state.hiddenKinds);
  const toggleKindVisibility = useMindStore((state) => state.toggleKindVisibility);
  const reveal = useMindStore((state) => state.sensitiveContentVisible);
  const setReveal = useMindStore((state) => state.setSensitiveContentVisible);
  const updateNode = useMindStore((state) => state.updateNode);
  const suggestions = useMindStore((state) => state.suggestions);
  const privateMode = useConversationStore((state) => state.sensitivePrivateMode);
  const setPrivateMode = useConversationStore((state) => state.setSensitivePrivateMode);
  const clearConversationsOnly = useConversationStore((state) => state.clearConversationsOnly);
  const journalEntries = useConversationStore((state) => state.journalEntries);
  const checkIns = useConversationStore((state) => state.checkIns);
  const decisionRecords = useConversationStore((state) => state.decisionRecords);

  const counts = useMemo(() => {
    const result = { standard: 0, private: 0, sensitive: 0, restricted: 0 };
    nodes.forEach((node) => { result[sensitivityOf(node)] += 1; });
    return result;
  }, [nodes]);

  const exportEverything = () => {
    const payload = {
      graph: createProjectFile(nodes, edges, undefined, suggestions),
      personalRecords: { journalEntries, checkIns, decisionRecords },
      exportedAt: now(),
      warning: 'This JSON is NOT encrypted. Store it somewhere private.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `personal-atlas-export-${now().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('Personal data exported. The file is not encrypted — store it privately.');
  };

  const deleteEverything = () => {
    if (!window.confirm('Delete all local conversations, journal entries, check-ins and decision records, restore the generic starter map, and clear saved imports? This cannot be undone. Export first if you need a copy.')) return;
    clearConversationsOnly();
    useMindStore.getState().resetToStarter();
    void Promise.all([
      deleteLocal(STORAGE_KEYS.conversation), deleteLocal(STORAGE_KEYS.narrative),
      deleteLocal(STORAGE_KEYS.history), deleteLocal(STORAGE_KEYS.graph),
    ]);
    notify('Local personal records cleared. Private mode remains under your control.');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="FEATURE K / PRIVACY CONTROLS" title="Sensitive Memory Controls" copy="Hide whole categories, change an individual record's privacy level, export what you recorded or delete it. Visual masking is a shoulder-surfing control, not encryption.">
        <span>{nodes.length} concepts</span><span>{counts.restricted} restricted</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Visibility modes</h3><span className="chip">Session controls</span></div>
          <div className="privacy-toggle-row">
            <div><strong>Private mode</strong><span>Withhold every private, sensitive and restricted record, even if revealed.</span></div>
            <button className={`switch-button ${privateMode ? 'on' : ''}`} onClick={() => setPrivateMode(!privateMode)} aria-pressed={privateMode}>
              {privateMode ? <EyeOff size={14} /> : <Eye size={14} />}{privateMode ? 'On' : 'Off'}
            </button>
          </div>
          <div className="privacy-toggle-row">
            <div><strong>Reveal masked content</strong><span>Applies to this session only. Hiding again clears exposing selections.</span></div>
            <button className={`switch-button ${reveal ? 'on' : ''}`} onClick={() => {
              if (!reveal && !window.confirm('Reveal private concept wording across the 2D and 3D workspaces for this session? Make sure your screen is private.')) return;
              setReveal(!reveal);
            }} aria-pressed={reveal}>{reveal ? <EyeOff size={14} /> : <Eye size={14} />}{reveal ? 'Revealed' : 'Masked'}</button>
          </div>
          <div className="card-head spaced"><h3>Hide entire categories</h3><span className="chip">{hiddenKinds.length} hidden</span></div>
          <div className="chip-cloud selectable">
            {MIND_NODE_KINDS.filter((kind) => kind !== 'root').map((kind) => (
              <button key={kind} className={`chip ${hiddenKinds.includes(kind) ? 'selected' : ''}`} onClick={() => toggleKindVisibility(kind)}>
                {hiddenKinds.includes(kind) ? <EyeOff size={11} /> : <Eye size={11} />}{NODE_META[kind].label}
              </button>
            ))}
          </div>
          <EvidenceNote>Hidden categories stay in your data and exports. Restricted records never enter the standard 2D or 3D atlas.</EvidenceNote>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Privacy levels in use</h3><span className="chip">Per record</span></div>
          <div className="privacy-stats">
            {(['standard', 'private', 'sensitive', 'restricted'] as const).map((level) => (
              <div key={level}><strong>{counts[level]}</strong><span>{level}</span></div>
            ))}
          </div>
          <div className="card-head spaced"><h3>Change an individual record</h3><span className="chip">Editable</span></div>
          <div className="node-record-list">
            {nodes.filter((node) => effectivePrivacy(node) !== 'standard').slice(0, 30).map((node) => (
              <div className="node-record" key={node.id}>
                <div className="node-record-head"><strong>{labelOf(node, view)}</strong><span className="chip">{node.data.kind}</span></div>
                <select aria-label={`Privacy level for ${node.data.label}`} value={sensitivityOf(node)} onChange={(event) => updateNode(node.id, privacyPatch(event.target.value as EffectivePrivacy), 'Privacy level changed')}>
                  {(['standard', 'private', 'sensitive', 'restricted'] as const).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Export and deletion</h3><span className="chip">Your data</span></div>
          <p className="card-copy">Export includes the graph, reviewable suggestions, journal entries, check-ins and decision records. JSON files are not password protected.</p>
          <div className="inline-actions">
            <button className="primary-button" onClick={exportEverything}><Download size={14} /> Export personal data</button>
          </div>
          <div className="inline-actions spaced-actions">
            <button className="text-button danger" onClick={deleteEverything}><Trash2 size={12} /> Delete local personal records</button>
          </div>
          <div className="privacy-note"><Shield size={14} /><span>Data stays in this browser's IndexedDB. Nothing is transmitted unless you explicitly enable AI sharing in Data &amp; Privacy.</span></div>
          <div className="card-head spaced"><h3>Dimension coverage</h3><span className="chip">10 lenses</span></div>
          <div className="dimension-grid">
            {MIND_DIMENSIONS.map((dimension) => {
              const count = nodes.filter((node) => getNodeDimension({ kind: node.data.kind, dimension: node.data.dimension }) === dimension.id).length;
              return (
                <div className="dimension-cell" key={dimension.id} style={{ borderColor: `${dimension.color}55` }}>
                  <i style={{ background: dimension.color }} /><strong>{dimension.short}</strong><small>{count} primary</small>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
