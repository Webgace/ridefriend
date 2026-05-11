// Ficheiro: src/hooks/useNearbyContacts.ts | Função: motoristas/passageiros próximos da rede de contactos (P4 v2.1)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@services/supabase';
import { subscribeToContactsLocations, unsubscribe } from '@services/realtime.service';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { haversineDistance, estimateETA } from '@utils/geo';
import { NearbyDriver, NearbyPassenger } from '@types/index';

interface UseNearbyContactsState {
  nearbyDrivers: NearbyDriver[];
  nearbyPassengers: NearbyPassenger[];
  isLoading: boolean;
  error: string | null;
}

interface PassengerRouteOptions {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
  radiusMeters?: number;
}

/**
 * Lista contactos do utilizador (vai à tabela contacts uma vez).
 */
async function fetchContactIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('contact_user_id')
    .eq('user_id', userId);

  if (error) {
    console.error('fetchContactIds error:', error);
    return [];
  }
  return (data ?? []).map((row) => row.contact_user_id);
}

/**
 * Hook do passageiro: motoristas activos da rede num raio.
 * Usa RPC nearby_drivers (que já filtra por contactos) + realtime para refresh.
 */
export function useNearbyContacts(
  myLocation: { lat: number; lng: number } | null,
  radiusKm = 5,
  enabled = true,
) {
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const [state, setState] = useState<UseNearbyContactsState>({
    nearbyDrivers: [],
    nearbyPassengers: [],
    isLoading: false,
    error: null,
  });
  const channelRef = useRef<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    if (!user || !myLocation) return;
    setState((prev) => ({ ...prev, isLoading: true }));

    const { data, error } = await supabase.rpc('nearby_drivers', {
      p_user_id: user.id,
      p_radius_km: radiusKm,
    });

    if (error) {
      setState((prev) => ({ ...prev, error: error.message, isLoading: false }));
      return;
    }

    const drivers: NearbyDriver[] = (data ?? []).map((row) => ({
      id: row.driver_id,
      phone: row.phone,
      name: row.name,
      avatar: row.photo_url ?? undefined,
      rating: Number(row.rating_avg ?? 0),
      totalRides: 0,
      isDriver: true,
      isPassenger: false,
      marketCode: config?.code ?? 'ao',
      createdAt: '',
      updatedAt: '',
      distance: Number(row.distance_km ?? 0),
      eta: Number(row.eta_minutes ?? 0),
      group: row.group_type,
      location: { latitude: Number(row.lat), longitude: Number(row.lng) },
    }));

    // Ordena por ETA crescente (motorista mais próximo primeiro).
    drivers.sort((a, b) => a.eta - b.eta);

    setState((prev) => ({ ...prev, nearbyDrivers: drivers, isLoading: false, error: null }));
  }, [user, myLocation, radiusKm, config?.code]);

  // Subscrição realtime: quando uma localização da rede muda, faz refetch.
  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    (async () => {
      const contactIds = await fetchContactIds(user.id);
      if (cancelled) return;
      const channelName = `locations:${user.id}`;
      channelRef.current = channelName;
      subscribeToContactsLocations(user.id, contactIds, () => {
        // Refetch o RPC em vez de mutar o estado pontualmente — mais simples e correcto.
        fetchDrivers().catch((err) => console.warn('realtime refetch failed:', err));
      });
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        unsubscribe(channelRef.current).catch(() => null);
        channelRef.current = null;
      }
    };
  }, [enabled, user, fetchDrivers]);

  useEffect(() => {
    if (enabled && user && myLocation) {
      fetchDrivers().catch((err) => console.warn('fetchDrivers failed:', err));
    }
  }, [enabled, user, myLocation, fetchDrivers]);

  const refresh = useCallback(() => {
    fetchDrivers().catch((err) => console.warn('refresh failed:', err));
  }, [fetchDrivers]);

  return { ...state, refresh };
}

/**
 * Hook do passageiro: outros passageiros da rede na mesma paragem (P5 secção "Outros na Paragem").
 * Chama o RPC nearby_passengers_at_stop com um raio em metros.
 */
