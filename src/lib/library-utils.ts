const STUDENT_EXAM_ROOT_ID = 'SR7Ee9hMJHL2VDqXCnE9';

export function resolveFolderVis(item: any, allItems: any[]): { exam: boolean, note: boolean } {
  if (!item) return { exam: false, note: false };

  // 1. Explicit folder mode if set on this item
  if (item.folderMode === 'EXAM') return { exam: true, note: false };
  if (item.folderMode === 'NOTE') return { exam: false, note: true };

  // 2. Trace up to the top-level (root) ancestor
  let root = item;
  let maxDepth = 25;
  while (root.parentId && maxDepth > 0) {
    const parent = allItems.find(i => i.id === root.parentId);
    if (!parent) break;
    root = parent;
    maxDepth--;
  }

  // 3. Explicit folder mode on the root ancestor
  if (root.folderMode === 'EXAM') return { exam: true, note: false };
  if (root.folderMode === 'NOTE') return { exam: false, note: true };

  // 4. Exact check for STUDENT'S EXAM root (by ID or root title)
  const rootTitle = (root.title || '').trim().toUpperCase();
  const isExam = root.id === STUDENT_EXAM_ROOT_ID ||
                 rootTitle.includes("STUDENT'S EXAM") ||
                 rootTitle.includes("STUDENT EXAM");

  return isExam ? { exam: true, note: false } : { exam: false, note: true };
}
