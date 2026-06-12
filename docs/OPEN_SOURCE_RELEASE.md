# 开源发布检查清单

公开仓库之前，请按这份清单检查一遍。

## 1. 废弃暴露过的 key

如果某个 API key 曾经出现在聊天、截图、Issue、提交记录或公开文档里，请在发布前废弃它，并重新生成一个新的 key。

新 key 只应该保存在：

- `.env.local`
- 应用里的“本地设置”面板

## 2. 清理本地数据

不要发布这些内容：

- `.env`
- `.env.local`
- `storage/`
- `public/generated/`
- `.next/`
- `node_modules/`

这些文件可以继续留在你本机，但不能被 Git 跟踪。

## 3. 运行检查

```bash
npm run lint
npm run build
npm run prepublish:check
```

`next build` 目前可能出现一个 Turbopack NFT tracing warning，来源是本地设置功能需要读取 `.env.local` 并统计本地存储目录。当前构建会成功，功能不受影响。这个 warning 已记录为 Local Beta 已知情况。

## 4. 新仓库发布命令

如果要在 `clip-inspiration-app` 内创建一个干净仓库：

```bash
git init
git add .
git status
git commit -m "Initial Local Beta release"
```

然后创建 GitHub 仓库并推送：

```bash
gh repo create clip-inspiration-desk --public --source=. --remote=origin --push
```

## 5. 推荐仓库描述

```text
本地优先的 AI 剪辑灵感助手：素材体检、剪辑路线和可执行路线包。
```

如果希望同时兼顾英文搜索，可以使用：

```text
Local-first AI assistant for video editing inspiration: material diagnosis, story routes, and execution packs.
```

## 6. 推荐 Topics

```text
ai video-editing local-first nextjs ffmpeg capcut premiere jianying openai zhipu
```

## 7. 发布后检查

- 打开 GitHub 仓库文件列表。
- 确认 `.env.local` 不存在。
- 确认 `storage/` 不存在。
- 确认 `public/generated/` 不存在。
- 确认 README 能正常显示。
- 如果要添加截图或演示视频，确认其中没有 API key、私人素材、隐私画面。
