// Ficheiro: src/services/alerts.service.ts | Função: alertar a rede de contactos próximos (P5/P8)
// "Estou Aqui!" no AlertButton: cria notificações na BD para cada contacto próximo.
// O envio Expo Push real entra em P8 (notifications.service + push.service no backend).
import { supabase } from '@services/supabase';

interface AlertNetworkInput {
  userId: string;
  userName: string;
  marketCode: string;
  stopName: string | null;
  contactIds: string[];
}

/**
 * Insere uma linha em public.notifications para cada contacto próximo.
 * P8 plug-in subscribe-or-poll para enviar push notifications a partir destas linhas.
 *
 * Retorna o número de contactos notificados (ou lança em caso de erro de BD).
 */
export async function alertNetwork(input: AlertNetworkInput): Promise<number> {
  if (input.contactIds.length === 0) return 0;

  const rows = input.contactIds.map((contactId) => ({
    user_id: contactId,
    type: 'contact_waiting',
    payload: {
      from_user_id: input.userId,
      from_user_name: input.userName,
      stop_name: input.stopName,
    },
    market_code: input.marketCode,
    is_read: false,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    throw new Error(error.message);
  }
  return rows.length;
}
