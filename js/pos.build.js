var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
(() => {
  var _a;
  const API = new URLSearchParams(location.search).get("api") || (/workers\.dev$/.test(location.hostname) ? location.origin : "https://varvar-menu.varvar.workers.dev");
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = (n) => `${Math.round(n || 0).toLocaleString("uk-UA")} \u20B4`;
  const store = { get(k, d) {
    try {
      const v = localStorage.getItem("pos_" + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  }, set(k, v) {
    try {
      localStorage.setItem("pos_" + k, JSON.stringify(v));
    } catch (e) {
    }
  } };
  const hhmm = (t) => new Date(t).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  const S = {
    token: store.get("token", ""),
    me: store.get("me", null),
    view: "hall",
    n: 15,
    tables: {},
    events: [],
    printer: {},
    menu: null,
    tw: {},
    packAdj: {},
    open: 0,
    carts: store.get("carts", {}),
    coms: {},
    grp: store.get("grp", ""),
    cat: "",
    q: "",
    fav: [],
    groups: [],
    photos: store.get("photos", true),
    shift: null,
    shown: /* @__PURE__ */ new Set(),
    rep: { p: "d", pay: "", by: "", grp: "", cat: "", t: "", q: "", tab: "dishes", sort: "s" },
    mobileMenu: false,
    data: {},
    seen: /* @__PURE__ */ new Set(),
    ready: false,
    live: false
  };
  const isAdmin = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "admin";
  };
  const setHTML = (el, html) => {
    if (el && el._h !== html) {
      el._h = html;
      el.innerHTML = html;
    }
  };
  async function api(op, data = {}) {
    const r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op }, data)) }), 12e3);
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && op !== "login") {
      logout(true);
      throw new Error("auth");
    }
    if (!r.ok) {
      const e = new Error(j.error || "error");
      e.data = j;
      throw e;
    }
    return j;
  }
  const act = async (op, data, okMsg) => {
    try {
      const r = await api(op, data);
      if (okMsg) toast(okMsg);
      return r;
    } catch (e) {
      if (e.message !== "auth") toast("\u26A0\uFE0F " + errText(e.message));
      return null;
    }
  };
  const errText = (e) => ({ admin: "\u041B\u0438\u0448\u0435 \u0434\u043B\u044F \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430", empty: "\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0432\u0438\u0431\u0440\u0430\u043D\u043E", table: "\u041D\u0435\u0432\u0456\u0440\u043D\u0438\u0439 \u0441\u0442\u0456\u043B", nothing: "\u041D\u0435\u043C\u0430 \u0449\u043E \u0432\u0456\u0434\u043C\u0456\u043D\u044F\u0442\u0438" })[e] || e;
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454 (\u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442 / \u0434\u0430\u0442\u0443 \u0439 \u0447\u0430\u0441 \u043D\u0430 \u043A\u043E\u043C\u043F\u02BC\u044E\u0442\u0435\u0440\u0456)")), ms))]);
  let pin = "";
  function showLogin(msg = "") {
    $("#app").hidden = true;
    $("#login").hidden = false;
    $("#lErr").textContent = msg;
    pin = "";
    dots();
    $("#keypad").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("") + '<button class="fn" data-k="c">\u0421\u0442\u0435\u0440\u0442\u0438</button><button data-k="0">0</button><button class="fn" data-k="b">\u232B</button>';
  }
  const dots = () => {
    const d = $("#dots");
    const len = 4;
    d.innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < pin.length ? "on" : ""}"></i>`).join("");
  };
  async function tryLogin(body) {
    $("#lErr").style.color = "var(--muted)";
    $("#lErr").textContent = "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u044E\u2026";
    try {
      const r = await api("login", body);
      if (r.register) return showReg(r.register, body.pin);
      S.token = r.token;
      S.me = r.me;
      store.set("token", r.token);
      store.set("me", r.me);
      start();
    } catch (e) {
      $("#lErr").style.color = "";
      $("#lErr").textContent = e.message === "error" ? "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u02BC\u0454\u0434\u043D\u0430\u043D\u043D\u044F" : /fetch|network/i.test(e.message) ? "\u041D\u0435\u043C\u0430\u0454 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443 \u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C: " + e.message : e.message;
      pin = "";
      dots();
      $("#dots").classList.add("shake");
      setTimeout(() => $("#dots").classList.remove("shake"), 400);
    }
  }
  document.addEventListener("keydown", (e) => {
    if ($("#login").hidden || $("#pinView").hidden || !$("#regView").hidden) return;
    if (/^\d$/.test(e.key)) pinKey(e.key);
    else if (e.key === "Backspace") pinKey("b");
    else if (e.key === "Escape") pinKey("c");
    else if (e.key === "Enter" && pin.length >= 4) {
      clearTimeout(tryLogin.t);
      tryLogin({ pin });
    }
  });
  $("#keypad").addEventListener("click", (e) => {
    var _a2;
    const k = (_a2 = e.target.closest("[data-k]")) == null ? void 0 : _a2.dataset.k;
    if (k) pinKey(k);
  });
  function pinKey(k) {
    if (k === "c") pin = "";
    else if (k === "b") pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += k;
    dots();
    if (pin.length === 4) {
      clearTimeout(tryLogin.t);
      tryLogin.t = setTimeout(() => tryLogin({ pin }), 150);
    }
  }
  let regCodeV = "";
  function showReg(role, code) {
    regCodeV = code;
    pin = "";
    dots();
    $("#pinView").hidden = true;
    $("#passView").hidden = true;
    $("#regView").hidden = false;
    $("#loginSub").textContent = "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430";
    $("#regRole").textContent = role === "admin" ? "\u{1F510} \u041D\u043E\u0432\u0438\u0439 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440" : "\u{1F9D1}\u200D\u{1F373} \u041D\u043E\u0432\u0438\u0439 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442";
    $("#lErr").textContent = "";
    $("#rName").value = "";
    $("#rPin").value = "";
    $("#rPin2").value = "";
    setTimeout(() => $("#rName").focus(), 50);
  }
  document.querySelectorAll(".pin4").forEach((i) => i.addEventListener("input", () => {
    i.value = i.value.replace(/\D/g, "").slice(0, 4);
  }));
  $("#regBack").onclick = () => {
    $("#regView").hidden = true;
    $("#pinView").hidden = false;
    $("#loginSub").textContent = "\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u0441\u0432\u0456\u0439 PIN";
    $("#lErr").textContent = "";
  };
  $("#regView").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#rName").value.trim(), p1 = $("#rPin").value.trim(), p2 = $("#rPin2").value.trim();
    if (!/^\d{4}$/.test(p1)) {
      $("#lErr").textContent = "PIN \u2014 \u0440\u0456\u0432\u043D\u043E 4 \u0446\u0438\u0444\u0440\u0438";
      return;
    }
    if (p1 !== p2) {
      $("#lErr").textContent = "PIN-\u0438 \u043D\u0435 \u0437\u0431\u0456\u0433\u0430\u044E\u0442\u044C\u0441\u044F";
      return;
    }
    $("#lErr").style.color = "var(--muted)";
    $("#lErr").textContent = "\u0420\u0435\u0454\u0441\u0442\u0440\u0443\u044E\u2026";
    try {
      const r = await api("register", { code: regCodeV, name, pin: p1 });
      S.token = r.token;
      S.me = r.me;
      store.set("token", r.token);
      store.set("me", r.me);
      $("#regView").hidden = true;
      $("#pinView").hidden = false;
      $("#lErr").textContent = "";
      start();
      toast(`\u{1F44B} \u0412\u0456\u0442\u0430\u044E, ${r.me.name}! \u0412\u0430\u0448 PIN \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E`);
    } catch (e2) {
      $("#lErr").style.color = "";
      $("#lErr").textContent = e2.message;
    }
  };
  if ($("#toPass")) $("#toPass").onclick = () => {
    $("#pinView").hidden = true;
    $("#passView").hidden = false;
    $("#loginSub").textContent = "\u0412\u0445\u0456\u0434 \u043F\u0430\u0440\u043E\u043B\u0435\u043C";
    $("#lName").focus();
  };
  $("#toPin").onclick = () => {
    $("#pinView").hidden = false;
    $("#passView").hidden = true;
    $("#loginSub").textContent = "\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u0441\u0432\u0456\u0439 PIN";
  };
  $("#passView").onsubmit = (e) => {
    e.preventDefault();
    tryLogin({ pass: $("#lPass").value, name: $("#lName").value });
  };
  async function logout(expired) {
    if (!expired) await api("logout").catch(() => {
    });
    S.token = "";
    S.me = null;
    store.set("token", "");
    store.set("me", null);
    ws == null ? void 0 : ws.close();
    closeSheet();
    showLogin(expired ? "\u0421\u0435\u0441\u0456\u044F \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u043B\u0430\u0441\u044C \u2014 \u0443\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0437\u043D\u043E\u0432\u0443" : "");
  }
  async function loadState() {
    const r = await api("state");
    S.me = __spreadValues(__spreadValues({}, S.me), r.me);
    S.myTip = r.myTip;
    S.n = r.n;
    S.printer = r.printer;
    S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map((b) => [b.t, b]));
    const fresh = r.events.filter((e) => !S.seen.has(e.id));
    if (S.ready && fresh.some((e) => e.k === "guest" || e.k === "check")) ding();
    r.events.forEach((e) => S.seen.add(e.id));
    S.events = r.events;
    S.ready = true;
    render();
  }
  async function loadMenu() {
    const r = await api("menu");
    S.menu = r.menu;
    S.fav = r.fav || [];
    S.groups = r.groups || [];
    if (S.open) renderSheet();
    if (["stop", "menu", "reports"].includes(S.view)) renderMain();
  }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0;
  function revive() {
    if (!S.token) return;
    S.live = false;
    liveDot();
    try {
      ws.onclose = null;
      ws.close();
    } catch (e) {
    }
    clearInterval(pingT);
    connect();
  }
  function connect() {
    try {
      ws == null ? void 0 : ws.close();
    } catch (e) {
    }
    ws = new WebSocket(API.replace(/^http/, "ws") + "/api/pos/live?token=" + S.token);
    ws.onopen = () => {
      S.live = true;
      lastMsg = Date.now();
      liveDot();
      clearInterval(pingT);
      pingT = setInterval(() => {
        if (Date.now() - lastMsg > 45e3) return revive();
        ws.readyState === 1 && ws.send("ping");
      }, 15e3);
      loadState().catch(() => {
      });
    };
    ws.onmessage = (e) => {
      lastMsg = Date.now();
      if (e.data === "pong") return;
      let m;
      try {
        m = JSON.parse(e.data);
      } catch (e2) {
        return;
      }
      if (m.type !== "changed") return;
      clearTimeout(reloadT);
      reloadT = setTimeout(() => {
        loadState().catch(() => {
        });
        if (m.keys.includes("menu") || m.keys.includes("fav")) loadMenu().catch(() => {
        });
        if (["closed", "reports", "settings", "cash"].includes(S.view) && m.keys.some((k) => ["closed", "day", "exp", "staff", "shift", "z", "mov", "tipbal", "tippay", "void"].includes(k))) loadView(true);
      }, 120);
    };
    ws.onclose = () => {
      S.live = false;
      liveDot();
      clearInterval(pingT);
      clearTimeout(wsTimer);
      if (S.token) wsTimer = setTimeout(connect, 2e3);
    };
  }
  const liveDot = () => {
    $("#live").className = "live" + (S.live ? " on" : "");
  };
  setInterval(() => {
    if (S.token && !S.live && document.visibilityState === "visible") loadState().catch(() => {
    });
  }, 15e3);
  const wake = () => {
    if (document.visibilityState !== "visible" || !S.token) return;
    loadState().catch(() => {
    });
    if (!S.live || Date.now() - lastMsg > 2e4) revive();
  };
  document.addEventListener("visibilitychange", wake);
  addEventListener("pageshow", wake);
  addEventListener("focus", wake);
  addEventListener("online", wake);
  let actx;
  function ding() {
    try {
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      [0, 0.16].forEach((d, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = i ? 1320 : 880;
        g.gain.setValueAtTime(1e-4, actx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + d + 0.25);
        o.connect(g).connect(actx.destination);
        o.start(actx.currentTime + d);
        o.stop(actx.currentTime + d + 0.3);
      });
    } catch (e) {
    }
  }
  const NAV = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F4DC}", "\u0417\u0430\u043A\u0440\u0438\u0442\u0456"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430", 1], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438", 1], ["menu", "\u{1F4D6}", "\u041C\u0435\u043D\u044E", 1], ["printer", "\u{1F5A8}", "\u041F\u0440\u0438\u043D\u0442\u0435\u0440"], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442.", 1]];
  function renderNav() {
    var _a2;
    const newCnt = S.events.filter((e) => e.k === "guest" && e.s !== "acc").length;
    setHTML($("#nav"), `<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>` + NAV.filter((n) => !n[3] || isAdmin()).map(([v, ic, l]) => `<button class="${S.view === v ? "on" : ""}${["printer", "menu", "settings", "stop"].includes(v) ? " more-i" : ""}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}</button>`).join("") + `<button class="feed-btn" data-a="feed"><span class="ic">\u{1F514}</span>\u0421\u0442\u0440\u0456\u0447\u043A\u0430${newCnt ? `<span class="badge">${newCnt}</span>` : ""}</button><button class="more-btn ${["printer", "menu", "settings", "stop"].includes(S.view) ? "on" : ""}" data-a="more"><span class="ic">\u22EF</span>\u0429\u0435</button><div class="grow"></div><div class="me">${esc((_a2 = S.me) == null ? void 0 : _a2.name)}<br>${isAdmin() ? "\u0430\u0434\u043C\u0456\u043D" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"}</div><button data-a="switch"><span class="ic">\u{1F512}</span>\u0412\u0438\u0439\u0442\u0438</button>`);
  }
  function render() {
    renderNav();
    renderFeed();
    if (["hall", "printer"].includes(S.view)) renderMain();
    if (S.open) renderSheet();
  }
  function hallHTML() {
    var _a2;
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter((e) => e.k === "guest" && e.s !== "acc").map((e) => e.t));
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map((t) => {
      const b = S.tables[t];
      if (!b) return `<button class="tbl" data-a="table" data-t="${t}"><div class="n">${t}</div><div class="st">\u0432\u0456\u043B\u044C\u043D\u0438\u0439</div></button>`;
      const cls = ["busy", b.check ? "check" : "", pending.has(t) ? "new" : ""].join(" ");
      const tag = b.check ? `<span class="tag c">\u{1F9FE} \u0440\u0430\u0445\u0443\u043D\u043E\u043A</span>${b.pay ? `<i class="pay" title="${b.pay === "card" ? "\u043A\u0430\u0440\u0442\u0430" : "\u0433\u043E\u0442\u0456\u0432\u043A\u0430"}">${b.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</i>` : ""}` : pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : "";
      return `<button class="tbl ${cls}" data-a="table" data-t="${t}">${tag}<div class="n">${t}</div><div class="st">${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.${b.disc ? ` \xB7 \u2212${b.disc}%` : ""}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"}</div></button>`;
    }).join("");
    return `<div class="head"><h1>\u0417\u0430\u043B</h1><div class="stat">\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u043E<b>${list.length}</b></div><div class="stat tipstat" title="\u041D\u0430\u043A\u043E\u043F\u0438\u0447\u0435\u043D\u043E, \u0449\u0435 \u043D\u0435 \u0432\u0438\u0434\u0430\u043D\u043E">\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456<b class="money">${money(((_a2 = S.myTip) == null ? void 0 : _a2.sum) || 0)}</b></div><div class="stat">\u0423 \u0437\u0430\u043B\u0456<b class="money">${money(sum)}</b></div>
      <button class="btn primary" data-a="newOrder">\u2795 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</button></div><div class="tables">${tiles}</div>`;
  }
  const evTitle = (e) => ({
    guest: `\u{1F6CE} \u0421\u0442\u0456\u043B ${e.t} \u2014 ${esc((e.kind || "\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F").toLowerCase())}`,
    check: `\u{1F9FE} \u0421\u0442\u0456\u043B ${e.t} \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0447\u0435\u043A${e.pay ? e.pay === "card" ? " \xB7 \u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : " \xB7 \u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430" : ""}${e.tip ? ` \xB7 \u{1F49D} ${money(e.tip)}` : ""}`,
    waiter: `\u{1F9D1}\u200D\u{1F373} \u0421\u0442\u0456\u043B ${e.t} \u2014 ${esc(e.by)}${e.src === "\u043A\u0430\u0441\u0430" ? " (\u043A\u0430\u0441\u0430)" : ""}`,
    close: `\u2705 \u0421\u0442\u0456\u043B ${e.t} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u2014 ${money(e.sum)} ${e.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}${e.print === false ? " \xB7 \u0431\u0435\u0437 \u0447\u0435\u043A\u0430" : ""}`,
    shift: esc(e.text),
    del: `\u{1F5D1} \u0421\u0442\u0456\u043B ${e.t} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E (${money(e.sum)})`,
    move: `\u2194\uFE0F ${esc(e.text)}`,
    disc: `% \u0421\u0442\u0456\u043B ${e.t}: ${esc(e.text)}`,
    rm: `\u270F\uFE0F \u0421\u0442\u0456\u043B ${e.t}: ${esc(e.text)}`,
    pre: `\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0441\u0442\u0456\u043B ${e.t}`,
    noscan: `\u{1F6A8}\u{1F4F5}\u{1F6AB} \u0421\u0422\u0406\u041B ${e.t} \u2014 \u041D\u0415 \u041C\u041E\u0416\u0415 \u0417\u0410\u041C\u041E\u0412\u0418\u0422\u0418 \u{1F6AB}\u{1F4F5}\u{1F6A8}<br><small>\u0413\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0432\u0430\u0432 QR (\u0430\u0431\u043E \u043C\u0438\u043D\u0443\u043B\u0430 \u0433\u043E\u0434\u0438\u043D\u0430). \u041F\u0456\u0434\u0456\u0439\u0434\u0456\u0442\u044C: \u{1F4F7} \u043D\u0435\u0445\u0430\u0439 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0454 QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u{1F446}</small>`
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    setHTML($("#events"), S.events.length ? [...S.events].reverse().map((e) => {
      var _a2, _b, _c;
      const add = ((_a2 = e.prev) == null ? void 0 : _a2.length) && ((_b = e.lines) == null ? void 0 : _b.length);
      const lines = ((_c = e.lines) == null ? void 0 : _c.length) ? `${add ? '<div class="addtag">\u2795 \u0414\u041E\u0417\u0410\u041C\u041E\u0412\u041B\u0415\u041D\u041D\u042F</div>' : ""}<div class="lines${add ? " add" : ""}">${e.lines.map(esc).join("\n")}</div>` : "";
      const by = e.by && !["waiter"].includes(e.k) ? ` \xB7 ${esc(e.by)}` : "";
      const btns = e.k === "noscan" ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${e.t}</button></div>` : e.k === "guest" || e.k === "check" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "\u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E")}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button>`}<button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${e.t}</button></div>` : "";
      const fresh = S.shown.size && !S.shown.has(e.id) ? " fresh" : "";
      return `<div class="ev ${e.k}${e.s === "acc" ? " acc" : ""}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}${e.sum && ["guest", "waiter"].includes(e.k) ? `<div class="muted">\u0421\u0443\u043C\u0430 ${money(e.sum)}</div>` : ""}${btns}</div>`;
    }).join("") : '<div class="muted" style="padding:12px">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043F\u043E\u0434\u0456\u0439 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>');
    S.events.forEach((e) => S.shown.add(e.id));
  }
  const cartOf = (t) => {
    var _a2;
    return (_a2 = S.carts)[t] || (_a2[t] = {});
  };
  const FOOD = ["minimax", "pasta", "burgers", "salads", "snacks", "soups", "pans"];
  const packItem = () => {
    var _a2, _b;
    return (_b = (_a2 = S.menu) == null ? void 0 : _a2.categories.find((c) => c.id === "upakuvannia")) == null ? void 0 : _b.items[0];
  };
  const packQ = (t) => {
    if (!S.tw[t] || !S.menu) return 0;
    const food = new Set(S.menu.categories.filter((c) => FOOD.includes(c.id)).flatMap((c) => c.items.map((i) => i.id)));
    return Math.max(0, Object.values(cartOf(t)).filter((x) => food.has(x.id)).reduce((s, x) => s + x.q, 0) + (S.packAdj[t] || 0));
  };
  const saveCarts = () => store.set("carts", S.carts);
  const itemsAll = () => S.menu ? S.menu.categories.flatMap((c) => c.items) : [];
  function openTable(t) {
    S.open = +t;
    S.mobileMenu = !S.tables[t];
    S.q = "";
    if (!S.menu) loadMenu();
    $("#layer").innerHTML = `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet"><div class="sheet-head" id="shHead"></div><div id="shPend"></div>
      <div class="sheet-body" id="shBody"><div class="bill" id="shBill"></div><div class="menu-pane"><div id="shNav"></div><div class="items" id="shItems"></div></div></div></div>`;
    renderSheet();
  }
  function closeSheet() {
    S.open = 0;
    $("#layer").innerHTML = "";
  }
  const grpList = () => [{ id: "fav", name: "\u2B50 \u041E\u0431\u0440\u0430\u043D\u0456" }, ...S.groups];
  const curGrp = () => S.grp || (S.fav.length ? "fav" : "kitchen");
  const grpCats = (g) => {
    const gg = S.groups.find((x) => x.id === g);
    return gg ? S.menu.categories.filter((c) => gg.cats.includes(c.id)) : [];
  };
  function menuItems() {
    const q = S.q.trim().toLowerCase();
    if (q) return itemsAll().filter((i) => i.name.uk.toLowerCase().includes(q) || (i.name.en || "").toLowerCase().includes(q));
    const g = curGrp();
    if (g === "fav") return S.fav.map((id) => itemsAll().find((i) => i.id === id)).filter(Boolean);
    const cats = grpCats(g), c = cats.find((x) => x.id === S.cat) || cats[0];
    return c ? c.items : [];
  }
  function renderSheet() {
    var _a2, _b, _c;
    const t = S.open;
    if (!t || !$("#shHead")) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const pk = packItem(), pq = pk ? packQ(t) : 0;
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0) + (pq ? pq * pk.price : 0);
    setHTML($("#shHead"), `<h2>\u0421\u0442\u0456\u043B ${t}</h2>${b ? `<span class="total money">${money(b.pay2)}</span>${b.disc ? `<span class="chip">\u2212${b.disc}%</span>` : ""}${b.tip ? `<span class="chip tipc">\u{1F49D} ${money(b.tip)}</span>` : ""}<span class="muted hide-s">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"} \xB7 ${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.</span>${b.check ? '<span class="chip" style="background:var(--orange);color:#000">\u{1F9FE} \u0447\u0435\u043A</span>' : ""}` : '<span class="muted">\u043D\u043E\u0432\u0438\u0439</span>'}
        <span class="sp"></span><div class="tabs2"><button class="${S.mobileMenu ? "" : "on"}" data-a="tab" data-m="0">\u0420\u0430\u0445\u0443\u043D\u043E\u043A${cartRows.length ? ` (${cartRows.reduce((s, [, x]) => s + x.q, 0)})` : ""}</button><button class="${S.mobileMenu ? "on" : ""}" data-a="tab" data-m="1">\u041C\u0435\u043D\u044E</button></div>
        <button class="close-x" data-a="closeSheet">\u2715</button>`);
    const pend = S.events.filter((e) => e.k === "guest" && e.s !== "acc" && +e.t === t);
    setHTML($("#shPend"), pend.map((e) => `<div class="pend"><div><b>\u{1F6CE} \u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F \xB7 ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join("<br>")}</div>${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button></div>`).join(""));
    $("#shBody").className = "sheet-body" + (S.mobileMenu ? " show-menu" : "");
    const billRows = b ? b.items.map((it) => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} \xD7 ${Math.round(it.sum / it.q)} \u20B4</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1">\u2212</button></div>`).join("") : '<div class="muted" style="padding:8px 4px">\u0420\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0432 \u043C\u0435\u043D\u044E</div>';
    const discRow = (b == null ? void 0 : b.disc) ? `<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%</div><b class="money" style="color:var(--green)">\u2212${b.total - b.pay2}</b><button class="rb minus" data-a="discSet" data-p="0">\xD7</button></div>` : "";
    const tipRow = (b == null ? void 0 : b.tip) ? `<div class="row"><div class="nm">\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<small>\u0432\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">\xD7</button>' : ""}</div>` : "";
    const comments = b ? b.log.filter((o) => o.comment).map((o) => `<div class="muted" style="padding:2px 6px">\u{1F4AC} ${esc(o.comment)}</div>`).join("") : "";
    const cartHTML = cartRows.length ? `<div class="cart"><h3>\u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} \u20B4</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">\u2212</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join("")}${pq ? `<div class="row auto"><div class="nm">\u{1F961} ${esc(pk.name.uk)}<small>${pk.price} \u20B4 \xD7 ${pq}${S.packAdj[t] ? "" : " \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E"}</small></div><button class="rb minus" data-a="pk" data-d="-1">\u2212</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ""}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="\u{1F4AC} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u0434\u043B\u044F \u043A\u0443\u0445\u043D\u0456" value="${esc(S.coms[t] || "")}"><button class="btn sm ${S.tw[t] ? "primary" : "ghost"}" data-a="tw">\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">\u2715</button><button class="btn primary" data-a="send">\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \xB7 ${money(cartSum)}</button></div></div>` : "";
    const actions = b ? `<div class="actions"><button class="btn" data-a="pre">\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A</button><button class="btn" data-a="disc">% \u0417\u043D\u0438\u0436\u043A\u0430</button>
      <button class="btn" data-a="move">\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438</button>${isAdmin() ? '<button class="btn red" data-a="delTable">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>' : '<button class="btn" data-a="mobileMenu">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438</button>'}
      <button class="btn green wide" data-a="closeT">\u{1F4B0} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \xB7 ${money(b.pay2)}</button></div>` : "";
    const keepBill = (_a2 = $("#shBill .scroll")) == null ? void 0 : _a2.scrollTop, focusCom = ((_b = document.activeElement) == null ? void 0 : _b.id) === "cartCom";
    setHTML($("#shBill"), `<div class="scroll"><h3>\u0420\u0430\u0445\u0443\u043D\u043E\u043A</h3>${billRows}${discRow}${tipRow}${comments}</div>${cartHTML}${actions}`);
    if (keepBill) $("#shBill .scroll").scrollTop = keepBill;
    if (focusCom) {
      const s = $("#cartCom");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
    if (!S.menu) {
      setHTML($("#shItems"), '<div class="muted" style="padding:20px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043C\u0435\u043D\u044E\u2026</div>');
      return;
    }
    const g = curGrp(), q = S.q.trim(), cats = g === "fav" ? [] : grpCats(g), cur = (cats.find((x) => x.id === S.cat) || cats[0] || {}).id;
    const focusSearch = ((_c = document.activeElement) == null ? void 0 : _c.id) === "search";
    setHTML($("#shNav"), `<div class="seg">${grpList().map((x) => `<button class="${!q && x.id === g ? "on" : ""}" data-a="grp" data-g="${x.id}">${esc(x.name)}</button>`).join("")}</div>
      ${cats.length > 1 && !q ? `<div class="cats">${cats.map((c) => `<button class="chip ${c.id === cur ? "on" : ""}" data-a="cat" data-c="${c.id}">${esc(c.name.uk)}</button>`).join("")}</div>` : ""}
      <div class="srow"><input class="search" id="search" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u0441\u0442\u0440\u0430\u0432\u0438" value="${esc(S.q)}"><button class="btn sm ghost" data-a="photos" title="\u0424\u043E\u0442\u043E">${S.photos ? "\u{1F5BC}" : "\u{1F4DD}"}</button></div>`);
    if (focusSearch) {
      const s = $("#search");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
    const items = menuItems();
    $("#shItems").classList.toggle("nophoto", !S.photos);
    setHTML($("#shItems"), items.map((it) => `<div class="item ${it.hidden ? "off" : ""}" data-a="add" data-id="${it.id}" role="button"><span class="cnt" data-cnt="${it.id}" hidden></span>${S.photos && it.img ? `<img src="${esc(it.img)}" alt="" decoding="async">` : ""}<span class="nm">${esc(it.name.uk)}</span>${it.size && !it.variants ? `<span class="muted sz">${esc(it.size)}</span>` : ""}<span class="pr">${it.hidden ? "\u26D4 \u043D\u0435\u043C\u0430\u0454" : it.variants ? it.variants.map((v) => v.p).join(" / ") + " \u20B4" : it.price + " \u20B4"}</span><span class="star ${S.fav.includes(it.id) ? "on" : ""}" data-a="fav" data-id="${it.id}" title="\u041E\u0431\u0440\u0430\u043D\u0456">${S.fav.includes(it.id) ? "\u2605" : "\u2606"}</span></div>`).join("") || `<div class="muted" style="padding:10px">${g === "fav" && !q ? "\u041E\u0431\u0440\u0430\u043D\u0438\u0445 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u2606 \u043D\u0430 \u0441\u0442\u0440\u0430\u0432\u0456, \u0449\u043E\u0431 \u0434\u043E\u0434\u0430\u0442\u0438" : "\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E"}</div>`);
    paintCounts();
  }
  function paintCounts() {
    const cart = cartOf(S.open), n = {};
    Object.entries(cart).forEach(([k, x]) => {
      const id = k.split("|")[0];
      n[id] = (n[id] || 0) + x.q;
    });
    document.querySelectorAll("[data-cnt]").forEach((el) => {
      const v = n[el.dataset.cnt] || 0;
      el.hidden = !v;
      el.textContent = v;
    });
  }
  async function addItem(id) {
    var _a2, _b, _c;
    const wasKb = searching();
    const it = itemsAll().find((i) => i.id === id);
    if (!it) return;
    if (it.hidden) return toast("\u26D4 " + it.name.uk + " \u2014 \u0443 \u0441\u0442\u043E\u043F-\u043B\u0438\u0441\u0442\u0456");
    let v = null;
    if (it.variants) {
      v = await choose(it.name.uk, "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0440\u043E\u0437\u043C\u0456\u0440", it.variants.map((x) => ({ label: `${x.v} ${it.size || ""} \xB7 ${x.p} \u20B4`, val: x.v })));
      if (v == null) {
        if (wasKb) (_a2 = $("#search")) == null ? void 0 : _a2.focus();
        return;
      }
    }
    const vv = (_b = it.variants) == null ? void 0 : _b.find((x) => x.v === v);
    const key = it.id + (v ? "|" + v : ""), cart = cartOf(S.open);
    cart[key] || (cart[key] = { id: it.id, v, name: it.name.uk + (vv ? ` ${vv.v} ${it.size || ""}`.trimEnd() : ""), price: vv ? vv.p : it.price, q: 0 });
    const keepKb = wasKb || searching();
    cart[key].q++;
    saveCarts();
    if (S.q) {
      S.q = "";
      const se = $("#search");
      if (se) se.value = "";
    }
    renderSheet();
    if (keepKb && !searching()) (_c = $("#search")) == null ? void 0 : _c.focus();
  }
  async function sendCart() {
    const t = S.open, cart = cartOf(t), pk = packItem(), pq = pk ? packQ(t) : 0, items = [...Object.values(cart).map((x) => ({ id: x.id, v: x.v, q: x.q })), ...pq ? [{ id: pk.id, q: pq }] : []];
    if (!items.length) return;
    const btn = document.querySelector('[data-a="send"]');
    if (btn) btn.disabled = true;
    const r = await act("order", { t, items, comment: [S.tw[t] ? "\u0417 \u0421\u041E\u0411\u041E\u042E" : "", S.coms[t] || ""].filter(Boolean).join(" \xB7 ") });
    if (r) {
      S.carts[t] = {};
      S.coms[t] = "";
      S.tw[t] = false;
      S.packAdj[t] = 0;
      saveCarts();
      S.mobileMenu = false;
      toast(`\u{1F5A8} \u0421\u0442\u0456\u043B ${t}: \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E`);
      await loadState().catch(() => {
      });
    } else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const v = await choose(`\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ${t}`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${b.tip ? ` + \u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ""}${b.pay ? ` \xB7 \u0433\u0456\u0441\u0442\u044C \u0445\u043E\u0447\u0435 ${b.pay === "card" ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u043E\u044E" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E"}` : ""}`, [
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "cash:1", cls: "green" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "card:1", cls: "blue" },
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "cash:0" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "card:0" }
    ]);
    if (!v) return;
    const [pay, pr] = v.split(":");
    const r = await act("close", { t, pay, print: pr === "1" });
    if (r == null ? void 0 : r.r) {
      toast(`\u2705 \u0421\u0442\u0456\u043B ${t} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 ${money(r.r.sum)}`);
      closeSheet();
      loadState().catch(() => {
      });
    }
  }
  const VOID_R = ["\u0413\u0456\u0441\u0442\u044C \u043F\u0435\u0440\u0435\u0434\u0443\u043C\u0430\u0432", "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430", "\u0414\u043E\u0432\u0433\u043E \u0447\u0435\u043A\u0430\u043B\u0438", "\u041D\u0435 \u0441\u043F\u043E\u0434\u043E\u0431\u0430\u043B\u043E\u0441\u044C", "\u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443", "\u0411\u0440\u0430\u043A / \u0437\u0456\u043F\u0441\u043E\u0432\u0430\u043D\u043E"];
  async function voidReason(title) {
    const v = await choose(title, "\u2753 \u0427\u043E\u043C\u0443? \u041F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0443 \u0437\u0432\u0456\u0442\u0430\u0445", [...VOID_R.map((r) => ({ label: r, val: r })), { label: "\u270F\uFE0F \u0421\u0432\u043E\u044F \u043F\u0440\u0438\u0447\u0438\u043D\u0430", val: "own" }]);
    if (v !== "own") return v || null;
    return await ask("\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u043D\u044F", "\u041D\u0430\u043F\u0440.: \u0433\u0456\u0441\u0442\u044C \u043F\u0440\u043E\u043B\u0438\u0432, \u0437\u0430\u043C\u0456\u043D\u0438\u043B\u0438 \u043D\u0430 \u0456\u043D\u0448\u0443");
  }
  async function discFlow() {
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const max = isAdmin() ? 100 : 20;
    const v = await choose(`\u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0441\u0442\u0456\u043B ${t}`, `\u0421\u0443\u043C\u0430 ${money(b.total)}${b.disc ? ` \xB7 \u0437\u0430\u0440\u0430\u0437 ${b.disc}%` : ""}${isAdmin() ? "" : " \xB7 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u2014 \u0434\u043E 20%"}`, [...[5, 10, 15, 20, 25, 30, 50].filter((p2) => p2 <= max).map((p2) => ({ label: `${p2}%  \u2192  ${money(b.total - Math.round(b.total * p2 / 100))}`, val: String(p2) })), { label: "\u270F\uFE0F \u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A", val: "own" }, { label: "\u0411\u0435\u0437 \u0437\u043D\u0438\u0436\u043A\u0438", val: "0", cls: "red" }]);
    if (v == null) return;
    let p = v;
    if (v === "own") {
      p = await ask("\u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0437\u043D\u0438\u0436\u043A\u0438", `\u0427\u0438\u0441\u043B\u043E \u0432\u0456\u0434 0 \u0434\u043E ${max}`, "number");
      if (p == null) return;
      if (+p > max) return toast(`\u26D4 \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u043C\u043E\u0436\u0435 \u0434\u0430\u0442\u0438 \u0437\u043D\u0438\u0436\u043A\u0443 \u0434\u043E ${max}%`);
    }
    await act("discount", { t, pct: +p }, +p ? `% \u0417\u043D\u0438\u0436\u043A\u0430 ${p}%` : "\u0417\u043D\u0438\u0436\u043A\u0443 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
  }
  async function moveFlow() {
    const t = S.open;
    const to = await pickTable(`\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0441\u0442\u0456\u043B ${t}`, "\u041D\u0430 \u0437\u0430\u0439\u043D\u044F\u0442\u0438\u0439 \u0441\u0442\u0456\u043B (\u0436\u043E\u0432\u0442\u0438\u0439) \u2014 \u0440\u0430\u0445\u0443\u043D\u043A\u0438 \u043E\u0431\u02BC\u0454\u0434\u043D\u0430\u044E\u0442\u044C\u0441\u044F", t);
    if (!to) return;
    const r = await act("move", { t, to }, "");
    if (r == null ? void 0 : r.r) {
      toast(r.r.merged ? `\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E \u0437\u0456 \u0441\u0442\u043E\u043B\u043E\u043C ${to}` : `\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0456\u043B ${to}`);
      S.carts[to] = __spreadValues(__spreadValues({}, S.carts[to] || {}), cartOf(t));
      S.carts[t] = {};
      saveCarts();
      S.open = to;
      await loadState().catch(() => {
      });
    }
  }
  async function loadView(silent) {
    try {
      if (S.view === "cash") S.data.shift = await api("shift");
      if (S.view === "reports") {
        if (!S.menu) await loadMenu();
        await loadReport();
      }
      if (S.view === "closed") S.data.closed = (await api("closed")).list;
      if (S.view === "settings") {
        S.data.staff = await api("staff");
        S.data.wifi = await api("wifi");
      }
      if (["stop", "menu"].includes(S.view) && !S.menu) await loadMenu();
    } catch (e) {
    }
    renderMain();
  }
  function renderMain() {
    var _a2, _b, _c;
    const v = S.view, m = $("#main");
    m.classList.toggle("hall", v === "hall");
    if (v === "hall") {
      const [c, r] = hallGrid(m);
      m.style.setProperty("--cols", c);
      m.style.setProperty("--rows", r);
    }
    const html = (_b = (_a2 = { hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML })[v]) == null ? void 0 : _b.call(_a2);
    const fid = (_c = document.activeElement) == null ? void 0 : _c.id, keep = ["stopSearch", "rQ"].includes(fid);
    setHTML(m, html || "");
    if (keep) {
      const el = $("#" + fid);
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }
  function hallGrid(m) {
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90), n = S.n;
    let best = [1, n], score = 1e9;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), empty = c * r - n, ratio = w / c / (h / r);
      const sc = empty * 3 + Math.abs(Math.log(ratio / 1.15));
      if (sc < score) {
        score = sc;
        best = [c, r];
      }
    }
    return best;
  }
  addEventListener("resize", () => {
    if (S.view === "hall" && S.token) {
      $("#main")._h = "";
      renderMain();
    }
  });
  const payL = (x) => x.card ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430";
  function closedHTML() {
    const l = S.data.closed;
    if (!l) return '<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const gone = (x) => x.del || x.rm, ok = l.filter((x) => !gone(x));
    return `<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h1><div class="stat">\u0420\u0430\u0445\u0443\u043D\u043A\u0456\u0432<b>${ok.length}</b></div><div class="stat">\u0420\u0430\u0437\u043E\u043C<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">\u{1F4B5}<b class="money">${money(ok.reduce((s, x) => {
      var _a2;
      return s + ((_a2 = x.cash) != null ? _a2 : x.sum);
    }, 0))}</b></div><div class="stat">\u{1F4B3}<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => {
      var _a2, _b, _c, _d, _e;
      const ref = x.id || l.length - 1 - i;
      return `<div class="card" style="${gone(x) ? "opacity:.45" : ""}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} \xB7 \u0421\u0442\u0456\u043B ${x.t} \xB7 <span class="money">${money(x.sum)}</span> ${x.reopen ? "\u21A9\uFE0F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0437\u043D\u043E\u0432\u0443" : x.restored ? "\u21A9\uFE0F \u0441\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : x.del ? "\u{1F5D1} \u0441\u0442\u0456\u043B \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : x.rm ? "\u{1F9F9} \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438" : payL(x)}${x.disc ? ` \xB7 \u0437\u043D\u0438\u0436\u043A\u0430 ${x.disc}%` : ""}</h3><span class="muted">${esc(x.by || "")}</span>
        ${!gone(x) && ((_a2 = x.dishes) == null ? void 0 : _a2.length) ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">\u{1F5A8} \u0427\u0435\u043A</button>` : ""}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">\u{1F5D1} \u0417 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</button>` : ""}
        ${isAdmin() && !x.del && !x.reopen && ((_b = x.dishes) == null ? void 0 : _b.length) ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button>` : ""}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">\u21A9\uFE0F \u0423 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</button>` : ""}
        ${isAdmin() && x.del && !x.restored && ((_c = x.dishes) == null ? void 0 : _c.length) ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0441\u0442\u0456\u043B</button>` : ""}</div>
        ${((_d = x.dishes) == null ? void 0 : _d.length) ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}\xD7 ${esc(n)} \u2014 ${s}`).join(" \xB7 ")}</div>` : ""}${x.tip ? `<div class="muted" style="margin-top:4px">\u{1F49D} \u0432 \u0442.\u0447. \u0447\u0430\u0439\u043E\u0432\u0456 ${money(x.tip)}</div>` : ""}
        ${((_e = x.voids) == null ? void 0 : _e.length) ? `<div class="voids">\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E:${x.voids.map((v) => `<div>${v.at} \xB7 \u2212${money(v.sum)} ${esc(v.name)} \u2014 <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join("")}</div>` : ""}</div>`;
    }).join("") || '<div class="muted">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}</div>`;
  }
  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const q = S.q.trim().toLowerCase();
    return `<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1><span class="muted">\u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0435 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0454\u0442\u044C\u0441\u044F \u0433\u043E\u0441\u0442\u044F\u043C \u0456 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F</span></div>
      <input id="stopSearch" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A" value="${esc(S.q)}" style="max-width:420px;margin-bottom:14px">
      ${S.menu.categories.map((c) => {
      const its = c.items.filter((i) => !q || i.name.uk.toLowerCase().includes(q));
      return its.length ? `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${its.map((i) => `<div class="list-row"><div class="grow">${esc(i.name.uk)}</div><button class="switch ${i.hidden ? "" : "on"}" data-a="stopT" data-id="${i.id}" data-h="${i.hidden ? 0 : 1}"></button></div>`).join("")}</div>` : "";
    }).join("")}`;
  }
  function printerHTML() {
    var _a2;
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 6e4;
    return `<div class="head"><h1>\u041F\u0440\u0438\u043D\u0442\u0435\u0440</h1></div><div class="cards"><div class="card"><div class="big">${ok ? "\u2705 \u043D\u0430 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : p.seen ? "\u274C \u043D\u0435\u043C\u0430\u0454 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : "\u274C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0434\u0440\u0443\u043A\u0443 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430"}</div>
      <div class="muted">${p.seen ? "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0437\u0432\u02BC\u044F\u0437\u043E\u043A: " + hhmm(p.seen) : ""} \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456: ${(_a2 = p.q) != null ? _a2 : 0}</div></div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">\u{1F5A8} \u0422\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A</button><button class="btn" data-a="pQr">\u{1F533} QR \u043C\u0435\u043D\u044E \u0434\u043B\u044F \u0441\u0442\u043E\u043B\u0443</button></div></div>`;
  }
  function cashHTML() {
    const r = S.data.shift;
    if (!r) return '<div class="head"><h1>\u041A\u0430\u0441\u0430</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const z = r.z, pc = z.total ? Math.round(z.cash / z.total * 100) : 0;
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });
    const B = r.bal, sg = (n) => (n > 0 ? "+" : n < 0 ? "\u2212" : "") + money(Math.abs(n));
    const balH = B ? `<div class="bal">
      <button class="bal-c" data-a="balInfo" data-s="cash"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0456</span><b class="money">${money(B.cash)}</b><small>\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438</small></button>
      <button class="bal-c" data-a="balInfo" data-s="card"><span>\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u0446\u0456</span><b class="money">${money(B.card)}</b><small>\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438</small></button>
      <div class="bal-c tot"><span>\u{1F4B0} \u0420\u0430\u0437\u043E\u043C</span><b class="money">${money(B.total)}</b><small>\u0437 ${B.from ? B.from.split("-").reverse().join(".") : "\u2014"}</small></div></div>` : "";
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</div><div class="hero-n money">${money(z.total)}</div>
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(z.cash)}</b></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430 <b class="money">${money(z.card)}</b></span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">\u{1F9FE} Z-\u0437\u0432\u0456\u0442<small>\u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u0439 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438</small></button></div>`;
    const tiles = [["\u{1F9FE} \u0427\u0435\u043A\u0456\u0432", z.checks], ["\xD8 \u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", z.checks ? money(z.total / z.checks) : "\u2014"], ["\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(z.disc)], ["\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", money(z.tip || 0)], ["\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", money(z.exCash + z.exCard)], ["\u{1F4C8} \u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(z.net), "green"], ["\u23F3 \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0432 \u0437\u0430\u043B\u0456", z.openTables ? `${money(z.openSum)} \xB7 ${z.openTables} \u0441\u0442.` : "\u2014"]];
    const tilesH = `<div class="widgets">${tiles.map(([l, v, c]) => `<div class="widget ${c || ""}"><span>${l}</span><b class="money">${v}</b></div>`).join("")}</div>`;
    const ops = `<div class="card"><h3>\u26A1 \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457</h3><div class="opsg"><button class="btn" data-a="expense">\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430</button><button class="btn" data-a="cMove" data-t="in">\u2795 \u0412\u043D\u0435\u0441\u0442\u0438</button><button class="btn" data-a="cMove" data-t="out">\u2796 \u0412\u0438\u043B\u0443\u0447\u0438\u0442\u0438</button><button class="btn" data-a="cMove" data-t="x">\u{1F501} \u041E\u0431\u043C\u0456\u043D</button><button class="btn" data-a="cMove" data-t="kout">\u2796 \u0417 \u043A\u0430\u0440\u0442\u043A\u0438</button></div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u0412\u0438\u0442\u0440\u0430\u0442\u0430 \u2014 \u043A\u0443\u043F\u0438\u043B\u0438 \u0449\u043E\u0441\u044C \xB7 \u0412\u043D\u0435\u0441\u0442\u0438 / \u0432\u0438\u043B\u0443\u0447\u0438\u0442\u0438 \u2014 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u0447\u0438 \u0437\u0430\u0431\u0440\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \xB7 \u041E\u0431\u043C\u0456\u043D \u2014 \u043A\u0430\u0440\u0442\u043A\u0430 \u2194 \u0433\u043E\u0442\u0456\u0432\u043A\u0430 \xB7 \u0417 \u043A\u0430\u0440\u0442\u043A\u0438 \u2014 \u0437\u043D\u044F\u043B\u0438 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 \u0424\u041E\u041F (\u0441\u043E\u0431\u0456, \u043F\u043E\u0434\u0430\u0442\u043A\u0438)</div></div>`;
    const kv = (l, v, cls = "") => `<div class="kv ${cls}"><span>${l}</span><b class="money">${v}</b></div>`;
    const all = "";
    const mvH = z.mvCash || z.mvCard ? `<div class="card"><h3>\u{1F501} \u0420\u0443\u0445 \u043A\u043E\u0448\u0442\u0456\u0432 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>${kv("\u0413\u043E\u0442\u0456\u0432\u043A\u0430", (z.mvCash > 0 ? "+" : "") + money(z.mvCash))}${z.mvCard ? kv("\u041A\u0430\u0440\u0442\u043A\u0430", (z.mvCard > 0 ? "+" : "") + money(z.mvCard)) : ""}</div>` : "";
    const tb = Object.entries(r.tipbal || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tipsH = `<div class="card"><h3>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0434\u043E \u0432\u0438\u0434\u0430\u0447\u0456</h3>${tb.length ? tb.map(([n, v]) => `<div class="kv"><span>\u{1F464} ${esc(n)}</span><span><b class="money">${money(v)}</b> <button class="btn sm green" data-a="tipPay" data-n="${esc(n)}">\u0412\u0438\u0434\u0430\u043D\u043E</button></span></div>`).join("") : '<div class="muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u043A\u043E\u043F\u0438\u0447\u0435\u043D\u043E</div>'}
      ${(r.tippay || []).length ? `<div class="muted" style="font-size:12px;margin-top:8px">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0432\u0438\u0434\u0430\u043D\u043E: ${r.tippay.map((x) => `${x.at} ${esc(x.name)} ${money(x.sum)}`).join(" \xB7 ")}</div>` : ""}<div class="muted" style="font-size:12px;margin-top:6px">\u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443; \u043F\u0440\u0438 \u0432\u0438\u0434\u0430\u0447\u0456 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F \u0437 \u0433\u043E\u0442\u0456\u0432\u043A\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438.</div></div>`;
    const J = [
      ...(r.closed || []).filter((x) => !x.del && !x.rm).map((x) => ({ at: x.at, ic: x.card ? "\u{1F4B3}" : "\u{1F4B5}", t: `\u0421\u0442\u0456\u043B ${x.t}${x.by ? " \xB7 " + esc(x.by) : ""}${x.disc ? ` \xB7 \u2212${x.disc}%` : ""}${x.tip ? ` \xB7 \u{1F49D} ${money(x.tip)}` : ""}`, v: "+" + money(x.sum), cls: "in" })),
      ...r.exp.map((e, i) => ({ at: e.at, ic: "\u{1F4B8}", t: esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430") + (e.src === "card" ? " (\u043A\u0430\u0440\u0442\u043A\u0430)" : ""), v: "\u2212" + money(e.sum), cls: "out", del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` })),
      ...(r.mov || []).map((m, i) => ({ at: m.at, ic: "\u{1F501}", t: MOVE[m.type] + (m.note ? " \xB7 " + esc(m.note) : ""), v: money(m.sum), cls: "mv", del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const journal = `<div class="card"><h3>\u{1F4D2} \u0416\u0443\u0440\u043D\u0430\u043B \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 <span class="muted" style="font-weight:400;font-size:13px">\xB7 ${J.length}</span></h3>${J.length ? J.map((x) => `<div class="jr ${x.cls}${x.del ? " del" : ""}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : "<i></i>"}</div>`).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}</div>`;
    return `<div class="head"><h1>\u041A\u0430\u0441\u0430</h1></div>${balH}${hero}${tilesH}<div class="cash-grid"><div class="col">${journal}</div><div class="col">${tipsH}${ops}${mvH}${all}</div></div>`;
  }
  const MOVE = { in: "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F", out: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F", k2c: "\u{1F501} \u041A\u0430\u0440\u0442\u043A\u0430 \u2192 \u0433\u043E\u0442\u0456\u0432\u043A\u0430", c2k: "\u{1F501} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u043A\u0430\u0440\u0442\u043A\u0430", tipc: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", tipk: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u043A\u0430\u0440\u0442\u043A\u0430)", kout: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F \u0437 \u043A\u0430\u0440\u0442\u043A\u0438", adjc: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u0433\u043E\u0442\u0456\u0432\u043A\u0438", adjk: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u043A\u0430\u0440\u0442\u043A\u0438" };
  async function balInfo(src) {
    var _a2;
    const B = (_a2 = S.data.shift) == null ? void 0 : _a2.bal;
    if (!B) return;
    const c = src === "card";
    const row = (l, v2) => v2 ? `<div class="kv"><span>${l}</span><b class="money">${(v2 > 0 ? "+" : "\u2212") + money(Math.abs(v2))}</b></div>` : "";
    const body = (c ? [row("\u{1F4B3} \u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u043A\u0430\u0440\u0442\u043A\u043E\u044E", B.saleCard), row("\u{1F501} \u0420\u0443\u0445 (\u043E\u0431\u043C\u0456\u043D, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F)", B.mvCard), row("\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438", -B.exCard), row("\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0438\u0434\u0430\u043D\u043E", -B.tipCard), row("\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0438", B.adjCard)] : [row("\u{1F4B5} \u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E", B.saleCash), row("\u{1F501} \u0420\u0443\u0445 (\u0432\u043D\u0435\u0441\u0435\u043D\u043D\u044F, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F, \u043E\u0431\u043C\u0456\u043D)", B.mvCash), row("\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0437 \u043A\u0430\u0441\u0438", -B.exCash), row("\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0438\u0434\u0430\u043D\u043E", -B.tipCash), row("\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0438", B.adjCash)]).join("") + `<div class="kv" style="font-size:18px"><span><b>\u041C\u0430\u0454 \u0431\u0443\u0442\u0438</b></span><b class="money">${money(c ? B.card : B.cash)}</b></div>`;
    const v = await modal({
      title: c ? "\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u0446\u0456" : "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0456",
      body: `<div class="card" style="margin:0 0 12px">${body}</div><div class="form"><input id="rcAct" inputmode="decimal" placeholder="${c ? "\u0417\u0430\u043B\u0438\u0448\u043E\u043A \u0443 \u041F\u0440\u0438\u0432\u0430\u044224, \u20B4" : "\u041F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0432\u0430\u043B\u0438 \u043A\u0430\u0441\u0443 \u2014 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0454, \u20B4"}"></div><div class="muted" style="font-size:12px">\u042F\u043A\u0449\u043E \u043D\u0435 \u0437\u0431\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F \u2014 \u0432\u043F\u0438\u0448\u0456\u0442\u044C \u0444\u0430\u043A\u0442, \u0440\u0456\u0437\u043D\u0438\u0446\u044F \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u044F\u043A \u0437\u0432\u0456\u0440\u043A\u0430 (\u0432\u0438\u0434\u043D\u043E \u0432 \u0436\u0443\u0440\u043D\u0430\u043B\u0456 \u0439 Telegram)</div>`,
      buttons: [{ label: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u0438\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }],
      keep: true
    });
    const a = v && $("#rcAct").value.replace(",", ".").trim();
    closeModal();
    if (v && a !== "" && +a >= 0) {
      const r = await act("reconcile", { src, actual: +a });
      if (r) toast(r.diff ? `\u270F\uFE0F \u0420\u0456\u0437\u043D\u0438\u0446\u044F ${r.diff > 0 ? "+" : ""}${money(r.diff)} \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430` : "\u2705 \u0423\u0441\u0435 \u0437\u0431\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F");
      loadView();
    }
  }
  async function cashMove(t) {
    if (t === "x") {
      t = await choose("\u{1F501} \u041E\u0431\u043C\u0456\u043D", "\u0417\u0432\u0456\u0434\u043A\u0438 \u043A\u0443\u0434\u0438 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u044F\u0442\u044C \u0433\u0440\u043E\u0448\u0456?", [{ label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430 \u2192 \u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430", val: "k2c" }, { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u0430", val: "c2k" }]);
      if (!t) return;
    }
    const v = await modal({
      title: MOVE[t],
      text: t === "k2c" ? "\u0417\u043D\u044F\u043B\u0438 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438 \u0439 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u0432 \u043A\u0430\u0441\u0443" : t === "c2k" ? "\u0412\u0437\u044F\u043B\u0438 \u0437 \u043A\u0430\u0441\u0438 \u0439 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443" : t === "in" ? "\u041F\u043E\u043A\u043B\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u0432 \u043A\u0430\u0441\u0443" : t === "kout" ? "\u0417\u043D\u044F\u043B\u0438 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 \u0424\u041E\u041F: \u0441\u043E\u0431\u0456, \u043F\u043E\u0434\u0430\u0442\u043A\u0438, \u0437\u0430\u043A\u0443\u043F\u043A\u0430" : "\u0417\u0430\u0431\u0440\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u0437 \u043A\u0430\u0441\u0438",
      body: '<div class="form"><input id="mSum" inputmode="decimal" placeholder="\u0421\u0443\u043C\u0430, \u20B4"><input id="mNote" placeholder="\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)"></div>',
      buttons: [{ label: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
      keep: true
    });
    const sum = v && +$("#mSum").value.replace(",", "."), note = v && $("#mNote").value;
    closeModal();
    if (v && sum > 0) {
      await act("cashMove", { type: t, sum, note }, "\u{1F501} \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
      loadView();
    }
  }
  async function zDay() {
    const v = await choose("\u{1F9FE} Z-\u0437\u0432\u0456\u0442 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", "\u041F\u0456\u0434\u0441\u0443\u043C\u043E\u043A \u0434\u043D\u044F: \u0447\u0435\u043A\u0438, \u0433\u043E\u0442\u0456\u0432\u043A\u0430, \u043A\u0430\u0440\u0442\u043A\u0430, \u0437\u043D\u0438\u0436\u043A\u0438, \u0432\u0438\u0442\u0440\u0430\u0442\u0438", [{ label: "\u{1F5A8} \u041D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u0439 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0432 Telegram", val: "p", cls: "primary" }, { label: "\u{1F4F2} \u041B\u0438\u0448\u0435 \u0432 Telegram", val: "n" }]);
    if (!v) return;
    const r = await act("zDay", { print: v === "p" }, v === "p" ? "\u{1F9FE} Z-\u0437\u0432\u0456\u0442 \u043D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u043E" : "\u{1F9FE} Z-\u0437\u0432\u0456\u0442 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E");
    if (r) loadView();
  }
  async function shOpen() {
    var _a2;
    const last = (_a2 = await api("shift").catch(() => null)) == null ? void 0 : _a2.last;
    last0 = last ? String(last.sum) : 0;
    const fmt = (d) => d.split("-").reverse().join(".");
    const how = !last ? "" : `\u0443\u0441\u044F \u0433\u043E\u0442\u0456\u0432\u043A\u0430 \u0432\u0456\u0434 \u0433\u043E\u0441\u0442\u0435\u0439 \u0437\u0430 \u0432\u0435\u0441\u044C \u0447\u0430\u0441${last.from ? " (\u0437 " + fmt(last.from) + ")" : ""}`;
    const b = await modal({
      title: "\u{1F513} \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043A\u0430\u0441\u0443",
      text: "\u041E\u0434\u043D\u0435 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u043D\u043D\u044F \u2014 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u0437 \u0442\u0456\u0454\u044E \u0436 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E, \u0449\u043E \u0432 \u043A\u0430\u0441\u0456",
      keep: true,
      body: `<div class="form">${last ? `<button type="button" class="btn primary big1" data-mi-quick>\u{1F513} \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \xB7 ${money(last.sum)}</button><div class="muted" style="font-size:13px;text-align:center">${how}</div>` : ""}
        <input id="fIn" inputmode="decimal" placeholder="\u0410\u0431\u043E \u0432\u043F\u0438\u0448\u0456\u0442\u044C \u0456\u043D\u0448\u0443 \u0441\u0443\u043C\u0443, \u20B4"></div>`,
      buttons: [{ label: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437 \u0432\u043F\u0438\u0441\u0430\u043D\u043E\u044E \u0441\u0443\u043C\u043E\u044E", val: "ok" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }]
    });
    const v = b ? $("#fIn").value.trim() : null;
    closeModal();
    if (!v) return;
    if (await act("shiftOpen", { float: +v.replace(",", ".") }, "\u{1F513} \u041A\u0430\u0441\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E")) {
      loadState().catch(() => {
      });
      if (S.view === "cash") loadView();
    }
  }
  async function shClose() {
    var _a2;
    const d = (_a2 = await api("shift").catch(() => null)) == null ? void 0 : _a2.d;
    if (!d) return;
    const v = await modal({
      title: "\u{1F512} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u043A\u0430\u0441\u0443",
      text: `\u041C\u0430\u0454 \u0431\u0443\u0442\u0438 \u0432 \u043A\u0430\u0441\u0456: ${money(d.inBox)}${d.openTables ? ` \xB7 \u26A0\uFE0F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0441\u0442\u043E\u043B\u0456\u0432: ${d.openTables}` : ""}`,
      body: '<div class="form"><input id="zCnt" inputmode="decimal" placeholder="\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u043F\u043E\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u0433\u043E\u0442\u0456\u0432\u043A\u0438, \u20B4 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)"></div>',
      buttons: [{ label: "\u{1F5A8} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0456 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 Z-\u0437\u0432\u0456\u0442", val: "p", cls: "red" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0431\u0435\u0437 \u0434\u0440\u0443\u043A\u0443", val: "n" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
      keep: true
    });
    const c = v && $("#zCnt").value.trim().replace(",", ".");
    closeModal();
    if (!v) return;
    const r = await act("shiftClose", { counted: c === "" ? null : +c, print: v === "p" });
    if (r == null ? void 0 : r.z) {
      const z = r.z;
      await modal({ title: "\u{1F512} \u041A\u0430\u0441\u0443 \u0437\u0430\u043A\u0440\u0438\u0442\u043E", text: `\u0412\u0438\u0440\u0443\u0447\u043A\u0430 ${money(z.total)} \xB7 \u0447\u0435\u043A\u0456\u0432 ${z.checks} \xB7 \u{1F4B5} ${money(z.cash)} \xB7 \u{1F4B3} ${money(z.card)} \xB7 \u0432 \u043A\u0430\u0441\u0456 \u043C\u0430\u0454 \u0431\u0443\u0442\u0438 ${money(z.inBox)}${z.diff != null ? ` \xB7 \u0440\u0456\u0437\u043D\u0438\u0446\u044F ${z.diff > 0 ? "+" : ""}${money(z.diff)}` : ""}`, buttons: [{ label: "OK", val: 1, cls: "primary" }] });
      loadState().catch(() => {
      });
      if (S.view === "cash") loadView();
    }
  }
  const iso = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const PER = [["d", "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["y", "\u0412\u0447\u043E\u0440\u0430"], ["w", "7 \u0434\u043D\u0456\u0432"], ["30", "30 \u0434\u043D\u0456\u0432"], ["m", "\u0426\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"], ["pm", "\u041C\u0438\u043D. \u043C\u0456\u0441\u044F\u0446\u044C"], ["yr", "\u0420\u0456\u043A"], ["all", "\u0417\u0430 \u0432\u0435\u0441\u044C \u0447\u0430\u0441"], ["c", "\u0421\u0432\u0456\u0439 \u043F\u0435\u0440\u0456\u043E\u0434"]];
  function perRange(p) {
    const now = /* @__PURE__ */ new Date(), day = 864e5, y = now.getFullYear(), mo = now.getMonth();
    if (p === "d") return [iso(now), iso(now)];
    if (p === "y") return [iso(now - day), iso(now - day)];
    if (p === "w") return [iso(now - 6 * day), iso(now)];
    if (p === "30") return [iso(now - 29 * day), iso(now)];
    if (p === "m") return [iso(new Date(y, mo, 1)), iso(now)];
    if (p === "pm") return [iso(new Date(y, mo - 1, 1)), iso(new Date(y, mo, 0))];
    if (p === "yr") return [iso(new Date(y, 0, 1)), iso(now)];
    if (p === "all") return ["2026-09-01", iso(now)];
    return [S.rep.from || iso(now - 6 * day), S.rep.to || iso(now)];
  }
  let resolver;
  function dishOf(name) {
    if (!S.menu) return null;
    if (!resolver || resolver.menu !== S.menu) {
      const all = S.menu.categories.flatMap((c) => c.items.map((it) => ({ n: it.name.uk, cat: c.id, cname: c.name.uk, grp: (S.groups.find((g) => g.cats.includes(c.id)) || {}).id }))).sort((a, b) => b.n.length - a.n.length);
      resolver = { menu: S.menu, memo: /* @__PURE__ */ new Map(), all };
    }
    if (!resolver.memo.has(name)) resolver.memo.set(name, resolver.all.find((x) => name === x.n || name.startsWith(x.n + " ")) || null);
    return resolver.memo.get(name);
  }
  async function loadReport() {
    const [from, to] = perRange(S.rep.p), key = from + "|" + to;
    if (S.data.rangeKey !== key) {
      S.data.range = null;
      S.data.rangeKey = key;
      renderMain();
    }
    const res = await api("report", { from, to }).catch(() => null);
    if (S.data.rangeKey === key) S.data.range = res || S.data.range || { checks: [], exp: [], z: [] };
  }
  function reportsHTML() {
    const R = S.rep, [from, to] = perRange(R.p), r = S.data.range;
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
    const checks0 = r ? r.checks : [];
    const waiters = [...new Set(checks0.map((c) => c.by).filter(Boolean))].sort(), tables = [...new Set(checks0.map((c) => c.t))].sort((a, b) => a - b);
    const cats = S.menu ? S.menu.categories.filter((c) => !R.grp || (S.groups.find((g) => g.id === R.grp) || { cats: [] }).cats.includes(c.id)) : [];
    const filters = `<div class="filters">
      <div class="chips">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? "on" : ""}" data-a="rp" data-p="${k}">${l}</button>`).join("")}</div>
      ${R.p === "c" ? `<div class="frow"><label>\u0417<input type="date" id="rFrom" value="${from}"></label><label>\u041F\u043E<input type="date" id="rTo" value="${to}"></label></div>` : ""}
      <div class="frow">
        <label>\u041E\u043F\u043B\u0430\u0442\u0430<select data-f="pay">${opt("", "\u0423\u0441\u0456", R.pay)}${opt("cash", "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", R.pay)}${opt("card", "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430", R.pay)}</select></label>
        <label>\u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442<select data-f="by">${opt("", "\u0423\u0441\u0456", R.by)}${waiters.map((w) => opt(w, w, R.by)).join("")}</select></label>
        <label>\u0413\u0440\u0443\u043F\u0430<select data-f="grp">${opt("", "\u0423\u0441\u0435", R.grp)}${S.groups.map((g) => opt(g.id, g.name, R.grp)).join("")}</select></label>
        <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F<select data-f="cat">${opt("", "\u0423\u0441\u0456", R.cat)}${cats.map((c) => opt(c.id, c.name.uk, R.cat)).join("")}</select></label>
        <label>\u0421\u0442\u0456\u043B<select data-f="t">${opt("", "\u0423\u0441\u0456", R.t)}${tables.map((t) => opt(String(t), "\u0421\u0442\u0456\u043B " + t, R.t)).join("")}</select></label>
        <label>\u0421\u0442\u0440\u0430\u0432\u0430<input id="rQ" placeholder="\u{1F50E} \u043D\u0430\u0437\u0432\u0430" value="${esc(R.q)}"></label>
        ${R.pay || R.by || R.grp || R.cat || R.t || R.q ? '<button class="btn sm ghost" data-a="rReset" style="align-self:end">\u2715 \u0421\u043A\u0438\u043D\u0443\u0442\u0438</button>' : ""}
      </div></div>`;
    const head = `<div class="head"><h1>\u0417\u0432\u0456\u0442\u0438</h1><span class="muted">${from === to ? from : from + " \u2014 " + to}</span></div>`;
    if (!r) return head + '<div class="muted" style="margin-bottom:14px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>' + filters;
    const dishF = R.grp || R.cat || R.q.trim(), q = R.q.trim().toLowerCase();
    const dishOk = (n2) => {
      if (!dishF) return true;
      const x = dishOf(n2);
      if (R.grp && (x == null ? void 0 : x.grp) !== R.grp) return false;
      if (R.cat && (x == null ? void 0 : x.cat) !== R.cat) return false;
      return !q || n2.toLowerCase().includes(q);
    };
    const checks = checks0.filter((c) => (!R.pay || (R.pay === "card" ? c.card > 0 : c.cash > 0)) && (!R.by || c.by === R.by) && (!R.t || String(c.t) === R.t)).map((c) => {
      const ds = c.dishes.filter(([n2]) => dishOk(n2));
      return __spreadProps(__spreadValues({}, c), { ds, val: dishF ? ds.reduce((a, [, , s]) => a + s, 0) : c.sum });
    }).filter((c) => !dishF || c.ds.length);
    const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
    const total = sum(checks, (c) => c.val), n = checks.length, qty = sum(checks, (c) => sum(c.ds, (d) => d[1]));
    const exp = R.by || R.t || dishF || R.pay ? null : sum(r.exp, (e) => e.sum);
    const tipOut = sum((r.mov || []).filter((m) => m.type === "tipc" || m.type === "tipk"), (m) => m.sum);
    const W = [
      ["\u0412\u0438\u0440\u0443\u0447\u043A\u0430", money(total), "accent"],
      ["\u0427\u0435\u043A\u0456\u0432", n],
      ["\u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", n ? money(total / n) : "\u2014"],
      ["\u041F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439", qty],
      ...!dishF ? [["\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", money(sum(checks, (c) => c.cash))], ["\u{1F4B3} \u041A\u0430\u0440\u0442\u0430", money(sum(checks, (c) => c.card))], ["\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(sum(checks, (c) => c.disc))], ["\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", money(sum(checks, (c) => c.tip))]] : [],
      ...exp != null ? [["\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", money(exp)], ...tipOut ? [["\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0438\u0434\u0430\u043D\u043E", money(tipOut)]] : [], ["\u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(total - exp - tipOut), "green"]] : []
    ];
    const widgets = `<div class="widgets">${W.map(([l, v, c]) => `<div class="widget ${c || ""}"><span>${l}</span><b class="money">${v}</b></div>`).join("")}</div>`;
    const grpBy = (keyF, valF = (c) => c.val) => {
      const m = /* @__PURE__ */ new Map();
      checks.forEach((c) => {
        const k = keyF(c);
        const a = m.get(k) || [0, 0];
        a[0]++;
        a[1] += valF(c);
        m.set(k, a);
      });
      return [...m];
    };
    const dishAgg = (keyF) => {
      const m = /* @__PURE__ */ new Map();
      checks.forEach((c) => c.ds.forEach(([nm, qq, ss]) => {
        const k = keyF(nm);
        const a = m.get(k) || [0, 0];
        a[0] += qq;
        a[1] += ss;
        m.set(k, a);
      }));
      return [...m];
    };
    const TABS = { dishes: "\u{1F37D} \u0421\u0442\u0440\u0430\u0432\u0438", cats: "\u{1F4C2} \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457", groups: "\u{1F373} \u041A\u0443\u0445\u043D\u044F/\u0431\u0430\u0440", waiters: "\u{1F464} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438", tips: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", hours: "\u{1F550} \u0413\u043E\u0434\u0438\u043D\u0438", days: "\u{1F4C5} \u0414\u043D\u0456", tables: "\u{1FA91} \u0421\u0442\u043E\u043B\u0438", checks: "\u{1F9FE} \u0427\u0435\u043A\u0438", exp: "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", mov: "\u{1F501} \u0420\u0443\u0445 \u043A\u043E\u0448\u0442\u0456\u0432", z: "\u{1F512} Z-\u0437\u0432\u0456\u0442\u0438", ctrl: "\u{1F575}\uFE0F \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C" };
    let rows, unit = "\u0447\u0435\u043A.", sortable = false;
    const T = R.tab;
    if (T === "dishes") {
      rows = dishAgg((nm) => nm);
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T === "cats") {
      rows = dishAgg((nm) => {
        var _a2;
        return ((_a2 = dishOf(nm)) == null ? void 0 : _a2.cname) || "\u0406\u043D\u0448\u0435";
      });
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T === "groups") {
      rows = dishAgg((nm) => (S.groups.find((g) => {
        var _a2;
        return g.id === ((_a2 = dishOf(nm)) == null ? void 0 : _a2.grp);
      }) || { name: "\u0406\u043D\u0448\u0435" }).name);
      unit = "\u0448\u0442";
    } else if (T === "waiters") rows = grpBy((c) => c.by || "\u2014");
    else if (T === "tips") {
      rows = grpBy((c) => c.by || "\u2014", (c) => c.tip || 0).filter((x) => x[1][1] > 0);
      unit = "\u0447\u0435\u043A.";
    } else if (T === "hours") rows = grpBy((c) => String(c.at || "").slice(0, 2) + ":00").sort((a, b) => a[0].localeCompare(b[0]));
    else if (T === "days") rows = grpBy((c) => c.d).sort((a, b) => a[0].localeCompare(b[0]));
    else if (T === "tables") rows = grpBy((c) => "\u0421\u0442\u0456\u043B " + c.t).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    let body;
    if (rows) {
      if (!["hours", "days", "tables"].includes(T)) rows.sort((a, b) => R.sort === "q" && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const max = Math.max(1, ...rows.map((x) => x[1][1]));
      body = rows.length ? rows.map(([k, [qq, ss]]) => `<div class="bar"><div class="bl"><span>${esc(k)}</span><span class="muted">${qq} ${unit}</span><b class="money">${money(ss)}</b></div><i style="width:${Math.max(2, ss / max * 100)}%"></i></div>`).join("") : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445 \u0437\u0430 \u0446\u0438\u043C\u0438 \u0444\u0456\u043B\u044C\u0442\u0440\u0430\u043C\u0438</div>';
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== "q" ? "on" : ""}" data-a="rSort" data-s="s">\u0417\u0430 \u0441\u0443\u043C\u043E\u044E</button><button class="chip ${R.sort === "q" ? "on" : ""}" data-a="rSort" data-s="q">\u0417\u0430 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E</button></div>` + body;
    } else if (T === "checks") body = checks.length ? [...checks].reverse().slice(0, 300).map((c) => `<div class="kv"><span>${c.d.slice(5)} ${c.at} \xB7 \u0441\u0442\u0456\u043B ${c.t} \xB7 ${esc(c.by)} ${c.card ? "\u{1F4B3}" : "\u{1F4B5}"}${c.disc ? " \u{1F3F7}" : ""}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}\xD7 ${esc(nm)}`).join(", ")}</small></span><b class="money">${money(c.val)}</b></div>`).join("") : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0447\u0435\u043A\u0456\u0432</div>';
    else if (T === "exp") body = r.exp.length ? r.exp.map((e) => `<div class="kv"><span>${e.d.slice(5)} ${e.at} ${e.src === "card" ? "\u{1F4B3}" : "\u{1F4B5}"} ${esc(e.note)} <span class="muted">${esc(e.by)}</span></span><b class="money">${money(e.sum)}</b></div>`).join("") : '<div class="muted">\u0412\u0438\u0442\u0440\u0430\u0442 \u043D\u0435\u043C\u0430\u0454</div>';
    else if (T === "mov") body = (r.mov || []).length ? r.mov.map((m) => `<div class="kv"><span>${m.d.slice(5)} ${m.at} ${MOVE[m.type]} ${esc(m.note)} <span class="muted">${esc(m.by)}</span></span><b class="money">${money(m.sum)}</b></div>`).join("") : '<div class="muted">\u0420\u0443\u0445\u0443 \u043A\u043E\u0448\u0442\u0456\u0432 \u043D\u0435\u043C\u0430\u0454</div>';
    else if (T === "z") body = r.z.length ? [...r.z].reverse().map((z) => `<div class="kv"><span>${new Date(z.opened).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} \u2014 ${new Date(z.closed).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })} \xB7 ${z.checks} \u0447\u0435\u043A. \xB7 ${esc(z.closedBy)}${z.diff ? ` \xB7 <b style="color:var(--red)">\u0440\u0456\u0437\u043D\u0438\u0446\u044F ${z.diff > 0 ? "+" : ""}${money(z.diff)}</b>` : ""}</span><b class="money">${money(z.total)}</b></div>`).join("") : '<div class="muted">Z-\u0437\u0432\u0456\u0442\u0456\u0432 \u0437\u0430 \u043F\u0435\u0440\u0456\u043E\u0434 \u043D\u0435\u043C\u0430\u0454</div>';
    else if (T === "ctrl") {
      const vs = (r.voids || []).filter((v) => (!R.by || v.by === R.by) && (!R.t || String(v.t) === R.t)), W2 = {};
      const w = (nm) => W2[nm || "\u2014"] = W2[nm || "\u2014"] || { name: nm || "\u2014", n: 0, s: 0, vN: 0, vS: 0, tN: 0, tS: 0, dN: 0, dS: 0, dMax: 0, tip: 0 };
      checks.forEach((c) => {
        const x = w(c.by);
        x.n++;
        x.s += c.sum;
        if (c.disc) {
          x.dN++;
          x.dS += c.disc;
          x.dMax = Math.max(x.dMax, c.pct || 0);
        }
        x.tip += c.tip || 0;
      });
      vs.forEach((v) => {
        const x = w(v.by);
        if (v.table) {
          x.tN++;
          x.tS += v.sum;
        } else {
          x.vN++;
          x.vS += v.sum;
        }
      });
      const ws2 = Object.values(W2).sort((a, b) => b.vS + b.dS + b.tS - a.vS - a.dS - a.tS);
      const rm = (r.removed || []).filter((x) => !R.t || String(x.t) === R.t);
      body = (ws2.length ? `<div class="ctrl">${ws2.map((x) => {
        const pct = x.s + x.vS ? Math.round(x.vS / (x.s + x.vS) * 1e3) / 10 : 0, bad = pct >= 5 || x.dMax > 20 || x.tN;
        return `<div class="ctrl-w ${bad ? "bad" : ""}"><div class="ctrl-h"><b>\u{1F464} ${esc(x.name)}</b><span class="muted">${x.n} \u0447\u0435\u043A. \xB7 ${money(x.s)}</span></div>
          <div class="ctrl-g"><span>\u{1F6AB} \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u043D\u044F<b>${x.vN} \xB7 ${money(x.vS)}</b><small>${pct}% \u0432\u0456\u0434 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432</small></span><span>\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 \u0441\u0442\u043E\u043B\u0438<b>${x.tN} \xB7 ${money(x.tS)}</b></span>
          <span>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438<b>${x.dN} \xB7 ${money(x.dS)}</b><small>${x.dMax ? "\u043C\u0430\u043A\u0441 " + x.dMax + "%" : "\u2014"}</small></span><span>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<b>${money(x.tip)}</b></span></div></div>`;
      }).join("")}</div>` : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445</div>') + `<h3 style="margin:18px 0 8px">\u{1F6AB} \u0416\u0443\u0440\u043D\u0430\u043B \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C</h3>` + (vs.length ? [...vs].reverse().slice(0, 300).map((v) => `<div class="kv"><span>${v.d.slice(5)} ${v.at} \xB7 \u0441\u0442\u0456\u043B ${v.t} \xB7 <b>${esc(v.by)}</b> \xB7 ${esc(v.name)}<br><small class="muted">\u2753 ${esc(v.reason)}</small></span><b class="money" style="color:var(--red)">\u2212${money(v.sum)}</b></div>`).join("") : '<div class="muted">\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C \u043D\u0435\u043C\u0430\u0454 \u{1F44D}</div>') + (rm.length ? `<h3 style="margin:18px 0 8px">\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</h3>` + rm.map((x) => `<div class="kv"><span>${x.d.slice(5)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${x.t} \xB7 ${esc(x.by)}</span><b class="money">${money(x.sum)}</b></div>`).join("") : "");
    }
    const top = dishAgg((nm) => nm).sort((x, y) => y[1][0] - x[1][0] || y[1][1] - x[1][1]).slice(0, 10), tmax = Math.max(1, ...top.map((x) => x[1][0]));
    const topHTML = `<div class="card top"><h3>\u{1F3C6} \u0422\u043E\u043F \u0441\u0442\u0440\u0430\u0432</h3>${top.length ? top.map(([k, [qq, ss]], i) => `<div class="bar"><div class="bl"><span>${["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || `<span class="muted">${i + 1}.</span>`} ${esc(k)}</span><b>${qq} \u0448\u0442</b><span class="muted money">${money(ss)}</span></div><i style="width:${Math.max(2, qq / tmax * 100)}%"></i></div>`).join("") : '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u0437\u0430 \u0446\u0435\u0439 \u043F\u0435\u0440\u0456\u043E\u0434</div>'}</div>`;
    return head + widgets + filters + `<div class="seg wrap" style="margin:14px 0 10px">${Object.entries(TABS).map(([k, l]) => `<button class="${T === k ? "on" : ""}" data-a="rTab" data-t="${k}">${l}</button>`).join("")}</div><div class="card">${body}</div>` + topHTML;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    return `<div class="head"><h1>\u041C\u0435\u043D\u044E</h1><button class="btn" data-a="menuUndo">\u21A9\uFE0F \u0412\u0456\u0434\u043C\u0456\u043D\u0438\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443</button><button class="btn" data-a="catAdd">\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B</button><button class="btn primary" data-a="menuEdit" data-id="">\u2795 \u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430</button></div>
      ${S.menu.categories.map((c) => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map((i) => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? " \u26D4" : ""}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map((v) => `${v.v} \u2014 ${v.p}`).join(" / ") : i.price + " \u20B4"}${i.size && !i.variants ? " \xB7 " + esc(i.size) : ""}</div></div>\u203A</button>`).join("")}</div>`).join("")}`;
  }
  function settingsHTML() {
    const st = S.data.staff, wf = S.data.wifi;
    return `<div class="head"><h1>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h1></div><div class="grid2">
      <div class="card"><h3>\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B (PIN \u0434\u043B\u044F \u043A\u0430\u0441\u0438)</h3>${st ? st.staff.map((s) => `<div class="kv"><span>${esc(s.name)} \xB7 ${s.role === "admin" ? "\u{1F510} \u0430\u0434\u043C\u0456\u043D" : "\u{1F9D1}\u200D\u{1F373} \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"}</span><button class="btn sm red" data-a="staffDel" data-id="${s.id}">\u{1F5D1}</button></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>' : "\u2026"}
        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430</button></div>
      <div class="card"><h3>\u{1F195} \u041A\u043E\u0434\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457</h3><div class="muted" style="margin-bottom:8px">\u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0434 \u0437\u0430\u043C\u0456\u0441\u0442\u044C PIN \u2192 \u043F\u0438\u0448\u0435 \u0456\u043C\u02BC\u044F \u0456 \u043F\u0440\u0438\u0434\u0443\u043C\u0443\u0454 \u0441\u0432\u0456\u0439 PIN. \u0412\u0438\u0434\u043D\u043E, \u0445\u0442\u043E \u0449\u043E \u0440\u043E\u0431\u0438\u0442\u044C.</div>
        ${(st == null ? void 0 : st.reg) ? `<div class="kv"><span>\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440</span><span><b>${esc(st.reg.admin)}</b> <button class="btn sm" data-a="regSet" data-r="admin">\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button></span></div><div class="kv"><span>\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442</span><span><b>${esc(st.reg.waiter)}</b> <button class="btn sm" data-a="regSet" data-r="waiter">\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button></span></div>` : "\u2026"}</div>
      <div class="card"><h3>\u{1F916} \u0423\u0432\u0456\u0439\u0448\u043B\u0438 \u0432 Telegram-\u0431\u043E\u0442</h3>${st ? st.waiters.map((w) => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">\u0412\u0438\u0439\u0442\u0438</button></div>`).join("") || '<div class="muted">\u041D\u0456\u043A\u043E\u0433\u043E</div>' : "\u2026"}</div>
      <div class="card"><h3>\u{1F511} \u041F\u0430\u0440\u043E\u043B\u0456</h3><div class="muted" style="margin-bottom:10px">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430 \u2014 \u0432\u0445\u0456\u0434 \u0443 \u0431\u043E\u0442 \u0456 \u043A\u0430\u0441\u0443; \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \u2014 \u0430\u0434\u043C\u0456\u043D-\u0444\u0443\u043D\u043A\u0446\u0456\u0457.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="wPass">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430</button><button class="btn sm" data-a="aPass">\u041F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430</button></div></div>
      <div class="card"><h3>\u{1F4F6} Wi\u2011Fi \u0437\u0430\u043A\u043B\u0430\u0434\u0443</h3><div class="muted">\u0417\u0432\u0456\u0434\u0441\u0438 \u0433\u043E\u0441\u0442\u0456 \u043C\u043E\u0436\u0443\u0442\u044C \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438. \u0412\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430 \u0437\u0430\u0440\u0430\u0437: ${esc((wf == null ? void 0 : wf.current) || "\u2026")}</div>
        ${wf ? wf.list.map((x) => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString("uk-UA")}</span></div>`).join("") || '<div class="muted">\u043D\u0435\u043C\u0430\u0454 \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043D\u0435 \u043F\u0440\u0438\u0439\u043C\u0430\u0442\u0438\u043C\u0443\u0442\u044C\u0441\u044F!</div>' : ""}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm primary" data-a="wifiAdd">\u2795 \u0426\u0435 \u043D\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430</button><button class="btn sm red" data-a="wifiClear">\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456</button></div></div>
      <div class="card"><h3>\u{1F9EA} \u0422\u0435\u0441\u0442</h3><div class="muted" style="margin-bottom:10px">\u0422\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E, \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0443.</div><button class="btn sm red" data-a="reset">\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435</button></div></div>`;
  }
  async function menuEdit(id) {
    var _a2, _b, _c, _d;
    const it = itemsAll().find((i) => i.id === id) || null;
    const cat = it ? S.menu.categories.find((c) => c.items.includes(it)).id : S.menu.categories[0].id;
    const body = `<div class="form">
      <label>\u0420\u043E\u0437\u0434\u0456\u043B<select id="fCat">${S.menu.categories.map((c) => `<option value="${c.id}" ${c.id === cat ? "selected" : ""}>${esc(c.name.uk)}</option>`).join("")}</select></label>
      <label>\u041D\u0430\u0437\u0432\u0430<input id="fName" value="${esc((it == null ? void 0 : it.name.uk) || "")}"></label>
      <label>\u041D\u0430\u0437\u0432\u0430 \u0430\u043D\u0433\u043B\u0456\u0439\u0441\u044C\u043A\u043E\u044E (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)<input id="fEn" value="${esc(it && it.name.en !== it.name.uk ? it.name.en : "")}"></label>
      <label>\u0426\u0456\u043D\u0430, \u20B4 ${(it == null ? void 0 : it.variants) ? "" : ""}<input id="fPrice" inputmode="numeric" value="${(_a2 = it == null ? void 0 : it.price) != null ? _a2 : ""}" placeholder="\u043D\u0430\u043F\u0440. 380"></label>
      <label>\u0410\u0431\u043E \u0440\u043E\u0437\u043C\u0456\u0440\u0438 (\u0434\u043B\u044F \u043D\u0430\u043F\u043E\u0457\u0432): <span class="muted">0.33=60, 0.5=70</span><input id="fVar" value="${esc((it == null ? void 0 : it.variants) ? it.variants.map((v2) => `${v2.v}=${v2.p}`).join(", ") : "")}"></label>
      <label>\u0412\u0430\u0433\u0430/\u043E\u0431\u02BC\u0454\u043C<input id="fSize" value="${esc((it == null ? void 0 : it.size) || "")}" placeholder="\u043D\u0430\u043F\u0440. 400 \u0433 \u0430\u0431\u043E \u043B"></label>
      <label>\u0421\u043A\u043B\u0430\u0434<textarea id="fDesc" rows="3">${esc(((_b = it == null ? void 0 : it.desc) == null ? void 0 : _b.uk) || "")}</textarea></label>
      ${it ? `<label>\u0424\u043E\u0442\u043E<input id="fPhoto" type="file" accept="image/*"></label>` : ""}</div>`;
    const v = await modal({ title: it ? "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443" : "\u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...it ? [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443", val: "del", cls: "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v === "del") {
      if (await confirmBox(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \xAB${it.name.uk}\xBB \u0437 \u043C\u0435\u043D\u044E?`)) await act("menuDel", { id: it.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
      return;
    }
    if (v !== "save") return;
    const variants = $("#fVar").value.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const [vv, p] = s.split(/[=:]/).map((x) => x.trim());
      return { v: vv.replace(",", "."), p: +p };
    }).filter((x) => x.v && x.p);
    const item = { id: it == null ? void 0 : it.id, cat: $("#fCat").value, name: $("#fName").value, nameEn: $("#fEn").value, price: +$("#fPrice").value, variants, size: $("#fSize").value, desc: $("#fDesc").value };
    const file = (_d = (_c = $("#fPhoto")) == null ? void 0 : _c.files) == null ? void 0 : _d[0];
    closeModal();
    const r = await act("menuSave", { item }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (r && file) {
      const data = await shrink(file);
      await act("menuPhoto", { id: r.id, data }, "\u{1F4F7} \u0424\u043E\u0442\u043E \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    }
    loadMenu().catch(() => {
    });
  }
  function shrink(file) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1200 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * k;
        c.height = img.height * k;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  }
  let modalResolve;
  function modal({ title, text = "", body = "", buttons, keep }) {
    return new Promise((res) => {
      modalResolve = (v) => {
        if (!keep || v == null) closeModal();
        res(v);
      };
      const el = document.createElement("div");
      el.className = "modal-bg";
      el.id = "modal";
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${body}<div class="btns" style="margin-top:14px">${buttons.map((b, i) => `<button class="btn ${b.cls || ""}" data-mi="${i}">${esc(b.label)}</button>`).join("")}</div></div>`;
      el.addEventListener("click", (e) => {
        var _a2;
        if (e.target === el) return modalResolve(null);
        const i = (_a2 = e.target.closest("[data-mi]")) == null ? void 0 : _a2.dataset.mi;
        if (i != null) modalResolve(buttons[+i].val);
      });
      document.body.append(el);
      const fq = el.querySelector("[data-mi-quick]");
      if (fq) fq.onclick = () => {
        el.querySelector("#fIn").value = last0;
        modalResolve("ok");
      };
    });
  }
  let last0 = 0;
  const closeModal = () => {
    var _a2;
    return (_a2 = $("#modal")) == null ? void 0 : _a2.remove();
  };
  const choose = (title, text, opts) => modal({ title, text, buttons: [...opts, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] });
  const confirmBox = (title, text = "") => modal({ title, text, buttons: [{ label: "\u0422\u0430\u043A", val: true, cls: "red" }, { label: "\u041D\u0456", val: null }] });
  async function ask(title, ph = "", type = "text") {
    const v = await modal({ title, body: `<input id="askIn" type="${type}" placeholder="${esc(ph)}" ${type === "number" ? 'inputmode="decimal"' : ""}>`, buttons: [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const x = v === "ok" ? $("#askIn").value.trim() : null;
    closeModal();
    return x || null;
  }
  function pickTable(title, text, skip) {
    return new Promise((res) => {
      modalResolve = (v) => {
        closeModal();
        res(v);
      };
      const el = document.createElement("div");
      el.className = "modal-bg";
      el.id = "modal";
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="grid">${Array.from({ length: S.n }, (_, i) => i + 1).filter((n) => n !== skip).map((n) => `<button class="${S.tables[n] ? "busy" : ""}" data-t="${n}">${n}</button>`).join("")}</div><div class="btns"><button class="btn" data-x>\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div></div>`;
      el.addEventListener("click", (e) => {
        var _a2;
        if (e.target === el || e.target.closest("[data-x]")) return modalResolve(null);
        const t = (_a2 = e.target.closest("[data-t]")) == null ? void 0 : _a2.dataset.t;
        if (t) modalResolve(+t);
      });
      document.body.append(el);
      setTimeout(() => {
        var _a2;
        return (_a2 = el.querySelector("input")) == null ? void 0 : _a2.focus();
      }, 50);
    });
  }
  setTimeout(() => {
  }, 0);
  let toastT;
  function toast(msg) {
    var _a2;
    (_a2 = $(".toast")) == null ? void 0 : _a2.remove();
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = msg;
    document.body.append(d);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), 2600);
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a, t = S.open;
    switch (a) {
      case "view":
        S.view = el.dataset.v;
        S.q = "";
        renderNav();
        renderMain();
        loadView();
        $("#feed").classList.remove("open");
        $("#main").scrollTop = 0;
        break;
      case "feed":
        $("#feed").classList.toggle("open");
        break;
      case "more": {
        const v = await choose("\u0429\u0435", "", NAV.filter((n) => (!n[3] || isAdmin()) && ["stop", "menu", "printer", "settings"].includes(n[0])).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: "\u{1F512} \u0412\u0438\u0439\u0442\u0438", val: "logout", cls: "red" }]));
        if (v === "logout") {
          if (await confirmBox("\u0412\u0438\u0439\u0442\u0438?", "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0443\u0432\u0456\u0439\u0434\u0435 \u0441\u0432\u043E\u0457\u043C PIN")) logout();
        } else if (v) {
          S.view = v;
          S.q = "";
          renderNav();
          renderMain();
          loadView();
          $("#main").scrollTop = 0;
        }
        break;
      }
      case "switch":
        if (await confirmBox("\u0412\u0438\u0439\u0442\u0438?", "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0443\u0432\u0456\u0439\u0434\u0435 \u0441\u0432\u043E\u0457\u043C PIN")) logout();
        break;
      case "table":
        $("#feed").classList.remove("open");
        openTable(el.dataset.t);
        break;
      case "newOrder": {
        const n = await pickTable("\u041D\u043E\u0432e \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0456\u043B");
        if (n) {
          openTable(n);
          S.mobileMenu = true;
          renderSheet();
        }
        break;
      }
      case "closeSheet":
        closeSheet();
        break;
      case "tab":
        S.mobileMenu = el.dataset.m === "1";
        renderSheet();
        break;
      case "mobileMenu":
        S.mobileMenu = true;
        renderSheet();
        break;
      case "cat":
        S.cat = el.dataset.c;
        S.q = "";
        renderSheet();
        $("#shItems").scrollTop = 0;
        break;
      case "grp":
        S.grp = el.dataset.g;
        S.cat = "";
        S.q = "";
        store.set("grp", S.grp);
        renderSheet();
        $("#shItems").scrollTop = 0;
        break;
      case "fav": {
        const on = !S.fav.includes(el.dataset.id);
        S.fav = on ? [...S.fav, el.dataset.id] : S.fav.filter((x) => x !== el.dataset.id);
        renderSheet();
        act("fav", { id: el.dataset.id, on }, on ? "\u2B50 \u0414\u043E\u0434\u0430\u043D\u043E \u0432 \u043E\u0431\u0440\u0430\u043D\u0456" : "\u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E \u0437 \u043E\u0431\u0440\u0430\u043D\u0438\u0445");
        break;
      }
      case "tw":
        S.tw[t] = !S.tw[t];
        S.packAdj[t] = 0;
        renderSheet();
        break;
      case "pk": {
        const cur = packQ(t);
        if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d;
        renderSheet();
        break;
      }
      case "photos":
        S.photos = !S.photos;
        store.set("photos", S.photos);
        renderSheet();
        break;
      case "zDay":
        zDay();
        break;
      case "shOpen":
        shOpen();
        break;
      case "shClose":
        shClose();
        break;
      case "rp":
        S.rep.p = el.dataset.p;
        loadView();
        break;
      case "rTab":
        S.rep.tab = el.dataset.t;
        renderMain();
        break;
      case "rSort":
        S.rep.sort = el.dataset.s;
        renderMain();
        break;
      case "rReset":
        Object.assign(S.rep, { pay: "", by: "", grp: "", cat: "", t: "", q: "" });
        renderMain();
        break;
      case "add":
        addItem(el.dataset.id);
        break;
      case "cq": {
        const c = cartOf(t), x = c[el.dataset.k];
        if (x) {
          x.q += +el.dataset.d;
          if (x.q <= 0) delete c[el.dataset.k];
        }
        saveCarts();
        renderSheet();
        break;
      }
      case "cartClear":
        S.carts[t] = {};
        saveCarts();
        renderSheet();
        break;
      case "send":
        sendCart();
        break;
      case "rm": {
        const reason = await voidReason(`\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 1\xD7 ${el.dataset.name}?`);
        if (reason) act("remove", { t, name: el.dataset.name, reason }, "\u270F\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
        break;
      }
      case "pre":
        act("precheck", { t }, "\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "disc":
        discFlow();
        break;
      case "tip": {
        const b = S.tables[t];
        if (!b) break;
        const v = await choose(`\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u2014 \u0441\u0442\u0456\u043B ${t}`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}`, [...[5, 10, 15].map((p) => ({ label: `${p}% \xB7 ${money(Math.round(b.pay2 * p / 100))}`, val: String(Math.round(b.pay2 * p / 100)) })), { label: "\u270F\uFE0F \u0421\u0432\u043E\u044F \u0441\u0443\u043C\u0430", val: "own" }, ...b.tip ? [{ label: "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0447\u0430\u0439\u043E\u0432\u0456", val: "0", cls: "red" }] : []]);
        if (v == null) break;
        let sum = v;
        if (v === "own") {
          sum = await ask("\u0421\u0443\u043C\u0430 \u0447\u0430\u0439\u043E\u0432\u0438\u0445, \u20B4", "\u043D\u0430\u043F\u0440. 100", "number");
          if (sum == null) break;
        }
        await act("tip", { t, sum: +sum }, +sum ? `\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 ${money(+sum)}` : "\u0427\u0430\u0439\u043E\u0432\u0456 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
        break;
      }
      case "tipSet":
        act("tip", { t, sum: 0 }, "\u0427\u0430\u0439\u043E\u0432\u0456 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
        break;
      case "discSet":
        act("discount", { t, pct: 0 }, "\u0417\u043D\u0438\u0436\u043A\u0443 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
        break;
      case "move":
        moveFlow();
        break;
      case "closeT":
        closeFlow();
        break;
      case "delTable": {
        const reason = await voidReason(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0435\u0441\u044C \u0441\u0442\u0456\u043B ${t}? \u0421\u0443\u043C\u0430 \u041D\u0415 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443`);
        if (reason) {
          const r = await act("delete", { t, reason }, `\u{1F5D1} \u0421\u0442\u0456\u043B ${t} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E`);
          if (r) closeSheet();
        }
        break;
      }
      case "accept":
        act("accept", { oid: el.dataset.oid }, "\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0442\u043E \u2014 \u0433\u0456\u0441\u0442\u044C \u0431\u0430\u0447\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441");
        break;
      case "cBack":
        if (await confirmBox("\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0447\u0430\u0439\u043E\u0432\u0456 \u0437\u043D\u043E\u0432\u0443 \u0437\u0430\u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F")) {
          await act("closedBack", { ref: el.dataset.ref }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443");
          loadView();
        }
        break;
      case "cReopen":
        if (await confirmBox("\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443?", "\u0412\u0456\u043D \u0437\u043D\u0456\u043C\u0435\u0442\u044C\u0441\u044F \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0439 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B \u2014 \u0432\u0438\u043F\u0440\u0430\u0432\u0438\u0442\u0435 \u0439 \u0437\u0430\u043A\u0440\u0438\u0454\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E")) {
          const r = await act("closedReopen", { ref: el.dataset.ref }, "\u21A9\uFE0F \u0420\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456");
          loadView();
          loadState().catch(() => {
          });
          if (r == null ? void 0 : r.x) openTable(r.x.t);
        }
        break;
      case "tBack":
        if (await confirmBox("\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u0438\u0439 \u0441\u0442\u0456\u043B?", "\u0421\u0442\u0440\u0430\u0432\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B")) {
          const r = await act("tableBack", { ref: el.dataset.ref }, "\u21A9\uFE0F \u0421\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
          loadView();
          loadState().catch(() => {
          });
          if (r == null ? void 0 : r.x) openTable(r.x.t);
        }
        break;
      case "movBack":
        await act("moveBack", { i: +el.dataset.i }, "\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
        loadView();
        break;
      case "expBack":
        await act("expenseBack", { i: +el.dataset.i }, "\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
        loadView();
        break;
      case "cPrint":
        act("closedPrint", { ref: el.dataset.ref }, "\u{1F5A8} \u0427\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "cDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u043D\u0456\u043C\u0443\u0442\u044C\u0441\u044F \u0437\u0456 \u0437\u0432\u0456\u0442\u0456\u0432")) await act("closedDel", { ref: el.dataset.ref }, "\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438");
        loadView();
        break;
      case "stopT":
        await act("stop", { id: el.dataset.id, hidden: el.dataset.h === "1" });
        break;
      case "pTest":
        act("printTest", {}, "\u{1F5A8} \u0422\u0435\u0441\u0442 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "pQr": {
        const n = await pickTable("QR \u043C\u0435\u043D\u044E", "\u0423 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0442\u043E\u043B\u0443 \u0441\u0432\u0456\u0439 QR \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430 \u0446\u0435\u0439 \u0441\u0442\u0456\u043B");
        if (n) act("printQr", { t: n }, `\u{1F5A8} QR \u0441\u0442\u043E\u043B\u0443 ${n}`);
        break;
      }
      case "float": {
        const v = await ask("\u0420\u043E\u0437\u043C\u0456\u043D \u043D\u0430 \u043F\u043E\u0447\u0430\u0442\u043E\u043A \u0434\u043D\u044F", "\u0421\u0443\u043C\u0430 \u0432 \u043A\u0430\u0441\u0456, \u20B4", "number");
        if (v != null) {
          await act("float", { sum: +v.replace(",", ".") }, "\u{1F3E6} \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
          loadView();
        }
        break;
      }
      case "expense": {
        const v = await modal({ title: "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430", body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="\u0421\u0443\u043C\u0430, \u20B4"><input id="eNote" placeholder="\u041D\u0430 \u0449\u043E (\u043D\u0430\u043F\u0440. \u043E\u0432\u043E\u0447\u0456 \u043D\u0430 \u0440\u0438\u043D\u043A\u0443)"></div>', buttons: [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438", val: "cash", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u0438", val: "card" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const sum = v && +$("#eSum").value.replace(",", "."), note = v && $("#eNote").value;
        closeModal();
        if (v && sum) {
          await act("expense", { sum, note, src: v }, "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
          loadView();
        }
        break;
      }
      case "tipPay": {
        const src = await choose(`\u{1F49D} \u0412\u0438\u0434\u0430\u0442\u0438 \u0447\u0430\u0439\u043E\u0432\u0456: ${el.dataset.n}`, "\u0417\u0432\u0456\u0434\u043A\u0438 \u0441\u043F\u0438\u0441\u0430\u0442\u0438? \u0421\u0443\u043C\u0430 \u0432\u0456\u0434\u043D\u0456\u043C\u0435\u0442\u044C\u0441\u044F \u0437 \u0433\u043E\u0442\u0456\u0432\u043A\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438", [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u043E\u044E \u0437 \u043A\u0430\u0441\u0438", val: "cash", cls: "green" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u043A\u0438", val: "card", cls: "blue" }]);
        if (src) {
          await act("tipPay", { name: el.dataset.n, src }, "\u{1F49D} \u0412\u0438\u0434\u0430\u043D\u043E");
          loadView();
          loadState().catch(() => {
          });
        }
        break;
      }
      case "cMove":
        cashMove(el.dataset.t);
        break;
      case "balInfo":
        balInfo(el.dataset.s);
        break;
      case "movDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437\u0430\u043F\u0438\u0441?")) {
          await act("moveDel", { i: +el.dataset.i });
          loadView();
        }
        break;
      case "expDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0438\u0442\u0440\u0430\u0442\u0443?")) {
          await act("expenseDel", { i: +el.dataset.i });
          loadView();
        }
        break;
      case "menuEdit":
        menuEdit(el.dataset.id);
        break;
      case "catAdd": {
        const v = await ask("\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B \u043C\u0435\u043D\u044E", "\u041D\u0430\u0437\u0432\u0430, \u043D\u0430\u043F\u0440. \u0423\u043F\u0430\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
        if (v && await act("catAdd", { name: v }, "\u{1F4C2} \u0420\u043E\u0437\u0434\u0456\u043B \u0434\u043E\u0434\u0430\u043D\u043E \u0432 \u043A\u0456\u043D\u0435\u0446\u044C \u043C\u0435\u043D\u044E")) loadMenu().catch(() => {
        });
        break;
      }
      case "menuUndo":
        if (await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443 \u043C\u0435\u043D\u044E?")) act("menuUndo", {}, "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
        break;
      case "staffAdd": {
        const v = await modal({ title: "\u2795 \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A", body: '<div class="form"><input id="sName" placeholder="\u0406\u043C\u02BC\u044F"><input id="sPin" inputmode="numeric" maxlength="4" placeholder="PIN \u2014 4 \u0446\u0438\u0444\u0440\u0438"></div>', buttons: [{ label: "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", val: "waiter", cls: "primary" }, { label: "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", val: "admin" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const name = v && $("#sName").value, p = v && $("#sPin").value;
        closeModal();
        if (v) {
          await act("staffAdd", { name, pin: p, role: v }, "\u{1F465} \u0414\u043E\u0434\u0430\u043D\u043E");
          loadView();
        }
        break;
      }
      case "regSet": {
        const v = await ask(`\u041D\u043E\u0432\u0438\u0439 \u043A\u043E\u0434 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 (${el.dataset.r === "admin" ? "\u0430\u0434\u043C\u0456\u043D" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"})`, "4 \u0446\u0438\u0444\u0440\u0438", "number");
        if (v) {
          await act("regCode", { role: el.dataset.r, code: v }, "\u{1F195} \u041A\u043E\u0434 \u0437\u043C\u0456\u043D\u0435\u043D\u043E");
          loadView();
        }
        break;
      }
      case "staffDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430?", "\u0419\u043E\u0433\u043E PIN \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435 \u043F\u0440\u0430\u0446\u044E\u0432\u0430\u0442\u0438")) {
          await act("staffDel", { id: el.dataset.id });
          loadView();
        }
        break;
      case "wOut":
        await act("waiterOut", { uid: el.dataset.uid }, "\u0412\u0438\u0439\u0448\u043E\u0432 \u0456\u0437 \u0431\u043E\u0442\u0430");
        loadView();
        break;
      case "wPass": {
        const v = await ask("\u041D\u043E\u0432\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430", "\u043C\u0456\u043D\u0456\u043C\u0443\u043C 3 \u0441\u0438\u043C\u0432\u043E\u043B\u0438");
        if (v) act("waiterPass", { pass: v }, "\u{1F511} \u0417\u043C\u0456\u043D\u0435\u043D\u043E");
        break;
      }
      case "aPass": {
        const v = await ask("\u041D\u043E\u0432\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430", "\u043C\u0456\u043D\u0456\u043C\u0443\u043C 4 \u0441\u0438\u043C\u0432\u043E\u043B\u0438");
        if (v) act("adminPass", { pass: v }, "\u{1F511} \u0417\u043C\u0456\u043D\u0435\u043D\u043E");
        break;
      }
      case "wifiAdd":
        await act("wifiAdd", {}, "\u{1F4F6} \u041C\u0435\u0440\u0435\u0436\u0443 \u0434\u043E\u0434\u0430\u043D\u043E");
        loadView();
        break;
      case "wifiClear":
        if (await confirmBox("\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456 \u043C\u0435\u0440\u0435\u0436\u0456?", "\u0413\u043E\u0441\u0442\u0456 \u043D\u0435 \u0437\u043C\u043E\u0436\u0443\u0442\u044C \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438, \u043F\u043E\u043A\u0438 \u043D\u0435 \u0434\u043E\u0434\u0430\u0441\u0442\u0435 \u043C\u0435\u0440\u0435\u0436\u0443")) {
          await act("wifiClear");
          loadView();
        }
        break;
      case "reset":
        if (await confirmBox("\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435?", "\u0417\u0432\u0456\u0442\u0438, \u043A\u0430\u0441\u0430, \u0437\u0430\u043A\u0440\u0438\u0442\u0456, \u0442\u043E\u043F \u0441\u0442\u0440\u0430\u0432, \u0441\u0442\u0440\u0456\u0447\u043A\u0430 \u0456 \u0412\u0421\u0406 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0456 \u0441\u0442\u043E\u043B\u0438")) {
          if (await confirmBox("\u0422\u043E\u0447\u043D\u043E? \u0426\u0435 \u043D\u0435 \u043C\u043E\u0436\u043D\u0430 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438.")) {
            await act("reset", {}, "\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0435\u043D\u043E");
            loadView();
          }
        }
        break;
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "search") {
      S.q = e.target.value;
      renderSheet();
    }
    if (e.target.id === "stopSearch") {
      S.q = e.target.value;
      renderMain();
      const s = $("#stopSearch");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
    if (e.target.id === "cartCom") S.coms[S.open] = e.target.value;
    if (e.target.id === "rQ") {
      S.rep.q = e.target.value;
      renderMain();
    }
  });
  document.addEventListener("change", (e) => {
    var _a2;
    const f = (_a2 = e.target.dataset) == null ? void 0 : _a2.f;
    if (f) {
      S.rep[f] = e.target.value;
      if (f === "grp") S.rep.cat = "";
      renderMain();
    }
    if (e.target.id === "rFrom" || e.target.id === "rTo") {
      S.rep[e.target.id === "rFrom" ? "from" : "to"] = e.target.value;
      loadView();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal")) modalResolve == null ? void 0 : modalResolve(null);
      else closeSheet();
    }
  });
  const searching = () => {
    var _a2;
    return ((_a2 = document.activeElement) == null ? void 0 : _a2.id) === "search";
  };
  document.addEventListener("mousedown", (e) => {
    if (searching() && e.target.closest("#shItems .item, .cats, .seg")) e.preventDefault();
  });
  let kbY = null;
  document.addEventListener("touchstart", (e) => {
    kbY = searching() && e.target.closest("#shItems") ? e.touches[0].clientY : null;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (kbY != null && e.touches[0].clientY - kbY > 40) {
      document.activeElement.blur();
      kbY = null;
    }
  }, { passive: true });
  function goBack() {
    if ($("#modal")) return modalResolve == null ? void 0 : modalResolve(null);
    if ($("#feed").classList.contains("open")) return $("#feed").classList.remove("open");
    if (S.open) {
      if (S.mobileMenu && S.tables[S.open] && innerWidth <= 980) {
        S.mobileMenu = false;
        return renderSheet();
      }
      return closeSheet();
    }
    if (S.view !== "hall") {
      S.view = "hall";
      S.q = "";
      renderNav();
      renderMain();
    }
  }
  let sw = null;
  const swEl = () => $("#modal .modal") || ($("#feed").classList.contains("open") ? null : $(".sheet")) || $("#main");
  document.addEventListener("touchstart", (e) => {
    const p = e.touches[0];
    sw = e.touches.length === 1 && p.clientX < 28 && !$("#login").offsetParent ? { x: p.clientX, y: p.clientY, dx: 0, on: false, el: swEl() } : null;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!sw) return;
    const p = e.touches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > dx) {
        sw = null;
        return;
      }
      if (dx > 10) sw.on = true;
      else return;
    }
    sw.dx = Math.max(0, dx);
    if (sw.el) {
      sw.el.style.transition = "none";
      sw.el.style.transform = `translateX(${sw.dx * 0.6}px)`;
    }
    let a = $("#swArrow");
    if (!a) {
      a = document.createElement("div");
      a.id = "swArrow";
      a.textContent = "\u2039";
      document.body.append(a);
    }
    a.style.opacity = Math.min(1, sw.dx / 90);
    a.classList.toggle("go", sw.dx > 90);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    var _a2, _b;
    if (!sw) return;
    const go = sw.on && sw.dx > 90, el = sw.el;
    sw = null;
    (_a2 = $("#swArrow")) == null ? void 0 : _a2.remove();
    if (el) {
      el.style.transition = "transform .2s";
      el.style.transform = "";
      setTimeout(() => {
        el.style.transition = "";
      }, 220);
    }
    if (go) {
      (_b = navigator.vibrate) == null ? void 0 : _b.call(navigator, 10);
      goBack();
    }
  });
  const myVer = (((_a = document.querySelector('script[src*="pos.build.js"]')) == null ? void 0 : _a.getAttribute("src")) || "").split("v=")[1];
  async function checkVer() {
    try {
      const h = await (await fetch("pos.html?u=" + Date.now(), { cache: "no-store" })).text();
      const v = (h.match(/pos\.build\.js\?v=(\d+)/) || [])[1];
      if (v && myVer && v !== myVer && !S.open && !$("#modal")) location.replace(location.pathname + "?v=" + v);
    } catch (e) {
    }
  }
  setInterval(checkVer, 5 * 6e4);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkVer());
  setTimeout(checkVer, 3e3);
  async function start() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    renderNav();
    $("#main").innerHTML = '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    try {
      await loadState();
    } catch (e) {
      return;
    }
    loadMenu().catch(() => {
    });
    connect();
  }
  if (S.token) start();
  else showLogin();
})();
