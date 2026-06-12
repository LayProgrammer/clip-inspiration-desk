import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { buildInspirationPrompt } from "./prompts";
import { normalizeDiagnosis, normalizeInspirationReport } from "./report-normalize";
import type { EditIdea, InspirationReport, MediaAsset, TimelineSegment } from "./types";

type AiIdea = Omit<EditIdea, "id" | "projectId" | "createdAt">;
type AiTimelineItem = {
  assetName: string;
  durationSec: number;
  purpose: string;
  subtitle: string;
  effect: string;
};
type AiReport = Omit<InspirationReport, "id" | "projectId" | "createdAt">;

type AiInspirationPayload = {
  ideas: AiIdea[];
  timeline: AiTimelineItem[];
  report: AiReport;
};

type AiProvider = "openai" | "zhipu";

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error("AI 没有返回可解析的 JSON。");
}

function findAsset(media: MediaAsset[], name: string) {
  return media.find((asset) => asset.originalName === name) ?? media.find((asset) => name.includes(asset.originalName)) ?? media[0];
}

function defaultDiagnosis(media: MediaAsset[], routeTitle: string): InspirationReport["diagnosis"] {
  const opening = media.find((asset) => asset.bestUse === "hook") ?? media[0];
  const mustUse = media.filter((asset) => asset.bestUse !== "unknown").slice(0, 3);
  const optional = media.filter((asset) => asset.bestUse === "unknown" || asset.bestUse === "transition").slice(0, 3);
  const hasEnding = media.some((asset) => asset.bestUse === "ending");
  const hasDetail = media.some((asset) => asset.bestUse === "detail");
  const storyPotentialScore = Math.min(92, Math.max(48, 58 + Math.min(media.length, 8) * 4 + (opening ? 8 : 0) + (hasEnding ? 8 : 0)));

  return {
    storyPotentialScore,
    editingDifficulty: media.length < 4 ? "偏难" : media.length > 12 ? "中等" : "简单",
    verdict: "这批素材可以先做一条短而明确的故事片，重点是选出开头、删掉重复、让结尾有停顿。",
    bestOpeningAssets: opening ? [{ assetName: opening.originalName, reason: opening.directorNote || "这条素材更适合承担第一秒的注意力。" }] : [],
    mustUseAssets: (mustUse.length ? mustUse : media.slice(0, 2)).map((asset) => ({
      assetName: asset.originalName,
      reason: asset.directorNote || "这条素材承担主要信息或情绪。",
    })),
    optionalAssets: (optional.length ? optional : media.slice(-2)).map((asset) => ({
      assetName: asset.originalName,
      reason: "它更适合做过渡或备选，粗剪阶段不用强行保留。",
    })),
    missingShots: [
      hasEnding ? "" : "缺明确结尾镜头，建议用最安静的一段画面做收束。",
      hasDetail ? "" : "缺细节镜头，中段需要靠字幕或现场声补信息。",
    ].filter(Boolean),
    recommendedRouteTitle: routeTitle,
    whyThisRoute: "这条路线最稳，能先把素材组织成一版可执行粗剪，再考虑风格和节奏。",
  };
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function providerConfig(): { provider?: AiProvider; apiKey?: string; model?: string; baseURL?: string } {
  const requested = (process.env.AI_PROVIDER ?? "").toLowerCase();

  if (requested === "zhipu") {
    return {
      provider: "zhipu",
      apiKey: process.env.ZHIPU_API_KEY,
      model: process.env.ZHIPU_MODEL || "glm-4-flash",
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    };
  }

  if (requested === "openai") {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-5.1-mini",
    };
  }

  if (process.env.ZHIPU_API_KEY) {
    return {
      provider: "zhipu",
      apiKey: process.env.ZHIPU_API_KEY,
      model: process.env.ZHIPU_MODEL || "glm-4-flash",
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-5.1-mini",
    };
  }

  return {};
}

