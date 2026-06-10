// Ficheiro: src/screens/network/NetworkScreen.tsx | Função: rede com hero card + acções por linha (Ligar/Convidar/Editar)
// Ref. mockup: ecrã "A Tua Rede" com cartão navy + listagem por grupo + 3 acções por contacto.
import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useContacts, ContactRow } from '@hooks/useContacts';
import { useLocation } from '@hooks/useLocation';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import AvatarBadge from '@components/ui/AvatarBadge';
import SOSButton from '@components/ui/SOSButton';
import SOSConfirmSheet from '@components/sos/SOSConfirmSheet';
import AddContactSheet from '@components/network/AddContactSheet';
import EditContactSheet from '@components/network/EditContactSheet';
import ContactActionsSheet from '@components/network/ContactActionsSheet';
import { ContactGroup } from '@types/index';
import { getInviteUrl } from '@utils/invite';

const GROUP_ORDER: ContactGroup[] = ['family', 'friend', 'colleague', 'neighbour'];
const GROUP_LABEL: Record<ContactGroup, string> = {
  family: 'FAMÍLIA',
  friend: 'AMIGOS',
  colleague: 'COLEGAS',
  neighbour: 'VIZINHOS',
};

export default function NetworkScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { myLocation } = useLocation();
  const myCoords = useMemo(
    () => (myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null),
    [myLocation],
  );
  const { contacts, byGroup, isLoading, refresh, removeContact, updateContact } =
    useContacts(myCoords);

  const showConfirm = useUiHostStore((s) => s.showConfirm);
  const showToast = useUiHostStore((s) => s.showToast);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContactRow | null>(null);
  const [actionsTarget, setActionsTarget] = useState<ContactRow | null>(null);
  const [sosOpen, setSosOpen] = useState(false);

  const activeCount = contacts.filter((c) => c.status !== 'offline').length;
  const inviteUrl = getInviteUrl(user?.id);

  const handleInvite = useCallback(
    async (c: ContactRow) => {
      if (c.hasAccount) {
        showToast({
          message: `${c.name} já está no RideFriend.`,
          tone: 'info',
        });
        return;
      }
      const phone = c.phone.replace(/[^+\d]/g, '').replace(/^\+/, '');
      const text = `Olá ${c.name}! Junta-te à minha rede no RideFriend: ${inviteUrl}`;
      const wa = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
      try {
        const can = await Linking.canOpenURL(wa);
        if (can) {
          await Linking.openURL(wa);
          return;
        }
      } catch {
        // continua para fallback
      }
      try {
        await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
        return;
      } catch {
        // continua para fallback
      }
      try {
        await Share.share({ message: text });
      } catch {
        /* utilizador cancelou */
      }
    },
    [inviteUrl, showToast],
  );

  const handleSaveEdit = useCallback(
    async (patch: { name: string; phone: string; group: ContactGroup }) => {
      if (!editTarget) return;
      try {
        await updateContact(editTarget.id, patch);
        showToast({ message: 'Contacto actualizado.', tone: 'success' });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao actualizar.';
        showToast({ message, tone: 'error' });
        throw e;
      }
    },
    [editTarget, updateContact, showToast],
  );

  const handleRemoveFromEdit = useCallback(() => {
    if (!editTarget) return;
    const c = editTarget;
    showConfirm({
      title: 'Remover contacto?',
      message: `${c.name} deixará de ver a tua localização.`,
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          await removeContact(c.id);
          showToast({ message: 'Contacto removido.', tone: 'success' });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Falha ao remover.';
          showToast({ message, tone: 'error' });
        }
      },
    });
  }, [editTarget, removeContact, showConfirm, showToast]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="people" size={26} color={COLORS.amber} />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>A Tua Rede</Text>
            <Text style={styles.heroSub}>
              {contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'} · {activeCount}{' '}
              agora {activeCount === 1 ? 'activo' : 'activos'}
            </Text>
          </View>
          <Pressable
            onPress={() => setAddOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Adicionar contacto"
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Ionicons name="person-add" size={14} color={COLORS.white} />
            <Text style={styles.addBtnText}>Adicionar</Text>
          </Pressable>
        </View>

        {GROUP_ORDER.map((g) => {
          const list = byGroup[g];
          if (list.length === 0) return null;
          return (
            <View key={g} style={styles.section}>
              <Text style={styles.sectionTitle}>{GROUP_LABEL[g]}</Text>
              <View style={styles.rowList}>
                {list.map((c) => (
                  <ContactRowView
                    key={c.id}
                    contact={c}
                    onCallPress={() => setActionsTarget(c)}
                    onInvitePress={() => handleInvite(c)}
                    onMorePress={() => setEditTarget(c)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {contacts.length === 0 && !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ainda não tens contactos.</Text>
            <Text style={styles.emptyBody}>Toca em "Adicionar" para começar.</Text>
          </View>
        ) : null}
      </ScrollView>

      <SOSButton onLongPress={() => setSosOpen(true)} />

      <SOSConfirmSheet
        visible={sosOpen}
        myLocation={myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null}
        onClose={() => setSosOpen(false)}
        onConfigureContact={() => navigation.navigate('EmergencyContact')}
      />

      <AddContactSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          void refresh();
        }}
      />

      <EditContactSheet
        visible={editTarget !== null}
        contact={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        onRemove={handleRemoveFromEdit}
      />

      <ContactActionsSheet
        visible={actionsTarget !== null}
        contactName={actionsTarget?.name ?? ''}
        contactPhone={actionsTarget?.phone ?? ''}
        onClose={() => setActionsTarget(null)}
      />
    </SafeAreaView>
  );
}

interface RowProps {
  contact: ContactRow;
  onCallPress: () => void;
  onInvitePress: () => void;
  onMorePress: () => void;
}

function ContactRowView({ contact, onCallPress, onInvitePress, onMorePress }: RowProps) {
  const hasAccount = contact.hasAccount;
  const statusLine = hasAccount
    ? contact.status === 'offline'
      ? 'Sem partilha agora'
      : `Disponível${contact.distanceKm !== null ? ` · ${contact.distanceKm.toFixed(1)} km` : ''}`
    : 'Ainda não está na app';

  return (
    <View style={styles.row}>
      <AvatarBadge name={contact.name} group={contact.group} status={contact.status} />

      <View style={styles.rowBody}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {contact.name}
          </Text>
          {hasAccount ? (
            <View style={styles.badgeJoined}>
              <Ionicons name="checkmark-circle" size={11} color="#047857" />
              <Text style={styles.badgeJoinedText}>No RideFriend</Text>
            </View>
          ) : (
            <View style={styles.badgePhantom}>
              <Text style={styles.badgePhantomText}>Sem conta</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {statusLine}
        </Text>
      </View>

      <View style={styles.actions}>
        <ActionButton onPress={onCallPress} accessibilityLabel={`Contactar ${contact.name}`}>
          <Ionicons name="call" size={15} color={COLORS.navy} />
        </ActionButton>
        <ActionButton
          onPress={onInvitePress}
          accessibilityLabel={
            hasAccount
              ? `${contact.name} já está no RideFriend`
              : `Convidar ${contact.name} via WhatsApp`
          }
          tint={hasAccount ? undefined : 'amber'}
          dim={hasAccount}
        >
          <Ionicons
            name="person-add"
            size={15}
            color={hasAccount ? COLORS.text3 : COLORS.white}
          />
        </ActionButton>
        <ActionButton onPress={onMorePress} accessibilityLabel={`Editar ${contact.name}`}>
          <Ionicons name="ellipsis-vertical" size={15} color={COLORS.navy} />
        </ActionButton>
      </View>
    </View>
  );
}

interface ActionBtnProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  tint?: 'amber';
  dim?: boolean;
}

function ActionButton({ onPress, accessibilityLabel, children, tint, dim }: ActionBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.actionBtn,
        tint === 'amber' && styles.actionBtnAmber,
        dim && styles.actionBtnDim,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionBtnAmber: { backgroundColor: COLORS.amber },

  actionBtnDim: { opacity: 0.55 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  addBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
  },
  badgeJoined: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeJoinedText: {
    color: '#047857',
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
  },
  badgePhantom: {
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  badgePhantomText: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
  },
  empty: { alignItems: 'center', gap: 4, paddingVertical: 32 },
  emptyBody: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 13 },

  emptyTitle: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 15 },
  hero: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroBody: { flex: 1, gap: 2 },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.18)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
  },
  heroTitle: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 18 },
  pressed: { opacity: 0.85 },
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowBody: { flex: 1, gap: 4 },

  rowList: { gap: 8 },
  rowMeta: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
  },
  rowName: {
    color: COLORS.text,
    flexShrink: 1,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  rowNameLine: { alignItems: 'center', flexDirection: 'row', gap: 6 },

  safe: { backgroundColor: COLORS.surface, flex: 1 },
  scroll: { gap: 4, padding: 16, paddingBottom: 120 },
  section: { gap: 8, marginBottom: 12 },

  sectionTitle: {
    color: COLORS.text2,
    fontFamily: FONTS.soraBold,
    fontSize: 12,
    letterSpacing: 0.08 * 12,
    paddingHorizontal: 4,
  },
});
