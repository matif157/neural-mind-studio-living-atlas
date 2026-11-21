import type { MindNodeKind, SensitivityLevel } from '@shared/domain';

export interface PrivacyView {
  revealSensitive: boolean;
  privateMode: boolean;
  hiddenKinds: MindNodeKind[];
}

/** Minimal shape accepted by every view: 2D nodes, 3D nodes and focused workspace records. */
export interface PrivacyNode {
  data: {
    label: string;
    kind: MindNodeKind;
    sensitivity?: SensitivityLevel;
  };
}

export function sensitivityOf(node: PrivacyNode): SensitivityLevel {
  const value = node.data.sensitivity;
  if (value === 'standard' || value === 'private' || value === 'sensitive' || value === 'restricted') return value;
  return node.data.kind === 'thought' ? 'private' : 'standard';
}

/**
 * Single visibility rule shared by the 2D atlas, 3D scene and focused workspaces.
 * Restricted records and hidden categories are absent; private content is either masked
 * or, in private mode, withheld entirely. Masking is not encryption.
 */
export function isNodeDisplayable(node: PrivacyNode, view: PrivacyView): boolean {
  const level = sensitivityOf(node);
  if (level === 'restricted') return false;
  if (view.hiddenKinds.includes(node.data.kind)) return false;
  if (view.privateMode && level !== 'standard') return false;
  return true;
}

export function isNodeMasked(node: PrivacyNode, view: PrivacyView): boolean {
  if (!isNodeDisplayable(node, view)) return false;
  const level = sensitivityOf(node);
  return (level === 'private' || level === 'sensitive') && !view.revealSensitive;
}

export function displayLabel(node: PrivacyNode, view: PrivacyView): string {
  return isNodeMasked(node, view) ? 'Private concept' : node.data.label;
}
