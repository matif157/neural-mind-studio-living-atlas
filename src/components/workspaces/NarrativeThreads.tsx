import { useMemo, useState } from 'react';
import { AlertTriangle, Download, GitBranch, Link2, Plus, Scissors, Trash2 } from 'lucide-react';
import {
  NARRATIVE_LINK_KINDS, useConversationStore,
  type NarrativeLinkKind, type NarrativeSegment,
} from '../../store/conversationStore';

interface Props { notify: (message: string) => void }

const STOP_WORDS = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'was', 'were', 'have', 'has', 'had', 'but', 'not', 'you', 'your', 'they', 'them', 'their', 'from', 'into', 'about', 'when', 'what', 'why', 'how', 'all', 'any', 'can', 'will', 'would', 'could', 'should', 'just', 'very', 'more', 'been', 'than', 'then', 'over', 'also']);

function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
  );
}

function evidenceText(segment: NarrativeSegment): string {
  return [segment.whatHappened, segment.feltBody, segment.story, segment.need, segment.action].join(' ');
}

export default function NarrativeThreads({ notify }: Props) {
  const threads = useConversationStore((state) => state.threads);
  const segments = useConversationStore((state) => state.segments);
  const links = useConversationStore((state) => state.links);
  const addThread = useConversationStore((state) => state.addThread);
  const updateThread = useConversationStore((state) => state.updateThread);
  const deleteThread = useConversationStore((state) => state.deleteThread);
  const splitThread = useConversationStore((state) => state.splitThread);
  const addSegment = useConversationStore((state) => state.addSegment);
  const updateSegment = useConversationStore((state) => state.updateSegment);
  const deleteSegment = useConversationStore((state) => state.deleteSegment);
  const addLink = useConversationStore((state) => state.addLink);
  const deleteLink = useConversationStore((state) => state.deleteLink);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<NarrativeLinkKind>('same need');

  const activeThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;
  const threadSegments = useMemo(
    () => segments.filter((segment) => segment.threadId === activeThread?.id).sort((a, b) => a.order - b.order),
    [segments, activeThread?.id],
  );
  const activeSegment = threadSegments.find((segment) => segment.id === selectedSegmentId) ?? threadSegments[0] ?? null;

  const candidates = useMemo(() => {
    if (!activeSegment) return [];
    const sourceTokens = tokens(evidenceText(activeSegment));
    return segments
      .filter((segment) => segment.id !== activeSegment.id)
      .map((segment) => ({ segment, score: [...tokens(evidenceText(segment))].filter((word) => sourceTokens.has(word)).length }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [activeSegment, segments]);

  const recurringNeeds = useMemo(() => {
    const counts = new Map<string, number>();
    segments.forEach((segment) => {
      const key = segment.need.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [segments]);

  const labelFor = (segmentId: string) => {
    const segment = segments.find((item) => item.id === segmentId);
    const thread = threads.find((item) => item.id === segment?.threadId);
    return `${thread?.title ?? 'Thread'} · ${segment?.title ?? 'Segment'}`;
  };

  const createThread = () => {
    const threadId = addThread();
    setSelectedThreadId(threadId);
    setSelectedSegmentId(null);
  };

  const createSegment = () => {
    if (!activeThread) return;
    const segmentId = addSegment(activeThread.id);
    setSelectedSegmentId(segmentId);
  };

  const runSplit = () => {
    if (!activeThread) return;
    const count = splitThread(activeThread.id);
    setSelectedSegmentId(null);
    notify(count > 0 ? `Split into ${count} talk segments` : 'Add source text before splitting');
  };

  const connect = (toId: string) => {
    if (!activeSegment) return;
    addLink({ fromId: activeSegment.id, toId, kind: linkKind, note: '' });
    notify('Connection added as a reviewable draft');
  };

  const exportThreads = () => {
    const payload = { schema: 'narrative-v1', exportedAt: new Date().toISOString(), threads, segments, links };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'narrative-threads.json';
    anchor.click();
    URL.revokeObjectURL(url);
    notify('Narrative threads exported locally');
  };

  return (
    <div className="narrative-shell">
      <aside className="narrative-rail">
        <div className="rail-head">
          <div><div className="panel-kicker">THREADS</div><h3>Your talks</h3></div>
          <div className="rail-actions">
            <button className="icon-button small ghost" onClick={exportThreads} aria-label="Export threads" title="Export threads"><Download size={13} /></button>
            <button className="icon-button small" onClick={createThread} aria-label="Create thread" title="Create thread"><Plus size={14} /></button>
          </div>
        </div>
        <p className="rail-copy">Each talk stays separate. Connect only after you have read both sides.</p>
        {threads.length === 0 ? (
          <div className="empty-state">No threads yet. Create one, then paste the original wording into the source box.</div>
        ) : (
          <div className="thread-list">
            {threads.map((thread, index) => (
              <div key={thread.id} className={`thread-row ${activeThread?.id === thread.id ? 'active' : ''}`}>
                <button className="thread-select" onClick={() => { setSelectedThreadId(thread.id); setSelectedSegmentId(null); }}>
                  <span className="thread-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="thread-copy"><strong>{thread.title}</strong><small>{thread.period || 'No period set'} · {segments.filter((segment) => segment.threadId === thread.id).length} segments</small></span>
                </button>
                <button className="icon-button small ghost" onClick={() => { if (window.confirm(`Delete "${thread.title}" and its segments?`)) deleteThread(thread.id); }} aria-label={`Delete ${thread.title}`} title="Delete thread"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="method-note">
          <strong>Method</strong>
          <p>Original wording is preserved. Interpretations, needs and links are your drafts — never facts about another person.</p>
        </div>
      </aside>

      <section className="narrative-main">
        {!activeThread ? (
          <div className="narrative-empty">
            <GitBranch size={26} />
            <h3>Build the map from separate talks</h3>
            <p>Create a thread for one conversation or time period. Split it into segments, then connect repeated patterns without collapsing them into one story.</p>
            <button className="primary-button" onClick={createThread}><Plus size={14} /> Create first thread</button>
          </div>
        ) : (
          <>
            <header className="narrative-topbar">
              <input className="thread-title-input" aria-label="Thread title" value={activeThread.title} onChange={(event) => updateThread(activeThread.id, { title: event.target.value })} />
              <input className="thread-period-input" aria-label="Thread period" placeholder="Period / years" value={activeThread.period} onChange={(event) => updateThread(activeThread.id, { period: event.target.value })} />
              <button className="primary-button small" onClick={runSplit}><Scissors size={13} /> Split into talks</button>
              <button className="primary-button small" onClick={createSegment}><Plus size={13} /> Segment</button>
            </header>

            <div className="source-strip">
              <label htmlFor="narrative-source">Source talk <span>stored locally, never sent by this workspace</span></label>
              <textarea id="narrative-source" value={activeThread.rawText} onChange={(event) => updateThread(activeThread.id, { rawText: event.target.value })} placeholder="Paste one long talk here. Use blank lines between separate talks, or let the split tool divide by lines." />
            </div>

            <div className="segment-nav" aria-label="Segments">
              {threadSegments.length === 0 ? <span className="segment-nav-empty">No segments yet — add one or split the source.</span> : threadSegments.map((segment, index) => (
                <button key={segment.id} className={`segment-chip ${activeSegment?.id === segment.id ? 'active' : ''}`} onClick={() => setSelectedSegmentId(segment.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{segment.title}
                </button>
              ))}
            </div>

            {activeSegment ? (
              <div className="segment-editor">
                <div className="segment-head">
                  <input aria-label="Segment title" value={activeSegment.title} onChange={(event) => updateSegment(activeSegment.id, { title: event.target.value })} />
                  <select aria-label="Segment status" value={activeSegment.status} onChange={(event) => updateSegment(activeSegment.id, { status: event.target.value as NarrativeSegment['status'] })}>
                    <option value="draft">Draft</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button className="icon-button small" onClick={() => { if (window.confirm('Delete this segment?')) deleteSegment(activeSegment.id); }} aria-label="Delete segment" title="Delete segment"><Trash2 size={13} /></button>
                </div>
                <div className="editor-grid">
                  <label className="editor-field wide">Original wording
                    <textarea value={activeSegment.originalText} onChange={(event) => updateSegment(activeSegment.id, { originalText: event.target.value })} placeholder="What was actually said or written…" />
                  </label>
                  <label className="editor-field">What happened
                    <textarea value={activeSegment.whatHappened} onChange={(event) => updateSegment(activeSegment.id, { whatHappened: event.target.value })} placeholder="Observable events only…" />
                  </label>
                  <label className="editor-field">What I felt / body
                    <textarea value={activeSegment.feltBody} onChange={(event) => updateSegment(activeSegment.id, { feltBody: event.target.value })} placeholder="Self-reported sensations…" />
                  </label>
                  <label className="editor-field">The story I told myself
                    <textarea value={activeSegment.story} onChange={(event) => updateSegment(activeSegment.id, { story: event.target.value })} placeholder="Interpretation, not fact…" />
                  </label>
                  <label className="editor-field">Need underneath
                    <textarea value={activeSegment.need} onChange={(event) => updateSegment(activeSegment.id, { need: event.target.value })} placeholder="Safety, belonging, dignity, autonomy…" />
                  </label>
                  <label className="editor-field">What I did
                    <textarea value={activeSegment.action} onChange={(event) => updateSegment(activeSegment.id, { action: event.target.value })} placeholder="Behaviour or response…" />
                  </label>
                </div>
                <div className="confidence-row">
                  <label htmlFor="segment-confidence">My confidence in this reading</label>
                  <input id="segment-confidence" type="range" min="0" max="1" step="0.05" value={activeSegment.confidence} onChange={(event) => updateSegment(activeSegment.id, { confidence: Number(event.target.value) })} />
                  <strong>{Math.round(activeSegment.confidence * 100)}%</strong>
                </div>
              </div>
            ) : <div className="empty-state">Add a segment or split the source to begin reviewing this talk.</div>}
          </>
        )}
      </section>

      <aside className="narrative-links">
        <div className="rail-head"><div><div className="panel-kicker">CONNECTIONS</div><h3>Echoes & links</h3></div><Link2 size={15} /></div>
        <label className="mini-field">Link type
          <select value={linkKind} onChange={(event) => setLinkKind(event.target.value as NarrativeLinkKind)}>
            {NARRATIVE_LINK_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </label>
        <div className="link-section">
          <h4>Possible echoes</h4>
          {candidates.length === 0 ? <p className="link-hint">Fill in the interpretation fields to find repeated language across talks.</p> : candidates.map(({ segment, score }) => (
            <button key={segment.id} className="echo-row" onClick={() => connect(segment.id)} title={`Connect as ${linkKind}`}>
              <span>{labelFor(segment.id)}</span><small>{score} shared terms</small><Plus size={12} />
            </button>
          ))}
        </div>
        <div className="link-section">
          <h4>Accepted links <span>{links.length}</span></h4>
          {links.length === 0 ? <p className="link-hint">No connections yet. Suggestions stay as drafts until you add them here.</p> : (
            <div className="link-list">
              {links.map((link) => (
                <div key={link.id} className="link-row">
                  <div><strong>{link.kind}</strong><span>{labelFor(link.fromId)}</span><span>↔ {labelFor(link.toId)}</span></div>
                  <button className="icon-button small ghost" onClick={() => deleteLink(link.id)} aria-label="Delete link" title="Delete link"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="link-section">
          <h4>Recurring needs</h4>
          {recurringNeeds.length === 0 ? <p className="link-hint">Name needs in your segments to see what repeats.</p> : recurringNeeds.map(([need, count]) => (
            <div key={need} className="need-row"><span>{need}</span><strong>{count}×</strong></div>
          ))}
        </div>
        <div className="safety-banner compact narrative-safety">
          <AlertTriangle size={14} />
          <p>No diagnosis, no hidden-memory inference, no claims about another person’s motives. Links are hypotheses you can edit or delete.</p>
        </div>
      </aside>
    </div>
  );
}
