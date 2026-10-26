import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { doc, onSnapshot, setDoc, setLogLevel, collection, QuerySnapshot, DocumentData } from 'firebase/firestore';
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
  note?: string;
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
  deliveryNotes?: string;
  paidDate?: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  type: 'slim' | 'round';
  qty: number;
  
  scheduleType?: 'interval' | 'weekly' | 'exact';
  intervalDays?: number;
  weeklyDays?: number[];
  exactDate?: number;
  
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
  discountSlim?: number;
  discountSlimValidUntil?: number;
  discountRound?: number;
  discountRoundValidUntil?: number;
}

export interface Settings {
  gcashName: string;
  gcashNumber: string;
  qrCodeUrl: string;
}

interface StoreContextType {
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const [customers, _setCustomers] = useState<Customer[]>(() => getInitialState('ag_customers', SEED_CUSTOMERS));
  const [orders, _setOrders] = useState<Order[]>(() => getInitialState('ag_orders', SEED_ORDERS));
  const [subscriptions, _setSubscriptions] = useState<Subscription[]>(() => getInitialState('ag_subscriptions', []));
  const [inventory, _setInventory] = useState<Inventory>(() => getInitialState('ag_inventory', SEED_INVENTORY));
  const [personnel, _setPersonnel] = useState<string[]>(() => getInitialState('ag_personnel', SEED_PERSONNEL));
  const [stockLog, _setStockLog] = useState<{ msg: string; time: number }[]>(() => getInitialState('ag_stocklog', SEED_STOCKLOG));
  const [settings, _setSettings] = useState<Settings>(() => getInitialState('ag_settings', SEED_SETTINGS));
  const [quotaWarning, setQuotaWarning] = useState<boolean>(false);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  const customersRef = useRef(customers);
  const ordersRef = useRef(orders);
  const subscriptionsRef = useRef(subscriptions);
  const inventoryRef = useRef(inventory);
  const personnelRef = useRef(personnel);
  const stockLogRef = useRef(stockLog);
  const settingsRef = useRef(settings);

  useEffect(() => {
    customersRef.current = customers;
    ordersRef.current = orders;
    subscriptionsRef.current = subscriptions;
    inventoryRef.current = inventory;
    personnelRef.current = personnel;
    stockLogRef.current = stockLog;
    settingsRef.current = settings;
    
    // One-time migration of customers to collection
    customers.forEach(customer => {
        const { id, ...data } = customer;
        safeSetDoc(doc(db, 'customers', id), data);
    });
  }, [customers, orders, subscriptions, inventory, personnel, stockLog, settings]);

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

