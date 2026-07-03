import { StyleSheet, Text, View } from 'react-native';

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
