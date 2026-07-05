import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SatisFisi from './pages/SatisFisi';
import Tahsilat from './pages/Tahsilat';
import Ebelge from './pages/Ebelge';
import Odeme from './pages/Odeme';
import Cekler from './pages/Cekler';
import StokPage from './pages/Stok';
import Raporlar from './pages/Raporlar';
import Kullanicilar from './pages/Kullanicilar';
import AuditLog from './pages/AuditLog';
import Mobil from './pages/Mobil';
import { CrudPage } from './components/CrudPage';
import { paramConfigs } from './pages/paramConfigs';

function RequireAuth({ children }: { children: JSX.Element }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
  );
}
