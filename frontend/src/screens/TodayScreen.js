import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { useAppData } from '../appData';
import { useDoseLog } from '../hooks/useDoseLog';
import { useTheme, makeStyles, shadowSm, shadowMd } from '../theme';
import { DAY_SEGMENTS, addDays, getDosesForDate, formatTimeUntil, toDateKey } from '../utils/schedule';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Días visibles en la tira superior, relativos a hoy
const STRIP_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

const SEGMENT_ICONS = {
  madrugada: 'moon-outline',
  manana: 'sunny-outline',
  tarde: 'partly-sunny-outline',
  noche: 'cloudy-night-outline',
};

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatLongDate = (date) =>
  `${DAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;

const formatClock = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

// Estado visible de una toma según lo registrado y la hora actual
const getDoseStatus = (entry, dose, dayOffset, nowMinutes) => {
  if (entry) return entry.status;
  if (dayOffset > 0) return 'upcoming';
  if (dayOffset < 0) return 'missed';
  if (dose.minutes < nowMinutes) return 'overdue';
  return dose.minutes === nowMinutes ? 'now' : 'upcoming';
};

function EmptyState({ icon, title, text, action, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.emptyCard, shadowSm]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.primaryText} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.emptyBtnText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DoseRow({ dose, status, entry, person, canLog, onToggle, onOptions }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { med, time } = dose;
  const taken = status === 'taken';
  const skipped = status === 'skipped';
  const urgent = status === 'now' || status === 'overdue';
  const personName = person?.name || med.profile_name;

  const statusInfo = {
    taken: {
      icon: 'checkmark-circle',
      color: colors.success,
      label: `Tomada a las ${entry ? formatClock(entry.at) : time}`,
    },
    skipped: { icon: 'remove-circle', color: colors.muted, label: 'Omitida' },
    overdue: { icon: 'alert-circle', color: colors.warning, label: 'Atrasada' },
    now: { icon: 'notifications', color: colors.primaryText, label: 'Es la hora' },
    missed: { icon: 'help-circle', color: colors.warning, label: 'Sin registrar' },
  }[status];

  let btnIconColor = colors.primaryText;
  if (urgent) btnIconColor = '#fff';
  if (taken) btnIconColor = colors.success;
  if (skipped) btnIconColor = colors.muted;

  return (
    <View style={styles.doseRow}>
      <Text style={[styles.doseTime, (taken || skipped) && styles.doseTimeDone]}>{time}</Text>

      <TouchableOpacity
        style={[styles.doseCard, shadowSm, urgent && styles.doseCardUrgent]}
        onPress={onOptions}
        disabled={!canLog}
        activeOpacity={0.85}
        accessibilityHint="Abre las opciones de esta toma"
      >
        {med.photo ? (
          <Image source={{ uri: med.photo }} style={styles.doseThumb} />
        ) : (
          <View style={[styles.doseThumb, styles.doseThumbPlaceholder]}>
            <Ionicons name="medical" size={18} color={colors.primaryText} />
          </View>
        )}

        <View style={styles.doseBody}>
          <Text style={styles.doseName} numberOfLines={1}>
            {med.medication_name}
          </Text>
          <View style={styles.dosePersonRow}>
            <Avatar name={personName} photo={person?.photo} type={person?.type} size={20} />
            <Text style={styles.doseMeta} numberOfLines={1}>
              {[personName, med.dose].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {statusInfo && (
            <View style={styles.doseStatusRow}>
              <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={styles.doseStatusText}>{statusInfo.label}</Text>
            </View>
          )}
        </View>

        {canLog && (
          <TouchableOpacity
            style={[
              styles.takeBtn,
              urgent && styles.takeBtnUrgent,
              taken && styles.takeBtnTaken,
              skipped && styles.takeBtnSkipped,
            ]}
            onPress={onToggle}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              taken
                ? `Desmarcar ${med.medication_name} de las ${time}`
                : `Marcar ${med.medication_name} de las ${time} como tomada`
            }
          >
            <Ionicons name={skipped ? 'close' : 'checkmark'} size={18} color={btnIconColor} />
            <Text
              style={[
                styles.takeBtnText,
                urgent && styles.takeBtnTextUrgent,
                (taken || skipped) && styles.takeBtnTextDone,
              ]}
            >
              {taken ? 'Tomada' : skipped ? 'Omitida' : 'Tomar'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function TodayScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { profiles, medications, loading, now, refresh, notificationsEnabled, enableNotifications } =
    useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  const todayKey = toDateKey(now);
  const selectedDate = addDays(now, dayOffset);
  const selectedKey = toDateKey(selectedDate);
  const isToday = dayOffset === 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const { log, ready, setStatus } = useDoseLog(selectedKey);
  // Solo se registran tomas de hoy o de días pasados
  const canLog = dayOffset <= 0 && ready;

  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const doses = useMemo(
    () => getDosesForDate(medications, selectedDate),
    [medications, selectedKey]
  );

  const stripDays = useMemo(
    () =>
      STRIP_OFFSETS.map((offset) => {
        const date = addDays(now, offset);
        return { offset, date, hasDoses: getDosesForDate(medications, date).length > 0 };
      }),
    [medications, todayKey]
  );

  const statusByKey = useMemo(
    () =>
      Object.fromEntries(
        doses.map((d) => [d.key, getDoseStatus(log[d.key], d, dayOffset, nowMinutes)])
      ),
    [doses, log, dayOffset, nowMinutes]
  );

  const countBy = (status) => doses.filter((d) => statusByKey[d.key] === status).length;
  const takenCount = countBy('taken');
  const skippedCount = countBy('skipped');
  const overdueCount = countBy('overdue');
  const missedCount = countBy('missed');

  const sections = useMemo(
    () =>
      DAY_SEGMENTS.map((segment) => ({
        ...segment,
        data: doses.filter((d) => d.minutes >= segment.from * 60 && d.minutes < segment.to * 60),
      })).filter((segment) => segment.data.length > 0),
    [doses]
  );

  // La siguiente toma de hoy aún sin registrar o, si no queda ninguna, la primera de mañana
  const nextDose = useMemo(() => {
    if (!isToday) return null;
    const pending = doses.find((d) => d.minutes >= nowMinutes && !log[d.key]);
    if (pending) return { ...pending, dayOffset: 0, minutesUntil: pending.minutes - nowMinutes };
    const first = getDosesForDate(medications, addDays(now, 1))[0];
    return first ? { ...first, dayOffset: 1, minutesUntil: 24 * 60 - nowMinutes + first.minutes } : null;
  }, [isToday, doses, log, nowMinutes, medications, todayKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate(profiles.length ? 'ScheduleReminder' : 'ProfileForm');
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

  const renderTodayHero = () => {
    if (!doses.length && !nextDose) return null;
    const allDone = doses.length > 0 && takenCount + skippedCount === doses.length;
    const nextPerson = nextDose && (profilesById[nextDose.med.profile_id]?.name || nextDose.med.profile_name);

    return (
      <View style={[styles.hero, shadowMd]}>
        {doses.length > 0 && (
          <View>
            <View style={styles.heroProgressRow}>
              <Text style={styles.heroCount}>
                {takenCount}
                <Text style={styles.heroCountTotal}>/{doses.length}</Text>
              </Text>
              <Text style={styles.heroProgressLabel}>
                {allDone ? 'Registraste todas las tomas de hoy' : 'tomas registradas hoy'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(takenCount / doses.length) * 100}%` }]} />
            </View>
            {overdueCount > 0 && (
              <View style={styles.heroAlertRow}>
                <Ionicons name="alert-circle" size={15} color={colors.accent} />
                <Text style={styles.heroAlertText}>
                  {pluralize(overdueCount, 'toma atrasada', 'tomas atrasadas')}
                </Text>
              </View>
            )}
          </View>
        )}

        {nextDose && (
          <View style={doses.length > 0 && styles.heroNextDivider}>
            <View style={styles.rowBetween}>
              <Text style={styles.heroLabel}>
                Próxima toma · {nextDose.dayOffset === 0 ? 'Hoy' : 'Mañana'}
              </Text>
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>{formatTimeUntil(nextDose.minutesUntil)}</Text>
              </View>
            </View>
            <View style={styles.heroNextMain}>
              <Text style={styles.heroTime}>{nextDose.time}</Text>
              <View style={styles.heroNextInfo}>
                <Text style={styles.heroMedName} numberOfLines={1}>
                  {nextDose.med.medication_name}
                </Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {[nextDose.med.dose, nextPerson].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            {notificationsEnabled && (
              <View style={styles.heroAlertRow}>
                <Ionicons name="notifications-outline" size={13} color={colors.heroMuted} />
                <Text style={styles.heroNote}>Recibirás una notificación a las {nextDose.time}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDaySummary = () => {
    let summary;
    if (doses.length === 0) {
      summary = 'Sin tomas programadas';
    } else if (dayOffset > 0) {
      summary = pluralize(doses.length, 'toma programada', 'tomas programadas');
    } else {
      summary = [
        pluralize(takenCount, 'tomada', 'tomadas'),
        skippedCount ? pluralize(skippedCount, 'omitida', 'omitidas') : null,
        missedCount ? `${missedCount} sin registrar` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }

    return (
      <View style={[styles.summaryCard, shadowSm]}>
        <View style={styles.summaryIcon}>
          <Ionicons
            name={dayOffset > 0 ? 'calendar-outline' : 'time-outline'}
            size={20}
            color={colors.primaryText}
          />
        </View>
        <View style={styles.summaryBody}>
          <Text style={styles.summaryTitle}>{formatLongDate(selectedDate)}</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
        <TouchableOpacity
          style={styles.todayLink}
          onPress={() => setDayOffset(0)}
          activeOpacity={0.8}
          accessibilityLabel="Volver a hoy"
        >
          <Text style={styles.todayLinkText}>Hoy</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <View style={styles.greetingBlock}>
          <Text style={styles.dateText}>{formatLongDate(now)}</Text>
          <Text style={styles.greeting}>{getGreeting(now)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAdd}
          activeOpacity={0.85}
          accessibilityLabel="Añadir medicamento"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {notificationsEnabled === false && (
        <TouchableOpacity style={styles.notifBanner} onPress={enableNotifications} activeOpacity={0.85}>
          <View style={styles.notifBannerIcon}>
            <Ionicons name="notifications-off-outline" size={20} color={colors.warning} />
          </View>
          <View style={styles.notifBannerBody}>
            <Text style={styles.notifBannerTitle}>Notificaciones desactivadas</Text>
            <Text style={styles.notifBannerText}>
              Actívalas para recibir el aviso a la hora de cada toma.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </TouchableOpacity>
      )}

      <View style={styles.strip}>
        {stripDays.map(({ offset, date, hasDoses }) => {
          const selected = offset === dayOffset;
          return (
            <TouchableOpacity
              key={offset}
              style={[
                styles.stripDay,
                offset === 0 && styles.stripToday,
                selected && styles.stripSelected,
              ]}
              onPress={() => setDayOffset(offset)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={offset === 0 ? 'Hoy' : formatLongDate(date)}
            >
              <Text style={[styles.stripWeekday, selected && styles.stripTextSelected]}>
                {offset === 0 ? 'Hoy' : DAY_SHORT[date.getDay()]}
              </Text>
              <Text style={[styles.stripNumber, selected && styles.stripTextSelected]}>
                {date.getDate()}
              </Text>
              <View
                style={[
                  styles.stripDot,
                  hasDoses && styles.stripDotActive,
                  hasDoses && selected && styles.stripDotSelected,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {medications.length > 0 && (isToday ? renderTodayHero() : renderDaySummary())}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (profiles.length === 0) {
      return (
        <EmptyState
          icon="people"
          title="Bienvenido a Medi-Hora"
          text="Crea el perfil de cada persona que cuidas para empezar a programar sus medicamentos."
          action="Crear perfil"
          onPress={() => navigation.navigate('ProfileForm')}
        />
      );
    }
    if (medications.length === 0) {
      return (
        <EmptyState
          icon="medkit"
          title="Aún no hay tratamientos"
          text="Programa el primer medicamento y aquí verás las tomas de cada día."
          action="Programar dosis"
          onPress={() => navigation.navigate('ScheduleReminder')}
        />
      );
    }
    return (
      <EmptyState
        icon="leaf-outline"
        title="Sin tomas este día"
        text="No hay medicamentos programados para esta fecha."
      />
    );
  };

  if (loading && profiles.length === 0 && medications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerLoading]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primaryText} />
        <Text style={styles.loadingText}>Cargando tus tomas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <DoseRow
            dose={item}
            status={statusByKey[item.key]}
            entry={log[item.key]}
            person={profilesById[item.med.profile_id]}
            canLog={canLog}
            onToggle={() => handleToggle(item)}
            onOptions={() => handleOptions(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name={SEGMENT_ICONS[section.id]} size={16} color={colors.primaryText} />
            </View>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <Text style={styles.sectionCount}>
              {pluralize(section.data.length, 'toma', 'tomas')}
            </Text>
          </View>
        )}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryText}
            colors={[colors.primaryText]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  centerLoading: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Encabezado
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 18,
  },
  greetingBlock: { flex: 1 },
  dateText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Aviso de permisos
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  notifBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBannerBody: { flex: 1 },
  notifBannerTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  notifBannerText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  // Tira de días
  strip: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stripToday: { borderColor: colors.primary },
  stripSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  stripWeekday: { fontSize: 12, fontWeight: '700', color: colors.muted },
  stripNumber: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  stripTextSelected: { color: '#fff' },
  stripDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
    backgroundColor: 'transparent',
  },
  stripDotActive: { backgroundColor: colors.primaryText },
  stripDotSelected: { backgroundColor: '#fff' },

  // Tarjeta de hoy
  hero: {
    backgroundColor: colors.hero,
    borderRadius: 24,
    padding: 20,
    marginBottom: 6,
  },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCount: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  heroCountTotal: { color: colors.heroMuted, fontSize: 20, fontWeight: '700' },
  heroProgressLabel: { flex: 1, color: colors.heroMuted, fontSize: 14, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.heroMuted },
  heroAlertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroAlertText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroNextDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroLabel: {
    color: colors.heroMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  countdownPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroNextMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  heroTime: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  heroNextInfo: {
    flex: 1,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.18)',
  },
  heroMedName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroMeta: { color: colors.heroMuted, fontSize: 13, marginTop: 2 },
  heroNote: { color: colors.heroMuted, fontSize: 12, fontWeight: '600' },

  // Resumen de otro día
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 6,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: { flex: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  summaryText: { fontSize: 13, color: colors.muted, marginTop: 2 },
  todayLink: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLinkText: { color: colors.primaryText, fontSize: 13, fontWeight: '800' },

  // Secciones por momento del día
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  sectionCount: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: colors.muted },

  // Fila de toma
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  doseTime: { width: 48, fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  doseTimeDone: { color: colors.muted },
  doseCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  doseCardUrgent: { borderColor: colors.primary },
  doseThumb: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.border },
  doseThumbPlaceholder: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseBody: { flex: 1 },
  doseName: { fontSize: 16, fontWeight: '800', color: colors.text },
  dosePersonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  doseMeta: { flexShrink: 1, fontSize: 13, color: colors.textSecondary },
  doseStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  doseStatusText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 84,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  takeBtnUrgent: { backgroundColor: colors.primary },
  takeBtnTaken: { backgroundColor: colors.successSoft, borderColor: colors.success },
  takeBtnSkipped: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  takeBtnText: { fontSize: 14, fontWeight: '800', color: colors.primaryText },
  takeBtnTextUrgent: { color: '#fff' },
  takeBtnTextDone: { color: colors.text },

  // Estados vacíos
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    marginTop: 16,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    marginTop: 18,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
}));
