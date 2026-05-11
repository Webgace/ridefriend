// Ficheiro: backend/src/__tests__/locations.routes.test.ts | Função: integração de GET /locations/nearby (P11)
const rpcMock = jest.fn();

jest.mock('@lib/supabase', () => ({
  getSupabase: () => ({ rpc: rpcMock }),
}));

import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { authHeader } from './helpers';

let app: Express;

beforeEach(() => {
  rpcMock.mockReset();
  app = createApp();
});

describe('GET /locations/nearby', () => {
  const path = '/locations/nearby?lat=-8.81&lng=13.23&radius_km=5';

  it('exige autenticação (401 sem token)', async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it('devolve lista quando há contactos próximos', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { user_id: 'u2', name: 'João', distance_km: 1.2, mode: 'driver' },
        { user_id: 'u3', name: 'Maria', distance_km: 2.8, mode: 'passenger' },
      ],
      error: null,
    });

    const auth = await authHeader('u1');
    const res = await request(app).get(path).set(auth);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(rpcMock).toHaveBeenCalledWith(
      'nearby_users',
      expect.objectContaining({
        p_lat: -8.81,
        p_lng: 13.23,
        p_radius_km: 5,
        p_exclude_user_id: 'u1',
      }),
    );
  });

  it('devolve [] quando não há contactos próximos', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    const auth = await authHeader('u1');
    const res = await request(app).get(path).set(auth);

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('rejeita query inválida (400)', async () => {
    const auth = await authHeader('u1');
    const res = await request(app).get('/locations/nearby?lat=200&lng=13.23').set(auth);
    expect(res.status).toBe(400);
  });
});
