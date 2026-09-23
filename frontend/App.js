import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import AuthScreen from './src/screens/AuthScreen';
import MainScreen from './src/screens/MainScreen';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import ScheduleReminderScreen from './src/screens/ScheduleReminderScreen';
import { setAuthToken } from './src/api/client';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const [token, setToken] = useState(null);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setAuthToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setAuthToken(null);
  };

  return (
    <>
      <StatusBar style="auto" />
      <StatusBar style="dark" />
      {token ? (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primaryDark,
              headerTitleStyle: { fontWeight: '800', color: colors.primaryDark },
              headerTitleStyle: { fontWeight: '800', color: colors.primaryDark, fontSize: 18 },
              headerShadowVisible: false,
              headerTitleAlign: 'center',
              headerBackTitle: 'Atrás',
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen 
              name="Main" 
              options={{ title: 'Medi-Hora' }}
              options={{ headerShown: false }}
            >
              {(props) => <MainScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen 
              name="ProfileForm" 
              component={ProfileFormScreen} 
              options={{ title: 'Perfil' }}
              options={({ route }) => ({
                title: route.params?.profile ? 'Editar Perfil' : 'Nuevo Perfil Familiar',
              })}
            />
            <Stack.Screen 
              name="ScheduleReminder" 
              component={ScheduleReminderScreen} 
              options={{ title: 'Recordatorio' }}
              options={{ title: 'Programar Recordatorio' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}
