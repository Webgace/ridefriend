// Ficheiro: src/screens/network/NetworkScreen.tsx | Função: rede de contactos agrupada + filtros + swipe (P10)
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS, FONTS, RELATION_COLORS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useContacts, ContactRow } from '@hooks/useContacts';
import { useLocation } from '@hooks/useLocation';
import { useUiHostStore } from '@store/uiHostStore';
import AvatarBadge from '@components/ui/AvatarBadge';
import AddContactSheet from '@components/network/AddContactSheet';
import { ContactGroup } from '@types/index';

type Filter = 'all' | 'active' | 'drivers';

const GROUP_ORDER: ContactGroup[] = ['family', 'friend', 'colleague', 'neighbour'];
const GROUP_LABEL: Record<ContactGroup, string> = {
  family: 'Família',
  friend: 'Amigos',
  colleague: 'Colegas',
  neighbour: 'Vizinhos',
};

function statusLabel(c: ContactRow): string {
  if (c.status === 'offline') return 'Offline';
  const distance =
    c.distanceKm !== null ? ` · ${c.distanceKm.toFixed(1)} km` : '';
  if (c.status === 'busy') return `A caminho${distance}`;
  return `Disponível${distance}`;
}

export default function NetworkScreen() {
  const { t } = useT('common');
  const { myLocation } = useLocation();
  const myCoords = useMemo(
    () => (myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null),
    [myLocation],
  );
  const { contacts, byGroup, isLoading, refresh, removeContact } = useContacts(myCoords);
  const showConfirm = useUiHostStore((s) => s.showConfirm);
  const showToast = useUiHostStore((s) => s.showToast);

  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);

  const activeCount = contacts.filter((c) => c.status !== 'offline').length;

  const sections = useMemo(() => {
    const result: { title: string; data: ContactRow[] }[] = [];
    for (const g of GROUP_ORDER) {
      const list = byGroup[g].filter((c) => {
        if (filter === 'active') return c.status !== 'offline';
        if (filter === 'drivers') return c.isDriver;
        return true;
      });
      if (list.length > 0) result.push({ title: GROUP_LABEL[g], data: list });
    }
    return result;
  }, [byGroup, filter]);

  const handleRemove = useCallback(
    (c: ContactRow) => {
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
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Falha ao remover.';
            showToast({ message, tone: 'error' });
          }
        },
      });
    },
    [removeContact, showConfirm, showToast],
  );

  const renderRightActions = useCallback(
    (c: ContactRow) => (
      <Pressable
        onPress={() => handleRemove(c)}
        style={({ pressed }) => [styles.swipeAction, pressed && styles.swipeActionPressed]}
      >
        <Text style={styles.swipeActionText}>Remover</Text>
      </Pressable>
    ),
    [handleRemove],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rede</Text>
        <Text style={styles.subtitle}>
          {activeCount} {activeCount === 1 ? 'contacto activo agora' : 'contactos activos agora'}
        </Text>
      </View>

      <View style={styles.filters}>
        {(['all', 'active', 'drivers'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Motoristas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.navy} />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
            <View style={styles.row}>
              <AvatarBadge name={item.name} group={item.group} status={item.status} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {statusLabel(item)}
                </Text>
              </View>
              <View style={[styles.groupPill, { backgroundColor: RELATION_COLORS[item.group].bg }]}>
                <Text style={[styles.groupPillText, { color: RELATION_COLORS[item.group].fg }]}>
                  {GROUP_LABEL[item.group]}
                </Text>
              </View>
            </View>
          </Swipeable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {t('no_contacts') === 'no_contacts' ? 'Ainda não tens contactos.' : t('no_contacts')}
              </Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => setAddOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityLabel="Adicionar contacto"
      >
        <Text style={styles.fabText}>+ Adicionar Contacto</Text>
      </Pressable>

      <AddContactSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          void refresh();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingHorizontal: 20, paddingTop: 16, gap: 4 },
  title: { fontFamily: FONTS.soraBold, fontSize: 26, color: COLORS.text },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2 },

  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
  },
  filterChipActive: { backgroundColor: COLORS.navy },
  filterText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },
  filterTextActive: { color: COLORS.white },

  listContent: { padding: 16, paddingBottom: 120 },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 13,
    marginTop: 14,
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.text },
  rowMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },
  groupPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  groupPillText: { fontFamily: FONTS.bodySemi, fontSize: 11 },
  sep: { height: 8 },

  swipeAction: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginLeft: 8,
  },
  swipeActionPressed: { opacity: 0.85 },
  swipeActionText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },

  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 14 },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  fabText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
});
