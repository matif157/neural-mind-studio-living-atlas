# Unified App Plan — Neural Mind Studio / Living Mind Atlas

Date: 2026-11-22  
Branch: `integration/app44-v3`  
Status: Phase 0 (unification) and Phase 1 complete and verified.

## 1. Why this plan exists

There were two converging implementations of the same idea:

- **`living-atlas`** — the original local-first 2D React Flow editor, 12 focused workspaces, safety pipeline, evidence-aware relationship review and an accessible 3D cognitive universe.
- **`origin/living-atlas-v3`** (the Base44-equivalent app) — 26 workspaces, a full-bleed 3D presentation with three visual systems, a complete educational brain asset, offline connection discovery and a private history importer.

The live Base44 source is paywalled (0 credits, "Code editing is only available on paid plans"), so the v3 branch is the highest-fidelity source available. This plan treats the merged result as **one app**, not two modes, and records what is settled before new features are added.

## 2. Phase 0 — Unification (complete)

| Deliverable | Result |
|---|---|
| Merge `living-atlas` + `origin/living-atlas-v3` | Done on `integration/app44-v3`; 13 conflicts resolved. |
| Canonical taxonomy | `shared/domain.ts` holds the ten dimension IDs (v3 short form) and 26 workspaces; `shared/dimensions.ts` is an adapter with legacy ID aliases. |
| Single canonical graph | 2D canvas, `Mind3DWorkspace`, `CognitiveUniverse3D`, Inspector and focused workspaces all read `useMindStore`. |
| Schema compatibility | Node/edge schemas accept both `privacy`/`review` and `sensitivity`/`approval` families; v1/v2 exports still validate. |
| Suggestion safety | New AI edges are `review: 'suggested'`, `signal: false`, `approval: 'pending'`; structural wires never propagate signal. |
| Two 3D presentations kept | `Mind3DWorkspace` default, header orbit button toggles to `CognitiveUniverse3D`; `BrainAnatomy3D` modal preserved. |
| Verification | Typecheck + **112 tests across 8 files** + production build pass. See `docs/TEST_REPORT.md`. |

## 3. Settled decisions (do not re-litigate silently)

1. **Ten equal-status lenses.** Life Timeline, Memories & Experiences, Thoughts & Beliefs, Emotional Landscape, Physical & Internal, Behavioural Patterns, Relationship Patterns, Imagination & Creativity, Personal Strengths, Decisions & Future. They are presentation aids, never clinical categories or brain regions.
2. **No diagnosis, no medical inference.** No risk scores, no high/medium/low labels, no "remove/cure" claims, no claim to replace a qualified professional. Only a user-supplied `professionally-established` evidence class may describe a clinical fact.
3. **Exact words preserved.** User wording is stored verbatim, including harm-to-self/others wording, which is flagged only as a danger signal and never used as identity.
4. **Suggestions are questions.** Discovery output stays pending until the user approves, edits or rejects it. Every suggestion carries source, destination, type, supporting information, evidence class, explanation and status.
5. **Three separate visual systems.** Conceptual mind network, educational brain sculpture and neuron teaching model are visually and semantically distinct. No personal node is mapped to a precise anatomical location.
6. **3D position is independent.** `pos3` / `spatial` are presentation coordinates; they never read or write the 2D `position` unless explicitly synchronised.
7. **Privacy by default.** New personal nodes are private. `sensitive` content is masked until revealed for a session; `restricted` content is excluded from ordinary 2D/3D exploration, search and relationship filtering. Masking is not encryption.
8. **Accessible parity.** Every 3D interaction has a 2D equivalent; reduced motion, search, dimension/timeline filtering, focus navigation, export and deletion remain first-class.

## 4. Re-plan: what the app is now

