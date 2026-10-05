// src/lib/library-split.ts
// Pure logic module for Library: Notes vs Exams split (R20).
// NO React, NO fetch.

export type ItemSide = 'exam' | 'note' | 'folder';

export interface LibrarySplitItem {
  id: string;
  title?: string;
  type?: string;
  isFolder?: boolean | string;
  parentId?: string | null;
  [key: string]: any;
}

export interface BatchItem {
  id: string;
  name?: string;
  assignedItemsMap?: Record<string, any> | string;
  scheduledStartTimeMap?: Record<string, any> | string;
  [key: string]: any;
}

/**
 * Rule 1: A FILE's side is decided by its own `type`, never by its folder:
 * - `type === "exam"` -> Exams side
 * - `type === "note"` or `"pdf"` -> Notes side
 * - folders return 'folder'
 */
export function sideOf(item: LibrarySplitItem | null | undefined): ItemSide {
  if (!item) return 'note';
  const isFolder = item.type === 'folder' || item.isFolder === true || String(item.isFolder).toLowerCase() === 'true';
  if (isFolder) return 'folder';
  if (item.type === 'exam') return 'exam';
  return 'note';
}

/**
 * Rule 3 & 5: Student & Admin visibility.
 * - If studentBatchIds is null (admin) -> sees ALL item IDs.
 * - If studentBatchIds is string/array -> sees an item if the item itself OR any folder above it
 *   is in assignedItemsMap of any of the student's batches. Ancestor folders are also added
 *   so the student can navigate down the folder tree.
 */
export function visibleIds(
  items: LibrarySplitItem[],
  batches: BatchItem[],
  studentBatchIds: string[] | string | null
): Set<string> {
  const allIds = new Set(items.map(i => i.id));
  if (studentBatchIds === null) {
    return allIds;
  }

  const batchIdList: string[] = Array.isArray(studentBatchIds)
    ? studentBatchIds.map(s => String(s).trim()).filter(Boolean)
    : typeof studentBatchIds === 'string'
    ? studentBatchIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  if (batchIdList.length === 0) {
    return new Set<string>();
  }

  const myBatches = batches.filter(b => batchIdList.includes(b.id));

  // Collect assigned item IDs from batch maps
  const assignedIds = new Set<string>();
  for (const b of myBatches) {
    let map = b.assignedItemsMap;
    if (typeof map === 'string') {
      try { map = JSON.parse(map || '{}'); } catch (e) { map = {}; }
    }
    if (map && typeof map === 'object') {
      for (const id of Object.keys(map)) {
        if (allIds.has(id)) {
          assignedIds.add(id);
        }
      }
    }
  }

  // Pre-build child map for O(N) traversal
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  for (const item of items) {
    if (item.parentId) {
      parentMap.set(item.id, item.parentId);
      const kids = childrenMap.get(item.parentId) || [];
      kids.push(item.id);
      childrenMap.set(item.parentId, kids);
    }
  }

  const visible = new Set<string>();

  // Add assigned items and all their descendants below them
  const queue = Array.from(assignedIds);
  for (const id of queue) {
    visible.add(id);
  }

  while (queue.length > 0) {
    const currId = queue.pop()!;
    const kids = childrenMap.get(currId);
    if (kids) {
      for (const kidId of kids) {
        if (!visible.has(kidId)) {
          visible.add(kidId);
          queue.push(kidId);
        }
      }
    }
  }

  // Add ancestors of all visible items so navigation/breadcrumbs work
  const visibleArray = Array.from(visible);
  for (const id of visibleArray) {
    let pId = parentMap.get(id);
    let depth = 0;
    while (pId && !visible.has(pId) && depth < 30) {
      visible.add(pId);
      pId = parentMap.get(pId);
      depth++;
    }
  }

  return visible;
}

/**
 * Rules 1 & 2: Build the items for a specific side ('exam' or 'note').
 * 1. A file belongs to the side if sideOf(file) === side.
 * 2. A folder appears on a side ONLY if it contains (at any depth) at least one visible file of that side.
 */
export function buildSide(
  items: LibrarySplitItem[],
  visible: Set<string>,
  side: 'exam' | 'note'
): { folders: LibrarySplitItem[]; files: LibrarySplitItem[] } {
  const itemMap = new Map<string, LibrarySplitItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  // 1. Visible files on this side
  const files: LibrarySplitItem[] = [];
  for (const item of items) {
    if (visible.has(item.id) && sideOf(item) === side) {
      files.push(item);
    }
  }

  // 2. Folders containing at least one visible file of this side at any depth
  const folderIdsWithSideFiles = new Set<string>();
  for (const file of files) {
    let pId = file.parentId;
    let depth = 0;
    while (pId && depth < 30) {
      if (folderIdsWithSideFiles.has(pId)) {
        // Ancestors already added
        break;
      }
      const parent = itemMap.get(pId);
      if (!parent) break;
      if (sideOf(parent) === 'folder') {
        folderIdsWithSideFiles.add(parent.id);
      }
      pId = parent.parentId;
      depth++;
    }
  }

  // Identify root "STUDENT'S EXAM" folder if present
  const isStudentsExamRoot = (f: LibrarySplitItem) => {
    if (sideOf(f) !== 'folder') return false;
    if (f.parentId && f.parentId !== '') return false;
    const t = (f.title || '').trim().toUpperCase();
    return f.id === 'SR7Ee9hMJHL2VDqXCnE9' || t === "STUDENT'S EXAM" || t === 'STUDENT EXAM' || t.includes("STUDENT'S EXAM");
  };

  const studentsExamRoot = items.find(isStudentsExamRoot);

  const EXAM_LABEL_MAP: Record<string, string> = {
    'English': 'English Exam',
    'Math': 'Advance Math Exam',
    'Reasoning': 'Reasoning Exam',
    'GK': 'GK Exam'
  };

  const folders: LibrarySplitItem[] = [];
  for (const id of folderIdsWithSideFiles) {
    const folder = itemMap.get(id);
    if (!folder || !visible.has(folder.id)) continue;

    // Flatten root "STUDENT'S EXAM"
    if (studentsExamRoot && folder.id === studentsExamRoot.id) {
      // Exclude root "STUDENT'S EXAM" on both notes and exams side
      continue;
    }

    if (studentsExamRoot && folder.parentId === studentsExamRoot.id) {
      if (side === 'note') {
        // R23 Item 1: on 'note' side, child folder (GK) shows directly top-level as "GK Notes"
        folders.push({
          ...folder,
          parentId: null,
          title: (folder.title === 'GK' || folder.id === 'hjnyiV4Lw3aEhJagLTpa') ? 'GK Notes' : (folder.title?.includes('Notes') ? folder.title : `${folder.title} Notes`)
        });
      } else {
        // R23 Item 3: on 'exam' side, flatten English, Math, Reasoning, GK to top-level
        const newTitle = EXAM_LABEL_MAP[folder.title || ''] || (folder.title?.includes('Exam') ? folder.title : `${folder.title} Exam`);
        folders.push({
          ...folder,
          parentId: null,
          title: newTitle
        });
      }
      continue;
    }

    if (side === 'exam' && (folder.title === "Math's Sheet" || folder.id === 'c9SYtn8GIBtPWwzl1hCO')) {
      folders.push({
        ...folder,
        title: 'Math Exam',
      });
      continue;
    }

    folders.push(folder);
  }

  return { folders, files };
}
