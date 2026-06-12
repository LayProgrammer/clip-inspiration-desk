import { getModelProviderPreset, isModelProviderId, modelProviderPresets, type ModelProviderId } from "./model-providers";

export type AiRuntimeConfig = {
  provider: Exclude<ModelProviderId, "local">;
  providerName: string;
  apiKey: string;
  baseURL?: string;
  textModel: string;
  visionModel: string;
  supportsVision: boolean;
};

function configuredProvider(providerId: ModelProviderId, mode: "text" | "vision"): AiRuntimeConfig | undefined {
  const preset = getModelProviderPreset(providerId);
  if (!preset.envPrefix) return undefined;
  const apiKey = process.env[`${preset.envPrefix}_API_KEY`];
  const textModel = process.env[`${preset.envPrefix}_MODEL`] || preset.defaultTextModel;
  const visionModel = process.env[`${preset.envPrefix}_VISION_MODEL`] || preset.defaultVisionModel || textModel;
  if (!apiKey) return undefined;
  if (mode === "text" && !textModel) return undefined;
  if (mode === "vision" && (!preset.supportsVision || !visionModel)) return undefined;

  return {
    provider: preset.id as Exclude<ModelProviderId, "local">,
    providerName: preset.shortName,
    apiKey,
    baseURL: process.env[`${preset.envPrefix}_BASE_URL`] || preset.defaultBaseURL,
    textModel,
    visionModel,
    supportsVision: preset.supportsVision,
  };
}

export function resolveAiProvider(mode: "text" | "vision") {
  const requested = String(process.env.AI_PROVIDER ?? "").toLowerCase();
  if (requested === "local") return undefined;

  if (isModelProviderId(requested) && requested !== "local") {
    return configuredProvider(requested, mode);
  }

  for (const preset of modelProviderPresets) {
    if (preset.id === "local") continue;
    const config = configuredProvider(preset.id, mode);
    if (config) return config;
  }

  return undefined;
}
