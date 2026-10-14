import sqlite3
import json

con = sqlite3.connect('_dbcopy/r33_pilot.db')
cur = con.cursor()
cur.execute("SELECT data FROM rows WHERE sheet = 'users' AND json_extract(data, '$.phone') = '9999999901'")
row = cur.fetchone()
if row:
    d = json.loads(row[0])
    print('Passcode:', d.get('passcode'))
    print('Role:', d.get('role'))
    print('Status:', d.get('status'))
    print('TokenVersion:', d.get('tokenVersion'), d.get('tv'))
    print('ID:', d.get('id'))
    print('BatchId:', d.get('batchId'))
