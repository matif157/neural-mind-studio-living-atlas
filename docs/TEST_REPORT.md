# Verification report

Date: 2026-11-21  
Branch: `living-atlas`  
Repository: `matif157/neural-mind-studio-living-atlas`

This report records the final verification performed for the Living Mind Atlas release. The application is local-first and can run without a model provider; all browser checks used the built-in `offline` provider unless stated otherwise.

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
| Vitest suite | **24 tests passed** |
| Production Vite build | Passed |
| Vite output | One non-blocking chunk-size warning |

The production build emits a warning that the main JavaScript bundle is larger than Vite's default 500 kB advisory threshold. This does not fail the build or block use of the app. It can be addressed later with route-level code splitting; no functional regression was observed.

### Test coverage

The suite is split across three files:

- `tests/api.test.ts` — API contract, strict Zod validation, provider/safety behaviour and authentication/rate-limit behaviour where exercised through the Express app.
- `tests/projectFile.test.ts` — v2 export validation, safe parsing and migration of v1 project files.
- `tests/patterns.test.ts` — descriptive, provenance-aware longitudinal pattern utilities used by the Pattern Intelligence workspace.

The safety tests specifically cover removal of unstated intensity, rejection of invalid categories and relation endpoints, diagnostic-language handling, and fixed crisis guidance when a safety flag is present. AI output is represented only as reviewable proposals; no test path permits an AI response to silently mutate the graph.

## Manual browser verification

The local stack was started with:

```bash
npm run dev
```

The web app was opened at `http://localhost:5173`, with Vite proxying `/api` to the Express server on `http://localhost:8787`. Verification used the in-app browser.

### Eleven-workspace smoke test

Each workspace was opened and checked for its expected heading, primary cards and interactive controls. All ten rendered successfully:

| | Workspace | Result |
|---|---|---|
| A | Living Mind Map | Passed — canvas, custom nodes/edges and editing controls rendered |
| B | AI Conversation | Passed — consent gate, composer and analysis area rendered |
| C | Emotional Observatory | Passed — emotion vocabulary and descriptive summaries rendered |
| D | Thought Explorer | Passed — thought vocabulary and voice editing rendered |
| E | Memory Atlas | Passed — user-recorded memory list and provenance controls rendered |
| F | Pattern Intelligence | Passed — hypotheses, loops, provenance and timeline rendered |
| G | Reflection Studio | Passed — guided exercise catalogue rendered |
| H | Neuroscience Explorer | Passed — anatomy explainer and caveat rendered |
| I | Knowledge Library | Passed — taxonomy search and domain cards rendered |
| J | Settings & Data Control | Passed — consent, provider, privacy, theme and data controls rendered |
| K | Narrative Threads | Passed — thread rail, source/segment editor and connection panel rendered |

No client console errors were observed during the workspace smoke test.

### Offline AI conversation and proposal flow

The end-to-end review path was exercised as follows:

1. Enabled AI consent in the Conversation workspace.
2. Confirmed the provider selector was set to `offline`.
3. Sent a reflective text message.
4. Observed SSE status updates from `/api/analyze/stream` and receipt of the structured analysis card. The stream event types are `status`, `token`, `result` and `error`.
5. Expanded the three returned graph proposals.
6. Selected **Accept all as drafts**.
7. Confirmed the app switched to the Atlas workspace and added the accepted items as **draft** nodes, leaving them available for inspection, editing, confirmation or rejection.

Result: **pass**. The original user wording remained stored independently, and no graph mutation occurred until explicit acceptance.

### Narrative Threads layout check

The Narrative Threads workspace was opened and exercised with generic local-only test text. The three-pane layout rendered correctly: thread rail on the left, source/segment editor in the centre, and echoes/connections/pattern ledger on the right. Splitting a source talk produced separate segment chips; segment fields, confidence, status, connection suggestions and local JSON export were available. The responsive stack layout was verified at an 816 px viewport. No console errors were observed. No personal narrative was written into the repository.

## Accessibility and best-practice audit

A Lighthouse audit of the local dev build reported:

| Category | Score |
|---|---:|
| Accessibility | 0.95 |
| Best practices | 1.00 |
| SEO | 0.80 |

Known, non-blocking findings:

- `color-contrast` — some text/background combinations fall short of the WCAG contrast threshold. This should be corrected in a future visual pass.
- `robots-txt is not valid` — the development server does not serve a valid production `robots.txt`. This does not affect local app behaviour.

Screenshot capture during the audit failed because no visible desktop browser tab was available in the verification environment. This did not prevent the page audits above from completing.

## Safety and privacy verification

The final manual pass confirmed the following user-visible boundaries:

- AI consent is off by default.
- Context sharing of approved/core nodes and recent wording is separately opt-in.
- API keys are read only by the server from `.env`; the browser never receives them.
- `MIND_API_TOKEN`, when configured, is kept in `sessionStorage` rather than persistent local storage.
- Original conversation wording is preserved alongside editable interpretations.
- Accepted AI graph changes become drafts only and remain reviewable in the inspector.
- “Delete conversations” clears conversation history without resetting settings, theme or consent.
- Full reset and JSON export/import controls remain under Settings & Data Control.

## Conclusion

The implementation meets the release criteria for the Living Mind Atlas: all eleven workspaces are functional, the automated suite passes, the production build succeeds, the offline AI review path works end to end, and the documented safety and privacy boundaries are enforced in the UI and server pipeline. Remaining Lighthouse findings are tracking items rather than release blockers.
