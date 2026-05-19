# Passion Fruit Price Tracker

黄金百香果价格追踪器 — Monorepo 前后端分离项目，支持 Docker 一键部署

## 项目简介

自动追踪多个数据源的黄金百香果价格行情，提供数据采集、历史查询、配置管理、趋势图表等功能。

| 模块 | 目录        | 技术栈                                                         |
| -- | --------- | ----------------------------------------------------------- |
| 前端 | `client/` | React 18 + Vite 6 + TypeScript + Tailwind CSS 3 + shadcn/ui |
| 后端 | `server/` | Express 4 + TypeScript + MySQL 8.0 + axios                  |

## 技术栈详情

### 前端

- **框架**：React 18.3.1 + Vite 6.3.5 + TypeScript
- **样式**：Tailwind CSS 3.4.17 + CSS Variables (shadcn/ui 主题)
- **UI 组件**：Radix UI（Label、Slot、Switch、Tabs）+ 自定义 shadcn/ui 组件
- **图表**：Recharts 2.15.2（走势图）
- **HTTP**：axios 1.16.0
- **工具**：clsx + tailwind-merge + class-variance-authority

### 后端

- **框架**：Express 4.21 + TypeScript 5.6
- **数据库**：MySQL 8.0 + mysql2 3.22（连接池）
- **爬虫**：axios（HTTP 请求）+ Cheerio 1.2（HTML 解析）
- **定时任务**：node-schedule 2.1.1
- **开发热重载**：tsx 4.19

### 部署

- Docker + Docker Compose（MySQL + Server + Client/nginx 三容器）
- 支持 Windows / Linux 跨平台

## 快速开始

### 方式一：Docker 部署（推荐）

**前提**：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

#### 配置 Docker 国内镜像加速（必做）

Windows Docker Desktop：Settings → Docker Engine → 添加：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

Linux：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
```

#### 启动项目

```bash
docker-compose up -d --build
```

启动后访问：

- 前端页面：<http://localhost:3000/>
- 后端 API：<http://localhost:3001/api/>

```bash
# 停止服务
docker-compose down

# 停止并清除数据
docker-compose down -v
```

## 部署到最终用户电脑

### 准备工作

1. 在您的电脑上确保项目可以正常运行
2. 准备一个U盘或使用网络传输工具（如微信、百度网盘等）
3. 确保用户电脑已安装 Docker Desktop

### 部署步骤

#### 步骤 1：将项目文件打包

在您的电脑上，将整个项目文件夹（`11baixiangguo2`）压缩成一个 ZIP 包。

#### 步骤 2：传输到用户电脑

将压缩包通过 U 盘或网络传输工具发送给用户，让用户解压到某个目录（例如 `D:\11baixiangguo2` 或 `~/11baixiangguo2`）。

#### 步骤 3：用户电脑上的准备工作

用户需要在自己的电脑上完成以下准备：

1. 安装 Docker Desktop
   - Windows: https://www.docker.com/products/docker-desktop/
   - Linux: 按照发行版的 Docker 安装指南

2. 配置 Docker 国内镜像加速（同上述"配置 Docker 国内镜像加速"）

#### 步骤 4：启动项目

用户在项目目录下打开终端（Windows 使用 PowerShell 或 CMD，Linux 使用 bash），执行：

```bash
cd 11baixiangguo2
docker-compose up -d --build
```

首次启动会下载 Docker 镜像，需要一些时间，请耐心等待。

#### 步骤 5：访问应用

启动成功后，用户可以通过浏览器访问：
- 前端页面：<http://localhost:3000/>

## 更新代码（不删除数据）

### 重要说明

项目使用 Docker Volume 来持久化数据，**只要不使用 `docker-compose down -v` 命令，数据就不会丢失**。

数据库数据存储在 `mysql_data` volume 中，OpenClaw 配置存储在 `openclaw_data` volume 中。

### 更新步骤

#### 步骤 1：备份数据（可选但推荐）

在更新前，建议先备份数据库，以防万一：

```bash
# 备份 MySQL 数据库
docker exec passion-fruit-mysql mysqldump -u root -proot passion_fruit > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 步骤 2：停止当前运行的容器

在项目目录下执行：

```bash
docker-compose down
```

注意：**不要加 `-v` 参数**，否则会删除数据卷！

#### 步骤 3：更新代码

将新的代码文件复制到项目目录，覆盖旧文件。确保保留以下内容：
- `docker-compose.yml`（如需修改请谨慎）
- `.openclaw/` 目录（包含 OpenClaw 技能配置）

#### 步骤 4：重新构建并启动容器

```bash
docker-compose up -d --build
```

#### 步骤 5：验证更新

访问应用，检查功能是否正常，数据是否完整。

### 回滚步骤（如更新出现问题）

如果更新后出现问题，可以回滚：

1. 停止当前容器：`docker-compose down`
2. 恢复旧代码文件
3. 重新启动：`docker-compose up -d --build`
4. 如需恢复数据库备份：
   ```bash
   docker exec -i passion-fruit-mysql mysql -u root -proot passion_fruit < backup_20260519_120000.sql
   ```

## 数据管理

### 查看数据卷

```bash
docker volume ls
```

项目使用的数据卷：
- `11baixiangguo2_mysql_data` - MySQL 数据库数据
- `11baixiangguo2_openclaw_data` - OpenClaw 配置数据

