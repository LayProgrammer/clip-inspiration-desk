import { NextResponse } from "next/server";
import { generateRouteExecutionPack } from "@/lib/route-pack";
import { readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const projectId = String(body.projectId ?? "");
  const ideaId = String(body.ideaId ?? "");
  const data = await readStore();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "没有找到对应项目。" }, { status: 404 });
  }

  const idea = data.ideas.find((item) => item.projectId === projectId && item.id === ideaId);
  if (!idea) {
    return NextResponse.json({ error: "请先选择一条灵感路线。" }, { status: 404 });
  }

  const media = data.media.filter((item) => item.projectId === projectId);
  if (media.length === 0) {
    return NextResponse.json({ error: "请先导入素材。" }, { status: 400 });
  }

  const report = data.inspirationReports.find((item) => item.projectId === projectId);
  const routePack = generateRouteExecutionPack(project, idea, media, report);

  data.routeExecutionPacks = data.routeExecutionPacks
    .filter((item) => !(item.projectId === projectId && item.ideaId === ideaId))
    .concat(routePack);
  project.status = "exported";
  project.updatedAt = new Date().toISOString();

  await writeStore(data);

  return NextResponse.json({ project, routePack });
}
