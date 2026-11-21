import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  BrainCircuit, Check, CircleHelp, Command, Info, Keyboard, Moon, Orbit, PanelBottom,
  Sun, X,
} from 'lucide-react';
import {
  AI_PROVIDER_META, APP_NAME, APP_SUBNAME, SCHEMA_VERSION, WORKSPACES,
} from '@shared/domain';
import {
  aiAnalysisSchema, checkInEntrySchema, clientSettingsSchema, conversationEventSchema,
  decisionRecordSchema, exerciseStateSchema, journalEntrySchema, reflectionSchema,
} from '@shared/schemas';
import MindCanvas from './components/MindCanvas';
import Mind3DWorkspace from './components/Mind3DWorkspace';
import CognitiveUniverse3D from './components/CognitiveUniverse3D';
import BrainAnatomy3D from './components/BrainAnatomy3D';
import Toolbar from './components/Toolbar';
import TimelineRail from './components/TimelineRail';
import AnatomyModal from './components/AnatomyModal';
import ConversationWorkspace from './components/conversation/ConversationWorkspace';
import { EmotionObservatory, MemoryAtlas, PatternIntelligence, ThoughtExplorer } from './components/workspaces/InsightWorkspaces';
import { KnowledgeLibrary, NeuroscienceExplorer, ReflectionStudio } from './components/workspaces/PracticeWorkspaces';
import {
  BehaviouralSystems, BodyInteroception, HistoryAnalytics, PersonalGrowth, RelationshipDynamics,
} from './components/workspaces/SystemWorkspaces';
import SettingsWorkspace from './components/workspaces/SettingsWorkspace';
import NarrativeThreads from './components/workspaces/NarrativeThreads';
import {
  CheckInWorkspace, ConnectionExplorer, ContinuityJournal, DecisionClarityStudio,
  PersonalTimeline, PrivacyControls, ReflectionJournal, RepetitiveThoughtExplorer,
  TriggerResponseExplorer,
} from './components/workspaces/PersonalAtlasWorkspaces';
import { deleteLocal, readLocal, STORAGE_KEYS, writeLocal } from './lib/db';
import { workspaceFromShortcut } from './lib/shortcuts';
import { hydrateImportStore } from './store/importStore';
import { createProjectFile, downloadProjectFile, migrateProjectFile, validateProjectFile } from './utils/projectFile';
import { useConversationStore } from './store/conversationStore';
import { useMindStore } from './store/mindStore';
import { useUiStore } from './store/uiStore';
import { iconFor } from './components/iconFor';
import type {
  Conversation, NarrativeLink, NarrativeSegment, NarrativeThread, ProposalRecord,
} from './store/conversationStore';
import type { StoredAnalysis } from './lib/patterns';
import './styles.css';

