// 👤 Аватарка в кабінеті (каса, кабінет власника, кабінет гостя): тап по фото → одразу галерея телефона.
// VVAV.pick() → dataURL (квадрат 256×256, JPEG ~20–30 КБ) або null. Викликати ПРЯМО в обробнику кліку (без await перед ним) — інакше iOS не відкриє галерею.
// VVAV.html(url, name, cls) — кружечок: фото або перша літера імені.
window.VVAV = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = () => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = () => { const f = i.files[0]; i.remove(); if (!f) return res(null);
      const im = new Image(), u = URL.createObjectURL(f);
      im.onload = () => { const n = 256, s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, n, n); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .85)); };
      im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u; };
    i.click();
  });
  const html = (url, name, cls = '') => url ? `<img class="vvav ${cls}" src="${esc(url)}" alt="">` : `<span class="vvav ${cls}">${esc((String(name || '?').trim()[0] || '?').toUpperCase())}</span>`;
  return { pick, html };
})();
