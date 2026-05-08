import { useState } from 'react';
import { useStore } from '../../lib/store';
import { Package, Plus } from 'lucide-react';

export default function Inventory() {
  const { inventory, setInventory, stockLog, setStockLog } = useStore();
  
  const [slimPrice, setSlimPrice] = useState(inventory.priceSlim.toString());
  const [roundPrice, setRoundPrice] = useState(inventory.priceRound.toString());
  
  const [slimAdd, setSlimAdd] = useState('');
  const [roundAdd, setRoundAdd] = useState('');

  const [alert, setAlert] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const showAlert = (msg: string, type: 'success' | 'error' = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const logAction = (msg: string) => {
    const newLog = [{ msg, time: Date.now() }, ...stockLog];
    setStockLog(newLog.slice(0, 20)); // Keep last 20
  };

  const addStock = (type: 'slim' | 'round') => {
    const qty = parseInt(type === 'slim' ? slimAdd : roundAdd);
    if (!qty || qty <= 0 || isNaN(qty)) return;
    
    setInventory({ ...inventory, [type]: inventory[type] + qty });
    logAction(`Added ${qty} ${type} gallons. New stock: ${inventory[type] + qty}`);
    showAlert('Stock updated successfully!');
    if (type === 'slim') setSlimAdd(''); else setRoundAdd('');
  };

  const setStock = (type: 'slim' | 'round') => {
    const qty = parseInt(type === 'slim' ? slimAdd : roundAdd);
    if (isNaN(qty) || qty < 0) return;
    
    setInventory({ ...inventory, [type]: qty });
    logAction(`Set ${type} gallon stock to ${qty}`);
    showAlert('Stock updated!');
    if (type === 'slim') setSlimAdd(''); else setRoundAdd('');
  };

  const savePricing = () => {
    const slim = parseFloat(slimPrice);
    const round = parseFloat(roundPrice);
    if (!slim || !round || slim <= 0 || round <= 0) return;
    
    setInventory({ ...inventory, priceSlim: slim, priceRound: round });
    logAction(`Updated pricing: Slim ₱${slim}, Round ₱${round}`);
    showAlert('Pricing saved!');
  };

  const maxSlim = 100;
  const maxRound = 80;
  const slimPct = Math.min(100, (inventory.slim / maxSlim) * 100);
  const roundPct = Math.min(100, (inventory.round / maxRound) * 100);
  const slimColor = inventory.slim < 10 ? 'bg-brand-red' : inventory.slim < 20 ? 'bg-brand-amber' : 'bg-brand-blue';
  const roundColor = inventory.round < 10 ? 'bg-brand-red' : inventory.round < 20 ? 'bg-brand-amber' : 'bg-brand-teal';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Inventory</h1>
          <p className="text-brand-gray">Manage gallon stock and pricing</p>
        </div>
      </div>

      {alert && (
        <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium ${alert.type === 'success' ? 'bg-brand-green-light text-brand-green border border-[#a5d6a7]' : 'bg-brand-red-light text-brand-red border border-[#ffcdd2]'}`}>
          {alert.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card !mb-0 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔵</span>
            <div>
              <div className="font-heading text-xl font-bold">Slim Gallons</div>
              <div className="text-sm text-brand-gray">₱{inventory.priceSlim} per gallon</div>
            </div>
          </div>
          
          <div className={`font-heading text-6xl font-extrabold mb-4 leading-none ${inventory.slim < 10 ? 'text-brand-red' : inventory.slim < 20 ? 'text-brand-amber' : 'text-brand-blue'}`}>
            {inventory.slim}
          </div>
          
          <div className="h-3 bg-brand-gray-light rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all duration-300 ${slimColor}`} style={{ width: `${slimPct}%` }} />
          </div>
          <div className="text-xs text-brand-gray mb-6">
            {inventory.slim} / {maxSlim} gallons in stock
          </div>
          
          {inventory.slim < 10 && (
            <div className="bg-brand-red-light text-brand-red px-3 py-2 rounded-lg text-xs font-semibold mb-4">
              ⚠️ Low stock! Restock soon.
            </div>
          )}
          
          <div className="mt-auto flex gap-2">
            <input 
              type="number" 
              className="form-control w-24 text-center py-2" 
              placeholder="Qty" 
              min="0"
              value={slimAdd}
              onChange={e => setSlimAdd(e.target.value)}
            />
            <button className="btn btn-primary btn-sm flex-1" onClick={() => addStock('slim')}><Plus size={16}/> Add</button>
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => setStock('slim')}>Set Exact</button>
          </div>
        </div>

        <div className="card !mb-0 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🟢</span>
            <div>
              <div className="font-heading text-xl font-bold">Round Gallons</div>
              <div className="text-sm text-brand-gray">₱{inventory.priceRound} per gallon</div>
            </div>
          </div>
          
          <div className={`font-heading text-6xl font-extrabold mb-4 leading-none ${inventory.round < 10 ? 'text-brand-red' : inventory.round < 20 ? 'text-brand-amber' : 'text-brand-teal'}`}>
            {inventory.round}
          </div>
          
          <div className="h-3 bg-brand-gray-light rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all duration-300 ${roundColor}`} style={{ width: `${roundPct}%` }} />
          </div>
          <div className="text-xs text-brand-gray mb-6">
            {inventory.round} / {maxRound} gallons in stock
          </div>
          
          {inventory.round < 10 && (
            <div className="bg-brand-red-light text-brand-red px-3 py-2 rounded-lg text-xs font-semibold mb-4">
              ⚠️ Low stock! Restock soon.
            </div>
          )}
          
          <div className="mt-auto flex gap-2">
            <input 
              type="number" 
              className="form-control w-24 text-center py-2" 
              placeholder="Qty" 
              min="0"
              value={roundAdd}
              onChange={e => setRoundAdd(e.target.value)}
            />
            <button className="btn btn-primary btn-sm flex-1" onClick={() => addStock('round')}><Plus size={16}/> Add</button>
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => setStock('round')}>Set Exact</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="card-title mb-6 flex items-center gap-2"><Package size={20} className="text-brand-blue" /> Update Pricing</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="form-group !mb-0">
              <label>Slim Gallon Price (₱)</label>
              <input type="number" className="form-control" min="1" value={slimPrice} onChange={e => setSlimPrice(e.target.value)} />
            </div>
            <div className="form-group !mb-0">
              <label>Round Gallon Price (₱)</label>
              <input type="number" className="form-control" min="1" value={roundPrice} onChange={e => setRoundPrice(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={savePricing}>Save Pricing</button>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">Stock History</h2>
          <div className="space-y-0 max-h-48 overflow-y-auto pr-2">
            {stockLog.length > 0 ? stockLog.map((l, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-[#f0f3f8] text-sm last:border-0">
                <span className="font-medium">{l.msg}</span>
                <span className="text-xs text-brand-gray">
                  {new Date(l.time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )) : (
              <div className="text-brand-gray text-sm py-4 text-center">No adjustments recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
