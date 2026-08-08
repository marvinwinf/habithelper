import { createDayRolloverWatcher, type DayRolloverDeps } from '../dayRolloverWatcher';

interface Harness {
  deps: DayRolloverDeps;
  setToday: (day: string) => void;
  resume: () => void;
  reconcile: jest.Mock;
  resolveReconcile: () => void;
}

function createHarness(options: { startDay: string; manualReconcile?: boolean }): Harness {
  let today = options.startDay;
  let handler: (() => void) | undefined;
  let release: (() => void) | undefined;

  const reconcile = jest.fn().mockImplementation(() => {
    if (!options.manualReconcile) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      release = resolve;
    });
  });

  return {
    deps: {
      getToday: () => today,
      reconcile,
      onAppResume: (h) => {
        handler = h;
        return () => {
          handler = undefined;
        };
      },
    },
    setToday: (day) => {
      today = day;
    },
    resume: () => handler?.(),
    reconcile,
    resolveReconcile: () => release?.(),
  };
}

describe('createDayRolloverWatcher', () => {
  it('does nothing when the app resumes on the same day', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);

    await expect(watcher.check()).resolves.toBe(false);
    expect(harness.reconcile).not.toHaveBeenCalled();
  });

  it('reconciles through the new day when the date has changed', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);

    harness.setToday('2026-08-08');

    await expect(watcher.check()).resolves.toBe(true);
    expect(harness.reconcile).toHaveBeenCalledWith('2026-08-08');
  });

  it('reconciles once per day boundary, not once per resume', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);

    harness.setToday('2026-08-08');
    await watcher.check();
    await watcher.check();

    expect(harness.reconcile).toHaveBeenCalledTimes(1);
  });

  it('reconciles again on the following day', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);

    harness.setToday('2026-08-08');
    await watcher.check();
    harness.setToday('2026-08-09');
    await watcher.check();

    expect(harness.reconcile).toHaveBeenCalledTimes(2);
    expect(harness.reconcile).toHaveBeenLastCalledWith('2026-08-09');
  });

  it('does not start a second reconciliation while one is in flight', async () => {
    const harness = createHarness({ startDay: '2026-08-07', manualReconcile: true });
    const watcher = createDayRolloverWatcher(harness.deps);
    harness.setToday('2026-08-08');

    const first = watcher.check();
    const second = watcher.check();
    harness.resolveReconcile();
    await Promise.all([first, second]);

    // Reconciliation is a multi-routine write pass; overlapping runs would
    // race each other's event writes.
    expect(harness.reconcile).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed reconciliation instead of marking the day done', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    harness.reconcile.mockRejectedValueOnce(new Error('db locked'));
    const watcher = createDayRolloverWatcher(harness.deps);
    harness.setToday('2026-08-08');

    await expect(watcher.check()).rejects.toThrow('db locked');
    await expect(watcher.check()).resolves.toBe(true);

    expect(harness.reconcile).toHaveBeenCalledTimes(2);
  });

  it('notifies subscribers after reconciling so screens reload', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    const listener = jest.fn();
    watcher.subscribe(listener);

    harness.setToday('2026-08-08');
    await watcher.check();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify subscribers when nothing rolled over', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    const listener = jest.fn();
    watcher.subscribe(listener);

    await watcher.check();

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying an unsubscribed listener', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    const listener = jest.fn();
    watcher.subscribe(listener)();

    harness.setToday('2026-08-08');
    await watcher.check();

    expect(listener).not.toHaveBeenCalled();
  });

  it('tolerates a listener unsubscribing while being notified', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    const second = jest.fn();
    const unsubscribeFirst = watcher.subscribe(() => unsubscribeFirst());
    watcher.subscribe(second);

    harness.setToday('2026-08-08');
    await watcher.check();

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reconciles when the app is resumed after a day boundary', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    watcher.start();

    harness.setToday('2026-08-08');
    harness.resume();
    await Promise.resolve();

    expect(harness.reconcile).toHaveBeenCalledWith('2026-08-08');
  });

  it('stops watching once stopped', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    const watcher = createDayRolloverWatcher(harness.deps);
    watcher.start()();

    harness.setToday('2026-08-08');
    harness.resume();
    await Promise.resolve();

    expect(harness.reconcile).not.toHaveBeenCalled();
  });

  it('does not let a failed resume check reject into the AppState handler', async () => {
    const harness = createHarness({ startDay: '2026-08-07' });
    harness.reconcile.mockRejectedValue(new Error('db locked'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const watcher = createDayRolloverWatcher(harness.deps);
    watcher.start();

    harness.setToday('2026-08-08');
    expect(() => harness.resume()).not.toThrow();
    // The rejection travels through several microtask hops (reconcile → run →
    // finally → catch), so drain the queue rather than counting ticks.
    await new Promise((resolve) => setImmediate(resolve));

    expect(console.error).toHaveBeenCalled();
    (console.error as jest.Mock).mockRestore();
  });
});
