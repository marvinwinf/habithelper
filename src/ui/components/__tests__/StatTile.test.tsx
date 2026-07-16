import { act, render, screen } from '@testing-library/react-native';

import { COUNT_UP_ANIMATION_DURATION_MS } from '../../animation/useCountUp';
import { StatTile } from '../StatTile';

describe('StatTile', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts the value up from 0 and renders the label', async () => {
    await render(<StatTile value="85%" label="Erledigungsquote" testID="tile" />);

    // The number counts up (docs/DESIGN_SYSTEM.md's Motion section), so the
    // tile starts at 0 with the decoration intact…
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('Erledigungsquote')).toBeTruthy();

    // …and settles at the full value.
    await act(() => {
      jest.advanceTimersByTime(COUNT_UP_ANIMATION_DURATION_MS + 100);
    });
    expect(screen.getByText('85%')).toBeTruthy();
  });
});
