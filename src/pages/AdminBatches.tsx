import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { confirmAsync } from '../lib/confirmDialog';
import { Batch, PageHeader } from './Pages';

let globalBatchesCache: Batch[] | null = null;
let globalStudentsCache: any = null;
let globalCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

const BATCH_DAY_NAMES: Record<string, string> = { '0': 'রবিবার', '1': 'সোমবার', '2': 'মঙ্গলবার', '3': 'বুধবার', '4': 'বৃহস্পতিবার', '5': 'শুক্রবার', '6': 'শনিবার' };

export function AdminBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editClassDay, setEditClassDay] = useState('');
  const [editExamTime, setEditExamTime] = useState('');

  const fetchBatches = async () => {
    try {
      const rawBatches = await api.getBatches();
      const data: Batch[] = rawBatches.map(b => ({
        id: b.id,
        name: b.name,
        schedule: (b as any).schedule || '',
        createdAt: b.createdAt,
        classDay: (b as any).classDay !== undefined && (b as any).classDay !== null ? String((b as any).classDay) : '',
        examStartTime: (b as any).examStartTime || '',
        examSlot: (b as any).examSlot
      }));
      setBatches(data);
    } catch (error) {
      console.error("fetchBatches error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !schedule) return;
    try {
      setLoading(true);
      await api.saveBatch({
        name,
        schedule
      } as any);
      globalBatchesCache = null;
      setName('');
      setSchedule('');
      await fetchBatches();
    } catch (error) {
      console.error("handleAddBatch error:", error);
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingBatch || !editName || !editSchedule) return;
    setLoading(true);
    try {
      await api.saveBatch({
        id: editingBatch.id,
        name: editName.trim(),
        schedule: editSchedule.trim(),
        classDay: editClassDay,
        examStartTime: editExamTime
      } as any);
      globalBatchesCache = null;
      await fetchBatches();
      setEditingBatch(null);
    } catch (err) {
      console.error("handleEditSave error:", err);
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      setLoading(true);
      showToast('ব্যাচ মুছে ফেলা হচ্ছে…', 'info', 2000);
      await api.deleteBatch(id);
      globalBatchesCache = null;
      globalStudentsCache = null;
      await fetchBatches();
      showToast('ব্যাচ মুছে ফেলা হয়েছে ✓');
    } catch (error) {
      console.error("handleDeleteBatch error:", error);
      showToast('ব্যাচ মুছতে ব্যর্থ হয়েছে', 'error', 5000);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
      <div className="flex justify-between items-start">
        <PageHeader title="Manage Batches" backTo="/admin" />
        <button 
           onClick={() => fetchBatches()} 
           disabled={loading}
           className="bg-black dark:bg-zinc-100 text-white dark:text-black font-bold uppercase text-xs px-4 py-2 border-2 border-transparent hover:-translate-y-0.5 transition-transform shrink-0 disabled:opacity-50"
        >
           {loading ? '...' : 'Refresh'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)]">
          <h3 className="font-black uppercase mb-4">Add New Batch</h3>
          <form onSubmit={handleAddBatch} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Batch Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none"
                placeholder="e.g. Class 10 Math"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Schedule</label>
              <input 
                type="text" 
                value={schedule} 
                onChange={e => setSchedule(e.target.value)} 
                className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none"
                placeholder="e.g. Mon, Wed 5 PM"
              />
            </div>
            <button type="submit" disabled={loading || !name || !schedule} className="mt-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-3 flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-transform border-2 border-transparent disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add Batch
            </button>
          </form>
        </div>
        
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] overflow-x-auto w-full">
          <h3 className="font-black uppercase mb-4">Current Batches</h3>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900 dark:border-zinc-100">
                  <th className="p-2 font-bold uppercase text-xs">Name</th>
                  <th className="p-2 font-bold uppercase text-xs">Schedule</th>
                  <th className="p-2 font-bold uppercase text-xs">Exam slot</th>
                  <th className="p-2 font-bold uppercase text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-zinc-500 font-medium">No batches found.</td>
                  </tr>
                )}
                {batches.map((batch) => (
                  <React.Fragment key={batch.id}>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2 font-bold">{batch.name}</td>
                      <td className="p-2 text-sm">{batch.schedule}</td>
                      <td className="p-2 text-xs font-bold whitespace-nowrap">
                        {batch.examSlot && batch.examSlot.examStartTime
                          ? `${BATCH_DAY_NAMES[batch.examSlot.classDay] || '—'} ${batch.examSlot.examStartTime}${!batch.examStartTime ? ' (auto)' : ''}`
                          : <span className="text-red-600">সেট নেই</span>}
                      </td>
                      <td className="p-2 flex justify-end gap-2 items-center">
                         <button onClick={() => {
                             setEditingBatch(batch);
                             setEditName(batch.name);
                             setEditSchedule(batch.schedule);
                             setEditClassDay(batch.classDay || '');
                             setEditExamTime(batch.examStartTime || '');
                          }} className="p-1 px-3 bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 font-bold uppercase text-[10px]">
                             Edit
                          </button>
                          <button onClick={() => setConfirmDeleteBatchId(batch.id)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded">
                            <Trash2 className="w-5 h-5" />
                          </button>
                      </td>
                    </tr>
                    {editingBatch?.id === batch.id && (
                      <tr className="border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                        <td colSpan={4} className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" placeholder="Name" />
                          <input type="text" value={editSchedule} onChange={e => setEditSchedule(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" placeholder="Schedule" />
                          <select value={editClassDay} onChange={e => setEditClassDay(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" title="Exam day (class day)">
                            <option value="">Exam day: auto (নাম থেকে)</option>
                            <option value="6">শনিবার (Saturday)</option>
                            <option value="0">রবিবার (Sunday)</option>
                            <option value="1">সোমবার</option><option value="2">মঙ্গলবার</option><option value="3">বুধবার</option><option value="4">বৃহস্পতিবার</option><option value="5">শুক্রবার</option>
                          </select>
                          <input type="time" value={editExamTime} onChange={e => setEditExamTime(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" title="Exam start time (খালি = auto)" />
                          <div className="flex gap-2 shrink-0">
                            <button onClick={handleEditSave} disabled={loading} className="bg-blue-600 text-white px-4 py-2 font-bold uppercase text-xs">Save</button>
                            <button onClick={() => setEditingBatch(null)} disabled={loading} className="bg-zinc-200 text-zinc-900 px-4 py-2 font-bold uppercase text-xs">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {confirmDeleteBatchId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)]">
            <h3 className="font-black text-xl uppercase mb-4 text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">
              Confirm Delete Batch
            </h3>
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-6">
              Are you sure you want to permanently delete this? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  handleDeleteBatch(confirmDeleteBatchId);
                  setConfirmDeleteBatchId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase py-3 border-2 border-zinc-900 dark:border-zinc-100 transition-transform"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDeleteBatchId(null)}
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black uppercase py-3 border-2 border-zinc-900 dark:border-zinc-100 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { ExamType, InteractiveQuizPayload } from '../types/QuizData';

export interface Note {
  id: string;
  title: string;
  contentUrl?: string; // Optional link
  createdAt?: any;
}

export interface Exam {
  id: string;
  title: string;
  examDate: string;
  examType?: ExamType; // e.g. 'Online Link', 'PDF Upload', 'Cloze Test', etc.
  contentUrl?: string; // Optional link to question paper or form
  analysisUrl?: string; // Link to detailed analysis or answer key
  quizData?: string; // Stored JSON payload for interactive quizzes
  batchId: string;
  createdAt?: any;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  month: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  transactionId?: string;
  proofImage?: string;
  paymentMode?: 'manual' | 'proof_upload' | 'gateway';
  createdAt?: any;
}


export default AdminBatches;
