export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type EventDefinition = {
  name: string;
  type: 'festival' | 'birthday';
  villagerId?: string;
  description: string;
};

export const CALENDAR: Record<Season, Record<number, EventDefinition>> = {
  spring: {
    4: { name: "Brog's Birthday", type: 'birthday', villagerId: 'brog_blacksmith', description: "It's Brog's birthday! He loves Iron Bars." },
    13: { name: 'Egg Festival', type: 'festival', description: 'Join the town in the square for the annual egg hunt!' },
    24: { name: 'Flower Dance', type: 'festival', description: 'Dance with a partner to celebrate the spring.' },
  },
  summer: {
    11: { name: 'Luau', type: 'festival', description: 'Bring a delicious ingredient for the potluck soup.' },
    28: { name: 'Dance of the Moonlight Jellies', type: 'festival', description: 'Watch the jellyfish migrate at the beach.' },
  },
  autumn: {
    16: { name: 'Stardew Valley Fair', type: 'festival', description: 'Showcase your best items to win star tokens.' },
    27: { name: "Spirit's Eve", type: 'festival', description: 'Navigate the haunted maze.' },
  },
  winter: {
    8: { name: 'Festival of Ice', type: 'festival', description: 'Participate in the ice fishing competition.' },
    18: { name: "Marnie's Birthday", type: 'birthday', villagerId: 'marnie_ranch', description: "It's Marnie's birthday! She loves Milk." },
    25: { name: 'Feast of the Winter Star', type: 'festival', description: 'Exchange gifts with your secret friend.' },
  }
};

export function getEventForDate(season: Season, day: number): EventDefinition | null {
  return CALENDAR[season]?.[day] || null;
}
