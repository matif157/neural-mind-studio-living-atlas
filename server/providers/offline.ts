import {
  BEHAVIOUR_TAXONOMY, COGNITIVE_PATTERNS, EMOTION_TAXONOMY, NEEDS_TAXONOMY,
} from '../../shared/taxonomy';
import type { AiAnalysis } from '../../shared/schemas';
import type { AiProvider, ProviderRequest, ProviderResult } from './types';
import { crisisSupplement, detectSafetyFlags } from '../pipeline/safety';

const ALIASES: Record<string, string[]> = {
  sad: ['sadness'], anxious: ['anxiety'], scared: ['fear'], mad: ['anger'],
  upset: ['sadness', 'anger'], happy: ['happiness'], lonely: ['loneliness'],
  stressed: ['overwhelm', 'anxiety'], tired: ['rest'], exhausted: ['rest'],
};

const sentences = (text: string) => text.split(/(?<=[.!?\n])\s+/).map((item) => item.trim()).filter(Boolean);

function findEvidence(text: string, term: string): string {
  return sentences(text).find((sentence) => sentence.toLowerCase().includes(term.toLowerCase()))?.slice(0, 400) ?? text.slice(0, 400);
}

export function analyzeOffline(text: string): AiAnalysis {
  const lower = text.toLowerCase();
  const flags = detectSafetyFlags(text);
  const expanded = (word: string) => [word, ...(ALIASES[word] ?? [])];

  const emotions = EMOTION_TAXONOMY
    .filter((emotion) => expanded(emotion.name.toLowerCase()).some((term) => lower.includes(term)))
    .slice(0, 6)
    .map((emotion) => ({
      name: emotion.name,
      evidence: findEvidence(text, emotion.name),
      confidence: 0.55,
      intensity: null,
      certainty: lower.includes(emotion.name.toLowerCase()) ? 'directly-stated' as const : 'possible' as const,
    }));

  const thoughtSentences = sentences(text).filter((sentence) => /\bI\b|\bmy\b|\?/.test(sentence)).slice(0, 5);
  const thoughts = thoughtSentences.map((sentence) => ({
    original_text: sentence.slice(0, 400),
    type: /what if|maybe|might|could/i.test(sentence) ? 'future_oriented'
      : /\balways\b|\bnever\b|\bevery time\b/i.test(sentence) ? 'repetitive_thought'
        : /\bshould\b|\bmust\b/i.test(sentence) ? 'self_evaluation' : 'automatic_thought',
    certainty: 'directly-stated' as const,
  }));

  const patterns = COGNITIVE_PATTERNS
    .filter((pattern) => lower.includes(pattern.name.toLowerCase()))
    .slice(0, 4)
    .map((pattern) => ({
      name: `Possible ${pattern.name}`,
      evidence: findEvidence(text, pattern.name),
      confidence: 0.45,
      requires_confirmation: true,
    }));

  const needs = NEEDS_TAXONOMY.filter((need) => lower.includes(need.toLowerCase())).slice(0, 5)
    .map((need) => ({ name: need, evidence: findEvidence(text, need), confidence: 0.45 }));
  const behaviours = BEHAVIOUR_TAXONOMY.filter((behaviour) => lower.includes(behaviour.toLowerCase())).slice(0, 5)
    .map((behaviour) => ({ description: behaviour, evidence: findEvidence(text, behaviour), confidence: 0.45 }));

  const proposedNodes: AiAnalysis['proposed_graph_nodes'] = [];
  const proposedEdges: AiAnalysis['proposed_graph_edges'] = [];
  const add = (kind: AiAnalysis['proposed_graph_nodes'][number]['kind'], label: string, evidence: string, originalText?: string) => {
    const tempId = `n${proposedNodes.length + 1}`;
    proposedNodes.push({ tempId, kind, label: label.slice(0, 200), description: 'Possible concept extracted by offline keyword analysis. Review before keeping.', originalText, confidence: 0.45, evidence: evidence.slice(0, 400) });
    return tempId;
  };

  const situationId = add('situation', 'Described situation', sentences(text)[0] ?? text.slice(0, 200));
  const emotionIds = emotions.map((emotion) => add('emotion', emotion.name, emotion.evidence));
  const thoughtIds = thoughts.map((thought) => add('thought', thought.original_text.slice(0, 120), thought.original_text, thought.original_text));
  for (const pattern of patterns) {
    const id = add('pattern', pattern.name, pattern.evidence);
    if (thoughtIds[0]) proposedEdges.push({
      source: id, target: thoughtIds[0], relation: 'may indicate', weight: 0.4,
      explanation: 'Offline keyword co-occurrence; review carefully.',
      evidence: pattern.evidence,
    });
  }
  const situationEvidence = sentences(text)[0] ?? text.slice(0, 200);
  for (const emotion of emotionIds) proposedEdges.push({
    source: situationId, target: emotion, relation: 'context for', weight: 0.4,
    explanation: 'Both appeared in the same reflection.', evidence: situationEvidence,
  });
  for (const [index, thought] of thoughts.entries()) {
    const thoughtId = thoughtIds[index];
    if (emotionIds[0] && thoughtId) proposedEdges.push({
      source: thoughtId, target: emotionIds[0], relation: 'co-occurs with', weight: 0.4,
      explanation: 'Both appeared in the same reflection.', evidence: thought.original_text,
    });
  }
  for (const need of needs) add('need', need.name, need.evidence);
  for (const behaviour of behaviours) add('behavior', behaviour.description, behaviour.evidence);

  const supplement = crisisSupplement(flags) ?? '';
  const felt = emotions.length ? `Words suggesting ${emotions.map((item) => item.name.toLowerCase()).join(', ')} appeared in what you wrote. ` : '';

  return {
    response_to_user: `OFFLINE RULE-BASED ANALYSIS — no AI model was used. ${felt}These are keyword matches only, not an interpretation of your experience. You can review, edit or discard every proposal. What part of this reflection feels most important to you?${supplement}`,
    conversation_summary: `Offline keyword summary: ${text.slice(0, 220)}`,
    situation: [sentences(text)[0] ?? text.slice(0, 200)],
    emotions,
    thoughts,
    cognitive_patterns: patterns,
    possible_needs: needs,
    reported_behaviours: behaviours,
    alternative_perspectives: ['There may be more than one way to understand this situation; another explanation is worth considering if it fits the facts.'],
    suggested_exercises: emotions.length ? ['emotion identification'] : ['situation analysis'],
    professional_support_considerations: flags.includes('severe-distress') ? ['A qualified professional could help you explore this distress in more depth.'] : [],
    proposed_graph_nodes: proposedNodes,
    proposed_graph_edges: proposedEdges,
    clarifying_questions: ['What was happening immediately before this?', 'Which word best fits what you felt?'],
    safety_flags: flags,
  };
}

function result(text: string): ProviderResult {
  return { text, model: 'offline-rules-v1', offline: true, warnings: ['OFFLINE: deterministic keyword analysis, no external model or network call.'], estimatedCostUsd: 0 };
}

export const offlineProvider: AiProvider = {
  id: 'offline',
  model: 'offline-rules-v1',
  available: true,
  async generate(request: ProviderRequest) {
    return result(JSON.stringify(analyzeOffline(request.userPrompt)));
  },
  async stream(request, onChunk) {
    const output = result(JSON.stringify(analyzeOffline(request.userPrompt)));
    const step = Math.max(1, Math.ceil(output.text.length / 24));
    for (let i = 0; i < output.text.length; i += step) onChunk(output.text.slice(i, i + step));
    return output;
  },
};
