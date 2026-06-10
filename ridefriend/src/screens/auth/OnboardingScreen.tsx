// Ficheiro: src/screens/auth/OnboardingScreen.tsx | Função: 2-step (confirmar mercado + criar perfil) — polido v2
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import i18n from '@i18n/index';
import { useMarket } from '@hooks/useMarket';
import { useAppConfig } from '@hooks/useAppConfig';
import { createUserProfile } from '@services/auth.service';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import type { MarketCode } from '../../types';
import MarketSelectScreen from './MarketSelectScreen';

type Role = 'passenger' | 'driver' | 'both';

const ROLE_OPTIONS: { value: Role; label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'passenger', label: 'Passageiro', sub: 'Pedir boleias', icon: 'walk-outline' },
  { value: 'driver', label: 'Motorista', sub: 'Dar boleias', icon: 'car-outline' },
  { value: 'both', label: 'Ambos', sub: 'Pedir e dar', icon: 'sync-outline' },
];

const ADDRESS_LABEL: Record<MarketCode, string> = {
  ao: 'Bairro',
  mz: 'Bairro',
  br: 'Bairro',
  cv: 'Bairro',
  ng: 'Area',
  pt: 'Localidade',
};

function languageForMarket(code: MarketCode) {
  if (code === 'br') return 'pt-BR';
  if (code === 'ng') return 'en';
  return 'pt';
}

