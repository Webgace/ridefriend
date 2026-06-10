// Ficheiro: src/screens/auth/PhoneInputScreen.tsx | Função: ecrã de login social (Google/Apple)
// O nome do ficheiro é histórico — antes era input de telefone + OTP. Mantém-se para evitar
// renomear a rota no RootNavigator. O input de telefone foi removido após a decisão de
// largar telefone-OTP (custos de SMS/WhatsApp). Telefone passa a ser opcional no perfil.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useMarket } from '@hooks/useMarket';
import { getAllMarkets } from '@config/markets';
import { useUiHostStore } from '@store/uiHostStore';
import SocialAuthButtons from '@components/auth/SocialAuthButtons';
import type { MarketCode } from '../../types';

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
  const [isPickerVisible, setPickerVisible] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

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
              <Ionicons name="people-circle-outline" size={26} color={COLORS.amber} />
            </View>
            <Text style={styles.heroTitle}>Entrar no RideFriend</Text>
            <Text style={styles.heroBody}>
              Usa a tua conta Google ou Apple. Sem palavra-passe, sem códigos SMS.
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

          <SocialAuthButtons
            onSuccess={() => {
              // O RootNavigator faz o switch automaticamente via state:
              //  - hasProfile=true  → user.termsAcceptedAt definido → MainStack
              //  - hasProfile=false → user.termsAcceptedAt=null     → OnboardingStack
              // Não chamar navigation.navigate aqui — AuthStack desmonta entretanto.
            }}
            onError={(message) => showToast({ message, tone: 'error', durationMs: 6000 })}
          />

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
  backBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginBottom: 4,
    width: 36,
  },
  content: { gap: 18, padding: 20, paddingBottom: 40 },
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
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  heroBody: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
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
    marginBottom: 12,
    width: 44,
  },

  heroTitle: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 22,
  },
  legal: {
    color: COLORS.text3,
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 12,
    textAlign: 'center',
  },

  marketBody: { flex: 1, gap: 2 },
  marketFlag: { fontSize: 24 },
  marketName: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 15 },
  marketOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  marketOptionActive: {
    backgroundColor: '#F1F5FB',
  },

  marketOptionFlag: { fontSize: 22 },

  marketOptionName: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  marketOptionPrefix: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },
  marketPrefix: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  marketSelector: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalBody: { maxHeight: '70%' },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 13,
  },
  modalCloseText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    width: 38,
  },
  modalOverlay: {
    backgroundColor: 'rgba(13,31,56,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 17,
    marginBottom: 10,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },

  safe: { backgroundColor: COLORS.surface, flex: 1 },
});
