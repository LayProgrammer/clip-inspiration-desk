import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalSettings = {
  provider: "local" | "zhipu" | "openai";
  openaiModel: string;
  openaiVisionModel: string;
  zhipuModel: string;
  zhipuVisionModel: string;
  hasOpenaiKey: boolean;
  hasZhipuKey: boolean;
  storageRoot: string;
  generatedRoot: string;
  storageBytes: number;
  generatedBytes: number;
};

const envPath = path.join(/* turbopackIgnore: true */ process.cwd(), ".env.local");
const storageRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
const generatedRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "generated");

function parseEnv(raw: string) {
  const values: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value.replace(/^"(.*)"$/, "$1");
  }
  return values;
}

async function readEnvFile() {
  try {
    return parseEnv(await readFile(envPath, "utf8"));
  } catch {
    return {};
  }
}

async function folderSize(target: string): Promise<number> {
  try {
    const info = await stat(target);
    if (info.isFile()) return info.size;
    if (!info.isDirectory()) return 0;
  } catch {
    return 0;
  }

  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(target, { withFileTypes: true });
  const sizes = await Promise.all(entries.map((entry) => folderSize(path.join(target, entry.name))));
  return sizes.reduce((sum, value) => sum + value, 0);
}

export async function readLocalSettings(): Promise<LocalSettings> {
  const env = { ...process.env, ...(await readEnvFile()) };
  const provider = (env.AI_PROVIDER === "zhipu" || env.AI_PROVIDER === "openai" ? env.AI_PROVIDER : "local") as LocalSettings["provider"];

  return {
    provider,
    openaiModel: env.OPENAI_MODEL || "gpt-5.1-mini",
    openaiVisionModel: env.OPENAI_VISION_MODEL || env.OPENAI_MODEL || "gpt-5.1-mini",
    zhipuModel: env.ZHIPU_MODEL || "glm-4-flash",
    zhipuVisionModel: env.ZHIPU_VISION_MODEL || "glm-4v-flash",
    hasOpenaiKey: Boolean(env.OPENAI_API_KEY),
    hasZhipuKey: Boolean(env.ZHIPU_API_KEY),
    storageRoot,
    generatedRoot,
    storageBytes: await folderSize(storageRoot),
    generatedBytes: await folderSize(generatedRoot),
  };
}

export async function writeLocalSettings(input: {
  provider?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiVisionModel?: string;
  zhipuApiKey?: string;
  zhipuModel?: string;
  zhipuVisionModel?: string;
}) {
  const current = await readEnvFile();
  const next = {
    AI_PROVIDER: input.provider || current.AI_PROVIDER || "local",
    OPENAI_API_KEY: input.openaiApiKey !== undefined ? input.openaiApiKey : current.OPENAI_API_KEY || "",
    OPENAI_MODEL: input.openaiModel || current.OPENAI_MODEL || "gpt-5.1-mini",
    OPENAI_VISION_MODEL: input.openaiVisionModel || current.OPENAI_VISION_MODEL || current.OPENAI_MODEL || "gpt-5.1-mini",
    ZHIPU_API_KEY: input.zhipuApiKey !== undefined ? input.zhipuApiKey : current.ZHIPU_API_KEY || "",
    ZHIPU_MODEL: input.zhipuModel || current.ZHIPU_MODEL || "glm-4-flash",
    ZHIPU_VISION_MODEL: input.zhipuVisionModel || current.ZHIPU_VISION_MODEL || "glm-4v-flash",
  };

  const lines = [
    "# Local-only configuration. Do not commit this file.",
    `AI_PROVIDER=${next.AI_PROVIDER}`,
    "",
    `OPENAI_API_KEY=${next.OPENAI_API_KEY}`,
    `OPENAI_MODEL=${next.OPENAI_MODEL}`,
    `OPENAI_VISION_MODEL=${next.OPENAI_VISION_MODEL}`,
    "",
    `ZHIPU_API_KEY=${next.ZHIPU_API_KEY}`,
    `ZHIPU_MODEL=${next.ZHIPU_MODEL}`,
    `ZHIPU_VISION_MODEL=${next.ZHIPU_VISION_MODEL}`,
    "",
  ];

  await writeFile(envPath, lines.join("\n"), "utf8");
  Object.assign(process.env, next);
  return readLocalSettings();
}

export async function clearLocalWorkspace() {
  const targets = [storageRoot, generatedRoot].map((target) => path.resolve(target));
  const cwd = path.resolve(/* turbopackIgnore: true */ process.cwd());

  for (const target of targets) {
    if (!target.startsWith(cwd)) {
      throw new Error(`Refuse to clear path outside project: ${target}`);
    }
    await rm(target, { force: true, recursive: true });
  }

  await mkdir(path.join(storageRoot, "uploads"), { recursive: true });
  await mkdir(generatedRoot, { recursive: true });
}
