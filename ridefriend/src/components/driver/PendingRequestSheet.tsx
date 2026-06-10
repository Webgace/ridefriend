// Ficheiro: src/components/driver/PendingRequestSheet.tsx | Função: bottom sheet de pedido recebido pelo motorista (P6)
// Ref. mockup: layout "MODO MOTORISTA — Pedido com contador 90s" no RideFriend_Design_Reference.txt
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';

interface Props {
  name: string;
  area: string;
  expiresAt: number;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
}

export default function PendingRequestSheet({
  name,
  area,
  expiresAt,
  onAccept,
  onDecline,
}: Props) {
  const { t } = useT('ride');
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t('driver_request_pending_title')}</Text>
      <Text style={styles.body}>
        {t('driver_request_pending_body', { name, area })}
      </Text>
      <Text style={styles.expiry}>
        {t('driver_request_expires_in', { seconds: secondsLeft })}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onDecline}
          style={({ pressed }) => [styles.btn, styles.btnDecline, pressed && styles.pressed]}
        >
          <Text style={styles.btnDeclineText}>{t('driver_request_decline')}</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => [styles.btn, styles.btnAccept, pressed && styles.pressed]}
        >
          <Text style={styles.btnAcceptText}>{t('driver_request_accept')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  body: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 14 },
  btn: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 12 },
  btnAccept: { backgroundColor: COLORS.green },
  btnAcceptText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 14 },
  btnDecline: { backgroundColor: COLORS.gray100 },
  btnDeclineText: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  expiry: { color: COLORS.amber, fontFamily: FONTS.bodySemi, fontSize: 12 },
  pressed: { opacity: 0.85 },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    bottom: 24,
    elevation: 8,
    gap: 8,
    left: 16,
    padding: 18,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 16 },
});
