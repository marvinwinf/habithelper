import { act, renderHook } from '@testing-library/react-native';
import type { Animated } from 'react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import {
  PROGRESS_FILL_ANIMATION_DURATION_MS,
  useAnimatedProgress,
} from '../useAnimatedProgress';

function valueOf(animated: Animated.Value): number {
  return (animated as unknown as { __getValue(): number }).__getValue();
}

describe('useAnimatedProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays within the short-animation ceiling', () => {
    expect(PROGRESS_FILL_ANIMATION_DURATION_MS).toBeLessThanOrEqual(
      MAX_SHORT_ANIMATION_DURATION_MS,
    );
  });

  it('starts at 0 and eases to the target', async () => {
    const { result } = await renderHook(() => useAnimatedProgress(0.75, false));

    expect(valueOf(result.current)).toBe(0);
    await act(() => {
      jest.advanceTimersByTime(PROGRESS_FILL_ANIMATION_DURATION_MS + 50);
    });
    expect(valueOf(result.current)).toBeCloseTo(0.75);
  });

  it('animates toward a new target when it changes', async () => {
    const { result, rerender } = await renderHook(
      ({ target }: { target: number }) => useAnimatedProgress(target, false),
      { initialProps: { target: 0.3 } },
    );
    await act(() => {
      jest.advanceTimersByTime(PROGRESS_FILL_ANIMATION_DURATION_MS + 50);
    });

    await rerender({ target: 0.9 });
    await act(() => {
      jest.advanceTimersByTime(PROGRESS_FILL_ANIMATION_DURATION_MS + 50);
    });

    expect(valueOf(result.current)).toBeCloseTo(0.9);
  });

  it('jumps straight to the target under reduced motion', async () => {
    const { result } = await renderHook(() => useAnimatedProgress(0.6, true));

    expect(valueOf(result.current)).toBe(0.6);
  });
});
