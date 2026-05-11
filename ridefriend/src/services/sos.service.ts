// Ficheiro: src/services/sos.service.ts | Função: dispara um SOS (BD + push + SMS backup) (P8)
import { supabase } from '@services/supabase';
import { sendSms } from '@services/sms.service';
import { useMarketStore } from '@store/marketStore';
import { EmergencyContact } from '@store/emergencyContactStore';

export interface TriggerSosInput {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  emergencyContact: EmergencyContact;
  /** Quando true, não cria sos_event, não envia SMS — só simula localmente. */
  testMode?: boolean;
  /** ride_id opcional caso o SOS aconteça durante uma boleia activa. */
  rideId?: string | null;
}

export interface TriggerSosResult {
  sosEventId: string | null;
  smsDelivered: boolean;
  pushDelivered: boolean;
}

/**
 * Mensagem de SOS por SMS — em pt-PT por defeito, pt-BR / en para mercados aplicáveis.
 */
function buildSosSmsMessage(
  userName: string,
  lat: number,
  lng: number,
  locale: string,
): string {
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  if (locale.startsWith('en')) {
    return `RideFriend SOS: ${userName} needs help. Location: ${mapsUrl}`;
  }
  if (locale === 'pt-BR') {
    return `RideFriend SOS: ${userName} precisa de ajuda. Localização: ${mapsUrl}`;
  }
  return `RideFriend SOS: ${userName} precisa de ajuda. Localização: ${mapsUrl}`;
}

/**
 * Dispara o SOS. Faz tudo o que pode em paralelo — não falha por inteiro se um canal falhar.
 *
 * Ordem de prioridade:
 *  1. Insert em sos_events (audit trail) — se falhar, abortamos.
 *  2. SMS para o contacto de emergência (cobertura mais robusta em redes fracas).
 *  3. Push notification via tabela `notifications` (será entregue pelo backend em P9).
 */
export async function triggerSos(input: TriggerSosInput): Promise<TriggerSosResult> {
  const config = useMarketStore.getState().config;
  if (!config) throw new Error('Mercado não seleccionado.');

  const result: TriggerSosResult = {
    sosEventId: null,
    smsDelivered: false,
    pushDelivered: false,
  };

  if (input.testMode) {
    // Modo de teste — não escreve na BD, não envia SMS. Permite validar a UI.
    return result;
  }

  // 1. Audit trail.
  const { data: sosRow, error: sosError } = await supabase
    .from('sos_events')
    .insert({
      user_id: input.userId,
      ride_id: input.rideId ?? null,
      lat: input.lat,
      lng: input.lng,
    })
    .select('id')
    .single();

  if (sosError || !sosRow) {
    throw new Error(sosError?.message ?? 'Falha ao registar SOS.');
  }
  result.sosEventId = sosRow.id;

  // 2 e 3 em paralelo — mesmo que um falhe, o outro continua.
  const smsPromise = (async () => {
    try {
      const message = buildSosSmsMessage(input.userName, input.lat, input.lng, config.locale);
      await sendSms(input.emergencyContact.phone, message, config.smsProvider);
      result.smsDelivered = true;
    } catch (error) {
      console.warn('SOS SMS failed:', error);
    }
  })();

  const pushPromise = (async () => {
    // Só tem sentido enviar push se for utilizador RideFriend (id de contacto da rede).
    if (input.emergencyContact.isExternal) return;
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: input.emergencyContact.id,
        type: 'sos_alert',
        payload: {
          from_user_id: input.userId,
          from_user_name: input.userName,
          lat: input.lat,
          lng: input.lng,
          sos_event_id: sosRow.id,
        },
        market_code: config.code,
        is_read: false,
      });
      if (!error) result.pushDelivered = true;
    } catch (error) {
      console.warn('SOS push notification failed:', error);
    }
  })();

  await Promise.allSettled([smsPromise, pushPromise]);
  return result;
}
