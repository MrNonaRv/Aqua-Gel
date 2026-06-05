import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLogin() {
  const { setSession } = useStore();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    setError('');
    if (username === 'admin' && password === 'admin123') {
      setSession({ id: 'admin', name: 'Admin', username: 'admin', role: 'admin' });
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials. Try admin / admin123');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-brand-gray-light">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 bg-brand-dark flex flex-col justify-center items-start p-10 md:p-16 relative overflow-hidden text-white"
      >
        <div className="absolute w-[400px] h-[400px] rounded-full bg-white/5 -top-24 -right-24 blur-3xl animate-pulse" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-brand-blue/20 -bottom-20 -left-20 blur-2xl animate-pulse delay-1000" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-4 z-10 mb-12"
        >
          <div className="w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(10,110,209,0.5)]">
            <Shield size={32} />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl leading-tight">Aqua Gel</div>
            <div className="text-sm opacity-80">Admin Portal</div>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-heading font-extrabold text-4xl md:text-5xl leading-tight z-10 mb-6"
        >
          Station Control <br /><em className="not-italic text-brand-blue-light">Center</em>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg text-white/80 z-10 max-w-[420px]"
        >
          Access the management dashboard to oversee operations, inventory, and staff.
        </motion.p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full md:w-[480px] bg-white flex flex-col justify-center p-10 md:p-14 relative shadow-2xl"
      >
        <div className="mb-8 pl-1 text-center">
          <h2 className="font-heading font-bold text-3xl text-brand-dark mb-2">
            Admin Login
          </h2>
          <p className="text-brand-gray">
            Enter your credentials to access the panel
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-red-light border border-red-200 text-brand-red px-4 py-3 rounded-xl text-sm mb-6 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="form-group group">
            <label className="transition-colors group-focus-within:text-brand-blue">Admin Username</label>
            <input 
              type="text" 
              className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter admin username" 
            />
          </div>
          <div className="form-group mb-8 group">
            <label className="transition-colors group-focus-within:text-brand-blue">Password</label>
            <input 
              type="password" 
              className="form-control transition-all focus:ring-2 focus:ring-brand-blue/20" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter admin password" 
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-primary w-full py-3.5 text-base shadow-lg hover:shadow-xl hover:shadow-[#1a2b3d]/30 transition-all font-semibold bg-brand-dark hover:bg-[#1a2b3d] border-none" 
            onClick={handleLogin}
          >
            Access Dashboard
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
