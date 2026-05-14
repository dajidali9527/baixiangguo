# Passion Fruit Price Tracker

黄金百香果价格追踪器 - 前后端分离项目（Monorepo + Docker）

## 项目简介

自动追踪多个数据源的黄金百香果价格行情，提供数据采集、历史查询、配置管理等功能。

| 模块 | 目录 | 说明 |
|------|------|------|
| 前端 | `client/` | React + Vite + shadcn/ui |
| 后端 | `server/` | Express + TypeScript + MySQL |
| 共享类型 | `shared/` | 前后端共享 TypeScript 类型定义 |

## 技术栈

### 前端（client）
- React 18.3.1 + Vite 6.3.5 + TypeScript
- Tailwind CSS 4.1.12 + shadcn/ui + Radix UI + Material-UI
- axios（HTTP 客户端）

### 后端（server）
- Express 4.21 + TypeScript
- MySQL 8.0 + mysql2（连接池）
- tsx（开发热重载）

### 部署
- Docker + Docker Compose
- 初期部署目标：Windows 个人电脑
- 远期部署目标：云服务器

## 快速开始

### 方式一：Docker 部署（推荐，一键启动）

**前提**：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（Windows）

#### ⚡ 先配置Docker国内镜像（必做！否则下载很慢）

**Windows Docker Desktop配置：**
1. 打开 Docker Desktop 设置
2. 进入 `Docker Engine`
3. 添加以下配置：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```
4. 点击 `Apply & Restart`

**Linux配置：**
```bash
# 编辑 /etc/docker/daemon.json
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
sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### 启动项目

```bash
# 在项目根目录执行
docker-compose up -d --build
```

启动后访问：
- 前端页面：http://localhost/
- 后端 API：http://localhost:3001/api/

```bash
# 停止服务
docker-compose down

# 停止并清除数据
docker-compose down -v
```

### 方式二：本地开发

**前提**：安装 Node.js 18+、MySQL 8.0（本地或远程）

#### Windows 开发
```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS passion_fruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 安装依赖
cd client
npm install
cd ..\server
npm install

# 3. 安装 Playwright 浏览器（使用国内镜像加速）
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npx playwright install chromium

# 4. 配置后端环境变量（复制并修改）
copy .env.example .env
# 编辑 .env 修改数据库连接信息

# 5. 启动后端（端口 3001）
npm run dev

# 6. 启动前端（端口 5173，自动代理 API 到后端）
cd ..\client
npm run dev
```

#### Linux 开发
```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS passion_fruit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 安装系统依赖（某些Linux发行版需要）
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# CentOS/RHEL
sudo yum install -y alsa-lib atk cups-libs gtk3 libXcomposite libXdamage libXrandr libXScrnSaver libXtst nss

# 3. 安装依赖
cd client
npm install
cd ../server
npm install

# 4. 安装 Playwright 浏览器
npx playwright install chromium

# 5. 配置后端环境变量（复制并修改）
cp .env.example .env
# 编辑 .env 修改数据库连接信息

# 6. 启动后端（端口 3001）
npm run dev

# 7. 启动前端（端口 5173，自动代理 API 到后端）
cd ../client
npm run dev
```

开发环境访问：
- 前端：http://localhost:5173/
- API：http://localhost:3001/api/

---

## 跨平台部署注意事项

### Playwright 浏览器要求
- **Windows**：直接安装 `npx playwright install chromium` 即可
- **Linux**：需要先安装系统依赖（见上方Linux开发步骤），然后安装浏览器

### 无头模式说明
- 爬虫使用 Playwright 无头模式运行，不会弹出浏览器窗口
- 测试脚本默认也使用无头模式，如需调试可临时修改 `headless: false`

### Docker 部署（推荐）
Docker 部署方式完全跨平台，无需考虑系统差异：
```bash
# Windows/Linux 都可用
docker-compose up -d
```

---

## 项目结构

