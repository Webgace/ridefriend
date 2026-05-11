// Ficheiro: src/services/geocoding.service.ts | Função: reverse-geocode + nearest_stop (P4 v2.1)
import { GeoResult, BusStop } from '@types/index';
import { supabase } from '@services/supabase';
import { useMarketStore } from '@store/marketStore';

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
  lat?: string;
  lon?: string;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleResult {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
}

interface GoogleResponse {
  results?: GoogleResult[];
  status?: string;
}

/**
 * Reverse geocode segundo o provider do mercado (nominatim por defeito; google em BR/PT).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  try {
    const config = useMarketStore.getState().config;
    if (!config) throw new Error('Market config not loaded');

    return config.geocodingProvider === 'google'
      ? reverseGeocodeGoogle(lat, lng)
      : reverseGeocodeNominatim(lat, lng, config.locale);
  } catch (error) {
    console.error('reverseGeocode error:', error);
    return null;
  }
}

async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
  locale: string,
): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${locale}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'RideFriend/2.1' } });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResponse;
  const displayName =
    data.address?.road ||
    data.address?.neighbourhood ||
    data.address?.city ||
    data.display_name ||
    '';
  const shortName = generateShortName(data.address ?? {}, locale);

  return { displayName, shortName, lat, lng };
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<GeoResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key not configured');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Geocoding error: ${response.status}`);

  const data = (await response.json()) as GoogleResponse;
  const result = data.results?.[0];
  if (!result) return null;

  const config = useMarketStore.getState().config;
  return {
    displayName: result.formatted_address ?? '',
    shortName: generateShortNameGoogle(result, config?.locale ?? 'pt'),
    lat,
    lng,
  };
}

function generateShortName(addr: NominatimAddress, locale: string): string {
  const isAngola = locale.startsWith('pt-AO');
  const isMozambique = locale.startsWith('pt-MZ');
  const isPortugal = locale.startsWith('pt-PT');
  const isBrazil = locale.startsWith('pt-BR');

  if (isAngola || isMozambique) {
    const neigh = addr.neighbourhood || addr.suburb || '';
    const road = addr.road || '';
    if (neigh && road) return `${neigh}, ${road}`;
    return neigh || road || '';
  }
  if (isBrazil) return addr.neighbourhood || addr.suburb || '';
  if (isPortugal) return addr.road || '';
  return addr.neighbourhood || addr.road || '';
}

function generateShortNameGoogle(result: GoogleResult, locale: string): string {
  const components = result.address_components ?? [];
  const isAngola = locale.startsWith('pt-AO');
  const isMozambique = locale.startsWith('pt-MZ');
  const isPortugal = locale.startsWith('pt-PT');
  const isBrazil = locale.startsWith('pt-BR');

  const route = components.find((c) => c.types.includes('route'))?.long_name ?? '';
  const neigh = components.find((c) => c.types.includes('neighborhood'))?.long_name ?? '';
  const adminL2 =
    components.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ?? '';

  if (isAngola || isMozambique) {
    return neigh && route ? `${neigh}, ${route}` : neigh || route || '';
  }
  if (isBrazil) return neigh || adminL2 || '';
  if (isPortugal) return route || neigh || '';
  return neigh || route || '';
}

/**
 * Procura endereços com autocomplete (Nominatim ou Google).
 */
export async function searchAddress(
  query: string,
  nearLat: number,
  nearLng: number,
): Promise<GeoResult[]> {
  try {
    const config = useMarketStore.getState().config;
    if (!config) throw new Error('Market config not loaded');

    return config.geocodingProvider === 'google'
      ? searchAddressGoogle(query, nearLat, nearLng)
      : searchAddressNominatim(query, nearLat, nearLng, config.locale);
  } catch (error) {
    console.error('searchAddress error:', error);
    return [];
  }
}

async function searchAddressNominatim(
  query: string,
  nearLat: number,
  nearLng: number,
  locale: string,
): Promise<GeoResult[]> {
  const viewbox = {
    left: nearLng - 0.1,
    right: nearLng + 0.1,
    top: nearLat + 0.1,
    bottom: nearLat - 0.1,
  };

  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json` +
    `&viewbox=${viewbox.left},${viewbox.top},${viewbox.right},${viewbox.bottom}` +
    `&bounded=1&accept-language=${locale}`;

  const response = await fetch(url, { headers: { 'User-Agent': 'RideFriend/2.1' } });
  if (!response.ok) throw new Error(`Nominatim search error: ${response.status}`);

  const data = (await response.json()) as NominatimResponse[];
  return data.slice(0, 8).map((item) => ({
    displayName: item.display_name ?? '',
    shortName: item.address?.road || item.address?.neighbourhood || '',
    lat: parseFloat(item.lat ?? '0'),
    lng: parseFloat(item.lon ?? '0'),
  }));
}

async function searchAddressGoogle(
  query: string,
  nearLat: number,
  nearLng: number,
): Promise<GeoResult[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key not configured');

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
    `&location=${nearLat},${nearLng}&radius=10000&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google search error: ${response.status}`);

  const data = (await response.json()) as GoogleResponse;
  if (!data.results) return [];

  const config = useMarketStore.getState().config;
  return data.results.slice(0, 8).map((result) => ({
    displayName: result.formatted_address ?? '',
    shortName: generateShortNameGoogle(result, config?.locale ?? 'pt'),
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  }));
}

/**
 * Paragem mais próxima — RPC nearest_stop (P4 v2.1).
 */
export async function getNearestStop(
  lat: number,
  lng: number,
  radiusMeters = 800,
): Promise<BusStop | null> {
  try {
    const config = useMarketStore.getState().config;
    if (!config) throw new Error('Market config not loaded');

    const { data, error } = await supabase.rpc('nearest_stop', {
      p_lat: lat,
      p_lng: lng,
      p_market: config.code,
      p_radius_m: radiusMeters,
    });

    if (error) {
      console.error('nearest_stop RPC error:', error);
      return null;
    }

    const stop = data?.[0];
    if (!stop) return null;

    return {
      id: stop.id,
      marketCode: config.code,
      city: stop.city ?? '',
      name: stop.name,
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      isMajor: Boolean(stop.is_major),
      distance_m: Number(stop.distance_m ?? 0),
    };
  } catch (error) {
    console.error('getNearestStop error:', error);
    return null;
  }
}
