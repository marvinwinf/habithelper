import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayScreen from '../today';
import { todayDateString } from '../../../src/domain/dates';
import { focusOfTheDay } from '../../../src/domain/focusOfTheDay';
import { listCategories } from '../../../src/data/repositories/categoryRepository';
import { listRoutines, softDeleteRoutine } from '../../../src/data/repositories/routineRepository';
import { listRoutineEventsInRange } from '../../../src/data/repositories/routineEventRepository';
import {
  getAppStreakCache,
  type AppStreakCache,
} from '../../../src/data/repositories/appStreakCacheRepository';
import { listRoutineStateCaches } from '../../../src/data/repositories/routineStateCacheRepository';
import { ensureProfile } from '../../../src/data/repositories/profileRepository';
import {
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
  listUndatedTasks,
  listUpcomingTasks,
} from '../../../src/data/repositories/taskRepository';
import {
  completeRoutineOccurrence,
  moveRoutineOccurrence,
  undoRoutineCompletion,
} from '../../../src/services/routineService';
import { deleteTask, moveTask, toggleTaskCompletion } from '../../../src/services/taskService';
import { triggerFirstCompletionOfDayHaptic } from '../../../src/ui/animation/haptics';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/profileRepository', () => ({
  ensureProfile: jest.fn(),
}));
jest.mock('../../../src/data/repositories/routineRepository', () => ({
  listRoutines: jest.fn(),
  softDeleteRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/data/repositories/routineEventRepository', () => ({
  listRoutineEventsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/appStreakCacheRepository', () => ({
  getAppStreakCache: jest.fn(),
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
  completeRoutineOccurrence: jest.fn().mockResolvedValue({ event: undefined, leveledUp: false }),
  exceedRoutineOccurrence: jest.fn().mockResolvedValue({ event: undefined, leveledUp: false }),
  moveRoutineOccurrence: jest.fn().mockResolvedValue(undefined),
  skipRoutineOccurrence: jest.fn().mockResolvedValue(undefined),
  pauseRoutine: jest.fn().mockResolvedValue(undefined),
  undoRoutineCompletion: jest.fn().mockResolvedValue({ writtenEvents: [] }),
}));
jest.mock('../../../src/services/taskService', () => ({
  toggleTaskCompletion: jest.fn().mockResolvedValue(undefined),
  moveTask: jest.fn().mockResolvedValue(undefined),
  deleteTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/ui/animation/haptics', () => ({
  triggerRoutineCompletionHaptic: jest.fn(),
  triggerExceededCompletionHaptic: jest.fn(),
  triggerFirstCompletionOfDayHaptic: jest.fn(),
  triggerLevelMilestoneHaptic: jest.fn(),
}));
jest.mock('../../../src/domain/dates', () => {
  const actual = jest.requireActual('../../../src/domain/dates');
  return { ...actual, todayDateString: jest.fn(actual.todayDateString) };
});
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const TODAY = todayDateString();

// The routines section's ReorderableList uses a GestureDetector, which
// requires a GestureHandlerRootView ancestor (mirrors the Routines screen's
// test setup).
function renderToday() {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TodayScreen />
    </GestureHandlerRootView>,
  );
}

const dailyRoutine = {
  id: 'routine-daily',
  name: 'Laufen',
  categoryId: null,
  scheduleType: 'daily' as const,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  reason: null,
  allowConsciousSkip: false,
  isPaused: false,
  sortOrder: 0,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

const pausedRoutine = { ...dailyRoutine, id: 'routine-paused', name: 'Meditieren', isPaused: true };

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    title: 'Wäsche waschen',
    categoryId: null,
    date: null,
    timeOfDay: null,
    description: null,
    isCompleted: false,
    completedAt: null,
    sortOrder: 0,
    colorVariantSeed: 0,
    createdAt: 'x',
    updatedAt: 'x',
    deletedAt: null,
    ...overrides,
  };
}

