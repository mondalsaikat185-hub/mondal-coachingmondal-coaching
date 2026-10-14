import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { useAuth } from '../components/AuthProvider';
import { showToast } from '../lib/toast';
import { confirmAsync } from '../lib/confirmDialog';
import { Payment, PageHeader, formatDateTimeSafe, getMonthPickerList, validateConsecutiveRule, getDueMonths } from './Pages';

let globalPaymentsListCache: any = null;
const globalStudentPaymentsCache: Record<string, { data: Payment[]; time: number }> = {};
const CACHE_TTL = 2 * 60 * 1000;

export function StudentPayments() {
  const { user } = useAuth();
  
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (user?.uid && globalStudentPaymentsCache[user.uid] && Date.now() - globalStudentPaymentsCache[user.uid].time < CACHE_TTL) {
      return globalStudentPaymentsCache[user.uid].data;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    return !(user?.uid && globalStudentPaymentsCache[user.uid] && Date.now() - globalStudentPaymentsCache[user.uid].time < CACHE_TTL);
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [proofImage, setProofImage] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("mc_cached_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.data) return parsed.data;
      }
    } catch (e) {}
    return {
      adminUpiId: '',
      adminPayeeName: '',
      enablePaymentSystem: true
    };
  });

  const [settingsLoaded, setSettingsLoaded] = useState(() => {
    try {
      const cached = localStorage.getItem("mc_cached_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.data) return true;
      }
    } catch (e) {}
    return false;
  });

  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>(() => {
    try {
      const cached = localStorage.getItem("mc_cached_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data?.adminUpiId?.trim() && parsed?.data?.adminPayeeName?.trim()) {
          return 'upi';
        } else if (parsed?.data) {
          return 'cash';
        }
      }
    } catch (e) {}
    return 'upi';
  });

  const pickerMonths = getMonthPickerList();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([pickerMonths[0]]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject('Canvas context failed'); return; }
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedBase64);
        };
        img.onerror = () => reject('Image load failed');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('File read failed');
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: 'Please select an image file (JPG, PNG, etc.)' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: 'File too large. Maximum 10MB allowed.' }));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setProofImage(compressed);
      setImagePreview(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: 'Failed to process image. Please try again.' }));
    }
  };

  const monthlyFeeAmount = Number(user?.monthlyFee) || 0;
  const isFeeWaived = user?.monthlyFee === 0 || user?.monthlyFee === "0";
  const feePerMonth = monthlyFeeAmount > 0 ? monthlyFeeAmount : 500;
  const calculatedAmount = selectedMonths.length * feePerMonth;

  useEffect(() => {
     if (!user) return;
     
     const loadSettings = async () => {
       try {
         const generalSettings = await api.getSettings();
         const adminUpiId = generalSettings?.adminUpiId || '';
         const adminPayeeName = generalSettings?.adminPayeeName || '';
         const enablePaymentSystem = generalSettings?.enablePaymentSystem !== false;

         setSettings({
           adminUpiId,
           adminPayeeName,
           enablePaymentSystem
         });

         if (adminUpiId.trim() && adminPayeeName.trim()) {
           setPaymentMode('upi');
         } else {
           setPaymentMode('cash');
         }
       } catch (err) {
         console.error("Failed to load settings:", err);
       } finally {
         setSettingsLoaded(true);
       }
     };
     loadSettings();

     const fetchPayments = async () => {
       try {
         const rawPayments = await api.getPayments();
         const studentPayments = rawPayments.filter(p => p.studentId === user.uid);
         const data: Payment[] = studentPayments.map(p => ({
           id: p.id,
           studentId: p.studentId,
           studentName: user.fullName || user.displayName || 'Unknown Student',
           studentEmail: user.email || '',
           amount: p.amount,
           month: p.month,
           status: p.status as any,
           remarks: (p as any).remarks || '',
           transactionId: (p as any).transactionId || '',
           proofImage: (p as any).proofImage || '',
           paymentMode: (p as any).paymentMode || 'manual',
           createdAt: p.createdAt
         }));
         const getMs = (t: any) => new Date(t).getTime() || 0;
         data.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
         setPayments(data);
         if (user?.uid) {
           globalStudentPaymentsCache[user.uid] = { data, time: Date.now() };
         }
         setLoading(false);
       } catch (error) {
         console.error("Payment fetch error:", error);
         setLoading(false);
       }
     };

     fetchPayments();
  }, [user?.uid]);

  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter(x => x !== m));
    } else {
      setSelectedMonths([...selectedMonths, m]);
    }
  };

  const hasUpi = Boolean(settings.adminUpiId.trim() && settings.adminPayeeName.trim());

  // UPI link construction (tn <= 48 safe alphanumeric + space chars)
  const cleanName = (user?.fullName || user?.displayName || 'Student').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const cleanMonths = selectedMonths.join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const rawNote = `${cleanName} ${cleanMonths}`.trim().slice(0, 48);
  const upiLink = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(settings.adminUpiId.trim())}&pn=${encodeURIComponent(settings.adminPayeeName.trim())}&am=${Number(calculatedAmount).toFixed(2)}&tn=${encodeURIComponent(rawNote)}&cu=INR`
    : '';

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedMonths.length === 0) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "কমপক্ষে একটি মাস নির্বাচন করুন।" }));
      return;
    }

    if (isFeeWaived) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "আপনার fee waived করা আছে। Payment submit করার প্রয়োজন নেই।" }));
      return;
    }

    // 1. Check duplicate / already covered months
    const paidOrPendingMonths = payments
      .filter(p => p.status === 'approved' || p.status === 'pending' || p.status === 'paid')
      .flatMap(p => p.month ? String(p.month).split(/[,;\n]+/).map(m => m.trim().toLowerCase()) : []);
    const overlap = selectedMonths.some(m => paidOrPendingMonths.includes(m.trim().toLowerCase()));
    if (overlap) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "নির্বাচিত মাসের পেমেন্ট ইতিমধ্যে জমা করা বা অনুমোদিত হয়েছে।" }));
      return;
    }

    // 2. Consecutive Rule (strictly for months >= October 2026; prior months ignored)
    const consecutiveCheck = validateConsecutiveRule(selectedMonths, payments, (user as any).excusedMonths);
    if (!consecutiveCheck.valid) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: `আগে বাকি মাস (${consecutiveCheck.missingMonth}) পরিশোধ করুন` }));
      return;
    }

    // 3. Mode-specific validation
    const mode = hasUpi ? paymentMode : 'cash';
    let finalUtr = '';
    if (mode === 'upi') {
      finalUtr = utrNumber.trim();
      if (finalUtr && !/^\d{12}$/.test(finalUtr)) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "সঠিক ১২ সংখ্যার UTR / ট্রানজাকশন নম্বর লিখুন (Must be exactly 12 numeric digits)." }));
        return;
      }
    }

    if ((user as any).isSimulatedAdmin) {
       const isRealStudent = localStorage.getItem('simulatedStudentId');
       if (!isRealStudent) {
         window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Please select a real student from the dropdown above to test payment submission." }));
         return;
       }
    }

    try {
      setSubmitting(true);
      const paymentData: any = {
        studentId: user.uid,
        studentName: user.fullName || user.displayName || 'Unknown Student',
        studentEmail: user.email || '',
        month: selectedMonths.join(', '),
        amount: calculatedAmount,
        status: 'pending',
        paymentMode: mode,
        transactionId: finalUtr,
        proofImage: mode === 'upi' ? (proofImage || '') : ''
      };

      const res: any = await api.submitPaymentRequest(paymentData);
      if (res && res.error) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: res.error }));
        return;
      }

      setSelectedMonths([pickerMonths[0]]);
      setUtrNumber('');
      setProofImage('');
      setImagePreview('');
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 4000);

      // Refresh payments list
      const rawPayments = await api.getPayments();
      const studentPayments = rawPayments.filter(p => p.studentId === user.uid);
      const data: Payment[] = studentPayments.map(p => ({
        id: p.id,
        studentId: p.studentId,
        studentName: user.fullName || user.displayName || 'Unknown Student',
        studentEmail: user.email || '',
        amount: p.amount,
        month: p.month,
        status: p.status as any,
        remarks: (p as any).remarks || '',
        transactionId: (p as any).transactionId || '',
        proofImage: (p as any).proofImage || '',
        paymentMode: (p as any).paymentMode || 'manual',
        createdAt: p.createdAt
      }));
      const getMs = (t: any) => new Date(t).getTime() || 0;
      data.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
      setPayments(data);
      if (user?.uid) {
        globalStudentPaymentsCache[user.uid] = { data, time: Date.now() };
      }
      globalPaymentsListCache = null;
    } catch (error: any) {
      console.error("handleSubmitPayment error:", error);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "পেমেন্ট জমা দিতে সমস্যা হয়েছে: " + (error?.message || String(error)) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
      <PageHeader title="Fees & Payments" backTo="/student" />
      
      {user && (user as any).pendingMonths > 0 && (
         <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-600 dark:border-red-500 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
            <div>
               <h3 className="font-black text-red-800 dark:text-red-400 uppercase">Payment Pending</h3>
               <p className="text-sm font-bold text-red-700 dark:text-red-300">You have fees pending for: <span className="underline">{getDueMonths((user as any).pendingMonths, payments)}</span>. Please clear them as soon as possible.</p>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-yellow-300 dark:bg-yellow-600 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] h-max flex flex-col text-zinc-900">
          <h3 className="font-black uppercase mb-4 text-xl">Submit Payment</h3>
          
          {!settings.enablePaymentSystem ? (
             <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-400 flex flex-col justify-center items-center gap-4 text-center mt-4">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Online payment submission is currently disabled by the administrator.</p>
             </div>
          ) : isFeeWaived ? (
             <div className="mb-6 p-4 bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-600 flex flex-col justify-center items-center gap-4 text-center mt-4">
                <h3 className="font-black text-emerald-800 dark:text-emerald-400 uppercase text-lg">Fee Waived</h3>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Your monthly fee is set to ₹0. You don't have any pending fees.</p>
                {(user as any)?.exemptReason && (
                   <div className="mt-2 text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-600 px-2 py-1">
                      REASON: {(user as any)?.exemptReason}
                   </div>
                )}
             </div>
          ) : (
          <>
          {paymentSuccess && (
            <div className="mb-4 bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-600 p-4 text-emerald-800 dark:text-emerald-400 font-bold uppercase text-xs flex items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(5,150,105,1)]">
              ✅ Payment request submitted! Admin will verify shortly.
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="flex flex-col gap-4">
             {/* 1. Month Picker */}
             <div className="bg-white dark:bg-zinc-900 p-4 border-2 border-zinc-900 dark:border-zinc-100 dark:text-white">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-black uppercase">মাস নির্বাচন করুন (Select Months)</label>
                   <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{selectedMonths.length} SELECTED</span>
                </div>
                <div className="max-h-52 overflow-y-auto border-2 border-zinc-200 dark:border-zinc-700 p-1 space-y-1 bg-zinc-50 dark:bg-zinc-950">
                  {pickerMonths.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors flex justify-between items-center ${
                        selectedMonths.includes(m) 
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span>{m}</span>
                      {selectedMonths.includes(m) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-medium">ক্লিক করে এক বা একাধিক মাস একসাথে সিলেক্ট করুন।</p>
             </div>

             {/* 2. Amount Summary */}
             <div className="bg-white dark:bg-zinc-900 p-4 border-2 border-zinc-900 dark:border-zinc-100 dark:text-white">
                <label className="block text-xs font-bold uppercase mb-1">মোট প্রদেয় ফি (Total Amount)</label>
                <div className="text-2xl font-black text-center font-mono py-1">
                  ₹{calculatedAmount}
                  <span className="text-xs font-bold text-zinc-500 ml-2 font-sans">({selectedMonths.length} × ₹{feePerMonth})</span>
                </div>
             </div>

             {/* 3. Payment Mode Tabs */}
             {!settingsLoaded ? (
               <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-400 text-xs font-bold text-center text-zinc-500 animate-pulse">
                 পেমেন্ট অপশন লোড হচ্ছে...
               </div>
             ) : hasUpi ? (
               <div className="flex p-1 gap-3">
                 <button
                   type="button"
                   onClick={() => setPaymentMode('upi')}
                   className={`flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all active:translate-y-1 ${
                     paymentMode === 'upi' ? 'bg-gradient-to-b from-violet-500 to-purple-700 text-white border-2 border-purple-900 shadow-[0_4px_0_0_#3b0764] -translate-y-0.5' : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-400 shadow-[0_3px_0_0_#a1a1aa]'
                   }`}
                 >
                   📱 Pay via UPI
                 </button>
                 <button
                   type="button"
                   onClick={() => setPaymentMode('cash')}
                   className={`flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all active:translate-y-1 ${
                     paymentMode === 'cash' ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border-2 border-emerald-900 shadow-[0_4px_0_0_#064e3b] -translate-y-0.5' : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-400 shadow-[0_3px_0_0_#a1a1aa]'
                   }`}
                 >
                   💵 Pay in Cash
                 </button>
               </div>
             ) : (
               <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-400 text-xs font-bold text-center text-zinc-700 dark:text-zinc-300">
                 💵 Cash Payment (শিক্ষককে সরাসরি নগদ প্রদান)
               </div>
             )}

             {/* 4. Payment Mode Details */}
             {hasUpi && paymentMode === 'upi' ? (
               <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 text-center flex flex-col items-center">
                  <div className="text-xs font-black uppercase mb-3 dark:text-yellow-100">QR কোড স্ক্যান করে পে করুন</div>
                  <div className="bg-white p-2 border-2 border-zinc-900 inline-block mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                     <QRCodeSVG value={upiLink} size={150} />
                  </div>
                  
                  <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                     UPI ID: <span className="font-mono font-black text-black dark:text-white select-all">{settings.adminUpiId}</span>
                  </div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-3">
                     Payee: {settings.adminPayeeName}
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 w-full mb-3">
                     <button
                       type="button"
                       onClick={() => {
                          navigator.clipboard.writeText(settings.adminUpiId);
                          window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: 'UPI ID কপি করা হয়েছে!' }));
                       }}
                       className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-400 font-black uppercase text-xs hover:-translate-y-0.5 transition-transform"
                     >
                       📋 Copy UPI ID
                     </button>
                     <a
                       href={upiLink}
                       className="px-3 py-1.5 bg-purple-600 text-white font-black uppercase text-xs hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_#3b0764]"
                     >
                       📱 Open UPI App
                     </a>
                  </div>

                  {/* 12-Digit UTR Input */}
                  <div className="w-full border-t-2 border-zinc-200 dark:border-zinc-700 pt-3 text-left">
                     <label className="block text-xs font-black uppercase mb-1 dark:text-yellow-100">
                        12-Digit UTR / Transaction ID <span className="text-zinc-500 normal-case">(ঐচ্ছিক / Optional)</span>
                     </label>
                     <input
                        type="text"
                        value={utrNumber}
                        onChange={e => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="12 সংখ্যার UTR নম্বর (e.g. 412345678901)"
                        maxLength={12}
                        className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm font-mono bg-white dark:bg-zinc-800 dark:text-white focus:outline-none"
                     />
                     <p className="text-[10px] text-zinc-500 mt-1">পেমেন্ট করার পর UPI অ্যাপের রসিদ থেকে ১২ সংখ্যার UTR / Ref No বসান।</p>
                  </div>

                  {/* Optional Screenshot */}
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3 text-left">
                     <label className="block text-[11px] font-bold uppercase mb-1 dark:text-yellow-100">পেমেন্ট স্ক্রিনশট (ঐচ্ছিক / Optional)</label>
                     {imagePreview ? (
                        <div className="relative mb-2">
                           <img src={imagePreview} alt="Payment proof" className="max-h-36 mx-auto border-2 border-emerald-500 shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]" loading="lazy" decoding="async" />
                           <button
                             type="button"
                             onClick={() => { setProofImage(''); setImagePreview(''); }}
                             className="absolute top-1 right-1 bg-red-600 text-white p-1 text-xs font-bold hover:bg-red-700"
                           >
                             ✕ Remove
                           </button>
                        </div>
                     ) : (
                        <label className="cursor-pointer block border-2 border-dashed border-zinc-400 dark:border-zinc-600 p-3 text-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                           <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">📷 স্ক্রিনশট আপলোড করুন</span>
                           <input
                             type="file"
                             accept="image/*"
                             onChange={handleImageUpload}
                             className="hidden"
                           />
                        </label>
                     )}
                  </div>
               </div>
             ) : (
               <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 text-center">
                  <div className="text-3xl mb-2">💵</div>
                  <div className="text-sm font-black uppercase mb-1 dark:text-white">নগদ পেমেন্ট (Cash to Teacher)</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                     শিক্ষক মহাশয়কে সরাসরি নগদ টাকা জমা দিলে এই বোতাম টিপে রিকোয়েস্ট পাঠান। শিক্ষক মহাশয় টাকা পেয়ে তা অনুমোদন করবেন।
                  </p>
               </div>
             )}

             <button
               type="submit"
               disabled={submitting || selectedMonths.length === 0}
               className={`mt-3 rounded-2xl text-white font-black uppercase text-sm px-4 py-5 border-2 transition-all active:translate-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 animate-[pulse_2.5s_ease-in-out_infinite] ${
                 hasUpi && paymentMode === 'upi'
                   ? 'bg-gradient-to-b from-fuchsia-500 via-purple-600 to-indigo-700 border-indigo-900 shadow-[0_6px_0_0_#1e1b4b,0_10px_18px_rgba(79,70,229,0.45)] active:shadow-[0_1px_0_0_#1e1b4b]'
                   : 'bg-gradient-to-b from-lime-400 via-emerald-500 to-emerald-700 border-emerald-900 shadow-[0_6px_0_0_#064e3b,0_10px_18px_rgba(16,185,129,0.45)] active:shadow-[0_1px_0_0_#064e3b]'
               }`}
             >
               {submitting ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   Submitting...
                 </>
               ) : hasUpi && paymentMode === 'upi' ? (
                 'পেমেন্ট রিকোয়েস্ট জমা দিন (Submit Payment)'
               ) : (
                 'নগদ পেমেন্ট রিকোয়েস্ট জমা দিন (Submit Cash Request)'
               )}
             </button>
          </form>
          </>
          )}
        </div>
        
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)]">
          <h3 className="font-black text-xl uppercase mb-6 flex gap-2 items-center">
            Payment History
          </h3>
          
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-yellow-500" /></div>
          ) : (
            <div className="flex flex-col gap-4">
              {payments.length === 0 && (
                <div className="p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-center text-zinc-500 font-medium">
                  No payment history found.
                </div>
              )}
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border-2 border-zinc-200 dark:border-zinc-800 gap-4">
                  <div>
                    <h4 className="font-black text-lg uppercase text-zinc-900 dark:text-zinc-100">Fee for {payment.month}</h4>
                    <div className="text-zinc-600 dark:text-zinc-400 font-bold text-xs mt-1">
                      Received on: {formatDateTimeSafe(payment.createdAt)}
                    </div>
                    <div className="text-zinc-500 font-bold font-mono mt-1 text-sm">Amount: ₹{payment.amount}</div>
                    {(payment as any).transactionId && <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">UTR: {(payment as any).transactionId}</div>}
                    {(payment as any).paymentMode && (
                      <span className={`inline-block mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                        (payment as any).paymentMode === 'upi' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      }`}>
                        {(payment as any).paymentMode}
                      </span>
                    )}
                  </div>
                  <div>
                    {payment.status === 'pending' && <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase rounded-full border-2 border-yellow-200">Pending Review</span>}
                    {payment.status === 'approved' && <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full border-2 border-emerald-200">Approved</span>}
                    {payment.status === 'rejected' && <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold uppercase rounded-full border-2 border-red-200">Rejected</span>}
                    {payment.remarks && <div className="text-[10px] text-red-600 dark:text-red-400 mt-2 font-black italic flex justify-end">Reason: {payment.remarks}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentPayments;
