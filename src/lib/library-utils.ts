export function resolveFolderMode(folder: any, allItems: any[]): 'EXAM' | 'NOTE' {
    if (folder.folderMode === 'EXAM') return 'EXAM';
    if (folder.folderMode === 'NOTE') return 'NOTE';
    
    // Legacy folder fallback: check descendants recursively
    const hasExamDescendant = (parentId: string): boolean => {
        const children = allItems.filter(i => (i.parentId || null) === parentId);
        for (const child of children) {
            if (child.type === 'exam') return true;
            if ((child.isFolder || child.type === 'folder') && hasExamDescendant(child.id)) return true;
        }
        return false;
    };
    
    return hasExamDescendant(folder.id) ? 'EXAM' : 'NOTE';
}