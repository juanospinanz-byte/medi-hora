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
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { colors, shadow, shadowSm, shadowMd } from '../theme';

const FREQUENCY_OPTIONS = [
  { id: 'diaria', label: 'Diaria', desc: 'Todos los días', icon: 'calendar-outline' },
  { id: 'cada_x_horas', label: 'Cada X horas', desc: 'Intervalo fijo (ej. 8h)', icon: 'time-outline' },
  { id: 'dias_especificos', label: 'Días específicos', desc: 'Días seleccionados de la semana', icon: 'options-outline' },
  { id: 'dias_alternos', label: 'Días alternos', desc: 'Un día sí, un día no', icon: 'swap-horizontal-outline' },
  { id: 'semanal', label: 'Semanal', desc: 'Una vez por semana', icon: 'repeat-outline' },
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
  const [selectedDays, setSelectedDays] = useState([1, 3, 5]);
  const [weeklyDay, setWeeklyDay] = useState(1);
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

  const handleSubmit = async () => {
    if (!selectedProfileId) {
      Alert.alert('Error', 'Selecciona un paciente o familiar');
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
        '¡Recordatorio Creado!',
        `El tratamiento para "${medicationName.trim()}" se ha programado correctamente.`,
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
      {/* 1. SELECCIÓN DE PACIENTE / PERFIL */}
      <View style={[styles.sectionCard, shadowSm]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>Paciente / Familiar</Text>
            <Text style={styles.sectionHeaderSubtitle}>¿A quién va asignado este tratamiento?</Text>
          </View>
        </View>

        {fetchingProfiles ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileList}>
            {profiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.profileChip, isSelected && styles.profileChipActive]}
                  onPress={() => setSelectedProfileId(p.id)}
                  activeOpacity={0.8}
                >
                  {p.photo ? (
                    <Image source={{ uri: p.photo }} style={styles.profileChipImg} />
                  ) : (
                    <View style={[styles.profileAvatar, isSelected && styles.profileAvatarActive]}>
                      <Text style={[styles.profileAvatarText, isSelected && styles.profileAvatarTextActive]}>
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.profileChipName, isSelected && styles.profileChipNameActive]}
                    >
                      {p.name}
                    </Text>
                    <Text style={[styles.profileChipType, isSelected && styles.profileChipTypeActive]}>
                      {p.type}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 2. DATOS DEL FÁRMACO */}
      <View style={[styles.sectionCard, shadowSm]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="medkit-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>Medicamento y Dosis</Text>
            <Text style={styles.sectionHeaderSubtitle}>Detalles de la prescripción</Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>Nombre del medicamento *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="bandage-outline" size={18} color={colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: Paracetamol, Losartán, Insulina..."
            placeholderTextColor={colors.muted}
            value={medicationName}
            onChangeText={setMedicationName}
          />
        </View>

        {/* Sugerencias Rápidas de Fármacos */}
        <View style={styles.chipsRow}>
          {COMMON_DRUGS.map((drug) => {
            const active = medicationName.toLowerCase() === drug.toLowerCase();
            return (
              <TouchableOpacity
                key={drug}
                style={[styles.suggestionChip, active && styles.suggestionChipActive]}
                onPress={() => setMedicationName(drug)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionChipText, active && styles.suggestionChipTextActive]}>
                  {drug}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Dosis *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="flask-outline" size={18} color={colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 500 mg, 1 tableta, 10 ml..."
            placeholderTextColor={colors.muted}
            value={dose}
            onChangeText={setDose}
          />
        </View>

        {/* Sugerencias Rápidas de Dosis */}
        <View style={styles.chipsRow}>
          {COMMON_DOSES.map((d) => {
            const active = dose.toLowerCase() === d.toLowerCase();
            return (
              <TouchableOpacity
                key={d}
                style={[styles.suggestionChip, active && styles.suggestionChipActive]}
                onPress={() => setDose(d)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionChipText, active && styles.suggestionChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. FRECUENCIA */}
      <View style={[styles.sectionCard, shadowSm]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="repeat-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>Frecuencia de Toma</Text>
            <Text style={styles.sectionHeaderSubtitle}>¿Cada cuánto se debe administrar?</Text>
          </View>
        </View>

        <View style={styles.frequencyList}>
          {FREQUENCY_OPTIONS.map((item) => {
            const active = frequencyType === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.frequencyCard, active && styles.frequencyCardActive]}
                onPress={() => handleFrequencyChange(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.freqIconBox, active && styles.freqIconBoxActive]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? colors.primary : colors.muted}
                  />
                </View>

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

        {/* Sub-configuración según frecuencia */}
        {frequencyType === 'cada_x_horas' && (
          <View style={styles.subConfigBox}>
            <View style={styles.subConfigHeader}>
              <Ionicons name="hourglass-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.subConfigTitle}>Intervalo entre tomas:</Text>
            </View>
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
            <View style={styles.subConfigHeader}>
              <Ionicons name="calendar-number-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.subConfigTitle}>Días activos de la semana:</Text>
            </View>
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
            <View style={styles.subConfigHeader}>
              <Ionicons name="today-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.subConfigTitle}>Día semanal para la dosis:</Text>
            </View>
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

      {/* 4. HORARIOS DE TOMA */}
      <View style={[styles.sectionCard, shadowSm]}>
        <View style={styles.rowBetween}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionHeaderTitle}>Horarios de Toma</Text>
              <Text style={styles.sectionHeaderSubtitle}>Horas del día para recibir alerta</Text>
            </View>
          </View>
          <View style={styles.badgeCounter}>
            <Text style={styles.badgeCounterText}>
              {times.length} {times.length === 1 ? 'toma' : 'tomas'}
            </Text>
          </View>
        </View>

        <Text style={styles.helperText}>
          Configura una o múltiples tomas al día según la indicación médica.
        </Text>

        <View style={styles.timesContainer}>
          {times.map((t) => (
            <View key={t} style={styles.timeTag}>
              <Ionicons name="alarm-outline" size={15} color={colors.primaryDark} style={{ marginRight: 4 }} />
              <Text style={styles.timeTagText}>{t}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTime(t)}
                style={styles.timeRemoveBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addTimeButton}
          onPress={() => setShowTimeModal(!showTimeModal)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showTimeModal ? 'chevron-up' : 'add-circle-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.addTimeButtonText}>
            {showTimeModal ? 'Ocultar selector de hora' : 'Añadir nuevo horario'}
          </Text>
        </TouchableOpacity>

        {showTimeModal && (
          <View style={styles.timeSelectorBox}>
            <Text style={styles.subConfigTitle}>Horas sugeridas frecuentes:</Text>
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

            <Text style={[styles.subConfigTitle, { marginTop: 12 }]}>
              O ingresa la hora exacta (HH:MM):
            </Text>
            <View style={styles.customTimeRow}>
              <TextInput
                style={[styles.textInput, styles.customTimeInput]}
                placeholder="Ej: 09:30"
                placeholderTextColor={colors.muted}
                value={customTimeInput}
                onChangeText={setCustomTimeInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <TouchableOpacity
                style={styles.customTimeAddBtn}
                onPress={() => handleAddTime(customTimeInput)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.customTimeAddBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 5. FOTO Y NOTAS */}
      <View style={[styles.sectionCard, shadowSm]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>Foto del Medicamento y Notas</Text>
            <Text style={styles.sectionHeaderSubtitle}>Facilita el reconocimiento visual</Text>
          </View>
        </View>

        <View style={styles.photoContainer}>
          {photo ? (
            <View style={styles.previewImageWrapper}>
              <Image source={{ uri: photo }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setPhoto('')}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={styles.removePhotoText}>Quitar foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noPhotoPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.muted} />
              <Text style={styles.noPhotoText}>Sin imagen del fármaco</Text>
            </View>
          )}

          <View style={styles.photoActionRow}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.photoActionBtnText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickImage}>
              <Ionicons name="images-outline" size={16} color="#fff" />
              <Text style={styles.photoActionBtnText}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoActionBtnSecondary}
              onPress={() => setShowUrlInput(!showUrlInput)}
            >
              <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.photoActionBtnSecondaryText}>URL</Text>
            </TouchableOpacity>
          </View>

          {showUrlInput && (
            <View style={styles.urlInputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="https://ejemplo.com/medicamento.jpg"
                placeholderTextColor={colors.muted}
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

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Notas de administración (Opcional)</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder="Ej: Tomar con un vaso de agua después del almuerzo..."
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.quickNotesTitle}>Indicaciones frecuentes:</Text>
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
              <Ionicons name="add" size={13} color={colors.textSecondary} style={{ marginRight: 2 }} />
              <Text style={styles.suggestionChipText}>{qn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 6. PREVISUALIZACIÓN DEL CALENDARIO DE TOMAS */}
      <View style={[styles.sectionCard, styles.previewSectionCard, shadowSm]}>
        <View style={styles.rowBetween}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconBadge, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.previewSectionTitle}>Proyección de Tomas</Text>
              <Text style={styles.sectionHeaderSubtitle}>Próximos 7 días planificados</Text>
            </View>
          </View>
          <View style={styles.liveBadge}>
            <Ionicons name="sparkles" size={12} color="#fff" style={{ marginRight: 4 }} />
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
                      {day.doses.length} {day.doses.length === 1 ? 'dosis' : 'dosis'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDoseDayText}>Sin tomas</Text>
                )}
              </View>

              {day.hasDoses && (
                <View style={styles.dosesListRow}>
                  {day.doses.map((doseTime) => (
                    <View key={doseTime} style={styles.doseScheduleTag}>
                      <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.doseScheduleTime}>{doseTime}</Text>
                      <Text style={styles.doseScheduleAmount}>
                        ({dose || 'Dosis'})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* BOTÓN GUARDAR RECORDATORIO */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.saveButton, shadowMd, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar y Activar Recordatorio</Text>
            </>
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
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.2,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCounter: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCounterText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },

  // Perfiles Horizontales
  profileList: { flexDirection: 'row', paddingVertical: 4 },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 10,
    backgroundColor: colors.surfaceAlt,
    maxWidth: 180,
  },
  profileChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  profileChipImg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    marginRight: 8,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  profileAvatarActive: {
    backgroundColor: colors.primary,
  },
  profileAvatarText: { color: colors.textSecondary, fontWeight: '800', fontSize: 14 },
  profileAvatarTextActive: { color: '#ffffff' },
  profileChipName: { fontSize: 13, fontWeight: '800', color: colors.text },
  profileChipNameActive: { color: colors.primaryDark },
  profileChipType: { fontSize: 11, color: colors.muted, textTransform: 'capitalize' },
  profileChipTypeActive: { color: colors.primary },
  checkBadge: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  notesInput: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },

  // Sugerencias / Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  suggestionChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  quickNotesTitle: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },

  // Frecuencias
  frequencyList: { marginTop: 4 },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  frequencyCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  freqIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  freqIconBoxActive: {
    backgroundColor: '#ffffff',
  },
  frequencyTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  frequencyTitleActive: { color: colors.primaryDark },
  frequencyDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Sub Config Box
  subConfigBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  subConfigTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hourChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
  },
  hourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  hourChipTextActive: { color: '#ffffff' },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayButtonText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  dayButtonTextActive: { color: '#ffffff' },

  // Horarios
  timesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primarySoft,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeTagText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  timeRemoveBtn: { marginLeft: 8, padding: 2 },

  addTimeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
  },
  addTimeButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  timeSelectorBox: {
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  presetChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  customTimeInput: { flex: 1, marginRight: 8, backgroundColor: colors.surface },
  customTimeAddBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 46,
    justifyContent: 'center',
    borderRadius: 14,
  },
  customTimeAddBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  // Foto
  photoContainer: { marginTop: 4 },
  noPhotoPlaceholder: {
    height: 90,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  noPhotoText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  previewImageWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  removePhotoText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  photoActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  photoActionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoActionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  photoActionBtnSecondary: {
    flex: 0.8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  photoActionBtnSecondaryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  urlInputBox: { marginTop: 10 },
  urlApplyBtn: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  urlApplyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Previsualización Calendario
  previewSectionCard: {
    borderColor: colors.primarySoft,
    backgroundColor: '#FAFDFD',
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  liveBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  calendarTimeline: { marginTop: 6 },
  calendarDayCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  calendarDayActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primarySoft,
  },
  calendarDayInactive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    opacity: 0.65,
  },
  calendarDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: { flexDirection: 'row', alignItems: 'center' },
  calendarDayName: { fontSize: 14, fontWeight: '800', color: colors.text, marginRight: 6 },
  calendarDateText: { fontSize: 12, color: colors.muted },
  intakeBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  intakeBadgeText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  noDoseDayText: { fontSize: 11, color: colors.muted, fontStyle: 'italic' },
  dosesListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 6,
  },
  doseScheduleTag: {
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  doseScheduleTime: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  doseScheduleAmount: { fontSize: 11, color: colors.muted, marginLeft: 3 },

  // Footer y Guardar
  footerContainer: { marginTop: 8, marginBottom: 24 },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
