// Ficheiro: src/hooks/useContacts.ts | Função: lista contactos do utilizador agrupados + status (P10, phantom v2)
// Suporta contactos phantom (contact_user_id IS NULL) com nome/telefone guardados em alias_*.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { haversineDistance } from '@utils/geo';
import { toE164 } from '@utils/phone';
import type { ContactGroup } from '@types/index';

export interface ContactRow {
  id: string;                  // contacts.id
  contactUserId: string | null;
  group: ContactGroup;
  name: string;
  photoUrl: string | null;
  phone: string;
  isDriver: boolean;
  ratingAvg: number;
  /** Verdadeiro se este contacto já está registado no RideFriend. */
  hasAccount: boolean;
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

export interface UpdateContactPatch {
  name?: string;
  phone?: string;
  group?: ContactGroup;
}

export interface UseContactsResult {
  contacts: ContactRow[];
  byGroup: Record<ContactGroup, ContactRow[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeContact: (contactRowId: string) => Promise<void>;
  updateContact: (contactRowId: string, patch: UpdateContactPatch) => Promise<void>;
  addPhantomContact: (input: { name: string; phone: string; group: ContactGroup }) => Promise<void>;
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
      type RawContact = {
        id: string;
        contact_user_id: string | null;
        group_type: ContactGroup;
        alias_name: string | null;
        alias_phone: string | null;
      };
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
        .select('id, contact_user_id, group_type, alias_name, alias_phone')
        .eq('user_id', user.id);
      if (contactsError) throw contactsError;
      const contactRows = (contactRowsRaw ?? []) as RawContact[];
      if (contactRows.length === 0) {
        setRows([]);
        return;
      }

      const ids = contactRows
        .map((r) => r.contact_user_id)
        .filter((v): v is string => Boolean(v));

      const [{ data: usersRaw, error: usersError }, { data: locsRaw }] = await Promise.all([
        ids.length > 0
          ? supabase
              .from('users')
              .select('id, name, photo_url, phone, is_driver, rating_avg')
              .in('id', ids)
          : Promise.resolve({ data: [] as RawUser[], error: null }),
        ids.length > 0
          ? supabase
              .from('locations')
              .select('user_id, lat, lng, is_active, updated_at')
              .in('user_id', ids)
          : Promise.resolve({ data: [] as RawLoc[] }),
      ]);
      if (usersError) throw usersError;

      const userById = new Map<string, RawUser>(
        ((usersRaw ?? []) as RawUser[]).map((u) => [u.id, u]),
      );
      const locById = new Map<string, RawLoc>(
        ((locsRaw ?? []) as RawLoc[]).map((l) => [l.user_id, l]),
      );

      const result: ContactRow[] = contactRows
        .map((c): ContactRow | null => {
          // Linha "real" — utilizador ligado existe.
          if (c.contact_user_id) {
            const u = userById.get(c.contact_user_id);
            if (!u) return null; // utilizador eliminado entretanto
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
              name: c.alias_name || u.name,
              photoUrl: u.photo_url,
              phone: c.alias_phone || u.phone,
              isDriver: u.is_driver,
              ratingAvg: Number(u.rating_avg ?? 0),
              hasAccount: true,
              lastSeen: loc?.updated_at ?? null,
              isActive: Boolean(loc?.is_active),
              distanceKm,
              status: classifyStatus(loc?.updated_at ?? null, Boolean(loc?.is_active)),
            };
          }
          // Linha phantom — sem utilizador ligado.
          return {
            id: c.id,
            contactUserId: null,
            group: c.group_type as ContactGroup,
            name: c.alias_name || c.alias_phone || 'Contacto sem nome',
            photoUrl: null,
            phone: c.alias_phone || '',
            isDriver: false,
            ratingAvg: 0,
            hasAccount: false,
            lastSeen: null,
            isActive: false,
            distanceKm: null,
            status: 'offline',
          };
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

  const removeContact = useCallback(async (contactRowId: string) => {
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactRowId);
    if (deleteError) throw new Error(deleteError.message);
    setRows((prev) => prev.filter((r) => r.id !== contactRowId));
  }, []);

  const updateContact = useCallback(
    async (contactRowId: string, patch: UpdateContactPatch) => {
      const updatePayload: {
        group_type?: ContactGroup;
        alias_name?: string | null;
        alias_phone?: string | null;
      } = {};
      if (patch.group !== undefined) updatePayload.group_type = patch.group;
      if (patch.name !== undefined) {
        const trimmed = patch.name.trim();
        updatePayload.alias_name = trimmed.length > 0 ? trimmed : null;
      }
      if (patch.phone !== undefined) {
        const trimmed = patch.phone.trim();
        // Canonicaliza para E.164 usando o market activo — ver utils/phone.ts.
        const market = useMarketStore.getState().config;
        updatePayload.alias_phone =
          trimmed.length > 0 ? toE164(trimmed, market?.phonePrefix ?? '') : null;
      }

      if (Object.keys(updatePayload).length === 0) return;

      const { error: updateError } = await supabase
        .from('contacts')
        .update(updatePayload as never)
        .eq('id', contactRowId);
      if (updateError) throw new Error(updateError.message);

      // Atualização optimista local
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== contactRowId) return r;
          return {
            ...r,
            ...(patch.group !== undefined ? { group: patch.group } : {}),
            ...(patch.name !== undefined && patch.name.trim() ? { name: patch.name.trim() } : {}),
            ...(patch.phone !== undefined && patch.phone.trim()
              ? { phone: patch.phone.trim() }
              : {}),
          };
        }),
      );
    },
    [],
  );

  const addPhantomContact = useCallback(
    async (input: { name: string; phone: string; group: ContactGroup }) => {
      if (!user) throw new Error('Não autenticado.');
      const name = input.name.trim();
      const rawPhone = input.phone.trim();
      if (!rawPhone) throw new Error('Telefone obrigatório.');

      const market = useMarketStore.getState().config;
      const phone = toE164(rawPhone, market?.phonePrefix ?? '');

      const insertPayload = {
        user_id: user.id,
        contact_user_id: null,
        group_type: input.group,
        alias_name: name || null,
        alias_phone: phone,
      };
      const { error: insertError } = await supabase
        .from('contacts')
        .insert(insertPayload as never);
      if (insertError) {
        // 23505 = unique_violation (já tens este número como phantom)
        if (insertError.code === '23505') {
          throw new Error('Já tens este número na rede.');
        }
        throw new Error(insertError.message);
      }
      await fetchContacts();
    },
    [user, fetchContacts],
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
    updateContact,
    addPhantomContact,
  };
}
