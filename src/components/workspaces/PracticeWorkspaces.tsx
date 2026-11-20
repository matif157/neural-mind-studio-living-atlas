import { useMemo, useState } from 'react';
import {
  BookOpen, Brain, Check, ChevronRight, Clock3, FileText, Play, Plus, Search, ShieldAlert, Sparkles,
} from 'lucide-react';
import { EXERCISES, KNOWLEDGE_DOMAINS, NEURON_ANATOMY } from '@shared/taxonomy';
import { reflectionSchema, type Reflection } from '@shared/schemas';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import { EmptyState, nextNodePosition, WorkspaceIntro } from '../../lib/workspaceUtils';

interface Props { notify: (message: string) => void }
const id = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;

export function ReflectionStudio({ notify }: Props) {
  const exercises = useUiStore((state) => state.selectedExerciseId);
  const setSelectedExercise = useUiStore((state) => state.setSelectedExercise);
  const exerciseStates = useConversationStore((state) => state.exerciseStates);
  const reflections = useConversationStore((state) => state.reflections);
  const saveExerciseState = useConversationStore((state) => state.saveExerciseState);
  const saveReflection = useConversationStore((state) => state.saveReflection);
  const events = useConversationStore((state) => state.events);
  const nodes = useMindStore((state) => state.nodes);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const selected = EXERCISES.find((item) => item.id === exercises) ?? EXERCISES[0];
  const state = exerciseStates[selected.id];
  const filtered = EXERCISES.filter((item) => `${item.title} ${item.purpose}`.toLowerCase().includes(query.toLowerCase()));

  const choose = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setResponse(exerciseStates[exerciseId]?.response ?? '');
  };

  const persist = (completed: boolean) => {
    saveExerciseState({ exerciseId: selected.id, response, completed, updatedAt: new Date().toISOString(), linkedNodeIds: nodes.filter((node) => node.selected).map((node) => node.id) });
    notify(completed ? 'Exercise response saved' : 'Draft saved');
  };

  const createReflection = () => {
    if (!response.trim()) { notify('Write a response before saving a reflection.'); return; }
    const reflection: Reflection = reflectionSchema.parse({
      id: id('reflection'), createdAt: new Date().toISOString(), title: selected.title, body: response.trim(),
      linkedNodeIds: nodes.filter((node) => node.selected).map((node) => node.id),
      exerciseId: selected.id, sourceEventIds: events.filter((event) => event.role === 'user').slice(-5).map((event) => event.id),
    });
    saveReflection(reflection);
    saveExerciseState({ exerciseId: selected.id, response, completed: true, updatedAt: reflection.createdAt, linkedNodeIds: reflection.linkedNodeIds });
    setResponse('');
    notify('Reflection saved privately on this device');
  };

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE G" title="Reflection Studio" copy="Guided, educational exercises you control. Responses stay on this device and can be linked to nodes you select in the map.">
        <span>{EXERCISES.length} exercises</span><span>{reflections.length} saved reflections</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Exercises</h3><span className="chip">Educational</span></div>
          <div className="search-field"><Search size={14} /><input aria-label="Search exercises" placeholder="Find an exercise…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="taxonomy-list">
            {filtered.map((item) => (
              <button className={`exercise-row ${item.id === selected.id ? 'active' : ''}`} key={item.id} onClick={() => choose(item.id)}>
                <span><strong>{item.title}</strong><small>{item.purpose}</small></span>
                <span className="exercise-meta">{item.durationMinutes}m {exerciseStates[item.id]?.completed && <Check size={12} />}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>{selected.title}</h3><span className="chip"><Clock3 size={11} /> {selected.durationMinutes} min</span></div>
          <p className="card-copy">{selected.purpose}</p>
          <ol className="instruction-list">{selected.instructions.map((step, index) => <li key={index}>{step}</li>)}</ol>
          {(selected.questions?.length ?? 0) > 0 && <div className="prompt-list">{(selected.questions ?? []).map((question, index) => <p key={index}>“{question}”</p>)}</div>}
          <label className="mini-field">Your response (original wording preserved)
            <textarea rows={9} value={response || state?.response || ''} onChange={(event) => setResponse(event.target.value)} placeholder="Write freely. Nothing here is analysed unless you explicitly share it." />
          </label>
          <div className="inline-actions">
            <button className="primary-button" onClick={createReflection}><FileText size={14} /> Save reflection</button>
            <button className="text-button" onClick={() => persist(false)}>Save draft</button>
            <button className="text-button" onClick={() => {
              const store = useMindStore.getState();
              store.addNode('exercise', nextNodePosition(store.nodes), selected.title, { description: selected.purpose, provenance: 'directly-stated' });
              notify('Exercise added to your map');
            }}><Plus size={12} /> Add to map</button>
          </div>
          <div className="safety-banner compact"><ShieldAlert size={15} /><span>{selected.caution}</span></div>
        </section>
        <section className="workspace-card">
          <div className="card-head"><h3>Saved reflections</h3><span className="chip">Private</span></div>
          {reflections.length === 0 ? <EmptyState>Your saved reflections will appear here.</EmptyState> : (
            <div className="node-record-list">
              {[...reflections].reverse().map((item) => (
                <div className="node-record" key={item.id}>
                  <div className="node-record-head"><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div>
                  <p>{item.body.slice(0, 260)}{item.body.length > 260 ? '…' : ''}</p>
                  {item.linkedNodeIds.length > 0 && <small>{item.linkedNodeIds.length} linked node(s)</small>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function NeuroscienceExplorer({ notify }: Props) {
  const [active, setActive] = useState(NEURON_ANATOMY[0].id);
  const part = NEURON_ANATOMY.find((item) => item.id === active) ?? NEURON_ANATOMY[0];
  const domains = KNOWLEDGE_DOMAINS.filter((domain) => domain.family === 'neuroscience-cognitive');

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE H" title="Neuroscience Explorer" copy="Learn basic biological structures and keep them clearly separate from the conceptual nodes in your map.">
        <span>{NEURON_ANATOMY.length} structures</span><span>{domains.length} domains</span>
      </WorkspaceIntro>
      <div className="workspace-columns">
        <section className="workspace-card">
          <div className="card-head"><h3>Neuronal anatomy</h3><Brain size={14} /></div>
          <div className="neuron-figure" role="img" aria-label="Illustration of a biological neuron with labelled parts">
            <svg viewBox="0 0 320 190" aria-hidden="true">
              <path d="M75 95 Q45 55 25 38 M75 95 Q40 90 15 82 M75 95 Q45 130 22 150 M75 95 Q55 150 52 178" fill="none" stroke="#a995ff" strokeWidth="2" />
              <circle cx="92" cy="95" r="22" fill="rgba(169,149,255,.25)" stroke="#a995ff" strokeWidth="2" />
              <path d="M114 95 C150 95 154 58 190 58 C225 58 230 95 275 95" fill="none" stroke={active === 'myelin' ? '#f5b94c' : '#70a7ff'} strokeWidth={active === 'myelin' ? 10 : 3} strokeLinecap="round" />
              <circle cx="285" cy="95" r="7" fill="#67d9dc" />
              <text x="92" y="53" textAnchor="middle" fill="#a995ff" fontSize="9">dendrites</text>
              <text x="92" y="99" textAnchor="middle" fill="#dce7f6" fontSize="9">soma</text>
              <text x="190" y="46" textAnchor="middle" fill="#70a7ff" fontSize="9">axon / myelin</text>
              <text x="285" y="118" textAnchor="middle" fill="#67d9dc" fontSize="9">synapse</text>
            </svg>
          </div>
          <div className="anatomy-tabs">
            {NEURON_ANATOMY.map((item) => <button className={item.id === active ? 'active' : ''} key={item.id} onClick={() => setActive(item.id)}>{item.label}</button>)}
          </div>
          <div className="anatomy-detail"><strong>{part.label}</strong><p>{part.description}</p></div>
        </section>
        <section className="workspace-card wide-card">
          <div className="card-head"><h3>Neuroscience & cognition domains</h3><span className="chip">With limitations</span></div>
          <div className="domain-grid">
            {domains.map((domain) => (
              <div className="domain-card" key={domain.id}>
                <div className="node-record-head"><strong>{domain.name}</strong><span className="chip">{domain.family.replace('-', ' ')}</span></div>
                <p>{domain.definition}</p>
                <div className="concept-chips">{domain.concepts.map((concept) => <span className="chip" key={concept}>{concept}</span>)}</div>
                <small><ShieldAlert size={11} /> {domain.limitations}</small>
                <button className="text-button" onClick={() => {
                  const store = useMindStore.getState();
                  store.addNode('knowledge', nextNodePosition(store.nodes), domain.name, { description: domain.definition, provenance: 'directly-stated' });
                  notify(`${domain.name} added as a knowledge node`);
                }}><Plus size={12} /> Add knowledge node</button>
              </div>
            ))}
          </div>
          <div className="safety-banner compact"><ShieldAlert size={15} /><span>A conceptual graph node is not a neuron, a link is not a synapse, and no signal animation represents measured brain activity.</span></div>
        </section>
      </div>
    </div>
  );
}

export function KnowledgeLibrary({ notify }: Props) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setSelectedExercise = useUiStore((state) => state.setSelectedExercise);
  const families = [...new Set(KNOWLEDGE_DOMAINS.map((domain) => domain.family))];
  const filtered = useMemo(() => KNOWLEDGE_DOMAINS.filter((domain) =>
    (family === 'all' || domain.family === family)
    && `${domain.name} ${domain.definition} ${domain.concepts.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query, family]);

  return (
    <div className="workspace-scroll">
      <WorkspaceIntro kicker="WORKSPACE I" title="Knowledge Library" copy="A curated taxonomy of fields relevant to mind and behaviour, each with its scope and explicit limits.">
        <span>{KNOWLEDGE_DOMAINS.length} domains</span><span>{EXERCISES.length} exercises</span>
      </WorkspaceIntro>
      <div className="workspace-card full-card">
        <div className="library-filters">
          <div className="search-field"><Search size={14} /><input aria-label="Search knowledge domains" placeholder="Search domains or concepts…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="chip-row">
            <button className={`chip-button ${family === 'all' ? 'active' : ''}`} onClick={() => setFamily('all')}>All</button>
            {families.map((item) => <button className={`chip-button ${family === item ? 'active' : ''}`} key={item} onClick={() => setFamily(item)}>{item.replace('-', ' ')}</button>)}
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState>No domains match that search.</EmptyState> : (
          <div className="domain-grid">
            {filtered.map((domain) => (
              <article className="domain-card" key={domain.id}>
                <div className="node-record-head"><strong>{domain.name}</strong><span className="chip">{domain.family.replace('-', ' ')}</span></div>
                <p>{domain.definition}</p>
                <div className="domain-section"><h4>Scope</h4><p>{domain.scope}</p></div>
                <div className="concept-chips">{domain.concepts.map((concept) => <span className="chip" key={concept}>{concept}</span>)}</div>
                <div className="domain-section limitation"><h4>Limits in this app</h4><p>{domain.limitations}</p></div>
                <div className="inline-actions">
                  {domain.exercises.slice(0, 3).map((exerciseId) => {
                    const exercise = EXERCISES.find((item) => item.id === exerciseId);
                    return exercise ? <button className="text-button" key={exerciseId} onClick={() => { setSelectedExercise(exerciseId); setWorkspace('reflection'); }}><Play size={11} /> {exercise.title}</button> : null;
                  })}
                  <button className="text-button" onClick={() => {
                    const store = useMindStore.getState();
                    store.addNode('knowledge', nextNodePosition(store.nodes), domain.name, { description: domain.definition, provenance: 'directly-stated' });
                    notify(`${domain.name} added to the map`);
                  }}><Plus size={11} /> Add to map</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="workspace-card full-card">
        <div className="card-head"><h3><BookOpen size={15} /> Educational exercises</h3><span className="chip">Not treatment</span></div>
        <div className="exercise-grid">
          {EXERCISES.map((exercise) => (
            <button className="exercise-card" key={exercise.id} onClick={() => { setSelectedExercise(exercise.id); setWorkspace('reflection'); }}>
              <Sparkles size={14} />
              <strong>{exercise.title}</strong>
              <small>{exercise.purpose}</small>
              <span>{exercise.durationMinutes} min <ChevronRight size={12} /></span>
            </button>
          ))}
        </div>
      </div>
      <div className="safety-banner compact"><ShieldAlert size={15} /><span>This library is education, not an assessment, diagnosis or referral service. Professional fields listed here have boundaries this app does not cross.</span></div>
    </div>
  );
}
