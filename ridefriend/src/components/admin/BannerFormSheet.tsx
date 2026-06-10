// Ficheiro: src/components/admin/BannerFormSheet.tsx | Função: bottom sheet criar/editar banner
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import type { Banner } from '@hooks/useBanners';
import type { MarketCode } from '../../types';

const MARKET_OPTIONS: { value: MarketCode | null; label: string }[] = [
  { value: null, label: 'Global' },
  { value: 'ao', label: 'Angola' },
  { value: 'mz', label: 'Moçambique' },
  { value: 'br', label: 'Brasil' },
  { value: 'cv', label: 'Cabo Verde' },
  { value: 'pt', label: 'Portugal' },
  { value: 'ng', label: 'Nigéria' },
];

interface Props {
  visible: boolean;
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BannerFormSheet({ visible, banner, onClose, onSaved }: Props) {
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [marketCode, setMarketCode] = useState<MarketCode | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (banner) {
      setTitle(banner.title);
      setBody(banner.body ?? '');
      setImageUrl(banner.imageUrl ?? '');
      setCtaLabel(banner.ctaLabel ?? '');
      setCtaUrl(banner.ctaUrl ?? '');
      setMarketCode((banner.marketCode as MarketCode | null) ?? null);
      setStartsAt(banner.startsAt ?? '');
      setEndsAt(banner.endsAt ?? '');
      setPriority(String(banner.priority));
      setIsActive(banner.isActive);
    } else {
      setTitle('');
      setBody('');
      setImageUrl('');
      setCtaLabel('');
      setCtaUrl('');
      setMarketCode(null);
      setStartsAt('');
      setEndsAt('');
      setPriority('0');
      setIsActive(true);
    }
  }, [visible, banner]);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast({ message: 'Título obrigatório.', tone: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim() || null,
        image_url: imageUrl.trim() || null,
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
        market_code: marketCode,
        starts_at: startsAt.trim() || null,
        ends_at: endsAt.trim() || null,
        priority: Number(priority) || 0,
        is_active: isActive,
      };
      let queryError;
      if (banner) {
        const { error } = await supabase
          .from('banners')
          .update(payload as never)
          .eq('id', banner.id);
        queryError = error;
      } else {
        const { error } = await supabase
          .from('banners')
          .insert({ ...payload, created_by: user?.id ?? null } as never);
        queryError = error;
      }
      if (queryError) throw queryError;
      showToast({ message: banner ? 'Banner actualizado.' : 'Banner criado.', tone: 'success' });
      onSaved();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao guardar.';
      showToast({ message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{banner ? 'Editar banner' : 'Novo banner'}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={COLORS.text2} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <Field label="Título" required>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                  placeholder="Ex.: Promoção de Setembro"
                  placeholderTextColor={COLORS.text3}
                />
              </Field>
              <Field label="Corpo (opcional)">
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Mensagem secundária"
                  placeholderTextColor={COLORS.text3}
                  multiline
                />
              </Field>
              <Field label="Imagem URL (opcional)">
                <TextInput
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="none"
                />
              </Field>
              <View style={styles.row2}>
                <Field label="CTA label" style={{ flex: 1 }}>
                  <TextInput
                    value={ctaLabel}
                    onChangeText={setCtaLabel}
                    style={styles.input}
                    placeholder="Saber mais"
                    placeholderTextColor={COLORS.text3}
                  />
                </Field>
                <Field label="CTA URL" style={{ flex: 1 }}>
                  <TextInput
                    value={ctaUrl}
                    onChangeText={setCtaUrl}
                    style={styles.input}
                    placeholder="https://..."
                    placeholderTextColor={COLORS.text3}
                    autoCapitalize="none"
                  />
                </Field>
              </View>

              <Field label="Mercado">
                <View style={styles.chipsRow}>
                  {MARKET_OPTIONS.map((opt) => {
                    const active = opt.value === marketCode;
                    return (
                      <Pressable
                        key={opt.label}
                        onPress={() => setMarketCode(opt.value)}
                        style={({ pressed }) => [
                          styles.chip,
                          active && styles.chipActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <View style={styles.row2}>
                <Field label="Inicia em (ISO)" style={{ flex: 1 }}>
                  <TextInput
                    value={startsAt}
                    onChangeText={setStartsAt}
                    style={styles.input}
                    placeholder="2026-06-01T00:00:00Z"
                    placeholderTextColor={COLORS.text3}
                    autoCapitalize="none"
                  />
                </Field>
                <Field label="Termina em (ISO)" style={{ flex: 1 }}>
                  <TextInput
                    value={endsAt}
                    onChangeText={setEndsAt}
                    style={styles.input}
                    placeholder="2026-06-30T00:00:00Z"
                    placeholderTextColor={COLORS.text3}
                    autoCapitalize="none"
                  />
                </Field>
              </View>

              <Field label="Prioridade (maior aparece primeiro)">
                <TextInput
                  value={priority}
                  onChangeText={setPriority}
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="number-pad"
                />
              </Field>

              <View style={styles.activeRow}>
                <Text style={styles.fieldLabel}>Activo</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: COLORS.gray300, true: COLORS.navy }}
                  thumbColor={COLORS.white}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.pressed,
                  submitting && styles.btnDisabled,
                ]}
              >
                <Text style={styles.saveBtnText}>{submitting ? 'A guardar...' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  required,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: { flex?: number };
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  activeRow: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  body: { gap: 12, paddingBottom: 8 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  cancelBtnText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 13 },
  chip: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },

  chipText: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 12 },
  chipTextActive: { color: COLORS.white },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  closeBtn: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  field: { gap: 6 },
  fieldLabel: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 12 },

  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    width: 40,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  inputMulti: { minHeight: 70, textAlignVertical: 'top' },

  overlay: { backgroundColor: 'rgba(13,31,56,0.35)', flex: 1, justifyContent: 'flex-end' },
  pressed: { opacity: 0.85 },
  row2: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  saveBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
  sheet: {
    backgroundColor: '#F4F6FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 18 },
});
