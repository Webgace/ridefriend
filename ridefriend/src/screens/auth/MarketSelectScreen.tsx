// Ficheiro: src/screens/auth/MarketSelectScreen.tsx | Função: lista de mercados com bandeira (PL2)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '@i18n/index';
import { useMarketStore } from '@store/marketStore';
import { MarketCode } from '@types/index';
import { getAllMarkets } from '@config/markets';

interface Props {
  onSelect?: (marketCode: MarketCode) => Promise<void>;
}

const flags: Record<MarketCode, string> = {
  pt: '🇵🇹',
  br: '🇧🇷',
  ao: '🇦🇴',
  mz: '🇲🇿',
  cv: '🇨🇻',
  ng: '🇳🇬',
};

const commonCities: Record<MarketCode, string> = {
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
  const navigation = useNavigation();
  // Lê directamente do store: este ecrã CORRE quando `config` ainda é null,
  // pelo que não pode usar `useMarket()` (que faz throw nesse caso).
  const setMarket = useMarketStore((s) => s.setMarket);
  const activeCode = useMarketStore((s) => s.config?.code);

  const handleSelect = async (marketCode: MarketCode) => {
    const selected = getAllMarkets().find((market) => market.code === marketCode);
    if (!selected) return;

    await setMarket(marketCode);
    i18n.changeLanguage(languageForMarket(marketCode));

    if (onSelect) {
      await onSelect(marketCode);
    } else {
      navigation.navigate('PhoneInput' as never);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Escolhe o teu mercado</Text>
      {getAllMarkets().map((market) => {
        const active = market.code === activeCode;
        return (
          <TouchableOpacity
            key={market.code}
            style={[styles.optionCard, active && styles.activeCard]}
            onPress={() => handleSelect(market.code)}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.flag}>{flags[market.code]}</Text>
              <Text style={styles.marketLabel}>{market.name}</Text>
            </View>
            <Text style={styles.marketMeta}>{commonCities[market.code]} · {market.phonePrefix}</Text>
            {active && <Text style={styles.activeText}>Activo</Text>}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  activeCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  marketLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  marketMeta: {
    color: '#6B7280',
    marginBottom: 8,
  },
  activeText: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
