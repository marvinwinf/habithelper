import { growthStageForStreak, type GrowthStage } from '../growthStage';
import { STREAK_MILESTONES } from '../milestones';

describe('growthStageForStreak', () => {
  it.each<[number, GrowthStage]>([
    [0, 'seed'],
    [1, 'sprout'],
    [6, 'sprout'],
    [7, 'leaf'],
    [20, 'leaf'],
    [21, 'bud'],
    [65, 'bud'],
    [66, 'bloom'],
    [99, 'bloom'],
    [100, 'rose'],
    [1000, 'rose'],
  ])('streak %i is a %s', (streak, stage) => {
    expect(growthStageForStreak(streak).stage).toBe(stage);
  });

  it('only changes stage on a milestone completion', () => {
    for (let streak = 1; streak <= 400; streak++) {
      const changed =
        growthStageForStreak(streak).stage !== growthStageForStreak(streak - 1).stage;
      if (changed && streak > 1) {
        expect(STREAK_MILESTONES).toContain(streak);
      }
    }
  });

  it('gives every stage a spoken label', () => {
    for (const streak of [0, 1, 7, 21, 66, 100]) {
      expect(growthStageForStreak(streak).label.length).toBeGreaterThan(0);
    }
  });
});
