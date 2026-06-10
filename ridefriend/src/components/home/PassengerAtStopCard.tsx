// Ficheiro: src/components/home/PassengerAtStopCard.tsx | Função: card de passageiro na mesma paragem (P5)
// Ref. mockup: variante de .driver-item para a secção "Outros na Paragem" no ridefriend.html
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RELATION_COLORS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { NearbyPassenger } from '@types/index';
import AvatarBadge from '@components/ui/AvatarBadge';

interface Props {
  passenger: NearbyPassenger;
}

export default function PassengerAtStopCard({ passenger }: Props) {
  const { t } = useT('ride');
  const palette = RELATION_COLORS[passenger.group];

  // Distância vem em km (NearbyPassenger.distance) — converter para texto via i18n.
  const distanceLabel =
    passenger.distance < 1
      ? t('distance_m', { n: Math.round(passenger.distance * 1000) })
      : t('distance_km', { n: passenger.distance.toFixed(1) });

  const handleCall = () => {
    if (passenger.phone) Linking.openURL(`tel:${passenger.phone}`);
  };

  return (
    <View style={styles.card}>
      <AvatarBadge name={passenger.name} group={passenger.group} status="online" size={40} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {passenger.name}
          </Text>
          <View style={[styles.tag, { backgroundColor: palette.bg }]}>
            <Text style={[styles.tagText, { color: palette.fg }]}>
              {t(`rel_${passenger.group}` as 'rel_family')}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {t('at_stop')} · {distanceLabel}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={t('call')}
        onPress={handleCall}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Text style={styles.iconBtnText}>☏</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 2,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  iconBtnText: {
    color: COLORS.text,
    fontSize: 14,
  },
  meta: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
  },
  name: {
    color: COLORS.text,
    flexShrink: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tagText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
  },
});
