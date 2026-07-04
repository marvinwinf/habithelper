import { StyleSheet, Text, View } from 'react-native';

// TODO(T046): Phase 0 placeholder - becomes the five-section task list
// (Ueberfaellig/Heute/Demnaechst/Ohne Datum/Erledigt).
export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text>Aufgaben</Text>
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
