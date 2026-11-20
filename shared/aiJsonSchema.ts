import { CERTAINTIES, MIND_NODE_KINDS, MIND_RELATIONS } from './domain';
import { SAFETY_FLAGS } from './schemas';

/** Provider-neutral JSON schema for the AI output contract. Kept separate from the model prompt. */
export const aiResponseJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'response_to_user', 'conversation_summary', 'situation', 'emotions', 'thoughts',
    'cognitive_patterns', 'possible_needs', 'reported_behaviours', 'alternative_perspectives',
    'suggested_exercises', 'professional_support_considerations', 'proposed_graph_nodes',
    'proposed_graph_edges', 'clarifying_questions', 'safety_flags',
  ],
  properties: {
    response_to_user: { type: 'string' },
    conversation_summary: { type: 'string' },
    situation: { type: 'array', items: { type: 'string' } },
    emotions: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'evidence', 'confidence', 'intensity', 'certainty'],
        properties: {
          name: { type: 'string' }, evidence: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          intensity: { type: 'number', nullable: true, minimum: 0, maximum: 1 },
          certainty: { type: 'string', enum: [...CERTAINTIES] },
        },
      },
    },
    thoughts: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['original_text', 'type', 'certainty'],
        properties: {
          original_text: { type: 'string' }, normalized_text: { type: 'string' },
          type: { type: 'string' }, certainty: { type: 'string', enum: [...CERTAINTIES] },
        },
      },
    },
    cognitive_patterns: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'evidence', 'confidence', 'requires_confirmation'],
        properties: {
          name: { type: 'string' }, evidence: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          requires_confirmation: { type: 'boolean' },
        },
      },
    },
    possible_needs: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'evidence', 'confidence'],
        properties: {
          name: { type: 'string' }, evidence: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    reported_behaviours: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['description', 'evidence', 'confidence'],
        properties: {
          description: { type: 'string' }, evidence: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    alternative_perspectives: { type: 'array', items: { type: 'string' } },
    suggested_exercises: { type: 'array', items: { type: 'string' } },
    professional_support_considerations: { type: 'array', items: { type: 'string' } },
    proposed_graph_nodes: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['tempId', 'kind', 'label', 'description', 'confidence', 'evidence'],
        properties: {
          tempId: { type: 'string' }, kind: { type: 'string', enum: [...MIND_NODE_KINDS] },
          label: { type: 'string' }, description: { type: 'string' },
          originalText: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
        },
      },
    },
    proposed_graph_edges: {
      type: 'array', additionalProperties: false,
      items: {
        type: 'object', additionalProperties: false,
        required: ['source', 'target', 'relation', 'weight', 'explanation'],
        properties: {
          source: { type: 'string' }, target: { type: 'string' },
          relation: { type: 'string', enum: [...MIND_RELATIONS] },
          weight: { type: 'number', minimum: 0, maximum: 1 }, explanation: { type: 'string' },
        },
      },
    },
    clarifying_questions: { type: 'array', items: { type: 'string' } },
    safety_flags: { type: 'array', items: { type: 'string', enum: [...SAFETY_FLAGS] } },
  },
};
