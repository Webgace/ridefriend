// Ficheiro: src/config/api.ts | Função: URL base do backend RideFriend (P11/deploy)
import Constants from 'expo-constants';

/**
 * Devolve a URL base da API RideFriend.
 *
 * Prioridade:
 *   1. `EXPO_PUBLIC_API_BASE_URL` (env runtime — útil para dev local com tunnel)
 *   2. `expo.extra.apiBaseUrl` em app.json (build time — usado pelas builds EAS)
 *   3. Fallback: localhost:3000 (dev quando nada está definido)
 *
 * Em produção (binário EAS) o valor vem de `extra.apiBaseUrl` definido em app.json.
 */
export function apiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim() !== '') return fromEnv.trim().replace(/\/$/, '');

  const fromExtra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromExtra && fromExtra.trim() !== '') return fromExtra.trim().replace(/\/$/, '');

  return 'http://localhost:3000';
}

export const API_BASE_URL = apiBaseUrl();
