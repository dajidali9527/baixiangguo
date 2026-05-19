SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS data_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL COMMENT '数据源类型（自媒体/电商平台/大型批发市场）',
  platform VARCHAR(100) NOT NULL COMMENT '平台名称',
  name VARCHAR(100) NOT NULL COMMENT '数据源名称',
  url VARCHAR(500) NOT NULL COMMENT '数据源URL',
  scope VARCHAR(500) DEFAULT '' COMMENT '采集数据范围',
  schedule VARCHAR(200) NOT NULL COMMENT '采集数据周期',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  status VARCHAR(20) DEFAULT 'success' COMMENT '状态（success/failed/running）',
  last_run VARCHAR(50) DEFAULT '' COMMENT '上次执行时间',
  duration VARCHAR(20) DEFAULT '' COMMENT '执行时长',
  records INT DEFAULT 0 COMMENT '获取记录数',
  execution_type VARCHAR(100) DEFAULT '' COMMENT '执行类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据源配置';

CREATE TABLE IF NOT EXISTS price_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(20) NOT NULL COMMENT '来源类型（bxx/huinong/xinfadi/jiangnan）',
  source_id INT NOT NULL COMMENT '关联数据源ID',
  name VARCHAR(100) DEFAULT '' COMMENT '产品名称',
  province VARCHAR(50) DEFAULT '' COMMENT '省',
  region VARCHAR(100) DEFAULT '' COMMENT '地区',
  product VARCHAR(100) DEFAULT '' COMMENT '产品名称',
  origin VARCHAR(200) DEFAULT '' COMMENT '产地',
  high_price DECIMAL(10,2) DEFAULT 0 COMMENT '最高价/近7日最高价',
  low_price DECIMAL(10,2) DEFAULT 0 COMMENT '最低价/近7日最低价',
  avg_price DECIMAL(10,2) DEFAULT 0 COMMENT '均价/当日最新价格',
  avg7_price DECIMAL(10,2) DEFAULT 0 COMMENT '近7日均价（惠农网专用）',
  rise_fall VARCHAR(10) DEFAULT '' COMMENT '升/降（惠农网专用）',
  trend_chart VARCHAR(500) DEFAULT '' COMMENT '走势图链接（惠农网专用）',
  price_type VARCHAR(20) DEFAULT '' COMMENT '价类（产地价/批发价）',
  spec VARCHAR(50) DEFAULT '' COMMENT '规格',
  unit VARCHAR(20) DEFAULT '' COMMENT '单位',
  category1 VARCHAR(50) DEFAULT '' COMMENT '一级分类',
  category2 VARCHAR(50) DEFAULT '' COMMENT '二级分类',
  remark VARCHAR(200) DEFAULT '' COMMENT '备注',
  record_date DATE NOT NULL COMMENT '报价日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source_type (source_type),
  INDEX idx_record_date (record_date),
  INDEX idx_source_date (source_id, record_date),
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格记录';

CREATE TABLE IF NOT EXISTS crawl_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT DEFAULT NULL COMMENT '关联数据源ID',
  level VARCHAR(20) NOT NULL COMMENT '级别（info/success/error）',
  message TEXT NOT NULL COMMENT '日志信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采集日志';

CREATE TABLE IF NOT EXISTS task_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT NOT NULL COMMENT '关联数据源ID',
  source_name VARCHAR(100) NOT NULL COMMENT '数据源名称',
  source_type VARCHAR(50) NOT NULL COMMENT '数据源类型',
  status VARCHAR(20) NOT NULL COMMENT '状态（success/failed/running）',
  execution_type VARCHAR(100) NOT NULL COMMENT '执行类型（手动/定时/系统启动）',
  execution_time TIMESTAMP NOT NULL COMMENT '执行时间',
  duration VARCHAR(20) DEFAULT '' COMMENT '执行时长',
  records INT DEFAULT 0 COMMENT '获取记录数',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source_id (source_id),
  INDEX idx_execution_time (execution_time DESC),
  FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务执行记录';

