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
  const okV = (x) => /^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(x || "") && x !== "varvar";
  const VENUE = (() => {
    const q = new URLSearchParams(location.search).get("venue");
    try {
      if (q != null) {
        if (okV(q)) localStorage.setItem("pos_venue2", q);
        else localStorage.removeItem("pos_venue2");
      }
      localStorage.removeItem("pos_venue");
      const s = localStorage.getItem("pos_venue2") || "";
      if (s && !okV(s)) {
        localStorage.removeItem("pos_venue2");
        return "";
      }
      return s;
    } catch (e) {
      return okV(q) ? q : "";
    }
  })();
  const API = (new URLSearchParams(location.search).get("api") || (/workers\.dev$/.test(location.hostname) ? location.origin : "https://varvar-menu.varvar.workers.dev")) + (VENUE ? "/v/" + VENUE : "");
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const tn = (t) => +t > 2e3 ? "\u0421\u2011" + (t - 2e3) : +t > 1e3 ? "\u0414\u2011" + (t - 1e3) : t;
  const money = (n) => `${Math.round(n || 0).toLocaleString("uk-UA")} \u20B4`;
  const store = { get(k, d) {
    try {
      const v = localStorage.getItem("pos_" + (VENUE ? VENUE + "_" : "") + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  }, set(k, v) {
    try {
      localStorage.setItem("pos_" + (VENUE ? VENUE + "_" : "") + k, JSON.stringify(v));
    } catch (e) {
    }
  } };
  {
    const h = new URLSearchParams(location.hash.slice(1));
    if (/^[a-f0-9]{32}$/.test(h.get("tok") || "")) {
      try {
        store.set("token", h.get("tok"));
        store.set("me", JSON.parse(h.get("me") || "null"));
      } catch (e) {
      }
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
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
    rep: { p: "d", pay: "", by: "", grp: "", cat: "", t: "", q: "", tab: "overview", sort: "s", fo: false },
    mobileMenu: false,
    data: {},
    kq: [],
    kqSeen: null,
    kqCanc: /* @__PURE__ */ new Set(),
    ur: {},
    kFont: store.get("kfont", 1),
    seen: /* @__PURE__ */ new Set(),
    ready: false,
    live: false
  };
  S.brand = store.get("brand", null);
  const brandIni = () => {
    var _a2;
    return esc((((_a2 = S.brand) == null ? void 0 : _a2.name) || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase());
  };
  const brandImg = () => {
    var _a2;
    return ((_a2 = S.brand) == null ? void 0 : _a2.logo) ? `<img class="own" src="${esc(S.brand.logo)}" alt="" onerror="this.outerHTML='<b class=&quot;brand-t&quot;>${brandIni()}</b>'">` : !VENUE ? '<img src="printer/logo.png" alt="VARVAR">' : `<b class="brand-t">${brandIni()}</b>`;
  };
  function applyBrand() {
    var _a2, _b, _c;
    const nm = ((_a2 = S.brand) == null ? void 0 : _a2.name) || (VENUE ? "" : "VARVAR");
    document.title = (nm ? nm + " \u2014 " : "") + "\u043A\u0430\u0441\u0430";
    const li = $(".logo-img");
    if (li) {
      if ((_b = S.brand) == null ? void 0 : _b.logo) {
        li.src = S.brand.logo;
        li.classList.add("own");
        li.hidden = false;
      } else if (VENUE) li.hidden = true;
    }
    const sub = $("#loginBrand");
    if (sub) sub.textContent = VENUE || ((_c = S.brand) == null ? void 0 : _c.logo) ? nm : "";
  }
  applyBrand();
  const isAdmin = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "admin";
  }, isCook = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "cook";
  }, isCour = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "courier";
  };
  const setHTML = (el, html) => {
    if (el && el._h !== html) {
      el._h = html;
      el.innerHTML = html;
    }
  };
  const QOPS = /* @__PURE__ */ new Set(["order", "close"]), qidNew = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const offQ = () => store.get("offq", []), offSave = (q) => {
    store.set("offq", q);
    offBanner();
  };
  const netErr = (e) => e instanceof TypeError || /не відповідає|fetch|network|load failed/i.test((e == null ? void 0 : e.message) || "");
  function offBanner() {
    const n = offQ().length;
    let el = $("#offq");
    if (!n && !S.offline) {
      el == null ? void 0 : el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "offq";
      document.body.append(el);
    }
    el.textContent = `\u{1F4F4} ${S.offline ? "\u041D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C" : "\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u2026"}${n ? ` \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456 ${n} ${n === 1 ? "\u0434\u0456\u044F" : n < 5 ? "\u0434\u0456\u0457" : "\u0434\u0456\u0439"} \u2014 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456` : ""}`;
  }
  let flushing = false;
  async function offFlush() {
    if (flushing || !offQ().length || !S.token) return;
    flushing = true;
    try {
      for (const x of offQ()) {
        let r;
        try {
          r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op: x.op }, x.data)) }), 1e4);
        } catch (e) {
          S.offline = true;
          offBanner();
          return;
        }
        S.offline = false;
        if (r.status === 401 || r.status >= 500) {
          offBanner();
          return;
        }
        offSave(offQ().filter((y) => y.data.qid !== x.data.qid));
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          toast(`\u26A0\uFE0F \u0417 \u0447\u0435\u0440\u0433\u0438 \u043D\u0435 \u043F\u0440\u043E\u0439\u0448\u043B\u043E (${x.op === "close" ? "\u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F" : "\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F"} \u0441\u0442\u0456\u043B ${tn(x.data.t)}): ${errText(j.error || r.status)}`);
        }
      }
      toast("\u{1F4F6} \u0417\u0432'\u044F\u0437\u043E\u043A \u0454 \u2014 \u0447\u0435\u0440\u0433\u0430 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430");
      loadState().catch(() => {
      });
    } finally {
      flushing = false;
      offBanner();
    }
  }
  addEventListener("online", () => offFlush());
  setInterval(() => {
    if (offQ().length) offFlush();
  }, 2e4);
  async function api(op, data = {}, ms = 12e3) {
    if (QOPS.has(op) && !data.qid) data = __spreadProps(__spreadValues({}, data), { qid: qidNew() });
    let r;
    try {
      r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op }, data)) }), ms);
    } catch (e) {
      if (QOPS.has(op) && netErr(e)) {
        S.offline = true;
        offSave([...offQ(), { op, data, at: Date.now() }]);
        return { ok: true, queued: true };
      }
      if (netErr(e)) {
        S.offline = true;
        offBanner();
        if (op === "state" || op === "menu") {
          const c = store.get("cache_" + op, null);
          if (c) return c;
        }
      }
      throw e;
    }
    if (S.offline) {
      S.offline = false;
      offBanner();
      if (offQ().length) setTimeout(offFlush, 300);
    }
    if (r.status === 404 && VENUE) {
      try {
        localStorage.removeItem("pos_venue2");
      } catch (e) {
      }
      location.replace(location.pathname);
    }
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
    if ((op === "state" || op === "menu") && r.ok) try {
      store.set("cache_" + op, j);
    } catch (e) {
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
    const len = Math.max(4, pin.length);
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
    else if (pin.length < 12) pin += k;
    dots();
    clearTimeout(tryLogin.t);
    if (pin.length >= 4) tryLogin.t = setTimeout(() => tryLogin({ pin }), pin.length === 4 ? 900 : 1200);
  }
  let regCodeV = "";
  function showReg(role, code) {
    regCodeV = code;
    pin = "";
    dots();
    $("#pinView").hidden = true;
    $("#regView").hidden = false;
    $("#loginSub").textContent = "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430";
    $("#regRole").textContent = role === "admin" ? "\u{1F510} \u041D\u043E\u0432\u0438\u0439 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440" : role === "cook" ? "\u{1F468}\u200D\u{1F373} \u041D\u043E\u0432\u0438\u0439 \u043A\u0443\u0445\u0430\u0440" : role === "courier" ? "\u{1F6F5} \u041D\u043E\u0432\u0438\u0439 \u043A\u0443\u0440'\u0454\u0440" : "\u{1F9D1}\u200D\u{1F373} \u041D\u043E\u0432\u0438\u0439 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442";
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
  async function logout(expired) {
    if (!expired && offQ().length && !await confirmBox(`\u{1F4F4} \u0423 \u0447\u0435\u0440\u0437\u0456 ${offQ().length} \u043D\u0435\u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0445 \u0434\u0456\u0439`, "\u0412\u043E\u043D\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0443\u0442\u044C\u0441\u044F \u0439 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C\u0441\u044F, \u0449\u043E\u0439\u043D\u043E \u0445\u0442\u043E\u0441\u044C \u0443\u0432\u0456\u0439\u0434\u0435 \u0432 \u043A\u0430\u0441\u0443 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457 \u0439 \u0437'\u044F\u0432\u0438\u0442\u044C\u0441\u044F \u0437\u0432'\u044F\u0437\u043E\u043A. \u0412\u0438\u0439\u0442\u0438?")) return;
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
  let stateSeq = 0, stateDone = 0;
  async function loadState() {
    const my = ++stateSeq, r = await api("state");
    if (my < stateDone) return;
    stateDone = my;
    S.me = __spreadValues(__spreadValues({}, S.me), r.me);
    S.myTip = r.myTip;
    S.myAtt = r.myAtt || null;
    S.books = r.books || [];
    S.bkNew = r.bkNew || 0;
    if (r.brand && JSON.stringify(r.brand) !== JSON.stringify(S.brand)) {
      S.brand = r.brand;
      store.set("brand", r.brand);
      applyBrand();
    }
    S.gInN = r.gInN || 0;
    S.cfg = r.cfg || S.cfg;
    S.n = r.n;
    S.printer = r.printer;
    S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map((b) => [b.t, b]));
    const fresh = r.events.filter((e) => !S.seen.has(e.id));
    if (S.ready && fresh.some((e) => ["guest", "check", "call"].includes(e.k) || !isCook() && ["ready", "kmsg"].includes(e.k))) ding();
    r.events.forEach((e) => S.seen.add(e.id));
    S.events = r.events;
    S.ready = true;
    if (!S._tk0) {
      S._tk0 = 1;
      loadMyTasks();
    }
    if (isCour() && S.view === "go") renderMain();
    render();
  }
  async function loadMenu() {
    const r = await api("menu");
    S.menu = r.menu;
    S.fav = r.fav || [];
    S.groups = r.groups || [];
    if (S.open) renderSheet();
    if (["stop", "menu", "reports", "calc"].includes(S.view)) renderMain();
  }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0;
  const pendKeys = /* @__PURE__ */ new Set();
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
      m.keys.forEach((k) => pendKeys.add(k));
      clearTimeout(reloadT);
      reloadT = setTimeout(() => {
        m = { keys: [...pendKeys] };
        pendKeys.clear();
        loadState().catch(() => {
        });
        if (m.keys.includes("menu") || m.keys.includes("fav")) loadMenu().catch(() => {
        });
        if (m.keys.includes("kq") && (isCook() || S.view === "kq")) loadKq().catch(() => {
        });
        if (m.keys.includes("task")) {
          loadMyTasks();
          if (S.view === "team" && S.zpTab === "plan" && !$("#modal")) tkLoad();
        }
        if (S.view === "team" && m.keys.some((k) => ["att", "plan", "pay", "swaps", "staff"].includes(k)) && !$("#modal")) loadView(true);
        if (S.view === "calc" && m.keys.some((k) => ["ing", "cards", "stk", "invl", "sups", "cntl", "cnt"].includes(k)) && !skBusy()) loadView(true);
        if (["closed", "reports", "settings", "cash"].includes(S.view) && m.keys.some((k) => ["closed", "day", "exp", "staff", "shift", "z", "mov", "tipbal", "tippay", "void", "kq"].includes(k) || k === "bill" && S.view === "cash")) loadView(true);
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
  const SOUNDS = {
    classic: ["\u0414\u0437\u0456\u043D\u044C-\u0434\u0437\u0456\u043D\u044C", [[880, 0, 0.25], [1320, 0.16, 0.25]]],
    bell: ["\u0414\u0437\u0432\u0456\u043D\u043E\u0447\u043E\u043A", [[1568, 0, 0.9, "triangle"], [2093, 0.02, 0.7, "sine"]]],
    triple: ["\u0422\u0440\u0438 \u0442\u043E\u043D\u0438", [[660, 0, 0.18], [880, 0.18, 0.18], [1100, 0.36, 0.3]]],
    soft: ["\u041C'\u044F\u043A\u0438\u0439", [[523, 0, 0.5, "sine"], [659, 0.2, 0.6, "sine"]]],
    alarm: ["\u0422\u0440\u0438\u0432\u043E\u0433\u0430", [[1e3, 0, 0.12, "square"], [1e3, 0.2, 0.12, "square"], [1e3, 0.4, 0.12, "square"]]],
    marimba: ["\u041C\u0430\u0440\u0438\u043C\u0431\u0430", [[784, 0, 0.3, "triangle"], [988, 0.12, 0.3, "triangle"], [1175, 0.24, 0.4, "triangle"]]],
    pop: ["\u041F\u043E\u043F", [[400, 0, 0.08, "sine"], [800, 0.05, 0.12, "sine"]]],
    kitchen: ["\u041A\u0443\u0445\u043E\u043D\u043D\u0438\u0439", [[2637, 0, 0.5, "triangle"], [2637, 0.6, 0.5, "triangle"]]],
    off: ["\u0411\u0435\u0437 \u0437\u0432\u0443\u043A\u0443", []]
  };
  let actx;
  function ding(k) {
    var _a2, _b;
    try {
      const L = look(), sn = SOUNDS[k || L.sound] || SOUNDS.classic, vol = ((_a2 = L.vol) != null ? _a2 : 70) / 100 * 0.35 + 2e-4;
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      (_b = actx.resume) == null ? void 0 : _b.call(actx);
      sn[1].forEach(([f, d, len, type]) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + d;
        o.type = type || "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(1e-4, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(1e-4, t + len);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + len + 0.05);
      });
    } catch (e) {
    }
  }
  const THEMES = {
    night: ["\u{1F311} \u041D\u0456\u0447 (\u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442)", { bg: "#0b0b0d", bg2: "#151518", card: "#1c1c1f", card2: "#26262a", text: "#f5f5f7", muted: "#8e8e93", accent: "#f2c14e", "accent-ink": "#1a1400" }],
    beet: ["\u{1F377} \u0411\u0443\u0440\u044F\u043A", { bg: "#120609", bg2: "#1c0a10", card: "#261019", card2: "#341824", text: "#fbeff3", muted: "#a8848f", accent: "#e0457b", "accent-ink": "#fff" }],
    ocean: ["\u{1F30A} \u041E\u043A\u0435\u0430\u043D", { bg: "#06101a", bg2: "#0b1a29", card: "#102236", card2: "#173049", text: "#eef6ff", muted: "#7f98b3", accent: "#3fb6ff", "accent-ink": "#00121f" }],
    forest: ["\u{1F332} \u041B\u0456\u0441", { bg: "#07110b", bg2: "#0d1a12", card: "#13241a", card2: "#1b3224", text: "#eefaf2", muted: "#83a08e", accent: "#5ed68a", "accent-ink": "#04210f" }],
    violet: ["\u{1F52E} \u0424\u0456\u0430\u043B\u043A\u0430", { bg: "#0d0916", bg2: "#151024", card: "#1d1631", card2: "#291f44", text: "#f4f0ff", muted: "#9a8fb8", accent: "#a98bff", "accent-ink": "#14082e" }],
    coffee: ["\u2615 \u041A\u0430\u0432\u0430", { bg: "#120d09", bg2: "#1b140f", card: "#251c15", card2: "#32261d", text: "#f8efe6", muted: "#a8958a", accent: "#d9a066", "accent-ink": "#2a1806" }],
    graphite: ["\u26AB \u0413\u0440\u0430\u0444\u0456\u0442", { bg: "#161618", bg2: "#1e1e21", card: "#28282c", card2: "#333338", text: "#ffffff", muted: "#9b9ba1", accent: "#ffffff", "accent-ink": "#000" }],
    amoled: ["\u{1F5A4} \u0427\u043E\u0440\u043D\u0438\u0439 AMOLED", { bg: "#000", bg2: "#050505", card: "#0e0e0e", card2: "#1a1a1a", text: "#fff", muted: "#888", accent: "#ffd60a", "accent-ink": "#000" }],
    sunset: ["\u{1F305} \u0417\u0430\u0445\u0456\u0434", { bg: "#140a06", bg2: "#1f100a", card: "#2a160e", card2: "#3a2014", text: "#fff3ea", muted: "#b39282", accent: "#ff7a45", "accent-ink": "#2a0c00" }],
    mint: ["\u{1F343} \u041C'\u044F\u0442\u0430", { bg: "#071312", bg2: "#0c1d1b", card: "#112826", card2: "#183633", text: "#ecfffb", muted: "#80a7a1", accent: "#4fe3c1", "accent-ink": "#00241c" }]
  };
  const FONTS = { system: ["\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0438\u0439 (iOS)", ""], inter: ["Inter", "Inter"], manrope: ["Manrope", "Manrope"], rubik: ["Rubik", "Rubik"], nunito: ["Nunito", "Nunito"], montserrat: ["Montserrat", "Montserrat"], roboto: ["Roboto", "Roboto"], comfortaa: ["Comfortaa", "Comfortaa"], mono: ["JetBrains Mono", "JetBrains Mono"], pt: ["PT Sans", "PT Sans"] };
  const look = () => __spreadValues({ theme: "night", font: "system", nfont: "same", size: 100, radius: "round", sound: "classic", vol: 70, anim: 1, accent: "" }, store.get("look", {}));
  function applyLook() {
    const L = look(), T = (THEMES[L.theme] || THEMES.night)[1], r = document.documentElement.style;
    for (const [k, v] of Object.entries(T)) r.setProperty("--" + k, v);
    if (L.accent) r.setProperty("--accent", L.accent);
    const fam = (k) => {
      var _a2;
      return (_a2 = FONTS[k]) == null ? void 0 : _a2[1];
    }, need = [fam(L.font), L.nfont !== "same" && fam(L.nfont)].filter(Boolean);
    for (const f of need) {
      const id = "gf-" + f.replace(/ /g, "");
      if (!document.getElementById(id)) {
        const l = document.createElement("link");
        l.id = id;
        l.rel = "stylesheet";
        l.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}:wght@400;600;700;800&display=swap`;
        document.head.append(l);
      }
    }
    const base = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
    r.setProperty("--font", fam(L.font) ? `"${fam(L.font)}", ${base}` : base);
    r.setProperty("--nfont", L.nfont === "same" ? "var(--font)" : fam(L.nfont) ? `"${fam(L.nfont)}", ${base}` : base);
    document.body.style.zoom = L.size === 100 ? "" : L.size / 100;
    const R = { round: [18, 24], soft: [12, 16], square: [6, 8] }[L.radius] || [18, 24];
    r.setProperty("--r", R[0] + "px");
    r.setProperty("--r2", R[1] + "px");
    document.body.classList.toggle("noanim", !L.anim);
  }
  const setLook = (k, v) => {
    store.set("look", __spreadProps(__spreadValues({}, look()), { [k]: v }));
    applyLook();
    renderMain();
  };
  applyLook();
  const NAV_COOK = [["kq", "\u{1F468}\u200D\u{1F373}", "\u0427\u0435\u0440\u0433\u0430"], ["calc", "\u{1F4E6}", "\u0421\u043A\u043B\u0430\u0434"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["hall", "\u{1FA91}", "\u0417\u0430\u043B"]];
  const NAV_A = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["books", "\u{1F4C5}", "\u0411\u0440\u043E\u043D\u0456"], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430"], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438"], ["calc", "\u{1F4E6}", "\u0421\u043A\u043B\u0430\u0434"], ["team", "\u{1F465}", "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B"], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442."]];
  const NAV_W = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["books", "\u{1F4C5}", "\u0411\u0440\u043E\u043D\u0456"], ["closed", "\u{1F9FE}", "\u0427\u0435\u043A\u0438"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"]];
  const NAV_COUR = [["go", "\u{1F6F5}", "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438"]];
  const navList = () => isCour() ? NAV_COUR : isCook() ? NAV_COOK : isAdmin() ? NAV_A : NAV_W;
  const NAV = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F4DC}", "\u0417\u0430\u043A\u0440\u0438\u0442\u0456"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430", 1], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438", 1], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F", 1], ["calc", "\u{1F9EE}", "\u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A", 1], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442.", 1]];
  function renderNav() {
    var _a2, _b;
    const newCnt = S.events.filter((e) => e.k === "guest" && e.s === "new").length;
    const attNew = isAdmin() ? S.events.filter((e) => e.k === "att" && e.s === "new").length : 0;
    setHTML($("#nav"), `<div class="brand">${brandImg()}</div>` + navList().map(([v, ic, l]) => `<button data-n="${v}" class="${S.view === v ? "on" : ""}${!isCook() && ["calc", "menu", "settings", "stop", "kq"].includes(v) ? " more-i" : ""}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}${v === "team" && attNew ? `<span class="badge">${attNew}</span>` : ""}${v === "books" && S.bkNew ? `<span class="badge">${S.bkNew}</span>` : ""}</button>`).join("") + `<button class="feed-btn" data-a="feed"><span class="ic">\u{1F514}</span>\u0421\u0442\u0440\u0456\u0447\u043A\u0430${newCnt ? `<span class="badge">${newCnt}</span>` : ""}</button><button class="more-btn ${["calc", "menu", "settings", "stop", "kq"].includes(S.view) ? "on" : ""}" data-a="more"><span class="ic">\u22EF</span>\u0429\u0435</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="\u041D\u0430 \u0432\u0435\u0441\u044C \u0435\u043A\u0440\u0430\u043D"><span class="ic">\u26F6</span>\u0415\u043A\u0440\u0430\u043D</button><button class="me" data-a="zpMy" title="\u041C\u0456\u0439 \u043A\u0430\u0431\u0456\u043D\u0435\u0442"><i>${esc((((_a2 = S.me) == null ? void 0 : _a2.name) || "?").slice(0, 1).toUpperCase())}${onShift() ? '<em class="sh-dot"></em>' : ""}</i>${S.taskN ? `<span class="badge" title="\u0417\u0430\u0432\u0434\u0430\u043D\u044C \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456">${S.taskN}</span>` : ""}<b>${esc((_b = S.me) == null ? void 0 : _b.name)}</b><small>${isAdmin() ? "\u0430\u0434\u043C\u0456\u043D" : isCook() ? "\u043A\u0443\u0445\u0430\u0440" : isCour() ? "\u043A\u0443\u0440'\u0454\u0440" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"} \xB7 \u043A\u0430\u0431\u0456\u043D\u0435\u0442</small></button><button data-a="switch"><span class="ic">\u{1F512}</span>\u0412\u0438\u0439\u0442\u0438</button>`);
  }
  function render() {
    renderNav();
    renderFeed();
    if (["hall", "printer", "kq"].includes(S.view) || S.view === "settings" && S.setTab === "printer") renderMain();
    if (S.open) renderSheet();
  }
  setInterval(() => {
    var _a2;
    if ((_a2 = S.events) == null ? void 0 : _a2.some((e) => e.k === "call" && e.s === "new")) {
      renderFeed();
      if (S.view === "hall" && !S.open) renderMain();
    }
  }, 1e4);
  const GOST = { new: "\u{1F195} \u043D\u043E\u0432\u0435", acc: "\u2705 \u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E", cook: "\u{1F525} \u0433\u043E\u0442\u0443\u0454\u0442\u044C\u0441\u044F", ready: "\u{1F37D} \u0433\u043E\u0442\u043E\u0432\u043E", road: "\u{1F6F5} \u0432 \u0434\u043E\u0440\u043E\u0437\u0456", done: "\u{1F91D} \u0432\u0438\u0434\u0430\u043D\u043E", rej: "\u274C" };
  const fmtPh = (p) => p ? `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8, 10)} ${p.slice(10)}` : "";
  const BKS = { new: "\u{1F195} \u043D\u043E\u0432\u0430", ok: "\u2705 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E", no: "\u274C \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E", came: "\u{1FA91} \u043F\u0440\u0438\u0439\u0448\u043B\u0438", noshow: "\u{1F6AB} \u043D\u0435 \u043F\u0440\u0438\u0439\u0448\u043B\u0438", cancel: "\u21A9\uFE0F \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" };
  const addD = (d, n) => iso(Date.parse(d + "T12:00:00") + n * 864e5);
  async function loadView(silent) {
    try {
      if (S.view === "kq") await loadKq();
      if (S.view === "cash" && S.cashTab !== "checks") {
        S.data.shift = await api("shift");
        if (isAdmin()) S.data.cours = await api("courList").catch(() => null);
      }
      if (S.view === "closed" || S.view === "cash" && S.cashTab === "checks") {
        const r = await api("closed", { day: S.cday || "" });
        S.data.closed = r.list;
        S.data.cvoids = r.voids || [];
        S.data.cday = r.day;
        S.data.ctoday = r.today;
      }
      if (S.view === "reports") {
        if (!S.menu) await loadMenu();
        if (S.rep.tab === "plus") {
          const [from, to] = perRange(S.sk.p);
          S.data.skRep = await api("skReport", { from, to }, 3e4);
        } else await loadReport();
      }
      if (S.view === "go" && isCour()) await loadCour();
      if (S.view === "books") await loadBooks();
      if (S.view === "calc") await loadCalc();
      if (S.view === "team") {
        await loadPay();
        S.data.staff = await api("staff");
      }
      if (S.view === "settings") {
        S.data.staff = await api("staff");
        S.data.wifi = await api("wifi");
        S.data.gocfg = (await api("goCfg")).cfg;
        S.data.cours = await api("courList").catch(() => null);
        S.data.site = (await api("siteGet")).site;
        S.data.rates = await api("siteRates", { from: iso(Date.now() - 30 * 864e5), to: todayK() }).catch(() => null);
        if (!S.menu) await loadMenu();
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
    const html = (_b = (_a2 = { books: booksHTML, go: goHTML, kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, team: teamHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML })[v]) == null ? void 0 : _b.call(_a2);
    const fid = (_c = document.activeElement) == null ? void 0 : _c.id, keep = ["stopSearch", "rQ", "skQ", "skQ2", "skCq"].includes(fid);
    const sx = [...m.querySelectorAll(".zp-grid, .sk-tbl, .chips.scroll, .seg")].map((e) => e.scrollLeft);
    setHTML(m, html || "");
    m.querySelectorAll(".zp-grid, .sk-tbl, .chips.scroll, .seg").forEach((e, i) => {
      if (sx[i]) e.scrollLeft = sx[i];
    });
    if (keep) {
      const el = $("#" + fid);
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }
  addEventListener("resize", () => {
    if (S.view === "hall" && S.token) {
      $("#main")._h = "";
      renderMain();
    }
  });
  setInterval(() => {
    if (S.view === "kq") renderMain();
  }, 3e4);
  document.addEventListener("visibilitychange", async () => {
    var _a2;
    if (isCook() && document.visibilityState === "visible" && (!wakeLock || wakeLock.released)) try {
      wakeLock = await ((_a2 = navigator.wakeLock) == null ? void 0 : _a2.request("screen"));
    } catch (e) {
    }
  });
  const iso = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const PER = [["d", "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["y", "\u0412\u0447\u043E\u0440\u0430"], ["w", "7 \u0434\u043D\u0456\u0432"], ["30", "30 \u0434\u043D\u0456\u0432"], ["m", "\u0426\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"], ["pm", "\u041C\u0438\u043D. \u043C\u0456\u0441\u044F\u0446\u044C"], ["yr", "\u0420\u0456\u043A"], ["all", "\u0417\u0430 \u0432\u0435\u0441\u044C \u0447\u0430\u0441"], ["c", "\u0421\u0432\u0456\u0439 \u043F\u0435\u0440\u0456\u043E\u0434"]];
  const WHN = { k: "\u{1F373} \u041A\u0443\u0445\u043D\u044F", b: "\u{1F379} \u0411\u0430\u0440" };
  const r3 = (x) => Math.round((+x || 0) * 1e3) / 1e3;
  const fq = (q, u) => {
    q = r3(q);
    if ((u === "\u043A\u0433" || u === "\u043B") && q && Math.abs(q) < 1) return `${Math.round(q * 1e3)} ${u === "\u043A\u0433" ? "\u0433" : "\u043C\u043B"}`;
    return `${String(q).replace(".", ",")} ${u}`;
  };
  const totQ = (x) => {
    var _a2, _b;
    return r3((((_a2 = x.st) == null ? void 0 : _a2.k) || 0) + (((_b = x.st) == null ? void 0 : _b.b) || 0));
  };
  const nrm = (s) => String(s || "").toLowerCase().replace(/ё/g, "\u0435").replace(/[ʼ'’`"«»().,;:!?*_/\\+-]+/g, " ").replace(/\s+/g, " ").trim();
  const parseQ = (s, u) => {
    const m = String(s != null ? s : "").trim().replace(",", ".").match(/^(-?\d*\.?\d+)\s*(г|гр|мл|кг|л|шт)?\.?$/i);
    if (!m) return NaN;
    let v = +m[1];
    const su = (m[2] || "").toLowerCase();
    if ((su === "\u0433" || su === "\u0433\u0440") && u === "\u043A\u0433") v /= 1e3;
    if (su === "\u043C\u043B" && u === "\u043B") v /= 1e3;
    return r3(v);
  };
  const small = (u) => u === "\u043A\u0433" ? "\u0433" : u === "\u043B" ? "\u043C\u043B" : u;
  const SK_TABS = () => isCook() ? [["stock", "\u{1F4E6} \u0421\u043A\u043B\u0430\u0434"], ["inv", "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456"], ["prod", "\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438"], ["count", "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F"], ["tech", "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438"]] : [["stock", "\u{1F4E6} \u0417\u0430\u043B\u0438\u0448\u043A\u0438"], ["inv", "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456"], ["buy", "\u{1F6D2} \u0417\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044F"], ["cards", "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438"], ["prod", "\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438"], ["count", "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F"], ["rep", "\u{1F4CA} \u041F\u043B\u044E\u0441\u0438 / \u043C\u0456\u043D\u0443\u0441\u0438"], ["menu", "\u{1F4D6} \u041C\u0435\u043D\u044E"], ["stop", "\u26D4 \u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"]];
  S.sk = { tab: "stock", q: "", q2: "", cq: "", wh: "", cat: "", flt: "", cf: {}, cwh: "k", p: "w", draft: null, card: null };
  const skBusy = () => {
    var _a2, _b;
    return S.sk.draft || S.sk.card || ((_b = (_a2 = document.activeElement) == null ? void 0 : _a2.closest) == null ? void 0 : _b.call(_a2, "#main")) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  };
  const hhK = (t) => new Date(t).toLocaleTimeString("uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit" });
  const WDL = ["\u043D\u0434", "\u043F\u043D", "\u0432\u0442", "\u0441\u0440", "\u0447\u0442", "\u043F\u0442", "\u0441\u0431"];
  const curMon = () => {
    var _a2, _b;
    const d = new Date(Date.now() - ((_b = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b : 3) * 36e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const todayK = () => {
    var _a2, _b;
    return iso(Date.now() - ((_b = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b : 3) * 36e5);
  };
  const monAdd = (m, n) => {
    const [y, mo] = m.split("-").map(Number), d = new Date(y, mo - 1 + n, 15);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const MONN = ["\u0441\u0456\u0447\u0435\u043D\u044C", "\u043B\u044E\u0442\u0438\u0439", "\u0431\u0435\u0440\u0435\u0437\u0435\u043D\u044C", "\u043A\u0432\u0456\u0442\u0435\u043D\u044C", "\u0442\u0440\u0430\u0432\u0435\u043D\u044C", "\u0447\u0435\u0440\u0432\u0435\u043D\u044C", "\u043B\u0438\u043F\u0435\u043D\u044C", "\u0441\u0435\u0440\u043F\u0435\u043D\u044C", "\u0432\u0435\u0440\u0435\u0441\u0435\u043D\u044C", "\u0436\u043E\u0432\u0442\u0435\u043D\u044C", "\u043B\u0438\u0441\u0442\u043E\u043F\u0430\u0434", "\u0433\u0440\u0443\u0434\u0435\u043D\u044C"];
  const monName = (m) => `${MONN[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const onShift = () => S.myAtt && S.myAtt.in && !S.myAtt.out;
  const shiftBtns = () => {
    var _a2;
    return `${onShift() ? `<button class="btn sm red" data-a="zpOut">\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>` : `<button class="btn sm green" data-a="zpIn">\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>`}${((_a2 = S.myAtt) == null ? void 0 : _a2.ok) === 0 ? '<span class="zp-wait">\u{1F553} \u0447\u0435\u043A\u0430\u0454 \u2705</span>' : ""}<button class="btn sm" data-a="zpMy">\u{1F464} \u041A\u0430\u0431\u0456\u043D\u0435\u0442</button>`;
  };
  const attIc = (a, p, d) => (a == null ? void 0 : a.ok) === 1 ? a.late ? "\u23F0" : a.auto ? "\u26A0\uFE0F" : "\u2705" : (a == null ? void 0 : a.ok) === 0 ? "\u{1F553}" : (a == null ? void 0 : a.ok) === -1 ? "\u274C" : p && d < todayK() ? "\u{1F6AB}" : "";
  const hrs = (a) => (a == null ? void 0 : a.in) && (a == null ? void 0 : a.out) ? Math.round((a.out - a.in) / 36e5 * 10) / 10 : null;
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
        var _a2, _b;
        if (e.target === el) return modalResolve(null);
        const i = (_a2 = e.target.closest("[data-mi]")) == null ? void 0 : _a2.dataset.mi;
        if (i != null) return modalResolve(buttons[+i].val);
        const pk = (_b = e.target.closest("[data-mi-v]")) == null ? void 0 : _b.dataset.miV;
        if (pk != null) modalResolve(pk);
      });
      document.body.append(el);
      const fq2 = el.querySelector("[data-mi-quick]");
      if (fq2) fq2.onclick = () => {
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
  async function askVal(title, val = "", type = "text") {
    const v = await modal({ title, body: `<input id="askIn" type="${type}" value="${esc(val)}" ${type === "number" ? 'inputmode="decimal" step="0.1"' : ""}>`, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    setTimeout(() => {
      var _a2;
      return (_a2 = $("#askIn")) == null ? void 0 : _a2.focus();
    }, 50);
    const x = v === "ok" ? $("#askIn").value.trim() : null;
    closeModal();
    return x;
  }
  async function askLong(title, val = "") {
    const v = await modal({ title, body: `<textarea id="askIn" rows="7" style="width:100%">${esc(val)}</textarea>`, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const x = v === "ok" ? $("#askIn").value.trim() : null;
    closeModal();
    return x;
  }
  async function ask(title, ph = "", type = "text") {
    const v = await modal({ title, body: `<input id="askIn" type="${type}" placeholder="${esc(ph)}" ${type === "number" ? 'inputmode="decimal"' : ""}>`, buttons: [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const x = v === "ok" ? $("#askIn").value.trim() : null;
    closeModal();
    return x || null;
  }
  function pickTable(title, text, skip, withGo) {
    return new Promise((res) => {
      modalResolve = (v) => {
        closeModal();
        res(v);
      };
      const el = document.createElement("div");
      el.className = "modal-bg";
      el.id = "modal";
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${esc(text)}</p>${withGo ? '<div class="btnrow" style="margin-bottom:10px"><button class="btn" data-t="pick">\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437</button><button class="btn" data-t="del">\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430</button></div>' : ""}<div class="grid">${Array.from({ length: S.n }, (_, i) => i + 1).filter((n) => n !== skip).map((n) => `<button class="${S.tables[n] ? "busy" : ""}" data-t="${n}">${n}</button>`).join("")}</div><div class="btns"><button class="btn" data-x>\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div></div>`;
      el.addEventListener("click", (e) => {
        var _a2;
        if (e.target === el || e.target.closest("[data-x]")) return modalResolve(null);
        const t = (_a2 = e.target.closest("[data-t]")) == null ? void 0 : _a2.dataset.t;
        if (t) modalResolve(isNaN(+t) ? t : +t);
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
  document.addEventListener("change", async (e) => {
    var _a2, _b;
    const el = e.target;
    if (((_a2 = el.dataset) == null ? void 0 : _a2.a) !== "bkDate" || !el.value) return;
    S.bkDay = el.value;
    if (!((_b = S.data.bk) == null ? void 0 : _b.some((b) => b.date === el.value)) && (el.value < addD(todayK(), -7) || el.value > addD(todayK(), 60))) {
      const r = await api("bkList", { from: el.value, to: el.value, all: true }).catch(() => null);
      if (r) S.data.bk = [...S.data.bk.filter((b) => b.date !== el.value), ...r.list];
    }
    renderMain();
  });
  document.addEventListener("click", async (e) => {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
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
      case "fs": {
        const on = !document.fullscreenElement;
        store.set("fs", on);
        on ? (_b = (_a2 = document.documentElement).requestFullscreen) == null ? void 0 : _b.call(_a2).catch(() => {
        }) : (_c = document.exitFullscreen) == null ? void 0 : _c.call(document);
        break;
      }
      case "more": {
        const v = await choose("\u0429\u0435", "", (isCook() ? NAV_COOK : NAV.filter((n) => (!n[3] || isAdmin()) && ["stop", "kq", "menu", "calc", "settings"].includes(n[0]))).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: "\u{1F512} \u0412\u0438\u0439\u0442\u0438", val: "logout", cls: "red" }]));
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
        const n = await pickTable("\u041D\u043E\u0432e \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0456\u043B", 0, true);
        if (n === "pick" || n === "del") goNew(n);
        else if (n) {
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
      case "tw": {
        if (t === -1 || t > 1e3) {
          S.tw[t] = !S.tw[t];
          S.packAdj[t] = 0;
          renderSheet();
          break;
        }
        const k = await choose("\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E", "\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0434\u0435 \u043E\u043A\u0440\u0435\u043C\u0438\u043C \u0447\u0435\u043A\u043E\u043C; \u0441\u0442\u0456\u043B \u043D\u0435 \u0437\u0430\u0439\u043C\u0430\u0454\u0442\u044C\u0441\u044F", [{ label: "\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437", val: "pick", cls: "primary" }, { label: "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", val: "del", cls: "primary" }]);
        if (k) goNew(k, t);
        break;
      }
      case "ur":
        S.ur[t] = !S.ur[t];
        renderSheet();
        break;
      case "kItem": {
        const r = await act("kDone", { id: el.dataset.id, i: +el.dataset.i });
        if (r) loadKq();
        break;
      }
      case "kAll": {
        (_d = el.closest(".kc")) == null ? void 0 : _d.classList.add("bye");
        const r = await act("kDone", { id: el.dataset.id });
        if (r) setTimeout(loadKq, 250);
        break;
      }
      case "kStart": {
        await act("kStart", { id: el.dataset.id });
        loadKq();
        break;
      }
      case "kUndo": {
        await act("kUndo", { id: el.dataset.id }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0432 \u0447\u0435\u0440\u0433\u0443");
        loadKq();
        break;
      }
      case "kMsg": {
        let v = await choose("\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0437\u0430\u043B", "\u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438 \u043F\u043E\u0431\u0430\u0447\u0430\u0442\u044C \u0443 \u0441\u0442\u0440\u0456\u0447\u0446\u0456", ["\u2757 \u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443", "\u23F1 \u0429\u0435 +10 \u0445\u0432", "\u{1F64B} \u041F\u0456\u0434\u0456\u0439\u0434\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E", "\u{1F525} \u0412\u0436\u0435 \u043C\u0430\u0439\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u043E"].map((x) => ({ label: x, val: x })).concat([{ label: "\u270F\uFE0F \u0421\u0432\u043E\u0454\u2026", val: "own" }]));
        if (v === "own") v = await ask("\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0437\u0430\u043B", "\u041D\u0430\u043F\u0440.: \u0437\u0430\u043C\u0456\u043D\u0438\u043C\u043E \u0444\u0440\u0456 \u043D\u0430 \u043F\u044E\u0440\u0435?");
        if (v) await act("kMsg", { id: el.dataset.id, text: v }, "\u{1F4E8} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E");
        loadKq();
        break;
      }
      case "kFont":
        S.kFont = S.kFont % 3 + 1;
        store.set("kfont", S.kFont);
        renderMain();
        break;
      case "kGo":
        kitchenStart();
        break;
      case "kSnd":
        kSndPick();
        break;
      case "kSndTry":
        kPlay(el.dataset.k);
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
      case "rp":
        S.rep.p = el.dataset.p;
        loadView();
        break;
      case "rTab":
        S.rep.tab = el.dataset.t;
        ((_e = S.rep).last || (_e.last = {}))[SECS.find((x) => x[2].includes(el.dataset.t))[0]] = el.dataset.t;
        renderMain();
        break;
      case "rSec": {
        const sc = SECS.find((x) => x[0] === el.dataset.s);
        S.rep.tab = (S.rep.last || {})[sc[0]] || sc[2][0];
        renderMain();
        if (S.rep.tab === "plus" || !S.data.range) loadView();
        break;
      }
      case "rFo":
        S.rep.fo = !S.rep.fo;
        renderMain();
        break;
      case "rDay":
        if (matchMedia("(hover: none)").matches && !el.classList.contains("on")) {
          el.parentNode.querySelectorAll(".c.on").forEach((x) => x.classList.remove("on"));
          el.classList.add("on");
          el.parentNode.previousElementSibling.textContent = el.title + " \xB7 \u0449\u0435 \u0440\u0430\u0437 \u2014 \u0437\u0432\u0456\u0442 \u0437\u0430 \u0434\u0435\u043D\u044C";
          break;
        }
        Object.assign(S.rep, { p: "c", from: el.dataset.d, to: el.dataset.d });
        loadView();
        $("#main").scrollTop = 0;
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
      case "goNew":
        goNew();
        break;
      case "books":
        S.view = "books";
        renderNav();
        renderMain();
        loadView();
        break;
      case "bkDay":
        S.bkDay = el.dataset.d;
        renderMain();
        break;
      case "bkAll":
        S.bkAll = !!el.dataset.v;
        renderMain();
        break;
      case "bkNew":
        bkForm();
        break;
      case "bkEd":
        bkForm(S.data.bk.find((x) => x.id === el.dataset.id));
        break;
      case "bkCame": {
        const b = S.data.bk.find((x) => x.id === el.dataset.id);
        let tt = b.t;
        if (!tt) {
          tt = await pickTable(`\u{1FA91} ${b.name}: \u0437\u0430 \u044F\u043A\u0438\u0439 \u0441\u0442\u0456\u043B?`, "\u0411\u0440\u043E\u043D\u044C \u0437\u0430\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u044F\u043A \xAB\u043F\u0440\u0438\u0439\u0448\u043B\u0438\xBB");
          if (!tt) break;
        }
        if (await act("bkSet", { id: b.id, st: "came", t: tt }, "\u{1FA91} \u0413\u043E\u0441\u0442\u0456 \u043F\u0440\u0438\u0439\u0448\u043B\u0438")) {
          await loadBooks();
          loadState().catch(() => {
          });
          if (((_f = b.pre) == null ? void 0 : _f.length) && !b.preSent && await confirmBox("\u{1F37D} \u041F\u0435\u0440\u0435\u0434\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \u0437\u0430\u0440\u0430\u0437?")) await act("bkSet", { id: b.id, st: "kit" }, "\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u0456");
          S.view = "hall";
          renderNav();
          renderMain();
          openTable(tt);
        }
        break;
      }
      case "bkSet": {
        if (el.dataset.s === "cancel" && !await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0431\u0440\u043E\u043D\u044C?")) break;
        if (await act("bkSet", { id: el.dataset.id, st: el.dataset.s }, BKS[el.dataset.s] || "\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u044E")) {
          loadState().catch(() => {
          });
          if (S.view === "books") {
            await loadBooks();
            renderMain();
          }
        }
        break;
      }
      case "bkTbl": {
        const n = await pickTable("\u{1FA91} \u0421\u0442\u0456\u043B \u0434\u043B\u044F \u0431\u0440\u043E\u043D\u0456", "\u041F\u043B\u0438\u0442\u043A\u0430 \u0441\u0442\u043E\u043B\u0430 \u043F\u043E\u043A\u0430\u0436\u0435 \u0447\u0430\u0441 \u0431\u0440\u043E\u043D\u0456");
        if (n && await act("bkEdit", { id: el.dataset.id, f: { t: n } }, "\u{1FA91} \u0421\u0442\u0456\u043B \u043F\u0440\u0438\u0437\u043D\u0430\u0447\u0435\u043D\u043E")) {
          loadState().catch(() => {
          });
          await loadBooks();
          renderMain();
        }
        break;
      }
      case "certPay":
        if (await act("certPay", { code: el.dataset.c, how: el.dataset.h }, el.dataset.h === "no" ? "\u274C \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" : "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E")) loadState().catch(() => {
        });
        break;
      case "certDel": {
        const code = el.dataset.c;
        if (!await choose("\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442?", code + " \u2014 \u043A\u043E\u0434 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435 \u0434\u0456\u044F\u0442\u0438. \u0426\u0435 \u043D\u0435 \u043C\u043E\u0436\u043D\u0430 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438.", [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438", val: 1, cls: "red" }, { label: "\u041D\u0456", val: 0 }])) break;
        if (await act("certDel", { code }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) {
          (_g = el.closest(".kv")) == null ? void 0 : _g.remove();
        }
        break;
      }
      case "certT":
        certT(t);
        break;
      case "bonCert": {
        const v = await choose("\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \xB7 \u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442", ((_h = S.tables[t]) == null ? void 0 : _h.cli) ? "\u0413\u0456\u0441\u0442\u044C \u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C \u0443\u0436\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u0438\u0439" : "\u0429\u043E \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u0442\u0438 \u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0443?", [{ label: ((_i = S.tables[t]) == null ? void 0 : _i.cli) ? "\u{1F381} \u0413\u0456\u0441\u0442\u044C \u0456 \u0431\u043E\u043D\u0443\u0441\u0438" : "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \u0433\u043E\u0441\u0442\u044F (\u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C)", val: "cli", cls: "primary" }, { label: "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 (\u043A\u043E\u0434)", val: "cert" }, { label: "\u{1F382} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u043D\u0430 \u0414\u041D", val: "bd" }]);
        if (v === "cli") cliT(t);
        else if (v === "cert") certT(t);
        else if (v === "bd") bdGiftT(t);
        break;
      }
      case "certs": {
        const r = await api("certList").catch(() => null);
        if (!r) break;
        await modal({ title: "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", body: `<div class="bk-list">${r.list.map((c) => `<div class="kv"><span><b>${c.code}</b> \xB7 ${money(c.sum)}${c.left !== c.sum ? ` \xB7 \u0437\u0430\u043B\u0438\u0448\u043E\u043A ${money(c.left)}` : ""}<br><small class="muted">\u0432\u0456\u0434 ${esc(c.from)}${c.to ? " \u0434\u043B\u044F " + esc(c.to) : ""} \xB7 ${fmtPh(c.phone)} \xB7 ${{ new: "\u23F3 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E", ok: "\u2705 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0439", no: "\u274C \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" }[c.st]}</small></span>${c.st === "new" ? `<span class="kv-r"><button class="btn sm green" data-a="certPay" data-c="${c.code}" data-h="cash">\u{1F4B5}</button><button class="btn sm" data-a="certPay" data-c="${c.code}" data-h="card">\u{1F4B3}</button><button class="btn sm red" data-a="certDel" data-c="${c.code}">\u{1F5D1}</button></span>` : `<span class="kv-r"><button class="btn sm red" data-a="certDel" data-c="${c.code}">\u{1F5D1}</button></span>`}</div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
        break;
      }
      case "siteSet": {
        const k = el.dataset.k, cur = (_j = S.data.site) == null ? void 0 : _j[k];
        const v = ["about", "banquet", "hookah"].includes(k) ? await askLong(el.dataset.l || k, String(cur != null ? cur : "")) : await askVal(el.dataset.l || k, String(cur != null ? cur : ""), ["rating", "ratingN"].includes(k) ? "number" : "text");
        if (v == null) break;
        const r = await act("siteSet", { k, v }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u2014 \u0443\u0436\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456");
        if (r) {
          S.data.site = r.site;
          if (k === "name") {
            S.brand = __spreadProps(__spreadValues({}, S.brand), { name: r.site.name });
            store.set("brand", S.brand);
            applyBrand();
          }
          renderMain();
        }
        break;
      }
      case "siteTgl": {
        const k = el.dataset.k, r = await act("siteSet", { k, v: S.data.site[k] ? 0 : 1 }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
        if (r) {
          S.data.site = r.site;
          renderMain();
        }
        break;
      }
      case "copyLink":
        try {
          await navigator.clipboard.writeText(el.dataset.u);
          toast("\u{1F517} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E");
        } catch (e2) {
          prompt("\u0421\u043A\u043E\u043F\u0456\u044E\u0439\u0442\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F:", el.dataset.u);
        }
        break;
      case "siteDel": {
        const r = await act("siteSet", { k: el.dataset.k, v: el.dataset.v }, "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
        if (r) {
          S.data.site = r.site;
          if (el.dataset.k === "logo") {
            S.brand = __spreadProps(__spreadValues({}, S.brand), { logo: "" });
            store.set("brand", S.brand);
            applyBrand();
          }
          renderMain();
        }
        break;
      }
      case "sitePromo": {
        const tt = await ask("\u{1F389} \u041D\u0430\u0437\u0432\u0430 \u0430\u043A\u0446\u0456\u0457", "\u0429\u0430\u0441\u043B\u0438\u0432\u0456 \u0433\u043E\u0434\u0438\u043D\u0438 15\u201317");
        if (!tt) break;
        const d = await ask("\u041E\u043F\u0438\u0441 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)", "\u221220% \u043D\u0430 \u043A\u043E\u043A\u0442\u0435\u0439\u043B\u0456");
        const r = await act("siteSet", { k: "promoAdd", v: { t: tt, d: d || "" } }, "\u{1F389} \u0414\u043E\u0434\u0430\u043D\u043E");
        if (r) {
          S.data.site = r.site;
          renderMain();
        }
        break;
      }
      case "siteQuote": {
        const tt = await ask("\u{1F4AC} \u0422\u0435\u043A\u0441\u0442 \u0432\u0456\u0434\u0433\u0443\u043A\u0443");
        if (!tt) break;
        const a2 = await ask("\u0410\u0432\u0442\u043E\u0440", "\u041E\u043B\u0435\u043D\u0430, Google");
        const r = await act("siteSet", { k: "quoteAdd", v: { t: tt, a: a2 || "" } }, "\u{1F4AC} \u0414\u043E\u0434\u0430\u043D\u043E");
        if (r) {
          S.data.site = r.site;
          renderMain();
        }
        break;
      }
      case "siteImg":
        siteImg(el.dataset.h, el.dataset.l);
        break;
      case "siteHits": {
        const sel = new Set(S.data.site.hits);
        const v = await modal({ title: "\u{1F37D} \u0425\u0456\u0442\u0438 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456", text: "\u0414\u043E 12 \u0441\u0442\u0440\u0430\u0432; \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E", body: `<div class="bk-list">${itemsAll().filter((i) => !i.hidden).map((i) => `<label class="kv"><span>${esc(i.name.uk)}${i.img ? " \u{1F4F7}" : ""}</span><input type="checkbox" class="hitC" value="${i.id}" ${sel.has(i.id) ? "checked" : ""} style="width:22px;height:22px"></label>`).join("")}</div>`, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const ids = [...document.querySelectorAll(".hitC:checked")].map((x) => x.value).slice(0, 12);
        closeModal();
        if (v !== "ok") break;
        const r = await act("siteSet", { k: "hits", v: ids }, "\u{1F37D} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
        if (r) {
          S.data.site = r.site;
          renderMain();
        }
        break;
      }
      case "siteCopy": {
        const u = "https://666blackmuxa666.github.io/VARVAR/about.html";
        try {
          await navigator.clipboard.writeText(u);
          toast("\u{1F4CB} " + u);
        } catch (e2) {
          await ask("\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F", u);
        }
        break;
      }
      case "goSt":
        if (await act("goSt", { t, st: el.dataset.s }, "\u2714 " + GOST[el.dataset.s])) loadState().catch(() => {
        });
        break;
      case "goDone":
        goDone(t);
        break;
      case "goDoneT":
        goDone(+el.dataset.t);
        break;
      case "crGive": {
        const v = await askVal(`\u{1F4B5} \u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E \u0432\u0456\u0434 ${el.dataset.n}?`, el.dataset.v, "number");
        if (!v) break;
        if (await act("courCash", { n: el.dataset.n, sum: +v }, "\u2705 \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E")) loadView();
        break;
      }
      case "crTab":
        S.courTab = el.dataset.t;
        renderMain();
        break;
      case "crAct": {
        const x = el.dataset.x;
        if (await act("courAct", { t: +el.dataset.t, act: x, arg: el.dataset.v }, { take: "\u270B \u0412\u0430\u0448\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430", road: "\u{1F6F5} \u0412 \u0434\u043E\u0440\u043E\u0437\u0456", eta: "\u23F1 \u0413\u043E\u0441\u0442\u044E \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E", km: "\u{1F4AC} \u041A\u0443\u0445\u043D\u0456 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E" }[x])) {
          if (x === "take") S.courTab = "mine";
          await loadState().catch(() => {
          });
          await loadCour().catch(() => {
          });
        }
        break;
      }
      case "crDone": {
        const tt = +el.dataset.t, b = S.tables[tt];
        const pay = ((_k = b == null ? void 0 : b.go) == null ? void 0 : _k.paid) ? "card" : await choose(`\u{1F91D} ${tn(tt)} \u0432\u0438\u0434\u0430\u043D\u043E`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${b.go.change ? ` \xB7 \u0440\u0435\u0448\u0442\u0430 \u0437 ${b.go.change}` : ""}`, [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", val: "cash", cls: "green" }, { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430", val: "card", cls: "blue" }]);
        if (!pay) break;
        if (await act("courAct", { t: tt, act: "done", arg: pay }, "\u2705 \u0412\u0438\u0434\u0430\u043D\u043E")) {
          await loadState().catch(() => {
          });
          await loadCour().catch(() => {
          });
        }
        break;
      }
      case "crProb": {
        const v = await choose("\u26A0\uFE0F \u0429\u043E \u0441\u0442\u0430\u043B\u043E\u0441\u044C?", "\u0410\u0434\u043C\u0456\u043D \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F", [{ label: "\u{1F4F5} \u0413\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454", val: "noans" }, { label: "\u{1F4CD} \u041D\u0435\u0432\u0456\u0440\u043D\u0430 \u0430\u0434\u0440\u0435\u0441\u0430", val: "addr" }, { label: "\u{1F645} \u0413\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u043C\u043E\u0432\u0438\u0432\u0441\u044F", val: "refuse", cls: "red" }, { label: "\u270F\uFE0F \u0406\u043D\u0448\u0435\u2026", val: "own" }]);
        if (!v) break;
        const arg = v === "own" ? await ask("\u26A0\uFE0F \u041E\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443") : v;
        if (arg && await act("courAct", { t: +el.dataset.t, act: "prob", arg }, "\u26A0\uFE0F \u0410\u0434\u043C\u0456\u043D\u0430 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043E")) loadState().catch(() => {
        });
        break;
      }
      case "crTg": {
        const r = await act("courTg");
        if (r == null ? void 0 : r.url) {
          window.open(r.url, "_blank");
          toast("\u2708\uFE0F \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xABStart\xBB \u0443 \u0431\u043E\u0442\u0456");
          setTimeout(() => loadCour().catch(() => {
          }), 15e3);
        }
        break;
      }
      case "goTake":
        if (await act("goCour", { t: +el.dataset.t }, "\u270B \u0412\u0430\u0448\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430")) {
          await loadState().catch(() => {
          });
          renderMain();
        }
        break;
      case "goRoad":
        if (await act("goSt", { t: +el.dataset.t, st: "road" }, "\u{1F6F5} \u0412 \u0434\u043E\u0440\u043E\u0437\u0456")) {
          await loadState().catch(() => {
          });
          renderMain();
        }
        break;
      case "goCourSet": {
        const n = await ask("\u{1F464} \u041A\u0443\u0440'\u0454\u0440 (\u0456\u043C\u02BC\u044F)", ((_m = (_l = S.tables[t]) == null ? void 0 : _l.go) == null ? void 0 : _m.cour) || "");
        if (n != null && await act("goCour", { t, n }, "\u2714")) loadState().catch(() => {
        });
        break;
      }
      case "cliT":
        cliT(t);
        break;
      case "cliBon0": {
        const b = S.tables[t];
        if (b == null ? void 0 : b.cert) {
          if (!await confirmBox(b.cert.code && b.bonus > b.cert.sum ? "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0456 \u0431\u043E\u043D\u0443\u0441\u0438 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443?" : "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443?")) break;
          if (!await act("certOff", { t }, "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E")) break;
          if (b.bonus > b.cert.sum && b.cli) await act("cliBonus", { t, sum: 0 });
        } else if (!await act("cliBonus", { t, sum: 0 })) break;
        loadState().catch(() => {
        });
        break;
      }
      case "goCfg": {
        const k = el.dataset.k, cur = (_n = S.data.gocfg) == null ? void 0 : _n[k];
        const v = ["on", "del", "pick"].includes(k) ? cur ? 0 : 1 : await ask(el.dataset.l || k, String(cur != null ? cur : ""), ["phone", "zone", "from", "to"].includes(k) ? "text" : "number");
        if (v == null) break;
        const r = await act("goCfgSet", { k, v }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
        if (r) {
          S.data.gocfg = r.cfg;
          renderMain();
        }
        break;
      }
      case "goLink": {
        const u = "https://666blackmuxa666.github.io/VARVAR/?go" + (el.dataset.src ? "&src=" + el.dataset.src : "");
        try {
          await navigator.clipboard.writeText(u);
          toast("\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E: " + u);
        } catch (e2) {
          await ask("\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F", u);
        }
        break;
      }
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
        const v = await choose(`\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u2014 \u0441\u0442\u0456\u043B ${tn(t)}`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}`, [...[5, 10, 15].map((p) => ({ label: `${p}% \xB7 ${money(Math.round(b.pay2 * p / 100))}`, val: String(Math.round(b.pay2 * p / 100)) })), { label: "\u270F\uFE0F \u0421\u0432\u043E\u044F \u0441\u0443\u043C\u0430", val: "own" }, ...b.tip ? [{ label: "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0447\u0430\u0439\u043E\u0432\u0456", val: "0", cls: "red" }] : []]);
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
      case "rDel":
      case "rBack": {
        const k = el.dataset.k, d = el.dataset.d, i = el.dataset.i, del = a === "rDel";
        if (del && !await confirmBox(k === "checks" ? "\u0417\u043D\u044F\u0442\u0438 \u0447\u0435\u043A \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438? (\u043C\u043E\u0436\u043D\u0430 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438)" : "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437\u0430\u043F\u0438\u0441? (\u043C\u043E\u0436\u043D\u0430 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438)")) break;
        const op = { checks: del ? "closedDel" : "closedBack", exp: del ? "expenseDel" : "expenseBack", mov: del ? "moveDel" : "moveBack", z: del ? "zDel" : "zBack" }[k];
        if (await act(op, k === "checks" ? { ref: i, day: d } : { i: +i, day: d }, del ? "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E")) {
          S.data.rangeKey = "";
          loadView();
        }
        break;
      }
      case "vBack":
        if (await confirmBox("\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u043D\u0430 \u0441\u0442\u0456\u043B? \u0412\u043E\u043D\u0430 \u0437\u043D\u043E\u0432\u0443 \u0431\u0443\u0434\u0435 \u0432 \u0440\u0430\u0445\u0443\u043D\u043A\u0443.")) {
          if (await act("voidBack", { ts: +el.dataset.ts }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u043D\u0430 \u0441\u0442\u0456\u043B")) loadView();
        }
        break;
      case "setTab":
        S.setTab = el.dataset.s;
        renderMain();
        break;
      case "look": {
        const k = el.dataset.k, v = ["size", "vol", "anim"].includes(k) ? +el.dataset.v : el.dataset.v;
        setLook(k, v);
        if (k === "sound" || k === "vol") ding();
        break;
      }
      case "lookReset":
        store.set("look", {});
        applyLook();
        renderMain();
        toast("\u21BA \u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0438\u0439 \u0432\u0438\u0433\u043B\u044F\u0434");
        break;
      case "cashTab":
        S.cashTab = el.dataset.t;
        renderMain();
        loadView();
        break;
      case "move":
        moveFlow();
        break;
      case "split":
        splitFlow();
        break;
      case "spq": {
        const i = +el.dataset.i, it = S.spl.items[i];
        S.spl.q[i] = Math.max(0, Math.min(it.q, (S.spl.q[i] || 0) + +el.dataset.d));
        splitRender();
        break;
      }
      case "closeT":
        closeFlow();
        break;
      case "delTable": {
        const reason = await voidReason(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0435\u0441\u044C \u0441\u0442\u0456\u043B ${tn(t)}? \u0421\u0443\u043C\u0430 \u041D\u0415 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443`);
        if (reason) {
          const r = await act("delete", { t, reason }, `\u{1F5D1} \u0421\u0442\u0456\u043B ${tn(t)} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E`);
          if (r) closeSheet();
        }
        break;
      }
      case "accept":
        act("accept", { oid: el.dataset.oid }, "\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0442\u043E \u2014 \u043F\u0456\u0448\u043B\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E");
        break;
      case "reject":
        if (await confirmBox("\u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F?", "\u041F\u043E\u0437\u0438\u0446\u0456\u0457 \u043F\u0440\u0438\u0431\u0435\u0440\u0443\u0442\u044C\u0441\u044F \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443, \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \u043D\u0435 \u043F\u0456\u0434\u0435, \u0433\u0456\u0441\u0442\u044C \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \xAB\u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E\xBB")) {
          await act("reject", { oid: el.dataset.oid }, "\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E");
          loadState().catch(() => {
          });
        }
        break;
      case "cBack":
        if (await confirmBox("\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0447\u0430\u0439\u043E\u0432\u0456 \u0437\u043D\u043E\u0432\u0443 \u0437\u0430\u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F")) {
          await act("closedBack", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443");
          loadView();
        }
        break;
      case "cReopen":
        if (await confirmBox("\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443?", "\u0412\u0456\u043D \u0437\u043D\u0456\u043C\u0435\u0442\u044C\u0441\u044F \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0439 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B \u2014 \u0432\u0438\u043F\u0440\u0430\u0432\u0438\u0442\u0435 \u0439 \u0437\u0430\u043A\u0440\u0438\u0454\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E")) {
          const r = await act("closedReopen", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u0420\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456");
          loadView();
          loadState().catch(() => {
          });
          if (r == null ? void 0 : r.x) openTable(r.x.t);
        }
        break;
      case "tBack":
        if (await confirmBox("\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u0438\u0439 \u0441\u0442\u0456\u043B?", "\u0421\u0442\u0440\u0430\u0432\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B")) {
          const r = await act("tableBack", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u0421\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
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
      case "cEdit":
        cEdit(el.dataset.ref, el.dataset.d || void 0);
        break;
      case "cPrint":
        act("closedPrint", { ref: el.dataset.ref, day: S.data.cday }, "\u{1F5A8} \u0427\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "cDay": {
        const v = +el.dataset.v, base = S.data.cday || S.data.ctoday;
        if (!v || !base) S.cday = "";
        else {
          const d = /* @__PURE__ */ new Date(base + "T12:00:00Z");
          d.setUTCDate(d.getUTCDate() + v);
          const k = d.toISOString().slice(0, 10);
          S.cday = k >= S.data.ctoday ? "" : k;
        }
        S.data.closed = null;
        renderMain();
        loadView();
        break;
      }
      case "cDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u043D\u0456\u043C\u0443\u0442\u044C\u0441\u044F \u0437\u0456 \u0437\u0432\u0456\u0442\u0456\u0432")) await act("closedDel", { ref: el.dataset.ref, day: S.data.cday }, "\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438");
        loadView();
        break;
      case "stopOff":
        S.stopOff = !S.stopOff;
        renderMain();
        break;
      case "stopT":
        await act("stop", { id: el.dataset.id, hidden: el.dataset.h === "1" });
        break;
      case "pTest":
        act("printTest", {}, "\u{1F5A8} \u0422\u0435\u0441\u0442 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "pQClear":
        if (await confirmBox("\u{1F5D1} \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0441\u044E \u0447\u0435\u0440\u0433\u0443 \u0434\u0440\u0443\u043A\u0443?", "\u0427\u0435\u043A\u0438 \u0439 \u043A\u0443\u0445\u043E\u043D\u043D\u0456 \u043A\u0432\u0438\u0442\u043A\u0438, \u044F\u043A\u0456 \u0449\u0435 \u043D\u0435 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u043B\u0438\u0441\u044C, \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u2014 \u043F\u0440\u0438\u043D\u0442\u0435\u0440 \u0457\u0445 \u043D\u0435 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0454.")) {
          const r = await act("printClear", {});
          if (r) {
            toast(`\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E: ${r.n}`);
            loadState().catch(() => {
            });
          }
        }
        break;
      case "pQList": {
        const r = await act("printQ", {});
        if (!r) break;
        const K = { kitchen: "\u{1F468}\u200D\u{1F373}", receipt: "\u{1F9FE}", test: "\u{1F9EA}", z: "\u{1F4CA}", qr: "\u{1F533}" };
        modal({ title: `\u{1F5A8} \u0427\u0435\u0440\u0433\u0430 \u0434\u0440\u0443\u043A\u0443 (${r.list.length})`, body: `<div class="muted set-note">\u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u0434\u0440\u0443\u043A\u0443\u0454 \u043F\u043E \u0447\u0435\u0440\u0437\u0456. \u042F\u043A\u0449\u043E \u0449\u043E\u0441\u044C \u0437\u0430\u0441\u0442\u0440\u044F\u0433\u043B\u043E \u0430\u0431\u043E \u0432\u0436\u0435 \u043D\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0435 \u2014 \u{1F5D1} (\u0434\u0432\u0456\u0447\u0456).</div>${r.list.map((j) => `<div class="kv" data-pq="${j.id}"><span style="min-width:0;overflow-wrap:anywhere">${K[j.kind] || "\u{1F5A8}"} ${esc(j.txt || j.kind)}<br><small class="muted">${j.at ? hhmm(j.at) : ""}</small></span><span class="kv-r"><button class="btn sm red" data-a="pQDel" data-id="${j.id}">\u{1F5D1}</button></span></div>`).join("") || '<div class="muted">\u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>'}`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] }).then(() => loadState().catch(() => {
        }));
        break;
      }
      case "pQDel": {
        if (!el.dataset.sure) {
          el.dataset.sure = 1;
          el.textContent = "\u{1F5D1} \u0422\u043E\u0447\u043D\u043E?";
          setTimeout(() => {
            if (el.isConnected) {
              delete el.dataset.sure;
              el.textContent = "\u{1F5D1}";
            }
          }, 3e3);
          break;
        }
        if (await act("printClear", { id: el.dataset.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) (_o = el.closest("[data-pq]")) == null ? void 0 : _o.remove();
        break;
      }
      case "pQr": {
        const n = await pickTable("QR \u043C\u0435\u043D\u044E", "\u0423 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0442\u043E\u043B\u0443 \u0441\u0432\u0456\u0439 QR \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430 \u0446\u0435\u0439 \u0441\u0442\u0456\u043B");
        if (n) act("printQr", { t: n }, `\u{1F5A8} QR \u0441\u0442\u043E\u043B\u0443 ${tn(n)}`);
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
        const v = await modal({ title: "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430", body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="\u0421\u0443\u043C\u0430, \u20B4"><input id="eNote" placeholder="\u041D\u0430 \u0449\u043E (\u043D\u0430\u043F\u0440. \u043E\u0432\u043E\u0447\u0456 \u043D\u0430 \u0440\u0438\u043D\u043A\u0443)">' + (isAdmin() ? `<label class="muted" style="font-size:13px">\u{1F4C5} \u0417\u0430 \u0434\u0435\u043D\u044C<input id="eDay" type="date" value="${todayK()}" max="${todayK()}"></label>` : "") + "</div>", buttons: [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438", val: "cash", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u0438", val: "card" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const sum = v && +$("#eSum").value.replace(",", "."), note = v && $("#eNote").value, day = v && ((_p = $("#eDay")) == null ? void 0 : _p.value) !== todayK() ? ((_q = $("#eDay")) == null ? void 0 : _q.value) || "" : "";
        closeModal();
        if (v && sum) {
          await act("expense", __spreadValues({ sum, note, src: v }, day ? { day } : {}), day ? `\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0437\u0430 ${day.split("-").reverse().join(".")}` : "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
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
      case "phPanel":
        phPanel();
        break;
      case "qrPanel":
        qrPanel();
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
        const v = await modal({ title: "\u2795 \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A", body: '<div class="form"><input id="sName" placeholder="\u0406\u043C\u02BC\u044F"><input id="sPin" inputmode="numeric" maxlength="4" placeholder="PIN \u2014 4 \u0446\u0438\u0444\u0440\u0438"></div>', buttons: [{ label: "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", val: "waiter", cls: "primary" }, { label: "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", val: "admin" }, { label: "\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u0430\u0440", val: "cook" }, { label: "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440", val: "courier" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
        const name = v && $("#sName").value, p = v && $("#sPin").value;
        closeModal();
        if (v) {
          await act("staffAdd", { name, pin: p, role: v }, "\u{1F465} \u0414\u043E\u0434\u0430\u043D\u043E");
          loadView();
        }
        break;
      }
      case "cfgTgl": {
        const k = el.dataset.k, cur = (_v = (_u = (_s = (_r = S.data.staff) == null ? void 0 : _r.cfg) == null ? void 0 : _s[k]) != null ? _u : (_t = S.cfg) == null ? void 0 : _t[k]) != null ? _v : +(el.dataset.def || 0);
        if (await act("cfgSet", { k, v: cur ? 0 : 1 }, "\u2699\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) {
          loadView();
          loadState().catch(() => {
          });
        }
        break;
      }
      case "cfg": {
        const k = el.dataset.k, L = { tables: ["\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0441\u0442\u043E\u043B\u0456\u0432 \u0443 \u0437\u0430\u043B\u0456", "\u0432\u0456\u0434 1 \u0434\u043E 200"], discMax: ["\u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430, %", "\u0432\u0456\u0434 0 \u0434\u043E 100"], scanMin: ["\u0425\u0432\u0438\u043B\u0438\u043D \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", "\u0432\u0456\u0434 10 \u0434\u043E 600"], foodCost: ["\u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442, %", "\u0432\u0456\u0434 5 \u0434\u043E 90"], priceAlert: ["\u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434, %", "\u0432\u0456\u0434 1 \u0434\u043E 100"], lateMin: ["\u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u2014 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0456\u043B\u044C\u043A\u043E\u0445 \u0445\u0432\u0438\u043B\u0438\u043D", "\u0432\u0456\u0434 0 \u0434\u043E 120"], lateFine: ["\u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F, \u20B4", "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443"], dayH: ["\u041E \u043A\u043E\u0442\u0440\u0456\u0439 \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F \u0440\u043E\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C (\u0433\u043E\u0434\u0438\u043D\u0430)", "\u0432\u0456\u0434 0 \u0434\u043E 8, \u043D\u0430\u043F\u0440. 3"] }[k];
        const v = await ask(L[0], L[1], "number");
        if (v != null && v !== "") {
          await act("cfgSet", { k, v: +v }, "\u2699\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
          loadView();
          loadState().catch(() => {
          });
        }
        break;
      }
      case "kpct": {
        const v = await ask("\u0427\u0430\u0441\u0442\u043A\u0430 \u043A\u0443\u0445\u043D\u0456 \u0432\u0456\u0434 \u0447\u0430\u0439\u043E\u0432\u0438\u0445, %", "\u041D\u0430\u043F\u0440. 20", "number");
        if (v != null) {
          await act("kitchenPct", { pct: +v }, "\u{1F468}\u200D\u{1F373} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
          loadView();
        }
        break;
      }
      case "regSet": {
        const v = await ask(`\u041D\u043E\u0432\u0438\u0439 \u043A\u043E\u0434 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 (${{ admin: "\u0430\u0434\u043C\u0456\u043D", cook: "\u043A\u0443\u0445\u0430\u0440", courier: "\u043A\u0443\u0440'\u0454\u0440" }[el.dataset.r] || "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"})`, "4 \u0446\u0438\u0444\u0440\u0438", "number");
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
  document.addEventListener("input", (e) => {
    var _a2, _b, _c;
    const t = e.target, K = S.sk, d = t.dataset || {};
    if (t.id === "skQ") {
      K.q = t.value;
      renderMain();
    }
    if (t.id === "skQ2") {
      K.q2 = t.value;
      renderMain();
    }
    if (t.id === "skCq") {
      K.cq = t.value;
      renderMain();
    }
    if (d.cf) skCfInput(d.cf, t.value);
    if (d.dh && K.draft) K.draft[d.dh] = t.value;
    if (d.dl != null && K.draft && t.tagName === "INPUT") {
      const l = K.draft.lines[+d.dl];
      if (l) {
        l[d.k] = t.value.replace(",", ".");
        skDraftUpd(+d.dl);
      }
    }
    if (d.cl != null && K.card && t.tagName === "INPUT") {
      const i = +d.cl, l = K.card.items[i];
      if (!l) return;
      const x = S.data.sk.ing.find((y) => y.id === l.id), u = (x == null ? void 0 : x.u) || ((_a2 = l.add) == null ? void 0 : _a2.u) || "\u043A\u0433", k = u === "\u0448\u0442" ? 1 : 1e3, v = +t.value.replace(",", ".") || 0, lo = () => {
        var _a3, _b2;
        return +((_b2 = (_a3 = l.loss) != null ? _a3 : x == null ? void 0 : x.loss) != null ? _b2 : 0);
      };
      if (d.k === "q") {
        l.q = r3(v / k);
        const n = $("#cln" + i);
        if (n) n.value = l.q ? r3(l.q * (1 - lo() / 100) * k) : "";
      }
      if (d.k === "loss") {
        l.loss = Math.max(0, Math.min(90, v));
        const n = $("#cln" + i);
        if (n) n.value = l.q ? r3(l.q * (1 - l.loss / 100) * k) : "";
      }
      if (d.k === "cost" && x && !x.semi) {
        ((_b = K.card).costCh || (_b.costCh = {}))[x.id] = v;
        x.cost = v;
        K.card.items.forEach((o, j) => {
          if (j !== i && o.id === x.id) {
            const e2 = document.querySelector(`[data-cl="${j}"][data-k="cost"]`);
            if (e2) e2.value = t.value;
          }
        });
      }
      if (d.k === "net") {
        const z = lo();
        l.q = z < 100 ? r3(v / k / (1 - z / 100)) : 0;
        const qi = (_c = t.closest(".cl")) == null ? void 0 : _c.querySelector('[data-k="q"]');
        if (qi) qi.value = l.q ? r3(l.q * k) : "";
      }
      skCardCalc();
    }
    if (d.ch && K.card && t.tagName === "INPUT" && t.type !== "checkbox") {
      K.card[d.ch] = t.value;
      skCardCalc();
    }
  });
  document.addEventListener("change", async (e) => {
    const t = e.target, K = S.sk, d = t.dataset || {};
    if (t.id === "skCat") {
      K.cat = t.value;
      renderMain();
    }
    if (t.id === "skPhoto" || t.id === "skPhoto2") {
      skPhotos(t.files);
      t.value = "";
    }
    if (t.id === "skBench") {
      skBench(t.files);
      t.value = "";
    }
    if (d.dl != null && K.draft && t.tagName === "SELECT") {
      const l = K.draft.lines[+d.dl];
      if (!l) return;
      if (d.k === "id") {
        if (t.value === "__new") {
          const a = await skNewIng(l.n, l.u, "k");
          if (a) {
            l.add = a;
            l.id = null;
          }
        } else {
          l.id = t.value || null;
          delete l.add;
          if (l.id) {
            l.ok = "ok";
            l.f = skAutoF(l);
          }
        }
        renderMain();
      }
      if (d.k === "f") {
        if (t.value === "?") {
          const v = await ask("\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u043E\u0434\u0438\u043D\u0438\u0446\u044C \u0441\u043A\u043B\u0430\u0434\u0443 \u0432 \u043E\u0434\u043D\u0456\u0439 \u043E\u0434\u0438\u043D\u0438\u0446\u0456 \u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457?", "\u043D\u0430\u043F\u0440. 12 (\u0448\u0442 \u0443 \u044F\u0449\u0438\u043A\u0443) \u0430\u0431\u043E 2.5 (\u043A\u0433 \u0432 \u0443\u043F\u0430\u043A\u043E\u0432\u0446\u0456)");
          const f = +String(v || "").replace(",", ".");
          if (f > 0) l.f = f;
          renderMain();
        } else {
          l.f = +t.value;
          skDraftUpd(+d.dl);
        }
      }
    }
    if (d.cl != null && K.card && t.tagName === "SELECT") {
      const l = K.card.items[+d.cl];
      if (!l) return;
      if (t.value === "__new") {
        const a = await skNewIng("", "\u043A\u0433", "k");
        if (a) {
          l.add = a;
          l.id = null;
        }
      } else {
        l.id = t.value || null;
        delete l.add;
        const x = S.data.sk.ing.find((y) => y.id === l.id);
        if (x && l.loss == null && x.loss) l.loss = x.loss;
      }
      renderMain();
    }
    if (d.ch && K.card && (t.tagName === "SELECT" || t.type === "checkbox")) {
      K.card[d.ch] = t.type === "checkbox" ? t.checked : t.value;
      renderMain();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "scIn") {
      e.preventDefault();
      const v = e.target.value;
      e.target.value = "";
      skCode(v);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal")) modalResolve == null ? void 0 : modalResolve(null);
      else closeSheet();
    }
  });
  document.addEventListener("pointerdown", () => {
    var _a2, _b;
    if (store.get("fs", false) && !document.fullscreenElement && matchMedia("(min-width: 900px)").matches) (_b = (_a2 = document.documentElement).requestFullscreen) == null ? void 0 : _b.call(_a2).catch(() => {
    });
  }, true);
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
  try {
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("pos-sw.js").catch(() => {
    });
  } catch (e) {
  }
  async function start() {
    offBanner();
    setTimeout(offFlush, 1500);
    $("#login").hidden = true;
    $("#app").hidden = false;
    renderNav();
    $("#main").innerHTML = '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    try {
      await loadState();
    } catch (e) {
      console.error("start", e);
      return;
    }
    if (!isCour()) loadMenu().catch(() => {
    });
    connect();
    document.body.classList.toggle("cook", isCook());
    document.body.classList.toggle("cour", isCour());
    if (isCook()) {
      S.view = "kq";
      renderNav();
      loadKq().catch(() => {
      });
      kitchenGate();
    }
    if (isCour()) {
      S.view = "go";
      renderNav();
      loadCour().catch(() => {
      });
    }
  }
  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter((e) => e.k === "guest" && e.s === "new").map((e) => e.t));
    const calls = {};
    for (const e of S.events) if (e.k === "call" && e.s === "new") calls[e.t] = e;
    const bell = (t) => calls[t] ? `<span class="callbell${Date.now() - calls[t].ts > 6e4 ? " late" : ""}" title="\u041A\u043B\u0438\u0447\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430">\u{1F514}</span>` : "";
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map((t) => {
      const b = S.tables[t];
      const bk = (S.books || []).find((x) => x.t === t && x.st === "ok");
      if (!b) return `<button class="tbl${calls[t] ? " calling" : ""}${bk ? " booked" : ""}" data-a="table" data-t="${t}">${bell(t)}<div class="n">${t}</div><div class="st">${bk ? `\u{1F4C5} ${bk.time} \xB7 ${esc(bk.name)}` : "\u0432\u0456\u043B\u044C\u043D\u0438\u0439"}</div></button>`;
      const cls = ["busy", b.check ? "check" : "", pending.has(t) ? "new" : ""].join(" ");
      const tag = b.check ? `<span class="tag c">\u{1F9FE} \u0440\u0430\u0445\u0443\u043D\u043E\u043A</span>${b.pay ? `<i class="pay" title="${b.pay === "card" ? "\u043A\u0430\u0440\u0442\u0430" : "\u0433\u043E\u0442\u0456\u0432\u043A\u0430"}">${b.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</i>` : ""}` : pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : "";
      return `<button class="tbl ${cls}${calls[t] ? " calling" : ""}" data-a="table" data-t="${t}">${bell(t)}${tag}<div class="n">${t}</div><div class="st">${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.${b.disc ? ` \xB7 \u2212${b.disc}%` : ""}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"}</div></button>`;
    }).join("");
    const gos = list.filter((b) => b.t > 1e3 && b.go);
    const strip = !gos.length ? "" : `${goMapBtn(gos)}<div class="go-strip">${gos.map((b) => {
      const g = b.go, late = g.st === "new" && Date.now() - g.at > 6e4;
      return `<button class="go-t st-${g.st}${pending.has(b.t) ? " new" : ""}${late ? " late" : ""}" data-a="table" data-t="${b.t}"><b>${g.kind === "del" ? "\u{1F6F5}" : "\u{1F961}"} ${tn(b.t)}</b><span>${esc(g.name || "")}</span><small>${GOST[g.st] || g.st}${g.when ? " \xB7 \u043D\u0430 " + g.when : ""}${goTileInfo(g)}</small><i class="money">${money(b.pay2)}</i></button>`;
    }).join("")}</div>`;
    return `<div class="head"><h1>\u0417\u0430\u043B</h1>
      ${inboxBtn()}${S.bkNew ? `<button class="btn red bk-blink" data-a="books" title="\u041D\u043E\u0432\u0456 \u0431\u0440\u043E\u043D\u0456 \u2014 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C">\u{1F4C5} ${S.bkNew} \u043D\u043E\u0432.</button>` : (S.books || []).length ? `<button class="btn" data-a="books">\u{1F4C5} ${S.books.length}</button>` : `<button class="btn ghost" data-a="books" title="\u0411\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F">\u{1F4C5}</button>`}</div>${strip}<div class="tables">${tiles}</div>`;
  }
  const evTitle = (e) => ({
    guest: `\u{1F6CE} \u0421\u0442\u0456\u043B ${tn(e.t)} \u2014 ${esc((e.kind || "\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F").toLowerCase())}`,
    check: `\u{1F9FE} \u0421\u0442\u0456\u043B ${tn(e.t)} \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0447\u0435\u043A${e.pay ? e.pay === "card" ? " \xB7 \u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : " \xB7 \u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430" : ""}${e.tip ? ` \xB7 \u{1F49D} ${money(e.tip)}` : ""}`,
    waiter: `\u{1F9D1}\u200D\u{1F373} \u0421\u0442\u0456\u043B ${tn(e.t)} \u2014 ${esc(e.by)}${e.src === "\u043A\u0430\u0441\u0430" ? " (\u043A\u0430\u0441\u0430)" : ""}`,
    close: `\u2705 \u0421\u0442\u0456\u043B ${tn(e.t)} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u2014 ${money(e.sum)} ${e.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}${e.print === false ? " \xB7 \u0431\u0435\u0437 \u0447\u0435\u043A\u0430" : ""}`,
    shift: esc(e.text),
    del: `\u{1F5D1} \u0421\u0442\u0456\u043B ${tn(e.t)} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E (${money(e.sum)})`,
    move: `\u2194\uFE0F ${esc(e.text)}`,
    disc: `% \u0421\u0442\u0456\u043B ${tn(e.t)}: ${esc(e.text)}`,
    rm: `\u270F\uFE0F \u0421\u0442\u0456\u043B ${tn(e.t)}: ${esc(e.text)}`,
    pre: `\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0441\u0442\u0456\u043B ${tn(e.t)}`,
    ready: e.part ? `\u{1F37D} \u0421\u0442\u0456\u043B ${tn(e.t)} \u2014 \u0441\u0442\u0440\u0430\u0432\u0430 \u0433\u043E\u0442\u043E\u0432\u0430, \u0437\u0430\u0431\u0438\u0440\u0430\u0439\u0442\u0435` : `\u{1F37D} \u0421\u0442\u0456\u043B ${tn(e.t)} \u2014 \u0412\u0421\u0415 \u0413\u041E\u0422\u041E\u0412\u041E, \u0437\u0430\u0431\u0438\u0440\u0430\u0439\u0442\u0435!${e.mins != null ? ` <small>(${e.mins} \u0445\u0432)</small>` : ""}`,
    cooking: `\u{1F525} \u0421\u0442\u0456\u043B ${tn(e.t)} \u2014 \u043A\u0443\u0445\u043D\u044F \u0433\u043E\u0442\u0443\u0454`,
    kmsg: `\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F \u2192 \u0441\u0442\u0456\u043B ${tn(e.t)}: ${esc(e.text)}`,
    call: `\u{1F514}\u{1F514} \u0421\u0442\u0456\u043B ${tn(e.t)} \u043A\u043B\u0438\u0447\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430`,
    noscan: `\u{1F6A8}\u{1F4F5}\u{1F6AB} \u0421\u0422\u0406\u041B ${e.t} \u2014 \u041D\u0415 \u041C\u041E\u0416\u0415 \u0417\u0410\u041C\u041E\u0412\u0418\u0422\u0418 \u{1F6AB}\u{1F4F5}\u{1F6A8}<br><small>\u0413\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0432\u0430\u0432 QR (\u0430\u0431\u043E \u043C\u0438\u043D\u0443\u043B\u0430 \u0433\u043E\u0434\u0438\u043D\u0430). \u041F\u0456\u0434\u0456\u0439\u0434\u0456\u0442\u044C: \u{1F4F7} \u043D\u0435\u0445\u0430\u0439 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0454 QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u{1F446}</small>`,
    go: esc(e.text),
    book: esc(e.text),
    cert: esc(e.text),
    gchat: esc(e.text),
    att: `\u{1F7E2} ${esc(e.n)} \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${e.late ? ` \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F ${e.late} \u0445\u0432` : ""}`,
    swap: esc(e.text)
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    setHTML($("#events"), S.events.length ? [...S.events].reverse().map((e) => {
      var _a2, _b, _c, _d, _e;
      const add = ((_a2 = e.prev) == null ? void 0 : _a2.length) && ((_b = e.lines) == null ? void 0 : _b.length);
      const rdy = e.k === "ready" && e.text ? `<div class="lines">${esc(e.text)}</div>` : "";
      const lines = rdy || (((_c = e.lines) == null ? void 0 : _c.length) ? `${add ? '<div class="addtag">\u2795 \u0414\u041E\u0417\u0410\u041C\u041E\u0412\u041B\u0415\u041D\u041D\u042F</div>' : ""}<div class="lines${add ? " add" : ""}">${e.lines.map(esc).join("\n")}</div>` : "");
      const by = e.by && !["waiter"].includes(e.k) ? ` \xB7 ${esc(e.by)}` : "";
      const zb = e.k === "att" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "")}</span>` : e.s === "rej" ? `<span class="bad">\u274C ${esc(e.accBy || "")}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button>${e.late && ((_d = S.cfg) == null ? void 0 : _d.lateFine) ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">\u2705 + \u0448\u0442\u0440\u0430\u0444</button>` : ""}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">\u274C</button>` : '<span class="muted">\u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F</span>'}</div>` : e.k === "swap" && !e.old ? e.s === "ask" && e.n === ((_e = S.me) == null ? void 0 : _e.name) ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u041D\u0456</button></div>` : e.s === "agreed" && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u274C</button></div>` : "" : "";
      const sb = e.k === "book" && e.s === "new" ? `<div class="act"><button class="btn sm green" data-a="bkSet" data-id="${e.bid}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button><button class="btn sm red" data-a="bkSet" data-id="${e.bid}" data-s="no">\u274C</button><button class="btn sm" data-a="books">\u{1F4C5} \u0423\u0441\u0456 \u0431\u0440\u043E\u043D\u0456</button></div>` : e.k === "cert" && e.s === "new" && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="certPay" data-c="${e.code}" data-h="cash">\u{1F4B5} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</button><button class="btn sm" data-a="certPay" data-c="${e.code}" data-h="card">\u{1F4B3}</button><button class="btn sm red" data-a="certPay" data-c="${e.code}" data-h="no">\u274C</button></div>` : e.k === "gchat" && !e.out ? `<div class="act"><button class="btn sm primary" data-a="gbThread" data-ph="${e.ph}">\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438</button></div>` : (e.k === "book" || e.k === "cert") && e.s !== "new" ? `<div class="act"><span class="muted">${e.s === "rej" ? "\u274C" : "\u2705"} ${esc(e.accBy || "")}</span></div>` : "";
      const btns = isCour() ? "" : sb || zb || (e.k === "noscan" ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${tn(e.t)}</button></div>` : e.k === "guest" || e.k === "check" || e.k === "call" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "\u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E")}</span>` : e.s === "rej" ? `<span style="color:var(--red,#ff453a)">\u274C \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E \xB7 ${esc(e.accBy || "")}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button>${e.k === "guest" ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438</button>` : ""}`}<button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${tn(e.t)}</button></div>` : "");
      const fresh = S.shown.size && !S.shown.has(e.id) ? " fresh" : "";
      return `<div class="ev ${e.k}${e.k === "call" && e.s === "new" && Date.now() - e.ts > 6e4 ? " late" : ""}${e.s === "acc" || e.s === "rej" ? " acc" : ""}${e.s && !["new", "ask", "agreed"].includes(e.s) ? " done" : ""}${e.s === "rej" ? " rej" : ""}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}${e.sum && ["guest", "waiter"].includes(e.k) ? `<div class="muted">\u0421\u0443\u043C\u0430 ${money(e.sum)}</div>` : ""}${btns}</div>`;
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
  const curGrp = () => {
    var _a2, _b, _c, _d;
    const g = S.grp || (S.fav.length ? "fav" : "kitchen");
    if (g === "fav" || !((_a2 = S.groups) == null ? void 0 : _a2.length) || ((_c = (_b = S.groups.find((x) => x.id === g)) == null ? void 0 : _b.cats) == null ? void 0 : _c.length)) return g;
    return ((_d = S.groups.find((x) => {
      var _a3;
      return (_a3 = x.cats) == null ? void 0 : _a3.length;
    })) == null ? void 0 : _d.id) || g;
  };
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
    var _a2, _b, _c, _d, _e;
    const t = S.open;
    if (!t || !$("#shHead")) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const pk = packItem(), pq = pk ? packQ(t) : 0;
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0) + (pq ? pq * pk.price : 0);
    const G = (b == null ? void 0 : b.go) || (t === -1 ? S.goDraft : null);
    setHTML($("#shHead"), `<h2>${t === -1 ? `${G.kind === "del" ? "\u{1F6F5}" : "\u{1F961}"} \u041D\u043E\u0432\u0435: ${esc(G.name || "")}` : G ? `${G.kind === "del" ? "\u{1F6F5}" : "\u{1F961}"} ${tn(t)}` : `\u0421\u0442\u0456\u043B ${tn(t)}`}</h2>${b ? `<span class="total money">${money(b.pay2)}</span>${b.disc ? `<span class="chip">\u2212${b.disc}%</span>` : ""}${((_a2 = b.promo) == null ? void 0 : _a2.lvn) ? `<span class="chip" data-a="loyCliT">${esc(b.promo.lvn)}</span>` : ""}${b.tip ? `<span class="chip tipc">\u{1F49D} ${money(b.tip)}</span>` : ""}<span class="muted hide-s">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"} \xB7 ${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.</span>${b.check ? '<span class="chip" style="background:var(--orange);color:#000">\u{1F9FE} \u0447\u0435\u043A</span>' : ""}` : '<span class="muted">\u043D\u043E\u0432\u0438\u0439</span>'}
        <span class="sp"></span><div class="tabs2"><button class="${S.mobileMenu ? "" : "on"}" data-a="tab" data-m="0">\u0420\u0430\u0445\u0443\u043D\u043E\u043A${cartRows.length ? ` (${cartRows.reduce((s, [, x]) => s + x.q, 0)})` : ""}</button><button class="${S.mobileMenu ? "on" : ""}" data-a="tab" data-m="1">\u041C\u0435\u043D\u044E</button></div>
        <button class="close-x" data-a="closeSheet">\u2715</button>`);
    const pend = S.events.filter((e) => e.k === "guest" && e.s === "new" && +e.t === t);
    setHTML($("#shPend"), (G ? goBlock(t, G, b) : "") + pend.map((e) => `<div class="pend"><div><b>\u{1F6CE} \u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F \xB7 ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join("<br>")}</div>${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button></div>`).join(""));
    $("#shBody").className = "sheet-body" + (S.mobileMenu ? " show-menu" : "");
    const billRows = b ? b.items.map((it) => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} \xD7 ${Math.round(it.sum / it.q)} \u20B4</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1">\u2212</button></div>`).join("") : '<div class="muted" style="padding:8px 4px">\u0420\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0432 \u043C\u0435\u043D\u044E</div>';
    const discRow = (b == null ? void 0 : b.disc) ? `<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%</div><b class="money" style="color:var(--green)">\u2212${b.discSum != null ? Math.min(b.total, b.discSum) : Math.round(b.total * b.disc / 100)}</b><button class="rb minus" data-a="discSet" data-p="0">\xD7</button></div>` : "";
    const promoRow = (b == null ? void 0 : b.promoOff) ? `<div class="row"><div class="nm muted">\u{1F381} \u0410\u043A\u0446\u0456\u0457 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E</div>${isAdmin() ? '<button class="rb plus" data-a="loyOff" data-off="0" title="\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438">\u21BA</button>' : ""}</div>` : (((_b = b == null ? void 0 : b.promo) == null ? void 0 : _b.lines) || []).filter((l) => l.amt || !l.info).map((l, i) => `<div class="row"><div class="nm">${esc(l.n)}</div><b class="money" style="color:var(--green)">${l.amt ? "\u2212" + l.amt : ""}</b>${isAdmin() && i === 0 ? '<button class="rb minus" data-a="loyOff" data-off="1" title="\u0411\u0435\u0437 \u0430\u043A\u0446\u0456\u0439">\xD7</button>' : ""}</div>`).join("");
    const bonRow = (b == null ? void 0 : b.bonus) ? `<div class="row"><div class="nm">${b.cert ? `\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 ${esc(b.cert.code)}${b.bonus > b.cert.sum ? " + \u{1F381} \u0431\u043E\u043D\u0443\u0441\u0438" : ""}` : "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438"}</div><b class="money" style="color:var(--green)">\u2212${b.bonus}</b><button class="rb minus" data-a="cliBon0">\xD7</button></div>` : "";
    const tipRow = (b == null ? void 0 : b.tip) ? `<div class="row"><div class="nm">\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<small>\u0432\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">\xD7</button>' : ""}</div>` : "";
    const comments = b ? b.log.filter((o) => o.comment).map((o) => `<div class="muted" style="padding:2px 6px">\u{1F4AC} ${esc(o.comment)}</div>`).join("") : "";
    const cartHTML = cartRows.length ? `<div class="cart"><h3>\u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} \u20B4</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">\u2212</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join("")}${pq ? `<div class="row auto"><div class="nm">\u{1F961} ${esc(pk.name.uk)}<small>${pk.price} \u20B4 \xD7 ${pq}${S.packAdj[t] ? "" : " \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E"}</small></div><button class="rb minus" data-a="pk" data-d="-1">\u2212</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ""}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="\u{1F4AC} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u0434\u043B\u044F \u043A\u0443\u0445\u043D\u0456" value="${esc(S.coms[t] || "")}"><button class="btn sm ${S.tw[t] ? "primary" : "ghost"}" data-a="tw">\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E</button><button class="btn sm ${S.ur[t] ? "red" : "ghost"}" data-a="ur">\u26A1 \u0422\u0435\u0440\u043C\u0456\u043D\u043E\u0432\u043E</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">\u2715</button><button class="btn primary" data-a="send">\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \xB7 ${money(cartSum)}</button></div></div>` : "";
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A</button><button class="btn" data-a="disc">% \u0417\u043D\u0438\u0436\u043A\u0430</button>
      <button class="btn" data-a="move">\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438</button><button class="btn" data-a="split">\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438</button><button class="btn" data-a="bonCert">\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \xB7 \u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442</button>${isAdmin() ? '<button class="btn red" data-a="delTable">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>' : '<button class="btn" data-a="mobileMenu">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438</button>'}
      <button class="btn green wide" data-a="closeT">\u{1F4B0} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \xB7 ${money(b.pay2)}</button></div>` : "";
    const keepBill = (_c = $("#shBill .scroll")) == null ? void 0 : _c.scrollTop, focusCom = ((_d = document.activeElement) == null ? void 0 : _d.id) === "cartCom";
    setHTML($("#shBill"), `<div class="scroll"><h3>\u0420\u0430\u0445\u0443\u043D\u043E\u043A</h3>${billRows}${discRow}${promoRow}${bonRow}${tipRow}${comments}</div>${cartHTML}${actions}`);
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
    const focusSearch = ((_e = document.activeElement) == null ? void 0 : _e.id) === "search";
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
    const r = await act("order", __spreadProps(__spreadValues({ t: t === -1 ? 0 : t }, t === -1 ? { go: S.goDraft } : {}), { items, urgent: !!S.ur[t], comment: [S.tw[t] && t !== -1 ? "\u0417 \u0421\u041E\u0411\u041E\u042E" : "", S.coms[t] || ""].filter(Boolean).join(" \xB7 ") }));
    if (r && t === -1) {
      S.carts[-1] = {};
      S.coms[-1] = "";
      saveCarts();
      S.goDraft = null;
      S.mobileMenu = false;
      toast(`\u{1F6F5} ${tn(r.t)}: \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E`);
      await loadState().catch(() => {
      });
      openTable(r.t);
      return;
    }
    if (r) {
      S.carts[t] = {};
      S.coms[t] = "";
      S.tw[t] = false;
      S.ur[t] = false;
      S.packAdj[t] = 0;
      saveCarts();
      S.mobileMenu = false;
      toast(r.queued ? `\u{1F4F4} \u0421\u0442\u0456\u043B ${tn(t)}: \u043D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E, \u043A\u0443\u0445\u043D\u044F \u043E\u0442\u0440\u0438\u043C\u0430\u0454, \u0449\u043E\u0439\u043D\u043E \u0437'\u044F\u0432\u0438\u0442\u044C\u0441\u044F \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442` : `\u{1F5A8} \u0421\u0442\u0456\u043B ${tn(t)}: \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E`);
      if (!r.queued) await loadState().catch(() => {
      });
    } else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const v = await choose(`\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ${tn(t)}`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${b.tip ? ` + \u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ""}${b.pay ? ` \xB7 \u0433\u0456\u0441\u0442\u044C \u0445\u043E\u0447\u0435 ${b.pay === "card" ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u043E\u044E" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E"}` : ""}`, [
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "cash:1", cls: "green" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "card:1", cls: "blue" },
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "cash:0" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "card:0" }
    ]);
    if (!v) return;
    const [pay, pr] = v.split(":");
    const r = await act("close", { t, pay, print: pr === "1" });
    if (r == null ? void 0 : r.queued) {
      toast(`\u{1F4F4} \u0421\u0442\u0456\u043B ${tn(t)}: \u043D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u2014 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u0432 \u0447\u0435\u0440\u0437\u0456, \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456`);
      closeSheet();
      return;
    }
    if (r == null ? void 0 : r.r) {
      toast(`\u2705 \u0421\u0442\u0456\u043B ${tn(t)} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 ${money(r.r.sum)}`);
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
    var _a2, _b;
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const dmax = (_b = (_a2 = S.cfg) == null ? void 0 : _a2.discMax) != null ? _b : 20, max = isAdmin() ? 100 : dmax;
    const v = await choose(`\u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0441\u0442\u0456\u043B ${tn(t)}`, `\u0421\u0443\u043C\u0430 ${money(b.total)}${b.disc ? ` \xB7 \u0437\u0430\u0440\u0430\u0437 ${b.disc}%` : ""}${isAdmin() ? "" : ` \xB7 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u2014 \u0434\u043E ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter((p2) => p2 <= max).map((p2) => ({ label: `${p2}%  \u2192  ${money(b.total - Math.round(b.total * p2 / 100))}`, val: String(p2) })), { label: "\u270F\uFE0F \u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A", val: "own" }, { label: "\u0411\u0435\u0437 \u0437\u043D\u0438\u0436\u043A\u0438", val: "0", cls: "red" }]);
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
    const to = await pickTable(`\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0441\u0442\u0456\u043B ${tn(t)}`, "\u041D\u0430 \u0437\u0430\u0439\u043D\u044F\u0442\u0438\u0439 \u0441\u0442\u0456\u043B (\u0436\u043E\u0432\u0442\u0438\u0439) \u2014 \u0440\u0430\u0445\u0443\u043D\u043A\u0438 \u043E\u0431\u02BC\u0454\u0434\u043D\u0430\u044E\u0442\u044C\u0441\u044F", t);
    if (!to) return;
    const r = await act("move", { t, to }, "");
    if (r == null ? void 0 : r.r) {
      toast((r.r.merged ? `\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E \u0437\u0456 \u0441\u0442\u043E\u043B\u043E\u043C ${tn(to)}` : `\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0456\u043B ${tn(to)}`) + (r.r.released ? " \xB7 \u{1F381} \u0431\u043E\u043D\u0443\u0441\u0438 / \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0437\u043D\u044F\u0442\u043E \u2014 \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u0439\u0442\u0435 \u0437\u043D\u043E\u0432\u0443" : ""));
      S.carts[to] = __spreadValues(__spreadValues({}, S.carts[to] || {}), cartOf(t));
      S.carts[t] = {};
      saveCarts();
      S.open = to;
      await loadState().catch(() => {
      });
    }
  }
  function splitRender() {
    const { items, q } = S.spl, sum = items.reduce((a, it, i) => a + Math.round(it.sum / it.q) * (q[i] || 0), 0);
    const box = $("#splBox");
    if (!box) return;
    box.innerHTML = items.map((it, i) => `<div class="row"><div class="nm">${esc(it.name)}<small>\u043D\u0430 \u0441\u0442\u043E\u043B\u0456 ${it.q} \u0448\u0442 \xB7 ${Math.round(it.sum / it.q)} \u20B4</small></div><button class="rb minus" data-a="spq" data-i="${i}" data-d="-1">\u2212</button><span class="q">${q[i] || 0}</span><button class="rb plus" data-a="spq" data-i="${i}" data-d="1">+</button></div>`).join("") + `<div class="row"><div class="nm"><b>\u041D\u043E\u0432\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A</b></div><b class="money">${money(sum)}</b></div>`;
  }
  async function splitFlow() {
    var _a2;
    const t = S.open, b = S.tables[t];
    if (!((_a2 = b == null ? void 0 : b.items) == null ? void 0 : _a2.length)) return toast("\u0421\u0442\u0456\u043B \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439");
    S.spl = { items: b.items, q: {} };
    const pm = modal({ title: `\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ${tn(t)}`, text: "\u041E\u0431\u0435\u0440\u0456\u0442\u044C, \u0449\u043E \u043F\u0456\u0434\u0435 \u0432 \u043E\u043A\u0440\u0435\u043C\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A", body: '<div class="rows" id="splBox"></div>', buttons: [{ label: "\u0414\u0430\u043B\u0456 \u2192 \u043E\u0431\u0440\u0430\u0442\u0438 \u0441\u0442\u0456\u043B", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    splitRender();
    const v = await pm;
    const sel = S.spl.items.map((it, i) => ({ name: it.name, q: S.spl.q[i] || 0 })).filter((x) => x.q > 0);
    closeModal();
    if (!v) return;
    if (!sel.length) return toast("\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E");
    const to = await pickTable(`\u2702\uFE0F \u041A\u0443\u0434\u0438 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 (${sel.reduce((a, x) => a + x.q, 0)} \u043F\u043E\u0437.)`, "\u0412\u0456\u043B\u044C\u043D\u0438\u0439 \u0441\u0442\u0456\u043B \u2014 \u043D\u043E\u0432\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A; \u0437\u0430\u0439\u043D\u044F\u0442\u0438\u0439 (\u0436\u043E\u0432\u0442\u0438\u0439) \u2014 \u043F\u043E\u0437\u0438\u0446\u0456\u0457 \u0434\u043E\u0434\u0430\u0434\u0443\u0442\u044C\u0441\u044F \u0434\u043E \u043D\u044C\u043E\u0433\u043E", t);
    if (!to) return;
    const r = await act("split", { t, to, items: sel }, "");
    if (r == null ? void 0 : r.r) {
      toast(`\u2702\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0456\u043B ${tn(to)} \xB7 ${money(r.r.sum)}` + (r.r.released ? " \xB7 \u{1F381} \u0431\u043E\u043D\u0443\u0441\u0438 / \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0437\u043D\u044F\u0442\u043E \u2014 \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u0439\u0442\u0435 \u0437\u043D\u043E\u0432\u0443" : ""));
      await loadState().catch(() => {
      });
    }
  }
  function hallGrid(m) {
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90 - (Object.keys(S.tables).some((t) => t > 1e3) ? 74 : 0)), n = S.n;
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
  const payL = (x) => x.card ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430";
  function closedHTML() {
    const l = S.data.closed;
    if (!l) return '<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const isToday = !S.data.cday || S.data.cday === S.data.ctoday, dTitle = isToday ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : S.data.cday.split("-").reverse().join(".");
    const nav = `<button class="btn sm" data-a="cDay" data-v="-1">\u25C0</button>${isToday ? "" : '<button class="btn sm" data-a="cDay" data-v="1">\u25B6</button><button class="btn sm" data-a="cDay" data-v="0">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456</button>'}`;
    const gone = (x) => x.del || x.rm, ok = l.filter((x) => !gone(x));
    return `<div class="head"><h1>\u0417\u0430\u043A\u0440\u0438\u0442\u0456 ${dTitle}</h1>${nav}<div class="stat">\u0420\u0430\u0445\u0443\u043D\u043A\u0456\u0432<b>${ok.length}</b></div><div class="stat">\u0420\u0430\u0437\u043E\u043C<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">\u{1F4B5}<b class="money">${money(ok.reduce((s, x) => {
      var _a2;
      return s + ((_a2 = x.cash) != null ? _a2 : x.sum);
    }, 0))}</b></div><div class="stat">\u{1F4B3}<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => {
      var _a2, _b, _c, _d, _e, _f, _g;
      const ref = x.id || l.length - 1 - i;
      return `<div class="card" style="${gone(x) ? "opacity:.45" : ""}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} \xB7 \u0421\u0442\u0456\u043B ${tn(x.t)} \xB7 <span class="money">${money(x.sum)}</span> ${x.reopen ? "\u21A9\uFE0F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0437\u043D\u043E\u0432\u0443" : x.restored ? "\u21A9\uFE0F \u0441\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : x.del ? "\u{1F5D1} \u0441\u0442\u0456\u043B \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : x.rm ? "\u{1F9F9} \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438" : payL(x)}${x.disc ? ` \xB7 \u0437\u043D\u0438\u0436\u043A\u0430 ${x.disc}%` : ""}</h3><span class="muted">${esc(x.by || "")}</span>
        ${!gone(x) && ((_a2 = x.dishes) == null ? void 0 : _a2.length) ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">\u{1F5A8} \u0427\u0435\u043A</button>` : ""}${!gone(x) && isAdmin() ? `<button class="btn sm" data-a="cEdit" data-ref="${ref}" data-d="${S.data.cday || ""}">\u270F\uFE0F \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438</button>` : ""}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">\u{1F5D1} \u0417 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</button>` : ""}
        ${isAdmin() && !x.del && !x.reopen && ((_b = x.dishes) == null ? void 0 : _b.length) ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button>` : ""}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">\u21A9\uFE0F \u0423 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</button>` : ""}
        ${isAdmin() && x.del && !x.restored && (((_c = x.dishes) == null ? void 0 : _c.length) || ((_d = x.voids) == null ? void 0 : _d.length)) ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0441\u0442\u0456\u043B</button>` : ""}</div>
        ${((_e = x.dishes) == null ? void 0 : _e.length) ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}\xD7 ${esc(n)} \u2014 ${s}`).join(" \xB7 ")}</div>` : ""}${x.tip ? `<div class="muted" style="margin-top:4px">\u{1F49D} \u0432 \u0442.\u0447. \u0447\u0430\u0439\u043E\u0432\u0456 ${money(x.tip)}</div>` : ""}${((_f = x.edits) == null ? void 0 : _f.length) ? `<div class="muted" style="margin-top:4px;font-size:12px">\u270F\uFE0F \u0437\u043C\u0456\u043D\u0435\u043D\u043E ${x.edits.length}\xD7 \xB7 ${esc(x.edits[x.edits.length - 1].by)} ${x.edits[x.edits.length - 1].at}</div>` : ""}
        ${((_g = x.voids) == null ? void 0 : _g.length) ? `<div class="voids">\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E:${x.voids.map((v) => `<div>${v.at} \xB7 \u2212${money(v.sum)} ${esc(v.name)} \u2014 <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join("")}</div>` : ""}</div>`;
    }).join("") || `<div class="muted">${isToday ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454" : "\u0426\u044C\u043E\u0433\u043E \u0434\u043D\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u043D\u0435\u043C\u0430\u0454"}</div>`}</div>${(S.data.cvoids || []).length ? `<div class="card"><h3>\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u0456 \u0441\u0442\u0440\u0430\u0432\u0438 ${dTitle} <span class="muted">\xB7 ${S.data.cvoids.length}</span></h3>${[...S.data.cvoids].reverse().map((v) => `<div class="kv"><span>${v.at} \xB7 \u0441\u0442\u0456\u043B ${tn(v.t)} \xB7 <b>${esc(v.name)}</b> \u2014 <i>${esc(v.reason || "")}</i> <span class="muted">(${esc(v.by || "")})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="btn sm green" data-a="vBack" data-ts="${v.ts}">\u21A9\uFE0F \u041D\u0430 \u0441\u0442\u0456\u043B</button>` : ""}</span></div>`).join("")}</div>` : ""}`;
  }
  function goBlock(t, g, b) {
    const map = g.addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.addr)}` : "";
    const nx = t === -1 ? "" : [["cook", "\u{1F525} \u0413\u043E\u0442\u0443\u0454\u0442\u044C\u0441\u044F"], ["ready", "\u{1F37D} \u0413\u043E\u0442\u043E\u0432\u043E"], ...g.kind === "del" ? [["road", "\u{1F6F5} \u041F\u043E\u0457\u0445\u0430\u0432"]] : []].filter(([s]) => s !== g.st).map(([s, l]) => `<button class="btn sm" data-a="goSt" data-s="${s}">${l}</button>`).join("");
    const pay = g.pay === "online" ? g.paid ? "\u{1F4B3} \u043E\u043D\u043B\u0430\u0439\u043D \u2713" : "\u23F3 \u043E\u043D\u043B\u0430\u0439\u043D" : g.pay === "card" ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u0430" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430";
    const tags = [g.when ? `\u{1F550} <b>${g.when}</b>` : "\u26A1 \u0448\u0432\u0438\u0434\u043A\u043E", pay + (g.change ? ` \xB7 \u0437 ${g.change}` : ""), g.cut ? `\u{1F374} ${g.cut}` : "", g.cour ? `\u{1F6F5} ${esc(g.cour)}` : "", g.src ? esc(g.src) : ""].filter(Boolean).map((x) => `<span class="chip sm">${x}</span>`).join("");
    return `<div class="go-card"><div class="go-h"><b>${g.kind === "del" ? "\u{1F6F5}" : "\u{1F961}"} ${esc(g.name || "\u2014")}</b>${t !== -1 ? `<span class="chip sm on">${GOST[g.st] || g.st}</span>` : ""}${g.phone ? `<a class="btn sm go-ph" href="tel:+${g.phone}">\u{1F4DE} ${fmtPh(g.phone)}</a>` : ""}</div>
      ${g.kind === "del" ? `<div class="go-adr">\u{1F4CD} ${map ? `<a href="${map}" target="_blank" rel="noopener">${esc(g.addr)}</a>` : "\u2014"}${g.ent ? ` <span class="muted">\xB7 ${esc(g.ent)}</span>` : ""}</div>` : ""}
      <div class="chips">${tags}</div>${g.note ? `<div class="muted">\u{1F4AC} ${esc(g.note)}</div>` : ""}
      ${t !== -1 ? `<div class="btnrow">${nx}${g.kind === "del" && isAdmin() ? `<button class="btn sm" data-a="goCourSet">\u{1F464} \u041A\u0443\u0440'\u0454\u0440</button>` : ""}${isAdmin() ? '<button class="btn sm" data-a="goEdit">\u270F\uFE0F</button>' : ""}<button class="btn sm green" data-a="goDone">\u{1F91D} \u0412\u0438\u0434\u0430\u043D\u043E \xB7 ${money((b == null ? void 0 : b.pay2) || 0)}</button></div>` : ""}</div>`;
  }
  async function goNew(kind0 = "pick", fromT = 0) {
    const hm = (m) => {
      const d2 = new Date(Date.now() + m * 6e4);
      return `${d2.getHours()}:${String(d2.getMinutes()).padStart(2, "0")}`;
    };
    const chip = (grp, v2, l, on) => `<button class="chip sm${on ? " on" : ""}" data-g="${grp}" data-v="${v2}">${l}</button>`;
    const body = `<div class="gof"><div class="seg" id="gKind"><button class="${kind0 === "pick" ? "on" : ""}" data-k="pick">\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437</button><button class="${kind0 === "del" ? "on" : ""}" data-k="del">\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430</button></div>
      <div class="gof-r"><input id="gP" type="tel" inputmode="tel" placeholder="\u{1F4DE} \u0422\u0435\u043B\u0435\u0444\u043E\u043D 050 123 45 67" autocomplete="off"><input id="gN" placeholder="\u{1F464} \u0406\u043C\u02BC\u044F"></div>
      <div id="gCli" class="gof-cli" hidden></div>
      <div id="gAL" class="gof-r" ${kind0 === "del" ? "" : "hidden"}><input id="gA" placeholder="\u{1F4CD} \u0410\u0434\u0440\u0435\u0441\u0430"><input id="gE" class="gof-s" placeholder="\u{1F6AA} \u041F\u0456\u0434\u02BC\u0457\u0437\u0434, \u043F\u043E\u0432\u0435\u0440\u0445"></div>
      <div id="gAdr" class="chips scroll" hidden></div>
      <div class="gof-l">\u{1F550} \u041A\u043E\u043B\u0438</div><div class="chips" id="gWc">${chip("w", "", "\u26A1 \u041E\u0434\u0440\u0430\u0437\u0443", 1)}${chip("w", 30, "+30 \u0445\u0432")}${chip("w", 60, "+60 \u0445\u0432")}${chip("w", "own", "\u270F\uFE0F \u0421\u0432\u0456\u0439")}<input id="gW" class="gof-t" placeholder="19:30" inputmode="numeric" hidden></div>
      <div class="gof-l">\u{1F4B0} \u041E\u043F\u043B\u0430\u0442\u0430</div><div class="chips" id="gPc">${chip("p", "cash", "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", 1)}${chip("p", "card", "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430")}<input id="gCh" class="gof-t" placeholder="\u0440\u0435\u0448\u0442\u0430 \u0437\u2026" inputmode="numeric"></div></div>`;
    const pr = modal({ title: "\u260E\uFE0F \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437 \u0441\u043E\u0431\u043E\u044E", body, buttons: [{ label: "\u0414\u0430\u043B\u0456 \u2192 \u043C\u0435\u043D\u044E", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    let kind = kind0, when = "", pay = "cash";
    $("#gKind").onclick = (e) => {
      var _a2;
      const k = (_a2 = e.target.closest("[data-k]")) == null ? void 0 : _a2.dataset.k;
      if (!k) return;
      kind = k;
      $("#gKind").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.k === k));
      $("#gAL").hidden = k !== "del";
      $("#gAdr").hidden = k !== "del" || !$("#gAdr").innerHTML;
    };
    const pick = (box, el) => box.querySelectorAll("[data-g]").forEach((x) => x.classList.toggle("on", x === el));
    $("#gWc").onclick = (e) => {
      const el = e.target.closest("[data-g]");
      if (!el) return;
      pick($("#gWc"), el);
      const v2 = el.dataset.v;
      $("#gW").hidden = v2 !== "own";
      when = v2 === "own" ? "" : v2 ? hm(+v2) : "";
      if (v2 === "own") $("#gW").focus();
      else $("#gW").value = when;
    };
    $("#gPc").onclick = (e) => {
      const el = e.target.closest("[data-g]");
      if (!el) return;
      pick($("#gPc"), el);
      pay = el.dataset.v;
      $("#gCh").hidden = pay !== "cash";
    };
    $("#gAdr").onclick = (e) => {
      const el = e.target.closest("[data-v]");
      if (!el) return;
      $("#gA").value = el.dataset.v;
      pick($("#gAdr"), el);
    };
    $("#gP").onchange = async () => {
      var _a2, _b;
      const r = await api("cliGet", { phone: $("#gP").value }).catch(() => null), box = $("#gCli");
      box.hidden = false;
      if (!(r == null ? void 0 : r.cli)) {
        box.textContent = r ? "\u{1F195} \u041D\u043E\u0432\u0438\u0439 \u043A\u043B\u0456\u0454\u043D\u0442" : "\u26A0\uFE0F \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043D\u043E\u043C\u0435\u0440";
        $("#gAdr").hidden = true;
        return;
      }
      const c = r.cli;
      if (!$("#gN").value) $("#gN").value = c.name || "";
      box.innerHTML = `\u{1F464} <b>${esc(c.name || "\u041A\u043B\u0456\u0454\u043D\u0442")}</b> \xB7 ${c.n} \u0437\u0430\u043C\u043E\u0432\u043B. \xB7 \u{1F381} <b>${money(c.bal || 0)}</b>`;
      $("#gAdr").innerHTML = (c.addr || []).map((a, i) => `<button class="chip sm${i ? "" : " on"}" data-v="${esc(a)}">\u{1F4CD} ${esc(a)}</button>`).join("");
      $("#gAdr").hidden = kind !== "del" || !((_a2 = c.addr) == null ? void 0 : _a2.length);
      if (!$("#gA").value && ((_b = c.addr) == null ? void 0 : _b[0])) $("#gA").value = c.addr[0];
    };
    setTimeout(() => {
      var _a2;
      return (_a2 = $("#gP")) == null ? void 0 : _a2.focus();
    }, 50);
    const v = await pr;
    if (v !== "ok") return closeModal();
    if ($("#gW").hidden === false) when = $("#gW").value.trim();
    const d = { kind, phone: $("#gP").value, name: $("#gN").value.trim(), addr: $("#gA").value.trim(), ent: $("#gE").value.trim(), when, pay, change: pay === "cash" ? +$("#gCh").value || 0 : 0 };
    closeModal();
    if (!d.name) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0456\u043C\u02BC\u044F");
    if (kind === "del" && !d.addr) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0430\u0434\u0440\u0435\u0441\u0443");
    if (d.when && !/^\d{1,2}:\d{2}$/.test(d.when)) return toast("\u26A0\uFE0F \u0427\u0430\u0441 \u0443 \u0444\u043E\u0440\u043C\u0430\u0442\u0456 19:30");
    S.goDraft = d;
    S.tw[-1] = true;
    if (fromT) {
      S.carts[-1] = S.carts[fromT] || {};
      S.coms[-1] = S.coms[fromT] || "";
      S.packAdj[-1] = S.packAdj[fromT] || 0;
      S.ur[-1] = S.ur[fromT];
      S.carts[fromT] = {};
      S.coms[fromT] = "";
      S.tw[fromT] = false;
      S.packAdj[fromT] = 0;
      saveCarts();
    }
    openTable(-1);
    S.mobileMenu = !fromT;
    renderSheet();
  }
  async function goDone(t) {
    const b = S.tables[t], g = b == null ? void 0 : b.go;
    if (!g) return;
    let pay = g.paid ? "card" : null;
    if (!pay) {
      pay = await choose(`\u{1F91D} ${tn(t)} \u0432\u0438\u0434\u0430\u043D\u043E`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${g.change ? ` \xB7 \u0440\u0435\u0448\u0442\u0430 \u0437 ${g.change}` : ""}`, [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", val: "cash", cls: "green" }, { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430", val: "card", cls: "blue" }]);
      if (!pay) return;
    }
    if (await act("goSt", { t, st: "done", pay }, `\u{1F91D} ${tn(t)} \u0432\u0438\u0434\u0430\u043D\u043E`)) {
      if (S.open === t) closeSheet == null ? void 0 : closeSheet();
      await loadState().catch(() => {
      });
      if (S.view === "go") renderMain();
    }
  }
  async function cliT(t) {
    var _a2;
    const b = S.tables[t];
    if (!b) return;
    let ph = b.cli;
    if (!ph) {
      ph = await ask("\u{1F381} \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0433\u043E\u0441\u0442\u044F (\u0434\u043B\u044F \u0431\u043E\u043D\u0443\u0441\u0456\u0432)", "050 123 45 67", "tel");
      if (!ph) return;
    }
    const r = await api("cliGet", { phone: ph }).catch((e) => {
      toast("\u26A0\uFE0F " + (e.message || "\u043D\u043E\u043C\u0435\u0440?"));
      return null;
    });
    if (!r) return;
    const c = r.cli || { n: 0, sum: 0, bal: 0 }, max = r.mem ? Math.min(c.bal || 0, Math.floor(b.total * (r.cfg.bmax || 0) / 100)) : 0;
    if (!b.cli) await act("cliSet", { t, phone: r.phone });
    if (!r.mem) {
      const link = r.bot ? `https://t.me/${r.bot}?start=join` : "";
      const v2 = await modal({ title: `\u{1F4F1} ${c.name || fmtPh(r.phone)} \u2014 \u0449\u0435 \u043D\u0435 \u0432 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0456`, body: `<div class="muted set-note">\u0411\u043E\u043D\u0443\u0441\u0438, \u0437\u043D\u0438\u0436\u043A\u0438 \u043F\u043E\u0441\u0442\u0456\u0439\u043D\u0438\u043C \u0456 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u043D\u0430 \u0414\u041D \u2014 \u043B\u0438\u0448\u0435 \u0434\u043B\u044F \u0442\u0438\u0445, \u0445\u0442\u043E \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0432 \u043D\u0430\u0448 Telegram-\u0431\u043E\u0442 (\u0449\u043E\u0431 \u043C\u0438 \u043C\u043E\u0433\u043B\u0438 \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044E).${c.n ? ` \u0412\u0456\u0437\u0438\u0442\u0456\u0432 \u0443\u0436\u0435 ${c.n}${c.bal ? `, \u043D\u0430\u043A\u043E\u043F\u0438\u0447\u0435\u043D\u043E ${money(c.bal)} \u0431\u043E\u043D\u0443\u0441\u0456\u0432 \u2014 \u0441\u0442\u0430\u043D\u0443\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043F\u0456\u0441\u043B\u044F \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044F` : ""}.` : ""}</div>${link ? `<div style="text-align:center;margin:10px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(link)}" width="220" height="220" alt="QR" style="border-radius:12px;background:#fff"><div class="muted" style="margin-top:6px">\u0413\u0456\u0441\u0442\u044C \u0441\u043A\u0430\u043D\u0443\u0454 \u043A\u0430\u043C\u0435\u0440\u043E\u044E \u2192 \xAB\u041F\u043E\u0447\u0430\u0442\u0438\xBB \u2192 \xAB\u{1F4F1} \u041F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F \u043D\u043E\u043C\u0435\u0440\u043E\u043C\xBB<br><b>${esc("@" + r.bot)}</b></div></div>` : ""}`, buttons: [{ label: "\u0413\u043E\u0442\u043E\u0432\u043E", val: null }, { label: "\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u043D\u043E\u043C\u0435\u0440", val: "del", cls: "red" }] });
      if (v2 === "del") await act("cliSet", { t, phone: "" }, "\u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
      return loadState().catch(() => {
      });
    }
    if (!b.cli) await loadState().catch(() => {
    });
    const pr = (_a2 = S.tables[t]) == null ? void 0 : _a2.promo;
    const v = await choose(`\u{1F381} ${c.name || fmtPh(r.phone)}`, `${(pr == null ? void 0 : pr.lvn) ? pr.lvn + " \xB7 " : ""}${c.n} \u0437\u0430\u043C\u043E\u0432\u043B. \xB7 ${money(c.sum)} \xB7 \u0431\u043E\u043D\u0443\u0441\u0456\u0432 ${money(c.bal || 0)}${c.bd ? ` \xB7 \u{1F382} ${c.bd.slice(3)}.${c.bd.slice(0, 2)}` : ""} \xB7 \u043A\u0435\u0448\u0431\u0435\u043A ${(pr == null ? void 0 : pr.cash) || r.cfg.cash}% \u043D\u0430\u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u0456${c.note ? ` \xB7 \u{1F4CC} ${c.note}` : ""}`, [
      ...max > 0 ? [{ label: `\u0421\u043F\u0438\u0441\u0430\u0442\u0438 ${money(max)}`, val: "use", cls: "primary" }] : [],
      ...r.cli ? [{ label: "\u{1F464} \u041A\u0430\u0440\u0442\u043A\u0430 \u043A\u043B\u0456\u0454\u043D\u0442\u0430", val: "card" }] : [],
      { label: "\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044F", val: "del", cls: "red" }
    ]);
    if (v === "card") return loyCliCard(r.phone);
    if (v === "use") await act("cliBonus", { t, sum: max }, "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \u0441\u043F\u0438\u0441\u0430\u043D\u043E");
    else if (v === "del") await act("cliSet", { t, phone: "" }, "\u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
    await loadState().catch(() => {
    });
  }
  async function loadCour() {
    S.data.cour = await api("courMe");
    renderMain();
  }
  const minsAgo = (ts) => ts ? Math.max(0, Math.round((Date.now() - ts) / 6e4)) : 0;
  function goHTML() {
    var _a2, _b, _c;
    const me = (_a2 = S.me) == null ? void 0 : _a2.name, C = S.data.cour, all = Object.values(S.tables).filter((b) => b.t > 1e3 && b.t < 2e3 && b.go && !["new", "done", "rej"].includes(b.go.st));
    const fresh = all.filter((b) => !b.go.cour), mine = all.filter((b) => b.go.cour === me).sort((a, b) => (a.go.takeAt || 0) - (b.go.takeAt || 0));
    const seen = S.courSeen || (S.courSeen = /* @__PURE__ */ new Set());
    if (S.courReady && fresh.some((b) => !seen.has(b.t)) || mine.some((b) => b.go.st === "ready" && !seen.has("r" + b.t))) {
      ding();
      ((_b = navigator.userActivation) == null ? void 0 : _b.hasBeenActive) && ((_c = navigator.vibrate) == null ? void 0 : _c.call(navigator, [200, 100, 200]));
    }
    fresh.forEach((b) => seen.add(b.t));
    mine.forEach((b) => {
      if (b.go.st === "ready") seen.add("r" + b.t);
    });
    S.courReady = true;
    const tab = S.courTab || (mine.length ? "mine" : "new");
    const items = (b) => b.items.filter((i) => !i.name.includes("\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430")).map((i) => `${i.q}\xD7 ${esc(i.name)}`).join(", ");
    const card = (b, my) => {
      const g = b.go, map = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.addr + ", \u041F\u043E\u043B\u044F\u043D\u0438\u0446\u044F")}&travelmode=driving`;
      return `<div class="cr-c st-${g.st}${g.prob ? " prob" : ""}"><div class="cr-h"><b>${tn(b.t)}</b><span class="chip">${g.when ? "\u{1F550} \u043D\u0430 " + g.when : "\u26A1 \u044F\u043A\u043D\u0430\u0439\u0448\u0432\u0438\u0434\u0448\u0435"}</span><span class="chip">${GOST[g.st]}</span><small>${minsAgo(g.accAt || g.at)} \u0445\u0432</small></div>
        ${g.st === "ready" && my ? '<div class="cr-ready">\u{1F37D} \u0413\u041E\u0422\u041E\u0412\u041E \u2014 \u0417\u0410\u0411\u0418\u0420\u0410\u0419!</div>' : ""}${g.prob ? `<div class="cr-prob">\u26A0\uFE0F ${esc(g.prob.text)}</div>` : ""}
        <a class="cr-addr" href="${map}" target="_blank" rel="noopener">\u{1F4CD} ${esc(g.addr)}${g.ent ? ` \xB7 ${esc(g.ent)}` : ""}</a>
        <div class="cr-row"><span>\u{1F464} ${esc(g.name)}</span><a class="btn sm" href="tel:+${g.phone}">\u{1F4DE} ${fmtPh(g.phone)}</a></div>
        <div class="muted">\u{1F37D} ${items(b)}${g.cut ? ` \xB7 \u{1F374} ${g.cut}` : ""}</div>
        <div class="cr-pay">${g.paid ? "\u{1F4B3} \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D" : `<b class="money">${money(b.pay2)}</b><span>${g.pay === "card" ? "\u{1F4B3} \u0442\u0435\u0440\u043C\u0456\u043D\u0430\u043B" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430"}${g.change ? ` \xB7 \u0440\u0435\u0448\u0442\u0430 \u0437 <b>${g.change}</b>` : ""}</span>`}</div>
        ${my ? `<div class="cr-act">${g.st !== "road" ? `<button class="btn green" data-a="crAct" data-t="${b.t}" data-x="road">\u{1F6F5} \u041F\u043E\u0457\u0445\u0430\u0432</button>` : `<div class="cr-eta">${g.etaC ? `<div class="cr-etac">\u23F1 \u0433\u043E\u0441\u0442\u044E \u0441\u043A\u0430\u0437\u0430\u043D\u043E: \u0431\u0443\u0434\u0443 \u043E <b>${hhmm(g.etaC)}</b></div>` : '<div class="cr-etac muted">\u23F1 \u041A\u043E\u043B\u0438 \u0431\u0443\u0434\u0435\u0442\u0435 \u0432 \u0433\u043E\u0441\u0442\u044F? \u0413\u0456\u0441\u0442\u044C \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \u0447\u0430\u0441</div>'}${[5, 10, 15, 20].map((m) => `<button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="eta" data-v="${m}">\u23F1 ${m} \u0445\u0432</button>`).join("")}</div>`}
            <button class="btn primary" data-a="crDone" data-t="${b.t}">\u{1F91D} \u0412\u0438\u0434\u0430\u043D\u043E</button></div>
          <div class="btnrow"><button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="km" data-v="soon">\u{1F4AC} \u0411\u0443\u0434\u0443 \u0437\u0430 5 \u0445\u0432</button><button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="km" data-v="here">\u{1F4AC} \u042F \u043D\u0430 \u043C\u0456\u0441\u0446\u0456</button><button class="btn sm red" data-a="crProb" data-t="${b.t}">\u26A0\uFE0F \u041F\u0440\u043E\u0431\u043B\u0435\u043C\u0430</button></div>` : `<button class="btn primary cr-take" data-a="crAct" data-t="${b.t}" data-x="take">\u270B \u0411\u0435\u0440\u0443</button>`}</div>`;
    };
    const d = (C == null ? void 0 : C.day) || { n: 0, left: 0, earn: 0, list: [] };
    const head = `<div class="cr-top"><div><h1>\u{1F6F5} ${esc(me || "")}</h1><span class="muted">${onShift() ? "\u{1F7E2} \u043D\u0430 \u0437\u043C\u0456\u043D\u0456" : "\u0437\u043C\u0456\u043D\u0443 \u043D\u0435 \u0440\u043E\u0437\u043F\u043E\u0447\u0430\u0442\u043E"}</span></div>
      <div class="btnrow">${onShift() ? '<button class="btn sm red" data-a="zpOut">\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>' : '<button class="btn sm green" data-a="zpIn">\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>'}${(C == null ? void 0 : C.bot) ? `<button class="btn sm${C.linked ? "" : " primary"}" data-a="crTg">\u2708\uFE0F ${C.linked ? "Telegram \u2713" : "\u041F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0438 Telegram"}</button>` : ""}</div></div>
      <div class="kpis cr-k"><div class="kpi"><span>\u0414\u043E\u0441\u0442\u0430\u0432\u043E\u043A \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</span><b>${d.n}</b></div><div class="kpi accent"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u043D\u0430 \u0440\u0443\u043A\u0430\u0445</span><b class="money">${money(d.left)}</b></div><div class="kpi"><span>\u{1F4B0} \u0417\u0430\u0440\u043E\u0431\u0456\u0442\u043E\u043A</span><b class="money">${money(d.earn)}</b></div></div>`;
    const tabs = `<div class="seg cr-tabs">${[["new", `\u{1F195} \u041D\u043E\u0432\u0456${fresh.length ? ` \xB7 ${fresh.length}` : ""}`], ["mine", `\u{1F6F5} \u041C\u043E\u0457${mine.length ? ` \xB7 ${mine.length}` : ""}`], ["done", `\u2705 \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \xB7 ${d.n}`]].map(([k, l]) => `<button class="${tab === k ? "on" : ""}${k === "new" && fresh.length ? " blink" : ""}" data-a="crTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    const col = {
      new: fresh.map((b) => card(b, false)).join("") || '<div class="cr-empty">\u041D\u043E\u0432\u0438\u0445 \u0434\u043E\u0441\u0442\u0430\u0432\u043E\u043A \u043D\u0435\u043C\u0430\u0454<br><small>\u0449\u043E\u0439\u043D\u043E \u0430\u0434\u043C\u0456\u043D \u043F\u0440\u0438\u0439\u043C\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u2014 \u0442\u0443\u0442 \u043F\u0440\u043E\u043B\u0443\u043D\u0430\u0454 \u0437\u0432\u0443\u043A</small></div>',
      mine: (mine.length > 1 && (C == null ? void 0 : C.route) ? `<a class="btn cr-route" href="${C.route}" target="_blank" rel="noopener">\u{1F5FA} \u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u0447\u0435\u0440\u0435\u0437 \u0443\u0441\u0456 ${mine.length} \u0430\u0434\u0440\u0435\u0441\u0438</a>` : "") + (mine.map((b) => card(b, true)).join("") || '<div class="cr-empty">\u0423 \u0432\u0430\u0441 \u043D\u0435\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0430\u0432\u043E\u043A</div>'),
      done: d.list.map((x) => `<div class="kv"><span><b>${tn(x.t)}</b> \xB7 ${x.at}${x.mins != null ? ` \xB7 \u0432 \u0434\u043E\u0440\u043E\u0437\u0456 ${x.mins} \u0445\u0432` : ""}</span><b class="money">${money(x.sum)} ${x.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</b></div>`).join("") || '<div class="cr-empty">\u0429\u0435 \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E</div>'
    };
    return head + tabs + `<div class="cr-cols t-${tab}"><section class="c-new"><h3>\u{1F195} \u041D\u043E\u0432\u0456</h3>${col.new}</section><section class="c-mine"><h3>\u{1F6F5} \u041C\u043E\u0457</h3>${col.mine}</section><section class="c-done"><h3>\u2705 \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3><div class="card">${col.done}</div></section></div>`;
  }
  function goCtlHTML() {
    var _a2;
    if (!S.data.courAt || Date.now() - S.data.courAt > 3e4) {
      S.data.courAt = Date.now();
      api("courList").then((r) => {
        S.data.cours = r;
        if (S.view === "kq") renderMain();
      }).catch(() => {
      });
    }
    const all = Object.values(S.tables).filter((b) => b.t > 1e3 && b.t < 2e3 && b.go && !["done", "rej"].includes(b.go.st)).sort((a, b) => (a.go.accAt || a.go.at || 0) - (b.go.accAt || b.go.at || 0));
    const fresh = all.filter((b) => !b.go.cour), act2 = all.filter((b) => b.go.cour);
    const items = (b) => b.items.filter((i) => !i.name.includes("\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430")).map((i) => `${i.q}\xD7 ${esc(i.name)}`).join(", ");
    const card = (b) => {
      const g = b.go, late = g.st === "new" || !g.cour && minsAgo(g.accAt || g.at) >= 3;
      return `<div class="cr-c st-${g.st}${g.prob ? " prob" : ""}${late && !g.cour ? " late" : ""}" data-t="${b.t}"><div class="cr-h"><b>${tn(b.t)}</b><span class="chip sm">${g.when ? "\u{1F550} " + g.when : "\u26A1"}</span><span class="chip sm">${GOST[g.st] || g.st}</span><small>${minsAgo(g.accAt || g.at)} \u0445\u0432</small></div>
        <div>${g.cour ? `\u{1F6F5} <b>${esc(g.cour)}</b>${g.st === "road" && g.roadAt ? ` \xB7 \u0432 \u0434\u043E\u0440\u043E\u0437\u0456 ${minsAgo(g.roadAt)} \u0445\u0432` : ""}${g.etaC ? ` \xB7 \u23F1 \u0431\u0443\u0434\u0443 \u043E ${hhmm(g.etaC)}` : ""}` : "\u26A0\uFE0F <b>\u043A\u0443\u0440'\u0454\u0440\u0430 \u043D\u0435\u043C\u0430\u0454</b>"}</div>
        ${g.prob ? `<div class="cr-prob">\u26A0\uFE0F ${esc(g.prob.text)}</div>` : ""}<div class="cr-addr">\u{1F4CD} ${esc(g.addr || "\u2014")}${g.ent ? ` \xB7 ${esc(g.ent)}` : ""} \xB7 \u{1F464} ${esc(g.name || "")}</div>
        <div class="muted">\u{1F37D} ${items(b)}</div>
        <div class="btnrow"><button class="btn sm${g.cour ? "" : " primary"}" data-a="goCourSet" data-t="${b.t}">\u{1F464} ${g.cour ? "\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u0443\u0440'\u0454\u0440\u0430" : "\u041F\u0440\u0438\u0437\u043D\u0430\u0447\u0438\u0442\u0438"}</button><button class="btn sm" data-a="table" data-t="${b.t}">\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438</button></div></div>`;
    };
    const C = ((_a2 = S.data.cours) == null ? void 0 : _a2.list) || [], done = C.flatMap((c) => (c.list || []).map((x) => __spreadProps(__spreadValues({}, x), { n: c.name }))).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const route = act2.some((b) => b.go.addr) && all.length ? `<button class="btn sm" data-a="goMap">\u{1F5FA} \u041A\u0430\u0440\u0442\u0430 \xB7 ${act2.length + fresh.length}</button>` : "";
    return `<div class="khead" style="margin-top:22px"><h1>\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 <span class="muted">${all.length}</span></h1><div class="btnrow">${route}</div></div>
      <div class="cr-cols t-all"><section><h3>\u{1F195} \u041D\u043E\u0432\u0456${fresh.length ? ` \xB7 ${fresh.length}` : ""}</h3>${fresh.map(card).join("") || '<div class="cr-empty">\u041D\u043E\u0432\u0438\u0445 \u043D\u0435\u043C\u0430\u0454</div>'}</section>
      <section><h3>\u{1F6F5} \u0412 \u0440\u043E\u0431\u043E\u0442\u0456${act2.length ? ` \xB7 ${act2.length}` : ""}</h3>${act2.map(card).join("") || '<div class="cr-empty">\u041D\u0456\u0445\u0442\u043E \u043D\u0435 \u0457\u0434\u0435</div>'}</section>
      <section><h3>\u2705 \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \xB7 ${done.length}</h3><div class="card">${done.map((x) => `<div class="kv"><span><b>${tn(x.t)}</b> \xB7 ${x.at} \xB7 ${esc(x.n)}${x.mins != null ? ` \xB7 ${x.mins} \u0445\u0432` : ""}</span><b class="money">${money(x.sum)} ${x.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</b></div>`).join("") || '<div class="cr-empty">\u0429\u0435 \u043D\u0456\u0447\u043E\u0433\u043E</div>'}</div></section></div>`;
  }
  function courCard() {
    var _a2, _b;
    const L = ((_b = (_a2 = S.data.cours) == null ? void 0 : _a2.list) == null ? void 0 : _b.filter((c) => c.n || c.left)) || [];
    if (!L.length) return "";
    return `<div class="card cr-adm"><h3>\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>${L.map((c) => `<div class="kv"><span><b>${esc(c.name)}</b> ${c.tg ? "\u2708\uFE0F" : ""}<br><small class="muted">${c.n} \u0434\u043E\u0441\u0442\u0430\u0432\u043E\u043A${c.avg != null ? ` \xB7 \u2300 ${c.avg} \u0445\u0432 \u0443 \u0434\u043E\u0440\u043E\u0437\u0456` : ""} \xB7 \u0437\u0430\u0440\u043E\u0431\u0456\u0442\u043E\u043A ${money(c.earn)}${c.given ? ` \xB7 \u0437\u0434\u0430\u0432 ${money(c.given)}` : ""}</small></span><span class="kv-r"><b class="money">${money(c.left)}</b>${c.left > 0 ? `<button class="btn sm green" data-a="crGive" data-n="${esc(c.name)}" data-v="${c.left}">\u2705 \u041E\u0442\u0440\u0438\u043C\u0430\u0432</button>` : ""}</span></div>`).join("")}</div>`;
  }
  function goSetHTML() {
    var _a2, _b, _c, _d;
    const c = S.data.gocfg;
    if (!c) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const row = (k, l, v, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ""}</span><span class="kv-r"><b>${v}</b><button class="btn sm" data-a="goCfg" data-k="${k}" data-l="${esc(l)}">${["on", "del", "pick"].includes(k) ? c[k] ? "\u0432\u0438\u043C\u043A\u043D\u0443\u0442\u0438" : "\u0443\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438" : "\u0437\u043C\u0456\u043D\u0438\u0442\u0438"}</button></span></div>`;
    const yn = (v) => v ? "\u2705 \u0442\u0430\u043A" : "\u26D4 \u043D\u0456";
    return `<div class="grid2 set">
      <div class="card"><h3>\u{1F6F5} \u041F\u0440\u0438\u0439\u043E\u043C \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C</h3>${row("on", "\u{1F310} \u041F\u0440\u0438\u0439\u043C\u0430\u0442\u0438 \u0437 \u0441\u0430\u0439\u0442\u0443", yn(c.on))}${row("pick", "\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437", yn(c.pick))}${row("del", "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", yn(c.del))}
        ${row("from", "\u{1F550} \u041F\u0440\u0438\u0439\u043C\u0430\u0454\u043C\u043E \u0437", c.from)}${row("to", "\u{1F550} \u041F\u0440\u0438\u0439\u043C\u0430\u0454\u043C\u043E \u0434\u043E", c.to, "\u041F\u043E\u0437\u0430 \u0446\u0438\u043C \u0447\u0430\u0441\u043E\u043C \u0433\u0456\u0441\u0442\u044C \u043C\u043E\u0436\u0435 \u0437\u0430\u043C\u043E\u0432\u0438\u0442\u0438 \u043B\u0438\u0448\u0435 \u043D\u0430 \u0447\u0430\u0441")}${row("prep", "\u23F1 \u0413\u043E\u0442\u0443\u0454\u043C\u043E \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u043D\u043E", c.prep + " \u0445\u0432", "\u0414\u043B\u044F \xAB\u043E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u043E \u043E\u2026\xBB \u0443 \u0433\u043E\u0441\u0442\u044F")}${row("phone", "\u{1F4DE} \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0437\u0430\u043A\u043B\u0430\u0434\u0443", esc(c.phone || "\u2014"), "\u041F\u043E\u043A\u0430\u0437\u0443\u0454\u0442\u044C\u0441\u044F \u0433\u043E\u0441\u0442\u044E \u043D\u0430 \u0435\u043A\u0440\u0430\u043D\u0456 \u0441\u0442\u0430\u0442\u0443\u0441\u0443")}</div>
      <div class="card"><h3>\u{1F4B0} \u0423\u043C\u043E\u0432\u0438</h3>${row("min", "\u{1F9FE} \u041C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", money(c.min))}${row("fee", "\u{1F6F5} \u0426\u0456\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", money(c.fee))}${row("free", "\u{1F381} \u0411\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0432\u0456\u0434", c.free ? money(c.free) : "\u2014", "0 \u2014 \u0437\u0430\u0432\u0436\u0434\u0438 \u043F\u043B\u0430\u0442\u043D\u0430")}${row("zone", "\u{1F4CD} \u0417\u043E\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", esc(c.zone || "\u2014"), "\u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u044F: \u0440\u0430\u0439\u043E\u043D\u0438, \u043C\u0435\u0436\u0456")}${row("cpay", "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0443 \u0437\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443", money(c.cpay), "\u0414\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F \u0443 \u0432\u0456\u0434\u043E\u043C\u0456\u0441\u0442\u044C \u0417\u041F; \u043C\u043E\u0436\u043D\u0430 \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u043E\u0436\u043D\u043E\u043C\u0443 \u0432 \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0456")}</div>
      <div class="card"><h3>\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C</h3>${row("cash", "\u{1F4B8} \u041A\u0435\u0448\u0431\u0435\u043A", c.cash + "%", "\u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u0456 \u0447\u0435\u043A\u0430 (\u0441\u0430\u0439\u0442, \u043A\u0430\u0441\u0430, \u0437\u0430\u043B)")}${row("bmax", "\u{1F39F} \u0411\u043E\u043D\u0443\u0441\u0430\u043C\u0438 \u043C\u043E\u0436\u043D\u0430 \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u0434\u043E", c.bmax + "%", "\u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F")}</div>
      <div class="card"><h3>\u{1F517} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u0435\u0439</h3><div class="muted set-note">\u0406\u043D\u0441\u0442\u0430\u0433\u0440\u0430\u043C, Google Maps, \u043C\u0435\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0438 \u2014 \u0433\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454 \u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0454 \u0437 \u0441\u043E\u0431\u043E\u044E. \u041E\u043A\u0440\u0435\u043C\u0456 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043F\u043E\u043A\u0430\u0437\u0443\u044E\u0442\u044C \u0443 \u0437\u0432\u0456\u0442\u0430\u0445, \u0437\u0432\u0456\u0434\u043A\u0438 \u043F\u0440\u0438\u0439\u0448\u043B\u043E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F.</div>
        <div class="btnrow"><button class="btn sm primary" data-a="goLink">\u{1F4CB} \u041E\u0441\u043D\u043E\u0432\u043D\u0435</button><button class="btn sm" data-a="goLink" data-src="insta">Instagram</button><button class="btn sm" data-a="goLink" data-src="google">Google</button><button class="btn sm" data-a="goLink" data-src="tiktok">TikTok</button></div>
</div>
      <div class="card"><h3>\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438</h3><div class="muted set-note">\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u0432 \u043A\u0430\u0441\u0456 \u043A\u043E\u0434\u043E\u043C <b>${esc(((_b = (_a2 = S.data.staff) == null ? void 0 : _a2.reg) == null ? void 0 : _b.courier) || "1114")}</b> \u2192 \u0443 \u0441\u0432\u043E\u0454\u043C\u0443 \u0435\u043A\u0440\u0430\u043D\u0456 \u043A\u0443\u0440'\u0454\u0440 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u0454 \xAB\u2708\uFE0F \u041F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0438 Telegram\xBB. \u0411\u043E\u0442 \u043A\u0443\u0440'\u0454\u0440\u0456\u0432: ${((_c = S.data.cours) == null ? void 0 : _c.bot) ? `<a href="https://t.me/${esc(S.data.cours.bot)}" target="_blank" rel="noopener">@${esc(S.data.cours.bot)}</a>` : "\u2014"}</div>
        ${(((_d = S.data.cours) == null ? void 0 : _d.list) || []).map((c2) => `<div class="kv"><span>${esc(c2.name)}</span><span class="kv-r">${c2.tg ? "\u2708\uFE0F Telegram \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : '<span class="muted">\u0431\u0435\u0437 Telegram</span>'}</span></div>`).join("") || `<div class="muted">\u041A\u0443\u0440'\u0454\u0440\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>`}</div></div>`;
  }
  function goMapBtn(gos) {
    const n = gos.filter((b) => b.t < 2e3 && b.go.addr && !["new", "done", "rej"].includes(b.go.st)).length;
    return n && isAdmin() ? `<div class="btnrow go-map"><button class="btn sm" data-a="goMap">\u{1F5FA} \u041A\u0430\u0440\u0442\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043E\u043A \xB7 ${n}</button></div>` : "";
  }
  function goTileInfo(g) {
    if (g.kind !== "del" || !g.cour) return "";
    return ` \xB7 \u{1F6F5} ${esc(g.cour)}${g.st === "road" && g.roadAt ? ` \xB7 ${minsAgo(g.roadAt)} \u0445\u0432` : ""}`;
  }
  async function goEdit(t) {
    var _a2;
    const g = (_a2 = S.tables[t]) == null ? void 0 : _a2.go;
    if (!g) return;
    const body = `<div class="form"><label>\u0406\u043C\u02BC\u044F<input id="eN" value="${esc(g.name || "")}"></label><label>\u0422\u0435\u043B\u0435\u0444\u043E\u043D<input id="eP" type="tel" value="${esc(g.phone ? "+" + g.phone : "")}"></label>
      ${g.kind === "del" ? `<label>\u0410\u0434\u0440\u0435\u0441\u0430<input id="eA" value="${esc(g.addr || "")}"></label><label>\u041F\u0456\u0434\u02BC\u0457\u0437\u0434 / \u043F\u043E\u0432\u0435\u0440\u0445<input id="eE" value="${esc(g.ent || "")}"></label>` : ""}
      <label>\u041D\u0430 \u043A\u043E\u0442\u0440\u0443<input id="eW" placeholder="19:30" value="${esc(g.when || "")}"></label><label>\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440<input id="eC" value="${esc(g.note || "")}"></label></div>`;
    const v = await modal({ title: `\u270F\uFE0F ${tn(t)}`, body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v !== "ok") return closeModal();
    const d = __spreadValues({ t, name: $("#eN").value, phone: $("#eP").value, when: $("#eW").value, note: $("#eC").value }, g.kind === "del" ? { addr: $("#eA").value, ent: $("#eE").value } : {});
    closeModal();
    if (await act("goEdit", d, "\u270F\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \xB7 \u043A\u0443\u0440'\u0454\u0440\u0443 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E")) loadState().catch(() => {
    });
  }
  async function goMap() {
    const r = await api("goMap").catch((e) => {
      toast("\u26A0\uFE0F " + (e.message || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430"));
      return null;
    });
    if (r == null ? void 0 : r.url) open(r.url, "_blank", "noopener");
  }
  async function loadCourRep(m) {
    S.data.courRep = { m, wait: 1 };
    renderMain();
    S.data.courRep = await api("courRep", { m }).catch(() => ({ m, list: [] }));
    renderMain();
  }
  function courRepHTML() {
    const R = S.data.courRep;
    if (!R) {
      setTimeout(() => loadCourRep((/* @__PURE__ */ new Date()).toISOString().slice(0, 7)));
      return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    }
    const sh = (d) => {
      const [y, mo] = R.m.split("-").map(Number), x = new Date(Date.UTC(y, mo - 1 + d, 1));
      return x.toISOString().slice(0, 7);
    };
    const PR = { noans: "\u{1F4F5}", addr: "\u{1F4CD}", refuse: "\u{1F645}" }, mn = (v) => v == null ? "\u2014" : v + " \u0445\u0432";
    const nav = `<div class="btnrow"><button class="btn sm" data-a="crRepM" data-m="${sh(-1)}">\u2039</button><b>\u{1F6F5} ${R.m}</b><button class="btn sm" data-a="crRepM" data-m="${sh(1)}">\u203A</button></div>`;
    if (R.wait) return nav + '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    if (!R.list.length) return nav + '<div class="card"><div class="muted">\u0414\u043E\u0441\u0442\u0430\u0432\u043E\u043A \u0437\u0430 \u043C\u0456\u0441\u044F\u0446\u044C \u043D\u0435\u043C\u0430\u0454</div></div>';
    return nav + `<div class="dash">${R.list.map((x) => {
      const pr = Object.entries(x.prob || {}), pn = pr.reduce((a, p) => a + p[1], 0);
      return `<div class="card"><h3>\u{1F6F5} ${esc(x.name)}</h3><div class="kv"><span>\u{1F4E6} \u0414\u043E\u0441\u0442\u0430\u0432\u043E\u043A</span><b>${x.n}</b></div><div class="kv"><span>\u{1F4B0} \u0421\u0443\u043C\u0430 \u0447\u0435\u043A\u0456\u0432</span><b class="money">${money(x.sum)}</b></div>
        <div class="kv"><span>\u{1F6E3} \u041F\u043E\u0457\u0445\u0430\u0432 \u2192 \u0432\u0438\u0434\u0430\u043D\u043E, \u0441\u0435\u0440.</span><b>${mn(x.road)}</b></div><div class="kv"><span>\u23F1 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u2192 \u0432\u0438\u0434\u0430\u043D\u043E, \u0441\u0435\u0440.</span><b>${mn(x.tot)}</b></div>
        <div class="kv"><span>\u23F0 \u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F (\u043F\u0456\u0437\u043D\u0456\u0448\u0435 \xAB\u043D\u0430 \u043A\u043E\u0442\u0440\u0443\xBB)</span><b>${x.late}</b></div><div class="kv"><span>\u26A0\uFE0F \u041F\u0440\u043E\u0431\u043B\u0435\u043C\u0438</span><b>${pn ? pr.map(([k, q]) => `${PR[k] || "\u26A0\uFE0F"} ${q}`).join(" ") : 0}</b></div></div>`;
    }).join("")}</div>`;
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a;
    if (a === "goMap") goMap();
    else if (a === "crRepM") loadCourRep(el.dataset.m);
    else if (a === "goEdit") goEdit(S.open);
  });
  async function loadBooks() {
    S.bkDay || (S.bkDay = todayK());
    const from = addD(todayK(), -7), to = addD(todayK(), 60);
    S.data.bk = (await api("bkList", { from, to, all: true })).list;
  }
  const DOW = ["\u043D\u0434", "\u043F\u043D", "\u0432\u0442", "\u0441\u0440", "\u0447\u0442", "\u043F\u0442", "\u0441\u0431"];
  function booksHTML() {
    const L0 = S.data.bk;
    if (!L0) return '<div class="head"><h1>\u0411\u0440\u043E\u043D\u0456</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const day = S.bkDay, act2 = (b) => !["no", "cancel", "noshow"].includes(b.st), cnt = (d) => L0.filter((b) => b.date === d && act2(b));
    const days = Array.from({ length: 21 }, (_, i) => addD(todayK(), i - 1));
    const strip = `<div class="bk-days">${days.map((d) => {
      const l = cnt(d), g = l.reduce((a, b) => a + b.people, 0), nw = l.some((b) => b.st === "new"), dt = /* @__PURE__ */ new Date(d + "T12:00:00");
      return `<button class="bk-d${d === day ? " on" : ""}${d === todayK() ? " td" : ""}" data-a="bkDay" data-d="${d}"><small>${d === todayK() ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : DOW[dt.getDay()]}</small><b>${d.slice(8)}.${d.slice(5, 7)}</b><span>${l.length ? `${l.length} \xB7 ${g}\u{1F464}` : "\u2014"}</span>${nw ? "<i></i>" : ""}</button>`;
    }).join("")}<label class="bk-d pick" title="\u0406\u043D\u0448\u0430 \u0434\u0430\u0442\u0430"><small>\u0434\u0430\u0442\u0430</small><b>\u{1F4C6}</b><input type="date" data-a="bkDate" value="${day}"></label></div>`;
    const newAll = L0.filter((b) => b.st === "new");
    const list = L0.filter((b) => b.date === day && (S.bkAll || act2(b)));
    const guests = list.filter(act2).reduce((a, b) => a + b.people, 0);
    const card = (b) => {
      var _a2, _b;
      return `<div class="bk-c st-${b.st}">
      <div class="bk-t"><b>${b.time}</b><small>${b.people} \u{1F464}</small></div>
      <div class="bk-m"><div class="bk-n"><b>${esc(b.name)}</b>${b.kind === "banquet" ? '<span class="chip">\u{1F389} \u0431\u0430\u043D\u043A\u0435\u0442</span>' : ""}<span class="chip bk-s">${BKS[b.st]}</span>${b.t ? `<span class="chip">\u{1FA91} ${b.t}</span>` : ""}${b.src === "\u043A\u0430\u0441\u0430" ? '<span class="chip">\u260E\uFE0F \u043A\u0430\u0441\u0430</span>' : ""}</div>
        <a href="tel:+${b.phone}">\u{1F4DE} ${fmtPh(b.phone)}</a>${b.comment ? `<div class="muted">\u{1F4AC} ${esc(b.comment)}</div>` : ""}${b.note ? `<div class="bk-note">\u{1F4CC} ${esc(b.note)}</div>` : ""}${((_a2 = b.pre) == null ? void 0 : _a2.length) ? `<div class="bk-pre">\u{1F37D} ${b.pre.map(esc).join(" \xB7 ")}${b.preSent ? ' <span class="muted">\xB7 \u043D\u0430 \u043A\u0443\u0445\u043D\u0456</span>' : ""}</div>` : ""}
        <div class="btnrow">${b.st === "new" ? `<button class="btn sm green" data-a="bkSet" data-id="${b.id}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button><button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="no">\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438</button>` : ""}
          ${b.st === "ok" ? `<button class="btn sm green" data-a="bkCame" data-id="${b.id}">\u{1FA91} \u041F\u0440\u0438\u0439\u0448\u043B\u0438</button><button class="btn sm" data-a="bkTbl" data-id="${b.id}">${b.t ? "\u{1F504} \u0421\u0442\u0456\u043B" : "\u{1FA91} \u0421\u0442\u0456\u043B"}</button>${((_b = b.pre) == null ? void 0 : _b.length) && !b.preSent ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="kit">\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u044E</button>` : ""}<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="noshow">\u{1F6AB} \u041D\u0435 \u043F\u0440\u0438\u0439\u0448\u043B\u0438</button>` : ""}
          ${["no", "cancel", "noshow", "came"].includes(b.st) ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="ok">\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</button>` : ""}
          <button class="btn sm" data-a="bkEd" data-id="${b.id}">\u270F\uFE0F</button>${["new", "ok"].includes(b.st) ? `<button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="cancel" title="\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438">\u{1F5D1}</button>` : ""}</div></div></div>`;
    };
    return `<div class="rhead"><div><h1>\u0411\u0440\u043E\u043D\u0456</h1><span class="muted">${day === todayK() ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : DOW[(/* @__PURE__ */ new Date(day + "T12:00:00")).getDay()] + ", " + day.slice(8) + "." + day.slice(5, 7)} \xB7 ${list.filter(act2).length} \u0431\u0440\u043E\u043D\u044C \xB7 ${guests} \u0433\u043E\u0441\u0442\u0435\u0439</span></div><button class="btn primary" data-a="bkNew">\u2795 \u0411\u0440\u043E\u043D\u044C</button></div>
      ${newAll.length ? `<div class="bk-alert">\u{1F195} \u0427\u0435\u043A\u0430\u044E\u0442\u044C \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F: ${newAll.map((b) => `<button class="chip" data-a="bkDay" data-d="${b.date}">${b.date === todayK() ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : b.date.slice(8) + "." + b.date.slice(5, 7)} ${b.time} \xB7 ${esc(b.name)}</button>`).join("")}</div>` : ""}
      ${strip}<div class="seg rsec" style="margin:10px 0"><button class="${S.bkAll ? "" : "on"}" data-a="bkAll" data-v="">\u0410\u043A\u0442\u0438\u0432\u043D\u0456</button><button class="${S.bkAll ? "on" : ""}" data-a="bkAll" data-v="1">\u0423\u0441\u0456, \u0437 \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u0438\u043C\u0438</button></div>
      <div class="bk-grid">${list.map(card).join("") || '<div class="muted" style="padding:20px 4px">\u041D\u0430 \u0446\u0435\u0439 \u0434\u0435\u043D\u044C \u0431\u0440\u043E\u043D\u0435\u0439 \u043D\u0435\u043C\u0430\u0454</div>'}</div>`;
  }
  async function bkForm(b) {
    const v0 = b || { kind: "table", date: S.bkDay || todayK(), time: "19:00", people: 2, name: "", phone: "", comment: "", note: "", t: 0 };
    const body = `<div class="form"><div class="seg" id="bkK"><button class="${v0.kind !== "banquet" ? "on" : ""}" data-k="table">\u{1F4C5} \u0421\u0442\u0456\u043B</button><button class="${v0.kind === "banquet" ? "on" : ""}" data-k="banquet">\u{1F389} \u0411\u0430\u043D\u043A\u0435\u0442</button></div>
      <div class="frow"><label>\u0422\u0435\u043B\u0435\u0444\u043E\u043D<input id="bP" type="tel" inputmode="tel" value="${esc(v0.phone ? "0" + v0.phone.slice(3) : "")}"></label><label>\u0406\u043C\u02BC\u044F<input id="bN" value="${esc(v0.name)}"></label></div>
      <div class="frow"><label>\u0414\u0430\u0442\u0430<input id="bD" type="date" value="${v0.date}"></label><label>\u0427\u0430\u0441<input id="bT" type="time" step="900" value="${v0.time}"></label></div>
      <div class="frow"><label>\u0413\u043E\u0441\u0442\u0435\u0439<input id="bG" type="number" inputmode="numeric" min="1" max="60" value="${v0.people}"></label><label>\u0421\u0442\u0456\u043B<select id="bS"><option value="0">\u2014</option>${Array.from({ length: S.n }, (_, i) => i + 1).map((n) => `<option ${+v0.t === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
      <label>\u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F<input id="bC" value="${esc(v0.comment || "")}"></label><label>\u{1F4CC} \u041D\u043E\u0442\u0430\u0442\u043A\u0430 \u0434\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443<input id="bO" value="${esc(v0.note || "")}" placeholder="\u043D\u0430\u043F\u0440. \u0442\u043E\u0440\u0442 \u0441\u0432\u0456\u0439, VIP, \u0434\u0435\u043F\u043E\u0437\u0438\u0442"></label></div>`;
    const pr = modal({ title: b ? "\u270F\uFE0F \u0411\u0440\u043E\u043D\u044C" : "\u2795 \u041D\u043E\u0432\u0430 \u0431\u0440\u043E\u043D\u044C", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    let kind = v0.kind;
    $("#bkK").onclick = (e) => {
      var _a2;
      const k = (_a2 = e.target.closest("[data-k]")) == null ? void 0 : _a2.dataset.k;
      if (!k) return;
      kind = k;
      $("#bkK").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.k === k));
    };
    if (!b) $("#bP").onchange = async () => {
      var _a2;
      const r2 = await api("cliGet", { phone: $("#bP").value }).catch(() => null);
      if (((_a2 = r2 == null ? void 0 : r2.cli) == null ? void 0 : _a2.name) && !$("#bN").value) $("#bN").value = r2.cli.name;
    };
    const v = await pr;
    if (v !== "ok") return closeModal();
    const f = { kind, phone: $("#bP").value, name: $("#bN").value, date: $("#bD").value, time: $("#bT").value, people: $("#bG").value, t: +$("#bS").value, comment: $("#bC").value, note: $("#bO").value };
    closeModal();
    const r = b ? await act("bkEdit", { id: b.id, f }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E") : await act("bkNew", { f }, "\u{1F4C5} \u0411\u0440\u043E\u043D\u044C \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E");
    if (r) {
      S.bkDay = r.b.date;
      await loadBooks().catch(() => {
      });
      renderMain();
      loadState().catch(() => {
      });
    }
  }
  async function bdGiftT(t) {
    var _a2;
    const ph = ((_a2 = S.tables[t]) == null ? void 0 : _a2.cli) || await askVal("\u{1F382} \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0456\u043C\u0435\u043D\u0438\u043D\u043D\u0438\u043A\u0430 (\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)", "", "tel");
    if (!ph) return;
    const p = await act("certBd", { t, phone: ph });
    if (!(p == null ? void 0 : p.pick)) return;
    const i = await choose("\u{1F382} \u0429\u043E \u043F\u043E\u0434\u0430\u0440\u0443\u0432\u0430\u0442\u0438?", "\u041E\u0434\u043D\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u044F \u0437 \u0447\u0435\u043A\u0430 \u2014 \u0437\u0430 \u0457\u0457 \u0446\u0456\u043D\u043E\u044E", p.pick.map((x) => ({ label: `${x.n} \xB7 ${money(x.p)}${x.q > 1 ? ` (\u0443 \u0447\u0435\u043A\u0443 ${x.q})` : ""}`, val: String(x.i) })));
    if (i == null) return;
    const r = await act("certBd", { t, phone: ph, item: i });
    if (r) {
      toast(`\u{1F382} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A: ${r.gift} \u2212${money(r.use)}`);
      loadState().catch(() => {
      });
    }
  }
  async function certT(t) {
    const code = await ask("\u{1F39F} \u041A\u043E\u0434 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0430", "VV-XXXXX");
    if (!code) return;
    const g = await api("certGet", { code }).catch((e) => {
      toast("\u26A0\uFE0F " + e.message);
      return null;
    });
    if (!g) return;
    if (g.c.st !== "ok") return toast(g.c.st === "new" ? "\u26A0\uFE0F \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0449\u0435 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" : "\u26A0\uFE0F \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
    if (!await confirmBox(`\u{1F39F} ${g.c.code} \u2014 ${money(g.c.left)} \u0437 ${money(g.c.sum)}`, `\u0412\u0456\u0434 ${g.c.from}${g.c.to ? " \u0434\u043B\u044F " + g.c.to : ""}. \u0421\u043F\u0438\u0441\u0430\u0442\u0438 \u043D\u0430 \u0446\u0435\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A?`)) return;
    const r = await act("certUse", { t, code });
    if (r) {
      toast(`\u{1F39F} \u2212${money(r.use)} \xB7 \u0437\u0430\u043B\u0438\u0448\u043E\u043A ${money(r.left)}`);
      loadState().catch(() => {
      });
    }
  }
  async function siteImg(hero, logo) {
    const f = await new Promise((res) => {
      const i = document.createElement("input");
      i.type = "file";
      i.accept = "image/*";
      i.onchange = () => res(i.files[0]);
      i.click();
    });
    if (!f) return;
    const img = await new Promise((r2) => {
      const im = new Image();
      im.onload = () => r2(im);
      im.src = URL.createObjectURL(f);
    }), k = Math.min(1, (logo ? 512 : 1600) / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = img.width * k;
    c.height = img.height * k;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const r = await act("sitePhoto", { data: logo ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82), hero: !!hero, logo: !!logo }, logo ? "\u{1F5BC} \u041B\u043E\u0433\u043E\u0442\u0438\u043F \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E" : "\u{1F4F7} \u0424\u043E\u0442\u043E \u0434\u043E\u0434\u0430\u043D\u043E");
    if (r) {
      S.data.site = r.site;
      if (logo) {
        S.brand = __spreadProps(__spreadValues({}, S.brand), { logo: r.url });
        store.set("brand", S.brand);
        applyBrand();
      }
      renderMain();
    }
  }
  function venueHTML() {
    const s = S.data.site;
    if (!s) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const link = location.origin + location.pathname + (VENUE ? "?venue=" + VENUE : "");
    return `<div class="grid2 set">
      <div class="card"><h3>\u{1F3EA} \u0417\u0430\u043A\u043B\u0430\u0434</h3><button class="sf press" data-a="siteSet" data-k="name" data-l="\u041D\u0430\u0437\u0432\u0430 \u0437\u0430\u043A\u043B\u0430\u0434\u0443"><i>\u{1F37D}</i><span><small>\u041D\u0430\u0437\u0432\u0430 \u0437\u0430\u043A\u043B\u0430\u0434\u0443</small><b>${esc(s.name || "\u043D\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u043E")}</b></span><em>\u270F\uFE0F</em></button>
        <div class="muted set-note">\u041D\u0430\u0437\u0432\u0430 \u2014 \u0443 \u043A\u0430\u0441\u0456, \u0443 \u0432\u0456\u043A\u043D\u0456 \u0432\u0445\u043E\u0434\u0443, \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 \u0439 \u0443 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F\u0445 \u0431\u043E\u0442\u0456\u0432 \u0433\u043E\u0441\u0442\u044F\u043C.</div></div>
      <div class="card"><h3>\u{1F5BC} \u041B\u043E\u0433\u043E\u0442\u0438\u043F</h3><div style="display:flex;gap:14px;align-items:center"><button class="brand-up press" data-a="siteImg" data-l="1">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : "<span>\u2795</span>"}</button><div class="muted" style="font-size:13px">\u041D\u0430\u0439\u043A\u0440\u0430\u0449\u0435 \u2014 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u0438\u0439 PNG.${s.logo ? '<br><button class="btn sm" data-a="siteDel" data-k="logo" data-v="" style="margin-top:8px">\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u043B\u043E\u0433\u043E\u0442\u0438\u043F</button>' : ""}</div></div></div>
      <div class="card"><h3>\u{1F517} \u041A\u0430\u0441\u0430 \u0434\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443</h3><div class="kv"><span style="min-width:0;overflow-wrap:anywhere"><small class="muted">${esc(link)}</small></span><button class="btn sm" data-a="copyLink" data-u="${esc(link)}">\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438</button></div>
        <div class="muted set-note">\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u043D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0456 \u0447\u0438 \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0456 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u2014 \u0434\u0430\u043B\u0456 \u043A\u043E\u0434 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457, \u0456\u043C'\u044F \u0439 PIN.</div></div></div>`;
  }
  function siteHTML() {
    const s = S.data.site;
    if (!s) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const U = "https://666blackmuxa666.github.io/VARVAR/about.html" + (VENUE ? "?venue=" + VENUE : "");
    const f = (k, ic, l, v, ph) => `<button class="sf press" data-a="siteSet" data-k="${k}" data-l="${esc(l)}"><i>${ic}</i><span><small>${l}</small><b class="${v ? "" : "muted"}">${v ? esc(v) : esc(ph || "\u043D\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u043E")}</b></span><em>\u270F\uFE0F</em></button>`;
    const sw2 = (k, l, hint) => `<button class="sf press" data-a="siteTgl" data-k="${k}"><span><b>${l}</b><small>${hint}</small></span><span class="switch ${s[k] ? "on" : ""}"></span></button>`;
    const item = (id) => itemsAll().find((i) => i.id === id);
    return `<div class="site-top card"><div><h3>\u{1F310} \u0421\u0430\u0439\u0442-\u0432\u0456\u0437\u0438\u0442\u043A\u0430</h3><span class="muted">\u0417\u043C\u0456\u043D\u0438 \u0437\u02BC\u044F\u0432\u043B\u044F\u044E\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 \u043E\u0434\u0440\u0430\u0437\u0443</span></div><div class="btnrow"><a class="btn sm primary" href="${U}" target="_blank" rel="noopener">\u{1F517} \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438</a><button class="btn sm" data-a="siteCopy">\u{1F4CB} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F</button></div></div>
    <div class="grid2 set">
      <div class="card"><h3>\u{1F3F7} \u041E\u0441\u043D\u043E\u0432\u043D\u0435</h3>${f("tagline", "\u2728", "\u0421\u043B\u043E\u0433\u0430\u043D", s.tagline)}${f("about", "\u{1F4DD}", "\u041F\u0440\u043E \u043D\u0430\u0441", s.about)}</div>
      <div class="card"><h3>\u{1F4CD} \u041A\u043E\u043D\u0442\u0430\u043A\u0442\u0438</h3>${f("phone", "\u{1F4DE}", "\u0422\u0435\u043B\u0435\u0444\u043E\u043D", s.phone)}${f("addr", "\u{1F4CD}", "\u0410\u0434\u0440\u0435\u0441\u0430", s.addr)}
        <div class="sf2">${f("from", "\u{1F550}", "\u0412\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454\u043C\u043E\u0441\u044C", s.from)}${f("to", "\u{1F559}", "\u0417\u0430\u0447\u0438\u043D\u044F\u0454\u043C\u043E\u0441\u044C", s.to)}</div></div>
      <div class="card"><h3>\u{1F4F7} \u0424\u043E\u0442\u043E</h3>
        <button class="site-hero press" data-a="siteImg" data-h="1" style="${s.hero ? `background-image:url('${esc(s.hero)}')` : ""}"><span>${s.hero ? "\u{1F504} \u0417\u0430\u043C\u0456\u043D\u0438\u0442\u0438 \u0433\u043E\u043B\u043E\u0432\u043D\u0435 \u0444\u043E\u0442\u043E" : "\u{1F5BC} \u0414\u043E\u0434\u0430\u0442\u0438 \u0433\u043E\u043B\u043E\u0432\u043D\u0435 \u0444\u043E\u0442\u043E"}</span></button>
        <div class="site-gal">${s.photos.map((u) => `<div style="background-image:url('${esc(u)}')"><button data-a="siteDel" data-k="photoDel" data-v="${esc(u)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438">\u2715</button></div>`).join("")}<button class="add press" data-a="siteImg">\uFF0B<small>\u0433\u0430\u043B\u0435\u0440\u0435\u044F</small></button></div></div>
      <div class="card"><h3>\u{1F37D} \u0425\u0456\u0442\u0438 \u043C\u0435\u043D\u044E</h3><div class="site-hits">${s.hits.length ? s.hits.map((id) => {
      const it = item(id);
      return it ? `<span>${it.img ? `<i style="background-image:url('${esc(it.img)}')"></i>` : ""}${esc(it.name.uk)}</span>` : "";
    }).join("") : '<span class="muted">\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u2014 \u0441\u0442\u0440\u0430\u0432\u0438 \u0437 \u0444\u043E\u0442\u043E</span>'}</div><button class="btn sm" data-a="siteHits" style="margin-top:10px">\u270F\uFE0F \u041E\u0431\u0440\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0438</button></div>
      <div class="card"><h3>\u{1F389} \u0410\u043A\u0446\u0456\u0457 \u0442\u0430 \u043F\u043E\u0434\u0456\u0457</h3>${s.promos.map((p) => `<div class="site-promo"><div><b>${esc(p.t)}</b>${p.d ? `<small>${esc(p.d)}</small>` : ""}</div><button class="btn sm red" data-a="siteDel" data-k="promoDel" data-v="${p.id}">\u{1F5D1}</button></div>`).join("") || '<div class="muted set-note">\u041D\u0435\u043C\u0430\u0454 \u2014 \u0431\u043B\u043E\u043A \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 \u043F\u0440\u0438\u0445\u043E\u0432\u0430\u043D\u0438\u0439</div>'}<button class="btn sm primary" data-a="sitePromo">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0430\u043A\u0446\u0456\u044E</button></div>
      <div class="card"><h3>\u2B50 \u0412\u0456\u0434\u0433\u0443\u043A\u0438</h3><div class="sf2">${f("rating", "\u2B50", "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 Google", s.rating ? String(s.rating) : "", "\u2014")}${f("ratingN", "\u{1F4AC}", "\u0412\u0456\u0434\u0433\u0443\u043A\u0456\u0432", s.ratingN ? String(s.ratingN) : "", "0")}</div>
        ${s.quotes.map((q, i) => `<div class="site-promo"><div><i>\xAB${esc(q.t)}\xBB</i><small>\u2014 ${esc(q.a)}</small></div><button class="btn sm red" data-a="siteDel" data-k="quoteDel" data-v="${i}">\u{1F5D1}</button></div>`).join("")}<button class="btn sm" data-a="siteQuote">\u2795 \u0426\u0438\u0442\u0430\u0442\u0430 \u0432\u0456\u0434\u0433\u0443\u043A\u0443</button>
        ${S.data.rates ? `<div class="site-rate"><b>${S.data.rates.avg || "\u2014"}</b><span>\u043E\u0446\u0456\u043D\u043A\u0430 \u0433\u043E\u0441\u0442\u0435\u0439 \u0443 \u0431\u043E\u0442\u0456 \u0437\u0430 30 \u0434\u043D\u0456\u0432 \xB7 ${S.data.rates.n} \u043E\u0446\u0456\u043D\u043E\u043A</span></div>` : ""}</div>
      <div class="card"><h3>\u{1F517} \u0421\u043E\u0446\u043C\u0435\u0440\u0435\u0436\u0456 \u0439 \u043A\u0430\u0440\u0442\u0438</h3>${f("insta", "\u{1F4F8}", "Instagram", s.insta, "https://instagram.com/\u2026")}${f("tg", "\u2708\uFE0F", "Telegram-\u043A\u0430\u043D\u0430\u043B", s.tg, "https://t.me/\u2026")}${f("gmaps", "\u{1F5FA}", "Google Maps", s.gmaps)}${f("reviewsUrl", "\u270D\uFE0F", "\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \xAB\u0417\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0432\u0456\u0434\u0433\u0443\u043A\xBB", s.reviewsUrl)}</div>
      <div class="card"><h3>\u{1F389} \u0411\u0430\u043D\u043A\u0435\u0442\u0438 \xB7 \u{1F4A8} \u041A\u0430\u043B\u044C\u044F\u043D\u0438</h3>${f("banquet", "\u{1F389}", "\u0411\u0430\u043D\u043A\u0435\u0442\u0438 \u0439 \u043A\u0435\u0439\u0442\u0435\u0440\u0438\u043D\u0433", s.banquet)}${f("hookah", "\u{1F4A8}", "\u041A\u0430\u043B\u044C\u044F\u043D\u0438", s.hookah)}</div>
      <div class="card"><h3>\u2699\uFE0F \u0424\u0443\u043D\u043A\u0446\u0456\u0457 \u0441\u0430\u0439\u0442\u0443</h3>${sw2("bookOn", "\u{1F4C5} \u0411\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F", "\u0424\u043E\u0440\u043C\u0430 \u0431\u0440\u043E\u043D\u0456 \u0439 \u0431\u0430\u043D\u043A\u0435\u0442\u0456\u0432 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456")}${sw2("certOn", "\u{1F39F} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u043E\u0432\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", "\u0417\u0430\u044F\u0432\u043A\u0438 \u043D\u0430 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0437 \u0441\u0430\u0439\u0442\u0443")}<button class="btn sm" data-a="certs" style="margin-top:10px">\u{1F39F} \u0423\u0441\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438</button></div>
    </div>`;
  }
  async function loadKq() {
    const r = await api("kitchen");
    const list = r.list || [];
    const ids = list.filter((e) => !e.done).map((e) => e.id), canc = list.flatMap((e) => e.items.filter((x) => x.cancel || x.canc).map((x) => e.id + x.n + (x.canc || 0)));
    if (S.kqSeen) {
      const nw = list.filter((e) => !e.done && !S.kqSeen.has(e.id));
      if (nw.length) kPlay(kSndCur(), nw.some((e) => e.urgent));
      else if (canc.some((c) => !S.kqCanc.has(c))) beep();
    }
    S.kqSeen = new Set(list.map((e) => e.id));
    S.kqCanc = new Set(canc);
    S.kq = list;
    if (S.view === "kq") renderMain();
  }
  function tone(freqs, dur, vol = 0.6) {
    var _a2;
    try {
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      (_a2 = actx.resume) == null ? void 0 : _a2.call(actx);
      let d = 0;
      for (const f of freqs) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.setValueAtTime(vol, actx.currentTime + d);
        g.gain.setValueAtTime(1e-4, actx.currentTime + d + dur);
        o.connect(g).connect(actx.destination);
        o.start(actx.currentTime + d);
        o.stop(actx.currentTime + d + dur);
        d += dur;
      }
    } catch (e) {
    }
  }
  function siren(urgent) {
    var _a2;
    try {
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      (_a2 = actx.resume) == null ? void 0 : _a2.call(actx);
      const t0 = actx.currentTime, dur = 4, per = urgent ? 0.25 : 0.5;
      const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
      o.type = "sawtooth";
      o2.type = "square";
      for (let t = 0; t < dur; t += per) {
        [o, o2].forEach((x, k) => {
          x.frequency.setValueAtTime(k ? 650 : 600, t0 + t);
          x.frequency.linearRampToValueAtTime(k ? 1450 : 1400, t0 + t + per / 2);
          x.frequency.linearRampToValueAtTime(k ? 650 : 600, t0 + t + per);
        });
      }
      g.gain.setValueAtTime(1e-4, t0);
      g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.05);
      g.gain.setValueAtTime(0.7, t0 + dur - 0.1);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
      o.connect(g);
      o2.connect(g);
      g.connect(actx.destination);
      o.start(t0);
      o2.start(t0);
      o.stop(t0 + dur);
      o2.stop(t0 + dur);
    } catch (e) {
    }
  }
  const beep = () => tone([440, 330], 0.2, 0.4);
  const KSND = {
    alarm: ["\u{1F6A8} \u0421\u0438\u0433\u043D\u0430\u043B\u0456\u0437\u0430\u0446\u0456\u044F"],
    siren: ["\u{1F4E2} \u0421\u0438\u0440\u0435\u043D\u0430", () => ["square", [...Array(16)].map((_, i) => [i % 2 ? 1200 : 700, i * 0.25, 0.25])]],
    bell: ["\u{1F514} \u0414\u0437\u0432\u0456\u043D\u043E\u0447\u043E\u043A", () => ["sine", [0, 1, 2, 3].flatMap((r) => [1047, 1319, 1568, 2093].map((f, i) => [f, r + i * 0.18, 0.5]))]],
    phone: ["\u260E\uFE0F \u0421\u0442\u0430\u0440\u0438\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D", () => ["square", [0, 1, 2, 3].flatMap((r) => [...Array(12)].map((_, i) => [i % 2 ? 1600 : 1300, r + i * 0.05, 0.05]))]],
    fanfare: ["\u{1F3BA} \u0424\u0430\u043D\u0444\u0430\u0440\u0438", () => ["triangle", [[523, 0, 0.2], [659, 0.2, 0.2], [784, 0.4, 0.2], [1047, 0.6, 0.6], [784, 1.3, 0.2], [1047, 1.5, 0.9], [523, 2.6, 0.2], [659, 2.8, 0.2], [784, 3, 0.2], [1047, 3.2, 0.8]]]],
    beep: ["\u{1F4DF} \u0411\u0456\u043F-\u0431\u0456\u043F", () => ["square", [...Array(8)].map((_, i) => [1760, i * 0.5, 0.22])]],
    duck: ["\u{1F986} \u041A\u0430\u0447\u043A\u0430 (\u0406\u0433\u043E\u0440)", null, "snd/duck.mp3"],
    marimba: ["\u{1F3B5} \u041C\u0435\u043B\u043E\u0434\u0456\u044F", () => ["sine", [659, 784, 880, 784, 659, 587, 523, 587, 659, 784, 659, 523, 587, 523].map((f, i) => [f, i * 0.28, 0.26])]]
  };
  const kBufs = {};
  async function kPlay(k, urgent) {
    var _a2;
    const D = KSND[k] || KSND.alarm;
    if (!D[1] && !D[2]) return siren(urgent);
    try {
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      (_a2 = actx.resume) == null ? void 0 : _a2.call(actx);
      if (D[2]) {
        kBufs[k] || (kBufs[k] = await actx.decodeAudioData(await (await fetch(D[2])).arrayBuffer()));
        const src = actx.createBufferSource();
        src.buffer = kBufs[k];
        src.connect(actx.destination);
        src.start();
        return;
      }
      const [type, notes] = D[1](), t0 = actx.currentTime + 0.05;
      for (const [f, st, du] of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(1e-4, t0 + st);
        g.gain.linearRampToValueAtTime(0.6, t0 + st + 0.01);
        g.gain.setValueAtTime(0.6, t0 + st + du * 0.8);
        g.gain.linearRampToValueAtTime(1e-4, t0 + st + du);
        o.connect(g).connect(actx.destination);
        o.start(t0 + st);
        o.stop(t0 + st + du + 0.02);
      }
    } catch (e) {
      siren(urgent);
    }
  }
  const kSndCur = () => store.get("ksnd", "alarm");
  function kSndPick() {
    const cur = kSndCur();
    modal({ title: "\u{1F514} \u0417\u0432\u0443\u043A \u043D\u043E\u0432\u043E\u0433\u043E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", body: `<div class="form">${Object.entries(KSND).map(([k, [l]]) => `<div class="kv"><span>${l}${k === cur ? " \u2705" : ""}</span><span style="display:flex;gap:6px"><button class="btn sm" data-a="kSndTry" data-k="${k}">\u25B6</button><button class="btn sm primary" data-mi-v="${k}">\u041E\u0431\u0440\u0430\u0442\u0438</button></span></div>`).join("")}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: "", cls: "" }] }).then((k) => {
      if (k && KSND[k]) {
        store.set("ksnd", k);
        toast("\u{1F514} " + KSND[k][0]);
        kPlay(k);
      }
    });
  }
  let wakeLock;
  async function kitchenStart() {
    var _a2, _b, _c, _d;
    (_a2 = $("#kGate")) == null ? void 0 : _a2.remove();
    tone([660], 0.05, 0.01);
    try {
      await ((_c = (_b = document.documentElement).requestFullscreen) == null ? void 0 : _c.call(_b));
    } catch (e) {
    }
    try {
      wakeLock = await ((_d = navigator.wakeLock) == null ? void 0 : _d.request("screen"));
    } catch (e) {
    }
  }
  function kitchenGate() {
    if ($("#kGate")) return;
    const g = document.createElement("div");
    g.id = "kGate";
    g.innerHTML = '<button class="btn primary" data-a="kGo">\u{1F50A} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443<small>\u0443\u0432\u0456\u043C\u043A\u043D\u0435 \u0437\u0432\u0443\u043A \u0441\u0438\u0440\u0435\u043D\u0438 \u0439 \u043F\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D</small></button>';
    document.body.appendChild(g);
  }
  function kqHTML() {
    var _a2;
    const now = Date.now(), act0 = S.kq.filter((e) => !e.done).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.ts - b.ts), done = S.kq.filter((e) => e.done).slice(-6).reverse();
    const card = (e) => {
      const m = Math.floor((now - e.ts) / 6e4), tc = m >= 15 ? "red" : m >= 10 ? "yel" : "";
      return `<div class="kc${e.urgent ? " urg" : ""}${e.start ? " cook" : " new"}"><div class="kh"><b>\u0421\u0442\u0456\u043B ${tn(e.t)}</b><span class="tm ${tc}">\u23F1 ${m} \u0445\u0432</span></div>
        <div class="km">${e.at} \xB7 ${esc(e.by)}${e.src === "\u0433\u0456\u0441\u0442\u044C" ? " \xB7 \u{1F4F1} \u0441\u0430\u0439\u0442" : ""}</div>
        ${e.urgent ? '<div class="ktag urg">\u26A1 \u0422\u0415\u0420\u041C\u0406\u041D\u041E\u0412\u041E</div>' : ""}${e.tw ? '<div class="ktag">\u{1F961} \u0417 \u0421\u041E\u0411\u041E\u042E</div>' : ""}${e.comment ? `<div class="kcom">\u{1F4AC} ${esc(e.comment)}</div>` : ""}
        <div class="ki">${e.items.map((x, i) => `<div class="kit-w"><button class="kit${x.done ? " done" : ""}${x.cancel ? " canc" : ""}" data-a="kItem" data-id="${e.id}" data-i="${i}" ${x.cancel ? "disabled" : ""}><b>${x.q}\xD7</b> ${esc(x.n)}${x.cancel ? " <em>\u0421\u041A\u0410\u0421\u041E\u0412\u0410\u041D\u041E</em>" : x.canc ? ` <em>\u2212${x.canc} \u0441\u043A\u0430\u0441.</em>` : ""}</button><button class="kinfo" data-a="skTechOne" data-n="${esc(x.n)}" title="\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430">\u24D8</button></div>`).join("")}</div>
        ${(e.msgs || []).map((x) => `<div class="kmsg">\u{1F4E8} ${x.at} ${esc(x.text)}</div>`).join("")}
        <div class="kb">${e.start ? "" : `<button class="btn" data-a="kStart" data-id="${e.id}">\u{1F525} \u0413\u043E\u0442\u0443\u044E</button>`}<button class="btn" data-a="kMsg" data-id="${e.id}">\u{1F4AC}</button><button class="btn green" data-a="kAll" data-id="${e.id}">\u2705 \u0412\u0421\u0415 \u0413\u041E\u0422\u041E\u0412\u041E</button></div></div>`;
    };
    return `<div class="khead"><h1>\u{1F468}\u200D\u{1F373} \u0427\u0435\u0440\u0433\u0430 <span class="muted">${act0.length}</span></h1>${isCook() ? `<div class="stat tipstat">\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456<b class="money">${money(((_a2 = S.myTip) == null ? void 0 : _a2.sum) || 0)}</b></div>` : ""}<button class="btn" data-a="kSnd">\u{1F514} \u0417\u0432\u0443\u043A</button><button class="btn" data-a="skKStock">\u{1F4E6} \u0421\u043A\u043B\u0430\u0434</button><button class="btn" data-a="view" data-v="stop">\u26D4 \u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</button></div>
      <div class="kq f${S.kFont}">${act0.length ? act0.map(card).join("") : '<div class="kempty">\u2705 \u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>'}</div>
      ${done.length ? `<h3 class="muted" style="margin:18px 0 8px">\u041E\u0441\u0442\u0430\u043D\u043D\u0456 \u0433\u043E\u0442\u043E\u0432\u0456</h3><div class="kdone">${done.map((e) => `<div class="kd">\u0421\u0442\u0456\u043B ${tn(e.t)} \xB7 ${e.items.filter((x) => !x.cancel).map((x) => `${x.q}\xD7 ${esc(x.n)}`).join(", ")}${e.cancelled ? " \xB7 \u274C \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" : ` \xB7 ${Math.round((e.doneAt - e.ts) / 6e4)} \u0445\u0432`} <button class="btn sm" data-a="kUndo" data-id="${e.id}">\u21A9\uFE0F</button></div>`).join("")}</div>` : ""}${isAdmin() ? goCtlHTML() : ""}`;
  }
  function cashHTML() {
    const ctab = S.cashTab || "day", cseg = `<div class="seg rsec cseg">${[["day", "\u{1F4B0} \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["checks", "\u{1F9FE} \u0427\u0435\u043A\u0438"]].map(([k, l]) => `<button class="${ctab === k ? "on" : ""}" data-a="cashTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    if (ctab === "checks") return cseg + closedHTML();
    return cseg + courCard() + cashHTML0();
  }
  function cashHTML0() {
    const r = S.data.shift;
    if (!r) return '<div class="head"><h1>\u041A\u0430\u0441\u0430</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const z = r.z, pc = z.total ? Math.round(z.cash / z.total * 100) : 0;
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });
    const B = r.bal, sg = (n) => (n > 0 ? "+" : n < 0 ? "\u2212" : "") + money(Math.abs(n));
    const balH = B ? `<div class="bal">
      <button class="bal-c" data-a="balInfo" data-s="cash"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0456</span><b class="money">${money(B.cash)}</b><small>\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438</small></button>
      <button class="bal-c" data-a="balInfo" data-s="card"><span>\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u0446\u0456</span><b class="money">${money(B.card)}</b><small>\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438</small></button>
      <div class="bal-c tot"><span>\u{1F4B0} \u0420\u0430\u0437\u043E\u043C</span><b class="money">${money(B.total)}</b><small>${B.tipOwed ? `\u0437 \u043D\u0438\u0445 \u0447\u0430\u0439\u043E\u0432\u0456 ${money(B.tipOwed)} \xB7 \u0432\u0456\u043B\u044C\u043D\u0438\u0445 <b>${money(B.free)}</b>` : `\u0437 ${B.from ? B.from.split("-").reverse().join(".") : "\u2014"}`}</small></div></div>` : "";
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</div><div class="hero-n money">${money(z.total)}</div>${z.tip ? `<div class="muted" style="font-size:13px">\u0431\u0435\u0437 \u0447\u0430\u0439\u043E\u0432\u0438\u0445 \xB7 + \u{1F49D} ${money(z.tip)} \u0447\u0430\u0439\u043E\u0432\u0456 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443</div>` : ""}
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(z.cash)}</b></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430 <b class="money">${money(z.card)}</b></span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">\u{1F9FE} Z-\u0437\u0432\u0456\u0442<small>\u043F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \xB7 \u0434\u0440\u0443\u043A \xB7 \u0437\u0430\u043A\u0440\u0438\u0442\u0438 \u0434\u0435\u043D\u044C</small></button></div>`;
    const tiles = [["\u{1F9FE} \u0427\u0435\u043A\u0456\u0432", z.checks], ["\xD8 \u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", z.checks ? money(z.total / z.checks) : "\u2014"], ["\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(z.disc)], ["\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", money(z.tip || 0)], ["\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", money(z.exCash + z.exCard)], ["\u{1F4C8} \u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(z.net), "green"], ["\u23F3 \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0432 \u0437\u0430\u043B\u0456", z.openTables ? `${money(z.openSum)} \xB7 ${z.openTables} \u0441\u0442.` : "\u2014"]];
    const tilesH = `<div class="widgets">${tiles.map(([l, v, c]) => `<div class="widget ${c || ""}"><span>${l}</span><b class="money">${v}</b></div>`).join("")}</div>`;
    const ops = `<div class="card"><h3>\u26A1 \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457</h3><div class="opsg"><button class="btn" data-a="expense">\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430</button><button class="btn" data-a="cMove" data-t="+">\u2795 \u0412\u043D\u0435\u0441\u0442\u0438</button><button class="btn" data-a="cMove" data-t="-">\u2796 \u0412\u0438\u043B\u0443\u0447\u0438\u0442\u0438</button><button class="btn" data-a="cMove" data-t="x">\u{1F501} \u041E\u0431\u043C\u0456\u043D</button></div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u0412\u0438\u0442\u0440\u0430\u0442\u0430 \u2014 \u043A\u0443\u043F\u0438\u043B\u0438 \u0449\u043E\u0441\u044C \xB7 \u0412\u043D\u0435\u0441\u0442\u0438 / \u0432\u0438\u043B\u0443\u0447\u0438\u0442\u0438 \u2014 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u0447\u0438 \u0437\u0430\u0431\u0440\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 (\u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E \u0430\u0431\u043E \u0437 \u043A\u0430\u0440\u0442\u043A\u0438 \u0424\u041E\u041F: \u0441\u043E\u0431\u0456, \u043F\u043E\u0434\u0430\u0442\u043A\u0438) \xB7 \u041E\u0431\u043C\u0456\u043D \u2014 \u043A\u0430\u0440\u0442\u043A\u0430 \u2194 \u0433\u043E\u0442\u0456\u0432\u043A\u0430</div></div>`;
    const kv = (l, v, cls = "") => `<div class="kv ${cls}"><span>${l}</span><b class="money">${v}</b></div>`;
    const all = "";
    const mvH = z.mvCash || z.mvCard ? `<div class="card"><h3>\u{1F501} \u0420\u0443\u0445 \u043A\u043E\u0448\u0442\u0456\u0432 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>${kv("\u0413\u043E\u0442\u0456\u0432\u043A\u0430", (z.mvCash > 0 ? "+" : "") + money(z.mvCash))}${z.mvCard ? kv("\u041A\u0430\u0440\u0442\u043A\u0430", (z.mvCard > 0 ? "+" : "") + money(z.mvCard)) : ""}</div>` : "";
    const tb = Object.entries(r.tipbal || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tipsH = `<div class="card"><h3>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0434\u043E \u0432\u0438\u0434\u0430\u0447\u0456</h3>${tb.length ? tb.map(([n, v]) => `<div class="kv"><span>\u{1F464} ${esc(n)}</span><span><b class="money">${money(v)}</b> <button class="btn sm green" data-a="tipPay" data-n="${esc(n)}">\u0412\u0438\u0434\u0430\u043D\u043E</button></span></div>`).join("") : '<div class="muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u043A\u043E\u043F\u0438\u0447\u0435\u043D\u043E</div>'}
      ${(r.tippay || []).length ? `<div class="muted" style="font-size:12px;margin-top:8px">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0432\u0438\u0434\u0430\u043D\u043E: ${r.tippay.map((x) => `${x.at} ${esc(x.name)} ${money(x.sum)}`).join(" \xB7 ")}</div>` : ""}<div class="muted" style="font-size:12px;margin-top:6px">\u0427\u0430\u0439\u043E\u0432\u0456 \u2014 \u043D\u0435 \u0432\u0438\u0440\u0443\u0447\u043A\u0430 (\u0433\u0440\u043E\u0448\u0456 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443); \u043B\u0435\u0436\u0430\u0442\u044C \u0443 \u043A\u0430\u0441\u0456, \u043F\u043E\u043A\u0438 \u043D\u0435 \u0432\u0438\u0434\u0430\u043D\u0456, \u0456 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F \u0437 \u0433\u043E\u0442\u0456\u0432\u043A\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438 \u043F\u0440\u0438 \u0432\u0438\u0434\u0430\u0447\u0456.</div></div>`;
    const MC = { in: 1, out: 1, k2c: 1, c2k: 1, tipc: 1, adjc: 1, salc: 1 }, MK = { k2c: 1, c2k: 1, kin: 1, tipk: 1, kout: 1, adjk: 1, salk: 1 };
    const chk = (x, part) => {
      var _a2;
      const k = +x.card || 0, c = (_a2 = x.cash) != null ? _a2 : x.sum - k, v = part === "card" ? k : c;
      return v > 0 ? { at: x.at, ic: part === "card" ? "\u{1F4B3}" : "\u{1F4B5}", t: `\u0421\u0442\u0456\u043B ${tn(x.t)}${x.by ? " \xB7 " + esc(x.by) : ""}${x.disc ? ` \xB7 \u2212${x.disc}%` : ""}${x.tip ? ` \xB7 \u{1F49D} ${money(x.tip)}` : ""}${k && c ? " \xB7 \u0437\u043C\u0456\u0448\u0430\u043D\u0430" : ""}`, v: "+" + money(v), cls: "in" } : null;
    };
    const jlist = (part) => [
      ...(r.closed || []).filter((x) => !x.del && !x.rm).map((x) => chk(x, part)).filter(Boolean),
      ...r.exp.map((e, i) => ({ e, i })).filter(({ e }) => e.src === "card" === (part === "card")).map(({ e, i }) => ({ at: e.at, ic: "\u{1F4B8}", t: esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430"), v: "\u2212" + money(e.sum), cls: "out", del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` })),
      ...(r.mov || []).map((m, i) => ({ m, i })).filter(({ m }) => (part === "card" ? MK : MC)[m.type]).map(({ m, i }) => ({ at: m.at, ic: "\u{1F501}", t: MOVE[m.type] + (m.note ? " \xB7 " + esc(m.note) : ""), v: money(m.sum), cls: "mv", del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const jcard = (title, J) => `<div class="card"><h3>${title} <span class="muted" style="font-weight:400;font-size:13px">\xB7 ${J.length}</span></h3>${J.length ? J.map((x) => `<div class="jr ${x.cls}${x.del ? " del" : ""}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : "<i></i>"}</div>`).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}</div>`;
    const journal = jcard("\u{1F4B5} \u0416\u0443\u0440\u043D\u0430\u043B \u0433\u043E\u0442\u0456\u0432\u043A\u0438 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", jlist("cash")) + jcard("\u{1F4B3} \u0416\u0443\u0440\u043D\u0430\u043B \u043A\u0430\u0440\u0442\u043A\u0438 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", jlist("card"));
    return `<div class="head"><h1>\u041A\u0430\u0441\u0430</h1></div>${balH}${hero}${tilesH}<div class="cash-grid"><div class="col">${journal}</div><div class="col">${tipsH}${ops}${mvH}${all}</div></div>`;
  }
  const MOVE = { in: "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F", out: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F", k2c: "\u{1F501} \u041A\u0430\u0440\u0442\u043A\u0430 \u2192 \u0433\u043E\u0442\u0456\u0432\u043A\u0430", c2k: "\u{1F501} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u043A\u0430\u0440\u0442\u043A\u0430", tipc: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", tipk: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u043A\u0430\u0440\u0442\u043A\u0430)", kin: "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443", kout: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F \u0437 \u043A\u0430\u0440\u0442\u043A\u0438", adjc: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u0433\u043E\u0442\u0456\u0432\u043A\u0438", adjk: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u043A\u0430\u0440\u0442\u043A\u0438", salc: "\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", salk: "\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430 (\u043A\u0430\u0440\u0442\u043A\u0430)" };
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
    if (t === "+") {
      t = await choose("\u2795 \u0412\u043D\u0435\u0441\u0442\u0438", "\u041A\u0443\u0434\u0438 \u0434\u043E\u0434\u0430\u0442\u0438 \u0433\u0440\u043E\u0448\u0456?", [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0443", val: "in", cls: "primary" }, { label: "\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443", val: "kin", cls: "primary" }]);
      if (!t) return;
    }
    if (t === "-") {
      t = await choose("\u2796 \u0412\u0438\u043B\u0443\u0447\u0438\u0442\u0438", "\u0417\u0432\u0456\u0434\u043A\u0438 \u0437\u0430\u0431\u0440\u0430\u0442\u0438 \u0433\u0440\u043E\u0448\u0456?", [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", val: "out", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u043A\u0438", val: "kout", cls: "primary" }]);
      if (!t) return;
    }
    if (t === "x") {
      t = await choose("\u{1F501} \u041E\u0431\u043C\u0456\u043D", "\u0417\u0432\u0456\u0434\u043A\u0438 \u043A\u0443\u0434\u0438 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u044F\u0442\u044C \u0433\u0440\u043E\u0448\u0456?", [{ label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430 \u2192 \u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430", val: "k2c" }, { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u0430", val: "c2k" }]);
      if (!t) return;
    }
    const v = await modal({
      title: MOVE[t],
      text: t === "k2c" ? "\u0417\u043D\u044F\u043B\u0438 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438 \u0439 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u0432 \u043A\u0430\u0441\u0443" : t === "c2k" ? "\u0412\u0437\u044F\u043B\u0438 \u0437 \u043A\u0430\u0441\u0438 \u0439 \u043F\u043E\u043A\u043B\u0430\u043B\u0438 \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443" : t === "in" ? "\u041F\u043E\u043A\u043B\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u0432 \u043A\u0430\u0441\u0443" : t === "kin" ? "\u0417\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A/\u043A\u0430\u0440\u0442\u043A\u0443 \u0424\u041E\u041F" : t === "kout" ? "\u0417\u043D\u044F\u043B\u0438 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 \u0424\u041E\u041F: \u0441\u043E\u0431\u0456, \u043F\u043E\u0434\u0430\u0442\u043A\u0438, \u0437\u0430\u043A\u0443\u043F\u043A\u0430" : "\u0417\u0430\u0431\u0440\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u0437 \u043A\u0430\u0441\u0438",
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
  async function zDay() {
    const r = await api("shift").catch(() => null), z = r == null ? void 0 : r.z;
    if (!z) return toast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438");
    const kv = (l, v2, st = "") => `<div class="kv"${st}><span>${l}</span><b class="money">${v2}</b></div>`, sg = (n) => (n > 0 ? "+" : "") + money(n);
    const B = r.bal, tb = Object.entries(z.tipBy || {});
    const body = `<div class="card" style="margin:0 0 10px">${kv("\u{1F9FE} \u0427\u0435\u043A\u0456\u0432", z.checks)}${kv("\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", money(z.cash))}${kv("\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430", money(z.card))}${z.disc ? kv("\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(z.disc)) : ""}
        ${kv('<b>\u{1F4C8} \u0412\u0438\u0440\u0443\u0447\u043A\u0430</b> <small class="muted">\u0431\u0435\u0437 \u0447\u0430\u0439\u043E\u0432\u0438\u0445</small>', money(z.total), ' style="font-size:17px"')}</div>
      ${z.tip ? `<div class="card" style="margin:0 0 10px">${kv("\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443)", money(z.tip))}${tb.map(([n, v2]) => kv("\u{1F464} " + esc(n), money(v2))).join("")}</div>` : ""}
      <div class="card" style="margin:0 0 10px">${kv("\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438" + (z.exCard ? ` <small class="muted">\u0437 \u043A\u0430\u0440\u0442\u043A\u0438 ${money(z.exCard)}</small>` : ""), money(z.exCash + z.exCard))}${z.mvCash ? kv("\u{1F501} \u0420\u0443\u0445 \u0433\u043E\u0442\u0456\u0432\u043A\u0438", sg(z.mvCash)) : ""}${z.mvCard ? kv("\u{1F501} \u0420\u0443\u0445 \u043A\u0430\u0440\u0442\u043A\u0438", sg(z.mvCard)) : ""}${z.salOut ? kv("\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430", money(z.salOut)) : ""}
        ${kv("<b>\u{1F4B0} \u0427\u0438\u0441\u0442\u0438\u043C\u0438</b>", money(z.net))}${B ? kv("\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0456 \u0437\u0430\u0440\u0430\u0437", money(B.cash)) + kv("\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u0446\u0456 \u0437\u0430\u0440\u0430\u0437", money(B.card)) : ""}</div>
      ${z.openTables ? `<div class="muted" style="color:var(--red)">\u26A0\uFE0F \u0429\u0435 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0441\u0442\u043E\u043B\u0456\u0432: ${z.openTables} \u043D\u0430 ${money(z.openSum)}</div>` : ""}`;
    const v = await modal({ title: `\u{1F9FE} Z-\u0437\u0432\u0456\u0442 \xB7 ${z.day.split("-").reverse().join(".")}`, body, buttons: [{ label: "\u{1F5A8} \u041D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438", val: "x", cls: "primary" }, { label: "\u{1F512} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0434\u0435\u043D\u044C", val: "z", cls: "green" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0432\u0456\u043A\u043D\u043E", val: null }] });
    if (v === "x") await act("zX", {}, "\u{1F5A8} X-\u0437\u0432\u0456\u0442 \u043D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u043E (\u0434\u0435\u043D\u044C \u043D\u0435 \u0437\u0430\u043A\u0440\u0438\u0442\u043E)");
    if (v === "z") {
      const p = await choose("\u{1F512} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0434\u0435\u043D\u044C?", `Z-\u0437\u0432\u0456\u0442 ${money(z.total)} \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u0432 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u0439 \u043F\u0456\u0434\u0435 \u0432 Telegram`, [{ label: "\u{1F5A8} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0439 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438", val: "p", cls: "primary" }, { label: "\u{1F4F2} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0431\u0435\u0437 \u0434\u0440\u0443\u043A\u0443", val: "n" }]);
      if (p && await act("zDay", { print: p === "p" }, "\u{1F512} \u0414\u0435\u043D\u044C \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 Z-\u0437\u0432\u0456\u0442 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) loadView();
    }
  }
  async function cEdit(ref, day) {
    var _a2, _b, _c;
    const [cl, st] = await Promise.all([api("closed", { day }).catch(() => null), api("staff").catch(() => null)]);
    if (!S.menu) await loadMenu().catch(() => {
    });
    const l = (cl == null ? void 0 : cl.list) || [], x = l.find((e) => e.id === ref) || (/^\d+$/.test(ref) ? l[+ref] : null);
    if (!x) return toast("\u0427\u0435\u043A \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E");
    if (x.del || x.rm) return toast("\u0427\u0435\u043A \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u2014 \u0441\u043F\u0435\u0440\u0448\u0443 \u043F\u043E\u0432\u0435\u0440\u043D\u0456\u0442\u044C");
    const E = { items: (x.dishes || []).map((d) => [...d]), disc: x.disc || 0, tip: x.tip || 0, pay: x.card && ((_a2 = x.cash) != null ? _a2 : 0) ? "mix" : x.card ? "card" : "cash", cash: (_b = x.cash) != null ? _b : x.sum, w: x.w || x.by || "", t: x.t };
    const opts = itemsAll().flatMap((it) => it.variants ? it.variants.map((v) => [`${it.name.uk} ${v.v} ${it.size || "\u043B"}`.trimEnd(), v.p]) : [[it.name.uk, it.price]]);
    const names = [...new Set(((st == null ? void 0 : st.staff) || []).filter((s) => s.role !== "courier").map((s) => s.name))];
    const calc = () => {
      var _a3;
      const g = E.items.reduce((a, d) => a + d[2], 0), oG = (x.dishes || []).reduce((a, d) => a + d[2], 0) || ((_a3 = x.gross) != null ? _a3 : x.sum - (x.tip || 0) + (x.discSum || 0)), other = Math.max(0, oG - (x.discSum || 0) - (x.sum - (x.tip || 0)));
      const ds = !E.disc ? 0 : E.disc === (x.disc || 0) && g === oG && x.discSum != null ? x.discSum : Math.round(g * E.disc / 100);
      return { g, ds, other, sum: Math.max(0, g - ds - other) + E.tip };
    };
    const draw = () => {
      const c = calc(), m = $("#ceBody");
      if (!m) return;
      m.innerHTML = `<div class="card" style="margin:0 0 10px">${E.items.map(([n, q, s], i) => `<div class="kv"><span>${esc(n)}</span><span class="kv-r" style="flex-wrap:nowrap;gap:4px"><button class="btn sm" data-ce="m" data-i="${i}">\u2212</button><b>${q}</b><button class="btn sm" data-ce="p" data-i="${i}">+</button><b class="money" style="min-width:64px;text-align:right">${money(s)}</b><button class="xb" data-ce="x" data-i="${i}">\u2715</button></span></div>`).join("") || '<div class="muted">\u041F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}
        <div class="frow" style="margin-top:8px"><select id="ceAdd" style="flex:1;min-width:0"><option value="">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u0437 \u043C\u0435\u043D\u044E\u2026</option>${opts.map(([n, p2], i) => `<option value="${i}">${esc(n)} \u2014 ${p2}</option>`).join("")}</select></div></div>
        <div class="form"><label>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0430, %<input id="ceDisc" inputmode="numeric" value="${E.disc}"></label><label>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456, \u20B4<input id="ceTip" inputmode="decimal" value="${E.tip}"></label>
        <label>\u{1F4B3} \u041E\u043F\u043B\u0430\u0442\u0430<select id="cePay">${[["cash", "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430"], ["card", "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430"], ["mix", "\u{1F4B5}+\u{1F4B3} \u0417\u043C\u0456\u0448\u0430\u043D\u043E"]].map(([k, n]) => `<option value="${k}" ${E.pay === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        ${E.pay === "mix" ? `<label>\u{1F4B5} \u0417 \u043D\u0438\u0445 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E, \u20B4<input id="ceCash" inputmode="decimal" value="${E.cash}"></label>` : ""}
        <label>\u{1F464} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442<select id="ceW">${[.../* @__PURE__ */ new Set([E.w, ...names])].filter(Boolean).map((n) => `<option ${n === E.w ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label><label>\u{1FA91} \u0421\u0442\u0456\u043B<input id="ceT" inputmode="numeric" value="${E.t}"></label></div>
        <div class="kv" style="font-size:18px;margin-top:8px"><span><b>\u0420\u0430\u0437\u043E\u043C</b> <small class="muted">${c.ds ? `\u0437\u043D\u0438\u0436\u043A\u0430 \u2212${money(c.ds)}` : ""}${c.other ? ` \xB7 \u0431\u043E\u043D\u0443\u0441\u0438 \u2212${money(c.other)}` : ""}${E.tip ? ` \xB7 \u{1F49D} ${money(E.tip)}` : ""}</small></span><b class="money">${money(c.sum)}</b></div>
        <div class="muted" style="font-size:12px">\u0411\u0443\u043B\u043E ${money(x.sum)}. \u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0434\u043D\u044F, \u0433\u043E\u0442\u0456\u0432\u043A\u0430/\u043A\u0430\u0440\u0442\u043A\u0430, \u0442\u043E\u043F \u0441\u0442\u0440\u0430\u0432, \u0447\u0430\u0439\u043E\u0432\u0456 \u0439 \u0441\u043A\u043B\u0430\u0434 \u0432\u0438\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u043D\u0430 \u0440\u0456\u0437\u043D\u0438\u0446\u044E.</div>
        ${(x.edits || []).length ? `<div class="muted" style="font-size:12px;margin-top:6px">\u270F\uFE0F ${x.edits.map((e) => `${e.at} ${esc(e.by)}: ${esc(e.what)}`).join("<br>\u270F\uFE0F ")}</div>` : ""}`;
    };
    const num = (id) => {
      var _a3;
      return +String(((_a3 = $(id)) == null ? void 0 : _a3.value) || 0).replace(",", ".") || 0;
    };
    const read = () => {
      if (!$("#ceDisc")) return;
      E.disc = Math.max(0, Math.min(100, Math.round(num("#ceDisc"))));
      E.tip = Math.max(0, Math.round(num("#ceTip")));
      E.pay = $("#cePay").value;
      if ($("#ceCash")) E.cash = Math.round(num("#ceCash"));
      E.w = $("#ceW").value;
      E.t = Math.round(num("#ceT")) || x.t;
    };
    const p = modal({ title: `\u270F\uFE0F \u0427\u0435\u043A \xB7 \u0441\u0442\u0456\u043B ${tn(x.t)} \xB7 ${x.at}`, body: '<div id="ceBody"></div>', buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] });
    draw();
    const box = $("#modal");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ce]");
      if (!b) return;
      read();
      const i = +b.dataset.i, d = E.items[i], u = d[1] ? d[2] / d[1] : 0;
      if (b.dataset.ce === "p") {
        d[1]++;
        d[2] = Math.round(u * d[1]);
      } else if (b.dataset.ce === "m" && d[1] > 1) {
        d[1]--;
        d[2] = Math.round(u * d[1]);
      } else E.items.splice(i, 1);
      draw();
    });
    box.addEventListener("change", (e) => {
      read();
      if (e.target.id === "ceAdd" && e.target.value !== "") {
        const [n, pr] = opts[+e.target.value], d = E.items.find((z) => z[0] === n);
        if (d) {
          d[2] += Math.round(d[2] / d[1]);
          d[1]++;
        } else E.items.push([n, 1, pr]);
      }
      draw();
    });
    box.addEventListener("input", (e) => {
      if (["ceDisc", "ceTip", "ceCash"].includes(e.target.id)) {
        read();
        const c = calc(), t = box.querySelector('.kv[style*="18px"] b.money');
        if (t) t.textContent = money(c.sum);
      }
    });
    if (!await p) return;
    if (!E.items.length) return toast("\u0427\u0435\u043A \u0431\u0435\u0437 \u043F\u043E\u0437\u0438\u0446\u0456\u0439 \u2014 \u043A\u0440\u0430\u0449\u0435 \xAB\u{1F5D1} \u0417 \u0432\u0438\u0440\u0443\u0447\u043A\u0438\xBB");
    const r = await act("closedEdit", { ref: x.id || ref, day: cl.day, p: { items: E.items, disc: E.disc, tip: E.tip, pay: E.pay, cash: E.cash, w: E.w, t: E.t } });
    if (r) {
      toast(((_c = r.what) == null ? void 0 : _c.length) ? "\u270F\uFE0F \u0427\u0435\u043A \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E" : "\u0411\u0435\u0437 \u0437\u043C\u0456\u043D");
      S.data.range = null;
      loadView();
    }
  }
  function perRange(p) {
    var _a2, _b;
    const now = new Date(Date.now() - ((_b = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b : 3) * 36e5), day = 864e5, y = now.getFullYear(), mo = now.getMonth();
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
    const [from, to] = perRange(S.rep.p), key = from + "|" + to, [pf, pt] = prevRange(from, to), cmp = S.rep.p !== "all";
    if (S.data.rangeKey !== key) {
      S.data.range = null;
      S.data.prev = null;
      S.data.rangeKey = key;
      renderMain();
    }
    const [res, ks, prev] = await Promise.all([api("report", { from, to }).catch(() => null), api("kStats", { from, to }).catch(() => null), cmp ? api("report", { from: pf, to: pt }).catch(() => null) : null]);
    if (S.data.rangeKey !== key) return;
    S.data.kstats = (ks == null ? void 0 : ks.list) || [];
    S.data.prev = prev && prev.checks.length ? prev : null;
    S.data.range = res || S.data.range || { checks: [], exp: [], z: [] };
  }
  const SECS = [["overview", "\u{1F4C8} \u041E\u0433\u043B\u044F\u0434", ["overview"]], ["sales", "\u{1F37D} \u041F\u0440\u043E\u0434\u0430\u0436\u0456", ["dishes", "cats", "groups", "tables", "days", "wd"]], ["staff", "\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B", ["waiters", "tips", "ctrl", "kitchen", "cour"]], ["money", "\u{1F4B0} \u0413\u0440\u043E\u0448\u0456", ["checks", "exp", "mov", "z"]]];
  const TABS = { dishes: "\u{1F37D} \u0421\u0442\u0440\u0430\u0432\u0438", cats: "\u{1F4C2} \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457", groups: "\u{1F373} \u041A\u0443\u0445\u043D\u044F/\u0431\u0430\u0440", tables: "\u{1FA91} \u0421\u0442\u043E\u043B\u0438", days: "\u{1F4C5} \u0414\u043D\u0456", wd: "\u{1F5D3} \u0414\u043D\u0456 \u0442\u0438\u0436\u043D\u044F", waiters: "\u{1F464} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438", tips: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", ctrl: "\u{1F575}\uFE0F \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C", kitchen: "\u23F1 \u041A\u0443\u0445\u043D\u044F", cour: "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438", checks: "\u{1F9FE} \u0427\u0435\u043A\u0438", exp: "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", mov: "\u{1F501} \u0420\u0443\u0445 \u043A\u043E\u0448\u0442\u0456\u0432", z: "\u{1F512} Z-\u0437\u0432\u0456\u0442\u0438" };
  const WD = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u041D\u0434"], wdOf = (d) => ((/* @__PURE__ */ new Date(d + "T12:00:00Z")).getUTCDay() + 6) % 7;
  const hOrd = (h) => {
    const n = parseInt(h, 10) || 0;
    return n < 3 ? n + 24 : n;
  };
  const addDays = (d, n) => {
    const x = /* @__PURE__ */ new Date(d + "T12:00:00Z");
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };
  const daysIn = (a, b) => {
    const out = [];
    for (let d = a; d <= b && out.length < 4e3; d = addDays(d, 1)) out.push(d);
    return out;
  };
  const share = (a, b) => b ? Math.round(a / b * 1e3) / 10 : 0;
  const ACC = ["var(--accent)", "var(--blue)", "var(--purple)", "var(--green)", "var(--orange)"];
  function prevRange(from, to) {
    const n = daysIn(from, to).length;
    return [addDays(from, -n), addDays(from, -1)];
  }
  function repChecks(r) {
    const R = S.rep, dishF = R.grp || R.cat || R.q.trim(), q = R.q.trim().toLowerCase();
    const dishOk = (n) => {
      if (!dishF) return true;
      const x = dishOf(n);
      if (R.grp && (x == null ? void 0 : x.grp) !== R.grp) return false;
      if (R.cat && (x == null ? void 0 : x.cat) !== R.cat) return false;
      return !q || n.toLowerCase().includes(q);
    };
    const checks = ((r == null ? void 0 : r.checks) || []).filter((c) => (!R.pay || (R.pay === "card" ? c.card > 0 : c.cash > 0)) && (!R.by || (c.w || c.by) === R.by || c.by === R.by) && (!R.t || String(c.t) === R.t)).map((c) => {
      const ds = c.dishes.filter(([n]) => dishOk(n));
      return __spreadProps(__spreadValues({}, c), { ds, val: dishF ? ds.reduce((a, [, , s]) => a + s, 0) : c.sum - (c.tip || 0) });
    }).filter((c) => !dishF || c.ds.length);
    return { checks, dishF };
  }
  function repStats(r) {
    if (!r) return null;
    const R = S.rep, { checks, dishF } = repChecks(r), sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
    const total = sum(checks, (c) => c.val), n = checks.length, exp = R.by || R.t || dishF || R.pay ? null : sum(r.exp, (e) => e.sum);
    const tipOut = sum((r.mov || []).filter((m) => m.type === "tipc" || m.type === "tipk"), (m) => m.sum), salOut = sum((r.mov || []).filter((m) => m.type === "salc" || m.type === "salk"), (m) => m.sum);
    return { checks, dishF, total, n, avg: n ? total / n : 0, qty: sum(checks, (c) => sum(c.ds, (d) => d[1])), cash: sum(checks, (c) => c.cash), card: sum(checks, (c) => c.card), disc: sum(checks, (c) => c.disc), tip: sum(checks, (c) => c.tip), exp, tipOut, net: exp == null ? null : total - exp - salOut, salOut };
  }
  const delta = (a, b, inv) => {
    if (b == null || !isFinite(b) || !b) return "";
    const p = Math.round((a - b) / Math.abs(b) * 100);
    return `<em class="dl ${(inv ? -p : p) > 0 ? "up" : (inv ? -p : p) < 0 ? "down" : ""}" title="\u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u043F\u0435\u0440\u0456\u043E\u0434: ${money(b)}">${p > 0 ? "\u25B2" : p < 0 ? "\u25BC" : "="} ${Math.abs(p)}%</em>`;
  };
  const kfmt = (v) => !v ? "" : v >= 1e5 ? Math.round(v / 1e3) + "\u043A" : v >= 1e3 ? (Math.round(v / 100) / 10).toString().replace(".", ",") + "\u043A" : String(Math.round(v));
  const colChart = (pts) => {
    const max = Math.max(1, ...pts.map((p) => p[1])), n = pts.length, many = n > 16, sum = pts.reduce((a, p) => a + p[1], 0), nz = pts.filter((p) => p[1]).length, avg = nz ? sum / nz : 0;
    return `<div class="cread muted">\u0422\u043E\u0440\u043A\u043D\u0456\u0442\u044C\u0441\u044F \u0441\u0442\u043E\u0432\u043F\u0447\u0438\u043A\u0430 \u2014 \u0441\u0443\u043C\u0430 \u0439 \u0434\u0435\u043D\u044C${avg ? ` \xB7 \u0441\u0435\u0440\u0435\u0434\u043D\u0454 ${money(avg)}` : ""}</div><div class="cols${many ? " many" : ""}" onmouseover="const c=event.target.closest('.c');if(c)this.previousElementSibling.textContent=c.title">${pts.map(([l, v, t, d], i) => {
      const wd = d ? wdOf(d) : -1, we = wd === 5 || wd === 6;
      return `<div class="c${d ? " press" : ""}${we ? " we" : ""}${v === max && v ? " top" : ""}"${d ? ` data-a="rDay" data-d="${d}"` : ""} title="${esc(t)}"><b class="cv">${kfmt(v)}</b><i style="height:${v ? Math.max(3, v / max * 86) : 0}%"></i><small${many && i % Math.ceil(n / 10) && i !== n - 1 ? ' class="nl"' : ""}>${esc(l)}${d ? `<span>${WD[wd].slice(0, 2)}</span>` : ""}</small></div>`;
    }).join("")}</div>`;
  };
  const barRows = (rows, unit, tot, sub) => {
    const max = Math.max(1, ...rows.map((x) => x[1][1]));
    return rows.length ? rows.map(([k, [qq, ss]]) => `<div class="bar"><div class="bl"><span>${esc(k)}</span><span class="muted">${sub ? sub(qq, ss) : `${qq} ${unit}`}</span><span class="muted pct">${share(ss, tot)}%</span><b class="money">${money(ss)}</b></div><i style="width:${Math.max(2, ss / max * 100)}%"></i></div>`).join("") : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445 \u0437\u0430 \u0446\u0438\u043C\u0438 \u0444\u0456\u043B\u044C\u0442\u0440\u0430\u043C\u0438</div>';
  };
  function reportsHTML() {
    var _a2;
    const R = S.rep, [from, to] = perRange(R.p), r = S.data.range;
    if (!SECS.some((s) => s[2].includes(R.tab))) R.tab = "overview";
    const sec = SECS.find((s) => s[2].includes(R.tab));
    if (R.tab === "plus") return `<div class="rhead"><div><h1>\u0417\u0432\u0456\u0442\u0438</h1><span class="muted">\u0444\u0443\u0434\u043A\u043E\u0441\u0442, \u043F\u0440\u0438\u0431\u0443\u0442\u043E\u043A \u0441\u0442\u0440\u0430\u0432, \u043D\u0435\u0441\u0442\u0430\u0447\u0456 \u0439 \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F</span></div></div><div class="seg rsec">${SECS.map(([k, l]) => `<button class="${sec[0] === k ? "on" : ""}" data-a="rSec" data-s="${k}">${l}</button>`).join("")}</div><div class="sk" style="margin-top:12px">${skRepHTML()}</div>`;
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
    const checks0 = r ? r.checks : [];
    const waiters = [...new Set(checks0.flatMap((c) => [c.w, c.by]).filter(Boolean))].sort(), tables = [...new Set(checks0.map((c) => c.t))].sort((a, b) => a - b);
    const cats = S.menu ? S.menu.categories.filter((c) => !R.grp || (S.groups.find((g) => g.id === R.grp) || { cats: [] }).cats.includes(c.id)) : [];
    const nF = [R.pay, R.by, R.grp, R.cat, R.t, R.q.trim()].filter(Boolean).length;
    const dm = (d) => d.split("-").reverse().slice(0, from.slice(0, 4) === to.slice(0, 4) ? 2 : 3).join(".");
    const head = `<div class="rhead"><div><h1>\u0417\u0432\u0456\u0442\u0438</h1><span class="muted">${from === to ? dm(from) : dm(from) + " \u2014 " + dm(to)}${S.data.prev ? " \xB7 \u043F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0437 \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u043C\u0438 " + daysIn(from, to).length + " \u0434\u043D." : ""}</span></div>
      <button class="btn sm ${nF ? "primary" : ""}" data-a="rFo">\u2699\uFE0F \u0424\u0456\u043B\u044C\u0442\u0440\u0438${nF ? ` \xB7 ${nF}` : ""}</button></div>
      <div class="chips scroll">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? "on" : ""}" data-a="rp" data-p="${k}">${l}</button>`).join("")}</div>
      ${R.p === "c" ? `<div class="frow" style="margin-top:10px"><label>\u0417<input type="date" id="rFrom" value="${from}"></label><label>\u041F\u043E<input type="date" id="rTo" value="${to}"></label></div>` : ""}`;
    const filters = R.fo || nF ? `<div class="filters" style="margin-top:10px">${R.fo ? `<div class="frow">
        <label>\u041E\u043F\u043B\u0430\u0442\u0430<select data-f="pay">${opt("", "\u0423\u0441\u0456", R.pay)}${opt("cash", "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", R.pay)}${opt("card", "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430", R.pay)}</select></label>
        <label>\u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442<select data-f="by">${opt("", "\u0423\u0441\u0456", R.by)}${waiters.map((w) => opt(w, w, R.by)).join("")}</select></label>
        <label>\u0413\u0440\u0443\u043F\u0430<select data-f="grp">${opt("", "\u0423\u0441\u0435", R.grp)}${S.groups.map((g) => opt(g.id, g.name, R.grp)).join("")}</select></label>
        <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F<select data-f="cat">${opt("", "\u0423\u0441\u0456", R.cat)}${cats.map((c) => opt(c.id, c.name.uk, R.cat)).join("")}</select></label>
        <label>\u0421\u0442\u0456\u043B<select data-f="t">${opt("", "\u0423\u0441\u0456", R.t)}${tables.map((t) => opt(String(t), "\u0421\u0442\u0456\u043B " + tn(t), R.t)).join("")}</select></label>
        <label>\u0421\u0442\u0440\u0430\u0432\u0430<input id="rQ" placeholder="\u{1F50E} \u043D\u0430\u0437\u0432\u0430" value="${esc(R.q)}"></label></div>` : ""}
        ${nF ? `<div class="chips">${[R.pay && (R.pay === "card" ? "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430"), R.by && "\u{1F464} " + R.by, R.grp && (S.groups.find((g) => g.id === R.grp) || {}).name, R.cat && (((_a2 = cats.find((c) => c.id === R.cat)) == null ? void 0 : _a2.name.uk) || R.cat), R.t && "\u0421\u0442\u0456\u043B " + tn(R.t), R.q.trim() && "\u{1F50E} " + R.q.trim()].filter(Boolean).map((x) => `<span class="chip on sm">${esc(x)}</span>`).join("")}<button class="chip" data-a="rReset">\u2715 \u0421\u043A\u0438\u043D\u0443\u0442\u0438</button></div>` : ""}</div>` : "";
    if (!r) return head + filters + '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const st = repStats(r), pv = repStats(S.data.prev), { checks, dishF } = st, gross = st.total + st.disc;
    const kpi = (l, v, raw, pr, cls) => `<div class="kpi ${cls || ""}"><span>${l}</span><b class="money">${v}</b>${pv ? delta(raw, pr) : ""}</div>`;
    const kpis = `<div class="kpis">${kpi("\u0412\u0438\u0440\u0443\u0447\u043A\u0430", money(st.total), st.total, pv == null ? void 0 : pv.total, "accent")}${kpi("\u0427\u0435\u043A\u0456\u0432", st.n, st.n, pv == null ? void 0 : pv.n)}${kpi("\u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", st.n ? money(st.avg) : "\u2014", st.avg, pv == null ? void 0 : pv.avg)}${st.net != null ? kpi("\u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(st.net), st.net, pv == null ? void 0 : pv.net, "green") : kpi("\u041F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439", st.qty, st.qty, pv == null ? void 0 : pv.qty)}</div>`;
    const cp = share(st.cash, st.cash + st.card);
    const pills = `<div class="pills">${!dishF ? `<div class="pill wide"><div class="psplit"><i style="width:${cp}%"></i></div><div class="psplit-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(st.cash)}</b> <span class="muted">${cp}%</span></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 <b class="money">${money(st.card)}</b> <span class="muted">${st.cash + st.card ? Math.round((100 - cp) * 10) / 10 : 0}%</span></span></div></div>
      <div class="pill"><span>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438</span><b class="money">${money(st.disc)}</b><small>${share(st.disc, gross)}% \u0432\u0456\u0434 \u0441\u0443\u043C\u0438</small></div><div class="pill"><span>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456</span><b class="money">${money(st.tip)}</b>${st.tipOut ? `<small>\u0432\u0438\u0434\u0430\u043D\u043E ${money(st.tipOut)}</small>` : ""}</div>` : ""}
      ${st.exp != null ? `<div class="pill"><span>\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438</span><b class="money">${money(st.exp)}</b>${(pv == null ? void 0 : pv.exp) != null ? delta(st.exp, pv.exp, 1) : ""}</div>` : ""}
      <div class="pill"><span>\u{1F37D} \u041F\u043E\u0437\u0438\u0446\u0456\u0439</span><b>${st.qty}</b><small>${st.n ? (st.qty / st.n).toFixed(1) : 0} \u0443 \u0447\u0435\u043A\u0443</small></div>${(() => {
      const ch = { hall: [0, 0], pick: [0, 0], del: [0, 0] };
      let fee = 0;
      for (const c of checks || []) {
        const k = c.go || "hall";
        ch[k][0]++;
        ch[k][1] += c.sum - (c.tip || 0);
        fee += c.fee || 0;
      }
      if (!ch.pick[0] && !ch.del[0]) return "";
      return `<div class="pill wide"><span>\u041A\u0430\u043D\u0430\u043B\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0443</span><div class="psplit-l"><span>\u{1FA91} \u0417\u0430\u043B <b class="money">${money(ch.hall[1])}</b> <span class="muted">${ch.hall[0]} \u0447\u0435\u043A.</span></span><span>\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437 <b class="money">${money(ch.pick[1])}</b> <span class="muted">${ch.pick[0]} \u0447\u0435\u043A.</span></span><span>\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 <b class="money">${money(ch.del[1])}</b> <span class="muted">${ch.del[0]} \u0447\u0435\u043A.${fee ? ` \xB7 \u0437\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443 ${money(fee)}` : ""}</span></span></div></div>`;
    })()}</div>`;
    const nav = `<div class="seg rsec">${SECS.map(([k, l, tabs]) => `<button class="${sec[0] === k ? "on" : ""}" data-a="rSec" data-s="${k}">${l}</button>`).join("")}</div>` + (sec[2].length > 1 ? `<div class="chips scroll sub">${sec[2].map((k) => `<button class="chip ${R.tab === k ? "on" : ""}" data-a="rTab" data-t="${k}">${TABS[k]}</button>`).join("")}</div>` : "");
    const grpBy = (keyF) => {
      const m = /* @__PURE__ */ new Map();
      checks.forEach((c) => {
        const k = keyF(c);
        const a = m.get(k) || [0, 0];
        a[0]++;
        a[1] += c.val;
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
    const grpName = (nm) => (S.groups.find((g) => {
      var _a3;
      return g.id === ((_a3 = dishOf(nm)) == null ? void 0 : _a3.grp);
    }) || { name: "\u{1F9E9} \u0406\u043D\u0448\u0435" }).name;
    const days = daysIn(from, to), byDay = new Map(grpBy((c) => c.d));
    const waiterOf = (c) => c.w || c.by || "\u2014";
    const T = R.tab;
    let body = "";
    if (T === "cour") return head + nav + courRepHTML();
    if (T === "overview") {
      let chart, ctitle;
      if (days.length === 1) chart = "";
      else if (days.length <= 62) {
        ctitle = "\u{1F4C5} \u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u043F\u043E \u0434\u043D\u044F\u0445";
        chart = colChart(days.map((d) => {
          const v = byDay.get(d) || [0, 0];
          return [d.slice(8), v[1], `${WD[wdOf(d)]} ${dm(d)} \xB7 ${money(v[1])} \xB7 ${v[0]} \u0447\u0435\u043A.`, d];
        }));
      } else {
        ctitle = "\u{1F4C5} \u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u043F\u043E \u043C\u0456\u0441\u044F\u0446\u044F\u0445";
        const m = /* @__PURE__ */ new Map();
        checks.forEach((c) => {
          const k = c.d.slice(0, 7);
          m.set(k, (m.get(k) || 0) + c.val);
        });
        const ms = [...new Set(days.map((d) => d.slice(0, 7)))];
        chart = colChart(ms.map((k) => [k.slice(5) + "." + k.slice(2, 4), m.get(k) || 0, `${k} \xB7 ${money(m.get(k) || 0)}`]));
      }
      const heat = "";
      const grps = dishAgg(grpName).sort((a, b) => b[1][1] - a[1][1]), gt = grps.reduce((a, x) => a + x[1][1], 0);
      const grpCard = `<div class="card"><h3>\u{1F373} \u0429\u043E \u043F\u0440\u043E\u0434\u0430\u0454\u043C\u043E</h3>${grps.length ? `<div class="stack">${grps.map(([k, [, s]], i) => `<i style="width:${share(s, gt)}%;background:${ACC[i % 5]}" title="${esc(k)} ${share(s, gt)}%"></i>`).join("")}</div>
        ${grps.map(([k, [q, s]], i) => `<div class="kv"><span><i class="dot" style="background:${ACC[i % 5]}"></i>${esc(k)} <span class="muted">\xB7 ${q} \u0448\u0442</span></span><span><b class="money">${money(s)}</b> <span class="muted">${share(s, gt)}%</span></span></div>`).join("")}` : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432</div>'}</div>`;
      const ws2 = grpBy(waiterOf).sort((a, b) => b[1][1] - a[1][1]).slice(0, 6), wmax = Math.max(1, ...ws2.map((x) => x[1][1]));
      const wCard = `<div class="card"><h3>\u{1F464} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438</h3>${ws2.length ? ws2.map(([k, [q, s]], i) => `<div class="bar"><div class="bl"><span>${["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || ""} ${esc(k)}<br><small class="muted">${q} \u0447\u0435\u043A. \xB7 \u0441\u0435\u0440. \u0447\u0435\u043A ${money(s / q)}</small></span><b class="money">${money(s)}</b></div><i style="width:${Math.max(2, s / wmax * 100)}%"></i></div>`).join("") : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445</div>'}</div>`;
      const best = [...byDay].sort((a, b) => b[1][1] - a[1][1])[0], bt = grpBy((c) => c.t).sort((a, b) => b[1][1] - a[1][1])[0];
      const vs = (r.voids || []).filter((v) => !v.table), vsum = vs.reduce((a, v) => a + v.sum, 0), ks = S.data.kstats || [];
      const ins = [
        best && days.length > 1 && ["\u{1F3C6} \u041D\u0430\u0439\u043A\u0440\u0430\u0449\u0438\u0439 \u0434\u0435\u043D\u044C", `${WD[wdOf(best[0])]} ${dm(best[0])}`, money(best[1][1])],
        bt && ["\u{1FA91} \u041D\u0430\u0439\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u043E\u0432\u0456\u0448\u0438\u0439 \u0441\u0442\u0456\u043B", `\u0421\u0442\u0456\u043B ${tn(bt[0])} \xB7 ${bt[1][0]} \u0447\u0435\u043A.`, money(bt[1][1])],
        days.length > 1 && ["\u{1F4CA} \u0412 \u0441\u0435\u0440\u0435\u0434\u043D\u044C\u043E\u043C\u0443 \u0437\u0430 \u0434\u0435\u043D\u044C", `${(st.n / days.length).toFixed(1)} \u0447\u0435\u043A.`, money(st.total / days.length)],
        ["\u{1F6AB} \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u043D\u044F", `${vs.length} \u043F\u043E\u0437. \xB7 ${share(vsum, st.total + vsum)}% \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432`, money(vsum)],
        ks.length && ["\u23F1 \u041A\u0443\u0445\u043D\u044F, \u0441\u0435\u0440. \u0447\u0430\u0441", `${ks.length} \u0437\u0430\u043C\u043E\u0432\u043B. \xB7 \u043F\u043E\u043D\u0430\u0434 15 \u0445\u0432: ${ks.filter((x) => x.mins > 15).length}`, Math.round(ks.reduce((a, x) => a + x.mins, 0) / ks.length) + " \u0445\u0432"]
      ].filter(Boolean);
      const insCard = `<div class="card"><h3>\u{1F4A1} \u0412\u0438\u0441\u043D\u043E\u0432\u043A\u0438</h3>${ins.map(([l, s, v]) => `<div class="kv"><span>${l}<br><small class="muted">${esc(s)}</small></span><b class="money">${v}</b></div>`).join("")}</div>`;
      const top = dishAgg((nm) => nm).sort((x, y) => y[1][0] - x[1][0] || y[1][1] - x[1][1]).slice(0, 10), tmax = Math.max(1, ...top.map((x) => x[1][0]));
      const topCard = `<div class="card"><h3>\u{1F3C6} \u0422\u043E\u043F \u0441\u0442\u0440\u0430\u0432</h3>${top.length ? top.map(([k, [qq, ss]], i) => `<div class="bar"><div class="bl"><span>${["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || `<span class="muted">${i + 1}.</span>`} ${esc(k)}</span><b>${qq} \u0448\u0442</b><span class="muted money">${money(ss)}</span></div><i style="width:${Math.max(2, qq / tmax * 100)}%"></i></div>`).join("") : '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u0437\u0430 \u0446\u0435\u0439 \u043F\u0435\u0440\u0456\u043E\u0434</div>'}</div>`;
      return head + filters + kpis + pills + nav + `<div class="dash">${chart ? `<div class="card wide"><h3>${ctitle}${days.length > 1 && days.length <= 62 ? ' <span class="muted">\xB7 \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u0434\u0435\u043D\u044C \u2014 \u0432\u0456\u0434\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u0437\u0432\u0456\u0442 \u0437\u0430 \u043D\u044C\u043E\u0433\u043E</span>' : ""}</h3>${chart}</div>` : ""}${heat}${insCard}${grpCard}${topCard}${wCard}</div>`;
    }
    let rows, unit = "\u0447\u0435\u043A.", sortable = false, sub;
    if (T === "dishes") {
      rows = dishAgg((nm) => nm);
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T === "cats") {
      rows = dishAgg((nm) => {
        var _a3;
        return ((_a3 = dishOf(nm)) == null ? void 0 : _a3.cname) || "\u0406\u043D\u0448\u0435";
      });
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T === "groups") {
      rows = dishAgg(grpName);
      unit = "\u0448\u0442";
    } else if (T === "waiters") {
      rows = grpBy(waiterOf);
      sub = (q, s) => `${q} \u0447\u0435\u043A. \xB7 \u0441\u0435\u0440. ${money(s / q)}`;
    } else if (T === "tips") {
      const m = /* @__PURE__ */ new Map();
      checks.forEach((c) => Object.entries(c.tipSplit || (c.tip ? { [c.by || "\u2014"]: c.tip } : {})).forEach(([n, v]) => {
        const a = m.get(n) || [0, 0];
        a[0]++;
        a[1] += v;
        m.set(n, a);
      }));
      rows = [...m].filter((x) => x[1][1] > 0);
    } else if (T === "days") {
      rows = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [`${WD[wdOf(d)]} ${dm(d)}`, v]);
    } else if (T === "wd") {
      const cnt = Array(7).fill(0);
      days.forEach((d) => cnt[wdOf(d)]++);
      const m = grpBy((c) => wdOf(c.d));
      rows = WD.map((w, i) => [w, (m.find((x) => x[0] === i) || [0, [0, 0]])[1]]).filter((x) => cnt[WD.indexOf(x[0])]);
      sub = (q, s) => {
        return `${q} \u0447\u0435\u043A.`;
      };
      body = `<div class="muted" style="margin-bottom:8px">\u0421\u0435\u0440\u0435\u0434\u043D\u044F \u0432\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u043E\u0434\u0438\u043D \u0442\u0430\u043A\u0438\u0439 \u0434\u0435\u043D\u044C \u2014 \u0443 \u0434\u0443\u0436\u043A\u0430\u0445</div>`;
      const cntOf = (w) => cnt[WD.indexOf(w)];
      rows = rows.map(([w, v]) => [`${w} (\u0441\u0435\u0440. ${money(v[1] / cntOf(w))})`, v]);
    } else if (T === "tables") rows = grpBy((c) => "\u0421\u0442\u0456\u043B " + tn(c.t)).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    if (rows) {
      if (!["hours", "days", "tables", "wd"].includes(T)) rows.sort((a, b) => R.sort === "q" && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const tot = rows.reduce((a, x) => a + x[1][1], 0);
      body += barRows(rows, unit, tot, sub);
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== "q" ? "on" : ""}" data-a="rSort" data-s="s">\u0417\u0430 \u0441\u0443\u043C\u043E\u044E</button><button class="chip ${R.sort === "q" ? "on" : ""}" data-a="rSort" data-s="q">\u0417\u0430 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E</button></div>` + body;
    } else if (["checks", "exp", "mov", "z"].includes(T)) {
      const xb = (kind, x, back) => `<button class="xb${back ? " back" : ""}" data-a="${back ? "rBack" : "rDel"}" data-k="${kind}" data-d="${x.d}" data-i="${kind === "checks" ? esc(x.id || "") : x.i}" title="${back ? "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438"}">${back ? "\u21A9\uFE0F" : "\u{1F5D1}"}</button>`;
      const line = (kind, x, l, v, back) => `<div class="kv rrow${back ? " del" : ""}"><span>${l}</span><span class="kv-r"><b class="money">${v}</b>${kind === "checks" && !back && x.id && isAdmin() ? `<button class="xb" data-a="cEdit" data-ref="${esc(x.id)}" data-d="${x.d}" title="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0439 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438">\u270F\uFE0F</button>` : ""}${kind !== "checks" || x.id ? xb(kind, x, back) : ""}</span></div>`;
      const dd = (d) => d.slice(8) + "." + d.slice(5, 7);
      let act2 = [], gone = [], empty = "";
      if (T === "checks") {
        act2 = [...checks].reverse().slice(0, 300).map((c) => line("checks", c, `${dd(c.d)} ${c.at} \xB7 \u0441\u0442\u0456\u043B ${tn(c.t)} \xB7 ${esc(waiterOf(c))} ${c.card ? "\u{1F4B3}" : "\u{1F4B5}"}${c.disc ? " \u{1F3F7}" : ""}${c.tip ? ` \xB7 \u{1F49D} ${money(c.tip)}` : ""}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}\xD7 ${esc(nm)}`).join(", ")}</small>`, money(c.val)));
        gone = (r.removed || []).filter((x) => !x.reopen).map((x) => line("checks", x, `${dd(x.d)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${tn(x.t)} \xB7 ${esc(x.by)} <span class="muted">\xB7 \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</span>`, money(x.sum), 1));
        empty = "\u041D\u0435\u043C\u0430\u0454 \u0447\u0435\u043A\u0456\u0432";
      }
      if (T === "exp") {
        act2 = [...r.exp].filter((e) => !e.del).reverse().map((e) => line("exp", e, `${dd(e.d)} ${e.at} ${e.src === "card" ? "\u{1F4B3}" : "\u{1F4B5}"} ${esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430")} <span class="muted">${esc(e.by)}</span>`, money(e.sum)));
        gone = (r.expDel || []).map((e) => line("exp", e, `${dd(e.d)} ${e.at} ${esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430")}`, money(e.sum), 1));
        empty = "\u0412\u0438\u0442\u0440\u0430\u0442 \u043D\u0435\u043C\u0430\u0454";
      }
      if (T === "mov") {
        act2 = [...r.mov || []].reverse().map((m) => line("mov", m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || "")} <span class="muted">${esc(m.by || "")}</span>`, money(m.sum)));
        gone = (r.movDel || []).map((m) => line("mov", m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || "")}`, money(m.sum), 1));
        empty = "\u0420\u0443\u0445\u0443 \u043A\u043E\u0448\u0442\u0456\u0432 \u043D\u0435\u043C\u0430\u0454";
      }
      if (T === "z") {
        const zl = (z) => `${dd(z.d)} ${new Date(z.closed).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })} \xB7 ${z.checks} \u0447\u0435\u043A. \xB7 ${esc(z.closedBy || "")}${z.diff ? ` \xB7 <b style="color:var(--red)">\u0440\u0456\u0437\u043D\u0438\u0446\u044F ${z.diff > 0 ? "+" : ""}${money(z.diff)}</b>` : ""}`;
        act2 = [...r.z].reverse().map((z) => line("z", z, zl(z), money(z.total)));
        gone = (r.zDel || []).map((z) => line("z", z, zl(z), money(z.total), 1));
        empty = "Z-\u0437\u0432\u0456\u0442\u0456\u0432 \u0437\u0430 \u043F\u0435\u0440\u0456\u043E\u0434 \u043D\u0435\u043C\u0430\u0454";
      }
      body = (act2.join("") || `<div class="muted">${empty}</div>`) + (gone.length ? `<h3 style="margin:18px 0 8px">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 <span class="muted">\xB7 ${gone.length} \xB7 \u21A9\uFE0F \u2014 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</span></h3>${gone.join("")}` : "");
    } else if (T === "kitchen") {
      const L = (S.data.kstats || []).filter((x) => !R.t || String(x.t) === R.t), avg = (l) => l.length ? l.reduce((a, x) => a + x.mins, 0) / l.length : 0, f = (m) => m ? `${Math.round(m)} \u0445\u0432` : "\u2014";
      const byD = /* @__PURE__ */ new Map();
      L.forEach((x) => x.items.forEach(([n]) => {
        const a = byD.get(n) || [];
        a.push(x.mins);
        byD.set(n, a);
      }));
      const byH = /* @__PURE__ */ new Map();
      L.forEach((x) => {
        const h = String(x.at).slice(0, 2) + ":00";
        const a = byH.get(h) || [];
        a.push(x.mins);
        byH.set(h, a);
      });
      const row = (k, a) => `<div class="kv"><span>${esc(k)} <span class="muted">\xB7 ${a.length}</span></span><b>${f(a.reduce((s, m) => s + m, 0) / a.length)}</b></div>`;
      body = L.length ? `<div class="kpis"><div class="kpi"><span>\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C \u043A\u0443\u0445\u043D\u0456</span><b>${L.length}</b></div><div class="kpi accent"><span>\u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0430\u0441</span><b>${f(avg(L))}</b></div><div class="kpi"><span>\u041D\u0430\u0439\u0434\u043E\u0432\u0448\u0435</span><b>${f(Math.max(...L.map((x) => x.mins)))}</b></div><div class="kpi ${L.filter((x) => x.mins > 15).length ? "red" : "green"}"><span>\u041F\u043E\u043D\u0430\u0434 15 \u0445\u0432</span><b>${L.filter((x) => x.mins > 15).length}</b></div></div>
        <h3 style="margin:16px 0 8px">\u041F\u043E \u0441\u0442\u0440\u0430\u0432\u0430\u0445 (\u0441\u0435\u0440. \u0447\u0430\u0441)</h3>${[...byD].sort((a, b) => b[1].length - a[1].length).slice(0, 40).map(([k, a]) => row(k, a)).join("")}
        <h3 style="margin:16px 0 8px">\u041F\u043E \u0433\u043E\u0434\u0438\u043D\u0430\u0445</h3>${[...byH].sort((a, b) => hOrd(a[0]) - hOrd(b[0])).map(([k, a]) => row(k, a)).join("")}` : '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u0433\u043E\u0442\u043E\u0432\u0438\u0445 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C \u0437 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0433\u043E \u0435\u043A\u0440\u0430\u043D\u0430</div>';
    } else if (T === "ctrl") {
      const vs = (r.voids || []).filter((v) => (!R.by || v.by === R.by) && (!R.t || String(v.t) === R.t)), W = {};
      const w = (nm) => W[nm || "\u2014"] = W[nm || "\u2014"] || { name: nm || "\u2014", n: 0, s: 0, vN: 0, vS: 0, tN: 0, tS: 0, dN: 0, dS: 0, dMax: 0, tip: 0 };
      checks.forEach((c) => {
        var _a3;
        const x = w(c.by);
        x.n++;
        x.s += c.sum;
        if (c.disc) {
          x.dN++;
          x.dS += c.disc;
          x.dMax = Math.max(x.dMax, c.pct || 0);
        }
        const tn2 = waiterOf(c), tv = (_a3 = (c.tipSplit || {})[tn2]) != null ? _a3 : c.tipSplit ? 0 : c.tip || 0;
        if (tv) w(tn2).tip += tv;
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
      const ws2 = Object.values(W).sort((a, b) => b.vS + b.dS + b.tS - a.vS - a.dS - a.tS);
      const rm = (r.removed || []).filter((x) => !R.t || String(x.t) === R.t);
      body = (ws2.length ? `<div class="ctrl">${ws2.map((x) => {
        const pct = x.s + x.vS ? Math.round(x.vS / (x.s + x.vS) * 1e3) / 10 : 0, bad = pct >= 5 || x.dMax > 20 || x.tN;
        return `<div class="ctrl-w ${bad ? "bad" : ""}"><div class="ctrl-h"><b>\u{1F464} ${esc(x.name)}</b><span class="muted">${x.n} \u0447\u0435\u043A. \xB7 ${money(x.s)}</span></div>
          <div class="ctrl-g"><span>\u{1F6AB} \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u043D\u044F<b>${x.vN} \xB7 ${money(x.vS)}</b><small>${pct}% \u0432\u0456\u0434 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432</small></span><span>\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 \u0441\u0442\u043E\u043B\u0438<b>${x.tN} \xB7 ${money(x.tS)}</b></span>
          <span>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438<b>${x.dN} \xB7 ${money(x.dS)}</b><small>${x.dMax ? "\u043C\u0430\u043A\u0441 " + x.dMax + "%" : "\u2014"}</small></span><span>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<b>${money(x.tip)}</b></span></div></div>`;
      }).join("")}</div>` : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445</div>') + `<h3 style="margin:18px 0 8px">\u{1F6AB} \u0416\u0443\u0440\u043D\u0430\u043B \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C</h3>` + (vs.length ? [...vs].reverse().slice(0, 300).map((v) => `<div class="kv"><span>${v.d.slice(5)} ${v.at} \xB7 \u0441\u0442\u0456\u043B ${tn(v.t)} \xB7 <b>${esc(v.by)}</b> \xB7 ${esc(v.name)}<br><small class="muted">\u2753 ${esc(v.reason)}</small></span><b class="money" style="color:var(--red)">\u2212${money(v.sum)}</b></div>`).join("") : '<div class="muted">\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C \u043D\u0435\u043C\u0430\u0454 \u{1F44D}</div>') + (rm.length ? `<h3 style="margin:18px 0 8px">\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</h3>` + rm.map((x) => `<div class="kv"><span>${x.d.slice(5)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${tn(x.t)} \xB7 ${esc(x.by)}</span><b class="money">${money(x.sum)}</b></div>`).join("") : "");
    }
    return head + filters + kpis + pills + nav + `<div class="card">${body}</div>`;
  }
  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const q = S.q.trim().toLowerCase(), only = S.stopOff, all = S.menu.categories.filter((c) => !c.tech).flatMap((c) => c.items), off = all.filter((i) => i.hidden);
    const blocks = S.menu.categories.filter((c) => !c.tech).map((c) => {
      const its = c.items.filter((i) => (!q || i.name.uk.toLowerCase().includes(q)) && (!only || i.hidden));
      if (!its.length) return "";
      const n = c.items.filter((i) => i.hidden).length;
      return `<div class="st-b"><h3>${esc(c.name.uk)}${n ? ` <span class="bad">\xB7 \u26D4 ${n}</span>` : ""}</h3><div class="st-g">${its.map((i) => `<button class="st-i${i.hidden ? " off" : ""}" data-a="stopT" data-id="${i.id}" data-h="${i.hidden ? 0 : 1}">${i.hidden ? "\u26D4 " : ""}${esc(i.name.uk)}</button>`).join("")}</div></div>`;
    }).join("");
    return `<div class="head"><h1>\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</h1><span class="muted">\u0422\u0430\u043F \u2014 \u0443\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438 / \u0432\u0438\u043C\u043A\u043D\u0443\u0442\u0438. \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0435 \u043D\u0435 \u0431\u0430\u0447\u0430\u0442\u044C \u0433\u043E\u0441\u0442\u0456 \u0439 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F</span></div>
      <div class="st-top"><input id="stopSearch" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A" value="${esc(S.q)}"><button class="chip ${only ? "on" : ""}" data-a="stopOff">\u26D4 \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0456 \xB7 ${off.length}</button></div>
      <div class="st-w">${blocks || '<div class="muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</div>'}</div>`;
  }
  function printerHTML() {
    return `<div class="head"><h1>\u041F\u0440\u0438\u043D\u0442\u0435\u0440</h1></div>${printerCards()}`;
  }
  function printerCards() {
    var _a2;
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 6e4;
    return `<div class="cards"><div class="card"><div class="big">${ok ? "\u2705 \u043D\u0430 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : p.seen ? "\u274C \u043D\u0435\u043C\u0430\u0454 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : "\u274C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0434\u0440\u0443\u043A\u0443 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430"}</div>
      <div class="muted">${p.seen ? "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0437\u0432\u02BC\u044F\u0437\u043E\u043A: " + hhmm(p.seen) : ""} \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456: ${(_a2 = p.q) != null ? _a2 : 0}</div>${p.q && isAdmin() ? '<div class="btnrow" style="margin-top:10px"><button class="btn sm" data-a="pQList">\u{1F4CB} \u0429\u043E \u0432 \u0447\u0435\u0440\u0437\u0456</button><button class="btn sm red" data-a="pQClear">\u{1F5D1} \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0447\u0435\u0440\u0433\u0443</button></div>' : ""}</div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">\u{1F5A8} \u0422\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A</button><button class="btn" data-a="pQr">\u{1F533} QR \u043C\u0435\u043D\u044E \u0434\u043B\u044F \u0441\u0442\u043E\u043B\u0443</button><button class="btn" data-a="qrPanel">\u{1F533} \u0423\u0441\u0456 QR-\u043A\u043E\u0434\u0438</button></div></div>`;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    return `<div class="head"><h1>\u041C\u0435\u043D\u044E</h1><button class="btn" data-a="menuUndo">\u21A9\uFE0F \u0412\u0456\u0434\u043C\u0456\u043D\u0438\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443</button><button class="btn" data-a="catAdd">\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B</button><button class="btn" data-a="phPanel">\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E</button><button class="btn primary" data-a="menuEdit" data-id="">\u2795 \u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430</button></div>
      ${S.menu.categories.map((c) => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map((i) => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? " \u26D4" : ""}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map((v) => `${v.v} \u2014 ${v.p}`).join(" / ") : i.price + " \u20B4"}${i.size && !i.variants ? " \xB7 " + esc(i.size) : ""}</div></div>\u203A</button>`).join("")}</div>`).join("")}`;
  }
  function lookHTML() {
    const L = look(), opt = (k, v, l, extra = "") => `<button class="lk-o${L[k] == v ? " on" : ""}" data-a="look" data-k="${k}" data-v="${v}"${extra}>${l}</button>`;
    const ACC2 = ["", "#f2c14e", "#ff453a", "#ff9f0a", "#30d158", "#0a84ff", "#bf5af2", "#e0457b", "#4fe3c1", "#ffffff"];
    return `<div class="grid2 set">
      <div class="card"><h3>\u{1F3A8} \u0422\u0435\u043C\u0430</h3><div class="lk-themes">${Object.entries(THEMES).map(([k, [l, T]]) => `<button class="lk-th${L.theme === k ? " on" : ""}" data-a="look" data-k="theme" data-v="${k}" style="background:${T.bg};color:${T.text}"><i style="background:${T.card}"><b style="background:${T.accent}"></b></i>${l}</button>`).join("")}</div>
        <div class="set-note muted" style="margin-top:12px">\u041A\u043E\u043B\u0456\u0440 \u0430\u043A\u0446\u0435\u043D\u0442\u0443 (\u043A\u043D\u043E\u043F\u043A\u0438, \u0432\u0438\u0434\u0456\u043B\u0435\u043D\u043D\u044F)</div><div class="lk-acc">${ACC2.map((c) => `<button class="lk-dot${L.accent === c ? " on" : ""}" data-a="look" data-k="accent" data-v="${c}" style="background:${c || "conic-gradient(#f2c14e,#e0457b,#3fb6ff,#5ed68a,#f2c14e)"}" title="${c || "\u044F\u043A \u0443 \u0442\u0435\u043C\u0456"}"></button>`).join("")}</div></div>
      <div class="card"><h3>\u{1F524} \u0428\u0440\u0438\u0444\u0442\u0438</h3><div class="set-note muted">\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439 \u0448\u0440\u0438\u0444\u0442</div><div class="lk-row">${Object.entries(FONTS).map(([k, [l, f]]) => opt("font", k, l, f ? ` style="font-family:'${f}',sans-serif"` : "")).join("")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0428\u0440\u0438\u0444\u0442 \u0441\u0443\u043C \u0456 \u0446\u0438\u0444\u0440</div><div class="lk-row">${opt("nfont", "same", "\u042F\u043A \u043E\u0441\u043D\u043E\u0432\u043D\u0438\u0439")}${Object.entries(FONTS).map(([k, [l, f]]) => opt("nfont", k, l, f ? ` style="font-family:'${f}',sans-serif"` : "")).join("")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0420\u043E\u0437\u043C\u0456\u0440</div><div class="lk-row">${[85, 92, 100, 110, 120].map((z) => opt("size", z, z === 100 ? "\u0417\u0432\u0438\u0447\u0430\u0439\u043D\u0438\u0439" : z + "%")).join("")}</div></div>
      <div class="card"><h3>\u{1FA9F} \u0412\u0456\u043A\u043E\u043D\u0446\u044F</h3><div class="set-note muted">\u041A\u0443\u0442\u0438</div><div class="lk-row">${opt("radius", "round", "\u25EF \u041A\u0440\u0443\u0433\u043B\u0456")}${opt("radius", "soft", "\u25A2 \u041C'\u044F\u043A\u0456")}${opt("radius", "square", "\u25A1 \u041F\u0440\u044F\u043C\u0456")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0410\u043D\u0456\u043C\u0430\u0446\u0456\u0457</div><div class="lk-row">${opt("anim", 1, "\u2728 \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u0456")}${opt("anim", 0, "\u26A1 \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0456 (\u0448\u0432\u0438\u0434\u0448\u0435 \u043D\u0430 \u0441\u043B\u0430\u0431\u043A\u0438\u0445)")}</div></div>
      <div class="card"><h3>\u{1F50A} \u0417\u0432\u0443\u043A \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u044C</h3><div class="lk-row">${Object.entries(SOUNDS).map(([k, [l]]) => opt("sound", k, (k === "off" ? "\u{1F507} " : "\u25B6 ") + l)).join("")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0413\u0443\u0447\u043D\u0456\u0441\u0442\u044C</div><div class="lk-row">${[30, 50, 70, 100].map((v) => opt("vol", v, v + "%")).join("")}</div>
        <div class="btnrow" style="margin-top:12px"><button class="btn sm" data-a="lookReset">\u21BA \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0435 \u0434\u043E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u0443</button></div></div>
      <div class="muted set-note" style="grid-column:1/-1">\u0412\u0438\u0433\u043B\u044F\u0434 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457 \u2014 \u043A\u043E\u0436\u0435\u043D \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0456 \u043F\u043B\u0430\u043D\u0448\u0435\u0442 \u043C\u043E\u0436\u043D\u0430 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u0442\u0438 \u043F\u043E-\u0441\u0432\u043E\u0454\u043C\u0443.</div></div>`;
  }
  function settingsHTML(only) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
    const st = S.data.staff, wf = S.data.wifi, c = (st == null ? void 0 : st.cfg) || {};
    const ROLE = { admin: "\u{1F510} \u0430\u0434\u043C\u0456\u043D", cook: "\u{1F468}\u200D\u{1F373} \u043A\u0443\u0445\u0430\u0440", courier: "\u{1F6F5} \u043A\u0443\u0440'\u0454\u0440", waiter: "\u{1F9D1}\u200D\u{1F373} \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442" };
    const row = (l, v, btn, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ""}</span><span class="kv-r"><b>${v}</b>${btn}</span></div>`;
    const ch = (a, extra = "") => `<button class="btn sm" data-a="${a}"${extra}>\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button>`;
    const staff = st ? [...st.staff].sort((a, b) => (a.role || "").localeCompare(b.role || "") || a.name.localeCompare(b.name)) : null;
    const SS = [["venue", "\u{1F3EA} \u0417\u0430\u043A\u043B\u0430\u0434"], ["rules", "\u2699\uFE0F \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438"], ["site", "\u{1F310} \u0421\u0430\u0439\u0442"], ["go", "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430"], ["loy", "\u{1F381} \u041B\u043E\u044F\u043B\u044C\u043D\u0456\u0441\u0442\u044C"], ["look", "\u{1F3A8} \u0412\u0438\u0433\u043B\u044F\u0434"], ["printer", "\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440"], ["test", "\u{1F9EA} \u0422\u0435\u0441\u0442"]], cur = only || ((SS0) => SS0.includes(S.setTab) ? S.setTab : "rules")(["venue", "rules", "site", "go", "loy", "look", "printer", "test"]);
    const part = {};
    part.people = `<div class="grid2 set">
      ${[["admin", "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0438"], ["waiter", "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438"], ["cook", "\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F"], ["courier", "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438"]].map(([r, t]) => {
      const l = staff ? staff.filter((s) => (ROLE[s.role] ? s.role : "waiter") === r) : null;
      return `<div class="card"><h3>${t} <span class="muted">\xB7 ${l ? l.length : "\u2026"}</span></h3>
        <div class="scrollbox">${l ? l.map((s) => `<div class="kv stf-row"><span class="stf-n">${esc(s.name)}</span><span class="kv-r"><button class="btn sm" data-a="stfName" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0456\u043C\u02BC\u044F">\u270F\uFE0F</button><button class="btn sm" data-a="stfPin" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 PIN">\u{1F511}</button><button class="btn sm" data-a="stfRole" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0440\u043E\u043B\u044C">\u{1F504}</button><button class="btn sm red" data-a="staffDel" data-id="${s.id}" title="\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438">\u{1F5D1}</button></span></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>' : "\u2026"}</div></div>`;
    }).join("")}
      <div class="card"><h3>\u2795 \u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A</h3><div class="muted set-note">\u0410\u0431\u043E \u0441\u0430\u043C \u2014 \u043A\u043E\u0434\u043E\u043C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u0432 \u043A\u0430\u0441\u0456.</div>
        <button class="btn sm primary" data-a="staffAdd">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430</button></div>
      <div class="card"><h3>\u{1F195} \u041A\u043E\u0434\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457</h3><div class="muted set-note">\u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0434 \u0437\u0430\u043C\u0456\u0441\u0442\u044C PIN \u2192 \u043F\u0438\u0448\u0435 \u0456\u043C\u02BC\u044F \u0456 \u043F\u0440\u0438\u0434\u0443\u043C\u0443\u0454 \u0441\u0432\u0456\u0439 PIN.</div>
        ${(st == null ? void 0 : st.reg) ? row("\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", esc(st.reg.admin), ch("regSet", ' data-r="admin"')) + row("\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", esc(st.reg.waiter), ch("regSet", ' data-r="waiter"')) + row("\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u0430\u0440", esc(st.reg.cook || "1113"), ch("regSet", ' data-r="cook"')) + row("\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440", esc(st.reg.courier || "1114"), ch("regSet", ' data-r="courier"')) : "\u2026"}</div>
      <div class="card"><h3>\u{1F916} \u0423\u0432\u0456\u0439\u0448\u043B\u0438 \u0432 Telegram-\u0431\u043E\u0442</h3><div class="scrollbox">${st ? st.waiters.map((w) => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">\u0412\u0438\u0439\u0442\u0438</button></div>`).join("") || '<div class="muted">\u041D\u0456\u043A\u043E\u0433\u043E</div>' : "\u2026"}</div></div></div>`;
    const tg = (k, l, hint, def = 0) => {
      var _a3;
      return `<div class="kv press" data-a="cfgTgl" data-k="${k}" data-def="${def}"><span>${l}<br><small class="muted">${hint}</small></span><span class="switch ${((_a3 = c[k]) != null ? _a3 : def) ? "on" : ""}"></span></div>`;
    };
    part.rules = `<div class="grid2 set">
      <div class="card"><h3>\u{1FA91} \u0417\u0430\u043B</h3>${row("\u{1FA91} \u0421\u0442\u043E\u043B\u0456\u0432 \u0443 \u0437\u0430\u043B\u0456", S.n, ch("cfg", ' data-k="tables"'), "\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0441\u0442\u043E\u043B\u0456\u0432 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 \u043A\u0430\u0441\u0430 \u0439 QR-\u043C\u0435\u043D\u044E")}</div>
      <div class="card"><h3>\u{1F4B0} \u0413\u0440\u043E\u0448\u0456</h3>
        ${row("\u{1F3F7} \u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430", ((_a2 = c.discMax) != null ? _a2 : 20) + "%", ch("cfg", ' data-k="discMax"'), "\u0411\u0456\u043B\u044C\u0448\u0443 \u0437\u043D\u0438\u0436\u043A\u0443 \u0434\u0430\u0454 \u043B\u0438\u0448\u0435 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440")}
        ${row("\u{1F468}\u200D\u{1F373} \u0427\u0430\u0441\u0442\u043A\u0430 \u043A\u0443\u0445\u043D\u0456 \u0432\u0456\u0434 \u0447\u0430\u0439\u043E\u0432\u0438\u0445", ((_b = st == null ? void 0 : st.kpct) != null ? _b : 20) + "%", ch("kpct"), `\u041F\u043B\u044E\u0441 \xAB\u043F\u043E\u0434\u044F\u043A\u0430 \u043A\u0443\u0445\u043D\u0456\xBB \u0432\u0456\u0434 \u0433\u043E\u0441\u0442\u044F; \u043F\u043E\u0440\u0456\u0432\u043D\u0443 \u043C\u0456\u0436 \u043A\u0443\u0445\u0430\u0440\u044F\u043C\u0438 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${((_c = st == null ? void 0 : st.cooks) == null ? void 0 : _c.length) ? ` (\u0437\u0430\u0440\u0430\u0437: ${st.cooks.map(esc).join(", ")})` : " (\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0449\u0435 \u043D\u0456\u043A\u043E\u0433\u043E \u2014 \u043F\u0456\u0434\u0435 \u0432 \xAB\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F\xBB)"}`)}</div>
      <div class="card"><h3>\u{1F319} \u0414\u0435\u043D\u044C \u0456 Z-\u0437\u0432\u0456\u0442</h3>
        ${row("\u{1F552} \u0420\u043E\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F \u043E", String((_d = c.dayH) != null ? _d : 3).padStart(2, "0") + ":00", ch("cfg", ' data-k="dayH"'), "\u0427\u0435\u043A\u0438 \u0434\u043E \u0446\u0456\u0454\u0457 \u0433\u043E\u0434\u0438\u043D\u0438 \u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F \u0432 \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0434\u0435\u043D\u044C (0\u20138)")}
        ${tg("autoZ", "\u{1F916} \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u0438\u0439 Z-\u0437\u0432\u0456\u0442", "\u0421\u0430\u043C \u0437\u0430\u043A\u0440\u0438\u0432\u0430\u0454 \u0434\u0435\u043D\u044C, \u044F\u043A\u0449\u043E Z \u043D\u0435 \u0437\u0430\u043A\u0440\u0438\u043B\u0438 \u0432\u0440\u0443\u0447\u043D\u0443")}${tg("zPrint", "\u{1F5A8} \u0414\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u0430\u0432\u0442\u043E-Z", "\u041D\u0430 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0456 \u043A\u0430\u0441\u0438")}${tg("zTg", "\u2708\uFE0F \u041D\u0430\u0434\u0441\u0438\u043B\u0430\u0442\u0438 Z \u0443 Telegram", "\u0417\u0432\u0456\u0442 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u044C \u0443 \u0433\u0440\u0443\u043F\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443")}${tg("zRemind", "\u{1F514} \u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u0442\u0438 \u043F\u0440\u043E \u043D\u0435\u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0439 Z", "\u042F\u043A\u0449\u043E \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u0438\u0439 Z \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E")}</div>
      <div class="card"><h3>\u{1F477} \u0417\u043C\u0456\u043D\u0438</h3>
        ${row("\u23F0 \u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0456\u0441\u043B\u044F", ((_e = c.lateMin) != null ? _e : 10) + " \u0445\u0432", ch("cfg", ' data-k="lateMin"'), "\u0412\u0456\u0434 \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E\u0433\u043E \u0447\u0430\u0441\u0443 \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0437\u043C\u0456\u043D\u0438")}
        ${row("\u2796 \u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F", ((_f = c.lateFine) != null ? _f : 0) + " \u20B4", ch("cfg", ' data-k="lateFine"'), "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443; \u0430\u0434\u043C\u0456\u043D \u0432\u0438\u0440\u0456\u0448\u0443\u0454 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u2705 + \u0448\u0442\u0440\u0430\u0444\xBB")}</div>
      <div class="card"><h3>\u{1F9EE} \u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A</h3>
        ${tg("semiCalc", "\u{1F4D0} \u0421\u043E\u0443\u0441\u0438 \u0439 \u0442\u0456\u0441\u0442\u043E \u2014 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043A\u043E\u043C", "\u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E: \u043F\u0440\u043E\u0434\u0430\u043B\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u2014 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0437 \u0440\u0435\u0446\u0435\u043F\u0442\u0443 \u0441\u043E\u0443\u0441\u0443 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456, \u0432\u0430\u0440\u0438\u0442\u0438 \xAB\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443\xBB \u043D\u0435 \u0442\u0440\u0435\u0431\u0430. \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E: \u043E\u0431\u043B\u0456\u043A \u043F\u0430\u0440\u0442\u0456\u044F\u043C\u0438 \u0447\u0435\u0440\u0435\u0437 \xAB\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430\xBB", 1)}
        ${row("\u{1F3AF} \u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442", ((_g = c.foodCost) != null ? _g : 30) + "%", ch("cfg", ' data-k="foodCost"'), "\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \xF7 \u0446\u0456\u043D\u0430. \u0417\u0430 \u043D\u0438\u043C \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u0441\u0442\u0440\u0430\u0432")}
        ${row("\u{1F53A} \u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434", ((_h = c.priceAlert) != null ? _h : 5) + "%", ch("cfg", ' data-k="priceAlert"'), "\u042F\u043A\u0449\u043E \u0432 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456\u0439 \u0446\u0456\u043D\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 \u0432\u0438\u0449\u0430 \u0437\u0430 \u043C\u0438\u043D\u0443\u043B\u0443")}</div>
      <div class="card"><h3>\u{1F4F1} \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u0435\u0439</h3>
        ${row("\u23F1 \u0427\u0430\u0441 \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", ((_i = c.scanMin) != null ? _i : 60) + " \u0445\u0432", ch("cfg", ' data-k="scanMin"'), "\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0433\u0456\u0441\u0442\u044C \u043C\u043E\u0436\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0430\u043D\u0443\u0432\u0430\u043D\u043D\u044F QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456")}
        <div class="muted set-note" style="margin-top:10px">\u{1F4F6} Wi\u2011Fi \u0437\u0430\u043A\u043B\u0430\u0434\u0443 (\u0437\u0430\u043F\u0430\u0441\u043D\u0438\u0439 \u0441\u043F\u043E\u0441\u0456\u0431) \xB7 \u0432\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430: ${esc((wf == null ? void 0 : wf.current) || "\u2026")}</div>
        <div class="scrollbox sm">${wf ? wf.list.map((x) => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString("uk-UA")}</span></div>`).join("") || '<div class="muted">\u043D\u0435\u043C\u0430\u0454 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u0445 \u0430\u0434\u0440\u0435\u0441</div>' : ""}</div>
        <div class="btnrow"><button class="btn sm primary" data-a="wifiAdd">\u2795 \u0426\u0435 \u043D\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430</button><button class="btn sm red" data-a="wifiClear">\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456</button></div></div></div>`;
    part.go = goSetHTML();
    part.site = siteHTML();
    part.venue = venueHTML();
    part.loy = loyHTML();
    part.look = lookHTML();
    part.printer = printerCards();
    part.test = `<div class="grid2 set"><div class="card"><h3>\u{1F9EA} \u0422\u0435\u0441\u0442</h3><div class="muted set-note">\u0422\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E, \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0443.</div><button class="btn sm red" data-a="reset">\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435</button></div></div>`;
    if (only) return part[only];
    return `<div class="rhead"><div><h1>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h1><span class="muted">\u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438, \u043F\u0440\u0438\u043D\u0442\u0435\u0440</span></div><div class="icogrp">${isAdmin() ? `<a class="btn icobtn" href="owner.html${VENUE ? "" : "#pos=" + S.token}" target="_blank" rel="noopener" title="\u041A\u0430\u0431\u0456\u043D\u0435\u0442 \u0432\u043B\u0430\u0441\u043D\u0438\u043A\u0430">\u{1F451}</a>` : ""}<button class="btn icobtn" data-a="zpHelp" title="\u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430">\u{1F198}</button></div></div>
      <div class="seg rsec">${SS.map(([k, l]) => `<button class="${cur === k ? "on" : ""}" data-a="setTab" data-s="${k}">${l}</button>`).join("")}</div>${part[cur]}`;
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
    const v = await modal({ title: it ? "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443" : "\u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...it ? [{ label: "\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E", val: "ai" }, { label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443", val: "del", cls: "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v === "ai") {
      closeModal();
      return phDish(it);
    }
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
      const inf = await api("photoInfo").catch(() => null);
      if ((inf == null ? void 0 : inf.on) && (inf.prompt || inf.refs.length) && await choose("\u{1F4F8} \u041E\u0431\u0440\u043E\u0431\u0438\u0442\u0438 \u0444\u043E\u0442\u043E \u0432 \u0441\u0442\u0438\u043B\u0456 \u0437\u0430\u043A\u043B\u0430\u0434\u0443?", "\u0428\u0406 \u043F\u0440\u0438\u0431\u0435\u0440\u0435 \u0444\u043E\u043D \u0456 \u0437\u0440\u043E\u0431\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u044F\u043A \u0456\u043D\u0448\u0456 \u0432 \u043C\u0435\u043D\u044E. \u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B \u043D\u0435 \u0437\u043D\u0438\u043A\u043D\u0435, \u043F\u043E\u043A\u0438 \u043D\u0435 \u043D\u0430\u0442\u0438\u0441\u043D\u0435\u0442\u0435 \xAB\u2705 \u0412\u0437\u044F\u0442\u0438\xBB.", [{ label: "\u{1FA84} \u041E\u0431\u0440\u043E\u0431\u0438\u0442\u0438", val: 1, cls: "primary" }, { label: "\u041D\u0456, \u044F\u043A \u0454", val: 0 }])) {
        await phRun({ id: r.id, name: item.name, img: it == null ? void 0 : it.img }, { data });
      } else await act("menuPhoto", { id: r.id, data }, "\u{1F4F7} \u0424\u043E\u0442\u043E \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    }
    loadMenu().catch(() => {
    });
  }
  async function qrPanel() {
    let r;
    try {
      r = await api("qrInfo");
    } catch (e) {
      return toast("\u26A0\uFE0F " + errText(e.message));
    }
    const v = await modal({
      title: `\u{1F533} QR-\u043A\u043E\u0434\u0438 \u043C\u0435\u043D\u044E \xB7 ${r.n} \u0441\u0442\u043E\u043B\u0456\u0432`,
      body: `<div class="muted" style="font-size:13px">\u0423 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0442\u043E\u043B\u0443 \u0441\u0432\u0456\u0439 QR \u2014 \u0433\u0456\u0441\u0442\u044C \u0441\u043A\u0430\u043D\u0443\u0454 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0454 \u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430 \u0446\u0435\u0439 \u0441\u0442\u0456\u043B. \u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0441\u0442\u043E\u043B\u0456\u0432 \u2014 \u0443 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u0445 \u2192 \u{1FA91} \u0417\u0430\u043B.${r.next > Date.now() ? ` \u{1F504} \u041D\u043E\u0432\u0456 \u043A\u043E\u0434\u0438 \u2014 \u043D\u0435 \u0447\u0430\u0441\u0442\u0456\u0448\u0435 \u0440\u0430\u0437\u0443 \u043D\u0430 \u043C\u0456\u0441\u044F\u0446\u044C, \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0456 \u0437 ${new Date(r.next).toLocaleDateString("uk-UA")}.` : ""}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">\u0422\u043E\u0440\u043A\u043D\u0456\u0442\u044C\u0441\u044F QR \u2014 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439 \u0443 \u0432\u0438\u0441\u043E\u043A\u0456\u0439 \u044F\u043A\u043E\u0441\u0442\u0456 (1000\xD71000).</div><div class="qr-grid">${r.list.map((x) => `<a href="#" data-mi-v="dl:${x.t}"><img src="${esc(x.img)}" alt="" loading="lazy"><b>\u0421\u0442\u0456\u043B ${x.t} \u2B07\uFE0F</b></a>`).join("")}</div>`,
      buttons: [{ label: `\u2B07\uFE0F \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0432\u0441\u0456 (${r.n})`, val: "dlall", cls: "primary" }, { label: "\u{1F4BE} \u0410\u0440\u043A\u0443\u0448 A4 / PDF", val: "file" }, ...r.next > Date.now() ? [] : [{ label: "\u{1F504} \u041D\u043E\u0432\u0456 \u043A\u043E\u0434\u0438", val: "new", cls: "red" }], { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }]
    });
    if (String(v).startsWith("dl:")) {
      const x = r.list.find((y) => y.t === +v.slice(3));
      await qrSave(x);
      return qrPanel();
    }
    if (v === "dlall") {
      toast("\u2B07\uFE0F \u0413\u043E\u0442\u0443\u044E " + r.n + " QR\u2026");
      if (matchMedia("(hover: none)").matches && navigator.canShare) {
        const fs = await Promise.all(r.list.map(async (x) => new File([await (await fetch(x.img + "?s=24")).blob()], `QR-\u0441\u0442\u0456\u043B-${x.t}.png`, { type: "image/png" }))).catch(() => null);
        if (fs && navigator.canShare({ files: fs })) {
          await navigator.share({ files: fs }).catch(() => {
          });
          return;
        }
      }
      for (const x of r.list) {
        await qrSave(x);
        await new Promise((z) => setTimeout(z, 400));
      }
    }
    if (v === "file") qrSheet(r);
    if (v === "new" && await confirmBox("\u{1F504} \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043D\u043E\u0432\u0456 QR-\u043A\u043E\u0434\u0438?", "\u0423\u0441\u0456 \u0412\u0416\u0415 \u041D\u0410\u0414\u0420\u0423\u041A\u041E\u0412\u0410\u041D\u0406 QR \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0443\u0442\u044C \u0434\u0430\u0432\u0430\u0442\u0438 \u0434\u043E\u0441\u0442\u0443\u043F \u0434\u043E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u2014 \u0457\u0445 \u0442\u0440\u0435\u0431\u0430 \u0431\u0443\u0434\u0435 \u0437\u0430\u043C\u0456\u043D\u0438\u0442\u0438 \u043D\u0430 \u0441\u0442\u043E\u043B\u0430\u0445. \u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u0447\u0435\u043A\u0456\u0432 \u043E\u0434\u0440\u0430\u0437\u0443 \u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438\u043C\u0435 \u043D\u043E\u0432\u0456.")) {
      if (await act("qrNew", {}, "\u{1F504} \u041D\u043E\u0432\u0456 \u043A\u043E\u0434\u0438 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E")) qrPanel();
    }
  }
  async function qrSave(x) {
    var _a2;
    try {
      const b = await (await fetch(x.img + "?s=24")).blob(), f = new File([b], `QR-\u0441\u0442\u0456\u043B-${x.t}.png`, { type: "image/png" });
      if (((_a2 = navigator.canShare) == null ? void 0 : _a2.call(navigator, { files: [f] })) && matchMedia("(hover: none)").matches) {
        await navigator.share({ files: [f] }).catch(() => {
        });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
    } catch (e) {
      toast("\u26A0\uFE0F \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438");
    }
  }
  function qrSheet(r) {
    var _a2;
    const name = esc(((_a2 = S.brand) == null ? void 0 : _a2.name) || "VARVAR"), w = window.open("", "_blank");
    if (!w) return toast("\u26A0\uFE0F \u0414\u043E\u0437\u0432\u043E\u043B\u044C\u0442\u0435 \u0441\u043F\u043B\u0438\u0432\u0430\u044E\u0447\u0456 \u0432\u0456\u043A\u043D\u0430");
    w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-\u043A\u043E\u0434\u0438 \u2014 ${name}</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:system-ui,sans-serif}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}.c{border:1px dashed #bbb;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid;height:84mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center}.c h2{margin:0;font-size:20pt;letter-spacing:1px}.c img{width:52mm;height:52mm;margin:3mm 0}.c b{font-size:16pt}.c small{color:#555;font-size:10pt}.bar{padding:10px;text-align:center}@media print{.bar{display:none}}</style>
      <div class="bar"><button onclick="print()" style="font-size:16px;padding:8px 16px">\u{1F5A8} \u0414\u0440\u0443\u043A / \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438 PDF</button></div><div class="g">${r.list.map((x) => `<div class="c"><h2>${name}</h2><img src="${x.img}?s=20"><b>\u0421\u0422\u0406\u041B ${x.t}</b><small>\u0421\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u2014 \u043C\u0435\u043D\u044E \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</small></div>`).join("")}</div>`);
    w.document.close();
  }
  const pickFile = () => new Promise((res) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.onchange = () => res(i.files[0] || null);
    i.click();
  });
  let phPaid = false;
  async function phCall(b) {
    var _a2;
    try {
      return await api("photoMake", __spreadValues(__spreadValues({}, b), phPaid ? { pay: 1 } : {}), 1e5);
    } catch (e) {
      if (((_a2 = e.data) == null ? void 0 : _a2.error) !== "pay") {
        toast("\u26A0\uFE0F " + errText(e.message));
        return null;
      }
      if (!await confirmBox(`\u{1F4F8} ${e.data.free} \u0431\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0438\u0445 \u0444\u043E\u0442\u043E \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u043D\u043E`, `\u0414\u0430\u043B\u0456 \u2014 ${e.data.price} \u20B4 \u0437\u0430 \u043A\u043E\u0436\u043D\u0435 \u0444\u043E\u0442\u043E (\u0434\u043E\u0434\u0430\u0441\u0442\u044C\u0441\u044F \u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0443 \u0437\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u0443). \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438?`)) return null;
      phPaid = true;
      return phCall(b);
    }
  }
  async function phRun(it, o = {}) {
    var _a2;
    toast("\u23F3 \u0428\u0406 \u043C\u0430\u043B\u044E\u0454 \u0444\u043E\u0442\u043E\u2026 \u0434\u043E \u0445\u0432\u0438\u043B\u0438\u043D\u0438");
    const r = await phCall(__spreadValues({ id: it.id }, o));
    if (!r) return;
    const v = await modal({
      title: "\u{1F4F8} " + (((_a2 = it.name) == null ? void 0 : _a2.uk) || it.name || ""),
      body: `<div class="ph-ab">${it.img && !o.data ? `<figure><img src="${esc(it.img)}" alt=""><figcaption>\u0431\u0443\u043B\u043E</figcaption></figure>` : o.data ? `<figure><img src="${o.data}" alt=""><figcaption>\u0432\u0430\u0448\u0435 \u0444\u043E\u0442\u043E</figcaption></figure>` : ""}<figure><img src="${esc(r.draft)}" alt=""><figcaption>\u0428\u0406</figcaption></figure></div><div class="muted" style="font-size:12px;margin-top:8px">\u0426\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F: ${r.n} \u0444\u043E\u0442\u043E${r.over ? ` \xB7 \u043F\u043E\u043D\u0430\u0434 \u043B\u0456\u043C\u0456\u0442 ${r.over} \xD7 ${r.price} \u20B4` : ` \u0437 ${r.free} \u0431\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0438\u0445`}</div>`,
      buttons: [{ label: "\u2705 \u0412\u0437\u044F\u0442\u0438 \u0432 \u043C\u0435\u043D\u044E", val: "ok", cls: "primary" }, { label: "\u{1F501} \u0429\u0435 \u0440\u0430\u0437", val: "again" }, { label: "\u2715 \u041D\u0435 \u0442\u0440\u0435\u0431\u0430", val: "no" }]
    });
    if (v === "ok") {
      if (await act("photoApply", { id: it.id }, "\u{1F4F8} \u0424\u043E\u0442\u043E \u0432 \u043C\u0435\u043D\u044E")) loadMenu().catch(() => {
      });
    } else if (v === "again") return phRun(it, o);
    else await api("photoDrop", { id: it.id }).catch(() => {
    });
  }
  async function phDish(it) {
    const v = await choose("\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E: " + it.name.uk, "\u0424\u043E\u0442\u043E \u0431\u0443\u0434\u0435 \u0432 \u0441\u0442\u0438\u043B\u0456 \u0437\u0430\u043A\u043B\u0430\u0434\u0443 (\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E \u2192 \u0441\u0442\u0438\u043B\u044C).", [...it.img ? [{ label: "\u{1FA84} \u041E\u0431\u0440\u043E\u0431\u0438\u0442\u0438 \u043D\u0430\u044F\u0432\u043D\u0435 \u0444\u043E\u0442\u043E", val: "edit", cls: "primary" }] : [], { label: "\u{1F4F7} \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0432\u043E\u0454 \u0439 \u043E\u0431\u0440\u043E\u0431\u0438\u0442\u0438", val: "up" }, { label: "\u2728 \u0417\u0433\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0437 \u043D\u0443\u043B\u044F", val: "gen" }]);
    if (v === "edit") return phRun(it, { mode: "edit" });
    if (v === "gen") return phRun(it, {});
    if (v === "up") {
      const f = await pickFile();
      if (f) return phRun(it, { data: await shrink(f) });
    }
  }
  async function phPanel() {
    var _a2;
    let inf;
    try {
      inf = await api("photoInfo");
    } catch (e) {
      return toast("\u26A0\uFE0F " + errText(e.message));
    }
    if (!inf.on) return toast("\u26A0\uFE0F \u0428\u0406-\u0444\u043E\u0442\u043E \u0449\u0435 \u043D\u0435 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E");
    const all = S.menu.categories.flatMap((c) => c.items), noImg = all.filter((i) => !i.img), withImg = all.filter((i) => i.img);
    const v = await modal({
      title: "\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E \u0441\u0442\u0440\u0430\u0432",
      body: `<div class="muted" style="font-size:13px">\u041E\u043F\u0438\u0448\u0456\u0442\u044C \u0441\u0442\u0438\u043B\u044C \u2014 \u0456 \u0432\u0441\u0456 \u0444\u043E\u0442\u043E \u0431\u0443\u0434\u0443\u0442\u044C \u043E\u0434\u043D\u0430\u043A\u043E\u0432\u0456: \u0428\u0406 \u0433\u0435\u043D\u0435\u0440\u0443\u0454 \u0444\u043E\u0442\u043E \u0441\u0442\u0440\u0430\u0432 \u0431\u0435\u0437 \u0444\u043E\u0442\u043E \u0430\u0431\u043E \u043F\u0440\u0438\u0431\u0438\u0440\u0430\u0454 \u0444\u043E\u043D \u0437 \u0432\u0430\u0448\u0438\u0445 \u0456 \u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0443 \u0446\u0435\u0439 \u0441\u0442\u0438\u043B\u044C.</div>
      <label style="display:block;margin-top:10px">\u{1F3A8} \u0421\u0442\u0438\u043B\u044C \u0437\u0430\u043A\u043B\u0430\u0434\u0443<textarea id="phP" rows="5" style="width:100%">${esc(inf.prompt || inf.def)}</textarea></label>
      <div class="muted" style="font-size:13px;margin-top:8px">\u0417\u0440\u0430\u0437\u043A\u0438 \u0441\u0442\u0438\u043B\u044E (\u0434\u043E 2) \u2014 \u043D\u0430\u0439\u043A\u0440\u0430\u0449\u0456 \u0432\u0430\u0448\u0456 \u0444\u043E\u0442\u043E:</div><div class="ph-refs">${inf.refs.map((u, i) => `<div style="background-image:url('${esc(u)}')"><button data-mi-v="ref:${i}">\u2715</button></div>`).join("")}${inf.refs.length < 2 ? '<button class="add" data-mi-v="addref">\uFF0B</button>' : ""}</div>
      <div class="kv" style="margin-top:10px"><span>\u0426\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F</span><b>${inf.n} / ${inf.free} \u0431\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0438\u0445${inf.over ? ` \xB7 \u043F\u043E\u043D\u0430\u0434 \u043B\u0456\u043C\u0456\u0442 ${inf.over} \xD7 ${inf.price} \u20B4` : ""}</b></div>`,
      buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0441\u0442\u0438\u043B\u044C", val: "save", cls: "primary" }, ...noImg.length ? [{ label: `\u2728 \u0424\u043E\u0442\u043E \u0434\u043B\u044F \u0432\u0441\u0456\u0445 \u0431\u0435\u0437 \u0444\u043E\u0442\u043E (${noImg.length})`, val: "gen" }] : [], ...withImg.length ? [{ label: `\u{1FA84} \u0423\u0441\u0456 \u0444\u043E\u0442\u043E \u0432 \u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u0442\u0438\u043B\u0456 (${withImg.length})`, val: "edit" }] : [], { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }],
      keep: true
    });
    if (v === "save" || v === "gen" || v === "edit" || v === "addref" || String(v).startsWith("ref:")) {
      const p = (_a2 = $("#phP")) == null ? void 0 : _a2.value.trim();
      if (p !== (inf.prompt || inf.def)) await api("photoStyleSet", { prompt: p }).catch(() => {
      });
    }
    closeModal();
    if (v === "save") toast("\u{1F4BE} \u0421\u0442\u0438\u043B\u044C \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (v === "addref") return phRef(0, true);
    if (String(v).startsWith("ref:")) return phRef(+v.slice(4));
    if (v === "gen" || v === "edit") phBatch(v === "gen" ? noImg : withImg, v, inf);
  }
  async function phRef(i, add) {
    if (!add) {
      await act("photoStyleSet", { refDel: i }, "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
      return phPanel();
    }
    const withImg = S.menu.categories.flatMap((c) => c.items).filter((x) => x.img);
    const v = await modal({ title: "\uFF0B \u0417\u0440\u0430\u0437\u043E\u043A \u0441\u0442\u0438\u043B\u044E", body: `<div class="ph-pick">${withImg.map((x) => `<button data-mi-v="${x.id}"><img src="${esc(x.img)}" alt=""><span>${esc(x.name.uk)}</span></button>`).join("")}</div>`, buttons: [{ label: "\u{1F4F7} \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0432\u043E\u0454", val: "up" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] });
    if (v === "up") {
      const f = await pickFile();
      if (f) await act("photoStyleSet", { refData: await shrink(f) }, "\uFF0B \u0417\u0440\u0430\u0437\u043E\u043A \u0434\u043E\u0434\u0430\u043D\u043E");
    } else if (v && v !== "up") await act("photoStyleSet", { refFrom: v }, "\uFF0B \u0417\u0440\u0430\u0437\u043E\u043A \u0434\u043E\u0434\u0430\u043D\u043E");
    return phPanel();
  }
  async function phBatch(list, mode, inf) {
    const left = Math.max(0, inf.free - inf.n), paid = Math.max(0, list.length - left);
    if (!await confirmBox(`${mode === "gen" ? "\u2728 \u0417\u0433\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438" : "\u{1FA84} \u041E\u0431\u0440\u043E\u0431\u0438\u0442\u0438"} ${list.length} \u0444\u043E\u0442\u043E?`, `\u0411\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u043E \u0449\u0435 ${left}.${paid ? ` \u041F\u043E\u043D\u0430\u0434 \u043B\u0456\u043C\u0456\u0442 \u2014 ${paid} \xD7 ${inf.price} \u20B4 = ${paid * inf.price} \u20B4.` : ""} \u0417\u0430\u0439\u043C\u0435 ~${Math.ceil(list.length * 0.3)} \u0445\u0432; \u043D\u0435 \u0437\u0430\u043A\u0440\u0438\u0432\u0430\u0439\u0442\u0435 \u043A\u0430\u0441\u0443.`)) return;
    if (paid) phPaid = true;
    const done = [];
    for (const [k, it] of list.entries()) {
      toast(`\u23F3 ${k + 1} / ${list.length}: ${it.name.uk}`);
      const r = await phCall(__spreadValues({ id: it.id }, mode === "edit" ? { mode: "edit" } : {}));
      if (r) done.push({ it, u: r.draft });
      else if (!phPaid) break;
    }
    if (!done.length) return;
    const v = await modal({ title: `\u{1F4F8} \u0413\u043E\u0442\u043E\u0432\u043E: ${done.length}`, body: `<div class="muted" style="font-size:13px">\u0422\u043E\u0440\u043A\u043D\u0456\u0442\u044C\u0441\u044F \u0444\u043E\u0442\u043E, \u044F\u043A\u0435 \u041D\u0415 \u043F\u043E\u0434\u043E\u0431\u0430\u0454\u0442\u044C\u0441\u044F, \u2014 \u0432\u043E\u043D\u043E \u043D\u0435 \u043F\u0456\u0434\u0435 \u0432 \u043C\u0435\u043D\u044E.</div><div class="ph-pick">${done.map((d, i) => `<button class="on" onclick="this.classList.toggle('on')" data-ph="${i}"><img src="${esc(d.u)}" alt=""><span>${esc(d.it.name.uk)}</span></button>`).join("")}</div>`, buttons: [{ label: "\u2705 \u0412\u0437\u044F\u0442\u0438 \u043F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0456", val: "ok", cls: "primary" }, { label: "\u2715 \u041D\u0456\u0447\u043E\u0433\u043E", val: "no" }], keep: true });
    const keep = new Set([...document.querySelectorAll("[data-ph].on")].map((b) => +b.dataset.ph));
    closeModal();
    let n = 0;
    for (const [i, d] of done.entries()) {
      if (v === "ok" && keep.has(i)) {
        if (await api("photoApply", { id: d.it.id }).catch(() => null)) n++;
      } else await api("photoDrop", { id: d.it.id }).catch(() => {
      });
    }
    toast(`\u{1F4F8} \u0423 \u043C\u0435\u043D\u044E: ${n} \u0444\u043E\u0442\u043E`);
    loadMenu().catch(() => {
    });
  }
  function shrink(file, max = 1200, qq = 0.85) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * k;
        c.height = img.height * k;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", qq));
      };
      img.src = URL.createObjectURL(file);
    });
  }
  const LOY_W = { hall: "\u{1FA91} \u0437\u0430\u043B", pick: "\u{1F961} \u0437 \u0441\u043E\u0431\u043E\u044E", del: "\u{1F6F5} \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430" }, LOY_D = ["", "\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u041D\u0434"];
  const bdTxt = (bd) => bd ? `${bd.slice(3)}.${bd.slice(0, 2)}` : "";
  const ruleName = (r) => r.name || ({ cat: `\u2212${r.pct}%`, happy: `\u0429\u0430\u0441\u043B\u0438\u0432\u0456 \u0433\u043E\u0434\u0438\u043D\u0438 \u2212${r.pct}%`, nth: `\u041A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A`, sum: r.gift ? `\u0412\u0456\u0434 ${r.min} \u20B4 \u2014 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A` : `\u0412\u0456\u0434 ${r.min} \u20B4 \u2212${r.pct}%`, bday: `\u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u2212${r.pct}%` }[r.type] || "\u0410\u043A\u0446\u0456\u044F");
  const lvCond = (l) => l.man ? "\u043B\u0438\u0448\u0435 \u0432\u0440\u0443\u0447\u043D\u0443" : [l.n ? `\u0432\u0456\u0434 ${l.n} \u0432\u0456\u0437\u0438\u0442\u0456\u0432` : "", l.sum ? `\u0432\u0456\u0434 ${money(l.sum)}` : ""].filter(Boolean).join(" \u0430\u0431\u043E ") || "\u0443\u0441\u0456 \u043A\u043B\u0456\u0454\u043D\u0442\u0438";
  const inboxBtn = () => S.gInN ? `<button class="btn red bk-blink" data-a="gbInbox" title="\u0413\u043E\u0441\u0442\u0456 \u043D\u0430\u043F\u0438\u0441\u0430\u043B\u0438 \u2014 \u0432\u0456\u0434\u043F\u0438\u0448\u0456\u0442\u044C">\u2709\uFE0F ${S.gInN}</button>` : `<button class="btn ghost" data-a="gbInbox" title="\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u0435\u0439">\u2709\uFE0F</button>`;
  const agoT = (at) => {
    const m = Math.round((Date.now() - at) / 6e4);
    return m < 1 ? "\u0449\u043E\u0439\u043D\u043E" : m < 60 ? m + " \u0445\u0432" : m < 1440 ? Math.round(m / 60) + " \u0433\u043E\u0434" : new Date(at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
  };
  async function gbInbox() {
    const r = await act("gbInbox", {});
    if (!r) return;
    const v = await modal({ title: "\u2709\uFE0F \u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u0435\u0439", body: `<div class="muted set-note">\u041F\u0438\u0448\u0443\u0442\u044C \u0443 \u0431\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439: \xAB\u{1F4AC} \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u043D\u0430\u043C\xBB, \u0432\u0456\u0434\u0433\u0443\u043A\u0438 \u0439 \u043D\u0438\u0437\u044C\u043A\u0456 \u043E\u0446\u0456\u043D\u043A\u0438 \u043F\u0456\u0441\u043B\u044F \u0432\u0456\u0437\u0438\u0442\u0443. \u{1F534} \u2014 \u0447\u0435\u043A\u0430\u044E\u0442\u044C \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456.</div><div class="bk-list">${r.list.map((x) => {
      var _a2, _b, _c;
      return `<button class="kv press inb${x.open ? " open" : ""}" data-a="gbThread" data-ph="${x.ph}" style="width:100%;text-align:left"><span style="min-width:0;overflow-wrap:anywhere">${x.open ? "\u{1F534} " : ""}<b>${esc(x.name || "\u2014")}</b> <small class="muted">${fmtPh(x.ph)}</small><br><small class="${x.open ? "" : "muted"}">${((_a2 = x.lastMsg) == null ? void 0 : _a2.f) === "s" ? "\u21A9\uFE0F " : ((_b = x.lastMsg) == null ? void 0 : _b.k) === "rev" ? "" : "\u{1F464} "}${esc((((_c = x.lastMsg) == null ? void 0 : _c.text) || "").slice(0, 90))}</small></span><span class="kv-r"><small class="muted">${agoT(x.last)}</small></span></button>`;
    }).join("") || '<div class="muted">\u0429\u0435 \u043D\u0456\u0445\u0442\u043E \u043D\u0435 \u043F\u0438\u0441\u0430\u0432</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  async function gbThread(ph) {
    closeModal();
    const r = await act("gbThread", { ph });
    if (!r) return;
    const x = r.th, c = r.cli;
    const body = `<div class="muted" style="font-size:12px;margin-bottom:8px">\u{1F4DE} <a href="tel:+${x.ph}">${fmtPh(x.ph)}</a>${c ? ` \xB7 \u{1F9FE} ${c.n} \u0432\u0456\u0437\u0438\u0442\u0456\u0432 \xB7 ${money(c.sum)} \xB7 \u{1F381} ${money(c.bal)}` : ""}${c && !c.tg ? " \xB7 \u26A0\uFE0F \u0432\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0432 \u0431\u043E\u0442\u0430" : ""}</div>
      <div class="chat">${x.msgs.map((m) => `<div class="msg ${m.f === "g" ? "in" : "out"}${m.sys ? " sys" : ""}${m.k === "rev" ? " rev" : ""}"><div>${esc(m.text)}</div><small>${m.f === "s" ? esc(m.by || "") + " \xB7 " : ""}${agoT(m.at)}</small></div>`).join("")}</div>`;
    const v = await modal({ title: `\u2709\uFE0F ${x.name || fmtPh(x.ph)}`, body, buttons: [{ label: "\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438", val: "rep", cls: "primary" }, ...x.open ? [{ label: "\u2714\uFE0F \u0411\u0435\u0437 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456", val: "close" }] : [], { label: "\u2190 \u0423\u0441\u0456", val: "back" }] });
    if (v === "rep") {
      const text = await ask("\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C \u0433\u043E\u0441\u0442\u044E \u0432 Telegram", "\u0422\u0435\u043A\u0441\u0442");
      if (text && await act("gbReply", { ph, text }, "\u2705 \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E")) loadState().catch(() => {
      });
      return gbThread(ph);
    }
    if (v === "close") {
      if (await act("gbClose", { ph }, "\u2714\uFE0F \u0417\u0430\u043A\u0440\u0438\u0442\u043E")) loadState().catch(() => {
      });
      return gbInbox();
    }
    if (v === "back") return gbInbox();
  }
  async function loadLoy(part) {
    try {
      if (!S.data.loy || part === "cfg") S.data.loy = await api("loyGet");
      const t = S.loyTab || "cli";
      if (t === "cli" && part !== "cfg") S.data.loyCli = (await api("loyCli", { q: S.loyQ || "", f: S.loyF || "tg" })).list;
      if (t === "bot" && isAdmin() && part !== "cfg") S.data.gb = await api("gbGet");
      if (t === "rep" && isAdmin()) {
        const [from, to] = loyRange();
        S.data.loyRep = await api("loyRep", { from, to }, 3e4);
      }
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
    if (S.view === "settings") renderMain();
  }
  function loyRange() {
    const p = S.loyP || "d", to = todayK();
    return [p === "d" ? to : p === "w" ? addD(to, -6) : to.slice(0, 8) + "01", to];
  }
  function loyHTML() {
    const D = S.data.loy;
    if (!D) {
      if (!S._loyL) {
        S._loyL = 1;
        loadLoy().finally(() => {
          S._loyL = 0;
        });
      }
      return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    }
    const c = D.cfg, tab = S.loyTab || "cli", adm = isAdmin();
    const TABS2 = [["cli", "\u{1F465} \u041A\u043B\u0456\u0454\u043D\u0442\u0438"], ["lvl", "\u{1F3C5} \u0420\u0456\u0432\u043D\u0456"], ["rules", "\u{1F3AF} \u0410\u043A\u0446\u0456\u0457"], ...adm ? [["rep", "\u{1F4CA} \u0417\u0432\u0456\u0442"], ["bot", "\u{1F916} \u0411\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439"]] : []];
    const seg = `<div class="seg wrap" style="margin:12px 0">${TABS2.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-a="loyTab" data-s="${k}">${l}</button>`).join("")}</div>`;
    let body = "";
    if (tab === "lvl") body = `<div class="grid2 set">
      <div class="card"><h3>\u{1F3C5} \u0420\u0456\u0432\u043D\u0456 \u043F\u043E\u0441\u0442\u0456\u0439\u043D\u0438\u0445 \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432</h3><div class="muted set-note">\u0420\u0456\u0432\u0435\u043D\u044C \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0441\u0430\u043C \u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C (\u0432\u0456\u0437\u0438\u0442\u0438 \u0430\u0431\u043E \u0441\u0443\u043C\u0430). \xAB\u0412\u0440\u0443\u0447\u043D\u0443\xBB \u2014 \u043F\u0440\u0438\u0437\u043D\u0430\u0447\u0430\u0454 \u0430\u0434\u043C\u0456\u043D \u0443 \u043A\u0430\u0440\u0442\u0446\u0456 \u043A\u043B\u0456\u0454\u043D\u0442\u0430 (VIP, \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B, \u0434\u0440\u0443\u0437\u0456). \u0417\u043D\u0438\u0436\u043A\u0430 \u0440\u0456\u0432\u043D\u044F \u0439 \u0440\u0443\u0447\u043D\u0430 \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430 \u043D\u0435 \u0441\u043A\u043B\u0430\u0434\u0430\u044E\u0442\u044C\u0441\u044F \u2014 \u0434\u0456\u0454 \u0431\u0456\u043B\u044C\u0448\u0430.</div>
        ${c.levels.map((l) => `<div class="kv"><span>${esc(l.e)} <b>${esc(l.name)}</b><br><small class="muted">${lvCond(l)}</small></span><span class="kv-r"><b>${l.pct ? "\u2212" + l.pct + "%" : ""}${l.cash ? ` \u{1F4B8}${l.cash}%` : ""}${!l.pct && !l.cash ? "\u2014" : ""}</b>${adm ? `<button class="btn sm" data-a="loyLv" data-id="${l.id}">\u270F\uFE0F</button>` : ""}</span></div>`).join("")}
        ${adm ? '<button class="btn sm primary" style="margin-top:10px" data-a="loyLv" data-id="">\u2795 \u0420\u0456\u0432\u0435\u043D\u044C</button>' : ""}</div>
      <div class="card"><h3>\u2699\uFE0F \u0417\u0430\u0433\u0430\u043B\u044C\u043D\u0435</h3>
        <button class="sf press" data-a="loyOn" ${adm ? "" : "disabled"}><span><b>\u{1F381} \u0410\u043A\u0446\u0456\u0457 \u0439 \u0440\u0456\u0432\u043D\u0456</b><small>\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u0432 \u0437\u0430\u043B\u0456, \u0437 \u0441\u043E\u0431\u043E\u044E \u0456 \u0432 \u0434\u043E\u0441\u0442\u0430\u0432\u0446\u0456 (\u0441\u0430\u0439\u0442 ?go \u0442\u0435\u0436)</small></span><span class="switch ${c.on ? "on" : ""}"></span></button>
        <div class="kv"><span>\u{1F9E2} \u0421\u0442\u0435\u043B\u044F \u0432\u0441\u0456\u0445 \u0437\u043D\u0438\u0436\u043E\u043A \u0440\u0430\u0437\u043E\u043C<br><small class="muted">\u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u0441\u0442\u0440\u0430\u0432 \u0443 \u0447\u0435\u043A\u0443</small></span><span class="kv-r"><b>${c.max}%</b>${adm ? '<button class="btn sm" data-a="loyMax">\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button>' : ""}</span></div>
        <div class="muted set-note" style="margin-top:8px">\u{1F4B8} \u041A\u0435\u0448\u0431\u0435\u043A \u0440\u0456\u0432\u043D\u044F \u0437\u0430\u043C\u0456\u043D\u044E\u0454 \u0437\u0430\u0433\u0430\u043B\u044C\u043D\u0438\u0439 \u043A\u0435\u0448\u0431\u0435\u043A (\u2699\uFE0F \u2192 \u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u2192 \u0411\u043E\u043D\u0443\u0441\u0438), \u044F\u043A\u0449\u043E \u0431\u0456\u043B\u044C\u0448\u0438\u0439 \u0437\u0430 0.</div></div></div>`;
    if (tab === "bot") {
      const G = S.data.gb;
      body = !G ? '<div class="muted">\u2026</div>' : (() => {
        var _a2;
        const g = G.cfg, sw2 = (k, t, d) => `<button class="sf press" data-a="gbSw" data-k="${k}"><span><b>${t}</b><small>${d}</small></span><span class="switch ${g[k] ? "on" : ""}"></span></button>`, kv = (k, t, v) => `<div class="kv"><span>${t}</span><span class="kv-r"><b>${esc(String(v))}</b><button class="btn sm" data-a="gbEd" data-k="${k}">\u270F\uFE0F</button></span></div>`, tx = (k, v) => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">\u270D\uFE0F \u0422\u0435\u043A\u0441\u0442<br><small class="muted">${esc(v)}</small></span><span class="kv-r"><button class="btn sm" data-a="gbEd" data-k="${k}">\u270F\uFE0F</button></span></div>`;
        return `<div class="grid2 set">
      <div class="card"><h3>\u{1F4E3} \u0420\u043E\u0437\u0441\u0438\u043B\u043A\u0430</h3><div class="muted set-note">\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0431\u043E\u0442 \u0433\u043E\u0441\u0442\u044F\u043C, \u044F\u043A\u0456 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u043B\u0438 Telegram: <b>${G.linked}</b>. \u041F\u0456\u0434 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u2014 \u043A\u043D\u043E\u043F\u043A\u0430 \xAB\u{1F354} \u0417\u0430\u043C\u043E\u0432\u0438\u0442\u0438\xBB.</div>
        <button class="btn primary" data-a="gbCast">\u{1F4E3} \u041D\u043E\u0432\u0430 \u0440\u043E\u0437\u0441\u0438\u043B\u043A\u0430</button>${kv("gap", "\u23F3 \u041D\u0435 \u0447\u0430\u0441\u0442\u0456\u0448\u0435 \u043D\u0456\u0436 \u0440\u0430\u0437 \u043D\u0430, \u0433\u043E\u0434", g.gap)}</div>
      <div class="card"><h3>\u{1F916} \u0429\u043E \u0431\u043E\u0442 \u0440\u043E\u0431\u0438\u0442\u044C \u0441\u0430\u043C</h3>${sw2("stat", "\u{1F6F5} \u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u041F\u0440\u0438\u0439\u043D\u044F\u0442\u043E \xB7 \u0433\u043E\u0442\u0443\u0454\u0442\u044C\u0441\u044F \xB7 \u0433\u043E\u0442\u043E\u0432\u043E \xB7 \u043A\u0443\u0440'\u0454\u0440 \u0432\u0438\u0457\u0445\u0430\u0432")}${sw2("bon", "\u{1F381} \u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u0456 \u0431\u043E\u043D\u0443\u0441\u0438", "\xAB+35 \u0431\u043E\u043D\u0443\u0441\u0456\u0432, \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 210\xBB \u043F\u0456\u0441\u043B\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u0447\u0435\u043A\u0430")}${sw2("chat", "\u{1F4AC} \u0427\u0430\u0442 \u0437 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C", "\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F \u2014 \u0443 \u0441\u0442\u0440\u0456\u0447\u043A\u0443 \u0439 \u0433\u0440\u0443\u043F\u0443, \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C \u2014 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438\xBB")}</div>
      <div class="card"><h3>\u{1F382} \u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F</h3>${sw2("bd", "\u{1F382} \u0412\u0456\u0442\u0430\u0442\u0438 \u0432 \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F", "\u0413\u0456\u0441\u0442\u044C \u0432\u043A\u0430\u0437\u0443\u0454 \u0434\u0430\u0442\u0443 \u0432 \u0431\u043E\u0442\u0456. \u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0430\u043A\u0446\u0456\u0454\u044E \xAB\u{1F382} \u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F\xBB")}<div class="kv"><span>\u{1F381} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A (\u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0443 \u0431\u043E\u0442)<br><small class="muted">\u0440\u0430\u0437 \u043D\u0430 \u0440\u0456\u043A, \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0434 \u0443 \xAB\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\xBB</small></span><span class="kv-r"><b>${esc(((_a2 = G.gifts.find((x) => x.id === g.bdGift)) == null ? void 0 : _a2.n) || "\u0431\u0435\u0437 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u0430")}</b><button class="btn sm" data-a="gbGift">\u270F\uFE0F</button></span></div>${kv("bdGiftDays", "\u{1F4C6} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0434\u0456\u0454, \u0434\u043D\u0456\u0432", g.bdGiftDays)}${tx("bdText", g.bdText)}</div>
      <div class="card"><h3>\u{1F44B} \xAB\u0421\u043F\u043B\u044F\u0447\u0456\xBB \u0433\u043E\u0441\u0442\u0456</h3>${sw2("sleep", "\u{1F44B} \u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u0442\u0438 \u0442\u0438\u043C, \u0445\u0442\u043E \u0434\u0430\u0432\u043D\u043E \u043D\u0435 \u0431\u0443\u0432", "\u0420\u0430\u0437 \u043D\u0430 \u0434\u0435\u043D\u044C, \u043E 11:00\u201320:00; \u043E\u0434\u043D\u043E\u043C\u0443 \u0433\u043E\u0441\u0442\u044E \u2014 \u043D\u0435 \u0447\u0430\u0441\u0442\u0456\u0448\u0435 \u043D\u0456\u0436 \u0440\u0430\u0437 \u043D\u0430 2 \u043F\u0435\u0440\u0456\u043E\u0434\u0438")}${kv("sleepDays", "\u{1F4C6} \u041D\u0435 \u0431\u0443\u0432 \u0434\u043D\u0456\u0432", g.sleepDays)}${kv("sleepBon", "\u{1F381} \u041F\u043E\u0434\u0430\u0440\u0443\u0432\u0430\u0442\u0438 \u0431\u043E\u043D\u0443\u0441\u0456\u0432", g.sleepBon)}${tx("sleepText", g.sleepText)}</div></div>`;
      })();
    }
    if (tab === "rules") body = `<div class="grid2 set">${c.rules.map((r) => `<div class="card"><h3>${r.on ? "" : "\u26D4 "}${esc(ruleName(r))}</h3>
        <div class="kv"><span>${D.T[r.type] || r.type}</span>${adm ? `<span class="switch ${r.on ? "on" : ""}" data-a="loyRuleOn" data-id="${r.id}" role="switch"></span>` : `<b>${r.on ? "\u2705" : "\u26D4"}</b>`}</div>
        <div class="muted set-note">${esc(ruleWhat(r, D))}</div>
        ${adm ? `<div class="btnrow"><button class="btn sm" data-a="loyRule" data-id="${r.id}">\u270F\uFE0F \u0417\u043C\u0456\u043D\u0438\u0442\u0438</button><button class="btn sm red" data-a="loyRuleDel" data-id="${r.id}">\u{1F5D1}</button></div>` : ""}</div>`).join("")}
      <div class="card"><h3>\u2795 \u041D\u043E\u0432\u0430 \u0430\u043A\u0446\u0456\u044F</h3><div class="muted set-note">% \u043D\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044E/\u0441\u0442\u0440\u0430\u0432\u0443 \xB7 \u0449\u0430\u0441\u043B\u0438\u0432\u0456 \u0433\u043E\u0434\u0438\u043D\u0438 \xB7 N-\u0442\u0430 \u043A\u0430\u0432\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \xB7 \u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u2014 \u0437\u043D\u0438\u0436\u043A\u0430 \u0430\u0431\u043E \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \xB7 \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \xB1N \u0434\u043D\u0456\u0432. \u0423\u043C\u043E\u0432\u0438: \u0437\u0430\u043B / \u0437 \u0441\u043E\u0431\u043E\u044E / \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430, \u043F\u0435\u0440\u0456\u043E\u0434 \u0434\u0456\u0457. \u0417\u043D\u0438\u0436\u043A\u0438 \u0440\u0430\u0445\u0443\u0454 \u0441\u0435\u0440\u0432\u0435\u0440 \u0456 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 \u0432 \u0447\u0435\u043A\u0443 \u043D\u0430\u0437\u0432\u043E\u044E \u0430\u043A\u0446\u0456\u0457.</div>
        ${adm ? '<button class="btn sm primary" data-a="loyRule" data-id="">\u2795 \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438</button>' : '<div class="muted">\u0421\u0442\u0432\u043E\u0440\u044E\u0454 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440</div>'}</div></div>`;
    if (tab === "cli") {
      const L = S.data.loyCli, f = S.loyF || "tg";
      const F = [["tg", "\u{1F4F1} \u0423 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0456"], ["all", "\u0423\u0441\u0456 \u043D\u043E\u043C\u0435\u0440\u0438"], ...c.levels.map((l) => [l.id, `${l.e} ${l.name}`]), ["bd", "\u{1F382} \u0414\u041D \xB17 \u0434\u043D\u0456\u0432"], ["sleep", "\u{1F634} \u041D\u0435 \u0431\u0443\u043B\u0438 30+ \u0434\u043D\u0456\u0432"], ["bal", "\u{1F381} \u0404 \u0431\u043E\u043D\u0443\u0441\u0438"]];
      body = `<div class="card"><div class="muted set-note">\u{1F4F1} \u0423 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0456 \u043B\u043E\u044F\u043B\u044C\u043D\u043E\u0441\u0442\u0456 \u2014 \u043B\u0438\u0448\u0435 \u0433\u043E\u0441\u0442\u0456, \u044F\u043A\u0456 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u043B\u0438 \u0431\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439 (\u0431\u043E\u043D\u0443\u0441\u0438, \u0437\u043D\u0438\u0436\u043A\u0438 \u0440\u0456\u0432\u043D\u044F, \u0414\u041D). \u0406\u043D\u0448\u0456 \u043D\u043E\u043C\u0435\u0440\u0438 \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u0456\u0441\u0442\u043E\u0440\u0456\u044F \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C: \u0431\u043E\u043D\u0443\u0441\u0438 \u0457\u043C \u043D\u0435 \u043D\u0430\u0440\u0430\u0445\u043E\u0432\u0443\u044E\u0442\u044C\u0441\u044F, \u0434\u043E\u043A\u0438 \u043D\u0435 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0430\u0442\u044C \u0431\u043E\u0442. \u270B \u2014 \u0440\u0456\u0432\u0435\u043D\u044C, \u044F\u043A\u0438\u0439 \u0430\u0434\u043C\u0456\u043D \u0434\u0430\u0432 \u0432\u0440\u0443\u0447\u043D\u0443 (\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B, VIP), \u0434\u0456\u0454 \u0456 \u0431\u0435\u0437 \u0431\u043E\u0442\u0430.</div><div class="srow" style="margin-bottom:10px"><input id="loyQ" placeholder="\u{1F50E} \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0430\u0431\u043E \u0456\u043C'\u044F" value="${esc(S.loyQ || "")}" inputmode="search"><button class="btn sm primary" data-a="loyFind">\u0417\u043D\u0430\u0439\u0442\u0438</button></div>
        <div class="btnrow" style="flex-wrap:wrap">${F.map(([k, l]) => `<button class="chip sm ${f === k ? "on" : ""}" data-a="loyF" data-f="${k}">${esc(l)}</button>`).join("")}</div>
        <div style="margin-top:10px">${!L ? '<div class="muted">\u2026</div>' : L.length ? L.map((x) => `<button class="kv press" style="width:100%;text-align:left" data-a="loyCli" data-ph="${x.phone}"><span>${x.tg ? "\u{1F4F1} " : ""}<b>${esc(x.name || "\u2014")}</b> <span class="muted">${fmtPh(x.phone)}</span>${!x.tg && !x.man ? ' <small class="warn">\u043D\u0435 \u0432 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0456</small>' : ""}<br><small class="muted">${esc(x.lvn || "")}${x.man ? " \u270B" : ""} \xB7 ${x.n} \u0432\u0456\u0437. \xB7 ${money(x.sum)}${x.bal ? ` \xB7 \u{1F381} ${money(x.bal)}` : ""}${x.bd ? ` \xB7 \u{1F382} ${bdTxt(x.bd)}` : ""}</small></span><span class="muted">\u203A</span></button>`).join("") : `<div class="muted">\u041D\u0456\u043A\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u041A\u043B\u0456\u0454\u043D\u0442 \u0437'\u044F\u0432\u043B\u044F\u0454\u0442\u044C\u0441\u044F, \u043A\u043E\u043B\u0438 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 / \u0432 \u0434\u043E\u0441\u0442\u0430\u0432\u0446\u0456 \u0432\u043A\u0430\u0437\u0430\u043B\u0438 \u0439\u043E\u0433\u043E \u0442\u0435\u043B\u0435\u0444\u043E\u043D.</div>`}</div>
        ${(L == null ? void 0 : L.length) === 200 ? '<div class="muted set-note">\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u043F\u0435\u0440\u0448\u0456 200 \u2014 \u0443\u0442\u043E\u0447\u043D\u0456\u0442\u044C \u043F\u043E\u0448\u0443\u043A</div>' : ""}</div>`;
    }
    if (tab === "rep") {
      const R = S.data.loyRep, p = S.loyP || "d";
      body = `<div class="btnrow" style="margin-bottom:10px">${[["d", "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["w", "7 \u0434\u043D\u0456\u0432"], ["m", "\u0426\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"]].map(([k, l]) => `<button class="chip sm ${p === k ? "on" : ""}" data-a="loyP" data-p="${k}">${l}</button>`).join("")}</div>
        ${!R ? '<div class="muted">\u2026</div>' : `<div class="grid2 set"><div class="card"><h3>\u{1F4CA} \u0417\u043D\u0438\u0436\u043A\u0438 \u0437\u0430 \u0430\u043A\u0446\u0456\u044F\u043C\u0438 \u0439 \u0440\u0456\u0432\u043D\u044F\u043C\u0438</h3>
          <div class="kv"><span>\u{1F381} \u0414\u0430\u043D\u043E \u0437\u043D\u0438\u0436\u043E\u043A</span><b class="money">${money(R.sum)}</b></div><div class="kv"><span>\u{1F9FE} \u0427\u0435\u043A\u0456\u0432 \u0437 \u0430\u043A\u0446\u0456\u044F\u043C\u0438</span><b>${R.checks}</b></div>
          <div class="kv"><span>\u{1F4B0} \u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0446\u0438\u0445 \u0447\u0435\u043A\u0456\u0432</span><b class="money">${money(R.gross)}</b></div><div class="kv"><span>\u{1F4DE} \u0427\u0435\u043A\u0456\u0432 \u0437 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C \u0433\u043E\u0441\u0442\u044F</span><b>${R.cli}</b></div>
          <div class="kv"><span>\u{1F3F7} \u0420\u0443\u0447\u043D\u0456 \u0437\u043D\u0438\u0436\u043A\u0438 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0456\u0432</span><b class="money">${money(R.manual)}</b></div></div>
          <div class="card"><h3>\u{1F3AF} \u041F\u043E \u0430\u043A\u0446\u0456\u044F\u0445</h3>${R.list.map((x) => `<div class="kv"><span>${esc(x.n)} <span class="muted">\xB7 ${x.q}\xD7</span></span><b class="money">${money(x.sum)}</b></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435 \u0431\u0443\u043B\u043E</div>'}</div></div>`}`;
    }
    return seg + body;
  }
  function ruleWhat(r, D) {
    var _a2, _b, _c;
    const cn = (id) => {
      var _a3;
      return ((_a3 = D.cats.find((c) => c.id === id)) == null ? void 0 : _a3.n) || id;
    }, what = [...(r.cats || []).map(cn), ...r.dishes || []].join(", ");
    return [
      r.type === "happy" ? `${((_a2 = r.days) == null ? void 0 : _a2.length) ? r.days.map((d) => LOY_D[d]).join(", ") : "\u0449\u043E\u0434\u043D\u044F"} ${r.from}\u2013${r.to}` : "",
      r.type === "nth" ? `\u043A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430` : "",
      r.type === "sum" ? `\u0432\u0456\u0434 ${money(r.min)} \u2192 ${r.gift ? "\u{1F381} " + r.gift : "\u2212" + r.pct + "%"}` : "",
      r.type === "bday" ? `\xB1${(_b = r.bdays) != null ? _b : 3} \u0434\u043D. \u0432\u0456\u0434 \u0414\u041D (\u0434\u0430\u0442\u0430 \u0432 \u043A\u0430\u0440\u0442\u0446\u0456 \u043A\u043B\u0456\u0454\u043D\u0442\u0430)` : "",
      what ? "\u{1F37D} " + what : r.type === "sum" || r.type === "bday" ? "" : "\u{1F37D} \u0443\u0441\u0435 \u043C\u0435\u043D\u044E",
      ((_c = r.where) == null ? void 0 : _c.length) ? r.where.map((w) => LOY_W[w]).join(" ") : "\u{1FA91}\u{1F961}\u{1F6F5} \u0441\u043A\u0440\u0456\u0437\u044C",
      r.d1 || r.d2 ? `\u{1F4C5} ${r.d1 || "\u2026"} \u2014 ${r.d2 || "\u2026"}` : ""
    ].filter(Boolean).join(" \xB7 ");
  }
  async function loyLvEdit(id) {
    const c = S.data.loy.cfg, l = c.levels.find((x) => x.id === id) || { e: "\u{1F381}", name: "", n: 0, sum: 0, pct: 0, cash: 0 };
    const body = `<div class="form"><label>\u0415\u043C\u043E\u0434\u0437\u0456 \u0456 \u043D\u0430\u0437\u0432\u0430<div class="srow"><input id="lE" value="${esc(l.e)}" style="max-width:70px"><input id="lN" value="${esc(l.name)}" placeholder="\u041F\u043E\u0441\u0442\u0456\u0439\u043D\u0438\u0439"></div></label>
      <label><input type="checkbox" id="lM" ${l.man ? "checked" : ""}> \u041B\u0438\u0448\u0435 \u0432\u0440\u0443\u0447\u043D\u0443 (VIP, \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B, \u0434\u0440\u0443\u0437\u0456)</label>
      <label>\u0412\u0456\u0434 \u0441\u043A\u0456\u043B\u044C\u043A\u043E\u0445 \u0432\u0456\u0437\u0438\u0442\u0456\u0432 (0 \u2014 \u043D\u0435 \u0432\u0440\u0430\u0445\u043E\u0432\u0443\u0432\u0430\u0442\u0438)<input id="lV" inputmode="numeric" value="${l.n || 0}"></label><label>\u0410\u0431\u043E \u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u043F\u043E\u043A\u0443\u043F\u043E\u043A, \u20B4 (0 \u2014 \u043D\u0435 \u0432\u0440\u0430\u0445\u043E\u0432\u0443\u0432\u0430\u0442\u0438)<input id="lS" inputmode="numeric" value="${l.sum || 0}"></label>
      <label>\u0417\u043D\u0438\u0436\u043A\u0430 \u0440\u0456\u0432\u043D\u044F, %<input id="lP" inputmode="numeric" value="${l.pct || 0}"></label><label>\u041A\u0435\u0448\u0431\u0435\u043A \u0440\u0456\u0432\u043D\u044F, % (0 \u2014 \u0437\u0430\u0433\u0430\u043B\u044C\u043D\u0438\u0439)<input id="lC" inputmode="numeric" value="${l.cash || 0}"></label></div>`;
    const v = await modal({ title: id ? "\u{1F3C5} \u0420\u0456\u0432\u0435\u043D\u044C" : "\u2795 \u041D\u043E\u0432\u0438\u0439 \u0440\u0456\u0432\u0435\u043D\u044C", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, ...id ? [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438", val: "del", cls: "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const lv = v === "ok" ? { id, e: $("#lE").value, name: $("#lN").value, man: $("#lM").checked ? 1 : 0, n: +$("#lV").value || 0, sum: +$("#lS").value || 0, pct: +$("#lP").value || 0, cash: +$("#lC").value || 0 } : null;
    closeModal();
    if (v === "del" && await confirmBox(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0440\u0456\u0432\u0435\u043D\u044C \xAB${l.name}\xBB?`, "\u041A\u043B\u0456\u0454\u043D\u0442\u0438 \u0437 \u0446\u0438\u043C \u0440\u0443\u0447\u043D\u0438\u043C \u0440\u0456\u0432\u043D\u0435\u043C \u043E\u0442\u0440\u0438\u043C\u0430\u044E\u0442\u044C \u0440\u0456\u0432\u0435\u043D\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E")) {
      const r = await act("loyLevel", { del: id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
      if (r) S.data.loy.cfg = r.cfg;
    }
    if (lv) {
      const r = await act("loyLevel", { lv }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (r) S.data.loy.cfg = r.cfg;
    }
    renderMain();
  }
  async function loyRuleEdit(id) {
    var _a2, _b;
    const D = S.data.loy, r = D.cfg.rules.find((x) => x.id === id) || { type: "happy", on: 1, pct: 10, where: [], cats: [], dishes: [], days: [], from: "15:00", to: "18:00", n: 5, min: 1e3, bdays: 3 };
    const chk = (name, val, on, l) => `<label class="chip sm ${on ? "on" : ""}" style="display:inline-flex;gap:6px;align-items:center;margin:0 6px 6px 0"><input type="checkbox" name="${name}" value="${val}" ${on ? "checked" : ""} style="width:auto;margin:0">${l}</label>`;
    const body = `<div class="form">
      <label>\u0422\u0438\u043F<select id="rT">${Object.entries(D.T).map(([k, l]) => `<option value="${k}" ${r.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>\u041D\u0430\u0437\u0432\u0430 \u0432 \u0447\u0435\u043A\u0443 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)<input id="rN" value="${esc(r.name || "")}" placeholder="\u043D\u0430\u043F\u0440. \u2615 \u041A\u043E\u0436\u043D\u0430 5-\u0442\u0430 \u043A\u0430\u0432\u0430"></label>
      <label data-f="pct">\u0417\u043D\u0438\u0436\u043A\u0430, %<input id="rP" inputmode="numeric" value="${r.pct || 0}"></label>
      <label data-f="n">\u041A\u043E\u0436\u043D\u0430 N-\u0442\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A, N<input id="rNth" inputmode="numeric" value="${r.n || 5}"></label>
      <label data-f="min">\u0412\u0456\u0434 \u0441\u0443\u043C\u0438, \u20B4<input id="rMin" inputmode="numeric" value="${r.min || 1e3}"></label>
      <label data-f="gift">\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u2014 \u0441\u0442\u0440\u0430\u0432\u0430 (\u0437\u0430\u043C\u0456\u0441\u0442\u044C %; \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u0437\u043D\u0438\u0436\u043A\u0430 %)<input id="rGift" list="rDl" value="${esc(r.gift || "")}"></label>
      <label data-f="bdays">\u0414\u043D\u0456\u0432 \u0434\u043E/\u043F\u0456\u0441\u043B\u044F \u0414\u041D<input id="rBd" inputmode="numeric" value="${(_a2 = r.bdays) != null ? _a2 : 3}"></label>
      <div data-f="days"><div class="muted set-note">\u0414\u043D\u0456 \u0442\u0438\u0436\u043D\u044F (\u043D\u0456\u0447\u043E\u0433\u043E \u2014 \u0449\u043E\u0434\u043D\u044F)</div>${[1, 2, 3, 4, 5, 6, 7].map((d) => {
      var _a3;
      return chk("rDay", d, (_a3 = r.days) == null ? void 0 : _a3.includes(d), LOY_D[d]);
    }).join("")}
        <div class="srow"><label>\u0417<input id="rF" value="${esc(r.from || "")}" placeholder="15:00"></label><label>\u0414\u043E<input id="rTo" value="${esc(r.to || "")}" placeholder="18:00"></label></div></div>
      <div data-f="what"><div class="muted set-note">\u041D\u0430 \u0449\u043E (\u043D\u0456\u0447\u043E\u0433\u043E \u2014 \u0443\u0441\u0435 \u043C\u0435\u043D\u044E)</div><div class="scrollbox sm">${D.cats.map((c) => {
      var _a3;
      return chk("rCat", c.id, (_a3 = r.cats) == null ? void 0 : _a3.includes(c.id), esc(c.n));
    }).join("")}</div>
        <label>\u0410\u0431\u043E \u0441\u0442\u0440\u0430\u0432\u0438 \u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0443<input id="rDish" list="rDl" value="${esc((r.dishes || []).join(", "))}"></label></div>
      <datalist id="rDl">${D.cats.flatMap((c) => c.items).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <div class="muted set-note">\u0414\u0435 \u0434\u0456\u0454 (\u043D\u0456\u0447\u043E\u0433\u043E \u2014 \u0441\u043A\u0440\u0456\u0437\u044C)</div><div>${Object.entries(LOY_W).map(([k, l]) => {
      var _a3;
      return chk("rW", k, (_a3 = r.where) == null ? void 0 : _a3.includes(k), l);
    }).join("")}</div>
      <div class="srow"><label>\u0414\u0456\u0454 \u0437<input id="rD1" type="date" value="${r.d1 || ""}"></label><label>\u043F\u043E<input id="rD2" type="date" value="${r.d2 || ""}"></label></div></div>`;
    const show = () => {
      const t = $("#rT").value, F = { pct: t !== "nth", n: t === "nth", min: t === "sum", gift: t === "sum", bdays: t === "bday", days: t === "happy", what: ["cat", "happy", "nth"].includes(t) };
      document.querySelectorAll("#modal [data-f]").forEach((el) => {
        el.hidden = !F[el.dataset.f];
      });
    };
    const p = modal({ title: id ? "\u{1F3AF} \u0410\u043A\u0446\u0456\u044F" : "\u2795 \u041D\u043E\u0432\u0430 \u0430\u043A\u0446\u0456\u044F", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    $("#rT").onchange = show;
    show();
    document.querySelectorAll("#modal input[type=checkbox]").forEach((i) => {
      i.onchange = () => i.parentElement.classList.toggle("on", i.checked);
    });
    const v = await p;
    if (v !== "ok") return;
    const all = (n) => [...document.querySelectorAll(`#modal input[name=${n}]:checked`)].map((i) => i.value);
    const rule = {
      id: r.id,
      on: (_b = r.on) != null ? _b : 1,
      type: $("#rT").value,
      name: $("#rN").value,
      pct: +$("#rP").value || 0,
      n: +$("#rNth").value || 0,
      min: +$("#rMin").value || 0,
      gift: $("#rGift").value.trim(),
      bdays: +$("#rBd").value || 0,
      days: all("rDay").map(Number),
      from: $("#rF").value.trim(),
      to: $("#rTo").value.trim(),
      cats: all("rCat"),
      dishes: $("#rDish").value.split(",").map((s) => s.trim()).filter(Boolean),
      where: all("rW"),
      d1: $("#rD1").value,
      d2: $("#rD2").value
    };
    if (rule.type === "sum" && rule.gift) rule.pct = 0;
    const res = await act("loyRule", { rule }, "\u{1F4BE} \u0410\u043A\u0446\u0456\u044E \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (!res) return;
    closeModal();
    S.data.loy.cfg = res.cfg;
    renderMain();
  }
  async function loyCliCard(ph) {
    var _a2;
    const r = await act("loyCliGet", { phone: ph });
    if (!r) return;
    const c = r.cli;
    const hist = c.h.length ? c.h.map((h) => `<div class="kv"><span>${new Date(h.ts).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" })} \xB7 ${h.t === "hall" ? "\u{1FA91} \u0437\u0430\u043B" : h.t === "del" ? "\u{1F6F5} \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430" : "\u{1F961} \u0437 \u0441\u043E\u0431\u043E\u044E"}</span><b class="money">${money(h.sum)}${h.pr ? ` <small class="muted">\u{1F381}\u2212${h.pr}</small>` : ""}</b></div>`).join("") : `<div class="muted">\u0406\u0441\u0442\u043E\u0440\u0456\u044F \u0437'\u044F\u0432\u0438\u0442\u044C\u0441\u044F \u043F\u0456\u0441\u043B\u044F \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0445 \u0447\u0435\u043A\u0456\u0432</div>`;
    const body = `<div class="kv"><span>\u{1F4DE} \u0422\u0435\u043B\u0435\u0444\u043E\u043D</span><a href="tel:+${c.phone}">${fmtPh(c.phone)}</a></div><div class="kv"><span>\u{1F3C5} \u0420\u0456\u0432\u0435\u043D\u044C</span><b>${esc(c.lvn || "\u2014")}${c.man ? " \u270B \u0432\u0440\u0443\u0447\u043D\u0443" : ""}</b></div>
      <div class="kv"><span>\u{1F9FE} \u0412\u0456\u0437\u0438\u0442\u0456\u0432 \xB7 \u0441\u0443\u043C\u0430</span><b>${c.n} \xB7 ${money(c.sum)}</b></div><div class="kv"><span>\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438</span><b>${money(c.bal)}</b></div>
      <div class="kv"><span>\u{1F382} \u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F</span><b>${bdTxt(c.bd) || "\u2014"}</b></div>${c.note ? `<div class="kv"><span>\u{1F4CC} ${esc(c.note)}</span></div>` : ""}
      <h3 style="margin-top:12px">\u{1F553} \u0406\u0441\u0442\u043E\u0440\u0456\u044F</h3><div class="scrollbox sm">${hist}</div>`;
    const v = await modal({ title: `\u{1F464} ${c.name || "\u041A\u043B\u0456\u0454\u043D\u0442"}`, body, buttons: [{ label: "\u270F\uFE0F \u0406\u043C'\u044F / \u0414\u041D / \u043D\u043E\u0442\u0430\u0442\u043A\u0430", val: "edit", cls: "primary" }, ...isAdmin() ? [{ label: "\u{1F3C5} \u0420\u0456\u0432\u0435\u043D\u044C", val: "lvl" }] : [], { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (v === "edit") {
      const e = await modal({ title: "\u270F\uFE0F \u041A\u043B\u0456\u0454\u043D\u0442", body: `<div class="form"><label>\u0406\u043C'\u044F<input id="cN" value="${esc(c.name)}"></label><label>\u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F (\u0434\u0434.\u043C\u043C)<input id="cB" value="${bdTxt(c.bd)}" placeholder="25.12" inputmode="decimal"></label><label>\u041D\u043E\u0442\u0430\u0442\u043A\u0430<textarea id="cT" rows="3">${esc(c.note)}</textarea></label></div>`, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
      const f = e === "ok" ? { name: $("#cN").value, bd: $("#cB").value, note: $("#cT").value } : null;
      closeModal();
      if (f && await act("loyCliSet", { phone: ph, f }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) return loyAfter(ph);
    }
    if (v === "lvl") {
      const L = ((_a2 = S.data.loy) == null ? void 0 : _a2.cfg.levels) || (await api("loyGet")).cfg.levels;
      const lv = await choose("\u{1F3C5} \u0420\u0456\u0432\u0435\u043D\u044C \u043A\u043B\u0456\u0454\u043D\u0442\u0430", "\u0420\u0443\u0447\u043D\u0438\u0439 \u0440\u0456\u0432\u0435\u043D\u044C \u043D\u0435 \u0437\u043C\u0456\u043D\u044E\u0454\u0442\u044C\u0441\u044F \u0441\u0430\u043C. \xAB\u0410\u0432\u0442\u043E\xBB \u2014 \u0437\u0430 \u0432\u0456\u0437\u0438\u0442\u0430\u043C\u0438 \u0439 \u0441\u0443\u043C\u043E\u044E.", [{ label: "\u21BA \u0410\u0432\u0442\u043E", val: "-" }, ...L.map((l) => ({ label: `${l.e} ${l.name}${l.pct ? ` \u2212${l.pct}%` : ""}`, val: l.id, cls: c.lvl === l.id && c.man ? "primary" : "" }))]);
      if (lv && await act("loyCliSet", { phone: ph, f: { lvl: lv === "-" ? "" : lv } }, "\u{1F3C5} \u0420\u0456\u0432\u0435\u043D\u044C \u0437\u043C\u0456\u043D\u0435\u043D\u043E")) return loyAfter(ph);
    }
  }
  async function loyAfter(ph) {
    if (S.view === "settings") await loadLoy();
    if (S.open) await loadState().catch(() => {
    });
    return loyCliCard(ph);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "loyQ") {
      S.loyQ = e.target.value.trim();
      loadLoy();
    }
  });
  document.addEventListener("click", async (e) => {
    var _a2, _b;
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a, d = el.dataset;
    if (a === "setTab" && d.s === "loy") return loadLoy();
    if (a === "loyTab") {
      S.loyTab = d.s;
      renderMain();
      return loadLoy();
    }
    if (a === "loyF") {
      S.loyF = d.f;
      return loadLoy();
    }
    if (a === "loyFind") {
      S.loyQ = ((_a2 = $("#loyQ")) == null ? void 0 : _a2.value.trim()) || "";
      return loadLoy();
    }
    if (a === "loyP") {
      S.loyP = d.p;
      return loadLoy();
    }
    if (a === "loyCli") return loyCliCard(d.ph);
    if (a === "loyLv") return loyLvEdit(d.id);
    if (a === "loyRule") return loyRuleEdit(d.id);
    if (a === "loyRuleDel") {
      if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0430\u043A\u0446\u0456\u044E?")) {
        const r = await act("loyRule", { del: d.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
        if (r) {
          S.data.loy.cfg = r.cfg;
          renderMain();
        }
      }
      return;
    }
    if (a === "loyRuleOn") {
      const r0 = S.data.loy.cfg.rules.find((x) => x.id === d.id);
      const r = await act("loyRuleOn", { id: d.id, on: !r0.on }, r0.on ? "\u26D4 \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E" : "\u2705 \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E");
      if (r) {
        Object.assign(r0, r.rule);
        renderMain();
      }
      return;
    }
    if (a === "loyOn") {
      const r = await act("loySet", { on: !S.data.loy.cfg.on });
      if (r) {
        S.data.loy.cfg = r.cfg;
        renderMain();
      }
      return;
    }
    if (a === "loyMax") {
      const v = await askVal("\u{1F9E2} \u0421\u0442\u0435\u043B\u044F \u0432\u0441\u0456\u0445 \u0437\u043D\u0438\u0436\u043E\u043A, %", S.data.loy.cfg.max, "number");
      if (v == null) return;
      const r = await act("loySet", { max: v }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (r) {
        S.data.loy.cfg = r.cfg;
        renderMain();
      }
      return;
    }
    if (a === "loyOff") {
      await act("loyOff", { t: S.open, off: d.off === "1" }, d.off === "1" ? "\u{1F381} \u0410\u043A\u0446\u0456\u0457 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E" : "\u{1F381} \u0410\u043A\u0446\u0456\u0457 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E");
      return loadState().catch(() => {
      });
    }
    if (a === "gbSw") {
      const k = d.k, r = await act("gbSet", { f: { [k]: !S.data.gb.cfg[k] } });
      if (r) {
        S.data.gb.cfg = r.cfg;
        renderMain();
      }
      return;
    }
    if (a === "gbEd") {
      const k = d.k, txt = /Text$/.test(k), v = await askVal({ bdText: "\u{1F382} \u0422\u0435\u043A\u0441\u0442 \u043F\u0440\u0438\u0432\u0456\u0442\u0430\u043D\u043D\u044F", bdGiftDays: "\u{1F4C6} \u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0434\u043D\u0456\u0432 \u0434\u0456\u0454 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A", sleepText: "\u{1F44B} \u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \xAB\u0441\u043F\u043B\u044F\u0447\u0438\u0445\xBB", sleepDays: "\u{1F4C6} \u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0434\u043D\u0456\u0432 \u043D\u0435 \u0431\u0443\u0432", sleepBon: "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0456\u0432 \u0443 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A", gap: "\u23F3 \u0413\u043E\u0434\u0438\u043D \u043C\u0456\u0436 \u0440\u043E\u0437\u0441\u0438\u043B\u043A\u0430\u043C\u0438" }[k], S.data.gb.cfg[k], txt ? "text" : "number");
      if (v == null) return;
      const r = await act("gbSet", { f: { [k]: v } }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (r) {
        S.data.gb.cfg = r.cfg;
        renderMain();
      }
      return;
    }
    if (a === "gbGift") {
      const G = S.data.gb, cur = G.gifts.find((x) => x.id === G.cfg.bdGift), l = G.gifts.filter((x) => x.c === ((cur == null ? void 0 : cur.c) || "hookah"));
      const v = await choose("\u{1F381} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u043D\u0430 \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F", "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u043D\u0430 \u0446\u044E \u043F\u043E\u0437\u0438\u0446\u0456\u044E \u043F\u0440\u0438\u0439\u0434\u0435 \u0433\u043E\u0441\u0442\u044E \u0432 \u0431\u043E\u0442", [...l.map((x) => ({ label: `${x.n} \xB7 ${money(x.p)}`, val: x.id, cls: x.id === G.cfg.bdGift ? "primary" : "" })), { label: "\u{1F6AB} \u0411\u0435\u0437 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u0430", val: "-" }]);
      if (!v) return;
      const r = await act("gbSet", { f: { bdGift: v === "-" ? "" : v } }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (r) {
        G.cfg = r.cfg;
        renderMain();
      }
      return;
    }
    if (a === "gbCast") {
      const A = S.data.gb.aud, lv = S.data.loy.cfg.levels;
      const f = await choose("\u{1F4E3} \u041A\u043E\u043C\u0443 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438?", "\u041B\u0438\u0448\u0435 \u0442\u0438\u043C, \u0445\u0442\u043E \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0432 \u0431\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439", [...Object.entries(A).map(([val, l]) => ({ label: l[0].toUpperCase() + l.slice(1), val })), ...lv.map((l) => ({ label: `${l.e} ${l.name}`, val: l.id }))]);
      if (!f) return;
      const c = await api("gbCount", { f }).catch((e2) => {
        toast("\u26A0\uFE0F " + errText(e2.message));
        return null;
      });
      if (!c) return;
      if (c.wait) return toast(`\u23F3 \u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0430 \u0440\u043E\u0437\u0441\u0438\u043B\u043A\u0430 \u2014 \u0447\u0435\u0440\u0435\u0437 ${c.wait} \u0445\u0432`);
      if (!c.n) return toast("\u041D\u0456\u043A\u043E\u0433\u043E \u043D\u0435\u043C\u0430\u0454 \u0432 \u0446\u0456\u0439 \u0433\u0440\u0443\u043F\u0456");
      const text = await ask(`\u{1F4E3} \u0422\u0435\u043A\u0441\u0442 \u0440\u043E\u0437\u0441\u0438\u043B\u043A\u0438 (${c.n} \u0433\u043E\u0441\u0442\u0435\u0439)`, "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u221220% \u043D\u0430 \u0431\u0443\u0440\u0433\u0435\u0440\u0438! \u{1F354}");
      if (!text) return;
      if (!await confirmBox(`\u{1F4E3} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 ${c.n} \u0433\u043E\u0441\u0442\u044F\u043C?`, text)) return;
      toast("\u{1F4E3} \u041D\u0430\u0434\u0441\u0438\u043B\u0430\u044E\u2026");
      const r = await api("gbCast", { f, text }, 18e4).catch((e2) => {
        toast("\u26A0\uFE0F " + errText(e2.message));
        return null;
      });
      if (r) toast(`\u{1F4E3} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E ${r.n} \u0437 ${r.of}`);
      return;
    }
    if (a === "gbInbox") return gbInbox();
    if (a === "gbThread") return gbThread(d.ph);
    if (a === "gbReply") {
      const text = await ask("\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C \u0433\u043E\u0441\u0442\u044E \u0432 Telegram", "\u0422\u0435\u043A\u0441\u0442");
      if (text) await act("gbReply", { ph: d.ph, text }, "\u2705 \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E");
      return;
    }
    if (a === "loyCliT") {
      const ph = (_b = S.tables[S.open]) == null ? void 0 : _b.cli;
      if (ph) loyCliCard(ph);
    }
  });
  async function loadCalc() {
    const K = S.sk, t = K.tab;
    if (!S.data.sk || ["stock", "prod", "inv", "cards"].includes(t)) S.data.sk = await api("skData");
    if (t === "buy") S.data.skBuy = await api("skBuy");
    if (t === "inv" && !K.draft) S.data.skInv = await api("skInvList");
    if ((t === "cards" || t === "prod") && isAdmin()) {
      if (!S.menu) await loadMenu();
      S.data.skCost = await api("skCost");
    }
    if (t === "tech") S.data.skTech = await api("skTech");
    if (t === "count") {
      const [c, l] = await Promise.all([api("skCount", { wh: K.cwh }), api("skCountList")]);
      S.data.skCount = c;
      S.data.skCnts = l.list;
      K.cf = Object.fromEntries(Object.entries(c.draft.f || {}).map(([k, v]) => [k, String(v)]));
    }
    if ((t === "menu" || t === "stop") && !S.menu) await loadMenu();
    if (t === "rep") {
      const [from, to] = perRange(K.p);
      S.data.skRep = null;
      renderMain();
      S.data.skRep = await api("skReport", { from, to }, 3e4);
    }
  }
  function calcHTML() {
    const K = S.sk, tabs = SK_TABS();
    if (!tabs.some((x) => x[0] === K.tab)) K.tab = tabs[0][0];
    const sub = { stock: "\u0437\u0430\u043B\u0438\u0448\u043A\u0438 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0430\u0445 \u041A\u0443\u0445\u043D\u044F \u0456 \u0411\u0430\u0440", buy: "\u0449\u043E \u0434\u043E\u043A\u0443\u043F\u0438\u0442\u0438 \u2014 \u043F\u043E \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u0445", inv: "\u043F\u0440\u0438\u0445\u0456\u0434 \u0442\u043E\u0432\u0430\u0440\u0443: \u0444\u043E\u0442\u043E, \u043A\u043E\u0434 \u0430\u0431\u043E \u0432\u0440\u0443\u0447\u043D\u0443", cards: "\u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0446\u0456\u0439\u043D\u0456 \u043A\u0430\u0440\u0442\u0438 \u0439 \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u0441\u0442\u0440\u0430\u0432", tech: "\u0441\u043A\u043B\u0430\u0434 \u0456 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0430 \u0441\u0442\u0440\u0430\u0432", prod: "\u043D\u0430\u043F\u0456\u0432\u0444\u0430\u0431\u0440\u0438\u043A\u0430\u0442\u0438: \u0441\u043E\u0443\u0441\u0438, \u0442\u0456\u0441\u0442\u043E, \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438", count: "\u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0444\u0430\u043A\u0442\u0438\u0447\u043D\u0438\u0445 \u0437\u0430\u043B\u0438\u0448\u043A\u0456\u0432", menu: "\u0441\u0442\u0440\u0430\u0432\u0438, \u0446\u0456\u043D\u0438, \u0444\u043E\u0442\u043E", stop: "\u0449\u043E \u0437\u0430\u0440\u0430\u0437 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F", rep: "\u0444\u0443\u0434\u043A\u043E\u0441\u0442, \u043F\u0440\u0438\u0431\u0443\u0442\u043E\u043A \u0441\u0442\u0440\u0430\u0432, \u043D\u0435\u0441\u0442\u0430\u0447\u0456 \u0439 \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F" }[K.tab];
    const head = `<div class="rhead"><div><h1>\u0421\u043A\u043B\u0430\u0434</h1><span class="muted">${sub}</span></div></div>
      <div class="seg rsec">${tabs.map(([k, l]) => `<button class="${K.tab === k ? "on" : ""}" data-a="skTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    if (!S.data.sk) return head + '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    if (K.card && (K.tab === "cards" || K.tab === "prod")) return head + `<div class="sk">${skCardEdHTML()}</div>`;
    if (K.tab === "menu") return head + `<div class="sk sk-emb">${menuHTML()}</div>`;
    if (K.tab === "stop") return head + `<div class="sk sk-emb">${stopHTML()}</div>`;
    return head + `<div class="sk">${{ stock: skStockHTML, buy: skBuyHTML, inv: skInvHTML, cards: skCardsHTML, tech: skTechHTML, prod: skProdHTML, count: skCountHTML, rep: skRepHTML }[K.tab]()}</div>`;
  }
  function skStockHTML() {
    const K = S.sk, D = S.data.sk, adm = isAdmin(), q = K.q.trim().toLowerCase(), live = D.ing.filter((x) => !x.off);
    const list = D.ing.filter((x) => {
      var _a2;
      return (K.cat === "\u{1F5D1}" ? x.off : !x.off) && (!q || x.n.toLowerCase().includes(q)) && (!K.cat || K.cat === "\u{1F5D1}" || x.cat === K.cat) && (!K.wh || x.home === K.wh || (((_a2 = x.st) == null ? void 0 : _a2[K.wh]) || 0) !== 0);
    });
    const low = live.filter((x) => x.min > 0 && totQ(x) < x.min);
    const val = (w) => live.reduce((a, x) => {
      var _a2;
      return a + Math.max(0, w ? ((_a2 = x.st) == null ? void 0 : _a2[w]) || 0 : totQ(x)) * (x.cost || 0);
    }, 0);
    const cats = [...new Set(live.map((x) => x.cat || "\u0406\u043D\u0448\u0435"))].sort();
    const tools = `<div class="sk-bar"><input id="skQ" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443" value="${esc(K.q)}">
      <div class="seg wrap sk-wh">${[["", "\u0423\u0441\u0456"], ["k", WHN.k], ["b", WHN.b]].map(([k, l]) => `<button class="${K.wh === k ? "on" : ""}" data-a="skWh" data-w="${k}">${l}</button>`).join("")}</div>
      <select id="skCat"><option value="">\u0423\u0441\u0456 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457</option>${cats.map((c) => `<option ${K.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}${D.ing.some((x) => x.off) ? `<option value="\u{1F5D1}" ${K.cat === "\u{1F5D1}" ? "selected" : ""}>\u{1F5D1} \u0421\u0445\u043E\u0432\u0430\u043D\u0456</option>` : ""}</select>
      <span class="grow"></span>${adm ? '<button class="btn sm primary" data-a="skIng">\u2795 \u041F\u0440\u043E\u0434\u0443\u043A\u0442</button>' : ""}<button class="btn sm" data-a="skOffPick">\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u0442\u0438</button><button class="btn sm" data-a="skJr">\u{1F4DC} \u0420\u0443\u0445</button></div>`;
    const pills = adm ? `<div class="kpis sk-kpis"><div class="kpi accent"><span>\u0422\u043E\u0432\u0430\u0440\u0443 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0430\u0445</span><b class="money">${money(val())}</b><small class="muted">${WHN.k} ${money(val("k"))} \xB7 ${WHN.b} ${money(val("b"))}</small></div>
      <div class="kpi ${low.length ? "red" : ""}${low.length ? " press" : ""}" ${low.length ? 'data-a="skTab" data-t="buy"' : ""}><span>\u041D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443</span><b>${low.length}</b><small class="muted">${low.length ? "\u{1F6D2} \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044E \u2192" : "\u0443\u0441\u044C\u043E\u0433\u043E \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454"}</small></div>
      <div class="kpi"><span>\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432</span><b>${live.length}</b><small class="muted">${live.filter((x) => !x.cost).length ? `\u0431\u0435\u0437 \u0446\u0456\u043D\u0438: ${live.filter((x) => !x.cost).length}` : "\u0443 \u0432\u0441\u0456\u0445 \u0454 \u0446\u0456\u043D\u0430"}</small></div></div>` : low.length ? `<div class="card sk-low">\u26A0\uFE0F \u041D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443: ${low.map((x) => esc(x.n)).join(", ")}</div>` : "";
    const rowH = (x) => {
      var _a2, _b, _c, _d;
      const t = totQ(x), lo = x.min > 0 && t < x.min, both = (((_a2 = x.st) == null ? void 0 : _a2.k) || 0) && (((_b = x.st) == null ? void 0 : _b.b) || 0);
      return `<div class="sk-row${lo ? " low" : ""}${x.off ? " off" : ""}"><div class="sk-n${adm ? " press" : ""}" ${adm ? `data-a="skIng" data-id="${x.id}"` : ""}><b>${x.semi ? "\u{1F373} " : ""}${esc(x.n)}</b><small class="muted">${x.min ? `\u043C\u0456\u043D ${fq(x.min, x.u)}` : ""}${adm && x.cost ? `${x.min ? " \xB7 " : ""}${money(x.cost)} / ${x.u}` : ""}${adm && !x.cost ? `${x.min ? " \xB7 " : ""}<span class="warn">\u043D\u0435\u043C\u0430\u0454 \u0446\u0456\u043D\u0438</span>` : ""}</small></div>
        <div class="sk-q"><b class="${t < 0 ? "neg" : ""}">${fq(t, x.u)}</b><small class="muted">${both ? `\u041A ${fq(x.st.k, x.u)} \xB7 \u0411 ${fq(x.st.b, x.u)}` : ((_c = x.st) == null ? void 0 : _c.b) ? WHN.b : ((_d = x.st) == null ? void 0 : _d.k) ? WHN.k : WHN[x.home || "k"]}</small></div>
        <div class="sk-act">${adm ? `<button class="rb plus" data-a="skAdd" data-id="${x.id}" title="\u041E\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u0443\u0432\u0430\u0442\u0438">+</button>` : ""}<button class="rb minus" data-a="skOff" data-id="${x.id}" title="\u0421\u043F\u0438\u0441\u0430\u0442\u0438">\u2212</button><button class="rb" data-a="skMv" data-id="${x.id}" title="\u041F\u0435\u0440\u0435\u043C\u0456\u0441\u0442\u0438\u0442\u0438 \u043C\u0456\u0436 \u0441\u043A\u043B\u0430\u0434\u0430\u043C\u0438">\u21C4</button></div></div>`;
    };
    const groups = {};
    list.forEach((x) => {
      var _a2;
      return (groups[_a2 = x.cat || "\u0406\u043D\u0448\u0435"] || (groups[_a2] = [])).push(x);
    });
    const body = list.length ? Object.keys(groups).sort().map((c) => `<div class="card"><h3>${esc(c)} <span class="muted">\xB7 ${groups[c].length}</span></h3>${groups[c].sort((a, b) => a.n.localeCompare(b.n)).map(rowH).join("")}</div>`).join("") : `<div class="card"><div class="muted">${D.ing.length ? "\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E" : adm ? "\u0421\u043A\u043B\u0430\u0434 \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439. \u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u2795 \u041F\u0440\u043E\u0434\u0443\u043A\u0442\xBB \u2014 \u0430\u0431\u043E \u043F\u0440\u043E\u0441\u0442\u043E \u0432\u043D\u0435\u0441\u0456\u0442\u044C \u043F\u0435\u0440\u0448\u0443 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 (\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u2192 \u{1F4F7} \u0424\u043E\u0442\u043E): \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0441\u0442\u0432\u043E\u0440\u044F\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456." : "\u0421\u043A\u043B\u0430\u0434 \u0449\u0435 \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439."}</div></div>`;
    return pills + tools + `<div class="sk-list">${body}</div>`;
  }
  async function skIngEdit(id, preset = {}) {
    const D = S.data.sk, x = D.ing.find((y) => y.id === id) || __spreadValues({ n: "", u: "\u043A\u0433", cat: "\u0406\u043D\u0448\u0435", home: "k", min: 0, par: 0, loss: 0, pk: [], bc: [] }, preset);
    const body = `<div class="form">
      <label>\u041D\u0430\u0437\u0432\u0430<input id="iN" value="${esc(x.n)}" placeholder="\u043D\u0430\u043F\u0440. \u041A\u0443\u0440\u044F\u0447\u0435 \u0444\u0456\u043B\u0435"></label>
      <div class="frow"><label>\u041E\u0434\u0438\u043D\u0438\u0446\u044F \u043E\u0431\u043B\u0456\u043A\u0443<select id="iU">${D.units.map((u) => `<option ${x.u === u ? "selected" : ""}>${u}</option>`).join("")}</select></label>
        <label>\u0414\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F<select id="iH"><option value="k" ${x.home !== "b" ? "selected" : ""}>${WHN.k}</option><option value="b" ${x.home === "b" ? "selected" : ""}>${WHN.b}</option></select></label></div>
      <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F<select id="iC">${[.../* @__PURE__ */ new Set([...D.cats, x.cat || "\u0406\u043D\u0448\u0435"])].map((c) => `<option ${x.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
      <div class="frow"><label>\u041C\u0456\u043D\u0456\u043C\u0443\u043C <small>(\u043D\u0438\u0436\u0447\u0435 \u2014 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F)</small><input id="iMin" inputmode="decimal" value="${x.min || ""}" placeholder="0"></label><label>\u041D\u043E\u0440\u043C\u0430 <small>(\u0434\u043E\u043A\u0443\u043F\u0438\u0442\u0438 \u0434\u043E)</small><input id="iPar" inputmode="decimal" value="${x.par || ""}" placeholder="0"></label></div>
      <div class="frow"><label>% \u0432\u0442\u0440\u0430\u0442 \u043F\u0440\u0438 \u043E\u0431\u0440\u043E\u0431\u0446\u0456 <small>(\u0447\u0438\u0441\u0442\u043A\u0430, \u0432\u0430\u0440\u043A\u0430\u2026)</small><input id="iL" inputmode="numeric" value="${x.loss || ""}" placeholder="0"></label>
        ${x.semi ? "" : `<label>\u0426\u0456\u043D\u0430 \u0437\u0430 ${x.u}, \u20B4 <small>${x.lp ? "(\u0441\u0435\u0440\u0435\u0434\u043D\u044F \u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 \u2014 \u043C\u043E\u0436\u043D\u0430 \u0437\u043C\u0456\u043D\u0438\u0442\u0438)" : ""}</small><input id="iCost" inputmode="decimal" value="${x.cost || ""}"></label>`}</div>
      <label>\u041E\u0434\u0438\u043D\u0438\u0446\u0456 \u0437\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u0456 <small>\u043D\u0430\u043F\u0440.: \u044F\u0449\u0438\u043A=12, \u0443\u043F=2.5 (\u0441\u043A\u0456\u043B\u044C\u043A\u0438 ${x.u} \u0432 \u043E\u0434\u043D\u0456\u0439)</small><input id="iPk" value="${esc((x.pk || []).map((p) => `${p.n}=${p.f}`).join(", "))}" placeholder="\u044F\u0449\u0438\u043A=12"></label>
      <label>\u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u0438 <small>\u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0443 \u2014 \u0430\u0431\u043E \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u0441\u043A\u0430\u043D\u0435\u0440\u043E\u043C \u0443 \u0446\u0435 \u043F\u043E\u043B\u0435</small><input id="iBc" value="${esc((x.bc || []).join(", "))}"></label>
      <label class="chk"><input type="checkbox" id="iS" ${x.semi ? "checked" : ""}> \u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u2014 \u0433\u043E\u0442\u0443\u0454\u043C\u043E \u0441\u0430\u043C\u0456 (\u0441\u043E\u0443\u0441, \u0442\u0456\u0441\u0442\u043E\u2026), \u043C\u0430\u0454 \u0441\u0432\u043E\u044E \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443</label></div>`;
    const v = await modal({ title: x.id ? "\u{1F4E6} " + x.n : "\u2795 \u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...x.id ? [{ label: x.off ? "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u{1F5D1} \u0421\u0445\u043E\u0432\u0430\u0442\u0438", val: "del", cls: x.off ? "" : "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v === "del") {
      closeModal();
      if (await act("skIngDel", { id: x.id, back: !!x.off }, x.off ? "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E" : "\u{1F5D1} \u0421\u0445\u043E\u0432\u0430\u043D\u043E")) loadView();
      return null;
    }
    if (v !== "save") return null;
    const num = (i) => {
      var _a2;
      return +String(((_a2 = $("#" + i)) == null ? void 0 : _a2.value) || "").replace(",", ".") || 0;
    };
    const d = __spreadValues({
      id: x.id,
      n: $("#iN").value,
      u: $("#iU").value,
      home: $("#iH").value,
      cat: $("#iC").value,
      min: num("iMin"),
      par: num("iPar"),
      loss: num("iL"),
      semi: $("#iS").checked,
      pk: $("#iPk").value.split(",").map((s) => s.split(/[=:]/).map((z) => z.trim())).filter((p) => p[0] && +String(p[1] || "").replace(",", ".") > 0).map(([n, f]) => ({ n, f: +f.replace(",", ".") })),
      bc: $("#iBc").value.split(/[,\s]+/).filter(Boolean)
    }, $("#iCost") && num("iCost") !== (x.cost || 0) ? { cost: num("iCost"), setCost: 1 } : {});
    closeModal();
    const r = await act("skIngSave", { x: d }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (!r) return null;
    S.data.sk = await api("skData").catch(() => S.data.sk);
    renderMain();
    return r.x;
  }
  async function skQty(kind, id) {
    var _a2, _b, _c, _d, _e;
    const x = S.data.sk.ing.find((y) => y.id === id);
    if (!x) return;
    const ttl = { add: "\u2795 \u041E\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u0443\u0432\u0430\u0442\u0438", off: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u0438", mv: "\u21C4 \u041F\u0435\u0440\u0435\u043C\u0456\u0441\u0442\u0438\u0442\u0438" }[kind] + " \xB7 " + x.n;
    const dw = (((_a2 = x.st) == null ? void 0 : _a2.b) || 0) > 0 && !((((_b = x.st) == null ? void 0 : _b.k) || 0) > 0) ? "b" : x.home || "k";
    const body = `<div class="form"><label>\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C <small>${x.u === "\u043A\u0433" ? "\u043D\u0430\u043F\u0440. 0.5 \u0430\u0431\u043E 500 \u0433" : x.u === "\u043B" ? "\u043D\u0430\u043F\u0440. 0.5 \u0430\u0431\u043E 500 \u043C\u043B" : "\u0448\u0442\u0443\u043A"}</small><input id="aQ" inputmode="decimal" placeholder="${x.u}"></label>
      ${kind === "mv" ? `<label>\u041A\u0443\u0434\u0438<select id="aW"><option value="k" ${dw === "k" ? "selected" : ""}>${WHN.k} \u2192 ${WHN.b}</option><option value="b" ${dw === "b" ? "selected" : ""}>${WHN.b} \u2192 ${WHN.k}</option></select></label>` : `<label>\u0421\u043A\u043B\u0430\u0434<select id="aW">${["k", "b"].map((w) => {
      var _a3;
      return `<option value="${w}" ${dw === w ? "selected" : ""}>${WHN[w]} \u2014 \u0454 ${fq(((_a3 = x.st) == null ? void 0 : _a3[w]) || 0, x.u)}</option>`;
    }).join("")}</select></label>`}
      ${kind === "off" ? `<div class="chips">${S.data.sk.offR.map((r2) => `<button class="chip" data-a="skReason" data-r="${esc(r2)}">${esc(r2)}</button>`).join("")}</div><input id="aN" placeholder="\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F">` : kind === "add" ? '<input id="aN" placeholder="\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 (\u043D\u0430\u043F\u0440. \u043F\u0440\u0438\u043D\u0435\u0441\u043B\u0438 \u0431\u0435\u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457)">' : ""}</div>`;
    const pm = modal({ title: ttl, body, buttons: [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    setTimeout(() => {
      var _a3;
      return (_a3 = $("#aQ")) == null ? void 0 : _a3.focus();
    }, 60);
    if (await pm !== "ok") return;
    const q = parseQ($("#aQ").value, x.u), wh = (_c = $("#aW")) == null ? void 0 : _c.value, note = ((_e = (_d = $("#aN")) == null ? void 0 : _d.value) == null ? void 0 : _e.trim()) || "";
    closeModal();
    if (!(q > 0)) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C");
    if (kind === "off" && !note) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F");
    const r = kind === "mv" ? await act("skMove", { id, from: wh, q }, "\u21C4 \u041F\u0435\u0440\u0435\u043C\u0456\u0449\u0435\u043D\u043E") : await act("skAdj", { id, wh, q: kind === "off" ? -q : q, note }, kind === "off" ? "\u2796 \u0421\u043F\u0438\u0441\u0430\u043D\u043E" : "\u2795 \u041E\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u043E\u0432\u0430\u043D\u043E");
    if (r) {
      S.data.sk = await api("skData").catch(() => S.data.sk);
      renderMain();
    }
  }
  function skPick(title, filter = () => true, allowNew = false) {
    return new Promise(async (res) => {
      if (!S.data.sk) S.data.sk = await api("skData").catch(() => null);
      if (!S.data.sk) return res(null);
      const all = S.data.sk.ing.filter((x) => !x.off && filter(x)).sort((a, b) => a.n.localeCompare(b.n));
      const draw = (q) => all.filter((x) => !q || x.n.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map((x) => `<button class="pk-i" data-pk="${x.id}">${x.semi ? "\u{1F373} " : ""}${esc(x.n)} <span class="muted">${fq(totQ(x), x.u)}</span></button>`).join("") || '<div class="muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</div>';
      modalResolve = (v) => {
        closeModal();
        res(v);
      };
      const el = document.createElement("div");
      el.className = "modal-bg";
      el.id = "modal";
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><input id="pkQ" placeholder="\u{1F50E} \u041F\u043E\u0447\u043D\u0456\u0442\u044C \u0432\u0432\u043E\u0434\u0438\u0442\u0438 \u043D\u0430\u0437\u0432\u0443" autocomplete="off">${allowNew ? '<button class="pk-i pk-new" data-pk="__new">\u2795 \u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u2026</button>' : ""}<div class="pk-l" id="pkL">${draw("")}</div><div class="btns"><button class="btn" data-x>\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div></div>`;
      el.addEventListener("click", (e) => {
        var _a2;
        if (e.target === el || e.target.closest("[data-x]")) return modalResolve(null);
        const p = (_a2 = e.target.closest("[data-pk]")) == null ? void 0 : _a2.dataset.pk;
        if (p) modalResolve(p);
      });
      el.querySelector("#pkQ").addEventListener("input", (e) => {
        el.querySelector("#pkL").innerHTML = draw(e.target.value);
      });
      document.body.append(el);
      setTimeout(() => {
        var _a2;
        return (_a2 = el.querySelector("#pkQ")) == null ? void 0 : _a2.focus();
      }, 60);
    });
  }
  async function skJournal() {
    const r = await act("skJournal", {});
    if (!r) return;
    const T = { in: "\u{1F9FE}", add: "\u2795", off: "\u{1F5D1}", mv: "\u21C4", prod: "\u{1F373}", cnt: "\u{1F4DD}" };
    const rows = [...r.list].reverse().map((x) => `<div class="kv"><span>${x.at} ${T[x.t] || "\u2022"} <b>${esc(x.n)}</b> ${x.q > 0 ? "+" : ""}${fq(x.q, x.u)} <span class="muted">\xB7 ${WHN[x.wh] || ""}${x.note ? " \xB7 " + esc(x.note) : ""}${x.by ? " \xB7 " + esc(x.by) : ""}</span></span>${isAdmin() && x.sum ? `<b class="money">${money(x.sum)}</b>` : ""}</div>`).join("");
    await modal({ title: "\u{1F4DC} \u0420\u0443\u0445 \u0441\u043A\u043B\u0430\u0434\u0443 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", body: `<div class="sk-jr">${rows || '<div class="muted">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0440\u0443\u0445\u0456\u0432 \u0449\u0435 \u043D\u0435 \u0431\u0443\u043B\u043E (\u043F\u0440\u043E\u0434\u0430\u0436\u0456 \u0437\u0430 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0430\u043C\u0438 \u2014 \u0443 \xAB\u{1F4CA} \u041F\u043B\u044E\u0441\u0438 / \u043C\u0456\u043D\u0443\u0441\u0438\xBB)</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  function skBuyHTML() {
    const B = S.data.skBuy;
    if (!B) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    if (!B.list.length) return `<div class="card"><div class="big">\u2705 \u0423\u0441\u044C\u043E\u0433\u043E \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454</div><div class="muted" style="margin-top:6px">\u0422\u0443\u0442 \u0437'\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438, \u044F\u043A\u0438\u0445 \u043C\u0435\u043D\u0448\u0435 \u0437\u0430 \u043C\u0456\u043D\u0456\u043C\u0443\u043C. \u041C\u0456\u043D\u0456\u043C\u0443\u043C \u0456 \u043D\u043E\u0440\u043C\u0430 \u0437\u0430\u0434\u0430\u044E\u0442\u044C\u0441\u044F \u0432 \u043A\u0430\u0440\u0442\u0446\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 (\u{1F4E6} \u0421\u043A\u043B\u0430\u0434 \u2192 \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u043D\u0430\u0437\u0432\u0443).</div></div>`;
    return `<div class="btnrow" style="margin:0 0 12px"><button class="btn sm primary" data-a="skShare">\u{1F4E4} \u041F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F \u0432\u0441\u0456\u043C \u0441\u043F\u0438\u0441\u043A\u043E\u043C</button></div>` + B.list.map((g, gi) => `<div class="card"><h3>\u{1F69A} ${esc(g.sup)} ${g.sum ? `<span class="muted">\xB7 ~${money(g.sum)}</span>` : ""}</h3>
      ${g.items.map((i) => `<div class="kv"><span>${esc(i.n)}<br><small class="muted">\u0454 ${fq(i.have, i.u)} \xB7 \u043C\u0456\u043D\u0456\u043C\u0443\u043C ${fq(i.min, i.u)}</small></span><span class="kv-r"><b>${fq(i.need, i.u)}</b>${i.price ? `<span class="muted money">~${money(i.sum)}</span>` : ""}</span></div>`).join("")}
      <div class="btnrow"><button class="btn sm" data-a="skShare" data-g="${gi}">\u{1F4E4} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</button></div></div>`).join("");
  }
  async function skShare(gi) {
    const B = S.data.skBuy, gs = gi === "" || gi == null ? B.list : [B.list[+gi]];
    const text = `\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F VARVAR:
${gs.map((g) => `${gs.length > 1 ? `
${g.sup}:
` : ""}${g.items.map((i) => `\u2022 ${i.n} \u2014 ${fq(i.need, i.u)}`).join("\n")}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast("\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E \u2014 \u0432\u0441\u0442\u0430\u0432\u0442\u0435 \u0432 \u043C\u0435\u0441\u0435\u043D\u0434\u0436\u0435\u0440 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0443");
      }
    } catch (e) {
    }
  }
  function skInvHTML() {
    const K = S.sk;
    if (K.draft) return skDraftHTML();
    const I = S.data.skInv, adm = isAdmin();
    const top = `<div class="card"><h3>\u041D\u043E\u0432\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430</h3>${K.busy ? '<div class="sk-busy">\u{1F50E} \u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u044E \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443\u2026 \u0437\u0430\u0437\u0432\u0438\u0447\u0430\u0439 10\u201330 \u0441\u0435\u043A\u0443\u043D\u0434</div>' : `<div class="sk-new"><label class="btn primary sk-scan">\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443<input type="file" id="skPhoto" accept="image/*" capture="environment" hidden></label><label class="btn">\u{1F5BC} \u0417 \u0433\u0430\u043B\u0435\u0440\u0435\u0457<input type="file" id="skPhoto2" accept="image/*" multiple hidden></label><button class="btn" data-a="skHand">\u270F\uFE0F \u0412\u0440\u0443\u0447\u043D\u0443</button>${isAdmin() ? '<label class="btn sm">\u{1F9EA} \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0428\u0406<input type="file" id="skBench" accept="image/*" multiple hidden></label>' : ""}</div>`}
      <div class="muted" style="font-size:12px;margin-top:8px">\xAB\u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438\xBB \u043E\u0434\u0440\u0430\u0437\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454 \u043A\u0430\u043C\u0435\u0440\u0443 \u2014 \u0441\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0443\u0439\u0442\u0435 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 \u0440\u0456\u0432\u043D\u043E, \u043F\u0440\u0438 \u0433\u0430\u0440\u043D\u043E\u043C\u0443 \u0441\u0432\u0456\u0442\u043B\u0456. \u041A\u0456\u043B\u044C\u043A\u0430 \u0441\u0442\u043E\u0440\u0456\u043D\u043E\u043A \u2014 \xAB\u0417 \u0433\u0430\u043B\u0435\u0440\u0435\u0457\xBB. \u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u0454 Gemini \u2014 \u0432\u0438 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u0454\u0442\u0435 \u0439 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0454\u0442\u0435. \u0424\u043E\u0442\u043E \u043D\u0456\u0434\u0435 \u043D\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F.</div></div>`;
    if (!I) return top + '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const debts = Object.entries(I.sups || {}).filter(([, s]) => s.debt > 0);
    const dH = adm && debts.length ? `<div class="card"><h3>\u{1F4B8} \u0411\u043E\u0440\u0433\u0438 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u043C <span class="muted">\xB7 ${money(debts.reduce((a, [, s]) => a + s.debt, 0))}</span></h3>${debts.map(([n, s]) => `<div class="kv"><span>${esc(n)}</span><b class="money" style="color:var(--red)">${money(s.debt)}</b></div>`).join("")}</div>` : "";
    const rows = I.list.map((x) => `<div class="kv rrow${x.del ? " del" : ""}"><span class="press" data-a="skInvView" data-id="${x.id}">${x.day.slice(8)}.${x.day.slice(5, 7)} \xB7 <b>${esc(x.sup)}</b>${x.no ? " \u2116" + esc(x.no) : ""}<br><small class="muted">${x.n} \u043F\u043E\u0437. \xB7 ${esc(x.by)}</small></span>
      <span class="kv-r">${adm && x.total != null ? `<b class="money">${money(x.total)}</b>` : ""}${x.del ? "" : x.pay === "debt" && !x.paid ? adm ? `<button class="btn sm red" data-a="skInvPay" data-id="${x.id}">\u23F3 \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438</button>` : '<span class="muted">\u23F3 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</span>' : `<span title="\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E">${x.pay === "card" ? "\u{1F4B3}" : x.pay === "cash" ? "\u{1F4B5}" : "\u2705"}</span>`}${adm ? `<button class="xb" data-a="skInvDel" data-id="${x.id}" data-b="${x.del ? 1 : ""}" title="${x.del ? "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438"}">${x.del ? "\u21A9\uFE0F" : "\u{1F5D1}"}</button>` : ""}</span></div>`).join("");
    return top + dH + `<div class="card"><h3>\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 <span class="muted">\xB7 ${I.list.length}</span></h3>${rows || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445</div>'}</div>`;
  }
  const lineHint = (l, x, adm) => {
    var _a2;
    if (!x && !l.add) return "";
    const u = (x == null ? void 0 : x.u) || ((_a2 = l.add) == null ? void 0 : _a2.u) || "", bq = r3((+l.q || 0) * (+l.f || 1)), up = bq && +l.sum ? +l.sum / bq : 0;
    return `= ${fq(bq, u)}${up ? ` \xB7 ${money(up)}/${u}` : ""}${adm && (x == null ? void 0 : x.lp) && up ? up > x.lp * 1.01 ? ` <b class="warn">\u2191${Math.round((up / x.lp - 1) * 100)}%</b>` : up < x.lp * 0.99 ? ` <span class="good">\u2193${Math.round((1 - up / x.lp) * 100)}%</span>` : "" : ""}`;
  };
  function skDraftHTML() {
    var _a2;
    const d = S.sk.draft, D = S.data.sk, adm = isAdmin(), ing = D.ing.filter((x) => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(ing.map((x) => [x.id, x]));
    const sum = d.lines.reduce((a, l) => a + (+l.sum || 0), 0), diff = d.total ? Math.round((d.total - sum) * 100) / 100 : 0;
    const opt = (l) => `<option value="">\u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u2014</option><option value="__new">${l.add ? `\u2795 \u041D\u043E\u0432\u0438\u0439: ${esc(l.add.n)} (${l.add.u})` : "\u2795 \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</option>${ing.map((x) => `<option value="${x.id}" ${l.id === x.id ? "selected" : ""}>${esc(x.n)} (${x.u})</option>`).join("")}`;
    const pkOpt = (l) => {
      var _a3;
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a3 = l.add) == null ? void 0 : _a3.u) || "\u043E\u0434.", pks = [{ n: u, f: 1 }, ...(x == null ? void 0 : x.pk) || []];
      if (l.f && !pks.some((p) => p.f === +l.f)) pks.push({ n: "\xD7" + l.f, f: +l.f });
      return pks.map((p) => `<option value="${p.f}" ${(+l.f || 1) === p.f ? "selected" : ""}>${esc(p.n)}${p.f !== 1 ? ` (${p.f} ${u})` : ""}</option>`).join("") + '<option value="?">\u0456\u043D\u0448\u0430\u2026</option>';
    };
    const rows = d.lines.map((l, i) => {
      var _a3, _b, _c, _d;
      const st = l.add ? "new" : !l.id ? "none" : l.ok === "guess" ? "guess" : "ok", x = im.get(l.id);
      return `<div class="dl ${st}"><div class="dl-src">${i + 1}. ${l.n ? esc(l.n) : '<i class="muted">\u043D\u043E\u0432\u0438\u0439 \u0440\u044F\u0434\u043E\u043A</i>'}${l.u || l.price ? ` <span class="muted">\xB7 ${esc((_a3 = l.q0) != null ? _a3 : l.q)} ${esc(l.u || "")}${l.price ? " \xD7 " + l.price : ""}</span>` : ""}${st === "guess" ? ` <span class="warn">\u2753 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435${l.sc ? " \xB7 " + Math.round(l.sc * 100) + "%" : ""}</span>` : st === "none" ? ' <span class="warn">\u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442</span>' : ""}</div>
        ${(st === "guess" || st === "new") && ((_b = l.c) == null ? void 0 : _b.length) ? `<div class="chips dl-c">${st === "new" ? '<span class="muted">\u0441\u0445\u043E\u0436\u0435 \u043D\u0430:</span>' : ""}${l.c.map((c) => `<button class="chip ${c.id === l.id ? "on" : ""}" data-a="skDlCand" data-i="${i}" data-id="${c.id}">${esc(c.n)} <small class="muted">${Math.round(c.sc * 100)}%</small></button>`).join("")}${st === "guess" ? `<button class="chip" data-a="skDlCand" data-i="${i}" data-id="__new">\u2795 \u041D\u043E\u0432\u0438\u0439</button>` : ""}</div>` : ""}
        <div class="dl-f"><button class="pk-b ${l.id || l.add ? "" : "empty"}" data-a="skDlPick" data-i="${i}">${x ? esc(x.n) + ` <span class="muted">${x.u}</span>` : l.add ? `\u2795 ${esc(l.add.n)} <span class="muted">${l.add.u}</span>` : "\u{1F50E} \u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</button><input data-dl="${i}" data-k="q" inputmode="decimal" value="${(_c = l.q) != null ? _c : ""}" placeholder="\u041A-\u0441\u0442\u044C"><select data-dl="${i}" data-k="f">${pkOpt(l)}</select><input data-dl="${i}" data-k="sum" inputmode="decimal" value="${(_d = l.sum) != null ? _d : ""}" placeholder="\u0421\u0443\u043C\u0430 \u20B4"><button class="xb" data-a="skDlDel" data-i="${i}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0440\u044F\u0434\u043E\u043A">\u2715</button></div>
        <div class="dl-h muted" id="dlh${i}">${lineHint(l, x, adm)}</div></div>`;
    }).join("");
    const sups = Object.keys(((_a2 = S.data.skInv) == null ? void 0 : _a2.sups) || {});
    return `<div class="card"><div class="rhead"><h3 style="margin:0">\u{1F9FE} ${d.src === "photo" ? "\u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430 \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435" : "\u041D\u043E\u0432\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430"}</h3><button class="btn sm" data-a="skDraftX">\u2715 \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div>
      <div class="frow"><label>\u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A<input id="dSup" list="supL" value="${esc(d.sup || "")}" data-dh="sup" placeholder="\u043D\u0430\u043F\u0440. \u041C\u0435\u0442\u0440\u043E"><datalist id="supL">${sups.map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label><label>\u2116 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430<input id="dNo" value="${esc(d.no || "")}" data-dh="no"></label><label>\u0414\u0430\u0442\u0430<input id="dDate" value="${esc(d.date || "")}" data-dh="date" placeholder="\u0414\u0414.\u041C\u041C.\u0420\u0420\u0420\u0420"></label></div></div>
      <div class="card"><h3>\u041F\u043E\u0437\u0438\u0446\u0456\u0457 <span class="muted">\xB7 ${d.lines.length}</span> <span class="muted" style="font-weight:400;font-size:12px">\u{1F7E2} \u0432\u043F\u0456\u0437\u043D\u0430\u043D\u043E \xB7 \u{1F7E1} \u2753 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u2014 \u0442\u0430\u043F\u043D\u0456\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \xB7 \u{1F535} \u043D\u043E\u0432\u0438\u0439 \u2014 \u0441\u0442\u0432\u043E\u0440\u0438\u0442\u044C\u0441\u044F \u0441\u0430\u043C</span></h3>${rows || '<div class="muted">\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u0437\u0438\u0446\u0456\u0457</div>'}
        <div class="btnrow"><button class="btn sm" data-a="skDlAdd">\u2795 \u0420\u044F\u0434\u043E\u043A</button><button class="btn sm" data-a="skScan">\u{1F50E} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434</button></div></div>
      <div class="card"><div class="kv tot"><span>\u0420\u0430\u0437\u043E\u043C \u0437\u0430 \u043F\u043E\u0437\u0438\u0446\u0456\u044F\u043C\u0438</span><b class="money" id="dSum">${money(sum)}</b></div>${d.total ? `<div class="kv ${Math.abs(diff) > 1 ? "bad" : ""}" id="dTot"><span>\u0423 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0456</span><b class="money">${money(d.total)}${Math.abs(diff) > 1 ? ` \xB7 \u0440\u0456\u0437\u043D\u0438\u0446\u044F ${money(diff)}` : " \u2705"}</b></div>` : ""}
        <div class="muted" style="font-size:12px;margin:10px 0 6px">\u041E\u043F\u043B\u0430\u0442\u0430:</div>
        <div class="btnrow">${isCook() ? '<button class="btn primary" data-a="skDraftSave" data-p="debt">\u2705 \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438 (\u043E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u0430\u0434\u043C\u0456\u043D)</button>' : '<button class="btn primary" data-a="skDraftSave" data-p="cash">\u{1F4B5} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0437 \u043A\u0430\u0441\u0438</button><button class="btn primary" data-a="skDraftSave" data-p="card">\u{1F4B3} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0437 \u043A\u0430\u0440\u0442\u043A\u0438</button><button class="btn" data-a="skDraftSave" data-p="debt">\u23F3 \u0412 \u0431\u043E\u0440\u0433</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430 \u0441\u0430\u043C\u0430 \u0441\u0442\u0430\u043D\u0435 \u0432\u0438\u0442\u0440\u0430\u0442\u043E\u044E \u0432 \xAB\u041A\u0430\u0441\u0456\xBB. \u0421\u043A\u043B\u0430\u0434 \u043F\u043E\u043F\u043E\u0432\u043D\u0438\u0442\u044C\u0441\u044F, \u0446\u0456\u043D\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432 \u043E\u043D\u043E\u0432\u043B\u044F\u0442\u044C\u0441\u044F (\u0441\u0435\u0440\u0435\u0434\u043D\u044F \u0446\u0456\u043D\u0430).</div></div>`;
  }
  const skDraftUpd = (i) => {
    const d = S.sk.draft, l = d.lines[i], x = S.data.sk.ing.find((y) => y.id === (l == null ? void 0 : l.id));
    if (l && $("#dlh" + i)) $("#dlh" + i).innerHTML = lineHint(l, x, isAdmin());
    const s = d.lines.reduce((a, z) => a + (+z.sum || 0), 0);
    if ($("#dSum")) $("#dSum").textContent = money(s);
  };
  async function skNewIng(n, u, home) {
    const D = S.data.sk, uu = /^(л|мл|l|ml)$/i.test(u || "") ? "\u043B" : /^(шт|уп|ящ|пач|пл|бут|бан|pcs?)\.?$/i.test(u || "") ? "\u0448\u0442" : D.units.includes(u) ? u : "\u043A\u0433";
    const body = `<div class="form"><label>\u041D\u0430\u0437\u0432\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443<input id="nN" value="${esc(String(n || "").replace(/\s+\d+([.,]\d+)?\s*(кг|г|л|мл|шт)\.?$/i, "").trim())}"></label>
      <div class="frow"><label>\u041E\u0434\u0438\u043D\u0438\u0446\u044F \u043E\u0431\u043B\u0456\u043A\u0443<select id="nU">${D.units.map((x) => `<option ${x === uu ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>\u0421\u043A\u043B\u0430\u0434<select id="nH"><option value="k" ${home !== "b" ? "selected" : ""}>${WHN.k}</option><option value="b" ${home === "b" ? "selected" : ""}>${WHN.b}</option></select></label></div>
      <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F<select id="nC">${D.cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label></div>`;
    const v = await modal({ title: "\u2795 \u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", body, buttons: [{ label: "\u0414\u043E\u0434\u0430\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const r = v === "ok" ? { n: $("#nN").value.trim(), u: $("#nU").value, home: $("#nH").value, cat: $("#nC").value } : null;
    closeModal();
    return (r == null ? void 0 : r.n) ? r : null;
  }
  async function skDraftSave(pay) {
    var _a2, _b, _c, _d;
    const d = S.sk.draft, bad = d.lines.findIndex((l) => !(+l.q > 0) || !l.id && !l.add);
    if (!d.lines.length) return toast("\u26A0\uFE0F \u041D\u0435\u043C\u0430\u0454 \u043F\u043E\u0437\u0438\u0446\u0456\u0439");
    if (bad >= 0) return toast(`\u26A0\uFE0F \u0420\u044F\u0434\u043E\u043A ${bad + 1}: \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0456 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C (\u0430\u0431\u043E \u043F\u0440\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0440\u044F\u0434\u043E\u043A \u2715)`);
    const inv = { sup: ((_a2 = $("#dSup")) == null ? void 0 : _a2.value.trim()) || d.sup, no: ((_b = $("#dNo")) == null ? void 0 : _b.value.trim()) || d.no, date: ((_c = $("#dDate")) == null ? void 0 : _c.value.trim()) || d.date, pay, src: d.src, lines: d.lines.map((l) => __spreadValues({ id: l.id || null, q: +l.q, f: +l.f || 1, sum: +l.sum || 0, src: l.n || "" }, l.add ? { add: l.add } : {})) };
    const r = await act("skInvSave", { inv }, "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
    if (!r) return;
    S.sk.draft = null;
    S.data.sk = null;
    if ((_d = r.alerts) == null ? void 0 : _d.length) modal({ title: "\u{1F53A} \u041F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F", text: r.alerts.map((a) => `${a.n}: ${money(a.from)} \u2192 ${money(a.to)} / ${a.u} (+${a.pct}%)`).join(" \xB7 "), buttons: [{ label: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E", val: 1, cls: "primary" }] });
    loadView();
  }
  function skAutoF(l) {
    const x = S.data.sk.ing.find((y) => y.id === l.id);
    if (!x) return l.f || 1;
    if (l.ok === "mem" && l.f) return l.f;
    const u = nrm(l.u || "");
    if (x.u === "\u043A\u0433" && /^(г|гр)$/.test(u)) return 1e-3;
    if (x.u === "\u043B" && u === "\u043C\u043B") return 1e-3;
    const p = u && (x.pk || []).find((p2) => nrm(p2.n).slice(0, 2) === u.slice(0, 2));
    return p ? p.f : 1;
  }
  async function skPhotos(files) {
    files = [...files].slice(0, 3);
    if (!files.length) return;
    S.sk.busy = true;
    renderMain();
    try {
      const images = await Promise.all(files.map((f) => shrink(f, 1800, 0.82)));
      const r = await api("skInvParse", { images }, 12e4);
      if (!S.data.sk) S.data.sk = await api("skData");
      S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: "photo", lines: r.lines.map((l) => __spreadProps(__spreadValues({}, l), { q0: l.q, f: l.add || l.f && l.f !== 1 ? l.f : skAutoF(l) })) };
      if (!S.data.skInv) S.data.skInv = await api("skInvList").catch(() => null);
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
    S.sk.busy = false;
    renderMain();
  }
  async function skBench(files) {
    files = [...files].slice(0, 3);
    if (!files.length) return;
    toast("\u{1F9EA} \u041F\u043E\u0440\u0456\u0432\u043D\u044E\u044E \u043C\u043E\u0434\u0435\u043B\u0456\u2026 \u0434\u043E \u0445\u0432\u0438\u043B\u0438\u043D\u0438");
    try {
      const r = await api("aiBench", { images: await Promise.all(files.map((f) => shrink(f, 1800, 0.82))) }, 9e4);
      const l = r.list.sort((a, b) => !!a.err - !!b.err || b.rows - a.rows || a.ms - b.ms);
      modal({ title: "\u{1F9EA} \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0428\u0406", body: l.map((x) => `<div class="kv" style="flex-wrap:wrap"><b style="word-break:break-all">${x.err ? "\u274C" : "\u2705"} ${esc(x.m)}</b><span>${(x.ms / 1e3).toFixed(1)} \u0441</span></div>
        <div class="muted" style="font-size:12px;margin:-2px 0 8px;word-break:break-word">${x.err ? esc(x.err) : `${x.rows} \u0440\u044F\u0434\u043A\u0456\u0432 \xB7 \u0441\u0443\u043C\u0430 \u0440\u044F\u0434\u043A\u0456\u0432 ${money(x.sum)}${x.total ? ` \xB7 \u0440\u0430\u0437\u043E\u043C \u0443 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0456 ${money(x.total)}` : ""}${x.sup ? " \xB7 " + esc(x.sup) : ""}<br>${x.ex.map(esc).join("<br>")}`}</div>`).join(""), buttons: [{ label: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E", val: 1, cls: "primary" }] });
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
  }
  let camStop = null;
  async function skScan() {
    const pm = modal({ title: "\u{1F50E} \u041A\u043E\u0434 / \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434", body: `<div class="form"><input id="scIn" placeholder="\u0412\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u0441\u043A\u0430\u043D\u0435\u0440\u043E\u043C \u0430\u0431\u043E \u0432\u0432\u0435\u0434\u0456\u0442\u044C \u043A\u043E\u0434 \u0456 Enter" autocomplete="off"><div id="scRes" class="muted"></div>
      <button class="btn" data-a="skCam">\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043A\u0430\u043C\u0435\u0440\u043E\u044E</button><div id="scCam" class="sc-cam" hidden><video id="scV" playsinline muted></video></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u0442\u043E\u0432\u0430\u0440\u0443 \u2014 \u0434\u043E\u0434\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0443 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 (\u043C\u043E\u0436\u043D\u0430 \u0441\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043F\u0456\u0434\u0440\u044F\u0434). QR-\u043A\u043E\u0434 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457 \u2014 \u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u044E \u0457\u0457 \u0432\u043C\u0456\u0441\u0442.</div>`, buttons: [{ label: "\u0413\u043E\u0442\u043E\u0432\u043E", val: "ok", cls: "primary" }], keep: true });
    setTimeout(() => {
      var _a2;
      return (_a2 = $("#scIn")) == null ? void 0 : _a2.focus();
    }, 60);
    await pm;
    camStop == null ? void 0 : camStop();
    camStop = null;
    closeModal();
    renderMain();
  }
  async function skCode(code) {
    var _a2;
    code = String(code || "").trim();
    if (!code) return;
    const res = (m) => {
      const el = $("#scRes");
      if (el) el.innerHTML = m;
    };
    if (/^\d{6,14}$/.test(code)) {
      if (!S.data.sk) S.data.sk = await api("skData");
      const x = S.data.sk.ing.find((y) => (y.bc || []).includes(code));
      if (!x) {
        res(`\u2753 \u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0438\u0439 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434 <b>${code}</b> <button class="btn sm" data-a="skBcBind" data-c="${code}">\u041F\u0440\u0438\u0432\u02BC\u044F\u0437\u0430\u0442\u0438 \u0434\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443</button>`);
        return;
      }
      skDraftAdd(x);
      res(`\u2705 +1 <b>${esc(x.n)}</b> (${code})`);
      try {
        (_a2 = navigator.vibrate) == null ? void 0 : _a2.call(navigator, 60);
      } catch (e) {
      }
      return;
    }
    camStop == null ? void 0 : camStop();
    camStop = null;
    closeModal();
    S.sk.tab = "inv";
    S.sk.busy = true;
    renderMain();
    try {
      const r = await api("skInvParse", { text: code }, 6e4);
      S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: "code", lines: r.lines.map((l) => __spreadProps(__spreadValues({}, l), { q0: l.q, f: l.f || 1 })) };
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
    S.sk.busy = false;
    renderMain();
  }
  function skDraftAdd(x) {
    const K = S.sk;
    K.tab = "inv";
    K.draft || (K.draft = { sup: "", no: "", date: "", total: 0, src: "code", lines: [] });
    const l = K.draft.lines.find((z) => z.id === x.id);
    if (l) l.q = r3((+l.q || 0) + 1);
    else K.draft.lines.push({ id: x.id, n: x.n, q: 1, f: 1, sum: "", ok: "ok" });
    if (!$("#modal")) renderMain();
  }
  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("\u0441\u043A\u0430\u043D\u0435\u0440 \u043D\u0435 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0432\u0441\u044F"));
    document.head.append(s);
  });
  async function skCam() {
    const box = $("#scCam"), v = $("#scV");
    if (!box || camStop) return;
    box.hidden = false;
    try {
      if ("BarcodeDetector" in window) {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        v.srcObject = st;
        await v.play();
        const bd = new BarcodeDetector();
        let on = true, last = "", lt = 0;
        camStop = () => {
          on = false;
          st.getTracks().forEach((t) => t.stop());
        };
        const loop = async () => {
          var _a2;
          if (!on) return;
          if (!$("#scV")) return camStop == null ? void 0 : camStop();
          try {
            const r = await bd.detect(v);
            const t = (_a2 = r[0]) == null ? void 0 : _a2.rawValue;
            if (t && (t !== last || Date.now() - lt > 2500)) {
              last = t;
              lt = Date.now();
              skCode(t);
            }
          } catch (e) {
          }
          setTimeout(loop, 250);
        };
        loop();
      } else {
        await loadScript("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js");
        const rd = new ZXingBrowser.BrowserMultiFormatReader();
        let last = "", lt = 0;
        const c = await rd.decodeFromVideoDevice(void 0, v, (r) => {
          if (!r) return;
          const t = r.getText();
          if (t !== last || Date.now() - lt > 2500) {
            last = t;
            lt = Date.now();
            skCode(t);
          }
        });
        camStop = () => {
          try {
            c.stop();
          } catch (e) {
          }
        };
      }
    } catch (e) {
      toast("\u26A0\uFE0F \u041A\u0430\u043C\u0435\u0440\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: " + (e.message || e));
      box.hidden = true;
      camStop = null;
    }
  }
  async function skInvView(id) {
    const r = await act("skInvGet", { id });
    if (!r) return;
    const x = r.inv, adm = isAdmin();
    const body = `<div class="sk-jr">${x.lines.map((l) => `<div class="kv"><span>${esc(l.n)}${l.src && l.src !== l.n ? `<br><small class="muted">${esc(l.src)}</small>` : ""}</span><span class="kv-r"><b>${l.f !== 1 ? `${l.q} \xD7 ${l.f} = ` : ""}${fq(l.bq, l.u)}</b>${adm && l.sum != null ? `<span class="muted money">${money(l.sum)}</span>` : ""}</span></div>`).join("")}
      ${adm ? `<div class="kv tot"><span>\u0420\u0430\u0437\u043E\u043C</span><b class="money">${money(x.total)}</b></div>` : ""}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">${x.day} ${x.at} \xB7 ${esc(x.by)} \xB7 ${{ photo: "\u{1F4F7} \u0437 \u0444\u043E\u0442\u043E", code: "\u{1F50E} \u0437 \u043A\u043E\u0434\u0443", hand: "\u270F\uFE0F \u0432\u0440\u0443\u0447\u043D\u0443" }[x.src] || ""} \xB7 ${x.pay === "debt" ? x.paid ? `\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E ${x.paid.src === "card" ? "\u0437 \u043A\u0430\u0440\u0442\u043A\u0438" : "\u0437 \u043A\u0430\u0441\u0438"}` : "\u23F3 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" : x.pay === "card" ? "\u{1F4B3} \u0437 \u043A\u0430\u0440\u0442\u043A\u0438" : "\u{1F4B5} \u0437 \u043A\u0430\u0441\u0438"}${x.del ? " \xB7 \u{1F5D1} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u0430" : ""}</div>`;
    await modal({ title: `\u{1F9FE} ${x.sup}${x.no ? " \u2116" + x.no : ""}`, body, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  function skUnitCost(id, depth = 0) {
    var _a2, _b;
    const x = S.data.sk.ing.find((y) => y.id === id);
    if (!x) return 0;
    const sc = x.semi && ((_b = (_a2 = S.data.skCost) == null ? void 0 : _a2.cards) == null ? void 0 : _b["semi:" + id]);
    if (sc && depth < 3 && sc.yield > 0) {
      const c = sc.items.reduce((a, l) => a + l.q * skUnitCost(l.id, depth + 1), 0);
      if (c > 0) return c / sc.yield;
    }
    return x.cost || 0;
  }
  function skCardsHTML() {
    const K = S.sk;
    if (K.card) return skCardEdHTML();
    const C = S.data.skCost;
    if (!C) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const tgt = C.cfg.foodCost, list = C.list.filter((x) => !x.tech), q = K.q2.trim().toLowerCase();
    const nNo = list.filter((x) => x.cost == null).length, nHi = list.filter((x) => x.fc > tgt).length, nDr = list.filter((x) => x.draft).length;
    const shown = list.filter((x) => (!q || x.name.toLowerCase().includes(q)) && (K.flt === "none" ? x.cost == null : K.flt === "hi" ? x.fc > tgt : K.flt === "draft" ? x.draft : true));
    const wc = list.filter((x) => x.cost != null && !x.draft && x.price), avg = wc.length ? Math.round(wc.reduce((a, x) => a + x.fc, 0) / wc.length * 10) / 10 : null;
    const fcc = (f) => f == null ? "" : f <= tgt ? "good" : f <= tgt + 10 ? "mid" : "bad";
    const tools = `<div class="sk-tools"><input id="skQ2" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u0441\u0442\u0440\u0430\u0432\u0438" value="${esc(K.q2)}">
      <div class="chips">${[["", `\u0423\u0441\u0456 \xB7 ${list.length}`], ["none", `\u0411\u0435\u0437 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438 \xB7 ${nNo}`], ["hi", `\u0424\u0443\u0434\u043A\u043E\u0441\u0442 > ${tgt}% \xB7 ${nHi}`], ["draft", `\u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0438 AI \xB7 ${nDr}`]].map(([k, l]) => `<button class="chip ${K.flt === k ? "on" : ""}" data-a="skFlt" data-fl="${k}">${l}</button>`).join("")}</div>
      <div class="btnrow">${nNo ? `<button class="btn sm" data-a="skAiAll">${K.aiRun ? `\u23F9 \u0417\u0443\u043F\u0438\u043D\u0438\u0442\u0438 (${K.aiRun})` : `\u2728 AI-\u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438 \u0434\u043B\u044F ${nNo} \u0441\u0442\u0440\u0430\u0432 \u0431\u0435\u0437 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438`}</button>` : ""}</div></div>
      <div class="pills sk-pills"><div class="pill"><span>\u{1F4CB} \u0417 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u043E\u044E</span><b>${list.length - nNo} / ${list.length}</b><small>${nDr ? `\u0447\u0435\u0440\u043D\u0435\u0442\u043E\u043A: ${nDr}` : "\u0441\u0442\u0440\u0430\u0432 \u0456 \u043D\u0430\u043F\u043E\u0457\u0432"}</small></div><div class="pill"><span>\u{1F3AF} \u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442</span><b class="${fcc(avg)}">${avg == null ? "\u2014" : avg + "%"}</b><small>\u0446\u0456\u043B\u044C ${tgt}%</small></div></div>`;
    const groups = {};
    shown.forEach((x) => {
      var _a2;
      return (groups[_a2 = x.cname] || (groups[_a2] = [])).push(x);
    });
    const body = Object.entries(groups).map(([c, xs]) => `<div class="card"><h3>${esc(c)}</h3>${xs.map((x) => {
      var _a2, _b;
      return `<div class="kv press sk-cr" data-a="skCard" data-k="${esc(x.key)}"><span>${esc(x.name)}${x.draft ? ' <span class="badge-d">\u2728 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430</span>' : ""}${((_a2 = x.miss) == null ? void 0 : _a2.length) ? `<br><small class="warn">\u043D\u0435\u043C\u0430\u0454 \u0446\u0456\u043D\u0438: ${esc(x.miss.join(", "))}</small>` : ""}</span>
      <span class="kv-r">${x.cost == null ? '<span class="muted">\u043D\u0435\u043C\u0430\u0454 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438</span>' : `<span class="muted money">${money(x.cost)}</span><b class="${fcc(x.fc)}">${(_b = x.fc) != null ? _b : "\u2014"}%</b>`}<span class="money" style="min-width:64px;text-align:right">${money(x.price)}</span></span></div>`;
    }).join("")}</div>`).join("") || '<div class="card muted">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</div>';
    return tools + body;
  }
  function skCardOpen(key) {
    var _a2;
    const C = S.data.skCost, c = (_a2 = C == null ? void 0 : C.cards) == null ? void 0 : _a2[key], semi = key.startsWith("semi:");
    const it = semi ? null : C.list.find((x2) => x2.key === key), x = semi ? S.data.sk.ing.find((y) => y.id === key.slice(5)) : null;
    S.sk.card = { key, name: semi ? x == null ? void 0 : x.n : it == null ? void 0 : it.name, price: (it == null ? void 0 : it.price) || 0, semi, u: x == null ? void 0 : x.u, out: (c == null ? void 0 : c.out) || "", yield: (c == null ? void 0 : c.yield) || (semi ? 1 : ""), wh: (c == null ? void 0 : c.wh) || "", perL: !!(c == null ? void 0 : c.perL), mk: (c == null ? void 0 : c.mk) || "", draft: !!(c == null ? void 0 : c.draft), note: (c == null ? void 0 : c.note) || "", items: ((c == null ? void 0 : c.items) || []).map((l) => __spreadValues({}, l)), isNew: !c, variant: key.includes("|") };
    S.sk.tab = semi ? S.sk.tab : "cards";
    renderMain();
    $("#main").scrollTop = 0;
  }
  function skCardEdHTML() {
    var _a2, _b, _c, _d;
    const c = S.sk.card, D = S.data.sk, ing = D.ing.filter((x) => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(D.ing.map((x) => [x.id, x])), tgt = ((_b = (_a2 = S.data.skCost) == null ? void 0 : _a2.cfg) == null ? void 0 : _b.foodCost) || 30;
    const cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0), fc = c.price ? Math.round(cost / c.price * 1e3) / 10 : null, rec = cost ? Math.ceil(cost / (tgt / 100) / 5) * 5 : 0;
    const per = c.semi && +c.yield > 0 ? cost / +c.yield : null;
    const rows = c.items.map((l, i) => {
      var _a3, _b2, _c2, _d2, _e, _f;
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a3 = l.add) == null ? void 0 : _a3.u) || "\u043A\u0433", k = u === "\u0448\u0442" ? 1 : 1e3, loss = (_c2 = (_b2 = l.loss) != null ? _b2 : x == null ? void 0 : x.loss) != null ? _c2 : 0, net = (+l.q || 0) * (1 - loss / 100);
      return `<div class="cl"><button class="pk-b ${l.id || l.add ? "" : "empty"}" data-a="skClPick" data-i="${i}">${x ? (x.semi ? "\u{1F373} " : "") + esc(x.n) : l.add ? `\u2795 ${esc(l.add.n)}` : "\u{1F50E} \u041F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</button>
        <label>\u0431\u0440\u0443\u0442\u0442\u043E, ${small(u)}<input data-cl="${i}" data-k="q" inputmode="decimal" value="${l.q ? r3(l.q * k) : ""}"></label><label>\u0432\u0442\u0440\u0430\u0442\u0438 %<input data-cl="${i}" data-k="loss" inputmode="numeric" value="${loss || ""}" placeholder="0"></label>
        <label>\u043D\u0435\u0442\u0442\u043E, ${small(u)}<input data-cl="${i}" data-k="net" inputmode="decimal" value="${net ? r3(net * k) : ""}" id="cln${i}"></label>
        ${isAdmin() ? `<label>\u0446\u0456\u043D\u0430 \u20B4/${small(u)}<input data-cl="${i}" data-k="cost" inputmode="decimal" ${!x || x.semi ? `disabled placeholder="${(x == null ? void 0 : x.semi) ? "\u0437 \u0440\u0435\u0446\u0435\u043F\u0442\u0443" : "\u2014"}"` : ""} value="${x && !x.semi ? ((_f = (_e = (_d2 = c.costCh) == null ? void 0 : _d2[x.id]) != null ? _e : x.cost) != null ? _f : "") || "" : ""}"></label>` : "<i></i>"}
        <span class="cl-c muted money" id="clc${i}">${x ? money((+l.q || 0) * skUnitCost(x.id)) : ""}</span><button class="xb" data-a="skClDel" data-i="${i}">\u2715</button></div>`;
    }).join("");
    return `<div class="card"><div class="rhead"><div><h3 style="margin:0">\u{1F4CB} ${esc(c.name || "")}</h3><span class="muted">${c.semi ? `\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \xB7 \u043F\u0430\u0440\u0442\u0456\u044F ${c.yield || 1} ${c.u || ""}` : `\u0446\u0456\u043D\u0430 ${money(c.price)}`}${c.draft ? " \xB7 \u2728 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430 \u0432\u0456\u0434 AI \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0438" : ""}</span></div><button class="btn sm" data-a="skCardX">\u2190 \u041D\u0430\u0437\u0430\u0434</button></div>
      <div class="frow">${c.semi ? `<label>\u0412\u0438\u0445\u0456\u0434 \u043F\u0430\u0440\u0442\u0456\u0457, ${esc(c.u || "")}<input data-ch="yield" inputmode="decimal" value="${c.yield || ""}"></label>` : `<label>\u0412\u0438\u0445\u0456\u0434, \u0433 / \u043C\u043B<input data-ch="out" inputmode="numeric" value="${c.out || ""}" placeholder="\u043D\u0430\u043F\u0440. 400"></label>`}
        <label>\u0421\u043F\u0438\u0441\u0443\u0432\u0430\u0442\u0438 \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443<select data-ch="wh"><option value="">\u0430\u0432\u0442\u043E (${c.semi ? "\u0434\u0435 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430" : "\u043A\u0443\u0445\u043D\u044F \u2014 \u0437 \u043A\u0443\u0445\u043D\u0456, \u0431\u0430\u0440 \u2014 \u0437 \u0431\u0430\u0440\u0443"})</option><option value="k" ${c.wh === "k" ? "selected" : ""}>${WHN.k}</option><option value="b" ${c.wh === "b" ? "selected" : ""}>${WHN.b}</option></select></label>
        ${c.variant && !c.semi ? `<label class="chk"><input type="checkbox" data-ch="perL" ${c.perL ? "checked" : ""}> \u043D\u0430 1 \u043B \u2014 \u043C\u043D\u043E\u0436\u0438\u0442\u0438 \u043D\u0430 \u043E\u0431\u02BC\u0454\u043C (\u0440\u043E\u0437\u043B\u0438\u0432\u043D\u0435)</label>` : ""}</div></div>
      <div class="card"><h3>\u0421\u043A\u043B\u0430\u0434 <span class="muted">\xB7 ${c.items.length}</span></h3>${rows || '<div class="muted">\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0430\u0431\u043E \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u2728 \u0417\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0437 AI\xBB</div>'}
        ${c.items.length ? `<div class="kv tot sk-mass"><span>\u2696\uFE0F \u0417\u0430\u0433\u0430\u043B\u044C\u043D\u0430 \u043C\u0430\u0441\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432</span><b id="cMass">${skMass(c)}</b></div>` : ""}
        <div class="btnrow"><button class="btn sm" data-a="skClAdd">\u2795 \u041F\u0440\u043E\u0434\u0443\u043A\u0442</button><button class="btn sm" data-a="skCardAi">${S.sk.aiBusy ? "\u23F3 AI \u0434\u0443\u043C\u0430\u0454\u2026" : "\u2728 \u0417\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0437 AI"}</button></div></div>
      ${c.semi ? `<div class="card sk-howto">\u{1F4D0} <b>\u042F\u043A \u0446\u0435 \u043F\u0440\u0430\u0446\u044E\u0454:</b> \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442 \u043D\u0430 \u0431\u0443\u0434\u044C-\u044F\u043A\u0438\u0439 \u0432\u0438\u0445\u0456\u0434 (\u043D\u0430\u043F\u0440. \u043D\u0430 <b>1 ${esc(c.u || "\u043B")}</b>: \u0443\u0441\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0439 \xAB\u0412\u0438\u0445\u0456\u0434 \u043F\u0430\u0440\u0442\u0456\u0457\xBB = 1). \u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u043F\u043E\u0440\u0430\u0445\u0443\u0454, \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u043A\u043E\u0448\u0442\u0443\u0454 1 ${esc(c.u || "\u043B")}.<br>\u0423 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0456 \u0441\u0442\u0440\u0430\u0432\u0438 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u0446\u0435\u0439 \u0441\u043E\u0443\u0441 \u044F\u043A \u0437\u0432\u0438\u0447\u0430\u0439\u043D\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 (\u043D\u0430\u043F\u0440. <b>0.05 ${esc(c.u || "\u043B")}</b>) \u2014 \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u043F\u043E\u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0437 \u0446\u0456\u043D\u0438 1 ${esc(c.u || "\u043B")}${((_d = (_c = S.cfg) == null ? void 0 : _c.semiCalc) != null ? _d : 1) ? ", \u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0456 \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443 \u0441\u043F\u0438\u0448\u0443\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0440\u0435\u0446\u0435\u043F\u0442\u0443. \u0412\u0430\u0440\u0438\u0442\u0438 \xAB\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443\xBB \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0456 \u043D\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u043E." : ". \u0420\u0435\u0436\u0438\u043C \u043F\u0430\u0440\u0442\u0456\u0439: \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F, \u043A\u043E\u043B\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u0456 \u0432\u0456\u0434\u043C\u0456\u0447\u0430\u044E\u0442\u044C \xAB\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430\xBB."}</div>` : ""}
      <div class="card"><div class="kv tot"><span>\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C ${c.semi ? "\u043F\u0430\u0440\u0442\u0456\u0457" : "\u043F\u043E\u0440\u0446\u0456\u0457"}</span><b class="money" id="cCost">${money(cost)}</b></div>
        ${c.semi ? `<div class="kv"><span>\u0417\u0430 1 ${esc(c.u || "")}</span><b class="money" id="cPer">${per != null ? money(per) : "\u2014"}</b></div>` : `<div class="kv"><span>\u0424\u0443\u0434\u043A\u043E\u0441\u0442</span><b id="cFc" class="${fc == null ? "" : fc <= tgt ? "good" : fc <= tgt + 10 ? "mid" : "bad"}">${fc != null ? fc : "\u2014"}%</b></div><div class="kv"><span>\u041C\u0430\u0440\u0436\u0430 \u0437 \u043F\u043E\u0440\u0446\u0456\u0457</span><b class="money" id="cM">${money(c.price - cost)}</b></div>
        <div class="kv"><span>\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u043F\u0440\u0438 \u0444\u0443\u0434\u043A\u043E\u0441\u0442\u0456 ${tgt}%</span><b class="money" id="cRec">${rec ? money(rec) : "\u2014"}</b></div>
        <div class="kv sk-mk"><span>\u{1F4C8} \u041D\u0430\u0446\u0456\u043D\u043A\u0430 (\u043C\u043D\u043E\u0436\u043D\u0438\u043A)<br><small class="muted">\u043D\u0430\u043F\u0440. 4 = \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \xD7 4</small></span><span class="kv-r"><input data-ch="mk" inputmode="decimal" value="${c.mk || ""}" placeholder="\xD74" style="width:80px"></span></div>
        <div class="kv"><span>\u0426\u0456\u043D\u0430 \u0437\u0430 \u043D\u0430\u0446\u0456\u043D\u043A\u043E\u044E</span><b class="money" id="cMk">${+c.mk && cost ? money(Math.ceil(cost * +String(c.mk).replace(",", ".") / 5) * 5) : "\u2014"}</b></div>
        <div class="kv"><span>\u0424\u0430\u043A\u0442\u0438\u0447\u043D\u0430 \u043D\u0430\u0446\u0456\u043D\u043A\u0430 \u0437\u0430 \u0446\u0456\u043D\u043E\u044E \u0432 \u043C\u0435\u043D\u044E</span><b id="cMkF">${cost && c.price ? "\xD7" + Math.round(c.price / cost * 100) / 100 + ` (+${Math.round((c.price / cost - 1) * 100)}%)` : "\u2014"}</b></div>`}
        <div class="btnrow"><button class="btn primary" data-a="skCardSave">\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438</button>${c.isNew ? "" : '<button class="btn red" data-a="skCardDel">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">\u0411\u0440\u0443\u0442\u0442\u043E \u2014 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0431\u0435\u0440\u0435\u0442\u044C\u0441\u044F \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443; \u043D\u0435\u0442\u0442\u043E \u2014 \u043F\u0456\u0441\u043B\u044F \u0447\u0438\u0441\u0442\u043A\u0438 / \u0432\u0430\u0440\u043A\u0438. \u041F\u0440\u043E\u0434\u0430\u0436 \u0441\u0442\u0440\u0430\u0432\u0438 \u0441\u043F\u0438\u0441\u0443\u0454 \u0431\u0440\u0443\u0442\u0442\u043E \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443. \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0430 AI \u043D\u0435 \u0441\u043F\u0438\u0441\u0443\u0454, \u043F\u043E\u043A\u0438 \u0432\u0438 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u0435.</div></div>`;
  }
  function skMass(c) {
    var _a2, _b, _c;
    const im = new Map(S.data.sk.ing.map((x) => [x.id, x]));
    let g = 0, n = 0, pc = 0;
    for (const l of c.items) {
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a2 = l.add) == null ? void 0 : _a2.u) || "\u043A\u0433", q = +l.q || 0, loss = (_c = (_b = l.loss) != null ? _b : x == null ? void 0 : x.loss) != null ? _c : 0;
      if (u === "\u0448\u0442") pc += q;
      else {
        g += q * 1e3;
        n += q * (1 - loss / 100) * 1e3;
      }
    }
    return `${Math.round(g)} \u0433${Math.round(n) !== Math.round(g) ? ` \xB7 \u043D\u0435\u0442\u0442\u043E ${Math.round(n)} \u0433` : ""}${pc ? ` + ${r3(pc)} \u0448\u0442` : ""}`;
  }
  const skCardCalc = () => {
    var _a2, _b;
    const c = S.sk.card;
    if (!c) return;
    const tgt = ((_b = (_a2 = S.data.skCost) == null ? void 0 : _a2.cfg) == null ? void 0 : _b.foodCost) || 30, cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0);
    c.items.forEach((l, i) => {
      const el = $("#clc" + i);
      if (el && l.id) el.textContent = money((+l.q || 0) * skUnitCost(l.id));
    });
    const set = (id, v) => {
      const el = $("#" + id);
      if (el) el.textContent = v;
    };
    set("cMass", skMass(c));
    {
      const mk = +String(c.mk || "").replace(",", ".");
      set("cMk", mk && cost ? money(Math.ceil(cost * mk / 5) * 5) : "\u2014");
    }
    set("cCost", money(cost));
    if (c.semi) set("cPer", +c.yield > 0 ? money(cost / +c.yield) : "\u2014");
    else {
      const fc = c.price ? Math.round(cost / c.price * 1e3) / 10 : null;
      set("cFc", (fc != null ? fc : "\u2014") + "%");
      const el = $("#cFc");
      if (el) el.className = fc == null ? "" : fc <= tgt ? "good" : fc <= tgt + 10 ? "mid" : "bad";
      set("cM", money(c.price - cost));
      set("cRec", cost ? money(Math.ceil(cost / (tgt / 100) / 5) * 5) : "\u2014");
    }
  };
  async function skMakeIngs(lines) {
    for (const l of lines) {
      if (l.id || !l.add) continue;
      const ex = S.data.sk.ing.find((x) => !x.off && nrm(x.n) === nrm(l.add.n));
      if (ex) {
        l.id = ex.id;
        delete l.add;
        continue;
      }
      const r = await api("skIngSave", { x: { n: l.add.n, u: l.add.u, home: l.add.home || "k", cat: l.add.cat || "\u0406\u043D\u0448\u0435", loss: l.loss || 0 } }).catch((e) => ({ error: e.message }));
      if (r.x) {
        S.data.sk.ing.push(r.x);
        l.id = r.x.id;
        delete l.add;
      } else throw new Error(`\xAB${l.add.n}\xBB: ${r.error}`);
    }
  }
  async function skCardSave(draft = false) {
    const c = S.sk.card;
    try {
      await skMakeIngs(c.items);
    } catch (e) {
      return toast("\u26A0\uFE0F " + e.message);
    }
    const items = c.items.filter((l) => l.id && +l.q > 0).map((l) => __spreadValues({ id: l.id, q: r3(l.q) }, l.loss != null && l.loss !== "" ? { loss: +l.loss } : {}));
    if (!items.length) return toast("\u26A0\uFE0F \u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0445\u043E\u0447\u0430 \u0431 \u043E\u0434\u0438\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0437 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E");
    if (c.costCh && Object.keys(c.costCh).length && !await act("skIngCost", { list: Object.entries(c.costCh).map(([id, cost]) => ({ id, cost })) })) return;
    const card = { items, out: +c.out || 0, yield: +c.yield || 0, wh: c.wh, perL: c.perL, mk: +String(c.mk || "").replace(",", ".") || 0, draft, note: c.note };
    const r = await act("skCardSave", { key: c.key, name: c.name, card }, draft ? "\u2728 \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0443 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E" : "\u{1F4BE} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0443 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (!r) return;
    S.sk.card = null;
    S.data.sk = null;
    loadView();
  }
  async function skCardAi() {
    const c = S.sk.card;
    if (S.sk.aiBusy) return;
    S.sk.aiBusy = true;
    renderMain();
    try {
      const r = await api("skCardAi", { key: c.key, yield: c.yield }, 45e3);
      c.items = r.items.map((l) => {
        var _a2;
        return __spreadValues({ id: l.id, q: l.q, loss: l.loss }, l.id ? {} : { add: { n: l.n, u: l.u, home: ((_a2 = S.data.sk.ing.find((x) => x.id === c.key.slice(5))) == null ? void 0 : _a2.home) || "k" } });
      });
      if (!c.semi && r.out && !c.out) c.out = r.out;
      c.draft = true;
      toast("\u2728 \u0413\u043E\u0442\u043E\u0432\u043E \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0438 \u0456 \u0437\u0431\u0435\u0440\u0435\u0436\u0456\u0442\u044C");
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
    S.sk.aiBusy = false;
    renderMain();
  }
  async function skAiAll() {
    const K = S.sk;
    if (K.aiRun) {
      K.aiStop = true;
      return;
    }
    const todo = S.data.skCost.list.filter((x) => !x.tech && x.cost == null);
    if (!todo.length) return;
    if (!await confirmBox(`\u2728 \u0421\u043A\u043B\u0430\u0441\u0442\u0438 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438 \u0442\u0435\u0445\u043A\u0430\u0440\u0442 \u0434\u043B\u044F ${todo.length} \u0441\u0442\u0440\u0430\u0432?`, "AI \u0437\u0430\u043F\u0440\u043E\u043F\u043E\u043D\u0443\u0454 \u0441\u043A\u043B\u0430\u0434 \u0456 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0438, \u043D\u043E\u0432\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0441\u0442\u0432\u043E\u0440\u044F\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456. \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0438 \u043D\u0435 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C \u0441\u043A\u043B\u0430\u0434, \u043F\u043E\u043A\u0438 \u0432\u0438 \u0457\u0445 \u043D\u0435 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0435 \u0439 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u0435. \u0417\u0430\u0439\u043C\u0435 \u043A\u0456\u043B\u044C\u043A\u0430 \u0445\u0432\u0438\u043B\u0438\u043D.")) return;
    K.aiStop = false;
    let done = 0, fail = 0;
    for (const x of todo) {
      if (K.aiStop) break;
      K.aiRun = `${done + fail + 1}/${todo.length}`;
      if (S.view === "calc") renderMain();
      try {
        const r = await api("skCardAi", { key: x.key }, 45e3), items = r.items.map((l) => __spreadValues({ id: l.id, q: l.q, loss: l.loss }, l.id ? {} : { add: { n: l.n, u: l.u, home: ["bar", "hookah"].includes(((S.groups || []).find((g) => g.cats.includes(x.cat)) || {}).id) ? "b" : "k" } }));
        await skMakeIngs(items);
        await api("skCardSave", { key: x.key, name: x.name, card: { items: items.filter((l) => l.id).map((l) => __spreadValues({ id: l.id, q: l.q }, l.loss ? { loss: l.loss } : {})), out: r.out || 0, draft: true } });
        done++;
      } catch (e) {
        fail++;
        await new Promise((z) => setTimeout(z, 4e3));
      }
    }
    K.aiRun = null;
    toast(`\u2728 \u0427\u0435\u0440\u043D\u0435\u0442\u043E\u043A: ${done}${fail ? ` \xB7 \u043D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C: ${fail}` : ""}`);
    S.data.sk = null;
    if (S.view === "calc") loadView();
  }
  const techCard = (x) => `<div class="card tech"><h3>${esc(x.name)}${x.draft ? ' <span class="badge-d">\u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430</span>' : ""}</h3>${x.out || x.size ? `<div class="muted">\u0432\u0438\u0445\u0456\u0434 ${x.out ? x.out + " \u0433" : esc(x.size)}${x.yield ? ` \xB7 \u043F\u0430\u0440\u0442\u0456\u044F ${x.yield}` : ""}</div>` : ""}
    ${x.items.map((l) => {
    const net = l.q * (1 - (l.loss || 0) / 100);
    return `<div class="kv"><span>${esc(l.n)}</span><b>${fq(l.q, l.u)}${l.loss ? ` <small class="muted">\u2192 ${fq(net, l.u)} \u043D\u0435\u0442\u0442\u043E</small>` : ""}</b></div>`;
  }).join("")}${x.desc ? `<div class="muted" style="font-size:12px;margin-top:6px">${esc(x.desc)}</div>` : ""}</div>`;
  function skTechHTML() {
    const T = S.data.skTech;
    if (!T) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const q = S.sk.q2.trim().toLowerCase(), l = T.list.filter((x) => !q || x.name.toLowerCase().includes(q));
    return `<div class="sk-tools"><input id="skQ2" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u0441\u0442\u0440\u0430\u0432\u0438" value="${esc(S.sk.q2)}"></div><div class="tech-g">${l.map(techCard).join("") || '<div class="card muted">\u0422\u0435\u0445\u043A\u0430\u0440\u0442 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u0457\u0445 \u0437\u0430\u043F\u043E\u0432\u043D\u044E\u0454 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440</div>'}</div>`;
  }
  async function skTechOne(name) {
    var _a2;
    const r = await act("skTech", { name });
    const x = (_a2 = r == null ? void 0 : r.list) == null ? void 0 : _a2[0];
    if (!x) return toast("\u0414\u043B\u044F \u0446\u0456\u0454\u0457 \u0441\u0442\u0440\u0430\u0432\u0438 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438");
    await modal({ title: "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430", body: techCard(x), buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  async function skTechAll() {
    const r = await act("skTech", {});
    if (!r) return;
    const pm = modal({ title: "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438", body: `<input id="tqQ" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u0441\u0442\u0440\u0430\u0432\u0438" autocomplete="off"><div class="tech-m" id="tqL">${r.list.map(techCard).join("") || '<div class="muted">\u0422\u0435\u0445\u043A\u0430\u0440\u0442 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    setTimeout(() => {
      const i = $("#tqQ");
      i == null ? void 0 : i.addEventListener("input", () => {
        const q = i.value.toLowerCase();
        $("#tqL").innerHTML = r.list.filter((x) => x.name.toLowerCase().includes(q)).map(techCard).join("");
      });
    }, 30);
    await pm;
  }
  function skProdHTML() {
    var _a2, _b, _c;
    const D = S.data.sk, adm = isAdmin(), cards = ((_a2 = S.data.skCost) == null ? void 0 : _a2.cards) || {}, semis = D.ing.filter((x) => x.semi && !x.off), calc = (_c = (_b = S.cfg) == null ? void 0 : _b.semiCalc) != null ? _c : 1;
    return `${calc ? '<div class="card sk-howto">\u{1F4D0} <b>\u0420\u0435\u0436\u0438\u043C \xAB\u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A\xBB:</b> \u0441\u043E\u0443\u0441\u0438 \u0439 \u0442\u0456\u0441\u0442\u043E \u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F \u0432\u0456\u0434 \u0440\u0435\u0446\u0435\u043F\u0442\u0443 \u2014 \u0446\u0456\u043D\u0430 \u0437\u0430 1 \u043B / 1 \u043A\u0433, \u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0456 \u0441\u0442\u0440\u0430\u0432\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0440\u0435\u0446\u0435\u043F\u0442\u0443 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456. \u041D\u0456\u0447\u043E\u0433\u043E \xAB\u0433\u043E\u0442\u0443\u0432\u0430\u0442\u0438\xBB \u0442\u0443\u0442 \u043D\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u043E, \u043B\u0438\u0448\u0435 \u0437\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0440\u0435\u0446\u0435\u043F\u0442 (\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430). \u041E\u0431\u043B\u0456\u043A \u043F\u0430\u0440\u0442\u0456\u044F\u043C\u0438 \u0432\u043C\u0438\u043A\u0430\u0454\u0442\u044C\u0441\u044F \u0432 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u0445 \u2192 \u{1F9EE} \u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A.</div>' : ""}<div class="btnrow" style="margin:0 0 12px">${adm ? '<button class="btn sm primary" data-a="skSemiNew">\u2795 \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430</button>' : ""}</div>` + (semis.length ? `<div class="grid2">${semis.map((x) => {
      const c = cards["semi:" + x.id];
      return `<div class="card"><h3>\u{1F373} ${esc(x.n)}</h3>${calc ? "" : `<div class="kv"><span>\u041D\u0430 \u0441\u043A\u043B\u0430\u0434\u0456</span><b>${fq(totQ(x), x.u)}</b></div>`}${adm ? `<div class="kv"><span>\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C</span><b class="money">${skUnitCost(x.id) ? money(skUnitCost(x.id)) + " / " + x.u : "\u2014"}</b></div><div class="kv"><span>\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430</span><span class="${c ? "" : "warn"}">${c ? `${c.items.length} \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432 \xB7 \u043F\u0430\u0440\u0442\u0456\u044F ${c.yield} ${x.u}` : "\u043D\u0435 \u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u0430"}</span></div>` : ""}
        <div class="btnrow">${calc ? "" : `<button class="btn sm primary" data-a="skProd" data-id="${x.id}">\u{1F373} \u041F\u0440\u0438\u0433\u043E\u0442\u0443\u0432\u0430\u043B\u0438</button>`}${adm ? `<button class="btn sm" data-a="skCardSemi" data-id="${x.id}">\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430</button>` : ""}</div></div>`;
    }).join("")}</div>` : `<div class="card muted">\u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043E\u043A \u0449\u0435 \u043D\u0435\u043C\u0430\u0454. ${adm ? "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u2795 \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430\xBB (\u043D\u0430\u043F\u0440. \xAB\u0421\u043E\u0443\u0441 \u0437\u0435\u043B\u0435\u043D\u0438\u0439\xBB, \u043B) \u0456 \u0437\u0430\u043F\u043E\u0432\u043D\u0456\u0442\u044C \u0457\u0457 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443: \u0437 \u0447\u043E\u0433\u043E \u0439 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0432\u0438\u0445\u043E\u0434\u0438\u0442\u044C. \u041F\u043E\u0442\u0456\u043C \xAB\u{1F373} \u041F\u0440\u0438\u0433\u043E\u0442\u0443\u0432\u0430\u043B\u0438\xBB \u0441\u043F\u0438\u0448\u0435 \u0441\u0438\u0440\u043E\u0432\u0438\u043D\u0443 \u0439 \u0434\u043E\u0434\u0430\u0441\u0442\u044C \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434, \u0430 \u0441\u0442\u0440\u0430\u0432\u0438 \u0441\u043F\u0438\u0441\u0443\u0432\u0430\u0442\u0438\u043C\u0443\u0442\u044C \u0443\u0436\u0435 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443." : "\u0407\u0445 \u0434\u043E\u0434\u0430\u0454 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440."}</div>`);
  }
  async function skProduce(id) {
    const x = S.data.sk.ing.find((y) => y.id === id);
    if (!x) return;
    const v = await ask(`\u{1F373} ${x.n}: \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u043F\u0440\u0438\u0433\u043E\u0442\u0443\u0432\u0430\u043B\u0438?`, `\u043D\u0430\u043F\u0440. 3 (${x.u})`);
    if (!v) return;
    const q = parseQ(v, x.u);
    if (!(q > 0)) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C");
    const r = await act("skProduce", { id, q }, `\u{1F373} +${fq(q, x.u)} ${x.n}`);
    if (r) {
      S.data.sk = null;
      loadView();
    }
  }
  function skCountHTML() {
    const K = S.sk, C = S.data.skCount, adm = isAdmin();
    if (!C) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const wh = K.cwh, all = C.ing.filter((x) => {
      var _a2;
      return !x.off && (x.home === wh || (((_a2 = x.st) == null ? void 0 : _a2[wh]) || 0) !== 0);
    }).sort((a, b) => (a.cat || "").localeCompare(b.cat || "") || a.n.localeCompare(b.n));
    const q = K.cq.trim().toLowerCase(), shown = all.filter((x) => !q || x.n.toLowerCase().includes(q)), n = Object.values(K.cf).filter((v) => v !== "").length;
    const diffH = (x) => {
      var _a2;
      const raw = K.cf[x.id];
      if (raw == null || raw === "") return "";
      const f = parseQ(raw, x.u);
      if (isNaN(f)) return '<span class="warn">?</span>';
      const d = r3(f - (((_a2 = x.st) == null ? void 0 : _a2[wh]) || 0));
      return d ? `<span class="${d < 0 ? "neg" : "good"}">${d > 0 ? "+" : ""}${fq(d, x.u)}${adm && x.cost ? ` \xB7 ${d > 0 ? "+" : ""}${money(d * x.cost)}` : ""}</span>` : '<span class="good">\u2713</span>';
    };
    let cat = "";
    const rows = shown.map((x) => {
      var _a2, _b;
      const h = x.cat !== cat ? `<div class="cnt-cat">${esc(cat = x.cat || "\u0406\u043D\u0448\u0435")}</div>` : "";
      return h + `<div class="cnt-r"><span>${x.semi ? "\u{1F373} " : ""}${esc(x.n)}<br><small class="muted">\u0441\u0438\u0441\u0442\u0435\u043C\u0430: ${fq(((_a2 = x.st) == null ? void 0 : _a2[wh]) || 0, x.u)}</small></span><input data-cf="${x.id}" inputmode="decimal" value="${esc((_b = K.cf[x.id]) != null ? _b : "")}" placeholder="\u0444\u0430\u043A\u0442, ${x.u}"><span class="cnt-d" id="cfd${x.id}">${diffH(x)}</span></div>`;
    }).join("");
    const hist = (S.data.skCnts || []).slice(0, 15).map((c) => `<div class="kv press" data-a="skCntView" data-id="${c.id}"><span>${c.day.slice(8)}.${c.day.slice(5, 7)} \xB7 ${WHN[c.wh]} \xB7 ${esc(c.by)} <span class="muted">\xB7 ${c.n} \u043F\u043E\u0437.</span></span>${adm ? `<span class="kv-r"><b class="neg">${money(c.short)}</b><b class="good">+${money(c.over)}</b></span>` : ""}</div>`).join("");
    return `<div class="sk-tools">${adm ? `<div class="chips">${["k", "b"].map((w) => `<button class="chip ${wh === w ? "on" : ""}" data-a="skCwh" data-w="${w}">${WHN[w]}</button>`).join("")}</div>` : ""}<input id="skCq" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443" value="${esc(K.cq)}"></div>
      <div class="card"><div class="rhead"><div><h3 style="margin:0">\u{1F4DD} ${WHN[wh]}: \u0432\u043D\u0435\u0441\u0435\u043D\u043E ${n} \u0437 ${all.length}</h3><span class="muted">\u041F\u0438\u0448\u0456\u0442\u044C \u0444\u0430\u043A\u0442\u0438\u0447\u043D\u0438\u0439 \u0437\u0430\u043B\u0438\u0448\u043E\u043A (\u043C\u043E\u0436\u043D\u0430 \xAB250 \u0433\xBB). \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0430 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0430 \u2014 \u043C\u043E\u0436\u043D\u0430 \u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0437 \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0430 \u0447\u0430\u0441\u0442\u0438\u043D\u0430\u043C\u0438. \u041F\u043E\u0440\u043E\u0436\u043D\u0456 \u0440\u044F\u0434\u043A\u0438 \u043D\u0435 \u0437\u043C\u0456\u043D\u044E\u044E\u0442\u044C\u0441\u044F.</span></div>
        <button class="btn primary" data-a="skCntFin" ${n ? "" : "disabled"}>\u2705 \u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438</button></div>${rows || '<div class="muted">\u041D\u0430 \u0446\u044C\u043E\u043C\u0443 \u0441\u043A\u043B\u0430\u0434\u0456 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432</div>'}</div>
      ${hist ? `<div class="card"><h3>\u0406\u0441\u0442\u043E\u0440\u0456\u044F</h3>${hist}</div>` : ""}`;
  }
  let cfT = null;
  const cfPend = {};
  function skCfInput(id, v) {
    var _a2;
    const K = S.sk, C = S.data.skCount, x = C.ing.find((y) => y.id === id);
    K.cf[id] = v;
    const el = $("#cfd" + id);
    if (el && x) {
      const f = parseQ(v, x.u), d = r3(f - (((_a2 = x.st) == null ? void 0 : _a2[K.cwh]) || 0));
      el.innerHTML = v === "" ? "" : isNaN(f) ? '<span class="warn">?</span>' : d ? `<span class="${d < 0 ? "neg" : "good"}">${d > 0 ? "+" : ""}${fq(d, x.u)}${isAdmin() && x.cost ? ` \xB7 ${d > 0 ? "+" : ""}${money(d * x.cost)}` : ""}</span>` : '<span class="good">\u2713</span>';
    }
    cfPend[id] = v === "" ? "" : parseQ(v, x == null ? void 0 : x.u);
    clearTimeout(cfT);
    cfT = setTimeout(async () => {
      const f = __spreadValues({}, cfPend);
      Object.keys(cfPend).forEach((k) => delete cfPend[k]);
      Object.keys(f).forEach((k) => {
        if (Number.isNaN(f[k])) delete f[k];
      });
      if (Object.keys(f).length) await api("skCountSave", { wh: K.cwh, f }).catch(() => toast("\u26A0\uFE0F \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0443 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442"));
    }, 1200);
  }
  async function skCntFinish() {
    const K = S.sk;
    clearTimeout(cfT);
    const f = __spreadValues({}, cfPend);
    Object.keys(cfPend).forEach((k) => delete cfPend[k]);
    if (Object.keys(f).length) await api("skCountSave", { wh: K.cwh, f }).catch(() => {
    });
    if (!await confirmBox(`\u2705 \u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0456\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044E (${WHN[K.cwh]})?`, "\u0417\u0430\u043B\u0438\u0448\u043A\u0438 \u0441\u0442\u0430\u043D\u0443\u0442\u044C \u0442\u0430\u043A\u0438\u043C\u0438, \u044F\u043A \u0432\u0438 \u0432\u043D\u0435\u0441\u043B\u0438. \u041D\u0435\u0441\u0442\u0430\u0447\u0456 \u0439 \u043D\u0430\u0434\u043B\u0438\u0448\u043A\u0438 \u0437\u0430\u043F\u0438\u0448\u0443\u0442\u044C\u0441\u044F \u0432 \u0456\u0441\u0442\u043E\u0440\u0456\u044E.")) return;
    const r = await act("skCountFinish", { wh: K.cwh }, "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E");
    if (!r) return;
    K.cf = {};
    await skCntShow(r.doc);
    loadView();
  }
  async function skCntShow(d) {
    const adm = isAdmin(), ch = d.lines.filter((x) => x.diff);
    await modal({ title: `\u{1F4DD} ${WHN[d.wh]} \xB7 ${d.day}`, body: `${adm ? `<div class="kv tot"><span>\u{1F53B} \u041D\u0435\u0441\u0442\u0430\u0447\u0430</span><b class="money neg">${money(d.short)}</b></div><div class="kv"><span>\u{1F53A} \u041D\u0430\u0434\u043B\u0438\u0448\u043E\u043A</span><b class="money good">+${money(d.over)}</b></div>` : ""}
      <div class="sk-jr">${ch.map((x) => `<div class="kv"><span>${esc(x.n)}<br><small class="muted">\u0431\u0443\u043B\u043E ${fq(x.sys, x.u)} \u2192 \u0444\u0430\u043A\u0442 ${fq(x.fact, x.u)}</small></span><b class="${x.diff < 0 ? "neg" : "good"}">${x.diff > 0 ? "+" : ""}${fq(x.diff, x.u)}${adm && x.sum != null ? ` \xB7 ${money(x.sum)}` : ""}</b></div>`).join("") || '<div class="muted">\u0423\u0441\u0435 \u0437\u0431\u0456\u0433\u043B\u043E\u0441\u044F \u2705</div>'}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u041F\u043E\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439: ${d.lines.length} \xB7 ${esc(d.by)}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  function skRepHTML() {
    const K = S.sk, R = S.data.skRep, P = [["d", "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["w", "7 \u0434\u043D\u0456\u0432"], ["30", "30 \u0434\u043D\u0456\u0432"], ["m", "\u0426\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"], ["pm", "\u041C\u0438\u043D. \u043C\u0456\u0441\u044F\u0446\u044C"]];
    const head = `<div class="chips scroll" style="margin-bottom:12px">${P.map(([k, l]) => `<button class="chip ${K.p === k ? "on" : ""}" data-a="skP" data-p="${k}">${l}</button>`).join("")}</div>`;
    if (!R) return head + '<div class="muted">\u0420\u0430\u0445\u0443\u044E\u2026</div>';
    const tgt = R.foodCost, fc = R.revKnown ? Math.round(R.cogs / R.revKnown * 1e3) / 10 : null, gp = R.revKnown - R.cogs, cls = (f) => f == null ? "" : f <= tgt ? "good" : f <= tgt + 10 ? "mid" : "bad";
    const kpis = `<div class="kpis"><div class="kpi accent"><span>\u0412\u0438\u0440\u0443\u0447\u043A\u0430</span><b class="money">${money(R.revenue)}</b></div><div class="kpi"><span>\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u043F\u0440\u043E\u0434\u0430\u043D\u043E\u0433\u043E</span><b class="money">${money(R.cogs)}</b>${R.revKnown < R.revenue ? `<small class="muted">\u0437 ${money(R.revKnown)} \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0441\u0442\u0440\u0430\u0432 \u0437 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0430\u043C\u0438</small>` : ""}</div>
      <div class="kpi"><span>\u0424\u0443\u0434\u043A\u043E\u0441\u0442 <small class="muted">(\u0446\u0456\u043B\u044C ${tgt}%)</small></span><b class="${cls(fc)}">${fc == null ? "\u2014" : fc + "%"}</b></div><div class="kpi green"><span>\u0412\u0430\u043B\u043E\u0432\u0438\u0439 \u043F\u0440\u0438\u0431\u0443\u0442\u043E\u043A <small class="muted">(\u0441\u0442\u0440\u0430\u0432\u0438 \u0437 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0430\u043C\u0438)</small></span><b class="money">${money(gp)}</b></div></div>
      <div class="pills"><div class="pill"><span>\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u043D\u043E</span><b class="money">${money(R.offSum)}</b></div><div class="pill"><span>\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u0439</span><b>${R.cnt.n}</b>${R.cnt.n ? `<small><span class="neg">${money(R.cnt.short)}</span> \xB7 <span class="good">+${money(R.cnt.over)}</span></small>` : ""}</div>
      ${R.noCard ? `<div class="pill wide"><span>\u26A0\uFE0F \u0411\u0435\u0437 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438</span><b>${R.noCard} \u0441\u0442\u0440\u0430\u0432</b><small class="press" data-a="skTab" data-t="cards">\u0457\u0445\u043D\u044F \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u0430 \u2014 \u0437\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u2192</small></div>` : ""}</div>`;
    const ME = { star: ["\u2B50 \u0417\u0456\u0440\u043A\u0438", "\u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456 \u0439 \u0432\u0438\u0433\u0456\u0434\u043D\u0456 \u2014 \u0442\u0440\u0438\u043C\u0430\u0439\u0442\u0435 \u044F\u043A\u0456\u0441\u0442\u044C \u0456 \u0446\u0456\u043D\u0443"], horse: ["\u{1F434} \u041A\u043E\u043D\u044F\u0447\u043A\u0438", "\u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456, \u0430\u043B\u0435 \u043C\u0430\u043B\u043E \u0437\u0430\u0440\u043E\u0431\u043B\u044F\u044E\u0442\u044C \u2014 \u043F\u0456\u0434\u043D\u0456\u043C\u0456\u0442\u044C \u0446\u0456\u043D\u0443 \u043D\u0430 5\u201310% \u0430\u0431\u043E \u0437\u0434\u0435\u0448\u0435\u0432\u0456\u0442\u044C \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443"], puzzle: ["\u2753 \u0417\u0430\u0433\u0430\u0434\u043A\u0438", "\u0432\u0438\u0433\u0456\u0434\u043D\u0456, \u0430\u043B\u0435 \u0431\u0435\u0440\u0443\u0442\u044C \u0440\u0456\u0434\u043A\u043E \u2014 \u043A\u0440\u0430\u0449\u0435 \u043C\u0456\u0441\u0446\u0435 \u0432 \u043C\u0435\u043D\u044E, \u0444\u043E\u0442\u043E, \u0445\u0430\u0439 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438 \u0440\u0430\u0434\u044F\u0442\u044C"], dog: ["\u{1F436} \u0421\u043E\u0431\u0430\u043A\u0438", "\u0456 \u043D\u0435\u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456, \u0456 \u043D\u0435\u0432\u0438\u0433\u0456\u0434\u043D\u0456 \u2014 \u043F\u0440\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0430\u0431\u043E \u043F\u0435\u0440\u0435\u0440\u043E\u0431\u0456\u0442\u044C"] };
    const me = R.rows.filter((x) => x.me), meH = me.length ? `<div class="me-g">${Object.entries(ME).map(([k, [t, tip]]) => {
      const l = me.filter((x) => x.me === k).sort((a, b) => b.q - a.q);
      return `<div class="card me me-${k}"><h3>${t} <span class="muted">\xB7 ${l.length}</span></h3><div class="muted" style="font-size:12px;margin-bottom:6px">${tip}</div>${l.slice(0, 8).map((x) => `<div class="kv"><span>${esc(x.n)}</span><span class="muted">${x.q} \u0448\u0442 \xB7 ${money(x.cm)}/\u0448\u0442</span></div>`).join("") || '<div class="muted">\u2014</div>'}</div>`;
    }).join("")}</div>` : "";
    const tbl = `<div class="card"><h3>\u{1F37D} \u041F\u0440\u0438\u0431\u0443\u0442\u043E\u043A \u043F\u043E \u0441\u0442\u0440\u0430\u0432\u0430\u0445</h3><div class="sk-tbl"><div class="th"><span>\u0421\u0442\u0440\u0430\u0432\u0430</span><span>\u041F\u0440\u043E\u0434\u0430\u043D\u043E</span><span>\u0412\u0438\u0440\u0443\u0447\u043A\u0430</span><span>\u0421\u043E\u0431\u0456\u0432./\u0448\u0442</span><span>\u041C\u0430\u0440\u0436\u0430</span><span>\u0424\u0443\u0434\u043A\u043E\u0441\u0442</span></div>
      ${R.rows.slice(0, 120).map((x) => `<div class="tr"><span>${esc(x.n)}${x.rec && x.fc > tgt ? `<br><small class="warn">\u0440\u0435\u043A\u043E\u043C. \u0446\u0456\u043D\u0430 ${money(x.rec)}</small>` : ""}</span><span>${x.q}</span><span class="money">${money(x.rev)}</span><span class="money">${x.unit == null ? "\u2014" : money(x.unit)}</span><span class="money">${x.cm == null ? "\u2014" : money(x.cm * x.q)}</span><b class="${cls(x.fc)}">${x.fc == null ? "\u2014" : x.fc + "%"}</b></div>`).join("")}</div></div>`;
    const off = R.off.length ? `<div class="grid2"><div class="card"><h3>\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u043D\u043D\u044F \u0437\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430\u043C\u0438</h3>${R.off.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join("")}</div><div class="card"><h3>\u0429\u043E \u0441\u043F\u0438\u0441\u0443\u0454\u043C\u043E \u043D\u0430\u0439\u0431\u0456\u043B\u044C\u0448\u0435</h3>${R.offIng.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join("")}</div></div>` : "";
    return head + kpis + meH + tbl + off;
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || !/^sk/.test(el.dataset.a)) return;
    const a = el.dataset.a, K = S.sk;
    switch (a) {
      case "skTab":
        K.tab = el.dataset.t;
        K.q2 = "";
        K.card = null;
        if (S.view !== "calc") {
          S.view = "calc";
          renderNav();
        }
        renderMain();
        loadView();
        $("#main").scrollTop = 0;
        break;
      case "skWh":
        K.wh = el.dataset.w;
        renderMain();
        break;
      case "skIng":
        skIngEdit(el.dataset.id);
        break;
      case "skAdd":
        skQty("add", el.dataset.id);
        break;
      case "skOff":
        skQty("off", el.dataset.id);
        break;
      case "skMv":
        skQty("mv", el.dataset.id);
        break;
      case "skReason": {
        const i = $("#aN");
        if (i) i.value = el.dataset.r;
        break;
      }
      case "skOffPick": {
        const id = await skPick("\u{1F5D1} \u0429\u043E \u0441\u043F\u0438\u0441\u0430\u0442\u0438?");
        if (id) skQty("off", id);
        break;
      }
      case "skJr":
        skJournal();
        break;
      case "skShare":
        skShare(el.dataset.g);
        break;
      case "skHand":
        if (!S.data.skInv) S.data.skInv = await api("skInvList").catch(() => null);
        K.draft = { sup: "", no: "", date: "", total: 0, src: "hand", lines: [{ id: null, n: "", q: "", f: 1, sum: "" }] };
        renderMain();
        break;
      case "skScan":
        skScan();
        break;
      case "skCam":
        skCam();
        break;
      case "skBcBind": {
        const c = el.dataset.c;
        if (!isAdmin()) {
          toast("\u041F\u0440\u0438\u0432\u02BC\u044F\u0437\u0430\u0442\u0438 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u043C\u043E\u0436\u0435 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440");
          break;
        }
        camStop == null ? void 0 : camStop();
        camStop = null;
        modalResolve == null ? void 0 : modalResolve("ok");
        await new Promise((z) => setTimeout(z, 50));
        const id = await skPick(`\u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434 ${c} \u2014 \u044F\u043A\u0438\u0439 \u0446\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442?`);
        if (!id) break;
        const x = S.data.sk.ing.find((y) => y.id === id);
        const r = await act("skIngSave", { x: __spreadProps(__spreadValues({}, x), { bc: [...x.bc || [], c] }) }, "\u{1F517} \u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u043F\u0440\u0438\u0432\u02BC\u044F\u0437\u0430\u043D\u043E");
        if (r) {
          Object.assign(x, r.x);
          skDraftAdd(x);
          renderMain();
        }
        break;
      }
      case "skDlPick":
      case "skClPick": {
        const dl = a === "skDlPick", i = +el.dataset.i, l = dl ? K.draft.lines[i] : K.card.items[i];
        if (!l) break;
        const id = await skPick(dl && l.n ? `\u0429\u043E \u0446\u0435: \xAB${l.n}\xBB?` : "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442", () => true, true);
        if (!id) break;
        if (id === "__new") {
          const nw = await skNewIng(l.n || "", l.u || "\u043A\u0433", "k");
          if (nw) {
            l.add = nw;
            l.id = null;
          }
        } else {
          l.id = id;
          delete l.add;
          const x = S.data.sk.ing.find((y) => y.id === id);
          if (dl) {
            l.ok = "ok";
            l.f = skAutoF(l);
          } else if (x && l.loss == null && x.loss) l.loss = x.loss;
        }
        renderMain();
        break;
      }
      case "skDlCand": {
        const l = K.draft.lines[+el.dataset.i];
        if (!l) break;
        const id = el.dataset.id;
        if (id === "__new") {
          const nw = await skNewIng(l.p || l.n || "", l.pu || l.u || "\u043A\u0433", l.bar ? "b" : "k");
          if (!nw) break;
          l.add = nw;
          l.id = null;
        } else {
          l.id = id;
          delete l.add;
          l.f = skAutoF(l);
        }
        l.ok = "ok";
        delete l.c;
        renderMain();
        break;
      }
      case "skDlDel":
        K.draft.lines.splice(+el.dataset.i, 1);
        renderMain();
        break;
      case "skDlAdd":
        K.draft.lines.push({ id: null, n: "", q: "", f: 1, sum: "" });
        renderMain();
        break;
      case "skDraftX":
        if (await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443?", "\u0412\u043D\u0435\u0441\u0435\u043D\u0435 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u044C\u0441\u044F")) {
          K.draft = null;
          renderMain();
          loadView();
        }
        break;
      case "skDraftSave":
        skDraftSave(el.dataset.p);
        break;
      case "skInvView":
        skInvView(el.dataset.id);
        break;
      case "skInvPay": {
        const src = await choose("\u{1F4B8} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443", "\u0417\u0432\u0456\u0434\u043A\u0438 \u043E\u043F\u043B\u0430\u0442\u0438\u043B\u0438? \u0421\u0443\u043C\u0430 \u0441\u0442\u0430\u043D\u0435 \u0432\u0438\u0442\u0440\u0430\u0442\u043E\u044E \u0432 \xAB\u041A\u0430\u0441\u0456\xBB.", [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438", val: "cash", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u043A\u0438", val: "card", cls: "primary" }]);
        if (src && await act("skInvPay", { id: el.dataset.id, src }, "\u{1F4B8} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E")) loadView();
        break;
      }
      case "skInvDel": {
        const back = !!el.dataset.b;
        if (!back && !await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443?", "\u0422\u043E\u0432\u0430\u0440 \u0437\u043D\u0438\u043A\u043D\u0435 \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443, \u043E\u043F\u043B\u0430\u0442\u0430 \u2014 \u0437 \u0432\u0438\u0442\u0440\u0430\u0442. \u041C\u043E\u0436\u043D\u0430 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u21A9\uFE0F.")) break;
        if (await act("skInvDel", { id: el.dataset.id, back }, back ? "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E" : "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) {
          S.data.sk = null;
          loadView();
        }
        break;
      }
      case "skFlt":
        K.flt = el.dataset.fl;
        renderMain();
        break;
      case "skCard":
        skCardOpen(el.dataset.k);
        break;
      case "skCardSemi":
        skCardOpen("semi:" + el.dataset.id);
        break;
      case "skCardX":
        K.card = null;
        renderMain();
        loadView();
        break;
      case "skClAdd":
        K.card.items.push({ id: null, q: 0 });
        renderMain();
        break;
      case "skClDel":
        K.card.items.splice(+el.dataset.i, 1);
        renderMain();
        break;
      case "skCardSave":
        skCardSave(false);
        break;
      case "skCardDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443?", "\u0421\u0442\u0440\u0430\u0432\u0430 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435 \u0441\u043F\u0438\u0441\u0443\u0432\u0430\u0442\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438")) {
          if (await act("skCardSave", { key: K.card.key, name: K.card.name, card: null }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) {
            K.card = null;
            loadView();
          }
        }
        break;
      case "skCardAi":
        skCardAi();
        break;
      case "skAiAll":
        skAiAll();
        break;
      case "skSemiNew": {
        const x = await skIngEdit(null, { semi: 1, cat: "\u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438", u: "\u043B" });
        if (x) skCardOpen("semi:" + x.id);
        break;
      }
      case "skProd":
        skProduce(el.dataset.id);
        break;
      case "skCwh":
        K.cwh = el.dataset.w;
        K.cf = {};
        S.data.skCount = null;
        renderMain();
        loadView();
        break;
      case "skCntFin":
        skCntFinish();
        break;
      case "skCntView": {
        const r = await act("skCountDoc", { id: el.dataset.id });
        if (r) skCntShow(r.doc);
        break;
      }
      case "skP":
        K.p = el.dataset.p;
        S.data.skRep = null;
        renderMain();
        loadView();
        break;
      case "skTechAll":
        skTechAll();
        break;
      case "skKStock": {
        const v = await choose("\u{1F4E6} \u0421\u043A\u043B\u0430\u0434", "", [{ label: "\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u0442\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", val: "off", cls: "primary" }, { label: "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F", val: "cnt" }, { label: "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438", val: "tech" }]);
        if (v === "off") {
          const id = await skPick("\u{1F5D1} \u0429\u043E \u0441\u043F\u0438\u0441\u0430\u0442\u0438?");
          if (id) skQty("off", id);
        } else if (v === "tech") skTechAll();
        else if (v === "cnt") {
          K.tab = "count";
          K.card = null;
          S.view = "calc";
          renderNav();
          renderMain();
          loadView();
        }
        break;
      }
      case "skTechOne":
        skTechOne(el.dataset.n);
        break;
    }
  });
  async function loadPay() {
    S.zpM || (S.zpM = curMon());
    S.data.zp = await api("zpGrid", { m: S.zpM }, 2e4);
  }
  function teamHTML() {
    return `<div class="rhead"><div><h1>\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B</h1><span class="muted">\u0433\u0440\u0430\u0444\u0456\u043A \u0437\u043C\u0456\u043D, \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430, \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438</span></div></div>${payHTML()}`;
  }
  function payHTML() {
    const G = S.data.zp;
    if (!G) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const people = G.staff.filter((s) => {
      var _a2, _b;
      return s.role !== "courier" && !(G.hide || []).includes(s.name) && (((_a2 = s.pay) == null ? void 0 : _a2.rate) || ((_b = s.pay) == null ? void 0 : _b.pct) || (G.seen || []).includes(s.name) || G.days.some((d) => {
        var _a3, _b2;
        return ((_a3 = G.att[d]) == null ? void 0 : _a3[s.name]) || ((_b2 = G.plan[d]) == null ? void 0 : _b2[s.name]);
      }));
    }).map((s) => s.name);
    const rows = G.rows.filter((r) => people.includes(r.n) || r.paid || r.adv || r.bonus || r.fine), due = rows.reduce((a, r) => a + Math.max(0, r.due), 0), pend = rows.reduce((a, r) => a + r.pending, 0);
    const tab = S.zpTab || "grid", TABS2 = [["grid", "\u{1F4C5} \u0413\u0440\u0430\u0444\u0456\u043A"], ["pay", "\u{1F4B0} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430"], ["ops", "\u{1F9FE} \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457"], ["eff", "\u{1F4CA} \u0415\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u0456\u0441\u0442\u044C"], ["plan", "\u{1F4CB} \u041F\u043B\u0430\u043D"], ["people", "\u{1F465} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438"], ["ideas", "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F"]];
    const top = `<div class="zp-top"><button class="btn sm" data-a="zpM" data-d="-1">\u25C0</button><b>${monName(G.m)}</b><button class="btn sm" data-a="zpM" data-d="1">\u25B6</button></div>
      <div class="kpis"><div class="kpi accent"><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(due)}</b></div><div class="kpi"><span>\u0424\u043E\u043D\u0434 \u043E\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(G.fund)}</b><small class="muted">${G.fundPct}% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</small></div>
        <div class="kpi"><span>\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u043C\u0456\u0441\u044F\u0446\u044F</span><b class="money">${money(G.revenue)}</b></div><div class="kpi ${pend ? "red press" : ""}"${pend ? ' data-a="zpPend"' : ""}><span>\u0427\u0435\u043A\u0430\u0454 \u2705</span><b>${pend}</b><small class="muted">${pend ? "\u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C, \u0449\u043E\u0431 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438" : "\u0443\u0441\u0435 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E"}</small></div></div>
      <div class="seg rsec">${TABS2.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-a="zpTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    let body = "";
    if (tab === "grid") {
      const sw2 = (G.swaps || []).map((s) => `<div class="kv"><span>\u{1F501} ${s.day.slice(8)}.${s.day.slice(5, 7)}: <b>${esc(s.from)}</b> \u2192 <b>${esc(s.to)}</b> <span class="muted">${s.st === "ask" ? "\xB7 \u0447\u0435\u043A\u0430\u0454 \u0437\u0433\u043E\u0434\u0438 \u043A\u043E\u043B\u0435\u0433\u0438" : "\xB7 \u043A\u043E\u043B\u0435\u0433\u0430 \u043F\u043E\u0433\u043E\u0434\u0438\u0432\u0441\u044F"}</span></span><span class="kv-r">${s.st === "agreed" ? `<button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="ok">\u2705</button>` : ""}<button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">\u274C</button></span></div>`).join("");
      body = `<div class="card">${gridHTML(G, people, true)}<div class="zp-leg muted">\u0422\u0430\u043F: \u043C\u0430\u0439\u0431\u0443\u0442\u043D\u0454 \u2014 \u25CF \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E, \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0439 \u0440\u0430\u043D\u0456\u0448\u0435 \u2014 \u2705 \u0431\u0443\u0432; \u0449\u0435 \u0440\u0430\u0437 \u2014 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \xB7 \u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B \xB7 \u26A0\uFE0F \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E</div>
        <div class="btnrow"><button class="btn sm primary" data-a="zpAddP">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u0433\u0440\u0430\u0444\u0456\u043A</button><button class="btn sm" data-a="zpCopy">\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u043C\u0438\u043D\u0443\u043B\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C</button></div></div>${sw2 ? `<div class="card"><h3>\u{1F501} \u041E\u0431\u043C\u0456\u043D\u0438 \u0437\u043C\u0456\u043D\u0430\u043C\u0438</h3>${sw2}</div>` : ""}`;
    } else if (tab === "pay") {
      const role = (r) => r.role === "cook" ? "\u043A\u0443\u0445\u0430\u0440" : r.role === "admin" ? "\u0430\u0434\u043C\u0456\u043D" : r.role === "courier" ? "\u043A\u0443\u0440'\u0454\u0440" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442";
      const cond = (p) => !p.rate && !p.pct ? '<span class="warn">\u0441\u0442\u0430\u0432\u043A\u0443 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E</span>' : `${p.rate ? money(p.rate) + "/\u0437\u043C\u0456\u043D\u0430" : ""}${p.pct ? ` \xB7 ${p.pct}% ${{ all: "\u0432\u0438\u0440\u0443\u0447\u043A\u0438", own: "\u0441\u0432\u043E\u0457\u0445 \u0447\u0435\u043A\u0456\u0432", kitchen: "\u043A\u0443\u0445\u043D\u0456" }[p.base || "all"]}` : ""}${p.dayRev || p.monRev ? " \xB7 \u{1F3AF}" : ""}`;
      body = `<div class="card zp-pay"><div class="zp-pr th"><span>\u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A</span><span>\u0417\u043C\u0456\u043D</span><span>\u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E</span><span>\u0412\u0438\u0434\u0430\u043D\u043E</span><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><span></span></div>
        ${rows.map((r) => {
        const open2 = S.zpOpen === r.n, ln = (l, v, c = "") => `<div class="kv ${c}"><span>${l}</span><b class="money">${v}</b></div>`;
        return `<div class="zp-pr press" data-a="zpRow" data-n="${esc(r.n)}"><span><b>${esc(r.n)}</b><small class="muted">${role(r)} \xB7 ${cond(r.pay || {})}</small></span><span>${r.shifts}${r.pending ? `<small class="warn">+${r.pending}\u{1F553}</small>` : ""}</span><span class="money">${money(r.earned)}</span><span class="money muted">${r.adv + r.paid ? money(r.adv + r.paid) : "\u2014"}</span><b class="money ${r.due > 0 ? "acc" : ""}">${money(r.due)}</b>
            <span class="zp-act">${r.due > 0 ? `<button class="btn sm primary" data-a="zpPay" data-n="${esc(r.n)}" data-v="${r.due}">\u{1F4B8}</button>` : ""}<i>${open2 ? "\u25B4" : "\u25BE"}</i></span></div>
            ${open2 ? `<div class="zp-det"><div class="zp-det-l">${ln(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${r.shifts} \u0437\u043C\u0456\u043D${r.hours ? ` (${r.hours} \u0433\u043E\u0434)` : ""}`, money(r.rate))}${r.pct ? ln(`% \u0432\u0456\u0434 ${money(r.baseSum)}`, money(r.pct)) : ""}${r.dlv ? ln(`\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \xD7 ${r.dlvN}`, money(r.dlv)) : ""}${r.dayB || r.monB ? ln("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(r.dayB + r.monB)) : ""}${r.bonus ? ln("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(r.bonus), "good") : ""}${r.fine ? ln("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(r.fine), "bad") : ""}${r.adv ? ln("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(r.adv)) : ""}${r.paid ? ln("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(r.paid)) : ""}
              ${r.toMon ? `<div class="muted" style="font-size:12px">\u{1F3AF} \u0434\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(r.toMon)}</div>` : ""}${r.tips ? `<div class="muted" style="font-size:12px">\u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 \u043E\u043A\u0440\u0435\u043C\u043E: ${money(r.tips)}</div>` : ""}${r.late || r.absent ? `<div class="warn" style="font-size:12px">${r.late ? `\u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u044C ${r.late}` : ""}${r.late && r.absent ? " \xB7 " : ""}${r.absent ? `\u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B\u0456\u0432 ${r.absent}` : ""}</div>` : ""}</div>
              <div class="zp-det-b"><button class="btn sm" data-a="zpOpN" data-t="bonus" data-n="${esc(r.n)}">\u2795 \u041F\u0440\u0435\u043C\u0456\u044F</button><button class="btn sm" data-a="zpOpN" data-t="fine" data-n="${esc(r.n)}">\u2796 \u0428\u0442\u0440\u0430\u0444</button><button class="btn sm" data-a="zpOpN" data-t="adv" data-n="${esc(r.n)}">\u{1F4B5} \u0410\u0432\u0430\u043D\u0441</button><button class="btn sm" data-a="zpSet" data-id="${r.id}">\u2699\uFE0F \u0421\u0442\u0430\u0432\u043A\u0430</button></div></div>` : ""}`;
      }).join("") || '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0456\u0432 \u0443 \u0433\u0440\u0430\u0444\u0456\u043A\u0443</div>'}
        <div class="muted" style="font-size:12px;margin-top:8px">\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0440\u044F\u0434\u043E\u043A \u2014 \u0434\u0435\u0442\u0430\u043B\u0456, \u043F\u0440\u0435\u043C\u0456\u044F, \u0448\u0442\u0440\u0430\u0444, \u0430\u0432\u0430\u043D\u0441, \u0441\u0442\u0430\u0432\u043A\u0430. \u{1F4B8} \u2014 \u0432\u0438\u0434\u0430\u0442\u0438 \u0432\u0435\u0441\u044C \u0437\u0430\u043B\u0438\u0448\u043E\u043A (\u0437 \u043A\u0430\u0441\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438).</div></div>`;
    } else if (tab === "plan") {
      body = tkAdminHTML();
    } else if (tab === "ideas") {
      const l = S.data.ideas;
      if (!l) ideasLoad();
      body = `<div class="card"><h3>\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443 \u0449\u043E\u0434\u043E \u0441\u0438\u0441\u0442\u0435\u043C\u0438</h3><div class="muted set-note">\u041F\u0438\u0448\u0443\u0442\u044C \u0437 \u043E\u0441\u043E\u0431\u0438\u0441\u0442\u043E\u0433\u043E \u043A\u0430\u0431\u0456\u043D\u0435\u0442\u0443 (\u{1F464} \u2192 \xAB\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F\xBB) \u0430\u0431\u043E \u0432 \u0431\u043E\u0442\u0456: <code>\u043F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u0442\u0435\u043A\u0441\u0442</code>. \u2705 \u2014 \u0437\u0440\u043E\u0431\u043B\u0435\u043D\u043E, \u{1F5D1} \u2014 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438.</div>${!l ? '<div class="muted">\u2026</div>' : l.length ? l.map(ideaRow).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}</div>`;
    } else if (tab === "people") {
      body = settingsHTML("people");
    } else if (tab === "ops") {
      const OPN = { bonus: "\u2795 \u041F\u0440\u0435\u043C\u0456\u044F", fine: "\u2796 \u0428\u0442\u0440\u0430\u0444", adv: "\u{1F4B5} \u0410\u0432\u0430\u043D\u0441", paid: "\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0442\u0430" };
      body = `<div class="card">${G.ops.map((o) => `<div class="kv rrow${o.del ? " del" : ""}"><span>${o.day.slice(8)}.${o.day.slice(5, 7)} ${OPN[o.t]} \xB7 <b>${esc(o.n)}</b>${o.src ? o.src === "card" ? " \u{1F4B3}" : " \u{1F4B5}" : ""}${o.note ? ` <span class="muted">\xB7 ${esc(o.note)}</span>` : ""}<br><small class="muted">${esc(o.by || "")}</small></span><span class="kv-r"><b class="money">${money(o.sum)}</b><button class="xb" data-a="zpOpDel" data-id="${o.id}" data-b="${o.del ? 1 : ""}">${o.del ? "\u21A9\uFE0F" : "\u{1F5D1}"}</button></span></div>`).join("") || '<div class="muted">\u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0439 \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F \u0449\u0435 \u043D\u0435 \u0431\u0443\u043B\u043E</div>'}</div>`;
    } else {
      const l = rows.filter((r) => r.shifts).sort((a, b) => b.revPerShift - a.revPerShift), mx = Math.max(1, ...l.map((r) => r.revPerShift));
      body = `<div class="card"><h3>\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430\u043A\u043B\u0430\u0434\u0443 \u0432 \u0434\u043D\u0456, \u043A\u043E\u043B\u0438 \u043B\u044E\u0434\u0438\u043D\u0430 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456</h3>${l.map((r) => `<div class="bar"><div class="bl"><span>${esc(r.n)}<br><small class="muted">${r.shifts} \u0437\u043C\u0456\u043D${r.hours ? ` \xB7 ${r.hours} \u0433\u043E\u0434` : ""}${r.revPerHour ? ` \xB7 ${money(r.revPerHour)}/\u0433\u043E\u0434` : ""}</small></span><b class="money">${money(r.revPerShift)}</b></div><i style="width:${Math.max(3, r.revPerShift / mx * 100)}%"></i></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u0438\u0445 \u0437\u043C\u0456\u043D</div>'}</div>`;
    }
    return top + `<div class="zp-body">${body}</div>`;
  }
  function gridHTML(G, people, edit, me) {
    const today = todayK();
    return `<div class="zp-grid"><table><thead><tr><th></th>${G.days.map((d) => {
      const w = (/* @__PURE__ */ new Date(d + "T12:00:00Z")).getUTCDay();
      return `<th class="${d === today ? "td" : ""}${w === 0 || w === 6 ? " we" : ""}">${+d.slice(8)}<small>${WDL[w]}</small></th>`;
    }).join("")}</tr></thead>
      <tbody>${people.map((n) => `<tr class="${n === me ? "me" : ""}"><th>${edit ? `<button class="zp-x" data-a="zpDelP" data-n="${esc(n)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0437 \u0433\u0440\u0430\u0444\u0456\u043A\u0430">\u2715</button>` : ""}${esc(n)}</th>${G.days.map((d) => {
      var _a2, _b;
      const a = (_a2 = G.att[d]) == null ? void 0 : _a2[n], p = (_b = G.plan[d]) == null ? void 0 : _b[n], h = hrs(a);
      return `<td class="${edit ? "press" : ""}${d === today ? " td" : ""}"${edit ? ` data-a="zpCell" data-d="${d}" data-n="${esc(n)}"` : ""}><i>${attIc(a, p, d)}</i>${p ? p === "+" ? a ? "" : '<i class="pl">\u25CF</i>' : `<small>${p}</small>` : ""}${h ? `<small class="h">${h}\u0433</small>` : ""}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  async function zpPend() {
    var _a2;
    const G = S.data.zp, fine = (_a2 = G.cfg) == null ? void 0 : _a2.lateFine, L = [];
    for (const d of G.days) for (const [n, a] of Object.entries(G.att[d] || {})) if ((a == null ? void 0 : a.ok) === 0) L.push({ d, n, a });
    if (!L.length) return toast("\u2705 \u0423\u0441\u0435 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E");
    const body = `<div class="zp-pend">${L.map(({ d, n, a }) => `<div class="kv"><span><b>${esc(n)}</b><br><small class="muted">${d.slice(8)}.${d.slice(5, 7)}${a.in ? ` \xB7 \u043F\u0440\u0438\u0439\u0448\u043E\u0432 ${hhK(a.in)}` : ""}${a.out ? `\u2013${hhK(a.out)}` : ""}${a.late ? ` \xB7 \u23F0 ${a.late} \u0445\u0432` : ""}</small></span><span class="kv-r"><button class="btn sm green" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="o">\u2705</button>${a.late && fine ? `<button class="btn sm" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="f">\u2705 + ${fine} \u20B4</button>` : ""}<button class="btn sm red" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="n">\u274C</button></span></div>`).join("")}</div>`;
    const v = await modal({ title: `\u{1F553} \u0427\u0435\u043A\u0430\u044E\u0442\u044C \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F \xB7 ${L.length}`, body, buttons: [{ label: `\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u0432\u0441\u0456\u0445 (${L.length})`, val: "all", cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (v === "all") {
      for (const x of L) await act("zpAtt", { day: x.d, n: x.n, how: "o" });
      toast("\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E");
      loadState().catch(() => {
      });
      loadView();
    }
  }
  async function zpCell(d, n) {
    var _a2, _b, _c, _d;
    const G = S.data.zp, a = (_a2 = G.att[d]) == null ? void 0 : _a2[n], p = (_b = G.plan[d]) == null ? void 0 : _b[n], fine = (_c = G.cfg) == null ? void 0 : _c.lateFine;
    const upd = (x) => {
      var _a3;
      (_a3 = G.att)[d] || (_a3[d] = {});
      if (x) G.att[d][n] = x;
      else delete G.att[d][n];
      renderMain();
    };
    if (d > todayK()) {
      (_d = G.plan)[d] || (_d[d] = {});
      if (p) delete G.plan[d][n];
      else G.plan[d][n] = "+";
      renderMain();
      if (!await act("zpPlan", { day: d, n, time: p ? "" : "+" })) loadView();
      return;
    }
    if ((a == null ? void 0 : a.ok) === 1) {
      upd(null);
      if (!await act("zpAtt", { day: d, n, set: "del" })) loadView();
      else loadView(true);
      return;
    }
    upd(__spreadProps(__spreadValues({}, a || {}), { ok: 1 }));
    if (!await act("zpAtt", (a == null ? void 0 : a.ok) === 0 ? { day: d, n, how: "o" } : { day: d, n, set: "o" })) loadView();
    else loadView(true);
    return;
    const info = `${d.slice(8)}.${d.slice(5, 7)} \xB7 ${n}${p && p !== "+" ? ` \xB7 \u043F\u043B\u0430\u043D ${p}` : ""}${(a == null ? void 0 : a.in) ? ` \xB7 \u043F\u0440\u0438\u0439\u0448\u043E\u0432 ${hhK(a.in)}` : ""}${(a == null ? void 0 : a.out) ? ` \xB7 \u043F\u0456\u0448\u043E\u0432 ${hhK(a.out)}${a.auto ? " (\u0430\u0432\u0442\u043E)" : ""}` : ""}${(a == null ? void 0 : a.late) ? ` \xB7 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F ${a.late} \u0445\u0432` : ""}${(a == null ? void 0 : a.by) ? ` \xB7 \u2714 ${a.by}` : ""}`;
    const opts = (a == null ? void 0 : a.ok) === 0 ? [{ label: "\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438", val: "o", cls: "primary" }, ...a.late && fine ? [{ label: `\u2705 + \u0448\u0442\u0440\u0430\u0444 ${fine} \u20B4`, val: "f" }] : [], { label: "\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438", val: "n", cls: "red" }] : [(a == null ? void 0 : a.ok) === 1 ? { label: "\u274C \u041D\u0435 \u0431\u0443\u0432 (\u0437\u043D\u044F\u0442\u0438)", val: "del", cls: "red" } : { label: "\u2705 \u0411\u0443\u0432 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456", val: "set", cls: "primary" }, { label: p && p !== "+" ? `\u{1F550} \u0427\u0430\u0441 \u043F\u043E\u0447\u0430\u0442\u043A\u0443 (${p})` : "\u{1F550} \u0412\u043A\u0430\u0437\u0430\u0442\u0438 \u0447\u0430\u0441 \u043F\u043E\u0447\u0430\u0442\u043A\u0443", val: "plan" }, ...p ? [{ label: "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0437 \u043F\u043B\u0430\u043D\u0443", val: "unplan" }] : []];
    const v = await choose("\u{1F477} \u0417\u043C\u0456\u043D\u0430", info, opts);
    if (!v) return;
    if (v === "plan") {
      const t = await ask(`\u{1F4C5} ${n}, ${d.slice(8)}.${d.slice(5, 7)}: \u043E \u043A\u043E\u0442\u0440\u0456\u0439 \u043F\u043E\u0447\u0430\u0442\u043E\u043A?`, "\u043D\u0430\u043F\u0440. 10:00");
      if (!t) return;
      if (!/^\d{1,2}:\d{2}$/.test(t.trim())) return toast("\u26A0\uFE0F \u0424\u043E\u0440\u043C\u0430\u0442 \u0447\u0430\u0441\u0443: 10:00");
      await act("zpPlan", { day: d, n, time: t.trim() }, "\u{1F4C5} \u0417\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E");
    } else if (v === "unplan") await act("zpPlan", { day: d, n, time: "" }, "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
    else await act("zpAtt", ["o", "f", "n"].includes(v) ? { day: d, n, how: v } : { day: d, n, set: v === "del" ? "del" : "o" }, "\u2714 \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    loadView();
  }
  async function zpSet(id) {
    var _a2;
    const s = S.data.zp.staff.find((x) => x.id === id), p = (s == null ? void 0 : s.pay) || {};
    if (!s) return;
    const body = `<div class="form"><div class="frow"><label>\u0421\u0442\u0430\u0432\u043A\u0430 \u0437\u0430 \u0437\u043C\u0456\u043D\u0443, \u20B4<input id="zR" inputmode="numeric" value="${p.rate || ""}" placeholder="\u043D\u0430\u043F\u0440. 600"></label><label>% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438<input id="zP" inputmode="decimal" value="${p.pct || ""}" placeholder="\u043D\u0430\u043F\u0440. 2"></label></div>
      <label>\u0412\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434<select id="zB"><option value="all" ${p.base !== "own" && p.base !== "kitchen" ? "selected" : ""}>\u0443\u0441\u0456\u0454\u0457 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0434\u043D\u044F (\u0437\u0430 \u0434\u043D\u0456 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456)</option><option value="own" ${p.base === "own" ? "selected" : ""}>\u0441\u0432\u043E\u0457\u0445 \u0447\u0435\u043A\u0456\u0432 (\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u0441\u0442\u043E\u043B\u0430)</option><option value="kitchen" ${p.base === "kitchen" ? "selected" : ""}>\u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u043A\u0443\u0445\u043D\u0456</option></select></label>
      <div class="muted" style="font-size:12px">\u{1F3AF} \u041F\u043B\u0430\u043D \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 (\u0432\u0456\u0434 \u0442\u0456\u0454\u0457 \u0436 \u0431\u0430\u0437\u0438) \u2014 \u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E:</div>
      <div class="frow"><label>\u0417\u0430 \u0437\u043C\u0456\u043D\u0443 \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zDR" inputmode="numeric" value="${p.dayRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zDB" inputmode="numeric" value="${p.dayBonus || ""}"></label></div>
      <div class="frow"><label>\u0417\u0430 \u043C\u0456\u0441\u044F\u0446\u044C \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zMR" inputmode="numeric" value="${p.monRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zMB" inputmode="numeric" value="${p.monBonus || ""}"></label></div>
      <label>\u{1F6F5} \u0417\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443, \u20B4 (\u043A\u0443\u0440'\u0454\u0440\u0443; \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u044F\u043A \u0443 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u0445)<input id="zDl" inputmode="numeric" value="${(_a2 = p.dlv) != null ? _a2 : ""}"></label></div>`;
    const v = await modal({ title: `\u2699\uFE0F ${s.name}: \u0441\u0442\u0430\u0432\u043A\u0430`, body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const g = (i) => $("#" + i).value.replace(",", "."), pay = v === "ok" ? { rate: g("zR"), pct: g("zP"), base: $("#zB").value, dayRev: g("zDR"), dayBonus: g("zDB"), monRev: g("zMR"), monBonus: g("zMB"), dlv: $("#zDl").value.trim() } : null;
    closeModal();
    if (pay && await act("zpStaff", { id, pay }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) loadView();
  }
  async function zpOpN(t, n, preset) {
    const T = { bonus: "\u2795 \u041F\u0440\u0435\u043C\u0456\u044F", fine: "\u2796 \u0428\u0442\u0440\u0430\u0444", adv: "\u{1F4B5} \u0410\u0432\u0430\u043D\u0441", paid: "\u{1F4B8} \u0412\u0438\u0434\u0430\u0442\u0438 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0443" }[t], money_ = t === "adv" || t === "paid";
    const body = `<div class="form"><label>\u0421\u0443\u043C\u0430, \u20B4<input id="oS" inputmode="numeric" value="${preset || ""}"></label><input id="oN" placeholder="${t === "fine" ? "\u0417\u0430 \u0449\u043E (\u043D\u0430\u043F\u0440. \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F)" : "\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440"}"></div>`;
    const v = await modal({ title: `${T} \xB7 ${n}`, body, buttons: money_ ? [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438", val: "cash", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u043A\u0438", val: "card", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] : [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const sum = v ? +$("#oS").value.replace(",", ".") : 0, note = v ? $("#oN").value.trim() : "";
    closeModal();
    if (!v) return;
    if (!(sum > 0)) return toast("\u26A0\uFE0F \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0441\u0443\u043C\u0443");
    if (await act("zpOp", __spreadValues({ n, t, sum, note }, money_ ? { src: v } : {}), money_ ? `\u{1F4B8} \u0412\u0438\u0434\u0430\u043D\u043E ${money(sum)} ${v === "card" ? "\u0437 \u043A\u0430\u0440\u0442\u043A\u0438" : "\u0437 \u043A\u0430\u0441\u0438"}` : "\u2714 \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E")) loadView();
  }
  const ideaRow = (x) => `<div class="kv idea" data-idea="${x.id}"><span style="min-width:0;overflow-wrap:anywhere">${x.done ? "\u2705 " : ""}${esc(x.text)}<br><small class="muted">${esc(x.by)} \xB7 ${new Date(x.at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}</small></span><span class="kv-r">${isAdmin() ? `<button class="btn sm" data-a="ideaDone" data-id="${x.id}">${x.done ? "\u21A9\uFE0F" : "\u2705"}</button>` : ""}<button class="btn sm red" data-a="ideaDel" data-id="${x.id}">\u{1F5D1}</button></span></div>`;
  async function ideasLoad() {
    if (S._idL) return;
    S._idL = 1;
    try {
      S.data.ideas = (await api("ideaList")).list;
    } catch (e) {
      S.data.ideas = [];
    }
    S._idL = 0;
    if (S.view === "team") renderMain();
  }
  async function helpAsk() {
    const text = await ask("\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430 \u2014 \u0449\u043E \u0441\u0442\u0430\u043B\u043E\u0441\u044C?", "\u041D\u0430\u043F\u0440.: \u043D\u0435 \u0434\u0440\u0443\u043A\u0443\u0454 \u0447\u0435\u043A, \u043D\u0435 \u043C\u043E\u0436\u0443 \u0434\u043E\u0434\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443");
    if (!text) return;
    await act("help", { text, screen: S.view + (S.setTab ? "/" + S.setTab : "") }, "\u{1F198} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E \u2014 \u0437 \u0432\u0430\u043C\u0438 \u0437\u0432'\u044F\u0436\u0443\u0442\u044C\u0441\u044F");
  }
  async function ideasMy() {
    var _a2;
    const l = (_a2 = await act("ideaList", {})) == null ? void 0 : _a2.list;
    if (!l) return;
    const mine = l.filter((x) => {
      var _a3;
      return x.by === ((_a3 = S.me) == null ? void 0 : _a3.name);
    });
    const v = await modal({ title: "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u0440\u043E\u0437\u0440\u043E\u0431\u043D\u0438\u043A\u0443", body: `<div class="muted set-note">\u0429\u043E \u043D\u0435\u0437\u0440\u0443\u0447\u043D\u043E, \u0447\u043E\u0433\u043E \u043D\u0435 \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454, \u0449\u043E \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u0432 \u043A\u0430\u0441\u0456 \u0447\u0438 \u0431\u043E\u0442\u0456 \u2014 \u043D\u0430\u043F\u0438\u0448\u0456\u0442\u044C, \u0440\u043E\u0437\u0440\u043E\u0431\u043D\u0438\u043A \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \u0456 \u0432\u0440\u0430\u0445\u0443\u0454.</div>${mine.length ? mine.map(ideaRow).join("") : '<div class="muted">\u0412\u0438 \u0449\u0435 \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043F\u0438\u0441\u0430\u043B\u0438</div>'}`, buttons: [{ label: "\u270D\uFE0F \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438", val: "add", cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (v !== "add") return;
    const text = await ask("\u{1F4A1} \u0412\u0430\u0448\u0435 \u043F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F", "\u041D\u0430\u043F\u0440.: \u0437\u0440\u043E\u0431\u0438\u0442\u0438 \u043A\u043D\u043E\u043F\u043A\u0443 \u2026 \u0431\u0456\u043B\u044C\u0448\u043E\u044E");
    if (!text) return ideasMy();
    if (await act("ideaAdd", { text }, "\u{1F4A1} \u0414\u044F\u043A\u0443\u0454\u043C\u043E! \u041F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u0440\u043E\u0437\u0440\u043E\u0431\u043D\u0438\u043A\u0443")) {
      S.data.ideas = null;
      ideasMy();
    }
  }
  async function zpMy() {
    var _a2, _b, _c;
    const r = await act("zpMy", {});
    if (!r) return;
    const w = r.row, me = (_a2 = S.me) == null ? void 0 : _a2.name;
    const lnx = (l, v2) => `<div class="kv"><span>${l}</span><b class="money">${v2}</b></div>`;
    const asks = r.swaps.filter((s) => s.to === me && s.st === "ask");
    const shiftH = `<div class="zp-shift">${onShift() ? `<button class="btn red" data-a="zpOut">\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button><span class="muted">\u043D\u0430 \u0437\u043C\u0456\u043D\u0456 \u0437 ${hhK(S.myAtt.in)}${S.myAtt.ok === 0 ? " \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F" : " \xB7 \u2705"}</span>` : `<button class="btn green" data-a="zpIn">\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>${((_b = S.myAtt) == null ? void 0 : _b.out) ? `<span class="muted">\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 ${hhK(S.myAtt.in)}\u2013${hhK(S.myAtt.out)}</span>` : ""}`}</div>`;
    await loadMyTasks();
    const body = shiftH + `<div id="myTasks">${myTasksHTML()}</div>${w ? `<div class="pills zp-my"><div class="pill"><span>\u0417\u043C\u0456\u043D</span><b>${w.shifts}</b><small>${w.hours ? w.hours + " \u0433\u043E\u0434" : ""}</small></div><div class="pill"><span>\u0417\u0430\u0440\u043E\u0431\u043B\u0435\u043D\u043E</span><b class="money">${money(w.earned)}</b></div><div class="pill"><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(w.due)}</b></div><div class="pill"><span>\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456</span><b class="money">${money(((_c = S.myTip) == null ? void 0 : _c.sum) || 0)}</b><small>${w.tips ? `\u0437\u0430 \u043C\u0456\u0441\u044F\u0446\u044C ${money(w.tips)}` : "\u0449\u0435 \u043D\u0435 \u0432\u0438\u0434\u0430\u043D\u043E"}</small></div></div>
      ${lnx(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${w.shifts}`, money(w.rate))}${w.pct ? lnx("% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438", money(w.pct)) : ""}${w.dayB || w.monB ? lnx("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(w.dayB + w.monB)) : ""}${w.bonus ? lnx("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(w.bonus)) : ""}${w.fine ? lnx("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(w.fine)) : ""}${w.adv ? lnx("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(w.adv)) : ""}${w.paid ? lnx("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(w.paid)) : ""}
      ${w.toMon ? `<div class="muted" style="font-size:13px;margin-top:6px">\u{1F3AF} \u0414\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(w.toMon)}</div>` : ""}` : '<div class="muted">\u0421\u0442\u0430\u0432\u043A\u0443 \u0449\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E</div>'}
      ${asks.map((s) => `<div class="card zp-ask">\u{1F501} <b>${esc(s.from)}</b> \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u0438\u0439\u0442\u0438 \u0437\u0430 \u043D\u044C\u043E\u0433\u043E ${s.day.slice(8)}.${s.day.slice(5, 7)} \u043E ${s.time}<div class="btnrow"><button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">\u041D\u0456</button></div></div>`).join("")}
      <h3 style="margin:14px 0 6px">\u0413\u0440\u0430\u0444\u0456\u043A \xB7 ${monName(r.m)}</h3>${gridHTML(r.grid, r.grid.people, false, me)}<div class="muted" style="font-size:11px;margin-top:4px">\u2705 \u0431\u0443\u0432 \xB7 \u25CF \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \xB7 \u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B</div>
      ${r.swaps.filter((s) => s.from === me).map((s) => `<div class="muted" style="font-size:12px">\u{1F501} ${s.day.slice(8)}.${s.day.slice(5, 7)} \u2192 ${esc(s.to)}: ${s.st === "ask" ? "\u0447\u0435\u043A\u0430\u0454 \u0437\u0433\u043E\u0434\u0438" : "\u0447\u0435\u043A\u0430\u0454 \u0430\u0434\u043C\u0456\u043D\u0430"}</div>`).join("")}`;
    const v = await modal({ title: `\u{1F464} ${me}`, body, buttons: [{ label: "\u{1F501} \u041F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D", val: "swap" }, { label: "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F", val: "idea" }, { label: "\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430", val: "help" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (v === "idea") return ideasMy();
    if (v === "help") return helpAsk();
    if (v === "swap") {
      const future = r.days.filter((x) => x.plan && x.d >= todayK());
      if (!future.length) return toast("\u0423 \u0432\u0430\u0448\u043E\u043C\u0443 \u043F\u043B\u0430\u043D\u0456 \u043D\u0435\u043C\u0430\u0454 \u043C\u0430\u0439\u0431\u0443\u0442\u043D\u0456\u0445 \u0437\u043C\u0456\u043D");
      const d = await choose("\u{1F501} \u042F\u043A\u0443 \u0437\u043C\u0456\u043D\u0443 \u0432\u0456\u0434\u0434\u0430\u0442\u0438?", "", future.map((x) => ({ label: `${x.d.slice(8)}.${x.d.slice(5, 7)} ${WDL[(/* @__PURE__ */ new Date(x.d + "T12:00:00Z")).getUTCDay()]} \xB7 ${x.plan}`, val: x.d })));
      if (!d) return;
      const pl = await act("zpPeople", {});
      const to = pl && await choose("\u{1F501} \u041A\u043E\u0433\u043E \u043F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0438?", "\u041A\u043E\u043B\u0435\u0433\u0430 \u043F\u043E\u0433\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0443 \u0441\u0432\u043E\u0454\u043C\u0443 \u043A\u0430\u0431\u0456\u043D\u0435\u0442\u0456, \u043F\u043E\u0442\u0456\u043C \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0430\u0434\u043C\u0456\u043D", pl.list.map((n) => ({ label: n, val: n })));
      if (!to) return;
      await act("zpSwap", { day: d, to }, "\u{1F501} \u0417\u0430\u043F\u0438\u0442 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E");
    }
  }
  document.addEventListener("click", async (e) => {
    var _a2, _b, _c;
    const el = e.target.closest("[data-a]");
    if (!el || !/^(zp|idea)/.test(el.dataset.a)) return;
    const a = el.dataset.a, D = el.dataset;
    switch (a) {
      case "zpIn":
        closeModal();
        if (await act("zpIn", {}, "\u{1F7E2} \u0417\u043C\u0456\u043D\u0443 \u043F\u043E\u0447\u0430\u0442\u043E \u2014 \u0430\u0434\u043C\u0456\u043D \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C")) {
          await loadState().catch(() => {
          });
          renderNav();
        }
        break;
      case "zpOut":
        closeModal();
        if (await confirmBox("\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443?")) {
          if (await act("zpOut", {}, "\u{1F534} \u0417\u043C\u0456\u043D\u0443 \u0437\u0430\u043A\u0456\u043D\u0447\u0435\u043D\u043E")) {
            await loadState().catch(() => {
            });
            renderNav();
          }
        }
        break;
      case "zpMy":
        zpMy();
        break;
      case "zpHelp":
        helpAsk();
        break;
      case "ideaDel":
        if (!D.sure) {
          D.sure = 1;
          el.textContent = "\u{1F5D1} \u0422\u043E\u0447\u043D\u043E?";
          setTimeout(() => {
            if (el.isConnected) {
              delete D.sure;
              el.textContent = "\u{1F5D1}";
            }
          }, 3e3);
          break;
        }
        if (await act("ideaDel", { id: D.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) {
          (_a2 = el.closest("[data-idea]")) == null ? void 0 : _a2.remove();
          if (S.data.ideas) S.data.ideas = S.data.ideas.filter((x) => x.id !== D.id);
        }
        break;
      case "ideaDone": {
        const r = await act("ideaDone", { id: D.id });
        if (r) {
          const x = (_b = S.data.ideas) == null ? void 0 : _b.find((y) => y.id === D.id);
          if (x) x.done = r.x.done;
          const row = el.closest("[data-idea]");
          if (row && ((_c = $("#modal")) == null ? void 0 : _c.contains(row))) row.outerHTML = ideaRow(r.x);
          else renderMain();
        }
        break;
      }
      case "zpM":
        S.zpM = monAdd(S.zpM || curMon(), +D.d);
        S.data.zp = null;
        renderMain();
        loadView();
        break;
      case "zpCell":
        zpCell(D.d, D.n);
        break;
      case "zpPend":
        zpPend();
        break;
      case "zpTab":
        S.zpTab = D.t;
        renderMain();
        break;
      case "zpRow":
        if (e.target.closest("button")) break;
        S.zpOpen = S.zpOpen === D.n ? null : D.n;
        renderMain();
        break;
      case "zpAddP": {
        const G = S.data.zp, shown = new Set([...document.querySelectorAll(".zp-grid tbody th")].map((t) => t.textContent.replace("\u2715", "").trim())), l = G.staff.map((s) => s.name).filter((n2) => !shown.has(n2));
        if (!l.length) {
          toast("\u0423\u0441\u0456 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438 \u0432\u0436\u0435 \u0432 \u0433\u0440\u0430\u0444\u0456\u043A\u0443");
          break;
        }
        const n = await choose("\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u0433\u0440\u0430\u0444\u0456\u043A", monName(G.m), l.map((x) => ({ label: x, val: x })));
        if (n && await act("zpGridSet", { m: G.m, n, show: 1 }, "\u2795 \u0414\u043E\u0434\u0430\u043D\u043E")) loadView();
        break;
      }
      case "zpDelP":
        if (await confirmBox(`\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 ${D.n} \u0437 \u0433\u0440\u0430\u0444\u0456\u043A\u0430?`, "\u041B\u0438\u0448\u0435 \u0437 \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F. \u041D\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043D\u043D\u044F \u0439 \u0432\u0438\u043F\u043B\u0430\u0442\u0438 \u043D\u0435 \u0437\u043C\u0456\u043D\u044F\u0442\u044C\u0441\u044F; \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u2014 \xAB\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u0433\u0440\u0430\u0444\u0456\u043A\xBB")) {
          if (await act("zpGridSet", { m: S.data.zp.m, n: D.n, show: 0 }, "\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E")) loadView();
        }
        break;
      case "zpCopy": {
        const t = /* @__PURE__ */ new Date(todayK() + "T12:00:00Z"), mon = new Date(t);
        mon.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7);
        const to = mon.toISOString().slice(0, 10);
        mon.setUTCDate(mon.getUTCDate() - 7);
        const from = mon.toISOString().slice(0, 10);
        if (await confirmBox("\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u043F\u043B\u0430\u043D?", `\u0422\u0438\u0436\u0434\u0435\u043D\u044C \u0437 ${from.slice(8)}.${from.slice(5, 7)} \u2192 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0437 ${to.slice(8)}.${to.slice(5, 7)}`)) {
          const r = await act("zpPlanCopy", { from, to });
          if (r) {
            toast(`\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E \u0437\u043C\u0456\u043D: ${r.n}`);
            loadView();
          }
        }
        break;
      }
      case "zpSet":
        zpSet(D.id);
        break;
      case "zpPay":
        zpOpN("paid", D.n, D.v);
        break;
      case "zpOpN":
        zpOpN(D.t, D.n);
        break;
      case "zpOpDel": {
        const back = !!D.b;
        if (!back && !await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u044E?", "\u042F\u043A\u0449\u043E \u0446\u0435 \u0432\u0438\u0434\u0430\u0447\u0430 \u0433\u0440\u043E\u0448\u0435\u0439 \u2014 \u0432\u043E\u043D\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u043A\u0430\u0441\u0443 / \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443. \u041C\u043E\u0436\u043D\u0430 \u0432\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u21A9\uFE0F")) break;
        if (await act("zpOpDel", { id: D.id, back, m: S.zpM }, back ? "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E" : "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) loadView();
        break;
      }
      case "zpSw":
        if (await act("zpSwapStep", { id: D.id, step: D.s }, D.s === "no" ? "\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E" : D.s === "agree" ? "\u{1F501} \u041F\u043E\u0433\u043E\u0434\u0436\u0435\u043D\u043E \u2014 \u0447\u0435\u043A\u0430\u0454 \u0430\u0434\u043C\u0456\u043D\u0430" : "\u2705 \u041E\u0431\u043C\u0456\u043D \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E")) {
          closeModal();
          if (S.view === "settings") loadView();
        }
        break;
      case "zpConf": {
        const row = el.closest(".zp-pend .kv");
        if (await act("zpAtt", { day: D.d, n: D.n, how: D.h }, D.h === "n" ? "\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E" : "\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E")) {
          loadState().catch(() => {
          });
          if (row) {
            row.remove();
            if (!$(".zp-pend .kv")) closeModal();
          }
          if (["settings", "team"].includes(S.view)) loadView();
        }
        break;
      }
    }
  });
  const ROLES = [["admin", "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440"], ["waiter", "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"], ["cook", "\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u0430\u0440"], ["courier", "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440"]];
  document.addEventListener("click", async (e) => {
    var _a2;
    const el = e.target.closest("[data-a]");
    if (!el || !/^stf(Name|Pin|Role)$/.test(el.dataset.a)) return;
    const s = (((_a2 = S.data.staff) == null ? void 0 : _a2.staff) || []).find((x) => x.id === el.dataset.id);
    if (!s) return;
    let f = null;
    if (el.dataset.a === "stfName") {
      const v = await askVal("\u270F\uFE0F \u041D\u043E\u0432\u0435 \u0456\u043C\u02BC\u044F (\u0433\u0440\u0430\u0444\u0456\u043A, \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 \u0439 \u0447\u0430\u0439\u043E\u0432\u0456 \u043F\u0435\u0440\u0435\u0439\u0434\u0443\u0442\u044C)", s.name);
      if (v && v.trim() !== s.name) f = { name: v.trim() };
    }
    if (el.dataset.a === "stfPin") {
      const v = await ask(`\u{1F511} \u041D\u043E\u0432\u0438\u0439 PIN: ${s.name}`, "4 \u0446\u0438\u0444\u0440\u0438 \xB7 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u0432\u0438\u0439\u0434\u0435 \u0437 \u043A\u0430\u0441\u0438", "tel");
      if (v) f = { pin: String(v) };
    }
    if (el.dataset.a === "stfRole") {
      const v = await choose(`\u{1F504} \u0420\u043E\u043B\u044C: ${s.name}`, "\u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u0432\u0438\u0439\u0434\u0435 \u0437 \u043A\u0430\u0441\u0438 \u2014 \u0443\u0432\u0456\u0439\u0434\u0435 \u0437\u043D\u043E\u0432\u0443 \u0437 \u043D\u043E\u0432\u0438\u043C\u0438 \u043F\u0440\u0430\u0432\u0430\u043C\u0438", ROLES.filter(([r]) => r !== (s.role || "waiter")).map(([val, label]) => ({ label, val })));
      if (v) f = { role: v };
    }
    if (f && await act("staffEdit", __spreadValues({ id: s.id }, f), f.name ? "\u270F\uFE0F \u0406\u043C\u02BC\u044F \u0437\u043C\u0456\u043D\u0435\u043D\u043E" : f.pin ? "\u{1F511} PIN \u0437\u043C\u0456\u043D\u0435\u043D\u043E" : "\u{1F504} \u0420\u043E\u043B\u044C \u0437\u043C\u0456\u043D\u0435\u043D\u043E")) loadView();
  });
  const TK_ROLE = { admin: "\u0430\u0434\u043C\u0456\u043D\u0438", waiter: "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438", cook: "\u043A\u0443\u0445\u0430\u0440\u0456", courier: "\u043A\u0443\u0440'\u0454\u0440\u0438" }, TK_WD = ["\u043F\u043D", "\u0432\u0442", "\u0441\u0440", "\u0447\u0442", "\u043F\u0442", "\u0441\u0431", "\u043D\u0434"];
  const tkWho = (w) => !w || w.k === "a" ? "\u{1F465} \u0431\u0443\u0434\u044C-\u0445\u0442\u043E" : w.k === "r" ? "\u{1F465} " + (TK_ROLE[w.r] || w.r) : "\u{1F464} " + esc(w.n || "?");
  const tkIc = (t) => t.st === "done" ? "\u2705" : t.st === "no" ? "\u274C" : t.imp ? "\u2757" : "\u2B1C";
  const tkDm = (d) => `${d.slice(8)}.${d.slice(5, 7)}`;
  async function loadMyTasks() {
    try {
      const r = await api("taskList", { mine: 1 });
      S.myTasks = r.list;
      const n = r.list.filter((t) => !t.st).length;
      if (n !== S.taskN) {
        S.taskN = n;
        renderNav();
      }
      if ($("#myTasks")) $("#myTasks").innerHTML = myTasksHTML();
    } catch (e) {
    }
  }
  function myTasksHTML() {
    const l = S.myTasks || [];
    if (!l.length) return "";
    return `<h3 style="margin:4px 0 6px">\u{1F4CB} \u041C\u0456\u0439 \u043F\u043B\u0430\u043D \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \xB7 ${l.filter((t) => t.st === "done").length} \u0437 ${l.length}</h3>${l.map((t) => `<div class="tk-row${t.st ? " done" : ""}${t.imp && !t.st ? " imp" : ""}"><span class="tk-n">${tkIc(t)} ${t.tm ? `<b>${t.tm}</b> \xB7 ` : ""}${esc(t.n)}${t.photo && !t.st ? " \u{1F4F7}" : ""}${t.st ? `<small class="muted">${esc(t.by || "")} ${t.at || ""}${t.why ? " \u2014 " + esc(t.why) : ""}</small>` : ""}</span>
      ${t.st ? `<button class="btn sm ghost" data-a="tkMark" data-id="${t.id}" data-st="" title="\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438">\u21A9\uFE0F</button>` : `<span class="tk-b"><button class="btn sm green" data-a="tkMark" data-id="${t.id}" data-st="done">\u2705</button><button class="btn sm" data-a="tkMark" data-id="${t.id}" data-st="no">\u274C</button></span>`}</div>`).join("")}`;
  }
  async function tkMark(id, st, day) {
    var _a2;
    const l = day ? (_a2 = S.data.tasks) == null ? void 0 : _a2.list : S.myTasks, t = (l || []).find((x) => x.id === id);
    let why = "", ph = "";
    if (st === "no") {
      why = await ask("\u274C \u0427\u043E\u043C\u0443 \u043D\u0435 \u0437\u0440\u043E\u0431\u043B\u0435\u043D\u043E?", "\u041A\u043E\u0440\u043E\u0442\u043A\u043E, \u043D\u0430\u043F\u0440.: \u043D\u0435 \u0431\u0443\u043B\u043E \u043C\u0438\u0439\u043D\u043E\u0433\u043E \u0437\u0430\u0441\u043E\u0431\u0443");
      if (!why) return;
    }
    if (st === "done" && (t == null ? void 0 : t.photo) && !t.ph && !isAdmin()) {
      toast("\u{1F4F7} \u0421\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0443\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442");
      const f = await new Promise((res) => {
        const i = document.createElement("input");
        i.type = "file";
        i.accept = "image/*";
        i.capture = "environment";
        i.onchange = () => res(i.files[0] || null);
        i.click();
      });
      if (!f) return;
      ph = await shrink(f, 1280, 0.75);
    }
    const r = await act("taskMark", __spreadValues({ id, st, why, ph }, day ? { day } : {}), st === "done" ? "\u2705 \u0417\u0440\u043E\u0431\u043B\u0435\u043D\u043E" : st === "no" ? "\u274C \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E" : "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E");
    if (!r) return;
    loadMyTasks();
    if (S.view === "team" && S.zpTab === "plan") tkLoad();
  }
  async function tkLoad() {
    if (S._tkL) return;
    S._tkL = 1;
    try {
      S.data.tasks = await api("taskList", { day: S.tkDay || todayK() });
    } catch (e) {
      S.data.tasks = { list: [], tpl: [], staff: [] };
    }
    S._tkL = 0;
    if (S.view === "team") renderMain();
  }
  function tkAdminHTML() {
    const D = S.data.tasks, day = S.tkDay || todayK();
    if (!D || D.day !== day) {
      tkLoad();
      return '<div class="muted">\u2026</div>';
    }
    const l = D.list, ok = l.filter((t) => t.st === "done").length, past = day < todayK(), shift = (n) => {
      const d = /* @__PURE__ */ new Date(day + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const by = {};
    for (const t of l) {
      const k = t.st ? t.by || "\u2014" : tkWho(t.who).replace(/<[^>]+>/g, "");
      by[k] || (by[k] = [0, 0]);
      by[k][1]++;
      if (t.st === "done") by[k][0]++;
    }
    const row = (t) => `<div class="tk-row${t.st ? " done" : ""}${t.imp && !t.st ? " imp" : ""}"><span class="tk-n">${tkIc(t)} ${t.tm ? `<b>${t.tm}</b> \xB7 ` : ""}${esc(t.n)}${t.tpl ? ' <small class="muted">\u{1F501}</small>' : ""}<small class="muted">${tkWho(t.who)}${t.st ? ` \xB7 ${esc(t.by || "")} ${t.at || ""}${t.why ? " \u2014 " + esc(t.why) : ""}` : t.photo ? " \xB7 \u{1F4F7} \u0437 \u0444\u043E\u0442\u043E" : ""}</small></span>
      <span class="tk-b">${t.ph ? `<button class="btn sm" data-a="tkPh" data-id="${t.id}">\u{1F4F7}</button>` : ""}${t.st ? "" : `<button class="btn sm green" data-a="tkMarkA" data-id="${t.id}" data-st="done" title="\u0412\u0456\u0434\u043C\u0456\u0442\u0438\u0442\u0438 \u0437\u0430 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430">\u2705</button>`}${past ? "" : `<button class="btn sm ghost" data-a="tkDel" data-id="${t.id}">\u{1F5D1}</button>`}</span></div>`;
    const tpl = D.tpl || [];
    return `<div class="card"><div class="zp-top"><button class="btn sm" data-a="tkDay" data-d="${shift(-1)}">\u25C0</button><b>${day === todayK() ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : day === shift(0) && day > todayK() ? "\u0417\u0430\u0432\u0442\u0440\u0430" : ""} ${tkDm(day)} ${TK_WD[((/* @__PURE__ */ new Date(day + "T12:00:00Z")).getUTCDay() + 6) % 7]}</b><button class="btn sm" data-a="tkDay" data-d="${shift(1)}">\u25B6</button></div>
        ${l.length ? `<div class="kpis"><div class="kpi accent"><span>\u0412\u0438\u043A\u043E\u043D\u0430\u043D\u043E</span><b>${ok} \u0437 ${l.length}</b><small class="muted">${Math.round(ok / l.length * 100)}%</small></div>${Object.entries(by).map(([n, [a, b]]) => `<div class="kpi"><span>${esc(n)}</span><b>${a}/${b}</b></div>`).join("")}</div>` : ""}
        ${l.length ? l.map(row).join("") : '<div class="muted">\u041D\u0430 \u0446\u0435\u0439 \u0434\u0435\u043D\u044C \u0437\u0430\u0432\u0434\u0430\u043D\u044C \u043D\u0435\u043C\u0430\u0454</div>'}
        ${past ? "" : '<div class="btnrow" style="margin-top:10px"><button class="btn primary" data-a="tkAdd">\u2795 \u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F</button></div>'}</div>
      <div class="card"><h3>\u{1F501} \u0429\u043E\u0434\u0435\u043D\u043D\u0456 \u0448\u0430\u0431\u043B\u043E\u043D\u0438</h3><div class="muted set-note">\u0414\u043E\u0434\u0430\u044E\u0442\u044C\u0441\u044F \u0432 \u043F\u043B\u0430\u043D \u0441\u0430\u043C\u0456: \u0449\u043E\u0434\u043D\u044F \u0430\u0431\u043E \u0432 \u043E\u0431\u0440\u0430\u043D\u0456 \u0434\u043D\u0456 \u0442\u0438\u0436\u043D\u044F. \u041D\u0430\u043F\u0440. \xAB\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0442\u044F \u0437\u0430\u043B\u0438\xBB, \xAB\u0413\u0435\u043D\u0435\u0440\u0430\u043B\u044C\u043D\u0435 \u043F\u0440\u0438\u0431\u0438\u0440\u0430\u043D\u043D\u044F \u2014 \u0447\u0442\xBB.</div>
        ${tpl.map((t, i) => {
      var _a2;
      return `<div class="tk-row"><span class="tk-n">${t.imp ? "\u2757 " : ""}${t.tm ? `<b>${t.tm}</b> \xB7 ` : ""}${esc(t.n)}<small class="muted">${tkWho(t.who)} \xB7 ${((_a2 = t.days) == null ? void 0 : _a2.length) ? t.days.map((d) => TK_WD[d]).join(", ") : "\u0449\u043E\u0434\u043D\u044F"}${t.photo ? " \xB7 \u{1F4F7}" : ""}</small></span><span class="tk-b"><button class="btn sm" data-a="tkTplEd" data-i="${i}">\u270F\uFE0F</button><button class="btn sm ghost" data-a="tkTplDel" data-i="${i}">\u{1F5D1}</button></span></div>`;
    }).join("") || '<div class="muted">\u0428\u0430\u0431\u043B\u043E\u043D\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}
        <div class="btnrow" style="margin-top:10px"><button class="btn" data-a="tkTplEd" data-i="-1">\u2795 \u0428\u0430\u0431\u043B\u043E\u043D</button></div></div>`;
  }
  async function tkForm(x = {}, tpl) {
    const D = S.data.tasks, who = x.who || { k: "a" }, wv = who.k === "s" ? "s:" + who.id : who.k === "r" ? "r:" + who.r : "a";
    const opts = [["a", "\u{1F465} \u0411\u0443\u0434\u044C-\u0445\u0442\u043E \u043D\u0430 \u0437\u043C\u0456\u043D\u0456"], ...Object.entries(TK_ROLE).map(([r2, l]) => ["r:" + r2, "\u{1F465} \u0423\u0441\u0456 " + l]), ...(D.staff || []).map((s) => ["s:" + s.id, "\u{1F464} " + s.n])];
    const v = await modal({
      title: tpl ? "\u{1F501} \u0428\u0430\u0431\u043B\u043E\u043D" : "\u2795 \u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F \u043D\u0430 " + tkDm(S.tkDay || todayK()),
      body: `<div class="form"><input id="tkN" placeholder="\u0429\u043E \u0437\u0440\u043E\u0431\u0438\u0442\u0438 (\u043D\u0430\u043F\u0440. \u043F\u0440\u043E\u0442\u0435\u0440\u0442\u0438 \u0432\u0456\u0442\u0440\u0438\u043D\u0443)" value="${esc(x.n || "")}" maxlength="140">
      <select id="tkW">${opts.map(([k, l]) => `<option value="${k}"${k === wv ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <input id="tkT" type="time" value="${esc(x.tm || "")}" placeholder="\u0427\u0430\u0441 (\u043D\u0435\u043E\u0431\u043E\u0432'\u044F\u0437\u043A\u043E\u0432\u043E)">
      ${tpl ? `<div class="tk-days">${TK_WD.map((d, i) => `<label><input type="checkbox" class="tkD" value="${i}"${(x.days || []).includes(i) ? " checked" : ""}> ${d}</label>`).join("")}</div><div class="muted" style="font-size:12px">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E \u2014 \u0449\u043E\u0434\u043D\u044F</div>` : ""}
      <label class="tk-chk"><input type="checkbox" id="tkI"${x.imp ? " checked" : ""}> \u2757 \u0412\u0430\u0436\u043B\u0438\u0432\u043E</label><label class="tk-chk"><input type="checkbox" id="tkP"${x.photo ? " checked" : ""}> \u{1F4F7} \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u0444\u043E\u0442\u043E</label></div>`,
      buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
      keep: true
    });
    if (!v) return closeModal();
    const w = $("#tkW").value, r = __spreadValues(__spreadProps(__spreadValues({}, x), { n: $("#tkN").value.trim(), tm: $("#tkT").value, imp: $("#tkI").checked ? 1 : 0, photo: $("#tkP").checked ? 1 : 0, who: w === "a" ? { k: "a" } : w.startsWith("r:") ? { k: "r", r: w.slice(2) } : { k: "s", id: w.slice(2) } }), tpl ? { days: [...document.querySelectorAll(".tkD:checked")].map((c) => +c.value) } : {});
    closeModal();
    if (!r.n) {
      toast("\u041D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F");
      return;
    }
    return r;
  }
  async function tkClick(a, D) {
    switch (a) {
      case "tkMark":
        return tkMark(D.id, D.st);
      case "tkMarkA":
        return tkMark(D.id, D.st, S.tkDay || todayK());
      case "tkDay":
        S.tkDay = D.d;
        S.data.tasks = null;
        return renderMain();
      case "tkAdd": {
        const r = await tkForm();
        if (r && await act("taskAdd", __spreadProps(__spreadValues({}, r), { day: S.tkDay || todayK() }), "\u2795 \u0414\u043E\u0434\u0430\u043D\u043E")) tkLoad();
        return;
      }
      case "tkDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F?") && await act("taskDel", { id: D.id, day: S.tkDay || todayK() }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) tkLoad();
        return;
      case "tkPh": {
        const r = await act("taskPh", { id: D.id, day: S.tkDay || todayK() });
        if (r == null ? void 0 : r.ph) modal({ title: "\u{1F4F7} \u0424\u043E\u0442\u043E", body: `<img src="data:image/jpeg;base64,${r.ph}" style="width:100%;border-radius:12px">`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
        return;
      }
      case "tkTplEd":
      case "tkTplDel": {
        const l = [...S.data.tasks.tpl || []], i = +D.i;
        if (a === "tkTplDel") {
          if (!await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D?", "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456\u0448\u043D\u0456 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F \u0437 \u043D\u044C\u043E\u0433\u043E \u043B\u0438\u0448\u0430\u0442\u044C\u0441\u044F")) return;
          l.splice(i, 1);
        } else {
          const r = await tkForm(i >= 0 ? l[i] : {}, true);
          if (!r) return;
          if (i >= 0) l[i] = r;
          else l.push(r);
        }
        if (await act("taskTpl", { list: l }, "\u{1F501} \u0428\u0430\u0431\u043B\u043E\u043D\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) {
          S.data.tasks = null;
          tkLoad();
        }
        return;
      }
    }
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (el && /^tk[A-Z]/.test(el.dataset.a)) tkClick(el.dataset.a, el.dataset);
  });
  if (S.token) start();
  else showLogin();
})();
