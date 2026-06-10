// Ficheiro: src/components/home/BannerCarousel.tsx | Função: carrossel horizontal de banners (admin-editáveis)
// Mostra os banners activos para o mercado do utilizador. Cada cartão tem título, body, opcional CTA.
import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';
import { useBanners, Banner } from '@hooks/useBanners';

interface Props {
  style?: ViewStyle;
}

export default function BannerCarousel({ style }: Props) {
  const { banners } = useBanners();
  if (banners.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.scrollContent}
      decelerationRate="fast"
    >
      {banners.map((b) => (
        <BannerCard key={b.id} banner={b} />
      ))}
    </ScrollView>
  );
}

function BannerCard({ banner }: { banner: Banner }) {
  const openCta = () => {
    if (!banner.ctaUrl) return;
    Linking.openURL(banner.ctaUrl).catch(() => null);
  };

  return (
    <View style={styles.card}>
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.decor}>
          <View style={styles.decorTop} />
          <View style={styles.decorBottom} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {banner.title}
        </Text>
        {banner.body ? (
          <Text style={styles.bodyText} numberOfLines={3}>
            {banner.body}
          </Text>
        ) : null}
        {banner.ctaLabel && banner.ctaUrl ? (
          <Pressable
            onPress={openCta}
            accessibilityRole="button"
            accessibilityLabel={banner.ctaLabel}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>{banner.ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={13} color={COLORS.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const CARD_WIDTH = 300;
const CARD_HEIGHT = 130;

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'space-between', padding: 14 },
  bodyText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    width: CARD_WIDTH,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaText: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 11 },
  decor: { ...StyleSheet.absoluteFillObject },
  decorBottom: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderRadius: 40,
    bottom: -25,
    height: 80,
    position: 'absolute',
    right: 20,
    width: 80,
  },
  decorTop: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 60,
    height: 120,
    position: 'absolute',
    right: -30,
    top: -45,
    width: 120,
  },
  image: { bottom: 0, left: 0, opacity: 0.4, position: 'absolute', right: 0, top: 0 },
  pressed: { opacity: 0.85 },
  scrollContent: { gap: 10, paddingRight: 16 },
  title: { color: COLORS.white, fontFamily: FONTS.soraBold, fontSize: 15 },
});
