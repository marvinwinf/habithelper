import { render, screen } from '@testing-library/react-native';

import SettingsScreen from '../settings';

test('renders without throwing', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('Einstellungen')).toBeTruthy();
});
