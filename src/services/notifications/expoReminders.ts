// The real expo-notifications wiring behind `ReminderPorts` (T091). Kept thin
// and free of decisions on purpose: everything worth testing lives in
// reminderScheduler.ts, which this module only supplies with native calls.
// Covered by the manual on-device checklist, like `expoImport.ts`.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '../../ui/theme';
import type { ReminderTime } from '../../domain/notifications/reminderTime';
import {
  DAILY_REMINDER_CONTENT,
  DAILY_REMINDER_IDENTIFIER,
  type ReminderPermission,
  type ReminderPorts,
} from './reminderScheduler';

/**
 * Android requires every notification to belong to a channel; naming it after
 * what it actually is lets the user silence just the reminder in the system
 * settings instead of the whole app.
 */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

function toPermission(status: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted) {
    return 'granted';
  }
  // `canAskAgain` is what separates "never asked" from "the user said no":
  // once Android has shown the prompt and been declined, requesting again is
  // a no-op, so the UI has to send the user to the system settings.
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export const expoReminderPorts: ReminderPorts = {
  async getPermission() {
    return toPermission(await Notifications.getPermissionsAsync());
  },

  async requestPermission() {
    return toPermission(await Notifications.requestPermissionsAsync());
  },

  async ensureChannel() {
    if (Platform.OS !== 'android') {
      return;
    }
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Tägliche Erinnerung',
      description: 'Eine ruhige Erinnerung an deine Routinen.',
      // DEFAULT, not HIGH: a routine reminder is an invitation, not an alarm,
      // so it must not force itself over whatever the user is doing.
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.accent,
    });
  },

  async scheduleDaily(time: ReminderTime) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_IDENTIFIER,
      content: {
        title: DAILY_REMINDER_CONTENT.title,
        body: DAILY_REMINDER_CONTENT.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: REMINDER_CHANNEL_ID,
        hour: time.hour,
        minute: time.minute,
      },
    });
  },

  async cancelDaily() {
    // Cancelling an identifier that is not scheduled is a no-op on Android,
    // which is what makes the sync path safe to run on every app start.
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_IDENTIFIER);
  },
};
