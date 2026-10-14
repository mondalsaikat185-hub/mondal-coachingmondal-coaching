import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { api } from '../lib/api';
import { AdminHero } from '../components/admin/AdminHero';
import {
  Users,
  BookOpen,
  FileText,
  CreditCard,
  Layers,
} from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const [absentFlags, setAbsentFlags] = useState<{ id: string; name: string; phone: string; batchId: string; batchName: string; missedCount: number }[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [selectedAbsentee, setSelectedAbsentee] = useState<{ id: string; name: string; phone: string; batchId: string; batchName: string } | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    const computeFlags = async () => {
      try {
        const [users, batches] = await Promise.all([
          api.getUsers(),
          api.getBatches(),
        ]);

        const batchMap: Record<string, string> = {};
        batches.forEach((b: any) => { batchMap[b.id] = b.name; });

        const students = users.filter((u: any) => u.role !== 'admin' && u.status === 'active');
        const flags: any[] = [];

        const batchIdsSet = new Set<string>();
        students.forEach((s: any) => {
          if (s.batchId) {
            String(s.batchId).split(',').forEach((id: string) => batchIdsSet.add(id.trim()));
          }
        });
        const batchIds = Array.from(batchIdsSet).filter(Boolean);

        const { getAllAttendanceForBatch } = await import('../lib/exam-session-utils');
        
        // Fetch unique attendance dates in parallel for each batch
        const batchAttendanceResults = await Promise.all(
          batchIds.map(async (batchId) => {
            const att = await getAllAttendanceForBatch(batchId, 3);
            return { batchId, att };
          })
        );

        const attendanceMap: Record<string, any[]> = {};
        batchAttendanceResults.forEach((r) => {
          attendanceMap[r.batchId] = r.att;
        });

        batchIds.forEach((batchId: any) => {
          const sBatchAtt = attendanceMap[batchId] || [];
          
          // Must have at least 3 unique exam dates in this batch to ever trigger a 3 consecutive absence alert!
          if (sBatchAtt.length < 3) return;

          const batchStudents = students.filter((s: any) => s.batchId && String(s.batchId).split(',').map((id: string) => id.trim()).includes(batchId));

          batchStudents.forEach((student: any) => {
            let recentAbsences = 0;
            let validExamsChecked = 0;
            const studentExcusedDates = student.excusedDates
              ? String(student.excusedDates).split(',').filter(Boolean)
              : [];

            for (let i = 0; i < sBatchAtt.length && validExamsChecked < 3; i++) {
               const attDateMs = new Date(sBatchAtt[i].date).getTime();
               const msJoined = student.createdAt ? new Date(student.createdAt).getTime() : 0;
               if (msJoined && attDateMs < msJoined - 86400000) {
                  continue; // skip exams before they joined / re-joined
               }
               
               const isExcused = studentExcusedDates.includes(sBatchAtt[i].date);
               
               validExamsChecked++;
               if (!sBatchAtt[i].presentStudentIds.includes(student.id) && !isExcused) {
                  recentAbsences++;
               } else if (!isExcused) {
                  break; // they were present recently! Breaks consecutive chain.
               }
            }

            if (recentAbsences >= 3) {
              flags.push({
                id: student.id,
                name: student.name || student.phone,
                phone: student.phone || '',
                batchId: batchId,
                batchName: batchMap[batchId] || batchId,
                missedCount: 3
              });
            }
          });
        });

        setAbsentFlags(flags);
      } catch (err) {
        console.error("Attendance flag error:", err);
      }
    };
    computeFlags();
  }, [refreshTrigger]);
  const handleContinueStudent = async (studentId: string, batchId: string) => {
    setSubmittingAction(true);
    try {
      const { getAllAttendanceForBatch } = await import('../lib/exam-session-utils');
      const [users, att] = await Promise.all([
        api.getUsers(),
        getAllAttendanceForBatch(batchId, 3)
      ]);
      const student = users.find((u: any) => u.id === studentId);
      if (!student) return;

      if (att.length === 0) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "কোনো পরীক্ষা পাওয়া যায়নি।" }));
        setSelectedAbsentee(null);
        return;
      }

      const datesToExcuse = att.map(a => a.date);
      const existingExcused = student.excusedDates ? String(student.excusedDates).split(',').map(d => d.trim()).filter(Boolean) : [];
      const newExcused = Array.from(new Set([...existingExcused, ...datesToExcuse]));

      await api.saveUser({
        id: student.id,
        excusedDates: newExcused.join(','),
        exemptReason: "চলমান রাখা হয়েছে"
      } as any);
      
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "ছাত্রের অনুপস্থিতি মওকুফ করা হয়েছে এবং কাউন্ট রিসেট হয়েছে!" }));
      setSelectedAbsentee(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Excuse student error:", err);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "ত্রুটি: অনুপস্থিতি মওকুফ করা যায়নি।" }));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCompleteAttendance = async (studentId: string, batchId: string) => {
    setSubmittingAction(true);
    try {
      const { getAllAttendanceForBatch } = await import('../lib/exam-session-utils');
      const [users, att] = await Promise.all([
        api.getUsers(),
        getAllAttendanceForBatch(batchId, 3)
      ]);
      const student = users.find((u: any) => u.id === studentId);
      if (!student) return;

      if (att.length === 0) {
        window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "কোনো পরীক্ষা পাওয়া যায়নি যার উপস্থিতি পূর্ণ করা যাবে।" }));
        setSelectedAbsentee(null);
        return;
      }

      const datesToExcuse = att.map(a => a.date);
      const existingExcused = student.excusedDates ? String(student.excusedDates).split(',').map(d => d.trim()).filter(Boolean) : [];
      const newExcused = Array.from(new Set([...existingExcused, ...datesToExcuse]));

      await api.saveUser({
        id: student.id,
        excusedDates: newExcused.join(','),
        exemptReason: "উপস্থিতি ম্যানুয়ালি পূর্ণ করা হয়েছে"
      } as any);

      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "ছাত্রের অনুপস্থিত পরীক্ষাগুলোর উপস্থিতি সফলভাবে পূর্ণ করা হয়েছে!" }));
      setSelectedAbsentee(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Complete attendance error:", err);
      window.dispatchEvent(new CustomEvent("show-custom-alert", { detail: "ত্রুটি: উপস্থিতি সম্পন্ন করা যায়নি।" }));
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full">
      <AdminHero user={user} />

      {absentFlags.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/30 border-4 border-red-500 p-4">
          <h3 className="font-black text-red-700 dark:text-red-400 uppercase mb-3 flex items-center gap-2">
            <span>⚠️ অনুপস্থিত সতর্কতা (Flagged Absentees)</span>
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 font-black">{absentFlags.length}</span>
          </h3>
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
            নিচের ছাত্রছাত্রীরা পরপর ৩টি exam-এ অনুপস্থিত ছিল:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {absentFlags.map((f, i) => (
              <div key={i} className="bg-red-100 dark:bg-red-900/40 border-2 border-red-400 p-3 text-xs font-black text-red-800 dark:text-red-200 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-black text-sm">{f.name}</span>
                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase leading-none">পরপর ৩টি মিস</span>
                  </div>
                  <div className="text-red-600 dark:text-red-400 font-bold mt-1">মোবাইল: {f.phone}</div>
                  <div className="text-zinc-500 text-[10px] mt-0.5">ব্যাচ: {f.batchName}</div>
                </div>
                <button
                  onClick={() => setSelectedAbsentee(f)}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-1 px-2 mt-2 uppercase tracking-wide border-2 border-zinc-900 dark:border-zinc-100 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(240,240,240,1)] active:translate-y-0.5 active:shadow-none transition-all text-center"
                >
                  ⚡ ব্যবস্থা নিন (Absence Action)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}



      <div className="mb-6 bg-yellow-100 dark:bg-yellow-900/30 border-4 border-yellow-500 p-4">
        <h3 className="font-black text-yellow-800 dark:text-yellow-500 uppercase mb-2">
          🚀 TEST SETUP GUIDE
        </h3>
        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          New to the portal and testing features? You need virtual students!
        </p>
        <ul className="list-disc pl-5 text-sm font-bold text-yellow-800 dark:text-yellow-200 space-y-1 mb-4">
          <li>
            Go to <strong>Students Management</strong> to create virtual
            students and assign them to a Batch.
          </li>
          <li>
            Go to <strong>Payments Management</strong> &rarr; Click their Batch
            to configure their monthly fee.
          </li>
          <li>
            Use the{" "}
            <strong className="text-black dark:text-white bg-yellow-300 dark:bg-yellow-700 px-1">
              SIMULATION MODE
            </strong>{" "}
            toolbar (top) to log in as them and test fee payments!
          </li>
        </ul>
        <Link
          to="/admin/students"
          className="inline-block bg-yellow-500 text-black font-black uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform border-2 border-yellow-800 shadow-[2px_2px_0px_0px_rgba(133,77,14,1)]"
        >
          Go to Students Management &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min flex-grow">
        {/* Batches Card */}
        <div className="md:col-span-4 bg-indigo-50 dark:bg-indigo-950 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl text-indigo-900 dark:text-indigo-100 uppercase mb-1">
                  Batches
                </h3>
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                  Manage Classes
                </p>
              </div>
              <div className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 p-2 border-2 border-indigo-800 dark:border-indigo-200">
                <Layers className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-4">
              Create new batches and delete existing ones.
            </div>
          </div>
          <Link
            to="/admin/batches"
            className="inline-block bg-indigo-500 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)]"
          >
            Manage Batches
          </Link>
        </div>

        {/* Students Card */}
        <div className="md:col-span-4 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl uppercase mb-1">Students</h3>
                <p className="text-xs font-bold text-zinc-500 uppercase">
                  Approval & management
                </p>
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 p-2 border-2 border-emerald-700 dark:border-emerald-300">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
              View pending approvals, assign students to batches, and manage
              profiles.
            </div>
          </div>
          <Link
            to="/admin/students"
            className="inline-block bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] dark:shadow-[4px_4px_0px_0px_rgba(82,82,91,1)] border-2 border-transparent"
          >
            Manage Students
          </Link>
        </div>

        {/* Notes Library Card */}
        <div className="md:col-span-4 bg-orange-50 dark:bg-orange-950 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl text-orange-900 dark:text-orange-100 uppercase mb-1">
                  Central Library
                </h3>
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase">
                  PDF Notes & Content
                </p>
              </div>
              <div className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 p-2 border-2 border-orange-800 dark:border-orange-200">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-4">
              Upload notes, generate tracking IDs, and toggle batch visibility.
            </div>
          </div>
          <Link
            to="/admin/library"
            className="inline-block bg-orange-500 text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)]"
          >
            Open Library
          </Link>
        </div>

        {/* Exams Card */}
        <div className="md:col-span-6 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(161,161,170,1)] dark:shadow-[6px_6px_0px_0px_rgba(82,82,91,1)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl uppercase mb-1">
                  Exam Engine
                </h3>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-600 uppercase">
                  Tests & Results
                </p>
              </div>
              <div className="bg-zinc-800 dark:bg-zinc-200 p-2 border-2 border-zinc-700 dark:border-zinc-300">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm font-medium text-zinc-300 dark:text-zinc-700 mb-4">
              View student results for the exams.
            </div>
          </div>
          <Link
            to="/admin/exams"
            className="inline-block bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] border-2 border-zinc-900 dark:border-zinc-100"
          >
            Open Exams
          </Link>
        </div>

        {/* Payments Card */}
        <div className="md:col-span-6 bg-yellow-300 dark:bg-yellow-600 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] text-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl uppercase mb-1">Payments</h3>
                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-950 uppercase">
                  Fees & Tracking
                </p>
              </div>
              <div className="bg-yellow-200 dark:bg-yellow-500 p-2 border-2 border-zinc-900 dark:border-zinc-100">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-4">
              Track student payments, approve or reject submissions, view
              history.
            </div>
          </div>
          <Link
            to="/admin/payments"
            className="inline-block bg-white dark:bg-zinc-900 dark:text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]"
          >
            Open Payments
          </Link>
        </div>

        {/* Simulator Card */}
        <div className="md:col-span-12 bg-sky-200 dark:bg-sky-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="font-black text-xl uppercase mb-1 text-sky-900 dark:text-sky-100">
                Student Simulator
              </h3>
              <p className="text-sm font-medium text-sky-800 dark:text-sky-200 max-w-xl">
                Experience the application exactly as a student would. You can
                select a batch, navigate through exams, notes, and the dashboard
                to verify everything works flawlessly before sharing it with
                students.
              </p>
            </div>
            <Link
              to="/student"
              className="inline-block bg-sky-600 text-white font-bold uppercase text-xs px-6 py-3 hover:-translate-y-0.5 transition-transform border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] whitespace-nowrap"
            >
              Launch Simulator
            </Link>
          </div>
        </div>

        {/* Settings Card */}
        <div className="md:col-span-12 lg:col-span-12 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col justify-between">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="font-black text-xl text-zinc-900 dark:text-zinc-100 uppercase mb-1">
                Platform Settings
              </h3>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 max-w-xl">
                Configure UPI Payment details, toggle the payment system, and
                manage other global platform features.
              </p>
            </div>
            <Link
              to="/admin/settings"
              className="inline-block bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-6 py-3 hover:-translate-y-0.5 transition-transform border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] whitespace-nowrap"
            >
              Open Settings
            </Link>
          </div>
        </div>
      </div>

      {selectedAbsentee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-zinc-900 dark:text-white">
            <h3 className="text-lg font-black uppercase text-zinc-950 dark:text-zinc-50 border-b-4 border-zinc-900 dark:border-zinc-100 pb-2 mb-4 flex justify-between items-center">
              <span>অনুপস্থিতি ব্যবস্থা / Absence Action</span>
              <button 
                onClick={() => setSelectedAbsentee(null)} 
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ✕
              </button>
            </h3>
            
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 leading-relaxed">
              <strong className="text-red-600 dark:text-red-400">{selectedAbsentee.name}</strong> পরপর ৩টি পরীক্ষায় অনুপস্থিত ছিল। অনুগ্রহ করে নিচের যেকোনো একটি ব্যবস্থা গ্রহণ করুন:
            </p>

            <div className="flex flex-col gap-3">
              <button
                disabled={submittingAction}
                onClick={() => handleContinueStudent(selectedAbsentee.id, selectedAbsentee.batchId)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 px-4 uppercase tracking-wide border-2 border-zinc-900 dark:border-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex flex-col items-center justify-center"
              >
                <span className="text-sm">🔄 চলমান রাখুন (Continue)</span>
                <span className="text-[10px] opacity-90 lowercase font-medium mt-0.5">অনুপস্থিতি মওকুফ করে নতুন করে হিসাব শুরু করবে</span>
              </button>

              <button
                disabled={submittingAction}
                onClick={() => handleCompleteAttendance(selectedAbsentee.id, selectedAbsentee.batchId)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3 px-4 uppercase tracking-wide border-2 border-zinc-900 dark:border-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex flex-col items-center justify-center"
              >
                <span className="text-sm">✅ উপস্থিতি পূর্ণ করুন (Fill Attendance)</span>
                <span className="text-[10px] opacity-90 lowercase font-medium mt-0.5">অনুপস্থিত পরীক্ষাগুলোতে সরাসরি উপস্থিত হিসেবে রেকর্ড করবে</span>
              </button>

              <button
                disabled={submittingAction}
                onClick={() => setSelectedAbsentee(null)}
                className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold py-2 border-2 border-zinc-900 dark:border-zinc-100 transition-all uppercase text-xs"
              >
                বাতিল করুন (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
