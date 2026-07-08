import { Card } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CheckCircle2, XCircle, Clock, Play, RefreshCw, X, Power } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTaskStatus, fetchExecutionLogs, manualCrawl, fetchDataSources, updateDataSource } from '../../api/config';
import type { DataSource, TaskLog } from '../../api/types';

const initialLogs: TaskLog[] = [];

const defaultTasks: DataSource[] = [];

const defaultSources: DataSource[] = [
  { id: 1, type: '自媒体', platform: '微信公众号', name: '百香果信息平台', url: 'https://weixin.sogou.com/', scope: '最新发布的文章："百香果信息平台：黄金百香果价格行情"', schedule: '系统启动后；手动点击立即执行；每周二、四、六晚上22:00', enabled: false, status: 'success', lastRun: '', duration: '', records: 0, executionType: '' },
  { id: 2, type: '电商平台', platform: '惠农网', name: '惠农网黄金百香果', url: 'https://www.cnhnb.com/hangqing/cdlist-2001332-12167-0-0-0-1/', scope: '行情大厅-水果-百香果-黄金百香果，最新价格与7日均价', schedule: '系统启动后；手动点击立即执行；每日晚上22:00', enabled: false, status: 'success', lastRun: '', duration: '', records: 0, executionType: '' },
  { id: 3, type: '大型批发市场', platform: '北京新发地', name: '北京新发地百香果', url: 'http://www.xinfadi.com.cn/priceDetail.html', scope: '最新价格与最近1月的均价与走势', schedule: '系统启动后；手动点击立即执行；每日晚上22:00', enabled: true, status: 'success', lastRun: '', duration: '', records: 0, executionType: '' },
  { id: 4, type: '大型批发市场', platform: '广州江南果菜批发市场', name: '广州江南百香果', url: 'https://www.jnmarket.net/fruitsvegetables/dailyprice/fruitprice', scope: '最新价格与最近1月的均价与走势', schedule: '系统启动后；手动点击立即执行；每日晚上22:00', enabled: true, status: 'success', lastRun: '', duration: '', records: 0, executionType: '' },
];

const configuredSources = [
  { id: 1, name: '百香果信息平台' },
  { id: 2, name: '惠农网黄金百香果' },
  { id: 3, name: '北京新发地百香果' },
  { id: 4, name: '广州江南百香果' }
];

