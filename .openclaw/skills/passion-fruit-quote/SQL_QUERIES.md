# 百香果报价查询SQL模板

所有查询使用此连接格式：
```bash
mysql -hmysql -P3306 -uroot -proot passion_fruit --table -e "SQL语句"
```

---

## 3.1 今日最新行情（全部四个栏目）

触发词：今日价格、最新价格、价格、百香果价格、最新行情、最新行情数据

### 3.1.1 百香果信息平台（bxx）

先查更新时间：
```sql
SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%d %H:%i:%s') as 更新时间 FROM price_records WHERE source_type = 'bxx';
```

查均价：
```sql
SELECT ROUND(AVG(avg_price), 2) as 当前数据源均价 FROM price_records WHERE source_type = 'bxx' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'bxx');
```

查数据：
```sql
SELECT province as 省, region as 地区, avg_price as 市斤价, price_type as 价类, spec as 规格, remark as 备注, DATE_FORMAT(record_date, '%Y-%m-%d') as 报价日期 FROM price_records WHERE source_type = 'bxx' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'bxx') ORDER BY province, spec;
```

### 3.1.2 惠农网黄金百香果（huinong）

更新时间：
```sql
SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%d %H:%i:%s') as 更新时间 FROM price_records WHERE source_type = 'huinong';
```

均价：
```sql
SELECT ROUND(AVG(avg_price), 2) as 当前数据源均价 FROM price_records WHERE source_type = 'huinong' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'huinong');
```

数据：
```sql
SELECT DATE_FORMAT(record_date, '%Y-%m-%d') as 时间, product as `产品/品种`, origin as 所在产地, avg_price as `价格（元/斤）`, rise_fall as `升/降`, high_price as 近7日最高价, low_price as 近7日最低价, avg7_price as 近7日均价 FROM price_records WHERE source_type = 'huinong' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'huinong') ORDER BY origin;
```

### 3.1.3 北京新发地（xinfadi）

更新时间：
```sql
SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%d %H:%i:%s') as 更新时间 FROM price_records WHERE source_type = 'xinfadi';
```

均价：
```sql
SELECT ROUND(AVG(avg_price), 2) as 当前数据源均价 FROM price_records WHERE source_type = 'xinfadi' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'xinfadi');
```

数据：
```sql
SELECT category1 as 一级分类, category2 as 二级分类, name as 品名, low_price as 最低价, avg_price as 平均价, high_price as 最高价, spec as 规格, origin as 产地, unit as 单位, DATE_FORMAT(record_date, '%Y-%m-%d') as 发布日期 FROM price_records WHERE source_type = 'xinfadi' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'xinfadi') ORDER BY name, spec;
```

### 3.1.4 广州江南（jiangnan）

更新时间：
```sql
SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%d %H:%i:%s') as 更新时间 FROM price_records WHERE source_type = 'jiangnan';
```

均价：
```sql
SELECT ROUND(AVG(avg_price), 2) as 当前数据源均价 FROM price_records WHERE source_type = 'jiangnan' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'jiangnan');
```

数据：
```sql
SELECT name as 产品名称, origin as 产地, high_price as `最高价(元/公斤)`, low_price as `最低价(元/公斤)`, avg_price as `参考价(元/公斤)`, spec as 规格, DATE_FORMAT(record_date, '%Y-%m-%d') as 日期 FROM price_records WHERE source_type = 'jiangnan' AND record_date = (SELECT MAX(record_date) FROM price_records WHERE source_type = 'jiangnan') ORDER BY origin, spec;
```

---

## 3.2 百香果信息平台（单独）

触发词：百香果信息平台、微信公众号、公众号报价

执行 3.1.1 的更新时间和均价查询，然后返回 3.1.1 的数据。

---

## 3.3 惠农网黄金百香果（单独）

触发词：惠农网黄金百香果、惠农网

执行 3.1.2 的更新时间和均价查询，然后返回 3.1.2 的数据。

---

## 3.4 北京新发地（单独）

触发词：北京、北京新发地、新发地

执行 3.1.3 的更新时间和均价查询，然后返回 3.1.3 的数据。

---

## 3.5 广州江南（单独）

触发词：广州、广州江南、江南

执行 3.1.4 的更新时间和均价查询，然后返回 3.1.4 的数据。

---

## 3.6 本周价格走势（7日）

触发词：本周价格走势、本周报价、周报、7日、7日价格、一周、最近一周

默认返回四个数据源。如附带单独数据源关键词则只返回该源。

### 3.6.x 趋势SQL（N天）

百香果信息平台（bxx）：
```sql
SELECT DATE_FORMAT(record_date, '%Y-%m-%d') as 日期, ROUND(AVG(avg_price), 2) as 均价 FROM price_records WHERE source_type = 'bxx' AND record_date >= DATE_SUB(CURDATE(), INTERVAL N DAY) GROUP BY record_date ORDER BY record_date;
```

惠农网（huinong）：
```sql
SELECT DATE_FORMAT(record_date, '%Y-%m-%d') as 日期, ROUND(AVG(avg_price), 2) as 均价 FROM price_records WHERE source_type = 'huinong' AND record_date >= DATE_SUB(CURDATE(), INTERVAL N DAY) GROUP BY record_date ORDER BY record_date;
```

北京新发地（xinfadi）：
```sql
SELECT DATE_FORMAT(record_date, '%Y-%m-%d') as 日期, ROUND(AVG(avg_price), 2) as 均价 FROM price_records WHERE source_type = 'xinfadi' AND record_date >= DATE_SUB(CURDATE(), INTERVAL N DAY) GROUP BY record_date ORDER BY record_date;
```

广州江南（jiangnan）：
```sql
SELECT DATE_FORMAT(record_date, '%Y-%m-%d') as 日期, ROUND(AVG(avg_price), 2) as 均价 FROM price_records WHERE source_type = 'jiangnan' AND record_date >= DATE_SUB(CURDATE(), INTERVAL N DAY) GROUP BY record_date ORDER BY record_date;
```

> N值对应：本周=7、本月=30、本季=90、本年=365

### 走势图生成

用Python matplotlib生成趋势图，示例代码：
```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False
import sys
import json

data = json.loads(sys.argv[1])  # [{"日期":"2026-05-12","均价":5.8}, ...]
source_name = sys.argv[2]  # 数据源名称

dates = [d['日期'] for d in data]
prices = [float(d['均价']) for d in data]

plt.figure(figsize=(10, 5))
plt.plot(dates, prices, marker='o', linewidth=2, markersize=4)
plt.title(f'{source_name} - 价格走势', fontsize=14)
plt.xlabel('日期', fontsize=12)
plt.ylabel('均价（元）', fontsize=12)
plt.xticks(rotation=45)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('/tmp/trend.png', dpi=100)
print('图片已保存: /tmp/trend.png')
```

---

## 3.7-3.9 本月/本季/本年走势（30日/90日/365日）

SQL同3.6，N分别改为30、90、365。其他规则同3.6。