import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from '../Sheet';

describe('Sheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not visible', async () => {
    await render(
      <Sheet visible={false} onClose={jest.fn()} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );
    expect(screen.queryByTestId('sheet-content')).toBeNull();
    expect(screen.queryByText('Sheet content')).toBeNull();
  });

  it('renders its children when visible', async () => {
    await render(
      <Sheet visible onClose={jest.fn()} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );
    expect(screen.getByText('Sheet content')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );

    await fireEvent.press(screen.getByTestId('sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel mounted through the exit animation, then unmounts and fires onDismissed', async () => {
    const onDismissed = jest.fn();
    const view = await render(
      <Sheet visible onClose={jest.fn()} onDismissed={onDismissed} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    await view.rerender(
      <Sheet visible={false} onClose={jest.fn()} onDismissed={onDismissed} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );

    // Still up: the exit animation is playing, nothing snaps away.
    expect(screen.getByText('Sheet content')).toBeTruthy();
    expect(onDismissed).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByText('Sheet content')).toBeNull();
    expect(onDismissed).toHaveBeenCalledTimes(1);
  });

  it('drives the native Modal through its visible prop while open', async () => {
    // The Sheet controls the native Modal via `visible` (rather than
    // conditionally unmounting a still-visible Modal), which is what lets RN
    // Android run the dialog's dismiss lifecycle instead of leaving a
    // touch-swallowing ghost window when a list row owning the Sheet is
    // removed — e.g. deleting a routine on the Today screen.
    await render(
      <Sheet visible onClose={jest.fn()} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );

    expect(screen.getByTestId('sheet').props.visible).toBe(true);
  });

  it('does not fire onDismissed for a sheet that never opened', async () => {
    const onDismissed = jest.fn();
    await render(
      <Sheet visible={false} onClose={jest.fn()} onDismissed={onDismissed} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(onDismissed).not.toHaveBeenCalled();
  });
});
