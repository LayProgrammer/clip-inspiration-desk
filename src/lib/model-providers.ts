export type ModelProviderId = "local" | "zhipu" | "openai" | "deepseek" | "qwen" | "moonshot" | "doubao" | "custom";

export type ModelProviderPreset = {
  id: ModelProviderId;
  name: string;
  shortName: string;
  envPrefix?: string;
  defaultBaseURL?: string;
  defaultTextModel: string;
  defaultVisionModel: string;
  supportsVision: boolean;
  helpText: string;
};

export const modelProviderPresets: ModelProviderPreset[] = [
  {
    id: "local",
    name: "本地规则",
    shortName: "Local",
    defaultTextModel: "",
    defaultVisionModel: "",
    supportsVision: false,
    helpText: "不调用云端 AI，适合无 key 或隐私优先时使用。",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    shortName: "智谱",
    envPrefix: "ZHIPU",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4/",
    defaultTextModel: "glm-4-flash",
    defaultVisionModel: "glm-4v-flash",
    supportsVision: true,
    helpText: "国内访问友好，适合先用智谱 key 快速测试。",
  },
  {
    id: "openai",
    name: "OpenAI / 中转站",
    shortName: "OpenAI",
    envPrefix: "OPENAI",
    defaultTextModel: "gpt-5.1-mini",
    defaultVisionModel: "gpt-5.1-mini",
    supportsVision: true,
    helpText: "支持官方 OpenAI，也支持填写 OPENAI_BASE_URL 接入中转站。",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    envPrefix: "DEEPSEEK",
    defaultBaseURL: "https://api.deepseek.com",
    defaultTextModel: "deepseek-chat",
    defaultVisionModel: "",
    supportsVision: false,
    helpText: "适合低成本文本灵感生成；视觉读帧建议另选支持图片的模型。",
  },
  {
    id: "qwen",
    name: "通义千问",
    shortName: "通义",
    envPrefix: "QWEN",
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultTextModel: "qwen-plus",
    defaultVisionModel: "qwen-vl-max",
    supportsVision: true,
    helpText: "阿里云 OpenAI 兼容接口，文本和视觉都比较适合国内用户。",
  },
  {
    id: "moonshot",
    name: "Moonshot Kimi",
    shortName: "Kimi",
    envPrefix: "MOONSHOT",
    defaultBaseURL: "https://api.moonshot.cn/v1",
    defaultTextModel: "moonshot-v1-8k",
    defaultVisionModel: "",
    supportsVision: false,
    helpText: "适合长文本整理和路线策划；当前默认不启用视觉模型。",
  },
  {
    id: "doubao",
    name: "火山豆包",
    shortName: "豆包",
    envPrefix: "DOUBAO",
    defaultBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
    defaultTextModel: "doubao-1-5-pro-32k-250115",
    defaultVisionModel: "doubao-1-5-vision-pro-32k-250115",
    supportsVision: true,
    helpText: "火山方舟 OpenAI 兼容接口，适合国内文本和视觉模型。",
  },
  {
    id: "custom",
    name: "自定义兼容接口",
    shortName: "自定义",
    envPrefix: "CUSTOM",
    defaultBaseURL: "",
    defaultTextModel: "",
    defaultVisionModel: "",
    supportsVision: true,
    helpText: "适合 GPT 中转站、One API、New API 或其他 OpenAI-compatible 服务。",
  },
];

export function isModelProviderId(value: string): value is ModelProviderId {
  return modelProviderPresets.some((provider) => provider.id === value);
}

export function getModelProviderPreset(providerId: string | undefined) {
  return modelProviderPresets.find((provider) => provider.id === providerId) ?? modelProviderPresets[0];
}
