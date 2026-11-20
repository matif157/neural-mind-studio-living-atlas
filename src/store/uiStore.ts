import { create } from 'zustand';
import type { GraphViewId, Provenance, WorkspaceId } from '@shared/domain';
import type { MindNodeKind } from '@shared/domain';

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
  selectedNodeId: string | null;
  contextMenu: ContextMenuState | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  showHistory: boolean;
  showShortcuts: boolean;
  setWorkspace: (workspace: WorkspaceId) => void;
  setGraphView: (view: GraphViewId) => void;
  setQuery: (query: string) => void;
  toggleKindFilter: (kind: MindNodeKind) => void;
  toggleProvenanceFilter: (provenance: Provenance) => void;
  clearFilters: () => void;
  setSelectedNode: (id: string | null) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  togglePanel: (panel: 'left' | 'right' | 'bottom' | 'history' | 'shortcuts') => void;
}

export const useUiStore = create<UiState>((set) => ({
  workspace: 'atlas',
  graphView: 'whole',
  query: '',
  kindFilter: [],
  provenanceFilter: [],
  selectedNodeId: null,
  contextMenu: null,
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: true,
  showHistory: false,
  showShortcuts: false,
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
  clearFilters: () => set({ kindFilter: [], provenanceFilter: [], query: '' }),
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
}));
