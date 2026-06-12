import { NextResponse } from "next/server";
import { createProject, getOrCreateWorkspace, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getOrCreateWorkspace());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const data = await readStore();
  const project = createProject(String(body.name ?? "").trim() || `素材项目 ${data.projects.length + 1}`);
  data.projects.unshift(project);
  await writeStore(data);

  return NextResponse.json({ project, media: [], ideas: [], timeline: [] }, { status: 201 });
}
