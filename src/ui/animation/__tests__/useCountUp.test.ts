import { act, renderHook } from '@testing-library/react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import {
  COUNT_UP_ANIMATION_DURATION_MS,
  splitStatValue,
  useCountUpText,
} from '../useCountUp';

describe('splitStatValue', () => {
  it('splits a bare number', () => {
    expect(splitStatValue('12')).toEqual({ prefix: '', target: 12, suffix: '' });
  });

  it('splits a percentage', () => {
    expect(splitStatValue('85%')).toEqual({ prefix: '', target: 85, suffix: '%' });
  });

  it('splits a number with prefix and suffix text', () => {
    expect(splitStatValue('~3 Tage')).toEqual({ prefix: '~', target: 3, suffix: ' Tage' });
  });

  it('takes only the first number, leaving the rest as suffix', () => {
    expect(splitStatValue('3 von 5')).toEqual({ prefix: '', target: 3, suffix: ' von 5' });
  });

  it('returns null for a string without a number', () => {
    expect(splitStatValue('–')).toBeNull();
  });
});

describe('useCountUpText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays within the short-animation ceiling', () => {
    expect(COUNT_UP_ANIMATION_DURATION_MS).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('starts at 0 (keeping the decoration) and reaches the full value', async () => {
    const { result } = await renderHook(() => useCountUpText('85%', false));

    expect(result.current).toBe('0%');
    await act(() => {
      jest.advanceTimersByTime(COUNT_UP_ANIMATION_DURATION_MS + 100);
    });
    expect(result.current).toBe('85%');
  });

  it('counts on from the shown number when the value changes', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useCountUpText(value, false),
      { initialProps: { value: '10' } },
    );
    await act(() => {
      jest.advanceTimersByTime(COUNT_UP_ANIMATION_DURATION_MS + 100);
    });
    expect(result.current).toBe('10');

    await rerender({ value: '20' });
    await act(() => {
      jest.advanceTimersByTime(COUNT_UP_ANIMATION_DURATION_MS + 100);
    });
    expect(result.current).toBe('20');
  });

  it('renders a value without a number as-is', async () => {
    const { result } = await renderHook(() => useCountUpText('–', false));

    expect(result.current).toBe('–');
  });

  it('shows the final value immediately under reduced motion', async () => {
    const { result } = await renderHook(() => useCountUpText('85%', true));

    expect(result.current).toBe('85%');
  });
});
