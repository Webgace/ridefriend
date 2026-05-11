// Ficheiro: backend/src/controllers/notifications.controller.ts | Função: POST /notifications/alert-contacts (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { sendPushToContacts } from '@services/push.service';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const alertSchema = z.object({
  radius_km: z.number().positive().max(50).default(5),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(255),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function alertContacts(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = alertSchema.parse(req.body);

  const result = await sendPushToContacts(me, body.radius_km, body.title, body.body, {
    type: 'contact_alert',
    ...(body.payload ?? {}),
  });

  // Audit trail (notifications row no próprio user — fica como histórico do que ele alertou).
  void Promise.resolve(
    getSupabase()
      .from('notifications')
      .insert({
        user_id: me,
        type: 'contact_alert_sent',
        payload: { ...body, delivered: result.delivered },
        is_read: true,
      }),
  ).then(
    () => null,
    () => null,
  );

  res.json(result);
}
