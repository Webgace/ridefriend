// Ficheiro: src/services/__tests__/auth.service.test.ts | Função: testes do fluxo OTP + perfil (P11)
import { sendOTP, verifyOTP, signOut, createUserProfile } from '../auth.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('@services/supabase', () => {
  const insertSingle = jest.fn();
  const fromBuilder = {
    insert: jest.fn(() => fromBuilder),
    select: jest.fn(() => fromBuilder),
    single: insertSingle,
  };
  return {
    supabase: {
      from: jest.fn(() => fromBuilder),
    },
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
    signInWithPhone: jest.fn(),
    verifyOtp: jest.fn(),
    __fromBuilder: fromBuilder,
  };
});

jest.mock('@store/marketStore', () => ({
  useMarketStore: { getState: jest.fn() },
}));

jest.mock('@store/authStore', () => {
  const state = {
    user: null as unknown,
    session: null as unknown,
    isAuthenticated: false,
    setUser: jest.fn((u: unknown) => {
      state.user = u;
    }),
    setSession: jest.fn((s: unknown) => {
      state.session = s;
    }),
    setIsAuthenticated: jest.fn((v: boolean) => {
      state.isAuthenticated = v;
    }),
    logout: jest.fn(async () => {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
    }),
  };
  return {
    useAuthStore: { getState: jest.fn(() => state) },
    __authState: state,
  };
});

import * as supabaseModule from '@services/supabase';
import { useMarketStore } from '@store/marketStore';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __authState: authState } = require('@store/authStore');

const mockedMarket = useMarketStore.getState as jest.Mock;
const mockedSignInWithPhone = supabaseModule.signInWithPhone as jest.Mock;
const mockedVerifyOtp = supabaseModule.verifyOtp as jest.Mock;
const mockedGetUser = supabaseModule.getUser as jest.Mock;
const mockedSignOut = supabaseModule.signOut as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromBuilder = (supabaseModule as any).__fromBuilder;

beforeEach(() => {
  jest.clearAllMocks();
  authState.user = null;
  authState.session = null;
  authState.isAuthenticated = false;
  mockedMarket.mockReturnValue({ config: { code: 'ao' } });
});

describe('sendOTP', () => {
  it('delega para supabase.signInWithPhone quando há mercado seleccionado', async () => {
    mockedSignInWithPhone.mockResolvedValueOnce(undefined);
    await sendOTP('+244923000001');
    // sendOTP resolve o canal via app_config (default 'sms') e passa-o ao provider.
    expect(mockedSignInWithPhone).toHaveBeenCalledWith('+244923000001', 'sms');
  });

  it('lança mensagem pt-AO se o provider falhar', async () => {
    mockedSignInWithPhone.mockRejectedValueOnce(new Error('AT down'));
    await expect(sendOTP('+244923000001')).rejects.toThrow(/Não foi possível enviar/);
  });

  it('lança mensagem en-NG no mercado nigeriano', async () => {
    mockedMarket.mockReturnValue({ config: { code: 'ng' } });
    mockedSignInWithPhone.mockRejectedValueOnce(new Error('Termii down'));
    await expect(sendOTP('+2348012345678')).rejects.toThrow(/Unable to send/);
  });

  it('lança quando não há mercado seleccionado', async () => {
    mockedMarket.mockReturnValue({ config: null });
    await expect(sendOTP('+244923000001')).rejects.toThrow(/mercado/i);
    expect(mockedSignInWithPhone).not.toHaveBeenCalled();
  });
});

describe('verifyOTP', () => {
  it('regista sessão e perfil quando o código é válido', async () => {
    const session = { access_token: 'abc', expires_at: 1234567890 };
    // O wrapper supabase.ts desempacota `{data, error}` e devolve apenas `data` ({user, session}).
    mockedVerifyOtp.mockResolvedValueOnce({ session, user: null });
    mockedGetUser.mockResolvedValueOnce({
      id: 'u1',
      phone: '+244923000001',
      email: 'a@b.com',
      user_metadata: { full_name: 'Ana' },
    });

    const result = await verifyOTP('+244923000001', '123456');

    expect(mockedVerifyOtp).toHaveBeenCalledWith('+244923000001', '123456');
    expect(authState.session).toEqual(session);
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.user).toMatchObject({ id: 'u1', name: 'Ana', marketCode: 'ao' });
    expect(result.session).toBe(session);
  });

  it('lança erro pt-AO se a verificação falhar', async () => {
    mockedVerifyOtp.mockRejectedValueOnce(new Error('bad code'));
    await expect(verifyOTP('+244923000001', '000000')).rejects.toThrow(/Não foi possível verificar/);
  });

  it('lança erro se a resposta vier sem sessão', async () => {
    mockedVerifyOtp.mockResolvedValueOnce({ session: null, user: null });
    await expect(verifyOTP('+244923000001', '123456')).rejects.toThrow(/Não foi possível verificar/);
  });
});

describe('signOut', () => {
  it('chama supabase.signOut e limpa o authStore', async () => {
    mockedSignOut.mockResolvedValueOnce(undefined);
    authState.isAuthenticated = true;
    authState.user = { id: 'u1' };

    await signOut();

    expect(mockedSignOut).toHaveBeenCalled();
    expect(authState.user).toBeNull();
    expect(authState.isAuthenticated).toBe(false);
  });

  it('lança mensagem localizada se o signOut falhar', async () => {
    mockedSignOut.mockRejectedValueOnce(new Error('network'));
    await expect(signOut()).rejects.toThrow(/Não foi possível terminar/);
  });
});

describe('createUserProfile', () => {
  it('cria perfil na tabela users e popula o authStore', async () => {
    mockedGetUser.mockResolvedValueOnce({ id: 'u1', phone: '+244923000001' });
    fromBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'u1',
        phone: '+244923000001',
        name: 'Ana',
        email: 'a@b.com',
        photo_url: null,
        is_driver: false,
        rating_avg: 0,
        ride_count: 0,
        market_code: 'ao',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    });

    const profile = await createUserProfile({ name: 'Ana', email: 'a@b.com', market_code: 'ao' });

    expect(profile.id).toBe('u1');
    expect(authState.user).toMatchObject({ id: 'u1', name: 'Ana', isDriver: false });
  });

  it('lança se não houver utilizador autenticado', async () => {
    mockedGetUser.mockResolvedValueOnce(null);
    await expect(
      createUserProfile({ name: 'Ana', market_code: 'ao' }),
    ).rejects.toThrow(/utilizador autenticado/);
  });

  it('lança se o insert na tabela users falhar', async () => {
    mockedGetUser.mockResolvedValueOnce({ id: 'u1', phone: '+244923000001' });
    fromBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'duplicate' } });
    await expect(
      createUserProfile({ name: 'Ana', market_code: 'ao' }),
    ).rejects.toThrow(/criar o perfil/);
  });
});
