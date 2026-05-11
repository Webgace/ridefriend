// Ficheiro: src/hooks/useReceivedRatings.ts | Função: avaliações recebidas pelo utilizador (P10)
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';

export interface ReceivedRating {
  id: string;
  rideId: string;
  raterId: string;
  raterName: string;
  raterPhotoUrl: string | null;
  score: number;
  comment: string | null;
  createdAt: string;
}

interface RawRating {
  id: string;
  ride_id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

interface RawUser {
  id: string;
  name: string;
  photo_url: string | null;
}

export function useReceivedRatings(limit = 5) {
  const { user } = useAuthStore();
  const [ratings, setRatings] = useState<ReceivedRating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: rows, error: rowsError } = await supabase
        .from('ratings')
        .select('id, ride_id, rater_id, score, comment, created_at')
        .eq('rated_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (rowsError) throw rowsError;
      const raw = (rows ?? []) as RawRating[];
      if (raw.length === 0) {
        setRatings([]);
        return;
      }
      const raterIds = Array.from(new Set(raw.map((r) => r.rater_id)));
      const { data: usersRaw } = await supabase
        .from('users')
        .select('id, name, photo_url')
        .in('id', raterIds);
      const usersList = (usersRaw ?? []) as RawUser[];
      const userMap = new Map<string, RawUser>(usersList.map((u) => [u.id, u]));

      setRatings(
        raw.map((r) => {
          const u = userMap.get(r.rater_id);
          return {
            id: r.id,
            rideId: r.ride_id,
            raterId: r.rater_id,
            raterName: u?.name ?? 'Utilizador',
            raterPhotoUrl: u?.photo_url ?? null,
            score: r.score,
            comment: r.comment,
            createdAt: r.created_at,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar avaliações.');
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { ratings, isLoading, error, refresh: fetch };
}
