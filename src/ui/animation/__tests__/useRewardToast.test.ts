import { act, renderHook } from '@testing-library/react-native';

import {
  MILESTONE_TOAST_HOLD_DURATION_MS,
  REWARD_TOAST_FADE_DURATION_MS,
  REWARD_TOAST_HOLD_DURATION_MS,
  useRewardToast,
} from '../useRewardToast';

const FULL_CYCLE_MS =
  REWARD_TOAST_FADE_DURATION_MS + REWARD_TOAST_HOLD_DURATION_MS + REWARD_TOAST_FADE_DURATION_MS;

describe('useRewardToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the reward immediately and hides it after the fade + hold + fade cycle', async () => {
    const { result } = await renderHook(() => useRewardToast(false));

    await act(() => {
      result.current.showReward('Danach ein Kaffee');
    });
    expect(result.current.message).toBe('Danach ein Kaffee');

    await act(() => {
      jest.advanceTimersByTime(FULL_CYCLE_MS);
    });
    expect(result.current.message).toBeNull();
  });

  it('replaces an in-flight toast when a new reward arrives', async () => {
    const { result } = await renderHook(() => useRewardToast(false));

    await act(() => {
      result.current.showReward('Erste Belohnung');
    });
    await act(() => {
      jest.advanceTimersByTime(REWARD_TOAST_FADE_DURATION_MS);
    });

    await act(() => {
      result.current.showReward('Zweite Belohnung');
    });
    expect(result.current.message).toBe('Zweite Belohnung');
  });

  it('holds a milestone longer than a plain reward', async () => {
    const { result } = await renderHook(() => useRewardToast(false));

    await act(() => {
      result.current.showToast({ kind: 'milestone', message: '7× Lesen in Folge', detail: 'Kaffee' });
    });
    expect(result.current.content).toEqual({
      kind: 'milestone',
      message: '7× Lesen in Folge',
      detail: 'Kaffee',
    });

    // A reward's full cycle has elapsed, but the milestone is still showing.
    await act(() => {
      jest.advanceTimersByTime(FULL_CYCLE_MS);
    });
    expect(result.current.message).toBe('7× Lesen in Folge');

    await act(() => {
      jest.advanceTimersByTime(
        MILESTONE_TOAST_HOLD_DURATION_MS - REWARD_TOAST_HOLD_DURATION_MS + REWARD_TOAST_FADE_DURATION_MS,
      );
    });
    expect(result.current.content).toBeNull();
  });

  it('honors reduced motion, still showing then clearing the message', async () => {
    const { result } = await renderHook(() => useRewardToast(true));

    await act(() => {
      result.current.showReward('Danach ein Kaffee');
    });
    expect(result.current.message).toBe('Danach ein Kaffee');

    await act(() => {
      jest.advanceTimersByTime(FULL_CYCLE_MS);
    });
    expect(result.current.message).toBeNull();
  });
});
