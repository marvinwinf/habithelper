import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CreateFab } from '../CreateFab';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

/** Lets the sheet's exit animation finish so the deferred push fires. */
async function finishSheetDismissal() {
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
}

describe('CreateFab', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the type-selection sheet on tap', async () => {
    await render(<CreateFab />);

    expect(screen.queryByTestId('create-fab-routine')).toBeNull();

    await fireEvent.press(screen.getByTestId('create-fab'));

    expect(screen.getByTestId('create-fab-routine')).toBeTruthy();
    expect(screen.getByTestId('create-fab-task')).toBeTruthy();
  });

  it('navigates to the routine create screen once the sheet has dismissed', async () => {
    await render(<CreateFab />);

    await fireEvent.press(screen.getByTestId('create-fab'));
    await fireEvent.press(screen.getByTestId('create-fab-routine'));

    // Navigation is sequenced after the sheet's exit animation, not raced
    // against it.
    expect(mockPush).not.toHaveBeenCalled();
    await finishSheetDismissal();

    expect(mockPush).toHaveBeenCalledWith('/routine/create');
  });

  it('navigates to the task create screen once the sheet has dismissed', async () => {
    await render(<CreateFab />);

    await fireEvent.press(screen.getByTestId('create-fab'));
    await fireEvent.press(screen.getByTestId('create-fab-task'));
    await finishSheetDismissal();

    expect(mockPush).toHaveBeenCalledWith('/task/create');
  });

  it('does not navigate when the sheet is dismissed without a selection', async () => {
    await render(<CreateFab />);

    await fireEvent.press(screen.getByTestId('create-fab'));
    await fireEvent.press(screen.getByTestId('create-fab-sheet-backdrop'));
    await finishSheetDismissal();

    expect(mockPush).not.toHaveBeenCalled();
  });
});
