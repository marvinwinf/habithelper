import { act, renderHook } from '@testing-library/react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import { useStreakBurst } from '../useStreakBurst';

describe('useStreakBurst', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes a duration within the short-animation ceiling', async () => {
    const { result } = await renderHook(() => useStreakBurst());

    expect(result.current.durationMs).toBeGreaterThan(0);
    expect(result.current.durationMs).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('calls onDone exactly once the animation completes', async () => {
    const { result } = await renderHook(() => useStreakBurst());
    const onDone = jest.fn();

    await act(() => {
      result.current.start(onDone);
    });
    await act(() => {
      jest.advanceTimersByTime(result.current.durationMs);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
