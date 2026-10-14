import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. State: if visibleCount not present, add it
    if 'const [visibleCount, setVisibleCount]' not in content:
        old_state_pattern = re.compile(r'(\s*const \[weeksToShow, setWeeksToShow\] = useState\(2\);\n)(\s*const libraryMode = \'(?:NOTE|EXAM)\';)')
        match = old_state_pattern.search(content)
        if match:
            indent = "  "
            new_state = (
                f"\n{indent}const [visibleCount, setVisibleCount] = useState(30);\n\n"
                f"{indent}useEffect(() => {{\n"
                f"{indent}  setVisibleCount(30);\n"
                f"{indent}}}, [currentFolderId, searchQuery, viewMode]);\n\n"
                f"{match.group(2)}"
            )
            content = content[:match.start()] + new_state + content[match.end():]
            print(f"Added visibleCount state in {file_path}")

    # 2. Folder files slice: {files.map((item, index) => ( -> {files.slice(0, visibleCount).map((item) => (
    if '{files.slice(0, visibleCount).map' not in content:
        content = re.sub(
            r'\{files\.map\(\(item,\s*index\)\s*=>\s*\(',
            '{files.slice(0, visibleCount).map((item) => (',
            content,
            count=1
        )
        print(f"Updated files.slice in {file_path}")

    # 3. Latest allFilesSorted slice: allFilesSorted.reduce -> allFilesSorted.slice(0, visibleCount).reduce
    if 'allFilesSorted.slice(0, visibleCount).reduce' not in content:
        content = content.replace(
            'allFilesSorted.reduce((acc: any, item) => {',
            'allFilesSorted.slice(0, visibleCount).reduce((acc: any, item) => {',
            1
        )
        print(f"Updated allFilesSorted.slice in {file_path}")

    # 4. Replace first "Load Older Materials" button with "আরও দেখুন" for folder files
    folder_btn_pattern = re.compile(
        r'(\s*<div className="flex justify-center mt-4">\s*<button\s*onClick=\{[^}]*setWeeksToShow[^}]*\}[\s\S]*?Load Older Materials[\s\S]*?</button>\s*</div>)(\s*</>\s*\)\s*:\s*\()'
    )
    m = folder_btn_pattern.search(content)
    if m:
        replacement = """
            {files.length > visibleCount && (
                <div className="flex justify-center mt-4 mb-4">
                    <button 
                       onClick={() => setVisibleCount(c => c + 30)}
                       className="px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 font-black text-sm uppercase bg-yellow-300 dark:bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] transition-all cursor-pointer"
                    >
                       আরও দেখুন ({files.length - visibleCount}টি বাকি)
                    </button>
                </div>
            )}""" + m.group(2)
        content = content[:m.start()] + replacement + content[m.end():]
        print(f"Updated folder button in {file_path}")

    # 5. Replace second "Load Older Materials" button with "আরও দেখুন" for latest allFilesSorted
    latest_btn_pattern = re.compile(
        r'(\s*<div className="flex justify-center mt-4">\s*<button\s*onClick=\{[^}]*setWeeksToShow[^}]*\}[\s\S]*?Load Older Materials[\s\S]*?</button>\s*</div>)(\s*</div>\s*\)\s*\})'
    )
    m2 = latest_btn_pattern.search(content)
    if m2:
        replacement2 = """
               {allFilesSorted.length > visibleCount && (
                  <div className="flex justify-center mt-4">
                     <button 
                        onClick={() => setVisibleCount(c => c + 30)}
                        className="px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 font-black text-sm uppercase bg-yellow-300 dark:bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(244,244,245,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(244,244,245,1)] transition-all cursor-pointer"
                     >
                        আরও দেখুন ({allFilesSorted.length - visibleCount}টি বাকি)
                     </button>
                  </div>
               )}""" + m2.group(2)
        content = content[:m2.start()] + replacement2 + content[m2.end():]
        print(f"Updated latest button in {file_path}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Saved {file_path} successfully!")

process_file('src/pages/StudentLibrary.tsx')
process_file('src/pages/StudentExams.tsx')
