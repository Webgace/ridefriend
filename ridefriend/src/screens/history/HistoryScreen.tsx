// Ficheiro: src/screens/history/HistoryScreen.tsx | Função: separador "Histórico" — lista de boleias do utilizador
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useRideHistory, RideHistoryRow } from '@hooks/useRideHistory';
import { COLORS, FONTS } from '@constants/theme';
import AppHeader from '@components/ui/AppHeader';
import InviteFriendSheet from '@components/ui/InviteFriendSheet';
import RideHistoryItem from '@components/profile/RideHistoryItem';

type Filter = 'all' | 'passenger' | 'driver';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'passenger', label: 'Recebidas' },
  { id: 'driver', label: 'Dadas' },
];

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const { rides, isLoading, refresh } = useRideHistory(50);
  const [filter, setFilter] = useState<Filter>('all');
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo<RideHistoryRow[]>(() => {
    if (filter === 'all') return rides;
    return rides.filter((r) => r.role === filter);
  }, [rides, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        userInitial={user?.name?.[0]}
        userAvatarUrl={user?.avatar ?? null}
        onBellPress={() => showToast({ message: 'Sem novas notificações.', tone: 'info' })}
        onQrPress={() => setInviteOpen(true)}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <View style={styles.filtersWrap}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              accessibilityRole="button"
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <RideHistoryItem ride={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.navy} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sem boleias ainda</Text>
              <Text style={styles.emptyBody}>
                As tuas boleias dadas e recebidas vão aparecer aqui.
              </Text>
            </View>
          )
        }
      />

      <InviteFriendSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  filtersWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
  },
  filterPillActive: {
    backgroundColor: COLORS.navy,
  },
  filterText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text2,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: COLORS.surface,
    flexGrow: 1,
  },
  sep: { height: 10 },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.text },
  emptyBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
