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
    apiKey: body.apiKey === undefined ? undefined : String(body.apiKey),
    baseURL: body.baseURL === undefined ? undefined : String(body.baseURL),
    textModel: String(body.textModel ?? ""),
    visionModel: body.visionModel === undefined ? undefined : String(body.visionModel),
  });

  return NextResponse.json(settings);
}
