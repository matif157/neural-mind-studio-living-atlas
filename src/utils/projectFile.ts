import { mindEdgeSchema, mindNodeSchema, projectFileSchema, type ProjectFile } from '@shared/schemas';
import { SCHEMA_VERSION } from '@shared/domain';
import type { MindEdge, MindNode } from '../types/mind';

export type { ProjectFile };

export function createProjectFile(
  nodes: MindNode[],
  edges: MindEdge[],
  meta?: ProjectFile['meta'],
): ProjectFile {
  return {
    app: 'neural-mind-studio',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes: nodes.map((node) => mindNodeSchema.safeParse(node).data ?? (node as ProjectFile['nodes'][number])),
    edges: edges.map((edge) => mindEdgeSchema.safeParse(edge).data ?? (edge as ProjectFile['edges'][number])),
    meta: meta ? { ...meta, customCategories: meta.customCategories ?? [], customRelations: meta.customRelations ?? [] } : undefined,
  };
}

export function validateProjectFile(value: unknown): value is ProjectFile {
  return projectFileSchema.safeParse(value).success;
}

/** Import v1 exports from the original Neural Mind Studio without losing data. */
export function migrateProjectFile(value: unknown): ProjectFile | null {
  if (validateProjectFile(value)) return projectFileSchema.parse(value);
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (source.app !== 'neural-mind-studio' || source.schemaVersion !== 1) return null;
  if (!Array.isArray(source.nodes) || !Array.isArray(source.edges)) return null;

  const nodes = source.nodes.map((raw) => {
    const item = raw as Record<string, unknown>;
    const data = (item.data ?? {}) as Record<string, unknown>;
    return mindNodeSchema.parse({
      ...item,
      type: 'mind',
      data: {
        ...data,
        provenance: 'user-confirmed',
        status: 'active',
        confidence: null,
        evidence: [],
        innerVoice: data.innerVoice ?? '',
        balancedVoice: data.balancedVoice ?? '',
        tags: data.tags ?? [],
        isCore: data.isCore ?? false,
        collapsed: false,
        locked: false,
      },
    });
  });
  const edges = source.edges.map((raw) => {
    const item = raw as Record<string, unknown>;
    const data = (item.data ?? {}) as Record<string, unknown>;
    return mindEdgeSchema.parse({
      ...item,
      type: 'neural',
      data: {
        ...data,
        direction: 'forward',
        provenance: 'user-confirmed',
        confidence: null,
        signal: data.signal ?? true,
      },
    });
  });
  const result = projectFileSchema.safeParse({
    app: 'neural-mind-studio',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    meta: { title: 'Migrated from v1' },
  });
  return result.success ? result.data : null;
}

export function downloadProjectFile(file: ProjectFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `neural-mind-atlas-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
