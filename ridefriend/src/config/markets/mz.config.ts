// Ficheiro: src/config/markets/mz.config.ts | Função: configuração do mercado Moçambique (PL1 v2.1)
import { MarketConfig } from './types';

export const mzConfig: MarketConfig = {
  code: 'mz',
  name: 'Moçambique',
  locale: 'pt-MZ',
  timezone: 'Africa/Maputo',
  phonePrefix: '+258',
  phoneMinDigits: 9,
  phoneMaxDigits: 9,
  phonePlaceholder: '8XX XXX XXX',
  smsProvider: 'africas_talking',
  mapsProvider: 'osm',
  defaultCenter: { lat: -25.9655, lng: 32.5832 },
  defaultZoom: 13,
  geocodingProvider: 'nominatim',
  currency: {
    code: 'MZN',
    symbol: 'MT',
    decimals: 2,
  },
  emergencyNumber: '119',
  privacyRegulation: 'none',
  dataResidency: 'any',
  features: {
    inAppPayments: false,
    gdprConsent: false,
    googleMaps: false,
    backgroundLocation: true,
    vehicleVerification: false,
  },
  theme: {
    accentColor: '#06B6D4',
    accentColorLight: '#67E8F9',
  },
};
