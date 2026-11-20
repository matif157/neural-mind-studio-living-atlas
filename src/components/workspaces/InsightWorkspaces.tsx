import { useMemo, useState } from 'react';
import { Activity, Brain, Clock3, GitBranch, Plus, Repeat, Search, ShieldAlert } from 'lucide-react';
import {
  BEHAVIOUR_TAXONOMY, COGNITIVE_PATTERNS, EMOTION_TAXONOMY, MEMORY_TYPES, NEEDS_TAXONOMY, THOUGHT_TYPES,
} from '@shared/taxonomy';
import { NODE_META, type MindNodeKind } from '@shared/domain';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import { cognitiveLoops, emotionFrequency, emotionIntensitySeries, graphProvenanceCounts, thoughtRecurrence, type SeriesPoint } from '../../lib/patterns';
import { EmptyState, nextNodePosition, Sparkline, WorkspaceIntro } from '../../lib/workspaceUtils';

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

export function EmotionObservatory({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const updateNode = useMindStore((state) => state.updateNode);
  const analyses = useConversationStore((state) => state.analyses);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const [query, setQuery] = useState('');
  const frequency = useMemo(() => emotionFrequency(analyses).slice(0, 10), [analyses]);
  const series = useMemo(() => emotionIntensitySeries(analyses), [analyses]);
  const emotionNodes = nodes.filter((node) => node.data.kind === 'emotion');
  const filtered = EMOTION_TAXONOMY.filter((item) => `${item.name} ${item.family} ${item.definition}`.toLowerCase().includes(query.toLowerCase()));
  const topCount = Math.max(1, ...frequency.map((item) => item.count));

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE C" title="Emotional Observatory" copy="Name felt states with more precision. Only you set intensity; the system never invents a number or treats a feeling as a trait.">
        <span>{emotionNodes.length} emotion nodes</span><span>{analyses.length} reflections</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Emotion vocabulary</h3><span className="chip">Educational taxonomy</span></div>
          <div className="search-field"><Search size={14} /><input aria-label="Search emotions" placeholder="Find an emotion word…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="taxonomy-list">
            {filtered.map((item) => (
              <div className="taxonomy-row" key={item.name}>
                <span className="taxonomy-dot" style={{ background: NODE_META.emotion.color }} />
                <div><strong>{item.name}</strong><small>{item.definition}</small></div>
                <button className="icon-button small" title={`Add ${item.name} node`} aria-label={`Add ${item.name} node`} onClick={() => addConcept('emotion', item.name, item.definition, notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Frequency in reflections</h3><span className="chip">Descriptive only</span></div>
          {frequency.length === 0 ? <EmptyState>No reflected emotions yet. Start a conversation in Workspace B.</EmptyState> : (
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
          <div className="card-head spaced"><h3>Self-reported intensity</h3><span className="chip">Never inferred</span></div>
          {series.hasIntensities ? <Sparkline points={series.points} color={NODE_META.emotion.color} /> : <EmptyState>No intensity values were supplied by you, so none are charted.</EmptyState>}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Emotion nodes in map</h3><span className="chip">Editable</span></div>
          {emotionNodes.length === 0 ? <EmptyState>Add a word from the taxonomy, or create one in the map.</EmptyState> : (
            <div className="node-record-list">
              {emotionNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <label className="mini-field">Your intensity (0–{node.data.intensity === null ? 'unset' : '1'})
                    <input type="range" min="0" max="1" step="0.05" value={node.data.intensity ?? 0} onChange={(event) => updateNode(node.id, { intensity: Number(event.target.value) }, 'Emotion intensity self-rated')} />
                  </label>
                  <small>{node.data.intensity === null ? 'No intensity stated — left unset.' : `Self-rated ${Math.round(node.data.intensity * 100)}%`}</small>
                  <button className="text-button" onClick={() => { setSelectedNode(node.id); setWorkspace('atlas'); }}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="safety-banner compact"><ShieldAlert size={15} /><span>Emotions change over time and can have many causes. Nothing here is a biological measurement or a clinical conclusion.</span></div>
    </div>
  );
}

export function ThoughtExplorer({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const updateNode = useMindStore((state) => state.updateNode);
  const analyses = useConversationStore((state) => state.analyses);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const [query, setQuery] = useState('');
  const recurrence = useMemo(() => thoughtRecurrence(analyses).slice(0, 12), [analyses]);
  const thoughtNodes = nodes.filter((node) => node.data.kind === 'thought' || node.data.kind === 'belief');
  const filtered = THOUGHT_TYPES.filter((item) => `${item.name} ${item.definition}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE D" title="Thought Explorer" copy="Keep the exact words of a thought separate from any interpretation, and give yourself room to write a balanced version.">
        <span>{thoughtNodes.length} thought/belief nodes</span><span>{recurrence.length} recurring phrases</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Thought types</h3><span className="chip">Vocabulary</span></div>
          <div className="search-field"><Search size={14} /><input aria-label="Search thought types" placeholder="Find a thought type…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="taxonomy-list">
            {filtered.map((item) => (
              <div className="taxonomy-row" key={item.name}>
                <span className="taxonomy-dot" style={{ background: NODE_META.thought.color }} />
                <div><strong>{item.name.replace(/_/g, ' ')}</strong><small>{item.definition}</small></div>
                <button className="icon-button small" title="Add thought node" aria-label="Add thought node" onClick={() => addConcept('thought', item.name.replace(/_/g, ' '), item.definition, notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Recurring wording</h3><span className="chip">From your reflections</span></div>
          {recurrence.length === 0 ? <EmptyState>No repeated wording found yet.</EmptyState> : (
            <div className="recurrence-list">
              {recurrence.map((item) => (
                <div className="recurrence-row" key={item.text}>
                  <Repeat size={14} />
                  <div><p>“{item.text}”</p><small>{item.count} occurrence(s) · {item.dates.join(', ')}</small></div>
                  <button className="icon-button small" title="Add as thought node" aria-label="Add as thought node" onClick={() => addConcept('thought', item.text.slice(0, 120), 'Original wording preserved from reflection.', notify)}><Plus size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Your thoughts</h3><span className="chip">Edit in place</span></div>
          {thoughtNodes.length === 0 ? <EmptyState>No thought nodes yet.</EmptyState> : (
            <div className="node-record-list">
              {thoughtNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  {node.data.originalText && <blockquote>“{node.data.originalText}”</blockquote>}
                  <label className="mini-field">Inner voice
                    <textarea rows={2} value={node.data.innerVoice} onChange={(event) => updateNode(node.id, { innerVoice: event.target.value }, 'Thought inner voice edited')} />
                  </label>
                  <label className="mini-field">Balanced voice (your words)
                    <textarea rows={2} value={node.data.balancedVoice} onChange={(event) => updateNode(node.id, { balancedVoice: event.target.value }, 'Balanced thought edited')} />
                  </label>
                  <button className="text-button" onClick={() => { setSelectedNode(node.id); setWorkspace('atlas'); }}>Review in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="safety-banner compact"><ShieldAlert size={15} /><span>A recurring thought is an observation about wording, not evidence of a disorder or a fact about the world.</span></div>
    </div>
  );
}

export function MemoryAtlas({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const memoryNodes = nodes.filter((node) => node.data.kind === 'memory' || node.data.kind === 'context' || node.data.kind === 'situation');

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE E" title="Memory Atlas" copy="A place for experiences you chose to record. The application never recovers, verifies or invents a memory.">
        <span>{memoryNodes.length} memory/context nodes</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Memory descriptors</h3><span className="chip">User-facing vocabulary</span></div>
          <div className="taxonomy-list">
            {MEMORY_TYPES.map((name) => (
              <div className="taxonomy-row" key={name}>
                <span className="taxonomy-dot" style={{ background: NODE_META.memory.color }} />
                <div><strong>{name}</strong><small>Add only what you remember and choose to record.</small></div>
                <button className="icon-button small" title="Add memory node" aria-label="Add memory node" onClick={() => addConcept('memory', name, 'A remembered experience described by the user.', notify)}><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Recorded memories and situations</h3><span className="chip">Provenance visible</span></div>
          {memoryNodes.length === 0 ? <EmptyState>No memory nodes yet. Use a descriptor or add one from the map.</EmptyState> : (
            <div className="node-record-list grid">
              {memoryNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.provenance}`}>{node.data.provenance}</span></div>
                  <p>{node.data.description}</p>
                  {node.data.firstSeen && <small><Clock3 size={11} /> First noted {node.data.firstSeen}</small>}
                  {node.data.evidence.length > 0 && <div className="evidence-list">{node.data.evidence.map((ref) => <blockquote key={`${ref.eventId}-${ref.date}`}>“{ref.excerpt}”</blockquote>)}</div>}
                  <button className="text-button" onClick={() => { setSelectedNode(node.id); setWorkspace('atlas'); }}>Open in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="safety-banner compact"><Brain size={15} /><span>Memory can be reconstructive. A node records what was stated, not what objectively happened.</span></div>
    </div>
  );
}

export function PatternIntelligence({ notify }: Props) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const analyses = useConversationStore((state) => state.analyses);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);
  const loops = useMemo(() => cognitiveLoops(nodes, edges), [nodes, edges]);
  const provenance = graphProvenanceCounts(nodes, edges);
  const candidates = analyses.flatMap((record) => record.analysis.cognitive_patterns.map((pattern) => ({ ...pattern, date: record.createdAt, analysisId: record.id })));
  const patternNodes = nodes.filter((node) => node.data.kind === 'pattern');
  const timeline: SeriesPoint[] = analyses.map((record) => ({ date: record.createdAt.slice(0, 10), label: 'Reflections', value: 1, eventId: record.id }))
    .reduce<SeriesPoint[]>((acc, point) => {
      const existing = acc.find((item) => item.date === point.date);
      if (existing) existing.value += 1; else acc.push(point);
      return acc;
    }, []);

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE F" title="Pattern Intelligence" copy="Notice possible recurring interpretations and graph loops. Every pattern is a hypothesis that stays unconfirmed until you say otherwise.">
        <span>{candidates.length} candidates</span><span>{patternNodes.length} pattern nodes</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Pattern candidates</h3><span className="chip">Require confirmation</span></div>
          {candidates.length === 0 ? <EmptyState>No pattern candidates yet.</EmptyState> : (
            <div className="node-record-list">
              {candidates.map((item, index) => (
                <div className="node-record" key={`${item.analysisId}-${index}`}>
                  <div className="node-record-head"><strong>{item.name}</strong><span className="confidence-chip">{Math.round(item.confidence * 100)}%</span></div>
                  <p>{item.evidence}</p>
                  <small>{item.requires_confirmation ? 'Awaiting your confirmation' : 'Offered for reflection'} · {new Date(item.date).toLocaleDateString()}</small>
                  <button className="text-button" onClick={() => {
                    const store = useMindStore.getState();
                    store.addNode('pattern', nextNodePosition(store.nodes), item.name, {
                      description: item.evidence, provenance: 'ai-suggested', status: 'draft', confidence: item.confidence,
                    });
                    notify('Added as a draft — confirm or reject it in the map');
                  }}><Plus size={12} /> Add as draft node</button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Descriptive loops in your map</h3><GitBranch size={14} /></div>
          {loops.length === 0 ? <EmptyState>No closed loops found in the current graph.</EmptyState> : (
            <div className="loop-list">
              {loops.map((loop, index) => (
                <div className="loop-row" key={index}>{loop.map((step, stepIndex) => <span key={`${step.id}-${stepIndex}`}><b>{step.label}</b>{stepIndex < loop.length - 1 && <i> → {step.relation} → </i>}</span>)}</div>
              ))}
            </div>
          )}
          <div className="card-head spaced"><h3>Reflection timeline</h3><Activity size={14} /></div>
          <Sparkline points={timeline} color="#b98cff" />
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Provenance overview</h3><span className="chip">All graph elements</span></div>
          <div className="provenance-table">
            <h4>Nodes</h4>
            {Object.entries(provenance.nodeCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
            <h4>Relationships</h4>
            {Object.entries(provenance.edgeCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
          </div>
          <div className="card-head spaced"><h3>Pattern nodes</h3></div>
          {patternNodes.length === 0 ? <EmptyState>No pattern nodes in the map.</EmptyState> : (
            <div className="node-record-list">
              {patternNodes.map((node) => (
                <div className="node-record" key={node.id}>
                  <div className="node-record-head"><strong>{node.data.label}</strong><span className={`chip ${node.data.status}`}>{node.data.status}</span></div>
                  <p>{node.data.description}</p>
                  <button className="text-button" onClick={() => { setSelectedNode(node.id); setWorkspace('atlas'); }}>Review in map →</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="safety-banner compact"><ShieldAlert size={15} /><span>{COGNITIVE_PATTERNS.filter((item) => item.family === 'possible-pattern').length} possible-pattern labels are reflection vocabulary. None is a diagnosis, and no pattern is presented as established fact.</span></div>
    </div>
  );
}

export const vocabularySummary = { needs: NEEDS_TAXONOMY.length, behaviours: BEHAVIOUR_TAXONOMY.length, emotions: EMOTION_TAXONOMY.length };
