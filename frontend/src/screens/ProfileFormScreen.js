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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { colors, shadow } from '../theme';

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
      Alert.alert('Error', 'Nombre, fecha de nacimiento y tipo son obligatorios');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      Alert.alert('Error', 'Formato de fecha inválido. Usa YYYY-MM-DD');
      return;
    }

    setLoading(true);
    try {
      const data = { name, photo, birthdate, type };
      if (profile) {
        await client.put(`/profiles/${profile.id}`, data);
        Alert.alert('Éxito', 'Perfil actualizado');
      } else {
        await client.post('/profiles', data);
        Alert.alert('Éxito', 'Perfil creado');
      }
      navigation.goBack();
    } catch (error) {
      const message = error.response?.data?.error || 'Ocurrió un error';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, shadow]}>
        <View style={styles.avatarSection}>
          {photo ? (
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: photo }} style={styles.avatarPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto('')}>
                <Text style={styles.removePhotoText}>Quitar foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}

          <View style={styles.photoActionsRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.photoBtnText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={16} color="#fff" />
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

        <Text style={styles.label}>Fecha de nacimiento (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="Ej: 1990-05-15"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Tipo de perfil</Text>
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
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.65 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPreview: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
  },
  removePhotoBtn: {
    marginTop: 10,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
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
    width: '100%',
  },
  photoBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: colors.bg,
    color: colors.text,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  typeBtnTextActive: { color: '#fff' },
  button: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
