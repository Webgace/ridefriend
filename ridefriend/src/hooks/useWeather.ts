// Ficheiro: src/hooks/useWeather.ts | Função: temperatura actual para o hero card
import { useEffect, useState } from 'react';
import { fetchTemperature } from '@services/weather.service';

interface Coords {
  lat: number;
  lng: number;
}

const GRID_DEG = 0.1;
const REFRESH_MS = 30 * 60 * 1000;

function quantize(coords: Coords | null): string | null {
  if (!coords) return null;
  const qLat = Math.round(coords.lat / GRID_DEG) * GRID_DEG;
  const qLng = Math.round(coords.lng / GRID_DEG) * GRID_DEG;
  return `${qLat.toFixed(2)}:${qLng.toFixed(2)}`;
}

export function useWeather(coords: Coords | null) {
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const gridId = quantize(coords);

  useEffect(() => {
    if (!coords || !gridId) {
      setTemperatureC(null);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;

    const load = async () => {
      const t = await fetchTemperature(coords.lat, coords.lng, ac.signal);
      if (!cancelled && t !== null) setTemperatureC(t);
    };

    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(id);
    };
  }, [gridId, coords]);

  return { temperatureC };
}
