// Ficheiro: src/components/ui/SOSButton.tsx | Função: botão SOS fixo (P5/P8)
// Ref. mockup: .sos-btn no ridefriend.html
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  onLongPress: () => void;
  style?: ViewStyle;
  /** Long press em ms para evitar activação acidental. Spec P8: 1500ms. */
  longPressMs?: number;
}

export default function SOSButton({ onLongPress, style, longPressMs = 1500 }: Props) {
  const { t } = useT('ride');

  const handle = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
    onLongPress();
  };

  return (
    <Pressable
      accessibilityLabel={t('sos_label')}
      onLongPress={handle}
      delayLongPress={longPressMs}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      <Text style={styles.text}>{t('sos_label')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 18,
    bottom: 85,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 20,
  },
  pressed: {
    transform: [{ scale: 1.08 }],
  },
  text: {
    fontFamily: FONTS.soraBold,
    color: COLORS.white,
    fontSize: 11,
    letterSpacing: 0.05 * 11,
  },
});
