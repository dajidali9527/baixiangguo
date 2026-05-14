# 百香果价格追踪器 - 后端集成解决方案

## 项目现状分析

### 项目概览
| 项目 | 详情 |
|------|------|
| **项目名称** | Passion Fruit Price Tracker（黄金百香果价格追踪器） |
| **当前版本** | V1.2（纯前端） |
| **前端框架** | React 18.3.1 + Vite 6.3.5 + TypeScript |
| **UI 框架** | Tailwind CSS 4.1.12 + shadcn/ui + Radix UI + Material-UI |
| **页面数量** | 5个页面（Dashboard、Config、History、Preview、Tasks） |
| **数据状态** | **全部为硬编码 Mock 数据，无任何 API 调用** |
| **HTTP 库** | 未引入 axios/fetch 等任何 HTTP 请求库 |

### 现有页面功能
| 页面 | 组件文件 | 功能说明 |
|------|---------|---------|
| 最新行情数据（Dashboard） | `DashboardPage.tsx` | 4个Tab展示不同数据源价格，含表格+图表，数据全硬编码 |
| 数据采集配置（Config） | `ConfigPage.tsx` | 数据源CRUD配置、任务状态列表、执行日志，数据全硬编码 |
| 数据采集历史（History） | `HistoryPage.tsx` | 4个数据源的历史价格查询，支持分页+搜索+日期筛选 |
| 数据通知与配置（Preview） | `PreviewPage.tsx` | ⚠️ 通知相关功能（本次暂不实现） |
| 任务管理（Tasks） | `TasksPage.tsx` | 独立任务管理页面，目前未被导航菜单使用 |

### 关键发现
1. **零 API 层**：整个项目没有任何网络请求代码，`grep` 搜索结果中无 `fetch`/`axios`/`API_BASE` 等字样
2. **数据全部写死**：所有页面的数据都是组件内硬编码的常量数组
3. **侧边栏已有通知入口**：`Sidebar.tsx` 中 `{ id: 'preview', label: '数据通知与配置' }` 指向 PreviewPage
4. **TasksPage 未挂载**：TasksPage 已实现但未在 App.tsx 路由中注册

---

## 一、后端代码能否与前端分离？有哪些影响？

### 结论：完全可以分离，且强烈建议分离

### 方案：前后端分离架构

```
项目根目录 (e:\AI2026\11baixiangguo2\)
├── Passionfruitpricetracker/     ← 现有前端项目（保持不变）
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
│
└── server/                        ← 新建后端项目
    ├── src/
    │   ├── routes/               # API 路由
    │   ├── controllers/          # 控制器
    │   ├── services/             # 业务逻辑
    │   ├── models/               # 数据模型
    │   ├── crawlers/             # 数据采集/爬虫
    │   └── config/               # 配置文件
    ├── package.json
    └── ...
```

### 影响分析

#### 正面影响
| 影响 | 说明 |
|------|------|
| **代码解耦** | 前后端独立开发、独立测试、独立部署 |
| **技术选型自由** | 后端可独立选择 Node.js/Python/Go 等，不受前端约束 |
| **团队协作** | 前端和后端可由不同开发者并行开发 |
| **部署灵活** | 前端可部署到 CDN/静态服务器，后端独立部署 |

#### 需要处理的影响
| 影响 | 说明 | 解决方案 |
|------|------|---------|
| **跨域问题** | 前后端不同端口/域名会产生 CORS | 后端配置 CORS 中间件，Vite 开发环境配置 proxy |
| **环境变量** | 前端需知道后端 API 地址 | 前端新增 `.env` 文件配置 `VITE_API_BASE_URL` |
| **构建产物** | 生产环境需考虑前后端如何配合 | 可选方案：①Nginx 反向代理 ②后端 serve 前端静态文件 |
| **认证机制** | 后续如需登录，需统一鉴权方案 | 建议 JWT Token 方案 |
| **API 类型定义** | 前端需知道后端返回的数据结构 | 建议共享 TypeScript 类型定义文件 |

### 前端需要的改动
1. 新增 `src/api/` 目录，封装 API 请求层
2. 安装 `axios` 作为 HTTP 客户端
3. 新增 `.env` / `.env.development` / `.env.production` 环境变量
4. `vite.config.ts` 新增开发代理配置
5. 所有页面组件从硬编码数据改为 API 调用
6. 新增 loading/error 状态管理

---

## 二、GitHub 提交问题分析及加入后端后的影响

