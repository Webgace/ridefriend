// Ficheiro: src/components/network/AddContactSheet.tsx | Função: bottom sheet com agenda / QR / pesquisa por número (P10)
// Nota: a leitura da agenda do telemóvel exige `expo-contacts`; o QR exige `react-native-qrcode-svg`.
// Esses imports são feitos lazy via require para que o ecrã funcione mesmo sem os pacotes instalados.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, FONTS, RELATION_COLORS } from '@constants/theme';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useMarket } from '@hooks/useMarket';
import { toE164 } from '@utils/phone';
import { ContactGroup } from '@types/index';

type Tab = 'agenda' | 'invite' | 'search';

const GROUPS: { value: ContactGroup; label: string }[] = [
  { value: 'family', label: 'Família' },
  { value: 'friend', label: 'Amigo' },
  { value: 'colleague', label: 'Colega' },
  { value: 'neighbour', label: 'Vizinho' },
];

interface AgendaContact {
  id: string;
  name: string;
  phones: string[];
}

interface PhoneMatch {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddContactSheet({ visible, onClose, onAdded }: Props) {
  const { user } = useAuthStore();
  const market = useMarket();
  const showToast = useUiHostStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('agenda');
  const [group, setGroup] = useState<ContactGroup>('friend');

  const [agendaContacts, setAgendaContacts] = useState<AgendaContact[] | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [registeredSet, setRegisteredSet] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<PhoneMatch | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const inviteUrl = useMemo(
    () => (user?.id ? `https://ridefriend.app/invite/${user.id}` : 'https://ridefriend.app'),
    [user?.id],
  );

  const addContactRow = useCallback(
    async (contactUserId: string, contactName: string) => {
      if (!user) return;
      const { error } = await supabase.from('contacts').insert({
        user_id: user.id,
        contact_user_id: contactUserId,
        group_type: group,
      });
      if (error) {
        if (error.code === '23505') {
          showToast({ message: `${contactName} já está na rede.`, tone: 'info' });
          return;
        }
        showToast({ message: error.message, tone: 'error' });
        return;
      }
      showToast({ message: `${contactName} adicionado.`, tone: 'success' });
      onAdded();
    },
    [user, group, onAdded, showToast],
  );

  /**
   * Adiciona um contacto "phantom" (sem conta RideFriend ainda). O número fica
   * marcado para auto-link quando essa pessoa se registar. Persiste em
   * contacts.alias_name + alias_phone + phone_normalized (trigger SQL).
   */
  const addPhantomRow = useCallback(
    async (input: { name: string; phone: string }) => {
      if (!user) return;
      const rawPhone = input.phone.trim();
      const name = input.name.trim();
      if (!rawPhone) {
        showToast({ message: 'Telefone obrigatório.', tone: 'error' });
        return;
      }
      // Canonicaliza para E.164 (+CC…) — o trigger SQL `normalize_phone` só strip
      // dígitos + "0" inicial, por isso ambos os lados (users.phone e alias_phone)
      // precisam de já estar com o country code para o auto-link funcionar.
      const phone = toE164(rawPhone, market.phonePrefix);
      const insertPayload = {
        user_id: user.id,
        contact_user_id: null,
        group_type: group,
        alias_name: name || null,
        alias_phone: phone,
      };
      const { error } = await supabase.from('contacts').insert(insertPayload as never);
      if (error) {
        if (error.code === '23505') {
          showToast({ message: `${name || phone} já está na rede.`, tone: 'info' });
          return;
        }
        showToast({ message: error.message, tone: 'error' });
        return;
      }
      showToast({ message: `${name || phone} adicionado.`, tone: 'success' });
      onAdded();
    },
    [user, group, onAdded, showToast],
  );

  // Carrega a agenda quando o tab é aberto pela primeira vez.
  useEffect(() => {
    if (!visible || tab !== 'agenda' || agendaContacts !== null) return;
    let cancelled = false;
    (async () => {
      setAgendaLoading(true);
      try {
        // expo-contacts é opcional — se não estiver instalado, mostramos o erro amigável.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Contacts = require('expo-contacts');
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') throw new Error('Sem permissão para aceder à agenda.');
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          pageSize: 500,
        });
        if (cancelled) return;
        const list: AgendaContact[] = (data ?? [])
          .filter((c: any) => c.name && c.phoneNumbers?.length)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            phones: (c.phoneNumbers ?? [])
              .map((p: any) => (typeof p.number === 'string' ? p.number.replace(/\s+/g, '') : ''))
              .filter(Boolean),
          }));
        setAgendaContacts(list);

