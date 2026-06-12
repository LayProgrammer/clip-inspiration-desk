import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { describeBestUse } from "./media-analysis";
import type { MediaAsset } from "./types";

type VisionProvider = "openai" | "zhipu";

type VisionConfig = {
  provider?: VisionProvider;
  apiKey?: string;
  model?: string;
  baseURL?: string;
};

type VisionPayload = {
  visualSummary?: string;
  visualTags?: string[];
  visualMood?: string;
  visualHook?: string;
  visibleSubjects?: string[];
  sceneType?: string;
  bestUse?: MediaAsset["bestUse"];
  role?: string;
  lensProfile?: string;
  directorNote?: string;
  confidence?: number;
};

type VisionResult =
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string; model?: string }
  | { status: "ready"; model: string; payload: Required<VisionPayload> };

const allowedUses: MediaAsset["bestUse"][] = ["hook", "scene", "detail", "transition", "ending", "unknown"];

function providerConfig(): VisionConfig {
  const requested = (process.env.AI_PROVIDER ?? "").toLowerCase();

  if (requested === "openai" && process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5.1-mini" };
  }

  if (requested === "zhipu" && process.env.ZHIPU_API_KEY) {
    return {
      provider: "zhipu",
      apiKey: process.env.ZHIPU_API_KEY,
      model: process.env.ZHIPU_VISION_MODEL || "glm-4v-flash",
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    };
  }

  if (process.env.ZHIPU_API_KEY) {
    return {
      provider: "zhipu",
      apiKey: process.env.ZHIPU_API_KEY,
      model: process.env.ZHIPU_VISION_MODEL || "glm-4v-flash",
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5.1-mini" };
  }

  return {};
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error("视觉模型没有返回可解析 JSON。");
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.map((item) => textValue(item)).filter(Boolean).slice(0, 8);
  const text = textValue(value);
  return text ? [text] : fallback;
}

function numberValue(value: unknown, fallback = 60) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePayload(value: unknown, asset: MediaAsset): Required<VisionPayload> {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const bestUse = allowedUses.includes(record.bestUse as MediaAsset["bestUse"]) ? (record.bestUse as MediaAsset["bestUse"]) : asset.bestUse;
  const visualSummary = textValue(record.visualSummary, asset.directorNote);

  return {
    visualSummary,
    visualTags: textArray(record.visualTags, asset.tags),
    visualMood: textValue(record.visualMood, "真实生活感"),
    visualHook: textValue(record.visualHook, "从最有动作或情绪变化的一帧切入。"),
    visibleSubjects: textArray(record.visibleSubjects, ["画面主体待确认"]),
    sceneType: textValue(record.sceneType, asset.lensProfile),
    bestUse,
    role: textValue(record.role, describeBestUse(bestUse)),
    lensProfile: textValue(record.lensProfile, asset.lensProfile),
    directorNote: textValue(record.directorNote, visualSummary),
    confidence: numberValue(record.confidence, 60),
  };
}

async function imageDataUrl(publicPath: string) {
  const relative = publicPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), "public", relative);
  const bytes = await readFile(absolutePath);
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

export async function analyzeAssetKeyframes(asset: MediaAsset): Promise<VisionResult> {
  const config = providerConfig();
  if (!config.apiKey || !config.provider || !config.model) {
    return { status: "skipped", reason: "没有配置视觉模型 API key。" };
  }

  const frames = (asset.keyframePaths ?? []).slice(0, 2);
  if (frames.length === 0) return { status: "skipped", reason: "没有可分析的关键帧。" };

  try {
    const imageParts = await Promise.all(frames.map(async (frame) => ({
      type: "image_url",
      image_url: { url: await imageDataUrl(frame) },
    })));

    const prompt = [
      "你是短视频素材导演。请只根据这些关键帧判断这个视频片段的画面内容和剪辑用途。",
      "不要假装知道关键帧之外的内容。不要写剪辑软件操作步骤。",
      "输出严格 JSON，不要 Markdown。",
      "",
      "JSON 字段：",
      "{",
      '  "visualSummary": string,',
      '  "visualTags": string[],',
      '  "visualMood": string,',
      '  "visualHook": string,',
      '  "visibleSubjects": string[],',
      '  "sceneType": string,',
      '  "bestUse": "hook" | "scene" | "detail" | "transition" | "ending" | "unknown",',
      '  "role": string,',
      '  "lensProfile": string,',
      '  "directorNote": string,',
      '  "confidence": number',
      "}",
      "",
      `素材名：${asset.originalName}`,
      `基础信息：${asset.durationSec ?? "未知"} 秒，${asset.width ?? "?"}x${asset.height ?? "?"}，${asset.fps ?? "?"}fps`,
    ].join("\n");

    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageParts] as unknown as string }],
      temperature: 0.2,
    });
    const rawText = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJson(rawText)) as unknown;

    return {
      status: "ready",
      model: config.model,
      payload: normalizePayload(parsed, asset),
    };
  } catch (error) {
    return {
      status: "failed",
      model: config.model,
      reason: error instanceof Error ? error.message : "视觉分析失败。",
    };
  }
}

export async function enrichAssetWithVision(asset: MediaAsset) {
  asset.visionStatus = "pending";
  const result = await analyzeAssetKeyframes(asset);

  if (result.status === "skipped") {
    asset.visionStatus = "skipped";
    asset.visionError = result.reason;
    return asset;
  }

  if (result.status === "failed") {
    asset.visionStatus = "failed";
    asset.visionModel = result.model;
    asset.visionError = result.reason;
    return asset;
  }

  const payload = result.payload;
  asset.visualSummary = payload.visualSummary;
  asset.visualTags = payload.visualTags;
  asset.visualMood = payload.visualMood;
  asset.visualHook = payload.visualHook;
  asset.visibleSubjects = payload.visibleSubjects;
  asset.sceneType = payload.sceneType;
  asset.visualConfidence = payload.confidence;
  asset.visionStatus = "ready";
  asset.visionModel = result.model;
  asset.visionError = undefined;
  asset.bestUse = payload.bestUse;
  asset.role = payload.role;
  asset.lensProfile = payload.lensProfile;
  asset.directorNote = payload.directorNote;
  asset.tags = Array.from(new Set([...payload.visualTags, ...asset.tags])).slice(0, 8);

  return asset;
}
