// Ficheiro: backend/src/lib/env.ts | Função: lê e valida variáveis de ambiente (P9)
import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Variável de ambiente em falta: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3000')),
  appVersion: optional('APP_VERSION', '0.1.0'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseJwtSecret: required('SUPABASE_JWT_SECRET'),
  corsOrigins: optional('CORS_ORIGINS', '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  africasTalking: {
    username: optional('AT_USERNAME', ''),
    apiKey: optional('AT_API_KEY', ''),
    senderId: optional('AT_SENDER_ID', 'RideFriend'),
  },
};

export type AppEnv = typeof env;
