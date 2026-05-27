import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Exam } from '../../pages/Pages';
import { RotateCw, Clock, AlertTriangle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Menu, BookOpen, PenTool, Check } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { api } from '../../lib/api';
import { clearCache } from '../../lib/cache';

export function UnifiedQuizPlayer({ exam, onBack, isPreview = false }: { exam: Exam, onBack: () => void, isPreview?: boolean }) {
  const { user } = useAuth();
  
  // Custom screen orientation lock / landscape simulation
  const [isForcedLandscape, setIsForcedLandscape] = useState(false);
  
  // Screen and exam state machines
  const [screen, setScreen] = useState<'AGREEMENT' | 'LANDING' | 'QUIZ' | 'RESULT'>('AGREEMENT');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [questionStates, setQuestionStates] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lang, setLang] = useState('en');
  const [agreed, setAgreed] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingResult, setCheckingResult] = useState(true);
  const [resultSummary, setResultSummary] = useState<{ score: number, total: number, correct: number, wrong: number, skipped: number } | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [reviewLang, setReviewLang] = useState('en');

  // Load questions, passages and configs
  const quizData = useMemo(() => {
    try {
       return JSON.parse(exam.quizData || '[]');
    } catch {
       return [];
    }
  }, [exam.quizData]);

  const questionsRaw = (quizData !== null && typeof quizData === 'object' && !Array.isArray(quizData)) ? quizData.questions || [] : quizData;
  const questions = Array.isArray(questionsRaw) ? questionsRaw : [];
  const passageRaw = (!Array.isArray(quizData) && quizData !== null) ? quizData.passage : '';
  const passage = typeof passageRaw === 'string' ? passageRaw : '';

  const rootConfig = {
     totalTime: (exam as any).timeLimit ? (exam as any).timeLimit * 60 : undefined,
     marksCorrect: (exam as any).marksCorrect,
     marksWrong: (exam as any).marksWrong > 0 ? -(exam as any).marksWrong : (exam as any).marksWrong
  };

  const parsedConfig = (quizData !== null && typeof quizData === 'object' && !Array.isArray(quizData) && quizData.config) ? quizData.config : {};
  const config = { 
    totalTime: rootConfig.totalTime ?? 1800, 
    marksCorrect: rootConfig.marksCorrect ?? 2, 
    ...parsedConfig,
    marksWrong: parsedConfig.marksWrong !== undefined ? -Math.abs(parsedConfig.marksWrong) : (rootConfig.marksWrong !== undefined ? -Math.abs(rootConfig.marksWrong) : -0.5)
  };

  // Initialize and check attempts
  useEffect(() => {
    if (!user || isPreview) {
       setCheckingResult(false);
       return;
    }
    const checkPrevious = async () => {
       if ((exam as any).allowMultipleAttempts) {
          setCheckingResult(false);
          return;
       }
       try {
          const results = await api.getExamResults();
          const alreadySubmitted = results.some(r => r.studentId === user.uid && r.examId === exam.id);
          if (alreadySubmitted) {
             setAlreadySubmitted(true);
          }
       } catch (err) {
          console.warn('Could not check previous result:', err);
       } finally {
          setCheckingResult(false);
       }
    };
    checkPrevious();
  }, [user?.uid, exam.id, isPreview]);

  // Restore states from local storage for auto-resume
  useEffect(() => {
     if (questions.length === 0 || checkingResult) return;
     
     const initialStates = Array(questions.length).fill('unvisited');
     
     if (isPreview) {
        setQuestionStates(initialStates);
        return;
     }

     const endTime = localStorage.getItem(`quiz_endtime_${exam.id}`);
     if (endTime) {
        const remaining = Math.max(0, Math.floor((parseInt(endTime) - Date.now()) / 1000));
        if (remaining > 0) {
           setAgreed(true);
           setScreen('QUIZ');
           
           // Restore answers
           const savedAnswers = localStorage.getItem(`quiz_answers_${exam.id}`);
           if (savedAnswers) {
             try { setUserAnswers(JSON.parse(savedAnswers)); } catch (e) {}
           }
           
           // Restore states
           const savedStates = localStorage.getItem(`quiz_states_${exam.id}`);
           if (savedStates) {
             try { setQuestionStates(JSON.parse(savedStates)); } catch (e) { setQuestionStates(initialStates); }
           } else {
             setQuestionStates(initialStates);
           }

           // Restore active question index
           const savedIdx = localStorage.getItem(`quiz_currentidx_${exam.id}`);
           if (savedIdx) {
             try { setCurrentIdx(parseInt(savedIdx)); } catch (e) {}
           }
        } else {
           // Auto-submit the saved answers!
           if (!alreadySubmitted) {
              const savedAnswers = localStorage.getItem(`quiz_answers_${exam.id}`);
              let parsedAnswers = {};
              if (savedAnswers) {
                try { parsedAnswers = JSON.parse(savedAnswers); } catch (e) {}
              }
              handleComplete(parsedAnswers);
           } else {
              clearQuizStorage();
              setQuestionStates(initialStates);
           }
        }
     } else {
        setQuestionStates(initialStates);
     }
  }, [exam.id, isPreview, questions.length, checkingResult, alreadySubmitted]);

  const clearQuizStorage = () => {
    localStorage.removeItem(`quiz_endtime_${exam.id}`);
    localStorage.removeItem(`quiz_answers_${exam.id}`);
    localStorage.removeItem(`quiz_states_${exam.id}`);
    localStorage.removeItem(`quiz_currentidx_${exam.id}`);
  };

  const userAnswersRef = useRef(userAnswers);
  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Anti-cheat listeners
  useEffect(() => {
    if (screen !== 'QUIZ') return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Copying is disabled during an active exam.");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert("Right-click is disabled during an active exam.");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
         alert("Warning: Tab switching/leaving the exam window was detected. This action will be reported.");
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screen]);

  // Countdown timer effect
  useEffect(() => {
    if (screen === 'QUIZ') {
      const endTimeStr = localStorage.getItem(`quiz_endtime_${exam.id}`);
      if (!endTimeStr) return;
      
      const updateTimer = () => {
         const remaining = Math.max(0, Math.floor((parseInt(endTimeStr) - Date.now()) / 1000));
         setTimeLeft(remaining);
         if (remaining <= 0) {
            handleComplete(userAnswersRef.current);
         }
      };
      
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [screen, exam.id]);

  // State synchronization helper
  const saveStateToLocalStorage = (answers: Record<number, number>, states: string[], idx: number) => {
    if (isPreview) return;
    localStorage.setItem(`quiz_answers_${exam.id}`, JSON.stringify(answers));
    localStorage.setItem(`quiz_states_${exam.id}`, JSON.stringify(states));
    localStorage.setItem(`quiz_currentidx_${exam.id}`, idx.toString());
  };

  const startQuiz = () => {
    setScreen('QUIZ');
    
    let endTime = localStorage.getItem(`quiz_endtime_${exam.id}`);
    if (!endTime) {
       endTime = (Date.now() + config.totalTime * 1000).toString();
       localStorage.setItem(`quiz_endtime_${exam.id}`, endTime);
    }
    
    const initialStates = Array(questions.length).fill('unvisited');
    
    setUserAnswers({});
    setQuestionStates(initialStates);
    setCurrentIdx(0);
    saveStateToLocalStorage({}, initialStates, 0);
  };

  const transitionState = (fromIdx: number, action: 'saveAndNext' | 'nextAndReview' | 'navigate') => {
    const chosen = userAnswers[fromIdx];
    let updatedStates = [...questionStates];

    if (action === 'saveAndNext') {
      if (chosen !== undefined) {
        updatedStates[fromIdx] = 'saved';
      } else {
        updatedStates[fromIdx] = 'skipped';
      }
    } else if (action === 'nextAndReview') {
      if (chosen !== undefined) {
        updatedStates[fromIdx] = 'review_answered';
      } else {
        updatedStates[fromIdx] = 'review_unanswered';
      }
    } else if (action === 'navigate') {
      const currentState = updatedStates[fromIdx] || 'unvisited';
      if (currentState !== 'review_answered' && currentState !== 'review_unanswered') {
        if (chosen !== undefined) {
          updatedStates[fromIdx] = 'saved';
        } else {
          updatedStates[fromIdx] = 'skipped';
        }
      }
    }

    setQuestionStates(updatedStates);
    saveStateToLocalStorage(userAnswers, updatedStates, currentIdx);
    return updatedStates;
  };

  const jumpToQuestion = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= questions.length) return;
    
    // 1. Transition state for the old question index
    const updatedStates = transitionState(currentIdx, 'navigate');
    
    setQuestionStates(updatedStates);
    setCurrentIdx(newIdx);
    saveStateToLocalStorage(userAnswers, updatedStates, newIdx);
  };

  const saveAndNext = () => {
    const updatedStates = transitionState(currentIdx, 'saveAndNext');
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setQuestionStates(updatedStates);
      setCurrentIdx(nextIdx);
      saveStateToLocalStorage(userAnswers, updatedStates, nextIdx);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const nextAndReview = () => {
    const updatedStates = transitionState(currentIdx, 'nextAndReview');
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setQuestionStates(updatedStates);
      setCurrentIdx(nextIdx);
      saveStateToLocalStorage(userAnswers, updatedStates, nextIdx);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      jumpToQuestion(currentIdx - 1);
    }
  };

  const clearResponse = () => {
    const nextAnswers = { ...userAnswers };
    delete nextAnswers[currentIdx];
    
    let nextStates = [...questionStates];
    const currentState = nextStates[currentIdx] || 'unvisited';
    if (currentState === 'review_answered') {
      nextStates[currentIdx] = 'review_unanswered';
    } else if (currentState === 'saved') {
      nextStates[currentIdx] = 'skipped';
    }
    
    setUserAnswers(nextAnswers);
    setQuestionStates(nextStates);
    saveStateToLocalStorage(nextAnswers, nextStates, currentIdx);
  };

  // Click once to select, click second time to deselect
  const selectOption = (optIdx: number) => {
    const nextAnswers = { ...userAnswers };
    let nextStates = [...questionStates];
    
    if (nextAnswers[currentIdx] === optIdx) {
      delete nextAnswers[currentIdx];
      const currentState = nextStates[currentIdx] || 'unvisited';
      if (currentState === 'review_answered') {
        nextStates[currentIdx] = 'review_unanswered';
      } else if (currentState === 'saved') {
        nextStates[currentIdx] = 'skipped';
      }
    } else {
      nextAnswers[currentIdx] = optIdx;
      const currentState = nextStates[currentIdx] || 'unvisited';
      if (currentState === 'review_unanswered') {
        nextStates[currentIdx] = 'review_answered';
      } else if (currentState !== 'review_answered') {
        nextStates[currentIdx] = 'saved';
      }
    }
    setUserAnswers(nextAnswers);
    setQuestionStates(nextStates);
    saveStateToLocalStorage(nextAnswers, nextStates, currentIdx);
  };

  const handleComplete = async (answers: Record<number, number>) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setScreen('RESULT');
    clearQuizStorage();
    
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    
    questions.forEach((q: any, i: number) => {
       if (answers[i] !== undefined) {
         if (answers[i] === q.correctIndex) {
            score += config.marksCorrect;
            correct++;
         } else {
            score += config.marksWrong;
            wrong++;
         }
       } else {
         skipped++;
       }
    });

    setResultSummary({
       score,
       total: questions.length * config.marksCorrect,
       correct,
       wrong,
       skipped
    });

    if (user && !isPreview) {
      try {
        const studentName = (user as any).fullName || user.displayName || user.email || 'Unknown Student';
        const studentPhone = user.phone || '0000000000';
        
        await api.submitExamResult({
           examId: exam.id,
           studentId: user.uid,
           studentName,
           studentPhone,
           score,
           totalQuestions: questions.length,
           correctAnswers: correct,
           wrongAnswers: wrong,
           skippedAnswers: skipped,
           answersMap: JSON.stringify(answers),
           answersJSON: JSON.stringify(answers),
           submittedAt: new Date().toISOString()
        } as any);
        clearCache(`result_check_${user.uid}_${exam.id}`);
      } catch (saveErr) {
        console.error('Result save failed:', saveErr);
      }
    }
  };

  const isBilingual = exam.examType?.includes('Bilingual') || exam.examType?.includes('Reasoning') || exam.examType?.includes('Math') || exam.examType?.includes('GK');

  // Swipe and Drag gesture handling
  let touchStartX = 0;
  let touchStartY = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 75 && Math.abs(diffY) < 45) {
      if (diffX < 0) {
        // swipe left -> Next
        if (currentIdx < questions.length - 1) {
          jumpToQuestion(currentIdx + 1);
        }
      } else {
        // swipe right -> Previous
        if (currentIdx > 0) {
          jumpToQuestion(currentIdx - 1);
        }
      }
    } else if (touchStartX > window.innerWidth - 60 && diffX < -60 && Math.abs(diffY) < 55) {
      setMobileDrawerOpen(true);
    }
  };

  const activeQuestion = questions[currentIdx];
  const qText = String((lang === 'bn' && activeQuestion?.question_bn) ? activeQuestion.question_bn : (activeQuestion?.question_en || activeQuestion?.question || 'Question ?'));
  const optsRaw = (lang === 'bn' && activeQuestion?.options_bn && activeQuestion.options_bn.length) ? activeQuestion.options_bn : (activeQuestion?.options_en || activeQuestion?.options || []);
  const opts = Array.isArray(optsRaw) ? optsRaw : [];

  // Submit Stats Calculators
  const submitStats = useMemo(() => {
    let answered = 0;
    let review = 0;
    let unvisited = 0;
    
    questions.forEach((_, idx) => {
      const state = questionStates[idx] || 'unvisited';
      if (state === 'saved') {
        answered++;
      } else if (state === 'review_answered') {
        answered++;
        review++;
      } else if (state === 'review_unanswered') {
        review++;
      } else if (state === 'unvisited') {
        unvisited++;
      }
    });
    
    return { answered, review, unvisited };
  }, [questionStates, questions]);

  // Loading Screen
  if (checkingResult) {
     return (
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh] gap-4 bg-[#121214] text-zinc-100">
          <div className="w-12 h-12 border-4 border-zinc-750 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="font-bold text-zinc-400">
            Checking your credentials... / যাচাই করা হচ্ছে
          </p>
        </div>
     );
  }

  // Already Submitted Screen
  if (alreadySubmitted) {
     return (
       <div className="flex items-center justify-center p-6 min-h-[80vh] bg-[#121214] text-zinc-100">
         <div className="max-w-md w-full bg-[#1c1c1f] border-4 border-zinc-900 dark:border-zinc-100 p-8 rounded-2xl text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(234,179,8,0.2)]">
           <div className="mx-auto w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center text-2xl font-bold">⚠️</div>
           <h2 className="serif text-2xl font-black uppercase text-red-500">Exam Already Submitted</h2>
           <p className="font-bold text-zinc-400 text-sm leading-relaxed">
             আপনি ইতিমধ্যে এই পরীক্ষাটি সম্পন্ন করেছেন। আপনার প্রাপ্ত ফলাফল শিক্ষক প্যানেলে সেভ করা রয়েছে।
           </p>
           <button onClick={onBack} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs uppercase tracking-widest font-bold rounded-xl transition-all border-none cursor-pointer">
             Return to Library
           </button>
         </div>
       </div>
     );
  }

  // Empty Quiz Guard
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[80vh] bg-[#121214] text-zinc-100">
        <div className="max-w-md w-full bg-[#1c1c1f] border-4 border-zinc-900 dark:border-zinc-100 p-8 rounded-2xl text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(234,179,8,0.2)]">
          <div className="mx-auto w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center text-2xl font-bold">⚠️</div>
          <h2 className="serif text-2xl font-black uppercase text-white">No Questions Available</h2>
          <p className="font-bold text-zinc-400 text-sm leading-relaxed">
            এই পরীক্ষায় এখনো কোনো প্রশ্ন যোগ করা হয়নি। দয়া করে শিক্ষকের সাথে যোগাযোগ করুন।
          </p>
          <button onClick={onBack} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs uppercase tracking-widest font-bold rounded-xl transition-all border-none cursor-pointer">
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 1: Guidelines and Anti-Cheat Agreement (Neobrutalist styling)
  if (screen === 'AGREEMENT') {
     return (
        <div className="flex items-center justify-center p-6 min-h-screen bg-[#121214] text-zinc-100">
           <div className="max-w-xl w-full bg-[#1c1c1f] border-4 border-zinc-900 dark:border-zinc-100 p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(234,179,8,0.2)] space-y-6">
              <div className="space-y-2 border-b border-zinc-800 pb-4">
                 <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-red-500">Security Gate</span>
                 <h2 className="serif text-2xl font-black uppercase text-red-500 flex items-center gap-2">
                   ⚠️ Guidelines & Anti-Cheat Agreement
                 </h2>
              </div>
              
              <ul className="list-disc pl-5 space-y-3 font-medium text-xs text-zinc-400 leading-relaxed">
                 <li>Do not switch tabs, minimize the browser, or exit full screen. Doing so will flag your attempt and report it immediately.</li>
                 <li>Text copying, selecting, and right-click context menus are completely disabled.</li>
                 <li>A secure, real-time metadata watermark will display your credentials on screen throughout the session.</li>
                 <li>Make sure your internet connection is stable. The page will auto-save your responses.</li>
              </ul>
              
              <label className="flex items-start gap-3 bg-red-955/10 p-4 border border-red-900/50 rounded-xl cursor-pointer select-none">
                 <input 
                   type="checkbox" 
                   checked={agreed} 
                   onChange={e => setAgreed(e.target.checked)} 
                   className="w-5 h-5 rounded border-zinc-850 bg-zinc-900 accent-red-600 text-red-600 mt-0.5 shrink-0" 
                 />
                 <span className="text-xs font-bold text-red-400 leading-normal">
                   আমি নিয়মাবলী এবং নিরাপত্তা নীতিগুলো পড়েছি এবং কোনো প্রকার অসাধু উপায় অবলম্বন করলে তার ফলাфলের দায়ভার গ্রহণ করলাম।
                 </span>
              </label>
              
              <div className="flex gap-4 pt-2">
                 <button 
                   disabled={!agreed} 
                   onClick={() => setScreen('LANDING')} 
                   className="flex-1 py-3.5 bg-red-650 hover:bg-red-700 text-white text-[11px] uppercase tracking-widest font-bold rounded-xl transition-all border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                 >
                    Acknowledge & Next
                 </button>
                 <button 
                   onClick={onBack} 
                   className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
     );
  }

  // SCREEN 2: Landing Page (Neobrutalist styling)
  if (screen === 'LANDING') {
     return (
       <div className="flex items-center justify-center p-6 min-h-screen bg-[#121214] text-zinc-100">
         <div className="max-w-md w-full bg-[#1c1c1f] border-4 border-zinc-900 dark:border-zinc-100 p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(234,179,8,0.2)] space-y-6 text-center">
           <div className="space-y-2">
             <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#eab308]">Assessment Entry</span>
             <h1 className="serif text-3xl font-medium tracking-tight text-white">{exam.title}</h1>
             <p className="text-xs text-zinc-400 leading-relaxed">{exam.examType || 'Regular Evaluation'}</p>
           </div>

           <div className="border-t border-b border-zinc-800/80 py-4 text-left grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-zinc-400">
             <div>⏳ Time limit: <span className="font-bold text-zinc-200">{Math.floor(config.totalTime / 60)}m {config.totalTime % 60}s</span></div>
             <div>📝 Total Qs: <span className="font-bold text-zinc-200">{questions.length}</span></div>
             <div>✅ Right answer: <span className="font-bold text-emerald-400">+{config.marksCorrect} marks</span></div>
             <div>❌ Penalty: <span className="font-bold text-red-400">{config.marksWrong} marks</span></div>
           </div>

           <div className="text-left bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl space-y-1">
             <span className="block text-[9px] uppercase tracking-widest text-[#eab308] font-bold">Student Log</span>
             <span className="block text-sm font-semibold text-white">{(user as any)?.fullName || user?.displayName || user?.email || 'Student Student'}</span>
             <span className="block text-[10px] text-zinc-400">Phone: {user?.phone || 'N/A'}</span>
           </div>

           <div className="flex gap-4">
             <button 
               onClick={startQuiz} 
               className="flex-1 py-3.5 bg-yellow-500 hover:bg-yellow-650 text-neutral-950 text-[11px] uppercase tracking-widest font-bold rounded-xl transition-all shadow-md border-none cursor-pointer"
             >
               Begin Assessment
             </button>
             <button 
               onClick={onBack} 
               className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer"
             >
               Back
             </button>
           </div>
         </div>
       </div>
     );
  }

  // SCREEN 4: Results & Explanations review Dashboard (Placed ABOVE the Active Quiz return to fix score display)
  if (screen === 'RESULT') {
     return (
        <div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col items-center justify-start p-6 max-w-3xl mx-auto w-full py-12">
           <style dangerouslySetInnerHTML={{__html: `
              .serif { font-family: 'Georgia', serif; }
           `}} />

           <div className="w-full bg-[#1c1c1f] border-4 border-zinc-900 dark:border-zinc-100 p-8 rounded-2xl text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(234,179,8,0.2)] mb-8 relative overflow-hidden">
              <div className="space-y-1.5 relative z-10">
                 <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#eab308]">Performance Summary</span>
                 <h1 className="serif text-3xl font-black tracking-tight text-white uppercase">Assessment Completed</h1>
                 <p className="text-xs text-zinc-400 font-semibold">
                    Record generated for {(user as any)?.fullName || user?.displayName || 'Student'} on {new Date().toLocaleDateString('en-IN')}
                 </p>
              </div>

              {/* Performative metrics grid */}
              {resultSummary && (
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 relative z-10">
                    <div className="text-center p-2">
                       <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Final Score</span>
                       <span className="serif text-2xl font-black block mt-1 text-white">
                          {resultSummary.score.toFixed(1)} <span className="text-sm font-bold text-zinc-500">/ {resultSummary.total.toFixed(1)}</span>
                       </span>
                    </div>
                    <div className="text-center p-2 border-l border-zinc-800">
                       <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Accuracy</span>
                       <span className="serif text-2xl font-black text-emerald-400 block mt-1">
                          {questions.length > 0 ? Math.round((resultSummary.correct / questions.length) * 100) : 0}%
                       </span>
                    </div>
                    <div className="text-center p-2 border-l border-zinc-800">
                       <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Right/Wrong/Skip</span>
                       <span className="font-mono text-xs block mt-2 text-zinc-350">
                          {resultSummary.correct} C / {resultSummary.wrong} W / {resultSummary.skipped} S
                       </span>
                    </div>
                    <div className="text-center p-2 border-l border-zinc-800">
                       <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Time Spent</span>
                       <span className="serif text-2xl font-black text-yellow-500 block mt-1">
                          {Math.floor((config.totalTime - timeLeft) / 60)}m {(config.totalTime - timeLeft) % 60}s
                       </span>
                    </div>
                 </div>
              )}

              <button 
                onClick={onBack} 
                className="relative z-10 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all cursor-pointer border-none shadow-md"
              >
                 Return to Dashboard
              </button>
           </div>

           {/* Review of detailed question by question solutions */}
           <div className="w-full space-y-4 text-left">
              <h3 className="serif text-xl italic text-white border-b border-zinc-800 pb-2 flex items-center justify-between">
                 <span>Detailed Explanations & Review</span>
                 <span className="text-[10px] uppercase font-sans tracking-widest font-bold text-zinc-500">Annotated Analysis</span>
              </h3>

              {/* Review Language Toggler */}
              {isBilingual && (
                 <div className="flex justify-end gap-2 items-center my-3 select-none bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/40">
                    <span className="text-xs text-zinc-400 font-medium font-sans">Review Language:</span>
                    <button 
                      onClick={() => setReviewLang('en')} 
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded cursor-pointer border-none transition-all ${
                         reviewLang === 'en' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => setReviewLang('bn')} 
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded cursor-pointer border-none transition-all ${
                         reviewLang === 'bn' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      বাংলা
                    </button>
                 </div>
              )}

              <div className="space-y-6 w-full relative z-10">
                 {questions.map((q: any, idx: number) => {
                    const chosenIdx = userAnswers[idx];
                    const correctIdx = q.correctIndex;
                    const isCorrect = chosenIdx === correctIdx;
                    const isSkipped = chosenIdx === undefined;

                    let statusBadge = "";
                    if (isCorrect) {
                      statusBadge = "✅ Correct";
                    } else if (isSkipped) {
                      statusBadge = "◽ Skipped";
                    } else {
                      statusBadge = "❌ Incorrect";
                    }

                    const reviewQText = String((reviewLang === 'bn' && q?.question_bn) ? q.question_bn : (q?.question_en || q?.question || 'Question ?'));
                    const reviewOptsRaw = (reviewLang === 'bn' && q?.options_bn && q.options_bn.length) ? q.options_bn : (q?.options_en || q?.options || []);
                    const reviewOpts = Array.isArray(reviewOptsRaw) ? reviewOptsRaw : [];
                    const reviewExpl = String((reviewLang === 'bn' && q?.explanation_bn) ? q.explanation_bn : (q?.explanation_en || q?.explanation || ''));

                    return (
                       <div key={`review-${idx}`} className="bg-[#1c1c1f] border border-zinc-800 rounded-2xl p-6 shadow-md space-y-4 text-left">
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                             <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                                Question {idx + 1}
                             </span>
                             <span className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                                isCorrect 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : isSkipped 
                                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700/30' 
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                             }`}>
                                {statusBadge}
                             </span>
                          </div>

                          <p className="text-sm text-zinc-200 font-semibold leading-relaxed whitespace-pre-wrap">
                             {reviewQText}
                          </p>

                          {q?.sentences && typeof q.sentences === 'object' && (
                             <div className="space-y-1 bg-[#121214] px-3 py-2 rounded-lg border border-zinc-850 text-xs text-zinc-400 font-mono mb-2">
                                {Object.entries(q.sentences).map(([k, val]) => (
                                   <p key={`review-s-${idx}-${k}`}>
                                      <b className="text-yellow-650">{k}:</b> {String(val)}
                                   </p>
                                ))}
                             </div>
                          )}

                          <div className="grid grid-cols-1 gap-2.5 pt-1">
                             {reviewOpts.map((optText: string, optIdx: number) => {
                                let cardStyle = "border rounded-xl px-4 py-2.5 text-xs transition-colors ";
                                let pillText = "";

                                if (optIdx === correctIdx) {
                                  cardStyle += "bg-emerald-500/10 border-emerald-500 text-emerald-300 font-medium";
                                  pillText = reviewLang === 'bn' ? "সঠিক উত্তর" : "Correct Answer";
                                } else if (optIdx === chosenIdx) {
                                  cardStyle += "bg-red-500/10 border-red-500 text-red-300 font-medium";
                                  pillText = reviewLang === 'bn' ? "আপনার উত্তরটি ভুল" : "Chosen Incorrect";
                                } else {
                                  cardStyle += "bg-[#121214]/70 border-zinc-800/80 text-zinc-400";
                                }

                                return (
                                   <div key={`review-opt-${idx}-${optIdx}`} className={cardStyle}>
                                      <div className="flex justify-between items-center">
                                         <span>
                                            <b className="mr-2">{String.fromCharCode(65 + optIdx)}.</b> 
                                            {optText}
                                         </span>
                                         {pillText && (
                                            <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shadow-sm ${
                                               optIdx === correctIdx ? 'bg-emerald-500 text-zinc-950' : 'bg-red-600 text-white font-bold'
                                            }`}>
                                               {pillText}
                                            </span>
                                         )}
                                      </div>
                                   </div>
                                )
                             })}
                          </div>

                          {reviewExpl && reviewExpl.trim() && (
                             <div className="bg-yellow-600/10 border-l-2 border-yellow-600 p-4 rounded-r-xl mt-3 text-xs text-zinc-300 leading-relaxed text-justify">
                                <h4 className="font-bold uppercase text-[8px] tracking-wider text-yellow-500 mb-1">
                                   Explanation / ব্যাখ্যা
                                </h4>
                                {reviewExpl}
                             </div>
                          )}
                       </div>
                    )
                 })}
              </div>
           </div>
        </div>
     );
  }

  // SCREEN 3: Active Quiz Area (SSC-Style) - Returned as default
  return (
    <div className={`flex flex-col min-h-screen bg-[#121214] text-zinc-100 font-sans select-none overflow-x-hidden ${isForcedLandscape ? 'force-landscape-active' : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
       <style dangerouslySetInnerHTML={{__html: `
          .serif { font-family: 'Georgia', serif; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 99px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
       `}} />

       {/* Security Watermark */}
       <div className="pointer-events-none fixed flex flex-col items-center justify-center opacity-[0.02] dark:opacity-[0.03] w-full h-full z-0 transform -rotate-45" style={{ top: 0, left: 0 }}>
          {Array.from({ length: 15 }).map((_, i) => (
             <div key={i} className="text-4xl font-black whitespace-nowrap mb-12 select-none">
                {user?.fullName || user?.displayName} • {user?.email} • {user?.phone}
             </div>
          ))}
       </div>

       {/* Header */}
       <header className="bg-[#1c1c1f] border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-lg relative">
          <div>
             <h2 className="serif text-lg font-bold text-white tracking-tight">{exam.title}</h2>
             <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                Student: {(user as any)?.fullName || user?.displayName || 'Attendee'} ({lang.toUpperCase()})
             </span>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Landscape simulation button */}
             <button 
               type="button"
               onClick={() => setIsForcedLandscape(!isForcedLandscape)}
               className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-650 text-zinc-950 font-bold uppercase rounded-lg shadow transition-all border-none cursor-pointer"
               title="Rotate Screen / স্ক্রিন ঘোরান"
             >
               <RotateCw className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Rotate Screen</span>
             </button>

             {/* Language Toggler */}
             {isBilingual && (
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                   <button 
                     onClick={() => setLang('en')} 
                     className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-colors border-none cursor-pointer ${lang === 'en' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-505'}`}
                   >
                     EN
                   </button>
                   <button 
                     onClick={() => setLang('bn')} 
                     className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-colors border-none cursor-pointer ${lang === 'bn' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-505'}`}
                   >
                     বাংলা
                   </button>
                </div>
             )}

             {/* Dynamic Timer Box */}
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-900/50 text-red-400 font-mono text-xs font-bold leading-none animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>
                  {Math.floor(timeLeft / 3600) > 0 
                     ? `${Math.floor(timeLeft / 3600)}:${Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` 
                     : `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
                  }
                </span>
             </div>
          </div>
       </header>

       {/* Grid Layout (Passage, Questions, Desktop Sidebar Palette) */}
       <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full relative z-10">
          {/* Optional Passage container */}
          {passage && (
             <div className="lg:col-span-4 bg-[#1c1c1f] border border-zinc-800/80 p-6 rounded-2xl shadow-lg overflow-y-auto max-h-[250px] lg:max-h-[calc(100vh-160px)]">
                <span className="text-[9px] uppercase tracking-widest text-[#eab308] font-black block mb-2">Comprehension Text</span>
                <p className="serif text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap text-justify">{passage}</p>
             </div>
          )}

          {/* Active Question Render panel */}
          <div className={`${passage ? 'lg:col-span-5' : 'lg:col-span-9'} space-y-6 flex flex-col justify-between`}>
             <div className="bg-[#1c1c1f] border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                   <span className="text-[10px] uppercase font-bold tracking-widest text-[#eab308]">
                      Question {currentIdx + 1} of {questions.length}
                   </span>
                   <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800 rounded tracking-wide">
                      Multi-Choice (MCQ)
                   </span>
                </div>

                {/* Cloze Test blanket helper */}
                {((exam.examType as any) === 'Cloze' || exam.examType === 'Cloze Test') && (activeQuestion as any).blank_num && (
                   <div className="text-xs text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg font-bold">
                     🎯 Select correct option to fill blank position <b>{(activeQuestion as any).blank_num}</b> in the left-hand passage.
                   </div>
                )}

                {/* Question statement */}
                <p className="text-base sm:text-lg text-white font-medium leading-relaxed whitespace-pre-wrap text-left">
                   {qText}
                </p>

                {/* Parajumble sentences grid */}
                {activeQuestion?.sentences && typeof activeQuestion.sentences === 'object' && (
                   <div className="space-y-2 bg-[#121214] p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-mono">
                      {Object.entries(activeQuestion.sentences).map(([key, value]) => (
                         <div key={`pj-${currentIdx}-${key}`} className="flex items-start gap-1.5 text-left">
                            <b className="text-yellow-650 mr-1 shrink-0">{key}:</b> 
                            <span>{String(value)}</span>
                         </div>
                      ))}
                   </div>
                )}

                {/* Option selection card lists */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                   {opts.map((opt: string, optIdx: number) => {
                      const isSelected = userAnswers[currentIdx] === optIdx;
                      return (
                         <div 
                           key={`opt-${currentIdx}-${optIdx}`}
                           onClick={() => selectOption(optIdx)}
                           className={`border rounded-xl px-4 py-3 text-sm font-medium cursor-pointer transition-all flex items-center justify-between select-none ${
                             isSelected 
                               ? 'bg-yellow-500/10 border-yellow-500 text-white font-semibold shadow-[0_0_10px_rgba(234,179,8,0.15)]' 
                               : 'bg-[#18181b]/60 hover:bg-[#27272a] border-zinc-800/80 text-zinc-400'
                           }`}
                         >
                            <span className="text-left">
                               <b className={`mr-2 ${isSelected ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                  {String.fromCharCode(65 + optIdx)}.
                               </b> 
                               {opt}
                            </span>
                            {isSelected && (
                               <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">
                                  Selected
                               </span>
                            )}
                         </div>
                      )
                   })}
                </div>
             </div>

             {/* Bottom Navigation exam buttons */}
             <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4">
                <div className="flex gap-2">
                   <button 
                     onClick={prevQuestion} 
                     disabled={currentIdx === 0}
                     className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl transition-all border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                      Previous
                   </button>
                   <button 
                     onClick={clearResponse} 
                     disabled={userAnswers[currentIdx] === undefined}
                     className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                      Clear
                   </button>
                </div>

                <div className="flex flex-wrap gap-2">
                   <button 
                     onClick={nextAndReview} 
                     className="px-4 py-2.5 bg-sky-950/40 border border-sky-900/50 hover:bg-sky-900/40 text-sky-400 text-xs uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer"
                   >
                      Review & Next
                   </button>
                   <button 
                     onClick={saveAndNext} 
                     className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-650 text-zinc-950 text-xs uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer border-none shadow-md"
                   >
                      {currentIdx === questions.length - 1 ? 'Submit' : 'Save & Next'}
                   </button>
                </div>
             </div>
          </div>

          {/* Desktop Palette Panel column */}
          <div className="hidden lg:block lg:col-span-3 bg-[#1c1c1f] border border-zinc-800 p-5 rounded-2xl shadow-lg h-max max-h-[calc(100vh-160px)] overflow-y-auto sticky top-24 space-y-6">
             <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 border-b border-zinc-800/80 pb-2">
                🧭 Question Palette
             </h3>
             <div className="grid grid-cols-4 xl:grid-cols-5 gap-2.5 pb-4 border-b border-zinc-800/80">
                {questions.map((_, idx) => {
                   const isCurrent = idx === currentIdx;
                   const state = questionStates[idx] || 'unvisited';
                   
                   let stateClasses = "bg-[#111113] text-zinc-505 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200";
                   if (state === 'saved') {
                     stateClasses = "bg-emerald-600 text-white border-emerald-700 font-bold";
                   } else if (state === 'skipped') {
                     stateClasses = "bg-red-850/80 text-white border-red-900 font-bold";
                   } else if (state === 'review_unanswered') {
                     stateClasses = "bg-orange-600 text-white border-orange-700 font-bold";
                   } else if (state === 'review_answered') {
                     stateClasses = "bg-blue-600 text-white border-blue-700 font-bold";
                   }

                   const ringClass = isCurrent ? "ring-2 ring-offset-2 ring-offset-[#1c1c1f] ring-yellow-500 text-white scale-105 font-black" : "";

                   return (
                      <button 
                        key={`palette-btn-${idx}`}
                        onClick={() => jumpToQuestion(idx)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer border-none ${stateClasses} ${ringClass}`}
                      >
                         {idx + 1}
                      </button>
                   )
                })}
             </div>

             {/* Legends definition list */}
             <div className="space-y-2 text-[10px] text-zinc-400 pb-2">
                <span className="block font-bold uppercase tracking-wider text-zinc-505">Legend Info</span>
                <div className="grid grid-cols-2 gap-2">
                   <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600"></span><span>Saved</span></div>
                   <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-850/80"></span><span>Skipped</span></div>
                   <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-600"></span><span>Review</span></div>
                   <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span><span>Ans & Rev</span></div>
                   <div className="flex items-center gap-1.5 col-span-2"><span className="w-3 h-3 rounded-full bg-[#111113] border border-zinc-800"></span><span>Unvisited</span></div>
                </div>
             </div>

             <div className="pt-4 border-t border-zinc-800">
                <button 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full py-2.5 bg-red-800 hover:bg-red-900 border-none text-white text-xs uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer text-center shadow-md"
                >
                   Submit Exam
                </button>
             </div>
          </div>
       </main>

       {/* Mobile Drag Indicator Handle */}
       <button 
         onClick={() => setMobileDrawerOpen(true)}
         className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 bg-yellow-500 text-zinc-950 py-4 px-1.5 rounded-l-xl shadow-lg border-none flex flex-col items-center gap-1 z-30 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
       >
         <span className="text-[8px] uppercase tracking-widest font-black [writing-mode:vertical-lr] text-center rotate-180 mb-0.5 select-none">palette</span>
         <span className="text-[10px]">◀</span>
       </button>

       {/* Mobile Drawer Slide sheet panel */}
       <div 
         className={`fixed inset-y-0 right-0 z-50 w-72 bg-[#1c1c1f] shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-zinc-800 flex flex-col lg:hidden text-zinc-100 ${
            mobileDrawerOpen ? 'translate-x-0' : 'translate-x-full'
         }`}
       >
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
             <h3 className="text-[10px] uppercase tracking-widest font-black text-zinc-400">🧭 Questions list</h3>
             <button 
               onClick={() => setMobileDrawerOpen(false)}
               className="p-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-none font-bold text-xs rounded-lg cursor-pointer"
             >
                ✕ Close
             </button>
          </div>
          <div className="flex-1 p-5 grid grid-cols-5 gap-2.5 content-start overflow-y-auto bg-[#121214]">
             {questions.map((_, idx) => {
                const isCurrent = idx === currentIdx;
                const state = questionStates[idx] || 'unvisited';
                
                let stateClasses = "bg-[#111113] text-zinc-505 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200";
                if (state === 'saved') {
                  stateClasses = "bg-emerald-600 text-white border-emerald-700 font-bold";
                } else if (state === 'skipped') {
                  stateClasses = "bg-red-850/80 text-white border-red-900 font-bold";
                } else if (state === 'review_unanswered') {
                  stateClasses = "bg-orange-600 text-white border-orange-700 font-bold";
                } else if (state === 'review_answered') {
                  stateClasses = "bg-blue-600 text-white border-blue-700 font-bold";
                }

                const ringClass = isCurrent ? "ring-2 ring-offset-2 ring-offset-[#1c1c1f] ring-yellow-500 text-white scale-105 font-black" : "";

                return (
                   <button 
                     key={`mb-palette-${idx}`}
                     onClick={() => {
                        jumpToQuestion(idx);
                        setMobileDrawerOpen(false);
                     }}
                     className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer border-none ${stateClasses} ${ringClass}`}
                   >
                      {idx + 1}
                   </button>
                )
             })}
          </div>
          <div className="p-4 bg-zinc-950 border-t border-zinc-850 text-[10px] text-zinc-400 space-y-2">
             <span className="block font-bold tracking-wider uppercase text-zinc-505">Legend Info</span>
             <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600"></span><span>Saved</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-850/80"></span><span>Skipped</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-600"></span><span>Review</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span><span>Ans & Rev</span></div>
             </div>
          </div>
          <div className="p-4 bg-zinc-950 border-t border-zinc-850">
             <button 
               onClick={() => {
                  setMobileDrawerOpen(false);
                  setShowSubmitConfirm(true);
               }}
               className="w-full py-3 bg-red-800 hover:bg-red-900 border-none text-white text-[11px] uppercase tracking-widest font-black rounded-xl transition-all cursor-pointer shadow-md"
             >
                Submit Exam
             </button>
          </div>
       </div>

       {/* Mobile drawer backdrop screen overlay */}
       {mobileDrawerOpen && (
          <div 
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ease-in-out lg:hidden"
          />
       )}

       {/* Submit Statistics Gatekeeper confirmation modal */}
       {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSubmitConfirm(false)} />
             <div className="relative max-w-sm w-full bg-[#1c1c1f] border border-zinc-800 p-6 rounded-2xl shadow-2xl text-center space-y-5 transform transition-transform duration-300">
                <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 text-lg">
                   ⚠️
                </div>
                <div className="space-y-1">
                   <h3 className="serif text-lg font-bold text-white uppercase">Submit Your Assessment?</h3>
                   <p className="text-xs text-zinc-400 leading-normal">
                     পরীক্ষাটি কি চূড়ান্তভাবে জমা দিতে চান? সাবমিট করার পর উত্তর আর পরিবর্তন করা সম্ভব হবে না।
                   </p>
                </div>
                
                {/* Statistics panel in modal */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                   <div>
                      <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Answered</span>
                      <span className="text-sm font-bold text-emerald-400">{submitStats.answered}</span>
                   </div>
                   <div>
                      <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Review</span>
                      <span className="text-sm font-bold text-blue-400">{submitStats.review}</span>
                   </div>
                   <div>
                      <span className="block text-[8px] uppercase text-zinc-500 font-bold tracking-wider">Unvisited</span>
                      <span className="text-sm font-bold text-zinc-500">{submitStats.unvisited}</span>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button 
                     onClick={() => setShowSubmitConfirm(false)}
                     className="py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={() => {
                        setShowSubmitConfirm(false);
                        handleComplete(userAnswers);
                     }}
                     className="py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-md"
                   >
                      Yes, Submit
                   </button>
                </div>
             </div>
          </div>
       )}

    </div>
  );
}
