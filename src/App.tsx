import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './lib/store';
import { Toaster } from 'sonner';
import CustomerLogin from './pages/CustomerLogin';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Delivery from './pages/admin/Delivery';
import Customers from './pages/admin/Customers';
import Inventory from './pages/admin/Inventory';
import Reports from './pages/admin/Reports';
import CustomerPortal from './pages/customer/CustomerPortal';

export default function App() {
  const { session } = useStore();

  return (
    <>
      <Toaster position="top-right" richColors closeButton expand={false} />
      <Routes>
        <Route path="/" element={<CustomerLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={session?.role === 'admin' ? <AdminLayout /> : <Navigate to="/admin/login" />}>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="customers" element={<Customers />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={session?.role === 'customer' ? <CustomerPortal /> : <Navigate to="/" />}>
        </Route>
      </Routes>
    </>
  );
}