### 备份数据卷

```bash
# 备份 MySQL 数据卷
docker run --rm -v 11baixiangguo2_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# 备份 OpenClaw 数据卷
docker run --rm -v 11baixiangguo2_openclaw_data:/data -v $(pwd):/backup alpine tar czf /backup/openclaw_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### 恢复数据卷

```bash
# 恢复 MySQL 数据卷
docker run --rm -v 11baixiangguo2_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_data_backup_20260519_120000.tar.gz -C /data

# 恢复 OpenClaw 数据卷
docker run --rm -v 11baixiangguo2_openclaw_data:/data -v $(pwd):/backup alpine tar xzf /backup/openclaw_data_backup_20260519_120000.tar.gz -C /data
```

### 方式二：本地开发

**前提**：Node.js 18+、MySQL 8.0

#### Windows

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS passion_fruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 安装依赖
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. 配置后端环境变量
cd server
copy .env.example .env
# 编辑 .env 修改数据库连接信息

# 4. 启动后端（端口 3001）
npm run dev

# 5. 新终端启动前端（端口 5173）
cd ../client
npm run dev
```

#### Linux

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS passion_fruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 安装 npm 依赖
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. 配置环境变量
cp .env.example .env

# 4. 启动后端
npm run dev

# 5. 启动前端
cd ../client
npm run dev
```

开发环境访问：

- 前端：<http://localhost:5173/>
- API：<http://localhost:3001/api/>

***

## 项目结构

```
项目根目录/
├── client/                              # 前端项目
│   ├── src/
│   │   ├── api/                         # API 请求层
│   │   │   ├── client.ts                # axios 实例（baseURL + 拦截器）
│   │   │   ├── config.ts                # 配置 API + 抓取 API
│   │   │   ├── dashboard.ts             # 行情数据 API + 走势图 API
│   │   │   ├── history.ts               # 历史数据 API（分页/搜索）
│   │   │   └── types.ts                 # API 公共类型定义
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── ui/                  # shadcn/ui 10个组件
│   │   │   │   │   ├── badge.tsx        # 徽章
│   │   │   │   │   ├── button.tsx       # 按钮
│   │   │   │   │   ├── card.tsx         # 卡片
│   │   │   │   │   ├── dialog.tsx       # 对话框（走势图弹窗）
│   │   │   │   │   ├── input.tsx        # 输入框
│   │   │   │   │   ├── label.tsx        # 标签
│   │   │   │   │   ├── switch.tsx       # 开关
│   │   │   │   │   ├── table.tsx        # 表格
│   │   │   │   │   ├── tabs.tsx         # 标签页
│   │   │   │   │   ├── textarea.tsx     # 文本域
│   │   │   │   │   └── utils.ts         # cn() 工具函数
│   │   │   │   ├── ConfigPage.tsx       # 数据采集配置与日志页
│   │   │   │   ├── DashboardPage.tsx    # 最新行情数据页（含走势图弹窗）
│   │   │   │   ├── HistoryPage.tsx      # 数据采集历史页（分页/搜索）
│   │   │   │   ├── OpenclawConfigPage.tsx  # 数据通知与配置页（OpenClaw + 微信绑定管理）
│   │   │   │   └── Sidebar.tsx          # 侧边栏导航
│   │   │   └── App.tsx                  # 根组件（路由切换）
│   │   ├── styles/
│   │   │   └── index.css                # Tailwind + CSS Variables 主题
│   │   └── main.tsx                     # 入口
│   ├── Dockerfile                       # nginx 多阶段构建
│   ├── nginx.conf                       # API 反向代理 + SPA fallback
│   ├── vite.config.ts                   # 开发代理 + 路径别名
│   ├── tailwind.config.js               # shadcn/ui 颜色体系
│   ├── postcss.config.js
│   └── package.json
│
├── server/                              # 后端项目
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts              # MySQL 连接池（utf8mb4 / +08:00）
│   │   │   ├── init-db.ts               # 数据库初始化 + 表迁移 + 脏数据清理
│   │   │   └── init-data.sql            # 建表 DDL + 种子数据
│   │   ├── controllers/
│   │   │   ├── configController.ts      # 数据源 CRUD + 任务状态 + 执行日志
│   │   │   ├── crawlerController.ts     # 手动触发爬虫（互斥锁防重入）
│   │   │   ├── dashboardController.ts   # 行情数据 + 走势图数据（含7日统计计算）
│   │   │   ├── openclawController.ts     # OpenClaw/微信绑定管理（状态/登录/解绑）
│   │   ├── routes/
│   │   │   ├── config.ts                # /api/config/*
│   │   │   ├── crawler.ts               # /api/crawler/*
│   │   │   ├── dashboard.ts             # /api/dashboard/*
│   │   │   ├── history.ts               # /api/history/*
│   │   │   └── openclaw.ts              # /api/openclaw/*
│   │   ├── services/
│   │   │   ├── crawlerService.ts        # 爬虫引擎（BXX + Xinfadi + Huinong）
│   │   │   └── schedulerService.ts      # 定时调度 + 启动自动采集
│   │   └── index.ts                     # Express 入口 + 数据库重连 + 调度启动
│   ├── Dockerfile                       # 多阶段构建（纯 Node.js，无需浏览器）
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml                   # 三容器编排（MySQL + Server + Client）
├── pnpm-workspace.yaml                  # pnpm monorepo 声明
├── .gitignore
└── README.md
```

***

## 数据源说明

| ID | 名称       | 类型     | 平台    | 采集方式                   | 频率            | 状态 |
| -- | -------- | ------ | ----- | ---------------------- | ------------- | -- |
| 1  | 百香果信息平台  | 自媒体    | 微信公众号 | 搜狗微信搜索 → 文章解析           | 每周二/四/六 22:00 | ✅ |
| 2 | 惠农网黄金百香果 | 电商平台 | 惠农网 | 惠农网行情大厅 API             | 每日 22:00 | ✅ |
| 3  | 北京新发地百香果 | 大型批发市场 | 北京新发地 | axios POST 请求 `getPriceData.html` | 每日 22:00 | ✅ |
| 4  | 广州江南百香果 | 大型批发市场 | 广州江南果菜批发市场 | axios GET 请求 `/api/dailypricelist` | 每日 22:00 | ✅ |

> **说明**：
> 
> - 百香果信息平台（源1）：搜狗微信搜索公众号文章 → 解析表格提取价格数据
> - 惠农网（源2）：惠农网行情大厅 API，采集黄金百香果最新价格与7日均价
> - 北京新发地（源3）：已完整实现！
>   - API：`POST http://www.xinfadi.com.cn/getPriceData.html`
>   - 参数：`limit=200&current=1&pubDateStartTime=YYYY/MM/DD&pubDateEndTime=YYYY/MM/DD&prodName=百香果`
>   - 去重：按 **发布日期 + 二级分类** 去重，同一日期同一分类只保存一条
>   - 数据字段：一级分类、二级分类、品名、最低价、平均价、最高价、规格、产地、单位、发布日期
>   - 日期范围：从数据库最新日期后一天到当前日期，最早不超过 2026-04-01
>   - 容错：失败自动重试3次，每次间隔 2-5 秒
>   - 数据默认倒序：按发布日期降序排列
> - 广州江南（源4）：已完整实现！
>   - API：`GET https://www.jnmarket.net/api/dailypricelist`
>   - 参数：`pageNum=1&pageSize=500&kind=2&productName=百香果`
>   - 去重：按 **发布日期 + 产地** 去重，同一日期同一产地只保存一条
>   - 数据字段：产品名称、产地、最高价、最低价、参考价、规格、发布日期
>   - 日期范围：从数据库最新日期后一天到当前日期，最早不超过 2026-04-01
>   - 容错：失败自动重试3次，每次间隔 2-5 秒
>   - 数据默认倒序：按发布日期降序排列
>   - 趋势图：Dashboard 页面显示近1月均价走势（Recharts 折线图）

