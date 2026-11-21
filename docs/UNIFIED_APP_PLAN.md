# Unified App Plan — Neural Mind Studio / Living Mind Atlas

Date: 2026-11-21  
Branch: `integration/app44-v3`  
Status: Phase 0 (unification) complete and verified; Phase 1 started.

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
| Verification | Typecheck + **103 tests across 8 files** + production build pass. See `docs/TEST_REPORT.md`. |

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
tests/               102 tests covering API, safety, import, vocabulary and rendered UI
```

The user journey is: record or import material in the person's own words → organise it under one of ten lenses → explore it in 2D or either 3D view → review offline relationship questions → export or delete everything. AI never writes silently into the graph.

## 5. Phase 1 — next work (started)

Ordered by user-visible value and safety risk. Each item should land with tests.

1. **Unify the two privacy controls.** The Inspector currently exposes both a storage/sharing `privacy` boundary and a 3D `sensitivity` level. Consolidate the UI into one clear control with a documented mapping, while keeping both stored fields for export compatibility. **Started:** the accessible 3D universe now honours `sensitivity: 'sensitive' | 'restricted'` in addition to `privacy` (`src/lib/mind3d.ts`), closing a leak where imported restricted records stayed visible. A regression test covers it. **Remaining:** consolidate the Inspector's two dropdowns and settle the meaning of `sensitivity: 'private'` across both 3D views.
2. **Make discovery review complete.** Wire source/target/type/supporting-evidence/evidence-class/explanation/status into one review card that is shared by the 2D canvas, `Mind3DWorkspace` and the lighter universe, so a suggestion looks and behaves identically everywhere.
3. **Confirm vs speculative visual parity.** Apply the same solid/dashed styling and legend to confirmed, suggested and structural edges in both 3D views and the 2D canvas.
4. **Timeline-first navigation.** Promote the stated-era timeline into a persistent side rail so records can be reached without first opening a node, keeping undated items visibly separate.
5. **Bundle and asset budget.** Code-split the 3D components (`three` is currently statically imported across views) and lazy-load the two GLB assets. Target a main bundle under 500 kB without changing behaviour.
6. **Dependency hygiene.** Address the `zod@3.25.76` advisory via a planned Zod 4 migration with a full schema re-verification; do not apply a breaking upgrade ad hoc.
7. **Browser re-verification.** Repeat the manual 3D, privacy and import passes on the unified build and record results in `docs/TEST_REPORT.md`.

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
