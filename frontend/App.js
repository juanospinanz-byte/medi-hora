import React, { useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from './src/screens/AuthScreen';
import TodayScreen from './src/screens/TodayScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import ScheduleReminderScreen from './src/screens/ScheduleReminderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AppBar from './src/components/AppBar';
import { setAuthToken } from './src/api/client';
import { AppDataProvider } from './src/appData';
import { cancelMedicationReminders } from './src/notifications';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ícono de cada pestaña: [activo, inactivo]
const TAB_ICONS = {
  Today: ['calendar', 'calendar-outline'],
  Add: ['add-circle', 'add-circle-outline'],
  People: ['people', 'people-outline'],
  History: ['time', 'time-outline'],
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

function HomeTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: ({ navigation }) => <AppBar onAccountPress={() => navigation.navigate('Settings')} />,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
        // Píldora de color detrás de la pestaña activa
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 6 },
        tabBarStyle: {
          height: 72 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={26} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: 'Hoy' }} />
      <Tab.Screen name="Add" component={ScheduleReminderScreen} options={{ title: 'Añadir' }} />
      <Tab.Screen name="People" component={FamilyScreen} options={{ title: 'Personas' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
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
        card: colors.surface,
        text: colors.text,
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
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primaryText,
                headerTitleStyle: { fontWeight: '700', color: colors.text, fontSize: 18 },
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerBackTitle: 'Atrás',
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
              <Stack.Screen
                name="ProfileForm"
                component={ProfileFormScreen}
                options={({ route }) => ({
                  title: route.params?.profile ? 'Editar persona' : 'Nueva persona',
                })}
              />
              <Stack.Screen name="Settings" options={{ title: 'Ajustes' }}>
                {(props) => <SettingsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </AppDataProvider>
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}
