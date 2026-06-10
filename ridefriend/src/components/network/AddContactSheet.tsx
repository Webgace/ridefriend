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
import { getInviteUrl } from '@utils/invite';
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

  const inviteUrl = useMemo(() => getInviteUrl(user?.id), [user?.id]);

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
  agendaName: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  agendaPhone: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  agendaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  closeBtn: { alignItems: 'center', paddingVertical: 10 },
  closeBtnText: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 13 },
  disabled: { opacity: 0.6 },
  error: { color: COLORS.red, fontFamily: FONTS.bodyRegular, fontSize: 13, padding: 8 },
  groupChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  groupChipText: { fontFamily: FONTS.bodySemi, fontSize: 12 },

  groupChips: { flexDirection: 'row', gap: 6 },
  groupRow: { gap: 6 },
  groupRowLabel: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 12 },
  handle: { alignSelf: 'center', backgroundColor: COLORS.gray200, borderRadius: 2, height: 4, width: 40 },
  input: {
    backgroundColor: COLORS.gray50,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  inviteUrl: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },

  onAppBadge: { backgroundColor: COLORS.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  onAppBadgeText: { color: COLORS.green, fontFamily: FONTS.bodySemi, fontSize: 11 },
  overlay: { backgroundColor: 'rgba(13,31,56,0.55)', flex: 1, justifyContent: 'flex-end' },
  phantomBadge: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phantomBadgeText: { color: COLORS.white, fontFamily: FONTS.bodySemi, fontSize: 11 },
  phantomBody: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  phantomCard: {
    backgroundColor: '#FEF7E6',
    borderRadius: 14,
    gap: 10,
    marginTop: 4,
    padding: 14,
  },

  phantomPhoneInline: { color: COLORS.text, fontFamily: FONTS.bodySemi },
  phantomTitle: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 13 },
  pressed: { opacity: 0.85 },
  primaryBtn: { alignItems: 'center', backgroundColor: COLORS.navy, borderRadius: 14, paddingVertical: 13 },

  primaryBtnInline: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
  qrFallback: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 180,
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: 180,
  },

  qrFallbackText: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12, textAlign: 'center' },
  searchName: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  searchPhone: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  searchResult: {
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 12,
    maxHeight: '92%',
    padding: 20,
    paddingBottom: 32,
  },

  tab: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 9,
  },
  tabActive: { backgroundColor: COLORS.navy },
  tabContent: { paddingTop: 4 },

  tabText: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 12 },
  tabTextActive: { color: COLORS.white },

  tabs: { flexDirection: 'row', gap: 6 },
  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 20 },
});
