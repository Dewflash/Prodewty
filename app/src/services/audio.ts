/**
 * Audio service — placeholder for future sound effects.
 *
 * To add audio:
 * 1. Drop .mp3 / .wav files into app/assets/audio/
 * 2. Import them here and register in SOUNDS below
 * 3. Install expo-av: npx expo install expo-av
 *    (requires a native rebuild: npx expo run:ios --device)
 * 4. Uncomment and implement the playSound function
 *
 * Planned sounds:
 *  - xp_gain.mp3      — plays on successful log submission
 *  - level_up.mp3     — plays on level up
 *  - badge_unlock.mp3 — plays when a badge is earned
 *  - habit_check.mp3  — subtle tick when checking a habit
 */

// const SOUNDS = {
//   xp_gain:      require('../../assets/audio/xp_gain.mp3'),
//   level_up:     require('../../assets/audio/level_up.mp3'),
//   badge_unlock: require('../../assets/audio/badge_unlock.mp3'),
//   habit_check:  require('../../assets/audio/habit_check.mp3'),
// } as const;

// type SoundKey = keyof typeof SOUNDS;

export async function playSound(_key: string): Promise<void> {
  // No-op until expo-av is installed and sounds are added
}

export async function preloadSounds(): Promise<void> {
  // No-op until expo-av is installed
}
