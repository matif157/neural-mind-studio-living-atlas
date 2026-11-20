import type { MindScenario } from '../types/mind';

export const scenarios: MindScenario[] = [
  {
    id: 'anxiety-loop', title: 'Anxiety loop', subtitle: 'Threat prediction → body alarm → avoidance',
    description: 'A conceptual example of how uncertainty, threat predictions, body arousal and avoidance can reinforce one another.',
    nodeIds: ['uncertainty', 'what-if', 'anxiety', 'chest-tight', 'catastrophizing', 'avoidance', 'safety-need', 'reappraisal', 'chosen-action'], color: '#ff9567',
  },
  {
    id: 'regret-loop', title: 'Regret & rumination', subtitle: 'Memory → replay → self-criticism',
    description: 'A past event is recalled, interpreted through self-judgement and replayed. Reappraisal opens another possible route.',
    nodeIds: ['past-event', 'regret', 'self-criticism', 'rumination', 'shame', 'self-compassion', 'reappraisal', 'chosen-action'], color: '#b99aff',
  },
  {
    id: 'sadness-care', title: 'Sadness & care', subtitle: 'Loss → sadness → need for connection',
    description: 'A loss or disappointment can bring sadness and low energy while signalling needs for care, rest and connection.',
    nodeIds: ['past-event', 'sadness', 'connection-need', 'self-compassion', 'rest-need', 'chosen-action', 'gratitude'], color: '#70a7ff',
  },
  {
    id: 'calm-reset', title: 'Calm & regulation', subtitle: 'Pause → orient → choose a response',
    description: 'A regulation pathway: noticing sensations, naming the experience, meeting a need and choosing a small action.',
    nodeIds: ['present-focus', 'chest-tight', 'calm', 'rest-need', 'slow-breath', 'reappraisal', 'chosen-action'], color: '#59d3c2',
  },
  {
    id: 'joy-expansion', title: 'Joy & motivation', subtitle: 'Meaning → positive emotion → approach',
    description: 'A meaningful activity or connection can support joy, curiosity, energy and approach behaviour.',
    nodeIds: ['joy', 'curiosity', 'gratitude', 'connection-need', 'chosen-action', 'present-focus'], color: '#f5c65e',
  },
];
