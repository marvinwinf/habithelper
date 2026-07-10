import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { colors, pressedOpacity, radius, spacing, typography } from '../theme';

/**
 * Global floating create entry point (docs/SCREEN_SPECIFICATIONS.md): opens
 * a type-selection sheet offering "Routine" / "Aufgabe," each navigating to
 * its respective create screen (T031 / T045). Rendered once above the tab
 * navigator (T050) so it stays visible across every tab.
 */
export function CreateFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function goToCreate(path: '/routine/create' | '/task/create') {
    setOpen(false);
    router.push(path);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Neu erstellen"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        testID="create-fab"
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} testID="create-fab-sheet">
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
    position: 'absolute',
    right: spacing.lg,
    // Clears the flat tab bar (64dp tall, flush to the screen bottom, see
    // app/(tabs)/_layout.tsx) with breathing room above it, so it overlaps
    // content but never the bar's touch targets.
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: pressedOpacity,
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
