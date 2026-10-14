import React from 'react';
import { PreFetchProvider, usePreFetch } from './context/PreFetchContext';
import { TopSwitcher } from './components/Navigation/TopSwitcher';
import { LandingHub } from './components/Landing/LandingHub';
import { StudentCatalog } from './components/Student/StudentCatalog';
import { CheckoutToken } from './components/Student/CheckoutToken';
import { AdminConsole } from './components/Admin/AdminConsole';

const MainApp: React.FC = () => {
  const { activeView } = usePreFetch();

  return (
    <div className="relative min-h-screen">
      <TopSwitcher />
      {activeView === 'landing' && <LandingHub />}
      {activeView === 'catalog' && <StudentCatalog />}
      {activeView === 'checkout' && <CheckoutToken />}
      {activeView === 'admin' && <AdminConsole />}
    </div>
  );
};

export function App() {
  return (
    <PreFetchProvider>
      <MainApp />
    </PreFetchProvider>
  );
}

export default App;
