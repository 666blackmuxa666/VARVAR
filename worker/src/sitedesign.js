// 🎨 Конструктор сайту-візитки: перевірка всього, що власник зберігає з кабінету (тема, головний екран, блоки, панель,
// оголошення, години, SEO, соцмережі, сезон, адреси, афіша). Усе — білий список полів і меж: сайт публічний.
export const FONTS = ['Rubik', 'Rubik Dirt', 'Montserrat', 'Playfair Display', 'Lora', 'Unbounded', 'Comfortaa', 'Oswald', 'Nunito', 'Merriweather', 'Russo One', 'Caveat', 'Manrope', 'Exo 2'];
const CT = ['text', 'media', 'feats', 'links', 'quote', 'sep', 'soc'];
const col = (v, d) => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : d;
const num = (v, a, b, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
const one = (v, l, d) => l.includes(v) ? v : d;
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const bit = v => v ? 1 : 0;
const day = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const hm = v => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v).padStart(5, '0') : '';
// посилання: лише https, tel:, mailto:, viber:, якір або сторінки сайту — ніякого javascript:
export const safeUrl = v => { v = str(v, 300); return /^(https:\/\/[^\s"'<>]+|tel:\+?[\d\s()-]{5,20}|mailto:[^\s"'<>@]+@[^\s"'<>]+|viber:\/\/[^\s"'<>]+|#[a-z0-9-]{1,30}|(index|about)\.html[^\s"'<>]*)$/i.test(v) ? v : ''; };
// картинки: наші /img/… або https, або вбудована бібліотека img/site/
const safeImg = v => { v = str(v, 300); return /^(https:\/\/[^\s"'<>()]+|img\/[a-z0-9/_.-]+)$/i.test(v) ? v : ''; };
const tr = (v, n) => (v && typeof v === 'object' ? { uk: str(v.uk, n), en: str(v.en, n) } : { uk: str(v, n), en: '' });
const trOk = x => x.uk || x.en ? x : undefined;

export function cleanTheme(t) {
  if (!t || typeof t !== 'object') return null;
  return {
    mode: one(t.mode, ['dark', 'light'], 'dark'), bg: col(t.bg, '#121212'), card: col(t.card, '#1c1c1c'), text: col(t.text, '#f1f1f1'), accent: col(t.accent, '#f2c14e'), ink: col(t.ink, '#1a1400'),
    bgfx: one(t.bgfx, ['solid', 'grad', 'img', 'dots', 'grid', 'noise'], 'solid'), bg2: col(t.bg2, '#2a1f0a'), ang: num(t.ang, 0, 360, 160), bgImg: safeImg(t.bgImg),
    fh: one(t.fh, FONTS, 'Rubik Dirt'), fb: one(t.fb, FONTS, 'Rubik'), fs: one(t.fs, ['s', 'm', 'l'], 'm'), caps: bit(t.caps),
    r: num(t.r, 0, 28, 18), btn: one(t.btn, ['fill', 'line', 'pill'], 'fill'), cards: one(t.cards, ['line', 'shadow', 'flat'], 'line'), nav: one(t.nav, ['glass', 'solid', 'none'], 'glass'),
    anim: one(t.anim, ['none', 'fade', 'up'], 'none'), par: bit(t.par), menu: bit(t.menu),
  };
}
const HB = ['order', 'book', 'call', 'route', 'own'];
export function cleanHero(h) {
  if (!h || typeof h !== 'object') return null;
  const btns = [...new Set([].concat(h.btns || []).filter(b => HB.includes(b)))];
  return { lay: one(h.lay, ['full', 'split', 'plain', 'logo'], 'full'), h: num(h.h, 30, 100, 62), dim: num(h.dim, 0, 85, 40), al: one(h.al, ['l', 'c'], 'l'),
    badge: bit(h.badge ?? 1), addr: bit(h.addr ?? 1), logo: bit(h.logo), btns, own: { t: str(h.own?.t, 30), u: safeUrl(h.own?.u) } };
}
export function cleanBlocks(v, std) {
  const ok = new Set(std), seen = new Set(), out = [];
  for (const b of [].concat(v || [])) {
    if (!b || typeof b !== 'object' || seen.has(b.id)) continue;
    if (ok.has(b.id)) { const t = trOk(tr(b.t, 60)); out.push({ id: b.id, on: bit(b.on), ...(t ? { t } : {}) }); seen.add(b.id); continue; }
    if (!/^c_[a-z0-9]{4,8}$/.test(String(b.id)) || !CT.includes(b.type) || out.filter(x => x.type).length >= 10) continue;
    const c = { id: b.id, type: b.type, on: bit(b.on) }, t = trOk(tr(b.t, 60)); if (t) c.t = t;
    if (['text', 'media', 'quote'].includes(b.type)) { c.txt = tr(b.txt, 1500); if (b.type === 'quote') c.by = str(b.by, 60); }
    if (b.type === 'media') { c.img = safeImg(b.img); c.side = one(b.side, ['l', 'r'], 'l'); }
    if (b.type === 'feats') c.items = [].concat(b.items || []).slice(0, 8).map(x => ({ e: str(x?.e, 4), l: tr(x?.l, 50) })).filter(x => x.e || x.l.uk);
    if (b.type === 'links') c.links = [].concat(b.links || []).slice(0, 6).map(x => ({ l: tr(x?.l, 30), u: safeUrl(x?.u) })).filter(x => x.l.uk && x.u);
    out.push(c); seen.add(b.id);
  }
  return out;
}
export function cleanExtra(x = {}) {
  const r = {};
  if ('dock' in x) { const d = x.dock || {}; r.dock = { on: bit(d.on), btns: [...new Set([].concat(d.btns || []).filter(b => ['order', 'call', 'book', 'route'].includes(b)))].slice(0, 3) }; }
  if ('ann' in x) { const a = x.ann || {}; r.ann = { on: bit(a.on), t: tr(a.t, 140), u: safeUrl(a.u), c: col(a.c, '#f2c14e'), till: day(a.till) }; }
  if ('hours' in x) r.hours = Array.isArray(x.hours) && x.hours.length === 7 ? x.hours.map(h => ({ f: hm(h?.f), t: hm(h?.t), off: bit(h?.off) })) : null;
  if ('seo' in x) { const s = x.seo || {}; r.seo = { title: str(s.title, 70), desc: str(s.desc, 180) }; }
  if ('soc' in x) { const s = x.soc || {}; r.soc = {}; for (const k of ['insta', 'tg', 'tiktok', 'fb', 'viber', 'yt']) { const u = safeUrl(s[k]); if (u) r.soc[k] = u; } }
  if ('season' in x) { const s = x.season || {}; r.season = { k: one(s.k, ['', 'ny', 'hw', 'summer', 'easter', 'love'], ''), till: day(s.till) }; }
  if ('addrs' in x) r.addrs = [].concat(x.addrs || []).slice(0, 5).map(a => ({ n: str(a?.n, 60), a: str(a?.a, 200), h: str(a?.h, 60), p: str(a?.p, 30), m: safeUrl(a?.m) })).filter(a => a.a);
  if ('events' in x) r.events = [].concat(x.events || []).slice(0, 20).map(e => ({ id: /^[a-z0-9]{4,8}$/.test(e?.id) ? e.id : crypto.randomUUID().slice(0, 6), d: day(e?.d), tm: hm(e?.tm), t: tr(e?.t, 80), txt: tr(e?.txt, 400), img: safeImg(e?.img), book: bit(e?.book) })).filter(e => e.d && e.t.uk);
  if ('langs' in x) r.langs = bit(x.langs);
  if ('chat' in x) r.chat = bit(x.chat);
  return r;
}
// 🧱 усе за раз (кнопка «Опублікувати»)
export function cleanDesign(v, std) {
  v = v && typeof v === 'object' ? v : {};
  return { theme: cleanTheme(v.theme), heroCfg: cleanHero(v.heroCfg), blocks: cleanBlocks(v.blocks, std), ...cleanExtra(v) };
}
// 🕐 години на сьогодні (з розкладу по днях або загальні from/to); день — 0=пн
export function dayHours(s, wd) { const h = s.hours?.[wd]; if (h && (h.off || (h.f && h.t))) return h.off ? null : { from: h.f, to: h.t }; return { from: s.from, to: s.to }; }
// 🍽 Дизайн онлайн-меню (index.html): тема + вигляд карток, фон під фото, вкладки розділів, кнопки
export function cleanMenuTheme(t) {
  if (!t || typeof t !== 'object') return null;
  const b = cleanTheme(t);
  return { ...b, caps: bit(t.caps ?? 1),
    lay: one(t.lay, ['grid', 'list', 'big', 'text'], 'grid'), cols: num(t.cols, 1, 3, 2), ratio: one(t.ratio, ['1', '4/3', '16/9', '3/4'], '1'), fit: one(t.fit, ['contain', 'cover'], 'contain'),
    phbg: one(t.phbg, ['tex', 'card', 'accent', 'color', 'img', 'none'], 'tex'), phC: col(t.phC, '#222222'), phImg: safeImg(t.phImg),
    cats: one(t.cats, ['pill', 'line', 'box'], 'pill'), catsSticky: bit(t.catsSticky ?? 1), ttl: one(t.ttl, ['l', 'c'], 'l'), ttlLine: bit(t.ttlLine), ttlSz: num(t.ttlSz, 18, 44, 30),
    desc: bit(t.desc ?? 1), size: bit(t.size ?? 1), add: one(t.add, ['round', 'plus', 'wide'], 'round'), price: one(t.price, ['accent', 'text'], 'accent'),
    logo: bit(t.logo), note: { t: str(t.note?.t, 120), c: col(t.note?.c, '#f2c14e') } };
}
