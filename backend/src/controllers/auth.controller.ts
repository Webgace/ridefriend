// Ficheiro: backend/src/controllers/auth.controller.ts | Função: OTP request/verify via Supabase Auth (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const otpSchema = z.object({
  phone: z.string().regex(/^\+\d{8,15}$/, 'Número em formato E.164 (ex.: +244912345678).'),
});

const verifySchema = z.object({
  phone: z.string().regex(/^\+\d{8,15}$/),
  token: z.string().regex(/^\d{4,8}$/, 'Código OTP inválido.'),
});

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phone } = otpSchema.parse(req.body);
  const { error } = await getSupabase().auth.signInWithOtp({ phone });
  if (error) throw new HttpError(400, error.message);
  res.json({ ok: true });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, token } = verifySchema.parse(req.body);
  const { data, error } = await getSupabase().auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error || !data.session) throw new HttpError(401, error?.message ?? 'Código inválido.');
  res.json({ session: data.session, user: data.user });
}
