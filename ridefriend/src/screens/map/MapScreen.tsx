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
    nearbyPassengers,
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

  // Pede a primeira localização e arranca o tracking automaticamente — sem isto, o ponto
  // do utilizador no mapa é fixado à primeira leitura e não se move com ele.
  useEffect(() => {
    if (!myLocation) {
      getCurrentLocationOnce().catch(() => null);
    }
    if (!isTracking) {
      startPassengerMode().catch(() => null);
    }
  }, [myLocation, isTracking, getCurrentLocationOnce, startPassengerMode]);

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
              passengers={nearbyPassengers}
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
              <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
              <Text style={styles.legendText}>Passageiro</Text>
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

interface CanvasMarker {
  id: string;
  location: { latitude: number; longitude: number };
}

interface CanvasProps {
  MapLibre: any;
  region: { latitude: number; longitude: number };
  zoom: number;
  radiusM: number;
  myLocation: { lat: number; lng: number } | null;
  drivers: CanvasMarker[];
  passengers: CanvasMarker[];
  recenterRequest: number;
}

function MapCanvas({
  MapLibre,
  region,
  zoom,
  radiusM,
  myLocation,
  drivers,
  passengers,
  recenterRequest,
}: CanvasProps) {
  const cameraRef = useRef<any>(null);
  const centerLng = myLocation?.lng ?? region.longitude;
  const centerLat = myLocation?.lat ?? region.latitude;

  // Quando o utilizador toca em recenter, anima a câmara para a posição actual.
  useEffect(() => {
    if (recenterRequest === 0) return;
    if (!cameraRef.current) return;
    cameraRef.current.flyTo?.({
      center: [centerLng, centerLat],
      zoom: INITIAL_ZOOM,
      duration: 600,
    });
  }, [recenterRequest, centerLng, centerLat]);

  const radiusFeature = useMemo(
    () => (myLocation ? circlePolygon(myLocation.lat, myLocation.lng, radiusM) : null),
    [myLocation, radiusM],
  );

  const { Map, Camera, GeoJSONSource, Layer, Marker } = MapLibre;

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={OSM_RASTER_STYLE}
      logo={false}
      attribution
      touchPitch={false}
      touchRotate={false}
      compass={false}
    >
      <Camera
        ref={cameraRef}
        center={[centerLng, centerLat]}
        zoom={zoom}
        easing="ease"
        duration={300}
      />

      {radiusFeature ? (
        <GeoJSONSource id="detectionRadius" data={radiusFeature}>
          <Layer
            id="detectionRadiusLine"
            type="line"
            paint={{
              'line-color': COLORS.navy,
              'line-opacity': 0.45,
              'line-width': 1.5,
              'line-dasharray': [3, 3],
            }}
          />
        </GeoJSONSource>
      ) : null}

      {myLocation ? (
        <Marker id="me" lngLat={[myLocation.lng, myLocation.lat]} anchor="center">
          <View style={styles.selfMarker} />
        </Marker>
      ) : null}

      {drivers.map((d) => (
        <Marker
          key={d.id}
          id={d.id}
          lngLat={[d.location.longitude, d.location.latitude]}
          anchor="center"
        >
          <View style={styles.driverMarker} />
        </Marker>
      ))}

      {passengers.map((p) => (
        <Marker
          key={p.id}
          id={`passenger:${p.id}`}
          lngLat={[p.location.longitude, p.location.latitude]}
          anchor="center"
        >
          <View style={styles.passengerMarker} />
        </Marker>
      ))}
    </Map>
  );
}

const MAP_HEIGHT = 360;

const styles = StyleSheet.create({
  code: {
    color: COLORS.navy,
    fontFamily: FONTS.bodySemi,
  },
  driverBody: { flex: 1, gap: 2 },
  driverList: {
    gap: 10,
  },

  driverMarker: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.white,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  driverMeta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  driverName: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  driverRow: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 22,
  },

  emptyText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    textAlign: 'center',
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    elevation: 2,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: 36,
  },
  legend: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 999,
    bottom: 14,
    elevation: 2,
    flexDirection: 'row',
    gap: 10,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  legendDot: { borderRadius: 4, height: 8, width: 8 },

  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },

  legendText: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 11 },
  mapCard: {
    backgroundColor: COLORS.gray100,
    borderRadius: 22,
    elevation: 3,
    height: MAP_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  passengerMarker: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  placeholderBody: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  placeholderTitle: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 16,
  },

  rightControls: {
    gap: 8,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  safe: { backgroundColor: COLORS.white, flex: 1 },
  scroll: { backgroundColor: COLORS.surface, flex: 1 },

  scrollContent: { gap: 14, padding: 16, paddingBottom: 120 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 2,
  },

  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 15,
  },
  selfMarker: {
    backgroundColor: COLORS.amber,
    borderColor: COLORS.white,
    borderRadius: 9,
    borderWidth: 3,
    height: 18,
    width: 18,
  },

  sharingPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
    top: 12,
  },
  sharingPillOff: { backgroundColor: COLORS.gray400 },
  sharingPillOn: { backgroundColor: COLORS.green },
  sharingPillText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },
  zoomBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    elevation: 2,
    height: 32,
    justifyContent: 'center',
    left: 12,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    top: 54,
    width: 32,
  },
});
