import { Alert } from 'react-native';

/**
 * Destructive-action confirmation for deleting a routine, shared by the
 * Routines and Today screens so the wording and confirm-before-delete
 * behavior (docs/DESIGN_SYSTEM.md) cannot drift between them.
 */
export function confirmRoutineDeletion(
  routineName: string,
  onConfirm: () => void | Promise<void>,
): void {
  Alert.alert('Routine löschen?', `„${routineName}“ wird gelöscht.`, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Confirmation before importing a backup. Importing replaces *everything* —
 * routines, history, streaks, tasks — so it gets the same explicit
 * destructive-action confirmation as a deletion (docs/DESIGN_SYSTEM.md), and
 * the copy names the automatic safety backup so the user knows there is a way
 * back (docs/DATA_PERSISTENCE.md's Backup and Restore).
 */
export function confirmBackupImport(onConfirm: () => void | Promise<void>): void {
  Alert.alert(
    'Backup importieren?',
    'Alle aktuellen Routinen, Aufgaben und Verläufe werden durch das Backup ersetzt. Vorher wird automatisch eine Sicherungskopie deiner jetzigen Daten angelegt.',
    [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Importieren', style: 'destructive', onPress: onConfirm },
    ],
  );
}

/** Destructive-action confirmation for deleting a task, same wording/behavior contract as routine deletion. */
export function confirmTaskDeletion(taskTitle: string, onConfirm: () => void | Promise<void>): void {
  Alert.alert('Aufgabe löschen?', `„${taskTitle}“ wird gelöscht.`, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}
