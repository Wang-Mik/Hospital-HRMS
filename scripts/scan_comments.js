import fs from 'fs';
import path from 'path';

function scanComments(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === 'dist' || f === '.git') continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanComments(full);
    } else if (/\.(js|ts|tsx|html|css)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Check single line comment // or block comment /* or <!--
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--')) {
          if (/\b(agent|agents|ai|gpt|copilot|gemini|claude|bot|bots|prompt|prompts|assistant|assistants|deepmind)\b/i.test(trimmed)) {
            console.log(`[COMMENT] ${full}:${idx + 1}: ${trimmed}`);
          }
        }
      });
    }
  }
}

console.log('--- SCANNING COMMENTS FOR AI/AGENT ---');
scanComments('frontend/src');
scanComments('monolith-backend/src');
scanComments('scripts');
