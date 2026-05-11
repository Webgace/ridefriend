// Ficheiro: backend/src/__tests__/auth.routes.test.ts | Função: integração de POST /auth/otp + verify (P11)
const otpMock = jest.fn();
const verifyOtpMock = jest.fn();

jest.mock('@lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      signInWithOtp: otpMock,
      verifyOtp: verifyOtpMock,
    },
  }),
}));

import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';

let app: Express;

beforeEach(() => {
  otpMock.mockReset();
  verifyOtpMock.mockReset();
  app = createApp();
});

describe('POST /auth/otp', () => {
  it('aceita um número E.164 válido', async () => {
    otpMock.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .post('/auth/otp')
      .send({ phone: '+244923000001' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(otpMock).toHaveBeenCalledWith({ phone: '+244923000001' });
  });

  it('rejeita número inválido (400) sem chamar o provider', async () => {
    const res = await request(app).post('/auth/otp').send({ phone: '912345' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Dados inválidos/);
    expect(otpMock).not.toHaveBeenCalled();
  });

  it('propaga erro do Supabase como 400', async () => {
    otpMock.mockResolvedValueOnce({ error: { message: 'invalid number' } });

    const res = await request(app)
      .post('/auth/otp')
      .send({ phone: '+244923000099' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid number');
  });

  it('aplica rate limit após 10 requests/min', async () => {
    otpMock.mockResolvedValue({ error: null });
    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/auth/otp').send({ phone: '+244923000010' });
    }
    const res = await request(app).post('/auth/otp').send({ phone: '+244923000010' });
    expect(res.status).toBe(429);
  });
});

describe('POST /auth/verify', () => {
  it('devolve a sessão quando o código é válido', async () => {
    const session = { access_token: 'tok', refresh_token: 'r', expires_at: 1 };
    const user = { id: 'u1', phone: '+244923000001' };
    verifyOtpMock.mockResolvedValueOnce({ data: { session, user }, error: null });

    const res = await request(app)
      .post('/auth/verify')
      .send({ phone: '+244923000001', token: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.session).toEqual(session);
    expect(res.body.user).toEqual(user);
  });

  it('devolve 401 com código inválido', async () => {
    verifyOtpMock.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: 'bad' } });

    const res = await request(app)
      .post('/auth/verify')
      .send({ phone: '+244923000001', token: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('bad');
  });
});
