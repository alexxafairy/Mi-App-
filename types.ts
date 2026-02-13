
export interface DiaryEntry {
  id: string;
  fecha: string;
  situacion: string;
  emociones: string;
  pensamientosAutomaticos: string;
  insight?: string;
  createdAt: number;
}

export interface Meal {
  time: string;
  dish: string;
  description: string;
  ingredients: string[];
  category?: 'breakfast' | 'snack' | 'lunch' | 'dinner' | 'other';
  completed?: boolean;
}

export interface DietPlan {
  name: string;
  schedule: Meal[];
  recommendations: string[];
}

export interface EvidenceEntry {
  id: string | number;
  task_name: string;
  photo_url: string;
  created_at: string;
}

export enum AppTab {
  DIARY = 'diary',
  DIET = 'diet',
  SUMMARY = 'summary',
  EVIDENCES = 'evidences'
}
