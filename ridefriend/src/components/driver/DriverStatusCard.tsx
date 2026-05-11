// Ficheiro: src/components/driver/DriverStatusCard.tsx | Função: card de disponibilidade + rota actual (P6)
// Ref. mockup: layout "MODO MOTORISTA — Status Card" no RideFriend_Design_Reference.txt
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { haversineDistance, estimateETA } from '@utils/geo';
import type { DriverRoute } from '@hooks/useDriverMode';

interface Props {
  isActive: boolean;
  onToggle: (next: boolean) => void;
  currentRoute: DriverRoute | null;
  onClearRoute: () => void;
  onOpenRouteInput: () => void;
  style?: ViewStyle;
}

export default function DriverStatusCard({
  isActive,
  onToggle,
  currentRoute,
  onClearRoute,
  onOpenRouteInput,
  style,
}: Props) {
  const { t } = useT('ride');

  const distanceKm = useMemo(() => {
    if (!currentRoute) return 0;
    return haversineDistance(
      currentRoute.origin.lat,
      currentRoute.origin.lng,
      currentRoute.dest.lat,
      currentRoute.dest.lng,
    );
  }, [currentRoute]);
  const etaMin = estimateETA(distanceKm);

  return (
    <View
      style={[
        styles.card,
        isActive ? styles.cardOn : styles.cardOff,
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: isActive ? COLORS.green : COLORS.text3 }]} />
        <Text style={styles.label}>
          {isActive ? t('driver_status_available') : t('driver_status_inactive')}
        </Text>
        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.gray300, true: COLORS.green }}
          thumbColor={COLORS.white}
        />
      </View>

      <Pressable
        accessibilityLabel={t('driver_route_label')}
        onPress={onOpenRouteInput}
        style={({ pressed }) => [styles.routeRow, pressed && styles.pressed]}
      >
        <Text style={styles.routeLabel}>{t('driver_route_label')}</Text>
        <Text style={styles.routeName} numberOfLines={1}>
          {currentRoute?.destinationName ?? t('driver_route_placeholder')}
        </Text>
        {currentRoute ? (
          <Text style={styles.routeMeta}>
            {t('driver_route_distance', { km: distanceKm.toFixed(1), minutes: etaMin })}
          </Text>
        ) : null}
      </Pressable>

      {currentRoute ? (
        <Pressable onPress={onClearRoute} style={styles.clearRow}>
          <Text style={styles.clearText}>{t('driver_route_clear')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  cardOn: { borderColor: COLORS.green },
  cardOff: { borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    flex: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.text,
  },
  routeRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  routeLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    color: COLORS.text2,
    letterSpacing: 1,
  },
  routeName: { fontFamily: FONTS.soraBold, fontSize: 16, color: COLORS.text },
  routeMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },
  clearRow: { alignSelf: 'flex-end' },
  clearText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.red },
  pressed: { opacity: 0.85 },
});