export default function OnboardingScreen() {
  // useMarket() faz spread do MarketConfig + adiciona setMarket — não tem campo `config`.
  const market = useMarket();
  const setMarket = market.setMarket;
  const showToast = useUiHostStore((s) => s.showToast);
  const { config: appConfig } = useAppConfig();
  const stubUser = useAuthStore((s) => s.user);
  // O authProvider vem do stub do authStore preenchido por completeSocialSignIn.
  // Default 'phone' por retro-compat (caso o phone-OTP volte a ser activado).
  const authProvider = stubUser?.authProvider ?? 'phone';

  // Pré-preenche nome/email a partir do stub do authStore (preenchido por
  // completeSocialSignIn quando o utilizador vem de Google/Apple).
  const [step, setStep] = useState<'confirm' | 'profile'>('confirm');
  const [showMarketPicker, setShowMarketPicker] = useState(false);
  const [name, setName] = useState(stubUser?.name ?? '');
  const [email, setEmail] = useState(stubUser?.email ?? '');
  const [neighborhood, setNeighborhood] = useState('');
  const [role, setRole] = useState<Role>('passenger');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const addressLabel = useMemo(() => ADDRESS_LABEL[market.code] ?? 'Localidade', [market.code]);

  const handleMarketSelect = async (marketCode: MarketCode) => {
    await setMarket(marketCode);
    i18n.changeLanguage(languageForMarket(marketCode));
    setShowMarketPicker(false);
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      showToast({ message: 'Por favor indica o teu nome.', tone: 'error' });
      return;
    }
    if (!neighborhood.trim()) {
      showToast({
        message: `Por favor indica a tua ${addressLabel.toLowerCase()}.`,
        tone: 'error',
      });
      return;
    }
    if (!termsAccepted) {
      showToast({
        message: 'Tens de aceitar os Termos e a Política de Privacidade.',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await createUserProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        market_code: market.code,
        // "both" e "driver" → is_driver=true (utilizador descobrível como motorista).
        is_driver: role !== 'passenger',
        terms_accepted_at: new Date().toISOString(),
        auth_provider: authProvider,
        photo_url: stubUser?.avatar ?? null,
      });
      showToast({ message: 'Perfil criado com sucesso.', tone: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao criar perfil.';
      showToast({ message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (showMarketPicker) {
    return <MarketSelectScreen onSelect={handleMarketSelect} />;
  }

  const stepNumber = step === 'confirm' ? 1 : 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, stepNumber === 2 && styles.progressDotActive]} />
            <Text style={styles.progressText}>Passo {stepNumber} de 2</Text>
          </View>

          {step === 'confirm' ? (
            <ConfirmStep
              marketName={market.name}
              onContinue={() => setStep('profile')}
              onChangeMarket={() => setShowMarketPicker(true)}
            />
          ) : (
            <ProfileStep
              addressLabel={addressLabel}
              addressPlaceholder={
                market.code === 'pt' ? 'Localidade' : market.code === 'ng' ? 'Area' : 'Bairro'
              }
              name={name}
              email={email}
              neighborhood={neighborhood}
              role={role}
              termsAccepted={termsAccepted}
              termsUrl={appConfig.terms_url ?? null}
              privacyUrl={appConfig.privacy_url ?? null}
              loading={loading}
              onNameChange={setName}
              onEmailChange={setEmail}
              onNeighborhoodChange={setNeighborhood}
              onRoleChange={setRole}
              onTermsToggle={() => setTermsAccepted((v) => !v)}
              onSubmit={handleCreateProfile}
              onBack={() => setStep('confirm')}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ConfirmProps {
  marketName: string;
  onContinue: () => void;
  onChangeMarket: () => void;
}

function ConfirmStep({ marketName, onContinue, onChangeMarket }: ConfirmProps) {
  return (
    <View style={styles.step}>
      <View style={styles.hero}>
        <View style={styles.heroDecorTop} />
        <View style={styles.heroDecorBottom} />
        <View style={styles.heroIconWrap}>
          <Ionicons name="location" size={26} color={COLORS.amber} />
        </View>
        <Text style={styles.heroTitle}>Detectámos o teu mercado</Text>
        <Text style={styles.heroValue}>{marketName}</Text>
        <Text style={styles.heroBody}>
          Confirma para usar os mapas, paragens e contactos locais.
        </Text>
      </View>

      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Sim, continuar"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.primaryBtnText}>Sim, continuar</Text>
      </Pressable>
      <Pressable
        onPress={onChangeMarket}
        accessibilityRole="button"
        accessibilityLabel="Mudar mercado"
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryBtnText}>Mudar mercado</Text>
      </Pressable>
    </View>
  );
}

interface ProfileProps {
  addressLabel: string;
  addressPlaceholder: string;
  name: string;
  email: string;
  neighborhood: string;
  role: Role;
  termsAccepted: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  loading: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onNeighborhoodChange: (v: string) => void;
  onRoleChange: (r: Role) => void;
  onTermsToggle: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

function ProfileStep({
  addressLabel,
  addressPlaceholder,
  name,
  email,
  neighborhood,
  role,
  termsAccepted,
  termsUrl,
  privacyUrl,
  loading,
  onNameChange,
  onEmailChange,
  onNeighborhoodChange,
  onRoleChange,
  onTermsToggle,
  onSubmit,
  onBack,
}: ProfileProps) {
  const openLegal = (url: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => null);
  };

  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>Completa o teu perfil</Text>
          <Text style={styles.stepSub}>Para te identificarmos na rede.</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Nome completo</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="Ana Silva"
          placeholderTextColor={COLORS.text3}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email (opcional)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={onEmailChange}
          placeholder="ana@exemplo.com"
          keyboardType="email-address"
          placeholderTextColor={COLORS.text3}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{addressLabel}</Text>
        <TextInput
          style={styles.input}
          value={neighborhood}
          onChangeText={onNeighborhoodChange}
          placeholder={addressPlaceholder}
          placeholderTextColor={COLORS.text3}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Como vais usar a app?</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((r) => {
            const active = r.value === role;
            return (
              <Pressable
                key={r.value}
                onPress={() => onRoleChange(r.value)}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                style={({ pressed }) => [
                  styles.roleCard,
                  active && styles.roleCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={r.icon}
                  size={20}
                  color={active ? COLORS.white : COLORS.text}
                />
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleSub, active && styles.roleSubActive]}>
                  {r.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={onTermsToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
        accessibilityLabel="Aceito os Termos e a Política de Privacidade"
        style={({ pressed }) => [styles.termsRow, pressed && styles.pressed]}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
          {termsAccepted ? (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          ) : null}
        </View>
        <Text style={styles.termsText}>
          Aceito os{' '}
          <Text
            style={[styles.termsLink, !termsUrl && styles.termsLinkDisabled]}
            onPress={() => openLegal(termsUrl)}
          >
            Termos
          </Text>{' '}
          e a{' '}
          <Text
            style={[styles.termsLink, !privacyUrl && styles.termsLinkDisabled]}
            onPress={() => openLegal(privacyUrl)}
          >
            Política de Privacidade
          </Text>
          .
        </Text>
      </Pressable>

      <Pressable
        onPress={onSubmit}
        disabled={loading || !termsAccepted}
        accessibilityRole="button"
        accessibilityLabel="Criar perfil"
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.pressed,
          (loading || !termsAccepted) && styles.btnDisabled,
        ]}
      >
        <Text style={styles.primaryBtnText}>{loading ? 'A guardar...' : 'Criar perfil'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  btnDisabled: { opacity: 0.6 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  checkbox: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray400,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxOn: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  content: { gap: 22, padding: 20, paddingBottom: 32 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    color: COLORS.text,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    paddingHorizontal: 2,
  },
  flex: { flex: 1 },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    gap: 4,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },

  heroBody: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  heroDecorBottom: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 45,
    bottom: -30,
    height: 90,
    position: 'absolute',
    right: 30,
    width: 90,
  },
  heroDecorTop: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 70,
    height: 140,
    position: 'absolute',
    right: -40,
    top: -50,
    width: 140,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.22)',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    marginBottom: 8,
    width: 44,
  },
  heroTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 24,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  loadingText: { color: COLORS.text2, fontFamily: FONTS.bodyRegular },
  pressed: { opacity: 0.85 },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    paddingVertical: 15,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },

  progressDot: {
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    height: 4,
    width: 22,
  },
  progressDotActive: { backgroundColor: COLORS.navy },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },

  progressText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    marginLeft: 6,
  },
  roleCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  roleCardActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  roleLabel: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
  },
  roleLabelActive: { color: COLORS.white },

  roleRow: { flexDirection: 'row', gap: 8 },
  roleSub: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
  },
  roleSubActive: { color: 'rgba(255,255,255,0.75)' },
  safe: { backgroundColor: COLORS.surface, flex: 1 },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  step: { gap: 14 },

  stepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stepSub: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    marginTop: 2,
  },
  stepTitle: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 20,
  },
  termsLink: {
    color: COLORS.navy,
    fontFamily: FONTS.bodySemi,
    textDecorationLine: 'underline',
  },
  termsLinkDisabled: {
    color: COLORS.text3,
    textDecorationLine: 'none',
  },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },

  termsText: {
    color: COLORS.text2,
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
});
