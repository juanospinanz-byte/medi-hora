import React, { useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from './src/screens/AuthScreen';
import TodayScreen from './src/screens/TodayScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import ScheduleReminderScreen from './src/screens/ScheduleReminderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { setAuthToken } from './src/api/client';
import { AppDataProvider } from './src/appData';
import { cancelMedicationReminders } from './src/notifications';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ícono de cada pestaña: [activo, inactivo]
const TAB_ICONS = {
  Today: ['today', 'today-outline'],
  Family: ['people', 'people-outline'],
  Settings: ['settings', 'settings-outline'],
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function HomeTabs({ onLogout }) {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: 'Hoy' }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ title: 'Familia' }} />
      <Tab.Screen name="Settings" options={{ title: 'Ajustes' }}>
        {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();
  const [token, setToken] = useState(null);

  // Tema de React Navigation alineado con la paleta activa (fondos durante las transiciones)
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primaryText,
        background: colors.bg,
        card: colors.bg,
        text: colors.primaryDark,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [colors, isDark]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setAuthToken(newToken);
  };

  const handleLogout = () => {
    cancelMedicationReminders();
    setToken(null);
    setAuthToken(null);
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {token ? (
        <AppDataProvider>
          <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.primaryDark,
                headerTitleStyle: { fontWeight: '800', color: colors.primaryDark, fontSize: 17 },
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerBackTitle: 'Atrás',
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Home" options={{ headerShown: false }}>
                {(props) => <HomeTabs {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="ProfileForm"
                component={ProfileFormScreen}
                options={({ route }) => ({
                  title: route.params?.profile ? 'Editar perfil' : 'Nuevo perfil',
                })}
              />
              <Stack.Screen
                name="ScheduleReminder"
                component={ScheduleReminderScreen}
                options={{ title: 'Programar recordatorio' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AppDataProvider>
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}
