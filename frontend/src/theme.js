import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

export const lightColors = {
  primary: '#0F8B8D',
  primaryText: '#0F8B8D',
  primaryDark: '#123B4A',
  primaryLight: '#EAF6F5',
  primaryMuted: '#D9F0ED',
  primarySoft: '#CEEBE6',
  hero: '#123B4A',
  heroMuted: '#CEEBE6',
  accent: '#FF7E5F',
  accentSoft: '#FFF1ED',
  bg: '#F4F7F8',
  surface: '#ffffff',
  surfaceAlt: '#F8FBFC',
  text: '#14252F',
  textSecondary: '#49626D',
  muted: '#8297A1',
  border: '#DCE6E8',
  borderLight: '#EBF1F2',
  danger: '#E64A57',
  dangerSoft: '#FEECEE',
  success: '#129B78',
  successSoft: '#DFF5EE',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  senior: '#7C5CC4',
  seniorSoft: '#F1ECFB',
  seniorText: '#7C5CC4',
  child: '#E0763A',
  childSoft: '#FDF0E7',
  childText: '#E0763A',
};

// Mismas claves que la paleta clara. Los rellenos de marca no cambian (el texto blanco
// sigue contrastando); se invierten fondos, textos y tintes, y los textos de color se aclaran
export const darkColors = {
  primary: '#0F8B8D',
  primaryText: '#3CC2BE',
  primaryDark: '#DCEFEE',
  primaryLight: '#11292C',
  primaryMuted: '#12302F',
  primarySoft: '#1E4346',
  hero: '#123B4A',
  heroMuted: '#CEEBE6',
  accent: '#FF7E5F',
  accentSoft: '#3A231D',
  bg: '#0C1215',
  surface: '#151E23',
  surfaceAlt: '#1B262C',
  text: '#E7EEF1',
  textSecondary: '#A8BBC3',
  muted: '#7F959E',
  border: '#2A3940',
  borderLight: '#212E34',
  danger: '#FF6B76',
  dangerSoft: '#3A1D22',
  success: '#2DBF97',
  successSoft: '#13312A',
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
  shadowColor: '#173B47',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const shadowSm = {
  shadowColor: '#173B47',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};

export const shadowMd = {
  shadowColor: '#173B47',
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