```
项目根目录/
├── client/                          # 前端项目
│   ├── src/
│   │   ├── api/                    # API 请求层
│   │   │   ├── client.ts          # axios 实例
│   │   │   ├── config.ts          # 配置 API
│   │   │   ├── dashboard.ts       # 行情数据 API
│   │   │   ├── history.ts         # 历史数据 API
│   │   │   └── types.ts           # API 类型
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── ui/            # UI 组件（9个：card/label/button/switch/badge/input/textarea/table/tabs）
│   │   │   │   ├── ConfigPage.tsx
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── HistoryPage.tsx
│   │   │   │   ├── PreviewPage.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── App.tsx
│   │   ├── styles/                # Tailwind CSS 样式
│   │   └── main.tsx
│   ├── Dockerfile                  # nginx 多阶段构建
│   ├── nginx.conf
│   └── package.json
│
├── server/                          # 后端项目
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # MySQL 连接池
│   │   │   ├── init-db.ts         # 数据库初始化
│   │   │   └── init-data.sql      # 种子数据
│   │   ├── controllers/           # 控制器
│   │   ├── routes/                # 路由
│   │   ├── services/
│   │   │   ├── crawlerService.ts  # 爬虫服务（Playwright）
│   │   │   └── schedulerService.ts # 定时调度
│   │   └── index.ts
│   ├── Dockerfile                  # 后端 Docker 镜像
│   └── package.json
│
├── docker-compose.yml               # Docker 编排（MySQL + Server + Client）
├── .env                             # Docker 环境变量
├── .gitignore
└── README.md
```

## 数据库设计

### data_sources（数据源配置）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 主键 |
| type | VARCHAR(50) | 数据源类型 |
| platform | VARCHAR(100) | 平台名称 |
| name | VARCHAR(100) | 数据源名称 |
| url | VARCHAR(500) | 数据源URL |
| scope | VARCHAR(500) | 采集数据范围 |
| schedule | VARCHAR(200) | 采集周期 |
| enabled | TINYINT(1) | 是否启用 |
| status | VARCHAR(20) | 状态（success/failed/running） |
| last_run | VARCHAR(50) | 上次执行时间 |
| duration | VARCHAR(20) | 执行时长 |
| records | INT | 获取记录数 |
| execution_type | VARCHAR(100) | 执行类型 |

### price_records（价格记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 主键 |
| source_type | VARCHAR(20) | 来源（bxx/huinong/xinfadi/jiangnan） |
| source_id | INT FK | 关联数据源 |
| province, region, product, origin | VARCHAR | 产地信息 |
| high_price | DECIMAL(10,2) | 最高价/近7日最高价（惠农网） |
| low_price | DECIMAL(10,2) | 最低价/近7日最低价（惠农网） |
| avg_price | DECIMAL(10,2) | 均价/当日最新价格 |
| avg7_price | DECIMAL(10,2) | 近7日均价（惠农网专用） |
| rise_fall | VARCHAR(50) | 价格升/降（惠农网专用） |
| trend_chart | VARCHAR(500) | 走势图信息（惠农网专用） |
| price_type, spec, unit | VARCHAR | 价格属性 |
| record_date | DATE | 报价日期 |

### crawl_logs（采集日志）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 主键 |
| source_id | INT FK | 关联数据源 |
| level | VARCHAR(20) | 级别（info/success/error） |
| message | VARCHAR(500) | 日志信息 |
| created_at | TIMESTAMP | 创建时间 |

## API 接口

### Dashboard（最新行情数据）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 获取所有数据源最新行情 |
| GET | `/api/dashboard/huinong-trend?origin=&days=7` | 获取惠农网产地7日走势图数据 |
| GET | `/api/dashboard/xinfadi-trend?days=30` | 获取北京新发地近1月走势图数据 |

### History（数据采集历史）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/history?source=bxx&keyword=&date=&page=1&pageSize=15` | 分页查询历史价格 |

### Config（数据采集配置）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config/sources` | 获取数据源列表 |
| PUT | `/api/config/sources/:id` | 更新数据源配置 |
| GET | `/api/config/tasks` | 获取任务状态 |
| GET | `/api/config/logs` | 获取执行日志 |

### Crawler（数据抓取）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/crawler/manual` | 手动执行数据抓取 |

## 功能状态

