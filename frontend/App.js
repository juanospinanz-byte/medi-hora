import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import AuthScreen from './src/screens/AuthScreen';
import MainScreen from './src/screens/MainScreen';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import ScheduleReminderScreen from './src/screens/ScheduleReminderScreen';
import { setAuthToken } from './src/api/client';

// Simple fallback for theme if not imported
const colors = {
  primary: '#4b6cb7',
  bg: '#f8f9fa'
};

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
      {token ? (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen 
              name="Main" 
              options={{ title: 'Medi-Hora' }}
            >
              {(props) => <MainScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen 
              name="ProfileForm" 
              component={ProfileFormScreen} 
              options={{ title: 'Perfil' }}
            />
            <Stack.Screen 
              name="ScheduleReminder" 
              component={ScheduleReminderScreen} 
              options={{ title: 'Recordatorio' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}
