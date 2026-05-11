// Ficheiro: backend/src/controllers/locations.controller.ts | Função: /locations upsert + nearby (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const modeEnum = z.enum(['passenger', 'driver']);

const upsertSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy: z.number().nonnegative().nullable().optional(),
  mode: modeEnum.optional().default('passenger'),
  is_active: z.boolean().optional().default(true),
  heading: z.number().gte(0).lte(360).nullable().optional(),
  speed: z.number().nonnegative().nullable().optional(),
});

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radius_km: z.coerce.number().positive().max(50).default(5),
  mode: modeEnum.optional(),
});

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function upsertMyLocation(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = upsertSchema.parse(req.body);
  const { data, error } = await getSupabase()
    .from('locations')
    .upsert(
      {
        user_id: me,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, lat, lng, mode, is_active, accuracy, heading, speed, updated_at')
    .single();
  if (error) throw new HttpError(500, error.message);
  res.json({ location: data });
}

export async function getNearby(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const q = nearbyQuerySchema.parse(req.query);

  // RPC `nearby_users(lat, lng, radius_km, mode, exclude_user_id)` — fornecida pelo schema PostGIS.
  const { data, error } = await getSupabase().rpc('nearby_users', {
    p_lat: q.lat,
    p_lng: q.lng,
    p_radius_km: q.radius_km,
    p_mode: q.mode ?? null,
    p_exclude_user_id: me,
  });
  if (error) throw new HttpError(500, error.message);
  res.json({ users: data ?? [] });
}
