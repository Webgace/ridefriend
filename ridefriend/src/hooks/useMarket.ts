// Ficheiro: src/hooks/useMarket.ts | Função: hook do mercado activo + helpers (PL1 v2.1)
import { useMemo } from 'react';
import { useMarketStore } from '@store/marketStore';
import { MarketConfig, MarketCode, MarketFeatures } from '@config/markets';

interface MarketHookResult extends MarketConfig {
  /** Formata um valor numérico no formato monetário do mercado activo. */
  formatCurrency: (value: number) => string;
  /** Valida o número de telemóvel contra `phoneMinDigits`/`phoneMaxDigits`. */
  validatePhone: (phone: string) => boolean;
  /** Formata o número com prefixo do mercado (E.164 simples). */
  formatPhone: (phone: string) => string;
  /** Verifica se uma feature está activa neste mercado. */
  hasFeature: (featureName: keyof MarketFeatures) => boolean;
  /** Permite mudar o mercado (re-exporta a acção do marketStore). */
  setMarket: (code: MarketCode) => Promise<void>;
}

export function useMarket(): MarketHookResult {
  const config = useMarketStore((state) => state.config);
  const setMarket = useMarketStore((state) => state.setMarket);

  if (!config) {
    throw new Error('Market not initialized. Call useMarketStore.getState().initialize() at startup.');
  }

  return useMemo<MarketHookResult>(() => ({
    ...config,

    setMarket,

    formatCurrency: (value: number) =>
      `${config.currency.symbol}${value.toFixed(config.currency.decimals)}`,

    validatePhone: (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return (
        cleaned.length >= config.phoneMinDigits &&
        cleaned.length <= config.phoneMaxDigits
      );
    },

    formatPhone: (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return `${config.phonePrefix} ${cleaned}`;
    },

    hasFeature: (featureName: keyof MarketFeatures) =>
      config.features[featureName] === true,
  }), [config, setMarket]);
}
