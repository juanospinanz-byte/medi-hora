import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { lightColors } from './theme';
import { getWeekdays, takesOnDate } from './utils/schedule';

const CHANNEL_ID = 'medication-reminders';

// "Días alternos" no tiene disparador nativo que se repita cada 48 h, así que se
// programan fechas concretas para esta ventana y se renueva al abrir la app
const ALTERNATE_DAYS_WINDOW = 14;

const { DAILY, WEEKLY, DATE } = Notifications.SchedulableTriggerInputTypes;

// En Android, 'alarmClock' usa setAlarmClock(): el sistema no lo retrasa para ahorrar
// batería, así el aviso llega a la hora exacta (iOS ignora esta opción)
const triggerOptions = { channelId: CHANNEL_ID, delivery: 'alarmClock' };

// Muestra el aviso aunque la app esté abierta en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelPromise = null;

const ensureChannel = () => {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelPromise) {
    channelPromise = Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de medicamentos',
      description: 'Aviso a la hora exacta de cada toma',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 400, 250, 400],
      lightColor: lightColors.primary,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch((error) => {
      channelPromise = null;
      throw error;
    });
  }
  return channelPromise;
};

export const getNotificationPermission = async () => {
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  return { granted, canAskAgain };
};

export const requestNotificationPermission = async () => {
  // En Android 13+ el diálogo de permiso solo aparece si ya existe un canal
  await ensureChannel();
  const current = await getNotificationPermission();
  if (current.granted || !current.canAskAgain) return current;

  const { granted, canAskAgain } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return { granted, canAskAgain };
};

const parseTime = (time) => {
  const [hour, minute] = String(time).split(':').map(Number);
  return { hour, minute: minute || 0 };
};

const buildContent = (med, time) => ({
  title: `💊 Hora de tomar ${med.medication_name}`,
  body: `${med.profile_name ? `${med.profile_name}: ` : ''}${med.dose} a las ${time}${
    med.notes ? ` · ${med.notes}` : ''
  }`,
  sound: 'default',
  color: lightColors.primary,
  priority: Notifications.AndroidNotificationPriority.MAX,
  data: { medicationId: med.id, profileId: med.profile_id, time },
});

const buildRequests = (medications, now) =>
  medications.flatMap((med) =>
    (med.times || []).flatMap((time) => {
      const { hour, minute } = parseTime(time);
      if (!(hour >= 0 && hour <= 23)) return [];
      const content = buildContent(med, time);

      if (med.frequency_type === 'dias_alternos') {
        return Array.from(
          { length: ALTERNATE_DAYS_WINDOW },
          (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute)
        )
          .filter((date) => date > now && takesOnDate(med, date))
          .map((date) => ({ content, trigger: { type: DATE, date, ...triggerOptions } }));
      }

      const weekdays = getWeekdays(med);
      if (!weekdays) {
        return [{ content, trigger: { type: DAILY, hour, minute, ...triggerOptions } }];
      }

      // expo-notifications numera los días de 1 (domingo) a 7 (sábado)
      return weekdays
        .filter((day) => day >= 0 && day <= 6)
        .map((day) => ({
          content,
          trigger: { type: WEEKLY, weekday: day + 1, hour, minute, ...triggerOptions },
        }));
    })
  );

let queue = Promise.resolve();
let lastSignature = null;

// Las sincronizaciones van en cola para que dos seguidas no se pisen y dupliquen avisos
const enqueue = (task) => {
  queue = queue.then(task).catch((error) => console.error('Error al programar recordatorios:', error));
  return queue;
};

// Reprograma en el sistema una alarma por cada horario de cada tratamiento. Usa el
// reloj del celular, así que los avisos llegan aunque la app esté cerrada.
export const syncMedicationReminders = (medications) =>
  enqueue(async () => {
    const now = new Date();
    const signature = JSON.stringify([
      now.getTimezoneOffset(),
      medications.some((m) => m.frequency_type === 'dias_alternos') ? now.toDateString() : null,
      medications.map((m) => [
        m.id, m.profile_name, m.medication_name, m.dose, m.frequency_type,
        m.frequency_value, m.times, m.start_date, m.notes,
      ]),
    ]);
    if (signature === lastSignature) return;

    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    await ensureChannel();
    lastSignature = null;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const request of buildRequests(medications, now)) {
      await Notifications.scheduleNotificationAsync(request);
    }
    lastSignature = signature;
  });

export const cancelMedicationReminders = () =>
  enqueue(async () => {
    lastSignature = null;
    await Notifications.cancelAllScheduledNotificationsAsync();
  });
