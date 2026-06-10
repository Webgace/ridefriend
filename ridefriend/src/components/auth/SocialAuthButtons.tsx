// Ficheiro: src/components/auth/SocialAuthButtons.tsx | Função: botões "Continuar com Google/Apple"
// Google: usa @react-native-google-signin/google-signin (Google Play Credential Manager) —
// substitui o flow custom-URI do expo-auth-session, que foi desactivado pelo Google em Abril 2024.
// Apple: usa expo-apple-authentication (iOS apenas).
// Ambos os módulos são lazy-required para o ecrã não rebentar se a build actual ainda não os
// tem (precisa de EAS rebuild quando o package.json muda).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, FONTS } from '@constants/theme';
import { signInWithAppleIdToken, signInWithGoogleIdToken } from '@services/auth.service';

interface Props {
  /** Chamado quando o utilizador completa OAuth com sucesso. `hasProfile=false` ⇒ navegar para Onboarding. */
  onSuccess: (result: { hasProfile: boolean; provider: 'google' | 'apple' }) => void;
  /** Chamado quando o flow falha (com mensagem para Toast). */
  onError: (message: string) => void;
}

function getGoogleClientIds() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const iosClientId = extra.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId =
    extra.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  return { iosClientId, webClientId };
}

export default function SocialAuthButtons({ onSuccess, onError }: Props) {
  const [busyProvider, setBusyProvider] = useState<'google' | 'apple' | null>(null);

  // Google: SDK nativo via @react-native-google-signin/google-signin.
  const GoogleSignInModule = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@react-native-google-signin/google-signin');
    } catch {
      return null;
    }
  }, []);

  const { iosClientId, webClientId } = getGoogleClientIds();
  const googleConfigured = Boolean(GoogleSignInModule && webClientId);

  // Configura o SDK uma vez. `webClientId` é o audience do id_token (o Supabase
  // valida contra ele). `iosClientId` é só para iOS.
  useEffect(() => {
    if (!GoogleSignInModule?.GoogleSignin || !webClientId) return;
    try {
      GoogleSignInModule.GoogleSignin.configure({
        webClientId,
        iosClientId,
        offlineAccess: false,
      });
    } catch (e) {
      console.warn('GoogleSignin.configure failed:', e);
    }
  }, [GoogleSignInModule, webClientId, iosClientId]);

  const handleGoogle = useCallback(async () => {
    if (!GoogleSignInModule) {
      onError(
        'Login com Google indisponível nesta build. Reconstrói com @react-native-google-signin/google-signin.',
      );
      return;
    }
    if (!googleConfigured) {
      onError('Falta o googleWebClientId em app.json → extra.');
      return;
    }
    const { GoogleSignin, statusCodes } = GoogleSignInModule;
    setBusyProvider('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      // O SDK passou a devolver `{ type: 'success', data: { idToken, ... } }` na v13+;
      // versões anteriores devolviam o objecto plano. Tratamos os dois formatos.
      const idToken: string | undefined =
        userInfo?.data?.idToken ?? userInfo?.idToken;
      if (!idToken) {
        onError('Login com Google: sem idToken na resposta. Verifica o webClientId.');
        return;
      }
      const social = await signInWithGoogleIdToken(idToken);
      onSuccess({ hasProfile: social.hasProfile, provider: 'google' });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === statusCodes?.SIGN_IN_CANCELLED) return;
      if (code === statusCodes?.IN_PROGRESS) {
        onError('Login Google já está em curso. Aguarda.');
        return;
      }
      if (code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        onError('Google Play Services indisponível. Actualiza no Play Store.');
        return;
      }
      onError(e instanceof Error ? e.message : 'Falha no login Google.');
    } finally {
      setBusyProvider(null);
    }
  }, [GoogleSignInModule, googleConfigured, onSuccess, onError]);

  // Apple: usa expo-apple-authentication (só iOS). Precisa de nonce SHA256.
  const Apple = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-apple-authentication');
    } catch {
      return null;
    }
  }, []);
  const Crypto = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-crypto');
    } catch {
      return null;
    }
  }, []);

  const appleAvailable = Platform.OS === 'ios' && Boolean(Apple);

  const handleApple = useCallback(async () => {
    if (!Apple || !Crypto) {
      onError('Login com Apple indisponível nesta build. Reconstrói com expo-apple-authentication.');
      return;
    }
    setBusyProvider('apple');
    try {
      const rawNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await Apple.signInAsync({
        requestedScopes: [
          Apple.AppleAuthenticationScope.FULL_NAME,
          Apple.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        onError('Login com Apple não devolveu token.');
        return;
      }
      const social = await signInWithAppleIdToken(credential.identityToken, rawNonce);
      onSuccess({ hasProfile: social.hasProfile, provider: 'apple' });
    } catch (e: unknown) {
      // Apple lança ERR_REQUEST_CANCELED se o utilizador cancela — não mostrar erro.
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'ERR_REQUEST_CANCELED') return;
      onError(e instanceof Error ? e.message : 'Falha no login Apple.');
    } finally {
      setBusyProvider(null);
    }
  }, [Apple, Crypto, onSuccess, onError]);

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou continua com</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        onPress={handleGoogle}
        disabled={busyProvider !== null}
        accessibilityRole="button"
        accessibilityLabel="Continuar com Google"
        style={({ pressed }) => [
          styles.btn,
          styles.btnGoogle,
          pressed && styles.pressed,
          busyProvider !== null && styles.disabled,
        ]}
      >
        <FontAwesome name="google" size={18} color={COLORS.text} />
        <Text style={styles.btnText}>
          {busyProvider === 'google' ? 'A entrar…' : 'Continuar com Google'}
        </Text>
      </Pressable>

      {appleAvailable ? (
        <Pressable
          onPress={handleApple}
          disabled={busyProvider !== null}
          accessibilityRole="button"
          accessibilityLabel="Continuar com Apple"
          style={({ pressed }) => [
            styles.btn,
            styles.btnApple,
            pressed && styles.pressed,
            busyProvider !== null && styles.disabled,
          ]}
        >
          <Ionicons name="logo-apple" size={20} color={COLORS.white} />
          <Text style={[styles.btnText, styles.btnTextLight]}>
            {busyProvider === 'apple' ? 'A entrar…' : 'Continuar com Apple'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  btnApple: { backgroundColor: '#000000' },
  btnGoogle: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  btnText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },

  btnTextLight: { color: COLORS.white },
  disabled: { opacity: 0.6 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  dividerLine: { backgroundColor: COLORS.border, flex: 1, height: 1 },
  dividerText: { color: COLORS.text3, fontFamily: FONTS.bodyRegular, fontSize: 11 },
  pressed: { opacity: 0.85 },
  wrap: { gap: 10 },
});
