# Changelog

## Local Beta 0.3 - Material Basket

- Added material intent labels: auto, opening, must-use, ending, and avoid.
- Added `PATCH /api/media` for saving material intent locally.
- Route execution packs now respect user material choices.
- Added a material basket control panel in the shot inspector.
- Added `docs/LOCAL_BETA_0_3_MATERIAL_BASKET.md`.

## Local Beta 0.2 - Route Execution Packs

- Added route-specific execution packs.
- Added `POST /api/route-pack`.
- Added Markdown export for selected route packs.
- Added persistent local storage for route execution packs.
- Added `docs/LOCAL_BETA_0_2_ROUTE_PACK.md`.

## Local Beta 0.1 - Local Open Source Direction

- Shifted the project toward local-first open-source usage.
- Added local settings for provider and model configuration.
- Added `.env.example`, `PRIVACY.md`, `LICENSE`, and `start-windows.bat`.
- Added local workspace cleanup from the settings panel.
- Kept video materials, generated frames, and API keys on the user's machine.

## Early Prototype

- Added local video upload.
- Added FFmpeg/FFprobe thumbnail and keyframe extraction.
- Added local heuristic idea generation.
- Added Zhipu/OpenAI-compatible inspiration generation.
- Added vision analysis for keyframes.
