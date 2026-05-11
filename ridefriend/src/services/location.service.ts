// Ficheiro: src/services/location.service.ts | Função: tracking GPS + upsert para Supabase (P4 v2.1)
import * as Location from 'expo-location';
import { supabase } from '@services/supabase';
import { LocationModeDb } from '@types/supabase';
import { PermissionStatus } from '@types/index';

const NORMAL_INTERVAL_MS = 15_000;
const LOW_BATTERY_INTERVAL_MS = 60_000;
const DISTANCE_INTERVAL_M = 10;
const LOW_BATTERY_THRESHOLD = 0.2;

// Estado do módulo (singleton — uma única sessão de tracking por instância da app).
let watcher: Location.LocationSubscription | null = null;
let activeUserId: string | null = null;
let activeMode: LocationModeDb | null = null;
let externalCallback: ((lat: number, lng: number) => void) | null = null;
let lowBatteryMode = false;

async function readBatteryFraction(): Promise<number | null> {
  // expo-battery é opcional — se não estiver disponível, devolve null.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const battery = require('expo-battery');
    if (battery?.getBatteryLevelAsync) {
      const level = await battery.getBatteryLevelAsync();
      return typeof level === 'number' ? level : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function chooseInterval(): Promise<number> {
  const level = await readBatteryFraction();
  if (level !== null && level < LOW_BATTERY_THRESHOLD) {
    lowBatteryMode = true;
    return LOW_BATTERY_INTERVAL_MS;
  }
  lowBatteryMode = false;
  return NORMAL_INTERVAL_MS;
}

export function isInLowBatteryMode(): boolean {
  return lowBatteryMode;
}

/**
 * Pede permissões de localização (foreground + background).
 */
export async function requestPermissions(): Promise<PermissionStatus> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      return { location: fg.status as PermissionStatus['location'] };
    }
    // Background é "best effort" — utilizadores podem rejeitar e ainda assim usar a app.
    await Location.requestBackgroundPermissionsAsync().catch(() => null);
    return { location: 'granted' };
  } catch (error) {
    console.error('requestPermissions error:', error);
    return { location: 'undetermined' };
  }
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return { location: status as PermissionStatus['location'] };
  } catch (error) {
    console.error('getPermissionStatus error:', error);
    return { location: 'undetermined' };
  }
}

/**
 * Lê uma posição única (sem subscrição).
 */
export async function getCurrentLocation(): Promise<{
  lat: number;
  lng: number;
  accuracy?: number;
} | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
    };
  } catch (error) {
    console.error('getCurrentLocation error:', error);
    return null;
  }
}

/**
 * Faz upsert da posição actual em public.locations. Idempotente por user_id.
 */
export async function publishLocation(
  userId: string,
  lat: number,
  lng: number,
  options?: { accuracy?: number; heading?: number; speed?: number; mode?: LocationModeDb },
): Promise<void> {
  const payload = {
    user_id: userId,
    lat,
    lng,
    accuracy: options?.accuracy ?? null,
    heading: options?.heading ?? null,
    speed: options?.speed ?? null,
    mode: options?.mode ?? activeMode ?? 'passenger',
    is_active: true,
  };

  const { error } = await supabase
    .from('locations')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('publishLocation upsert error:', error);
  }
}

/**
 * Inicia subscrição a updates de localização. Faz upsert no Supabase em cada tick.
 * - Intervalo normal: 15s.
 * - Bateria < 20%: 60s.
 */
export async function startTracking(
  userId: string,
  mode: LocationModeDb,
  callback?: (lat: number, lng: number) => void,
): Promise<boolean> {
  if (watcher) {
    // Já está a correr — actualiza só o modo/callback.
    activeMode = mode;
    activeUserId = userId;
    externalCallback = callback ?? externalCallback;
    return true;
  }

  const perm = await getPermissionStatus();
  if (perm.location !== 'granted') {
    console.warn('startTracking: permissão de localização não concedida');
    return false;
  }

  activeUserId = userId;
  activeMode = mode;
  externalCallback = callback ?? null;

  const interval = await chooseInterval();

  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: interval,
      distanceInterval: DISTANCE_INTERVAL_M,
    },
    async (pos) => {
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      if (activeUserId) {
        await publishLocation(activeUserId, latitude, longitude, {
          accuracy: accuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
          mode: activeMode ?? 'passenger',
        });
      }
      externalCallback?.(latitude, longitude);
    },
  );

  return true;
}

/**
 * Pára tracking e marca o registo como inactivo (mantém último lat/lng).
 */
export async function stopTracking(userId?: string): Promise<void> {
  if (watcher) {
    watcher.remove();
    watcher = null;
  }
  externalCallback = null;
  const targetId = userId ?? activeUserId;
  activeUserId = null;
  activeMode = null;

  if (!targetId) return;

  const { error } = await supabase
    .from('locations')
    .update({ is_active: false })
    .eq('user_id', targetId);

  if (error) {
    console.error('stopTracking deactivate error:', error);
  }
}

export function isLocationTracking(): boolean {
  return watcher !== null;
}
