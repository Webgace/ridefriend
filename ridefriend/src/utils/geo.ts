// Ficheiro: src/utils/geo.ts | Função: utilitários geográficos (P4 v2.1)
// Contracto v1/v2.1: distâncias em KM, ETA em MINUTOS, velocidade default 30 km/h.

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => deg * (Math.PI / 180);
const toDeg = (rad: number): number => rad * (180 / Math.PI);

/**
 * Distância Haversine entre dois pontos (graus → km, 2 decimais).
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

/**
 * ETA em minutos a partir da distância em km e velocidade média (default 30 km/h).
 */
export function estimateETA(distanceKm: number, avgSpeedKmh = 30): number {
  if (avgSpeedKmh <= 0) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * "Agora!" para ETA <= 0, "1 min", "5 min", "1h 5m" para valores grandes.
 */
export function formatETA(minutes: number): string {
  if (minutes <= 0) return 'Agora!';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * "50 m" abaixo de 1 km, "1.2 km" acima.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Verifica se um ponto está a até `radiusM` metros do segmento origem→destino.
 * Usa projecção no segmento (cross-track distance) com aproximação plana — suficiente
 * para distâncias urbanas (<50 km).
 */
export function isPointNearRoute(
  point: { lat: number; lng: number },
  routeStart: { lat: number; lng: number },
  routeEnd: { lat: number; lng: number },
  radiusM: number,
): boolean {
  const distKm = perpendicularDistanceKm(point, routeStart, routeEnd);
  return distKm * 1000 <= radiusM;
}

function perpendicularDistanceKm(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const distAP = haversineDistance(a.lat, a.lng, p.lat, p.lng);
  const distAB = haversineDistance(a.lat, a.lng, b.lat, b.lng);
  if (distAB === 0) return distAP;

  const bearingAP = bearingRad(a, p);
  const bearingAB = bearingRad(a, b);
  const crossTrack = Math.asin(
    Math.sin(distAP / EARTH_RADIUS_KM) * Math.sin(bearingAP - bearingAB),
  ) * EARTH_RADIUS_KM;

  // Garantir que está dentro do segmento (não além dos extremos)
  const alongTrack = Math.acos(
    Math.cos(distAP / EARTH_RADIUS_KM) / Math.cos(crossTrack / EARTH_RADIUS_KM),
  ) * EARTH_RADIUS_KM;

  if (alongTrack < 0) {
    return distAP;
  }
  if (alongTrack > distAB) {
    return haversineDistance(b.lat, b.lng, p.lat, p.lng);
  }
  return Math.abs(crossTrack);
}

function bearingRad(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

/**
 * Bearing (rumo) em graus 0-360 entre dois pontos.
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const bearing = bearingRad({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  return (toDeg(bearing) + 360) % 360;
}

/**
 * Ponto a determinada distância (m) e bearing (graus) a partir de um ponto inicial.
 */
export function getPointAtDistance(
  startLat: number,
  startLng: number,
  distanceMeters: number,
  bearingDegrees: number,
): { lat: number; lng: number } {
  const distance = distanceMeters / 1000 / EARTH_RADIUS_KM;
  const lat1 = toRad(startLat);
  const lng1 = toRad(startLng);
  const bearing = toRad(bearingDegrees);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
      Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
      Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}