***

## 数据库设计

### data_sources（数据源配置表）

| 字段              | 类型                     | 说明                             |
| --------------- | ---------------------- | ------------------------------ |
| id              | INT AUTO_INCREMENT PK | 主键                             |
| type            | VARCHAR(50)            | 类型（自媒体/电商平台/大型批发市场）            |
| platform        | VARCHAR(100)           | 平台名称                           |
| name            | VARCHAR(100)           | 数据源名称                          |
| url             | VARCHAR(500)           | 数据源 URL                        |
| scope           | VARCHAR(500)           | 采集数据范围描述                       |
| schedule        | VARCHAR(200)           | 采集周期                           |
| enabled         | TINYINT(1)             | 是否启用                           |
| status          | VARCHAR(20)            | 最近执行状态（success/failed/running） |
| last_run       | VARCHAR(50)            | 上次执行时间                         |
| duration        | VARCHAR(20)            | 执行时长                           |
| records         | INT                    | 最近采集记录数                        |
| execution_type | VARCHAR(100)           | 执行类型                           |

### price_records（价格记录表）

| 字段                         | 类型                     | 说明                                                     |
| -------------------------- | ---------------------- | ------------------------------------------------------ |
| id                         | INT AUTO_INCREMENT PK | 主键                                                     |
| source_type               | VARCHAR(20)            | 来源类型（bxx/huinong/xinfadi/jiangnan）                     |
| source_id                 | INT FK                 | 关联数据源 ID                                               |
| name / product             | VARCHAR(100)           | 产品名称                                                   |
| province / region / origin | VARCHAR                | 产地信息                                                   |
| high_price                | DECIMAL(10,2)          | 最高价 / 近7日最高价                                           |
| low_price                 | DECIMAL(10,2)          | 最低价 / 近7日最低价                                           |
| avg_price                 | DECIMAL(10,2)          | 均价 / 当日最新价格                                            |
| avg7_price                | DECIMAL(10,2)          | 近7日均价（惠农网专用）                                           |
| rise_fall                 | VARCHAR(10)            | 升/降（惠农网专用）                                             |
| trend_chart               | VARCHAR(500)           | 走势图链接（惠农网专用）                                           |
| price_type                | VARCHAR(20)            | 价类（产地价/批发价）                                            |
| spec / unit                | VARCHAR                | 规格 / 单位                                                |
| category1 / category2      | VARCHAR(50)            | 一/二级分类（新发地专用）                                          |
| record_date               | DATE                   | 报价日期                                                   |
| **索引**                     | <br />                 | source_type, record_date, (source_id, record_date) |

