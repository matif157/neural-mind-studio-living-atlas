import { useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BarChart3, Brain, CalendarRange, Check, GitBranch, HeartHandshake,
  Plus, Repeat, ShieldAlert, ShieldCheck, Sparkles, Target, Users,
} from 'lucide-react';
import {
  BEHAVIOUR_TAXONOMY, BODY_SENSATIONS, RELATIONSHIP_CONTEXTS,
} from '@shared/taxonomy';
import { NODE_META, type MindNodeKind } from '@shared/domain';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import {
  cognitiveLoops, emotionCoOccurrence, emotionFrequency, graphProvenanceCounts,
  thoughtRecurrence, type StoredAnalysis,
} from '../../lib/patterns';
import { EmptyState, nextNodePosition, WorkspaceIntro } from '../../lib/workspaceUtils';

interface Props { notify: (message: string) => void }

function addConcept(kind: MindNodeKind, label: string, description: string, notify: (message: string) => void) {
  const store = useMindStore.getState();
  store.addNode(kind, nextNodePosition(store.nodes), label, {
    description,
    provenance: 'directly-stated',
    status: 'active',
    definition: description,
  });
  notify(`${label} added to your map`);
}

function openInAtlas(nodeId: string) {
  useUiStore.getState().setSelectedNode(nodeId);
  useUiStore.getState().setWorkspace('atlas');
}

/* ------------------------------------------------------------------ */

