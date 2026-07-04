import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title and message', async () => {
    await render(
      <EmptyState title="Noch keine Routinen" message="Lege deine erste Routine an." />
    );

    expect(screen.getByText('Noch keine Routinen')).toBeTruthy();
    expect(screen.getByText('Lege deine erste Routine an.')).toBeTruthy();
  });

  it('renders an optional icon', async () => {
    await render(
      <EmptyState
        icon={<Text>icon-placeholder</Text>}
        title="Noch keine Aufgaben"
        message="Erstelle deine erste Aufgabe."
      />
    );

    expect(screen.getByText('icon-placeholder')).toBeTruthy();
  });

  it('renders without an icon', async () => {
    await render(<EmptyState title="Leer" message="Nichts zu sehen." testID="empty" />);

    expect(screen.getByTestId('empty')).toBeTruthy();
    expect(screen.getByText('Leer')).toBeTruthy();
  });
});
