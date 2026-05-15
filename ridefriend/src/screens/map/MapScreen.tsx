// Ficheiro: src/screens/map/MapScreen.tsx | Função: stub temporário (react-native-maps removido p/ compat Huawei sem GMS)
// TODO: substituir por uma alternativa GMS-free (Leaflet via WebView, MapLibre, etc).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '@constants/theme';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.body}>
        Em breve. (Compatibilidade com dispositivos sem Google Play Services em desenvolvimento.)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontFamily: FONTS.soraBold, fontSize: 22, color: COLORS.text, marginBottom: 8 },
  body: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
