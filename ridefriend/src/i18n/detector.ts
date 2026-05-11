// Ficheiro: src/i18n/detector.ts | Função: detecção de mercado por locale + persistência (PL1 v2.1)
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { MarketCode } from '@config/markets';

const MARKET_STORAGE_KEY = 'ridefriend_market_code';
const VALID_CODES: MarketCode[] = ['ao', 'mz', 'br', 'cv', 'pt', 'ng'];

function isValidMarketCode(code: string): code is MarketCode {
  return (VALID_CODES as string[]).includes(code);
}

/**
 * Mapeia o locale do dispositivo (e.g. "pt-AO", "en-NG") para um MarketCode.
 * Privilegia matches específicos (pt-AO → ao) sobre genéricos (pt → ao).
 */
function detectMarketFromLocale(locale: string): MarketCode | null {
  const normalized = locale.toLowerCase();

  if (normalized.startsWith('pt-ao')) return 'ao';
  if (normalized.startsWith('pt-mz')) return 'mz';
  if (normalized.startsWith('pt-br')) return 'br';
  if (normalized.startsWith('pt-cv')) return 'cv';
  if (normalized.startsWith('pt-pt')) return 'pt';
  if (normalized.startsWith('en-ng')) return 'ng';

  // Fallbacks por idioma base
  if (normalized.startsWith('pt')) return 'ao';
  if (normalized.startsWith('en')) return 'ng';

  return null;
}

/**
 * Detecta o mercado:
 * 1. Preferência guardada (SecureStore)
 * 2. Locale do dispositivo
 * 3. Fallback "ao"
 */
export async function detectMarket(): Promise<MarketCode> {
  try {
    const stored = await SecureStore.getItemAsync(MARKET_STORAGE_KEY);
    if (stored && isValidMarketCode(stored)) {
      return stored;
    }

    const deviceLocale = Localization.locale ?? '';
    const detected = detectMarketFromLocale(deviceLocale);
    if (detected) return detected;

    return 'ao';
  } catch (error) {
    console.error('detectMarket error:', error);
    return 'ao';
  }
}

/**
 * Guarda a escolha do mercado.
 */
export async function setMarket(code: MarketCode): Promise<void> {
  if (!isValidMarketCode(code)) {
    throw new Error(`Invalid market code: ${code}`);
  }
  await SecureStore.setItemAsync(MARKET_STORAGE_KEY, code);
}

/**
 * Limpa a preferência (volta a detectar pelo locale).
 */
export async function clearMarket(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(MARKET_STORAGE_KEY);
  } catch (error) {
    console.error('clearMarket error:', error);
  }
}
