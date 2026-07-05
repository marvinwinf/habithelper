import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { colors, radius, spacing, typography } from '../theme';

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
        style={styles.fab}
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
    // Clears the bottom tab bar (Android's standard Material bottom
    // navigation is ~56dp tall) with some breathing room above it.
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft, same-family elevation rather than a hard drop shadow, per
    // docs/DESIGN_SYSTEM.md's "subtle same-family gradients" direction.
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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