export function ConfigPage() {
  const [taskList, setTaskList] = useState<DataSource[]>(defaultTasks);
  const [sourcesList, setSourcesList] = useState<DataSource[]>(defaultSources);
  const [logs, setLogs] = useState<TaskLog[]>(initialLogs);
  const [isCrawling, setIsCrawling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const crawlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasRunningTask = taskList.some(t => t.status === 'running');
  const isBusy = isCrawling || hasRunningTask;

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const loadSources = useCallback(async () => {
    try {
      const res: any = await fetchDataSources();
      if (res.code === 200 && res.data) {
        setSourcesList(res.data.length > 0 ? res.data : defaultSources);
      }
    } catch (error) {
      console.error('加载数据源失败:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [sourcesRes, logsRes, tasksRes] = await Promise.all([
        fetchDataSources(),
        fetchExecutionLogs(),
        fetchTaskStatus()
      ]);

      const sourcesData: any = sourcesRes as any;
      if (sourcesData.code === 200 && sourcesData.data) {
        setSourcesList(sourcesData.data.length > 0 ? sourcesData.data : defaultSources);
      }

      const logsData: any = logsRes as any;
      if (logsData.code === 200 && logsData.data) {
        setLogs(logsData.data.list || initialLogs);
      }

      const tasksData: any = tasksRes as any;
      if (tasksData.code === 200 && tasksData.data) {
        setTaskList(tasksData.data.length > 0 ? tasksData.data : defaultTasks);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      if (crawlTimerRef.current) {
        clearTimeout(crawlTimerRef.current);
      }
    };
  }, [loadData]);

  const handleToggleEnabled = async (sourceId: number, currentEnabled: boolean) => {
    try {
      const source = sourcesList.find(s => s.id === sourceId);
      if (!source) return;
      
      const res: any = await updateDataSource(sourceId, {
        url: source.url,
        scope: source.scope,
        schedule: source.schedule,
        enabled: !currentEnabled
      });
      
      if (res.code === 200) {
        setSourcesList(prev => prev.map(s => s.id === sourceId ? { ...s, enabled: !currentEnabled } : s));
        setNotification({ type: 'success', message: `${source.name} 已${!currentEnabled ? '启用' : '禁用'}` });
      } else {
        setNotification({ type: 'error', message: res.message || '更新失败' });
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.response?.data?.message || '更新失败' });
    } finally {
      if (crawlTimerRef.current) {
        clearTimeout(crawlTimerRef.current);
      }
      crawlTimerRef.current = setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCrawlSingle = async (sourceId: number, sourceName: string) => {
    if (isBusy) return;
    setIsCrawling(true);
    try {
      const res: any = await manualCrawl(sourceId);
      if (res.code === 200) {
        setNotification({ type: 'success', message: `${sourceName} ${res.message}` });
        await loadData();
      } else {
        setNotification({ type: 'error', message: `${sourceName} ${res.message || '执行失败'}` });
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: `${sourceName} ${error.response?.data?.message || '执行失败，请稍后重试'}` });
    } finally {
      setIsCrawling(false);
      if (crawlTimerRef.current) {
        clearTimeout(crawlTimerRef.current);
      }
      crawlTimerRef.current = setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleCrawlAll = async () => {
    if (isBusy) return;
    setIsCrawling(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const enabledSources = sourcesList.filter(s => s.enabled);
      for (const source of enabledSources) {
        try {
          const res: any = await manualCrawl(source.id);
          if (res.code === 200) {
            successCount++;
          } else {
            failCount++;
          }
          await loadData();
        } catch {
          failCount++;
        }
      }
      const msg = `全部执行完成：成功 ${successCount} 个，失败 ${failCount} 个`;
      setNotification({ type: successCount > 0 ? 'success' : 'error', message: msg });
    } catch {
      setNotification({ type: 'error', message: '采集任务执行异常' });
    } finally {
      setIsCrawling(false);
      if (crawlTimerRef.current) {
        clearTimeout(crawlTimerRef.current);
      }
      crawlTimerRef.current = setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl">数据采集配置与日志</h2>
        <Button onClick={handleCrawlAll} disabled={isBusy}>
          {isBusy ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              采集中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              立即执行全部数据源采集
            </>
          )}
        </Button>
      </div>

      {notification && (
        <div className={`mb-4 p-3 rounded-md flex items-center justify-between text-sm ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {notification.type === 'error' && <XCircle className="w-4 h-4" />}
            {notification.type === 'info' && <Clock className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={clearNotification} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources">数据源配置</TabsTrigger>
          <TabsTrigger value="tasks">任务状态</TabsTrigger>
          <TabsTrigger value="logs">执行日志</TabsTrigger>
        </TabsList>

        {/* 数据源配置 */}
        <TabsContent value="sources" className="mt-6">
          {sourcesList.map((source, index) => (
            <Card key={source.id} className={`p-6 ${index > 0 ? 'mt-6' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg">{source.name}</h3>
                    <Badge variant="outline">{source.type}</Badge>
                    <Badge className={source.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                      <Power className="w-3 h-3 mr-1" />
                      {source.enabled ? '已启用' : '已禁用'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{source.platform}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleEnabled(source.id, source.enabled)}
                    className={source.enabled ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                  >
                    <Power className="w-4 h-4 mr-1" />
                    {source.enabled ? '禁用' : '启用'}
                  </Button>
                  {source.enabled && (
                    <Button onClick={() => handleCrawlSingle(source.id, source.name)} disabled={isBusy} size="sm">
                      <Play className="w-4 h-4 mr-1" />
                      立即执行
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm">数据源URL</Label>
                  <Input value={source.url || ''} readOnly className="mt-2 bg-gray-50 text-gray-600 cursor-default" />
                </div>
                <div>
                  <Label className="text-sm">采集数据范围</Label>
                  <Textarea value={source.scope || ''} readOnly className="mt-2 bg-gray-50 text-gray-600 cursor-default" rows={2} />
                </div>
                <div>
                  <Label className="text-sm">采集数据周期</Label>
                  <Input value={source.schedule || ''} readOnly className="mt-2 bg-gray-50 text-gray-600 cursor-default" />
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* 任务状态 */}
        <TabsContent value="tasks" className="mt-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-gray-500">总执行次数</div>
              <div className="text-2xl mt-1">{taskList.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">成功</div>
              <div className="text-2xl mt-1 text-green-600">
                {taskList.filter(s => s.status === 'success').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">失败</div>
              <div className="text-2xl mt-1 text-red-600">
                {taskList.filter(s => s.status === 'failed').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">总记录数</div>
              <div className="text-2xl mt-1">
                {taskList.reduce((sum, s) => sum + (s.records || 0), 0)}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">采集任务状态</h3>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>数据源</TableHead>
                  <TableHead>数据源类型</TableHead>
                  <TableHead>数据采集周期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>执行时间</TableHead>
                  <TableHead>执行时长</TableHead>
                  <TableHead>获取记录</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskList.map((task, index) => (
                  <TableRow key={`${task.id}-${index}`}>
                    <TableCell>{task.name}</TableCell>
                    <TableCell>{task.type}</TableCell>
                    <TableCell>{task.executionType}</TableCell>
                    <TableCell>
                      {task.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          成功
                        </Badge>
                      ) : task.status === 'failed' ? (
                        <Badge className="bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          失败
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3 mr-1" />
                          运行中
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{task.executionTime || task.lastRun || ''}</TableCell>
                    <TableCell>{task.duration || ''}</TableCell>
                    <TableCell>{task.records || 0} 条</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleCrawlSingle(task.id, task.name)} disabled={isBusy}>重新执行</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* 执行日志 */}
        <TabsContent value="logs" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">执行日志</h3>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded border border-gray-100 hover:bg-gray-50">
                  <span className="text-xs text-gray-500 w-20">{log.time}</span>
                  {log.level === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />}
                  {log.level === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                  {log.level === 'info' && <Clock className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <span className="flex-1 text-sm">{log.message}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
