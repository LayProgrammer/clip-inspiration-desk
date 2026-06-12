# Security Policy

Clip Inspiration Desk is a local-first app. It does not run a hosted backend for your videos, API keys, or generated project data.

## Do Not Commit Local Data

Before publishing a fork or sharing a zip, make sure these paths are not included:

- `.env`
- `.env.local`
- `storage/`
- `public/generated/`
- `.next/`
- `node_modules/`

Run this before publishing:

```bash
npm run prepublish:check
```

## API Keys

API keys are stored locally in `.env.local`.

If an API key has ever appeared in a chat message, screenshot, commit, issue, log, or public document, treat it as exposed:

1. Revoke it in the provider dashboard.
2. Create a new key.
3. Store the new key only in `.env.local` or in the app's local settings panel.

## AI Providers

When cloud AI is enabled, this app may send keyframes, file names, metadata, and your creative brief to the provider you configured. Do not use cloud AI mode with private, sensitive, unauthorized, or confidential footage.

## Reporting Security Issues

For public forks, please open a GitHub security advisory or contact the repository owner privately. Do not post secrets, private footage, or exploit details in public issues.
