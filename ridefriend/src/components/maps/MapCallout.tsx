// Ficheiro: src/components/maps/MapCallout.tsx | Função: bottom card com info do contacto seleccionado no mapa (P7)
// Ref. mockup: callout do marcador no RideFriend_Design_Reference.txt
// Nota: implementado como card sobreposto (não como <Callout/> nativo) para suportar interacções complexas.
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RelationGroup } from '@constants/theme';
import { useT } from '@hooks/useT';
import { formatDistance } from '@utils/geo';
import AvatarBadge from '@components/ui/AvatarBadge';
import ETABadge from '@components/ui/ETABadge';
import type { MapMarkerData } from '@hooks/useMapData';

interface Props {
  marker: MapMarkerData;
  onPrimaryAction: (marker: MapMarkerData) => void;
  onClose: () => void;
}

export default function MapCallout({ marker, onPrimaryAction, onClose }: Props) {
  const { t } = useT('ride');

  const isContact = marker.type === 'driver' || marker.type === 'passenger';
  const group = (marker.driver?.group ?? marker.passenger?.group) as RelationGroup | undefined;
  const distanceKm = marker.driver?.distance ?? marker.passenger?.distance;
  const phone = marker.driver?.phone ?? marker.passenger?.phone;

  const relationLabel = group ? t(`rel_${group}` as 'rel_family') : null;

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => null);
  };

  const primaryLabel = marker.type === 'driver'
    ? t('request_ride')
    : marker.type === 'passenger'
      ? t('offer_ride')
      : t('map_request_or_offer');

  return (
    <View style={styles.card}>
      <Pressable accessibilityLabel="close" onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <View style={styles.row}>
        {isContact && group ? (
          <AvatarBadge name={marker.name} group={group} size={48} />
        ) : (
          <View style={styles.fallbackAvatar}>
            <Text style={styles.fallbackInitial}>
              {(marker.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{marker.name}</Text>
          <View style={styles.metaRow}>
            {relationLabel ? <Text style={styles.meta}>{relationLabel}</Text> : null}
            {typeof distanceKm === 'number' ? (
              <Text style={styles.meta}>· {formatDistance(distanceKm)}</Text>
            ) : null}
          </View>
          {typeof marker.eta === 'number' ? (
            <ETABadge minutes={marker.eta} style={styles.etaBadge} />
          ) : null}
        </View>
      </View>

      {isContact ? (
        <View style={styles.actions}>
          <Pressable
            onPress={handleCall}
            disabled={!phone}
            style={({ pressed }) => [
              styles.btn,
              styles.btnSecondary,
              pressed && styles.pressed,
              !phone && styles.btnDisabled,
            ]}
          >
            <Text style={styles.btnSecondaryText}>{t('call')}</Text>
          </Pressable>
          <Pressable
            onPress={() => onPrimaryAction(marker)}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  btn: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 12 },
  btnDisabled: { opacity: 0.5 },
  btnPrimary: { backgroundColor: COLORS.amber },
  btnPrimaryText: { color: COLORS.navy, fontFamily: FONTS.soraBold, fontSize: 14 },
  btnSecondary: { backgroundColor: COLORS.gray100 },
  btnSecondaryText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    bottom: 24,
    elevation: 8,
    gap: 14,
    left: 16,
    padding: 16,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  closeBtn: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 8,
    width: 28,
  },
  closeText: {
    color: COLORS.text2,
    fontFamily: FONTS.soraBold,
    fontSize: 20,
    lineHeight: 22,
  },
  etaBadge: { marginTop: 4 },
  fallbackAvatar: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  fallbackInitial: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 18 },
  info: { flex: 1, gap: 2 },
  meta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  name: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 16 },
  pressed: { opacity: 0.85 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
