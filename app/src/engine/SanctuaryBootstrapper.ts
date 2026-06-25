import {
  getGardenPlots,
  updatePlantGrowth,
  type GardenPlot,
  type GrowthStage,
} from '../db/garden';
import { getCropForSeed, type RpgCropDefinition } from './RpgObjectCatalog';

export type GrowthInfo = {
  crop: RpgCropDefinition | null;
  stage: GrowthStage;
  label: 'Seed' | 'Growing' | 'Mature';
  remainingMinutes: number;
};

function labelForStage(stage: GrowthStage): GrowthInfo['label'] {
  return stage >= 2 ? 'Mature' : stage >= 1 ? 'Growing' : 'Seed';
}

function parseSqlLocalDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPlotGrowthInfo(plot: GardenPlot, now: Date = new Date()): GrowthInfo {
  const crop = getCropForSeed(plot.seed_item_id);
  if (!crop) {
    return {
      crop: null,
      stage: plot.growth_stage,
      label: labelForStage(plot.growth_stage),
      remainingMinutes: 0,
    };
  }

  const plantedAt = parseSqlLocalDate(plot.planted_at);
  if (!plantedAt) {
    const nextThreshold = plot.growth_stage >= 2
      ? crop.stageMinutes[2]
      : crop.stageMinutes[(plot.growth_stage + 1) as GrowthStage];
    return {
      crop,
      stage: plot.growth_stage,
      label: labelForStage(plot.growth_stage),
      remainingMinutes: plot.growth_stage >= 2 ? 0 : nextThreshold,
    };
  }

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - plantedAt.getTime()) / 60000));
  const stage: GrowthStage = elapsedMinutes >= crop.stageMinutes[2]
    ? 2
    : elapsedMinutes >= crop.stageMinutes[1]
      ? 1
      : 0;
  const nextThreshold = stage >= 2 ? crop.stageMinutes[2] : crop.stageMinutes[(stage + 1) as GrowthStage];

  return {
    crop,
    stage,
    label: labelForStage(stage),
    remainingMinutes: stage >= 2 ? 0 : Math.max(0, nextThreshold - elapsedMinutes),
  };
}

export function bootstrapSanctuaryGrowth(now: Date = new Date()): GardenPlot[] {
  const plots = getGardenPlots();
  let changed = false;

  plots.forEach(plot => {
    const growth = getPlotGrowthInfo(plot, now);
    if (growth.stage !== plot.growth_stage) {
      updatePlantGrowth(plot.id, growth.stage);
      changed = true;
    }
  });

  return changed ? getGardenPlots() : plots;
}
