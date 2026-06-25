// Ficheiro: src/services/auth.service.ts | Função: fluxo OTP via Supabase + criação de perfil (P3)
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import {
  getSession,
  getUser,
  signInWithIdToken,
  signInWithPhone,
  signOut as supabaseSignOut,
  setSupabaseSession,
  verifyOtp as supabaseVerifyOtp,
  supabase,
} from '@services/supabase';
import { getAppConfigSnapshot } from '@hooks/useAppConfig';
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

/**
 * Lê o canal OTP escolhido pelo admin em app_config (sms ou whatsapp).
 * Falha-safe: assume 'sms' se a config ainda não foi carregada.
 */
function resolveOtpChannel(): 'sms' | 'whatsapp' {
  const snapshot = getAppConfigSnapshot();
  const raw = (snapshot.otp_channel ?? '').toLowerCase().trim();
  return raw === 'whatsapp' ? 'whatsapp' : 'sms';
}

export async function sendOTP(phone: string): Promise<void> {
  const config = useMarketStore.getState().config;

  if (!config) {
    throw new Error('Seleção de mercado obrigatória.');
  }

  // O OTP é gerado e enviado pelo Supabase Auth (provider configurado no dashboard).
  // O canal (SMS vs WhatsApp) é definido pelo admin via app_config.otp_channel.
  // O sms.service.ts (PL3) cobre fluxos paralelos como SOS backup e alertas de rede.
  try {
    await signInWithPhone(phone, resolveOtpChannel());
  } catch (error) {
    console.error('sendOTP error', error);
    const raw = error instanceof Error ? error.message : String(error);
    throw new Error(`${getAuthErrorMessage('otpSendFailed', config.code)} (${raw})`);
  }
}