```text
shared/    canonical vocabulary, ten dimensions, Zod contracts, safety rules
server/    Express API, provider adapters, strict validation, safety gate
src/
  components/        2D canvas, Inspector, 26 workspaces, import wizard
  components/three/  full-bleed Mind3DScene (conceptual / brain / neuron)
  components/        Mind3DWorkspace + CognitiveUniverse3D + BrainAnatomy3D
  lib/               API client, connection discovery, 3D privacy/layout helpers
  store/             one graph store + UI, conversation and import stores
  utils/             shared privacy gates and project-file portability
public/models/       conceptual-brain.glb and brain/anatomical-brain.glb
tests/               112 tests covering API, safety, import, vocabulary, schemas and rendered UI
```

The user journey is: record or import material in the person's own words → organise it under one of ten lenses → explore it in 2D or either 3D view → review offline relationship questions → export or delete everything. AI never writes silently into the graph.

## 5. Phase 1 — complete

Ordered by user-visible value and safety risk. Every item landed with tests and a browser pass where a UI change was involved.

1. **Unify the two privacy controls — done.** The Inspector now presents one boundary choice. `effectivePrivacy()` resolves the legacy `privacy` and `sensitivity` fields with the stricter level winning, `privacyPatch()` writes both for export compatibility, and `PrivacyView.revealRestricted` remains the only 2D path that can show restricted records. Restricted records still never enter either 3D view, search or relationship filtering.
2. **Make discovery review complete — done.** `RelationshipReviewCard` is shared by the 2D canvas, `Mind3DWorkspace`, the lighter universe and the Inspector. It shows source, destination, type, supporting information, evidence class, explanation and confirmation status in the same form everywhere; AI proposals remain pending until the user approves, edits or rejects them.
3. **Confirm vs speculative visual parity — done.** `edgeVisualState()` and `isSpeculativeEdge()` provide one canonical classification. Confirmed/signal-bearing links are solid, suggested links dashed, and structural or excluded links dotted. The same `EdgeLegend` is rendered in 2D and both 3D presentations. Structural and non-signalling edges are excluded from propagation, analysis, loops, hubs and AI context.
4. **Timeline-first navigation — done.** A persistent, privacy-aware `TimelineRail` keeps user-stated eras reachable from every workspace, with undated records visibly separate and sensitive wording masked unless revealed. Earlier records are never presented as causes.
5. **Bundle and asset budget — done.** Workspaces, both 3D views, the GLB loader and validation are lazy-loaded. The main entry chunk is **480.08 kB / 155.01 kB gzip**, the shared Three.js vendor chunk is **737.16 kB / 186.99 kB gzip**, and the validation chunk is **90.04 kB / 25.48 kB gzip**. The entry target of under 500 kB is met; only the intentional Three.js vendor chunk remains above the advisory threshold.
6. **Dependency hygiene — done.** `zod@4.6.7` is in use. Record schemas declare key and value types, custom refinements use the Zod 4 string issue code, and regressions cover duplicate edge IDs and typed model-provider overrides. `npm audit` now reports **0 vulnerabilities**; the previous Zod advisory is resolved.
7. **Browser re-verification — done.** The rebuilt production app was exercised on the single-origin offline server. 2D, full 3D, lighter universe, privacy toggles, timeline, private import, source-to-node trail, inspector evidence and JSON export were checked with no console errors. Full results are in `docs/TEST_REPORT.md`.

## 6. Guardrails for every subsequent change

- Run `npm run check` before proposing a merge; the bar is typecheck + all tests + production build.
- Add or update a test whenever a privacy, safety or suggestion rule changes.
- Never add a diagnosis, score, risk label or clinical inference to copy, code or docs.
- Keep talks separated with `when`, exact words, `reaction`, `why` and source links; avoid restating sensitive disclosures unnecessarily.
- No features that locate, confront, control or harm another person.
- Commit and push every meaningful change; open a PR into `living-atlas` rather than committing directly to the base branch.

## 7. Non-goals

- Porting the live Base44 source (inaccessible without a paid plan).
- A medical record, diagnostic tool, crisis service or replacement for a qualified professional.
- Biologically localising personal thoughts onto an anatomical model.
- Encrypting local storage in this phase (use OS-level disk encryption until a vault is designed).
