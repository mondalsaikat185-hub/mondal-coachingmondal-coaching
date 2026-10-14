import subprocess
import os
import sqlite3

VPS_HOST = "root@187.127.191.163"
LOCAL_TARGET = "_dbcopy/r40_live.db"

print("1. Creating read-only atomic VACUUM snapshot on VPS...")
remote_cmd = (
    "python3 -c \""
    "import sqlite3, os; "
    "p = '/tmp/mc2_r40_snapshot.db'; "
    "os.remove(p) if os.path.exists(p) else None; "
    "con = sqlite3.connect('/root/smartqueue-stack/mc-api-v2/data/mc2.db'); "
    "con.execute(f\\\"VACUUM INTO '{p}'\\\"); "
    "con.close(); "
    "print('Snapshot size:', os.path.getsize(p))"
    "\""
)

res = subprocess.run(["ssh", "-n", VPS_HOST, remote_cmd], capture_output=True, text=True)
if res.returncode != 0:
    print("STDERR:", res.stderr)
    raise RuntimeError(f"Snapshot creation failed: {res.stderr}")
print(res.stdout.strip())

print(f"2. Downloading snapshot to {LOCAL_TARGET}...")
if os.path.exists(LOCAL_TARGET):
    os.remove(LOCAL_TARGET)

dl_res = subprocess.run(["scp", f"{VPS_HOST}:/tmp/mc2_r40_snapshot.db", LOCAL_TARGET], capture_output=True, text=True)
if dl_res.returncode != 0:
    print("STDERR:", dl_res.stderr)
    raise RuntimeError(f"SCP download failed: {dl_res.stderr}")
print(f"Downloaded {LOCAL_TARGET}: {os.path.getsize(LOCAL_TARGET)} bytes")

print("3. Removing remote temporary snapshot...")
subprocess.run(["ssh", "-n", VPS_HOST, "rm -f /tmp/mc2_r40_snapshot.db"], capture_output=True)

print("4. Verifying read-only local snapshot...")
con = sqlite3.connect(LOCAL_TARGET)
cur = con.cursor()
cur.execute("SELECT sheet, count(*) FROM rows GROUP BY sheet ORDER BY sheet")
counts = dict(cur.fetchall())
con.close()
print("Live DB row counts:", counts)
print(">>> Live snapshot ready for independent comparison.")
