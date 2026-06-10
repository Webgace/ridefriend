// Ficheiro: src/hooks/useAppConfig.ts | Função: lê o key/value de public.app_config (admin-editável)
// As chaves esperadas estão definidas em AppConfigKey. Cache em memória durante a sessão;
// faz refresh on-demand via .refresh().
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@services/supabase';

export type AppConfigKey =
  | 'website_url'
  | 'support_email'
  | 'privacy_email'
  | 'privacy_url'
  | 'terms_url'
  // Canal usado pelo Supabase Auth → Twilio Verify para entregar o OTP. Aceita
  // 'sms' ou 'whatsapp' (case-insensitive). O dashboard precisa de ter o canal
  // correspondente activo + número WhatsApp Business aprovado.
  | 'otp_channel'
  // CSV de emails sempre promovidos a is_admin. O trigger ensure_admin_email()
  // aplica esta lista no INSERT/UPDATE da tabela users.
  | 'admin_emails';

export type AppConfigMap = Partial<Record<AppConfigKey, string | null>>;

const KNOWN_KEYS: AppConfigKey[] = [
  'website_url',
  'support_email',
  'privacy_email',
  'privacy_url',
  'terms_url',
  'otp_channel',
  'admin_emails',
];

let inMemoryCache: AppConfigMap | null = null;
const listeners = new Set<(m: AppConfigMap) => void>();

async function fetchAll(): Promise<AppConfigMap> {
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error) throw new Error(error.message);
  const map: AppConfigMap = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    if ((KNOWN_KEYS as string[]).includes(row.key)) {
      map[row.key as AppConfigKey] = row.value;
    }
  }
  inMemoryCache = map;
  listeners.forEach((fn) => fn(map));
  return map;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfigMap>(inMemoryCache ?? {});
  const [isLoading, setIsLoading] = useState(!inMemoryCache);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const map = await fetchAll();
      setConfig(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar configuração.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = (m: AppConfigMap) => setConfig(m);
    listeners.add(listener);
    if (!inMemoryCache) {
      void refresh();
    }
    return () => {
      listeners.delete(listener);
    };
  }, [refresh]);

  return { config, isLoading, error, refresh };
}

/**
 * Helper directo para callers que não estão dentro de um componente — devolve a
 * cache em memória (pode ser vazia se ainda não foi carregada).
 */
export function getAppConfigSnapshot(): AppConfigMap {
  return inMemoryCache ?? {};
}

/**
 * Apenas para o painel admin: actualiza uma chave via UPSERT (Supabase resolve
 * INSERT vs UPDATE pelo PK). Refaz a cache local após sucesso.
 */
export async function setAppConfigValue(
  key: AppConfigKey,
  value: string | null,
): Promise<void> {
  const payload = { key, value } as never;
  const { error } = await supabase
    .from('app_config')
    .upsert(payload, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  await fetchAll();
}
