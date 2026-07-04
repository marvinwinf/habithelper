import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { ensureProfile, updateDisplayName } from '../../src/data/repositories/profileRepository';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

export default function SettingsScreen() {
  const [profileId, setProfileId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');

  useEffect(() => {
    let cancelled = false;
    ensureProfile(db).then((profile) => {
      if (!cancelled) {
        setProfileId(profile.id);
        setDisplayName(profile.displayName);
        setSavedDisplayName(profile.displayName);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedName = displayName.trim();
  const canSave = trimmedName.length > 0 && trimmedName !== savedDisplayName;

  async function handleSave() {
    if (!profileId) {
      return;
    }
    await updateDisplayName(db, profileId, trimmedName);
    setSavedDisplayName(trimmedName);
    setDisplayName(trimmedName);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Einstellungen</Text>

      <Card style={styles.section}>
        <Text style={styles.label}>Anzeigename</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Anzeigename"
          style={styles.input}
          testID="settings-display-name-input"
        />
        <Button
          label="Speichern"
          onPress={handleSave}
          disabled={!canSave}
          testID="settings-save-display-name"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Kategorien</Text>
        <Link href="/category" style={styles.link} testID="settings-category-management-link">
          Kategorien verwalten
        </Link>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Datensicherung</Text>
        {/* TODO(T055): export/import backup actions. */}
        <Text style={styles.placeholder}>Backup-Export und -Import folgen in Kürze.</Text>
      </Card>

      {__DEV__ && (
        <Link href="/_dev/component-preview" testID="dev-component-preview-link">
          Component Preview (Dev)
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  placeholder: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
  },
  link: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
