// Ficheiro: src/screens/auth/PhoneInputScreen.tsx | Função: input de telefone market-aware (P3 v2.1)
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMarket } from '@hooks/useMarket';
import { sendOTP } from '@services/auth.service';
import { getAllMarkets } from '@config/markets';
import { useUiHostStore } from '@store/uiHostStore';

const formatLocalPhone = (value: string) => value.replace(/[^0-9]/g, '');

export default function PhoneInputScreen() {
  const navigation = useNavigation();
  const market = useMarket();
  const showToast = useUiHostStore((s) => s.showToast);
  const [phone, setPhone] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedConfig = market;

  const phoneDigits = useMemo(() => formatLocalPhone(phone), [phone]);
  const normalizedPhone = useMemo(() => {
    if (!selectedConfig) return phoneDigits;
    const prefixDigits = selectedConfig.phonePrefix.replace(/\D/g, '');
    let digits = phoneDigits;

    if (prefixDigits && digits.startsWith(prefixDigits)) {
      digits = digits.slice(prefixDigits.length);
    }

    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    return digits;
  }, [phoneDigits, selectedConfig]);

  const fullPhone = useMemo(() => {
    if (!selectedConfig) return phone;
    return `${selectedConfig.phonePrefix}${normalizedPhone}`;
  }, [selectedConfig, normalizedPhone]);

  const validatePhone = () => {
    if (!selectedConfig) {
      showToast({ message: 'Seleção de mercado obrigatória.', tone: 'error' });
      return false;
    }

    if (normalizedPhone.length < selectedConfig.phoneMinDigits || normalizedPhone.length > selectedConfig.phoneMaxDigits) {
      showToast({
        message: `O número deve ter entre ${selectedConfig.phoneMinDigits} e ${selectedConfig.phoneMaxDigits} dígitos.`,
        tone: 'error',
      });
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validatePhone()) return;

    setIsSending(true);
    try {
      await sendOTP(fullPhone);
      navigation.navigate('OTPVerify' as never, { phone: fullPhone } as never);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar o código.';
      // Erro de envio é diagnóstico — dura mais tempo para o utilizador conseguir ler.
      showToast({ message, tone: 'error', durationMs: 8000 });
    } finally {
      setIsSending(false);
    }
  };

  const { setMarket } = market;
  const marketOptions = getAllMarkets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Entrar com telefone</Text>
        <Text style={styles.subtitle}>Seleciona ou confirma o teu mercado e recebe o código por SMS.</Text>

        <TouchableOpacity style={styles.marketSelector} onPress={() => setPickerVisible(true)}>
          <Text style={styles.marketSelectorText}>{selectedConfig.name}</Text>
          <Text style={styles.marketSelectorHint}>{selectedConfig.phonePrefix}</Text>
        </TouchableOpacity>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Telefone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>{selectedConfig.phonePrefix}</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder={selectedConfig.phonePlaceholder}
              placeholderTextColor="#9CA3AF"
              returnKeyType="send"
              maxLength={20}
            />
          </View>
          <Text style={styles.helpText}>
            {selectedConfig.phoneMinDigits === selectedConfig.phoneMaxDigits
              ? `${selectedConfig.phoneMinDigits} dígitos.`
              : `Entre ${selectedConfig.phoneMinDigits} e ${selectedConfig.phoneMaxDigits} dígitos.`}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend} disabled={isSending}>
          <Text style={styles.buttonText}>{isSending ? 'A enviar...' : 'Enviar código'}</Text>
        </TouchableOpacity>

        <Modal visible={isPickerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Escolhe o mercado</Text>
              <ScrollView>
                {marketOptions.map((market) => (
                  <TouchableOpacity
                    key={market.code}
                    style={[styles.marketOption, market.code === selectedConfig.code && styles.activeMarketOption]}
                    onPress={() => {
                      setPickerVisible(false);
                      setMarket(market.code);
                    }}
                  >
                    <Text style={styles.marketOptionText}>{market.name} ({market.phonePrefix})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
  },
  marketSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  marketSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  marketSelectorHint: {
    color: '#6B7280',
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixBox: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  prefixText: {
    color: '#111827',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  helpText: {
    marginTop: 8,
    color: '#6B7280',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  marketOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeMarketOption: {
    backgroundColor: '#EFF6FF',
  },
  marketOptionText: {
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: 18,
    alignSelf: 'center',
  },
  modalCloseText: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
