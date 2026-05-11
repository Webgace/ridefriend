// Ficheiro: src/screens/map/MapScreen.tsx | Função: ecrã de mapa interactivo em tempo real (P7)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useMapData, MapMarkerData } from '@hooks/useMapData';
import { useMarketStore } from '@store/marketStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useRideRequest } from '@hooks/useRideRequest';
import MapMarker from '@components/maps/MapMarker';
import MapCallout from '@components/maps/MapCallout';

type Filter = 'all' | 'drivers';

const ZOOM_FACTOR = 0.5;
const MIN_DELTA = 0.002;
const MAX_DELTA = 1.5;

export default function MapScreen() {
  const { t } = useT('ride');
  const { config } = useMarketStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<MapMarkerData | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const data = useMapData({ filter });
  const { requestRide } = useRideRequest();

  const useGoogleProvider = config?.mapsProvider === 'google';

  // Centra o mapa na posição actual sempre que o utilizador clica em "Centrar".
  useEffect(() => {
    if (data.recenterRequest === 0) return;
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(data.region, 350);
  }, [data.recenterRequest, data.region]);

  // Centragem inicial quando o myLocation chega pela primeira vez.
  const didInitialCenter = useRef(false);
  useEffect(() => {
    if (didInitialCenter.current) return;
    if (!data.myLocation || !mapRef.current) return;
    didInitialCenter.current = true;
    mapRef.current.animateToRegion(data.region, 0);
  }, [data.myLocation, data.region]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!mapRef.current) return;
    mapRef.current
      .getCamera()
      .then((camera) => {
        // Em Android nativo, getCamera devolve `zoom`; em iOS, `altitude`. Suportamos ambos.
        if (typeof camera.zoom === 'number') {
          const next = camera.zoom + (direction === 'in' ? 1 : -1);
          mapRef.current?.animateCamera({ ...camera, zoom: next }, { duration: 200 });
          return;
        }
        if (typeof camera.altitude === 'number') {
          const factor = direction === 'in' ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
          mapRef.current?.animateCamera(
            { ...camera, altitude: camera.altitude * factor },
            { duration: 200 },
          );
        }
      })
      .catch(() => null);
  }, []);

  const handleMarkerPress = useCallback((m: MapMarkerData) => {
    if (m.type === 'me') return; // próprio marcador não abre callout
    setSelected(m);
  }, []);

  const handlePrimaryAction = useCallback(
    async (m: MapMarkerData) => {
      if (m.type === 'driver' && m.driver) {
        const rideId = await requestRide(m.driver.id);
        if (rideId) {
          showToast({ message: t('confirm_ride'), tone: 'success' });
          setSelected(null);
        } else {
          showToast({ message: t('ride_request_failed'), tone: 'error' });
        }
        return;
      }
      if (m.type === 'passenger') {
        // P8 trata do envio de oferta ao passageiro via push — aqui ficamos pelo feedback.
        showToast({ message: t('offer_ride'), tone: 'info' });
        setSelected(null);
      }
    },
    [requestRide, showToast, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={useGoogleProvider ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={data.region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        minZoomLevel={4}
        maxZoomLevel={19}
        loadingEnabled
        loadingBackgroundColor={COLORS.surface}
      >
        {!useGoogleProvider ? (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        ) : null}

        {data.myLocation ? (
          <Circle
            center={{ latitude: data.myLocation.lat, longitude: data.myLocation.lng }}
            radius={data.detectionRadiusM}
            strokeColor="rgba(217,119,6,0.4)"
            fillColor="rgba(217,119,6,0.08)"
            strokeWidth={1}
          />
        ) : null}

        {data.markers.map((m) => (
          <MapMarker key={m.id} data={m} onPress={handleMarkerPress} />
        ))}
      </MapView>

      <FilterPills filter={filter} onChange={setFilter} />
      <ZoomControls
        onRecenter={data.recenterMap}
        onZoomIn={() => handleZoom('in')}
        onZoomOut={() => handleZoom('out')}
      />
      <Legend />

      {!data.myLocation ? (
        <View style={styles.waiting} pointerEvents="none">
          <Text style={styles.waitingText}>{t('map_no_location')}</Text>
        </View>
      ) : null}

      {selected ? (
        <MapCallout
          marker={selected}
          onPrimaryAction={handlePrimaryAction}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

interface FilterPillsProps {
  filter: Filter;
  onChange: (next: Filter) => void;
}

function FilterPills({ filter, onChange }: FilterPillsProps) {
  const { t } = useT('ride');
  return (
    <View style={styles.filterRow}>
      <Pressable
        onPress={() => onChange('all')}
        style={[styles.pill, filter === 'all' && styles.pillActive]}
      >
        <Text style={[styles.pillText, filter === 'all' && styles.pillTextActive]}>
          {t('map_filter_all')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('drivers')}
        style={[styles.pill, filter === 'drivers' && styles.pillActive]}
      >
        <Text style={[styles.pillText, filter === 'drivers' && styles.pillTextActive]}>
          {t('map_filter_drivers')}
        </Text>
      </Pressable>
    </View>
  );
}

interface ZoomControlsProps {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function ZoomControls({ onRecenter, onZoomIn, onZoomOut }: ZoomControlsProps) {
  const { t } = useT('ride');
  return (
    <View style={styles.zoomCol}>
      <Pressable
        accessibilityLabel={t('map_recenter')}
        onPress={onRecenter}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Text style={styles.iconText}>◎</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={t('map_zoom_in')}
        onPress={onZoomIn}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Text style={styles.iconText}>+</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={t('map_zoom_out')}
        onPress={onZoomOut}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Text style={styles.iconText}>−</Text>
      </Pressable>
    </View>
  );
}

function Legend() {
  const { t } = useT('ride');
  const items: Array<{ color: string; label: string }> = [
    { color: COLORS.amber, label: t('map_legend_me') },
    { color: '#1D4ED8', label: t('map_legend_driver') },
    { color: '#7C3AED', label: t('map_legend_passenger') },
    { color: COLORS.text3, label: t('map_legend_stop') },
  ];
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: it.color }]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
      <Text style={styles.legendRadius}>{t('map_legend_radius')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },

  filterRow: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillActive: { backgroundColor: COLORS.navy },
  pillText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },
  pillTextActive: { color: COLORS.white },

  zoomCol: {
    position: 'absolute',
    right: 16,
    top: '40%',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: { fontFamily: FONTS.soraBold, fontSize: 20, color: COLORS.text },

  legend: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    padding: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.text },
  legendRadius: {
    marginTop: 4,
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    color: COLORS.text2,
  },

  waiting: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  waitingText: { color: COLORS.white, fontFamily: FONTS.bodySemi, fontSize: 12 },

  pressed: { opacity: 0.85 },
});
