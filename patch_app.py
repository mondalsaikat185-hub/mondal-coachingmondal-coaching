import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add imports
text = re.sub(
    r'import \{ AdminLibrary \} from \x22\./pages/AdminLibrary\x22;',
    'import { AdminLibrary } from \x22./pages/AdminLibrary\x22;\nimport { AdminExams } from \x22./pages/AdminExams\x22;',
    text
)
text = re.sub(
    r'import \{ StudentLibrary \} from \x22\./pages/StudentLibrary\x22;',
    'import { StudentLibrary } from \x22./pages/StudentLibrary\x22;\nimport { StudentExams } from \x22./pages/StudentExams\x22;',
    text
)

# Fix Admin routes
admin_library_route = '''<Route
              path=\x22/admin/library\x22
              element={
                <ProtectedRoute adminOnly>
                  <AdminLibrary />
                </ProtectedRoute>
              }
            />'''
new_admin_routes = admin_library_route + '''
            <Route
              path=\x22/admin/exams\x22
              element={
                <ProtectedRoute adminOnly>
                  <AdminExams />
                </ProtectedRoute>
              }
            />'''
text = text.replace(admin_library_route, new_admin_routes)

# Fix Student routes
student_library_route = '''<Route
                path=\x22library\x22
                element={
                  <ProtectedRoute>
                    <StudentLibrary />
                  </ProtectedRoute>
                }
              />'''
new_student_routes = student_library_route + '''
              <Route
                path=\x22exams\x22
                element={
                  <ProtectedRoute>
                    <StudentExams />
                  </ProtectedRoute>
                }
              />'''
text = text.replace(student_library_route, new_student_routes)

# Remove the old dummy student exams route
old_dummy_route = '''<Route
                path=\x22exams\x22
                element={<Navigate to=\x22/student/library\x22 replace />}
              />'''
text = text.replace(old_dummy_route, '')

# Update Dashboard cards
text = re.sub(
    r'<h3 className=\x22font-black text-xl uppercase mb-1\x22>\s*Exam Engine\s*</h3>(.*?)to=\x22/admin/results\x22(.*?)>(\s*)View Results',
    lambda m: '<h3 className=\x22font-black text-xl uppercase mb-1\x22>\n                  Exam Engine\n                </h3>' + m.group(1) + 'to=\x22/admin/exams\x22' + m.group(2) + '>' + m.group(3) + 'Open Exams',
    text,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
