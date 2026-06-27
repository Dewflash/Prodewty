import { getCurrentSeason, Season } from './TimeEngine';
import { getResourceSellPrice } from './RpgObjectCatalog';

// A multiplier for items when sold out of season (e.g., they are rarer)
const OUT_OF_SEASON_MULTIPLIER = 1.5;

// Define which items belong to which season for dynamic pricing
export const SEASONAL_ITEMS: Record<string, Season[]> = {
  'rpg_turnip': ['spring'],
  'rpg_cabbage': ['spring', 'summer'],
  'rpg_pumpkin': ['autumn'],
  // Animal products, gems, ores are generally season-agnostic,
  // so they won't get seasonal multipliers unless explicitly added here.
};

export function getDynamicSellPrice(itemId: string): number {
  const basePrice = getResourceSellPrice(itemId);
  if (basePrice <= 0) return 0;

  const currentSeason = getCurrentSeason();
  const itemSeasons = SEASONAL_ITEMS[itemId];

  if (itemSeasons && !itemSeasons.includes(currentSeason)) {
    // Sell for more if it's currently out of season (demand is higher)
    return Math.floor(basePrice * OUT_OF_SEASON_MULTIPLIER);
  }

  return basePrice;
}
