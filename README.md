# Clip Inspiration Desk Local Beta

剪辑灵感台是一个本地运行的 AI 剪辑灵感助手。

它不是剪映、Premiere 或 CapCut 的替代品。它专注于剪辑前的决策：看懂素材、判断故事机会、给出剪辑路线，并生成可以带去剪映/Premiere/CapCut 执行的清单。

> Current status: Local Beta. Good for personal use, local experiments, open-source collaboration, and early feedback.

## What It Does

Core workflow:

```text
Import local videos
  -> Extract thumbnail and keyframes
  -> Read keyframes with a vision model
  -> Diagnose material potential
  -> Generate editing routes
  -> Choose one route
  -> Export a route execution pack
```

Main features:

- Local video import.
- FFmpeg/FFprobe thumbnail and keyframe extraction.
- Zhipu or OpenAI-compatible model support.
- Local heuristic fallback when no API key is configured.
- Material diagnosis report.
- Three editing route suggestions.
- Recommended first route.
- Material basket controls:
  - auto
  - opening
  - must-use
  - ending
  - avoid
- Route-specific execution pack.
- Copy execution pack.
- Export execution pack as Markdown.
- Local settings panel for provider, model, storage, and cleanup.

## What It Is Not

This project intentionally does not try to become:

- a full timeline editor
- a Jianying/Premiere/CapCut replacement
- a cloud video storage service
- a social publishing platform
- a template marketplace
- a multi-user account system

The goal is to help you decide what to cut before you open a real editor.

## Privacy Model

This app is local-first.

Local files:

- uploaded videos: `storage/uploads/`
- project and idea data: `storage/data.json`
- thumbnails and keyframes: `public/generated/`
- AI configuration: `.env.local`

Ignored by Git:

- `.env`
- `.env.local`
- `storage/`
- `public/generated/`
- `.next/`
- `node_modules/`

When cloud AI is enabled, this app may send keyframes, file names, video metadata, and your creative brief to the AI provider you configured. Do not use cloud AI mode with private, sensitive, unauthorized, or confidential footage.

More details: [PRIVACY.md](./PRIVACY.md)

## Quick Start

### Option 1: Windows Double-Click

1. Install Node.js 20 or newer.
2. Download this project.
3. Double-click:

```text
start-windows.bat
```

The script will:

- create `.env.local` from `.env.example` if missing
- install dependencies if needed
- start the local app
- open `http://localhost:3001`

### Option 2: Command Line

```bash
npm install
copy .env.example .env.local
npm run dev:local
```

Open:

```text
http://localhost:3001
```

On macOS/Linux, use:

```bash
cp .env.example .env.local
npm run dev:local
```

## Configure AI

You can use the app without a key:

```bash
AI_PROVIDER=local
```

In local mode, the app uses heuristic rules and does not call a cloud vision model.

To enable Zhipu:

```bash
AI_PROVIDER=zhipu

ZHIPU_API_KEY=your_key_here
ZHIPU_MODEL=glm-4-flash
ZHIPU_VISION_MODEL=glm-4v-flash
```

To enable OpenAI or an OpenAI-compatible endpoint:

```bash
AI_PROVIDER=openai

OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.1-mini
OPENAI_VISION_MODEL=gpt-5.1-mini
```

You can also configure these in the app's local settings panel.

Never commit real API keys.

## Development

```bash
npm run dev:local
npm run lint
npm run build
npm run prepublish:check
```

Known build note:

`next build` may show a Turbopack NFT tracing warning related to local settings reading `.env.local` and scanning local storage folders. The build succeeds and the app works. This is currently documented as a known Local Beta issue.

## Open Source Safety Check

Before publishing a fork or repository, run:

```bash
npm run prepublish:check
```

Also confirm manually:

- `.env.local` is not committed.
- `storage/` is not committed.
- `public/generated/` is not committed.
- no real footage is committed.
- no real API key is committed.

If an API key was ever pasted into a chat, screenshot, issue, commit, or public document, revoke it in the provider dashboard and create a new one.

Release checklist: [docs/OPEN_SOURCE_RELEASE.md](./docs/OPEN_SOURCE_RELEASE.md)

## Project Files

```text
src/app/                 Next.js app and local API routes
src/lib/                 idea engine, AI provider adapters, storage, video analysis
docs/                    project memory and release notes
storage/                 local project data, ignored by Git
public/generated/        local thumbnails and keyframes, ignored by Git
```

## Roadmap

Good next steps:

- first-run setup guide
- material basket notes
- regenerate current route pack with an adjustment prompt
- more provider presets
- safer release packaging for non-technical Windows users
- desktop packaging research, likely Tauri or Electron later

## Security

See [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT. See [LICENSE](./LICENSE).
