import { randomUUID } from "node:crypto";
import type { EditIdea, InspirationReport, MediaAsset, TimelineSegment } from "./types";

function assetNames(media: MediaAsset[], limit = 3) {
  return media.slice(0, limit).map((item) => item.originalName);
}

function pickAsset(media: MediaAsset[], use: MediaAsset["bestUse"], fallbackIndex = 0) {
  return media.find((asset) => asset.bestUse === use)?.originalName ?? media[fallbackIndex]?.originalName ?? "素材片段";
}

export function generateIdeas(
  projectId: string,
  media: MediaAsset[],
  platform: string,
  mood: string,
): EditIdea[] {
  const now = new Date().toISOString();
  const references = assetNames(media);
  const hookAsset = pickAsset(media, "hook", 0);
  const detailAsset = pickAsset(media, "detail", 1);
  const transitionAsset = pickAsset(media, "transition", 2);
  const endingAsset = pickAsset(media, "ending", media.length - 1);

  return [
    {
      id: randomUUID(),
      projectId,
      title: "从一个真实瞬间开始",
      platform,
      durationSec: 38,
      mood,
      hook: `先用 ${hookAsset} 中最有动作或声音的一刻开场，再用 ${transitionAsset} 补足地点和气氛。`,
      structure: ["真实瞬间钩子", "交代地点与人物", "连续细节推进", "安静镜头收束"],
      recommendedAssets: references,
      musicSuggestion: "前 3 秒保留原声，随后进入轻快但不过分抢戏的节奏。",
      effectSuggestions: ["保留环境音", "自然色调", "简短手账字幕"],
      materialMatchScore: 92,
      noviceScore: 88,
      publishPotentialScore: 86,
      difficultyScore: 34,
      recommendationReason: "这条路线最依赖真实瞬间和自然衔接，新手也容易照着执行。",
      createdAt: now,
    },
    {
      id: randomUUID(),
      projectId,
      title: "素材里的反差小故事",
      platform,
      durationSec: 28,
      mood: "轻快、有反差、容易看完",
      hook: `把 ${detailAsset} 中最有冲击力的画面提前，再回到 ${hookAsset} 交代“事情是怎么变成这样的”。`,
      structure: ["结果先行", "回到起点", "快切推进", "一句现场声音结尾"],
      recommendedAssets: references,
      musicSuggestion: "使用节拍清晰的音乐，在结尾突然静音保留一句原声。",
      effectSuggestions: ["速度变化", "定格字幕", "动作匹配切换"],
      materialMatchScore: 84,
      noviceScore: 70,
      publishPotentialScore: 90,
      difficultyScore: 58,
      recommendationReason: "适合平台传播，但需要更强节奏控制，素材里要有明确反差才稳。",
      createdAt: now,
    },
    {
      id: randomUUID(),
      projectId,
      title: "把素材剪成一封短短信",
      platform,
      durationSec: 52,
      mood: "安静、松弛、有叙事感",
      hook: `从 ${transitionAsset} 的空镜或移动镜头开始，用一句旁白把观众带进这批素材，最后落到 ${endingAsset}。`,
      structure: ["一句旁白开场", "环境与细节", "人物或事件高潮", "余味镜头结束"],
      recommendedAssets: references,
      musicSuggestion: "选择铺底感较强的器乐，保留转场处的现场环境音。",
      effectSuggestions: ["慢速叠化", "低对比调色", "日期地点字幕"],
      materialMatchScore: 78,
      noviceScore: 76,
      publishPotentialScore: 74,
      difficultyScore: 46,
      recommendationReason: "情绪表达更完整，但对字幕和收束镜头要求更高。",
      createdAt: now,
    },
  ];
}