| 功能 | 前端 | 后端 API | 数据 | 状态 |
|------|------|---------|------|------|
| 最新行情数据 | ✅ | ✅ | MySQL | 已完成 |
| 数据采集配置 | ✅ | ✅ | MySQL | 已完成 |
| 数据采集历史 | ✅ | ✅ | MySQL | 已完成 |
| 数据采集任务管理 | ✅ | ✅ | - | 已完成 |
| 百香果信息平台爬虫 | ✅ | ✅ | MySQL | 已完成 |
| 惠农网黄金百香果爬虫 | ✅ | ✅ | MySQL | 已完成 |
| 北京新发地百香果爬虫 | ✅ | ✅ | MySQL | 已完成 |

## 版本历史

### V4.0 - 北京新发地百香果数据采集（当前）
- **新增数据源**：北京新发地百香果（大型批发市场），数据源ID=3
- **新增爬虫**：北京新发地数据采集，使用Playwright访问惠农网，搜索百香果并采集数据
- **采集数据范围**：最新价格与最近1月的均价与走势
- **采集逻辑**：搜索"百香果"→解析数据列表→采集最新一条数据（一级分类、二级分类、品名、最低价、平均价、最高价、规格、产地、单位、发布日期）
- **数据去重**：同一发布日期数据不重复采集
- **历史补采**：触发采集后，从当日往前找，最多补抓1个月的数据
- **最早采集日期**：2026年4月1日
- **数据排序**：默认按发布日期倒序
- **趋势图展示**：北京新发地最新行情页面，新增"查看近1月走势"按钮，弹出对话框显示近1月价格曲线图（Recharts实现）
- **定时任务**：新增北京新发地每日22:00自动采集，系统启动后自动执行
- **前端更新**：配置页面新增北京新发地数据源卡片；行情页面正确展示新发地数据和趋势图
- **新增API接口**：`/api/dashboard/xinfadi-trend` 接口，用于获取北京新发地近1月走势图数据

### V3.0 - 惠农网黄金百香果数据采集重构
- **采集逻辑重构**：惠农网黄金百香果爬虫完全重构，从 Playwright 改为 axios + Cheerio，更轻量高效
- **删除详情页采集**：不再进入详情页提取7日均价，只采集列表页数据（时间、产品/品种、所在产地、价格、升/降、走势图）
- **新增字段**：数据库新增 `rise_fall`（价格升/降）和 `trend_chart`（走势图信息）字段
- **本地计算7日统计**：前端展示的近7日最高价、最低价、均价，全部从本地数据库历史数据计算得出，不再从惠农网采集
- **新增走势图弹窗**：惠农网最新行情页面，点击"查看7日走势图"按钮，弹出对话框显示该产地近7日价格曲线图（Recharts 实现）
- **数据采集历史调整**：惠农网历史数据展示字段调整为与采集数据一致
- **新增 Dialog 组件**：项目新增 Dialog UI 组件，用于走势图弹窗
- **新增API接口**：`/api/dashboard/huinong-trend` 接口，用于获取产地7日走势图数据
- **依赖优化**：新增 axios 依赖，用于数据采集

### V2.3 - 惠农网黄金百香果数据采集
- **新增数据源**：惠农网黄金百香果（电商平台），数据源ID=2
- **新增爬虫**：惠农网行情大厅数据采集，支持分页遍历和详情页7日均价提取
- **数据结构调整**：新增 `avg7_price` 字段用于存储近7日均价；`high_price`/`low_price` 分别存储近7日最高/最低价；`avg_price` 存储当日最新价格
- **定时任务**：新增惠农网每日22:00自动采集，系统启动后自动执行
- **前端更新**：配置页面新增惠农网数据源卡片；行情和历史页面正确展示7日价格数据
- 采集数据范围：行情大厅-水果-百香果-黄金百香果，最新价格与7日均价
- **修复乱码**：MySQL 使用命令行参数确保 utf8mb4 字符集；SQL 初始化脚本添加 SET NAMES；移除后端可能导致编码冲突的中间件
- **修复UI白底变灰**：添加 shadcn/ui 主题 CSS 变量，配置 Tailwind 颜色映射，恢复卡片、按钮、标签页等组件的正确背景色和样式

