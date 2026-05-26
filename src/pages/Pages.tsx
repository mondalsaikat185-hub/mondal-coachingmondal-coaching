import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, X, Loader2, Trash2, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { AppUser, useAuth } from '../components/AuthProvider';
import { UnifiedQuizPlayer } from '../components/quiz/UnifiedQuizPlayer';
import { getAllAttendanceForBatch } from '../lib/exam-session-utils';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function getMonthOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return [
    ...monthNames.map(m => `${m} ${currentYear - 1}`),
    ...monthNames.map(m => `${m} ${currentYear}`),
    ...monthNames.map(m => `${m} ${currentYear + 1}`),
    ...monthNames.map(m => `${m} ${currentYear + 2}`)
  ];
}

export function formatDateTimeSafe(timestamp: any): string {
  if (!timestamp) return "N/A";
  let d: Date | null = null;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else if (typeof timestamp === 'number') {
    d = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      d = new Date(timestamp.replace(' ', 'T'));
    }
  } else if (typeof timestamp === 'object') {
    if (timestamp.seconds) {
      d = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      d = timestamp.toDate();
    }
  }

  if (!d || isNaN(d.getTime())) {
    return "N/A";
  }

  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

export function getDueMonths(pendingMonthsCount: number, studentPayments: any[]): string {
  if (!pendingMonthsCount || pendingMonthsCount <= 0) return "";
  
  const monthOptions = getMonthOptions();

  // Find all paid/approved/pending months
  const paidMonths = studentPayments
    .filter(p => p.status === 'paid' || p.status === 'approved' || p.status === 'pending')
    .flatMap(p => p.month.split(',').map((m: string) => m.trim()));
    
  const paidIndices = paidMonths.map(m => monthOptions.indexOf(m)).filter(idx => idx !== -1);
  const maxPaidIndex = paidIndices.length > 0 ? Math.max(...paidIndices) : -1;

  const dueMonths: string[] = [];
  // Next month after the last paid month
  let startIndex = maxPaidIndex !== -1 ? maxPaidIndex + 1 : monthOptions.findIndex(m => m.startsWith(monthNames[new Date().getMonth()]));
  if (startIndex === -1) startIndex = 12; // Fallback to current year start (January)

  for (let i = 0; i < pendingMonthsCount; i++) {
    const idx = startIndex + i;
    if (idx < monthOptions.length) {
      dueMonths.push(monthOptions[idx]);
    }
  }

  if (dueMonths.length === 0) return `${pendingMonthsCount} month(s)`;
  return dueMonths.join(', ');
}

