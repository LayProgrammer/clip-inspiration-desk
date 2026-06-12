import type { MediaAsset } from "./types";

type DraftAsset = Pick<MediaAsset, "originalName" | "durationSec" | "width" | "height" | "fps" | "tags">;

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function inferMediaTags(name: string) {
  const lower = name.toLowerCase();
  const tags = ["待深度分析"];
  if (hasAny(lower, [/food|meal|hotpot|coffee|cafe/, /吃|火锅|咖啡|餐|饭|菜/])) tags.unshift("食物");
  if (hasAny(lower, [/street|city|road|walk|metro/, /街|路|城市|地铁|夜市/])) tags.unshift("街景");
  if (hasAny(lower, [/friend|people|person|party|birthday/, /朋友|人物|聚会|生日/])) tags.unshift("人物");
  if (hasAny(lower, [/night|bar|club/, /夜|晚上|酒吧/])) tags.unshift("夜晚");
  if (hasAny(lower, [/sunset|sky|sea|mountain|view/, /日落|天空|海|山|风景/])) tags.unshift("风景");
  return Array.from(new Set(tags)).slice(0, 4);
}

export function inferLensProfile(asset: DraftAsset) {
  const isVertical = Boolean(asset.width && asset.height && asset.height > asset.width);
  const isWide = Boolean(asset.width && asset.height && asset.width > asset.height);
  const duration = asset.durationSec ?? 0;

  if (duration > 45) return isVertical ? "长竖屏记录镜头" : "长横屏记录镜头";
  if (duration <= 6) return "短促情绪切点";
  if (isVertical) return "竖屏社交素材";
  if (isWide) return "横屏叙事素材";
  return "基础视频素材";
}

export function inferBestUse(asset: DraftAsset): MediaAsset["bestUse"] {
  const lower = asset.originalName.toLowerCase();
  const duration = asset.durationSec ?? 0;
  const tags = asset.tags.join(",");

  if (hasAny(lower, [/laugh|reaction|wow|start/, /笑|反应|惊喜|开场/]) || /人物/.test(tags)) return "hook";
  if (hasAny(lower, [/food|close|detail/, /食物|特写|细节/]) || /食物/.test(tags)) return "detail";
  if (hasAny(lower, [/street|metro|walk|road/, /街|路|地铁|移动/]) || /街景/.test(tags)) return "transition";
  if (hasAny(lower, [/sunset|end|night|sky/, /日落|结尾|夜|天空/]) || duration >= 25) return "ending";
  if (duration >= 10) return "scene";
  return "unknown";
}

export function describeBestUse(bestUse: MediaAsset["bestUse"]) {
  const labels: Record<MediaAsset["bestUse"], string> = {
    hook: "适合开场钩子",
    scene: "适合交代场景",
    detail: "适合做细节高潮",
    transition: "适合做转场和节奏连接",
    ending: "适合做结尾余味",
    unknown: "等待导演判断用途",
  };
  return labels[bestUse];
}

export function createDirectorNote(asset: DraftAsset) {
  const bestUse = inferBestUse(asset);
  const duration = asset.durationSec ? `${asset.durationSec} 秒` : "未知时长";
  const profile = inferLensProfile(asset);
  const resolution = asset.width && asset.height ? `${asset.width}x${asset.height}` : "未知分辨率";

  if (bestUse === "hook") return `${profile}，${duration}，${resolution}。建议先找其中最有动作或表情变化的 2-4 秒，用来把观众拽进故事。`;
  if (bestUse === "detail") return `${profile}，${duration}，${resolution}。适合插在中段做质感和情绪峰值，字幕要短，别盖住画面细节。`;
  if (bestUse === "transition") return `${profile}，${duration}，${resolution}。可以当作段落之间的呼吸点，用环境声或动作方向做衔接。`;
  if (bestUse === "ending") return `${profile}，${duration}，${resolution}。适合放慢节奏做结尾，保留 1 秒余白让情绪落地。`;
  if (bestUse === "scene") return `${profile}，${duration}，${resolution}。适合放在开头后面交代人物、地点和事情背景。`;
  return `${profile}，${duration}，${resolution}。目前只完成基础分析，后续关键帧理解后再判断更准确的用途。`;
}
