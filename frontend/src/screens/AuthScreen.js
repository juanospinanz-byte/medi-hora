import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client, { setAuthToken } from '../api/client';
import { useTheme, makeStyles } from '../theme';

const MIN_PASSWORD = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El backend responde en inglés: se traduce según el código de estado
const getErrorMessage = (error, isLogin) => {
  const status = error.response?.status;
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  if (status === 401) return 'Correo o contraseña incorrectos.';
  if (status === 409) return 'Ya existe una cuenta con este correo.';
  if (status === 400) return 'Ingresa tu correo y contraseña.';
  return isLogin
    ? 'No pudimos iniciar sesión. Intenta de nuevo.'
    : 'No pudimos crear la cuenta. Intenta de nuevo.';
};

function Field({ label, icon, error, right, inputRef, ...inputProps }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={focused ? colors.primaryText : colors.muted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={colors.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function AuthScreen({ onLogin }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const switchMode = (login) => {
    if (login === isLogin) return;
    setIsLogin(login);
    setConfirm('');
    setErrors({});
    setFormError('');
  };

  const validate = () => {
    const next = {};
    const cleanEmail = email.trim();
    if (!cleanEmail) next.email = 'Ingresa tu correo electrónico.';
    else if (!EMAIL_REGEX.test(cleanEmail)) next.email = 'Revisa el formato del correo.';
    if (!password) next.password = 'Ingresa tu contraseña.';
    else if (!isLogin && password.length < MIN_PASSWORD) {
      next.password = `Usa al menos ${MIN_PASSWORD} caracteres.`;
    }
    if (!isLogin && password && confirm !== password) {
      next.confirm = 'Las contraseñas no coinciden.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!validate()) return;

    const credentials = { email: email.trim().toLowerCase(), password };
    setLoading(true);
    let registered = false;
    try {
      // Al crear la cuenta se inicia sesión directamente, sin volver a pedir los datos
      if (!isLogin) {
        await client.post('/auth/register', credentials);
        registered = true;
      }
      const response = await client.post('/auth/login', credentials);
      const { token } = response.data;
      setAuthToken(token);
      onLogin(token);
    } catch (error) {
      if (registered) {
        // La cuenta ya existe: se pasa a "Iniciar sesión" para reintentar desde ahí
        setIsLogin(true);
        setConfirm('');
        setFormError('Tu cuenta fue creada, pero no pudimos iniciar sesión. Intenta ingresar.');
      } else {
        setFormError(getErrorMessage(error, isLogin));
      }
      setLoading(false);
    }
  };

  const clearError = (key) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (formError) setFormError('');
  };

  const eyeToggle = (
    <TouchableOpacity
      onPress={() => setShowPassword((v) => !v)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      <Ionicons
        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={colors.muted}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* MARCA */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="medkit-outline" size={34} color={colors.primaryText} />
            </View>
            <Text style={styles.brandText}>Medi-Hora</Text>
            <Text style={styles.tagline}>Recordatorios de medicación para toda la familia</Text>
          </View>

          {/* SELECTOR DE MODO */}
          <View style={styles.segmented}>
            {[
              { login: true, label: 'Iniciar sesión' },
              { login: false, label: 'Crear cuenta' },
            ].map((opt) => {
              const active = opt.login === isLogin;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => switchMode(opt.login)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* FORMULARIO */}
          <View style={styles.card}>
            <Text style={styles.title}>{isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta'}</Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Ingresa para ver las tomas de hoy.'
                : 'Empieza a programar los tratamientos de tu familia.'}
            </Text>

            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            <Field
              label="Correo electrónico"
              icon="mail-outline"
              error={errors.email}
              placeholder="ejemplo@correo.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError('email');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Field
              inputRef={passwordRef}
              label="Contraseña"
              icon="lock-closed-outline"
              error={errors.password}
              placeholder={isLogin ? 'Tu contraseña' : `Mínimo ${MIN_PASSWORD} caracteres`}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError('password');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              textContentType={isLogin ? 'password' : 'newPassword'}
              returnKeyType={isLogin ? 'go' : 'next'}
              submitBehavior={isLogin ? 'blurAndSubmit' : 'submit'}
              onSubmitEditing={isLogin ? handleSubmit : () => confirmRef.current?.focus()}
              right={eyeToggle}
            />

            {!isLogin && (
              <Field
                inputRef={confirmRef}
                label="Confirmar contraseña"
                icon="shield-checkmark-outline"
                error={errors.confirm}
                placeholder="Repite la contraseña"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  clearError('confirm');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'Ingresar' : 'Crear cuenta'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* CAMBIO DE MODO */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}
            </Text>
            <TouchableOpacity onPress={() => switchMode(!isLogin)} hitSlop={12}>
              <Text style={styles.switchLink}>{isLogin ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityRow}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
            <Text style={styles.securityText}>Tus datos de salud se guardan de forma segura</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 32,
  },

  // Marca
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 290,
  },

  // Selector de modo, con la misma píldora que la pestaña activa
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.primarySoft },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: colors.primaryText, fontWeight: '800' },

  // Tarjeta
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 21,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  errorBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.danger, lineHeight: 19 },

  // Campos
  field: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8, color: colors.text },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  inputError: { borderColor: colors.danger },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
  fieldError: { fontSize: 13, fontWeight: '600', color: colors.danger, marginTop: 6 },

  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  switchText: { fontSize: 15, color: colors.textSecondary },
  switchLink: { fontSize: 15, fontWeight: '700', color: colors.primaryText },

  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  securityText: { fontSize: 13, color: colors.muted },
}));
