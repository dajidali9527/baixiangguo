-- 百香果价格追踪系统 - 数据库初始化脚本（PostgreSQL）
-- 表名统一使用 pf_ 前缀，避免与其他系统冲突

CREATE TABLE IF NOT EXISTS pf_data_sources (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  platform VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  scope VARCHAR(500) DEFAULT '',
  schedule VARCHAR(200) NOT NULL,
  enabled SMALLINT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'success',
  last_run VARCHAR(50) DEFAULT '',
  duration VARCHAR(20) DEFAULT '',
  records INT DEFAULT 0,
  execution_type VARCHAR(100) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pf_data_sources IS '数据源配置';
COMMENT ON COLUMN pf_data_sources.type IS '数据源类型（自媒体/电商平台/大型批发市场）';
COMMENT ON COLUMN pf_data_sources.platform IS '平台名称';
COMMENT ON COLUMN pf_data_sources.name IS '数据源名称';
COMMENT ON COLUMN pf_data_sources.url IS '数据源URL';
COMMENT ON COLUMN pf_data_sources.scope IS '采集数据范围';
COMMENT ON COLUMN pf_data_sources.schedule IS '采集数据周期';
COMMENT ON COLUMN pf_data_sources.enabled IS '是否启用';
COMMENT ON COLUMN pf_data_sources.status IS '状态（success/failed/running）';
COMMENT ON COLUMN pf_data_sources.last_run IS '上次执行时间';
COMMENT ON COLUMN pf_data_sources.duration IS '执行时长';
COMMENT ON COLUMN pf_data_sources.records IS '获取记录数';
COMMENT ON COLUMN pf_data_sources.execution_type IS '执行类型';

CREATE TABLE IF NOT EXISTS pf_price_records (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(20) NOT NULL,
  source_id INT NOT NULL,
  name VARCHAR(100) DEFAULT '',
  province VARCHAR(50) DEFAULT '',
  region VARCHAR(100) DEFAULT '',
  product VARCHAR(100) DEFAULT '',
  origin VARCHAR(200) DEFAULT '',
  high_price DECIMAL(10,2) DEFAULT 0,
  low_price DECIMAL(10,2) DEFAULT 0,
  avg_price DECIMAL(10,2) DEFAULT 0,
  avg7_price DECIMAL(10,2) DEFAULT 0,
  rise_fall VARCHAR(10) DEFAULT '',
  trend_chart VARCHAR(500) DEFAULT '',
  price_type VARCHAR(20) DEFAULT '',
  spec VARCHAR(50) DEFAULT '',
  unit VARCHAR(20) DEFAULT '',
  category1 VARCHAR(50) DEFAULT '',
  category2 VARCHAR(50) DEFAULT '',
  remark VARCHAR(200) DEFAULT '',
  record_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES pf_data_sources(id) ON DELETE CASCADE
);

COMMENT ON TABLE pf_price_records IS '价格记录';
COMMENT ON COLUMN pf_price_records.source_type IS '来源类型（bxx/huinong/xinfadi/jiangnan）';
COMMENT ON COLUMN pf_price_records.source_id IS '关联数据源ID';
COMMENT ON COLUMN pf_price_records.high_price IS '最高价/近7日最高价';
COMMENT ON COLUMN pf_price_records.low_price IS '最低价/近7日最低价';
COMMENT ON COLUMN pf_price_records.avg_price IS '均价/当日最新价格';
COMMENT ON COLUMN pf_price_records.avg7_price IS '近7日均价（惠农网专用）';
COMMENT ON COLUMN pf_price_records.rise_fall IS '升/降（惠农网专用）';
COMMENT ON COLUMN pf_price_records.trend_chart IS '走势图链接（惠农网专用）';
COMMENT ON COLUMN pf_price_records.price_type IS '价类（产地价/批发价）';
COMMENT ON COLUMN pf_price_records.category1 IS '一级分类';
COMMENT ON COLUMN pf_price_records.category2 IS '二级分类';
COMMENT ON COLUMN pf_price_records.record_date IS '报价日期';

-- 唯一约束：同一数据源+同一日期+同一规格/分类不能重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_pf_price_unique ON pf_price_records (source_id, record_date, COALESCE(spec, ''), COALESCE(category2, ''));

CREATE INDEX IF NOT EXISTS idx_price_source_type ON pf_price_records (source_type);
CREATE INDEX IF NOT EXISTS idx_price_record_date ON pf_price_records (record_date);
CREATE INDEX IF NOT EXISTS idx_price_source_date ON pf_price_records (source_id, record_date);

CREATE TABLE IF NOT EXISTS pf_crawl_logs (
  id SERIAL PRIMARY KEY,
  source_id INT DEFAULT NULL,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES pf_data_sources(id) ON DELETE SET NULL
);

COMMENT ON TABLE pf_crawl_logs IS '采集日志';
COMMENT ON COLUMN pf_crawl_logs.source_id IS '关联数据源ID';
COMMENT ON COLUMN pf_crawl_logs.level IS '级别（info/success/error）';
COMMENT ON COLUMN pf_crawl_logs.message IS '日志信息';

CREATE INDEX IF NOT EXISTS idx_pf_crawl_logs_created_at ON pf_crawl_logs (created_at);

CREATE TABLE IF NOT EXISTS pf_task_executions (
  id SERIAL PRIMARY KEY,
  source_id INT NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  execution_type VARCHAR(100) NOT NULL,
  execution_time TIMESTAMP NOT NULL,
  duration VARCHAR(20) DEFAULT '',
  records INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES pf_data_sources(id) ON DELETE CASCADE
);

COMMENT ON TABLE pf_task_executions IS '任务执行记录';
COMMENT ON COLUMN pf_task_executions.source_id IS '关联数据源ID';
COMMENT ON COLUMN pf_task_executions.source_name IS '数据源名称';
COMMENT ON COLUMN pf_task_executions.source_type IS '数据源类型';
COMMENT ON COLUMN pf_task_executions.status IS '状态（success/failed/running）';
COMMENT ON COLUMN pf_task_executions.execution_type IS '执行类型（手动/定时/系统启动）';
COMMENT ON COLUMN pf_task_executions.execution_time IS '执行时间';
COMMENT ON COLUMN pf_task_executions.duration IS '执行耗时';
COMMENT ON COLUMN pf_task_executions.records IS '记录数';
COMMENT ON COLUMN pf_task_executions.error_message IS '错误信息';

CREATE INDEX IF NOT EXISTS idx_task_source_id ON pf_task_executions (source_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_time ON pf_task_executions (execution_time DESC);

-- 初始数据源配置（仅首次初始化时插入）
INSERT INTO pf_data_sources (id, type, platform, name, url, scope, schedule, enabled, status, last_run, duration, records, execution_type) VALUES
(1, '自媒体', '微信公众号', '百香果信息平台', 'https://weixin.sogou.com/', '最新发布的文章："百香果信息平台：黄金百香果价格行情"', '手动点击立即执行；每周二、四、六晚上22:00', 0, 'success', '', '', 0, '每周二、四、六晚上22:00'),
(2, '电商平台', '惠农网', '惠农网黄金百香果', 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/', '行情大厅-水果-百香果-黄金百香果，最新价格与7日均价', '手动点击立即执行；每日晚上22:00', 0, 'success', '', '', 0, '每日晚上22:00'),
(3, '大型批发市场', '北京新发地', '北京新发地百香果', 'http://www.xinfadi.com.cn/priceDetail.html', '最新价格与最近1月的均价与走势', '手动点击立即执行；每日晚上22:10', 1, 'success', '', '', 0, '每日晚上22:10'),
(4, '大型批发市场', '广州江南果菜批发市场', '广州江南百香果', 'https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice', '最新价格与最近1月的均价与走势', '手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('pf_data_sources_id_seq', (SELECT COALESCE(MAX(id), 1) FROM pf_data_sources));

-- 用户表
CREATE TABLE IF NOT EXISTS pf_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  display_name VARCHAR(100) DEFAULT '',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pf_users IS '系统用户';
COMMENT ON COLUMN pf_users.username IS '登录名';
COMMENT ON COLUMN pf_users.password_hash IS '密码哈希（bcrypt）';
COMMENT ON COLUMN pf_users.role IS '角色（admin/user）';
COMMENT ON COLUMN pf_users.display_name IS '显示名称';
COMMENT ON COLUMN pf_users.last_login IS '最后登录时间';

-- 默认管理员账户（密码: admin123）
INSERT INTO pf_users (id, username, password_hash, role, display_name) VALUES
(1, '1860139182', '$2b$10$m1EasbliZATeUt0Vui61jeKNy3F.ugBhTmtu0oT8zWfNOVed2w6ES', 'admin', '管理员')
ON CONFLICT (id) DO NOTHING;

SELECT setval('pf_users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM pf_users));
