import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CustomerLogin() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const { customers, setCustomers, setSession } = useStore();
  const navigate = useNavigate();

  const [error, setError] = useState('');

  // Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [suName, setSuName] = useState('');
  const [suUser, setSuUser] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suAddr, setSuAddr] = useState('');

  const handleLogin = () => {
    setError('');
    const found = customers.find(c => c.username === username && c.password === password);
    if (found) {
      setSession({ id: found.id, name: found.name, username: found.username, role: 'customer' });
      navigate('/customer');
    } else {
      setError('Invalid customer credentials. Try maria / maria123');
    }
  };

  const handleSignup = () => {
    setError('');
    if (!suName || !suUser || !suPass || !suAddr) {
      setError('Please fill in all required fields (*)');
      return;
    }
    if (customers.find(c => c.username === suUser)) {
      setError('Username already taken. Please choose another.');
      return;
    }
    const newCustomer = {
      id: 'c' + Date.now(),
      name: suName,
      username: suUser,
      password: suPass,
      phone: suPhone,
      address: suAddr,
      unpaid: 0,
      isLoyal: false,
      role: 'customer' as const
    };
    setCustomers([...customers, newCustomer]);
    setSession({ id: newCustomer.id, name: newCustomer.name, username: newCustomer.username, role: 'customer' });
    navigate('/customer');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-brand-gray-light">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-teal flex flex-col justify-center items-start p-10 md:p-16 relative overflow-hidden text-white"
      >
        {/* Background shapes */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-white/5 -top-24 -right-24 blur-3xl animate-pulse" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-white/5 -bottom-20 -left-20 blur-2xl animate-pulse delay-1000" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-4 z-10 mb-12"
        >
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Droplets size={32} />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl leading-tight">Aqua Gel</div>
            <div className="text-sm opacity-80">Water Station Management</div>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-heading font-extrabold text-4xl md:text-5xl leading-tight z-10 mb-6"
        >
          Pure Water,<br /><em className="not-italic text-[#7de4d8]">Smart Operations</em>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg text-white/80 z-10 max-w-[420px] mb-12"
        >
          A complete ordering and inventory management system for your water station.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-4 z-10 text-white/90"
        >
          {['Online ordering', 'Real-time delivery tracking', 'Detailed income reports', 'Balance monitoring', 'Inventory management'].map((txt, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#7de4d8] shadow-[0_0_10px_rgba(125,228,216,0.6)]" /> {txt}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full md:w-[480px] bg-white flex flex-col justify-center p-10 md:p-14 relative shadow-2xl"
      >
        <Link to="/admin/login" className="absolute top-6 right-6 text-xs text-brand-gray hover:text-brand-blue font-medium transition-colors">
          Admin Portal →
        </Link>
        <div className="mb-8 pl-1">
          <h2 className="font-heading font-bold text-3xl text-brand-dark mb-2">
            {tab === 'login' ? 'Welcome back' : 'Create Account'}
          </h2>
          <p className="text-brand-gray">
            {tab === 'login' ? 'Sign in to your account to continue' : 'Register as a new customer'}
          </p>
        </div>

        <div className="flex bg-brand-gray-light p-1 rounded-xl mb-8 relative">
          <button 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all relative z-10 ${tab === 'login' ? 'text-brand-blue' : 'text-brand-gray hover:text-brand-dark'}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all relative z-10 ${tab === 'signup' ? 'text-brand-blue' : 'text-brand-gray hover:text-brand-dark'}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Sign Up
          </button>
          {/* Animated background pill */}
          <motion.div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm"
            animate={{ left: tab === 'login' ? '4px' : 'calc(50% + 0px)' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-red-light border border-red-200 text-brand-red px-4 py-3 rounded-xl text-sm mb-6"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {tab === 'login' ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="form-group group">
                <label className="transition-colors group-focus-within:text-brand-blue">Username</label>
                <input type="text" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" />
              </div>
              <div className="form-group mb-8 group">
                <label className="transition-colors group-focus-within:text-brand-blue">Password</label>
                <input type="password" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary w-full py-3.5 text-base shadow-lg hover:shadow-xl hover:shadow-brand-blue/30 transition-all font-semibold" 
                onClick={handleLogin}
              >
                Sign In
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="form-group group">
                <label className="transition-colors group-focus-within:text-brand-blue">Full Name *</label>
                <input type="text" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={suName} onChange={e => setSuName(e.target.value)} placeholder="Your real full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group group">
                  <label className="transition-colors group-focus-within:text-brand-blue">Username *</label>
                  <input type="text" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={suUser} onChange={e => setSuUser(e.target.value)} placeholder="Choose a username" />
                </div>
                <div className="form-group group">
                  <label className="transition-colors group-focus-within:text-brand-blue">Password *</label>
                  <input type="password" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={suPass} onChange={e => setSuPass(e.target.value)} placeholder="Create password" />
                </div>
              </div>
              <div className="form-group group">
                <label className="transition-colors group-focus-within:text-brand-blue">Phone Number</label>
                <input type="text" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={suPhone} onChange={e => setSuPhone(e.target.value)} placeholder="e.g. 09XXXXXXXXX" />
              </div>
              <div className="form-group mb-8 group">
                <label className="transition-colors group-focus-within:text-brand-blue">Delivery Address *</label>
                <input type="text" className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" value={suAddr} onChange={e => setSuAddr(e.target.value)} placeholder="House/Lot, Street, Barangay, City" />
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary w-full py-3.5 text-base shadow-lg hover:shadow-xl hover:shadow-brand-blue/30 transition-all font-semibold" 
                onClick={handleSignup}
              >
                Create Account
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
