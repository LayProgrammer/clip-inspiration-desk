import { NextResponse } from "next/server";
import { readLocalSettings, writeLocalSettings } from "@/lib/local-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readLocalSettings());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const settings = await writeLocalSettings({
    provider: String(body.provider ?? "local"),
    openaiApiKey: body.openaiApiKey === undefined ? undefined : String(body.openaiApiKey),
    openaiModel: String(body.openaiModel ?? ""),
    openaiVisionModel: String(body.openaiVisionModel ?? ""),
    zhipuApiKey: body.zhipuApiKey === undefined ? undefined : String(body.zhipuApiKey),
    zhipuModel: String(body.zhipuModel ?? ""),
    zhipuVisionModel: String(body.zhipuVisionModel ?? ""),
  });

  return NextResponse.json(settings);
}
