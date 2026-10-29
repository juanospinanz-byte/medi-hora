import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import ProgressRing from '../components/ProgressRing';
import { useAppData } from '../appData';
import { useDoseLog } from '../hooks/useDoseLog';
import { useTheme, makeStyles, getProfileTone } from '../theme';
import { addDays, getDosesForDate, formatTimeUntil, toDateKey } from '../utils/schedule';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Cuántas tomas se muestran antes de "Ver todas"
const COLLAPSED_COUNT = 5;

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatLongDate = (date) =>
  `${DAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;

// Estado visible de una toma de hoy según lo registrado y la hora actual
const getDoseStatus = (entry, dose, nowMinutes) => {
  if (entry) return entry.status;
  if (dose.minutes < nowMinutes) return 'overdue';
  return dose.minutes === nowMinutes ? 'now' : 'upcoming';
};

function DoseCard({ dose, status, person, disabled, onToggle, onOptions }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { med, time } = dose;
  const tone = getProfileTone(person?.type, colors);
  const done = status === 'taken' || status === 'skipped';
  const urgent = status === 'now' || status === 'overdue';

  return (
    <TouchableOpacity
      style={[styles.doseCard, done && styles.doseCardDone, urgent && styles.doseCardUrgent]}
      onPress={onOptions}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityHint="Abre las opciones de esta toma"
    >
      {med.photo ? (
        <Image source={{ uri: med.photo }} style={[styles.doseIcon, done && styles.faded]} />
      ) : (
        <View
          style={[
            styles.doseIcon,
            { backgroundColor: done ? colors.border : tone.color },
          ]}
        >
          <MaterialCommunityIcons name="pill" size={24} color={done ? colors.muted : '#fff'} />
        </View>
      )}

      <View style={styles.doseBody}>
        <Text style={[styles.doseName, done && styles.textDone]} numberOfLines={1}>
          {med.medication_name} {med.dose}
        </Text>
        <View style={styles.doseMetaRow}>
          <View style={[styles.personChip, { backgroundColor: done ? colors.surface : tone.soft }]}>
            <Text
              style={[styles.personChipText, { color: done ? colors.muted : tone.text }]}
              numberOfLines={1}
            >
              {person?.name || med.profile_name}
            </Text>
          </View>
          <View style={styles.timeRow}>
            <Ionicons
              name={status === 'overdue' ? 'alert-circle-outline' : 'time-outline'}
              size={17}
              color={status === 'overdue' ? colors.warning : colors.textSecondary}
            />
            <Text
              style={[
                styles.doseTime,
                status === 'overdue' && styles.doseTimeOverdue,
                done && styles.textDone,
              ]}
            >
              {time}
            </Text>
          </View>
        </View>
        {status === 'overdue' && <Text style={styles.overdueText}>Atrasada</Text>}
        {status === 'now' && <Text style={styles.nowText}>Es la hora</Text>}
        {status === 'skipped' && <Text style={styles.skippedText}>Omitida</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.check,
          urgent && styles.checkUrgent,
          status === 'taken' && styles.checkTaken,
          status === 'skipped' && styles.checkSkipped,
        ]}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: status === 'taken' }}
        accessibilityLabel={`${med.medication_name} de las ${time}`}
      >
        {status === 'taken' && <Ionicons name="checkmark" size={28} color="#fff" />}
        {status === 'skipped' && <Ionicons name="close" size={24} color={colors.muted} />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function TodayScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { profiles, medications, loading, now, refresh, notificationsEnabled, enableNotifications } =
    useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const { log, ready, setStatus } = useDoseLog(todayKey);

  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const doses = useMemo(() => getDosesForDate(medications, now), [medications, todayKey]);

  // Primero las pendientes en orden de hora; las ya registradas van al final
  const ordered = useMemo(
    () => [...doses.filter((d) => !log[d.key]), ...doses.filter((d) => log[d.key])],
    [doses, log]
  );
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);
  const takenCount = doses.filter((d) => log[d.key]?.status === 'taken').length;

  // La siguiente toma de hoy aún sin registrar o, si no queda ninguna, la primera de mañana
  const nextDose = useMemo(() => {
    const pending = doses.find((d) => d.minutes >= nowMinutes && !log[d.key]);
    if (pending) return { ...pending, minutesUntil: pending.minutes - nowMinutes, tomorrow: false };
    const first = getDosesForDate(medications, addDays(now, 1))[0];
    return first
      ? { ...first, minutesUntil: 24 * 60 - nowMinutes + first.minutes, tomorrow: true }
      : null;
  }, [doses, log, nowMinutes, medications, todayKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleToggle = (dose) => {
    setStatus(dose.key, log[dose.key]?.status === 'taken' ? null : 'taken');
  };

  // Máximo tres botones: Android no muestra más en una alerta
  const handleOptions = (dose) => {
    const { med, time } = dose;
    const status = log[dose.key]?.status;
    const personName = profilesById[med.profile_id]?.name || med.profile_name;
    const buttons = [];
    if (status !== 'taken') {
      buttons.push({ text: 'Marcar como tomada', onPress: () => setStatus(dose.key, 'taken') });
    }
    if (status !== 'skipped') {
      buttons.push({ text: 'Omitir esta toma', onPress: () => setStatus(dose.key, 'skipped') });
    }
    if (status) {
      buttons.push({ text: 'Dejar pendiente', onPress: () => setStatus(dose.key, null) });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      `${med.medication_name} · ${time}`,
      `${personName ? `${personName}: ` : ''}${med.dose}${med.notes ? `\n${med.notes}` : ''}`,
      buttons
    );
  };

  const renderDoses = () => {
    if (profiles.length === 0) {
      return (
        <EmptyState
          icon="people"
          title="Bienvenido a Medi-Hora"
          text="Crea el perfil de cada persona que cuidas para empezar a programar sus medicamentos."
          action="Añadir persona"
          onPress={() => navigation.navigate('ProfileForm')}
        />
      );
    }
    if (medications.length === 0) {
      return (
        <EmptyState
          icon="medkit-outline"
          title="Aún no hay tratamientos"
          text="Programa el primer medicamento y aquí verás las tomas de cada día."
        />
      );
    }
    if (doses.length === 0) {
      return (
        <EmptyState
          icon="leaf-outline"
          title="Sin tomas hoy"
          text="Hoy no hay medicamentos programados."
        />
      );
    }
    return visible.map((dose) => (
      <DoseCard
        key={dose.key}
        dose={dose}
        status={getDoseStatus(log[dose.key], dose, nowMinutes)}
        person={profilesById[dose.med.profile_id]}
        disabled={!ready}
        onToggle={() => handleToggle(dose)}
        onOptions={() => handleOptions(dose)}
      />
    ));
  };

  if (loading && profiles.length === 0 && medications.length === 0) {
    return (
      <View style={[styles.container, styles.centerLoading]}>
        <ActivityIndicator size="large" color={colors.primaryText} />
        <Text style={styles.loadingText}>Cargando tus tomas...</Text>
      </View>
    );
  }

  const nextPerson =
    nextDose && (profilesById[nextDose.med.profile_id]?.name || nextDose.med.profile_name);

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
      {notificationsEnabled === false && (
        <TouchableOpacity style={styles.notifBanner} onPress={enableNotifications} activeOpacity={0.85}>
          <Ionicons name="notifications-off-outline" size={22} color={colors.warning} />
          <View style={styles.notifBannerBody}>
            <Text style={styles.notifBannerTitle}>Notificaciones desactivadas</Text>
            <Text style={styles.notifBannerText}>Toca aquí para recibir el aviso de cada toma.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* PROGRESO DEL DÍA */}
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{getGreeting(now)}</Text>
          <Text style={styles.heroSubtitle}>Progreso del día</Text>
          <Text style={styles.heroDate}>{formatLongDate(now)}</Text>
          {nextDose && (
            <View style={styles.nextRow}>
              <Ionicons
                name={notificationsEnabled ? 'notifications-outline' : 'time-outline'}
                size={15}
                color={colors.primaryText}
              />
              <Text style={styles.nextText} numberOfLines={2}>
                {nextDose.tomorrow ? 'Mañana' : 'Próxima'} {nextDose.time} ·{' '}
                {nextDose.med.medication_name}
                {nextPerson ? ` (${nextPerson})` : ''} · {formatTimeUntil(nextDose.minutesUntil)}
              </Text>
            </View>
          )}
        </View>
        <ProgressRing value={takenCount} total={doses.length} />
      </View>

      {/* PRÓXIMAS TOMAS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Próximas tomas</Text>
        {ordered.length > COLLAPSED_COUNT && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={12}>
            <Text style={styles.sectionLink}>{expanded ? 'Ver menos' : 'Ver todas'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderDoses()}

      {profiles.length > 0 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Add')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
          <Text style={styles.addButtonText}>Añadir medicamento</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32 },
  centerLoading: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 15 },

  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  notifBannerBody: { flex: 1 },
  notifBannerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  notifBannerText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Tarjeta de progreso
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 17, color: colors.textSecondary, marginTop: 4 },
  heroDate: { fontSize: 13, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  nextText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryText, lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 15, fontWeight: '700', color: colors.primaryText },

  // Tarjeta de toma
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  doseCardDone: { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
  doseCardUrgent: { borderColor: colors.primary, borderWidth: 1.5 },
  doseIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faded: { opacity: 0.5 },
  doseBody: { flex: 1 },
  doseName: { fontSize: 17, fontWeight: '700', color: colors.text },
  textDone: { color: colors.muted, textDecorationLine: 'line-through' },
  doseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  personChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, maxWidth: 140 },
  personChipText: { fontSize: 14, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doseTime: { fontSize: 16, color: colors.textSecondary },
  doseTimeOverdue: { color: colors.warning, fontWeight: '700' },
  overdueText: { fontSize: 13, fontWeight: '700', color: colors.warning, marginTop: 4 },
  nowText: { fontSize: 13, fontWeight: '700', color: colors.primaryText, marginTop: 4 },
  skippedText: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 4 },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkUrgent: { borderColor: colors.primary, borderWidth: 2.5 },
  checkTaken: { backgroundColor: colors.success, borderColor: colors.success },
  checkSkipped: { backgroundColor: colors.border, borderColor: colors.border },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    marginTop: 12,
  },
  addButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
}));
