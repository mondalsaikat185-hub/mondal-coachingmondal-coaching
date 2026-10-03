import re

for filename in ['src/pages/StudentExams.tsx', 'src/pages/StudentLibrary.tsx']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Import
    text = text.replace('import { useAuth } from \x22../components/AuthProvider\x22;', 'import { useAuth } from \x22../components/AuthProvider\x22;\nimport { resolveFolderMode } from \x22../lib/library-utils\x22;')

    # Replace usages
    text = text.replace('isFolderVisible(i, (libraryMode || \'NOTE\') as \'EXAM\' | \'NOTE\')', 'resolveFolderMode(i, allItems) === libraryMode')
    text = text.replace('isFolderVisible(i, libraryMode as \'EXAM\' | \'NOTE\')', 'resolveFolderMode(i, allItems) === libraryMode')
    text = text.replace('isFolderVisible(i, libraryMode)', 'resolveFolderMode(i, allItems) === libraryMode')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)
