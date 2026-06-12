# 参与贡献

感谢你愿意改进剪辑灵感台。

## 产品方向

这个项目不是要做成完整剪辑软件。贡献内容请尽量围绕核心目标：

- 理解本地素材。
- 判断素材的故事潜力。
- 给出剪辑路线。
- 生成可以带去剪映、Premiere、CapCut 等软件执行的路线包。

请尽量避免把项目带向这些方向：

- 完整时间线编辑器
- 模板商城
- 云端素材托管
- 多人账号系统
- 社交发布平台

一句话：这个项目帮用户“想清楚怎么剪”，不是直接替代专业剪辑工具。

## 本地启动

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

打开：

```text
http://localhost:3001
```

## 提交 Pull Request 前

请运行：

```bash
npm run lint
npm run build
npm run prepublish:check
```

不要提交：

- `.env.local`
- 本地视频素材
- 生成的缩略图或关键帧
- `storage/`
- `public/generated/`

## 代码原则

- 保持 local-first，本地优先。
- 优先做小而清晰的改动。
- 保护用户隐私和本地数据边界。
- 不要硬编码模型服务商 key。
- 不要硬编码私人中转站地址。
- 除非确实服务于本地工作流，否则不要增加重型服务端依赖。

## 值得改进的方向

- 首次启动引导。
- 更可控的素材篮。
- 当前路线执行包的二次生成。
- 更多 OpenAI-compatible 服务商预设。
- 面向非技术 Windows 用户的安装和启动体验。
