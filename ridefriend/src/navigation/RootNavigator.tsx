// Ficheiro: src/navigation/RootNavigator.tsx | Função: AuthStack vs MainTabs com gate de mercado (P1)
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, initializeAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { COLORS, getTheme } from '@constants/theme';

// Auth Stack Screens
import PhoneInputScreen from '@screens/auth/PhoneInputScreen';
import OTPVerifyScreen from '@screens/auth/OTPVerifyScreen';
import OnboardingScreen from '@screens/auth/OnboardingScreen';
import MarketSelectScreen from '@screens/auth/MarketSelectScreen';

// Main Tab Screens — Início, Mapa, Rede, Histórico (Perfil acessível via avatar do AppHeader)
import HomeTabScreen from '@screens/home/HomeTabScreen';
import MapScreen from '@screens/map/MapScreen';
import NetworkScreen from '@screens/network/NetworkScreen';
import HistoryScreen from '@screens/history/HistoryScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';
import EmergencyContactScreen from '@screens/profile/EmergencyContactScreen';
import SettingsScreen from '@screens/settings/SettingsScreen';
import AdminScreen from '@screens/admin/AdminScreen';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(base: string): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ color, size, focused }) => {
    const name = (focused ? base : `${base}-outline`) as IoniconName;
    return <Ionicons name={name} size={size} color={color} />;
  };
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Auth Stack Navigator
 * Includes: Market Selection, Phone Input, OTP, Onboarding
 */
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="MarketSelect"
        component={MarketSelectScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="PhoneInput"
        component={PhoneInputScreen}
      />
      <Stack.Screen
        name="OTPVerify"
        component={OTPVerifyScreen}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
      />
    </Stack.Navigator>
  );
}

/**
 * Main Tabs Navigator
 */
function MainTabs() {
  const { config } = useMarketStore();
  const theme = getTheme(config?.theme.accentColor);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: COLORS.text2,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{ title: 'Início', tabBarIcon: tabIcon('home') }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Mapa', tabBarIcon: tabIcon('map') }}
      />
      <Tab.Screen
        name="Network"
        component={NetworkScreen}
        options={{ title: 'Rede', tabBarIcon: tabIcon('people') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Histórico', tabBarIcon: tabIcon('time') }}
      />
    </Tab.Navigator>
  );
}

/**
 * Root Navigator
 * Main entry point for navigation structure
 */
export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuthStore();
  const { isLoaded: marketLoaded, config } = useMarketStore();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize both auth and market stores
        await Promise.all([
          initializeAuthStore(),
          useMarketStore.getState().initialize(),
        ]);
      } catch (e) {
        console.warn('Error initializing app:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady || isLoading || !marketLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated && config ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

/**
 * MainStack — envolve as tabs e expõe screens modais (P8: EmergencyContact).
 */
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Perfil' }}
      />
      <Stack.Screen
        name="EmergencyContact"
        component={EmergencyContactScreen}
        options={{ headerShown: true, title: 'Contacto de emergência', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Definições' }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ headerShown: true, title: 'Painel Admin' }}
      />
    </Stack.Navigator>
  );
}

export default RootNavigator;
