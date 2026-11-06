import { describe, expect, it } from 'vitest';
import { createInferenceClient, parseDefaultModel, parseFlavor } from '@/core/inference/factory';
import { LiveInferenceClient } from '@/core/inference/live';
import { MockInferenceClient } from '@/core/inference/mock';
import { parseMockScenario } from '@/core/inference/mockScenario';
import { imageBlob } from './support/apiServer';

describe('createInferenceClient: flavor selection', () => {
  it('defaults to live with B71 when no env is set', () => {
    const client = createInferenceClient({ env: {}, search: '' });
    expect(client).toBeInstanceOf(LiveInferenceClient);
    expect(client.source).toBe('live');
  });

  it('builds the mock client when VITE_INFERENCE=mock, honouring VITE_DEFAULT_MODEL', async () => {
    const client = createInferenceClient({ env: { VITE_INFERENCE: 'mock', VITE_DEFAULT_MODEL: 'A71' }, search: '' });
    expect(client).toBeInstanceOf(MockInferenceClient);
    await expect(client.predict({ file: imageBlob() })).resolves.toMatchObject({ source: 'mock', model: 'A71' });
  });

  it('reads ?mock=<scenario> only for the mock client', async () => {
    const mock = createInferenceClient({ env: { VITE_INFERENCE: 'mock' }, search: '?mock=offline' });
    await expect(mock.predict({ file: imageBlob() })).rejects.toMatchObject({ scenario: 'offline' });

    const live = createInferenceClient({ env: {}, search: '?mock=offline' });
    expect(live.source).toBe('live');
  });

  it('allows the mock-only next model in mock mode', async () => {
    const client = createInferenceClient({ env: { VITE_INFERENCE: 'mock', VITE_DEFAULT_MODEL: 'next' }, search: '' });
    await expect(client.predict({ file: imageBlob() })).resolves.toMatchObject({ model: 'next' });
  });

  it('refuses next as the live default model at construction time', () => {
    expect(() => createInferenceClient({ env: { VITE_DEFAULT_MODEL: 'next' }, search: '' })).toThrow(RangeError);
  });
});

describe('flag parsing fails fast on misconfiguration', () => {
  it('rejects an unknown VITE_INFERENCE value instead of guessing', () => {
    expect(() => parseFlavor('staging')).toThrow('VITE_INFERENCE');
  });

  it('rejects an unknown VITE_DEFAULT_MODEL value', () => {
    expect(() => parseDefaultModel('C99')).toThrow('VITE_DEFAULT_MODEL');
  });

  it('treats empty strings as unset', () => {
    expect(parseFlavor('')).toBe('live');
    expect(parseDefaultModel('')).toBe('B71');
  });
});

describe('parseMockScenario', () => {
  it('accepts each documented scenario name', () => {
    expect(parseMockScenario('?mock=timeout')).toBe('timeout');
    expect(parseMockScenario('?mock=slow')).toBe('slow');
    expect(parseMockScenario('?mock=export-unavailable')).toBe('export-unavailable');
  });

  it('ignores unknown or missing values', () => {
    expect(parseMockScenario('?mock=bogus')).toBeUndefined();
    expect(parseMockScenario('?other=timeout')).toBeUndefined();
    expect(parseMockScenario('')).toBeUndefined();
  });
});
