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
    adminPayeeName: '',
    enablePaymentSystem: true
  });

  const [healing, setHealing] = useState(false);
  const [showHealConfirm, setShowHealConfirm] = useState(false);
  const [healResult, setHealResult] = useState<{
    success: boolean;
    healedCount: number;
    updatedRows: number;
    message?: string;
  } | null>(null);

  const handleHealDatabase = async () => {
    setShowHealConfirm(false);
    setHealing(true);
    setHealResult(null);
    try {
      const result = await api.healStudentIds();
      setHealResult(result);
      if (result.success) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", {
          detail: `Successfully repaired database! Healed: ${result.healedCount} students, Updated: ${result.updatedRows} reference rows.`
        }));
        clearCache('users_general'); // Clear users cache
      } else {
        window.dispatchEvent(new CustomEvent("show-custom-alert", {
          detail: "Failed to repair database."
        }));
      }
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-custom-alert", {
        detail: "Error occurred: " + String(err)
      }));
    } finally {
      setHealing(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        const ann = await api.getAnnouncement();
        setAnnouncement(ann);
        setSettings({
          adminUpiId: data.adminUpiId || '',
          adminPayeeName: data.adminPayeeName || '',
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
        adminPayeeName: settings.adminPayeeName,
        enablePaymentSystem: settings.enablePaymentSystem
      });
      await api.saveAnnouncement(announcement);
      clearCache('settings_general'); // Invalidate cache so next read gets fresh data
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Settings saved successfully!" }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Failed to save settings: " + String(err) }));
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
                <label className="block text-xs font-bold uppercase">Your UPI ID (For QR & Direct Pay)</label>
                <input 
                  type="text" 
                  value={settings.adminUpiId} 
                  onChange={e => setSettings({...settings, adminUpiId: e.target.value})} 
                  placeholder="e.g. saikat@okhdfcbank"
                  disabled={!settings.enablePaymentSystem}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none"
                />
                <p className="text-xs text-zinc-500">Students will use this UPI ID to make fee payments via deep-link or QR code.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase">Payee Name (Displayed in UPI Apps)</label>
                <input 
                  type="text" 
                  value={settings.adminPayeeName} 
                  onChange={e => setSettings({...settings, adminPayeeName: e.target.value})} 
                  placeholder="e.g. Saikat Mondal"
                  disabled={!settings.enablePaymentSystem}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none"
                />
                <p className="text-xs text-zinc-500">The verified name associated with the UPI ID shown on banking apps.</p>
              </div>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium space-y-1">
                <div className="font-bold text-zinc-800 dark:text-zinc-200">ℹ️ নিয়মাবলী (UPI & Cash Rules):</div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  যদি UPI ID বা Payee Name ফাঁকা (empty) থাকে, তবে ছাত্রদের পেমেন্ট পেজে UPI বিকল্পটি সম্পূর্ণ লুকানো থাকবে এবং শুধুমাত্র <strong>Cash</strong> পেমেন্টের বিকল্প প্রদর্শিত হবে।
                </div>
              </div>
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

      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] max-w-2xl mt-6">
        <h3 className="font-black uppercase border-b-2 border-zinc-200 dark:border-zinc-800 pb-2 text-yellow-600 dark:text-yellow-400">Database Repair & ID Alignment Tools</h3>
        <p className="text-xs font-bold text-zinc-500 mt-2 mb-4">
          If student names, emails, or payment details are showing incorrectly (clashed/merged due to duplicate historic IDs), run this tool to align all student IDs to be unique and update their references.
          <span className="block mt-2 text-red-600 dark:text-red-400 font-extrabold uppercase">⚠️ গুরুত্বপূর্ণ সতর্কতা: আইডি এলাইনমেন্ট সফল হওয়ার পর সকল স্টুডেন্টদের তাদের অ্যাপ থেকে Logout করে আবার Login করতে হবে, অন্যথায় ব্রাউজারে থাকা পুরনো সেশন আইডির কারণে পেমেন্ট ও পরীক্ষার তথ্য ভুল দেখাতে পারে।</span>
        </p>

        <button
          onClick={() => setShowHealConfirm(true)}
          disabled={healing}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold uppercase text-xs px-4 py-3 border-2 border-zinc-900 dark:border-zinc-100 hover:-translate-y-0.5 transition-transform flex items-center gap-2"
        >
          {healing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          ⚡ Run Database ID Alignment & Healing
        </button>

        {showHealConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)]">
              <h3 className="font-black text-xl uppercase mb-4 text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">
                Confirm Database Self-Healing
              </h3>
              <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-6">
                Are you sure you want to run database self-healing? This will verify all student IDs, repair duplicate and empty IDs, and fix reference rows in payments, attendance, and exam results to resolve clashes permanently.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleHealDatabase}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase py-3 border-2 border-zinc-900 dark:border-zinc-100 transition-transform"
                >
                  Yes, Heal Database
                </button>
                <button
                  onClick={() => setShowHealConfirm(false)}
                  className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black uppercase py-3 border-2 border-zinc-900 dark:border-zinc-100 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {healResult && (
          <div className="mt-4 p-4 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono space-y-1">
            <div className="font-bold text-emerald-600 uppercase">Alignment Complete:</div>
            <div>- Reassigned Duplicate/Blank IDs: <span className="font-bold">{healResult.healedCount}</span> students</div>
            <div>- Aligned reference rows updated: <span className="font-bold">{healResult.updatedRows}</span> rows (payments/attendance/results)</div>
            <div className="text-[10px] text-zinc-400 mt-2 uppercase">Please refresh the application (Ctrl+F5) after running.</div>
          </div>
        )}
      </div>
    </div>
  );
}
