const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const dist = join(process.cwd(), 'dist');
const indexPath = join(dist, 'index.html');
const notFoundPath = join(dist, '404.html');

if (!existsSync(indexPath)) {
  console.error('[copy-404] dist/index.html chưa được build. Hãy chạy vite build trước.');
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');
writeFileSync(notFoundPath, html, 'utf8');
console.log('[copy-404] Đã tạo dist/404.html từ dist/index.html');


