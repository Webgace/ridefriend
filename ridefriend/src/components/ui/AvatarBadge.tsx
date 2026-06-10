// Ficheiro: src/components/ui/AvatarBadge.tsx | Função: avatar circular + inicial + dot online (P5)
// Ref. mockup: .avatar no ridefriend.html
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, FONTS, RELATION_COLORS, RelationGroup } from '@constants/theme';

export type OnlineStatus = 'online' | 'busy' | 'offline';

interface Props {
  name: string;
  group?: RelationGroup;
  status?: OnlineStatus;
  size?: number;
  style?: ViewStyle;
}

const STATUS_COLOR: Record<OnlineStatus, string> = {
  online: COLORS.green,
  busy: COLORS.amber,
  offline: COLORS.text3,
};

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length === 0 ? '?' : trimmed.charAt(0).toUpperCase();
}

export default function AvatarBadge({
  name,
  group = 'friend',
  status = 'online',
  size = 46,
  style,
}: Props) {
  const palette = RELATION_COLORS[group];
  const dotSize = Math.max(10, Math.round(size * 0.26));

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette.avatarBg,
          },
        ]}
      >
        <Text
          style={[
            styles.initial,
            { color: palette.avatarFg, fontSize: Math.round(size * 0.42) },
          ]}
        >
          {initialOf(name)}
        </Text>
      </View>
      <View
        style={[
          styles.statusDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: STATUS_COLOR[status],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FONTS.soraBold,
  },
  statusDot: {
    borderColor: COLORS.white,
    borderWidth: 2,
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  wrap: {
    position: 'relative',
  },
});
