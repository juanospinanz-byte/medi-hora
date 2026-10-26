import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import client from './api/client';
import {
  syncMedicationReminders,
  getNotificationPermission,
  requestNotificationPermission,
} from './notifications';

const AppDataContext = createContext(null);

// Perfiles, tratamientos, reloj y permisos compartidos por todas las pantallas de la sesión.
// También mantiene sincronizadas las notificaciones con los tratamientos.
export function AppDataProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medsLoaded, setMedsLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, medsRes] = await Promise.all([
        client.get('/profiles'),
        client.get('/medications').catch(() => null),
      ]);
      setProfiles(profilesRes.data || []);
      // Si falla la carga de medicamentos se conserva la lista anterior para no
      // borrar las alarmas ya programadas
      if (medsRes) {
        setMedications(medsRes.data || []);
        setMedsLoaded(true);
      }
      setNow(new Date());
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron sincronizar los datos familiares.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Avanza el reloj interno justo cuando cambia el minuto en el celular
  useEffect(() => {
    let timer;
    const scheduleTick = () => {
      const current = new Date();
      const msToNextMinute = 60000 - (current.getSeconds() * 1000 + current.getMilliseconds());
      timer = setTimeout(() => {
        setNow(new Date());
        scheduleTick();
      }, msToNextMinute + 50);
    };
    scheduleTick();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    requestNotificationPermission()
      .then(({ granted }) => setNotificationsEnabled(granted))
      .catch(() => setNotificationsEnabled(false));
  }, []);

  // Al volver a la app se toma de nuevo la hora del celular, se revisa el permiso
  // (pudo cambiar en Ajustes) y se recargan los datos
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(new Date());
      getNotificationPermission()
        .then(({ granted }) => setNotificationsEnabled(granted))
        .catch(() => {});
      refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    if (notificationsEnabled && medsLoaded) {
      syncMedicationReminders(medications);
    }
  }, [medications, medsLoaded, notificationsEnabled]);

  const enableNotifications = useCallback(async () => {
    const { granted, canAskAgain } = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    // Si el sistema ya no permite volver a preguntar, solo queda activarlas en Ajustes
    if (!granted && !canAskAgain) {
      Linking.openSettings();
    }
  }, []);

  const value = useMemo(
    () => ({ profiles, medications, loading, now, refresh, notificationsEnabled, enableNotifications }),
    [profiles, medications, loading, now, refresh, notificationsEnabled, enableNotifications]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);
