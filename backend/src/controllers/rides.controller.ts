// Ficheiro: backend/src/controllers/rides.controller.ts | Função: /rides list/create + status (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';
import { sendPushToUser } from '@services/push.service';

const statusEnum = z.enum(['requested', 'accepted', 'in_progress', 'completed', 'cancelled']);

const listSchema = z.object({
  role: z.enum(['driver', 'passenger']).optional(),
  status: statusEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createSchema = z.object({
  driver_id: z.string().uuid(),
  origin_lat: z.number().gte(-90).lte(90),
  origin_lng: z.number().gte(-180).lte(180),
  dest_lat: z.number().gte(-90).lte(90).nullable().optional(),
  dest_lng: z.number().gte(-180).lte(180).nullable().optional(),
  market_code: z.string().length(2).optional(),
});

const patchStatusSchema = z.object({
  status: statusEnum,
});

const allowedTransitions: Record<string, string[]> = {
  requested: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function listRides(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const q = listSchema.parse(req.query);

  let query = getSupabase()
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(q.limit);

  if (q.role === 'driver') query = query.eq('driver_id', me);
  else if (q.role === 'passenger') query = query.eq('passenger_id', me);
  else query = query.or(`driver_id.eq.${me},passenger_id.eq.${me}`);

  if (q.status) query = query.eq('status', q.status);

  const { data, error } = await query;
  if (error) throw new HttpError(500, error.message);
  res.json({ rides: data ?? [] });
}

export async function createRide(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = createSchema.parse(req.body);
  if (body.driver_id === me) {
    throw new HttpError(400, 'O motorista não pode pedir uma boleia a si próprio.');
  }
  const { data, error } = await getSupabase()
    .from('rides')
    .insert({
      driver_id: body.driver_id,
      passenger_id: me,
      origin_lat: body.origin_lat,
      origin_lng: body.origin_lng,
      dest_lat: body.dest_lat ?? null,
      dest_lng: body.dest_lng ?? null,
      market_code: body.market_code ?? 'ao',
      status: 'requested',
    })
    .select('*')
    .single();
  if (error) throw new HttpError(500, error.message);

  // Notifica o motorista — não é fatal se falhar.
  void sendPushToUser(
    body.driver_id,
    'Novo pedido de boleia',
    'Tens um novo pedido na RideFriend.',
    { type: 'ride_request', ride_id: data.id },
  ).catch(() => null);

  res.status(201).json({ ride: data });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const id = z.string().uuid('Id de boleia inválido.').parse(req.params.id);
  const { status } = patchStatusSchema.parse(req.body);

  const { data: ride, error: fetchError } = await getSupabase()
    .from('rides')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new HttpError(500, fetchError.message);
  if (!ride) throw new HttpError(404, 'Boleia não encontrada.');
  if (ride.driver_id !== me && ride.passenger_id !== me) {
    throw new HttpError(403, 'Sem acesso a esta boleia.');
  }
  if (!allowedTransitions[ride.status]?.includes(status)) {
    throw new HttpError(409, `Transição ${ride.status} → ${status} não permitida.`);
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'in_progress' && !ride.started_at) patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.ended_at = new Date().toISOString();

  const { data: updated, error: updateError } = await getSupabase()
    .from('rides')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (updateError) throw new HttpError(500, updateError.message);

  // Notifica a contraparte.
  const recipient = me === ride.driver_id ? ride.passenger_id : ride.driver_id;
  if (recipient) {
    void sendPushToUser(
      recipient,
      'Boleia actualizada',
      `Estado: ${status}`,
      { type: status === 'accepted' ? 'ride_accepted' : 'ride_status', ride_id: id, status },
    ).catch(() => null);
  }

  res.json({ ride: updated });
}
