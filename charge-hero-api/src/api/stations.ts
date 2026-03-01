// ==========================================
// Stations API client
// ==========================================

import { http } from './http';
import type { Station, CreateStationPayload, UpdateStationPayload } from '@/domain/types';

export const stationsApi = {
  getAll: () => http<Station[]>('/api/stations'),

  getOne: (id: string) => http<Station>(`/api/stations/${id}`),

  create: (payload: CreateStationPayload) =>
    http<Station>('/api/stations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateStationPayload) =>
    http<Station>(`/api/stations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  patch: (id: string, payload: Partial<UpdateStationPayload>) =>
    http<Station>(`/api/stations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    http<void>(`/api/stations/${id}`, { method: 'DELETE' }),

  simulate: () =>
    http<Station[]>('/api/stations/simulate', { method: 'POST' }),
};
