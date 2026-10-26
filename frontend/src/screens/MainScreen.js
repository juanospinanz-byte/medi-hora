import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import Avatar from '../components/Avatar';
import { colors, shadow, shadowSm, shadowMd, getProfileTone } from '../theme';
import { getUpcomingDoses, formatTimeUntil, formatAge } from '../utils/schedule';

const MAX_PROFILES = 10;
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatToday = (date) =>
  `${DAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;

const formatFrequencyLabel = (freqType, freqVal) => {
  switch (freqType) {
    case 'diaria':
      return 'Diaria';
    case 'cada_x_horas':
      return `Cada ${freqVal || '8'} h`;
    case 'dias_alternos':
      return 'Días alternos';
    case 'dias_especificos':
      return 'Días seleccionados';
    case 'semanal':
      return 'Semanal';
    default:
      return freqType || 'Horario fijo';
  }
};

export default function MainScreen({ navigation, onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, medsRes] = await Promise.all([
        client.get('/profiles'),
        client.get('/medications').catch(() => ({ data: [] })),
      ]);
      setProfiles(profilesRes.data || []);
      setMedications(medsRes.data || []);
      setNow(new Date());
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron sincronizar los datos familiares.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  // Mantiene actualizada la cuenta regresiva de la próxima toma
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const { today, upcoming } = useMemo(
    () => getUpcomingDoses(medications, now),
    [medications, now]
  );

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);
  };

  const handleNewProfile = () => {
    if (profiles.length >= MAX_PROFILES) {
      Alert.alert('Límite alcanzado', `Has alcanzado el límite máximo de ${MAX_PROFILES} perfiles por cuenta.`);
    } else {
      navigation.navigate('ProfileForm');
    }
  };

  const handleDeleteProfile = async (id, name) => {
    Alert.alert(
      'Eliminar Perfil',
      `¿Deseas eliminar a "${name}" y todos sus recordatorios programados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/profiles/${id}`);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMedication = async (medId, medName) => {
    Alert.alert(
      'Eliminar Recordatorio',
      `¿Deseas eliminar el tratamiento de "${medName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/medications/${medId}`);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          },
        },
      ]
    );
  };

  const renderNextDose = () => {
    if (medications.length === 0) return null;

    const next = upcoming[0];
    if (!next) {
      return (
        <View style={[styles.nextCard, shadowMd]}>
          <View style={styles.nextLabelRow}>
            <Ionicons name="checkmark-done" size={16} color={colors.primarySoft} />
            <Text style={styles.nextLabel}>Sin tomas pendientes</Text>
          </View>
          <Text style={styles.nextEmptyText}>No hay dosis programadas para hoy ni mañana.</Text>
        </View>
      );
    }

    const later = upcoming.slice(1, 4);

    return (
      <View style={[styles.nextCard, shadowMd]}>
        <View style={styles.rowBetween}>
          <View style={styles.nextLabelRow}>
            <Ionicons name="alarm" size={15} color={colors.primarySoft} />
            <Text style={styles.nextLabel}>
              Próxima toma · {next.dayOffset === 0 ? 'Hoy' : 'Mañana'}
            </Text>
          </View>
          <View style={styles.countdownPill}>
            <Text style={styles.countdownText}>{formatTimeUntil(next.minutesUntil)}</Text>
          </View>
        </View>

        <View style={styles.nextMain}>
          <Text style={styles.nextTime}>{next.time}</Text>
          <View style={styles.nextInfo}>
            <Text style={styles.nextMedName} numberOfLines={1}>
              {next.med.medication_name}
            </Text>
            <Text style={styles.nextMeta} numberOfLines={1}>
              {next.med.dose}
              {next.med.profile_name ? ` · ${next.med.profile_name}` : ''}
            </Text>
          </View>
        </View>

        {later.length > 0 && (
          <View style={styles.laterRow}>
            <Text style={styles.laterLabel}>Después</Text>
            {later.map((item) => (
              <View key={`${item.med.id}-${item.time}`} style={styles.laterChip}>
                <Text style={styles.laterChipTime}>{item.time}</Text>
                <Text style={styles.laterChipName} numberOfLines={1}>
                  {item.med.medication_name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <View style={styles.greetingBlock}>
          <Text style={styles.dateText}>{formatToday(now)}</Text>
          <Text style={styles.greeting}>{getGreeting(now)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, shadowSm]}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderNextDose()}

      <View style={styles.statsRow}>
        <View style={[styles.statTile, shadowSm]}>
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <Text style={styles.statValue}>{profiles.length}</Text>
          <Text style={styles.statLabel}>Perfiles</Text>
        </View>
        <View style={[styles.statTile, shadowSm]}>
          <Ionicons name="medkit-outline" size={18} color={colors.primary} />
          <Text style={styles.statValue}>{medications.length}</Text>
          <Text style={styles.statLabel}>Tratamientos</Text>
        </View>
        <View style={[styles.statTile, shadowSm]}>
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={styles.statValue}>{today.length}</Text>
          <Text style={styles.statLabel}>Pendientes hoy</Text>
        </View>
      </View>

      {profiles.length > 0 && (
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Mi familia</Text>
          <Text style={styles.sectionCount}>
            {profiles.length}/{MAX_PROFILES}
          </Text>
        </View>
      )}
    </View>
  );

  const renderProfileItem = ({ item }) => {
    const profileMeds = medications.filter((m) => m.profile_id === item.id);
    const tone = getProfileTone(item.type);
    const age = formatAge(item.birthdate);

    return (
      <View style={[styles.card, shadowSm]}>
        <View style={[styles.cardAccent, { backgroundColor: tone.color }]} />

        {/* CABECERA DEL PERFIL */}
        <View style={styles.profileHeader}>
          <Avatar name={item.name} photo={item.photo} type={item.type} size={52} />

          <View style={styles.cardInfo}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: tone.soft }]}>
                <Ionicons name={tone.icon} size={11} color={tone.color} />
                <Text style={[styles.typeBadgeText, { color: tone.color }]}>{item.type}</Text>
              </View>
              {age && <Text style={styles.details}>{age}</Text>}
            </View>
          </View>

          <View style={styles.actionsTop}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('ProfileForm', { profile: item })}
              activeOpacity={0.7}
              accessibilityLabel={`Editar ${item.name}`}
            >
              <Ionicons name="create-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleDeleteProfile(item.id, item.name)}
              activeOpacity={0.7}
              accessibilityLabel={`Eliminar ${item.name}`}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* TRATAMIENTOS ASIGNADOS */}
        <View style={styles.medsSection}>
          <View style={styles.medsHeaderRow}>
            <Text style={styles.medsTitle}>Tratamientos</Text>
            <Text style={styles.medsCountText}>
              {profileMeds.length} {profileMeds.length === 1 ? 'activo' : 'activos'}
            </Text>
          </View>

          {profileMeds.length === 0 ? (
            <View style={styles.emptyMedsBox}>
              <Ionicons name="leaf-outline" size={18} color={colors.muted} />
              <Text style={styles.emptyMedsText}>Sin medicamentos programados</Text>
            </View>
          ) : (
            profileMeds.map((med) => (
              <View key={med.id} style={styles.medItem}>
                {med.photo ? (
                  <Image source={{ uri: med.photo }} style={styles.medThumb} />
                ) : (
                  <View style={[styles.medThumb, styles.medIconPlaceholder]}>
                    <Ionicons name="medical" size={18} color={colors.primary} />
                  </View>
                )}

                <View style={styles.medBody}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.medItemName} numberOfLines={1}>
                      {med.medication_name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMedication(med.id, med.medication_name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={`Eliminar ${med.medication_name}`}
                    >
                      <Ionicons name="close" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.medFreqText}>
                    {med.dose} · {formatFrequencyLabel(med.frequency_type, med.frequency_value)}
                  </Text>

                  <View style={styles.medTimesRow}>
                    {(med.times || []).map((t, idx) => (
                      <View key={idx} style={styles.timeBadgeMini}>
                        <Ionicons name="time-outline" size={11} color={colors.primary} />
                        <Text style={styles.timeBadgeMiniText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {med.notes ? (
                    <View style={styles.notesWrap}>
                      <Ionicons name="information-circle-outline" size={13} color={colors.muted} />
                      <Text style={styles.medItemNotes} numberOfLines={2}>
                        {med.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.scheduleDoseBtn}
          onPress={() => navigation.navigate('ScheduleReminder', { profile: item })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.scheduleDoseBtnText}>Añadir medicamento</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && profiles.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Sincronizando perfiles...</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProfileItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={[styles.emptyCard, shadowSm]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyText}>Aún no tienes perfiles familiares</Text>
                <Text style={styles.emptySubText}>
                  Crea perfiles para ti o tus familiares para comenzar a programar recordatorios de medicamentos.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => navigation.navigate('ProfileForm')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.emptyActionBtnText}>Crear primer perfil</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* BARRA INFERIOR CON ACCIONES */}
      {profiles.length > 0 && (
        <View style={[styles.footer, shadow, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity style={styles.addButton} onPress={handleNewProfile} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.addButtonText}>Nuevo perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickScheduleBtn}
            onPress={() => navigation.navigate('ScheduleReminder')}
            activeOpacity={0.85}
          >
            <Ionicons name="alarm-outline" size={18} color="#fff" />
            <Text style={styles.quickScheduleBtnText}>Programar dosis</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
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
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Próxima toma
  nextCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  nextLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextLabel: {
    color: colors.primarySoft,
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
  nextMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 16,
  },
  nextTime: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  nextInfo: {
    flex: 1,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.18)',
  },
  nextMedName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  nextMeta: { color: colors.primarySoft, fontSize: 13, marginTop: 2 },
  nextEmptyText: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 10 },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  laterLabel: { color: colors.primarySoft, fontSize: 12, fontWeight: '600', marginRight: 2 },
  laterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: 150,
  },
  laterChipTime: { color: '#fff', fontSize: 12, fontWeight: '800' },
  laterChipName: { color: colors.primarySoft, fontSize: 12, flexShrink: 1 },

  // Estadísticas
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 1 },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, letterSpacing: -0.3 },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.muted },

  // Tarjeta de perfil
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  details: { fontSize: 13, color: colors.muted, fontWeight: '600' },

  actionsTop: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medsSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  medsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  medsCountText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  emptyMedsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  emptyMedsText: { fontSize: 13, color: colors.muted, fontWeight: '600' },

  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  medThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  medIconPlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medBody: { flex: 1, marginLeft: 12 },
  medItemName: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  medFreqText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  medTimesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 5 },
  timeBadgeMini: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBadgeMiniText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  notesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  medItemNotes: { fontSize: 12, color: colors.muted, fontStyle: 'italic', flexShrink: 1 },

  scheduleDoseBtn: {
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  scheduleDoseBtnText: { color: colors.primary, fontWeight: '800', fontSize: 14 },

  // Estado vacío
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptySubText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  emptyActionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  // Barra inferior
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  quickScheduleBtn: {
    flex: 1.2,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  quickScheduleBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
