export function resolveFolderVis(folder: any, allItems: any[]): { exam: boolean, note: boolean } {
    // 1. Explicit mode set by new UI
    if (folder.folderMode === 'EXAM') return { exam: true, note: false };
    if (folder.folderMode === 'NOTE') return { exam: false, note: true };
    
    // 2. Find the absolute ROOT folder of this item
    let rootFolder = folder;
    let maxDepth = 20; // safety
    while (rootFolder.parentId && maxDepth > 0) {
        const parent = allItems.find(i => i.id === rootFolder.parentId);
        if (!parent) break; // orphaned or root not loaded
        rootFolder = parent;
        maxDepth--;
    }

    // 3. Check explicit mode on the root folder
    if (rootFolder.folderMode === 'EXAM') return { exam: true, note: false };
    if (rootFolder.folderMode === 'NOTE') return { exam: false, note: true };

    // 4. Look at the ROOT folder's title. As explicitly requested by the user:
    // Only the folder named Student Exam (or containing exam/test/quiz/??????) goes to Exams.
    // Everything else goes to Notes.
    const title = (rootFolder.title || '').toLowerCase();
    const isExamRoot = title.includes('exam') || title.includes('test') || title.includes('quiz') || title.includes('??????') || title.includes('???????');

    if (isExamRoot) {
        return { exam: true, note: false };
    } else {
        return { exam: false, note: true };
    }
}
