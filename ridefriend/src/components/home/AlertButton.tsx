// Ficheiro: src/components/home/AlertButton.tsx | Função: botão "Estou Aqui!" com pulse-ring (P5)
// Ref. mockup: .alert-btn (com keyframe pulse-ring) no ridefriend.html
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  notifiedCount: number;
  onPress: () => Promise<void> | void;
  disabled?: boolean;
  style?: ViewStyle;
}

const SENT_RESET_MS = 5000;

export default function AlertButton({ notifiedCount, onPress, disabled, style }: Props) {
  const { t } = useT('ride');
  const [sent, setSent] = useState(false);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (sent) {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = 1;
      ringOpacity.value = 0;
      const id = setTimeout(() => setSent(false), SENT_RESET_MS);
      return () => clearTimeout(id);
    }
    ringScale.value = withRepeat(
      withTiming(1.2, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
  }, [sent, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const handlePress = async () => {
    if (disabled || sent) return;
    try {
      await onPress();
      setSent(true);
    } catch (error) {
      console.warn('AlertButton onPress failed:', error);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      {!sent && <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />}
      <Pressable
        accessibilityLabel={sent ? t('im_here_sent', { count: notifiedCount }) : t('im_here_btn')}
        onPress={handlePress}
        disabled={disabled || sent}
        style={({ pressed }) => [
          styles.btn,
          sent ? styles.btnSent : styles.btnDefault,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.text, sent ? styles.textSent : styles.textDefault]}>
          {sent
            ? `✓  ${t('im_here_sent', { count: notifiedCount })}`
            : t('im_here_btn')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    borderRadius: 20,
    elevation: 6,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  btnDefault: {
    backgroundColor: COLORS.amber,
  },
  btnSent: {
    backgroundColor: COLORS.green,
  },
  pressed: {
    opacity: 0.85,
  },
  ring: {
    backgroundColor: COLORS.amber,
    borderRadius: 20,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  text: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
  },
  textDefault: {
    color: COLORS.navy,
  },
  textSent: {
    color: COLORS.white,
  },
  wrap: {
    alignItems: 'stretch',
    justifyContent: 'center',
    position: 'relative',
  },
});
