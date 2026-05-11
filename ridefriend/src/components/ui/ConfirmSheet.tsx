// Ficheiro: src/components/ui/ConfirmSheet.tsx | Função: bottom sheet de confirmação (P0 v2.1)
// Ref. mockup: .sheet + .sheet-overlay no ridefriend.html
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '@constants/theme';
import { useUiHostStore } from '@store/uiHostStore';

export default function ConfirmSheetHost() {
  const confirm = useUiHostStore((s) => s.confirm);
  const hideConfirm = useUiHostStore((s) => s.hideConfirm);
  const [submitting, setSubmitting] = useState(false);

  if (!confirm) return null;

  const handleCancel = () => {
    confirm.onCancel?.();
    hideConfirm();
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirm.onConfirm();
    } finally {
      setSubmitting(false);
      hideConfirm();
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{confirm.title}</Text>
          {confirm.message ? <Text style={styles.message}>{confirm.message}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>{confirm.cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                confirm.destructive && styles.destructive,
                pressed && styles.pressed,
              ]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              <Text style={styles.confirmText}>{confirm.confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,31,56,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.soraBold,
    fontSize: 20,
    color: COLORS.text,
  },
  message: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.text,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  destructive: {
    backgroundColor: COLORS.red,
  },
  confirmText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
