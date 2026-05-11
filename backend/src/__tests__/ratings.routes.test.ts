// Ficheiro: backend/src/__tests__/ratings.routes.test.ts | Função: integração de POST /ratings (P11)

// O controller faz:
//   1. supabase.from('rides').select().eq().maybeSingle  → carrega a boleia
//   2. supabase.from('ratings').insert().select().single → cria avaliação
//   3. supabase.rpc('recalc_user_rating', ...)           → recalcula média (fire-and-forget)
//
// Para manter o controlo, expomos um stub global que troca de comportamento conforme a tabela.
const rpcMock = jest.fn().mockResolvedValue({ data: null, error: null });

interface CallState {
  rideRow: { data: unknown; error: unknown };
  ratingsInsert: { data: unknown; error: unknown };
}

const state: CallState = {
  rideRow: { data: null, error: null },
  ratingsInsert: { data: null, error: null },
};

jest.mock('@lib/supabase', () => {
  const getSupabase = () => ({
    rpc: rpcMock,
    from: jest.fn((table: string) => {
      if (table === 'rides') {
        const ridesBuilder = {
          select: () => ridesBuilder,
          eq: () => ridesBuilder,
          maybeSingle: jest.fn(async () => state.rideRow),
        };
        return ridesBuilder;
      }
      if (table === 'ratings') {
        const ratingsBuilder = {
          insert: () => ratingsBuilder,
          select: () => ratingsBuilder,
          single: jest.fn(async () => state.ratingsInsert),
        };
        return ratingsBuilder;
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  });
  return { getSupabase };
});

import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { authHeader } from './helpers';

let app: Express;

beforeEach(() => {
  rpcMock.mockClear();
  state.rideRow = { data: null, error: null };
  state.ratingsInsert = { data: null, error: null };
  app = createApp();
});

describe('POST /ratings', () => {
  const validBody = {
    ride_id: '11111111-1111-1111-1111-111111111111',
    rated_id: '22222222-2222-2222-2222-222222222222',
    score: 5,
    comment: 'Excelente',
  };

  it('cria avaliação após boleia completada (201)', async () => {
    state.rideRow = {
      data: {
        id: validBody.ride_id,
        driver_id: validBody.rated_id,
        passenger_id: 'me-uuid',
        status: 'completed',
      },
      error: null,
    };
    state.ratingsInsert = {
      data: {
        id: 'rating-1',
        ride_id: validBody.ride_id,
        rater_id: 'me-uuid',
        rated_id: validBody.rated_id,
        score: 5,
        comment: 'Excelente',
        created_at: '2026-01-02T00:00:00Z',
      },
      error: null,
    };

    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.rating.id).toBe('rating-1');
  });

  it('rejeita avaliação antes da boleia estar completa (409)', async () => {
    state.rideRow = {
      data: {
        id: validBody.ride_id,
        driver_id: validBody.rated_id,
        passenger_id: 'me-uuid',
        status: 'in_progress',
      },
      error: null,
    };

    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/boleias concluídas/);
  });

  it('rejeita avaliação se quem avalia não participou na boleia (403)', async () => {
    state.rideRow = {
      data: {
        id: validBody.ride_id,
        driver_id: 'someone-else',
        passenger_id: 'another-person',
        status: 'completed',
      },
      error: null,
    };

    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);

    expect(res.status).toBe(403);
  });

  it('rejeita se o avaliado não participou (400)', async () => {
    state.rideRow = {
      data: {
        id: validBody.ride_id,
        driver_id: 'driver-uuid',
        passenger_id: 'me-uuid',
        status: 'completed',
      },
      error: null,
    };

    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);

    expect(res.status).toBe(400);
  });

  it('devolve 404 se a boleia não existir', async () => {
    state.rideRow = { data: null, error: null };
    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);
    expect(res.status).toBe(404);
  });

  it('devolve 409 em duplicate key (23505)', async () => {
    state.rideRow = {
      data: {
        id: validBody.ride_id,
        driver_id: validBody.rated_id,
        passenger_id: 'me-uuid',
        status: 'completed',
      },
      error: null,
    };
    state.ratingsInsert = { data: null, error: { code: '23505', message: 'dup' } };

    const auth = await authHeader('me-uuid');
    const res = await request(app).post('/ratings').set(auth).send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Já avaliou/);
  });
});
