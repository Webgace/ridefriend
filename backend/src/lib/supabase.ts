// Ficheiro: backend/src/lib/supabase.ts | Função: cliente Supabase com service_role para o servidor (P9)
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role — só pode ser usado em código de servidor.
 * Faz bypass de RLS, por isso cada controller é responsável por validar autorização.
 */
export function getSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
