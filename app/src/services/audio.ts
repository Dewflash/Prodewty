import { Audio } from 'expo-av';
import { getBGMSelection } from '../db/settings';
import { getCustomBGM } from './bgmCustom';

const SOUNDS = {
  logging:                      require('../../assets/sounds/logging.wav'),
  levelup:                      require('../../assets/sounds/levelup.mp3'),
  selfdestruct:                 require('../../assets/sounds/selfdestruct.mp3'),
  died:                         require('../../assets/sounds/died.mp3'),
  faileddungeon:                require('../../assets/sounds/faileddungeon.wav'),
  abandondungeon:               require('../../assets/sounds/abandondungeon.wav'),
  equipingameinventory:         require('../../assets/sounds/equipingameinventory.mp3'),
  consumableuse:                require('../../assets/sounds/consumableuse.mp3'),
  deleteitem:                   require('../../assets/sounds/deleteitem.mp3'),
  purchaseinstore:              require('../../assets/sounds/purchaseinstore.mp3'),
  restoreinrecharge:            require('../../assets/sounds/restoreinrecharge.mp3'),
  statusgameystatsadd:          require('../../assets/sounds/statusgameystatsadd.mp3'),
  globalinventoryopentopribbon: require('../../assets/sounds/globalinventoryopentopribbon.mp3'),
  globalinventoryback:          require('../../assets/sounds/globalinventoryback.mp3'),
  milestonetopribbon:           require('../../assets/sounds/milestonetopribbon.mp3'),
  topribbonbutton:              require('../../assets/sounds/topribbonbutton.mp3'),
  bottomribbonbutton:           require('../../assets/sounds/bottomribbonbutton.mp3'),
  collectcoin:                  require('../../assets/sounds/collectcoin.mp3'),
  gem:                          require('../../assets/sounds/gem.mp3'),
} as const;

export type SoundKey = keyof typeof SOUNDS;

// ─── SFX ────────────────────────────────────────────────────────────────────

const COOLDOWN_MS = 300;
const cooldowns: Partial<Record<SoundKey, number>> = {};

export async function initAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
  } catch {}
}

export function playSound(key: SoundKey): void {
  const now = Date.now();
  if ((cooldowns[key] ?? 0) > now) return;
  cooldowns[key] = now + COOLDOWN_MS;
  void (async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(SOUNDS[key]);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) void sound.unloadAsync();
      });
    } catch {}
  })();
}

// ─── BGM ─────────────────────────────────────────────────────────────────────
// Replace null with require('../../assets/sounds/bgm_<zone>_<n>.mp3') when files are ready.
// Track index 0/1/2 maps to the user's selection in Settings.

const BGM_TRACKS: Record<string, (number | null)[]> = {
  progress:   [null, null, null],
  historylog: [null, null, null],
  recharge:   [null, null, null],
  game:       [null, null, null],
  store:      [null, null, null],
};

let bgmSound: Audio.Sound | null = null;
let currentZone: string | null = null;

export function getCurrentBGMZone(): string | null { return currentZone; }

export async function switchBGM(zone: string): Promise<void> {
  if (currentZone === zone) return;

  const trackIndex = getBGMSelection(zone);
  const customUri = getCustomBGM(zone, trackIndex);
  const file = customUri ? { uri: customUri } : (BGM_TRACKS[zone]?.[trackIndex] ?? null);

  if (bgmSound) {
    try { await bgmSound.stopAsync(); await bgmSound.unloadAsync(); } catch {}
    bgmSound = null;
  }
  currentZone = zone;

  if (file !== null) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        file,
        { isLooping: true, shouldPlay: true },
      );
      bgmSound = sound;
    } catch {}
  }
}

// Call after changing track selection in Settings while the zone is active
export async function reloadCurrentBGM(): Promise<void> {
  if (!currentZone) return;
  const zone = currentZone;
  currentZone = null; // clear so switchBGM doesn't early-return
  await switchBGM(zone);
}

export async function stopBGM(): Promise<void> {
  if (bgmSound) {
    try { await bgmSound.stopAsync(); await bgmSound.unloadAsync(); } catch {}
    bgmSound = null;
  }
  currentZone = null;
}
