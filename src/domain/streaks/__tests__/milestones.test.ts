import {
  STREAK_MILESTONES,
  reachedStreakMilestone,
  streakMilestoneMessage,
} from '../milestones';

describe('reachedStreakMilestone', () => {
  it('fires exactly when a threshold is crossed', () => {
    expect(reachedStreakMilestone(2, 3)).toBe(3);
    expect(reachedStreakMilestone(6, 7)).toBe(7);
    expect(reachedStreakMilestone(65, 66)).toBe(66);
    expect(reachedStreakMilestone(364, 365)).toBe(365);
  });

  it('stays quiet between milestones and past them', () => {
    expect(reachedStreakMilestone(0, 1)).toBeNull();
    expect(reachedStreakMilestone(3, 4)).toBeNull();
    expect(reachedStreakMilestone(7, 8)).toBeNull();
    expect(reachedStreakMilestone(365, 366)).toBeNull();
  });

  it('never fires for an unchanged or shrinking streak', () => {
    expect(reachedStreakMilestone(7, 7)).toBeNull();
    expect(reachedStreakMilestone(10, 0)).toBeNull();
  });

  it('reports the highest threshold when one jump crosses several', () => {
    expect(reachedStreakMilestone(2, 15)).toBe(14);
  });

  it('keeps the milestone list strictly ascending', () => {
    const sorted = [...STREAK_MILESTONES].sort((a, b) => a - b);
    expect(STREAK_MILESTONES).toEqual(sorted);
    expect(new Set(STREAK_MILESTONES).size).toBe(STREAK_MILESTONES.length);
  });
});

describe('streakMilestoneMessage', () => {
  it('names the routine and the count for every milestone', () => {
    for (const milestone of STREAK_MILESTONES.filter((m) => m < 365)) {
      const message = streakMilestoneMessage(milestone, 'Lesen');
      expect(message).toContain('Lesen');
      expect(message).toContain(String(milestone));
    }
  });

  it('marks a full year in its own words', () => {
    expect(streakMilestoneMessage(365, 'Lesen')).toBe(
      'Ein ganzes Jahr Lesen. Das bist jetzt einfach du.',
    );
  });

  it('never uses loss-framed wording', () => {
    for (const milestone of STREAK_MILESTONES) {
      const message = streakMilestoneMessage(milestone, 'Lesen').toLowerCase();
      expect(message).not.toMatch(/verlier|verpass|nicht brechen|reißen/);
    }
  });
});