### crawl_logs（采集日志表）

| 字段         | 类型                     | 说明                     |
| ---------- | ---------------------- | ---------------------- |
| id         | INT AUTO_INCREMENT PK | 主键                     |
| source_id | INT FK                 | 关联数据源 ID               |
| level      | VARCHAR(20)            | 级别（info/success/error） |
| message    | TEXT                   | 日志详情                   |

### task_executions（任务执行记录表）

| 字段                                       | 类型                     | 说明               |
| ---------------------------------------- | ---------------------- | ---------------- |
| id                                       | INT AUTO_INCREMENT PK | 主键               |
| source_id / source_name / source_type | VARCHAR                | 数据源信息冗余          |
| status                                   | VARCHAR(20)            | 执行状态             |
| execution_type                          | VARCHAR(100)           | 触发类型（手动/定时/系统启动） |
| execution_time                          | TIMESTAMP              | 执行时间             |
| duration / records                       | VARCHAR/INT            | 执行耗时 / 记录数       |
| error_message                           | TEXT                   | 错误信息             |

***

## API 接口

### Dashboard — 最新行情数据

| 方法  | 路径                                            | 说明                                          |
| --- | --------------------------------------------- | ------------------------------------------- |
| GET | `/api/dashboard`                              | 获取 4 个数据源最新行情（bxx/huinong/xinfadi/jiangnan） |
| GET | `/api/dashboard/huinong-trend?origin=&days=7` | 惠农网某产地近 N 日走势图数据                            |
| GET | `/api/dashboard/xinfadi-trend?days=30`        | 北京新发地近 N 日走势图数据                             |

> Dashboard 接口`/api/dashboard`内部逻辑亮点：
>
> - 北京新发地只显示最新一条记录
> - 所有数据按记录日期倒序排列

### History — 数据采集历史

| 方法  | 路径                                                       | 说明                                             |
| --- | -------------------------------------------------------- | ---------------------------------------------- |
| GET | `/api/history?source=&keyword=&date=&page=1&pageSize=15` | 分页查询历史价格，支持关键词搜索（省/地区/产地/产品/规格等多字段模糊匹配）和日期精确筛选 |

### Config — 数据采集配置

| 方法  | 路径                        | 说明                                  |
| --- | ------------------------- | ----------------------------------- |
| GET | `/api/config/sources`     | 获取数据源列表                             |
| PUT | `/api/config/sources/:id` | 更新数据源配置（url/scope/schedule/enabled） |
| GET | `/api/config/tasks`       | 获取任务执行记录（来自 task_executions 表）     |
| GET | `/api/config/logs`        | 获取采集日志（最近 100 条）                    |

### Crawler — 数据抓取

| 方法  | 路径                    | 说明              |
| --- | --------------------- | --------------- |
| POST | `/api/crawler/manual` | 手动触发数据抓取，body: `{ sourceId: 1|2|3|4 }`，有互斥锁防重入 |

### Health

| 方法  | 路径            | 说明              |
| --- | ------------- | --------------- |
| GET | `/api/health` | 健康检查，返回状态和服务器时间 |

### OpenClaw — 微信绑定管理

| 方法  | 路径                              | 说明                                  |
| --- | ------------------------------- | ----------------------------------- |
| GET | `/api/openclaw/weixin/status`   | 获取微信绑定状态（是否绑定/账号列表/登录命令）            |
| GET | `/api/openclaw/weixin/login`    | 启动微信扫码登录（SSE 实时返回终端输出，支持自动执行绑定）  |
| POST | `/api/openclaw/weixin/unbind`   | 解绑所有已绑定的微信账号（删除凭证文件）

***

## 前端页面一览

| 页面      | 组件              | 状态 | 功能                                                  |
| ------- | --------------- | -- | --------------------------------------------------- |
| 最新行情数据  | `DashboardPage` | ✅  | 4 个数据源 Tab 切换，展示最新价格表格、数据源均价、走势图弹窗（Recharts 折线图）    |
| 数据采集配置  | `ConfigPage`    | ✅  | 3 个子 Tab：数据源配置（4 张卡片 + 一键执行全部）+ 任务状态（统计卡片 + 表格）+ 执行日志 |
| 数据采集历史  | `HistoryPage`   | ✅  | 4 个数据源 Tab 切换，关键词搜索 + 日期筛选 + 分页（含页码组件）              |
| 数据通知与配置 | `OpenclawConfigPage` | ✅  | 配置页面（不再直接跳转外链）：「打开 OpenClaw」按钮（新窗口打开 Web UI）+ 微信 ClawBot 绑定管理（状态查看/扫码登录/取消绑定/重新绑定） |

### Sidebar 侧边栏

- 可折叠/展开（默认收起，16px 宽图标模式）
- 4 个菜单项：最新行情数据 / 数据采集配置 / 数据采集历史 / 数据通知与配置（配置页面：OpenClaw Web UI 入口 + 微信 ClawBot 绑定管理）
- 展开态显示"百香果价格推送"标题和服务器日期

***

## 爬虫调度机制

系统启动流程（`server/src/index.ts`）：

