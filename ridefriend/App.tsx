// Ficheiro: App.tsx | Função: ponto de entrada — providers + fontes + RootNavigator (build 20 — gate visível com timeout)
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts as useSora, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { COLORS } from '@constants/theme';
import { initI18n } from '@i18n/index';
import RootNavigator from '@navigation/RootNavigator';
import ToastHost from '@components/ui/Toast';
import ConfirmSheetHost from '@components/ui/ConfirmSheet';
import ErrorBoundary from '@components/ui/ErrorBoundary';
import {
  attachNotificationListeners,
  detachNotificationListeners,
  registerForPushNotifications,
} from '@services/notifications.service';
import { useAuthStore } from '@store/authStore';
import { useEmergencyContactStore } from '@store/emergencyContactStore';
import { useMarketStore } from '@store/marketStore';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [i18nReady, setI18nReady] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [fontsLoaded, fontError] = useSora({
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    // Inicializa i18n + marketStore em paralelo. Ambos lêem SecureStore (rápido).
    Promise.all([
      initI18n(),
      useMarketStore.getState().initialize(),
    ]).finally(() => setI18nReady(true));
    // Build 20: passa à frente após 4s se algo ficou pendurado — ver gate na UI.
    const t = setTimeout(() => setBypass(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Boot-time: liga listeners de push e hidrata o contacto de emergência (P8).
  useEffect(() => {
    attachNotificationListeners();
    useEmergencyContactStore.getState().hydrate();
    return () => {
      detachNotificationListeners();
    };
  }, []);

  // Regista o Expo Push Token sempre que o utilizador está autenticado (P8).
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    registerForPushNotifications(userId).catch(() => null);
  }, [isAuthenticated, userId]);

  // Font errors are non-fatal — RN falls back to system fonts. Only block on i18n.
  useEffect(() => {
    if (fontError) console.warn('Font load error (using system fallback):', fontError);
  }, [fontError]);

  const ready = (i18nReady && (fontsLoaded || !!fontError)) || bypass;
  if (!ready) {
    return (
      <View style={gateStyles.root}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
          <ToastHost />
          <ConfirmSheetHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const gateStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1F38', padding: 24 },
});
