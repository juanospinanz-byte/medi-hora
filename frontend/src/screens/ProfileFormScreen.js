import React, { useState } from 'react';
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
import { colors, shadow } from '../theme';
import { colors, shadow, shadowSm } from '../theme';

const PROFILE_TYPES = [
  { id: 'adulto mayor', label: 'Adulto mayor', icon: 'heart-outline', desc: 'Control prioritario' },
  { id: 'adulto', label: 'Adulto', icon: 'person-outline', desc: 'Tratamiento personal' },
  { id: 'niño', label: 'Niño', icon: 'happy-outline', desc: 'Dosis pediátrica' },
];

export default function ProfileFormScreen({ route, navigation }) {
  const profile = route.params?.profile;

  const [name, setName] = useState(profile ? profile.name : '');
  const [photo, setPhoto] = useState(profile ? profile.photo || '' : '');
  const [birthdate, setBirthdate] = useState(
    profile ? profile.birthdate.split('T')[0] : ''
  );
  const [type, setType] = useState(profile ? profile.type : 'adulto');

  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Se requiere acceso a la galería para seleccionar la foto del perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
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
      console.error('Error al seleccionar imagen:', err);
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Se requiere acceso a la cámara para tomar una foto del perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
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
      console.error('Error al abrir cámara:', err);
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const handleSubmit = async () => {
    if (!name || !birthdate || !type) {
    if (!name.trim() || !birthdate.trim() || !type) {
      Alert.alert('Error', 'Nombre, fecha de nacimiento y tipo son obligatorios');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      Alert.alert('Error', 'Formato de fecha inválido. Usa YYYY-MM-DD');
    if (!dateRegex.test(birthdate.trim())) {
      Alert.alert('Formato inválido', 'Usa el formato AAAA-MM-DD (ejemplo: 1990-05-15)');
      return;
    }

    setLoading(true);
    try {
      const data = { name, photo, birthdate, type };
      const data = {
        name: name.trim(),
        photo: photo || '',
        birthdate: birthdate.trim(),
        type,
      };

      if (profile) {
        await client.put(`/profiles/${profile.id}`, data);
        Alert.alert('Éxito', 'Perfil actualizado');
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      } else {
        await client.post('/profiles', data);
        Alert.alert('Éxito', 'Perfil creado');
        Alert.alert('Éxito', 'Perfil creado correctamente');
      }
      navigation.goBack();
    } catch (error) {
      const message = error.response?.data?.error || 'Ocurrió un error';
      const message = error.response?.data?.error || 'Ocurrió un error al guardar el perfil';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, shadow]}>
        {/* AVATAR / FOTO */}
        <View style={styles.avatarSection}>
          {photo ? (
            <View style={styles.avatarWrapper}>
          <View style={styles.avatarWrapper}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto('')}>
                <Text style={styles.removePhotoText}>Quitar foto</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          </View>

          {photo ? (
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setPhoto('')}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={styles.removePhotoText}>Eliminar foto</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.photoActionsRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.photoBtnText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={16} color="#fff" />
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={16} color="#fff" />
              <Text style={styles.photoBtnText}>Galería</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Juan Pérez"
          placeholderTextColor={colors.muted}
        />
        {/* NOMBRE */}
        <Text style={styles.label}>Nombre y Apellido *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Mamá, Juan Pérez, Sofía"
            placeholderTextColor={colors.muted}
          />
        </View>

        <Text style={styles.label}>Fecha de nacimiento (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="Ej: 1990-05-15"
          placeholderTextColor={colors.muted}
        />
        {/* FECHA DE NACIMIENTO */}
        <Text style={styles.label}>Fecha de nacimiento * (AAAA-MM-DD)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="1990-05-15"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        <Text style={styles.label}>Tipo de perfil</Text>
        {/* TIPO DE PERFIL */}
        <Text style={styles.label}>Categoría de paciente *</Text>
        <View style={styles.typeContainer}>
          {['adulto mayor', 'adulto', 'niño'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {PROFILE_TYPES.map((t) => {
            const isActive = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                onPress={() => setType(t.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.typeIconBox, isActive && styles.typeIconBoxActive]}>
                  <Ionicons
                    name={t.icon}
                    size={20}
                    color={isActive ? colors.primary : colors.muted}
                  />
                </View>
                <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                  {t.label}
                </Text>
                <Text style={[styles.typeDesc, isActive && styles.typeDescActive]}>
                  {t.desc}
                </Text>
                {isActive && (
                  <View style={styles.typeActiveCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* BOTÓN GUARDAR */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.65 }]}
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </Text>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {profile ? 'Actualizar Perfil' : 'Guardar Perfil Familiar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg, flexGrow: 1 },
  container: {
    padding: 16,
    backgroundColor: colors.bg,
    flexGrow: 1,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 22,
    paddingBottom: 18,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomColor: colors.borderLight,
  },
  avatarWrapper: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  avatarPreview: {
    width: 108,
    height: 108,
    borderRadius: 32,
    width: 104,
    height: 104,
    borderRadius: 34,
    backgroundColor: colors.border,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 32,
    width: 104,
    height: 104,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 40,
    fontSize: 42,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  removePhotoBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderRadius: 20,
  },
  removePhotoText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  photoActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    gap: 10,
    width: '100%',
  },
  photoBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    gap: 8,
  },
  photoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    fontWeight: '700',
    marginBottom: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: colors.bg,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  typeBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    marginBottom: 6,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  typeBtnTextActive: { color: '#fff' },
  typeIconBoxActive: {
    backgroundColor: '#ffffff',
  },
  typeBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  typeBtnTextActive: {
    color: colors.primaryDark,
  },
  typeDesc: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  typeDescActive: {
    color: colors.primary,
  },
  typeActiveCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  button: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
