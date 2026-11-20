# Scientific scope and conceptual model

## Purpose

The Living Mind Atlas is a reflection and education tool. Its graph is a **user-authored conceptual model** of experiences, interpretations and relationships. It is not a model of the user's biology and cannot observe thoughts, emotions, memories or neural activity.

## Distinct concept classes

The application keeps 18 typed node classes so that different kinds of information are not conflated:

`root`, `emotion`, `thought`, `pattern`, `memory`, `belief`, `identity`, `need`, `behavior`, `context`, `body`, `goal`, `value`, `coping`, `social`, `situation`, `exercise`, `knowledge`.

- **Emotion:** a felt affective state such as joy, sadness, anxiety, anger or calm. States change; they are not personality traits.
- **Thought:** a mental event. Original wording is stored separately from any normalised or balanced version.
- **Pattern:** a possible recurring way of attending, interpreting or responding. Always a hypothesis requiring confirmation.
- **Memory:** an experience the user chose to record. Nothing is recovered, verified or invented.
- **Belief / identity / value:** self-concept and assumptions as stated by the user or marked as an AI hypothesis awaiting review.
- **Need / goal:** prompts for reflection, not facts about what someone requires.
- **Behaviour / coping / social:** user-reported actions, strategies and relationships. Behaviours are never inferred from emotions alone.
- **Body signal:** a noticed sensation. Similar sensations can have many causes; they are not medical findings.
- **Context / situation:** circumstances the user describes.
- **Exercise / knowledge:** structured reflective activities and educational domains with explicit limitations.

Each node records provenance, status, optional confidence, evidence references and timestamps. No field represents a biological measurement.

## Relationship vocabulary

Connections are user-editable hypotheses, for example `activates`, `intensifies`, `soothes`, `arises from`, `recalls`, `reinforces`, `inhibits`, `signals a need`, `leads to`, `reframes`, `supports`, `conflicts with`, `co-occurs with`, `associated with`, `evidenced by`, `part of`, `challenges`, `may indicate`, `context for`, `fulfills`, `contradicts`, `informs`. An edge records the map author's interpretation; it is not proof of causality.

## AI boundaries

Provider output is validated against a strict schema and then passed through a safety pipeline that:

- strips intensity when the user did not state it;
- rejects unknown categories and relation endpoints;
- removes diagnostic and certainty-overstating wording;
- appends crisis support guidance from a fixed message when safety flags appear;
- keeps every cognitive pattern marked as requiring confirmation;
- returns graph changes only as proposals, never as direct mutations.

The offline provider produces deterministic keyword matches and labels them as such. No provider is described as a clinician, counsellor or diagnostic system.

## Neuroscience caveat

Neurons communicate through complex electrical and chemical processes. Real emotion and cognition emerge from distributed, dynamic systems involving many brain regions and body processes. The coloured nodes and directed edges here are an explanatory metaphor for reflection and education. They do **not** correspond one-to-one with neurons, neurotransmitters, brain regions or a person's measured neural activity. Animated signals are illustrative, not recordings.

A psychiatric or neurological disorder is not an emotion category. If a user adds a health-related context node, it represents their own label; the application cannot diagnose, assess or monitor a condition.