### 当前 Git 状态诊断

需要确认以下问题（请在后续提供信息）：

#### 可能的原因
| 可能原因 | 排查方式 | 是否影响后端 |
|----------|---------|------------|
| **未配置 Git 用户信息** | `git config user.name` / `git config user.email` 为空 | 不影响 |
| **远程仓库未关联或 URL 错误** | `git remote -v` 无输出或 URL 无效 | 不影响 |
| **认证问题** | GitHub 密码已弃用，需用 Personal Access Token 或 SSH Key | 不影响 |
| **仓库大小超限** | `node_modules` 未被 .gitignore 忽略 | ⚠️ 加后端后更严重 |
| **分支冲突/未同步** | 本地和远程有分歧 | 不影响 |
| **网络/代理问题** | 无法连接 GitHub | 不影响 |
| **没有 commit 记录** | `git log` 为空 | 不影响 |

#### 加入后端后的额外注意事项

| 影响项 | 说明 |
|--------|------|
| **node_modules 体积** | 后端也会有 `node_modules`，.gitignore 必须正确配置 |
| **敏感信息泄露** | 后端的 `.env` 含数据库密码/API Key 等，**必须**加入 .gitignore |
| **仓库体积** | 避免提交日志文件、数据库文件、爬虫缓存文件等 |
| **提交频率** | 前后端同时开发时 commit 频率增加，建议明确 commit 规范 |

---

## 三、前后端代码如何使用 GitHub 才不会冲突？

### 推荐方案：Monorepo（单仓库多项目）

由于项目规模不大，建议采用 **Monorepo** 结构，前后端放在同一个 GitHub 仓库中。

### 仓库结构
```
passion-fruit-tracker/              ← GitHub 仓库根目录
├── client/                         ← 前端项目（原 Passionfruitpricetracker）
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   ├── .gitignore
│   └── ...
│
├── server/                         ← 后端项目
│   ├── src/
│   ├── package.json
│   ├── .gitignore
│   └── ...
│
├── shared/                         ← 共享类型定义（可选）
│   └── types/
│       ├── price.ts
│       └── config.ts
│
├── .gitignore                      ← 根目录 .gitignore
├── README.md                       ← 项目总览文档
└── docker-compose.yml              ← 容器化部署配置（可选）
```

### 避免冲突的关键策略

#### 1. 目录隔离
前后端代码在完全独立的目录中，**物理上不可能产生文件冲突**：
- `client/` 下只有前端文件
- `server/` 下只有后端文件
- `shared/` 作为公共类型桥梁

#### 2. .gitignore 策略
```
# 根目录 .gitignore
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
Thumbs.db

# client/ 和 server/ 各有自己的 node_modules
# 根 .gitignore 已覆盖
```

#### 3. Commit 规范
| 前缀 | 含义 | 示例 |
|------|------|------|
| `feat(client):` | 前端新功能 | `feat(client): 新增价格趋势图` |
| `feat(server):` | 后端新功能 | `feat(server): 实现爬虫调度器` |
| `fix(client):` | 前端修复 | `fix(client): 修复图表渲染错误` |
| `fix(server):` | 后端修复 | `fix(server): 修复数据库连接池泄漏` |
| `chore:` | 工程化 | `chore: 更新 docker-compose 配置` |
| `docs:` | 文档 | `docs: 更新 README 部署说明` |

#### 4. 分支策略
```
main               ← 稳定版本，前后端都可用
├── dev            ← 开发主分支
│   ├── feat/client-dashboard-v2   ← 前端功能分支
│   └── feat/server-crawler-v2     ← 后端功能分支
```

### 替代方案：多仓库（不推荐）

如果坚持前后端分两个仓库：
- **缺点**：需要同步两个仓库的文档、CI/CD 配置、共享类型定义需发布 npm 包或用 git submodule
- **优点**：权限隔离更细（对个人项目意义不大）

---

## 四、暂不实现数据通知相关功能

### 需要处理的现状

当前侧边栏已有通知入口，需要在加入后端时明确处理：

```
Sidebar.tsx 第15行:
{ id: 'preview', label: '数据通知与配置', icon: Bell }
```

### 处理方案

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 侧边栏注释掉通知菜单项 | 或加 `disabled` 状态 + tooltip 提示"功能开发中" |
| 2 | PreviewPage 保留但不接入后端 API | 保持纯 UI 展示，不做数据对接 |
| 3 | 后端 API 设计时预留通知接口 | 路由定义但不实现业务逻辑，返回 `{ message: "暂未实现" }` |
| 4 | README 中标注通知功能状态 | 避免其他开发者混淆 |

