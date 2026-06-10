// Ficheiro: src/components/network/ContactActionsSheet.tsx | Função: bottom sheet com acções Ligar / SMS / WhatsApp
// Ref. mockup: popover anexa ao ícone de telefone na linha de contacto.
import React, { useCallback } from 'react';
import { Linking, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';

interface Props {
  visible: boolean;
  contactName: string;
  contactPhone: string;
  onClose: () => void;
}

export default function ContactActionsSheet({
  visible,
  contactName,
  contactPhone,
  onClose,
}: Props) {
  const dial = useCallback(
    async (scheme: 'tel' | 'sms' | 'whatsapp') => {
      const phone = contactPhone.replace(/[^+\d]/g, '');
      let url: string;
      if (scheme === 'tel') url = `tel:${phone}`;
      else if (scheme === 'sms') url = `sms:${phone}`;
      else url = `whatsapp://send?phone=${phone.replace(/^\+/, '')}`;

      try {
        const can = await Linking.canOpenURL(url);
        if (can) {
          await Linking.openURL(url);
          onClose();
          return;
        }
      } catch {
        // continua para fallback
      }

      if (scheme === 'whatsapp') {
        try {
          await Linking.openURL(`https://wa.me/${phone.replace(/^\+/, '')}`);
          onClose();
          return;
        } catch {
          /* ignora */
        }
      }

      try {
        await Share.share({ message: `${contactName}: ${contactPhone}` });
      } catch {
        /* utilizador cancelou */
      }
      onClose();
    },
    [contactPhone, contactName, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} numberOfLines={1}>
            {contactName}
          </Text>

          <ActionRow
            icon={<Ionicons name="call" size={18} color={COLORS.navy} />}
            label="Ligar"
            onPress={() => dial('tel')}
          />
          <ActionRow
            icon={<Ionicons name="chatbubble" size={18} color={COLORS.navy} />}
            label="SMS"
            onPress={() => dial('sms')}
          />
          <ActionRow
            icon={<FontAwesome name="whatsapp" size={20} color="#25D366" />}
            label="WhatsApp"
            onPress={() => dial('whatsapp')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ActionRow({ icon, label, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    width: 28,
  },
  label: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 15,
  },
  overlay: {
    backgroundColor: 'rgba(13,31,56,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: { backgroundColor: COLORS.gray100 },
  row: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 28,
    paddingHorizontal: 6,
    paddingTop: 14,
  },
  title: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    color: COLORS.text3,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    marginBottom: 6,
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
});
