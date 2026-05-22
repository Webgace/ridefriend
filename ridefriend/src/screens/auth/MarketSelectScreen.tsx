// Ficheiro: src/screens/auth/MarketSelectScreen.tsx | Função: lista de mercados com bandeira (PL2, polido)
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import i18n from '@i18n/index';
import { useMarketStore } from '@store/marketStore';
import { getAllMarkets } from '@config/markets';
import type { MarketCode } from '../../types';

interface Props {
  onSelect?: (marketCode: MarketCode) => Promise<void>;
}

const FLAGS: Record<MarketCode, string> = {
  pt: '🇵🇹',
  br: '🇧🇷',
  ao: '🇦🇴',
  mz: '🇲🇿',
  cv: '🇨🇻',
  ng: '🇳🇬',
};

const CITIES: Record<MarketCode, string> = {
  pt: 'Lisboa',
  br: 'São Paulo',
  ao: 'Luanda',
  mz: 'Maputo',
  cv: 'Praia',
  ng: 'Lagos',
};

function languageForMarket(code: MarketCode) {
  if (code === 'br') return 'pt-BR';
  if (code === 'ng') return 'en';
  return 'pt';
}

export default function MarketSelectScreen({ onSelect }: Props) {
  const navigation = useNavigation<any>();
  // Lê directamente do store: este ecrã CORRE quando `config` ainda é null,
  // pelo que não pode usar `useMarket()` (que faz throw nesse caso).
  const setMarket = useMarketStore((s) => s.setMarket);
  const activeCode = useMarketStore((s) => s.config?.code);

  const handleSelect = async (marketCode: MarketCode) => {
    const selected = getAllMarkets().find((m) => m.code === marketCode);
    if (!selected) return;

    await setMarket(marketCode);
    i18n.changeLanguage(languageForMarket(marketCode));

    if (onSelect) {
      await onSelect(marketCode);
    } else {
      navigation.navigate('PhoneInput');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroDecorTop} />
          <View style={styles.heroDecorBottom} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="earth" size={24} color={COLORS.amber} />
          </View>
          <Text style={styles.heroTitle}>Onde estás?</Text>
          <Text style={styles.heroBody}>
            Escolhe o teu mercado para receberes mapas e contactos locais.
          </Text>
        </View>

        <View style={styles.list}>
          {getAllMarkets().map((market) => {
            const active = market.code === activeCode;
            return (
              <Pressable
                key={market.code}
                onPress={() => handleSelect(market.code)}
                accessibilityRole="button"
                accessibilityLabel={market.name}
                style={({ pressed }) => [
                  styles.card,
                  active && styles.cardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flag}>{FLAGS[market.code]}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{market.name}</Text>
                  <Text style={styles.cardMeta}>
                    {CITIES[market.code]} · {market.phonePrefix}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 20, paddingBottom: 32, gap: 18 },

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

  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardActive: {
    borderColor: COLORS.navy,
    backgroundColor: '#F1F5FB',
    borderWidth: 1.5,
  },
  flag: { fontSize: 28 },
  cardBody: { flex: 1, gap: 2 },
  cardName: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.text,
  },
  cardMeta: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
  },

  pressed: { opacity: 0.85 },
});