### 后端预留接口（仅定义，不实现）
```
GET    /api/notifications/config    → 501 Not Implemented
PUT    /api/notifications/config    → 501 Not Implemented
POST   /api/notifications/send      → 501 Not Implemented
```

---

## 五、还需要提供的信息 — 信息收集清单

### 必须要提供的信息

#### A. Git/GitHub 状态（解决提交问题）
请运行以下命令并提供输出：

```bash
# 1. 查看 Git 配置
git config user.name
git config user.email

# 2. 查看远程仓库
git remote -v

# 3. 查看分支状态
git branch -a
git status

# 4. 查看最近的 commit
git log --oneline -5

# 5. 测试 GitHub 连接
git ls-remote origin
```

描述格式示例：
> "git remote -v 输出：origin https://github.com/xxx/xxx.git (fetch) / (push)，git status 显示 'Your branch is ahead of origin/main by 3 commits'，git push 报错：'remote: Permission to xxx.git denied to xxx'"

#### B. 后端技术选型偏好
| 选择项 | 选项 | 推荐 |
|--------|------|------|
| **后端语言** | Node.js / Python / Go | Node.js（与前端的 JavaScript/TypeScript 统一技术栈） |
| **后端框架** | Express / Koa / NestJS / Fastify | Express（最通用）或 NestJS（企业级，TypeScript 原生支持） |
| **数据库** | SQLite / MySQL / PostgreSQL / MongoDB | SQLite（轻量，不需额外安装）或 PostgreSQL（功能最全） |
| **爬虫方案** | Puppeteer / Playwright / Cheerio / 纯 HTTP | Cheerio（轻量 HTML 解析）+ axios（API 数据源） |
| **定时任务** | node-cron / bull / agenda / 系统 crontab | node-cron（简单直接） |

#### C. 部署环境
- 最终部署在哪里？（自己的服务器 / 云服务器 / Vercel + Railway 免费方案）
- 是否需要 HTTPS？
- 是否需要用户认证/登录？
- 预计有多少用户？

### 无法发送图片时的描述方法

由于无法发送图片（如 Figma 设计稿截图、页面效果图等），请用以下方式描述：

#### 方法1：结构化描述
```
【页面：最新行情数据】
- 顶部标题：黄金百香果行情
- 下方4个Tab：百香果信息平台 | 惠农网黄金百香果 | 北京新发地 | 广州江南
- 每个Tab下：
  - 左上角：更新时间 + 日期
  - 左上角下方：当前数据源均价 + 数值
  - 主体：数据表格（列：省、地区、市斤价(最高)、市斤价(最低)、市斤价(平均)、价类、规格、备注、报价日期）
```

#### 方法2：提供 Figma 链接
项目已有 Figma 设计稿链接：
`https://www.figma.com/design/WcHQCIOiYD0gthATjME0Xv/Passion-Fruit-Price-Tracker`

可以直接提供：
- Figma 文件的 node-id（URL 中的 `?node-id=xxx` 参数）
- 或者描述具体改了哪个 Frame/Page

#### 方法3：文字+坐标描述
```
在【最新行情数据】页面中：
- 页面主体 (x=64, y=0, w=剩余宽度, h=全高)
- 顶部标题区域 (padding=32px)
- Tab栏 (4个Tab等宽，margin-bottom=24px)
- 信息行：日期+更新时间 左对齐，当前数据源均价 右对齐，间距16px
- 数据表格：卡片包裹，padding=24px
```

---

## 六、推荐实施步骤

### 第一阶段：基础设施（1-2天）
1. ✅ 诊断并修复 GitHub 提交问题
2. 重组仓库目录结构为 Monorepo
3. 初始化后端项目（Express/Koa + TypeScript）
4. 配置 CORS + Vite 开发代理
5. 前端安装 axios，创建 API 层目录结构
6. 提取共享 TypeScript 类型定义

### 第二阶段：核心数据 API（2-3天）
7. 设计数据库表结构（价格数据、数据源配置、采集日志）
8. 实现 Dashboard 数据 API（替代硬编码）
9. 实现 History 数据 API（替代硬编码）
10. 前端 DashboardPage 改为 API 调用
11. 前端 HistoryPage 改为 API 调用

