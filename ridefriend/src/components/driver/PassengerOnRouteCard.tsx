// Ficheiro: src/components/driver/PassengerOnRouteCard.tsx | Função: card de passageiro na rota do motorista (P6)
// Ref. mockup: layout "MODO MOTORISTA — Passageiro no Percurso" no RideFriend_Design_Reference.txt
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RELATION_COLORS, RelationGroup } from '@constants/theme';
import { useT } from '@hooks/useT';
import { haversineDistance, estimateETA, formatDistance } from '@utils/geo';
import { NearbyPassenger } from '@types/index';
import type { DriverRoute } from '@hooks/useDriverMode';

interface Props {
  passenger: NearbyPassenger;
  currentRoute: DriverRoute | null;
  onOffer: () => void;
}

export default function PassengerOnRouteCard({ passenger, currentRoute, onOffer }: Props) {
  const { t } = useT('ride');
  const groupKey = (passenger.group as RelationGroup) || 'friend';
  const palette = RELATION_COLORS[groupKey] ?? RELATION_COLORS.friend;

  // Estimativa simples de desvio: distância do ponto de embarque até à origem da rota,
  // convertida em minutos via velocidade urbana média (estimateETA).
  const deviationMin = useMemo(() => {
    if (!currentRoute) return 0;
    const distKm = haversineDistance(
      passenger.location.latitude,
      passenger.location.longitude,
      currentRoute.origin.lat,
      currentRoute.origin.lng,
    );
    return estimateETA(distKm);
  }, [currentRoute, passenger]);

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: palette.avatarBg }]}>
        <Text style={[styles.avatarLetter, { color: palette.avatarFg }]}>
          {passenger.name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {passenger.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${t(`rel_${groupKey}` as 'rel_family')} · ${formatDistance(passenger.distance)}`}
        </Text>
        <Text style={styles.deviation}>
          {deviationMin > 0
            ? t('deviation_minutes', { n: deviationMin })
            : t('deviation_none')}
        </Text>
      </View>
      <Pressable
        onPress={onOffer}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={styles.btnText}>{t('driver_offer_ride')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  avatarLetter: { fontFamily: FONTS.soraBold, fontSize: 18 },
  btn: {
    backgroundColor: COLORS.amber,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: { color: COLORS.navy, fontFamily: FONTS.soraBold, fontSize: 12 },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  deviation: { color: COLORS.amber, fontFamily: FONTS.bodySemi, fontSize: 11 },
  info: { flex: 1, gap: 2 },
  meta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  name: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  pressed: { opacity: 0.85 },
});
