// Ficheiro: src/components/ui/ErrorBoundary.tsx | Função: captura erros de render e mostra-os em ecrã (debug)
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface State {
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    this.setState({ error, errorInfo });
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
          <Text style={styles.title}>RideFriend crashed</Text>
          <Text style={styles.subtitle}>
            Screenshot this and send it back. The lines below tell us exactly which file blew up.
          </Text>

          <Text style={styles.sectionTitle}>Error message</Text>
          <Text selectable style={styles.error}>
            {this.state.error.name}: {this.state.error.message}
          </Text>

          {this.state.error.stack ? (
            <>
              <Text style={styles.sectionTitle}>Stack</Text>
              <Text selectable style={styles.stack}>
                {this.state.error.stack}
              </Text>
            </>
          ) : null}

          {this.state.errorInfo?.componentStack ? (
            <>
              <Text style={styles.sectionTitle}>Component stack</Text>
              <Text selectable style={styles.stack}>
                {this.state.errorInfo.componentStack}
              </Text>
            </>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, paddingTop: 60 },
  error: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 14 },
  root: { backgroundColor: '#1A1A1A', flex: 1 },
  sectionTitle: {
    color: '#FFD166',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  stack: { color: '#CCCCCC', fontFamily: 'monospace', fontSize: 11, lineHeight: 14 },
  subtitle: { color: '#FFFFFF', fontSize: 13, marginBottom: 20 },
  title: { color: '#FF6B6B', fontSize: 22, fontWeight: '700', marginBottom: 4 },
});
