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
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  approach: {
    marginTop: 6,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  cardApproaching: {
    backgroundColor: '#F0FDF4',
    borderColor: '#6EE7B7',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconBtnText: {
    color: COLORS.text,
    fontSize: 16,
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
    fontSize: 15,
  },
  pressed: {
    opacity: 0.8,
  },
  rating: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
  },
});
