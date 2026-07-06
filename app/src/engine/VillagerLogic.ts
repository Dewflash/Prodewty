// Pure, dependency-free villager/gate math (RPG_PROGRESSION_LATTICE.md D4/D5).
// The friendship-band dialogue pick, gift friendship/Language deltas, best-gift
// selection, and the mastery-tier gate predicate all live here so the shipped
// rules are the tested rules — no React / SQLite / asset imports. rpg.tsx passes
// in the villager's persisted friendship + the player's backpack quantities and
// applies the returned deltas; VillagerCatalog supplies the content (dialogue,
// giftPreferences), skills.ts supplies mastery levels.

import type { VillagerDefinition, VillagerGiftPreference } from './VillagerCatalog';

// ─── Friendship bands (D5) ──────────────────────────────────────────────────
// <30 → cold (friendship_low pool); ≥70 → warm (friendship_high pool);
// otherwise the neutral greeting/idle rotation.
export const FRIENDSHIP_LOW_MAX = 30; // strictly below → low band
export const FRIENDSHIP_HIGH_MIN = 70; // at or above → high band

export type FriendshipBand = 'low' | 'neutral' | 'high';

export function friendshipBand(friendship: number): FriendshipBand {
  if (friendship < FRIENDSHIP_LOW_MAX) return 'low';
  if (friendship >= FRIENDSHIP_HIGH_MIN) return 'high';
  return 'neutral';
}

// Deterministic dialogue pick for a band. The neutral band rotates through the
// greeting + idle pools by a caller-supplied rotation index (e.g. chat count),
// so repeat same-day chats surface different lines without RNG. Empty pools
// fall back to the greeting pool, then to a safe default.
export function pickDialogueLine(def: VillagerDefinition, friendship: number, rotation: number): string {
  const d = def.dialogue;
  const band = friendshipBand(friendship);
  if (band === 'low' && d.friendship_low.length) {
    return d.friendship_low[Math.abs(rotation) % d.friendship_low.length];
  }
  if (band === 'high' && d.friendship_high.length) {
    return d.friendship_high[Math.abs(rotation) % d.friendship_high.length];
  }
  const rotationPool = [...d.greeting, ...d.idle];
  if (rotationPool.length) return rotationPool[Math.abs(rotation) % rotationPool.length];
  if (d.greeting.length) return d.greeting[0];
  return '...';
}

// ─── Daily first-chat rewards (D5) ──────────────────────────────────────────
export const CHAT_FRIENDSHIP_GAIN = 5;
export const CHAT_LANGUAGE_POINTS = 3;

// ─── Gifting (D5) ───────────────────────────────────────────────────────────
// Friendship deltas by preference. Items not in giftPreferences are 'neutral'.
export const GIFT_FRIENDSHIP: Record<VillagerGiftPreference, number> = {
  love: 15,
  like: 2,
  neutral: -5,
  dislike: -10,
  hate: -15,
};

// Language points granted by a gift — only love/like give Language (2).
export const GIFT_LANGUAGE: Record<VillagerGiftPreference, number> = {
  love: 2,
  like: 2,
  neutral: 0,
  dislike: 0,
  hate: 0,
};

export const GIFTS_PER_VILLAGER_PER_DAY = 1;

export function giftPreferenceFor(def: VillagerDefinition, itemId: string): VillagerGiftPreference {
  return def.giftPreferences[itemId] ?? 'neutral';
}

export function giftFriendshipDelta(pref: VillagerGiftPreference): number {
  return GIFT_FRIENDSHIP[pref];
}

export function giftLanguageDelta(pref: VillagerGiftPreference): number {
  return GIFT_LANGUAGE[pref];
}

// Rank order used to pick the "best" gift the player is holding (higher = the
// villager would prefer to receive it). Never auto-gifts something the villager
// dislikes/hates — only love/like/neutral are auto-offered.
const PREFERENCE_RANK: Record<VillagerGiftPreference, number> = {
  love: 3, like: 2, neutral: 1, dislike: -1, hate: -2,
};

// From the player's backpack (itemId → quantity>0), choose the single item the
// given villager would most like to receive. Returns null when the player holds
// nothing worth gifting (only dislike/hate materials, or an empty bag). Pure so
// the selection is unit-testable; rpg.tsx supplies the live quantities.
export function chooseBestGift(
  def: VillagerDefinition,
  backpack: Record<string, number>,
): { itemId: string; preference: VillagerGiftPreference } | null {
  let best: { itemId: string; preference: VillagerGiftPreference; rank: number } | null = null;
  for (const [itemId, qty] of Object.entries(backpack)) {
    if (qty <= 0) continue;
    const pref = giftPreferenceFor(def, itemId);
    const rank = PREFERENCE_RANK[pref];
    if (rank <= 0) continue; // never auto-gift a dislike/hate item
    if (!best || rank > best.rank || (rank === best.rank && itemId < best.itemId)) {
      best = { itemId, preference: pref, rank };
    }
  }
  return best ? { itemId: best.itemId, preference: best.preference } : null;
}

// Clamp helper so friendship can never go negative (a floor of 0) — the DB
// column defaults to 0 and the bands assume a non-negative scale.
export function applyFriendshipDelta(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

// ─── Mastery tier gates (D4) ────────────────────────────────────────────────
// A gate is crossable when the player's mastery LEVEL meets requiredLevel.
// Kept here (rather than skills.ts) so the message + predicate travel together
// and can be tested without a DB: caller passes the current level in.
export type MasteryGate = { skill: string; requiredLevel: number; tierName: string };

export function gateMet(currentLevel: number, requiredLevel: number): boolean {
  return currentLevel >= requiredLevel;
}

// Human-readable requirement for a blocked action, e.g. "Needs Mining Silver".
// Callers pass the display skill name (capitalised) + the tier name from
// getMasteryTier(requiredLevel) so the exact path is always shown to the player.
export function gateMessage(skillDisplay: string, tierName: string): string {
  return `Needs ${skillDisplay} ${tierName}`;
}
