// Tracks the one irreversible thing that can happen to the database at
// runtime: a successful import closes the singleton connection and swaps the
// file underneath it (src/data/backup/expoImport.ts).
//
// This has to be app-global, not screen-local. Marking it only inside the
// Settings screen left the tab bar — owned by the parent layout — fully
// interactive, so tapping "Heute" ran that screen's queries against a closed
// handle and produced unhandled rejections and empty lists: exactly the
// "looks like total data loss" failure the recovery work exists to remove.
//
// There is no way to rebind the `expoDb` singleton mid-session, so the only
// honest response is to block the whole app until it is restarted.

type Listener = () => void;

let closed = false;
const listeners = new Set<Listener>();

/** Whether the live database connection has been closed by an import swap. */
export function isDatabaseClosed(): boolean {
  return closed;
}

/**
 * Marks the connection closed and notifies the root layout. Idempotent: a
 * second call after the app is already blocked changes nothing.
 */
export function markDatabaseClosed(): void {
  if (closed) {
    return;
  }
  closed = true;
  for (const listener of [...listeners]) {
    listener();
  }
}

export function subscribeToDatabaseClosed(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only reset; the real app never reopens a closed connection. */
export function resetDatabaseLifecycleForTests(): void {
  closed = false;
  listeners.clear();
}
