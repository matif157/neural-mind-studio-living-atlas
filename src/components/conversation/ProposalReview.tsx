import { useMemo, useState } from 'react';
import { Check, Pencil, ShieldQuestion, X } from 'lucide-react';
import { useConversationStore, type ProposalRecord } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { useUiStore } from '../../store/uiStore';

interface Props { analysisId: string; eventId: string; createdAt: string }

export default function ProposalReview({ analysisId, eventId, createdAt }: Props) {
  const proposals = useConversationStore((state) => state.proposals);
  const setProposalStatus = useConversationStore((state) => state.setProposalStatus);
  const setProposalPayload = useConversationStore((state) => state.setProposalPayload);
  const applyProposals = useMindStore((state) => state.applyProposals);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const relevant = useMemo(() => proposals.filter((item) => item.analysisId === analysisId), [proposals, analysisId]);
  const pending = relevant.filter((item) => item.status === 'pending' || item.status === 'edited');
  const nodes = pending.filter((item) => item.payload.type === 'node');
  const edges = pending.filter((item) => item.payload.type === 'edge');
  if (!relevant.length) return null;

  const acceptAll = () => {
    const nodeValues = nodes.map((item) => (item.payload as Extract<ProposalRecord['payload'], { type: 'node' }>).value);
    const edgeValues = edges.map((item) => (item.payload as Extract<ProposalRecord['payload'], { type: 'edge' }>).value);
    applyProposals({ nodes: nodeValues, edges: edgeValues, eventId, date: createdAt });
    relevant.forEach((item) => setProposalStatus(item.id, 'accepted'));
    setWorkspace('atlas');
  };

  const acceptNode = (proposal: ProposalRecord) => {
    if (proposal.payload.type !== 'node') return;
    applyProposals({ nodes: [proposal.payload.value], edges: [], eventId, date: createdAt });
    setProposalStatus(proposal.id, 'accepted');
    setWorkspace('atlas');
  };

  const saveEdit = (proposal: ProposalRecord) => {
    if (proposal.payload.type !== 'node') return;
    setProposalPayload(proposal.id, {
      type: 'node',
      value: { ...proposal.payload.value, label, description },
    });
    setEditing(null);
  };

  return (
    <section className="proposal-review">
      <div className="proposal-head">
        <ShieldQuestion size={16} />
        <div>
          <strong>{pending.length ? 'Reviewable graph proposals' : 'Proposals reviewed'}</strong>
          <p>AI suggestions are never added silently. Accept to create draft nodes you can edit, confirm or remove.</p>
        </div>
      </div>
      {pending.length > 0 && (
        <div className="proposal-bulk">
          <button className="primary-button" onClick={acceptAll}>Accept all as drafts ({pending.length})</button>
          <button className="text-button" onClick={() => relevant.forEach((item) => setProposalStatus(item.id, 'rejected'))}>Reject all</button>
        </div>
      )}
      <div className="proposal-list">
        {relevant.map((proposal) => {
          if (proposal.payload.type === 'edge') {
            const value = proposal.payload.value;
            return (
              <div className={`proposal-row edge ${proposal.status}`} key={proposal.id}>
                <span className={`proposal-status ${proposal.status}`}>{proposal.status}</span>
                <span className="proposal-body"><strong>{value.source}</strong> → <strong>{value.target}</strong> · {value.relation}</span>
                <small>{value.explanation}</small>
              </div>
            );
          }
          const value = proposal.payload.value;
          return (
            <div className={`proposal-row ${proposal.status}`} key={proposal.id}>
              <span className={`proposal-status ${proposal.status}`}>{proposal.status}</span>
              <span className="proposal-body">
                <strong>{value.label}</strong>
                <small>{value.kind} · confidence {Math.round(value.confidence * 100)}% (interpretation only)</small>
                {value.evidence && <em>“{value.evidence}”</em>}
                {editing === proposal.id && (
                  <span className="proposal-edit">
                    <input value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Proposal label" />
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} aria-label="Proposal description" />
                  </span>
                )}
              </span>
              {proposal.status !== 'accepted' && proposal.status !== 'rejected' && (
                <span className="proposal-actions">
                  {editing === proposal.id ? (
                    <button onClick={() => saveEdit(proposal)}><Check size={14} /> Save</button>
                  ) : (
                    <button onClick={() => { setEditing(proposal.id); setLabel(value.label); setDescription(value.description); }}><Pencil size={14} /> Edit</button>
                  )}
                  <button onClick={() => acceptNode(proposal)}><Check size={14} /> Add</button>
                  <button onClick={() => setProposalStatus(proposal.id, 'rejected')}><X size={14} /> Reject</button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
