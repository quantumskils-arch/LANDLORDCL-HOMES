import React, { useState } from 'react';
import { Building2, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import type { Property } from '../types';
import { saveProperty, seedSampleData } from '../db/indexedDb';
import { useToast } from './Toast';

interface SetupScreenProps {
  onComplete: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const { showSuccess, showError } = useToast();
  const [propertyName, setPropertyName] = useState('CL LODGES AND HOMES / CL APARTMENTS');
  const [ownerName, setOwnerName] = useState('Sendagire Razak');
  const [ownerPhone, setOwnerPhone] = useState('0778030847 / 0778006886');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyName.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      showError('Please fill in Property Name, Your Name, and Your Phone Number');
      return;
    }

    try {
      setIsSubmitting(true);
      const property: Property = {
        id: 'property',
        name: propertyName.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        address: address.trim(),
        lastReceiptNumber: 0,
        createdAt: new Date().toISOString(),
      };
      await saveProperty(property);
      showSuccess(`Welcome! ${property.name} is ready.`);
      onComplete();
    } catch (err) {
      console.error(err);
      showError('Failed to save property setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSampleData = async () => {
    try {
      setIsSeeding(true);
      await seedSampleData();
      showSuccess('Sample data loaded! 6 rooms, 4 tenants, and sample payments are ready.');
      onComplete();
    } catch (err) {
      console.error(err);
      showError('Failed to load sample data.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-black mx-auto flex items-center justify-center shadow-xl shadow-emerald-600/20 border border-emerald-500/30">
            <Building2 className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            Welcome to CL LODGES & HOMES
          </h1>
          <p className="text-sm text-slate-300 font-sans">
            Rental Property Management • Uganda
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs mt-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Offline-First • Safe on Your Phone</span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          <div>
            <h2 className="text-lg font-bold font-heading text-white">Let's set up your property</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your property details below or load sample data to explore right away.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label htmlFor="propertyName" className="block text-xs font-semibold text-slate-300 mb-1">
                Property Name <span className="text-red-400">*</span>
              </label>
              <input
                id="propertyName"
                type="text"
                required
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. CL LODGES AND HOMES / CL APARTMENTS"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="ownerName" className="block text-xs font-semibold text-slate-300 mb-1">
                Your Full Name (Landlord / Manager) <span className="text-red-400">*</span>
              </label>
              <input
                id="ownerName"
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Sendagire Razak"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="ownerPhone" className="block text-xs font-semibold text-slate-300 mb-1">
                Your Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                id="ownerPhone"
                type="tel"
                required
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. 0778030847 / 0778006886"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Appears on tenant payment receipts & WhatsApp messages</span>
            </div>

            <div>
              <label htmlFor="address" className="block text-xs font-semibold text-slate-300 mb-1">
                Physical Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Kiwatule-Ntinda Road, Kampala"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition min-h-[44px]"
              />
            </div>

            <button
              id="get-started-button"
              type="submit"
              disabled={isSubmitting || isSeeding}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
            >
              <span>{isSubmitting ? 'Setting up...' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Sample Data Seeder Option */}
          <div className="pt-4 border-t border-slate-700/80">
            <div className="text-center">
              <span className="text-xs text-slate-400 block mb-2">Want to try it out first?</span>
              <button
                id="load-sample-data-button"
                type="button"
                onClick={handleLoadSampleData}
                disabled={isSubmitting || isSeeding}
                className="w-full py-2.5 px-4 bg-slate-700/70 hover:bg-slate-700 active:scale-98 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{isSeeding ? 'Loading sample data...' : 'Load Sample Data (6 Rooms, 4 Tenants)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Attribution */}
        <p className="text-center text-[11px] text-slate-500">
          Built by NileSites — Professional Digital Solutions for Uganda<br />
          <a
            href="https://nilesites.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline"
          >
            nilesites.vercel.app
          </a>
        </p>
      </div>
    </div>
  );
};
