// =========================================================================
// M-C Tuition Application: Unified API Database Layer (api.ts)
// Swaps Firebase out for Google Apps Script + Google Sheets
// =========================================================================

declare const google: any;

// =========================================================================
// GOOGLE APPS SCRIPT WEB APP URL (For Vercel Deployment)
// =========================================================================
// REPLACE THIS WITH YOUR LIVE DEPLOYMENT URL
export const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: 'admin' | 'student';
  status?: 'active' | 'pending' | 'rejected' | 'incomplete';
  batchId?: string;
  passcode?: string;
  paymentStatus?: string;
  reapplyReason?: string;
  createdAt?: string;
  updatedAt?: string;
  profilePhotoUrl?: string;
  address?: string;
  dob?: string;
  joinDate?: string;
  monthlyFee?: number;
  pendingMonths?: number;
  excusedDates?: string;
  exemptReason?: string;
}

export interface Batch {
  id: string;
  name: string;
  assignedItemsMap: Record<string, string>; // itemId -> assignedAtISO
  createdAt: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  type: 'folder' | 'note' | 'exam' | 'pdf';
  parentId: string | null;
  contentUrl?: string;
  isFolder: boolean;
  isEncrypted?: boolean;
  encryptionPassword?: string;
  quizId?: string;
  createdAt: string;
  fileName?: string;
  isChunked?: boolean;
  chunkCount?: number;
  examType?: string;
  trackingId?: string;
  timeLimit?: number;
  marksCorrect?: number;
  marksWrong?: number;
  allowMultipleAttempts?: boolean;
  quizData?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  transactionId?: string;
  paidDate?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  batchId: string; // 'all' or specific batchId
  senderId: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  batchId: string;
  code: string;
  isActive: boolean;
  codeEnabled: boolean;
  participantUids: string[];
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  joinedTime: string;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  answersJSON: string;
  submittedAt: string;
}

export function cleanPhone(p: any): string {
  if (p === undefined || p === null) return "";
  let s = String(p);
  if (s.indexOf('.') !== -1) {
    s = s.split('.')[0];
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}  // Environment Detection
  const USE_REAL_API = true;
  
  // =========================================================================
  // 1. FETCH BASED GAS METHOD EXECUTOR (REPLACES google.script.run)
  // =========================================================================
  async function runGasMethod<T>(methodName: string, ...args: any[]): Promise<T> {
    if (!USE_REAL_API) {
      throw new Error("Local mock mode is forced");
    }
  
    if (GAS_WEB_APP_URL.includes("REPLACE_THIS_WITH_YOUR_URL")) {
      alert("CRITICAL ERROR: Please add your Google Apps Script Web App URL in src/lib/api.ts!");
      throw new Error("Missing GAS Web App URL");
    }
  
    try {
      const fetchResponse = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ action: methodName, args: args }),
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        }
      });
  
      const json = await fetchResponse.json();
  
      if (!json.success) {
        throw new Error(json.error || "API Gateway Error");
      }
  
      const response = json.data;
  
      if (response && response.success === false) {
        throw new Error(response.error || "GAS server-side error");
      } else if (response && response.success === true && response.data !== undefined) {
        return response.data as T;
      } else if (response && response.success === true && response.payload !== undefined) {
        return response as T;
      } else {
        return response as T;
      }
    } catch (err: any) {
      console.error("API Call Failed:", methodName, err);
      throw err;
    }
}

// =========================================================================
// 2. CLIENT-SIDE LOCALSTORAGE MOCK DATABASE (DEVELOPMENT & LOCAL TESTING)
// =========================================================================

const MOCK_STORAGE_KEY = "mc_coaching_mock_db";

interface MockDB {
  users: UserProfile[];
  batches: Batch[];
  library: LibraryItem[];
  payments: PaymentRecord[];
  notifications: NotificationItem[];
  examSessions: ExamSession[];
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
}

