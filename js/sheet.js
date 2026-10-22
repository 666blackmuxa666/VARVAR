// 📱 Вікна (.modal-bg > .modal) на телефоні — нижній лист: свайп униз закриває (як «ручка» зверху підказує). Спільне для каси й кабінету власника.
// Закриття = клік по фону (.modal-bg) — кожне вікно вже так закривається. Фон під відкритим вікном не гортається — css (html:has(.modal-bg)).
(() => {
  let d = null;
  const atTop = (t, m) => { for (let n = t; n && n !== m.parentNode; n = n.parentNode) if (n.scrollTop > 0) return false; return true; };
  document.addEventListener('touchstart', e => { d = null; if (innerWidth > 600 || e.touches.length > 1) return; const m = e.target.closest?.('.modal-bg > .modal'); if (!m || e.target.closest('input[type=range],textarea,canvas,.nodrag')) return;
    const p = e.touches[0]; if (p.clientY - m.getBoundingClientRect().top > 70 && !atTop(e.target, m)) return; d = { m, y: p.clientY, x: p.clientX, dy: 0, on: false }; }, { passive: true });
  document.addEventListener('touchmove', e => { if (!d) return; const p = e.touches[0], dy = p.clientY - d.y, dx = Math.abs(p.clientX - d.x);
    if (!d.on) { if (dx > 12 && dx > dy || dy < -6) { d = null; return; } if (dy > 10) d.on = true; else return; }
    d.dy = Math.max(0, dy); d.m.style.transition = 'none'; d.m.style.transform = `translateY(${d.dy}px)`; }, { passive: true });
  document.addEventListener('touchend', () => { if (!d) return; const { m, dy, on } = d; d = null; if (!on) return;
    if (dy > Math.min(120, m.offsetHeight * .25)) { const bg = m.parentNode; m.style.transition = 'transform .18s'; m.style.transform = 'translateY(100%)'; navigator.vibrate?.(8);
      setTimeout(() => { bg.dispatchEvent(new MouseEvent('click', { bubbles: true })); if (bg.isConnected) { m.style.transform = ''; } }, 170); }
    else { m.style.transition = 'transform .2s'; m.style.transform = ''; setTimeout(() => { m.style.transition = ''; }, 220); } });
})();