export function RelationshipDynamics({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const socialNodes = nodes.filter((node) => node.data.kind === 'social');
  const conversations = nodes.filter((node) => node.data.kind === 'conversation');
  const [draft, setDraft] = useState('');

  const createRelationship = () => {
    const label = draft.trim();
    if (!label) return;
    addConcept('social', label.slice(0, 120), 'A relationship or social context you described. Third-party intentions remain unknown.', notify);
    setDraft('');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE H" title="Relationship Dynamics" copy="Explore your own experiences, interpretations and boundaries around other people. The system never builds a profile of someone who has not been assessed.">
        <span>{socialNodes.length} relationship nodes</span><span>{conversations.length} conversation records</span>
      </WorkspaceIntro>

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Add a relationship context</h3><span className="chip">Your words</span></div>
          <div className="search-field">
            <Users size={14} />
            <input
              aria-label="Describe a relationship context"
              placeholder="e.g. A friendship where I hesitate to ask for clarity"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') createRelationship(); }}
            />
            <button className="icon-button small" onClick={createRelationship} aria-label="Add relationship node"><Plus size={14} /></button>
          </div>
          <div className="taxonomy-list">
            {RELATIONSHIP_CONTEXTS.map((item) => (
              <div className="taxonomy-row" key={item}>
                <span className="taxonomy-dot" style={{ background: NODE_META.social.color }} />
                <div><strong>{item}</strong><small>Educational context label. Add it only if it fits your own account.</small></div>
                <button className="icon-button small" title={`Add ${item}`} aria-label={`Add ${item}`} onClick={() => addConcept('social', item, 'A relationship context chosen by the user. No third-party psychological profile is created.', notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Relationship nodes</h3><span className="chip">Editable</span></div>
          {socialNodes.length === 0 ? <EmptyState>No relationship concepts yet. Add one from the list or the map.</EmptyState> : (
            <div className="node-record-list">
              {socialNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <small>{node.data.description || 'No description yet.'}</small>
                  <button className="text-button" onClick={() => openInAtlas(node.id)}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Keeping interpretation honest</h3><span className="chip">Boundary</span></div>
          <ul className="guidance-list">
            <li><strong>Observable event</strong><span>What a camera could have recorded.</span></li>
            <li><strong>Your interpretation</strong><span>What you took the event to mean.</span></li>
            <li><strong>Possible explanations</strong><span>Several remain plausible at once.</span></li>
            <li><strong>What cannot be known</strong><span>Another person's private intentions.</span></li>
            <li><strong>What you control</strong><span>Your boundaries, communication and next step.</span></li>
          </ul>
          <div className="safety-banner compact"><ShieldAlert size={15} /><span>This workspace never helps monitor, locate, confront or coerce another person.</span></div>
        </section>
      </div>

      <div className="workspace-card">
        <div className="card-head"><h3>Relationships in your map</h3><span className="chip">Directional links only</span></div>
        {edges.length === 0 ? <EmptyState>No relationships recorded between concepts yet.</EmptyState> : (
          <div className="edge-record-list">
            {edges.slice(0, 24).map((edge) => {
              const source = nodes.find((node) => node.id === edge.source);
              const target = nodes.find((node) => node.id === edge.target);
              if (!source || !target) return null;
              return (
                <div className="edge-record" key={edge.id}>
                  <GitBranch size={13} />
                  <span>{source.data.label}</span><em>{edge.data?.relation}</em><span>{target.data.label}</span>
                  {edge.data?.explanation && <small>{edge.data.explanation}</small>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BehaviouralSystems({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const behaviourNodes = nodes.filter((node) => node.data.kind === 'behavior');
  const loops = useMemo(() => cognitiveLoops(nodes, edges, 6), [nodes, edges]);

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE I" title="Behavioural Systems" copy="Look at actions in their context. A behaviour is something that happened, not a permanent trait or a diagnosis.">
        <span>{behaviourNodes.length} behaviour nodes</span><span>{loops.length} recorded loops</span>
      </WorkspaceIntro>

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Behaviour vocabulary</h3><span className="chip">Educational</span></div>
          <div className="taxonomy-list">
            {BEHAVIOUR_TAXONOMY.map((item) => (
              <div className="taxonomy-row" key={item}>
                <span className="taxonomy-dot" style={{ background: NODE_META.behavior.color }} />
                <div><strong>{item}</strong><small>Describe the specific action and the situation it occurred in.</small></div>
                <button className="icon-button small" title={`Add ${item}`} aria-label={`Add ${item}`} onClick={() => addConcept('behavior', item, 'A behaviour you reported. Context matters more than the label.', notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Recorded loops</h3><span className="chip">From your links</span></div>
          {loops.length === 0 ? <EmptyState>Connect at least three concepts in the map to see a loop.</EmptyState> : (
            <div className="loop-list">
              {loops.map((loop, index) => (
                <div className="loop-row" key={index}>
                  <Repeat size={13} />
                  <div>{loop.map((step, stepIndex) => (
                    <span key={`${step.id}-${stepIndex}`}>
                      <button className="text-button" onClick={() => openInAtlas(step.id)}>{step.label}</button>
                      {stepIndex < loop.length - 1 && <em>{loop[stepIndex + 1].relation}</em>}
                    </span>
                  ))}</div>
                </div>
              ))}
            </div>
          )}
          <div className="inspector-hint"><ShieldCheck size={14} /> A recorded loop is a description of your own links, not proof of cause.</div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Behaviour nodes</h3><span className="chip">Editable</span></div>
          {behaviourNodes.length === 0 ? <EmptyState>No behaviour concepts yet.</EmptyState> : (
            <div className="node-record-list">
              {behaviourNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <small>{node.data.description || 'No description yet.'}</small>
                  <button className="text-button" onClick={() => openInAtlas(node.id)}>Open in map →</button>
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

export function BodyInteroception({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const updateNode = useMindStore((state) => state.updateNode);
  const bodyNodes = nodes.filter((node) => node.data.kind === 'body');

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE J" title="Body & Interoception" copy="Record physical sensations exactly as you notice them. A sensation is an observation, not proof of an emotional cause.">
        <span>{bodyNodes.length} body-signal nodes</span>
      </WorkspaceIntro>

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Sensation vocabulary</h3><span className="chip">Observation only</span></div>
          <div className="taxonomy-list">
            {BODY_SENSATIONS.map((item) => (
              <div className="taxonomy-row" key={item}>
                <span className="taxonomy-dot" style={{ background: NODE_META.body.color }} />
                <div><strong>{item}</strong><small>Add only if you actually noticed it.</small></div>
                <button className="icon-button small" title={`Add ${item}`} aria-label={`Add ${item}`} onClick={() => addConcept('body', item, 'A physical sensation the user noticed. Similar sensations can have many causes and are not diagnostic.', notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Your reported signals</h3><span className="chip">Self-rated only</span></div>
          {bodyNodes.length === 0 ? <EmptyState>No body-signal concepts yet.</EmptyState> : (
            <div className="node-record-list">
              {bodyNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <label className="mini-field">How noticeable right now ({node.data.intensity === null ? 'unset' : Math.round(node.data.intensity * 100) + '%'})
                    <input type="range" min="0" max="1" step="0.05" value={node.data.intensity ?? 0} onChange={(event) => updateNode(node.id, { intensity: Number(event.target.value) }, 'Body sensation self-rated')} />
                  </label>
                  <button className="text-button" onClick={() => openInAtlas(node.id)}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>When to seek medical advice</h3><span className="chip">Not diagnosis</span></div>
          <ul className="guidance-list">
            <li><strong>New or severe</strong><span>Chest pain, breathing difficulty, fainting or sudden weakness need urgent medical assessment.</span></li>
            <li><strong>Persistent</strong><span>Lasting changes deserve a qualified clinician's opinion.</span></li>
            <li><strong>Separate layers</strong><span>An emotion node may co-occur with a sensation, but the app cannot establish a medical cause.</span></li>
          </ul>
          <div className="safety-banner compact"><ShieldAlert size={15} /><span>This application does not assess, diagnose or treat physical health conditions.</span></div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PersonalGrowth({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const reflections = useConversationStore((state) => state.reflections);
  const exerciseStates = useConversationStore((state) => state.exerciseStates);
  const [draft, setDraft] = useState('');
  const growthNodes = nodes.filter((node) => ['goal', 'strength', 'value', 'coping'].includes(node.data.kind));
  const completed = Object.values(exerciseStates).filter((state) => state.completed);

  const addGoal = () => {
    const label = draft.trim();
    if (!label) return;
    addConcept('goal', label.slice(0, 160), 'A personally chosen direction, revisable at any time.', notify);
    setDraft('');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE L" title="Personal Growth" copy="Track directions, strengths and self-reported changes. Progress is never converted into a recovery percentage.">
        <span>{growthNodes.length} growth concepts</span><span>{completed.length} completed exercises</span>
      </WorkspaceIntro>

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Add a goal or strength</h3><span className="chip">Your choice</span></div>
          <div className="search-field">
            <Target size={14} />
            <input aria-label="Add a goal" placeholder="e.g. Practise asking one clarifying question" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addGoal(); }} />
            <button className="icon-button small" onClick={addGoal} aria-label="Add goal node"><Plus size={14} /></button>
          </div>
          <div className="taxonomy-list">
            {(['strength', 'value', 'coping'] as MindNodeKind[]).map((kind) => (
              <div className="taxonomy-row" key={kind}>
                <span className="taxonomy-dot" style={{ background: NODE_META[kind].color }} />
                <div><strong>{NODE_META[kind].label}</strong><small>{NODE_META[kind].definition}</small></div>
                <button className="icon-button small" aria-label={`Add ${NODE_META[kind].label}`} onClick={() => addConcept(kind, `New ${NODE_META[kind].label.toLowerCase()}`, NODE_META[kind].definition, notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Growth concepts</h3><span className="chip">Editable</span></div>
          {growthNodes.length === 0 ? <EmptyState>No goals, strengths or values recorded yet.</EmptyState> : (
            <div className="node-record-list">
              {growthNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <small>{node.data.description || 'No description yet.'}</small>
                  <button className="text-button" onClick={() => openInAtlas(node.id)}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Self-reported practice</h3><span className="chip">No score</span></div>
          {completed.length === 0 && reflections.length === 0 ? <EmptyState>No reflections or completed exercises yet.</EmptyState> : (
            <>
              {completed.map((state) => (
                <div className="node-record" key={state.exerciseId}>
                  <div className="node-record-head"><strong><Check size={13} /> {state.exerciseId.replace(/-/g, ' ')}</strong><span className="chip user-confirmed">completed</span></div>
                  <small>{state.response.slice(0, 220) || 'Completed without a written response.'}</small>
                </div>
              ))}
              {reflections.slice(0, 8).map((reflection) => (
                <div className="node-record" key={reflection.id}>
                  <div className="node-record-head"><strong>{reflection.title}</strong><span className="chip">{new Date(reflection.createdAt).toLocaleDateString()}</span></div>
                  <small>{reflection.body.slice(0, 220)}</small>
                </div>
              ))}
            </>
          )}
          <div className="inspector-hint"><ShieldCheck size={14} /> A change in your notes is not evidence of neurological rewiring or clinical recovery.</div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const WINDOWS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '180d', label: '6 months', days: 180 },
  { id: '365d', label: '1 year', days: 365 },
  { id: 'all', label: 'All time', days: null },
] as const;

type WindowId = (typeof WINDOWS)[number]['id'];

function withinWindow(records: StoredAnalysis[], days: number | null): StoredAnalysis[] {
  if (days === null) return records;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((record) => new Date(record.createdAt).getTime() >= cutoff);
}

export function HistoryAnalytics({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const analyses = useConversationStore((state) => state.analyses);
  const events = useConversationStore((state) => state.events);
  const [windowId, setWindowId] = useState<WindowId>('30d');
  const windowConfig = WINDOWS.find((item) => item.id === windowId) ?? WINDOWS[1];
  const scoped = useMemo(() => withinWindow(analyses, windowConfig.days), [analyses, windowConfig.days]);
  const frequency = useMemo(() => emotionFrequency(scoped).slice(0, 10), [scoped]);
  const recurrence = useMemo(() => thoughtRecurrence(scoped).slice(0, 8), [scoped]);
  const coOccurrence = useMemo(() => emotionCoOccurrence(scoped).slice(0, 8), [scoped]);
  const provenance = useMemo(() => graphProvenanceCounts(nodes, edges), [nodes, edges]);
  const insufficient = scoped.length < 2;
  const topCount = Math.max(1, ...frequency.map((item) => item.count));

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE O" title="History & Analytics" copy="Count what you recorded — never what you actually felt in daily life. Missing periods stay visibly missing.">
        <span>{scoped.length} reflection(s) in window</span><span>{events.length} stored events</span>
      </WorkspaceIntro>

      <div className="window-strip" role="tablist" aria-label="Analytics window">
        {WINDOWS.map((item) => (
          <button key={item.id} role="tab" aria-selected={windowId === item.id} className={`view-chip ${windowId === item.id ? 'active' : ''}`} onClick={() => setWindowId(item.id)}>
            <CalendarRange size={12} /> {item.label}
          </button>
        ))}
      </div>

      {insufficient && (
        <div className="safety-banner compact"><ShieldAlert size={15} /><span>Insufficient data in this window. Charts are withheld rather than filled with invented values.</span></div>
      )}

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Recorded emotion mentions</h3><span className="chip">Count of mentions</span></div>
          {frequency.length === 0 ? <EmptyState>No recorded emotion mentions in this window.</EmptyState> : (
            <div className="bar-list">
              {frequency.map((item) => (
                <div className="bar-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="bar-track"><i style={{ width: `${(item.count / topCount) * 100}%`, background: NODE_META.emotion.color }} /></div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
          <p className="panel-copy">A mention is a recorded reflection, not a measure of how often the emotion occurred.</p>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Thought recurrence</h3><span className="chip">Exact wording</span></div>
          {recurrence.length === 0 ? <EmptyState>No repeated exact wording in this window.</EmptyState> : (
            <div className="recurrence-list">
              {recurrence.map((item) => (
                <div className="recurrence-row" key={item.text}>
                  <Repeat size={14} />
                  <div><p>“{item.text}”</p><small>{item.count} occurrence(s) · {item.dates.join(', ')}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Co-occurrence</h3><span className="chip">Not causation</span></div>
          {coOccurrence.length === 0 ? <EmptyState>Not enough records to describe co-occurrence.</EmptyState> : (
            <div className="bar-list">
              {coOccurrence.map((item) => (
                <div className="bar-row" key={item.pair.join('::')}>
                  <span>{item.pair[0]} + {item.pair[1]}</span>
                  <div className="bar-track"><i style={{ width: `${(item.count / Math.max(1, coOccurrence[0].count)) * 100}%`, background: NODE_META.pattern.color }} /></div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Graph provenance</h3><span className="chip">Traceability</span></div>
          <div className="bar-list">
            {Object.entries(provenance.nodeCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track"><i style={{ width: `${(count / Math.max(1, nodes.length)) * 100}%`, background: '#8f9cff' }} /></div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <p className="panel-copy">Every node keeps the label describing how it entered your map. AI suggestions stay drafts until you confirm them.</p>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>What this page will not do</h3><span className="chip">Limits</span></div>
          <ul className="guidance-list">
            <li><strong>No risk score</strong><span>Graph density is never converted into a clinical probability.</span></li>
            <li><strong>No invented points</strong><span>Empty days stay empty.</span></li>
            <li><strong>No brain readings</strong><span>No chart represents measured neural activity.</span></li>
            <li><strong>No diagnosis</strong><span>Frequency is not severity and is not a disorder measure.</span></li>
          </ul>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Snapshot</h3><span className="chip">Current graph</span></div>
          <div className="stat-grid">
            <div><strong>{nodes.length}</strong><span>concepts</span></div>
            <div><strong>{edges.length}</strong><span>links</span></div>
            <div><strong>{nodes.filter((node) => node.data.status === 'draft').length}</strong><span>drafts</span></div>
            <div><strong>{nodes.filter((node) => node.data.sensitivity === 'restricted').length}</strong><span>restricted</span></div>
          </div>
          <button className="text-button" onClick={() => { useUiStore.getState().setWorkspace('universe'); notify('Opening 3D universe'); }}>Explore this graph in 3D <ArrowUpRight size={12} /></button>
        </section>
      </div>
    </div>
  );
}

/* Small shared exports for other workspaces that want the same headings. */
export const SYSTEM_WORKSPACE_ICONS = { Activity, BarChart3, Brain, HeartHandshake, Sparkles };
