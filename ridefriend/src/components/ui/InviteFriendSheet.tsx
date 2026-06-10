// Ficheiro: src/components/ui/InviteFriendSheet.tsx | Função: bottom sheet "Convidar Amigo" com QR + partilha social
// Nota: QR via `react-native-qrcode-svg` (lazy require); clipboard via `expo-clipboard` (lazy require).
// Ambos degradam de forma graciosa se o pacote não estiver instalado.
import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { getInviteUrl } from '@utils/invite';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ShareTarget = 'whatsapp' | 'facebook' | 'x' | 'instagram' | 'linkedin' | 'sms';

const INVITE_PROMPT = 'Junta-te à minha rede no RideFriend:';

export default function InviteFriendSheet({ visible, onClose }: Props) {
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const [refreshKey, setRefreshKey] = useState(0);

  const inviteUrl = useMemo(() => getInviteUrl(user?.id), [user?.id]);
  const shareMessage = `${INVITE_PROMPT} ${inviteUrl}`;

  const handleCopy = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('expo-clipboard');
      await mod.setStringAsync(inviteUrl);
      showToast({ message: 'Link copiado.', tone: 'success' });
    } catch {
      showToast({ message: 'Copiar indisponível neste dispositivo.', tone: 'error' });
    }
  }, [inviteUrl, showToast]);

  const openOrFallback = useCallback(
    async (primary: string, webFallback?: string) => {
      try {
        const can = await Linking.canOpenURL(primary);
        if (can) {
          await Linking.openURL(primary);
          return;
        }
      } catch {
        // ignora — tenta fallback
      }
      if (webFallback) {
        try {
          await Linking.openURL(webFallback);
          return;
        } catch {
          // continua para Share
        }
      }
      try {
        await Share.share({ message: shareMessage, url: inviteUrl });
      } catch {
        /* utilizador cancelou */
      }
    },
    [shareMessage, inviteUrl],
  );

  const handleShareTo = useCallback(
    (target: ShareTarget) => {
      const enc = encodeURIComponent;
      switch (target) {
        case 'whatsapp':
          return openOrFallback(
            `whatsapp://send?text=${enc(shareMessage)}`,
            `https://wa.me/?text=${enc(shareMessage)}`,
          );
        case 'facebook':
          return openOrFallback(`https://www.facebook.com/sharer/sharer.php?u=${enc(inviteUrl)}`);
        case 'x':
          return openOrFallback(`https://twitter.com/intent/tweet?text=${enc(shareMessage)}`);
        case 'linkedin':
          return openOrFallback(
            `https://www.linkedin.com/sharing/share-offsite/?url=${enc(inviteUrl)}`,
          );
        case 'sms':
          return openOrFallback(`sms:?body=${enc(shareMessage)}`);
        case 'instagram':
        default:
          // Instagram não aceita partilhar texto por URL — usa a folha nativa.
          return Share.share({ message: shareMessage, url: inviteUrl }).catch(() => null);
      }
    },
    [openOrFallback, shareMessage, inviteUrl],
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    showToast({ message: 'QR actualizado.', tone: 'info' });
  };

  let QRView: React.ReactNode;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('react-native-qrcode-svg').default;
    QRView = (
      <QRCode
        key={refreshKey}
        value={inviteUrl}
        size={196}
        color={COLORS.text}
        backgroundColor={COLORS.white}
      />
    );
  } catch {
    QRView = (
      <View style={styles.qrFallback}>
        <Text style={styles.qrFallbackText}>
          Instala `react-native-qrcode-svg` para gerar o QR.
        </Text>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Convidar Amigo</Text>

          <View style={styles.qrCard}>
            <View style={styles.qrWrap}>{QRView}</View>

            <View style={styles.urlRow}>
              <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
                {inviteUrl}
              </Text>
              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel="Copiar link"
                style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
              >
                <Ionicons name="copy-outline" size={13} color={COLORS.white} />
                <Text style={styles.copyBtnText}>Copiar</Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>Peça ao amigo para ler com a câmara</Text>

            <Pressable
              onPress={handleRefresh}
              accessibilityRole="button"
              accessibilityLabel="Recarregar QR"
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
            >
              <Ionicons name="refresh" size={14} color={COLORS.text} />
              <Text style={styles.refreshBtnText}>Recarregar QR</Text>
            </Pressable>
          </View>

          <View style={styles.sharesRow}>
            <ShareCircle
              bg="#25D366"
              label="WhatsApp"
              icon={<FontAwesome name="whatsapp" size={22} color={COLORS.white} />}
              onPress={() => handleShareTo('whatsapp')}
            />
            <ShareCircle
              bg="#1877F2"
              label="Facebook"
              icon={<FontAwesome name="facebook" size={20} color={COLORS.white} />}
              onPress={() => handleShareTo('facebook')}
            />
            <ShareCircle
              bg="#0F1419"
              label="X"
              icon={<Text style={styles.xMark}>𝕏</Text>}
              onPress={() => handleShareTo('x')}
            />
            <ShareCircle
              bg="#E1306C"
              label="Instagram"
              icon={<FontAwesome name="instagram" size={22} color={COLORS.white} />}
              onPress={() => handleShareTo('instagram')}
            />
            <ShareCircle
              bg="#0077B5"
              label="LinkedIn"
              icon={<FontAwesome name="linkedin" size={20} color={COLORS.white} />}
              onPress={() => handleShareTo('linkedin')}
            />
            <ShareCircle
              bg={COLORS.gray200}
              label="Copiar"
              iconTint={COLORS.text}
              icon={<Ionicons name="copy-outline" size={20} color={COLORS.text} />}
              onPress={handleCopy}
            />
            <ShareCircle
              bg="#9333EA"
              label="SMS"
              icon={<MaterialCommunityIcons name="message-text" size={20} color={COLORS.white} />}
              onPress={() => handleShareTo('sms')}
            />
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.closeBtnText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ShareCircleProps {
  bg: string;
  label: string;
  icon: React.ReactNode;
  iconTint?: string;
  onPress: () => void;
}

function ShareCircle({ bg, label, icon, iconTint, onPress }: ShareCircleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.shareItem, pressed && styles.pressed]}
    >
      <View style={[styles.shareCircle, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.shareLabel, iconTint ? { color: iconTint } : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#EEF1F8',
    borderRadius: 14,
    paddingVertical: 14,
  },
  closeBtnText: {
    color: COLORS.navy,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  copyBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },

  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 38,
  },
  hint: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  overlay: {
    backgroundColor: 'rgba(13,31,56,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: { opacity: 0.85 },

  qrCard: {
    alignItems: 'stretch',
    backgroundColor: '#EEF1F8',
    borderRadius: 20,
    gap: 12,
    padding: 16,
  },
  qrFallback: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    height: 196,
    justifyContent: 'center',
    padding: 16,
    width: 196,
  },
  qrFallbackText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },

  refreshBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  refreshBtnText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
  },
  shareCircle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  shareItem: {
    alignItems: 'center',
    gap: 5,
    width: 50,
  },
  shareLabel: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    maxWidth: 50,
  },
  sharesRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 14,
    paddingBottom: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 17,
    textAlign: 'center',
  },

  urlRow: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  urlText: {
    color: COLORS.text2,
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
  },

  xMark: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 18,
  },
});
