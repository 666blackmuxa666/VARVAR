// 🛟 База знань ШІ бота підтримки ← уроки каси (js/pos/95-course.js), кабінету (js/owner-course.js) і FAQ. Запускається з build-pos.sh.
import { readFileSync, writeFileSync } from 'fs';
const R = { w: 'Офіціант', a: 'Адмін', k: 'Кухар', c: 'Кур\'єр', o: 'Власник' }, q = s => s.replace(/\\'/g, "'");
const out = ['# Каса (уроки)'];
for (const b of readFileSync('js/pos/95-course.js', 'utf8').split(/\{ id: '/).slice(1)) {
  const n = /n: '((?:\\'|[^'])*)'/.exec(b), r = /r: '(\w)'/.exec(b); if (!n) continue;
  const st = [...b.matchAll(/\bt: '((?:\\'|[^'])*)'/g)].map(m => q(m[1]));
  out.push(`## ${q(n[1])}${r && R[r[1]] ? ' (' + R[r[1]] + ')' : ''}\n${st.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
}
const oc = readFileSync('js/owner-course.js', 'utf8'), L = Function('return ' + oc.slice(oc.indexOf('const L = [') + 10, oc.indexOf('\n  ];', oc.indexOf('const L = [')) + 4))();
out.push('# Кабінет власника → Налаштування');
for (const [, , n, s] of L) out.push(`## ${n}\n${s.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
out.push('# Часті питання');
for (const l of readFileSync('_team/marketing-faq.md', 'utf8').split('\n')) if (/^\d+\. \*\*/.test(l)) out.push(l.replace(/\*\*/g, '').replace(/\s*🔎[^.]*\.?/g, '').replace(/^\d+\. /, '- '));
const kb = out.join('\n').replace(/<[^>]+>/g, '');
writeFileSync('worker/src/supkb.js', `// Згенеровано tools/supkb.mjs — не правити руками.\nexport const KB = ${JSON.stringify(kb)};\n`);
console.log('✅ supkb', kb.length, 'симв.');
