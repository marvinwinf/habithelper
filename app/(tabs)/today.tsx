import { StyleSheet, Text, View } from 'react-native';

// TODO(T033/T040/T048/T049): Phase 0 placeholder — becomes the real Today
// screen (routine cards, app streak header, combined ordering, "For later").
export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text>Heute</Text>
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
