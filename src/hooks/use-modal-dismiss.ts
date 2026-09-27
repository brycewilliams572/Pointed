import { useEffect } from 'react';
import { Platform } from 'react-native';

// React Native Modal handles the platform back action. Web needs an explicit
// Escape handler so dialogs are equally usable from a hardware keyboard.
export function useModalDismiss(onDismiss: () => void, enabled = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onDismiss]);
}
