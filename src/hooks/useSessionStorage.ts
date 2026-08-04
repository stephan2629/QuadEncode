import { useState, useEffect } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always match the server's render on first paint - the server never has
  // `window`, so it always renders `initialValue`. Reading sessionStorage
  // synchronously here (in the useState initializer) meant the client's
  // very first render used whatever was already stored instead, producing
  // different HTML than the server sent whenever a session was already in
  // progress - a real hydration mismatch on /notes/[id]. sessionStorage is
  // read after mount instead, in an effect, once hydration has completed.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      // sessionStorage can't be read during render without risking exactly
      // the hydration mismatch this effect exists to avoid - this is the
      // one legitimate "sync from an external, browser-only store once on
      // mount" case, not an avoidable synchronous reset.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (item) setStoredValue(JSON.parse(item));
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
    }
    // Only the initial read on mount belongs here; the `key` itself never
    // changes for a given hook instance in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to sessionStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
