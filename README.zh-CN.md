# Euronews PT Reading Lab

[English README](./README.md)

Euronews PT Reading Lab 是一个安静、移动端优先的欧洲葡萄牙语阅读训练项目。它围绕每日 Euronews 葡萄牙语文章展开，把真实新闻阅读拆成段落翻译、词汇图像记忆、用户自定义笔记和句型仿写练习。

这个项目明确不使用 Next.js。前端使用 Vite + React + TanStack Router + TanStack Query；后端是运行在 Cloudflare Workers 上的 Hono BFF。

## 项目做什么

- 抓取每日 Euronews 葡萄牙语文章，筛选后存入 Cloudflare D1。
- 通过 Worker BFF 提供文章列表、文章详情、阅读完成状态、单词笔记和复习状态。
- 使用 Workers AI 将欧洲葡萄牙语段落翻译为简体中文；翻译采用“首次阅读时懒加载”的方式，避免一次 Worker 调用里触发过多子请求。
- 用户长按或选择单词/短语后，打开 50% 高度的学习抽屉，展示图片、简短例句、AI 语言提示、自定义释义、标签和 Priberam 跳转。
- 支持按段落上下文生成句型练习，并通过 90% 高度的抽屉完成仿写和反馈。
- 完成当天文章后进入复习视图，回看词汇笔记和练习记录。

## 项目结构

```text
apps/
  web/       Vite React 应用：移动端阅读 UI、抽屉、复习页、API client
  worker/    Cloudflare Worker：Hono BFF、文章抓取、D1 仓储、AI/图片适配
packages/
  shared/    前后端共享类型、示例文章、Priberam URL 工具
docs/
  ARCHITECTURE.md        系统结构、存储和 API 总览
  WORKER_PIPELINE.md     Euronews 抓取、懒翻译、D1 存储、cron 和部署说明
  API_NOTES.md           数据源和服务商备注
  DECISIONS.md           产品和架构决策
  PROJECT_MEMORY.md      项目意图、审美偏好、交互规则
  ROADMAP.md             MVP 与后续路线
```

Worker 按职责拆分，而不是按部署单元拆分：

- `src/bff`：前端消费的 Hono 路由，以及 OpenAPI/Swagger 文档。
- `src/article-fetchers`：Euronews feed、页面解析和来源适配。
- `src/crawler`：定时和手动共用的每日刷新流程。
- `src/articles`：文章相关 D1 仓储和懒翻译逻辑。
- `src/study`：学习状态、词汇笔记、练习记录的 D1 仓储。
- `src/ai`：Workers AI 翻译和词汇描述工具。
- `src/lib`：通用 fetch 和文本处理工具。

## UI 风格

这个应用应该像一本可长期使用的阅读笔记，而不是游戏化语言学习产品。当前 UI 是移动端竖屏优先，整体采用复古报纸和阅读手账方向：

- 暖纸色背景、黑色墨水文字、少量暗红强调色；
- serif 编辑字体系统，包含 masthead、日期栏、引文、首字下沉和分隔线；
- 控件克制，不抢阅读文本的主位置；
- 学习操作放在底部抽屉里，保持“文章优先”的阅读表面；
- 不做营销 landing page，也不做桌面 dashboard 视觉。

更多产品气质和交互规则见 [docs/PROJECT_MEMORY.md](./docs/PROJECT_MEMORY.md) 与 [docs/DECISIONS.md](./docs/DECISIONS.md)。

## 启动命令

```bash
pnpm install
pnpm db:migrate:local
pnpm dev:worker
pnpm dev:web
```

Worker 和前端建议开两个终端分别运行。前端会把 `/api/*` 代理到 `http://localhost:8787`；本地开发时可以不设置 `VITE_API_BASE_URL`。

常用地址：

- Web app：`http://localhost:5173`
- Worker health：`http://localhost:8787/api/health`
- Swagger UI：`http://localhost:8787/api/docs`
- OpenAPI JSON：`http://localhost:8787/api/openapi.json`

## 环境变量

把 `.env.example` 复制为根目录的 `.env`。Vite 从仓库根目录读取 env 文件，修改后需要重启 `pnpm dev:web`。

如果要让前端连接已部署的 Worker：

```bash
VITE_API_BASE_URL=https://euronews-pt-reading-lab.<your-subdomain>.workers.dev
```

Worker 密钥不进入源码。本地 Worker 可放在 `apps/worker/.dev.vars`；线上使用 Wrangler secrets。

```bash
# 可选：启用单词抽屉里的真实 Unsplash 图片
UNSPLASH_ACCESS_KEY=...
```

没有 Worker 时，前端会在 console 警告并回退到内置示例文章。没有 Workers AI 时，翻译和词汇提示会优雅降级。没有 Unsplash key 时，单词抽屉会显示样式化占位图。

## 数据流程

每日 pipeline 详见 [docs/WORKER_PIPELINE.md](./docs/WORKER_PIPELINE.md)。

高层流程：

```text
scheduled cron 或 POST /api/articles/refresh
  -> fetchDailyEuronewsArticles
  -> 解析 RSS / 首页 / 文章页
  -> 将筛选后的文章和段落写入 D1
  -> 用户打开 GET /api/articles/:id 时再懒翻译段落
```

部署后的 Worker 每天 `06:00 UTC` 运行一次 cron。本地或调试时可以手动刷新：

```bash
curl -X POST http://localhost:8787/api/articles/refresh
```

## API 文档

Worker 现在提供 Swagger/OpenAPI 参考：

- 本地 Swagger UI：`http://localhost:8787/api/docs`
- 本地 OpenAPI JSON：`http://localhost:8787/api/openapi.json`

主要路由分组：

- `GET /api/today`
- `GET /api/articles/status`
- `GET /api/articles/:articleId`
- `POST /api/articles/refresh`
- `POST /api/articles/:articleId/complete`
- `POST /api/words/lookup`
- `POST /api/words/notes`
- `POST /api/paragraphs/practice`
- `POST /api/paragraphs/feedback`
- `GET /api/review`
- `GET /api/debug/translate`

## 服务商参考

外部服务如何使用、去哪里管理和查文档，统一放在 [docs/SERVICE_PROVIDERS.md](./docs/SERVICE_PROVIDERS.md)。当前重点是 Cloudflare 和 Unsplash；Euronews、Priberam 也作为内容/参考来源记录在内。

## 部署备注

```bash
cd apps/worker
npx wrangler d1 create euronews_pt_reading_lab
pnpm db:migrate:remote
npx wrangler secret put UNSPLASH_ACCESS_KEY
npx wrangler deploy
```

部署后用 `VITE_API_BASE_URL` 指向 Worker。如果未来前端不只在 localhost 运行，需要把正式域名加入 `apps/worker/src/bff/app.ts` 的 CORS 白名单。
