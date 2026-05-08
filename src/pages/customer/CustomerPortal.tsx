import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useCustomerNotifications } from '../../lib/notifications';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, User, Power, MapPin, Phone, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlimGallonIcon, RoundGallonIcon } from '../../components/icons/Gallons';

export default function CustomerPortal() {
  useCustomerNotifications();
  const { session, setSession, inventory, setInventory, orders, setOrders, customers, setCustomers } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'order' | 'myorders' | 'profile'>('order');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const customer = customers.find(c => c.id === session?.id);

  // Order State
  const [selectedType, setSelectedType] = useState<'slim' | 'round'>('slim');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'paymongo'>('cash');
  const [address, setAddress] = useState(customer?.address || '');
  const [orderSuccess, setOrderSuccess] = useState('');

  const handleLogout = () => {
    setSession(null);
    navigate('/');
  };

  const changeQty = (d: number) => {
    setQty(Math.max(1, qty + d));
  };

  const unitPrice = selectedType === 'slim' ? inventory.priceSlim : inventory.priceRound;
  const total = unitPrice * qty;

  const placeOrder = () => {
    const stock = inventory[selectedType];
    if (stock < qty) {
      alert(`Not enough ${selectedType} gallons in stock (${stock} available).`);
      return;
    }
    if (method === 'delivery' && !address.trim()) {
      alert('Please enter your delivery address.');
      return;
    }

    const newOrder = {
      id: 'o' + Date.now(),
      customerId: session!.id,
      customerName: session!.name,
      type: selectedType,
      qty,
      method,
      paymentMethod,
      status: 'Pending' as const,
      total,
      paid: paymentMethod !== 'cash',
      date: Date.now(),
      personnel: null,
      address: method === 'delivery' ? address : null,
      containerReturn: false
    };

    setOrders([newOrder, ...orders]);
    setInventory({ ...inventory, [selectedType]: inventory[selectedType] - qty });
    
    // Update unpaid balance only if cash
    if (customer && paymentMethod === 'cash') {
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, unpaid: c.unpaid + total } : c));
    }

    if (paymentMethod !== 'cash') {
      setOrderSuccess(`✅ Payment successful via ${paymentMethod === 'gcash' ? 'GCash' : 'PayMongo'}. Order placed! Total: ₱${total}. Status: Pending.`);
    } else {
      setOrderSuccess(`✅ Order placed successfully! Total: ₱${total}. Status: Pending.`);
    }
    setQty(1);
    setTimeout(() => setOrderSuccess(''), 5000);
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

      <main className="flex-1 lg:ml-64 p-6 md:p-8 lg:p-10 hide-scrollbar overflow-x-hidden pt-20 lg:pt-8 w-full max-w-[100vw]">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-brand-border flex items-center px-4 z-30 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-brand-dark hover:bg-brand-gray-light rounded-lg">
            <Menu size={24} />
          </button>
          <div className="font-heading font-bold ml-2 text-brand-dark">Aqua Gel</div>
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
                  className="font-heading text-3xl font-bold mb-2"
                >
                  Place an Order
                </motion.h1>
                <p className="text-brand-gray text-lg">Select your water type, quantity, and delivery method</p>
              </div>

              {customer && customer.unpaid > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#fff0f0] border border-[#ffcdd2] rounded-2xl p-5 mb-8 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-[#e53935] mb-1">Outstanding Balance</div>
                    <div className="text-sm text-brand-gray">Please settle your unpaid balance</div>
                  </div>
                  <div className="font-heading text-3xl font-bold text-[#e53935]">₱{customer.unpaid}</div>
                </motion.div>
              )}

              <AnimatePresence>
                {orderSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] px-5 py-4 rounded-xl font-medium overflow-hidden"
                  >
                    {orderSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white rounded-3xl border border-brand-border p-8 shadow-sm">
                <div className="font-heading text-xl font-bold mb-4 text-brand-dark">1. Choose Gallon Type</div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center justify-center transition-all ${selectedType === 'slim' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setSelectedType('slim')}
                  >
                    <SlimGallonIcon className="w-20 h-24 mb-4 drop-shadow-md" />
                    <div className="font-heading font-bold text-lg mb-1">Slim Gallon</div>
                    <div className="text-xl font-bold text-[#0a6ed1]">₱{inventory.priceSlim}</div>
                    <div className="text-xs font-semibold text-brand-gray mt-2 px-2 py-1 bg-white/50 rounded-md shadow-sm">{inventory.slim} left in stock</div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center justify-center transition-all ${selectedType === 'round' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setSelectedType('round')}
                  >
                    <RoundGallonIcon className="w-20 h-24 mb-4 drop-shadow-md" />
                    <div className="font-heading font-bold text-lg mb-1">Round Gallon</div>
                    <div className="text-xl font-bold text-[#0a6ed1]">₱{inventory.priceRound}</div>
                    <div className="text-xs font-semibold text-brand-gray mt-2 px-2 py-1 bg-white/50 rounded-md shadow-sm">{inventory.round} left in stock</div>
                  </motion.div>
                </div>

                <div className="font-heading text-xl font-bold mb-4 text-brand-dark">2. Quantity</div>
                <div className="flex items-center gap-6 mb-8">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full border-2 border-brand-border flex items-center justify-center text-2xl text-brand-gray hover:text-[#0a6ed1] hover:border-[#0a6ed1] hover:bg-[#e8f3ff] transition-colors"
                    onClick={() => changeQty(-1)}
                  >−</motion.button>
                  <motion.div 
                    key={qty}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-heading text-4xl font-bold w-12 text-center text-brand-dark"
                  >{qty}</motion.div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full border-2 border-brand-border flex items-center justify-center text-2xl text-brand-gray hover:text-[#0a6ed1] hover:border-[#0a6ed1] hover:bg-[#e8f3ff] transition-colors"
                    onClick={() => changeQty(1)}
                  >+</motion.button>
                </div>

                <div className="font-heading text-xl font-bold mb-4 text-brand-dark">3. Delivery Method</div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-5 cursor-pointer transition-all ${method === 'delivery' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setMethod('delivery')}
                  >
                    <div className="text-3xl mb-2 drop-shadow-sm">🚚</div>
                    <div className="font-bold text-base text-brand-dark">Home Delivery</div>
                    <div className="text-xs text-brand-gray mt-1">We deliver to your address</div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-5 cursor-pointer transition-all ${method === 'pickup' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setMethod('pickup')}
                  >
                    <div className="text-3xl mb-2 drop-shadow-sm">🏪</div>
                    <div className="font-bold text-base text-brand-dark">Pick-up</div>
                    <div className="text-xs text-brand-gray mt-1">Pick up at the station</div>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {method === 'delivery' && (
                    <motion.div 
                      key="address-field"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="mb-8 overflow-hidden"
                    >
                      <label className="block text-sm font-medium mb-2 text-brand-dark">Delivery Address</label>
                      <input 
                        type="text" 
                        className="form-control text-base py-3 shadow-inner" 
                        value={address} 
                        onChange={e => setAddress(e.target.value)} 
                        placeholder="Confirm your delivery address" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="font-heading text-xl font-bold mb-4 text-brand-dark">4. Payment Method</div>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <div className="font-bold text-center text-brand-dark flex flex-col items-center">
                      <span className="text-2xl mb-2 drop-shadow-sm">💵</span>
                      <span className="text-sm">Cash</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'gcash' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setPaymentMethod('gcash')}
                  >
                    <div className="font-bold text-center text-brand-dark flex flex-col items-center">
                      <span className="text-2xl mb-2 drop-shadow-sm">📱</span>
                      <span className="text-sm">GCash</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'paymongo' ? 'border-[#0a6ed1] bg-[#e8f3ff] shadow-md ring-2 ring-[#0a6ed1]/20' : 'border-brand-border hover:border-brand-blue/30 bg-white'}`}
                    onClick={() => setPaymentMethod('paymongo')}
                  >
                    <div className="font-bold text-center text-brand-dark flex flex-col items-center">
                      <span className="text-2xl mb-2 drop-shadow-sm">💳</span>
                      <span className="text-sm">PayMongo</span>
                    </div>
                  </motion.div>
                </div>

                <div className="bg-[#f4f7fb] rounded-2xl p-6 mb-8 border border-brand-border shadow-inner">
                  <div className="flex justify-between items-center text-sm font-medium text-brand-gray mb-3 bg-white p-3 rounded-lg border border-brand-border/50">
                    <span>{selectedType === 'slim' ? '🔵 Slim' : '🟢 Round'} Gallon × {qty}</span>
                    <span className="font-bold text-brand-dark">₱{total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-brand-gray mb-4 bg-white p-3 rounded-lg border border-brand-border/50">
                    <span>Method</span>
                    <span className="font-bold text-brand-dark">{method === 'delivery' ? '🚚 Home Delivery' : '🏪 Pick-up'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-brand-gray mb-4 bg-white p-3 rounded-lg border border-brand-border/50">
                    <span>Payment</span>
                    <span className="font-bold text-brand-dark">
                      {paymentMethod === 'cash' ? '💵 Cash' : paymentMethod === 'gcash' ? '📱 GCash API' : '💳 PayMongo'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-brand-border px-2">
                    <span className="font-heading font-bold text-xl text-brand-dark">Total Amount</span>
                    <span className="font-heading font-bold text-3xl text-[#0a6ed1]">₱{total}</span>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01, boxShadow: '0 10px 15px -3px rgba(10, 110, 209, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary w-full py-4 text-lg font-bold rounded-2xl shadow-md transition-all relative overflow-hidden group" 
                  onClick={placeOrder}
                >
                  <span className="relative z-10">Place Order →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                </motion.button>
              </div>
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
                const steps = ['Pending', 'Out for Delivery', 'Delivered'];
                const currentStepIndex = steps.indexOf(o.status);

                return (
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.01, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    key={o.id} 
                    className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 shadow-sm transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                      <div>
                        <div className="font-heading font-bold text-xl text-brand-dark mb-1">
                          {o.type === 'slim' ? '🔵 Slim' : '🟢 Round'} Gallon × {o.qty}
                        </div>
                        <div className="text-sm text-brand-gray">
                          {new Date(o.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <div className="font-heading font-bold text-2xl text-brand-dark mb-2">₱{o.total}</div>
                        <div className="flex gap-2 justify-end">
                          <span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                          {o.paymentMethod && <span className="badge bg-brand-gray-light text-brand-gray">{o.paymentMethod.toUpperCase()}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mb-8 relative overflow-hidden px-2">
                      <div className="absolute top-4 left-0 w-full h-1 bg-[#f0f3f8] -z-10" />
                      <div className="absolute top-4 left-0 h-1 bg-[#0a6ed1] -z-10 transition-all duration-500" style={{ width: `${currentStepIndex === 0 ? 10 : currentStepIndex === 1 ? 50 : 100}%` }} />
                      
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
                            <span className={`text-xs font-semibold ${isCurrent ? 'text-[#0a6ed1]' : isCompleted ? 'text-brand-dark' : 'text-brand-gray'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

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

        {tab === 'profile' && customer && (
          <motion.div 
            key="profile-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl"
          >
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold mb-2">My Profile</h1>
              <p className="text-brand-gray text-lg">Your account details and balance</p>
            </div>

            <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 mb-8 pb-8 border-b border-brand-border">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00a896] to-[#0a6ed1] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shrink-0">
                  {customer.name[0]}
                </div>
                <div>
                  <h2 className="font-heading font-bold text-2xl text-brand-dark mb-1">{customer.name}</h2>
                  <div className="text-brand-gray font-medium mb-3">@{customer.username}</div>
                  {customer.isLoyal && <span className="badge badge-loyal py-1 px-3">Loyal / Regular Customer</span>}
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex gap-4 p-4 rounded-2xl bg-[#f4f7fb]">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-gray shrink-0 shadow-sm"><Phone size={18} /></div>
                  <div>
                    <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Phone Number</div>
                    <div className="font-medium text-brand-dark text-base">{customer.phone || 'Not provided'}</div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-[#f4f7fb]">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-gray shrink-0 shadow-sm"><MapPin size={18} /></div>
                  <div>
                    <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Delivery Address</div>
                    <div className="font-medium text-brand-dark text-base">{customer.address}</div>
                  </div>
                </div>

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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
