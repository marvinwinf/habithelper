// The reminder's scheduling rules, exercised against fake ports — the native
// expo-notifications wiring (expoReminders.ts) is deliberately decision-free
// and covered by the manual checklist instead (docs/TEST_STRATEGY.md).

import type { ReminderTime } from '../../../domain/notifications/reminderTime';
import {
  enableDailyReminder,
  syncDailyReminder,
  type ReminderPermission,
  type ReminderPorts,
} from '../reminderScheduler';

interface FakePorts extends ReminderPorts {
  calls: string[];
  scheduled: ReminderTime[];
  permission: ReminderPermission;
}

function createPorts(permission: ReminderPermission = 'granted'): FakePorts {
  const ports: FakePorts = {
    calls: [],
    scheduled: [],
    permission,
    async getPermission() {
      ports.calls.push('getPermission');
      return ports.permission;
    },
    async requestPermission() {
      ports.calls.push('requestPermission');
      // Mirrors Android: the prompt is what turns "undetermined" into a real
      // answer, and this fake says yes.
      ports.permission = 'granted';
      return ports.permission;
    },
    async ensureChannel() {
      ports.calls.push('ensureChannel');
    },
    async scheduleDaily(time) {
      ports.calls.push('scheduleDaily');
      ports.scheduled.push(time);
    },
    async cancelDaily() {
      ports.calls.push('cancelDaily');
      ports.scheduled.length = 0;
    },
  };
  return ports;
}

describe('syncDailyReminder', () => {
  it('schedules the reminder at the stored time', async () => {
    const ports = createPorts();

    const result = await syncDailyReminder(ports, { enabled: true, time: '07:30' });

    expect(result).toEqual({ status: 'scheduled', time: { hour: 7, minute: 30 } });
    expect(ports.scheduled).toEqual([{ hour: 7, minute: 30 }]);
  });

  it('creates the Android channel before scheduling', async () => {
    const ports = createPorts();

    await syncDailyReminder(ports, { enabled: true, time: '07:30' });

    expect(ports.calls.indexOf('ensureChannel')).toBeLessThan(ports.calls.indexOf('scheduleDaily'));
  });

  it('cancels the previous reminder before scheduling, so re-syncing never stacks two', async () => {
    const ports = createPorts();

    await syncDailyReminder(ports, { enabled: true, time: '07:30' });
    await syncDailyReminder(ports, { enabled: true, time: '21:00' });

    expect(ports.scheduled).toEqual([{ hour: 21, minute: 0 }]);
    expect(ports.calls.filter((call) => call === 'cancelDaily')).toHaveLength(2);
  });

  it('cancels and schedules nothing when the reminder is off', async () => {
    const ports = createPorts();

    const result = await syncDailyReminder(ports, { enabled: false, time: '07:30' });

    expect(result).toEqual({ status: 'disabled' });
    expect(ports.calls).toEqual(['cancelDaily']);
    expect(ports.scheduled).toEqual([]);
  });

  it('does not ask for a permission it does not need when the reminder is off', async () => {
    const ports = createPorts('undetermined');

    await syncDailyReminder(ports, { enabled: false, time: '07:30' });

    expect(ports.calls).not.toContain('getPermission');
    expect(ports.calls).not.toContain('requestPermission');
  });

  it('reports a missing permission and schedules nothing', async () => {
    const ports = createPorts('denied');

    const result = await syncDailyReminder(ports, { enabled: true, time: '07:30' });

    expect(result).toEqual({ status: 'permission-missing' });
    expect(ports.scheduled).toEqual([]);
  });

  it('never prompts on its own — the startup sync must not raise a system dialog', async () => {
    const ports = createPorts('undetermined');

    await syncDailyReminder(ports, { enabled: true, time: '07:30' });

    expect(ports.calls).not.toContain('requestPermission');
  });

  it('schedules nothing for an unparseable stored time rather than guessing one', async () => {
    const ports = createPorts();

    const result = await syncDailyReminder(ports, { enabled: true, time: 'irgendwann' });

    expect(result).toEqual({ status: 'disabled' });
    expect(ports.scheduled).toEqual([]);
  });
});

describe('enableDailyReminder', () => {
  it('requests the permission the first time and then schedules', async () => {
    const ports = createPorts('undetermined');

    const result = await enableDailyReminder(ports, '06:45');

    expect(ports.calls).toContain('requestPermission');
    expect(result).toEqual({ status: 'scheduled', time: { hour: 6, minute: 45 } });
  });

  it('does not re-request an already granted permission', async () => {
    const ports = createPorts('granted');

    await enableDailyReminder(ports, '06:45');

    expect(ports.calls).not.toContain('requestPermission');
    expect(ports.scheduled).toEqual([{ hour: 6, minute: 45 }]);
  });

  it('does not re-request a permission the user already refused', async () => {
    // Android will not show the prompt a second time; re-requesting would
    // resolve denied with no UI, leaving the user tapping a dead switch.
    const ports = createPorts('denied');

    const result = await enableDailyReminder(ports, '06:45');

    expect(ports.calls).not.toContain('requestPermission');
    expect(result).toEqual({ status: 'permission-missing' });
  });
});
