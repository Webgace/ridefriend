// Ficheiro: src/components/home/HeroLocationCard.tsx | Função: cartão hero de paragem actual (P5)
// Ref. mockup: .hero-card no ridefriend.html
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  stopName: string | null;
  waitingFor?: string;
  nearbyCount: number;
  style?: ViewStyle;
}

export default function HeroLocationCard({
  stopName,
  waitingFor,
  nearbyCount,
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

        <Text style={styles.stopName} numberOfLines={2}>
          {stopName ?? t('detecting_location')}
        </Text>

        <View style={styles.pillsRow}>
          {waitingFor ? (
            <View style={[styles.pill, { backgroundColor: 'rgba(217,119,6,0.25)' }]}>
              <Text style={styles.pillText}>{t('waiting_since', { time: waitingFor })}</Text>
            </View>
          ) : null}
          <View style={[styles.pill, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
            <Text style={styles.pillText}>
              {t(nearbyCount === 1 ? 'nearby_count_one' : 'nearby_count', { count: nearbyCount })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    position: 'relative',
  },
  decorTopRight: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245,158,11,0.12)',
    top: -40,
    right: -40,
  },
  decorBottomRight: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.08)',
    bottom: -20,
    right: -10,
  },
  label: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stopName: {
    fontFamily: FONTS.soraBold,
    fontSize: 19,
    color: COLORS.white,
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
});
