// Ficheiro: src/screens/home/HomeTabScreen.tsx | Função: toggle Passageiro/Motorista (P6)
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MMKV } from 'react-native-mmkv';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import PassengerHomeScreen from '@screens/home/PassengerHomeScreen';
import DriverHomeScreen from '@screens/home/DriverHomeScreen';

type Mode = 'passenger' | 'driver';

const STORAGE = new MMKV({ id: 'ridefriend-ui' });
const KEY_LAST_MODE = 'home.last_mode';

export default function HomeTabScreen() {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = STORAGE.getString(KEY_LAST_MODE);
    return stored === 'driver' ? 'driver' : 'passenger';
  });

  useEffect(() => {
    STORAGE.set(KEY_LAST_MODE, mode);
  }, [mode]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ModeToggle mode={mode} onChange={setMode} />
      <View style={styles.body}>
        {mode === 'passenger' ? <PassengerHomeScreen /> : <DriverHomeScreen />}
      </View>
    </SafeAreaView>
  );
}

interface ToggleProps {
  mode: Mode;
  onChange: (next: Mode) => void;
}

function ModeToggle({ mode, onChange }: ToggleProps) {
  const { t } = useT('ride');
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(mode === 'driver' ? 1 : 0);

  useEffect(() => {
    offset.value = withTiming(mode === 'driver' ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, offset]);

  // translateX precisa de pixels — calcula metade da largura interna do track.
  const halfTravel = Math.max(0, (trackWidth - 8) / 2);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * halfTravel }],
  }));

  return (
    <View style={styles.toggleWrap}>
      <View
        style={styles.toggleTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.toggleIndicator, indicatorStyle]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mode_passenger')}
          onPress={() => onChange('passenger')}
          style={styles.toggleHalf}
        >
          <Text style={[styles.toggleText, mode === 'passenger' && styles.toggleTextActive]}>
            {t('mode_passenger')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mode_driver')}
          onPress={() => onChange('driver')}
          style={styles.toggleHalf}
        >
          <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>
            {t('mode_driver')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  toggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: '50%',
    backgroundColor: COLORS.navy,
    borderRadius: 999,
  },
  toggleHalf: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    color: COLORS.text2,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  body: { flex: 1 },
});
