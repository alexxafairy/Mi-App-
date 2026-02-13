
import { DiaryEntry, DietPlan, EvidenceEntry } from "../types";

export interface CloudConfig {
  url: string;
  key: string;
  enabled: boolean;
}

const MASTER_URL = 'https://htlipdwjdwixibfigomk.supabase.co'; 
const MASTER_KEY = 'sb_publishable_JkXmZ0mpGXUG6Eh1jNlqgA_8B299_vl'; 

class DatabaseService {
  private config: CloudConfig;

  constructor() {
    const saved = localStorage.getItem('clayminds_cloud_config');
    if (saved) {
      this.config = JSON.parse(saved);
    } else {
      this.config = { 
        url: MASTER_URL, 
        key: MASTER_KEY, 
        enabled: !!(MASTER_URL && MASTER_KEY) 
      };
    }
  }

  async testConnection() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/diary?select=count`, {
        headers: this.getHeaders()
      });
      if (res.ok) return { success: true, message: "¡Conexión Exitosa con la DB!" };
      const err = await res.json();
      return { success: false, message: err.message || `Error ${res.status}` };
    } catch (e) {
      return { success: false, message: "Error de red: Verifica la URL" };
    }
  }

  resetToMaster() {
    localStorage.clear();
    this.config = { 
      url: MASTER_URL, 
      key: MASTER_KEY, 
      enabled: !!(MASTER_URL && MASTER_KEY) 
    };
    localStorage.setItem('clayminds_cloud_config', JSON.stringify(this.config));
    window.location.reload();
  }

  saveConfig(config: CloudConfig) {
    this.config = config;
    localStorage.setItem('clayminds_cloud_config', JSON.stringify(config));
  }

  getConfig() { return this.config; }

  private getHeaders() {
    return {
      'apikey': this.config.key,
      'Authorization': `Bearer ${this.config.key}`,
      'Content-Type': 'application/json'
    };
  }

  async uploadFile(file: File): Promise<string | null> {
    if (!this.config.enabled || !this.config.url) return null;
    const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

    try {
      const response = await fetch(`${this.config.url}/storage/v1/object/evidences/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': this.config.key,
          'Authorization': `Bearer ${this.config.key}`,
          'Content-Type': file.type
        },
        body: file
      });

      if (!response.ok) {
        console.error("Storage Error:", await response.text());
        return null;
      }
      return `${this.config.url}/storage/v1/object/public/evidences/${fileName}`;
    } catch (e) {
      console.error("Upload exception:", e);
      return null;
    }
  }

  async fetchFromCloud(table: 'diary' | 'diet' | 'evidences'): Promise<any> {
    if (!this.config.enabled || !this.config.url) return null;
    try {
      const response = await fetch(`${this.config.url}/rest/v1/${table}?select=*`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        console.error(`Fetch error from ${table}:`, await response.text());
        return table === 'diet' ? null : [];
      }
      
      const data = await response.json();
      
      if (table === 'diet') return data.length > 0 ? data[data.length - 1].plan : null;
      
      if (table === 'evidences') {
        return data.map((d: any) => ({
          id: d.id,
          task_name: d.task_name,
          photo_url: d.photo_url,
          created_at: d.created_at
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
      if (table === 'diary') {
        return data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          situacion: d.situacion,
          emociones: d.emociones,
          pensamientos_automaticos: d.pensamientosAutomaticos,
          insight: d.insight,
          created_at_val: d.createdAt
        })).sort((a: any, b: any) => b.createdAt - a.createdAt);
      }
      
      return data;
    } catch (e) {
      console.error(`Exception fetching ${table}:`, e);
      return table === 'diet' ? null : [];
    }
  }

  async createEvidence(entry: EvidenceEntry): Promise<EvidenceEntry | null> {
    if (!this.config.enabled || !this.config.url) return entry;

    try {
      const response = await fetch(`${this.config.url}/rest/v1/evidences`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        console.error('Create evidence error:', await response.text());
        return null;
      }

      const data = await response.json();
      const saved = data?.[0];
      if (!saved) return null;

      return {
        id: saved.id,
        task_name: saved.task_name,
        photo_url: saved.photo_url,
        created_at: saved.created_at
      };
    } catch (e) {
      console.error('Create evidence exception:', e);
      return null;
    }
  }

  async deleteEvidence(entry: EvidenceEntry) {
    if (!this.config.enabled || !this.config.url) return true;

    const tryDelete = async (query: string) => {
      const response = await fetch(`${this.config.url}/rest/v1/evidences?${query}`, {
        method: 'DELETE',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        }
      });

      if (!response.ok) {
        console.error('Delete evidence request failed:', await response.text());
        return false;
      }

      return response.status === 204 || response.status === 200;
    };

    const existsByPhotoUrl = async (photoUrl: string) => {
      const response = await fetch(
        `${this.config.url}/rest/v1/evidences?select=id&photo_url=eq.${encodeURIComponent(photoUrl)}&limit=1`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        console.error('Existence check failed:', await response.text());
        return true;
      }

      const rows = await response.json().catch(() => []);
      return Array.isArray(rows) && rows.length > 0;
    };

    try {
      const idQuery = `id=eq.${encodeURIComponent(String(entry.id))}`;
      await tryDelete(idQuery);
      const stillExistsAfterIdDelete = await existsByPhotoUrl(entry.photo_url);
      if (!stillExistsAfterIdDelete) return true;

      const photoQuery = `photo_url=eq.${encodeURIComponent(entry.photo_url)}`;
      const photoDeleted = await tryDelete(photoQuery);
      if (!photoDeleted) return false;

      const stillExistsAfterPhotoDelete = await existsByPhotoUrl(entry.photo_url);
      return !stillExistsAfterPhotoDelete;
    } catch (e) {
      console.error('Delete evidence error:', e);
      return false;
    }
  }

  async syncToCloud(type: 'diary' | 'diet' | 'evidences', data: any) {
    if (!this.config.enabled || !this.config.url) return false;
    
    try {
      let body;
      const headers: any = { 
        ...this.getHeaders(), 
        'Prefer': 'resolution=merge-duplicates' 
      };

      if (type === 'diet') {
        body = { id: 1, plan: data };
      } else if (type === 'evidences') {
        body = data; 
      } else if (type === 'diary') {
        body = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          situacion: d.situacion,
          emociones: d.emociones,
          pensamientos_automaticos: d.pensamientosAutomaticos,
          insight: d.insight,
          created_at_val: d.createdAt
        }));
      }

      const response = await fetch(`${this.config.url}/rest/v1/${type}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`Sync error on ${type}:`, await response.text());
      }

      return response.ok;
    } catch (e) {
      console.error(`Sync exception on ${type}:`, e);
      return false;
    }
  }

  async deleteFromCloud(table: 'diary' | 'evidences', id: string | number) {
    if (!this.config.enabled || !this.config.url) return false;
    try {
      const response = await fetch(`${this.config.url}/rest/v1/${table}?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return response.ok;
    } catch (e) {
      console.error(`Delete error on ${table}:`, e);
      return false;
    }
  }
}

export const db = new DatabaseService();
