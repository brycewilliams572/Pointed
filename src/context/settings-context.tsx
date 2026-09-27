import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { getBrowserStorageError, getGameRepository } from '@/services/database/database';

export type AppearancePreference = 'system' | 'light' | 'dark';

const SettingsContext = createContext<{
  appearance: AppearancePreference;
  setAppearance: (value: AppearancePreference) => void;
  allowNegativeScores: boolean;
  setAllowNegativeScores: (value: boolean) => void;
  settingsError: string | null;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearancePreference>('system');
  const [allowNegativeScores, setAllowNegativeScores] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const initialRevision = revision.current;
    void getGameRepository()
      .then((repository) => repository.loadSettings())
      .then((settings) => {
        if (!active || revision.current !== initialRevision) return;
        setSettingsError(null);
        setAppearance(settings.appearance);
        setAllowNegativeScores(settings.allowNegativeScores);
      })
      .catch((error) => {
        if (active) setSettingsError(getBrowserStorageError(error) ?? 'Settings could not be loaded. Your current choices may not be saved.');
        if (__DEV__) console.error('Pointed settings could not be loaded:', error);
      });
    return () => { active = false; };
  }, []);

  const updateAppearance = useCallback((value: AppearancePreference) => {
    revision.current++;
    setAppearance(value);
    setSettingsError(null);
    void getGameRepository().then((repository) => repository.setSetting('appearance', value))
      .catch((error) => {
        setSettingsError(getBrowserStorageError(error) ?? 'The appearance setting could not be saved.');
        if (__DEV__) console.error('Pointed appearance setting could not be saved:', error);
      });
  }, []);

  const updateAllowNegativeScores = useCallback((value: boolean) => {
    revision.current++;
    setAllowNegativeScores(value);
    setSettingsError(null);
    void getGameRepository().then((repository) => repository.setSetting('allowNegativeScores', value))
      .catch((error) => {
        setSettingsError(getBrowserStorageError(error) ?? 'The scoring setting could not be saved.');
        if (__DEV__) console.error('Pointed scoring setting could not be saved:', error);
      });
  }, []);

  return (
    <SettingsContext.Provider value={{
      appearance,
      setAppearance: updateAppearance,
      allowNegativeScores,
      setAllowNegativeScores: updateAllowNegativeScores,
      settingsError,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useSettings must be used within SettingsProvider.');
  return settings;
}
