import { useState } from 'react';
import { motion } from 'motion/react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ text: 'All fields are required.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No user logged in.');
      
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to update password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-brand-dark mb-2">Settings</h1>
        <p className="text-brand-gray font-medium">Configure store settings, payment methods, and account security.</p>
      </div>

      <div className="space-y-8">
        {/* Existing Payment Gateway Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border">
          <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
            <span className="text-2xl">💳</span> Payment Gateway Integration
          </h2>
          
          <div className="space-y-5 bg-brand-blue/5 p-5 rounded-2xl border border-brand-blue/20">
            <h3 className="font-bold text-brand-dark flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-green"></div>
              PayMongo Active
            </h3>
            <p className="text-sm text-brand-gray">
              Your store is currently connected to PayMongo for GCash processing. 
              Customers will be redirected to the secure PayMongo checkout page to complete their payments.
            </p>
          </div>
        </div>

        {/* Password Security Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border">
          <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
            <span className="text-2xl">🔒</span> Account Security
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-3 rounded-xl border border-brand-border" />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl border border-brand-border" />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 rounded-xl border border-brand-border" />
            </div>
            
            <button 
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl hover:bg-brand-dark/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            
            {message && (
              <p className={`text-sm font-bold ${message.type === 'success' ? 'text-brand-green' : 'text-red-500'}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
