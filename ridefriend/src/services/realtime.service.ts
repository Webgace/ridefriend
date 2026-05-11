// Ficheiro: src/services/realtime.service.ts | Função: subscrições Supabase Realtime (P4 v2.1)
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@services/supabase';
import { Database } from '@types/supabase';

type LocationRow = Database['public']['Tables']['locations']['Row'];
type RideRow = Database['public']['Tables']['rides']['Row'];

const channels: Record<string, RealtimeChannel> = {};

/**
 * Subscreve INSERT/UPDATE em public.locations.
 * O filtro contact-network é aplicado pelas RLS policies do Supabase
 * (ver supabase_setup_v2.sql: locations_select_own_or_contact). Como segurança extra,
 * filtramos no cliente pelo array contactIds.
 */
export function subscribeToContactsLocations(
  userId: string,
  contactIds: string[],
  callback: (location: LocationRow) => void,
): RealtimeChannel {
  const channelName = `locations:${userId}`;
  if (channels[channelName]) {
    channels[channelName].unsubscribe();
    delete channels[channelName];
  }

  const allowed = new Set(contactIds);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'locations' },
      (payload) => {
        const row = payload.new as LocationRow;
        if (allowed.has(row.user_id)) callback(row);
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'locations' },
      (payload) => {
        const row = payload.new as LocationRow;
        if (allowed.has(row.user_id)) callback(row);
      },
    )
    .subscribe();

  channels[channelName] = channel;
  return channel;
}

/**
 * Subscreve mudanças num ride específico (status, started_at, ended_at).
 */
export function subscribeToRideUpdates(
  rideId: string,
  callback: (ride: RideRow) => void,
): RealtimeChannel {
  const channelName = `ride:${rideId}`;
  if (channels[channelName]) {
    channels[channelName].unsubscribe();
    delete channels[channelName];
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
      (payload) => callback(payload.new as RideRow),
    )
    .subscribe();

  channels[channelName] = channel;
  return channel;
}

export async function unsubscribeAll(): Promise<void> {
  for (const channel of Object.values(channels)) {
    try {
      await channel.unsubscribe();
    } catch (error) {
      console.error('unsubscribeAll error:', error);
    }
  }
  Object.keys(channels).forEach((key) => delete channels[key]);
}

export async function unsubscribe(channelName: string): Promise<void> {
  const channel = channels[channelName];
  if (!channel) return;
  await channel.unsubscribe();
  delete channels[channelName];
}