1. **数据库重连**：最多重试 10 次（间隔 3s），失败则退出
2. **初始化表结构**：执行 `init-data.sql` + 增量 ALTER TABLE + 脏数据清理
3. **启动定时任务**（`schedulerService.ts`）：
   - 百香果信息平台：每周二/四/六 **22:00**
   - 惠农网黄金百香果：每日 **22:00**
   - 北京新发地：每日 **22:00**
   - 广州江南：每日 **22:00**
4. **延迟 5s 后执行启动采集**：自动执行 BXX + Xinfadi + Jiangnan 首次采集（补全缺失日期数据）

所有爬虫任务有全局互斥锁（`isRunning`），防止定时任务和手动触发冲突。

### 爬虫逻辑要点

**百香果信息平台（源1）**：搜狗微信搜索 → 匹配公众号文章 → 解析 HTML 表格 → 按省/地区/市斤价/规格存储

**惠农网（源2）**：惠农网行情大厅 API → 搜索黄金百香果 → 采集列表数据（时间/产品/产地/价格/升/降/走势图）

**北京新发地（源3）**：

1. **获取最新日期**：从 `price_records` 表查询 `source_type='xinfadi'` 且 `source_id=3` 的最大 `record_date`
2. **日期范围**：
   - 起始日期：`最新日期 + 1天`
   - 结束日期：当前日期
   - 最早不超过 2026-04-01
3. **HTTP 请求**：
   - URL：`http://www.xinfadi.com.cn/getPriceData.html`
   - 方法：POST
   - Content-Type：`application/x-www-form-urlencoded`
   - 参数：`limit=200&current=1&pubDateStartTime=YYYY/MM/DD&pubDateEndTime=YYYY/MM/DD&prodName=百香果`
4. **数据解析**：从返回 JSON 的 `list` 数组中筛选 `prodName` 包含"百香果"或"黄金百香果"的记录
5. **去重处理**：按 `record_date + category2`（发布日期 + 二级分类）去重，同一日期同一分类只保存一条
6. **失败重试**：最多重试 3 次，每次间隔 2-5 秒随机延迟
7. **入库存储**：保存到 `price_records` 表，字段映射：`category1=prodCat`, `category2=prodPcat`, `name=prodName`, `low_price=lowPrice`, `high_price=highPrice`, `avg_price=avgPrice`, `spec=specInfo`, `origin=place`, `unit=unitInfo`, `record_date=pubDate`（截取日期部分）

**广州江南（源4）**：
- API：`GET https://www.jnmarket.net/api/dailypricelist?pageNum=1&pageSize=500&kind=2&productName=百香果`
- 去重：按发布日期 + 产地去重
- 失败重试：最多 3 次，每次间隔 2-5 秒

***

## 环境变量

### 后端（server/.env）

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=passion_fruit
PORT=3001
```

### 前端（client/.env）

```
# 开发环境（client/.env.development）
VITE_API_BASE_URL=http://localhost:3001/api

# 生产环境（client/.env.production）
VITE_API_BASE_URL=/api
```

> Docker 部署时，nginx 将 `/api/` 反向代理到 `server:3001`，无需设置前端环境变量。

***

## Docker 架构

```
docker-compose.yml
├── mysql (8.0)
│   ├── 端口: ${DB_PORT:-3307}:3306
│   ├── 数据卷: mysql_data（持久化）
│   ├── 初始化: init-data.sql（自动建表 + 种子数据）
│   └── 健康检查: mysqladmin ping（10s 间隔）
├── server (Node.js)
│   ├── 端口: ${PORT:-3001}:3001
│   ├── 依赖: mysql healthcheck 通过后才启动
│   ├── 共享卷: openclaw_data（读写，管理微信绑定凭证）
│   └── 无需浏览器，纯 axios HTTP 请求
├── client (nginx:alpine)
│   ├── 端口: 3000:80
│   ├── /api/ → http://server:3001（反向代理，300s 超时）
│   └── 前端静态文件 + SPA fallback
└── openclaw (ghcr.io/openclaw/openclaw:latest)
    ├── 端口: ${OPENCLAW_PORT:-18789}:18789
    ├── 数据卷: openclaw_data（持久化配置 + 插件）
    ├── DB 脚本: ./server/src/config → /home/node/.openclaw/db-scripts（只读）
    └── 已安装: @tencent-weixin/openclaw-weixin 微信插件
