import { levelName } from '../levelName';

describe('levelName', () => {
  it('maps each level rank to its visible name', () => {
    expect(levelName(0)).toBe('Im Aufbau');
    expect(levelName(1)).toBe('Stabil');
    expect(levelName(2)).toBe('Gefestigt');
    expect(levelName(3)).toBe('Meister');
  });

  it('shows "Meister" for any rank beyond the last named level', () => {
    expect(levelName(4)).toBe('Meister');
    expect(levelName(10)).toBe('Meister');
  });

  it('clamps a negative rank to the first level', () => {
    expect(levelName(-1)).toBe('Im Aufbau');
  });
});
