import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

// Optional soft completion chime (T099). Off by default and opt-in from the
// Me screen (profile.completion_sound_enabled, migration 0006). A ~0.6 s
// bundled two-tone chime played quietly and mixed with whatever else is
// playing — never interrupting the user's music or podcast. Local asset only;
// no network, no recording, no background playback (see app.json's
// expo-audio plugin options).

export const COMPLETION_CHIME_VOLUME = 0.45;

const CHIME_SOURCE = require('../../../assets/sounds/completion-chime.wav');

let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (player === null) {
    player = createAudioPlayer(CHIME_SOURCE);
    player.volume = COMPLETION_CHIME_VOLUME;
  }
  return player;
}

/**
 * Plays the chime from the start. Sound is a pleasantry, never a
 * requirement: any audio failure is swallowed (logged in dev) so a
 * completion can never fail or throw because of it.
 */
export function playCompletionChime(): void {
  try {
    const chime = getPlayer();
    void chime
      .seekTo(0)
      .then(() => chime.play())
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('Completion chime failed', error);
        }
      });
  } catch (error) {
    if (__DEV__) {
      console.warn('Completion chime failed', error);
    }
  }
}

/** Test-only: drops the cached player so each test starts fresh. */
export function resetCompletionChimeForTests(): void {
  player?.remove();
  player = null;
}