export function generateTimeline(projectId: string, media: MediaAsset[]): TimelineSegment[] {
  const selected = [
    media.find((asset) => asset.bestUse === "hook"),
    media.find((asset) => asset.bestUse === "transition" || asset.bestUse === "scene"),
    media.find((asset) => asset.bestUse === "detail"),
    media.find((asset) => asset.bestUse === "ending"),
  ].filter((asset): asset is MediaAsset => Boolean(asset));
  const fallback = media.filter((asset) => !selected.some((item) => item.id === asset.id));
  const timelineAssets = selected.concat(fallback).slice(0, 4);
  let cursor = 0;
  const purposes = ["开场钩子", "建立场景", "推进情绪", "结尾收束"];
  const subtitles = [
    "先别急着解释，让这个瞬间自己说话。",
    "从这里开始，零散的画面有了地点和方向。",
    "把最有情绪的细节放在一起，故事就开始发生。",
    "最后留一点安静，让观众记住这段素材。",
  ];
  const effects = ["保留原声，轻微推近", "按动作切换，字幕简短", "跟随节奏快切", "节奏放慢，声音淡出"];

  return timelineAssets.map((asset, index) => {
    const duration = index === 0 ? 4 : index === timelineAssets.length - 1 ? 8 : 7;
    const segment = {
      id: randomUUID(),
      projectId,
      startSec: cursor,
      endSec: cursor + duration,
      assetId: asset.id,
      purpose: purposes[index] ?? "叙事推进",
      subtitle: subtitles[index] ?? "继续补充这个故事。",
      effect: effects[index] ?? "自然衔接",
    };
    cursor += duration;
    return segment;
  });
}

function assetsByUse(media: MediaAsset[], use: MediaAsset["bestUse"]) {
  return media.filter((asset) => asset.bestUse === use);
}

function names(media: MediaAsset[], limit = 4) {
  return media.slice(0, limit).map((asset) => asset.originalName);
}

function countByTag(media: MediaAsset[], tag: string) {
  return media.filter((asset) => asset.tags.includes(tag));
}

function pickWithReason(media: MediaAsset[], fallback: string, limit = 2) {
  return media.slice(0, limit).map((asset) => ({
    assetName: asset.originalName,
    reason: asset.directorNote || fallback,
  }));
}

function uniqueAssets(media: MediaAsset[]) {
  return Array.from(new Map(media.map((asset) => [asset.id, asset])).values());
}

