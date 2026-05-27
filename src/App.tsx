/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";
import { useAuth, AuthContext } from "./components/AuthProvider";
import { useTheme } from "./components/ThemeProvider";
import {
  Moon,
  Sun,
  LogIn,
  Loader2,
  MoreVertical,
  LogOut,
  Edit,
  X,
  Bell,
} from "lucide-react";
import { api } from "./lib/api";
import { safeToDate } from "./lib/utils";
import {
  AdminStudents,
  AdminPayments,
  StudentPayments,
  AdminBatches,
  PageHeader,
} from "./pages/Pages";
import { AdminLibrary } from "./pages/AdminLibrary";
import { AdminResults } from "./pages/AdminResults";
import { AdminSettings } from "./pages/AdminSettings";
import { ProfileSetup } from "./pages/ProfileSetup";
import { StudentLibrary } from "./pages/StudentLibrary";
function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" />;

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" />;
  }

  if (user.role === "student" && user.status === "rejected" && !user.isSimulatedAdmin) {
    if (!window.location.hash.includes("/setup-profile")) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-600 p-8 max-w-md text-center shadow-[8px_8px_0px_0px_rgba(185,28,28,1)]">
            <h2 className="font-black text-red-600 dark:text-red-400 text-xl uppercase mb-2">
              Account Rejected
            </h2>
            <p className="font-bold text-zinc-700 dark:text-zinc-300 mb-6">
              Your account request has been rejected by the administrator. You
              may update your details and submit a new request if you believe
              this was a mistake.
            </p>
            <Link
              to="/setup-profile"
              className="inline-block bg-black dark:bg-white text-white dark:text-black font-bold uppercase px-6 py-3 hover:-translate-y-1 transition-transform border-2 border-transparent"
            >
              Re-apply
            </Link>
          </div>
        </div>
      );
    }
  }

  if (user.role === "student" && !user.isProfileComplete && !user.isSimulatedAdmin) {
    if (!window.location.hash.includes("/setup-profile")) {
      return <Navigate to="/setup-profile" />;
    }
  }

  // Block access to student materials if pending
  if (
    user.role === "student" &&
    user.status === "pending" &&
    !user.isSimulatedAdmin &&
    !window.location.hash.includes("/student") &&
    !window.location.hash.includes("/setup-profile")
  ) {
    return <Navigate to="/student" />;
  }

  return <>{children}</>;
}

