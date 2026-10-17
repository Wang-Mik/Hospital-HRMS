import fs from 'fs';
import path from 'path';

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Please specify file path');
  process.exit(1);
}

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

const content = fs.readFileSync(fileArg, 'utf8');
const lines = content.split('\n');

const startLine = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
const endLine = process.argv[4] ? parseInt(process.argv[4], 10) : lines.length;

lines.forEach((rawLine, idx) => {
  const lineNum = idx + 1;
  if (lineNum < startLine || lineNum > endLine) return;
  const line = rawLine.trim();
  if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) return;
  const withoutT = rawLine
    .replace(/t\(\s*'[^']+'\s*,\s*'[^']*'\s*\)/g, '')
    .replace(/t\(\s*"[^"]+"\s*,\s*"[^"]*"\s*\)/g, '')
    .replace(/t\(\s*'[^']+'\s*\)/g, '')
    .replace(/t\(\s*"[^"]+"\s*\)/g, '');
  if (VIETNAMESE_REGEX.test(withoutT)) {
    console.log(`L${lineNum}: ${line}`);
  }
});
