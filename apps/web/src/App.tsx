import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { BatchesPage } from '@/pages/BatchesPage';
import { CardsPage } from '@/pages/CardsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GeneratePage } from '@/pages/GeneratePage';
import { LogsPage } from '@/pages/LogsPage';
import { RedeemPage } from '@/pages/RedeemPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="redeem" element={<RedeemPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