```

### Dockerfile 要点

- **client**：node:20-alpine 构建 → nginx:alpine 运行，使用 npmmirror.com 镜像源
- **server**：node:20-bullseye 构建 + 运行，系统源替换为 mirrors.aliyun.com，**无 Playwright/Chromium 依赖**
- **openclaw**：ghcr.io 官方公共镜像，国内可配置 `ghcr.nju.edu.cn` 南京大学镜像加速

***

## npm 国内镜像配置

项目已配置 `.npmrc` 使用国内镜像加速：

```
registry=https://registry.npmmirror.com
```

***

## 开发说明

- 前后端均使用 **TypeScript** 严格模式
- 前端样式使用 **Tailwind CSS 3** + CSS Variables 主题（shadcn/ui 风格），遵循原子化 CSS 原则
- 后端使用 **ESM**（`"type": "module"`）
- 数据库字符集统一 **utf8mb4**，时区 **+08:00**（Asia/Shanghai）
- 项目根目录有 `pnpm-workspace.yaml`（声明 monorepo 结构），但日常开发使用 npm 命令
- Docker 部署时 MySQL 数据持久化在 `mysql_data` volume 中
- 爬虫使用 **纯 axios HTTP 请求**，无需浏览器

***

## 功能状态一览

| 功能                    | 前端         | 后端 API | 数据库   | 状态        |
| --------------------- | ---------- | ------ | ----- | --------- |
| 最新行情数据（4 Tab）         | ✅          | ✅      | MySQL | 完成        |
| 数据采集配置（4 Tab）         | ✅          | ✅      | MySQL | 完成        |
| 数据采集历史（分页/搜索）         | ✅          | ✅      | MySQL | 完成        |
| 百香果信息平台爬虫             | ✅          | ✅      | MySQL | 完成        |
| 惠农网爬虫                 | ✅          | ✅      | MySQL | 完成        |
| 北京新发地爬虫（axios）        | ✅          | ✅      | MySQL | 完成        |
| 广州江南数据源（axios）       | ✅          | ✅      | MySQL | 完成        |
| 价格走势图（Recharts）       | ✅          | ✅      | MySQL | 完成        |
| 定时调度（node-schedule）   | —          | ✅      | —     | 完成        |
| 执行日志记录                | ✅          | ✅      | MySQL | 完成        |
| 数据通知与配置（OpenClaw）  | ✅          | —      | MySQL | 完成        |

## OpenClaw 配置与使用

### 简介

OpenClaw 是一个开源 AI 网关和智能体运行平台，本项目已通过 Docker Compose 集成，实现微信通知推送和数据交互。

### 当前配置状态

| 配置项 | 状态 | 说明 |
| ----- | -- | --- |
| OpenClaw 服务 | ✅ 运行中 | 端口 18789，令牌认证 |
| AI 模型 | ✅ | `bailian/glm-5`（阿里云百炼 ZHIPU GLM-5） |
| 系统提示词 | ✅ 已配置 | `systemPromptOverride` 覆盖，定制为百香果报价查询 |
| 数据库查询 | ✅ 可用 | Node.js + mysql2 脚本，1023条历史记录 |
| 微信插件 | ✅ 已安装 | `@tencent-weixin/openclaw-weixin@2.4.3` |
| 百香果技能 | ✅ 已部署 | `.openclaw/skills/passion-fruit-quote/` 含完整SQL模板 |

### 技能：百香果报价查询

OpenClaw已配置为百香果报价查询专用机器人，具有以下技能：

| 场景 | 触发词 | 功能 |
|------|--------|------|
| 今日行情 | 今日价格、最新价格、百香果价格 | 查询四个数据源最新报价（表格） |
| 单独数据源 | 百香果信息平台/惠农网/新发地/江南 | 查询指定数据源最新价格 |
| 本周走势 | 本周价格走势、7日价格、周报 | 7日均价趋势（表格+matplotlib图） |
| 本月走势 | 本月价格走势、30日价格、月报 | 30日均价趋势 |
| 本季走势 | 本季价格走势、90日价格、季报 | 90日均价趋势 |
| 本年走势 | 本年价格走势、365日价格、年报 | 365日均价趋势 |
| 非报价问题 | 其他问题 | 回复"我只能查询百香果报价" |

### 快速配置

#### 1. 配置阿里云百炼 API Key（已完成）

当前已配置您的阿里云百炼 API Key，默认使用智谱 GLM-5 模型：
- Base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 模型: `glm-5`
- 上下文窗口: 202,752 tokens

如需修改 API Key，可执行：
```bash
docker exec passion-fruit-openclaw openclaw config set models.providers.bailian.apiKey "你的新密钥"
docker-compose restart openclaw
```

#### 2. 连接微信 ClawBot

前提：PC 版微信已安装 ClawBot 插件（微信「我 → 设置 → 插件」中查看）

```bash
docker exec -it passion-fruit-openclaw openclaw channels login --channel openclaw-weixin
```

按终端提示用手机微信扫描二维码完成配对。

#### 3. 访问 OpenClaw

- 方式一：前端侧边栏点击「数据通知与配置」→ 新窗口打开
- 方式二：直接访问 http://localhost:18789

### 访问项目数据库

OpenClaw 容器中已配置数据库环境变量：

```json
{
  "env": {
    "DB_HOST": "mysql",
    "DB_PORT": "3306",
    "DB_USER": "root",
    "DB_PASSWORD": "root",
    "DB_NAME": "passion_fruit"
  }
}
```

数据库建表脚本已挂载到 `/home/node/.openclaw/db-scripts/`，OpenClaw 智能体可通过这些信息直接查询项目数据库。

### 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENCLAW_PORT` | `18789` | OpenClaw 服务端口 |
| `VITE_OPENCLAW_PORT` | `18789` | 前端跳转时使用的 OpenClaw 端口 |

### 国内镜像加速

如果拉取 `ghcr.io/openclaw/openclaw:latest` 速度慢，可使用南京大学镜像站：

```bash
# 在 docker-compose.yml 中将 image 替换为：
ghcr.nju.edu.cn/openclaw/openclaw:latest
```

***

## 版本历史

### V7.2 — 微信绑定自动化（当前）

