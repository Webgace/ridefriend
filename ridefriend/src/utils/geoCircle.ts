// Ficheiro: src/utils/geoCircle.ts | Função: gera polígono GeoJSON que aproxima um círculo geográfico
// Útil para desenhar o raio de detecção no mapa (MapLibre desenha o círculo a partir desta geometria).

const EARTH_RADIUS_M = 6371008.8;

export interface CirclePolygonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

/**
 * Gera um GeoJSON Feature com geometria Polygon que aproxima um círculo
 * de `radiusM` metros centrado em (`lat`, `lng`).
 *
 * @param steps número de vértices do polígono (default: 64, suficientemente suave).
 */
export function circlePolygon(
  lat: number,
  lng: number,
  radiusM: number,
  steps = 64,
): CirclePolygonFeature {
  const coords: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;
  const dRad = radiusM / EARTH_RADIUS_M;

  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const sinLat = Math.sin(latRad) * Math.cos(dRad) +
      Math.cos(latRad) * Math.sin(dRad) * Math.cos(bearing);
    const newLat = Math.asin(sinLat);
    const newLng = ((lng * Math.PI) / 180) +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dRad) * Math.cos(latRad),
        Math.cos(dRad) - Math.sin(latRad) * Math.sin(newLat),
      );
    coords.push([(newLng * 180) / Math.PI, (newLat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}
