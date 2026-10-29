import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../appData';
import { loadDoseLogs } from '../hooks/useDoseLog';
import { useTheme, makeStyles, getProfileTone } from '../theme';
import { addDays, toDateKey } from '../utils/schedule';

const HISTORY_DAYS = 30;
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const dayLabel = (offset, date) => {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Ayer';
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { medications, profiles, now } = useAppData();
  const [logs, setLogs] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const todayKey = toDateKey(now);
  const days = useMemo(
    () =>
      Array.from({ length: HISTORY_DAYS }, (_, offset) => {
        const date = addDays(now, -offset);
        return { offset, date, key: toDateKey(date) };
      }),
    [todayKey]
  );

  const load = useCallback(async () => {
    try {
      setLogs(await loadDoseLogs(days.map((d) => d.key)));
    } catch {
      setLogs({});
    }
  }, [days]);

  // Las tomas se marcan en la pestaña Hoy, así que se relee al entrar
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const medsById = useMemo(
    () => Object.fromEntries(medications.map((m) => [String(m.id), m])),
    [medications]
  );
  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  // Solo días con registros; se omiten tomas de medicamentos ya eliminados
  const groups = days
    .map((day) => ({
      ...day,
      items: Object.entries(logs[day.key] || {})
        .map(([doseKey, entry]) => {
          const [medId, time] = doseKey.split('@');
          return { doseKey, entry, time, med: medsById[medId] };
        })
        .filter((item) => item.med)
        .sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .filter((day) => day.items.length > 0);

  const takenTotal = groups.reduce(
    (n, g) => n + g.items.filter((i) => i.entry.status === 'taken').length,
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primaryText}
          colors={[colors.primaryText]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <Text style={styles.title}>Historial de tomas</Text>
      <Text style={styles.subtitle}>
        {groups.length > 0
          ? `Revisa tu progreso: ${takenTotal} ${takenTotal === 1 ? 'toma registrada' : 'tomas registradas'} en los últimos ${HISTORY_DAYS} días.`
          : 'Revisa tu progreso y los medicamentos registrados.'}
      </Text>

      {groups.length === 0 && (
        <EmptyState
          icon="time-outline"
          title="Aún no hay tomas registradas"
          text="Cuando marques una toma en la pestaña Hoy, aparecerá aquí."
        />
      )}

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View style={[styles.groupLabelRow, group.offset === 0 && styles.groupLabelRowToday]}>
            <Text style={[styles.groupLabel, group.offset === 0 && styles.groupLabelToday]}>
              {dayLabel(group.offset, group.date)}
            </Text>
          </View>

          <View style={styles.groupCard}>
            {group.items.map((item, index) => {
              const person = profilesById[item.med.profile_id];
              const tone = getProfileTone(person?.type, colors);
              const taken = item.entry.status === 'taken';
              return (
                <View
                  key={item.doseKey}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                >
                  {item.med.photo ? (
                    <Image source={{ uri: item.med.photo }} style={styles.rowIcon} />
                  ) : (
                    <View style={[styles.rowIcon, { backgroundColor: tone.soft }]}>
                      <MaterialCommunityIcons name="pill" size={24} color={tone.text} />
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.med.medication_name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[item.time, item.med.dose, person?.name || item.med.profile_name]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                  <Ionicons
                    name={taken ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={30}
                    color={taken ? colors.success : colors.muted}
                    accessibilityLabel={taken ? 'Tomada' : 'Omitida'}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
  },

  group: { marginBottom: 24 },
  groupLabelRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    marginBottom: 12,
  },
  groupLabelRowToday: { borderLeftColor: colors.primary },
  groupLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupLabelToday: { color: colors.primaryText },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  rowIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 18, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
}));
