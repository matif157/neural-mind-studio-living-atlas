import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BrainCircuit, Check, CircleHelp, Command, Info } from 'lucide-react';
import MindCanvas from './components/MindCanvas';
import Toolbar from './components/Toolbar';
import AnatomyModal from './components/AnatomyModal';
import { useMindStore } from './store/mindStore';
import { createProjectFile, downloadProjectFile, validateProjectFile } from './utils/projectFile';
import './styles.css';

const STORAGE_KEY = 'neural-mind-studio-project-v1';

function App() {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const past = useMindStore((state) => state.past);
  const future = useMindStore((state) => state.future);
  const running = useMindStore((state) => state.simulationRunning);
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
  const [showAnatomy, setShowAnatomy] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const fitRef = useRef<() => void>(() => undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (validateProjectFile(parsed)) loadProject(parsed);
      }
    } catch {
      notify('Saved workspace could not be restored. Starter map loaded.');
    }
    const unsubscribe = useMindStore.subscribe((state) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(createProjectFile(state.nodes, state.edges)));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    });
    return () => unsubscribe();
  }, [loadProject, notify]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if (mod && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
      else if (mod && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelection(); notify('Selection copied'); }
      else if (mod && event.key.toLowerCase() === 'x') { event.preventDefault(); cutSelection(); notify('Selection cut'); }
      else if (mod && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteClipboard(); notify('Selection pasted'); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); notify('Selection duplicated'); }
      else if (event.key === 'Escape') { useMindStore.getState().setActiveScenario(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copySelection, cutSelection, duplicateSelection, notify, pasteClipboard, redo, undo]);

  const exportProject = () => {
    downloadProjectFile(createProjectFile(nodes, edges));
    notify('Project JSON exported');
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!validateProjectFile(parsed)) throw new Error('Invalid project structure or unsupported schema.');
      loadProject(parsed);
      notify(`Imported ${parsed.nodes.length} nodes and ${parsed.edges.length} synapses`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not import this file');
    } finally {
      event.target.value = '';
    }
  };

  const toggleSimulation = () => setSimulationRunning(!running);
  const reset = () => {
    if (window.confirm('Reset the current mind map to the starter example? Export your work first if you need a backup.')) {
      resetToStarter();
      notify('Starter map restored');
    }
  };
  const setFitCallback = useCallback((fit: () => void) => { fitRef.current = fit; }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark"><BrainCircuit size={23} strokeWidth={1.75} /></div>
          <div className="brand-copy"><div className="brand-title">NEURAL MIND <span>STUDIO</span></div><div className="brand-subtitle">A visual workspace for cognition & emotion</div></div>
        </div>
        <div className="header-center"><span className="header-signal" /> CONCEPTUAL MIND MODEL <span className="header-slash">/</span> EDITABLE NEURAL MAP</div>
        <div className="header-actions">
          <div className={`save-state ${saved ? 'is-saved' : 'is-unsaved'}`}><span />{saved ? 'Saved locally' : 'Storage unavailable'}</div>
          <button className="header-help" onClick={() => setShowAnatomy(true)} title="About the model"><CircleHelp size={17} /></button>
        </div>
      </header>

      <section className="title-strip">
        <div><div className="title-eyebrow">PERSONAL COGNITIVE WORKSPACE <span>•</span> VERSION 0.1</div><h1>Map what moves <em>the mind.</em></h1><p>Explore relationships between emotional states, thoughts, memories, needs and the responses that follow.</p></div>
        <div className="title-stat-row"><div className="title-stat"><strong>{nodes.length}</strong><span>NEURAL NODES</span></div><div className="title-stat"><strong>{edges.length}</strong><span>SYNAPTIC LINKS</span></div><div className="title-stat"><strong>09</strong><span>NODE CLASSES</span></div></div>
      </section>

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
        onToggleRunning={toggleSimulation}
        onExport={exportProject}
        onImport={() => fileInput.current?.click()}
        onReset={reset}
        onAnatomy={() => setShowAnatomy(true)}
        onFit={() => fitRef.current()}
      />
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importProject} />

      <MindCanvas onFitRef={setFitCallback} />

      <footer className="app-footer">
        <div className="footer-left"><span className="footer-dot" /> LOCAL WORKSPACE <span className="footer-divider">/</span> YOUR MAP STAYS ON THIS DEVICE</div>
        <div className="footer-right"><span><Command size={12} /> Z undo</span><span><Command size={12} /> C copy</span><span><Command size={12} /> V paste</span><span>SHIFT + DRAG select</span></div>
      </footer>

      {toast && <div className="toast-message"><Check size={15} /> {toast}</div>}
      {showAnatomy && <AnatomyModal onClose={() => setShowAnatomy(false)} />}
      <div className="scientific-disclaimer"><Info size={12} /> Educational conceptual simulation — not a biological connectome, mind reader or diagnostic instrument.</div>
    </div>
  );
}

export default App;
