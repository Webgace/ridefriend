// Ficheiro: backend/src/services/push.service.ts | Função: Expo Push API + SOS server-side (P8/P9)
// Reescrito em P9 para usar supabase-js (service_role) em vez de Prisma.
import { getSupabase } from '@lib/supabase';
import { logger } from '@lib/logger';
import { sendSms } from './sms.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_LIMIT = 100;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: 'default' | 'sos';
}

interface PushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoSendResponse {
  data?: PushReceipt[];
  errors?: Array<{ code: string; message: string }>;
}

async function sendBatchToExpo(messages: PushMessage[]): Promise<PushReceipt[]> {
  if (messages.length === 0) return [];
  const receipts: PushReceipt[] = [];

  for (let i = 0; i < messages.length; i += EXPO_BATCH_LIMIT) {
    const batch = messages.slice(i, i + EXPO_BATCH_LIMIT);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Expo push error ${response.status}: ${text}`);
    }
    const json = (await response.json()) as ExpoSendResponse;
    if (json.errors?.length) {
      throw new Error(`Expo push errors: ${JSON.stringify(json.errors)}`);
    }
    receipts.push(...(json.data ?? []));
  }
  return receipts;
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId: 'default' | 'sos' = 'default',
): Promise<void> {
  const { data: user, error } = await getSupabase()
    .from('users')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!user?.expo_push_token) return;

  await sendBatchToExpo([
    {
      to: user.expo_push_token,
      title,
      body,
      data,
      sound: 'default',
      priority: channelId === 'sos' ? 'high' : 'default',
      channelId,
    },
  ]);
}

/**
 * sendPushToContacts — push a contactos do `userId` num raio (km), via PostGIS.
 */
export async function sendPushToContacts(
  userId: string,
  radiusKm: number,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ delivered: number }> {
  // RPC `nearby_contact_push_tokens(user_id uuid, radius_km numeric)` é fornecida no schema
  // da Supabase em P2/P9 (ST_DistanceSphere sobre `locations`). Se não existir, devolve [].
  const { data: rows, error } = await getSupabase().rpc('nearby_contact_push_tokens', {
    p_user_id: userId,
    p_radius_km: radiusKm,
  });
  if (error) {
    logger.warn('nearby_contact_push_tokens RPC failed, no push enviado.', {
      message: error.message,
    });
    return { delivered: 0 };
  }

  const tokens = (rows ?? []) as Array<{ expo_push_token: string }>;
  const messages: PushMessage[] = tokens
    .filter((t) => Boolean(t.expo_push_token))
    .map((t) => ({
      to: t.expo_push_token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'default',
      channelId: 'default',
    }));

  const receipts = await sendBatchToExpo(messages);
  return { delivered: receipts.filter((r) => r.status === 'ok').length };
}

export async function sendSosAlert(payload: {
  fromUserName: string;
  emergencyContactPhone: string;
  emergencyContactUserId?: string | null;
  lat: number;
  lng: number;
}): Promise<{ pushDelivered: boolean; smsDelivered: boolean }> {
  const mapsUrl = `https://maps.google.com/?q=${payload.lat},${payload.lng}`;
  const message = `RideFriend SOS: ${payload.fromUserName} precisa de ajuda. Localização: ${mapsUrl}`;

  let pushDelivered = false;
  let smsDelivered = false;

  if (payload.emergencyContactUserId) {
    try {
      await sendPushToUser(
        payload.emergencyContactUserId,
        'SOS RideFriend',
        message,
        { type: 'sos_alert', lat: payload.lat, lng: payload.lng },
        'sos',
      );
      pushDelivered = true;
    } catch (error) {
      logger.warn('SOS push falhou, continuando para SMS.', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await sendSms(payload.emergencyContactPhone, message);
    smsDelivered = true;
  } catch (error) {
    logger.warn('SOS SMS falhou.', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { pushDelivered, smsDelivered };
}
