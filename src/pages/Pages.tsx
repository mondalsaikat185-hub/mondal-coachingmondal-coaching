import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, X, Loader2, Trash2, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { zoomPhoto } from '../components/PhotoZoom';
import { api } from '../lib/api';
import { AppUser, useAuth } from '../components/AuthProvider';
import { UnifiedQuizPlayer } from '../components/quiz/UnifiedQuizPlayer';
import { getAllAttendanceForBatch } from '../lib/exam-session-utils';
import { formatDateOnlySafe } from '../lib/utils';
import { showToast } from '../lib/toast';
import { confirmAsync } from '../lib/confirmDialog';

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

export function getMonthPickerList(): string[] {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth(); // 0 to 11

  const list: string[] = [];
  // 1. CURRENT month+year first!
  list.push(`${monthNames[curM]} ${curY}`);

  // 2. Previous months right below it (newest first, last 24 months)
  for (let offset = 1; offset <= 24; offset++) {
    const d = new Date(curY, curM - offset, 1);
    list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }

  // 3. Next 2 months at the end (advance payment)
  for (let offset = 1; offset <= 2; offset++) {
    const d = new Date(curY, curM + offset, 1);
    list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }
  return list;
}

export function validateConsecutiveRule(
  selectedMonths: string[],
  studentPayments: any[],
  studentExcusedMonths: string | string[] = ''
): { valid: boolean; missingMonth?: string } {
  const START_YEAR = 2026;
  const START_MONTH = 9; // September 2026 (1-indexed)

  const monthNamesList = ["january","february","march","april","may","june","july","august","september","october","november","december"];

  function parseYM(str: string): { y: number; m: number } | null {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) return { y: parseInt(slashMatch[3]), m: parseInt(slashMatch[1]) };
    const mMatch = s.match(/^([a-z]+)[\s-_]?(\d{4})$/);
    if (mMatch) {
      const idx = monthNamesList.indexOf(mMatch[1]);
      if (idx !== -1) return { y: parseInt(mMatch[2]), m: idx + 1 };
    }
    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) return { y: parseInt(isoMatch[1]), m: parseInt(isoMatch[2]) };
    return null;
  }

  // Covered months set: 'YYYY-M'
  const covered = new Set<string>();

  // 1. Existing payments (approved, pending, paid)
  studentPayments.forEach(p => {
    if (p.status === 'approved' || p.status === 'pending' || p.status === 'paid') {
      if (p.month) {
        String(p.month).split(/[,;\n]+/).forEach((m: string) => {
          const ym = parseYM(m.trim());
          if (ym) covered.add(`${ym.y}-${ym.m}`);
        });
      }
    }
  });

  // 2. Excused months
  const rawExcused = Array.isArray(studentExcusedMonths) ? studentExcusedMonths.join(', ') : String(studentExcusedMonths || '');
  rawExcused.split(/[,;\n]+/).forEach(m => {
    const ym = parseYM(m.trim());
    if (ym) covered.add(`${ym.y}-${ym.m}`);
  });

  // 3. Currently selected months in this checkout batch
  selectedMonths.forEach(m => {
    const ym = parseYM(m.trim());
    if (ym) covered.add(`${ym.y}-${ym.m}`);
  });

  // For every selected month >= Oct 2026, check if all intermediate months between Oct 2026 and that month are covered
  const startVal = START_YEAR * 12 + START_MONTH;
  for (const m of selectedMonths) {
    const targetYM = parseYM(m);
    if (!targetYM) continue;
    const targetVal = targetYM.y * 12 + targetYM.m;

    // Months before Oct 2026 are ignored and never block
    if (targetVal < startVal) continue;

    let curY = START_YEAR;
    let curM = START_MONTH;
    while ((curY * 12 + curM) < targetVal) {
      const key = `${curY}-${curM}`;
      if (!covered.has(key)) {
        const title = monthNamesList[curM - 1].charAt(0).toUpperCase() + monthNamesList[curM - 1].slice(1) + " " + curY;
        return { valid: false, missingMonth: title };
      }
      curM++;
      if (curM > 12) { curM = 1; curY++; }
    }
  }

  return { valid: true };
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
    .flatMap(p => p.month ? String(p.month).split(',').map((m: string) => m.trim()) : []);
    
  const paidIndices = paidMonths.map(m => monthOptions.indexOf(m)).filter(idx => idx !== -1);

  const dueMonths: string[] = [];
  const today = new Date();
  const currentMonthStr = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const currentMonthIdx = monthOptions.indexOf(currentMonthStr);
  
  // Walk BACKWARDS from the current month and collect the most recent unpaid months
  // (so the current month/year is always included and old 2025 months are not shown first).
  const startIdx = currentMonthIdx !== -1 ? currentMonthIdx : monthOptions.length - 1;
  for (let idx = startIdx; idx >= 0 && dueMonths.length < pendingMonthsCount; idx--) {
    if (!paidIndices.includes(idx)) {
      dueMonths.push(monthOptions[idx]);
    }
  }
  dueMonths.reverse(); // show oldest → current

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

// Simple global cache to prevent excessive quota reads and eliminate page buffering
let globalStudentsCache: AppUser[] | null = null;
let globalBatchesCache: Batch[] | null = null;
let globalCacheTime = 0;
let globalPaymentsListCache: Payment[] | null = null;
let globalPaymentsCacheTime = 0;
const globalStudentPaymentsCache: Record<string, { data: Payment[]; time: number }> = {};
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ADMIN PAGES
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
                    <tr key={sId} className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2">
                        {student.profilePhotoUrl ? (
                          <button type="button" onClick={() => zoomPhoto(student.profilePhotoUrl, student.name)} aria-label="View photo">
                             <img src={student.profilePhotoUrl} alt="Profile" className="w-11 h-11 rounded-xl object-cover border border-zinc-300" />
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

export interface Batch {
  id: string;
  name: string;
  schedule: string;
  createdAt?: any;
  classDay?: string;
  examStartTime?: string;
  examSlot?: { classDay: string; examStartTime: string };
}

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
                      {(p as any).studentPhoto ? <img src={(p as any).studentPhoto} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" /> : null}
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

// STUDENT PAGES
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
                           <img src={imagePreview} alt="Payment proof" className="max-h-36 mx-auto border-2 border-emerald-500 shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]" />
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
