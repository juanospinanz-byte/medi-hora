import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { colors, shadow } from '../theme';

export default function MainScreen({ navigation, onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, medsRes] = await Promise.all([
        client.get('/profiles'),
        client.get('/medications').catch(() => ({ data: [] })),
      ]);
      setProfiles(profilesRes.data);
      setMedications(medsRes.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const handleDeleteProfile = async (id) => {
    Alert.alert(
      'Eliminar Perfil',
      '¿Estás seguro de que deseas eliminar este perfil y todos sus recordatorios?',
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
      'Eliminar Medicamento',
      `¿Deseas eliminar el recordatorio de "${medName}"?`,
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

  const formatFrequencyLabel = (freqType, freqVal) => {
    switch (freqType) {
      case 'diaria':
        return 'Diaria';
      case 'cada_x_horas':
        return `Cada ${freqVal || '8'}h`;
      case 'dias_alternos':
        return 'Días alternos';
      case 'dias_especificos':
        return 'Días seleccionados';
      case 'semanal':
        return 'Semanal';
      default:
        return freqType;
    }
  };

  const renderItem = ({ item }) => {
    const profileMeds = medications.filter((m) => m.profile_id === item.id);

    return (
      <View style={[styles.card, shadow]}>
        <View style={styles.profileHeader}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>
              {item.type} · {new Date(item.birthdate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.actionsTop}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('ProfileForm', { profile: item })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnDanger]}
              onPress={() => handleDeleteProfile(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scheduleDoseBtn}
          onPress={() => navigation.navigate('ScheduleReminder', { profile: item })}
          activeOpacity={0.85}
        >
          <Ionicons name="alarm-outline" size={18} color="#fff" />
          <Text style={styles.scheduleDoseBtnText}>Programar dosis</Text>
        </TouchableOpacity>

        <View style={styles.medsSection}>
          <Text style={styles.medsTitle}>Tratamientos ({profileMeds.length})</Text>

          {profileMeds.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMedsBox}
              onPress={() => navigation.navigate('ScheduleReminder', { profile: item })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.emptyMedsText}>Aún no hay medicamentos. Toca para añadir.</Text>
            </TouchableOpacity>
          ) : (
            profileMeds.map((med) => (
              <View key={med.id} style={styles.medItemCard}>
                <View style={styles.medItemMain}>
                  {med.photo ? (
                    <Image source={{ uri: med.photo }} style={styles.medPhotoThumb} />
                  ) : (
                    <View style={styles.medIconPlaceholder}>
                      <Ionicons name="medical" size={18} color={colors.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.medItemName}>{med.medication_name}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteMedication(med.id, med.medication_name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={18} color={colors.muted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.medItemDose}>
                      Dosis: <Text style={styles.medItemDoseStrong}>{med.dose}</Text>
                      {' · '}
                      {formatFrequencyLabel(med.frequency_type, med.frequency_value)}
                    </Text>

                    <View style={styles.medTimesRow}>
                      {(med.times || []).map((t, idx) => (
                        <View key={idx} style={styles.timeBadgeMini}>
                          <Text style={styles.timeBadgeMiniText}>{t}</Text>
                        </View>
                      ))}
                    </View>

                    {med.notes ? (
                      <Text style={styles.medItemNotes}>{med.notes}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Medi-Hora</Text>
          <Text style={styles.topSubtitle}>Perfiles y tratamientos</Text>
        </View>
        <TouchableOpacity style={styles.logoutChip} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutChipText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading && profiles.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos familiares...</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading && (
              <View style={[styles.emptyCard, shadow]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyText}>Aún no hay perfiles</Text>
                <Text style={styles.emptySubText}>
                  Crea un perfil familiar para empezar a programar recordatorios.
                </Text>
              </View>
            )
          }
        />
      )}

      <View style={styles.footer}>
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={[styles.addButton, { flex: 1, marginRight: 8 }]}
            onPress={() => {
              if (profiles.length >= 10) {
                Alert.alert('Límite alcanzado', 'No puedes crear más de 10 perfiles por cuenta.');
              } else {
                navigation.navigate('ProfileForm');
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Nuevo perfil</Text>
          </TouchableOpacity>

          {profiles.length > 0 && (
            <TouchableOpacity
              style={[styles.quickScheduleBtn, { flex: 1.2 }]}
              onPress={() => navigation.navigate('ScheduleReminder')}
              activeOpacity={0.85}
            >
              <Ionicons name="time-outline" size={18} color="#fff" />
              <Text style={styles.quickScheduleBtnText}>Programar dosis</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },
  topSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  logoutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logoutChipText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.muted },
  list: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 52, height: 52, borderRadius: 18, marginRight: 12 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  cardInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 2 },
  details: { fontSize: 13, color: colors.muted, textTransform: 'capitalize' },

  actionsTop: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: colors.dangerSoft },

  scheduleDoseBtn: {
    backgroundColor: colors.primary,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scheduleDoseBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  medsSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  emptyMedsBox: {
    backgroundColor: colors.primaryMuted,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMedsText: { fontSize: 12, color: colors.primaryDark, fontWeight: '600', flexShrink: 1 },

  medItemCard: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  medItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  medPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  medIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medItemName: { fontSize: 15, fontWeight: '800', color: colors.text },
  medItemDose: { fontSize: 12, color: colors.muted, marginTop: 2 },
  medItemDoseStrong: { fontWeight: '700', color: colors.text },
  medTimesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  timeBadgeMini: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  timeBadgeMiniText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  medItemNotes: { fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 4 },

  emptyCard: {
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyText: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySubText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    padding: 14,
    paddingBottom: 22,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  quickScheduleBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  quickScheduleBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
