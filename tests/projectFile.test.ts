import { describe, expect, it } from 'vitest';
import { seedEdges, seedNodes } from '../src/data/seed';
import { scenarios } from '../src/data/scenarios';
import { createProjectFile, validateProjectFile } from '../src/utils/projectFile';
import { RELATIONS } from '../src/types/mind';

describe('starter mind graph', () => {
  it('has unique node and edge IDs', () => {
    expect(new Set(seedNodes.map((node) => node.id)).size).toBe(seedNodes.length);
    expect(new Set(seedEdges.map((edge) => edge.id)).size).toBe(seedEdges.length);
  });

  it('has no dangling edge endpoints', () => {
    const ids = new Set(seedNodes.map((node) => node.id));
    for (const edge of seedEdges) {
      expect(ids.has(edge.source), `missing source for ${edge.id}`).toBe(true);
      expect(ids.has(edge.target), `missing target for ${edge.id}`).toBe(true);
    }
  });

  it('uses declared relation types', () => {
    for (const edge of seedEdges) expect(RELATIONS).toContain(edge.data?.relation);
  });

  it('keeps every scenario focused on nodes that exist', () => {
    const ids = new Set(seedNodes.map((node) => node.id));
    for (const scenario of scenarios) {
      expect(scenario.nodeIds.length).toBeGreaterThan(0);
      for (const id of scenario.nodeIds) expect(ids.has(id), `${scenario.id} references missing node ${id}`).toBe(true);
    }
  });
});

describe('project file validation', () => {
  it('accepts a valid exported project', () => {
    const project = createProjectFile(seedNodes, seedEdges);
    expect(validateProjectFile(project)).toBe(true);
  });

  it('rejects dangling connections', () => {
    const project = createProjectFile(seedNodes, [...seedEdges, { ...seedEdges[0], id: 'bad-edge', target: 'missing-node' }]);
    expect(validateProjectFile(project)).toBe(false);
  });

  it('rejects duplicate node IDs', () => {
    const project = createProjectFile([...seedNodes, seedNodes[0]], seedEdges);
    expect(validateProjectFile(project)).toBe(false);
  });

  it('rejects non-finite node intensity', () => {
    const nodes = seedNodes.map((node, index) => index === 0 ? { ...node, data: { ...node.data, intensity: Number.NaN } } : node);
    expect(validateProjectFile(createProjectFile(nodes, seedEdges))).toBe(false);
  });

  it('rejects unsupported valence values', () => {
    const nodes = seedNodes.map((node, index) => index === 0 ? { ...node, data: { ...node.data, valence: 'extreme' as never } } : node);
    expect(validateProjectFile(createProjectFile(nodes, seedEdges))).toBe(false);
  });
});
