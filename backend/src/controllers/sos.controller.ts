// Ficheiro: backend/src/controllers/sos.controller.ts | Função: POST /sos (regista evento + push + SMS) (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';
import { sendSosAlert } from '@services/push.service';

const sosSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  ride_id: z.string().uuid().nullable().optional(),
  emergency_contact_phone: z.string().regex(/^\+\d{8,15}$/),
  emergency_contact_user_id: z.string().uuid().nullable().optional(),
});

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function triggerSos(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = sosSchema.parse(req.body);
  const supabase = getSupabase();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('name')
    .eq('id', me)
    .maybeSingle();
  if (userError) throw new HttpError(500, userError.message);
  if (!user) throw new HttpError(404, 'Utilizador não encontrado.');

  // 1. Audit trail.
  const { data: event, error: insertError } = await supabase
    .from('sos_events')
    .insert({
      user_id: me,
      ride_id: body.ride_id ?? null,
      lat: body.lat,
      lng: body.lng,
    })
    .select('id, triggered_at')
    .single();
  if (insertError) throw new HttpError(500, insertError.message);

  // 2. Entrega (push + SMS) — best effort, não falha o request se um canal falhar.
  const delivery = await sendSosAlert({
    fromUserName: user.name,
    emergencyContactPhone: body.emergency_contact_phone,
    emergencyContactUserId: body.emergency_contact_user_id ?? null,
    lat: body.lat,
    lng: body.lng,
  });

  res.status(201).json({
    sos_event: event,
    delivery,
  });
}
