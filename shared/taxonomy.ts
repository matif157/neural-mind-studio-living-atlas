/**
 * Educational taxonomy for the Living Mind Atlas.
 * Every list is a vocabulary for reflection, not a diagnostic checklist.
 * Content is intentionally separate from the AI model so it can be updated independently.
 */
import type { z } from 'zod';
import type { KnowledgeDomain } from './schemas';
import type { MindNodeKind } from './domain';

export interface Taxon { name: string; family: string; definition: string }
const t = (name: string, family: string, definition: string): Taxon => ({ name, family, definition });

export const EMOTION_TAXONOMY: Taxon[] = [
  t('Happiness', 'primary', 'A positive affective state of contentment or wellbeing.'),
  t('Sadness', 'primary', 'An affective state often linked to loss, disappointment or disconnection.'),
  t('Anger', 'primary', 'An affective response often linked to perceived threat, injustice or a blocked goal.'),
  t('Fear', 'primary', 'An anticipatory response to perceived danger or threat.'),
  t('Disgust', 'primary', 'A response of aversion or rejection.'),
  t('Surprise', 'primary', 'A brief response to something unexpected.'),
  t('Anxiety', 'additional', 'Anticipatory distress involving uncertainty and readiness for possible threat.'),
  t('Worry', 'additional', 'Repeated cognitive concern about possible future problems.'),
  t('Loneliness', 'additional', 'A painful sense of social disconnection or unmet belonging.'),
  t('Shame', 'additional', 'A painful self-conscious state involving exposure or feeling inadequate.'),
  t('Guilt', 'additional', 'A self-conscious state concerning a perceived wrongdoing.'),
  t('Regret', 'additional', 'Sorrow or disappointment about a past choice.'),
  t('Jealousy', 'additional', 'Distress related to a perceived threat to a valued relationship.'),
  t('Envy', 'additional', 'Discomfort about something another person has.'),
  t('Frustration', 'additional', 'Irritation when progress is blocked or expectations are unmet.'),
  t('Disappointment', 'additional', 'Sadness when an outcome falls short of hope or expectation.'),
  t('Hopelessness', 'additional', 'A sense that improvement is unlikely; a serious signal for supportive contact.'),
  t('Helplessness', 'additional', 'A sense of having little control over a situation.'),
  t('Grief', 'additional', 'A response to loss that can include sadness, yearning and adjustment.'),
  t('Embarrassment', 'additional', 'A brief self-conscious state after a social misstep.'),
  t('Pride', 'additional', 'A positive self-conscious feeling linked to accomplishment or valued identity.'),
  t('Gratitude', 'additional', 'Appreciation of something valued or supportive.'),
  t('Compassion', 'additional', 'Concern for suffering paired with a wish to alleviate it.'),
  t('Empathy', 'additional', 'Resonance with or understanding of another person\'s experience.'),
  t('Love', 'additional', 'Affection, attachment and care toward a person or thing.'),
  t('Affection', 'additional', 'A feeling of warmth and fondness.'),
  t('Curiosity', 'additional', 'Interest that supports exploration and learning.'),
  t('Excitement', 'additional', 'High-energy anticipation of something rewarding or novel.'),
  t('Hope', 'additional', 'Anticipation of a possible positive outcome.'),
  t('Confidence', 'additional', 'A sense of capability or trust in one\'s approach.'),
  t('Calmness', 'additional', 'A lower-arousal state of steadiness.'),
  t('Relief', 'additional', 'A positive shift when a threat or demand eases.'),
  t('Contentment', 'additional', 'A quiet sense of sufficiency and ease.'),
  t('Confusion', 'additional', 'Difficulty making sense of information or experience.'),
  t('Overwhelm', 'additional', 'A sense that demands exceed available capacity.'),
  t('Nostalgia', 'additional', 'A bittersweet longing for a remembered time or place.'),
  t('Resentment', 'additional', 'Lingering irritation about a perceived unfairness.'),
  t('Insecurity', 'additional', 'Uncertainty about safety, belonging or worth in a situation.'),
];

