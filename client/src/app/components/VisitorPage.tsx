import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchDashboardData, fetchXinfadiTrend, fetchJiangnanTrend } from '../../api/dashboard';
import { Card } from './ui/card';
import { RefreshCw, X } from 'lucide-react';

interface XinfadiRecord {
  id: number;
  category1: string;
  category2: string;
  name: string;
  lowPrice: string;
  avgPrice: string;
  highPrice: string;
  spec: string;
  origin: string;
  unit: string;
  date: string;
}

interface JiangnanRecord {
  id: number;
  name: string;
  origin: string;
  highPrice: string;
  lowPrice: string;
  refPrice: string;
  spec: string;
  date: string;
}

interface TrendData {
  date: string;
  price: number;
}

interface DashboardData {
  xinfadi: { records: XinfadiRecord[]; avgPrice: string; updateTime: string };
  jiangnan: { records: JiangnanRecord[]; avgPrice: string; updateTime: string };
}

interface MarketSection {
  title: string;
  subtitle: string;
  unit: string;
  todayRecord: XinfadiRecord | JiangnanRecord | null;
  weekTrend: TrendData[];
  monthTrend: TrendData[];
  loading: boolean;
}

function calcStats(trend: TrendData[]) {
  if (!trend.length) {
    return { high: 0, low: 0, avg: 0 };
  }
  const prices = trend.map((t) => Number(t.price) || 0);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  return { high, low, avg };
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}

