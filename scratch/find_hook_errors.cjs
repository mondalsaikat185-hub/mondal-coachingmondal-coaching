const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inComponent = false;
    let hookCount = 0;
    let foundEarlyReturn = false;
    let lastEarlyReturnLine = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/function [A-Z]/) || line.match(/const [A-Z][a-zA-Z0-9]* = \(/) || line.match(/export function [A-Z]/)) {
            inComponent = true;
            hookCount = 0;
            foundEarlyReturn = false;
        }

        if (inComponent) {
            if (line.match(/^\s*if\s*\(.*return\b/)) {
                foundEarlyReturn = true;
                lastEarlyReturnLine = i + 1;
            } else if (line.match(/^\s*if\s*\(.*\)\s*\{\s*$/)) {
                // simple block check - very naive
                if (lines[i+1] && lines[i+1].match(/^\s*return\b/)) {
                    foundEarlyReturn = true;
                    lastEarlyReturnLine = i + 2;
                }
            }

            if (line.match(/\buse(State|Effect|Memo|Ref|Callback|Context)\b/)) {
                if (foundEarlyReturn) {
                    console.log(`\n🚨 POTENTIAL HOOK ERROR in ${filePath}`);
                    console.log(`   Early return around line ${lastEarlyReturnLine}`);
                    console.log(`   Hook called at line ${i + 1}: ${line.trim()}`);
                    foundEarlyReturn = false; // Reset to find more
                }
            }
        }
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            checkFile(fullPath);
        }
    });
}

walk('src');
console.log("Done checking!");
