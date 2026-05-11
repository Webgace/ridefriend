// Ficheiro: src/screens/settings/SettingsScreen.tsx | Função: definições da app (P10)
// Persistência local via MMKV; quando o backend tiver tabela de preferências, sincronizar.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { supabase } from '@services/supabase';

const STORAGE = new MMKV({ id: 'ridefriend-settings' });

type NotifKey = 'driver_approaching' | 'passenger_at_stop' | 'sos_alert' | 'ride_request';
type PrivacyKey = 'all' | 'family' | 'none';

const NOTIF_LABEL: Record<NotifKey, string> = {
  driver_approaching: 'Motorista próximo',
  passenger_at_stop: 'Passageiro na paragem',
  sos_alert: 'Alertas SOS',
  ride_request: 'Pedidos de boleia',
};

const PRIVACY_LABEL: Record<PrivacyKey, string> = {
  all: 'Todos os contactos',
  family: 'Só família',
  none: 'Ninguém',
};

interface VehicleData {
  plate: string;
  model: string;
  seats: string;
}

function loadJson<T>(key: string, fallback: T): T {
  const raw = STORAGE.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const showConfirm = useUiHostStore((s) => s.showConfirm);
  const showToast = useUiHostStore((s) => s.showToast);

  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(
    () => loadJson('settings.notifs', {
      driver_approaching: true,
      passenger_at_stop: true,
      sos_alert: true,
      ride_request: true,
    } as Record<NotifKey, boolean>),
  );
  const [privacy, setPrivacy] = useState<PrivacyKey>(
    () => (STORAGE.getString('settings.privacy') as PrivacyKey | undefined) ?? 'all',
  );
  const [vehicle, setVehicle] = useState<VehicleData>(
    () => loadJson<VehicleData>('settings.vehicle', { plate: '', model: '', seats: '' }),
  );

  useEffect(() => {
    STORAGE.set('settings.notifs', JSON.stringify(notifs));
  }, [notifs]);

  useEffect(() => {
    STORAGE.set('settings.privacy', privacy);
  }, [privacy]);

  useEffect(() => {
    STORAGE.set('settings.vehicle', JSON.stringify(vehicle));
  }, [vehicle]);

  const toggleNotif = (key: NotifKey) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = useCallback(() => {
    showConfirm({
      title: 'Eliminar conta?',
      message: 'Esta acção é irreversível. Os teus dados serão removidos.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        if (!user) return;
        try {
          // Hard-delete na tabela users (CASCADE limpa contacts, locations, etc).
          // Em produção, considerar uma rota /users/me DELETE no backend que faça soft-delete.
          const { error } = await supabase.from('users').delete().eq('id', user.id);
          if (error) throw error;
          await logout();
          showToast({ message: 'Conta eliminada.', tone: 'success' });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Falha ao eliminar conta.';
          showToast({ message, tone: 'error' });
        }
      },
    });
  }, [user, showConfirm, showToast, logout]);

  const handleExport = useCallback(() => {
    showToast({
      message: 'Pedido registado — recebes os dados por email em até 7 dias.',
      tone: 'info',
      durationMs: 4500,
    });
  }, [showToast]);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '0.0.0';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Notificações">
          {(Object.keys(NOTIF_LABEL) as NotifKey[]).map((key) => (
            <Row
              key={key}
              label={NOTIF_LABEL[key]}
              right={
                <Switch
                  value={notifs[key]}
                  onValueChange={() => toggleNotif(key)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.navy }}
                  thumbColor={COLORS.white}
                />
              }
            />
          ))}
        </Section>

        <Section title="Privacidade">
          <Text style={styles.helper}>Quem pode ver a minha localização?</Text>
          {(Object.keys(PRIVACY_LABEL) as PrivacyKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setPrivacy(key)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowLabel}>{PRIVACY_LABEL[key]}</Text>
              <View style={[styles.radio, privacy === key && styles.radioActive]}>
                {privacy === key ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          ))}
        </Section>

        <Section title="Viatura">
          <TextInput
            placeholder="Matrícula"
            placeholderTextColor={COLORS.text3}
            value={vehicle.plate}
            onChangeText={(plate) => setVehicle((v) => ({ ...v, plate }))}
            autoCapitalize="characters"
            style={styles.input}
          />
          <TextInput
            placeholder="Modelo"
            placeholderTextColor={COLORS.text3}
            value={vehicle.model}
            onChangeText={(model) => setVehicle((v) => ({ ...v, model }))}
            style={styles.input}
          />
          <TextInput
            placeholder="Lugares"
            placeholderTextColor={COLORS.text3}
            value={vehicle.seats}
            onChangeText={(seats) => setVehicle((v) => ({ ...v, seats }))}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Section>

        <Section title="Segurança">
          <Pressable
            onPress={() => navigation.navigate('EmergencyContact')}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowLabel}>Contacto de emergência</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </Section>

        <Section title="Conta">
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowLabel}>Exportar os meus dados</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.rowLabel, { color: COLORS.red }]}>Eliminar conta</Text>
            <Text style={[styles.chev, { color: COLORS.red }]}>›</Text>
          </Pressable>
        </Section>

        <Section title="Sobre">
          <Row label="Versão" right={<Text style={styles.aboutValue}>{appVersion}</Text>} />
          <Row label="Termos de uso" right={<Text style={styles.chev}>›</Text>} />
          <Row label="Política de privacidade" right={<Text style={styles.chev}>›</Text>} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 16, gap: 18, paddingBottom: 64 },

  section: { gap: 8 },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 12,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 12,
  },
  sectionBody: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowLabel: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.text },
  helper: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chev: { fontFamily: FONTS.soraBold, fontSize: 18, color: COLORS.text3 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.navy },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.navy },

  input: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },

  aboutValue: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.text2 },
  pressed: { backgroundColor: COLORS.gray50 },
});
