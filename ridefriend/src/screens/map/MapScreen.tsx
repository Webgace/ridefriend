// Ficheiro: src/screens/map/MapScreen.tsx | Função: ecrã do separador "Mapa" com MapLibre native + lista em tempo real
// Nota: @maplibre/maplibre-react-native é lazy-required para que a app funcione antes de uma reconstrução EAS;
// se o módulo nativo não estiver presente, mostra um placeholder com instrução de rebuild.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useLocation } from '@hooks/useLocation';
import { useMapData } from '@hooks/useMapData';
import { circlePolygon } from '@utils/geoCircle';
import AppHeader from '@components/ui/AppHeader';
import InviteFriendSheet from '@components/ui/InviteFriendSheet';
import AvatarBadge from '@components/ui/AvatarBadge';
import ETABadge from '@components/ui/ETABadge';
import SOSButton from '@components/ui/SOSButton';
import SOSConfirmSheet from '@components/sos/SOSConfirmSheet';

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
};

const INITIAL_ZOOM = 14;
const MIN_ZOOM = 3;

export default function MapScreen() {
  const { t } = useT('ride');
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const {
    region,
    detectionRadiusM,
    myLocation,
    nearbyDrivers,
    recenterRequest,
    recenterMap,
    refresh,
  } = useMapData();
  const {
    isTracking,
    startPassengerMode,
    stopTracking: stopLocationTracking,
    getCurrentLocationOnce,
  } = useLocation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  // Tenta carregar o módulo nativo do MapLibre. Se falhar, render do placeholder.
  const MapLibre = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@maplibre/maplibre-react-native');
      return (mod.default ?? mod) as any;
    } catch {
      return null;
    }
  }, []);

  // Pede a primeira localização ao montar.
  useEffect(() => {
    if (!myLocation) {
      getCurrentLocationOnce().catch(() => null);
    }
  }, [myLocation, getCurrentLocationOnce]);

  const handleToggleSharing = useCallback(async () => {
    if (isTracking) {
      await stopLocationTracking();
      showToast({ message: 'Partilha de localização parada.', tone: 'info' });
    } else {
      const ok = await startPassengerMode();
      if (ok) showToast({ message: 'A partilhar localização.', tone: 'success' });
    }
  }, [isTracking, startPassengerMode, stopLocationTracking, showToast]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - 1));
  }, []);

  const handleRecenter = useCallback(() => {
    setZoom(INITIAL_ZOOM);
    recenterMap();
  }, [recenterMap]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        userInitial={user?.name?.[0]}
        userAvatarUrl={user?.avatar ?? null}
        onBellPress={() => showToast({ message: 'Sem novas notificações.', tone: 'info' })}
        onQrPress={() => setInviteOpen(true)}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapCard}>
          {MapLibre ? (
            <MapCanvas
              MapLibre={MapLibre}
              region={region}
              zoom={zoom}
              radiusM={detectionRadiusM}
              myLocation={myLocation}
              drivers={nearbyDrivers}
              recenterRequest={recenterRequest}
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <MaterialCommunityIcons name="map-marker-radius" size={48} color={COLORS.gray400} />
              <Text style={styles.placeholderTitle}>Mapa indisponível</Text>
              <Text style={styles.placeholderBody}>
                Reconstrói a app (EAS) com{' '}
                <Text style={styles.code}>@maplibre/maplibre-react-native</Text> para activar o
                mapa.
              </Text>
            </View>
          )}

          {/* Pill "A partilhar" (top-left) */}
          <Pressable
            onPress={handleToggleSharing}
            accessibilityRole="button"
            accessibilityLabel={isTracking ? 'Parar partilha' : 'Partilhar localização'}
            style={[styles.sharingPill, isTracking ? styles.sharingPillOn : styles.sharingPillOff]}
          >
            <Ionicons
              name={isTracking ? 'radio' : 'radio-outline'}
              size={14}
              color={COLORS.white}
            />
            <Text style={styles.sharingPillText}>
              {isTracking ? 'A partilhar' : 'Partilhar'}
            </Text>
          </Pressable>

          {/* Zoom out (top-left, abaixo da pill) */}
          <Pressable
            onPress={handleZoomOut}
            accessibilityRole="button"
            accessibilityLabel="Diminuir zoom"
            style={styles.zoomBtn}
          >
            <Ionicons name="remove" size={20} color={COLORS.text} />
          </Pressable>

          {/* Controlos (top-right) */}
          <View style={styles.rightControls}>
            <Pressable
              onPress={handleRecenter}
              accessibilityRole="button"
              accessibilityLabel="Centrar no meu local"
              style={styles.iconBtn}
            >
              <Ionicons name="navigate" size={18} color={COLORS.navy} />
            </Pressable>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel="Actualizar"
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons name="radar" size={18} color={COLORS.navy} />
            </Pressable>
          </View>

          {/* Legenda (bottom-left) */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.navy }]} />
              <Text style={styles.legendText}>Motorista</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.amber }]} />
              <Text style={styles.legendText}>Tu</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="radio-outline" size={16} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Proximidade em tempo real</Text>
        </View>

        {nearbyDrivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sem motoristas a partilhar localização agora.</Text>
          </View>
        ) : (
          <View style={styles.driverList}>
            {nearbyDrivers.map((d) => (
              <View key={d.id} style={styles.driverRow}>
                <AvatarBadge name={d.name} size={40} status="online" />
                <View style={styles.driverBody}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={styles.driverMeta} numberOfLines={1}>
                    {t('distance_km', { n: d.distance.toFixed(1) })}
                    {d.vehicle?.plate ? ` · ${d.vehicle.plate}` : ''}
                  </Text>
                </View>
                <ETABadge minutes={d.eta} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <SOSButton onLongPress={() => setSosOpen(true)} />

      <SOSConfirmSheet
        visible={sosOpen}
        myLocation={myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null}
        onClose={() => setSosOpen(false)}
        onConfigureContact={() => navigation.navigate('EmergencyContact')}
      />

      <InviteFriendSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </SafeAreaView>
  );
}

interface CanvasProps {
  MapLibre: any;
  region: { latitude: number; longitude: number };
  zoom: number;
  radiusM: number;
  myLocation: { lat: number; lng: number } | null;
  drivers: Array<{
    id: string;
    location: { latitude: number; longitude: number };
  }>;
  recenterRequest: number;
}

function MapCanvas({
  MapLibre,
  region,
  zoom,
  radiusM,
  myLocation,
  drivers,
  recenterRequest,
}: CanvasProps) {
  const cameraRef = useRef<any>(null);
  const centerLng = myLocation?.lng ?? region.longitude;
  const centerLat = myLocation?.lat ?? region.latitude;

  // Quando o utilizador toca em recenter, anima a câmara para a posição actual.
  useEffect(() => {
    if (recenterRequest === 0) return;
    if (!cameraRef.current) return;
    cameraRef.current.setCamera?.({
      centerCoordinate: [centerLng, centerLat],
      zoomLevel: INITIAL_ZOOM,
      animationMode: 'flyTo',
      animationDuration: 600,
    });
  }, [recenterRequest, centerLng, centerLat]);

  const radiusFeature = useMemo(
    () => (myLocation ? circlePolygon(myLocation.lat, myLocation.lng, radiusM) : null),
    [myLocation, radiusM],
  );

  const { MapView, Camera, ShapeSource, LineLayer, MarkerView } = MapLibre;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      mapStyle={OSM_RASTER_STYLE}
      logoEnabled={false}
      attributionEnabled
      pitchEnabled={false}
      rotateEnabled={false}
      compassEnabled={false}
    >
      <Camera
        ref={cameraRef}
        centerCoordinate={[centerLng, centerLat]}
        zoomLevel={zoom}
        animationMode="easeTo"
        animationDuration={300}
      />

      {radiusFeature ? (
        <ShapeSource id="detectionRadius" shape={radiusFeature}>
          <LineLayer
            id="detectionRadiusLine"
            style={{
              lineColor: COLORS.navy,
              lineOpacity: 0.45,
              lineWidth: 1.5,
              lineDasharray: [3, 3],
            }}
          />
        </ShapeSource>
      ) : null}

      {myLocation ? (
        <MarkerView id="me" coordinate={[myLocation.lng, myLocation.lat]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.selfMarker} />
        </MarkerView>
      ) : null}

      {drivers.map((d) => (
        <MarkerView
          key={d.id}
          id={d.id}
          coordinate={[d.location.longitude, d.location.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.driverMarker} />
        </MarkerView>
      ))}

      {!myLocation ? (
        <Camera centerCoordinate={[region.longitude, region.latitude]} zoomLevel={INITIAL_ZOOM} />
      ) : null}
    </MapView>
  );
}

const MAP_HEIGHT = 360;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { padding: 16, paddingBottom: 120, gap: 14 },

  mapCard: {
    height: MAP_HEIGHT,
    backgroundColor: COLORS.gray100,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  placeholderTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 18,
  },
  code: {
    fontFamily: FONTS.bodySemi,
    color: COLORS.navy,
  },

  sharingPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  sharingPillOn: { backgroundColor: COLORS.green },
  sharingPillOff: { backgroundColor: COLORS.gray400 },
  sharingPillText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },

  zoomBtn: {
    position: 'absolute',
    top: 54,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  rightControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  legend: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.text },

  selfMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.amber,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  driverMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.navy,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.text,
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text2,
    textAlign: 'center',
  },

  driverList: {
    gap: 10,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverBody: { flex: 1, gap: 2 },
  driverName: { fontFamily: FONTS.soraBold, fontSize: 14, color: COLORS.text },
  driverMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },
});
