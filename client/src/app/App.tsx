import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ConfigPage } from './components/ConfigPage';
import { DashboardPage } from './components/DashboardPage';
import { HistoryPage } from './components/HistoryPage';
import { VisitorPage } from './components/VisitorPage';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './AuthContext';
function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathToTab: Record<string, string> = {
    '/admin': 'visitor',
    '/admin/dashboard': 'dashboard',
    '/admin/config': 'config',
    '/admin/history': 'history',
  };
  const activeTab = pathToTab[location.pathname] || 'visitor';
  const handleTabChange = (tab: string) => {
    const tabToPath: Record<string, string> = {
      visitor: '/admin',
      dashboard: '/admin/dashboard',
      config: '/admin/config',
      history: '/admin/history',
    };
    navigate(tabToPath[tab] || '/admin');
  };
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🍈</div>
          <p className="text-gray-600">验证登录状态...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} displayName={user.displayName} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VisitorPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={
        <AdminLayout><VisitorPage /></AdminLayout>
      } />
      <Route path="/admin/dashboard" element={
        <AdminLayout><DashboardPage /></AdminLayout>
      } />
      <Route path="/admin/config" element={
        <AdminLayout><ConfigPage /></AdminLayout>
      } />
      <Route path="/admin/history" element={
        <AdminLayout><HistoryPage /></AdminLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
