# Verification report

Date: 2026-11-21  
Branch: `living-atlas-v3`  
Repository: `matif157/neural-mind-studio-living-atlas`

This report records verification for the current build: the personal-atlas release with ten life dimensions, reviewable relationship discovery, a full-bleed conceptual 3D presentation, the safety gate and the private history importer. The application is local-first and can run without a model provider; browser checks used the built-in `offline` provider and the single-origin production server at `http://localhost:8787`.

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
| Vitest suite | **74 tests passed across 6 files** |
| Production Vite build | Passed (1,658 modules transformed) |
| Vite output | One non-blocking chunk-size warning |

### Test files

| File | Coverage |
|---|---|
| `tests/api.test.ts` | API contract, strict Zod validation and authentication/rate-limit behaviour. |
| `tests/projectFile.test.ts` | v2 export validation, safe parsing and migration of v1 project files. |
| `tests/patterns.test.ts` | Descriptive, provenance-aware longitudinal pattern utilities. |
| `tests/safety.test.ts` | 17 tests: direct intent, plans and means, harm to others, false-positive control, denials, historical disclosure, medical red flags, diagnostic-language detection and the API gate's no-provider/no-proposal guarantee. |
| `tests/historyImport.test.ts` | 20 tests: exact offsets, segmentation formats, chronology rules, inflection-aware candidate extraction, approval-only graph mutation, stricter privacy inheritance, restricted-node exclusion, rejection and a clean public seed graph. |
| `tests/personalAtlas.test.ts` | 13 tests: ten dimensions and 26 workspaces, explicit dimension/evidence defaults, deterministic discovery with no graph mutation, masking-based discovery, free-text linking, timeline ordering, shared privacy rules, the suggestion edit/approve/reject/delete/refresh lifecycle, portable suggestion export and non-diagnostic vocabulary. |

The suite asserts that no high/medium/low risk label or risk score is emitted, that AI output never silently mutates the graph, that imported personal history is never written into seed data, and that relationship suggestions stay pending until the user reviews them.

## Manual browser verification

The production client, API and GLB asset were served from one origin by `npm run start` at `http://localhost:8787`. The in-app browser was used. **No console errors were observed in any check.**

### Shell and navigation

- The app reported `NEURAL MIND STUDIO / LIVING MIND ATLAS`. All **26 workspace tabs A–Z** rendered with their icons and labels: the original A–Q workspaces plus R Personal Timeline, S Connection Explorer, T Repetitive Thought Explorer, U Trigger & Response Explorer, V Decision Clarity Studio, W Reflection Journal, X Context & Continuity, Y Emotional & Physical Check-In and Z Sensitive Memory Controls.
- The starter graph is generic educational content only (33 concepts, 44 connections in a fresh session). No personal history appears in seed data.
- The 3D presentation uses a compact 56px app header. The canvas occupied 816×606 at `y=56`, matching the reference presentation's 816×604 at `y=56` within two pixels.

### 3D Cognitive Universe

| Check | Result |
|---|---|
| Scene mount | Passed — WebGL canvas present in `.mind3d-scene-wrap`; heading "MIND ATLAS / 3D SPACE" with "Explore the mind". |
| Presentation | Passed — dark `#07090e` canvas, cyan-dominant conceptual sculpture, `FRONT` / `SIDE` / `TOP` / `ISO` presets, live `33 NODES · 44 LINKS` chip and `CONCEPTUAL MAP · NOT A BRAIN SCAN` disclaimer. |
| Bottom sheet | Passed — `Regions`, `Details` and `Fit` tabs, Pause/Reset/Fullscreen utilities, `ALL TIME / 7 DAYS / 30 DAYS / 90 DAYS` filters and scrollable timeline cards. |
| Layouts and privacy | Passed — kind constellation, ten dimensions and life timeline layouts; dimension isolation, reduced motion and shared 2D/3D privacy rules. Restricted records stay out of standard views. |
| Mind / Neuron / Brain modes | Passed — conceptual network, educational neuron anatomy and separate brain sculpture remain distinct, with their own disclaimers. |
| Shared store | Passed — concept/link counts come from the same Zustand graph store as the 2D atlas; workspace switching preserves selection and edits. |

