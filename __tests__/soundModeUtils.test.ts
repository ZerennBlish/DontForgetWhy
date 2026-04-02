import {
  cycleSoundMode,
  soundModeToSoundId,
  soundIdToSoundMode,
  getSoundModeIcon,
  getSoundModeLabel,
} from '../src/utils/soundModeUtils';

describe('cycleSoundMode', () => {
  it('cycles sound → vibrate', () => {
    expect(cycleSoundMode('sound')).toBe('vibrate');
  });

  it('cycles vibrate → silent', () => {
    expect(cycleSoundMode('vibrate')).toBe('silent');
  });

  it('cycles silent → sound', () => {
    expect(cycleSoundMode('silent')).toBe('sound');
  });
});

describe('soundModeToSoundId', () => {
  it('maps sound to undefined', () => {
    expect(soundModeToSoundId('sound')).toBeUndefined();
  });

  it('maps vibrate to silent', () => {
    expect(soundModeToSoundId('vibrate')).toBe('silent');
  });

  it('maps silent to true_silent', () => {
    expect(soundModeToSoundId('silent')).toBe('true_silent');
  });
});

describe('soundIdToSoundMode', () => {
  it('maps undefined to sound', () => {
    expect(soundIdToSoundMode(undefined)).toBe('sound');
  });

  it('maps silent to vibrate', () => {
    expect(soundIdToSoundMode('silent')).toBe('vibrate');
  });

  it('maps true_silent to silent', () => {
    expect(soundIdToSoundMode('true_silent')).toBe('silent');
  });

  it('maps unknown soundId to sound', () => {
    expect(soundIdToSoundMode('some_custom_sound')).toBe('sound');
  });
});

describe('getSoundModeIcon', () => {
  it('returns bell for sound', () => {
    expect(getSoundModeIcon('sound')).toBe('\u{1F514}');
  });

  it('returns vibrate icon for vibrate', () => {
    expect(getSoundModeIcon('vibrate')).toBe('\u{1F4F3}');
  });

  it('returns mute icon for silent', () => {
    expect(getSoundModeIcon('silent')).toBe('\u{1F507}');
  });
});

describe('getSoundModeLabel', () => {
  it('returns Sound for sound', () => {
    expect(getSoundModeLabel('sound')).toBe('Sound');
  });

  it('returns Vibrate for vibrate', () => {
    expect(getSoundModeLabel('vibrate')).toBe('Vibrate');
  });

  it('returns Silent for silent', () => {
    expect(getSoundModeLabel('silent')).toBe('Silent');
  });
});
