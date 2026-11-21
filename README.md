# Neural Mind Studio — Living Mind Atlas

A local-first cognitive reflection studio. It combines an editable 2D React Flow mind graph with a synchronised 3D cognitive universe (conceptual mind network, educational brain sculpture and neuron anatomy). An optional server-side AI companion produces structured reflections you can review, edit, accept as drafts or reject. Nothing is silently written into your graph.

> This is an educational reflection tool. It is **not** a biological connectome, brain-reading system, diagnostic instrument, crisis service or clinical assessment. Anatomical and neuronal layers are separate from your personal concept network.

## Quick start

```bash
npm install
cp .env.example .env      # optional; offline mode works with no key
npm run dev
```

Open `http://localhost:5175` (or the port Vite prints). Vite proxies `/api` to the local Express server on port `8787`.

If you only want the editor, no API is required:

```bash
npm run dev:web
```

### Local production deployment

The Express server serves the production client, the API and the 3D brain asset from one origin:

```bash
npm install
npm run build
npm run start
```

Open `http://localhost:8787`. It binds to `0.0.0.0`, so a device on the same network can use the machine's LAN address (for example `http://192.168.8.100:8787`). Override the port with `PORT=9000 npm run start`.

The default provider is `offline`, so no API key or network access is needed. Set `MIND_API_TOKEN` in `.env` if you want to require a bearer token on `/api` routes. Check the deployment with `curl http://localhost:8787/api/health`.

## Workspaces

Twenty-six workspaces are available from the top navigation (A–Z):

| | Workspace | What it does |
|---|---|---|
| A | **Mind Atlas** | Editable React Flow canvas with 22 node kinds, 22 relationship types, views, search, filters, grouping, locking, undo/redo, clipboard, import/export and a change log. |
| B | **3D Cognitive Universe** | Three separate layers: your conceptual mind network, a stylised educational brain sculpture, and interactive neuron anatomy. Shared state with the 2D atlas, search/focus, draggable nodes, saved 3D positions and privacy masking. |
| C | **Conversation Intelligence** | Text and voice input, consent gate, streaming status, safety banner, stored original wording, structured analysis review, editable responses and proposal approval. |
| D | **Emotion Observatory** | Emotion vocabulary, self-rated intensity (never inferred), descriptive frequency and intensity trend. |
| E | **Thought Explorer** | Thought-type vocabulary, recurring wording from your own reflections, inner voice and balanced voice editing. |
| F | **Cognitive Pattern Lab** | Pattern hypotheses, descriptive graph loops, provenance overview and reflection timeline. |
| G | **Memory Atlas** | User-recorded memories and situations with provenance and evidence; no recovered or invented memories. |
| H | **Relationship Dynamics** | Relationship contexts and your interpretations; explicitly no profiling, monitoring or coercion of another person. |
| I | **Behavioural Systems** | Behaviour vocabulary, recorded loops from your own links and a non-deterministic framing of actions. |
| J | **Body & Interoception** | Self-noticed sensations, self-rating sliders and clear guidance on when to seek medical advice. |
| K | **Reflection Studio** | Guided exercises with editable responses, saved reflections and node links. |
| L | **Personal Growth** | Goals, strengths, values and self-reported practice — never converted into a recovery score. |
| M | **Neuroscience Explorer** | Educational anatomy explainer and knowledge domains with explicit limitations. |
| N | **Evidence Library** | Searchable taxonomy of psychological, therapeutic and cognitive fields with scope and limitations. |
| O | **History & Analytics** | Counts of what you recorded, with configurable windows and intentionally missing data left missing. |
| P | **Narrative Threads** | Split long talks into segments, preserve original wording, record self-rated interpretations and connect repeated themes across time. |
| Q | **Data & Privacy** | Consent, provider/model choice, privacy toggles, export/import, data deletion and the private history import wizard. |
| R | **Personal Timeline** | Your stated eras in order, with undated records kept separate. Earlier events are never treated as causes. |
| S | **Connection Explorer** | Reviewable relationship questions with source, target, type, evidence, confidence and status. Nothing is written to the graph until you approve it. |
| T | **Repetitive Thought Explorer** | Repeated wording presented as a prompt for reflection, not as evidence of illness or a scored pattern. |
| U | **Trigger & Response Explorer** | Possible situational and response links that you can confirm, edit or reject. |
| V | **Decision Clarity Studio** | Values, strengths and decisions side by side, without recommendations or predictions. |
| W | **Reflection Journal** | Private, local-only entries with optional links to concepts; exact wording is preserved. |
| X | **Context & Continuity** | Check-ins and reflections across time, with explicitly stated timeframes and evidence classes. |
| Y | **Emotional & Physical Check-In** | Self-rated observations that are never converted into a diagnosis, score or risk label. |
| Z | **Sensitive Memory Controls** | Session-only reveal, private mode, restricted-content exclusion and deletion controls. Masking is not encryption. |

