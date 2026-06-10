// Ficheiro: src/screens/admin/AdminScreen.tsx | Função: painel admin (banners + app_config)
// Acesso restrito: redirect/empty quando user.isAdmin = false. A RLS dupla protege no servidor.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useAuthStore } from '@store/authStore';
import { useUiHostStore } from '@store/uiHostStore';
import { useBanners, Banner } from '@hooks/useBanners';
import {
  useAppConfig,
  setAppConfigValue,
  AppConfigKey,
} from '@hooks/useAppConfig';
import { supabase } from '@services/supabase';
import BannerFormSheet from '@components/admin/BannerFormSheet';

const CONFIG_FIELDS: { key: AppConfigKey; label: string; placeholder: string }[] = [
  { key: 'website_url', label: 'Website', placeholder: 'https://...' },
  { key: 'support_email', label: 'Email de suporte', placeholder: 'suporte@...' },
  { key: 'privacy_email', label: 'Email de privacidade', placeholder: 'privacidade@...' },
  { key: 'privacy_url', label: 'URL da Política de Privacidade', placeholder: 'https://...' },
  { key: 'terms_url', label: 'URL dos Termos', placeholder: 'https://...' },
  {
    key: 'admin_emails',
    label: 'Admins (emails separados por vírgula)',
    placeholder: 'admin1@...,admin2@...',
  },
];

const OTP_CHANNELS: { value: 'sms' | 'whatsapp'; label: string; hint: string }[] = [
  { value: 'sms', label: 'SMS', hint: 'Canal padrão. Funciona em qualquer telefone.' },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Mais barato em AO/MZ. Requer Twilio Verify + WhatsApp Business aprovado.',
  },
];

