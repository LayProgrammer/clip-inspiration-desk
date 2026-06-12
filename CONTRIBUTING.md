# Contributing

Thanks for helping improve Clip Inspiration Desk.

## Product Direction

This project is not trying to become a full video editor. Please keep contributions aligned with the core goal:

- Understand local footage.
- Diagnose story potential.
- Suggest editing routes.
- Generate execution packs that users can carry into Jianying, Premiere, CapCut, or other editors.

Avoid features that turn the app into a timeline editor, template marketplace, cloud storage service, account system, or social platform.

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev:local
```

Open:

```text
http://localhost:3001
```

## Before Opening a Pull Request

Run:

```bash
npm run lint
npm run build
npm run prepublish:check
```

Do not include:

- `.env.local`
- local video files
- generated thumbnails or keyframes
- `storage/`
- `public/generated/`

## Code Style

- Keep the app local-first.
- Prefer small, focused changes.
- Preserve user privacy and local data boundaries.
- Do not add server dependencies unless they are necessary for the local workflow.
- Do not hard-code model provider keys or private endpoints.

## Useful Areas to Improve

- First-run setup guidance.
- More controllable material basket behavior.
- Better route execution pack regeneration.
- More OpenAI-compatible provider presets.
- Better release packaging for non-technical Windows users.