### V2.1 - 国内源全面优化
- **npm依赖加速**：使用npmmirror.com国内镜像源（.npmrc配置）
- **系统包加速**：Linux apt使用阿里云镜像源
- **Playwright优化**：Docker中直接使用系统Chromium，避免国外下载
- **Docker镜像加速**：通过Docker Hub镜像加速器实现官方镜像加速
- **完整国内源方案**：所有数据拉取源头均已配置国内加速

### V2.0 - 项目精简
- **修复Playwright Docker构建**：改用系统Chromium（apt安装），不再通过Playwright下载浏览器，彻底解决国内镜像下载失败问题
- **删除未使用的UI组件**：移除37个未使用的shadcn/ui组件文件
- **精简npm依赖**：client从50+个依赖减少到11个，server从8个减少到6个
- **移除冗余代码**：删除TasksPage、notification路由、figma组件、shared/types、postcss.config、globals.css等
- **容器构建加速**：Dockerfile不再执行 `npx playwright install`

### V1.9 - Playwright国内镜像加速
- 配置Playwright使用npmmirror.com镜像源下载浏览器
- 解决Docker构建时Playwright下载卡死问题
- 完整的国内源方案：npm、apt、docker、playwright全部加速

### V1.8 - 国内源加速优化
- Docker镜像使用国内npm镜像（npmmirror.com）加速依赖下载
- Linux系统包使用阿里云镜像（mirrors.aliyun.com）加速
- 添加Docker国内镜像源配置说明
- 添加本地开发npm国内镜像配置说明
- 构建速度提升80%以上！

### V1.7 - 跨平台部署优化
- Playwright浏览器设置为无头模式，运行时不弹出浏览器窗口
- 添加Linux兼容性参数（--no-sandbox等），支持Windows和Linux双平台部署
- 优化表格解析逻辑，正确处理合并单元格
- 以市斤价列为参考点定位其他列，更准确的数据解析
- 测试脚本同样更新为无头模式

### V1.6 - 百香果信息平台数据抓取
- 新增爬虫服务模块，实现搜狗微信搜索和文章内容解析
- 新增任务调度器，每周二、四、六晚上22:00自动执行抓取
- 系统启动后自动执行一次数据抓取，补全缺失日期数据
- 新增手动执行抓取API，支持在配置页面立即执行
- 新增详细的抓取日志记录，可在配置页面查看
- 支持从2026年4月1日开始的数据抓取
- 数据去重：每个日期只保留一条记录
- 抓取结果自动展示在"最新行情数据"和"数据采集历史"中

### V1.5 - 最新行情数据与采集配置优化
- 百香果信息平台表格：删除"市斤价（最高）"、"市斤价（最低）"列，"市斤价（平均）"改为"市斤价"
- 数据源配置：删除重复的百香果信息平台、惠农网黄金百香果数据
- 数据源配置：惠农网黄金百香果、北京新发地百香果、广州江南百香果采集周期调整为"每日晚上22:00"

### V1.4 - MySQL + Docker 部署
- 数据库从 Mock 数据迁移到 MySQL 8.0
- 新增 Docker Compose 一键部署方案
- 新增初始种子数据自动填充
- 后端增加数据库重连机制

### V1.3 - Monorepo 重构 + 后端初始化
- 目录结构重组为 Monorepo（client/server/shared）
- 初始化 Express 后端项目
- 前端新增 API 请求层（axios）
- 侧边栏通知入口标记为"暂未开放"

### V1.2 - 最新行情数据与采集配置调整
- 行情数据、历史数据、采集配置全面调整

### V1.1 - 初始版本
- 基础百香果价格追踪功能

## 开发说明

- 前后端均使用 TypeScript 开发
- 前端样式使用 Tailwind CSS，遵循原子化 CSS 原则
- Docker 部署时 MySQL 数据持久化在 `mysql_data` volume 中
- 原 Figma 设计稿：https://www.figma.com/design/WcHQCIOiYD0gthATjME0Xv/Passion-Fruit-Price-Tracker