export default function AdminScreen() {
  const { user } = useAuthStore();
  const showToast = useUiHostStore((s) => s.showToast);
  const showConfirm = useUiHostStore((s) => s.showConfirm);
  const { banners, isLoading: bannersLoading, refresh: refreshBanners } =
    useBanners({ includeInactive: true });
  const { config, isLoading: configLoading, refresh: refreshConfig } = useAppConfig();

  const [drafts, setDrafts] = useState<Partial<Record<AppConfigKey, string>>>({});
  const [savingKey, setSavingKey] = useState<AppConfigKey | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  useEffect(() => {
    setDrafts({});
  }, [config]);

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.denied}>
          <Ionicons name="lock-closed" size={40} color={COLORS.text3} />
          <Text style={styles.deniedTitle}>Sem acesso</Text>
          <Text style={styles.deniedBody}>
            Esta área é apenas para administradores.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const otpChannelCurrent =
    ((config.otp_channel ?? 'sms') as string).toLowerCase() === 'whatsapp'
      ? 'whatsapp'
      : 'sms';
  const [otpSaving, setOtpSaving] = useState(false);
  const handlePickOtpChannel = async (channel: 'sms' | 'whatsapp') => {
    if (channel === otpChannelCurrent || otpSaving) return;
    setOtpSaving(true);
    try {
      await setAppConfigValue('otp_channel', channel);
      showToast({ message: `Canal OTP: ${channel.toUpperCase()}.`, tone: 'success' });
      await refreshConfig();
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : 'Falha ao actualizar canal.',
        tone: 'error',
      });
    } finally {
      setOtpSaving(false);
    }
  };

  const handleSaveConfig = async (key: AppConfigKey) => {
    const draft = drafts[key];
    if (draft === undefined) return;
    setSavingKey(key);
    try {
      await setAppConfigValue(key, draft.trim() || null);
      showToast({ message: 'Configuração actualizada.', tone: 'success' });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao actualizar.';
      showToast({ message, tone: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteBanner = (b: Banner) => {
    showConfirm({
      title: 'Eliminar banner?',
      message: `"${b.title}" será removido permanentemente.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('banners').delete().eq('id', b.id);
          if (error) throw error;
          showToast({ message: 'Banner eliminado.', tone: 'success' });
          await refreshBanners();
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Falha ao eliminar.';
          showToast({ message, tone: 'error' });
        }
      },
    });
  };

  const handleToggleActive = async (b: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !b.isActive } as never)
        .eq('id', b.id);
      if (error) throw error;
      await refreshBanners();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao alternar.';
      showToast({ message, tone: 'error' });
    }
  };

  const isRefreshing = bannersLoading || configLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => Promise.all([refreshBanners(), refreshConfig()])}
            tintColor={COLORS.navy}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroDecor} />
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.amber} />
          </View>
          <Text style={styles.heroTitle}>Painel Admin</Text>
          <Text style={styles.heroBody}>Gestão de banners e configuração da app.</Text>
        </View>

        {/* Banners */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Banners</Text>
            <Pressable
              onPress={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Novo banner"
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={14} color={COLORS.white} />
              <Text style={styles.addBtnText}>Novo</Text>
            </Pressable>
          </View>

          {bannersLoading ? (
            <ActivityIndicator color={COLORS.navy} style={{ marginVertical: 16 }} />
          ) : banners.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sem banners. Toca em "Novo" para criar.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {banners.map((b) => (
                <View key={b.id} style={styles.bannerRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.bannerTitleLine}>
                      <Text style={styles.bannerTitle} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          b.isActive ? styles.statusOn : styles.statusOff,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            b.isActive ? styles.statusTextOn : styles.statusTextOff,
                          ]}
                        >
                          {b.isActive ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.bannerMeta} numberOfLines={1}>
                      {b.marketCode ?? 'Global'} · prio {b.priority}
                      {b.startsAt ? ` · ${formatDate(b.startsAt)}` : ''}
                      {b.endsAt ? ` → ${formatDate(b.endsAt)}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => handleToggleActive(b)}
                      accessibilityRole="button"
                      accessibilityLabel="Alternar activo"
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                    >
                      <Ionicons
                        name={b.isActive ? 'pause' : 'play'}
                        size={14}
                        color={COLORS.navy}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setEditing(b);
                        setFormOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Editar"
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                    >
                      <Ionicons name="pencil" size={14} color={COLORS.navy} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteBanner(b)}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar"
                      style={({ pressed }) => [
                        styles.iconBtn,
                        styles.iconBtnDanger,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Canal OTP (SMS vs WhatsApp) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canal de OTP</Text>
          <Text style={styles.sectionHint}>
            Como o código de verificação é entregue ao utilizador. WhatsApp precisa
            de Twilio Verify + número WhatsApp Business aprovado pela Meta.
          </Text>
          <View style={styles.otpRow}>
            {OTP_CHANNELS.map((c) => {
              const active = c.value === otpChannelCurrent;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => handlePickOtpChannel(c.value)}
                  disabled={otpSaving}
                  accessibilityRole="button"
                  accessibilityLabel={`Canal ${c.label}`}
                  style={({ pressed }) => [
                    styles.otpOption,
                    active && styles.otpOptionActive,
                    pressed && styles.pressed,
                    otpSaving && styles.btnDisabled,
                  ]}
                >
                  <Ionicons
                    name={c.value === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'}
                    size={18}
                    color={active ? COLORS.white : COLORS.text}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.otpOptionLabel, active && styles.otpOptionLabelActive]}
                    >
                      {c.label}
                    </Text>
                    <Text
                      style={[styles.otpOptionHint, active && styles.otpOptionHintActive]}
                    >
                      {c.hint}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* App Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuração da app</Text>
          <Text style={styles.sectionHint}>
            Estes valores aparecem em "Sobre" e em links de Termos / Privacidade.
            "Admins" controla quem entra automaticamente no painel — separa emails por vírgula.
          </Text>
          <View style={styles.configCard}>
            {CONFIG_FIELDS.map((f) => {
              const stored = config[f.key] ?? '';
              const draft = drafts[f.key];
              const value = draft ?? stored;
              const dirty = draft !== undefined && draft !== stored;
              return (
                <View key={f.key} style={styles.configRow}>
                  <Text style={styles.configLabel}>{f.label}</Text>
                  <View style={styles.configInputRow}>
                    <TextInput
                      value={value}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={COLORS.text3}
                      autoCapitalize="none"
                      style={[styles.configInput, dirty && styles.configInputDirty]}
                    />
                    <Pressable
                      onPress={() => handleSaveConfig(f.key)}
                      disabled={!dirty || savingKey === f.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Guardar ${f.label}`}
                      style={({ pressed }) => [
                        styles.configSave,
                        (!dirty || savingKey === f.key) && styles.btnDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={savingKey === f.key ? 'sync' : 'checkmark'}
                        size={14}
                        color={COLORS.white}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BannerFormSheet
        visible={formOpen}
        banner={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refreshBanners}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  addBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 12 },

  bannerMeta: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 11 },
  bannerRow: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  bannerTitle: { color: COLORS.text, flexShrink: 1, fontFamily: FONTS.soraBold, fontSize: 14 },

  bannerTitleLine: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  btnDisabled: { opacity: 0.4 },
  configCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    gap: 12,
    padding: 12,
  },
  configInput: {
    backgroundColor: COLORS.gray50,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  configInputDirty: { backgroundColor: COLORS.white, borderColor: COLORS.navy },

  configInputRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  configLabel: {
    color: COLORS.text2,
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
  },
  configRow: { gap: 4 },
  configSave: {
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },

  content: { gap: 18, padding: 16, paddingBottom: 40 },
  denied: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center' },

  deniedBody: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 13 },
  deniedTitle: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 18 },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  emptyText: { color: COLORS.text2, fontFamily: FONTS.bodyRegular, fontSize: 13 },
  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  heroBody: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    marginTop: 4,
  },
  heroDecor: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 60,
    height: 120,
    position: 'absolute',
    right: -30,
    top: -40,
    width: 120,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.22)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
    width: 40,
  },
  heroTitle: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 20 },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  iconBtnDanger: { backgroundColor: COLORS.redLight },
  list: { gap: 8 },
  otpOption: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  otpOptionActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  otpOptionHint: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    marginTop: 2,
  },
  otpOptionHintActive: { color: 'rgba(255,255,255,0.78)' },

  otpOptionLabel: { color: COLORS.text, fontFamily: FONTS.soraBold, fontSize: 14 },
  otpOptionLabelActive: { color: COLORS.white },
  otpRow: { gap: 8 },
  pressed: { opacity: 0.85 },
  rowActions: { flexDirection: 'row', gap: 4 },
  safe: { backgroundColor: COLORS.surface, flex: 1 },
  section: { gap: 10 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHint: {
    color: COLORS.text2,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
  },

  sectionTitle: {
    color: COLORS.text2,
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    letterSpacing: 0.06 * 13,
    textTransform: 'uppercase',
  },
  statusBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  statusOff: { backgroundColor: COLORS.gray100 },
  statusOn: { backgroundColor: '#D1FAE5' },
  statusText: { fontFamily: FONTS.bodySemi, fontSize: 10 },
  statusTextOff: { color: COLORS.text2 },
  statusTextOn: { color: '#047857' },
});
