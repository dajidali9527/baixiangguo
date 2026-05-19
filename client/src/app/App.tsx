import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConfigPage } from './components/ConfigPage';
import { DashboardPage } from './components/DashboardPage';
import { HistoryPage } from './components/HistoryPage';
import { OpenclawConfigPage } from './components/OpenclawConfigPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'config':
        return <ConfigPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'history':
        return <HistoryPage />;
      case 'preview':
        return <OpenclawConfigPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}