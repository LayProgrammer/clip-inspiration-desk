import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getModelProviderPreset, isModelProviderId, modelProviderPresets, type ModelProviderId } from "./model-providers";

export type LocalSettings = {
  provider: ModelProviderId;
  providerOptions: typeof modelProviderPresets;
  apiKeyConfigured: Record<ModelProviderId, boolean>;
  currentBaseURL: string;
  currentTextModel: string;
  currentVisionModel: string;
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
  const requestedProvider = String(env.AI_PROVIDER ?? "local").toLowerCase();
  const provider = isModelProviderId(requestedProvider) ? requestedProvider : "local";
  const preset = getModelProviderPreset(provider);
  const prefix = preset.envPrefix;
  const currentBaseURL = prefix ? env[`${prefix}_BASE_URL`] || preset.defaultBaseURL || "" : "";
  const currentTextModel = prefix ? env[`${prefix}_MODEL`] || preset.defaultTextModel : "";
  const currentVisionModel = prefix ? env[`${prefix}_VISION_MODEL`] || preset.defaultVisionModel || env[`${prefix}_MODEL`] || "" : "";
  const apiKeyConfigured = Object.fromEntries(
    modelProviderPresets.map((item) => [item.id, item.envPrefix ? Boolean(env[`${item.envPrefix}_API_KEY`]) : false]),
  ) as Record<ModelProviderId, boolean>;

  return {
    provider,
    providerOptions: modelProviderPresets,
    apiKeyConfigured,
    currentBaseURL,
    currentTextModel,
    currentVisionModel,
    storageRoot,
    generatedRoot,
    storageBytes: await folderSize(storageRoot),
    generatedBytes: await folderSize(generatedRoot),
  };
}

export async function writeLocalSettings(input: {
  provider?: string;
  apiKey?: string;
  baseURL?: string;
  textModel?: string;
  visionModel?: string;
}) {
  const current = await readEnvFile();
  const requestedProvider = String(input.provider || current.AI_PROVIDER || "local").toLowerCase();
  const provider = isModelProviderId(requestedProvider) ? requestedProvider : "local";
  const selectedPreset = getModelProviderPreset(provider);
  const next: Record<string, string> = {
    ...current,
    AI_PROVIDER: provider,
  };

  for (const preset of modelProviderPresets) {
    if (!preset.envPrefix) continue;
    next[`${preset.envPrefix}_API_KEY`] = current[`${preset.envPrefix}_API_KEY`] || "";
    next[`${preset.envPrefix}_BASE_URL`] = current[`${preset.envPrefix}_BASE_URL`] || preset.defaultBaseURL || "";
    next[`${preset.envPrefix}_MODEL`] = current[`${preset.envPrefix}_MODEL`] || preset.defaultTextModel;
    next[`${preset.envPrefix}_VISION_MODEL`] = current[`${preset.envPrefix}_VISION_MODEL`] || preset.defaultVisionModel || next[`${preset.envPrefix}_MODEL`];
  }

  if (selectedPreset.envPrefix) {
    const prefix = selectedPreset.envPrefix;
    if (input.apiKey !== undefined) next[`${prefix}_API_KEY`] = input.apiKey;
    if (input.baseURL !== undefined) next[`${prefix}_BASE_URL`] = input.baseURL;
    if (input.textModel) next[`${prefix}_MODEL`] = input.textModel;
    if (input.visionModel !== undefined) next[`${prefix}_VISION_MODEL`] = input.visionModel;
  }

  const lines: string[] = [
    "# Local-only configuration. Do not commit this file.",
    `AI_PROVIDER=${next.AI_PROVIDER}`,
    "",
  ];

  for (const preset of modelProviderPresets) {
    if (!preset.envPrefix) continue;
    const prefix = preset.envPrefix;
    lines.push(`# ${preset.name}`, `${prefix}_API_KEY=${next[`${prefix}_API_KEY`]}`, `${prefix}_BASE_URL=${next[`${prefix}_BASE_URL`]}`, `${prefix}_MODEL=${next[`${prefix}_MODEL`]}`, `${prefix}_VISION_MODEL=${next[`${prefix}_VISION_MODEL`]}`, "");
  }

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
