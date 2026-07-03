import { render, screen } from '@testing-library/react-native';

import TodayScreen from '../today';

test('renders without throwing', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('Heute')).toBeTruthy();
});
