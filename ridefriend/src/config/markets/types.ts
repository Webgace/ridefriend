// Ficheiro: src/config/markets/types.ts | Função: tipos de mercado (PL1 v2.1)
export type MarketCode = 'ao' | 'mz' | 'br' | 'cv' | 'pt' | 'ng';
export type SMSProvider = 'twilio' | 'africas_talking' | 'termii';
export type MapsProvider = 'osm' | 'google';
export type GeocodingProvider = 'nominatim' | 'google';
export type CurrencyCode = 'AOA' | 'MZN' | 'BRL' | 'CVE' | 'EUR' | 'NGN';
export type PrivacyRegulation = 'lgpd' | 'rgpd' | 'none';
export type DataResidency = 'local' | 'eu' | 'any';
export type PaymentMethodId = 'cash' | 'card' | 'wallet' | 'pix' | 'mbway' | 'mpesa';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  icon?: string;
  enabled?: boolean;
}

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
}

export interface MarketFeatures {
  inAppPayments: boolean;
  gdprConsent: boolean;
  googleMaps: boolean;
  backgroundLocation: boolean;
  vehicleVerification: boolean;
}

export interface MarketTheme {
  accentColor: string;
  accentColorLight?: string;
}

export interface MarketConfig {
  code: MarketCode;
  name: string;
  locale: string;
  timezone: string;
  phonePrefix: string;
  phoneMinDigits: number;
  phoneMaxDigits: number;
  phonePlaceholder: string;
  smsProvider: SMSProvider;
  mapsProvider: MapsProvider;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  geocodingProvider: GeocodingProvider;
  currency: Currency;
  emergencyNumber: string;
  privacyRegulation: PrivacyRegulation;
  dataResidency: DataResidency;
  paymentMethods?: PaymentMethod[];
  features: MarketFeatures;
  theme: MarketTheme;
  supportWhatsApp?: string;
}