export const THOUGHT_TYPES: Taxon[] = [
  t('automatic_thought', 'thought', 'A brief, often unintentional thought that appears in response to a situation.'),
  t('intrusive_thought', 'thought', 'An unwanted thought that recurs despite an attempt to set it aside.'),
  t('repetitive_thought', 'thought', 'A thought that returns across moments or days.'),
  t('positive_thought', 'thought', 'A thought experienced as supportive, appreciative or hopeful.'),
  t('negative_thought', 'thought', 'A thought experienced as critical, threatening or discouraging.'),
  t('future_oriented', 'thought', 'A thought about what may happen next.'),
  t('past_oriented', 'thought', 'A thought about what has already happened.'),
  t('self_reflective', 'thought', 'A thought that takes one\'s own experience as the object of attention.'),
  t('imaginary_scenario', 'thought', 'A mental simulation of an event that has not occurred.'),
  t('catastrophic_prediction', 'thought', 'A prediction that the worst possible outcome will occur.'),
  t('social_comparison', 'thought', 'A thought comparing oneself with another person.'),
  t('self_evaluation', 'thought', 'A judgement about oneself.'),
  t('fear_based_assumption', 'thought', 'An assumption treated as true because something feels threatening.'),
  t('motivational_thought', 'thought', 'A thought that supports movement toward a goal.'),
  t('decision_thought', 'thought', 'A thought involved in weighing options.'),
  t('uncertainty_thought', 'thought', 'A thought about not knowing or not being able to predict.'),
  t('relationship_thought', 'thought', 'A thought about a relationship or interaction.'),
  t('identity_thought', 'thought', 'A thought about who one is or is becoming.'),
  t('achievement_thought', 'thought', 'A thought about performance, success or failure.'),
  t('existential_thought', 'thought', 'A thought about meaning, mortality or one\'s place in the world.'),
];

export const COGNITIVE_PATTERNS: Taxon[] = [
  t('Rumination', 'possible-pattern', 'Repeated reflection on distress without new understanding or action.'),
  t('Catastrophizing', 'possible-pattern', 'Giving disproportionate attention to the worst possible outcome.'),
  t('All-or-nothing thinking', 'possible-pattern', 'Seeing situations in extreme either/or categories.'),
  t('Overgeneralization', 'possible-pattern', 'Treating one event as evidence of a universal rule.'),
  t('Mental filtering', 'possible-pattern', 'Focusing narrowly on one aspect of an experience.'),
  t('Discounting positive experiences', 'possible-pattern', 'Treating positive evidence as not counting.'),
  t('Mind-reading', 'possible-pattern', 'Assuming knowledge of another person\'s thoughts or motives.'),
  t('Fortune-telling', 'possible-pattern', 'Treating a prediction as already known.'),
  t('Emotional reasoning', 'possible-pattern', 'Treating a feeling as direct evidence of a fact.'),
  t('Personalization', 'possible-pattern', 'Assuming disproportionate personal responsibility for an outcome.'),
  t('Labelling', 'possible-pattern', 'Replacing a specific behaviour with a global label.'),
  t('Should-statements', 'possible-pattern', 'Rigid rules about how oneself or others must behave.'),
  t('Self-blame', 'possible-pattern', 'Attributing responsibility for distress to oneself without evidence.'),
  t('Perfectionism', 'possible-pattern', 'Requiring flawlessness as a condition of adequacy.'),
  t('Reassurance seeking', 'possible-pattern', 'Repeated attempts to obtain certainty from others.'),
  t('Avoidance', 'possible-pattern', 'Moving away from a cue or situation, often with short-term relief.'),
  t('Negative self-comparison', 'possible-pattern', 'Repeatedly comparing unfavourably with others.'),
  t('Repeated hypothetical scenarios', 'possible-pattern', 'Replaying "what if" sequences without resolution.'),
  t('Confirmation bias', 'possible-pattern', 'Noticing evidence that supports an existing view while overlooking other evidence.'),
  t('Attentional bias', 'possible-pattern', 'Selectively attending to a particular class of cues.'),
  t('Self-criticism', 'possible-pattern', 'A harsh evaluative inner dialogue.'),
  t('Cognitive reappraisal', 'constructive-process', 'Reconsidering the meaning of a situation using context and alternative explanations.'),
  t('Balanced thinking', 'constructive-process', 'Including multiple kinds of evidence rather than one extreme.'),
  t('Perspective taking', 'constructive-process', 'Considering a situation from another viewpoint without claiming certainty.'),
  t('Problem solving', 'constructive-process', 'Defining a problem and identifying possible actionable steps.'),
  t('Reality testing', 'constructive-process', 'Comparing an interpretation with available evidence.'),
  t('Self-compassion', 'constructive-process', 'Responding to difficulty with honesty and care rather than contempt.'),
  t('Emotional acceptance', 'constructive-process', 'Allowing an emotion to be present without immediately judging or removing it.'),
  t('Reflective thinking', 'constructive-process', 'Noticing and examining one\'s own mental processes.'),
  t('Metacognition', 'constructive-process', 'Thinking about how one is thinking, including the limits of certainty.'),
  t('Flexible thinking', 'constructive-process', 'Updating an interpretation when new information appears.'),
  t('Evidence-based reconsideration', 'constructive-process', 'Adjusting a view in light of actual observations.'),
];

