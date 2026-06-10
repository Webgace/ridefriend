// Ficheiro: src/components/home/HeroLocationCard.tsx | Função: cartão hero de paragem actual (P5)
// Ref. mockup: .hero-card no ridefriend.html
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  stopName: string | null;
  waitingFor?: string;
  nearbyCount: number;
  temperatureC?: number | null;
  style?: ViewStyle;
}

export default function HeroLocationCard({
  stopName,
  waitingFor,
  nearbyCount,
  temperatureC,
  style,
}: Props) {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={[COLORS.navy, '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.decorTopRight} />
        <View style={styles.decorBottomRight} />

        <Text style={styles.label}>{`${tCommon('current_stop_pin')} ${t('current_stop')}`}</Text>

        <View style={styles.stopRow}>
          <MaterialCommunityIcons name="bus" size={22} color={COLORS.amber} />
          <Text style={styles.stopName} numberOfLines={2}>
            {stopName ?? t('detecting_location')}
          </Text>
        </View>

        <View style={styles.pillsRow}>
          {waitingFor ? (
            <View style={[styles.pill, styles.pillAmber]}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.white} />
              <Text style={styles.pillText}>{t('waiting_since', { time: waitingFor })}</Text>
            </View>
          ) : null}
          <View style={[styles.pill, styles.pillGreen]}>
            <MaterialCommunityIcons name="account-group-outline" size={12} color={COLORS.white} />
            <Text style={styles.pillText}>
              {t(nearbyCount === 1 ? 'nearby_count_one' : 'nearby_count', { count: nearbyCount })}
            </Text>
          </View>
          {typeof temperatureC === 'number' ? (
            <View style={[styles.pill, styles.pillNeutral]}>
              <MaterialCommunityIcons name="thermometer" size={12} color={COLORS.white} />
              <Text style={styles.pillText}>{`${Math.round(temperatureC)}°C`}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  decorBottomRight: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 40,
    bottom: -20,
    height: 80,
    position: 'absolute',
    right: -10,
    width: 80,
  },
  decorTopRight: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 60,
    height: 120,
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    position: 'relative',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillAmber: { backgroundColor: 'rgba(217,119,6,0.25)' },
  pillGreen: { backgroundColor: 'rgba(16,185,129,0.25)' },
  pillNeutral: { backgroundColor: 'rgba(255,255,255,0.18)' },
  pillText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopName: {
    color: COLORS.white,
    flex: 1,
    fontFamily: FONTS.soraBold,
    fontSize: 19,
  },
  stopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  wrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
});
