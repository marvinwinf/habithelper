import { StyleSheet, Text, View } from 'react-native';

// TODO(T032): Phase 0 placeholder - becomes the Aktiv/Pausiert tabbed
// routine list with drag-and-drop reorder.
export default function RoutinesScreen() {
  return (
    <View style={styles.container}>
      <Text>Routinen</Text>
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
