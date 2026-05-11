// Ficheiro: src/hooks/useRideHistory.ts | Função: historial de boleias do utilizador (P10)
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { RideStatus } from '@types/index';

export interface RideHistoryRow {
  id: string;
  role: 'driver' | 'passenger';
  status: RideStatus;
  otherUser: {
    id: string;
    name: string;
    photoUrl: string | null;
  } | null;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
  distanceKm: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  myRating: { score: number; comment: string | null } | null;
  receivedRating: { score: number; comment: string | null } | null;
}

interface RawRide {
  id: string;
  driver_id: string | null;
  passenger_id: string | null;
  status: RideStatus;
  origin_lat: string | number;
  origin_lng: string | number;
  dest_lat: string | number | null;
  dest_lng: string | number | null;
  distance_km: string | number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface RawRating {
  ride_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment: string | null;
}

interface RawUserSummary {
  id: string;
  name: string;
  photo_url: string | null;
}

export function useRideHistory(limit = 10) {
  const { user } = useAuthStore();
  const [rides, setRides] = useState<RideHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) {
      setRides([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data: ridesRaw, error: ridesError } = await supabase
        .from('rides')
        .select(
          'id, driver_id, passenger_id, status, origin_lat, origin_lng, dest_lat, dest_lng, distance_km, started_at, ended_at, created_at',
        )
        .or(`driver_id.eq.${user.id},passenger_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (ridesError) throw ridesError;
      const ridesArr = (ridesRaw ?? []) as RawRide[];
      if (ridesArr.length === 0) {
        setRides([]);
        return;
      }

      const otherIds = Array.from(
        new Set(
          ridesArr
            .map((r) => (r.driver_id === user.id ? r.passenger_id : r.driver_id))
            .filter((v): v is string => Boolean(v)),
        ),
      );
      const rideIds = ridesArr.map((r) => r.id);

      const [{ data: usersRaw }, { data: ratingsRaw }] = await Promise.all([
        otherIds.length > 0
          ? supabase.from('users').select('id, name, photo_url').in('id', otherIds)
          : Promise.resolve({ data: [] as RawUserSummary[] }),
        supabase
          .from('ratings')
          .select('ride_id, rater_id, rated_id, score, comment')
          .in('ride_id', rideIds),
      ]);

      const usersList = (usersRaw ?? []) as RawUserSummary[];
      const userMap = new Map<string, RawUserSummary>(usersList.map((u) => [u.id, u]));
      const ratings = (ratingsRaw ?? []) as RawRating[];

      const mapped: RideHistoryRow[] = ridesArr.map((r) => {
        const role: 'driver' | 'passenger' = r.driver_id === user.id ? 'driver' : 'passenger';
        const otherId = role === 'driver' ? r.passenger_id : r.driver_id;
        const other = otherId ? userMap.get(otherId) ?? null : null;
        const myRating = ratings.find((rt) => rt.ride_id === r.id && rt.rater_id === user.id);
        const recvRating = ratings.find((rt) => rt.ride_id === r.id && rt.rated_id === user.id);
        return {
          id: r.id,
          role,
          status: r.status,
          otherUser: other
            ? { id: other.id, name: other.name, photoUrl: other.photo_url }
            : null,
          origin: { lat: Number(r.origin_lat), lng: Number(r.origin_lng) },
          destination:
            r.dest_lat !== null && r.dest_lng !== null
              ? { lat: Number(r.dest_lat), lng: Number(r.dest_lng) }
              : null,
          distanceKm: r.distance_km !== null ? Number(r.distance_km) : null,
          startedAt: r.started_at,
          endedAt: r.ended_at,
          createdAt: r.created_at,
          myRating: myRating ? { score: myRating.score, comment: myRating.comment } : null,
          receivedRating: recvRating
            ? { score: recvRating.score, comment: recvRating.comment }
            : null,
        };
      });

      setRides(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar historial.');
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { rides, isLoading, error, refresh: fetch };
}
