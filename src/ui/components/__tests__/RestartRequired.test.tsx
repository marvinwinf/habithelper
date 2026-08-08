import { render, screen } from '@testing-library/react-native';

import { RestartRequired } from '../RestartRequired';

describe('RestartRequired', () => {
  it('confirms the restore succeeded and asks for a restart', async () => {
    await render(<RestartRequired testID="restart" />);

    expect(screen.getByTestId('restart')).toBeTruthy();
    // Both the heading and the body mention the restore.
    expect(screen.getAllByText(/wiederhergestellt/).length).toBeGreaterThan(0);
    expect(screen.getByText(/öffne sie erneut/)).toBeTruthy();
  });

  it('offers no action that would query the closed database', async () => {
    await render(<RestartRequired />);

    // The connection is gone and the singleton cannot be rebound mid-session,
    // so any button here would fail; the screen is deliberately inert.
    expect(screen.queryByRole('button')).toBeNull();
  });
});
