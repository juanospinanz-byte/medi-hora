import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import Avatar from '../components/Avatar';
import { useAppData } from '../appData';
import { useTheme, makeStyles, shadowSm, getProfileTone } from '../theme';
import { formatAge } from '../utils/schedule';

const MAX_PROFILES = 10;

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

export default function FamilyScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { profiles, medications, loading, refresh } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
              refresh();
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
              refresh();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.topBar}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Mi familia</Text>
        <Text style={styles.subtitle}>
          {profiles.length} de {MAX_PROFILES} perfiles
        </Text>
      </View>
      <TouchableOpacity
        style={styles.newBtn}
        onPress={handleNewProfile}
        activeOpacity={0.85}
        accessibilityLabel="Nuevo perfil"
      >
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={styles.newBtnText}>Nuevo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileItem = ({ item }) => {
    const profileMeds = medications.filter((m) => m.profile_id === item.id);
    const tone = getProfileTone(item.type, colors);
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
                <Ionicons name={tone.icon} size={11} color={tone.text} />
                <Text style={[styles.typeBadgeText, { color: tone.text }]}>{item.type}</Text>
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
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleDeleteProfile(item.id, item.name)}
              activeOpacity={0.7}
              accessibilityLabel={`Eliminar ${item.name}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
                    <Ionicons name="medical" size={18} color={colors.primaryText} />
                  </View>
                )}

                <View style={styles.medBody}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.medItemName} numberOfLines={1}>
                      {med.medication_name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMedication(med.id, med.medication_name)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityLabel={`Eliminar ${med.medication_name}`}
                    >
                      <Ionicons name="close" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.medFreqText}>
                    {med.dose} · {formatFrequencyLabel(med.frequency_type, med.frequency_value)}
                  </Text>

                  <View style={styles.medTimesRow}>
                    {(med.times || []).map((t, idx) => (
                      <View key={idx} style={styles.timeBadgeMini}>
                        <Ionicons name="time-outline" size={12} color={colors.primaryText} />
                        <Text style={styles.timeBadgeMiniText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {med.notes ? (
                    <View style={styles.notesWrap}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
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
          <Ionicons name="add" size={18} color={colors.primaryText} />
          <Text style={styles.scheduleDoseBtnText}>Añadir medicamento</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && profiles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerLoading]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primaryText} />
        <Text style={styles.loadingText}>Sincronizando perfiles...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProfileItem}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryText}
            colors={[colors.primaryText]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={[styles.emptyCard, shadowSm]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people" size={36} color={colors.primaryText} />
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
  titleBlock: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.6,
  },
  subtitle: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

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
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  details: { fontSize: 13, color: colors.muted, fontWeight: '600' },

  actionsTop: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  emptyMedsText: { fontSize: 14, color: colors.muted, fontWeight: '600' },

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
  medItemName: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  medFreqText: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  medTimesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  timeBadgeMini: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBadgeMiniText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  notesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  medItemNotes: { fontSize: 13, color: colors.muted, fontStyle: 'italic', flexShrink: 1 },

  scheduleDoseBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  scheduleDoseBtnText: { color: colors.primaryText, fontWeight: '800', fontSize: 15 },

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
    height: 48,
    borderRadius: 24,
    marginTop: 20,
  },
  emptyActionBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
}));
