import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { resolveAiProvider } from "./ai-provider-config";
import type { EditIdea, InspirationReport, MediaAsset, Project, RouteExecutionPack, RouteFollowUp } from "./types";

function formatStepLines(pack: RouteExecutionPack) {
  return pack.checklist
    .map((step, index) => `${index + 1}. ${step.startSec}-${step.endSec}s ${step.assetName} / ${step.purpose} / 字幕：${step.subtitle} / 效果：${step.effect}`)
    .join("\n");
}

function materialLines(media: MediaAsset[]) {
  return media
    .slice(0, 12)
    .map((asset) => {
      const tags = [...(asset.visualTags ?? []), ...asset.tags].filter(Boolean).slice(0, 5).join("、");
      const intent = asset.userIntent && asset.userIntent !== "auto" ? ` / 用户标记：${asset.userIntent}` : "";
      return `- ${asset.originalName}：${asset.visualSummary || asset.directorNote || asset.role}${tags ? ` / 标签：${tags}` : ""}${intent}`;
    })
    .join("\n");
}

function targetDurationFromQuestion(question: string) {
  const match = question.match(/(\d{1,3})\s*(秒|s|S)/);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 5 && seconds <= 180 ? seconds : undefined;
}

function followUpConstraints(question: string) {
  const targetDuration = targetDurationFromQuestion(question);
  const lines = [
    "追问回答硬性约束：",
    "- 不要编造不存在的素材、人物或动物；如果素材档案没有提到，就写“如果素材里确实有这类镜头再使用”。",
    "- 所有新步骤都必须能用当前执行包或可用素材完成。",
    "- 如果你给出新的时间线，结束时间必须递增，且每一步都要写清楚秒数范围。",
  ];
  if (targetDuration) {
    lines.push(`- 用户要求压缩到 ${targetDuration} 秒左右：新执行顺序的最后结束时间不得超过 ${targetDuration} 秒，不要再输出 ${targetDuration} 秒以上的段落。`);
    lines.push("- 回答里必须明确写出一版短清单，格式如：0-3s、3-8s、8-14s、14-20s。");
  }
  if (/不要露脸|不露脸|避开人脸|无露脸/.test(question)) {
    lines.push("- 用户要求不要露脸：优先使用背影、手部、环境、运动轨迹、物件特写、天空/路面/建筑等非人脸画面。");
  }
  if (/标题|封面/.test(question)) {
    lines.push("- 用户在问标题或封面：至少给 5 个标题和 3 个封面构图方向，标题要适合短视频平台。");
  }
  if (/字幕|文案|口播/.test(question)) {
    lines.push("- 用户在问字幕/文案：给出可直接复制的字幕句子，不要只讲原则。");
  }
  return lines.join("\n");
}

function buildFollowUpPrompt(
  project: Project,
  idea: EditIdea,
  pack: RouteExecutionPack,
  media: MediaAsset[],
  report: InspirationReport | undefined,
  question: string,
) {
  return [
    "你是一个短视频剪辑灵感导演。用户已经有一份路线执行包，现在要继续追问你。",
    "你的回答必须具体、可执行，适合用户拿去剪映、Premiere 或 CapCut 里操作。",
    "不要泛泛而谈，不要说你不能剪视频，不要输出 Markdown 表格。",
    "",
    `项目：${project.name}`,
    `平台：${project.targetPlatform}`,
    `目标风格：${project.targetMood}`,
    `用户描述：${project.description || "未填写"}`,
    "",
    `当前路线：${idea.title}`,
    `路线钩子：${idea.hook}`,
    `路线判断：${pack.routeSummary}`,
    "",
    "执行包步骤：",
    formatStepLines(pack),
    "",
    "可用素材：",
    materialLines(media),
    "",
    report?.blindSpots?.length ? `容易踩坑：${report.blindSpots.join("；")}` : "",
    "",
    `用户追问：${question}`,
    "",
    followUpConstraints(question),
    "",
    "请按下面结构回答：",
    "1. 直接结论：一句话说明该怎么改。",
    "2. 具体改法：给 3-6 条操作，每条要说明镜头、字幕、声音或节奏怎么变。",
    "3. 如果要重排顺序，请给出新的 3-6 步顺序。",
    "4. 最后给一个复制到剪辑软件旁边看的简短清单。",
  ].filter(Boolean).join("\n");
}

