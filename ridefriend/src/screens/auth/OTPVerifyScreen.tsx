// Ficheiro: src/screens/auth/OTPVerifyScreen.tsx | Função: introdução do código OTP recebido (P3, polido)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { sendOTP, verifyOTP } from '@services/auth.service';
import { useUiHostStore } from '@store/uiHostStore';

type AuthStackParamList = {
  OTPVerify: { phone: string };
  Onboarding: undefined;
};

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

export default function OTPVerifyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AuthStackParamList, 'OTPVerify'>>();
  const showToast = useUiHostStore((s) => s.showToast);

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(RESEND_COOLDOWN_SEC);
  const inputRef = useRef<TextInput>(null);

  const phone = route.params?.phone ?? '';

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  // Focus hidden input on mount.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleVerify = useCallback(
    async (digits: string) => {
      if (digits.length !== CODE_LENGTH) {
        showToast({ message: `Introduz os ${CODE_LENGTH} dígitos.`, tone: 'error' });
        return;
      }
      setIsVerifying(true);
      try {
        await verifyOTP(phone, digits);
        navigation.navigate('Onboarding');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Falha ao verificar o código.';
        showToast({ message, tone: 'error', durationMs: 8000 });
        setCode('');
        inputRef.current?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [phone, navigation, showToast],
  );

  const handleChangeCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      void handleVerify(digits);
    }
  };

  const handleResend = async () => {
    if (cooldownSec > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendOTP(phone);
      setCooldownSec(RESEND_COOLDOWN_SEC);
      setCode('');
      inputRef.current?.focus();
      showToast({ message: 'Novo código enviado.', tone: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao reenviar.';
      showToast({ message, tone: 'error' });
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const focusInput = () => inputRef.current?.focus();

  const boxes = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {navigation.canGoBack() ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            </Pressable>
          ) : null}

          <View style={styles.hero}>
            <View style={styles.heroDecorTop} />
            <View style={styles.heroDecorBottom} />
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.amber} />
            </View>
            <Text style={styles.heroTitle}>Verifica o teu número</Text>
            <Text style={styles.heroBody}>Enviámos um código de {CODE_LENGTH} dígitos para</Text>
            <Text style={styles.heroPhone}>{phone || '—'}</Text>
          </View>

          <Pressable onPress={focusInput} accessibilityLabel="Introduzir código">
            <View style={styles.boxesRow}>
              {boxes.map((d, i) => {
                const isCurrent = i === code.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      isCurrent && styles.boxActive,
                      d && styles.boxFilled,
                    ]}
                  >
                    <Text style={styles.boxText}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>

          {/* Hidden input — captures all typing */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChangeCode}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            caretHidden
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendHint}>Não recebeste?</Text>
            {cooldownSec > 0 ? (
              <Text style={styles.resendCountdown}>Reenviar em {cooldownSec}s</Text>
            ) : (
              <Pressable
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel="Reenviar código"
                disabled={isResending}
              >
                <Text style={styles.resendLink}>
                  {isResending ? 'A enviar...' : 'Reenviar código'}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => handleVerify(code)}
            disabled={isVerifying || code.length !== CODE_LENGTH}
            accessibilityRole="button"
            accessibilityLabel="Verificar código"
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              (isVerifying || code.length !== CODE_LENGTH) && styles.btnDisabled,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isVerifying ? 'A verificar...' : 'Verificar código'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BOX_SIZE = 48;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  content: { flex: 1, padding: 20, gap: 22 },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecorTop: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245,158,11,0.12)',
    top: -50,
    right: -40,
  },
  heroDecorBottom: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,158,11,0.08)',
    bottom: -30,
    right: 30,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(217,119,6,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 22,
    color: COLORS.white,
  },
  heroBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
  },
  heroPhone: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.amber,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE + 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.white,
  },
  boxFilled: {
    backgroundColor: '#F1F5FB',
    borderColor: COLORS.navy,
  },
  boxText: {
    fontFamily: FONTS.soraBold,
    fontSize: 22,
    color: COLORS.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    left: -100,
    top: -100,
  },

  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text2,
  },
  resendCountdown: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text3,
  },
  resendLink: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.navy,
  },

  primaryBtn: {
    backgroundColor: COLORS.navy,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  btnDisabled: { opacity: 0.5 },

  pressed: { opacity: 0.85 },
});
