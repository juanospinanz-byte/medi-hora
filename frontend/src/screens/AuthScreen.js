import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client, { setAuthToken } from '../api/client';
import { colors, shadow, shadowSm } from '../theme';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await client.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });
        const { token } = response.data;
        setAuthToken(token);
        onLogin(token);
      } else {
        await client.post('/auth/register', {
          email: email.trim().toLowerCase(),
          password,
        });
        Alert.alert('¡Cuenta creada!', 'Tu registro fue exitoso. Ahora puedes iniciar sesión.');
        setIsLogin(true);
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Ocurrió un error al procesar la solicitud.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* LOGO & HERO */}
          <View style={styles.hero}>
            <View style={[styles.logoWrap, shadowSm]}>
              <Ionicons name="medkit" size={38} color="#fff" />
            </View>
            <Text style={styles.brand}>Medi-Hora</Text>
            <Text style={styles.tagline}>
              Control y recordatorios de medicación para toda la familia
            </Text>
          </View>

          {/* CARD PRINCIPAL */}
          <View style={[styles.card, shadow]}>
            {/* SEGMENTED TAB SWITCHER */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[styles.segmentBtn, isLogin && styles.segmentBtnActive]}
                onPress={() => setIsLogin(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, isLogin && styles.segmentTextActive]}>
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, !isLogin && styles.segmentBtnActive]}
                onPress={() => setIsLogin(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, !isLogin && styles.segmentTextActive]}>
                  Crear Cuenta
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardHeaderTitle}>
              {isLogin ? '¡Hola de nuevo!' : 'Únete a Medi-Hora'}
            </Text>
            <Text style={styles.cardHeaderSub}>
              {isLogin
                ? 'Accede para gestionar tus tomas y perfiles familiares'
                : 'Registra una cuenta para empezar a programar tus tratamientos'}
            </Text>

            {/* CORREO */}
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* CONTRASEÑA */}
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>

            {/* BOTÓN SUBMIT */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isLogin ? 'log-in-outline' : 'person-add-outline'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>
                    {isLogin ? 'Ingresar a mi cuenta' : 'Crear mi cuenta'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* FOOTER PRIVACIDAD */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={styles.securityText}>
                Tus datos de salud y tratamientos se almacenan de forma segura
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#173B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 18,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  securityText: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 16,
  },
});