export const MEMORY_TYPES: string[] = [
  'Episodic memory', 'Autobiographical memory', 'Positive memory', 'Difficult experience',
  'Childhood experience', 'Relationship memory', 'Achievement memory', 'Emotional memory',
  'Repeatedly recalled experience', 'Future expectation', 'User-defined important memory',
];

export const BELIEF_TYPES: string[] = [
  'Core belief', 'Self-belief', 'Belief about other people', 'Belief about relationships',
  'Belief about success', 'Belief about failure', 'Personal value', 'Identity',
  'Self-image', 'Confidence', 'Personal boundary', 'Expectation', 'Motivation',
  'Goal', 'Personal strength', 'Source of meaning',
];

export const NEEDS_TAXONOMY: string[] = [
  'Safety', 'Emotional security', 'Belonging', 'Connection', 'Acceptance', 'Autonomy',
  'Respect', 'Achievement', 'Recognition', 'Competence', 'Rest', 'Stability', 'Privacy',
  'Meaning', 'Creativity', 'Personal growth', 'Independence',
];

export const BEHAVIOUR_TAXONOMY: string[] = [
  'Avoidance', 'Withdrawal', 'Communication', 'Procrastination', 'Reassurance seeking',
  'Habit formation', 'Emotional regulation', 'Social interaction', 'Impulsive reaction',
  'Problem-solving behaviour', 'Healthy coping', 'Unhelpful coping', 'Daily routine',
  'Sleep-related behaviour', 'Exercise', 'Work habits', 'Learning behaviour',
];

