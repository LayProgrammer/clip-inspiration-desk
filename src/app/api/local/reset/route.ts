import { NextResponse } from "next/server";
import { clearLocalWorkspace, readLocalSettings } from "@/lib/local-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (String(body.confirm ?? "") !== "CLEAR_LOCAL_DATA") {
    return NextResponse.json({ error: "需要确认清理本地素材与项目数据。" }, { status: 400 });
  }

  await clearLocalWorkspace();
  return NextResponse.json({ ok: true, settings: await readLocalSettings() });
}
