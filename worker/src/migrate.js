// 🧬 Міграції даних закладу: коли змінюється формат даних, кожен заклад САМ оновлюється при першому зверненні
// після викладання (store.js). Номер версії — ключ schema у базі закладу (потрапляє в бекап: відновили старий бекап → міграції
// пройдуть ще раз). Правила: міграцію ніколи не змінюють і не видаляють після викладання — лише додають нову з більшим v;
// кожна має бути безпечною на порожньому закладі й при повторному запуску; одна міграція = одна коротка дія.
//   { v: 1, name: 'що робить', run: async env => { … } }
export const MIGRATIONS = [];
export const SCHEMA = MIGRATIONS.reduce((m, x) => Math.max(m, x.v), 0);

export async function migrate(env) {
  let cur = +(await env.DB.get('schema')) || 0; if (cur >= SCHEMA) return cur;
  for (const m of MIGRATIONS.filter(x => x.v > cur).sort((a, b) => a.v - b.v)) {
    try { await m.run(env); } catch (e) { console.log('migrate', m.v, m.name, e.message); return cur; } // збій — зупиняємось, наступний запит спробує знову
    cur = m.v; await env.DB.put('schema', String(cur));
  }
  return cur;
}
