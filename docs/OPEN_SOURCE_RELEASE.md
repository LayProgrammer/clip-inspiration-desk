# Open Source Release Checklist

Use this checklist before making the repository public.

## 1. Rotate Exposed Keys

If any API key was ever pasted into a chat, screenshot, issue, commit, or public document, revoke it before release and generate a new one.

Store new keys only in `.env.local` or in the local settings panel.

## 2. Clean Local Data

Do not publish:

- `.env`
- `.env.local`
- `storage/`
- `public/generated/`
- `.next/`
- `node_modules/`

You can keep them locally, but they must not be tracked by Git.

## 3. Run Checks

```bash
npm run lint
npm run build
npm run prepublish:check
```

`next build` may show a Turbopack NFT tracing warning related to local settings reading `.env.local` and scanning local storage folders. The build still succeeds. This warning is currently known and documented.

## 4. Suggested Git Commands

For a fresh repository inside `clip-inspiration-app`:

```bash
git init
git add .
git status
git commit -m "Initial Local Beta release"
```

Then create a GitHub repository and push:

```bash
gh repo create clip-inspiration-desk --public --source=. --remote=origin --push
```

## 5. Suggested Repository Description

```text
Local-first AI assistant for video editing inspiration: material diagnosis, story routes, and execution packs for Jianying/Premiere/CapCut.
```

## 6. Suggested Topics

```text
ai video-editing local-first nextjs ffmpeg capcut premiere jianying openai zhipu
```

## 7. After Publishing

- Check the repository file list on GitHub.
- Confirm `.env.local`, `storage/`, and `public/generated/` are absent.
- Confirm README renders correctly.
- Add screenshots or a short demo video only if they do not expose private materials or API keys.
