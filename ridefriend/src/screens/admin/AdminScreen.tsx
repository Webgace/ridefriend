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

        {/* App Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuração da app</Text>
          <Text style={styles.sectionHint}>
            Estes valores aparecem em "Sobre" e em links de Termos / Privacidade.
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
  safe: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 16, paddingBottom: 40, gap: 18 },

  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  deniedTitle: { fontFamily: FONTS.soraBold, fontSize: 18, color: COLORS.text },
  deniedBody: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2 },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245,158,11,0.15)',
    top: -40,
    right: -30,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(217,119,6,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitle: { fontFamily: FONTS.soraBold, fontSize: 20, color: COLORS.white },
  heroBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
  },

  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 13,
  },
  sectionHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.text2,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  addBtnText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 12 },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  emptyText: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.text2 },

  list: { gap: 8 },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 14,
  },
  bannerTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerTitle: { fontFamily: FONTS.soraBold, fontSize: 14, color: COLORS.text, flexShrink: 1 },
  bannerMeta: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.text2 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  statusOn: { backgroundColor: '#D1FAE5' },
  statusOff: { backgroundColor: COLORS.gray100 },
  statusText: { fontFamily: FONTS.bodySemi, fontSize: 10 },
  statusTextOn: { color: '#047857' },
  statusTextOff: { color: COLORS.text2 },

  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: COLORS.redLight },

  configCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  configRow: { gap: 4 },
  configLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    color: COLORS.text2,
  },
  configInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  configInput: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text,
  },
  configInputDirty: { borderColor: COLORS.navy, backgroundColor: COLORS.white },
  configSave: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});
