// Ficheiro: src/services/supabase.ts | Função: cliente Supabase tipado + helpers de auth
import { createClient } from '@supabase/supabase-js';
import { Database } from '@types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Get current user session
 */
export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get current authenticated user
 */
export async function getUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Re-hidrata a sessão do cliente Supabase a partir de tokens guardados.
 *
 * Necessário porque este cliente é criado sem storage adapter (sessão só em
 * memória). Após um reload da app — ou um login social seguido de reload antes
 * de criar perfil — `supabase.auth` fica sem sessão, e qualquer chamada autada
 * (getUser, inserts protegidos por RLS) falha. O authStore guarda a sessão em
 * SecureStore; esta função empurra-a de volta para o cliente.
 */
export async function setSupabaseSession(tokens: {
  access_token: string;
  refresh_token: string;
}) {
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Sign in with phone. `channel` controla SMS vs WhatsApp — requer Twilio Verify
 * configurado no dashboard Supabase com canal WhatsApp aprovado pela Meta.
 */
export async function signInWithPhone(
  phone: string,
  channel: 'sms' | 'whatsapp' = 'sms',
) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in with phone:', error);
    throw error;
  }
}

/**
 * Verify OTP. `type` é sempre 'sms' mesmo quando o canal foi WhatsApp — é a
 * forma como o Supabase Auth interpreta o token (canal-agnóstico).
 */
export async function verifyOtp(phone: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Sign in com Google/Apple via id_token nativo. O token vem do flow nativo
 * (@react-native-google-signin/google-signin para Google, expo-apple-authentication
 * para Apple) e é trocado por uma sessão Supabase sem abrir browser.
 */
export async function signInWithIdToken(input: {
  provider: 'google' | 'apple';
  token: string;
  nonce?: string;
}) {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: input.provider,
      token: input.token,
      nonce: input.nonce,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error signing in with ${input.provider}:`, error);
    throw error;
  }
}
