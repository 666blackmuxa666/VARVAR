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
  const isAdmin = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "admin";
  }, isCook = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "cook";
  };
  const setHTML = (el, html) => {
    if (el && el._h !== html) {
      el._h = html;
      el.innerHTML = html;
    }
  };
  async function api(op, data = {}, ms = 12e3) {
    const r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op }, data)) }), ms);
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
    $("#regRole").textContent = role === "admin" ? "\u{1F510} \u041D\u043E\u0432\u0438\u0439 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440" : role === "cook" ? "\u{1F468}\u200D\u{1F373} \u041D\u043E\u0432\u0438\u0439 \u043A\u0443\u0445\u0430\u0440" : "\u{1F9D1}\u200D\u{1F373} \u041D\u043E\u0432\u0438\u0439 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442";
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
  let stateSeq = 0, stateDone = 0;
  async function loadState() {
    const my = ++stateSeq, r = await api("state");
    if (my < stateDone) return;
    stateDone = my;
    S.me = __spreadValues(__spreadValues({}, S.me), r.me);
    S.myTip = r.myTip;
    S.myAtt = r.myAtt || null;
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
  const NAV_A = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430"], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438"], ["calc", "\u{1F4E6}", "\u0421\u043A\u043B\u0430\u0434"], ["team", "\u{1F465}", "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B"], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442."]];
  const NAV_W = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F9FE}", "\u0427\u0435\u043A\u0438"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"]];
  const navList = () => isCook() ? NAV_COOK : isAdmin() ? NAV_A : NAV_W;
  const NAV = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F4DC}", "\u0417\u0430\u043A\u0440\u0438\u0442\u0456"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430", 1], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438", 1], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F", 1], ["calc", "\u{1F9EE}", "\u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A", 1], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442.", 1]];
  function renderNav() {
    var _a2, _b;
    const newCnt = S.events.filter((e) => e.k === "guest" && e.s === "new").length;
    const attNew = isAdmin() ? S.events.filter((e) => e.k === "att" && e.s === "new").length : 0;
    setHTML($("#nav"), `<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>` + navList().map(([v, ic, l]) => `<button data-n="${v}" class="${S.view === v ? "on" : ""}${!isCook() && ["calc", "menu", "settings", "stop", "kq"].includes(v) ? " more-i" : ""}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}${v === "team" && attNew ? `<span class="badge">${attNew}</span>` : ""}</button>`).join("") + `<button class="feed-btn" data-a="feed"><span class="ic">\u{1F514}</span>\u0421\u0442\u0440\u0456\u0447\u043A\u0430${newCnt ? `<span class="badge">${newCnt}</span>` : ""}</button><button class="more-btn ${["calc", "menu", "settings", "stop", "kq"].includes(S.view) ? "on" : ""}" data-a="more"><span class="ic">\u22EF</span>\u0429\u0435</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="\u041D\u0430 \u0432\u0435\u0441\u044C \u0435\u043A\u0440\u0430\u043D"><span class="ic">\u26F6</span>\u0415\u043A\u0440\u0430\u043D</button><button class="me" data-a="zpMy" title="\u041C\u0456\u0439 \u043A\u0430\u0431\u0456\u043D\u0435\u0442"><i>${esc((((_a2 = S.me) == null ? void 0 : _a2.name) || "?").slice(0, 1).toUpperCase())}${onShift() ? '<em class="sh-dot"></em>' : ""}</i><b>${esc((_b = S.me) == null ? void 0 : _b.name)}</b><small>${isAdmin() ? "\u0430\u0434\u043C\u0456\u043D" : isCook() ? "\u043A\u0443\u0445\u0430\u0440" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"} \xB7 \u043A\u0430\u0431\u0456\u043D\u0435\u0442</small></button><button data-a="switch"><span class="ic">\u{1F512}</span>\u0412\u0438\u0439\u0442\u0438</button>`);
  }
  function render() {
    renderNav();
    renderFeed();
    if (["hall", "printer", "kq"].includes(S.view) || S.view === "settings" && S.setTab === "printer") renderMain();
    if (S.open) renderSheet();
  }
  function hallHTML() {
    var _a2;
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter((e) => e.k === "guest" && e.s === "new").map((e) => e.t));
    const calls = {};
    for (const e of S.events) if (e.k === "call" && e.s === "new") calls[e.t] = e;
    const bell = (t) => calls[t] ? `<span class="callbell${Date.now() - calls[t].ts > 6e4 ? " late" : ""}" title="\u041A\u043B\u0438\u0447\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430">\u{1F514}</span>` : "";
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map((t) => {
      const b = S.tables[t];
      if (!b) return `<button class="tbl${calls[t] ? " calling" : ""}" data-a="table" data-t="${t}">${bell(t)}<div class="n">${t}</div><div class="st">\u0432\u0456\u043B\u044C\u043D\u0438\u0439</div></button>`;
      const cls = ["busy", b.check ? "check" : "", pending.has(t) ? "new" : ""].join(" ");
      const tag = b.check ? `<span class="tag c">\u{1F9FE} \u0440\u0430\u0445\u0443\u043D\u043E\u043A</span>${b.pay ? `<i class="pay" title="${b.pay === "card" ? "\u043A\u0430\u0440\u0442\u0430" : "\u0433\u043E\u0442\u0456\u0432\u043A\u0430"}">${b.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</i>` : ""}` : pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : "";
      return `<button class="tbl ${cls}${calls[t] ? " calling" : ""}" data-a="table" data-t="${t}">${bell(t)}${tag}<div class="n">${t}</div><div class="st">${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.${b.disc ? ` \xB7 \u2212${b.disc}%` : ""}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"}</div></button>`;
    }).join("");
    return `<div class="head"><h1>\u0417\u0430\u043B</h1><div class="stat tipstat" title="\u041D\u0430\u043A\u043E\u043F\u0438\u0447\u0435\u043D\u043E, \u0449\u0435 \u043D\u0435 \u0432\u0438\u0434\u0430\u043D\u043E">\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456<b class="money">${money(((_a2 = S.myTip) == null ? void 0 : _a2.sum) || 0)}</b></div><div class="stat">\u0423 \u0437\u0430\u043B\u0456<b class="money">${money(sum)}</b></div>
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
    ready: e.part ? `\u{1F37D} \u0421\u0442\u0456\u043B ${e.t} \u2014 \u0441\u0442\u0440\u0430\u0432\u0430 \u0433\u043E\u0442\u043E\u0432\u0430, \u0437\u0430\u0431\u0438\u0440\u0430\u0439\u0442\u0435` : `\u{1F37D} \u0421\u0442\u0456\u043B ${e.t} \u2014 \u0412\u0421\u0415 \u0413\u041E\u0422\u041E\u0412\u041E, \u0437\u0430\u0431\u0438\u0440\u0430\u0439\u0442\u0435!${e.mins != null ? ` <small>(${e.mins} \u0445\u0432)</small>` : ""}`,
    cooking: `\u{1F525} \u0421\u0442\u0456\u043B ${e.t} \u2014 \u043A\u0443\u0445\u043D\u044F \u0433\u043E\u0442\u0443\u0454`,
    kmsg: `\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F \u2192 \u0441\u0442\u0456\u043B ${e.t}: ${esc(e.text)}`,
    call: `\u{1F514}\u{1F514} \u0421\u0442\u0456\u043B ${e.t} \u043A\u043B\u0438\u0447\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430`,
    noscan: `\u{1F6A8}\u{1F4F5}\u{1F6AB} \u0421\u0422\u0406\u041B ${e.t} \u2014 \u041D\u0415 \u041C\u041E\u0416\u0415 \u0417\u0410\u041C\u041E\u0412\u0418\u0422\u0418 \u{1F6AB}\u{1F4F5}\u{1F6A8}<br><small>\u0413\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0432\u0430\u0432 QR (\u0430\u0431\u043E \u043C\u0438\u043D\u0443\u043B\u0430 \u0433\u043E\u0434\u0438\u043D\u0430). \u041F\u0456\u0434\u0456\u0439\u0434\u0456\u0442\u044C: \u{1F4F7} \u043D\u0435\u0445\u0430\u0439 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0454 QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u{1F446}</small>`,
    att: `\u{1F7E2} ${esc(e.n)} \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${e.late ? ` \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F ${e.late} \u0445\u0432` : ""}`,
    swap: esc(e.text)
  })[e.k] || esc(e.text || e.k);
  setInterval(() => {
    var _a2;
    if ((_a2 = S.events) == null ? void 0 : _a2.some((e) => e.k === "call" && e.s === "new")) {
      renderFeed();
      if (S.view === "hall" && !S.open) renderMain();
    }
  }, 1e4);
  function renderFeed() {
    setHTML($("#events"), S.events.length ? [...S.events].reverse().map((e) => {
      var _a2, _b, _c, _d, _e;
      const add = ((_a2 = e.prev) == null ? void 0 : _a2.length) && ((_b = e.lines) == null ? void 0 : _b.length);
      const rdy = e.k === "ready" && e.text ? `<div class="lines">${esc(e.text)}</div>` : "";
      const lines = rdy || (((_c = e.lines) == null ? void 0 : _c.length) ? `${add ? '<div class="addtag">\u2795 \u0414\u041E\u0417\u0410\u041C\u041E\u0412\u041B\u0415\u041D\u041D\u042F</div>' : ""}<div class="lines${add ? " add" : ""}">${e.lines.map(esc).join("\n")}</div>` : "");
      const by = e.by && !["waiter"].includes(e.k) ? ` \xB7 ${esc(e.by)}` : "";
      const zb = e.k === "att" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "")}</span>` : e.s === "rej" ? `<span class="bad">\u274C ${esc(e.accBy || "")}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button>${e.late && ((_d = S.cfg) == null ? void 0 : _d.lateFine) ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">\u2705 + \u0448\u0442\u0440\u0430\u0444</button>` : ""}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">\u274C</button>` : '<span class="muted">\u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F</span>'}</div>` : e.k === "swap" && !e.old ? e.s === "ask" && e.n === ((_e = S.me) == null ? void 0 : _e.name) ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u041D\u0456</button></div>` : e.s === "agreed" && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u274C</button></div>` : "" : "";
      const btns = zb || (e.k === "noscan" ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${e.t}</button></div>` : e.k === "guest" || e.k === "check" || e.k === "call" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "\u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E")}</span>` : e.s === "rej" ? `<span style="color:var(--red,#ff453a)">\u274C \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E \xB7 ${esc(e.accBy || "")}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button>${e.k === "guest" ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438</button>` : ""}`}<button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${e.t}</button></div>` : "");
      const fresh = S.shown.size && !S.shown.has(e.id) ? " fresh" : "";
      return `<div class="ev ${e.k}${e.k === "call" && e.s === "new" && Date.now() - e.ts > 6e4 ? " late" : ""}${e.s === "acc" || e.s === "rej" ? " acc" : ""}${e.s === "rej" ? " rej" : ""}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}${e.sum && ["guest", "waiter"].includes(e.k) ? `<div class="muted">\u0421\u0443\u043C\u0430 ${money(e.sum)}</div>` : ""}${btns}</div>`;
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
    const pend = S.events.filter((e) => e.k === "guest" && e.s === "new" && +e.t === t);
    setHTML($("#shPend"), pend.map((e) => `<div class="pend"><div><b>\u{1F6CE} \u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F \xB7 ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join("<br>")}</div>${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button></div>`).join(""));
    $("#shBody").className = "sheet-body" + (S.mobileMenu ? " show-menu" : "");
    const billRows = b ? b.items.map((it) => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} \xD7 ${Math.round(it.sum / it.q)} \u20B4</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1">\u2212</button></div>`).join("") : '<div class="muted" style="padding:8px 4px">\u0420\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0432 \u043C\u0435\u043D\u044E</div>';
    const discRow = (b == null ? void 0 : b.disc) ? `<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%</div><b class="money" style="color:var(--green)">\u2212${b.total - b.pay2}</b><button class="rb minus" data-a="discSet" data-p="0">\xD7</button></div>` : "";
    const tipRow = (b == null ? void 0 : b.tip) ? `<div class="row"><div class="nm">\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<small>\u0432\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">\xD7</button>' : ""}</div>` : "";
    const comments = b ? b.log.filter((o) => o.comment).map((o) => `<div class="muted" style="padding:2px 6px">\u{1F4AC} ${esc(o.comment)}</div>`).join("") : "";
    const cartHTML = cartRows.length ? `<div class="cart"><h3>\u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} \u20B4</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">\u2212</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join("")}${pq ? `<div class="row auto"><div class="nm">\u{1F961} ${esc(pk.name.uk)}<small>${pk.price} \u20B4 \xD7 ${pq}${S.packAdj[t] ? "" : " \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E"}</small></div><button class="rb minus" data-a="pk" data-d="-1">\u2212</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ""}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="\u{1F4AC} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u0434\u043B\u044F \u043A\u0443\u0445\u043D\u0456" value="${esc(S.coms[t] || "")}"><button class="btn sm ${S.tw[t] ? "primary" : "ghost"}" data-a="tw">\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E</button><button class="btn sm ${S.ur[t] ? "red" : "ghost"}" data-a="ur">\u26A1 \u0422\u0435\u0440\u043C\u0456\u043D\u043E\u0432\u043E</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">\u2715</button><button class="btn primary" data-a="send">\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \xB7 ${money(cartSum)}</button></div></div>` : "";
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A</button><button class="btn" data-a="disc">% \u0417\u043D\u0438\u0436\u043A\u0430</button>
      <button class="btn" data-a="move">\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438</button><button class="btn" data-a="split">\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438</button>${isAdmin() ? '<button class="btn red" data-a="delTable">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>' : '<button class="btn" data-a="mobileMenu">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438</button>'}
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
    const r = await act("order", { t, items, urgent: !!S.ur[t], comment: [S.tw[t] ? "\u0417 \u0421\u041E\u0411\u041E\u042E" : "", S.coms[t] || ""].filter(Boolean).join(" \xB7 ") });
    if (r) {
      S.carts[t] = {};
      S.coms[t] = "";
      S.tw[t] = false;
      S.ur[t] = false;
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
    var _a2, _b;
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const dmax = (_b = (_a2 = S.cfg) == null ? void 0 : _a2.discMax) != null ? _b : 20, max = isAdmin() ? 100 : dmax;
    const v = await choose(`\u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0441\u0442\u0456\u043B ${t}`, `\u0421\u0443\u043C\u0430 ${money(b.total)}${b.disc ? ` \xB7 \u0437\u0430\u0440\u0430\u0437 ${b.disc}%` : ""}${isAdmin() ? "" : ` \xB7 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u2014 \u0434\u043E ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter((p2) => p2 <= max).map((p2) => ({ label: `${p2}%  \u2192  ${money(b.total - Math.round(b.total * p2 / 100))}`, val: String(p2) })), { label: "\u270F\uFE0F \u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A", val: "own" }, { label: "\u0411\u0435\u0437 \u0437\u043D\u0438\u0436\u043A\u0438", val: "0", cls: "red" }]);
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
  function splitRender() {
    const { items, q } = S.spl, sum = items.reduce((a, it, i) => a + Math.round(it.sum / it.q) * (q[i] || 0), 0);
    const box = $("#splBox");
    if (!box) return;
    box.innerHTML = items.map((it, i) => `<div class="row"><div class="nm">${esc(it.name)}<small>\u043D\u0430 \u0441\u0442\u043E\u043B\u0456 ${it.q} \u0448\u0442 \xB7 ${Math.round(it.sum / it.q)} \u20B4</small></div><button class="rb minus" data-a="spq" data-i="${i}" data-d="-1">\u2212</button><span class="q">${q[i] || 0}</span><button class="rb plus" data-a="spq" data-i="${i}" data-d="1">+</button></div>`).join("") + `<div class="row"><div class="nm"><b>\u041D\u043E\u0432\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A</b></div><b class="money">${money(sum)}</b></div>`;
  }
  async function splitFlow() {
    const t = S.open, b = S.tables.find((x) => x.t === t);
    if (!b) return;
    S.spl = { items: b.items, q: {} };
    const pm = modal({ title: `\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ${t}`, text: "\u041E\u0431\u0435\u0440\u0456\u0442\u044C, \u0449\u043E \u043F\u0456\u0434\u0435 \u0432 \u043E\u043A\u0440\u0435\u043C\u0438\u0439 \u0440\u0430\u0445\u0443\u043D\u043E\u043A", body: '<div class="rows" id="splBox"></div>', buttons: [{ label: "\u0414\u0430\u043B\u0456 \u2192 \u043E\u0431\u0440\u0430\u0442\u0438 \u0441\u0442\u0456\u043B", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
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
      toast(`\u2702\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0456\u043B ${to} \xB7 ${money(r.r.sum)}`);
      await loadState().catch(() => {
      });
    }
  }
  async function loadView(silent) {
    try {
      if (S.view === "kq") await loadKq();
      if (S.view === "cash" && S.cashTab !== "checks") S.data.shift = await api("shift");
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
      if (S.view === "calc") await loadCalc();
      if (S.view === "team") {
        await loadPay();
        S.data.staff = await api("staff");
      }
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
    const html = (_b = (_a2 = { kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, team: teamHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML })[v]) == null ? void 0 : _b.call(_a2);
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
      var _a2, _b, _c, _d, _e, _f;
      const ref = x.id || l.length - 1 - i;
      return `<div class="card" style="${gone(x) ? "opacity:.45" : ""}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} \xB7 \u0421\u0442\u0456\u043B ${x.t} \xB7 <span class="money">${money(x.sum)}</span> ${x.reopen ? "\u21A9\uFE0F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0437\u043D\u043E\u0432\u0443" : x.restored ? "\u21A9\uFE0F \u0441\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : x.del ? "\u{1F5D1} \u0441\u0442\u0456\u043B \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : x.rm ? "\u{1F9F9} \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438" : payL(x)}${x.disc ? ` \xB7 \u0437\u043D\u0438\u0436\u043A\u0430 ${x.disc}%` : ""}</h3><span class="muted">${esc(x.by || "")}</span>
        ${!gone(x) && ((_a2 = x.dishes) == null ? void 0 : _a2.length) ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">\u{1F5A8} \u0427\u0435\u043A</button>` : ""}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">\u{1F5D1} \u0417 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</button>` : ""}
        ${isAdmin() && !x.del && !x.reopen && ((_b = x.dishes) == null ? void 0 : _b.length) ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button>` : ""}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">\u21A9\uFE0F \u0423 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</button>` : ""}
        ${isAdmin() && x.del && !x.restored && (((_c = x.dishes) == null ? void 0 : _c.length) || ((_d = x.voids) == null ? void 0 : _d.length)) ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0441\u0442\u0456\u043B</button>` : ""}</div>
        ${((_e = x.dishes) == null ? void 0 : _e.length) ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}\xD7 ${esc(n)} \u2014 ${s}`).join(" \xB7 ")}</div>` : ""}${x.tip ? `<div class="muted" style="margin-top:4px">\u{1F49D} \u0432 \u0442.\u0447. \u0447\u0430\u0439\u043E\u0432\u0456 ${money(x.tip)}</div>` : ""}
        ${((_f = x.voids) == null ? void 0 : _f.length) ? `<div class="voids">\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E:${x.voids.map((v) => `<div>${v.at} \xB7 \u2212${money(v.sum)} ${esc(v.name)} \u2014 <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join("")}</div>` : ""}</div>`;
    }).join("") || `<div class="muted">${isToday ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454" : "\u0426\u044C\u043E\u0433\u043E \u0434\u043D\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u043D\u0435\u043C\u0430\u0454"}</div>`}</div>${(S.data.cvoids || []).length ? `<div class="card"><h3>\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u0456 \u0441\u0442\u0440\u0430\u0432\u0438 ${dTitle} <span class="muted">\xB7 ${S.data.cvoids.length}</span></h3>${[...S.data.cvoids].reverse().map((v) => `<div class="kv"><span>${v.at} \xB7 \u0441\u0442\u0456\u043B ${v.t} \xB7 <b>${esc(v.name)}</b> \u2014 <i>${esc(v.reason || "")}</i> <span class="muted">(${esc(v.by || "")})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="btn sm green" data-a="vBack" data-ts="${v.ts}">\u21A9\uFE0F \u041D\u0430 \u0441\u0442\u0456\u043B</button>` : ""}</span></div>`).join("")}</div>` : ""}`;
  }
  async function loadKq() {
    const r = await api("kitchen");
    const list = r.list || [];
    const ids = list.filter((e) => !e.done).map((e) => e.id), canc = list.flatMap((e) => e.items.filter((x) => x.cancel || x.canc).map((x) => e.id + x.n + (x.canc || 0)));
    if (S.kqSeen) {
      const nw = list.filter((e) => !e.done && !S.kqSeen.has(e.id));
      if (nw.length) siren(nw.some((e) => e.urgent));
      else if (canc.some((c) => !S.kqCanc.has(c))) beep();
    }
    S.kqSeen = new Set(list.map((e) => e.id));
    S.kqCanc = new Set(canc);
    S.kq = list;
    if (S.view === "kq") renderMain();
  }
  setInterval(() => {
    if (S.view === "kq") renderMain();
  }, 3e4);
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
  document.addEventListener("visibilitychange", async () => {
    var _a2;
    if (isCook() && document.visibilityState === "visible" && (!wakeLock || wakeLock.released)) try {
      wakeLock = await ((_a2 = navigator.wakeLock) == null ? void 0 : _a2.request("screen"));
    } catch (e) {
    }
  });
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
      return `<div class="kc${e.urgent ? " urg" : ""}${e.start ? " cook" : " new"}"><div class="kh"><b>\u0421\u0442\u0456\u043B ${e.t}</b><span class="tm ${tc}">\u23F1 ${m} \u0445\u0432</span></div>
        <div class="km">${e.at} \xB7 ${esc(e.by)}${e.src === "\u0433\u0456\u0441\u0442\u044C" ? " \xB7 \u{1F4F1} \u0441\u0430\u0439\u0442" : ""}</div>
        ${e.urgent ? '<div class="ktag urg">\u26A1 \u0422\u0415\u0420\u041C\u0406\u041D\u041E\u0412\u041E</div>' : ""}${e.tw ? '<div class="ktag">\u{1F961} \u0417 \u0421\u041E\u0411\u041E\u042E</div>' : ""}${e.comment ? `<div class="kcom">\u{1F4AC} ${esc(e.comment)}</div>` : ""}
        <div class="ki">${e.items.map((x, i) => `<div class="kit-w"><button class="kit${x.done ? " done" : ""}${x.cancel ? " canc" : ""}" data-a="kItem" data-id="${e.id}" data-i="${i}" ${x.cancel ? "disabled" : ""}><b>${x.q}\xD7</b> ${esc(x.n)}${x.cancel ? " <em>\u0421\u041A\u0410\u0421\u041E\u0412\u0410\u041D\u041E</em>" : x.canc ? ` <em>\u2212${x.canc} \u0441\u043A\u0430\u0441.</em>` : ""}</button><button class="kinfo" data-a="skTechOne" data-n="${esc(x.n)}" title="\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430">\u24D8</button></div>`).join("")}</div>
        ${(e.msgs || []).map((x) => `<div class="kmsg">\u{1F4E8} ${x.at} ${esc(x.text)}</div>`).join("")}
        <div class="kb">${e.start ? "" : `<button class="btn" data-a="kStart" data-id="${e.id}">\u{1F525} \u0413\u043E\u0442\u0443\u044E</button>`}<button class="btn" data-a="kMsg" data-id="${e.id}">\u{1F4AC}</button><button class="btn green" data-a="kAll" data-id="${e.id}">\u2705 \u0412\u0421\u0415 \u0413\u041E\u0422\u041E\u0412\u041E</button></div></div>`;
    };
    return `<div class="khead"><h1>\u{1F468}\u200D\u{1F373} \u0427\u0435\u0440\u0433\u0430 <span class="muted">${act0.length}</span></h1>${isCook() ? `<div class="stat tipstat">\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456<b class="money">${money(((_a2 = S.myTip) == null ? void 0 : _a2.sum) || 0)}</b></div>` : ""}<button class="btn" data-a="skKStock">\u{1F4E6} \u0421\u043A\u043B\u0430\u0434</button><button class="btn" data-a="view" data-v="stop">\u26D4 \u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</button></div>
      <div class="kq f${S.kFont}">${act0.length ? act0.map(card).join("") : '<div class="kempty">\u2705 \u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>'}</div>
      ${done.length ? `<h3 class="muted" style="margin:18px 0 8px">\u041E\u0441\u0442\u0430\u043D\u043D\u0456 \u0433\u043E\u0442\u043E\u0432\u0456</h3><div class="kdone">${done.map((e) => `<div class="kd">\u0421\u0442\u0456\u043B ${e.t} \xB7 ${e.items.filter((x) => !x.cancel).map((x) => `${x.q}\xD7 ${esc(x.n)}`).join(", ")}${e.cancelled ? " \xB7 \u274C \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" : ` \xB7 ${Math.round((e.doneAt - e.ts) / 6e4)} \u0445\u0432`} <button class="btn sm" data-a="kUndo" data-id="${e.id}">\u21A9\uFE0F</button></div>`).join("")}</div>` : ""}`;
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
      <div class="muted">${p.seen ? "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0437\u0432\u02BC\u044F\u0437\u043E\u043A: " + hhmm(p.seen) : ""} \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456: ${(_a2 = p.q) != null ? _a2 : 0}</div></div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">\u{1F5A8} \u0422\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A</button><button class="btn" data-a="pQr">\u{1F533} QR \u043C\u0435\u043D\u044E \u0434\u043B\u044F \u0441\u0442\u043E\u043B\u0443</button></div></div>`;
  }
  function cashHTML() {
    const ctab = S.cashTab || "day", cseg = `<div class="seg rsec cseg">${[["day", "\u{1F4B0} \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["checks", "\u{1F9FE} \u0427\u0435\u043A\u0438"]].map(([k, l]) => `<button class="${ctab === k ? "on" : ""}" data-a="cashTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    if (ctab === "checks") return cseg + closedHTML();
    return cseg + cashHTML0();
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
      <button class="btn primary zbtn" data-a="zDay">\u{1F9FE} Z-\u0437\u0432\u0456\u0442<small>\u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u0439 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438</small></button></div>`;
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
    const J = [
      ...(r.closed || []).filter((x) => !x.del && !x.rm).map((x) => ({ at: x.at, ic: x.card ? "\u{1F4B3}" : "\u{1F4B5}", t: `\u0421\u0442\u0456\u043B ${x.t}${x.by ? " \xB7 " + esc(x.by) : ""}${x.disc ? ` \xB7 \u2212${x.disc}%` : ""}${x.tip ? ` \xB7 \u{1F49D} ${money(x.tip)}` : ""}`, v: "+" + money(x.sum), cls: "in" })),
      ...r.exp.map((e, i) => ({ at: e.at, ic: "\u{1F4B8}", t: esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430") + (e.src === "card" ? " (\u043A\u0430\u0440\u0442\u043A\u0430)" : ""), v: "\u2212" + money(e.sum), cls: "out", del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` })),
      ...(r.mov || []).map((m, i) => ({ at: m.at, ic: "\u{1F501}", t: MOVE[m.type] + (m.note ? " \xB7 " + esc(m.note) : ""), v: money(m.sum), cls: "mv", del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const journal = `<div class="card"><h3>\u{1F4D2} \u0416\u0443\u0440\u043D\u0430\u043B \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 <span class="muted" style="font-weight:400;font-size:13px">\xB7 ${J.length}</span></h3>${J.length ? J.map((x) => `<div class="jr ${x.cls}${x.del ? " del" : ""}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : "<i></i>"}</div>`).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}</div>`;
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
    const now = new Date(Date.now() - 3 * 36e5), day = 864e5, y = now.getFullYear(), mo = now.getMonth();
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
  const SECS = [["overview", "\u{1F4C8} \u041E\u0433\u043B\u044F\u0434", ["overview"]], ["sales", "\u{1F37D} \u041F\u0440\u043E\u0434\u0430\u0436\u0456", ["dishes", "cats", "groups", "tables", "days", "wd"]], ["staff", "\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B", ["waiters", "tips", "ctrl", "kitchen"]], ["money", "\u{1F4B0} \u0413\u0440\u043E\u0448\u0456", ["checks", "exp", "mov", "z"]]];
  const TABS = { dishes: "\u{1F37D} \u0421\u0442\u0440\u0430\u0432\u0438", cats: "\u{1F4C2} \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457", groups: "\u{1F373} \u041A\u0443\u0445\u043D\u044F/\u0431\u0430\u0440", tables: "\u{1FA91} \u0421\u0442\u043E\u043B\u0438", days: "\u{1F4C5} \u0414\u043D\u0456", wd: "\u{1F5D3} \u0414\u043D\u0456 \u0442\u0438\u0436\u043D\u044F", waiters: "\u{1F464} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438", tips: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", ctrl: "\u{1F575}\uFE0F \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C", kitchen: "\u23F1 \u041A\u0443\u0445\u043D\u044F", checks: "\u{1F9FE} \u0427\u0435\u043A\u0438", exp: "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", mov: "\u{1F501} \u0420\u0443\u0445 \u043A\u043E\u0448\u0442\u0456\u0432", z: "\u{1F512} Z-\u0437\u0432\u0456\u0442\u0438" };
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
  const colChart = (pts) => {
    const max = Math.max(1, ...pts.map((p) => p[1])), step = Math.ceil(pts.length / 12);
    return `<div class="cols">${pts.map(([l, v, t, d], i) => `<div class="c${d ? " press" : ""}"${d ? ` data-a="rDay" data-d="${d}"` : ""} title="${esc(t)}"><i style="height:${v ? Math.max(3, v / max * 86) : 0}%"></i><small>${i % step ? "" : esc(l)}</small></div>`).join("")}</div>`;
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
        <label>\u0421\u0442\u0456\u043B<select data-f="t">${opt("", "\u0423\u0441\u0456", R.t)}${tables.map((t) => opt(String(t), "\u0421\u0442\u0456\u043B " + t, R.t)).join("")}</select></label>
        <label>\u0421\u0442\u0440\u0430\u0432\u0430<input id="rQ" placeholder="\u{1F50E} \u043D\u0430\u0437\u0432\u0430" value="${esc(R.q)}"></label></div>` : ""}
        ${nF ? `<div class="chips">${[R.pay && (R.pay === "card" ? "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430"), R.by && "\u{1F464} " + R.by, R.grp && (S.groups.find((g) => g.id === R.grp) || {}).name, R.cat && (((_a2 = cats.find((c) => c.id === R.cat)) == null ? void 0 : _a2.name.uk) || R.cat), R.t && "\u0421\u0442\u0456\u043B " + R.t, R.q.trim() && "\u{1F50E} " + R.q.trim()].filter(Boolean).map((x) => `<span class="chip on sm">${esc(x)}</span>`).join("")}<button class="chip" data-a="rReset">\u2715 \u0421\u043A\u0438\u043D\u0443\u0442\u0438</button></div>` : ""}</div>` : "";
    if (!r) return head + filters + '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const st = repStats(r), pv = repStats(S.data.prev), { checks, dishF } = st, gross = st.total + st.disc;
    const kpi = (l, v, raw, pr, cls) => `<div class="kpi ${cls || ""}"><span>${l}</span><b class="money">${v}</b>${pv ? delta(raw, pr) : ""}</div>`;
    const kpis = `<div class="kpis">${kpi("\u0412\u0438\u0440\u0443\u0447\u043A\u0430", money(st.total), st.total, pv == null ? void 0 : pv.total, "accent")}${kpi("\u0427\u0435\u043A\u0456\u0432", st.n, st.n, pv == null ? void 0 : pv.n)}${kpi("\u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", st.n ? money(st.avg) : "\u2014", st.avg, pv == null ? void 0 : pv.avg)}${st.net != null ? kpi("\u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(st.net), st.net, pv == null ? void 0 : pv.net, "green") : kpi("\u041F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439", st.qty, st.qty, pv == null ? void 0 : pv.qty)}</div>`;
    const cp = share(st.cash, st.cash + st.card);
    const pills = `<div class="pills">${!dishF ? `<div class="pill wide"><div class="psplit"><i style="width:${cp}%"></i></div><div class="psplit-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(st.cash)}</b> <span class="muted">${cp}%</span></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 <b class="money">${money(st.card)}</b> <span class="muted">${st.cash + st.card ? Math.round((100 - cp) * 10) / 10 : 0}%</span></span></div></div>
      <div class="pill"><span>\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438</span><b class="money">${money(st.disc)}</b><small>${share(st.disc, gross)}% \u0432\u0456\u0434 \u0441\u0443\u043C\u0438</small></div><div class="pill"><span>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456</span><b class="money">${money(st.tip)}</b>${st.tipOut ? `<small>\u0432\u0438\u0434\u0430\u043D\u043E ${money(st.tipOut)}</small>` : ""}</div>` : ""}
      ${st.exp != null ? `<div class="pill"><span>\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438</span><b class="money">${money(st.exp)}</b>${(pv == null ? void 0 : pv.exp) != null ? delta(st.exp, pv.exp, 1) : ""}</div>` : ""}
      <div class="pill"><span>\u{1F37D} \u041F\u043E\u0437\u0438\u0446\u0456\u0439</span><b>${st.qty}</b><small>${st.n ? (st.qty / st.n).toFixed(1) : 0} \u0443 \u0447\u0435\u043A\u0443</small></div></div>`;
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
        bt && ["\u{1FA91} \u041D\u0430\u0439\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u043E\u0432\u0456\u0448\u0438\u0439 \u0441\u0442\u0456\u043B", `\u0421\u0442\u0456\u043B ${bt[0]} \xB7 ${bt[1][0]} \u0447\u0435\u043A.`, money(bt[1][1])],
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
    } else if (T === "tables") rows = grpBy((c) => "\u0421\u0442\u0456\u043B " + c.t).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    if (rows) {
      if (!["hours", "days", "tables", "wd"].includes(T)) rows.sort((a, b) => R.sort === "q" && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const tot = rows.reduce((a, x) => a + x[1][1], 0);
      body += barRows(rows, unit, tot, sub);
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== "q" ? "on" : ""}" data-a="rSort" data-s="s">\u0417\u0430 \u0441\u0443\u043C\u043E\u044E</button><button class="chip ${R.sort === "q" ? "on" : ""}" data-a="rSort" data-s="q">\u0417\u0430 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E</button></div>` + body;
    } else if (["checks", "exp", "mov", "z"].includes(T)) {
      const xb = (kind, x, back) => `<button class="xb${back ? " back" : ""}" data-a="${back ? "rBack" : "rDel"}" data-k="${kind}" data-d="${x.d}" data-i="${kind === "checks" ? esc(x.id || "") : x.i}" title="${back ? "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438"}">${back ? "\u21A9\uFE0F" : "\u{1F5D1}"}</button>`;
      const line = (kind, x, l, v, back) => `<div class="kv rrow${back ? " del" : ""}"><span>${l}</span><span class="kv-r"><b class="money">${v}</b>${kind !== "checks" || x.id ? xb(kind, x, back) : ""}</span></div>`;
      const dd = (d) => d.slice(8) + "." + d.slice(5, 7);
      let act2 = [], gone = [], empty = "";
      if (T === "checks") {
        act2 = [...checks].reverse().slice(0, 300).map((c) => line("checks", c, `${dd(c.d)} ${c.at} \xB7 \u0441\u0442\u0456\u043B ${c.t} \xB7 ${esc(waiterOf(c))} ${c.card ? "\u{1F4B3}" : "\u{1F4B5}"}${c.disc ? " \u{1F3F7}" : ""}${c.tip ? ` \xB7 \u{1F49D} ${money(c.tip)}` : ""}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}\xD7 ${esc(nm)}`).join(", ")}</small>`, money(c.val)));
        gone = (r.removed || []).filter((x) => !x.reopen).map((x) => line("checks", x, `${dd(x.d)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${x.t} \xB7 ${esc(x.by)} <span class="muted">\xB7 \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</span>`, money(x.sum), 1));
        empty = "\u041D\u0435\u043C\u0430\u0454 \u0447\u0435\u043A\u0456\u0432";
      }
      if (T === "exp") {
        act2 = [...r.exp].reverse().map((e) => line("exp", e, `${dd(e.d)} ${e.at} ${e.src === "card" ? "\u{1F4B3}" : "\u{1F4B5}"} ${esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430")} <span class="muted">${esc(e.by)}</span>`, money(e.sum)));
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
        const tn = waiterOf(c), tv = (_a3 = (c.tipSplit || {})[tn]) != null ? _a3 : c.tipSplit ? 0 : c.tip || 0;
        if (tv) w(tn).tip += tv;
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
      }).join("")}</div>` : '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445</div>') + `<h3 style="margin:18px 0 8px">\u{1F6AB} \u0416\u0443\u0440\u043D\u0430\u043B \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C</h3>` + (vs.length ? [...vs].reverse().slice(0, 300).map((v) => `<div class="kv"><span>${v.d.slice(5)} ${v.at} \xB7 \u0441\u0442\u0456\u043B ${v.t} \xB7 <b>${esc(v.by)}</b> \xB7 ${esc(v.name)}<br><small class="muted">\u2753 ${esc(v.reason)}</small></span><b class="money" style="color:var(--red)">\u2212${money(v.sum)}</b></div>`).join("") : '<div class="muted">\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u044C \u043D\u0435\u043C\u0430\u0454 \u{1F44D}</div>') + (rm.length ? `<h3 style="margin:18px 0 8px">\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</h3>` + rm.map((x) => `<div class="kv"><span>${x.d.slice(5)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${x.t} \xB7 ${esc(x.by)}</span><b class="money">${money(x.sum)}</b></div>`).join("") : "");
    }
    return head + filters + kpis + pills + nav + `<div class="card">${body}</div>`;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    return `<div class="head"><h1>\u041C\u0435\u043D\u044E</h1><button class="btn" data-a="menuUndo">\u21A9\uFE0F \u0412\u0456\u0434\u043C\u0456\u043D\u0438\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443</button><button class="btn" data-a="catAdd">\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B</button><button class="btn primary" data-a="menuEdit" data-id="">\u2795 \u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430</button></div>
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
    var _a2, _b, _c, _d, _e, _f, _g, _h;
    const st = S.data.staff, wf = S.data.wifi, c = (st == null ? void 0 : st.cfg) || {};
    const ROLE = { admin: "\u{1F510} \u0430\u0434\u043C\u0456\u043D", cook: "\u{1F468}\u200D\u{1F373} \u043A\u0443\u0445\u0430\u0440", waiter: "\u{1F9D1}\u200D\u{1F373} \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442" };
    const row = (l, v, btn, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ""}</span><span class="kv-r"><b>${v}</b>${btn}</span></div>`;
    const ch = (a, extra = "") => `<button class="btn sm" data-a="${a}"${extra}>\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button>`;
    const staff = st ? [...st.staff].sort((a, b) => (a.role || "").localeCompare(b.role || "") || a.name.localeCompare(b.name)) : null;
    const SS = [["rules", "\u2699\uFE0F \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438"], ["look", "\u{1F3A8} \u0412\u0438\u0433\u043B\u044F\u0434"], ["printer", "\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440"], ["test", "\u{1F9EA} \u0422\u0435\u0441\u0442"]], cur = only || ((SS0) => SS0.includes(S.setTab) ? S.setTab : "rules")(["rules", "look", "printer", "test"]);
    const part = {};
    part.people = `<div class="grid2 set">
      <div class="card"><h3>\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B <span class="muted">\xB7 ${staff ? staff.length : "\u2026"}</span></h3>
        <div class="scrollbox">${staff ? staff.map((s) => `<div class="kv"><span>${esc(s.name)} <span class="muted">\xB7 ${ROLE[s.role] || ROLE.waiter}</span></span><button class="btn sm red" data-a="staffDel" data-id="${s.id}">\u{1F5D1}</button></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>' : "\u2026"}</div>
        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430</button></div>
      <div class="card"><h3>\u{1F195} \u041A\u043E\u0434\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457</h3><div class="muted set-note">\u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0434 \u0437\u0430\u043C\u0456\u0441\u0442\u044C PIN \u2192 \u043F\u0438\u0448\u0435 \u0456\u043C\u02BC\u044F \u0456 \u043F\u0440\u0438\u0434\u0443\u043C\u0443\u0454 \u0441\u0432\u0456\u0439 PIN.</div>
        ${(st == null ? void 0 : st.reg) ? row("\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", esc(st.reg.admin), ch("regSet", ' data-r="admin"')) + row("\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", esc(st.reg.waiter), ch("regSet", ' data-r="waiter"')) + row("\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u0430\u0440", esc(st.reg.cook || "1113"), ch("regSet", ' data-r="cook"')) : "\u2026"}</div>
      <div class="card"><h3>\u{1F916} \u0423\u0432\u0456\u0439\u0448\u043B\u0438 \u0432 Telegram-\u0431\u043E\u0442</h3><div class="scrollbox">${st ? st.waiters.map((w) => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">\u0412\u0438\u0439\u0442\u0438</button></div>`).join("") || '<div class="muted">\u041D\u0456\u043A\u043E\u0433\u043E</div>' : "\u2026"}</div></div>
      <div class="card"><h3>\u{1F511} \u041F\u0430\u0440\u043E\u043B\u0456</h3><div class="muted set-note">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430 \u2014 \u0432\u0445\u0456\u0434 \u0443 \u0431\u043E\u0442 \u0456 \u043A\u0430\u0441\u0443; \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \u2014 \u0430\u0434\u043C\u0456\u043D-\u0444\u0443\u043D\u043A\u0446\u0456\u0457.</div>
        <div class="btnrow"><button class="btn sm" data-a="wPass">\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430</button><button class="btn sm" data-a="aPass">\u041F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0456\u043D\u0430</button></div></div></div>`;
    part.rules = `<div class="grid2 set">
      <div class="card"><h3>\u{1F4B0} \u0413\u0440\u043E\u0448\u0456</h3>
        ${row("\u{1F3F7} \u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430", ((_a2 = c.discMax) != null ? _a2 : 20) + "%", ch("cfg", ' data-k="discMax"'), "\u0411\u0456\u043B\u044C\u0448\u0443 \u0437\u043D\u0438\u0436\u043A\u0443 \u0434\u0430\u0454 \u043B\u0438\u0448\u0435 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440")}
        ${row("\u{1F468}\u200D\u{1F373} \u0427\u0430\u0441\u0442\u043A\u0430 \u043A\u0443\u0445\u043D\u0456 \u0432\u0456\u0434 \u0447\u0430\u0439\u043E\u0432\u0438\u0445", ((_b = st == null ? void 0 : st.kpct) != null ? _b : 20) + "%", ch("kpct"), `\u041F\u043B\u044E\u0441 \xAB\u043F\u043E\u0434\u044F\u043A\u0430 \u043A\u0443\u0445\u043D\u0456\xBB \u0432\u0456\u0434 \u0433\u043E\u0441\u0442\u044F; \u043F\u043E\u0440\u0456\u0432\u043D\u0443 \u043C\u0456\u0436 \u043A\u0443\u0445\u0430\u0440\u044F\u043C\u0438 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${((_c = st == null ? void 0 : st.cooks) == null ? void 0 : _c.length) ? ` (\u0437\u0430\u0440\u0430\u0437: ${st.cooks.map(esc).join(", ")})` : " (\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0449\u0435 \u043D\u0456\u043A\u043E\u0433\u043E \u2014 \u043F\u0456\u0434\u0435 \u0432 \xAB\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F\xBB)"}`)}</div>
      <div class="card"><h3>\u{1F477} \u0417\u043C\u0456\u043D\u0438</h3>
        ${row("\u23F0 \u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0456\u0441\u043B\u044F", ((_d = c.lateMin) != null ? _d : 10) + " \u0445\u0432", ch("cfg", ' data-k="lateMin"'), "\u0412\u0456\u0434 \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E\u0433\u043E \u0447\u0430\u0441\u0443 \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0437\u043C\u0456\u043D\u0438")}
        ${row("\u2796 \u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F", ((_e = c.lateFine) != null ? _e : 0) + " \u20B4", ch("cfg", ' data-k="lateFine"'), "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443; \u0430\u0434\u043C\u0456\u043D \u0432\u0438\u0440\u0456\u0448\u0443\u0454 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u2705 + \u0448\u0442\u0440\u0430\u0444\xBB")}</div>
      <div class="card"><h3>\u{1F9EE} \u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A</h3>
        ${row("\u{1F3AF} \u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442", ((_f = c.foodCost) != null ? _f : 30) + "%", ch("cfg", ' data-k="foodCost"'), "\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \xF7 \u0446\u0456\u043D\u0430. \u0417\u0430 \u043D\u0438\u043C \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u0441\u0442\u0440\u0430\u0432")}
        ${row("\u{1F53A} \u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434", ((_g = c.priceAlert) != null ? _g : 5) + "%", ch("cfg", ' data-k="priceAlert"'), "\u042F\u043A\u0449\u043E \u0432 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456\u0439 \u0446\u0456\u043D\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 \u0432\u0438\u0449\u0430 \u0437\u0430 \u043C\u0438\u043D\u0443\u043B\u0443")}</div>
      <div class="card"><h3>\u{1F4F1} \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u0435\u0439</h3>
        ${row("\u23F1 \u0427\u0430\u0441 \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", ((_h = c.scanMin) != null ? _h : 60) + " \u0445\u0432", ch("cfg", ' data-k="scanMin"'), "\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0433\u0456\u0441\u0442\u044C \u043C\u043E\u0436\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0430\u043D\u0443\u0432\u0430\u043D\u043D\u044F QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456")}
        <div class="muted set-note" style="margin-top:10px">\u{1F4F6} Wi\u2011Fi \u0437\u0430\u043A\u043B\u0430\u0434\u0443 (\u0437\u0430\u043F\u0430\u0441\u043D\u0438\u0439 \u0441\u043F\u043E\u0441\u0456\u0431) \xB7 \u0432\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430: ${esc((wf == null ? void 0 : wf.current) || "\u2026")}</div>
        <div class="scrollbox sm">${wf ? wf.list.map((x) => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString("uk-UA")}</span></div>`).join("") || '<div class="muted">\u043D\u0435\u043C\u0430\u0454 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u0445 \u0430\u0434\u0440\u0435\u0441</div>' : ""}</div>
        <div class="btnrow"><button class="btn sm primary" data-a="wifiAdd">\u2795 \u0426\u0435 \u043D\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430</button><button class="btn sm red" data-a="wifiClear">\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456</button></div></div></div>`;
    part.look = lookHTML();
    part.printer = printerCards();
    part.test = `<div class="grid2 set"><div class="card"><h3>\u{1F9EA} \u0422\u0435\u0441\u0442</h3><div class="muted set-note">\u0422\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E, \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0443.</div><button class="btn sm red" data-a="reset">\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435</button></div></div>`;
    if (only) return part[only];
    return `<div class="rhead"><div><h1>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h1><span class="muted">\u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438, \u043F\u0440\u0438\u043D\u0442\u0435\u0440</span></div></div>
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
        ${x.lp ? `<label>\u0426\u0456\u043D\u0430 (\u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445)<input disabled value="${money(x.cost)} / ${x.u}"></label>` : `<label>\u0426\u0456\u043D\u0430 \u0437\u0430 ${x.u}, \u20B4 <small>(\u043F\u043E\u043A\u0438 \u0431\u0435\u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445)</small><input id="iCost" inputmode="decimal" value="${x.cost || ""}"></label>`}</div>
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
    }, $("#iCost") ? { cost: num("iCost"), setCost: 1 } : {});
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
    const top = `<div class="card"><h3>\u041D\u043E\u0432\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430</h3>${K.busy ? '<div class="sk-busy">\u{1F50E} \u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u044E \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443\u2026 \u0437\u0430\u0437\u0432\u0438\u0447\u0430\u0439 10\u201330 \u0441\u0435\u043A\u0443\u043D\u0434</div>' : `<div class="sk-new"><label class="btn primary sk-scan">\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443<input type="file" id="skPhoto" accept="image/*" capture="environment" hidden></label><label class="btn">\u{1F5BC} \u0417 \u0433\u0430\u043B\u0435\u0440\u0435\u0457<input type="file" id="skPhoto2" accept="image/*" multiple hidden></label><button class="btn" data-a="skHand">\u270F\uFE0F \u0412\u0440\u0443\u0447\u043D\u0443</button></div>`}
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
      var _a3, _b, _c;
      const st = l.add ? "new" : !l.id ? "none" : l.ok === "guess" ? "guess" : "ok", x = im.get(l.id);
      return `<div class="dl ${st}"><div class="dl-src">${i + 1}. ${l.n ? esc(l.n) : '<i class="muted">\u043D\u043E\u0432\u0438\u0439 \u0440\u044F\u0434\u043E\u043A</i>'}${l.u || l.price ? ` <span class="muted">\xB7 ${esc((_a3 = l.q0) != null ? _a3 : l.q)} ${esc(l.u || "")}${l.price ? " \xD7 " + l.price : ""}</span>` : ""}${st === "guess" ? ' <span class="warn">\u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442</span>' : st === "none" ? ' <span class="warn">\u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442</span>' : ""}</div>
        <div class="dl-f"><button class="pk-b ${l.id || l.add ? "" : "empty"}" data-a="skDlPick" data-i="${i}">${x ? esc(x.n) + ` <span class="muted">${x.u}</span>` : l.add ? `\u2795 ${esc(l.add.n)} <span class="muted">${l.add.u}</span>` : "\u{1F50E} \u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</button><input data-dl="${i}" data-k="q" inputmode="decimal" value="${(_b = l.q) != null ? _b : ""}" placeholder="\u041A-\u0441\u0442\u044C"><select data-dl="${i}" data-k="f">${pkOpt(l)}</select><input data-dl="${i}" data-k="sum" inputmode="decimal" value="${(_c = l.sum) != null ? _c : ""}" placeholder="\u0421\u0443\u043C\u0430 \u20B4"><button class="xb" data-a="skDlDel" data-i="${i}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0440\u044F\u0434\u043E\u043A">\u2715</button></div>
        <div class="dl-h muted" id="dlh${i}">${lineHint(l, x, adm)}</div></div>`;
    }).join("");
    const sups = Object.keys(((_a2 = S.data.skInv) == null ? void 0 : _a2.sups) || {});
    return `<div class="card"><div class="rhead"><h3 style="margin:0">\u{1F9FE} ${d.src === "photo" ? "\u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430 \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435" : "\u041D\u043E\u0432\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430"}</h3><button class="btn sm" data-a="skDraftX">\u2715 \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button></div>
      <div class="frow"><label>\u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A<input id="dSup" list="supL" value="${esc(d.sup || "")}" data-dh="sup" placeholder="\u043D\u0430\u043F\u0440. \u041C\u0435\u0442\u0440\u043E"><datalist id="supL">${sups.map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label><label>\u2116 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430<input id="dNo" value="${esc(d.no || "")}" data-dh="no"></label><label>\u0414\u0430\u0442\u0430<input id="dDate" value="${esc(d.date || "")}" data-dh="date" placeholder="\u0414\u0414.\u041C\u041C.\u0420\u0420\u0420\u0420"></label></div></div>
      <div class="card"><h3>\u041F\u043E\u0437\u0438\u0446\u0456\u0457 <span class="muted">\xB7 ${d.lines.length}</span> <span class="muted" style="font-weight:400;font-size:12px">\u{1F7E2} \u0432\u043F\u0456\u0437\u043D\u0430\u043D\u043E \xB7 \u{1F7E1} \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \xB7 \u{1F535} \u043D\u043E\u0432\u0438\u0439 \u2014 \u0441\u0442\u0432\u043E\u0440\u0438\u0442\u044C\u0441\u044F \u0441\u0430\u043C</span></h3>${rows || '<div class="muted">\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u0437\u0438\u0446\u0456\u0457</div>'}
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
      const r = await api("skInvParse", { images }, 75e3);
      if (!S.data.sk) S.data.sk = await api("skData");
      S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: "photo", lines: r.lines.map((l) => __spreadProps(__spreadValues({}, l), { q0: l.q, f: l.add ? l.f : skAutoF(l) })) };
      if (!S.data.skInv) S.data.skInv = await api("skInvList").catch(() => null);
    } catch (e) {
      toast("\u26A0\uFE0F " + errText(e.message));
    }
    S.sk.busy = false;
    renderMain();
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
    S.sk.card = { key, name: semi ? x == null ? void 0 : x.n : it == null ? void 0 : it.name, price: (it == null ? void 0 : it.price) || 0, semi, u: x == null ? void 0 : x.u, out: (c == null ? void 0 : c.out) || "", yield: (c == null ? void 0 : c.yield) || (semi ? 1 : ""), wh: (c == null ? void 0 : c.wh) || "", perL: !!(c == null ? void 0 : c.perL), draft: !!(c == null ? void 0 : c.draft), note: (c == null ? void 0 : c.note) || "", items: ((c == null ? void 0 : c.items) || []).map((l) => __spreadValues({}, l)), isNew: !c, variant: key.includes("|") };
    S.sk.tab = semi ? S.sk.tab : "cards";
    renderMain();
    $("#main").scrollTop = 0;
  }
  function skCardEdHTML() {
    var _a2, _b;
    const c = S.sk.card, D = S.data.sk, ing = D.ing.filter((x) => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(D.ing.map((x) => [x.id, x])), tgt = ((_b = (_a2 = S.data.skCost) == null ? void 0 : _a2.cfg) == null ? void 0 : _b.foodCost) || 30;
    const cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0), fc = c.price ? Math.round(cost / c.price * 1e3) / 10 : null, rec = cost ? Math.ceil(cost / (tgt / 100) / 5) * 5 : 0;
    const per = c.semi && +c.yield > 0 ? cost / +c.yield : null;
    const rows = c.items.map((l, i) => {
      var _a3, _b2, _c;
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a3 = l.add) == null ? void 0 : _a3.u) || "\u043A\u0433", k = u === "\u0448\u0442" ? 1 : 1e3, loss = (_c = (_b2 = l.loss) != null ? _b2 : x == null ? void 0 : x.loss) != null ? _c : 0, net = (+l.q || 0) * (1 - loss / 100);
      return `<div class="cl"><button class="pk-b ${l.id || l.add ? "" : "empty"}" data-a="skClPick" data-i="${i}">${x ? (x.semi ? "\u{1F373} " : "") + esc(x.n) : l.add ? `\u2795 ${esc(l.add.n)}` : "\u{1F50E} \u041F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</button>
        <label>\u0431\u0440\u0443\u0442\u0442\u043E, ${small(u)}<input data-cl="${i}" data-k="q" inputmode="decimal" value="${l.q ? r3(l.q * k) : ""}"></label><label>\u0432\u0442\u0440\u0430\u0442\u0438 %<input data-cl="${i}" data-k="loss" inputmode="numeric" value="${loss || ""}" placeholder="0"></label>
        <label>\u043D\u0435\u0442\u0442\u043E, ${small(u)}<input data-cl="${i}" data-k="net" inputmode="decimal" value="${net ? r3(net * k) : ""}" id="cln${i}"></label>
        <span class="cl-c muted money" id="clc${i}">${x ? money((+l.q || 0) * skUnitCost(x.id)) : ""}</span><button class="xb" data-a="skClDel" data-i="${i}">\u2715</button></div>`;
    }).join("");
    return `<div class="card"><div class="rhead"><div><h3 style="margin:0">\u{1F4CB} ${esc(c.name || "")}</h3><span class="muted">${c.semi ? `\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \xB7 \u043F\u0430\u0440\u0442\u0456\u044F ${c.yield || 1} ${c.u || ""}` : `\u0446\u0456\u043D\u0430 ${money(c.price)}`}${c.draft ? " \xB7 \u2728 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430 \u0432\u0456\u0434 AI \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0438" : ""}</span></div><button class="btn sm" data-a="skCardX">\u2190 \u041D\u0430\u0437\u0430\u0434</button></div>
      <div class="frow">${c.semi ? `<label>\u0412\u0438\u0445\u0456\u0434 \u043F\u0430\u0440\u0442\u0456\u0457, ${esc(c.u || "")}<input data-ch="yield" inputmode="decimal" value="${c.yield || ""}"></label>` : `<label>\u0412\u0438\u0445\u0456\u0434, \u0433 / \u043C\u043B<input data-ch="out" inputmode="numeric" value="${c.out || ""}" placeholder="\u043D\u0430\u043F\u0440. 400"></label>`}
        <label>\u0421\u043F\u0438\u0441\u0443\u0432\u0430\u0442\u0438 \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443<select data-ch="wh"><option value="">\u0430\u0432\u0442\u043E (${c.semi ? "\u0434\u0435 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430" : "\u043A\u0443\u0445\u043D\u044F \u2014 \u0437 \u043A\u0443\u0445\u043D\u0456, \u0431\u0430\u0440 \u2014 \u0437 \u0431\u0430\u0440\u0443"})</option><option value="k" ${c.wh === "k" ? "selected" : ""}>${WHN.k}</option><option value="b" ${c.wh === "b" ? "selected" : ""}>${WHN.b}</option></select></label>
        ${c.variant && !c.semi ? `<label class="chk"><input type="checkbox" data-ch="perL" ${c.perL ? "checked" : ""}> \u043D\u0430 1 \u043B \u2014 \u043C\u043D\u043E\u0436\u0438\u0442\u0438 \u043D\u0430 \u043E\u0431\u02BC\u0454\u043C (\u0440\u043E\u0437\u043B\u0438\u0432\u043D\u0435)</label>` : ""}</div></div>
      <div class="card"><h3>\u0421\u043A\u043B\u0430\u0434 <span class="muted">\xB7 ${c.items.length}</span></h3>${rows || '<div class="muted">\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0430\u0431\u043E \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u2728 \u0417\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0437 AI\xBB</div>'}
        <div class="btnrow"><button class="btn sm" data-a="skClAdd">\u2795 \u041F\u0440\u043E\u0434\u0443\u043A\u0442</button><button class="btn sm" data-a="skCardAi">${S.sk.aiBusy ? "\u23F3 AI \u0434\u0443\u043C\u0430\u0454\u2026" : "\u2728 \u0417\u0430\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0437 AI"}</button></div></div>
      <div class="card"><div class="kv tot"><span>\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C ${c.semi ? "\u043F\u0430\u0440\u0442\u0456\u0457" : "\u043F\u043E\u0440\u0446\u0456\u0457"}</span><b class="money" id="cCost">${money(cost)}</b></div>
        ${c.semi ? `<div class="kv"><span>\u0417\u0430 1 ${esc(c.u || "")}</span><b class="money" id="cPer">${per != null ? money(per) : "\u2014"}</b></div>` : `<div class="kv"><span>\u0424\u0443\u0434\u043A\u043E\u0441\u0442</span><b id="cFc" class="${fc == null ? "" : fc <= tgt ? "good" : fc <= tgt + 10 ? "mid" : "bad"}">${fc != null ? fc : "\u2014"}%</b></div><div class="kv"><span>\u041C\u0430\u0440\u0436\u0430 \u0437 \u043F\u043E\u0440\u0446\u0456\u0457</span><b class="money" id="cM">${money(c.price - cost)}</b></div>
        <div class="kv"><span>\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u043F\u0440\u0438 \u0444\u0443\u0434\u043A\u043E\u0441\u0442\u0456 ${tgt}%</span><b class="money" id="cRec">${rec ? money(rec) : "\u2014"}</b></div>`}
        <div class="btnrow"><button class="btn primary" data-a="skCardSave">\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438</button>${c.isNew ? "" : '<button class="btn red" data-a="skCardDel">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">\u0411\u0440\u0443\u0442\u0442\u043E \u2014 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0431\u0435\u0440\u0435\u0442\u044C\u0441\u044F \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443; \u043D\u0435\u0442\u0442\u043E \u2014 \u043F\u0456\u0441\u043B\u044F \u0447\u0438\u0441\u0442\u043A\u0438 / \u0432\u0430\u0440\u043A\u0438. \u041F\u0440\u043E\u0434\u0430\u0436 \u0441\u0442\u0440\u0430\u0432\u0438 \u0441\u043F\u0438\u0441\u0443\u0454 \u0431\u0440\u0443\u0442\u0442\u043E \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443. \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0430 AI \u043D\u0435 \u0441\u043F\u0438\u0441\u0443\u0454, \u043F\u043E\u043A\u0438 \u0432\u0438 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u0435.</div></div>`;
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
    const card = { items, out: +c.out || 0, yield: +c.yield || 0, wh: c.wh, perL: c.perL, draft, note: c.note };
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
    var _a2;
    const D = S.data.sk, adm = isAdmin(), cards = ((_a2 = S.data.skCost) == null ? void 0 : _a2.cards) || {}, semis = D.ing.filter((x) => x.semi && !x.off);
    return `<div class="btnrow" style="margin:0 0 12px">${adm ? '<button class="btn sm primary" data-a="skSemiNew">\u2795 \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430</button>' : ""}</div>` + (semis.length ? `<div class="grid2">${semis.map((x) => {
      const c = cards["semi:" + x.id];
      return `<div class="card"><h3>\u{1F373} ${esc(x.n)}</h3><div class="kv"><span>\u041D\u0430 \u0441\u043A\u043B\u0430\u0434\u0456</span><b>${fq(totQ(x), x.u)}</b></div>${adm ? `<div class="kv"><span>\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C</span><b class="money">${skUnitCost(x.id) ? money(skUnitCost(x.id)) + " / " + x.u : "\u2014"}</b></div><div class="kv"><span>\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430</span><span class="${c ? "" : "warn"}">${c ? `${c.items.length} \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432 \xB7 \u043F\u0430\u0440\u0442\u0456\u044F ${c.yield} ${x.u}` : "\u043D\u0435 \u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u0430"}</span></div>` : ""}
        <div class="btnrow"><button class="btn sm primary" data-a="skProd" data-id="${x.id}">\u{1F373} \u041F\u0440\u0438\u0433\u043E\u0442\u0443\u0432\u0430\u043B\u0438</button>${adm ? `<button class="btn sm" data-a="skCardSemi" data-id="${x.id}">\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430</button>` : ""}</div></div>`;
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
  const hhK = (t) => new Date(t).toLocaleTimeString("uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit" });
  const WDL = ["\u043D\u0434", "\u043F\u043D", "\u0432\u0442", "\u0441\u0440", "\u0447\u0442", "\u043F\u0442", "\u0441\u0431"];
  const curMon = () => {
    const d = new Date(Date.now() - 3 * 36e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const todayK = () => iso(Date.now() - 3 * 36e5);
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
      return !(G.hide || []).includes(s.name) && (((_a2 = s.pay) == null ? void 0 : _a2.rate) || ((_b = s.pay) == null ? void 0 : _b.pct) || (G.seen || []).includes(s.name) || G.days.some((d) => {
        var _a3, _b2;
        return ((_a3 = G.att[d]) == null ? void 0 : _a3[s.name]) || ((_b2 = G.plan[d]) == null ? void 0 : _b2[s.name]);
      }));
    }).map((s) => s.name);
    const rows = G.rows.filter((r) => people.includes(r.n) || r.paid || r.adv || r.bonus || r.fine), due = rows.reduce((a, r) => a + Math.max(0, r.due), 0), pend = rows.reduce((a, r) => a + r.pending, 0);
    const tab = S.zpTab || "grid", TABS2 = [["grid", "\u{1F4C5} \u0413\u0440\u0430\u0444\u0456\u043A"], ["pay", "\u{1F4B0} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430"], ["ops", "\u{1F9FE} \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457"], ["eff", "\u{1F4CA} \u0415\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u0456\u0441\u0442\u044C"], ["people", "\u{1F465} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438"]];
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
      const role = (r) => r.role === "cook" ? "\u043A\u0443\u0445\u0430\u0440" : r.role === "admin" ? "\u0430\u0434\u043C\u0456\u043D" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442";
      const cond = (p) => !p.rate && !p.pct ? '<span class="warn">\u0441\u0442\u0430\u0432\u043A\u0443 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E</span>' : `${p.rate ? money(p.rate) + "/\u0437\u043C\u0456\u043D\u0430" : ""}${p.pct ? ` \xB7 ${p.pct}% ${{ all: "\u0432\u0438\u0440\u0443\u0447\u043A\u0438", own: "\u0441\u0432\u043E\u0457\u0445 \u0447\u0435\u043A\u0456\u0432", kitchen: "\u043A\u0443\u0445\u043D\u0456" }[p.base || "all"]}` : ""}${p.dayRev || p.monRev ? " \xB7 \u{1F3AF}" : ""}`;
      body = `<div class="card zp-pay"><div class="zp-pr th"><span>\u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A</span><span>\u0417\u043C\u0456\u043D</span><span>\u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E</span><span>\u0412\u0438\u0434\u0430\u043D\u043E</span><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><span></span></div>
        ${rows.map((r) => {
        const open = S.zpOpen === r.n, ln = (l, v, c = "") => `<div class="kv ${c}"><span>${l}</span><b class="money">${v}</b></div>`;
        return `<div class="zp-pr press" data-a="zpRow" data-n="${esc(r.n)}"><span><b>${esc(r.n)}</b><small class="muted">${role(r)} \xB7 ${cond(r.pay || {})}</small></span><span>${r.shifts}${r.pending ? `<small class="warn">+${r.pending}\u{1F553}</small>` : ""}</span><span class="money">${money(r.earned)}</span><span class="money muted">${r.adv + r.paid ? money(r.adv + r.paid) : "\u2014"}</span><b class="money ${r.due > 0 ? "acc" : ""}">${money(r.due)}</b>
            <span class="zp-act">${r.due > 0 ? `<button class="btn sm primary" data-a="zpPay" data-n="${esc(r.n)}" data-v="${r.due}">\u{1F4B8}</button>` : ""}<i>${open ? "\u25B4" : "\u25BE"}</i></span></div>
            ${open ? `<div class="zp-det"><div class="zp-det-l">${ln(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${r.shifts} \u0437\u043C\u0456\u043D${r.hours ? ` (${r.hours} \u0433\u043E\u0434)` : ""}`, money(r.rate))}${r.pct ? ln(`% \u0432\u0456\u0434 ${money(r.baseSum)}`, money(r.pct)) : ""}${r.dayB || r.monB ? ln("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(r.dayB + r.monB)) : ""}${r.bonus ? ln("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(r.bonus), "good") : ""}${r.fine ? ln("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(r.fine), "bad") : ""}${r.adv ? ln("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(r.adv)) : ""}${r.paid ? ln("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(r.paid)) : ""}
              ${r.toMon ? `<div class="muted" style="font-size:12px">\u{1F3AF} \u0434\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(r.toMon)}</div>` : ""}${r.tips ? `<div class="muted" style="font-size:12px">\u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 \u043E\u043A\u0440\u0435\u043C\u043E: ${money(r.tips)}</div>` : ""}${r.late || r.absent ? `<div class="warn" style="font-size:12px">${r.late ? `\u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u044C ${r.late}` : ""}${r.late && r.absent ? " \xB7 " : ""}${r.absent ? `\u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B\u0456\u0432 ${r.absent}` : ""}</div>` : ""}</div>
              <div class="zp-det-b"><button class="btn sm" data-a="zpOpN" data-t="bonus" data-n="${esc(r.n)}">\u2795 \u041F\u0440\u0435\u043C\u0456\u044F</button><button class="btn sm" data-a="zpOpN" data-t="fine" data-n="${esc(r.n)}">\u2796 \u0428\u0442\u0440\u0430\u0444</button><button class="btn sm" data-a="zpOpN" data-t="adv" data-n="${esc(r.n)}">\u{1F4B5} \u0410\u0432\u0430\u043D\u0441</button><button class="btn sm" data-a="zpSet" data-id="${r.id}">\u2699\uFE0F \u0421\u0442\u0430\u0432\u043A\u0430</button></div></div>` : ""}`;
      }).join("") || '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0456\u0432 \u0443 \u0433\u0440\u0430\u0444\u0456\u043A\u0443</div>'}
        <div class="muted" style="font-size:12px;margin-top:8px">\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0440\u044F\u0434\u043E\u043A \u2014 \u0434\u0435\u0442\u0430\u043B\u0456, \u043F\u0440\u0435\u043C\u0456\u044F, \u0448\u0442\u0440\u0430\u0444, \u0430\u0432\u0430\u043D\u0441, \u0441\u0442\u0430\u0432\u043A\u0430. \u{1F4B8} \u2014 \u0432\u0438\u0434\u0430\u0442\u0438 \u0432\u0435\u0441\u044C \u0437\u0430\u043B\u0438\u0448\u043E\u043A (\u0437 \u043A\u0430\u0441\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438).</div></div>`;
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
    const s = S.data.zp.staff.find((x) => x.id === id), p = (s == null ? void 0 : s.pay) || {};
    if (!s) return;
    const body = `<div class="form"><div class="frow"><label>\u0421\u0442\u0430\u0432\u043A\u0430 \u0437\u0430 \u0437\u043C\u0456\u043D\u0443, \u20B4<input id="zR" inputmode="numeric" value="${p.rate || ""}" placeholder="\u043D\u0430\u043F\u0440. 600"></label><label>% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438<input id="zP" inputmode="decimal" value="${p.pct || ""}" placeholder="\u043D\u0430\u043F\u0440. 2"></label></div>
      <label>\u0412\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434<select id="zB"><option value="all" ${p.base !== "own" && p.base !== "kitchen" ? "selected" : ""}>\u0443\u0441\u0456\u0454\u0457 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0434\u043D\u044F (\u0437\u0430 \u0434\u043D\u0456 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456)</option><option value="own" ${p.base === "own" ? "selected" : ""}>\u0441\u0432\u043E\u0457\u0445 \u0447\u0435\u043A\u0456\u0432 (\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u0441\u0442\u043E\u043B\u0430)</option><option value="kitchen" ${p.base === "kitchen" ? "selected" : ""}>\u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u043A\u0443\u0445\u043D\u0456</option></select></label>
      <div class="muted" style="font-size:12px">\u{1F3AF} \u041F\u043B\u0430\u043D \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 (\u0432\u0456\u0434 \u0442\u0456\u0454\u0457 \u0436 \u0431\u0430\u0437\u0438) \u2014 \u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E:</div>
      <div class="frow"><label>\u0417\u0430 \u0437\u043C\u0456\u043D\u0443 \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zDR" inputmode="numeric" value="${p.dayRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zDB" inputmode="numeric" value="${p.dayBonus || ""}"></label></div>
      <div class="frow"><label>\u0417\u0430 \u043C\u0456\u0441\u044F\u0446\u044C \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zMR" inputmode="numeric" value="${p.monRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zMB" inputmode="numeric" value="${p.monBonus || ""}"></label></div></div>`;
    const v = await modal({ title: `\u2699\uFE0F ${s.name}: \u0441\u0442\u0430\u0432\u043A\u0430`, body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const g = (i) => $("#" + i).value.replace(",", "."), pay = v === "ok" ? { rate: g("zR"), pct: g("zP"), base: $("#zB").value, dayRev: g("zDR"), dayBonus: g("zDB"), monRev: g("zMR"), monBonus: g("zMB") } : null;
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
  async function zpMy() {
    var _a2, _b;
    const r = await act("zpMy", {});
    if (!r) return;
    const w = r.row, me = (_a2 = S.me) == null ? void 0 : _a2.name;
    const lnx = (l, v2) => `<div class="kv"><span>${l}</span><b class="money">${v2}</b></div>`;
    const asks = r.swaps.filter((s) => s.to === me && s.st === "ask");
    const shiftH = `<div class="zp-shift">${onShift() ? `<button class="btn red" data-a="zpOut">\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button><span class="muted">\u043D\u0430 \u0437\u043C\u0456\u043D\u0456 \u0437 ${hhK(S.myAtt.in)}${S.myAtt.ok === 0 ? " \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F" : " \xB7 \u2705"}</span>` : `<button class="btn green" data-a="zpIn">\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>${((_b = S.myAtt) == null ? void 0 : _b.out) ? `<span class="muted">\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 ${hhK(S.myAtt.in)}\u2013${hhK(S.myAtt.out)}</span>` : ""}`}</div>`;
    const body = shiftH + `${w ? `<div class="pills zp-my"><div class="pill"><span>\u0417\u043C\u0456\u043D</span><b>${w.shifts}</b><small>${w.hours ? w.hours + " \u0433\u043E\u0434" : ""}</small></div><div class="pill"><span>\u0417\u0430\u0440\u043E\u0431\u043B\u0435\u043D\u043E</span><b class="money">${money(w.earned)}</b></div><div class="pill"><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(w.due)}</b></div>${w.tips ? `<div class="pill"><span>\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456</span><b class="money">${money(w.tips)}</b></div>` : ""}</div>
      ${lnx(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${w.shifts}`, money(w.rate))}${w.pct ? lnx("% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438", money(w.pct)) : ""}${w.dayB || w.monB ? lnx("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(w.dayB + w.monB)) : ""}${w.bonus ? lnx("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(w.bonus)) : ""}${w.fine ? lnx("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(w.fine)) : ""}${w.adv ? lnx("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(w.adv)) : ""}${w.paid ? lnx("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(w.paid)) : ""}
      ${w.toMon ? `<div class="muted" style="font-size:13px;margin-top:6px">\u{1F3AF} \u0414\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(w.toMon)}</div>` : ""}` : '<div class="muted">\u0421\u0442\u0430\u0432\u043A\u0443 \u0449\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E</div>'}
      ${asks.map((s) => `<div class="card zp-ask">\u{1F501} <b>${esc(s.from)}</b> \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u0438\u0439\u0442\u0438 \u0437\u0430 \u043D\u044C\u043E\u0433\u043E ${s.day.slice(8)}.${s.day.slice(5, 7)} \u043E ${s.time}<div class="btnrow"><button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">\u041D\u0456</button></div></div>`).join("")}
      <h3 style="margin:14px 0 6px">\u0413\u0440\u0430\u0444\u0456\u043A \xB7 ${monName(r.m)}</h3>${gridHTML(r.grid, r.grid.people, false, me)}<div class="muted" style="font-size:11px;margin-top:4px">\u2705 \u0431\u0443\u0432 \xB7 \u25CF \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \xB7 \u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B</div>
      ${r.swaps.filter((s) => s.from === me).map((s) => `<div class="muted" style="font-size:12px">\u{1F501} ${s.day.slice(8)}.${s.day.slice(5, 7)} \u2192 ${esc(s.to)}: ${s.st === "ask" ? "\u0447\u0435\u043A\u0430\u0454 \u0437\u0433\u043E\u0434\u0438" : "\u0447\u0435\u043A\u0430\u0454 \u0430\u0434\u043C\u0456\u043D\u0430"}</div>`).join("")}`;
    const v = await modal({ title: `\u{1F464} ${me}`, body, buttons: [{ label: "\u{1F501} \u041F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D", val: "swap" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
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
    var _a2, _b, _c, _d, _e;
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
        const reason = await voidReason(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0435\u0441\u044C \u0441\u0442\u0456\u043B ${t}? \u0421\u0443\u043C\u0430 \u041D\u0415 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443`);
        if (reason) {
          const r = await act("delete", { t, reason }, `\u{1F5D1} \u0421\u0442\u0456\u043B ${t} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E`);
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
      case "cfg": {
        const k = el.dataset.k, L = { discMax: ["\u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430, %", "\u0432\u0456\u0434 0 \u0434\u043E 100"], scanMin: ["\u0425\u0432\u0438\u043B\u0438\u043D \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", "\u0432\u0456\u0434 10 \u0434\u043E 600"], foodCost: ["\u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442, %", "\u0432\u0456\u0434 5 \u0434\u043E 90"], priceAlert: ["\u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434, %", "\u0432\u0456\u0434 1 \u0434\u043E 100"], lateMin: ["\u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u2014 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0456\u043B\u044C\u043A\u043E\u0445 \u0445\u0432\u0438\u043B\u0438\u043D", "\u0432\u0456\u0434 0 \u0434\u043E 120"], lateFine: ["\u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F, \u20B4", "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443"] }[k];
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
        const v = await ask(`\u041D\u043E\u0432\u0438\u0439 \u043A\u043E\u0434 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 (${el.dataset.r === "admin" ? "\u0430\u0434\u043C\u0456\u043D" : el.dataset.r === "cook" ? "\u043A\u0443\u0445\u0430\u0440" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"})`, "4 \u0446\u0438\u0444\u0440\u0438", "number");
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
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || !/^zp/.test(el.dataset.a)) return;
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
  document.addEventListener("input", (e) => {
    var _a2, _b;
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
      if (d.k === "net") {
        const z = lo();
        l.q = z < 100 ? r3(v / k / (1 - z / 100)) : 0;
        const qi = (_b = t.closest(".cl")) == null ? void 0 : _b.querySelector('[data-k="q"]');
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
    document.body.classList.toggle("cook", isCook());
    if (isCook()) {
      S.view = "kq";
      renderNav();
      loadKq().catch(() => {
      });
      kitchenGate();
    }
  }
  if (S.token) start();
  else showLogin();
})();