export function VisitorPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [xinfadiWeek, setXinfadiWeek] = useState<TrendData[]>([]);
  const [xinfadiMonth, setXinfadiMonth] = useState<TrendData[]>([]);
  const [jiangnanWeek, setJiangnanWeek] = useState<TrendData[]>([]);
  const [jiangnanMonth, setJiangnanMonth] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMarket, setActiveMarket] = useState<'xinfadi' | 'jiangnan'>('jiangnan');
  const [showReward, setShowReward] = useState(false);
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [dashboardRes, xWeekRes, xMonthRes, jWeekRes, jMonthRes] = await Promise.all([
        fetchDashboardData(),
        fetchXinfadiTrend(7),
        fetchXinfadiTrend(30),
        fetchJiangnanTrend(7),
        fetchJiangnanTrend(30),
      ]);
      const dashData: any = dashboardRes;
      if (dashData.code === 200 && dashData.data) {
        setDashboardData(dashData.data);
      }
      const setData = (res: any, setter: (d: TrendData[]) => void) => {
        if (res && res.code === 200 && Array.isArray(res.data)) {
          setter(res.data);
        }
      };
      setData(xWeekRes as any, setXinfadiWeek);
      setData(xMonthRes as any, setXinfadiMonth);
      setData(jWeekRes as any, setJiangnanWeek);
      setData(jMonthRes as any, setJiangnanMonth);
    } catch (err) {
      console.error('加载访客页面数据失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🍈</div>
          <p className="text-gray-600">正在加载最新价格...</p>
        </div>
      </div>
    );
  }
  const xinfadiToday = dashboardData?.xinfadi?.records?.[0] || null;
  const jiangnanToday = dashboardData?.jiangnan?.records?.[0] || null;
  const xinfadiWeekStats = calcStats(xinfadiWeek);
  const jiangnanWeekStats = calcStats(jiangnanWeek);
  const renderMarketSection = (section: MarketSection) => {
    const isXinfadi = section.title.includes('新发地');
    const weekStats = isXinfadi ? xinfadiWeekStats : jiangnanWeekStats;
    const weekTrend = isXinfadi ? xinfadiWeek : jiangnanWeek;
    const monthTrend = isXinfadi ? xinfadiMonth : jiangnanMonth;
    const color = isXinfadi ? '#f59e0b' : '#10b981';
    const today = section.todayRecord as XinfadiRecord | JiangnanRecord | null;
    const todayAvg = today ? (isXinfadi ? Number((today as XinfadiRecord).avgPrice) : Number((today as JiangnanRecord).refPrice)) : 0;
    const todayHigh = today ? (isXinfadi ? Number((today as XinfadiRecord).highPrice) : Number((today as JiangnanRecord).highPrice)) : 0;
    const todayLow = today ? (isXinfadi ? Number((today as XinfadiRecord).lowPrice) : Number((today as JiangnanRecord).lowPrice)) : 0;
    const todayDate = today?.date || '';
    const weekRange = weekStats.high - weekStats.low;
    const renderTrendChart = (data: TrendData[], height: number) => {
      if (!data.length) {
        return (
          <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
            暂无数据
          </div>
        );
      }
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v).toFixed(2)} />
              <Tooltip
                formatter={(value: number) => [`${Number(value).toFixed(2)} ${section.unit}`, '价格']}
                labelFormatter={(label) => `日期: ${label}`}
                contentStyle={{ fontSize: '12px', padding: '6px 8px' }}
              />
              <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    };
    return (
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">本日价格</span>
              <span className="text-xs text-gray-400">{todayDate}</span>
            </div>
            {today ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">最低</div>
                  <div className="text-base font-semibold text-green-600">{todayLow.toFixed(2)}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">平均</div>
                  <div className="text-lg font-bold text-orange-600">{todayAvg.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">最高</div>
                  <div className="text-base font-semibold text-red-500">{todayHigh.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">暂无数据</p>
            )}
            <div className="text-right text-xs text-gray-400 mt-1">单位: {section.unit}</div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">本周价格</span>
              <span className="text-xs text-gray-400">最近7天</span>
            </div>
            {weekTrend.length ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">最低</div>
                  <div className="text-sm font-semibold text-green-600">{weekStats.low.toFixed(2)}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">均价</div>
                  <div className="text-sm font-bold text-orange-600">{weekStats.avg.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">最高</div>
                  <div className="text-sm font-semibold text-red-500">{weekStats.high.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">暂无数据</p>
            )}
            <div className="text-right text-xs text-gray-400 mt-1">
              振幅: {weekRange.toFixed(2)} {section.unit}
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">本周价格趋势</span>
              <span className="text-xs text-gray-400">{weekTrend.length} 条</span>
            </div>
            {renderTrendChart(weekTrend, 160)}
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">本月价格趋势</span>
              <span className="text-xs text-gray-400">{monthTrend.length} 条</span>
            </div>
            {renderTrendChart(monthTrend, 180)}
          </div>
        </div>
      </Card>
    );
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-orange-50 to-white">
      <div className="max-w-md mx-auto px-3 py-4 pb-8">
        <div className="mb-4">
          <div className="bg-gradient-to-r from-green-300 to-yellow-400 rounded-xl py-2 px-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">🍈</span>
                黄金百香果价格
              </h1>
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors disabled:opacity-50"
                title="刷新数据"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveMarket('jiangnan')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              activeMarket === 'jiangnan'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            广州江南
          </button>
          <button
            onClick={() => setActiveMarket('xinfadi')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              activeMarket === 'xinfadi'
                ? 'bg-yellow-400 text-yellow-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            北京新发地
          </button>
        </div>
        <div className="space-y-4">
          {activeMarket === 'xinfadi' && renderMarketSection({
            title: '北京新发地',
            subtitle: '百香果',
            unit: '元/斤',
            todayRecord: xinfadiToday,
            weekTrend: xinfadiWeek,
            monthTrend: xinfadiMonth,
            loading,
          })}
          {activeMarket === 'jiangnan' && renderMarketSection({
            title: '广州江南',
            subtitle: '百香果',
            unit: '元/公斤',
            todayRecord: jiangnanToday,
            weekTrend: jiangnanWeek,
            monthTrend: jiangnanMonth,
            loading,
          })}
        </div>
        <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            {activeMarket === 'jiangnan' ? (
              <p>数据来源: <a href="https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">广州江南果菜批发市场</a></p>
            ) : (
              <p>数据来源: <a href="http://www.xinfadi.com.cn/priceDetail.html" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">北京新发地农产品批发市场</a></p>
            )}
            <span onClick={() => setShowReward(true)} className="cursor-pointer hover:underline">留言</span>
          </div>
          <a href="/admin/login" className="px-3 py-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 hover:text-gray-700 transition-colors">登录</a>
        </div>
        {showReward && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowReward(false)}
          >
            <div className="relative bg-white rounded-2xl p-4 max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowReward(false)}
                className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <p className="text-center text-sm font-medium text-gray-700 mb-3">打赏留言</p>
              <img src="/reward.jpg" alt="打赏码" className="w-full rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
