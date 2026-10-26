import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getProfileTone, useTheme } from '../theme';

export default function Avatar({ name, photo, type, size = 48, style }) {
  const { colors } = useTheme();
  const tone = getProfileTone(type, colors);
  const box = { width: size, height: size, borderRadius: size * 0.34 };

  if (photo) {
    return <Image source={{ uri: photo }} style={[box, style]} />;
  }

  return (
    <View style={[styles.placeholder, box, { backgroundColor: tone.color }, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {name ? name.trim().charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '800',
  },
});
