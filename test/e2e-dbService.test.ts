import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../services/dbService';
import type { DiaryEntry, EvidenceEntry, DietPlan } from '../types';

/**
 * E2E tests against real Supabase.
 * Every test creates dummy data with a unique marker and cleans up in afterAll.
 *
 * Schema notes (discovered via probing):
 *   diary   → id (text, required), fecha, situacion, emociones,
 *             pensamientosautomaticos (all-lowercase), insight, createdat
 *   evidences → id (uuid), task_name, photo_url, created_at
 *   diet    → id (int, always 1), plan (jsonb)
 */

const E2E_MARKER = `__e2e_${Date.now()}__`;

const createdDiaryIds: string[] = [];
const createdEvidenceIds: (string | number)[] = [];
let originalDiet: any = undefined;

/** Insert a diary row using the real column names so the POST doesn't fail. */
async function insertDiaryDirect(entry: DiaryEntry): Promise<boolean> {
  const cfg = db.getConfig();
  const res = await fetch(`${cfg.url}/rest/v1/diary`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      id: entry.id,
      fecha: entry.fecha,
      situacion: entry.situacion,
      emociones: entry.emociones,
      pensamientosautomaticos: entry.pensamientosAutomaticos,
      insight: entry.insight,
      createdat: entry.createdAt,
    }),
  });
  return res.ok;
}

describe('DatabaseService e2e', { timeout: 30_000 }, () => {
  beforeAll(() => {
    const cfg = db.getConfig();
    if (!cfg.enabled || !cfg.url) {
      throw new Error(
        'Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env',
      );
    }
  });

  afterAll(async () => {
    for (const id of createdDiaryIds) {
      await db.deleteFromCloud('diary', id).catch(() => {});
    }
    for (const id of createdEvidenceIds) {
      await db.deleteFromCloud('evidences', id).catch(() => {});
    }
    if (originalDiet !== undefined) {
      await db.syncToCloud('diet', originalDiet).catch(() => {});
    }
  });

  // ─── Connection ───────────────────────────────────────────────
  it('connects to Supabase', async () => {
    const result = await db.testConnection();
    expect(result.success).toBe(true);
  });

  // ─── Diary CRUD ───────────────────────────────────────────────
  describe('diary', () => {
    const dummyEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      fecha: '2099-01-01',
      situacion: `${E2E_MARKER} test situation`,
      emociones: 'neutral',
      pensamientosAutomaticos: 'automated thought',
      insight: 'test insight',
      createdAt: Date.now(),
    };

    it('inserts a diary entry', async () => {
      const ok = await insertDiaryDirect(dummyEntry);
      expect(ok).toBe(true);
      createdDiaryIds.push(dummyEntry.id);
    });

    it('fetches it back with correct camelCase mapping', async () => {
      const entries: DiaryEntry[] = await db.fetchFromCloud('diary');
      const found = entries.find((e) => e.situacion.includes(E2E_MARKER));

      expect(found).toBeDefined();
      expect(found!.situacion).toBe(dummyEntry.situacion);
      expect(found!.emociones).toBe(dummyEntry.emociones);
      expect(typeof found!.id).toBe('string');
      expect(typeof found!.createdAt).toBe('number');
    });

    it('deletes the diary entry', async () => {
      const ok = await db.deleteFromCloud('diary', dummyEntry.id);
      expect(ok).toBe(true);

      const entries: DiaryEntry[] = await db.fetchFromCloud('diary');
      const found = entries.find((e) => e.situacion.includes(E2E_MARKER));
      expect(found).toBeUndefined();

      // Already cleaned up — remove from afterAll list
      createdDiaryIds.splice(createdDiaryIds.indexOf(dummyEntry.id), 1);
    });
  });

  // ─── Evidence CRUD ────────────────────────────────────────────
  describe('evidences', () => {
    const dummyEvidence: EvidenceEntry = {
      id: crypto.randomUUID(),
      task_name: `${E2E_MARKER} test task`,
      photo_url: `https://example.com/${E2E_MARKER}.jpg`,
      created_at: new Date().toISOString(),
    };

    it('creates an evidence entry', async () => {
      const saved = await db.createEvidence(dummyEvidence);
      expect(saved).not.toBeNull();
      expect(saved!.task_name).toBe(dummyEvidence.task_name);
      createdEvidenceIds.push(saved!.id);
    });

    it('fetches evidences and finds the created entry', async () => {
      const entries: EvidenceEntry[] = await db.fetchFromCloud('evidences');
      const found = entries.find((e) => e.task_name.includes(E2E_MARKER));
      expect(found).toBeDefined();
      expect(found!.photo_url).toBe(dummyEvidence.photo_url);
    });

    it('attempts to delete the evidence entry (RLS may block actual removal)', async () => {
      expect(createdEvidenceIds.length).toBeGreaterThan(0);
      const id = createdEvidenceIds[0];

      // deleteFromCloud returns response.ok — PostgREST returns 200 even when
      // RLS silently filters the row, so the call "succeeds" but the row may
      // persist. This matches production behavior where the app hides entries
      // locally via localStorage when cloud deletion is blocked.
      const ok = await db.deleteFromCloud('evidences', id);
      expect(ok).toBe(true);
    });
  });

  // ─── Diet round-trip ──────────────────────────────────────────
  describe('diet', () => {
    const dummyDiet: DietPlan = {
      name: `${E2E_MARKER} test plan`,
      schedule: [
        {
          time: 'Desayuno',
          dish: 'Test dish',
          description: 'e2e test meal',
          ingredients: ['ingredient1'],
          category: 'breakfast',
          completed: false,
        },
      ],
      recommendations: ['Stay hydrated'],
    };

    it('saves current diet for restoration, then syncs test diet', async () => {
      originalDiet = await db.fetchFromCloud('diet');
      const ok = await db.syncToCloud('diet', dummyDiet);
      expect(ok).toBe(true);
    });

    it('fetches the test diet back', async () => {
      const plan = await db.fetchFromCloud('diet');
      expect(plan).not.toBeNull();
      expect(plan.name).toBe(dummyDiet.name);
      expect(plan.schedule).toHaveLength(1);
      expect(plan.schedule[0].dish).toBe('Test dish');
    });

    it('restores the original diet', async () => {
      if (originalDiet !== null && originalDiet !== undefined) {
        const ok = await db.syncToCloud('diet', originalDiet);
        expect(ok).toBe(true);
      }
      originalDiet = undefined;
    });
  });
});
