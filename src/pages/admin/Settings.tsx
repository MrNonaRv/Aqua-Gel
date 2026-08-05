import { motion } from 'motion/react';

export default function Settings() {
  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-brand-dark mb-2">Settings</h1>
        <p className="text-brand-gray font-medium">Configure store settings and payment methods.</p>
      </div>

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
          <p className="text-xs font-semibold text-brand-dark uppercase tracking-wider mt-2">
            API Keys are configured via environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
