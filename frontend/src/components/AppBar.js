import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../theme';

// Barra superior común a las pestañas: marca a la izquierda y acceso a Ajustes a la derecha
export default function AppBar({ onAccountPress }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brand}>
        <Ionicons name="medkit-outline" size={24} color={colors.primaryText} />
        <Text style={styles.brandText}>Medi-Hora</Text>
      </View>
      <TouchableOpacity
        style={styles.accountBtn}
        onPress={onAccountPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Ajustes y cuenta"
      >
        <Ionicons name="person-circle-outline" size={30} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.4,
  },
  accountBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
