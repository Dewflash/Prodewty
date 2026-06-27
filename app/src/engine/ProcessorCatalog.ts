export type ProcessorRecipe = {
  inputId: string;
  inputQuantity: number;
  outputId: string;
  outputQuantity: number;
  processingMinutes: number;
};

export type ProcessorDefinition = {
  processorType: string;
  name: string;
  description: string;
  recipes: ProcessorRecipe[];
};

export const PROCESSOR_CATALOG: Record<string, ProcessorDefinition> = {
  Furnace: {
    processorType: 'Furnace',
    name: 'Furnace',
    description: 'Smelts ores into metal bars.',
    recipes: [
      { inputId: 'rpg_wood', inputQuantity: 5, outputId: 'rpg_coal', outputQuantity: 1, processingMinutes: 30 },
      { inputId: 'rpg_stone', inputQuantity: 10, outputId: 'rpg_iron_bar', outputQuantity: 1, processingMinutes: 60 },
      { inputId: 'rpg_crystal_shards', inputQuantity: 5, outputId: 'rpg_gold_bar', outputQuantity: 1, processingMinutes: 120 },
    ]
  },
  Cheese_press: {
    processorType: 'Cheese_press',
    name: 'Cheese Press',
    description: 'Turns milk into delicious cheese.',
    recipes: [
      { inputId: 'rpg_milk', inputQuantity: 1, outputId: 'rpg_cheese', outputQuantity: 1, processingMinutes: 45 },
    ]
  },
  Loom: {
    processorType: 'Loom',
    name: 'Loom',
    description: 'Spins wool into fine cloth.',
    recipes: [
      { inputId: 'rpg_wool', inputQuantity: 1, outputId: 'rpg_cloth', outputQuantity: 1, processingMinutes: 45 },
    ]
  },
  Mayonnaise_machine: {
    processorType: 'Mayonnaise_machine',
    name: 'Mayonnaise Machine',
    description: 'Turns eggs into mayonnaise.',
    recipes: [
      { inputId: 'rpg_egg', inputQuantity: 1, outputId: 'rpg_mayonnaise', outputQuantity: 1, processingMinutes: 30 },
    ]
  }
};

export function getProcessorDef(processorType: string): ProcessorDefinition | null {
  return PROCESSOR_CATALOG[processorType] || null;
}

export function getRecipeForProcessor(processorType: string, inputId: string): ProcessorRecipe | null {
  const def = getProcessorDef(processorType);
  if (!def) return null;
  return def.recipes.find(r => r.inputId === inputId) || null;
}