function normalizePayload(payload: AiInspirationPayload, projectId: string, media: MediaAsset[]) {
  const now = new Date().toISOString();
  const ideas: EditIdea[] = payload.ideas.slice(0, 3).map((idea, index) => ({
    ...idea,
    materialMatchScore: Math.min(100, Math.max(0, Math.round(idea.materialMatchScore ?? (index === 0 ? 90 : 78)))),
    noviceScore: Math.min(100, Math.max(0, Math.round(idea.noviceScore ?? (index === 0 ? 86 : 72)))),
    publishPotentialScore: Math.min(100, Math.max(0, Math.round(idea.publishPotentialScore ?? (index === 1 ? 88 : 78)))),
    difficultyScore: Math.min(100, Math.max(0, Math.round(idea.difficultyScore ?? (index === 0 ? 36 : 52)))),
    recommendationReason: idea.recommendationReason ?? "这条路线与当前素材结构匹配，适合先做一版粗剪验证。",
    id: randomUUID(),
    projectId,
    createdAt: now,
  }));

  let cursor = 0;
  const timeline: TimelineSegment[] = payload.timeline.slice(0, 6).map((item) => {
    const asset = findAsset(media, item.assetName);
    const duration = Math.max(2, Math.round(item.durationSec || 6));
    const segment: TimelineSegment = {
      id: randomUUID(),
      projectId,
      startSec: cursor,
      endSec: cursor + duration,
      assetId: asset.id,
      purpose: item.purpose,
      subtitle: item.subtitle,
      effect: item.effect,
    };
    cursor += duration;
    return segment;
  });

  const report = payload.report;
  const fallbackDiagnosis = defaultDiagnosis(media, ideas[0]?.title ?? "先剪一条稳妥短片");
  const inspirationReport: InspirationReport = normalizeInspirationReport({
    ...report,
    diagnosis: normalizeDiagnosis(report.diagnosis, fallbackDiagnosis),
    audioGuide: report.audioGuide ?? {
      musicDirection: "根据素材情绪选择音乐，优先保留真实现场声。",
      soundHooks: ["先找笑声、动作声或环境声作为开头记忆点。"],
      beatPlan: ["前 3 秒抓人，中段按信息点切，结尾留余味。"],
    },
    captionGuide: report.captionGuide ?? {
      tone: "像朋友自然讲述，少解释，多补充情绪。",
      openingLines: ["我以为只是随手拍，结果越看越舍不得删。"],
      transitionLines: ["事情就是从这里慢慢变有意思的。"],
      endingLines: ["就到这里，刚刚好。"],
      rules: ["每条字幕尽量 8-16 个字。"],
    },
    visualGuide: report.visualGuide ?? {
      colorDirection: "保留真实色彩，不要过度滤镜。",
      rhythmDirection: "按钩子、展开、余味组织节奏。",
      coverIdeas: ["选择主体明确、情绪清楚的一帧做封面。"],
      effectIdeas: ["少用模板特效，优先自然推近和定格。"],
    },
    id: randomUUID(),
    projectId,
    createdAt: now,
  });

  return { ideas, timeline, inspirationReport };
}

export async function generateAiInspiration(
  projectId: string,
  media: MediaAsset[],
  platform: string,
  mood: string,
  description: string,
) {
  const config = providerConfig();
  if (!config.apiKey || !config.provider || !config.model) return undefined;

  const prompt = buildInspirationPrompt(media, platform, mood, description);

  if (config.provider === "openai") {
    const client = new OpenAI({ apiKey: config.apiKey });
    const response = await client.responses.create({
      model: config.model,
      input: prompt,
    });

    const parsed = JSON.parse(extractJson(response.output_text)) as AiInspirationPayload;
    return { ...normalizePayload(parsed, projectId, media), provider: "openai", model: config.model };
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  const rawText = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJson(rawText)) as AiInspirationPayload;

  return { ...normalizePayload(parsed, projectId, media), provider: "zhipu", model: config.model };
}