export const CONCEPT_TO_KIND: Record<string, MindNodeKind> = Object.fromEntries([
  ...EMOTION_TAXONOMY.map((item) => [item.name.toLowerCase(), 'emotion' as MindNodeKind]),
  ...COGNITIVE_PATTERNS.map((item) => [item.name.toLowerCase(), 'pattern' as MindNodeKind]),
  ...NEEDS_TAXONOMY.map((item) => [item.toLowerCase(), 'need' as MindNodeKind]),
  ...BEHAVIOUR_TAXONOMY.map((item) => [item.toLowerCase(), 'behavior' as MindNodeKind]),
]);

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
  { id: 'psychiatry', name: 'Psychiatry', family: 'medical-clinical', definition: 'A medical specialty concerned with mental disorders, their assessment and treatment.', scope: 'Clinical evaluation, diagnosis and treatment planning by licensed clinicians.', concepts: ['diagnostic assessment', 'treatment planning', 'risk assessment'], limitations: 'This app cannot perform any of these functions or recommend medication.', related: ['neurology', 'clinical-psychology'], exercises: [] },
  { id: 'neurology', name: 'Neurology', family: 'medical-clinical', definition: 'The medical study of the nervous system.', scope: 'Diagnosis and treatment of neurological conditions.', concepts: ['nervous system', 'neuroanatomy', 'clinical neurology'], limitations: 'Conceptual graph edges are not neurological findings.', related: ['neuroscience', 'neuropsychiatry'], exercises: ['neuron-anatomy'] },
  { id: 'neuropsychiatry', name: 'Neuropsychiatry', family: 'medical-clinical', definition: 'An interdisciplinary field addressing the interface of neurological and psychiatric phenomena.', scope: 'Specialist clinical assessment and care.', concepts: ['brain-behaviour relationships', 'clinical interview'], limitations: 'Not applicable to conversation-based reflection.', related: ['neurology', 'psychiatry'], exercises: [] },
  { id: 'psychiatric-nursing', name: 'Psychiatric Nursing', family: 'medical-clinical', definition: 'Nursing practice focused on people experiencing mental health challenges.', scope: 'Care planning, observation, medication administration and support within licensed settings.', concepts: ['therapeutic relationship', 'safety planning', 'care coordination'], limitations: 'The app is not a care setting and cannot monitor users.', related: ['psychiatry'], exercises: [] },
  { id: 'clinical-psychology', name: 'Clinical Psychology', family: 'psychology', definition: 'The science and practice of understanding and addressing psychological distress.', scope: 'Assessment, formulation and evidence-informed intervention by qualified professionals.', concepts: ['case formulation', 'evidence-based practice', 'emotion'], limitations: 'A personal reflection graph is not a psychological assessment.', related: ['counseling-psychology', 'cbt'], exercises: ['thought-record'] },
  { id: 'counseling-psychology', name: 'Counselling Psychology', family: 'psychology', definition: 'A field emphasising strengths, development and supportive therapeutic relationships.', scope: 'Professional counselling across life contexts.', concepts: ['strengths', 'meaning', 'relationship'], limitations: 'The AI companion is not a counsellor.', related: ['clinical-psychology', 'psychotherapy'], exercises: ['values-clarification'] },
  { id: 'neuropsychology', name: 'Neuropsychology', family: 'psychology', definition: 'The study of relationships between brain function and behaviour.', scope: 'Formal assessment by trained professionals.', concepts: ['attention', 'memory', 'executive function'], limitations: 'No inference about brain function is made from this app.', related: ['cognitive-psychology', 'neuroscience'], exercises: [] },
  { id: 'cognitive-psychology', name: 'Cognitive Psychology', family: 'psychology', definition: 'The scientific study of mental processes such as attention, memory and reasoning.', scope: 'Experimental and applied research on cognition.', concepts: ['appraisal', 'schemas', 'attention'], limitations: 'A pattern label is a hypothesis about interpretation, not a measured cognitive process.', related: ['cognitive-science', 'behavioural-psychology'], exercises: ['reality-testing'] },
  { id: 'behavioural-psychology', name: 'Behavioural Psychology', family: 'psychology', definition: 'The study of behaviour in relation to environmental events and learning.', scope: 'Behavioural assessment and intervention.', concepts: ['reinforcement', 'habits', 'avoidance'], limitations: 'The app does not modify behaviour or deliver treatment.', related: ['cognitive-psychology', 'cbt'], exercises: ['habit-tracker'] },
  { id: 'developmental-psychology', name: 'Developmental Psychology', family: 'psychology', definition: 'The study of psychological change across the lifespan.', scope: 'Research and professional practice concerning development.', concepts: ['attachment', 'life stages', 'developmental context'], limitations: 'The app never infers childhood events or developmental history.', related: ['educational-psychology'], exercises: [] },
  { id: 'educational-psychology', name: 'Educational Psychology', family: 'psychology', definition: 'The study of learning, instruction and individual differences in educational settings.', scope: 'Learning support and assessment.', concepts: ['learning strategies', 'motivation'], limitations: 'Exercise content here is general education, not individually tailored teaching.', related: ['learning-science', 'developmental-psychology'], exercises: ['goal-setting'] },
  { id: 'forensic-psychology', name: 'Forensic Psychology', family: 'psychology', definition: 'Psychology applied to legal and criminal justice contexts.', scope: 'Specialist assessment and consultation.', concepts: ['legal context', 'evaluation'], limitations: 'Out of scope for this application; included as an educational domain only.', related: [], exercises: [] },
  { id: 'industrial-organizational-psychology', name: 'Industrial-Organizational Psychology', family: 'psychology', definition: 'Psychology applied to workplaces and organisations.', scope: 'Selection, training, wellbeing and organisational behaviour.', concepts: ['work design', 'team dynamics'], limitations: 'Not an employment assessment tool.', related: ['health-psychology'], exercises: [] },
  { id: 'health-psychology', name: 'Health Psychology', family: 'psychology', definition: 'The study of psychological factors in health and illness.', scope: 'Behavioural and psychosocial aspects of physical health.', concepts: ['stress', 'health behaviour', 'adjustment'], limitations: 'Body-signal nodes are user-observed and never medical findings.', related: ['behavioural-psychology'], exercises: ['breathing'] },
  { id: 'sports-psychology', name: 'Sports Psychology', family: 'psychology', definition: 'Psychological aspects of sport, exercise and performance.', scope: 'Performance and wellbeing support for athletes.', concepts: ['focus', 'motivation', 'performance routines'], limitations: 'Not a performance assessment or coaching substitute.', related: ['health-psychology'], exercises: ['goal-setting'] },
  { id: 'psychotherapy', name: 'Psychotherapy', family: 'therapy-support', definition: 'Structured, professional psychological support delivered through a therapeutic relationship.', scope: 'Licensed or accredited practice.', concepts: ['therapeutic alliance', 'formulation'], limitations: 'The AI companion provides education and reflection, not psychotherapy.', related: ['cbt', 'dbt'], exercises: [] },
  { id: 'cbt', name: 'Cognitive Behavioural Therapy', family: 'therapy-support', definition: 'A structured approach examining links between thoughts, feelings and behaviour.', scope: 'Evidence-informed professional intervention and self-help education.', concepts: ['automatic thoughts', 'behavioural experiments', 'reappraisal'], limitations: 'Pattern labels in this app are possible interpretations, not CBT formulations or treatment.', related: ['cognitive-psychology'], exercises: ['thought-record', 'reappraisal'] },
  { id: 'dbt', name: 'Dialectical Behaviour Therapy', family: 'therapy-support', definition: 'A structured approach emphasising emotion regulation, distress tolerance and interpersonal effectiveness.', scope: 'Professional skills training and therapy.', concepts: ['distress tolerance', 'emotion regulation'], limitations: 'These exercises are educational skills practice, not DBT treatment.', related: ['psychotherapy'], exercises: ['grounding', 'breathing'] },
  { id: 'psychodynamic', name: 'Psychodynamic approaches', family: 'therapy-support', definition: 'Approaches exploring how past relationships and unconscious processes may shape present experience.', scope: 'Professional long-term or short-term psychotherapy.', concepts: ['transference', 'defence', 'meaning'], limitations: 'This app never infers unconscious material or hidden memories.', related: ['psychotherapy'], exercises: [] },
  { id: 'clinical-social-work', name: 'Clinical Social Work', family: 'therapy-support', definition: 'Professional social work practice addressing mental health within social and environmental contexts.', scope: 'Assessment, advocacy and support in licensed settings.', concepts: ['systems', 'advocacy', 'resources'], limitations: 'The app cannot connect users to case management or crisis services.', related: ['psychotherapy'], exercises: [] },
  { id: 'marriage-family-therapy', name: 'Marriage and Family Therapy', family: 'therapy-support', definition: 'Professional support focused on relationship and family systems.', scope: 'Couples, family and systemic intervention.', concepts: ['communication patterns', 'family systems'], limitations: 'Relationship nodes represent the user\'s own descriptions, not a systemic assessment.', related: ['psychotherapy'], exercises: ['communication-practice'] },
  { id: 'addiction-counselling', name: 'Addiction Counselling', family: 'therapy-support', definition: 'Specialised support for substance use and behavioural addictions.', scope: 'Professional assessment and counselling.', concepts: ['craving', 'relapse prevention'], limitations: 'No substance-use assessment or treatment is offered here.', related: ['clinical-social-work'], exercises: [] },
  { id: 'expressive-arts', name: 'Expressive and Creative Arts Therapies', family: 'therapy-support', definition: 'Professional use of creative media within a therapeutic relationship.', scope: 'Accredited arts therapy practice.', concepts: ['creative expression', 'symbolisation'], limitations: 'Reflection prompts are educational, not art therapy.', related: ['psychotherapy'], exercises: ['values-clarification'] },
  { id: 'neuroscience', name: 'Neuroscience', family: 'neuroscience-cognitive', definition: 'The scientific study of the nervous system.', scope: 'Biological explanation across levels from cells to systems.', concepts: ['neuron', 'synapse', 'neurotransmission'], limitations: 'Graph nodes are conceptual; they do not correspond to individual neurons.', related: ['neuroanatomy'], exercises: ['neuron-anatomy'] },
  { id: 'cognitive-science', name: 'Cognitive Science', family: 'neuroscience-cognitive', definition: 'Interdisciplinary study of mind and intelligence.', scope: 'Cognition, perception, language, memory and computation.', concepts: ['representation', 'prediction', 'attention'], limitations: 'No model of the user\'s biology is inferred.', related: ['cognitive-psychology'], exercises: ['metacognition'] },
  { id: 'memory-science', name: 'Memory Science', family: 'neuroscience-cognitive', definition: 'Study of encoding, consolidation, retention and retrieval.', scope: 'Experimental research on memory processes.', concepts: ['reconstructive memory', 'retrieval cues'], limitations: 'The app never recovers or verifies memories.', related: ['neuroscience'], exercises: ['emotion-identification'] },
  { id: 'learning-science', name: 'Learning Science', family: 'neuroscience-cognitive', definition: 'Interdisciplinary study of how people learn.', scope: 'Evidence-informed learning design.', concepts: ['practice', 'feedback', 'transfer'], limitations: 'Exercise content is general education, not personalised instruction.', related: ['educational-psychology'], exercises: ['habit-tracker'] },
  { id: 'attention-perception', name: 'Attention and Perception', family: 'neuroscience-cognitive', definition: 'Study of how sensory information is selected and interpreted.', scope: 'Experimental cognitive science.', concepts: ['selective attention', 'salience'], limitations: 'Attentional bias nodes are user-observed hypotheses only.', related: ['cognitive-science'], exercises: ['grounding'] },
  { id: 'neuroplasticity', name: 'Neuroplasticity', family: 'neuroscience-cognitive', definition: 'The nervous system\'s capacity for structural and functional change.', scope: 'Neuroscience research and rehabilitation.', concepts: ['learning-dependent change', 'recovery'], limitations: 'Changing a graph edge does not measure or cause neural change.', related: ['neuroscience'], exercises: ['habit-tracker'] },
  { id: 'brain-body', name: 'Brain-Body Relationships', family: 'neuroscience-cognitive', definition: 'Bidirectional interactions between nervous system, body and environment.', scope: 'Psychophysiology and health science.', concepts: ['autonomic arousal', 'interoception'], limitations: 'Body signals are not interpreted as medical symptoms.', related: ['health-psychology'], exercises: ['breathing'] },
  { id: 'occupational-therapy', name: 'Occupational Therapy', family: 'neuroscience-cognitive', definition: 'Health profession supporting participation in meaningful daily activities.', scope: 'Professional assessment and intervention.', concepts: ['occupation', 'adaptation', 'daily routine'], limitations: 'Routine nodes are self-recorded, not an OT assessment.', related: ['health-psychology'], exercises: ['goal-setting'] },
  { id: 'mindfulness', name: 'Mindfulness', family: 'neuroscience-cognitive', definition: 'Paying attention to present experience with a particular quality of openness and non-judgement.', scope: 'Educational practice and professional programmes.', concepts: ['present awareness', 'decentering'], limitations: 'Not a treatment or guarantee of benefit.', related: ['meditation', 'dbt'], exercises: ['mindful-breathing'] },
  { id: 'meditation', name: 'Meditation', family: 'neuroscience-cognitive', definition: 'A family of practices involving sustained attention or awareness.', scope: 'Educational and contemplative practice.', concepts: ['attention regulation', 'observing'], limitations: 'Can be uncomfortable for some people; stop if distress increases.', related: ['mindfulness'], exercises: ['mindful-breathing'] },
  { id: 'breathwork', name: 'Breathwork', family: 'neuroscience-cognitive', definition: 'Practices that deliberately regulate breathing.', scope: 'Educational self-regulation activity.', concepts: ['paced breathing', 'arousal modulation'], limitations: 'Do not use in place of urgent medical care; stop if light-headed.', related: ['brain-body'], exercises: ['breathing'] },
];

