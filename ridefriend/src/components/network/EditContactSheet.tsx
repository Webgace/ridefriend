// Ficheiro: src/components/network/EditContactSheet.tsx | Função: bottom sheet "Editar contacto" (nome, telefone, relação) + remover
// Ref. mockup: modal "Editar contacto" — accionado pelo ⋮ na linha de contacto.
// Nota: nome/telefone editáveis aplicam-se como alcunha local (MMKV); a relação persiste em Supabase.
import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { ContactRow } from '@hooks/useContacts';
import type { ContactGroup } from '../../types';

interface Props {
  visible: boolean;
  contact: ContactRow | null;
  onClose: () => void;
  onSave: (patch: { name: string; phone: string; group: ContactGroup }) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}

const GROUPS: { value: ContactGroup; label: string }[] = [
  { value: 'family', label: 'Família' },
  { value: 'friend', label: 'Amigo' },
  { value: 'colleague', label: 'Colega' },
  { value: 'neighbour', label: 'Vizinho' },
];

export default function EditContactSheet({ visible, contact, onClose, onSave, onRemove }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState<ContactGroup>('friend');
  const [groupOpen, setGroupOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setGroup(contact.group);
      setGroupOpen(false);
    }
  }, [visible, contact]);

  if (!contact) return null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSave({ name, phone, group });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onRemove();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const activeGroupLabel = GROUPS.find((g) => g.value === group)?.label ?? '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Editar contacto</Text>
                <Text style={styles.subtitle}>Actualiza dados, muda a relação ou remove.</Text>
              </View>
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
              <Field label="Nome">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome"
                  placeholderTextColor={COLORS.text3}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Telefone">
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+244 ..."
                  placeholderTextColor={COLORS.text3}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label="Relação">
                <Pressable
                  onPress={() => setGroupOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel="Escolher relação"
                  style={({ pressed }) => [styles.input, styles.dropdown, pressed && styles.pressed]}
                >
                  <Text style={styles.dropdownText}>{activeGroupLabel}</Text>
                  <Ionicons
                    name={groupOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.text2}
                  />
                </Pressable>
                {groupOpen ? (
                  <View style={styles.dropdownMenu}>
                    {GROUPS.map((g) => {
                      const active = g.value === group;
                      return (
                        <Pressable
                          key={g.value}
                          onPress={() => {
                            setGroup(g.value);
                            setGroupOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {g.label}
                          </Text>
                          {active ? (
                            <Ionicons name="checkmark" size={16} color={COLORS.navy} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </Field>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={handleRemove}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Remover contacto"
                style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                <Text style={styles.removeBtnText}>Remover</Text>
              </Pressable>

              <View style={styles.footerRight}>
                <Pressable
                  onPress={onClose}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Guardar"
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  cancelBtn: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  cancelBtnText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 13 },
  closeBtn: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    marginLeft: 8,
    width: 30,
  },
  dropdown: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: { backgroundColor: '#F1F5FB' },
  dropdownItemText: { color: COLORS.text, fontFamily: FONTS.bodyRegular, fontSize: 14 },

  dropdownItemTextActive: { color: COLORS.navy, fontFamily: FONTS.soraBold },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownText: { color: COLORS.text, fontFamily: FONTS.bodyRegular, fontSize: 14 },
  field: { gap: 6 },
  fieldLabel: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 13 },
  flex: { flex: 1 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 14,
  },
  footerRight: { flexDirection: 'row', gap: 8 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: { flex: 1, gap: 2 },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  overlay: {
    backgroundColor: 'rgba(13,31,56,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: { opacity: 0.85 },

  removeBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  removeBtnText: { color: COLORS.red, fontFamily: FONTS.soraBold, fontSize: 13 },

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
    paddingTop: 18,
  },
  subtitle: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },

  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 18 },
});
