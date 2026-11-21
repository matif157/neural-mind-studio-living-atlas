// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MindNodeKind } from '@shared/domain';
import BrainAnatomy3D from '../src/components/BrainAnatomy3D';
import CognitiveUniverse3D from '../src/components/CognitiveUniverse3D';
import Inspector from '../src/components/Inspector';
import MindCanvas from '../src/components/MindCanvas';
import { filterGraphFor3D, isSignalEdge } from '../src/lib/mind3d';
import { useMindStore } from '../src/store/mindStore';
import { useUiStore } from '../src/store/uiStore';
import type { MindEdge, MindEdgeData, MindNode, MindNodeData } from '../src/types/mind';

function makeNode(
  id: string,
  kind: MindNodeKind = 'thought',
  label = id,
  patch: Partial<MindNodeData> = {},
): MindNode {
  return {
    id,
    type: 'mind',
    position: { x: 100, y: 100 },
    data: {
      label,
      kind,
      description: '',
      innerVoice: '',
      balancedVoice: '',
      intensity: null,
      valence: 'neutral',
      tags: [],
      isCore: false,
      provenance: 'user-confirmed',
      status: 'active',
      confidence: null,
      evidence: [],
      collapsed: false,
      locked: false,
      isGroup: false,
      privacy: 'private',
      safetySignal: false,
      sensitivity: 'standard',
      spatial: null,
      ...patch,
    },
  };
}

function makeEdge(id: string, source: string, target: string, patch: Partial<MindEdgeData> = {}): MindEdge {
  return {
    id,
    source,
    target,
    type: 'neural',
    animated: false,
    data: {
      relation: 'associated with',
      weight: 0.6,
      signal: true,
      direction: 'forward',
      provenance: 'user-confirmed',
      confidence: null,
      structural: false,
      review: 'confirmed',
      evidence: [],
      approval: 'approved',
      ...patch,
    },
  };
}

function resetStores(nodes: MindNode[] = [], edges: MindEdge[] = []) {
  useMindStore.setState({
    nodes,
    edges,
    past: [],
    future: [],
    simulationRunning: false,
    customCategories: [],
    customRelations: [],
  });
  useUiStore.setState({
    workspace: 'universe',
    graphView: 'whole',
    query: '',
    kindFilter: [],
    provenanceFilter: [],
    dimensionFilter: 'all',
    secureView: false,
    selectedNodeId: null,
    contextMenu: null,
    leftCollapsed: false,
    rightCollapsed: false,
    bottomCollapsed: true,
    showHistory: false,
    showShortcuts: false,
    selectedExerciseId: 'thought-record',
  });
}

