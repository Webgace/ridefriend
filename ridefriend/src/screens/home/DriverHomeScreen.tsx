// Ficheiro: src/screens/home/DriverHomeScreen.tsx | Função: ecrã principal do motorista (P6)
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useLocation } from '@hooks/useLocation';
import { useDriverMode } from '@hooks/useDriverMode';
import { useUiHostStore } from '@store/uiHostStore';
import { GeoResult } from '@types/index';
import DriverStatusCard from '@components/driver/DriverStatusCard';
import RouteInput from '@components/driver/RouteInput';
import PassengerOnRouteCard from '@components/driver/PassengerOnRouteCard';
import PendingRequestSheet from '@components/driver/PendingRequestSheet';
import SOSButton from '@components/ui/SOSButton';
import SOSConfirmSheet from '@components/sos/SOSConfirmSheet';

export default function DriverHomeScreen() {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');
  const navigation = useNavigation<any>();
  const showToast = useUiHostStore((s) => s.showToast);
  const showConfirm = useUiHostStore((s) => s.showConfirm);
  const { myLocation, nearestStop, getCurrentLocationOnce } = useLocation();
  const driver = useDriverMode();
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const myCoords = myLocation
    ? { lat: myLocation.lat, lng: myLocation.lng }
    : null;

  // Mantém a localização fresca ao entrar no ecrã (mesmo sem driver mode activo).
  useEffect(() => {
    if (!myLocation) {
      getCurrentLocationOnce().catch(() => null);
    }
  }, [myLocation, getCurrentLocationOnce]);

  // Erros do hook → toast.
  useEffect(() => {
    if (driver.error) {
      showToast({ message: driver.error, tone: 'error' });
    }
  }, [driver.error, showToast]);

  const handleToggleAvailability = useCallback(
    async (next: boolean) => {
      if (next) {
        await driver.activateDriverMode();
      } else {
        showConfirm({
          title: t('mode_driver'),
          message: t('driver_status_inactive'),
          confirmLabel: tCommon('confirm'),
          cancelLabel: tCommon('cancel'),
          onConfirm: () => driver.deactivateDriverMode(),
        });
      }
    },
    [driver, showConfirm, t, tCommon],
  );

  const handleSelectDestination = useCallback(
    (geo: GeoResult) => {
      driver.setRoute(geo);
      setRouteModalOpen(false);
    },
    [driver],
  );

  const handleShareRoute = useCallback(async () => {
    if (!driver.currentRoute) {
      showToast({ message: t('driver_set_route_first'), tone: 'info' });
      return;
    }
    const count = await driver.shareRouteWithNetwork();
    showToast({
      message: t('driver_share_route_sent', { count }),
      tone: count > 0 ? 'success' : 'info',
    });
  }, [driver, showToast, t]);

  const handleAcceptPending = useCallback(async () => {
    const ok = await driver.acceptRideRequest();
    if (ok) {
      showToast({ message: t('driver_request_accept'), tone: 'success' });
    }
  }, [driver, showToast, t]);

  const handleDeclinePending = useCallback(async () => {
    await driver.declineRideRequest();
  }, [driver]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={driver.nearbyPassengers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={driver.isLoadingPassengers}
            onRefresh={driver.refreshPassengers}
            tintColor={COLORS.navy}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <DriverStatusCard
              isActive={driver.isActive}
              onToggle={handleToggleAvailability}
              currentRoute={driver.currentRoute}
              onClearRoute={driver.clearRoute}
              onOpenRouteInput={() => setRouteModalOpen(true)}
            />
            <Pressable
              accessibilityLabel={t('driver_share_route_btn')}
              onPress={handleShareRoute}
              style={({ pressed }) => [
                styles.shareBtn,
                pressed && styles.pressed,
                !driver.currentRoute && styles.shareBtnDisabled,
              ]}
              disabled={!driver.currentRoute}
            >
              <Text style={styles.shareBtnText}>{t('driver_share_route_btn')}</Text>
            </Pressable>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('driver_passengers_on_route')}</Text>
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>{driver.nearbyPassengers.length}</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PassengerOnRouteCard
            passenger={item}
            currentRoute={driver.currentRoute}
            onOffer={() => showToast({ message: t('driver_offer_ride'), tone: 'info' })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          driver.isLoadingPassengers ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {driver.currentRoute
                  ? t('driver_no_passengers_on_route')
                  : t('driver_set_route_first')}
              </Text>
              {nearestStop?.name ? (
                <Text style={styles.emptyHint}>{nearestStop.name}</Text>
              ) : null}
            </View>
          )
        }
      />

      {driver.pendingRequest ? (
        <PendingRequestSheet
          name={driver.pendingRequest.passengerName}
          area={driver.currentRoute?.destinationName ?? t('driver_route_placeholder')}
          expiresAt={driver.pendingRequest.expiresAt}
          onAccept={handleAcceptPending}
          onDecline={handleDeclinePending}
        />
      ) : null}

      <RouteInput
        visible={routeModalOpen}
        nearLat={myLocation?.lat ?? null}
        nearLng={myLocation?.lng ?? null}
        recents={driver.recentDestinations}
        onSelect={handleSelectDestination}
        onClose={() => setRouteModalOpen(false)}
      />

      <SOSButton onLongPress={() => setSosOpen(true)} />

      <SOSConfirmSheet
        visible={sosOpen}
        myLocation={myCoords}
        rideId={driver.pendingRequest?.rideId ?? null}
        onClose={() => setSosOpen(false)}
        onConfigureContact={() => navigation.navigate('EmergencyContact')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  header: { gap: 14, paddingTop: 12 },
  shareBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnDisabled: { backgroundColor: COLORS.gray400 },
  shareBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: { fontFamily: FONTS.soraBold, fontSize: 17, color: COLORS.text },
  counterPill: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  counterText: { color: COLORS.white, fontFamily: FONTS.bodySemi, fontSize: 11 },
  separator: { height: 10 },
  empty: { paddingVertical: 32, alignItems: 'center', gap: 4 },
  emptyText: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 14, textAlign: 'center' },
  emptyHint: { color: COLORS.text3, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  pressed: { opacity: 0.85 },
});
