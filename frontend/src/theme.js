import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

export const lightColors = {
  primary: '#0057C2',
  primaryText: '#0057C2',
  primaryDark: '#191C24',
  primaryLight: '#E6EEFB',
  primaryMuted: '#D3E2F8',
  primarySoft: '#C2D6F5',
  hero: '#0B3D91',
  heroMuted: '#C9DBF7',
  accent: '#FF7E5F',
  accentSoft: '#FFF1ED',
  bg: '#F7F8FC',
  surface: '#ffffff',
  surfaceAlt: '#F1F2F7',
  text: '#191C24',
  textSecondary: '#454A57',
  muted: '#6E7385',
  border: '#E1E3EB',
  borderLight: '#ECEEF4',
  danger: '#D32F45',
  dangerSoft: '#FCE8EB',
  success: '#1B873F',
  successSoft: '#DDF3E4',
  warning: '#9A5B00',
  warningSoft: '#FFF1D6',
  senior: '#7C5CC4',
  seniorSoft: '#F1ECFB',
  seniorText: '#6A48B8',
  child: '#E0763A',
  childSoft: '#FDF0E7',
  childText: '#B55416',
};

// Mismas claves que la paleta clara: se invierten fondos, textos y tintes, y los textos
// de color se aclaran para que contrasten sobre fondo oscuro
export const darkColors = {
  primary: '#2F6FD6',
  primaryText: '#8AB4F8',
  primaryDark: '#E4E7EF',
  primaryLight: '#1B2B45',
  primaryMuted: '#1E3150',
  primarySoft: '#294066',
  hero: '#0B3D91',
  heroMuted: '#C9DBF7',
  accent: '#FF7E5F',
  accentSoft: '#3A231D',
  bg: '#0F1115',
  surface: '#181B21',
  surfaceAlt: '#20242C',
  text: '#E6E8EE',
  textSecondary: '#B4B9C6',
  muted: '#8A90A0',
  border: '#2C313B',
  borderLight: '#23272F',
  danger: '#FF6B76',
  dangerSoft: '#3A1D22',
  success: '#4CC27A',
  successSoft: '#16301F',
  warning: '#F5A524',
  warningSoft: '#35290F',
  senior: '#7C5CC4',
  seniorSoft: '#251E3A',
  seniorText: '#B9A4F3',
  child: '#E0763A',
  childSoft: '#37241A',
  childText: '#F4A574',
};

export const shadow = {
  shadowColor: '#1A2340',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const shadowSm = {
  shadowColor: '#1A2340',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};

export const shadowMd = {
  shadowColor: '#1A2340',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 4,
};

// Color propio por categoría de paciente, usado en avatares y etiquetas
export const getProfileTone = (type, colors) => {
  if (type === 'adulto mayor') {
    return { color: colors.senior, soft: colors.seniorSoft, text: colors.seniorText, icon: 'heart-outline' };
  }
  if (type === 'niño') {
    return { color: colors.child, soft: colors.childSoft, text: colors.childText, icon: 'happy-outline' };
  }
  return { color: colors.primary, soft: colors.primaryLight, text: colors.primaryText, icon: 'person-outline' };
};

const THEME_STORAGE_KEY = 'medihora:theme-mode';
const THEME_MODES = ['light', 'dark', 'system'];

// También fija el modo de lo nativo (alertas, teclado); 'auto' sigue al celular
const applyNativeScheme = (mode) => {
  Appearance.setColorScheme(mode === 'system' ? 'auto' : mode);
};

const ThemeContext = createContext({
  mode: 'system',
  setMode: () => {},
  isDark: false,
  colors: lightColors,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (THEME_MODES.includes(saved)) {
          applyNativeScheme(saved);
          setModeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  // Fondo de la vista raíz, para que no asome un destello blanco detrás de las pantallas
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors]);

  const setMode = useCallback((next) => {
    applyNativeScheme(next);
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ mode, setMode, isDark, colors }), [mode, setMode, isDark, colors]);

  // Espera a leer la preferencia guardada para no mostrar un instante el tema equivocado
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Crea un hook de estilos que se regenera al cambiar de tema (una hoja por paleta)
export const makeStyles = (factory) => {
  const cache = new Map();
  return () => {
    const { colors } = useTheme();
    if (!cache.has(colors)) {
      cache.set(colors, StyleSheet.create(factory(colors)));
    }
    return cache.get(colors);
  };
};
