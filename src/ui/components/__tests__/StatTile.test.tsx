import { render, screen } from '@testing-library/react-native';

import { StatTile } from '../StatTile';

describe('StatTile', () => {
  it('renders the value and label', async () => {
    await render(<StatTile value="85%" label="Erledigungsquote" testID="tile" />);

    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('Erledigungsquote')).toBeTruthy();
  });
});
