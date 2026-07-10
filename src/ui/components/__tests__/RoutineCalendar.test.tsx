import { render, screen } from '@testing-library/react-native';

import { RoutineCalendar, type CalendarDay } from '../RoutineCalendar';
import { colors } from '../../theme';

const noop = () => {};

const flatten = (style: unknown) =>
  Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;

function renderCalendar(days: CalendarDay[], today?: string) {
  return render(
    <RoutineCalendar
      title="Juni 2026"
      days={days}
      onPrevMonth={noop}
      onNextMonth={noop}
      onDayPress={noop}
      today={today}
      testID="calendar"
    />,
  );
}

describe('RoutineCalendar', () => {
  it('renders a status icon for every resolved state, and none for pending days', async () => {
    await renderCalendar([
      { date: '2026-06-01', state: 'completed' },
      { date: '2026-06-02', state: 'exceeded' },
      { date: '2026-06-03', state: 'missed' },
      { date: '2026-06-04', state: 'skipped' },
      { date: '2026-06-05', state: 'moved' },
      { date: '2026-06-06', state: 'joker_protected' },
      { date: '2026-06-07', state: 'paused' },
      { date: '2026-06-08', state: 'pending' },
    ]);

    for (const day of ['01', '02', '03', '04', '05', '06', '07']) {
      expect(screen.getByTestId(`calendar-day-2026-06-${day}-status-icon`)).toBeTruthy();
    }
    expect(screen.queryByTestId('calendar-day-2026-06-08-status-icon')).toBeNull();
  });

  it('renders the legend with every mockup state label', async () => {
    await renderCalendar([]);

    expect(screen.getByTestId('calendar-legend')).toBeTruthy();
    for (const label of ['Erledigt', 'Verpasst', 'Übersprungen', 'Joker', 'Pausiert', 'Verschoben']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('renders the exceeded day number in the on-accent stone for contrast on the gold cell (T082)', async () => {
    await renderCalendar([
      { date: '2026-06-01', state: 'completed' },
      { date: '2026-06-02', state: 'exceeded' },
    ]);

    // Charcoal-on-gold measured only 3.55:1; the exceeded number switches to
    // the on-accent stone to clear AA for small text.
    const exceededNumber = flatten(screen.getByText('2').props.style);
    expect(exceededNumber.color).toBe(colors.textOnAccent);

    const normalNumber = flatten(screen.getByText('1').props.style);
    expect(normalNumber.color).toBe(colors.textPrimary);
  });

  it('highlights today with a ring', async () => {
    await renderCalendar(
      [
        { date: '2026-06-01', state: 'pending' },
        { date: '2026-06-02', state: 'pending' },
      ],
      '2026-06-02',
    );

    const todayStyle = flatten(screen.getByTestId('calendar-day-2026-06-02-pending').props.style);
    const otherStyle = flatten(screen.getByTestId('calendar-day-2026-06-01-pending').props.style);

    expect(todayStyle.borderWidth).toBe(2);
    expect(otherStyle.borderWidth).toBeUndefined();
  });
});