function localFollowUpAnswer(pack: RouteExecutionPack, question: string): string {
  const targetDuration = targetDurationFromQuestion(question);
  const wantsShorter = Boolean(targetDuration) || /短|20|15|精简|太长/.test(question);
  const wantsFunny = /搞笑|幽默|反差|有趣/.test(question);
  const wantsTitle = /标题|封面|发布/.test(question);
  const wantsNoFace = /不要露脸|不露脸|避开人脸/.test(question);
  const steps = pack.checklist.slice(0, wantsShorter ? 4 : 5);
  const shortTotal = targetDuration ?? 20;
  const shortDurations = steps.map((_, index) => {
    const start = Math.round((shortTotal / steps.length) * index);
    const end = index === steps.length - 1 ? shortTotal : Math.round((shortTotal / steps.length) * (index + 1));
    return `${start}-${end}s`;
  });

  if (wantsTitle) {
    return [
      "直接结论：这条路线的输出重点应放在“标题、封面第一眼、前 3 秒钩子”三件事上。",
      "",
      "具体改法：",
      `1. 封面优先用：${pack.coverSuggestion}`,
      `2. 标题可以围绕这句钩子改写：${pack.openingHook}`,
      "3. 标题不要写成说明书，最好像一句现场感很强的话。",
      "4. 前 3 秒字幕只留一句，不要把来龙去脉全解释完。",
      "",
      "可直接试的标题：",
      `- ${pack.ideaTitle}，原来可以这样剪`,
      "- 这段素材我差点删了，结果越看越有感觉",
      "- 没想到最能抓人的，是这一秒",
    ].join("\n");
  }

  return [
    wantsFunny
      ? "直接结论：可以加一点反差，但不要硬套段子，重点是让开头和转折更有意外感。"
      : wantsNoFace
        ? "直接结论：可以不露脸，把主体、动作、环境声和字幕变成叙事核心。"
        : wantsShorter
          ? "直接结论：可以压缩到更短，保留开头钩子、一个信息推进、一个余味结尾就够了。"
          : "直接结论：这版可以继续细化，先改节奏和字幕，再考虑特效。",
    "",
    "具体改法：",
    ...steps.map((step, index) => {
      const duration = wantsShorter ? shortDurations[index] : `${step.startSec}-${step.endSec}s`;
      const subtitle = wantsFunny ? "字幕改得更像一句轻反差吐槽" : wantsNoFace ? "字幕补充情绪，不解释人物身份" : `保留字幕方向：${step.subtitle}`;
      return `${index + 1}. ${step.assetName}：${duration}，${subtitle}，效果用“${step.effect}”，避开“${step.avoid}”。`;
    }),
    "",
    wantsShorter ? `新的 ${shortTotal} 秒执行清单：` : "新的执行清单：",
    ...steps.map((step, index) => `${index + 1}. ${shortDurations[index] ?? `${step.startSec}-${step.endSec}s`} ${step.purpose}：${step.assetName}`),
    "",
    "复制到剪辑软件旁边看的短清单：先抓前 3 秒，删重复移动，字幕少解释，声音别盖过现场感，结尾留半秒余味。",
  ].join("\n");
}

export async function answerRouteFollowUp(input: {
  project: Project;
  idea: EditIdea;
  pack: RouteExecutionPack;
  media: MediaAsset[];
  report?: InspirationReport;
  question: string;
}): Promise<RouteFollowUp> {
  const question = input.question.trim();
  const config = resolveAiProvider("text");

  if (config) {
    try {
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      const completion = await client.chat.completions.create({
        model: config.textModel,
        messages: [{ role: "user", content: buildFollowUpPrompt(input.project, input.idea, input.pack, input.media, input.report, question) }],
        temperature: 0.55,
      });
      const answer = completion.choices[0]?.message?.content?.trim();
      if (answer) {
        return {
          id: randomUUID(),
          question,
          answer,
          source: "ai",
          provider: config.providerName,
          model: config.textModel,
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      // Fall back to local guidance so the workflow never dead-ends.
    }
  }

  return {
    id: randomUUID(),
    question,
    answer: localFollowUpAnswer(input.pack, question),
    source: "local",
    createdAt: new Date().toISOString(),
  };
}