export function useNearbyPassengersAtStop(
  myLocation: { lat: number; lng: number } | null,
  radiusMeters = 100,
  enabled = true,
) {
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const [state, setState] = useState<{
    nearbyPassengers: NearbyPassenger[];
    isLoading: boolean;
    error: string | null;
  }>({
    nearbyPassengers: [],
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!user || !myLocation) return;
    setState((prev) => ({ ...prev, isLoading: true }));

    const { data, error } = await supabase.rpc('nearby_passengers_at_stop', {
      p_user_id: user.id,
      p_radius_m: radiusMeters,
    });

    if (error) {
      setState((prev) => ({ ...prev, error: error.message, isLoading: false }));
      return;
    }

    const passengers: NearbyPassenger[] = (data ?? []).map((row) => ({
      id: row.passenger_id,
      phone: row.phone,
      name: row.name,
      avatar: row.photo_url ?? undefined,
      rating: 0,
      totalRides: 0,
      isDriver: false,
      isPassenger: true,
      marketCode: config?.code ?? 'ao',
      createdAt: '',
      updatedAt: '',
      distance: Number(row.distance_m ?? 0) / 1000,
      group: row.group_type,
      location: { latitude: Number(row.lat), longitude: Number(row.lng) },
    }));

    setState({ nearbyPassengers: passengers, isLoading: false, error: null });
  }, [user, myLocation, radiusMeters, config?.code]);

  useEffect(() => {
    if (enabled && user && myLocation) {
      fetch().catch((err) => console.warn('fetch passengers at stop failed:', err));
    }
  }, [enabled, user, myLocation, fetch]);

  return { ...state, refresh: fetch };
}

/**
 * Hook do motorista: passageiros da rede de contactos perto da rota actual.
 * Chama o RPC nearby_passengers — accept a route { origin, dest, radiusMeters }.
 */
export function useNearbyPassengers(route: PassengerRouteOptions | null, enabled = true) {
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const [state, setState] = useState<{
    nearbyPassengers: NearbyPassenger[];
    isLoading: boolean;
    error: string | null;
  }>({
    nearbyPassengers: [],
    isLoading: false,
    error: null,
  });

  const radius = useMemo(() => route?.radiusMeters ?? 500, [route]);

  const fetch = useCallback(async () => {
    if (!user || !route) return;
    setState((prev) => ({ ...prev, isLoading: true }));

    const { data, error } = await supabase.rpc('nearby_passengers', {
      p_driver_id: user.id,
      p_origin_lat: route.origin.lat,
      p_origin_lng: route.origin.lng,
      p_dest_lat: route.dest.lat,
      p_dest_lng: route.dest.lng,
      p_radius_m: radius,
    });

    if (error) {
      setState((prev) => ({ ...prev, error: error.message, isLoading: false }));
      return;
    }

    const passengers: NearbyPassenger[] = (data ?? []).map((row) => ({
      id: row.passenger_id,
      phone: row.phone,
      name: row.name,
      avatar: row.photo_url ?? undefined,
      rating: 0,
      totalRides: 0,
      isDriver: false,
      isPassenger: true,
      marketCode: config?.code ?? 'ao',
      createdAt: '',
      updatedAt: '',
      distance: haversineDistance(
        Number(row.lat),
        Number(row.lng),
        route.origin.lat,
        route.origin.lng,
      ),
      group: row.group_type,
      location: { latitude: Number(row.lat), longitude: Number(row.lng) },
    }));

    setState({ nearbyPassengers: passengers, isLoading: false, error: null });
  }, [user, route, radius, config?.code]);

  useEffect(() => {
    if (enabled && user && route) {
      fetch().catch((err) => console.warn('fetch passengers failed:', err));
    }
  }, [enabled, user, route, fetch]);

  // estimateETA disponível para callers que queiram ordenar por ETA — não é usado
  // internamente, mas exporta-se para evitar warning de import morto.
  void estimateETA;

  return { ...state, refresh: fetch };
}
