// 🏷 Версії файлів у сторінках сайту (worker/.site/*.html): ?v=… → відбиток вмісту файлу.
// Змінився файл — змінилась версія (телефони беруть новий), не змінився — лишається в кеші. Руками ?v= піднімати не треба.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const D = process.argv[2] || 'worker/.site', h = f => createHash('md5').update(readFileSync(f)).digest('hex').slice(0, 8);
let n = 0;
for (const p of readdirSync(D).filter(f => f.endsWith('.html'))) {
  const s = readFileSync(`${D}/${p}`, 'utf8'), t = s.replace(/((?:src|href)=")([^"?#:]+)\?v=[^"]*"/g, (m, a, f) => { const x = `${D}/${f.replace(/^\//, '')}`; return existsSync(x) ? (n++, `${a}${f}?v=${h(x)}"`) : m; });
  if (t !== s) writeFileSync(`${D}/${p}`, t);
}
console.log(`🏷 Версії файлів: ${n}`);
