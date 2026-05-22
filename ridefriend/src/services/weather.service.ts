// Ficheiro: src/services/weather.service.ts | Função: temperatura via Open-Meteo (sem chave) com cache MMKV
import { MMKV } from 'react-native-mmkv';

const STORAGE = new MMKV({ id: 'ridefriend-weather' });
const CACHE_TTL_MS = 30 * 60 * 1000;
const GRID_DEG = 0.1;

interface CachedWeather {
  temperatureC: number;
  ts: number;
}

function gridKey(lat: number, lng: number): string {
  const qLat = Math.round(lat / GRID_DEG) * GRID_DEG;
  const qLng = Math.round(lng / GRID_DEG) * GRID_DEG;
  return `w:${qLat.toFixed(2)}:${qLng.toFixed(2)}`;
}

export async function fetchTemperature(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const key = gridKey(lat, lng);
  const cachedRaw = STORAGE.getString(key);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedWeather;
      if (Date.now() - cached.ts < CACHE_TTL_MS && Number.isFinite(cached.temperatureC)) {
        return cached.temperatureC;
      }
    } catch {
      // cache corrompida — ignora e refaz fetch
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
      4,
    )}&longitude=${lng.toFixed(4)}&current=temperature_2m`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number } };
    const t = data.current?.temperature_2m;
    if (typeof t !== 'number' || !Number.isFinite(t)) return null;
    STORAGE.set(key, JSON.stringify({ temperatureC: t, ts: Date.now() } satisfies CachedWeather));
    return t;
  } catch {
    return null;
  }
}
