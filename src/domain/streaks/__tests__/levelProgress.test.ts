import {
  completionsIntoCurrentLevel,
  remainingCompletionsToNextLevel,
} from '../levelProgress';

describe('level progress', () => {
  it('counts completions inside the current 66-completion segment', () => {
    expect(completionsIntoCurrentLevel(0)).toBe(0);
    expect(completionsIntoCurrentLevel(48)).toBe(48);
    expect(completionsIntoCurrentLevel(66)).toBe(0);
    expect(completionsIntoCurrentLevel(70)).toBe(4);
  });

  it('counts the remaining completions to the next level boundary', () => {
    expect(remainingCompletionsToNextLevel(0)).toBe(66);
    expect(remainingCompletionsToNextLevel(48)).toBe(18);
    expect(remainingCompletionsToNextLevel(65)).toBe(1);
    // Exactly at a boundary a fresh segment starts: 66 more to the next one.
    expect(remainingCompletionsToNextLevel(66)).toBe(66);
  });
});
