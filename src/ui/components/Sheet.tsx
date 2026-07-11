import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
  testID?: string;
}

// Short, per docs/DESIGN_SYSTEM.md's Motion section — the sheet content
// itself already slides in via Modal's native "slide" animation; this only
// eases the backdrop dim in alongside it instead of snapping to full
// opacity instantly.
const BACKDROP_FADE_DURATION_MS = 200;
const BACKDROP_MAX_OPACITY = 0.32;

/** Reusable bottom-sheet/modal, dismissed by backdrop tap or back button. */
export function Sheet({ visible, onClose, children, testID }: SheetProps) {
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: BACKDROP_FADE_DURATION_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, BACKDROP_MAX_OPACITY],
              }),
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            testID={testID ? `${testID}-backdrop` : undefined}
          />
        </Animated.View>
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
    // colors only); revisit if/when an overlay token is introduced. Final
    // opacity is animated in (BACKDROP_MAX_OPACITY), not set here.
    backgroundColor: colors.textPrimary,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
});