export function PageHeader({ title, backTo, description, onBack }: { title: string, backTo?: string, description?: string, onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col mb-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack ? onBack : () => backTo && navigate(backTo)}
          className="p-2 border-2 border-zinc-900 dark:border-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none">{title}</h2>
          {description && <p className="text-sm font-bold text-zinc-500 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
}

// Simple global cache to prevent excessive quota reads
let globalStudentsCache: AppUser[] | null = null;
let globalBatchesCache: Batch[] | null = null;
let globalCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ADMIN PAGES
export function AdminStudents() {
  const [students, setStudents] = useState<AppUser[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentAbsentCount, setStudentAbsentCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentBatch, setNewStudentBatch] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [addingNewStudent, setAddingNewStudent] = useState(false);
  const [studentTab, setStudentTab] = useState<string>('pending');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<AppUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentBatch || !newStudentPhone) return;
    try {
      const mockUid = "student_" + Date.now() + Math.floor(Math.random()*1000);
      await api.saveUser({
        id: mockUid,
        email: newStudentEmail.toLowerCase(),
        name: newStudentName,
        phone: newStudentPhone,
        role: 'student',
        status: 'active',
        batchId: newStudentBatch,
        isProfileComplete: true,
        monthlyFee: 500,
      } as any);
      globalStudentsCache = null;
      setStudents(prev => [...prev, {
        uid: mockUid,
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
      alert(`Student ${newStudentName} created successfully!`);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentBatch('');
      setNewStudentPhone('');
      setAddingNewStudent(false);
    } catch (err) {
      alert("Error creating student: " + String(err));
    }
  };

  const [attendanceData, setAttendanceData] = useState<
    Record<string, Array<{ date: string; presentStudentIds: string[] }>>
  >({});
  
  const [activeBatchTab, setActiveBatchTab] = useState<string>('');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');

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
          const sBatchAtt = attendanceData[s.batchId!] || [];
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
             const studentExcusedDates = s.excusedDates ? s.excusedDates.split(',').filter(Boolean) : [];
             const isExcused = studentExcusedDates.includes(sBatchAtt[i].date);
             
             if (!sBatchAtt[i].presentStudentIds.includes(s.uid) && !isExcused) {
                recentAbsences++;
             } else {
                break; // they were present or excused recently
             }
          }
          newAbsentCount[s.uid] = recentAbsences;
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
        monthlyFee: profile.monthlyFee !== undefined ? Number(profile.monthlyFee) : 500,
        pendingMonths: profile.pendingMonths !== undefined ? Number(profile.pendingMonths) : 0,
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

  const handleStatusChange = async (uid: string, newStatus: string) => {
    try {
      await api.updateUserStatus(uid, newStatus as any);
      globalStudentsCache = null;
      setStudents(students.map(s => s.uid === uid ? { ...s, status: newStatus as any, updatedAt: newStatus === 'active' ? new Date().toISOString() : s.updatedAt } : s));
    } catch (error) {
      console.error("handleStatusChange error:", error);
      alert("Failed to update status.");
    }
  };

  const handleBatchChange = async (uid: string, batchId: string) => {
    try {
      await api.saveUser({ id: uid, batchId } as any);
      globalStudentsCache = null;
      setStudents(students.map(s => s.uid === uid ? { ...s, batchId } : s));
    } catch (error) {
      console.error("handleBatchChange error:", error);
      alert("Failed to change batch.");
    }
  };

  const handleDeleteStudent = (uid: string) => {
    setConfirmDeleteStudentId(uid);
  };

  const executeDeleteStudent = async () => {
    if (!confirmDeleteStudentId) return;
    const uid = confirmDeleteStudentId;
    try {
      if (localStorage.getItem("mc_coaching_mock_db")) {
        try {
          const raw = localStorage.getItem("mc_coaching_mock_db");
          if (raw) {
            const db = JSON.parse(raw);
            db.users = db.users.filter((u: any) => u.id !== uid);
            localStorage.setItem("mc_coaching_mock_db", JSON.stringify(db));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        await api.deleteUser(uid);
      }
      globalStudentsCache = null;
      setStudents(students.filter(s => s.uid !== uid));
    } catch (error) {
       alert("Error deleting student: " + String(error));
    } finally {
      setConfirmDeleteStudentId(null);
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
                  <img src={selectedStudentForModal.profilePhotoUrl} alt="Profile" className="w-16 h-16 object-cover border-4 border-black" />
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
                   Joined Date: {selectedStudentForModal.joinDate}
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
              const rawBatchStudents = students.filter((s) => s.batchId === activeBatchTab);
              
              const filteredStudents = rawBatchStudents.filter(s => {
                if (!attendanceSearchQuery) return true;
                const search = attendanceSearchQuery.toLowerCase();
                return s.fullName?.toLowerCase().includes(search) || s.email.toLowerCase().includes(search);
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
              : students.filter(s => s.status === 'active' && s.batchId === studentTab);

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
                  {batch.name} ({students.filter(s => s.status === 'active' && s.batchId === batch.id).length})
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
                    const absentDays = studentAbsentCount[student.uid] || 0;
                    return (
                    <tr key={student.uid} className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2">
                        {student.profilePhotoUrl ? (
                          <a href={student.profilePhotoUrl} target="_blank" rel="noopener noreferrer">
                             <img src={student.profilePhotoUrl} alt="Profile" className="w-10 h-10 object-cover border border-zinc-300" />
                          </a>
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
                    {student.joinDate ? <div className="text-[10px] text-zinc-400 uppercase mt-1">Joined: {student.joinDate}</div> : null}
                  </td>
                  <td className="p-2">
                    <select
                      value={student.batchId || ''}
                      onChange={(e) => handleBatchChange(student.uid, e.target.value)}
                      className="border-2 border-zinc-200 dark:border-zinc-800 p-1 bg-transparent text-sm w-full max-w-[150px] text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="" className="text-zinc-900">No Batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id} className="text-zinc-900">{b.name}</option>
                      ))}
                    </select>
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
                              <button onClick={() => { handleStatusChange(student.uid, 'active'); setStudentTab(student.batchId || 'all'); }} className="p-1 px-2 border-2 border-emerald-600 bg-emerald-500 text-white font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform" title="Approve">
                                Approve
                              </button>
                              <button onClick={() => handleStatusChange(student.uid, 'rejected')} className="p-1 px-2 border-2 border-red-600 bg-red-500 text-white font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform" title="Reject">
                                Reject
                              </button>
                            </>
                          )}
                          
                             <button onClick={() => handleDeleteStudent(student.uid)} className="p-1 px-2 border-2 border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs uppercase hover:-translate-y-0.5 transition-transform flex items-center justify-center" title="Delete Student">
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
    </div>
  );
}

export interface Batch {
  id: string;
  name: string;
  schedule: string;
  createdAt?: any;
}

export function AdminBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchedule, setEditSchedule] = useState('');

  const fetchBatches = async () => {
    try {
      const rawBatches = await api.getBatches();
      const data: Batch[] = rawBatches.map(b => ({
        id: b.id,
        name: b.name,
        schedule: (b as any).schedule || '',
        createdAt: b.createdAt
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
        schedule: editSchedule.trim()
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
    if (!window.confirm("Are you sure you want to permanently delete this? This action cannot be undone.")) return;
    try {
      setLoading(true);
      
      if (localStorage.getItem("mc_coaching_mock_db")) {
        try {
          const raw = localStorage.getItem("mc_coaching_mock_db");
          if (raw) {
            const db = JSON.parse(raw);
            db.users = db.users.map((u: any) => u.batchId === id ? { ...u, batchId: "" } : u);
            localStorage.setItem("mc_coaching_mock_db", JSON.stringify(db));
          }
        } catch (e) {
          console.error(e);
        }
      }

      await api.deleteBatch(id);
      globalBatchesCache = null;
      globalStudentsCache = null;
      await fetchBatches();
    } catch (error) {
      console.error("handleDeleteBatch error:", error);
      alert("Error deleting batch.");
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
                  <th className="p-2 font-bold uppercase text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-zinc-500 font-medium">No batches found.</td>
                  </tr>
                )}
                {batches.map((batch) => (
                  <React.Fragment key={batch.id}>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2 font-bold">{batch.name}</td>
                      <td className="p-2 text-sm">{batch.schedule}</td>
                      <td className="p-2 flex justify-end gap-2 items-center">
                         <button onClick={() => {
                             setEditingBatch(batch);
                             setEditName(batch.name);
                             setEditSchedule(batch.schedule);
                          }} className="p-1 px-3 bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 font-bold uppercase text-[10px]">
                             Edit
                          </button>
                          <button onClick={() => handleDeleteBatch(batch.id)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded">
                            <Trash2 className="w-5 h-5" />
                          </button>
                      </td>
                    </tr>
                    {editingBatch?.id === batch.id && (
                      <tr className="border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                        <td colSpan={3} className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" placeholder="Name" />
                          <input type="text" value={editSchedule} onChange={e => setEditSchedule(e.target.value)} className="border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm w-full bg-white dark:bg-zinc-800" placeholder="Schedule" />
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

export function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingProofPayment, setViewingProofPayment] = useState<Payment | null>(null);
  
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  const [addingOfflinePayment, setAddingOfflinePayment] = useState(false);
  const [offlineMonth, setOfflineMonth] = useState('');
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  
  const monthOptions = getMonthOptions();

  const fetchAll = async () => {
    try {
      setLoading(true);
      
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
          studentEmail: student ? student.email : '',
          amount: p.amount,
          month: p.month,
          status: p.status as any,
          remarks: (p as any).remarks || '',
          transactionId: (p as any).transactionId || '',
          proofImage: (p as any).proofImage || '',
          paymentMode: (p as any).paymentMode || 'manual',
          createdAt: p.createdAt
        };
      });
      const getMs = (t: any) => new Date(t).getTime() || 0;
      pData.sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));
      setPayments(pData);

      if (globalStudentsCache && globalBatchesCache && Date.now() - globalCacheTime < CACHE_TTL) {
         setStudents(globalStudentsCache);
         setBatches(globalBatchesCache);
      } else {
         const uData: any[] = rawUsers
           .filter(u => u.role !== 'admin')
           .map(u => ({
             id: u.id,
             fullName: u.name,
             email: u.email,
             phone: u.phone,
             status: u.status,
             batchId: u.batchId,
             monthlyFee: (u as any).monthlyFee === undefined ? 500 : Number((u as any).monthlyFee),
             pendingMonths: (u as any).pendingMonths || 0,
             exemptReason: (u as any).exemptReason || '',
             showPaymentNudge: !!(u as any).showPaymentNudge
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
       alert("Error updating student: " + String(err));
    }
  };

  const updatePaymentStatus = async (id: string, status: 'approved' | 'rejected', remarks: string = '') => {
    if (status === 'rejected' && !remarks) {
      setRejectingPaymentId(id);
      return;
    }
    try {
      if (localStorage.getItem("mc_coaching_mock_db")) {
        try {
          const raw = localStorage.getItem("mc_coaching_mock_db");
          if (raw) {
            const db = JSON.parse(raw);
            const idx = db.payments.findIndex((p: any) => p.id === id);
            if (idx !== -1) {
              db.payments[idx].status = status;
              if (remarks) db.payments[idx].remarks = remarks;
              localStorage.setItem("mc_coaching_mock_db", JSON.stringify(db));
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      await api.updatePaymentStatus(id, status as any, remarks);
      setPayments(payments.map(p => p.id === id ? { ...p, status, remarks } : p));
      
      if (status === 'rejected') {
         const paymentToUpdate = payments.find(p => p.id === id);
         if (paymentToUpdate) {
            await api.createNotification({
               senderId: user?.uid || 'admin',
               title: 'Payment Rejected',
               message: `Your payment request for ${paymentToUpdate.month} has been rejected. Reason: ${remarks}`,
               batchId: paymentToUpdate.studentId
            });
         }
         
         setRejectingPaymentId(null);
         setRejectReason('');
      }
    } catch (error) {
      console.error("updatePaymentStatus error:", error);
      alert("Failed to update payment status.");
    }
  };

  const updatePaymentAmount = async (id: string) => {
    if (!editingAmount) {
       setEditingAmountId(null);
       return;
    }
    try {
      const newAmount = Number(editingAmount);
      
      if (localStorage.getItem("mc_coaching_mock_db")) {
        try {
          const raw = localStorage.getItem("mc_coaching_mock_db");
          if (raw) {
            const db = JSON.parse(raw);
            const idx = db.payments.findIndex((p: any) => p.id === id);
            if (idx !== -1) {
              db.payments[idx].amount = newAmount;
              localStorage.setItem("mc_coaching_mock_db", JSON.stringify(db));
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      if (api.isProduction()) {
        try {
          // @ts-ignore
          if (typeof google !== 'undefined') {
            // @ts-ignore
            await new Promise((res, rej) => {
              // @ts-ignore
              google.script.run
                .withSuccessHandler(res)
                .withFailureHandler(rej)
                .apiUpdatePaymentAmount(id, newAmount);
            });
          }
        } catch (err) {
          console.warn("GAS apiUpdatePaymentAmount failed", err);
        }
      }

      setPayments(payments.map(p => p.id === id ? { ...p, amount: newAmount } : p));
      setEditingAmountId(null);
      setEditingAmount('');
    } catch (error) {
      alert("Error updating payment amount: " + String(error));
    }
  };

  const handleAddOfflinePayment = async () => {
     if (!selectedStudentId || !offlineMonth || !offlineAmount) return;
     const student = students.find(s => s.id === selectedStudentId);
     if (!student) return;
     setOfflineSubmitting(true);
     try {
       const offlinePay = {
          studentId: student.id,
          studentName: student.fullName || student.displayName || student.email,
          studentEmail: student.email || '',
          amount: Number(offlineAmount),
          month: offlineMonth,
          status: 'approved' as any,
          remarks: 'Offline Payment (Cash/Direct)'
       };
       const pRef = await api.addPayment(offlinePay as any);
       
       setPayments([{ id: pRef.id, ...offlinePay, createdAt: new Date().toISOString() } as any, ...payments]);
       setAddingOfflinePayment(false);
       setOfflineMonth('');
       setOfflineAmount('');
     } catch(err) {
       console.error("handleAddOfflinePayment error:", err);
       alert("Failed to add offline payment.");
     } finally {
       setOfflineSubmitting(false);
     }
  };

  const rejectModal = rejectingPaymentId ? (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[100] p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 dark:border-red-500 w-full max-w-md p-6 transform transition-all scale-100 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <h3 className="font-black text-xl text-red-600 uppercase mb-4">Reject Payment Request</h3>
        <p className="text-zinc-500 font-bold text-xs mb-2 uppercase">Please provide a reason for the rejection.</p>
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 text-sm bg-transparent mb-4 outline-none focus:border-red-500" placeholder="e.g. Transaction ID invalid" rows={3} />
        <div className="flex gap-4">
          <button onClick={() => updatePaymentStatus(rejectingPaymentId, 'rejected', rejectReason || 'Payment declined by admin.')} className="flex-1 border-2 border-red-600 bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform">Reject</button>
          <button onClick={() => setRejectingPaymentId(null)} className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-200 dark:bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] font-bold uppercase py-2 hover:-translate-y-0.5 transition-transform">Cancel</button>
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
           {(viewingProofPayment as any).proofImage ? (
              <img src={(viewingProofPayment as any).proofImage} alt="Payment proof screenshot" className="w-full border-2 border-zinc-300 dark:border-zinc-600" />
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
     const student = students.find(s => s.id === selectedStudentId);
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
              <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 updateStudentPaymentDetails(student.id, {
                    monthlyFee: Number(formData.get('monthlyFee')),
                    exemptReason: formData.get('exemptReason'),
                    pendingMonths: Number(formData.get('pendingMonths')),
                    showPaymentNudge: formData.get('showPaymentNudge') === 'on'
                 });
                 alert("Config saved successfully!");
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
                  <button onClick={() => { setAddingOfflinePayment(!addingOfflinePayment); setOfflineAmount(String(student.monthlyFee || 500)); }} className="px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold uppercase hover:-translate-y-0.5 transition-transform flex items-center gap-1">
                     <Plus className="w-3.5 h-3.5" /> Offline
                  </button>
                </div>

                {addingOfflinePayment && (
                  <div className="mb-4 space-y-3 p-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-zinc-100">
                     <div>
                       <select value={offlineMonth} onChange={e => setOfflineMonth(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none">
                          <option value="">Select Month...</option>
                          {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                     </div>
                     <div>
                       <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-sm">
                          <span className="p-2 font-bold bg-zinc-200 dark:bg-zinc-800">₹</span>
                          <input type="number" value={offlineAmount} onChange={e => setOfflineAmount(e.target.value)} className="w-full p-2 bg-transparent focus:outline-none font-bold" />
                       </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={handleAddOfflinePayment} disabled={offlineSubmitting || !offlineMonth || !offlineAmount} className="flex-1 bg-green-500 text-black font-bold uppercase text-xs py-2 disabled:opacity-50">Save</button>
                        <button onClick={() => setAddingOfflinePayment(false)} className="flex-1 bg-zinc-300 dark:bg-zinc-700 font-bold uppercase text-xs py-2 text-black dark:text-white">Cancel</button>
                     </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2">
                  {studentPayments.length === 0 ? (
                     <div className="text-center text-zinc-500 font-bold py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700">No payment history.</div>
                  ) : (
                     <div className="space-y-4">
                        {studentPayments.map((p, idx) => (
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
                                    <span className="font-mono font-bold hover:underline cursor-pointer" onClick={() => {setEditingAmountId(p.id); setEditingAmount(p.amount.toString());}}>₹{p.amount} ✎</span>
                                 )}
                              </div>
                              <div className="text-[10px] text-zinc-500 mb-2 font-bold font-mono">
                                 Submitted: {formatDateTimeSafe(p.createdAt)}
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className={`text-[10px] font-bold text-black uppercase px-2 py-0.5 ${p.status === 'pending' ? 'bg-yellow-300' : p.status === 'approved' ? 'bg-emerald-300' : 'bg-red-300'}`}>{p.status}</span>
                                 {p.status === 'pending' && (
                                    <div className="flex gap-2">
                                       <button onClick={() => updatePaymentStatus(p.id, 'approved')} className="text-[10px] bg-emerald-500 text-white font-bold uppercase px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#064e3b]"><Check className="w-3 h-3"/>Approve</button>
                                       <button onClick={() => updatePaymentStatus(p.id, 'rejected')} className="text-[10px] bg-red-500 text-white font-bold uppercase px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#450a0a]"><X className="w-3 h-3"/>Reject</button>
                                    </div>
                                 )}
                              </div>
                              {p.remarks && <div className="text-[10px] text-zinc-500 mt-2 italic border-t border-zinc-200 dark:border-zinc-800 pt-1">Reason: {p.remarks}</div>}
                              {(p as any).transactionId && <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">TXN ID: {(p as any).transactionId}</div>}
                              {(p as any).proofImage && (
                                 <button onClick={() => setViewingProofPayment(p)} className="mt-2 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold uppercase px-2 py-1 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors border border-blue-300 dark:border-blue-700 flex items-center gap-1">
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
     const bStudents = students.filter(s => selectedBatchId === 'unassigned' ? !s.batchId : s.batchId === selectedBatchId);
     
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
                   const pendingCount = payments.filter(p => p.studentId === s.id && p.status === 'pending').length;
                   return (
                     <button key={s.id} onClick={() => setSelectedStudentId(s.id)} className="w-full text-left p-4 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 flex flex-col items-start gap-1">
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
         <h3 className="font-black text-xl uppercase mb-4 text-yellow-800 dark:text-yellow-400">Needs Verification ({allPending.length})</h3>
         {allPending.length === 0 ? (
           <div className="text-zinc-600 dark:text-zinc-400 font-bold italic">You're all caught up! No pending payments to verify.</div>
         ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {allPending.map((p, idx) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)]">
                <div className="text-xs font-bold uppercase text-zinc-500 mb-1">{p.studentName || p.studentEmail}</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-black">{p.month}</span>
                  {editingAmountId === p.id ? (
                     <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-sm">
                        <input type="number" value={editingAmount} onChange={e => setEditingAmount(e.target.value)} className="w-20 p-1 bg-transparent focus:outline-none font-bold text-black dark:text-white" />
                        <button onClick={() => updatePaymentAmount(p.id)} className="bg-emerald-500 text-white px-2 py-1 flex items-center justify-center"><Check className="w-3 h-3"/></button>
                        <button onClick={() => setEditingAmountId(null)} className="bg-red-500 text-white px-2 py-1 flex items-center justify-center"><X className="w-3 h-3"/></button>
                     </div>
                  ) : (
                     <span className="font-mono font-bold text-lg hover:underline cursor-pointer" onClick={() => {setEditingAmountId(p.id); setEditingAmount(p.amount.toString());}}>₹{p.amount} ✎</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updatePaymentStatus(p.id, 'approved')} className="flex-1 text-[10px] bg-emerald-500 text-white font-black uppercase px-2 py-2 flex justify-center items-center gap-1 shadow-[2px_2px_0px_0px_#064e3b] hover:-translate-y-0.5"><Check className="w-3 h-3"/>Approve</button>
                  <button onClick={() => updatePaymentStatus(p.id, 'rejected')} className="flex-1 text-[10px] bg-red-500 text-white font-black uppercase px-2 py-2 flex justify-center items-center gap-1 shadow-[2px_2px_0px_0px_#450a0a] hover:-translate-y-0.5"><X className="w-3 h-3"/>Reject</button>
                </div>
              </div>
           ))}
         </div>
         )}
      </div>

      <h3 className="font-black uppercase mb-4 opacity-70">Students by Batch</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {batches.map(b => (
           <button key={b.id} onClick={() => setSelectedBatchId(b.id)} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] hover:-translate-y-1 transition-transform text-left">
              <h3 className="text-xl font-black uppercase text-yellow-600 dark:text-yellow-400 mb-2">{b.name}</h3>
              <p className="text-sm font-bold text-zinc-500">{students.filter(s => s.batchId === b.id).length} Students</p>
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

// STUDENT PAGES
export function StudentPayments() {
  const { user } = useAuth();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [proofImage, setProofImage] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  // Image compression utility — compress screenshot to max ~200KB Base64
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
          
          // Compress to JPEG at 60% quality
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
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB allowed.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setProofImage(compressed);
      setImagePreview(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try again.');
    }
  };
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    adminUpiId: '',
    enablePaymentSystem: true,
    paymentMethod: 'manual',
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  const monthlyFeeAmount = Number(user?.monthlyFee) || 0;
  const isFeeWaived = user?.monthlyFee === 0 || user?.monthlyFee === "0";
  
  const calculatedAmount = selectedMonths.length > 0 ? selectedMonths.length * (monthlyFeeAmount > 0 ? monthlyFeeAmount : 500) : (monthlyFeeAmount > 0 ? monthlyFeeAmount : 500);

  useEffect(() => {
     if (!user) return;
     
     // Dynamically load Razorpay standard script for safe, smooth checkout
     const rzpScript = document.createElement("script");
     rzpScript.src = "https://checkout.razorpay.com/v1/checkout.js";
     rzpScript.async = true;
     document.body.appendChild(rzpScript);
     
     const loadSettings = async () => {
       try {
         let adminUpiId = 'mondal.saikat185@okaxis';
         let enablePaymentSystem = true;
         let paymentMethod = 'manual';
         let razorpayKeyId = '';
         let razorpayKeySecret = '';

         const cached = localStorage.getItem("mc_settings_general");
         if (cached) {
           try {
             const data = JSON.parse(cached);
             adminUpiId = data.adminUpiId || adminUpiId;
             enablePaymentSystem = data.enablePaymentSystem !== false;
             paymentMethod = data.paymentMethod || 'manual';
             razorpayKeyId = data.razorpayKeyId || '';
             razorpayKeySecret = data.razorpayKeySecret || '';
           } catch (e) {}
         }

         if (api.isProduction()) {
           try {
             // @ts-ignore
             if (typeof google !== 'undefined') {
               // @ts-ignore
               const gasSettings = await new Promise<any>((res, rej) => {
                 // @ts-ignore
                 google.script.run
                   .withSuccessHandler(res)
                   .withFailureHandler(rej)
                   .apiGetSettings("general");
               });
               if (gasSettings) {
                 adminUpiId = gasSettings.adminUpiId || adminUpiId;
                 enablePaymentSystem = gasSettings.enablePaymentSystem !== false;
                 paymentMethod = gasSettings.paymentMethod || 'manual';
                 razorpayKeyId = gasSettings.razorpayKeyId || '';
                 razorpayKeySecret = gasSettings.razorpayKeySecret || '';
               }
             }
           } catch (err) {
             console.warn("GAS apiGetSettings failed", err);
           }
         }

         setSettings({
           adminUpiId,
           enablePaymentSystem,
           paymentMethod,
           razorpayKeyId,
           razorpayKeySecret
         });
       } catch (err) {
         console.error("Failed to load settings:", err);
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
         setLoading(false);
       } catch (error) {
         console.error("Payment fetch error:", error);
         setLoading(false);
       }
     };

     fetchPayments();

     return () => {
       try {
         document.body.removeChild(rzpScript);
       } catch (e) {}
     };
  }, [user?.uid]);

  const monthOptions = getMonthOptions();

  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter(x => x !== m));
    } else {
      setSelectedMonths([...selectedMonths, m]);
    }
  };

  const handleRazorpayCheckout = async () => {
    if (selectedMonths.length === 0 || !user) {
      alert("Please select at least one month.");
      return;
    }

    if (isFeeWaived) {
      alert("আপনার fee waived করা আছে। Payment submit করার প্রয়োজন নেই।");
      return;
    }

    // Reuse consecutive month validations:
    const paidMonths = payments
      .filter(p => p.status !== 'rejected')
      .flatMap(p => p.month.split(',').map(m => m.trim()));
    const paidIndices = paidMonths.map(m => monthOptions.indexOf(m)).filter(idx => idx !== -1);
    const maxPaidIndex = paidIndices.length > 0 ? Math.max(...paidIndices) : -1;
    const selectedIndices = selectedMonths.map(m => monthOptions.indexOf(m)).sort((a, b) => a - b);
    
    for (let i = 1; i < selectedIndices.length; i++) {
       if (selectedIndices[i] !== selectedIndices[i-1] + 1) {
          alert("Please select strictly consecutive months.");
          return;
       }
    }
    
    if (maxPaidIndex !== -1) {
       const alreadyPaid = selectedIndices.some(idx => paidIndices.includes(idx));
       if (alreadyPaid) {
          alert("You have already submitted a payment for one or more of the selected months.");
          return;
       }
       if (selectedIndices[0] !== maxPaidIndex + 1) {
          alert(`You must pay consecutively. Your next due month is ${monthOptions[maxPaidIndex + 1]}.`);
          return;
       }
    }

    if ((user as any).isSimulatedAdmin) {
       const isRealStudent = localStorage.getItem('simulatedStudentId');
       if (!isRealStudent) {
         alert("Please select a real student from the dropdown above to test the payment gateway checkout flow.");
         return;
       }
    }

    // Default test key ID if admin has not configured their own
    const keyId = settings.razorpayKeyId || 'rzp_test_mX3qXFv3Xv9Xv9'; 

    setSubmitting(true);
    try {
      const options = {
        key: keyId,
        amount: calculatedAmount * 100, // Amount in paise
        currency: "INR",
        name: "M-C Tuition Classes",
        description: `Tuition Fees for ${selectedMonths.join(', ')}`,
        image: user.profilePhotoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop",
        handler: async function (response: any) {
          try {
            setSubmitting(true);
            const verifyRes = await api.verifyGatewayPayment(
              response.razorpay_payment_id,
              selectedMonths.join(', '),
              calculatedAmount,
              user.uid
            );

            if (verifyRes.success) {
              alert("পেমেন্ট সফল এবং অনুমোদিত হয়েছে! (Payment Successful and Instantly Approved!)");
              setSelectedMonths([]);
              setPaymentSuccess(true);
              setTimeout(() => setPaymentSuccess(false), 3000);
              
              // Force local cache invalidation & reload to fetch updated user profile (pendingMonths etc.)
              window.location.reload(); 
            } else {
              alert("Verification failed: " + (verifyRes.error || "Unknown Error"));
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Payment verification failed, please contact administrator with Payment ID: " + response.razorpay_payment_id);
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: user.fullName || user.displayName || "",
          email: user.email || "",
          contact: user.phone || ""
        },
        theme: {
          color: "#eab308" // Yellow Neo-Brutalist Theme
        }
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay Checkout failed to open:", err);
      alert("Failed to initialize Razorpay payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonths.length === 0 || !user) {
      alert("Please select at least one month.");
      return;
    }
    
    // Validate Sequential Month Selection
    const paidMonths = payments
      .filter(p => p.status !== 'rejected')
      .flatMap(p => p.month.split(',').map(m => m.trim()));
    const paidIndices = paidMonths.map(m => monthOptions.indexOf(m)).filter(idx => idx !== -1);
    const maxPaidIndex = paidIndices.length > 0 ? Math.max(...paidIndices) : -1;
    
    const selectedIndices = selectedMonths.map(m => monthOptions.indexOf(m)).sort((a, b) => a - b);
    
    // Check if the selected months themselves are consecutive
    for (let i = 1; i < selectedIndices.length; i++) {
       if (selectedIndices[i] !== selectedIndices[i-1] + 1) {
          alert("Please select strictly consecutive months.");
          return;
       }
    }
    
    // Check if they start exactly after the last paid month
    if (maxPaidIndex !== -1) {
       // Check if they are trying to pay an already paid month
       const alreadyPaid = selectedIndices.some(idx => paidIndices.includes(idx));
       if (alreadyPaid) {
          alert("You have already submitted a payment for one or more of the selected months.");
          return;
       }
       
       if (selectedIndices[0] !== maxPaidIndex + 1) {
          alert(`You must pay consecutively. Your next due month is ${monthOptions[maxPaidIndex + 1]}.`);
          return;
       }
    }
    
    if (isFeeWaived) {
      alert("আপনার fee waived করা আছে। Payment submit করার প্রয়োজন নেই।");
      return;
    }
    
    if ((user as any).isSimulatedAdmin) {
       const isRealStudent = localStorage.getItem('simulatedStudentId');
       if (!isRealStudent) {
         alert("Please select a real student from the dropdown above to test the payment submission flow. Submitting as the 'Default Admin UID' is blocked.");
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
        paymentMode: settings.paymentMethod || 'manual',
      };
      
      // Attach proof data if using proof_upload mode
      if (settings.paymentMethod === 'proof_upload') {
        if (!proofImage) {
          alert('Please upload a payment screenshot as proof.');
          setSubmitting(false);
          return;
        }
        if (!transactionId.trim()) {
          alert('Please enter the Transaction ID / UTR Number.');
          setSubmitting(false);
          return;
        }
        paymentData.proofImage = proofImage;
        paymentData.transactionId = transactionId.trim();
      }
      
      await api.addPayment(paymentData);
      setSelectedMonths([]);
      setProofImage('');
      setImagePreview('');
      setTransactionId('');
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 3000);

      // Refresh payments history list manually
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
    } catch (error) {
      console.error("handleSubmitPayment error:", error);
      alert("Failed to submit payment details.");
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
          <h3 className="font-black uppercase mb-4 text-xl">Submit Payment Details</h3>
          
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
          {settings.paymentMethod === 'gateway' ? (
             <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-950/20 border-2 border-yellow-600 flex flex-col justify-center items-center gap-3 text-center mt-2 w-full text-zinc-900 dark:text-yellow-100">
                <h4 className="font-black text-yellow-800 dark:text-yellow-400 uppercase text-sm tracking-wide">Automated Gateway Checkout</h4>
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300">Fast & Secure Payments via Cards, UPI (GPay, PhonePe, Paytm), Netbanking, and Wallets. Instantly unlocks features!</p>
                <div className="mt-2 text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-1 uppercase tracking-widest animate-pulse">
                   ⚡ Instant Auto-Approval
                </div>
             </div>
          ) : settings.paymentMethod === 'proof_upload' ? (
              <div className="mb-6 p-4 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-900 dark:border-zinc-100 text-center flex flex-col items-center">
                 <div className="text-xs font-bold uppercase mb-3 dark:text-yellow-100">📸 Upload Payment Screenshot</div>
                 
                 {settings.adminUpiId && (
                    <div className="mb-3 w-full">
                       <div className="text-[10px] text-zinc-500 mb-1">Pay to this UPI ID first:</div>
                       <div className="text-sm font-black text-zinc-900 dark:text-white p-2 border-2 border-zinc-300 dark:border-zinc-600 select-all bg-zinc-50 dark:bg-zinc-800">{settings.adminUpiId}</div>
                       <button 
                         type="button"
                         onClick={() => {
                            navigator.clipboard.writeText(settings.adminUpiId);
                            alert('UPI ID copied!');
                         }}
                         className="mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                       >
                         📋 Copy UPI ID
                       </button>
                    </div>
                 )}

                 <div className="w-full border-t-2 border-zinc-200 dark:border-zinc-700 pt-3 mt-1">
                    {imagePreview ? (
                       <div className="relative mb-3">
                          <img src={imagePreview} alt="Payment proof" className="max-h-48 mx-auto border-2 border-emerald-500 shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]" />
                          <button
                            type="button"
                            onClick={() => { setProofImage(''); setImagePreview(''); }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 text-xs font-bold hover:bg-red-600"
                          >
                            ✕ Remove
                          </button>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">✅ Screenshot attached</div>
                       </div>
                    ) : (
                       <label className="cursor-pointer block">
                          <div className="border-2 border-dashed border-zinc-400 dark:border-zinc-600 p-6 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                             <div className="text-3xl mb-2">📷</div>
                             <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Tap to upload payment screenshot</div>
                             <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">JPG, PNG — Max 10MB</div>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                       </label>
                    )}
                 </div>

                 <div className="w-full mt-3">
                    <label className="block text-[10px] font-bold uppercase text-left mb-1 dark:text-yellow-100">Transaction ID / UTR Number</label>
                    <input
                       type="text"
                       value={transactionId}
                       onChange={e => setTransactionId(e.target.value)}
                       placeholder="e.g. 412345678901 or UPI Ref No."
                       className="w-full border-2 border-zinc-900 dark:border-zinc-100 bg-transparent p-2 text-sm focus:outline-none font-mono dark:text-white"
                    />
                 </div>
              </div>
           ) : (
             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-900 dark:border-zinc-100 text-center flex flex-col items-center">
                <div className="text-xs font-bold uppercase mb-2 dark:text-yellow-100">Scan to Pay via UPI</div>
                {settings.adminUpiId ? (
                   (() => {
                      const upiId = (settings.adminUpiId || '').trim();
                      const am = Number(calculatedAmount || 500).toFixed(2);
                      const tn = encodeURIComponent(`Tuition Fee`);
                      const pn = encodeURIComponent('Tutor');
                      const genericUpi = `upi://pay?pa=${upiId}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
                      return (
                         <>
                            <div className="bg-white p-2 border-2 border-zinc-900 inline-block mb-2">
                               <QRCodeSVG value={genericUpi} size={120} />
                             </div>
                             <div className="text-[10px] font-bold opacity-70 dark:text-yellow-100 mb-2">{settings.adminUpiId}</div>
                             
                             <p className="text-xs font-bold text-zinc-500 mt-2 mb-2">OR PAY USING APP</p>
                             <div className="flex flex-wrap justify-center gap-2 mb-2 w-full">
                                <a href={genericUpi} className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs hover:-translate-y-0.5 transition-transform">PhonePe / App</a>
                                <a href={`tez://upi/pay?pa=${upiId}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`} className="px-3 py-1.5 bg-white text-zinc-900 border-2 border-zinc-200 font-bold text-xs hover:-translate-y-0.5 transition-transform flex items-center gap-1"><span className="text-blue-500 font-black">G</span>Pay</a>
                                <a href={`paytmmp://pay?pa=${upiId}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`} className="px-3 py-1.5 bg-[#00b9f1] text-white font-bold text-xs hover:-translate-y-0.5 transition-transform">Paytm</a>
                                <a href={genericUpi} className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs hover:-translate-y-0.5 transition-transform">Any UPI</a>
                             </div>
                             
                             {!settings.adminUpiId.includes('@') && (
                                <div className="mt-2 text-red-600 dark:text-red-400 text-[10px] bg-red-100 dark:bg-red-900/30 p-2 font-bold text-justify">
                                   Warning: The configured UPI ID "{settings.adminUpiId}" appears to be a regular phone number. It MUST include an "@" suffix (e.g. @ybl, @okaxis) for direct payment links to work. If apps crash, this is why!
                                </div>
                             )}
                             
                             <div className="mt-4 border-t-2 border-zinc-200 dark:border-zinc-800 pt-4 w-full">
                                <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">UPI links not working or failing?</p>
                                <p className="text-[10px] mt-1 text-zinc-500">You can copy the UPI ID below and paste it directly into your UPI app (like GPay, PhonePe, or Paytm):</p>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                   <div className="text-sm font-black text-zinc-900 dark:text-white p-2 border-2 border-zinc-300 select-all">{upiId}</div>
                                   <button 
                                     onClick={(e) => {
                                        e.preventDefault();
                                        navigator.clipboard.writeText(upiId);
                                        alert('UPI ID copied to clipboard!');
                                     }}
                                     className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold text-xs uppercase"
                                   >
                                     Copy ID
                                   </button>
                                </div>
                             </div>
                         </>
                      );
                   })()
                ) : (
                   <div className="text-red-500 font-bold text-sm bg-red-100 p-3 w-full border border-red-500">
                      ⚠️ Setup Required: Admin UPI ID is not configured.
                   </div>
                )}
             </div>
          )}

          <p className="text-sm font-medium mb-6 dark:text-yellow-100 text-center px-2">After completing the payment via UPI, explicitly select your paid month(s) and submit details to notify the administrator.</p>
          
          {paymentSuccess && (
            <div className="mb-4 bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-600 p-4 text-emerald-800 dark:text-emerald-400 font-bold uppercase text-xs flex items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(5,150,105,1)]">
              ✅ Payment request submitted! Admin will verify shortly.
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="flex flex-col gap-4">
             <div className="bg-white dark:bg-zinc-900 p-4 border-2 border-zinc-900 dark:border-zinc-100 dark:text-white">
                <label className="block text-xs font-bold uppercase mb-2">Select Month(s)<span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-black tracking-widest">{selectedMonths.length} SELECTED</span></label>
                <div className="h-44 overflow-y-auto border-2 border-zinc-200 dark:border-zinc-700 p-1 space-y-1 bg-zinc-50 dark:bg-zinc-950">
                  {monthOptions.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`w-full text-left px-3 py-2 text-sm font-bold transition-colors ${
                        selectedMonths.includes(m) 
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {m}
                      {selectedMonths.includes(m) && <span className="float-right text-xs">✓</span>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-bold italic">Tip: Click to toggle selections for multiple adjacent months.</p>
             </div>
            <div className="bg-white dark:bg-zinc-900 p-4 border-2 border-zinc-900 dark:border-zinc-100 dark:text-white">
               <label className="block text-xs font-bold uppercase mb-1">Total Amount Paid (₹)</label>
               <div className="w-full border-b-2 border-zinc-200 dark:border-zinc-700 p-2 bg-transparent text-2xl font-black text-center">
                 ₹{calculatedAmount}
               </div>
            </div>
            
            {settings.paymentMethod === 'gateway' ? (
              <button 
                type="button" 
                onClick={handleRazorpayCheckout}
                disabled={submitting || selectedMonths.length === 0} 
                className="mt-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-4 hover:-translate-y-0.5 transition-transform border-2 border-transparent disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {submitting ? 'Initializing Checkout...' : `Pay ₹${calculatedAmount} via Razorpay`}
              </button>
            ) : settings.paymentMethod === 'proof_upload' ? (
               <button type="submit" disabled={submitting || selectedMonths.length === 0 || !proofImage || !transactionId.trim()} className="mt-2 bg-emerald-600 text-white font-bold uppercase text-xs px-4 py-4 hover:-translate-y-0.5 transition-transform border-2 border-emerald-800 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                 {submitting ? 'Uploading Proof...' : `📸 Submit Proof for ₹${calculatedAmount}`}
               </button>
             ) : (
               <button type="submit" disabled={submitting || selectedMonths.length === 0} className="mt-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-4 hover:-translate-y-0.5 transition-transform border-2 border-transparent disabled:opacity-50 disabled:hover:translate-y-0">
                 {submitting ? 'Submitting...' : 'Submit to Admin'}
               </button>
             )}
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
              {payments.map((payment, idx) => (
                <div key={payment.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border-2 border-zinc-200 dark:border-zinc-800 gap-4">
                  <div>
                    <h4 className="font-black text-lg uppercase text-zinc-900 dark:text-zinc-100">Fee for {payment.month}</h4>
                    <div className="text-zinc-600 dark:text-zinc-400 font-bold text-xs mt-1">
                      Received on: {formatDateTimeSafe(payment.createdAt)}
                    </div>
                    <div className="text-zinc-500 font-bold font-mono mt-1 text-sm">Amount: ₹{payment.amount}</div>
                    {(payment as any).transactionId && <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">TXN ID: {(payment as any).transactionId}</div>}
                    {(payment as any).paymentMode === 'proof_upload' && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">📸 Proof Uploaded</div>}
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