    let lastFirestoreSync = 0;
    const syncServerBackup = (key: string, value: any) => {
      fetch(`/api/store/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cleanData(value) })
      }).catch(() => {});
    };

    // Firestore real-time snapshots with auto-initialization and cross-device sync
    const unsubCustomers = onSnapshot(collection(db, 'customers'), 
      (snapshot: QuerySnapshot<DocumentData>) => { 
        const val: Customer[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        lastFirestoreSync = Date.now();
        setLoading(false);
        if (JSON.stringify(val) !== JSON.stringify(customersRef.current)) {
          if (val.length === 0 && customersRef.current.length > 0) return;
          _setCustomers(val); 
          localStorage.setItem('ag_customers', JSON.stringify(val)); 
          syncServerBackup('customers', val);
        }
      },
      (err: any) => { 
        console.error("Firestore customers sync error:", err);
        setLoading(false);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubOrders = onSnapshot(doc(db, 'store', 'orders'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(ordersRef.current)) {
            _setOrders(val); 
            localStorage.setItem('ag_orders', JSON.stringify(val)); 
            syncServerBackup('orders', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'orders'), { value: cleanData(SEED_ORDERS), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore orders sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubSubscriptions = onSnapshot(doc(db, 'store', 'subscriptions'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(subscriptionsRef.current)) {
            _setSubscriptions(val); 
            localStorage.setItem('ag_subscriptions', JSON.stringify(val)); 
            syncServerBackup('subscriptions', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'subscriptions'), { value: cleanData([]), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore subscriptions sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubInventory = onSnapshot(doc(db, 'store', 'inventory'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(inventoryRef.current)) {
            _setInventory(val); 
            localStorage.setItem('ag_inventory', JSON.stringify(val)); 
            syncServerBackup('inventory', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'inventory'), { value: cleanData(SEED_INVENTORY), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore inventory sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubPersonnel = onSnapshot(doc(db, 'store', 'personnel'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(personnelRef.current)) {
            _setPersonnel(val); 
            localStorage.setItem('ag_personnel', JSON.stringify(val)); 
            syncServerBackup('personnel', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'personnel'), { value: cleanData(SEED_PERSONNEL), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore personnel sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubStockLog = onSnapshot(doc(db, 'store', 'stocklog'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(stockLogRef.current)) {
            _setStockLog(val); 
            localStorage.setItem('ag_stocklog', JSON.stringify(val)); 
            syncServerBackup('stocklog', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'stocklog'), { value: cleanData(SEED_STOCKLOG), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore stocklog sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubSettings = onSnapshot(doc(db, 'store', 'settings'), 
      (d) => { 
        if (d.exists() && d.data()?.value) { 
          const val = d.data().value;
          lastFirestoreSync = Date.now();
          if (JSON.stringify(val) !== JSON.stringify(settingsRef.current)) {
            _setSettings(val); 
            localStorage.setItem('ag_settings', JSON.stringify(val)); 
            syncServerBackup('settings', val);
          }
        } else if (!d.exists()) {
          safeSetDoc(doc(db, 'store', 'settings'), { value: cleanData(SEED_SETTINGS), updatedAt: Date.now() });
        }
      },
      (err: any) => { 
        console.error("Firestore settings sync error:", err);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );

    // Fallback polling for networks where Firestore direct WebSockets/LongPolling are blocked
    const pollInterval = setInterval(async () => {
      // If Firestore has delivered live events recently, let Firestore lead real-time push
      if (Date.now() - lastFirestoreSync < 5000) return;

      const keys = ['customers', 'orders', 'subscriptions', 'inventory', 'personnel', 'stocklog', 'settings'];
      for (const key of keys) {
        try {
          const res = await fetch(`/api/store/${key}`);
          const json = await res.json();
          if (json && json.value !== null) {
            const remoteVal = json.value;
            const localVal = localStorage.getItem('ag_' + key);
            const parsedLocal = localVal && localVal !== 'undefined' ? JSON.parse(localVal) : null;
            if (JSON.stringify(remoteVal) !== JSON.stringify(parsedLocal)) {
              localStorage.setItem('ag_' + key, JSON.stringify(remoteVal));
              switch (key) {
                case 'customers': _setCustomers(remoteVal); break;
                case 'orders': _setOrders(remoteVal); break;
                case 'subscriptions': _setSubscriptions(remoteVal); break;
                case 'inventory': _setInventory(remoteVal); break;
                case 'personnel': _setPersonnel(remoteVal); break;
                case 'stocklog': _setStockLog(remoteVal); break;
                case 'settings': _setSettings(remoteVal); break;
              }
            }
          }
        } catch (e) {}
      }
    }, 2000);

    return () => {
      unsubCustomers(); unsubOrders(); unsubSubscriptions(); unsubInventory(); unsubPersonnel(); unsubStockLog(); unsubSettings();
      window.removeEventListener('storage', handleStorage);
      syncChannelRef.current?.close();
      clearInterval(pollInterval);
    };
  }, []);

  const cleanData = (data: any) => JSON.parse(JSON.stringify(data));
  const setSession = (s: User | null) => { _setSession(s); localStorage.setItem('ag_session', JSON.stringify(s)); };
  
  const broadcastAndSave = (key: string, data: any) => {
    try {
      localStorage.setItem('ag_' + key, JSON.stringify(data));
      syncChannelRef.current?.postMessage({ type: key, data });
      fetch(`/api/store/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cleanData(data) })
      }).catch(() => {});
    } catch (e) {}
  };

  const isQuotaExhaustedRef = useRef<boolean>(false);
  useEffect(() => {
    isQuotaExhaustedRef.current = quotaWarning;
  }, [quotaWarning]);

  const safeSetDoc = (docRef: any, data: any) => {
    if (isQuotaExhaustedRef.current) return;
    setDoc(docRef, data).catch(err => {
      console.error("Firestore write error:", err);
      if (err?.code === 'resource-exhausted') {
        isQuotaExhaustedRef.current = true;
        setQuotaWarning(true);
      }
    });
  };

  const setCustomers = async (c: Customer[]) => { 
    _setCustomers(c); 
    broadcastAndSave('customers', c);
    // Backward compatibility: keep updating the single document
    await safeSetDoc(doc(db, 'store', 'customers'), { value: cleanData(c), updatedAt: Date.now() }); 
    // Migrate to collections
    await Promise.all(c.map(customer => {
        const { id, ...data } = customer;
        return safeSetDoc(doc(db, 'customers', id), data);
    }));
  };
  const setOrders = (o: Order[] | ((prev: Order[]) => Order[])) => {
    _setOrders(prev => {
        const next = typeof o === 'function' ? o(prev) : o;
        broadcastAndSave('orders', next);
        safeSetDoc(doc(db, 'store', 'orders'), { value: cleanData(next), updatedAt: Date.now() }); 
        return next;
    });
  };
  const setSubscriptions = (subs: Subscription[]) => {
    _setSubscriptions(subs);
    broadcastAndSave('subscriptions', subs);
    safeSetDoc(doc(db, 'store', 'subscriptions'), { value: cleanData(subs), updatedAt: Date.now() });
  };
  const setInventory = (i: Inventory) => { 
    _setInventory(i); 
    broadcastAndSave('inventory', i);
    safeSetDoc(doc(db, 'store', 'inventory'), { value: cleanData(i), updatedAt: Date.now() }); 
  };
  const setPersonnel = (p: string[]) => { 
    _setPersonnel(p); 
    broadcastAndSave('personnel', p);
    safeSetDoc(doc(db, 'store', 'personnel'), { value: cleanData(p) }); 
  };
  const setStockLog = (l: { msg: string; time: number }[]) => { 
    _setStockLog(l); 
    broadcastAndSave('stocklog', l);
    safeSetDoc(doc(db, 'store', 'stocklog'), { value: cleanData(l), updatedAt: Date.now() }); 
  };
  const setSettings = (s: Settings) => { 
    _setSettings(s); 
    broadcastAndSave('settings', s);
    safeSetDoc(doc(db, 'store', 'settings'), { value: cleanData(s), updatedAt: Date.now() }); 
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
      loading,
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