        // Marca quais já têm conta RideFriend (lookup batch por telefone).
        const allPhones = list.flatMap((c) => c.phones);
        if (allPhones.length > 0) {
          const { data: matches } = await supabase
            .from('users')
            .select('phone')
            .in('phone', allPhones);
          if (!cancelled) {
            setRegisteredSet(new Set((matches ?? []).map((m) => m.phone)));
          }
        }
      } catch (e) {
        setAgendaError(e instanceof Error ? e.message : 'Falha ao carregar agenda.');
      } finally {
        if (!cancelled) setAgendaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, tab, agendaContacts]);

  const handleAgendaPick = useCallback(
    async (c: AgendaContact) => {
      // Caminho 1: já está no RideFriend — liga ao utilizador real.
      const registeredPhone = c.phones.find((p) => registeredSet.has(p));
      if (registeredPhone) {
        const { data: u, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('phone', registeredPhone)
          .maybeSingle();
        if (error || !u) {
          showToast({ message: 'Não foi possível encontrar o utilizador.', tone: 'error' });
          return;
        }
        await addContactRow(u.id, u.name);
        return;
      }
      // Caminho 2: não está no RideFriend — adiciona como phantom com o
      // primeiro número da agenda. Auto-link quando se registar.
      const fallback = c.phones[0];
      if (!fallback) {
        showToast({ message: `${c.name} não tem número guardado.`, tone: 'error' });
        return;
      }
      await addPhantomRow({ name: c.name, phone: fallback });
    },
    [registeredSet, addContactRow, addPhantomRow, showToast],
  );

  const [phantomMode, setPhantomMode] = useState<{ phone: string } | null>(null);
  const [phantomName, setPhantomName] = useState('');

  const handleSearch = useCallback(async () => {
    const phone = searchQuery.trim();
    if (!/^\+\d{8,15}$/.test(phone)) {
      showToast({
        message: 'Número em formato internacional, ex.: +244912345678.',
        tone: 'info',
      });
      return;
    }
    setSearchLoading(true);
    setSearchResult(null);
    setPhantomMode(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('phone', phone)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Não tem conta — propõe adicionar como phantom.
        setPhantomMode({ phone });
        setPhantomName('');
        return;
      }
      setSearchResult({ id: data.id, name: data.name, phone: data.phone });
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : 'Erro a pesquisar.',
        tone: 'error',
      });
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, showToast]);

  const handleShareInvite = useCallback(async () => {
    try {
      await Share.share({
        message: `Junta-te à minha rede no RideFriend: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      /* utilizador cancelou — sem op */
    }
  }, [inviteUrl]);

  // Tenta renderizar o QR — se o pacote não existir, mostra fallback amigável.
  let QRView: React.ReactNode = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('react-native-qrcode-svg').default;
    QRView = <QRCode value={inviteUrl} size={180} color={COLORS.navy} backgroundColor={COLORS.white} />;
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
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Adicionar contacto</Text>

          <View style={styles.tabs}>
            {(['agenda', 'invite', 'search'] as Tab[]).map((tk) => (
              <Pressable key={tk} onPress={() => setTab(tk)} style={[styles.tab, tab === tk && styles.tabActive]}>
                <Text style={[styles.tabText, tab === tk && styles.tabTextActive]}>
                  {tk === 'agenda' ? 'Agenda' : tk === 'invite' ? 'Convidar' : 'Pesquisar'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.groupRow}>
            <Text style={styles.groupRowLabel}>Grupo</Text>
            <View style={styles.groupChips}>
              {GROUPS.map((g) => (
                <Pressable
                  key={g.value}
                  onPress={() => setGroup(g.value)}
                  style={[
                    styles.groupChip,
                    {
                      backgroundColor:
                        group === g.value ? RELATION_COLORS[g.value].fg : RELATION_COLORS[g.value].bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.groupChipText,
                      { color: group === g.value ? COLORS.white : RELATION_COLORS[g.value].fg },
                    ]}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {tab === 'agenda' && (
            <View style={styles.tabContent}>
              {agendaLoading ? (
                <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 24 }} />
              ) : agendaError ? (
                <Text style={styles.error}>{agendaError}</Text>
              ) : (
                <FlatList
                  data={agendaContacts ?? []}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 320 }}
                  renderItem={({ item }) => {
                    const onApp = item.phones.some((p) => registeredSet.has(p));
                    return (
                      <Pressable
                        onPress={() => handleAgendaPick(item)}
                        style={({ pressed }) => [styles.agendaRow, pressed && styles.pressed]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.agendaName}>{item.name}</Text>
                          <Text style={styles.agendaPhone} numberOfLines={1}>
                            {item.phones[0]}
                          </Text>
                        </View>
                        {onApp ? (
                          <View style={styles.onAppBadge}>
                            <Text style={styles.onAppBadgeText}>Já usa RideFriend</Text>
                          </View>
                        ) : (
                          <View style={styles.phantomBadge}>
                            <Text style={styles.phantomBadgeText}>Adicionar</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.error}>
                      Sem contactos na agenda (ou pacote `expo-contacts` em falta).
                    </Text>
                  }
                />
              )}
            </View>
          )}

          {tab === 'invite' && (
            <View style={[styles.tabContent, { alignItems: 'center', gap: 14 }]}>
              {QRView}
              <Text style={styles.inviteUrl}>{inviteUrl}</Text>
              <Pressable
                onPress={handleShareInvite}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>Partilhar link</Text>
              </Pressable>
            </View>
          )}

          {tab === 'search' && (
            <View style={[styles.tabContent, { gap: 10 }]}>
              <TextInput
                placeholder="+244912345678"
                placeholderTextColor={COLORS.text3}
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Pressable
                onPress={handleSearch}
                disabled={searchLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                  searchLoading && styles.disabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>{searchLoading ? 'A procurar…' : 'Pesquisar'}</Text>
              </Pressable>
              {searchResult ? (
                <View style={styles.searchResult}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{searchResult.name}</Text>
                    <Text style={styles.searchPhone}>{searchResult.phone}</Text>
                  </View>
                  <Pressable
                    onPress={() => addContactRow(searchResult.id, searchResult.name)}
                    style={({ pressed }) => [styles.primaryBtnInline, pressed && styles.pressed]}
                  >
                    <Text style={styles.primaryBtnText}>Adicionar</Text>
                  </Pressable>
                </View>
              ) : null}

              {phantomMode ? (
                <View style={styles.phantomCard}>
                  <Text style={styles.phantomTitle}>Sem conta com esse número</Text>
                  <Text style={styles.phantomBody}>
                    Podes guardá-lo na tua rede mesmo assim. Quando essa pessoa se registar com{' '}
                    <Text style={styles.phantomPhoneInline}>{phantomMode.phone}</Text>, ligamos
                    automaticamente o contacto.
                  </Text>
                  <TextInput
                    placeholder="Nome (opcional)"
                    placeholderTextColor={COLORS.text3}
                    value={phantomName}
                    onChangeText={setPhantomName}
                    autoCapitalize="words"
                    style={styles.input}
                  />
                  <Pressable
                    onPress={async () => {
                      await addPhantomRow({ name: phantomName, phone: phantomMode.phone });
                      setPhantomMode(null);
                      setPhantomName('');
                      setSearchQuery('');
                    }}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.primaryBtnText}>Adicionar como contacto novo</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(13,31,56,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200 },
  title: { fontFamily: FONTS.soraBold, fontSize: 20, color: COLORS.text },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  tabActive: { backgroundColor: COLORS.navy },
  tabText: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },
  tabTextActive: { color: COLORS.white },

  groupRow: { gap: 6 },
  groupRowLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.text2 },
  groupChips: { flexDirection: 'row', gap: 6 },
  groupChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  groupChipText: { fontFamily: FONTS.bodySemi, fontSize: 12 },

  tabContent: { paddingTop: 4 },

  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  agendaName: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.text },
  agendaPhone: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },
  onAppBadge: { backgroundColor: COLORS.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  onAppBadgeText: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.green },
  phantomBadge: {
    backgroundColor: COLORS.amber,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phantomBadgeText: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.white },

  phantomCard: {
    backgroundColor: '#FEF7E6',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  phantomTitle: { fontFamily: FONTS.soraBold, fontSize: 13, color: COLORS.text },
  phantomBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    lineHeight: 17,
  },
  phantomPhoneInline: { fontFamily: FONTS.bodySemi, color: COLORS.text },

  inviteUrl: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },
  qrFallback: {
    width: 180,
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  qrFallbackText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2, textAlign: 'center' },

  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text,
  },
  primaryBtn: { backgroundColor: COLORS.navy, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  primaryBtnInline: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
  disabled: { opacity: 0.6 },

  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 14,
  },
  searchName: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.text },
  searchPhone: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.text2 },

  closeBtn: { paddingVertical: 10, alignItems: 'center' },
  closeBtnText: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 13 },

  error: { color: COLORS.red, fontFamily: FONTS.bodyRegular, fontSize: 13, padding: 8 },
  pressed: { opacity: 0.85 },
});
