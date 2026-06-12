import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeInspirationReport } from "./report-normalize";
import type { InspirationReport, Project, ProjectWorkspace, StoreData } from "./types";

const storageRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
const dataFile = path.join(storageRoot, "data.json");

const emptyStore = (): StoreData => ({
  projects: [],
  media: [],
  ideas: [],
  timeline: [],
  routeExecutionPacks: [],
  inspirationReports: [],
});

function normalizeReport(report: InspirationReport): InspirationReport {
  return normalizeInspirationReport({
    ...report,
    diagnosis: report.diagnosis ?? {
      storyPotentialScore: 64,
      editingDifficulty: "中等",
      verdict: "这批素材可以先做一条短而明确的故事片，重点是选开头、删重复、留结尾。",
      bestOpeningAssets: [],
      mustUseAssets: [],
      optionalAssets: [],
      missingShots: ["重新生成灵感包后，会得到更完整的素材体检报告。"],
      recommendedRouteTitle: "先剪一条稳妥短片",
      whyThisRoute: "老版本灵感包缺少路线诊断，建议重新生成一次获得更准确判断。",
    },
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
  });
}

async function ensureStorage() {
  await mkdir(path.join(storageRoot, "uploads"), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureStorage();
  const raw = await readFile(dataFile, "utf8");

  try {
    const data = JSON.parse(raw) as StoreData;
    data.projects ??= [];
    data.media ??= [];
    data.ideas ??= [];
    data.timeline ??= [];
    data.routeExecutionPacks ??= [];
    data.inspirationReports ??= [];
    data.inspirationReports = data.inspirationReports.map(normalizeReport);
    data.media = data.media.map((asset) => ({
      ...asset,
      keyframePaths: asset.keyframePaths ?? [],
      bestUse: asset.bestUse ?? "unknown",
      lensProfile: asset.lensProfile ?? "镜头档案待补全",
      directorNote: asset.directorNote ?? "已保存素材，等待进一步画面分析。",
      analysisStatus: asset.analysisStatus ?? "pending",
      userIntent: asset.userIntent ?? "auto",
      userNote: asset.userNote ?? "",
      visualTags: asset.visualTags ?? [],
      visibleSubjects: asset.visibleSubjects ?? [],
      visionStatus: asset.visionStatus ?? "skipped",
    }));
    return data;
  } catch {
    return emptyStore();
  }
}

export async function writeStore(data: StoreData) {
  await ensureStorage();
  const tempFile = `${dataFile}.tmp`;
  await writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await rename(tempFile, dataFile);
}

export function createProject(name = "我的第一个素材项目"): Project {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name,
    description: "",
    targetPlatform: "小红书",
    targetMood: "生活感",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export async function getOrCreateWorkspace(): Promise<ProjectWorkspace> {
  const data = await readStore();
  let project = data.projects[0];

  if (!project) {
    project = createProject();
    data.projects.push(project);
    await writeStore(data);
  }

  return {
    project,
    media: data.media.filter((item) => item.projectId === project.id),
    ideas: data.ideas.filter((item) => item.projectId === project.id),
    timeline: data.timeline.filter((item) => item.projectId === project.id),
    routeExecutionPacks: data.routeExecutionPacks.filter((item) => item.projectId === project.id),
    inspirationReport: data.inspirationReports.find((item) => item.projectId === project.id),
  };
}

export function getStorageRoot() {
  return storageRoot;
}
