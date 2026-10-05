  async function loadKq() {
    const r = await api('kitchen'); const list = r.list || [];
    const ids = list.filter(e => !e.done).map(e => e.id), canc = list.flatMap(e => e.items.filter(x => x.cancel || x.canc).map(x => e.id + x.n + (x.canc || 0)));
    if (S.kqSeen) { const nw = list.filter(e => !e.done && !S.kqSeen.has(e.id)); if (nw.length) siren(nw.some(e => e.urgent)); else if (canc.some(c => !S.kqCanc.has(c))) beep(); }
    S.kqSeen = new Set(list.map(e => e.id)); S.kqCanc = new Set(canc); S.kq = list;
    if (S.view === 'kq') renderMain();
  }
  function tone(freqs, dur, vol = .6) { try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.(); let d = 0; for (const f of freqs) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(vol, actx.currentTime + d); g.gain.setValueAtTime(.0001, actx.currentTime + d + dur); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + dur); d += dur; } } catch {} }
  // сирена: один гучний сигнал ~2 с (терміново — двічі)
  // 🚨 сигналізація 4 с: виючий звук (частота гойдається вгору-вниз), терміново — швидше
  function siren(urgent) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.();
      const t0 = actx.currentTime, dur = 4, per = urgent ? .25 : .5;
      const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      for (let t = 0; t < dur; t += per) { [o, o2].forEach((x, k) => { x.frequency.setValueAtTime(k ? 650 : 600, t0 + t); x.frequency.linearRampToValueAtTime(k ? 1450 : 1400, t0 + t + per / 2); x.frequency.linearRampToValueAtTime(k ? 650 : 600, t0 + t + per); }); }
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.7, t0 + .05); g.gain.setValueAtTime(.7, t0 + dur - .1); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g); o2.connect(g); g.connect(actx.destination); o.start(t0); o2.start(t0); o.stop(t0 + dur); o2.stop(t0 + dur);
    } catch {}
  }
  const beep = () => tone([440, 330], .2, .4);
  let wakeLock;
  async function kitchenStart() {
    $('#kGate')?.remove(); tone([660], .05, .01);
    try { await document.documentElement.requestFullscreen?.(); } catch {}
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }
  function kitchenGate() { if ($('#kGate')) return; const g = document.createElement('div'); g.id = 'kGate'; g.innerHTML = '<button class="btn primary" data-a="kGo">🔊 Почати зміну<small>увімкне звук сирени й повний екран</small></button>'; document.body.appendChild(g); }
  function kqHTML() {
    const now = Date.now(), act0 = S.kq.filter(e => !e.done).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.ts - b.ts), done = S.kq.filter(e => e.done).slice(-6).reverse();
    const card = e => { const m = Math.floor((now - e.ts) / 60000), tc = m >= 15 ? 'red' : m >= 10 ? 'yel' : '';
      return `<div class="kc${e.urgent ? ' urg' : ''}${e.start ? ' cook' : ' new'}"><div class="kh"><b>Стіл ${tn(e.t)}</b><span class="tm ${tc}">⏱ ${m} хв</span></div>
        <div class="km">${e.at} · ${esc(e.by)}${e.src === 'гість' ? ' · 📱 сайт' : ''}</div>
        ${e.urgent ? '<div class="ktag urg">⚡ ТЕРМІНОВО</div>' : ''}${e.tw ? '<div class="ktag">🥡 З СОБОЮ</div>' : ''}${e.comment ? `<div class="kcom">💬 ${esc(e.comment)}</div>` : ''}
        <div class="ki">${e.items.map((x, i) => `<div class="kit-w"><button class="kit${x.done ? ' done' : ''}${x.cancel ? ' canc' : ''}" data-a="kItem" data-id="${e.id}" data-i="${i}" ${x.cancel ? 'disabled' : ''}><b>${x.q}×</b> ${esc(x.n)}${x.cancel ? ' <em>СКАСОВАНО</em>' : x.canc ? ` <em>−${x.canc} скас.</em>` : ''}</button><button class="kinfo" data-a="skTechOne" data-n="${esc(x.n)}" title="Техкарта">ⓘ</button></div>`).join('')}</div>
        ${(e.msgs || []).map(x => `<div class="kmsg">📨 ${x.at} ${esc(x.text)}</div>`).join('')}
        <div class="kb">${e.start ? '' : `<button class="btn" data-a="kStart" data-id="${e.id}">🔥 Готую</button>`}<button class="btn" data-a="kMsg" data-id="${e.id}">💬</button><button class="btn green" data-a="kAll" data-id="${e.id}">✅ ВСЕ ГОТОВО</button></div></div>`; };
    return `<div class="khead"><h1>👨‍🍳 Черга <span class="muted">${act0.length}</span></h1>${isCook() ? `<div class="stat tipstat">💝 Мої чайові<b class="money">${money(S.myTip?.sum || 0)}</b></div>` : ''}<button class="btn" data-a="skKStock">📦 Склад</button><button class="btn" data-a="view" data-v="stop">⛔ Стоп-лист</button></div>
      <div class="kq f${S.kFont}">${act0.length ? act0.map(card).join('') : '<div class="kempty">✅ Черга порожня</div>'}</div>
      ${done.length ? `<h3 class="muted" style="margin:18px 0 8px">Останні готові</h3><div class="kdone">${done.map(e => `<div class="kd">Стіл ${tn(e.t)} · ${e.items.filter(x => !x.cancel).map(x => `${x.q}× ${esc(x.n)}`).join(', ')}${e.cancelled ? ' · ❌ скасовано' : ` · ${Math.round((e.doneAt - e.ts) / 60000)} хв`} <button class="btn sm" data-a="kUndo" data-id="${e.id}">↩️</button></div>`).join('')}</div>` : ''}${isAdmin() ? goCtlHTML() : ''}`;
  }
