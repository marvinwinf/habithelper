import { StyleSheet, Text, View } from 'react-native';

// TODO(T023/T024/T055): Phase 0 placeholder - becomes the Settings screen
// (display name editing, category management link, backup export/import).
export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text>Einstellungen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
