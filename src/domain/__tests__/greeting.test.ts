import { getGreeting, timeOfDayForHour } from '../greeting';

describe('timeOfDayForHour', () => {
  it('is morning from midnight up to (but not including) noon', () => {
    expect(timeOfDayForHour(0)).toBe('morning');
    expect(timeOfDayForHour(5)).toBe('morning');
    expect(timeOfDayForHour(11)).toBe('morning');
  });

  it('is afternoon from noon up to (but not including) 18:00', () => {
    expect(timeOfDayForHour(12)).toBe('afternoon');
    expect(timeOfDayForHour(15)).toBe('afternoon');
    expect(timeOfDayForHour(17)).toBe('afternoon');
  });

  it('is evening from 18:00 through the end of the day', () => {
    expect(timeOfDayForHour(18)).toBe('evening');
    expect(timeOfDayForHour(21)).toBe('evening');
    expect(timeOfDayForHour(23)).toBe('evening');
  });
});

describe('getGreeting', () => {
  it('greets with "Guten Morgen" in the morning', () => {
    expect(getGreeting(8, 'Marvin')).toBe('Guten Morgen, Marvin');
  });

  it('greets with "Guten Tag" in the afternoon', () => {
    expect(getGreeting(14, 'Marvin')).toBe('Guten Tag, Marvin');
  });

  it('greets with "Guten Abend" in the evening', () => {
    expect(getGreeting(20, 'Marvin')).toBe('Guten Abend, Marvin');
  });

  it('changes exactly at the morning/afternoon boundary', () => {
    expect(getGreeting(11, 'Marvin')).toBe('Guten Morgen, Marvin');
    expect(getGreeting(12, 'Marvin')).toBe('Guten Tag, Marvin');
  });

  it('changes exactly at the afternoon/evening boundary', () => {
    expect(getGreeting(17, 'Marvin')).toBe('Guten Tag, Marvin');
    expect(getGreeting(18, 'Marvin')).toBe('Guten Abend, Marvin');
  });
});
