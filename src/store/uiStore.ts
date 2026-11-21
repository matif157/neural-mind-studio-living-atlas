import { create } from 'zustand';
import type { GraphViewId, Provenance, WorkspaceId } from '@shared/domain';
import type { MindNodeKind } from '@shared/domain';
import type { PersonalDimensionId } from '@shared/dimensions';

interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
}

interface UiState {
  workspace: WorkspaceId;
  graphView: GraphViewId;
  query: string;
  kindFilter: MindNodeKind[];
  provenanceFilter: Provenance[];
  dimensionFilter: PersonalDimensionId | 'all';
  secureView: boolean;
  selectedNodeId: string | null;
  contextMenu: ContextMenuState | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  showHistory: boolean;
  showShortcuts: boolean;
  selectedExerciseId: string;
  setWorkspace: (workspace: WorkspaceId) => void;
  setGraphView: (view: GraphViewId) => void;
  setQuery: (query: string) => void;
  toggleKindFilter: (kind: MindNodeKind) => void;
  toggleProvenanceFilter: (provenance: Provenance) => void;
  setDimensionFilter: (dimension: PersonalDimensionId | 'all') => void;
  toggleSecureView: () => void;
  clearFilters: () => void;
  setSelectedNode: (id: string | null) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  togglePanel: (panel: 'left' | 'right' | 'bottom' | 'history' | 'shortcuts') => void;
  setSelectedExercise: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  workspace: 'atlas',
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
  setWorkspace: (workspace) => set({ workspace }),
  setGraphView: (graphView) => set({ graphView }),
  setQuery: (query) => set({ query }),
  toggleKindFilter: (kind) => set((state) => ({
    kindFilter: state.kindFilter.includes(kind) ? state.kindFilter.filter((item) => item !== kind) : [...state.kindFilter, kind],
  })),
  toggleProvenanceFilter: (provenance) => set((state) => ({
    provenanceFilter: state.provenanceFilter.includes(provenance)
      ? state.provenanceFilter.filter((item) => item !== provenance)
      : [...state.provenanceFilter, provenance],
  })),
  setDimensionFilter: (dimensionFilter) => set({ dimensionFilter }),
  toggleSecureView: () => set((state) => ({ secureView: !state.secureView })),
  clearFilters: () => set({ kindFilter: [], provenanceFilter: [], query: '', dimensionFilter: 'all' }),
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId }),
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
  togglePanel: (panel) => set((state) => {
    if (panel === 'left') return { leftCollapsed: !state.leftCollapsed };
    if (panel === 'right') return { rightCollapsed: !state.rightCollapsed };
    if (panel === 'bottom') return { bottomCollapsed: !state.bottomCollapsed };
    if (panel === 'history') return { showHistory: !state.showHistory };
    return { showShortcuts: !state.showShortcuts };
  }),
  setSelectedExercise: (selectedExerciseId) => set({ selectedExerciseId }),
}));
