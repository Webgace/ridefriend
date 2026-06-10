// Ficheiro: src/components/ui/AppHeader.tsx | Função: barra superior partilhada (logo, sino, QR, avatar)
// Ref. mockup: header "RideFriend" no topo dos ecrãs Home e Map
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@constants/theme';

interface Props {
  userInitial?: string;
  userAvatarUrl?: string | null;
  hasNotifications?: boolean;
  onBellPress?: () => void;
  onQrPress?: () => void;
  onAvatarPress?: () => void;
  style?: ViewStyle;
}

export default function AppHeader({
  userInitial,
  userAvatarUrl,
  hasNotifications = false,
  onBellPress,
  onQrPress,
  onAvatarPress,
  style,
}: Props) {
  const initial = (userInitial ?? '·').trim().slice(0, 1).toUpperCase() || '·';

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.brand}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={styles.title}>RideFriend</Text>
      </View>

      <View style={styles.actions}>
        <CircleAction onPress={onBellPress} accessibilityLabel="Notificações">
          <Ionicons name="notifications-outline" size={18} color={COLORS.navy} />
          {hasNotifications ? <View style={styles.dot} /> : null}
        </CircleAction>

        <CircleAction onPress={onQrPress} accessibilityLabel="Código QR">
          <MaterialCommunityIcons name="qrcode-scan" size={18} color={COLORS.navy} />
        </CircleAction>

        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          {userAvatarUrl ? (
            <Image source={{ uri: userAvatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

interface CircleProps {
  onPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}

function CircleAction({ onPress, accessibilityLabel, children }: CircleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const SIZE = 36;

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZE / 2,
    height: SIZE,
    justifyContent: 'center',
    overflow: 'hidden',
    width: SIZE,
  },
  avatarImg: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 14,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 8,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 8,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZE / 2,
    height: SIZE,
    justifyContent: 'center',
    position: 'relative',
    width: SIZE,
  },
  logo: {
    backgroundColor: COLORS.navy,
    borderRadius: 9,
    height: 30,
    width: 30,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.soraBold,
    fontSize: 19,
  },
  wrap: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
});
