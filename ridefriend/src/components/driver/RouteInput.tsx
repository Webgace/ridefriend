// Ficheiro: src/components/driver/RouteInput.tsx | Função: modal de pesquisa de destino com Nominatim/Google (P6)
// Ref. mockup: layout "MODO MOTORISTA — Route Input" no RideFriend_Design_Reference.txt
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { searchAddress } from '@services/geocoding.service';
import { GeoResult } from '@types/index';

const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

interface Props {
  visible: boolean;
  nearLat: number | null;
  nearLng: number | null;
  recents: GeoResult[];
  onSelect: (geo: GeoResult) => void;
  onClose: () => void;
}

export default function RouteInput({
  visible,
  nearLat,
  nearLng,
  recents,
  onSelect,
  onClose,
}: Props) {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce 500ms — alinhado com o spec do P6.
  useEffect(() => {
    if (!visible) return;
    if (query.trim().length < MIN_QUERY_LENGTH || nearLat === null || nearLng === null) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const found = await searchAddress(query.trim(), nearLat, nearLng);
        setResults(found);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, nearLat, nearLng, visible]);

  // Reset ao fechar — evita flash de resultados antigos quando reabre.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  const data = query.trim().length >= MIN_QUERY_LENGTH ? results : recents;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('driver_route_label')}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>{tCommon('close')}</Text>
            </Pressable>
          </View>
          <TextInput
            placeholder={t('driver_route_search_hint')}
            placeholderTextColor={COLORS.text3}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            autoFocus
          />
          {query.trim().length < MIN_QUERY_LENGTH && recents.length > 0 ? (
            <Text style={styles.section}>{t('driver_route_recents')}</Text>
          ) : null}
          {loading ? <ActivityIndicator color={COLORS.navy} style={styles.loading} /> : null}
          <FlatList
            data={data}
            keyExtractor={(item, idx) => `${item.lat},${item.lng}-${idx}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.name} numberOfLines={1}>
                  {item.shortName || item.displayName}
                </Text>
                {item.shortName && item.shortName !== item.displayName ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  close: { color: COLORS.amber, fontFamily: FONTS.bodySemi, fontSize: 14 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loading: { marginVertical: 12 },
  meta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  name: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  overlay: { backgroundColor: 'rgba(13,31,56,0.45)', flex: 1, justifyContent: 'flex-end' },
  pressed: { opacity: 0.85 },
  row: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  section: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    marginTop: 14,
  },
  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 16 },
});