export async function verifyOTP(phone: string, token: string) {
  const authStore = useAuthStore.getState();
  const marketCode = useMarketStore.getState().config?.code;

  try {
    // supabaseVerifyOtp já desempacota `{data, error}` e devolve apenas `data` ({user, session}).
    const response = await supabaseVerifyOtp(phone, token);
    if (!response?.session) {
      throw new Error('Missing session after OTP verification');
    }

    authStore.setSession(response.session);
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
            isAdmin: false,
            termsAcceptedAt: null,
            marketCode: marketCode ?? 'ao',
            createdAt: response.session.expires_at?.toString() ?? new Date().toISOString(),
            updatedAt: response.session.expires_at?.toString() ?? new Date().toISOString(),
          }
        : null,
    );

    return response;
  } catch (error) {
    console.error('verifyOTP error', error);
    const raw = error instanceof Error ? error.message : String(error);
    throw new Error(`${getAuthErrorMessage('otpVerifyFailed', marketCode)} (${raw})`);
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

interface SocialSignInResult {
  /** True quando já existe `users` row para este auth.uid — login normal. */
  hasProfile: boolean;
  email: string | null;
  /** Nome sugerido a partir do provider, se vier — usado para pré-preencher onboarding. */
  suggestedName: string | null;
  avatarUrl: string | null;
}

/**
 * Lê a linha de public.users para o auth.uid dado e popula o authStore.
 * Devolve true se encontrou perfil (i.e., o utilizador já passou pelo Onboarding).
 * Usado tanto no fluxo OAuth como no boot da app (initializeAuthStore).
 */
export async function loadUserProfileIntoStore(authUserId: string): Promise<boolean> {
  const authStore = useAuthStore.getState();
  const { data: profile, error } = await supabase
    .from('users')
    .select(
      'id, phone, name, email, photo_url, rating_avg, ride_count, is_driver, is_admin, terms_accepted_at, market_code, created_at, updated_at',
    )
    .eq('id', authUserId)
    .maybeSingle();
  if (error || !profile) return false;
  authStore.setUser({
    id: profile.id,
    phone: profile.phone ?? '',
    name: profile.name,
    email: profile.email ?? undefined,
    avatar: profile.photo_url ?? undefined,
    rating: Number(profile.rating_avg ?? 0),
    totalRides: profile.ride_count ?? 0,
    isDriver: profile.is_driver ?? false,
    isPassenger: !(profile.is_driver ?? false),
    isAdmin: profile.is_admin ?? false,
    termsAcceptedAt: profile.terms_accepted_at ?? null,
    marketCode: profile.market_code as MarketCode,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  });
  return true;
}

/**
 * Centraliza o pós-OAuth: troca o id_token por sessão Supabase, popula o
 * authStore com a sessão + auth.user, e indica se o utilizador precisa de
 * passar pelo Onboarding (ainda não tem `users` row) ou se já está bom.
 */
async function completeSocialSignIn(
  provider: 'google' | 'apple',
  token: string,
  nonce?: string,
): Promise<SocialSignInResult> {
  const authStore = useAuthStore.getState();
  const marketCode = useMarketStore.getState().config?.code;

  const response = await signInWithIdToken({ provider, token, nonce });
  if (!response?.session) {
    throw new Error('Missing session after OAuth verification');
  }

  authStore.setSession(response.session);
  authStore.setIsAuthenticated(true);

  const authUser = await getUser();
  const email = authUser?.email ?? null;
  const suggestedName =
    (authUser?.user_metadata?.full_name as string | undefined) ||
    (authUser?.user_metadata?.name as string | undefined) ||
    null;
  const avatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ||
    (authUser?.user_metadata?.picture as string | undefined) ||
    null;

  // Já existe perfil? Lê pelo PK = auth.uid() — reutiliza o helper para evitar
  // divergência entre OAuth e boot da app.
  if (authUser?.id) {
    const found = await loadUserProfileIntoStore(authUser.id);
    if (found) {
      return { hasProfile: true, email, suggestedName, avatarUrl };
    }
  }

  // Sem perfil ainda — deixa o ecrã de Onboarding chamar createUserProfile.
  // O authStore ganha um user "stub" com termsAcceptedAt=null. O RootNavigator
  // usa este campo como flag de "precisa de Onboarding" e mostra o OnboardingStack.
  // O authProvider fica no stub para o Onboarding o propagar a createUserProfile.
  authStore.setUser(
    authUser
      ? {
          id: authUser.id,
          phone: authUser.phone || '',
          name: suggestedName || '',
          email: email || undefined,
          avatar: avatarUrl || undefined,
          rating: 0,
          totalRides: 0,
          isDriver: false,
          isPassenger: true,
          isAdmin: false,
          termsAcceptedAt: null,
          marketCode: marketCode ?? 'ao',
          authProvider: provider,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null,
  );
  return { hasProfile: false, email, suggestedName, avatarUrl };
}

export async function signInWithGoogleIdToken(token: string) {
  return completeSocialSignIn('google', token);
}

export async function signInWithAppleIdToken(token: string, nonce?: string) {
  return completeSocialSignIn('apple', token, nonce);
}

export async function createUserProfile(payload: {
  name: string;
  email?: string;
  phone?: string;
  market_code: string;
  is_driver?: boolean;
  /** ISO timestamp; obrigatório pelo signup para auditar aceitação T&C / PP. */
  terms_accepted_at?: string;
  /** 'phone' (default) | 'google' | 'apple' | 'email' — audit trail. */
  auth_provider?: 'phone' | 'google' | 'apple' | 'email';
  /** URL do avatar vindo do provider OAuth, se houver. */
  photo_url?: string | null;
}) {
  let currentUser = await getUser();

  // O cliente Supabase guarda a sessão só em memória (sem storage adapter), por
  // isso após um reload — ex.: login social → reload → onboarding — `getUser()`
  // devolve null mesmo com sessão válida no authStore. Re-hidrata o cliente a
  // partir da sessão guardada e tenta de novo (também garante o JWT para o RLS
  // do insert abaixo).
  if (!currentUser) {
    const storedSession = useAuthStore.getState().session;
    if (storedSession?.access_token && storedSession?.refresh_token) {
      try {
        await setSupabaseSession(storedSession);
        currentUser = await getUser();
      } catch (e) {
        console.error('createUserProfile: failed to rehydrate session', e);
      }
    }
  }

  if (!currentUser) {
    throw new Error('Não foi possível encontrar o utilizador autenticado.');
  }

  // Phone agora é NULLABLE — para Google/Apple sem número, passamos null em vez
  // de '' (string vazia colide na UNIQUE constraint).
  const phoneTrimmed = payload.phone?.trim() || currentUser.phone || '';
  const phoneValue = phoneTrimmed.length > 0 ? phoneTrimmed : null;

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: currentUser.id,
        phone: phoneValue,
        name: payload.name,
        email: payload.email ?? currentUser.email ?? null,
        photo_url: payload.photo_url ?? null,
        is_driver: payload.is_driver ?? false,
        terms_accepted_at: payload.terms_accepted_at ?? null,
        market_code: payload.market_code,
        auth_provider: payload.auth_provider ?? 'phone',
      } as never,
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
    isAdmin: profile.is_admin ?? false,
    termsAcceptedAt: profile.terms_accepted_at ?? null,
    marketCode: profile.market_code,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  });

  return profile;
}
