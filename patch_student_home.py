with open('src/components/student/StudentHome.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('to=\x22/student/library?kind=exam\x22', 'to=\x22/student/exams\x22')
text = text.replace('to=\x22/student/library?kind=note\x22', 'to=\x22/student/library\x22')

with open('src/components/student/StudentHome.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
