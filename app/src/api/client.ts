const BASE_URL = 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export type LogPayload = {
  category: string;
  mood_rating: number;
  description?: string;
  duration_mins?: number;
};

export type LogResponse = {
  id: number;
  xp_awarded: number;
  level_up: boolean;
  new_level?: number;
};

export type ActivityLog = {
  id: number;
  category: string;
  mood_rating: number;
  description?: string;
  duration_mins?: number;
  xp_awarded: number;
  created_at: string;
};

export type RPGState = {
  current_level: number;
  total_xp: number;
  xp_to_next_level: number;
  unallocated_points: number;
  strength: number;
  wisdom: number;
  focus: number;
  agility: number;
  resilience: number;
  title: string;
  streak_days: number;
};

export const api = {
  postLog: (payload: LogPayload) =>
    request<LogResponse>('/logs', { method: 'POST', body: JSON.stringify(payload) }),

  getLogs: () =>
    request<ActivityLog[]>('/logs'),

  getRPGState: () =>
    request<RPGState>('/rpg/state'),
};
