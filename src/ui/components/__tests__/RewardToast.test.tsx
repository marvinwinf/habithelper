import { Animated } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { RewardToast } from '../RewardToast';

describe('RewardToast', () => {
  it('renders nothing when there is no content', async () => {
    await render(<RewardToast content={null} opacity={new Animated.Value(0)} testID="reward-toast" />);

    expect(screen.queryByTestId('reward-toast')).toBeNull();
  });

  it('renders the reward text with the gift icon', async () => {
    await render(
      <RewardToast
        content={{ kind: 'reward', message: 'Danach ein Kaffee' }}
        opacity={new Animated.Value(1)}
        testID="reward-toast"
      />,
    );

    expect(screen.getByTestId('reward-toast')).toBeTruthy();
    expect(screen.getByTestId('reward-toast-text').props.children).toBe('Danach ein Kaffee');
    expect(screen.getByTestId('reward-toast-icon-reward')).toBeTruthy();
    expect(screen.queryByTestId('reward-toast-detail')).toBeNull();
  });

  it('renders a milestone with the sparkles icon and an optional detail line', async () => {
    await render(
      <RewardToast
        content={{
          kind: 'milestone',
          message: '7× Lesen in Folge. Schön drangeblieben!',
          detail: 'Danach ein Kaffee',
        }}
        opacity={new Animated.Value(1)}
        testID="reward-toast"
      />,
    );

    expect(screen.getByTestId('reward-toast-icon-milestone')).toBeTruthy();
    expect(screen.getByTestId('reward-toast-text').props.children).toBe(
      '7× Lesen in Folge. Schön drangeblieben!',
    );
    expect(screen.getByTestId('reward-toast-detail').props.children).toBe('Danach ein Kaffee');
  });
});
