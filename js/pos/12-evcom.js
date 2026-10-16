  // ---------- 💬 коментарі під подіями стрічки (як в Instagram) ----------
  // Дані — у самій події (e.cm, e.rx, e.seen, e.pin), приходять разом зі станом. Лист знизу: подія → коментарі → поле.
  const RXS = ['👍', '✅', '🔥', '❤️', '😂', '😮'];
  const QUICK = ['🏃 Іду', '⏱ 5 хв', '⛔ Нема в наявності', '✅ Прийняв', '🍽 Готово', '👌 Ок'];
  S.evRead = store.get('evRead', {}); S.evDisc = store.get('evDisc', 0); S.evc = null; S.evNames = null;
  const evRx = (o, c) => o.rx ? `<div class="rxs">${Object.entries(o.rx).map(([r, a]) => `<button class="rx${a.includes(S.me?.name) ? ' on' : ''}" data-ec="rx" data-rx="${r}"${c ? ` data-c="${c}"` : ''} title="${esc(a.join(', '))}">${r} ${a.length}</button>`).join('')}</div>` : '';
  const evUnread = e => { if (e.k === 'chat' && !S.evRead[e.id] && !e.cm && e.by !== S.me?.name) return !(e.seen || []).includes(S.me?.name); const n = e.cm?.length || 0; return n > (S.evRead[e.id] || 0) && e.cm[n - 1].by !== S.me?.name; };
  const evMention = e => evUnread(e) && (!e.cm ? !!e.m?.some(isMe) : e.cm.slice(S.evRead[e.id] || 0).some(c => c.by !== S.me?.name && c.m?.some(isMe)));
  const isMe = x => x.replace(/_/g, ' ').toLowerCase() === (S.me?.name || '').toLowerCase();
  const cmText = c => esc(c.text).replace(/@([^\s@,.!?]{2,24})/g, '<b class="ment">@$1</b>');
  // підвал картки в стрічці: реакції · 💬 N + останній коментар · 👁 хто бачив
  function evFoot(e) {
    const n = e.cm?.length || 0, last = n ? e.cm[n - 1] : null, un = evUnread(e);
    if (!n && !e.pin && !e.rx) return ''; // без коментарів — картка як раніше, без підпису
    return `${evRx(e)}<div class="evf">${e.pin ? '<span class="pin">📌</span>' : ''}<span class="evc${un ? ' un' : ''}${evMention(e) ? ' me' : ''}">💬 ${n || ''}${un ? ' нове' : ''}</span>${last ? `<span class="evl"><b>${esc(last.by)}:</b> ${last.v ? '🎙 голосове' : esc(last.text)}</span>` : '<span class="evl"></span>'}${e.seen?.length ? `<span class="seen" title="${esc(e.seen.join(', '))}">👁 ${e.seen.length}</span>` : ''}</div>`;
  }
  // порядок стрічки: 📌 закріплені зверху; режим «💬 Обговорення» — лише з коментарями, непрочитані першими
  function evList() {
    let l = [...S.events].reverse();
    if (S.evDisc) l = l.filter(e => e.k === 'chat' || e.cm?.length || e.pin).sort((a, b) => lastTs(b) - lastTs(a));
    return [...l.filter(e => e.pin), ...l.filter(e => !e.pin)];
  }
  const lastTs = e => e.cm ? e.cm[e.cm.length - 1].ts : e.ts;
  const evHead = () => `<div class="evtabs"><button class="${S.evDisc ? '' : 'on'}" data-ec="disc" data-v="0">Усі</button><button class="${S.evDisc ? 'on' : ''}" data-ec="disc" data-v="1">💬 Чат${(() => { const n = S.events.filter(evUnread).length; return n ? ` <span class="badge">${n}</span>` : ''; })()}</button></div>${S.evDisc ? `<div class="chat-in"><input id="chatIn" placeholder="Написати всім… (@ім'я — згадати)" maxlength="500" autocomplete="off"><button class="btn sm primary" data-ec="say">➤</button></div>` : ''}`;
  async function chatSay() { const i = $('#chatIn'), text = i?.value.trim(); if (!text) return; i.value = ''; const r = await act('chatSay', { text }); if (r?.e) { S.events.push(r.e); S.evRead[r.e.id] = 0; renderFeed(); } }
  // нові чужі коментарі → звук (згадка — двічі)
  function evNotify(prev) {
    if (!prev?.length) return; const old = Object.fromEntries(prev.map(e => [e.id, e.cm?.length || 0]));
    let any = 0, me = 0;
    for (const e of S.events) for (const c of (e.cm || []).slice(old[e.id] ?? (e.cm?.length || 0))) if (c.by !== S.me?.name) { any = 1; if (c.m?.some(isMe)) me = 1; }
    if (me) { ding(); setTimeout(() => ding(), 700); toast('💬 Вас згадали в стрічці'); } else if (any && !isCook()) ding('pop');
  }
  const evGet = () => S.events.find(e => e.id === S.evc);
  function evcOpen(id) {
    S.evc = id; const e = evGet(); if (!e) return;
    $('#evcBox')?.remove(); const d = document.createElement('div'); d.id = 'evcBox'; d.className = 'evc-bg';
    d.innerHTML = `<div class="evc-sh"><div class="evc-hd" id="evcHd"></div><div class="evc-list" id="evcList"></div><div class="evc-ment" id="evcMent"></div>
      <div class="evc-q">${QUICK.map(q => `<button class="chip" data-ec="q">${q}</button>`).join('')}</div>
      <div class="evc-in"><button class="btn sm ghost" data-ec="mic" id="evcMic" title="Голосове">🎙</button><input id="evcIn" placeholder="Коментар… (@ім'я — згадати)" maxlength="300" autocomplete="off"><button class="btn sm primary" data-ec="send">➤</button></div></div>`;
    document.body.append(d); evcRender(true);
    if (!(e.seen || []).includes(S.me?.name)) api('evSeen', { id }).catch(() => {});
    if (matchMedia('(min-width:700px)').matches) setTimeout(() => $('#evcIn')?.focus(), 60);
  }
  function evcClose() { evRecStop(true); S.evc = null; $('#evcBox')?.remove(); }
  function evcRender(scroll) {
    const e = evGet(), L = $('#evcList'); if (!L) return; if (!e) return evcClose();
    const cm = e.cm || [], mine = c => c.by === S.me?.name, me = S.me?.name;
    setHTML($('#evcHd'), `<div class="evc-t"><b>${evTitle(e)}</b><span class="tm">${e.at}${e.by ? ' · ' + esc(e.by) : ''}</span>${e.lines?.length ? `<div class="lines">${e.lines.map(esc).join('\n')}</div>` : e.k === 'ready' && e.text ? `<div class="lines">${esc(e.text)}</div>` : ''}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}</div>
      <div class="evc-tools">${RXS.map(r => `<button class="rx${e.rx?.[r]?.includes(me) ? ' on' : ''}" data-ec="rx" data-rx="${r}">${r}${e.rx?.[r] ? ' ' + e.rx[r].length : ''}</button>`).join('')}<span class="sp"></span>${isAdmin() || e.by === me ? `<button class="btn sm ghost" data-ec="pin">${e.pin ? '📌 Відкріпити' : '📌'}</button>` : ''}<button class="close-x" data-ec="close">✕</button></div>
      ${e.seen?.length ? `<div class="seen muted">👁 ${esc(e.seen.join(', '))}</div>` : ''}`);
    const atBottom = L.scrollHeight - L.scrollTop - L.clientHeight < 40;
    setHTML(L, cm.length ? cm.map(c => `<div class="cmt${mine(c) ? ' me' : ''}${c.m?.some(isMe) ? ' ment-me' : ''}"><div class="cb"><div class="cw"><b>${esc(c.by)}</b><span class="tm">${c.at}</span></div>${c.v ? `<button class="btn sm voice" data-ec="play" data-v="${c.v}">▶ 🎙 ${c.d ? c.d + ' с' : 'голосове'}</button>` : `<div class="ct">${cmText(c)}</div>`}</div>
      <div class="cr">${evRx(c, c.i)}<button class="lnk" data-ec="rx" data-rx="👍" data-c="${c.i}">👍</button><button class="lnk" data-ec="reply" data-n="${esc(c.by)}">Відповісти</button>${mine(c) || isAdmin() ? `<button class="lnk" data-ec="del" data-c="${c.i}">Видалити</button>` : ''}</div></div>`).join('') : '<div class="muted" style="padding:18px;text-align:center">Коментарів ще немає — напишіть першим</div>');
    if (scroll || atBottom) L.scrollTop = L.scrollHeight;
    S.evRead[e.id] = cm.length; store.set('evRead', S.evRead);
  }
  async function evcDo(op, data) { const r = await act(op, { id: S.evc, ...data }); if (r?.e) { const i = S.events.findIndex(x => x.id === r.e.id); if (i >= 0) S.events[i] = r.e; evcRender(op === 'evCom' || op === 'evVoice'); renderFeed(); } return r; }
  async function evcSend(text) { text = (text ?? $('#evcIn').value).trim(); if (!text) return; $('#evcIn').value = ''; $('#evcMent').innerHTML = ''; await evcDo('evCom', { text }); }
  // @згадки: підказка імен з персоналу (список — один раз)
  async function evcMent() {
    const i = $('#evcIn'), m = i.value.slice(0, i.selectionStart).match(/@([^\s@]*)$/), box = $('#evcMent');
    if (!m) return setHTML(box, '');
    if (!S.evNames) S.evNames = (await api('evNames').catch(() => ({ list: [] }))).list;
    const q = m[1].toLowerCase(), l = S.evNames.filter(n => n !== S.me?.name && n.toLowerCase().includes(q)).slice(0, 8);
    setHTML(box, l.map(n => `<button class="chip" data-ec="ment" data-n="${esc(n)}">@${esc(n)}</button>`).join(''));
  }
  function evcPutMent(n) { const i = $('#evcIn'), p = i.selectionStart, pre = i.value.slice(0, p), tag = '@' + n.replace(/\s+/g, '_') + ' ', a = /@[^\s@]*$/.test(pre) ? pre.replace(/@[^\s@]*$/, tag) : pre + (pre && !/\s$/.test(pre) ? ' ' : '') + tag; i.value = a + i.value.slice(p); i.focus(); i.setSelectionRange(a.length, a.length); setHTML($('#evcMent'), ''); }
  // 🎙 голосове: тап — запис, ще тап — надіслати (до 50 с)
  let rec = null;
  async function evRecStart() {
    if (!window.MediaRecorder) return toast('⚠️ Цей пристрій не записує голос');
    let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('⚠️ Немає доступу до мікрофона'); }
    const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported?.(t));
    const mr = new MediaRecorder(st, { ...(mt ? { mimeType: mt } : {}), audioBitsPerSecond: 16000 }), ch = [], t0 = Date.now();
    rec = { mr, st, t0, cancel: false, tick: setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); const b = $('#evcMic'); if (b) b.textContent = `⏹ ${s} с`; if (s >= 50) evRecStop(); }, 500) };
    mr.ondataavailable = x => x.data.size && ch.push(x.data);
    mr.onstop = () => { const r = rec; rec = null; clearInterval(r.tick); r.st.getTracks().forEach(t => t.stop()); const b = $('#evcMic'); if (b) { b.textContent = '🎙'; b.classList.remove('red'); }
      if (r.cancel || !ch.length) return; const blob = new Blob(ch, { type: mr.mimeType || 'audio/webm' }), fr = new FileReader();
      fr.onload = () => evcDo('evVoice', { data: fr.result, dur: Math.round((Date.now() - r.t0) / 1000) }); fr.readAsDataURL(blob); };
    mr.start(); const b = $('#evcMic'); b.classList.add('red'); b.textContent = '⏹ 0 с';
  }
  function evRecStop(cancel) { if (!rec) return; rec.cancel = !!cancel; try { rec.mr.stop(); } catch {} }
  const voices = {};
  async function evPlay(v, btn) {
    try { if (!voices[v]) { const r = await api('evVoiceGet', { v }); const b = Uint8Array.from(atob(r.b64), c => c.charCodeAt(0)); voices[v] = URL.createObjectURL(new Blob([b], { type: r.mime })); }
      const a = new Audio(voices[v]); btn.classList.add('on'); a.onended = () => btn.classList.remove('on'); await a.play(); } catch (x) { toast('⚠️ ' + (x.message === 'auth' ? 'Увійдіть знову' : errText(x.message))); }
  }
  document.addEventListener('click', async ev => {
    const el = ev.target.closest('[data-a], [data-ec]'); if (!el || el.dataset.a) return;
    const a = el.dataset.ec;
    if (a === 'open') return evcOpen(el.dataset.id);
    if (a === 'disc') { S.evDisc = +el.dataset.v; store.set('evDisc', S.evDisc); return renderFeed(); }
    if (a === 'rx' && !S.evc) return; // реакції на картці — лише показ, ставити — у листі
    if (a === 'say') return chatSay();
    if (a === 'close') return evcClose();
    if (a === 'send') return evcSend();
    if (a === 'q') return evcSend(el.textContent);
    if (a === 'rx') return evcDo('evRx', { rx: el.dataset.rx, c: el.dataset.c || '' });
    if (a === 'pin') return evcDo('evPin', {});
    if (a === 'del') { if (await confirmBox('Видалити коментар?')) evcDo('evComDel', { c: el.dataset.c }); return; }
    if (a === 'reply') return evcPutMent(el.dataset.n);
    if (a === 'ment') return evcPutMent(el.dataset.n);
    if (a === 'mic') return rec ? evRecStop() : evRecStart();
    if (a === 'play') return evPlay(el.dataset.v, el);
  });
  document.addEventListener('click', ev => { if (ev.target.id === 'evcBox') evcClose(); });
  document.addEventListener('input', ev => { if (ev.target.id === 'evcIn') evcMent(); });
  document.addEventListener('keydown', ev => { if (ev.target.id === 'evcIn' && ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); evcSend(); } if (ev.target.id === 'chatIn' && ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); chatSay(); } if (ev.key === 'Escape' && S.evc) evcClose(); });
