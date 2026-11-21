# Safety protocol

This application is a reflection and education tool. It is **not** a crisis-monitoring service, a clinical assessment, or a predictive risk system. It cannot respond to emergencies.

## Detection is rule-based and inspectable

`shared/safety.ts` is shared by the browser importer and the server pipeline. It uses transparent regular expressions and returns:

- `flags` — the same flag vocabulary used elsewhere in the app (`self-harm`, `harm-to-others`, `medical-symptoms`, `severe-distress`, `possible-crisis`);
- `categories` — the matched concern categories;
- `immediateRisk` — true only when *currently stated* intent, a plan, access to means, or immediate danger is present;
- `evidence` — the exact matched phrases, never a paraphrase;
- `denied` — phrases that were explicitly denied, e.g. "I would never kill myself";
- `unsafeRequests` — requests to monitor, locate, coerce or retaliate against another person;
- `guidance` — fixed support text, or `null`.

Explicit denials and clearly historical disclosures ("years ago I used to…") suppress the interrupt. The detector does **not** infer severity from trauma disclosure, dissociation, relationship conflict or abstract mention of a topic.

There is deliberately **no** probability, severity scale, "risk score", or high/medium/low risk label anywhere in the code or response text. `containsRiskLabel` is exported so tests can assert this property.

## The gate

`server/pipeline/analyze.ts` calls `assessSafety` on the joined message text **before** provider selection:

- If `immediateRisk` is true, ordinary analysis is skipped entirely. No provider is called, no tokens are spent, and no graph proposals are generated. The response has `model: 'safety-gate-v1'`, `offline: true`, zero estimated cost, empty proposal arrays, and a support-only message directing the person to trusted human support and local emergency services.
- If non-immediate safety language is present, analysis may continue, but the final response is prefixed with an explicit support note and the response metadata carries a safety warning.
- Requests to monitor another person, obtain means, coerce someone or retaliate are refused with an explanation, regardless of emotional content.

`tests/safety.test.ts` covers direct intent, plans and means, harm to others, false-positive control, denials, historical disclosure, medical red flags, diagnostic-language detection, and the API gate's no-provider/no-proposal guarantee.

## What the response tells the user

The interrupt asks the person to focus on the next few minutes: move away from means or the person involved, contact someone who can be physically present, and contact local emergency services or an emergency department if there is any chance of acting on the thoughts. It uses the fixed `CRISIS_MESSAGE` from `shared/taxonomy.ts`.

It does not ask for traumatic details, does not offer interpretation, and does not assign a category.

## Known limitations

- A rule-based detector can miss unusual phrasing and can flag harmless phrasing. It is a conservative interrupt, not a judgement about the person.
- It is not evaluated as a clinical instrument and must not be described as one.
- It cannot detect danger in text the user never enters.
- If there is any immediate danger, contact local emergency services. Do not rely on this application.
