// Ficheiro: src/screens/profile/ProfileScreen.tsx | Função: perfil + stats + historial resumido + avaliações (P10 v2)
// Polido para alinhar com a linguagem visual do Home/Map/Rede (hero navy, cards arredondados, pills).
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useContacts } from '@hooks/useContacts';
import { useRideHistory } from '@hooks/useRideHistory';
import { useReceivedRatings } from '@hooks/useReceivedRatings';
import AvatarBadge from '@components/ui/AvatarBadge';
import RideHistoryItem from '@components/profile/RideHistoryItem';

const RECENT_RIDES_LIMIT = 3;

function Stars({ score, size = 13, dim = 'rgba(255,255,255,0.35)' }: { score: number; size?: number; dim?: string }) {
  const filled = Math.round(score);
  return (
    <Text style={{ color: COLORS.amber, fontFamily: FONTS.soraBold, fontSize: size }}>
      {'★'.repeat(filled)}
      <Text style={{ color: dim }}>{'★'.repeat(Math.max(0, 5 - filled))}</Text>
    </Text>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const showConfirm = useUiHostStore((s) => s.showConfirm);

  const { contacts, isLoading: contactsLoading, refresh: refreshContacts } = useContacts(null);
  const { rides, isLoading: ridesLoading, refresh: refreshRides } = useRideHistory(20);
  const { ratings, isLoading: ratingsLoading, refresh: refreshRatings } = useReceivedRatings(5);

  const stats = useMemo(() => {
    const received = rides.filter((r) => r.role === 'passenger').length;
    const given = rides.filter((r) => r.role === 'driver').length;
    return { received, given, network: contacts.length };
  }, [rides, contacts]);

  const recentRides = rides.slice(0, RECENT_RIDES_LIMIT);

  const refreshAll = async () => {
    await Promise.all([refreshContacts(), refreshRides(), refreshRatings()]);
  };

  const handleLogout = () => {
    showConfirm({
      title: 'Sair?',
      message: 'A sessão será terminada neste dispositivo.',
      confirmLabel: 'Sair',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const openHistoryTab = () => {
    navigation.navigate('MainTabs', { screen: 'History' });
  };

  const isLoading = contactsLoading || ridesLoading || ratingsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshAll} tintColor={COLORS.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero navy card */}
        <View style={styles.hero}>
          <View style={styles.heroDecorTop} />
          <View style={styles.heroDecorBottom} />

          <View style={styles.heroRow}>
            <AvatarBadge name={user?.name ?? '?'} size={72} status="online" />
            <View style={styles.heroBody}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.name ?? '—'}
              </Text>
              <Text style={styles.heroPhone} numberOfLines={1}>
                {user?.phone ?? ''}
              </Text>
              <View style={styles.heroRatingRow}>
                <Stars score={user?.rating ?? 0} />
                <Text style={styles.heroRatingText}>
                  {(user?.rating ?? 0).toFixed(1)} · {user?.totalRides ?? 0} boleias
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat label="Recebidas" value={stats.received} />
          <Stat label="Dadas" value={stats.given} />
          <Stat label="Rede" value={stats.network} />
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <ActionPill
            icon={<Ionicons name="settings-outline" size={16} color={COLORS.text} />}
            label="Definições"
            onPress={() => navigation.navigate('Settings')}
          />
          <ActionPill
            icon={<Ionicons name="time-outline" size={16} color={COLORS.text} />}
            label="Histórico"
            onPress={openHistoryTab}
          />
          <ActionPill
            icon={<Ionicons name="shield-outline" size={16} color={COLORS.text} />}
            label="Emergência"
            onPress={() => navigation.navigate('EmergencyContact')}
          />
        </View>

        {user?.isAdmin ? (
          <Pressable
            onPress={() => navigation.navigate('Admin')}
            accessibilityRole="button"
            accessibilityLabel="Painel admin"
            style={({ pressed }) => [styles.adminBtn, pressed && styles.pressed]}
          >
            <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
            <Text style={styles.adminBtnText}>Painel admin</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        ) : null}

        {/* Recent rides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimas Boleias</Text>
            {rides.length > RECENT_RIDES_LIMIT ? (
              <Pressable onPress={openHistoryTab} accessibilityRole="button">
                <Text style={styles.sectionLink}>Ver tudo →</Text>
              </Pressable>
            ) : null}
          </View>
          {ridesLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 16 }} />
          ) : recentRides.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Ainda sem boleias.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recentRides.map((r) => (
                <RideHistoryItem key={r.id} ride={r} />
              ))}
            </View>
          )}
        </View>

        {/* Recent ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliações Recentes</Text>
          {ratingsLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 16 }} />
          ) : ratings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sem avaliações ainda.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {ratings.map((r) => (
                <View key={r.id} style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <AvatarBadge name={r.raterName} size={36} status="offline" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ratingName}>{r.raterName}</Text>
                      <Stars score={r.score} size={12} dim={COLORS.gray300} />
                    </View>
                  </View>
                  {r.comment ? <Text style={styles.ratingComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair"
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={16} color={COLORS.red} />
          <Text style={styles.logoutBtnText}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionPill({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.actionPillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionPill: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionPillText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },

  actionsRow: { flexDirection: 'row', gap: 8 },
  adminBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminBtnText: {
    color: COLORS.white,
    flex: 1,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  content: { gap: 14, padding: 16, paddingBottom: 60 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  emptyText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
  },
  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  heroBody: { flex: 1, gap: 3 },
  heroDecorBottom: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 45,
    bottom: -30,
    height: 90,
    position: 'absolute',
    right: 30,
    width: 90,
  },

  heroDecorTop: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 70,
    height: 140,
    position: 'absolute',
    right: -40,
    top: -50,
    width: 140,
  },
  heroName: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 22 },
  heroPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
  },
  heroRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },

  heroRatingText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  list: { gap: 8 },

  logoutBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.redLight,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
  },
  logoutBtnText: {
    color: COLORS.red,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  pressed: { opacity: 0.85 },
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },

  ratingComment: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
  },

  ratingHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  ratingName: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 13 },

  safe: { backgroundColor: COLORS.surface, flex: 1 },
  section: { gap: 10 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLink: {
    color: COLORS.navy,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },

  sectionTitle: {
    color: COLORS.text2,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    letterSpacing: 0.06 * 13,
    textTransform: 'uppercase',
  },
  stat: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flex: 1,
    gap: 2,
    paddingVertical: 14,
  },

  statLabel: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    letterSpacing: 0.05 * 11,
    textTransform: 'uppercase',
  },
  statValue: { color: COLORS.navy, fontFamily: FONTS.soraBold, fontSize: 22 },

  statsRow: { flexDirection: 'row', gap: 8 },
});