describe('TodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCategories as jest.Mock).mockResolvedValue([]);
    (listRoutineEventsInRange as jest.Mock).mockResolvedValue([]);
    (getAppStreakCache as jest.Mock).mockResolvedValue(undefined);
    (ensureProfile as jest.Mock).mockResolvedValue({
      id: 'profile-1',
      displayName: 'Marvin',
      createdAt: 'x',
    });
    (listOverdueTasks as jest.Mock).mockResolvedValue([]);
    (listTasksForToday as jest.Mock).mockResolvedValue([]);
    (listUpcomingTasks as jest.Mock).mockResolvedValue([]);
    (listUndatedTasks as jest.Mock).mockResolvedValue([]);
    (listCompletedTasks as jest.Mock).mockResolvedValue([]);
    (listRoutineStateCaches as jest.Mock).mockResolvedValue([]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Some tests below override todayDateString's implementation (not just
    // its calls, which jest.clearAllMocks() does reset); reset it back to
    // the real implementation so later tests aren't affected by ordering.
    (todayDateString as jest.Mock).mockImplementation(
      jest.requireActual('../../../src/domain/dates').todayDateString,
    );
  });

  it('shows the overall app streak from the cache', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (getAppStreakCache as jest.Mock).mockResolvedValue({
      id: 'app_streak_cache',
      currentStreak: 5,
      lastIncrementedDate: TODAY,
      reconciledThroughDate: TODAY,
      recalculatedAt: TODAY,
    });

    await renderToday();

    expect(await screen.findByTestId('today-app-streak')).toHaveTextContent('5');
    expect(screen.getByText('Gesamt-Streak')).toBeTruthy();
  });

  it('shows a zero streak when the cache has never been computed', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderToday();

    expect(await screen.findByTestId('today-app-streak')).toHaveTextContent('0');
  });

  it('shows a time-based greeting with the profile display name', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);

    await renderToday();

    expect(await screen.findByTestId('today-greeting')).toHaveTextContent('Guten Morgen, Marvin');
  });

  it('shows the daily routine progress as completed/total with a partly filled progress bar', async () => {
    const secondRoutine = { ...dailyRoutine, id: 'routine-daily-2', name: 'Lesen', sortOrder: 1 };
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine, secondRoutine]);
    (listRoutineEventsInRange as jest.Mock).mockImplementation((_db, routineId: string) =>
      Promise.resolve(
        routineId === dailyRoutine.id
          ? [
              {
                id: 'event-1',
                routineId: dailyRoutine.id,
                occurrenceDate: TODAY,
                eventType: 'completed',
                recordedAt: TODAY,
                movedToDate: null,
                skipReason: null,
                supersededByEventId: null,
              },
            ]
          : [],
      ),
    );

    await renderToday();

    expect(await screen.findByTestId('today-routine-progress')).toHaveTextContent(
      '1 von 2 erledigt',
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('today-routine-progress-bar').props.accessibilityValue.now,
      ).toBe(50),
    );
  });

  it('acknowledges the day once every due routine is completed', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);
    (listRoutineEventsInRange as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        routineId: dailyRoutine.id,
        occurrenceDate: TODAY,
        eventType: 'completed',
        recordedAt: TODAY,
        movedToDate: null,
        skipReason: null,
        supersededByEventId: null,
      },
    ]);

    await renderToday();

    expect(await screen.findByTestId('today-routine-progress')).toHaveTextContent(
      'Alle erledigt ✓',
    );
    expect(
      screen.getByTestId('today-routine-progress-bar').props.accessibilityValue.now,
    ).toBe(100);
  });

  it('shows a pending due routine and excludes a paused one', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine, pausedRoutine]);

    await renderToday();

    expect(await screen.findByText('Laufen')).toBeTruthy();
    expect(screen.queryByText('Meditieren')).toBeNull();
  });

  it("shows each routine card's real streak from the state cache", async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);
    (listRoutineStateCaches as jest.Mock).mockResolvedValue([
      {
        routineId: dailyRoutine.id,
        currentStreak: 8,
        bestStreak: 16,
        totalCompletions: 48,
        levelRank: 0,
        jokerInventory: 1,
        jokerProgress: 3,
        consecutiveMissedAfter66: 0,
        reconciledThroughDate: TODAY,
        recalculatedAt: TODAY,
      },
    ]);

    await renderToday();

    expect(
      await screen.findByTestId(`routine-card-${dailyRoutine.id}-streak`),
    ).toHaveTextContent('Streak 8');
  });

  it('shows an empty state when nothing is due', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderToday();

    expect(await screen.findByText('Für heute nichts geplant')).toBeTruthy();
  });

  it('shows a completed routine in a subdued, checked state, tappable only to undo', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);
    (listRoutineEventsInRange as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        routineId: dailyRoutine.id,
        occurrenceDate: TODAY,
        eventType: 'completed',
        recordedAt: TODAY,
        movedToDate: null,
        skipReason: null,
        supersededByEventId: null,
      },
    ]);

    await renderToday();

    const control = await screen.findByTestId(`routine-card-${dailyRoutine.id}-complete`);
    expect(control.props.accessibilityState.disabled).toBe(false);
    expect(control.props.accessibilityState.checked).toBe(true);

    await fireEvent(control, 'pressIn');
    await fireEvent(control, 'pressOut');

    expect(undoRoutineCompletion).toHaveBeenCalledWith({}, dailyRoutine.id, TODAY);
    expect(completeRoutineOccurrence).not.toHaveBeenCalled();
  });

  it('completes a routine via its card, calling the service with today\'s date', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);

    await renderToday();
    const control = await screen.findByTestId(`routine-card-${dailyRoutine.id}-complete`);

    await fireEvent(control, 'pressIn');
    await fireEvent(control, 'pressOut');

    expect(completeRoutineOccurrence).toHaveBeenCalledWith({}, dailyRoutine.id, TODAY);
  });

  it('moves a routine to tomorrow from the actions sheet', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);

    await renderToday();
    await fireEvent.press(await screen.findByTestId(`routine-card-${dailyRoutine.id}`));
    await fireEvent.press(screen.getByTestId(`routine-card-${dailyRoutine.id}-menu-move`));

    expect(moveRoutineOccurrence).toHaveBeenCalledWith(
      {},
      dailyRoutine.id,
      TODAY,
      expect.any(String),
    );
  });

  it('deletes a routine from the actions sheet only after confirmation', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);

    await renderToday();
    await fireEvent.press(await screen.findByTestId(`routine-card-${dailyRoutine.id}`));
    await fireEvent.press(screen.getByTestId(`routine-card-${dailyRoutine.id}-menu-delete`));

    expect(softDeleteRoutine).not.toHaveBeenCalled();

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === 'Löschen')?.onPress?.();

    expect(softDeleteRoutine).toHaveBeenCalledWith({}, dailyRoutine.id);
  });

  it('renders Routines, then Tasks, then For later, in that order', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);
    (listTasksForToday as jest.Mock).mockResolvedValue([makeTask({ id: 'today-task', date: TODAY })]);
    (listUndatedTasks as jest.Mock).mockResolvedValue([makeTask({ id: 'later-task' })]);

    await renderToday();
    await screen.findByTestId('today-section-routines');

    const sectionOrder = ['today-section-routines', 'today-section-tasks', 'today-section-later'];
    for (const testId of sectionOrder) {
      expect(screen.getByTestId(testId)).toBeTruthy();
    }
  });

  it('puts an overdue task in the Tasks section, flagged overdue, and an undated task in For later', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (listOverdueTasks as jest.Mock).mockResolvedValue([
      makeTask({ id: 'overdue-1', title: 'Überfällige Aufgabe' }),
    ]);
    (listUndatedTasks as jest.Mock).mockResolvedValue([
      makeTask({ id: 'undated-1', title: 'Später erledigen' }),
    ]);

    await renderToday();

    const tasksSection = await screen.findByTestId('today-section-tasks');
    expect(tasksSection).toBeTruthy();
    expect(await screen.findByTestId('today-task-overdue-1-overdue-label')).toBeTruthy();

    const laterSection = await screen.findByTestId('today-section-later');
    expect(laterSection).toBeTruthy();
    expect(screen.queryByTestId('today-task-undated-1-overdue-label')).toBeNull();
  });

  it('shows a completed task in a subdued, checked state, sorted after the incomplete ones', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (listTasksForToday as jest.Mock).mockResolvedValue([
      makeTask({ id: 'pending-1', title: 'Offen', date: TODAY }),
    ]);
    (listCompletedTasks as jest.Mock).mockResolvedValue([
      makeTask({
        id: 'done-1',
        title: 'Erledigt',
        date: TODAY,
        isCompleted: true,
        completedAt: '2026-07-01T00:00:00.000Z',
      }),
    ]);

    await renderToday();
    await screen.findByTestId('today-section-tasks');

    const toggles = await screen.findAllByRole('checkbox');
    expect(toggles).toHaveLength(2);
    expect(toggles[0].props.testID).toBe('today-task-pending-1-toggle');
    expect(toggles[1].props.testID).toBe('today-task-done-1-toggle');
    expect(toggles[1].props.accessibilityState.checked).toBe(true);
  });

  it('toggles a task complete from the Today screen', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (listTasksForToday as jest.Mock).mockResolvedValue([makeTask({ id: 'task-1', date: TODAY })]);

    await renderToday();
    // The shared CompletionControl decides tap vs. long-press on pressOut.
    const toggle = await screen.findByTestId('today-task-task-1-toggle');
    await fireEvent(toggle, 'pressIn');
    await fireEvent(toggle, 'pressOut');

    expect(toggleTaskCompletion).toHaveBeenCalledWith({}, 'task-1');
  });

  it('moves and deletes a task from the Today screen actions sheet', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (listTasksForToday as jest.Mock).mockResolvedValue([makeTask({ id: 'task-1', date: TODAY })]);

    await renderToday();
    await fireEvent.press(await screen.findByTestId('today-task-task-1'));
    await fireEvent.press(screen.getByTestId('today-task-task-1-menu-move'));

    expect(moveTask).toHaveBeenCalledWith({}, 'task-1', expect.any(String));

    await fireEvent.press(await screen.findByTestId('today-task-task-1'));
    await fireEvent.press(screen.getByTestId('today-task-task-1-menu-delete'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === 'Löschen')?.onPress?.();

    expect(deleteTask).toHaveBeenCalledWith({}, 'task-1');
  });

  it('fires the first-completion-of-day signal exactly once per day, across multiple completions', async () => {
    const routineA = dailyRoutine;
    const routineB = { ...dailyRoutine, id: 'routine-b', name: 'Lesen' };
    (listRoutines as jest.Mock).mockResolvedValue([routineA, routineB]);

    let currentDay = '2026-07-01';
    (todayDateString as jest.Mock).mockImplementation(() => currentDay);

    let lastIncrementedDate: string | null = null;
    (getAppStreakCache as jest.Mock).mockImplementation(() =>
      Promise.resolve<AppStreakCache | undefined>(
        lastIncrementedDate === null
          ? undefined
          : {
              id: 'app_streak_cache',
              currentStreak: 1,
              lastIncrementedDate,
              reconciledThroughDate: lastIncrementedDate,
              recalculatedAt: lastIncrementedDate,
            },
      ),
    );
    (completeRoutineOccurrence as jest.Mock).mockImplementation((_db, _id, date: string) => {
      // Mirrors the real cache update (src/services/routineService.ts):
      // only a later day's first completion advances the watermark.
      if (lastIncrementedDate === null || date > lastIncrementedDate) {
        lastIncrementedDate = date;
      }
      return Promise.resolve({ event: undefined, leveledUp: false });
    });

    await renderToday();

    await fireEvent(await screen.findByTestId(`routine-card-${routineA.id}-complete`), 'pressIn');
    await fireEvent(screen.getByTestId(`routine-card-${routineA.id}-complete`), 'pressOut');
    await waitFor(() => expect(screen.getByTestId('today-app-streak')).toHaveTextContent('1'));

    expect(triggerFirstCompletionOfDayHaptic).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByTestId(`routine-card-${routineB.id}-complete`), 'pressIn');
    await fireEvent(screen.getByTestId(`routine-card-${routineB.id}-complete`), 'pressOut');
    // Give the second action's promise chain (service -> loadData -> setAppStreak) time to settle.
    await waitFor(() => expect((getAppStreakCache as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3));

    // Second completion, same day: the signal does not fire again.
    expect(triggerFirstCompletionOfDayHaptic).toHaveBeenCalledTimes(1);

    // A new day: the next completion fires the signal once more.
    currentDay = '2026-07-02';
    await fireEvent(screen.getByTestId(`routine-card-${routineA.id}-complete`), 'pressIn');
    await fireEvent(screen.getByTestId(`routine-card-${routineA.id}-complete`), 'pressOut');
    await waitFor(() => expect(triggerFirstCompletionOfDayHaptic).toHaveBeenCalledTimes(2));
  });

  it('shows the Focus of the day card with the prompt for today', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderToday();

    expect(await screen.findByTestId('today-focus-of-the-day')).toBeTruthy();
    expect(screen.getByText('Fokus des Tages')).toBeTruthy();
    expect(screen.getByText(focusOfTheDay(TODAY))).toBeTruthy();
  });

  it('opens the shortcuts sheet from the header icon and closes it again', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderToday();

    expect(screen.queryByTestId('today-shortcuts-categories')).toBeNull();

    await fireEvent.press(await screen.findByTestId('today-shortcuts-button'));
    expect(screen.getByTestId('today-shortcuts-categories')).toBeTruthy();
    expect(screen.getByTestId('today-shortcuts-me')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('today-shortcuts-categories'));
    // The sheet plays its exit animation before unmounting.
    await waitFor(() => expect(screen.queryByTestId('today-shortcuts-categories')).toBeNull());
  });

  it('opens the notifications placeholder sheet from the header icon', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderToday();

    await fireEvent.press(await screen.findByTestId('today-notifications-button'));

    expect(screen.getByText('Benachrichtigungen sind noch nicht verfügbar.')).toBeTruthy();
  });
});
