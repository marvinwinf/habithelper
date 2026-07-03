import { render, screen } from '@testing-library/react-native';

import TasksScreen from '../tasks';

test('renders without throwing', async () => {
  await render(<TasksScreen />);
  expect(screen.getByText('Aufgaben')).toBeTruthy();
});
