// Ficheiro: src/components/ui/ApproachBar.tsx | Função: barra de aproximação animada (P5)
// Ref. mockup: .approach-bar no ridefriend.html
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@constants/theme';

interface Props {
  /** Progresso 0..1. Quanto mais perto de 1, mais cheia a barra. */
  progress: number;
  style?: ViewStyle;
}

export default function ApproachBar({ progress, style }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const widthPct = useSharedValue(clamped * 100);

  useEffect(() => {
    widthPct.value = withTiming(clamped * 100, { duration: 1000 });
  }, [clamped, widthPct]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${widthPct.value}%` }));

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: COLORS.green,
    borderRadius: 2,
    height: '100%',
  },
  track: {
    backgroundColor: COLORS.border,
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
});