export const EXERCISES: z.input<typeof import('./schemas').exerciseSchema>[] = [
  { id: 'thought-record', title: 'Thought journaling', purpose: 'Record a situation and the thoughts that appeared without judging them.', instructions: ['Describe the situation in one sentence.', 'Write the exact words of the thought.', 'Name any emotions and their self-reported intensity.', 'Notice what evidence supports and does not support the thought.'], durationMinutes: 10, questions: ['What was happening?', 'What exactly went through your mind?', 'What else could be true?'], relatedKinds: ['thought', 'emotion', 'situation'] },
  { id: 'emotion-identification', title: 'Emotion identification', purpose: 'Build a more precise vocabulary for a felt experience.', instructions: ['Notice a sensation or feeling.', 'Choose up to three emotion words that fit.', 'Rate each intensity yourself, if you wish.', 'Describe what the emotion may be about.'] , durationMinutes: 6, questions: ['Which word fits best?', 'Is more than one emotion present?'], relatedKinds: ['emotion', 'body'] },
  { id: 'situation-analysis', title: 'Situation analysis', purpose: 'Separate observable facts from interpretation.', instructions: ['Describe what was observed, like a camera would.', 'List your interpretation separately.', 'Mark what is unknown.'], durationMinutes: 8, questions: ['What would a neutral observer report?', 'What am I adding to the facts?'], relatedKinds: ['situation', 'thought'] },
  { id: 'reappraisal', title: 'Cognitive reappraisal', purpose: 'Consider an additional, balanced interpretation.', instructions: ['Write your first interpretation.', 'List evidence for and against it.', 'Write one fair alternative.', 'Notice how each interpretation feels.'] , durationMinutes: 10, questions: ['What is another plausible explanation?', 'What would I say to a friend?'], relatedKinds: ['thought', 'pattern', 'emotion'] },
  { id: 'evidence-examination', title: 'Evidence examination', purpose: 'Check an interpretation against available observations.', instructions: ['State the interpretation.', 'List supporting observations.', 'List observations that do not fit.', 'Revise the statement if appropriate.'], durationMinutes: 9, questions: ['What evidence is missing?'], relatedKinds: ['thought', 'belief'] },
  { id: 'balanced-thought', title: 'Balanced-thought generation', purpose: 'Write a statement that includes the full context.', instructions: ['Name the extreme version of the thought.', 'Add the strongest fair qualifier.', 'Write a balanced version you can actually believe.'], durationMinutes: 7, questions: ['Which words make the thought more accurate?'], relatedKinds: ['thought'] },
  { id: 'values-clarification', title: 'Values clarification', purpose: 'Identify principles that matter to you in this situation.', instructions: ['List five important principles.', 'Choose the two most relevant here.', 'Describe one small action consistent with one value.'], durationMinutes: 12, questions: ['What matters most in this moment?'], relatedKinds: ['value', 'goal'] },
  { id: 'self-compassion', title: 'Self-compassion reflection', purpose: 'Respond to difficulty with fairness rather than harsh judgement.', instructions: ['Write the critical sentence as it appears.', 'Name the human difficulty underneath it.', 'Write a supportive but honest response.'], durationMinutes: 8, questions: ['What would a caring and honest person say?'], relatedKinds: ['pattern', 'belief', 'emotion'] },
  { id: 'mindful-breathing', title: 'Mindful breathing', purpose: 'Briefly orient attention to present experience.', instructions: ['Sit comfortably.', 'Notice the breath without changing it.', 'When attention moves, gently return.'], durationMinutes: 4, questions: ['What did you notice?'], relatedKinds: ['body', 'coping'], caution: 'Educational practice; stop if it increases distress.' },
  { id: 'grounding', title: 'Grounding', purpose: 'Reconnect attention with the immediate environment.', instructions: ['Name five things you can see.', 'Name four things you can feel.', 'Name three things you can hear.', 'Notice one slow exhale.'], durationMinutes: 3, questions: ['What helped you feel more present?'], relatedKinds: ['body', 'coping'] },
  { id: 'habit-tracker', title: 'Habit tracking', purpose: 'Observe a chosen routine over time using your own records.', instructions: ['Choose one specific behaviour.', 'Record when it happens each day.', 'Note context without judging.'], durationMinutes: 2, questions: ['What made the behaviour easier or harder?'], relatedKinds: ['behavior', 'goal'] },
  { id: 'communication-practice', title: 'Communication practice', purpose: 'Prepare a clear, non-accusatory message.', instructions: ['Describe the observable event.', 'State your feeling.', 'State the need or request.', 'Choose a time and channel.'], durationMinutes: 10, questions: ['What specifically would help?'], relatedKinds: ['social', 'need'] },
  { id: 'problem-solving', title: 'Problem solving', purpose: 'Move from worry to a manageable next step.', instructions: ['Define the problem in one sentence.', 'List three possible actions.', 'Choose one small, safe action.', 'Set a time to review.'], durationMinutes: 12, questions: ['What is within your control?'], relatedKinds: ['goal', 'behavior'] },
  { id: 'goal-setting', title: 'Personal goal setting', purpose: 'Translate a direction into a specific, revisable step.', instructions: ['State the direction.', 'Define one observable first step.', 'Choose a review date.'], durationMinutes: 8, questions: ['What would count as progress?'], relatedKinds: ['goal', 'value'] },
  { id: 'neuron-anatomy', title: 'Neuronal anatomy explorer', purpose: 'Learn the basic structures of a biological neuron and why they differ from conceptual graph nodes.', instructions: ['Explore each labelled structure.', 'Read how signals pass between neurons.', 'Return to the mind map and identify which parts are user-defined concepts.'], durationMinutes: 6, questions: ['Why is a concept node not a biological neuron?'], relatedKinds: ['knowledge'] },
  { id: 'metacognition', title: 'Metacognitive check', purpose: 'Notice how you are thinking about a situation.', instructions: ['Name the current thought.', 'Notice the certainty you assign to it.', 'Ask what could change your mind.'], durationMinutes: 5, questions: ['How sure am I, and why?'], relatedKinds: ['thought', 'pattern'] },
];

export const NEURON_ANATOMY = [
  { id: 'dendrite', label: 'Dendrites', description: 'Branch-like structures that receive signals from other neurons. They are biological structures, not graph edges.' },
  { id: 'soma', label: 'Soma', description: 'The cell body that maintains the neuron and integrates incoming signals.' },
  { id: 'axon', label: 'Axon', description: 'A projection that carries signals away from the cell body.' },
  { id: 'myelin', label: 'Myelin', description: 'An insulating layer that can increase the speed of signal propagation in some axons.' },
  { id: 'synapse', label: 'Synapse', description: 'A junction where chemical or electrical signals pass between neurons.' },
  { id: 'communication', label: 'Synaptic communication', description: 'Neurotransmitters cross the synaptic cleft and bind to receptors; meaning and emotion arise from distributed systems, not a single synapse.' },
];

export const CRISIS_MESSAGE = 'If you may be in immediate danger or could harm yourself or someone else, please contact your local emergency services now, or go to the nearest emergency department. If you can, tell a trusted person what is happening. This application is not a crisis-monitoring service and cannot respond to emergencies.';