function getMockDB(): MockDB {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }

  // SEED INITIAL DUMMY DATA FOR LOCAL TESTING
  const initialDB: MockDB = {
    users: [
      {
        id: "admin_uid",
        name: "Saikat Mondal (Admin)",
        phone: "9432490498",
        email: "mondal.saikat185@gmail.com",
        role: "admin",
        status: "active",
        passcode: "saikat123",
        createdAt: new Date().toISOString()
      },
      {
        id: "student_1",
        name: "Rohan Das",
        phone: "9988776655",
        email: "rohan@gmail.com",
        role: "student",
        status: "active",
        batchId: "batch_morning",
        passcode: "9988776655",
        paymentStatus: "paid",
        createdAt: new Date().toISOString()
      },
      {
        id: "student_2",
        name: "Priya Sen",
        phone: "8877665544",
        email: "priya@gmail.com",
        role: "student",
        status: "pending",
        batchId: "batch_evening",
        passcode: "8877665544",
        createdAt: new Date().toISOString()
      }
    ],
    batches: [
      {
        id: "batch_morning",
        name: "Morning Batch (Class 10)",
        assignedItemsMap: {
          "note_1": new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      },
      {
        id: "batch_evening",
        name: "Evening Batch (Class 12)",
        assignedItemsMap: {},
        createdAt: new Date().toISOString()
      }
    ],
    library: [
      {
        id: "folder_science",
        title: "Physical Science",
        type: "folder",
        parentId: null,
        isFolder: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "note_1",
        title: "Light & Optics Class Lecture Note",
        type: "note",
        parentId: "folder_science",
        contentUrl: "https://docs.google.com/viewer?url=https://saikat-tuition.duckdns.org/sample.pdf",
        isFolder: false,
        isEncrypted: true,
        encryptionPassword: "",
        createdAt: new Date().toISOString()
      }
    ],
    payments: [
      {
        id: "pay_1",
        studentId: "student_1",
        month: "May 2026",
        amount: 800,
        status: "paid",
        transactionId: "TXN12345",
        paidDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    notifications: [
      {
        id: "notif_1",
        title: "কলাসের সময় পরিবর্তন",
        message: "আগামীকালের সকালের ব্যাচের ক্লাস সকাল ৮টার পরিবর্তে সকাল ৭:৩০ মিনিটে শুরু হবে।",
        batchId: "batch_morning",
        senderId: "admin_uid",
        createdAt: new Date().toISOString()
      }
    ],
    examSessions: [],
    attendance: [],
    examResults: []
  };

  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialDB));
  return initialDB;
}

function saveMockDB(db: MockDB) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Generic helper to generate quick unique ID
const makeId = () => "id_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36);

// =========================================================================
// 3. EXPORTED UINFIED API ENGINE
// =========================================================================

