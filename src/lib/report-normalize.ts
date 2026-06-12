import type { DiagnosisAssetPick, InspirationReport, MaterialDiagnosis } from "./types";

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numberValue)));
}

export function toTextArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }
  const text = toText(value);
  return text ? [text] : fallback;
}

function toPickArray(value: unknown, fallback: DiagnosisAssetPick[] = []) {
  if (!Array.isArray(value)) {
    const text = toText(value);
    return text ? [{ assetName: "未指定素材", reason: text }] : fallback;
  }

  const picks = value
    .map((item) => {
      if (typeof item === "string") return { assetName: "未指定素材", reason: item };
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      return {
        assetName: toText(record.assetName ?? record.name, "未指定素材"),
        reason: toText(record.reason ?? record.insight ?? record.note, "等待进一步判断。"),
      };
    })
    .filter((item): item is DiagnosisAssetPick => Boolean(item?.reason));

  return picks.length ? picks : fallback;
}

function diagnosisFallback(value: unknown): MaterialDiagnosis {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    storyPotentialScore: toNumber(record.storyPotentialScore, 64),
    editingDifficulty: toText(record.editingDifficulty, "中等") as MaterialDiagnosis["editingDifficulty"],
    verdict: toText(record.verdict, "这批素材可以先做一条短而明确的故事片。"),
    bestOpeningAssets: [],
    mustUseAssets: [],
    optionalAssets: [],
    missingShots: ["重新生成灵感包后，会得到更完整的素材体检报告。"],
    recommendedRouteTitle: toText(record.recommendedRouteTitle, "先剪一条稳妥短片"),
    whyThisRoute: toText(record.whyThisRoute, "建议先完成一版粗剪，再根据反馈优化节奏。"),
  };
}

export function normalizeDiagnosis(value: unknown, fallback: MaterialDiagnosis): MaterialDiagnosis {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    storyPotentialScore: toNumber(record.storyPotentialScore, fallback.storyPotentialScore),
    editingDifficulty: toText(record.editingDifficulty, fallback.editingDifficulty) as MaterialDiagnosis["editingDifficulty"],
    verdict: toText(record.verdict, fallback.verdict),
    bestOpeningAssets: toPickArray(record.bestOpeningAssets, fallback.bestOpeningAssets),
    mustUseAssets: toPickArray(record.mustUseAssets, fallback.mustUseAssets),
    optionalAssets: toPickArray(record.optionalAssets, fallback.optionalAssets),
    missingShots: toTextArray(record.missingShots, fallback.missingShots),
    recommendedRouteTitle: toText(record.recommendedRouteTitle, fallback.recommendedRouteTitle),
    whyThisRoute: toText(record.whyThisRoute, fallback.whyThisRoute),
  };
}

export function normalizeInspirationReport(report: InspirationReport): InspirationReport {
  return {
    ...report,
    diagnosis: normalizeDiagnosis(report.diagnosis, diagnosisFallback(report.diagnosis)),
    materialMap: Array.isArray(report.materialMap) ? report.materialMap : [],
    hookBank: toTextArray(report.hookBank),
    titleBank: toTextArray(report.titleBank),
    styleRecipes: Array.isArray(report.styleRecipes) ? report.styleRecipes : [],
    audioGuide: {
      ...report.audioGuide,
      soundHooks: toTextArray(report.audioGuide?.soundHooks),
      beatPlan: toTextArray(report.audioGuide?.beatPlan),
    },
    captionGuide: {
      ...report.captionGuide,
      openingLines: toTextArray(report.captionGuide?.openingLines),
      transitionLines: toTextArray(report.captionGuide?.transitionLines),
      endingLines: toTextArray(report.captionGuide?.endingLines),
      rules: toTextArray(report.captionGuide?.rules),
    },
    visualGuide: {
      ...report.visualGuide,
      coverIdeas: toTextArray(report.visualGuide?.coverIdeas),
      effectIdeas: toTextArray(report.visualGuide?.effectIdeas),
    },
    blindSpots: toTextArray(report.blindSpots),
    remixPrompts: toTextArray(report.remixPrompts),
    nextActions: toTextArray(report.nextActions),
  };
}
