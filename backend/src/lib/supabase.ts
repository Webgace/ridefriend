// Ficheiro: backend/src/lib/supabase.ts | Função: cliente Supabase com service_role para o servidor (P9)
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env';

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role — só pode ser usado em código de servidor.
 * Faz bypass de RLS, por isso cada controller é responsável por validar autorização.
 *
 * Nota: Node 20 não tem WebSocket nativo (Node 22+ tem). supabase-js inicializa o
 * RealtimeClient ao criar o cliente — sem o transport explícito, lança em runtime.
 */
export function getSupabase(): SupabaseClient {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: WebSocket as any },
    });
  }
  return cached;
}
