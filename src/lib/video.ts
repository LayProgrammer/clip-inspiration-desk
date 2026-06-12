import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const binaryPlatform = process.platform === "win32" ? "win32-x64" : process.platform === "darwin" ? "darwin-x64" : "linux-x64";
const binaryExtension = process.platform === "win32" ? ".exe" : "";
const ffmpegPath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "node_modules",
  "@ffmpeg-installer",
  binaryPlatform,
  `ffmpeg${binaryExtension}`,
);
const ffprobePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "node_modules",
  "@ffprobe-installer",
  binaryPlatform,
  `ffprobe${binaryExtension}`,
);

type ProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

type ProbeResult = {
  streams?: ProbeStream[];
  format?: {
    duration?: string;
  };
};

export type VideoMetadata = {
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
};

export type VideoAnalysis = VideoMetadata & {
  thumbnailPath?: string;
  keyframePaths: string[];
};

function parseFrameRate(value?: string) {
  if (!value || value === "0/0") return undefined;
  const [rawNumerator, rawDenominator] = value.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return undefined;
  return Math.round((numerator / denominator) * 100) / 100;
}

export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const parsed = JSON.parse(stdout) as ProbeResult;
  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const duration = Number(parsed.format?.duration);

  return {
    durationSec: Number.isFinite(duration) ? Math.round(duration) : undefined,
    width: videoStream?.width,
    height: videoStream?.height,
    fps: parseFrameRate(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
  };
}

export async function createThumbnail(filePath: string, assetId: string) {
  const outputDir = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "generated", "thumbnails");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${assetId}.jpg`);

  await execFileAsync(ffmpegPath, [
    "-y",
    "-ss",
    "00:00:01",
    "-i",
    filePath,
    "-frames:v",
    "1",
    "-vf",
    "scale=360:-1",
    "-q:v",
    "3",
    outputPath,
  ]);

  return `/generated/thumbnails/${assetId}.jpg`;
}

function pickKeyframeTimes(durationSec?: number) {
  if (!durationSec || durationSec <= 1) return [0.2];
  if (durationSec <= 3) return [0.4, Math.max(0.8, durationSec / 2), Math.max(1, durationSec - 0.4)];
  return [durationSec * 0.18, durationSec * 0.5, durationSec * 0.82].map((value) => Math.max(0.4, Math.round(value * 10) / 10));
}

export async function createKeyframes(filePath: string, assetId: string, durationSec?: number) {
  const outputDir = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "generated", "keyframes", assetId);
  await mkdir(outputDir, { recursive: true });
  const times = pickKeyframeTimes(durationSec);
  const paths: string[] = [];

  for (const [index, time] of times.entries()) {
    const outputPath = path.join(outputDir, `frame-${String(index + 1).padStart(2, "0")}.jpg`);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss",
      String(time),
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=260:-1",
      "-q:v",
      "4",
      outputPath,
    ]);
    paths.push(`/generated/keyframes/${assetId}/frame-${String(index + 1).padStart(2, "0")}.jpg`);
  }

  return paths;
}

export async function analyzeVideoFile(filePath: string, assetId: string): Promise<VideoAnalysis> {
  const metadata = await probeVideo(filePath);
  let thumbnailPath: string | undefined;
  let keyframePaths: string[] = [];

  try {
    thumbnailPath = await createThumbnail(filePath, assetId);
  } catch {
    thumbnailPath = undefined;
  }

  try {
    keyframePaths = await createKeyframes(filePath, assetId, metadata.durationSec);
  } catch {
    keyframePaths = [];
  }

  return {
    ...metadata,
    thumbnailPath,
    keyframePaths,
  };
}
