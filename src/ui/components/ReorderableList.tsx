import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
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
  /** Rows are assumed equal-height; the drag math measures their pitch at runtime. */
  renderItem: (item: T) => ReactNode;
  onReorder: (newData: T[]) => void;
  testID?: string;
}

interface ReorderableRowProps<T> {
  item: T;
  index: number;
  data: readonly T[];
  rowPitch: SharedValue<number>;
  renderItem: (item: T) => ReactNode;
  onReorder: (newData: T[]) => void;
  onRowLayout: (index: number, y: number) => void;
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
  rowPitch,
  renderItem,
  onReorder,
  onRowLayout,
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
    .onEnd((event) => {
      // rowPitch stays 0 until two rows have been laid out — a single-row
      // list has nothing to reorder, so the drag resolves to 0 rows moved.
      const pitch = rowPitch.value;
      const rowsMoved = pitch > 0 ? Math.round(event.translationY / pitch) : 0;
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
      <Animated.View
        style={animatedStyle}
        onLayout={(event: LayoutChangeEvent) => onRowLayout(index, event.nativeEvent.layout.y)}
        testID={testID}
      >
        {renderItem(item)}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * A long-press-to-drag reorderable list, built directly on the
 * already-installed react-native-gesture-handler + react-native-reanimated
 * (no third-party drag-list dependency — see T032's commit for why).
 *
 * Row pitch (vertical distance between consecutive row starts, including
 * any margins) is measured from the rendered layout rather than passed in,
 * so the drag-to-index math can never drift from the rows' actual styling.
 */
export function ReorderableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  testID,
}: ReorderableListProps<T>) {
  const rowOffsetsRef = useRef(new Map<number, number>());
  const rowPitch = useSharedValue(0);

  function handleRowLayout(index: number, y: number) {
    rowOffsetsRef.current.set(index, y);
    const first = rowOffsetsRef.current.get(0);
    const second = rowOffsetsRef.current.get(1);
    if (first !== undefined && second !== undefined && second > first) {
      rowPitch.value = second - first;
    }
  }

  return (
    <View testID={testID}>
      {data.map((item, index) => (
        <ReorderableRow
          key={keyExtractor(item)}
          item={item}
          index={index}
          data={data}
          rowPitch={rowPitch}
          renderItem={renderItem}
          onReorder={onReorder}
          onRowLayout={handleRowLayout}
          testID={`reorderable-row-${keyExtractor(item)}`}
        />
      ))}
    </View>
  );
}
