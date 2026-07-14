import { Animated } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { RewardToast } from '../RewardToast';

describe('RewardToast', () => {
  it('renders nothing when there is no message', async () => {
    await render(<RewardToast message={null} opacity={new Animated.Value(0)} testID="reward-toast" />);

    expect(screen.queryByTestId('reward-toast')).toBeNull();
  });

  it('renders the reward text when a message is present', async () => {
    await render(
      <RewardToast message="Danach ein Kaffee" opacity={new Animated.Value(1)} testID="reward-toast" />,
    );

    expect(screen.getByTestId('reward-toast')).toBeTruthy();
    expect(screen.getByTestId('reward-toast-text').props.children).toBe('Danach ein Kaffee');
  });
});
