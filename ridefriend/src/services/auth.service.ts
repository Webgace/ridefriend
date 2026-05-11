// Ficheiro: src/services/auth.service.ts | Função: fluxo OTP via Supabase + criação de perfil (P3)
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import {
  getSession,
  getUser,
  signInWithPhone,
  signOut as supabaseSignOut,
  verifyOtp as supabaseVerifyOtp,
  supabase,
} from '@services/supabase';
import { MarketCode } from '@types/index';

const englishMarketCodes: MarketCode[] = ['ng'];

function shouldUseEnglish(marketCode?: MarketCode) {
  return englishMarketCodes.includes(marketCode as MarketCode);
}

function getAuthErrorMessage(type: 'otpSendFailed' | 'otpVerifyFailed' | 'signOutFailed' | 'refreshFailed', marketCode?: MarketCode) {
  const english = shouldUseEnglish(marketCode);

  const messages = {
    otpSendFailed: english
      ? 'Unable to send verification code. Please try again.'
      : 'Não foi possível enviar o código. Tente novamente.',
    otpVerifyFailed: english
      ? 'Unable to verify code. Please check the code and try again.'
      : 'Não foi possível verificar o código. Verifique e tente novamente.',
    signOutFailed: english
      ? 'Unable to sign out. Please try again.'
      : 'Não foi possível terminar sessão. Tente novamente.',
    refreshFailed: english
      ? 'Unable to refresh session. Please try again.'
      : 'Não foi possível atualizar a sessão. Tente novamente.',
  };

  return messages[type];
}

export async function sendOTP(phone: string): Promise<void> {
  const config = useMarketStore.getState().config;

  if (!config) {
    throw new Error('Seleção de mercado obrigatória.');
  }

  // O OTP é gerado e enviado pelo Supabase Auth (provider configurado no dashboard).
  // O sms.service.ts (PL3) cobre fluxos paralelos como SOS backup e alertas de rede.
  try {
    await signInWithPhone(phone);
  } catch (error) {
    console.error('sendOTP error', error);
    throw new Error(getAuthErrorMessage('otpSendFailed', config.code));
  }
}

export async function verifyOTP(phone: string, token: string) {
  const authStore = useAuthStore.getState();
  const marketCode = useMarketStore.getState().config?.code;

  try {
    const response = await supabaseVerifyOtp(phone, token);
    if (!response?.data?.session) {
      throw new Error('Missing session after OTP verification');
    }

    authStore.setSession(response.data.session);
    authStore.setIsAuthenticated(true);

    const currentUser = await getUser();
    authStore.setUser(
      currentUser
        ? {
            id: currentUser.id,
            phone: currentUser.phone || phone,
            name: currentUser.user_metadata?.full_name || '',
            email: currentUser.email || undefined,
            avatar: currentUser.user_metadata?.avatar || undefined,
            rating: 0,
            totalRides: 0,
            isDriver: false,
            isPassenger: true,
            marketCode: marketCode ?? 'ao',
            createdAt: response.data.session.expires_at?.toString() ?? new Date().toISOString(),
            updatedAt: response.data.session.expires_at?.toString() ?? new Date().toISOString(),
          }
        : null,
    );

    return response;
  } catch (error) {
    console.error('verifyOTP error', error);
    throw new Error(getAuthErrorMessage('otpVerifyFailed', marketCode));
  }
}

export async function signOut() {
  const authStore = useAuthStore.getState();
  const marketCode = useMarketStore.getState().config?.code;

  try {
    await supabaseSignOut();
    await authStore.logout();
  } catch (error) {
    console.error('signOut error', error);
    throw new Error(getAuthErrorMessage('signOutFailed', marketCode));
  }
}

export async function refreshSession() {
  const authStore = useAuthStore.getState();
  const marketCode = useMarketStore.getState().config?.code;

  try {
    const session = await getSession();
    authStore.setSession(session);
    authStore.setIsAuthenticated(!!session);
    return session;
  } catch (error) {
    console.error('refreshSession error', error);
    throw new Error(getAuthErrorMessage('refreshFailed', marketCode));
  }
}

export async function createUserProfile(payload: {
  name: string;
  email?: string;
  phone?: string;
  market_code: string;
}) {
  const currentUser = await getUser();

  if (!currentUser) {
    throw new Error('Não foi possível encontrar o utilizador autenticado.');
  }

  const phoneValue = payload.phone?.trim() || currentUser.phone || '';

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: currentUser.id,
        phone: phoneValue,
        name: payload.name,
        email: payload.email ?? null,
        is_driver: false,
        market_code: payload.market_code,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    console.error('createUserProfile error', error);
    throw new Error('Não foi possível criar o perfil. Tente novamente.');
  }

  const profile = data;
  useAuthStore.getState().setUser({
    id: profile.id,
    phone: profile.phone,
    name: profile.name,
    email: profile.email || undefined,
    avatar: profile.photo_url ?? undefined,
    rating: profile.rating_avg ?? 0,
    totalRides: profile.ride_count ?? 0,
    isDriver: profile.is_driver ?? false,
    isPassenger: !(profile.is_driver ?? false),
    marketCode: profile.market_code,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  });

  return profile;
}
