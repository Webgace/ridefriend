// Ficheiro: src/config/markets/br.config.ts | Função: configuração do mercado Brasil (PL1 v2.1)
import { MarketConfig } from './types';

export const brConfig: MarketConfig = {
  code: 'br',
  name: 'Brasil',
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  phonePrefix: '+55',
  phoneMinDigits: 11,
  phoneMaxDigits: 11,
  phonePlaceholder: '(11) 9XXXX-XXXX',
  smsProvider: 'twilio',
  mapsProvider: 'google',
  defaultCenter: { lat: -23.5505, lng: -46.6333 },
  defaultZoom: 13,
  geocodingProvider: 'google',
  currency: {
    code: 'BRL',
    symbol: 'R$',
    decimals: 2,
  },
  emergencyNumber: '190',
  privacyRegulation: 'lgpd',
  dataResidency: 'local',
  paymentMethods: [
    { id: 'cash', name: 'Dinheiro' },
    { id: 'card', name: 'Cartão' },
    { id: 'wallet', name: 'Carteira' },
    { id: 'pix', name: 'PIX' },
  ],
  features: {
    inAppPayments: true,
    gdprConsent: false,
    googleMaps: true,
    backgroundLocation: true,
    vehicleVerification: true,
  },
  theme: {
    accentColor: '#10B981',
    accentColorLight: '#6EE7B7',
  },
  supportWhatsApp: '5511999999999',
};
