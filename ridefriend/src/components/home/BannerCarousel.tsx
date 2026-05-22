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
  scrollContent: { gap: 10, paddingRight: 16 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 },
  decor: { ...StyleSheet.absoluteFillObject },
  decorTop: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245,158,11,0.18)',
    top: -45,
    right: -30,
  },
  decorBottom: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.10)',
    bottom: -25,
    right: 20,
  },
  body: { flex: 1, padding: 14, justifyContent: 'space-between' },
  title: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.white },
  bodyText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: COLORS.amber,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 6,
  },
  ctaText: { fontFamily: FONTS.soraBold, fontSize: 11, color: COLORS.white },
  pressed: { opacity: 0.85 },
});
