// Covers the Today screen's drag-reorder writing back a *global* sortOrder.
//
// Kept in its own file because it needs ReorderableList stubbed to invoke
// onReorder directly (driving the real long-press drag gesture in Jest is not
// practical), and today.test.tsx renders the real list.

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayScreen from '../today';
import { todayDateString } from '../../../src/domain/dates';
import { listRoutines, updateRoutine } from '../../../src/data/repositories/routineRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/profileRepository', () => ({
  ensureProfile: jest.fn().mockResolvedValue({ id: 'p', displayName: 'Marvin', createdAt: 'x' }),
}));
jest.mock('../../../src/data/repositories/routineRepository', () => ({
  listRoutines: jest.fn(),
  updateRoutine: jest.fn().mockResolvedValue(undefined),
  softDeleteRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/data/repositories/routineEventRepository', () => ({
  listRoutineEventsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/appStreakCacheRepository', () => ({
  getAppStreakCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/data/repositories/routineStateCacheRepository', () => ({
  listRoutineStateCaches: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/taskRepository', () => ({
  listOverdueTasks: jest.fn().mockResolvedValue([]),
  listTasksForToday: jest.fn().mockResolvedValue([]),
  listUpcomingTasks: jest.fn().mockResolvedValue([]),
  listUndatedTasks: jest.fn().mockResolvedValue([]),
  listCompletedTasks: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/services/routineService', () => ({
  completeRoutineOccurrence: jest.fn(),
  exceedRoutineOccurrence: jest.fn(),
  moveRoutineOccurrence: jest.fn(),
  pauseRoutine: jest.fn(),
  skipRoutineOccurrence: jest.fn(),
  undoRoutineCompletion: jest.fn(),
  undoRoutineSkip: jest.fn(),
}));
jest.mock('../../../src/services/taskService', () => ({
  deleteTask: jest.fn(),
  moveTask: jest.fn(),
  setTaskCompletion: jest.fn(),
}));
jest.mock('../../../src/state/appDayRollover', () => ({
  subscribeToDayRollover: () => () => undefined,
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// Stubbed so the test can fire a reorder without a gesture: renders each row
// plus a button that hands the screen the reversed order.
jest.mock('../../../src/ui/components/ReorderableList', () => {
  const React = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    ReorderableList: <T,>({
      data,
      renderItem,
      keyExtractor,
      onReorder,
      testID,
    }: {
      data: T[];
      renderItem: (item: T) => React.ReactNode;
      keyExtractor: (item: T) => string;
      onReorder: (next: T[]) => void;
      testID?: string;
    }) =>
      React.createElement(
        View,
        { testID },
        data.map((item) =>
          React.createElement(View, { key: keyExtractor(item) }, renderItem(item)),
        ),
        React.createElement(Pressable, {
          testID: 'reverse-routines',
          onPress: () => onReorder([...data].reverse()),
        }),
      ),
  };
});

const TODAY = todayDateString();

function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

const base = {
  categoryId: null,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  reason: null,
  cue: null,
  pairing: null,
  reward: null,
  allowConsciousSkip: false,
  isPaused: false,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

// Due today.
const first = { ...base, id: 'r-first', name: 'Laufen', scheduleType: 'daily' as const, sortOrder: 0 };
// Scheduled on a different weekday, so Today never lists it — the routine the
// old implementation silently reindexed around.
const notDue = {
  ...base,
  id: 'r-not-due',
  name: 'Wocheneinkauf',
  scheduleType: 'weekdays' as const,
  scheduledWeekdays: [((isoWeekday(TODAY) + 2) % 7) + 1],
  sortOrder: 1,
};
// Due today.
const last = { ...base, id: 'r-last', name: 'Lesen', scheduleType: 'daily' as const, sortOrder: 2 };

function renderToday() {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TodayScreen />
    </GestureHandlerRootView>,
  );
}

describe('TodayScreen reordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listRoutines as jest.Mock).mockResolvedValue([first, notDue, last]);
  });

  it('lists only the routines due today', async () => {
    await renderToday();

    expect(await screen.findByTestId(`routine-card-${first.id}`)).toBeTruthy();
    expect(screen.getByTestId(`routine-card-${last.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`routine-card-${notDue.id}`)).toBeNull();
  });

  it('persists a collision-free sortOrder across every active routine', async () => {
    await renderToday();
    await screen.findByTestId(`routine-card-${first.id}`);

    await fireEvent.press(screen.getByTestId('reverse-routines'));

    await waitFor(() => expect(updateRoutine).toHaveBeenCalledTimes(3));

    const written = (updateRoutine as jest.Mock).mock.calls.map(([, id, patch]) => [
      id,
      patch.sortOrder,
    ]);
    const orders = written.map(([, sortOrder]) => sortOrder);
    // Every active routine is rewritten as one contiguous sequence. Before,
    // only the two due routines were reindexed to 0 and 1, which collided
    // with the untouched notDue routine's existing sortOrder of 1.
    expect(new Set(orders).size).toBe(3);
    expect([...orders].sort()).toEqual([0, 1, 2]);
  });

  it('swaps the dragged routines while leaving the undisplayed one in place', async () => {
    await renderToday();
    await screen.findByTestId(`routine-card-${first.id}`);

    await fireEvent.press(screen.getByTestId('reverse-routines'));

    await waitFor(() => expect(updateRoutine).toHaveBeenCalledTimes(3));

    const written = new Map(
      (updateRoutine as jest.Mock).mock.calls.map(([, id, patch]) => [id, patch.sortOrder]),
    );
    expect(written.get(last.id)).toBe(0);
    expect(written.get(notDue.id)).toBe(1);
    expect(written.get(first.id)).toBe(2);
  });
});
