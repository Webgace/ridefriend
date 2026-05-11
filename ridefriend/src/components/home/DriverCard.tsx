// Ficheiro: src/components/home/DriverCard.tsx | Função: cartão de motorista da rede (P5)
// Ref. mockup: .driver-item / .approaching no ridefriend.html
import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  COLORS,
  FONTS,
  RELATION_COLORS,
  classifyEta,
} from '@constants/theme';
import { useT } from '@hooks/useT';
import { NearbyDriver } from '@types/index';
import AvatarBadge from '@components/ui/AvatarBadge';
import ETABadge from '@components/ui/ETABadge';
import ApproachBar from '@components/ui/ApproachBar';

interface Props {
  driver: NearbyDriver;
  onRequest: (driver: NearbyDriver) => void;
}

const APPROACH_BAR_THRESHOLD_MIN = 5;

export default function DriverCard({ driver, onRequest }: Props) {
  const { t } = useT('ride');
  const relation = driver.group;
  const palette = RELATION_COLORS[relation];
  const isClose = classifyEta(driver.eta) === 'close';

  const approachProgress = useMemo(() => {
    if (driver.eta <= 0) return 1;
    if (driver.eta >= APPROACH_BAR_THRESHOLD_MIN) return 0;
    return 1 - driver.eta / APPROACH_BAR_THRESHOLD_MIN;
  }, [driver.eta]);

  const handleCall = () => {
    if (driver.phone) Linking.openURL(`tel:${driver.phone}`);
  };

  const ratingLabel = driver.rating > 0 ? driver.rating.toFixed(1) : '—';
  const plate = driver.vehicle?.plate;
  // Distância via i18n: "500 m" (<1 km, valor inteiro) ou "1.2 km" (com 1 decimal).
  const distanceLabel =
    driver.distance < 1
      ? t('distance_m', { n: Math.round(driver.distance * 1000) })
      : t('distance_km', { n: driver.distance.toFixed(1) });

  return (
    <View style={[styles.card, isClose && styles.cardApproaching]}>
      <AvatarBadge name={driver.name} group={relation} status="online" size={46} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {driver.name}
          </Text>
          <View style={[styles.tag, { backgroundColor: palette.bg }]}>
            <Text style={[styles.tagText, { color: palette.fg }]}>
              {t(`rel_${relation}` as 'rel_family')}
            </Text>
          </View>
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {distanceLabel}
          {plate ? ` · ${plate}` : ''}
        </Text>

        <View style={styles.statusRow}>
          <ETABadge minutes={driver.eta} />
          <Text style={styles.rating}>★ {ratingLabel}</Text>
        </View>

        {driver.eta <= APPROACH_BAR_THRESHOLD_MIN && (
          <ApproachBar progress={approachProgress} style={styles.approach} />
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('call')}
          onPress={handleCall}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Text style={styles.iconBtnText}>☏</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('request_ride')}
          onPress={() => onRequest(driver)}
          style={({ pressed }) => [styles.requestBtn, pressed && styles.pressed]}
        >
          <Text style={styles.requestBtnText}>{t('request_ride')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  cardApproaching: {
    borderColor: '#6EE7B7',
    backgroundColor: '#F0FDF4',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
    color: COLORS.text,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  tagText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
  },
  meta: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rating: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text2,
  },
  approach: {
    marginTop: 6,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: COLORS.border,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
    color: COLORS.text,
  },
  requestBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
