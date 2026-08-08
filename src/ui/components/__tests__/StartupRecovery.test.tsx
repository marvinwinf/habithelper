import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { StartupRecovery } from '../StartupRecovery';

describe('StartupRecovery', () => {
  it('tells the user their data is still on the device', async () => {
    await render(<StartupRecovery onRetry={jest.fn()} onRestoreBackup={jest.fn()} />);

    // The single most important job of this screen: a failed startup used to
    // render empty lists, which reads as total data loss.
    expect(screen.getByText(/nicht gelöscht/)).toBeTruthy();
  });

  it('retries startup when asked', async () => {
    const onRetry = jest.fn();
    await render(<StartupRecovery onRetry={onRetry} onRestoreBackup={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('startup-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the restart prompt after a successful restore', async () => {
    const onRestoreBackup = jest.fn().mockResolvedValue(true);
    await render(<StartupRecovery onRetry={jest.fn()} onRestoreBackup={onRestoreBackup} testID="r" />);

    await fireEvent.press(screen.getByTestId('startup-restore-backup'));

    expect(await screen.findByTestId('r-restored')).toBeTruthy();
  });

  it('stays on the recovery screen when the user cancels the picker', async () => {
    const onRestoreBackup = jest.fn().mockResolvedValue(false);
    await render(<StartupRecovery onRetry={jest.fn()} onRestoreBackup={onRestoreBackup} testID="r" />);

    await fireEvent.press(screen.getByTestId('startup-restore-backup'));

    await waitFor(() => expect(screen.getByTestId('startup-retry')).toBeTruthy());
    expect(screen.queryByTestId('r-restored')).toBeNull();
  });

  it('reports a failed restore without claiming data was lost', async () => {
    const onRestoreBackup = jest.fn().mockRejectedValue(new Error('bad backup'));
    await render(<StartupRecovery onRetry={jest.fn()} onRestoreBackup={onRestoreBackup} />);

    await fireEvent.press(screen.getByTestId('startup-restore-backup'));

    const error = await screen.findByTestId('startup-restore-error');
    expect(error.props.children).toContain('nicht verändert');
  });

  it('offers no destructive reset option', async () => {
    await render(<StartupRecovery onRetry={jest.fn()} onRestoreBackup={jest.fn()} />);

    // Wiping the user's only copy of their history to fix a schema problem is
    // forbidden by CLAUDE.md's working rules; this asserts the screen never
    // grows such a button by accident.
    expect(screen.queryByText(/zurücksetzen|löschen|neu beginnen/i)).toBeNull();
  });
});
