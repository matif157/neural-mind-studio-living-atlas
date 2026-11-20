import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Bot, ChevronDown, Edit3, KeyRound, MessageCircle, Mic, MicOff,
  Plus, Send, ShieldCheck, Trash2, User,
} from 'lucide-react';
import { CRISIS_MESSAGE } from '@shared/taxonomy';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';
import { analyzeMessage, fetchProviders, streamAnalysis, testConnection } from '../../lib/api';
import type { AnalysisRequest, AiAnalysis, ConversationEvent } from '@shared/schemas';
import type { StoredAnalysis } from '../../lib/patterns';
import ProposalReview from './ProposalReview';

interface Props { notify: (message: string) => void }

interface SpeechResultLike { isFinal: boolean; 0: { transcript: string } }
interface SpeechEventLike { results: ArrayLike<SpeechResultLike>; resultIndex: number }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const id = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const pct = (value: number) => `${Math.round(value * 100)}%`;

function localSafetyFlags(text: string): string[] {
  const flags: string[] = [];
  if (/kill myself|end my life|suicide|self.harm|hurt myself|no reason to live/i.test(text)) flags.push('possible self-harm language');
  if (/hurt someone|harm someone|kill someone/i.test(text)) flags.push('possible harm-to-others language');
  if (/emergency|ambulance|overdose|can't breathe/i.test(text)) flags.push('possible urgent situation');
  return flags;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="analysis-section"><h4>{title}</h4>{children}</div>;
}

function EvidenceList({ title, items }: { title: string; items: Array<{ label: string; evidence: string; confidence: number; detail?: string }> }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      <div className="analysis-items">
        {items.map((item, index) => (
          <div className="analysis-item" key={`${title}-${index}`}>
            <div className="analysis-item-head">
              <strong>{item.label}</strong>
              <span className="confidence-chip" title="Interpretation confidence, not a measurement">confidence {pct(item.confidence)}</span>
            </div>
            {item.detail && <span className="analysis-detail">{item.detail}</span>}
            {item.evidence && <p>“{item.evidence}”</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

function AnalysisCard({ record, events }: { record: StoredAnalysis; events: ConversationEvent[] }) {
  const updateAnalysis = useConversationStore((state) => state.updateAnalysis);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.analysis.response_to_user);
  const analysis: AiAnalysis = record.analysis;
  const sourceEvents = events.filter((event) => event.analysisId === record.id || event.conversationId === record.conversationId);

  const save = () => {
    if (!draft.trim()) return;
    updateAnalysis(record.id, { response_to_user: draft.trim() });
    setEditing(false);
  };

  return (
    <article className="analysis-card">
      <button className="analysis-card-head" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <span className="analysis-icon"><Bot size={15} /></span>
        <span className="analysis-head-copy">
          <strong>{expanded ? 'Structured reflection' : analysis.conversation_summary.slice(0, 110)}</strong>
          <small>{record.offline ? 'Offline deterministic analysis' : `${analysis.clarifying_questions.length ? 'Reviewable interpretation' : 'Reflection'} · ${new Date(record.createdAt).toLocaleString()}`}</small>
        </span>
        <ChevronDown size={15} className={expanded ? 'rotated' : ''} />
      </button>
      <div className="analysis-response">
        {editing ? (
          <>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} aria-label="Edit AI response" />
            <div className="inline-actions"><button className="primary-button small" onClick={save}>Save edit</button><button className="text-button" onClick={() => { setDraft(analysis.response_to_user); setEditing(false); }}>Cancel</button></div>
          </>
        ) : (
          <>
            <p>{analysis.response_to_user}</p>
            <button className="text-button" onClick={() => setEditing(true)}><Edit3 size={12} /> Edit this response</button>
          </>
        )}
      </div>
      {analysis.safety_flags.length > 0 && (
        <div className="safety-banner compact"><AlertTriangle size={15} /><span>{CRISIS_MESSAGE}</span></div>
      )}
      {expanded && (
        <div className="analysis-details">
          {analysis.situation.length > 0 && <Section title="Situation described"><div className="chip-row">{analysis.situation.map((item, index) => <span className="chip" key={index}>{item}</span>)}</div></Section>}
          <EvidenceList
            title="Emotions (self-reported / possible)"
            items={analysis.emotions.map((emotion) => ({
              label: emotion.name,
              evidence: emotion.evidence,
              confidence: emotion.confidence,
              detail: `${emotion.certainty}${emotion.intensity !== null ? ` · intensity ${pct(emotion.intensity)} (only if stated)` : ' · intensity not stated'}`,
            }))}
          />
          <Section title="Thoughts in original wording">
            <div className="analysis-items">
              {analysis.thoughts.map((thought, index) => (
                <div className="analysis-item" key={index}>
                  <div className="analysis-item-head"><strong>{thought.type}</strong><span className="confidence-chip">{thought.certainty}</span></div>
                  <p>“{thought.original_text}”</p>
                  {thought.normalized_text && <small>Normalised for review: {thought.normalized_text}</small>}
                </div>
              ))}
            </div>
          </Section>
          <EvidenceList
            title="Possible cognitive patterns — hypotheses, not facts"
            items={analysis.cognitive_patterns.map((pattern) => ({
              label: pattern.name, evidence: pattern.evidence, confidence: pattern.confidence,
              detail: pattern.requires_confirmation ? 'Requires your confirmation' : 'Offered for reflection only',
            }))}
          />
          <EvidenceList title="Possible needs" items={analysis.possible_needs.map((need) => ({ label: need.name, evidence: need.evidence, confidence: need.confidence }))} />
          <EvidenceList title="Reported behaviours" items={analysis.reported_behaviours.map((behaviour) => ({ label: behaviour.description, evidence: behaviour.evidence, confidence: behaviour.confidence }))} />
          {analysis.alternative_perspectives.length > 0 && <Section title="Alternative perspectives"><ul>{analysis.alternative_perspectives.map((item, index) => <li key={index}>{item}</li>)}</ul></Section>}
          {analysis.suggested_exercises.length > 0 && <Section title="Suggested exercises"><div className="chip-row">{analysis.suggested_exercises.map((item, index) => <span className="chip" key={index}>{item}</span>)}</div></Section>}
          {analysis.professional_support_considerations.length > 0 && <Section title="Professional support considerations"><ul>{analysis.professional_support_considerations.map((item, index) => <li key={index}>{item}</li>)}</ul></Section>}
          {analysis.clarifying_questions.length > 0 && <Section title="Clarifying questions"><ul>{analysis.clarifying_questions.map((item, index) => <li key={index}>{item}</li>)}</ul></Section>}
          <ProposalReview analysisId={record.id} eventId={sourceEvents.find((event) => event.role === 'user')?.id ?? record.id} createdAt={record.createdAt} />
          <div className="analysis-meta">
            <span>{record.offline ? 'offline' : 'server provider'}</span>
            <span>{new Date(record.createdAt).toLocaleString()}</span>
            <span>{sourceEvents.length} linked event(s)</span>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ConversationWorkspace({ notify }: Props) {
  const conversations = useConversationStore((state) => state.conversations);
  const activeConversationId = useConversationStore((state) => state.activeConversationId);
  const events = useConversationStore((state) => state.events);
  const analyses = useConversationStore((state) => state.analyses);
  const settings = useConversationStore((state) => state.settings);
  const streaming = useConversationStore((state) => state.streaming);
  const newConversation = useConversationStore((state) => state.newConversation);
  const setActiveConversation = useConversationStore((state) => state.setActiveConversation);
  const deleteConversation = useConversationStore((state) => state.deleteConversation);
  const addEvent = useConversationStore((state) => state.addEvent);
  const addAnalysis = useConversationStore((state) => state.addAnalysis);
  const addProposals = useConversationStore((state) => state.addProposals);
  const deleteEvent = useConversationStore((state) => state.deleteEvent);
  const updateEventText = useConversationStore((state) => state.updateEventText);
  const setProvider = useConversationStore((state) => state.setProvider);
  const setStreaming = useConversationStore((state) => state.setStreaming);
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const setWorkspace = useUiStore((state) => state.setWorkspace);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState('');
  const [providers, setProviders] = useState<Array<{ id: string; label: string; available: boolean; note: string }>>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptFromVoice = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeConversationId || !conversations.some((item) => item.id === activeConversationId)) {
      if (conversations.length) setActiveConversation(conversations[0].id);
      else newConversation();
    }
  }, [activeConversationId, conversations, newConversation, setActiveConversation]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [events.length, streaming.text]);

  useEffect(() => {
    fetchProviders().then((data) => setProviders(data.providers)).catch(() => undefined);
  }, []);

  const conversationEvents = useMemo(
    () => events.filter((event) => event.conversationId === activeConversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [events, activeConversationId],
  );
  const conversationAnalyses = useMemo(
    () => analyses.filter((record) => record.conversationId === activeConversationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [analyses, activeConversationId],
  );

  const context = useMemo<AnalysisRequest['context']>(() => {
    const approvedIds = new Set(nodes.filter((node) => node.selected || node.data.isCore).map((node) => node.id));
    return {
      approvedNodes: settings.contextSharing.approvedNodes
        ? nodes.filter((node) => approvedIds.has(node.id)).slice(0, 20).map((node) => ({ id: node.id, label: node.data.label, kind: node.data.kind, description: node.data.description.slice(0, 1000) }))
        : [],
      approvedEdges: settings.contextSharing.approvedNodes
        ? edges.filter((edge) => approvedIds.has(edge.source) && approvedIds.has(edge.target)).slice(0, 60)
          .map((edge) => ({ source: edge.source, target: edge.target, relation: edge.data?.customRelation ?? edge.data?.relation ?? 'associated with' }))
        : [],
      recentEvents: settings.contextSharing.recentEvents
        ? conversationEvents.filter((event) => event.role === 'user').slice(-5).map((event) => ({ date: event.createdAt, text: event.text.slice(0, 1500) }))
        : [],
    };
  }, [nodes, edges, settings.contextSharing, conversationEvents]);

  const send = async (voice = false) => {
    const text = draft.trim();
    if (!text || streaming.active) return;
    if (!settings.aiConsent) { setError('AI conversation is off. Enable it in Settings & Data Control first.'); return; }
    const conversationId = activeConversationId || newConversation();
    const detectedFlags = localSafetyFlags(text);
    setFlags(detectedFlags);
    setError('');
    const userEventId = id('event');
    const userEvent = {
      id: userEventId, conversationId, role: 'user' as const, text, originalText: text,
      createdAt: now(), provider: settings.provider, model: settings.modelByProvider[settings.provider],
      consentGranted: true, fromTranscription: voice, safetyFlags: detectedFlags,
    };
    addEvent(userEvent);
    setDraft('');
    transcriptFromVoice.current = false;
    const priorMessages = events.filter((event) => event.conversationId === conversationId && event.role === 'user').slice(-11).map((event) => ({ role: event.role, text: event.text }));
    const request: AnalysisRequest = {
      conversationId,
      messages: [...priorMessages, { role: 'user' as const, text }].slice(-12),
      consent: true,
      context,
      provider: settings.provider,
      model: settings.modelByProvider[settings.provider] || undefined,
      stream: settings.showSignals,
    };
    setStreaming({ active: true, text: '', status: settings.provider === 'offline' ? 'Running offline analysis…' : 'Requesting analysis…' });
    try {
      const response = settings.showSignals
        ? await streamAnalysis(request, {
          onToken: (chunk) => setStreaming({ text: `${useConversationStore.getState().streaming.text}${chunk}`.slice(-8000) }),
          onStatus: (status) => setStreaming({ status }),
        })
        : await analyzeMessage(request);
      const analysisId = id('analysis');
      const createdAt = now();
      addEvent({
        id: id('event'), conversationId, role: 'assistant', text: response.analysis.response_to_user,
        originalText: response.analysis.response_to_user, createdAt, provider: response.meta.provider,
        model: response.meta.model, analysisId, consentGranted: true, fromTranscription: false, safetyFlags: response.analysis.safety_flags,
      });
      addAnalysis({ id: analysisId, createdAt, conversationId, analysis: response.analysis, offline: response.meta.offline });
      addProposals(analysisId, userEventId, response.analysis);
      if (response.analysis.safety_flags.length) setFlags([...new Set([...detectedFlags, ...response.analysis.safety_flags])]);
      if (response.meta.warnings.length) notify(response.meta.warnings[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analysis could not be completed.');
    } finally {
      setStreaming({ active: false, text: '', status: '' });
    }
  };

  const toggleVoice = () => {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) { setError('Voice input is not supported by this browser. Type your reflection instead.'); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0]?.transcript ?? '';
      if (transcript.trim()) {
        setDraft((current) => `${current}${current ? ' ' : ''}${transcript.trim()}`);
        transcriptFromVoice.current = true;
      }
    };
    recognition.onerror = (event) => { setError(`Voice input failed: ${event.error}`); setRecording(false); };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setRecording(true); setError(''); } catch { setError('Voice input could not be started.'); }
  };

  const runConnectionTest = async () => {
    try {
      const result = await testConnection(settings.provider, settings.modelByProvider[settings.provider]);
      notify(result.ok ? `Connection successful (${result.latencyMs ?? 0} ms)` : result.error ?? 'Connection failed');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Connection failed'); }
  };

  const activeProvider = providers.find((item) => item.id === settings.provider);

  return (
    <div className="conversation-shell">
      <aside className="conversation-list-panel">
        <div className="panel-kicker">WORKSPACE B</div>
        <div className="panel-heading">Conversations</div>
        <button className="primary-button wide" onClick={() => newConversation()}><Plus size={14} /> New conversation</button>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <div className={`conversation-row ${conversation.id === activeConversationId ? 'active' : ''}`} key={conversation.id}>
              <button onClick={() => setActiveConversation(conversation.id)}>
                <MessageCircle size={14} />
                <span><strong>{conversation.title}</strong><small>{new Date(conversation.updatedAt).toLocaleString()}</small></span>
              </button>
              <button className="icon-button ghost" title="Delete conversation" aria-label="Delete conversation" onClick={() => { if (window.confirm('Delete this conversation and its linked analyses?')) deleteConversation(conversation.id); }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div className="consent-card">
          <ShieldCheck size={16} />
          <div>
            <strong>{settings.aiConsent ? 'AI consent granted' : 'AI conversation paused'}</strong>
            <p>{settings.aiConsent ? 'You can withdraw consent at any time in Settings.' : 'No text is sent anywhere until you opt in.'}</p>
            {!settings.aiConsent && <button className="text-button" onClick={() => setWorkspace('settings')}>Open Settings →</button>}
          </div>
        </div>
      </aside>

      <section className="conversation-main">
        <div className="conversation-topbar">
          <div><span className="live-dot" /> REFLECTIVE CONVERSATION <span className="canvas-divider">/</span> REVIEW BEFORE GRAPH CHANGES</div>
          <div className="provider-switcher">
            <label htmlFor="provider">Provider</label>
            <select id="provider" value={settings.provider} onChange={(event) => setProvider(event.target.value as typeof settings.provider)}>
              {(providers.length ? providers.map((item) => ({ id: item.id, label: item.label })) : [{ id: settings.provider, label: activeProvider?.label ?? settings.provider }]).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button className="text-button" onClick={runConnectionTest}>Test</button>
          </div>
        </div>

        {(flags.length > 0 || conversationAnalyses.some((record) => record.analysis.safety_flags.length > 0)) && (
          <div className="safety-banner"><AlertTriangle size={16} /><div><strong>Support reminder</strong><p>{CRISIS_MESSAGE}</p></div></div>
        )}

        <div className="conversation-scroll">
          {conversationEvents.length === 0 && (
            <div className="conversation-empty">
              <KeyRound size={22} />
              <h3>Start with your own words</h3>
              <p>Describe a situation, thought or feeling. The reflection is structured, reviewable and never added to your map without your approval.</p>
            </div>
          )}
          {conversationEvents.map((event) => {
            const record = conversationAnalyses.find((item) => item.id === event.analysisId);
            return (
              <div className={`message-row ${event.role}`} key={event.id}>
                <div className="message-avatar">{event.role === 'user' ? <User size={15} /> : <Bot size={15} />}</div>
                <div className="message-content">
                  <div className="message-meta">
                    <strong>{event.role === 'user' ? 'You' : 'Reflection companion'}</strong>
                    <span>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {event.fromTranscription && <span className="chip">voice transcription</span>}
                    {event.originalText && event.originalText !== event.text && <span className="chip">edited</span>}
                  </div>
                  {editingEvent === event.id ? (
                    <div className="message-edit">
                      <textarea value={eventDraft} onChange={(change) => setEventDraft(change.target.value)} rows={4} aria-label="Edit message" />
                      <div className="inline-actions"><button className="primary-button small" onClick={() => { updateEventText(event.id, eventDraft); setEditingEvent(null); }}>Save</button><button className="text-button" onClick={() => setEditingEvent(null)}>Cancel</button></div>
                    </div>
                  ) : (
                    <>
                      <p className="message-text">{event.text}</p>
                      <div className="message-actions">
                        <button className="text-button" onClick={() => { setEditingEvent(event.id); setEventDraft(event.text); }}><Edit3 size={11} /> Edit</button>
                        <button className="text-button" onClick={() => { if (window.confirm('Delete this message and its linked data?')) deleteEvent(event.id); }}><Trash2 size={11} /> Delete</button>
                      </div>
                    </>
                  )}
                  {record && <AnalysisCard record={record} events={events} />}
                </div>
              </div>
            );
          })}
          {streaming.active && (
            <div className="message-row assistant streaming-row">
              <div className="message-avatar"><Bot size={15} /></div>
              <div className="message-content"><div className="message-meta"><strong>Reflection companion</strong><span>{streaming.status || 'Working…'}</span></div><p className="message-text">{streaming.text || 'Preparing a structured reflection…'}</p></div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void send(transcriptFromVoice.current); } }}
            placeholder="What would you like to reflect on? Your original wording is preserved."
            aria-label="Reflection message"
            rows={3}
          />
          {error && <div className="composer-error" role="alert">{error}</div>}
          <div className="composer-actions">
            <button className={`icon-button ${recording ? 'recording' : ''}`} onClick={toggleVoice} title={recording ? 'Stop voice input' : 'Start voice input'} aria-label={recording ? 'Stop voice input' : 'Start voice input'}>{recording ? <MicOff size={16} /> : <Mic size={16} />}</button>
            <span className="composer-hint">{recording ? 'Listening… press again to stop' : 'Cmd/Ctrl + Enter to send'}</span>
            <button className="primary-button" onClick={() => void send(transcriptFromVoice.current)} disabled={!draft.trim() || streaming.active || !settings.aiConsent}><Send size={14} /> Send</button>
          </div>
        </div>
      </section>

      <aside className="conversation-context-panel">
        <div className="panel-kicker">PRIVACY CONTROLS</div>
        <div className="panel-heading">Shared context</div>
        <p className="panel-copy">Nothing leaves this device unless you enable AI consent. Even then, only the toggles below are included in a request.</p>
        <label className="toggle-row"><input type="checkbox" checked={settings.contextSharing.approvedNodes} onChange={(event) => useConversationStore.getState().setSettings({ contextSharing: { ...settings.contextSharing, approvedNodes: event.target.checked } })} /><span><strong>Approved map nodes</strong><small>{context.approvedNodes.length} selected/core node(s), {context.approvedEdges.length} link(s)</small></span></label>
        <label className="toggle-row"><input type="checkbox" checked={settings.contextSharing.recentEvents} onChange={(event) => useConversationStore.getState().setSettings({ contextSharing: { ...settings.contextSharing, recentEvents: event.target.checked } })} /><span><strong>Recent reflections</strong><small>{context.recentEvents.length} recent event(s)</small></span></label>
        <div className="panel-separator" />
        <div className="panel-kicker">PROVIDER</div>
        <p className="panel-copy">{activeProvider?.note ?? 'Offline analysis runs locally with no network calls.'}</p>
        <button className="text-button" onClick={() => setWorkspace('settings')}>Configure in Settings →</button>
        <div className="panel-separator" />
        <div className="panel-kicker">GUARDRAILS</div>
        <ul className="guardrail-list">
          <li>Original wording is stored separately from interpretations.</li>
          <li>Intensity is only shown when you stated it.</li>
          <li>Pattern labels are hypotheses, never diagnoses.</li>
          <li>Graph changes require explicit review.</li>
          <li>No biological readings or hidden memories are inferred.</li>
        </ul>
      </aside>
    </div>
  );
}
