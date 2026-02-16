import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    supabase: { url: 'https://test.supabase.co', key: 'test-key' },
    gemini: { apiKey: '' },
  },
}));

const DIARY_BACKUP_EVIDENCE_TASK = '__diary_backup_v1__';

describe('DatabaseService', () => {
  let db: any;

  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      get length() { return Object.keys(store).length; },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };
  })();

  beforeEach(async () => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    mockLocalStorage.clear();
    vi.resetModules();
    const mod = await import('../services/dbService');
    db = mod.db;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor / config', () => {
    it('uses env-based master config when no localStorage config exists', () => {
      const config = db.getConfig();
      expect(config.url).toBe('https://test.supabase.co');
      expect(config.key).toBe('test-key');
      expect(config.enabled).toBe(true);
    });

    it('uses localStorage config when it exists', async () => {
      const saved = { url: 'https://custom.co', key: 'custom-key', enabled: true };
      mockLocalStorage.setItem('clayminds_cloud_config', JSON.stringify(saved));
      vi.resetModules();
      const mod = await import('../services/dbService');
      const config = mod.db.getConfig();
      expect(config.url).toBe('https://custom.co');
      expect(config.key).toBe('custom-key');
    });
  });

  describe('saveConfig / getConfig', () => {
    it('saves and retrieves config', () => {
      const newConfig = { url: 'https://new.co', key: 'new-key', enabled: false };
      db.saveConfig(newConfig);
      expect(db.getConfig()).toEqual(newConfig);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'clayminds_cloud_config',
        JSON.stringify(newConfig)
      );
    });
  });

  describe('resetToMaster', () => {
    it('resets config to env-based master values', () => {
      vi.stubGlobal('location', { reload: vi.fn() });
      db.saveConfig({ url: 'https://other.co', key: 'other', enabled: true });
      db.resetToMaster();
      const config = db.getConfig();
      expect(config.url).toBe('https://test.supabase.co');
      expect(config.key).toBe('test-key');
    });
  });

  describe('fetchFromCloud("diary")', () => {
    it('maps snake_case DB columns to camelCase', async () => {
      const mockData = [{
        id: 1,
        fecha: '2024-01-01',
        situacion: 'test situation',
        emociones: 'happy',
        pensamientos_automaticos: 'thought',
        insight: 'insight text',
        created_at_val: 1704067200000,
      }];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
        text: () => Promise.resolve(''),
      }));

      const result = await db.fetchFromCloud('diary');
      expect(result).toHaveLength(1);
      expect(result[0].pensamientosAutomaticos).toBe('thought');
      expect(result[0].createdAt).toBe(1704067200000);
      expect(result[0].id).toBe('1');
    });

    it('returns empty array on error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('error'),
      }));

      const result = await db.fetchFromCloud('diary');
      expect(result).toEqual([]);
    });
  });

  describe('fetchFromCloud("diet")', () => {
    it('returns the last plan or null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { plan: { name: 'old' } },
          { plan: { name: 'latest' } },
        ]),
        text: () => Promise.resolve(''),
      }));

      const result = await db.fetchFromCloud('diet');
      expect(result).toEqual({ name: 'latest' });
    });

    it('returns null when no data', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve(''),
      }));

      const result = await db.fetchFromCloud('diet');
      expect(result).toBeNull();
    });
  });

  describe('fetchFromCloud("evidences")', () => {
    it('filters out diary backup entries and sorts by date desc', async () => {
      const mockData = [
        { id: '1', task_name: 'task1', photo_url: 'url1', created_at: '2024-01-01' },
        { id: '2', task_name: DIARY_BACKUP_EVIDENCE_TASK, photo_url: 'backup', created_at: '2024-01-02' },
        { id: '3', task_name: 'task2', photo_url: 'url3', created_at: '2024-01-03' },
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
        text: () => Promise.resolve(''),
      }));

      const result = await db.fetchFromCloud('evidences');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('1');
      expect(result.find((e: any) => e.task_name === DIARY_BACKUP_EVIDENCE_TASK)).toBeUndefined();
    });
  });

  describe('syncToCloud("diary")', () => {
    it('tries PATCH first, falls back to POST', async () => {
      const calls: { method: string; url: string }[] = [];

      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts: any) => {
        calls.push({ method: opts?.method || 'GET', url });
        if (opts?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: '1' }]),
            text: () => Promise.resolve(''),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        });
      }));

      const entries = [{
        id: '1',
        fecha: '2024-01-01',
        situacion: 'test',
        emociones: 'happy',
        pensamientosAutomaticos: 'thought',
        createdAt: Date.now(),
      }];

      const result = await db.syncToCloud('diary', entries);
      expect(result).toBe(true);
      const patchCalls = calls.filter(c => c.method === 'PATCH');
      expect(patchCalls.length).toBeGreaterThan(0);
    });

    it('uses POST when entry has no id', async () => {
      const calls: { method: string }[] = [];

      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: any) => {
        calls.push({ method: opts?.method || 'GET' });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        });
      }));

      const entries = [{
        fecha: '2024-01-01',
        situacion: 'test',
        emociones: 'happy',
        pensamientosAutomaticos: 'thought',
        createdAt: Date.now(),
      }];

      await db.syncToCloud('diary', entries);
      const postCalls = calls.filter(c => c.method === 'POST');
      expect(postCalls.length).toBeGreaterThan(0);
    });
  });
});
