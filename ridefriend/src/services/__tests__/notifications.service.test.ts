// Ficheiro: src/services/__tests__/notifications.service.test.ts | Função: testes do registo de push + dispatcher (P11)

jest.mock('expo-notifications', () => {
  const handlers: { received?: (n: unknown) => void; response?: (r: unknown) => void } = {};
  const setNotificationHandler = jest.fn();
  return {
    setNotificationHandler,
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[abc]' })),
    scheduleNotificationAsync: jest.fn(async () => 'scheduled-id'),
    addNotificationReceivedListener: jest.fn((cb: (n: unknown) => void) => {
      handlers.received = cb;
      return { remove: jest.fn() };
    }),
    addNotificationResponseReceivedListener: jest.fn((cb: (r: unknown) => void) => {
      handlers.response = cb;
      return { remove: jest.fn() };
    }),
    AndroidImportance: { MAX: 5, HIGH: 4 },
    __handlers: handlers,
  };
});

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } }, easConfig: undefined },
}));

jest.mock('@services/supabase', () => {
  const builder = {
    update: jest.fn(() => builder),
    eq: jest.fn(() => Promise.resolve({ error: null })),
  };
  return {
    supabase: { from: jest.fn(() => builder) },
    __builder: builder,
  };
});

import * as Notifications from 'expo-notifications';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const supabaseModule = require('@services/supabase');
const builder = supabaseModule.__builder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expoNotificationsAny = Notifications as any;

function loadService() {
  let svc: typeof import('../notifications.service') | null = null;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    svc = require('../notifications.service');
  });
  if (!svc) throw new Error('Failed to load notifications.service');
  return svc;
}

beforeEach(() => {
  jest.clearAllMocks();
  expoNotificationsAny.__handlers.received = undefined;
  expoNotificationsAny.__handlers.response = undefined;
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  builder.eq.mockResolvedValue({ error: null });
});

describe('registerForPushNotifications', () => {
  it('cria canais Android e devolve o token', async () => {
    const svc = loadService();
    const token = await svc.registerForPushNotifications('user-1');

    expect(token).toBe('ExponentPushToken[abc]');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'sos',
      expect.objectContaining({ importance: 5, bypassDnd: true }),
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ importance: 4 }),
    );
  });

  it('persiste o token na tabela users', async () => {
    const svc = loadService();
    await svc.registerForPushNotifications('user-1');

    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('users');
    expect(builder.update).toHaveBeenCalledWith({ expo_push_token: 'ExponentPushToken[abc]' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('pede permissão se ainda não foi concedida', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    const svc = loadService();
    await svc.registerForPushNotifications('user-1');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('devolve null quando o utilizador rejeita a permissão', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const svc = loadService();
    expect(await svc.registerForPushNotifications('user-1')).toBeNull();
  });
});

describe('sendLocalNotification', () => {
  it('agenda uma notificação local imediata', async () => {
    const svc = loadService();
    await svc.sendLocalNotification('Olá', 'corpo', { type: 'route_shared' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(arg.content).toMatchObject({
      title: 'Olá',
      body: 'corpo',
      data: { type: 'route_shared' },
    });
  });
});

describe('subscribeToNotificationType + dispatcher', () => {
  it('encaminha apenas para os handlers do tipo recebido', async () => {
    const svc = loadService();
    svc.attachNotificationListeners();
    const sosHandler = jest.fn();
    const rideHandler = jest.fn();
    svc.subscribeToNotificationType('sos_alert', sosHandler);
    svc.subscribeToNotificationType('ride_request', rideHandler);

    // Dispara uma notificação recebida do tipo sos_alert.
    expoNotificationsAny.__handlers.received?.({
      request: { content: { data: { type: 'sos_alert', lat: -8.8, lng: 13.2 } } },
    });

    expect(sosHandler).toHaveBeenCalledTimes(1);
    expect(rideHandler).not.toHaveBeenCalled();
  });

  it('o cleanup remove o handler', async () => {
    const svc = loadService();
    svc.attachNotificationListeners();
    const handler = jest.fn();
    const unsubscribe = svc.subscribeToNotificationType('driver_approaching', handler);
    unsubscribe();

    expoNotificationsAny.__handlers.received?.({
      request: { content: { data: { type: 'driver_approaching' } } },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('attachNotificationListeners é idempotente', async () => {
    const svc = loadService();
    svc.attachNotificationListeners();
    svc.attachNotificationListeners();
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1);
  });
});

describe('clearPushToken', () => {
  it('limpa o token no Supabase', async () => {
    const svc = loadService();
    await svc.clearPushToken('user-1');
    expect(builder.update).toHaveBeenCalledWith({ expo_push_token: null });
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
