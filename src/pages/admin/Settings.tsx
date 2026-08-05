import { useState } from 'react';
import { useStore } from '../../lib/store';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [gcashName, setGcashName] = useState(settings.gcashName);
  const [gcashNumber, setGcashNumber] = useState(settings.gcashNumber);
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSettings({
      gcashName,
      gcashNumber,
      qrCodeUrl
    });
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-brand-dark mb-2">Settings</h1>
        <p className="text-brand-gray font-medium">Configure store settings and payment methods.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border">
        <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
          <span className="text-2xl">📱</span> GCash / QRPh Settings
        </h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-dark">GCash Account Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={gcashName} 
              onChange={e => setGcashName(e.target.value)} 
              placeholder="e.g. Aqua Gel Station" 
            />
            <p className="text-xs text-brand-gray mt-1 font-medium">This name will be shown to customers when they choose to pay via QRPh.</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-dark">GCash Number</label>
            <input 
              type="text" 
              className="form-control font-mono" 
              value={gcashNumber} 
              onChange={e => setGcashNumber(e.target.value)} 
              placeholder="e.g. 0917-123-4567" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-dark">QR Code Image URL</label>
            <input 
              type="text" 
              className="form-control" 
              value={qrCodeUrl} 
              onChange={e => setQrCodeUrl(e.target.value)} 
              placeholder="https://example.com/my-qr-code.jpg" 
            />
            <p className="text-xs text-brand-gray mt-1 font-medium">Provide a public URL to your QR code image (JPG, PNG). If left empty, a placeholder icon will be shown.</p>
            
            {qrCodeUrl && (
              <div className="mt-4 p-4 border border-brand-border rounded-xl bg-brand-gray-light/30 inline-block">
                <p className="text-xs font-bold text-brand-dark mb-2 uppercase tracking-wider">Preview</p>
                <img src={qrCodeUrl} alt="QR Preview" className="w-32 h-32 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-between">
          <div>
            {saveSuccess && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-brand-green font-bold text-sm bg-brand-green/10 px-3 py-1.5 rounded-lg"
              >
                Settings saved successfully!
              </motion.span>
            )}
          </div>
          <button onClick={handleSave} className="btn btn-primary px-6 py-2.5 flex items-center gap-2">
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
