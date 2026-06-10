// Ficheiro: src/screens/profile/EmergencyContactScreen.tsx | Função: configurar contacto de emergência (P8)
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '@constants/theme';
import { useT } from '@hooks/useT';
import { useAuthStore } from '@store/authStore';
import { useLocation } from '@hooks/useLocation';
import {
  EmergencyContact,
  useEmergencyContactStore,
} from '@store/emergencyContactStore';
import { useUiHostStore } from '@store/uiHostStore';
import { supabase } from '@services/supabase';
import { triggerSos } from '@services/sos.service';

interface NetworkContact {
  id: string;
  name: string;
  phone: string;
}

type Tab = 'network' | 'external';

export default function EmergencyContactScreen() {
  const { t } = useT('ride');
  const { t: tCommon } = useT('common');
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { myLocation } = useLocation();
  const showToast = useUiHostStore((s) => s.showToast);
  const contact = useEmergencyContactStore((s) => s.contact);
  const setContact = useEmergencyContactStore((s) => s.setContact);

  const [tab, setTab] = useState<Tab>('network');
  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [externalName, setExternalName] = useState(contact?.isExternal ? contact.name : '');
  const [externalPhone, setExternalPhone] = useState(contact?.isExternal ? contact.phone : '');
  const [testing, setTesting] = useState(false);

  // Carrega contactos da rede do utilizador (joins manual via duas queries — RLS-friendly).
  useEffect(() => {
    if (!user || tab !== 'network') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.id);
      if (cancelled || error || !rows || rows.length === 0) {
        setNetworkContacts([]);
        setLoading(false);
        return;
      }
      const ids = rows.map((r) => r.contact_user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', ids);
      if (cancelled) return;
      setNetworkContacts((users ?? []).map((u) => ({ id: u.id, name: u.name, phone: u.phone })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tab]);

  const handleSelectFromNetwork = useCallback(
    (c: NetworkContact) => {
      const next: EmergencyContact = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        isExternal: false,
      };
      setContact(next);
      showToast({ message: tCommon('success'), tone: 'success' });
      navigation.goBack?.();
    },
    [setContact, showToast, tCommon, navigation],
  );

  const handleSaveExternal = useCallback(() => {
    const name = externalName.trim();
    const phone = externalPhone.trim();
    if (!name || phone.length < 6) {
      showToast({ message: t('emergency_contact_invalid'), tone: 'error' });
      return;
    }
    const next: EmergencyContact = {
      id: `external:${phone}`,
      name,
      phone,
      isExternal: true,
    };
    setContact(next);
    showToast({ message: tCommon('success'), tone: 'success' });
    navigation.goBack?.();
  }, [externalName, externalPhone, setContact, showToast, t, tCommon, navigation]);

  const handleTestSos = useCallback(async () => {
    if (!contact || !user) {
      showToast({ message: t('sos_no_contact'), tone: 'info' });
      return;
    }
    setTesting(true);
    try {
      await triggerSos({
        userId: user.id,
        userName: user.name,
        lat: myLocation?.lat ?? 0,
        lng: myLocation?.lng ?? 0,
        emergencyContact: contact,
        testMode: true,
      });
      showToast({ message: t('sos_test_mode'), tone: 'info' });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('sos_failed');
      showToast({ message, tone: 'error' });
    } finally {
      setTesting(false);
    }
  }, [contact, user, myLocation, showToast, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('emergency_contact_title')}</Text>
        <Text style={styles.subtitle}>{t('emergency_contact_subtitle')}</Text>
      </View>

      {contact ? (
        <View style={styles.currentBox}>
          <Text style={styles.currentLabel}>{t('sos_emergency_contact')}</Text>
          <Text style={styles.currentValue}>{contact.name} · {contact.phone}</Text>
          <Pressable
            onPress={handleTestSos}
            disabled={testing}
            style={({ pressed }) => [
              styles.testBtn,
              pressed && styles.pressed,
              testing && styles.testBtnDisabled,
            ]}
          >
            {testing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.testBtnText}>{t('emergency_contact_test')}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{t('emergency_contact_required')}</Text>
        </View>
      )}

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('network')}
          style={[styles.tab, tab === 'network' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'network' && styles.tabTextActive]}>
            {t('emergency_contact_pick_from_network')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('external')}
          style={[styles.tab, tab === 'external' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'external' && styles.tabTextActive]}>
            {t('emergency_contact_external')}
          </Text>
        </Pressable>
      </View>

      {tab === 'network' ? (
        <FlatList
          data={networkContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={COLORS.navy} style={styles.loading} />
            ) : (
              <Text style={styles.empty}>{t('emergency_contact_no_contacts')}</Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectFromNetwork(item)}
              style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
            >
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      ) : (
        <View style={styles.externalForm}>
          <TextInput
            placeholder={t('emergency_contact_name_placeholder')}
            placeholderTextColor={COLORS.text3}
            value={externalName}
            onChangeText={setExternalName}
            style={styles.input}
          />
          <TextInput
            placeholder={t('emergency_contact_phone_placeholder')}
            placeholderTextColor={COLORS.text3}
            value={externalPhone}
            onChangeText={setExternalPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Pressable
            onPress={handleSaveExternal}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          >
            <Text style={styles.saveBtnText}>{t('emergency_contact_save')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contactName: { color: COLORS.text, fontFamily: FONTS.bodySemi, fontSize: 14 },
  contactPhone: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  contactRow: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    gap: 2,
    padding: 14,
  },
  currentBox: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.green,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    margin: 16,
    padding: 14,
  },

  currentLabel: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 12 },
  currentValue: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 16 },
  empty: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    marginTop: 24,
    textAlign: 'center',
  },
  externalForm: { gap: 10, padding: 16 },
  header: { gap: 4, paddingHorizontal: 20, paddingTop: 16 },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  listContent: { padding: 16 },
  loading: { marginTop: 24 },

  pressed: { opacity: 0.85 },
  safe: { backgroundColor: COLORS.surface, flex: 1 },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    marginTop: 4,
    paddingVertical: 14,
  },
  saveBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 14 },
  sep: { height: 8 },

  subtitle: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 13 },
  tab: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: COLORS.navy },
  tabText: { color: COLORS.text2, fontFamily: FONTS.bodySemi, fontSize: 12 },
  tabTextActive: { color: COLORS.white },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  testBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 10,
  },

  testBtnDisabled: { opacity: 0.6 },
  testBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 13 },
  title: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 22 },
  warningBox: {
    backgroundColor: COLORS.redLight,
    borderRadius: 16,
    margin: 16,
    padding: 14,
  },
  warningText: { color: COLORS.red, fontFamily: FONTS.bodySemi, fontSize: 13 },
});