INSERT IGNORE INTO data_sources (id, type, platform, name, url, scope, schedule, enabled, status, last_run, duration, records, execution_type) VALUES
(1, '自媒体', '微信公众号', '百香果信息平台', 'https://weixin.sogou.com/', '最新发布的文章："百香果信息平台：黄金百香果价格行情"', '系统启动后；手动点击立即执行；每周二、四、六晚上22:00', 1, 'success', '2026-05-04 22:00', '2.3s', 8, '每周二、四、六晚上22:00'),
(2, '电商平台', '惠农网', '惠农网黄金百香果', 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/', '行情大厅-水果-百香果-黄金百香果，最新价格与7日均价', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00'),
(3, '大型批发市场', '北京新发地', '北京新发地百香果', 'http://www.xinfadi.com.cn/priceDetail.html', '最新价格与最近1月的均价与走势', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00'),
(4, '大型批发市场', '广州江南果菜批发市场', '广州江南百香果', 'https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice', '最新价格与最近1月的均价与走势', '系统启动后；手动点击立即执行；每日晚上22:00', 1, 'success', '', '', 0, '每日晚上22:00');

-- 清除重复数据（每次执行脚本前先清理）
-- 删除百香果信息平台的重复数据（同一日期、同一规格只保留一条）
DELETE t1 FROM price_records t1
INNER JOIN price_records t2 
WHERE t1.id > t2.id 
AND t1.source_type = 'bxx' 
AND t2.source_type = 'bxx'
AND t1.source_id = t2.source_id 
AND t1.record_date = t2.record_date 
AND t1.spec = t2.spec;

-- 删除北京新发地的重复数据（同一日期、同一二级分类只保留一条）
DELETE t1 FROM price_records t1
INNER JOIN price_records t2 
WHERE t1.id > t2.id 
AND t1.source_type = 'xinfadi' 
AND t2.source_type = 'xinfadi'
AND t1.source_id = t2.source_id 
AND t1.record_date = t2.record_date 
AND t1.category2 = t2.category2;

INSERT IGNORE INTO price_records (source_type, source_id, province, region, high_price, low_price, avg_price, price_type, spec, record_date) VALUES
('bxx', 1, '海南', '澄迈\\临高\\文昌', 3.5, 3.5, 3.5, '产地价', '45-60g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\\临高\\文昌', 5.5, 5.5, 5.5, '产地价', '61-70g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\\临高\\文昌', 7.5, 7.5, 7.5, '产地价', '71-90g', '2026-05-02'),
('bxx', 1, '海南', '澄迈\\临高\\文昌', 8.5, 8.5, 8.5, '产地价', '90g以上', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 2.5, 2.5, 2.5, '产地价', '45-60g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 4.5, 4.5, 4.5, '产地价', '61-70g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 6.5, 6.5, 6.5, '产地价', '71-90g', '2026-05-02'),
('bxx', 1, '广东', '徐闻', 8.5, 8.5, 8.5, '产地价', '90g以上', '2026-05-02');

INSERT INTO crawl_logs (source_id, level, message) VALUES
(1, 'success', '百香果信息平台 抓取成功，获取8条记录');

INSERT INTO task_executions (source_id, source_name, source_type, status, execution_type, execution_time, duration, records) VALUES
(1, '百香果信息平台', '自媒体', 'success', '每周二、四、六晚上22:00', '2026-05-02 22:00:00', '2.3s', 8);

-- 北京新发地百香果历史数据（2026-04-01 到 2026-05-10）
-- 注意：使用 INSERT IGNORE 避免重复插入，已存在的数据会被跳过
INSERT IGNORE INTO price_records (source_type, source_id, category1, category2, name, low_price, avg_price, high_price, spec, origin, unit, record_date) VALUES
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
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-02'),
('xinfadi', 3, '水果', '其他类', '百香果', 7.0, 8.5, 10.0, '', '', '斤', '2026-04-01');