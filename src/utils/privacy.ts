import type { MindNodeKind, PrivacyLevel, SensitivityLevel } from '@shared/domain';

export interface PrivacyView {
  revealSensitive: boolean;
  /** 2D secure review only. The 3D atlas never sets this: restricted stays excluded there. */
  revealRestricted?: boolean;
  privateMode: boolean;
  hiddenKinds: MindNodeKind[];
}

/** Minimal shape accepted by every view: 2D nodes, 3D nodes and focused workspace records. */
export interface PrivacyNode {
  data: {
    label: string;
    kind: MindNodeKind;
    /** Original storage/sharing boundary. */
    privacy?: PrivacyLevel;
    /** v3 display classification. */
    sensitivity?: SensitivityLevel;
  };
}

/**
 * The app stores two privacy vocabularies for export compatibility: the
 * original `privacy` boundary and the v3 `sensitivity` level. Every view must
 * use the stricter of the two. `public`/`private` storage is the normal local
 * state and maps to `standard` display, so seed and new nodes stay visible.
 */
const PRIVACY_RANK: Record<PrivacyLevel, number> = {
  public: 0, private: 0, sensitive: 2, restricted: 3,
};
const SENSITIVITY_RANK: Record<SensitivityLevel, number> = {
  standard: 0, private: 1, sensitive: 2, restricted: 3,
};
const EFFECTIVE_ORDER: SensitivityLevel[] = ['standard', 'private', 'sensitive', 'restricted'];

export type EffectivePrivacy = SensitivityLevel;

export function effectivePrivacy(node: PrivacyNode): EffectivePrivacy {
  const privacy = PRIVACY_RANK[node.data.privacy ?? 'private'];
  const sensitivity = SENSITIVITY_RANK[node.data.sensitivity ?? (node.data.kind === 'thought' ? 'private' : 'standard')];
  return EFFECTIVE_ORDER[Math.max(privacy, sensitivity)];
}

/** One user-facing choice is written to both fields so exports stay compatible. */
export function privacyPatch(level: EffectivePrivacy): { privacy: PrivacyLevel; sensitivity: SensitivityLevel } {
  return {
    privacy: level === 'sensitive' || level === 'restricted' ? level : 'private',
    sensitivity: level,
  };
}

export function sensitivityOf(node: PrivacyNode): SensitivityLevel {
  return effectivePrivacy(node);
}

/**
 * Single visibility rule shared by the 2D atlas, 3D scene and focused workspaces.
 * Restricted records and hidden categories are absent; private content is either masked
 * or, in private mode, withheld entirely. Masking is not encryption.
 */
export function isNodeDisplayable(node: PrivacyNode, view: PrivacyView): boolean {
  const level = effectivePrivacy(node);
  if (level === 'restricted' && !view.revealRestricted) return false;
  if (view.hiddenKinds.includes(node.data.kind)) return false;
  if (view.privateMode && level !== 'standard') return false;
  return true;
}

export function isNodeMasked(node: PrivacyNode, view: PrivacyView): boolean {
  if (!isNodeDisplayable(node, view)) return false;
  const level = effectivePrivacy(node);
  return (level === 'private' || level === 'sensitive') && !view.revealSensitive;
}

export function displayLabel(node: PrivacyNode, view: PrivacyView): string {
  return isNodeMasked(node, view) ? 'Private concept' : node.data.label;
}
