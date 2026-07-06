// Executable proof for the Wave 2 villager/gate math. Run: npm run test:villager
import {
  friendshipBand,
  pickDialogueLine,
  chooseBestGift,
  giftPreferenceFor,
  giftFriendshipDelta,
  giftLanguageDelta,
  applyFriendshipDelta,
  gateMet,
  gateMessage,
  FRIENDSHIP_LOW_MAX,
  FRIENDSHIP_HIGH_MIN,
  GIFT_FRIENDSHIP,
} from './VillagerLogic';
import { VILLAGER_CATALOG } from './VillagerCatalog';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const brog = VILLAGER_CATALOG.blacksmith;
const elara = VILLAGER_CATALOG.explorer;

console.log('Friendship bands:');
{
  check('0 → low', friendshipBand(0) === 'low');
  check('just below low max → low', friendshipBand(FRIENDSHIP_LOW_MAX - 1) === 'low');
  check('exactly low max → neutral', friendshipBand(FRIENDSHIP_LOW_MAX) === 'neutral');
  check('mid → neutral', friendshipBand(50) === 'neutral');
  check('just below high min → neutral', friendshipBand(FRIENDSHIP_HIGH_MIN - 1) === 'neutral');
  check('exactly high min → high', friendshipBand(FRIENDSHIP_HIGH_MIN) === 'high');
  check('above high min → high', friendshipBand(100) === 'high');
}

console.log('Dialogue pick:');
{
  check('low band uses friendship_low', brog.dialogue.friendship_low.includes(pickDialogueLine(brog, 10, 0)));
  check('high band uses friendship_high', brog.dialogue.friendship_high.includes(pickDialogueLine(brog, 90, 0)));
  const neutralPool = [...brog.dialogue.greeting, ...brog.dialogue.idle];
  check('neutral band uses greeting/idle pool', neutralPool.includes(pickDialogueLine(brog, 50, 0)));
  check('rotation index rotates neutral lines', pickDialogueLine(brog, 50, 0) !== pickDialogueLine(brog, 50, 1) || neutralPool.length === 1);
  check('negative rotation is safe', typeof pickDialogueLine(brog, 50, -3) === 'string');
}

console.log('Gift preference lookup:');
{
  check('Brog loves iron bar', giftPreferenceFor(brog, 'rpg_iron_bar') === 'love');
  check('Brog hates egg', giftPreferenceFor(brog, 'rpg_egg') === 'hate');
  check('unknown item is neutral', giftPreferenceFor(brog, 'rpg_unknown_thing') === 'neutral');
  check('Elara loves crystal shards', giftPreferenceFor(elara, 'rpg_crystal_shards') === 'love');
}

console.log('Gift deltas:');
{
  check('love → +15 friendship', giftFriendshipDelta('love') === 15);
  check('like → +2 friendship', giftFriendshipDelta('like') === 2);
  check('neutral → -5 friendship', giftFriendshipDelta('neutral') === -5);
  check('dislike → -10 friendship', giftFriendshipDelta('dislike') === -10);
  check('hate → -15 friendship (harsher than dislike)', giftFriendshipDelta('hate') === -15 && GIFT_FRIENDSHIP.hate === -15);
  check('love → +2 Language', giftLanguageDelta('love') === 2);
  check('like → +2 Language', giftLanguageDelta('like') === 2);
  check('neutral → 0 Language', giftLanguageDelta('neutral') === 0);
  check('dislike → 0 Language', giftLanguageDelta('dislike') === 0);
}

console.log('Best-gift selection:');
{
  check('picks the loved item over a liked one', chooseBestGift(brog, { rpg_iron_bar: 1, rpg_coal: 5 })?.itemId === 'rpg_iron_bar');
  check('picks liked when no loved held', chooseBestGift(brog, { rpg_coal: 2, rpg_stone: 9 })?.itemId === 'rpg_coal');
  check('falls to neutral when only neutral held', chooseBestGift(brog, { rpg_stone: 3 })?.preference === 'neutral');
  check('never auto-gifts a disliked item', chooseBestGift(brog, { rpg_wood: 5 }) === null);
  check('never auto-gifts a hated item', chooseBestGift(brog, { rpg_egg: 5 }) === null);
  check('empty bag → null', chooseBestGift(brog, {}) === null);
  check('zero-qty entries ignored', chooseBestGift(brog, { rpg_iron_bar: 0 }) === null);
  // Elara: wood is neutral (rank 1) so it IS auto-giftable; stone is hate (skipped).
  check('neutral item auto-giftable when no better held', chooseBestGift(elara, { rpg_wood: 1, rpg_stone: 3 })?.itemId === 'rpg_wood');
  check('deterministic tie-break by itemId on equal rank', chooseBestGift(brog, { rpg_stone: 1, rpg_aaa_neutral: 1 })?.itemId === 'rpg_aaa_neutral');
}

console.log('Friendship clamp:');
{
  check('positive delta adds', applyFriendshipDelta(10, 15) === 25);
  check('negative delta subtracts', applyFriendshipDelta(20, -10) === 10);
  check('never goes below 0', applyFriendshipDelta(5, -30) === 0);
}

console.log('Mastery gates:');
{
  check('level below requirement fails', gateMet(3, 4) === false);
  check('level at requirement passes', gateMet(4, 4) === true);
  check('level above requirement passes', gateMet(9, 4) === true);
  check('message names exact skill + tier', gateMessage('Mining', 'Silver') === 'Needs Mining Silver');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
