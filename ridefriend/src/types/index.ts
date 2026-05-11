// Ficheiro: src/types/index.ts | Função: tipos da aplicação (alinhado com v2.1)
export type RideStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type ContactGroup = 'family' | 'friend' | 'colleague' | 'neighbour';
export type LocationMode = 'passenger' | 'driver';
// Market-related types
export type MarketCode = 'ao' | 'mz' | 'br' | 'cv' | 'pt' | 'ng';
export type SMSProvider = 'twilio' | 'africas_talking' | 'termii';
export type MapsProvider = 'osm' | 'google';
export type GeocodingProvider = 'nominatim' | 'google';
export type TrackingProvider = 'native';
export type CurrencyCode = 'AOA' | 'MZN' | 'BRL' | 'CVE' | 'EUR' | 'NGN';
export type PrivacyRegulation = 'lgpd' | 'rgpd' | 'none';
export type DataResidency = 'local' | 'eu' | 'any';
export type PaymentMethodId = 'cash' | 'card' | 'wallet' | 'pix' | 'mbway' | 'mpesa';

// Payment-related types (backwards compat)
export type PaymentMethod = PaymentMethodId;

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatar?: string;
  rating: number;
  totalRides: number;
  isDriver: boolean;
  isPassenger: boolean;
  marketCode: MarketCode;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  userId: string;
  contactName: string;
  contactPhone: string;
  group: ContactGroup;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: number;
}

export interface Ride {
  id: string;
  driverId: string;
  passengerId?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: RideStatus;
  departureTime: string;
  estimatedArrival?: string;
  actualArrival?: string;
  fare: number;
  currency: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'ride' | 'message' | 'system';
  rideId?: string;
  read: boolean;
  createdAt: string;
}

export interface NearbyDriver extends User {
  distance: number;
  eta: number;
  group: ContactGroup;
  location: Location;
  vehicle?: {
    model: string;
    plate: string;
    color: string;
  };
}

export interface NearbyPassenger extends User {
  distance: number;
  group: ContactGroup;
  location: Location;
  destination?: Location;
}

// Market Configuration Types
export interface Currency {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
}

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  name: string;
  icon?: string;
  enabled?: boolean;
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
  paymentMethods?: PaymentMethodConfig[];
  features: MarketFeatures;
  theme: MarketTheme;
  supportWhatsApp?: string;
}

// Legacy MarketConfig compatibility type
export interface LegacyMarketConfig {
  code: MarketCode;
  name: string;
  label: string;
  country: string;
  language: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  accentColor: string;
  smsProvider: SMSProvider;
  geocodingProvider: GeocodingProvider;
  trackingProvider: TrackingProvider;
  paymentMethods: PaymentMethodId[];
  mapsProvider: MapsProvider;
  phonePrefix: string;
  phoneLength: number;
  phoneMinDigits: number;
  phoneMaxDigits: number;
  phonePlaceholder: string;
  features: {
    ratings: boolean;
    scheduling: boolean;
    sharedRides: boolean;
    corporateAccounts: boolean;
    insurance: boolean;
  };
}

export interface GeoResult {
  displayName: string;
  shortName: string;
  lat: number;
  lng: number;
}

export interface BusStop {
  id: string;
  marketCode: MarketCode;
  city: string;
  name: string;
  lat: number;
  lng: number;
  isMajor: boolean;
  distance_m?: number;
}

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'undetermined';
}
