import { randomUUID } from "node:crypto";
import type { EditIdea, InspirationReport, MediaAsset, Project, RouteExecutionPack, RouteExecutionStep } from "./types";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function sanitizeLine(value: string | undefined, fallback: string) {
  const text = value?.trim();
  return text ? text : fallback;
}

function uniqueAssets(media: MediaAsset[]) {
  return Array.from(new Map(media.map((asset) => [asset.id, asset])).values());
}

function rankedAssets(idea: EditIdea, media: MediaAsset[], report: InspirationReport | undefined) {
  const usableMedia = media.filter((asset) => asset.userIntent !== "avoid");
  const pool = usableMedia.length ? usableMedia : media;
  const byName = new Map(pool.map((asset) => [asset.originalName, asset]));
  const byId = new Map(pool.map((asset) => [asset.id, asset]));
  const openingPicks = pool.filter((asset) => asset.userIntent === "opening");
  const mustPicks = pool.filter((asset) => asset.userIntent === "must");
  const endingPicks = pool.filter((asset) => asset.userIntent === "ending");
  const recommended = idea.recommendedAssets
    .map((nameOrId) => byId.get(nameOrId) ?? byName.get(nameOrId))
    .filter((asset): asset is MediaAsset => Boolean(asset));

  const reportPicks = [
    ...(report?.diagnosis.bestOpeningAssets ?? []),
    ...(report?.diagnosis.mustUseAssets ?? []),
  ]
    .map((item) => byName.get(item.assetName))
    .filter((asset): asset is MediaAsset => Boolean(asset));

  const rolePicks = [
    pool.find((asset) => asset.bestUse === "hook"),
    pool.find((asset) => asset.bestUse === "scene"),
    pool.find((asset) => asset.bestUse === "detail"),
    pool.find((asset) => asset.bestUse === "transition"),
    pool.find((asset) => asset.bestUse === "ending"),
  ].filter((asset): asset is MediaAsset => Boolean(asset));

  const middle = uniqueAssets([...mustPicks, ...recommended, ...reportPicks, ...rolePicks, ...pool])
    .filter((asset) => !openingPicks.some((item) => item.id === asset.id) && !endingPicks.some((item) => item.id === asset.id));

  return uniqueAssets([...openingPicks, ...middle, ...endingPicks]).slice(0, 6);
}

function assetShotReason(asset: MediaAsset, index: number) {
  if (asset.userNote) return `${asset.userNote}。${asset.visualHook ?? asset.visualSummary ?? asset.directorNote ?? ""}`.trim();
  if (asset.visualHook) return asset.visualHook;
  if (asset.visualSummary) return asset.visualSummary;
  if (asset.directorNote) return asset.directorNote;

  const fallback = [
    "用它先把观众拉进现场，不急着解释。",
    "用它交代地点、人物或氛围，让故事站稳。",
    "用它承接情绪，把中段信息变得更具体。",
    "用它做自然转场，避免镜头之间硬断。",
    "用它收尾，留下一个安静或有余味的画面。",
  ];
  return fallback[index] ?? "用它补足这条路线里的必要信息。";
}

function stepPurpose(idea: EditIdea, index: number, total: number) {
  const fromStructure = idea.structure[index];
  if (fromStructure) return fromStructure;
  if (index === 0) return "开场钩子";
  if (index === total - 1) return "收尾留味";
  return "叙事推进";
}

function stepInstruction(asset: MediaAsset, idea: EditIdea, index: number) {
  const visible = asset.visibleSubjects?.length ? `画面主体是 ${asset.visibleSubjects.slice(0, 3).join("、")}，` : "";
  const mood = asset.visualMood ? `情绪偏 ${asset.visualMood}，` : "";
  const reason = assetShotReason(asset, index);

  if (index === 0) {
    return `${visible}${mood}先截 1-3 秒最有动作或表情变化的片段，作为「${idea.title}」的入口。${reason}`;
  }

  if (asset.bestUse === "transition") {
    return `${visible}${mood}放在段落交界处，保留一点现场声音，让两个信息点自然接上。${reason}`;
  }

  if (asset.bestUse === "detail") {
    return `${visible}${mood}把它当成记忆点，不要放太长，最好配一条短字幕或轻音效。${reason}`;
  }

  return `${visible}${mood}只保留和路线主题有关的部分，删掉重复移动和空等镜头。${reason}`;
}

function stepSubtitle(idea: EditIdea, asset: MediaAsset, index: number, report: InspirationReport | undefined) {
  const opening = report?.captionGuide.openingLines[index] ?? idea.hook;
  const transition = report?.captionGuide.transitionLines[index - 1] ?? idea.structure[index] ?? idea.title;
  const ending = report?.captionGuide.endingLines[0] ?? "就到这里，刚刚好。";

  if (index === 0) return opening;
  if (asset.bestUse === "ending") return ending;
  return transition;
}

function stepSound(asset: MediaAsset, index: number, report: InspirationReport | undefined) {
  if (index === 0) return report?.audioGuide.soundHooks[0] ?? "前 3 秒尽量保留原声，再轻轻垫入音乐。";
  if (asset.bestUse === "transition") return "让环境声跨过转场 0.3 秒，比套模板转场更自然。";
  if (asset.bestUse === "detail") return "只加一个很轻的点缀音效，避免素材显得像模板。";
  return report?.audioGuide.musicDirection ?? "音乐做底色，不要抢过画面本身。";
}

