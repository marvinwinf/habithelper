import { render, screen } from '@testing-library/react-native';

import RoutinesScreen from '../routines';

test('renders without throwing', async () => {
  await render(<RoutinesScreen />);
  expect(screen.getByText('Routinen')).toBeTruthy();
});
