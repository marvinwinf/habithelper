// Keeps routine state correct across a calendar day boundary while the app
// stays alive in the background.
//
// Reconciliation only ran once, from the root layout's mount effect
// (docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation names app startup
// as its trigger). Android keeps app processes alive for days, so "app
// startup" and "a new day began" are not the same event: open the app in the
// evening, background it, reopen it the next morning, and the process never
// remounted — yesterday's missed occurrences were never materialized, no
// joker was consumed, and the app-streak cache still described yesterday.
// The Today screen meanwhile picks up the new date on its next focus, so the
// day flips over while the streak numbers beside it stay stale.
//
// This module holds the pure logic; appDayRollover.ts wires it to AppState
// and the real database (which cannot be imported under Jest).

export interface DayRolloverDeps {
  /** Current local calendar day, `YYYY-MM-DD`. */
  getToday: () => string;
  /** Reconciles every routine and the app streak through the given day. */
  reconcile: (today: string) => Promise<void>;
  /** Subscribes to app-foregrounded events; returns an unsubscribe function. */
  onAppResume: (handler: () => void) => () => void;
}

export interface DayRolloverWatcher {
  /** Begins watching; returns a function that stops watching. */
  start: () => () => void;
  /** Registers a listener called after a rollover reconciliation succeeds. */
  subscribe: (listener: () => void) => () => void;
  /** Runs the check immediately. Resolves true if a reconciliation happened. */
  check: () => Promise<boolean>;
}

export function createDayRolloverWatcher(deps: DayRolloverDeps): DayRolloverWatcher {
  // Seeded with today because the watcher is only started after startup
  // reconciliation has already run for the current day — so the first resume
  // on the same day correctly does nothing.
  let reconciledFor = deps.getToday();
  const listeners = new Set<() => void>();
  let inFlight: Promise<boolean> | null = null;

  async function run(today: string): Promise<boolean> {
    await deps.reconcile(today);
    reconciledFor = today;
    // Snapshot before notifying: a listener that unsubscribes during the
    // callback must not perturb the iteration.
    for (const listener of [...listeners]) {
      listener();
    }
    return true;
  }

  function check(): Promise<boolean> {
    // Resumes can arrive in bursts (screen on, permission dialog dismissed);
    // reconciliation is a multi-routine write pass and must not overlap
    // itself, so a check already running is reused rather than restarted.
    if (inFlight) {
      return inFlight;
    }
    const today = deps.getToday();
    if (today === reconciledFor) {
      return Promise.resolve(false);
    }
    inFlight = run(today).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    start: () =>
      deps.onAppResume(() => {
        // A failure here must not crash the resume handler; the next resume,
        // or the next cold start, retries.
        void check().catch((error) => {
          console.error('Day-rollover reconciliation failed', error);
        });
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    check,
  };
}
