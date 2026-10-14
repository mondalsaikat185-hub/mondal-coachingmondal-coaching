import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, Search, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../components/AuthProvider';
import { showToast } from '../lib/toast';
import { confirmAsync } from '../lib/confirmDialog';
import { zoomPhoto } from '../components/PhotoZoom';
import { Batch, Payment, PageHeader, formatDateTimeSafe, getMonthPickerList, getMonthOptions, validateConsecutiveRule } from './Pages';

let globalPaymentsListCache: Payment[] | null = null;
let globalPaymentsCacheTime = 0;
let globalStudentsCache: any[] | null = null;
let globalBatchesCache: Batch[] | null = null;
let globalCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

export function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (globalPaymentsListCache && Date.now() - globalPaymentsCacheTime < CACHE_TTL) {
      return globalPaymentsListCache;
    }
    return [];
  });
  const [students, setStudents] = useState<any[]>(() => {
    if (globalStudentsCache && Date.now() - globalCacheTime < CACHE_TTL) {
      return globalStudentsCache;
    }
    return [];
  });
  const [batches, setBatches] = useState<any[]>(() => {
    if (globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL) {
      return globalBatchesCache;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    return !(globalPaymentsListCache && Date.now() - globalPaymentsCacheTime < CACHE_TTL);
  });

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingProofPayment, setViewingProofPayment] = useState<Payment | null>(null);
  
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  const monthOptions = getMonthOptions();

  const fetchAll = async () => {
    try {
      if (!globalPaymentsListCache || Date.now() - globalPaymentsCacheTime >= CACHE_TTL) {
        setLoading(true);
      }
      
      const [rawPayments, rawUsers, rawBatches] = await Promise.all([
        api.getPayments(),
        api.getUsers(),
        api.getBatches(),
      ]);

      const userMap = new Map(rawUsers.map(u => [u.id, u]));

      const pData: Payment[] = rawPayments.map(p => {
        const student = userMap.get(p.studentId);
        return {
          id: p.id,
          studentId: p.studentId,
          studentName: student ? student.name : 'Unknown Student',
          studentPhoto: student ? ((student as any).profilePhotoUrl || '') : '',
          studentEmail: student ? student.email : '',
          amount: p.amount,
          month: p.month,
          status: p.status as any,
          remarks: (p as any).remarks || '',
          transactionId: (p as any).transactionId || '',
          proofImage: (p as any).proofImage || '',
          hasProof: Boolean((p as any).hasProof || (p as any).proofImage),
          paymentMode: (p as any).paymentMode || 'manual',
          createdAt: p.createdAt
        } as any;
      });
      const getMs = (t: any) => new Date(t).getTime() || 0;
      pData.sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));
      setPayments(pData);
      globalPaymentsListCache = pData;
      globalPaymentsCacheTime = Date.now();

      if (globalStudentsCache && globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL) {
         setStudents(globalStudentsCache);
         setBatches(globalBatchesCache);
      } else {
         const uData: any[] = rawUsers
           .filter(u => u.role !== 'admin')
           .map(u => ({
             id: u.id,
             uid: u.id,
             fullName: u.name,
             email: u.email,
             phone: u.phone,
             status: u.status,
             batchId: u.batchId,
              monthlyFee: (() => {
                const f = (u as any).monthlyFee;
                if (f === undefined || f === null) return 500;
                const s = String(f).trim();
                if (s === '') return 500;
                const val = Number(s);
                return isNaN(val) ? 500 : val;
              })(),
             pendingMonths: ((u as any).pendingMonths !== undefined && (u as any).pendingMonths !== '' && (u as any).pendingMonths !== null) ? Number((u as any).pendingMonths) : 0,
             exemptReason: (u as any).exemptReason || '',
             showPaymentNudge: !!(u as any).showPaymentNudge,
             excusedMonths: (u as any).excusedMonths || ''
           }));
         setStudents(uData);
         globalStudentsCache = uData;

         const bData: any[] = rawBatches.map(b => ({
           id: b.id,
           name: b.name,
           schedule: (b as any).schedule || '',
           createdAt: b.createdAt
         }));
         setBatches(bData);
         globalBatchesCache = bData;
         
         globalCacheTime = Date.now();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateStudentPaymentDetails = async (studentId: string, updates: any) => {
    try {
       await api.saveUser({ id: studentId, ...updates } as any);
       setStudents(students.map(s => s.id === studentId ? { ...s, ...updates } : s));
    } catch (err) {
       window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Error updating student: " + String(err) }));
    }
  };

  const [processingPaymentIds, setProcessingPaymentIds] = useState<Set<string>>(new Set());

  const updatePaymentStatus = async (id: string, status: 'approved' | 'rejected', remarks: string = '') => {
    if (processingPaymentIds.has(id)) return; // ignore double taps
    if (status === 'rejected' && !remarks.trim()) {
      setRejectingPaymentId(id);
      return;
    }
    setProcessingPaymentIds(prev => new Set(prev).add(id));
    // Optimistic: update screen instantly, server saves in background, roll back on failure
    const prevPayments = payments;
    const nextPayments = payments.map(p => p.id === id ? { ...p, status, remarks: remarks.trim() } : p);
    setPayments(nextPayments);
    globalPaymentsListCache = nextPayments;
    setSelectedPendingIds(prev => prev.filter(pId => pId !== id));
    showToast(status === 'approved' ? 'পেমেন্ট অনুমোদিত ✓' : 'পেমেন্ট বাতিল করা হয়েছে ✓');
    if (status === 'rejected') { setRejectingPaymentId(null); setRejectReason(''); }
    try {
      await api.updatePaymentStatus(id, status as any, remarks.trim());
      
      if (status === 'rejected') {
         const paymentToUpdate = payments.find(p => p.id === id);
         if (paymentToUpdate) {
            await api.createNotification({
               senderId: user?.uid || 'admin',
               title: 'Payment Rejected',
               message: `Your payment request for ${paymentToUpdate.month} has been rejected. Reason: ${remarks.trim()}`,
               batchId: paymentToUpdate.studentId
            });
         }
         
         setRejectingPaymentId(null);
         setRejectReason('');
      }
    } catch (error) {
      console.error("updatePaymentStatus error:", error);
      setPayments(prevPayments);
      globalPaymentsListCache = prevPayments;
      showToast('পেমেন্ট আপডেট ব্যর্থ হয়েছে: ' + String((error as any)?.message || error).slice(0, 80), 'error', 5000);
    } finally {
      setProcessingPaymentIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPendingIds.length === 0) return;
    try {
      setBulkApproving(true);
      const res = await api.bulkUpdatePaymentStatus(selectedPendingIds, 'approved');
      if (res && res.success) {
        const idSet = new Set(selectedPendingIds);
        const nextPayments = payments.map(p => idSet.has(p.id) ? { ...p, status: 'approved' } : p);
        setPayments(nextPayments);
        globalPaymentsListCache = nextPayments;
        const count = res.count || selectedPendingIds.length;
        setSelectedPendingIds([]);
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: `সফলভাবে ${count}টি পেমেন্ট অনুমোদন করা হয়েছে!` }));
      } else {
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Bulk approval failed: " + (res?.error || "Unknown error") }));
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Bulk approval error: " + err.message }));
    } finally {
      setBulkApproving(false);
    }
  };

  const updatePaymentAmount = async (id: string) => {
    if (!editingAmount) {
       setEditingAmountId(null);
       return;
    }
    try {
      const newAmount = Number(editingAmount);
      
      await api.updatePaymentAmount(id, newAmount);
      setPayments(payments.map(p => p.id === id ? { ...p, amount: newAmount } : p));
      setEditingAmountId(null);
      setEditingAmount('');
    } catch (error) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Error updating payment amount: " + String(error) }));
    }
  };

  const rejectModal = rejectingPaymentId ? (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[100] p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 dark:border-red-500 w-full max-w-md p-6 transform transition-all scale-100 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <h3 className="font-black text-xl text-red-600 uppercase mb-4">Reject Payment Request</h3>
        <p className="text-zinc-500 font-bold text-xs mb-2 uppercase">Please provide a reason for the rejection (Mandatory):</p>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm bg-transparent mb-4 outline-none focus:border-red-500"
          placeholder="e.g. Transaction ID invalid, wrong amount, fake proof..."
          rows={3}
        />
        <div className="flex gap-4">
          <button
            disabled={!rejectReason.trim()}
            onClick={() => updatePaymentStatus(rejectingPaymentId, 'rejected', rejectReason.trim())}
            className="flex-1 border-2 border-red-600 bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
          <button
            onClick={() => { setRejectingPaymentId(null); setRejectReason(''); }}
            className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-200 dark:bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const proofViewerModal = viewingProofPayment ? (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-[100] p-4" onClick={() => setViewingProofPayment(null)}>
      <div className="bg-white dark:bg-zinc-900 border-4 border-blue-500 w-full max-w-lg p-4 transform transition-all scale-100 shadow-[8px_8px_0px_0px_rgba(59,130,246,1)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
           <h3 className="font-black text-lg text-blue-600 uppercase">📸 Payment Proof</h3>
           <button onClick={() => setViewingProofPayment(null)} className="p-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold">
              <X className="w-4 h-4" />
           </button>
        </div>
        <div className="space-y-3">
           <div className="text-xs space-y-1">
              <div><span className="font-bold uppercase text-zinc-500">Month:</span> <span className="font-black">{viewingProofPayment.month}</span></div>
              <div><span className="font-bold uppercase text-zinc-500">Amount:</span> <span className="font-black font-mono">₹{viewingProofPayment.amount}</span></div>
              {(viewingProofPayment as any).transactionId && (
                 <div><span className="font-bold uppercase text-zinc-500">TXN ID:</span> <span className="font-black font-mono text-blue-600 dark:text-blue-400">{(viewingProofPayment as any).transactionId}</span></div>
              )}
              <div><span className="font-bold uppercase text-zinc-500">Status:</span> <span className={`font-black uppercase ${viewingProofPayment.status === 'pending' ? 'text-yellow-600' : viewingProofPayment.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>{viewingProofPayment.status}</span></div>
           </div>
           {(viewingProofPayment as any).proofImage === 'LOADING_PROOF' ? (
              <div className="text-center py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 font-bold text-sm flex items-center justify-center gap-2"><Loader2 className="animate-spin w-5 h-5" /> Loading proof image...</div>
           ) : (viewingProofPayment as any).proofImage ? (
              <img src={(viewingProofPayment as any).proofImage} alt="Payment proof screenshot" className="w-full border-2 border-zinc-300 dark:border-zinc-600" loading="lazy" decoding="async" />
           ) : (
              <div className="text-center py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 font-bold text-sm">No screenshot attached</div>
           )}
           {viewingProofPayment.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t-2 border-zinc-200 dark:border-zinc-700">
                 <button onClick={() => { updatePaymentStatus(viewingProofPayment.id, 'approved'); setViewingProofPayment(null); }} className="flex-1 bg-emerald-500 text-white font-bold uppercase text-xs py-3 hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_0px_#064e3b] flex items-center justify-center gap-1"><Check className="w-4 h-4" />Approve</button>
                 <button onClick={() => { setRejectingPaymentId(viewingProofPayment.id); setViewingProofPayment(null); }} className="flex-1 bg-red-500 text-white font-bold uppercase text-xs py-3 hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_0px_#450a0a] flex items-center justify-center gap-1"><X className="w-4 h-4" />Reject</button>
              </div>
           )}
        </div>
      </div>
    </div>
  ) : null;

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

  if (selectedStudentId) {
     const student = students.find(s => s.id === selectedStudentId || s.uid === selectedStudentId);
     if (!student) return <div>Student not found</div>;
     const studentPayments = payments.filter(p => p.studentId === selectedStudentId);

     return (
       <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full space-y-6 relative">
          {rejectModal}
          {proofViewerModal}

          <div className="flex items-center gap-4">
             <button onClick={() => setSelectedStudentId(null)} className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 font-bold uppercase text-xs hover:-translate-y-0.5 border-2 border-zinc-900 dark:border-zinc-100 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5"/> Back</button>
             <h2 className="text-xl font-black uppercase">Payment Details: {student.fullName || student.email}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={async (e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const feeInput = formData.get('monthlyFee');
                 const parsedFee = (feeInput !== null && feeInput !== '') ? Number(feeInput) : 500;
                 const excusedVal = String(formData.get('excusedMonths') || '').trim();
                 const studentId = student.id || (student as any).uid;
                 try {
                    await Promise.all([
                       updateStudentPaymentDetails(studentId, {
                          monthlyFee: parsedFee,
                          exemptReason: formData.get('exemptReason'),
                          pendingMonths: Number(formData.get('pendingMonths')),
                          showPaymentNudge: formData.get('showPaymentNudge') === 'on',
                          excusedMonths: excusedVal
                       }),
                       api.setStudentExcusedMonths(studentId, excusedVal)
                    ]);
                    setStudents(students.map(s => (s.id === studentId || s.uid === studentId) ? { ...s, excusedMonths: excusedVal } : s));
                    window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Config saved successfully!" }));
                 } catch (err) {
                    window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Failed to save config: " + String(err) }));
                 }
              }} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)]">
                 <h3 className="font-black uppercase mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">Student Payment Config</h3>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Monthly Salary / Fee (₹)</label>
                      <input type="number" 
                         name="monthlyFee"
                         defaultValue={student.monthlyFee} 
                         className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent font-mono" />
                      <p className="text-[10px] text-zinc-500 mt-1">Set to 0 if not eligible to pay monthly fees.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Exemption Reason</label>
                      <input type="text" 
                         name="exemptReason"
                         defaultValue={student.exemptReason || ''} 
                         placeholder="e.g. Scholarship, relative, etc."
                         className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Pending Months</label>
                      <input type="number" 
                         name="pendingMonths"
                         defaultValue={student.pendingMonths || 0} 
                         className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Excused Months (ফি মাফ করা মাস)</label>
                      <input type="text" 
                         name="excusedMonths"
                         defaultValue={student.excusedMonths || ''} 
                         placeholder="e.g. October 2026, November 2026"
                         className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent text-sm" />
                      <p className="text-[10px] text-zinc-500 mt-1">কমা দিয়ে লিখুন (e.g. October 2026, November 2026)। এই মাসগুলো sequential check আটকাবে না।</p>
                    </div>
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                       <input type="checkbox" 
                          name="showPaymentNudge"
                          defaultChecked={!!student.showPaymentNudge}
                          className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100" />
                       <span className="text-sm font-bold uppercase text-red-600 dark:text-red-400">Activate App Nudge (Show Popup)</span>
                    </label>
                    <button type="submit" className="w-full mt-4 bg-emerald-500 text-black border-2 border-zinc-900 font-bold uppercase text-xs py-3 hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-transform">
                       Save Config
                    </button>
                 </div>
              </form>

             <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] h-[32rem] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="font-black uppercase">Payment Requests</h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {studentPayments.length === 0 ? (
                     <div className="text-center text-zinc-500 font-bold py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700">No payment history.</div>
                  ) : (
                     <div className="space-y-4">
                        {studentPayments.map((p) => (
                           <div key={p.id} className="border-2 border-zinc-200 dark:border-zinc-800 p-3">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="font-black uppercase text-sm">{p.month}</span>
                                 {editingAmountId === p.id ? (
                                    <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-sm">
                                       <input type="number" value={editingAmount} onChange={e => setEditingAmount(e.target.value)} className="w-16 p-1 bg-transparent focus:outline-none font-bold text-black dark:text-white" />
                                       <button onClick={() => updatePaymentAmount(p.id)} className="bg-emerald-500 text-white px-2 py-1"><Check className="w-3 h-3"/></button>
                                       <button onClick={() => setEditingAmountId(null)} className="bg-red-500 text-white px-2 py-1"><X className="w-3 h-3"/></button>
                                    </div>
                                 ) : (
                                    <span className="font-mono font-bold">₹{p.amount}</span>
                                 )}
                              </div>
                              <div className="text-[10px] text-zinc-500 mb-2 font-bold font-mono">
                                 Submitted: {formatDateTimeSafe(p.createdAt)}
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className={`text-[10px] font-bold text-black uppercase px-2 py-0.5 ${p.status === 'pending' ? 'bg-yellow-300' : p.status === 'approved' ? 'bg-emerald-300' : 'bg-red-300'}`}>{p.status}</span>
                                 {p.status === 'pending' && (
                                    <div className="flex gap-2">
                                       <button disabled={processingPaymentIds.has(p.id)} onClick={() => updatePaymentStatus(p.id, 'approved')} className="disabled:opacity-40 text-[10px] bg-emerald-500 text-white font-bold uppercase px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#064e3b]">{processingPaymentIds.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}Approve</button>
                                       <button disabled={processingPaymentIds.has(p.id)} onClick={() => updatePaymentStatus(p.id, 'rejected')} className="disabled:opacity-40 text-[10px] bg-red-500 text-white font-bold uppercase px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#450a0a]"><X className="w-3 h-3"/>Reject</button>
                                    </div>
                                 )}
                              </div>
                              {p.remarks && <div className="text-[10px] text-zinc-500 mt-2 italic border-t border-zinc-200 dark:border-zinc-800 pt-1">Reason: {p.remarks}</div>}
                              {(p as any).transactionId && <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">TXN ID: {(p as any).transactionId}</div>}
                              {((p as any).proofImage || (p as any).hasProof) && (
                                 <button onClick={async () => {
                                    if (!(p as any).proofImage && (p as any).hasProof) {
                                       setViewingProofPayment({ ...p, proofImage: 'LOADING_PROOF' } as any);
                                       try {
                                          const fetchedProof = await api.getPaymentProof(p.id);
                                          setViewingProofPayment({ ...p, proofImage: fetchedProof } as any);
                                          setPayments(prev => prev.map(item => item.id === p.id ? ({ ...item, proofImage: fetchedProof } as any) : item));
                                       } catch (err) {
                                          setViewingProofPayment({ ...p, proofImage: '' } as any);
                                       }
                                    } else {
                                       setViewingProofPayment(p);
                                    }
                                 }} className="mt-2 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold uppercase px-2 py-1 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors border border-blue-300 dark:border-blue-700 flex items-center gap-1">
                                    📸 View Proof
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
                </div>
             </div>
          </div>
       </div>
     );
  }

  if (selectedBatchId) {
     const bName = selectedBatchId === 'unassigned' ? 'Unassigned' : batches.find(b => b.id === selectedBatchId)?.name;
     const bStudents = students.filter(s => selectedBatchId === 'unassigned' ? !s.batchId : (s.batchId && String(s.batchId).split(',').map(id => id.trim()).includes(selectedBatchId)));
     
     return (
       <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
          <div className="flex items-center gap-4 mb-6">
             <button onClick={() => setSelectedBatchId(null)} className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 font-bold uppercase text-xs hover:-translate-y-0.5 border-2 border-zinc-900 dark:border-zinc-100 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5"/> Back</button>
             <h2 className="text-xl font-black uppercase text-yellow-600 dark:text-yellow-400">Batch: {bName}</h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)]">
             <h3 className="font-black uppercase mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">Students</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {bStudents.length === 0 ? (
                   <div className="col-span-full py-8 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 font-bold text-zinc-500">
                      No students in this batch. To add students, go to the 'Students Management' module and click '+ Create Virtual Student'.
                   </div>
                ) : bStudents.map((s, idx) => {
                   const sId = s.id || (s as any).uid;
                   const pendingCount = payments.filter(p => p.studentId === sId && p.status === 'pending').length;
                   return (
                     <button key={sId} onClick={() => setSelectedStudentId(sId)} className="w-full text-left p-4 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 flex flex-col items-start gap-1">
                        <span className="font-bold flex items-center justify-between w-full">
                           <span>{s.fullName || s.email}</span>
                           {Number(s.pendingMonths) > 0 && (
                              <span className={`text-[9px] px-1.5 py-0.5 font-black uppercase rounded ${
                                 Number(s.pendingMonths) >= 2 
                                   ? 'bg-red-500 text-white animate-pulse' 
                                   : 'bg-yellow-300 text-black border border-yellow-400'
                              }`} title="Overdue alert">
                                 {s.pendingMonths}M Due
                              </span>
                           )}
                        </span>
                       {s.monthlyFee > 0 ? (
                          <span className="text-xs font-mono text-zinc-500">Fee: ₹{s.monthlyFee}</span>
                       ) : (
                          <span className="text-xs font-mono text-zinc-500 flex flex-col gap-1 w-full"><div className="opacity-60">Fee: None (Free)</div></span>
                       )}
                       {pendingCount > 0 && <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold uppercase px-2 py-0.5 mt-1">{pendingCount} Pending Req</span>}
                     </button>
                   );
                })}
             </div>
          </div>
       </div>
     );
  }

  // Display batches & Global Pending
  const allPending = payments.filter(p => p.status === 'pending');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full relative">
      {rejectModal}
      <PageHeader title="Payments Management" backTo="/admin" />

      <div className="mb-8 border-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-6">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
           <h3 className="font-black text-xl uppercase text-yellow-800 dark:text-yellow-400">Needs Verification ({allPending.length})</h3>
           {allPending.length > 0 && (
             <div className="flex items-center gap-3">
               <button
                 type="button"
                 onClick={() => {
                   if (selectedPendingIds.length === allPending.length) {
                     setSelectedPendingIds([]);
                   } else {
                     setSelectedPendingIds(allPending.map(p => p.id));
                   }
                 }}
                 className="px-3 py-1.5 bg-white dark:bg-zinc-800 border-2 border-zinc-900 dark:border-zinc-100 font-bold uppercase text-xs hover:-translate-y-0.5 transition-transform"
               >
                 {selectedPendingIds.length === allPending.length ? 'Deselect All' : 'Select All'}
               </button>
               <button
                 type="button"
                 onClick={handleBulkApprove}
                 disabled={selectedPendingIds.length === 0 || bulkApproving}
                 className="px-4 py-1.5 bg-emerald-600 text-white font-black uppercase text-xs hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_#064e3b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
               >
                 {bulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                 Approve Selected ({selectedPendingIds.length})
               </button>
             </div>
           )}
         </div>

         {allPending.length === 0 ? (
           <div className="text-zinc-600 dark:text-zinc-400 font-bold italic">You're all caught up! No pending payments to verify.</div>
         ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {allPending.map((p) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)]">
                <div className="flex items-center justify-between mb-2">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPendingIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPendingIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedPendingIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      {(p as any).studentPhoto ? <img src={(p as any).studentPhoto} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" width="32" height="32" /> : null}
                      <span className="text-xs font-bold uppercase text-zinc-700 dark:text-zinc-300">{p.studentName || p.studentEmail}</span>
                   </label>
                   {p.paymentMode && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${p.paymentMode === 'upi' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-zinc-100 text-zinc-800 border-zinc-300'}`}>
                         {p.paymentMode}
                      </span>
                   )}
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm">{p.month}</span>
                  {editingAmountId === p.id ? (
                     <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-sm">
                        <input type="number" value={editingAmount} onChange={e => setEditingAmount(e.target.value)} className="w-20 p-1 bg-transparent focus:outline-none font-bold text-black dark:text-white" />
                        <button onClick={() => updatePaymentAmount(p.id)} className="bg-emerald-500 text-white px-2 py-1 flex items-center justify-center"><Check className="w-3 h-3"/></button>
                        <button onClick={() => setEditingAmountId(null)} className="bg-red-500 text-white px-2 py-1 flex items-center justify-center"><X className="w-3 h-3"/></button>
                     </div>
                  ) : (
                     <span className="font-mono font-bold text-lg">₹{p.amount}</span>
                  )}
                </div>

                {(p as any).transactionId && (
                   <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono mb-2">
                      UTR: {(p as any).transactionId}
                   </div>
                )}

                {((p as any).proofImage || (p as any).hasProof) && (
                   <button onClick={async () => {
                      if (!(p as any).proofImage && (p as any).hasProof) {
                         setViewingProofPayment({ ...p, proofImage: 'LOADING_PROOF' } as any);
                         try {
                            const fetchedProof = await api.getPaymentProof(p.id);
                            setViewingProofPayment({ ...p, proofImage: fetchedProof } as any);
                            setPayments(prev => prev.map(item => item.id === p.id ? ({ ...item, proofImage: fetchedProof } as any) : item));
                         } catch (err) {
                            setViewingProofPayment({ ...p, proofImage: '' } as any);
                         }
                      } else {
                         setViewingProofPayment(p);
                      }
                   }} className="mb-3 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold uppercase px-2 py-1 border border-blue-300 dark:border-blue-700 flex items-center justify-center gap-1 w-full">
                      📸 View Proof
                   </button>
                )}

                <div className="flex gap-2">
                  <button disabled={processingPaymentIds.has(p.id)} onClick={() => updatePaymentStatus(p.id, 'approved')} className="disabled:opacity-40 flex-1 text-[10px] bg-emerald-500 text-white font-black uppercase px-2 py-2 flex justify-center items-center gap-1 shadow-[2px_2px_0px_0px_#064e3b] hover:-translate-y-0.5">{processingPaymentIds.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}Approve</button>
                  <button disabled={processingPaymentIds.has(p.id)} onClick={() => updatePaymentStatus(p.id, 'rejected')} className="disabled:opacity-40 flex-1 text-[10px] bg-red-500 text-white font-black uppercase px-2 py-2 flex justify-center items-center gap-1 shadow-[2px_2px_0px_0px_#450a0a] hover:-translate-y-0.5"><X className="w-3 h-3"/>Reject</button>
                </div>
              </div>
           ))}
         </div>
         )}
      </div>

    {/* PENDING FEES NOTIFICATIONS SECTION */}
    <div className="mb-8 border-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-6 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]">
      <h3 className="font-black text-xl uppercase mb-4 text-red-800 dark:text-red-400 flex items-center gap-2">
        Pending Fees Alerts 🔔
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 font-bold mb-6">
        যাদের অনেক মাসের পেমেন্ট বাকি আছে তাদের এখান থেকে "Send Alert" পাঠান। তারা অ্যাপ খুললেই বড় লাল রঙের পপ-আপ দেখতে পাবে এবং পেমেন্ট না করা পর্যন্ত প্রতিবার অ্যাপ খুললে এই অ্যালার্ট আসবে।
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
        {students
          .filter(s => Number(s.pendingMonths) > 0)
          .sort((a, b) => Number(b.pendingMonths) - Number(a.pendingMonths))
          .map(s => (
          <div key={s.id || (s as any).uid} className={`bg-white dark:bg-zinc-900 border-2 ${s.forcePaymentNudge ? 'border-zinc-300 dark:border-zinc-700 opacity-60' : 'border-zinc-900 dark:border-zinc-100'} p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between`}>
            <div>
              <div className="font-black uppercase text-lg mb-1">{s.fullName || s.email}</div>
              <div className="text-xs font-bold text-zinc-500 mb-3">{s.phone}</div>
            </div>
            <div className="flex items-center justify-between mt-auto gap-2">
              <span className={`text-[11px] font-black uppercase px-2 py-1 flex-1 text-center ${Number(s.pendingMonths) >= 2 ? 'bg-red-500 text-white animate-pulse shadow-[2px_2px_0px_0px_black]' : 'bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_black]'}`}>
                {s.pendingMonths} M DUE
              </span>
              <button 
                onClick={async () => {
                  if (await confirmAsync(`${s.fullName || s.email}-কে পেমেন্ট অ্যালার্ট পাঠাতে চান?`)) {
                    try {
                      const apiModule = await import('../lib/api');
                      await apiModule.api.saveUser({ id: s.id || (s as any).uid, forcePaymentNudge: true } as any);
                      window.dispatchEvent(new CustomEvent('show-custom-alert', { detail: 'নোটিফিকেশন পাঠানো হয়েছে!' }));
                      const newSt = [...students];
                      const idx = newSt.findIndex(st => (st.id || (st as any).uid) === (s.id || (s as any).uid));
                      if(idx !== -1) {
                        newSt[idx] = { ...newSt[idx], forcePaymentNudge: true };
                        setStudents(newSt);
                      }
                    } catch (e: any) {
                      alert('Error: ' + e.message);
                    }
                  }
                }}
                disabled={s.forcePaymentNudge}
                className={`text-[10px] font-black uppercase px-3 py-1.5 flex-1 transition-all flex items-center justify-center gap-1 ${s.forcePaymentNudge ? 'bg-zinc-200 text-zinc-500 border-2 border-zinc-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400 text-white border-2 border-black shadow-[2px_2px_0px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'}`}
              >
                {s.forcePaymentNudge ? 'Sent ✅' : 'Send Alert 🔔'}
              </button>
            </div>
            {s.forcePaymentNudge && (
              <button 
                onClick={async () => {
                  if (await confirmAsync(`অ্যালার্টটি কি রিমুভ করতে চান?`)) {
                    const apiModule = await import('../lib/api');
                    await apiModule.api.saveUser({ id: s.id || (s as any).uid, forcePaymentNudge: false } as any);
                    const newSt = [...students];
                    const idx = newSt.findIndex(st => (st.id || (st as any).uid) === (s.id || (s as any).uid));
                    if(idx !== -1) {
                      newSt[idx] = { ...newSt[idx], forcePaymentNudge: false };
                      setStudents(newSt);
                    }
                  }
                }}
                className="mt-3 text-[10px] bg-red-100 text-red-600 font-bold uppercase w-full py-1 border border-red-300 hover:bg-red-200"
              >
                Remove Alert ✖
              </button>
            )}
          </div>
        ))}
        {students.filter(s => Number(s.pendingMonths) > 0).length === 0 && (
          <div className="col-span-full text-zinc-500 font-bold italic border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
            কোনো স্টুডেন্টের পেমেন্ট বকেয়া নেই! দারুন! 🎉
          </div>
        )}
      </div>
    </div>

    <h3 className="font-black uppercase mb-4 opacity-70">Students by Batch</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {batches.map(b => (
           <button key={b.id} onClick={() => setSelectedBatchId(b.id)} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] hover:-translate-y-1 transition-transform text-left">
              <h3 className="text-xl font-black uppercase text-yellow-600 dark:text-yellow-400 mb-2">{b.name}</h3>
              <p className="text-sm font-bold text-zinc-500">{students.filter(s => s.batchId && String(s.batchId).split(',').map(id => id.trim()).includes(b.id)).length} Students</p>
           </button>
        ))}
        <button onClick={() => setSelectedBatchId('unassigned')} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] hover:-translate-y-1 transition-transform text-left opacity-70">
           <h3 className="text-xl font-black uppercase mb-2">Unassigned</h3>
           <p className="text-sm font-bold text-zinc-500">{students.filter(s => !s.batchId).length} Students</p>
        </button>
      </div>
    </div>
  );
}


export default AdminPayments;
