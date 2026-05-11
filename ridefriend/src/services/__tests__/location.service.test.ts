// Ficheiro: src/services/__tests__/location.service.test.ts | Função: testes de permissões/upsert/tracking (P11)
//
// Mocks expo-location + Supabase. Cada teste cria um expo-location fresh via jest.isolateModules
// para resetar o estado interno (singleton) do location.service.

jest.mock('expo-location', () => {
  const granted = { status: 'granted' };
  return {
    requestForegroundPermissionsAsync: jest.fn(async () => granted),
    requestBackgroundPermissionsAsync: jest.fn(async () => granted),
    getForegroundPermissionsAsync: jest.fn(async () => granted),
    getCurrentPositionAsync: jest.fn(async () => ({
      coords: { latitude: -8.81, longitude: 13.23, accuracy: 5, heading: 0, speed: 0 },
    })),
    watchPositionAsync: jest.fn(async (_opts: unknown, _cb: unknown) => ({ remove: jest.fn() })),
    Accuracy: { Balanced: 3 },
  };
});

jest.mock('@services/supabase', () => {
  const builder = {
    upsert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn(() => builder),
    eq: jest.fn().mockResolvedValue({ error: null }),
  };
  return {
    supabase: { from: jest.fn(() => builder) },
    __builder: builder,
  };
});

import * as Location from 'expo-location';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const supabaseModule = require('@services/supabase');
const builder = supabaseModule.__builder;

// O location.service mantém estado de módulo (watcher singleton). Recarrega-o em cada bloco
// para limpar `watcher`/`activeUserId`.
function loadService() {
  let svc: typeof import('../location.service') | null = null;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    svc = require('../location.service');
  });
  if (!svc) throw new Error('Failed to load location.service');
  return svc;
}

beforeEach(() => {
  jest.clearAllMocks();
  builder.upsert.mockResolvedValue({ error: null });
  builder.eq.mockResolvedValue({ error: null });
});

describe('requestPermissions', () => {
  it('devolve granted quando foreground é concedido', async () => {
    const svc = loadService();
    const result = await svc.requestPermissions();
    expect(result.location).toBe('granted');
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('não pede background se foreground for denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    const svc = loadService();
    const result = await svc.requestPermissions();
    expect(result.location).toBe('denied');
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('getCurrentLocation', () => {
  it('devolve coordenadas do expo-location', async () => {
    const svc = loadService();
    const pos = await svc.getCurrentLocation();
    expect(pos).toEqual({ lat: -8.81, lng: 13.23, accuracy: 5 });
  });

  it('devolve null quando o provider falha', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('gps off'));
    const svc = loadService();
    expect(await svc.getCurrentLocation()).toBeNull();
  });
});

describe('publishLocation', () => {
  it('faz upsert em locations com onConflict user_id', async () => {
    const svc = loadService();
    await svc.publishLocation('u1', -8.81, 13.23, { accuracy: 4, mode: 'driver' });

    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('locations');
    expect(builder.upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = builder.upsert.mock.calls[0];
    expect(payload).toMatchObject({
      user_id: 'u1',
      lat: -8.81,
      lng: 13.23,
      accuracy: 4,
      mode: 'driver',
      is_active: true,
    });
    expect(opts).toEqual({ onConflict: 'user_id' });
  });
});

describe('startTracking / stopTracking', () => {
  it('subscreve watchPositionAsync e propaga coords ao callback', async () => {
    const svc = loadService();
    const cb = jest.fn();
    const ok = await svc.startTracking('u1', 'passenger', cb);
    expect(ok).toBe(true);
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);

    // Simula um update — invoca o callback registado.
    const positionHandler = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1];
    await positionHandler({
      coords: { latitude: -8.92, longitude: 13.18, accuracy: 6, heading: 90, speed: 5 },
    });

    expect(cb).toHaveBeenCalledWith(-8.92, 13.18);
    expect(builder.upsert).toHaveBeenCalled();
  });

  it('falha quando não há permissão de foreground', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    const svc = loadService();
    const ok = await svc.startTracking('u1', 'passenger');
    expect(ok).toBe(false);
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('marca is_active=false ao parar', async () => {
    const svc = loadService();
    await svc.startTracking('u1', 'driver');
    await svc.stopTracking();

    expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('é idempotente — segunda chamada com tracking activo apenas actualiza o modo', async () => {
    const svc = loadService();
    await svc.startTracking('u1', 'passenger');
    await svc.startTracking('u1', 'driver');
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
  });
});
