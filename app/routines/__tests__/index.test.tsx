import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RoutinesScreen from '../index';
import { listRoutines } from '../../../src/data/repositories/routineRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/routineRepository', () => ({
  listRoutines: jest.fn(),
  updateRoutine: jest.fn().mockResolvedValue(undefined),
  softDeleteRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/services/routineService', () => ({
  pauseRoutine: jest.fn().mockResolvedValue(undefined),
  reactivateRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/data/repositories/routineStateCacheRepository', () => ({
  listRoutineStateCaches: jest.fn().mockResolvedValue([]),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const active = {
  id: 'routine-active',
  name: 'Laufen',
  categoryId: null,
  scheduleType: 'daily' as const,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  reason: null,
  cue: null,
  pairing: null,
  reward: null,
  allowConsciousSkip: false,
  isPaused: false,
  sortOrder: 0,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

const paused = { ...active, id: 'routine-paused', name: 'Lesen', isPaused: true, sortOrder: 1 };

// ReorderableList's GestureDetector requires a GestureHandlerRootView
// ancestor (provided by app/_layout.tsx in the real app tree, which this
// screen-level test bypasses).
function renderScreen() {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RoutinesScreen />
    </GestureHandlerRootView>,
  );
}

describe('RoutinesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an active routine only in the Aktiv tab, not in Pausiert', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([active, paused]);

    await renderScreen();

    expect(await screen.findByText('Laufen')).toBeTruthy();
    expect(screen.queryByText('Lesen')).toBeNull();

    await fireEvent.press(screen.getByTestId('routines-tab-paused'));

    expect(await screen.findByText('Lesen')).toBeTruthy();
    expect(screen.queryByText('Laufen')).toBeNull();
  });

  it('shows an empty state when the active tab has no routines', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await renderScreen();

    expect(await screen.findByText('Noch keine aktiven Routinen')).toBeTruthy();
  });

});
