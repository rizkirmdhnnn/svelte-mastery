import { describe, it, expect } from 'vitest';
import { getProvider } from '$lib/server/ai/providers';

describe('getProvider', () => {
  it('returns the workers-ai provider by name', () => {
    expect(getProvider('workers-ai').name).toBe('workers-ai');
  });
  it('falls back to workers-ai for unknown/empty names', () => {
    expect(getProvider('nope').name).toBe('workers-ai');
    expect(getProvider(undefined).name).toBe('workers-ai');
  });
  it('exposes the gemini and groq adapters', () => {
    expect(getProvider('gemini').name).toBe('gemini');
    expect(getProvider('groq').name).toBe('groq');
  });
});
