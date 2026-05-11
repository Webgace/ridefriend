// Ficheiro: src/hooks/useT.ts | Função: wrapper tipado de useTranslation por namespace (PL1 v2.1)
import { useTranslation, UseTranslationResponse } from 'react-i18next';
import type { TFunction } from 'i18next';

type Namespace = 'common' | 'ride' | 'auth' | 'errors';

/**
 * Hook de tradução com fallback automático para o namespace 'common'.
 * Uso: const { t } = useT('ride');
 */
export function useT<NS extends Namespace = 'common'>(
  namespace?: NS,
): UseTranslationResponse<NS, Namespace> & { t: TFunction<NS, Namespace> } {
  const result = useTranslation<NS, Namespace>(
    namespace ? [namespace, 'common'] : ['common'],
  );
  return result as UseTranslationResponse<NS, Namespace> & { t: TFunction<NS, Namespace> };
}

/**
 * Variante que devolve também o nome do namespace (útil para debug/log).
 */
export function useNamespace<NS extends Namespace = 'common'>(namespace: NS) {
  const { t, i18n } = useT(namespace);
  return { t, i18n, ns: namespace };
}
