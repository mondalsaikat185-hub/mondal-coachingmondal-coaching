import { api, ExamSession } from './api';

// ─── Generate a 5-character access code ─────────────────────────────────────
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Create a new exam session ───────────────────────────────────────────────
export async function createExamSession(
  examId: string,
  batchId: string,
  adminUid: string,
  codeEnabled: boolean = true
): Promise<{ sessionId: string; accessCode: string }> {
  const accessCode = generateAccessCode();
  
  const session = await api.createExamSession({
    examId,
    batchId,
    code: accessCode,
    codeEnabled
  });

  return { sessionId: session.id, accessCode };
}

// ─── End an exam session ─────────────────────────────────────────────────────
export async function endExamSession(sessionId: string): Promise<void> {
  await api.endExamSession(sessionId);
}

// ─── Verify access code and record attendance ────────────────────────────────
// Returns: 'ok' | 'wrong_code' | 'already_participated' | 'session_inactive'
export async function verifyAndJoinSession(
  examId: string,
  batchId: string,
  studentUid: string,
  enteredCode: string,
  studentName?: string,
  studentPhone?: string
): Promise<'ok' | 'wrong_code' | 'already_participated' | 'session_inactive'> {
  
  // Find active session for this exam + batch
  const sessions = await api.getExamSessions();
  const activeSession = sessions.slice().reverse().find(s => s.examId === examId && s.batchId === batchId && s.isActive);

  if (!activeSession) return 'session_inactive';

  if (activeSession.codeEnabled && String(activeSession.code).trim().toUpperCase() !== enteredCode.toUpperCase().trim()) {
    return 'wrong_code';
  }

  if (activeSession.participantUids?.includes(studentUid)) {
    return 'already_participated';
  }

  // Join session & record attendance
  const res = await api.joinExamSession(
    activeSession.id,
    studentUid,
    studentName || "Student",
    studentPhone || "0000000000",
    enteredCode.toUpperCase().trim()
  );

  if (res.success) {
    return 'ok';
  } else if (res.error === 'wrong_code') {
    return 'wrong_code';
  } else {
    return 'session_inactive';
  }
}

// ─── Record attendance ───────────────────────────────────────────────────────
export async function recordAttendance(
  batchId: string,
  studentUid: string,
  sessionId: string,
  studentName?: string,
  studentPhone?: string
): Promise<void> {
  await api.joinExamSession(
    sessionId,
    studentUid,
    studentName || "Student",
    studentPhone || "0000000000",
    ""
  );
}

// ─── Get all attendance days for a batch ──────────────────────────────────
export async function getAllAttendanceForBatch(batchId: string, limitCount: number = 10) {
  try {
    const attendance = await api.getAttendance();
    const sessions = await api.getExamSessions();
    
    // Get all sessions for this batch
    const batchSessionIds = new Set(sessions.filter(s => s.batchId === batchId).map(s => s.id));
    
    // Filter attendance for these sessions
    const batchAttendance = attendance.filter(a => batchSessionIds.has(a.sessionId));
    
    // Group attendance by date
    const groupedByDate: Record<string, string[]> = {};
    batchAttendance.forEach(a => {
      const dateStr = a.joinedTime ? a.joinedTime.split('T')[0] : new Date().toLocaleDateString('en-CA');
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = [];
      }
      if (!groupedByDate[dateStr].includes(a.studentId)) {
        groupedByDate[dateStr].push(a.studentId);
      }
    });

    const result = Object.entries(groupedByDate).map(([date, studentIds]) => ({
      date,
      presentStudentIds: studentIds
    }));

    // Sort descending by date
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result.slice(0, limitCount);
  } catch (err) {
    console.error("Error in getAllAttendanceForBatch", err);
    return [];
  }
}

// ─── Join session without code (when code requirement is off) ───────────────
export async function joinSessionWithoutCode(
  sessionId: string,
  sessionDoc: any,
  studentUid: string,
  batchId: string,
  studentName?: string,
  studentPhone?: string
): Promise<'ok' | 'already_participated'> {
  if (sessionDoc.participantUids?.includes(studentUid)) {
    return 'already_participated';
  }

  await api.joinExamSession(
    sessionId,
    studentUid,
    studentName || "Student",
    studentPhone || "0000000000",
    ""
  );

  return 'ok';
}
