import { NextResponse } from "next/server";
import { answerRouteFollowUp } from "@/lib/route-followup";
import { readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.projectId ?? "");
  const ideaId = String(body.ideaId ?? "");
  const question = String(body.question ?? "").trim();

  if (!question) {
    return NextResponse.json({ error: "请先输入你想追问的问题。" }, { status: 400 });
  }

  const data = await readStore();
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "没有找到对应项目。" }, { status: 404 });
  }

  const idea = data.ideas.find((item) => item.projectId === projectId && item.id === ideaId);
  if (!idea) {
    return NextResponse.json({ error: "请先选择一条灵感路线。" }, { status: 404 });
  }

  const pack = data.routeExecutionPacks.find((item) => item.projectId === projectId && item.ideaId === ideaId);
  if (!pack) {
    return NextResponse.json({ error: "请先生成路线执行包，再继续追问。" }, { status: 404 });
  }

  const media = data.media.filter((item) => item.projectId === projectId);
  const report = data.inspirationReports.find((item) => item.projectId === projectId);
  const followUp = await answerRouteFollowUp({ project, idea, pack, media, report, question });

  pack.followUps = [...(pack.followUps ?? []), followUp].slice(-12);
  project.updatedAt = new Date().toISOString();

  await writeStore(data);

  return NextResponse.json({ project, routePack: pack, followUp });
}
