import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/index';
import { analysisRequestSchema } from '../shared/schemas';
import { validateAnalysis } from '../server/pipeline/validate';
import { detectSafetyFlags } from '../server/pipeline/safety';

const app = createApp();

const baseRequest = {
  conversationId: 'test-conversation',
  messages: [{ role: 'user' as const, text: 'I felt anxious when my friend did not reply. I avoid messaging them. Maybe I am not important to them.' }],
  consent: true as const,
  stream: false,
};

describe('API endpoints', () => {
  it('reports health without exposing credentials', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.schemaVersion).toBe(2);
    expect(JSON.stringify(response.body)).not.toMatch(/api[_-]?key/i);
  });

  it('lists providers with availability flags', async () => {
    const response = await request(app).get('/api/providers').expect(200);
    expect(response.body.providers.length).toBe(5);
    expect(response.body.providers.find((item: { id: string }) => item.id === 'offline').available).toBe(true);
  });

  it('rejects requests without explicit AI consent', async () => {
    await request(app).post('/api/analyze').send({ ...baseRequest, consent: false }).expect(400);
  });

  it('returns a validated offline analysis with reviewable proposals', async () => {
    const response = await request(app).post('/api/analyze').send(baseRequest).expect(200);
    const body = response.body;
    expect(body.meta.offline).toBe(true);
    expect(body.analysis.response_to_user).toContain('OFFLINE');
    expect(Array.isArray(body.analysis.proposed_graph_nodes)).toBe(true);
    expect(Array.isArray(body.analysis.proposed_graph_edges)).toBe(true);
    for (const emotion of body.analysis.emotions) expect(emotion.intensity).toBeNull();
    for (const edge of body.analysis.proposed_graph_edges) {
      const ids = new Set([...body.analysis.proposed_graph_nodes.map((node: { tempId: string }) => node.tempId)]);
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });

  it('modifies nothing in the graph: analysis is returned only as data', async () => {
    const response = await request(app).post('/api/analyze').send(baseRequest).expect(200);
    expect(response.body.analysis).not.toHaveProperty('applied');
    expect(response.body.analysis.proposed_graph_nodes.every((node: { kind: string }) => node.kind !== 'root')).toBe(true);
  });
});

describe('AI output validation and safety', () => {
  const requestData = analysisRequestSchema.parse(baseRequest);

  it('rejects malformed JSON', () => {
    expect(() => validateAnalysis('not json', requestData)).toThrow(/valid JSON/);
  });

  it('rejects unsupported relationship types', () => {
    const raw = JSON.stringify({
      ...validAnalysis(),
      proposed_graph_edges: [{ source: 'n1', target: 'n2', relation: 'literally-causes-neural-firing', weight: 0.8, explanation: '' }],
    });
    expect(() => validateAnalysis(raw, requestData)).toThrow(/analysis contract/);
  });

  it('removes unstated intensity values', () => {
    const raw = validAnalysis();
    raw.emotions[0].intensity = 0.99;
    const result = validateAnalysis(JSON.stringify(raw), requestData);
    expect(result.analysis.emotions[0].intensity).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('Intensity'))).toBe(true);
  });

  it('keeps intensity when the user explicitly reported it', () => {
    const withIntensity = analysisRequestSchema.parse({
      ...baseRequest,
      messages: [{ role: 'user', text: 'My sadness is about 8/10 today.' }],
    });
    const raw = validAnalysis();
    raw.emotions[0].intensity = 0.8;
    expect(validateAnalysis(JSON.stringify(raw), withIntensity).analysis.emotions[0].intensity).toBe(0.8);
  });

  it('detects safety language and appends support guidance without diagnosing', () => {
    expect(detectSafetyFlags('I want to kill myself')).toContain('self-harm');
    const flagged = analysisRequestSchema.parse({
      ...baseRequest,
      messages: [{ role: 'user', text: 'I want to kill myself tonight.' }],
    });
    const raw = validAnalysis();
    raw.response_to_user = 'You have depression and you should take medication.';
    const result = validateAnalysis(JSON.stringify(raw), flagged);
    expect(result.analysis.safety_flags).toContain('possible-crisis');
    expect(result.analysis.response_to_user).toContain('emergency services');
    expect(result.analysis.response_to_user).not.toMatch(/you have depression/i);
  });
});

function validAnalysis() {
  return {
    response_to_user: 'Thank you for sharing. What would help you feel more connected?',
    conversation_summary: 'A reflection about a friend not replying.',
    situation: ['A friend did not reply.'],
    emotions: [{ name: 'Sadness', evidence: 'I felt sad', confidence: 0.7, intensity: null, certainty: 'possible' }],
    thoughts: [{ original_text: 'I am not important to them', type: 'automatic_thought', certainty: 'possible' }],
    cognitive_patterns: [{ name: 'Possible mind-reading', evidence: 'I am not important to them', confidence: 0.6, requires_confirmation: true }],
    possible_needs: [{ name: 'Connection', evidence: 'friend did not reply', confidence: 0.6 }],
    reported_behaviours: [{ description: 'Withdrawal', evidence: 'I avoid messaging them', confidence: 0.6 }],
    alternative_perspectives: ['They may be busy.'],
    suggested_exercises: ['communication practice'],
    professional_support_considerations: [],
    proposed_graph_nodes: [
      { tempId: 'n1', kind: 'thought', label: 'I am not important to them', description: '', confidence: 0.6, evidence: 'quote' },
      { tempId: 'n2', kind: 'emotion', label: 'Sadness', description: '', confidence: 0.6, evidence: 'quote' },
    ],
    proposed_graph_edges: [{ source: 'n1', target: 'n2', relation: 'co-occurs with', weight: 0.6, explanation: 'Both appeared.' }],
    clarifying_questions: ['What happened next?'],
    safety_flags: [],
  };
}
