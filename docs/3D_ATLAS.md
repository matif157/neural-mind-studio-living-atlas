# 3D Cognitive Universe

The 3D workspace is a second view of the **same canonical graph** as the 2D Mind Atlas. Both use the `useMindStore` Zustand store, so selection, edits and privacy settings stay synchronised. The 3D layer never maintains its own copy of the user's concepts.

## Three separate visual systems

| Mode | What it is | What it is not |
|---|---|---|
| **Mind** | A conceptual constellation of your nodes and links. Node kind determines the colour and anchor constellation. | Not a brain scan, not a measured neural network, not a biological location for a thought or emotion. |
| **Brain** | A stylised educational sculpture (`public/models/conceptual-brain.glb`) for orientation. | Not a validated anatomical reconstruction. No personal node is mapped onto it. |
| **Neuron** | An interactive teaching model: dendrites, soma, nucleus, axon, myelin, nodes of Ranvier, axon terminals, vesicles, synaptic cleft and receptors, with an illustrative signal animation. | Not a reading of your neurons. A graph edge is not a synapse. The "self" is not in the nucleus. |

The explanatory copy in every mode repeats these boundaries on screen.

## Layout and persistence

- `src/utils/mind3dLayout.ts` assigns a deterministic anchor for **every** node kind and distributes nodes of the same kind with a golden-angle spiral sorted by stable ID. Reloading does not reshuffle the constellation.
- A node's `data.spatial` value (x/y/z) overrides the generated anchor. Dragging a node in the 3D view calls `setNodeSpatial`, which writes the position into the **same graph node**. The 2D `position` is never touched.
- Positions persist through the normal graph export/import path because they live in the node data.
- Camera: drag to orbit, scroll to zoom, right-drag to pan. `FRONT`, `SIDE`, `TOP` and `ISO` provide readable reference angles for the conceptual sculpture. **Fit** returns to `ISO`; **Focus selected** pans to the selected concept. Pause, reset and fullscreen controls live in the bottom sheet so the canvas stays full-bleed.
- Layout modes: **Kind constellation** uses stored `spatial` positions, **Ten dimensions** clusters by each node's primary life lens, and **Life timeline** places records by the era you stated. Undated records stay separate; order never implies cause.
- Reduced motion stops idle drift, orbiting and signal particles. Manual rotate, zoom, focus and all editing actions remain available.

## Presentation and timeline

The conceptual map uses the same dark `#07090e` canvas and cyan-dominant sculpture as the reference presentation. A compact chip reports `N NODES · N LINKS`, and a permanent `CONCEPTUAL MAP · NOT A BRAIN SCAN` label distinguishes it from the educational brain and neuron layers. The bottom sheet exposes `Regions` (filters and privacy controls), `Details` (the shared inspector) and `Fit`, alongside `ALL TIME / 7 DAYS / 30 DAYS / 90 DAYS` timeline cards. Clicking a card selects the concept and focuses its position.

These are presentation choices only. Colour, brightness, layout and camera angle never encode diagnosis, severity, risk or biological measurement. Historical harmful thoughts are never converted into strengths, badges, scores or triumphant visuals.

## Search, filters and inspection

- Text search matches labels, descriptions, kinds and tags. Masked content is excluded from search results so a private label cannot be discovered by typing.
- Visual-layer presets (whole mind, emotions, thoughts, memories, patterns, body, beliefs, relationships, strengths, support) and per-node-class toggles filter the scene independently of the 2D views.
- Click a node or link to select it. The shared inspector opens for unmasked content, and the same selection is highlighted in 2D when you switch workspaces.
- **Open 2D graph editor** and **Open AI companion** in the footer switch workspaces without duplicating data.

## Privacy behaviour

Four levels are defined in `shared/domain.ts`:

| Level | Standard 2D/3D behaviour |
|---|---|
| `standard` | Visible. |
| `private` | Content masked until revealed for the current session. |
| `sensitive` | Content masked until revealed for the current session. |
| `restricted` | Excluded from standard 2D/3D views entirely. |

- New thoughts default to `private`; imported concepts take the stricter of the document level and the kind default.
- Revealing private content requires an explicit confirmation and applies only to the current session. Hiding it again also clears selections that would expose it.
- Masked nodes keep a neutral placeholder shape so the overall structure stays legible. Relationships touching masked content are withheld, because their existence could reveal the hidden concept.
- **Visual masking is not encryption.** Data remains readable in local storage and in exported project files. Use OS-level disk encryption and a private screen when working with sensitive material.

## Technical notes

- React Three Fiber v8 + Three.js, with `OrbitControls` and the `GLTFLoader` from `three/addons`.
- The scene uses a `Canvas` fallback message when WebGL is unavailable; the 2D editor remains fully usable.
- The brain asset is served from `public/models/` and is a decorative educational sculpture, not patient data.
- The 3D scene is bundled into the main JS chunk; see `docs/TEST_REPORT.md` for the known bundle-size limitation.
