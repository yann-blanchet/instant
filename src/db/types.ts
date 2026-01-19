export type TaskStatus = "open" | "done";

export interface Project {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Task {
  id: string;
  project_id?: string | null;
  visit_id?: string | null;
  description?: string | null;
  status: TaskStatus;
  intervenant_id?: string | null;
  audio_url?: string | null;
  photo_ids?: string[];
  observations?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Visit {
  id: string;
  project_id: string;
  date: string;
  comment: string;
  visit_number?: number;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TaskPhoto {
  id: string;
  task_id: string;
  url?: string | null;
  image_blob?: Blob | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VisitPhoto {
  id: string;
  visit_id: string;
  url: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Intervenant {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
