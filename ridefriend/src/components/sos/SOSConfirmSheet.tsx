// Ficheiro: src/components/sos/SOSConfirmSheet.tsx | Função: bottom sheet com contagem regressiva 5s + envio SOS (P8)
// Ref. mockup: layout "SOS Confirm Sheet" no RideFriend_Design_Reference.txt
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useAuthStore } from '@store/authStore';
import { useMarketStore } from '@store/marketStore';
import { useEmergencyContactStore } from '@store/emergencyContactStore';
import { useUiHostStore } from '@store/uiHostStore';
import { triggerSos } from '@services/sos.service';

const COUNTDOWN_SECONDS = 5;

interface Props {
  visible: boolean;
  myLocation: { lat: number; lng: number } | null;
  rideId?: string | null;
  onClose: () => void;
  /** Quando o utilizador quer configurar um contacto de emergência. */
  onConfigureContact: () => void;
}

export default function SOSConfirmSheet({
  visible,
  myLocation,
  rideId,
  onClose,
  onConfigureContact,
}: Props) {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');
  const { user } = useAuthStore();
  const { config } = useMarketStore();
  const contact = useEmergencyContactStore((s) => s.contact);
  const showToast = useUiHostStore((s) => s.showToast);

  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const fireSos = useCallback(
    async (testMode = false) => {
      if (!user || !myLocation || !contact || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
        await triggerSos({
          userId: user.id,
          userName: user.name,
          lat: myLocation.lat,
          lng: myLocation.lng,
          emergencyContact: contact,
          rideId: rideId ?? null,
          testMode,
        });
        showToast({
          message: testMode ? t('sos_test_mode') : t('sos_sent'),
          tone: 'success',
          durationMs: 4000,
        });
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : t('sos_failed');
        showToast({ message, tone: 'error', durationMs: 4000 });
        submittedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [user, myLocation, contact, rideId, showToast, onClose, t],
  );

  // Countdown — começa quando o sheet abre, dispara SOS automaticamente em 0s.
  useEffect(() => {
    if (!visible) {
      submittedRef.current = false;
      setSecondsLeft(COUNTDOWN_SECONDS);
      return;
    }
    if (!contact) return; // sem contacto de emergência, não há countdown
    setSecondsLeft(COUNTDOWN_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          fireSos(false).catch(() => null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible, contact, fireSos]);

  const handleCancel = () => {
    submittedRef.current = true; // bloqueia o auto-fire pendente
    onClose();
  };

  const policeNumber = config?.emergencyNumber ?? '112';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('sos_confirm_title')}</Text>

          {contact ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('sos_emergency_contact')}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {contact.name} · {contact.phone}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('sos_police_label', { number: policeNumber })}</Text>
              </View>
              <Text style={styles.countdown}>
                {t('sos_countdown', { seconds: secondsLeft })}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={handleCancel}
                  style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
                >
                  <Text style={styles.btnCancelText}>{tCommon('cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => fireSos(false)}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnSend,
                    pressed && styles.pressed,
                    submitting && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.btnSendText}>{t('sos_send_now')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.body}>{t('sos_no_contact')}</Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={handleCancel}
                  style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
                >
                  <Text style={styles.btnCancelText}>{tCommon('cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onClose();
                    onConfigureContact();
                  }}
                  style={({ pressed }) => [styles.btn, styles.btnSend, pressed && styles.pressed]}
                >
                  <Text style={styles.btnSendText}>{t('sos_no_contact_cta')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  body: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 14 },
  btn: { alignItems: 'center', borderRadius: 16, flex: 1, paddingVertical: 14 },
  btnCancel: { backgroundColor: COLORS.gray100 },
  btnCancelText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  btnSend: { backgroundColor: COLORS.red },
  btnSendText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 14 },
  countdown: {
    color: COLORS.amber,
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  overlay: { backgroundColor: 'rgba(13,31,56,0.55)', flex: 1, justifyContent: 'flex-end' },
  pressed: { opacity: 0.85 },
  row: { gap: 2 },
  rowLabel: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 12 },
  rowValue: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  title: { color: COLORS.red, fontFamily: FONTS.soraBold, fontSize: 20 },
});
