import { fireEvent, render, screen } from '@testing-library/react-native';

import { CreateFab } from '../CreateFab';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('CreateFab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the type-selection sheet on tap', async () => {
    await render(<CreateFab />);

    expect(screen.queryByTestId('create-fab-routine')).toBeNull();

    await fireEvent.press(screen.getByTestId('create-fab'));

    expect(screen.getByTestId('create-fab-routine')).toBeTruthy();
    expect(screen.getByTestId('create-fab-task')).toBeTruthy();
  });

  it('navigates to the routine create screen', async () => {
    await render(<CreateFab />);

    await fireEvent.press(screen.getByTestId('create-fab'));
    await fireEvent.press(screen.getByTestId('create-fab-routine'));

    expect(mockPush).toHaveBeenCalledWith('/routine/create');
  });

  it('navigates to the task create screen', async () => {
    await render(<CreateFab />);

    await fireEvent.press(screen.getByTestId('create-fab'));
    await fireEvent.press(screen.getByTestId('create-fab-task'));

    expect(mockPush).toHaveBeenCalledWith('/task/create');
  });
});
