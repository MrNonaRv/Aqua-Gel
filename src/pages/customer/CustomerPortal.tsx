import { useState, useEffect } from 'react';
import { useStore, Order } from '../../lib/store';
import { useCustomerNotifications } from '../../lib/notifications';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, User, Power, MapPin, Phone, Menu, X, CreditCard, HelpCircle, Mail, RefreshCw, AlertCircle, Clock, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlimGallonIcon, RoundGallonIcon } from '../../components/icons/Gallons';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/format';

export default function CustomerPortal() {
  useCustomerNotifications();
  const { session, setSession, inventory, setInventory, orders, setOrders, customers, setCustomers, settings, subscriptions, setSubscriptions } = useStore();
  
  useEffect(() => {
    // Notify customer about upcoming deliveries
    const myActiveSubs = subscriptions.filter(s => s.customerId === session?.id && s.active);
    const dueSubs = myActiveSubs.filter(s => s.nextDeliveryDate <= Date.now() + (24 * 60 * 60 * 1000)); // Due within 24 hours
    if (dueSubs.length > 0) {
      toast.info('Upcoming Delivery Reminder', {
        description: `You have ${dueSubs.length} recurring delivery scheduled for today/tomorrow.`,
        duration: 10000,
      });
    }
  }, [subscriptions.length, session?.id]);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'order' | 'myorders' | 'payments' | 'profile' | 'support'>('order');
  const [profileSubTab, setProfileSubTab] = useState<'details' | 'support'>('details');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Cancellation Modal State
  const [cancelModalData, setCancelModalData] = useState<{
    type: 'order' | 'subscription';
    id: string;
    title: string;
    description: string;
  } | null>(null);

  // Reactivation Modal State
  const [reactivateModalOrder, setReactivateModalOrder] = useState<Order | null>(null);

  const customer = customers.find(c => c.id === session?.id);

  // Order State
  const [selectedType, setSelectedType] = useState<'slim' | 'round'>('slim');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [address, setAddress] = useState(customer?.address || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubscription, setIsSubscription] = useState(false);
  const [scheduleType, setScheduleType] = useState<'interval' | 'weekly' | 'exact'>('interval');
  const [intervalDays, setIntervalDays] = useState(7);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [exactDate, setExactDate] = useState<string>('');
  const [orderSuccess, setOrderSuccess] = useState('');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editProfilePicUrl, setEditProfilePicUrl] = useState('');

  const handleEditProfileStart = () => {
    if (customer) {
      setEditPhone(customer.phone || '');
      setEditAddress(customer.address || '');
      setEditProfilePicUrl(customer.profilePictureUrl || '');
      setIsEditingProfile(true);
    }
  };

  const handleEditProfileSave = () => {
    if (customer) {
      setCustomers(customers.map(c => c.id === customer.id ? {
        ...c,
        phone: editPhone,
        address: editAddress,
        profilePictureUrl: editProfilePicUrl
      } : c));
      setIsEditingProfile(false);
      setAddress(editAddress); // Update default checkout address
    }
  };

  const handleLogout = () => {
    setSession(null);
    navigate('/');
  };

  const changeQty = (d: number) => {
    setQty(Math.max(1, qty + d));
  };

  const getUnitPrice = (type: 'slim' | 'round') => {
    const now = Date.now();
    if (type === 'slim') {
      if (inventory.discountSlim && inventory.discountSlimValidUntil && inventory.discountSlimValidUntil >= now) {
        return inventory.discountSlim;
      }
      return inventory.priceSlim;
    } else {
      if (inventory.discountRound && inventory.discountRoundValidUntil && inventory.discountRoundValidUntil >= now) {
        return inventory.discountRound;
      }
      return inventory.priceRound;
    }
  };

  const unitPrice = getUnitPrice(selectedType);
  const total = unitPrice * qty;

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  useEffect(() => {
    if (paymentProcessed) return;

    // Handle return from PayMongo
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get('payment_success');
    const orderId = params.get('order_id');

    if (isSuccess === 'true' && orderId) {
      if (orderId.startsWith('balance_')) {
        const custId = orderId.split('_')[1];
        // Wait until customers and orders are loaded from Firestore
        if (customers.length > 0) {
          const custExists = customers.some(c => c.id === custId);
          if (custExists) {
            setCustomers(customers.map(c => c.id === custId ? { ...c, unpaid: 0 } : c));
            setOrders(orders.map(o => (o.customerId === custId && !o.paid) ? { ...o, paid: true, paidDate: Date.now() } : o));
            setOrderSuccess('✅ Outstanding balance successfully paid via GCash!');
            setTab('payments');
            setPaymentProcessed(true);
            setTimeout(() => setOrderSuccess(''), 5000);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        return;
      }

      // Wait until orders are loaded from Firestore
      if (orders.length > 0) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          if (!order.paid) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, paid: true, paidDate: Date.now() } : o));
            setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, c.unpaid - order.total) } : c));
            setOrderSuccess(`✅ Payment successful via PayMongo! Order ${orderId} is now paid.`);
          }
          setTab('myorders');
          setPaymentProcessed(true);
          setTimeout(() => setOrderSuccess(''), 5000);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [customers, orders, paymentProcessed, setCustomers, setOrders]);

  
  const payOutstandingBalance = async () => {
    if (!customer || customer.unpaid <= 0) return;
    
    setIsProcessingPayment(true);
    try {
      const orderId = `balance_${customer.id}_${Date.now()}`;
      const response = await fetch('/api/paymongo/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: customer.unpaid,
          description: `Outstanding Balance Settlement`,
          orderId: orderId,
        }),
      });

      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to initialize payment gateway: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Payment initialization failed.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const placeOrder = async () => {
    const stock = inventory[selectedType];
    if (stock < qty) {
      alert(`Not enough ${selectedType} gallons in stock (${stock} available).`);
      return;
    }
    if (method === 'delivery' && !address.trim()) {
      alert('Please enter your delivery address.');
      return;
    }
    if (isSubscription && method === 'delivery') {
      if (scheduleType === 'weekly' && weeklyDays.length === 0) {
        alert('Please select at least one day of the week for your recurring delivery.');
        return;
      }
      if (scheduleType === 'exact' && !exactDate) {
        alert('Please select a specific calendar date for your scheduled delivery.');
        return;
      }
    }

    const orderId = 'o' + Date.now();

    if (paymentMethod === 'gcash') {
      setIsProcessingPayment(true);
      try {
        // Create pending unpaid order first
        const newOrder = {
          id: orderId,
          customerId: session!.id,
          customerName: session!.name,
          type: selectedType,
          qty,
          method,
          paymentMethod,
          status: 'Pending' as const,
          total,
          paid: false,
          date: Date.now(),
          personnel: null,
          address: method === 'delivery' ? address : null,
          containerReturn: false
        };

        setOrders(prev => [newOrder, ...prev]);
        setInventory({ ...inventory, [selectedType]: inventory[selectedType] - qty });
        if (customer) {
          setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: c.unpaid + total } : c));
        }

        // Call backend to create PayMongo checkout session
        const response = await fetch('/api/paymongo/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: total,
            description: `Refilling Order - ${qty}x ${selectedType} gallon(s)`,
            orderId: orderId,
          }),
        });

        const data = await response.json();
        
        if (data.checkoutUrl) {
          // Save the checkout URL to the order so it can be resumed
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, checkoutUrl: data.checkoutUrl } : o));

          window.location.href = data.checkoutUrl;
          setTab('myorders');
          return;
        } else {
          alert('Failed to initialize payment gateway: ' + (data.error || 'Unknown error'));
          // Revert order if gateway fails
          setOrders(prev => prev.filter(o => o.id !== orderId));
          setInventory({ ...inventory, [selectedType]: inventory[selectedType] + qty });
          if (customer) setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: Math.max(0, c.unpaid - total) } : c));
        }
      } catch (err) {
        console.error(err);
        alert('Network error. Please try again.');
        // Revert order
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setInventory({ ...inventory, [selectedType]: inventory[selectedType] + qty });
        if (customer) setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: Math.max(0, c.unpaid - total) } : c));
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }



    const newOrder = {
      id: orderId,
      customerId: session!.id,
      customerName: session!.name,
      type: selectedType,
      qty,
      method,
      paymentMethod,
      referenceNumber: undefined,
      status: 'Pending' as const,
      total,
      paid: false, // All manual payments are unpaid until verified/collected
      date: Date.now(),
      personnel: null,
      address: method === 'delivery' ? address : null,
      containerReturn: false,
      deliveryNotes: deliveryNotes.trim() || undefined
    };

    setOrders(prev => [newOrder, ...prev]);
    setInventory({ ...inventory, [selectedType]: inventory[selectedType] - qty });
    
    // Update unpaid balance
    if (customer) {
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: c.unpaid + total } : c));
    }

    if (isSubscription && method === 'delivery') {
      let nextDate = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);
      let successMsg = `✅ Order and Subscription placed! Deliveries scheduled every ${intervalDays} days.`;
      
      if (scheduleType === 'weekly' && weeklyDays.length > 0) {
        let d = new Date();
        d.setDate(d.getDate() + 1); // Start checking from tomorrow
        d.setHours(0,0,0,0);
        while (!weeklyDays.includes(d.getDay())) {
          d.setDate(d.getDate() + 1);
        }
        nextDate = d.getTime();
        successMsg = `✅ Order and Subscription placed! Scheduled for specific days of the week.`;
      } else if (scheduleType === 'exact' && exactDate) {
        nextDate = new Date(exactDate).getTime();
        successMsg = `✅ Order and scheduled delivery placed! Next delivery on ${new Date(nextDate).toLocaleDateString()}.`;
      }

      const newSub = {
        id: 'sub' + Date.now(),
        customerId: session!.id,
        customerName: session!.name,
        type: selectedType,
        qty,
        scheduleType,
        intervalDays,
        weeklyDays,
        exactDate: scheduleType === 'exact' ? new Date(exactDate).getTime() : undefined,
        nextDeliveryDate: nextDate,
        address: address,
        deliveryNotes: deliveryNotes.trim() || undefined,
        active: true
      };
      setSubscriptions([newSub, ...subscriptions]);
      setOrderSuccess(successMsg);
    } else {
      setOrderSuccess(`✅ Order placed successfully! Total: ₱${total}. Status: Pending.`);
    }

    setQty(1);
    setReferenceNumber('');
    setDeliveryNotes('');
    setIsSubscription(false);
    setTimeout(() => setOrderSuccess(''), 5000);
  };

  const handleOpenCancelModal = (type: 'order' | 'subscription', id: string, title: string, description: string) => {
    setCancelModalData({ type, id, title, description });
  };

  const handleExecuteCancel = () => {
    if (!cancelModalData) return;

    if (cancelModalData.type === 'order') {
      const order = orders.find(o => o.id === cancelModalData.id);
      if (!order || order.status === 'Cancelled') {
        setCancelModalData(null);
        return;
      }

      setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'Cancelled' } : o));
      setInventory({ ...inventory, [order.type]: inventory[order.type] + order.qty });
      
      if (!order.paid) {
        setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, (c.unpaid || 0) - order.total) } : c));
      }
      toast.success('Order Cancelled', {
        description: `Order #${order.id.slice(-6).toUpperCase()} has been cancelled.`
      });
    } else {
      setSubscriptions(subscriptions.map(s => s.id === cancelModalData.id ? { ...s, active: false } : s));
      toast.success('Subscription Cancelled', {
        description: 'You have unsubscribed from recurring deliveries. You can resubscribe anytime.'
      });
    }

    setCancelModalData(null);
  };

  const handleInitiateReactivate = (order: Order) => {
    setReactivateModalOrder(order);
  };

  const handleConfirmReactivateDirect = () => {
    if (!reactivateModalOrder) return;
    
    // Check inventory
    if (inventory[reactivateModalOrder.type] < reactivateModalOrder.qty) {
      toast.error('Insufficient Stock', {
        description: `Sorry, there are only ${inventory[reactivateModalOrder.type]} ${reactivateModalOrder.type} gallon(s) left in stock.`
      });
      return;
    }

    // Get current unit price and loyalty discount
    const currentPrice = getUnitPrice(reactivateModalOrder.type);
    const subtotal = reactivateModalOrder.qty * currentPrice;
    const isLoyal = customer?.isLoyal || false;
    const loyaltyDiscount = isLoyal ? subtotal * 0.02 : 0;
    const newTotal = Number(Math.max(0, subtotal - loyaltyDiscount).toFixed(2));

    const newOrder: Order = {
      id: 'o' + Date.now(),
      customerId: reactivateModalOrder.customerId,
      customerName: reactivateModalOrder.customerName,
      type: reactivateModalOrder.type,
      qty: reactivateModalOrder.qty,
      method: reactivateModalOrder.method,
      paymentMethod: reactivateModalOrder.paymentMethod || 'cash',
      status: 'Pending',
      subtotal: Number(subtotal.toFixed(2)),
      discountType: isLoyal ? 'percentage' : undefined,
      discountValue: isLoyal ? 2 : undefined,
      discountAmount: isLoyal ? Number(loyaltyDiscount.toFixed(2)) : undefined,
      total: newTotal,
      paid: false,
      date: Date.now(),
      personnel: null,
      address: reactivateModalOrder.address || customer?.address || null,
      containerReturn: false,
      deliveryNotes: reactivateModalOrder.deliveryNotes
    };

    setOrders([newOrder, ...orders]);
    setInventory({ ...inventory, [newOrder.type]: inventory[newOrder.type] - newOrder.qty });

    if (newOrder.paymentMethod === 'cash') {
      setCustomers(customers.map(c => c.id === newOrder.customerId ? { ...c, unpaid: (c.unpaid || 0) + newTotal } : c));
    }

    setReactivateModalOrder(null);
    setTab('myorders');
    toast.success('Order Reactivated!', {
      description: `Your order for ${newOrder.qty} ${newOrder.type} gallon(s) has been placed successfully.`
    });
  };

  const handleConfirmReactivateToCart = () => {
    if (!reactivateModalOrder) return;
    setSelectedType(reactivateModalOrder.type);
    setQty(reactivateModalOrder.qty);
    setMethod(reactivateModalOrder.method);
    if (reactivateModalOrder.address) setAddress(reactivateModalOrder.address);
    if (reactivateModalOrder.deliveryNotes) setDeliveryNotes(reactivateModalOrder.deliveryNotes);
    if (reactivateModalOrder.paymentMethod) setPaymentMethod(reactivateModalOrder.paymentMethod);
    
    setReactivateModalOrder(null);
    setTab('order');
    toast.info('Order details loaded into order form for your review.');
  };

  const myOrders = orders.filter(o => o.customerId === session?.id).sort((a,b) => b.date - a.date);

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`w-64 bg-[#0d1b2a] flex flex-col fixed inset-y-0 left-0 z-50 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0a6ed1] rounded-xl flex items-center justify-center text-white text-xl">
              💧
            </div>
            <div>
              <div className="font-heading text-base font-bold leading-tight">Aqua Gel</div>
              <div className="text-xs opacity-60">Customer Portal</div>
            </div>
          </div>
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <button 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${tab === 'order' ? 'bg-[#0a6ed1] text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            onClick={() => { setTab('order'); setIsSidebarOpen(false); }}
          >
            <ShoppingCart size={18} /> Place Order
          </button>
          <button 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${tab === 'myorders' ? 'bg-[#0a6ed1] text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            onClick={() => { setTab('myorders'); setIsSidebarOpen(false); }}
          >
            <Package size={18} /> My Orders
          </button>
          <button 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${tab === 'payments' ? 'bg-[#0a6ed1] text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            onClick={() => { setTab('payments'); setIsSidebarOpen(false); }}
          >
            <CreditCard size={18} /> Payment History
          </button>
          <button 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${tab === 'profile' ? 'bg-[#0a6ed1] text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            onClick={() => { setTab('profile'); setIsSidebarOpen(false); }}
          >
            <User size={18} /> My Profile
          </button>
          <button 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${tab === 'support' ? 'bg-[#0a6ed1] text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            onClick={() => { setTab('support'); setIsSidebarOpen(false); }}
          >
            <HelpCircle size={18} /> Customer Support & About
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-[#00a896] flex items-center justify-center text-sm font-bold uppercase shrink-0">
              {session?.name?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{session?.name}</div>
              <div className="text-xs text-white/50">Customer</div>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white transition-colors shrink-0" title="Logout">
              <Power size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 md:p-8 lg:p-10 hide-scrollbar overflow-x-hidden pt-20 lg:pt-8 pb-12 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-brand-border flex items-center px-4 z-30 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-brand-dark hover:bg-brand-gray-light rounded-lg">
            <Menu size={24} />
          </button>
          <div className="font-heading font-bold ml-2 text-brand-dark tracking-tight">Aqua Gel</div>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'order' && (
            <motion.div 
              key="order-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl"
            >
              <div className="mb-8">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-heading text-3xl font-bold mb-2 tracking-tight"
                >
                  Place an Order
                </motion.h1>
                <p className="text-brand-gray text-base sm:text-lg">Select your water type, quantity, and delivery method</p>
              </div>


              {customer && customer.unpaid > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#fff0f0] border border-[#ffcdd2] rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row gap-3 justify-between items-center text-center sm:text-left"
                >
                  <div>
                    <div className="font-bold text-[#e53935] mb-1">Outstanding Balance</div>
                    <div className="text-sm text-brand-gray">Please settle your unpaid balance</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="font-heading text-3xl font-black text-[#e53935]">₱{customer.unpaid}</div>
                    <button 
                      onClick={payOutstandingBalance}
                      disabled={isProcessingPayment}
                      className="bg-[#e53935] text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-red-700 disabled:opacity-50"
                    >
                      Pay via GCash
                    </button>
                  </div>
                </motion.div>
              )}


              <div className="space-y-10">
                <div>
                  <div className="font-heading text-lg sm:text-xl font-bold mb-4 text-brand-dark">1. Water Type</div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all ${selectedType === 'slim' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setSelectedType('slim')}
                    >
                      <div className="flex flex-col items-center justify-center text-center gap-3">
                        <div className={`${selectedType === 'slim' ? 'text-[#0a6ed1]' : 'text-brand-gray'} transition-colors`}>
                          <SlimGallonIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                        </div>
                        <div>
                          <div className="font-bold text-brand-dark text-sm sm:text-base">Slim Gallon</div>
                           <div className="text-brand-blue font-black mt-1">
                            {getUnitPrice('slim') < inventory.priceSlim ? (
                              <div className="flex flex-col items-center">
                                <span className="line-through text-brand-gray text-xs">₱{inventory.priceSlim}</span>
                                <span>₱{getUnitPrice('slim')}</span>
                                {inventory.discountSlimValidUntil && (
                                  <span className="text-[10px] text-amber-700 font-semibold mt-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Valid until {new Date(inventory.discountSlimValidUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>₱{inventory.priceSlim}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-brand-gray mt-1 font-medium">{inventory.slim} available</div>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all ${selectedType === 'round' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setSelectedType('round')}
                    >
                      <div className="flex flex-col items-center justify-center text-center gap-3">
                        <div className={`${selectedType === 'round' ? 'text-[#0a6ed1]' : 'text-brand-gray'} transition-colors`}>
                          <RoundGallonIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                        </div>
                        <div>
                          <div className="font-bold text-brand-dark text-sm sm:text-base">Round Gallon</div>
                          <div className="text-brand-blue font-black mt-1">
                            {getUnitPrice('round') < inventory.priceRound ? (
                              <div className="flex flex-col items-center">
                                <span className="line-through text-brand-gray text-xs">₱{inventory.priceRound}</span>
                                <span>₱{getUnitPrice('round')}</span>
                                {inventory.discountRoundValidUntil && (
                                  <span className="text-[10px] text-amber-700 font-semibold mt-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Valid until {new Date(inventory.discountRoundValidUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>₱{inventory.priceRound}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-brand-gray mt-1 font-medium">{inventory.round} available</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div>
                  <div className="font-heading text-lg sm:text-xl font-bold mb-4 text-brand-dark">2. Quantity</div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center border-2 border-brand-border rounded-xl bg-white shadow-sm overflow-hidden">
                      <button 
                        className="px-4 py-3 sm:px-5 sm:py-4 hover:bg-brand-gray-light text-brand-dark font-bold text-lg transition-colors active:bg-brand-gray disabled:opacity-50"
                        onClick={() => changeQty(-1)}
                        disabled={qty <= 1}
                      >−</button>
                      <input 
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') setQty('' as any);
                          else {
                            const num = parseInt(val);
                            if (!isNaN(num) && num > 0) setQty(num);
                          }
                        }}
                        onBlur={() => {
                          if (typeof qty !== 'number' || qty < 1) setQty(1);
                        }}
                        className="w-16 sm:w-20 text-center font-bold text-lg sm:text-xl text-brand-dark border-none focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                      />
                      <button 
                        className="px-4 py-3 sm:px-5 sm:py-4 hover:bg-brand-gray-light text-brand-dark font-bold text-lg transition-colors active:bg-brand-gray"
                        onClick={() => changeQty(1)}
                      >+</button>
                    </div>
                    <div className="text-sm text-brand-gray font-medium">
                      Total: <span className="font-bold text-brand-blue text-lg ml-1">₱{total}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-heading text-lg sm:text-xl font-bold mb-4 text-brand-dark">3. Delivery Method</div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all ${method === 'delivery' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setMethod('delivery')}
                    >
                      <div className="font-bold text-brand-dark flex items-center gap-3 mb-1">
                        <span className="text-xl sm:text-2xl">🚚</span> 
                        <span className="text-sm sm:text-base">Delivery</span>
                      </div>
                      <div className="text-xs sm:text-sm text-brand-gray mt-2 font-medium">We deliver to your address</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all ${method === 'pickup' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setMethod('pickup')}
                    >
                      <div className="font-bold text-brand-dark flex items-center gap-3 mb-1">
                        <span className="text-xl sm:text-2xl">🏪</span> 
                        <span className="text-sm sm:text-base">Pick-up</span>
                      </div>
                      <div className="text-xs sm:text-sm text-brand-gray mt-2 font-medium">Pick up at the station</div>
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {method === 'delivery' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2">
                          <label className="block text-sm font-semibold mb-2 text-brand-dark">Delivery Address</label>
                          <input 
                            type="text" 
                            className="form-control text-sm sm:text-base py-3 mb-4"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Enter your full delivery address"
                          />
                          <label className="block text-sm font-semibold mb-2 text-brand-dark">Delivery Instructions (Optional)</label>
                          <textarea 
                            className="form-control text-sm sm:text-base py-3 mb-4"
                            value={deliveryNotes}
                            onChange={e => setDeliveryNotes(e.target.value)}
                            placeholder="Specific instructions for delivery personnel..."
                            rows={2}
                          />
                          <div className="bg-brand-gray-light p-4 rounded-xl border border-brand-border">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="mt-1 rounded border-brand-border text-brand-blue focus:ring-brand-blue" 
                                checked={isSubscription}
                                onChange={e => setIsSubscription(e.target.checked)}
                              />
                              <div>
                                <span className="block font-bold text-brand-dark">Schedule Recurring Delivery</span>
                                <span className="text-xs text-brand-gray">Automatically schedule this order for the future.</span>
                              </div>
                            </label>
                            {isSubscription && (
                              <div className="mt-3 pt-3 border-t border-brand-border flex flex-col gap-3">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <button onClick={(e) => { e.preventDefault(); setScheduleType('interval'); }} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${scheduleType === 'interval' ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-brand-gray border border-brand-border hover:bg-slate-50'}`}>Intervals</button>
                                  <button onClick={(e) => { e.preventDefault(); setScheduleType('weekly'); }} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${scheduleType === 'weekly' ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-brand-gray border border-brand-border hover:bg-slate-50'}`}>Specific Days</button>
                                  <button onClick={(e) => { e.preventDefault(); setScheduleType('exact'); }} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${scheduleType === 'exact' ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-brand-gray border border-brand-border hover:bg-slate-50'}`}>Exact Date</button>
                                </div>
                                
                                {scheduleType === 'interval' && (
                                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-border">
                                    <span className="text-sm font-medium text-brand-gray">Deliver every</span>
                                    <select 
                                      className="form-control text-sm py-1.5 w-32"
                                      value={intervalDays}
                                      onChange={e => setIntervalDays(Number(e.target.value))}
                                    >
                                      <option value={7}>1 Week</option>
                                      <option value={14}>2 Weeks</option>
                                      <option value={21}>3 Weeks</option>
                                      <option value={30}>1 Month</option>
                                    </select>
                                  </div>
                                )}

                                {scheduleType === 'weekly' && (
                                  <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-brand-border">
                                    <span className="text-sm font-medium text-brand-gray mb-1">Select delivery days:</span>
                                    <div className="flex flex-wrap gap-2">
                                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, idx) => (
                                        <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer bg-brand-gray-light px-2.5 py-1.5 border border-brand-border rounded-lg hover:border-brand-blue transition-colors">
                                          <input type="checkbox" checked={weeklyDays.includes(idx)} onChange={(e) => {
                                            if (e.target.checked) setWeeklyDays([...weeklyDays, idx]);
                                            else setWeeklyDays(weeklyDays.filter(d => d !== idx));
                                          }} className="rounded text-brand-blue focus:ring-brand-blue w-3.5 h-3.5 border-brand-gray" />
                                          <span className="font-medium text-brand-dark">{day}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {scheduleType === 'exact' && (
                                  <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-brand-border">
                                    <span className="text-sm font-medium text-brand-gray">Select specific date:</span>
                                    <input 
                                      type="date" 
                                      min={new Date().toISOString().split('T')[0]} 
                                      className="form-control text-sm py-2" 
                                      value={exactDate} 
                                      onChange={e => setExactDate(e.target.value)} 
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <div className="font-heading text-lg sm:text-xl font-bold mb-4 text-brand-dark">4. Payment Method</div>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-3 sm:p-5 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <div className="font-bold text-center text-brand-dark flex flex-col items-center justify-center h-full">
                        <span className="text-3xl sm:text-4xl mb-2 drop-shadow-sm">💵</span>
                        <span className="text-sm sm:text-base">Cash</span>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 rounded-2xl p-3 sm:p-5 cursor-pointer transition-all ${paymentMethod === 'gcash' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                      onClick={() => setPaymentMethod('gcash')}
                    >
                      <div className="font-bold text-center text-brand-dark flex flex-col items-center justify-center h-full">
                        <span className="text-3xl sm:text-4xl mb-2 drop-shadow-sm">📱</span>
                        <span className="text-sm sm:text-base">GCash</span>
                      </div>
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {paymentMethod === 'gcash' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="mb-8 overflow-hidden"
                      >
                        <div className="bg-[#e8f3ff] border-2 border-[#0a6ed1]/30 rounded-2xl p-5 mb-4">
                          <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-2xl">🔒</div>
                          <div>
                            <h4 className="font-bold text-brand-dark mb-1">Secure Payment via GCash</h4>
                            <p className="text-sm text-brand-gray">You will be redirected to our secure payment gateway to complete your GCash payment.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>

              <div className="bg-[#f4f7fb] rounded-2xl p-4 sm:p-6 mb-8 border border-brand-border shadow-inner">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-brand-gray mb-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-brand-border/50 shadow-xs">
                    <span>{selectedType === 'slim' ? '🔵 Slim' : '🟢 Round'} Gallon × {qty}</span>
                    <span className="font-extrabold text-brand-dark">₱{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-brand-gray mb-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-brand-border/50 shadow-xs">
                    <span>Method</span>
                    <span className="font-extrabold text-brand-dark">{method === 'delivery' ? '🚚 Delivery' : '🏪 Pick-up'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-brand-gray mb-3 bg-white p-2.5 sm:p-3 rounded-xl border border-brand-border/50 shadow-xs">
                    <span>Payment</span>
                    <span className="font-extrabold text-brand-dark">
                      {paymentMethod === 'cash' ? '💵 Cash' : '📱 GCash (PayMongo)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-brand-border px-1 sm:px-2">
                    <span className="font-heading font-bold text-base sm:text-xl text-brand-dark">Total Amount</span>
                    <span className="font-heading font-black text-2xl sm:text-3xl text-[#0a6ed1]">₱{formatCurrency(total)}</span>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01, boxShadow: '0 10px 15px -3px rgba(10, 110, 209, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary w-full py-4 text-lg font-bold rounded-2xl shadow-md transition-all relative overflow-hidden group" 
                  onClick={placeOrder}
                  disabled={isProcessingPayment}
                >
                  <span className="relative z-10">{isProcessingPayment ? 'Processing...' : 'Place Order →'}</span>
                  {!isProcessingPayment && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />}
                </motion.button>
            </motion.div>
          )}

          {tab === 'myorders' && (
            <motion.div 
              key="myorders-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl"
            >
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold mb-2">My Orders</h1>
              <p className="text-brand-gray text-lg">Track your current and past orders</p>
            </div>

            {subscriptions.filter(s => s.customerId === session?.id && s.active).length > 0 && (
              <div className="mb-8">
                <h2 className="font-heading text-xl font-bold mb-4 text-brand-dark">Active Subscriptions</h2>
                <div className="grid gap-4">
                  {subscriptions.filter(s => s.customerId === session?.id && s.active).map(sub => (
                    <div key={sub.id} className="bg-[#e8f3ff] rounded-2xl border border-brand-blue/30 p-4 sm:p-6 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-heading font-black text-lg text-brand-blue mb-1">
                            {sub.type === 'slim' ? '🔵 Slim' : '🟢 Round'} Gallon × {sub.qty}
                          </div>
                          <div className="text-sm font-semibold text-brand-dark">
                            {(!sub.scheduleType || sub.scheduleType === 'interval') && `Deliver Every ${sub.intervalDays} Days`}
                            {sub.scheduleType === 'weekly' && `Weekly on ${sub.weeklyDays?.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`}
                            {sub.scheduleType === 'exact' && `Scheduled for ${new Date(sub.exactDate!).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                          </div>
                          <div className="text-xs text-brand-gray mt-1">
                            Next delivery: {new Date(sub.nextDeliveryDate).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleOpenCancelModal(
                            'subscription',
                            sub.id,
                            'Unsubscribe Recurring Delivery',
                            `Are you sure you want to cancel your recurring subscription for ${sub.type === 'slim' ? 'Slim' : 'Round'} Gallon × ${sub.qty}? You can subscribe again anytime.`
                          )}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-1.5 rounded-full transition-colors shadow-xs"
                        >
                          Unsubscribe
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="font-heading text-xl font-bold mb-4 text-brand-dark">Order History</h2>
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="flex flex-col gap-6"
            >
              {myOrders.length > 0 ? myOrders.map((o) => {
                const isCancelled = o.status === 'Cancelled';
                const steps = ['Pending', 'Out for Delivery', 'Delivered'];
                const currentStepIndex = steps.indexOf(o.status);

                return (
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.01, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    key={o.id} 
                    className={`bg-white rounded-2xl sm:rounded-3xl border ${isCancelled ? 'border-red-200 bg-red-50/20' : 'border-brand-border'} p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-200`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                      <div>
                        <div className="font-heading font-black text-lg sm:text-xl text-brand-dark mb-1">
                          {o.type === 'slim' ? '🔵 Slim' : '🟢 Round'} Gallon × {o.qty}
                        </div>
                        <div className="text-xs sm:text-sm text-brand-gray font-semibold">
                          {new Date(o.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2">
                        <div className="font-heading font-black text-xl sm:text-2xl text-brand-dark">
                          ₱{formatCurrency(o.total)}
                          {o.discountAmount && o.discountAmount > 0 && (
                            <div className="text-[11px] font-semibold text-brand-green">
                              -{o.discountType === 'percentage' ? `${o.discountValue}%` : `₱${formatCurrency(o.discountAmount)}`} off
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <span className={`badge py-0.5 px-2 text-[10px] sm:text-xs font-bold leading-none ${o.paid ? 'badge-paid' : 'badge-unpaid'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                          {o.paymentMethod && <span className="badge py-0.5 px-2 text-[10px] sm:text-xs font-bold leading-none bg-brand-gray-light text-brand-gray uppercase">{o.paymentMethod}</span>}
                        </div>
                        {o.referenceNumber && (
                          <div className="text-[10px] text-brand-gray font-mono mt-1 text-right">
                            Ref: {o.referenceNumber}
                          </div>
                        )}
                        {o.status === 'Pending' && !o.paid && o.checkoutUrl && o.paymentMethod === 'gcash' && (
                          <button 
                            onClick={() => window.open(o.checkoutUrl, '_blank')}
                            className="text-xs font-bold text-white hover:text-white bg-[#0a6ed1] hover:bg-[#085ab3] px-3 py-1.5 rounded-full mt-2 transition-colors block w-full sm:w-auto shadow-xs"
                          >
                            Complete Payment
                          </button>
                        )}
                        {o.status === 'Pending' && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-1">
                            <button 
                              onClick={() => {
                                const newAddress = window.prompt('Enter new delivery address:', o.address || '');
                                if (newAddress !== null && newAddress.trim() !== '') {
                                  setOrders(orders.map(order => order.id === o.id ? { ...order, address: newAddress.trim() } : order));
                                }
                              }}
                              className="text-xs font-bold text-brand-blue hover:text-brand-dark bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors flex-1"
                            >
                              Edit Address
                            </button>
                            <button 
                              onClick={() => handleOpenCancelModal(
                                'order',
                                o.id,
                                'Cancel Order',
                                `Are you sure you want to cancel your order #${o.id.slice(-6).toUpperCase()} (${o.type === 'slim' ? 'Slim' : 'Round'} Gallon × ${o.qty})? This will release reserved stock.`
                              )} 
                              className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors flex-1"
                            >
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCancelled ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-red-50 text-red-700 rounded-2xl font-bold mb-6 border border-red-200/80 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🚫</span>
                          <div>
                            <div>Order Cancelled</div>
                            <div className="text-xs font-normal text-red-600">This order was cancelled and inventory was returned.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInitiateReactivate(o)}
                          className="btn btn-sm bg-brand-blue text-white hover:bg-brand-blue-dark flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0"
                        >
                          <RefreshCw size={14} /> Reactivate / Re-order
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center mb-8 relative overflow-hidden px-1">
                        <div className="absolute top-[18px] left-0 w-full h-1 bg-[#f0f3f8] -z-10" />
                        <div className="absolute top-[18px] left-0 h-1 bg-[#0a6ed1] -z-10 transition-all duration-500" style={{ width: `${currentStepIndex === 0 ? 10 : currentStepIndex === 1 ? 50 : 100}%` }} />
                        
                        {steps.map((step, i) => {
                          const isCompleted = i <= currentStepIndex;
                          const isCurrent = i === currentStepIndex;
                          
                          return (
                            <div key={step} className="flex-1 flex flex-col items-center">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mb-3 transition-colors ${
                                isCompleted ? 'bg-[#0a6ed1] text-white shadow-md' : 'bg-[#f0f3f8] text-brand-gray'
                              }`}>
                                {i < currentStepIndex ? '✓' : i + 1}
                              </div>
                              <span className={`text-[10px] sm:text-xs text-center font-bold max-w-[70px] sm:max-w-none leading-snug ${isCurrent ? 'text-[#0a6ed1]' : isCompleted ? 'text-brand-dark' : 'text-brand-gray'}`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#f0f3f8] text-sm text-brand-gray font-medium">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-brand-gray-light flex flex-center items-center justify-center">🚚</div> {o.method === 'delivery' ? 'Home Delivery' : 'Pick-up'}</div>
                        {o.personnel && <div className="flex items-center gap-2 px-2"><div className="w-8 h-8 rounded-full bg-brand-gray-light flex flex-center items-center justify-center"><User size={14}/></div> {o.personnel}</div>}
                        {o.containerReturn && <div className="text-[#2e7d32] flex items-center gap-2 bg-[#e8f5e9] px-3 py-1.5 rounded-lg">✅ Container returned</div>}
                      </div>

                      {!isCancelled && o.status !== 'Pending' && (
                        <button
                          onClick={() => handleInitiateReactivate(o)}
                          className="btn btn-sm bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ml-auto shadow-xs"
                        >
                          <RefreshCw size={13} /> Re-order
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              }) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-3xl border border-brand-border p-16 text-center shadow-sm"
                >
                  <div className="text-6xl mb-4 opacity-50">📦</div>
                  <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">No orders yet</h3>
                  <p className="text-brand-gray">Place your first order to see it tracked here!</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {tab === 'payments' && (
          <motion.div 
            key="payments-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl"
          >
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold mb-2">Payment History</h1>
              <p className="text-brand-gray text-lg">Detailed history of your settled refilling transactions and payments</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center font-bold text-lg">
                  ₱
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">Total Paid</div>
                  <div className="text-2xl font-black text-brand-dark">
                    ₱{myOrders.filter(o => o.paid).reduce((sum, o) => sum + o.total, 0)}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${customer && customer.unpaid > 0 ? 'bg-[#fff0f0] text-[#e53935]' : 'bg-[#e8f3ff] text-[#0a6ed1]'}`}>
                  ₱
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">Outstanding Balance</div>
                  <div className={`text-2xl font-black ${customer && customer.unpaid > 0 ? 'text-[#e53935]' : 'text-brand-dark'}`}>
                    ₱{customer?.unpaid || 0}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-lg">
                  📊
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">Payments Made</div>
                  <div className="text-2xl font-black text-brand-dark">
                    {myOrders.filter(o => o.paid).length} Receipts
                  </div>
                </div>
              </div>
            </div>

            {/* List of Payments */}
            <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 shadow-sm">
              <h3 className="font-heading font-bold text-xl text-brand-dark mb-6">Payment Ledger</h3>
              
              <div className="space-y-4">
                {myOrders.length === 0 ? (
                  <div className="text-center py-12 text-brand-gray">
                    <div className="text-5xl mb-3">💵</div>
                    <p className="font-semibold">No order or payment records yet.</p>
                    <p className="text-xs mt-1">Once you make a purchase, your payment receipts will appear here.</p>
                  </div>
                ) : (
                  myOrders.map(o => (
                    <div 
                      key={o.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-brand-border hover:border-slate-300 bg-[#f4f7fb]/40 hover:bg-[#f4f7fb]/80 transition-all duration-150 gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-xs ${
                          o.paid 
                            ? 'bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]' 
                            : 'bg-[#fff0f0] text-[#e53935] border border-[#ffcdd2]'
                        }`}>
                          {o.paymentMethod === 'paymongo' ? '💳' : o.paymentMethod === 'gcash' ? '📱' : '💵'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-brand-dark text-sm sm:text-base">
                              {o.type === 'slim' ? 'Slim Gallon' : 'Round Gallon'} × {o.qty}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-brand-gray tracking-wider px-2 py-0.5 bg-slate-100 rounded-md">
                              {o.paymentMethod === 'paymongo' ? 'PayMongo' : o.paymentMethod === 'gcash' ? 'GCash (Manual)' : 'Cash'}
                            </span>
                          </div>
                          <div className="text-xs text-brand-gray font-semibold mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>Ref: #{o.id}</span>
                            <span className="text-slate-300">•</span>
                            <span>Ordered: {new Date(o.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {/* Payment details and when they paid */}
                          {o.paid ? (
                            <div className="text-xs text-[#2e7d32] font-bold flex items-center gap-1 mt-1">
                              <span>🟢 Paid on: {o.paidDate ? new Date(o.paidDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(o.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-[#e53935] font-bold flex items-center gap-1 mt-1">
                              <span>🔴 Unpaid / Payment Pending</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-border">
                        <div className="font-heading font-black text-lg sm:text-xl text-brand-dark">
                          ₱{o.total}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          o.paid 
                            ? 'bg-[#e8f5e9] text-[#2e7d32]' 
                            : 'bg-[#fff0f0] text-[#c62828] animate-pulse'
                        }`}>
                          {o.paid ? 'Settled' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'profile' && customer && (
          <motion.div 
            key="profile-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl"
          >
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="font-heading text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-brand-gray text-lg">Your account details and customer support</p>
              </div>
              {profileSubTab === 'details' && !isEditingProfile && (
                <button 
                  onClick={handleEditProfileStart}
                  className="bg-white border border-brand-border text-brand-dark px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile Sub-tabs */}
            <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-brand-border w-fit shadow-xs">
              <button
                type="button"
                onClick={() => setProfileSubTab('details')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileSubTab === 'details' ? 'bg-[#0a6ed1] text-white shadow-xs' : 'text-brand-gray hover:text-brand-dark'}`}
              >
                👤 Account Details
              </button>
              <button
                type="button"
                onClick={() => setProfileSubTab('support')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileSubTab === 'support' ? 'bg-[#0a6ed1] text-white shadow-xs' : 'text-brand-gray hover:text-brand-dark'}`}
              >
                💬 About & Customer Support
              </button>
            </div>

            {profileSubTab === 'support' ? (
              <div className="space-y-6">
                {/* Direct Contact Card */}
                <div className="bg-gradient-to-br from-[#0a6ed1] to-[#00a896] text-white p-6 sm:p-8 rounded-3xl shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                      🎧
                    </div>
                    <div>
                      <h2 className="font-heading font-black text-2xl">Customer Support</h2>
                      <p className="text-white/80 text-xs sm:text-sm">We are here to assist with your water orders, deliveries, and inquiries.</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase font-bold text-white/70 tracking-wider">Official Support Email</div>
                      <div className="font-bold text-lg mt-0.5">aquagel.station@gmail.com</div>
                    </div>
                    <a
                      href={`mailto:aquagel.station@gmail.com?subject=AquaGel%20Support%20Request%20-%20${encodeURIComponent(customer.name)}&body=Hello%20Aqua%20Gel%20Support%20Team,%0D%0A%0D%0AMy%20Order%20ID:%20%0D%0AMy%20Account%20Name:%20${encodeURIComponent(customer.name)}%0D%0AContact%20Number:%20${encodeURIComponent(customer.phone || '')}%0D%0A%0D%0AIssue%20/%20Concern:%0D%0A`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#0a6ed1] font-black text-sm hover:bg-slate-50 active:scale-95 transition-all shadow-md hover:shadow-lg"
                    >
                      <Mail size={18} /> Send Support Email
                    </a>
                  </div>
                </div>

                {/* Instructions for Faster Assistance */}
                <div className="bg-amber-50 border border-amber-200 p-5 sm:p-6 rounded-3xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0 font-black text-sm">
                      💡
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-base text-amber-950 mb-1">
                        Instructions for Faster Assistance
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                        When emailing our support team, please make sure to include your <strong>Order ID</strong> and your <strong>Full Name</strong>. This helps our staff immediately locate your delivery records or payment logs for immediate assistance.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-amber-800">
                        <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Address corrections</span>
                        <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Order cancellations</span>
                        <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Container return pickup</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Station Information & Operating Hours */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm">
                  <h3 className="font-heading font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-brand-blue" /> Operating Hours & Station Info
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-2xl bg-[#f4f7fb]">
                      <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Station Hours</div>
                      <div className="font-bold text-brand-dark">Monday – Sunday</div>
                      <div className="text-brand-blue font-semibold text-xs mt-0.5">7:00 AM – 6:00 PM (Daily Refills)</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#f4f7fb]">
                      <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Hotline / Phone</div>
                      <div className="font-bold text-brand-dark">+63 912 345 6789</div>
                      <div className="text-brand-gray text-xs mt-0.5">Direct station dispatch contact</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#f4f7fb] sm:col-span-2">
                      <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Refilling Station Address</div>
                      <div className="font-bold text-brand-dark">Aqua Gel Water Station, Main Highway Corner Waterway St.</div>
                      <div className="text-brand-gray text-xs mt-0.5">Open for walk-in gallon refilling and empty container exchanges.</div>
                    </div>
                  </div>
                </div>

                {/* About Aqua Gel Water Station */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm">
                  <h3 className="font-heading font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-brand-green" /> About Aqua Gel Water Station
                  </h3>
                  <p className="text-xs sm:text-sm text-brand-gray leading-relaxed mb-4">
                    Aqua Gel Water Station is committed to delivering pure, crystal-clear, safe, and mineral-balanced drinking water to households and businesses. Our modern multi-barrier filtration system combines sediment filters, carbon absorption, reverse osmosis, and ultraviolet sterilization to ensure the highest health and safety standards.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                      <div className="text-2xl mb-1">🔬</div>
                      <div className="font-bold text-xs text-brand-dark">21-Stage Purification</div>
                      <div className="text-[10px] text-brand-gray mt-0.5">Reverse osmosis & UV sterilized</div>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                      <div className="text-2xl mb-1">🧼</div>
                      <div className="font-bold text-xs text-brand-dark">Sterile Sanitization</div>
                      <div className="text-[10px] text-brand-gray mt-0.5">High-pressure sanitized & sealed</div>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                      <div className="text-2xl mb-1">⭐</div>
                      <div className="font-bold text-xs text-brand-dark">Loyalty Perks</div>
                      <div className="text-[10px] text-brand-gray mt-0.5">2% lifetime discount after 50 gals</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 mb-8 pb-8 border-b border-brand-border">
                  {customer.profilePictureUrl ? (
                    <img src={customer.profilePictureUrl} alt="Profile" className="w-20 h-20 rounded-2xl shadow-lg shrink-0 object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-[#00a896] to-[#0a6ed1] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shrink-0">
                      {customer.name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="font-heading font-bold text-2xl text-brand-dark mb-1 flex items-center justify-center sm:justify-start gap-2">
                      {customer.name}
                      {customer.isLoyal && <span title="Loyal / Regular Customer" className="text-yellow-400 drop-shadow-sm text-xl lg:text-2xl">⭐</span>}
                    </h2>
                    <div className="text-brand-gray font-medium mb-3">@{customer.username}</div>
                    {isEditingProfile ? (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2 text-left">Upload Profile Picture (Optional)</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="form-control text-sm py-2 mb-4 w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditProfilePicUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      customer.isLoyal ? (
                        <span className="badge py-1 px-3 bg-gradient-to-r from-yellow-100 to-amber-50 text-yellow-800 border border-yellow-300 shadow-sm flex items-center gap-1.5 w-fit mx-auto sm:mx-0">
                          ⭐ <span className="font-bold">Loyal / Regular Customer</span>
                        </span>
                      ) : (
                        <div className="text-xs text-brand-gray font-medium max-w-[200px] mx-auto sm:mx-0">
                          {customer.totalGallons} / 50 gallons for Loyal Status
                          <div className="w-full h-2 bg-[#f0f3f8] rounded-full mt-1.5 overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-brand-blue to-brand-teal transition-all duration-1000" style={{ width: `${Math.min(100, (customer.totalGallons / 50) * 100)}%` }} />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex gap-4 p-4 rounded-2xl bg-[#f4f7fb]">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-gray shrink-0 shadow-sm"><Phone size={18} /></div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Phone Number</div>
                      {isEditingProfile ? (
                        <input 
                          type="text" 
                          className="form-control text-sm py-2 w-full"
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          placeholder="e.g. 09123456789"
                        />
                      ) : (
                        <div className="font-medium text-brand-dark text-base">{customer.phone || 'Not provided'}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-[#f4f7fb]">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-gray shrink-0 shadow-sm"><MapPin size={18} /></div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Delivery Address</div>
                      {isEditingProfile ? (
                        <textarea 
                          className="form-control text-sm py-2 w-full"
                          value={editAddress}
                          onChange={e => setEditAddress(e.target.value)}
                          placeholder="Enter your full address"
                          rows={2}
                        />
                      ) : (
                        <div className="font-medium text-brand-dark text-base">{customer.address || 'Not provided'}</div>
                      )}
                    </div>
                  </div>

                  {isEditingProfile && (
                    <div className="flex gap-3 pt-4">
                      <button onClick={handleEditProfileSave} className="btn btn-primary flex-1">Save Profile</button>
                      <button onClick={() => setIsEditingProfile(false)} className="btn btn-secondary flex-1">Cancel</button>
                    </div>
                  )}

                  <div className={`flex gap-4 p-5 rounded-2xl ${customer.unpaid > 0 ? 'bg-[#fff0f0] border border-[#ffcdd2]' : 'bg-[#e8f5e9] border border-[#a5d6a7]'}`}>
                    <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm ${customer.unpaid > 0 ? 'text-[#e53935]' : 'text-[#2e7d32]'}`}>
                      <span className="font-heading font-bold text-xl">₱</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Unpaid Balance</div>
                      <div className={`font-heading font-bold text-3xl ${customer.unpaid > 0 ? 'text-[#e53935]' : 'text-[#2e7d32]'}`}>
                        ₱{customer.unpaid}
                      </div>
                    </div>
                  </div>

                  {/* Customer Support Shortcut Card */}
                  <div className="mt-6 p-5 bg-[#e8f3ff] rounded-2xl border border-brand-blue/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-brand-blue text-sm">Need Help with Your Orders?</div>
                      <div className="text-xs text-brand-gray mt-0.5">Reach out to our customer care team via email or phone.</div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setProfileSubTab('support')}
                      className="btn btn-sm bg-brand-blue text-white hover:bg-brand-blue-dark text-xs font-bold px-4 py-2 rounded-xl shrink-0 shadow-xs"
                    >
                      Customer Support →
                    </button>
                  </div>
                </div>

                {myOrders.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-brand-border">
                    <h3 className="font-heading font-bold text-lg text-brand-dark mb-4 drop-shadow-sm">Recent Purchases</h3>
                    <div className="space-y-3">
                      {myOrders.slice(0, 3).map(o => (
                        <div key={o.id} className="flex justify-between items-center bg-[#f4f7fb] p-4 rounded-2xl border border-transparent hover:border-brand-border transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">
                              {o.type === 'slim' ? '🔵' : '🟢'}
                            </div>
                            <div>
                              <div className="font-bold text-brand-dark text-sm">{o.type === 'slim' ? 'Slim Gallon' : 'Round Gallon'} <span className="text-brand-gray font-normal">× {o.qty}</span></div>
                              <div className="text-xs text-brand-gray">{new Date(o.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-brand-dark text-sm">₱{o.total}</div>
                            <div className={`text-[10px] uppercase font-bold tracking-wider ${o.status === 'Delivered' ? 'text-brand-green' : o.status === 'Pending' ? 'text-brand-amber' : 'text-brand-blue'}`}>{o.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {myOrders.length > 3 && (
                      <button onClick={() => setTab('myorders')} className="w-full mt-4 py-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors">
                        View All Orders →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'support' && (
          <motion.div 
            key="support-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl"
          >
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold mb-2">Customer Support & About</h1>
              <p className="text-brand-gray text-lg">Contact information, support guidance, and water station guidelines</p>
            </div>

            <div className="space-y-6">
              {/* Direct Contact Card */}
              <div className="bg-gradient-to-br from-[#0a6ed1] to-[#00a896] text-white p-6 sm:p-8 rounded-3xl shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                    🎧
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-2xl">Customer Support</h2>
                    <p className="text-white/80 text-xs sm:text-sm">We are here to assist with your water orders, deliveries, and inquiries.</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase font-bold text-white/70 tracking-wider">Official Support Email</div>
                    <div className="font-bold text-lg mt-0.5">aquagel.station@gmail.com</div>
                  </div>
                  <a
                    href={`mailto:aquagel.station@gmail.com?subject=AquaGel%20Support%20Request%20-%20${encodeURIComponent(customer?.name || 'Customer')}&body=Hello%20Aqua%20Gel%20Support%20Team,%0D%0A%0D%0AMy%20Order%20ID:%20%0D%0AMy%20Account%20Name:%20${encodeURIComponent(customer?.name || '')}%0D%0AContact%20Number:%20${encodeURIComponent(customer?.phone || '')}%0D%0A%0D%0AIssue%20/%20Concern:%0D%0A`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#0a6ed1] font-black text-sm hover:bg-slate-50 active:scale-95 transition-all shadow-md hover:shadow-lg"
                  >
                    <Mail size={18} /> Send Support Email
                  </a>
                </div>
              </div>

              {/* Instructions for Faster Assistance */}
              <div className="bg-amber-50 border border-amber-200 p-5 sm:p-6 rounded-3xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0 font-black text-sm">
                    💡
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-base text-amber-950 mb-1">
                      Instructions for Faster Assistance
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                      When emailing our support team, please make sure to include your <strong>Order ID</strong> and your <strong>Full Name</strong>. This helps our staff immediately locate your delivery records or payment logs for immediate assistance.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-amber-800">
                      <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Address corrections</span>
                      <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Order cancellations</span>
                      <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">✓ Container return pickup</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Station Information & Operating Hours */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm">
                <h3 className="font-heading font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-brand-blue" /> Operating Hours & Station Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-[#f4f7fb]">
                    <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Station Hours</div>
                    <div className="font-bold text-brand-dark">Monday – Sunday</div>
                    <div className="text-brand-blue font-semibold text-xs mt-0.5">7:00 AM – 6:00 PM (Daily Refills)</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f4f7fb]">
                    <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Hotline / Phone</div>
                    <div className="font-bold text-brand-dark">+63 912 345 6789</div>
                    <div className="text-brand-gray text-xs mt-0.5">Direct station dispatch contact</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f4f7fb] sm:col-span-2">
                    <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">Refilling Station Address</div>
                    <div className="font-bold text-brand-dark">Aqua Gel Water Station, Main Highway Corner Waterway St.</div>
                    <div className="text-brand-gray text-xs mt-0.5">Open for walk-in gallon refilling and empty container exchanges.</div>
                  </div>
                </div>
              </div>

              {/* About Aqua Gel Water Station */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm">
                <h3 className="font-heading font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-brand-green" /> About Aqua Gel Water Station
                </h3>
                <p className="text-xs sm:text-sm text-brand-gray leading-relaxed mb-4">
                  Aqua Gel Water Station is committed to delivering pure, crystal-clear, safe, and mineral-balanced drinking water to households and businesses. Our modern multi-barrier filtration system combines sediment filters, carbon absorption, reverse osmosis, and ultraviolet sterilization to ensure the highest health and safety standards.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                    <div className="text-2xl mb-1">🔬</div>
                    <div className="font-bold text-xs text-brand-dark">21-Stage Purification</div>
                    <div className="text-[10px] text-brand-gray mt-0.5">Reverse osmosis & UV sterilized</div>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                    <div className="text-2xl mb-1">🧼</div>
                    <div className="font-bold text-xs text-brand-dark">Sterile Sanitization</div>
                    <div className="text-[10px] text-brand-gray mt-0.5">High-pressure sanitized & sealed</div>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-brand-border/80 text-center">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="font-bold text-xs text-brand-dark">Loyalty Perks</div>
                    <div className="text-[10px] text-brand-gray mt-0.5">2% lifetime discount after 50 gals</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>

    {/* Cancellation Confirmation Modal */}
    {cancelModalData && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h3 className="font-heading text-xl font-black text-center text-brand-dark mb-2">
            {cancelModalData.title}
          </h3>
          <p className="text-xs sm:text-sm text-brand-gray text-center mb-6 leading-relaxed">
            {cancelModalData.description}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCancelModalData(null)}
              className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={handleExecuteCancel}
              className="w-full py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-colors"
            >
              Confirm Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Reactivation Modal */}
    {reactivateModalOrder && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-brand-blue flex items-center justify-center text-2xl mx-auto mb-4">
            🔄
          </div>
          <h3 className="font-heading text-xl font-black text-center text-brand-dark mb-1">
            Reactivate / Re-order
          </h3>
          <p className="text-xs text-brand-gray text-center mb-6">
            Would you like to instantly re-order with the previous details or review them in the order form first?
          </p>

          {/* Order Summary Details */}
          <div className="p-4 bg-[#f4f7fb] rounded-2xl mb-6 space-y-2 text-xs">
            <div className="flex justify-between font-bold text-brand-dark">
              <span>Gallon Type:</span>
              <span>{reactivateModalOrder.type === 'slim' ? '🔵 Slim Gallon' : '🟢 Round Gallon'} × {reactivateModalOrder.qty}</span>
            </div>
            <div className="flex justify-between text-brand-gray">
              <span>Method:</span>
              <span>{reactivateModalOrder.method === 'delivery' ? '🚚 Delivery' : '🏪 Pick-up'}</span>
            </div>
            {reactivateModalOrder.address && (
              <div className="flex justify-between text-brand-gray">
                <span>Address:</span>
                <span className="truncate max-w-[180px]">{reactivateModalOrder.address}</span>
              </div>
            )}
            <div className="flex justify-between text-brand-dark font-black pt-2 border-t border-brand-border/60 text-sm">
              <span>Estimated Total:</span>
              <span className="text-brand-blue">
                ₱{formatCurrency(
                  reactivateModalOrder.qty * getUnitPrice(reactivateModalOrder.type) * (customer?.isLoyal ? 0.98 : 1)
                )}
                {customer?.isLoyal && <span className="text-[10px] text-brand-green ml-1 font-semibold">(2% Loyal Discount)</span>}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConfirmReactivateDirect}
              className="w-full py-3.5 rounded-full bg-brand-blue hover:bg-brand-blue-dark text-white font-black text-xs shadow-md hover:shadow-lg transition-all"
            >
              ⚡ Instant Re-order (Place Order Now)
            </button>
            <button
              type="button"
              onClick={handleConfirmReactivateToCart}
              className="w-full py-3 rounded-full bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold text-xs transition-colors"
            >
              ✏️ Review in Order Form
            </button>
            <button
              type="button"
              onClick={() => setReactivateModalOrder(null)}
              className="w-full py-2.5 text-xs text-brand-gray hover:text-brand-dark font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Success Notification */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[100] bg-brand-blue text-white px-6 py-4 rounded-2xl shadow-2xl font-medium w-[90%] max-w-sm text-center border border-white/20 backdrop-blur-md"
          >
            {orderSuccess}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
