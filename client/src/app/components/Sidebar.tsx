import { Settings, BarChart3, ListTodo, Bell, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const menuItems = [
    { id: 'dashboard', label: '最新行情数据', icon: BarChart3, disabled: false },
    { id: 'config', label: '数据采集配置', icon: Settings, disabled: false },
    { id: 'history', label: '数据采集历史', icon: ListTodo, disabled: false },
    { id: 'preview', label: '数据通知与配置', icon: Bell, disabled: false },
  ];
  const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const isCollapsed = collapsed;

  const handleItemClick = (item: any) => {
    if (item.disabled) return;
    onTabChange(item.id);
  };

  return (
    <div className={(isCollapsed ? 'w-16' : 'w-64') + ' bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 relative'}>
      <div className="p-6 border-b border-gray-200">
        {!collapsed ? (
          <div>
            <h1 className="text-xl">百香果价格推送</h1>
            <p className="text-sm text-gray-500 mt-1">自动监控系统</p>
          </div>
        ) : (
          <h1 className="text-xl flex items-center justify-center">🍈</h1>
        )}
      </div>
      <nav className="flex-1 p-2">
        {menuItems.map(function(item) {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const baseClass = 'w-full flex items-center ' + (isCollapsed ? 'justify-center' : 'gap-3') + ' px-3 py-3 rounded-lg mb-1 transition-colors ';
          const activeClass = isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50';
          const disabledClass = item.disabled ? 'opacity-50 cursor-not-allowed' : '';
          const externalClass = '';
          const btnClass = baseClass + activeClass + ' ' + disabledClass + ' ' + externalClass;
          const tooltipText = isCollapsed ? item.label : undefined;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={btnClass}
              title={tooltipText}
              disabled={item.disabled}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              {!isCollapsed ? (
                <span>{item.label}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        {!collapsed ? (
          <div className="text-sm text-gray-500">
            <p>系统状态: <span className="text-green-600">正常运行</span></p>
            <p className="mt-1">服务器日期: {currentDate}</p>
          </div>
        ) : null}
      </div>
      <button
        onClick={function() { setCollapsed(!collapsed); }}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 transition-all z-10"
        title={collapsed ? '展开菜单' : '收起菜单'}
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  );
}
