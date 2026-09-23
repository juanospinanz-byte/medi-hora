import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { colors } from '../theme';

const FREQUENCY_OPTIONS = [
  { id: 'diaria', label: 'Diaria', desc: 'Todos los días' },
  { id: 'cada_x_horas', label: 'Cada X horas', desc: 'Intervalo fijo (ej. 8h)' },
  { id: 'dias_especificos', label: 'Días específicos', desc: 'Días de la semana' },
  { id: 'dias_alternos', label: 'Días alternos', desc: 'Un día sí, un día no' },
  { id: 'semanal', label: 'Semanal', desc: 'Una vez por semana' },
];

const INTERVAL_HOURS = [4, 6, 8, 12, 24];

const DAYS_OF_WEEK = [
  { key: 1, label: 'Lun', full: 'Lunes' },
  { key: 2, label: 'Mar', full: 'Martes' },
  { key: 3, label: 'Mié', full: 'Miércoles' },
  { key: 4, label: 'Jue', full: 'Jueves' },
  { key: 5, label: 'Vie', full: 'Viernes' },
  { key: 6, label: 'Sáb', full: 'Sábado' },
  { key: 0, label: 'Dom', full: 'Domingo' },
];

const PRESET_TIMES = ['08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];

const QUICK_NOTES = [
  'Tomar con comida',
  'En ayunas',
  'Con abundante agua',
  'Antes de dormir',
  'Evitar lácteos',
];

const COMMON_DRUGS = ['Paracetamol', 'Ibuprofeno', 'Amoxicilina', 'Omeprazol', 'Losartán'];
const COMMON_DOSES = ['500 mg', '1 comprimido', '1 cápsula', '10 ml', '1 sobre'];

export default function ScheduleReminderScreen({ route, navigation }) {
  const initialProfile = route.params?.profile;

  // Form State
  const [profiles, setProfiles] = useState(initialProfile ? [initialProfile] : []);
  const [selectedProfileId, setSelectedProfileId] = useState(initialProfile ? initialProfile.id : null);

  const [medicationName, setMedicationName] = useState('');
  const [dose, setDose] = useState('');
  const [frequencyType, setFrequencyType] = useState('diaria');
  const [intervalHour, setIntervalHour] = useState(8);
  const [selectedDays, setSelectedDays] = useState([1, 3, 5]); // Lun, Mié, Vie por defecto
  const [weeklyDay, setWeeklyDay] = useState(1); // Lunes
  const [times, setTimes] = useState(['08:00', '20:00']);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Photo & Notes
  const [photo, setPhoto] = useState('');
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingProfiles, setFetchingProfiles] = useState(false);

  // Fetch all user profiles if not provided or to allow switching
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setFetchingProfiles(true);
        const res = await client.get('/profiles');
        setProfiles(res.data);
        if (!selectedProfileId && res.data.length > 0) {
          setSelectedProfileId(res.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setFetchingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // Recalculate times when "cada_x_horas" changes
  const handleAutoGenerateTimes = (hours) => {
    const dosesPerDay = Math.floor(24 / hours);
    const startHour = 8;
    const newTimes = [];
    for (let i = 0; i < dosesPerDay; i++) {
      const h = (startHour + i * hours) % 24;
      const formatted = `${String(h).padStart(2, '0')}:00`;
      newTimes.push(formatted);
    }
    setTimes(newTimes.sort());
  };

  const handleFrequencyChange = (type) => {
    setFrequencyType(type);
    if (type === 'cada_x_horas') {
      handleAutoGenerateTimes(intervalHour);
    }
  };

  // Add a time to the schedule
  const handleAddTime = (timeToAdd) => {
    const cleanTime = timeToAdd.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(cleanTime)) {
      Alert.alert('Formato inválido', 'Usa formato de 24 horas HH:MM (ej. 08:30 o 14:00)');
      return;
    }
    if (times.includes(cleanTime)) {
      Alert.alert('Aviso', 'Este horario ya está agregado');
      return;
    }
    const updated = [...times, cleanTime].sort();
    setTimes(updated);
    setCustomTimeInput('');
    setShowTimeModal(false);
  };

  const handleRemoveTime = (timeToRemove) => {
    if (times.length <= 1) {
      Alert.alert('Aviso', 'Debe haber al menos un horario de toma');
      return;
    }
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  // Toggle specific day of week
  const handleToggleDay = (dayKey) => {
    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length <= 1) {
        Alert.alert('Aviso', 'Debes seleccionar al menos un día');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayKey));
    } else {
      setSelectedDays([...selectedDays, dayKey].sort());
    }
  };

  // Pick Image from Gallery
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se requiere acceso a la galería para adjuntar la foto del medicamento.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setPhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setPhoto(asset.uri);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara para fotografiar el medicamento.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setPhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setPhoto(asset.uri);
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  // Previsualización del Calendario de Tomas (Próximos 7 días)
  const calendarPreview = useMemo(() => {
    const daysPreview = [];
    const today = new Date();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      let hasDoses = false;

      if (frequencyType === 'diaria') {
        hasDoses = true;
      } else if (frequencyType === 'cada_x_horas') {
        hasDoses = true;
      } else if (frequencyType === 'dias_alternos') {
        hasDoses = i % 2 === 0;
      } else if (frequencyType === 'dias_especificos') {
        hasDoses = selectedDays.includes(dayOfWeek);
      } else if (frequencyType === 'semanal') {
        hasDoses = dayOfWeek === weeklyDay;
      }

      const isToday = i === 0;
      const isTomorrow = i === 1;
      let label = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : dayNames[dayOfWeek];

      daysPreview.push({
        dateString: `${date.getDate()} ${monthNames[date.getMonth()]}`,
        dayName: label,
        weekday: dayNames[dayOfWeek],
        hasDoses,
        doses: hasDoses ? times : [],
      });
    }

    return daysPreview;
  }, [frequencyType, times, selectedDays, weeklyDay, intervalHour]);

  // Handle Form Submission
  const handleSubmit = async () => {
    if (!selectedProfileId) {
      Alert.alert('Error', 'Selecciona un perfil familiar');
      return;
    }
    if (!medicationName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del fármaco');
      return;
    }
    if (!dose.trim()) {
      Alert.alert('Error', 'Ingresa la dosis a administrar');
      return;
    }
    if (times.length === 0) {
      Alert.alert('Error', 'Añade al menos un horario de toma');
      return;
    }

    let frequencyValue = null;
    if (frequencyType === 'cada_x_horas') {
      frequencyValue = String(intervalHour);
    } else if (frequencyType === 'dias_especificos') {
      frequencyValue = selectedDays;
    } else if (frequencyType === 'semanal') {
      frequencyValue = String(weeklyDay);
    }

    setLoading(true);
    try {
      const payload = {
        profile_id: selectedProfileId,
        medication_name: medicationName.trim(),
        dose: dose.trim(),
        frequency_type: frequencyType,
        frequency_value: frequencyValue,
        times: times,
        start_date: new Date().toISOString().split('T')[0],
        photo: photo || null,
        notes: notes.trim() || null,
      };

      await client.post('/medications', payload);

      Alert.alert(
        'Programación Exitosa',
        `El recordatorio para "${medicationName.trim()}" ha sido registrado correctamente.`,
        [
          {
            text: 'Aceptar',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const msg = error.response?.data?.error || 'No se pudo guardar el recordatorio';
      Alert.alert('Error al guardar', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* HEADER CARD: PERFIL SELECCIONADO */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Perfil del Paciente / Familiar</Text>
        {fetchingProfiles ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileList}>
            {profiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.profileChip, isSelected && styles.profileChipActive]}
                  onPress={() => setSelectedProfileId(p.id)}
                >
                  <View style={[styles.profileAvatar, isSelected && styles.profileAvatarActive]}>
                    <Text style={styles.profileAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={[styles.profileChipName, isSelected && styles.profileChipNameActive]}>
                      {p.name}
                    </Text>
                    <Text style={styles.profileChipType}>{p.type}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* DATOS DEL MEDICAMENTO */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Datos del Fármaco</Text>

        <Text style={styles.inputLabel}>Nombre del Medicamento *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ej: Paracetamol, Losartán, Insulina..."
          value={medicationName}
          onChangeText={setMedicationName}
        />
        {/* Quick Drug Suggestions */}
        <View style={styles.chipsRow}>
          {COMMON_DRUGS.map((drug) => (
            <TouchableOpacity
              key={drug}
              style={[styles.suggestionChip, medicationName === drug && styles.suggestionChipActive]}
              onPress={() => setMedicationName(drug)}
            >
              <Text style={[styles.suggestionChipText, medicationName === drug && { color: '#fff' }]}>{drug}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Dosis *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ej: 500 mg, 1 tableta, 10 ml..."
          value={dose}
          onChangeText={setDose}
        />
        {/* Quick Dose Suggestions */}
        <View style={styles.chipsRow}>
          {COMMON_DOSES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.suggestionChip, dose === d && styles.suggestionChipActive]}
              onPress={() => setDose(d)}
            >
              <Text style={[styles.suggestionChipText, dose === d && { color: '#fff' }]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* FRECUENCIA */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Frecuencia de Administración</Text>
        <View style={styles.frequencyList}>
          {FREQUENCY_OPTIONS.map((item) => {
            const active = frequencyType === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.frequencyCard, active && styles.frequencyCardActive]}
                onPress={() => handleFrequencyChange(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.frequencyTitle, active && styles.frequencyTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.frequencyDesc}>{item.desc}</Text>
                </View>
                <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub-opciones según frecuencia */}
        {frequencyType === 'cada_x_horas' && (
          <View style={styles.subConfigBox}>
            <Text style={styles.subConfigTitle}>¿Cada cuántas horas debe tomarse?</Text>
            <View style={styles.hoursRow}>
              {INTERVAL_HOURS.map((h) => {
                const isHActive = intervalHour === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.hourChip, isHActive && styles.hourChipActive]}
                    onPress={() => {
                      setIntervalHour(h);
                      handleAutoGenerateTimes(h);
                    }}
                  >
                    <Text style={[styles.hourChipText, isHActive && styles.hourChipTextActive]}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {frequencyType === 'dias_especificos' && (
          <View style={styles.subConfigBox}>
            <Text style={styles.subConfigTitle}>Selecciona los días de la semana:</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.key);
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                    onPress={() => handleToggleDay(d.key)}
                  >
                    <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {frequencyType === 'semanal' && (
          <View style={styles.subConfigBox}>
            <Text style={styles.subConfigTitle}>Día de la semana en que se tomará:</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = weeklyDay === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                    onPress={() => setWeeklyDay(d.key)}
                  >
                    <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* HORARIOS DE TOMA */}
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeaderTitle}>Horarios de Toma</Text>
          <Text style={styles.badgeCounter}>{times.length} programado{times.length !== 1 ? 's' : ''}</Text>
        </View>

        <Text style={styles.helperText}>
          Configura una o múltiples tomas al día según la indicación médica.
        </Text>

        <View style={styles.timesContainer}>
          {times.map((t) => (
            <View key={t} style={styles.timeTag}>
              <Text style={styles.timeTagText}>{t}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTime(t)}
                style={styles.timeRemoveBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.timeRemoveText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addTimeButton}
          onPress={() => setShowTimeModal(!showTimeModal)}
        >
          <Text style={styles.addTimeButtonText}>
            {showTimeModal ? 'Ocultar selector de horario' : '+ Añadir Horario'}
          </Text>
        </TouchableOpacity>

        {showTimeModal && (
          <View style={styles.timeSelectorBox}>
            <Text style={styles.subConfigTitle}>Horarios frecuentes:</Text>
            <View style={styles.chipsRow}>
              {PRESET_TIMES.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => handleAddTime(preset)}
                >
                  <Text style={styles.presetChipText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subConfigTitle, { marginTop: 10 }]}>O ingresa una hora exacta (HH:MM):</Text>
            <View style={styles.customTimeRow}>
              <TextInput
                style={[styles.textInput, styles.customTimeInput]}
                placeholder="Ej: 09:30"
                value={customTimeInput}
                onChangeText={setCustomTimeInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <TouchableOpacity
                style={styles.customTimeAddBtn}
                onPress={() => handleAddTime(customTimeInput)}
              >
                <Text style={styles.customTimeAddBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* FOTO Y NOTAS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Foto del Medicamento y Notas</Text>

        <View style={styles.photoContainer}>
          {photo ? (
            <View style={styles.previewImageWrapper}>
              <Image source={{ uri: photo }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setPhoto('')}
              >
                <Text style={styles.removePhotoText}>Eliminar Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noPhotoPlaceholder}>
              <Text style={styles.noPhotoText}>Sin foto adjunta</Text>
            </View>
          )}

          <View style={styles.photoActionRow}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
              <Text style={styles.photoActionBtnText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickImage}>
              <Text style={styles.photoActionBtnText}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoActionBtnSecondary}
              onPress={() => setShowUrlInput(!showUrlInput)}
            >
              <Text style={styles.photoActionBtnSecondaryText}>URL</Text>
            </TouchableOpacity>
          </View>

          {showUrlInput && (
            <View style={styles.urlInputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="https://ejemplo.com/farmaco.jpg"
                value={photoInputUrl}
                onChangeText={setPhotoInputUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.urlApplyBtn}
                onPress={() => {
                  if (photoInputUrl.trim()) {
                    setPhoto(photoInputUrl.trim());
                    setShowUrlInput(false);
                  }
                }}
              >
                <Text style={styles.urlApplyBtnText}>Aplicar URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 15 }]}>Notas e Instrucciones (Opcional)</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder="Ej: Tomar con comida, beber un vaso lleno de agua, en ayunas..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.quickNotesTitle}>Sugerencias rápidas:</Text>
        <View style={styles.chipsRow}>
          {QUICK_NOTES.map((qn) => (
            <TouchableOpacity
              key={qn}
              style={styles.suggestionChip}
              onPress={() => {
                const newNote = notes ? `${notes}, ${qn}` : qn;
                setNotes(newNote);
              }}
            >
              <Text style={styles.suggestionChipText}>{qn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* PREVISUALIZACIÓN DEL CALENDARIO DE TOMAS */}
      <View style={[styles.sectionCard, styles.previewSectionCard]}>
        <View style={styles.rowBetween}>
          <Text style={styles.previewSectionTitle}>Previsualización del Calendario</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>Vista Previa</Text>
          </View>
        </View>
        <Text style={styles.helperText}>
          Cronograma proyectado para los próximos 7 días:
        </Text>

        <View style={styles.calendarTimeline}>
          {calendarPreview.map((day, idx) => (
            <View
              key={idx}
              style={[
                styles.calendarDayCard,
                day.hasDoses ? styles.calendarDayActive : styles.calendarDayInactive,
              ]}
            >
              <View style={styles.calendarDayHeader}>
                <View style={styles.dateBadge}>
                  <Text style={styles.calendarDayName}>{day.dayName}</Text>
                  <Text style={styles.calendarDateText}>{day.dateString}</Text>
                </View>

                {day.hasDoses ? (
                  <View style={styles.intakeBadge}>
                    <Text style={styles.intakeBadgeText}>
                      {day.doses.length} toma{day.doses.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDoseDayText}>Sin tomas programadas</Text>
                )}
              </View>

              {day.hasDoses && (
                <View style={styles.dosesListRow}>
                  {day.doses.map((doseTime) => (
                    <View key={doseTime} style={styles.doseScheduleTag}>
                      <Text style={styles.doseScheduleTime}>{doseTime}</Text>
                      <Text style={styles.doseScheduleAmount}>
                        {dose || 'Dosis indicada'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* BOTÓN GUARDAR */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar y Programar Recordatorio</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeCounter: {
    backgroundColor: '#CCFBF1',
    color: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },

  // Profiles Horizontal
  profileList: { flexDirection: 'row', marginTop: 4 },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: 10,
    backgroundColor: '#f8fafc',
  },
  profileChipActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  profileAvatarActive: {
    backgroundColor: '#0D9488',
  },
  profileAvatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  profileChipName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  profileChipNameActive: { color: '#0D9488' },
  profileChipType: { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },

  // Inputs
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  quickNotesTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },

  // Frequencies
  frequencyList: { marginTop: 4 },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  frequencyCardActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  frequencyTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  frequencyTitleActive: { color: '#0D9488' },
  frequencyDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: { borderColor: '#0D9488' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D9488',
  },

  // Sub Config Box
  subConfigBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subConfigTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hourChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    marginHorizontal: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  hourChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  hourChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  hourChipTextActive: { color: '#ffffff' },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  dayButtonText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  dayButtonTextActive: { color: '#ffffff' },

  // Times
  timesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  timeTagText: { fontSize: 15, fontWeight: '700', color: '#0F766E' },
  timeRemoveBtn: { marginLeft: 8, padding: 2 },
  timeRemoveText: { fontSize: 13, color: '#888', fontWeight: 'bold' },

  addTimeButton: {
    borderWidth: 1,
    borderColor: '#0D9488',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addTimeButtonText: { color: '#0D9488', fontSize: 14, fontWeight: '700' },
  timeSelectorBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 6,
    marginBottom: 6,
  },
  presetChipText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  customTimeInput: { flex: 1, marginRight: 8, height: 42 },
  customTimeAddBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    height: 42,
    justifyContent: 'center',
    borderRadius: 8,
  },
  customTimeAddBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  // Photo
  photoContainer: { marginTop: 4 },
  noPhotoPlaceholder: {
    height: 70,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  noPhotoText: { fontSize: 13, color: '#94a3b8' },
  previewImageWrapper: {
    alignItems: 'center',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    marginTop: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  removePhotoText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  photoActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  photoActionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  photoActionBtnSecondary: {
    flex: 0.8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  photoActionBtnSecondaryText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  urlInputBox: { marginTop: 10 },
  urlApplyBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  urlApplyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Preview Section
  previewSectionCard: {
    borderColor: '#5EEAD4',
    borderWidth: 1,
    backgroundColor: '#F0FDFA',
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F766E',
  },
  liveBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  calendarTimeline: { marginTop: 8 },
  calendarDayCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  calendarDayActive: {
    backgroundColor: '#ffffff',
    borderColor: '#bae6fd',
  },
  calendarDayInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  calendarDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: { flexDirection: 'row', alignItems: 'center' },
  calendarDayName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginRight: 6 },
  calendarDateText: { fontSize: 13, color: '#64748b' },
  intakeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  intakeBadgeText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
  noDoseDayText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  dosesListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  doseScheduleTag: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  doseScheduleTime: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  doseScheduleAmount: { fontSize: 11, color: '#475569', marginTop: 1 },

  // Footer & Save
  footerContainer: { marginTop: 8, marginBottom: 20 },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