export function generateInspirationReport(
  projectId: string,
  media: MediaAsset[],
  platform: string,
  mood: string,
): InspirationReport {
  const hooks = assetsByUse(media, "hook");
  const details = assetsByUse(media, "detail");
  const transitions = assetsByUse(media, "transition");
  const endings = assetsByUse(media, "ending");
  const scenes = assetsByUse(media, "scene");
  const food = countByTag(media, "食物");
  const streets = countByTag(media, "街景");
  const people = countByTag(media, "人物");
  const landscapes = countByTag(media, "风景");
  const strongestOpenings = uniqueAssets([...hooks, ...people, ...details, ...media]).slice(0, 2);
  const mustUse = uniqueAssets([...hooks, ...details, ...scenes, ...media]).slice(0, Math.min(3, media.length));
  const optional = media
    .filter((asset) => asset.bestUse === "unknown" || asset.bestUse === "transition")
    .slice(0, 3);
  const hasVisualVariety = new Set(media.map((asset) => asset.lensProfile)).size >= 2;
  const storyPotentialScore = Math.min(
    96,
    Math.max(
      42,
      52 +
        Math.min(media.length, 10) * 3 +
        (hooks.length ? 12 : 0) +
        (details.length ? 8 : 0) +
        (endings.length ? 8 : 0) +
        (hasVisualVariety ? 8 : 0),
    ),
  );
  const editingDifficulty = media.length < 4 || (!hooks.length && !endings.length) ? "偏难" : media.length > 12 ? "中等" : "简单";
  const missingShots = [
    !hooks.length ? "缺一个 1-3 秒就能抓住人的开头镜头，建议从动作、笑声或失误里找。" : "",
    !endings.length ? "缺明确结尾镜头，剪辑时要刻意留一段安静画面做收束。" : "",
    details.length === 0 ? "缺细节镜头，中段容易空，需要靠字幕或现场声补信息。" : "",
    transitions.length + scenes.length === 0 ? "缺环境/转场素材，段落之间不要硬切太多。" : "",
    media.length < 5 ? "素材数量偏少，建议控制在 15-25 秒，不要硬凑长视频。" : "",
  ].filter(Boolean);

  const materialMap = [
    {
      category: "开场瞬间",
      count: hooks.length,
      assetNames: names(hooks.length ? hooks : media),
      insight: hooks.length ? "这批素材有可以直接抓人的情绪点，适合先声夺人。" : "开场素材不明显，建议从动作最大或声音最真实的片段里截 2 秒。",
    },
    {
      category: "氛围和转场",
      count: transitions.length + scenes.length + streets.length + landscapes.length,
      assetNames: names([...transitions, ...scenes, ...streets, ...landscapes]),
      insight: "这些素材适合负责地点、时间和情绪过渡，别让它们承担太多剧情。",
    },
    {
      category: "记忆点",
      count: details.length + food.length + people.length,
      assetNames: names([...details, ...food, ...people]),
      insight: "这里是中段的可看性来源，适合配短字幕、音效或节奏停顿。",
    },
    {
      category: "收束镜头",
      count: endings.length,
      assetNames: names(endings.length ? endings : media.slice(-2)),
      insight: endings.length ? "结尾镜头已经有余味，可以把节奏慢下来。" : "结尾素材不够明确，可以用最安静的一段画面做淡出。",
    },
  ];

  return {
    id: randomUUID(),
    projectId,
    summary: `这批素材更适合做“${mood}”方向的 ${platform} 短片。重点不是炫技，而是把真实瞬间、氛围镜头和细节记忆点组织成一个清楚的小故事。`,
    diagnosis: {
      storyPotentialScore,
      editingDifficulty,
      verdict:
        storyPotentialScore >= 80
          ? "这批素材已经有可剪成片的基础，优先剪短而明确的故事，不要把所有片段都塞进去。"
          : storyPotentialScore >= 62
            ? "这批素材能剪，但需要先选一个很窄的主题，靠开头和字幕把观众带进去。"
            : "这批素材需要收缩目标，先做一条短记录，不建议一开始挑战复杂叙事。",
      bestOpeningAssets: pickWithReason(strongestOpenings, "画面或声音更容易成为观众进入故事的第一秒。"),
      mustUseAssets: pickWithReason(mustUse, "这条素材承担主要信息或情绪，不建议一开始删掉。", 3),
      optionalAssets: pickWithReason(optional.length ? optional : media.slice(-2), "它更适合做过渡或备选，粗剪阶段不用强行保留。", 3),
      missingShots: missingShots.length ? missingShots : ["素材结构比较完整，下一步重点是删重复和控制节奏。"],
      recommendedRouteTitle: "从一个真实瞬间开始",
      whyThisRoute: "这条路线对素材要求最稳：先用真实瞬间抓人，再用环境和细节把故事补清楚，适合零基础用户先剪出第一版。",
    },
    materialMap,
    hookBank: [
      `先放最不像“开头”的真实瞬间，再补一句：这就是这次素材里最值得剪的地方。`,
      `用一句反差字幕开场：我本来以为只是普通记录，结果这段素材越看越有意思。`,
      `从环境声或笑声开始，画面晚半秒出现，让观众先被声音带进去。`,
      `直接抛问题：如果只能用 ${Math.min(media.length, 6)} 段素材讲完这件事，我会先选哪一段？`,
    ],
    titleBank: [
      `这不是一条攻略，是我想留下来的 ${mood}`,
      `把 ${media.length} 段素材剪成一个真正想发的故事`,
      `如果这批素材只保留 30 秒，我会这样剪`,
      platform === "小红书" ? "这段素材越看越像一篇生活笔记" : "前 3 秒留下来，后面才是重点",
    ],
    styleRecipes: [
      {
        name: `${mood}主线`,
        rhythm: "前 3 秒抓人，中段每 2-4 秒换一次信息，结尾放慢。",
        color: "降低锐度和对比，保留真实肤色，不做过度滤镜。",
        subtitle: "短句、少字、像朋友讲述，不要解释画面已经说明的事。",
        sound: "保留 1-2 个现场声作为记忆点，音乐只做情绪底色。",
      },
      {
        name: `${platform}发布版`,
        rhythm: platform === "抖音" ? "开头更快，前 8 秒必须有反差或笑点。" : "节奏可以更松，让画面和文字有呼吸。",
        color: platform === "小红书" ? "干净、明亮、略暖，封面要能一眼看懂主题。" : "对比略高，重点画面更明确。",
        subtitle: platform === "小红书" ? "像笔记标题一样自然，避免喊口号。" : "短促有梗，适合停顿和定格。",
        sound: "音乐节奏要服务剪辑点，不要让鼓点逼着素材乱切。",
      },
    ],
    audioGuide: {
      musicDirection: `选择能支撑“${mood}”但不抢画面的音乐。${platform === "抖音" ? "节拍要更明确，前 8 秒就给出情绪推进。" : "音乐可以更轻，留出画面和文字的呼吸。"}`,
      soundHooks: [
        hooks.length ? `优先检查 ${hooks[0].originalName} 有没有笑声、惊呼或动作声，可作为开头记忆点。` : "缺少明确 hook 素材时，先从所有片段里找最真实的现场声。",
        transitions.length ? `用 ${transitions[0].originalName} 的环境声连接两个段落，能比硬转场更自然。` : "如果没有转场素材，音乐不要切太碎，靠字幕做段落过渡。",
        details.length ? `细节镜头可配一个很轻的音效，但不要让音效像模板。` : "细节素材不足时，声音更要克制，避免显得空。",
      ],
      beatPlan: [
        "00:00-00:03 保留现场声或弱音乐，让观众先进入素材本身。",
        "中段按信息点切，不要完全被鼓点牵着走。",
        "结尾音乐淡出，留下 0.5-1 秒画面余味。",
      ],
    },
    captionGuide: {
      tone: `${mood}方向更适合像朋友自然讲述，字幕少解释画面，多补充情绪和反差。`,
      openingLines: [
        "我以为只是随手拍，结果越看越舍不得删。",
        "这一秒，比我想象中更像开头。",
        "如果只留一个瞬间，我会先留它。",
      ],
      transitionLines: [
        "事情就是从这里慢慢变有意思的。",
        "换个角度看，这段素材突然有了方向。",
        "中间这几秒，不用解释太多。",
      ],
      endingLines: [
        "后来想想，真正想留下来的就是这种瞬间。",
        "就到这里，刚刚好。",
        "这段素材，比记忆诚实一点。",
      ],
      rules: [
        "每条字幕尽量 8-16 个字。",
        "不要复述画面里已经看得见的内容。",
        "开头制造悬念，中段减少解释，结尾给情绪落点。",
      ],
    },
    visualGuide: {
      colorDirection: platform === "小红书" ? "整体干净、略暖、低对比，保留真实肤色和生活感。" : "画面重点要明确，适当提高对比，但不要把素材做成模板感。",
      rhythmDirection: media.length < 5 ? "素材少时不要硬做复杂结构，控制在 15-25 秒更自然。" : "素材足够时先删重复，再做 3 段式结构：钩子、展开、余味。",
      coverIdeas: [
        hooks[0]?.originalName ? `用 ${hooks[0].originalName} 里人物/动作最明确的一帧做封面。` : "选择画面主体最大、情绪最明确的一帧做封面。",
        details[0]?.originalName ? `如果 ${details[0].originalName} 细节足够好，可以做局部特写封面。` : "封面不要只放空镜，最好有主体或动作。",
        "封面标题控制在 8-12 个字，像一句生活笔记，不要像广告。",
      ],
      effectIdeas: [
        "先不要叠太多特效，用轻微推近和定格就够。",
        transitions.length ? "转场以动作方向和环境声为主，少用花哨模板。" : "缺少转场素材时，用字幕停顿代替复杂转场。",
        "如果做电影感，只加轻微颗粒和低对比，不要一键重滤镜。",
      ],
    },
    blindSpots: [
      hooks.length ? "开头素材足够，但要避免把最精彩的片段一次放完。" : "缺少明显开头钩子，建议找动作、笑声、失误或强画面做开场。",
      endings.length ? "结尾有素材，注意不要加太多文字破坏余味。" : "结尾镜头不明确，剪辑时需要刻意留一个安静收束。",
      media.length < 5 ? "素材数量偏少，方案要短，不要硬凑完整叙事。" : "素材足够，重点是删掉重复片段，别每段都想保留。",
    ],
    remixPrompts: [
      "把这个方案改得更适合小红书，但不要太网红。",
      "给我一个更搞笑、更有反差的版本。",
      "不要出现正脸，重新安排素材使用顺序。",
      "把字幕改得更像朋友自然说话，不要像广告文案。",
    ],
    nextActions: [
      "先从灵感方案里选一个情绪方向，不要同时追求搞笑、治愈和高级。",
      "剪映里先按灵感执行清单摆出粗顺序，再决定音乐。",
      "字幕只写观众看不到的信息，画面已经说明的内容不要重复解释。",
      "导出前只问一个问题：这个视频的第一个 3 秒，能不能让人愿意继续看？",
    ],
    createdAt: new Date().toISOString(),
  };
}
