// Ficheiro: src/config/markets/pt.config.ts | Função: configuração do mercado Portugal (PL1 v2.1)
import { MarketConfig } from './types';

export const ptConfig: MarketConfig = {
  code: 'pt',
  name: 'Portugal',
  locale: 'pt-PT',
  timezone: 'Europe/Lisbon',
  phonePrefix: '+351',
  phoneMinDigits: 9,
  phoneMaxDigits: 9,
  phonePlaceholder: '9XX XXX XXX',
  smsProvider: 'twilio',
  mapsProvider: 'google',
  defaultCenter: { lat: 38.7223, lng: -9.1393 },
  defaultZoom: 13,
  geocodingProvider: 'google',
  currency: {
    code: 'EUR',
    symbol: '€',
    decimals: 2,
  },
  emergencyNumber: '112',
  privacyRegulation: 'rgpd',
  dataResidency: 'eu',
  paymentMethods: [
    { id: 'cash', name: 'Dinheiro' },
    { id: 'card', name: 'Cartão' },
    { id: 'wallet', name: 'Carteira' },
    { id: 'mbway', name: 'MB Way' },
  ],
  features: {
    inAppPayments: true,
    gdprConsent: true,
    googleMaps: true,
    backgroundLocation: true,
    vehicleVerification: false,
  },
  theme: {
    accentColor: '#D97706',
    accentColorLight: '#F97316',
  },
  supportWhatsApp: '351912000000',
};
