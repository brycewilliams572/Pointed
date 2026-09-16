import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { accessibilityLabel, frame, labelsHidden, scaleEffect } from '@expo/ui/swift-ui/modifiers';

import { normalizePlayerColor } from '@/constants/player-colors';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import type { CustomColorPickerProps } from './custom-color-picker';

export function CustomColorPicker({ color, playerLabel, onChange }: CustomColorPickerProps) {
  const scheme = useAppColorScheme();
  return (
    <Host style={{ width: 48, height: 48 }} colorScheme={scheme}>
      <ColorPicker
        label={`Choose custom color for ${playerLabel}`}
        selection={color}
        supportsOpacity={false}
        onSelectionChange={(value) => {
          const normalized = normalizePlayerColor(value);
          if (normalized) onChange(normalized);
        }}
        modifiers={[
          labelsHidden(),
          scaleEffect(1.5),
          frame({ width: 48, height: 48 }),
          accessibilityLabel(`Choose custom color for ${playerLabel}`),
        ]}
      />
    </Host>
  );
}
