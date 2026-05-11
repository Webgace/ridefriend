// Ficheiro: src/config/markets/ao.config.ts | Função: configuração do mercado Angola (PL1 v2.1)
import { MarketConfig } from './types';

export const aoConfig: MarketConfig = {
  code: 'ao',
  name: 'Angola',
  locale: 'pt-AO',
  timezone: 'Africa/Luanda',
  phonePrefix: '+244',
  phoneMinDigits: 9,
  phoneMaxDigits: 9,
  phonePlaceholder: '9XX XXX XXX',
  smsProvider: 'africas_talking',
  mapsProvider: 'osm',
  defaultCenter: { lat: -8.8383, lng: 13.2344 },
  defaultZoom: 13,
  geocodingProvider: 'nominatim',
  currency: {
    code: 'AOA',
    symbol: 'Kz',
    decimals: 2,
  },
  emergencyNumber: '113',
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
    accentColor: '#10B981',
    accentColorLight: '#6EE7B7',
  },
};
