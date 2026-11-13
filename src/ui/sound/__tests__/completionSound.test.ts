import { createAudioPlayer } from 'expo-audio';

import {
  COMPLETION_CHIME_VOLUME,
  playCompletionChime,
  resetCompletionChimeForTests,
} from '../completionSound';

describe('playCompletionChime', () => {
  beforeEach(() => {
    resetCompletionChimeForTests();
    jest.clearAllMocks();
  });

  it('creates one quiet player lazily and replays it from the start', async () => {
    playCompletionChime();
    playCompletionChime();
    await Promise.resolve();
    await Promise.resolve();

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(player.volume).toBe(COMPLETION_CHIME_VOLUME);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('never throws when the audio module fails', () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no audio');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => playCompletionChime()).not.toThrow();

    warn.mockRestore();
  });
});
