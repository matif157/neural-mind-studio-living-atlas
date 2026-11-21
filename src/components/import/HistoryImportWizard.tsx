import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle, Check, ChevronRight, FileText, Link2, LockKeyhole, ShieldAlert,
  Trash2, Upload, X,
} from 'lucide-react';
import type { SensitivityLevel } from '@shared/domain';
import { SENSITIVITY_LEVELS } from '@shared/domain';
import { useConversationStore } from '../../store/conversationStore';
import { useImportStore } from '../../store/importStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import { formatLabel, type SourceFormat } from '../../lib/historyImport';

interface Props { notify: (message: string) => void }

const ACCEPT = '.txt,.md,.markdown,.json,.csv,text/plain,text/markdown,application/json,text/csv';

function formatFromName(name: string): SourceFormat {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'md' || extension === 'markdown') return 'md';
  if (extension === 'json') return 'json';
  if (extension === 'csv') return 'csv';
  return 'txt';
}

export default function HistoryImportWizard({ notify }: Props) {
  const documents = useImportStore((state) => state.documents);
  const passages = useImportStore((state) => state.passages);
  const candidates = useImportStore((state) => state.candidates);
  const importText = useImportStore((state) => state.importText);
  const approveCandidate = useImportStore((state) => state.approveCandidate);
  const rejectCandidate = useImportStore((state) => state.rejectCandidate);
  const approvePassage = useImportStore((state) => state.approvePassage);
  const deleteDocument = useImportStore((state) => state.deleteDocument);
  const longTermMemory = useConversationStore((state) => state.settings.longTermMemory);

  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<SourceFormat>('manual');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('sensitive');
  const [text, setText] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [openPassageId, setOpenPassageId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const activeDocument = documents.find((item) => item.id === activeDocId) ?? documents[documents.length - 1] ?? null;
  const documentPassages = useMemo(
    () => passages.filter((item) => item.documentId === activeDocument?.id).sort((a, b) => a.order - b.order),
    [passages, activeDocument?.id],
  );
  const documentCandidates = useMemo(
    () => candidates.filter((item) => item.documentId === activeDocument?.id),
    [candidates, activeDocument?.id],
  );

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { setError('Files above 2 MB are rejected to keep the local workspace responsive.'); return; }
    try {
      const content = await file.text();
      setText(content);
      setFormat(formatFromName(file.name));
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''));
      setError('');
      notify(`${file.name} loaded into this browser only — nothing was uploaded`);
    } catch {
      setError('This file could not be read.');
    } finally {
      event.target.value = '';
    }
  };

  const runImport = () => {
    if (!text.trim()) { setError('Add some text or choose a file first.'); return; }
    const result = importText({ title: title || 'Personal history source', format, text, sensitivity });
    setActiveDocId(result.documentId);
    setOpenPassageId(null);
    setError('');
    notify(`Imported ${result.passages} passage(s) and ${result.candidates} candidate concept(s) for review`);
    setText('');
    setTitle('');
    setFormat('manual');
  };

  const openNode = (nodeId: string) => {
    useUiStore.getState().setSelectedNode(nodeId);
    useUiStore.getState().setWorkspace('atlas');
    const node = useMindStore.getState().nodes.find((item) => item.id === nodeId);
    if (node) useMindStore.getState().setNodes(useMindStore.getState().nodes.map((item) => ({ ...item, selected: item.id === nodeId })));
  };

  return (
    <section className="workspace-card import-wizard">
      <div className="card-head">
        <h3><FileText size={15} /> Private history import</h3>
        <span className="chip">Local only</span>
      </div>
      <p className="card-copy">
        Import a personal history document as separate source passages. The original wording and character offsets are preserved,
        chronology is recorded only when you stated it, and every extracted concept stays a candidate until you approve it.
        Nothing is uploaded, summarised by a model, or added to the map automatically.
      </p>

      <div className="safety-banner compact">
        <LockKeyhole size={15} />
        <span>
          {longTermMemory
            ? 'Imported sources are stored in this browser only while “Keep reflections between sessions” is enabled.'
            : 'Long-term storage is off, so imported sources will disappear when you close this session. Enable it in Consent & privacy if you want them retained locally.'}
        </span>
      </div>

      <div className="import-steps">
        <div className="import-step">
          <div className="import-step-head"><span>1</span><strong>Choose a source</strong></div>
          <div className="import-form">
            <label className="mini-field">Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Personal notes, 2026" />
            </label>
            <label className="mini-field">Format
              <select value={format} onChange={(event) => setFormat(event.target.value as SourceFormat)}>
                {(['manual', 'txt', 'md', 'json', 'csv'] as SourceFormat[]).map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
              </select>
            </label>
            <label className="mini-field">Privacy level
              <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as SensitivityLevel)}>
                {SENSITIVITY_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          </div>
          <div className="inline-actions">
            <button className="text-button" onClick={() => fileInput.current?.click()}><Upload size={13} /> Choose file</button>
            <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(event) => void onFile(event)} />
            <span className="chip">{text ? `${new Blob([text]).size.toLocaleString()} bytes loaded` : 'TXT · MD · JSON · CSV'}</span>
          </div>
          <textarea
            className="import-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Or type / paste your text here. It stays in this browser."
            rows={6}
            aria-label="Personal history text"
          />
          {error && <p className="import-error"><AlertTriangle size={13} /> {error}</p>}
          <button className="primary-button" onClick={runImport}><ChevronRight size={13} /> Segment and extract candidates</button>
        </div>

        <div className="import-step">
          <div className="import-step-head"><span>2</span><strong>Review candidates</strong></div>
          {documents.length === 0 ? (
            <p className="panel-copy">No sources imported yet.</p>
          ) : (
            <>
              <div className="import-doc-list">
                {documents.map((document) => {
                  const docCandidates = candidates.filter((item) => item.documentId === document.id);
                  const approved = docCandidates.filter((item) => item.status === 'approved').length;
                  return (
                    <button key={document.id} className={`import-doc ${activeDocument?.id === document.id ? 'active' : ''}`} onClick={() => { setActiveDocId(document.id); setOpenPassageId(null); }}>
                      <strong>{document.title}</strong>
                      <small>{formatLabel(document.format)} · {document.sensitivity} · {approved}/{docCandidates.length} approved</small>
                    </button>
                  );
                })}
              </div>

              {activeDocument && (
                <>
                  <div className="import-doc-meta">
                    <span>{documentPassages.length} passage(s)</span>
                    <span>{documentCandidates.filter((item) => item.status === 'pending').length} pending</span>
                    <span>{activeDocument.byteLength.toLocaleString()} bytes</span>
                    <button
                      className="text-button danger-text"
                      onClick={() => {
                        if (!window.confirm('Delete this source, its passages and its candidates? Approved map nodes are kept unless you choose otherwise next time.')) return;
                        deleteDocument(activeDocument.id, false);
                        setActiveDocId(null);
                        notify('Imported source removed from this browser');
                      }}
                    >
                      <Trash2 size={12} /> Remove source
                    </button>
                  </div>

                  <div className="import-passages">
                    {documentPassages.map((passage) => {
                      const passageCandidates = documentCandidates.filter((item) => item.passageId === passage.id);
                      const pending = passageCandidates.filter((item) => item.status === 'pending');
                      const open = openPassageId === passage.id;
                      return (
                        <div className={`import-passage ${open ? 'open' : ''}`} key={passage.id}>
                          <button className="import-passage-head" onClick={() => setOpenPassageId(open ? null : passage.id)} aria-expanded={open}>
                            <span className="import-passage-order">{passage.order + 1}</span>
                            <span className="import-passage-title">
                              <strong>{passage.heading ?? passage.originalText.slice(0, 72)}</strong>
                              <small>
                                offsets {passage.startOffset}–{passage.endOffset} ·{' '}
                                {passage.chronology.label ?? 'date unknown'}
                                {passage.chronology.precision === 'approximate' ? ' (approximate)' : ''}
                                {' · '}{passageCandidates.length} candidate(s)
                              </small>
                            </span>
                            {passage.containsSafetyLanguage && <ShieldAlert size={14} className="import-safety-icon" />}
                            <ChevronRight size={14} className={`import-chevron ${open ? 'open' : ''}`} />
                          </button>

                          {open && (
                            <div className="import-passage-body">
                              {passage.safetyNote && <p className="import-safety-note"><ShieldAlert size={13} /> {passage.safetyNote}</p>}
                              <blockquote className="import-quote">{passage.originalText}</blockquote>
                              {passageCandidates.length === 0 ? (
                                <p className="panel-copy">No rule-based candidates were found in this passage. Nothing was invented to fill the gap.</p>
                              ) : (
                                <div className="import-candidates">
                                  {passageCandidates.map((candidate) => (
                                    <div className={`import-candidate status-${candidate.status}`} key={candidate.id}>
                                      <span className="chip">{candidate.kind}</span>
                                      <div className="import-candidate-main">
                                        <strong>{candidate.label}</strong>
                                        <small>{candidate.certainty} · {candidate.description}</small>
                                        <em>“{candidate.evidenceExcerpt.slice(0, 220)}”</em>
                                      </div>
                                      {candidate.status === 'pending' && (
                                        <div className="import-candidate-actions">
                                          <button className="icon-button small" title="Approve and add to map" aria-label="Approve candidate" onClick={() => { approveCandidate(candidate.id); notify('Candidate added to your map as a confirmed concept'); }}><Check size={13} /></button>
                                          <button className="icon-button small" title="Reject candidate" aria-label="Reject candidate" onClick={() => rejectCandidate(candidate.id)}><X size={13} /></button>
                                        </div>
                                      )}
                                      {candidate.status === 'approved' && candidate.approvedNodeId && (
                                        <button className="text-button" onClick={() => openNode(candidate.approvedNodeId as string)}><Link2 size={12} /> Open node</button>
                                      )}
                                      {candidate.status === 'rejected' && <span className="chip">rejected</span>}
                                    </div>
                                  ))}
                                  {pending.length > 1 && (
                                    <button className="text-button" onClick={() => { const count = approvePassage(passage.id); notify(`${count} candidate(s) approved`); }}>
                                      <Check size={12} /> Approve all {pending.length} pending candidates in this passage
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="import-step">
          <div className="import-step-head"><span>3</span><strong>Source-to-node trail</strong></div>
          <p className="panel-copy">
            Every approved concept keeps the passage ID, exact excerpt and stated date in its evidence record.
            Open any node in the inspector to read the original passage it came from.
          </p>
          {candidates.filter((item) => item.status === 'approved').length === 0 ? (
            <p className="panel-copy">No approved concepts yet.</p>
          ) : (
            <div className="node-record-list">
              {candidates.filter((item) => item.status === 'approved').map((candidate) => (
                <div className="node-record" key={candidate.id}>
                  <div className="node-record-head"><strong>{candidate.label}</strong><span className="chip user-confirmed">confirmed</span></div>
                  <small>{candidate.kind} · {candidate.certainty} · source {candidate.passageId}</small>
                  {candidate.approvedNodeId && <button className="text-button" onClick={() => openNode(candidate.approvedNodeId as string)}>Open in map →</button>}
                </div>
              ))}
            </div>
          )}
          <div className="safety-banner compact">
            <ShieldAlert size={15} />
            <span>Imported history is never added to seed data, tests, screenshots or a public repository. Visual masking is not encryption.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
