import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Returns a new array with the item at `fromIndex` moved to `toIndex`
 * (clamped to the array's bounds). Pure and independent of any gesture
 * plumbing, so it's unit-testable on its own.
 */
export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const clampedTo = Math.max(0, Math.min(items.length - 1, toIndex));
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(clampedTo, 0, moved);
  return copy;
}

export interface ReorderableListProps<T> {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Fixed row height in dp, used to translate drag distance into row positions. */
  rowHeight: number;
  onReorder: (newData: T[]) => void;
  testID?: string;
}

interface ReorderableRowProps<T> {
  item: T;
  index: number;
  data: readonly T[];
  rowHeight: number;
  renderItem: (item: T) => ReactNode;
  onReorder: (newData: T[]) => void;
  testID?: string;
}

// Held out for the row's own long-press-to-drag threshold, matching the
// design system's existing long-press affordance (see CompletionControl).
const DRAG_ACTIVATION_MS = 250;
const DRAG_RESET_DURATION_MS = 150;

function ReorderableRow<T>({
  item,
  index,
  data,
  rowHeight,
  renderItem,
  onReorder,
  testID,
}: ReorderableRowProps<T>) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDragEnd = useCallback(
    (rowsMoved: number) => {
      if (rowsMoved !== 0) {
        onReorder(moveItem(data, index, index + rowsMoved));
      }
    },
    [data, index, onReorder],
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(DRAG_ACTIVATION_MS)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      const rowsMoved = Math.round(translateY.value / rowHeight);
      translateY.value = withTiming(0, { duration: DRAG_RESET_DURATION_MS });
      isDragging.value = false;
      runOnJS(handleDragEnd)(rowsMoved);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isDragging.value ? 1 : 0,
    elevation: isDragging.value ? 4 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle} testID={testID}>
        {renderItem(item)}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * A long-press-to-drag reorderable list, built directly on the
 * already-installed react-native-gesture-handler + react-native-reanimated
 * (no third-party drag-list dependency — see T032's commit for why).
 */
export function ReorderableList<T>({
  data,
  keyExtractor,
  renderItem,
  rowHeight,
  onReorder,
  testID,
}: ReorderableListProps<T>) {
  return (
    <View testID={testID}>
      {data.map((item, index) => (
        <ReorderableRow
          key={keyExtractor(item)}
          item={item}
          index={index}
          data={data}
          rowHeight={rowHeight}
          renderItem={renderItem}
          onReorder={onReorder}
          testID={`reorderable-row-${keyExtractor(item)}`}
        />
      ))}
    </View>
  );
}
