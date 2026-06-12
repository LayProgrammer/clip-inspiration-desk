"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Clapperboard,
  Copy,
  Download,
  FileText,
  Film,
  FolderPlus,
  Gauge,
  HardDrive,
  KeyRound,
  Layers3,
  Lightbulb,
  ListVideo,
  LoaderCircle,
  MonitorPlay,
  MessageSquareText,
  Music2,
  Play,
  RefreshCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { buildEditingChecklist, buildPublishPlan, buildRemixPrompt, buildRouteExecutionMarkdown } from "@/lib/export-text";
import type { ModelProviderId, ModelProviderPreset } from "@/lib/model-providers";
import type { EditIdea, InspirationReport, MediaAsset, Project, ProjectWorkspace, RouteExecutionPack, TimelineSegment } from "@/lib/types";

const platformOptions = ["小红书", "抖音", "B 站", "朋友圈", "视频号"];
const moodOptions = ["生活感", "搞笑快切", "电影感", "旅行日记", "安静叙事"];
const briefChips = ["30 秒以内", "不要露脸", "更像小红书", "搞笑反差", "电影感一点", "保留现场声", "适合朋友圈", "不要太网红"];
const followUpQuickQuestions = ["压缩到 20 秒怎么剪？", "帮我改得更有反差", "不要露脸重排一次", "给我封面和标题", "把字幕写得更自然"];
type FlowStage = "cover" | "material" | "brief" | "inspiration" | "execute";
type AssetIntent = NonNullable<MediaAsset["userIntent"]>;
type LocalSettings = {
  provider: ModelProviderId;
  providerOptions: ModelProviderPreset[];
  apiKeyConfigured: Record<ModelProviderId, boolean>;
  currentBaseURL: string;
  currentTextModel: string;
  currentVisionModel: string;
  storageRoot: string;
  generatedRoot: string;
  storageBytes: number;
  generatedBytes: number;
};

const defaultSettingsForm = {
  provider: "local" as LocalSettings["provider"],
  apiKey: "",
  baseURL: "",
  textModel: "",
  visionModel: "",
};

const assetIntentOptions: Array<{ value: AssetIntent; label: string; hint: string }> = [
  { value: "auto", label: "自动判断", hint: "交给导演台排序" },
  { value: "opening", label: "开头", hint: "优先放前 3 秒" },
  { value: "must", label: "必用", hint: "执行包必须考虑" },
  { value: "ending", label: "结尾", hint: "优先放收尾" },
  { value: "avoid", label: "禁用", hint: "路线包避开它" },
];

function assetIntentLabel(intent: MediaAsset["userIntent"]) {
  return assetIntentOptions.find((item) => item.value === (intent ?? "auto"))?.label ?? "自动判断";
}

