import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { api } from '../lib/api';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from './Pages';
import { clearCache } from '../lib/cache';

export function AdminSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [settings, setSettings] = useState({
    adminUpiId: '',
    enablePaymentSystem: true,
    paymentMethod: 'manual',
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        const ann = await api.getAnnouncement();
        setAnnouncement(ann);
        setSettings({
          adminUpiId: data.adminUpiId || '',
          enablePaymentSystem: data.enablePaymentSystem !== false,
          paymentMethod: data.paymentMethod || 'manual',
          razorpayKeyId: data.razorpayKeyId || '',
          razorpayKeySecret: data.razorpayKeySecret || ''
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.saveSettings({
        adminUpiId: settings.adminUpiId,
        enablePaymentSystem: settings.enablePaymentSystem,
        paymentMethod: settings.paymentMethod,
        razorpayKeyId: settings.razorpayKeyId,
        razorpayKeySecret: settings.razorpayKeySecret
      });
      await api.saveAnnouncement(announcement);
      clearCache('settings_general'); // Invalidate cache so next read gets fresh data
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <PageHeader title="Platform Settings" description="Configure global platform behavior" backTo="/admin" />

      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4 mb-8">
            <h3 className="font-black uppercase border-b-2 border-zinc-200 dark:border-zinc-800 pb-2 text-red-600">Global Announcement (Urgent Notice)</h3>
            <p className="text-xs font-bold text-zinc-500">This message will appear at the top of the Student Dashboard for all students. Leave empty to remove.</p>
            <textarea 
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="e.g., Classes are postponed today due to rain."
              className="w-full bg-red-50/50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 p-3 font-bold text-sm min-h-[100px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-black uppercase border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">Payment System Configuration</h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.enablePaymentSystem} 
                onChange={e => setSettings({...settings, enablePaymentSystem: e.target.checked})}
                className="w-5 h-5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
              />
              <span className="font-bold text-sm uppercase">Enable Payment Tracking System</span>
            </label>
            <p className="text-xs text-zinc-500 pl-8">If disabled, the payment options will be hidden for students.</p>

            <div className={`space-y-4 pl-8 opacity-${settings.enablePaymentSystem ? '100' : '50'}`}>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase">Payment Method</label>
                <select
                  value={settings.paymentMethod}
                  onChange={e => setSettings({...settings, paymentMethod: e.target.value})}
                  disabled={!settings.enablePaymentSystem}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none font-bold"
                >
                  <option value="manual" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Manual UPI Scan & Admin Review</option>
                  <option value="gateway" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Automated Razorpay Payment Gateway (Instant Approval)</option>
                </select>
                <p className="text-xs text-zinc-500">Choose between manual student UPI reporting or instant automated gateway checkout.</p>
              </div>

              {settings.paymentMethod === 'manual' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase">Your UPI ID (For Scan to Pay)</label>
                  <input 
                    type="text" 
                    value={settings.adminUpiId} 
                    onChange={e => setSettings({...settings, adminUpiId: e.target.value})}
                    placeholder="e.g. name@bank"
                    disabled={!settings.enablePaymentSystem}
                    className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none"
                  />
                  <p className="text-xs text-zinc-500">Students will use this UPI ID to make fee payments.</p>
                </div>
              ) : (
                <div className="space-y-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-4">
                  <div className="text-xs font-black uppercase text-yellow-600 dark:text-yellow-400">Razorpay API Credentials (Test or Live)</div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase">Razorpay Key ID</label>
                    <input 
                      type="text" 
                      value={settings.razorpayKeyId} 
                      onChange={e => setSettings({...settings, razorpayKeyId: e.target.value})}
                      placeholder="rzp_test_xxxxxxxxxxxxxx"
                      disabled={!settings.enablePaymentSystem}
                      className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase">Razorpay Key Secret</label>
                    <input 
                      type="password" 
                      value={settings.razorpayKeySecret} 
                      onChange={e => setSettings({...settings, razorpayKeySecret: e.target.value})}
                      placeholder="••••••••••••••••••••••••"
                      disabled={!settings.enablePaymentSystem}
                      className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none font-mono"
                    />
                    <p className="text-[10px] text-zinc-500">Your key credentials are securely stored in the Google Apps Script script properties.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-zinc-200 dark:border-zinc-800">
             <button type="submit" disabled={saving} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-sm px-6 py-3 hover:-translate-y-0.5 transition-transform border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:shadow-[6px_6px_0px_0px_rgba(161,161,170,1)] flex items-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Settings
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
