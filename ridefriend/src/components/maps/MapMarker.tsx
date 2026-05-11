// Ficheiro: src/components/maps/MapMarker.tsx | Função: marcador animado para react-native-maps (P7)
// Ref. mockup: marcadores "me" / "driver" / "passenger" / "stop" no RideFriend_Design_Reference.txt
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Marker, MarkerAnimated, AnimatedRegion } from 'react-native-maps';
import { COLORS, FONTS } from '@constants/theme';
import type { MapMarkerData, MarkerType } from '@hooks/useMapData';

interface Props {
  data: MapMarkerData;
  /** Devolve o marker premido — o ecrã abre o callout/sheet conforme tipo. */
  onPress?: (data: MapMarkerData) => void;
}

const COLOR_BY_TYPE: Record<MarkerType, { bg: string; fg: string; ring: string }> = {
  me: { bg: COLORS.amber, fg: COLORS.navy, ring: COLORS.amber },
  driver: { bg: '#1D4ED8', fg: COLORS.white, ring: '#1D4ED8' },
  passenger: { bg: '#7C3AED', fg: COLORS.white, ring: '#7C3AED' },
  stop: { bg: COLORS.text3, fg: COLORS.white, ring: COLORS.text3 },
};

const PULSE_TYPES: ReadonlySet<MarkerType> = new Set(['me', 'driver']);
const PULSE_DURATION_MS = 1400;
const MOVE_DURATION_MS = 2000;

export default function MapMarker({ data, onPress }: Props) {
  const palette = COLOR_BY_TYPE[data.type];
  const initial = (data.name?.trim()?.[0] ?? '?').toUpperCase();
  const showPulse = PULSE_TYPES.has(data.type) && !(data.type === 'driver' && (data.eta ?? 99) > 8);

  // Anima a transição de posição de drivers/passengers (interpolação 2s).
  const useAnimatedCoord = data.type === 'driver' || data.type === 'passenger';
  const animatedCoord = useMemo(() => {
    if (!useAnimatedCoord) return null;
    return new AnimatedRegion({
      latitude: data.prevLat ?? data.lat,
      longitude: data.prevLng ?? data.lng,
      latitudeDelta: 0,
      longitudeDelta: 0,
    });
  }, [data.id, useAnimatedCoord]);

  useEffect(() => {
    if (!animatedCoord) return;
    animatedCoord
      .timing({
        latitude: data.lat,
        longitude: data.lng,
        duration: MOVE_DURATION_MS,
        useNativeDriver: false,
        // O AnimatedRegion exige todos os campos de Region.
        latitudeDelta: 0,
        longitudeDelta: 0,
      })
      .start();
  }, [animatedCoord, data.lat, data.lng]);

  return useAnimatedCoord && animatedCoord ? (
    <MarkerAnimated
      coordinate={animatedCoord as unknown as { latitude: number; longitude: number }}
      onPress={() => onPress?.(data)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <PinView palette={palette} initial={initial} eta={data.eta} pulse={showPulse} />
    </MarkerAnimated>
  ) : (
    <Marker
      coordinate={{ latitude: data.lat, longitude: data.lng }}
      onPress={() => onPress?.(data)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <PinView palette={palette} initial={initial} eta={data.eta} pulse={showPulse} />
    </Marker>
  );
}

interface PinViewProps {
  palette: { bg: string; fg: string; ring: string };
  initial: string;
  eta?: number;
  pulse: boolean;
}

function PinView({ palette, initial, eta, pulse }: PinViewProps) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.55);

  useEffect(() => {
    if (!pulse) {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = 1;
      ringOpacity.value = 0;
      return;
    }
    ringScale.value = withRepeat(
      withTiming(1.8, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withTiming(0, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
  }, [pulse, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      {pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { backgroundColor: palette.ring }, ringStyle]}
        />
      ) : null}
      <View style={[styles.pin, { backgroundColor: palette.bg }]}>
        <Text style={[styles.initial, { color: palette.fg }]}>{initial}</Text>
      </View>
      {typeof eta === 'number' ? (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>{eta <= 0 ? '·' : `${eta}m`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const PIN_SIZE = 36;

const styles = StyleSheet.create({
  wrap: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
  },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  initial: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  etaPill: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  etaText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 9,
    color: COLORS.text,
  },
});
