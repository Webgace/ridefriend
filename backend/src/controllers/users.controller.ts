// Ficheiro: backend/src/controllers/users.controller.ts | Função: GET/PATCH /users/me e GET /users/:id (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const PUBLIC_FIELDS = 'id, name, photo_url, home_area, is_driver, rating_avg, ride_count';
const SELF_FIELDS = `${PUBLIC_FIELDS}, phone, email, expo_push_token, market_code, created_at`;

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(255).nullable().optional(),
    photo_url: z.string().url().max(2048).nullable().optional(),
    home_area: z.string().max(120).nullable().optional(),
    is_driver: z.boolean().optional(),
    expo_push_token: z.string().max(255).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nenhum campo a actualizar.');

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const { data, error } = await getSupabase()
    .from('users')
    .select(SELF_FIELDS)
    .eq('id', userId(req))
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Utilizador não encontrado.');
  res.json({ user: data });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const patch = updateSchema.parse(req.body);
  const { data, error } = await getSupabase()
    .from('users')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId(req))
    .select(SELF_FIELDS)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Utilizador não encontrado.');
  res.json({ user: data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = z.string().uuid('Id inválido.').parse(req.params.id);
  const me = userId(req);

  // Só devolve perfil completo a self ou contacto. Caso contrário, 404 para não revelar.
  const { data: contact } = await getSupabase()
    .from('contacts')
    .select('id')
    .eq('user_id', me)
    .eq('contact_user_id', id)
    .maybeSingle();
  const isSelf = id === me;
  if (!isSelf && !contact) throw new HttpError(404, 'Utilizador não encontrado.');

  const { data, error } = await getSupabase()
    .from('users')
    .select(PUBLIC_FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Utilizador não encontrado.');
  res.json({ user: data });
}
