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
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Claimed' | 'Cancelled';
  total: number;
  paid: boolean;
  date: number;
  personnel: string | null;
  address: string | null;
  containerReturn: boolean;
  deliveryNotes?: string;
  paidDate?: number;
  claimedAt?: number;
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
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  orders: Order[];
  setOrders: (orders: Order[] | ((prev: Order[]) => Order[])) => void;
  subscriptions: Subscription[];
  setSubscriptions: (subs: Subscription[] | ((prev: Subscription[]) => Subscription[])) => void;
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

export function cleanData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  return JSON.parse(JSON.stringify(data));
}

export function mergeOrders(incoming: Order[], current: Order[]): Order[] {
  const map = new Map<string, Order>();
  for (const o of current) {
    if (o && o.id) map.set(o.id, o);
  }
  for (const o of incoming) {
    if (o && o.id) {
      const prev = map.get(o.id);
      map.set(o.id, prev ? { ...prev, ...o } : o);
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
}

export function mergeCustomers(incoming: Customer[], current: Customer[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const c of current) {
    if (c && c.id) map.set(c.id, c);
  }
  for (const c of incoming) {
    if (c && c.id) {
      const prev = map.get(c.id);
      map.set(c.id, prev ? { ...prev, ...c } : c);
    }
  }
  return Array.from(map.values());
}

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

    // 1. Initial shared database fetch on startup
    fetch('/api/store')
      .then(res => res.json())
      .then(json => {
        if (json?.store) {
          const s = json.store;
          if (s.customers && JSON.stringify(s.customers) !== JSON.stringify(customersRef.current)) {
            _setCustomers(s.customers);
            localStorage.setItem('ag_customers', JSON.stringify(s.customers));
          }
          if (s.orders && JSON.stringify(s.orders) !== JSON.stringify(ordersRef.current)) {
            _setOrders(s.orders);
            localStorage.setItem('ag_orders', JSON.stringify(s.orders));
          }
          if (s.subscriptions && JSON.stringify(s.subscriptions) !== JSON.stringify(subscriptionsRef.current)) {
            _setSubscriptions(s.subscriptions);
            localStorage.setItem('ag_subscriptions', JSON.stringify(s.subscriptions));
          }
          if (s.inventory) {
            _setInventory(s.inventory);
            localStorage.setItem('ag_inventory', JSON.stringify(s.inventory));
          }
          if (s.personnel) {
            _setPersonnel(s.personnel);
            localStorage.setItem('ag_personnel', JSON.stringify(s.personnel));
          }
          if (s.stocklog) {
            _setStockLog(s.stocklog);
            localStorage.setItem('ag_stocklog', JSON.stringify(s.stocklog));
          }
          if (s.settings) {
            _setSettings(s.settings);
            localStorage.setItem('ag_settings', JSON.stringify(s.settings));
          }
          setLoading(false);
        }
      })
      .catch(() => {});

    // 2. Real-time Cross-Device Server-Sent Events (SSE) listener
    let sseSource: EventSource | null = null;
    try {
      sseSource = new EventSource('/api/sync/events');
      sseSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload) return;
          if (payload.type === 'init' && payload.data) {
            const s = payload.data;
            if (s.customers?.length) { _setCustomers(s.customers); localStorage.setItem('ag_customers', JSON.stringify(s.customers)); }
            if (s.orders?.length) { _setOrders(s.orders); localStorage.setItem('ag_orders', JSON.stringify(s.orders)); }
            if (s.subscriptions) { _setSubscriptions(s.subscriptions); localStorage.setItem('ag_subscriptions', JSON.stringify(s.subscriptions)); }
            if (s.inventory) { _setInventory(s.inventory); localStorage.setItem('ag_inventory', JSON.stringify(s.inventory)); }
            if (s.personnel) { _setPersonnel(s.personnel); localStorage.setItem('ag_personnel', JSON.stringify(s.personnel)); }
            if (s.stocklog) { _setStockLog(s.stocklog); localStorage.setItem('ag_stocklog', JSON.stringify(s.stocklog)); }
            if (s.settings) { _setSettings(s.settings); localStorage.setItem('ag_settings', JSON.stringify(s.settings)); }
            setLoading(false);
          } else if (payload.type && payload.data !== undefined) {
            switch (payload.type) {
              case 'customers': _setCustomers(payload.data); localStorage.setItem('ag_customers', JSON.stringify(payload.data)); break;
              case 'orders': _setOrders(payload.data); localStorage.setItem('ag_orders', JSON.stringify(payload.data)); break;
              case 'subscriptions': _setSubscriptions(payload.data); localStorage.setItem('ag_subscriptions', JSON.stringify(payload.data)); break;
              case 'inventory': _setInventory(payload.data); localStorage.setItem('ag_inventory', JSON.stringify(payload.data)); break;
              case 'personnel': _setPersonnel(payload.data); localStorage.setItem('ag_personnel', JSON.stringify(payload.data)); break;
              case 'stocklog': _setStockLog(payload.data); localStorage.setItem('ag_stocklog', JSON.stringify(payload.data)); break;
              case 'settings': _setSettings(payload.data); localStorage.setItem('ag_settings', JSON.stringify(payload.data)); break;
            }
          }
        } catch (e) {}
      };
    } catch (e) {}

    let lastFirestoreSync = 0;

    // Firestore real-time snapshots with auto-initialization and cross-device sync
    const unsubCustomers = onSnapshot(collection(db, 'customers'), 
      (snapshot: QuerySnapshot<DocumentData>) => { 
        if (snapshot.empty) return;
        const val: Customer[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        lastFirestoreSync = Date.now();
        setLoading(false);
        const merged = mergeCustomers(val, customersRef.current);
        if (JSON.stringify(merged) !== JSON.stringify(customersRef.current)) {
          _setCustomers(merged); 
          localStorage.setItem('ag_customers', JSON.stringify(merged)); 
          syncServerBackup('customers', merged);
        }
      },
      (err: any) => { 
        setLoading(false);
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubStoreCustomers = onSnapshot(doc(db, 'store', 'customers'),
      (d) => {
        if (d.exists() && Array.isArray(d.data()?.value) && d.data().value.length > 0) {
          const val: Customer[] = d.data().value;
          lastFirestoreSync = Date.now();
          setLoading(false);
          const merged = mergeCustomers(val, customersRef.current);
          if (JSON.stringify(merged) !== JSON.stringify(customersRef.current)) {
            _setCustomers(merged);
            localStorage.setItem('ag_customers', JSON.stringify(merged));
            syncServerBackup('customers', merged);
          }
        }
      },
      (err: any) => {
        if (err?.code === 'resource-exhausted') setQuotaWarning(true);
      }
    );
    const unsubOrders = onSnapshot(collection(db, 'orders'), 
      (snapshot: QuerySnapshot<DocumentData>) => { 
        if (snapshot.empty) return;
        const val: Order[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        lastFirestoreSync = Date.now();
        const merged = mergeOrders(val, ordersRef.current);
        if (JSON.stringify(merged) !== JSON.stringify(ordersRef.current)) {
          _setOrders(merged); 
          localStorage.setItem('ag_orders', JSON.stringify(merged)); 
          syncServerBackup('orders', merged);
        }
      },
      (err: any) => { 
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );
    const unsubStoreOrders = onSnapshot(doc(db, 'store', 'orders'),
      (d) => {
        if (d.exists() && Array.isArray(d.data()?.value) && d.data().value.length > 0) {
          const val: Order[] = d.data().value;
          lastFirestoreSync = Date.now();
          const merged = mergeOrders(val, ordersRef.current);
          if (JSON.stringify(merged) !== JSON.stringify(ordersRef.current)) {
            _setOrders(merged);
            localStorage.setItem('ag_orders', JSON.stringify(merged));
            syncServerBackup('orders', merged);
          }
        }
      },
      (err: any) => {
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
        if (err?.code === 'resource-exhausted') setQuotaWarning(true); 
      }
    );

    // 3. Periodic real-time poll fallback across devices
    const pollInterval = setInterval(() => {
      fetch('/api/store')
        .then(res => res.json())
        .then(json => {
          if (json?.store) {
            const s = json.store;
            if (Array.isArray(s.orders) && s.orders.length > 0) {
              const merged = mergeOrders(s.orders, ordersRef.current);
              if (JSON.stringify(merged) !== JSON.stringify(ordersRef.current)) {
                _setOrders(merged);
                localStorage.setItem('ag_orders', JSON.stringify(merged));
              }
            }
            if (Array.isArray(s.customers) && s.customers.length > 0) {
              const merged = mergeCustomers(s.customers, customersRef.current);
              if (JSON.stringify(merged) !== JSON.stringify(customersRef.current)) {
                _setCustomers(merged);
                localStorage.setItem('ag_customers', JSON.stringify(merged));
              }
            }
            if (s.inventory && JSON.stringify(s.inventory) !== JSON.stringify(inventoryRef.current)) {
              _setInventory(s.inventory);
              localStorage.setItem('ag_inventory', JSON.stringify(s.inventory));
            }
            if (s.settings && JSON.stringify(s.settings) !== JSON.stringify(settingsRef.current)) {
              _setSettings(s.settings);
              localStorage.setItem('ag_settings', JSON.stringify(s.settings));
            }
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      unsubCustomers(); unsubStoreCustomers(); unsubOrders(); unsubStoreOrders(); unsubSubscriptions(); unsubInventory(); unsubPersonnel(); unsubStockLog(); unsubSettings();
      window.removeEventListener('storage', handleStorage);
      syncChannelRef.current?.close();
      sseSource?.close();
      clearInterval(pollInterval);
    };
  }, []);

  const syncServerBackup = (key: string, value: any) => {
    fetch(`/api/store/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: cleanData(value) })
    }).catch(() => {});
  };
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
    try {
      setDoc(docRef, cleanData(data)).catch(err => {
        if (err?.code === 'resource-exhausted') {
          isQuotaExhaustedRef.current = true;
          setQuotaWarning(true);
        }
      });
    } catch (e) {}
  };

  const setCustomers = (updater: Customer[] | ((prev: Customer[]) => Customer[])) => { 
    _setCustomers(prev => {
      const c = typeof updater === 'function' ? updater(prev) : updater;
      broadcastAndSave('customers', c);
      safeSetDoc(doc(db, 'store', 'customers'), { value: cleanData(c), updatedAt: Date.now() }); 
      
      const changed = c.filter(item => {
        const prevItem = prev.find(p => p.id === item.id);
        return !prevItem || JSON.stringify(cleanData(prevItem)) !== JSON.stringify(cleanData(item));
      });
      for (const ch of changed) {
        if (ch?.id) safeSetDoc(doc(db, 'customers', ch.id), cleanData(ch));
      }
      return c;
    });
  };

  const setOrders = (updater: Order[] | ((prev: Order[]) => Order[])) => { 
    _setOrders(prev => {
      const o = typeof updater === 'function' ? updater(prev) : updater;
      broadcastAndSave('orders', o);
      syncServerBackup('orders', o);
      safeSetDoc(doc(db, 'store', 'orders'), { value: cleanData(o), updatedAt: Date.now() });

      const changed = o.filter(item => {
        const prevItem = prev.find(p => p.id === item.id);
        return !prevItem || JSON.stringify(cleanData(prevItem)) !== JSON.stringify(cleanData(item));
      });
      for (const ch of changed) {
        if (ch?.id) safeSetDoc(doc(db, 'orders', ch.id), cleanData(ch));
      }
      return o;
    });
  };
  const setSubscriptions = (updater: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    _setSubscriptions(prev => {
      const subs = typeof updater === 'function' ? updater(prev) : updater;
      broadcastAndSave('subscriptions', subs);
      safeSetDoc(doc(db, 'store', 'subscriptions'), { value: cleanData(subs), updatedAt: Date.now() });
      return subs;
    });
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

