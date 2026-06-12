import type { EditIdea, InspirationReport, MediaAsset, Project, RouteExecutionPack, TimelineSegment } from "./types";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function assetName(media: MediaAsset[], assetId: string) {
  return media.find((asset) => asset.id === assetId)?.originalName ?? "素材片段";
}

function assetVisualNote(media: MediaAsset[], assetId: string) {
  const asset = media.find((item) => item.id === assetId);
  if (!asset?.visualSummary) return "";
  const hook = asset.visualHook ? `｜开头建议：${asset.visualHook}` : "";
  return `｜画面判断：${asset.visualSummary}${hook}`;
}

export function buildEditingChecklist(project: Project, media: MediaAsset[], idea: EditIdea | undefined, timeline: TimelineSegment[], report: InspirationReport | undefined) {
  return [
    `剪映执行清单：${project.name}`,
    "",
    `方向：${idea?.title ?? "先选择一个剪辑方向"}`,
    `平台：${project.targetPlatform}`,
    `风格：${project.targetMood}`,
    "",
    "一、先看素材体检",
    report?.diagnosis ? `- 故事潜力：${report.diagnosis.storyPotentialScore}/100` : "- 故事潜力：生成灵感后查看",
    report?.diagnosis ? `- 剪辑难度：${report.diagnosis.editingDifficulty}` : "- 剪辑难度：生成灵感后查看",
    report?.diagnosis ? `- 导演判断：${report.diagnosis.verdict}` : "- 导演判断：先生成素材体检报告",
    report?.diagnosis ? `- 推荐路线：${report.diagnosis.recommendedRouteTitle}｜${report.diagnosis.whyThisRoute}` : "- 推荐路线：先生成灵感路线",
    "",
    "二、先做素材取舍",
    ...(report?.diagnosis.bestOpeningAssets ?? []).map((item) => `- 最佳开头：${item.assetName}｜${item.reason}`),
    ...(report?.diagnosis.mustUseAssets ?? []).map((item) => `- 必用素材：${item.assetName}｜${item.reason}`),
    ...(report?.diagnosis.optionalAssets ?? []).map((item) => `- 可选素材：${item.assetName}｜${item.reason}`),
    ...(report?.diagnosis.missingShots ?? []).map((item) => `- 缺口提醒：${item}`),
    ...(report?.materialMap ?? []).map((item) => `- ${item.category}：${item.insight}`),
    "",
    "三、按这个顺序摆粗剪",
    ...(timeline.length
      ? timeline.map((item, index) => `${index + 1}. ${formatTime(item.startSec)}-${formatTime(item.endSec)}｜${assetName(media, item.assetId)}｜${item.purpose}｜字幕：${item.subtitle}｜效果：${item.effect}${assetVisualNote(media, item.assetId)}`)
      : ["- 先生成剪辑提案，系统会给出镜头使用顺序。"]),
    "",
    "四、声音和字幕",
    `- 音乐：${report?.audioGuide.musicDirection ?? idea?.musicSuggestion ?? "音乐不要抢过素材本身。"}`,
    ...(report?.captionGuide.rules ?? ["字幕少解释画面，多补充情绪。"]).map((item) => `- ${item}`),
    "",
    "五、最后检查",
    ...(report?.nextActions ?? ["前三秒是否有继续看的理由？", "结尾是否有余味？"]).map((item) => `- ${item}`),
  ].join("\n");
}

export function buildPublishPlan(project: Project, idea: EditIdea | undefined, report: InspirationReport | undefined) {
  return [
    `${project.targetPlatform}发布方案：${project.name}`,
    "",
    "标题备选：",
    ...(report?.titleBank ?? [idea?.title ?? "把这批素材剪成一个值得发布的故事"]).map((item, index) => `${index + 1}. ${item}`),
    "",
    "封面方向：",
    ...(report?.visualGuide.coverIdeas ?? ["选主体明确、情绪最清楚的一帧。"]).map((item) => `- ${item}`),
    "",
    "开头钩子：",
    ...(report?.hookBank ?? [idea?.hook ?? "先放最有情绪的一刻。"]).map((item) => `- ${item}`),
    "",
    "正文/简介：",
    `这条视频可以走“${project.targetMood}”方向，不用过度解释，重点是把真实瞬间、氛围和细节组织成一个小故事。`,
    "",
    "发布前注意：",
    ...(report?.blindSpots ?? ["不要把所有素材都塞进去。"]).map((item) => `- ${item}`),
  ].join("\n");
}

export function buildRemixPrompt(project: Project, idea: EditIdea | undefined, report: InspirationReport | undefined) {
  return [
    "继续追问 AI：",
    "",
    `我正在做一个${project.targetPlatform}视频，目标风格是“${project.targetMood}”。`,
    idea ? `当前方向是：“${idea.title}”。${idea.hook}` : "当前还没有选定方向。",
    "",
    "请基于下面要求继续细化，不要泛泛而谈：",
    ...(report?.remixPrompts ?? ["把这个方案改得更具体，并引用素材名称。"]).map((item) => `- ${item}`),
  ].join("\n");
}

export function buildRouteExecutionMarkdown(
  project: Project,
  idea: EditIdea,
  routePack: RouteExecutionPack,
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
    routePack.routeSummary,
    "",
    "## 开头与封面",
    `开头钩子：${routePack.openingHook}`,
    `封面建议：${routePack.coverSuggestion}`,
    "",
    "## 节奏 / 声音 / 字幕",
    `节奏：${routePack.rhythmPlan}`,
    `声音：${routePack.soundPlan}`,
    `字幕：${routePack.subtitleStyle}`,
    "",
    "## 执行步骤",
    ...routePack.checklist.map((step, index) =>
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
    ...routePack.finalReview.map((item) => `- ${item}`),
    "",
    "## 可继续追问 AI",
    ...(report?.remixPrompts ?? ["把这套执行包改得更适合我当前的平台和素材。"]).map((item) => `- ${item}`),
  ].join("\n");
}
