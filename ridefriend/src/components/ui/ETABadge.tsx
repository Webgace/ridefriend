// Ficheiro: src/components/ui/ETABadge.tsx | Função: badge de ETA com classificação visual (P5)
// Ref. mockup: .eta-badge / .eta-badge.close (blink-green) no ridefriend.html
import React, { useEffect } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { ETA_BADGE_STYLES, FONTS, classifyEta } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  minutes: number;
  style?: ViewStyle;
}

export default function ETABadge({ minutes, style }: Props) {
  const { t } = useT('ride');
  const category = classifyEta(minutes);
  const palette = ETA_BADGE_STYLES[category];
  const opacity = useSharedValue(1);

  // Animação blink-green só para ETA <= 2min — restante fica estático.
  useEffect(() => {
    if (category === 'close') {
      opacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(opacity);
  }, [category, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Texto do ETA via i18n: "Agora!", "5 min", "1h 5m" — nunca hardcoded.
  let etaText: string;
  if (minutes <= 0) {
    etaText = t('eta_now');
  } else if (minutes < 60) {
    etaText = t('eta_min', { n: minutes });
  } else {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    etaText = m === 0 ? t('eta_hours_only', { h }) : t('eta_hours', { h, m });
  }

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: palette.bg }, animatedStyle, style]}
    >
      <Text style={[styles.text, { color: palette.fg }]}>{etaText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  text: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
  },
});
