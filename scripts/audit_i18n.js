import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'frontend', 'src');

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (!file.includes('translations.ts')) results.push(fullPath);
    }
  }
  return results;
}

const files = walk(srcDir);
const summary = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let count = 0;
  const samples = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    
    // Remove t('...', '...') and t('...')
    const withoutT = line
      .replace(/t\(\s*'[^']+'\s*,\s*'[^']*'\s*\)/g, '')
      .replace(/t\(\s*"[^"]+"\s*,\s*"[^"]*"\s*\)/g, '')
      .replace(/t\(\s*'[^']+'\s*\)/g, '')
      .replace(/t\(\s*"[^"]+"\s*\)/g, '');

    if (VIETNAMESE_REGEX.test(withoutT)) {
      count++;
      if (samples.length < 5) {
        samples.push(`L${i+1}: ${line}`);
      }
    }
  }
  if (count > 0) {
    summary.push({
      file: path.relative(srcDir, file),
      count,
      samples
    });
  }
}

summary.sort((a,b) => b.count - a.count);
console.log('=== SUMMARY OF FILES WITH HARDCODED VIETNAMESE ===');
console.table(summary.map(s => ({ File: s.file, 'Hardcoded Lines': s.count })));
for (const s of summary) {
  if (s.count <= 10) {
    console.log(`\nSamples for ${s.file}:`);
    s.samples.forEach(samp => console.log('  ', samp));
  }
}
const total = summary.reduce((acc, s) => acc + s.count, 0);
console.log('\nTOTAL HARDCODED LINES:', total);
