import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useCustomerNotifications } from '../../lib/notifications';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, User, Power, MapPin, Phone, Menu, X, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlimGallonIcon, RoundGallonIcon } from '../../components/icons/Gallons';
import { toast } from 'sonner';

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
  const [tab, setTab] = useState<'order' | 'myorders' | 'payments' | 'profile'>('order');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [intervalDays, setIntervalDays] = useState(7);
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

  const unitPrice = selectedType === 'slim' ? inventory.priceSlim : inventory.priceRound;
  const rawTotal = unitPrice * qty;
  const discount = customer?.isLoyal ? rawTotal * 0.02 : 0;
  const total = rawTotal - discount;

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

        setOrders([newOrder, ...orders]);
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
          setOrders([newOrder, ...orders].map(o => o.id === orderId ? { ...o, checkoutUrl: data.checkoutUrl } : o));

          window.location.href = data.checkoutUrl;
          setTab('myorders');
          return;
        } else {
          alert('Failed to initialize payment gateway: ' + (data.error || 'Unknown error'));
          // Revert order if gateway fails
          setOrders(orders.filter(o => o.id !== orderId));
          setInventory({ ...inventory, [selectedType]: inventory[selectedType] + qty });
          if (customer) setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: Math.max(0, c.unpaid - total) } : c));
        }
      } catch (err) {
        console.error(err);
        alert('Network error. Please try again.');
        // Revert order
        setOrders(orders.filter(o => o.id !== orderId));
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

    setOrders([newOrder, ...orders]);
    setInventory({ ...inventory, [selectedType]: inventory[selectedType] - qty });
    
    // Update unpaid balance
    if (customer) {
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: c.unpaid + total } : c));
    }

    if (isSubscription && method === 'delivery') {
      const newSub = {
        id: 'sub' + Date.now(),
        customerId: session!.id,
        customerName: session!.name,
        type: selectedType,
        qty,
        intervalDays,
        nextDeliveryDate: Date.now() + (intervalDays * 24 * 60 * 60 * 1000),
        address: address,
        deliveryNotes: deliveryNotes.trim() || undefined,
        active: true
      };
      setSubscriptions([newSub, ...subscriptions]);
    }

    setOrderSuccess(isSubscription ? `✅ Order and Subscription placed! Deliveries scheduled every ${intervalDays} days.` : `✅ Order placed successfully! Total: ₱${total}. Status: Pending.`);
    setQty(1);
    setReferenceNumber('');
    setDeliveryNotes('');
    setIsSubscription(false);
    setTimeout(() => setOrderSuccess(''), 5000);
  };

  const handleCancelOrder = (orderId: string) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== 'Pending') return;

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
    setInventory({ ...inventory, [order.type]: inventory[order.type] + order.qty });
    if (!order.paid) {
      setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, c.unpaid - order.total) } : c));
    }
    
    if (order.paymentMethod === 'cash' && order.customerId !== 'guest') {
      setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, c.unpaid - order.total) } : c));
    }
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
                          <div className="text-brand-blue font-black mt-1">₱{inventory.priceSlim}</div>
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
                          <div className="text-brand-blue font-black mt-1">₱{inventory.priceRound}</div>
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
                              <div className="mt-3 pt-3 border-t border-brand-border flex items-center gap-3">
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
                    <span className="font-extrabold text-brand-dark">₱{total}</span>
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
                    <span className="font-heading font-black text-2xl sm:text-3xl text-[#0a6ed1]">₱{total}</span>
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
                            Deliver Every {sub.intervalDays} Days
                          </div>
                          <div className="text-xs text-brand-gray mt-1">
                            Next delivery: {new Date(sub.nextDeliveryDate).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (window.confirm('Cancel this recurring subscription?')) {
                              setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, active: false } : s));
                            }
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                          Cancel
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
              {myOrders.length > 0 ? myOrders.map((o, index) => {
                const isCancelled = o.status === 'Cancelled';
                const steps = ['Pending', 'Out for Delivery', 'Delivered'];
                const currentStepIndex = steps.indexOf(o.status);

                return (
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.01, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    key={o.id} 
                    className={`bg-white rounded-2xl sm:rounded-3xl border ${isCancelled ? 'border-red-200 bg-red-50/30' : 'border-brand-border'} p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-200`}
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
                        <div className="font-heading font-black text-xl sm:text-2xl text-brand-dark">₱{o.total}</div>
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
                            className="text-xs font-bold text-white hover:text-white bg-[#0a6ed1] hover:bg-[#085ab3] px-3 py-1.5 rounded-full mt-2 transition-colors block w-full sm:w-auto"
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
                              onClick={() => handleCancelOrder(o.id)} 
                              className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors flex-1"
                            >
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCancelled ? (
                      <div className="flex items-center justify-center p-6 bg-red-50 text-red-600 rounded-xl font-bold mb-8 border border-red-100">
                        🚫 Order Cancelled
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
                        {/* Success Notification */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[100] bg-[#00a896] text-white px-6 py-4 rounded-2xl shadow-xl font-medium w-[90%] max-w-sm text-center border border-white/20 backdrop-blur-md"
          >
            {orderSuccess}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
)}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 pt-6 border-t border-[#f0f3f8] text-sm text-brand-gray font-medium">
                      <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-brand-gray-light flex flex-center items-center justify-center">🚚</div> {o.method === 'delivery' ? 'Home Delivery' : 'Pick-up'}</div>
                      {o.personnel && <div className="flex items-center gap-2 px-2"><div className="w-8 h-8 rounded-full bg-brand-gray-light flex flex-center items-center justify-center"><User size={14}/></div> {o.personnel}</div>}
                      {o.containerReturn && <div className="text-[#2e7d32] flex items-center gap-2 ml-auto bg-[#e8f5e9] px-3 py-1.5 rounded-lg">✅ Container returned</div>}
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
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="font-heading text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-brand-gray text-lg">Your account details and balance</p>
              </div>
              {!isEditingProfile && (
                <button 
                  onClick={handleEditProfileStart}
                  className="bg-white border border-brand-border text-brand-dark px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

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
                      <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2 text-left">Profile Picture URL (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control text-sm py-2 mb-4 w-full"
                        value={editProfilePicUrl}
                        onChange={e => setEditProfilePicUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
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
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
