import { useState } from 'react';
import { motion } from 'motion/react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // GCash Settings State
  const [gcashName, setGcashName] = useState(settings.gcashName || '');
  const [gcashNumber, setGcashNumber] = useState(settings.gcashNumber || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl || '');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

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

  const handleSaveSettings = () => {
    setSettings({
      ...settings,
      gcashName,
      gcashNumber,
      qrCodeUrl
    });
    setSettingsMessage('GCash settings updated successfully!');
    setTimeout(() => setSettingsMessage(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-brand-dark mb-2">Settings</h1>
        <p className="text-brand-gray font-medium">Configure store settings, payment methods, GCash QR code, and account security.</p>
      </div>

      <div className="space-y-8">
        {/* GCash Account & QR Code Settings */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border">
          <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
            <span className="text-2xl">📱</span> GCash Account & QR Code Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">GCash Account Name</label>
              <input 
                type="text" 
                value={gcashName} 
                onChange={(e) => setGcashName(e.target.value)} 
                placeholder="e.g. Aqua Gel Water Station" 
                className="w-full p-3 rounded-xl border border-brand-border" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">GCash Number</label>
              <input 
                type="text" 
                value={gcashNumber} 
                onChange={(e) => setGcashNumber(e.target.value)} 
                placeholder="e.g. 09171234567" 
                className="w-full p-3 rounded-xl border border-brand-border" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-dark mb-1">GCash QR Code Image</label>
              {qrCodeUrl && (
                <div className="mb-3">
                  <img src={qrCodeUrl} alt="GCash QR Code" className="w-36 h-36 object-contain border border-brand-border rounded-xl p-2 bg-slate-50 shadow-xs" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setQrCodeUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
                className="w-full p-3 rounded-xl border border-brand-border text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20"
              />
            </div>

            <button 
              onClick={handleSaveSettings}
              className="w-full bg-[#0a6ed1] text-white font-bold py-3 rounded-xl hover:bg-[#085ab3] transition-colors shadow-sm"
            >
              Save GCash Settings
            </button>

            {settingsMessage && (
              <p className="text-sm font-bold text-brand-green">
                {settingsMessage}
              </p>
            )}
          </div>
        </div>

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
