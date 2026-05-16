// Ficheiro: App.tsx | Função: DIAGNOSTIC build 17 — tests each native module at runtime, surfaces failures on screen
// If a module crashes at IMPORT time (top-level), JS won't render and we see the line BEFORE its test as the last green.
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

type Step = { name: string; ok: boolean; err?: string };

export default function App() {
  const [steps, setSteps] = useState<Step[]>([
    { name: 'JS engine started', ok: true },
    { name: 'top-level imports OK', ok: true },
  ]);

  useEffect(() => {
    type Probe = { name: string; fn: () => unknown | Promise<unknown> };
    const probes: Probe[] = [
      { name: 'MMKV: construct', fn: () => new MMKV({ id: 'diag' }) },
      { name: 'MMKV: write+read', fn: () => {
        const m = new MMKV({ id: 'diag' });
        m.set('hello', 'world');
        return m.getString('hello');
      } },
      { name: 'SecureStore.getItemAsync', fn: () => SecureStore.getItemAsync('diag-key') },
      { name: 'Notifications.getPermissions', fn: () => Notifications.getPermissionsAsync() },
      { name: 'Notifications.setNotificationHandler', fn: () => Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false,
          shouldShowBanner: true, shouldShowList: true,
        }),
      }) },
      { name: 'Location.getForegroundPermissions', fn: () => Location.getForegroundPermissionsAsync() },
    ];

    let cancelled = false;
    (async () => {
      for (const p of probes) {
        await new Promise((r) => setTimeout(r, 250));
        if (cancelled) return;
        try {
          await p.fn();
          setSteps((s) => [...s, { name: p.name, ok: true }]);
        } catch (e) {
          const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          setSteps((s) => [...s, { name: p.name, ok: false, err }]);
        }
      }
      setSteps((s) => [...s, { name: '— all probes complete —', ok: true }]);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.pad}>
      <Text style={styles.title}>RideFriend probe (build 17)</Text>
      <Text style={styles.subtitle}>
        Each line below tries one native module. The first ✗ red line is the crash culprit.
        If the app dies mid-list, the missing line after the last ✓ is the culprit.
      </Text>
      <View style={{ height: 18 }} />
      {steps.map((step, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.mark, { color: step.ok ? '#10B981' : '#EF4444' }]}>
            {step.ok ? '✓' : '✗'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: step.ok ? '#FFFFFF' : '#FCA5A5' }]}>
              {step.name}
            </Text>
            {step.err ? <Text style={styles.err}>{step.err}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D1F38' },
  pad: { padding: 22, paddingTop: 60, paddingBottom: 60 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  mark: { fontSize: 16, fontWeight: '700', width: 18 },
  name: { fontSize: 13, fontWeight: '600' },
  err: { color: '#FCA5A5', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
});
