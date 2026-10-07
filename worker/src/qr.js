// 🔳 QR-коди меню: ключ закладу (qr_key) → ключ кожного столу; PNG генерується на сервері (для принтера чеків і для друкарні).
// «🔄 Нові коди» міняє qr_key — старі надруковані QR перестають давати доступ до замовлення.
import qrcode from './vendor/qrcode.js';
import { MAIN, siteLink, venueId } from './venue.js';

export async function qrKey(env) {
  const k = await env.DB.get('qr_key'); if (k) return k;
  if (venueId() === MAIN) return 'f5431c32'; // ключ уже надрукованих QR VARVAR
  const n = [...crypto.getRandomValues(new Uint8Array(4))].map(x => x.toString(16).padStart(2, '0')).join(''); await env.DB.put('qr_key', n); return n;
}
export async function qrNew(env) { const n = [...crypto.getRandomValues(new Uint8Array(4))].map(x => x.toString(16).padStart(2, '0')).join(''); await env.DB.put('qr_key', n); return n; }
// ключ QR конкретного столу (не вгадати, змінивши номер у посиланні)
export async function tableKey(env, t, key) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key || await qrKey(env)}:${t}`));
  return [...new Uint8Array(h)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
}
export const qrUrl = async (env, t, key) => siteLink(t ? `?t=${t}&k=${await tableKey(env, t, key)}` : `?k=${key || await qrKey(env)}`);
// назва картинки для принтера: у назві — частина ключа, тож після «нових кодів» програма друку не візьме стару з памʼяті
export const qrImg = async (env, t) => `qr${t ? '-t' + t : ''}-${(await qrKey(env)).slice(0, 6)}`;

// ---------- PNG без бібліотек: 8-біт сірий, zlib через CompressionStream ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const o = new Uint8Array(12 + data.length), dv = new DataView(o.buffer); dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i); o.set(data, 8); dv.setUint32(8 + data.length, crc(o.subarray(4, 8 + data.length))); return o;
}
export async function qrPng(text, scale = 8) {
  const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(), pad = 4, size = (n + pad * 2) * scale, raw = new Uint8Array((size + 1) * size).fill(255);
  for (let y = 0; y < size; y++) { raw[y * (size + 1)] = 0; const my = Math.floor(y / scale) - pad;
    for (let x = 0; x < size; x++) { const mx = Math.floor(x / scale) - pad; if (my >= 0 && my < n && mx >= 0 && mx < n && q.isDark(my, mx)) raw[y * (size + 1) + 1 + x] = 0; } }
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const ih = new Uint8Array(13), dv = new DataView(ih.buffer); dv.setUint32(0, size); dv.setUint32(4, size); ih[8] = 8; ih[9] = 0;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', z), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
// /print/qr-t3-ab12cd.png (принтер) або /print/qr-t3-ab12cd.png?s=20 (друкарня, великий)
export async function qrRoute(env, url) {
  const m = url.pathname.match(/^\/print\/qr(?:-t(\d{1,3}))?-([a-f0-9]{6})\.png$/); if (!m) return null;
  const key = await qrKey(env); if (!key.startsWith(m[2])) return new Response('old', { status: 404 });
  const s = Math.min(24, Math.max(4, +url.searchParams.get('s') || 8));
  return new Response(await qrPng(await qrUrl(env, +m[1] || 0, key), s), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000', 'access-control-allow-origin': '*' } });
}
