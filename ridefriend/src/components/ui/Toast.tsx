// Ficheiro: src/components/ui/Toast.tsx | Função: toast slide-up sobre o ecrã (P0 v2.1)
// Ref. mockup: .toast no ridefriend.html
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '@constants/theme';
import { useUiHostStore } from '@store/uiHostStore';

const TONE_BG: Record<'info' | 'success' | 'error', string> = {
  info: COLORS.navy,
  success: COLORS.green,
  error: COLORS.red,
};

export default function ToastHost() {
  const toast = useUiHostStore((s) => s.toast);
  const hideToast = useUiHostStore((s) => s.hideToast);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (!toast) return;
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });

    const fadeId = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(20, { duration: 250 });
    }, toast.durationMs);
    const removeId = setTimeout(() => hideToast(), toast.durationMs + 280);

    return () => {
      clearTimeout(fadeId);
      clearTimeout(removeId);
    };
  }, [toast, opacity, translateY, hideToast]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.toast, { backgroundColor: TONE_BG[toast.tone] }, style]}>
        <Text style={styles.text}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 95,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 30,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    maxWidth: '85%',
  },
  text: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
  },
});
