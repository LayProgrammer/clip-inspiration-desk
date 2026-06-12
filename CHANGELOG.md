# 更新日志

## Local Beta 0.3 - 素材篮控制版

- 新增素材意图标记：
  - 自动判断
  - 开头
  - 必用
  - 结尾
  - 禁用
- 新增 `PATCH /api/media`，用于在本地保存素材意图。
- 路线执行包现在会尊重用户对素材的选择。
- 在镜头档案里新增“素材篮”控制面板。
- 新增文档：`docs/LOCAL_BETA_0_3_MATERIAL_BASKET.md`。

## Local Beta 0.2 - 路线执行包版

- 新增路线专属执行包。
- 新增 `POST /api/route-pack`。
- 新增选中路线的 Markdown 导出。
- 新增路线执行包本地持久化。
- 新增文档：`docs/LOCAL_BETA_0_2_ROUTE_PACK.md`。

## Local Beta 0.1 - 单机开源方向

- 项目转向本地优先、可开源的使用方式。
- 新增本地设置面板，用于配置 provider 和模型。
- 新增 `.env.example`、`PRIVACY.md`、`LICENSE`、`start-windows.bat`。
- 新增本地工作区清理能力。
- 视频素材、生成关键帧和 API key 都保留在用户本机。

## 早期原型

- 新增本地视频上传。
- 新增 FFmpeg/FFprobe 缩略图和关键帧抽取。
- 新增本地规则灵感生成。
- 新增智谱 / OpenAI-compatible 灵感生成。
- 新增关键帧视觉分析。
