// Ficheiro: src/screens/profile/ProfileScreen.tsx | Função: perfil + stats + historial + avaliações (P10)
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
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useContacts } from '@hooks/useContacts';
import { useRideHistory } from '@hooks/useRideHistory';
import { useReceivedRatings } from '@hooks/useReceivedRatings';
import AvatarBadge from '@components/ui/AvatarBadge';
import RideHistoryItem from '@components/profile/RideHistoryItem';

function Stars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <Text style={{ color: COLORS.amber, fontFamily: FONTS.soraBold, fontSize: size }}>
      {'★'.repeat(Math.round(score))}
      <Text style={{ color: COLORS.gray300 }}>
        {'★'.repeat(Math.max(0, 5 - Math.round(score)))}
      </Text>
    </Text>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const showConfirm = useUiHostStore((s) => s.showConfirm);

  const { contacts, isLoading: contactsLoading, refresh: refreshContacts } = useContacts(null);
  const { rides, isLoading: ridesLoading, refresh: refreshRides } = useRideHistory(10);
  const { ratings, isLoading: ratingsLoading, refresh: refreshRatings } = useReceivedRatings(5);

  const stats = useMemo(() => {
    const received = rides.filter((r) => r.role === 'passenger').length;
    const given = rides.filter((r) => r.role === 'driver').length;
    return { received, given, network: contacts.length };
  }, [rides, contacts]);

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

  const isLoading = contactsLoading || ridesLoading || ratingsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshAll} tintColor={COLORS.navy} />
        }
      >
        <View style={styles.hero}>
          <AvatarBadge name={user?.name ?? '?'} size={86} status="online" />
          <View style={styles.heroBody}>
            <Text style={styles.heroName}>{user?.name ?? '—'}</Text>
            <Text style={styles.heroSub}>{user?.phone ?? ''}</Text>
            <View style={styles.heroRatingRow}>
              <Stars score={user?.rating ?? 0} />
              <Text style={styles.heroRatingText}>
                {(user?.rating ?? 0).toFixed(1)} · {user?.totalRides ?? 0} boleias
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Recebidas" value={stats.received} />
          <Stat label="Dadas" value={stats.given} />
          <Stat label="Rede" value={stats.network} />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton label="Editar Perfil" onPress={() => navigation.navigate('EditProfile')} />
          <ActionButton label="Definições" onPress={() => navigation.navigate('Settings')} />
        </View>

        <Section title="Historial Recente">
          {ridesLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 16 }} />
          ) : rides.length === 0 ? (
            <Text style={styles.empty}>Ainda sem boleias.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {rides.map((r) => (
                <RideHistoryItem key={r.id} ride={r} />
              ))}
            </View>
          )}
        </Section>

        <Section title="Avaliações Recentes">
          {ratingsLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 16 }} />
          ) : ratings.length === 0 ? (
            <Text style={styles.empty}>Sem avaliações ainda.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {ratings.map((r) => (
                <View key={r.id} style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <AvatarBadge name={r.raterName} size={36} status="offline" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ratingName}>{r.raterName}</Text>
                      <Stars score={r.score} size={12} />
                    </View>
                  </View>
                  {r.comment ? <Text style={styles.ratingComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </Section>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
        >
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

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
    >
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 16, paddingBottom: 80, gap: 16 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    gap: 16,
  },
  heroBody: { flex: 1, gap: 4 },
  heroName: { fontFamily: FONTS.soraBold, fontSize: 22, color: COLORS.text },
  heroSub: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2 },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  heroRatingText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },

  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: { fontFamily: FONTS.soraBold, fontSize: 22, color: COLORS.navy },
  statLabel: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.text2, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.navy,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },

  section: { gap: 8 },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 13,
  },

  ratingCard: { backgroundColor: COLORS.white, padding: 14, borderRadius: 16, gap: 8 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingName: { fontFamily: FONTS.soraBold, fontSize: 13, color: COLORS.text },
  ratingComment: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2 },

  logoutBtn: {
    backgroundColor: COLORS.redLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: { color: COLORS.red, fontFamily: FONTS.soraBold, fontSize: 14 },

  empty: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 13, paddingVertical: 8 },
  pressed: { opacity: 0.85 },
});
