import { useSettings } from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppColorScheme(): 'light' | 'dark' {
  const { appearance } = useSettings();
  const system = useColorScheme();
  return appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
}
