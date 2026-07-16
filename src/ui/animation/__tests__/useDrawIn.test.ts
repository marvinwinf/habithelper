import { act, renderHook } from '@testing-library/react-native';
import type { Animated } from 'react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import { DRAW_IN_ANIMATION_DURATION_MS, useDrawIn } from '../useDrawIn';

function valueOf(animated: Animated.Value): number {
  return (animated as unknown as { __getValue(): number }).__getValue();
}

describe('useDrawIn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays within the short-animation ceiling', () => {
    expect(DRAW_IN_ANIMATION_DURATION_MS).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('draws from 0 to 1 on mount', async () => {
    const { result } = await renderHook(() => useDrawIn('a', false));

    expect(valueOf(result.current)).toBe(0);
    await act(() => {
      jest.advanceTimersByTime(DRAW_IN_ANIMATION_DURATION_MS + 50);
    });
    expect(valueOf(result.current)).toBe(1);
  });

  it('replays from 0 when the key changes', async () => {
    const { result, rerender } = await renderHook(
      ({ key }: { key: string }) => useDrawIn(key, false),
      { initialProps: { key: 'a' } },
    );
    await act(() => {
      jest.advanceTimersByTime(DRAW_IN_ANIMATION_DURATION_MS + 50);
    });
    expect(valueOf(result.current)).toBe(1);

    await rerender({ key: 'b' });
    expect(valueOf(result.current)).toBe(0);
    await act(() => {
      jest.advanceTimersByTime(DRAW_IN_ANIMATION_DURATION_MS + 50);
    });
    expect(valueOf(result.current)).toBe(1);
  });

  it('does not replay when re-rendered with the same key', async () => {
    const { result, rerender } = await renderHook(
      ({ key }: { key: string }) => useDrawIn(key, false),
      { initialProps: { key: 'a' } },
    );
    await act(() => {
      jest.advanceTimersByTime(DRAW_IN_ANIMATION_DURATION_MS + 50);
    });

    await rerender({ key: 'a' });
    expect(valueOf(result.current)).toBe(1);
  });

  it('renders fully drawn immediately under reduced motion', async () => {
    const { result } = await renderHook(() => useDrawIn('a', true));

    expect(valueOf(result.current)).toBe(1);
  });
});
