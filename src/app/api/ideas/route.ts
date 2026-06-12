import { NextResponse } from "next/server";
import { generateIdeas, generateInspirationReport, generateTimeline } from "@/lib/idea-engine";
import { generateAiInspiration } from "@/lib/openai";
import { readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const projectId = String(body.projectId ?? "");
  const data = await readStore();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "没有找到对应项目。" }, { status: 404 });
  }

  const media = data.media.filter((item) => item.projectId === projectId);
  if (media.length === 0) {
    return NextResponse.json({ error: "请先上传至少一段视频素材。" }, { status: 400 });
  }

  project.description = String(body.description ?? "").trim();
  project.targetPlatform = String(body.platform ?? "小红书");
  project.targetMood = String(body.mood ?? "生活感");
  project.status = "timeline_ready";
  project.updatedAt = new Date().toISOString();

  let source: "ai" | "local" = "local";
  let provider: string | undefined;
  let model: string | undefined;
  let aiError: string | undefined;
  let ideas = generateIdeas(projectId, media, project.targetPlatform, project.targetMood);
  let timeline = generateTimeline(projectId, media);
  let inspirationReport = generateInspirationReport(projectId, media, project.targetPlatform, project.targetMood);

  try {
    const aiResult = await generateAiInspiration(projectId, media, project.targetPlatform, project.targetMood, project.description);
    if (aiResult) {
      ideas = aiResult.ideas;
      timeline = aiResult.timeline;
      inspirationReport = aiResult.inspirationReport;
      source = "ai";
      provider = aiResult.provider;
      model = aiResult.model;
    }
  } catch (error) {
    aiError = error instanceof Error ? error.message : "AI 灵感生成失败，已使用本地规则兜底。";
  }

  data.ideas = data.ideas.filter((item) => item.projectId !== projectId).concat(ideas);
  data.timeline = data.timeline.filter((item) => item.projectId !== projectId).concat(timeline);
  data.inspirationReports = data.inspirationReports.filter((item) => item.projectId !== projectId).concat(inspirationReport);
  await writeStore(data);

  return NextResponse.json({ project, ideas, timeline, inspirationReport, source, provider, model, aiError });
}