function recommendedIdeaId(ideas: EditIdea[], report: InspirationReport | undefined) {
  if (!ideas.length) return "";
  const recommendedTitle = report?.diagnosis?.recommendedRouteTitle;
  return ideas.find((idea) => idea.title === recommendedTitle)?.id ?? ideas[0].id;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatAssetFacts(asset: MediaAsset) {
  const facts = [formatBytes(asset.sizeBytes)];
  if (asset.durationSec) facts.push(formatTime(asset.durationSec));
  if (asset.width && asset.height) facts.push(`${asset.width} x ${asset.height}`);
  if (asset.fps) facts.push(`${asset.fps} fps`);
  return facts.join(" / ");
}

function hasBrokenEncoding(value: string) {
  const compact = value.replace(/\s/g, "");
  if (!compact) return false;
  const questionMarks = compact.match(/\?/g)?.length ?? 0;
  return questionMarks >= 4 && questionMarks / compact.length > 0.28;
}

function readableFollowUpQuestion(question: string) {
  return hasBrokenEncoding(question) ? "历史追问（旧版本编码异常）" : question;
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const briefInputRef = useRef<HTMLTextAreaElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [ideas, setIdeas] = useState<EditIdea[]>([]);
  const [timeline, setTimeline] = useState<TimelineSegment[]>([]);
  const [routeExecutionPacks, setRouteExecutionPacks] = useState<RouteExecutionPack[]>([]);
  const [inspirationReport, setInspirationReport] = useState<InspirationReport | undefined>();
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [inspirationView, setInspirationView] = useState<"ideas" | "map" | "pack">("ideas");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("小红书");
  const [mood, setMood] = useState("生活感");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [routePackLoading, setRoutePackLoading] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [savingAssetId, setSavingAssetId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [ideaSource, setIdeaSource] = useState<"ai" | "local" | "">("");
  const [ideaProvider, setIdeaProvider] = useState("");
  const [flowStage, setFlowStage] = useState<FlowStage>("cover");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<LocalSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clearingLocalData, setClearingLocalData] = useState(false);

  const hasMedia = media.length > 0;
  const activeIdeas = useMemo(() => (hasMedia ? ideas : []), [hasMedia, ideas]);
  const activeTimeline = useMemo(() => (hasMedia ? timeline : []), [hasMedia, timeline]);
  const activeReport = useMemo(() => (hasMedia && activeIdeas.length > 0 ? inspirationReport : undefined), [activeIdeas.length, hasMedia, inspirationReport]);
  const selectedIdea = activeIdeas.find((idea) => idea.id === selectedIdeaId) ?? activeIdeas[0];
  const selectedRoutePack = selectedIdea ? routeExecutionPacks.find((pack) => pack.ideaId === selectedIdea.id) : undefined;
  const selectedAsset = media.find((asset) => asset.id === selectedAssetId) ?? media[0];
  const timelineDuration = useMemo(() => activeTimeline.reduce((max, item) => Math.max(max, item.endSec), 0), [activeTimeline]);
  const keyframeCount = useMemo(() => media.reduce((sum, item) => sum + (item.keyframePaths?.length ?? 0), 0), [media]);
  const currentStageLabel = {
    cover: "封面",
    material: "素材",
    brief: "目标",
    inspiration: "灵感",
    execute: "执行",
  }[flowStage];
  const noviceCoach = useMemo(() => {
    if (media.length === 0) {
      return {
        title: "先别想怎么剪，先把素材倒进来",
        detail: "内测小白最容易卡在“我要先想主题”。这里建议先上传 3-10 条素材，系统会帮你找故事和开头。",
        action: "上传素材",
        status: "待开始",
      };
    }
    if (!description.trim()) {
      return {
        title: "补一句目标，结果会更像你想要的片子",
        detail: "比如“发抖音，20 秒内，不要露脸，想要生活感”。不用写专业术语，一句人话就够。",
        action: "填写目标",
        status: "缺目标",
      };
    }
    if (activeIdeas.length === 0) {
      return {
        title: "现在可以生成灵感包了",
        detail: "下一步会得到 3 条剪辑方向、素材体检、标题封面建议和可复制清单。",
        action: "生成灵感",
        status: "可生成",
      };
    }
    if (!selectedRoutePack) {
      return {
        title: "把路线变成执行清单",
        detail: "执行清单会按镜头顺序写明素材、字幕、声音、效果和避坑，方便放在剪映旁边照着做。",
        action: "生成清单",
        status: "待执行包",
      };
    }
    if (flowStage !== "execute") {
      return {
        title: "执行清单已准备好，下一步就照着做",
        detail: "先打开执行清单，再复制到剪映旁边。需要改短、不要露脸、换标题封面时，再用追问微调。",
        action: "查看清单",
        status: "可执行",
      };
    }
    return {
      title: "这份清单已经可以带去剪映了",
      detail: "小白建议先复制执行包，再用追问微调：更短、不要露脸、标题封面、字幕口吻都可以继续问。",
      action: "复制执行包",
      status: "可开剪",
    };
  }, [activeIdeas.length, description, flowStage, media.length, selectedRoutePack]);
  const providerOptions = localSettings?.providerOptions ?? [];
  const selectedProviderOption = providerOptions.find((item) => item.id === settingsForm.provider);

  const selectModelProvider = (provider: ModelProviderId) => {
    const option = providerOptions.find((item) => item.id === provider);
    setSettingsForm((current) => ({
      ...current,
      provider,
      apiKey: "",
      baseURL: option?.defaultBaseURL ?? "",
      textModel: option?.defaultTextModel ?? "",
      visionModel: option?.defaultVisionModel ?? "",
    }));
  };

  const applyWorkspace = useCallback((workspace: ProjectWorkspace) => {
    setProject(workspace.project);
    setMedia(workspace.media);
    setIdeas(workspace.ideas);
    setTimeline(workspace.timeline);
    setRouteExecutionPacks(workspace.routeExecutionPacks ?? []);
    setInspirationReport(workspace.inspirationReport);
    setSelectedIdeaId(recommendedIdeaId(workspace.ideas, workspace.inspirationReport));
    setSelectedAssetId(workspace.media[0]?.id ?? "");
    setDescription(workspace.project.description);
    setPlatform(workspace.project.targetPlatform);
    setMood(workspace.project.targetMood);
  }, []);

  const applyLocalSettings = useCallback((settings: LocalSettings) => {
    setLocalSettings(settings);
    setSettingsForm((current) => ({
      ...current,
      provider: settings.provider,
      apiKey: "",
      baseURL: settings.currentBaseURL,
      textModel: settings.currentTextModel,
      visionModel: settings.currentVisionModel,
    }));
  }, []);

  const loadLocalSettings = useCallback(async () => {
    const response = await fetch("/api/local/settings");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "本地设置读取失败。");
    applyLocalSettings(data);
  }, [applyLocalSettings]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/projects");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        applyWorkspace(data);
        await loadLocalSettings();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "工作台加载失败。");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [applyWorkspace, loadLocalSettings]);

  const createProject = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `素材项目 ${new Date().toLocaleDateString("zh-CN")}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      applyWorkspace(data);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新建项目失败。");
    } finally {
      setLoading(false);
    }
  };

  const saveLocalSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      const response = await fetch("/api/local/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          apiKey: settingsForm.apiKey.trim() ? settingsForm.apiKey : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "本地设置保存失败。");
      applyLocalSettings(data);
      setIdeaSource("");
      setIdeaProvider("");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "本地设置保存失败。");
    } finally {
      setSavingSettings(false);
    }
  };

  const clearLocalData = async () => {
    if (!window.confirm("这会删除本机 storage 和生成的关键帧/缩略图，但不会删除 .env.local。确定继续吗？")) return;
    setClearingLocalData(true);
    setError("");
    try {
      const response = await fetch("/api/local/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLEAR_LOCAL_DATA" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "本地数据清理失败。");
      applyLocalSettings(data.settings);
      const workspace = await fetch("/api/projects").then((item) => item.json());
      applyWorkspace(workspace);
      setFlowStage("cover");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "本地数据清理失败。");
    } finally {
      setClearingLocalData(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!project || !files?.length) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("projectId", project.id);
    Array.from(files).forEach((file) => form.append("files", file));

    try {
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProject(data.project);
      setMedia((current) => [...current, ...data.media]);
      setSelectedAssetId(data.media[0]?.id ?? selectedAssetId);
      setFlowStage("brief");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "视频上传失败。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generateIdeas = async () => {
    if (!project) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, description, platform, mood }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProject(data.project);
      setIdeas(data.ideas);
      setTimeline(data.timeline);
      setRouteExecutionPacks([]);
      setInspirationReport(data.inspirationReport);
      setSelectedIdeaId(recommendedIdeaId(data.ideas, data.inspirationReport));
      setInspirationView("ideas");
      setFlowStage("inspiration");
      setIdeaSource(data.source ?? "local");
      setIdeaProvider(data.provider ? `${data.provider}${data.model ? ` · ${data.model}` : ""}` : "");
      if (data.aiError) setError(`AI 暂时不可用，已使用本地灵感规则：${data.aiError}`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "生成方案失败。");
    } finally {
      setGenerating(false);
    }
  };

  const reanalyzeMedia = async () => {
    if (!project || media.length === 0) return;
    setReanalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/media/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProject(data.project);
      setMedia(data.media);
    } catch (reanalyzeError) {
      setError(reanalyzeError instanceof Error ? reanalyzeError.message : "重新分析素材失败。");
    } finally {
      setReanalyzing(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    setError("");
    try {
      const response = await fetch(`/api/media?assetId=${encodeURIComponent(assetId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMedia((current) => current.filter((asset) => asset.id !== assetId));
      setTimeline((current) => current.filter((item) => item.assetId !== assetId));
      if (assetId === selectedAssetId) setSelectedAssetId("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除素材失败。");
    }
  };

  const updateAssetIntent = async (assetId: string, userIntent: AssetIntent) => {
    setSavingAssetId(assetId);
    setError("");
    try {
      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, userIntent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMedia((current) => current.map((asset) => (asset.id === assetId ? data.asset : asset)));
      setRouteExecutionPacks(data.routeExecutionPacks ?? []);
    } catch (intentError) {
      setError(intentError instanceof Error ? intentError.message : "保存素材篮标记失败。");
    } finally {
      setSavingAssetId("");
    }
  };

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const routePackMarkdown = () => {
    if (!project || !selectedIdea || !selectedRoutePack) return "";
    return buildRouteExecutionMarkdown(project, selectedIdea, selectedRoutePack, activeReport);
  };

  const chooseRouteForExecution = async (ideaId = selectedIdea?.id) => {
    if (!project || !ideaId) return;
    setSelectedIdeaId(ideaId);
    setRoutePackLoading(true);
    setError("");
    try {
      const response = await fetch("/api/route-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, ideaId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProject(data.project);
      setRouteExecutionPacks((current) => current.filter((pack) => pack.ideaId !== ideaId).concat(data.routePack));
      setFlowStage("execute");
    } catch (routePackError) {
      setError(routePackError instanceof Error ? routePackError.message : "生成路线执行包失败。");
    } finally {
      setRoutePackLoading(false);
    }
  };

  const copyRoutePack = async () => {
    const markdown = routePackMarkdown();
    if (!markdown) return;
    await copyText(markdown, "route-pack");
  };

  const downloadRoutePack = () => {
    const markdown = routePackMarkdown();
    if (!markdown || !project || !selectedIdea) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${project.name}-${selectedIdea.title}`.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
    link.href = url;
    link.download = `${filename || "route-pack"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCopied("route-download");
    window.setTimeout(() => setCopied(""), 1400);
  };

  const askRouteFollowUp = async (question = followUpQuestion) => {
    const trimmed = question.trim();
    if (!project || !selectedIdea || !selectedRoutePack || !trimmed) return;
    setFollowUpLoading(true);
    setError("");
    try {
      const response = await fetch("/api/route-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, ideaId: selectedIdea.id, question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "继续追问失败。");
      setProject(data.project);
      setRouteExecutionPacks((current) => current.map((pack) => (pack.id === data.routePack.id ? data.routePack : pack)));
      setFollowUpQuestion("");
    } catch (followUpError) {
      setError(followUpError instanceof Error ? followUpError.message : "继续追问失败。");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const addBriefChip = (chip: string) => {
    setDescription((current) => {
      if (current.includes(chip)) return current;
      const prefix = current.trim();
      return prefix ? `${prefix}，${chip}` : chip;
    });
  };

  const openBriefStage = () => {
    setFlowStage("brief");
    window.setTimeout(() => briefInputRef.current?.focus(), 80);
  };

  const startFlow = () => {
    if (!hasMedia) {
      setFlowStage("material");
      return;
    }
    if (!description) {
      openBriefStage();
      return;
    }
    setFlowStage(activeIdeas.length > 0 ? "inspiration" : "brief");
  };

  const copyInspirationPack = async () => {
    if (!activeReport || !project) return;
    const pack = [
      `剪辑灵感包：${project.name}`,
      activeReport.summary,
      "",
      "开头钩子：",
      ...activeReport.hookBank.map((item, index) => `${index + 1}. ${item}`),
      "",
      "标题 / 封面方向：",
      ...activeReport.titleBank.map((item, index) => `${index + 1}. ${item}`),
      "",
      "素材体检：",
      `故事潜力：${activeReport.diagnosis.storyPotentialScore}/100`,
      `剪辑难度：${activeReport.diagnosis.editingDifficulty}`,
      `导演判断：${activeReport.diagnosis.verdict}`,
      `推荐路线：${activeReport.diagnosis.recommendedRouteTitle}`,
      `推荐理由：${activeReport.diagnosis.whyThisRoute}`,
      "",
      "最佳开头素材：",
      ...activeReport.diagnosis.bestOpeningAssets.map((item) => `- ${item.assetName}：${item.reason}`),
      "",
      "必用素材：",
      ...activeReport.diagnosis.mustUseAssets.map((item) => `- ${item.assetName}：${item.reason}`),
      "",
      "素材缺口：",
      ...activeReport.diagnosis.missingShots.map((item) => `- ${item}`),
      "",
      "风险提醒：",
      ...activeReport.blindSpots.map((item) => `- ${item}`),
      "",
      "继续追问 AI：",
      ...activeReport.remixPrompts.map((item) => `- ${item}`),
      "",
      "下一步：",
      ...activeReport.nextActions.map((item) => `- ${item}`),
    ].join("\n");
    await copyText(pack, "pack");
  };

  const copyExportText = async (kind: "checklist" | "publish" | "remix") => {
    if (!project || !selectedIdea) return;
    const builders = {
      checklist: () => selectedRoutePack ? buildRouteExecutionMarkdown(project, selectedIdea, selectedRoutePack, activeReport) : buildEditingChecklist(project, media, selectedIdea, activeTimeline, activeReport),
      publish: () => buildPublishPlan(project, selectedIdea, activeReport),
      remix: () => buildRemixPrompt(project, selectedIdea, activeReport),
    };
    await copyText(builders[kind](), kind);
  };

  const runNoviceNextStep = async () => {
    if (media.length === 0) {
      fileInputRef.current?.click();
      return;
    }
    if (!description.trim()) {
      openBriefStage();
      return;
    }
    if (activeIdeas.length === 0) {
      await generateIdeas();
      return;
    }
    if (!selectedRoutePack && selectedIdea) {
      await chooseRouteForExecution(selectedIdea.id);
      return;
    }
    if (flowStage !== "execute") {
      setFlowStage("execute");
      return;
    }
    await copyRoutePack();
  };

  if (loading || !project) {
    return (
      <main className="loading-screen">
        <LoaderCircle className="spin" size={28} />
        <strong>正在打开剪辑灵感台...</strong>
      </main>
    );
  }

  return (
    <main className={`editor-shell stage-${flowStage}`}>
      <input accept="video/*,.mov,.m4v,.avi" hidden multiple onChange={(event) => void uploadFiles(event.target.files)} ref={fileInputRef} type="file" />

      <section className="editor-body">
        <header className="app-bar">
          <div className="project-identity">
            <button className="project-icon" onClick={createProject} title="新建项目"><FolderPlus size={17} /></button>
            <div><strong>剪辑灵感台</strong><span>{project.name} · 本地自动保存</span></div>
          </div>
          <div className="flow-steps" aria-label="使用流程">
            <button className={flowStage === "cover" ? "active" : ""} onClick={() => setFlowStage("cover")} type="button"><strong>0</strong>封面</button>
            <button className={media.length > 0 ? "done" : flowStage === "material" ? "active" : ""} onClick={() => setFlowStage("material")} type="button"><strong>1</strong>导入素材</button>
            <button className={description ? "done" : flowStage === "brief" ? "active" : ""} onClick={openBriefStage} type="button"><strong>2</strong>描述目标</button>
            <button className={activeIdeas.length > 0 ? "done" : flowStage === "inspiration" ? "active" : ""} onClick={() => setFlowStage("inspiration")} type="button"><strong>3</strong>生成灵感</button>
            <button className={flowStage === "execute" ? "active" : activeTimeline.length > 0 ? "done" : ""} onClick={() => setFlowStage("execute")} type="button"><strong>4</strong>执行清单</button>
          </div>
          <div className="app-actions">
            <button onClick={() => setSettingsOpen(true)} type="button">
              <Settings size={16} />本地设置
            </button>
            <button disabled={reanalyzing || media.length === 0} onClick={reanalyzeMedia} type="button">
              {reanalyzing ? <LoaderCircle className="spin" size={16} /> : <RefreshCcw size={16} />}重新分析
            </button>
            <button className="generate-button" disabled={generating || media.length === 0} onClick={generateIdeas} type="button">
              {generating ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
              {generating ? "导演正在构思" : "生成灵感包"}
            </button>
          </div>
        </header>

        {error && <div className="error-banner"><AlertCircle size={17} />{error}</div>}

        {settingsOpen && (
          <section className="settings-overlay" aria-label="本地开源版设置">
            <div className="settings-panel">
              <div className="settings-header">
                <div>
                  <span><ShieldCheck size={15} />Local Open Source</span>
                  <strong>本地设置</strong>
                  <p>素材保存在本机。AI key 只写入本项目的 .env.local，不会提交到开源仓库。</p>
                </div>
                <button onClick={() => setSettingsOpen(false)} title="关闭设置" type="button"><X size={17} /></button>
              </div>

              <div className="settings-grid">
                <section className="settings-card">
                  <h3><KeyRound size={16} />AI 模型</h3>
                  <label>
                    Provider
                    <select
                      onChange={(event) => selectModelProvider(event.target.value as ModelProviderId)}
                      value={settingsForm.provider}
                    >
                      {providerOptions.map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="settings-status multi">
                    {providerOptions.filter((provider) => provider.id !== "local").map((provider) => (
                      <span className={localSettings?.apiKeyConfigured?.[provider.id] ? "ready" : ""} key={provider.id}>
                        {provider.shortName} {localSettings?.apiKeyConfigured?.[provider.id] ? "已配置" : "未配置"}
                      </span>
                    ))}
                  </div>
                  {selectedProviderOption && <small className="settings-note">{selectedProviderOption.helpText}</small>}
                  {settingsForm.provider !== "local" && (
                    <>
                      <label>
                        API key
                        <input
                          onChange={(event) => setSettingsForm((current) => ({ ...current, apiKey: event.target.value }))}
                          placeholder={localSettings?.apiKeyConfigured?.[settingsForm.provider] ? "已保存；留空表示不修改" : "填入当前供应商的 API key"}
                          type="password"
                          value={settingsForm.apiKey}
                        />
                      </label>
                      <label>
                        Base URL
                        <input
                          onChange={(event) => setSettingsForm((current) => ({ ...current, baseURL: event.target.value }))}
                          placeholder="OpenAI-compatible baseURL，可留空使用默认"
                          value={settingsForm.baseURL}
                        />
                      </label>
                      <div className="settings-row">
                        <label>文本模型<input onChange={(event) => setSettingsForm((current) => ({ ...current, textModel: event.target.value }))} value={settingsForm.textModel} /></label>
                        <label>视觉模型<input onChange={(event) => setSettingsForm((current) => ({ ...current, visionModel: event.target.value }))} value={settingsForm.visionModel} /></label>
                      </div>
                    </>
                  )}
                  <button className="settings-primary" disabled={savingSettings} onClick={saveLocalSettings} type="button">
                    {savingSettings ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
                    保存到 .env.local
                  </button>
                </section>

                <section className="settings-card">
                  <h3><HardDrive size={16} />本地数据</h3>
                  <p>项目数据、上传视频、缩略图和关键帧都在本机目录里。开源发布时不要提交这些目录。</p>
                  <div className="storage-meter">
                    <span>storage</span>
                    <strong>{formatBytes(localSettings?.storageBytes ?? 0)}</strong>
                    <small>{localSettings?.storageRoot ?? "storage"}</small>
                  </div>
                  <div className="storage-meter">
                    <span>generated</span>
                    <strong>{formatBytes(localSettings?.generatedBytes ?? 0)}</strong>
                    <small>{localSettings?.generatedRoot ?? "public/generated"}</small>
                  </div>
                  <button className="settings-danger" disabled={clearingLocalData} onClick={clearLocalData} type="button">
                    {clearingLocalData ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                    清理本地素材与项目
                  </button>
                  <small className="settings-note">清理不会删除 .env.local，也不会删除源码。新用户首次启动时会自动创建空项目。</small>
                </section>
              </div>
            </div>
          </section>
        )}

        {flowStage === "cover" && (
          <section className="cover-hero" aria-label="剪辑灵感台封面">
            <div className="cover-copy">
              <span className="cover-kicker"><Sparkles size={15} />AI 素材导演</span>
              <h1>把一堆素材，变成能开剪的故事。</h1>
              <p>剪辑灵感台不替代剪映。它先帮你看素材、抓主题、找开头、排结构，再输出一份可以直接带去剪映执行的灵感包。</p>
              <div className="cover-actions">
                <button className="cover-primary" onClick={startFlow} type="button"><WandSparkles size={17} />开始整理素材</button>
                <button className="cover-secondary" onClick={() => setFlowStage(activeIdeas.length > 0 ? "inspiration" : "material")} type="button"><MonitorPlay size={17} />进入工作台</button>
              </div>
              <div className="cover-stats" aria-label="当前项目状态">
                <span><strong>{media.length}</strong>素材片段</span>
                <span><strong>{keyframeCount}</strong>关键帧</span>
                <span><strong>{activeIdeas.length}</strong>灵感方向</span>
              </div>
            </div>
            <div className="cover-poster" aria-hidden="true">
              <div className="poster-screen">
                <div className="poster-frame poster-frame-one" />
                <div className="poster-frame poster-frame-two" />
                <div className="poster-frame poster-frame-three" />
                <div className="poster-play"><Play fill="currentColor" size={22} /></div>
                <div className="poster-caption">Story Found</div>
              </div>
              <div className="poster-orbit orbit-one">Hook</div>
              <div className="poster-orbit orbit-two">Mood</div>
              <div className="poster-orbit orbit-three">Cut list</div>
            </div>
          </section>
        )}

        <section className="purpose-strip">
          <div><Sparkles size={17} /><strong>{currentStageLabel}阶段</strong><span>这不是剪辑器，它帮你看素材、找故事、生成剪映可执行的灵感包。</span></div>
          <button disabled={media.length === 0 || generating} onClick={generateIdeas} type="button">
            {generating ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
            {activeIdeas.length > 0 ? "重新生成灵感" : "生成灵感包"}
          </button>
        </section>

        <section className="novice-coach" aria-label="小白下一步建议">
          <div className="novice-coach-main">
            <span><Gauge size={15} />{noviceCoach.status}</span>
            <strong>{noviceCoach.title}</strong>
            <p>{noviceCoach.detail}</p>
          </div>
          <div className="novice-coach-side">
            <small>小白内测提示</small>
            <button disabled={uploading || generating || routePackLoading} onClick={() => void runNoviceNextStep()} type="button">
              {uploading || generating || routePackLoading ? <LoaderCircle className="spin" size={15} /> : <Target size={15} />}
              {noviceCoach.action}
            </button>
          </div>
        </section>

        <section className="workflow-board" aria-label="灵感生成流程">
          <article className={media.length > 0 ? "workflow-card done" : flowStage === "material" ? "workflow-card active" : "workflow-card"}>
            <div className="workflow-index"><UploadCloud size={17} /><span>01</span></div>
            <div>
              <strong>把素材倒进来</strong>
              <p>{media.length > 0 ? `已整理 ${media.length} 个片段和 ${keyframeCount} 张关键帧` : "先上传一批视频，系统会自动生成镜头档案。"}</p>
            </div>
            <button disabled={uploading} onClick={() => fileInputRef.current?.click()} type="button">
              {uploading ? <LoaderCircle className="spin" size={15} /> : <UploadCloud size={15} />}
              {media.length > 0 ? "继续加素材" : "上传素材"}
            </button>
          </article>
          <article className={description ? "workflow-card done" : flowStage === "brief" ? "workflow-card active" : "workflow-card"}>
            <div className="workflow-index"><MessageSquareText size={17} /><span>02</span></div>
            <div>
              <strong>说清楚你想要的感觉</strong>
              <p>{description ? "创作目标已记录，AI 会按这个方向找故事。" : "用一句话告诉它：发到哪里、想要什么情绪、有什么限制。"}</p>
            </div>
            <button onClick={openBriefStage} type="button">
              <MessageSquareText size={15} />
              {description ? "修改目标" : "填写目标"}
            </button>
          </article>
          <article className={activeIdeas.length > 0 ? "workflow-card done" : flowStage === "inspiration" ? "workflow-card active" : "workflow-card"}>
            <div className="workflow-index"><Lightbulb size={17} /><span>03</span></div>
            <div>
              <strong>拿到可执行灵感包</strong>
              <p>{activeIdeas.length > 0 ? "已生成方向、素材地图和可复制清单。" : "生成选题方向、开头钩子、字幕、声音和剪映执行清单。"}</p>
            </div>
            <button disabled={media.length === 0 || generating} onClick={generateIdeas} type="button">
              {generating ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
              {activeIdeas.length > 0 ? "重新生成" : "生成灵感"}
            </button>
          </article>
          <article className={flowStage === "execute" ? "workflow-card active" : activeTimeline.length > 0 ? "workflow-card done" : "workflow-card"}>
            <div className="workflow-index"><Layers3 size={17} /><span>04</span></div>
            <div>
              <strong>照着清单去剪映执行</strong>
              <p>{activeTimeline.length > 0 ? `${activeTimeline.length} 段镜头顺序已排好，可复制到剪映旁边照做。` : "灵感包生成后，这里会整理成镜头顺序、字幕和效果提醒。"}</p>
            </div>
            <button onClick={() => setFlowStage("execute")} type="button">
              <Layers3 size={15} />
              查看清单
            </button>
          </article>
        </section>

        {flowStage !== "cover" && (
        <div className="editor-grid">
          {(flowStage === "material" || flowStage === "brief") && <aside className="media-browser">
            <div className="panel-header">
              <div><strong>素材库</strong><span>{media.length} 个片段 · {keyframeCount} 张关键帧</span></div>
              <button disabled={uploading} onClick={() => fileInputRef.current?.click()} title="上传视频">
                {uploading ? <LoaderCircle className="spin" size={17} /> : <UploadCloud size={17} />}
              </button>
            </div>
            <div className="search-box"><Search size={15} /><input placeholder="搜索素材" /></div>
            {media.length === 0 ? (
              <button className="library-empty" onClick={() => fileInputRef.current?.click()} type="button">
                <UploadCloud size={25} /><strong>导入第一批素材</strong><span>支持多选视频，上传后自动分析镜头</span>
              </button>
            ) : (
              <div className="asset-list">
                {media.map((asset) => (
                  <button className={asset.id === selectedAsset?.id ? "asset-tile active" : "asset-tile"} key={asset.id} onClick={() => setSelectedAssetId(asset.id)} type="button">
                    <div className="asset-thumb">
                      {asset.thumbnailPath ? <Image alt={asset.originalName} fill sizes="98px" src={asset.thumbnailPath} unoptimized /> : <Film size={22} />}
                      <span>{asset.durationSec ? formatTime(asset.durationSec) : "--:--"}</span>
                    </div>
                    <div className="asset-info"><strong>{asset.originalName}</strong><span>{asset.role}</span><small>{formatBytes(asset.sizeBytes)} · {asset.lensProfile}</small></div>
                  </button>
                ))}
              </div>
            )}
          </aside>}

          {(flowStage === "material" || flowStage === "brief" || flowStage === "inspiration") && <section className="director-canvas">
            <div className="canvas-toolbar">
              <div><MonitorPlay size={16} /><strong>导演监看台</strong></div>
              <div className="canvas-stats"><span><ListVideo size={14} />{media.length}</span><span><Gauge size={14} />{formatBytes(media.reduce((sum, item) => sum + item.sizeBytes, 0))}</span></div>
            </div>
            <div className="preview-stage">
              {selectedAsset?.thumbnailPath ? (
                <div className="preview-frame">
                  <Image alt={selectedAsset.originalName} fill priority sizes="50vw" src={selectedAsset.thumbnailPath} unoptimized />
                  <button className="preview-play" type="button"><Play fill="currentColor" size={22} /></button>
                </div>
              ) : (
                <div className="preview-placeholder"><Clapperboard size={35} /><strong>等待素材进入监看台</strong><span>上传视频后，这里会展示镜头档案和导演判断</span></div>
              )}
            </div>
            {selectedAsset && (
              <div className="shot-inspector">
                <div className="shot-title"><div><span className="status-dot" />镜头档案</div><button onClick={() => void deleteAsset(selectedAsset.id)} title="删除素材"><Trash2 size={15} /></button></div>
                <strong>{selectedAsset.originalName}</strong>
                <small>{formatAssetFacts(selectedAsset)}</small>
                <div className="asset-basket">
                  <div><Star size={15} /><strong>素材篮</strong><span>告诉执行包这条素材怎么用</span></div>
                  <div className="asset-intent-row">
                    {assetIntentOptions.map((option) => (
                      <button
                        className={(selectedAsset.userIntent ?? "auto") === option.value ? "active" : ""}
                        disabled={savingAssetId === selectedAsset.id}
                        key={option.value}
                        onClick={() => void updateAssetIntent(selectedAsset.id, option.value)}
                        title={option.hint}
                        type="button"
                      >
                        {option.value === "avoid" ? <Ban size={14} /> : option.value === "opening" ? <Play size={14} /> : option.value === "ending" ? <Target size={14} /> : option.value === "must" ? <Star size={14} /> : <Sparkles size={14} />}
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {(selectedAsset.userIntent ?? "auto") !== "auto" && <small>下次生成路线执行包时，会优先尊重这个标记。</small>}
                </div>
                <p>{selectedAsset.directorNote ?? "等待进一步画面分析。"}</p>
                <div className="frame-ribbon">
                  {(selectedAsset.keyframePaths ?? []).map((frame, index) => (
                    <div className="ribbon-frame" key={frame}><Image alt={`关键帧 ${index + 1}`} fill sizes="120px" src={frame} unoptimized /><span>0{index + 1}</span></div>
                  ))}
                </div>
                <div className={`vision-card vision-${selectedAsset.visionStatus ?? "skipped"}`}>
                  <div className="vision-card-title">
                    <Sparkles size={15} />
                    <strong>视觉导演读帧</strong>
                    <span>
                      {selectedAsset.visionStatus === "ready"
                        ? `${selectedAsset.visualConfidence ?? 60}%`
                        : selectedAsset.visionStatus === "failed"
                          ? "待重试"
                          : "未接入"}
                    </span>
                  </div>
                  {selectedAsset.visionStatus === "ready" ? (
                    <>
                      <p>{selectedAsset.visualSummary}</p>
                      <div className="vision-meta">
                        <span>{selectedAsset.sceneType}</span>
                        <span>{selectedAsset.visualMood}</span>
                        <span>{selectedAsset.visionModel}</span>
                      </div>
                      {selectedAsset.visibleSubjects && selectedAsset.visibleSubjects.length > 0 && (
                        <small>主体：{selectedAsset.visibleSubjects.join(" / ")}</small>
                      )}
                      {selectedAsset.visualHook && <small>开头建议：{selectedAsset.visualHook}</small>}
                    </>
                  ) : (
                    <p>{selectedAsset.visionError ?? "重新分析素材后，会尝试读取关键帧并生成更准确的画面判断。"}</p>
                  )}
                </div>
                <div className="media-tags">{selectedAsset.tags.map((tag) => <span key={tag}>{tag}</span>)}<span>{selectedAsset.role}</span></div>
              </div>
            )}
            <div className="creative-brief">
              <div className="brief-heading"><div><MessageSquareText size={16} /><strong>告诉导演，你想剪成什么</strong></div><span>{description.length}/300</span></div>
              <textarea maxLength={300} onChange={(event) => setDescription(event.target.value)} placeholder="例如：一次很松弛的朋友旅行，真实一点，不要太网红。" ref={briefInputRef} value={description} />
              <div className="brief-chip-row">
                {briefChips.map((chip) => <button key={chip} onClick={() => addBriefChip(chip)} type="button">{chip}</button>)}
              </div>
              <div className="brief-selectors">
                <label>发布到<select onChange={(event) => setPlatform(event.target.value)} value={platform}>{platformOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>整体感觉<select onChange={(event) => setMood(event.target.value)} value={mood}>{moodOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
            </div>
          </section>}

          {(flowStage === "inspiration" || flowStage === "execute") && <aside className="idea-panel">
            <div className="panel-header">
              <div><strong>灵感导演</strong><span>{ideaSource === "ai" ? `AI 已接管创意策划${ideaProvider ? ` · ${ideaProvider}` : ""}` : ideaSource === "local" ? "本地规则生成，可接入 API key 升级" : "发现素材里的故事机会"}</span></div>
              {activeReport && <button onClick={() => void copyInspirationPack()} title="复制灵感包"><Copy size={16} /></button>}
            </div>
            {activeIdeas.length === 0 ? (
              <div className="idea-empty"><div className="idea-orbit"><Sparkles size={23} /></div><strong>{hasMedia ? "素材已经就位" : "先导入素材"}</strong><p>{hasMedia ? "填写创作想法后，生成三条不同的灵感路线。" : "上传视频后，这里会输出方向、素材地图和灵感包。"}</p><button disabled={!hasMedia || generating} onClick={generateIdeas}>{generating ? "正在构思..." : "开始构思"}</button></div>
            ) : (
              <>
                <div className="inspiration-tabs">
                  <button className={inspirationView === "ideas" ? "active" : ""} onClick={() => setInspirationView("ideas")}>方向</button>
                  <button className={inspirationView === "map" ? "active" : ""} onClick={() => setInspirationView("map")}>素材体检</button>
                  <button className={inspirationView === "pack" ? "active" : ""} onClick={() => setInspirationView("pack")}>灵感包</button>
                </div>
                {inspirationView === "ideas" && selectedIdea && (
                  <>
                    <div className="proposal-tabs">
                      {activeIdeas.map((idea, index) => {
                        const isRecommended = activeReport?.diagnosis.recommendedRouteTitle === idea.title;
                        return (
                          <button className={idea.id === selectedIdea?.id ? "active" : ""} key={idea.id} onClick={() => setSelectedIdeaId(idea.id)}>
                            <span>方案 {index + 1}</span>
                            {isRecommended && <small>推荐先剪</small>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="proposal-detail">
                      <span className="proposal-kicker"><BadgeCheck size={14} />{selectedIdea.platform} · {selectedIdea.durationSec} 秒{activeReport?.diagnosis.recommendedRouteTitle === selectedIdea.title ? " · 推荐先剪" : ""}</span>
                      <h2>{selectedIdea.title}</h2>
                      <p>{selectedIdea.hook}</p>
                      <div className="route-score-grid" aria-label="路线评分">
                        <div><span>{selectedIdea.materialMatchScore ?? 80}</span><small>素材匹配</small></div>
                        <div><span>{selectedIdea.publishPotentialScore ?? 76}</span><small>发布潜力</small></div>
                        <div><span>{selectedIdea.noviceScore ?? 74}</span><small>新手友好</small></div>
                        <div><span>{selectedIdea.difficultyScore ?? 48}</span><small>剪辑难度</small></div>
                      </div>
                      {selectedIdea.recommendationReason && <div className="route-reason"><Lightbulb size={15} />{selectedIdea.recommendationReason}</div>}
                      <div className="proposal-steps">{selectedIdea.structure.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></div>)}</div>
                      <div className="proposal-note"><Music2 size={15} /><span>{selectedIdea.musicSuggestion}</span></div>
                      <div className="proposal-note"><Sparkles size={15} /><span>{selectedIdea.effectSuggestions.join(" / ")}</span></div>
                      <button className="route-commit-button" disabled={routePackLoading} onClick={() => void chooseRouteForExecution(selectedIdea.id)} type="button">
                        {routePackLoading ? <LoaderCircle className="spin" size={16} /> : <Layers3 size={16} />}
                        {routePackLoading ? "正在生成执行包" : "就按这条剪"}
                      </button>
                    </div>
                  </>
                )}
                {inspirationView === "map" && activeReport && (
                  <div className="inspiration-scroll">
                    <section className="diagnosis-board">
                      <div className="diagnosis-score">
                        <span>故事潜力</span>
                        <strong>{activeReport.diagnosis.storyPotentialScore}</strong>
                        <small>/100</small>
                      </div>
                      <div className="diagnosis-verdict">
                        <div><Target size={17} /><strong>素材体检结论</strong><span>{activeReport.diagnosis.editingDifficulty}</span></div>
                        <p>{activeReport.diagnosis.verdict}</p>
                        <small>推荐先剪：{activeReport.diagnosis.recommendedRouteTitle}。{activeReport.diagnosis.whyThisRoute}</small>
                      </div>
                    </section>
                    <div className="diagnosis-picks">
                      <section>
                        <h3>最佳开头</h3>
                        {activeReport.diagnosis.bestOpeningAssets.map((item) => <p key={`${item.assetName}-opening`}><strong>{item.assetName}</strong><span>{item.reason}</span></p>)}
                      </section>
                      <section>
                        <h3>必用素材</h3>
                        {activeReport.diagnosis.mustUseAssets.map((item) => <p key={`${item.assetName}-must`}><strong>{item.assetName}</strong><span>{item.reason}</span></p>)}
                      </section>
                      <section>
                        <h3>可先放弃</h3>
                        {activeReport.diagnosis.optionalAssets.map((item) => <p key={`${item.assetName}-optional`}><strong>{item.assetName}</strong><span>{item.reason}</span></p>)}
                      </section>
                    </div>
                    <section className="missing-shot-list">
                      <h3>素材缺口提醒</h3>
                      {activeReport.diagnosis.missingShots.map((item) => <p key={item}>{item}</p>)}
                    </section>
                    <div className="report-summary"><Target size={17} /><p>{activeReport.summary}</p></div>
                    <div className="material-map">
                      {activeReport.materialMap.map((item) => (
                        <article key={item.category}>
                          <div><strong>{item.category}</strong><span>{item.count}</span></div>
                          <p>{item.insight}</p>
                          <small>{item.assetNames.length ? item.assetNames.join(" / ") : "暂无明确素材"}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {inspirationView === "pack" && activeReport && (
                  <div className="inspiration-scroll">
                    <section className="export-actions">
                      <button onClick={() => void copyInspirationPack()} type="button"><Copy size={14} />{copied === "pack" ? "已复制灵感包" : "复制灵感包"}</button>
                      <button onClick={() => void copyExportText("checklist")} type="button"><Copy size={14} />{copied === "checklist" ? "已复制清单" : "剪映执行清单"}</button>
                      <button onClick={() => void copyExportText("publish")} type="button"><Copy size={14} />{copied === "publish" ? "已复制发布方案" : "发布方案"}</button>
                      <button onClick={() => void copyExportText("remix")} type="button"><Copy size={14} />{copied === "remix" ? "已复制追问" : "追问 AI"}</button>
                    </section>
                    <section className="pack-section"><h3>开头钩子库</h3>{activeReport.hookBank.map((item, index) => <p key={item}><span>{index + 1}</span>{item}</p>)}</section>
                    <section className="pack-section title-section"><h3>标题 / 封面方向</h3>{activeReport.titleBank.map((item, index) => <p key={item}><span>{index + 1}</span>{item}</p>)}</section>
                    <section className="pack-section"><h3>风格配方</h3>{activeReport.styleRecipes.map((recipe) => <article className="recipe-card" key={recipe.name}><strong>{recipe.name}</strong><p>节奏：{recipe.rhythm}</p><p>色彩：{recipe.color}</p><p>字幕：{recipe.subtitle}</p><p>声音：{recipe.sound}</p></article>)}</section>
                    <section className="pack-section audio-section"><h3>声音灵感</h3><p>{activeReport.audioGuide.musicDirection}</p>{activeReport.audioGuide.soundHooks.map((item) => <p key={item}>{item}</p>)}</section>
                    <section className="pack-section caption-section"><h3>字幕灵感</h3><p>{activeReport.captionGuide.tone}</p>{activeReport.captionGuide.openingLines.slice(0, 3).map((item) => <p key={item}>{item}</p>)}</section>
                    <section className="pack-section visual-section"><h3>画面风格</h3><p>{activeReport.visualGuide.colorDirection}</p><p>{activeReport.visualGuide.rhythmDirection}</p>{activeReport.visualGuide.coverIdeas.slice(0, 2).map((item) => <p key={item}>{item}</p>)}</section>
                    <section className="pack-section warning-section"><h3>容易踩坑</h3>{activeReport.blindSpots.map((item) => <p key={item}>{item}</p>)}</section>
                    <section className="pack-section remix-section"><h3>继续追问 AI</h3>{activeReport.remixPrompts.map((item, index) => <p key={item}><span>{index + 1}</span>{item}</p>)}</section>
                    <section className="pack-section action-section"><h3>下一步怎么做</h3>{activeReport.nextActions.map((item) => <p key={item}>{item}</p>)}</section>
                  </div>
                )}
              </>
            )}
          </aside>}
        </div>
        )}

        {flowStage === "execute" && <section className="timeline-dock">
          <div className="timeline-header">
            <div><Layers3 size={16} /><strong>路线执行包</strong><span>{selectedRoutePack ? `${selectedRoutePack.checklist.length} 个操作步骤，可带去剪映照做` : `${timelineDuration}s 建议结构，不在这里剪片`}</span></div>
            <div className="route-pack-actions">
              {selectedRoutePack && <button onClick={() => void copyRoutePack()} type="button"><Copy size={15} />{copied === "route-pack" ? "已复制" : "复制执行包"}</button>}
              {selectedRoutePack && <button onClick={downloadRoutePack} type="button"><Download size={15} />{copied === "route-download" ? "已导出" : "导出 Markdown"}</button>}
              {!selectedRoutePack && selectedIdea && <button disabled={routePackLoading} onClick={() => void chooseRouteForExecution(selectedIdea.id)} type="button">{routePackLoading ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}{routePackLoading ? "正在生成" : "生成执行包"}</button>}
            </div>
          </div>
          {selectedIdea && (
            <div className="execution-route">
              <span>当前执行路线</span>
              <strong>{selectedIdea.title}</strong>
              <p>{selectedRoutePack?.routeSummary ?? selectedIdea.recommendationReason ?? selectedIdea.hook}</p>
            </div>
          )}
          {selectedRoutePack ? (
            <div className="route-pack-board">
              <div className="route-pack-hero">
                <article><span>开头钩子</span><p>{selectedRoutePack.openingHook}</p></article>
                <article><span>封面建议</span><p>{selectedRoutePack.coverSuggestion}</p></article>
              </div>
              <div className="route-pack-grid">
                <article><strong>节奏</strong><p>{selectedRoutePack.rhythmPlan}</p></article>
                <article><strong>声音</strong><p>{selectedRoutePack.soundPlan}</p></article>
                <article><strong>字幕</strong><p>{selectedRoutePack.subtitleStyle}</p></article>
              </div>
              <div className="route-step-list">
                {selectedRoutePack.checklist.map((step, index) => (
                  <article className="route-step-card" key={step.id}>
                    <div className="route-step-index"><span>{String(index + 1).padStart(2, "0")}</span><small>{formatTime(step.startSec)} - {formatTime(step.endSec)}</small></div>
                    <div className="route-step-body">
                      <div><strong>{step.purpose}</strong><small>{step.assetName}</small></div>
                      <p>{step.instruction}</p>
                      <dl>
                        <div><dt>字幕</dt><dd>{step.subtitle}</dd></div>
                        <div><dt>声音</dt><dd>{step.sound}</dd></div>
                        <div><dt>效果</dt><dd>{step.effect}</dd></div>
                        <div><dt>避坑</dt><dd>{step.avoid}</dd></div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
              <section className="route-followup">
                <div className="route-followup-head">
                  <div><MessageSquareText size={16} /><strong>继续追问这条路线</strong><span>让灵感包继续往你的真实需求靠近</span></div>
                  <small>{selectedRoutePack.followUps?.length ? `${selectedRoutePack.followUps.length} 条追问已写入执行包` : "回答会一起进入复制和 Markdown 导出"}</small>
                </div>
                <div className="followup-chips">
                  {followUpQuickQuestions.map((question) => (
                    <button disabled={followUpLoading} key={question} onClick={() => void askRouteFollowUp(question)} type="button">{question}</button>
                  ))}
                </div>
                <div className="followup-input">
                  <textarea
                    onChange={(event) => setFollowUpQuestion(event.target.value)}
                    placeholder="比如：帮我改成更适合抖音的前 3 秒；或者这条路线不要露脸怎么剪？"
                    value={followUpQuestion}
                  />
                  <button disabled={followUpLoading || !followUpQuestion.trim()} onClick={() => void askRouteFollowUp()} type="button">
                    {followUpLoading ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
                    {followUpLoading ? "正在追问" : "追问并写入"}
                  </button>
                </div>
                {selectedRoutePack.followUps?.length ? (
                  <div className="followup-answer-list">
                    {selectedRoutePack.followUps.map((item) => (
                      <article key={item.id}>
                        <div><strong>{readableFollowUpQuestion(item.question)}</strong><span>{item.source === "ai" ? `${item.provider ?? "AI"}${item.model ? ` · ${item.model}` : ""}` : "本地规则"}</span></div>
                        {hasBrokenEncoding(item.question) && <small className="followup-repaired">这条是早期内测记录，问题文本编码异常；回答内容仍保留。</small>}
                        <p>{item.answer}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="followup-empty">你可以继续问：更短怎么剪、不要露脸怎么剪、标题封面怎么做、某个镜头要不要保留。</p>}
              </section>
              <section className="route-review"><strong>发布前复查</strong>{selectedRoutePack.finalReview.map((item) => <p key={item}>{item}</p>)}</section>
            </div>
          ) : <div className="timeline-empty">选定一条灵感路线后，这里会生成更细的镜头操作、字幕、声音、效果和避坑提醒。</div>}
        </section>}

        {false && flowStage === "execute" && <section className="timeline-dock">
          <div className="timeline-header">
            <div><Layers3 size={16} /><strong>带去剪映的执行清单</strong><span>{timelineDuration}s 建议结构，不在这里剪片</span></div>
            {activeTimeline.length > 0 && <button onClick={() => void copyText(activeTimeline.map((item) => `${formatTime(item.startSec)}-${formatTime(item.endSec)} ${item.subtitle}`).join("\n"), "timeline")}><Copy size={15} />{copied === "timeline" ? "已复制" : "复制脚本"}</button>}
          </div>
          {selectedIdea && (
            <div className="execution-route">
              <span>当前执行路线</span>
              <strong>{selectedIdea.title}</strong>
              <p>{selectedIdea.recommendationReason ?? selectedIdea.hook}</p>
            </div>
          )}
          {activeTimeline.length === 0 ? <div className="timeline-empty">生成灵感包后，这里会给出镜头使用顺序、字幕方向和效果建议，方便你照着去剪映里操作。</div> : (
            <div className="timeline-track">
              {activeTimeline.map((item, index) => {
                const asset = media.find((entry) => entry.id === item.assetId);
                return <article className={`track-clip clip-${index % 4}`} key={item.id}><span>{formatTime(item.startSec)} - {formatTime(item.endSec)}</span><strong>{item.purpose}</strong><small>{asset?.originalName ?? "素材"}</small><p>{item.subtitle}</p></article>;
              })}
            </div>
          )}
        </section>}
      </section>
    </main>
  );
}
