import { NODE_META, RELATIONS, type MindProjectFile } from '../types/mind';

export function createProjectFile(nodes: MindProjectFile['nodes'], edges: MindProjectFile['edges']): MindProjectFile {
  return { app: 'neural-mind-studio', schemaVersion: 1, exportedAt: new Date().toISOString(), nodes, edges };
}

export function validateProjectFile(value: unknown): value is MindProjectFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.app !== 'neural-mind-studio' || candidate.schemaVersion !== 1) return false;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return false;
  const ids = new Set<string>();
  const validKinds = new Set(Object.keys(NODE_META));
  for (const node of candidate.nodes) {
    if (!node || typeof node !== 'object') return false;
    const item = node as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) return false;
    if (item.type !== 'mind' || !item.position || typeof item.position !== 'object' || !item.data || typeof item.data !== 'object') return false;
    const position = item.position as Record<string, unknown>;
    const data = item.data as Record<string, unknown>;
    if (typeof position.x !== 'number' || !Number.isFinite(position.x) || typeof position.y !== 'number' || !Number.isFinite(position.y)) return false;
    if (typeof data.label !== 'string' || !data.label.trim() || typeof data.kind !== 'string' || !validKinds.has(data.kind)) return false;
    if (typeof data.description !== 'string' || typeof data.innerVoice !== 'string' || typeof data.balancedVoice !== 'string') return false;
    if (typeof data.intensity !== 'number' || !Number.isFinite(data.intensity) || data.intensity < 0 || data.intensity > 1 || !Array.isArray(data.tags)) return false;
    if (!['positive', 'negative', 'mixed', 'neutral'].includes(String(data.valence))) return false;
    if (!data.tags.every((tag) => typeof tag === 'string')) return false;
    ids.add(item.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of candidate.edges) {
    if (!edge || typeof edge !== 'object') return false;
    const item = edge as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || edgeIds.has(item.id)) return false;
    if (item.type !== 'neural' || typeof item.source !== 'string' || typeof item.target !== 'string') return false;
    if (!ids.has(item.source) || !ids.has(item.target) || item.source === item.target) return false;
    if (!item.data || typeof item.data !== 'object') return false;
    const data = item.data as Record<string, unknown>;
    if (typeof data.relation !== 'string' || !(RELATIONS as string[]).includes(data.relation)) return false;
    if (typeof data.weight !== 'number' || !Number.isFinite(data.weight) || data.weight < 0 || data.weight > 1) return false;
    edgeIds.add(item.id);
  }
  return true;
}

export function downloadProjectFile(file: MindProjectFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `neural-mind-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