// ─── Forgot Passcode Modal (3-step flow) ────────────────────────────────────
function ForgotPasscodeModal({ onClose }: { onClose: () => void }) {
  // Step 1 = phone entry, Step 2 = OTP + new passcode, Step 3 = success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    if (!phone.trim()) { setErrMsg("ফোন নম্বর দিন।"); return; }
    setLoading(true);
    try {
      const res = await api.sendOTP(phone.trim());
      if (!res.success) { setErrMsg(res.error || "OTP পাঠানো যায়নি।"); return; }
      setMaskedEmail(res.maskedEmail || "");
      setStep(2);
    } catch (err: any) {
      setErrMsg(err.message || "একটি সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    if (!otp.trim()) { setErrMsg("OTP দিন।"); return; }
    if (newPasscode.trim().length < 4) { setErrMsg("নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।"); return; }
    if (newPasscode.trim() !== confirmPasscode.trim()) { setErrMsg("দুটি passcode মিলছে না।"); return; }
    setLoading(true);
    try {
      const res = await api.verifyOTPAndReset(phone.trim(), otp.trim(), newPasscode.trim());
      if (!res.success) { setErrMsg(res.error || "OTP যাচাই ব্যর্থ।"); return; }
      setStep(3);
    } catch (err: any) {
      setErrMsg(err.message || "একটি সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)] w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:text-red-500 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {step === 1 && (
          <>
            <h3 className="text-2xl font-black uppercase mb-2 text-zinc-900 dark:text-white">Passcode ভুলে গেছেন?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold mb-6">আপনার registered ফোন নম্বর দিন। আপনার email-এ একটি OTP পাঠানো হবে।</p>
            {errMsg && <p className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 text-red-700 dark:text-red-400 text-sm font-bold">{errMsg}</p>}
            <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">ফোন নম্বর</label>
                <input
                  type="tel" required autoFocus
                  placeholder="e.g. 9432490498"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border-2 border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-base focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <button type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 bg-blue-500 text-white font-black py-3 px-4 rounded-xl border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all uppercase text-sm disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "OTP পাঠান →"}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-2xl font-black uppercase mb-2 text-zinc-900 dark:text-white">OTP যাচাই করুন</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold mb-1">
              <span className="text-emerald-600 dark:text-emerald-400">{maskedEmail}</span> email-এ ৬-ডিজিটের OTP পাঠানো হয়েছে।
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold mb-6">OTP ১০ মিনিটের জন্য বৈধ। Spam folder চেক করুন।</p>
            {errMsg && <p className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 text-red-700 dark:text-red-400 text-sm font-bold">{errMsg}</p>}
            <form onSubmit={handleVerifyAndReset} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">OTP কোড</label>
                <input
                  type="text" required autoFocus maxLength={6}
                  placeholder="123456"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full border-2 border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xl tracking-widest text-center focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">নতুন Passcode</label>
                <input
                  type="password" required minLength={4}
                  placeholder="নতুন passcode লিখুন"
                  value={newPasscode} onChange={e => setNewPasscode(e.target.value)}
                  className="w-full border-2 border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-base focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">Passcode নিশ্চিত করুন</label>
                <input
                  type="password" required minLength={4}
                  placeholder="আবার লিখুন"
                  value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value)}
                  className={`w-full border-2 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-base focus:outline-none transition-colors ${confirmPasscode && confirmPasscode !== newPasscode ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100'}`}
                />
                {confirmPasscode && confirmPasscode !== newPasscode && (
                  <p className="text-red-500 text-xs font-bold mt-1">Passcode দুটি মিলছে না।</p>
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setStep(1); setErrMsg(""); }}
                  className="flex-1 py-3 border-2 border-zinc-300 dark:border-zinc-700 font-bold text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  ← ফিরে যান
                </button>
                <button type="submit" disabled={loading || (!!confirmPasscode && confirmPasscode !== newPasscode)}
                  className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 text-white font-black py-3 px-4 rounded-xl border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all uppercase text-sm disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Passcode পরিবর্তন করুন ✓"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-black uppercase mb-3 text-emerald-600 dark:text-emerald-400">সফল হয়েছে!</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-bold mb-6">আপনার passcode সফলভাবে পরিবর্তন করা হয়েছে। এখন নতুন passcode দিয়ে login করুন।</p>
            <button onClick={onClose}
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase px-8 py-3 border-2 border-transparent hover:-translate-y-0.5 transition-transform">
              Login-এ ফিরুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckStatusModal({ onClose, onForgotPasscode }: { onClose: () => void; onForgotPasscode?: () => void }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<{ statusType: string; approvedPhone?: string } | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setStatusResult(null);
    try {
      const res = await api.checkApplicationStatus(phone.trim());
      if (res.success) {
        setStatusResult({ statusType: res.status || "not_found", approvedPhone: phone.trim() });
      } else {
        setStatusResult({ statusType: "error" });
      }
    } catch (err: any) {
      setStatusResult({ statusType: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black uppercase mb-1 text-zinc-900 dark:text-zinc-100">🔍 স্ট্যাটাস চেক</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-4">আবেদনের অবস্থা জানতে ফোন নম্বর দিন</p>

        {statusResult ? (
          <div className="flex flex-col gap-3">
            {statusResult.statusType === "not_found" && (
              <div className="p-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-sm">
                ❌ এই ফোন নম্বরে কোনো আবেদন পাওয়া যায়নি।
                <span className="text-xs font-medium mt-1 block">নতুন আবেদন করতে ফিরে যান।</span>
              </div>
            )}
            {statusResult.statusType === "pending" && (
              <div className="p-4 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-bold text-sm">
                ⏳ আপনার আবেদন পর্যালোচনাধীন আছে।
                <span className="text-xs font-medium mt-1 block">অ্যাডমিন অনুমোদন করলে লগইন করতে পারবেন।</span>
              </div>
            )}
            {statusResult.statusType === "active" && (
              <div className="flex flex-col gap-3">
                <div className="p-4 border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold text-sm">
                  ✅ আপনার আবেদন অনুমোদিত হয়েছে!
                </div>
                <div className="p-4 border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex flex-col gap-2 text-sm">
                  <p className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400 mb-1">লগইন তথ্য</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-600 dark:text-zinc-400">ফোন নম্বর (ID)</span>
                    <span className="font-black text-zinc-900 dark:text-zinc-100 font-mono">{statusResult.approvedPhone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-600 dark:text-zinc-400">ডিফল্ট পাসকোড</span>
                    <span className="font-black text-zinc-900 dark:text-zinc-100 font-mono">আপনার ফোন নম্বর</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                    লগইন করার পর প্রোফাইল মেনু (⋮) থেকে পাসকোড পরিবর্তন করুন।
                  </p>
                </div>
                {onForgotPasscode && (
                  <button onClick={() => { onClose(); onForgotPasscode(); }}
                    className="w-full p-3 bg-blue-500 text-white font-black uppercase text-xs border-2 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(24,24,27,1)] hover:-translate-y-0.5 transition-transform">
                    পাসকোড ভুলে গেছেন? OTP দিয়ে Reset করুন →
                  </button>
                )}
              </div>
            )}
            {statusResult.statusType === "rejected" && (
              <div className="p-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-sm">
                ❌ আপনার আবেদন প্রত্যাখ্যান করা হয়েছে।
                <span className="text-xs font-medium mt-1 block">বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।</span>
              </div>
            )}
            {(statusResult.statusType === "error" || !["not_found","pending","active","rejected"].includes(statusResult.statusType)) && (
              <div className="p-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-sm">
                ❌ স্ট্যাটাস চেক করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।
              </div>
            )}
            <button onClick={onClose} className="w-full p-3 font-bold border-2 border-zinc-900 dark:border-zinc-100 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white text-sm">
              বন্ধ করুন
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheck} className="flex flex-col gap-3">
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-1">আপনার রেজিস্টার করা ফোন নাম্বার দিন:</p>
            <input type="tel" placeholder="ফোন নম্বর *" required value={phone} onChange={e => setPhone(e.target.value)}
              className="p-3 border-2 border-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold tracking-widest text-center text-lg" />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={onClose} className="flex-1 p-3 font-bold border-2 border-zinc-900 dark:border-zinc-100 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm">বাতিল</button>
              <button type="submit" disabled={loading}
                className="flex-1 p-3 font-bold border-2 border-transparent bg-blue-500 text-white uppercase hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] disabled:opacity-50 flex justify-center items-center text-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "চেক করুন"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
function NewJoinerFlowModal({ onClose, onOpenRegister, onForgotPasscode }: { onClose: () => void; onOpenRegister: () => void; onForgotPasscode?: () => void }) {
  const [showStatusCheck, setShowStatusCheck] = useState(false);

  if (showStatusCheck) {
    return <CheckStatusModal onClose={onClose} onForgotPasscode={onForgotPasscode} />;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-black uppercase mb-2 text-zinc-900 dark:text-zinc-100 text-center">New Joining</h2>
        <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-6 text-center">আপনার প্রয়োজন অনুযায়ী নিচের অপশনটি বেছে নিন</p>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={onOpenRegister}
            className="w-full p-4 bg-emerald-500 border-4 border-black font-black text-white text-base shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] transition-all flex flex-col items-center justify-center gap-1"
          >
            <span>📝 প্রথমবার ফর্ম পূরণ করতে চাই</span>
            <span className="text-xs font-bold opacity-80">(Join for the first time)</span>
          </button>
          
          <button
            onClick={() => setShowStatusCheck(true)}
            className="w-full p-4 bg-blue-500 border-4 border-black font-black text-white text-base shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] transition-all flex flex-col items-center justify-center gap-1"
          >
            <span>🔍 স্ট্যাটাস চেক করুন</span>
            <span className="text-xs font-bold opacity-80">(Check submitted application status)</span>
          </button>
        </div>

        <button onClick={onClose} className="mt-8 w-full p-3 font-bold border-2 border-zinc-900 dark:border-zinc-100 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white">Cancel</button>
      </div>
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "", address: "", batchId: "", email: "", phone: "", joinDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success"|"pending"|"error">("success");
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    api.getBatches().then(setBatches).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.batchId) {
      alert("নাম, ফোন নম্বর ও ব্যাচ বাধ্যতামূলক।"); return;
    }
    setLoading(true); setMsg(""); setMsgType("success");
    try {
      const res = await api.registerUser(formData);
      if (res.success) {
        if (res.status === 'pending') {
          setMsgType("pending");
          setMsg("✅ আপনার আবেদন সফলভাবে জমা পড়েছে! অ্যাডমিন অনুমোদন করলে আপনি লগইন করতে পারবেন। ডিফল্ট পাসকোড হবে আপনার ১০-ডিজিটের ফোন নম্বর।");
        } else if (res.status === 'active') {
          setMsgType("success");
          setMsg("🎉 আপনার অ্যাকাউন্ট অনুমোদিত হয়েছে! আপনার ফোন নম্বরটি ডিফল্ট পাসকোড হিসেবে ব্যবহার করে লগইন করুন।");
        } else if (res.status === 'rejected') {
          setMsgType("error");
          setMsg("❌ আপনার আবেদন প্রত্যাখ্যান করা হয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।");
        } else {
          setMsgType("pending");
          setMsg(res.message || "আপনার তথ্য জমা নেওয়া হয়েছে। স্ট্যাটাস জানতে 'Check Status' ব্যবহার করুন।");
        }
      } else {
        setMsgType("error");
        setMsg("সমস্যা হয়েছে: " + (res.message || (res as any).error || "অজানা ত্রুটি"));
      }
    } catch (err: any) {
      setMsgType("error");
      setMsg("সংযোগ সমস্যা: " + (err.message || "অজানা ত্রুটি"));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black uppercase mb-4 text-zinc-900 dark:text-zinc-100">New Joining</h2>
        {msg ? (
          <div className="mb-4">
            <p className={`font-bold text-sm p-4 border-2 whitespace-pre-wrap ${
              msgType === 'success' ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/50 border-green-600 dark:border-green-400' :
              msgType === 'pending' ? 'text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/50 border-yellow-500 dark:border-yellow-400' :
              'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/50 border-red-500 dark:border-red-400'
            }`}>{msg}</p>
            <button onClick={onClose} className="mt-4 w-full p-3 font-bold border-2 border-zinc-900 dark:border-zinc-100 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100">বন্ধ করুন</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="text" placeholder="Name *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold" />
            <input type="tel" placeholder="Phone Number *" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold" />
            <input type="email" placeholder="Email (Optional)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold" />
            <textarea placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold" />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300">Date of Joining</label>
              <input type="date" required value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold uppercase" />
            </div>

            <select required value={formData.batchId} onChange={e => setFormData({...formData, batchId: e.target.value})} className="w-full border-2 border-zinc-900 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold">
              <option value="">Select Batch *</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} - {b.class}</option>
              ))}
            </select>
            
            <div className="flex justify-between items-center mt-2 gap-4">
              <button type="button" onClick={onClose} className="flex-1 p-3 font-bold border-2 border-zinc-900 uppercase hover:bg-zinc-100 text-zinc-900 dark:text-zinc-100">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 p-3 font-bold border-2 border-transparent bg-emerald-400 text-black uppercase hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] disabled:opacity-50">
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Login() {
  const { user, login, error, setError } = useAuth();
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showNewJoinerFlow, setShowNewJoinerFlow] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (setError) setError(null);
  }, []);

  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" />;
    return <Navigate to="/student" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !passcode.trim()) {
      alert("দয়া করে ফোন নম্বর এবং পাসকোড দুটিই পূরণ করুন।");
      return;
    }
    setLocalLoading(true);
    try {
      await login(phone.trim(), passcode.trim());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      {showForgot && <ForgotPasscodeModal onClose={() => setShowForgot(false)} />}
      {showNewJoinerFlow && <NewJoinerFlowModal onClose={() => setShowNewJoinerFlow(false)} onOpenRegister={() => { setShowNewJoinerFlow(false); setShowRegister(true); }} onForgotPasscode={() => { setShowNewJoinerFlow(false); setShowForgot(true); }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}

      <div className="w-full max-w-md p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:border-zinc-100 dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)] bg-white dark:bg-zinc-900 rounded-2xl flex flex-col">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-yellow-300 border-2 border-black flex items-center justify-center rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 transform -rotate-6">
            <LogIn className="w-6 h-6 text-zinc-900" />
          </div>
          <h1 className="text-3xl font-black uppercase italic text-center tracking-tight text-zinc-900 dark:text-white">
            Mondal Coaching
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-center text-xs font-bold uppercase tracking-wider">
            Tuition Portal Login
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm font-bold rounded-lg text-center shadow-[3px_3px_0px_0px_rgba(239,68,68,0.2)]">
            {error}
          </div>
        )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
              WhatsApp Phone Number
            </label>
            <input
              type="tel" required
              placeholder="e.g. 9432490498"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border-2 border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-base focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Passcode
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                Forgot Passcode?
              </button>
            </div>
            <input
              type="password" required
              placeholder="����"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full border-2 border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-base focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </div>

          <button
            type="submit" disabled={localLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 bg-emerald-500 dark:bg-emerald-600 text-zinc-950 dark:text-white font-black py-4 px-4 rounded-xl border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all uppercase text-sm disabled:opacity-50"
          >
            {localLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-950 dark:text-white" />
            ) : (
              <><LogIn className="w-4 h-4 text-zinc-950 dark:text-white" /> Login</>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center">
          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-2">Are you a new student?</p>
          <button
            type="button"
            onClick={() => setShowNewJoinerFlow(true)}
            className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all"
          >
            New Joining
          </button>
        </div>

        <div className="mt-8 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 pt-6 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
          <p className="mb-2 text-yellow-600 dark:text-yellow-400">⚠️ নির্দেশিকা (Instructions):</p>
          <ul className="list-disc list-inside space-y-1.5 text-left max-w-[320px] mx-auto text-[11px] font-medium leading-relaxed">
            <li>ছাত্রদের ডিফল্ট পাসকোড হলো তাদের <span className="underline decoration-yellow-500 decoration-2">১০-ডিজিটের ফোন নম্বর</span>।</li>
            <li>যদি আপনার ফোন নম্বর নিবন্ধিত না থাকে, তবে আপনার শিক্ষকের সাথে যোগাযোগ করে রেজিস্ট্রেশন সম্পন্ন করুন।</li>
            <li>অ্যাডমিন লগইন করতে ডিফল্ট ফোন ও পাসকোড ব্যবহার করুন।</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { NotificationsPanel } from "./components/NotificationsPanel";

function TopNav() {
  const { theme, setTheme } = useTheme();
  const { user, logout, updateLocalUser } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editAddress, setEditAddress] = useState("");
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  // Change Passcode states
  const [showChangePasscode, setShowChangePasscode] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const allNotifs = await api.getNotifications();
        allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        let notifs = allNotifs;
        if (user.role === "student") {
          // Filter by batchId — if batchId is 'all' or matches student's batch,
          // show it. Also show any notification targeted directly to this student.
          notifs = notifs.filter(
            (n: any) =>
              n.batchId === "all" ||
              n.batchId === (user as any).batchId ||
              n.senderId === user.uid ||
              n.targetId === user.uid,
          );
        }
        
        const limitCount = user.role === "student" ? 30 : 20;
        notifs = notifs.slice(0, limitCount);

        const unread = notifs.filter(
          (n: any) =>
            n.senderId !== user.uid && !(n.readers || []).includes(user.uid),
        ).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Notifications fetch error", err);
      }
    };

    fetchUnreadCount();
    // Poll every 5 minutes — avoids real-time listener which charges reads on every notification change
    const pollInterval = setInterval(fetchUnreadCount, 5 * 60 * 1000);
    return () => clearInterval(pollInterval);
  }, [user?.uid, user?.role, (user as any)?.batchId]);

  const handleEditProfileOpen = () => {
    setEditName(user?.fullName || user?.displayName || "");
    setEditAddress(user?.address || "");
    setShowDropdown(false);
    setShowEditProfile(true);
    // Reset change passcode form
    setShowChangePasscode(false);
    setCpCurrent(""); setCpNew(""); setCpConfirm("");
    setCpError(""); setCpSuccess(false);
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCpError("");
    if (cpNew.trim().length < 4) { setCpError("নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।"); return; }
    if (cpNew.trim() !== cpConfirm.trim()) { setCpError("নতুন passcode দুটি মিলছে না।"); return; }
    setCpLoading(true);
    try {
      const res = await api.changePasscode(user.uid, cpCurrent.trim(), cpNew.trim());
      if (!res.success) { setCpError(res.error || "Passcode পরিবর্তন ব্যর্থ।"); return; }
      // Update local session passcode
      updateLocalUser({ passcode: cpNew.trim() } as any);
      setCpSuccess(true);
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
    } catch (err: any) {
      setCpError(err.message || "একটি সমস্যা হয়েছে।");
    } finally {
      setCpLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await api.saveUser({
        id: user.uid,
        name: editName,
        phone: user.phoneNumber || '',
        address: editAddress
      });
      updateLocalUser({
        fullName: editName,
        address: editAddress
      } as any);
      setShowEditProfile(false);
      window.dispatchEvent(
        new CustomEvent("show-custom-alert", {
          detail: "Profile updated successfully!",
        }),
      );
    } catch (err) {
      console.error(err);
      window.dispatchEvent(
        new CustomEvent("show-custom-alert", {
          detail: "Failed to update profile.",
        }),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <nav className="flex justify-between items-center bg-white dark:bg-zinc-900 border-b-2 border-zinc-900 dark:border-zinc-100 p-4 sticky top-0 z-10">
      <div className="font-black italic uppercase">Tuition Portal</div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-xs font-mono hidden sm:block">
            {user.fullName || user.displayName || user.email || user.phone || "User"}{" "}
            <span className="uppercase font-bold text-orange-500 ml-2">
              [{user.role}]
            </span>
          </div>
        )}
        {user && user.role === "admin" && (
          <Link
            to="/admin"
            className="text-xs font-bold uppercase hover:underline text-emerald-600 dark:text-emerald-400"
          >
            Admin Dashboard
          </Link>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        {user && (
          <>
            <button
              onClick={() => setShowNotifications(true)}
              className="p-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] z-50 py-1">
                    <button
                      onClick={handleEditProfileOpen}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-bold text-sm uppercase"
                    >
                      <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-bold text-sm uppercase text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 dark:border-red-500 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] relative">
            <h3 className="font-black text-xl uppercase mb-4 text-red-600 border-b-2 border-red-200 dark:border-red-900 pb-2 flex items-center gap-2">
              <LogOut className="w-6 h-6" /> Confirm Logout
            </h3>
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border-2 border-zinc-900 dark:border-zinc-100 py-2 hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)]"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 bg-red-600 text-white font-black uppercase py-2 hover:-translate-y-0.5 transition-transform border-2 border-red-800 shadow-[2px_2px_0px_0px_rgba(153,27,27,1)]"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-zinc-100 p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
            <button
              onClick={() => setShowEditProfile(false)}
              className="absolute top-4 right-4 bg-red-100 text-red-600 p-2 border-2 border-red-600 hover:bg-red-200 transition-colors"
              disabled={savingProfile}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-black text-2xl uppercase mb-6 flex items-center gap-2">
              <Edit className="w-6 h-6" /> Edit Profile
            </h3>
            {/* Tab switcher */}
            <div className="flex border-b-2 border-zinc-200 dark:border-zinc-700 mb-5 -mx-1">
              <button
                onClick={() => { setShowChangePasscode(false); setCpError(""); setCpSuccess(false); }}
                className={`px-4 py-2 text-xs font-black uppercase transition-colors ${!showChangePasscode ? 'border-b-4 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => { setShowChangePasscode(true); setCpError(""); setCpSuccess(false); }}
                className={`px-4 py-2 text-xs font-black uppercase transition-colors ${showChangePasscode ? 'border-b-4 border-blue-600 text-blue-700 dark:text-blue-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                🔒 Passcode পরিবর্তন
              </button>
            </div>

            {!showChangePasscode ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Full Name</label>
                  <input required type="text" value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-3 bg-transparent focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 font-medium font-mono text-sm"
                    placeholder="Enter your full name" disabled={savingProfile} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Address Details</label>
                  <textarea required rows={3} value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-3 bg-transparent focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 font-medium font-mono text-sm resize-none"
                    placeholder="Enter your full address" disabled={savingProfile} />
                </div>
                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={savingProfile}
                    className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase py-3 px-6 hover:-translate-y-0.5 transition-transform border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] flex items-center gap-2 disabled:opacity-50">
                    {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Profile
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {cpSuccess ? (
                  <div className="text-center py-6">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg uppercase mb-2">Passcode পরিবর্তন সফল!</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold mb-4">পরের বার নতুন passcode দিয়ে login করুন।</p>
                    <button onClick={() => { setCpSuccess(false); setShowEditProfile(false); }}
                      className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase px-6 py-2 hover:-translate-y-0.5 transition-transform">
                      ঠিক আছে
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePasscode} className="space-y-4">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 border border-zinc-200 dark:border-zinc-700">
                      💡 নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।
                    </p>
                    {cpError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 text-red-700 dark:text-red-400 text-sm font-bold">{cpError}</div>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">বর্তমান Passcode</label>
                      <input type="password" required value={cpCurrent}
                        onChange={e => setCpCurrent(e.target.value)}
                        placeholder="বর্তমান passcode"
                        className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-3 bg-transparent focus:outline-none font-mono text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">নতুন Passcode</label>
                      <input type="password" required minLength={4} value={cpNew}
                        onChange={e => setCpNew(e.target.value)}
                        placeholder="নতুন passcode (৪+ অক্ষর)"
                        className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-3 bg-transparent focus:outline-none font-mono text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">নতুন Passcode নিশ্চিত করুন</label>
                      <input type="password" required minLength={4} value={cpConfirm}
                        onChange={e => setCpConfirm(e.target.value)}
                        placeholder="আবার লিখুন"
                        className={`w-full border-2 p-3 bg-transparent focus:outline-none font-mono text-sm ${cpConfirm && cpConfirm !== cpNew ? 'border-red-500' : 'border-zinc-900 dark:border-zinc-100'}`} />
                      {cpConfirm && cpConfirm !== cpNew && (
                        <p className="text-red-500 text-xs font-bold mt-1">Passcode দুটি মিলছে না।</p>
                      )}
                    </div>
                    <div className="pt-2">
                      <button type="submit" disabled={cpLoading || (!!cpConfirm && cpConfirm !== cpNew)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black uppercase py-3 px-4 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all disabled:opacity-50">
                        {cpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔒 Passcode পরিবর্তন করুন"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </nav>
  );
}

import {
  Users,
  BookOpen,
  FileText,
  CreditCard,
  ArrowLeft,
  Layers,
} from "lucide-react";

function AdminDashboard() {
  const [absentFlags, setAbsentFlags] = useState<{ name: string; batchName: string; missedCount: number }[]>([]);

  useEffect(() => {
    const computeFlags = async () => {
      try {
        const [sessions, attendance, users, batches] = await Promise.all([
          api.getExamSessions(),
          api.getAttendance(),
          api.getUsers(),
          api.getBatches(),
        ]);

        const batchMap: Record<string, string> = {};
        batches.forEach((b: any) => { batchMap[b.id] = b.name; });

        const students = users.filter((u: any) => u.role !== 'admin' && u.status === 'active');
        const flags: { name: string; batchName: string; missedCount: number }[] = [];

        const batchIds = [...new Set(students.map((s: any) => s.batchId).filter(Boolean))];

        batchIds.forEach((batchId: any) => {
          const batchSessions = sessions
            .filter((s: any) => s.batchId === batchId)
            .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 3);

          if (batchSessions.length < 3) return;

          const lastThreeIds = new Set(batchSessions.map((s: any) => s.id));
          const presentInSession: Record<string, Set<string>> = {};
          attendance.forEach((a: any) => {
            if (lastThreeIds.has(a.sessionId)) {
              if (!presentInSession[a.sessionId]) presentInSession[a.sessionId] = new Set();
              presentInSession[a.sessionId].add(a.studentId);
            }
          });

          const batchStudents = students.filter((s: any) => s.batchId === batchId);
          batchStudents.forEach((student: any) => {
            const missedAll = batchSessions.every(
              (sess: any) => !(presentInSession[sess.id]?.has(student.id))
            );
            if (missedAll) {
              flags.push({ name: student.name || student.phone, batchName: batchMap[batchId] || batchId, missedCount: 3 });
            }
          });
        });

        setAbsentFlags(flags);
      } catch (err) {
        console.error("Attendance flag error:", err);
      }
    };
    computeFlags();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none mb-2">
            Admin Dashboard
          </h2>
          <p className="text-zinc-500 text-sm font-medium">
            Manage your tuition center
          </p>
        </div>
      </div>

      {absentFlags.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/30 border-4 border-red-500 p-4">
          <h3 className="font-black text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
            <span>⚠️ অনুপস্থিত সতর্কতা</span>
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 font-black">{absentFlags.length}</span>
          </h3>
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
            নিচের ছাত্রছাত্রীরা পরপর ৩টি exam-এ অনুপস্থিত ছিল:
          </p>
          <div className="flex flex-wrap gap-2">
            {absentFlags.map((f, i) => (
              <div key={i} className="bg-red-100 dark:bg-red-900/40 border-2 border-red-400 px-3 py-1.5 text-xs font-black text-red-800 dark:text-red-200 flex items-center gap-2">
                <span>🚩</span>
                <span>{f.name}</span>
                <span className="text-red-500 dark:text-red-400 font-medium">({f.batchName})</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-500 dark:text-red-400 font-bold mt-3">
            ※ এই সমস্যা manually সমাধান করতে Students Management-এ যান।
          </p>
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
            to="/admin/results"
            className="inline-block bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] border-2 border-zinc-900 dark:border-zinc-100"
          >
            View Results
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
    </div>
  );
}

import { Exam, Note, Payment } from "./pages/Pages";

function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<{
    status: string;
    label: string;
    color: string;
  }>({
    status: "paid",
    label: "All Paid Up",
    color: "text-emerald-600 dark:text-emerald-400",
  });
  const [showNudge, setShowNudge] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Check nudge popup
    if (
      user &&
      (user as any).showPaymentNudge &&
      (user as any).monthlyFee > 0 &&
      (user as any).pendingMonths > 0
    ) {
      const sessionKey = `nudge_shown_${user.uid}`;
      if (!sessionStorage.getItem(sessionKey)) {
        setShowNudge(true);
        sessionStorage.setItem(sessionKey, "true");
      }
    }

    if (user && (user as any).pendingMonths > 0) {
        // Pending months check moved to second useEffect to prevent flashing
    }
  }, [user?.uid, (user as any)?.showPaymentNudge, (user as any)?.monthlyFee, (user as any)?.pendingMonths]);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchPayment = async () => {
      try {
        let pData: Payment[] = [];
        try {
            const allPayments = await api.getPayments();
            const studentPayments = allPayments.filter(p => p.studentId === user.uid);
            studentPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (studentPayments.length > 0) {
               pData.push(studentPayments[0] as any);
            }
        } catch (err) {
            console.error("Failed to get student payment:", err);
        }

        if (pData.length > 0) {
          const latest = pData[0];
          if (latest.status === "pending") {
            setPaymentStatus({
              status: "pending",
              label: "Pending Review",
              color: "text-yellow-600 dark:text-yellow-400",
            });
          } else if (latest.status === "rejected") {
            setPaymentStatus({
              status: "rejected",
              label: "Rejected",
              color: "text-red-600 dark:text-red-400",
            });
          } else if ((user as any).pendingMonths > 0) {
            setPaymentStatus({
              status: "pending",
              label: "Payment Pending",
              color: "text-red-600 dark:text-red-400",
            });
          } else {
            setPaymentStatus({
              status: "paid",
              label: "All Paid Up",
              color: "text-emerald-600 dark:text-emerald-400",
            });
          }
        } else {
          if ((user as any).pendingMonths > 0) {
            setPaymentStatus({
              status: "pending",
              label: "Payment Pending",
              color: "text-red-600 dark:text-red-400",
            });
          }
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };
    fetchPayment();

    if (user.batchId) {
      try {
        const fetchAssignments = async () => {
        const ann = await api.getAnnouncement();
        setAnnouncement(ann);
           const allBatches = await api.getBatches();
           const batch = allBatches.find(b => b.id === user.batchId);
           if (!batch) return;
           const assignedItemsMap = batch.assignedItemsMap || {};
           const assignedIds = Object.keys(assignedItemsMap);
           if (assignedIds.length === 0) return;

           const libraryItems = await api.getLibrary();
           
           const accessible = new Set<string>();
           assignedIds.forEach(id => {
              if (libraryItems.some(i => i.id === id)) {
                 accessible.add(id);
              }
           });
           
           const addChildren = (pId: string) => {
              libraryItems.forEach(i => {
                 if (i.parentId === pId && !accessible.has(i.id)) {
                    accessible.add(i.id);
                    addChildren(i.id);
                 }
              });
           };
           Array.from(accessible).forEach(id => addChildren(id));

           const accessibleFiles = libraryItems.filter(i => accessible.has(i.id) && !i.isFolder);
           
           accessibleFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
           
           const eData = accessibleFiles.filter(i => i.type === 'exam');
           const nData = accessibleFiles.filter(i => i.type === 'note' || i.type === 'pdf');
           
           setExams(eData.slice(0, 3) as any);
           setNotes(nData.slice(0, 5) as any);
        };
        fetchAssignments();
        
        const fetchAttendance = async () => {
           try {
             const { getAllAttendanceForBatch } = await import('./lib/exam-session-utils');
             const sBatchAtt = await getAllAttendanceForBatch(user.batchId, 3);
             let recentAbsences = 0;
             let validExamsChecked = 0;
             for (let i = 0; i < sBatchAtt.length && validExamsChecked < 3; i++) {
                const attDateMs = new Date(sBatchAtt[i].date).getTime();
                const msJoined = (user as any).createdAt ? new Date((user as any).createdAt).getTime() : 0;
                if (msJoined && attDateMs < msJoined - 86400000) {
                   continue;
                }
                
                validExamsChecked++;
                if (!sBatchAtt[i].presentStudentIds.includes(user.uid)) {
                   recentAbsences++;
                } else {
                   break;
                }
             }
             setAbsentCount(recentAbsences);
           } catch(err) {
             console.error("Attendance fetch error:", err);
           }
        };
        fetchAttendance();
      } catch (error) {
        console.error("Dashboard assignments fetch error:", error);
      }
    }
  }, [user?.uid, user?.batchId]);

  if (user?.status === "pending") {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-8">
        <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-600 dark:border-yellow-400 p-6 shadow-[6px_6px_0px_0px_rgba(202,138,4,1)]">
          <h2 className="text-xl font-black uppercase mb-2 text-yellow-800 dark:text-yellow-200">
            Pending Approval
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Your account is created but waiting for admin approval. Please wait
            for the teacher to verify your account and assign you to a batch.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 text-white font-black uppercase px-4 py-2 text-sm hover:-translate-y-0.5 transition-transform border-2 border-yellow-800"
          >
            🔄 Check Approval Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full relative">
      {showNudge && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 dark:border-red-500 w-full max-w-sm p-6 text-center transform transition-all scale-100 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-600 dark:border-red-500">
              <span className="font-black text-2xl">!</span>
            </div>
            <h2 className="text-xl font-black uppercase mb-2 text-red-600">
              Payment Reminder
            </h2>
            <p className="mb-4 font-bold text-sm text-zinc-700 dark:text-zinc-300">
              Your monthly salary/fee for{" "}
              <span className="text-red-600 dark:text-red-400">
                {(user as any).pendingMonths} month
                {((user as any).pendingMonths || 1) > 1 ? "s" : ""}
              </span>{" "}
              is pending.
            </p>
            <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Monthly Fee: ₹{(user as any).monthlyFee}
            </p>
            <button
              onClick={() => setShowNudge(false)}
              className="w-full border-2 border-red-600 bg-red-600 text-white font-bold uppercase py-3 hover:-translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] transition-transform active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(153,27,27,1)]"
            >
              I Understand, Close
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 mt-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none mb-2">
            Student Dashboard
          </h2>
          <p className="text-zinc-500 text-sm font-medium">
            Welcome back, {user?.fullName || user?.displayName || "Student"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min flex-grow">
        {/* My Profile Card */}
        <div className="md:col-span-12 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="flex-grow w-full">
            <h3 className="font-black text-xl uppercase mb-4 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">
              My Profile Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Full Name:
                </span>{" "}
                <div className="font-bold">{user?.fullName || "N/A"}</div>
              </div>
              <div>
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Phone:
                </span>{" "}
                <div className="font-bold">{user?.phone || "N/A"}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Address:
                </span>{" "}
                <div className="font-bold whitespace-pre-wrap">
                  {user?.address || "N/A"}
                </div>
              </div>
              <div>
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Email:
                </span>{" "}
                <div className="font-bold">{user?.email}</div>
              </div>
              <div>
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Joined Date:
                </span>{" "}
                <div className="font-bold">{user?.joinDate || "N/A"}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-zinc-500 uppercase text-xs block">
                  Attendance Warning:
                </span>{" "}
                <div className="font-bold">
                  {absentCount > 0 ? (
                    <span className={absentCount >= 3 ? "text-red-500 font-black" : "text-yellow-600"}>
                      You missed {absentCount} of the last 3 live exams!
                    </span>
                  ) : (
                    <span className="text-emerald-500">Perfect recently. Keep it up!</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[10px] uppercase font-bold text-red-500 mt-4 border border-red-200 bg-red-50 p-2 dark:bg-red-950/20 dark:border-red-900">
              Note: Profile details are fixed. Contact the admin to update them.
            </p>
          </div>
        </div>

        {/* Active Exams Card */}
        <div className="md:col-span-8 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(161,161,170,1)] dark:shadow-[6px_6px_0px_0px_rgba(82,82,91,1)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-black text-xl uppercase mb-1">
                Recent Exams
              </h3>
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-600 uppercase">
                Latest assigned to you
              </p>
            </div>
            <div className="bg-zinc-800 dark:bg-zinc-200 p-2 border-2 border-zinc-700 dark:border-zinc-300">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="mb-6 space-y-3">
            {exams.length === 0 ? (
              <div className="text-sm font-medium text-zinc-400 dark:text-zinc-600 italic">
                No exams are currently active for your batch.
              </div>
            ) : (
              exams.map((exam, index) => {
                const timestamp = (exam as any).createdAt;
                const d = safeToDate(timestamp);
                const dateStr = d
                  ? d.toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                return (
                  <div
                    key={exam.id}
                    className="flex justify-between items-center bg-zinc-800 dark:bg-zinc-200 p-3 border border-zinc-700 dark:border-zinc-300 gap-4"
                  >
                    <div className="flex-grow">
                      <div className="font-bold flex items-center gap-2">
                        {exam.title}
                        <span className="text-[9px] bg-zinc-700 dark:bg-zinc-300 px-1 py-0.5 rounded-sm uppercase">
                          {exam.examType || "Exam"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                        Added: {dateStr}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end min-w-[80px]">
                      <Link
                        to="/student/library"
                        className="text-[10px] font-bold uppercase underline hover:text-emerald-500 text-emerald-600 dark:text-emerald-400"
                      >
                        Open Exam
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link
            to="/student/library"
            className="inline-block bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(212,212,216,1)] dark:shadow-[4px_4px_0px_0px_rgba(63,63,70,1)] border-2 border-transparent"
          >
            Browse All Exams in Library
          </Link>
        </div>

        {/* Notifications / Payment Banner */}
        <div className="md:col-span-4 bg-yellow-300 dark:bg-yellow-600 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] text-zinc-900 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-xl uppercase mb-1">Payments</h3>
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-950 uppercase">
              Account Status
            </p>
          </div>
          <div className="mt-4 p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100">
            <div className="text-xs font-bold uppercase text-zinc-500 mb-1">
              Status
            </div>
            <div className={`font-bold uppercase mb-4 ${paymentStatus.color}`}>
              {paymentStatus.label}
            </div>
            <Link
              to="/student/payments"
              className="inline-block bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(161,161,170,1)]"
            >
              Make Payment
            </Link>
          </div>
        </div>

        {/* Notes Card */}
        <div className="md:col-span-12 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-6 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] dark:shadow-[6px_6px_0px_0px_rgba(244,244,245,1)] mt-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-black text-xl uppercase mb-1">
                Recent Library Additions
              </h3>
              <p className="text-xs font-bold text-zinc-500 uppercase">
                Latest PDF Notes & Handouts
              </p>
            </div>
            <div className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 p-2 border-2 border-orange-700 dark:border-orange-300">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4">
            {notes.length === 0 ? (
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 italic">
                No active notes available right now.
              </div>
            ) : (
              notes.map((note, index) => {
                const timestamp = (note as any).createdAt;
                const d = safeToDate(timestamp);
                const dateStr = d
                  ? d.toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                return (
                  <Link
                    to="/student/library"
                    key={note.id}
                    className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-3 hover:-translate-y-1 transition-transform min-w-[200px] flex flex-col justify-between"
                  >
                    <div className="font-bold text-orange-900 dark:text-orange-50">
                      {note.title}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">
                        {dateStr}
                      </div>
                      <div className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold">
                        Open In Library
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            to="/student/library"
            className="inline-block bg-orange-500 text-white font-bold uppercase text-xs px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] border-2 border-zinc-900 dark:border-zinc-100"
          >
            Browse Library
          </Link>
        </div>
      </div>
    </div>
  );
}

function StudentSimulatorWrapper() {
  const authCtx = React.useContext(AuthContext);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [simulatedBatchId, setSimulatedBatchId] = useState(
    localStorage.getItem("simulatedBatchId") || "",
  );
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [simulatedStudentId, setSimulatedStudentId] = useState(
    localStorage.getItem("simulatedStudentId") || "",
  );
  const [simulatedStudentData, setSimulatedStudentData] = useState<any>(null);

  useEffect(() => {
    if (authCtx.user?.role !== "admin") return;
    const fetchBatches = async () => {
      try {
        const b = await api.getBatches();
        setBatches(b.map(item => ({ id: item.id, name: item.name })));
        if (b.length > 0 && !simulatedBatchId) {
          setSimulatedBatchId(b[0].id);
          localStorage.setItem("simulatedBatchId", b[0].id);
        }
      } catch (err) {
        console.error("Error fetching batches for simulation:", err);
      }
    };
    fetchBatches();
  }, [authCtx.user?.uid, authCtx.user?.role]);

  useEffect(() => {
    if (!simulatedBatchId || authCtx.user?.role !== "admin") {
      setBatchStudents([]);
      return;
    }
    const fetchStudents = async () => {
      try {
        const allUsers = await api.getUsers();
        const students = allUsers.filter(u => u.batchId === simulatedBatchId && u.role !== 'admin');
        setBatchStudents(students);
        if (!students.some((s) => s.id === simulatedStudentId)) {
          setSimulatedStudentId("");
          setSimulatedStudentData(null);
        }
      } catch (err) {
        console.error("Error fetching students for simulation:", err);
      }
    };
    fetchStudents();
  }, [simulatedBatchId, authCtx.user?.role]);

  useEffect(() => {
    if (!simulatedStudentId || authCtx.user?.role !== "admin") {
      setSimulatedStudentData(null);
      return;
    }
    const fetchStudentData = async () => {
      try {
        const allUsers = await api.getUsers();
        const u = allUsers.find(user => user.id === simulatedStudentId);
        if (u) {
          setSimulatedStudentData(u);
        } else {
          setSimulatedStudentData(null);
        }
      } catch (err) {
        console.error("Error fetching student data for simulation:", err);
      }
    };
    fetchStudentData();
  }, [simulatedStudentId, authCtx.user?.role]);

  if (authCtx.user?.role !== "admin") {
    return <Outlet />;
  }

  const simulatedUser = simulatedStudentData
    ? {
        uid: simulatedStudentData.id,
        email: simulatedStudentData.email || '',
        displayName: simulatedStudentData.name || 'Student',
        photoURL: simulatedStudentData.profilePhotoUrl || null,
        role: "student" as const,
        status: simulatedStudentData.status || 'active',
        createdAt: simulatedStudentData.createdAt || new Date().toISOString(),
        updatedAt: simulatedStudentData.updatedAt || new Date().toISOString(),
        fullName: simulatedStudentData.name,
        address: simulatedStudentData.address,
        dob: simulatedStudentData.dob,
        joinDate: simulatedStudentData.joinDate,
        phone: simulatedStudentData.phone,
        batchId: simulatedStudentData.batchId,
        isProfileComplete: simulatedStudentData.status !== 'incomplete',
        profilePhotoUrl: simulatedStudentData.profilePhotoUrl,
        monthlyFee: simulatedStudentData.monthlyFee !== undefined ? Number(simulatedStudentData.monthlyFee) : 500,
        pendingMonths: simulatedStudentData.pendingMonths !== undefined ? Number(simulatedStudentData.pendingMonths) : 0,
        passcode: simulatedStudentData.passcode,
        paymentStatus: simulatedStudentData.paymentStatus,
        reapplyReason: simulatedStudentData.reapplyReason,
        isSimulatedAdmin: true,
      }
    : {
        ...authCtx.user,
        uid: authCtx.user?.uid || "simulated_default_uid",
        role: "student" as const,
        status: "active" as const,
        batchId: simulatedBatchId,
        isProfileComplete: true,
        isSimulatedAdmin: true,
      };

  return (
    <>
      <div className="bg-yellow-400 text-yellow-900 border-b-4 border-yellow-500 px-4 py-2 flex flex-col items-center justify-between font-bold text-xs uppercase shadow-md relative z-50 gap-2">
        <div className="flex w-full items-center justify-between flex-wrap gap-2 mb-2 sm:mb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-yellow-900 text-yellow-400 px-2 py-1">
              Simulation Mode
            </span>
            <span>Batch:</span>
            <select
              value={simulatedBatchId}
              onChange={(e) => {
                setSimulatedBatchId(e.target.value);
                localStorage.setItem("simulatedBatchId", e.target.value);
                setSimulatedStudentId("");
                localStorage.removeItem("simulatedStudentId");
              }}
              className="bg-yellow-50 border-2 border-yellow-600 p-1 outline-none font-bold text-yellow-900 shadow-[2px_2px_0px_0px_rgba(161,98,7,1)]"
            >
              <option value="">-- No Batch --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <span className="ml-2 hidden sm:inline">Student:</span>
            <select
              value={simulatedStudentId}
              onChange={(e) => {
                setSimulatedStudentId(e.target.value);
                localStorage.setItem("simulatedStudentId", e.target.value);
              }}
              className="bg-yellow-50 border-2 border-yellow-600 p-1 outline-none font-bold text-yellow-900 shadow-[2px_2px_0px_0px_rgba(161,98,7,1)]"
            >
              <option value="">-- Default Admin UID --</option>
              {batchStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.fullName || s.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin"
              className="bg-zinc-900 text-white px-3 py-1.5 border border-zinc-700 hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-transform whitespace-nowrap"
            >
              Exit Simulator
            </Link>
          </div>
        </div>
        {simulatedStudentId && (
          <div
            className="w-full text-left text-yellow-800 bg-yellow-500/30 p-1 mt-1 border border-yellow-500 flex items-center justify-between"
            style={{ fontSize: "10px" }}
          >
            <span>
              Working as:{" "}
              {batchStudents.find((s) => s.id === simulatedStudentId)?.fullName}{" "}
              - Payments and quizzes submitted now will create real records for
              this student.
            </span>
          </div>
        )}
      </div>
      <AuthContext.Provider value={{ ...authCtx, user: simulatedUser as any }}>
        <Outlet />
      </AuthContext.Provider>
    </>
  );
}

function RootRoute() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (user.role === "admin") return <Navigate to="/admin" />;
  return <Navigate to="/student" />;
}

function GlobalAlert() {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAlert = (e: any) => {
      setAlertMsg(e.detail);
    };
    window.addEventListener("show-custom-alert", handleAlert);
    return () => window.removeEventListener("show-custom-alert", handleAlert);
  }, []);

  if (!alertMsg) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-100 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)]">
        <h3 className="font-black text-xl uppercase mb-4 text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">
          Notice
        </h3>
        <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-6 whitespace-pre-wrap">
          {alertMsg}
        </p>
        <button
          onClick={() => setAlertMsg(null)}
          className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase py-3 hover:-translate-y-0.5 transition-transform"
        >
          OK
        </button>
      </div>
    </div>
  );
}

import { ReloadPrompt } from "./components/ReloadPrompt";
import { InstallPrompt } from "./components/InstallPrompt";

export default function App() {
  return (
    <Router>
      <ReloadPrompt />
      <InstallPrompt />
      <GlobalAlert />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/setup-profile"
              element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute adminOnly>
                  <AdminStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/batches"
              element={
                <ProtectedRoute adminOnly>
                  <AdminBatches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/library"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/results/:examId?"
              element={
                <ProtectedRoute adminOnly>
                  <AdminResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/student" element={<StudentSimulatorWrapper />}>
              <Route
                index
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="library"
                element={
                  <ProtectedRoute>
                    <StudentLibrary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payments"
                element={
                  <ProtectedRoute>
                    <StudentPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams"
                element={<Navigate to="/student/library" replace />}
              />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}
