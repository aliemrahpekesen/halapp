import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { getToken } from './api';
import AppLayout from './components/AppLayout';
import { CrudPage } from './components/CrudPage';
import { paramConfigs } from './pages/paramConfigs';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SatisFisi = lazy(() => import('./pages/SatisFisi'));
const Tahsilat = lazy(() => import('./pages/Tahsilat'));
const Ebelge = lazy(() => import('./pages/Ebelge'));
const Odeme = lazy(() => import('./pages/Odeme'));
const Cekler = lazy(() => import('./pages/Cekler'));
const StokPage = lazy(() => import('./pages/Stok'));
const BosKasa = lazy(() => import('./pages/BosKasa'));
const Raporlar = lazy(() => import('./pages/Raporlar'));
const Kullanicilar = lazy(() => import('./pages/Kullanicilar'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Mobil = lazy(() => import('./pages/Mobil'));

function RequireAuth({ children }: { children: JSX.Element }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><Spin size="large" /></div>
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mobil/*" element={<RequireAuth><Mobil /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="satis/fisi" element={<SatisFisi />} />
          <Route path="finans/tahsilat" element={<Tahsilat />} />
          <Route path="finans/cekler" element={<Cekler />} />
          <Route path="odeme" element={<Odeme />} />
          <Route path="stok" element={<StokPage />} />
          <Route path="bos-kasa" element={<BosKasa />} />
          <Route path="ebelge" element={<Ebelge />} />
          <Route path="raporlar" element={<Raporlar />} />
          <Route path="yonetim/kullanicilar" element={<Kullanicilar />} />
          <Route path="yonetim/audit" element={<AuditLog />} />
          {paramConfigs.map((c) => (
            <Route key={c.path} path={`parametreler/${c.path}`} element={<CrudPage config={c} />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
