import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAppData } from '../appData';
import { useTheme, makeStyles, lightColors, darkColors } from '../theme';

const THEME_OPTIONS = [
  { id: 'light', label: 'Claro', icon: 'sunny-outline' },
  { id: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { id: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

// Miniatura de la pantalla principal pintada con una paleta concreta
function PreviewPane({ palette }) {
  return (
    <View style={[previewStyles.pane, { backgroundColor: palette.bg }]}>
      <View style={[previewStyles.title, { backgroundColor: palette.primaryDark }]} />
      <View style={[previewStyles.hero, { backgroundColor: palette.hero }]} />
      <View style={[previewStyles.row, { backgroundColor: palette.surface, borderColor: palette.border }]} />
      <View style={[previewStyles.row, { backgroundColor: palette.surface, borderColor: palette.border }]} />
    </View>
  );
}

function ThemePreview({ mode }) {
  const styles = useStyles();
  return (
    <View style={styles.preview}>
      {mode !== 'dark' && <PreviewPane palette={lightColors} />}
      {mode !== 'light' && <PreviewPane palette={darkColors} />}
    </View>
  );
}

export default function SettingsScreen({ onLogout }) {
  const { colors, mode, setMode, isDark } = useTheme();
  const { notificationsEnabled, enableNotifications } = useAppData();
  const styles = useStyles();

  const modeDescription =
    mode === 'system'
      ? `Igual que tu celular (ahora ${isDark ? 'oscuro' : 'claro'})`
      : `Siempre en modo ${mode === 'dark' ? 'oscuro' : 'claro'}`;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de tu cuenta? Dejarás de recibir los recordatorios en este celular.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Apariencia</Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primaryText} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Tema de la app</Text>
            <Text style={styles.cardSubtitle}>{modeDescription}</Text>
          </View>
        </View>

        <View style={styles.optionsRow} accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((option) => {
            const active = mode === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setMode(option.id)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Tema ${option.label}`}
              >
                <ThemePreview mode={option.id} />
                <View style={styles.optionLabelRow}>
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={active ? colors.primaryText : colors.textSecondary}
                  />
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                </View>
                {active && (
                  <View style={styles.optionCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
          <Text style={styles.hintText}>
            En Automático, la app cambia sola cuando tu celular pasa a modo oscuro o claro.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Notificaciones</Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons
              name={notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
              size={20}
              color={notificationsEnabled ? colors.primaryText : colors.warning}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Recordatorios de tomas</Text>
            <Text style={styles.cardSubtitle}>
              {notificationsEnabled
                ? 'Activados: te avisamos a la hora exacta de cada toma'
                : 'Desactivados: no recibirás avisos'}
            </Text>
          </View>
        </View>
        {notificationsEnabled === false && (
          <TouchableOpacity style={styles.primaryBtn} onPress={enableNotifications} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Activar notificaciones</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>Cuenta</Text>
      <TouchableOpacity
        style={[styles.card, styles.logoutRow]}
        onPress={handleLogout}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={[styles.cardIcon, styles.logoutIcon]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        </View>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <Text style={styles.footer}>Medi-Hora · versión {Constants.expoConfig?.version || '1.0.0'}</Text>
    </ScrollView>
  );
}

const previewStyles = StyleSheet.create({
  pane: { flex: 1, padding: 6, gap: 4 },
  title: { height: 5, width: '55%', borderRadius: 3, marginBottom: 1 },
  hero: { height: 18, borderRadius: 5 },
  row: { height: 11, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
});

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 36 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },

  optionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  option: {
    flex: 1,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  preview: {
    width: '100%',
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  optionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  optionLabelActive: { color: colors.primaryText, fontWeight: '800' },
  optionCheck: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
  },
  hintText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  logoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  logoutIcon: { backgroundColor: colors.dangerSoft },
  logoutText: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.danger },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: 28,
  },
}));
