import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, pressedFeedback, radius, softShadow, spacing, typography } from '../theme';

type CreatePath = '/routine/create' | '/task/create';

// Matches the sheet's own motion timing so the "+" turns back exactly while
// the sheet leaves.
const FAB_ROTATION_DURATION_MS = 200;

/**
 * Global create entry point (docs/SCREEN_SPECIFICATIONS.md): opens a
 * type-selection sheet offering "Routine" / "Aufgabe," each navigating to
 * its respective create screen (T031 / T045). Embedded in the center of the
 * bottom tab bar (app/(tabs)/_layout.tsx, T084) so it stays reachable from
 * every tab.
 */
export function CreateFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Chosen destination, navigated to only after the sheet's exit animation
  // has finished (Sheet's onDismissed) — pushing immediately would race the
  // sheet dismissal against the incoming screen transition.
  const pendingPathRef = useRef<CreatePath | null>(null);
  const [rotation] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  function animateRotation(toValue: number) {
    Animated.timing(rotation, {
      toValue,
      duration: reducedMotion ? 0 : FAB_ROTATION_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function handleOpen() {
    setOpen(true);
    animateRotation(1);
  }

  function handleClose() {
    setOpen(false);
    animateRotation(0);
  }

  function goToCreate(path: CreatePath) {
    pendingPathRef.current = path;
    handleClose();
  }

  function handleDismissed() {
    const path = pendingPathRef.current;
    pendingPathRef.current = null;
    if (path) {
      router.push(path);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Neu erstellen"
        onPress={handleOpen}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        testID="create-fab"
      >
        {/* While the sheet is open the "+" rotates 45° into an "×" — the one
            state the FAB has, signalled without any scale/bounce. */}
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          <Text style={styles.fabLabel}>+</Text>
        </Animated.View>
      </Pressable>

      <Sheet
        visible={open}
        onClose={handleClose}
        onDismissed={handleDismissed}
        testID="create-fab-sheet"
      >
        <View style={styles.menu}>
          <Button
            label="Routine"
            onPress={() => goToCreate('/routine/create')}
            testID="create-fab-routine"
          />
          <Button
            label="Aufgabe"
            variant="secondary"
            onPress={() => goToCreate('/task/create')}
            testID="create-fab-task"
          />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // The one element floating above the tab bar gets the same soft paper
    // lift every card has.
    ...softShadow,
  },
  fabPressed: {
    ...pressedFeedback,
  },
  fabLabel: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textOnAccent,
    lineHeight: typography.title.fontSize,
  },
  menu: {
    gap: spacing.sm,
  },
});
