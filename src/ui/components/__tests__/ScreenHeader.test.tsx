import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScreenHeader } from '../ScreenHeader';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the centered title', async () => {
    await render(<ScreenHeader title="Neue Routine" testID="header" />);
    expect(screen.getByText('Neue Routine')).toBeTruthy();
  });

  it('navigates back via the circular back button', async () => {
    await render(<ScreenHeader title="Neue Routine" testID="header" />);

    await fireEvent.press(screen.getByTestId('header-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