## Ten dimensions and discovery

Personal concepts can be organised under ten equal-status lenses: Life Timeline, Memories & Experiences, Thoughts & Beliefs, Emotional Landscape, Physical & Internal, Behavioural Patterns, Relationship Patterns, Imagination & Creativity, Personal Strengths, and Decisions & Future. A node has one primary dimension for clustering, but links may cross any boundary. None of these lenses is a clinical category or brain region.

The offline discovery engine (`src/lib/connectionDiscovery.ts`) produces **questions**, not findings. It compares wording, tags and timeframes you recorded, then stores results as `pending` suggestions with an explicit source, target, relation, evidence class (`system-hypothesis`), confidence band and rationale. You can edit, approve, reject or delete each one. Only approval creates a graph edge, marked with `approval: 'approved'` and `provenance: 'user-confirmed'`. Suggestions are included in project exports so review decisions are portable.

Every personal record also carries a temporal status (`historical`, `current`, `recurring`, `future`, `unknown`) and an evidence class (`directly-reported`, `self-believed`, `self-suspected`, `system-hypothesis`, `user-confirmed`, `professionally-established`). Only information you explicitly identify as professionally established may be described that way; the app never upgrades its own hypotheses.

## 3D presentation

The 3D workspace keeps the conceptual mind, educational brain sculpture and neuron teaching model separate. The conceptual map uses a dark `#07090e` canvas, cyan sculpture, `FRONT` / `SIDE` / `TOP` / `ISO` camera presets, a live node/link chip and a `CONCEPTUAL MAP · NOT A BRAIN SCAN` disclaimer. A bottom sheet exposes `Regions`, `Details` and `Fit`, plus timeline filters (`ALL TIME`, `7 DAYS`, `30 DAYS`, `90 DAYS`) and horizontally scrollable record cards.

Three layout modes are available: **Kind constellation** (preserves stored 3D positions), **Ten dimensions** (clusters by primary lens) and **Life timeline** (orders by the era you stated). Reduced-motion settings stop idle animation while preserving manual rotate, zoom and focus. A 2D graph editor remains available for every 3D interaction.

## AI providers

Keys are read only by the Express server from `.env`; they are never sent to the browser. The browser keeps only an optional local API token in `sessionStorage`.

| Provider | Credential | Notes |
|---|---|---|
| `gemini` | `GEMINI_API_KEY` | Google GenAI SDK; default model `gemini-2.5-flash`. |
| `openrouter` | `OPENROUTER_API_KEY` | OpenAI-compatible router. |
| `deepseek` | `DEEPSEEK_API_KEY` | OpenAI-compatible DeepSeek endpoint. |
| `local` | none | Any OpenAI-compatible endpoint such as Ollama or LM Studio. |
| `offline` | none | Deterministic rule-based analysis with no network calls. Default until configured. |

`MIND_AI_PROVIDER` picks the server default; `MIND_ALLOWED_PROVIDERS` restricts what clients may select. `MIND_API_TOKEN` enables bearer-token auth for the local API.

### API

