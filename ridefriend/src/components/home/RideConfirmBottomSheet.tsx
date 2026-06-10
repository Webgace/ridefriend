// Ficheiro: src/components/home/RideConfirmBottomSheet.tsx | Função: bottom sheet de confirmação de boleia (P5)
// Ref. mockup: .sheet + .sheet-overlay no ridefriend.html
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, FONTS, RELATION_COLORS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { NearbyDriver } from '@types/index';
import AvatarBadge from '@components/ui/AvatarBadge';
import ETABadge from '@components/ui/ETABadge';
import ApproachBar from '@components/ui/ApproachBar';

interface Props {
  visible: boolean;
  driver: NearbyDriver | null;
  stopName: string | null;
  destinationArea?: string;
  onCancel: () => void;
  onConfirm: (driver: NearbyDriver, message: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const APPROACH_MAX_MIN = 5;

export default function RideConfirmBottomSheet({
  visible,
  driver,
  stopName,
  destinationArea,
  onCancel,
  onConfirm,
  isSubmitting,
}: Props) {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');
  const [message, setMessage] = useState('');

  // Pré-preencher mensagem ao abrir o sheet com base na paragem + zona destino.
  useEffect(() => {
    if (visible && driver) {
      setMessage(
        t('ride_request_message', {
          stop: stopName ?? '...',
          area: destinationArea ?? '...',
        }),
      );
    }
  }, [visible, driver, stopName, destinationArea, t]);

  const approach = useMemo(() => {
    if (!driver) return 0;
    if (driver.eta <= 0) return 1;
    if (driver.eta >= APPROACH_MAX_MIN) return 0;
    return 1 - driver.eta / APPROACH_MAX_MIN;
  }, [driver]);

  if (!driver) return null;

  const palette = RELATION_COLORS[driver.group];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={20}
          >
            <View style={styles.handle} />

            <Text style={styles.title}>{t('ride_confirm_title')}</Text>

            <View style={styles.driverRow}>
              <AvatarBadge name={driver.name} group={driver.group} size={56} />
              <View style={styles.driverBody}>
                <View style={styles.headerRow}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {driver.name}
                  </Text>
                  <View style={[styles.tag, { backgroundColor: palette.bg }]}>
                    <Text style={[styles.tagText, { color: palette.fg }]}>
                      {t(`rel_${driver.group}` as 'rel_family')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>
                  {driver.distance < 1
                    ? t('distance_m', { n: Math.round(driver.distance * 1000) })
                    : t('distance_km', { n: driver.distance.toFixed(1) })}
                  {driver.vehicle?.plate ? ` · ${driver.vehicle.plate}` : ''}
                  {driver.vehicle?.model ? ` · ${driver.vehicle.model}` : ''}
                </Text>
                <View style={styles.etaRow}>
                  <ETABadge minutes={driver.eta} />
                  {driver.rating > 0 ? (
                    <Text style={styles.rating}>★ {driver.rating.toFixed(1)}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <ApproachBar progress={approach} style={styles.approachBar} />

            <Text style={styles.label}>{tCommon('message')}</Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder={t('ride_request_message', { stop: '...', area: '...' })}
              placeholderTextColor={COLORS.text3}
            />

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                onPress={onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>{tCommon('cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
                onPress={() => onConfirm(driver, message.trim())}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmText}>
                  {isSubmitting ? '...' : t('confirm_ride')}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  approachBar: {
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    flex: 1,
    paddingVertical: 14,
  },
  cancelText: {
    color: COLORS.text,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    flex: 1,
    paddingVertical: 14,
  },
  confirmText: {
    color: COLORS.white,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  driverBody: {
    flex: 1,
    gap: 4,
  },
  driverMeta: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
  },
  driverName: {
    color: COLORS.text,
    flexShrink: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 16,
  },
  driverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  etaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 36,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    minHeight: 80,
    padding: 14,
    textAlignVertical: 'top',
  },
  label: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  overlay: {
    backgroundColor: 'rgba(13,31,56,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.85,
  },
  rating: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 14,
    padding: 20,
    paddingBottom: 32,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 22,
  },
});
