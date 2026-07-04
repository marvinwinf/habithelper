import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
  testID?: string;
}

/** Reusable bottom-sheet/modal, dismissed by backdrop tap or back button. */
export function Sheet({ visible, onClose, children, testID }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.container}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Schließen"
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <View style={styles.sheet} testID={testID ? `${testID}-content` : undefined}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    // Scrim dimming isn't part of the token set yet (T013 covers solid
    // colors only); revisit if/when an overlay token is introduced.
    backgroundColor: colors.textPrimary,
    opacity: 0.32,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
});
