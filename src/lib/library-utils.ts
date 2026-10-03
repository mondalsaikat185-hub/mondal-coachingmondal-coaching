export function resolveFolderVis(folder: any, allItems: any[]): { exam: boolean, note: boolean } {
    if (folder.folderMode === 'EXAM') return { exam: true, note: false };
    if (folder.folderMode === 'NOTE') return { exam: false, note: true };
    
    // Helper to check descendants
    const hasExamDescendant = (parentId: string): boolean => {
        const children = allItems.filter(i => (i.parentId || null) === parentId);
        for (const child of children) {
            if (child.type === 'exam') return true;
            if ((child.isFolder || child.type === 'folder') && hasExamDescendant(child.id)) return true;
        }
        return false;
    };

    const hasNoteDescendant = (parentId: string): boolean => {
        const children = allItems.filter(i => (i.parentId || null) === parentId);
        for (const child of children) {
            if (child.type === 'note' || child.type === 'pdf') return true;
            if ((child.isFolder || child.type === 'folder') && hasNoteDescendant(child.id)) return true;
        }
        return false;
    };

    const isExam = hasExamDescendant(folder.id);
    const isNote = hasNoteDescendant(folder.id);

    if (isExam || isNote) {
        return { exam: isExam, note: isNote };
    }

    // If completely empty, inherit from ancestors
    let currentParentId = folder.parentId;
    while (currentParentId) {
        const parent = allItems.find(i => i.id === currentParentId);
        if (!parent) break;
        if (parent.folderMode === 'EXAM') return { exam: true, note: false };
        if (parent.folderMode === 'NOTE') return { exam: false, note: true };
        
        const parentHasExam = hasExamDescendant(parent.id);
        const parentHasNote = hasNoteDescendant(parent.id);
        if (parentHasExam || parentHasNote) {
            return { exam: parentHasExam, note: parentHasNote };
        }
        currentParentId = parent.parentId;
    }

    // Fallback based on title
    const title = (folder.title || '').toLowerCase();
    if (title.includes('exam') || title.includes('test') || title.includes('quiz') || title.includes('??????') || title.includes('???????')) {
        return { exam: true, note: false };
    }

    // Default for empty root folders with no special names
    return { exam: false, note: true };
}
