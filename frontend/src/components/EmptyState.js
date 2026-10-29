import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../theme';

export default function EmptyState({ icon, title, text, action, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={34} color={colors.primaryText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {action && (
        <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.btnText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 290,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    marginTop: 18,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
}));
