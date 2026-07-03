import { StyleSheet, Text, View } from 'react-native';

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
