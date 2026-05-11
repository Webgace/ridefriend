// Ficheiro: src/hooks/useContacts.ts | Função: lista contactos do utilizador agrupados + status (P10)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { ContactGroup } from '@types/index';
import { haversineDistance } from '@utils/geo';

export interface ContactRow {
  id: string;                  // contacts.id
  contactUserId: string;
  group: ContactGroup;
  name: string;
  photoUrl: string | null;
  phone: string;
  isDriver: boolean;
  ratingAvg: number;
  /** undefined = não foi encontrado em locations (offline há muito tempo). */
  lastSeen: string | null;
  isActive: boolean;
  /** Distância (km) ao ponto de referência fornecido (ou null se não houver). */
  distanceKm: number | null;
  status: 'online' | 'busy' | 'offline';
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // <5 min = online; <30 min = busy; resto = offline
const BUSY_THRESHOLD_MS = 30 * 60 * 1000;

function classifyStatus(lastSeen: string | null, isActive: boolean): ContactRow['status'] {
  if (!lastSeen || !isActive) return 'offline';
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age <= ACTIVE_THRESHOLD_MS) return 'online';
  if (age <= BUSY_THRESHOLD_MS) return 'busy';
  return 'offline';
}

export interface UseContactsResult {
  contacts: ContactRow[];
  byGroup: Record<ContactGroup, ContactRow[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeContact: (contactRowId: string) => Promise<void>;
}

/**
 * Lê contacts + users + locations em três queries (RLS-friendly).
 * Calcula distância contra `referenceLocation` se fornecido.
 */
export function useContacts(
  referenceLocation: { lat: number; lng: number } | null = null,
): UseContactsResult {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      type RawContact = { id: string; contact_user_id: string; group_type: ContactGroup };
      type RawUser = {
        id: string;
        name: string;
        photo_url: string | null;
        phone: string;
        is_driver: boolean;
        rating_avg: string | number | null;
      };
      type RawLoc = {
        user_id: string;
        lat: string | number;
        lng: string | number;
        is_active: boolean;
        updated_at: string;
      };

      const { data: contactRowsRaw, error: contactsError } = await supabase
        .from('contacts')
        .select('id, contact_user_id, group_type')
        .eq('user_id', user.id);
      if (contactsError) throw contactsError;
      const contactRows = (contactRowsRaw ?? []) as RawContact[];
      if (contactRows.length === 0) {
        setRows([]);
        return;
      }

      const ids = contactRows.map((r) => r.contact_user_id);

      const [{ data: usersRaw, error: usersError }, { data: locsRaw }] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, photo_url, phone, is_driver, rating_avg')
          .in('id', ids),
        supabase
          .from('locations')
          .select('user_id, lat, lng, is_active, updated_at')
          .in('user_id', ids),
      ]);
      if (usersError) throw usersError;

      const userById = new Map<string, RawUser>(
        ((usersRaw ?? []) as RawUser[]).map((u) => [u.id, u]),
      );
      const locById = new Map<string, RawLoc>(
        ((locsRaw ?? []) as RawLoc[]).map((l) => [l.user_id, l]),
      );

      const result: ContactRow[] = contactRows
        .map((c) => {
          const u = userById.get(c.contact_user_id);
          if (!u) return null;
          const loc = locById.get(c.contact_user_id);
          const distanceKm =
            referenceLocation && loc
              ? haversineDistance(
                  referenceLocation.lat,
                  referenceLocation.lng,
                  Number(loc.lat),
                  Number(loc.lng),
                )
              : null;
          return {
            id: c.id,
            contactUserId: c.contact_user_id,
            group: c.group_type as ContactGroup,
            name: u.name,
            photoUrl: u.photo_url,
            phone: u.phone,
            isDriver: u.is_driver,
            ratingAvg: Number(u.rating_avg ?? 0),
            lastSeen: loc?.updated_at ?? null,
            isActive: Boolean(loc?.is_active),
            distanceKm,
            status: classifyStatus(loc?.updated_at ?? null, Boolean(loc?.is_active)),
          } satisfies ContactRow;
        })
        .filter((r): r is ContactRow => r !== null);

      setRows(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar contactos.');
    } finally {
      setIsLoading(false);
    }
  }, [user, referenceLocation]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const removeContact = useCallback(
    async (contactRowId: string) => {
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactRowId);
      if (deleteError) throw new Error(deleteError.message);
      setRows((prev) => prev.filter((r) => r.id !== contactRowId));
    },
    [],
  );

  const byGroup = useMemo<Record<ContactGroup, ContactRow[]>>(() => {
    const groups: Record<ContactGroup, ContactRow[]> = {
      family: [],
      friend: [],
      colleague: [],
      neighbour: [],
    };
    for (const r of rows) groups[r.group].push(r);
    return groups;
  }, [rows]);

  return {
    contacts: rows,
    byGroup,
    isLoading,
    error,
    refresh: fetchContacts,
    removeContact,
  };
}
