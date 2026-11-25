# Verification report

Date: 2026-11-22  
Branch: `integration/app44-v3` (unified app)  
Repository: `matif157/neural-mind-studio-living-atlas`

This report records verification for the **unified build**: the original 2D Living Atlas merged with the v3 / Base44-equivalent app and its complete 3D model. It covers ten life dimensions, reviewable relationship discovery, two 3D presentations (full-bleed conceptual/brain/neuron and the lighter accessible universe), the safety gate and the private history importer. The application is local-first and can run without a model provider; browser checks used the built-in `offline` provider and the single-origin production server at `http://localhost:8787`.

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
| Vitest suite | **112 tests passed across 8 files** |
| Production Vite build | Passed (1,753 modules transformed) |
| Vite output | One non-blocking chunk-size warning for the intentionally shared Three.js vendor chunk; no ineffective-dynamic-import warnings. The Node test runner also prints a Three.js CommonJS deprecation notice. |
| `npm audit` | 0 vulnerabilities after the Zod 4.6.7 upgrade. |

### Test files

| File | Tests | Coverage |
|---|---|---|
| `tests/api.test.ts` | 10 | API contract, strict Zod validation and authentication/rate-limit behaviour. |
| `tests/projectFile.test.ts` | 12 | v2 export validation, safe parsing, migration of v1 project files, clean seed-graph invariants and Zod 4 regressions for duplicate edge IDs and typed model-provider records. |
| `tests/patterns.test.ts` | 5 | Descriptive, provenance-aware longitudinal pattern utilities. |
| `tests/safety.test.ts` | 17 | Direct intent, plans and means, harm to others, false-positive control, denials, historical disclosure, medical red flags, diagnostic-language detection and the API gate's no-provider/no-proposal guarantee. |
| `tests/historyImport.test.ts` | 20 | Exact offsets, segmentation formats, chronology rules, inflection-aware candidate extraction, approval-only graph mutation, stricter privacy inheritance, restricted-node exclusion, rejection and a clean public seed graph. |
| `tests/personalAtlas.test.ts` | 14 | Ten dimensions and 26 workspaces, inferred/overridable dimension defaults, deterministic discovery with no graph mutation, masking-based discovery, free-text linking, timeline ordering, shared privacy rules, the suggestion edit/approve/reject/delete/refresh lifecycle, portable suggestion export and non-diagnostic vocabulary. |
| `tests/renderedApp.test.tsx` | 28 | Rendered 2D/3D acceptance tests: all ten dimension controls, WebGL fallback, sensitive/restricted gating in both 3D views, search and dimension filtering, camera presets, focus sync, shared relationship review cards, canonical edge classification and legend, structural/suggested edge exclusion from signal, persistent timeline rail, Inspector sync and privacy gates. |
| `tests/shortcuts.test.ts` | 6 | Workspace shortcuts, including macOS `Option`/`Alt` resolution from physical `event.code`. |

The suite asserts that no high/medium/low risk label or risk score is emitted, that AI output never silently mutates the graph, that imported personal history is never written into seed data, and that relationship suggestions stay pending until the user reviews them.

### Integration notes

The unified build was produced by merging `living-atlas` with `origin/living-atlas-v3` on `integration/app44-v3`. Thirteen merge conflicts were resolved with these rules:

- **One taxonomy:** `shared/domain.ts` is the canonical source for the ten dimension IDs (v3 short IDs) and 26 workspaces. `shared/dimensions.ts` is an adapter that accepts legacy hyphenated IDs from earlier exports.
- **One store:** the 2D canvas, both 3D views and every focused workspace read the same Zustand graph. Node/edge schemas carry both the original `privacy`/`review` fields and the v3 `sensitivity`/`approval` fields; old exports stay valid.
- **Suggestions stay inert:** AI-discovered edges are stored as `review: 'suggested'`, `signal: false`, `approval: 'pending'` and are excluded from signal propagation until a user reviews them.
- **Both 3D presentations were kept:** `Mind3DWorkspace` is the default; the header orbit button switches to `CognitiveUniverse3D`. `BrainAnatomy3D` remains as the educational modal.
- **No marker leakage:** repository-wide checks confirm no unresolved conflict markers remain in tracked source, docs or styles.
- **One privacy boundary:** `effectivePrivacy()` resolves both stored fields with the stricter level winning; `privacyPatch()` writes both for export compatibility. Restricted records remain outside ordinary 2D/3D views, search and relationship filtering.
- **One review surface:** `RelationshipReviewCard` is shared by the 2D canvas, both 3D presentations and the Inspector; `edgeVisualState()` and `EdgeLegend` give confirmed, suggested, structural and excluded links one visual rule.
- **Timeline-first access:** the persistent `TimelineRail` exposes user-stated eras and an explicit undated group in every workspace, with sensitive wording masked until revealed.
- **Zod 4 contracts:** schemas use explicit record key/value types and Zod 4 string issue codes; duplicate-edge and model-provider regressions were added.

## Manual browser verification

The production client, API and GLB asset were served from one origin by `npm run start` at `http://localhost:8787`. The in-app browser was used. **No console errors were observed in any check.**

### Phase 1 re-verification (current build)

