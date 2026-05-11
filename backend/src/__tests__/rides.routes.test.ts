// Ficheiro: backend/src/__tests__/rides.routes.test.ts | Função: integração de POST /rides (P11)

// O controller dispara sendPushToUser fire-and-forget — silenciamos para não tocar em
// supabase real durante o push.
jest.mock('@services/push.service', () => ({
  sendPushToUser: jest.fn(async () => undefined),
}));

const insertMock = jest.fn();
const selectMock = jest.fn();
const singleMock = jest.fn();

jest.mock('@lib/supabase', () => ({
  getSupabase: () => ({
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  }),
}));

import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { authHeader } from './helpers';

let app: Express;

function rideRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ride-1',
    driver_id: '11111111-1111-1111-1111-111111111111',
    passenger_id: '22222222-2222-2222-2222-222222222222',
    status: 'requested',
    origin_lat: -8.81,
    origin_lng: 13.23,
    dest_lat: -8.92,
    dest_lng: 13.18,
    distance_km: null,
    started_at: null,
    ended_at: null,
    market_code: 'ao',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function chainInsert(terminal: { data: unknown; error: unknown }) {
  insertMock.mockReturnValueOnce({ select: selectMock });
  selectMock.mockReturnValueOnce({ single: singleMock });
  singleMock.mockResolvedValueOnce(terminal);
}

beforeEach(() => {
  insertMock.mockReset();
  selectMock.mockReset();
  singleMock.mockReset();
  app = createApp();
});

describe('POST /rides', () => {
  const validBody = {
    driver_id: '11111111-1111-1111-1111-111111111111',
    origin_lat: -8.81,
    origin_lng: 13.23,
    dest_lat: -8.92,
    dest_lng: 13.18,
    market_code: 'ao',
  };

  it('cria uma boleia válida (201)', async () => {
    chainInsert({ data: rideRow(), error: null });

    const auth = await authHeader('22222222-2222-2222-2222-222222222222');
    const res = await request(app).post('/rides').set(auth).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.ride.id).toBe('ride-1');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: '11111111-1111-1111-1111-111111111111',
        passenger_id: '22222222-2222-2222-2222-222222222222',
        market_code: 'ao',
        status: 'requested',
      }),
    );
  });

  it('rejeita boleia consigo próprio (400)', async () => {
    const auth = await authHeader('11111111-1111-1111-1111-111111111111');
    const res = await request(app).post('/rides').set(auth).send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/não pode pedir uma boleia/);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('propaga 23505 do Supabase como 500 (não há unique no schema mas servimos a mensagem)', async () => {
    chainInsert({ data: null, error: { code: '23505', message: 'duplicate key' } });

    const auth = await authHeader('22222222-2222-2222-2222-222222222222');
    const res = await request(app).post('/rides').set(auth).send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('duplicate key');
  });

  it('rejeita body inválido (400)', async () => {
    const auth = await authHeader('22222222-2222-2222-2222-222222222222');
    const res = await request(app)
      .post('/rides')
      .set(auth)
      .send({ driver_id: 'not-a-uuid', origin_lat: 999, origin_lng: 13.23 });

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
