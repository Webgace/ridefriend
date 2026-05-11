// Ficheiro: backend/src/controllers/ratings.controller.ts | Função: POST /ratings (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const createSchema = z.object({
  ride_id: z.string().uuid(),
  rated_id: z.string().uuid(),
  score: z.number().int().gte(1).lte(5),
  comment: z.string().max(500).optional(),
});

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function createRating(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = createSchema.parse(req.body);
  if (body.rated_id === me) {
    throw new HttpError(400, 'Não é possível avaliar-se a si próprio.');
  }

  const supabase = getSupabase();

  // A boleia tem de estar concluída e o autor tem de ser parte dela.
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('id, driver_id, passenger_id, status')
    .eq('id', body.ride_id)
    .maybeSingle();
  if (rideError) throw new HttpError(500, rideError.message);
  if (!ride) throw new HttpError(404, 'Boleia não encontrada.');
  if (ride.status !== 'completed') {
    throw new HttpError(409, 'Só é possível avaliar boleias concluídas.');
  }
  if (ride.driver_id !== me && ride.passenger_id !== me) {
    throw new HttpError(403, 'Sem acesso a esta boleia.');
  }
  if (ride.driver_id !== body.rated_id && ride.passenger_id !== body.rated_id) {
    throw new HttpError(400, 'O avaliado não participou nesta boleia.');
  }

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      ride_id: body.ride_id,
      rater_id: me,
      rated_id: body.rated_id,
      score: body.score,
      comment: body.comment ?? null,
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new HttpError(409, 'Já avaliou esta boleia.');
    throw new HttpError(500, error.message);
  }

  // Recalcula o average — chama RPC `recalc_user_rating(user_id)` se existir, senão ignora.
  // O PostgrestBuilder do supabase-js é thenable mas não é uma Promise nativa (sem .catch),
  // por isso embrulhamos em Promise.resolve.
  void Promise.resolve(
    supabase.rpc('recalc_user_rating', { p_user_id: body.rated_id }),
  ).then(
    () => null,
    () => null,
  );

  res.status(201).json({ rating: data });
}