The GLB asset is served from `/models/conceptual-brain.glb` and the `public/` directory is tracked in the repository. The conceptual sculpture's imported materials are replaced at runtime with presentation-only cyan materials; geometry and personal meaning are unchanged.

### Personal atlas and privacy flows

- **Connection Explorer (S):** *Discover connections* produced 21 pending questions against 44 confirmed links. Approving one changed the counters to 20 pending / 45 links and created a user-confirmed edge with `approval: 'approved'` and `provenance: 'user-confirmed'`. No console errors.
- **Sensitive Memory Controls (Z):** Session private mode and reveal toggles were exercised (`Off → On → Off`, `Masked → Revealed → Masked`) and restored to `Off` / `Masked`. The UI repeated that masking is a shoulder-surfing control, not encryption. No console errors.
- **Export:** *Export personal data* produced `personal-atlas-export-2026-11-21.json`. A structural check confirmed the envelope contained `graph` (33 nodes, 45 edges, 21 suggestions: 1 approved / 20 pending) and `personalRecords` (`journalEntries`, `checkIns`, `decisionRecords`), plus the explicit warning that the JSON is not encrypted. No raw personal-history text was stored in the repository or tests.
- **Deletion:** The destructive "Delete local personal records" flow was not clicked in the browser. Its logic is covered by automated store tests and the confirmation copy was inspected in the UI.

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

The previous release's manual pass covered the full eleven-workspace smoke test, the offline AI conversation and proposal-acceptance path, and the Narrative Threads three-pane layout. Those areas were not re-run after the 3D/safety/import/personal-atlas additions; their earlier results (all passed, no console errors) remain valid for the unchanged components.

A Lighthouse audit on the earlier release reported Accessibility 0.95, Best practices 1.00 and SEO 0.80, with known `color-contrast` and development `robots.txt` findings. It was not repeated for this build.

## Reference comparison caveats

The Base44 presentation at `https://funny-neural-mind-atlas.base44.app/` was inspected only through its rendered DOM/CSS/WebGL output. Its source code, database schema, credentials and deployment pipeline are not reachable from the public URL, so the local implementation is a visual and behavioural approximation rather than a source port.

An earlier WebGL pixel sample, taken before the final runtime material override, showed the reference at `bright 9665 / colored 10112 / nonDark 24368` on a `1632×1208` drawing buffer and the local scene at `bright 1516 / colored 17808 / nonDark 19253` on `1264×939`. The buffers have different device-pixel ratios, so raw counts are not directly comparable. After the final material change, the browser hid/throttled animation frames in the background tab and `readPixels` returned all zeros even after a resize event. The final brightness increase is therefore verified by code review and DOM/layout checks, not by a fresh pixel sample. Screenshot capture also requires a visibly focused desktop window.

## Known limitations

| Limitation | Impact |
|---|---|
| Main JS bundle is ~1.70 MB (advisory threshold 500 kB) | Slower first load on poor connections; no functional regression. Route-level code splitting is deferred. |
| `npm audit` reports one high-severity advisory for `zod@3.25.76` (`<4.6.6`, GHSA-mrhx-c7xc-m3w5) | Oversized constrained collections can exhaust memory. The fix requires a breaking Zod 4 migration; not applied in this release. Input sizes are separately bounded in the app and API schemas. |
| Local IndexedDB and JSON exports are not encrypted | Visual privacy masking is not encryption. No AES-GCM vault is implemented. Use OS-level disk encryption and a private screen. |
| Base44 internals are inaccessible | Visual parity is based on rendered output only; no source, schema or deployment configuration was copied. |
| Final WebGL brightness sample blocked by hidden-tab throttling | Layout, controls and code-level material override were verified; a fresh pixel comparison still needs a visibly focused desktop window. |
| Rule-based safety detection | Can miss unusual phrasing or flag harmless phrasing. It is not a clinical instrument or a crisis service. |
| Deterministic import extraction and discovery | Miss paraphrases and may propose candidates the user must reject. This is intentional to avoid false precision. |
| WebGL required for 3D | A fallback message is shown when WebGL is unavailable; the 2D editor remains fully usable. |

## Conclusion

Typecheck, all 74 tests and the production build pass. The 26-workspace shell, 3D presentation, relationship review, privacy controls, export flow, safety gate and private import workflow were exercised in a real browser with no console errors. Documented limitations are tracking items rather than blockers for this release.
