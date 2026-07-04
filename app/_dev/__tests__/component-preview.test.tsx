import { render, screen } from '@testing-library/react-native';

import ComponentPreviewScreen from '../component-preview';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders every Phase 2 primitive without throwing', async () => {
  await render(<ComponentPreviewScreen />);

  expect(screen.getByTestId('component-preview-screen')).toBeTruthy();
  expect(screen.getByText('Card content')).toBeTruthy();
  expect(screen.getByText('Primary')).toBeTruthy();
  expect(screen.getByText('Secondary')).toBeTruthy();
  expect(screen.getByText('Destructive')).toBeTruthy();
  expect(screen.getByText('Disabled')).toBeTruthy();
  expect(screen.getByText('mint')).toBeTruthy();
  expect(screen.getByText('lavender')).toBeTruthy();
  expect(screen.getByText('Sheet öffnen')).toBeTruthy();
  expect(screen.getByText('Noch keine Routinen')).toBeTruthy();
});