### 第三阶段：配置与采集（3-5天）
12. 实现数据源配置 CRUD API
13. 实现简单的爬虫引擎（HTTP + HTML 解析）
14. 实现定时任务调度
15. 前端 ConfigPage 改为 API 调用
16. 执行日志对接后端

### 第四阶段：优化与部署（2-3天）
17. 前端 loading/error/空数据状态完善
18. 处理侧边栏通知入口（注释/disabled）
19. 编写/更新 README
20. 部署验证

---

## 附录：前端改动清单

### 新增文件
```
Passionfruitpricetracker/
├── src/
│   ├── api/                          # 新增
│   │   ├── client.ts                # axios 实例 + 拦截器
│   │   ├── dashboard.ts            # 行情数据 API
│   │   ├── history.ts              # 历史数据 API
│   │   ├── config.ts               # 配置 API
│   │   └── types.ts                # API 响应类型
│   ├── hooks/                        # 新增
│   │   └── useApi.ts               # 通用 API 请求 Hook（loading/error/data）
│   └── types/                        # 新增（或放 shared/）
│       └── price.ts                # 数据结构类型定义
├── .env.development                  # 新增：VITE_API_BASE_URL=http://localhost:3001/api
├── .env.production                   # 新增：VITE_API_BASE_URL=/api
└── .env.example                      # 新增：环境变量模板
```

### 修改文件
| 文件 | 改动 |
|------|------|
| `package.json` | 新增依赖 `axios` |
| `vite.config.ts` | 新增 `server.proxy` 配置 |
| `DashboardPage.tsx` | 删除硬编码数据，改用 API 调用 |
| `HistoryPage.tsx` | 删除硬编码数据，改用 API 调用（保留分页/搜索逻辑） |
| `ConfigPage.tsx` | 删除硬编码数据，改用 API 调用 |
| `Sidebar.tsx` | 通知菜单项标记为 disabled/注释 |
| `App.tsx` | 无需大改，路由逻辑不变 |

---

## 七、最终确认的技术决策（V1.4）

以下为用户确认的最终方案：

| 决策项 | 选择 |
|--------|------|
| 后端语言 | Node.js |
| 后端框架 | Express |
| 数据库 | MySQL 8.0 |
| 数据库驱动 | mysql2（连接池） |
| 部署方案 | Docker Compose（MySQL + Server + Client/nginx） |
| 初期部署目标 | Windows 个人电脑 |
| 远期部署目标 | 云服务器 |
| Git 策略 | Monorepo，新建仓库，全新上传 |
| 通知功能 | 暂不实现，侧边栏 disabled，后端返回 501 |

## 八、Docker 服务架构

```
docker-compose.yml
├── mysql (8.0)
│   ├── 端口: 3306
│   ├── 数据卷: mysql_data（持久化）
│   └── 初始化: init-data.sql（自动建表+种子数据）
├── server (Node.js)
│   ├── 端口: 3001
│   ├── 依赖: mysql（healthcheck 通过后才启动）
│   └── 重连: 最多 10 次，间隔 3s
└── client (nginx)
    ├── 端口: 80
    ├── 反向代理 /api/ → server:3001
    └── SPA fallback 到 index.html
```

## 九、已完成的文件清单

### 新增文件
```
Passionfruitpricetracker/
├── docker-compose.yml
├── .env（Docker 环境变量）
├── client/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── .env.development
│   ├── .env.production
│   ├── .env.example
│   └── src/api/
│       ├── client.ts
│       ├── dashboard.ts
│       ├── history.ts
│       ├── config.ts
│       └── types.ts
├── server/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env（本地开发）
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   ├── database.ts
│       │   ├── init-db.ts
│       │   └── init-data.sql
│       ├── routes/
│       │   ├── dashboard.ts
│       │   ├── history.ts
│       │   ├── config.ts
│       │   └── notification.ts
│       ├── controllers/
│       │   ├── dashboardController.ts
│       │   ├── historyController.ts
│       │   └── configController.ts
│       └── index.ts
└── shared/
    └── types/
        └── price.ts
```

### 修改文件
| 文件 | 改动 |
|------|------|
| `.gitignore` | 新增数据库文件、爬虫缓存忽略 |
| `pnpm-workspace.yaml` | 改为 `['client', 'server']` |
| `README.md` | 完整重写，含 Docker/MySQL 说明 |
| `client/package.json` | name 改为 `passion-fruit-client`，新增 axios |
| `client/vite.config.ts` | 新增 `server.proxy` |
| `client/.../Sidebar.tsx` | 通知菜单 disabled |
