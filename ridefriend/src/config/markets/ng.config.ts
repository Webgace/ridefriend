// Ficheiro: src/config/markets/ng.config.ts | Função: configuração do mercado Nigeria (PL1 v2.1)
import { MarketConfig } from './types';

export const ngConfig: MarketConfig = {
  code: 'ng',
  name: 'Nigeria',
  locale: 'en-NG',
  timezone: 'Africa/Lagos',
  phonePrefix: '+234',
  phoneMinDigits: 10,
  phoneMaxDigits: 10,
  phonePlaceholder: '080X XXX XXXX',
  smsProvider: 'termii',
  mapsProvider: 'osm',
  defaultCenter: { lat: 6.5244, lng: 3.3792 },
  defaultZoom: 13,
  geocodingProvider: 'nominatim',
  currency: {
    code: 'NGN',
    symbol: '₦',
    decimals: 2,
  },
  emergencyNumber: '199',
  privacyRegulation: 'none',
  dataResidency: 'local',
  features: {
    inAppPayments: false,
    gdprConsent: false,
    googleMaps: false,
    backgroundLocation: true,
    vehicleVerification: true,
  },
  theme: {
    accentColor: '#F97316',
    accentColorLight: '#FB923C',
  },
};