beforeEach(() => {
  // WebGL is deliberately unavailable: every test exercises the accessible fallback.
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  });
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
  globalThis.requestAnimationFrame = vi.fn(() => 1) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  resetStores();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('rendered personal mind atlas', () => {
  it('renders all ten personal dimensions and the educational boundary', () => {
    render(<CognitiveUniverse3D />);
    expect(screen.getByTestId('cognitive-universe')).toBeTruthy();
    for (const label of [
      'Timeline', 'Memories', 'Thoughts', 'Emotions', 'Body',
      'Behaviour', 'Relationships', 'Imagination', 'Strengths', 'Decisions',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByText(/not a brain scan/)).toBeTruthy();
  });

  it('falls back to an accessible node list when WebGL is unavailable', () => {
    resetStores([
      makeNode('n1', 'thought', 'Visible thought'),
      makeNode('n2', 'memory', 'Remembered event'),
    ]);
    render(<CognitiveUniverse3D />);
    expect(screen.getByText(/3D rendering unavailable here/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Visible thought' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remembered event' })).toBeTruthy();
  });

  it('hides sensitive nodes from ordinary 3D exploration and relationship filtering', () => {
    const nodes = [
      makeNode('safe', 'thought', 'Open thought'),
      makeNode('secret', 'emotion', 'PRIVATE_WORDING', { privacy: 'sensitive' }),
    ];
    const edges = [makeEdge('e1', 'safe', 'secret')];
    resetStores(nodes, edges);
    render(<CognitiveUniverse3D />);
    expect(document.body.textContent).not.toContain('PRIVATE_WORDING');
    expect(screen.getByText(/1 protected entry is hidden/)).toBeTruthy();
    const graph = filterGraphFor3D(nodes, edges, {});
    expect(graph.nodes.map((node) => node.id)).toEqual(['safe']);
    expect(graph.edges).toHaveLength(0);
  });

  it('honours sensitivity-restricted records in the accessible 3D universe', () => {
    // Imported records can carry sensitivity: 'restricted' while privacy stays
    // at the store default. Both vocabularies must gate ordinary exploration.
    const nodes = [
      makeNode('safe', 'thought', 'Visible thought'),
      makeNode('imported', 'memory', 'RESTRICTED_IMPORT_WORDING', { sensitivity: 'restricted' }),
    ];
    resetStores(nodes);
    render(<CognitiveUniverse3D />);
    expect(document.body.textContent).not.toContain('RESTRICTED_IMPORT_WORDING');
    const graph = filterGraphFor3D(nodes, [], {});
    expect(graph.nodes.map((node) => node.id)).toEqual(['safe']);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal protected entries' }));
    expect(screen.getByRole('button', { name: 'RESTRICTED_IMPORT_WORDING' })).toBeTruthy();
  });

  it('reveals protected entries only when secure view is enabled', () => {
    resetStores([makeNode('secret', 'emotion', 'PRIVATE_WORDING', { privacy: 'restricted' })]);
    render(<CognitiveUniverse3D />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal protected entries' }));
    expect(useUiStore.getState().secureView).toBe(true);
    expect(screen.getByRole('button', { name: 'PRIVATE_WORDING' })).toBeTruthy();
  });

  it('searches the universe without changing the stored graph', () => {
    resetStores([
      makeNode('a', 'thought', 'Alpha thought'),
      makeNode('b', 'emotion', 'Beta feeling'),
    ]);
    render(<CognitiveUniverse3D />);
    fireEvent.change(screen.getByLabelText('Search 3D universe'), { target: { value: 'Beta' } });
    expect(screen.getByRole('button', { name: 'Beta feeling' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Alpha thought' })).toBeNull();
    expect(useMindStore.getState().nodes).toHaveLength(2);
  });

  it('filters the universe by personal dimension', () => {
    resetStores([
      makeNode('a', 'emotion', 'Only emotion'),
      makeNode('b', 'body', 'Only body'),
    ]);
    render(<CognitiveUniverse3D />);
    fireEvent.click(screen.getByRole('button', { name: 'Emotions' }));
    expect(useUiStore.getState().dimensionFilter).toBe('emotion');
    expect(screen.getByRole('button', { name: 'Only emotion' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Only body' })).toBeNull();
  });

  it('exposes camera presets and focus controls', () => {
    render(<CognitiveUniverse3D />);
    const front = screen.getByRole('button', { name: 'FRONT' });
    fireEvent.click(front);
    expect(front.className).toContain('active');
    expect(screen.getByRole('button', { name: 'Focus selected node' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fit whole universe' })).toBeTruthy();
  });

  it('syncs selection between the accessible list and the shared UI store', () => {
    resetStores([makeNode('a', 'thought', 'Chosen thought')]);
    render(<CognitiveUniverse3D />);
    fireEvent.click(screen.getByRole('button', { name: 'Chosen thought' }));
    expect(useUiStore.getState().selectedNodeId).toBe('a');
    expect(screen.getAllByText('Chosen thought').length).toBeGreaterThan(1);
  });

  it('presents every reviewable field for a discovered relationship', () => {
    resetStores(
      [makeNode('a', 'thought', 'Trigger thought'), makeNode('b', 'emotion', 'Result feeling')],
      [makeEdge('e1', 'a', 'b', {
        relation: 'may indicate',
        explanation: 'Keyword overlap only; review before keeping.',
        evidence: [{ eventId: 'event-1', excerpt: 'exact supporting words', date: '2026-11-20' }],
        provenance: 'ai-suggested',
        review: 'suggested',
      })],
    );
    useUiStore.setState({ selectedNodeId: 'a' });
    render(<CognitiveUniverse3D />);
    const card = document.querySelector('.relationship-card') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Trigger thought');
    expect(card.textContent).toContain('Result feeling');
    expect(card.textContent).toContain('may indicate');
    expect(card.textContent).toContain('exact supporting words');
    expect(card.textContent).toContain('Evidence class: ai-suggested');
    expect(card.textContent).toContain('suggested');
  });

  it('keeps suggested and structural relationships out of signal propagation', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const suggested = makeEdge('s', 'a', 'b', { review: 'suggested' });
    const structural = makeEdge('t', 'b', 'c', { structural: true });
    const confirmed = makeEdge('c', 'a', 'c');
    const graph = filterGraphFor3D(nodes, [suggested, structural, confirmed], {});
    expect(isSignalEdge(suggested)).toBe(false);
    expect(isSignalEdge(structural)).toBe(false);
    expect(isSignalEdge(confirmed)).toBe(true);
    expect(graph.signalEdges.map((edge) => edge.id)).toEqual(['c']);

    resetStores(nodes, [suggested]);
    useUiStore.setState({ selectedNodeId: 'a' });
    render(<CognitiveUniverse3D />);
    expect(screen.getByText(/excluded from signal/)).toBeTruthy();
  });

  it('does not leak protected wording into the 2D map', () => {
    resetStores([makeNode('secret', 'emotion', 'PRIVATE_2D_WORDING', { privacy: 'restricted' })]);
    render(<MindCanvas onFitRef={() => undefined} />);
    expect(document.body.textContent).not.toContain('PRIVATE_2D_WORDING');
    fireEvent.click(screen.getByRole('button', { name: 'Secure view off' }));
    expect(document.body.textContent).toContain('PRIVATE_2D_WORDING');
  });

  it('applies the shared dimension filter to the 2D map', () => {
    resetStores([
      makeNode('body', 'body', 'Body signal only'),
      makeNode('emo', 'emotion', 'Emotion only'),
    ]);
    useUiStore.setState({ dimensionFilter: 'body' });
    render(<MindCanvas onFitRef={() => undefined} />);
    expect(document.body.textContent).toContain('Body signal only');
    expect(document.body.textContent).not.toContain('Emotion only');
  });

  it('keeps the Inspector in sync with the 2D selection', () => {
    resetStores([makeNode('a', 'thought', 'Two view thought')]);
    useUiStore.setState({ selectedNodeId: 'a' });
    render(<MindCanvas onFitRef={() => undefined} />);
    const inspector = document.querySelector('.inspector-panel') as HTMLElement;
    expect(inspector.textContent).toContain('Node inspector');
    expect((inspector.querySelector('input.field-control') as HTMLInputElement).value).toBe('Two view thought');
    expect(inspector.textContent).toContain('Primary dimension');
    expect(inspector.textContent).toContain('Privacy boundary');
  });

  it('gates protected entries in the Inspector by default', () => {
    const node = makeNode('s', 'emotion', 'SECRET_INSPECTOR', { privacy: 'sensitive' });
    resetStores([node]);
    render(<Inspector selectedNode={node} selectedEdge={null} />);
    expect(screen.getByTestId('privacy-gate')).toBeTruthy();
    expect(document.body.textContent).not.toContain('SECRET_INSPECTOR');
    expect(screen.getByText('Sensitive entry hidden')).toBeTruthy();
  });

  it('opens secure review from the Inspector privacy gate', () => {
    const node = makeNode('s', 'emotion', 'SECRET_INSPECTOR', { privacy: 'sensitive' });
    resetStores([node]);
    render(<Inspector selectedNode={node} selectedEdge={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable secure view to review' }));
    expect(useUiStore.getState().secureView).toBe(true);
    expect((document.querySelector('.inspector-panel input.field-control') as HTMLInputElement).value).toBe('SECRET_INSPECTOR');
  });

  it('offers confirm, correct and reject for a suggested relationship', () => {
    const edge = makeEdge('e', 'a', 'b', {
      review: 'suggested',
      explanation: 'Proposed by offline analysis.',
    });
    resetStores([makeNode('a'), makeNode('b')], [edge]);
    render(<Inspector selectedNode={null} selectedEdge={edge} />);
    expect(screen.getByTestId('relationship-review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Correct' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
    expect(document.body.textContent).toContain('Proposed by offline analysis.');
  });

  it('promotes a confirmed relationship to a signal-bearing link', () => {
    const edge = makeEdge('e', 'a', 'b', { review: 'suggested', provenance: 'ai-suggested' });
    resetStores([makeNode('a'), makeNode('b')], [edge]);
    render(<Inspector selectedNode={null} selectedEdge={edge} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    const updated = useMindStore.getState().edges.find((item) => item.id === 'e');
    expect(updated?.data?.review).toBe('confirmed');
    expect(updated?.data?.signal).toBe(true);
    expect(updated?.data?.provenance).toBe('user-confirmed');
  });

  it('removes a rejected relationship suggestion from the graph', () => {
    const edge = makeEdge('e', 'a', 'b', { review: 'suggested' });
    resetStores([makeNode('a'), makeNode('b')], [edge]);
    render(<Inspector selectedNode={null} selectedEdge={edge} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(useMindStore.getState().edges.find((item) => item.id === 'e')).toBeUndefined();
  });

  it('keeps 2D and 3D positions independent until explicitly synced', () => {
    const node = makeNode('a', 'thought', 'Positioned thought');
    const original = { ...node.position };
    resetStores([node]);
    useUiStore.setState({ selectedNodeId: 'a' });
    render(<CognitiveUniverse3D />);
    fireEvent.click(screen.getByRole('button', { name: /Keep 3D position/ }));
    const afterKeep = useMindStore.getState().nodes[0];
    expect(afterKeep.data.pos3).toBeTruthy();
    expect(afterKeep.position).toEqual(original);
    fireEvent.click(screen.getByRole('button', { name: /Explicitly sync to 2D/ }));
    const afterSync = useMindStore.getState().nodes[0];
    expect(afterSync.position.x).toBeCloseTo(afterSync.data.pos3!.x * 60);
    expect(afterSync.position.y).toBeCloseTo(afterSync.data.pos3!.z * 60);
  });

  it('renders a large personal graph without losing nodes', () => {
    const nodes = Array.from({ length: 300 }, (_, index) => makeNode(`n${index}`, 'thought', `Thought ${index}`));
    resetStores(nodes);
    const start = performance.now();
    render(<CognitiveUniverse3D />);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(3000);
    expect(screen.getByText('300/300 nodes')).toBeTruthy();
  });

  it('keeps the educational brain model accessible on a narrow screen', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    try {
      render(<BrainAnatomy3D onClose={() => undefined} />);
      expect(screen.getByRole('dialog', { name: 'Anatomical brain model' })).toBeTruthy();
      for (const part of ['Cerebral hemispheres', 'Longitudinal fissure', 'Cerebellum', 'Brainstem']) {
        expect(screen.getByRole('button', { name: part })).toBeTruthy();
      }
      expect(screen.getByText(/not a scan/)).toBeTruthy();
      expect(screen.getByText(/Labelled anatomy view/)).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('disposes 3D surfaces on unmount without leaving canvases behind', () => {
    const view = render(
      <>
        <CognitiveUniverse3D />
        <BrainAnatomy3D onClose={() => undefined} />
      </>,
    );
    expect(document.querySelectorAll('canvas')).toHaveLength(0);
    view.unmount();
    expect(document.querySelector('[data-testid="cognitive-universe"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelectorAll('canvas')).toHaveLength(0);
  });
});
