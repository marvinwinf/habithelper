import { act, renderHook } from '@testing-library/react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import {
  NUMBER_COUNT_ANIMATION_DURATION_MS,
  useAnimatedNumber,
} from '../useAnimatedNumber';

describe('useAnimatedNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays within the short-animation ceiling', () => {
    expect(NUMBER_COUNT_ANIMATION_DURATION_MS).toBeGreaterThan(0);
    expect(NUMBER_COUNT_ANIMATION_DURATION_MS).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('shows the initial value immediately, without animating on mount', async () => {
    const { result } = await renderHook(() => useAnimatedNumber(7, false));

    expect(result.current).toBe(7);
  });

  it('counts through intermediate integers to a raised target', async () => {
    const { result, rerender } = await renderHook(
      ({ target }: { target: number }) => useAnimatedNumber(target, false),
      { initialProps: { target: 0 } },
    );

    await act(() => {
      rerender({ target: 10 });
    });
    await act(() => {
      jest.advanceTimersByTime(NUMBER_COUNT_ANIMATION_DURATION_MS / 2);
    });

    // Midway the display sits between the endpoints — a rolling count, not a
    // snap.
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(10);

    await act(() => {
      jest.advanceTimersByTime(NUMBER_COUNT_ANIMATION_DURATION_MS);
    });

    expect(result.current).toBe(10);
  });

  it('rolls back down when the target decreases (undo of the day\'s first completion)', async () => {
    const { result, rerender } = await renderHook(
      ({ target }: { target: number }) => useAnimatedNumber(target, false),
      { initialProps: { target: 5 } },
    );

    await act(() => {
      rerender({ target: 4 });
    });
    await act(() => {
      jest.advanceTimersByTime(NUMBER_COUNT_ANIMATION_DURATION_MS);
    });

    expect(result.current).toBe(4);
  });

  it('swaps instantly under reduced motion', async () => {
    const { result, rerender } = await renderHook(
      ({ target }: { target: number }) => useAnimatedNumber(target, true),
      { initialProps: { target: 0 } },
    );

    await act(() => {
      rerender({ target: 12 });
    });

    expect(result.current).toBe(12);
  });
});
