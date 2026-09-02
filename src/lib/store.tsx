import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { doc, onSnapshot, setDoc, setLogLevel } from 'firebase/firestore';
import { db } from './firebase';

// Suppress excessive console debug logs from Firestore internal backoff
try {
  setLogLevel('silent');
} catch (e) {}

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
  profilePictureUrl?: string;
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

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  type: 'slim' | 'round';
  qty: number;
  intervalDays: number;
  nextDeliveryDate: number;
  address: string;
  deliveryNotes?: string;
  active: boolean;
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
  subscriptions: Subscription[];
  setSubscriptions: (subs: Subscription[]) => void;
  inventory: Inventory;
  setInventory: (inventory: Inventory) => void;
  personnel: string[];
  setPersonnel: (personnel: string[]) => void;
  stockLog: { msg: string; time: number }[];
  setStockLog: (log: { msg: string; time: number }[]) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  updateCustomerBalance: (customerId: string, amountChange: number) => void;
  quotaWarning: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

import { 
  SEED_CUSTOMERS, 
  SEED_ORDERS, 
  SEED_INVENTORY, 
  SEED_PERSONNEL, 
  SEED_STOCKLOG, 
  SEED_SETTINGS 
} from './seeds';

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
  const [subscriptions, _setSubscriptions] = useState<Subscription[]>(() => getInitialState('ag_subscriptions', []));
  const [inventory, _setInventory] = useState<Inventory>(() => getInitialState('ag_inventory', SEED_INVENTORY));
  const [personnel, _setPersonnel] = useState<string[]>(() => getInitialState('ag_personnel', SEED_PERSONNEL));
  const [stockLog, _setStockLog] = useState<{ msg: string; time: number }[]>(() => getInitialState('ag_stocklog', SEED_STOCKLOG));
  const [settings, _setSettings] = useState<Settings>(() => getInitialState('ag_settings', SEED_SETTINGS));
  const [quotaWarning, setQuotaWarning] = useState<boolean>(false);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Multi-tab real-time sync via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('aquagel_sync');
        syncChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (!event.data || !event.data.type) return;
          switch (event.data.type) {
            case 'customers': _setCustomers(event.data.data); break;
            case 'orders': _setOrders(event.data.data); break;
            case 'subscriptions': _setSubscriptions(event.data.data); break;
            case 'inventory': _setInventory(event.data.data); break;
            case 'personnel': _setPersonnel(event.data.data); break;
            case 'stocklog': _setStockLog(event.data.data); break;
            case 'settings': _setSettings(event.data.data); break;
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel error:", e);
      }
    }

    // Storage event sync fallback
    const handleStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        const val = JSON.parse(e.newValue);
        if (e.key === 'ag_customers') _setCustomers(val);
        else if (e.key === 'ag_orders') _setOrders(val);
        else if (e.key === 'ag_subscriptions') _setSubscriptions(val);
        else if (e.key === 'ag_inventory') _setInventory(val);
        else if (e.key === 'ag_personnel') _setPersonnel(val);
        else if (e.key === 'ag_stocklog') _setStockLog(val);
        else if (e.key === 'ag_settings') _setSettings(val);
      } catch (err) {}
    };
    window.addEventListener('storage', handleStorage);

    // Firestore real-time snapshots
    const unsubCustomers = onSnapshot(doc(db, 'store', 'customers'), 
      (d) => { if (d.exists() && d.data().value) { _setCustomers(d.data().value); localStorage.setItem('ag_customers', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubOrders = onSnapshot(doc(db, 'store', 'orders'), 
      (d) => { if (d.exists() && d.data().value) { _setOrders(d.data().value); localStorage.setItem('ag_orders', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubSubscriptions = onSnapshot(doc(db, 'store', 'subscriptions'), 
      (d) => { if (d.exists() && d.data().value) { _setSubscriptions(d.data().value); localStorage.setItem('ag_subscriptions', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubInventory = onSnapshot(doc(db, 'store', 'inventory'), 
      (d) => { if (d.exists() && d.data().value) { _setInventory(d.data().value); localStorage.setItem('ag_inventory', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubPersonnel = onSnapshot(doc(db, 'store', 'personnel'), 
      (d) => { if (d.exists() && d.data().value) { _setPersonnel(d.data().value); localStorage.setItem('ag_personnel', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubStockLog = onSnapshot(doc(db, 'store', 'stocklog'), 
      (d) => { if (d.exists() && d.data().value) { _setStockLog(d.data().value); localStorage.setItem('ag_stocklog', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );
    const unsubSettings = onSnapshot(doc(db, 'store', 'settings'), 
      (d) => { if (d.exists() && d.data().value) { _setSettings(d.data().value); localStorage.setItem('ag_settings', JSON.stringify(d.data().value)); } },
      (err: any) => { if (err?.code === 'resource-exhausted') setQuotaWarning(true); }
    );

    return () => {
      unsubCustomers(); unsubOrders(); unsubSubscriptions(); unsubInventory(); unsubPersonnel(); unsubStockLog(); unsubSettings();
      window.removeEventListener('storage', handleStorage);
      syncChannelRef.current?.close();
    };
  }, []);

  const cleanData = (data: any) => JSON.parse(JSON.stringify(data));
  const setSession = (s: User | null) => { _setSession(s); localStorage.setItem('ag_session', JSON.stringify(s)); };
  
  const broadcastAndSave = (key: string, data: any) => {
    try {
      localStorage.setItem('ag_' + key, JSON.stringify(data));
      syncChannelRef.current?.postMessage({ type: key, data });
    } catch (e) {}
  };

  const isQuotaExhaustedRef = useRef<boolean>(false);
  useEffect(() => {
    isQuotaExhaustedRef.current = quotaWarning;
  }, [quotaWarning]);

  const safeSetDoc = (docRef: any, data: any) => {
    if (isQuotaExhaustedRef.current) return;
    setDoc(docRef, data).catch(err => {
      if (err?.code === 'resource-exhausted') {
        isQuotaExhaustedRef.current = true;
        setQuotaWarning(true);
      }
    });
  };

  const setCustomers = (c: Customer[]) => { 
    _setCustomers(c); 
    broadcastAndSave('customers', c);
    safeSetDoc(doc(db, 'store', 'customers'), { value: cleanData(c) }); 
  };
  const setOrders = (o: Order[]) => { 
    _setOrders(o); 
    broadcastAndSave('orders', o);
    safeSetDoc(doc(db, 'store', 'orders'), { value: cleanData(o) }); 
  };
  const setSubscriptions = (subs: Subscription[]) => {
    _setSubscriptions(subs);
    broadcastAndSave('subscriptions', subs);
    safeSetDoc(doc(db, 'store', 'subscriptions'), { value: cleanData(subs) });
  };
  const setInventory = (i: Inventory) => { 
    _setInventory(i); 
    broadcastAndSave('inventory', i);
    safeSetDoc(doc(db, 'store', 'inventory'), { value: cleanData(i) }); 
  };
  const setPersonnel = (p: string[]) => { 
    _setPersonnel(p); 
    broadcastAndSave('personnel', p);
    safeSetDoc(doc(db, 'store', 'personnel'), { value: cleanData(p) }); 
  };
  const setStockLog = (l: { msg: string; time: number }[]) => { 
    _setStockLog(l); 
    broadcastAndSave('stocklog', l);
    safeSetDoc(doc(db, 'store', 'stocklog'), { value: cleanData(l) }); 
  };
  const setSettings = (s: Settings) => { 
    _setSettings(s); 
    broadcastAndSave('settings', s);
    safeSetDoc(doc(db, 'store', 'settings'), { value: cleanData(s) }); 
  };

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
      subscriptions, setSubscriptions,
      inventory, setInventory,
      personnel, setPersonnel,
      stockLog, setStockLog,
      settings, setSettings,
      updateCustomerBalance,
      quotaWarning,
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

