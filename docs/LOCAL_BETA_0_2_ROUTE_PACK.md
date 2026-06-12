# Local Beta 0.2 - 路线执行包版

日期：2026-06-08

本轮继续沿“单机版 + 开源”的方向开发，重点解决上一轮留下的核心问题：灵感路线不应共用一份通用时间线，而应该在用户选定某条路线后，生成该路线专属的执行包。

## 产品边界

继续坚持：
- 不做剪辑器。
- 不和剪映、Premiere 抢时间线编辑能力。
- 核心价值是看懂素材、判断故事机会、给出剪辑路线、生成可执行清单。

本轮新增能力的目标是：用户点选一条灵感路线后，拿到一份可以直接带去剪映/Premiere 操作的“路线执行包”。

## 数据结构

`src/lib/types.ts` 新增：
- `RouteExecutionStep`
- `RouteExecutionPack`

`StoreData` 新增：
- `routeExecutionPacks: RouteExecutionPack[]`

`ProjectWorkspace` 新增：
- `routeExecutionPacks: RouteExecutionPack[]`

`src/lib/store.ts` 已增加兼容迁移：
- 老的 `storage/data.json` 没有 `routeExecutionPacks` 时自动补空数组。
- 工作区加载时返回当前项目的路线执行包。

## 本地路线包生成器

新增 `src/lib/route-pack.ts`。

核心函数：
- `generateRouteExecutionPack(project, idea, media, report)`

生成器会根据：
- 当前项目
- 选中的灵感路线
- 素材列表
- 素材体检报告
- 视觉识别字段

生成路线专属执行包。

优先使用：
- `idea.recommendedAssets`
- `report.diagnosis.bestOpeningAssets`
- `report.diagnosis.mustUseAssets`
- 按 `bestUse` 排出来的 hook / scene / detail / transition / ending

会引用的视觉字段：
- `visualSummary`
- `visualHook`
- `visibleSubjects`
- `visualMood`
- `bestUse`
- `directorNote`

路线包内容包括：
- 路线判断
- 开头钩子
- 封面建议
- 节奏计划
- 声音计划
- 字幕风格
- 逐镜头操作步骤
- 发布前复查

当前版本先用本地规则稳定兜底，后续可把同一入口升级为 AI 深化执行包。

## API

新增 `POST /api/route-pack`。

请求：

```json
{
  "projectId": "...",
  "ideaId": "..."
}
```

行为：
- 找到项目、路线、素材、报告。
- 生成路线专属执行包。
- 写入本地 `storage/data.json`。
- 同项目同路线再次生成时替换旧包。
- 返回 `{ project, routePack }`。

## 前端体验

`src/app/page.tsx` 新增：
- `routeExecutionPacks` 状态。
- `routePackLoading` 状态。
- `selectedRoutePack` 计算值。
- `chooseRouteForExecution()`。
- `copyRoutePack()`。
- `downloadRoutePack()`。

灵感路线详情里新增：
- `就按这条剪`

点击后：
- 调用 `/api/route-pack`。
- 保存返回的路线包到前端状态。
- 自动切到执行阶段。

执行阶段现在展示：
- 当前执行路线。
- 开头钩子。
- 封面建议。
- 节奏 / 声音 / 字幕三栏。
- 逐镜头操作卡片：
  - 时间段
  - 素材名
  - 镜头目的
  - 具体操作
  - 字幕
  - 声音
  - 效果
  - 避坑
- 发布前复查清单。

旧的通用时间线代码暂时保留为兜底，但不会作为主体验显示。

## Markdown 导出

`src/lib/export-text.ts` 新增：
- `buildRouteExecutionMarkdown(project, idea, routePack, report)`

执行阶段新增按钮：
- `复制执行包`
- `导出 Markdown`

复制逻辑增强：
- 首选 `navigator.clipboard.writeText()`。
- 如果浏览器权限不支持，则回退到隐藏 `textarea + document.execCommand("copy")`。

下载逻辑：
- 使用 `Blob` + `<a download>` 生成 `.md` 文件。
- 文件名来自 `项目名-路线名.md`，会过滤 Windows 非法文件名字符。

注意：
- Codex 内置浏览器不支持下载事件，所以无法在内置浏览器里完整验证 Markdown 文件下载事件。
- 应用按钮使用标准浏览器下载方式，普通浏览器应可正常下载。

## 样式

`src/app/globals.css` 新增：
- `.route-commit-button`
- `.route-pack-actions`
- `.route-pack-board`
- `.route-pack-hero`
- `.route-pack-grid`
- `.route-step-list`
- `.route-step-card`
- `.route-step-index`
- `.route-step-body`
- `.route-review`

并补充移动端布局，避免步骤卡片在窄屏挤压。

## 验证结果

命令验证：
- `npm run lint` 通过。
- `npm run build` 通过。

浏览器验证：
- `http://localhost:3001` 正常打开。
- 点击 `3 生成灵感` 后可以看到路线详情。
- 路线详情里出现 `就按这条剪`。
- 点击后成功生成路线执行包，并跳到执行阶段。
- 执行阶段能看到：
  - `路线执行包`
  - `复制执行包`
  - `导出 Markdown`
  - 逐镜头操作步骤
  - 发布前复查
- 刷新页面后，点击 `4 执行清单`，已保存的路线执行包可以恢复显示。
- 点击 `复制执行包` 后按钮状态变为 `已复制`。
- 页面无应用级 console error。

已知情况：
- `next build` 仍有上一轮记录过的 Turbopack NFT tracing warning，来源仍是 `src/lib/local-settings.ts` 和本地设置 API。构建成功，功能不受影响。

## 下一步建议

继续按单机开源方向推进：

1. 做首次启动向导：检测没有 key 时，引导用户选择本地规则 / 智谱 / OpenAI-compatible。
2. 做“素材篮”：让用户手动把某些素材标记为必用、禁用、开头、结尾，提高执行包可控性。
3. 给路线包加“重新生成这个执行包”，并允许用户输入一句调整要求。
4. 做发布前安全检查脚本，防止 `.env.local`、`storage/`、`public/generated/` 被误提交。
5. 在 README 里新增“从零开源发布步骤”，帮助非程序用户知道怎么上传 GitHub。
