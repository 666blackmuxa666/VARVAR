// 🛡 Швидка перевірка без сервера (~3 с): ловить типові поломки ДО тестів. Запускається з tools/test.sh.
//  1) каса: два розділи js/pos/*.js оголосили ту саму назву (спільна функція → тихо перетирає одна одну);
//  2) каса: синтаксис усіх розділів;
//  3) сервер: синтаксис і імпорти — import { X } з файлу, де X немає (впало б лише на живому запиті);
//  4) фронт (js/*.js): синтаксис;
//  5) обірвані ланцюжки (tools/audit-static.mjs): кнопка без обробника, op без case на сервері;
//  6) сервер: забутий import у частинах ops-*/bot-* (tools/undef.mjs) — інакше ReferenceError лише на живому запиті.
// node tools/check.mjs → код 1, якщо щось не так.
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url)), T = mkdtempSync(tmpdir() + '/varvar-check-'), bad = [];
const eb = (args, what) => { try { execSync(`npx esbuild ${args} --log-level=error --outdir=${T}/o`, { cwd: R, stdio: 'pipe' }); } catch (e) { bad.push(`❌ ${what}\n` + String(e.stderr || e.stdout).split('\n').filter(l => l.trim()).slice(0, 8).join('\n')); } };

// 1–2) каса: розділи як один модуль — у модулі повторне оголошення є помилкою (у звичайній функції — ні)
const parts = readdirSync(R + 'js/pos').filter(f => /^\d.*\.js$/.test(f)).sort();
writeFileSync(`${T}/pos.mjs`, parts.map(f => `\n// ===== ${f} =====\n` + readFileSync(`${R}js/pos/${f}`, 'utf8')).join(''));
eb(`${T}/pos.mjs --format=esm`, 'каса (js/pos/*.js): дубль назви або синтаксис — у якому розділі, видно за «===== файл =====» вище рядка');

// 3) сервер: збірка з усіма import() — перевіряє, що кожен імпортований експорт існує
eb(`worker/src/index.js --bundle --format=esm --platform=neutral '--external:cloudflare:*' '--external:node:*'`, 'сервер (worker/src): синтаксис або імпорт неіснуючої назви');

// 4) фронт
eb(readdirSync(R + 'js').filter(f => f.endsWith('.js') && f !== 'pos.build.js').map(f => 'js/' + f).join(' '), 'фронт js/*.js: синтаксис');

// 5) обірвані ланцюжки
for (const t of ['audit-static', 'undef']) try { execSync(`node tools/${t}.mjs`, { cwd: R, stdio: 'pipe' }); } catch (e) { bad.push(String(e.stdout).trim()); }

// 6) 📴 каса без звʼязку: кожен файл, який підвантажує pos.html, має бути в передкеші pos-sw.js (інакше перезавантаження офлайн ламає касу)
{ const sw = readFileSync(R + 'pos-sw.js', 'utf8'), pre = new Set(JSON.parse(sw.match(/const PRE = (\[[^\]]*\])/)[1].replace(/'/g, '"')));
  const need = [...readFileSync(R + 'pos.html', 'utf8').matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => !pre.has(f));
  const gone = [...pre].filter(f => !existsSync(R + f));
  if (need.length) bad.push('❌ pos-sw.js: немає в передкеші (додайте в PRE): ' + need.join(', '));
  if (gone.length) bad.push('❌ pos-sw.js: у передкеші неіснуючі файли: ' + gone.join(', ')); }

try { execSync('node tools/map.mjs', { cwd: R, stdio: 'pipe' }); } catch {} // 🗺 оновити карту коду
rmSync(T, { recursive: true, force: true });
console.log(bad.length ? bad.join('\n\n') + `\n\n🛡 Перевірка: ❌ ${bad.length}` : `🛡 Перевірка: ✅ (розділів каси ${parts.length}, сервер, імпорти, фронт, ланцюжки)`);
process.exit(bad.length ? 1 : 0);
