// Ficheiro: src/hooks/useRideRequest.ts | Função: estado da boleia em curso (P5)
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@services/supabase';
import { subscribeToRideUpdates, unsubscribe } from '@services/realtime.service';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { useLocationStore } from '@store/locationStore';
import { Database } from '@types/supabase';

export type RideRequestStatus = 'idle' | 'requesting' | 'waiting' | 'active' | 'completed' | 'cancelled';

interface State {
  status: RideRequestStatus;
  rideId: string | null;
  error: string | null;
}

type RideRow = Database['public']['Tables']['rides']['Row'];

export function useRideRequest() {
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const { myLocation } = useLocationStore();
  const [state, setState] = useState<State>({ status: 'idle', rideId: null, error: null });

  // Subscreve mudanças no ride activo (status, ended_at) — RLS garante acesso só aos
  // participantes (passenger_id ou driver_id).
  useEffect(() => {
    if (!state.rideId) return;

    const channelName = `ride:${state.rideId}`;
    subscribeToRideUpdates(state.rideId, (ride: RideRow) => {
      if (ride.status === 'in_progress') {
        setState((prev) => ({ ...prev, status: 'active' }));
      } else if (ride.status === 'completed') {
        setState((prev) => ({ ...prev, status: 'completed' }));
      } else if (ride.status === 'cancelled') {
        setState((prev) => ({ ...prev, status: 'cancelled' }));
      } else if (ride.status === 'accepted') {
        setState((prev) => ({ ...prev, status: 'waiting' }));
      }
    });

    return () => {
      unsubscribe(channelName).catch(() => null);
    };
  }, [state.rideId]);

  const requestRide = useCallback(
    async (driverId: string): Promise<string | null> => {
      if (!user || !config) {
        setState((prev) => ({ ...prev, error: 'Sessão inválida.' }));
        return null;
      }
      if (!myLocation) {
        setState((prev) => ({ ...prev, error: 'Sem localização disponível.' }));
        return null;
      }

      setState({ status: 'requesting', rideId: null, error: null });

      const { data, error } = await supabase
        .from('rides')
        .insert({
          driver_id: driverId,
          passenger_id: user.id,
          status: 'requested',
          origin_lat: myLocation.latitude,
          origin_lng: myLocation.longitude,
          market_code: config.code,
        })
        .select()
        .single();

      if (error || !data) {
        const message = error?.message ?? 'Falha ao criar pedido.';
        setState({ status: 'idle', rideId: null, error: message });
        return null;
      }

      setState({ status: 'waiting', rideId: data.id, error: null });
      return data.id;
    },
    [user, config, myLocation],
  );

  const cancelRide = useCallback(
    async (rideId: string): Promise<void> => {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled', ended_at: new Date().toISOString() })
        .eq('id', rideId);
      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
        return;
      }
      setState({ status: 'cancelled', rideId: null, error: null });
    },
    [],
  );

  const completeRide = useCallback(
    async (rideId: string): Promise<void> => {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', rideId);
      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
        return;
      }
      setState({ status: 'completed', rideId: null, error: null });
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', rideId: null, error: null });
  }, []);

  return {
    ...state,
    requestRide,
    cancelRide,
    completeRide,
    reset,
  };
}
