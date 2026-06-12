import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createDirectorNote, describeBestUse, inferBestUse, inferLensProfile, inferMediaTags } from "@/lib/media-analysis";
import { getStorageRoot, readStore, writeStore } from "@/lib/store";
import type { MediaAsset } from "@/lib/types";
import { analyzeVideoFile } from "@/lib/video";
import { enrichAssetWithVision } from "@/lib/vision-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileSize = 500 * 1024 * 1024;
const colors = ["#b9d8c2", "#f2b36f", "#f3cf78", "#96b9d4", "#d8c9ff", "#d4b6a8"];

function safeFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-120) || "video.mp4";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "");
  const files = form.getAll("files").filter((item): item is File => item instanceof File);

  if (!projectId || files.length === 0) {
    return NextResponse.json({ error: "请选择至少一个视频文件。" }, { status: 400 });
  }

  const invalid = files.find((file) => !file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|avi)$/i.test(file.name));
  if (invalid) {
    return NextResponse.json({ error: `${invalid.name} 不是当前支持的视频格式。` }, { status: 400 });
  }

  const tooLarge = files.find((file) => file.size > maxFileSize);
  if (tooLarge) {
    return NextResponse.json({ error: `${tooLarge.name} 超过当前单文件 500MB 限制。` }, { status: 400 });
  }

  const data = await readStore();
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "没有找到对应项目。" }, { status: 404 });
  }

  const uploadDir = path.join(getStorageRoot(), "uploads", projectId);
  await mkdir(uploadDir, { recursive: true });
  const created: MediaAsset[] = [];

  for (const [index, file] of files.entries()) {
    const id = randomUUID();
    const storedName = `${id}-${safeFileName(file.name)}`;
    const absolutePath = path.join(uploadDir, storedName);
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    let videoInfo: Awaited<ReturnType<typeof analyzeVideoFile>> | undefined;
    let analysisError: string | undefined;

    try {
      videoInfo = await analyzeVideoFile(absolutePath, id);
    } catch (error) {
      analysisError = error instanceof Error ? error.message : "视频分析失败";
    }

    const tags = inferMediaTags(file.name);
    const draft = {
      originalName: file.name,
      durationSec: videoInfo?.durationSec,
      width: videoInfo?.width,
      height: videoInfo?.height,
      fps: videoInfo?.fps,
      tags,
    };
    const bestUse = inferBestUse(draft);

    const asset: MediaAsset = {
      id,
      projectId,
      originalName: file.name,
      storedPath: path.relative(process.cwd(), absolutePath),
      thumbnailPath: videoInfo?.thumbnailPath,
      keyframePaths: videoInfo?.keyframePaths ?? [],
      mimeType: file.type || "video/mp4",
      sizeBytes: file.size,
      durationSec: videoInfo?.durationSec,
      width: videoInfo?.width,
      height: videoInfo?.height,
      fps: videoInfo?.fps,
      tags,
      role: videoInfo ? describeBestUse(bestUse) : "已保存，等待重新分析",
      bestUse,
      lensProfile: inferLensProfile(draft),
      directorNote: createDirectorNote(draft),
      color: colors[(data.media.length + index) % colors.length],
      analysisStatus: videoInfo ? "ready" : "failed",
      analysisError,
      createdAt: new Date().toISOString(),
    };
    if (asset.analysisStatus === "ready") {
      await enrichAssetWithVision(asset);
    }
    data.media.push(asset);
    created.push(asset);
  }

  project.status = "uploaded";
  project.updatedAt = new Date().toISOString();
  await writeStore(data);

  return NextResponse.json({ media: created, project }, { status: 201 });
}

export async function DELETE(request: Request) {
  const assetId = new URL(request.url).searchParams.get("assetId");
  if (!assetId) {
    return NextResponse.json({ error: "缺少素材 ID。" }, { status: 400 });
  }

  const data = await readStore();
  const asset = data.media.find((item) => item.id === assetId);
  if (!asset) {
    return NextResponse.json({ error: "没有找到对应素材。" }, { status: 404 });
  }

  const candidatePaths = [
    path.resolve(/* turbopackIgnore: true */ process.cwd(), asset.storedPath),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "public", "generated", "thumbnails", `${asset.id}.jpg`),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "public", "generated", "keyframes", asset.id),
  ];

  for (const candidate of candidatePaths) {
    if (candidate.startsWith(process.cwd())) {
      await rm(candidate, { force: true, recursive: true }).catch(() => undefined);
    }
  }

  data.media = data.media.filter((item) => item.id !== assetId);
  data.timeline = data.timeline.filter((item) => item.assetId !== assetId);
  await writeStore(data);

  return NextResponse.json({ deletedId: assetId });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assetId = String(body.assetId ?? "");
  const allowedIntents: MediaAsset["userIntent"][] = ["auto", "must", "opening", "ending", "avoid"];
  const userIntent = allowedIntents.includes(body.userIntent) ? (body.userIntent as MediaAsset["userIntent"]) : undefined;
  const userNote = typeof body.userNote === "string" ? body.userNote.trim().slice(0, 160) : undefined;

  if (!assetId) {
    return NextResponse.json({ error: "缺少素材 ID。" }, { status: 400 });
  }

  const data = await readStore();
  const asset = data.media.find((item) => item.id === assetId);
  if (!asset) {
    return NextResponse.json({ error: "没有找到对应素材。" }, { status: 404 });
  }

  if (userIntent) asset.userIntent = userIntent;
  if (userNote !== undefined) asset.userNote = userNote;

  data.routeExecutionPacks = data.routeExecutionPacks.filter((item) => item.projectId !== asset.projectId);
  const project = data.projects.find((item) => item.id === asset.projectId);
  if (project) project.updatedAt = new Date().toISOString();

  await writeStore(data);

  return NextResponse.json({ asset, routeExecutionPacks: data.routeExecutionPacks.filter((item) => item.projectId === asset.projectId) });
}