| Check | Result |
|---|---|
| 2D map | Passed — 33 nodes, 44 links; relationship legend labels `Confirmed`, `Suggested`, `Structural`, `Excluded`. |
| Persistent timeline rail | Passed — expanded rail showed 33 records in the explicit `undated` group; clicking `Anger` selected it without treating it as a cause. |
| 2D secure view | Passed — `Secure view off → Secure view on → Secure view off` without console errors. |
| Full 3D workspace | Passed — WebGL canvas, `33 NODES · 44 LINKS`, `CONCEPTUAL MAP · NOT A BRAIN SCAN`, shared legend, ten dimension controls, three layouts, FRONT/SIDE/TOP/ISO presets and distinct Mind / Brain / Neuron modes with their own disclaimers. Clicking `FRONT` activated it. |
| Lighter cognitive universe | Passed — `PERSONAL COGNITIVE UNIVERSE`, `Your dimensions, in relation`, `Educational conceptual map · not a brain scan · not a diagnosis`, `33/33 nodes`, `44 signal links`, `0 suggestions`, full shared legend, WebGL canvas, timeline rail and FRONT/SIDE/TOP/ISO presets. |
| Private history import | Passed — generic local-only text produced 1 passage, 2 pending candidates, 132 bytes and offsets `0–132`. Candidates were `Anxiety` (emotion) and `Chest tightness` (body), both `directly-stated`. Approving `Anxiety` changed the source to `1/2 approved`, added it to the source-to-node trail and created a confirmed node. |
| Source-to-node trail and inspector | Passed — the inspector showed `SOURCE PASSAGE / GENERIC VERIFICATION PASSAGE`, the exact original text, `Offsets 0–132 · MANUAL · candidate marked directly-stated`, privacy boundary `sensitive`, evidence class `directly-reported` and one supporting evidence entry with the passage ID. |
| JSON export | Passed — the downloaded graph envelope reported `app: neural-mind-studio`, `schemaVersion: 2`, 34 nodes, 44 edges and 0 suggestions. The imported `Anxiety` node kept `provenance: user-confirmed`, `sensitivity: sensitive`, `evidenceClass: directly-reported` and the original passage excerpt with its passage ID. |

No provider was called and no imported text left the browser during the import/export pass.

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

### Earlier personal atlas and privacy pass (carried forward)

- **Connection Explorer (S):** *Discover connections* produced 21 pending questions against 44 confirmed links. Approving one changed the counters to 20 pending / 45 links and created a user-confirmed edge with `approval: 'approved'` and `provenance: 'user-confirmed'`. No console errors.
- **Sensitive Memory Controls (Z):** Session private mode and reveal toggles were exercised (`Off → On → Off`, `Masked → Revealed → Masked`) and restored to `Off` / `Masked`. The UI repeated that masking is a shoulder-surfing control, not encryption. No console errors.
- **Export:** in the earlier pass, *Export personal data* produced a dated `personal-atlas-export` JSON. A structural check confirmed the envelope contained `graph` and `personalRecords` (`journalEntries`, `checkIns`, `decisionRecords`), plus the explicit warning that the JSON is not encrypted. The current build's graph export was re-verified in the Phase 1 table above. No raw personal-history text was stored in the repository or tests.
- **Deletion:** The destructive "Delete local personal records" flow was not clicked in the browser. Its logic is covered by automated store tests and the confirmation copy was inspected in the UI.

### Earlier private history import pass (carried forward)

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
| Main entry chunk is 480.08 kB / 155.01 kB gzip; Three.js vendor chunk is 737.16 kB / 186.99 kB gzip | The entry budget is met, but the intentionally shared 3D vendor chunk still exceeds Vite's 500 kB advisory threshold. The 3D views and vendor chunk are lazy-loaded, so the 2D atlas does not pay the 3D cost on first paint. |
| Three.js prints a CommonJS deprecation notice in the Node test runner | Non-blocking warning from a transitive dependency; typecheck, tests and build all pass. |
| Local IndexedDB and JSON exports are not encrypted | Visual privacy masking is not encryption. No AES-GCM vault is implemented. Use OS-level disk encryption and a private screen. |
| Base44 internals are inaccessible | Visual parity is based on rendered output only; no source, schema or deployment configuration was copied. |
| Final WebGL brightness sample blocked by hidden-tab throttling | Layout, controls and code-level material override were verified; a fresh pixel comparison still needs a visibly focused desktop window. |
| Rule-based safety detection | Can miss unusual phrasing or flag harmless phrasing. It is not a clinical instrument or a crisis service. |
| Deterministic import extraction and discovery | Miss paraphrases and may propose candidates the user must reject. This is intentional to avoid false precision. |
| WebGL required for 3D | A fallback message is shown when WebGL is unavailable; the 2D editor remains fully usable. |

## Conclusion

Typecheck, all 112 tests and the production build pass on the unified app. The entry chunk is under 500 kB, 3D assets and workspaces are lazy-loaded, validation has moved to Zod 4 with a clean `npm audit`, and Phase 1 is complete. The 26-workspace shell, both 3D presentations, relationship review, privacy controls, persistent timeline, export flow, safety gate and private import workflow were exercised in a real browser with no console errors. Documented limitations are tracking items rather than blockers for this release. See `docs/UNIFIED_APP_PLAN.md` for the settled scope and guardrails.
