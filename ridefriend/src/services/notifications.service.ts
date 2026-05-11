// Ficheiro: src/services/notifications.service.ts | Função: Expo Push + dispatcher de notificações (P8)
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@services/supabase';

export type NotificationType =
  | 'driver_approaching'
  | 'ride_request'
  | 'ride_accepted'
  | 'sos_alert'
  | 'contact_waiting'
  | 'route_shared';

export interface NotificationPayload {
  type: NotificationType;
  [key: string]: unknown;
}

type Handler = (payload: NotificationPayload) => void;

const handlers = new Map<NotificationType, Set<Handler>>();
let receivedSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;

// Configuração padrão: foreground sempre mostra alerta + som.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Pede permissão e regista o Expo Push Token na tabela users.
 * Devolve o token, ou null em emulador / permissão negada.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      // Canal high-importance para SOS — som mesmo em silêncio (Android).
      await Notifications.setNotificationChannelAsync('sos', {
        name: 'SOS',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 250, 500],
        bypassDnd: true,
      });
      // Canal default para o resto.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RideFriend',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return null;

    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);
    if (error) {
      console.warn('Failed to persist expo_push_token:', error.message);
    }

    return token;
  } catch (error) {
    console.warn('registerForPushNotifications error:', error);
    return null;
  }
}

/**
 * Notificação local imediata — não passa pela Expo Push API.
 * Útil para feedback in-app (ex.: "rota partilhada com a rede").
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: NotificationPayload,
  channelId: 'default' | 'sos' = 'default',
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
    },
    trigger:
      Platform.OS === 'android' ? { channelId, seconds: 1 } as Notifications.NotificationTriggerInput : null,
  });
}

/**
 * Agendamento simples (segundos a partir de agora).
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerSeconds: number,
  data?: NotificationPayload,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: 'default' },
    trigger: { seconds: Math.max(1, triggerSeconds) } as Notifications.NotificationTriggerInput,
  });
}

/**
 * Regista um handler para um tipo de notificação. Devolve a função de cleanup.
 *
 * O dispatcher é deliberadamente "burro" — não faz navegação. Cada ecrã interessado
 * subscreve-se aos tipos relevantes e decide como reagir (ex.: PassengerHome subscreve
 * 'driver_approaching' para destacar o card; DriverHome subscreve 'ride_request' para
 * mostrar o bottom sheet de aceitar/recusar).
 */
export function subscribeToNotificationType(
  type: NotificationType,
  handler: Handler,
): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => {
    handlers.get(type)?.delete(handler);
  };
}

function dispatch(payload: NotificationPayload | null) {
  if (!payload || !payload.type) return;
  const set = handlers.get(payload.type);
  if (!set) return;
  for (const h of set) {
    try {
      h(payload);
    } catch (error) {
      console.warn('Notification handler error:', error);
    }
  }
}

/**
 * Liga as listeners do Expo Notifications ao dispatcher local.
 * Chamar uma vez (ex.: App.tsx) — idempotente.
 */
export function attachNotificationListeners(): void {
  if (receivedSubscription || responseSubscription) return;

  receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as unknown as NotificationPayload | null;
    dispatch(data);
  });
  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as unknown as NotificationPayload | null;
    dispatch(data);
  });
}

export function detachNotificationListeners(): void {
  receivedSubscription?.remove();
  responseSubscription?.remove();
  receivedSubscription = null;
  responseSubscription = null;
}

/**
 * Limpa o token na BD ao logout para impedir push após sair.
 */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('users').update({ expo_push_token: null }).eq('id', userId);
  } catch (error) {
    console.warn('clearPushToken error:', error);
  }
}
