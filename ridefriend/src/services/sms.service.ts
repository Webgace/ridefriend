// Ficheiro: src/services/sms.service.ts | Função: dispatcher SMS multi-provider (PL3 v2.1)
// SEGURANÇA: as chaves dos providers ficam expostas no bundle cliente. Em produção,
// mover este envio para o backend (ver backend/src/services/sms.backend.service.ts em P9).
import { useMarketStore } from '@store/marketStore';
import { SMSProvider } from '@types/index';

interface ProviderEnv {
  africasTalkingApiKey: string;
  africasTalkingUsername: string;
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
  termiiKey: string;
}

function readEnv(): ProviderEnv {
  // EXPO_PUBLIC_* é a fonte principal (inline pelo Metro em build).
  // Os fallbacks sem prefixo permitem que os testes (jest-expo) injectem valores em
  // runtime — babel-preset-expo faz inline das `EXPO_PUBLIC_*` em transform time,
  // ficando inalcançáveis pelo `process.env.X = ...` dentro do test setup.
  return {
    africasTalkingApiKey:
      process.env.EXPO_PUBLIC_AFRICAS_TALKING_API_KEY ?? process.env.AFRICAS_TALKING_API_KEY ?? '',
    africasTalkingUsername:
      process.env.EXPO_PUBLIC_AFRICAS_TALKING_USERNAME ??
      process.env.AFRICAS_TALKING_USERNAME ??
      '',
    twilioSid: process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioToken: process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN ?? '',
    twilioFrom: process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER ?? process.env.TWILIO_FROM_NUMBER ?? '',
    termiiKey: process.env.EXPO_PUBLIC_TERMII_API_KEY ?? process.env.TERMII_API_KEY ?? '',
  };
}

const normalizePhone = (phone: string) => phone.replace(/\s+/g, '').trim();

/**
 * Constrói a mensagem de OTP no idioma do mercado activo.
 * Mantém o código de 4-6 dígitos visível em texto claro.
 */
export function buildOtpMessage(otpCode: string, locale: string): string {
  if (locale.startsWith('en')) {
    return `Your RideFriend code is: ${otpCode}. Valid for 10 minutes.`;
  }
  if (locale === 'pt-BR') {
    return `Seu código RideFriend é: ${otpCode}. Válido por 10 min.`;
  }
  // pt-AO, pt-MZ, pt-CV, pt-PT, fallback
  return `O teu código RideFriend é: ${otpCode}. Válido 10 min.`;
}

/**
 * Africa's Talking · POST application/x-www-form-urlencoded.
 * Cobertura: AO, MZ, CV (e fallback NG).
 */
export async function sendAfricasTalking(phone: string, message: string): Promise<void> {
  const env = readEnv();
  if (!env.africasTalkingApiKey || !env.africasTalkingUsername) {
    throw new Error('Africa\'s Talking não configurado.');
  }

  const body = new URLSearchParams({
    username: env.africasTalkingUsername,
    to: phone,
    message,
  }).toString();

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: env.africasTalkingApiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Africa's Talking erro ${response.status}: ${text}`);
  }
}

/**
 * Twilio · Basic auth com SID:TOKEN em base64.
 * Cobertura: BR, PT.
 */
export async function sendTwilio(phone: string, message: string): Promise<void> {
  const env = readEnv();
  if (!env.twilioSid || !env.twilioToken || !env.twilioFrom) {
    throw new Error('Twilio não configurado.');
  }

  // btoa está disponível no React Native (Hermes) e no Node 16+.
  const auth = (typeof btoa !== 'undefined'
    ? btoa(`${env.twilioSid}:${env.twilioToken}`)
    : Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString('base64'));

  const body = new URLSearchParams({
    To: phone,
    From: env.twilioFrom,
    Body: message,
  }).toString();

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Twilio erro ${response.status}: ${text}`);
  }
}

/**
 * Termii · JSON com api_key + sender id "RideFriend".
 * Cobertura: NG.
 */
export async function sendTermii(phone: string, message: string): Promise<void> {
  const env = readEnv();
  if (!env.termiiKey) {
    throw new Error('Termii não configurado.');
  }

  const response = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      api_key: env.termiiKey,
      to: phone,
      from: 'RideFriend',
      sms: message,
      type: 'plain',
      channel: 'generic',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Termii erro ${response.status}: ${text}`);
  }
}

/**
 * Dispatcher por provider — usado pelo OTP e por SOS backup.
 */
export async function sendSms(phone: string, message: string, provider: SMSProvider): Promise<void> {
  const cleanPhone = normalizePhone(phone);

  switch (provider) {
    case 'twilio':
      return sendTwilio(cleanPhone, message);
    case 'africas_talking':
      return sendAfricasTalking(cleanPhone, message);
    case 'termii':
      return sendTermii(cleanPhone, message);
    default:
      throw new Error(`Provider de SMS não suportado: ${provider}`);
  }
}

/**
 * API principal de OTP — lê provider e locale do market activo.
 * Lança se não houver mercado seleccionado.
 */
export async function sendOtpSms(phone: string, otpCode: string): Promise<void> {
  const config = useMarketStore.getState().config;
  if (!config) {
    throw new Error('Selecção de mercado obrigatória antes de enviar SMS.');
  }
  const message = buildOtpMessage(otpCode, config.locale);
  await sendSms(phone, message, config.smsProvider);
}
