import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../appData';
import { useTheme, makeStyles } from '../theme';
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
  const [expandedId, setExpandedId] = useState(null);

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

  const handleDeleteProfile = (profile) => {
    Alert.alert(
      'Eliminar persona',
      `¿Deseas eliminar a "${profile.name}" y todos sus recordatorios programados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/profiles/${profile.id}`);
              refresh();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMedication = (med) => {
    Alert.alert('Eliminar recordatorio', `¿Deseas eliminar el tratamiento de "${med.medication_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/medications/${med.id}`);
            refresh();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el medicamento');
          }
        },
      },
    ]);
  };

  // Menú ⋮ de cada persona: hoja de acciones en iOS y alerta (máx. 3 botones) en Android
  const handleMenu = (profile) => {
    const actions = [
      () => navigation.navigate('Add', { profile }),
      () => navigation.navigate('ProfileForm', { profile }),
      () => handleDeleteProfile(profile),
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: profile.name,
          options: ['Añadir medicamento', 'Editar perfil', 'Eliminar persona', 'Cancelar'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (index) => actions[index]?.()
      );
    } else {
      Alert.alert(
        profile.name,
        undefined,
        [
          { text: 'Eliminar', style: 'destructive', onPress: actions[2] },
          { text: 'Editar', onPress: actions[1] },
          { text: 'Añadir medicamento', onPress: actions[0] },
        ],
        { cancelable: true }
      );
    }
  };

  const renderProfile = (profile) => {
    const profileMeds = medications.filter((m) => m.profile_id === profile.id);
    const expanded = expandedId === profile.id;
    const age = formatAge(profile.birthdate);

    return (
      <View key={profile.id} style={styles.card}>
        <TouchableOpacity
          style={styles.cardRow}
          onPress={() => setExpandedId(expanded ? null : profile.id)}
          activeOpacity={0.8}
          accessibilityState={{ expanded }}
          accessibilityHint="Muestra u oculta sus medicamentos"
        >
          <Avatar name={profile.name} photo={profile.photo} type={profile.type} size={56} />
          <View style={styles.cardBody}>
            <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
            <View style={styles.remindersRow}>
              <Ionicons
                name={profileMeds.length ? 'notifications-outline' : 'notifications-off-outline'}
                size={17}
                color={profileMeds.length ? colors.success : colors.muted}
              />
              <Text style={styles.remindersText}>
                {profileMeds.length === 0
                  ? 'Sin recordatorios'
                  : `${profileMeds.length} ${profileMeds.length === 1 ? 'recordatorio activo' : 'recordatorios activos'}`}
                {age ? ` · ${age}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => handleMenu(profile)}
            activeOpacity={0.7}
            accessibilityLabel={`Opciones de ${profile.name}`}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.medsSection}>
            {profileMeds.map((med) => (
              <View key={med.id} style={styles.medRow}>
                <View style={styles.medBody}>
                  <Text style={styles.medName} numberOfLines={1}>
                    {med.medication_name} · {med.dose}
                  </Text>
                  <Text style={styles.medMeta}>
                    {formatFrequencyLabel(med.frequency_type, med.frequency_value)} ·{' '}
                    {(med.times || []).join(', ')}
                  </Text>
                  {med.notes ? (
                    <Text style={styles.medNotes} numberOfLines={2}>{med.notes}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.medDelete}
                  onPress={() => handleDeleteMedication(med)}
                  accessibilityLabel={`Eliminar ${med.medication_name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addMedBtn}
              onPress={() => navigation.navigate('Add', { profile })}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.primaryText} />
              <Text style={styles.addMedText}>Añadir medicamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && profiles.length === 0) {
    return (
      <View style={[styles.container, styles.centerLoading]}>
        <ActivityIndicator size="large" color={colors.primaryText} />
        <Text style={styles.loadingText}>Cargando personas...</Text>
      </View>
    );
  }

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
      <Text style={styles.title}>Personas</Text>
      <Text style={styles.subtitle}>Administra los perfiles y recordatorios de tus seres queridos.</Text>

      {profiles.length === 0 ? (
        <EmptyState
          icon="people"
          title="Aún no hay personas"
          text="Añade a cada familiar para programar sus medicamentos."
        />
      ) : (
        profiles.map(renderProfile)
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleNewProfile} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Añadir nueva persona</Text>
      </TouchableOpacity>
      <Text style={styles.limitText}>
        {profiles.length} de {MAX_PROFILES} perfiles
      </Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32 },
  centerLoading: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 15 },

  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 24,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  cardBody: { flex: 1 },
  name: { fontSize: 21, fontWeight: '600', color: colors.text },
  remindersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  remindersText: { flexShrink: 1, fontSize: 14, color: colors.textSecondary },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  medsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  medBody: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '700', color: colors.text },
  medMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  medNotes: { fontSize: 13, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
  medDelete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    marginTop: 14,
  },
  addMedText: { fontSize: 15, fontWeight: '700', color: colors.primaryText },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    marginTop: 12,
  },
  addButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  limitText: { textAlign: 'center', fontSize: 13, color: colors.muted, marginTop: 10 },
}));
