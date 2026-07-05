import { createDrizzleTestDb } from '../../db/testUtils';
import { appStreakCache } from '../../db/schema';
import {
  APP_STREAK_CACHE_ID,
  buildAppStreakCache,
  deleteAppStreakCache,
  getAppStreakCache,
} from '../appStreakCacheRepository';

describe('appStreakCacheRepository', () => {
  it('returns undefined when the singleton row has never been computed', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    expect(await getAppStreakCache(db)).toBeUndefined();

    sqlite.close();
  });

  it('builds the singleton row with the constant id, without writing it', () => {
    const cache = buildAppStreakCache(3, '2026-07-01', '2026-06-30');

    expect(cache).toMatchObject({
      id: APP_STREAK_CACHE_ID,
      currentStreak: 3,
      lastIncrementedDate: '2026-07-01',
      reconciledThroughDate: '2026-06-30',
    });
    expect(cache.recalculatedAt).toEqual(expect.any(String));
  });

  it('discards the singleton row so it can be re-derived', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    await db.insert(appStreakCache).values(buildAppStreakCache(1, '2026-07-01', '2026-06-30'));

    expect(await getAppStreakCache(db)).toBeDefined();

    await deleteAppStreakCache(db);

    expect(await getAppStreakCache(db)).toBeUndefined();

    sqlite.close();
  });
});
