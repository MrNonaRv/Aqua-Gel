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
  paymentMethod?: 'cash' | 'gcash' | 'paymongo';
  status: 'Pending' | 'Out for Delivery' | 'Delivered';
  total: number;
  paid: boolean;
  date: number;
  personnel: string | null;
  address: string | null;
  containerReturn: boolean;
}

export interface Inventory {
  slim: number;
  round: number;
  priceSlim: number;
  priceRound: number;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, _setSession] = useState<User | null>(null);
  const [customers, _setCustomers] = useState<Customer[]>([]);
  const [orders, _setOrders] = useState<Order[]>([]);
  const [inventory, _setInventory] = useState<Inventory>(SEED_INVENTORY);
  const [personnel, _setPersonnel] = useState<string[]>([]);
  const [stockLog, _setStockLog] = useState<{ msg: string; time: number }[]>([]);

  useEffect(() => {
    // Load state from local storage or seed initial data
    const sSession = localStorage.getItem('ag_session');
    if (sSession) _setSession(JSON.parse(sSession));

    const sCustomers = localStorage.getItem('ag_customers');
    if (sCustomers) _setCustomers(JSON.parse(sCustomers));
    else { _setCustomers(SEED_CUSTOMERS); localStorage.setItem('ag_customers', JSON.stringify(SEED_CUSTOMERS)); }

    const sOrders = localStorage.getItem('ag_orders');
    if (sOrders) _setOrders(JSON.parse(sOrders));
    else { _setOrders(SEED_ORDERS); localStorage.setItem('ag_orders', JSON.stringify(SEED_ORDERS)); }

    const sInv = localStorage.getItem('ag_inventory');
    if (sInv) _setInventory(JSON.parse(sInv));
    else { _setInventory(SEED_INVENTORY); localStorage.setItem('ag_inventory', JSON.stringify(SEED_INVENTORY)); }

    const sPers = localStorage.getItem('ag_personnel');
    if (sPers) _setPersonnel(JSON.parse(sPers));
    else { _setPersonnel(SEED_PERSONNEL); localStorage.setItem('ag_personnel', JSON.stringify(SEED_PERSONNEL)); }

    const sLog = localStorage.getItem('ag_stocklog');
    if (sLog) _setStockLog(JSON.parse(sLog));
    
    const syncState = (e: StorageEvent) => {
      if (e.key === 'ag_session' && e.newValue) _setSession(JSON.parse(e.newValue));
      if (e.key === 'ag_customers' && e.newValue) _setCustomers(JSON.parse(e.newValue));
      if (e.key === 'ag_orders' && e.newValue) _setOrders(JSON.parse(e.newValue));
      if (e.key === 'ag_inventory' && e.newValue) _setInventory(JSON.parse(e.newValue));
      if (e.key === 'ag_personnel' && e.newValue) _setPersonnel(JSON.parse(e.newValue));
      if (e.key === 'ag_stocklog' && e.newValue) _setStockLog(JSON.parse(e.newValue));
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
