# Local Beta 0.3 - 素材篮控制版

日期：2026-06-12

本轮继续沿“单机版 + 开源”的方向开发，重点增强用户对素材取舍的控制力。上一版已经能针对某条灵感路线生成执行包，但用户还不能明确告诉系统“这条素材必须用”“这条放开头”“这条不要用”。本轮新增“素材篮”。

## 产品判断

剪辑灵感工具不能只靠 AI 自己判断。真实用户经常会有主观要求：
- 这条一定要用。
- 这条别出现。
- 这条适合开头。
- 这条适合结尾。

所以素材篮是必要功能，不是装饰按钮。它让用户和“AI 导演”共同决定素材取舍。

## 数据结构

`src/lib/types.ts` 的 `MediaAsset` 新增：

```ts
userIntent?: "auto" | "must" | "opening" | "ending" | "avoid";
userNote?: string;
```

含义：
- `auto`：交给系统自动判断。
- `must`：执行包必须优先考虑。
- `opening`：优先放在前 3 秒或开头段。
- `ending`：优先放在收尾段。
- `avoid`：路线包尽量避开这条素材。

`src/lib/store.ts` 已做兼容：
- 老数据没有 `userIntent` 时自动补为 `auto`。
- 老数据没有 `userNote` 时自动补为空字符串。

## API

`src/app/api/media/route.ts` 新增 `PATCH`：

请求：

```json
{
  "assetId": "...",
  "userIntent": "opening"
}
```

行为：
- 更新素材的 `userIntent`。
- 可选更新 `userNote`，最多 160 字。
- 清空当前项目旧的 `routeExecutionPacks`，避免素材篮变化后继续显示过时执行包。
- 返回更新后的素材和当前项目剩余路线包。

## 路线执行包生成规则

`src/lib/route-pack.ts` 的 `rankedAssets()` 已更新：

排序逻辑：
1. 先过滤 `userIntent === "avoid"` 的素材。
2. 如果所有素材都被禁用，则回退使用全部素材，避免无法生成。
3. `opening` 素材排在最前。
4. `must` 素材优先进入中段候选。
5. 原有路线推荐素材、报告推荐素材、bestUse 推断素材继续参与排序。
6. `ending` 素材排在最后。
7. 最终最多取 6 条素材生成执行步骤。

`assetShotReason()` 已支持引用 `userNote`，后续可以把用户备注进一步开放到前端输入。

## 前端体验

`src/app/page.tsx` 新增：
- `AssetIntent` 类型。
- `assetIntentOptions`。
- `assetIntentLabel()`。
- `savingAssetId` 状态。
- `updateAssetIntent()`。

镜头档案里新增“素材篮”控制条：
- 自动判断
- 开头
- 必用
- 结尾
- 禁用

点击任一按钮会立即保存到本地，并清空旧执行包状态。当前选中的标记会高亮显示。

## 样式

`src/app/globals.css` 新增：
- `.asset-basket`
- `.asset-intent-row`
- `.asset-intent-row button`
- `.asset-intent-row button.active`

窄屏下素材篮按钮从 5 列变为 2 列，避免挤压。

## 验证结果

命令验证：
- `npm run lint` 通过。
- `npm run build` 通过。

浏览器验证：
- 启动 `npm run dev:local` 后，`http://localhost:3001/api/projects` 返回 200。
- 页面能进入素材视图。
- 素材详情里出现“素材篮”。
- 能看到“自动判断 / 开头 / 必用 / 结尾 / 禁用”按钮。
- 点击“开头”后，页面出现“下次生成路线执行包时，会优先尊重这个标记。”提示。
- 重新点击“就按这条剪”后，路线执行包可以正常生成。
- 执行包页面仍能显示“路线执行包”和“发布前复查”。
- 页面无应用级 console error。

已知情况：
- `next build` 仍有 Turbopack NFT tracing warning，来源仍是本地设置 API 读取项目目录。构建成功，功能不受影响。
- Codex 浏览器偶尔会输出 Statsig 网络 warning，来源是 Codex 浏览器自身，不是本应用。

## 下一步建议

1. 给素材篮增加用户备注输入，例如“这条要突出手里的模型”“这条不要露脸”。
2. 在素材列表卡片上显示素材篮角标，让用户不用点进详情也能看到哪些素材已标记。
3. 给执行包增加“重新生成这个执行包”按钮，允许输入一句调整要求。
4. 做首次启动向导：没有 key 时解释本地规则和 AI 模式差异。
5. 做开源发布安全检查脚本，防止 `.env.local`、`storage/`、`public/generated/` 被误提交。
