import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Role = 'admin' | 'customer';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export interface Customer extends User {
  password?: string;
  phone: string;
  address: string;
  unpaid: number;
  totalGallons: number;
  isLoyal: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  type: 'slim' | 'round';
  qty: number;
  method: 'delivery' | 'pickup';
  paymentMethod?: 'cash' | 'gcash';
  referenceNumber?: string;
  checkoutUrl?: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  total: number;
  paid: boolean;
  date: number;
  personnel: string | null;
  address: string | null;
  containerReturn: boolean;
  paidDate?: number;
}

export interface Inventory {
  slim: number;
  round: number;
  priceSlim: number;
  priceRound: number;
}

export interface Settings {
  gcashName: string;
  gcashNumber: string;
  qrCodeUrl: string;
}

interface StoreContextType {
  session: User | null;
  setSession: (user: User | null) => void;
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  inventory: Inventory;
  setInventory: (inventory: Inventory) => void;
  personnel: string[];
  setPersonnel: (personnel: string[]) => void;
  stockLog: { msg: string; time: number }[];
  setStockLog: (log: { msg: string; time: number }[]) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  updateCustomerBalance: (customerId: string, amountChange: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SEED_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Maria Santos', username: 'maria', password: 'maria123', phone: '09171234567', address: 'Brgy. Poblacion, Numancia, Aklan', unpaid: 150, totalGallons: 5, isLoyal: false, role: 'customer' },
  { id: 'c2', name: 'Jose Reyes', username: 'jose', password: 'jose123', phone: '09281234567', address: 'Purok 3, Numancia, Aklan', unpaid: 0, totalGallons: 3, isLoyal: false, role: 'customer' },
  { id: 'c3', name: 'Ana Cruz', username: 'ana', password: 'ana123', phone: '09391234567', address: 'Brgy. Union, Numancia, Aklan', unpaid: 75, totalGallons: 3, isLoyal: false, role: 'customer' },
];

const now = Date.now();
const day = 86400000;
const SEED_ORDERS: Order[] = [
  { id: 'o1', customerId: 'c1', customerName: 'Maria Santos', type: 'round', qty: 2, method: 'delivery', status: 'Delivered', total: 80, paid: true, date: now - 2*day, personnel: 'Jun Dela Cruz', address: 'Brgy. Poblacion, Numancia, Aklan', containerReturn: true },
  { id: 'o2', customerId: 'c2', customerName: 'Jose Reyes', type: 'slim', qty: 1, method: 'pickup', status: 'Delivered', total: 35, paid: true, date: now - day, personnel: null, address: null, containerReturn: false },
  { id: 'o3', customerId: 'c3', customerName: 'Ana Cruz', type: 'slim', qty: 2, method: 'delivery', status: 'Out for Delivery', total: 70, paid: false, date: now - 3600000, personnel: 'Roel Bautista', address: 'Brgy. Union, Numancia, Aklan', containerReturn: false },
  { id: 'o4', customerId: 'c1', customerName: 'Maria Santos', type: 'round', qty: 3, method: 'delivery', status: 'Pending', total: 120, paid: false, date: now - 1800000, personnel: null, address: 'Brgy. Poblacion, Numancia, Aklan', containerReturn: false },
  { id: 'o5', customerId: 'c2', customerName: 'Jose Reyes', type: 'round', qty: 2, method: 'delivery', status: 'Delivered', total: 80, paid: true, date: now - 5*day, personnel: 'Jun Dela Cruz', address: 'Purok 3, Numancia, Aklan', containerReturn: true },
  { id: 'o6', customerId: 'c3', customerName: 'Ana Cruz', type: 'slim', qty: 3, method: 'delivery', status: 'Delivered', total: 105, paid: false, date: now - 7*day, personnel: 'Roel Bautista', address: 'Brgy. Union, Numancia, Aklan', containerReturn: false },
];

const SEED_INVENTORY: Inventory = { slim: 45, round: 28, priceSlim: 35, priceRound: 40 };
const SEED_PERSONNEL = ['Jun Dela Cruz', 'Roel Bautista', 'Mark Flores'];
const SEED_SETTINGS: Settings = {
  gcashName: 'Aqua Gel Station',
  gcashNumber: '0917-123-4567',
  qrCodeUrl: ''
};

export function StoreProvider({ children }: { children: ReactNode }) {
  
function getInitialState<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  if (val && val !== 'undefined') {
    try { return JSON.parse(val); } catch(e) {}
  }
  return defaultValue;
}

