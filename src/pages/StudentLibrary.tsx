import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api, LibraryItem, cleanPhone } from '../lib/api';
import { PageHeader } from './Pages';
import { Loader2, Eye, FileText, FileDown, BookOpen, Folder, ChevronRight, Clock, Search, FolderOpen, PenTool } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { UnifiedQuizPlayer } from '../components/quiz/UnifiedQuizPlayer';
import { verifyAndJoinSession, joinSessionWithoutCode } from '../lib/exam-session-utils';
import { useSearchParams } from 'react-router-dom';
import { safeToDate } from '../lib/utils';
const ORACLE_SERVER_URL = 'https://saikat-tuition.duckdns.org';
const ORACLE_API_KEY = import.meta.env.VITE_ORACLE_API_KEY || 'tuition-secret-2026-change-this';

function CountdownTimer({ targetDate, onComplete }: { targetDate: Date; onComplete: () => void }) {
  const [countdown, setCountdown] = useState('');
  
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown('');
        onComplete();
        return;
      }
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      let str = '';
      if (hours > 0) {
        str += `${hours} ঘণ্টা `;
      }
      if (minutes > 0 || hours > 0) {
        str += `${minutes} মিনিট `;
      }
      str += `${seconds} সেকেন্ড`;
      
      setCountdown(str);
    };
    
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  return (
    <div className="mb-6 bg-zinc-50 border-4 border-black p-4 text-center">
      <p className="text-xs font-bold text-zinc-500 uppercase mb-1">পরীক্ষা শুরুর সময় (Starts At):</p>
      <p className="text-lg font-black text-black">
        {targetDate.toLocaleString('bn-BD', {
           weekday: 'long',
           year: 'numeric',
           month: 'long',
           day: 'numeric',
           hour: 'numeric',
           minute: 'numeric',
           hour12: true
        })}
      </p>
      <p className="text-xs font-bold text-zinc-500 mt-2">
        ({targetDate.toLocaleString('en-US', {
           weekday: 'short',
           month: 'short',
           day: 'numeric',
           hour: 'numeric',
           minute: 'numeric',
           hour12: true
        })})
      </p>
      <hr className="my-3 border-zinc-300" />
      <p className="text-xs font-bold text-zinc-500 uppercase mb-1">অবশিষ্ট সময় (Remaining):</p>
      <p className="text-2xl font-black text-emerald-600 animate-pulse">
        {countdown || 'লোড হচ্ছে...'}
      </p>
    </div>
  );
}

