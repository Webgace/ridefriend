// Ficheiro: App.tsx | Função: MINIMAL DIAGNOSTIC BUILD — isolates whether crash is in our code or build env
// Original App.tsx saved as App.full.tsx.bak
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>RideFriend</Text>
      <Text style={styles.body}>Diagnostic build 16</Text>
      <Text style={styles.small}>If you can read this, the native build is fine{'\n'}and the crash is in our JS / dependencies.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1F38',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  heading: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 12 },
  body: { color: '#FFD166', fontSize: 16, marginBottom: 24 },
  small: { color: '#CCCCCC', fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