- **修改「绑定微信」功能**：按钮文字从「获取绑定命令」改为「绑定微信」
- **实现自动执行绑定**：点击按钮后，系统自动执行 `docker exec` 命令，无需用户手动操作
- **实时输出显示**：使用 SSE（Server-Sent Events）实时显示终端输出，包括二维码
- **server 容器配置**：
  - 挂载 Docker socket：`/var/run/docker.sock:/var/run/docker.sock`
  - 安装 Docker CLI 工具（通过阿里云镜像加速）
- **前端界面更新**：添加执行状态和输出日志显示区域，支持取消执行
- **API 调整**：`/api/openclaw/weixin/login` 改为 GET 请求，支持 SSE 流式输出

### V7.1 — 数据通知与配置页面重新设计

- **重新设计「数据通知与配置」页面**：从直接跳转外部 OpenClaw URL 改为内置配置页面
- **卡片一：打开 OpenClaw**：点击按钮在新窗口中打开 `http://localhost:{OPENCLAW_PORT}`（默认 18789）
- **卡片二：绑定微信 ClawBot**：显示当前绑定状态（已绑定/未绑定），支持三种操作：
  - **获取绑定命令**：生成 `docker exec` 命令，一键复制后在终端运行，扫描二维码完成绑定
  - **取消绑定**：删除所有微信凭证文件，重启 OpenClaw 后生效
  - **重新绑定**：重新获取绑定命令（已绑定状态下显示）
- **新增后端 API**：`GET /api/openclaw/weixin/status`、`POST /api/openclaw/weixin/login`、`POST /api/openclaw/weixin/unbind`
- **共享数据卷**：server 与 openclaw 容器共享 `openclaw_data` 卷，server 可直接读写微信凭证文件
- **修复**：微信凭证目录路径指向 `/openclaw_data/openclaw-weixin/`

### V7.0 — 数据通知与配置（OpenClaw 集成）

- **新增 OpenClaw 服务**：Docker Compose 集成 OpenClaw，使用 ghcr.io 官方镜像（国内可切换南京大学镜像 `ghcr.nju.edu.cn`）
- **开放数据通知与配置菜单**：前端侧边栏启用，点击在新窗口打开 OpenClaw Web UI（端口 18789）
- **配置 AI 模型**：默认使用阿里云百炼 `glm-5` 智谱大模型（202,752 token 上下文）
- **微信 ClawBot 支持**：安装 `@tencent-weixin/openclaw-weixin@2.4.3` 插件，支持 PC 微信 ClawBot 连接
- **数据库访问**：env 配置 + 挂载 `./server/src/config` 为 DB 脚本目录（只读）
- **新增配置模板**：`.openclaw/openclaw.json.template` 含完整 channels/plugins/env 配置
- **安全配置**：本地开发模式 `allowInsecureAuth=true`，无需登录令牌
- **更新 README**：文档完整重构，新增配置状态一览表、国内镜像加速说明

### V6.0 — 广州江南百香果数据采集

- **新增数据源**：广州江南果菜批发市场（数据源 ID=4），大型批发市场
- **新增爬虫**：axios GET 请求 `/api/dailypricelist` API，参数 `productName=百香果` 直接筛选
- **数据去重**：按发布日期 + 产地去重
- **历史补采**：触发采集后自动补采最多 1 个月前数据
- **趋势图**：Dashboard 广州江南 Tab 显示近1月均价走势（Recharts 折线图）
- **API**：新增 `/api/dashboard/jiangnan-trend` 接口
- **定时调度**：每日 22:00 自动采集
- **更新 README**：文档同步更新，重点说明广州江南 API 调用方式

### V5.0 — 北京新发地爬虫重构（axios 替代 Playwright）

- **移除 Playwright/Chromium 依赖**：Docker 镜像更轻量，启动更快，无需浏览器
- **重构北京新发地爬虫**：改用 axios POST 直接请求 `getPriceData.html` API，JSON 解析，无需浏览器
- **增强去重逻辑**：同一发布日期 + 二级分类数据不重复采集
- **失败重试机制**：最多重试3次，每次间隔 2-5 秒
- **随机延迟**：每次请求间隔 1-3 秒随机延迟（当前单批次请求，后续如需分页会优化）
- **更新 Dockerfile**：移除所有 Chromium/Playwright 相关配置，简化构建
- **更新 README**：文档同步更新，重点说明新发地 API 调用方式
- **趋势图**：Dashboard 北京新发地 Tab 显示近1月均价走势（Recharts 折线图）

### V4.0 — 北京新发地百香果数据采集

- **新增数据源**：北京新发地百香果（数据源 ID=3），大型批发市场
- **新增爬虫**：Playwright 浏览器自动化（已废弃，被 V5.0 替代）
- **数据去重**：按发布日期去重
- **历史补采**：触发采集后自动补采最多 1 个月前数据
- **趋势图**：Dashboard 新增"查看近1月走势"按钮 → Dialog 弹窗 → Recharts 折线图
- **API**：新增 `/api/dashboard/xinfadi-trend` 接口
- **定时调度**：每日 22:00 自动采集

### V3.0 — 惠农网前端与行情计算增强

