# Private history import and privacy model

The import workflow lives in **Data & Privacy → Private history import**. It is designed for material the user chooses to bring in; the repository's seed graph, tests and screenshots contain only generic educational text.

## Workflow

1. **Choose a source.** TXT, Markdown, JSON, CSV, or typed text up to 2 MB. Set a title, format and privacy level. Files are read in the browser; nothing is uploaded.
2. **Segment and extract.** `src/lib/historyImport.ts` splits the text into passages and records each passage's exact character offsets into the original document. It detects chronology only from explicit text (ISO date, month/year, "when I was N", or a year). Undated passages stay `unknown`; order in the document is never treated as evidence of when something happened.
3. **Review candidates.** Rule-based offline matching proposes concepts with a certainty of `directly-stated`, `possible` or `uncertain`. Cognitive patterns are always `uncertain` and require first-person wording. Nothing is added to the graph at this stage.
4. **Approve or reject.** Approval creates a graph node with `provenance: 'user-confirmed'`, the exact evidence excerpt, the passage ID, the stated date and the document title. Rejection leaves the graph untouched.

No AI provider is called, no text leaves the browser, and no summarisation or rewriting occurs. A passage containing safety language is flagged and stored as text only; it is never analysed automatically.

## Matching rules

Taxonomy labels are matched conservatively, including regular inflections (`anxious` → `Anxiety`, `ruminating` → `Rumination`) and a short explicit list of irregular noun/adjective pairs (`afraid` → `Fear`, `angry` → `Anger`, `ashamed` → `Shame`). A sentence is only labelled "directly stated" when a first-person feeling verb and the concept occur in the same sentence. Multiword labels require all meaningful tokens to match. A candidate is never a diagnosis or an inferred hidden memory.

## Storage rules

- Imported documents, passages and candidates use the `history-import-v1` IndexedDB key.
- Persistence is gated on **Keep reflections between sessions**. When it is off, imported data is not written to disk and is discarded when the session ends.
- Each approved node takes the **stricter** of the document privacy level and the kind default. Thoughts, memories, body signals and safety entries default to `private`; patterns, beliefs and social concepts default to `sensitive`.
- Deleting a source removes its passages and candidates. Approved map nodes are kept unless separately removed; the UI states this before deletion.
- The inspector shows the source passage title, exact excerpt, offsets, format and candidate certainty for any approved node.

## Privacy levels and masking

`standard` content is visible. `private` and `sensitive` content is masked until an explicit session-only reveal. `restricted` content never enters the standard 2D or 3D views. Hiding private content also clears selections that would keep it visible.

**Visual masking is a shoulder-surfing control, not encryption.** Local IndexedDB, in-memory state and JSON project exports are not cryptographically protected. Anyone with access to the browser profile or the exported file can read the data. Use OS-level disk encryption, browser profile isolation and a private screen.

## Known limitations

- Extraction is deterministic and shallow: it will miss paraphrases and may propose candidates the user must reject. This is intentional; false precision is worse than a missing candidate.
- Chronology is not inferred from surrounding text or passage order.
- There is no encrypted vault at rest in this release. An AES-GCM passphrase-protected vault is a planned enhancement, not a current feature.
- Import is designed for user-owned material. Do not import text about other people without appropriate consent; the app does not build profiles of third parties.