- `GET /api/health`
- `GET /api/providers`
- `GET /api/knowledge`
- `POST /api/analyze`
- `POST /api/analyze/stream` (SSE: `status`, `token`, `result`, `error`)
- `POST /api/test-connection`

Every request is validated with strict Zod schemas. Provider output is validated again, stripped of unstated intensity and disallowed relation/category endpoints, checked for diagnostic language, and given crisis support guidance when safety flags appear.

## Data and privacy

- Graph, conversations, analyses, exercise responses, imported history and settings are stored in IndexedDB on this device only.
- v1 project exports migrate automatically on import.
- AI consent is off by default. No text is sent anywhere until you enable it.
- Context sharing is separately controlled: approved/core nodes and recent user wording are off by default.
- Original user wording is stored alongside, not replaced by, interpretations.
- Every node has a privacy level: `standard`, `private`, `sensitive` or `restricted`. Private/sensitive concept **content** is masked until you explicitly reveal it for a session; restricted concepts never enter the standard 2D or 3D atlas. **Visual masking is not encryption.**
- New personal thoughts default to `private`. Imported concepts inherit the stricter of the document level and the kind default.
- Imported personal history is never placed in seed data, tests, screenshots or the public repository. It is only persisted when “Keep reflections between sessions” is enabled.
- The private history importer is deterministic and offline: it segments text, preserves exact offsets, records chronology only when stated, and produces candidates that all require your approval. See `docs/IMPORT_PRIVACY.md`.
- AI graph proposals become **draft** nodes only after you accept them; you can edit, confirm or reject them in the inspector.

## Safety boundaries

The app will not:

- diagnose, infer hidden memories, or claim biological measurement;
- invent emotion intensity — it is charted only when you supplied it;
- present a cognitive pattern as an established fact;
- silently mutate the graph from AI output;
- produce a numerical risk score, probability or “high/medium/low risk” label;
- help monitor, locate, coerce or retaliate against another person;
- act as a crisis or emergency service.

When a message may describe immediate danger, a shared rule-based safety gate **interrupts ordinary analysis before any provider is called**, returns a support-only response and creates no graph proposals. See `docs/SAFETY.md`.

If you may be in immediate danger or could harm yourself or someone else, contact your local emergency services now or go to the nearest emergency department. This application cannot respond to emergencies.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite + API together |
| `npm run dev:web` | Editor only |
| `npm run dev:api` | API only |
| `npm run build` | Typecheck + production client build |
| `npm run typecheck` | TypeScript only |
| `npm test` | Vitest suite |
| `npm run check` | Typecheck + tests + build |

## Architecture

```text
shared/      Domain vocabulary (22 node kinds, 10 dimensions, privacy levels, 26 workspaces),
             Zod schemas, taxonomy, safety detector and strict AI JSON contract
server/      Express API, auth, rate limits, provider adapters, safety gate and validation
src/
  components/  Canvas, nodes, edges, palette, inspector, conversation, 3D workspace,
               import wizard and focused workspaces
  components/three/  React Three Fiber scenes: conceptual mind, brain sculpture, neuron anatomy
  lib/         API client, SSE parser, IndexedDB, history import, longitudinal patterns,
               deterministic relationship discovery
  store/       Zustand graph, conversation, import and UI state (one canonical graph store)
  utils/       Deterministic 3D layout and privacy helpers
  data/        Generic educational starter graph — no personal history
tests/       API, project file, pattern, safety, import and personal-atlas tests
docs/        Scientific scope, 3D atlas, safety, import/privacy and verification report
```

Keyboard shortcuts: `⌘/Ctrl Z` undo, `⌘/Ctrl ⇧ Z` redo, `⌘/Ctrl C/X/V` copy/cut/paste, `⌘/Ctrl D` duplicate, `Alt + 1–0` switch workspace, `?` show help, `Esc` clear focus.

Further reading: `docs/SCIENTIFIC_MODEL.md`, `docs/3D_ATLAS.md`, `docs/SAFETY.md`, `docs/IMPORT_PRIVACY.md`, `docs/TEST_REPORT.md`.