function stepEffect(asset: MediaAsset, index: number, report: InspirationReport | undefined) {
  if (index === 0) return "轻微推近或定格 0.2 秒，字幕别挡住主体。";
  if (asset.bestUse === "transition") return "按动作方向切换，少用花哨转场。";
  if (asset.bestUse === "ending") return "节奏放慢，音乐淡出，留 0.5 秒余味。";
  return report?.visualGuide.effectIdeas[index % Math.max(report.visualGuide.effectIdeas.length, 1)] ?? "自然衔接，调色保持真实。";
}

function stepAvoid(asset: MediaAsset, index: number) {
  if (index === 0) return "不要先上解释性长字幕，先让画面自己抓人。";
  if (asset.bestUse === "detail") return "不要把细节镜头拖太久，超过 3 秒就会泄气。";
  if (asset.bestUse === "ending") return "不要结尾突然塞卖点或大段说明。";
  return "不要为了用完素材而保留重复片段。";
}

export function generateRouteExecutionPack(
  project: Project,
  idea: EditIdea,
  media: MediaAsset[],
  report: InspirationReport | undefined,
): RouteExecutionPack {
  const selected = rankedAssets(idea, media, report);
  let cursor = 0;
  const targetDuration = Math.max(18, Math.min(idea.durationSec, 60));
  const defaultStepDuration = Math.max(4, Math.round(targetDuration / Math.max(selected.length, 1)));

  const checklist: RouteExecutionStep[] = selected.map((asset, index) => {
    const isLast = index === selected.length - 1;
    const duration = index === 0 ? Math.min(4, defaultStepDuration) : isLast ? Math.min(8, defaultStepDuration + 2) : defaultStepDuration;
    const step: RouteExecutionStep = {
      id: randomUUID(),
      assetId: asset.id,
      assetName: asset.originalName,
      startSec: cursor,
      endSec: cursor + duration,
      purpose: stepPurpose(idea, index, selected.length),
      instruction: stepInstruction(asset, idea, index),
      subtitle: stepSubtitle(idea, asset, index, report),
      sound: stepSound(asset, index, report),
      effect: stepEffect(asset, index, report),
      avoid: stepAvoid(asset, index),
    };
    cursor += duration;
    return step;
  });

  return {
    id: randomUUID(),
    projectId: project.id,
    ideaId: idea.id,
    ideaTitle: idea.title,
    routeSummary: sanitizeLine(
      idea.recommendationReason,
      `这条路线适合先做一版 ${project.targetPlatform} 的 ${project.targetMood} 短片，重点是取舍素材，而不是堆特效。`,
    ),
    coverSuggestion: report?.visualGuide.coverIdeas[0] ?? "选主体最大、情绪最清楚的一帧做封面，标题控制在 8-12 个字。",
    openingHook: report?.hookBank[0] ?? idea.hook,
    rhythmPlan: report?.visualGuide.rhythmDirection ?? `目标控制在 ${targetDuration} 秒左右，开头快，中段稳，结尾慢半拍。`,
    soundPlan: report?.audioGuide.musicDirection ?? idea.musicSuggestion,
    subtitleStyle: report?.captionGuide.tone ?? "字幕像朋友自然讲述，少解释画面已经能看懂的内容。",
    checklist,
    finalReview: [
      "前 3 秒有没有一个继续看下去的理由？",
      "每个镜头是否都服务于当前路线，而不是为了凑素材？",
      "字幕有没有补充信息，而不是复述画面？",
      "音乐和音效有没有盖过现场感？",
      "结尾是否有半秒余味，而不是戛然而止？",
    ],
    createdAt: new Date().toISOString(),
  };
}

export function buildRouteExecutionMarkdown(
  project: Project,
  idea: EditIdea,
  pack: RouteExecutionPack,
  report: InspirationReport | undefined,
) {
  return [
    `# ${project.name} - ${idea.title}`,
    "",
    `平台：${project.targetPlatform}`,
    `风格：${project.targetMood}`,
    `建议时长：${idea.durationSec} 秒`,
    "",
    "## 路线判断",
    pack.routeSummary,
    "",
    "## 开头与封面",
    `开头钩子：${pack.openingHook}`,
    `封面建议：${pack.coverSuggestion}`,
    "",
    "## 节奏 / 声音 / 字幕",
    `节奏：${pack.rhythmPlan}`,
    `声音：${pack.soundPlan}`,
    `字幕：${pack.subtitleStyle}`,
    "",
    "## 执行步骤",
    ...pack.checklist.map((step, index) =>
      [
        `${index + 1}. ${formatTime(step.startSec)}-${formatTime(step.endSec)} ${step.assetName}`,
        `   - 目的：${step.purpose}`,
        `   - 操作：${step.instruction}`,
        `   - 字幕：${step.subtitle}`,
        `   - 声音：${step.sound}`,
        `   - 效果：${step.effect}`,
        `   - 避免：${step.avoid}`,
      ].join("\n"),
    ),
    "",
    "## 发布前复查",
    ...pack.finalReview.map((item) => `- ${item}`),
    "",
    "## 可继续追问 AI",
    ...(report?.remixPrompts ?? ["把这套执行包改得更适合我当前的平台和素材。"]).map((item) => `- ${item}`),
  ].join("\n");
}
