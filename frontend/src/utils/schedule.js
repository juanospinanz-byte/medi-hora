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

// Fecha local en formato AAAA-MM-DD (toISOString usaría UTC y podría dar el día siguiente)
export const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Días de la semana (0 = domingo) en que aplica el tratamiento; null si es todos los días
export const getWeekdays = (med) => {
  const value = parseFrequencyValue(med.frequency_value);
  if (med.frequency_type === 'dias_especificos' && Array.isArray(value)) return value.map(Number);
  if (med.frequency_type === 'semanal' && value != null) return [Number(value)];
  return null;
};

// Indica si un medicamento tiene tomas programadas en la fecha dada
export const takesOnDate = (med, date) => {
  if (med.frequency_type === 'dias_alternos') {
    const start = parseLocalDate(med.start_date);
    if (!start) return true;
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((day - start) / DAY_MS);
    return diff >= 0 && diff % 2 === 0;
  }

  const weekdays = getWeekdays(med);
  return !weekdays || weekdays.includes(date.getDay());
};

const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Momentos del día en que se agrupan las tomas (hora de inicio incluida, de fin excluida)
export const DAY_SEGMENTS = [
  { id: 'madrugada', label: 'Madrugada', from: 0, to: 6 },
  { id: 'manana', label: 'Mañana', from: 6, to: 12 },
  { id: 'tarde', label: 'Tarde', from: 12, to: 19 },
  { id: 'noche', label: 'Noche', from: 19, to: 24 },
];

// Todas las tomas programadas en una fecha, ordenadas por hora. La clave identifica
// cada toma dentro del día (medicamento + horario)
export const getDosesForDate = (medications, date) =>
  medications
    .filter((med) => takesOnDate(med, date))
    .flatMap((med) =>
      (med.times || []).map((time) => ({
        key: `${med.id}@${time}`,
        med,
        time,
        minutes: toMinutes(time),
      }))
    )
    .sort((a, b) => a.minutes - b.minutes);

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
