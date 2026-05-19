import { Card } from './ui/card';
import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Smartphone, Unplug, RefreshCw, Terminal, Copy, Check, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';

interface WeixinAccount {
  accountId: string;
  bound: boolean;
  userId: string | null;
  savedAt: string | null;
}

interface WeixinStatus {
  bound: boolean;
  accounts: WeixinAccount[];
  loginCommand: string;
}

export function OpenclawConfigPage() {
  const [weixinStatus, setWeixinStatus] = useState<WeixinStatus | null>(null);
  const [isBinding, setIsBinding] = useState(false);
  const [bindingOutput, setBindingOutput] = useState<string[]>([]);
  const [bindingStatus, setBindingStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);
  const outputEndRef = useRef<HTMLDivElement | null>(null);

  const openclawPort = import.meta.env.VITE_OPENCLAW_PORT || '18789';

  const fetchStatus = async () => {
    try {
      const res: any = await apiClient.get('/openclaw/weixin/status');
      if (res.code === 0) setWeixinStatus(res.data);
    } catch {}
  };

  useEffect(() => { fetchStatus(); }, []);
  
  // 自动滚动到底部
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bindingOutput]);

  const handleOpenOpenclaw = () => {
    window.open(`http://localhost:${openclawPort}`, '_blank');
  };

  const handleLogin = async () => {
    if (isBinding) return;
    
    setIsBinding(true);
    setBindingStatus('running');
    setBindingOutput([]);

    try {
      const eventSource = new EventSource('/api/openclaw/weixin/login');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('message', (event) => {
        setBindingOutput(prev => [...prev, JSON.parse(event.data)]);
      });

      eventSource.addEventListener('output', (event) => {
        const data = JSON.parse(event.data);
        const lines = data.split('\n');
        setBindingOutput(prev => [...prev, ...lines]);
      });

      eventSource.addEventListener('error', (event) => {
        setBindingOutput(prev => [...prev, `❌ 错误: ${JSON.parse(event.data)}`]);
        setBindingStatus('error');
      });

      eventSource.addEventListener('success', () => {
        setBindingStatus('success');
      });

      eventSource.addEventListener('done', async () => {
        eventSource.close();
        setIsBinding(false);
        await fetchStatus();
      });

      eventSource.onerror = () => {
        eventSource.close();
        setIsBinding(false);
        setBindingStatus('error');
        setBindingOutput(prev => [...prev, '连接断开']);
      };

    } catch (error) {
      setIsBinding(false);
      setBindingStatus('error');
      setBindingOutput(['启动失败']);
    }
  };

  const handleUnbind = async () => {
    if (!window.confirm('确定要解绑所有微信账号吗？')) return;
    setIsBinding(true);
    try {
      const res: any = await apiClient.post('/openclaw/weixin/unbind');
      if (res.code === 0) alert(res.data.message);
      await fetchStatus();
    } catch {
      alert('解绑失败，请重试');
    }
    setIsBinding(false);
  };

  const handleCancelBinding = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsBinding(false);
    setBindingStatus('idle');
  };

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl mb-6">数据通知与配置</h2>
      <Card className="p-6 mb-6">
        <h3 className="text-lg mb-3">OpenClaw 管理面板</h3>
        <p className="text-gray-500 mb-4">打开 OpenClaw 可视化操作页面，管理 AI 智能体、渠道和插件。</p>
        <button
          onClick={handleOpenOpenclaw}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          打开 OpenClaw
        </button>
        <p className="text-xs text-gray-400 mt-2">将在新窗口打开 http://localhost:{openclawPort}</p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg mb-3 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          绑定微信 ClawBot
        </h3>
        
        {weixinStatus?.bound ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-green-700 font-medium">已绑定</span>
            </div>
            {weixinStatus.accounts.map((acc) => (
              <div key={acc.accountId} className="text-sm text-gray-600 bg-gray-50 rounded p-3 mb-2">
                <p>账号ID: <code className="text-xs bg-gray-200 px-1 rounded">{acc.accountId}</code></p>
                {acc.userId && <p>用户ID: {acc.userId}</p>}
                {acc.savedAt && <p>绑定时间: {acc.savedAt}</p>}
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleUnbind}
                disabled={isBinding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Unplug className="w-4 h-4" />
                取消绑定
              </button>
              <button
                onClick={handleLogin}
                disabled={isBinding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                重新绑定
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-gray-600 font-medium">未绑定</span>
            </div>
            
            {!isBinding ? (
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                绑定微信
              </button>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700 font-medium">正在登录...</span>
                  </div>
                  <button
                    onClick={handleCancelBinding}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
                
                <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-lg min-h-[400px] max-h-[600px] overflow-y-auto">
                  {bindingOutput.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap break-all">{line}</div>
                  ))}
                  <div ref={outputEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
