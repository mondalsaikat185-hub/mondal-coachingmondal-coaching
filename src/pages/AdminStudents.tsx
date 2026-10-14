import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, Trash2, Plus, Search, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { zoomPhoto } from '../components/PhotoZoom';
import { api } from '../lib/api';
import { AppUser, useAuth } from '../components/AuthProvider';
import { getAllAttendanceForBatch } from '../lib/exam-session-utils';
import { formatDateOnlySafe } from '../lib/utils';
import { showToast } from '../lib/toast';
import { confirmAsync } from '../lib/confirmDialog';
import { Batch, PageHeader } from './Pages';

let globalStudentsCache: AppUser[] | null = null;
let globalBatchesCache: Batch[] | null = null;
let globalCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

export function AdminStudents() {
  const [students, setStudents] = useState<AppUser[]>(() => {
    if (globalStudentsCache && Date.now() - globalCacheTime < CACHE_TTL) {
      return globalStudentsCache;
    }
    return [];
  });
  const [batches, setBatches] = useState<Batch[]>(() => {
    if (globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL) {
      return globalBatchesCache;
    }
    return [];
  });
  const [studentAbsentCount, setStudentAbsentCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(() => {
    return !(globalStudentsCache && globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL);
  });
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentBatch, setNewStudentBatch] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [addingNewStudent, setAddingNewStudent] = useState(false);
  const [studentTab, setStudentTab] = useState<string>('pending');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<AppUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingStudentProfile, setEditingStudentProfile] = useState<AppUser | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePhone, setEditProfilePhone] = useState('');
  const [editProfilePasscode, setEditProfilePasscode] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    if (!editingStudentProfile) return;
    setIsSavingProfile(true);
    try {
      await api.saveUser({
        id: editingStudentProfile.id,
        name: editProfileName,
        phone: editProfilePhone,
        passcode: editProfilePasscode,
      } as any);
      
      setStudents(prev => prev.map(s => {
        if (s.id === editingStudentProfile.id || s.uid === editingStudentProfile.uid) {
          return {
            ...s,
            fullName: editProfileName,
            displayName: editProfileName,
            phone: editProfilePhone,
            passcode: editProfilePasscode,
          };
        }
        return s;
      }));
      
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Student profile updated successfully!" }));
      setEditingStudentProfile(null);
    } catch (err) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Error saving profile: " + String(err) }));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentBatch || !newStudentPhone) return;
    try {
      // CRITICAL SAFETY CHECK: এই phone number কি আগে থেকেই কোনো student-এর?
      // যদি থাকে, সেই student-এর data overwrite হবে — এটা data corruption-এর মূল কারণ!
      const cleanDigits = (p: string) => p.replace(/\D/g, '').slice(-10);
      const inputPhone = cleanDigits(newStudentPhone);
      const alreadyExists = inputPhone ? students.find(s => {
        return cleanDigits(String(s.phone || '')) === inputPhone;
      }) : null;
      if (alreadyExists) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", {
          detail: `⚠️ এই ফোন নম্বরটি ইতিমধ্যে "${(alreadyExists as any).fullName || (alreadyExists as any).displayName || alreadyExists.phone}" নামে registered আছে। নতুন student create করতে ভিন্ন নম্বর ব্যবহার করুন। যদি এই student-এর তথ্য update করতে চান, তাহলে student list থেকে তাদের profile edit করুন।`
        }));
        return;
      }

      const mockUid = "student_" + Date.now() + Math.floor(Math.random()*1000);
      const savedUser = await api.saveUser({
        id: mockUid,
        email: newStudentEmail.toLowerCase(),
        name: newStudentName,
        phone: newStudentPhone,
        role: 'student',
        status: 'active',
        batchId: newStudentBatch,
        isProfileComplete: true,
        monthlyFee: 500,
      } as any) as any;
      // GAS থেকে return হওয়া real id ব্যবহার করো (mockUid নয়)
      const realId = (savedUser && savedUser.id) ? savedUser.id : mockUid;
      globalStudentsCache = null;
      setStudents(prev => [...prev, {
        id: realId,
        uid: realId,
        email: newStudentEmail.toLowerCase(),
        fullName: newStudentName,
        phone: newStudentPhone,
        role: 'student',
        status: 'active',
        batchId: newStudentBatch,
        isProfileComplete: true,
        monthlyFee: 500,
        createdAt: new Date().toISOString()
      } as any]);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: `Student ${newStudentName} created successfully!` }));
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentBatch('');
      setNewStudentPhone('');
      setAddingNewStudent(false);
    } catch (err) {
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Error creating student: " + String(err) }));
    }
  };

  const [attendanceData, setAttendanceData] = useState<
    Record<string, Array<{ date: string; presentStudentIds: string[] }>>
  >({});
  
  const [activeBatchTab, setActiveBatchTab] = useState<string>('');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [showCompleteProfileMessage, setShowCompleteProfileMessage] = useState(false);

  const [editingStudentBatches, setEditingStudentBatches] = useState<{ uid: string; batchIds: Set<string> } | null>(null);

  useEffect(() => {
    if (!batches.length) return;
    if (!activeBatchTab) { setActiveBatchTab(batches[0].id); return; }

    // Only fetch if we don't already have this batch's data
    if (attendanceData[activeBatchTab]) return;

    const fetchOneBatch = async () => {
      const data = await getAllAttendanceForBatch(activeBatchTab, 30);
      setAttendanceData(prev => ({ ...prev, [activeBatchTab]: data }));
    };
    fetchOneBatch();
  }, [activeBatchTab, batches.length]);

  useEffect(() => {
    if (!students.length) return;

    const fetchMarksAndAbsent = async () => {
      try {
        const newAbsentCount: Record<string, number> = {};

        students.forEach(s => {
          newAbsentCount[s.uid] = 0;
          
          if (s.exemptReason && s.exemptReason.length > 0) {
             return;
          }
          
          // Calculate absent count
          let maxRecentAbsences = 0;
          const studentBatchIds = s.batchId ? String(s.batchId).split(',').map(id => id.trim()).filter(Boolean) : [];
          
          studentBatchIds.forEach(batchId => {
            const sBatchAtt = attendanceData[batchId] || [];
            let recentAbsences = 0;
            let validExamsChecked = 0;
            
            for (let i = 0; i < sBatchAtt.length && validExamsChecked < 3; i++) {
               // Only count exams if they occurred on or after the student joined
               const attDateMs = new Date(sBatchAtt[i].date).getTime();
               const msJoined = s.createdAt?.toMillis?.() || (s.createdAt?.seconds ? s.createdAt.seconds * 1000 : 0) || (s.createdAt ? new Date(s.createdAt).getTime() : 0);
               // Give a 24-hour leniency window for timezones
               if (msJoined && attDateMs < msJoined - 86400000) {
                   continue; // skip exams before they joined
               }

               validExamsChecked++;
               const studentExcusedDates = s.excusedDates ? String(s.excusedDates).split(',').filter(Boolean) : [];
               const isExcused = studentExcusedDates.includes(sBatchAtt[i].date);
               
               if (!sBatchAtt[i].presentStudentIds.includes(s.uid) && !isExcused) {
                  recentAbsences++;
               } else {
                  break; // they were present or excused recently
               }
            }
            if (recentAbsences > maxRecentAbsences) {
               maxRecentAbsences = recentAbsences;
            }
          });
          
          newAbsentCount[s.uid] = maxRecentAbsences;
        });

        setStudentAbsentCount(newAbsentCount);
      } catch (err) {
        console.error("fetchMarksAndAbsent error", err);
      }
    };
    fetchMarksAndAbsent();
  }, [students, attendanceData]);

  useEffect(() => {
    const mapUserProfileToUser = (profile: any): AppUser => {
      return {
        id: profile.id,
        uid: profile.id,
        email: profile.email || '',
        displayName: profile.name || 'Student',
        photoURL: profile.profilePhotoUrl || null,
        role: profile.role || 'student',
        status: profile.status || 'incomplete',
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: profile.updatedAt || new Date().toISOString(),
        fullName: profile.name,
        address: profile.address,
        dob: profile.dob,
        joinDate: profile.joinDate,
        phone: profile.phone,
        batchId: profile.batchId,
        isProfileComplete: profile.status !== 'incomplete',
        profilePhotoUrl: profile.profilePhotoUrl,
        monthlyFee: (() => {
          if (profile.monthlyFee === undefined || profile.monthlyFee === null) return 500;
          const s = String(profile.monthlyFee).trim();
          if (s === '') return 500;
          const val = Number(s);
          return isNaN(val) ? 500 : val;
        })(),
        pendingMonths: (profile.pendingMonths !== undefined && profile.pendingMonths !== '' && profile.pendingMonths !== null) ? Number(profile.pendingMonths) : 0,
        passcode: profile.passcode,
        paymentStatus: profile.paymentStatus,
        reapplyReason: profile.reapplyReason,
        exemptReason: profile.exemptReason,
        showPaymentNudge: profile.showPaymentNudge,
        excusedDates: profile.excusedDates || '',
      };
    };

    const fetchData = async () => {
      try {
        if (globalStudentsCache && globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL) {
           setStudents(globalStudentsCache);
           setBatches(globalBatchesCache);
           setLoading(false);
           return;
        }

        const [rawUsers, rawBatches] = await Promise.all([
          api.getUsers(),
          api.getBatches(),
        ]);
        
        const studentsData: AppUser[] = rawUsers
          .filter(u => u.role !== 'admin')
          .map(u => mapUserProfileToUser(u));
        setStudents(studentsData);
        globalStudentsCache = studentsData;

        const batchesData: Batch[] = rawBatches.map(b => ({
          id: b.id,
          name: b.name,
          schedule: (b as any).schedule || '',
          createdAt: b.createdAt
        }));
        setBatches(batchesData);
        globalBatchesCache = batchesData;

        globalCacheTime = Date.now();
      } catch (error) {
        console.error("fetchData error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const getStudentId = (s: any): string => s.id || s.uid || '';

  const handleStatusChange = async (uid: string, newStatus: string) => {
    try {
      await api.updateUserStatus(uid, newStatus as any);
      globalStudentsCache = null;
      setStudents(students.map(s => getStudentId(s) === uid ? { ...s, status: newStatus as any, updatedAt: newStatus === 'active' ? new Date().toISOString() : s.updatedAt } : s));
    } catch (error) {
      console.error("handleStatusChange error:", error);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Failed to update status." }));
    }
  };

  const handleBatchChange = async (uid: string, batchId: string) => {
    try {
      await api.saveUser({ id: uid, batchId } as any);
      globalStudentsCache = null;
      setStudents(students.map(s => getStudentId(s) === uid ? { ...s, batchId } : s));
    } catch (error) {
      console.error("handleBatchChange error:", error);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "Failed to change batch." }));
    }
  };

  const handleDeleteStudent = (uid: string) => {
    setConfirmDeleteStudentId(uid);
  };

  const executeDeleteStudent = async () => {
    if (!confirmDeleteStudentId) return;
    const uid = confirmDeleteStudentId;
    // Close the dialog and remove the row immediately (optimistic); restore on failure.
    const snapshot = students;
    setConfirmDeleteStudentId(null);
    setStudents(prev => prev.filter(s => getStudentId(s) !== uid));
    showToast('ছাত্র মুছে ফেলা হচ্ছে…', 'info', 2000);
    try {
      const success = await api.deleteUser(uid);
      if (success === false || success === null || success === undefined) {
        setStudents(snapshot);
        showToast('ডিলিট হয়নি — ছাত্রকে খুঁজে পাওয়া যায়নি। Refresh করুন।', 'error', 5000);
        return;
      }
      globalStudentsCache = null;
      showToast('ছাত্র মুছে ফেলা হয়েছে ✓');
    } catch (error) {
      setStudents(snapshot);
      showToast('ছাত্র মুছতে ব্যর্থ হয়েছে: ' + String(error).slice(0, 80), 'error', 5000);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
      <div className="flex justify-between items-start">
        <PageHeader title="Manage Students (Attendance & Settings)" backTo="/admin" />
        <button 
           onClick={() => setRefreshKey(k => k + 1)} 
           disabled={loading}
           className="bg-black dark:bg-zinc-100 text-white dark:text-black font-bold uppercase text-xs px-4 py-2 border-2 border-transparent hover:-translate-y-0.5 transition-transform shrink-0 disabled:opacity-50"
        >
           {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Delete Student Confirmation Modal */}
      {confirmDeleteStudentId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 p-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] max-w-md w-full">
            <h3 className="text-xl font-black uppercase text-red-600 mb-4">⚠️ Permanently Delete Student?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-bold">
              Student: <span className="text-zinc-900 dark:text-zinc-100">{students.find(s => getStudentId(s) === confirmDeleteStudentId)?.fullName || students.find(s => getStudentId(s) === confirmDeleteStudentId)?.displayName || 'Unknown'}</span>
            </p>
            <p className="text-xs text-zinc-500 mb-6">This will permanently remove the student and all their payment records, attendance, and exam data from the database. This action <strong>cannot be undone</strong>.</p>
            <div className="flex gap-4">
              <button onClick={executeDeleteStudent} className="flex-1 border-2 border-red-600 bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform">Yes, Delete</button>
              <button onClick={() => setConfirmDeleteStudentId(null)} className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-200 dark:bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full relative">
            <button 
              onClick={() => setSelectedStudentForModal(null)} 
              className="absolute top-4 right-4 bg-red-100 text-red-600 p-2 border-2 border-red-600 hover:bg-red-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-4">
               {selectedStudentForModal.profilePhotoUrl ? (
                  <img src={selectedStudentForModal.profilePhotoUrl} alt="Profile" className="w-16 h-16 object-cover border-4 border-black" loading="lazy" decoding="async" width="64" height="64" />
               ) : (
                  <div className="w-16 h-16 bg-zinc-200 border-4 border-black flex items-center justify-center text-xs font-bold">N/A</div>
               )}
               {selectedStudentForModal.fullName || selectedStudentForModal.displayName || 'Unknown'}
            </h3>
            
            <div className="space-y-4">
               <div className="bg-zinc-100 dark:bg-zinc-800 p-3 border-2 border-zinc-900 dark:border-zinc-100">
                 <div className="text-xs font-bold uppercase text-zinc-500">Email</div>
                 <div className="font-mono mt-1">{selectedStudentForModal.email}</div>
               </div>
               
               <div className="bg-zinc-100 dark:bg-zinc-800 p-3 border-2 border-zinc-900 dark:border-zinc-100 flex gap-4">
                 <div className="flex-1">
                   <div className="text-xs font-bold uppercase text-zinc-500">Phone</div>
                   <div className="font-bold mt-1">{selectedStudentForModal.phone || 'Not provided'}</div>
                 </div>
                 <div className="flex-1 border-l-2 border-zinc-300 dark:border-zinc-700 pl-4">
                   <div className="text-xs font-bold uppercase text-zinc-500">Status</div>
                   <div className="font-bold mt-1 uppercase text-emerald-600">{selectedStudentForModal.status}</div>
                 </div>
               </div>

               <div className="bg-zinc-100 dark:bg-zinc-800 p-3 border-2 border-zinc-900 dark:border-zinc-100">
                 <div className="text-xs font-bold uppercase text-zinc-500">Home Address</div>
                 <div className="font-mono mt-1 text-sm">{selectedStudentForModal.address || 'Not provided'}</div>
               </div>
               
               {selectedStudentForModal.joinDate && (
                 <div className="text-xs font-bold uppercase text-zinc-500 text-right mt-2">
                   Joined Date: {formatDateOnlySafe(selectedStudentForModal.joinDate)}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Mock Student Form */}
      <div className="mb-8 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)]">
        <div className="flex justify-between items-center mb-4">
           <h3 className="font-black text-xl text-yellow-600 dark:text-yellow-400 uppercase">Simulator Test Tools</h3>
           <button 
             onClick={() => setAddingNewStudent(!addingNewStudent)}
             className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs uppercase"
           >
             {addingNewStudent ? 'Cancel' : '+ Create Virtual Student'}
           </button>
        </div>
        
        {addingNewStudent && (
          <form onSubmit={handleCreateStudent} className="flex flex-col sm:flex-row gap-4 items-end mt-4">
             <div className="flex-1 w-full">
               <label className="block text-xs font-bold uppercase mb-1">Full Name</label>
               <input 
                 value={newStudentName} 
                 onChange={e => setNewStudentName(e.target.value)}
                 className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none" 
                 placeholder="e.g. Rahul Sharma"
                 required
               />
             </div>
             <div className="flex-1 w-full">
               <label className="block text-xs font-bold uppercase mb-1">Email</label>
               <input 
                 value={newStudentEmail} 
                 onChange={e => setNewStudentEmail(e.target.value)}
                 className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none" 
                 placeholder="e.g. rahul@example.com"
                 required
                 type="email"
               />
             </div>
             <div className="flex-1 w-full">
               <label className="block text-xs font-bold uppercase mb-1">Phone</label>
               <input 
                 value={newStudentPhone} 
                 onChange={e => setNewStudentPhone(e.target.value)}
                 className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none" 
                 placeholder="e.g. 9876543210"
                 required
                 type="tel"
               />
             </div>
             <div className="flex-1 w-full">
               <label className="block text-xs font-bold uppercase mb-1">Assign Batch</label>
               <select 
                 value={newStudentBatch} 
                 onChange={e => setNewStudentBatch(e.target.value)}
                 className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none"
                 required
               >
                 <option value="">-- Select Batch --</option>
                 {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                 ))}
               </select>
             </div>
             <button type="submit" className="px-6 py-2 bg-green-500 text-black border-2 border-black font-bold uppercase text-sm whitespace-nowrap shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5">
               Save Student
             </button>
          </form>
        )}
        <p className="text-xs text-zinc-500 font-bold mt-4">Note: Use this to safely generate random student profiles for testing features (Payments, Results, Library) securely. No google sign-in needed.</p>
      </div>

      {batches.length > 0 && (
        <div className="mb-8 border-4 border-black bg-white dark:bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col">
          <div className="flex overflow-x-auto border-b-4 border-black scrollbar-hide">
            {batches.map(batch => (
              <button
                key={batch.id}
                onClick={() => {
                   setActiveBatchTab(batch.id);
                   setAttendanceSearchQuery('');
                   setAttendanceDateFilter('');
                 }}
                className={`px-4 py-3 font-bold text-sm uppercase whitespace-nowrap border-r-4 border-black transition-colors ${
                  activeBatchTab === batch.id 
                    ? 'bg-yellow-300 text-black' 
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {batch.name}
              </button>
            ))}
          </div>

          <div className="p-4 flex-1">
            {activeBatchTab && (
              <div className="mb-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase mb-1">Search Student</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      className="w-full border-2 border-zinc-900 dark:border-zinc-100 pl-10 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase mb-1">Filter by Date</label>
                  <select
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                    className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none"
                  >
                    <option value="">All Days</option>
                    {(attendanceData[activeBatchTab] || []).map(r => (
                      <option key={r.date} value={r.date}>{r.date}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeBatchTab && (() => {
              const records = attendanceData[activeBatchTab] || [];
              const rawBatchStudents = students.filter((s) => s.batchId && String(s.batchId).split(',').map(id => id.trim()).includes(activeBatchTab));
              
              const filteredStudents = rawBatchStudents.filter(s => {
                if (!attendanceSearchQuery) return true;
                const search = String(attendanceSearchQuery || '').toLowerCase();
                return String(s.fullName || '').toLowerCase().includes(search) || String(s.email || '').toLowerCase().includes(search);
              });
              
              const filteredRecords = records.filter(r => {
                if (!attendanceDateFilter) return true;
                return r.date === attendanceDateFilter;
              });

              if (rawBatchStudents.length === 0) {
                return <p className="text-sm p-4 text-center font-bold text-zinc-500">There are no students in this batch yet.</p>;
              }
              if (records.length === 0) {
                return <p className="text-sm border-2 border-dashed border-gray-300 dark:border-zinc-700 p-4 text-center">কোনো উপস্থিতির তথ্য নেই</p>;
              }
              if (filteredStudents.length === 0) {
                return <p className="text-sm border-2 border-dashed border-gray-300 dark:border-zinc-700 p-4 text-center">No students match your search.</p>;
              }

              return (
                <div className="overflow-x-auto max-h-[500px] border-2 border-black">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="border-b-2 border-r-2 border-black px-3 py-2 text-left bg-black text-white w-48 min-w-[192px]">ছাত্র</th>
                        {filteredRecords.map((r) => (
                          <th key={r.date} className="border-b-2 border-r-2 border-black px-3 py-2 bg-yellow-200 text-black text-center whitespace-nowrap min-w-[100px]">
                            {r.date}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, i) => {
                        return (
                          <tr key={student.uid} className={i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-zinc-50 dark:bg-zinc-800"}>
                            <td className="border-r-2 border-b border-zinc-200 dark:border-zinc-700 border-l border-zinc-200 px-3 py-2 font-bold whitespace-nowrap overflow-hidden text-ellipsis w-48 max-w-[192px]">
                              {student.exemptReason && student.exemptReason.length > 0 ? '❌ ' : ''}
                              {student.fullName || student.email}
                            </td>
                            {filteredRecords.map((r) => {
                              return (
                                <td key={r.date} className="border-r border-b border-zinc-200 dark:border-zinc-700 px-3 py-2 text-center align-middle">
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="text-xl leading-none">{r.presentStudentIds.includes(student.uid) ? '✅' : '❌'}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {(() => {
        const pendingStudents = students.filter(s => s.status === 'pending');
        const displayStudents = studentTab === 'pending' 
          ? pendingStudents
          : studentTab === 'all'
            ? students.filter(s => s.status === 'active')
            : studentTab === 'at_risk'
              ? students.filter(s => s.status === 'active' && s.batchId && (studentAbsentCount[s.uid] || 0) >= 3)
              : students.filter(s => s.status === 'active' && s.batchId && String(s.batchId).split(',').map(id => id.trim()).includes(studentTab));

        const atRiskCount = students.filter(s => s.status === 'active' && s.batchId && (studentAbsentCount[s.uid] || 0) >= 3).length;

        return (
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] overflow-x-auto w-full mt-8">
            <div className="mb-6 flex overflow-x-auto border-b-4 border-black scrollbar-hide">
              <button
                onClick={() => setStudentTab('pending')}
                className={`px-4 py-3 font-bold text-sm uppercase whitespace-nowrap border-r-4 border-black transition-colors ${
                  studentTab === 'pending' ? 'bg-yellow-300 text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Approval Requests ({pendingStudents.length})
              </button>
              {batches.map(batch => (
                <button
                  key={batch.id}
                  onClick={() => setStudentTab(batch.id)}
                  className={`px-4 py-3 font-bold text-sm uppercase whitespace-nowrap border-r-4 border-black transition-colors ${
                    studentTab === batch.id ? 'bg-blue-300 text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {batch.name} ({students.filter(s => s.status === 'active' && s.batchId && String(s.batchId).split(',').map(id => id.trim()).includes(batch.id)).length})
                </button>
              ))}
              <button
                onClick={() => setStudentTab('at_risk')}
                className={`px-4 py-3 font-bold text-sm uppercase whitespace-nowrap border-r-4 border-black transition-colors ${
                  studentTab === 'at_risk' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                }`}
                title="Has not taken any exams in the last 3 days"
              >
                No Exams (3+ Days) ⚠️ ({atRiskCount})
              </button>
              <button
                onClick={() => setStudentTab('all')}
                className={`px-4 py-3 font-bold text-sm uppercase whitespace-nowrap border-r-4 border-black transition-colors ${
                  studentTab === 'all' ? 'bg-purple-300 text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                All Active
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100">
                    <th className="p-2 font-bold uppercase text-xs">Profile</th>
                    <th className="p-2 font-bold uppercase text-xs">Name / Email</th>
                    <th className="p-2 font-bold uppercase text-xs">Last Active</th>
                    <th className="p-2 font-bold uppercase text-xs hidden md:table-cell">Contact</th>
                    <th className="p-2 font-bold uppercase text-xs">Batch</th>
                    <th className="p-2 font-bold uppercase text-xs">Status</th>
                    <th className="p-2 font-bold uppercase text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-zinc-500 font-medium">No students found in this category.</td>
                    </tr>
                  )}
                  {displayStudents.map((student) => {
                    const sId = getStudentId(student);
                    const absentDays = studentAbsentCount[sId] || studentAbsentCount[student.uid] || 0;
                    return (
                    <tr key={sId} className="border-b border-zinc-200 dark:border-zinc-800" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 64px' }}>
                      <td className="p-2">
                        {student.profilePhotoUrl ? (
                          <button type="button" onClick={() => zoomPhoto(student.profilePhotoUrl, student.name)} aria-label="View photo">
                             <img src={student.profilePhotoUrl} alt="Profile" className="w-11 h-11 rounded-xl object-cover border border-zinc-300" loading="lazy" decoding="async" width="44" height="44" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">N/A</div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-bold cursor-pointer hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-2" onClick={() => setSelectedStudentForModal(student)}>
                          {student.exemptReason && student.exemptReason.length > 0 ? '❌ ' : ''}
                          {student.fullName || student.displayName || 'Unknown'}
                          {Number(student.pendingMonths) > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 font-black uppercase rounded ${
                              Number(student.pendingMonths) >= 2 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-yellow-300 text-black border border-yellow-400'
                            }`} title="Overdue alert">
                              {student.pendingMonths}M Due
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{student.email}</div>
                      </td>
                  <td className="p-2">
                    {absentDays >= 3 ? (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-900 text-[10px] font-black uppercase border border-red-300 animate-pulse">
                        Absent: {absentDays} exams
                      </span>
                    ) : absentDays === 0 ? (
                      <span className="text-xs font-bold text-emerald-600 uppercase whitespace-nowrap">Up to date</span>
                    ) : (
                      <span className="text-xs font-bold text-yellow-600 uppercase whitespace-nowrap">
                        Missed: {absentDays} exam{absentDays > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="p-2 hidden md:table-cell text-sm">
                    {student.phone ? <div className="font-bold">{student.phone}</div> : null}
                    {student.address ? <div className="text-xs text-zinc-500 line-clamp-1">{student.address}</div> : null}
                    {student.joinDate ? <div className="text-[10px] text-zinc-400 uppercase mt-1">Joined: {formatDateOnlySafe(student.joinDate)}</div> : null}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {student.batchId ? String(student.batchId).split(',').map(id => {
                          const b = batches.find(bx => bx.id === id.trim());
                          return b ? b.name : '';
                        }).filter(Boolean).join(', ') : 'No Batch'}
                      </div>
                      <button 
                        onClick={() => {
                          const currentBatches = student.batchId ? String(student.batchId).split(',').map(id => id.trim()).filter(Boolean) : [];
                          setEditingStudentBatches({ uid: sId, batchIds: new Set(currentBatches) });
                        }}
                        className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 font-bold uppercase w-fit hover:bg-zinc-300 dark:hover:bg-zinc-700"
                      >
                        ✎ Edit Batches
                      </button>
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase ${
                      student.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-[1px] border-emerald-300' :
                      student.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-[1px] border-yellow-300' :
                      'bg-red-100 text-red-800 border-[1px] border-red-300'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-2">
                          {student.status === 'pending' && (
                            <>
                              <button onClick={() => { handleStatusChange(sId, 'active'); setStudentTab('all'); }} className="p-1 px-2 border-2 border-emerald-600 bg-emerald-500 text-white font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform" title="Approve">
                                Approve
                              </button>
                              <button onClick={() => handleStatusChange(sId, 'rejected')} className="p-1 px-2 border-2 border-red-600 bg-red-500 text-white font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform" title="Reject">
                                Reject
                              </button>
                            </>
                          )}
                          
                             <button onClick={() => {
                                setEditingStudentProfile(student);
                                setEditProfileName(student.fullName || student.displayName || '');
                                setEditProfilePhone(student.phone || '');
                                setEditProfilePasscode(student.passcode || '');
                              }} className="p-1 px-2 border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform flex items-center justify-center" title="Edit Profile">
                                ✎ Edit
                             </button>

                             <button onClick={() => handleDeleteStudent(sId)} className="p-1 px-2 border-2 border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform flex items-center justify-center" title="Delete Student">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}

      {/* Edit Batches Modal */}
      {editingStudentBatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase mb-4 text-black dark:text-white">Edit Student Batches</h3>
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto mb-6 p-2 border-2 border-zinc-200 dark:border-zinc-800">
              {batches.map(b => {
                const isChecked = editingStudentBatches.batchIds.has(b.id);
                return (
                  <label key={b.id} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-5 h-5 accent-black"
                      checked={isChecked}
                      onChange={(e) => {
                        const newSet = new Set(editingStudentBatches.batchIds);
                        if (e.target.checked) newSet.add(b.id);
                        else newSet.delete(b.id);
                        setEditingStudentBatches({ ...editingStudentBatches, batchIds: newSet });
                      }}
                    />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{b.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingStudentBatches(null)} className="px-4 py-2 font-bold uppercase text-xs border-2 border-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Cancel
              </button>
              <button 
                onClick={() => {
                  const newBatchString = Array.from(editingStudentBatches.batchIds).join(', ');
                  handleBatchChange(editingStudentBatches.uid, newBatchString);
                  setEditingStudentBatches(null);
                }} 
                className="px-4 py-2 font-bold uppercase text-xs bg-yellow-400 text-black border-2 border-black hover:-translate-y-0.5 transition-transform"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase mb-4 text-black dark:text-white">Edit Student Profile</h3>
            
            <div className="flex flex-col gap-3 mb-6">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={editProfileName} 
                  onChange={e => setEditProfileName(e.target.value)}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Phone Number</label>
                <input 
                  type="text" 
                  value={editProfilePhone} 
                  onChange={e => setEditProfilePhone(e.target.value)}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Passcode (For Login)</label>
                <input 
                  type="text" 
                  value={editProfilePasscode} 
                  onChange={e => setEditProfilePasscode(e.target.value)}
                  className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingStudentProfile(null)} 
                disabled={isSavingProfile}
                className="px-4 py-2 font-bold uppercase text-xs border-2 border-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile}
                className="px-4 py-2 font-bold uppercase text-xs bg-blue-500 text-white border-2 border-black hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminStudents;
