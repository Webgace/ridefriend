// Ficheiro: src/screens/auth/PhoneInputScreen.tsx | Função: input de telefone market-aware (P3 v2.1, polido)
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useMarket } from '@hooks/useMarket';
import { sendOTP } from '@services/auth.service';
import { getAllMarkets } from '@config/markets';
import { useUiHostStore } from '@store/uiHostStore';
import type { MarketCode } from '../../types';

const formatLocalPhone = (value: string) => value.replace(/[^0-9]/g, '');

const FLAGS: Record<MarketCode, string> = {
  pt: '🇵🇹',
  br: '🇧🇷',
  ao: '🇦🇴',
  mz: '🇲🇿',
  cv: '🇨🇻',
  ng: '🇳🇬',
};

export default function PhoneInputScreen() {
  const navigation = useNavigation<any>();
  const market = useMarket();
  const showToast = useUiHostStore((s) => s.showToast);
  const [phone, setPhone] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const phoneDigits = useMemo(() => formatLocalPhone(phone), [phone]);
  const normalizedPhone = useMemo(() => {
    const prefixDigits = market.phonePrefix.replace(/\D/g, '');
    let digits = phoneDigits;
    if (prefixDigits && digits.startsWith(prefixDigits)) {
      digits = digits.slice(prefixDigits.length);
    }
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  }, [phoneDigits, market.phonePrefix]);

  const fullPhone = useMemo(
    () => `${market.phonePrefix}${normalizedPhone}`,
    [market.phonePrefix, normalizedPhone],
  );

  const validatePhone = () => {
    if (
      normalizedPhone.length < market.phoneMinDigits ||
      normalizedPhone.length > market.phoneMaxDigits
    ) {
      showToast({
        message: `O número deve ter entre ${market.phoneMinDigits} e ${market.phoneMaxDigits} dígitos.`,
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
      navigation.navigate('OTPVerify', { phone: fullPhone });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar o código.';
      showToast({ message, tone: 'error', durationMs: 8000 });
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const digitsHint =
    market.phoneMinDigits === market.phoneMaxDigits
      ? `${market.phoneMinDigits} dígitos.`
      : `Entre ${market.phoneMinDigits} e ${market.phoneMaxDigits} dígitos.`;

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
              <Ionicons name="phone-portrait-outline" size={24} color={COLORS.amber} />
            </View>
            <Text style={styles.heroTitle}>Entrar com telefone</Text>
            <Text style={styles.heroBody}>
              Recebes um código por SMS para confirmar o número. Sem palavra-passe.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mercado</Text>
            <Pressable
              onPress={() => setPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Mudar mercado"
              style={({ pressed }) => [styles.marketSelector, pressed && styles.pressed]}
            >
              <Text style={styles.marketFlag}>{FLAGS[market.code]}</Text>
              <View style={styles.marketBody}>
                <Text style={styles.marketName}>{market.name}</Text>
                <Text style={styles.marketPrefix}>{market.phonePrefix}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.text2} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Telefone</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>{market.phonePrefix}</Text>
              </View>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder={market.phonePlaceholder}
                placeholderTextColor={COLORS.text3}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                maxLength={20}
              />
            </View>
            <Text style={styles.helpText}>{digitsHint}</Text>
          </View>

          <Pressable
            onPress={handleSend}
            disabled={isSending}
            accessibilityRole="button"
            accessibilityLabel="Enviar código"
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              isSending && styles.btnDisabled,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isSending ? 'A enviar...' : 'Enviar código'}
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            Ao continuar concordas com os Termos e a Política de Privacidade.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <MarketPickerModal
        visible={isPickerVisible}
        activeCode={market.code}
        onClose={() => setPickerVisible(false)}
        onSelect={(code) => {
          setPickerVisible(false);
          market.setMarket(code);
        }}
      />
    </SafeAreaView>
  );
}

interface PickerProps {
  visible: boolean;
  activeCode: MarketCode;
  onClose: () => void;
  onSelect: (code: MarketCode) => void;
}

function MarketPickerModal({ visible, activeCode, onClose, onSelect }: PickerProps) {
  const markets = getAllMarkets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Escolhe o mercado</Text>
          <ScrollView style={styles.modalBody}>
            {markets.map((m) => {
              const active = m.code === activeCode;
              return (
                <Pressable
                  key={m.code}
                  onPress={() => onSelect(m.code)}
                  accessibilityRole="button"
                  accessibilityLabel={m.name}
                  style={({ pressed }) => [
                    styles.marketOption,
                    active && styles.marketOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.marketOptionFlag}>{FLAGS[m.code]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.marketOptionName}>{m.name}</Text>
                    <Text style={styles.marketOptionPrefix}>{m.phonePrefix}</Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.navy} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
          >
            <Text style={styles.modalCloseText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 18 },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
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
    lineHeight: 19,
  },

  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text,
    paddingHorizontal: 2,
  },
  helpText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.text2,
    paddingHorizontal: 2,
    marginTop: 2,
  },

  marketSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  marketFlag: { fontSize: 24 },
  marketBody: { flex: 1, gap: 2 },
  marketName: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.text },
  marketPrefix: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  prefixBox: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  prefixText: { fontFamily: FONTS.soraBold, fontSize: 14, color: COLORS.text },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: FONTS.bodyRegular,
    fontSize: 15,
    color: COLORS.text,
  },

  primaryBtn: {
    backgroundColor: COLORS.navy,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 14 },
  btnDisabled: { opacity: 0.6 },

  legal: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.text3,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,31,56,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 18,
    maxHeight: '80%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBody: { maxHeight: '70%' },
  marketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  marketOptionActive: {
    backgroundColor: '#F1F5FB',
  },
  marketOptionFlag: { fontSize: 22 },
  marketOptionName: { fontFamily: FONTS.soraBold, fontSize: 14, color: COLORS.text },
  marketOptionPrefix: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.gray100,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text,
  },

  pressed: { opacity: 0.85 },
});
