import fs from 'fs';
import path from 'path';

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === 'dist' || f === '.git') continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scan(full);
    } else if (/\.(tsx|jsx|html)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/alt=/i.test(line)) {
          console.log(`[ALT] ${full}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('--- SCANNING ALT TAGS ---');
scan('frontend/src');
