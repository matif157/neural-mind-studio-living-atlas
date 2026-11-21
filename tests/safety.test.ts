import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/index';
import { assessSafety, containsDiagnosticClaim, containsRiskLabel } from '../server/pipeline/safety';

const app = createApp();

const analyze = (text: string) => request(app).post('/api/analyze').send({
  conversationId: 'safety-test',
  messages: [{ role: 'user', text }],
  consent: true,
  stream: false,
});

describe('safety detection: immediate self-harm', () => {
  it('interrupts analysis for current suicidal intent', () => {
    const result = assessSafety('I am going to kill myself tonight. I have the pills ready.');
    expect(result.immediateRisk).toBe(true);
    expect(result.flags).toContain('self-harm');
    expect(result.flags).toContain('possible-crisis');
    expect(result.guidance).toContain('emergency');
  });

  it('treats a current desire to die as immediate', () => {
    const result = assessSafety('I want to die and I cannot go on.');
    expect(result.immediateRisk).toBe(true);
  });

  it('flags self-harm method planning', () => {
    const result = assessSafety('I bought a rope and wrote a suicide note.');
    expect(result.flags).toContain('self-harm');
    expect(result.immediateRisk).toBe(true);
  });

  it('does not fabricate a risk level anywhere', () => {
    const result = assessSafety('I am going to kill myself tonight.');
    expect(containsRiskLabel(result.guidance ?? '')).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/high risk|low risk|medium risk|risk score/i);
  });
});

describe('safety detection: harm to others', () => {
  it('interrupts for stated intent to harm a named person', () => {
    const result = assessSafety('I want to kill him. I know where he lives and I am going there now.');
    expect(result.immediateRisk).toBe(true);
    expect(result.flags).toContain('harm-to-others');
    expect(result.guidance).toContain('Move physically away');
  });

  it('flags a threatening relationship statement without pretending to predict violence', () => {
    const result = assessSafety('I might hurt her if she keeps ignoring me.');
    expect(result.flags).toContain('harm-to-others');
    expect(containsRiskLabel(JSON.stringify(result))).toBe(false);
  });

  it('does not assist with monitoring or revenge', () => {
    const result = assessSafety('How can I track my ex partner and get revenge on them?');
    expect(result.unsafeRequests.map((item) => item.id)).toContain('monitor-person');
    expect(result.guidance).toContain('will not help');
  });
});

describe('safety detection: non-immediate and false-positive control', () => {
  it('does not interrupt an ordinary reflection', () => {
    const result = assessSafety('I felt anxious when my friend did not reply. I avoided messaging them.');
    expect(result.immediateRisk).toBe(false);
    expect(result.flags).toEqual([]);
  });

  it('respects an explicit denial of current intent', () => {
    const result = assessSafety('I have never been suicidal and I would never kill myself.');
    expect(result.immediateRisk).toBe(false);
  });

  it('keeps historical disclosure out of the interrupt but still notes it', () => {
    const result = assessSafety('Years ago I used to self-harm, but I am not in that situation now.');
    expect(result.immediateRisk).toBe(false);
    expect(result.denied.length).toBeGreaterThan(0);
  });

  it('does not treat trauma disclosure as an emergency by itself', () => {
    const result = assessSafety('I was humiliated at school and I still find it hard to trust people.');
    expect(result.immediateRisk).toBe(false);
    expect(result.flags).not.toContain('possible-crisis');
  });

  it('does not treat a dissociative description as a crisis', () => {
    const result = assessSafety('Sometimes I feel outside myself when I am stressed.');
    expect(result.immediateRisk).toBe(false);
  });

  it('flags medical red flags without diagnosing them', () => {
    const result = assessSafety('I had chest pain and could not breathe properly yesterday.');
    expect(result.flags).toContain('medical-symptoms');
    expect(result.immediateRisk).toBe(false);
  });

  it('detects unsupported diagnosis language in output', () => {
    expect(containsDiagnosticClaim('You have bipolar disorder.')).toBe(true);
    expect(containsDiagnosticClaim('You described periods of low mood.')).toBe(false);
  });
});

describe('API safety gate', () => {
  it('returns a safety-only response and no graph proposals', async () => {
    const response = await analyze('I am going to kill myself tonight.').expect(200);
    const body = response.body;
    expect(body.meta.offline).toBe(true);
    expect(body.meta.model).toBe('safety-gate-v1');
    expect(body.analysis.proposed_graph_nodes).toHaveLength(0);
    expect(body.analysis.proposed_graph_edges).toHaveLength(0);
    expect(body.analysis.safety_flags).toContain('possible-crisis');
    expect(body.analysis.response_to_user).toContain('emergency');
    expect(body.analysis.response_to_user).not.toMatch(/high risk|low risk|risk score/i);
  });

  it('never calls a provider for an immediate safety concern', async () => {
    const response = await analyze('I have a gun with me and I am going to hurt them now.').expect(200);
    expect(response.body.meta.promptChars).toBeGreaterThan(0);
    expect(response.body.meta.estimatedCostUsd).toBe(0);
    expect(response.body.analysis.proposed_graph_nodes).toHaveLength(0);
  });

  it('still analyses a non-crisis message', async () => {
    const response = await analyze('I felt anxious when my friend did not reply.').expect(200);
    expect(response.body.meta.model).not.toBe('safety-gate-v1');
  });
});
