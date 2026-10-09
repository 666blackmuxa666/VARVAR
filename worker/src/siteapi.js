// 🖥 каса: сайт-візитка, броні, сертифікати (op: site*, bk*, cert*)
import { esc, notify, isDay } from './ops.js';
import { getSite, setSite, bookList, bookSet, bkLabel, certList, certPay, certDel, certOff, certUse, getCert, ratings, bookEditFields, bookManual } from './site.js';

export async function siteApi(b, env, me, t) {
  const who = me.name, admin = me.role === 'admin', ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s];
  const needA = () => bad('admin', 403);
  switch (b.op) {
    case 'siteGet': return ok({ site: await getSite(env) });
    case 'siteAi': { if (!admin) return needA(); const m = b.do === 'about' ? await (await import('./menu.js')).getMenu(env) : null; const r = await (await import('./ai.js')).aiSite(env, { ...b, cats: m ? m.categories.filter(c => !c.tech).map(c => c.name?.uk || c.name).join(', ') : '' }); return r.error ? bad(r.error) : ok(r); }
    case 'siteStats': { if (!admin) return needA(); const to = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }), from = new Date(Date.now() - 29 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }); return ok(await (await import('./site.js')).siteStats(env, from, to)); }
    case 'siteVer': { if (!admin) return needA(); return ok({ list: ((await env.DB.get('site_ver', 'json')) || []).map(x => ({ at: x.at, d: x.d })) }); }
    case 'siteSet': { if (!admin) return needA(); const s = await setSite(env, String(b.k), b.v); if (s.error) return bad(s.error); await notify(env, b.k === 'siteDesign' ? `🖥 🌐 Сайт: опубліковано новий дизайн — ${esc(who)}` : `🖥 🌐 Сайт: змінено «${esc(String(b.k))}» — ${esc(who)}`); return ok({ site: s }); }
    case 'sitePhoto': {
      if (!admin) return needA();
      const m = String(b.data || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); if (!m) return bad('image'); // 🖼 logo — PNG (прозорий фон)
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)); if (bytes.length > 3e6) return bad('too_big');
      const id = 'site-' + crypto.randomUUID().slice(0, 8); await env.DB.put('img:' + id, bytes.buffer);
      const url = `${env.SELF_URL}/img/${id}`; if (b.raw) return ok({ url }); /* 🎨 фото для конструктора — у чернетку */ const s = await setSite(env, b.logo ? 'logo' : b.hero ? 'hero' : 'photoAdd', url); return ok({ site: s, url });
    }
    case 'bkList': return ok({ list: await bookList(env, isDay(b.from) ? b.from : undefined, isDay(b.to) ? b.to : undefined, !!b.all) });
    case 'bkEdit': { const r = await bookEditFields(env, String(b.id), b.f || {}, who); return r.error ? bad(r.error) : ok({ b: r }); }
    case 'bkNew': { const r = await bookManual(env, b.f || {}, who); return r.error ? bad(r.error) : ok({ b: r }); }
    case 'bkSet': { const r = await bookSet(env, String(b.id), String(b.st), who, { t: +b.t || 0 }); if (!r) return bad('Не знайдено'); if (r.error) return bad(r.error); if (b.st !== 'kit') await notify(env, `🖥 📅 Бронь ${r.time} · ${esc(r.name)} — ${bkLabel(b.st)} (${esc(who)})`); return ok({ b: r }); }
    case 'certList': if (!admin) return needA(); return ok({ list: await certList(env) });
    case 'certPay': { if (!admin) return needA(); const c = await certPay(env, String(b.code), b.how === 'no' ? 'no' : b.how === 'card' ? 'card' : 'cash', who); return c ? ok({ c }) : bad('Не знайдено або вже оброблено'); }
    case 'certDel': { if (!admin) return needA(); if (!(await certDel(env, b.code))) return bad('Не знайдено'); await notify(env, `🖥 🗑 Сертифікат ${esc(String(b.code).toUpperCase())} видалено — ${esc(who)}`); return ok({}); }
    case 'certGet': { const c = await getCert(env, b.code); return c ? ok({ c: { code: c.code, sum: c.sum, left: c.left, st: c.st, from: c.from, to: c.to } }) : bad('Не знайдено'); }
    case 'certBd': { const r = await (await import('./guestbot.js')).bdGiftHere(env, t, b.phone || '', b.item, who); return r.error ? bad(r.error) : ok(r); }
    case 'certOff': { const r = await certOff(env, t, who); if (!r) return bad('На рахунку немає сертифіката'); await notify(env, `🖥 ↩️ ${r.c?.gift ? '🎂 Подарунок на ДН' : 'Сертифікат ' + esc(r.code)} прибрано з рахунку стола ${t} — ${esc(who)}`).catch(() => {}); return ok({ sum: r.sum }); }
    case 'certUse': { const r = await certUse(env, t, b.code, who); if (r.error) return bad(r.error); await notify(env, `🖥 🎁 Сертифікат ${esc(String(b.code).toUpperCase())}: −${r.use} грн на стіл ${t} (залишок ${r.left}) — ${esc(who)}`); return ok(r); }
    case 'siteRates': return ok(await ratings(env, String(b.from), String(b.to)));
  }
  return bad('unknown');
}
