// 👨‍🍳 Легкий кухонний екран для старих планшетів (iPad 2 / iOS 9): відкривається по http://…workers.dev/kitchen
// Старий Safari не довіряє сучасним сертифікатам (https) і не знає новий JS — тому тут ES5, XMLHttpRequest, flexbox, без grid.
export const KITCHEN_HTML = `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes">
<title>VARVAR кухня</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#000;color:#fff;font:17px -apple-system,Helvetica,Arial,sans-serif}
.top{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;padding:10px 12px;background:#111}
.top h1{-webkit-flex:1;flex:1;margin:0;font-size:24px}.btn{border:0;border-radius:10px;padding:12px 16px;margin-left:8px;font-size:17px;font-weight:bold;background:#333;color:#fff}
.g{background:#30d158;color:#032}.o{background:#ff9f0a;color:#000}.r{background:#ff453a}
.q{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;padding:6px}
.c{width:48%;margin:1%;background:#1c1c1e;border-radius:14px;padding:12px;border:3px solid #333}.c.u{border-color:#ff453a}.c.s{border-color:#ff9f0a}
.h{display:-webkit-box;display:-webkit-flex;display:flex}.h b{-webkit-flex:1;flex:1;font-size:26px}.t{font-size:22px;font-weight:bold}.t.y{color:#ffd60a}.t.rr{color:#ff453a}
.m{color:#8e8e93;font-size:14px;margin:2px 0 6px}.tag{display:inline-block;background:#ff453a;padding:3px 8px;border-radius:6px;font-weight:bold;margin:2px 4px 2px 0}
.i{display:block;width:100%;text-align:left;background:#2c2c2e;color:#fff;border:0;border-radius:10px;padding:12px;margin:5px 0;font-size:20px}
.i.d{background:#123f22;color:#7ee29a;text-decoration:line-through}.i.x{background:#3d1210;color:#ff6961;text-decoration:line-through}
.b{display:-webkit-box;display:-webkit-flex;display:flex;margin-top:8px}.b .btn{-webkit-flex:1;flex:1;margin:0 4px}
.e{padding:40px;text-align:center;color:#8e8e93;font-size:24px}#login{padding:30px;text-align:center}#login input{font-size:32px;width:200px;text-align:center;padding:10px;border-radius:10px;border:0}
.tabs{display:-webkit-box;display:-webkit-flex;display:flex;background:#111;padding:0 6px 8px}.tabs button{-webkit-flex:1;flex:1;margin:0 3px;padding:12px 4px;border:0;border-radius:10px;background:#222;color:#aaa;font-size:16px;font-weight:bold}.tabs .on{background:#fff;color:#000}
.pg{padding:10px}.ev{background:#1c1c1e;border-radius:12px;padding:10px 12px;margin-bottom:8px;border-left:5px solid #444}.ev.guest{border-color:#30d158}.ev.ready{border-color:#30d158}.ev.kmsg{border-color:#bf5af2}.ev.call{border-color:#ffd60a}.ev pre{margin:4px 0 0;font:15px -apple-system,Helvetica;white-space:pre-wrap;color:#ddd}
.tb{display:inline-block;width:18%;margin:1%;padding:18px 0;font-size:24px;font-weight:bold;border:0;border-radius:12px;background:#2c2c2e;color:#fff}.tb.on{background:#ffd60a;color:#000}
.cat{display:inline-block;margin:3px;padding:10px 12px;border:0;border-radius:99px;background:#2c2c2e;color:#fff;font-size:15px}.cat.on{background:#fff;color:#000}
.it{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;background:#1c1c1e;border-radius:10px;padding:10px;margin:5px 0}.it span{-webkit-flex:1;flex:1;font-size:18px}.it .qq{min-width:34px;text-align:center;font-size:20px;font-weight:bold}.it button{width:46px;height:46px;border:0;border-radius:23px;font-size:24px;font-weight:bold;background:#333;color:#fff;margin-left:6px}.sw{border:0;border-radius:20px;padding:8px 14px;font-weight:bold;font-size:15px}
#gate{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.85);text-align:center;padding-top:30%}#err{color:#ff453a;margin:10px}
</style></head><body>
<div id="login" style="display:none"><h1>👨‍🍳 VARVAR кухня</h1><p>Введіть свій PIN</p><input id="pin" type="tel" maxlength="4"><br><button class="btn g" id="go" style="margin-top:14px">Увійти</button><div id="err"></div></div>
<div id="app" style="display:none"><div class="top"><h1 id="ttl">👨‍🍳 Черга</h1><span id="st" style="color:#8e8e93;font-size:13px"></span><button class="btn" id="snd">🔔 Звук</button><button class="btn" id="out">Вийти</button></div><div class="tabs"><button data-tab="q" class="on">👨‍🍳 Черга <span id="n"></span></button><button data-tab="f">🔔 Стрічка</button><button data-tab="o">📝 Замовлення</button><button data-tab="s">⛔ Стоп-лист</button><button data-tab="w">🗑 Списати</button></div><div class="q" id="q"></div><div id="f" class="pg" style="display:none"></div><div id="o" class="pg" style="display:none"></div><div id="s" class="pg" style="display:none"></div><div id="w" class="pg" style="display:none"></div></div>
<div id="msg" style="display:none;position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.85);padding:12% 15%;text-align:center"><h2>Повідомлення в зал</h2><p style="color:#8e8e93">Офіціанти побачать у стрічці</p><div id="msgb"></div><button class="btn" id="msgx" style="margin-top:14px">Скасувати</button></div>
<div id="gate" style="display:none"><button class="btn g" id="start" style="font-size:28px;padding:24px 34px">🔊 Почати зміну</button><p style="color:#8e8e93">увімкне звук нових замовлень</p></div>
<script>
var T=localStorage.getItem('ktok')||'',seen=null,ctx=null,list=[];
function $(i){return document.getElementById(i)}
function api(op,b,cb){var x=new XMLHttpRequest();x.open('POST','/api/pos',true);x.setRequestHeader('Content-Type','application/json');if(T)x.setRequestHeader('Authorization','Bearer '+T);
 x.onreadystatechange=function(){if(x.readyState!==4)return;var j={};try{j=JSON.parse(x.responseText)}catch(e){}if(x.status===401&&op!=='login'){T='';localStorage.removeItem('ktok');show();return}$('st').textContent=x.status===200?'':'⚠️ немає звʼязку';cb&&cb(j,x.status)};
 b=b||{};b.op=op;x.send(JSON.stringify(b))}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
// 🎵 мелодії по 4 с: [тип хвилі, [[частота, початок с, тривалість с], …]]
var SND={siren:['🚨 Сирена',function(){var a=[];for(var i=0;i<16;i++)a.push([i%2?1200:700,i*.25,.25]);return['square',a]}],
 bell:['🔔 Дзвіночок',function(){var n=[1047,1319,1568,2093],a=[];for(var r=0;r<4;r++)for(var i=0;i<4;i++)a.push([n[i],r+i*.18,.5]);return['sine',a]}],
 phone:['☎️ Старий телефон',function(){var a=[];for(var r=0;r<4;r++)for(var i=0;i<12;i++)a.push([i%2?1600:1300,r+i*.05,.05]);return['square',a]}],
 fanfare:['🎺 Фанфари',function(){var m=[[523,0,.2],[659,.2,.2],[784,.4,.2],[1047,.6,.6],[784,1.3,.2],[1047,1.5,.9],[523,2.6,.2],[659,2.8,.2],[784,3,.2],[1047,3.2,.8]];return['triangle',m]}],
 beep:['📟 Біп-біп',function(){var a=[];for(var i=0;i<8;i++)a.push([1760,i*.5,.22]);return['square',a]}],
 duck:['🦆 Качка (Ігор)',null,'/snd/duck.mp3'],
 marimba:['🎵 Мелодія',function(){var m=[659,784,880,784,659,587,523,587,659,784,659,523,587,523],a=[];for(var i=0;i<m.length;i++)a.push([m[i],i*.28,.26]);return['sine',a]}]};
var snd=localStorage.getItem('ksnd')||'siren';
var bufs={};
function play(k){try{if(!ctx)return;var S0=SND[k]||SND.siren;if(S0[2]){if(bufs[k]){var src=ctx.createBufferSource();src.buffer=bufs[k];src.connect(ctx.destination);src.start(0)}else{var x=new XMLHttpRequest();x.open('GET',S0[2]);x.responseType='arraybuffer';x.onload=function(){ctx.decodeAudioData(x.response,function(b){bufs[k]=b;play(k)},function(){})};x.send()}return}var d=(SND[k]||SND.siren)[1](),t0=ctx.currentTime+.05;for(var i=0;i<d[1].length;i++){var x=d[1][i],o=ctx.createOscillator(),g=ctx.createGain();o.type=d[0];o.frequency.value=x[0];g.gain.setValueAtTime(.0001,t0+x[1]);g.gain.linearRampToValueAtTime(.6,t0+x[1]+.01);g.gain.setValueAtTime(.6,t0+x[1]+x[2]*.8);g.gain.linearRampToValueAtTime(.0001,t0+x[1]+x[2]);o.connect(g);g.connect(ctx.destination);o.start(t0+x[1]);o.stop(t0+x[1]+x[2]+.02)}}catch(e){}}
function beep(n){try{if(!ctx)return;for(var k=0;k<(n||1);k++){var o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=880+k*220;g.gain.value=.5;o.connect(g);g.connect(ctx.destination);var t=ctx.currentTime+k*.5;o.start(t);o.stop(t+.4)}}catch(e){}}
function show(){$('login').style.display=T?'none':'block';$('app').style.display=T?'block':'none';if(T)load()}
function draw(){var now=Date.now(),a=list.filter(function(e){return!e.done}).sort(function(x,y){return(y.urgent?1:0)-(x.urgent?1:0)||x.ts-y.ts}),h='';
 $('n').textContent=a.length;
 for(var i=0;i<a.length;i++){var e=a[i],m=Math.floor((now-e.ts)/60000);
  h+='<div class="c'+(e.urgent?' u':e.start?' s':'')+'"><div class="h"><b>'+tnm(e.t)+(e.paid?' · 💰 оплачено':'')+'</b><span class="t'+(m>=15?' rr':m>=10?' y':'')+'">⏱ '+m+' хв</span></div><div class="m">'+esc(e.at)+' · '+esc(e.by)+'</div>'+(e.urgent?'<span class="tag">⚡ ТЕРМІНОВО</span>':'')+(e.tw?'<span class="tag" style="background:#0a84ff">🥡 З СОБОЮ</span>':'')+(e.comment?'<div class="m" style="color:#ffd60a">💬 '+esc(e.comment)+'</div>':'');
  if(e.msgs)for(var mm=0;mm<e.msgs.length;mm++)h+='<div class="m" style="color:#d8a5ff">📨 '+esc(e.msgs[mm].at)+' '+esc(e.msgs[mm].text)+'</div>';
  for(var j=0;j<e.items.length;j++){var x=e.items[j];h+='<button class="i'+(x.cancel?' x':x.done?' d':'')+'" data-id="'+e.id+'" data-i="'+j+'"'+(x.cancel?' disabled':'')+'><b>'+x.q+'×</b> '+esc(x.n)+(x.cancel?' — СКАСОВАНО':'')+'</button>'}
  h+='<div class="b">'+(e.start?'':'<button class="btn o" data-st="'+e.id+'">🔥 Готую</button>')+'<button class="btn" data-msg="'+e.id+'">💬</button><button class="btn g" data-all="'+e.id+'">✅ ВСЕ ГОТОВО</button></div></div>'}
 $('q').innerHTML=h||'<div class="e">✅ Черга порожня</div>'}
function load(){api('kitchen',{},function(j){if(!j.list)return;list=j.list;var ids={},nw=0,urg=0;for(var i=0;i<list.length;i++){var e=list[i];ids[e.id]=1;if(seen&&!seen[e.id]&&!e.done){nw++;if(e.urgent)urg=1}}if(nw)play(snd);seen=ids;draw()})}
document.addEventListener('click',function(ev){var t=ev.target;while(t&&t!==document&&!t.getAttribute('data-id')&&!t.getAttribute('data-st')&&!t.getAttribute('data-all'))t=t.parentNode;if(!t||t===document)return;
 if(t.getAttribute('data-id'))api('kDone',{id:t.getAttribute('data-id'),i:+t.getAttribute('data-i')},load);
 else if(t.getAttribute('data-st'))api('kStart',{id:t.getAttribute('data-st')},load);
 else if(t.getAttribute('data-all'))api('kDone',{id:t.getAttribute('data-all')},load)});
$('go').onclick=function(){api('login',{pin:$('pin').value},function(j){if(j.token&&j.me&&(j.me.role==='cook'||j.me.role==='admin')){T=j.token;localStorage.setItem('ktok',T);show();if(!wsOk)live()}else $('err').textContent=j.token?'Цей екран — для кухаря':'Невірний PIN'})};
$('out').onclick=function(){if(confirm('Вийти?')){api('logout',{});T='';localStorage.removeItem('ktok');show()}};
$('start').onclick=function(){try{var A=window.AudioContext||window.webkitAudioContext;ctx=new A();play(snd)}catch(e){}$('gate').style.display='none';noSleep()};
// 🔆 екран не гасне: старий iOS не має Wake Lock — класичний прийом (як NoSleep.js для iOS < 10): раз на 15 с «перехід» на ту саму сторінку і одразу зупинка
function noSleep(){if(navigator.wakeLock){try{navigator.wakeLock.request('screen')}catch(e){}return}setInterval(function(){if(!document.hidden){window.location.href=window.location.href.split('#')[0];setTimeout(window.stop,0)}},15000)}
$('snd').onclick=function(){var h='';for(var k in SND)h+='<div class="it"><span>'+SND[k][0]+(k===snd?' ✅':'')+'</span><button data-sp="'+k+'" style="width:auto;padding:0 14px;border-radius:12px">▶</button><button data-ss="'+k+'" style="width:auto;padding:0 14px;border-radius:12px;background:#30d158;color:#032">Обрати</button></div>';$('msgb').innerHTML=h;$('msg').getElementsByTagName('h2')[0].textContent='🔔 Звук нового замовлення';$('msg').style.display='block'};
document.addEventListener('click',function(ev){var t=ev.target,a;if((a=t.getAttribute('data-sp')))play(a);if((a=t.getAttribute('data-ss'))){snd=a;localStorage.setItem('ksnd',a);$('msg').style.display='none';play(a)}});
var tab='q',menu=null,ot=0,ocat='',cart={};
function tabs(t){tab=t;var b=document.querySelectorAll('.tabs button');for(var i=0;i<b.length;i++)b[i].className=b[i].getAttribute('data-tab')===t?'on':'';['q','f','o','s','w'].forEach(function(k){$(k).style.display=k===t?(k==='q'?'':'block'):'none'});$('ttl').textContent={q:'👨‍🍳 Черга',f:'🔔 Стрічка',o:'📝 Замовлення',s:'⛔ Стоп-лист',w:'🗑 Списання'}[t];if(t==='w')wload();if(t==='f')feed();if((t==='o'||t==='s')&&!menu)api('menu',{},function(j){menu=j.menu;draw2()});else draw2()}
function tnm(t){return t>2000?'🥡 С-'+(t-2000):t>1000?'🛵 Д-'+(t-1000):'Стіл '+t}
function feed(){api('state',{},function(j){var e=(j.events||[]).slice().reverse(),h='';for(var i=0;i<e.length&&i<60;i++){var x=e[i];h+='<div class="ev '+esc(x.k)+'"><b>'+(x.t?tnm(x.t)+' · ':'')+esc(x.text||{guest:'🛎 замовлення гостя',waiter:'🧑‍🍳 замовлення',close:'✅ стіл закрито',ready:'🍽 готово',call:'🔔 кличуть офіціанта',check:'🧾 просять чек'}[x.k]||x.k)+'</b> <span style="color:#8e8e93;font-size:13px">'+esc(x.at)+(x.by?' · '+esc(x.by):'')+'</span>'+(x.lines&&x.lines.length?'<pre>'+esc(x.lines.join('\\n'))+'</pre>':'')+'</div>'}$('f').innerHTML=h||'<div class="e">Подій ще немає</div>'})}
function items(c){return c.items.filter(function(i){return tab==='s'||!i.hidden})}
function draw2(){if(!menu)return;var cats=menu.categories.filter(function(c){return!c.tech}),h='';
 if(tab==='s'){for(var i=0;i<cats.length;i++){h+='<h3>'+esc(cats[i].name.uk)+'</h3>';var it=cats[i].items;for(var j=0;j<it.length;j++)h+='<div class="it"><span>'+esc(it[j].name.uk)+'</span><button class="sw" style="background:'+(it[j].hidden?'#ff453a':'#30d158')+';width:auto" data-stop="'+it[j].id+'" data-h="'+(it[j].hidden?0:1)+'">'+(it[j].hidden?'⛔ немає':'✅ є')+'</button></div>'}$('s').innerHTML=h;return}
 if(tab!=='o')return;
 h='<div>';for(var t=1;t<=15;t++)h+='<button class="tb'+(ot===t?' on':'')+'" data-tb="'+t+'">'+t+'</button>';h+='</div>';
 if(ot){if(!ocat)ocat=cats[0].id;h+='<div style="margin:8px 0">';for(i=0;i<cats.length;i++)h+='<button class="cat'+(ocat===cats[i].id?' on':'')+'" data-cat="'+cats[i].id+'">'+esc(cats[i].name.uk)+'</button>';h+='</div>';
  var c=cats.filter(function(x){return x.id===ocat})[0],li=c?items(c):[];
  for(j=0;j<li.length;j++){var x=li[j],vs=x.variants||[{v:'',p:x.price}];for(var k=0;k<vs.length;k++){var key=x.id+'|'+vs[k].v,q=cart[key]||0;h+='<div class="it"><span>'+esc(x.name.uk)+(vs[k].v?' '+vs[k].v+' '+(x.size||'л'):'')+' <small style="color:#8e8e93">'+vs[k].p+' ₴</small></span>'+(q?'<button data-cq="'+key+'" data-d="-1">−</button><span class="qq">'+q+'</span>':'')+'<button data-cq="'+key+'" data-d="1" style="background:#30d158;color:#032">+</button></div>'}}
  var n=0,sum=0;for(var kk in cart){n+=cart[kk];var p=kk.split('|'),it2=null;menu.categories.forEach(function(cc){cc.items.forEach(function(ii){if(ii.id===p[0])it2=ii})});if(it2)sum+=cart[kk]*(it2.variants?(it2.variants.filter(function(v){return v.v===p[1]})[0]||{p:0}).p:it2.price)}
  if(n)h+='<div style="position:-webkit-sticky;position:sticky;bottom:0;background:#000;padding:10px 0"><button class="btn g" id="send" style="width:100%;margin:0;font-size:20px">Відправити на стіл '+ot+' · '+n+' поз. · '+sum+' ₴</button></div>'}
 $('o').innerHTML=h}
document.addEventListener('click',function(ev){var t=ev.target,a;
 if((a=t.getAttribute('data-tab')))return tabs(a);
 if((a=t.getAttribute('data-tb'))){ot=+a;cart={};return draw2()}
 if((a=t.getAttribute('data-cat'))){ocat=a;return draw2()}
 if((a=t.getAttribute('data-cq'))){cart[a]=Math.max(0,(cart[a]||0)+(+t.getAttribute('data-d')));if(!cart[a])delete cart[a];return draw2()}
 if((a=t.getAttribute('data-stop'))){var h=t.getAttribute('data-h')==='1';api('stop',{id:a,hidden:h},function(){menu.categories.forEach(function(c){c.items.forEach(function(i){if(i.id===a)i.hidden=h})});draw2()});return}
 if(t.id==='send'){var it=[];for(var k in cart){var p=k.split('|');it.push({id:p[0],v:p[1]||undefined,q:cart[k]})}t.disabled=true;api('order',{t:ot,items:it},function(j,s){if(s===200){alert('✅ Відправлено на стіл '+ot);cart={};ot=0;tabs('q')}else{alert('⚠️ '+(j.error||'помилка'));t.disabled=false}})}});
var ing=null,offR=[],wq='',wsel=null;
function fq(q,u){q=Math.round(q*1000)/1000;if((u==='кг'||u==='л')&&q&&Math.abs(q)<1)return Math.round(q*1000)+(u==='кг'?' г':' мл');return String(q).replace('.',',')+' '+u}
function wload(){api('skData',{},function(j){if(!j.ing)return;ing=j.ing.filter(function(x){return!x.off}).sort(function(a,b){return a.n<b.n?-1:1});offR=j.offR||[];wdraw()})}
function wdraw(){if(!ing){$('w').innerHTML='<div class="e">Завантаження…</div>';return}var h='';
 if(wsel){var x=wsel;h='<h2>🗑 '+esc(x.n)+'</h2><p style="color:#8e8e93">На складі: '+fq((x.st.k||0)+(x.st.b||0),x.u)+'</p><p>Скільки списати ('+(x.u==='кг'?'кг або «250 г»':x.u==='л'?'л або «500 мл»':'шт')+'):</p><input id="wq" type="text" style="font-size:28px;width:220px;padding:10px;border-radius:10px;border:0"><p>Причина:</p><div>';
  for(var i=0;i<offR.length;i++)h+='<button class="cat" data-wr="'+esc(offR[i])+'">'+esc(offR[i])+'</button>';
  h+='</div><input id="wn" placeholder="Причина" style="font-size:20px;width:90%;padding:10px;border-radius:10px;border:0;margin-top:8px"><div class="b" style="margin-top:14px"><button class="btn" id="wx">← Назад</button><button class="btn r" id="wgo">🗑 Списати</button></div>';
  $('w').innerHTML=h;return}
 h='<input id="ws" placeholder="🔎 Пошук продукту" value="'+esc(wq)+'" style="font-size:20px;width:100%;padding:12px;border-radius:10px;border:0;margin-bottom:8px">';
 var l=ing.filter(function(x){return!wq||x.n.toLowerCase().indexOf(wq.toLowerCase())>=0});
 for(var j=0;j<l.length&&j<80;j++)h+='<div class="it" data-wi="'+l[j].id+'"><span data-wi="'+l[j].id+'">'+esc(l[j].n)+' <small style="color:#8e8e93">'+fq((l[j].st.k||0)+(l[j].st.b||0),l[j].u)+'</small></span><button data-wi="'+l[j].id+'" style="background:#ff453a">−</button></div>';
 $('w').innerHTML=h+(l.length?'':'<div class="e">Нічого не знайдено</div>')}
function pq(s,u){var m=String(s).replace(',','.').match(/^\s*(\d*\.?\d+)\s*(г|гр|мл|кг|л|шт)?/i);if(!m)return NaN;var v=+m[1],su=(m[2]||'').toLowerCase();if((su==='г'||su==='гр')&&u==='кг')v/=1000;if(su==='мл'&&u==='л')v/=1000;return v}
document.addEventListener('input',function(ev){if(ev.target.id==='ws'){wq=ev.target.value;var p=ev.target.selectionStart;wdraw();var i=$('ws');i.focus();try{i.setSelectionRange(p,p)}catch(e){}}});
document.addEventListener('click',function(ev){var t=ev.target,a;
 if((a=t.getAttribute('data-wi'))){wsel=ing.filter(function(x){return x.id===a})[0];wdraw();return}
 if((a=t.getAttribute('data-wr'))){$('wn').value=a;return}
 if(t.id==='wx'){wsel=null;wdraw();return}
 if(t.id==='wgo'){var q=pq($('wq').value,wsel.u),n=$('wn').value.replace(/^\s+|\s+$/g,'');if(!(q>0))return alert('Вкажіть кількість');if(!n)return alert('Вкажіть причину');
  var w=(wsel.st.b||0)>0&&!((wsel.st.k||0)>0)?'b':'k';t.disabled=true;api('skAdj',{id:wsel.id,wh:w,q:-q,note:n},function(j,s){if(s===200){alert('🗑 Списано: '+wsel.n+' '+fq(q,wsel.u));wsel=null;wload()}else{alert('⚠️ '+(j.error||'помилка'));t.disabled=false}})}});
var msgId='';
document.addEventListener('click',function(ev){var t=ev.target,a;
 if((a=t.getAttribute('data-msg'))){msgId=a;$('msg').getElementsByTagName('h2')[0].textContent='Повідомлення в зал';var o=['❗ Немає продукту','⏱ Ще +10 хв','🙋 Підійди на кухню','🔥 Вже майже готово','✏️ Своє…'],h='';for(var i=0;i<o.length;i++)h+='<button class="btn" style="display:block;width:100%;margin:8px 0;font-size:22px;padding:16px" data-mt="'+o[i]+'">'+o[i]+'</button>';$('msgb').innerHTML=h;$('msg').style.display='block';return}
 if((a=t.getAttribute('data-mt'))){if(a.indexOf('Своє')>=0){a=prompt('Повідомлення в зал:');if(!a)return}$('msg').style.display='none';api('kMsg',{id:msgId,text:a},function(j,s){if(s===200){load()}else alert('⚠️ '+(j.error||'помилка'))});return}
 if(t.id==='msgx')$('msg').style.display='none'});
setInterval(function(){if(T&&tab==='f'&&!wsOk)feed()},20000);
$('gate').style.display='block';show();
// 🔌 живе зʼєднання (як у касі): сервер сам каже «кухня змінилась» — без опитування кожні 4 с; без зʼєднання — запасне опитування раз на 20 с
var ws=null,wsOk=0,wsT=0;function live(){if(!T||!window.WebSocket)return;try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/pos/live?token='+T)}catch(e){return}
 ws.onopen=function(){wsOk=1;load()};ws.onmessage=function(m){if(m.data==='pong')return;var j={};try{j=JSON.parse(m.data)}catch(e){}if(j.type==='changed'&&j.keys&&tab==='f'&&String(j.keys).indexOf('ev')>=0)feed();if(j.type==='changed'&&j.keys&&(String(j.keys).indexOf('kq')>=0||String(j.keys).indexOf('menu')>=0)){clearTimeout(wsT);wsT=setTimeout(load,150)}};
 ws.onclose=function(){wsOk=0;setTimeout(live,5000)};ws.onerror=function(){try{ws.close()}catch(e){}}}
setInterval(function(){if(ws&&wsOk)try{ws.send('ping')}catch(e){}},25000);
live();var poll=0;setInterval(function(){if(!T)return;poll++;if(!wsOk||poll%15===0)load()},wsOk?20000:20000);setInterval(function(){if(T)draw()},30000);
</script></body></html>`;
