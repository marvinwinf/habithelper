import { fireEvent, render, screen } from '@testing-library/react-native';

import { CompletionControl } from '../CompletionControl';

const THRESHOLD_MS = 500;

async function renderControl(
  onComplete: jest.Mock,
  onExceed: jest.Mock,
  extraProps: Partial<React.ComponentProps<typeof CompletionControl>> = {}
) {
  await render(
    <CompletionControl
      onComplete={onComplete}
      onExceed={onExceed}
      longPressThresholdMs={THRESHOLD_MS}
      testID="control"
      {...extraProps}
    />
  );
  return screen.getByTestId('control');
}

describe('CompletionControl', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires only onComplete on a short tap', async () => {
    const onComplete = jest.fn();
    const onExceed = jest.fn();
    const control = await renderControl(onComplete, onExceed);

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onExceed).not.toHaveBeenCalled();
  });

  it('fires only onExceed on a long press', async () => {
    const onComplete = jest.fn();
    const onExceed = jest.fn();
    const control = await renderControl(onComplete, onExceed);

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(THRESHOLD_MS);
    await fireEvent(control, 'pressOut');

    expect(onExceed).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not fire onExceed for a tap released just under the long-press threshold', async () => {
    const onComplete = jest.fn();
    const onExceed = jest.fn();
    const control = await renderControl(onComplete, onExceed);

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(THRESHOLD_MS - 1);
    await fireEvent(control, 'pressOut');
    jest.advanceTimersByTime(THRESHOLD_MS);

    expect(onExceed).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('never fires both callbacks for one interaction, tap or long press', async () => {
    const onComplete = jest.fn();
    const onExceed = jest.fn();
    const control = await renderControl(onComplete, onExceed);

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(THRESHOLD_MS);
    await fireEvent(control, 'pressOut');

    expect(onComplete).toHaveBeenCalledTimes(0);
    expect(onExceed).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls.length + onExceed.mock.calls.length).toBe(1);
  });

  it('does not fire either callback when disabled', async () => {
    const onComplete = jest.fn();
    const onExceed = jest.fn();
    const control = await renderControl(onComplete, onExceed, { disabled: true });

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(THRESHOLD_MS);
    await fireEvent(control, 'pressOut');

    expect(onComplete).not.toHaveBeenCalled();
    expect(onExceed).not.toHaveBeenCalled();
  });
});
