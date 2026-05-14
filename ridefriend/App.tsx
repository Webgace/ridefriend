// Ficheiro: App.tsx | Função: ponto de entrada — providers + fontes + RootNavigator
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  const [fontsLoaded] = useSora({
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
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

  if (!i18nReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.navy} />
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
