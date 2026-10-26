const DAY_MS = 24 * 60 * 60 * 1000;

const parseLocalDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const parseFrequencyValue = (value) => {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// Indica si un medicamento tiene tomas programadas en la fecha dada
export const takesOnDate = (med, date) => {
  const weekday = date.getDay();
  const value = parseFrequencyValue(med.frequency_value);

  switch (med.frequency_type) {
    case 'dias_alternos': {
      const start = parseLocalDate(med.start_date);
      if (!start) return true;
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diff = Math.round((day - start) / DAY_MS);
      return diff >= 0 && diff % 2 === 0;
    }
    case 'dias_especificos':
      return Array.isArray(value) ? value.map(Number).includes(weekday) : true;
    case 'semanal':
      return value != null ? Number(value) === weekday : true;
    default:
      return true;
  }
};

const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Lista ordenada de las tomas que faltan hoy y, si no quedan, las de mañana
export const getUpcomingDoses = (medications, now = new Date()) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const collect = (date, dayOffset, fromMinutes) =>
    medications
      .filter((med) => takesOnDate(med, date))
      .flatMap((med) =>
        (med.times || [])
          .filter((t) => toMinutes(t) >= fromMinutes)
          .map((t) => ({
            med,
            time: t,
            dayOffset,
            minutesUntil: dayOffset * 24 * 60 + toMinutes(t) - nowMinutes,
          }))
      )
      .sort((a, b) => a.minutesUntil - b.minutesUntil);

  const today = collect(now, 0, nowMinutes);
  return { today, upcoming: today.length ? today : collect(tomorrow, 1, 0) };
};

export const formatTimeUntil = (minutes) => {
  if (minutes <= 0) return 'Ahora';
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `en ${h} h ${m} min` : `en ${h} h`;
};

export const getAge = (birthdate) => {
  const birth = parseLocalDate(birthdate);
  if (!birth || Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
};

export const formatAge = (birthdate) => {
  const age = getAge(birthdate);
  if (age == null) return null;
  if (age === 0) return 'Menor de 1 año';
  return `${age} ${age === 1 ? 'año' : 'años'}`;
};
