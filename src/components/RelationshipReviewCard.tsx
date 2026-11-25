import type { ReactNode } from 'react';
import type { RelationshipExplanation } from '../lib/mind3d';

interface RelationshipReviewCardProps {
  relationship: RelationshipExplanation;
  actions?: ReactNode;
}

/**
 * One presentation for every reviewable relationship in the app. The 2D
 * Inspector (also embedded in the full-bleed 3D workspace) and the accessible
 * universe both render this component, so source, destination, type, supporting
 * information, evidence class, explanation and confirmation status always look
 * the same. It is read-only; review actions are supplied by the caller.
 */
export default function RelationshipReviewCard({ relationship, actions }: RelationshipReviewCardProps) {
  return (
    <article className={`relationship-card ${relationship.confirmationStatus}`}>
      <div><strong>{relationship.source}</strong> → <strong>{relationship.destination}</strong></div>
      <small>
        {relationship.type} · {relationship.confirmationStatus} · {relationship.signalBearing ? 'signal-bearing' : 'excluded from signal'}
      </small>
      {relationship.explanation && <p>{relationship.explanation}</p>}
      {relationship.supportingInformation && <blockquote>“{relationship.supportingInformation}”</blockquote>}
      <small>Evidence class: {relationship.evidenceClass}</small>
      {relationship.structural && <small>Structural wire — organises the map but never carries signal.</small>}
      {actions && <div className="review-actions">{actions}</div>}
    </article>
  );
}
