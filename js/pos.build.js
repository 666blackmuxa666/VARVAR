var __defProp = Object.defineProperty;
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
(() => {
  const API = new URLSearchParams(location.search).get("api") || "https://varvar-menu.varvar.workers.dev";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = (n) => "".concat(Math.round(n || 0).toLocaleString("uk-UA"), " \u20B4");
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
    open: 0,
    carts: store.get("carts", {}),
    coms: {},
    cat: 0,
    q: "",
    mobileMenu: false,
    data: {},
    seen: /* @__PURE__ */ new Set(),
    ready: false,
    live: false
  };
  const isAdmin = () => {
    var _a;
    return ((_a = S.me) == null ? void 0 : _a.role) === "admin";
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
    $("#keypad").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button data-k="'.concat(n, '">').concat(n, "</button>")).join("") + '<button class="fn" data-k="c">\u0421\u0442\u0435\u0440\u0442\u0438</button><button data-k="0">0</button><button class="fn" data-k="b">\u232B</button>';
  }
  const dots = () => {
    const d = $("#dots");
    const len = Math.max(4, pin.length);
    d.innerHTML = Array.from({ length: len }, (_, i) => '<i class="'.concat(i < pin.length ? "on" : "", '"></i>')).join("");
  };
  async function tryLogin(body) {
    $("#lErr").style.color = "var(--muted)";
    $("#lErr").textContent = "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u044E\u2026";
    try {
      const r = await api("login", body);
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
    if ($("#login").hidden || $("#pinView").hidden) return;
    if (/^\d$/.test(e.key)) pinKey(e.key);
    else if (e.key === "Backspace") pinKey("b");
    else if (e.key === "Escape") pinKey("c");
    else if (e.key === "Enter" && pin.length >= 4) {
      clearTimeout(tryLogin.t);
      tryLogin({ pin });
    }
  });
  $("#keypad").addEventListener("click", (e) => {
    var _a;
    const k = (_a = e.target.closest("[data-k]")) == null ? void 0 : _a.dataset.k;
    if (k) pinKey(k);
  });
  function pinKey(k) {
    if (k === "c") pin = "";
    else if (k === "b") pin = pin.slice(0, -1);
    else if (pin.length < 6) pin += k;
    dots();
    if (pin.length >= 4) {
      clearTimeout(tryLogin.t);
      tryLogin.t = setTimeout(() => tryLogin({ pin }), pin.length === 6 ? 0 : 700);
    }
  }
  $("#toPass").onclick = () => {
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
    S.n = r.n;
    S.printer = r.printer;
    S.tables = Object.fromEntries(r.tables.map((b) => [b.t, b]));
    const fresh = r.events.filter((e) => !S.seen.has(e.id));
    if (S.ready && fresh.some((e) => e.k === "guest" || e.k === "check")) ding();
    r.events.forEach((e) => S.seen.add(e.id));
    S.events = r.events;
    S.ready = true;
    render();
  }
  async function loadMenu() {
    S.menu = (await api("menu")).menu;
    if (S.open) renderSheet();
    if (["stop", "menu"].includes(S.view)) renderMain();
  }
  let ws, wsTimer, pingT, reloadT;
  function connect() {
    try {
      ws == null ? void 0 : ws.close();
    } catch (e) {
    }
    ws = new WebSocket(API.replace(/^http/, "ws") + "/api/pos/live?token=" + S.token);
    ws.onopen = () => {
      S.live = true;
      liveDot();
      clearInterval(pingT);
      pingT = setInterval(() => ws.readyState === 1 && ws.send("ping"), 25e3);
      loadState().catch(() => {
      });
    };
    ws.onmessage = (e) => {
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
        if (m.keys.includes("menu")) loadMenu().catch(() => {
        });
        if (["closed", "reports", "settings"].includes(S.view) && m.keys.some((k) => ["closed", "day", "exp", "staff"].includes(k))) loadView();
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
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && S.token) {
      loadState().catch(() => {
      });
      if (!S.live) connect();
    }
  });
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
  const NAV = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F4DC}", "\u0417\u0430\u043A\u0440\u0438\u0442\u0456"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["printer", "\u{1F5A8}", "\u041F\u0440\u0438\u043D\u0442\u0435\u0440"], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438", 1], ["menu", "\u{1F4D6}", "\u041C\u0435\u043D\u044E", 1], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442.", 1]];
  function renderNav() {
    var _a;
    const newCnt = S.events.filter((e) => e.k === "guest" && e.s !== "acc").length;
    $("#nav").innerHTML = '<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>' + NAV.filter((n) => !n[3] || isAdmin()).map(([v, ic, l]) => '<button class="'.concat(S.view === v ? "on" : "", '" data-a="view" data-v="').concat(v, '"><span class="ic">').concat(ic, "</span>").concat(l, "</button>")).join("") + '<button class="feed-btn" data-a="feed"><span class="ic">\u{1F514}</span>\u0421\u0442\u0440\u0456\u0447\u043A\u0430'.concat(newCnt ? '<span class="badge">'.concat(newCnt, "</span>") : "", "</button>") + '<div class="grow"></div><div class="me">'.concat(esc((_a = S.me) == null ? void 0 : _a.name), "<br>").concat(isAdmin() ? "\u0430\u0434\u043C\u0456\u043D" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", "</div>") + '<button data-a="switch"><span class="ic">\u{1F512}</span>\u0412\u0438\u0439\u0442\u0438</button>';
  }
  function render() {
    renderNav();
    renderFeed();
    if (["hall", "printer"].includes(S.view)) renderMain();
    if (S.open) renderSheet();
  }
  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter((e) => e.k === "guest" && e.s !== "acc").map((e) => e.t));
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map((t) => {
      const b = S.tables[t];
      if (!b) return '<button class="tbl" data-a="table" data-t="'.concat(t, '"><div class="n">').concat(t, '</div><div class="st">\u0432\u0456\u043B\u044C\u043D\u0438\u0439</div></button>');
      const cls = ["busy", b.check ? "check" : "", pending.has(t) ? "new" : ""].join(" ");
      const tag = b.check ? '<span class="tag c">\u{1F9FE} \u0447\u0435\u043A'.concat(b.pay ? b.pay === "card" ? " \u{1F4B3}" : " \u{1F4B5}" : "", "</span>") : pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : "";
      return '<button class="tbl '.concat(cls, '" data-a="table" data-t="').concat(t, '">').concat(tag, '<div class="n">').concat(t, '</div><div class="st">').concat(b.orders, " \u0437\u0430\u043C\u043E\u0432\u043B.").concat(b.disc ? " \xB7 \u2212".concat(b.disc, "%") : "", '</div><div class="sum money">').concat(money(b.pay2), '</div><div class="tm">\u0437 ').concat(b.opened ? hhmm(b.opened) : "\u2014", "</div></button>");
    }).join("");
    return '<div class="head"><h1>\u0417\u0430\u043B</h1><div class="stat">\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u043E<b>'.concat(list.length, '</b></div><div class="stat">\u0423 \u0437\u0430\u043B\u0456<b class="money">').concat(money(sum), '</b></div>\n      <button class="btn primary" data-a="newOrder">\u2795 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</button></div><div class="tables">').concat(tiles, "</div>");
  }
  const evTitle = (e) => ({
    guest: "\u{1F6CE} \u0421\u0442\u0456\u043B ".concat(e.t, " \u2014 ").concat(esc((e.kind || "\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F").toLowerCase())),
    check: "\u{1F9FE} \u0421\u0442\u0456\u043B ".concat(e.t, " \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0447\u0435\u043A").concat(e.pay ? e.pay === "card" ? " \xB7 \u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : " \xB7 \u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430" : ""),
    waiter: "\u{1F9D1}\u200D\u{1F373} \u0421\u0442\u0456\u043B ".concat(e.t, " \u2014 ").concat(esc(e.by)).concat(e.src === "\u043A\u0430\u0441\u0430" ? " (\u043A\u0430\u0441\u0430)" : ""),
    close: "\u2705 \u0421\u0442\u0456\u043B ".concat(e.t, " \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u2014 ").concat(money(e.sum), " ").concat(e.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}").concat(e.print === false ? " \xB7 \u0431\u0435\u0437 \u0447\u0435\u043A\u0430" : ""),
    del: "\u{1F5D1} \u0421\u0442\u0456\u043B ".concat(e.t, " \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E (").concat(money(e.sum), ")"),
    move: "\u2194\uFE0F ".concat(esc(e.text)),
    disc: "% \u0421\u0442\u0456\u043B ".concat(e.t, ": ").concat(esc(e.text)),
    rm: "\u270F\uFE0F \u0421\u0442\u0456\u043B ".concat(e.t, ": ").concat(esc(e.text)),
    pre: "\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0441\u0442\u0456\u043B ".concat(e.t)
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    $("#events").innerHTML = S.events.length ? [...S.events].reverse().map((e) => {
      var _a;
      const lines = ((_a = e.lines) == null ? void 0 : _a.length) ? '<div class="lines">'.concat(e.lines.map(esc).join("\n"), "</div>") : "";
      const by = e.by && !["waiter"].includes(e.k) ? " \xB7 ".concat(esc(e.by)) : "";
      const btns = e.k === "guest" || e.k === "check" ? '<div class="act">'.concat(e.s === "acc" ? '<span class="muted">\u2705 '.concat(esc(e.accBy || "\u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E"), "</span>") : '<button class="btn sm green" data-a="accept" data-oid="'.concat(e.oid, '">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button>'), '<button class="btn sm" data-a="table" data-t="').concat(e.t, '">\u0421\u0442\u0456\u043B ').concat(e.t, "</button></div>") : "";
      return '<div class="ev '.concat(e.k).concat(e.s === "acc" ? " acc" : "", '"><div class="top"><b>').concat(evTitle(e), '</b><span class="tm">').concat(e.at).concat(by, "</span></div>").concat(lines).concat(e.comment ? '<div class="com">\u{1F4AC} '.concat(esc(e.comment), "</div>") : "").concat(e.sum && ["guest", "waiter"].includes(e.k) ? '<div class="muted">\u0421\u0443\u043C\u0430 '.concat(money(e.sum), "</div>") : "").concat(btns, "</div>");
    }).join("") : '<div class="muted" style="padding:12px">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043F\u043E\u0434\u0456\u0439 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>';
  }
  const cartOf = (t) => {
    var _a;
    return (_a = S.carts)[t] || (_a[t] = {});
  };
  const saveCarts = () => store.set("carts", S.carts);
  const itemsAll = () => S.menu ? S.menu.categories.flatMap((c) => c.items) : [];
  function openTable(t) {
    S.open = +t;
    S.mobileMenu = !S.tables[t];
    S.q = "";
    if (!S.menu) loadMenu();
    renderSheet();
  }
  function closeSheet() {
    S.open = 0;
    $("#layer").innerHTML = "";
  }
  function renderSheet() {
    var _a, _b, _c, _d, _e;
    const t = S.open;
    if (!t) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0);
    const billRows = b ? b.items.map((it) => '<div class="row"><div class="nm">'.concat(esc(it.name), "<small>").concat(it.q, " \xD7 ").concat(Math.round(it.sum / it.q), ' \u20B4</small></div><b class="money">').concat(it.sum, '</b><button class="rb minus" data-a="rm" data-name="').concat(esc(it.name), '" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1">\u2212</button></div>')).join("") : '<div class="muted" style="padding:8px 4px">\u0420\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0432 \u043C\u0435\u043D\u044E</div>';
    const discRow = (b == null ? void 0 : b.disc) ? '<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 '.concat(b.disc, '%</div><b class="money" style="color:var(--green)">\u2212').concat(b.total - b.pay2, '</b><button class="rb minus" data-a="discSet" data-p="0">\xD7</button></div>') : "";
    const comments = b ? b.log.filter((o) => o.comment).map((o) => '<div class="muted" style="padding:2px 6px">\u{1F4AC} '.concat(esc(o.comment), "</div>")).join("") : "";
    const cartHTML = cartRows.length ? '<div class="cart"><h3>\u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</h3><div class="rows">'.concat(cartRows.map(([k, x]) => '<div class="row"><div class="nm">'.concat(esc(x.name), "<small>").concat(x.price, ' \u20B4</small></div><button class="rb minus" data-a="cq" data-k="').concat(esc(k), '" data-d="-1">\u2212</button><span class="q">').concat(x.q, '</span><button class="rb plus" data-a="cq" data-k="').concat(esc(k), '" data-d="1">+</button></div>')).join(""), '</div>\n      <input id="cartCom" placeholder="\u{1F4AC} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u0434\u043B\u044F \u043A\u0443\u0445\u043D\u0456 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)" value="').concat(esc(S.coms[t] || ""), '" style="margin:6px 0 10px">\n      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">\u2715</button><button class="btn primary" data-a="send">\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \xB7 ').concat(money(cartSum), "</button></div></div>") : "";
    const actions = b ? '<div class="actions"><button class="btn" data-a="pre">\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A</button><button class="btn" data-a="disc">% \u0417\u043D\u0438\u0436\u043A\u0430</button>\n      <button class="btn" data-a="move">\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438</button>'.concat(isAdmin() ? '<button class="btn red" data-a="delTable">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>' : '<button class="btn" data-a="mobileMenu">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438</button>', '\n      <button class="btn green wide" data-a="closeT">\u{1F4B0} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \xB7 ').concat(money(b.pay2), "</button></div>") : "";
    let menuHTML2 = '<div class="muted" style="padding:20px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043C\u0435\u043D\u044E\u2026</div>';
    if (S.menu) {
      const cats = S.menu.categories;
      const q = S.q.trim().toLowerCase();
      const items = q ? itemsAll().filter((i) => i.name.uk.toLowerCase().includes(q) || (i.name.en || "").toLowerCase().includes(q)) : ((_a = cats[S.cat]) == null ? void 0 : _a.items) || [];
      const inCart = (id) => cartRows.filter(([k]) => k.split("|")[0] === id).reduce((s, [, x]) => s + x.q, 0);
      menuHTML2 = '<div class="cats">'.concat(cats.map((c, i) => '<button class="chip '.concat(!q && i === S.cat ? "on" : "", '" data-a="cat" data-i="').concat(i, '">').concat(esc(c.name.uk), "</button>")).join(""), '</div>\n        <input class="search" id="search" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u0441\u0442\u0440\u0430\u0432\u0438" value="').concat(esc(S.q), '">\n        <div class="items">').concat(items.map((it) => {
        const n = inCart(it.id);
        return '<button class="item '.concat(it.hidden ? "off" : "", '" data-a="add" data-id="').concat(it.id, '">').concat(n ? '<span class="cnt">'.concat(n, "</span>") : "").concat(it.img ? '<img loading="lazy" src="'.concat(esc(it.img), '" alt="">') : "", '<span class="nm">').concat(esc(it.name.uk), "</span>").concat(it.size && !it.variants ? '<span class="muted" style="font-size:12px">'.concat(esc(it.size), "</span>") : "", '<span class="pr">').concat(it.hidden ? "\u26D4 \u043D\u0435\u043C\u0430\u0454" : it.variants ? it.variants.map((v) => v.p).join(" / ") + " \u20B4" : it.price + " \u20B4", "</span></button>");
      }).join("") || '<div class="muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</div>', "</div>");
    }
    const keepScroll = (_b = $(".items")) == null ? void 0 : _b.scrollTop, keepBill = (_c = $(".bill .scroll")) == null ? void 0 : _c.scrollTop, focusSearch = ((_d = document.activeElement) == null ? void 0 : _d.id) === "search", focusCom = ((_e = document.activeElement) == null ? void 0 : _e.id) === "cartCom";
    $("#layer").innerHTML = '<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet">\n      <div class="sheet-head"><h2>\u0421\u0442\u0456\u043B '.concat(t, "</h2>").concat(b ? '<span class="total money">'.concat(money(b.pay2), "</span>").concat(b.disc ? '<span class="chip">\u2212'.concat(b.disc, "%</span>") : "", '<span class="muted">\u0437 ').concat(b.opened ? hhmm(b.opened) : "\u2014", " \xB7 ").concat(b.orders, " \u0437\u0430\u043C\u043E\u0432\u043B.</span>").concat(b.check ? '<span class="chip" style="background:var(--orange);color:#000">\u{1F9FE} \u043F\u0440\u043E\u0441\u044F\u0442\u044C \u0447\u0435\u043A</span>' : "") : '<span class="muted">\u043D\u043E\u0432\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A</span>', '\n        <span class="sp"></span><div class="tabs2"><button class="').concat(S.mobileMenu ? "" : "on", '" data-a="tab" data-m="0">\u0420\u0430\u0445\u0443\u043D\u043E\u043A').concat(cartRows.length ? " (".concat(cartRows.length, ")") : "", '</button><button class="').concat(S.mobileMenu ? "on" : "", '" data-a="tab" data-m="1">\u041C\u0435\u043D\u044E</button></div>\n        <button class="close-x" data-a="closeSheet">\u2715</button></div>\n      <div class="sheet-body ').concat(S.mobileMenu ? "show-menu" : "", '">\n        <div class="bill"><div class="scroll"><h3>\u0420\u0430\u0445\u0443\u043D\u043E\u043A</h3>').concat(billRows).concat(discRow).concat(comments, "</div>").concat(cartHTML).concat(actions, '</div>\n        <div class="menu-pane">').concat(menuHTML2, "</div></div></div>");
    if (keepScroll) $(".items") && ($(".items").scrollTop = keepScroll);
    if (keepBill) $(".bill .scroll").scrollTop = keepBill;
    if (focusSearch) {
      const s = $("#search");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
    if (focusCom) {
      const s = $("#cartCom");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }
  async function addItem(id) {
    var _a;
    const it = itemsAll().find((i) => i.id === id);
    if (!it) return;
    if (it.hidden) return toast("\u26D4 " + it.name.uk + " \u2014 \u0443 \u0441\u0442\u043E\u043F-\u043B\u0438\u0441\u0442\u0456");
    let v = null;
    if (it.variants) {
      v = await choose(it.name.uk, "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0440\u043E\u0437\u043C\u0456\u0440", it.variants.map((x) => ({ label: "".concat(x.v, " ").concat(it.size || "", " \xB7 ").concat(x.p, " \u20B4"), val: x.v })));
      if (v == null) return;
    }
    const vv = (_a = it.variants) == null ? void 0 : _a.find((x) => x.v === v);
    const key = it.id + (v ? "|" + v : ""), cart = cartOf(S.open);
    cart[key] || (cart[key] = { id: it.id, v, name: it.name.uk + (vv ? " ".concat(vv.v, " ").concat(it.size || "").trimEnd() : ""), price: vv ? vv.p : it.price, q: 0 });
    cart[key].q++;
    saveCarts();
    renderSheet();
  }
  async function sendCart() {
    const t = S.open, cart = cartOf(t), items = Object.values(cart).map((x) => ({ id: x.id, v: x.v, q: x.q }));
    if (!items.length) return;
    const btn = document.querySelector('[data-a="send"]');
    if (btn) btn.disabled = true;
    const r = await act("order", { t, items, comment: S.coms[t] || "" });
    if (r) {
      S.carts[t] = {};
      S.coms[t] = "";
      saveCarts();
      S.mobileMenu = false;
      toast("\u{1F5A8} \u0421\u0442\u0456\u043B ".concat(t, ": \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E"));
      await loadState().catch(() => {
      });
    } else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const v = await choose("\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ".concat(t), "\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ".concat(money(b.pay2)).concat(b.pay ? " \xB7 \u0433\u0456\u0441\u0442\u044C \u0445\u043E\u0447\u0435 ".concat(b.pay === "card" ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u043E\u044E" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E") : ""), [
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "cash:1", cls: "green" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "card:1", cls: "blue" },
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "cash:0" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "card:0" }
    ]);
    if (!v) return;
    const [pay, pr] = v.split(":");
    const r = await act("close", { t, pay, print: pr === "1" });
    if (r == null ? void 0 : r.r) {
      toast("\u2705 \u0421\u0442\u0456\u043B ".concat(t, " \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 ").concat(money(r.r.sum)));
      closeSheet();
      loadState().catch(() => {
      });
    }
  }
  async function discFlow() {
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const v = await choose("\u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0441\u0442\u0456\u043B ".concat(t), "\u0421\u0443\u043C\u0430 ".concat(money(b.total)).concat(b.disc ? " \xB7 \u0437\u0430\u0440\u0430\u0437 ".concat(b.disc, "%") : ""), [...[5, 10, 15, 20, 25, 30, 50].map((p2) => ({ label: "".concat(p2, "%  \u2192  ").concat(money(b.total - Math.round(b.total * p2 / 100))), val: String(p2) })), { label: "\u270F\uFE0F \u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A", val: "own" }, { label: "\u0411\u0435\u0437 \u0437\u043D\u0438\u0436\u043A\u0438", val: "0", cls: "red" }]);
    if (v == null) return;
    let p = v;
    if (v === "own") {
      p = await ask("\u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0437\u043D\u0438\u0436\u043A\u0438", "\u0427\u0438\u0441\u043B\u043E \u0432\u0456\u0434 0 \u0434\u043E 100", "number");
      if (p == null) return;
    }
    await act("discount", { t, pct: +p }, +p ? "% \u0417\u043D\u0438\u0436\u043A\u0430 ".concat(p, "%") : "\u0417\u043D\u0438\u0436\u043A\u0443 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
  }
  async function moveFlow() {
    const t = S.open;
    const to = await pickTable("\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0441\u0442\u0456\u043B ".concat(t), "\u041D\u0430 \u0437\u0430\u0439\u043D\u044F\u0442\u0438\u0439 \u0441\u0442\u0456\u043B (\u0436\u043E\u0432\u0442\u0438\u0439) \u2014 \u0440\u0430\u0445\u0443\u043D\u043A\u0438 \u043E\u0431\u02BC\u0454\u0434\u043D\u0430\u044E\u0442\u044C\u0441\u044F", t);
    if (!to) return;
    const r = await act("move", { t, to }, "");
    if (r == null ? void 0 : r.r) {
      toast(r.r.merged ? "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E \u0437\u0456 \u0441\u0442\u043E\u043B\u043E\u043C ".concat(to) : "\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0456\u043B ".concat(to));
      S.carts[to] = __spreadValues(__spreadValues({}, S.carts[to] || {}), cartOf(t));
      S.carts[t] = {};
      saveCarts();
      S.open = to;
      await loadState().catch(() => {
      });
    }
  }
  async function loadView() {
    try {
      if (S.view === "closed") S.data.closed = (await api("closed")).list;
      if (S.view === "reports") S.data.rep = await api("reports");
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
    const v = S.view, m = $("#main");
    m.classList.toggle("hall", v === "hall");
    if (v === "hall") {
      const cols = Math.ceil(Math.sqrt(S.n * 1.6));
      m.style.setProperty("--cols", cols);
      m.style.setProperty("--rows", Math.ceil(S.n / cols));
      m.innerHTML = hallHTML();
    } else if (v === "closed") m.innerHTML = closedHTML();
    else if (v === "stop") m.innerHTML = stopHTML();
    else if (v === "printer") m.innerHTML = printerHTML();
    else if (v === "reports") m.innerHTML = reportsHTML();
    else if (v === "menu") m.innerHTML = menuHTML();
    else if (v === "settings") m.innerHTML = settingsHTML();
  }
  const payL = (x) => x.card ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430";
  function closedHTML() {
    const l = S.data.closed;
    if (!l) return '<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const gone = (x) => x.del || x.rm, ok = l.filter((x) => !gone(x));
    return '<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h1><div class="stat">\u0420\u0430\u0445\u0443\u043D\u043A\u0456\u0432<b>'.concat(ok.length, '</b></div><div class="stat">\u0420\u0430\u0437\u043E\u043C<b class="money">').concat(money(ok.reduce((s, x) => s + x.sum, 0)), '</b></div>\n      <div class="stat">\u{1F4B5}<b class="money">').concat(money(ok.reduce((s, x) => {
      var _a;
      return s + ((_a = x.cash) != null ? _a : x.sum);
    }, 0)), '</b></div><div class="stat">\u{1F4B3}<b class="money">').concat(money(ok.reduce((s, x) => s + (x.card || 0), 0)), '</b></div></div>\n      <div class="cards">').concat([...l].reverse().map((x, i) => {
      var _a, _b;
      const ref = x.id || l.length - 1 - i;
      return '<div class="card" style="'.concat(gone(x) ? "opacity:.45" : "", '"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">\n        <h3 style="margin:0;flex:1">').concat(x.at, " \xB7 \u0421\u0442\u0456\u043B ").concat(x.t, ' \xB7 <span class="money">').concat(money(x.sum), "</span> ").concat(gone(x) ? "\u{1F5D1} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : payL(x)).concat(x.disc ? " \xB7 \u0437\u043D\u0438\u0436\u043A\u0430 ".concat(x.disc, "%") : "", '</h3><span class="muted">').concat(esc(x.by || ""), "</span>\n        ").concat(!gone(x) && ((_a = x.dishes) == null ? void 0 : _a.length) ? '<button class="btn sm" data-a="cPrint" data-ref="'.concat(ref, '">\u{1F5A8} \u0427\u0435\u043A</button>') : "").concat(!gone(x) && isAdmin() ? '<button class="btn sm red" data-a="cDel" data-ref="'.concat(ref, '">\u{1F5D1} \u0417 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</button>') : "", "</div>\n        ").concat(((_b = x.dishes) == null ? void 0 : _b.length) ? '<div class="muted" style="margin-top:8px">'.concat(x.dishes.map(([n, q, s]) => "".concat(q, "\xD7 ").concat(esc(n), " \u2014 ").concat(s)).join(" \xB7 "), "</div>") : "", "</div>");
    }).join("") || '<div class="muted">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>', "</div>");
  }
  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const q = S.q.trim().toLowerCase();
    return '<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1><span class="muted">\u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0435 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0454\u0442\u044C\u0441\u044F \u0433\u043E\u0441\u0442\u044F\u043C \u0456 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F</span></div>\n      <input id="stopSearch" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A" value="'.concat(esc(S.q), '" style="max-width:420px;margin-bottom:14px">\n      ').concat(S.menu.categories.map((c) => {
      const its = c.items.filter((i) => !q || i.name.uk.toLowerCase().includes(q));
      return its.length ? '<h3 class="muted" style="margin:18px 4px 8px">'.concat(esc(c.name.uk), '</h3><div class="grid2">').concat(its.map((i) => '<div class="list-row"><div class="grow">'.concat(esc(i.name.uk), '</div><button class="switch ').concat(i.hidden ? "" : "on", '" data-a="stopT" data-id="').concat(i.id, '" data-h="').concat(i.hidden ? 0 : 1, '"></button></div>')).join(""), "</div>") : "";
    }).join(""));
  }
  function printerHTML() {
    var _a;
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 6e4;
    return '<div class="head"><h1>\u041F\u0440\u0438\u043D\u0442\u0435\u0440</h1></div><div class="cards"><div class="card"><div class="big">'.concat(ok ? "\u2705 \u043D\u0430 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : p.seen ? "\u274C \u043D\u0435\u043C\u0430\u0454 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : "\u274C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0434\u0440\u0443\u043A\u0443 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430", '</div>\n      <div class="muted">').concat(p.seen ? "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0437\u0432\u02BC\u044F\u0437\u043E\u043A: " + hhmm(p.seen) : "", " \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456: ").concat((_a = p.q) != null ? _a : 0, '</div></div>\n      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">\u{1F5A8} \u0422\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A</button><button class="btn" data-a="pQr">\u{1F533} QR \u043C\u0435\u043D\u044E \u0434\u043B\u044F \u0441\u0442\u043E\u043B\u0443</button></div></div>');
  }
  function reportsHTML() {
    const r = S.data.rep;
    if (!r) return '<div class="head"><h1>\u0417\u0432\u0456\u0442\u0438 \u0456 \u043A\u0430\u0441\u0430</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const c = r.cash;
    const row = ([label, d]) => '<div class="card"><h3>'.concat(esc(label), '</h3><div class="big money">').concat(money(d.closed), '</div>\n      <div class="kv"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430</span><b class="money">').concat(money(d.cash), '</b></div><div class="kv"><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u0430</span><b class="money">').concat(money(d.card), '</b></div>\n      <div class="kv"><span>\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438</span><b class="money">').concat(money(d.exp), '</b></div><div class="kv"><span>\u0427\u0438\u0441\u0442\u0438\u043C\u0438</span><b class="money">').concat(money(d.closed - d.exp), '</b></div>\n      <div class="kv"><span>\u0421\u0442\u043E\u043B\u0456\u0432 \xB7 \u0441\u0435\u0440. \u0447\u0435\u043A</span><b>').concat(d.tables, " \xB7 ").concat(d.tables ? money(d.closed / d.tables) : "\u2014", "</b></div>").concat(d.disc ? '<div class="kv"><span>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438</span><b class="money">'.concat(money(d.disc), "</b></div>") : "", "</div>");
    return '<div class="head"><h1>\u0417\u0432\u0456\u0442\u0438 \u0456 \u043A\u0430\u0441\u0430</h1><div class="stat">\u0429\u0435 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0432 \u0437\u0430\u043B\u0456<b class="money">'.concat(money(r.open), '</b></div></div>\n      <div class="grid2" style="margin-bottom:14px"><div class="card"><h3>\u{1F4B0} \u041A\u0430\u0441\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>\n        <div class="kv"><span>\u0420\u043E\u0437\u043C\u0456\u043D \u043D\u0430 \u043F\u043E\u0447\u0430\u0442\u043E\u043A</span><b class="money">').concat(money(c.float), '</b></div><div class="kv"><span>+ \u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432\u0456\u0434 \u0433\u043E\u0441\u0442\u0435\u0439</span><b class="money">').concat(money(c.cash), '</b></div>\n        <div class="kv"><span>\u2212 \u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E</span><b class="money">').concat(money(c.exCash), '</b></div><div class="kv"><span><b>\u041C\u0430\u0454 \u0431\u0443\u0442\u0438 \u0432 \u043A\u0430\u0441\u0456</b></span><b class="money big" style="font-size:22px">').concat(money(c.inBox), '</b></div>\n        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-a="float">\u{1F3E6} \u0420\u043E\u0437\u043C\u0456\u043D</button><button class="btn sm" data-a="expense">\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430</button></div></div>\n        <div class="card"><h3>\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>').concat(c.exp.length ? c.exp.map((e, i) => '<div class="kv" style="'.concat(e.del ? "opacity:.4;text-decoration:line-through" : "", '"><span>').concat(e.at, " ").concat(e.src === "card" ? "\u{1F4B3}" : "\u{1F4B5}", " ").concat(esc(e.note || ""), '</span><span><b class="money">').concat(money(e.sum), "</b> ").concat(e.del ? "" : '<button class="btn sm red" data-a="expDel" data-i="'.concat(i, '">\u{1F5D1}</button>'), "</span></div>")).join("") : '<div class="muted">\u041D\u0435\u043C\u0430\u0454</div>', '</div></div>\n      <div class="grid2">').concat(r.rows.map(row).join(""), '</div>\n      <h2 style="margin:26px 0 10px">\u{1F3C6} \u0422\u043E\u043F \u0441\u0442\u0440\u0430\u0432 \u0437\u0430 \u043C\u0456\u0441\u044F\u0446\u044C</h2><div class="card">').concat(r.top.map((x, i) => '<div class="kv"><span>'.concat(i + 1, ". ").concat(esc(x.n), "</span><b>").concat(x.q, ' \u0448\u0442 \xB7 <span class="money">').concat(money(x.s), "</span></b></div>")).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432</div>', "</div>");
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1><button class="btn" data-a="menuUndo">\u21A9\uFE0F \u0412\u0456\u0434\u043C\u0456\u043D\u0438\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443</button><button class="btn primary" data-a="menuEdit" data-id="">\u2795 \u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430</button></div>\n      '.concat(S.menu.categories.map((c) => '<h3 class="muted" style="margin:18px 4px 8px">'.concat(esc(c.name.uk), '</h3><div class="grid2">').concat(c.items.map((i) => '<button class="list-row press" data-a="menuEdit" data-id="'.concat(i.id, '" style="text-align:left"><div class="grow"><b>').concat(esc(i.name.uk), "</b>").concat(i.hidden ? " \u26D4" : "", '<div class="muted" style="font-size:13px">').concat(i.variants ? i.variants.map((v) => "".concat(v.v, " \u2014 ").concat(v.p)).join(" / ") : i.price + " \u20B4").concat(i.size && !i.variants ? " \xB7 " + esc(i.size) : "", "</div></div>\u203A</button>")).join(""), "</div>")).join(""));
  }
  function settingsHTML() {
    const st = S.data.staff, wf = S.data.wifi;
    return '<div class="head"><h1>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h1></div><div class="grid2">\n      <div class="card"><h3>\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B (PIN \u0434\u043B\u044F \u043A\u0430\u0441\u0438)</h3>'.concat(st ? st.staff.map((s) => '<div class="kv"><span>'.concat(esc(s.name), " \xB7 ").concat(s.role === "admin" ? "\u{1F510} \u0430\u0434\u043C\u0456\u043D" : "\u{1F9D1}\u200D\u{1F373} \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", '</span><button class="btn sm red" data-a="staffDel" data-id="').concat(s.id, '">\u{1F5D1}</button></div>')).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>' : "\u2026", '\n        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430</button></div>\n      <div class="card"><h3>\u{1F916} \u0423\u0432\u0456\u0439\u0448\u043B\u0438 \u0432 Telegram-\u0431\u043E\u0442</h3>').concat(st ? st.waiters.map((w) => '<div class="kv"><span>'.concat(esc(w.name || w.uid), '</span><button class="btn sm red" data-a="wOut" data-uid="').concat(w.uid, '">\u0412\u0438\u0439\u0442\u0438</button></div>')).join("") || '<div class="muted">\u041D\u0456\u043A\u043E\u0433\u043E</div>' : "\u2026", '</div>\n      <div class="card"><h3>\u{1F511} \u041F\u0430\u0440\u043E\u043B\u0456</h3><div class="muted" style="margin-bottom:10px">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430 \u2014 \u0432\u0445\u0456\u0434 \u0443 \u0431\u043E\u0442 \u0456 \u043A\u0430\u0441\u0443; \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \u2014 \u0430\u0434\u043C\u0456\u043D-\u0444\u0443\u043D\u043A\u0446\u0456\u0457.</div>\n        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="wPass">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430</button><button class="btn sm" data-a="aPass">\u041F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430</button></div></div>\n      <div class="card"><h3>\u{1F4F6} Wi\u2011Fi \u0437\u0430\u043A\u043B\u0430\u0434\u0443</h3><div class="muted">\u0417\u0432\u0456\u0434\u0441\u0438 \u0433\u043E\u0441\u0442\u0456 \u043C\u043E\u0436\u0443\u0442\u044C \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438. \u0412\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430 \u0437\u0430\u0440\u0430\u0437: ').concat(esc((wf == null ? void 0 : wf.current) || "\u2026"), "</div>\n        ").concat(wf ? wf.list.map((x) => '<div class="kv"><span>'.concat(esc(x.k), '</span><span class="muted">').concat(new Date(x.at).toLocaleDateString("uk-UA"), "</span></div>")).join("") || '<div class="muted">\u043D\u0435\u043C\u0430\u0454 \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043D\u0435 \u043F\u0440\u0438\u0439\u043C\u0430\u0442\u0438\u043C\u0443\u0442\u044C\u0441\u044F!</div>' : "", '\n        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm primary" data-a="wifiAdd">\u2795 \u0426\u0435 \u043D\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430</button><button class="btn sm red" data-a="wifiClear">\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456</button></div></div>\n      <div class="card"><h3>\u{1F9EA} \u0422\u0435\u0441\u0442</h3><div class="muted" style="margin-bottom:10px">\u0422\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E, \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0443.</div><button class="btn sm red" data-a="reset">\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435</button></div></div>');
  }
  async function menuEdit(id) {
    var _a, _b, _c, _d;
    const it = itemsAll().find((i) => i.id === id) || null;
    const cat = it ? S.menu.categories.find((c) => c.items.includes(it)).id : S.menu.categories[0].id;
    const body = '<div class="form">\n      <label>\u0420\u043E\u0437\u0434\u0456\u043B<select id="fCat">'.concat(S.menu.categories.map((c) => '<option value="'.concat(c.id, '" ').concat(c.id === cat ? "selected" : "", ">").concat(esc(c.name.uk), "</option>")).join(""), '</select></label>\n      <label>\u041D\u0430\u0437\u0432\u0430<input id="fName" value="').concat(esc((it == null ? void 0 : it.name.uk) || ""), '"></label>\n      <label>\u041D\u0430\u0437\u0432\u0430 \u0430\u043D\u0433\u043B\u0456\u0439\u0441\u044C\u043A\u043E\u044E (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)<input id="fEn" value="').concat(esc(it && it.name.en !== it.name.uk ? it.name.en : ""), '"></label>\n      <label>\u0426\u0456\u043D\u0430, \u20B4 ').concat((it == null ? void 0 : it.variants) ? "" : "", '<input id="fPrice" inputmode="numeric" value="').concat((_a = it == null ? void 0 : it.price) != null ? _a : "", '" placeholder="\u043D\u0430\u043F\u0440. 380"></label>\n      <label>\u0410\u0431\u043E \u0440\u043E\u0437\u043C\u0456\u0440\u0438 (\u0434\u043B\u044F \u043D\u0430\u043F\u043E\u0457\u0432): <span class="muted">0.33=60, 0.5=70</span><input id="fVar" value="').concat(esc((it == null ? void 0 : it.variants) ? it.variants.map((v2) => "".concat(v2.v, "=").concat(v2.p)).join(", ") : ""), '"></label>\n      <label>\u0412\u0430\u0433\u0430/\u043E\u0431\u02BC\u0454\u043C<input id="fSize" value="').concat(esc((it == null ? void 0 : it.size) || ""), '" placeholder="\u043D\u0430\u043F\u0440. 400 \u0433 \u0430\u0431\u043E \u043B"></label>\n      <label>\u0421\u043A\u043B\u0430\u0434<textarea id="fDesc" rows="3">').concat(esc(((_b = it == null ? void 0 : it.desc) == null ? void 0 : _b.uk) || ""), "</textarea></label>\n      ").concat(it ? '<label>\u0424\u043E\u0442\u043E<input id="fPhoto" type="file" accept="image/*"></label>' : "", "</div>");
    const v = await modal({ title: it ? "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443" : "\u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...it ? [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443", val: "del", cls: "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v === "del") {
      if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \xAB".concat(it.name.uk, "\xBB \u0437 \u043C\u0435\u043D\u044E?"))) await act("menuDel", { id: it.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
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
      el.innerHTML = '<div class="modal"><h3>'.concat(esc(title), "</h3>").concat(text ? "<p>".concat(esc(text), "</p>") : "").concat(body, '<div class="btns" style="margin-top:14px">').concat(buttons.map((b, i) => '<button class="btn '.concat(b.cls || "", '" data-mi="').concat(i, '">').concat(esc(b.label), "</button>")).join(""), "</div></div>");
      el.addEventListener("click", (e) => {
        var _a;
        if (e.target === el) return modalResolve(null);
        const i = (_a = e.target.closest("[data-mi]")) == null ? void 0 : _a.dataset.mi;
        if (i != null) modalResolve(buttons[+i].val);
      });
      document.body.append(el);
    });
  }
  const closeModal = () => {
    var _a;
    return (_a = $("#modal")) == null ? void 0 : _a.remove();
  };
  const choose = (title, text, opts) => modal({ title, text, buttons: [...opts, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] });
  const confirmBox = (title, text = "") => modal({ title, text, buttons: [{ label: "\u0422\u0430\u043A", val: true, cls: "red" }, { label: "\u041D\u0456", val: null }] });
  async function ask(title, ph = "", type = "text") {
    const v = await modal({ title, body: '<input id="askIn" type="'.concat(type, '" placeholder="').concat(esc(ph), '" ').concat(type === "number" ? 'inputmode="decimal"' : "", ">"), buttons: [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
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
      el.innerHTML = '<div class="modal"><h3>'.concat(esc(title), "</h3><p>").concat(esc(text), '</p><div class="grid">').concat(Array.from({ length: S.n }, (_, i) => i + 1).filter((n) => n !== skip).map((n) => '<button class="'.concat(S.tables[n] ? "busy" : "", '" data-t="').concat(n, '">').concat(n, "</button>")).join(""), '</div><div class="btns"><button class="btn" data-x>\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div></div>');
      el.addEventListener("click", (e) => {
        var _a;
        if (e.target === el || e.target.closest("[data-x]")) return modalResolve(null);
        const t = (_a = e.target.closest("[data-t]")) == null ? void 0 : _a.dataset.t;
        if (t) modalResolve(+t);
      });
      document.body.append(el);
      setTimeout(() => {
        var _a;
        return (_a = el.querySelector("input")) == null ? void 0 : _a.focus();
      }, 50);
    });
  }
  setTimeout(() => {
  }, 0);
  let toastT;
  function toast(msg) {
    var _a;
    (_a = $(".toast")) == null ? void 0 : _a.remove();
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
        S.cat = +el.dataset.i;
        S.q = "";
        renderSheet();
        $(".items").scrollTop = 0;
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
      case "rm":
        if (await confirmBox("\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1\xD7 ".concat(el.dataset.name, "?"))) act("remove", { t, name: el.dataset.name }, "\u270F\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
        break;
      case "pre":
        act("precheck", { t }, "\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "disc":
        discFlow();
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
      case "delTable":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ".concat(t, "?"), "\u041F\u043E\u043C\u0438\u043B\u043A\u043E\u0432\u0438\u0439/\u0442\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u2014 \u0441\u0443\u043C\u0430 \u041D\u0415 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443")) {
          const r = await act("delete", { t }, "\u{1F5D1} \u0421\u0442\u0456\u043B ".concat(t, " \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E"));
          if (r) closeSheet();
        }
        break;
      case "accept":
        act("accept", { oid: el.dataset.oid }, "\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0442\u043E \u2014 \u0433\u0456\u0441\u0442\u044C \u0431\u0430\u0447\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441");
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
        const n = await pickTable("QR \u043C\u0435\u043D\u044E", "\u041D\u043E\u043C\u0435\u0440 \u0441\u0442\u043E\u043B\u0443 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043D\u0430\u0434 QR (QR \u043E\u0434\u043D\u0430\u043A\u043E\u0432\u0438\u0439)");
        if (n) act("printQr", { t: n }, "\u{1F5A8} QR \u0441\u0442\u043E\u043B\u0443 ".concat(n));
        break;
      }
      case "float": {
        const v = await ask("\u0420\u043E\u0437\u043C\u0456\u043D \u043D\u0430 \u043F\u043E\u0447\u0430\u0442\u043E\u043A \u0434\u043D\u044F", "\u0421\u0443\u043C\u0430 \u0432 \u043A\u0430\u0441\u0456, \u20B4", "number");
        if (v != null) {
          await act("float", { sum: +v }, "\u{1F3E6} \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
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
      case "expDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0438\u0442\u0440\u0430\u0442\u0443?")) {
          await act("expenseDel", { i: +el.dataset.i });
          loadView();
        }
        break;
      case "menuEdit":
        menuEdit(el.dataset.id);
        break;
      case "menuUndo":
        if (await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443 \u043C\u0435\u043D\u044E?")) act("menuUndo", {}, "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
        break;
      case "staffAdd": {
        const v = await modal({ title: "\u2795 \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A", body: '<div class="form"><input id="sName" placeholder="\u0406\u043C\u02BC\u044F"><input id="sPin" inputmode="numeric" maxlength="6" placeholder="PIN (4\u20136 \u0446\u0438\u0444\u0440)"></div>', buttons: [{ label: "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", val: "waiter", cls: "primary" }, { label: "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", val: "admin" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const name = v && $("#sName").value, p = v && $("#sPin").value;
        closeModal();
        if (v) {
          await act("staffAdd", { name, pin: p, role: v }, "\u{1F465} \u0414\u043E\u0434\u0430\u043D\u043E");
          loadView();
        }
        break;
      }
      case "staffDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430?")) {
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
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal")) modalResolve == null ? void 0 : modalResolve(null);
      else closeSheet();
    }
  });
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
