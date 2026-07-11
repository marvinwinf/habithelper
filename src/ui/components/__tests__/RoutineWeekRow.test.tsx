import { render, screen } from '@testing-library/react-native';

import { RoutineWeekRow } from '../RoutineWeekRow';

describe('RoutineWeekRow', () => {
  it('renders the routine name and one dot per day', async () => {
    await render(
      <RoutineWeekRow
        routineName="Laufen"
        days={['completed', 'missed', 'not_due', 'not_due', 'not_due', 'not_due', 'not_due']}
        testID="row"
      />,
    );

    expect(screen.getByText('Laufen')).toBeTruthy();
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`row-dot-${i}`)).toBeTruthy();
    }
  });
});
