# Neural Mind Studio

A modular, editable mind-map and conceptual neural-network workspace. This is a full React + TypeScript application, not a single-file HTML demo.

## What it is

Neural Mind Studio lets you build a personal, editable graph connecting emotions, thoughts, memories, cognitive patterns, needs, body signals, behaviours, triggers, beliefs and context. Nodes are colour-coded; connections represent relationships that you define. The application includes a neuron anatomy explainer, example pathways, an editable relationship inspector, local autosave and portable project JSON.

It is an educational and reflective visualization tool. It is **not** a biological connectome, direct brain-activity measurement, mind reader, psychological diagnosis or clinical assessment tool. Emotion colours and conceptual edges are explanatory design choices, not literal mappings to individual neurons or fixed brain regions.

## Requirements

- Node.js 22.12+ (recommended)
- npm 10+

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`). On macOS/Linux you can also run `./start-mac-linux.sh`; on Windows use `start-windows.bat`.

## Build

```bash
npm run build
npm run preview
```

## Editing the mind graph

- Add nodes from the left palette.
- Select a node to edit its type, label, description, inner voice, balanced voice, intensity, valence and tags in the inspector.
- Drag nodes to move them. Hold Shift while dragging on the canvas to select an area; hold Shift while clicking to multi-select.
- Drag from a node handle to another node to create a synaptic relationship.
- Select a connection to edit its relationship type, weight and explanatory note.
- Delete selected nodes or edges with Delete/Backspace.
- Use Cut, Copy, Paste and Duplicate in the toolbar or keyboard shortcuts.
- Undo/Redo works for graph edits, node moves, paste and delete operations.
- The map autosaves to local browser storage. Export JSON for backups or to move the graph to another device; import a compatible project JSON to restore it.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y | Redo |
| Ctrl/Cmd + C | Copy selected nodes and internal connections |
| Ctrl/Cmd + X | Cut selected nodes and internal connections |
| Ctrl/Cmd + V | Paste selection |
| Ctrl/Cmd + D | Duplicate selection |
| Delete / Backspace | Delete selected graph elements |
| Escape | Clear active scenario focus |

## Project structure

```text
src/
  components/   Custom neuron nodes, synapse edges, palette, inspector, anatomy modal, canvas, toolbar
  data/         Starter graph and pathway examples
  store/        Graph editing state, clipboard, history and project operations
  types/        Node kinds, relationship types and typed project format
  utils/        Portable project export/import validation
  App.tsx       Application shell, local autosave and keyboard shortcuts
  styles.css    Visual system and responsive layout
```

## Extending the model

1. Add new node kinds in `src/types/mind.ts` and define their colour, tint and icon metadata in `NODE_META`.
2. Add the matching node icon in `MindNeuronNode.tsx` and `Palette.tsx`.
3. Add starter nodes and edges in `src/data/seed.ts` or build an import JSON file.
4. Add new relationship types to `MindRelation` and `RELATIONS`.
5. Add a scenario in `src/data/scenarios.ts`; its `nodeIds` must refer to existing graph nodes.

## Data and privacy

The app has no backend and sends no graph data to a server. Autosave uses this browser's localStorage. Exported JSON is stored wherever you choose to save it. Avoid entering sensitive personal, medical or third-party information on a shared device.

## Verification

Run the included graph and import validation tests with:

```bash
npm test
```
