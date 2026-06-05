#!/bin/bash
# 百香果报价查询脚本 - 封装所有预设SQL
# 用法:
#   query.sh latest              → 四个数据源最新行情
#   query.sh latest jiangnan     → 单个数据源最新行情
#   query.sh trend 7             → 四个数据源7日趋势
#   query.sh trend 7 jiangnan    → 单个数据源7日趋势
#   query.sh plot 7 jiangnan     → 生成趋势图PNG
# 注意: SQL中所有别名使用ASCII字符，避免中文编码问题

MYSQL_CMD="mysql -hmysql -P3306 -uroot -proot passion_fruit --table"

die() { echo "ERROR: $1" >&2; exit 1; }

# 执行SQL并输出表格，失败时退出
run_sql() {
  local result
  result=$(echo "$1" | $MYSQL_CMD 2>&1)
  local rc=$?
  if [ $rc -ne 0 ]; then
    echo "ERROR: SQL执行失败" >&2
    echo "SQL: $1" >&2
    echo "MySQL: $result" >&2
    exit 1
  fi
  echo "$result"
}

# 执行SQL并返回纯文本（用于命令替换），失败时退出
run_sql_capture() {
  local result
  result=$(echo "$1" | $MYSQL_CMD -N 2>&1)
  local rc=$?
  if [ $rc -ne 0 ]; then
    echo "ERROR: SQL执行失败" >&2
    echo "SQL: $1" >&2
    echo "MySQL: $result" >&2
    exit 1
  fi
  echo "$result"
}

# 某个source的行情数据
source_latest() {
  local src="$1"
  local title="$2"
  local fields="$3"
  local where="$4"
  local order="$5"
  echo ""
  echo "## $title"
  # 更新时间
  local ut=$(run_sql_capture "SELECT DATE_FORMAT(MAX(created_at),'%Y-%m-%d %H:%i:%s') FROM price_records WHERE source_type='$src';")
  # 均价
  local ap=$(run_sql_capture "SELECT ROUND(AVG(avg_price),2) FROM price_records WHERE source_type='$src' AND record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='$src');")
  if [ -n "$ut" ] && [ "$ut" != "NULL" ]; then
    echo "> Update: $ut | Avg: ${ap}yuan"
  fi
  run_sql "$fields FROM price_records WHERE source_type='$src' AND $where ORDER BY $order;"
}

# 某个source的趋势数据
source_trend() {
  local src="$1"
  local title="$2"
  local days="$3"
  echo ""
  echo "## $title - ${days}day trend"
  run_sql "SELECT DATE_FORMAT(record_date,'%Y-%m-%d') as date,ROUND(AVG(avg_price),2) as avg FROM price_records WHERE source_type='$src' AND record_date>=DATE_SUB(CURDATE(),INTERVAL $days DAY) GROUP BY record_date ORDER BY record_date;"
}

# 生成趋势图
generate_plot() {
  local src="$1"
  local title="$2"
  local days="$3"
  local outfile="/tmp/${src}_trend_${days}.png"
  # 获取数据为JSON
  local data=$(run_sql_capture "SELECT CONCAT('[',GROUP_CONCAT(CONCAT('[\"',DATE_FORMAT(record_date,'%Y-%m-%d'),'\",',ROUND(AVG(avg_price),2),']')),']') FROM price_records WHERE source_type='$src' AND record_date>=DATE_SUB(CURDATE(),INTERVAL $days DAY) GROUP BY record_date ORDER BY record_date;")
  if [ -z "$data" ] || [ "$data" = "NULL" ]; then
    die "No data for chart (source=$src, days=$days)"
  fi
  python3 -c "
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt;plt.rcParams['font.sans-serif']=['SimHei','DejaVu Sans'];plt.rcParams['axes.unicode_minus']=False
import json,sys
data=json.loads('''$data''')
title='$title - ${days}day trend'
filename='$outfile'
dates=[d[0] for d in data];prices=[float(d[1]) for d in data]
plt.figure(figsize=(12,5));plt.plot(dates,prices,marker='o',color='#e67e22',linewidth=2,markersize=5)
plt.fill_between(dates,prices,alpha=0.2,color='#e67e22')
plt.title(title,fontsize=16,fontweight='bold');plt.xlabel('Date',fontsize=12);plt.ylabel('Avg Price',fontsize=12)
plt.xticks(rotation=45,ha='right');plt.grid(True,alpha=0.3,linestyle='--');plt.tight_layout()
plt.savefig(filename,dpi=120);print(f'OK:$outfile')
" 2>&1 || die "Chart generation failed"
  echo "OK:$outfile"
}

