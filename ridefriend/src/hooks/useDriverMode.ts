// Ficheiro: src/hooks/useDriverMode.ts | Função: estado e acções do Modo Motorista (P6)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MMKV } from 'react-native-mmkv';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { useLocation } from '@hooks/useLocation';
import { useNearbyPassengers } from '@hooks/useNearbyContacts';
import { Database } from '@types/supabase';
import { GeoResult } from '@types/index';

type RideRow = Database['public']['Tables']['rides']['Row'];

export interface DriverRoute {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
  destinationName: string;
}

export interface PendingRideRequest {
  rideId: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  originLat: number;
  originLng: number;
  expiresAt: number;
}

interface State {
  isActive: boolean;
  currentRoute: DriverRoute | null;
  pendingRequest: PendingRideRequest | null;
  error: string | null;
}

const STORAGE = new MMKV({ id: 'ridefriend-driver' });
const KEY_LAST_ROUTE = 'driver.last_route';
const KEY_RECENT_DESTINATIONS = 'driver.recent_destinations';
const PENDING_TTL_MS = 90_000; // 90s — alinha com mockup do bottom sheet de aceitar/recusar

export function useDriverMode() {
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const { myLocation, startDriverMode, stopTracking, isTracking } = useLocation();
  const [state, setState] = useState<State>({
    isActive: false,
    currentRoute: null,
    pendingRequest: null,
    error: null,
  });

  // Hidrata última rota usada (MMKV) — útil ao reabrir a app.
  useEffect(() => {
    const stored = STORAGE.getString(KEY_LAST_ROUTE);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as DriverRoute;
      setState((prev) => ({ ...prev, currentRoute: parsed }));
    } catch {
      STORAGE.delete(KEY_LAST_ROUTE);
    }
  }, []);

  const route = state.currentRoute;
  const { nearbyPassengers, isLoading: isLoadingPassengers, refresh: refreshPassengers } =
    useNearbyPassengers(
      route ? { origin: route.origin, dest: route.dest, radiusMeters: 500 } : null,
      state.isActive,
    );

  const persistRoute = useCallback((next: DriverRoute | null) => {
    if (next) {
      STORAGE.set(KEY_LAST_ROUTE, JSON.stringify(next));
    } else {
      STORAGE.delete(KEY_LAST_ROUTE);
    }
  }, []);

  const setRoute = useCallback(
    (destination: GeoResult) => {
      if (!myLocation) {
        setState((prev) => ({ ...prev, error: 'Sem localização disponível.' }));
        return;
      }
      const next: DriverRoute = {
        origin: { lat: myLocation.lat, lng: myLocation.lng },
        dest: { lat: destination.lat, lng: destination.lng },
        destinationName: destination.shortName || destination.displayName,
      };
      persistRoute(next);
      pushRecentDestination(destination);
      setState((prev) => ({ ...prev, currentRoute: next, error: null }));
    },
    [myLocation, persistRoute],
  );

  const clearRoute = useCallback(() => {
    persistRoute(null);
    setState((prev) => ({ ...prev, currentRoute: null }));
  }, [persistRoute]);

  const activateDriverMode = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setState((prev) => ({ ...prev, error: 'Sessão inválida.' }));
      return false;
    }
    const ok = await startDriverMode();
    if (!ok) {
      setState((prev) => ({ ...prev, error: 'Falha ao iniciar modo motorista.' }));
      return false;
    }
    setState((prev) => ({ ...prev, isActive: true, error: null }));
    return true;
  }, [user, startDriverMode]);

  const deactivateDriverMode = useCallback(async (): Promise<void> => {
    await stopTracking();
    setState((prev) => ({ ...prev, isActive: false }));
  }, [stopTracking]);

  // Subscreve pedidos de boleia: novos rides com driver_id = utilizador actual e status='requested'.
  useEffect(() => {
    if (!user || !state.isActive) return;
    const channelName = `driver-rides:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as RideRow;
          if (row.status !== 'requested') return;
          await loadPendingRequest(row);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch(() => null);
    };

    async function loadPendingRequest(row: RideRow) {
      const { data: passenger } = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('id', row.passenger_id)
        .single();
      if (!passenger) return;
      setState((prev) => ({
        ...prev,
        pendingRequest: {
          rideId: row.id,
          passengerId: passenger.id,
          passengerName: passenger.name,
          passengerPhone: passenger.phone,
          originLat: Number(row.origin_lat),
          originLng: Number(row.origin_lng),
          expiresAt: Date.now() + PENDING_TTL_MS,
        },
      }));
    }
  }, [user, state.isActive]);

  // Auto-expira o pendingRequest após PENDING_TTL_MS sem resposta.
  useEffect(() => {
    if (!state.pendingRequest) return;
    const remaining = state.pendingRequest.expiresAt - Date.now();
    if (remaining <= 0) {
      setState((prev) => ({ ...prev, pendingRequest: null }));
      return;
    }
    const id = setTimeout(() => {
      setState((prev) => ({ ...prev, pendingRequest: null }));
    }, remaining);
    return () => clearTimeout(id);
  }, [state.pendingRequest]);

  const acceptRideRequest = useCallback(async (): Promise<boolean> => {
    const pending = state.pendingRequest;
    if (!pending) return false;
    const { error } = await supabase
      .from('rides')
      .update({ status: 'accepted' })
      .eq('id', pending.rideId);
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
      return false;
    }
    setState((prev) => ({ ...prev, pendingRequest: null }));
    return true;
  }, [state.pendingRequest]);

  const declineRideRequest = useCallback(async (): Promise<void> => {
    const pending = state.pendingRequest;
    if (!pending) return;
    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', pending.rideId);
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
    setState((prev) => ({ ...prev, pendingRequest: null }));
  }, [state.pendingRequest]);

  const shareRouteWithNetwork = useCallback(async (): Promise<number> => {
    if (!user || !config || !state.currentRoute) return 0;
    const { data, error } = await supabase
      .from('contacts')
      .select('contact_user_id')
      .eq('user_id', user.id);
    if (error || !data) return 0;
    const contactIds = data.map((row) => row.contact_user_id);
    if (contactIds.length === 0) return 0;
    const payload = {
      type: 'route_shared',
      driver_id: user.id,
      driver_name: user.name,
      destination_name: state.currentRoute.destinationName,
      origin_lat: state.currentRoute.origin.lat,
      origin_lng: state.currentRoute.origin.lng,
      dest_lat: state.currentRoute.dest.lat,
      dest_lng: state.currentRoute.dest.lng,
    };
    const rows = contactIds.map((id) => ({
      user_id: id,
      type: 'route_shared',
      payload,
    }));
    const { error: insertError } = await supabase.from('notifications').insert(rows);
    if (insertError) {
      setState((prev) => ({ ...prev, error: insertError.message }));
      return 0;
    }
    return contactIds.length;
  }, [user, config, state.currentRoute]);

  const recentDestinations = useMemo<GeoResult[]>(() => readRecentDestinations(), [state.currentRoute]);

  return {
    ...state,
    isTrackingLocation: isTracking,
    nearbyPassengers,
    isLoadingPassengers,
    recentDestinations,
    setRoute,
    clearRoute,
    activateDriverMode,
    deactivateDriverMode,
    acceptRideRequest,
    declineRideRequest,
    shareRouteWithNetwork,
    refreshPassengers,
  };
}

// Helpers de "destinos recentes" (MMKV, máx 3).

function readRecentDestinations(): GeoResult[] {
  const raw = STORAGE.getString(KEY_RECENT_DESTINATIONS);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as GeoResult[];
    return Array.isArray(list) ? list.slice(0, 3) : [];
  } catch {
    STORAGE.delete(KEY_RECENT_DESTINATIONS);
    return [];
  }
}

function pushRecentDestination(dest: GeoResult): void {
  const current = readRecentDestinations();
  const without = current.filter(
    (d) => d.lat !== dest.lat || d.lng !== dest.lng,
  );
  const next = [dest, ...without].slice(0, 3);
  STORAGE.set(KEY_RECENT_DESTINATIONS, JSON.stringify(next));
}

