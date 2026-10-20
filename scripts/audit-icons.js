import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'frontend', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== 'dist') {
      results = results.concat(walk(full));
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(srcDir);
const iconMap = {};
const fileIconMap = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lucideMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g);
  const relFile = path.relative(srcDir, file);
  fileIconMap[relFile] = [];

  for (const match of lucideMatches) {
    const names = match[1]
      .split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);

    names.forEach(n => {
      if (!iconMap[n]) iconMap[n] = [];
      if (!iconMap[n].includes(relFile)) iconMap[n].push(relFile);
      if (!fileIconMap[relFile].includes(n)) fileIconMap[relFile].push(n);
    });
  }
}

console.log('=== TOTAL UNIQUE ICONS:', Object.keys(iconMap).length);
console.log('\n=== COMPLETE LIST OF ALL ICONS SORTED BY FREQUENCY ===');
const sorted = Object.entries(iconMap).sort((a, b) => b[1].length - a[1].length);
sorted.forEach(([icon, fileList]) => {
  console.log(`${icon.padEnd(20)} (${fileList.length} files): ${fileList.join(', ')}`);
});
