// Ficheiro: src/screens/home/PassengerHomeScreen.tsx | Função: ecrã principal do passageiro (P5)
// Ref. mockup: layout "ECRÃ PRINCIPAL (Passageiro)" no RideFriend_Design_Reference.txt
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useLocation } from '@hooks/useLocation';
import { useNearbyContacts, useNearbyPassengersAtStop } from '@hooks/useNearbyContacts';
import { useRideRequest } from '@hooks/useRideRequest';
import { useWeather } from '@hooks/useWeather';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { useUiHostStore } from '@store/uiHostStore';
import { alertNetwork } from '@services/alerts.service';
import { NearbyDriver } from '@types/index';
import HeroLocationCard from '@components/home/HeroLocationCard';
import AlertButton from '@components/home/AlertButton';
import DriverCard from '@components/home/DriverCard';
import RideConfirmBottomSheet from '@components/home/RideConfirmBottomSheet';
import PassengerAtStopCard from '@components/home/PassengerAtStopCard';
import SOSButton from '@components/ui/SOSButton';
import SOSConfirmSheet from '@components/sos/SOSConfirmSheet';

const NEARBY_RADIUS_KM = 5;

export default function PassengerHomeScreen() {
  const { t } = useT('ride');
  const navigation = useNavigation<any>();
  const { config } = useMarketStore();
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const {
    myLocation,
    nearestStop,
    locationLabel,
    startPassengerMode,
    isTracking,
    getCurrentLocationOnce,
  } = useLocation();
  const myCoords = useMemo(
    () => (myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null),
    [myLocation],
  );
  const { nearbyDrivers, isLoading, refresh } = useNearbyContacts(myCoords, NEARBY_RADIUS_KM);
  const { nearbyPassengers } = useNearbyPassengersAtStop(myCoords, 100);
  const { requestRide, status, error } = useRideRequest();
  const { temperatureC } = useWeather(myCoords);

  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [submittingRide, setSubmittingRide] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | undefined>(undefined);

  // Conta há quanto tempo o utilizador está na paragem actual. Reinicia ao mudar de paragem.
  const stopName = locationLabel;
  const arrivalAtStopRef = useRef<number | null>(null);
  const lastStopNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (stopName !== lastStopNameRef.current) {
      lastStopNameRef.current = stopName;
      arrivalAtStopRef.current = stopName ? Date.now() : null;
    }
    if (!stopName) {
      setWaitingFor(undefined);
      return;
    }
    const tick = () => {
      const since = arrivalAtStopRef.current;
      if (!since) {
        setWaitingFor(undefined);
        return;
      }
      const mins = Math.max(0, Math.floor((Date.now() - since) / 60_000));
      setWaitingFor(`${mins} min`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [stopName]);

  // Inicia modo passageiro automaticamente.
  useEffect(() => {
    if (!isTracking) {
      startPassengerMode().catch(() => null);
    }
    if (!myLocation) {
      getCurrentLocationOnce().catch(() => null);
    }
  }, [isTracking, myLocation, startPassengerMode, getCurrentLocationOnce]);

  // Mostra erros do ride request via Toast (P0 v2.1: nunca Alert.alert).
  useEffect(() => {
    if (error) {
      showToast({ message: t('ride_request_failed'), tone: 'error' });
    }
  }, [error, showToast, t]);

  const handleAlertNetwork = useCallback(async () => {
    if (!user || !config) return;
    // Alvos: contactos do mesmo "stop" (drivers + passageiros). Caso a paragem ainda
    // não esteja detectada, alerta só os motoristas no raio.
    const targetIds = Array.from(
      new Set([...nearbyDrivers.map((d) => d.id), ...nearbyPassengers.map((p) => p.id)]),
    );
    try {
      const count = await alertNetwork({
        userId: user.id,
        userName: user.name,
        marketCode: config.code,
        stopName: nearestStop?.name ?? null,
        contactIds: targetIds,
      });
      // O feedback "Rede Alertada! · X notificados" é gerido pelo próprio AlertButton.
      void count;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('alert_failed');
      showToast({ message, tone: 'error' });
      throw err;
    }
  }, [user, config, nearbyDrivers, nearbyPassengers, nearestStop, t, showToast]);

  const handleRequest = (driver: NearbyDriver) => {
    setSelectedDriver(driver);
  };

  const handleConfirm = async (driver: NearbyDriver) => {
    setSubmittingRide(true);
    try {
      const rideId = await requestRide(driver.id);
      if (rideId) {
        setSelectedDriver(null);
      }
    } finally {
      setSubmittingRide(false);
    }
  };

  const handleSOS = () => {
    setSosOpen(true);
  };

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('no_drivers')}</Text>
      </View>
    );
  }, [isLoading, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={nearbyDrivers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={COLORS.navy}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <HeroLocationCard
              stopName={locationLabel}
              waitingFor={waitingFor}
              nearbyCount={nearbyDrivers.length}
              temperatureC={temperatureC}
            />
            <AlertButton
              notifiedCount={nearbyDrivers.length}
              onPress={handleAlertNetwork}
              disabled={status !== 'idle' && status !== 'waiting'}
              style={styles.alert}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('nearby_drivers')}</Text>
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>{nearbyDrivers.length}</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => <DriverCard driver={item} onRequest={handleRequest} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          nearbyPassengers.length > 0 ? (
            <View style={styles.footerSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('passengers_at_stop')}</Text>
                <View style={styles.counterPill}>
                  <Text style={styles.counterText}>{nearbyPassengers.length}</Text>
                </View>
              </View>
              {nearbyPassengers.map((p) => (
                <PassengerAtStopCard key={p.id} passenger={p} />
              ))}
            </View>
          ) : null
        }
      />

      <SOSButton onLongPress={handleSOS} />

      <SOSConfirmSheet
        visible={sosOpen}
        myLocation={myCoords}
        onClose={() => setSosOpen(false)}
        onConfigureContact={() => navigation.navigate('EmergencyContact')}
      />

      <RideConfirmBottomSheet
        visible={selectedDriver !== null}
        driver={selectedDriver}
        stopName={locationLabel}
        destinationArea={undefined}
        onCancel={() => setSelectedDriver(null)}
        onConfirm={handleConfirm}
        isSubmitting={submittingRide}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  alert: {
    marginTop: 4,
  },
  counterPill: {
    backgroundColor: COLORS.navy,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  counterText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
  },
  footerSection: {
    gap: 8,
    marginTop: 18,
  },
  header: {
    gap: 14,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  safe: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 17,
  },
  separator: {
    height: 10,
  },
});
