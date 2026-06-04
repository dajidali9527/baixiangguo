# 项目架构规则

## 爬虫模块隔离原则

### 目录结构
```
server/src/services/
  crawlerService.ts          ← 重新导出层（勿修改此文件逻辑）
  crawlers/
    base.ts                  ← 共享工具函数（DB/日志/日期/延迟等）
    bxx.ts                   ← 百香果信息平台爬虫（Playwright）
    huinong.ts               ← 惠农网黄金百香果爬虫（axios+Cheerio）
    xinfadi.ts               ← 北京新发地百香果爬虫（Playwright+axios）
    jiangnan.ts              ← 广州江南百香果爬虫（axios API）
    index.ts                 ← 统一导出
```

### 关键规则

1. **每个爬虫是独立文件**：修改一个数据源时，只编辑它自己的 `crawlers/<name>.ts` 文件，严禁修改其他爬虫文件
2. **共享逻辑在 base.ts**：所有爬虫共用的函数（`logCrawl`, `checkDataExists`, `randomDelay`, `createTaskExecution` 等）统一放在 `crawlers/base.ts`
3. **依赖声明只在各自文件**：例如惠农网需要 `axios`，只在 `huinong.ts` 中导入；BXX 需要 `playwright`，只在 `bxx.ts` 中导入
4. **重新导出层勿动**：`crawlerService.ts` 只是一行 re-export，所有外部调用不变

### 添加新数据源的步骤
1. 在 `crawlers/` 下新建 `<name>.ts`
2. 导入所需共享函数 from `./base.js`
3. 实现 `crawl<Name>()` 函数
4. 在 `crawlers/index.ts` 添加导入和导出
5. 在 `crawlerController.ts` 的路由中添加新 sourceId 分支

### 验证命令
```bash
cd server && npx tsx tools/verify-crawlers.ts
```

### Docker 构建注意
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — 跳过 Playwright 浏览器下载，使用系统 Chromium
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` — 指定系统 Chromium 路径
- Dockerfile 使用 `apt-get install chromium` 安装系统 Chromium

### 数据源对照表
| ID | 名称 | 技术栈 | 定时任务 |
|----|------|--------|----------|
| 1  | 百香果信息平台 | Playwright + Cheerio | 每周二/四/六 22:00 |
| 2  | 惠农网黄金百香果 | axios + Cheerio | 每日 22:00 |
| 3  | 北京新发地百香果 | Playwright + axios | 每日 22:00 |
| 4  | 广州江南百香果 | axios（API） | 每日 22:00 |