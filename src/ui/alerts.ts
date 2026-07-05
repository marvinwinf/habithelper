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
