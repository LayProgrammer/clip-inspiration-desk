import path from "node:path";
import { NextResponse } from "next/server";
import { createDirectorNote, describeBestUse, inferBestUse, inferLensProfile, inferMediaTags } from "@/lib/media-analysis";
import { readStore, writeStore } from "@/lib/store";
import { analyzeVideoFile } from "@/lib/video";
import { enrichAssetWithVision } from "@/lib/vision-analysis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const projectId = String(body.projectId ?? "");
  const data = await readStore();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "没有找到对应项目。" }, { status: 404 });
  }

  const projectMedia = data.media.filter((item) => item.projectId === projectId);
  for (const asset of projectMedia) {
    try {
      const absolutePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), asset.storedPath);
      const videoInfo = await analyzeVideoFile(absolutePath, asset.id);
      const tags = inferMediaTags(asset.originalName);
      const draft = {
        originalName: asset.originalName,
        durationSec: videoInfo.durationSec,
        width: videoInfo.width,
        height: videoInfo.height,
        fps: videoInfo.fps,
        tags,
      };
      const bestUse = inferBestUse(draft);

      Object.assign(asset, {
        thumbnailPath: videoInfo.thumbnailPath,
        keyframePaths: videoInfo.keyframePaths,
        durationSec: videoInfo.durationSec,
        width: videoInfo.width,
        height: videoInfo.height,
        fps: videoInfo.fps,
        tags,
        role: describeBestUse(bestUse),
        bestUse,
        lensProfile: inferLensProfile(draft),
        directorNote: createDirectorNote(draft),
        analysisStatus: "ready",
        analysisError: undefined,
      });
      await enrichAssetWithVision(asset);
    } catch (error) {
      asset.analysisStatus = "failed";
      asset.analysisError = error instanceof Error ? error.message : "视频分析失败";
    }
  }

  project.updatedAt = new Date().toISOString();
  await writeStore(data);
  return NextResponse.json({ media: projectMedia, project });
}
