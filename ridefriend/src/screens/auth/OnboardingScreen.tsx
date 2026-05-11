// Ficheiro: src/screens/auth/OnboardingScreen.tsx | Função: 2-step (mercado + perfil) (P3 v2.1 + PL2)
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '@i18n/index';
import { useMarket } from '@hooks/useMarket';
import { createUserProfile } from '@services/auth.service';
import { useUiHostStore } from '@store/uiHostStore';
import { MarketCode } from '@types/index';
import MarketSelectScreen from './MarketSelectScreen';

const marketLabelMap: Record<MarketCode, string> = {
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
  const navigation = useNavigation();
  const { config, setMarket } = useMarket();
  const showToast = useUiHostStore((s) => s.showToast);
  const [step, setStep] = useState<'confirm' | 'profile'>('confirm');
  const [showMarketPicker, setShowMarketPicker] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [loading, setLoading] = useState(false);

  const addressLabel = useMemo(() => {
    if (!config) return 'Bairro';
    return marketLabelMap[config.code] ?? 'Localidade';
  }, [config]);

  const handleMarketSelect = async (marketCode: MarketCode) => {
    await setMarket(marketCode);
    i18n.changeLanguage(languageForMarket(marketCode));
    setShowMarketPicker(false);
  };

  const handleCreateProfile = async () => {
    if (!config) {
      showToast({ message: 'Configuração do mercado indisponível.', tone: 'error' });
      return;
    }

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

    setLoading(true);
    try {
      await createUserProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        market_code: config.code,
      });
      showToast({ message: 'Perfil criado com sucesso.', tone: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao criar perfil.';
      showToast({ message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <View style={styles.centered}>
        <Text>A carregar configuração de mercado…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {step === 'confirm' && (
          <View>
            <Text style={styles.sectionTitle}>Detectámos o teu mercado</Text>
            <Text style={styles.marketHint}>{config.name}</Text>
            <Text style={styles.description}>
              Detectámos que estás em {config.name}. Correcto?
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('profile')}>
                <Text style={styles.primaryText}>Sim, continuar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowMarketPicker(true)}>
                <Text style={styles.secondaryText}>Mudar mercado</Text>
              </TouchableOpacity>
            </View>

            {showMarketPicker && (
              <MarketSelectScreen onSelect={handleMarketSelect} />
            )}
          </View>
        )}

        {step === 'profile' && (
          <View>
            <Text style={styles.sectionTitle}>Completa o teu perfil</Text>
            <Text style={styles.description}>Os campos abaixo ajudam a criar o teu perfil e a configurar o serviço no teu mercado.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ana Silva"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email (opcional)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ana@exemplo.com"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{addressLabel}</Text>
              <TextInput
                style={styles.input}
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder={
                  config.code === 'pt'
                    ? 'Localidade'
                    : config.code === 'ng'
                    ? 'Area'
                    : 'Bairro'
                }
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateProfile} disabled={loading}>
              <Text style={styles.primaryText}>{loading ? 'A guardar...' : 'Criar perfil'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  marketHint: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#4B5563',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    padding: 16,
    color: '#111827',
  },
});
