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
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 48,
  },
  emptyBody: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  emptyTitle: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 15 },
  filterPill: {
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterPillActive: {
    backgroundColor: COLORS.navy,
  },
  filterText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  filtersWrap: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listContent: {
    backgroundColor: COLORS.surface,
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  safe: { backgroundColor: COLORS.white, flex: 1 },
  sep: { height: 10 },
});