- **Dashboard 控制器**：新增近 7 日统计计算（最高价/最低价/均价从本地 DB 计算）、升/降值计算（对比前一天数据）、走势图数据接口 `/api/dashboard/huinong-trend`
- **前端**：Dashboard 惠农网 Tab 新增"近7日最高价/最低价/均价"列、走势图按钮 → Dialog 弹窗 → Recharts 折线图、升/降图标（TrendingUp/TrendingDown）自动识别
- **数据库**：price_records 表新增 `rise_fall`（升/降）和 `trend_chart`（走势图链接）字段，为后续惠农网爬虫做准备
- **数据采集历史**：惠农网 Tab 字段简化为时间/产品/产地/价格
- **UI 组件**：新增 Dialog 组件

### V2.3 — 惠农网黄金百香果爬虫初版

- 新增数据源 ID=2，Playwright 爬虫
- 采集样式：行情大厅 → 水果 → 百香果 → 黄金百香果
- 数据库新增 `avg7_price` 字段
- 修复 MySQL 乱码（utf8mb4）和 shadcn/ui 主题白底变灰问题

### V2.0 — 项目精简

- 删除 37 个未使用的 shadcn/ui 组件
- npm 依赖大幅精简（client 50+ → 13，server 8 → 6）
- Docker 改用系统 Chromium（apt 安装），不再下载 Playwright 浏览器
- 移除 TasksPage、notification 路由、shared/types、冗余配置文件

### V1.4 — MySQL + Docker 部署

- Mock 数据迁移到 MySQL 8.0
- Docker Compose 三容器部署方案
- 种子数据自动填充 + 后端数据库重连机制

### V1.3 — Monorepo 重构 + 后端初始化

- 目录结构重组为 `client/` + `server/` Monorepo
- Express 后端项目初始化，4 组 API 路由
- 前端新增 axios API 层

### V1.2 — 前端行情数据页面

- Dashboard / History / Config / Preview 4 个页面
- 硬编码 Mock 数据（当时无后端）

### V1.1 — 初始版本

- React + Vite 前端脚手架
- 基础百香果价格展示功能

## 常见问题与故障排查

### Docker 镜像拉取失败

#### 问题 1："unable to fetch descriptor which reports content size of zero"

**错误信息：**
```
ERROR: unable to fetch descriptor (sha256:...) which reports content size of zero: invalid argument
```

**解决方案：**

##### 方案一：清理 Docker 缓存（推荐首先尝试）

```bash
# 1. 清理 Docker 构建缓存
docker builder prune -af

# 2. 清理未使用的镜像
docker image prune -af

# 3. 如果还不行，清理所有缓存（谨慎使用）
docker system prune -af
```

清理完成后，重新运行：
```bash
docker-compose up -d --build
```

##### 方案二：更换 OpenClaw 镜像源

在 [docker-compose.yml](file:///e:/AI2026/11baixiangguo2/docker-compose.yml#L63-L70) 中尝试不同的镜像源：

```yaml
# 尝试 1：南京大学镜像（当前）
image: ghcr.nju.edu.cn/openclaw/openclaw:latest

# 尝试 2：同济大学镜像
image: ghcrproxy.tongjionline.org/openclaw/openclaw:latest

# 尝试 3：1Panel 镜像
image: docker.1panel.live/ghcr/openclaw/openclaw:latest

# 尝试 4：官方源（可能较慢）
image: ghcr.io/openclaw/openclaw:latest
```

更换后重新运行：
```bash
docker-compose up -d --build
```

##### 方案三：手动拉取镜像

```bash
# 先尝试手动拉取镜像
docker pull ghcr.nju.edu.cn/openclaw/openclaw:latest

# 如果成功，再启动
docker-compose up -d --build
```

##### 方案四：重启 Docker Desktop

1. 完全退出 Docker Desktop
2. 重新启动 Docker Desktop
3. 再次运行 `docker-compose up -d --build`

### MySQL 相关问题

#### 问题：MySQL 容器启动失败或无法连接

**解决方案：**

```bash
# 查看 MySQL 容器日志
docker logs passion-fruit-mysql

# 如果数据卷损坏，可以尝试（注意：这会删除所有数据！）
# docker-compose down -v
# docker-compose up -d --build
```

#### 问题：端口被占用

如果 3307、3000、3001 或 18789 端口被占用，可以修改 [docker-compose.yml](file:///e:/AI2026/11baixiangguo2/docker-compose.yml) 中的端口映射：

```yaml
ports:
  - "3308:3306"  # 将左侧改为其他端口
```

### 容器无法启动

**诊断步骤：**

```bash
# 1. 查看所有容器状态
docker-compose ps

# 2. 查看具体容器的日志
docker logs passion-fruit-server
docker logs passion-fruit-client
docker logs passion-fruit-openclaw

# 3. 尝试逐个启动服务
docker-compose up -d mysql
# 等待 MySQL 启动后
docker-compose up -d server
docker-compose up -d client
docker-compose up -d openclaw
```

### 网络问题

如果容器之间无法通信：

```bash
# 重启 Docker 网络
docker-compose down
docker network ls
docker network rm 11baixiangguo2_default  # 如果网络存在
docker-compose up -d --build
```

### 获取帮助

如果以上方案都无法解决问题：
1. 保存完整的错误日志
2. 记录 Docker 版本：`docker --version`
3. 记录系统环境（Windows/Linux，版本号）
4. 查阅项目 Issues 或寻求技术支持
