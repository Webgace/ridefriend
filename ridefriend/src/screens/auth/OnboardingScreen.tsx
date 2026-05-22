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
  const [step, setStep] = useState<'confirm' | 'profile'>('confirm');
  const [showMarketPicker, setShowMarketPicker] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 22 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.bodyRegular, color: COLORS.text2 },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  progressDot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
  },
  progressDotActive: { backgroundColor: COLORS.navy },
  progressText: {
    marginLeft: 6,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text2,
  },

  step: { gap: 14 },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    gap: 4,
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
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontFamily: FONTS.soraBold,
    fontSize: 24,
    color: COLORS.white,
    marginTop: 2,
  },
  heroBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 8,
    lineHeight: 19,
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  stepTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 20,
    color: COLORS.text,
  },
  stepSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text2,
    marginTop: 2,
  },

  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text,
    paddingHorizontal: 2,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text,
  },

  primaryBtn: {
    backgroundColor: COLORS.navy,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  btnDisabled: { opacity: 0.6 },

  secondaryBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },

  roleRow: { flexDirection: 'row', gap: 8 },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  roleCardActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  roleLabel: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text,
  },
  roleLabelActive: { color: COLORS.white },
  roleSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: COLORS.text2,
  },
  roleSubActive: { color: 'rgba(255,255,255,0.75)' },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.gray400,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  termsText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: FONTS.bodySemi,
    color: COLORS.navy,
    textDecorationLine: 'underline',
  },
  termsLinkDisabled: {
    color: COLORS.text3,
    textDecorationLine: 'none',
  },

  pressed: { opacity: 0.85 },
});
