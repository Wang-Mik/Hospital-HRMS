import fs from 'fs';
import path from 'path';

function findParenthesesInJsx(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === 'dist' || f === '.git') continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      findParenthesesInJsx(full);
    } else if (/\.(tsx|jsx)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // match text within JSX containing parentheses e.g. > ... ( ... ) ... < or title="..." or placeholder="..."
        // Ignore lines that only have JS function calls inside {...}
        // Match literal text node with (annotation) or string literals with (annotation)
        const strippedJsxExpressions = line.replace(/\{[^{}]*\}/g, '');
        const matches = strippedJsxExpressions.match(/>([^<]*\([a-zA-Z0-9\sÀ-ỹ/_\-–—\.]+\)[^<]*)<|title="([^"]*\([a-zA-Z0-9\sÀ-ỹ/_\-–—\.]+\)[^"]*)"|placeholder="([^"]*\([a-zA-Z0-9\sÀ-ỹ/_\-–—\.]+\)[^"]*)"/g);
        if (matches) {
          matches.forEach(m => {
            console.log(`${path.basename(full)}:${idx + 1}: ${m}`);
          });
        }
      });
    }
  }
}

console.log('--- FINDING PARENTHESES ANNOTATIONS IN FRONTEND ---');
findParenthesesInJsx('frontend/src');