export function StudentLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentBatch, setStudentBatch] = useState<any>(null);
  
  // Navigation
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('mode') as 'folders' | 'latest') || 'folders';
  const currentFolderId = searchParams.get('folder') || null;
  const previewId = searchParams.get('preview') || null;
  const previewItem = items.find(i => i.id === previewId) || null;

  const setViewMode = (mode: 'folders' | 'latest') => {
    setSearchParams(prev => { prev.set('mode', mode); return prev; });
  };
  
  const setCurrentFolderId = (id: string | null) => {
    setSearchParams(prev => { 
       if (id) prev.set('folder', id); 
       else prev.delete('folder'); 
       return prev; 
    });
  };

  const setPreviewItem = (item: LibraryItem | null) => {
    setSearchParams(prev => {
       if (item && item.id) prev.set('preview', item.id);
       else prev.delete('preview');
       return prev;
     });
  };
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<{title: string; body: string; isWarning?: boolean; fallbackUrl?: string; item?: LibraryItem} | null>(null);
  const [activeDownloadFile, setActiveDownloadFile] = useState<{ blob: Blob; fileName: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Exam session
  const [codeInputItem, setCodeInputItem] = useState<LibraryItem | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const [weeksToShow, setWeeksToShow] = useState(2);
  const [libraryMode, setLibraryMode] = useState<'EXAM' | 'NOTE' | null>(null);

  const fetchAll = async () => {
    if (!user?.batchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Get batches and student's batch
      const allBatches = await api.getBatches();
      const studentBatch = allBatches.find(b => b.id === user.batchId);
      if (!studentBatch) {
        setItems([]);
        setLoading(false);
        return;
      }
      setStudentBatch(studentBatch);

      // 2. Get assigned items mapping from batch
      const assignedItemsMap = studentBatch.assignedItemsMap || {};
      const assignedIds = Object.keys(assignedItemsMap);

      // 3. Get central library items
      const libraryItems = await api.getLibrary();
      setAllItems(libraryItems);

      // 4. Resolve accessible items (assigned root items + descendants recursively + ancestors)
      const accessible = new Set<string>();

      // Start with explicitly assigned items
      assignedIds.forEach(id => {
         if (libraryItems.some(i => i.id === id)) {
            accessible.add(id);
         }
      });

      // Recursively add descendants of folders in the accessible set
      const addLoadedChildren = (parentId: string) => {
          const children = libraryItems.filter(i => i.parentId === parentId);
          for (const c of children) {
              if (accessible.has(c.id)) continue;
              accessible.add(c.id);
              addLoadedChildren(c.id);
          }
      };
      
      Array.from(accessible).forEach(id => {
         addLoadedChildren(id);
      });

      // Add ancestors to ensure folder breadcrumbs and parents exist
      const addAncestors = (itemId: string) => {
          const item = libraryItems.find(i => i.id === itemId);
          if (item?.parentId && !accessible.has(item.parentId)) {
              accessible.add(item.parentId);
              addAncestors(item.parentId);
          }
      };
      Array.from(accessible).forEach(id => {
         addAncestors(id);
      });

      const filteredItems = libraryItems.filter(i => accessible.has(i.id));
      setItems(filteredItems);

    } catch (err) {
      console.error("Error loading library for student:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user?.batchId]);

  const handleOpenFolder = (folderId: string | null) => {
      setCurrentFolderId(folderId);
  };

  const handleSecureFormDownload = (item: LibraryItem) => {
    const fileIdMatch = item.contentUrl?.match(/[-\w]{25,}/);
    const fileId = fileIdMatch ? fileIdMatch[0] : null;
    if (!fileId) { alert('Invalid file link.'); return; }

    const studentName = (user as any)?.fullName || user?.displayName || user?.email || 'Student';
    const rawPhone = (user as any)?.phone || '0000000000';
    const phone = cleanPhone(rawPhone);
    const fileName = `${item.title || 'document'}.pdf`;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${ORACLE_SERVER_URL}/download`;
    form.target = '_blank';

    const addInput = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addInput('key', ORACLE_API_KEY);
    addInput('fileId', fileId);
    addInput('name', studentName);
    addInput('phone', phone);
    addInput('fileName', fileName);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    setDownloadMessage(null);
    setActiveDownloadFile(null);
  };

  const handleDownloadUrl = async (item: LibraryItem) => {
    try {
      setDownloadingId(item.id);

      const fileIdMatch = item.contentUrl?.match(/[-\w]{25,}/);
      const fileId = fileIdMatch ? fileIdMatch[0] : null;
      if (!fileId) { alert('Invalid file link.'); return; }

      const studentName = (user as any)?.fullName || user?.displayName || user?.email || 'Student';
      const rawPhone = (user as any)?.phone || '0000000000';
      
      const phone = cleanPhone(rawPhone);
      const fileName = `${item.title || 'document'}.pdf`;
      const password = phone;

      // ─── Fetch POST Submission (JSON) ──────────────────────────────────────
      // Sends JSON payload to the Oracle server to bypass form urlencoding issues
      const response = await fetch(`${ORACLE_SERVER_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: ORACLE_API_KEY,
          fileId: fileId,
          name: studentName,
          phone: phone,
          fileName: fileName
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setActiveDownloadFile({ blob, fileName, title: item.title || 'document' });

      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isInAppBrowser = /(Instagram|FBAN|FBAV|TwitterAndroid|Line\/|WhatsApp|Snapchat|MicroMessenger|GSA\/)/i.test(ua);

      if (isInAppBrowser) {
        URL.revokeObjectURL(blobUrl);
        setDownloadMessage({
          title: '⚠️ Browser Not Supported',
          body: `WhatsApp/Instagram browser-এ PDF download হয় না। Chrome বা Safari ব্রাউজারে অ্যাপটি ওপেন করুন। পিডিএফ পাসওয়ার্ড: ${password}`,
          isWarning: true
        });
        return;
      }

      if (isIOS) {
        const newTab = window.open(blobUrl, '_blank');
        if (!newTab) {
          // Popup blocked — don't redirect, just show warning message
          URL.revokeObjectURL(blobUrl);
          setDownloadMessage({
            title: '⚠️ Popup Blocked',
            body: `Safari-এ Popup blocked হয়েছে। Settings → Safari → Block Pop-ups বন্ধ করুন, তারপর আবার try করুন।\n\nপিডিএফ পাসওয়ার্ড: ${password}`,
            isWarning: true
          });
          return;
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 90000);
        return;
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

      setDownloadMessage({
        title: '✅ Download শুরু হয়েছে!',
        body: `PDF টি আপনার ব্রাউজারে ডাউনলোড হচ্ছে।\n\nপিডিএফটি খোলার পাসওয়ার্ড (Password): ${password}\n(এটি আপনার ১০-ডিজিটের ফোন নম্বর)`,
        isWarning: false
      });

    } catch (error: any) {
      setDownloadMessage({ 
        title: '❌ Connection Error', 
        body: `পিডিএফ ওয়াটারমার্কিং সার্ভারের সাথে সংযোগ করা যাচ্ছে না (সম্ভবত আপনার মোবাইল নেটওয়ার্ক বা ইন্টারনেট সেবাদাতা সংযোগটি ব্লক করেছে)।\n\nপাসওয়ার্ড ও ওয়াটারমার্কসহ ফাইলটি নিরাপদে ডাউনলোড করতে নিচের 'নিরাপদ ডাউনলোড' বাটনটি ক্লিক করুন।`, 
        isWarning: true,
        fallbackUrl: item.contentUrl || undefined,
        item: item
      });
      console.error(error);
    } finally {
      setDownloadingId(null);
    }
  };

  const chunkedPdfCache = useRef<Map<string, string>>(new Map());

  const handleDownloadChunked = async (item: LibraryItem) => {
     if (!item.isChunked || !item.chunkCount || !item.id) return;
     try {
        setDownloadingId(item.id);

        let base64String = chunkedPdfCache.current.get(item.id);
        if (!base64String) {
           setDownloadMessage({
             title: "⚠️ Legacy File / পুরনো ফাইল",
             body: "এই ফাইলটি পুরনো ফরম্যাটে রয়েছে। অনুগ্রহ করে অ্যাডমিনকে বলুন এটি পুনরায় গুগল ড্রাইভ লিংক হিসেবে আপলোড করতে।",
             isWarning: true
           });
           setDownloadingId(null);
           return;
        }

        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        let byteArray: any = new Uint8Array(byteNumbers);

        try {
           const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
           const pdfDoc = await PDFDocument.load(byteArray);
           const pages = pdfDoc.getPages();
           const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
           const watermarkText = `Downloaded by: ${user?.fullName || user?.displayName || user?.email || 'Student'} | ${new Date().toLocaleString('en-IN')}`;
           
           for (const page of pages) {
             const { width, height } = page.getSize();
             const textSize = 9;
             const textWidth = font.widthOfTextAtSize(watermarkText, textSize);
             page.drawText(watermarkText, {
               x: width - textWidth - 15,
               y: height - 20,
               size: textSize,
               font: font,
               color: rgb(0.5, 0.5, 0.5),
               opacity: 0.4,
             });
           }
           byteArray = await pdfDoc.save();
        } catch (watermarkErr) {
           console.warn("Could not add watermark:", watermarkErr);
        }

        try {
           const rawPhone = user?.phone || '0000000000';
           const phonePassword = rawPhone.replace(/^\+91/, '').replace(/\s+/g, '').trim();
           const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
           byteArray = (await encryptPDF(byteArray, phonePassword)) as any;
        } catch (pdfErr) {
           console.warn("Could not encrypt PDF:", pdfErr);
        }
        
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const fileName = item.fileName || `${item.title || 'note'}.pdf`;
        const password = (user?.phone || '').replace(/^\+91/, '').replace(/\s+/g, '').trim();
        setActiveDownloadFile({ blob, fileName, title: item.title || 'document' });

        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const isInAppBrowser = /(Instagram|FBAN|FBAV|TwitterAndroid|Line\/|WhatsApp|Snapchat|MicroMessenger|GSA\/)/i.test(ua);

        if (isInAppBrowser) {
          URL.revokeObjectURL(blobUrl);
          setDownloadMessage({
            title: '⚠️ Browser Not Supported',
            body: `WhatsApp/Instagram browser-এ PDF download হয় না। Open this in Chrome or Safari. Password: ${password}`,
            isWarning: true
          });
          return;
        }

        if (isIOS) {
          const newTab = window.open(blobUrl, '_blank');
          if (!newTab) {
            // Popup blocked — don't redirect, just show warning
            URL.revokeObjectURL(blobUrl);
            setDownloadMessage({
              title: '⚠️ Popup Blocked',
              body: `Safari-এ Popup blocked হয়েছে। Settings → Safari → Block Pop-ups বন্ধ করুন, তারপর আবার try করুন।\n\nপিডিএফ পাসওয়ার্ড: ${password}`,
              isWarning: true
            });
            return;
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 90000);
          return;
        }

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName; // declared above (line ~292)
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link); 
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); 
        
        setDownloadMessage({ 
            title: '✅ Download শুরু হয়েছে!', 
            body: `PDF open করার password: ${password}`
        }); 

     } catch (err) {
        console.error('Download failed:', err);
     } finally {
        setDownloadingId(null);
     }
  };

  const handleShareFile = async () => {
     if (!activeDownloadFile) return;
     try {
       const file = new File([activeDownloadFile.blob], activeDownloadFile.fileName, { type: 'application/pdf' });
       if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
         await navigator.share({
           files: [file],
           title: activeDownloadFile.title,
           text: 'M-C Tuition Portal PDF Notes'
         });
         // Share সফল হলে modal বন্ধ করো
         setDownloadMessage(null);
         setActiveDownloadFile(null);
       } else {
         // Web Share API সমর্থন করে না → WhatsApp fallback
         const phone = cleanPhone(user?.phone || '0000000000');
         const text = `M-C Tuition Note: *${activeDownloadFile.title}*\nPassword to open: *${phone}*\n(Note: Please use Chrome/Safari to download directly.)`;
         window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
       }
     } catch (err: any) {
       if ((err as any)?.name === 'AbortError') return; // User cancelled share — ignore
       console.error("Share failed:", err);
       // alert() ব্যবহার না করে modal message দেখাও (iOS-এ alert block হয়)
       setDownloadMessage({
         title: '❌ Share ব্যর্থ হয়েছে',
         body: `শেয়ার করা যায়নি। সরাসরি Chrome বা Safari-এ অ্যাপ খুলুন।\n\nত্রুটি: ${err.message || err}`,
         isWarning: true
       });
     }
  };

  const handleItemClick = async (item: LibraryItem) => {
     try {
         if (item.type !== 'exam') {
             return;
         }

         if (!user || !(user as any).batchId) {
            alert("প্রথমে একটি batch-এ যোগ দিন (Join a batch first)");
            return;
         }

         // Check for scheduled opening time lock (Library Exam scheduled access restriction)
         const scheduledTimeStr = studentBatch?.scheduledStartTimeMap?.[item.id];
         if (scheduledTimeStr) {
            const scheduledTime = new Date(scheduledTimeStr);
            if (scheduledTime.getTime() > Date.now()) {
               // Exam is locked! Prevent entrance and show lock modal
               return;
            }
         }

         // check sessionStorage cache
         const alreadyJoinedKey = `joined_exam_${item.id}_${(user as any).batchId}`;
         const alreadyJoined = sessionStorage.getItem(alreadyJoinedKey);
         if (alreadyJoined === 'true') {
            setPreviewItem(item);
            return;
         }

         // Fetch active sessions from Sheets API
         const sessions = await api.getExamSessions();
         const batchSessionDocs = sessions.filter(s => s.examId === item.id && s.batchId === (user as any).batchId);
         const activeSessionDocs = batchSessionDocs.filter(s => s.isActive === true);
         const endedSessionDocs = batchSessionDocs.filter(s => s.isActive === false);

         if (batchSessionDocs.length === 0) {
            setPreviewItem(item);
            return;
         }

         if (activeSessionDocs.length === 0) {
            if (endedSessionDocs.length > 0) {
               setPreviewItem(item);
            } else {
               alert('এই পরীক্ষা এখনো শুরু হয়নি। দয়া করে লাইভ সেশন শুরু হওয়া পর্যন্ত অপেক্ষা করুন।');
            }
            return;
         }

         const activeSession = activeSessionDocs[0];
         const participants = activeSession.participantUids || [];
         if (participants.includes(user.uid)) {
            sessionStorage.setItem(alreadyJoinedKey, 'true');
            setPreviewItem(item);
            return;
         }

         if (activeSession.codeEnabled === false) {
              const result = await joinSessionWithoutCode(
                  activeSession.id,
                  activeSession,
                  user.uid,
                  (user as any).batchId,
                  user.fullName || user.displayName || undefined,
                  user.phone
              );
              if (result === 'ok' || result === 'already_participated') {
                  sessionStorage.setItem(alreadyJoinedKey, 'true');
                  setPreviewItem(item);
              }
              return;
         }

         // Require code modal
         setCodeInputItem(item);
         setEnteredCode('');
         setCodeError('');
     } catch (err: any) {
         console.error("handleItemClick error:", err);
         alert("ফাইল খুলতে একটি সমস্যা হয়েছে (Error): " + err.message);
     }
  };

  const handleCodeSubmit = async () => {
     if (!codeInputItem || !user || !(user as any).batchId) return;
     try {
       setCodeLoading(true);
       setCodeError('');

       const result = await verifyAndJoinSession(
          codeInputItem.id,
          (user as any).batchId,
          user.uid,
          enteredCode,
          user.fullName || user.displayName || undefined,
          user.phone
       );
       setCodeLoading(false);

       switch (result) {
          case 'ok':
             if (user && (user as any).batchId) {
                sessionStorage.setItem(`joined_exam_${codeInputItem.id}_${(user as any).batchId}`, 'true');
             }
             setCodeInputItem(null);
             setPreviewItem(codeInputItem);
             break;
          case 'wrong_code':
             setCodeError('❌ কোডটি ভুল। আবার চেষ্টা করুন।');
             break;
          case 'already_participated':
             if (user && (user as any).batchId) {
                sessionStorage.setItem(`joined_exam_${codeInputItem.id}_${(user as any).batchId}`, 'true');
             }
             setCodeError('আপনি এই session-এ ইতিমধ্যে যোগ দিয়েছেন।');
             setCodeInputItem(null);
             setPreviewItem(codeInputItem);
             break;
          case 'session_inactive':
             setCodeError('❌ এই session আর সক্রিয় নেই।');
             break;
       }
     } catch (err) {
       console.error("Code verification failed:", err);
       setCodeError('❌ একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
       setCodeLoading(false);
     }
  };

  const getBreadcrumbs = () => {
     const crumbs: {id: string, title: string}[] = [];
     let curr = currentFolderId;
     const visited = new Set<string>();
     while (curr) {
        if (visited.has(curr)) break;
        visited.add(curr);
        const folder = items.find(i => i.id === curr);
        if (folder) {
           crumbs.unshift({ id: folder.id, title: folder.title });
           curr = folder.parentId || null;
        } else {
           break;
        }
     }
     return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  
  const folderVisibility = useMemo(() => {
     const memo = new Map<string, { exam: boolean, note: boolean }>();
     const childrenMap = new Map<string, LibraryItem[]>();
     
     for (const item of items) {
         const pId = item.parentId || 'root';
         if (!childrenMap.has(pId)) childrenMap.set(pId, []);
         childrenMap.get(pId)!.push(item);
     }

     const checkVis = (folderId: string): { exam: boolean, note: boolean } => {
         if (memo.has(folderId)) return memo.get(folderId)!;
         memo.set(folderId, { exam: false, note: false }); 

         const children = childrenMap.get(folderId) || [];
         let hasExam = false;
         let hasNote = false;
         
         for (const child of children) {
             if (!child.isFolder) {
                 if (child.type === 'exam') hasExam = true;
                 else hasNote = true;
             } else {
                 const childVis = checkVis(child.id);
                 if (childVis.exam) hasExam = true;
                 if (childVis.note) hasNote = true;
             }
         }
         
         const res = { exam: hasExam, note: hasNote };
         memo.set(folderId, res);
         return res;
     };

     for (const item of items) {
         if (item.isFolder) checkVis(item.id);
     }
     return memo;
  }, [items]);

  const isFolderVisible = (folder: LibraryItem, mode: 'EXAM' | 'NOTE'): boolean => {
      const vis = folderVisibility.get(folder.id);
      const hasMatchingContent = vis ? (mode === 'EXAM' ? vis.exam : vis.note) : false;
      
      if (!hasMatchingContent) {
          const t = folder.title?.toLowerCase() || '';
          if (mode === 'EXAM' && (t.includes('exam') || t.includes('test'))) return true;
          if (mode === 'NOTE' && !(t.includes('exam') || t.includes('test'))) return true;
          return false;
      }
      return true;
  };

  const currentItems = items.filter(i => 
    searchQuery 
     ? (i.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) && (libraryMode === 'NOTE' ? i.type !== 'exam' : i.type === 'exam')
     : (i.parentId || null) === currentFolderId && (
          (i.isFolder && isFolderVisible(i, libraryMode as 'EXAM' | 'NOTE')) || 
          (!i.isFolder && (libraryMode === 'NOTE' ? i.type !== 'exam' : i.type === 'exam'))
       )
  );
  
  const getMs = (t: any) => {
    if (!t) return 0;
    return new Date(t).getTime() || 0;
  };
  
  const folders = currentItems.filter(i => i.isFolder).sort((a,b) => (a.title || '').localeCompare(b.title || ''));
  const files = currentItems.filter(i => !i.isFolder).sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));

  const allFilesSorted = searchQuery 
    ? files 
    : items.filter(i => !i.isFolder && (libraryMode === 'NOTE' ? i.type !== 'exam' : i.type === 'exam')).sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));

  const formatDate = (timestamp: any) => {
     if (!timestamp) return 'No date';
     const d = safeToDate(timestamp);
     if (!d) return 'Invalid date';
     return d.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
     });
  };

  const handleBackNavigation = () => {
      if (currentFolderId) {
         const folder = items.find(i => i.id === currentFolderId);
         setCurrentFolderId(folder?.parentId || null);
      } else {
         setLibraryMode(null);
      }
  };

  if (previewItem) {
      if (previewItem.type !== 'exam') {
         return (
           <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)] text-center mt-8">
             <div className="text-5xl mb-4">📄</div>
             <h2 className="text-2xl font-black uppercase mb-4">Study Material</h2>
             <p className="font-bold text-zinc-600 dark:text-zinc-400 mb-6">
               এই study material টি Library থেকে Download করুন।
               এটি এখানে সরাসরি দেখানো সম্ভব নয়।
             </p>
             <button
               onClick={() => setPreviewItem(null)}
               className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase px-6 py-3 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:-translate-y-0.5 transition-transform"
             >
               ← Library-তে ফিরুন
             </button>
           </div>
         );
      }

      // Check scheduled opening time lock in render path (to secure manual deep links or refresh)
      const scheduledTimeStr = studentBatch?.scheduledStartTimeMap?.[previewItem.id];
      if (scheduledTimeStr) {
         const scheduledTime = new Date(scheduledTimeStr);
         if (scheduledTime.getTime() > Date.now()) {
            return (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_black] p-8 max-w-sm w-full text-center">
                  <div className="w-16 h-16 bg-red-100 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-black animate-pulse" />
                  </div>
                  <h2 className="text-xl font-black mb-1 text-black">{previewItem.title}</h2>
                  <p className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4">
                    🔒 পরীক্ষাটি লক করা আছে (Locked)
                  </p>
                  
                  <CountdownTimer 
                     targetDate={scheduledTime} 
                     onComplete={() => {
                        // Force state refresh
                        setPreviewItem(previewItem);
                     }} 
                  />

                  <button
                    onClick={() => setPreviewItem(null)}
                    className="w-full py-3 bg-yellow-300 border-4 border-black font-black text-black shadow-[4px_4px_0px_black] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
                  >
                    ফিরে যান (Go Back)
                  </button>
                </div>
              </div>
            );
         }
      }

      return <UnifiedQuizPlayer exam={previewItem as any} onBack={() => setPreviewItem(null)} />;
  }

  if (!libraryMode) {
      return (
         <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] w-full text-center">
             <h1 className="text-3xl font-black mb-8 uppercase text-zinc-900 dark:text-zinc-100">Welcome to Library</h1>
             <p className="text-zinc-600 dark:text-zinc-400 font-bold mb-10">What would you like to access today?</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                 <button onClick={() => { setCurrentFolderId(null); setLibraryMode('NOTE'); }} className="flex flex-col items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 border-4 border-zinc-900 dark:border-zinc-100 p-8 hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)] group">
                    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-6 rounded-full group-hover:scale-110 transition-transform"><BookOpen className="w-10 h-10" /></div>
                    <h2 className="text-2xl font-black uppercase text-zinc-900 dark:text-zinc-100">Study Materials</h2>
                    <p className="text-zinc-700 dark:text-zinc-400 font-medium">Access PDF notes, assignments & study guides</p>
                 </button>
                 <button onClick={() => { setCurrentFolderId(null); setLibraryMode('EXAM'); }} className="flex flex-col items-center gap-4 bg-blue-50 dark:bg-blue-900/20 border-4 border-blue-600 p-8 hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_rgba(37,99,235,1)] group">
                    <div className="bg-blue-600 text-white p-6 rounded-full group-hover:scale-110 transition-transform"><PenTool className="w-10 h-10" /></div>
                    <h2 className="text-2xl font-black uppercase text-blue-900 dark:text-blue-100">Take an Exam</h2>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">Participate in live exams or past mock tests</p>
                 </button>
             </div>
         </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
      {downloadMessage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] dark:shadow-[8px_8px_0px_0px_rgba(244,244,245,1)]">
            <h3 className={`text-xl font-black uppercase mb-4 ${downloadMessage.isWarning ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>{downloadMessage.title}</h3>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 whitespace-pre-line mb-6">
               {downloadMessage.body}
            </p>
            <div className="flex flex-col gap-3">
              {/* Share বাটন — শুধু তখনই দেখাবে যখন blob মেমরিতে আছে */}
              {activeDownloadFile && (
                <button
                  onClick={handleShareFile}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 font-black text-sm uppercase transition-colors flex items-center justify-center gap-2 border-2 border-green-800 shadow-[3px_3px_0px_0px_rgba(20,83,45,1)]"
                >
                  📲 Share / WhatsApp-এ পাঠান
                </button>
              )}
              {downloadMessage.fallbackUrl && downloadMessage.item && (
                <>
                <button
                  onClick={() => handleSecureFormDownload(downloadMessage.item!)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-zinc-950 px-4 py-3 font-black text-sm uppercase transition-colors flex items-center justify-center gap-2 border-2 border-yellow-700 shadow-[3px_3px_0px_0px_rgba(113,63,18,1)] text-center font-bold border-none cursor-pointer mb-3"
                >
                  📥 নিরাপদ ডাউনলোড শুরু করুন
                </button>
                <button
                  onClick={() => {
                    const fileIdMatch = downloadMessage.item!.contentUrl?.match(/[-\w]{25,}/);
                    const fileId = fileIdMatch ? fileIdMatch[0] : null;
                    const studentName = (user as any)?.fullName || user?.displayName || user?.email || 'Student';
                    const rawPhone = (user as any)?.phone || '0000000000';
                    const phone = rawPhone.replace(/^\+91/, '').replace(/\s+/g, '').trim();
                    const fileName = `${downloadMessage.item!.title || 'document'}.pdf`;
                    const directLink = `${ORACLE_SERVER_URL}/download?key=${ORACLE_API_KEY}&fileId=${fileId}&name=${encodeURIComponent(studentName)}&phone=${encodeURIComponent(phone)}&fileName=${encodeURIComponent(fileName)}`;
                    const text = `M-C Tuition Note: *${downloadMessage.item!.title}*\nPassword to open: *${phone}*\nDownload link: ${directLink}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 font-black text-sm uppercase transition-colors flex items-center justify-center gap-2 border-2 border-green-800 shadow-[3px_3px_0px_0px_rgba(20,83,45,1)] cursor-pointer"
                >
                  💬 WhatsApp-এ ডাউনলোড লিংক শেয়ার করুন
                </button>
                </>
              )}
              {downloadMessage.isWarning && (
                <>
                  <button
                    onClick={() => {
                      const appUrl = window.location.origin + window.location.pathname;
                      navigator.clipboard.writeText(appUrl);
                      alert("লিংক কপি করা হয়েছে! দয়া করে Google Chrome বা Safari ব্রাউজারে পেস্ট করে ওপেন করুন এবং পিডিএফ ডাউনলোড করুন।");
                    }}
                    className="w-full bg-zinc-150 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 px-4 py-3 font-black text-sm uppercase transition-colors flex items-center justify-center gap-2 border-2 border-zinc-400 dark:border-zinc-700 shadow-[3px_3px_0px_0px_rgba(161,161,170,0.5)] cursor-pointer"
                  >
                    📋 অ্যাপের লিংক কপি করুন
                  </button>
                  <button
                    onClick={() => {
                      const appUrl = window.location.origin + window.location.pathname;
                      const text = `Mondal Coaching tuition app link. Please open this link in Google Chrome or Safari to download PDFs successfully!\n\n👉 ${appUrl}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 font-black text-sm uppercase transition-colors flex items-center justify-center gap-2 border-2 border-green-800 shadow-[3px_3px_0px_0px_rgba(20,83,45,1)] cursor-pointer"
                  >
                    💬 WhatsApp-এ অ্যাপ লিংক পাঠান
                  </button>
                </>
              )}
              <button
                 onClick={() => { setDownloadMessage(null); setActiveDownloadFile(null); }}
                 className="w-full bg-black text-white hover:bg-zinc-800 px-4 py-3 font-bold text-sm uppercase transition-colors"
              >
                 OK / বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
             <PageHeader 
                title="My Target Library" 
                backTo="/" 
                onBack={handleBackNavigation} 
             />
             <button 
                onClick={() => {
                   fetchAll();
                }}
                className="bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs px-4 py-2 border-2 border-transparent hover:-translate-y-0.5 transition-transform"
             >
                Refresh
             </button>
          </div>
          
          <div className="w-full sm:max-w-md relative">
             <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
             <input 
                type="text" 
                placeholder="Search materials..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none"
             />
          </div>

          <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 w-full sm:w-auto">
             <button 
                onClick={() => setViewMode('folders')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all ${viewMode === 'folders' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow px-6' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
             >
                <FolderOpen className="w-4 h-4" /> Folders
             </button>
             <button 
                onClick={() => setViewMode('latest')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all ${viewMode === 'latest' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow px-6' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
             >
                <Clock className="w-4 h-4" /> Latest Updates
             </button>
          </div>
      </div>
      
      {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : viewMode === 'folders' ? (
          <>
            <div className="flex gap-2 items-center mb-6 overflow-x-auto text-sm font-bold pb-2 text-zinc-600 dark:text-zinc-400">
               <button onClick={() => handleOpenFolder(null)} className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 shrink-0">
                  <Folder className="w-4 h-4"/> Home
               </button>
               {breadcrumbs.map((bc, idx) => (
                   <React.Fragment key={bc.id}>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                      <button onClick={() => handleOpenFolder(bc.id)} className="hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0">
                         {bc.title}
                      </button>
                   </React.Fragment>
               ))}
            </div>

            <div className="grid grid-cols-1 mb-8 gap-4">
              {folders.length === 0 && files.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-bold border-2 border-dashed border-zinc-300 dark:border-zinc-700">Content will appear here once assigned by the administrator.</div>
              ) : (
                  <>
                     {folders.map((folder, idx) => (
                        <div key={folder.id} 
                             className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" 
                             onClick={() => handleOpenFolder(folder.id)}>
                           <div className="flex items-center gap-3 w-full">
                              <Folder className="w-6 h-6 text-blue-500 shrink-0" fill="currentColor" />
                              <h4 className="font-black text-lg truncate flex-1">{folder.title}</h4>
                           </div>
                           <div className="shrink-0 text-xs text-zinc-400 font-bold hidden sm:block">
                              Directory
                           </div>
                        </div>
                     ))}
                     
                     {files.map((item, index) => (
                        <FileCard key={item.id} item={item} onPreview={() => handleItemClick(item)} formatDate={formatDate} onDownloadChunked={() => handleDownloadChunked(item)} onDownloadUrl={() => handleDownloadUrl(item)} downloadingId={downloadingId} showPath={!!searchQuery} items={items} scheduledStartTimeMap={studentBatch?.scheduledStartTimeMap} />
                     ))}
                  </>
              )}
            </div>
            
            <div className="flex justify-center mt-4">
                <button 
                   onClick={() => setWeeksToShow(w => w + 2)}
                   className="px-6 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold bg-white dark:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] transition-all"
                >
                   Load Older Materials
                </button>
            </div>
          </>
      ) : (
          <div className="flex flex-col gap-8 mb-8">
             {allFilesSorted.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-bold border-2 border-dashed border-zinc-300 dark:border-zinc-700">No materials available yet.</div>
             ) : (
                  Array.from(Object.entries(
                     allFilesSorted.reduce((acc: any, item) => {
                        const d = safeToDate(item.createdAt);
                        const dateStr = d ? d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Older';
                        if (!acc[dateStr]) acc[dateStr] = [];
                        acc[dateStr].push(item);
                        return acc;
                     }, {})
                  )).map(([dateLabel, itemsInDate]: any) => (
                     <div key={dateLabel}>
                        <h3 className="font-black text-xl uppercase mb-4 text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-200 dark:border-zinc-800 pb-2">{dateLabel}</h3>
                        <div className="grid grid-cols-1 gap-4">
                           {itemsInDate.map((item: any, idx: number) => (
                              <FileCard key={item.id} item={item} onPreview={() => handleItemClick(item)} formatDate={formatDate} showPath items={items} onDownloadChunked={() => handleDownloadChunked(item)} onDownloadUrl={() => handleDownloadUrl(item)} downloadingId={downloadingId} scheduledStartTimeMap={studentBatch?.scheduledStartTimeMap} />
                           ))}
                        </div>
                     </div>
                  ))
              )}
              
              <div className="flex justify-center mt-4">
                 <button 
                    onClick={() => setWeeksToShow(w => w + 2)}
                    className="px-6 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold bg-white dark:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] transition-all"
                 >
                    Load Older Materials
                 </button>
              </div>
          </div>
      )}

      {codeInputItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_black] p-8 max-w-sm w-full">
            
            <h2 className="text-xl font-black mb-1 text-black">{codeInputItem.title}</h2>
            <p className="text-sm mb-6 opacity-70 text-black">
              আপনার শিক্ষক যে কোডটি বলেছেন সেটি এখানে লিখুন:
            </p>

            <input
              type="text"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
              placeholder="যেমন: K7X2M"
              maxLength={5}
              className="w-full border-4 border-black px-4 py-3 text-3xl font-black tracking-widest text-center uppercase mb-4 text-black focus:outline-none focus:bg-yellow-50"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />

            {codeError && (
              <p className="text-red-600 font-bold text-sm mb-4 text-center">{codeError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCodeInputItem(null)}
                className="flex-1 py-3 border-4 border-black font-bold text-black bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={codeLoading}
              >
                বাতিল
              </button>
              <button
                onClick={handleCodeSubmit}
                disabled={enteredCode.length < 5 || codeLoading}
                className="flex-[2] px-6 py-3 bg-green-400 border-4 border-black font-black text-black shadow-[4px_4px_0px_black] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {codeLoading ? '...' : '▶ পরীক্ষা শুরু করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileCard({ item, onPreview, formatDate, showPath, items, onDownloadChunked, onDownloadUrl, downloadingId, scheduledStartTimeMap }: { key?: React.Key, item: LibraryItem, onPreview: () => void, formatDate: (ts: any) => string, showPath?: boolean, items?: LibraryItem[], onDownloadChunked?: () => void, onDownloadUrl?: () => void, downloadingId?: string | null, scheduledStartTimeMap?: Record<string, string> }) {
   const renderPath = () => {
      if (!showPath || !items || !item.parentId) return null;
      const getPathStr = (id: string, visited: Set<string> = new Set()): string => {
         if (visited.has(id)) return '...'; 
         visited.add(id);
         const p = items.find(i => i.id === id);
         if (!p) return '';
         const parentStr = p.parentId ? getPathStr(p.parentId, visited) : '';
         return parentStr ? `${parentStr} / ${p.title}` : (p.title || '');
      };
      const pstr = getPathStr(item.parentId);
      return <div className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 mt-2 inline-block">📁 {pstr}</div>;
   };

   const scheduledTimeStr = scheduledStartTimeMap?.[item.id];
   const scheduledTime = scheduledTimeStr ? new Date(scheduledTimeStr) : null;
   const isLocked = item.type === 'exam' && scheduledTime && scheduledTime.getTime() > Date.now();

   return (
      <div className={`bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
         <div>
            <div className="flex items-center gap-2 mb-1">
               <h4 className="font-black text-lg text-zinc-900 dark:text-zinc-100">{item.title}</h4>
               <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${isLocked ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                 {isLocked ? '🔒 Locked' : item.type === 'exam' ? item.examType : 'PDF Note'}
               </span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-xs text-zinc-500 font-bold flex items-center gap-1">
                 <Clock className="w-3.5 h-3.5" /> 
                 {formatDate(item.createdAt)}
               </span>
               {isLocked && scheduledTime && (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    🕒 Opens: {scheduledTime.toLocaleString('en-IN', {
                       month: 'short',
                       day: 'numeric',
                       hour: 'numeric',
                       minute: 'numeric',
                       hour12: true
                    })}
                  </span>
               )}
            </div>
            {renderPath()}
         </div>
         
         <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
           {item.type === 'note' && item.contentUrl && onDownloadUrl && (
               <button onClick={onDownloadUrl} disabled={downloadingId === item.id} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs hover:-translate-y-0.5 transition-transform whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)]">
                 {downloadingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} 
                 {downloadingId === item.id ? 'Processing...' : 'Download PDF'}
               </button>
           )}
           {item.type === 'note' && item.contentUrl && !onDownloadUrl && (
               <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs hover:-translate-y-0.5 transition-transform whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)]">
                 <FileDown className="w-3.5 h-3.5" /> View/Download PDF
               </a>
           )}
           {item.type === 'note' && !item.contentUrl && item.isChunked && onDownloadChunked && (
               <button onClick={onDownloadChunked} disabled={downloadingId === item.id} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs hover:-translate-y-0.5 transition-transform whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)]">
                 {downloadingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} 
                 {downloadingId === item.id ? 'Processing...' : 'Download PDF'}
               </button>
           )}
           {item.type === 'exam' && item.examType === 'Online Link' && item.contentUrl ? (
              <button 
                 onClick={() => {
                    if (!isLocked) {
                       window.open(item.contentUrl, '_blank');
                    } else {
                       onPreview();
                    }
                 }}
                 className={`flex items-center gap-1 px-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] whitespace-nowrap ${isLocked ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-500' : 'bg-blue-100 text-blue-900'}`}
              >
                 {isLocked ? '🔒 Locked' : <BookOpen className="w-3.5 h-3.5" />} 
                 {isLocked ? 'Locked' : 'Take Exam'}
              </button>
           ) : item.type === 'exam' ? (
              <button
                onClick={onPreview}
                className={`flex items-center gap-1 hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] px-4 py-2 border-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs whitespace-nowrap ${isLocked ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-500' : 'bg-blue-100 text-blue-900'}`}
              >
                 {isLocked ? '🔒 Locked' : <BookOpen className="w-3.5 h-3.5" />} 
                 {isLocked ? 'Locked' : 'Take Exam'}
              </button>
           ) : null}
         </div>
      </div>
   );
}
