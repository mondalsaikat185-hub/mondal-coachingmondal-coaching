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
    enablePaymentSystem: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        const ann = await api.getAnnouncement();
        setAnnouncement(ann);
        setSettings({
          adminUpiId: data.adminUpiId || '',
          enablePaymentSystem: data.enablePaymentSystem !== false
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
        enablePaymentSystem: settings.enablePaymentSystem
      });
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
              placeholder="e.g., Classes are cancelled today due to rain."
              className="w-full bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 p-3 font-bold text-sm min-h-[100px]"
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

            <div className={`space-y-2 pl-8 opacity-${settings.enablePaymentSystem ? '100' : '50'}`}>
              <label className="block text-xs font-bold uppercase">Your UPI ID (For Scan to Pay)</label>
              <input 
                type="text" 
                value={settings.adminUpiId} 
                onChange={e => setSettings({...settings, adminUpiId: e.target.value})}
                placeholder="e.g. name@bank"
                disabled={!settings.enablePaymentSystem}
                className="w-full border-2 border-zinc-900 dark:border-zinc-400 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-2 font-mono text-sm"
              />
            </div>
          </div>

          {/* Announcement */}
          <div className="border-2 border-zinc-900 dark:border-zinc-100 p-4">
            <h3 className="font-black uppercase text-sm mb-3">Announcement Banner</h3>
            <p className="text-xs text-zinc-500 mb-3">This message appears on the student dashboard. Leave blank to hide.</p>
            <textarea
              rows={3}
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="e.g. Class postponed tomorrow..."
              className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-2 text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
