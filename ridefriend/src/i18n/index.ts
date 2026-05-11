import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectMarket, setMarket as setStoredMarket } from './detector';
import { MarketCode } from '@types/index';

// Import all locale files
import ptAOCommon from './locales/pt-AO/common.json';
import ptAORide from './locales/pt-AO/ride.json';
import ptAOAuth from './locales/pt-AO/auth.json';
import ptAOErrors from './locales/pt-AO/errors.json';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBRRide from './locales/pt-BR/ride.json';
import ptBRAuth from './locales/pt-BR/auth.json';

import ptPTRide from './locales/pt-PT/ride.json';

import enNGCommon from './locales/en-NG/common.json';
import enNGRide from './locales/en-NG/ride.json';
import enNGAuth from './locales/en-NG/auth.json';
import enNGErrors from './locales/en-NG/errors.json';

const resources = {
  'pt-AO': {
    common: ptAOCommon,
    ride: ptAORide,
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'pt-MZ': {
    common: ptAOCommon, // Herança pt-AO
    ride: ptAORide,
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'pt-CV': {
    common: ptAOCommon,
    ride: ptAORide,
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'pt-ST': {
    common: ptAOCommon,
    ride: ptAORide,
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'pt-TL': {
    common: ptAOCommon,
    ride: ptAORide,
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'pt-BR': {
    common: ptBRCommon,
    ride: ptBRRide,
    auth: ptBRAuth,
    errors: ptAOErrors, // Use default errors
  },
  'pt-PT': {
    common: ptAOCommon, // Use default
    ride: ptPTRide, // Only differences
    auth: ptAOAuth,
    errors: ptAOErrors,
  },
  'en-NG': {
    common: enNGCommon,
    ride: enNGRide,
    auth: enNGAuth,
    errors: enNGErrors,
  },
};

/**
 * Initialize i18next for translation management
 */
export async function initI18n(): Promise<void> {
  try {
    // Detect market to get proper locale
    const market = await detectMarket();
    const localeMap: Record<string, string> = {
      ao: 'pt-AO',
      mz: 'pt-MZ',
      br: 'pt-BR',
      cv: 'pt-CV',
      pt: 'pt-PT',
      ng: 'en-NG',
    };
    const detectedLocale = localeMap[market] || 'pt-AO';

    await i18next
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'pt-AO',
        defaultNS: 'common',
        ns: ['common', 'ride', 'auth', 'errors'],
        lng: detectedLocale,
        interpolation: {
          escapeValue: false, // React already escapes values
        },
        react: {
          useSuspense: false,
        },
      });
  } catch (error) {
    console.error('initI18n error:', error);
    // Still initialize with fallback
    await i18next
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'pt-AO',
        defaultNS: 'common',
        ns: ['common', 'ride', 'auth', 'errors'],
        lng: 'pt-AO',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
  }
}

/**
 * Change language and market
 */
export async function changeLanguage(locale: string, market: MarketCode): Promise<void> {
  try {
    await setStoredMarket(market);
    await i18next.changeLanguage(locale);
  } catch (error) {
    console.error('changeLanguage error:', error);
    throw error;
  }
}

export { detectMarket, setStoredMarket as setMarket } from './detector';
export default i18next;
