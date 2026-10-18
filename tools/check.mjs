// 🛡 Швидка перевірка без сервера (~3 с): ловить типові поломки ДО тестів. Запускається з tools/test.sh.
//  1) каса: два розділи js/pos/*.js оголосили ту саму назву (спільна функція → тихо перетирає одна одну);
//  2) каса: синтаксис усіх розділів;
//  3) сервер: синтаксис і імпорти — import { X } з файлу, де X немає (впало б лише на живому запиті);
//  4) фронт (js/*.js): синтаксис;
//  5) обірвані ланцюжки (tools/audit-static.mjs): кнопка без обробника, op без case на сервері.
// node tools/check.mjs → код 1, якщо щось не так.
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
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
try { execSync('node tools/audit-static.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { bad.push(String(e.stdout).trim()); }

try { execSync('node tools/map.mjs', { cwd: R, stdio: 'pipe' }); } catch {} // 🗺 оновити карту коду
rmSync(T, { recursive: true, force: true });
console.log(bad.length ? bad.join('\n\n') + `\n\n🛡 Перевірка: ❌ ${bad.length}` : `🛡 Перевірка: ✅ (розділів каси ${parts.length}, сервер, фронт, ланцюжки)`);
process.exit(bad.length ? 1 : 0);
