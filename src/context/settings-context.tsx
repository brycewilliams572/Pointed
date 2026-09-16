import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppearancePreference = 'system' | 'light' | 'dark';

const SettingsContext = createContext<{
  appearance: AppearancePreference;
  setAppearance: (value: AppearancePreference) => void;
  allowNegativeScores: boolean;
  setAllowNegativeScores: (value: boolean) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearancePreference>('system');
  const [allowNegativeScores, setAllowNegativeScores] = useState(false);
  return (
    <SettingsContext.Provider value={{ appearance, setAppearance, allowNegativeScores, setAllowNegativeScores }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useSettings must be used within SettingsProvider.');
  return settings;
}
