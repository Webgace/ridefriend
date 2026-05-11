// Ficheiro: src/config/markets/index.ts | Função: registo central de configurações de mercado (PL1 v2.1)
import { MarketConfig, MarketCode } from './types';
import { aoConfig } from './ao.config';
import { mzConfig } from './mz.config';
import { brConfig } from './br.config';
import { cvConfig } from './cv.config';
import { ptConfig } from './pt.config';
import { ngConfig } from './ng.config';

const MARKET_CONFIGS: Record<MarketCode, MarketConfig> = {
  ao: aoConfig,
  mz: mzConfig,
  br: brConfig,
  cv: cvConfig,
  pt: ptConfig,
  ng: ngConfig,
};

/**
 * Carrega configuração de mercado por código (assíncrono — para casos onde a config
 * possa ser remota no futuro).
 */
export async function loadMarketConfig(code: MarketCode): Promise<MarketConfig> {
  const config = MARKET_CONFIGS[code];
  if (!config) {
    throw new Error(`Market configuration not found: ${code}`);
  }
  return config;
}

/**
 * Devolve todas as configurações disponíveis.
 */
export function getAllMarkets(): MarketConfig[] {
  return Object.values(MARKET_CONFIGS);
}

/**
 * Versão síncrona — útil em contextos não-async (e.g. selectors do Zustand).
 */
export function getMarketConfig(code: MarketCode): MarketConfig {
  const config = MARKET_CONFIGS[code];
  if (!config) {
    throw new Error(`Market configuration not found: ${code}`);
  }
  return config;
}

export type { MarketCode, MarketConfig } from './types';
export type { PaymentMethod, Currency, MarketFeatures, MarketTheme } from './types';
