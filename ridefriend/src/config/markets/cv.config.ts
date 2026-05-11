// Ficheiro: src/config/markets/cv.config.ts | Função: configuração do mercado Cabo Verde (PL1 v2.1)
import { MarketConfig } from './types';

export const cvConfig: MarketConfig = {
  code: 'cv',
  name: 'Cabo Verde',
  locale: 'pt-CV',
  timezone: 'Atlantic/Cape_Verde',
  phonePrefix: '+238',
  phoneMinDigits: 7,
  phoneMaxDigits: 7,
  phonePlaceholder: '9XX XXXX',
  smsProvider: 'africas_talking',
  mapsProvider: 'osm',
  defaultCenter: { lat: 15.0557, lng: -23.6387 },
  defaultZoom: 13,
  geocodingProvider: 'nominatim',
  currency: {
    code: 'CVE',
    symbol: '$',
    decimals: 0,
  },
  emergencyNumber: '132',
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
    accentColor: '#8B5CF6',
    accentColorLight: '#C4B5FD',
  },
};
