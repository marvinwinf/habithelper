// Import orchestration tests (T053/T054, docs/TEST_STRATEGY.md's "automatic
// pre-import safety backup" and "failed import recovery").
//
// These drive runImport with fake ports and a real better-sqlite3 temp
// database, so they assert the *ordering guarantees* directly: that the live
// database is never swapped unless populate and verify both succeeded, and
// that a safety backup exists before any database work begins.

import { createInMemoryFixture, createMigratedFixture } from '../../db/testUtils';
import { runImport, type ImportPorts, type TempDatabase } from '../import';
import { buildBackup, serializeBackup } from '../serialize';
import { seedBackupFixture } from '../testFixtures';
import { BackupFutureSchemaError, BackupParseError } from '../validate';

async function backupText(): Promise<string> {
  const source = await createMigratedFixture();
  await seedBackupFixture(source.driver);
  return serializeBackup(await buildBackup(source.driver, { appVersion: '1.0.0' }));
}

interface Harness {
  ports: ImportPorts;
  calls: string[];
  temp: TempDatabase & { discarded: boolean; closed: boolean };
}

function createHarness(options: {
  text: string | null;
  currentSchemaVersion?: number;
  failSwap?: boolean;
}): Harness {
  const calls: string[] = [];
  const fixture = createInMemoryFixture();

  const temp = {
    driver: fixture.driver,
    discarded: false,
    closed: false,
    close: async () => {
      temp.closed = true;
    },
    discard: async () => {
      temp.discarded = true;
      calls.push('discard');
    },
  };

  const ports: ImportPorts = {
    readSourceText: async () => {
      calls.push('read');
      return options.text;
    },
    currentSchemaVersion: async () => {
      calls.push('schemaVersion');
      return options.currentSchemaVersion ?? 99;
    },
    writeSafetyBackup: async () => {
      calls.push('safetyBackup');
      return '/private/safety-backup.json';
    },
    createTempDatabase: async () => {
      calls.push('createTemp');
      return temp;
    },
    swapIntoPlace: async () => {
      calls.push('swap');
      if (options.failSwap) {
        throw new Error('rename failed');
      }
    },
  };

  return { ports, calls, temp };
}

describe('runImport', () => {
  it('imports a valid backup and reports the safety backup path', async () => {
    const harness = createHarness({ text: await backupText() });

    const result = await runImport(harness.ports);

    expect(result).toMatchObject({
      status: 'imported',
      safetyBackupPath: '/private/safety-backup.json',
    });
  });

  it('writes the safety backup before touching any database', async () => {
    const harness = createHarness({ text: await backupText() });

    await runImport(harness.ports);

    expect(harness.calls.indexOf('safetyBackup')).toBeLessThan(harness.calls.indexOf('createTemp'));
    expect(harness.calls.indexOf('safetyBackup')).toBeLessThan(harness.calls.indexOf('swap'));
  });

  it('swaps only after the temp database is populated and verified', async () => {
    const harness = createHarness({ text: await backupText() });

    await runImport(harness.ports);

    expect(harness.calls).toEqual(['read', 'schemaVersion', 'safetyBackup', 'createTemp', 'swap']);
  });

  it('restores every row into the temp database, not the live one', async () => {
    const text = await backupText();
    const harness = createHarness({ text });

    await runImport(harness.ports);

    const rows = await harness.temp.driver.getAllAsync<{ id: string }>('SELECT id FROM routine');
    expect(rows.map((row) => row.id)).toEqual(['routine-1', 'routine-2']);
  });

  it('reports cancellation without writing a safety backup', async () => {
    const harness = createHarness({ text: null });

    const result = await runImport(harness.ports);

    expect(result).toEqual({ status: 'cancelled' });
    expect(harness.calls).toEqual(['read']);
  });

  it('rejects an unparseable file before any safety backup or database work', async () => {
    const harness = createHarness({ text: 'this is not a backup' });

    await expect(runImport(harness.ports)).rejects.toThrow(BackupParseError);
    expect(harness.calls).toEqual(['read', 'schemaVersion']);
  });

  it('rejects a future-schema backup before any safety backup or database work', async () => {
    const harness = createHarness({ text: await backupText(), currentSchemaVersion: 0 });

    await expect(runImport(harness.ports)).rejects.toThrow(BackupFutureSchemaError);
    expect(harness.calls).toEqual(['read', 'schemaVersion']);
  });

  it('discards the temp database and never swaps when population fails', async () => {
    const broken = JSON.parse(await backupText());
    broken.tables.routine_event.push({
      id: 'orphan',
      routine_id: 'missing-routine',
      occurrence_date: '2026-01-01',
      event_type: 'completed',
      recorded_at: '2026-01-01T00:00:00.000Z',
    });
    const harness = createHarness({ text: JSON.stringify(broken) });

    await expect(runImport(harness.ports)).rejects.toThrow(/FOREIGN KEY/i);

    expect(harness.calls).not.toContain('swap');
    expect(harness.temp.discarded).toBe(true);
  });

  it('discards the temp database when the swap itself fails', async () => {
    const harness = createHarness({ text: await backupText(), failSwap: true });

    await expect(runImport(harness.ports)).rejects.toThrow('rename failed');

    expect(harness.temp.discarded).toBe(true);
  });

  it('still surfaces the original error when cleanup also fails', async () => {
    const harness = createHarness({ text: await backupText(), failSwap: true });
    harness.temp.discard = async () => {
      throw new Error('could not delete temp file');
    };

    // The user needs to know the import failed, not that cleanup failed.
    await expect(runImport(harness.ports)).rejects.toThrow('rename failed');
  });
});
