# 剪辑灵感台 Local Beta

剪辑灵感台是一个本地运行的 AI 剪辑灵感助手。

它不是剪映、Premiere 或 CapCut 的替代品。它专注于剪辑前的决策：帮你看懂素材、判断故事机会、生成剪辑路线，并输出一份可以带去剪映、Premiere、CapCut 里照着做的执行清单。

> 当前状态：Local Beta。适合个人本地试用、开源协作、小范围反馈和二次开发。

## 它能做什么

核心流程：

```text
导入本地视频
  -> 自动抽取缩略图和关键帧
  -> 使用视觉模型读帧
  -> 生成素材体检报告
  -> 生成剪辑路线
  -> 选择一条路线
  -> 导出路线执行包
```

主要功能：

- 本地导入视频素材。
- 使用 FFmpeg/FFprobe 自动抽取缩略图和关键帧。
- 支持智谱或 OpenAI-compatible 模型。
- 没有 API key 时使用本地规则兜底。
- 生成素材体检报告。
- 生成 3 条剪辑路线。
- 推荐最适合先剪的一条路线。
- 素材篮控制：
  - 自动判断
  - 开头
  - 必用
  - 结尾
  - 禁用
- 针对选中路线生成专属执行包。
- 复制执行包。
- 导出 Markdown 执行包。
- 本地设置面板：
  - 配置 AI provider
  - 配置模型
  - 查看本地存储占用
  - 清理本地素材和生成文件

## 它不做什么

本项目刻意不做这些方向：

- 完整时间线剪辑器
- 剪映、Premiere、CapCut 的替代品
- 云端素材托管
- 社交发布平台
- 模板商城
- 多人账号系统

这个工具的目标是在你打开真正的剪辑软件之前，先帮你想清楚“这批素材到底应该怎么剪”。

## 本地隐私模型

本项目优先本地运行。

本地文件位置：

- 上传视频：`storage/uploads/`
- 项目和灵感数据：`storage/data.json`
- 缩略图和关键帧：`public/generated/`
- AI 配置：`.env.local`

这些内容不会被 Git 提交：

- `.env`
- `.env.local`
- `storage/`
- `public/generated/`
- `.next/`
- `node_modules/`

如果你启用了云端 AI，应用可能会把关键帧、文件名、视频基础信息和你填写的创作目标发送给你配置的 AI 服务商。请不要在云端 AI 模式下处理隐私、敏感、未经授权或保密素材。

更多说明见：[PRIVACY.md](./PRIVACY.md)

## 快速开始

### 方式一：Windows 双击启动

1. 安装 Node.js 20 或更新版本。
2. 下载本项目。
3. 双击：

```text
start-windows.bat
```

脚本会自动：

- 如果缺少 `.env.local`，从 `.env.example` 创建一个
- 如果缺少依赖，执行 `npm install`
- 启动本地应用
- 打开 `http://localhost:3001`

### 方式二：命令行启动

Windows：

```bash
npm install
copy .env.example .env.local
npm run dev:local
```

macOS / Linux：

```bash
npm install
cp .env.example .env.local
npm run dev:local
```

然后打开：

```text
http://localhost:3001
```

## 配置 AI

不配置 key 也可以使用：

```bash
AI_PROVIDER=local
```

本地模式会使用规则生成基础灵感，不会调用云端视觉模型。

启用智谱：

```bash
AI_PROVIDER=zhipu

ZHIPU_API_KEY=your_key_here
ZHIPU_MODEL=glm-4-flash
ZHIPU_VISION_MODEL=glm-4v-flash
```

启用 OpenAI 或 OpenAI-compatible 中转站：

```bash
AI_PROVIDER=openai

OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.1-mini
OPENAI_VISION_MODEL=gpt-5.1-mini
```

也可以在应用右上角的“本地设置”面板里配置这些内容。

不要提交真实 API key。

## 开发命令

```bash
npm run dev:local
npm run lint
npm run build
npm run prepublish:check
```

已知构建提示：

`next build` 可能会出现一个 Turbopack NFT tracing warning，来源是本地设置接口需要读取 `.env.local` 并统计本地存储目录。当前构建会成功，功能不受影响。这个问题已作为 Local Beta 已知情况记录。

## 开源前安全检查

发布 fork 或公开仓库前，请运行：

```bash
npm run prepublish:check
```

也请手动确认：

- `.env.local` 没有被提交。
- `storage/` 没有被提交。
- `public/generated/` 没有被提交。
- 没有真实视频素材被提交。
- 没有真实 API key 被提交。

如果某个 API key 曾经出现在聊天、截图、Issue、提交记录或公开文档里，请到服务商后台废弃旧 key，并重新生成一个新 key。

发布清单见：[docs/OPEN_SOURCE_RELEASE.md](./docs/OPEN_SOURCE_RELEASE.md)

## 项目结构

```text
src/app/                 Next.js 页面和本地 API
src/lib/                 灵感生成、AI 适配、存储、视频分析
docs/                    项目记录和发布说明
storage/                 本地项目数据，Git 已忽略
public/generated/        本地缩略图和关键帧，Git 已忽略
```

## 路线图

值得继续做的方向：

- 首次启动向导
- 素材篮备注
- 对当前路线执行包进行二次调整
- 更多 OpenAI-compatible 服务商预设
- 面向非技术用户的 Windows 安装包
- 桌面版封装预研，后续可考虑 Tauri 或 Electron

## 安全

见：[SECURITY.md](./SECURITY.md)

## 参与贡献

见：[CONTRIBUTING.md](./CONTRIBUTING.md)

## 更新日志

见：[CHANGELOG.md](./CHANGELOG.md)

## License

MIT。见：[LICENSE](./LICENSE)
