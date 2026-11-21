# Verification report

Date: 2026-11-21  
Branch: `living-atlas-v3`  
Repository: `matif157/neural-mind-studio-living-atlas`

This report records verification for the current build: the 2D/3D integrated release with the safety gate and private history importer. The application is local-first and can run without a model provider; browser checks used the built-in `offline` provider.

## Automated checks

Run from the project root:

```bash
npm run check
```

The command runs, in order:

1. `npm run typecheck` (`tsc --noEmit`)
2. `npm test` (`vitest run`)
3. `npm run build` (`tsc --noEmit && vite build`)

Result: **pass**.

| Check | Result |
|---|---|
| TypeScript typecheck | Passed with no errors |
| Vitest suite | **61 tests passed across 5 files** |
| Production Vite build | Passed (1,655 modules transformed) |
| Vite output | One non-blocking chunk-size warning |

### Test files

| File | Coverage |
|---|---|
| `tests/api.test.ts` | API contract, strict Zod validation and authentication/rate-limit behaviour. |
| `tests/projectFile.test.ts` | v2 export validation, safe parsing and migration of v1 project files. |
| `tests/patterns.test.ts` | Descriptive, provenance-aware longitudinal pattern utilities. |
| `tests/safety.test.ts` | 17 tests: direct intent, plans and means, harm to others, false-positive control, denials, historical disclosure, medical red flags, diagnostic-language detection and the API gate's no-provider/no-proposal guarantee. |
| `tests/historyImport.test.ts` | 20 tests: exact offsets, segmentation formats, chronology rules, inflection-aware candidate extraction, approval-only graph mutation, stricter privacy inheritance, restricted-node exclusion, rejection and a clean public seed graph. |

The suite asserts that no high/medium/low risk label or risk score is emitted, that AI output never silently mutates the graph, and that imported personal history is never written into seed data.

## Manual browser verification

The web app was started with `npm run dev:web` and opened at the port Vite printed (`http://localhost:5175`). The in-app browser was used. **No console errors were observed in any check.**

### Shell and navigation

- The app reported `NEURAL MIND STUDIO`, and all 17 workspace tabs A–Q rendered with their icons and labels.
- The starter graph is generic educational content only (33 concepts, 44 connections in a fresh session). No personal history appears in seed data.

### 3D Cognitive Universe

| Check | Result |
|---|---|
| Scene mount | Passed — WebGL canvas present in `.mind3d-scene-wrap`; heading "Your mind, in three dimensions." |
| Mind mode | Passed — 10 visual-layer presets, 9 node-class filters, 33 concepts and 44 links reported from the shared store, Pause/Reset/Fullscreen controls present. |
| Neuron mode | Passed — heading "Biological neuron anatomy"; side panel "Soma"; 10 anatomical structures listed (dendrites through postsynaptic receptors). |
| Brain mode | Passed — heading "Anatomical reference"; side panel "Brain reference model" with the educational disclaimer. |
| Shared store | Passed — concept/link counts come from the same Zustand graph store as the 2D atlas; workspace switching preserves selection and edits. |

The GLB asset is served from `/models/conceptual-brain.glb` and the `public/` directory is tracked in the repository.

### Private history import end-to-end

Using generic local-only text (no personal history):

1. Opened Data & Privacy and confirmed the import wizard and storage-availability notice.
2. Entered typed text and clicked **Segment and extract candidates**.
3. Observed 1 passage, 4 pending candidates, 125 bytes, with exact offsets `0–125`.
4. Expanded the passage. Candidates were `Fear` (emotion, directly-stated), `Anxiety` (emotion, possible), `Avoidance` (behaviour, possible) and `Avoidance` (pattern, uncertain). This confirms inflection matching and that cognitive patterns remain uncertain.
5. Approved the first candidate. It changed to approved status and an **Open node** link appeared.
6. Opened the node in the atlas. The inspector showed **Source passage**, the document title, the original text, offsets `0–125`, `MANUAL` format, candidate certainty, and privacy level `sensitive` (the stricter of the document level and the kind default).

No provider was called and no text left the browser during this flow.

### Earlier verification (carried forward)

The previous release's manual pass covered the full eleven-workspace smoke test, the offline AI conversation and proposal-acceptance path, and the Narrative Threads three-pane layout. Those areas were not re-run after the 3D/safety/import additions; their earlier results (all passed, no console errors) remain valid for the unchanged components.

A Lighthouse audit on the earlier release reported Accessibility 0.95, Best practices 1.00 and SEO 0.80, with known `color-contrast` and development `robots.txt` findings. It was not repeated for this build.

## Known limitations

| Limitation | Impact |
|---|---|
| Main JS bundle is ~1.62 MB (advisory threshold 500 kB) | Slower first load on poor connections; no functional regression. Route-level code splitting is deferred. |
| `npm audit` reports one high-severity advisory for `zod@3.25.76` (`<4.6.6`, GHSA-mrhx-c7xc-m3w5) | Oversized constrained collections can exhaust memory. The fix requires a breaking Zod 4 migration; not applied in this release. Input sizes are separately bounded in the app and API schemas. |
| Local IndexedDB and JSON exports are not encrypted | Visual privacy masking is not encryption. Use OS-level disk encryption and a private screen. An AES-GCM vault is planned, not implemented. |
| Rule-based safety detection | Can miss unusual phrasing or flag harmless phrasing. It is not a clinical instrument or a crisis service. |
| Deterministic import extraction | Misses paraphrases and may propose candidates the user must reject. This is intentional to avoid false precision. |
| WebGL required for 3D | A fallback message is shown when WebGL is unavailable; the 2D editor remains fully usable. |

## Conclusion

Typecheck, all 61 tests and the production build pass. The 3D universe, safety gate and private import workflow were exercised in a real browser with no console errors. Documented limitations are tracking items rather than blockers for this release.
