import { describe, it, expect, vi } from 'vitest';

describe('config', () => {
  it('exports a typed config object with supabase and gemini keys', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_KEY', 'test-key');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'gemini-key');

    const { config } = await import('../config');

    expect(config).toHaveProperty('supabase');
    expect(config).toHaveProperty('gemini');
    expect(config.supabase).toHaveProperty('url');
    expect(config.supabase).toHaveProperty('key');
    expect(config.gemini).toHaveProperty('apiKey');

    vi.unstubAllEnvs();
  });

  it('falls back to empty strings when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_KEY', '');
    vi.stubEnv('VITE_GEMINI_API_KEY', '');

    vi.resetModules();
    const { config } = await import('../config');

    expect(config.supabase.url).toBe('');
    expect(config.supabase.key).toBe('');
    expect(config.gemini.apiKey).toBe('');

    vi.unstubAllEnvs();
  });
});
