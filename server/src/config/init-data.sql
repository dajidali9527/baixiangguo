-- 数据库初始化脚本（PostgreSQL）

CREATE TABLE IF NOT EXISTS data_sources (
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

COMMENT ON TABLE data_sources IS '数据源配置';
COMMENT ON COLUMN data_sources.type IS '数据源类型（自媒体/电商平台/大型批发市场）';
COMMENT ON COLUMN data_sources.platform IS '平台名称';
COMMENT ON COLUMN data_sources.name IS '数据源名称';
COMMENT ON COLUMN data_sources.url IS '数据源URL';
COMMENT ON COLUMN data_sources.scope IS '采集数据范围';
COMMENT ON COLUMN data_sources.schedule IS '采集数据周期';
COMMENT ON COLUMN data_sources.enabled IS '是否启用';
COMMENT ON COLUMN data_sources.status IS '状态（success/failed/running）';
COMMENT ON COLUMN data_sources.last_run IS '上次执行时间';
COMMENT ON COLUMN data_sources.duration IS '执行时长';
COMMENT ON COLUMN data_sources.records IS '获取记录数';
COMMENT ON COLUMN data_sources.execution_type IS '执行类型';

CREATE TABLE IF NOT EXISTS price_records (
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
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

COMMENT ON TABLE price_records IS '价格记录';
COMMENT ON COLUMN price_records.source_type IS '来源类型（bxx/huinong/xinfadi/jiangnan）';
COMMENT ON COLUMN price_records.source_id IS '关联数据源ID';
COMMENT ON COLUMN price_records.high_price IS '最高价/近7日最高价';
COMMENT ON COLUMN price_records.low_price IS '最低价/近7日最低价';
COMMENT ON COLUMN price_records.avg_price IS '均价/当日最新价格';
COMMENT ON COLUMN price_records.avg7_price IS '近7日均价（惠农网专用）';
COMMENT ON COLUMN price_records.rise_fall IS '升/降（惠农网专用）';
COMMENT ON COLUMN price_records.trend_chart IS '走势图链接（惠农网专用）';
COMMENT ON COLUMN price_records.price_type IS '价类（产地价/批发价）';
COMMENT ON COLUMN price_records.category1 IS '一级分类';
COMMENT ON COLUMN price_records.category2 IS '二级分类';
COMMENT ON COLUMN price_records.record_date IS '报价日期';

CREATE INDEX IF NOT EXISTS idx_price_source_type ON price_records (source_type);
CREATE INDEX IF NOT EXISTS idx_price_record_date ON price_records (record_date);
CREATE INDEX IF NOT EXISTS idx_price_source_date ON price_records (source_id, record_date);

CREATE TABLE IF NOT EXISTS crawl_logs (
  id SERIAL PRIMARY KEY,
  source_id INT DEFAULT NULL,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

COMMENT ON TABLE crawl_logs IS '采集日志';
COMMENT ON COLUMN crawl_logs.source_id IS '关联数据源ID';
COMMENT ON COLUMN crawl_logs.level IS '级别（info/success/error）';
COMMENT ON COLUMN crawl_logs.message IS '日志信息';

CREATE INDEX IF NOT EXISTS idx_crawl_logs_created_at ON crawl_logs (created_at);

CREATE TABLE IF NOT EXISTS task_executions (
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
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

COMMENT ON TABLE task_executions IS '任务执行记录';
COMMENT ON COLUMN task_executions.source_id IS '关联数据源ID';
COMMENT ON COLUMN task_executions.source_name IS '数据源名称';
COMMENT ON COLUMN task_executions.source_type IS '数据源类型';
COMMENT ON COLUMN task_executions.status IS '状态（success/failed/running）';
COMMENT ON COLUMN task_executions.execution_type IS '执行类型（手动/定时/系统启动）';
COMMENT ON COLUMN task_executions.execution_time IS '执行时间';
COMMENT ON COLUMN task_executions.duration IS '执行耗时';
COMMENT ON COLUMN task_executions.records IS '记录数';
COMMENT ON COLUMN task_executions.error_message IS '错误信息';

CREATE INDEX IF NOT EXISTS idx_task_source_id ON task_executions (source_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_time ON task_executions (execution_time DESC);

INSERT INTO data_sources (id, type, platform, name, url, scope, schedule, enabled, status, last_run, duration, records, execution_type) VALUES
(1, '自媒体', '微信公众号', '百香果信息平台', 'https://weixin.sogou.com/', '最新发布的文章："百香果信息平台：黄金百香果价格行情"', '系统启动后；手动点击立即执行；每周二、四、六晚上22:00', 1, 'success', '2026-05-04 22:00', '2.3s', 8, '每周二、四、六晚上22:00'),
(2, '电商平台', '惠农网', '惠农网黄金百香果', 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/', '行情大厅-水果-百香果-黄金百香果，最新价格与7日均价', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00'),
(3, '大型批发市场', '北京新发地', '北京新发地百香果', 'http://www.xinfadi.com.cn/priceDetail.html', '最新价格与最近1月的均价与走势', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00'),
(4, '大型批发市场', '广州江南果菜批发市场', '广州江南百香果', 'https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice', '最新价格与最近1月的均价与走势', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('data_sources_id_seq', (SELECT MAX(id) FROM data_sources));

-- 删除百香果信息平台的重复数据（同一日期、同一规格只保留一条）
DELETE FROM price_records
WHERE id IN (
  SELECT t1.id FROM price_records t1
  INNER JOIN price_records t2
  ON t1.id > t2.id
  AND t1.source_type = 'bxx'
  AND t2.source_type = 'bxx'
  AND t1.source_id = t2.source_id
  AND t1.record_date = t2.record_date
  AND t1.spec = t2.spec
);

-- 删除北京新发地的重复数据（同一日期、同一二级分类只保留一条）
DELETE FROM price_records
WHERE id IN (
  SELECT t1.id FROM price_records t1
  INNER JOIN price_records t2
  ON t1.id > t2.id
  AND t1.source_type = 'xinfadi'
  AND t2.source_type = 'xinfadi'
  AND t1.source_id = t2.source_id
  AND t1.record_date = t2.record_date
  AND t1.category2 = t2.category2
);

INSERT INTO price_records (source_type, source_id, province, region, high_price, low_price, avg_price, price_type, spec, record_date) VALUES
('bxx', 1, '海南', '澄迈\临高\文昌', 3.5, 3.5, 3.5, '产地价', '45-60g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\临高\文昌', 5.5, 5.5, 5.5, '产地价', '61-70g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\临高\文昌', 7.5, 7.5, 7.5, '产地价', '71-90g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\临高\文昌', 8.5, 8.5, 8.5, '产地价', '90g以上', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 2.5, 2.5, 2.5, '产地价', '45-60g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 4.5, 4.5, 4.5, '产地价', '61-70g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 6.5, 6.5, 6.5, '产地价', '71-90g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 8.5, 8.5, 8.5, '产地价', '90g以上', '2026-05-02')
ON CONFLICT DO NOTHING;

INSERT INTO crawl_logs (source_id, level, message) VALUES
(1, 'success', '百香果信息平台 抓取成功，获取8条记录')
ON CONFLICT DO NOTHING;

INSERT INTO task_executions (source_id, source_name, source_type, status, execution_type, execution_time, duration, records) VALUES
(1, '百香果信息平台', '自媒体', 'success', '每周二、四、六晚上22:00', '2026-05-02 22:00:00', '2.3s', 8)
ON CONFLICT DO NOTHING;

-- 北京新发地百香果历史数据（2026-04-01 到 2026-05-10）
INSERT INTO price_records (source_type, source_id, category1, category2, name, low_price, avg_price, high_price, spec, origin, unit, record_date) VALUES
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-05-10'),
('xinfadi', 3, '水果', '进口果', '百香果', 7.0, 7.5, 8.0, '', '越南', '斤', '2026-05-10'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-09'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-08'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-07'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-06'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-05'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-04'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-03'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-05-02'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-05-01'),
('xinfadi', 3, '水果', '进口果', '百香果', 7.0, 7.5, 8.0, '', '越南', '斤', '2026-04-30'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-30'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-29'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-28'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-27'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-26'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-25'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-24'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.5, 11.0, '', '', '斤', '2026-04-23'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-22'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-21'),
('xinfadi', 3, '水果', '进口果', '百香果', 7.0, 7.5, 8.0, '', '越南', '斤', '2026-04-20'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-20'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-19'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-18'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-17'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 8.5, 9.0, '', '', '斤', '2026-04-16'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-15'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-14'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-13'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-12'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-11'),
('xinfadi', 3, '水果', '进口果', '百香果', 7.0, 7.5, 8.0, '', '越南', '斤', '2026-04-10'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-10'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-09'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-08'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-07'),
('xinfadi', 3, '水果', '其他类', '百香果', 8.0, 9.0, 10.0, '', '', '斤', '2026-04-06'),
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-05'),
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-04'),
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-03'),
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-01')
ON CONFLICT DO NOTHING;
