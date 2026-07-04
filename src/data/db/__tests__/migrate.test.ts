import { createMigratedFixture, getTableNames } from '../testUtils';
import { EXPECTED_TABLE_NAMES } from '../expectedTables';

/**
 * T010: exercises the shared migration test harness (testUtils.ts) itself —
 * seeds a completely empty database (pre-0000_init, Drizzle Kit's own
 * zero-indexed naming for the initial migration) and runs migrations up to
 * current, asserting every entity table exists afterward.
 */
describe('migration test harness', () => {
  it('seeds an empty database and migrates it to current, creating every entity table', async () => {
    const fixture = await createMigratedFixture();

    expect(getTableNames(fixture)).toEqual(EXPECTED_TABLE_NAMES);

    fixture.sqlite.close();
  });
});