function App() {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const past = useMindStore((state) => state.past);
  const future = useMindStore((state) => state.future);
  const running = useMindStore((state) => state.simulationRunning);
  const changeLog = useMindStore((state) => state.changeLog);
  const suggestions = useMindStore((state) => state.suggestions);
  const undo = useMindStore((state) => state.undo);
  const redo = useMindStore((state) => state.redo);
  const copySelection = useMindStore((state) => state.copySelection);
  const cutSelection = useMindStore((state) => state.cutSelection);
  const pasteClipboard = useMindStore((state) => state.pasteClipboard);
  const duplicateSelection = useMindStore((state) => state.duplicateSelection);
  const deleteSelection = useMindStore((state) => state.deleteSelection);
  const setSimulationRunning = useMindStore((state) => state.setSimulationRunning);
  const resetToStarter = useMindStore((state) => state.resetToStarter);
  const loadProject = useMindStore((state) => state.loadProject);
  const settings = useConversationStore((state) => state.settings);
  const conversations = useConversationStore((state) => state.conversations);
  const events = useConversationStore((state) => state.events);
  const hydrateConversation = useConversationStore((state) => state.hydrate);
  const workspace = useUiStore((state) => state.workspace);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const graphView = useUiStore((state) => state.graphView);
  const setGraphView = useUiStore((state) => state.setGraphView);
  const bottomCollapsed = useUiStore((state) => state.bottomCollapsed);
  const showHistory = useUiStore((state) => state.showHistory);
  const showShortcuts = useUiStore((state) => state.showShortcuts);
  const togglePanel = useUiStore((state) => state.togglePanel);

  const [ready, setReady] = useState(false);
  const [showAnatomy, setShowAnatomy] = useState(false);
  const [showBrain3D, setShowBrain3D] = useState(false);
  const [timelineRailOpen, setTimelineRailOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1180);
  // The full-bleed 3D workspace is the default; the lighter accessible universe stays available.
  const [simpleUniverse, setSimpleUniverse] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const fitRef = useRef<() => void>(() => undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const [graphRaw, conversationRaw, settingsRaw, narrativeRaw] = await Promise.all([
        readLocal<unknown>(STORAGE_KEYS.graph),
        readLocal<Record<string, unknown>>(STORAGE_KEYS.conversation),
        readLocal<unknown>(STORAGE_KEYS.settings),
        readLocal<Record<string, unknown>>(STORAGE_KEYS.narrative),
      ]);
      let legacy: unknown = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.legacyGraph);
        if (stored && !graphRaw) legacy = JSON.parse(stored) as unknown;
      } catch { /* ignore corrupt legacy data */ }
      const graphCandidate = graphRaw ?? legacy;
      if (graphCandidate) {
        const project = validateProjectFile(graphCandidate)
          ? graphCandidate
          : migrateProjectFile(graphCandidate);
        if (project) loadProject(project);
      }
      const parsedSettings = settingsRaw ? clientSettingsSchema.safeParse(settingsRaw) : null;
      const safeSettings = parsedSettings?.success ? parsedSettings.data : undefined;
      const conversationSource = conversationRaw && typeof conversationRaw === 'object' ? conversationRaw : {};
      const narrativeSource = narrativeRaw && typeof narrativeRaw === 'object' ? narrativeRaw : conversationSource;
      if (conversationRaw || narrativeRaw) {
        const conversationsData = Array.isArray(conversationSource.conversations)
          ? (conversationSource.conversations as Conversation[]).filter((item) => item && typeof item.id === 'string').slice(0, 100)
          : [];
        const eventsData = Array.isArray(conversationSource.events)
          ? conversationSource.events.map((item) => conversationEventSchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []).slice(0, 20000)
          : [];
        const analysesData = Array.isArray(conversationSource.analyses)
          ? (conversationSource.analyses as StoredAnalysis[]).flatMap((item) => {
            const parsed = item && aiAnalysisSchema.safeParse(item.analysis);
            return parsed?.success ? [{ ...item, analysis: parsed.data }] : [];
          }).slice(0, 5000)
          : [];
        const proposalsData = Array.isArray(conversationSource.proposals)
          ? (conversationSource.proposals as ProposalRecord[]).filter((item) => item && typeof item.id === 'string' && item.payload && typeof item.payload === 'object').slice(0, 10000)
          : [];
        const exercisesData = conversationSource.exerciseStates && typeof conversationSource.exerciseStates === 'object'
          ? Object.fromEntries(Object.entries(conversationSource.exerciseStates).flatMap(([key, value]) => {
            const parsed = exerciseStateSchema.safeParse(value);
            return parsed.success ? [[key, parsed.data]] : [];
          }))
          : {};
        const reflectionsData = Array.isArray(conversationSource.reflections)
          ? conversationSource.reflections.map((item) => reflectionSchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []).slice(0, 5000)
          : [];
        const journalData = Array.isArray(conversationSource.journalEntries)
          ? conversationSource.journalEntries.map((item) => journalEntrySchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []).slice(0, 5000)
          : [];
        const checkInsData = Array.isArray(conversationSource.checkIns)
          ? conversationSource.checkIns.map((item) => checkInEntrySchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []).slice(0, 5000)
          : [];
        const decisionsData = Array.isArray(conversationSource.decisionRecords)
          ? conversationSource.decisionRecords.map((item) => decisionRecordSchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []).slice(0, 2000)
          : [];
        const threadsData = Array.isArray(narrativeSource.threads)
          ? (narrativeSource.threads as NarrativeThread[]).filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string').slice(0, 500)
          : [];
        const segmentsData = Array.isArray(narrativeSource.segments)
          ? (narrativeSource.segments as NarrativeSegment[]).filter((item) => item && typeof item.id === 'string' && typeof item.threadId === 'string' && typeof item.title === 'string').slice(0, 20000)
          : [];
        const linksData = Array.isArray(narrativeSource.links)
          ? (narrativeSource.links as NarrativeLink[]).filter((item) => item && typeof item.id === 'string' && typeof item.fromId === 'string' && typeof item.toId === 'string').slice(0, 20000)
          : [];
        hydrateConversation({
          conversations: conversationsData,
          activeConversationId: typeof conversationSource.activeConversationId === 'string' ? conversationSource.activeConversationId : (conversationsData[0]?.id ?? ''),
          events: eventsData,
          analyses: analysesData,
          proposals: proposalsData,
          exerciseStates: exercisesData,
          reflections: reflectionsData,
          journalEntries: journalData,
          checkIns: checkInsData,
          decisionRecords: decisionsData,
          sensitivePrivateMode: conversationSource.sensitivePrivateMode === true
            || (settingsRaw as { sensitivePrivateMode?: unknown } | null)?.sensitivePrivateMode === true,
          threads: threadsData,
          segments: segmentsData,
          links: linksData,
          settings: safeSettings,
        });
      } else if (safeSettings) {
        hydrateConversation({
          settings: safeSettings,
          sensitivePrivateMode: (settingsRaw as { sensitivePrivateMode?: unknown } | null)?.sensitivePrivateMode === true,
        });
      } else {
        hydrateConversation({});
      }
      if (!cancelled) setReady(true);
    };
    void restore();
    // Imported personal history is restored only when long-term storage is enabled.
    void hydrateImportStore();
    return () => { cancelled = true; };
  }, [hydrateConversation, loadProject]);

  useEffect(() => {
    if (!ready) return undefined;
    let graphTimer: number | undefined;
    let conversationTimer: number | undefined;
    const saveGraph = (state: ReturnType<typeof useMindStore.getState>) => {
      window.clearTimeout(graphTimer);
      setSaved(false);
      graphTimer = window.setTimeout(() => {
        const meta = {
          title: 'Living Mind Atlas',
          description: 'Personal conceptual map — not a clinical or biological model.',
          customCategories: state.customCategories,
          customRelations: state.customRelations,
        };
        void writeLocal(STORAGE_KEYS.graph, createProjectFile(state.nodes, state.edges, meta, state.suggestions)).then((ok) => setSaved(ok));
      }, 500);
    };
    const unsubscribeMind = useMindStore.subscribe(saveGraph);
    const unsubscribeConversation = useConversationStore.subscribe((state) => {
      window.clearTimeout(conversationTimer);
      setSaved(false);
      conversationTimer = window.setTimeout(() => {
        void writeLocal(STORAGE_KEYS.settings, { ...state.settings, sensitivePrivateMode: state.sensitivePrivateMode });
        void writeLocal(STORAGE_KEYS.narrative, {
          threads: state.threads, segments: state.segments, links: state.links,
        });
        if (state.settings.longTermMemory) {
          void writeLocal(STORAGE_KEYS.conversation, {
            conversations: state.conversations, activeConversationId: state.activeConversationId,
            events: state.events, analyses: state.analyses, proposals: state.proposals,
            exerciseStates: state.exerciseStates, reflections: state.reflections,
            journalEntries: state.journalEntries, checkIns: state.checkIns,
            decisionRecords: state.decisionRecords,
            sensitivePrivateMode: state.sensitivePrivateMode,
          }).then((ok) => setSaved(ok));
        } else {
          void deleteLocal(STORAGE_KEYS.conversation).then(() => setSaved(true));
        }
      }, 700);
    });
    return () => {
      unsubscribeMind();
      unsubscribeConversation();
      window.clearTimeout(graphTimer);
      window.clearTimeout(conversationTimer);
    };
  }, [ready]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      const shortcutWorkspace = workspaceFromShortcut(event);
      if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if (mod && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
      else if (mod && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelection(); notify('Selection copied'); }
      else if (mod && event.key.toLowerCase() === 'x') { event.preventDefault(); cutSelection(); notify('Selection cut'); }
      else if (mod && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteClipboard(); notify('Selection pasted'); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); notify('Selection duplicated'); }
      else if (event.key === 'Escape') { useMindStore.getState().setActiveScenario(null); useUiStore.getState().closeContextMenu(); }
      else if (event.key === '?') togglePanel('shortcuts');
      else if (shortcutWorkspace) {
        event.preventDefault();
        setWorkspace(shortcutWorkspace);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copySelection, cutSelection, duplicateSelection, notify, pasteClipboard, redo, togglePanel, undo, setWorkspace]);

  const exportProject = () => { downloadProjectFile(createProjectFile(nodes, edges, undefined, suggestions)); notify('Graph and reviewable suggestions exported as JSON'); };
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const project = validateProjectFile(parsed) ? parsed : migrateProjectFile(parsed);
      if (!project) throw new Error('Invalid project structure or unsupported schema.');
      loadProject(project);
      notify(`Imported ${project.nodes.length} nodes and ${project.edges.length} links`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Could not import this file'); }
    finally { event.target.value = ''; }
  };
  const setFitCallback = useCallback((fit: () => void) => { fitRef.current = fit; }, []);
  const workspaceLabel = WORKSPACES.find((item) => item.id === workspace)?.label ?? APP_SUBNAME;

  const renderWorkspace = () => {
    switch (workspace) {
      case 'atlas': return <MindCanvas onFitRef={setFitCallback} />;
      case 'universe': return simpleUniverse
        ? <CognitiveUniverse3D />
        : <Mind3DWorkspace onOpen2D={() => setWorkspace('atlas')} onOpenCompanion={() => setWorkspace('conversation')} />;
      case 'conversation': return <ConversationWorkspace notify={notify} />;
      case 'emotions': return <EmotionObservatory notify={notify} />;
      case 'thoughts': return <ThoughtExplorer notify={notify} />;
      case 'memories': return <MemoryAtlas notify={notify} />;
      case 'patterns': return <PatternIntelligence notify={notify} />;
      case 'relationships': return <RelationshipDynamics notify={notify} />;
      case 'behaviour': return <BehaviouralSystems notify={notify} />;
      case 'body': return <BodyInteroception notify={notify} />;
      case 'reflection': return <ReflectionStudio notify={notify} />;
      case 'growth': return <PersonalGrowth notify={notify} />;
      case 'neuroscience': return <NeuroscienceExplorer notify={notify} />;
      case 'library': return <KnowledgeLibrary notify={notify} />;
      case 'analytics': return <HistoryAnalytics notify={notify} />;
      case 'settings': return <SettingsWorkspace notify={notify} />;
      case 'narrative': return <NarrativeThreads notify={notify} />;
      case 'timeline': return <PersonalTimeline notify={notify} />;
      case 'connections': return <ConnectionExplorer notify={notify} />;
      case 'loops': return <RepetitiveThoughtExplorer notify={notify} />;
      case 'triggers': return <TriggerResponseExplorer notify={notify} />;
      case 'decisions': return <DecisionClarityStudio notify={notify} />;
      case 'journal': return <ReflectionJournal notify={notify} />;
      case 'continuity': return <ContinuityJournal notify={notify} />;
      case 'checkin': return <CheckInWorkspace notify={notify} />;
      case 'privacy': return <PrivacyControls notify={notify} />;
      default: return null;
    }
  };

  return (
    <div className={`app-shell theme-${settings.theme} ${settings.reducedMotion || !running ? 'reduced-motion' : ''}`}>
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark"><BrainCircuit size={23} strokeWidth={1.75} /></div>
          <div className="brand-copy"><div className="brand-title">{APP_NAME} <span>{APP_SUBNAME}</span></div><div className="brand-subtitle">{workspaceLabel}</div></div>
        </div>
        <nav className="workspace-nav" aria-label="Workspaces">
          {WORKSPACES.map((item) => {
            const Icon = iconFor(item.icon);
            return <button key={item.id} className={`workspace-tab ${workspace === item.id ? 'active' : ''}`} onClick={() => setWorkspace(item.id)} aria-current={workspace === item.id ? 'page' : undefined} title={`${item.key} · ${item.label}`}><Icon size={14} /><span>{item.short}</span></button>;
          })}
        </nav>
        <div className="header-actions">
          <div className={`save-state ${saved ? 'is-saved' : 'is-unsaved'}`}><span />{saved ? 'Saved locally' : 'Saving…'}</div>
          <button className="header-help" onClick={() => setSettingsTheme()} title="Toggle theme" aria-label="Toggle theme">{settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="header-help" onClick={() => togglePanel('shortcuts')} title="Shortcuts" aria-label="Show shortcuts"><Keyboard size={16} /></button>
          <button className={`header-help ${simpleUniverse ? 'active' : ''}`} onClick={() => { setSimpleUniverse(!simpleUniverse); if (workspace !== 'universe') setWorkspace('universe'); }} title={simpleUniverse ? 'Use the full 3D universe' : 'Use the light accessible universe'} aria-label="Toggle 3D universe presentation"><Orbit size={17} /></button>
          <button className="header-help" onClick={() => setShowBrain3D(true)} title="Anatomical brain model" aria-label="Open anatomical brain model"><BrainCircuit size={17} /></button>
          <button className="header-help" onClick={() => setShowAnatomy(true)} title="About the model" aria-label="About the model"><CircleHelp size={17} /></button>
        </div>
      </header>

      {workspace === 'atlas' && (
        <>
          <section className="title-strip">
            <div><div className="title-eyebrow">PERSONAL COGNITIVE WORKSPACE <span>•</span> SCHEMA V{SCHEMA_VERSION}</div><h1>Map what moves <em>the mind.</em></h1><p>Explore relationships between emotional states, thoughts, memories, needs and the responses that follow.</p></div>
            <div className="title-stat-row">
              <div className="title-stat"><strong>{nodes.length}</strong><span>MIND NODES</span></div>
              <div className="title-stat"><strong>{edges.length}</strong><span>LINKS</span></div>
              <div className="title-stat"><strong>{Object.keys(AI_PROVIDER_META).length}</strong><span>AI ADAPTERS</span></div>
            </div>
          </section>
          <div className="view-strip">
            <span className="view-kicker">VIEWS</span>
            {([['whole', 'Whole mind'], ['emotion', 'Emotions'], ['thought', 'Thoughts'], ['pattern', 'Patterns'], ['memory', 'Memories'], ['behavior', 'Behaviour'], ['timeline', 'Timeline'], ['neural', 'Anatomy']] as const).map(([view, label]) => (
              <button key={view} className={`view-chip ${graphView === view ? 'active' : ''}`} onClick={() => setGraphView(view)}>{label}</button>
            ))}
          </div>
          <Toolbar
            canUndo={past.length > 0}
            canRedo={future.length > 0}
            running={running}
            onUndo={undo}
            onRedo={redo}
            onCopy={() => { copySelection(); notify('Selection copied'); }}
            onCut={() => { cutSelection(); notify('Selection cut'); }}
            onPaste={() => { pasteClipboard(); notify('Selection pasted'); }}
            onDuplicate={() => { duplicateSelection(); notify('Selection duplicated'); }}
            onDelete={() => { deleteSelection(); notify('Selected elements removed'); }}
            onToggleRunning={() => setSimulationRunning(!running)}
            onExport={exportProject}
            onImport={() => fileInput.current?.click()}
            onReset={() => { if (window.confirm('Reset the current mind map to the starter example? Export your work first if you need a backup.')) { resetToStarter(); notify('Starter map restored'); } }}
            onAnatomy={() => setShowAnatomy(true)}
            onFit={() => fitRef.current()}
          />
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importProject} />
        </>
      )}

      <div className="workspace-body">
        <TimelineRail open={timelineRailOpen} onToggle={() => setTimelineRailOpen((value) => !value)} />
        <main className="workspace-host">{ready ? renderWorkspace() : <div className="loading-state">Restoring your local workspace…</div>}</main>
      </div>

      <div className={`timeline-drawer ${bottomCollapsed ? 'collapsed' : ''}`}>
        <button className="timeline-handle" onClick={() => togglePanel('bottom')} aria-expanded={!bottomCollapsed}>
          <PanelBottom size={13} /> Timeline & change log <span>{changeLog.length} changes · {events.length} events</span><ChevronIcon collapsed={bottomCollapsed} />
        </button>
        {!bottomCollapsed && (
          <div className="timeline-content">
            {changeLog.slice(0, 20).map((entry) => <div key={entry.id}><span>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><strong>{entry.action}</strong><small>{entry.detail}</small></div>)}
            {changeLog.length === 0 && <p>No graph changes recorded yet.</p>}
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="footer-left"><span className="footer-dot" /> LOCAL-FIRST WORKSPACE <span className="footer-divider">/</span> {conversations.length} conversation(s) <span className="footer-divider">/</span> YOUR DATA STAYS ON THIS DEVICE</div>
        <div className="footer-right"><span><Command size={12} /> Z undo</span><span><Command size={12} /> C copy</span><span><Command size={12} /> V paste</span><span>ALT / OPTION + 1–0 / K / L workspaces</span></div>
      </footer>

      {toast && <div className="toast-message" role="status"><Check size={15} /> {toast}</div>}
      {showBrain3D && <BrainAnatomy3D onClose={() => setShowBrain3D(false)} />}
      {showAnatomy && <AnatomyModal onClose={() => setShowAnatomy(false)} />}
      {showHistory && (
        <div className="modal-backdrop" onClick={() => togglePanel('history')}>
          <div className="modal-card wide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head"><h2>Full change log</h2><button className="icon-button" onClick={() => togglePanel('history')} aria-label="Close"><X size={16} /></button></div>
            <div className="modal-list">
              {changeLog.map((entry) => <div key={entry.id}><span>{new Date(entry.at).toLocaleString()}</span><strong>{entry.action}</strong><small>{entry.detail} · {entry.nodeCount} nodes / {entry.edgeCount} links</small></div>)}
            </div>
          </div>
        </div>
      )}
      {showShortcuts && (
        <div className="modal-backdrop" onClick={() => togglePanel('shortcuts')}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head"><h2>Keyboard shortcuts</h2><button className="icon-button" onClick={() => togglePanel('shortcuts')} aria-label="Close"><X size={16} /></button></div>
            <div className="shortcut-list">
              <div><kbd>⌘/Ctrl Z</kbd><span>Undo</span></div>
              <div><kbd>⌘/Ctrl ⇧ Z</kbd><span>Redo</span></div>
              <div><kbd>⌘/Ctrl C / X / V</kbd><span>Copy / cut / paste</span></div>
              <div><kbd>⌘/Ctrl D</kbd><span>Duplicate selection</span></div>
              <div><kbd>Shift + drag</kbd><span>Multi-select</span></div>
              <div><kbd>Alt / Option + 1–0</kbd><span>Switch workspace</span></div>
              <div><kbd>Alt / Option + K</kbd><span>Narrative Threads</span></div>
              <div><kbd>Alt / Option + L</kbd><span>Personal Cognitive Universe</span></div>
              <div><kbd>?</kbd><span>Show this help</span></div>
              <div><kbd>Esc</kbd><span>Clear focus / menus</span></div>
            </div>
          </div>
        </div>
      )}
      <div className="scientific-disclaimer"><Info size={12} /> Educational conceptual simulation — not a biological connectome, mind reader or diagnostic instrument.</div>
    </div>
  );

  function setSettingsTheme() {
    useConversationStore.getState().setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  }
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return <span className={`timeline-chevron ${collapsed ? '' : 'open'}`}>⌃</span>;
}

export default App;