# ========== 主逻辑 ==========
CMD="${1:-}"
ARG1="${2:-}"
ARG2="${3:-}"

case "$CMD" in
  latest)
    case "$ARG1" in
      bxx)
        source_latest "bxx" "Baixiangguo Platform" \
          "SELECT province,region,avg_price,price_type,spec,remark,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='bxx')" \
          "province,spec"
        ;;
      huinong)
        source_latest "huinong" "Huinong Gold Passion Fruit" \
          "SELECT DATE_FORMAT(record_date,'%Y-%m-%d') as date,product,origin,avg_price,rise_fall,high_price as high7d,low_price as low7d,avg7_price" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='huinong')" \
          "origin"
        ;;
      xinfadi)
        source_latest "xinfadi" "Beijing Xinfadi" \
          "SELECT category1,category2,name,low_price,avg_price,high_price,spec,origin,unit,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='xinfadi')" \
          "name,spec"
        ;;
      jiangnan)
        source_latest "jiangnan" "Guangzhou Jiangnan" \
          "SELECT name,origin,high_price,low_price,avg_price,spec,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='jiangnan')" \
          "origin,spec"
        ;;
      *)
        source_latest "bxx" "Baixiangguo Platform" \
          "SELECT province,region,avg_price,price_type,spec,remark,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='bxx')" \
          "province,spec"
        source_latest "huinong" "Huinong Gold Passion Fruit" \
          "SELECT DATE_FORMAT(record_date,'%Y-%m-%d') as date,product,origin,avg_price,rise_fall,high_price as high7d,low_price as low7d,avg7_price" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='huinong')" \
          "origin"
        source_latest "xinfadi" "Beijing Xinfadi" \
          "SELECT category1,category2,name,low_price,avg_price,high_price,spec,origin,unit,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='xinfadi')" \
          "name,spec"
        source_latest "jiangnan" "Guangzhou Jiangnan" \
          "SELECT name,origin,high_price,low_price,avg_price,spec,DATE_FORMAT(record_date,'%Y-%m-%d') as date" \
          "record_date=(SELECT MAX(record_date) FROM price_records WHERE source_type='jiangnan')" \
          "origin,spec"
        ;;
    esac
    ;;

  trend)
    DAYS="${ARG1:-7}"
    case "$ARG2" in
      bxx) source_trend "bxx" "Baixiangguo Platform" "$DAYS" ;;
      huinong) source_trend "huinong" "Huinong Gold Passion Fruit" "$DAYS" ;;
      xinfadi) source_trend "xinfadi" "Beijing Xinfadi" "$DAYS" ;;
      jiangnan) source_trend "jiangnan" "Guangzhou Jiangnan" "$DAYS" ;;
      *)
        source_trend "bxx" "Baixiangguo Platform" "$DAYS"
        source_trend "huinong" "Huinong Gold Passion Fruit" "$DAYS"
        source_trend "xinfadi" "Beijing Xinfadi" "$DAYS"
        source_trend "jiangnan" "Guangzhou Jiangnan" "$DAYS"
        ;;
    esac
    ;;

  plot)
    DAYS="${ARG1:-7}"
    case "$ARG2" in
      bxx) generate_plot "bxx" "Baixiangguo Platform" "$DAYS" ;;
      huinong) generate_plot "huinong" "Huinong Gold Passion Fruit" "$DAYS" ;;
      xinfadi) generate_plot "xinfadi" "Beijing Xinfadi" "$DAYS" ;;
      jiangnan) generate_plot "jiangnan" "Guangzhou Jiangnan" "$DAYS" ;;
      *) die "Please specify source: bxx|huinong|xinfadi|jiangnan" ;;
    esac
    ;;

  *)
    echo "Usage: query.sh latest|trend|plot [args]"
    echo "  query.sh latest [bxx|huinong|xinfadi|jiangnan]"
    echo "  query.sh trend <days> [bxx|huinong|xinfadi|jiangnan]"
    echo "  query.sh plot <days> <bxx|huinong|xinfadi|jiangnan>"
    echo ""
    echo "Examples:"
    echo "  query.sh latest              # all sources"
    echo "  query.sh latest jiangnan     # jiangnan only"
    echo "  query.sh trend 7             # 7-day trend, all"
    echo "  query.sh trend 7 jiangnan    # 7-day trend, jiangnan"
    echo "  query.sh plot 7 jiangnan     # 7-day chart, jiangnan"
    exit 1
    ;;
esac