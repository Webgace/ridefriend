// Ficheiro: src/screens/settings/SettingsScreen.tsx | Função: definições da app (P10 v2)
// Persistência local via MMKV; quando o backend tiver tabela de preferências, sincronizar.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
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
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useAppConfig } from '@hooks/useAppConfig';
import { supabase } from '@services/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STORAGE = new MMKV({ id: 'ridefriend-settings' });

type NotifKey = 'driver_approaching' | 'passenger_at_stop' | 'sos_alert' | 'ride_request';
type PrivacyKey = 'all' | 'family' | 'none';

const NOTIF_ROWS: { key: NotifKey; label: string; icon: IoniconName }[] = [
  { key: 'driver_approaching', label: 'Motorista próximo', icon: 'car-outline' },
  { key: 'passenger_at_stop', label: 'Passageiro na paragem', icon: 'people-outline' },
  { key: 'sos_alert', label: 'Alertas SOS', icon: 'warning-outline' },
  { key: 'ride_request', label: 'Pedidos de boleia', icon: 'hand-right-outline' },
];

const PRIVACY_ROWS: { key: PrivacyKey; label: string; sub: string }[] = [
  { key: 'all', label: 'Todos os contactos', sub: 'Família, amigos, colegas, vizinhos' },
  { key: 'family', label: 'Só família', sub: 'Apenas o grupo Família' },
  { key: 'none', label: 'Ninguém', sub: 'Localização privada' },
];

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
  const { config: appConfig } = useAppConfig();

  const openExternal = useCallback(
    (url: string | null | undefined, missingLabel: string) => {
      if (!url) {
        showToast({ message: `${missingLabel} ainda não configurado.`, tone: 'info' });
        return;
      }
      Linking.openURL(url).catch(() =>
        showToast({ message: 'Não foi possível abrir o link.', tone: 'error' }),
      );
    },
    [showToast],
  );

  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(
    () =>
      loadJson('settings.notifs', {
        driver_approaching: true,
        passenger_at_stop: true,
        sos_alert: true,
        ride_request: true,
      } as Record<NotifKey, boolean>),
  );
  const [privacy, setPrivacy] = useState<PrivacyKey>(
    () => (STORAGE.getString('settings.privacy') as PrivacyKey | undefined) ?? 'all',
  );
  const [vehicle, setVehicle] = useState<VehicleData>(() =>
    loadJson<VehicleData>('settings.vehicle', { plate: '', model: '', seats: '' }),
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Notificações">
          {NOTIF_ROWS.map((r, i) => (
            <Row
              key={r.key}
              icon={r.icon}
              label={r.label}
              isFirst={i === 0}
              right={
                <Switch
                  value={notifs[r.key]}
                  onValueChange={() => toggleNotif(r.key)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.navy }}
                  thumbColor={COLORS.white}
                />
              }
            />
          ))}
        </Section>

        <Section title="Privacidade" hint="Quem pode ver a minha localização?">
          {PRIVACY_ROWS.map((r, i) => {
            const active = privacy === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setPrivacy(r.key)}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                style={({ pressed }) => [
                  styles.row,
                  i === 0 && styles.rowFirst,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <Text style={styles.rowSub}>{r.sub}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Viatura" hint="Aparece nos teus pedidos como motorista.">
          <Field
            label="Matrícula"
            value={vehicle.plate}
            placeholder="AA-12-BB"
            onChangeText={(plate) => setVehicle((v) => ({ ...v, plate }))}
            autoCapitalize="characters"
            isFirst
          />
          <Field
            label="Modelo"
            value={vehicle.model}
            placeholder="Toyota Corolla"
            onChangeText={(model) => setVehicle((v) => ({ ...v, model }))}
          />
          <Field
            label="Lugares"
            value={vehicle.seats}
            placeholder="4"
            onChangeText={(seats) => setVehicle((v) => ({ ...v, seats }))}
            keyboardType="number-pad"
          />
        </Section>

        <Section title="Segurança">
          <NavRow
            icon="shield-checkmark-outline"
            label="Contacto de emergência"
            onPress={() => navigation.navigate('EmergencyContact')}
            isFirst
          />
        </Section>

        <Section title="Conta">
          <NavRow
            icon="download-outline"
            label="Exportar os meus dados"
            onPress={handleExport}
            isFirst
          />
          <NavRow
            icon="trash-outline"
            label="Eliminar conta"
            onPress={handleDeleteAccount}
            destructive
          />
        </Section>

        <Section title="Sobre">
          <Row
            icon="phone-portrait-outline"
            label="Versão"
            isFirst
            right={<Text style={styles.aboutValue}>{appVersion}</Text>}
          />
          <NavRow
            icon="globe-outline"
            label="Website"
            onPress={() => openExternal(appConfig.website_url, 'Website')}
          />
          <NavRow
            icon="mail-outline"
            label="Email de suporte"
            onPress={() =>
              openExternal(
                appConfig.support_email ? `mailto:${appConfig.support_email}` : null,
                'Email de suporte',
              )
            }
          />
          <NavRow
            icon="document-text-outline"
            label="Termos de uso"
            onPress={() => openExternal(appConfig.terms_url, 'Termos')}
          />
          <NavRow
            icon="lock-closed-outline"
            label="Política de privacidade"
            onPress={() => openExternal(appConfig.privacy_url, 'Política de privacidade')}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface RowProps {
  icon?: IoniconName;
  label: string;
  right?: React.ReactNode;
  isFirst?: boolean;
}

function Row({ icon, label, right, isFirst }: RowProps) {
  return (
    <View style={[styles.row, isFirst && styles.rowFirst]}>
      {icon ? (
        <View style={styles.rowIconWrap}>
          <Ionicons name={icon} size={18} color={COLORS.navy} />
        </View>
      ) : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

interface NavRowProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  isFirst?: boolean;
  destructive?: boolean;
}

function NavRow({ icon, label, onPress, isFirst, destructive }: NavRowProps) {
  const tint = destructive ? COLORS.red : COLORS.navy;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, isFirst && styles.rowFirst, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.rowIconWrap,
          destructive ? { backgroundColor: COLORS.redLight } : null,
        ]}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.rowLabel, destructive && { color: COLORS.red }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Ionicons name="chevron-forward" size={16} color={destructive ? COLORS.red : COLORS.text3} />
      </View>
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  isFirst?: boolean;
  autoCapitalize?: 'characters' | 'words' | 'sentences' | 'none';
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  isFirst,
  autoCapitalize,
  keyboardType,
}: FieldProps) {
  return (
    <View style={[styles.field, isFirst && styles.rowFirst]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text3}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 16, gap: 20, paddingBottom: 64 },

  section: { gap: 6 },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 12,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 12,
    paddingHorizontal: 4,
  },
  sectionHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  sectionBody: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowFirst: { borderTopWidth: 0 },
  rowBody: { flex: 1, gap: 2 },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.text,
  },
  rowSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
  },
  rowRight: { marginLeft: 'auto' },

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

  field: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  fieldLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.05 * 11,
  },
  fieldInput: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 4,
  },

  aboutValue: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.text2 },

  pressed: { backgroundColor: COLORS.gray50 },
});
