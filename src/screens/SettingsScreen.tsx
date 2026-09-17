import React, { useState, useRef } from 'react';
import {
  Building2,
  Save,
  Download,
  Upload,
  Sparkles,
  Trash2,
  ShieldAlert,
  Smartphone,
  Wifi,
  WifiOff,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import type { Property } from '../types';
import {
  saveProperty,
  exportAllDataJson,
  importAllDataJson,
  seedSampleData,
  clearAllData
} from '../db/indexedDb';
import { useToast } from '../components/Toast';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { Modal } from '../components/Modal';

interface SettingsScreenProps {
  property: Property;
  onRefresh: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  property,
  onRefresh,
}) => {
  const { showSuccess, showError } = useToast();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Property edit state
  const [name, setName] = useState(property.name);
  const [ownerName, setOwnerName] = useState(property.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(property.ownerPhone);
  const [address, setAddress] = useState(property.address);
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Clear data confirmation modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      showError('Please fill in Property Name, Landlord Name, and Phone Number.');
      return;
    }

    try {
      setIsSavingProperty(true);
      const updated: Property = {
        ...property,
        name: name.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        address: address.trim(),
      };
      await saveProperty(updated);
      showSuccess('Property details updated successfully.');
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to save property details.');
    } finally {
      setIsSavingProperty(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportAllDataJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `CL_Lodges_Backup_${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess('Backup exported successfully! File saved to your device.');
    } catch (err) {
      console.error(err);
      showError('Failed to export backup.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        await importAllDataJson(content);
        showSuccess('Backup restored successfully! All data loaded.');
        onRefresh();
      } catch (err) {
        console.error(err);
        showError('Invalid backup file. Please provide a valid JSON backup file.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = async () => {
    try {
      await seedSampleData();
      showSuccess('Sample data loaded! 6 rooms, 4 tenants, and sample payments added.');
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to load sample data.');
    }
  };

  const handleExecuteClear = async () => {
    if (clearConfirmText.trim().toUpperCase() !== 'DELETE') {
      showError('Please type DELETE to confirm clearing all data.');
      return;
    }

    try {
      setIsClearing(true);
      await clearAllData();
      showSuccess('All database records cleared.');
      setIsClearModalOpen(false);
      setClearConfirmText('');
      window.location.reload();
    } catch (err) {
      console.error(err);
      showError('Failed to clear database.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500">App configuration, backups, and support</p>
      </div>

      {/* System / Offline Status Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-heading">
                {isOnline ? 'Internet Connected' : 'Offline Mode'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Offline Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              All records, calculations, and PDF receipts function with zero internet.
            </p>
          </div>
        </div>

        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 min-h-[40px]"
          >
            <Smartphone className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}
      </div>

      {/* SECTION 1: PROPERTY DETAILS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold font-heading text-slate-900">Property Details</h2>
        </div>

        <form onSubmit={handleSaveProperty} className="space-y-4">
          <div>
            <label htmlFor="settingsPropName" className="block text-xs font-semibold text-slate-700 mb-1">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              id="settingsPropName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CL LODGES AND HOMES / CL APARTMENTS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settingsOwnerName" className="block text-xs font-semibold text-slate-700 mb-1">
                Landlord / Manager Name <span className="text-red-500">*</span>
              </label>
              <input
                id="settingsOwnerName"
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Sendagire Razak"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="settingsOwnerPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="settingsOwnerPhone"
                type="tel"
                required
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. 0778030847 / 0778006886"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settingsAddress" className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Address
            </label>
            <input
              id="settingsAddress"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot 14, Ntinda-Kiwatule Road, Kampala"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProperty}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProperty ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: DATA MANAGEMENT & BACKUP */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Download className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-bold font-heading text-slate-900">Data Management & Backup</h2>
            <p className="text-xs text-slate-500">Back up your property records safely to your phone storage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs active:scale-98 transition min-h-[44px]"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Backup (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs active:scale-98 transition cursor-pointer min-h-[44px]">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import Backup (JSON)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Load Sample Data */}
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs active:scale-98 transition min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Load Sample Data</span>
          </button>

          {/* Clear All Data */}
          <button
            type="button"
            onClick={() => {
              setClearConfirmText('');
              setIsClearModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold shadow-xs active:scale-98 transition min-h-[44px]"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: ABOUT & DEVELOPER ATTRIBUTION */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold font-heading text-slate-900">About CL LODGES & HOMES / APARTMENTS</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="font-semibold text-slate-700">App Version</span>
            <span className="font-mono text-slate-900 font-bold">1.0.0</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="font-semibold text-slate-700">Target Region</span>
            <span className="text-slate-900 font-medium">Uganda (UGX Currency, MTN & Airtel MM)</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="font-semibold text-slate-700">Storage Architecture</span>
            <span className="text-emerald-700 font-bold">Client-Side IndexedDB (100% Offline)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 mt-4">
            <p className="font-bold text-slate-900 text-sm font-heading">
              Built by NileSites
            </p>
            <p className="text-xs text-slate-600">
              Professional Digital Solutions for Uganda
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href="https://nilesites.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
              >
                <span>nilesites.vercel.app</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-300">•</span>
              <a
                href="https://wa.me/256781234567?text=Hello%20NileSites,%20I%20am%20using%20CL%20Lodges%20and%20Homes%20and%20would%20like%20assistance."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CLEAR ALL DATA CONFIRMATION MODAL */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear All App Data"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600 space-y-1 pt-1">
              <p className="font-bold text-slate-900 text-sm">Are you absolutely sure?</p>
              <p>
                This will permanently delete all rooms, tenants, payments, receipts, and expenses stored in your browser.
              </p>
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <label htmlFor="confirmDeleteInput" className="block text-xs font-bold text-red-800">
              Type <span className="font-mono bg-red-100 px-1 py-0.5 rounded">DELETE</span> to confirm:
            </label>
            <input
              id="confirmDeleteInput"
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-red-300 bg-white focus:border-red-600 min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteClear}
              disabled={clearConfirmText.trim().toUpperCase() !== 'DELETE' || isClearing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 min-h-[44px]"
            >
              {isClearing ? 'Clearing...' : 'Permanently Clear All Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
