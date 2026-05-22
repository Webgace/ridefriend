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
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.navy,
  },
  title: {
    fontFamily: FONTS.soraBold,
    fontSize: 19,
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.7,
  },
});
