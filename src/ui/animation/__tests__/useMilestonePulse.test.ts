import { act, renderHook } from '@testing-library/react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import { MILESTONE_PULSE_SCALE, pulseScale, useMilestonePulse } from '../useMilestonePulse';

function valueOf(animated: { __getValue?: () => number }): number {
  return (animated as { __getValue(): number }).__getValue();
}

describe('useMilestonePulse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes a duration within the short-animation ceiling', async () => {
    const { result } = await renderHook(() => useMilestonePulse(false));

    expect(result.current.durationMs).toBeGreaterThan(0);
    expect(result.current.durationMs).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('calls onDone exactly once when the pulse completes', async () => {
    const { result } = await renderHook(() => useMilestonePulse(false));
    const onDone = jest.fn();

    await act(() => {
      result.current.start(onDone);
    });
    await act(() => {
      jest.advanceTimersByTime(result.current.durationMs + 50);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not animate under reduced motion but still reports completion', async () => {
    const { result } = await renderHook(() => useMilestonePulse(true));
    const onDone = jest.fn();

    await act(() => {
      result.current.start(onDone);
    });
    await act(() => {
      jest.advanceTimersByTime(MAX_SHORT_ANIMATION_DURATION_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(
      valueOf(result.current.progress as unknown as { __getValue(): number }),
    ).toBe(0);
  });

  it('maps progress to a swell that returns to rest', async () => {
    const { result } = await renderHook(() => useMilestonePulse(false));
    const scale = pulseScale(result.current.progress);

    expect(valueOf(scale as unknown as { __getValue(): number })).toBe(1);
    await act(() => {
      result.current.start();
    });
    await act(() => {
      jest.advanceTimersByTime(result.current.durationMs + 50);
    });
    expect(valueOf(scale as unknown as { __getValue(): number })).toBe(1);
    expect(MILESTONE_PULSE_SCALE).toBeGreaterThan(1);
    // The swell stays subtle — a breath, not a bounce.
    expect(MILESTONE_PULSE_SCALE).toBeLessThanOrEqual(1.1);
  });
});
