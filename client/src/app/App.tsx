import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConfigPage } from './components/ConfigPage';
import { DashboardPage } from './components/DashboardPage';
import { HistoryPage } from './components/HistoryPage';
import { VisitorPage } from './components/VisitorPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('visitor');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'config':
        return <ConfigPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'history':
        return <HistoryPage />;
      case 'visitor':
        return <VisitorPage />;
      default:
        return <VisitorPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {!(isMobile && activeTab === 'visitor') && (
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
