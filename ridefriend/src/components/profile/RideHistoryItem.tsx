// Ficheiro: src/components/profile/RideHistoryItem.tsx | Função: linha do historial expansível (P10)
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '@constants/theme';
import { RideHistoryRow } from '@hooks/useRideHistory';

interface Props {
  ride: RideHistoryRow;
}

const STATUS_LABEL: Record<RideHistoryRow['status'], string> = {
  requested: 'Pedida',
  accepted: 'Aceite',
  in_progress: 'Em curso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function Stars({ score, size = 12 }: { score: number; size?: number }) {
  return (
    <Text style={[styles.stars, { fontSize: size }]}>
      {'★'.repeat(score)}
      <Text style={styles.starsDim}>{'★'.repeat(Math.max(0, 5 - score))}</Text>
    </Text>
  );
}

export default function RideHistoryItem({ ride }: Props) {
  const [open, setOpen] = useState(false);
  const directionIcon = ride.role === 'passenger' ? '↘︎' : '↗︎';
  const otherName = ride.otherUser?.name ?? 'Utilizador removido';
  const date = formatDateTime(ride.createdAt);
  const distance = ride.distanceKm !== null ? `${ride.distanceKm.toFixed(1)} km` : '—';

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{directionIcon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {otherName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {ride.role === 'passenger' ? 'Boleia recebida' : 'Boleia dada'} · {date}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaTag}>{STATUS_LABEL[ride.status]}</Text>
          <Text style={styles.metaTag}>{distance}</Text>
          {ride.myRating ? (
            <View style={styles.ratingTag}>
              <Text style={styles.ratingTagLabel}>Tu</Text>
              <Stars score={ride.myRating.score} />
            </View>
          ) : null}
          {ride.receivedRating ? (
            <View style={styles.ratingTag}>
              <Text style={styles.ratingTagLabel}>Ele/a</Text>
              <Stars score={ride.receivedRating.score} />
            </View>
          ) : null}
        </View>

        {open ? (
          <View style={styles.expanded}>
            <Text style={styles.expandedLabel}>Origem</Text>
            <Text style={styles.expandedValue}>
              {ride.origin.lat.toFixed(4)}, {ride.origin.lng.toFixed(4)}
            </Text>
            {ride.destination ? (
              <>
                <Text style={styles.expandedLabel}>Destino</Text>
                <Text style={styles.expandedValue}>
                  {ride.destination.lat.toFixed(4)}, {ride.destination.lng.toFixed(4)}
                </Text>
              </>
            ) : null}
            {ride.startedAt ? (
              <>
                <Text style={styles.expandedLabel}>Início</Text>
                <Text style={styles.expandedValue}>{formatDateTime(ride.startedAt)}</Text>
              </>
            ) : null}
            {ride.endedAt ? (
              <>
                <Text style={styles.expandedLabel}>Fim</Text>
                <Text style={styles.expandedValue}>{formatDateTime(ride.endedAt)}</Text>
              </>
            ) : null}
            {ride.myRating?.comment ? (
              <>
                <Text style={styles.expandedLabel}>O teu comentário</Text>
                <Text style={styles.expandedValue}>{ride.myRating.comment}</Text>
              </>
            ) : null}
            {ride.receivedRating?.comment ? (
              <>
                <Text style={styles.expandedLabel}>Comentário sobre ti</Text>
                <Text style={styles.expandedValue}>{ride.receivedRating.comment}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 4 },
  expanded: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
  },
  expandedLabel: { color: COLORS.text3, fontFamily: FONTS.bodySemi, fontSize: 11, marginTop: 4 },
  expandedValue: { color: COLORS.text, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  iconBox: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconText: { color: COLORS.navy, fontFamily: FONTS.soraBold, fontSize: 18 },
  meta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  metaTag: {
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  name: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  pressed: { opacity: 0.92 },
  ratingTag: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingTagLabel: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 11 },

  row: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  stars: { color: COLORS.amber, fontFamily: FONTS.soraBold },
  starsDim: { color: COLORS.gray300 },
});
