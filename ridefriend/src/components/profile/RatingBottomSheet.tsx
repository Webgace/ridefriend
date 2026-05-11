// Ficheiro: src/components/profile/RatingBottomSheet.tsx | Função: avaliar contraparte após boleia (P10)
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { COLORS, FONTS } from '@constants/theme';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';

const STORAGE = new MMKV({ id: 'ridefriend-ratings' });
const KEY_PREFIX = 'rated:';

const SUGGESTIONS = ['Pontual', 'Simpático', 'Carro limpo', 'Boa conversa'] as const;

interface Props {
  visible: boolean;
  rideId: string | null;
  rated: { id: string; name: string } | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

/**
 * hasRated — verifica se já existe registo local para evitar mostrar o sheet outra vez.
 */
export function hasRated(rideId: string): boolean {
  return STORAGE.getBoolean(`${KEY_PREFIX}${rideId}`) === true;
}

export function markRated(rideId: string): void {
  STORAGE.set(`${KEY_PREFIX}${rideId}`, true);
}

export default function RatingBottomSheet({
  visible,
  rideId,
  rated,
  onClose,
  onSubmitted,
}: Props) {
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fullComment = useMemo(() => {
    const tagText = Array.from(tags).join(' · ');
    return [tagText, comment.trim()].filter(Boolean).join(' — ');
  }, [tags, comment]);

  const reset = useCallback(() => {
    setScore(0);
    setComment('');
    setTags(new Set());
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!user || !rated || !rideId) return;
    if (score < 1 || score > 5) {
      showToast({ message: 'Selecciona pelo menos 1 estrela.', tone: 'info' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('ratings').insert({
        ride_id: rideId,
        rater_id: user.id,
        rated_id: rated.id,
        score,
        comment: fullComment.length > 0 ? fullComment : null,
      });
      if (error) {
        if (error.code === '23505') {
          markRated(rideId);
          showToast({ message: 'Já tinhas avaliado esta boleia.', tone: 'info' });
        } else {
          throw error;
        }
      } else {
        markRated(rideId);
        showToast({ message: 'Avaliação enviada. Obrigado!', tone: 'success' });
        onSubmitted?.();
      }
      reset();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao enviar avaliação.';
      showToast({ message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [user, rated, rideId, score, fullComment, showToast, onClose, onSubmitted, reset]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Como foi a boleia?</Text>
          {rated ? <Text style={styles.subtitle}>com {rated.name}</Text> : null}

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setScore(n)}
                style={({ pressed }) => [styles.star, pressed && styles.starPressed]}
              >
                <Text style={[styles.starText, n <= score && styles.starTextActive]}>★</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tagsRow}>
            {SUGGESTIONS.map((tag) => {
              const active = tags.has(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            placeholder="Comentário (opcional)"
            placeholderTextColor={COLORS.text3}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            style={styles.input}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostText}>Mais tarde</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || score === 0}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.pressed,
                (submitting || score === 0) && styles.disabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Avaliar {rated?.name ?? ''}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(13,31,56,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 32,
    gap: 14,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200 },
  title: { fontFamily: FONTS.soraBold, fontSize: 20, color: COLORS.text },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2, marginTop: -10 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { padding: 4 },
  starPressed: { transform: [{ scale: 0.92 }] },
  starText: { fontFamily: FONTS.soraBold, fontSize: 40, color: COLORS.gray300 },
  starTextActive: { color: COLORS.amber },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
  },
  tagActive: { backgroundColor: COLORS.navy },
  tagText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },
  tagTextActive: { color: COLORS.white },

  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: COLORS.gray100 },
  btnGhostText: { color: COLORS.text2, fontFamily: FONTS.soraBold, fontSize: 13 },
  btnPrimary: { backgroundColor: COLORS.navy },
  btnPrimaryText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.9 },
});
