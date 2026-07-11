import { useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AreaChart } from '../../src/ui/components/AreaChart';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { CategoryBadge } from '../../src/ui/components/CategoryBadge';
import { CompletionControl } from '../../src/ui/components/CompletionControl';
import { DonutChart } from '../../src/ui/components/DonutChart';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { IconBadge } from '../../src/ui/components/IconBadge';
import { ProgressBar } from '../../src/ui/components/ProgressBar';
import { RingProgress } from '../../src/ui/components/RingProgress';
import { Sheet } from '../../src/ui/components/Sheet';
import { chartPalette, colors, spacing, typography, type CategoryColorFamily } from '../../src/ui/theme';
import { categoryPalette } from '../../src/ui/theme/categoryVariant';

// Dev-only design system preview (TASKS.md's T019). Never linked from
// production navigation (see the Settings screen's dev-only entry point);
// full exclusion from the release bundle is verified in T060.
export default function ComponentPreviewScreen() {
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/(tabs)/today" />;
  }

  const categoryFamilies = Object.keys(categoryPalette) as CategoryColorFamily[];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="component-preview-screen"
    >
      <Text style={styles.sectionTitle}>Card</Text>
      <Card style={styles.spacingBelow}>
        <Text>Card content</Text>
      </Card>

      <Text style={styles.sectionTitle}>Button</Text>
      <View style={[styles.row, styles.spacingBelow]}>
        <Button label="Primary" variant="primary" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Destructive" variant="destructive" onPress={() => {}} />
        <Button label="Disabled" onPress={() => {}} disabled />
      </View>

      <Text style={styles.sectionTitle}>CompletionControl</Text>
      <View style={[styles.row, styles.spacingBelow]}>
        <CompletionControl onComplete={() => {}} onExceed={() => {}} />
        <CompletionControl onComplete={() => {}} onExceed={() => {}} completed />
        <CompletionControl onComplete={() => {}} onExceed={() => {}} exceeded />
      </View>

      <Text style={styles.sectionTitle}>ProgressBar</Text>
      <View style={styles.spacingBelow}>
        <ProgressBar value={0.25} />
        <View style={styles.gapAbove}>
          <ProgressBar value={0.75} fillColor={colors.destructive} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>IconBadge</Text>
      <View style={[styles.row, styles.spacingBelow]}>
        <IconBadge name="book" size="sm" />
        <IconBadge name="book" size="md" />
        <IconBadge name="book" size="lg" />
      </View>

      <Text style={styles.sectionTitle}>CategoryBadge</Text>
      <View style={[styles.row, styles.spacingBelow]}>
        {categoryFamilies.map((family) => (
          <CategoryBadge key={family} label={family} baseColor={categoryPalette[family].base} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Sheet</Text>
      <View style={styles.spacingBelow}>
        <Button label="Sheet öffnen" onPress={() => setSheetVisible(true)} />
        <Sheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          testID="preview-sheet"
        >
          <Text>Sheet content</Text>
          <Button label="Schließen" onPress={() => setSheetVisible(false)} />
        </Sheet>
      </View>

      <Text style={styles.sectionTitle}>EmptyState</Text>
      <EmptyState
        title="Noch keine Routinen"
        message="Lege deine erste Routine an, um loszulegen."
      />

      <Text style={styles.sectionTitle}>RingProgress (Progress screen only)</Text>
      <View style={[styles.row, styles.spacingBelow]}>
        <RingProgress value={0.3} label="3" />
        <RingProgress value={0.7} label="12" fillColor={chartPalette[1]} />
      </View>

      <Text style={styles.sectionTitle}>AreaChart (Progress screen only)</Text>
      <View style={styles.spacingBelow}>
        <AreaChart
          data={[
            { label: 'Mo', value: 0.4 },
            { label: 'Di', value: 0.6 },
            { label: 'Mi', value: 0.5 },
            { label: 'Do', value: 0.8 },
            { label: 'Fr', value: 0.7 },
            { label: 'Sa', value: 0.9 },
            { label: 'So', value: 1 },
          ]}
        />
      </View>

      <Text style={styles.sectionTitle}>DonutChart (Progress screen only)</Text>
      <View style={styles.spacingBelow}>
        <DonutChart
          segments={[
            { label: 'Bewegung', value: 4, color: chartPalette[0] },
            { label: 'Fokus', value: 3, color: chartPalette[1] },
            { label: 'Gesundheit', value: 2, color: chartPalette[2] },
            { label: 'Sonstiges', value: 1, color: chartPalette[3] },
          ]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spacingBelow: {
    marginBottom: spacing.xl,
  },
  gapAbove: {
    marginTop: spacing.sm,
  },
});