  const [session, _setSession] = useState<User | null>(() => getInitialState('ag_session', null));
  const [customers, _setCustomers] = useState<Customer[]>(() => getInitialState('ag_customers', SEED_CUSTOMERS));
  const [orders, _setOrders] = useState<Order[]>(() => getInitialState('ag_orders', SEED_ORDERS));
  const [inventory, _setInventory] = useState<Inventory>(() => getInitialState('ag_inventory', SEED_INVENTORY));
  const [personnel, _setPersonnel] = useState<string[]>(() => getInitialState('ag_personnel', SEED_PERSONNEL));
  const [stockLog, _setStockLog] = useState<{ msg: string; time: number }[]>(() => getInitialState('ag_stocklog', []));
  const [settings, _setSettings] = useState<Settings>(() => getInitialState('ag_settings', SEED_SETTINGS));

  
  useEffect(() => {
    // Cleanup any lingering 'undefined' in localStorage
    ['ag_session', 'ag_customers', 'ag_orders', 'ag_inventory', 'ag_personnel', 'ag_stocklog', 'ag_settings'].forEach(key => {
      if (localStorage.getItem(key) === 'undefined') {
        localStorage.removeItem(key);
      }
    });

    // Load state from local storage or seed initial data
    const sSession = localStorage.getItem('ag_session');
    if (sSession && sSession !== 'undefined') { try { _setSession(JSON.parse(sSession)); } catch (e) { console.error('Failed to parse sSession', e); } }

    const sCustomers = localStorage.getItem('ag_customers');
    if (sCustomers && sCustomers !== 'undefined') { try { _setCustomers(JSON.parse(sCustomers)); } catch (e) { console.error('Failed to parse sCustomers', e); } }
    else { _setCustomers(SEED_CUSTOMERS); localStorage.setItem('ag_customers', JSON.stringify(SEED_CUSTOMERS)); }

    const sOrders = localStorage.getItem('ag_orders');
    if (sOrders && sOrders !== 'undefined') { try { _setOrders(JSON.parse(sOrders)); } catch (e) { console.error('Failed to parse sOrders', e); } }
    else { _setOrders(SEED_ORDERS); localStorage.setItem('ag_orders', JSON.stringify(SEED_ORDERS)); }

    const sInv = localStorage.getItem('ag_inventory');
    if (sInv && sInv !== 'undefined') { try { _setInventory(JSON.parse(sInv)); } catch (e) { console.error('Failed to parse sInv', e); } }
    else { _setInventory(SEED_INVENTORY); localStorage.setItem('ag_inventory', JSON.stringify(SEED_INVENTORY)); }

    const sPers = localStorage.getItem('ag_personnel');
    if (sPers && sPers !== 'undefined') { try { _setPersonnel(JSON.parse(sPers)); } catch (e) { console.error('Failed to parse sPers', e); } }
    else { _setPersonnel(SEED_PERSONNEL); localStorage.setItem('ag_personnel', JSON.stringify(SEED_PERSONNEL)); }

    const sLog = localStorage.getItem('ag_stocklog');
    if (sLog && sLog !== 'undefined') { try { _setStockLog(JSON.parse(sLog)); } catch (e) { console.error('Failed to parse sLog', e); } }
    
    const sSettings = localStorage.getItem('ag_settings');
    if (sSettings && sSettings !== 'undefined') { try { _setSettings(JSON.parse(sSettings)); } catch (e) { console.error('Failed to parse sSettings', e); } }
    else { _setSettings(SEED_SETTINGS); localStorage.setItem('ag_settings', JSON.stringify(SEED_SETTINGS)); }
    
    const syncState = (e: StorageEvent) => {
      if (e.key === 'ag_session' && e.newValue && e.newValue !== 'undefined') { try { _setSession(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_session', e); } }
      if (e.key === 'ag_customers' && e.newValue && e.newValue !== 'undefined') { try { _setCustomers(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_customers', e); } }
      if (e.key === 'ag_orders' && e.newValue && e.newValue !== 'undefined') { try { _setOrders(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_orders', e); } }
      if (e.key === 'ag_inventory' && e.newValue && e.newValue !== 'undefined') { try { _setInventory(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_inventory', e); } }
      if (e.key === 'ag_personnel' && e.newValue && e.newValue !== 'undefined') { try { _setPersonnel(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_personnel', e); } }
      if (e.key === 'ag_stocklog' && e.newValue && e.newValue !== 'undefined') { try { _setStockLog(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_stocklog', e); } }
      if (e.key === 'ag_settings' && e.newValue && e.newValue !== 'undefined') { try { _setSettings(JSON.parse(e.newValue)); } catch (e) { console.error('Failed to parse ag_settings', e); } }
    };

    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, []);

  const setSession = (s: User | null) => { _setSession(s); localStorage.setItem('ag_session', JSON.stringify(s || {})); };
  const setCustomers = (c: Customer[]) => { _setCustomers(c); localStorage.setItem('ag_customers', JSON.stringify(c)); };
  const setOrders = (o: Order[]) => { _setOrders(o); localStorage.setItem('ag_orders', JSON.stringify(o)); };
  const setInventory = (i: Inventory) => { _setInventory(i); localStorage.setItem('ag_inventory', JSON.stringify(i)); };
  const setPersonnel = (p: string[]) => { _setPersonnel(p); localStorage.setItem('ag_personnel', JSON.stringify(p)); };
  const setStockLog = (l: { msg: string; time: number }[]) => { _setStockLog(l); localStorage.setItem('ag_stocklog', JSON.stringify(l)); };
  const setSettings = (s: Settings) => { _setSettings(s); localStorage.setItem('ag_settings', JSON.stringify(s)); };

  const updateCustomerBalance = (customerId: string, amountChange: number) => {
    const newCustomers = customers.map(c => 
      c.id === customerId ? { ...c, unpaid: Math.max(0, c.unpaid + amountChange) } : c
    );
    setCustomers(newCustomers);
  };

  const customersWithLoyalty = React.useMemo(() => {
    return customers.map(c => {
      const deliveredQty = orders
        .filter(o => o.customerId === c.id && o.status === 'Delivered')
        .reduce((sum, o) => sum + o.qty, 0);
      return {
        ...c,
        totalGallons: deliveredQty,
        isLoyal: deliveredQty >= 50
      };
    });
  }, [customers, orders]);

  return (
    <StoreContext.Provider value={{
      session, setSession,
      customers: customersWithLoyalty, setCustomers,
      orders, setOrders,
      inventory, setInventory,
      personnel, setPersonnel,
      stockLog, setStockLog,
      settings, setSettings,
      updateCustomerBalance,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
