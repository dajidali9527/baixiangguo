import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchDashboardData, fetchHuinongTrend, fetchXinfadiTrend, fetchJiangnanTrend } from '../../api/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BxxRecord {
  id: number;
  province: string;
  region: string;
  highPrice: number;
  lowPrice: number;
  avgPrice: number;
  priceType: string;
  spec: string;
  remark: string;
  date: string;
}

interface HuinongRecord {
  id: number;
  date: string;
  product: string;
  origin: string;
  avgPrice: number;
  riseFall: string;
  trendChart: string;
  high7Price: number;
  low7Price: number;
  avg7Price: number;
}

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
  bxx: { records: BxxRecord[]; avgPrice: string; updateTime: string };
  huinong: { records: HuinongRecord[]; avgPrice: string; updateTime: string };
  xinfadi: { records: XinfadiRecord[]; avgPrice: string; updateTime: string };
  jiangnan: { records: JiangnanRecord[]; avgPrice: string; updateTime: string };
}

export function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendDialogOpen, setTrendDialogOpen] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [trendType, setTrendType] = useState<'huinong' | 'xinfadi' | 'jiangnan'>('huinong');
  const [loadingTrend, setLoadingTrend] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await fetchDashboardData();
      if (res.code === 200 && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('加载行情数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async (origin: string, type: 'huinong' | 'xinfadi' | 'jiangnan' = 'huinong') => {
    setLoadingTrend(true);
    setSelectedOrigin(origin);
    setTrendType(type);
    try {
      let res: any;
      if (type === 'huinong') {
        res = await fetchHuinongTrend(origin);
      } else if (type === 'xinfadi') {
        res = await fetchXinfadiTrend(30);
      } else {
        res = await fetchJiangnanTrend(30);
      }
      if (res.code === 200 && res.data) {
        setTrendData(res.data);
      }
    } catch (err) {
      console.error('加载走势图失败:', err);
    } finally {
      setLoadingTrend(false);
    }
  };

  const openTrendDialog = async (origin: string, type: 'huinong' | 'xinfadi' | 'jiangnan' = 'huinong') => {
    await loadTrendData(origin, type);
    setTrendDialogOpen(true);
  };

  const renderRiseFallIcon = (riseFall: string) => {
    const normalized = riseFall?.trim() || '';
    if (normalized.startsWith('+')) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (normalized.startsWith('-') && normalized !== '-') {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const [activeTab, setActiveTab] = useState('bxx');
  
  useEffect(() => {
    loadData();
    // 自动加载新发地趋势图
    loadTrendData('', 'xinfadi');
  }, []);
  
  useEffect(() => {
    if (activeTab === 'jiangnan') {
      loadTrendData('', 'jiangnan');
    } else if (activeTab === 'xinfadi') {
      loadTrendData('', 'xinfadi');
    }
  }, [activeTab]);

  const bxxRecords = dashboardData?.bxx?.records || [];
  const huinongRecords = dashboardData?.huinong?.records || [];
  const xinfadiRecords = dashboardData?.xinfadi?.records || [];
  const jiangnanRecords = dashboardData?.jiangnan?.records || [];

  const bxxAvg = dashboardData?.bxx?.avgPrice || '0';
  const huinongAvg = dashboardData?.huinong?.avgPrice || '0';
  const xinfadiAvg = dashboardData?.xinfadi?.avgPrice || '0';
  const jiangnanAvg = dashboardData?.jiangnan?.avgPrice || '0';
  const bxxUpdate = dashboardData?.bxx?.updateTime || '';
  const huinongUpdate = dashboardData?.huinong?.updateTime || '';
  const xinfadiUpdate = dashboardData?.xinfadi?.updateTime || '';
  const jiangnanUpdate = dashboardData?.jiangnan?.updateTime || '';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl">黄金百香果行情</h2>
      </div>

      <Tabs defaultValue="bxx" className="w-full" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="bxx">百香果信息平台</TabsTrigger>
          <TabsTrigger value="huinong">惠农网黄金百香果</TabsTrigger>
          <TabsTrigger value="xinfadi">北京新发地</TabsTrigger>
          <TabsTrigger value="jiangnan">广州江南</TabsTrigger>
        </TabsList>

        <TabsContent value="bxx" className="mt-0">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-gray-500">{bxxUpdate ? `更新时间: ${new Date(bxxUpdate).toLocaleString('zh-CN')}` : ''}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">当前数据源均价:</span>
              <span className="text-xl font-semibold">{Number(bxxAvg).toFixed(2)}</span>
              <span className="text-sm text-gray-500">元/斤</span>
            </div>
          </div>
          <Card className="p-6">
            {bxxRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据，请先执行数据采集</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>省</TableHead>
                      <TableHead>地区</TableHead>
                      <TableHead>市斤价</TableHead>
                      <TableHead>价类</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>报价日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bxxRecords.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.province}</TableCell>
                        <TableCell>{item.region}</TableCell>
                        <TableCell>{Number(item.avgPrice).toFixed(1)}</TableCell>
                        <TableCell>{item.priceType}</TableCell>
                        <TableCell>{item.spec}</TableCell>
                        <TableCell>{item.remark}</TableCell>
                        <TableCell>{item.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="huinong" className="mt-0">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-gray-500">{huinongUpdate ? `更新时间: ${new Date(huinongUpdate).toLocaleString('zh-CN')}` : ''}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">当前数据源均价:</span>
              <span className="text-xl font-semibold">{Number(huinongAvg).toFixed(2)}</span>
              <span className="text-sm text-gray-500">元/斤</span>
            </div>
          </div>
          <Card className="p-6">
            {huinongRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>产品/品种</TableHead>
                      <TableHead>所在产地</TableHead>
                      <TableHead>价格（元/斤）</TableHead>
                      <TableHead>升/降</TableHead>
                      <TableHead>走势图</TableHead>
                      <TableHead>近7日最高价</TableHead>
                      <TableHead>近7日最低价</TableHead>
                      <TableHead>近7日均价</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {huinongRecords.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.product}</TableCell>
                        <TableCell>{item.origin}</TableCell>
                        <TableCell>{Number(item.avgPrice).toFixed(2)}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {renderRiseFallIcon(item.riseFall)}
                          <span>{item.riseFall || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openTrendDialog(item.origin, 'huinong')}>
                            查看7日走势
                          </Button>
                        </TableCell>
                        <TableCell>{Number(item.high7Price).toFixed(2)}</TableCell>
                        <TableCell>{Number(item.low7Price).toFixed(2)}</TableCell>
                        <TableCell>{Number(item.avg7Price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="xinfadi" className="mt-0">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-gray-500">{xinfadiUpdate ? `更新时间: ${new Date(xinfadiUpdate).toLocaleString('zh-CN')}` : ''}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">当前数据源均价:</span>
              <span className="text-xl font-semibold">{Number(xinfadiAvg).toFixed(1)}</span>
              <span className="text-sm text-gray-500">元/斤</span>
            </div>
          </div>
          <Card className="p-6">
            {xinfadiRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>一级分类</TableHead>
                        <TableHead>二级分类</TableHead>
                        <TableHead>品名</TableHead>
                        <TableHead>最低价</TableHead>
                        <TableHead>平均价</TableHead>
                        <TableHead>最高价</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>产地</TableHead>
                        <TableHead>单位</TableHead>
                        <TableHead>发布日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {xinfadiRecords.slice(0, 1).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.category1}</TableCell>
                          <TableCell>{item.category2}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.lowPrice}</TableCell>
                          <TableCell>{item.avgPrice}</TableCell>
                          <TableCell>{item.highPrice}</TableCell>
                          <TableCell>{item.spec}</TableCell>
                          <TableCell>{item.origin}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="border-t pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">近1月价格走势图</h3>
                    {trendType === 'xinfadi' && trendData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">近1月均价:</span>
                        <span className="text-xl font-semibold text-red-500">
                          {(trendData.reduce((sum, item) => sum + Number(item.price), 0) / trendData.length).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">元/斤</span>
                      </div>
                    )}
                  </div>
                  {loadingTrend ? (
                    <div className="flex items-center justify-center h-80">
                      <p className="text-gray-500">加载中...</p>
                    </div>
                  ) : trendData.length === 0 ? (
                    <div className="flex items-center justify-center h-80">
                      <p className="text-gray-500">暂无历史数据</p>
                    </div>
                  ) : (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                          <Tooltip formatter={(value: number) => [`${Number(value).toFixed(2)} 元/斤`, '价格']} />
                          <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="jiangnan" className="mt-0">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-gray-500">{jiangnanUpdate ? `更新时间: ${new Date(jiangnanUpdate).toLocaleString('zh-CN')}` : ''}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">当前数据源均价:</span>
              <span className="text-xl font-semibold">{Number(jiangnanAvg).toFixed(1)}</span>
              <span className="text-sm text-gray-500">元/公斤</span>
              <span className="text-xl font-semibold text-red-500 ml-4">
                {(Number(jiangnanAvg) / 2).toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">元/斤</span>
            </div>
          </div>
          <Card className="p-6">
            {jiangnanRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>产地</TableHead>
                        <TableHead>最高价(元/公斤)</TableHead>
                        <TableHead>最低价(元/公斤)</TableHead>
                        <TableHead>参考价(元/公斤)</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jiangnanRecords.slice(0, 1).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.origin}</TableCell>
                          <TableCell>{Number(item.highPrice).toFixed(1)}</TableCell>
                          <TableCell>{Number(item.lowPrice).toFixed(1)}</TableCell>
                          <TableCell>{Number(item.refPrice).toFixed(1)}</TableCell>
                          <TableCell>{item.spec}</TableCell>
                          <TableCell>{item.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="border-t pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">近1月价格走势图</h3>
                    {trendType === 'jiangnan' && trendData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">近1月均价:</span>
                        <span className="text-xl font-semibold text-red-500">
                          {(trendData.reduce((sum, item) => sum + Number(item.price), 0) / trendData.length).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">元/公斤</span>
                        <span className="text-xl font-semibold text-red-500 ml-4">
                          {((trendData.reduce((sum, item) => sum + Number(item.price), 0) / trendData.length) / 2).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">元/斤</span>
                      </div>
                    )}
                  </div>
                  {loadingTrend && trendType === 'jiangnan' ? (
                    <div className="flex items-center justify-center h-80">
                      <p className="text-gray-500">加载中...</p>
                    </div>
                  ) : trendData.length === 0 && trendType === 'jiangnan' ? (
                    <div className="flex items-center justify-center h-80">
                      <p className="text-gray-500">暂无历史数据</p>
                    </div>
                  ) : (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendType === 'jiangnan' ? trendData : []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                          <Tooltip formatter={(value: number) => [`${Number(value).toFixed(2)} 元/公斤`, '价格']} />
                          <Line type="monotone" dataKey="price" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={trendDialogOpen} onOpenChange={setTrendDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {trendType === 'huinong' 
                ? `${selectedOrigin} 近7日价格走势图` 
                : trendType === 'xinfadi' 
                ? '北京新发地 近1月价格走势图' 
                : '广州江南 近1月价格走势图'}
            </DialogTitle>
            <DialogDescription>价格单位: {trendType === 'jiangnan' ? '元/公斤' : '元/斤'}</DialogDescription>
          </DialogHeader>
          <div className="h-80 w-full">
            {loadingTrend ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : trendData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">暂无历史数据</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip formatter={(value: number) => [
                    `${Number(value).toFixed(2)} ${trendType === 'jiangnan' ? '元/公斤' : '元/斤'}`, 
                    '价格'
                  ]} />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={trendType === 'jiangnan' ? '#82ca9d' : '#8884d8'} 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}