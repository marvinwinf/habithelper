import { renderHook } from '@testing-library/react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from '../constants';
import { useMountAnimation } from '../useMountAnimation';

describe('useMountAnimation', () => {
  it('exposes a duration within the short-animation ceiling', async () => {
    const { result } = await renderHook(() => useMountAnimation());

    expect(result.current.durationMs).toBeGreaterThan(0);
    expect(result.current.durationMs).toBeLessThanOrEqual(MAX_SHORT_ANIMATION_DURATION_MS);
  });

  it('starts progress at 0 so cards begin their entrance from hidden', async () => {
    const { result } = await renderHook(() => useMountAnimation());

    expect(result.current.progress).toHaveProperty('_value', 0);
  });
});
