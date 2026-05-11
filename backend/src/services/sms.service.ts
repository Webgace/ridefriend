// Ficheiro: backend/src/services/sms.service.ts | Função: envio de SMS via AfricasTalking (P9)
import { env } from '@lib/env';
import { logger } from '@lib/logger';

const AT_URL = 'https://api.africastalking.com/version1/messaging';

/**
 * sendSms — envia um SMS pelo AfricasTalking. Em ambiente sem chaves configuradas,
 * faz log e devolve sem lançar (útil para dev local).
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const { username, apiKey, senderId } = env.africasTalking;
  if (!username || !apiKey) {
    logger.warn('SMS provider sem credenciais — mensagem ignorada.', { to });
    return;
  }

  const body = new URLSearchParams({
    username,
    to,
    message,
    from: senderId,
  });

  const response = await fetch(AT_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SMS provider error ${response.status}: ${text}`);
  }
}
