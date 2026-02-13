
import { DiaryEntry, DietPlan, EvidenceEntry } from "../types";

export interface CloudConfig {
  url: string;
  key: string;
  enabled: boolean;
}

/**
 * DIRECTOR: He actualizado estos valores con lo que veo en tu captura.
 * Si tu URL de proyecto termina siendo distinta, cámbiala aquí.
 */
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

  // Método para probar la conexión manualmente
  async testConnection() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/diary?select=count`, {
        headers: this.getHeaders()
      });
      if (res.ok) return { success: true, message: "¡Conexión Exitosa con la DB!" };
      const err = await res.json();
      return { success: false, message: err.message || "Error de permisos (401/403)" };
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

      if (!response.ok) return null;
      return `${this.config.url}/storage/v1/object/public/evidences/${fileName}`;
    } catch (e) {
      return null;
    }
  }

  async fetchFromCloud(table: 'diary' | 'diet' | 'evidences'): Promise<any> {
    if (!this.config.enabled || !this.config.url) return null;
    try {
      const response = await fetch(`${this.config.url}/rest/v1/${table}?select=*`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) return table === 'diet' ? null : [];
      
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
          pensamientosAutomaticos: d.pensamientos_automaticos,
          insight: d.insight,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
        })).sort((a: any, b: any) => b.createdAt - a.createdAt);
      }
      
      return data;
    } catch (e) {
      return table === 'diet' ? null : [];
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
        body = { id: 1, plan: data }; // Siempre usamos ID 1 para la dieta actual
      } else if (type === 'evidences') {
        body = data; // Es un objeto individual
      } else if (type === 'diary') {
        // El diario sincroniza toda la lista
        body = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          situacion: d.situacion,
          emociones: d.emociones,
          pensamientos_automaticos: d.pensamientosAutomaticos,
          insight: d.insight
        }));
      }

      const response = await fetch(`${this.config.url}/rest/v1/${type}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

export const db = new DatabaseService();
