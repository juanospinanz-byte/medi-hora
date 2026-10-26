import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (dateKey) => `medihora:doses:${dateKey}`;

// Registro local (en este celular) de las tomas de un día marcadas como tomadas u omitidas:
// { '<medicamento>@<hora>': { status: 'taken' | 'skipped', at: ISO } }
export const useDoseLog = (dateKey) => {
  const [log, setLog] = useState({});
  const [ready, setReady] = useState(false);
  const logRef = useRef({});

  useEffect(() => {
    let active = true;
    setReady(false);
    logRef.current = {};
    setLog({});

    AsyncStorage.getItem(storageKey(dateKey))
      .then((raw) => {
        if (!active) return;
        const saved = raw ? JSON.parse(raw) : {};
        logRef.current = saved;
        setLog(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [dateKey]);

  // status null devuelve la toma a pendiente
  const setStatus = useCallback(
    (doseKey, status) => {
      const next = { ...logRef.current };
      if (status) {
        next[doseKey] = { status, at: new Date().toISOString() };
      } else {
        delete next[doseKey];
      }
      logRef.current = next;
      setLog(next);
      AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(next)).catch(() => {});
    },
    [dateKey]
  );

  return { log, ready, setStatus };
};
