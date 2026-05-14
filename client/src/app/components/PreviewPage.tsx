import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MessageSquare, Image, TrendingUp, TrendingDown } from 'lucide-react';

export function PreviewPage() {
  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-2xl mb-6">通知预览</h2>

      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text">
            <MessageSquare className="w-4 h-4 mr-2" />
            文字消息
          </TabsTrigger>
          <TabsTrigger value="table">
            <Image className="w-4 h-4 mr-2" />
            价格表格
          </TabsTrigger>
          <TabsTrigger value="chart">
            <TrendingUp className="w-4 h-4 mr-2" />
            趋势图表
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">文字通知示例</h3>
              <Badge>微信消息</Badge>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <div className="space-y-3">
                <p className="text-lg">
                  <span className="mr-2">🍈</span>
                  <strong>今日百香果价格播报</strong>
                </p>

                <div className="space-y-2">
                  <p>
                    <span className="mr-2">📊</span>
                    全国平均价: <strong className="text-xl">8.2 元/斤</strong>
                    <span className="ml-2 text-red-500 inline-flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      +0.5元
                    </span>
                  </p>

                  <div className="pl-6 space-y-1 text-sm">
                    <p>• 广州: 8.2元/斤 <span className="text-red-500">↑0.5</span></p>
                    <p>• 遵义: 7.8元/斤 <span className="text-red-500">↑0.3</span></p>
                    <p>• 福泉: 7.5元/斤 <span className="text-green-500">↓0.2</span></p>
                    <p>• 昆明: 8.5元/斤 <span className="text-red-500">↑0.8</span></p>
                    <p>• 南宁: 7.9元/斤 <span className="text-red-500">↑0.1</span></p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                  更新时间: 2026-05-04 06:30
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">表格图片示例</h3>
              <Badge>微信图片</Badge>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-center mb-4">
                  <h4 className="text-xl">🍈 今日百香果价格</h4>
                  <p className="text-sm text-gray-500 mt-1">2026-05-04 数据</p>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="py-2 text-left">地区</th>
                      <th className="py-2 text-right">均价</th>
                      <th className="py-2 text-right">最高</th>
                      <th className="py-2 text-right">最低</th>
                      <th className="py-2 text-center">涨跌</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-2">广州</td>
                      <td className="py-2 text-right">8.2</td>
                      <td className="py-2 text-right">9.0</td>
                      <td className="py-2 text-right">7.5</td>
                      <td className="py-2 text-center text-red-500">↑0.5</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2">遵义</td>
                      <td className="py-2 text-right">7.8</td>
                      <td className="py-2 text-right">8.5</td>
                      <td className="py-2 text-right">7.2</td>
                      <td className="py-2 text-center text-red-500">↑0.3</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2">福泉</td>
                      <td className="py-2 text-right">7.5</td>
                      <td className="py-2 text-right">8.0</td>
                      <td className="py-2 text-right">7.0</td>
                      <td className="py-2 text-center text-green-500">↓0.2</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2">昆明</td>
                      <td className="py-2 text-right">8.5</td>
                      <td className="py-2 text-right">9.2</td>
                      <td className="py-2 text-right">7.8</td>
                      <td className="py-2 text-center text-red-500">↑0.8</td>
                    </tr>
                    <tr>
                      <td className="py-2">南宁</td>
                      <td className="py-2 text-right">7.9</td>
                      <td className="py-2 text-right">8.6</td>
                      <td className="py-2 text-right">7.3</td>
                      <td className="py-2 text-center text-red-500">↑0.1</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <p className="text-lg">
                    全国均价: <strong className="text-blue-600">8.2 元/斤</strong>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">趋势图表示例</h3>
              <Badge>微信图片</Badge>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-lg">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-center mb-4">
                  <h4 className="text-xl">📈 7日价格趋势</h4>
                  <p className="text-sm text-gray-500 mt-1">百香果全国均价走势</p>
                </div>

                <div className="relative h-64 flex items-end justify-between gap-2 px-4 border-l-2 border-b-2 border-gray-300">
                  {[7.2, 7.5, 7.8, 7.6, 7.9, 8.1, 8.2].map((price, index) => {
                    const height = ((price - 6.5) / 2.5) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-xs mb-1">{price}</div>
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs mt-2">
                          {['28', '29', '30', '01', '02', '03', '04'][index]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>平均价格</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <span>本周上涨 13.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
