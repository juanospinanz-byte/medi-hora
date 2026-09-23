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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client, { setAuthToken } from '../api/client';
import { colors, shadow } from '../theme';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await client.post('/auth/login', { email, password });
        const { token } = response.data;
        setAuthToken(token);
        onLogin(token);
      } else {
        await client.post('/auth/register', { email, password });
        Alert.alert('Éxito', 'Registro completado. Ahora puedes iniciar sesión.');
        setIsLogin(true);
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Ocurrió un error';
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
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Ionicons name="medkit" size={36} color="#fff" />
            </View>
            <Text style={styles.brand}>Medi-Hora</Text>
            <Text style={styles.tagline}>
              Recordatorios de medicación para toda la familia
            </Text>
          </View>

          <View style={[styles.card, shadow]}>
            <Text style={styles.title}>
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Ingresa para ver perfiles y tratamientos'
                : 'Regístrate para empezar a programar dosis'}
            </Text>

            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

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
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggle}>
              <Text style={styles.toggleText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.toggleStrong}>
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </Text>
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 22,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    width: 72,
    height: 72,
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
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 22,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  toggle: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: colors.muted, fontSize: 15 },
  toggleStrong: { color: colors.primary, fontWeight: '800' },
});
