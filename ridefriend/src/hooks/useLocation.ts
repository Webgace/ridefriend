// Ficheiro: src/hooks/useLocation.ts | Função: hook de localização para passageiro/motorista (P4 v2.1)
import { useCallback, useEffect, useState } from 'react';
import {
  getCurrentLocation,
  getPermissionStatus,
  requestPermissions,
  startTracking,
  stopTracking,
} from '@services/location.service';
import { getNearestStop, reverseGeocode } from '@services/geocoding.service';
import { useAuthStore } from '@store/authStore';
import { BusStop, PermissionStatus } from '@types/index';

interface UseLocationState {
  myLocation: { lat: number; lng: number; accuracy?: number } | null;
  nearestStop: BusStop | null;
  /**
   * Nome a mostrar no cartão de paragem: usa o bus_stop se houver, senão
   * cai para o reverse-geocode (rua / bairro). Null só enquanto o GPS
   * ainda não devolveu coordenadas.
   */
  locationLabel: string | null;
  isTracking: boolean;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const { user } = useAuthStore();
  const [state, setState] = useState<UseLocationState>({
    myLocation: null,
    nearestStop: null,
    locationLabel: null,
    isTracking: false,
    permissionStatus: { location: 'undetermined' },
    isLoading: true,
    error: null,
  });

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await getPermissionStatus();
    if (current.location === 'granted') {
      setState((prev) => ({ ...prev, permissionStatus: current }));
      return true;
    }
    const requested = await requestPermissions();
    setState((prev) => ({ ...prev, permissionStatus: requested }));
    return requested.location === 'granted';
  }, []);

  const refreshNearestStop = useCallback(async (lat: number, lng: number) => {
    const stop = await getNearestStop(lat, lng);
    if (stop?.name) {
      setState((prev) => ({ ...prev, nearestStop: stop, locationLabel: stop.name }));
      return;
    }
    // Sem paragem registada por perto — usa reverse-geocode como fallback.
    const geo = await reverseGeocode(lat, lng).catch(() => null);
    const fallback = geo?.shortName?.trim() || geo?.displayName?.trim() || null;
    setState((prev) => ({ ...prev, nearestStop: stop, locationLabel: fallback }));
  }, []);

  const onTick = useCallback(
    async (lat: number, lng: number) => {
      setState((prev) => ({ ...prev, myLocation: { lat, lng } }));
      try {
        await refreshNearestStop(lat, lng);
      } catch (error) {
        console.warn('refreshNearestStop failed:', error);
      }
    },
    [refreshNearestStop],
  );

  const start = useCallback(
    async (mode: 'passenger' | 'driver') => {
      if (!user) {
        setState((prev) => ({ ...prev, error: 'Não autenticado.' }));
        return false;
      }
      const granted = await ensurePermission();
      if (!granted) {
        setState((prev) => ({ ...prev, error: 'Permissão de localização negada.' }));
        return false;
      }

      const ok = await startTracking(user.id, mode, onTick);
      setState((prev) => ({
        ...prev,
        isTracking: ok,
        error: ok ? null : 'Falha ao iniciar tracking.',
      }));
      return ok;
    },
    [user, ensurePermission, onTick],
  );

  const startPassengerMode = useCallback(() => start('passenger'), [start]);
  const startDriverMode = useCallback(() => start('driver'), [start]);

  const stop = useCallback(async () => {
    await stopTracking(user?.id);
    setState((prev) => ({ ...prev, isTracking: false }));
  }, [user]);

  const refreshOnce = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const granted = await ensurePermission();
      if (!granted) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Permissão negada.' }));
        return;
      }
      const pos = await getCurrentLocation();
      if (!pos) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Sem sinal GPS.' }));
        return;
      }
      setState((prev) => ({ ...prev, myLocation: pos, isLoading: false }));
      await refreshNearestStop(pos.lat, pos.lng);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  }, [ensurePermission, refreshNearestStop]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getPermissionStatus();
      if (cancelled) return;
      setState((prev) => ({ ...prev, permissionStatus: status, isLoading: false }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    startPassengerMode,
    startDriverMode,
    stopTracking: stop,
    requestLocationPermissions: ensurePermission,
    getCurrentLocationOnce: refreshOnce,
  };
}
