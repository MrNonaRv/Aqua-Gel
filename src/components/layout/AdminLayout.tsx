import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { LayoutDashboard, ClipboardList, Truck, Users, Droplet, LineChart, Power, Droplets, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLayout() {
  const { session, setSession } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    setSession(null);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-brand-gray-light">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`w-64 bg-brand-dark flex flex-col fixed inset-y-0 left-0 z-50 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white">
              <Droplets size={24} />
            </div>
            <div>
              <div className="font-heading text-base font-bold leading-tight">Aqua Gel</div>
              <div className="text-xs opacity-60">Admin Panel</div>
            </div>
          </div>
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-3 pt-3 pb-2 font-medium">Main</div>
          <NavLink to="/admin/dashboard" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/orders" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <ClipboardList size={18} /> Orders
          </NavLink>
          <NavLink to="/admin/delivery" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <Truck size={18} /> Delivery
          </NavLink>
          
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-3 pt-4 pb-2 font-medium">Management</div>
          <NavLink to="/admin/customers" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <Users size={18} /> Customers
          </NavLink>
          <NavLink to="/admin/inventory" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <Droplet size={18} /> Inventory
          </NavLink>
          <NavLink to="/admin/reports" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 transition-colors ${isActive ? 'bg-brand-blue text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <LineChart size={18} /> Reports
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center text-sm font-bold shrink-0">
              {session?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{session?.name}</div>
              <div className="text-xs text-white/50 capitalize truncate">{session?.role}</div>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white transition-colors shrink-0" title="Logout">
              <Power size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-6 md:p-8 h-screen overflow-y-auto pt-20 lg:pt-8 w-full max-w-[100vw]">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-brand-border flex items-center px-4 z-30 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-brand-dark hover:bg-brand-gray-light rounded-lg">
            <Menu size={24} />
          </button>
          <div className="font-heading font-bold ml-2 text-brand-dark">Aqua Gel Admin</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
