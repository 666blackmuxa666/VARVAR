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
#gate{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.85);text-align:center;padding-top:30%}#err{color:#ff453a;margin:10px}
</style></head><body>
<div id="login" style="display:none"><h1>👨‍🍳 VARVAR кухня</h1><p>Введіть свій PIN</p><input id="pin" type="tel" maxlength="4"><br><button class="btn g" id="go" style="margin-top:14px">Увійти</button><div id="err"></div></div>
<div id="app" style="display:none"><div class="top"><h1>👨‍🍳 Черга <span id="n"></span></h1><span id="st" style="color:#8e8e93;font-size:13px"></span><button class="btn" id="out">Вийти</button></div><div class="q" id="q"></div></div>
<div id="gate" style="display:none"><button class="btn g" id="start" style="font-size:28px;padding:24px 34px">🔊 Почати зміну</button><p style="color:#8e8e93">увімкне звук нових замовлень</p></div>
<script>
var T=localStorage.getItem('ktok')||'',seen=null,ctx=null,list=[];
function $(i){return document.getElementById(i)}
function api(op,b,cb){var x=new XMLHttpRequest();x.open('POST','/api/pos',true);x.setRequestHeader('Content-Type','application/json');if(T)x.setRequestHeader('Authorization','Bearer '+T);
 x.onreadystatechange=function(){if(x.readyState!==4)return;var j={};try{j=JSON.parse(x.responseText)}catch(e){}if(x.status===401&&op!=='login'){T='';localStorage.removeItem('ktok');show();return}$('st').textContent=x.status===200?'':'⚠️ немає звʼязку';cb&&cb(j,x.status)};
 b=b||{};b.op=op;x.send(JSON.stringify(b))}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function beep(n){try{if(!ctx)return;for(var k=0;k<(n||1);k++){var o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=880+k*220;g.gain.value=.5;o.connect(g);g.connect(ctx.destination);var t=ctx.currentTime+k*.5;o.start(t);o.stop(t+.4)}}catch(e){}}
function show(){$('login').style.display=T?'none':'block';$('app').style.display=T?'block':'none';if(T)load()}
function draw(){var now=Date.now(),a=list.filter(function(e){return!e.done}).sort(function(x,y){return(y.urgent?1:0)-(x.urgent?1:0)||x.ts-y.ts}),h='';
 $('n').textContent=a.length;
 for(var i=0;i<a.length;i++){var e=a[i],m=Math.floor((now-e.ts)/60000);
  h+='<div class="c'+(e.urgent?' u':e.start?' s':'')+'"><div class="h"><b>Стіл '+e.t+'</b><span class="t'+(m>=15?' rr':m>=10?' y':'')+'">⏱ '+m+' хв</span></div><div class="m">'+esc(e.at)+' · '+esc(e.by)+'</div>'+(e.urgent?'<span class="tag">⚡ ТЕРМІНОВО</span>':'')+(e.tw?'<span class="tag" style="background:#0a84ff">🥡 З СОБОЮ</span>':'')+(e.comment?'<div class="m" style="color:#ffd60a">💬 '+esc(e.comment)+'</div>':'');
  for(var j=0;j<e.items.length;j++){var x=e.items[j];h+='<button class="i'+(x.cancel?' x':x.done?' d':'')+'" data-id="'+e.id+'" data-i="'+j+'"'+(x.cancel?' disabled':'')+'><b>'+x.q+'×</b> '+esc(x.n)+(x.cancel?' — СКАСОВАНО':'')+'</button>'}
  h+='<div class="b">'+(e.start?'':'<button class="btn o" data-st="'+e.id+'">🔥 Готую</button>')+'<button class="btn g" data-all="'+e.id+'">✅ ВСЕ ГОТОВО</button></div></div>'}
 $('q').innerHTML=h||'<div class="e">✅ Черга порожня</div>'}
function load(){api('kitchen',{},function(j){if(!j.list)return;list=j.list;var ids={},nw=0,urg=0;for(var i=0;i<list.length;i++){var e=list[i];ids[e.id]=1;if(seen&&!seen[e.id]&&!e.done){nw++;if(e.urgent)urg=1}}if(nw)beep(urg?3:2);seen=ids;draw()})}
document.addEventListener('click',function(ev){var t=ev.target;while(t&&t!==document&&!t.getAttribute('data-id')&&!t.getAttribute('data-st')&&!t.getAttribute('data-all'))t=t.parentNode;if(!t||t===document)return;
 if(t.getAttribute('data-id'))api('kDone',{id:t.getAttribute('data-id'),i:+t.getAttribute('data-i')},load);
 else if(t.getAttribute('data-st'))api('kStart',{id:t.getAttribute('data-st')},load);
 else if(t.getAttribute('data-all')&&confirm('Все готово?'))api('kDone',{id:t.getAttribute('data-all')},load)});
$('go').onclick=function(){api('login',{pin:$('pin').value},function(j){if(j.token&&j.me&&(j.me.role==='cook'||j.me.role==='admin')){T=j.token;localStorage.setItem('ktok',T);show()}else $('err').textContent=j.token?'Цей екран — для кухаря':'Невірний PIN'})};
$('out').onclick=function(){if(confirm('Вийти?')){api('logout',{});T='';localStorage.removeItem('ktok');show()}};
$('start').onclick=function(){try{var A=window.AudioContext||window.webkitAudioContext;ctx=new A();beep(1)}catch(e){}$('gate').style.display='none'};
$('gate').style.display='block';show();setInterval(function(){if(T)load()},4000);setInterval(function(){if(T)draw()},30000);
</script></body></html>`;
