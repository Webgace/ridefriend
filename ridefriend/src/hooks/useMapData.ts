// Ficheiro: src/hooks/useMapData.ts | Função: agrega marcadores + região para o ecrã de mapa (P7)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '@hooks/useLocation';
import { useNearbyContacts, useNearbyPassengersAtStop } from '@hooks/useNearbyContacts';
import { useMarketStore } from '@store/marketStore';
import { NearbyDriver, NearbyPassenger } from '@types/index';

const DETECTION_RADIUS_KM = 5;
const STOP_RADIUS_M = 100;

export type MarkerType = 'me' | 'driver' | 'passenger' | 'stop';

export interface MapMarkerData {
  id: string;
  type: MarkerType;
  name: string;
  lat: number;
  lng: number;
  prevLat?: number;
  prevLng?: number;
  eta?: number;
  driver?: NearbyDriver;
  passenger?: NearbyPassenger;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface UseMapDataOptions {
  filter?: 'all' | 'drivers';
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { filter = 'all' } = options;
  const { config } = useMarketStore();
  const { myLocation, nearestStop } = useLocation();
  const myCoords = useMemo(
    () => (myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null),
    [myLocation],
  );
  const { nearbyDrivers, refresh: refreshDrivers } = useNearbyContacts(
    myCoords,
    DETECTION_RADIUS_KM,
  );
  const { nearbyPassengers, refresh: refreshPassengers } = useNearbyPassengersAtStop(
    myCoords,
    STOP_RADIUS_M,
  );

  // Mantém posições anteriores por id de marcador para animação suave (interpolação 2s).
  const prevPositions = useRef<Record<string, { lat: number; lng: number }>>({});
  const [recenterRequest, setRecenterRequest] = useState(0);

  const markers = useMemo<MapMarkerData[]>(() => {
    const acc: MapMarkerData[] = [];

    if (myLocation) {
      acc.push({
        id: 'me',
        type: 'me',
        name: 'me',
        lat: myLocation.lat,
        lng: myLocation.lng,
      });
    }

    if (nearestStop) {
      acc.push({
        id: `stop:${nearestStop.id}`,
        type: 'stop',
        name: nearestStop.name,
        lat: nearestStop.lat,
        lng: nearestStop.lng,
      });
    }

    for (const d of nearbyDrivers) {
      const id = `driver:${d.id}`;
      const prev = prevPositions.current[id];
      acc.push({
        id,
        type: 'driver',
        name: d.name,
        lat: d.location.latitude,
        lng: d.location.longitude,
        prevLat: prev?.lat,
        prevLng: prev?.lng,
        eta: d.eta,
        driver: d,
      });
    }

    if (filter !== 'drivers') {
      for (const p of nearbyPassengers) {
        const id = `passenger:${p.id}`;
        const prev = prevPositions.current[id];
        acc.push({
          id,
          type: 'passenger',
          name: p.name,
          lat: p.location.latitude,
          lng: p.location.longitude,
          prevLat: prev?.lat,
          prevLng: prev?.lng,
          passenger: p,
        });
      }
    }

    return acc;
  }, [myLocation, nearestStop, nearbyDrivers, nearbyPassengers, filter]);

  // Após gerar `markers`, regista as posições actuais como "anteriores" para o próximo ciclo.
  useEffect(() => {
    const next: Record<string, { lat: number; lng: number }> = {};
    for (const m of markers) {
      if (m.type === 'driver' || m.type === 'passenger') {
        next[m.id] = { lat: m.lat, lng: m.lng };
      }
    }
    prevPositions.current = next;
  }, [markers]);

  const region = useMemo<MapRegion>(() => {
    const fallback = config?.defaultCenter ?? { lat: -8.8383, lng: 13.2344 }; // Luanda fallback
    const center = myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : fallback;
    return {
      latitude: center.lat,
      longitude: center.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [myLocation, config?.defaultCenter]);

  const recenterMap = useCallback(() => {
    setRecenterRequest((n) => n + 1);
  }, []);

  const refresh = useCallback(() => {
    refreshDrivers();
    refreshPassengers();
  }, [refreshDrivers, refreshPassengers]);

  return {
    markers,
    region,
    detectionRadiusM: DETECTION_RADIUS_KM * 1000,
    myLocation,
    nearestStop,
    nearbyDrivers,
    nearbyPassengers,
    recenterRequest,
    recenterMap,
    refresh,
  };
}
