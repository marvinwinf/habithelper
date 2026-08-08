import {
  isDatabaseClosed,
  markDatabaseClosed,
  resetDatabaseLifecycleForTests,
  subscribeToDatabaseClosed,
} from '../databaseLifecycle';

describe('databaseLifecycle', () => {
  beforeEach(() => {
    resetDatabaseLifecycleForTests();
  });

  it('starts open', () => {
    expect(isDatabaseClosed()).toBe(false);
  });

  it('reports closed once marked', () => {
    markDatabaseClosed();

    expect(isDatabaseClosed()).toBe(true);
  });

  it('notifies subscribers when the connection closes', () => {
    const listener = jest.fn();
    subscribeToDatabaseClosed(listener);

    markDatabaseClosed();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies each subscriber only once, even if marked repeatedly', () => {
    const listener = jest.fn();
    subscribeToDatabaseClosed(listener);

    markDatabaseClosed();
    markDatabaseClosed();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying an unsubscribed listener', () => {
    const listener = jest.fn();
    subscribeToDatabaseClosed(listener)();

    markDatabaseClosed();

    expect(listener).not.toHaveBeenCalled();
  });

  it('tolerates a listener unsubscribing while being notified', () => {
    const second = jest.fn();
    const unsubscribeFirst = subscribeToDatabaseClosed(() => unsubscribeFirst());
    subscribeToDatabaseClosed(second);

    markDatabaseClosed();

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reports closed to a listener that subscribes later via isDatabaseClosed', () => {
    markDatabaseClosed();

    // A screen mounting after the swap must not miss the event; it reads the
    // current value rather than relying on a notification it was too late for.
    expect(isDatabaseClosed()).toBe(true);
  });
});
