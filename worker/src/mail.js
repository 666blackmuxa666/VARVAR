// ✉️ Листи власникам (підтвердження пошти, відновлення пароля) — через Brevo (безкоштовно 300 листів/добу, без власного домену).
// Секрети: BREVO_KEY (API-ключ), MAIL_FROM (підтверджена в Brevo адреса відправника).
import { SITE_BASE } from './venue.js';
export const mailOn = env => !!(env.BREVO_KEY && env.MAIL_FROM);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export async function sendMail(env, to, subject, title, text, btn, link) {
  if (!mailOn(env)) return { error: 'Пошта не налаштована' };
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#111;color:#eee;border-radius:16px"><h2 style="color:#f2c14e;margin:0 0 12px">${esc(title)}</h2><p style="line-height:1.5">${esc(text)}</p><p style="margin:24px 0"><a href="${esc(link)}" style="background:#f2c14e;color:#111;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">${esc(btn)}</a></p><p style="font-size:12px;color:#888">Якщо ви цього не робили — просто проігноруйте лист.</p></div>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: 'VARVAR' }, to: [{ email: to }], subject, htmlContent: html }) });
  return r.ok ? { ok: true } : { error: 'Лист не надіслано (' + r.status + ')' };
}
export const ownerLink = (kind, t) => `${SITE_BASE}owner/#${kind}=${t}`;
