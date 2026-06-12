export type ProjectStatus =
  | "draft"
  | "uploaded"
  | "ideas_ready"
  | "timeline_ready"
  | "exported";

export type Project = {
  id: string;
  name: string;
  description: string;
  targetPlatform: string;
  targetMood: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  projectId: string;
  originalName: string;
  storedPath: string;
  thumbnailPath?: string;
  keyframePaths: string[];
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  tags: string[];
  role: string;
  bestUse: "hook" | "scene" | "detail" | "transition" | "ending" | "unknown";
  userIntent?: "auto" | "must" | "opening" | "ending" | "avoid";
  userNote?: string;
  lensProfile: string;
  directorNote: string;
  visualSummary?: string;
  visualTags?: string[];
  visualMood?: string;
  visualHook?: string;
  visibleSubjects?: string[];
  sceneType?: string;
  visualConfidence?: number;
  visionStatus?: "pending" | "ready" | "failed" | "skipped";
  visionModel?: string;
  visionError?: string;
  color: string;
  analysisStatus: "pending" | "ready" | "failed";
  analysisError?: string;
  createdAt: string;
};

export type EditIdea = {
  id: string;
  projectId: string;
  title: string;
  platform: string;
  durationSec: number;
  mood: string;
  hook: string;
  structure: string[];
  recommendedAssets: string[];
  musicSuggestion: string;
  effectSuggestions: string[];
  materialMatchScore?: number;
  noviceScore?: number;
  publishPotentialScore?: number;
  difficultyScore?: number;
  recommendationReason?: string;
  createdAt: string;
};

export type TimelineSegment = {
  id: string;
  projectId: string;
  startSec: number;
  endSec: number;
  assetId: string;
  purpose: string;
  subtitle: string;
  effect: string;
};

export type RouteExecutionStep = {
  id: string;
  assetId?: string;
  assetName: string;
  startSec: number;
  endSec: number;
  purpose: string;
  instruction: string;
  subtitle: string;
  sound: string;
  effect: string;
  avoid: string;
};

export type RouteExecutionPack = {
  id: string;
  projectId: string;
  ideaId: string;
  ideaTitle: string;
  routeSummary: string;
  coverSuggestion: string;
  openingHook: string;
  rhythmPlan: string;
  soundPlan: string;
  subtitleStyle: string;
  checklist: RouteExecutionStep[];
  finalReview: string[];
  followUps?: RouteFollowUp[];
  createdAt: string;
};

export type RouteFollowUp = {
  id: string;
  question: string;
  answer: string;
  source: "ai" | "local";
  provider?: string;
  model?: string;
  createdAt: string;
};

export type MaterialMapItem = {
  category: string;
  count: number;
  assetNames: string[];
  insight: string;
};

export type StyleRecipe = {
  name: string;
  rhythm: string;
  color: string;
  subtitle: string;
  sound: string;
};

export type AudioGuide = {
  musicDirection: string;
  soundHooks: string[];
  beatPlan: string[];
};

export type CaptionGuide = {
  tone: string;
  openingLines: string[];
  transitionLines: string[];
  endingLines: string[];
  rules: string[];
};

export type VisualGuide = {
  colorDirection: string;
  rhythmDirection: string;
  coverIdeas: string[];
  effectIdeas: string[];
};

export type DiagnosisAssetPick = {
  assetName: string;
  reason: string;
};

export type MaterialDiagnosis = {
  storyPotentialScore: number;
  editingDifficulty: "简单" | "中等" | "偏难";
  verdict: string;
  bestOpeningAssets: DiagnosisAssetPick[];
  mustUseAssets: DiagnosisAssetPick[];
  optionalAssets: DiagnosisAssetPick[];
  missingShots: string[];
  recommendedRouteTitle: string;
  whyThisRoute: string;
};

export type InspirationReport = {
  id: string;
  projectId: string;
  summary: string;
  diagnosis: MaterialDiagnosis;
  materialMap: MaterialMapItem[];
  hookBank: string[];
  titleBank: string[];
  styleRecipes: StyleRecipe[];
  audioGuide: AudioGuide;
  captionGuide: CaptionGuide;
  visualGuide: VisualGuide;
  blindSpots: string[];
  remixPrompts: string[];
  nextActions: string[];
  createdAt: string;
};

export type StoreData = {
  projects: Project[];
  media: MediaAsset[];
  ideas: EditIdea[];
  timeline: TimelineSegment[];
  routeExecutionPacks: RouteExecutionPack[];
  inspirationReports: InspirationReport[];
};

export type ProjectWorkspace = {
  project: Project;
  media: MediaAsset[];
  ideas: EditIdea[];
  timeline: TimelineSegment[];
  routeExecutionPacks: RouteExecutionPack[];
  inspirationReport?: InspirationReport;
};