export const api = {
  // Check if we are running in production Apps Script web app
  isProduction: () => USE_REAL_API,

  // --- 👤 USERS & AUTHENTICATION ---
  
  getUsers: async (): Promise<UserProfile[]> => {
    if (USE_REAL_API) {
      return runGasMethod<UserProfile[]>("apiGetUsers");
    } else {
      return getMockDB().users;
    }
  },

  saveUser: async (user: Omit<UserProfile, 'id'> & { id?: string }): Promise<UserProfile> => {
    if (USE_REAL_API) {
      return runGasMethod<UserProfile>("apiSaveUser", user);
    } else {
      const db = getMockDB();
      if (user.id) {
        const idx = db.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          db.users[idx] = { ...db.users[idx], ...user, updatedAt: new Date().toISOString() } as UserProfile;
          saveMockDB(db);
          return db.users[idx];
        }
      }
      // Register new student
      const newUser: UserProfile = {
        ...user,
        id: user.id || makeId(),
        role: user.role || 'student',
        status: user.status || 'incomplete',
        paymentStatus: user.paymentStatus || 'unpaid',
        passcode: user.passcode || cleanPhone(user.phone),
        createdAt: new Date().toISOString()
      } as UserProfile;
      db.users.push(newUser);
      saveMockDB(db);
      return newUser;
    }
  },

  updateUserStatus: async (userId: string, status: UserProfile['status'], rejectReason?: string): Promise<UserProfile> => {
    if (USE_REAL_API) {
      const res = await runGasMethod<UserProfile>("apiUpdateUserStatus", userId, status, rejectReason);
      if (!(res as any) || (res as any).success === false) {
        throw new Error((res as any)?.error || "Failed to update user status");
      }
      return res;
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");
      db.users[idx].status = status;
      if (rejectReason) db.users[idx].reapplyReason = rejectReason;
      if (status === 'active') db.users[idx].paymentStatus = 'unpaid';
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return db.users[idx];
    }
  },

  updateUserPasscode: async (userId: string, passcode: string): Promise<UserProfile> => {
    if (USE_REAL_API) {
      return runGasMethod<UserProfile>("apiUpdateUserPasscode", userId, passcode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");
      db.users[idx].passcode = passcode;
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return db.users[idx];
    }
  },

  checkApplicationStatus: async (phone: string): Promise<{ success: boolean; status: string; userId?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status: string; userId?: string; error?: string }>("apiCheckApplicationStatus", phone);
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(phone || "");
      const existingUser = db.users.find(u => cleanPhone(u.phone) === cleanedInputPhone);
      
      if (!existingUser) {
        return { success: true, status: "not_found" };
      }
      
      return { success: true, status: existingUser.status as string, userId: existingUser.id };
    }
  },

  registerUser: async (userData: Partial<UserProfile>): Promise<{ success: boolean; status: string; message?: string; data?: any }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status: string; message?: string; data?: any }>("apiRegisterUser", userData);
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(userData.phone || "");
      const existingUser = db.users.find(u => cleanPhone(u.phone) === cleanedInputPhone);
      
      if (existingUser) {
        return { success: true, status: existingUser.status, message: "User already exists" };
      }
      
      const newUser: UserProfile = {
        ...userData,
        id: makeId(),
        role: 'student',
        status: 'pending',
        paymentStatus: 'unpaid',
        passcode: cleanPhone(userData.phone || ""),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as UserProfile;
      
      db.users.push(newUser);
      saveMockDB(db);
      return { success: true, status: 'pending', data: newUser };
    }
  },

  loginUser: async (phone: string, passcode: string): Promise<UserProfile> => {
    if (USE_REAL_API) {
      return runGasMethod<UserProfile>("apiLoginUser", phone, passcode);
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(phone);
      
      const user = db.users.find(u => {
        return cleanPhone(u.phone) === cleanedInputPhone;
      });

      if (!user) throw new Error("ফোন নম্বরটি নিবন্ধিত নয় (Phone number not registered)");
      
      let userPasscodeStr = user.passcode !== undefined && user.passcode !== null ? String(user.passcode).trim() : "";
      const inputPasscodeStr = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
      
      if (userPasscodeStr === "") {
        const defaultPasscode = cleanPhone(user.phone);
        if (inputPasscodeStr === defaultPasscode) {
          userPasscodeStr = defaultPasscode;
          user.passcode = defaultPasscode;
          saveMockDB(db);
        }
      }

      if (userPasscodeStr !== inputPasscodeStr) throw new Error("ভুল পাসকোড! দয়া করে সঠিক পাসকোড দিন (Invalid Passcode)");
      return user;
    }
  },

  getAnnouncement: async (): Promise<string> => {
    if (USE_REAL_API) {
      return runGasMethod<string>('apiGetAnnouncement');
    }
    return localStorage.getItem('mc_announcement') || '';
  },
  saveAnnouncement: async (message: string): Promise<boolean> => {
    if (USE_REAL_API) {
      await runGasMethod<any>('apiSaveAnnouncement', message);
      return true;
    }
    localStorage.setItem('mc_announcement', message);
    return true;
  },
  deleteUser: async (userId: string): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteUser", userId);
    } else {
      const db = getMockDB();
      const initialLength = db.users.length;
      db.users = db.users.filter(u => u.id !== userId);
      saveMockDB(db);
      return db.users.length < initialLength;
    }
  },

  // --- 🎒 BATCHES ---

  getBatches: async (): Promise<Batch[]> => {
    if (USE_REAL_API) {
      return runGasMethod<Batch[]>("apiGetBatches");
    } else {
      return getMockDB().batches;
    }
  },

  saveBatch: async (batch: Omit<Batch, 'id' | 'createdAt'> & { id?: string }): Promise<Batch> => {
    if (USE_REAL_API) {
      return runGasMethod<Batch>("apiSaveBatch", batch);
    } else {
      const db = getMockDB();
      if (batch.id) {
        const idx = db.batches.findIndex(b => b.id === batch.id);
        if (idx !== -1) {
          db.batches[idx] = { ...db.batches[idx], ...batch } as Batch;
          saveMockDB(db);
          return db.batches[idx];
        }
      }
      const newBatch: Batch = {
        ...batch,
        id: makeId(),
        assignedItemsMap: batch.assignedItemsMap || {},
        createdAt: new Date().toISOString()
      };
      db.batches.push(newBatch);
      saveMockDB(db);
      return newBatch;
    }
  },

  deleteBatch: async (batchId: string): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteBatch", batchId);
    } else {
      const db = getMockDB();
      const initialLength = db.batches.length;
      db.batches = db.batches.filter(b => b.id !== batchId);
      saveMockDB(db);
      return db.batches.length < initialLength;
    }
  },

  // --- 📚 LIBRARY ---

  getLibrary: async (): Promise<LibraryItem[]> => {
    if (USE_REAL_API) {
      return runGasMethod<LibraryItem[]>("apiGetLibrary");
    } else {
      return getMockDB().library;
    }
  },

  saveLibraryItem: async (item: Omit<LibraryItem, 'id' | 'createdAt'> & { id?: string }): Promise<LibraryItem> => {
    if (USE_REAL_API) {
      return runGasMethod<LibraryItem>("apiSaveLibraryItem", item);
    } else {
      const db = getMockDB();
      if (item.id) {
        const idx = db.library.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          db.library[idx] = { ...db.library[idx], ...item } as LibraryItem;
          saveMockDB(db);
          return db.library[idx];
        }
      }
      const newItem: LibraryItem = {
        ...item,
        id: makeId(),
        createdAt: new Date().toISOString()
      } as LibraryItem;
      db.library.push(newItem);
      saveMockDB(db);
      return newItem;
    }
  },

  deleteLibraryItem: async (itemId: string): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteLibraryItem", itemId);
    } else {
      const db = getMockDB();
      const initialLength = db.library.length;
      db.library = db.library.filter(i => i.id !== itemId);
      
      // Clean up batch share links
      db.batches.forEach(b => {
        if (b.assignedItemsMap[itemId]) {
          delete b.assignedItemsMap[itemId];
        }
      });
      
      saveMockDB(db);
      return db.library.length < initialLength;
    }
  },

  shareLibraryItem: async (itemId: string, batchIdsMap: Record<string, boolean>): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiShareLibraryItem", itemId, batchIdsMap);
    } else {
      const db = getMockDB();
      db.batches.forEach(b => {
        if (batchIdsMap[b.id]) {
          b.assignedItemsMap[itemId] = new Date().toISOString();
        } else {
          delete b.assignedItemsMap[itemId];
        }
      });
      saveMockDB(db);
      return true;
    }
  },

  // --- 💳 PAYMENTS ---

  getPayments: async (): Promise<PaymentRecord[]> => {
    if (USE_REAL_API) {
      return runGasMethod<PaymentRecord[]>("apiGetPayments");
    } else {
      return getMockDB().payments;
    }
  },

  addPayment: async (payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> => {
    if (USE_REAL_API) {
      return runGasMethod<PaymentRecord>("apiAddPayment", payment);
    } else {
      const db = getMockDB();
      const newPay: PaymentRecord = {
        ...payment,
        id: makeId(),
        createdAt: new Date().toISOString()
      };
      db.payments.push(newPay);
      
      // Update student paymentStatus globally
      const userIdx = db.users.findIndex(u => u.id === payment.studentId);
      if (userIdx !== -1) {
        db.users[userIdx].paymentStatus = payment.status;
      }
      
      saveMockDB(db);
      return newPay;
    }
  },

  updatePaymentStatus: async (paymentId: string, status: PaymentRecord['status']): Promise<PaymentRecord> => {
    if (USE_REAL_API) {
      return runGasMethod<PaymentRecord>("apiUpdatePaymentStatus", paymentId, status);
    } else {
      const db = getMockDB();
      const idx = db.payments.findIndex(p => p.id === paymentId);
      if (idx === -1) throw new Error("Payment record not found");
      db.payments[idx].status = status;
      
      // Update user global status
      const userIdx = db.users.findIndex(u => u.id === db.payments[idx].studentId);
      if (userIdx !== -1) {
        db.users[userIdx].paymentStatus = status;
      }

      saveMockDB(db);
      return db.payments[idx];
    }
  },

  // --- 📢 NOTIFICATIONS ---

  getNotifications: async (): Promise<NotificationItem[]> => {
    if (USE_REAL_API) {
      return runGasMethod<NotificationItem[]>("apiGetNotifications");
    } else {
      return getMockDB().notifications;
    }
  },

  createNotification: async (notif: Omit<NotificationItem, 'id' | 'createdAt'>): Promise<NotificationItem> => {
    if (USE_REAL_API) {
      return runGasMethod<NotificationItem>("apiCreateNotification", notif);
    } else {
      const db = getMockDB();
      const newNotif: NotificationItem = {
        ...notif,
        id: makeId(),
        createdAt: new Date().toISOString()
      };
      db.notifications.push(newNotif);
      saveMockDB(db);
      return newNotif;
    }
  },

  deleteNotification: async (notifId: string): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteNotification", notifId);
    } else {
      const db = getMockDB();
      const initialLength = db.notifications.length;
      db.notifications = db.notifications.filter(n => n.id !== notifId);
      saveMockDB(db);
      return db.notifications.length < initialLength;
    }
  },

  // --- 📝 EXAMS & ATTENDANCE ---

  getExamSessions: async (): Promise<ExamSession[]> => {
    if (USE_REAL_API) {
      return runGasMethod<ExamSession[]>("apiGetExamSessions");
    } else {
      return getMockDB().examSessions;
    }
  },

  createExamSession: async (session: Omit<ExamSession, 'id' | 'isActive' | 'participantUids' | 'createdAt'>): Promise<ExamSession> => {
    if (USE_REAL_API) {
      return runGasMethod<ExamSession>("apiCreateExamSession", session);
    } else {
      const db = getMockDB();
      const newSession: ExamSession = {
        ...session,
        id: makeId(),
        isActive: true,
        participantUids: [],
        createdAt: new Date().toISOString()
      };
      db.examSessions.push(newSession);
      saveMockDB(db);
      return newSession;
    }
  },

  endExamSession: async (sessionId: string): Promise<ExamSession> => {
    if (USE_REAL_API) {
      return runGasMethod<ExamSession>("apiEndExamSession", sessionId);
    } else {
      const db = getMockDB();
      const idx = db.examSessions.findIndex(s => s.id === sessionId);
      if (idx === -1) throw new Error("Exam session not found");
      db.examSessions[idx].isActive = false;
      saveMockDB(db);
      return db.examSessions[idx];
    }
  },

  joinExamSession: async (sessionId: string, userId: string, studentName: string, studentPhone: string, enteredCode: string): Promise<{ success: boolean; status?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status?: string; error?: string }>("apiJoinExamSession", sessionId, userId, studentName, studentPhone, enteredCode);
    } else {
      const db = getMockDB();
      const sessionIdx = db.examSessions.findIndex(s => s.id === sessionId);
      if (sessionIdx === -1) return { success: false, error: "সেশন পাওয়া যায়নি" };
      
      const session = db.examSessions[sessionIdx];
      if (!session.isActive) return { success: false, error: "সেশন সক্রিয় নয়" };
      if (session.codeEnabled && session.code !== enteredCode) {
        return { success: false, error: "wrong_code" };
      }

      if (!session.participantUids.includes(userId)) {
        session.participantUids.push(userId);
        
        // Append attendance record
        db.attendance.push({
          id: makeId(),
          sessionId,
          studentId: userId,
          studentName,
          studentPhone,
          joinedTime: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        saveMockDB(db);
      }

      return { success: true, status: "ok" };
    }
  },

  submitExamResult: async (result: Omit<ExamResult, 'id' | 'submittedAt'>): Promise<ExamResult> => {
    if (USE_REAL_API) {
      return runGasMethod<ExamResult>("apiSubmitExamResult", result);
    } else {
      const db = getMockDB();
      const newResult: ExamResult = {
        ...result,
        id: makeId(),
        submittedAt: new Date().toISOString()
      };
      db.examResults.push(newResult);
      saveMockDB(db);
      return newResult;
    }
  },

  getExamResults: async (): Promise<ExamResult[]> => {
    if (USE_REAL_API) {
      return runGasMethod<ExamResult[]>("apiGetExamResults");
    } else {
      return getMockDB().examResults;
    }
  },

  deleteExamResult: async (id: string): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteExamResult", id);
    } else {
      const db = getMockDB();
      const initialLength = db.examResults.length;
      db.examResults = db.examResults.filter(r => r.id !== id);
      saveMockDB(db);
      return db.examResults.length < initialLength;
    }
  },

  getAttendance: async (): Promise<AttendanceRecord[]> => {
    if (USE_REAL_API) {
      return runGasMethod<AttendanceRecord[]>("apiGetAttendance");
    } else {
      return getMockDB().attendance;
    }
  },

  getSettings: async (): Promise<any> => {
    if (USE_REAL_API) {
      return runGasMethod<any>("apiGetSettings");
    } else {
      const saved = localStorage.getItem("mc_mock_settings");
      if (saved) return JSON.parse(saved);
      return { adminUpiId: "mondal.saikat185@okaxis", enablePaymentSystem: true };
    }
  },

  saveSettings: async (settings: any): Promise<boolean> => {
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiSaveSettings", settings);
    } else {
      localStorage.setItem("mc_mock_settings", JSON.stringify(settings));
      return true;
    }
  },

  // --- 🔐 PASSCODE & OTP MANAGEMENT ---

  // Logged-in user তার passcode বদলাবে (current passcode verify করে)
  changePasscode: async (userId: string, currentPasscode: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiChangePasscode", userId, currentPasscode, newPasscode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) return { success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
      const stored = db.users[idx].passcode || cleanPhone(db.users[idx].phone || '');
      if (stored !== currentPasscode.trim()) return { success: false, error: "বর্তমান passcode ভুল।" };
      if (newPasscode.trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
      db.users[idx].passcode = newPasscode.trim();
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return { success: true };
    }
  },

  // Forgot Passcode Step 1: ফোন নম্বর দিয়ে OTP পাঠানো
  sendOTP: async (phone: string): Promise<{ success: boolean; maskedEmail?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; maskedEmail?: string; error?: string }>("apiSendOTP", phone);
    } else {
      // Local dev mock — just pretend it worked
      const db = getMockDB();
      const user = db.users.find(u => cleanPhone(u.phone || '') === cleanPhone(phone));
      if (!user) return { success: false, error: "এই ফোন নম্বরটি নিবন্ধিত নয়।" };
      if (!user.email) return { success: false, error: "এই অ্যাকাউন্টে কোনো email নেই।" };
      // Mock: store OTP "123456" in memory for testing
      (user as any).otpCode = "123456";
      (user as any).otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      saveMockDB(db);
      const masked = user.email.slice(0, 2) + '***@' + user.email.split('@')[1];
      console.log("[DEV] Mock OTP sent: 123456 to", user.email);
      return { success: true, maskedEmail: masked };
    }
  },

  // Forgot Passcode Step 2: OTP verify করে নতুন passcode সেট করা
  verifyOTPAndReset: async (phone: string, otp: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiVerifyOTPAndReset", phone, otp, newPasscode);
    } else {
      const db = getMockDB();
      const user = db.users.find(u => cleanPhone(u.phone || '') === cleanPhone(phone));
      if (!user) return { success: false, error: "ব্যাহারকারী পাওয়া যায়নি।" };
      if ((user as any).otpCode !== otp) return { success: false, error: "ভুল OTP! আবার চেষ্টা করুন।" };
      if (newPasscode.trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
      user.passcode = newPasscode.trim();
      (user as any).otpCode = "";
      saveMockDB(db);
      return { success: true };
    }
  },

  // Admin কোনো student-এর passcode force-reset করবে
  adminResetPasscode: async (studentId: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiAdminResetPasscode", studentId, newPasscode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === studentId);
      if (idx === -1) return { success: false, error: "ব্যাহারকারী পাওয়া যায়নি।" };
      db.users[idx].passcode = newPasscode.trim();
      saveMockDB(db);
      return { success: true };
    }
  },

  // --- 📁 GOOGLE DRIVE FILE UPLOAD ---

  uploadFileToDrive: async (base64Data: string, fileName: string, folderId?: string): Promise<{ success: boolean; fileId: string; downloadUrl: string; viewUrl: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; fileId: string; downloadUrl: string; viewUrl: string }>("apiUploadFileToDrive", base64Data, fileName, folderId);
    } else {
      console.log("Mocking file upload for:", fileName);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            fileId: "mock_drive_file_id_" + Math.random().toString(36).substr(2, 9),
            downloadUrl: "https://saikat-tuition.duckdns.org/sample.pdf",
            viewUrl: "https://saikat-tuition.duckdns.org/sample.pdf"
          });
        }, 1500);
      });
    }
  }
};
