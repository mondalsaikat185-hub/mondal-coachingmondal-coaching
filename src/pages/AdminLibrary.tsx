import React, { useState, useEffect, useRef } from 'react';
import { api, Batch } from '../lib/api';
import { createExamSession, endExamSession } from '../lib/exam-session-utils';
import { PageHeader } from './Pages';
import { Loader2, Plus, Eye, Share2, Trash2, FileText, FileDown, BookOpen, Folder, FolderPlus, ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { UnifiedQuizPlayer } from '../components/quiz/UnifiedQuizPlayer';

export interface LibraryItem {
  id: string;
  title: string;
  isFolder?: boolean;
  parentId?: string | null;
  type?: "folder" | "exam" | "note" | "pdf";
  examType?: string;
  contentUrl?: string; // Note/PDF URL
  quizData?: string; // JSON
  fileName?: string;
  trackingId?: string;
  timeLimit?: number;
  marksCorrect?: number;
  marksWrong?: number;
  allowMultipleAttempts?: boolean;
  scheduledStartTime?: string;
  createdAt?: any;
  isChunked?: boolean;
  chunkCount?: number;
}

function formatToDatetimeLocal(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AdminLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [itemAssignments, setItemAssignments] = useState<{id: string, libraryItemId: string, batchId: string, scheduledStartTime?: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // ExamSession Polling and State
  const [sessionRequireCode, setSessionRequireCode] = useState(true);
  const [isSessionMinimized, setIsSessionMinimized] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    accessCode: string;
    examId: string;
    examTitle: string;
    participantUids: string[];
    codeEnabled: boolean;
  } | null>(null);

  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([]);
  const activeSessionIntervalRef = useRef<any>(null);

  const startActiveSessionPolling = (sessionId: string) => {
     if (activeSessionIntervalRef.current) {
        clearInterval(activeSessionIntervalRef.current);
     }
     
     activeSessionIntervalRef.current = setInterval(async () => {
        try {
           const sessions = await api.getExamSessions();
           const session = sessions.find(s => s.id === sessionId);
           if (session) {
              setActiveSession((prev) =>
                prev ? { 
                  ...prev, 
                  participantUids: session.participantUids || [],
                  codeEnabled: session.codeEnabled ?? true
                } : null
              );
           }
        } catch (err) {
           console.error("Error polling active session:", err);
        }
     }, 5000); // 5 seconds polling
  };

  useEffect(() => {
    const fetchActiveSessions = async () => {
      try {
        const sessions = await api.getExamSessions();
        const active = sessions.filter(s => s.isActive).slice(0, 10);
        setActiveSessionsList(active);
      } catch (err) {
        console.error("Failed to fetch active sessions:", err);
      }
    };
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (activeSessionIntervalRef.current) {
        clearInterval(activeSessionIntervalRef.current);
      }
    };
  }, []);

  const [sessionBatchPickerItem, setSessionBatchPickerItem] = useState<LibraryItem | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  // Navigation and Folders
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<LibraryItem[]>([]);
  
  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);

  // Upload Form
  const [itemType, setItemType] = useState<"exam" | "note">("exam");
  const [title, setTitle] = useState('');
  const [trackingId, setTrackingId] = useState('');
  
  // Exam extra
  const [examType, setExamType] = useState('Bilingual MCQ');
  const [quizData, setQuizData] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [marksCorrect, setMarksCorrect] = useState(1);
  const [marksWrong, setMarksWrong] = useState(0.25);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  // Note extra
  const [linkUrl, setLinkUrl] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [folderName, setFolderName] = useState('');
  
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [endingSession, setEndingSession] = useState(false);
  const [autoExtractMsg, setAutoExtractMsg] = useState('');

  const [loadedFolders, setLoadedFolders] = useState<Set<string | null>>(new Set());

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchFolderContent = async (folderId: string | null, forceRefresh = false) => {
    if (!forceRefresh && loadedFolders.has(folderId)) {
        return; // Already fetched in this session
    }
    setLoading(true);
    try {
        const libraryItems = await api.getLibrary();
        const fetchedItems = libraryItems.filter(item => {
          const parent = item.parentId === '' ? null : item.parentId;
          return parent === folderId;
        });
        
        setItems(prev => {
            const getMs = (t: any) => {
              if (!t) return 0;
              if (typeof t.toMillis === 'function') return t.toMillis();
              if (t.seconds) return t.seconds * 1000;
              return new Date(t).getTime() || 0;
            };
            // Remove old entries for this folder and append the fresh ones
            const withoutCurrentFolder = prev.filter(p => {
              const parent = p.parentId === '' ? null : (p.parentId || null);
              return parent !== folderId;
            });
            const updated = withoutCurrentFolder.concat(fetchedItems as any);
            return updated.sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));
        });
        
        setLoadedFolders(prev => {
            const next = new Set(prev);
            next.add(folderId);
            return next;
        });
    } catch(err: any) {
        console.error(err);
        alert("Failed to fetch folder content: " + String(err.message || err));
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderContent(currentFolderId);
  }, [currentFolderId]);

  const handleRefreshFolder = () => {
    fetchFolderContent(currentFolderId, true);
  };

  const fetchBatches = async () => {
    try {
      const allBatches = await api.getBatches();
      setBatches(allBatches);
    } catch (err: any) {
      console.error(err);
      alert("Failed to fetch batches: " + String(err.message || err));
    }
  };

  const handlePreviewItem = async (item: LibraryItem) => {
    setLoading(true);
    try {
      const fullItem = await api.getLibraryItemDetails(item.id);
      setPreviewItem(fullItem);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load exam details: " + String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileExtraction = (e: React.ChangeEvent<HTMLInputElement>) => {
     const uploadFile = e.target.files?.[0];
     if (!uploadFile) return;

     if (itemType === 'note') {
        setFile(uploadFile);
        return;
     }

     // If it's an exam, try auto-extraction
     setAutoExtractMsg('Extracting...');
     const reader = new FileReader();
     reader.onload = (evo) => {
        const text = evo.target?.result as string;

        if (uploadFile.name.endsWith('.json')) {
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    setQuizData(JSON.stringify(parsed, null, 2));
                    setAutoExtractMsg(`✅ JSON থেকে ${parsed.length}টি প্রশ্ন extract হয়েছে!`);
                } else if (parsed && parsed.questions && Array.isArray(parsed.questions)) {
                    setQuizData(JSON.stringify(parsed, null, 2));
                    setAutoExtractMsg(`✅ JSON থেকে ${parsed.questions.length}টি প্রশ্ন extract হয়েছে!`);
                    if (parsed.config?.totalTime) setTimeLimit(Math.floor(parsed.config.totalTime / 60));
                    if (parsed.config?.marksCorrect) setMarksCorrect(parsed.config.marksCorrect);
                    if (parsed.config?.marksWrong) setMarksWrong(Math.abs(parsed.config.marksWrong));
                } else {
                    setAutoExtractMsg('JSON format সঠিক নয়। Array অথবা {questions:[...]} format হওয়া উচিত।');
                }
            } catch (err: any) {
                setAutoExtractMsg('JSON parse error: ' + err.message);
            }
            return;
        }

        try {
          const patterns = [
            /(?:const|let|var)\s+questions\s*=\s*(\[[\s\S]*?\]);/,
            /(?:const|let|var)\s+quizData\s*=\s*(\{[\s\S]*?\});/,
            /(?:const|let|var)\s+examData\s*=\s*(\[[\s\S]*?\]);/,
            /(?:const|let|var)\s+data\s*=\s*(\[[\s\S]*?\]);/,
          ];
          
          let questionsJson = null;
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              try {
                questionsJson = JSON.parse(match[1]);
                break;
              } catch { continue; }
            }
          }
          
          if (!questionsJson && uploadFile.name.endsWith('.html')) {
            const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            if (scriptMatch) {
              for (const scriptBlock of scriptMatch) {
                const inner = scriptBlock.replace(/<\/?script[^>]*>/gi, '');
                for (const pattern of patterns) {
                  const match = inner.match(pattern);
                  if (match) {
                    try { questionsJson = JSON.parse(match[1]); break; } catch { continue; }
                  }
                }
                if (questionsJson) break;
              }
            }
          }
          
          // Extract config if present
          const configPatterns = [
            /totalTime\s*[=:]\s*(\d+)/,
            /marksCorrect\s*[=:]\s*([\d.]+)/,
            /marksWrong\s*[=:]\s*(-?[\d.]+)/,
            /timeLimit\s*[=:]\s*(\d+)/,
          ];
          
          let extTotalTime = '';
          let extMarksCorrect = '';
          let extMarksWrong = '';
          
          const totalTimeMatch = text.match(configPatterns[0]);
          if (totalTimeMatch) extTotalTime = totalTimeMatch[1];
          const marksCorrectMatch = text.match(configPatterns[1]);
          if (marksCorrectMatch) extMarksCorrect = marksCorrectMatch[1];
          const marksWrongMatch = text.match(configPatterns[2]);
          if (marksWrongMatch) extMarksWrong = marksWrongMatch[1];

          if (extTotalTime) setTimeLimit(parseInt(extTotalTime));
          if (extMarksCorrect) setMarksCorrect(parseFloat(extMarksCorrect));
          if (extMarksWrong) setMarksWrong(parseFloat(extMarksWrong));

          if (questionsJson) {
            if (Array.isArray(questionsJson)) {
               setQuizData(JSON.stringify(questionsJson, null, 2));
               setAutoExtractMsg(`Successfully extracted ${questionsJson.length} questions!`);
            } else if (questionsJson && (questionsJson as any).questions) {
               setQuizData(JSON.stringify(questionsJson, null, 2));
               setAutoExtractMsg(`Successfully extracted quizData config and ${(questionsJson as any).questions.length} questions!`);
            }
          } else {
             // fallback to function eval
             if (!window.confirm("Could not securely extract data. The system must execute the file as JavaScript to parse it. Only proceed if you trust this file completely. Do you want to proceed?")) {
                 setAutoExtractMsg('Extraction aborted for security.');
                 return;
             }

             const fn = new Function(`
               const dummyNode = new Proxy({}, {
                 get: (target, prop) => {
                    if (prop === 'addEventListener') return () => {};
                    if (typeof prop === 'string' && prop.match(/^[A-Z]/)) return function(){}; // dummy constructors
                    return dummyNode;
                 },
                 set: () => true
               });
               var window = dummyNode;
               var document = dummyNode;
               try {
                 ${text}
               } catch(e) {}
               if (typeof questions !== "undefined") return questions;
               if (typeof quizData !== "undefined") return quizData;
               if (typeof examData !== "undefined") return examData;
               if (typeof data !== "undefined") return data;
               return null;
            `);
            const val = fn();
            if (val && Array.isArray(val)) {
                setQuizData(JSON.stringify(val, null, 2));
                setAutoExtractMsg('Successfully extracted ' + val.length + ' questions via function eval!');
            } else if (val && val.questions) {
                setQuizData(JSON.stringify(val, null, 2));
                setAutoExtractMsg('Successfully extracted quizData config and ' + val.questions.length + ' questions via function eval!');
            } else {
                setAutoExtractMsg('Could not find a variable named "questions", "quizData", or "examData" in the file.');
            }
          }
        } catch (err: any) {
           setAutoExtractMsg('Extraction failed: ' + err.message + '. You may need to paste the JSON manually.');
        }
     };
     reader.readAsText(uploadFile);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!folderName.trim()) return;
     try {
       setSubmitting(true);
       const name = folderName.trim();
       
       await api.saveLibraryItem({
          title: name,
          isFolder: true,
          type: 'folder',
          parentId: currentFolderId || null,
          createdBy: user?.uid,
          isActive: true
       } as any);

       setIsFolderModalOpen(false);
       setFolderName('');
       handleRefreshFolder();
     } catch (err: any) {
       console.error(err);
       alert("Failed to create folder: " + String(err.message || err));
     } finally {
       setSubmitting(false);
     }
  };

  const handleLinkUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     let val = e.target.value;
     
     // Auto convert standard Google Drive link to direct download link
     const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
     const idRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
     
     let fileId = null;
     if (driveRegex.test(val)) {
        fileId = val.match(driveRegex)?.[1];
     } else if (idRegex.test(val)) {
        fileId = val.match(idRegex)?.[1];
     }
     
     if (fileId) {
         val = `https://drive.google.com/uc?export=download&id=${fileId}`;
     }
     
     setLinkUrl(val);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
        setSubmitting(true);

        if (itemType === 'note' && !file && !linkUrl.trim()) {
           alert("Please provide a valid document or a link.");
           return;
        } else if (itemType === 'exam' && examType !== 'Online Link' && !quizData && !contentUrl) {
           alert("Please paste the Quiz JSON, upload a file containing questions, or provide an External Exam Link.");
           return;
        } else if (itemType === 'exam' && examType === 'Online Link' && !contentUrl) {
           alert("Please provide the External Exam Link.");
           return;
        }

        const payload: any = {
           title,
           type: itemType,
           parentId: currentFolderId || null,
           trackingId: trackingId || `TRK-${Math.floor(Math.random()*10000)}`,
           createdBy: user?.uid,
           isActive: true
        };

        if (itemType === 'exam') {
           payload.examType = examType;
           if (examType === 'Online Link') {
              payload.contentUrl = contentUrl;
           } else {
              payload.quizData = quizData;
           }
           payload.timeLimit = timeLimit;
           payload.marksCorrect = marksCorrect;
           payload.marksWrong = marksWrong;
           payload.allowMultipleAttempts = allowMultipleAttempts;
           
           await api.saveLibraryItem(payload);
           
           setIsUploadModalOpen(false);
           resetForm();
           handleRefreshFolder();
           return;
        }

        // PDF Upload to Google Drive using api.uploadFileToDrive
        if (itemType === 'note' && file) {
           payload.fileName = file.name;
           
           setUploadProgress('Preparing file...');

           const reader = new FileReader();
           reader.onload = async (event) => {
              try {
                let finalBytesStr = (event.target?.result as string).split(',')[1];
                if (pdfPassword.trim()) {
                     setUploadProgress('Encrypting PDF (this may take a moment)...');
                     await new Promise(r => setTimeout(r, 50));
                     const byteCharacters = atob(finalBytesStr);
                     const byteNumbers = new Array(byteCharacters.length);
                     for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                     }
                     const byteArray = new Uint8Array(byteNumbers);
                     const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
                     const encryptedBytes = await encryptPDF(byteArray, pdfPassword.trim());
                     let binary = '';
                     for (let i = 0; i < encryptedBytes.byteLength; i++) {
                         binary += String.fromCharCode(encryptedBytes[i]);
                     }
                     finalBytesStr = btoa(binary);
                     payload.isPasswordProtected = true;
                }
                
                setUploadProgress('Uploading file to Google Drive...');
                const uploadRes = await api.uploadFileToDrive(finalBytesStr, file.name);
                if (!uploadRes.success) {
                   throw new Error("Upload to Google Drive failed.");
                }
                
                payload.contentUrl = uploadRes.viewUrl || uploadRes.downloadUrl;
                
                setUploadProgress('Saving to central library...');
                await api.saveLibraryItem(payload);

                setIsUploadModalOpen(false);
                resetForm();
                setUploadProgress('');
                handleRefreshFolder();
              } catch (err: any) {
                 console.error(err);
                 alert("Upload failed: " + String(err.message || err));
                 setUploadProgress('');
              } finally {
                 setSubmitting(false);
              }
           };
           reader.onerror = () => {
              alert("Failed to read file");
              setUploadProgress('');
              setSubmitting(false);
           }
           reader.readAsDataURL(file);
           return; // Do not unset submitting yet, wait for reader
        } else if (itemType === 'note' && linkUrl.trim()) {
           payload.contentUrl = linkUrl.trim();
           await api.saveLibraryItem(payload);
           setIsUploadModalOpen(false);
           resetForm();
           handleRefreshFolder();
         }

     } catch (err: any) {
        console.error(err);
        alert("Upload failed: " + String(err.message || err));
     } finally {
        if (!file) {
           setSubmitting(false);
        }
     }
  };

  const resetForm = () => {
     setTitle('');
     setTrackingId('');
     setQuizData('');
     setLinkUrl('');
     setContentUrl('');
     setFile(null);
     setPdfPassword('');
     setAutoExtractMsg('');
  };

  const getItemsToDelete = async (itemId: string): Promise<string[]> => {
     try {
       const allItems = await api.getLibrary();
       const itemsToDelete: string[] = [itemId];
       
       const findChildren = (id: string) => {
         const children = allItems.filter(item => item.parentId === id);
         for (const child of children) {
           itemsToDelete.push(child.id);
           if (child.isFolder) {
             findChildren(child.id);
           }
         }
       };
       
       findChildren(itemId);
       return itemsToDelete;
     } catch (err) {
       console.error("Error fetching children for delete", err);
       return [itemId];
     }
  };

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
     if (!window.confirm("Are you sure you want to permanently delete this? This action cannot be undone.")) return;
     try {
       setSubmitting(true);

       const idsToDelete = await getItemsToDelete(id);

       // Delete all items/folders in one single API request to avoid lock failures and ensure high speed!
       await api.deleteMultipleLibraryItems(idsToDelete);

       setDeleteItemId(null);
       handleRefreshFolder();
     } catch (err: any) {
       console.error(err);
       alert("Error deleting: " + String(err.message || err));
     } finally {
       setSubmitting(false);
     }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!editItemId || !editItemTitle.trim()) return;
     try {
        setSubmitting(true);
        await api.saveLibraryItem({ id: editItemId, title: editItemTitle.trim() } as any);
        setEditItemId(null);
        setEditItemTitle('');
        handleRefreshFolder();
     } catch (err: any) {
        alert("Error updating: " + String(err.message || err));
     } finally {
        setSubmitting(false);
     }
  };

  // Share logic
  const [currentSharedBatchIds, setCurrentSharedBatchIds] = useState<string[]>([]);
  const [shareBatchSettings, setShareBatchSettings] = useState<Record<string, { scheduledStartTime?: string }>>({});
  
  const openShareModal = async (item: LibraryItem) => {
     setSelectedItem(item);
     setIsShareModalOpen(true);
     setSubmitting(true);
     try {
         const alreadyAssignedBatches = batches.filter(b => b.assignedItemsMap && b.assignedItemsMap[item.id]);
         const batchIds = alreadyAssignedBatches.map(b => b.id);
         
         const alreadyAssigned = alreadyAssignedBatches.map(b => ({
            id: b.id + "_" + item.id,
            libraryItemId: item.id,
            batchId: b.id,
            scheduledStartTime: b.scheduledStartTimeMap?.[item.id] || ''
         }));
         
         setItemAssignments(alreadyAssigned);
         currentSharedBatchIds.length = 0;
         setCurrentSharedBatchIds(batchIds);
         
         const settingsList: Record<string, { scheduledStartTime?: string }> = {};
         alreadyAssigned.forEach(a => {
             if (a.scheduledStartTime) {
                 settingsList[a.batchId] = { scheduledStartTime: a.scheduledStartTime };
             }
         });
         setShareBatchSettings(settingsList);
     } catch (err: any) {
         console.error(err);
         alert("Could not load sharing data.");
     } finally {
         setSubmitting(false);
     }
  };

  const toggleBatchShare = (batchId: string) => {
     setCurrentSharedBatchIds(p => 
        p.includes(batchId) ? p.filter(x => x !== batchId) : [...p, batchId]
     );
  };

  const updateShareSetting = (batchId: string, scheduledStartTime: string) => {
     setShareBatchSettings(prev => ({
         ...prev,
         [batchId]: { ...prev[batchId], scheduledStartTime }
     }));
  };

  const handleSaveShare = async () => {
     if (!selectedItem) return;
     try {
        setSubmitting(true);
        
        const batchIdsMap: Record<string, boolean> = {};
        const scheduledStartTimeMap: Record<string, string> = {};
        
        batches.forEach(b => {
           const isShared = currentSharedBatchIds.includes(b.id);
           batchIdsMap[b.id] = isShared;
           
           if (isShared && shareBatchSettings[b.id]?.scheduledStartTime) {
              const localTimeStr = shareBatchSettings[b.id].scheduledStartTime;
              if (localTimeStr) {
                 // Convert the local picker time back to ISO string for storage
                 scheduledStartTimeMap[b.id] = new Date(localTimeStr).toISOString();
              }
           }
        });

        await api.shareLibraryItem(selectedItem.id, batchIdsMap, scheduledStartTimeMap);
        await fetchBatches();

        setIsShareModalOpen(false);
     } catch (err: any) {
        console.error(err);
        alert("Failed to save sharing: " + String(err.message || err));
     } finally {
        setSubmitting(false);
     }
  };

  if (previewItem) {
     return <UnifiedQuizPlayer exam={previewItem as any} onBack={() => setPreviewItem(null)} isPreview={true} />;
  }

  const breadcrumbs = folderBreadcrumbs.map(b => ({ id: b.id, title: b.title }));
  const currentItems = items.filter(i => {
    const parent = i.parentId === '' ? null : (i.parentId || null);
    return parent === currentFolderId;
  });
  const folders = currentItems.filter(i => i.isFolder).sort((a,b) => (a.title || '').localeCompare(b.title || ''));
  const getMs = (t: any) => {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (t.seconds) return t.seconds * 1000;
    return new Date(t).getTime() || 0;
  };
  const files = currentItems.filter(i => !i.isFolder).sort((a,b) => getMs(b.createdAt) - getMs(a.createdAt));

  const toggleMultipleAttempts = async (item: LibraryItem) => {
     try {
        setSubmitting(true);
        await api.saveLibraryItem({ 
           id: item.id, 
           allowMultipleAttempts: !(item as any).allowMultipleAttempts 
        } as any);
        handleRefreshFolder();
     } catch (err) {
        alert("Toggle failed: " + String(err));
     } finally {
        setSubmitting(false);
     }
  };

  const handleStartSession = async (batchId: string) => {
    if (!user || !sessionBatchPickerItem || startingSession) return;
    try {
      setStartingSession(true);
      const { sessionId, accessCode } = await createExamSession(
        sessionBatchPickerItem.id,
        batchId,
        user.uid,
        sessionRequireCode
      );
      setActiveSession({
        sessionId,
        accessCode,
        examId: sessionBatchPickerItem.id,
        examTitle: sessionBatchPickerItem.title,
        participantUids: [],
        codeEnabled: sessionRequireCode,
      });
      setIsSessionMinimized(false);
      setSessionBatchPickerItem(null);
      setSessionRequireCode(true); // reset for next time
      
      startActiveSessionPolling(sessionId);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert("Failed to start session: " + String(err));
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession || endingSession) return;
    try {
      setEndingSession(true);
      
      // Clear polling interval instantly to block any background state overrides
      if (activeSessionIntervalRef.current) {
        clearInterval(activeSessionIntervalRef.current);
        activeSessionIntervalRef.current = null;
      }
      
      const sessId = activeSession.sessionId;
      
      // Clear state instantly for immediate UI closure
      setActiveSession(null);
      
      // Remove from the local active sessions list immediately so it won't reappear
      setActiveSessionsList(prev => prev.filter(s => s.id !== sessId));
      
      // Proceed to notify spreadsheet database in background
      await endExamSession(sessId);
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setEndingSession(false);
    }
  };

  const handleBackNavigation = () => {
     if (currentFolderId) {
        if (folderBreadcrumbs.length > 0) {
            const newBc = [...folderBreadcrumbs];
            newBc.pop();
            setFolderBreadcrumbs(newBc);
            const parent = newBc.length > 0 ? newBc[newBc.length - 1] : null;
            setCurrentFolderId(parent ? parent.id : null);
        } else {
            setCurrentFolderId(null);
        }
     }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-4">
        <PageHeader 
           title="Central Library" 
           backTo="/admin" 
           onBack={currentFolderId ? handleBackNavigation : undefined} 
        />
      </div>
      
      {!activeSession && activeSessionsList.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-500 text-yellow-900 font-bold text-sm shadow-[4px_4px_0px_0px_rgba(234,179,8,1)] flex items-center justify-between">
           <div>
              <span className="mr-2">⚡</span>
              {activeSessionsList.length} টি Live Exam Session চলছে!
           </div>
           <div className="flex gap-2">
             {activeSessionsList.map(s => {
               const b = batches.find(bx => bx.id === s.batchId);
               return (
                 <button 
                   key={s.id}
                   onClick={() => {
                      const ex = items.find(i => i.id === s.examId);
                      setActiveSession({
                        sessionId: s.id,
                        accessCode: s.accessCode,
                        examId: s.examId,
                        examTitle: ex?.title || 'Unknown Exam',
                        participantUids: s.participantUids || [],
                        codeEnabled: s.codeEnabled ?? true
                      });
                      setIsSessionMinimized(false);
                      
                      startActiveSessionPolling(s.id);
                   }}
                   className="px-3 py-1 bg-yellow-500 text-black border border-black hover:bg-yellow-400 text-xs shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                 >
                   🎛️ Control Panel: {b?.name || s.batchId}
                 </button>
               )
             })}
           </div>
        </div>
      )}

      <div className="flex gap-2 items-center mb-6 overflow-x-auto text-sm font-bold pb-2 text-zinc-600 dark:text-zinc-400">
         <button onClick={() => { setCurrentFolderId(null); setFolderBreadcrumbs([]); }} className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 shrink-0">
            <Folder className="w-4 h-4"/> Home
         </button>
         {folderBreadcrumbs.map((bc, idx) => (
             <React.Fragment key={bc.id}>
                 <ChevronRight className="w-4 h-4 shrink-0" />
                 <button onClick={() => { setCurrentFolderId(bc.id); setFolderBreadcrumbs(prev => prev.slice(0, idx + 1)); }} className="hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0">
                    {bc.title}
                 </button>
             </React.Fragment>
         ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="font-black text-xl md:text-2xl uppercase">
           {currentFolderId && folderBreadcrumbs.length > 0 ? folderBreadcrumbs[folderBreadcrumbs.length - 1]?.title : 'Library Root'}
        </h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
             onClick={() => setIsFolderModalOpen(true)}
             className="flex-1 sm:flex-none justify-center bg-zinc-100 text-zinc-900 border-2 border-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-100 font-bold px-4 py-2 uppercase text-xs shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:-translate-y-0.5 transition-transform flex items-center gap-2"
          >
             <FolderPlus className="w-4 h-4" /> New Folder
          </button>
          <button 
             onClick={() => setIsUploadModalOpen(true)}
             className="flex-1 sm:flex-none justify-center bg-zinc-900 border-2 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 text-white font-bold px-4 py-2 uppercase text-xs shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:-translate-y-0.5 transition-transform flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 mb-8 gap-4">
        {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : folders.length === 0 && files.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-bold border-2 border-dashed border-zinc-300 dark:border-zinc-700">This folder is empty. Create a subfolder or upload items!</div>
        ) : (
            <>
               {folders.map((folder, index) => (
                  <div key={folder.id} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" onClick={(e) => {
                     if ((e.target as HTMLElement).closest('.action-btn')) return;
                     setCurrentFolderId(folder.id);
                     setFolderBreadcrumbs(prev => [...prev, folder]);
                  }}>
                     <div className="flex items-center gap-3 w-full">
                        <Folder className="w-6 h-6 text-blue-500 shrink-0" fill="currentColor" />
                        <h4 className="font-black text-lg truncate flex-1">{folder.title}</h4>
                     </div>
                     <div className="flex flex-wrap items-center gap-2">
                       <button onClick={() => openShareModal(folder)} className="action-btn flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 px-3 py-1.5 font-bold text-xs hover:bg-emerald-200 whitespace-nowrap">
                         <Share2 className="w-3.5 h-3.5" /> Share
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); setEditItemId(folder.id); setEditItemTitle(folder.title); }} className="action-btn flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900 px-3 py-1.5 font-bold text-xs hover:bg-blue-100 whitespace-nowrap">
                         <Pencil className="w-3.5 h-3.5" /> Edit
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }} disabled={submitting} className="action-btn flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900 px-3 py-1.5 font-bold text-xs hover:bg-red-100 ms-auto sm:ms-0">
                         {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                       </button>
                     </div>
                  </div>
               ))}
               
               {files.map((item, index) => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 p-4 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-black text-lg">{item.title}</h4>
                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-bold uppercase">
                      {item.type === 'exam' ? item.examType : 'PDF Note'}
                    </span>
                    {item.isChunked && (
                       <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded border border-red-800 font-bold uppercase">
                         WARNING: FILE EXHAUSTS QUOTA - PLEASE DELETE OR RE-UPLOAD AS GOOGLE DRIVE LINK
                       </span>
                    )}
                    {(item as any).isPasswordProtected && (
                       <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase ml-2 border border-red-200">
                         Password Protected
                       </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-bold">
                     Tracking ID: {item.trackingId || 'N/A'}
                  </div>
                  {item.type === 'exam' && (
                     <label className="flex items-center gap-2 cursor-pointer font-bold text-xs mt-2 text-zinc-600 dark:text-zinc-300">
                       <input type="checkbox" checked={!!(item as any).allowMultipleAttempts} onChange={() => toggleMultipleAttempts(item)} disabled={submitting} className="w-3.5 h-3.5 accent-zinc-900 dark:accent-zinc-100" />
                       Allow Multiple Attempts
                     </label>
                  )}
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                     <button onClick={() => openShareModal(item)} className="hover:underline">Manage Sharing</button>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {item.type === 'note' && item.contentUrl && (
                      <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 whitespace-nowrap">
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </a>
                  )}
                  {item.type === 'exam' && (
                     <>
                      {item.examType === 'Online Link' && item.contentUrl ? (
                         <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 whitespace-nowrap">
                           <Eye className="w-3.5 h-3.5" /> Preview
                         </a>
                      ) : (
                         <button onClick={() => handlePreviewItem(item)} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 whitespace-nowrap">
                           <Eye className="w-3.5 h-3.5" /> Preview
                         </button>
                      )}
                      <a href={`#/admin/results/${item.id}`} className="flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 px-3 py-1.5 font-bold text-xs hover:bg-blue-200 whitespace-nowrap">
                        <FileText className="w-3.5 h-3.5" /> Results
                      </a>
                      <button
                        onClick={() => {
                           setSessionBatchPickerItem(item);
                           const alreadyAssignedBatches = batches.filter(b => b.assignedItemsMap && b.assignedItemsMap[item.id]);
                           const alreadyAssigned = alreadyAssignedBatches.map(b => ({
                               id: b.id + "_" + item.id,
                               libraryItemId: item.id,
                               batchId: b.id,
                               scheduledStartTime: b.assignedItemsMap[item.id]
                           }));
                           setItemAssignments(alreadyAssigned);
                        }}
                        className="flex items-center gap-1 bg-green-400 border border-black font-bold text-xs px-3 py-1.5 shadow-[2px_2px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap text-black"
                        title="Start Exam Session"
                      >
                        ▶ Start Session
                      </button>
                     </>
                  )}
                  <button onClick={() => openShareModal(item)} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 px-3 py-1.5 font-bold text-xs hover:bg-emerald-200 whitespace-nowrap">
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button onClick={() => { setEditItemId(item.id); setEditItemTitle(item.title); }} className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900 px-3 py-1.5 font-bold text-xs hover:bg-blue-100 whitespace-nowrap">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={submitting} className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900 px-3 py-1.5 font-bold text-xs hover:bg-red-100 whitespace-nowrap ms-auto sm:ms-0">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                  </button>
               </div>
            </div>
        ))}
        </>
        )}
      </div>

      {editItemId && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 w-full max-w-md p-6 relative">
               <button onClick={() => { setEditItemId(null); setEditItemTitle(''); }} className="absolute top-4 right-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white border-2 border-zinc-900 dark:border-zinc-100 font-black px-2.5 py-0.5">X</button>
               <h2 className="text-xl font-black uppercase mb-4">Edit Resource Title</h2>
               
               <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                  <div>
                     <label className="block text-xs font-bold uppercase mb-1">New Title *</label>
                     <input type="text" value={editItemTitle} onChange={e => setEditItemTitle(e.target.value)} required className="w-full text-sm p-3 bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. History Notes Chapter 1" />
                  </div>
                  <button type="submit" disabled={submitting} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase py-4 border-2 border-transparent hover:-translate-y-0.5 transition-transform flex justify-center shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:shadow-[6px_6px_0px_0px_rgba(161,161,170,1)]">
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save Changes'}
                  </button>
               </form>
            </div>
         </div>
      )}

      {isFolderModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 w-full max-w-md p-6 relative">
               <button onClick={() => setIsFolderModalOpen(false)} className="absolute top-4 right-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white border-2 border-zinc-900 dark:border-zinc-100 font-black px-2.5 py-0.5">X</button>
               <h2 className="text-xl font-black uppercase mb-4">Create Folder</h2>
               
               <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold uppercase mb-1">Folder Name</label>
                     <input type="text" required value={folderName} onChange={e => setFolderName(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none" placeholder="e.g. GK Notes" />
                  </div>
                  <div className="pt-2 flex justify-end">
                     <button type="submit" disabled={submitting} className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-black uppercase tracking-wide border-2 border-zinc-900 dark:border-zinc-100 px-6 py-2 shadow-[2px_2px_0px_0px_rgba(161,161,170,1)] hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {isUploadModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 w-full max-w-lg p-6 flex flex-col max-h-[90vh] overflow-y-auto relative">
               <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white border-2 border-zinc-900 dark:border-zinc-100 font-black px-2.5 py-0.5">X</button>
               <h2 className="text-xl font-black uppercase mb-4">Upload to Library</h2>
               
               <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold uppercase mb-1">Title</label>
                     <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none" placeholder="e.g. English Grammar Chapter 1" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase mb-1">Tracking ID (Optional)</label>
                     <input type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none placeholder:opacity-50" placeholder="e.g. ENG-GRAM-001" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase mb-1">Material Type</label>
                     <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                          <input type="radio" checked={itemType === 'exam'} onChange={() => setItemType('exam')} className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100" />
                          <FileText className="w-4 h-4" /> Exam / Interactive Quiz
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                          <input type="radio" checked={itemType === 'note'} onChange={() => setItemType('note')} className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100" />
                          <FileDown className="w-4 h-4" /> PDF Note
                        </label>
                     </div>
                  </div>

                  {itemType === 'exam' && (
                     <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-700 mt-4 space-y-4">
                       <div>
                          <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Exam Type</label>
                          <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 focus:outline-none">
                             <option value="Bilingual MCQ">Bilingual MCQ (en/bn)</option>
                             <option value="Cloze Test">Cloze Test</option>
                             <option value="Error Correction">Error Correction</option>
                             <option value="Parajumble">Parajumble</option>
                             <option value="Comprehension">Comprehension</option>
                             <option value="Online Link">Online Link / GitHub</option>
                          </select>
                       </div>
                       
                       {examType !== 'Online Link' ? (
                       <>
                       <div className="grid grid-cols-3 gap-2">
                          <div>
                             <label className="block text-xs font-bold uppercase mb-1">Time (Mins)</label>
                             <input type="number" min="1" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold uppercase mb-1">+ Marks</label>
                             <input type="number" step="0.5" value={marksCorrect} onChange={e => setMarksCorrect(Number(e.target.value))} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold uppercase mb-1">- Marks</label>
                             <input type="number" step="0.25" value={marksWrong} onChange={e => setMarksWrong(Number(e.target.value))} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent" />
                          </div>
                       </div>
                       
                       <label className="flex items-center gap-2 cursor-pointer font-bold text-sm bg-zinc-100 dark:bg-zinc-800 p-3 border-2 border-zinc-900 dark:border-zinc-100">
                          <input type="checkbox" checked={allowMultipleAttempts} onChange={e => setAllowMultipleAttempts(e.target.checked)} className="w-5 h-5 accent-zinc-900 dark:accent-zinc-100" />
                          Allow Students to Re-take Exam Multiple Times
                       </label>

                       <div>
                          <label className="block text-xs font-bold uppercase mb-1 text-emerald-600 dark:text-emerald-400">1. Auto-extract via JS/HTML/JSON Upload</label>
                          <input type="file" accept=".js,.html,.json" onChange={handleFileExtraction} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:border-2 file:border-zinc-900 dark:file:border-zinc-100 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-900 dark:file:text-white file:font-bold file:uppercase file:text-xs" />
                          {autoExtractMsg && <div className="text-xs font-bold text-orange-600 mt-2 bg-orange-50 p-2 border border-orange-200">{autoExtractMsg}</div>}
                       </div>

                       <div>
                          <label className="block text-xs font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">2. Or Paste JSON Data</label>
                          <textarea value={quizData} onChange={e => setQuizData(e.target.value)} rows={4} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none font-mono text-xs" placeholder="[ { question_en: '...' } ]"></textarea>
                       </div>
                       </>
                       ) : (
                       <div>
                          <label className="block text-xs font-bold uppercase mb-1 text-purple-600 dark:text-purple-400">External Exam Link * (GitHub/Google Form)</label>
                          <input type="url" required value={contentUrl} onChange={e => setContentUrl(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-white dark:bg-zinc-900 focus:outline-none text-sm" placeholder="https://..." />
                          <p className="text-[10px] text-zinc-500 mt-1">Student click করলে browser-এ এই link open হবে</p>
                       </div>
                       )}
                     </div>
                  )}

                  {itemType === 'note' && (
                     <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-700 mt-4 space-y-4">
                        <div>
                           <label className="block text-xs font-bold uppercase mb-1">Upload PDF File</label>
                           <p className="text-xs text-zinc-500 mb-2">Note: Up to 5GB free spacing available. Secure viewing will protect this from external downloads.</p>
                           <input type="file" accept="application/pdf" onChange={handleFileExtraction} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:border-2 file:border-zinc-900 dark:file:border-zinc-100 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-900 dark:file:text-white file:font-bold file:uppercase file:text-xs" />
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="h-px bg-zinc-300 dark:bg-zinc-700 flex-1"></div>
                           <span className="text-xs font-bold uppercase text-zinc-400">OR</span>
                           <div className="h-px bg-zinc-300 dark:bg-zinc-700 flex-1"></div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase mb-1">Direct PDF Link</label>
                           <p className="text-xs text-zinc-500 mb-2">You can paste normal Google Drive links here, it will automatically be converted to a direct download link to save database consumption. The link will be opened directly.</p>
                           <input type="url" value={linkUrl} onChange={handleLinkUrlChange} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none" placeholder="https://..." />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase mb-1">PDF Password (Optional)</label>
                           <input type="text" value={pdfPassword} onChange={e => setPdfPassword(e.target.value)} className="w-full border-2 border-zinc-900 dark:border-zinc-100 p-2 bg-transparent focus:outline-none" placeholder="Encrypt PDF with this password" />
                           <p className="text-xs text-zinc-500 mt-1">If provided, the PDF will be encrypted so users must enter this password to view it after downloading.</p>
                        </div>
                     </div>
                  )}

                  <div className="pt-4 flex justify-between items-center">
                     {submitting && uploadProgress ? (
                        <div className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                           {uploadProgress}
                        </div>
                     ) : <div />}
                     <button type="submit" disabled={submitting} className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-black uppercase tracking-wide border-2 border-zinc-900 dark:border-zinc-100 px-6 py-3 shadow-[4px_4px_0px_0px_rgba(161,161,170,1)] hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save to Library
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {isShareModalOpen && selectedItem && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 w-full max-w-sm p-6 relative">
               <button onClick={() => setIsShareModalOpen(false)} disabled={submitting} className="absolute top-4 right-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white border-2 border-zinc-900 dark:border-zinc-100 font-black px-2.5 py-0.5">X</button>
               <h2 className="text-xl font-black uppercase mb-1 text-emerald-600">Share Item</h2>
               <p className="text-sm font-bold opacity-70 mb-4">{selectedItem.title}</p>
               
               <div className="space-y-2 mb-6 max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 p-2">
                  {batches.length === 0 ? <div className="text-sm text-center">No batches found</div> : null}
                  {batches.map(b => (
                     <div key={b.id} className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 last:border-0 border-2 border-transparent">
                        <label className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={currentSharedBatchIds.includes(b.id)}
                              onChange={() => toggleBatchShare(b.id)}
                              className="w-5 h-5 accent-emerald-600 cursor-pointer"
                           />
                           <span className="font-bold cursor-pointer">{b.name}</span>
                        </label>
                        {currentSharedBatchIds.includes(b.id) && selectedItem.type === 'exam' && (
                           <div className="pl-10 pr-2 pb-2">
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Scheduled Start Time</label>
                              <input 
                                 type="datetime-local" 
                                 value={formatToDatetimeLocal(shareBatchSettings[b.id]?.scheduledStartTime) || ''} 
                                 onChange={e => updateShareSetting(b.id, e.target.value)} 
                                 className="w-full text-xs p-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                              />
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               <div className="flex justify-end gap-2 text-sm font-bold">
                  <button onClick={() => setIsShareModalOpen(false)} disabled={submitting} className="px-4 border-2 border-zinc-900 dark:border-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
                  <button onClick={handleSaveShare} disabled={submitting} className="bg-emerald-500 text-white border-2 border-zinc-900 px-4 py-2 hover:bg-emerald-600 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center gap-2 disabled:opacity-50">
                     {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {sessionBatchPickerItem && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 w-full max-w-sm">
               <h2 className="text-xl font-black mb-4">Start Session</h2>
               <p className="text-sm font-bold mb-4 text-zinc-600 dark:text-zinc-400">Select which batch this session is for:</p>
               
               <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                 {batches.filter(b => itemAssignments.some(a => a.batchId === b.id)).map(b => (
                    <button
                      key={b.id}
                      disabled={startingSession}
                      onClick={() => handleStartSession(b.id)}
                      className="w-full text-left p-3 border-2 border-black hover:bg-zinc-100 font-bold dark:hover:bg-zinc-800 flex justify-between items-center disabled:opacity-50"
                    >
                      <span>{b.name}</span>
                      <span className="text-xs bg-black text-white px-2 py-1 flex items-center gap-1">
                          {startingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "▶ Start"}
                       </span>
                    </button>
                 ))}
                 {batches.filter(b => itemAssignments.some(a => a.batchId === b.id)).length === 0 && (
                   <p className="text-sm font-bold text-red-500">First share this exam to a batch.</p>
                 )}
               </div>
               <button onClick={() => setSessionBatchPickerItem(null)} disabled={startingSession} className="w-full py-2 border-2 border-black font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50">Cancel</button>
            </div>
         </div>
      )}

      {activeSession && (
         isSessionMinimized ? (
           <div className="fixed bottom-4 right-4 z-50 bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_black] p-4 text-black w-72 flex flex-col gap-2 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-sm uppercase truncate max-w-[150px]">{activeSession.examTitle}</h3>
                <button onClick={() => setIsSessionMinimized(false)} className="px-2 py-1 bg-white border-2 border-black text-xs font-bold shadow-[2px_2px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                  ↗ Maximize
                </button>
              </div>
              <div className="bg-black text-yellow-300 text-2xl font-black py-2 px-2 text-center border-4 border-black tracking-widest select-all">
                {activeSession.accessCode}
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs font-bold">{activeSession.participantUids.length} জন উপস্থিত</p>
                <button 
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="px-3 py-1 bg-red-500 border-2 border-black font-black text-white text-xs hover:bg-red-600 transition-colors shadow-[2px_2px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {endingSession ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" /> : "⏹"} End
                </button>
              </div>
           </div>
         ) : (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
           <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_black] p-8 max-w-md w-full text-center text-black">
             
             <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-black text-left leading-tight pr-4">{activeSession.examTitle}</h2>
                <button onClick={() => setIsSessionMinimized(true)} className="shrink-0 px-3 py-1 border-4 border-black bg-white hover:bg-zinc-100 font-bold text-sm shadow-[4px_4px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                  🗕 Minimize
                </button>
             </div>
             <p className="text-sm font-bold mb-6 opacity-70 text-left">SESSION ACTIVE</p>
             
             <div className="bg-black text-yellow-300 text-5xl font-black tracking-[0.3em] py-6 px-4 mb-4 border-4 border-black select-all">
                {activeSession.accessCode}
             </div>

             <div className="mb-6 flex flex-col gap-2">
                {/* Removed toggle code button */}
             </div>
             
             <div className="mb-6">
               <p className="text-lg font-bold">
                 {activeSession.participantUids.length} জন উপস্থিত
               </p>
             </div>
             
             <button 
               onClick={handleEndSession}
               disabled={endingSession}
               className="w-full py-3 bg-red-500 border-4 border-black font-black text-white text-xl shadow-[4px_4px_0px_black] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {endingSession ? <Loader2 className="w-6 h-6 animate-spin" /> : "⏹"} Session বন্ধ করুন
             </button>
             <p className="text-xs mt-3 opacity-60 font-bold">
               Session শেষ করলে নতুন ছাত্ররা আর enter করতে পারবে না
             </p>
           </div>
         </div>
         )
      )}

      {deleteItemId && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 w-full max-w-sm p-6 text-center">
               <h2 className="text-xl font-black uppercase mb-4 text-red-600">Confirm Deletion</h2>
               <p className="mb-6 font-bold text-sm text-zinc-600 dark:text-zinc-400">Are you sure? This will remove the item (and all contents if it is a folder) from the entire library and all batches.</p>
               <div className="flex justify-center gap-4">
                                    <button onClick={() => setDeleteItemId(null)} disabled={submitting} className="border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-black uppercase px-5 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={() => { if (deleteItemId) handleDelete(deleteItemId); }} disabled={submitting} className="border-2 border-red-600 bg-red-600 text-white font-black uppercase px-5 py-2 hover:bg-red-700 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                  </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}
