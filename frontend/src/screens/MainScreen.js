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
import { colors, shadow, shadowSm } from '../theme';

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
      setProfiles(profilesRes.data || []);
      setMedications(medsRes.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron sincronizar los datos familiares.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

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
        return freqType || 'Horario fijo';
    }
  };

  const renderProfileItem = ({ item }) => {
    const profileMeds = medications.filter((m) => m.profile_id === item.id);

    return (
      <View style={[styles.card, shadowSm]}>
        {/* CABECERA DEL PERFIL */}
        <View style={styles.profileHeader}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.type}</Text>
              </View>
            </View>
            <Text style={styles.details}>
              Nacimiento: {new Date(item.birthdate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.actionsTop}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('ProfileForm', { profile: item })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={17} color={colors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnDanger]}
              onPress={() => handleDeleteProfile(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÓN PROGRAMAR DOSIS PARA ESTE PERFIL */}
        <TouchableOpacity
          style={styles.scheduleDoseBtn}
          onPress={() => navigation.navigate('ScheduleReminder', { profile: item })}
          activeOpacity={0.85}
        >
          <Ionicons name="alarm-outline" size={18} color="#fff" />
          <Text style={styles.scheduleDoseBtnText}>Programar Dosis</Text>
        </TouchableOpacity>

        {/* SECCIÓN DE TRATAMIENTOS ASIGNADOS */}
        <View style={styles.medsSection}>
          <View style={styles.medsHeaderRow}>
            <Text style={styles.medsTitle}>Tratamientos activos</Text>
            <View style={styles.medsCountBadge}>
              <Text style={styles.medsCountText}>
                {profileMeds.length} {profileMeds.length === 1 ? 'medicamento' : 'medicamentos'}
              </Text>
            </View>
          </View>

          {profileMeds.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMedsBox}
              onPress={() => navigation.navigate('ScheduleReminder', { profile: item })}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.emptyMedsText}>
                Sin medicamentos programados. Toca para añadir uno.
              </Text>
            </TouchableOpacity>
          ) : (
            profileMeds.map((med) => (
              <View key={med.id} style={styles.medItemCard}>
                <View style={styles.medItemMain}>
                  {med.photo ? (
                    <Image source={{ uri: med.photo }} style={styles.medPhotoThumb} />
                  ) : (
                    <View style={styles.medIconPlaceholder}>
                      <Ionicons name="medkit" size={18} color={colors.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.medItemName}>{med.medication_name}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteMedication(med.id, med.medication_name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.muted} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.medSubRow}>
                      <View style={styles.dosePill}>
                        <Text style={styles.dosePillText}>{med.dose}</Text>
                      </View>
                      <Text style={styles.medFreqText}>
                        {formatFrequencyLabel(med.frequency_type, med.frequency_value)}
                      </Text>
                    </View>

                    <View style={styles.medTimesRow}>
                      {(med.times || []).map((t, idx) => (
                        <View key={idx} style={styles.timeBadgeMini}>
                          <Ionicons name="time-outline" size={11} color={colors.primaryDark} style={{ marginRight: 3 }} />
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
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* BARRA SUPERIOR */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="medkit" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.brand}>Medi-Hora</Text>
            <Text style={styles.topSubtitle}>Control de tratamientos familiares</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutChip} onPress={onLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={17} color={colors.danger} />
          <Text style={styles.logoutChipText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PRINCIPAL */}
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
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading && (
              <View style={[styles.emptyCard, shadowSm]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people" size={38} color={colors.primary} />
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
                  <Text style={styles.emptyActionBtnText}>Crear Primer Perfil</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* FOOTER FLOTANTE CON ACCIONES */}
      <View style={[styles.footer, shadow]}>
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (profiles.length >= 10) {
                Alert.alert('Límite alcanzado', 'Has alcanzado el límite máximo de 10 perfiles por cuenta.');
              } else {
                navigation.navigate('ProfileForm');
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>Nuevo Perfil</Text>
          </TouchableOpacity>

          {profiles.length > 0 && (
            <TouchableOpacity
              style={styles.quickScheduleBtn}
              onPress={() => navigation.navigate('ScheduleReminder')}
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={18} color="#fff" />
              <Text style={styles.quickScheduleBtnText}>Programar Dosis</Text>
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
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },
  topSubtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
  logoutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  logoutChipText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },
  list: { padding: 16, paddingBottom: 28 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  cardInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  typeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  details: { fontSize: 12, color: colors.muted },

  actionsTop: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },

  scheduleDoseBtn: {
    backgroundColor: colors.primary,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
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
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  medsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medsCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  emptyMedsBox: {
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMedsText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },

  medItemCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  medPhotoThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  medIconPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medItemName: { fontSize: 15, fontWeight: '800', color: colors.text },
  medSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dosePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dosePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  medFreqText: { fontSize: 12, color: colors.muted },
  medTimesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
  timeBadgeMini: {
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeBadgeMiniText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  notesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  medItemNotes: { fontSize: 11, color: colors.muted, fontStyle: 'italic', flexShrink: 1 },

  emptyCard: {
    alignItems: 'center',
    marginTop: 36,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
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
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    padding: 14,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
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
