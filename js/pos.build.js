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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
(() => {
  var _a, _b;
  const okV = (x) => /^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(x || "") && x !== "varvar";
  const VENUE = (() => {
    const seg = /(^|\.)posatom\.online$/.test(location.hostname) ? location.pathname.split("/")[1] : null;
    if (seg != null) return okV(seg) ? seg : "";
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
      return true;
    } catch (e) {
      return false;
    }
  } };
  const OPEN_SET = new URLSearchParams(location.hash.slice(1)).get("set") || "";
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
    kst: store.get("kst", ""),
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
    var _a2, _b2, _c;
    const nm = ((_a2 = S.brand) == null ? void 0 : _a2.name) || (VENUE ? "" : "VARVAR");
    document.title = (nm ? nm + " \u2014 " : "") + "\u043A\u0430\u0441\u0430";
    const li = $(".logo-img");
    if (li) {
      if ((_b2 = S.brand) == null ? void 0 : _b2.logo) {
        li.src = S.brand.logo;
        li.classList.add("own");
        li.hidden = false;
      } else if (VENUE) li.hidden = true;
    }
    const at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (at) at.content = nm || "\u041A\u0430\u0441\u0430";
    const mf = document.querySelector('link[rel="manifest"]');
    if (mf && nm) {
      const b = new URL(".", location.href).href;
      mf.href = "data:application/manifest+json," + encodeURIComponent(JSON.stringify({ name: nm + " \u2014 \u043A\u0430\u0441\u0430", short_name: nm, start_url: b + "pos.html", scope: b, id: b + "pos.html", display: "standalone", background_color: "#0b0b0d", theme_color: "#0b0b0d", orientation: "any", icons: [{ src: b + "img/app/pos.png", sizes: "512x512", type: "image/png" }] }));
    }
    const sub = $("#loginBrand");
    if (sub) sub.textContent = VENUE || ((_c = S.brand) == null ? void 0 : _c.logo) ? nm : "";
  }
  applyBrand();
  const realAdmin = () => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.role) === "admin";
  };
  const VIEW_PERM = { cash: ["cash"], reports: ["reports"], calc: ["stock"], team: ["staff", "pay"], settings: ["settings", "print"], closed: ["void", "edit_closed"] };
  const isAdmin = () => {
    var _a2, _b2;
    return realAdmin() || !!((_b2 = (_a2 = S.me) == null ? void 0 : _a2.can) == null ? void 0 : _b2.length) && (VIEW_PERM[S.view] || []).some((k) => S.me.can.includes(k));
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
  const QOPS = /* @__PURE__ */ new Set(["order", "close", "remove", "move", "split", "discount", "kDone", "kStart", "evAck"]), qidNew = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const QN = { order: "\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", close: "\u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F", remove: "\u0441\u043A\u0430\u0441\u0443\u0432\u0430\u043D\u043D\u044F", move: "\u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043D\u044F", split: "\u0440\u043E\u0437\u0434\u0456\u043B\u0435\u043D\u043D\u044F", discount: "\u0437\u043D\u0438\u0436\u043A\u0430", kDone: "\u0433\u043E\u0442\u043E\u0432\u043E", kStart: "\u043A\u0443\u0445\u043D\u044F", evAck: "\u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F" };
  const offQ = () => store.get("offq", []), offSave = (q) => {
    const ok2 = store.set("offq", q);
    offBanner();
    return ok2;
  };
  const netErr = (e) => e instanceof TypeError || /не відповідає|fetch|network|load failed/i.test((e == null ? void 0 : e.message) || "");
  const offNow = () => S.offline || navigator.onLine === false;
  const OFF_LONG = 2 * 6e4;
  function offBanner() {
    const n = offQ().length;
    let el = $("#offq");
    let t0 = +store.get("offAt", 0);
    if (S.offline && !t0) store.set("offAt", t0 = Date.now());
    if (!S.offline && t0) {
      store.set("offAt", 0);
      const dur = Date.now() - t0;
      if (dur >= OFF_LONG && dur < 12 * 36e5 && S.token) fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify({ op: "offLog", from: t0, to: Date.now(), n }) }).catch(() => {
      });
      t0 = 0;
    }
    if (!n && !S.offline) {
      el == null ? void 0 : el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "offq";
      document.body.append(el);
    }
    const at = S.offline && S.cacheAt ? ` \xB7 \u0434\u0430\u043D\u0456 \u043D\u0430 ${new Date(S.cacheAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}` : "";
    const long = S.offline && t0 && Date.now() - t0 >= OFF_LONG;
    el.classList.toggle("long", !!long);
    el.textContent = long ? `\u{1F4F4} \u041D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 ${Math.round((Date.now() - t0) / 6e4)} \u0445\u0432 \u2014 \u0444\u0456\u0441\u043A\u0430\u043B\u044C\u043D\u0456 \u0447\u0435\u043A\u0438 \u043D\u0435 \u0432\u0438\u0434\u0430\u044E\u0442\u044C\u0441\u044F. \u0423\u0432\u0456\u043C\u043A\u043D\u0456\u0442\u044C \u0440\u043E\u0437\u0434\u0430\u0447\u0443 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0443 \u0437 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 (\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u2192 \u0422\u043E\u0447\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u0443)${n ? ` \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456 ${n} \u2014 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456` : ""}` : `\u{1F4F4} ${S.offline ? "\u041D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u2014 \u043A\u0430\u0441\u0430 \u043F\u0440\u0430\u0446\u044E\u0454" : "\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u2026"}${n ? ` \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456 ${n} ${n === 1 ? "\u0434\u0456\u044F" : n < 5 ? "\u0434\u0456\u0457" : "\u0434\u0456\u0439"} \u2014 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456` : ""}${at}`;
  }
  setInterval(() => {
    if (S.offline) offBanner();
  }, 3e4);
  function offOverlay() {
    var _a2;
    const q = offQ();
    if (!q.length || !S.tables) return;
    const by = {};
    (((_a2 = S.menu) == null ? void 0 : _a2.categories) || []).forEach((c) => c.items.forEach((i) => {
      by[i.id] = i;
    }));
    const tb = (t) => {
      var _a3;
      return (_a3 = S.tables)[t] || (_a3[t] = { t, total: 0, pay2: 0, items: [], log: [], orders: 0, opened: Date.now() });
    };
    const add = (b, name, q2, sum) => {
      const k = b.total ? b.pay2 / b.total : 1, r = b.items.find((z) => z.name === name);
      if (r) {
        r.q += q2;
        r.sum += sum;
        r.off = 1;
      } else b.items.push({ name, q: q2, sum, off: 1 });
      b.total += sum;
      b.pay2 = Math.round(b.pay2 + sum * k);
      b.off = 1;
    };
    const sub = (b, name, q2) => {
      const r = b.items.find((z) => z.name === name);
      if (!r) return 0;
      q2 = Math.min(q2, r.q);
      const u = Math.round(r.sum / r.q), k = b.total ? b.pay2 / b.total : 1;
      r.q -= q2;
      r.sum -= u * q2;
      b.total -= u * q2;
      b.pay2 = Math.round(b.pay2 - u * q2 * k);
      if (r.q <= 0) b.items = b.items.filter((z) => z !== r);
      b.off = 1;
      return u * q2;
    };
    for (const x of q) {
      const d = x.data || {}, t = +d.t;
      if (x.op === "order" && t > 0) {
        const b = tb(t), lines = [];
        for (const it of d.items || []) {
          const m = by[it.id];
          if (!m) continue;
          const v = m.variants ? m.variants.find((z) => z.v === it.v) || m.variants[0] : null, name = m.name.uk + (v ? ` ${v.v} ${m.size || "\u043B"}`.trimEnd() : ""), sum = (v ? v.p : m.price) * it.q;
          add(b, name, it.q, sum);
          lines.push(`${it.q}\xD7 ${name} \u2014 ${sum}`);
        }
        b.log = [...b.log || [], { lines, comment: d.comment || "", off: 1, at: x.at }];
        b.orders = (b.orders || 0) + 1;
      } else if (!S.tables[t]) continue;
      else if (x.op === "remove") sub(S.tables[t], d.name, 1);
      else if (x.op === "close") delete S.tables[t];
      else if (x.op === "discount") {
        const b = S.tables[t];
        b.disc = +d.pct || 0;
        b.pay2 = Math.round(b.total * (1 - b.disc / 100));
        b.off = 1;
      } else if (x.op === "move" && +d.to) {
        const a = S.tables[t];
        delete S.tables[t];
        const b = S.tables[+d.to];
        if (b) {
          a.items.forEach((z) => add(b, z.name, z.q, z.sum));
          b.log = [...b.log || [], ...a.log || []];
        } else S.tables[+d.to] = __spreadProps(__spreadValues({}, a), { t: +d.to, off: 1 });
      } else if (x.op === "split" && +d.to) {
        const a = S.tables[t], b = tb(+d.to);
        for (const z of d.items || []) {
          const s = sub(a, z.name, z.q);
          if (s) add(b, z.name, z.q, s);
        }
        if (!a.items.length) delete S.tables[t];
      }
    }
  }
  async function offPre(t) {
    var _a2, _b2, _c;
    const b = S.tables[t];
    if (!((_a2 = b == null ? void 0 : b.items) == null ? void 0 : _a2.length)) return toast("\u0421\u0442\u0456\u043B \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439");
    const now = (/* @__PURE__ */ new Date()).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), due = b.pay2 + (b.tip || 0);
    const lines = [["cfg", 80, 100, 120], ["big", ((_b2 = S.brand) == null ? void 0 : _b2.name) || "\u0420\u0430\u0445\u0443\u043D\u043E\u043A"], ["c", `\u0421\u0442\u0456\u043B ${tn(t)} \xB7 ${now}`], ["c", "\u041F\u0420\u0415\u0427\u0415\u041A \xB7 \u043D\u0435 \u0444\u0456\u0441\u043A\u0430\u043B\u044C\u043D\u0438\u0439 \u0447\u0435\u043A"], ["hr"], ...b.items.map((it) => ["item", `${it.q}\xD7 ${it.name}`, money(it.sum)]), ["hr"], ...b.disc ? [["lr", `\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%`, "\u2212" + money(b.total - b.pay2)]] : [], ...b.tip ? [["lr", "\u0427\u0430\u0439\u043E\u0432\u0456", money(b.tip)]] : [], ["total", "\u0414\u041E \u0421\u041F\u041B\u0410\u0422\u0418", money(due)], ["gap"], ["gap"]];
    let pr = "";
    if ((_c = window.TABP) == null ? void 0 : _c.has()) try {
      await TABP.print(lines);
      pr = "\u{1F5A8} \u041D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u043E \u043D\u0430 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0456 \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0430. ";
    } catch (e) {
      pr = "\u26A0\uFE0F \u041F\u0440\u0438\u043D\u0442\u0435\u0440: " + e.message + ". ";
    }
    modal({ title: `\u{1F9FE} \u041F\u0440\u0435\u0447\u0435\u043A \xB7 \u0441\u0442\u0456\u043B ${tn(t)}`, text: `\u{1F4F4} \u041D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C. ${pr}\u041F\u043E\u043A\u0430\u0436\u0456\u0442\u044C \u0433\u043E\u0441\u0442\u044E \u0435\u043A\u0440\u0430\u043D.`, body: `<div class="rows">${b.items.map((it) => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} \xD7 ${Math.round(it.sum / it.q)} \u20B4</small></div><b class="money">${money(it.sum)}</b></div>`).join("")}${b.disc ? `<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%</div><b class="money">\u2212${money(b.total - b.pay2)}</b></div>` : ""}<div class="row"><div class="nm"><b>\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438</b></div><b class="money" style="font-size:1.3em">${money(due)}</b></div></div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: 1 }] });
  }
  let flushing = false;
  async function offFlush() {
    if (flushing || !offQ().length || !S.token) return;
    flushing = true;
    let sent = 0;
    try {
      for (const x of offQ()) {
        let r;
        try {
          r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op: x.op }, x.data)) }), 15e3);
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
        sent++;
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          toast(`\u26A0\uFE0F \u0417 \u0447\u0435\u0440\u0433\u0438 \u043D\u0435 \u043F\u0440\u043E\u0439\u0448\u043B\u043E (${QN[x.op] || x.op}${x.data.t ? " \u0441\u0442\u0456\u043B " + tn(x.data.t) : ""}): ${errText(j.error || r.status)}`);
        }
      }
      if (sent) toast("\u{1F4F6} \u0417\u0432'\u044F\u0437\u043E\u043A \u0454 \u2014 \u0447\u0435\u0440\u0433\u0430 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430");
      loadState().catch(() => {
      });
      if (S.view === "kq" || isCook()) loadKq().catch(() => {
      });
    } finally {
      flushing = false;
      offBanner();
    }
  }
  const offKick = () => {
    if (offQ().length) offFlush();
    else if (S.offline && S.token) loadState().catch(() => {
    });
  };
  addEventListener("online", offKick);
  addEventListener("offline", () => {
    S.offline = true;
    offBanner();
  });
  setInterval(() => {
    if (offQ().length) offFlush();
  }, 2e4);
  const queue = (op, data) => {
    S.offline = true;
    if (!offSave([...offQ(), { op, data, at: Date.now() }])) throw new Error("\u{1F4F4} \u041D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443, \u0430 \u043F\u0430\u043C'\u044F\u0442\u044C \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u044E \u043D\u0435 \u0434\u0430\u043B\u0430 \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0434\u0456\u044E \u2014 \u0457\u0457 \u041D\u0415 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E. \u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C, \u043A\u043E\u043B\u0438 \u0437\u0432'\u044F\u0437\u043E\u043A \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F");
    try {
      offOverlay();
      render();
    } catch (e) {
    }
    return { ok: true, queued: true };
  };
  async function api(op, data = {}, ms = 12e3) {
    if (QOPS.has(op) && !data.qid) data = __spreadProps(__spreadValues({}, data), { qid: qidNew() });
    if (QOPS.has(op) && offNow() && !(op === "order" && !data.t)) {
      const r2 = queue(op, data);
      setTimeout(offFlush, 500);
      return r2;
    }
    let r;
    try {
      r = await withTimeout(fetch(API + "/api/pos", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + S.token }, body: JSON.stringify(__spreadValues({ op }, data)) }), QOPS.has(op) ? 8e3 : ms);
    } catch (e) {
      if (QOPS.has(op) && netErr(e) && !(op === "order" && !data.t)) return queue(op, data);
      if (netErr(e)) {
        S.offline = true;
        offBanner();
        if (op === "state" || op === "menu") {
          const c = store.get("cache_" + op, null);
          if (c) {
            if (op === "state") S.cacheAt = c._at || 0;
            offBanner();
            return c;
          }
        }
      }
      throw e;
    }
    if (S.offline) {
      S.offline = false;
      S.cacheAt = 0;
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
      store.set("cache_" + op, op === "state" ? __spreadProps(__spreadValues({}, j), { _at: Date.now() }) : j);
    } catch (e) {
    }
    return j;
  }
  const act = async (op, data, okMsg) => {
    try {
      const r = await api(op, data);
      if ((r == null ? void 0 : r.queued) && op !== "order" && op !== "close") toast(`\u{1F4F4} ${okMsg || QN[op] || "\u0414\u0456\u044F"} \u2014 \u0431\u0435\u0437 \u0437\u0432'\u044F\u0437\u043A\u0443, \u0443 \u0447\u0435\u0440\u0437\u0456, \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456`);
      else if (okMsg) toast(okMsg);
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
  let regCodeV = "", regRoleV = "";
  function showReg(role, code) {
    regCodeV = code;
    regRoleV = role;
    pin = "";
    dots();
    {
      const adm = role === "admin";
      $("#rPin").placeholder = adm ? "\u041F\u0440\u0438\u0434\u0443\u043C\u0430\u0439\u0442\u0435 PIN \u2014 6\u20138 \u0446\u0438\u0444\u0440" : "\u041F\u0440\u0438\u0434\u0443\u043C\u0430\u0439\u0442\u0435 PIN \u2014 4 \u0446\u0438\u0444\u0440\u0438";
    }
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
    i.value = i.value.replace(/\D/g, "").slice(0, 8);
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
    if (!(regRoleV === "admin" ? /^\d{6,8}$/ : /^\d{4}$/).test(p1)) {
      $("#lErr").textContent = regRoleV === "admin" ? "PIN \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 \u2014 \u0432\u0456\u0434 6 \u0434\u043E 8 \u0446\u0438\u0444\u0440" : "PIN \u2014 \u0440\u0456\u0432\u043D\u043E 4 \u0446\u0438\u0444\u0440\u0438";
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
    if (!S.tpInit && window.TABP) {
      S.tpInit = 1;
      TABP.init({ api, toast, ask, base: API });
    }
    S.me = __spreadValues(__spreadValues({}, S.me), r.me);
    S.myTip = r.myTip;
    S.myAtt = r.myAtt || null;
    S.books = r.books || [];
    S.wl = r.wl || [];
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
    offOverlay();
    const fresh = r.events.filter((e) => !S.seen.has(e.id));
    if (S.ready && fresh.some((e) => ["guest", "check", "call"].includes(e.k) || !isCook() && ["ready", "kmsg"].includes(e.k))) ding();
    r.events.forEach((e) => S.seen.add(e.id));
    const prevEv = S.events;
    S.events = r.events;
    if (S.ready) evNotify(prevEv);
    S.ready = true;
    if (!S._tk0) {
      S._tk0 = 1;
      loadMyTasks();
      loadLookV();
      if (location.hash === "#course") {
        S.view = "course";
        history.replaceState(null, "", location.pathname + location.search);
        renderNav();
        renderMain();
      }
      if (OPEN_SET && isAdmin()) {
        S.view = "settings";
        S.setTab = OPEN_SET;
        renderNav();
        renderMain();
        loadView();
      }
    }
    if (isCour() && S.view === "go") renderMain();
    render();
  }
  async function loadMenu() {
    const r = await api("menu");
    S.menu = r.menu;
    S.fav = r.fav || [];
    S.groups = r.groups || [];
    if (offQ().length && S.ready) loadState().catch(() => {
    });
    if (S.open) renderSheet();
    if (["stop", "menu", "reports", "calc"].includes(S.view)) renderMain();
  }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0, wsBack = 2e3;
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
      wsBack = 2e3;
      lastMsg = Date.now();
      liveDot();
      if (offQ().length) offFlush();
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
        var _a2;
        m = { keys: [...pendKeys] };
        pendKeys.clear();
        if (m.keys.some((k) => k !== "tpq")) loadState().catch(() => {
        });
        if (m.keys.includes("menu") || m.keys.includes("fav")) loadMenu().catch(() => {
        });
        if (m.keys.includes("kq") && (isCook() || S.view === "kq")) loadKq().catch(() => {
        });
        if (m.keys.includes("tpq")) (_a2 = window.TABP) == null ? void 0 : _a2.check();
        if (m.keys.includes("lookv")) loadLookV();
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
      if (S.token) {
        wsTimer = setTimeout(connect, wsBack);
        wsBack = Math.min(wsBack * 2, 3e4);
      }
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
  {
    let sx = 0, sy = 0, mode = "";
    document.addEventListener("touchstart", (e) => {
      const t = e.touches[0], f = $("#feed");
      mode = "";
      if (!f || innerWidth > 980 || e.touches.length > 1) return;
      sx = t.clientX;
      sy = t.clientY;
      if (f.classList.contains("open")) mode = f.contains(e.target) ? "close" : "";
      else if (S.view === "hall" && !S.open && !document.querySelector(".modal-bg,.modal") && sx > innerWidth - 24 && !e.target.closest('input,textarea,[style*="overflow"],.zones,.tabs,.nav,.f3w')) mode = "open";
    }, { passive: true });
    document.addEventListener("touchend", (e) => {
      if (!mode) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy), f = $("#feed");
      if (dy < 50 && Math.abs(dx) > dy * 2 && (mode === "open" ? dx < -60 : dx > 70)) f.classList.toggle("open", mode === "open");
      mode = "";
    }, { passive: true });
  }
  {
    let d = null;
    const atTop = (t, m) => {
      for (let n = t; n && n !== m.parentNode; n = n.parentNode) if (n.scrollTop > 0) return false;
      return true;
    };
    document.addEventListener("touchstart", (e) => {
      var _a2, _b2;
      d = null;
      if (innerWidth > 600 || e.touches.length > 1) return;
      const m = (_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, ".modal-bg > .modal");
      if (!m || e.target.closest("input[type=range],textarea,canvas,.nodrag")) return;
      const p = e.touches[0];
      if (p.clientY - m.getBoundingClientRect().top > 70 && !atTop(e.target, m)) return;
      d = { m, y: p.clientY, x: p.clientX, dy: 0, on: false };
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (!d) return;
      const p = e.touches[0], dy = p.clientY - d.y, dx = Math.abs(p.clientX - d.x);
      if (!d.on) {
        if (dx > 12 && dx > dy || dy < -6) {
          d = null;
          return;
        }
        if (dy > 10) d.on = true;
        else return;
      }
      d.dy = Math.max(0, dy);
      d.m.style.transition = "none";
      d.m.style.transform = `translateY(${d.dy}px)`;
    }, { passive: true });
    document.addEventListener("touchend", () => {
      var _a2;
      if (!d) return;
      const { m, dy, on: on2 } = d;
      d = null;
      if (!on2) return;
      if (dy > Math.min(120, m.offsetHeight * 0.25)) {
        const bg = m.parentNode;
        m.style.transition = "transform .18s";
        m.style.transform = "translateY(100%)";
        (_a2 = navigator.vibrate) == null ? void 0 : _a2.call(navigator, 8);
        setTimeout(() => {
          bg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          if (bg.isConnected) {
            m.style.transform = "";
          }
        }, 170);
      } else {
        m.style.transition = "transform .2s";
        m.style.transform = "";
        setTimeout(() => {
          m.style.transition = "";
        }, 220);
      }
    });
  }
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
    var _a2, _b2;
    try {
      const L = look(), sn = SOUNDS[k || L.sound] || SOUNDS.classic, vol = ((_a2 = L.vol) != null ? _a2 : 70) / 100 * 0.35 + 2e-4;
      actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
      (_b2 = actx.resume) == null ? void 0 : _b2.call(actx);
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
  const THEMES = VVSkin.THEMES;
  const FONTS = { system: ["\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0438\u0439 (iOS)", ""], inter: ["Inter", "Inter"], manrope: ["Manrope", "Manrope"], rubik: ["Rubik", "Rubik"], nunito: ["Nunito", "Nunito"], montserrat: ["Montserrat", "Montserrat"], roboto: ["Roboto", "Roboto"], comfortaa: ["Comfortaa", "Comfortaa"], mono: ["JetBrains Mono", "JetBrains Mono"], pt: ["PT Sans", "PT Sans"] };
  const look = () => __spreadValues({ theme: "night", font: "system", nfont: "same", size: 100, radius: "round", sound: "classic", vol: 70, anim: 1, accent: "" }, store.get("look", {}));
  function applyLook() {
    const L = look(), r = document.documentElement.style;
    const base = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
    r.setProperty("--font", base);
    r.setProperty("--nfont", "var(--font)");
    r.setProperty("--r", "18px");
    r.setProperty("--r2", "24px");
    document.body.style.zoom = L.size === 100 ? "" : L.size / 100;
    applySkin();
  }
  const { BASE: SK_BASE, PRE: SK_PRE } = VVSkin;
  const lookDev = () => {
    const L = look();
    return { own: L.own ? 1 : 0, sk: "sk" in L ? L.sk : void 0, ct: L.theme, ca: L.accent };
  };
  const skinOf = () => VVSkin.resolve(S.lookV, lookDev()).K;
  function applySkin(over) {
    const K = over ? (VVSkin.apply(over), over) : VVSkin.paint(S.lookV, lookDev());
    document.body.classList.toggle("noanim", K && !K.anim || !look().anim);
  }
  async function loadLookV() {
    try {
      const r = await api("lookV");
      S.lookV = r.look || null;
      applyLook();
    } catch (e) {
    }
  }
  const setLook = (k, v) => {
    store.set("look", __spreadProps(__spreadValues({}, look()), { [k]: v }));
    applyLook();
    renderMain();
  };
  applyLook();
  const NAV_COOK = [["kq", "\u{1F468}\u200D\u{1F373}", "\u0427\u0435\u0440\u0433\u0430"], ["calc", "\u{1F4E6}", "\u0421\u043A\u043B\u0430\u0434"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["course", "\u{1F393}", "\u041D\u0430\u0432\u0447\u0430\u043D\u043D\u044F"]];
  const NAV_A = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["books", "\u{1F4C5}", "\u0411\u0440\u043E\u043D\u0456"], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430"], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438"], ["calc", "\u{1F4E6}", "\u0421\u043A\u043B\u0430\u0434"], ["team", "\u{1F465}", "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B"], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442."], ["course", "\u{1F393}", "\u041D\u0430\u0432\u0447\u0430\u043D\u043D\u044F"]];
  const NAV_MAIN = ["hall", "kq", "cash", "books"];
  const NAV_W = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["books", "\u{1F4C5}", "\u0411\u0440\u043E\u043D\u0456"], ["closed", "\u{1F9FE}", "\u0427\u0435\u043A\u0438"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["course", "\u{1F393}", "\u041D\u0430\u0432\u0447\u0430\u043D\u043D\u044F"]];
  const NAV_COUR = [["go", "\u{1F6F5}", "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438"], ["course", "\u{1F393}", "\u041D\u0430\u0432\u0447\u0430\u043D\u043D\u044F"]];
  const can = (k) => {
    var _a2;
    return ((_a2 = S.me) == null ? void 0 : _a2.can) ? S.me.can.includes(k) : realAdmin();
  };
  const modOn = (k) => {
    var _a2, _b2, _c;
    const m = (_c = ((_b2 = (_a2 = S.data) == null ? void 0 : _a2.staff) == null ? void 0 : _b2.cfg) || S.cfg) == null ? void 0 : _c.mods;
    return !m || !!m[k];
  };
  const NAV_PERM = { cash: "cash", reports: "reports", calc: "stock", team: "staff", settings: "settings" };
  const navList = () => {
    var _a2, _b2;
    if (isCour()) return NAV_COUR;
    if (isCook()) return ((_b2 = (_a2 = S.me) == null ? void 0 : _a2.can) == null ? void 0 : _b2.length) ? [...NAV_COOK, ...NAV_A.filter(([v]) => NAV_PERM[v] && can(NAV_PERM[v]) && !NAV_COOK.some((x) => x[0] === v))] : NAV_COOK;
    if (realAdmin()) return NAV_A.filter(([v]) => !NAV_PERM[v] || can(NAV_PERM[v]));
    return [...NAV_W, ...NAV_A.filter(([v]) => NAV_PERM[v] && can(NAV_PERM[v]))];
  };
  const NAV = [["hall", "\u{1FA91}", "\u0417\u0430\u043B"], ["closed", "\u{1F4DC}", "\u0417\u0430\u043A\u0440\u0438\u0442\u0456"], ["stop", "\u26D4", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"], ["cash", "\u{1F4B0}", "\u041A\u0430\u0441\u0430", 1], ["reports", "\u{1F4CA}", "\u0417\u0432\u0456\u0442\u0438", 1], ["kq", "\u{1F468}\u200D\u{1F373}", "\u041A\u0443\u0445\u043D\u044F", 1], ["calc", "\u{1F9EE}", "\u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A", 1], ["settings", "\u2699\uFE0F", "\u041D\u0430\u043B\u0430\u0448\u0442.", 1]];
  function renderNav() {
    var _a2, _b2, _c;
    const newCnt = S.events.filter((e) => e.k === "guest" && e.s === "new").length;
    const attNew = realAdmin() ? S.events.filter((e) => e.k === "att" && e.s === "new").length : 0;
    const nv = $("#nav"), nx = (nv == null ? void 0 : nv.scrollLeft) || 0, ny = (nv == null ? void 0 : nv.scrollTop) || 0;
    setHTML(nv, `<div class="brand">${brandImg()}</div>` + navList().map(([v, ic, l]) => `<button data-n="${v}" class="${S.view === v ? "on" : ""}${realAdmin() && !NAV_MAIN.includes(v) ? " more-i" : ""}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}${v === "team" && attNew ? `<span class="badge">${attNew}</span>` : ""}${v === "books" && S.bkNew ? `<span class="badge">${S.bkNew}</span>` : ""}</button>`).join("") + `<button class="feed-btn" data-a="feed"><span class="ic">\u{1F514}</span>\u0421\u0442\u0440\u0456\u0447\u043A\u0430${newCnt ? `<span class="badge">${newCnt}</span>` : S.events.some(evMention) ? '<span class="badge">@</span>' : ""}</button><button class="more-btn ${realAdmin() && !NAV_MAIN.includes(S.view) ? "on" : ""}" data-a="more"><span class="ic">\u22EF</span>\u0429\u0435</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="\u041D\u0430 \u0432\u0435\u0441\u044C \u0435\u043A\u0440\u0430\u043D"><span class="ic">\u26F6</span>\u0415\u043A\u0440\u0430\u043D</button><button class="me" data-a="zpMy" title="\u041C\u0456\u0439 \u043A\u0430\u0431\u0456\u043D\u0435\u0442"><i>${((_a2 = S.me) == null ? void 0 : _a2.av) ? `<img src="${esc(S.me.av)}" alt="">` : esc((((_b2 = S.me) == null ? void 0 : _b2.name) || "?").slice(0, 1).toUpperCase())}${onShift() ? '<em class="sh-dot"></em>' : ""}</i>${S.taskN ? `<span class="badge" title="\u0417\u0430\u0432\u0434\u0430\u043D\u044C \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456">${S.taskN}</span>` : ""}<b>${esc((_c = S.me) == null ? void 0 : _c.name)}</b><small>${isAdmin() ? "\u0430\u0434\u043C\u0456\u043D" : isCook() ? "\u043A\u0443\u0445\u0430\u0440" : isCour() ? "\u043A\u0443\u0440'\u0454\u0440" : "\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442"} \xB7 \u043A\u0430\u0431\u0456\u043D\u0435\u0442</small></button><button data-a="switch"><span class="ic">\u{1F512}</span>\u0412\u0438\u0439\u0442\u0438</button>`);
    if (nv && ny) nv.scrollTop = ny;
    if (nv && nv.scrollWidth > nv.clientWidth) {
      nv.scrollLeft = nx;
      const on2 = nv.querySelector("button.on"), moved = renderNav.v !== S.view;
      renderNav.v = S.view;
      if (on2 && moved && (on2.offsetLeft < nv.scrollLeft || on2.offsetLeft + on2.offsetWidth > nv.scrollLeft + nv.clientWidth)) nv.scrollLeft = on2.offsetLeft - 8;
    }
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
      if (S.view === "cash" && S.cashTab === "bank") S.data.bank = await api("bankList", { m: S.bankM || "" });
      if (S.view === "cash" && S.cashTab !== "checks" && S.cashTab !== "bank") {
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
        if (!S.menu) await loadMenu();
      }
      if (["stop", "menu"].includes(S.view) && !S.menu) await loadMenu();
    } catch (e) {
    }
    renderMain();
  }
  function renderMain() {
    var _a2, _b2, _c;
    const v = S.view, m = $("#main");
    m.classList.toggle("hall", v === "hall");
    if (v === "hall") {
      const [c, r] = hallGrid(m);
      m.style.setProperty("--cols", c);
      m.style.setProperty("--rows", r);
    }
    const html = (_b2 = (_a2 = { books: booksHTML, go: goHTML, kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, team: teamHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML, course: courseHTML, mylook: () => `<div class="rhead"><div><h1>\u{1F3A8} \u041C\u0456\u0439 \u0432\u0438\u0433\u043B\u044F\u0434</h1><span class="muted">${isAdmin() ? "\u0437\u0430\u043A\u043B\u0430\u0434 \u0430\u0431\u043E \u043B\u0438\u0448\u0435 \u0446\u0435\u0439 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439" : "\u043A\u043E\u043B\u0456\u0440 \u0456 \u0441\u0442\u0438\u043B\u044C \u043B\u0438\u0448\u0435 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457"}</span></div></div>` + lookHTML() })[v]) == null ? void 0 : _b2.call(_a2);
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
    var _a2, _b2;
    return r3((((_a2 = x.st) == null ? void 0 : _a2.k) || 0) + (((_b2 = x.st) == null ? void 0 : _b2.b) || 0));
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
  const SK_TABS = () => isCook() ? [["stock", "\u{1F4E6} \u0421\u043A\u043B\u0430\u0434"], ["inv", "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456"], ["prod", "\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438"], ["count", "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F"], ["tech", "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438"]] : [["stock", "\u{1F4E6} \u0417\u0430\u043B\u0438\u0448\u043A\u0438"], ["inv", "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456"], ["sup", "\u{1F3ED} \u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0438"], ["buy", "\u{1F6D2} \u0417\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044F"], ["cards", "\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438"], ["prod", "\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438"], ["count", "\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F"], ["rep", "\u{1F4CA} \u041F\u043B\u044E\u0441\u0438 / \u043C\u0456\u043D\u0443\u0441\u0438"], ["ex", "\u{1F37E} \u0410\u043A\u0446\u0438\u0437"], ["menu", "\u{1F4D6} \u041C\u0435\u043D\u044E"], ["stop", "\u26D4 \u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442"]];
  S.sk = { tab: "stock", q: "", q2: "", cq: "", wh: "", cat: "", flt: "", cf: {}, cwh: "k", p: "w", draft: null, card: null };
  const skBusy = () => {
    var _a2, _b2;
    return S.sk.draft || S.sk.card || ((_b2 = (_a2 = document.activeElement) == null ? void 0 : _a2.closest) == null ? void 0 : _b2.call(_a2, "#main")) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  };
  const hhK = (t) => new Date(t).toLocaleTimeString("uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit" });
  const WDL = ["\u043D\u0434", "\u043F\u043D", "\u0432\u0442", "\u0441\u0440", "\u0447\u0442", "\u043F\u0442", "\u0441\u0431"];
  const curMon = () => {
    var _a2, _b2;
    const d = new Date(Date.now() - ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b2 : 3) * 36e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const todayK = () => {
    var _a2, _b2;
    return iso(Date.now() - ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b2 : 3) * 36e5);
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
        var _a2, _b2;
        if (e.target === el) return modalResolve(null);
        const i = (_a2 = e.target.closest("[data-mi]")) == null ? void 0 : _a2.dataset.mi;
        if (i != null) return modalResolve(buttons[+i].val);
        const pk = (_b2 = e.target.closest("[data-mi-v]")) == null ? void 0 : _b2.dataset.miV;
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
  function toast(msg, btn) {
    var _a2;
    (_a2 = $(".toast")) == null ? void 0 : _a2.remove();
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = msg;
    if (btn) {
      const b = document.createElement("button");
      b.className = "btn sm";
      b.textContent = btn.label;
      b.style.marginLeft = "10px";
      b.onclick = () => {
        d.remove();
        btn.fn();
      };
      d.append(b);
    }
    document.body.append(d);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), btn ? 9e3 : 2600);
  }
  document.addEventListener("change", (e) => {
    var _a2;
    const el = e.target;
    if (((_a2 = el.dataset) == null ? void 0 : _a2.a) !== "cDate" || !el.value) return;
    S.cday = el.value >= S.data.ctoday ? "" : el.value;
    S.data.closed = null;
    renderMain();
    loadView();
  });
  document.addEventListener("change", async (e) => {
    var _a2, _b2;
    const el = e.target;
    if (((_a2 = el.dataset) == null ? void 0 : _a2.a) !== "bkDate" || !el.value) return;
    S.bkDay = el.value;
    if (!((_b2 = S.data.bk) == null ? void 0 : _b2.some((b) => b.date === el.value)) && (el.value < addD(todayK(), -7) || el.value > addD(todayK(), 60))) {
      const r = await api("bkList", { from: el.value, to: el.value, all: true }).catch(() => null);
      if (r) S.data.bk = [...S.data.bk.filter((b) => b.date !== el.value), ...r.list];
    }
    renderMain();
  });
  const ACT = {};
  function on(names, fn) {
    for (const x of [].concat(names)) {
      if (ACT[x]) console.error("\u{1F5B1} \u0434\u0443\u0431\u043B\u044C \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A\u0430 \u043A\u043D\u043E\u043F\u043A\u0438", x);
      ACT[x] = fn;
    }
  }
  document.addEventListener("click", async (e) => {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a, t = S.open;
    if (ACT[a]) return ACT[a](el, e, a, t);
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
        const on2 = !document.fullscreenElement;
        store.set("fs", on2);
        on2 ? (_b2 = (_a2 = document.documentElement).requestFullscreen) == null ? void 0 : _b2.call(_a2).catch(() => {
        }) : (_c = document.exitFullscreen) == null ? void 0 : _c.call(document);
        break;
      }
      case "more": {
        const v = await choose("\u0429\u0435", "", (isCook() ? navList() : realAdmin() ? navList().filter((n) => !NAV_MAIN.includes(n[0])) : NAV.filter((n) => !n[3] && ["stop", "menu", "calc"].includes(n[0]))).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: "\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F", val: "push" }, { label: "\u{1F512} \u0412\u0438\u0439\u0442\u0438", val: "logout", cls: "red" }]));
        if (v === "push") pushMenu();
        else if (v === "logout") {
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
      case "kFont":
        S.kFont = S.kFont % 3 + 1;
        store.set("kfont", S.kFont);
        renderMain();
        break;
      case "rp":
        S.rep.p = el.dataset.p;
        loadView();
        break;
      case "rFo":
        S.rep.fo = !S.rep.fo;
        renderMain();
        break;
      case "certPay":
        if (await act("certPay", { code: el.dataset.c, how: el.dataset.h }, el.dataset.h === "no" ? "\u274C \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" : "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E")) loadState().catch(() => {
        });
        break;
      case "certDel": {
        const code = el.dataset.c;
        if (!await choose("\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442?", code + " \u2014 \u043A\u043E\u0434 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435 \u0434\u0456\u044F\u0442\u0438. \u0426\u0435 \u043D\u0435 \u043C\u043E\u0436\u043D\u0430 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438.", [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438", val: 1, cls: "red" }, { label: "\u041D\u0456", val: 0 }])) break;
        if (await act("certDel", { code }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) {
          (_d = el.closest(".kv")) == null ? void 0 : _d.remove();
        }
        break;
      }
      case "certs": {
        const r = await api("certList").catch(() => null);
        if (!r) break;
        await modal({ title: "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", body: `<div class="bk-list">${r.list.map((c) => `<div class="kv"><span><b>${c.code}</b> \xB7 ${money(c.sum)}${c.left !== c.sum ? ` \xB7 \u0437\u0430\u043B\u0438\u0448\u043E\u043A ${money(c.left)}` : ""}<br><small class="muted">\u0432\u0456\u0434 ${esc(c.from)}${c.to ? " \u0434\u043B\u044F " + esc(c.to) : ""} \xB7 ${fmtPh(c.phone)} \xB7 ${{ new: "\u23F3 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E", ok: "\u2705 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0439", no: "\u274C \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" }[c.st]}</small></span>${c.st === "new" ? `<span class="kv-r"><button class="btn sm green" data-a="certPay" data-c="${c.code}" data-h="cash">\u{1F4B5}</button><button class="btn sm" data-a="certPay" data-c="${c.code}" data-h="card">\u{1F4B3}</button><button class="btn sm red" data-a="certDel" data-c="${c.code}">\u{1F5D1}</button></span>` : `<span class="kv-r"><button class="btn sm red" data-a="certDel" data-c="${c.code}">\u{1F5D1}</button></span>`}</div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
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
        const n = await ask("\u{1F464} \u041A\u0443\u0440'\u0454\u0440 (\u0456\u043C\u02BC\u044F)", ((_f = (_e = S.tables[t]) == null ? void 0 : _e.go) == null ? void 0 : _f.cour) || "");
        if (n != null && await act("goCour", { t, n }, "\u2714")) loadState().catch(() => {
        });
        break;
      }
      case "pre":
        if (offNow()) {
          offPre(t);
          break;
        }
        api("precheck", { t }).then(() => toast("\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E"), (e2) => netErr(e2) ? offPre(t) : e2.message !== "auth" && toast("\u26A0\uFE0F " + errText(e2.message)));
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
      case "accept":
        act("accept", { oid: el.dataset.oid }, "\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0442\u043E \u2014 \u043F\u0456\u0448\u043B\u043E \u043D\u0430 \u043A\u0443\u0445\u043D\u044E");
        break;
      case "cBack":
        if (await confirmBox("\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0447\u0430\u0439\u043E\u0432\u0456 \u0437\u043D\u043E\u0432\u0443 \u0437\u0430\u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F")) {
          await act("closedBack", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443");
          loadView();
        }
        break;
      case "cPrint":
        act("closedPrint", { ref: el.dataset.ref, day: S.data.cday }, "\u{1F5A8} \u0427\u0435\u043A \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
        break;
      case "cRefund":
        if (await confirmBox(`\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0433\u043E\u0441\u0442\u044E ${money(+el.dataset.s)} \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443?`, "\u0413\u0440\u043E\u0448\u0456 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0447\u0435\u0440\u0435\u0437 LiqPay (1\u20137 \u0434\u043D\u0456\u0432), \u0447\u0435\u043A \u0437\u043D\u0456\u043C\u0435\u0442\u044C\u0441\u044F \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438")) await act("closedRefund", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0433\u043E\u0441\u0442\u044E");
        loadView();
        break;
      case "cDel":
        if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438?", "\u0421\u0443\u043C\u0430, \u0441\u0442\u0440\u0430\u0432\u0438 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u043D\u0456\u043C\u0443\u0442\u044C\u0441\u044F \u0437\u0456 \u0437\u0432\u0456\u0442\u0456\u0432")) await act("closedDel", { ref: el.dataset.ref, day: S.data.cday }, "\u{1F9F9} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438");
        loadView();
        break;
      case "pQMove": {
        const r = await api("rcptGet", {}).catch(() => null), st = ((_g = r == null ? void 0 : r.route) == null ? void 0 : _g.st) || [];
        if (!st.length) {
          toast("\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440\u0438 \u0449\u0435 \u043D\u0435 \u0440\u043E\u0437\u043F\u043E\u0434\u0456\u043B\u0435\u043D\u0456 \u2014 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u2192 \u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440");
          break;
        }
        closeModal();
        const sid = await choose("\u{1F501} \u041D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u043D\u0430 \u0456\u043D\u0448\u043E\u043C\u0443", "\u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F \u043F\u0435\u0440\u0435\u0439\u0434\u0435 \u043D\u0430 \u0432\u0438\u0431\u0440\u0430\u043D\u0438\u0439 \u043F\u0440\u0438\u043D\u0442\u0435\u0440", st.map((x) => ({ label: "\u{1F5A8} " + x.name, val: x.id })));
        if (sid && await act("printMove", { id: el.dataset.id, st: sid }, "\u{1F501} \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E")) {
          const sm = (_h = el.closest("[data-pq]")) == null ? void 0 : _h.querySelector("small");
          if (sm) sm.textContent = sm.textContent.replace(/ · 🖨 .*$/, "") + " \xB7 \u{1F5A8} " + st.find((x) => x.id === sid).name;
        }
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
        if (await act("printClear", { id: el.dataset.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) (_i = el.closest("[data-pq]")) == null ? void 0 : _i.remove();
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
        const sum = v && +$("#eSum").value.replace(",", "."), note = v && $("#eNote").value, day = v && ((_j = $("#eDay")) == null ? void 0 : _j.value) !== todayK() ? ((_k = $("#eDay")) == null ? void 0 : _k.value) || "" : "";
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
      case "cfg": {
        const k = el.dataset.k, L = { tables: ["\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0441\u0442\u043E\u043B\u0456\u0432 \u0443 \u0437\u0430\u043B\u0456", "\u0432\u0456\u0434 1 \u0434\u043E 200"], discMax: ["\u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430, %", "\u0432\u0456\u0434 0 \u0434\u043E 100"], scanMin: ["\u0425\u0432\u0438\u043B\u0438\u043D \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", "\u0432\u0456\u0434 10 \u0434\u043E 600"], foodCost: ["\u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442, %", "\u0432\u0456\u0434 5 \u0434\u043E 90"], recBonus: ["\u041F\u0440\u0435\u043C\u0456\u044F \u043A\u043E\u0436\u043D\u043E\u043C\u0443 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456 \u0437\u0430 \u0440\u0435\u043A\u043E\u0440\u0434 \u0434\u043D\u044F, \u20B4", "0 \u2014 \u0431\u0435\u0437 \u043F\u0440\u0435\u043C\u0456\u0457"], bankFee: ["\u041A\u043E\u043C\u0456\u0441\u0456\u044F \u0431\u0430\u043D\u043A\u0443 \u0437\u0430 \u043A\u0430\u0440\u0442\u0443/\u043E\u043D\u043B\u0430\u0439\u043D, %", "\u0432\u0456\u0434 0 \u0434\u043E 10, \u043D\u0430\u043F\u0440. 1.3"], priceAlert: ["\u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434, %", "\u0432\u0456\u0434 1 \u0434\u043E 100"], lateMin: ["\u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u2014 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0456\u043B\u044C\u043A\u043E\u0445 \u0445\u0432\u0438\u043B\u0438\u043D", "\u0432\u0456\u0434 0 \u0434\u043E 120"], lateFine: ["\u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F, \u20B4", "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443"], dayH: ["\u041E \u043A\u043E\u0442\u0440\u0456\u0439 \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F \u0440\u043E\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C (\u0433\u043E\u0434\u0438\u043D\u0430)", "\u0432\u0456\u0434 0 \u0434\u043E 8, \u043D\u0430\u043F\u0440. 3"] }[k];
        const v = await ask(L[0], L[1], "number");
        if (v != null && v !== "") {
          await act("cfgSet", { k, v: +String(v).replace(",", ".") }, "\u2699\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
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
    var _a2, _b2, _c;
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
        var _a3, _b3;
        return +((_b3 = (_a3 = l.loss) != null ? _a3 : x == null ? void 0 : x.loss) != null ? _b3 : 0);
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
        ((_b2 = K.card).costCh || (_b2.costCh = {}))[x.id] = v;
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
    var _a2, _b2;
    if (store.get("fs", false) && !document.fullscreenElement && matchMedia("(min-width: 900px)").matches) (_b2 = (_a2 = document.documentElement).requestFullscreen) == null ? void 0 : _b2.call(_a2).catch(() => {
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
    var _a2, _b2;
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
      (_b2 = navigator.vibrate) == null ? void 0 : _b2.call(navigator, 10);
      goBack();
    }
  });
  const myVer = (((_a = document.querySelector('script[src*="pos.build.js"]')) == null ? void 0 : _a.getAttribute("src")) || "").split("v=")[1];
  async function checkVer() {
    try {
      const h = await (await fetch("pos.html?u=" + Date.now(), { cache: "no-store" })).text();
      const v = (h.match(/pos\.build\.js\?v=(\w+)/) || [])[1];
      if (v && myVer && v !== myVer && !S.open && !$("#modal")) location.replace(location.pathname + "?v=" + v);
    } catch (e) {
    }
  }
  setInterval(checkVer, 5 * 6e4);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkVer());
  setTimeout(checkVer, 3e3);
  const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const pushCan = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && location.protocol === "https:";
  const installHow = () => isIOS() ? "1. \u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u043A\u0430\u0441\u0443 \u0432 Safari\n2. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u041F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F\xBB (\u043A\u0432\u0430\u0434\u0440\u0430\u0442 \u0437\u0456 \u0441\u0442\u0440\u0456\u043B\u043A\u043E\u044E)\n3. \xAB\u041D\u0430 \u043F\u043E\u0447\u0430\u0442\u043A\u043E\u0432\u0438\u0439 \u0435\u043A\u0440\u0430\u043D\xBB \u2192 \xAB\u0414\u043E\u0434\u0430\u0442\u0438\xBB\n4. \u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u043A\u0430\u0441\u0443 \u0437 \u0456\u043A\u043E\u043D\u043A\u0438 \u0439 \u0443\u0432\u0456\u043C\u043A\u043D\u0456\u0442\u044C \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F" : "1. \u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u043A\u0430\u0441\u0443 \u0432 Chrome\n2. \u041C\u0435\u043D\u044E \u22EE \u2192 \xAB\u0412\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0438 \u0434\u043E\u0434\u0430\u0442\u043E\u043A\xBB \u0430\u0431\u043E \xAB\u0414\u043E\u0434\u0430\u0442\u0438 \u043D\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D\xBB\n3. \u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u043A\u0430\u0441\u0443 \u0437 \u0456\u043A\u043E\u043D\u043A\u0438";
  const u8 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function pushSubNow() {
    var _a2;
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") throw new Error("\u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u0456 \u2014 \u0434\u043E\u0437\u0432\u043E\u043B\u044C\u0442\u0435 \u0457\u0445 \u0443 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u0445 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0434\u043B\u044F \u043A\u0430\u0441\u0438");
    const k = S.pushK || (S.pushK = await api("pushKey"));
    if (!k.on) throw new Error("\u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0449\u0435 \u043D\u0435 \u043D\u0430\u043B\u0430\u0448\u0442\u043E\u0432\u0430\u043D\u0456 \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456");
    const reg = await navigator.serviceWorker.register("pos-sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && ((_a2 = sub.options) == null ? void 0 : _a2.applicationServerKey) && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== k.key) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) });
    await api("pushSub", { sub: sub.toJSON() });
    return sub;
  }
  async function pushMenu() {
    if (!S.pushK) api("pushKey").then((k) => {
      S.pushK = k;
    }).catch(() => {
    });
    if (isIOS() && !isApp()) return modal({ title: "\u{1F4F2} \u0421\u043F\u0435\u0440\u0448\u0443 \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u0456\u0442\u044C \u043A\u0430\u0441\u0443", text: "\u041D\u0430 iPhone \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u043F\u0440\u0430\u0446\u044E\u044E\u0442\u044C \u043B\u0438\u0448\u0435 \u0432 \u043A\u0430\u0441\u0456, \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0456\u0439 \u043D\u0430 \u0435\u043A\u0440\u0430\u043D (iOS 16.4+).\n\n" + installHow(), buttons: [{ label: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E", val: null }] });
    if (!pushCan()) return modal({ title: "\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F", text: "\u0426\u0435\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F. \u0412\u0441\u0442\u0430\u043D\u043E\u0432\u0456\u0442\u044C \u043A\u0430\u0441\u0443 \u044F\u043A \u0434\u043E\u0434\u0430\u0442\u043E\u043A:\n\n" + installHow(), buttons: [{ label: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E", val: null }] });
    const reg = await navigator.serviceWorker.getRegistration(), sub = await (reg == null ? void 0 : reg.pushManager.getSubscription()), on2 = !!sub && Notification.permission === "granted";
    const v = await modal({ title: on2 ? "\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0443\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u0456" : "\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0432 \u0448\u0442\u043E\u0440\u043A\u0443", text: on2 ? "\u041D\u043E\u0432\u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0439 \u0432\u0430\u0436\u043B\u0438\u0432\u0456 \u043F\u043E\u0434\u0456\u0457 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u0438\u043C\u0443\u0442\u044C \u043D\u0430 \u0446\u0435\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u043D\u0430\u0432\u0456\u0442\u044C \u043A\u043E\u043B\u0438 \u0432\u0456\u043D \u0437\u0430\u0431\u043B\u043E\u043A\u043E\u0432\u0430\u043D\u0438\u0439." : "\u041E\u0442\u0440\u0438\u043C\u0443\u0439\u0442\u0435 \u043D\u043E\u0432\u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0439 \u0432\u0430\u0436\u043B\u0438\u0432\u0456 \u043F\u043E\u0434\u0456\u0457 \u043D\u0430 \u0446\u0435\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u2014 \u043D\u0430\u0432\u0456\u0442\u044C \u043D\u0430 \u0437\u0430\u0431\u043B\u043E\u043A\u043E\u0432\u0430\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D." + (isApp() ? "" : "\n\n\u{1F4A1} \u041A\u0440\u0430\u0449\u0435 \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0438 \u043A\u0430\u0441\u0443 \u044F\u043A \u0434\u043E\u0434\u0430\u0442\u043E\u043A:\n" + installHow()), buttons: on2 ? [{ label: "\u{1F4E8} \u0422\u0435\u0441\u0442\u043E\u0432\u0435", val: "test" }, { label: "\u{1F515} \u0412\u0438\u043C\u043A\u043D\u0443\u0442\u0438", val: "off", cls: "red" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] : [{ label: "\u{1F514} \u0423\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438", val: "on" }, { label: "\u041F\u0456\u0437\u043D\u0456\u0448\u0435", val: null }] });
    try {
      if (v === "on") {
        await pushSubNow();
        store.set("pushAsk", 1);
        pushBanner();
        toast("\u{1F514} \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E");
        await api("pushTest");
      } else if (v === "test") {
        await api("pushTest");
        toast("\u{1F4E8} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0448\u0442\u043E\u0440\u043A\u0443");
      } else if (v === "off") {
        await api("pushUnsub", { e: sub.endpoint });
        await sub.unsubscribe();
        toast("\u{1F515} \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E");
      }
    } catch (e) {
      toast("\u26A0\uFE0F " + (e.message || e));
    }
  }
  async function pushBanner() {
    var _a2, _b2, _c;
    (_a2 = $("#pushAsk")) == null ? void 0 : _a2.remove();
    if (store.get("pushAsk") || !((_b2 = S.me) == null ? void 0 : _b2.sid)) return;
    api("pushKey").then((k) => {
      S.pushK = k;
    }).catch(() => {
    });
    try {
      if (pushCan() && Notification.permission === "granted" && await ((_c = await navigator.serviceWorker.getRegistration()) == null ? void 0 : _c.pushManager.getSubscription())) return;
    } catch (e) {
    }
    const ios = isIOS() && !isApp(), d = document.createElement("div");
    d.id = "pushAsk";
    d.className = "push-ask";
    d.innerHTML = `<div class="pa-t">\u{1F514} ${ios ? "\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u2014 \u0443 \u0448\u0442\u043E\u0440\u043A\u0443" : "\u0423\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F?"}</div><div class="pa-s">${ios ? "\u0412\u0441\u0442\u0430\u043D\u043E\u0432\u0456\u0442\u044C \u043A\u0430\u0441\u0443 \u043D\u0430 \u0435\u043A\u0440\u0430\u043D \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430" : "\u041D\u043E\u0432\u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043D\u0430\u0432\u0456\u0442\u044C \u043D\u0430 \u0437\u0430\u0431\u043B\u043E\u043A\u043E\u0432\u0430\u043D\u043E\u043C\u0443 \u0435\u043A\u0440\u0430\u043D\u0456"}</div><div class="pa-b"><button class="btn sm" data-p="no">\u041D\u0435 \u0437\u0430\u0440\u0430\u0437</button><button class="btn sm pa-ok" data-p="on">${ios ? "\u042F\u043A?" : "\u0423\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438"}</button></div>`;
    d.onclick = (e) => {
      const p = e.target.dataset.p;
      if (!p) return;
      d.remove();
      store.set("pushAsk", 1);
      if (p === "on") ios ? pushMenu() : pushSubNow().then(() => {
        toast("\u{1F514} \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E");
        api("pushTest").catch(() => {
        });
        pushSwSync();
      }).catch((er) => toast("\u26A0\uFE0F " + (er.message || er)));
    };
    document.body.append(d);
  }
  async function pushSwSync() {
    var _a2;
    const el = $("#pushSw");
    if (!el) return;
    if (!S.pushK && !$("#pushAllSw")) api("pushKey").then((k) => {
      S.pushK = k;
    }).catch(() => {
    });
    let on2 = false;
    try {
      on2 = pushCan() && Notification.permission === "granted" && !!await ((_a2 = await navigator.serviceWorker.getRegistration()) == null ? void 0 : _a2.pushManager.getSubscription());
    } catch (e) {
    }
    el.classList.toggle("on", on2);
    const aw = $("#pushAllSw"), ar = $("#pushAllRow");
    if (aw && ar) {
      const k = await api("pushKey").catch(() => S.pushK || {});
      S.pushK = k;
      aw.classList.toggle("on", !!k.all);
      ar.onclick = async () => {
        var _a3;
        try {
          const v = !((_a3 = S.pushK) == null ? void 0 : _a3.all), r = await api("pushAll", { on: v });
          S.pushK = __spreadProps(__spreadValues({}, S.pushK), { all: r.all });
          aw.classList.toggle("on", r.all);
          toast(r.all ? on2 ? "\u{1F451} \u0422\u0435\u043F\u0435\u0440 \u043F\u0440\u0438\u0445\u043E\u0434\u044F\u0442\u044C \u0443\u0441\u0456 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0437\u0430\u043A\u043B\u0430\u0434\u0443" : "\u{1F451} \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E \u2014 \u0449\u0435 \u0443\u0432\u0456\u043C\u043A\u043D\u0456\u0442\u044C \xAB\u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0432 \u0448\u0442\u043E\u0440\u043A\u0443\xBB \u0432\u0438\u0449\u0435" : "\u{1F515} \u041B\u0438\u0448\u0435 \u0432\u0430\u0448\u0456 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F");
        } catch (e) {
          toast("\u26A0\uFE0F " + (e.message || e));
        }
      };
    }
    const row = $("#pushRow");
    if (!row) return;
    row.onclick = async () => {
      var _a3, _b2;
      if (isIOS() && !isApp() || !pushCan()) return pushMenu();
      try {
        if (!on2) {
          await pushSubNow();
          store.set("pushAsk", 1);
          (_a3 = $("#pushAsk")) == null ? void 0 : _a3.remove();
          toast("\u{1F514} \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E");
          api("pushTest").catch(() => {
          });
        } else {
          const sub = await ((_b2 = await navigator.serviceWorker.getRegistration()) == null ? void 0 : _b2.pushManager.getSubscription());
          if (sub) {
            await api("pushUnsub", { e: sub.endpoint }).catch(() => {
            });
            await sub.unsubscribe();
          }
          toast("\u{1F515} \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E");
        }
      } catch (e) {
        toast("\u26A0\uFE0F " + (e.message || e));
      }
      pushSwSync();
    };
  }
  try {
    (_b = navigator.serviceWorker) == null ? void 0 : _b.addEventListener("message", (e) => {
      var _a2;
      const go = ((_a2 = e.data) == null ? void 0 : _a2.push) && e.data.go;
      if (go == null ? void 0 : go.view) {
        S.view = go.view;
        renderNav();
        renderMain();
        loadView();
      }
    });
  } catch (e) {
  }
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
    setTimeout(pushBanner, 4e3);
    try {
      await loadState();
    } catch (e) {
      console.error("start", e);
      if (e.message === "auth") return;
      $("#main").innerHTML = `<div class="card"><h3>\u26A0\uFE0F \u041A\u0430\u0441\u0430 \u043D\u0435 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u043B\u0430\u0441\u044C</h3><div class="muted" style="word-break:break-word">${esc(String(e.message || e))}</div><button class="btn" onclick="location.reload()">\u{1F504} \u0429\u0435 \u0440\u0430\u0437</button></div>`;
      api("jsErr", { m: String(e.message || e).slice(0, 300), st: String(e.stack || "").slice(0, 1500) }).catch(() => {
      });
      return;
    }
    if (!isCour()) loadMenu().catch(() => {
    });
    connect();
    document.body.classList.toggle("cook", isCook());
    document.body.classList.toggle("adm", isAdmin());
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
    } else if (!isCook() && S.view !== "hall") loadView();
  }
  function hallHTML() {
    var _a2, _b2, _c;
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter((e) => e.k === "guest" && e.s === "new").map((e) => e.t));
    const calls = {};
    for (const e of S.events) if (e.k === "call" && e.s === "new") calls[e.t] = e;
    const bell = (t) => calls[t] ? `<span class="callbell${Date.now() - calls[t].ts > 6e4 ? " late" : ""}" title="\u041A\u043B\u0438\u0447\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430">\u{1F514}</span>` : "";
    const V2 = hallViews(), cur = V2.find((v) => v.id === S.hall) || V2[0], go = cur.go, hot = (t) => {
      var _a3, _b3;
      return pending.has(t) || calls[t] || ((_a3 = S.tables[t]) == null ? void 0 : _a3.check) || ((_b3 = S.tables[t]) == null ? void 0 : _b3.pwait);
    };
    const rng = go ? [] : hallRng(cur, calls);
    const map = !go && S.hm === "map", all = map ? Array.from({ length: Math.max(0, cur.to - cur.from + 1) }, (_, i) => cur.from + i) : rng, inF = new Set(rng);
    const tiles = map ? "" : all.map((t) => {
      const b = S.tables[t], at = map ? ` style="left:${mp[t][0]}%;top:${mp[t][1]}%"${S.mapEd ? ` data-mt="${t}"` : ""}` : "", dim = map && !inF.has(t) ? " dim" : "";
      const bk = (S.books || []).find((x) => x.t === t && x.st === "ok");
      if (!b) return `<button${at} class="tbl${dim}${pending.has(t) ? " new" : ""}${calls[t] ? " calling" : ""}${bk ? " booked" : ""}" data-a="table" data-t="${t}">${bell(t)}${pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : ""}<div class="n">${t}</div><div class="st">${pending.has(t) ? "\u{1F6CE} \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u2014 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C" : bk ? `\u{1F4C5} ${bk.time} \xB7 ${esc(bk.name)}` : "\u0432\u0456\u043B\u044C\u043D\u0438\u0439"}</div></button>`;
      const due = b.paid ? Math.max(0, b.pay2 - (b.paid.net || 0)) : 0, cls = ["busy", b.check ? "check" : "", pending.has(t) || b.pwait ? "new" : "", b.pwait ? "pw" : ""].join(" ");
      const tag = b.pwait ? '<span class="tag c" title="\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D">\u{1F310}</span>' : b.check ? `<span class="tag c">\u{1F9FE} \u0440\u0430\u0445\u0443\u043D\u043E\u043A</span>${b.pay ? `<i class="pay" title="${b.pay === "online" ? "\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D" : b.pay === "card" ? "\u043A\u0430\u0440\u0442\u0430" : "\u0433\u043E\u0442\u0456\u0432\u043A\u0430"}">${b.pay === "online" ? "\u{1F310}" : b.pay === "card" ? "\u{1F4B3}" : "\u{1F4B5}"}</i>` : ""}` : pending.has(t) ? '<span class="tag g">\u043D\u043E\u0432\u0435</span>' : "";
      return `<button${at} class="tbl${dim} ${cls}${calls[t] ? " calling" : ""}" data-a="table" data-t="${t}">${bell(t)}${tag}<div class="n">${t}</div><div class="st">${b.pwait ? due ? `\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \xB7 \u0434\u043E\u043F\u043B\u0430\u0442\u0430 ${money(due)}` : "\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u2014 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C" : `${b.off ? "\u23F3 " : ""}${b.orders} \u0437\u0430\u043C\u043E\u0432\u043B.${b.disc ? ` \xB7 \u2212${b.disc}%` : ""}`}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">\u0437 ${b.opened ? hhmm(b.opened) : "\u2014"}</div></button>`;
    }).join("");
    const gos = list.filter((b) => b.t > 1e3 && b.go);
    const goTileHTML = (b) => {
      const g = b.go, late = g.st === "new" && Date.now() - g.at > 6e4;
      return `<button class="go-t st-${g.st}${pending.has(b.t) ? " new" : ""}${late ? " late" : ""}" data-a="table" data-t="${b.t}"><b>${g.kind === "del" ? "\u{1F6F5}" : "\u{1F961}"} ${tn(b.t)}</b><span>${esc(g.name || "")}</span><small>${GOST[g.st] || g.st}${g.when ? " \xB7 \u043D\u0430 " + g.when : ""}${goTileInfo(g)}</small><i class="money">${money(b.pay2)}</i></button>`;
    };
    const strip = !gos.length ? "" : `<div class="go-strip">${gos.map(goTileHTML).join("")}</div>`;
    const goL = gos.filter((b) => go === "all" || (go === "del" ? b.go.kind === "del" : b.go.kind !== "del")), goNew2 = gos.filter((b) => b.go.st === "new").length;
    const tab = (v) => {
      const n = v.go ? gos.filter((b) => v.go === "all" || (v.go === "del" ? b.go.kind === "del" : b.go.kind !== "del")).length : Object.keys(S.tables).filter((t) => t >= v.from && t <= v.to).length, h = v.go ? gos.some((b) => b.go.st === "new" && (v.go === "all" || v.go === "del" === (b.go.kind === "del"))) : Array.from({ length: v.to - v.from + 1 }, (_, i) => v.from + i).some(hot);
      return `<button class="${v.id === cur.id ? "on" : ""}${h ? " hot" : ""}" data-hl="set" data-h="${v.id}">${v.ic} ${esc(v.n)}${n ? ` <b>${n}</b>` : ""}</button>`;
    };
    const tabs = V2.map(tab), bar = V2.length > 1 ? `<div class="hall-tabs">${tabs.join("")}</div>` : "", othHot = tabs.some((x, i) => V2[i].id !== cur.id && x.includes(' hot"'));
    const tools = go ? "" : `<div class="seg hall-f">${[["mine", "\u{1F464}", "\u041C\u043E\u0457 \u0441\u0442\u043E\u043B\u0438"], ["busy", "\u{1F525}", "\u0417\u0430\u0439\u043D\u044F\u0442\u0456"], ["all", "\u0423\u0441\u0456", "\u0423\u0441\u0456 \u0441\u0442\u043E\u043B\u0438"]].map(([k, l, t]) => `<button class="${S.hf === k ? "on" : ""}" data-hl="hf" data-h="${k}" title="${t}">${l}</button>`).join("")}<button data-hl="hm" title="\u0412\u0438\u0433\u043B\u044F\u0434: \u043F\u043B\u0438\u0442\u043A\u0438 \u2192 3D \u2192 \u043F\u043B\u0430\u043D">${!map ? "\u{1F4CB}" : S.f3m === "3d" ? "\u{1F9CA}" : "\u25A6"}</button></div>`;
    const why = (t) => {
      var _a3, _b3;
      return calls[t] ? "\u{1F514} \u043A\u043B\u0438\u0447\u0435" : pending.has(t) ? "\u{1F6CE} \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F" : ((_a3 = S.tables[t]) == null ? void 0 : _a3.pwait) ? "\u{1F310} \u043E\u043F\u043B\u0430\u0442\u0438\u0432" : ((_b3 = S.tables[t]) == null ? void 0 : _b3.check) ? "\u{1F9FE} \u0440\u0430\u0445\u0443\u043D\u043E\u043A" : "";
    };
    const away = go ? [] : V2.filter((v) => !v.go && v.id !== cur.id).flatMap((v) => Array.from({ length: v.to - v.from + 1 }, (_, i) => v.from + i).filter(hot).map((t) => ({ v, t })));
    const alerts = away.length ? `<div class="hall-alert">${away.slice(0, 6).map(({ v, t }) => `<button data-hl="go" data-h="${v.id}" data-t="${t}"><b>${v.ic} ${esc(v.n)} \xB7 ${t}</b> ${why(t)}</button>`).join("")}</div>` : "";
    const goTile = !go && ((_a2 = S.cfg) == null ? void 0 : _a2.goTabs) && gos.length ? `<button class="go-sum${goNew2 ? " new" : ""}" data-hl="set" data-h="${(_b2 = V2.find((v) => v.go)) == null ? void 0 : _b2.id}">\u{1F6F5} ${gos.length} ${goNew2 ? `\xB7 <b>${goNew2} \u043D\u043E\u0432.</b>` : "\u0432 \u0440\u043E\u0431\u043E\u0442\u0456"} \u2192</button>` : "";
    const body0 = go ? goL.length ? `<div class="go-strip go-grid">${goL.map(goTileHTML).join("")}</div>` : '<div class="muted" style="padding:14px">\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C \u0437\u0430\u0440\u0430\u0437 \u043D\u0435\u043C\u0430\u0454</div>' : `${((_c = S.cfg) == null ? void 0 : _c.goTabs) ? goTile : strip}${map ? floorUI(cur, all, inF, calls, pending) : ""}${map ? "" : `<div class="tables${rng.length > 24 ? " compact" : ""}">${tiles || `<div class="muted" style="padding:14px">${S.hf === "mine" ? "\u0423 \u0432\u0430\u0441 \u0437\u0430\u0440\u0430\u0437 \u043D\u0435\u043C\u0430\u0454 \u0441\u0442\u043E\u043B\u0456\u0432" : "\u0417\u0430\u0439\u043D\u044F\u0442\u0438\u0445 \u0441\u0442\u043E\u043B\u0456\u0432 \u043D\u0435\u043C\u0430\u0454"}</div>`}</div>`}`;
    const body = alerts + body0;
    return `<div class="head"><h1>${V2.length > 1 ? `<button class="hall-pick${othHot ? " hot" : ""}" data-hl="pick">${cur.ic} ${esc(cur.n)} \u25BE</button>` : "\u0417\u0430\u043B"}</h1>${tools}
      ${isCook() || isCour() ? "" : inboxBtn()}${isCook() || isCour() ? "" : S.bkNew ? `<button class="btn red bk-blink" data-a="books" title="\u041D\u043E\u0432\u0456 \u0431\u0440\u043E\u043D\u0456 \u2014 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C">\u{1F4C5} ${S.bkNew} \u043D\u043E\u0432.</button>` : (S.books || []).length ? `<button class="btn" data-a="books">\u{1F4C5} ${S.books.length}</button>` : `<button class="btn ghost" data-a="books" title="\u0411\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F">\u{1F4C5}</button>`}</div>${bar}${body}`;
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
    tpay: `\u{1F4B3} \u0421\u0442\u0456\u043B ${tn(e.t)} \u043E\u043F\u043B\u0430\u0442\u0438\u0432 \u043E\u043D\u043B\u0430\u0439\u043D \u2014 ${money(e.sum)}${e.tip ? ` (\u{1F49D} ${money(e.tip)})` : ""}${e.test ? " \xB7 \u{1F9EA} \u0442\u0435\u0441\u0442" : ""}`,
    chat: `\u{1F4AC} ${esc(e.by)}: ${cmText(e)}`,
    go: esc(e.text),
    book: esc(e.text),
    cert: esc(e.text),
    gchat: esc(e.text),
    att: `\u{1F7E2} ${esc(e.n)} \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${e.late ? ` \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F ${e.late} \u0445\u0432` : ""}`,
    swap: esc(e.text)
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    var _a2, _b2;
    const ci = $("#chatIn"), cv = ci == null ? void 0 : ci.value, cf = ci && document.activeElement === ci;
    if (S.evc) evcRender();
    setHTML($("#events"), evHead() + (S.events.length ? (_b2 = (_a2 = evList().length ? evList() : null) == null ? void 0 : _a2.map((e) => {
      var _a3, _b3, _c, _d, _e;
      const add = ((_a3 = e.prev) == null ? void 0 : _a3.length) && ((_b3 = e.lines) == null ? void 0 : _b3.length);
      const rdy = e.k === "ready" && e.text ? `<div class="lines">${esc(e.text)}</div>` : "";
      const lines = rdy || (((_c = e.lines) == null ? void 0 : _c.length) ? `${add ? '<div class="addtag">\u2795 \u0414\u041E\u0417\u0410\u041C\u041E\u0412\u041B\u0415\u041D\u041D\u042F</div>' : ""}<div class="lines${add ? " add" : ""}">${e.lines.map(esc).join("\n")}</div>` : "");
      const by = e.by && !["waiter", "chat"].includes(e.k) ? ` \xB7 ${esc(e.by)}` : "";
      const zb = e.k === "att" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "")}</span>` : e.s === "rej" ? `<span class="bad">\u274C ${esc(e.accBy || "")}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button>${e.late && ((_d = S.cfg) == null ? void 0 : _d.lateFine) ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">\u2705 + \u0448\u0442\u0440\u0430\u0444</button>` : ""}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">\u274C</button>` : '<span class="muted">\u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F</span>'}</div>` : e.k === "swap" && !e.old ? e.s === "ask" && e.n === ((_e = S.me) == null ? void 0 : _e.name) ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u041D\u0456</button></div>` : e.s === "agreed" && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">\u274C</button></div>` : "" : "";
      const sb = e.k === "book" && e.s === "new" ? `<div class="act"><button class="btn sm green" data-a="bkSet" data-id="${e.bid}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button><button class="btn sm red" data-a="bkSet" data-id="${e.bid}" data-s="no">\u274C</button><button class="btn sm" data-a="books">\u{1F4C5} \u0423\u0441\u0456 \u0431\u0440\u043E\u043D\u0456</button></div>` : e.k === "cert" && e.s === "new" && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="certPay" data-c="${e.code}" data-h="cash">\u{1F4B5} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</button><button class="btn sm" data-a="certPay" data-c="${e.code}" data-h="card">\u{1F4B3}</button><button class="btn sm red" data-a="certPay" data-c="${e.code}" data-h="no">\u274C</button></div>` : e.k === "tpay" ? `<div class="act">${e.s === "new" ? `<button class="btn sm green" data-a="tpayOk" data-t="${e.t}">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button><button class="btn sm" data-a="table" data-t="${e.t}">\u270F\uFE0F ${tn(e.t)}</button>${isAdmin() ? `<button class="btn sm red" data-a="tpayRefund" data-t="${e.t}">\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</button>` : ""}` : `<span class="${e.s === "rej" ? "bad" : "muted"}">${e.s === "rej" ? "\u21A9\uFE0F \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E" : "\u2705"} ${esc(e.accBy || "")}</span>`}</div>` : e.k === "gchat" && !e.out ? `<div class="act"><button class="btn sm primary" data-a="gbThread" data-ph="${e.ph}">\u21A9\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438</button></div>` : (e.k === "book" || e.k === "cert") && e.s !== "new" ? `<div class="act"><span class="muted">${e.s === "rej" ? "\u274C" : "\u2705"} ${esc(e.accBy || "")}</span></div>` : "";
      const btns = isCour() ? "" : sb || zb || (e.k === "noscan" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "")}</span>` : `<button class="btn sm green" data-a="evAck" data-id="${e.id}">\u2705 \u0406\u0434\u0443</button>`}<button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${tn(e.t)}</button></div>` : e.k === "guest" || e.k === "check" || e.k === "call" ? `<div class="act">${e.s === "acc" ? `<span class="muted">\u2705 ${esc(e.accBy || "\u043F\u0440\u0438\u0439\u043D\u044F\u0442\u043E")}</span>` : e.s === "rej" ? `<span style="color:var(--red,#ff453a)">\u274C \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E \xB7 ${esc(e.accBy || "")}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432</button>${e.k === "guest" ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438</button>` : ""}`}<button class="btn sm" data-a="table" data-t="${e.t}">\u0421\u0442\u0456\u043B ${tn(e.t)}</button></div>` : "");
      const fresh = S.shown.size && !S.shown.has(e.id) ? " fresh" : "";
      return `<div data-ec="open" data-id="${e.id}" class="ev ${e.k}${e.pin ? " pinned" : ""}${evMention(e) ? " mention" : ""}${e.k === "call" && e.s === "new" && Date.now() - e.ts > 6e4 ? " late" : ""}${e.k === "noscan" && e.s !== "acc" ? " blink" : ""}${["guest", "check", "call", "noscan"].includes(e.k) && !["acc", "rej"].includes(e.s) || ["book", "cert", "tpay"].includes(e.k) && e.s === "new" ? " wait" : ""}${e.s === "acc" || e.s === "rej" ? " acc" : ""}${e.s && !["new", "ask", "agreed"].includes(e.s) ? " done" : ""}${e.s === "rej" ? " rej" : ""}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}${e.sum && ["guest", "waiter"].includes(e.k) ? `<div class="muted">\u0421\u0443\u043C\u0430 ${money(e.sum)}</div>` : ""}${btns}${evFoot(e)}</div>`;
    }).join("")) != null ? _b2 : '<div class="muted" style="padding:12px">\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u044C \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u0435\u0440\u0448\u0438\u043C \u{1F446}</div>' : '<div class="muted" style="padding:12px">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043F\u043E\u0434\u0456\u0439 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>'));
    if (cv || cf) {
      const n = $("#chatIn");
      if (n) {
        n.value = cv || "";
        if (cf) n.focus();
      }
    }
    S.events.forEach((e) => S.shown.add(e.id));
  }
  const cartOf = (t) => {
    var _a2;
    return (_a2 = S.carts)[t] || (_a2[t] = {});
  };
  const isFood = (c) => !c.tech && c.g === "kitchen" && !c.nopack;
  const packItem = () => {
    var _a2, _b2;
    return (_b2 = (_a2 = S.menu) == null ? void 0 : _a2.categories.find((c) => {
      var _a3;
      return c.id === "upakuvannia" || /упаков/i.test(((_a3 = c.name) == null ? void 0 : _a3.uk) || "");
    })) == null ? void 0 : _b2.items.find((i) => !i.hidden);
  };
  const packQ = (t) => {
    if (!S.tw[t] || !S.menu) return 0;
    const food = new Set(S.menu.categories.filter(isFood).flatMap((c) => c.items.map((i) => i.id)));
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
    var _a2, _b2, _c, _d;
    const g = S.grp || (S.fav.length ? "fav" : "kitchen");
    if (g === "fav" || !((_a2 = S.groups) == null ? void 0 : _a2.length) || ((_c = (_b2 = S.groups.find((x) => x.id === g)) == null ? void 0 : _b2.cats) == null ? void 0 : _c.length)) return g;
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
    var _a2, _b2, _c, _d, _e;
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
    const billRows = b ? b.items.map((it) => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} \xD7 ${Math.round(it.sum / it.q)} \u20B4${it.off ? " \xB7 \u23F3 \u0449\u0435 \u043D\u0435 \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456" : ""}</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 1">\u2212</button></div>`).join("") : '<div class="muted" style="padding:8px 4px">\u0420\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0432 \u043C\u0435\u043D\u044E</div>';
    const discRow = (b == null ? void 0 : b.disc) ? `<div class="row"><div class="nm">\u0417\u043D\u0438\u0436\u043A\u0430 ${b.disc}%</div><b class="money" style="color:var(--green)">\u2212${b.discSum != null ? Math.min(b.total, b.discSum) : Math.round(b.total * b.disc / 100)}</b><button class="rb minus" data-a="discSet" data-p="0">\xD7</button></div>` : "";
    const promoRow = (b == null ? void 0 : b.promoOff) ? `<div class="row"><div class="nm muted">\u{1F381} \u0410\u043A\u0446\u0456\u0457 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456 \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E</div>${isAdmin() ? '<button class="rb plus" data-a="loyOff" data-off="0" title="\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438">\u21BA</button>' : ""}</div>` : (((_b2 = b == null ? void 0 : b.promo) == null ? void 0 : _b2.lines) || []).filter((l) => l.amt || !l.info).map((l, i) => `<div class="row"><div class="nm">${esc(l.n)}</div><b class="money" style="color:var(--green)">${l.amt ? "\u2212" + l.amt : ""}</b>${isAdmin() && i === 0 ? '<button class="rb minus" data-a="loyOff" data-off="1" title="\u0411\u0435\u0437 \u0430\u043A\u0446\u0456\u0439">\xD7</button>' : ""}</div>`).join("");
    const bonRow = (b == null ? void 0 : b.bonus) ? `<div class="row"><div class="nm">${b.cert ? `\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 ${esc(b.cert.code)}${b.bonus > b.cert.sum ? " + \u{1F381} \u0431\u043E\u043D\u0443\u0441\u0438" : ""}` : "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438"}</div><b class="money" style="color:var(--green)">\u2212${b.bonus}</b><button class="rb minus" data-a="cliBon0">\xD7</button></div>` : "";
    const tipRow = (b == null ? void 0 : b.tip) ? `<div class="row"><div class="nm">\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456<small>\u0432\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">\xD7</button>' : ""}</div>` : "";
    const paidRow = (b == null ? void 0 : b.paid) ? `<div class="row"><div class="nm">\u{1F310} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D<small>${b.pwait ? "\u0433\u0456\u0441\u0442\u044C \u0437\u0430\u043F\u043B\u0430\u0442\u0438\u0432 \u0437 QR \u2014 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C" : "LiqPay"}${Math.max(0, b.pay2 - (b.paid.net || 0)) ? ` \xB7 \u0434\u043E\u043F\u043B\u0430\u0442\u0430 ${money(Math.max(0, b.pay2 - (b.paid.net || 0)))}` : ""}</small></div><b class="money" style="color:var(--green,#30d158)">${money(b.paid.sum)}</b></div>` : "";
    const comments = b ? b.log.filter((o) => o.comment).map((o) => `<div class="muted" style="padding:2px 6px">\u{1F4AC} ${esc(o.comment)}</div>`).join("") : "";
    const cartHTML = cartRows.length ? `<div class="cart"><h3>\u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} \u20B4</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">\u2212</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join("")}${pq ? `<div class="row auto"><div class="nm">\u{1F961} ${esc(pk.name.uk)}<small>${pk.price} \u20B4 \xD7 ${pq}${S.packAdj[t] ? "" : " \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E"}</small></div><button class="rb minus" data-a="pk" data-d="-1">\u2212</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ""}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="\u{1F4AC} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u0434\u043B\u044F \u043A\u0443\u0445\u043D\u0456" value="${esc(S.coms[t] || "")}"><button class="btn sm ${S.tw[t] ? "primary" : "ghost"}" data-a="tw">\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E</button><button class="btn sm ${S.ur[t] ? "red" : "ghost"}" data-a="ur">\u26A1 \u0422\u0435\u0440\u043C\u0456\u043D\u043E\u0432\u043E</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">\u2715</button><button class="btn primary" data-a="send">\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \xB7 ${money(cartSum)}</button></div></div>` : "";
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A</button><button class="btn" data-a="disc">% \u0417\u043D\u0438\u0436\u043A\u0430</button>
      <button class="btn" data-a="move">\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438</button><button class="btn" data-a="split">\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438</button><button class="btn" data-a="bonCert">\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \xB7 \u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442</button>${isAdmin() ? '<button class="btn red" data-a="delTable">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>' : '<button class="btn" data-a="mobileMenu">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438</button>'}
      <button class="btn green wide" data-a="closeT">\u{1F4B0} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \xB7 ${money(b.pay2)}</button></div>` : "";
    const keepBill = (_c = $("#shBill .scroll")) == null ? void 0 : _c.scrollTop, focusCom = ((_d = document.activeElement) == null ? void 0 : _d.id) === "cartCom";
    setHTML($("#shBill"), `<div class="scroll"><h3>\u0420\u0430\u0445\u0443\u043D\u043E\u043A</h3>${billRows}${discRow}${promoRow}${bonRow}${tipRow}${paidRow}${comments}</div>${cartHTML}${actions}`);
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
    var _a2, _b2, _c, _d, _e;
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
    const vv = (_b2 = it.variants) == null ? void 0 : _b2.find((x) => x.v === v);
    const key = it.id + (v ? "|" + v : ""), cart = cartOf(S.open);
    cart[key] || (cart[key] = { id: it.id, v, name: it.name.uk + (vv ? ` ${vv.v} ${it.size || ""}`.trimEnd() : ""), price: vv ? vv.p : it.price, q: 0 });
    const keepKb = wasKb || searching();
    cart[key].q++;
    saveCarts();
    if (S.q) {
      S.q = "";
      const se = $("#search");
      if (se) se.value = "";
      const c = (_c = S.menu) == null ? void 0 : _c.categories.find((x) => x.items.some((i) => i.id === it.id)), gr = c && ((_d = S.groups) == null ? void 0 : _d.find((x) => {
        var _a3;
        return (_a3 = x.cats) == null ? void 0 : _a3.includes(c.id);
      }));
      if (c && gr && curGrp() !== "fav") {
        S.grp = gr.id;
        S.cat = c.id;
      }
    }
    renderSheet();
    if (keepKb && !searching()) (_e = $("#search")) == null ? void 0 : _e.focus();
    upsHint(it.name.uk, cart);
  }
  async function upsHint(name, cart) {
    if (!S.ups) {
      S.ups = {};
      try {
        S.ups = (await api("upsMap")).m || {};
      } catch (e) {
      }
    }
    const have = new Set(Object.values(cart).map((x) => x.name)), l = (S.ups[name] || []).filter((n) => !have.has(n)).slice(0, 3);
    if (l.length) toast("\u{1F4A1} \u0414\u043E \xAB" + name + "\xBB \u043F\u0440\u043E\u043F\u043E\u043D\u0443\u0454\u043C\u043E: " + l.join(", "));
  }
  for (const ev of ["change", "compositionend"]) document.addEventListener(ev, (e) => {
    if (e.target.id === "cartCom") S.coms[S.open] = e.target.value;
  });
  async function sendCart() {
    const t = S.open, cart = cartOf(t), pk = packItem(), pq = pk ? packQ(t) : 0, items = [...Object.values(cart).map((x) => ({ id: x.id, v: x.v, q: x.q })), ...pq ? [{ id: pk.id, q: pq }] : []];
    if (!items.length) return;
    {
      const ci = $("#cartCom");
      if (ci) {
        ci.blur();
        S.coms[t] = ci.value.trim();
      }
    }
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
      {
        const ci = $("#cartCom");
        if (ci) ci.value = "";
      }
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
    var _a2;
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const v = await choose(`\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0441\u0442\u0456\u043B ${tn(t)}`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${b.tip ? ` + \u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ""}${b.pay ? ` \xB7 \u0433\u0456\u0441\u0442\u044C \u0445\u043E\u0447\u0435 ${b.pay === "card" ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u043A\u043E\u044E" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E"}` : ""}`, [
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "cash:1", cls: "green" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 + \u{1F5A8} \u0447\u0435\u043A", val: "card:1", cls: "blue" },
      { label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "cash:0" },
      { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430, \u0431\u0435\u0437 \u0447\u0435\u043A\u0430", val: "card:0" },
      ...modOn("agg") ? (await aggsLoad()).map((g) => ({ label: "\u{1F6F5} " + g.n, val: "agg:" + g.id })) : [],
      ...((_a2 = S.cfg) == null ? void 0 : _a2.iban) ? [{ label: "\u{1F3E6} \u041F\u0435\u0440\u0435\u043A\u0430\u0437 \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A", val: "iban" }] : [],
      { label: "\u2797 \u041F\u043E\u0440\u0456\u0432\u043D\u0443 \u043D\u0430 \u0433\u043E\u0441\u0442\u0435\u0439", val: "eq" }
    ]);
    if (!v) return;
    if (v === "iban") {
      const q = await api("ibanQr", { t }).catch((e) => (toast("\u26A0\uFE0F " + errText(e.message)), null));
      if (!q) return;
      const ok2 = await modal({
        title: `\u{1F3E6} \u041F\u0435\u0440\u0435\u043A\u0430\u0437 \xB7 \u0441\u0442\u0456\u043B ${tn(t)}`,
        body: `<div style="text-align:center"><img src="${q.img}" alt="QR" style="width:min(260px,70vw);image-rendering:pixelated;background:#fff;padding:8px;border-radius:10px"><div style="margin-top:8px;font-size:20px"><b>${money(q.sum)}</b></div>
        <div class="muted" style="font-size:13px;margin-top:6px;overflow-wrap:anywhere">${esc(q.n)}<br>${esc(q.iban)}</div><div class="muted" style="font-size:12px;margin-top:8px">\u0413\u0456\u0441\u0442\u044C \u0441\u043A\u0430\u043D\u0443\u0454 \u043A\u0430\u043C\u0435\u0440\u043E\u044E \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443 \u0430\u0431\u043E \u0432 \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u043D\u043A\u0443 \u0431\u0430\u043D\u043A\u0443. \u0417\u0430\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B, \u043A\u043E\u043B\u0438 \u043F\u0435\u0440\u0435\u043A\u0430\u0437 \u043D\u0430\u0434\u0456\u0439\u0448\u043E\u0432 \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A.</div></div>`,
        buttons: [{ label: "\u2705 \u0413\u0440\u043E\u0448\u0456 \u043F\u0440\u0438\u0439\u0448\u043B\u0438 \u2014 \u0437\u0430\u043A\u0440\u0438\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }]
      });
      if (!ok2) return;
      const r2 = await act("close", { t, pay: "iban", print: false });
      if (r2 == null ? void 0 : r2.r) {
        toast(`\u2705 \u0421\u0442\u0456\u043B ${tn(t)} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 \u{1F3E6} ${money(r2.r.sum)}`);
        closeSheet();
        loadState().then(wlFree.bind(null, t)).catch(() => {
        });
      }
      return;
    }
    if (v === "eq") {
      const n = Math.round(+await ask("\u041F\u043E\u0440\u0456\u0432\u043D\u0443 \u043D\u0430 \u0441\u043A\u0456\u043B\u044C\u043A\u043E\u0445?", `\u0421\u0443\u043C\u0430 ${money(b.pay2 + (b.tip || 0))}`, "number"));
      if (!(n >= 2 && n <= 30)) return;
      const tot = b.pay2 + (b.tip || 0), one = Math.floor(tot / n), rest = tot - one * n;
      await choose(`\u2797 \u041F\u043E\u0440\u0456\u0432\u043D\u0443 \u043D\u0430 ${n}`, `\u0417 \u043A\u043E\u0436\u043D\u043E\u0433\u043E ${money(one)}${rest ? ` (\u043E\u0434\u0438\u043D \u0434\u043E\u043F\u043B\u0430\u0447\u0443\u0454 ${money(one + rest)})` : ""} \xB7 \u0440\u0430\u0437\u043E\u043C ${money(tot)}`, [{ label: "\u0413\u0430\u0440\u0430\u0437\u0434", val: "ok" }]);
      return closeFlow();
    }
    const [pay, pr] = v.split(":"), isAg = pay === "agg";
    const r = await act("close", { t, pay: isAg ? v : pay, print: !isAg && pr === "1" });
    if (r == null ? void 0 : r.queued) {
      toast(`\u{1F4F4} \u0421\u0442\u0456\u043B ${tn(t)}: \u043D\u0435\u043C\u0430\u0454 \u0437\u0432'\u044F\u0437\u043A\u0443 \u2014 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u0432 \u0447\u0435\u0440\u0437\u0456, \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u043C\u043E \u0441\u0430\u043C\u0456`);
      closeSheet();
      return;
    }
    if (r == null ? void 0 : r.r) {
      toast(`\u2705 \u0421\u0442\u0456\u043B ${tn(t)} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \xB7 ${money(r.r.sum)}`);
      closeSheet();
      loadState().then(wlFree.bind(null, t)).catch(() => {
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
    var _a2, _b2, _c, _d, _e;
    const t = S.open, b = S.tables[t];
    if (!b) return;
    const dmax = (_d = (_c = (_a2 = S.me) == null ? void 0 : _a2.dmax) != null ? _c : (_b2 = S.cfg) == null ? void 0 : _b2.discMax) != null ? _d : 20, max = realAdmin() && ((_e = S.me) == null ? void 0 : _e.dmax) == null ? 100 : dmax;
    const v = await choose(`\u0417\u043D\u0438\u0436\u043A\u0430 \u2014 \u0441\u0442\u0456\u043B ${tn(t)}`, `\u0421\u0443\u043C\u0430 ${money(b.total)}${b.disc ? ` \xB7 \u0437\u0430\u0440\u0430\u0437 ${b.disc}%` : ""}${max === 100 ? "" : ` \xB7 \u0432\u0430\u0448 \u043B\u0456\u043C\u0456\u0442 \u2014 \u0434\u043E ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter((p2) => p2 <= max).map((p2) => ({ label: `${p2}%  \u2192  ${money(b.total - Math.round(b.total * p2 / 100))}`, val: String(p2) })), { label: "\u270F\uFE0F \u0421\u0432\u0456\u0439 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A", val: "own" }, { label: "\u0411\u0435\u0437 \u0437\u043D\u0438\u0436\u043A\u0438", val: "0", cls: "red" }]);
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
    if (r == null ? void 0 : r.queued) {
      S.carts[to] = __spreadValues(__spreadValues({}, S.carts[to] || {}), cartOf(t));
      S.carts[t] = {};
      saveCarts();
      S.open = to;
      render();
      return;
    }
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
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90 - (Object.keys(S.tables).some((t) => t > 1e3) ? 74 : 0) - (hallViews().length > 1 ? 46 : 0) - ($(".hall-alert") ? 44 : 0)), V2 = hallViews(), cur = V2.find((v) => v.id === S.hall) || V2[0], n = Math.max(1, cur.go ? 1 : hallRng(cur).length);
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
  const payL = (x) => {
    var _a2;
    return x.onl ? x.onl < x.sum ? `\u{1F310} \u043E\u043D\u043B\u0430\u0439\u043D ${money(x.onl)} + ${x.card > x.onl ? "\u{1F4B3}" : "\u{1F4B5}"} ${money(x.sum - x.onl)}` : "\u{1F310} \u043E\u043D\u043B\u0430\u0439\u043D" : x.card && ((_a2 = x.cash) != null ? _a2 : 0) ? `\u{1F4B5} ${money(x.cash)} + \u{1F4B3} ${money(x.card)}` : x.ib && x.ib >= x.card ? "\u{1F3E6} \u043F\u0435\u0440\u0435\u043A\u0430\u0437" : x.card ? "\u{1F4B3} \u043A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0433\u043E\u0442\u0456\u0432\u043A\u0430";
  };
  const fisR = (f) => Object.values(f.r || (f.id || f.ret ? { a: { id: f.id, ret: f.ret, h: f.h } } : {}));
  const fisNote = (x, ref) => {
    const f = x.fis;
    if (!f) return "";
    const R = fisR(f), ids = R.filter((r) => r.id), rets = R.reduce((a, r) => {
      var _a2;
      return a + (((_a2 = r.ret) == null ? void 0 : _a2.length) || 0);
    }, 0);
    if (f.st === "err") return `<div class="c-note" style="color:var(--red,#e66)">\u{1F9FE}\u26A0\uFE0F Checkbox: ${esc(f.err || "\u043F\u043E\u043C\u0438\u043B\u043A\u0430")}${isAdmin() ? ` <button class="c-b" data-a="cFis" data-ref="${ref}" data-d="${S.data.cday || ""}">\u{1F501} \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0438</button>` : ""}</div>`;
    if (f.ibc) return `<div class="c-note">\u{1F3E6} \u041F\u0435\u0440\u0435\u043A\u0430\u0437 \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u2014 \u0444\u0456\u0441\u043A\u0430\u043B\u044C\u043D\u0438\u0439 \u0447\u0435\u043A \u043D\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u0435\u043D</div>`;
    return ids.length ? `<div class="c-note">\u{1F9FE} \u0424\u0456\u0441\u043A\u0430\u043B\u044C\u043D${ids.length > 1 ? "\u0456 \u0447\u0435\u043A\u0438" : "\u0438\u0439 \u0447\u0435\u043A"}: ${ids.map((r, i) => `<a href="https://check.checkbox.ua/${esc(r.id)}" target="_blank" rel="noopener">\u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438${ids.length > 1 ? " " + (i + 1) : ""}</a>`).join(" \xB7 ")}${rets ? ` \xB7 \u21A9\uFE0F \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u044C ${rets}` : ""}</div>` : rets ? `<div class="c-note">\u{1F9FE} \u0424\u0456\u0441\u043A\u0430\u043B\u044C\u043D\u0438\u0439 \u0447\u0435\u043A \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043E</div>` : "";
  };
  const fisDayHTML = (l) => {
    var _a2;
    if (!isAdmin() || !l.some((x) => x.fis)) return "";
    let sales = 0, fis = 0, ib = 0, bad = 0, wait = 0;
    for (const x of l) {
      if (x.del) continue;
      if (!x.rm && x.sum > 0) {
        sales += x.sum;
        if (!x.fis) wait++;
      }
      if (((_a2 = x.fis) == null ? void 0 : _a2.st) === "err") bad++;
      if (x.fis) {
        ib += (x.fis.ibc || 0) / 100;
        for (const r of fisR(x.fis)) if (r.id) {
          try {
            fis += r.s != null ? r.s / 100 : JSON.parse(r.h).payments.reduce((a, p) => a + p.value, 0) / 100;
          } catch (e) {
          }
        }
      }
    }
    const gap = Math.round(sales - fis - ib);
    return `<div class="c-note" style="margin:6px 0 10px">\u{1F9FE} \u041F\u0420\u0420\u041E: \u0443 \u0447\u0435\u043A\u0430\u0445 <b>${money(Math.round(fis))}</b> \u0437 ${money(sales)}${ib ? ` \xB7 \u{1F3E6} \u043F\u0435\u0440\u0435\u043A\u0430\u0437\u043E\u043C ${money(Math.round(ib))}` : ""}${gap > 0 ? ` \xB7 <span style="color:var(--red,#e66)">\u26A0\uFE0F \u0431\u0435\u0437 \u0447\u0435\u043A\u0430 ${money(gap)}${bad ? ` (\u043F\u043E\u043C\u0438\u043B\u043E\u043A ${bad})` : ""}${wait ? ` (\u043D\u0430\u0434\u0441\u0438\u043B\u0430\u0454\u0442\u044C\u0441\u044F ${wait})` : ""}</span>` : " \xB7 \u2705 \u0443\u0441\u0435 \u0444\u0456\u0441\u043A\u0430\u043B\u0456\u0437\u043E\u0432\u0430\u043D\u043E"}</div>`;
  };
  function closedHTML() {
    const l = S.data.closed;
    if (!l) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const isToday = !S.data.cday || S.data.cday === S.data.ctoday, dTitle = isToday ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : S.data.cday.split("-").reverse().join(".");
    const gone = (x) => x.del || x.rm, ok2 = l.filter((x) => !gone(x)), sum = (f) => money(ok2.reduce((s, x) => s + f(x), 0)), onl = ok2.some((x) => x.onl);
    const nav = `<div class="c-day"><button class="c-arr" data-a="cDay" data-v="-1">\u2039</button><label class="c-date">\u{1F4C5} ${isToday ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : dTitle}<input type="date" data-a="cDate" value="${S.data.cday || S.data.ctoday || ""}" max="${S.data.ctoday || ""}"></label><button class="c-arr" data-a="cDay" data-v="1" ${isToday ? "disabled" : ""}>\u203A</button></div>`;
    const top = `<div class="c-top">${nav}<div class="c-tot"><div class="c-big"><small>\u0420\u0430\u0437\u043E\u043C \xB7 ${ok2.length} \u0447\u0435\u043A.</small><b class="money">${sum((x) => x.sum)}</b></div><div class="c-split"><span>\u{1F4B5} ${sum((x) => {
      var _a2;
      return (_a2 = x.cash) != null ? _a2 : x.sum;
    })}</span><span>\u{1F4B3} ${sum((x) => (x.card || 0) - (x.onl || 0))}</span>${onl ? `<span>\u{1F310} ${sum((x) => x.onl || 0)}</span>` : ""}</div></div></div>`;
    const kind = (x) => x.del ? "del" : x.rm ? "rm" : x.reopen || x.restored ? "re" : x.onl ? "onl" : x.card ? "card" : "cash";
    const stat = (x) => x.reopen ? "\u21A9\uFE0F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0437\u043D\u043E\u0432\u0443" : x.restored ? "\u21A9\uFE0F \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : x.del ? "\u{1F5D1} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : x.rm ? "\u{1F9F9} \u0437\u043D\u044F\u0442\u043E" : payL(x);
    const B = (a, ref, l2, cls = "", extra = "") => `<button class="c-b ${cls}" data-a="${a}" data-ref="${ref}"${extra}>${l2}</button>`;
    const card = (x, i) => {
      var _a2, _b2, _c, _d, _e, _f, _g;
      const ref = x.id || l.length - 1 - i, adm = isAdmin(), g = gone(x);
      const btns = [
        !g && ((_a2 = x.dishes) == null ? void 0 : _a2.length) && B("cPrint", ref, "\u{1F5A8} \u0427\u0435\u043A"),
        !g && adm && B("cEdit", ref, "\u270F\uFE0F \u0417\u043C\u0456\u043D\u0438\u0442\u0438", "", ` data-d="${S.data.cday || ""}"`),
        adm && !x.del && !x.reopen && ((_b2 = x.dishes) == null ? void 0 : _b2.length) && B("cReopen", ref, "\u21A9\uFE0F \u041D\u0430 \u0441\u0442\u0456\u043B"),
        adm && x.rm && !x.reopen && !x.del && B("cBack", ref, "\u21A9\uFE0F \u0423 \u0432\u0438\u0440\u0443\u0447\u043A\u0443", "ok"),
        adm && x.del && !x.restored && (((_c = x.dishes) == null ? void 0 : _c.length) || ((_d = x.voids) == null ? void 0 : _d.length)) && B("tBack", ref, "\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438", "ok"),
        !g && adm && ((_e = x.lpo) == null ? void 0 : _e.length) && B("cRefund", ref, `\u21A9\uFE0F ${money(x.onl)} \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443`, "", ` data-s="${x.onl}"`),
        !g && adm && B("cDel", ref, "\u{1F5D1}", "bad", ' title="\u0417\u043D\u044F\u0442\u0438 \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438"')
      ].filter(Boolean).join("");
      const items = (x.dishes || []).map(([n, q, s]) => `<div><span>${q}\xD7 ${esc(n)}</span><b>${s}</b></div>`).join("");
      return `<details class="c-card k-${kind(x)}${g ? " gone" : ""}"><summary><span class="c-tm">${x.at}</span><span class="c-t">\u0421\u0442\u0456\u043B ${tn(x.t)}</span><span class="c-pay">${stat(x)}${x.disc ? ` \xB7 \u2212${x.disc}%` : ""}${x.fis ? x.fis.st === "err" ? " \xB7 \u{1F9FE}\u26A0\uFE0F" : x.fis.ibc ? " \xB7 \u{1F3E6}" : " \xB7 \u{1F9FE}" : ""}</span><b class="money c-sum">${money(x.sum)}</b></summary>
        <div class="c-body">${items ? `<div class="c-items">${items}</div>` : ""}${x.tip ? `<div class="c-note">\u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 ${money(x.tip)}</div>` : ""}${x.by ? `<div class="c-note">\u{1F464} ${esc(x.by)}${((_f = x.edits) == null ? void 0 : _f.length) ? ` \xB7 \u270F\uFE0F \u0437\u043C\u0456\u043D\u0435\u043D\u043E ${x.edits.length}\xD7 (${esc(x.edits[x.edits.length - 1].by)} ${x.edits[x.edits.length - 1].at})` : ""}</div>` : ""}
        ${((_g = x.voids) == null ? void 0 : _g.length) ? `<div class="voids">\u{1F6AB} \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E:${x.voids.map((v) => `<div>${v.at} \xB7 \u2212${money(v.sum)} ${esc(v.name)} \u2014 <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join("")}</div>` : ""}${fisNote(x, ref)}${btns ? `<div class="c-btns">${btns}</div>` : ""}</div></details>`;
    };
    const voids = (S.data.cvoids || []).length ? `<details class="c-card k-rm"><summary><span class="c-tm">\u{1F6AB}</span><span class="c-t">\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u0456 \u0441\u0442\u0440\u0430\u0432\u0438</span><span class="c-pay">${S.data.cvoids.length} \u0448\u0442.</span><b class="money c-sum">${money(S.data.cvoids.reduce((s, v) => s + (v.sum || 0), 0))}</b></summary><div class="c-body">${[...S.data.cvoids].reverse().map((v) => `<div class="kv"><span>${v.at} \xB7 \u0441\u0442\u0456\u043B ${tn(v.t)} \xB7 <b>${esc(v.name)}</b> \u2014 <i>${esc(v.reason || "")}</i> <span class="muted">(${esc(v.by || "")})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="c-b ok" data-a="vBack" data-ts="${v.ts}">\u21A9\uFE0F \u041D\u0430 \u0441\u0442\u0456\u043B</button>` : ""}</span></div>`).join("")}</div></details>` : "";
    return `${top}${fisDayHTML(l)}<div class="c-list">${[...l].reverse().map(card).join("") || `<div class="c-empty">\u{1F9FE} ${isToday ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454" : "\u0426\u044C\u043E\u0433\u043E \u0434\u043D\u044F \u0437\u0430\u043A\u0440\u0438\u0442\u0438\u0445 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 \u043D\u0435\u043C\u0430\u0454"}</div>`}${voids}</div>`;
  }
  S.hall = store.get("hall", "");
  S.hf = store.get("hf", "all");
  function hallViews() {
    var _a2, _b2, _c;
    const H = ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.halls) == null ? void 0 : _b2.length) ? S.cfg.halls : [{ n: "\u0417\u0430\u043B", ic: "\u{1FA91}", c: S.n }];
    let a = 1;
    const V2 = H.map((h, i) => {
      const v = { id: "h" + i, n: h.n, ic: h.ic || "\u{1FA91}", from: a, to: Math.min(S.n, a + h.c - 1) };
      a += h.c;
      return v;
    });
    const g = (_c = S.cfg) == null ? void 0 : _c.goTabs;
    if (g === 1) V2.push({ id: "go", go: "all", n: "\u0417 \u0441\u043E\u0431\u043E\u044E \u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430", ic: "\u{1F6F5}" });
    if (g === 2) V2.push({ id: "pick", go: "pick", n: "\u0417 \u0441\u043E\u0431\u043E\u044E", ic: "\u{1F961}" }, { id: "del", go: "del", n: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", ic: "\u{1F6F5}" });
    if (!isAdmin() && H.length > 1) {
      const mine = store.get("myHalls", null);
      if (mine == null ? void 0 : mine.length) return V2.filter((v) => v.go || mine.includes(v.id));
    }
    return V2;
  }
  const hallRng = (cur, calls = {}) => Array.from({ length: Math.max(0, cur.to - cur.from + 1) }, (_, i) => cur.from + i).filter((t) => {
    var _a2, _b2;
    return S.hf === "busy" ? S.tables[t] || calls[t] : S.hf === "mine" ? ((_a2 = S.tables[t]) == null ? void 0 : _a2.waiter) === ((_b2 = S.me) == null ? void 0 : _b2.name) : true;
  });
  S.hm = store.get("hm", "tiles");
  S.f3m = store.get("f3m", "3d");
  S.mapSel = null;
  const hk = (cur) => String(cur.from);
  function mapPos(cur) {
    var _a2, _b2, _c;
    const n = cur.to - cur.from + 1, cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.5))), rows = Math.ceil(n / cols), m = {}, d = S.mapDraft;
    for (let t = cur.from; t <= cur.to; t++) {
      const i = t - cur.from, p = ((_a2 = d == null ? void 0 : d.pos) == null ? void 0 : _a2[t]) || !(d == null ? void 0 : d.r) && ((_c = (_b2 = S.cfg) == null ? void 0 : _b2.map) == null ? void 0 : _c[t]) || [Math.round((i % cols + 0.5) / cols * 1e3) / 10, Math.round((Math.floor(i / cols) + 0.5) / rows * 1e3) / 10];
      m[t] = [p[0], p[1], p[2] || "s", p[3] || 0];
    }
    return m;
  }
  const curHall = () => {
    const V2 = hallViews();
    return V2.find((v) => v.id === S.hall) || V2[0];
  };
  function mapStart() {
    var _a2, _b2, _c, _d;
    const c = curHall();
    S.mapEd = 1;
    S.mapSel = null;
    S.mapDraft = null;
    S.mapDraft = { pos: mapPos(c), deco: JSON.parse(JSON.stringify(((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.deco) == null ? void 0 : _b2[hk(c)]) || [])), floor: ((_d = (_c = S.cfg) == null ? void 0 : _c.floor) == null ? void 0 : _d[hk(c)]) || "wood" };
  }
  const mapStop = () => {
    S.mapEd = 0;
    S.mapDraft = null;
    S.mapSel = null;
  };
  async function mapSave() {
    const c = curHall(), d = S.mapDraft, r = await act("mapSet", { pos: mapPos(c), from: c.from, to: c.to, deco: d.deco, floor: d.floor }, "\u2705 \u0421\u0445\u0435\u043C\u0443 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (r == null ? void 0 : r.cfg) {
      S.cfg = r.cfg;
      if (S.data.staff) S.data.staff.cfg = r.cfg;
      mapStop();
      renderMain();
    }
  }
  function floorUI(cur, all, inF, calls, pending) {
    var _a2, _b2, _c, _d, _e, _f;
    const F = window.Floor3D;
    if (!F) return '<div class="muted" style="padding:14px">\u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443</div>';
    const mp2 = mapPos(cur), ed = S.mapEd, d = S.mapDraft, key = hk(cur);
    const tables = all.map((t) => {
      const b = S.tables[t], bk = !b && (S.books || []).find((x2) => x2.t === t && x2.st === "ok"), [x, y, sh, r] = mp2[t];
      const st2 = pending.has(t) || (b == null ? void 0 : b.pwait) ? "s-new pw" : b ? b.check ? "s-check" : "s-busy" : bk ? "s-book" : "";
      const sub = b ? `<small>${b.pwait ? "\u{1F310} " : b.check ? "\u{1F9FE} " : pending.has(t) ? "\u{1F6CE} " : ""}${money(b.pay2)}</small>` : bk ? `<small>\u{1F4C5} ${bk.time}</small>` : "";
      return { t, x, y, sh, r, cls: `${st2}${calls[t] ? " call" : ""}${inF.has(t) ? "" : " dim"}`, attrs: ed ? "" : `data-a="table" data-t="${t}"`, pin: `<b>${calls[t] ? "\u{1F514}" : ""}${t}</b>${sub}` };
    });
    requestAnimationFrame(() => {
      const el = $(".f3");
      if (el) {
        F.fit();
        F.watch(el);
      }
    });
    const plan = F.html({ tables, deco: ed ? d.deco : ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.deco) == null ? void 0 : _b2[key]) || [], floor: ed ? d.floor : (_d = (_c = S.cfg) == null ? void 0 : _c.floor) == null ? void 0 : _d[key], mode: ed ? "2d" : S.f3m, edit: ed, sel: S.mapSel });
    if (!ed) return `<div class="f3w">${plan}</div>`;
    const sel = S.mapSel, st = (sel == null ? void 0 : sel[0]) === "t" ? +sel.slice(1) : null, sd = (sel == null ? void 0 : sel[0]) === "d" ? +sel.slice(1) : null, dx = sd != null ? d.deco[sd] : null;
    const tools = st != null ? `<div class="f3-tools"><b>\u{1FA91} \u0421\u0442\u0456\u043B ${st}</b>${Object.entries(F.SH).map(([k, v]) => `<button class="chip${mp2[st][2] === k ? " on" : ""}" data-hl="msh" data-h="${k}">${v.n}</button>`).join("")}<button class="btn sm" data-hl="mrot">\u21BB \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</button></div>` : dx ? `<div class="f3-tools"><b>${((_e = F.K[dx[0]]) == null ? void 0 : _e.n) || ""}</b><button class="btn sm" data-hl="mrot">\u21BB \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</button>${((_f = F.K[dx[0]]) == null ? void 0 : _f.len) ? '<button class="btn sm" data-hl="mlen" data-h="-40">\u27F7 \u2212</button><button class="btn sm" data-hl="mlen" data-h="40">\u27F7 +</button>' : ""}<button class="btn sm" data-hl="mdup">\u29C9 \u041A\u043E\u043F\u0456\u044F</button><button class="btn sm red" data-hl="mdel">\u{1F5D1}</button></div>` : '<div class="f3-tools muted">\u041F\u0435\u0440\u0435\u0442\u044F\u0433\u0443\u0439\u0442\u0435 \u0441\u0442\u043E\u043B\u0438 \u0439 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0438 \xB7 \u0442\u043E\u0440\u043A\u043D\u0456\u0442\u044C\u0441\u044F \u2014 \u0437\u2019\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u0434\u0456\u0457<button class="btn sm" data-hl="mreset" style="margin-left:auto">\u21BA \u0420\u044F\u0434\u0430\u043C\u0438</button></div>';
    return `<div class="f3w"><div class="f3-bar"><button class="f3-ic" data-hl="mno" title="\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438">\u2715</button><b class="f3-title">${esc(cur.n)}</b><button class="btn sm primary" data-hl="msave">\u0413\u043E\u0442\u043E\u0432\u043E</button></div>${plan}${tools}
      <div class="f3-pal">${Object.entries(F.K).map(([k, v]) => `<button data-hl="madd" data-h="${k}">${v.n}</button>`).join("")}</div>
      <div class="f3-pal fl">${Object.entries(F.FLOORS).map(([k, v]) => `<button class="${d.floor === k ? "on" : ""}" data-hl="mfl" data-h="${k}">${v}</button>`).join("")}</div></div>`;
  }
  let drag = null;
  document.addEventListener("pointerdown", (ev) => {
    var _a2;
    const el = S.mapEd && ev.target.closest(".f3.edit [data-mt], .f3.edit [data-md]");
    if (!el) return;
    ev.preventDefault();
    drag = { el, box: el.closest(".f3-st").getBoundingClientRect(), id: el.dataset.mt ? "t" + el.dataset.mt : "d" + el.dataset.md, x0: ev.clientX, y0: ev.clientY, mv: 0 };
    (_a2 = el.setPointerCapture) == null ? void 0 : _a2.call(el, ev.pointerId);
  });
  document.addEventListener("pointermove", (ev) => {
    var _a2, _b2;
    if (!drag) return;
    const { el, box } = drag;
    if (!drag.mv && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 4) return;
    drag.mv = 1;
    const x = Math.round(Math.min(98, Math.max(2, (ev.clientX - box.left) / box.width * 100)) * 2) / 2, y = Math.round(Math.min(98, Math.max(2, (ev.clientY - box.top) / box.height * 100)) * 2) / 2;
    el.style.left = x + "%";
    el.style.top = y + "%";
    const d = S.mapDraft;
    if (!d) return;
    if (el.dataset.mt) {
      const p = (_a2 = d.pos)[_b2 = el.dataset.mt] || (_a2[_b2] = [x, y, "s", 0]);
      p[0] = x;
      p[1] = y;
    } else {
      const p = d.deco[+el.dataset.md];
      if (p) {
        p[1] = x;
        p[2] = y;
      }
    }
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (S.mapSel !== id) {
      S.mapSel = id;
      renderMain();
    }
  });
  document.addEventListener("click", (ev) => {
    if (S.mapEd && ev.target.closest("[data-mt]")) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);
  function mapEdit(a, h) {
    var _a2;
    const d = S.mapDraft, F = window.Floor3D;
    if (!d) return;
    const sel = S.mapSel || "", i = +sel.slice(1);
    if (a === "madd") {
      if (d.deco.length >= 150) return toast("\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 150 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0456\u0432");
      const f = $(".f3"), cx = f ? Math.round(Math.min(90, Math.max(10, (f.scrollLeft + f.clientWidth / 2) / f.scrollWidth * 100))) : 50, cy = f ? Math.round(Math.min(90, Math.max(10, (f.scrollTop + f.clientHeight / 2) / f.scrollHeight * 100))) : 50, j = d.deco.length % 4 * 3;
      d.deco.push([h, cx + j, cy + j, 0, ((_a2 = F.K[h]) == null ? void 0 : _a2.len) || 0]);
      S.mapSel = "d" + (d.deco.length - 1);
    }
    if (a === "mfl") d.floor = h;
    if (a === "msh" && sel[0] === "t") d.pos[i][2] = h;
    if (a === "mrot") {
      if (sel[0] === "t") d.pos[i][3] = ((d.pos[i][3] || 0) + 45) % 360;
      else if (d.deco[i]) d.deco[i][3] = ((+d.deco[i][3] || 0) + 45) % 360;
    }
    if (a === "mlen" && d.deco[i]) d.deco[i][4] = Math.max(40, Math.min(700, (+d.deco[i][4] || F.K[d.deco[i][0]].len) + +h));
    if (a === "mdup" && d.deco[i] && d.deco.length < 150) {
      const c = [...d.deco[i]];
      c[1] = Math.min(98, c[1] + 4);
      c[2] = Math.min(98, c[2] + 4);
      d.deco.push(c);
      S.mapSel = "d" + (d.deco.length - 1);
    }
    if (a === "mdel" && d.deco[i]) {
      d.deco.splice(i, 1);
      S.mapSel = null;
    }
    if (a === "mreset") {
      d.pos = {};
      d.r = 1;
      d.pos = mapPos(curHall());
    }
    renderMain();
  }
  const hallSet = (h) => {
    mapStop();
    S.hall = h;
    store.set("hall", h);
    renderMain();
  };
  async function hallPick() {
    var _a2, _b2;
    const all = isAdmin() ? null : ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.halls) == null ? void 0 : _b2.length) > 1 ? 1 : null, V2 = hallViews();
    const h = await choose("\u{1F3DB} \u0417\u0430\u043B", "", [...V2.map((v) => ({ label: `${v.ic} ${v.n}${v.go ? "" : ` \xB7 ${v.from}\u2013${v.to}`}`, val: v.id })), ...all ? [{ label: "\u2B50 \u041C\u043E\u0457 \u0437\u0430\u043B\u0438\u2026", val: "*" }] : []]);
    if (h === "*") return myHalls();
    if (h) hallSet(h);
  }
  async function myHalls() {
    const H = S.cfg.halls, cur = store.get("myHalls", []) || [], pick = new Set(cur);
    for (; ; ) {
      const v = await choose("\u2B50 \u041C\u043E\u0457 \u0437\u0430\u043B\u0438", "\u041F\u043E\u0437\u043D\u0430\u0447\u0442\u0435 \u0437\u0430\u043B\u0438, \u044F\u043A\u0456 \u043F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457. \u041F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u0443\u0441\u0456.", [...H.map((h, i) => ({ label: `${pick.has("h" + i) ? "\u2705" : "\u25AB\uFE0F"} ${h.ic} ${h.n}`, val: "h" + i })), { label: "\u{1F4BE} \u0413\u043E\u0442\u043E\u0432\u043E", val: "ok", cls: "primary" }]);
      if (!v) return;
      if (v === "ok") break;
      pick.has(v) ? pick.delete(v) : pick.add(v);
    }
    store.set("myHalls", [...pick]);
    if (pick.size && !pick.has(S.hall)) S.hall = [...pick][0];
    renderMain();
  }
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-hl]");
    if (!el) return;
    const a = el.dataset.hl;
    if (a === "set") return hallSet(el.dataset.h);
    if (a === "pick") return hallPick();
    if (a === "go") {
      S.hall = el.dataset.h;
      store.set("hall", S.hall);
      renderMain();
      return openTable(+el.dataset.t);
    }
    if (a === "hm") {
      if (S.hm !== "map") {
        S.hm = "map";
        S.f3m = "3d";
      } else if (S.f3m === "3d") S.f3m = "2d";
      else S.hm = "tiles";
      store.set("hm", S.hm);
      store.set("f3m", S.f3m);
      mapStop();
      return renderMain();
    }
    if (a === "mno") {
      mapStop();
      return renderMain();
    }
    if (a === "msave") return mapSave();
    if (["madd", "mfl", "msh", "mrot", "mlen", "mdup", "mdel", "mreset"].includes(a)) return mapEdit(a, el.dataset.h);
    if (a === "hf") {
      S.hf = el.dataset.h;
      store.set("hf", S.hf);
      return renderMain();
    }
  });
  function wlFree(t) {
    const n = (S.wl || []).find((x) => x.st === "wait");
    if (!n) return;
    toast(`\u23F3 \u0421\u0442\u0456\u043B ${tn(t)} \u0432\u0456\u043B\u044C\u043D\u0438\u0439 \u2014 \u043F\u043E\u043A\u043B\u0438\u043A\u0430\u0442\u0438 ${n.name} (${n.people} \u043E\u0441.)?`, { label: "\u{1F514} \u041F\u043E\u043A\u043B\u0438\u043A\u0430\u0442\u0438", fn: async () => {
      if (await act("wlAct", { id: n.id, act: "call" }, "\u{1F514} \u041F\u043E\u043A\u043B\u0438\u043A\u0430\u043B\u0438")) loadState().catch(() => {
      });
    } });
  }
  async function wlOpen() {
    const ago = (x) => Math.max(0, Math.round((Date.now() - x.at) / 6e4));
    const rows = (S.wl || []).map((x, i) => `<div class="kv" style="flex-wrap:wrap;gap:6px"><span style="min-width:0;overflow-wrap:anywhere">${i + 1}. <b>${esc(x.name)}</b> \xB7 ${x.people} \u043E\u0441. \xB7 ${ago(x)} \u0445\u0432${x.st === "called" ? " \xB7 \u{1F514}" : ""}${x.phone ? ` \xB7 ${esc(x.phone)}` : ""}</span><span class="row" style="gap:6px"><button class="btn sm" data-mi-v="call:${x.id}">\u{1F514}</button><button class="btn sm" data-mi-v="seat:${x.id}">\u{1FA91}</button><button class="btn sm ghost" data-mi-v="gone:${x.id}">\u2716</button></span></div>`).join("") || '<div class="muted">\u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>';
    const v = await modal({ title: "\u23F3 \u0427\u0435\u0440\u0433\u0430 \u0432 \u0437\u0430\u043B\u0456", body: rows, buttons: [{ label: "\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044F", val: "add", cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (!v) return;
    if (v === "add") {
      const name = await ask("\u0406\u043C\u02BC\u044F \u0433\u043E\u0441\u0442\u044F");
      if (!name) return;
      const p = await ask("\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u043B\u044E\u0434\u0435\u0439?", "2", "number");
      if (!p) return;
      const r = await act("wlAdd", { name, people: +p }, "\u23F3 \u0414\u043E\u0434\u0430\u043D\u043E \u0432 \u0447\u0435\u0440\u0433\u0443");
      if (r) {
        await loadState().catch(() => {
        });
        wlOpen();
      }
      return;
    }
    const [a, id] = String(v).split(":");
    let tt = 0;
    if (a === "seat") {
      tt = await pickTable("\u{1FA91} \u0417\u0430 \u044F\u043A\u0438\u0439 \u0441\u0442\u0456\u043B?", "");
      if (!tt) return;
    }
    if (await act("wlAct", { id, act: a, t: tt }, { call: "\u{1F514} \u041F\u043E\u043A\u043B\u0438\u043A\u0430\u043B\u0438", seat: "\u{1FA91} \u041F\u043E\u0441\u0430\u0434\u0438\u043B\u0438", gone: "\u2716 \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E" }[a])) {
      await loadState().catch(() => {
      });
      if ((S.wl || []).length) wlOpen();
    }
  }
  on("table", async (el, e, a, t) => {
    $("#feed").classList.remove("open");
    openTable(el.dataset.t);
    return;
  });
  on("newOrder", async (el, e, a, t) => {
    {
      const n = await pickTable("\u041D\u043E\u0432e \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0456\u043B", 0, true);
      if (n === "pick" || n === "del") goNew(n);
      else if (n) {
        openTable(n);
        S.mobileMenu = true;
        renderSheet();
      }
      return;
    }
  });
  on("closeSheet", async (el, e, a, t) => {
    closeSheet();
    return;
  });
  on("tab", async (el, e, a, t) => {
    S.mobileMenu = el.dataset.m === "1";
    renderSheet();
    return;
  });
  on("mobileMenu", async (el, e, a, t) => {
    S.mobileMenu = true;
    renderSheet();
    return;
  });
  on("cat", async (el, e, a, t) => {
    S.cat = el.dataset.c;
    S.q = "";
    renderSheet();
    $("#shItems").scrollTop = 0;
    return;
  });
  on("grp", async (el, e, a, t) => {
    S.grp = el.dataset.g;
    S.cat = "";
    S.q = "";
    store.set("grp", S.grp);
    renderSheet();
    $("#shItems").scrollTop = 0;
    return;
  });
  on("fav", async (el, e, a, t) => {
    {
      const on2 = !S.fav.includes(el.dataset.id);
      S.fav = on2 ? [...S.fav, el.dataset.id] : S.fav.filter((x) => x !== el.dataset.id);
      renderSheet();
      act("fav", { id: el.dataset.id, on: on2 }, on2 ? "\u2B50 \u0414\u043E\u0434\u0430\u043D\u043E \u0432 \u043E\u0431\u0440\u0430\u043D\u0456" : "\u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E \u0437 \u043E\u0431\u0440\u0430\u043D\u0438\u0445");
      return;
    }
  });
  on("tw", async (el, e, a, t) => {
    {
      if (t === -1 || t > 1e3) {
        S.tw[t] = !S.tw[t];
        S.packAdj[t] = 0;
        renderSheet();
        return;
      }
      const k = await choose("\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E", "\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0434\u0435 \u043E\u043A\u0440\u0435\u043C\u0438\u043C \u0447\u0435\u043A\u043E\u043C; \u0441\u0442\u0456\u043B \u043D\u0435 \u0437\u0430\u0439\u043C\u0430\u0454\u0442\u044C\u0441\u044F", [{ label: "\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437", val: "pick", cls: "primary" }, { label: "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", val: "del", cls: "primary" }]);
      if (k) goNew(k, t);
      return;
    }
  });
  on("ur", async (el, e, a, t) => {
    S.ur[t] = !S.ur[t];
    renderSheet();
    return;
  });
  on("pk", async (el, e, a, t) => {
    {
      const cur = packQ(t);
      if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d;
      renderSheet();
      return;
    }
  });
  on("photos", async (el, e, a, t) => {
    S.photos = !S.photos;
    store.set("photos", S.photos);
    renderSheet();
    return;
  });
  on("add", async (el, e, a, t) => {
    addItem(el.dataset.id);
    return;
  });
  on("cq", async (el, e, a, t) => {
    {
      const c = cartOf(t), x = c[el.dataset.k];
      if (x) {
        x.q += +el.dataset.d;
        if (x.q <= 0) delete c[el.dataset.k];
      }
      saveCarts();
      renderSheet();
      return;
    }
  });
  on("cartClear", async (el, e, a, t) => {
    S.carts[t] = {};
    saveCarts();
    renderSheet();
    return;
  });
  on("send", async (el, e, a, t) => {
    sendCart();
    return;
  });
  on("books", async (el, e, a, t) => {
    S.view = "books";
    renderNav();
    renderMain();
    loadView();
    return;
  });
  on("bonCert", async (el, e, a, t) => {
    var _a2, _b2;
    {
      const v = await choose("\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \xB7 \u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442", ((_a2 = S.tables[t]) == null ? void 0 : _a2.cli) ? "\u0413\u0456\u0441\u0442\u044C \u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C \u0443\u0436\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u0438\u0439" : "\u0429\u043E \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u0442\u0438 \u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0443?", [{ label: ((_b2 = S.tables[t]) == null ? void 0 : _b2.cli) ? "\u{1F381} \u0413\u0456\u0441\u0442\u044C \u0456 \u0431\u043E\u043D\u0443\u0441\u0438" : "\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \u0433\u043E\u0441\u0442\u044F (\u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C)", val: "cli", cls: "primary" }, { label: "\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 (\u043A\u043E\u0434)", val: "cert" }, { label: "\u{1F382} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u043D\u0430 \u0414\u041D", val: "bd" }]);
      if (v === "cli") cliT(t);
      else if (v === "cert") certT(t);
      else if (v === "bd") bdGiftT(t);
      return;
    }
  });
  on("cliBon0", async (el, e, a, t) => {
    {
      const b = S.tables[t];
      if (b == null ? void 0 : b.cert) {
        if (!await confirmBox(b.cert.code && b.bonus > b.cert.sum ? "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0456 \u0431\u043E\u043D\u0443\u0441\u0438 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443?" : "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442 \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443?")) return;
        if (!await act("certOff", { t }, "\u21A9\uFE0F \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E")) return;
        if (b.bonus > b.cert.sum && b.cli) await act("cliBonus", { t, sum: 0 });
      } else if (!await act("cliBonus", { t, sum: 0 })) return;
      loadState().catch(() => {
      });
      return;
    }
  });
  on("rm", async (el, e, a, t) => {
    {
      const reason = await voidReason(`\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 1\xD7 ${el.dataset.name}?`);
      if (reason) act("remove", { t, name: el.dataset.name, reason }, "\u270F\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
      return;
    }
  });
  on("disc", async (el, e, a, t) => {
    discFlow();
    return;
  });
  on("tipSet", async (el, e, a, t) => {
    act("tip", { t, sum: 0 }, "\u0427\u0430\u0439\u043E\u0432\u0456 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
    return;
  });
  on("discSet", async (el, e, a, t) => {
    act("discount", { t, pct: 0 }, "\u0417\u043D\u0438\u0436\u043A\u0443 \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
    return;
  });
  on("vBack", async (el, e, a, t) => {
    if (await confirmBox("\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u043D\u0430 \u0441\u0442\u0456\u043B? \u0412\u043E\u043D\u0430 \u0437\u043D\u043E\u0432\u0443 \u0431\u0443\u0434\u0435 \u0432 \u0440\u0430\u0445\u0443\u043D\u043A\u0443.")) {
      if (await act("voidBack", { ts: +el.dataset.ts }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u043D\u0430 \u0441\u0442\u0456\u043B")) loadView();
    }
    return;
  });
  on("move", async (el, e, a, t) => {
    moveFlow();
    return;
  });
  on("split", async (el, e, a, t) => {
    splitFlow();
    return;
  });
  on("spq", async (el, e, a, t) => {
    {
      const i = +el.dataset.i, it = S.spl.items[i];
      S.spl.q[i] = Math.max(0, Math.min(it.q, (S.spl.q[i] || 0) + +el.dataset.d));
      splitRender();
      return;
    }
  });
  on("closeT", async (el, e, a, t) => {
    closeFlow();
    return;
  });
  on("delTable", async (el, e, a, t) => {
    var _a2, _b2;
    {
      const pb = S.tables[t], pp = ((_a2 = pb == null ? void 0 : pb.paid) == null ? void 0 : _a2.sum) || (((_b2 = pb == null ? void 0 : pb.go) == null ? void 0 : _b2.paid) && !pb.go.paid.ref ? pb.go.paid.sum : 0);
      if (pp) {
        if (!isAdmin()) {
          toast("\u{1F4B3} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D \u2014 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043C\u043E\u0436\u0435 \u043B\u0438\u0448\u0435 \u0430\u0434\u043C\u0456\u043D (\u0437 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F\u043C \u0433\u0440\u043E\u0448\u0435\u0439)");
          return;
        }
        if (!await confirmBox(`\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0433\u043E\u0441\u0442\u044E ${money(pp)} \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443?`, "\u0421\u0442\u0456\u043B \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u043D\u043B\u0430\u0439\u043D. \u0421\u043F\u0435\u0440\u0448\u0443 \u043F\u043E\u0432\u0435\u0440\u0442\u0430\u0454\u043C\u043E \u0433\u0440\u043E\u0448\u0456 \u0447\u0435\u0440\u0435\u0437 LiqPay, \u043F\u043E\u0442\u0456\u043C \u2014 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F.")) return;
        if (!await act("tpayRefund", { t }, "\u21A9\uFE0F \u0413\u0440\u043E\u0448\u0456 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E")) return;
      }
      const reason = await voidReason(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0435\u0441\u044C \u0441\u0442\u0456\u043B ${tn(t)}? \u0421\u0443\u043C\u0430 \u041D\u0415 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0440\u0443\u0447\u043A\u0443`);
      if (reason) {
        const r = await act("delete", { t, reason }, `\u{1F5D1} \u0421\u0442\u0456\u043B ${tn(t)} \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E`);
        if (r) closeSheet();
      }
      return;
    }
  });
  on("evAck", async (el, e, a, t) => {
    act("evAck", { id: el.dataset.id }, "\u2705 \u0412\u0438 \u0439\u0434\u0435\u0442\u0435 \u0434\u043E \u0433\u043E\u0441\u0442\u044F");
    return;
  });
  on("tpayOk", async (el, e, a, t) => {
    {
      const tt = +el.dataset.t, b = S.tables[tt];
      const due = (b == null ? void 0 : b.paid) ? Math.max(0, b.pay2 - (b.paid.net || 0)) : 0;
      let pay = "cash";
      if (due > 0) {
        pay = await choose(`\u0421\u0442\u0456\u043B ${tn(tt)}: \u0434\u043E\u043F\u043B\u0430\u0442\u0430 ${money(due)}`, "\u0413\u0456\u0441\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0438\u0432 \u043E\u043D\u043B\u0430\u0439\u043D \u043D\u0435 \u0432\u0441\u0435 (\u0434\u043E\u0434\u0430\u043B\u0438 \u0441\u0442\u0440\u0430\u0432\u0438). \u042F\u043A \u0434\u043E\u043F\u043B\u0430\u0442\u0438\u043B\u0438?", [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", val: "cash" }, { label: "\u{1F4B3} \u0422\u0435\u0440\u043C\u0456\u043D\u0430\u043B", val: "card" }]);
        if (!pay) return;
      }
      const r = await act("tpayOk", { t: tt, pay }, `\u2705 \u0421\u0442\u0456\u043B ${tn(tt)} \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u2014 \u{1F310} \u043E\u043D\u043B\u0430\u0439\u043D`);
      if (r && S.open === tt) closeSheet();
      return;
    }
  });
  on("tpayRefund", async (el, e, a, t) => {
    var _a2;
    {
      const tt = +el.dataset.t, b = S.tables[tt];
      if (await confirmBox(`\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0433\u043E\u0441\u0442\u044E ${money(((_a2 = b == null ? void 0 : b.paid) == null ? void 0 : _a2.sum) || 0)} \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443?`, `\u0421\u0442\u0456\u043B ${tn(tt)} \u043B\u0438\u0448\u0438\u0442\u044C\u0441\u044F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438\u043C. \u041F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0447\u0435\u0440\u0435\u0437 LiqPay \u2014 \u0433\u0440\u043E\u0448\u0456 \u043F\u0440\u0438\u0439\u0434\u0443\u0442\u044C \u0433\u043E\u0441\u0442\u044E \u0437\u0430 1\u20137 \u0434\u043D\u0456\u0432.`)) await act("tpayRefund", { t: tt }, "\u21A9\uFE0F \u0413\u0440\u043E\u0448\u0456 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0433\u043E\u0441\u0442\u044E");
      return;
    }
  });
  on("reject", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F?", "\u041F\u043E\u0437\u0438\u0446\u0456\u0457 \u043F\u0440\u0438\u0431\u0435\u0440\u0443\u0442\u044C\u0441\u044F \u0437 \u0440\u0430\u0445\u0443\u043D\u043A\u0443, \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \u043D\u0435 \u043F\u0456\u0434\u0435, \u0433\u0456\u0441\u0442\u044C \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \xAB\u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E\xBB")) {
      await act("reject", { oid: el.dataset.oid }, "\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E");
      loadState().catch(() => {
      });
    }
    return;
  });
  on("cReopen", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443?", "\u0412\u0456\u043D \u0437\u043D\u0456\u043C\u0435\u0442\u044C\u0441\u044F \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0439 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B \u2014 \u0432\u0438\u043F\u0440\u0430\u0432\u0438\u0442\u0435 \u0439 \u0437\u0430\u043A\u0440\u0438\u0454\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E")) {
      const r = await act("closedReopen", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u0420\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u043D\u043E\u0432\u0443 \u043D\u0430 \u0441\u0442\u043E\u043B\u0456");
      loadView();
      loadState().catch(() => {
      });
      if (r == null ? void 0 : r.x) openTable(r.x.t);
    }
    return;
  });
  on("tBack", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u0438\u0439 \u0441\u0442\u0456\u043B?", "\u0421\u0442\u0440\u0430\u0432\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0456\u043B")) {
      const r = await act("tableBack", { ref: el.dataset.ref, day: S.data.cday }, "\u21A9\uFE0F \u0421\u0442\u0456\u043B \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
      loadView();
      loadState().catch(() => {
      });
      if (r == null ? void 0 : r.x) openTable(r.x.t);
    }
    return;
  });
  on("cDay", async (el, e, a, t) => {
    {
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
      return;
    }
  });
  on("cFis", async (el) => {
    const r = await api("fisRetry", { ref: el.dataset.ref, day: el.dataset.d || void 0 });
    toast(r.st === "err" ? "\u26A0\uFE0F " + (r.err || "Checkbox \u043D\u0435 \u043F\u0440\u0438\u0439\u043D\u044F\u0432") : "\u{1F9FE} \u0427\u0435\u043A \u0444\u0456\u0441\u043A\u0430\u043B\u0456\u0437\u043E\u0432\u0430\u043D\u043E");
    loadView();
  });
  const RXS = ["\u{1F44D}", "\u2705", "\u{1F525}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}"];
  const QUICK = ["\u{1F3C3} \u0406\u0434\u0443", "\u23F1 5 \u0445\u0432", "\u26D4 \u041D\u0435\u043C\u0430 \u0432 \u043D\u0430\u044F\u0432\u043D\u043E\u0441\u0442\u0456", "\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432", "\u{1F37D} \u0413\u043E\u0442\u043E\u0432\u043E", "\u{1F44C} \u041E\u043A"];
  S.evRead = store.get("evRead", {});
  S.evDisc = store.get("evDisc", 0);
  S.evc = null;
  S.evNames = null;
  const evRx = (o, c) => o.rx ? `<div class="rxs">${Object.entries(o.rx).map(([r, a]) => {
    var _a2;
    return `<button class="rx${a.includes((_a2 = S.me) == null ? void 0 : _a2.name) ? " on" : ""}" data-ec="rx" data-rx="${r}"${c ? ` data-c="${c}"` : ""} title="${esc(a.join(", "))}">${r} ${a.length}</button>`;
  }).join("")}</div>` : "";
  const evUnread = (e) => {
    var _a2, _b2, _c, _d;
    if (e.k === "chat" && !S.evRead[e.id] && !e.cm && e.by !== ((_a2 = S.me) == null ? void 0 : _a2.name)) return !(e.seen || []).includes((_b2 = S.me) == null ? void 0 : _b2.name);
    const n = ((_c = e.cm) == null ? void 0 : _c.length) || 0;
    return n > (S.evRead[e.id] || 0) && e.cm[n - 1].by !== ((_d = S.me) == null ? void 0 : _d.name);
  };
  const evMention = (e) => {
    var _a2;
    return evUnread(e) && (!e.cm ? !!((_a2 = e.m) == null ? void 0 : _a2.some(isMe)) : e.cm.slice(S.evRead[e.id] || 0).some((c) => {
      var _a3, _b2;
      return c.by !== ((_a3 = S.me) == null ? void 0 : _a3.name) && ((_b2 = c.m) == null ? void 0 : _b2.some(isMe));
    }));
  };
  const isMe = (x) => {
    var _a2;
    return x.replace(/_/g, " ").toLowerCase() === (((_a2 = S.me) == null ? void 0 : _a2.name) || "").toLowerCase();
  };
  const cmText = (c) => esc(c.text).replace(/@([^\s@,.!?]{2,24})/g, '<b class="ment">@$1</b>');
  function evFoot(e) {
    var _a2, _b2;
    const n = ((_a2 = e.cm) == null ? void 0 : _a2.length) || 0, last = n ? e.cm[n - 1] : null, un = evUnread(e);
    if (!n && !e.pin && !e.rx) return "";
    return `${evRx(e)}<div class="evf">${e.pin ? '<span class="pin">\u{1F4CC}</span>' : ""}<span class="evc${un ? " un" : ""}${evMention(e) ? " me" : ""}">\u{1F4AC} ${n || ""}${un ? " \u043D\u043E\u0432\u0435" : ""}</span>${last ? `<span class="evl"><b>${esc(last.by)}:</b> ${last.v ? "\u{1F399} \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0435" : esc(last.text)}</span>` : '<span class="evl"></span>'}${((_b2 = e.seen) == null ? void 0 : _b2.length) ? `<span class="seen" title="${esc(e.seen.join(", "))}">\u{1F441} ${e.seen.length}</span>` : ""}</div>`;
  }
  function evList() {
    let l = [...S.events].reverse();
    if (S.evDisc) l = l.filter((e) => {
      var _a2;
      return e.k === "chat" || ((_a2 = e.cm) == null ? void 0 : _a2.length) || e.pin;
    }).sort((a, b) => lastTs(b) - lastTs(a));
    else l = l.filter((e) => e.k !== "chat");
    return [...l.filter((e) => e.pin), ...l.filter((e) => !e.pin)];
  }
  const lastTs = (e) => e.cm ? e.cm[e.cm.length - 1].ts : e.ts;
  const evHead = () => `<div class="evtabs"><button class="${S.evDisc ? "" : "on"}" data-ec="disc" data-v="0">\u0423\u0441\u0456</button><button class="${S.evDisc ? "on" : ""}" data-ec="disc" data-v="1">\u{1F4AC} \u0427\u0430\u0442${(() => {
    const n = S.events.filter(evUnread).length;
    return n ? ` <span class="badge">${n}</span>` : "";
  })()}</button></div>${S.evDisc ? `<div class="chat-in"><input id="chatIn" placeholder="\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0432\u0441\u0456\u043C\u2026 (@\u0456\u043C'\u044F \u2014 \u0437\u0433\u0430\u0434\u0430\u0442\u0438)" maxlength="500" autocomplete="off"><button class="btn sm primary" data-ec="say">\u27A4</button></div>` : ""}`;
  async function chatSay() {
    const i = $("#chatIn"), text = i == null ? void 0 : i.value.trim();
    if (!text) return;
    i.value = "";
    const r = await act("chatSay", { text });
    if (r == null ? void 0 : r.e) {
      S.events.push(r.e);
      S.evRead[r.e.id] = 0;
      renderFeed();
    }
  }
  function evNotify(prev) {
    var _a2, _b2, _c, _d;
    if (!(prev == null ? void 0 : prev.length)) return;
    const old = Object.fromEntries(prev.map((e) => {
      var _a3;
      return [e.id, ((_a3 = e.cm) == null ? void 0 : _a3.length) || 0];
    }));
    let any = 0, me = 0;
    for (const e of S.events) for (const c of (e.cm || []).slice((_b2 = old[e.id]) != null ? _b2 : ((_a2 = e.cm) == null ? void 0 : _a2.length) || 0)) if (c.by !== ((_c = S.me) == null ? void 0 : _c.name)) {
      any = 1;
      if ((_d = c.m) == null ? void 0 : _d.some(isMe)) me = 1;
    }
    if (me) {
      ding();
      setTimeout(() => ding(), 700);
      toast("\u{1F4AC} \u0412\u0430\u0441 \u0437\u0433\u0430\u0434\u0430\u043B\u0438 \u0432 \u0441\u0442\u0440\u0456\u0447\u0446\u0456");
    } else if (any && !isCook()) ding("pop");
  }
  const evGet = () => S.events.find((e) => e.id === S.evc);
  function evcOpen(id) {
    var _a2, _b2;
    S.evc = id;
    const e = evGet();
    if (!e) return;
    (_a2 = $("#evcBox")) == null ? void 0 : _a2.remove();
    const d = document.createElement("div");
    d.id = "evcBox";
    d.className = "evc-bg";
    d.innerHTML = `<div class="evc-sh"><div class="evc-hd" id="evcHd"></div><div class="evc-list" id="evcList"></div><div class="evc-ment" id="evcMent"></div>
      <div class="evc-q">${QUICK.map((q) => `<button class="chip" data-ec="q">${q}</button>`).join("")}</div>
      <div class="evc-in"><button class="btn sm ghost" data-ec="mic" id="evcMic" title="\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0435">\u{1F399}</button><input id="evcIn" placeholder="\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440\u2026 (@\u0456\u043C'\u044F \u2014 \u0437\u0433\u0430\u0434\u0430\u0442\u0438)" maxlength="300" autocomplete="off"><button class="btn sm primary" data-ec="send">\u27A4</button></div></div>`;
    document.body.append(d);
    evcRender(true);
    if (!(e.seen || []).includes((_b2 = S.me) == null ? void 0 : _b2.name)) api("evSeen", { id }).catch(() => {
    });
    if (matchMedia("(min-width:700px)").matches) setTimeout(() => {
      var _a3;
      return (_a3 = $("#evcIn")) == null ? void 0 : _a3.focus();
    }, 60);
  }
  function evcClose() {
    var _a2;
    evRecStop(true);
    S.evc = null;
    (_a2 = $("#evcBox")) == null ? void 0 : _a2.remove();
  }
  function evcRender(scroll) {
    var _a2, _b2, _c;
    const e = evGet(), L = $("#evcList");
    if (!L) return;
    if (!e) return evcClose();
    const cm = e.cm || [], mine = (c) => {
      var _a3;
      return c.by === ((_a3 = S.me) == null ? void 0 : _a3.name);
    }, me = (_a2 = S.me) == null ? void 0 : _a2.name;
    setHTML($("#evcHd"), `<div class="evc-t"><b>${evTitle(e)}</b><span class="tm">${e.at}${e.by ? " \xB7 " + esc(e.by) : ""}</span>${((_b2 = e.lines) == null ? void 0 : _b2.length) ? `<div class="lines">${e.lines.map(esc).join("\n")}</div>` : e.k === "ready" && e.text ? `<div class="lines">${esc(e.text)}</div>` : ""}${e.comment ? `<div class="com">\u{1F4AC} ${esc(e.comment)}</div>` : ""}</div>
      <div class="evc-tools">${RXS.map((r) => {
      var _a3, _b3, _c2;
      return `<button class="rx${((_b3 = (_a3 = e.rx) == null ? void 0 : _a3[r]) == null ? void 0 : _b3.includes(me)) ? " on" : ""}" data-ec="rx" data-rx="${r}">${r}${((_c2 = e.rx) == null ? void 0 : _c2[r]) ? " " + e.rx[r].length : ""}</button>`;
    }).join("")}<span class="sp"></span>${isAdmin() || e.by === me ? `<button class="btn sm ghost" data-ec="pin">${e.pin ? "\u{1F4CC} \u0412\u0456\u0434\u043A\u0440\u0456\u043F\u0438\u0442\u0438" : "\u{1F4CC}"}</button>` : ""}<button class="close-x" data-ec="close">\u2715</button></div>
      ${((_c = e.seen) == null ? void 0 : _c.length) ? `<div class="seen muted">\u{1F441} ${esc(e.seen.join(", "))}</div>` : ""}`);
    const atBottom = L.scrollHeight - L.scrollTop - L.clientHeight < 40;
    setHTML(L, cm.length ? cm.map((c) => {
      var _a3;
      return `<div class="cmt${mine(c) ? " me" : ""}${((_a3 = c.m) == null ? void 0 : _a3.some(isMe)) ? " ment-me" : ""}"><div class="cb"><div class="cw"><b>${esc(c.by)}</b><span class="tm">${c.at}</span></div>${c.v ? `<button class="btn sm voice" data-ec="play" data-v="${c.v}">\u25B6 \u{1F399} ${c.d ? c.d + " \u0441" : "\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0435"}</button>` : `<div class="ct">${cmText(c)}</div>`}</div>
      <div class="cr">${evRx(c, c.i)}<button class="lnk" data-ec="rx" data-rx="\u{1F44D}" data-c="${c.i}">\u{1F44D}</button><button class="lnk" data-ec="reply" data-n="${esc(c.by)}">\u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438</button>${mine(c) || isAdmin() ? `<button class="lnk" data-ec="del" data-c="${c.i}">\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>` : ""}</div></div>`;
    }).join("") : '<div class="muted" style="padding:18px;text-align:center">\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u0435\u0440\u0448\u0438\u043C</div>');
    if (scroll || atBottom) L.scrollTop = L.scrollHeight;
    S.evRead[e.id] = cm.length;
    store.set("evRead", S.evRead);
  }
  async function evcDo(op, data) {
    const r = await act(op, __spreadValues({ id: S.evc }, data));
    if (r == null ? void 0 : r.e) {
      const i = S.events.findIndex((x) => x.id === r.e.id);
      if (i >= 0) S.events[i] = r.e;
      evcRender(op === "evCom" || op === "evVoice");
      renderFeed();
    }
    return r;
  }
  async function evcSend(text) {
    text = (text != null ? text : $("#evcIn").value).trim();
    if (!text) return;
    $("#evcIn").value = "";
    $("#evcMent").innerHTML = "";
    await evcDo("evCom", { text });
  }
  async function evcMent() {
    const i = $("#evcIn"), m = i.value.slice(0, i.selectionStart).match(/@([^\s@]*)$/), box = $("#evcMent");
    if (!m) return setHTML(box, "");
    if (!S.evNames) S.evNames = (await api("evNames").catch(() => ({ list: [] }))).list;
    const q = m[1].toLowerCase(), l = S.evNames.filter((n) => {
      var _a2;
      return n !== ((_a2 = S.me) == null ? void 0 : _a2.name) && n.toLowerCase().includes(q);
    }).slice(0, 8);
    setHTML(box, l.map((n) => `<button class="chip" data-ec="ment" data-n="${esc(n)}">@${esc(n)}</button>`).join(""));
  }
  function evcPutMent(n) {
    const i = $("#evcIn"), p = i.selectionStart, pre = i.value.slice(0, p), tag = "@" + n.replace(/\s+/g, "_") + " ", a = /@[^\s@]*$/.test(pre) ? pre.replace(/@[^\s@]*$/, tag) : pre + (pre && !/\s$/.test(pre) ? " " : "") + tag;
    i.value = a + i.value.slice(p);
    i.focus();
    i.setSelectionRange(a.length, a.length);
    setHTML($("#evcMent"), "");
  }
  let rec = null;
  async function evRecStart() {
    if (!window.MediaRecorder) return toast("\u26A0\uFE0F \u0426\u0435\u0439 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0443\u0454 \u0433\u043E\u043B\u043E\u0441");
    let st;
    try {
      st = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return toast("\u26A0\uFE0F \u041D\u0435\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0443\u043F\u0443 \u0434\u043E \u043C\u0456\u043A\u0440\u043E\u0444\u043E\u043D\u0430");
    }
    const mt = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => {
      var _a2;
      return (_a2 = MediaRecorder.isTypeSupported) == null ? void 0 : _a2.call(MediaRecorder, t);
    });
    const mr = new MediaRecorder(st, __spreadProps(__spreadValues({}, mt ? { mimeType: mt } : {}), { audioBitsPerSecond: 16e3 })), ch = [], t0 = Date.now();
    rec = { mr, st, t0, cancel: false, tick: setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1e3);
      const b2 = $("#evcMic");
      if (b2) b2.textContent = `\u23F9 ${s} \u0441`;
      if (s >= 50) evRecStop();
    }, 500) };
    mr.ondataavailable = (x) => x.data.size && ch.push(x.data);
    mr.onstop = () => {
      const r = rec;
      rec = null;
      clearInterval(r.tick);
      r.st.getTracks().forEach((t) => t.stop());
      const b2 = $("#evcMic");
      if (b2) {
        b2.textContent = "\u{1F399}";
        b2.classList.remove("red");
      }
      if (r.cancel || !ch.length) return;
      const blob = new Blob(ch, { type: mr.mimeType || "audio/webm" }), fr = new FileReader();
      fr.onload = () => evcDo("evVoice", { data: fr.result, dur: Math.round((Date.now() - r.t0) / 1e3) });
      fr.readAsDataURL(blob);
    };
    mr.start();
    const b = $("#evcMic");
    b.classList.add("red");
    b.textContent = "\u23F9 0 \u0441";
  }
  function evRecStop(cancel) {
    if (!rec) return;
    rec.cancel = !!cancel;
    try {
      rec.mr.stop();
    } catch (e) {
    }
  }
  const voices = {};
  async function evPlay(v, btn) {
    try {
      if (!voices[v]) {
        const r = await api("evVoiceGet", { v });
        const b = Uint8Array.from(atob(r.b64), (c) => c.charCodeAt(0));
        voices[v] = URL.createObjectURL(new Blob([b], { type: r.mime }));
      }
      const a = new Audio(voices[v]);
      btn.classList.add("on");
      a.onended = () => btn.classList.remove("on");
      await a.play();
    } catch (x) {
      toast("\u26A0\uFE0F " + (x.message === "auth" ? "\u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0437\u043D\u043E\u0432\u0443" : errText(x.message)));
    }
  }
  document.addEventListener("click", async (ev) => {
    const el = ev.target.closest("[data-a], [data-ec]");
    if (!el || el.dataset.a) return;
    const a = el.dataset.ec;
    if (a === "open") return evcOpen(el.dataset.id);
    if (a === "disc") {
      S.evDisc = +el.dataset.v;
      store.set("evDisc", S.evDisc);
      return renderFeed();
    }
    if (a === "rx" && !S.evc) return;
    if (a === "say") return chatSay();
    if (a === "close") return evcClose();
    if (a === "send") return evcSend();
    if (a === "q") return evcSend(el.textContent);
    if (a === "rx") return evcDo("evRx", { rx: el.dataset.rx, c: el.dataset.c || "" });
    if (a === "pin") return evcDo("evPin", {});
    if (a === "del") {
      if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043A\u043E\u043C\u0435\u043D\u0442\u0430\u0440?")) evcDo("evComDel", { c: el.dataset.c });
      return;
    }
    if (a === "reply") return evcPutMent(el.dataset.n);
    if (a === "ment") return evcPutMent(el.dataset.n);
    if (a === "mic") return rec ? evRecStop() : evRecStart();
    if (a === "play") return evPlay(el.dataset.v, el);
  });
  document.addEventListener("click", (ev) => {
    if (ev.target.id === "evcBox") evcClose();
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "evcIn") evcMent();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.target.id === "evcIn" && ev.key === "Enter" && !ev.isComposing) {
      ev.preventDefault();
      evcSend();
    }
    if (ev.target.id === "chatIn" && ev.key === "Enter" && !ev.isComposing) {
      ev.preventDefault();
      chatSay();
    }
    if (ev.key === "Escape" && S.evc) evcClose();
  });
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
    const chip = (grp, v2, l, on2) => `<button class="chip sm${on2 ? " on" : ""}" data-g="${grp}" data-v="${v2}">${l}</button>`;
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
      var _a2, _b2;
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
      if (!$("#gA").value && ((_b2 = c.addr) == null ? void 0 : _b2[0])) $("#gA").value = c.addr[0];
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
    var _a2, _b2, _c;
    const me = (_a2 = S.me) == null ? void 0 : _a2.name, C = S.data.cour, all = Object.values(S.tables).filter((b) => b.t > 1e3 && b.t < 2e3 && b.go && !["new", "done", "rej"].includes(b.go.st));
    const fresh = all.filter((b) => !b.go.cour), mine = all.filter((b) => b.go.cour === me).sort((a, b) => (a.go.takeAt || 0) - (b.go.takeAt || 0));
    const seen = S.courSeen || (S.courSeen = /* @__PURE__ */ new Set());
    if (S.courReady && fresh.some((b) => !seen.has(b.t)) || mine.some((b) => b.go.st === "ready" && !seen.has("r" + b.t))) {
      ding();
      ((_b2 = navigator.userActivation) == null ? void 0 : _b2.hasBeenActive) && ((_c = navigator.vibrate) == null ? void 0 : _c.call(navigator, [200, 100, 200]));
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
        <div class="cr-row"><span>\u{1F464} ${esc(g.name || "\u2014")}</span>${g.phone ? `<a class="btn sm" href="tel:+${g.phone}">\u{1F4DE} ${fmtPh(g.phone)}</a>` : ""}</div>
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
        <div>${g.cour ? `\u{1F6F5} <b>${esc(g.cour)}</b>${g.st === "road" && g.roadAt ? ` \xB7 \u0432 \u0434\u043E\u0440\u043E\u0437\u0456 ${minsAgo(g.roadAt)} \u0445\u0432` : ""}${g.etaC ? ` \xB7 \u23F1 \u0431\u0443\u0434\u0443 \u043E ${hhmm(g.etaC)}` : ""}${g.st === "road" && g.loc ? ` \xB7 <a href="https://www.openstreetmap.org/?mlat=${g.loc.la}&mlon=${g.loc.lo}#map=16/${g.loc.la}/${g.loc.lo}" target="_blank" rel="noopener">\u{1F4CD} ${minsAgo(g.loc.ts)} \u0445\u0432 \u0442\u043E\u043C\u0443</a>` : ""}` : "\u26A0\uFE0F <b>\u043A\u0443\u0440'\u0454\u0440\u0430 \u043D\u0435\u043C\u0430\u0454</b>"}</div>
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
    var _a2, _b2;
    const L = ((_b2 = (_a2 = S.data.cours) == null ? void 0 : _a2.list) == null ? void 0 : _b2.filter((c) => c.n || c.left)) || [];
    if (!L.length) return "";
    return `<div class="card cr-adm"><h3>\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</h3>${L.map((c) => `<div class="kv"><span><b>${esc(c.name)}</b> ${c.tg ? "\u2708\uFE0F" : ""}<br><small class="muted">${c.n} \u0434\u043E\u0441\u0442\u0430\u0432\u043E\u043A${c.avg != null ? ` \xB7 \u2300 ${c.avg} \u0445\u0432 \u0443 \u0434\u043E\u0440\u043E\u0437\u0456` : ""} \xB7 \u0437\u0430\u0440\u043E\u0431\u0456\u0442\u043E\u043A ${money(c.earn)}${c.given ? ` \xB7 \u0437\u0434\u0430\u0432 ${money(c.given)}` : ""}</small></span><span class="kv-r"><b class="money">${money(c.left)}</b>${c.left > 0 ? `<button class="btn sm green" data-a="crGive" data-n="${esc(c.name)}" data-v="${c.left}">\u2705 \u041E\u0442\u0440\u0438\u043C\u0430\u0432</button>` : ""}</span></div>`).join("")}</div>`;
  }
  function goSetHTML() {
    var _a2, _b2, _c, _d;
    const c = S.data.gocfg;
    if (!c) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const row = (k, l, v, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ""}</span><span class="kv-r"><b>${v}</b><button class="btn sm" data-a="goCfg" data-k="${k}" data-l="${esc(l)}">${["on", "del", "pick", "track"].includes(k) ? c[k] ? "\u0432\u0438\u043C\u043A\u043D\u0443\u0442\u0438" : "\u0443\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438" : "\u0437\u043C\u0456\u043D\u0438\u0442\u0438"}</button></span></div>`;
    const yn = (v) => v ? "\u2705 \u0442\u0430\u043A" : "\u26D4 \u043D\u0456";
    return `<div class="grid2 set">
      <div class="card"><h3>\u{1F6F5} \u041F\u0440\u0438\u0439\u043E\u043C \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C</h3>${row("on", "\u{1F310} \u041F\u0440\u0438\u0439\u043C\u0430\u0442\u0438 \u0437 \u0441\u0430\u0439\u0442\u0443", yn(c.on))}${row("pick", "\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437", yn(c.pick))}${row("del", "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", yn(c.del))}
        ${row("from", "\u{1F550} \u041F\u0440\u0438\u0439\u043C\u0430\u0454\u043C\u043E \u0437", c.from)}${row("to", "\u{1F550} \u041F\u0440\u0438\u0439\u043C\u0430\u0454\u043C\u043E \u0434\u043E", c.to, "\u041F\u043E\u0437\u0430 \u0446\u0438\u043C \u0447\u0430\u0441\u043E\u043C \u0433\u0456\u0441\u0442\u044C \u043C\u043E\u0436\u0435 \u0437\u0430\u043C\u043E\u0432\u0438\u0442\u0438 \u043B\u0438\u0448\u0435 \u043D\u0430 \u0447\u0430\u0441")}${row("prep", "\u23F1 \u0413\u043E\u0442\u0443\u0454\u043C\u043E \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u043D\u043E", c.prep + " \u0445\u0432", "\u0414\u043B\u044F \xAB\u043E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u043E \u043E\u2026\xBB \u0443 \u0433\u043E\u0441\u0442\u044F")}${row("phone", "\u{1F4DE} \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0437\u0430\u043A\u043B\u0430\u0434\u0443", esc(c.phone || "\u2014"), "\u041F\u043E\u043A\u0430\u0437\u0443\u0454\u0442\u044C\u0441\u044F \u0433\u043E\u0441\u0442\u044E \u043D\u0430 \u0435\u043A\u0440\u0430\u043D\u0456 \u0441\u0442\u0430\u0442\u0443\u0441\u0443")}</div>
      <div class="card"><h3>\u{1F4B0} \u0423\u043C\u043E\u0432\u0438</h3>${row("min", "\u{1F9FE} \u041C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", money(c.min))}${row("fee", "\u{1F6F5} \u0426\u0456\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", money(c.fee))}${row("free", "\u{1F381} \u0411\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0432\u0456\u0434", c.free ? money(c.free) : "\u2014", "0 \u2014 \u0437\u0430\u0432\u0436\u0434\u0438 \u043F\u043B\u0430\u0442\u043D\u0430")}${row("zone", "\u{1F4CD} \u0417\u043E\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", esc(c.zone || "\u2014"), "\u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u044F: \u0440\u0430\u0439\u043E\u043D\u0438, \u043C\u0435\u0436\u0456")}${row("cpay", "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0443 \u0437\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443", money(c.cpay), "\u0414\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F \u0443 \u0432\u0456\u0434\u043E\u043C\u0456\u0441\u0442\u044C \u0417\u041F; \u043C\u043E\u0436\u043D\u0430 \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u043E\u0436\u043D\u043E\u043C\u0443 \u0432 \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0456")}</div>
      <div class="card"><h3>\u{1F4CD} \u0422\u0440\u0435\u043A\u0456\u043D\u0433 \u043A\u0443\u0440'\u0454\u0440\u0430</h3>${row("track", "\u{1F4CD} \u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044E \u043A\u0443\u0440'\u0454\u0440\u0430 \u043D\u0430 \u043A\u0430\u0440\u0442\u0456", yn(c.track), "\u041A\u0443\u0440'\u0454\u0440 \u0443 \u0431\u043E\u0442\u0456 \u0434\u0456\u043B\u0438\u0442\u044C\u0441\u044F \xAB\u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043C\u043E\u0454 \u043C\u0456\u0441\u0446\u0435\xBB (Live Location); \u0442\u043E\u0447\u043A\u0430 \u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u0440\u0430\u0437 \u043D\u0430 2 \u0445\u0432, \u043B\u0438\u0448\u0435 \u0432 \u0434\u043E\u0440\u043E\u0437\u0456, \u0456 \u0437\u043D\u0438\u043A\u0430\u0454 \u043F\u0456\u0441\u043B\u044F \u0432\u0438\u0434\u0430\u0447\u0456")}</div>
      <div class="card"><h3>\u{1F381} \u0411\u043E\u043D\u0443\u0441\u0438 \u0437\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C</h3>${row("cash", "\u{1F4B8} \u041A\u0435\u0448\u0431\u0435\u043A", c.cash + "%", "\u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u0456 \u0447\u0435\u043A\u0430 (\u0441\u0430\u0439\u0442, \u043A\u0430\u0441\u0430, \u0437\u0430\u043B)")}${row("bmax", "\u{1F39F} \u0411\u043E\u043D\u0443\u0441\u0430\u043C\u0438 \u043C\u043E\u0436\u043D\u0430 \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u0434\u043E", c.bmax + "%", "\u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F")}</div>
      <div class="card"><h3>\u{1F517} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u0435\u0439</h3><div class="muted set-note">\u0406\u043D\u0441\u0442\u0430\u0433\u0440\u0430\u043C, Google Maps, \u043C\u0435\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0438 \u2014 \u0433\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454 \u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0454 \u0437 \u0441\u043E\u0431\u043E\u044E. \u041E\u043A\u0440\u0435\u043C\u0456 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043F\u043E\u043A\u0430\u0437\u0443\u044E\u0442\u044C \u0443 \u0437\u0432\u0456\u0442\u0430\u0445, \u0437\u0432\u0456\u0434\u043A\u0438 \u043F\u0440\u0438\u0439\u0448\u043B\u043E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F.</div>
        <div class="btnrow"><button class="btn sm primary" data-a="goLink">\u{1F4CB} \u041E\u0441\u043D\u043E\u0432\u043D\u0435</button><button class="btn sm" data-a="goLink" data-src="insta">Instagram</button><button class="btn sm" data-a="goLink" data-src="google">Google</button><button class="btn sm" data-a="goLink" data-src="tiktok">TikTok</button></div>
</div>
      <div class="card"><h3>\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438</h3><div class="muted set-note">\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u0432 \u043A\u0430\u0441\u0456 \u043A\u043E\u0434\u043E\u043C <b>${esc(((_b2 = (_a2 = S.data.staff) == null ? void 0 : _a2.reg) == null ? void 0 : _b2.courier) || "1114")}</b> \u2192 \u0443 \u0441\u0432\u043E\u0454\u043C\u0443 \u0435\u043A\u0440\u0430\u043D\u0456 \u043A\u0443\u0440'\u0454\u0440 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u0454 \xAB\u2708\uFE0F \u041F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0438 Telegram\xBB. \u0411\u043E\u0442 \u043A\u0443\u0440'\u0454\u0440\u0456\u0432: ${((_c = S.data.cours) == null ? void 0 : _c.bot) ? `<a href="https://t.me/${esc(S.data.cours.bot)}" target="_blank" rel="noopener">@${esc(S.data.cours.bot)}</a>` : "\u2014"}</div>
        ${(((_d = S.data.cours) == null ? void 0 : _d.list) || []).map((c2) => `<div class="kv"><span>${esc(c2.name)}</span><span class="kv-r">${c2.tg ? "\u2708\uFE0F Telegram \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : '<span class="muted">\u0431\u0435\u0437 Telegram</span>'}</span></div>`).join("") || `<div class="muted">\u041A\u0443\u0440'\u0454\u0440\u0456\u0432 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>`}</div></div>`;
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
  on("goNew", async (el, e, a, t) => {
    goNew();
    return;
  });
  on("goSt", async (el, e, a, t) => {
    if (await act("goSt", { t, st: el.dataset.s }, "\u2714 " + GOST[el.dataset.s])) loadState().catch(() => {
    });
    return;
  });
  on("goDone", async (el, e, a, t) => {
    goDone(t);
    return;
  });
  on("goDoneT", async (el, e, a, t) => {
    goDone(+el.dataset.t);
    return;
  });
  on("crGive", async (el, e, a, t) => {
    {
      const v = await askVal(`\u{1F4B5} \u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E \u0432\u0456\u0434 ${el.dataset.n}?`, el.dataset.v, "number");
      if (!v) return;
      if (await act("courCash", { n: el.dataset.n, sum: +v }, "\u2705 \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E")) loadView();
      return;
    }
  });
  on("crTab", async (el, e, a, t) => {
    S.courTab = el.dataset.t;
    renderMain();
    return;
  });
  on("crAct", async (el, e, a, t) => {
    {
      const x = el.dataset.x;
      if (await act("courAct", { t: +el.dataset.t, act: x, arg: el.dataset.v }, { take: "\u270B \u0412\u0430\u0448\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430", road: "\u{1F6F5} \u0412 \u0434\u043E\u0440\u043E\u0437\u0456", eta: "\u23F1 \u0413\u043E\u0441\u0442\u044E \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E", km: "\u{1F4AC} \u041A\u0443\u0445\u043D\u0456 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E" }[x])) {
        if (x === "take") S.courTab = "mine";
        await loadState().catch(() => {
        });
        await loadCour().catch(() => {
        });
      }
      return;
    }
  });
  on("crDone", async (el, e, a, t) => {
    var _a2;
    {
      const tt = +el.dataset.t, b = S.tables[tt];
      const pay = ((_a2 = b == null ? void 0 : b.go) == null ? void 0 : _a2.paid) ? "card" : await choose(`\u{1F91D} ${tn(tt)} \u0432\u0438\u0434\u0430\u043D\u043E`, `\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438 ${money(b.pay2)}${b.go.change ? ` \xB7 \u0440\u0435\u0448\u0442\u0430 \u0437 ${b.go.change}` : ""}`, [{ label: "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", val: "cash", cls: "green" }, { label: "\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430", val: "card", cls: "blue" }]);
      if (!pay) return;
      if (await act("courAct", { t: tt, act: "done", arg: pay }, "\u2705 \u0412\u0438\u0434\u0430\u043D\u043E")) {
        await loadState().catch(() => {
        });
        await loadCour().catch(() => {
        });
      }
      return;
    }
  });
  on("crProb", async (el, e, a, t) => {
    {
      const v = await choose("\u26A0\uFE0F \u0429\u043E \u0441\u0442\u0430\u043B\u043E\u0441\u044C?", "\u0410\u0434\u043C\u0456\u043D \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F", [{ label: "\u{1F4F5} \u0413\u0456\u0441\u0442\u044C \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454", val: "noans" }, { label: "\u{1F4CD} \u041D\u0435\u0432\u0456\u0440\u043D\u0430 \u0430\u0434\u0440\u0435\u0441\u0430", val: "addr" }, { label: "\u{1F645} \u0413\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u043C\u043E\u0432\u0438\u0432\u0441\u044F", val: "refuse", cls: "red" }, { label: "\u270F\uFE0F \u0406\u043D\u0448\u0435\u2026", val: "own" }]);
      if (!v) return;
      const arg = v === "own" ? await ask("\u26A0\uFE0F \u041E\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443") : v;
      if (arg && await act("courAct", { t: +el.dataset.t, act: "prob", arg }, "\u26A0\uFE0F \u0410\u0434\u043C\u0456\u043D\u0430 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043E")) loadState().catch(() => {
      });
      return;
    }
  });
  on("crTg", async (el, e, a, t) => {
    {
      const r = await act("courTg");
      if (r == null ? void 0 : r.url) {
        window.open(r.url, "_blank");
        toast("\u2708\uFE0F \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xABStart\xBB \u0443 \u0431\u043E\u0442\u0456");
        setTimeout(() => loadCour().catch(() => {
        }), 15e3);
      }
      return;
    }
  });
  on("cliT", async (el, e, a, t) => {
    cliT(t);
    return;
  });
  on("goCfg", async (el, e, a, t) => {
    var _a2;
    {
      const k = el.dataset.k, cur = (_a2 = S.data.gocfg) == null ? void 0 : _a2[k];
      const v = ["on", "del", "pick", "track"].includes(k) ? cur ? 0 : 1 : await ask(el.dataset.l || k, String(cur != null ? cur : ""), ["phone", "zone", "from", "to"].includes(k) ? "text" : "number");
      if (v == null) return;
      const r = await act("goCfgSet", { k, v }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (r) {
        S.data.gocfg = r.cfg;
        renderMain();
      }
      return;
    }
  });
  on("goLink", async (el, e, a, t) => {
    var _a2;
    {
      const u = (((_a2 = window.VARVAR) == null ? void 0 : _a2.venue) ? "https://posatom.online/" + VARVAR.venue + "/" : "https://posatom.online/varvar/") + "?go" + (el.dataset.src ? "&src=" + el.dataset.src : "");
      try {
        await navigator.clipboard.writeText(u);
        toast("\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E: " + u);
      } catch (e2) {
        await ask("\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F", u);
      }
      return;
    }
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
      var _a2, _b2;
      return `<div class="bk-c st-${b.st}">
      <div class="bk-t"><b>${b.time}</b><small>${b.people} \u{1F464}</small></div>
      <div class="bk-m"><div class="bk-n"><b>${esc(b.name)}</b>${b.kind === "banquet" ? '<span class="chip">\u{1F389} \u0431\u0430\u043D\u043A\u0435\u0442</span>' : ""}<span class="chip bk-s">${BKS[b.st]}</span>${b.t ? `<span class="chip">\u{1FA91} ${b.t}</span>` : b.tw ? `<span class="chip" title="\u0413\u0456\u0441\u0442\u044C \u043E\u0431\u0440\u0430\u0432 \u043D\u0430 \u0441\u0445\u0435\u043C\u0456">\u{1F5FA} \u0431\u0430\u0436\u0430\u0454 ${b.tw}</span>` : ""}${b.src === "\u043A\u0430\u0441\u0430" ? '<span class="chip">\u260E\uFE0F \u043A\u0430\u0441\u0430</span>' : ""}</div>
        <a href="tel:+${b.phone}">\u{1F4DE} ${fmtPh(b.phone)}</a>${b.comment ? `<div class="muted">\u{1F4AC} ${esc(b.comment)}</div>` : ""}${b.note ? `<div class="bk-note">\u{1F4CC} ${esc(b.note)}</div>` : ""}${b.dep ? `<div class="bk-note">\u{1F4B0} \u041F\u0435\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0430 ${money(b.dep)} \u2014 \u0443\u0436\u0435 \u0441\u043F\u043B\u0430\u0447\u0435\u043D\u043E, \u0432\u0440\u0430\u0445\u0443\u0439\u0442\u0435 \u043F\u0440\u0438 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043A\u0443</div>` : ""}${((_a2 = b.pre) == null ? void 0 : _a2.length) ? `<div class="bk-pre">\u{1F37D} ${b.pre.map(esc).join(" \xB7 ")}${b.preSent ? ' <span class="muted">\xB7 \u043D\u0430 \u043A\u0443\u0445\u043D\u0456</span>' : ""}</div>` : ""}
        <div class="btnrow">${b.st === "new" ? `<button class="btn sm green" data-a="bkSet" data-id="${b.id}" data-s="ok">\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438</button><button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="no">\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438</button>` : ""}
          ${b.st === "ok" ? `<button class="btn sm green" data-a="bkCame" data-id="${b.id}">\u{1FA91} \u041F\u0440\u0438\u0439\u0448\u043B\u0438</button><button class="btn sm" data-a="bkTbl" data-id="${b.id}">${b.t ? "\u{1F504} \u0421\u0442\u0456\u043B" : "\u{1FA91} \u0421\u0442\u0456\u043B"}</button>${((_b2 = b.pre) == null ? void 0 : _b2.length) && !b.preSent ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="kit">\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u044E</button>` : ""}<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="noshow">\u{1F6AB} \u041D\u0435 \u043F\u0440\u0438\u0439\u0448\u043B\u0438</button>` : ""}
          ${["no", "cancel", "noshow", "came"].includes(b.st) ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="ok">\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</button>` : ""}
          <button class="btn sm" data-a="bkEd" data-id="${b.id}">\u270F\uFE0F</button>${["new", "ok"].includes(b.st) ? `<button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="cancel" title="\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438">\u{1F5D1}</button>` : ""}</div></div></div>`;
    };
    return `<div class="rhead"><div><h1>\u0411\u0440\u043E\u043D\u0456</h1><span class="muted">${day === todayK() ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : DOW[(/* @__PURE__ */ new Date(day + "T12:00:00")).getDay()] + ", " + day.slice(8) + "." + day.slice(5, 7)} \xB7 ${list.filter(act2).length} \u0431\u0440\u043E\u043D\u044C \xB7 ${guests} \u0433\u043E\u0441\u0442\u0435\u0439</span></div><div class="row" style="gap:6px"><button class="btn${(S.wl || []).length ? "" : " ghost"}" data-a="wl" title="\u0427\u0435\u0440\u0433\u0430 \u0433\u043E\u0441\u0442\u0435\u0439 \u0431\u0435\u0437 \u0431\u0440\u043E\u043D\u0456">\u23F3 \u0427\u0435\u0440\u0433\u0430${(S.wl || []).length ? " " + S.wl.length : ""}</button><button class="btn primary" data-a="bkNew">\u2795 \u0411\u0440\u043E\u043D\u044C</button></div></div>
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
  on("wl", async (el, e, a, t) => {
    wlOpen();
    return;
  });
  on("bkDay", async (el, e, a, t) => {
    S.bkDay = el.dataset.d;
    renderMain();
    return;
  });
  on("bkAll", async (el, e, a, t) => {
    S.bkAll = !!el.dataset.v;
    renderMain();
    return;
  });
  on("bkNew", async (el, e, a, t) => {
    bkForm();
    return;
  });
  on("bkEd", async (el, e, a, t) => {
    bkForm(S.data.bk.find((x) => x.id === el.dataset.id));
    return;
  });
  on("bkCame", async (el, e, a, t) => {
    var _a2;
    {
      const b = S.data.bk.find((x) => x.id === el.dataset.id);
      let tt = b.t;
      if (!tt) {
        tt = await pickTable(`\u{1FA91} ${b.name}: \u0437\u0430 \u044F\u043A\u0438\u0439 \u0441\u0442\u0456\u043B?`, "\u0411\u0440\u043E\u043D\u044C \u0437\u0430\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u044F\u043A \xAB\u043F\u0440\u0438\u0439\u0448\u043B\u0438\xBB");
        if (!tt) return;
      }
      if (await act("bkSet", { id: b.id, st: "came", t: tt }, "\u{1FA91} \u0413\u043E\u0441\u0442\u0456 \u043F\u0440\u0438\u0439\u0448\u043B\u0438")) {
        await loadBooks();
        loadState().catch(() => {
        });
        if (((_a2 = b.pre) == null ? void 0 : _a2.length) && !b.preSent && await confirmBox("\u{1F37D} \u041F\u0435\u0440\u0435\u0434\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", "\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \u0437\u0430\u0440\u0430\u0437?")) await act("bkSet", { id: b.id, st: "kit" }, "\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u0456");
        S.view = "hall";
        renderNav();
        renderMain();
        openTable(tt);
      }
      return;
    }
  });
  on("bkSet", async (el, e, a, t) => {
    {
      if (el.dataset.s === "cancel" && !await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0431\u0440\u043E\u043D\u044C?")) return;
      if (await act("bkSet", { id: el.dataset.id, st: el.dataset.s }, BKS[el.dataset.s] || "\u{1F525} \u041D\u0430 \u043A\u0443\u0445\u043D\u044E")) {
        loadState().catch(() => {
        });
        if (S.view === "books") {
          await loadBooks();
          renderMain();
        }
      }
      return;
    }
  });
  on("bkTbl", async (el, e, a, t) => {
    {
      const n = await pickTable("\u{1FA91} \u0421\u0442\u0456\u043B \u0434\u043B\u044F \u0431\u0440\u043E\u043D\u0456", "\u041F\u043B\u0438\u0442\u043A\u0430 \u0441\u0442\u043E\u043B\u0430 \u043F\u043E\u043A\u0430\u0436\u0435 \u0447\u0430\u0441 \u0431\u0440\u043E\u043D\u0456");
      if (n && await act("bkEdit", { id: el.dataset.id, f: { t: n } }, "\u{1FA91} \u0421\u0442\u0456\u043B \u043F\u0440\u0438\u0437\u043D\u0430\u0447\u0435\u043D\u043E")) {
        loadState().catch(() => {
        });
        await loadBooks();
        renderMain();
      }
      return;
    }
  });
  on("certT", async (el, e, a, t) => {
    certT(t);
    return;
  });
  function kOff(id, i) {
    var _a2;
    const e = (_a2 = S.kq) == null ? void 0 : _a2.find((z) => z.id === id);
    if (!e) return;
    if (i === -1) e.start = 1;
    else if (i >= 0) {
      if (e.items[i]) e.items[i].done = !e.items[i].done;
    } else e.items.forEach((x) => {
      if (!x.cancel) x.done = 1;
    });
    if (e.items.every((x) => x.done || x.cancel)) e.done = 1;
    if (S.view === "kq") renderMain();
  }
  async function loadKq() {
    const r = await api("kitchen", S.kst ? { st: S.kst } : {});
    const list = r.list || [];
    S.ksts = r.sts || [];
    if (S.kst && !S.ksts.some((z) => z.id === S.kst)) S.kst = "";
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
    var _a2, _b2, _c, _d;
    (_a2 = $("#kGate")) == null ? void 0 : _a2.remove();
    tone([660], 0.05, 0.01);
    try {
      await ((_c = (_b2 = document.documentElement).requestFullscreen) == null ? void 0 : _c.call(_b2));
    } catch (e) {
    }
    try {
      wakeLock = await ((_d = navigator.wakeLock) == null ? void 0 : _d.request("screen"));
    } catch (e) {
    }
  }
  function kitchenGate() {
    if (!matchMedia("(min-width: 768px)").matches) {
      document.addEventListener("pointerdown", async () => {
        var _a2;
        tone([660], 0.05, 0.01);
        try {
          wakeLock = await ((_a2 = navigator.wakeLock) == null ? void 0 : _a2.request("screen"));
        } catch (e) {
        }
      }, { once: true });
      return;
    }
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
      return `<div class="kc${e.urgent ? " urg" : ""}${e.start ? " cook" : " new"}"><div class="kh"><b>\u0421\u0442\u0456\u043B ${tn(e.t)}${e.paid ? " \xB7 \u{1F4B0} \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" : ""}</b><span class="tm ${tc}">\u23F1 ${m} \u0445\u0432</span></div>
        <div class="km">${e.at} \xB7 ${esc(e.by)}${e.src === "\u0433\u0456\u0441\u0442\u044C" ? " \xB7 \u{1F4F1} \u0441\u0430\u0439\u0442" : ""}</div>
        ${e.urgent ? '<div class="ktag urg">\u26A1 \u0422\u0415\u0420\u041C\u0406\u041D\u041E\u0412\u041E</div>' : ""}${e.tw ? '<div class="ktag">\u{1F961} \u0417 \u0421\u041E\u0411\u041E\u042E</div>' : ""}${e.comment ? `<div class="kcom">\u{1F4AC} ${esc(e.comment)}</div>` : ""}
        <div class="ki">${e.items.map((x, i) => `<div class="kit-w"><button class="kit${x.done ? " done" : ""}${x.cancel ? " canc" : ""}" data-a="kItem" data-id="${e.id}" data-i="${i}" ${x.cancel ? "disabled" : ""}><b>${x.q}\xD7</b> ${x.sl && !S.kst ? esc(x.sl) + " " : ""}${esc(x.n)}${x.cancel ? " <em>\u0421\u041A\u0410\u0421\u041E\u0412\u0410\u041D\u041E</em>" : x.canc ? ` <em>\u2212${x.canc} \u0441\u043A\u0430\u0441.</em>` : ""}</button><button class="kinfo" data-a="skTechOne" data-n="${esc(x.n)}" title="\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0430">\u24D8</button></div>`).join("")}</div>
        ${(e.msgs || []).map((x) => `<div class="kmsg">\u{1F4E8} ${x.at} ${esc(x.text)}</div>`).join("")}
        <div class="kb">${e.start ? "" : `<button class="btn" data-a="kStart" data-id="${e.id}">\u{1F525} \u0413\u043E\u0442\u0443\u044E</button>`}<button class="btn" data-a="kMsg" data-id="${e.id}">\u{1F4AC}</button><button class="btn green" data-a="kAll" data-id="${e.id}">\u2705 \u0412\u0421\u0415 \u0413\u041E\u0422\u041E\u0412\u041E</button></div></div>`;
    };
    const stb = ((_a2 = S.ksts) == null ? void 0 : _a2.length) ? `<div class="seg" style="margin:0 0 10px"><button class="${S.kst ? "" : "on"}" data-a="kSt" data-v="">\u0423\u0441\u0456</button>${S.ksts.map((z) => `<button class="${S.kst === z.id ? "on" : ""}" data-a="kSt" data-v="${z.id}">${esc((z.emoji ? z.emoji + " " : "") + z.name)}</button>`).join("")}</div>` : "";
    return `<div class="khead"><h1>\u{1F468}\u200D\u{1F373} \u0427\u0435\u0440\u0433\u0430 <span class="muted">${act0.length}</span></h1><button class="btn" data-a="kSnd">\u{1F514} \u0417\u0432\u0443\u043A</button><button class="btn" data-a="skKStock">\u{1F4E6} \u0421\u043A\u043B\u0430\u0434</button><button class="btn" data-a="view" data-v="stop">\u26D4 \u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442</button></div>
      ${stb}<div class="kq f${S.kFont}">${act0.length ? act0.map(card).join("") : '<div class="kempty">\u2705 \u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>'}</div>
      ${done.length ? `<h3 class="muted" style="margin:18px 0 8px">\u041E\u0441\u0442\u0430\u043D\u043D\u0456 \u0433\u043E\u0442\u043E\u0432\u0456</h3><div class="kdone">${done.map((e) => `<div class="kd">\u0421\u0442\u0456\u043B ${tn(e.t)} \xB7 ${e.items.filter((x) => !x.cancel).map((x) => `${x.q}\xD7 ${esc(x.n)}`).join(", ")}${e.cancelled ? " \xB7 \u274C \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E" : ` \xB7 ${Math.round((e.doneAt - e.ts) / 6e4)} \u0445\u0432`} <button class="btn sm" data-a="kUndo" data-id="${e.id}">\u21A9\uFE0F</button></div>`).join("")}</div>` : ""}${isAdmin() ? goCtlHTML() : ""}`;
  }
  on("kSt", async (el, e, a, t) => {
    S.kst = el.dataset.v || "";
    store.set("kst", S.kst);
    loadKq();
    return;
  });
  on("kItem", async (el, e, a, t) => {
    {
      const r = await act("kDone", { id: el.dataset.id, i: +el.dataset.i, st: S.kst || void 0 });
      if (r == null ? void 0 : r.queued) kOff(el.dataset.id, +el.dataset.i);
      else if (r) loadKq();
      return;
    }
  });
  on("kAll", async (el, e, a, t) => {
    var _a2;
    {
      (_a2 = el.closest(".kc")) == null ? void 0 : _a2.classList.add("bye");
      const r = await act("kDone", { id: el.dataset.id, st: S.kst || void 0 });
      if (r == null ? void 0 : r.queued) kOff(el.dataset.id);
      else if (r) setTimeout(loadKq, 250);
      return;
    }
  });
  on("kStart", async (el, e, a, t) => {
    {
      const r = await act("kStart", { id: el.dataset.id });
      if (r == null ? void 0 : r.queued) kOff(el.dataset.id, -1);
      else loadKq();
      return;
    }
  });
  on("kUndo", async (el, e, a, t) => {
    {
      await act("kUndo", { id: el.dataset.id }, "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E \u0432 \u0447\u0435\u0440\u0433\u0443");
      loadKq();
      return;
    }
  });
  on("kMsg", async (el, e, a, t) => {
    {
      let v = await choose("\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0437\u0430\u043B", "\u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438 \u043F\u043E\u0431\u0430\u0447\u0430\u0442\u044C \u0443 \u0441\u0442\u0440\u0456\u0447\u0446\u0456", ["\u2757 \u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443", "\u23F1 \u0429\u0435 +10 \u0445\u0432", "\u{1F64B} \u041F\u0456\u0434\u0456\u0439\u0434\u0438 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E", "\u{1F525} \u0412\u0436\u0435 \u043C\u0430\u0439\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u043E"].map((x) => ({ label: x, val: x })).concat([{ label: "\u270F\uFE0F \u0421\u0432\u043E\u0454\u2026", val: "own" }]));
      if (v === "own") v = await ask("\u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0437\u0430\u043B", "\u041D\u0430\u043F\u0440.: \u0437\u0430\u043C\u0456\u043D\u0438\u043C\u043E \u0444\u0440\u0456 \u043D\u0430 \u043F\u044E\u0440\u0435?");
      if (v) await act("kMsg", { id: el.dataset.id, text: v }, "\u{1F4E8} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E");
      loadKq();
      return;
    }
  });
  on("kGo", async (el, e, a, t) => {
    kitchenStart();
    return;
  });
  on("kSnd", async (el, e, a, t) => {
    kSndPick();
    return;
  });
  on("kSndTry", async (el, e, a, t) => {
    kPlay(el.dataset.k);
    return;
  });
  function cashHTML() {
    const ctab = S.cashTab || "day", cseg = `<div class="seg rsec cseg">${[["day", "\u{1F4B0} \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456"], ["checks", "\u{1F9FE} \u0427\u0435\u043A\u0438"], ...modOn("bank") && can("cash") ? [["bank", "\u{1F3E6} \u0411\u0430\u043D\u043A"]] : []].map(([k, l]) => `<button class="${ctab === k ? "on" : ""}" data-a="cashTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    const head = `<div class="rhead"><div><h1>\u041A\u0430\u0441\u0430</h1><span class="muted">${{ day: "\u0432\u0438\u0440\u0443\u0447\u043A\u0430 \u0439 \u0433\u0440\u043E\u0448\u0456 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", checks: "\u0443\u0441\u0456 \u0447\u0435\u043A\u0438 \u0437\u0430 \u0434\u0435\u043D\u044C", bank: "\u0432\u0438\u043F\u0438\u0441\u043A\u0438 \u0439 \u0437\u0432\u0456\u0440\u043A\u0430" }[ctab] || ""}</span></div></div>` + cseg;
    if (ctab === "checks") return head + closedHTML();
    if (ctab === "bank") return head + bankHTML();
    return head + courCard() + cashHTML0();
  }
  function cashHTML0() {
    var _a2;
    const r = S.data.shift;
    if (!r) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const z = r.z, pc = z.total ? Math.round(z.cash / z.total * 100) : 0;
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });
    const B = r.bal, sg = (n) => (n > 0 ? "+" : n < 0 ? "\u2212" : "") + money(Math.abs(n));
    const balH = B ? `<div class="bal">
      <button class="bal-c" data-a="balInfo" data-s="cash"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u0432 \u043A\u0430\u0441\u0456</span><b class="money">${money(B.cash)}</b><small>${B.courOwed ? "\u{1F6F5} \u0443 \u043A\u0443\u0440'\u0454\u0440\u0456\u0432 " + money(B.courOwed) : "\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438"}</small></button>
      <button class="bal-c" data-a="balInfo" data-s="card"><span>\u{1F4B3} \u041D\u0430 \u043A\u0430\u0440\u0442\u0446\u0456</span><b class="money">${money(B.card)}</b><small>\u270F\uFE0F \u0437\u0432\u0456\u0440\u0438\u0442\u0438</small></button>
      <div class="bal-c tot"><span>\u{1F4B0} \u0420\u0430\u0437\u043E\u043C</span><b class="money">${money(B.total)}</b><small>${B.tipOwed ? `\u0437 \u043D\u0438\u0445 \u0447\u0430\u0439\u043E\u0432\u0456 ${money(B.tipOwed)} \xB7 \u0432\u0456\u043B\u044C\u043D\u0438\u0445 <b>${money(B.free)}</b>` : `\u0437 ${B.from ? B.from.split("-").reverse().join(".") : "\u2014"}`}</small></div></div>` : "";
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456</div><div class="hero-n money">${money(z.total)}</div>${z.tip ? `<div class="muted" style="font-size:13px">\u0431\u0435\u0437 \u0447\u0430\u0439\u043E\u0432\u0438\u0445 \xB7 + \u{1F49D} ${money(z.tip)} \u0447\u0430\u0439\u043E\u0432\u0456 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443</div>` : ""}
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(z.cash)}</b></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430 <b class="money">${money(z.card)}</b>${z.onl ? `<small class="muted"> \u0437 \u043D\u0438\u0445 \u{1F310} \u043E\u043D\u043B\u0430\u0439\u043D ${money(z.onl)}</small>` : ""}${Object.entries(z.ag || {}).map(([a, v]) => {
      var _a3;
      return `<small class="muted"> \xB7 \u{1F6F5} ${esc(((_a3 = (S.aggs || []).find((g) => g.id === a)) == null ? void 0 : _a3.n) || a)} ${money(v)}</small>`;
    }).join("")}${((_a2 = S.cfg) == null ? void 0 : _a2.bankFee) && z.card ? `<small class="muted"> \xB7 \u{1F3E6} \u2212${money(Math.round(z.card * S.cfg.bankFee / 100))} \u043A\u043E\u043C\u0456\u0441\u0456\u044F</small>` : ""}</span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">\u{1F9FE} Z-\u0437\u0432\u0456\u0442<small>\u043F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \xB7 \u0434\u0440\u0443\u043A \xB7 \u0437\u0430\u043A\u0440\u0438\u0442\u0438 \u0434\u0435\u043D\u044C</small></button></div>`;
    const recH = (() => {
      var _a3;
      const R = r.rec, best = Math.max((R == null ? void 0 : R.sum) || 0, 0), now = z.total, pct = best ? Math.min(100, Math.round(now / best * 100)) : 0;
      return `<div class="widget hero-rec${best && now > best ? " beat" : ""}"><span>\u{1F3C6} \u0420\u0435\u043A\u043E\u0440\u0434 \u0437\u0430 \u0434\u0435\u043D\u044C</span><b class="money">${best ? money(best) : "\u2014"}</b><small>${best ? now > best ? "\u{1F525} \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0432\u0436\u0435 \u0431\u0456\u043B\u044C\u0448\u0435 \u2014 \u0440\u0435\u043A\u043E\u0440\u0434!" : `${R.d.split("-").reverse().join(".")} \xB7 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 ${pct}%` : ""}${((_a3 = S.cfg) == null ? void 0 : _a3.recBonus) ? ` \xB7 \u043F\u0440\u0435\u043C\u0456\u044F ${money(S.cfg.recBonus)}` : ""}</small>${best ? `<div class="bar2"><i style="width:${pct}%"></i></div>` : ""}</div>`;
    })();
    const tiles = [["\u{1F9FE} \u0427\u0435\u043A\u0456\u0432", z.checks], ["\xD8 \u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", z.checks ? money(z.total / z.checks) : "\u2014"], ["\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(z.disc)], ["\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456", money(z.tip || 0)], ["\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438", money(z.exCash + z.exCard)], ["\u{1F4C8} \u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(z.net), "green"], ["\u23F3 \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0432 \u0437\u0430\u043B\u0456", z.openTables ? `${money(z.openSum)} \xB7 ${z.openTables} \u0441\u0442.` : "\u2014"]];
    const tilesH = `<div class="widgets w4">${tiles.map(([l, v, c]) => `<div class="widget ${c || ""}"><span>${l}</span><b class="money">${v}</b></div>`).join("")}${recH}</div>`;
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
      var _a3;
      const k = +x.card || 0, c = (_a3 = x.cash) != null ? _a3 : x.sum - k, v = part === "card" ? k : c;
      return v > 0 ? { at: x.at, ic: part === "card" ? "\u{1F4B3}" : "\u{1F4B5}", t: `\u0421\u0442\u0456\u043B ${tn(x.t)}${x.by ? " \xB7 " + esc(x.by) : ""}${x.disc ? ` \xB7 \u2212${x.disc}%` : ""}${x.tip ? ` \xB7 \u{1F49D} ${money(x.tip)}` : ""}${k && c ? " \xB7 \u0437\u043C\u0456\u0448\u0430\u043D\u0430" : ""}`, v: "+" + money(v), cls: "in" } : null;
    };
    const jlist = (part) => [
      ...(r.closed || []).filter((x) => !x.del && !x.rm).map((x) => chk(x, part)).filter(Boolean),
      ...r.exp.map((e, i) => ({ e, i })).filter(({ e }) => e.src === "card" === (part === "card")).map(({ e, i }) => ({ at: e.at, ic: "\u{1F4B8}", t: esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430"), v: "\u2212" + money(e.sum), cls: "out", del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` })),
      ...(r.mov || []).map((m, i) => ({ m, i })).filter(({ m }) => (part === "card" ? MK : MC)[m.type]).map(({ m, i }) => ({ at: m.at, ic: "\u{1F501}", t: MOVE[m.type] + (m.note ? " \xB7 " + esc(m.note) : ""), v: money(m.sum), cls: "mv", del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">\u2715</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438">\u21A9\uFE0F</button>` }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const jcard = (title, J) => `<div class="card"><h3>${title} <span class="muted" style="font-weight:400;font-size:13px">\xB7 ${J.length}</span></h3>${J.length ? J.map((x) => `<div class="jr ${x.cls}${x.del ? " del" : ""}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : "<i></i>"}</div>`).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E</div>'}</div>`;
    const journal = jcard("\u{1F4B5} \u0416\u0443\u0440\u043D\u0430\u043B \u0433\u043E\u0442\u0456\u0432\u043A\u0438 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", jlist("cash")) + jcard("\u{1F4B3} \u0416\u0443\u0440\u043D\u0430\u043B \u043A\u0430\u0440\u0442\u043A\u0438 \u0437\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", jlist("card"));
    return `${balH}${hero}${tilesH}<div class="cash-grid"><div class="col">${journal}</div><div class="col">${tipsH}${ops}${mvH}${all}</div></div>`;
  }
  const MOVE = { in: "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F", out: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F", k2c: "\u{1F501} \u041A\u0430\u0440\u0442\u043A\u0430 \u2192 \u0433\u043E\u0442\u0456\u0432\u043A\u0430", c2k: "\u{1F501} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u043A\u0430\u0440\u0442\u043A\u0430", tipc: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", tipk: "\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 (\u043A\u0430\u0440\u0442\u043A\u0430)", kin: "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F \u043D\u0430 \u043A\u0430\u0440\u0442\u043A\u0443", kout: "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F \u0437 \u043A\u0430\u0440\u0442\u043A\u0438", adjc: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u0433\u043E\u0442\u0456\u0432\u043A\u0438", adjk: "\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0430 \u043A\u0430\u0440\u0442\u043A\u0438", salc: "\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430 (\u0433\u043E\u0442\u0456\u0432\u043A\u0430)", salk: "\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430 (\u043A\u0430\u0440\u0442\u043A\u0430)" };
  async function balInfo(src) {
    var _a2;
    const B = (_a2 = S.data.shift) == null ? void 0 : _a2.bal;
    if (!B) return;
    const c = src === "card";
    const row = (l, v2) => v2 ? `<div class="kv"><span>${l}</span><b class="money">${(v2 > 0 ? "+" : "\u2212") + money(Math.abs(v2))}</b></div>` : "";
    const body = (c ? [row("\u{1F4B3} \u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u043A\u0430\u0440\u0442\u043A\u043E\u044E", B.saleCard), row("\u{1F501} \u0420\u0443\u0445 (\u043E\u0431\u043C\u0456\u043D, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F)", B.mvCard), row("\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438", -B.exCard), row("\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0438\u0434\u0430\u043D\u043E", -B.tipCard), row("\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0438", B.adjCard)] : [row("\u{1F4B5} \u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E", B.saleCash), row("\u{1F501} \u0420\u0443\u0445 (\u0432\u043D\u0435\u0441\u0435\u043D\u043D\u044F, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F, \u043E\u0431\u043C\u0456\u043D)", B.mvCash), row("\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u0437 \u043A\u0430\u0441\u0438", -B.exCash), row("\u{1F49D} \u0427\u0430\u0439\u043E\u0432\u0456 \u0432\u0438\u0434\u0430\u043D\u043E", -B.tipCash), row("\u270F\uFE0F \u0417\u0432\u0456\u0440\u043A\u0438", B.adjCash)]).join("") + (!c && B.courOwed ? `<div class="kv"><span>\u{1F6F5} \u0423 \u043A\u0443\u0440'\u0454\u0440\u0456\u0432 (\u0449\u0435 \u043D\u0435 \u0437\u0434\u0430\u043B\u0438)</span><b class="money">${money(B.courOwed)}</b></div>` : "") + `<div class="kv" style="font-size:18px"><span><b>\u041C\u0430\u0454 \u0431\u0443\u0442\u0438</b></span><b class="money">${money(c ? B.card : B.cash)}</b></div>`;
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
    const body = `<div class="card" style="margin:0 0 10px">${kv("\u{1F9FE} \u0427\u0435\u043A\u0456\u0432", z.checks)}${kv("\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", money(z.cash))}${kv("\u{1F4B3} \u041A\u0430\u0440\u0442\u043A\u0430", money(z.card))}${z.onl ? kv("&nbsp;&nbsp;\u{1F4B3} \u0442\u0435\u0440\u043C\u0456\u043D\u0430\u043B", money(z.card - z.onl)) + kv("&nbsp;&nbsp;\u{1F310} \u043E\u043D\u043B\u0430\u0439\u043D (LiqPay)", money(z.onl)) : ""}${z.disc ? kv("\u{1F3F7} \u0417\u043D\u0438\u0436\u043A\u0438", money(z.disc)) : ""}
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
    var _a2, _b2, _c;
    const [cl, st] = await Promise.all([api("closed", { day }).catch(() => null), api("staff").catch(() => null)]);
    if (!S.menu) await loadMenu().catch(() => {
    });
    const l = (cl == null ? void 0 : cl.list) || [], x = l.find((e) => e.id === ref) || (/^\d+$/.test(ref) ? l[+ref] : null);
    if (!x) return toast("\u0427\u0435\u043A \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E");
    if (x.del || x.rm) return toast("\u0427\u0435\u043A \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u2014 \u0441\u043F\u0435\u0440\u0448\u0443 \u043F\u043E\u0432\u0435\u0440\u043D\u0456\u0442\u044C");
    const E = { items: (x.dishes || []).map((d) => [...d]), disc: x.disc || 0, tip: x.tip || 0, pay: x.card && ((_a2 = x.cash) != null ? _a2 : 0) ? "mix" : x.card ? "card" : "cash", cash: (_b2 = x.cash) != null ? _b2 : x.sum, w: x.w || x.by || "", t: x.t };
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
  on("zDay", async (el, e, a, t) => {
    zDay();
    return;
  });
  on("shOpen", async (el, e, a, t) => {
    shOpen();
    return;
  });
  const BK_WHY = [["own", "\u{1F501} \u0412\u043B\u0430\u0441\u043D\u0438\u0439 \u043F\u0435\u0440\u0435\u043A\u0430\u0437"], ["tax", "\u{1F3DB} \u041F\u043E\u0434\u0430\u0442\u043A\u0438 / \u0404\u0421\u0412"], ["sal", "\u{1F477} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430"], ["loan", "\u{1F3E6} \u041A\u0440\u0435\u0434\u0438\u0442 / \u0434\u0435\u043F\u043E\u0437\u0438\u0442"], ["other", "\u{1F648} \u0406\u043D\u0448\u0435"]];
  const bkD = (d) => d.slice(8) + "." + d.slice(5, 7);
  function bankHTML() {
    var _a2;
    const r = S.data.bank;
    if (!r) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const mn = (/* @__PURE__ */ new Date(r.m + "-15T12:00:00")).toLocaleDateString("uk-UA", { month: "long", year: "numeric" }), t = r.t, q = r.list.filter((x) => x.st === "q");
    const sg = (x) => `<b class="money" style="color:${x.sum > 0 ? "var(--green)" : "inherit"}">${x.sum > 0 ? "+" : "\u2212"}${money(Math.abs(x.sum))}</b>`;
    const line = (x, btns) => `<div class="kv" style="align-items:flex-start;gap:10px"><span style="min-width:0;overflow-wrap:anywhere">${{ ok: "\u2705", q: "\u26A0\uFE0F", x: "\u{1F648}" }[x.st]} ${bkD(x.d)} \xB7 ${esc(x.who || "\u2014")}${x.pur ? `<br><small class="muted">${esc(x.pur.slice(0, 160))}</small>` : ""}${x.mt ? `<br><small>${esc(x.mt)}</small>` : ""}${btns ? `<div class="btns" style="margin-top:6px;flex-wrap:wrap">${btns}</div>` : ""}</span>${sg(x)}</div>`;
    const b = (k, id, l) => `<button class="btn sm" data-a="bkAct" data-k="${k}" data-id="${id}">${l}</button>`;
    const qb = (x) => x.sum < 0 ? b("inv", x.id, "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456") + b("exp", x.id, "\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430") + b("mov", x.id, "\u2796 \u0412\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F") + b("auto", x.id, "\u{1F50E} \u041F\u0430\u0440\u0430") + b("skip", x.id, "\u{1F648} \u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438") : b("acq", x.id, "\u{1F4B3} \u0415\u043A\u0432\u0430\u0439\u0440\u0438\u043D\u0433") + (modOn("agg") ? b("agg", x.id, "\u{1F6F5} \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440") : "") + (modOn("tax") ? b("inc", x.id, "\u{1F4D2} \u0426\u0435 \u0434\u043E\u0445\u0456\u0434") : "") + b("mov", x.id, "\u2795 \u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F") + b("auto", x.id, "\u{1F50E} \u041F\u0430\u0440\u0430") + b("skip", x.id, "\u{1F648} \u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438");
    const head = `<div class="card"><h3>\u{1F3E6} \u0411\u0430\u043D\u043A \xB7 ${esc(mn)}</h3><div class="btns" style="flex-wrap:wrap;align-items:center"><button class="btn sm" data-a="bkM" data-t="-1">\u2039</button><button class="btn sm" data-a="bkM" data-t="1">\u203A</button>
      <label class="btn sm primary" style="cursor:pointer">\u{1F4CE} \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0432\u0438\u043F\u0438\u0441\u043A\u0443<input id="bankFile" type="file" accept=".txt,.csv,.tsv" hidden></label></div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u0424\u0430\u0439\u043B \u0437 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u0431\u0430\u043D\u043A\u0443: \xAB\u0415\u043A\u0441\u043F\u043E\u0440\u0442 \u0443 1\u0421\xBB (.txt) \u0430\u0431\u043E CSV. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u0435 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043D\u0435 \u0434\u0443\u0431\u043B\u044E\u0454. \u0415\u043A\u0432\u0430\u0439\u0440\u0438\u043D\u0433, \u043E\u043F\u043B\u0430\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 \u0456 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0456 \u0432\u0438\u0442\u0440\u0430\u0442\u0438 \u0437\u0456\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456${r.last ? ` \xB7 \u043E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0456\u043C\u043F\u043E\u0440\u0442 ${new Date(r.last.ts).toLocaleDateString("uk-UA")} (${r.last.n})` : ""}.</div></div>`;
    const tiles = `<div class="widgets">${[["\u2795 \u041D\u0430\u0434\u0456\u0439\u0448\u043B\u043E", money(t.in)], ["\u2796 \u0421\u043F\u0438\u0441\u0430\u043D\u043E", money(-t.out)], ["\u{1F4B3} \u041A\u043E\u043C\u0456\u0441\u0456\u044F \u0431\u0430\u043D\u043A\u0443", money(t.fee)], ["\u2705 \u0417\u0456\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E", t.ok], ["\u26A0\uFE0F \u041D\u0430 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F", t.q], ["\u{1F648} \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E", t.x]].map(([l, v]) => `<div class="widget"><span>${l}</span><b class="money">${v}</b></div>`).join("")}</div>`;
    const miss = r.miss.length ? `<div class="card"><h3>\u{1F4B3} \u041D\u0435 \u043D\u0430\u0434\u0456\u0439\u0448\u043B\u0430 \u0431\u0435\u0437\u0433\u043E\u0442\u0456\u0432\u043A\u0430</h3><div class="muted" style="font-size:12px;margin-bottom:6px">\u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u043A\u0430\u0440\u0442\u043A\u043E\u044E \u0454, \u0430 \u0432\u0456\u0434\u0448\u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u0431\u0430\u043D\u043A\u0443 \u0443 \u0432\u0438\u043F\u0438\u0441\u0446\u0456 \u043D\u0435\u043C\u0430\u0454 (\u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0442\u0435\u0440\u043C\u0456\u043D\u0430\u043B \u0430\u0431\u043E \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0442\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0443 \u0432\u0438\u043F\u0438\u0441\u043A\u0443)</div>${r.miss.map((x) => `<div class="kv"><span>${bkD(x.d)}</span><b class="money">${money(x.card)}</b></div>`).join("")}</div>` : "";
    const missAg = ((_a2 = r.missAg) == null ? void 0 : _a2.length) ? `<div class="card"><h3>\u{1F6F5} \u041D\u0435 \u043D\u0430\u0434\u0456\u0439\u0448\u043B\u0430 \u0432\u0438\u043F\u043B\u0430\u0442\u0430 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430</h3><div class="muted" style="font-size:12px;margin-bottom:6px">\u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u0447\u0435\u0440\u0435\u0437 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440 \u0441\u0442\u0430\u0440\u0448\u0456 \u0437\u0430 2 \u0442\u0438\u0436\u043D\u0456, \u0430 \u0432\u0438\u043F\u043B\u0430\u0442\u0438 \u0443 \u0432\u0438\u043F\u0438\u0441\u0446\u0456 \u043D\u0435\u043C\u0430\u0454</div>${r.missAg.map((x) => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${esc(x.n)} \xB7 ${bkD(x.from)}${x.to !== x.from ? "\u2013" + bkD(x.to) : ""}</span><b class="money">${money(x.sum)}</b></div>`).join("")}</div>` : "";
    const qH = q.length ? `<div class="card"><h3>\u26A0\uFE0F \u041D\u0430 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F \xB7 ${q.length}</h3>${q.map((x) => line(x, qb(x))).join("")}</div>` : "";
    const all = r.list.filter((x) => x.st !== "q");
    const allH = `<div class="card"><h3>\u{1F4CB} \u041E\u043F\u0440\u0430\u0446\u044C\u043E\u0432\u0430\u043D\u0456 \xB7 ${all.length}</h3>${all.length ? all.map((x) => line(x, b("un", x.id, "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"))).join("") : `<div class="muted">${r.list.length ? "\u0423\u0441\u0435 \u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F \u0432\u0438\u0449\u0435" : "\u0412\u0438\u043F\u0438\u0441\u043E\u043A \u0437\u0430 \u0446\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C \u0449\u0435 \u043D\u0435\u043C\u0430\u0454"}</div>`}</div>`;
    return head + tiles + miss + missAg + qH + allH;
  }
  async function bankFile(f) {
    var _a2, _b2;
    if (/\.xlsx?$/i.test(f.name)) return toast("\u26A0\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0456\u0442\u044C \u0432\u0438\u043F\u0438\u0441\u043A\u0443 \u044F\u043A CSV \u0430\u0431\u043E \u043E\u0431\u0435\u0440\u0456\u0442\u044C \xAB\u0415\u043A\u0441\u043F\u043E\u0440\u0442 \u0443 1\u0421\xBB (.txt)");
    const buf = new Uint8Array(await f.arrayBuffer());
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (e) {
      text = new TextDecoder("windows-1251").decode(buf);
    }
    const r = await act("bankImp", { text, dry: 1, name: f.name });
    if (!r) return;
    const dd = (d) => d.split("-").reverse().join(".");
    if (!r.add) return toast(`\u2139\uFE0F \u041D\u043E\u0432\u0438\u0445 \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u0439 \u043D\u0435\u043C\u0430\u0454 (\u0443\u0436\u0435 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043E: ${r.dup})`);
    const ok2 = await modal({
      title: "\u{1F3E6} \u0412\u0438\u043F\u0438\u0441\u043A\u0430",
      body: `<div class="kv"><span>\u041F\u0435\u0440\u0456\u043E\u0434</span><b>${dd(r.from)} \u2013 ${dd(r.to)}</b></div><div class="kv"><span>\u0424\u043E\u0440\u043C\u0430\u0442</span><b>${r.fmt === "1c" ? "1\u0421" : "CSV"}</b></div>
      <div class="kv"><span>\u041D\u043E\u0432\u0438\u0445 \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u0439</span><b>${r.add}</b></div>${r.dup ? `<div class="kv"><span>\u0423\u0436\u0435 \u0431\u0443\u043B\u0438</span><b>${r.dup}</b></div>` : ""}<div class="kv"><span>\u2795 \u041D\u0430\u0434\u0456\u0439\u0448\u043B\u043E</span><b class="money">${money(r.in)}</b></div><div class="kv"><span>\u2796 \u0421\u043F\u0438\u0441\u0430\u043D\u043E</span><b class="money">${money(-r.out)}</b></div>
      ${r.bad ? `<p class="muted" style="font-size:12px;overflow-wrap:anywhere">\u26A0\uFE0F \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0440\u044F\u0434\u043A\u0456\u0432 \u0431\u0435\u0437 \u0434\u0430\u0442\u0438 \u0447\u0438 \u0441\u0443\u043C\u0438: ${r.bad}${((_a2 = r.errs) == null ? void 0 : _a2.length) ? " (" + esc(r.errs.slice(0, 3).join("; ")) + ")" : ""}</p>` : ""}`,
      buttons: [{ label: "\u2705 \u0406\u043C\u043F\u043E\u0440\u0442\u0443\u0432\u0430\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }]
    });
    if (!ok2) return;
    const x = await act("bankImp", { text, name: f.name });
    if (x) toast(`\u2705 ${x.add} \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u0439 \xB7 \u0437\u0456\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E ${x.ok} \xB7 \u043D\u0430 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F ${x.q}`);
    S.bankM = ((_b2 = x == null ? void 0 : x.to) == null ? void 0 : _b2.slice(0, 7)) || S.bankM;
    loadView();
  }
  document.addEventListener("change", (e) => {
    var _a2;
    const el = e.target;
    if (el.id !== "bankFile" || !((_a2 = el.files) == null ? void 0 : _a2[0])) return;
    const f = el.files[0];
    el.value = "";
    bankFile(f);
  });
  async function bkAct(k, id) {
    let p = {};
    if (k === "inc") {
      const c = await choose("\u{1F4D2} \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0432 \u043A\u043D\u0438\u0433\u0443 \u0434\u043E\u0445\u043E\u0434\u0456\u0432", "\u0414\u0430\u0442\u043E\u044E \u0432\u0438\u043F\u0438\u0441\u043A\u0438. \u041F\u043E\u0437\u0438\u043A\u0430, \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0447\u0438 \u0432\u043B\u0430\u0441\u043D\u0456 \u0433\u0440\u043E\u0448\u0456 \u2014 \u0446\u0435 \u043D\u0435 \u0434\u043E\u0445\u0456\u0434: \u0434\u043B\u044F \u043D\u0438\u0445 \xAB\u{1F648} \u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438\xBB", [["b2b", "\u{1F3E2} \u0411\u0430\u043D\u043A\u0435\u0442 / \u043A\u0435\u0439\u0442\u0435\u0440\u0438\u043D\u0433 \u043A\u043E\u043C\u043F\u0430\u043D\u0456\u0457"], ["rent", "\u{1F3E0} \u041E\u0440\u0435\u043D\u0434\u0430 / \u0441\u0443\u0431\u043E\u0440\u0435\u043D\u0434\u0430"], ["svc", "\u{1F91D} \u041F\u043E\u0441\u043B\u0443\u0433\u0438"], ["other", "\u{1F4BC} \u0406\u043D\u0448\u0438\u0439 \u0434\u043E\u0445\u0456\u0434"]].map(([val, label]) => ({ label, val })));
      if (!c) return;
      p.cat = c;
    }
    if (k === "skip") {
      const why = await choose("\u{1F648} \u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438", "\u0429\u043E \u0446\u0435 \u0437\u0430 \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u044F? \u0423 \u043A\u0430\u0441\u0456 \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043C\u0456\u043D\u0438\u0442\u044C\u0441\u044F", BK_WHY.map(([v, label]) => ({ label, val: v })));
      if (!why) return;
      p.why = why;
    }
    if (k === "un" && !await confirmBox("\u21A9\uFE0F \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0437\u0432\u0456\u0440\u043A\u0443?", "\u0412\u0438\u0442\u0440\u0430\u0442\u0443 \u0447\u0438 \u0440\u0443\u0445, \u044F\u043A\u0456 \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0430 \u0437\u0432\u0456\u0440\u043A\u0430, \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E, \u0430 \u0440\u044F\u0434\u043E\u043A \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F")) return;
    if (k === "exp" && !await confirmBox("\u{1F4B8} \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0432\u0438\u0442\u0440\u0430\u0442\u0443 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438?", "\u0421\u0443\u043C\u0430 \u043F\u0456\u0434\u0435 \u0443 \u0432\u0438\u0442\u0440\u0430\u0442\u0438 \u0434\u043D\u044F \u0432\u0438\u043F\u0438\u0441\u043A\u0438")) return;
    if (k === "mov" && !await confirmBox("\u{1F501} \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0440\u0443\u0445 \u043A\u0430\u0440\u0442\u043A\u0438?", "\u0412\u043D\u0435\u0441\u0435\u043D\u043D\u044F / \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F \u0437 \u043A\u0430\u0440\u0442\u043A\u0438 \u2014 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456\u0448\u043D\u0456\u043C \u0434\u043D\u0435\u043C")) return;
    if (k === "inv") {
      const r2 = await act("bankInvs", { id });
      if (!r2) return;
      if (!r2.list.length) return toast("\u2139\uFE0F \u041D\u0435\u043C\u0430\u0454 \u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u0438\u0445 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 \u0443 \u0431\u043E\u0440\u0433");
      const v = await modal({
        title: "\u{1F9FE} \u042F\u043A\u0456 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E?",
        body: `<div style="max-height:50vh;overflow:auto">${r2.list.map((x) => `<label class="kv" style="gap:8px"><span style="min-width:0;overflow-wrap:anywhere"><input type="checkbox" class="bkInv" value="${esc(x.id)}"> ${bkD(x.day)} \xB7 ${esc(x.sup)}${x.no ? " \u2116" + esc(x.no) : ""}</span><b class="money">${money(x.total)}</b></label>`).join("")}</div>`,
        buttons: [{ label: "\u2705 \u0417\u0456\u0441\u0442\u0430\u0432\u0438\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
        keep: true
      });
      p.ids = v === "ok" ? [...document.querySelectorAll(".bkInv:checked")].map((i) => i.value) : [];
      closeModal();
      if (!p.ids.length) return;
    }
    if (k === "acq") {
      const x = S.data.bank.list.find((y) => y.id === id), ds = [...Array(7)].map((_, i) => {
        const d = /* @__PURE__ */ new Date(x.d + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - i);
        return d.toISOString().slice(0, 10);
      });
      const v = await modal({ title: "\u{1F4B3} \u0417\u0430 \u044F\u043A\u0456 \u0434\u043D\u0456 \u0446\u0435 \u0432\u0456\u0434\u0448\u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u044F?", body: ds.map((d) => `<label class="kv"><span><input type="checkbox" class="bkDay" value="${d}"> ${bkD(d)}</span></label>`).join(""), buttons: [{ label: "\u2705 \u0417\u0456\u0441\u0442\u0430\u0432\u0438\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
      p.days = v === "ok" ? [...document.querySelectorAll(".bkDay:checked")].map((i) => i.value) : [];
      closeModal();
      if (!p.days.length) return;
    }
    if (k === "agg") {
      const g = await aggsLoad();
      if (!g.length) return toast("\u2139\uFE0F \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438 \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E \u2014 \u2699\uFE0F \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u2192 \u{1F6F5} \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438");
      const x = S.data.bank.list.find((y) => y.id === id), ds = [...Array(21)].map((_, i) => {
        const d = /* @__PURE__ */ new Date(x.d + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - i);
        return d.toISOString().slice(0, 10);
      });
      const ag = g.length === 1 ? g[0].id : await choose("\u{1F6F5} \u0412\u0456\u0434 \u044F\u043A\u043E\u0433\u043E \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430 \u0432\u0438\u043F\u043B\u0430\u0442\u0430?", `${bkD(x.d)} \xB7 ${money(x.sum)}`, g.map((a) => ({ label: a.n, val: a.id })));
      if (!ag) return;
      const v = await modal({ title: "\u{1F6F5} \u0417\u0430 \u044F\u043A\u0456 \u0434\u043D\u0456 \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u0446\u044F \u0432\u0438\u043F\u043B\u0430\u0442\u0430?", body: `<div style="max-height:50vh;overflow:auto">${ds.map((d) => `<label class="kv"><span><input type="checkbox" class="bkDay" value="${d}"> ${bkD(d)}</span></label>`).join("")}</div>`, buttons: [{ label: "\u2705 \u0417\u0456\u0441\u0442\u0430\u0432\u0438\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
      p.ag = ag;
      p.days = v === "ok" ? [...document.querySelectorAll(".bkDay:checked")].map((i) => i.value) : [];
      closeModal();
      if (!p.days.length) return;
    }
    const r = await act("bankAct", __spreadValues({ id, a: k }, p), "\u2705 \u0413\u043E\u0442\u043E\u0432\u043E");
    if (r == null ? void 0 : r.warn) toast("\u26A0\uFE0F " + r.warn);
    if (r) {
      S.incR = null;
      loadView();
    }
  }
  on("bkAct", async (el) => {
    bkAct(el.dataset.k, el.dataset.id);
    return;
  });
  on("bkM", async (el) => {
    var _a2;
    const m = ((_a2 = S.data.bank) == null ? void 0 : _a2.m) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    let [y, mm] = m.split("-").map(Number);
    mm += +el.dataset.t;
    if (mm < 1) {
      mm = 12;
      y--;
    }
    if (mm > 12) {
      mm = 1;
      y++;
    }
    S.bankM = `${y}-${String(mm).padStart(2, "0")}`;
    S.data.bank = null;
    renderMain();
    loadView();
    return;
  });
  on("cashTab", async (el, e, a, t) => {
    S.cashTab = el.dataset.t;
    renderMain();
    loadView();
    return;
  });
  on("movBack", async (el, e, a, t) => {
    await act("moveBack", { i: +el.dataset.i }, "\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    loadView();
    return;
  });
  on("expBack", async (el, e, a, t) => {
    await act("expenseBack", { i: +el.dataset.i }, "\u21A9\uFE0F \u0412\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    loadView();
    return;
  });
  on("cEdit", async (el, e, a, t) => {
    cEdit(el.dataset.ref, el.dataset.d || void 0);
    return;
  });
  on("cMove", async (el, e, a, t) => {
    cashMove(el.dataset.t);
    return;
  });
  on("balInfo", async (el, e, a, t) => {
    balInfo(el.dataset.s);
    return;
  });
  on("movDel", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437\u0430\u043F\u0438\u0441?")) {
      await act("moveDel", { i: +el.dataset.i });
      loadView();
    }
    return;
  });
  on("expDel", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0432\u0438\u0442\u0440\u0430\u0442\u0443?")) {
      await act("expenseDel", { i: +el.dataset.i });
      loadView();
    }
    return;
  });
  async function aggsLoad(force) {
    if (!modOn("agg")) return [];
    if (!S.aggs || force) {
      const r = await api("aggList").catch(() => null);
      if (!r) return S.aggs || [];
      S.aggsAll = r.list || [];
      S.aggs = S.aggsAll.filter((a) => a.on);
    }
    return S.aggs;
  }
  async function aggManage() {
    await aggsLoad(true);
    const l = S.aggsAll || [];
    const v = await modal({
      title: "\u{1F6F5} \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438",
      body: `<div class="muted" style="font-size:12px;margin-bottom:8px">\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430 \u0437\u0430\u043A\u0440\u0438\u0432\u0430\u0439\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u043E\u044E \xAB\u{1F6F5} \u043D\u0430\u0437\u0432\u0430\xBB. \u0412\u0438\u043F\u043B\u0430\u0442\u0443 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430 \u0443 \u0431\u0430\u043D\u043A\u0456\u0432\u0441\u044C\u043A\u0456\u0439 \u0432\u0438\u043F\u0438\u0441\u0446\u0456 \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0437\u0456\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0437 \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C\u0438 \u0441\u0430\u043C\u0430, \u0430 \u043A\u043E\u043C\u0456\u0441\u0456\u044E \u0437\u0430\u043F\u0438\u0448\u0435 \u0432\u0438\u0442\u0440\u0430\u0442\u043E\u044E.</div>
      ${l.map((a) => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${a.on ? "\u{1F7E2}" : "\u26AA\uFE0F"} ${esc(a.n)}<br><small class="muted">\u043A\u043E\u043C\u0456\u0441\u0456\u044F ~${a.fee || 0}%${a.rx ? " \xB7 \u0443 \u0432\u0438\u043F\u0438\u0441\u0446\u0456: " + esc(a.rx) : ""}</small></span></div>`).join("")}`,
      buttons: [...l.map((a) => ({ label: "\u270F\uFE0F " + a.n, val: "ed:" + a.id })), { label: "\u2795 \u0414\u043E\u0434\u0430\u0442\u0438", val: "add" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }]
    });
    if (String(v).startsWith("ed:")) return aggEd(v.slice(3));
    if (v === "add") {
      const n = await ask("\u041D\u0430\u0437\u0432\u0430 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430", "\u041D\u0430\u043F\u0440.: Uklon Food");
      if (!n) return;
      const fee = await ask("\u041A\u043E\u043C\u0456\u0441\u0456\u044F, %", "\u041E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u0430 \u2014 \u0434\u043B\u044F \u043F\u0456\u0434\u043A\u0430\u0437\u043A\u0438 \u043F\u0440\u0438 \u0437\u0432\u0456\u0440\u0446\u0456", "number");
      if (await act("aggSet", { n, fee }, "\u{1F6F5} \u0414\u043E\u0434\u0430\u043D\u043E")) {
        await aggsLoad(true);
        aggManage();
      }
    }
  }
  on("aggManage", async () => {
    aggManage();
    return;
  });
  async function aggEd(id) {
    var _a2;
    const a = (S.aggsAll || []).find((x) => x.id === id);
    if (!a) return;
    const v = await choose("\u{1F6F5} " + a.n, `\u041A\u043E\u043C\u0456\u0441\u0456\u044F ~${a.fee || 0}% \xB7 ${a.on ? "\u0443\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E" : "\u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E"}`, [{ label: a.on ? "\u26AA\uFE0F \u0412\u0438\u043C\u043A\u043D\u0443\u0442\u0438" : "\u{1F7E2} \u0423\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438", val: "on" }, { label: "\u{1F4B8} \u041A\u043E\u043C\u0456\u0441\u0456\u044F, %", val: "fee" }, { label: "\u270F\uFE0F \u041D\u0430\u0437\u0432\u0430", val: "n" }, { label: "\u{1F3E6} \u042F\u043A \u043F\u0456\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u0439 \u0443 \u0432\u0438\u043F\u0438\u0441\u0446\u0456", val: "rx" }]);
    if (!v) return aggManage();
    const p = { id: a.id };
    if (v === "on") p.on = a.on ? 0 : 1;
    else {
      const x = await askVal({ fee: "\u041A\u043E\u043C\u0456\u0441\u0456\u044F, %", n: "\u041D\u0430\u0437\u0432\u0430", rx: "\u042F\u043A \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440 \u043F\u0456\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u0439 \u0443 \u0432\u0438\u043F\u0438\u0441\u0446\u0456 (\u0447\u0435\u0440\u0435\u0437 |, \u043D\u0430\u043F\u0440.: glovo|\u0433\u043B\u043E\u0432\u043E)" }[v], (_a2 = a[v]) != null ? _a2 : "", v === "fee" ? "number" : "text");
      if (x == null || x === "") return aggManage();
      p[v] = x;
    }
    if (await act("aggSet", p, "\u{1F6F5} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) await aggsLoad(true);
    aggManage();
  }
  function perRange(p) {
    var _a2, _b2;
    const now = new Date(Date.now() - ((_b2 = (_a2 = S.cfg) == null ? void 0 : _a2.dayH) != null ? _b2 : 3) * 36e5), day = 864e5, y = now.getFullYear(), mo = now.getMonth();
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
  const csvOf = (x) => x.sections.map((s) => [s.title, s.head, ...s.rows].map((r) => Array.isArray(r) ? r.map((v) => {
    const t = String(v != null ? v : "");
    return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }).join(";") : r).join("\r\n")).join("\r\n\r\n");
  async function acctExport() {
    const [from, to] = perRange(S.rep.p), how = await choose("\u{1F4E4} \u0415\u043A\u0441\u043F\u043E\u0440\u0442 \u0434\u043B\u044F \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0430", `\u041F\u0435\u0440\u0456\u043E\u0434 ${from} \u2014 ${to}: \u043F\u0440\u043E\u0434\u0430\u0436\u0456, \u043E\u043F\u043B\u0430\u0442\u0438 \u0437\u0430 \u0442\u0438\u043F\u0430\u043C\u0438, \u043F\u0440\u0438\u0445\u043E\u0434\u0438 \u0441\u043A\u043B\u0430\u0434\u0443, \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F, \u0432\u0438\u0442\u0440\u0430\u0442\u0438 \u0437 \u043A\u0430\u0441\u0438, \u0417\u041F.`, [{ label: "\u{1F4C4} CSV (Excel)", val: "csv", cls: "primary" }, { label: "\u{1F5A8} PDF / \u0434\u0440\u0443\u043A", val: "pdf" }, { label: "\u{1F9FE} M.E.Doc \u2014 \u043F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u0456 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456", val: "medoc" }, { label: "\u{1F4D7} BAS \u2014 \u043F\u0440\u043E\u0434\u0430\u0436\u0456 \u043F\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u044F\u0445", val: "bas" }]);
    if (!how) return;
    if (how === "medoc" || how === "bas") {
      let no = 1;
      if (how === "medoc") {
        const v = await askVal("\u2116 \u043F\u0435\u0440\u0448\u043E\u0457 \u043F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u043E\u0457 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457 \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F", "1", "number");
        if (v == null) return;
        no = +v || 1;
      }
      let r;
      try {
        r = await api("acctFile", { from, to, fmt: how, no }, 3e4);
      } catch (e) {
        return toast("\u26A0\uFE0F " + (e.message || "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0444\u043E\u0440\u043C\u0443\u0432\u0430\u0442\u0438"));
      }
      const u = Uint8Array.from(atob(r.b64), (c) => c.charCodeAt(0)), a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([u]));
      a.download = r.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
      return toast(how === "medoc" ? `\u{1F9FE} \u041F\u041D: ${r.n} \u2014 \u0440\u043E\u0437\u043F\u0430\u043A\u0443\u0439\u0442\u0435 ZIP \u0456 \u0432 M.E.Doc: \u0424\u0430\u0439\u043B \u2192 \u0406\u043C\u043F\u043E\u0440\u0442` : `\u{1F4D7} \u0420\u044F\u0434\u043A\u0456\u0432: ${r.n} \u2014 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0442\u0435 \u0432 BAS \u0441\u043A\u0440\u0438\u043F\u0442\u043E\u043C atom-bas-import.ps1`);
    }
    let x;
    try {
      x = await api("acctExport", { from, to });
    } catch (e) {
      return toast("\u26A0\uFE0F \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0444\u043E\u0440\u043C\u0443\u0432\u0430\u0442\u0438");
    }
    if (how === "csv") {
      const f = new Blob(["\uFEFF" + csvOf(x)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = `varvar-${from}_${to}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
      return;
    }
    const w = window.open("", "_blank");
    if (!w) return toast("\u26A0\uFE0F \u0414\u043E\u0437\u0432\u043E\u043B\u044C\u0442\u0435 \u0441\u043F\u043B\u0438\u0432\u0430\u044E\u0447\u0435 \u0432\u0456\u043A\u043D\u043E");
    w.document.write(`<!doctype html><meta charset="utf-8"><title>\u0415\u043A\u0441\u043F\u043E\u0440\u0442 ${esc(from)} \u2014 ${esc(to)}</title><style>body{font:12px Arial;margin:18px}h1{font-size:16px}h2{font-size:13px;margin:16px 0 4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:3px 6px;text-align:left}th{background:#eee}td:not(:first-child){text-align:right}@media print{h2{break-after:avoid}tr{break-inside:avoid}}</style><h1>\u0417\u0432\u0456\u0442 \u0434\u043B\u044F \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0430 \xB7 ${esc(from)} \u2014 ${esc(to)}</h1>` + x.sections.map((s) => `<h2>${esc(s.title)}</h2><table><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${s.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(String(v != null ? v : ""))}</td>`).join("")}</tr>`).join("")}</table>`).join("") + "<script>setTimeout(function(){print()},300)<\/script>");
    w.document.close();
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
    const checks = ((r == null ? void 0 : r.checks) || []).filter((c) => (!R.pay || (R.pay === "onl" ? c.onl > 0 : R.pay === "card" ? c.card > 0 : c.cash > 0)) && (!R.by || (c.w || c.by) === R.by || c.by === R.by) && (!R.t || String(c.t) === R.t)).map((c) => {
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
    return { checks, dishF, total, n, avg: n ? total / n : 0, qty: sum(checks, (c) => sum(c.ds, (d) => d[1])), cash: sum(checks, (c) => c.cash), card: sum(checks, (c) => c.card), onl: sum(checks, (c) => c.onl), disc: sum(checks, (c) => c.disc), tip: sum(checks, (c) => c.tip), exp, tipOut, net: exp == null ? null : total - exp - salOut, salOut };
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
    const dm2 = (d) => d.split("-").reverse().slice(0, from.slice(0, 4) === to.slice(0, 4) ? 2 : 3).join(".");
    const head = `<div class="rhead"><div><h1>\u0417\u0432\u0456\u0442\u0438</h1><span class="muted">${from === to ? dm2(from) : dm2(from) + " \u2014 " + dm2(to)}${S.data.prev ? " \xB7 \u043F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0437 \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u043C\u0438 " + daysIn(from, to).length + " \u0434\u043D." : ""}</span></div>
      <button class="btn sm" data-a="rAcct">\u{1F4E4} \u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0443</button><button class="btn sm ${nF ? "primary" : ""}" data-a="rFo">\u2699\uFE0F \u0424\u0456\u043B\u044C\u0442\u0440\u0438${nF ? ` \xB7 ${nF}` : ""}</button></div>
      <div class="chips scroll">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? "on" : ""}" data-a="rp" data-p="${k}">${l}</button>`).join("")}</div>
      ${R.p === "c" ? `<div class="frow" style="margin-top:10px"><label>\u0417<input type="date" id="rFrom" value="${from}"></label><label>\u041F\u043E<input type="date" id="rTo" value="${to}"></label></div>` : ""}`;
    const filters = R.fo || nF ? `<div class="filters" style="margin-top:10px">${R.fo ? `<div class="frow">
        <label>\u041E\u043F\u043B\u0430\u0442\u0430<select data-f="pay">${opt("", "\u0423\u0441\u0456", R.pay)}${opt("cash", "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430", R.pay)}${opt("card", "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430", R.pay)}${opt("onl", "\u{1F310} \u041E\u043D\u043B\u0430\u0439\u043D", R.pay)}</select></label>
        <label>\u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442<select data-f="by">${opt("", "\u0423\u0441\u0456", R.by)}${waiters.map((w) => opt(w, w, R.by)).join("")}</select></label>
        <label>\u0413\u0440\u0443\u043F\u0430<select data-f="grp">${opt("", "\u0423\u0441\u0435", R.grp)}${S.groups.map((g) => opt(g.id, g.name, R.grp)).join("")}</select></label>
        <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F<select data-f="cat">${opt("", "\u0423\u0441\u0456", R.cat)}${cats.map((c) => opt(c.id, c.name.uk, R.cat)).join("")}</select></label>
        <label>\u0421\u0442\u0456\u043B<select data-f="t">${opt("", "\u0423\u0441\u0456", R.t)}${tables.map((t) => opt(String(t), "\u0421\u0442\u0456\u043B " + tn(t), R.t)).join("")}</select></label>
        <label>\u0421\u0442\u0440\u0430\u0432\u0430<input id="rQ" placeholder="\u{1F50E} \u043D\u0430\u0437\u0432\u0430" value="${esc(R.q)}"></label></div>` : ""}
        ${nF ? `<div class="chips">${[R.pay && (R.pay === "onl" ? "\u{1F310} \u041E\u043D\u043B\u0430\u0439\u043D" : R.pay === "card" ? "\u{1F4B3} \u041A\u0430\u0440\u0442\u0430" : "\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430"), R.by && "\u{1F464} " + R.by, R.grp && (S.groups.find((g) => g.id === R.grp) || {}).name, R.cat && (((_a2 = cats.find((c) => c.id === R.cat)) == null ? void 0 : _a2.name.uk) || R.cat), R.t && "\u0421\u0442\u0456\u043B " + tn(R.t), R.q.trim() && "\u{1F50E} " + R.q.trim()].filter(Boolean).map((x) => `<span class="chip on sm">${esc(x)}</span>`).join("")}<button class="chip" data-a="rReset">\u2715 \u0421\u043A\u0438\u043D\u0443\u0442\u0438</button></div>` : ""}</div>` : "";
    if (!r) return head + filters + '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const st = repStats(r), pv = repStats(S.data.prev), { checks, dishF } = st, gross = st.total + st.disc;
    const kpi = (l, v, raw, pr, cls) => `<div class="kpi ${cls || ""}"><span>${l}</span><b class="money">${v}</b>${pv ? delta(raw, pr) : ""}</div>`;
    const kpis = `<div class="kpis">${kpi("\u0412\u0438\u0440\u0443\u0447\u043A\u0430", money(st.total), st.total, pv == null ? void 0 : pv.total, "accent")}${kpi("\u0427\u0435\u043A\u0456\u0432", st.n, st.n, pv == null ? void 0 : pv.n)}${kpi("\u0421\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A", st.n ? money(st.avg) : "\u2014", st.avg, pv == null ? void 0 : pv.avg)}${st.net != null ? kpi("\u0427\u0438\u0441\u0442\u0438\u043C\u0438", money(st.net), st.net, pv == null ? void 0 : pv.net, "green") : kpi("\u041F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439", st.qty, st.qty, pv == null ? void 0 : pv.qty)}</div>`;
    const cp = share(st.cash, st.cash + st.card);
    const pills = `<div class="pills">${!dishF ? `<div class="pill wide"><div class="psplit"><i style="width:${cp}%"></i></div><div class="psplit-l"><span>\u{1F4B5} \u0413\u043E\u0442\u0456\u0432\u043A\u0430 <b class="money">${money(st.cash)}</b> <span class="muted">${cp}%</span></span><span>\u{1F4B3} \u041A\u0430\u0440\u0442\u0430 <b class="money">${money(st.card)}</b>${st.onl ? ` <span class="muted">(\u{1F310} ${money(st.onl)})</span>` : ""} <span class="muted">${st.cash + st.card ? Math.round((100 - cp) * 10) / 10 : 0}%</span></span></div></div>
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
      return `<div class="pill wide full"><span>\u041A\u0430\u043D\u0430\u043B\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0443</span><div class="psplit-l"><span>\u{1FA91} \u0417\u0430\u043B <b class="money">${money(ch.hall[1])}</b> <span class="muted">${ch.hall[0]} \u0447\u0435\u043A.</span></span><span>\u{1F961} \u0421\u0430\u043C\u043E\u0432\u0438\u0432\u0456\u0437 <b class="money">${money(ch.pick[1])}</b> <span class="muted">${ch.pick[0]} \u0447\u0435\u043A.</span></span><span>\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 <b class="money">${money(ch.del[1])}</b> <span class="muted">${ch.del[0]} \u0447\u0435\u043A.${fee ? ` \xB7 \u0437\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443 ${money(fee)}` : ""}</span></span></div></div>`;
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
    const T2 = R.tab;
    let body = "";
    if (T2 === "cour") return head + nav + courRepHTML();
    if (T2 === "overview") {
      let chart, ctitle;
      if (days.length === 1) chart = "";
      else if (days.length <= 62) {
        ctitle = "\u{1F4C5} \u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u043F\u043E \u0434\u043D\u044F\u0445";
        chart = colChart(days.map((d) => {
          const v = byDay.get(d) || [0, 0];
          return [d.slice(8), v[1], `${WD[wdOf(d)]} ${dm2(d)} \xB7 ${money(v[1])} \xB7 ${v[0]} \u0447\u0435\u043A.`, d];
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
        best && days.length > 1 && ["\u{1F3C6} \u041D\u0430\u0439\u043A\u0440\u0430\u0449\u0438\u0439 \u0434\u0435\u043D\u044C", `${WD[wdOf(best[0])]} ${dm2(best[0])}`, money(best[1][1])],
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
    if (T2 === "dishes") {
      rows = dishAgg((nm) => nm);
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T2 === "cats") {
      rows = dishAgg((nm) => {
        var _a3;
        return ((_a3 = dishOf(nm)) == null ? void 0 : _a3.cname) || "\u0406\u043D\u0448\u0435";
      });
      unit = "\u0448\u0442";
      sortable = true;
    } else if (T2 === "groups") {
      rows = dishAgg(grpName);
      unit = "\u0448\u0442";
    } else if (T2 === "waiters") {
      rows = grpBy(waiterOf);
      sub = (q, s) => `${q} \u0447\u0435\u043A. \xB7 \u0441\u0435\u0440. ${money(s / q)}`;
    } else if (T2 === "tips") {
      const m = /* @__PURE__ */ new Map();
      checks.forEach((c) => Object.entries(c.tipSplit || (c.tip ? { [c.by || "\u2014"]: c.tip } : {})).forEach(([n, v]) => {
        const a = m.get(n) || [0, 0];
        a[0]++;
        a[1] += v;
        m.set(n, a);
      }));
      rows = [...m].filter((x) => x[1][1] > 0);
    } else if (T2 === "days") {
      rows = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [`${WD[wdOf(d)]} ${dm2(d)}`, v]);
    } else if (T2 === "wd") {
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
    } else if (T2 === "tables") rows = grpBy((c) => "\u0421\u0442\u0456\u043B " + tn(c.t)).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    if (rows) {
      if (!["hours", "days", "tables", "wd"].includes(T2)) rows.sort((a, b) => R.sort === "q" && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const tot = rows.reduce((a, x) => a + x[1][1], 0);
      body += barRows(rows, unit, tot, sub);
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== "q" ? "on" : ""}" data-a="rSort" data-s="s">\u0417\u0430 \u0441\u0443\u043C\u043E\u044E</button><button class="chip ${R.sort === "q" ? "on" : ""}" data-a="rSort" data-s="q">\u0417\u0430 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044E</button></div>` + body;
    } else if (["checks", "exp", "mov", "z"].includes(T2)) {
      const xb = (kind, x, back) => `<button class="xb${back ? " back" : ""}" data-a="${back ? "rBack" : "rDel"}" data-k="${kind}" data-d="${x.d}" data-i="${kind === "checks" ? esc(x.id || "") : x.i}" title="${back ? "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438"}">${back ? "\u21A9\uFE0F" : "\u{1F5D1}"}</button>`;
      const line = (kind, x, l, v, back) => `<div class="kv rrow${back ? " del" : ""}"><span>${l}</span><span class="kv-r"><b class="money">${v}</b>${kind === "checks" && !back && x.id && isAdmin() ? `<button class="xb" data-a="cEdit" data-ref="${esc(x.id)}" data-d="${x.d}" title="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0439 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438">\u270F\uFE0F</button>` : ""}${kind !== "checks" || x.id ? xb(kind, x, back) : ""}</span></div>`;
      const dd = (d) => d.slice(8) + "." + d.slice(5, 7);
      let act2 = [], gone = [], empty = "";
      if (T2 === "checks") {
        act2 = [...checks].reverse().slice(0, 300).map((c) => line("checks", c, `${dd(c.d)} ${c.at} \xB7 \u0441\u0442\u0456\u043B ${tn(c.t)} \xB7 ${esc(waiterOf(c))} ${c.onl ? "\u{1F310}" : c.card ? "\u{1F4B3}" : "\u{1F4B5}"}${c.disc ? " \u{1F3F7}" : ""}${c.tip ? ` \xB7 \u{1F49D} ${money(c.tip)}` : ""}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}\xD7 ${esc(nm)}`).join(", ")}</small>`, money(c.val)));
        gone = (r.removed || []).filter((x) => !x.reopen).map((x) => line("checks", x, `${dd(x.d)} ${x.at} \xB7 \u0441\u0442\u0456\u043B ${tn(x.t)} \xB7 ${esc(x.by)} <span class="muted">\xB7 \u0437\u043D\u044F\u0442\u043E \u0437 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</span>`, money(x.sum), 1));
        empty = "\u041D\u0435\u043C\u0430\u0454 \u0447\u0435\u043A\u0456\u0432";
      }
      if (T2 === "exp") {
        act2 = [...r.exp].filter((e) => !e.del).reverse().map((e) => line("exp", e, `${dd(e.d)} ${e.at} ${e.src === "card" ? "\u{1F4B3}" : "\u{1F4B5}"} ${esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430")} <span class="muted">${esc(e.by)}</span>`, money(e.sum)));
        gone = (r.expDel || []).map((e) => line("exp", e, `${dd(e.d)} ${e.at} ${esc(e.note || "\u0412\u0438\u0442\u0440\u0430\u0442\u0430")}`, money(e.sum), 1));
        empty = "\u0412\u0438\u0442\u0440\u0430\u0442 \u043D\u0435\u043C\u0430\u0454";
      }
      if (T2 === "mov") {
        act2 = [...r.mov || []].reverse().map((m) => line("mov", m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || "")} <span class="muted">${esc(m.by || "")}</span>`, money(m.sum)));
        gone = (r.movDel || []).map((m) => line("mov", m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || "")}`, money(m.sum), 1));
        empty = "\u0420\u0443\u0445\u0443 \u043A\u043E\u0448\u0442\u0456\u0432 \u043D\u0435\u043C\u0430\u0454";
      }
      if (T2 === "z") {
        const zl = (z) => `${dd(z.d)} ${new Date(z.closed).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })} \xB7 ${z.checks} \u0447\u0435\u043A. \xB7 ${esc(z.closedBy || "")}${z.diff ? ` \xB7 <b style="color:var(--red)">\u0440\u0456\u0437\u043D\u0438\u0446\u044F ${z.diff > 0 ? "+" : ""}${money(z.diff)}</b>` : ""}`;
        act2 = [...r.z].reverse().map((z) => line("z", z, zl(z), money(z.total)));
        gone = (r.zDel || []).map((z) => line("z", z, zl(z), money(z.total), 1));
        empty = "Z-\u0437\u0432\u0456\u0442\u0456\u0432 \u0437\u0430 \u043F\u0435\u0440\u0456\u043E\u0434 \u043D\u0435\u043C\u0430\u0454";
      }
      body = (act2.join("") || `<div class="muted">${empty}</div>`) + (gone.length ? `<h3 style="margin:18px 0 8px">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0456 <span class="muted">\xB7 ${gone.length} \xB7 \u21A9\uFE0F \u2014 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438</span></h3>${gone.join("")}` : "");
    } else if (T2 === "kitchen") {
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
    } else if (T2 === "ctrl") {
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
  on("rAcct", async (el, e, a, t) => {
    acctExport();
    return;
  });
  on("rTab", async (el, e, a, t) => {
    var _a2;
    S.rep.tab = el.dataset.t;
    ((_a2 = S.rep).last || (_a2.last = {}))[SECS.find((x) => x[2].includes(el.dataset.t))[0]] = el.dataset.t;
    renderMain();
    return;
  });
  on("rSec", async (el, e, a, t) => {
    {
      const sc = SECS.find((x) => x[0] === el.dataset.s);
      S.rep.tab = (S.rep.last || {})[sc[0]] || sc[2][0];
      renderMain();
      if (S.rep.tab === "plus" || !S.data.range) loadView();
      return;
    }
  });
  on("rDay", async (el, e, a, t) => {
    if (matchMedia("(hover: none)").matches && !el.classList.contains("on")) {
      el.parentNode.querySelectorAll(".c.on").forEach((x) => x.classList.remove("on"));
      el.classList.add("on");
      el.parentNode.previousElementSibling.textContent = el.title + " \xB7 \u0449\u0435 \u0440\u0430\u0437 \u2014 \u0437\u0432\u0456\u0442 \u0437\u0430 \u0434\u0435\u043D\u044C";
      return;
    }
    Object.assign(S.rep, { p: "c", from: el.dataset.d, to: el.dataset.d });
    loadView();
    $("#main").scrollTop = 0;
    return;
  });
  on("rSort", async (el, e, a, t) => {
    S.rep.sort = el.dataset.s;
    renderMain();
    return;
  });
  on("rReset", async (el, e, a, t) => {
    Object.assign(S.rep, { pay: "", by: "", grp: "", cat: "", t: "", q: "" });
    renderMain();
    return;
  });
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
  const linksCard = () => (() => {
    const B = `https://posatom.online/${VENUE || "varvar"}/`, L = [["\u{1F310} \u0421\u0430\u0439\u0442-\u0432\u0456\u0437\u0438\u0442\u043A\u0430", B, "\u0434\u043B\u044F Instagram, Google Maps, \u0434\u0440\u0443\u0437\u0456\u0432"], ["\u{1F6F5} \u041C\u0435\u043D\u044E \u0437 \u0441\u043E\u0431\u043E\u044E \u0439 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430", B + "?go", "\u0433\u0456\u0441\u0442\u044C \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0454 \u043E\u043D\u043B\u0430\u0439\u043D"], ["\u{1F4C5} \u0411\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F", B + "#book", "\u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430 \u0444\u043E\u0440\u043C\u0443 \u0431\u0440\u043E\u043D\u0456"], ["\u{1F39F} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u043E\u0432\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", B + "#cert", ""], ["\u{1FA91} \u041A\u0430\u0441\u0430 \u0434\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", B + "pos.html", "\u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0456 / \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0456"], ["\u{1F451} \u041A\u0430\u0431\u0456\u043D\u0435\u0442 \u0432\u043B\u0430\u0441\u043D\u0438\u043A\u0430", "https://posatom.online/owner/", "\u0430\u043D\u0430\u043B\u0456\u0442\u0438\u043A\u0430, \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F, \u0441\u0430\u0439\u0442"]];
    return `<div class="card" style="margin-top:12px"><h3>\u{1F517} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0437\u0430\u043A\u043B\u0430\u0434\u0443</h3>${L.map(([l, u, h]) => `<div class="kv"><span style="min-width:0">${l}<br><small class="muted" style="overflow-wrap:anywhere">${esc(u)}${h ? " \xB7 " + h : ""}</small></span><span class="kv-r"><button class="btn sm" data-a="copyLink" data-u="${esc(u)}" title="\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438">\u{1F4CB}</button><a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener" title="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438">\u2197</a></span></div>`).join("")}<div class="muted set-note">QR \u0441\u0442\u043E\u043B\u0456\u0432 \u2014 \u0443 \u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u2192 \xAB\u0423\u0441\u0456 QR-\u043A\u043E\u0434\u0438\xBB. \u0421\u0442\u0430\u0440\u0456 \u043D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u0456 QR \u0442\u0435\u0436 \u043F\u0440\u0430\u0446\u044E\u044E\u0442\u044C.</div></div>`;
  })();
  function printerCards() {
    var _a2;
    const p = S.printer || {}, ok2 = p.seen && Date.now() - p.seen < 6e4;
    return `<div class="cards"><div class="card"><div class="big">${ok2 ? "\u2705 \u043D\u0430 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : p.seen ? "\u274C \u043D\u0435\u043C\u0430\u0454 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443" : "\u274C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0434\u0440\u0443\u043A\u0443 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430"}</div>
      <div class="muted">${p.seen ? "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0437\u0432\u02BC\u044F\u0437\u043E\u043A: " + hhmm(p.seen) : ""} \xB7 \u0443 \u0447\u0435\u0440\u0437\u0456: ${(_a2 = p.q) != null ? _a2 : 0}</div>${p.q && isAdmin() ? '<div class="btnrow" style="margin-top:10px"><button class="btn sm" data-a="pQList">\u{1F4CB} \u0429\u043E \u0432 \u0447\u0435\u0440\u0437\u0456</button><button class="btn sm red" data-a="pQClear">\u{1F5D1} \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0447\u0435\u0440\u0433\u0443</button></div>' : ""}</div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">\u{1F5A8} \u0422\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A</button><button class="btn" data-a="pQr">\u{1F533} QR \u043C\u0435\u043D\u044E \u0434\u043B\u044F \u0441\u0442\u043E\u043B\u0443</button><button class="btn" data-a="qrPanel">\u{1F533} \u0423\u0441\u0456 QR-\u043A\u043E\u0434\u0438</button></div></div>${stCard()}${taxCard()}${incCard()}${prnCard()}`;
  }
  const stNew = () => "c" + Math.random().toString(36).slice(2, 7);
  function stCard() {
    if (!isAdmin()) return "";
    if (!S.stR) {
      if (!S.stL) {
        S.stL = 1;
        api("stGet", {}).then((r) => {
          S.stR = r;
          renderMain();
        }).catch(() => {
          S.stL = 0;
        });
      }
      return '<div class="card" style="margin-top:12px"><h3>\u{1F373} \u0426\u0435\u0445\u0438 \u043A\u0443\u0445\u043D\u0456</h3><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div></div>';
    }
    const R = S.stR, GU = { kitchen: "\u{1F373} \u043A\u0443\u0445\u043D\u044F", bar: "\u{1F379} \u0431\u0430\u0440", hookah: "\u{1F4A8} \u043A\u0430\u043B\u044C\u044F\u043D", other: "\u{1F4E6} \u0456\u043D\u0448\u0435" };
    return `<div class="card" style="margin-top:12px"><h3>\u{1F373} \u0426\u0435\u0445\u0438 \u043A\u0443\u0445\u043D\u0456</h3><div class="muted" style="font-size:13px;margin-bottom:8px">\u0413\u0430\u0440\u044F\u0447\u0438\u0439, \u0445\u043E\u043B\u043E\u0434\u043D\u0438\u0439, \u0431\u0430\u0440\u2026 \u2014 \u0443 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0432\u0456\u0439 \u0435\u043A\u0440\u0430\u043D (/k), \u043A\u0432\u0438\u0442\u043E\u043A \u043D\u0430 \u0441\u0432\u0456\u0439 \u043F\u0440\u0438\u043D\u0442\u0435\u0440 \u0456 \u0441\u0432\u0456\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \xAB\u0433\u043E\u0442\u043E\u0432\u043E\xBB. \u0411\u0435\u0437 \u0446\u0435\u0445\u0456\u0432 \u0443\u0441\u0435 \u043F\u0440\u0430\u0446\u044E\u0454 \u044F\u043A \u0440\u0430\u043D\u0456\u0448\u0435.</div>
      ${R.sts.map((z) => {
      var _a2, _b2;
      return `<div class="kv"><span>${esc((z.emoji ? z.emoji + " " : "") + z.name)} <span class="muted">\xB7 ${z.g.map((g) => GU[g]).join(", ") || "\u043B\u0438\u0448\u0435 \u0440\u043E\u0437\u0434\u0456\u043B\u0438"}${z.pr ? " \xB7 \u{1F5A8} " + esc(((_b2 = (((_a2 = S.prnR) == null ? void 0 : _a2.route.st) || []).find((p) => p.id === z.pr)) == null ? void 0 : _b2.name) || z.pr) : ""}${z.scr ? "" : " \xB7 \u0431\u0435\u0437 \u0435\u043A\u0440\u0430\u043D\u0430"}</span></span><span style="display:flex;gap:6px"><button class="btn sm" data-stx="edit" data-id="${z.id}">\u270F\uFE0F</button><button class="btn sm" data-stx="del" data-id="${z.id}">\u{1F5D1}</button></span></div>`;
    }).join("") || '<div class="muted">\u0426\u0435\u0445\u0456\u0432 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043F\u0440\u0430\u0446\u044E\u0454 \u043E\u0434\u043D\u0430 \u043A\u0443\u0445\u043D\u044F.</div>'}
      <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-stx="add">\u2795 \u0426\u0435\u0445</button></div>
      ${R.sts.length ? `<h3 class="muted" style="margin:14px 0 6px;font-size:14px">\u0420\u043E\u0437\u0434\u0456\u043B\u0438 \u043C\u0435\u043D\u044E \u2192 \u0446\u0435\u0445</h3>${R.cats.map((c) => `<div class="kv"><span>${esc(c.name)}</span><select data-stx="cat" data-id="${esc(c.id)}"><option value="">\u0430\u0432\u0442\u043E (\u0437\u0430 \u0433\u0440\u0443\u043F\u043E\u044E)</option>${R.sts.map((z) => `<option value="${z.id}" ${c.st === z.id ? "selected" : ""}>${esc((z.emoji ? z.emoji + " " : "") + z.name)}</option>`).join("")}</select></div>`).join("")}` : ""}</div>`;
  }
  async function stSave(list, cats) {
    const r = await act("stSet", { list, cats }, "\u{1F373} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    S.stR = null;
    S.stL = 0;
    if (r) loadMenu == null ? void 0 : loadMenu().catch(() => {
    });
    renderMain();
    return r;
  }
  async function stEdit(z) {
    var _a2;
    const name = await askVal("\u041D\u0430\u0437\u0432\u0430 \u0446\u0435\u0445\u0443", z.name);
    if (!(name == null ? void 0 : name.trim())) return null;
    const emoji = await askVal("\u0415\u043C\u043E\u0434\u0437\u0456 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)", z.emoji || "");
    const g = await choose("\u042F\u043A\u0456 \u0441\u0442\u0440\u0430\u0432\u0438 \u0441\u044E\u0434\u0438 \u0437\u0430 \u0437\u0430\u043C\u043E\u0432\u0447\u0443\u0432\u0430\u043D\u043D\u044F\u043C?", "\u0420\u043E\u0437\u0434\u0456\u043B\u0438 \u043C\u0435\u043D\u044E \u043C\u043E\u0436\u043D\u0430 \u043F\u0440\u0438\u0437\u043D\u0430\u0447\u0438\u0442\u0438 \u043E\u043A\u0440\u0435\u043C\u043E \u043D\u0438\u0436\u0447\u0435", [{ label: "\u{1F373} \u041A\u0443\u0445\u043D\u044F", val: "kitchen" }, { label: "\u{1F379} \u0411\u0430\u0440", val: "bar" }, { label: "\u{1F4A8} \u041A\u0430\u043B\u044C\u044F\u043D", val: "hookah" }, { label: "\u{1F4E6} \u0406\u043D\u0448\u0435", val: "other" }, { label: "\u2014 \u043B\u0438\u0448\u0435 \u0432\u0438\u0431\u0440\u0430\u043D\u0456 \u0440\u043E\u0437\u0434\u0456\u043B\u0438", val: "none" }]);
    if (!g) return null;
    const ps = ((_a2 = S.prnR) == null ? void 0 : _a2.route.st) || [];
    let pr = z.pr || "";
    if (ps.length) {
      const p = await choose("\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u0446\u0435\u0445\u0443", "\u041A\u0443\u0434\u0438 \u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u043A\u0432\u0438\u0442\u043A\u0438 \u0446\u044C\u043E\u0433\u043E \u0446\u0435\u0445\u0443", [...ps.map((x) => ({ label: x.name, val: x.id })), { label: "\u2014 \u0437\u0430 \u0433\u0440\u0443\u043F\u043E\u044E (\u044F\u043A \u0440\u0430\u043D\u0456\u0448\u0435)", val: "none" }]);
      if (!p) return null;
      pr = p === "none" ? "" : p;
    }
    return __spreadProps(__spreadValues({}, z), { name: name.trim(), emoji: (emoji || "").trim(), g: g === "none" ? [] : [g], pr, scr: 1 });
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("button[data-stx]");
    if (!el || !S.stR) return;
    const R = S.stR;
    if (el.dataset.stx === "add") {
      const z = await stEdit({ id: stNew() });
      if (z) await stSave([...R.sts, z], null);
    } else if (el.dataset.stx === "edit") {
      const z = await stEdit(R.sts.find((x) => x.id === el.dataset.id));
      if (z) await stSave(R.sts.map((x) => x.id === z.id ? z : x), null);
    } else if (el.dataset.stx === "del" && await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0446\u0435\u0445?", "\u0421\u0442\u0440\u0430\u0432\u0438 \u043F\u0456\u0434\u0443\u0442\u044C \u0443 \u043F\u0435\u0440\u0448\u0438\u0439 \u0446\u0435\u0445 \u0430\u0431\u043E \u0437\u0430 \u0433\u0440\u0443\u043F\u043E\u044E")) {
      const cats = Object.fromEntries(R.cats.filter((c) => c.st === el.dataset.id).map((c) => [c.id, ""]));
      await stSave(R.sts.filter((x) => x.id !== el.dataset.id), cats);
    }
  });
  document.addEventListener("change", async (e) => {
    const el = e.target.closest('select[data-stx="cat"]');
    if (el) await stSave(S.stR.sts, { [el.dataset.id]: el.value });
  });
  const TXR = { minWage: "\u041C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0430 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430, \u20B4", living: "\u041F\u0440\u043E\u0436\u0438\u0442\u043A\u043E\u0432\u0438\u0439 \u043C\u0456\u043D\u0456\u043C\u0443\u043C, \u20B4", esv: "\u0404\u0421\u0412, %", ep3: "\u0404\u041F 3 \u0433\u0440\u0443\u043F\u0438, % \u0434\u043E\u0445\u043E\u0434\u0443", vz: "\u0412\u0456\u0439\u0441\u044C\u043A\u043E\u0432\u0438\u0439 \u0437\u0431\u0456\u0440 \u0424\u041E\u041F, % \u0434\u043E\u0445\u043E\u0434\u0443", pdfo: "\u041F\u0414\u0424\u041E \u0456\u0437 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0438, %", vzZp: "\u0412\u0456\u0439\u0441\u044C\u043A\u043E\u0432\u0438\u0439 \u0437\u0431\u0456\u0440 \u0456\u0437 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0438, %" };
  function taxCard() {
    if (!isAdmin() || !modOn("tax")) return "";
    const hd = '<div class="card" style="margin-top:12px"><h3>\u{1F4C5} \u041F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u0438\u0439 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440</h3>';
    if (!S.txR) {
      if (!S.txL) {
        S.txL = 1;
        api("taxGet", {}).then((r) => {
          S.txR = r;
          renderMain();
        }).catch(() => {
          S.txL = 0;
        });
      }
      return hd + '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div></div>';
    }
    const R = S.txR, T2 = R.tax, dm2 = (d) => d.split("-").reverse().slice(0, 2).join(".");
    return hd + `<div class="muted" style="font-size:13px;margin-bottom:8px">\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0444\u043E\u0440\u043C\u0443 \u2014 \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u043D\u0430\u0433\u0430\u0434\u0430\u0454 \u0432 Telegram \u043F\u0440\u043E \u0437\u0432\u0456\u0442\u0438 \u0439 \u043F\u043B\u0430\u0442\u0435\u0436\u0456 \u0442\u0430 \u0434\u0430\u0441\u0442\u044C \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0430 \u043A\u0430\u0431\u0456\u043D\u0435\u0442 \u043F\u043B\u0430\u0442\u043D\u0438\u043A\u0430. \u041C\u0438 \u043D\u0435 \u043F\u043E\u0434\u0430\u0454\u043C\u043E \u0437\u0432\u0456\u0442\u0438 \u0439 \u043D\u0435 \u043C\u0430\u0454\u043C\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u0443 \u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432. \u26A0\uFE0F \u0414\u0430\u0442\u0438 \u0439 \u0441\u0443\u043C\u0438 \u043E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u0456 \u2014 \u0437\u0432\u0456\u0440\u0442\u0435 \u0437 \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u043E\u043C.</div>
      <div class="kv"><span>\u0424\u043E\u0440\u043C\u0430</span><button class="btn sm ${T2.kind ? "primary" : ""}" data-tx="kind">${esc(R.kinds[T2.kind] || "\u041D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E")}</button></div>
      ${T2.kind === "tov" ? `<div class="kv"><span>\u041F\u043B\u0430\u0442\u043D\u0438\u043A \u041F\u0414\u0412</span><span class="switch press ${T2.pdv ? "on" : ""}" data-txs="pdv" role="switch" aria-checked="${T2.pdv ? "true" : "false"}"></span></div>` : ""}
      ${T2.pdv ? `<div class="kv"><span>\u{1F9FE} \u0420\u0435\u043A\u0432\u0456\u0437\u0438\u0442\u0438 \u0434\u043B\u044F \u043F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u0438\u0445 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 (M.E.Doc)<br><small class="muted">${T2.pn ? esc(T2.pn.n) + " \xB7 \u0406\u041F\u041D " + esc(T2.pn.ipn) : "\u043D\u0435 \u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u043E \u2014 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0456 \u0434\u043B\u044F \u0432\u0438\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u041F\u041D \u0443 \u{1F4CA} \u0417\u0432\u0456\u0442\u0438 \u2192 \u{1F4E4} \u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0443"}</small></span><button class="btn sm" data-tx="pn">\u270F\uFE0F</button></div>` : ""}
      ${T2.kind ? `<div class="kv"><span>\u{1F514} \u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u0432 Telegram</span><span class="switch press ${T2.on ? "on" : ""}" data-txs="on" role="switch" aria-checked="${T2.on ? "true" : "false"}"></span></div>
      <div class="kv"><span>\u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u0442\u0438 \u0437\u0430 (\u0434\u043D\u0456\u0432)</span><button class="btn sm" data-tx="lead">${T2.lead}</button></div>
      <div class="kv"><span>\u0421\u0442\u0430\u0432\u043A\u0438 \u0439 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0438</span><button class="btn sm" data-tx="rates">\u270F\uFE0F \u0417\u043C\u0456\u043D\u0438\u0442\u0438</button></div>
      <h3 class="muted" style="margin:14px 0 6px;font-size:14px">\u041D\u0430\u0439\u0431\u043B\u0438\u0436\u0447\u0456 \u0441\u0442\u0440\u043E\u043A\u0438</h3>
      ${R.list.map((e) => `<div class="kv" style="${e.done ? "opacity:.5" : ""}"><span>${esc(e.title)}<br><small class="muted">${dm2(e.d)} \xB7 ${e.left < 0 ? "\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E" : e.left === 0 ? "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : "\u0447\u0435\u0440\u0435\u0437 " + e.left + " \u0434\u043D."}${e.amt ? " \xB7 \u2248 " + money(e.amt) : ""}</small></span><button class="btn sm ${e.done ? "" : "primary"}" data-tx="done" data-k="${esc(e.key)}" data-v="${e.done ? 0 : 1}">${e.done ? "\u21A9\uFE0F" : "\u2705 \u0413\u043E\u0442\u043E\u0432\u043E"}</button></div>`).join("") || '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u0441\u0442\u0440\u043E\u043A\u0456\u0432 \u043D\u0430\u0439\u0431\u043B\u0438\u0436\u0447\u0438\u043C \u0447\u0430\u0441\u043E\u043C</div>'}
      <div class="btnrow" style="margin-top:10px"><a class="btn sm" href="${esc(R.link)}" target="_blank" rel="noopener">\u{1F517} \u041A\u0430\u0431\u0456\u043D\u0435\u0442 \u043F\u043B\u0430\u0442\u043D\u0438\u043A\u0430 \u043F\u043E\u0434\u0430\u0442\u043A\u0456\u0432</a></div>` : ""}</div>`;
  }
  async function taxDo(b, msg) {
    const r = await act("taxSet", b, msg || "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (r) S.txR = r;
    renderMain();
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("button[data-tx]");
    if (!el || !S.txR) return;
    const R = S.txR, T2 = R.tax, a = el.dataset.tx;
    if (a === "kind") {
      const k = await choose("\u0424\u043E\u0440\u043C\u0430 \u043E\u043F\u043E\u0434\u0430\u0442\u043A\u0443\u0432\u0430\u043D\u043D\u044F", "\u0412\u0456\u0434 \u043D\u0435\u0457 \u0437\u0430\u043B\u0435\u0436\u0430\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0438 \u0439 \u043F\u043B\u0430\u0442\u0435\u0436\u0456", [...Object.entries(R.kinds).map(([val, label]) => ({ label, val })), { label: "\u{1F6AB} \u041D\u0435 \u0432\u0435\u0441\u0442\u0438", val: "-" }]);
      if (k) await taxDo({ kind: k === "-" ? "" : k });
    } else if (a === "lead") {
      const v = await askVal("\u0417\u0430 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0434\u043D\u0456\u0432 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u0442\u0438 (0\u201330)", String(T2.lead), "number");
      if (v != null && v !== "") await taxDo({ lead: +v });
    } else if (a === "rates") {
      const b = {};
      for (const [k, l] of Object.entries(TXR)) {
        const v = await askVal(l, String(T2.rates[k]), "number");
        if (v == null) return;
        if (v !== "") b[k] = +v;
      }
      await taxDo({ rates: b });
    } else if (a === "pn") {
      const P = T2.pn || {}, b = {};
      for (const [k, l] of [["n", "\u041F\u0440\u043E\u0434\u0430\u0432\u0435\u0446\u044C (\u043F\u043E\u0432\u043D\u0430 \u043D\u0430\u0437\u0432\u0430 \u0422\u041E\u0412 / \u0424\u041E\u041F)"], ["tin", "\u0404\u0414\u0420\u041F\u041E\u0423 (8 \u0446\u0438\u0444\u0440) \u0430\u0431\u043E \u0420\u041D\u041E\u041A\u041F\u041F \u0424\u041E\u041F (10 \u0446\u0438\u0444\u0440)"], ["ipn", "\u0406\u041F\u041D \u043F\u043B\u0430\u0442\u043D\u0438\u043A\u0430 \u041F\u0414\u0412 (12 \u0446\u0438\u0444\u0440)"], ["sti", "\u041A\u043E\u0434 \u043F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u043E\u0457 (\u0414\u041F\u0406), 4 \u0446\u0438\u0444\u0440\u0438 \u2014 \u043D\u0430\u043F\u0440. 2655"], ["boss", "\u041F\u043E\u0441\u0430\u0434\u043E\u0432\u0430 \u043E\u0441\u043E\u0431\u0430, \u0449\u043E \u043F\u0456\u0434\u043F\u0438\u0441\u0443\u0454 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)"], ["bossN", "\u0420\u041D\u041E\u041A\u041F\u041F \u043F\u043E\u0441\u0430\u0434\u043E\u0432\u043E\u0457 \u043E\u0441\u043E\u0431\u0438 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)"]]) {
        const v = await askVal(l, P[k] || "");
        if (v == null) return;
        b[k] = v;
      }
      await taxDo({ pn: b });
    } else if (a === "done") {
      const r = await act("taxDone", { key: el.dataset.k, v: +el.dataset.v }, el.dataset.v === "1" ? "\u2705 \u041F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u043E" : "\u21A9\uFE0F \u0417\u043D\u044F\u0442\u043E");
      if (r) S.txR = r;
      renderMain();
    }
  });
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-txs]");
    if (!el || !S.txR) return;
    const k = el.dataset.txs, on2 = S.txR.tax[k] ? 0 : 1;
    el.classList.toggle("on", !!on2);
    await taxDo({ [k]: on2 });
  });
  function incCard() {
    if (!isAdmin() || !modOn("tax")) return "";
    const R = S.incR, mn = (m) => (/* @__PURE__ */ new Date(m + "-15T12:00:00")).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
    const hd = (m) => `<div class="card" style="margin-top:12px"><h3>\u{1F4D2} \u041A\u043D\u0438\u0433\u0430 \u0434\u043E\u0445\u043E\u0434\u0456\u0432${m ? " \xB7 " + esc(mn(m)) : ""}</h3>`;
    if (!R) {
      if (!S.incL) {
        S.incL = 1;
        api("incGet", { m: S.incM || "" }).then((r) => {
          S.incR = r;
          S.incL = 0;
          renderMain();
        }).catch(() => {
          S.incL = 0;
        });
      }
      return hd("") + '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div></div>';
    }
    const t = R.t, s = R.sum, dm2 = (d) => d.slice(8) + "." + d.slice(5, 7), now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const bar = (p, l) => `<div style="margin:6px 0 10px"><div class="muted" style="font-size:12px;margin-bottom:4px">${l}</div><div style="height:8px;border-radius:4px;background:var(--line,#333);overflow:hidden"><div style="height:100%;width:${Math.min(100, p)}%;background:${p >= 95 ? "var(--red)" : p >= 80 ? "var(--orange,#e9a23b)" : "var(--accent)"}"></div></div></div>`;
    const part = (r) => [r.cert ? "\u{1F381} " + money(r.cert) : "", r.dep ? "\u{1F4B0} " + money(r.dep) : "", r.oth ? "\u{1F4BC} " + money(r.oth) : ""].filter(Boolean).join(" \xB7 ");
    return hd(R.m) + `<div class="btns" style="margin-bottom:8px"><button class="btn sm" data-inc="m" data-v="-1">\u2039</button><button class="btn sm" data-inc="m" data-v="1" ${R.m >= now ? "disabled" : ""}>\u203A</button><button class="btn sm primary" data-inc="add">\u2795 \u0406\u043D\u0448\u0438\u0439 \u0434\u043E\u0445\u0456\u0434</button></div>
      <div class="muted" style="font-size:12px;margin-bottom:8px">\u0414\u043E\u0445\u0456\u0434 \u2014 \u0443 \u0434\u0435\u043D\u044C, \u043A\u043E\u043B\u0438 \u043D\u0430\u0434\u0456\u0439\u0448\u043B\u0438 \u0433\u0440\u043E\u0448\u0456: \u0447\u0435\u043A\u0438 \u0431\u0435\u0437 \u0447\u0430\u0439\u043E\u0432\u0438\u0445 (\u043A\u0430\u0440\u0442\u043A\u0430 \u0439 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438 \u2014 \u0443 \u0434\u0435\u043D\u044C \u043F\u0440\u043E\u0434\u0430\u0436\u0443), \u043F\u0440\u043E\u0434\u0430\u0436 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0456\u0432, \u043F\u0435\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0438 \u0439 \u0456\u043D\u0448\u0438\u0439 \u0434\u043E\u0445\u0456\u0434. \u0427\u0430\u0439\u043E\u0432\u0456, \u0432\u043D\u0435\u0441\u0435\u043D\u043D\u044F, \u0432\u043B\u0430\u0441\u043D\u0456 \u043F\u0435\u0440\u0435\u043A\u0430\u0437\u0438 \u0439 \u043F\u043E\u0437\u0438\u043A\u0438 \u2014 \u043D\u0435 \u0434\u043E\u0445\u0456\u0434. \u26A0\uFE0F \u041E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u043E \u2014 \u0437\u0432\u0456\u0440\u0442\u0435 \u0437 \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u043E\u043C.</div>
      <div class="widgets">${[["\u{1F9FE} \u041F\u0440\u043E\u0434\u0430\u0436\u0456", money(t.sale)], ["\u{1F381} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", money(t.cert)], ["\u{1F4B0} \u041F\u0435\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0438", money(t.dep)], ["\u{1F4BC} \u0406\u043D\u0448\u0438\u0439", money(t.oth)], ["\u{1F4D2} \u0420\u0430\u0437\u043E\u043C \u0437\u0430 \u043C\u0456\u0441\u044F\u0446\u044C", money(t.tot)], [`\u{1F4CA} \u0417 \u043F\u043E\u0447\u0430\u0442\u043A\u0443 ${s.y}`, money(s.ytd)]].map(([l, v]) => `<div class="widget"><span>${l}</span><b class="money">${v}</b></div>`).join("")}</div>
      ${s.lim ? bar(s.limPct, `\u041B\u0456\u043C\u0456\u0442 ${esc(s.kind.slice(3))} \u0433\u0440\u0443\u043F\u0438 \u0404\u041F: ${money(s.ytd)} \u0437 ${money(s.lim)} \xB7 ${s.limPct}%`) : ""}
      ${s.pdv ? "" : bar(s.pdvPct, `\u041F\u043E\u0440\u0456\u0433 \u041F\u0414\u0412 \u0437\u0430 12 \u043C\u0456\u0441. (${dm2(s.from + "-01").slice(3)}\u2013\u0437\u0430\u0440\u0430\u0437): ${money(s.roll)} \u0437 1 000 000 \u20B4 \xB7 ${s.pdvPct}%${s.pdvPct >= 100 ? " \u2014 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0430 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u043F\u043B\u0430\u0442\u043D\u0438\u043A\u043E\u043C \u041F\u0414\u0412" : ""}`)}
      ${R.bankQ.n ? `<div class="kv" style="color:var(--red)"><span>\u26A0\uFE0F \u041D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u043D\u0430\u0434\u0456\u0439\u0448\u043B\u043E ${R.bankQ.n} \u043E\u043F. \u043D\u0430 ${money(R.bankQ.sum)}, \u0449\u0435 \u043D\u0435 \u0440\u043E\u0437\u0456\u0431\u0440\u0430\u043D\u043E \u2014 \u{1F4B0} \u041A\u0430\u0441\u0430 \u2192 \u{1F3E6} \u0411\u0430\u043D\u043A: \xAB\u{1F4D2} \u0426\u0435 \u0434\u043E\u0445\u0456\u0434\xBB \u0447\u0438 \u0456\u043D\u0448\u0435</span></div>` : ""}
      ${R.other.length ? `<h3 class="muted" style="margin:12px 0 6px;font-size:14px">\u{1F4BC} \u0406\u043D\u0448\u0438\u0439 \u0434\u043E\u0445\u0456\u0434</h3>${R.other.map((x) => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${dm2(x.d)} \xB7 ${esc(R.cats[x.cat] || x.cat)}${x.note ? `<br><small class="muted">${esc(x.note)}</small>` : ""}</span><span style="display:flex;gap:6px;align-items:center"><b class="money">${money(x.sum)}</b>${x.bank ? '<small class="muted">\u{1F3E6}</small>' : `<button class="btn sm" data-inc="del" data-id="${esc(x.id)}" aria-label="\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438">\u2715</button>`}</span></div>`).join("")}` : ""}
      <details style="margin-top:10px"><summary>\u041F\u043E \u0434\u043D\u044F\u0445 \xB7 ${R.days.length}</summary>${R.days.map((r) => `<div class="kv"><span>${dm2(r.d)}${r.n ? ` \xB7 \u0447\u0435\u043A\u0456\u0432 ${r.n}` : ""}${part(r) ? `<br><small class="muted">\u{1F9FE} ${money(r.sale)} \xB7 ${part(r)}</small>` : ""}</span><b class="money">${money(r.tot)}</b></div>`).join("") || '<div class="muted">\u0414\u043E\u0445\u043E\u0434\u0443 \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u044F\u0446\u044F \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</div>'}</details></div>`;
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("button[data-inc]");
    if (!el || !S.incR) return;
    const a = el.dataset.inc;
    if (a === "m") {
      const [y, m] = S.incR.m.split("-").map(Number), t = y * 12 + m - 1 + +el.dataset.v;
      S.incM = `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`;
      S.incR = null;
      renderMain();
      return;
    }
    if (a === "del") {
      if (!await confirmBox("\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0446\u0435\u0439 \u0434\u043E\u0445\u0456\u0434 \u0437 \u043A\u043D\u0438\u0433\u0438?")) return;
      const r = await act("incDel", { id: el.dataset.id }, "\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
      if (r) {
        S.incR = r;
        renderMain();
      }
      return;
    }
    if (a === "add") {
      const sum = await askVal("\u0421\u0443\u043C\u0430, \u20B4", "", "number");
      if (!sum) return;
      const cat = await choose("\u{1F4BC} \u0429\u043E \u0446\u0435 \u0437\u0430 \u0434\u043E\u0445\u0456\u0434?", "\u0427\u0435\u043A\u0438, \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438 \u0439 \u043F\u0435\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0438 \u043A\u0430\u0441\u0430 \u0440\u0430\u0445\u0443\u0454 \u0441\u0430\u043C\u0430", Object.entries(S.incR.cats).map(([val, label]) => ({ label, val })));
      if (!cat) return;
      const note = await askVal("\u0412\u0456\u0434 \u043A\u043E\u0433\u043E / \u0437\u0430 \u0449\u043E (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)", "");
      if (note == null) return;
      const d = await askVal("\u0414\u0430\u0442\u0430 \u043D\u0430\u0434\u0445\u043E\u0434\u0436\u0435\u043D\u043D\u044F (\u0420\u0420\u0420\u0420-\u041C\u041C-\u0414\u0414)", (/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE", { timeZone: "Europe/Kyiv" }));
      if (!d) return;
      const r = await act("incAdd", { sum: +String(sum).replace(",", "."), cat, note, d }, "\u{1F4D2} \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
      if (r) {
        S.incR = r;
        S.incM = r.m;
        renderMain();
      }
    }
  });
  function prnCard() {
    if (!isAdmin() || !window.PRN) return "";
    if (!S.prnR) {
      if (!S.prnL) {
        S.prnL = 1;
        api("rcptGet", {}).then((r) => {
          S.prnR = { route: r.route || { st: [] }, dev: r.dev };
          renderMain();
        }).catch(() => {
          S.prnL = 0;
        });
      }
      return '<div class="card" style="margin-top:12px"><h3>\u{1F5A8} \u0429\u043E \u043D\u0430 \u044F\u043A\u0438\u0439 \u043F\u0440\u0438\u043D\u0442\u0435\u0440</h3><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div></div>';
    }
    return `<div class="card" style="margin-top:12px"><h3>\u{1F5A8} \u0429\u043E \u043D\u0430 \u044F\u043A\u0438\u0439 \u043F\u0440\u0438\u043D\u0442\u0435\u0440</h3>${PRN.html(S.prnR.route, S.prnR.dev, S.prnR.dirty)}</div>${window.TABP ? `<div class="card" style="margin-top:12px"><h3>\u{1F4F1} \u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u0446\u044C\u043E\u0433\u043E \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0430</h3>${TABP.html()}</div>` : ""}`;
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-tp]");
    if (!el || !window.TABP) return;
    el.disabled = true;
    await TABP.click(el.dataset.tp);
    el.disabled = false;
    S.prnR = null;
    S.prnL = 0;
    renderMain();
  });
  const prnDo = async (el) => {
    const P = S.prnR;
    if (!P) return;
    P.route = { st: (P.route.st || []).map((x) => __spreadValues({}, x)) };
    const r = PRN.apply(el, P.route);
    if (r === "save") {
      const x = await act("printRoute", P.route, "\u{1F5A8} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u2014 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0434\u0440\u0443\u043A\u0443 \u043F\u0456\u0434\u0445\u043E\u043F\u0438\u0442\u044C \u0437\u0430 \u043A\u0456\u043B\u044C\u043A\u0430 \u0445\u0432\u0438\u043B\u0438\u043D");
      if (x) {
        P.route = x.route;
        P.dirty = 0;
      }
    } else if (r) P.dirty = 1;
    renderMain();
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button[data-prn]");
    if (el) prnDo(el);
  });
  document.addEventListener("change", (e) => {
    var _a2;
    if ((_a2 = e.target.dataset) == null ? void 0 : _a2.prn) prnDo(e.target);
  });
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>\u041C\u0435\u043D\u044E</h1></div><div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    return `<div class="head"><h1>\u041C\u0435\u043D\u044E</h1><button class="btn" data-a="menuUndo">\u21A9\uFE0F \u0412\u0456\u0434\u043C\u0456\u043D\u0438\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443</button><button class="btn" data-a="catAdd">\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B</button><button class="btn" data-a="phPanel">\u{1F4F8} \u0428\u0406-\u0444\u043E\u0442\u043E</button><button class="btn primary" data-a="menuEdit" data-id="">\u2795 \u041D\u043E\u0432\u0430 \u0441\u0442\u0440\u0430\u0432\u0430</button></div>
      <div class="muted" style="font-size:13px;margin:4px 4px 0">\u{1F4C2} \u0411\u0456\u043B\u044F \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0440\u043E\u0437\u0434\u0456\u043B\u0443 \u2014 \u043A\u0443\u0434\u0438 \u0439\u0434\u0443\u0442\u044C \u0439\u043E\u0433\u043E \u0441\u0442\u0440\u0430\u0432\u0438: \u{1F373} \u043A\u0443\u0445\u043D\u044F (\u0431\u0456\u0433\u0443\u043D\u043E\u043A \u0456 \u0435\u043A\u0440\u0430\u043D \u043A\u0443\u0445\u043D\u0456, \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0430 \xAB\u0437 \u0441\u043E\u0431\u043E\u044E\xBB) / \u{1F379} \u0431\u0430\u0440 / \u{1F4A8} \u043A\u0430\u043B\u044C\u044F\u043D.</div>
      ${S.menu.categories.map((c) => `<div class="btnrow" style="margin:18px 4px 8px;align-items:center;flex-wrap:wrap"><h3 class="muted catH" style="margin:0;flex:1;min-width:0">${esc(c.name.uk)}</h3>${c.tech ? '<span class="muted" style="font-size:12px">\u2699\uFE0F \u0442\u0435\u0445\u043D\u0456\u0447\u043D\u0438\u0439</span>' : `<button class="btn sm" data-a="catG" data-id="${c.id}" title="\u041A\u0443\u0434\u0438 \u0439\u0434\u0443\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0440\u043E\u0437\u0434\u0456\u043B\u0443">${{ kitchen: "\u{1F373} \u041A\u0443\u0445\u043D\u044F", bar: "\u{1F379} \u0411\u0430\u0440", hookah: "\u{1F4A8} \u041A\u0430\u043B\u044C\u044F\u043D" }[c.g] || "\u{1F373} \u041A\u0443\u0445\u043D\u044F"}</button>${c.g === "kitchen" ? `<button class="btn sm" data-a="catPack" data-id="${c.id}">${c.nopack ? "\u{1F6AB} \u0411\u0435\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438" : "\u{1F961} \u0417 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u043E\u044E"}</button>` : ""}`}</div><div class="grid2">${c.items.map((i) => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? " \u26D4" : ""}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map((v) => `${v.v} \u2014 ${v.p}`).join(" / ") : i.price + " \u20B4"}${i.size && !i.variants ? " \xB7 " + esc(i.size) : ""}</div></div>\u203A</button>`).join("")}</div>`).join("")}`;
  }
  function lookHTML() {
    const L = look(), opt = (k, v, l) => `<button class="lk-o${L[k] == v ? " on" : ""}" data-a="look" data-k="${k}" data-v="${v}">${l}</button>`;
    const st = VVSkin.studio(__spreadProps(__spreadValues({
      venue: S.lookV,
      dev: lookDev(),
      canVenue: isAdmin(),
      scope: S.lookScope
    }, isAdmin() ? {} : { note: "\u0412\u0430\u0448 \u043A\u043E\u043B\u0456\u0440 \u0456 \u0441\u0442\u0438\u043B\u044C \u2014 \u043B\u0438\u0448\u0435 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457. \u0406\u043D\u0448\u0456 \u0431\u0430\u0447\u0430\u0442\u044C \u0432\u0438\u0433\u043B\u044F\u0434 \u0437\u0430\u043A\u043B\u0430\u0434\u0443." }), {
      open: S.lookOpen,
      toast,
      ask: (t, ph) => ask(t, ph),
      onScope: (v) => {
        S.lookScope = v;
      },
      rerender: renderMain,
      setVenue: (l) => {
        S.lookV = l;
        S.lookScope = "venue";
        applyLook();
      },
      saveVenue: (l) => api("lookVSet", { look: l }),
      setDev: (d) => {
        const { own, sk, ct, ca } = d;
        store.set("look", __spreadValues(__spreadProps(__spreadValues({}, look()), { own }), own ? { sk, theme: ct || "", accent: ca || "" } : { sk: void 0, theme: "night", accent: "" }));
        applyLook();
      }
    }));
    setTimeout(pushSwSync, 0);
    return `<div class="grid2 set"><div class="card" style="grid-column:1/-1"><h3>\u{1F3A8} \u0421\u0442\u0443\u0434\u0456\u044F \u0432\u0438\u0433\u043B\u044F\u0434\u0443</h3>${st}</div>
      <div class="card"><h3>\u{1F4F1} \u0426\u0435\u0439 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439</h3><div class="kv" id="pushRow" style="cursor:pointer"><span style="min-width:0">\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0432 \u0448\u0442\u043E\u0440\u043A\u0443</span><span class="switch" id="pushSw"></span></div>${isAdmin() ? `<div class="kv" id="pushAllRow" style="cursor:pointer"><span style="min-width:0">\u{1F451} \u0423\u0441\u0456 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F \u0437\u0430\u043A\u043B\u0430\u0434\u0443<br><span class="muted" style="font-size:12px">\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F, \u0432\u0438\u043A\u043B\u0438\u043A\u0438, \u0440\u0430\u0445\u0443\u043D\u043A\u0438, \xAB\u0433\u043E\u0442\u043E\u0432\u043E\xBB, \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438, \u0431\u0440\u043E\u043D\u0456, \u043E\u043F\u043B\u0430\u0442\u0438, \u0447\u0430\u0442 \u2014 \u043D\u0430\u0432\u0456\u0442\u044C \u043D\u0435 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456</span></span><span class="switch" id="pushAllSw"></span></div>` : ""}<div class="set-note muted">\u0420\u043E\u0437\u043C\u0456\u0440</div><div class="lk-row">${[85, 92, 100, 110, 120].map((z) => opt("size", z, z === 100 ? "\u0417\u0432\u0438\u0447\u0430\u0439\u043D\u0438\u0439" : z + "%")).join("")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0410\u043D\u0456\u043C\u0430\u0446\u0456\u0457</div><div class="lk-row">${opt("anim", 1, "\u2728 \u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u0456")}${opt("anim", 0, "\u26A1 \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u0456 (\u0448\u0432\u0438\u0434\u0448\u0435 \u043D\u0430 \u0441\u043B\u0430\u0431\u043A\u0438\u0445)")}</div>
        <div class="btnrow" style="margin-top:12px"><button class="btn sm" data-a="lookReset">\u21BA \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439 \u0434\u043E \u0432\u0438\u0433\u043B\u044F\u0434\u0443 \u0437\u0430\u043A\u043B\u0430\u0434\u0443</button></div></div>
      <div class="card"><h3>\u{1F50A} \u0417\u0432\u0443\u043A \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u044C</h3><div class="lk-row">${Object.entries(SOUNDS).map(([k, [l]]) => opt("sound", k, (k === "off" ? "\u{1F507} " : "\u25B6 ") + l)).join("")}</div>
        <div class="set-note muted" style="margin-top:10px">\u0413\u0443\u0447\u043D\u0456\u0441\u0442\u044C</div><div class="lk-row">${[30, 50, 70, 100].map((v) => opt("vol", v, v + "%")).join("")}</div></div></div>`;
  }
  function settingsHTML(only) {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const st = S.data.staff, wf = S.data.wifi, c = (st == null ? void 0 : st.cfg) || {};
    const ROLE = { admin: "\u{1F510} \u0430\u0434\u043C\u0456\u043D", cook: "\u{1F468}\u200D\u{1F373} \u043A\u0443\u0445\u0430\u0440", courier: "\u{1F6F5} \u043A\u0443\u0440'\u0454\u0440", waiter: "\u{1F9D1}\u200D\u{1F373} \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442" };
    const row = (l, v, btn, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ""}</span><span class="kv-r"><b>${v}</b>${btn}</span></div>`;
    const ch = (a, extra = "") => `<button class="btn sm" data-a="${a}"${extra}>\u0437\u043C\u0456\u043D\u0438\u0442\u0438</button>`;
    const staff = st ? [...st.staff].sort((a, b) => (a.role || "").localeCompare(b.role || "") || a.name.localeCompare(b.name)) : null;
    const OWN = ["test"], SS = [["rules", "\u2699\uFE0F \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438"], ["go", "\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430"], ["loy", "\u{1F381} \u041B\u043E\u044F\u043B\u044C\u043D\u0456\u0441\u0442\u044C"], ["look", "\u{1F3A8} \u0412\u0438\u0433\u043B\u044F\u0434"], ["printer", "\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440"], ["test", "\u{1F9EA} \u0422\u0435\u0441\u0442"]].filter(([k]) => !OWN.includes(k) || S.setTab === k), cur = only || ((SS0) => SS0.includes(S.setTab) ? S.setTab : "rules")(["rules", "go", "loy", "look", "printer", "test"]);
    const part = {};
    part.people = `<div class="grid2 set">
      ${[["admin", "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0438"], ["waiter", "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0438"], ["cook", "\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F"], ["courier", "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440\u0438"]].map(([r, t]) => {
      const l = staff ? staff.filter((s) => (ROLE[s.role] ? s.role : "waiter") === r) : null;
      return `<div class="card"><h3>${t} <span class="muted">\xB7 ${l ? l.length : "\u2026"}</span></h3>
        <div class="scrollbox">${l ? l.map((s) => `<div class="kv stf-row"><span class="stf-n">${esc(s.name)}${s.nopin ? ' <small style="color:var(--red)" title="\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u0431\u0435\u0437 PIN \u2014 \u0443\u0432\u0456\u0439\u0442\u0438 \u043D\u0435 \u0437\u043C\u043E\u0436\u0435, \u0434\u043E\u043A\u0438 \u043D\u0435 \u0437\u0430\u0434\u0430\u0441\u0442\u0435">\xB7 \u{1F511} \u0437\u0430\u0434\u0430\u0439\u0442\u0435 PIN</small>' : ""}</span><span class="kv-r"><button class="btn sm" data-a="stfName" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0456\u043C\u02BC\u044F">\u270F\uFE0F</button><button class="btn sm" data-a="stfPin" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 PIN">\u{1F511}</button><button class="btn sm" data-a="stfRole" data-id="${s.id}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0440\u043E\u043B\u044C">\u{1F504}</button><button class="btn sm" data-a="stfPerm" data-id="${s.id}" title="\u041F\u0440\u0430\u0432\u0430 (\u0433\u0430\u043B\u043E\u0447\u043A\u0438)">\u{1F6E1}${Object.keys(s.perm || {}).length ? "\u2022" : ""}</button><button class="btn sm red" data-a="staffDel" data-id="${s.id}" title="\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438">\u{1F5D1}</button></span></div>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454</div>' : "\u2026"}</div></div>`;
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
      <div class="card"><h3>\u{1F9E9} \u041C\u043E\u0434\u0443\u043B\u0456</h3><div class="muted set-note">\u041A\u0430\u0441\u0430 \u0439 \u0447\u0435\u043A\u0438 \u043F\u0440\u0430\u0446\u044E\u044E\u0442\u044C \u0437\u0430\u0432\u0436\u0434\u0438. \u0420\u0435\u0448\u0442\u0443 \u0432\u043C\u0438\u043A\u0430\u0439\u0442\u0435, \u043A\u043E\u043B\u0438 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u043E: \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u0438\u0439 \u043C\u043E\u0434\u0443\u043B\u044C \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 \u0432\u043A\u043B\u0430\u0434\u043E\u043A \u0456 \u043D\u0435 \u0448\u043B\u0435 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C.</div>
        ${MODS_UI.map(([k, l, h]) => `<div class="kv press" data-a="modTgl" data-k="${k}"><span>${l}<br><small class="muted">${h}</small></span><span class="switch ${modOn(k) ? "on" : ""}"></span></div>`).join("")}</div>
      ${modOn("agg") ? `<div class="card"><h3>\u{1F6F5} \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438</h3><div class="muted set-note">Glovo, Bolt Food \u0442\u0430 \u0456\u043D\u0448\u0456: \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438 \u043F\u0440\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u0456 \u0441\u0442\u043E\u043B\u0430, \u043A\u043E\u043C\u0456\u0441\u0456\u044F, \u0437\u0432\u0456\u0440\u043A\u0430 \u0432\u0438\u043F\u043B\u0430\u0442 \u0437 \u0431\u0430\u043D\u043A\u043E\u043C.</div><button class="btn sm primary" data-a="aggManage">\u{1F6F5} \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u0442\u0438 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438</button></div>` : ""}
      <div class="card"><h3>\u{1F3DB} \u0417\u0430\u043B\u0438 \u0456 \u0441\u0442\u043E\u043B\u0438</h3>${(() => {
      const H = c.halls || [];
      let a = 1;
      return (H.length ? H.map((h, i) => {
        const f = a;
        a += h.c;
        return `<div class="kv"><span>${h.ic} ${esc(h.n)}<br><small class="muted">${h.c} \u0441\u0442\u043E\u043B. \xB7 \u2116${f}\u2013${a - 1}</small></span><span class="kv-r"><button class="btn sm" data-hs="ed" data-i="${i}">\u270F\uFE0F</button><button class="btn sm" data-hs="up" data-i="${i}" ${i ? "" : "disabled"}>\u2B06\uFE0F</button><button class="btn sm red" data-hs="del" data-i="${i}">\u{1F5D1}</button></span></div>`;
      }).join("") : row("\u{1FA91} \u0421\u0442\u043E\u043B\u0456\u0432 \u0443 \u0437\u0430\u043B\u0456", S.n, ch("cfg", ' data-k="tables"'), "\u041E\u0434\u0438\u043D \u0437\u0430\u043B. \u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u043B\u0438 \u0439 \u0442\u0435\u0440\u0430\u0441\u0438 \u2014 \u043A\u0430\u0441\u0430 \u043F\u043E\u043A\u0430\u0436\u0435 \u043F\u0435\u0440\u0435\u043C\u0438\u043A\u0430\u0447")) + `<button class="btn sm primary" data-hs="add">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 ${H.length ? "\u0437\u0430\u043B / \u0442\u0435\u0440\u0430\u0441\u0443" : "\u0437\u0430\u043B\u0438"}</button><div class="kv press" data-hs="map"><span>\u{1F5FA} \u0421\u0445\u0435\u043C\u0430 \u0437\u0430\u043B\u0443<br><small class="muted">\u0420\u043E\u0437\u0441\u0442\u0430\u0432\u0442\u0435 \u0441\u0442\u043E\u043B\u0438 \u0442\u0430\u043A, \u044F\u043A \u0432\u043E\u043D\u0438 \u0441\u0442\u043E\u044F\u0442\u044C \u043D\u0430\u0441\u043F\u0440\u0430\u0432\u0434\u0456</small></span><span class="muted kv-r" style="white-space:nowrap">\u0440\u043E\u0437\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u203A</span></div><div class="kv press" data-hs="go"><span>\u{1F6F5} \u0417 \u0441\u043E\u0431\u043E\u044E \u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430<br><small class="muted">${["\u0423 \u0437\u0430\u043B\u0456 \u2014 \u0441\u0442\u0440\u0456\u0447\u043A\u043E\u044E \u043D\u0430\u0434 \u0441\u0442\u043E\u043B\u0430\u043C\u0438", "\u041E\u043A\u0440\u0435\u043C\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0417 \u0441\u043E\u0431\u043E\u044E \u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430\xBB", "\u0414\u0432\u0456 \u0432\u043A\u043B\u0430\u0434\u043A\u0438: \xAB\u0417 \u0441\u043E\u0431\u043E\u044E\xBB \u0456 \xAB\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430\xBB"][c.goTabs || 0]}</small></span><span class="muted">\u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u203A</span></div><div class="muted set-note">\u0421\u0442\u043E\u043B\u0438 \u043D\u0443\u043C\u0435\u0440\u0443\u044E\u0442\u044C\u0441\u044F \u043F\u0456\u0434\u0440\u044F\u0434 \u0447\u0435\u0440\u0435\u0437 \u0443\u0441\u0456 \u0437\u0430\u043B\u0438 \u2014 \u043D\u043E\u043C\u0435\u0440\u0438 \u0439 QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0430\u0445 \u043B\u0438\u0448\u0430\u044E\u0442\u044C\u0441\u044F. \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u043E\u0431\u0438\u0440\u0430\u0454 \xAB\u2B50 \u041C\u043E\u0457 \u0437\u0430\u043B\u0438\xBB \u043D\u0430 \u0441\u0432\u043E\u0454\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457.</div>`;
    })()}</div>
      <div class="card"><h3>\u{1F4B0} \u0413\u0440\u043E\u0448\u0456</h3>
        ${row("\u{1F3F7} \u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430", ((_a2 = c.discMax) != null ? _a2 : 20) + "%", ch("cfg", ' data-k="discMax"'), "\u0411\u0456\u043B\u044C\u0448\u0443 \u0437\u043D\u0438\u0436\u043A\u0443 \u0434\u0430\u0454 \u043B\u0438\u0448\u0435 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440")}
        ${row("\u{1F468}\u200D\u{1F373} \u0427\u0430\u0441\u0442\u043A\u0430 \u043A\u0443\u0445\u043D\u0456 \u0432\u0456\u0434 \u0447\u0430\u0439\u043E\u0432\u0438\u0445", ((_b2 = st == null ? void 0 : st.kpct) != null ? _b2 : 20) + "%", ch("kpct"), `\u041F\u043B\u044E\u0441 \xAB\u043F\u043E\u0434\u044F\u043A\u0430 \u043A\u0443\u0445\u043D\u0456\xBB \u0432\u0456\u0434 \u0433\u043E\u0441\u0442\u044F; \u043F\u043E\u0440\u0456\u0432\u043D\u0443 \u043C\u0456\u0436 \u043A\u0443\u0445\u0430\u0440\u044F\u043C\u0438 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456${((_c = st == null ? void 0 : st.cooks) == null ? void 0 : _c.length) ? ` (\u0437\u0430\u0440\u0430\u0437: ${st.cooks.map(esc).join(", ")})` : " (\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0449\u0435 \u043D\u0456\u043A\u043E\u0433\u043E \u2014 \u043F\u0456\u0434\u0435 \u0432 \xAB\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F\xBB)"}`)}</div>
      <div class="card"><h3>\u{1F319} \u0414\u0435\u043D\u044C \u0456 Z-\u0437\u0432\u0456\u0442</h3>
        ${row("\u{1F552} \u0420\u043E\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F \u043E", String((_d = c.dayH) != null ? _d : 3).padStart(2, "0") + ":00", ch("cfg", ' data-k="dayH"'), "\u0427\u0435\u043A\u0438 \u0434\u043E \u0446\u0456\u0454\u0457 \u0433\u043E\u0434\u0438\u043D\u0438 \u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F \u0432 \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0434\u0435\u043D\u044C (0\u20138)")}
      <div class="card"><h3>\u{1F477} \u0417\u043C\u0456\u043D\u0438</h3>
        ${row("\u23F0 \u0417\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0456\u0441\u043B\u044F", ((_e = c.lateMin) != null ? _e : 10) + " \u0445\u0432", ch("cfg", ' data-k="lateMin"'), "\u0412\u0456\u0434 \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E\u0433\u043E \u0447\u0430\u0441\u0443 \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0437\u043C\u0456\u043D\u0438")}
        ${row("\u2796 \u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F", ((_f = c.lateFine) != null ? _f : 0) + " \u20B4", ch("cfg", ' data-k="lateFine"'), "0 \u2014 \u0431\u0435\u0437 \u0448\u0442\u0440\u0430\u0444\u0443; \u0430\u0434\u043C\u0456\u043D \u0432\u0438\u0440\u0456\u0448\u0443\u0454 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u2705 + \u0448\u0442\u0440\u0430\u0444\xBB")}</div>
      <div class="card"><h3>\u{1F4A1} \u0414\u043E\u043F\u0440\u043E\u0434\u0430\u0436</h3><div class="muted set-note">\u0414\u043E \u0441\u0442\u0440\u0430\u0432\u0438 \u2014 \u0449\u043E \u0437\u0430\u043F\u0440\u043E\u043F\u043E\u043D\u0443\u0432\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044E (\u043A\u0430\u0441\u0430, \u0431\u043E\u0442, \u0441\u0430\u0439\u0442). \u0414\u043E \u043F\u0440\u0430\u0432\u0438\u043B \u0434\u043E\u0434\u0430\u044E\u0442\u044C\u0441\u044F \u043F\u0430\u0440\u0438, \u044F\u043A\u0456 \u0433\u043E\u0441\u0442\u0456 \u0439 \u0442\u0430\u043A \u0431\u0435\u0440\u0443\u0442\u044C \u0440\u0430\u0437\u043E\u043C.</div><button class="btn sm" data-a="upsEdit">\u270F\uFE0F \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0434\u043E\u043F\u0440\u043E\u0434\u0430\u0436\u0443</button></div>
      <div class="card"><h3>\u{1F9EE} \u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A</h3>
        ${tg("semiCalc", "\u{1F4D0} \u0421\u043E\u0443\u0441\u0438 \u0439 \u0442\u0456\u0441\u0442\u043E \u2014 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043A\u043E\u043C", "\u0423\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E: \u043F\u0440\u043E\u0434\u0430\u043B\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u2014 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \u0437 \u0440\u0435\u0446\u0435\u043F\u0442\u0443 \u0441\u043E\u0443\u0441\u0443 \u0441\u043F\u0438\u0441\u0443\u044E\u0442\u044C\u0441\u044F \u0441\u0430\u043C\u0456, \u0432\u0430\u0440\u0438\u0442\u0438 \xAB\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443\xBB \u043D\u0435 \u0442\u0440\u0435\u0431\u0430. \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E: \u043E\u0431\u043B\u0456\u043A \u043F\u0430\u0440\u0442\u0456\u044F\u043C\u0438 \u0447\u0435\u0440\u0435\u0437 \xAB\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430\xBB", 1)}
        ${row("\u{1F3AF} \u0426\u0456\u043B\u044C\u043E\u0432\u0438\u0439 \u0444\u0443\u0434\u043A\u043E\u0441\u0442", ((_g = c.foodCost) != null ? _g : 30) + "%", ch("cfg", ' data-k="foodCost"'), "\u0421\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \xF7 \u0446\u0456\u043D\u0430. \u0417\u0430 \u043D\u0438\u043C \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u0441\u0442\u0440\u0430\u0432")}
        ${row("\u{1F3C6} \u041F\u0440\u0435\u043C\u0456\u044F \u0437\u0430 \u0440\u0435\u043A\u043E\u0440\u0434 \u0434\u043D\u044F", ((_h = c.recBonus) != null ? _h : 0) + " \u20B4", ch("cfg", ' data-k="recBonus"'), "\u041A\u043E\u043B\u0438 \u0437\u0430 \u0434\u0435\u043D\u044C \u0437\u0430\u0440\u043E\u0431\u0438\u043B\u0438 \u0431\u0456\u043B\u044C\u0448\u0435, \u043D\u0456\u0436 \u0431\u0443\u0434\u044C-\u043A\u043E\u043B\u0438 \u2014 \u043A\u043E\u0436\u043D\u043E\u043C\u0443 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456 \u0434\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u0435\u043C\u0456\u044F \u0432 \u0417\u041F. 0 \u2014 \u0431\u0435\u0437 \u043F\u0440\u0435\u043C\u0456\u0457")}
        ${row("\u{1F3E6} \u041A\u043E\u043C\u0456\u0441\u0456\u044F \u0431\u0430\u043D\u043A\u0443 \u0437\u0430 \u043A\u0430\u0440\u0442\u0443/\u043E\u043D\u043B\u0430\u0439\u043D", ((_i = c.bankFee) != null ? _i : 0) + "%", ch("cfg", ' data-k="bankFee"'), "\u041D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434 1.3 \u2014 \u0432\u0456\u0434\u043D\u0456\u043C\u0430\u0454\u0442\u044C\u0441\u044F \u0437 \u043F\u0440\u0438\u0431\u0443\u0442\u043A\u0443 \u0437\u0430 \u0431\u0435\u0437\u0433\u043E\u0442\u0456\u0432\u043A\u043E\u0432\u0456 \u043E\u043F\u043B\u0430\u0442\u0438 (\u0437\u0432\u0456\u0442\u0438, \u043A\u0430\u0431\u0456\u043D\u0435\u0442 \u0432\u043B\u0430\u0441\u043D\u0438\u043A\u0430)")}
        ${row("\u{1F53A} \u0421\u043F\u043E\u0432\u0456\u0449\u0430\u0442\u0438 \u043F\u0440\u043E \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0447\u0430\u043D\u043D\u044F \u0432\u0456\u0434", ((_j = c.priceAlert) != null ? _j : 5) + "%", ch("cfg", ' data-k="priceAlert"'), "\u042F\u043A\u0449\u043E \u0432 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456\u0439 \u0446\u0456\u043D\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 \u0432\u0438\u0449\u0430 \u0437\u0430 \u043C\u0438\u043D\u0443\u043B\u0443")}</div>
      <div class="card"><h3>\u{1F4F1} \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u0435\u0439</h3>
        ${row("\u23F1 \u0427\u0430\u0441 \u043D\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0441\u043B\u044F QR", ((_k = c.scanMin) != null ? _k : 60) + " \u0445\u0432", ch("cfg", ' data-k="scanMin"'), "\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0433\u0456\u0441\u0442\u044C \u043C\u043E\u0436\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438 \u043F\u0456\u0441\u043B\u044F \u0441\u043A\u0430\u043D\u0443\u0432\u0430\u043D\u043D\u044F QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456")}
        <div class="muted set-note" style="margin-top:10px">\u{1F4F6} Wi\u2011Fi \u0437\u0430\u043A\u043B\u0430\u0434\u0443 (\u0437\u0430\u043F\u0430\u0441\u043D\u0438\u0439 \u0441\u043F\u043E\u0441\u0456\u0431) \xB7 \u0432\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430: ${esc((wf == null ? void 0 : wf.current) || "\u2026")}</div>
        <div class="scrollbox sm">${wf ? wf.list.map((x) => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString("uk-UA")}</span></div>`).join("") || '<div class="muted">\u043D\u0435\u043C\u0430\u0454 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u0445 \u0430\u0434\u0440\u0435\u0441</div>' : ""}</div>
        <div class="btnrow"><button class="btn sm primary" data-a="wifiAdd">\u2795 \u0426\u0435 \u043D\u0430\u0448\u0430 \u043C\u0435\u0440\u0435\u0436\u0430</button><button class="btn sm red" data-a="wifiClear">\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456</button></div></div></div>`;
    part.go = goSetHTML();
    part.loy = loyHTML();
    part.look = lookHTML();
    part.printer = printerCards() + linksCard();
    part.test = `<div class="grid2 set"><div class="card"><h3>\u{1F9EA} \u0422\u0435\u0441\u0442</h3><div class="muted set-note">\u0422\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E, \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0443.</div><button class="btn sm red" data-a="reset">\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435</button></div></div>`;
    if (only) return part[only];
    return `<div class="rhead"><div><h1>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h1><span class="muted">\u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438, \u043F\u0440\u0438\u043D\u0442\u0435\u0440</span></div><div class="icogrp">${isAdmin() ? `<a class="btn icobtn" href="owner.html${VENUE ? "" : "#pos=" + S.token}" target="_blank" rel="noopener" title="\u041A\u0430\u0431\u0456\u043D\u0435\u0442 \u0432\u043B\u0430\u0441\u043D\u0438\u043A\u0430">\u{1F451}</a>` : ""}<button class="btn icobtn" data-a="zpHelp" title="\u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430">\u{1F198}</button></div></div>
      <div class="seg rsec">${SS.map(([k, l]) => `<button class="${cur === k ? "on" : ""}" data-a="setTab" data-s="${k}">${l}</button>`).join("")}</div>${part[cur]}`;
  }
  async function menuEdit(id) {
    var _a2, _b2, _c, _d;
    const it = itemsAll().find((i) => i.id === id) || null;
    const cat = it ? S.menu.categories.find((c) => c.items.includes(it)).id : S.menu.categories[0].id;
    const body = `<div class="form">
      <label>\u0420\u043E\u0437\u0434\u0456\u043B<select id="fCat">${S.menu.categories.map((c) => `<option value="${c.id}" ${c.id === cat ? "selected" : ""}>${esc(c.name.uk)}</option>`).join("")}</select></label>
      <label>\u041D\u0430\u0437\u0432\u0430<input id="fName" value="${esc((it == null ? void 0 : it.name.uk) || "")}"></label>
      <label>\u041D\u0430\u0437\u0432\u0430 \u0430\u043D\u0433\u043B\u0456\u0439\u0441\u044C\u043A\u043E\u044E (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)<input id="fEn" value="${esc(it && it.name.en !== it.name.uk ? it.name.en : "")}"></label>
      <label>\u0426\u0456\u043D\u0430, \u20B4 ${(it == null ? void 0 : it.variants) ? "" : ""}<input id="fPrice" inputmode="numeric" value="${(_a2 = it == null ? void 0 : it.price) != null ? _a2 : ""}" placeholder="\u043D\u0430\u043F\u0440. 380"></label>
      <label>\u0410\u0431\u043E \u0440\u043E\u0437\u043C\u0456\u0440\u0438 (\u0434\u043B\u044F \u043D\u0430\u043F\u043E\u0457\u0432): <span class="muted">0.33=60, 0.5=70</span><input id="fVar" value="${esc((it == null ? void 0 : it.variants) ? it.variants.map((v2) => `${v2.v}=${v2.p}`).join(", ") : "")}"></label>
      <label>\u0412\u0430\u0433\u0430/\u043E\u0431\u02BC\u0454\u043C<input id="fSize" value="${esc((it == null ? void 0 : it.size) || "")}" placeholder="\u043D\u0430\u043F\u0440. 400 \u0433 \u0430\u0431\u043E \u043B"></label>
      <label>\u0421\u043A\u043B\u0430\u0434<textarea id="fDesc" rows="3">${esc(((_b2 = it == null ? void 0 : it.desc) == null ? void 0 : _b2.uk) || "")}</textarea></label>
      ${it ? `<label>\u0424\u043E\u0442\u043E${it.img ? "" : ' <span class="muted">\u2014 \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</span>'}<img id="fPrev" src="${esc(it.img || "")}" alt="" style="display:${it.img ? "block" : "none"};width:100%;max-width:240px;aspect-ratio:1;object-fit:cover;border-radius:12px;margin:6px 0;background:var(--card2)"><input id="fPhoto" type="file" accept="image/*" onchange="const f=this.files[0],p=document.getElementById('fPrev');if(f&&p){p.src=URL.createObjectURL(f);p.style.display='block'}"></label>` : ""}</div>`;
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
        await phDish(itemsAll().find((i) => i.id === r.id) || { id: r.id, name: { uk: item.name }, img: it == null ? void 0 : it.img }, { data });
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
  const phCtx = () => ({
    menu: S.menu,
    toast,
    vapi: async (op, data) => {
      var _a2;
      try {
        return await api(op, data, op === "photoMake" ? 1e5 : 12e3);
      } catch (e) {
        const x = new Error(((_a2 = e.data) == null ? void 0 : _a2.error) === "pay" ? "pay" : errText(e.message));
        x.data = e.data;
        throw x;
      }
    },
    img: async () => {
      const f = await pickFile();
      return f ? shrink(f) : null;
    },
    onDone: () => loadMenu().catch(() => {
    })
  });
  const phDish = (it, o) => window.PHOTOAI.dish(phCtx(), it, o);
  const phPanel = () => window.PHOTOAI.open(phCtx());
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
  async function hallsSave(halls, go = ((_d) => (_d = ((_c) => (_c = S.data.staff) == null ? void 0 : _c.cfg)() || S.cfg) == null ? void 0 : _d.goTabs)() || 0) {
    const r = await act("hallsSet", { halls, go }, "\u2705 \u0417\u0430\u043B\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (r == null ? void 0 : r.cfg) {
      S.cfg = r.cfg;
      S.n = r.cfg.tables || S.n;
      if (S.data.staff) S.data.staff.cfg = r.cfg;
      renderMain();
    }
  }
  async function hallEdit(h) {
    const n = await askVal("\u041D\u0430\u0437\u0432\u0430 (\u0417\u0430\u043B 1, \u0422\u0435\u0440\u0430\u0441\u0430, VIP\u2026)", (h == null ? void 0 : h.n) || "");
    if (n == null) return null;
    const c = await askVal("\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0441\u0442\u043E\u043B\u0456\u0432", String((h == null ? void 0 : h.c) || 10), "number");
    if (c == null) return null;
    const ic = await choose("\u0417\u043D\u0430\u0447\u043E\u043A", "", ["\u{1FA91}", "\u{1F33F}", "\u{1F378}", "\u{1F6CB}", "\u{1F389}", "\u2600\uFE0F", "\u{1F3E0}", "\u{1F319}"].map((x) => ({ label: x, val: x }))) || (h == null ? void 0 : h.ic) || "\u{1FA91}";
    return { n: n.trim() || "\u0417\u0430\u043B", c: +c, ic };
  }
  document.addEventListener("click", async (ev) => {
    var _a2;
    const el = ev.target.closest("[data-hs]");
    if (!el || !isAdmin()) return;
    const a = el.dataset.hs, i = +el.dataset.i, C = ((_a2 = S.data.staff) == null ? void 0 : _a2.cfg) || S.cfg || {}, H = (C.halls || []).map((h) => __spreadValues({}, h));
    if (a === "add") {
      if (!H.length) H.push({ n: "\u0417\u0430\u043B", ic: "\u{1FA91}", c: S.n });
      const h = await hallEdit({ n: H.length > 1 ? "\u0417\u0430\u043B " + (H.length + 1) : "\u0422\u0435\u0440\u0430\u0441\u0430", c: 8, ic: H.length > 1 ? "\u{1FA91}" : "\u{1F33F}" });
      if (h) {
        H.push(h);
        hallsSave(H);
      }
      return;
    }
    if (a === "ed") {
      const h = await hallEdit(H[i]);
      if (!h) return;
      if (+h.c !== +H[i].c && i < H.length - 1 && !await confirmBox("\u041D\u043E\u043C\u0435\u0440\u0438 \u0441\u0442\u043E\u043B\u0456\u0432 \u0443 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0445 \u0437\u0430\u043B\u0430\u0445 \u0437\u0441\u0443\u043D\u0443\u0442\u044C\u0441\u044F \u2014 \u043D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u0456 QR-\u043A\u043E\u0434\u0438 \u0446\u0438\u0445 \u0441\u0442\u043E\u043B\u0456\u0432 \u0434\u043E\u0432\u0435\u0434\u0435\u0442\u044C\u0441\u044F \u043F\u0435\u0440\u0435\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438. \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438?")) return;
      H[i] = h;
      hallsSave(H);
      return;
    }
    if (a === "up") {
      if (!await confirmBox("\u041D\u043E\u043C\u0435\u0440\u0438 \u0441\u0442\u043E\u043B\u0456\u0432 \u0443 \u0446\u0438\u0445 \u0434\u0432\u043E\u0445 \u0437\u0430\u043B\u0430\u0445 \u0437\u043C\u0456\u043D\u044F\u0442\u044C\u0441\u044F \u2014 \u043D\u0430\u0434\u0440\u0443\u043A\u043E\u0432\u0430\u043D\u0456 QR-\u043A\u043E\u0434\u0438 \u0434\u043E\u0432\u0435\u0434\u0435\u0442\u044C\u0441\u044F \u043F\u0435\u0440\u0435\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438. \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438?")) return;
      [H[i - 1], H[i]] = [H[i], H[i - 1]];
      return hallsSave(H);
    }
    if (a === "del") {
      if (!await confirmBox(`\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \xAB${H[i].n}\xBB? \u0421\u0442\u043E\u043B\u0438 \u0434\u0430\u043B\u0456 \u043F\u0435\u0440\u0435\u043D\u0443\u043C\u0435\u0440\u0443\u044E\u0442\u044C\u0441\u044F.`)) return;
      H.splice(i, 1);
      return hallsSave(H);
    }
    if (a === "map") {
      S.hm = "map";
      store.set("hm", "map");
      S.view = "hall";
      mapStart();
      renderNav();
      renderMain();
      return;
    }
    if (a === "go") {
      const g = await choose("\u{1F6F5} \u0417 \u0441\u043E\u0431\u043E\u044E \u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430", "\u0414\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0432 \u043A\u0430\u0441\u0456", [["0", "\u0423 \u0437\u0430\u043B\u0456 \u2014 \u0441\u0442\u0440\u0456\u0447\u043A\u043E\u044E"], ["1", "\u041E\u0434\u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430"], ["2", "\u0414\u0432\u0456 \u0432\u043A\u043B\u0430\u0434\u043A\u0438"]].map(([v, l]) => ({ label: l, val: v })));
      if (g != null) hallsSave(H, +g);
    }
  });
  on("copyLink", async (el, e, a, t) => {
    try {
      await navigator.clipboard.writeText(el.dataset.u);
      toast("\u{1F517} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E");
    } catch (e2) {
      prompt("\u0421\u043A\u043E\u043F\u0456\u044E\u0439\u0442\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F:", el.dataset.u);
    }
    return;
  });
  on("upsEdit", async (el, e, a, t) => {
    {
      const r = await api("upsGet");
      const v = await askLong("\u{1F4A1} \u0414\u043E\u043F\u0440\u043E\u0434\u0430\u0436 \u2014 \u043A\u043E\u0436\u0435\u043D \u0440\u044F\u0434\u043E\u043A: \u0421\u0442\u0440\u0430\u0432\u0430 \u2192 \u0449\u043E \u0437\u0430\u043F\u0440\u043E\u043F\u043E\u043D\u0443\u0432\u0430\u0442\u0438, \u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0443", r.text || "\u041F\u0456\u0446\u0430 \u041C\u0430\u0440\u0433\u0430\u0440\u0438\u0442\u0430 \u2192 \u041B\u0438\u043C\u043E\u043D\u0430\u0434, \u0421\u043E\u0443\u0441");
      if (v == null) return;
      const x = await act("upsSet", { text: v }, "");
      if (x) {
        S.ups = null;
        toast(`\u{1F4BE} \u041F\u0440\u0430\u0432\u0438\u043B: ${x.n}`);
      }
      return;
    }
  });
  on("setTab", async (el, e, a, t) => {
    S.setTab = el.dataset.s;
    renderMain();
    return;
  });
  on("look", async (el, e, a, t) => {
    {
      const k = el.dataset.k, v = ["size", "vol", "anim"].includes(k) ? +el.dataset.v : el.dataset.v;
      setLook(k, v);
      if (k === "sound" || k === "vol") ding();
      return;
    }
  });
  on("lookReset", async (el, e, a, t) => {
    {
      const _a2 = look(), { own, sk, theme, accent, skin } = _a2, rest = __objRest(_a2, ["own", "sk", "theme", "accent", "skin"]);
      store.set("look", rest);
      applyLook();
      renderMain();
      toast("\u21BA \u042F\u043A \u0443 \u0437\u0430\u043A\u043B\u0430\u0434\u0443");
    }
    return;
  });
  on("stopOff", async (el, e, a, t) => {
    S.stopOff = !S.stopOff;
    renderMain();
    return;
  });
  on("stopT", async (el, e, a, t) => {
    await act("stop", { id: el.dataset.id, hidden: el.dataset.h === "1" });
    return;
  });
  on("pTest", async (el, e, a, t) => {
    act("printTest", {}, "\u{1F5A8} \u0422\u0435\u0441\u0442 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E");
    return;
  });
  on("pQClear", async (el, e, a, t) => {
    if (await confirmBox("\u{1F5D1} \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0441\u044E \u0447\u0435\u0440\u0433\u0443 \u0434\u0440\u0443\u043A\u0443?", "\u0427\u0435\u043A\u0438 \u0439 \u043A\u0443\u0445\u043E\u043D\u043D\u0456 \u043A\u0432\u0438\u0442\u043A\u0438, \u044F\u043A\u0456 \u0449\u0435 \u043D\u0435 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u043B\u0438\u0441\u044C, \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u2014 \u043F\u0440\u0438\u043D\u0442\u0435\u0440 \u0457\u0445 \u043D\u0435 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u0454.")) {
      const r = await act("printClear", {});
      if (r) {
        toast(`\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E: ${r.n}`);
        loadState().catch(() => {
        });
      }
    }
    return;
  });
  on("pQList", async (el, e, a, t) => {
    {
      const r = await act("printQ", {});
      if (!r) return;
      const K = { kitchen: "\u{1F468}\u200D\u{1F373}", receipt: "\u{1F9FE}", test: "\u{1F9EA}", z: "\u{1F4CA}", qr: "\u{1F533}" };
      modal({ title: `\u{1F5A8} \u0427\u0435\u0440\u0433\u0430 \u0434\u0440\u0443\u043A\u0443 (${r.list.length})`, body: `<div class="muted set-note">\u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u0434\u0440\u0443\u043A\u0443\u0454 \u043F\u043E \u0447\u0435\u0440\u0437\u0456. \u042F\u043A\u0449\u043E \u0449\u043E\u0441\u044C \u0437\u0430\u0441\u0442\u0440\u044F\u0433\u043B\u043E \u0430\u0431\u043E \u0432\u0436\u0435 \u043D\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0435 \u2014 \u{1F5D1} (\u0434\u0432\u0456\u0447\u0456).</div>${r.list.map((j) => `<div class="kv" data-pq="${j.id}"><span style="min-width:0;overflow-wrap:anywhere">${K[j.kind] || "\u{1F5A8}"} ${esc(j.txt || j.kind)}<br><small class="muted">${j.at ? hhmm(j.at) : ""}${j.sn ? " \xB7 \u{1F5A8} " + esc(j.sn) : ""}</small></span><span class="kv-r"><button class="btn sm" data-a="pQMove" data-id="${j.id}" title="\u041D\u0430 \u0456\u043D\u0448\u0438\u0439 \u043F\u0440\u0438\u043D\u0442\u0435\u0440">\u{1F501}</button><button class="btn sm red" data-a="pQDel" data-id="${j.id}">\u{1F5D1}</button></span></div>`).join("") || '<div class="muted">\u0427\u0435\u0440\u0433\u0430 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</div>'}`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] }).then(() => loadState().catch(() => {
      }));
      return;
    }
  });
  on("pQr", async (el, e, a, t) => {
    {
      const n = await pickTable("QR \u043C\u0435\u043D\u044E", "\u0423 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0441\u0442\u043E\u043B\u0443 \u0441\u0432\u0456\u0439 QR \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430 \u0446\u0435\u0439 \u0441\u0442\u0456\u043B");
      if (n) act("printQr", { t: n }, `\u{1F5A8} QR \u0441\u0442\u043E\u043B\u0443 ${tn(n)}`);
      return;
    }
  });
  on("menuEdit", async (el, e, a, t) => {
    menuEdit(el.dataset.id);
    return;
  });
  on("phPanel", async (el, e, a, t) => {
    phPanel();
    return;
  });
  on("qrPanel", async (el, e, a, t) => {
    qrPanel();
    return;
  });
  on("catG", async (el, e, a, t) => {
    {
      const c = S.menu.categories.find((x) => x.id === el.dataset.id);
      if (!c) return;
      const g = await choose("\u{1F4C2} " + c.name.uk, "\u041A\u0443\u0434\u0438 \u0439\u0434\u0443\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438 \u0446\u044C\u043E\u0433\u043E \u0440\u043E\u0437\u0434\u0456\u043B\u0443?", [{ label: "\u{1F373} \u041A\u0443\u0445\u043D\u044F", val: "kitchen" }, { label: "\u{1F379} \u0411\u0430\u0440", val: "bar" }, { label: "\u{1F4A8} \u041A\u0430\u043B\u044C\u044F\u043D", val: "hookah" }]);
      if (g && g !== c.g && await act("catSet", { id: c.id, g }, "\u{1F4C2} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) loadMenu().catch(() => {
      });
      return;
    }
  });
  on("catPack", async (el, e, a, t) => {
    {
      const c = S.menu.categories.find((x) => x.id === el.dataset.id);
      if (c && await act("catSet", { id: c.id, nopack: !c.nopack }, c.nopack ? "\u{1F961} \u0423\u043F\u0430\u043A\u043E\u0432\u043A\u0430 \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F" : "\u{1F6AB} \u0411\u0435\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438")) loadMenu().catch(() => {
      });
      return;
    }
  });
  on("catAdd", async (el, e, a, t) => {
    {
      const v = await ask("\u{1F4C2} \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B \u043C\u0435\u043D\u044E", "\u041D\u0430\u0437\u0432\u0430, \u043D\u0430\u043F\u0440. \u0423\u043F\u0430\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
      if (v && await act("catAdd", { name: v }, "\u{1F4C2} \u0420\u043E\u0437\u0434\u0456\u043B \u0434\u043E\u0434\u0430\u043D\u043E \u0432 \u043A\u0456\u043D\u0435\u0446\u044C \u043C\u0435\u043D\u044E")) loadMenu().catch(() => {
      });
      return;
    }
  });
  on("menuUndo", async (el, e, a, t) => {
    if (await confirmBox("\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043E\u0441\u0442\u0430\u043D\u043D\u044E \u0437\u043C\u0456\u043D\u0443 \u043C\u0435\u043D\u044E?")) act("menuUndo", {}, "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
    return;
  });
  on("staffAdd", async (el, e, a, t) => {
    {
      const v = await modal({ title: "\u2795 \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A", body: '<div class="form"><input id="sName" placeholder="\u0406\u043C\u02BC\u044F"><input id="sPin" inputmode="numeric" maxlength="8" placeholder="PIN \u2014 4 \u0446\u0438\u0444\u0440\u0438 (\u0430\u0434\u043C\u0456\u043D \u2014 6\u20138)"></div>', buttons: [{ label: "\u{1F9D1}\u200D\u{1F373} \u041E\u0444\u0456\u0446\u0456\u0430\u043D\u0442", val: "waiter", cls: "primary" }, { label: "\u{1F510} \u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440", val: "admin" }, { label: "\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u0430\u0440", val: "cook" }, { label: "\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440", val: "courier" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
      const name = v && $("#sName").value, p = v && $("#sPin").value;
      closeModal();
      if (v) {
        await act("staffAdd", { name, pin: p, role: v }, "\u{1F465} \u0414\u043E\u0434\u0430\u043D\u043E");
        loadView();
      }
      return;
    }
  });
  const MODS_UI = [
    ["tax", "\u{1F4C5} \u041F\u043E\u0434\u0430\u0442\u043A\u0438", "\u041F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u0438\u0439 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440 \u0456 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u043F\u0440\u043E \u0437\u0432\u0456\u0442\u0438 \u0439 \u043F\u043B\u0430\u0442\u0435\u0436\u0456"],
    ["hr", "\u{1F465} \u041A\u0430\u0434\u0440\u0438 \u0439 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430", "\u0413\u0440\u0430\u0444\u0456\u043A \u0437\u043C\u0456\u043D, \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430, \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u0457 \u0439 \u0435\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u0456\u0441\u0442\u044C \u0443 \xAB\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\xBB"],
    ["agg", "\u{1F6F5} \u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0438 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", "Glovo, Bolt Food: \u043E\u043F\u043B\u0430\u0442\u0430 \xAB\u{1F6F5}\xBB \u043F\u0440\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u0456, \u043E\u043A\u0440\u0435\u043C\u043E \u0432 Z-\u0437\u0432\u0456\u0442\u0456, \u0437\u0432\u0456\u0440\u043A\u0430 \u0432\u0438\u043F\u043B\u0430\u0442 \u0437 \u0431\u0430\u043D\u043A\u043E\u043C"],
    ["acct", "\u{1F4D2} \u041E\u0431\u043B\u0456\u043A", "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0438 \u0439 \u0437\u0432\u0456\u0442\u0438 \u0434\u043B\u044F \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0430 (\u043D\u0430\u043F\u043E\u0432\u043D\u044E\u0454\u0442\u044C\u0441\u044F \u0437 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u043C\u0438 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F\u043C\u0438)"],
    ["mig", "\u{1F501} \u041F\u0435\u0440\u0435\u0445\u0456\u0434 \u0437 \u0456\u043D\u0448\u043E\u0457 \u0441\u0438\u0441\u0442\u0435\u043C\u0438", "\u0406\u043C\u043F\u043E\u0440\u0442 \u0437 1\u0421 / Excel \u2014 \u0443 \u043A\u0430\u0431\u0456\u043D\u0435\u0442\u0456 \u0432\u043B\u0430\u0441\u043D\u0438\u043A\u0430, \u0443 \u0431\u043E\u0442\u0456 /mig"],
    ["bank", "\u{1F3E6} \u0411\u0430\u043D\u043A \u0456 \u0437\u0432\u0456\u0440\u043A\u0430", "\u0412\u0438\u043F\u0438\u0441\u043A\u0438 (1\u0421 / CSV), \u0437\u0432\u0456\u0440\u043A\u0430 \u0437 \u0435\u043A\u0432\u0430\u0439\u0440\u0438\u043D\u0433\u043E\u043C \u0456 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u043C\u0438 \u2014 \u041A\u0430\u0441\u0430 \u2192 \u{1F3E6} \u0411\u0430\u043D\u043A"],
    ["edo", "\u{1F4E8} \u0415\u0414\u041E \u0437 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u043C\u0438", "\u0415\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u0456 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 (\u0441\u043A\u043E\u0440\u043E)"]
  ];
  on("modTgl", async (el, e, a, t) => {
    const k = el.dataset.k;
    if (await act("modSet", { k, v: modOn(k) ? 0 : 1 }, "\u{1F9E9} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) {
      loadView();
      loadState().catch(() => {
      });
    }
  });
  on("cfgTgl", async (el, e, a, t) => {
    var _a2, _b2, _c, _d, _e;
    {
      const k = el.dataset.k, cur = (_e = (_d = (_b2 = (_a2 = S.data.staff) == null ? void 0 : _a2.cfg) == null ? void 0 : _b2[k]) != null ? _d : (_c = S.cfg) == null ? void 0 : _c[k]) != null ? _e : +(el.dataset.def || 0);
      if (await act("cfgSet", { k, v: cur ? 0 : 1 }, "\u2699\uFE0F \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) {
        loadView();
        loadState().catch(() => {
        });
      }
      return;
    }
  });
  on("staffDel", async (el, e, a, t) => {
    if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430?", "\u0419\u043E\u0433\u043E PIN \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435 \u043F\u0440\u0430\u0446\u044E\u0432\u0430\u0442\u0438")) {
      await act("staffDel", { id: el.dataset.id });
      loadView();
    }
    return;
  });
  on("wOut", async (el, e, a, t) => {
    await act("waiterOut", { uid: el.dataset.uid }, "\u0412\u0438\u0439\u0448\u043E\u0432 \u0456\u0437 \u0431\u043E\u0442\u0430");
    loadView();
    return;
  });
  on("wifiAdd", async (el, e, a, t) => {
    await act("wifiAdd", {}, "\u{1F4F6} \u041C\u0435\u0440\u0435\u0436\u0443 \u0434\u043E\u0434\u0430\u043D\u043E");
    loadView();
    return;
  });
  on("wifiClear", async (el, e, a, t) => {
    if (await confirmBox("\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456 \u043C\u0435\u0440\u0435\u0436\u0456?", "\u0413\u043E\u0441\u0442\u0456 \u043D\u0435 \u0437\u043C\u043E\u0436\u0443\u0442\u044C \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u0442\u0438, \u043F\u043E\u043A\u0438 \u043D\u0435 \u0434\u043E\u0434\u0430\u0441\u0442\u0435 \u043C\u0435\u0440\u0435\u0436\u0443")) {
      await act("wifiClear");
      loadView();
    }
    return;
  });
  on("reset", async (el, e, a, t) => {
    if (await confirmBox("\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0438\u0442\u0438 \u0432\u0441\u0435?", "\u0417\u0432\u0456\u0442\u0438, \u043A\u0430\u0441\u0430, \u0437\u0430\u043A\u0440\u0438\u0442\u0456, \u0442\u043E\u043F \u0441\u0442\u0440\u0430\u0432, \u0441\u0442\u0440\u0456\u0447\u043A\u0430 \u0456 \u0412\u0421\u0406 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0456 \u0441\u0442\u043E\u043B\u0438")) {
      if (await confirmBox("\u0422\u043E\u0447\u043D\u043E? \u0426\u0435 \u043D\u0435 \u043C\u043E\u0436\u043D\u0430 \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438.")) {
        await act("reset", {}, "\u267B\uFE0F \u041E\u0431\u043D\u0443\u043B\u0435\u043D\u043E");
        loadView();
      }
    }
    return;
  });
  const LOY_W = { hall: "\u{1FA91} \u0437\u0430\u043B", pick: "\u{1F961} \u0437 \u0441\u043E\u0431\u043E\u044E", del: "\u{1F6F5} \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430" }, LOY_D = ["", "\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u041D\u0434"];
  const bdTxt = (bd) => bd ? `${bd.slice(3)}.${bd.slice(0, 2)}` : "";
  const ruleName = (r) => r.name || ({ cat: `\u2212${r.pct}%`, happy: `\u0429\u0430\u0441\u043B\u0438\u0432\u0456 \u0433\u043E\u0434\u0438\u043D\u0438 \u2212${r.pct}%`, nth: `\u041A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A`, sum: r.gift ? `\u0412\u0456\u0434 ${r.min} \u20B4 \u2014 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A` : `\u0412\u0456\u0434 ${r.min} \u20B4 \u2212${r.pct}%`, bday: `\u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u2212${r.pct}%`, pair: `\u041A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430 \u2212${r.pct}%`, combo: `\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A: ${(r.gifts || []).join(" / ")}`, week: `\u0421\u0442\u0440\u0430\u0432\u0430 \u0442\u0438\u0436\u043D\u044F \u2212${r.pct}%` }[r.type] || "\u0410\u043A\u0446\u0456\u044F");
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
      var _a2, _b2, _c;
      return `<button class="kv press inb${x.open ? " open" : ""}" data-a="gbThread" data-ph="${x.ph}" style="width:100%;text-align:left"><span style="min-width:0;overflow-wrap:anywhere">${x.open ? "\u{1F534} " : ""}<b>${esc(x.name || "\u2014")}</b> <small class="muted">${fmtPh(x.ph)}</small><br><small class="${x.open ? "" : "muted"}">${((_a2 = x.lastMsg) == null ? void 0 : _a2.f) === "s" ? "\u21A9\uFE0F " : ((_b2 = x.lastMsg) == null ? void 0 : _b2.k) === "rev" ? "" : "\u{1F464} "}${esc((((_c = x.lastMsg) == null ? void 0 : _c.text) || "").slice(0, 90))}</small></span><span class="kv-r"><small class="muted">${agoT(x.last)}</small></span></button>`;
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
    const seg = `<div class="seg wrap" style="margin:12px 0">${TABS2.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-a="loyTab" data-s="${k}">${l}</button>`).join("")}${adm ? '<button class="btn sm" data-a="certs">\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438</button>' : ""}</div>`;
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
    if (tab === "rules") body = `${c.on ? "" : '<div class="card muted">\u2139\uFE0F \u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u043B\u043E\u044F\u043B\u044C\u043D\u043E\u0441\u0442\u0456 (\u0440\u0456\u0432\u043D\u0456 \u0439 \u043A\u0435\u0448\u0431\u0435\u043A) \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u0430 \u2014 \u0430\u043A\u0446\u0456\u0457 \u043D\u0438\u0436\u0447\u0435 \u0432\u0441\u0435 \u043E\u0434\u043D\u043E \u0434\u0456\u044E\u0442\u044C.</div>'}<div class="card"><h3>\u26A1 \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u2014 \u0443\u0432\u0456\u043C\u043A\u043D\u0438 \u0433\u0430\u043B\u043E\u0447\u043A\u043E\u044E</h3><div class="muted set-note">\u0421\u0430\u043C\u0456 \u0431'\u044E\u0442\u044C\u0441\u044F \u0432 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 \u0439 \u0447\u0435\u043A\u0443 \u0442\u0430 \u043F\u043E\u043A\u0430\u0437\u0443\u044E\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 \u0437 \u26A1. \u270F\uFE0F \u2014 \u0437\u043C\u0456\u043D\u0438\u0442\u0438.</div>
      <div class="loy-pre">${(D.P || []).map((p) => {
      const r = c.rules.find((x) => x.pre === p.pre);
      return `<div class="kv"><span>${esc(r ? ruleName(r) : p.name)}<br><small class="muted">${esc(r ? ruleWhat(r, D) : p.d)}</small></span><span class="kv-r">${r && adm ? `<button class="btn sm" data-a="loyRule" data-id="${r.id}">\u270F\uFE0F</button>` : ""}${adm ? `<span class="switch ${(r == null ? void 0 : r.on) ? "on" : ""}" data-a="loyPre" data-id="${p.pre}" role="switch"></span>` : `<b>${(r == null ? void 0 : r.on) ? "\u2705" : "\u2014"}</b>`}</span></div>`;
    }).join("")}</div></div>
      <div class="grid2 set">${c.rules.filter((r) => !r.pre).map((r) => `<div class="card"><h3>${r.on ? "" : "\u26D4 "}${esc(ruleName(r))}</h3>
        <div class="kv"><span>${D.T[r.type] || r.type}</span>${adm ? `<span class="switch ${r.on ? "on" : ""}" data-a="loyRuleOn" data-id="${r.id}" role="switch"></span>` : `<b>${r.on ? "\u2705" : "\u26D4"}</b>`}</div>
        <div class="muted set-note">${esc(ruleWhat(r, D))}</div>
        ${adm ? `<div class="btnrow"><button class="btn sm" data-a="loyRule" data-id="${r.id}">\u270F\uFE0F \u0417\u043C\u0456\u043D\u0438\u0442\u0438</button><button class="btn sm red" data-a="loyRuleDel" data-id="${r.id}">\u{1F5D1}</button></div>` : ""}</div>`).join("")}
      <div class="card"><h3>\u2795 \u0421\u0432\u043E\u044F \u0430\u043A\u0446\u0456\u044F</h3><div class="muted set-note">% \u043D\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044E/\u0441\u0442\u0440\u0430\u0432\u0443 \xB7 \u0449\u0430\u0441\u043B\u0438\u0432\u0456 \u0433\u043E\u0434\u0438\u043D\u0438 \xB7 N-\u0442\u0430 \u043A\u0430\u0432\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \xB7 \u0432\u0456\u0434 \u0441\u0443\u043C\u0438 \u2014 \u0437\u043D\u0438\u0436\u043A\u0430 \u0430\u0431\u043E \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \xB7 \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \xB1N \u0434\u043D\u0456\u0432 \xB7 2-\u0433\u0430 \u2212% \xB7 \u0434\u043E \u0441\u0442\u0440\u0430\u0432\u0438 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \xB7 \u0441\u0442\u0440\u0430\u0432\u0430 \u0442\u0438\u0436\u043D\u044F. \u0423\u043C\u043E\u0432\u0438: \u0437\u0430\u043B / \u0437 \u0441\u043E\u0431\u043E\u044E / \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430, \u043F\u0435\u0440\u0456\u043E\u0434 \u0434\u0456\u0457. \u0417\u043D\u0438\u0436\u043A\u0438 \u0440\u0430\u0445\u0443\u0454 \u0441\u0435\u0440\u0432\u0435\u0440 \u0456 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 \u0432 \u0447\u0435\u043A\u0443 \u043D\u0430\u0437\u0432\u043E\u044E \u0430\u043A\u0446\u0456\u0457.</div>
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
    var _a2, _b2, _c, _d, _e, _f;
    const cn = (id) => {
      var _a3;
      return ((_a3 = D.cats.find((c) => c.id === id)) == null ? void 0 : _a3.n) || id;
    }, all = ((_a2 = r.cats) == null ? void 0 : _a2.length) && r.cats.length >= D.cats.length && !((_b2 = r.dishes) == null ? void 0 : _b2.length), what = all ? "" : [...(r.cats || []).map(cn), ...r.dishes || []].join(", ");
    return [
      r.type === "happy" || r.from || ((_c = r.days) == null ? void 0 : _c.length) ? `${((_d = r.days) == null ? void 0 : _d.length) ? r.days.map((d) => LOY_D[d]).join(", ") : "\u0449\u043E\u0434\u043D\u044F"}${r.from ? ` ${r.from}\u2013${r.to}` : ""}` : "",
      r.type === "pair" ? `\u043A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430 \u2212${r.pct}%` : "",
      r.type === "combo" ? `\u{1F381} ${(r.gifts || []).join(" / ")}` : "",
      r.show ? "\u26A1 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456" : "",
      r.type === "nth" ? `\u043A\u043E\u0436\u043D\u0430 ${r.n}-\u0442\u0430` : "",
      r.type === "sum" ? `\u0432\u0456\u0434 ${money(r.min)} \u2192 ${r.gift ? "\u{1F381} " + r.gift : "\u2212" + r.pct + "%"}` : "",
      r.type === "bday" ? `\xB1${(_e = r.bdays) != null ? _e : 3} \u0434\u043D. \u0432\u0456\u0434 \u0414\u041D (\u0434\u0430\u0442\u0430 \u0432 \u043A\u0430\u0440\u0442\u0446\u0456 \u043A\u043B\u0456\u0454\u043D\u0442\u0430)` : "",
      what ? "\u{1F37D} " + what : r.type === "sum" || r.type === "bday" ? "" : "\u{1F37D} \u0443\u0441\u0435 \u043C\u0435\u043D\u044E",
      ((_f = r.where) == null ? void 0 : _f.length) && r.where.length < 3 ? "\u043B\u0438\u0448\u0435 " + r.where.map((w) => LOY_W[w]).join(" ") : "",
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
  async function loyRuleEdit(id, draft) {
    var _a2, _b2;
    const D = S.data.loy, r = draft || D.cfg.rules.find((x) => x.id === id) || { type: "happy", on: 1, pct: 10, where: [], cats: [], dishes: [], days: [], from: "", to: "", n: 5, min: 1e3, bdays: 3 };
    const chk = (name, val, on2, l) => `<label class="chip sm ${on2 ? "on" : ""}" style="display:inline-flex;gap:6px;align-items:center;margin:0 6px 6px 0"><input type="checkbox" name="${name}" value="${val}" ${on2 ? "checked" : ""} style="width:auto;margin:0">${l}</label>`;
    const body = `<div class="form">
      <label>\u0422\u0438\u043F<select id="rT">${Object.entries(D.T).map(([k, l]) => `<option value="${k}" ${r.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>\u041D\u0430\u0437\u0432\u0430 \u0432 \u0447\u0435\u043A\u0443 (\u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E)<input id="rN" value="${esc(r.name || "")}" placeholder="\u043D\u0430\u043F\u0440. \u2615 \u041A\u043E\u0436\u043D\u0430 5-\u0442\u0430 \u043A\u0430\u0432\u0430"></label>
      <label data-f="pct">\u0417\u043D\u0438\u0436\u043A\u0430, %<input id="rP" inputmode="numeric" value="${r.pct || 0}"></label>
      <label data-f="n"><span id="rNl">\u041A\u043E\u0436\u043D\u0430 N-\u0442\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A</span>, N<input id="rNth" inputmode="numeric" value="${r.n || 5}"></label>
      <label data-f="min">\u0412\u0456\u0434 \u0441\u0443\u043C\u0438, \u20B4<input id="rMin" inputmode="numeric" value="${r.min || 1e3}"></label>
      <label data-f="gift">\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u2014 \u0441\u0442\u0440\u0430\u0432\u0430 (\u0437\u0430\u043C\u0456\u0441\u0442\u044C %; \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u0437\u043D\u0438\u0436\u043A\u0430 %)<input id="rGift" list="rDl" value="${esc(r.gift || "")}"></label>
      <label data-f="gifts">\u{1F381} \u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u2014 \u043E\u0434\u043D\u0430 \u0437 \u0441\u0442\u0440\u0430\u0432 (\u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0443)<input id="rGifts" list="rDl" value="${esc((r.gifts || []).join(", "))}" placeholder="\u041F\u0435\u043F\u0441\u0456, \u041B\u0438\u043C\u043E\u043D\u0430\u0434"></label>
      <label data-f="bdays">\u0414\u043D\u0456\u0432 \u0434\u043E/\u043F\u0456\u0441\u043B\u044F \u0414\u041D<input id="rBd" inputmode="numeric" value="${(_a2 = r.bdays) != null ? _a2 : 3}"></label>
      <div data-f="days"><div class="muted set-note">\u0414\u043D\u0456 \u0442\u0438\u0436\u043D\u044F (\u043D\u0456\u0447\u043E\u0433\u043E \u2014 \u0449\u043E\u0434\u043D\u044F)</div>${[1, 2, 3, 4, 5, 6, 7].map((d) => {
      var _a3;
      return chk("rDay", d, (_a3 = r.days) == null ? void 0 : _a3.includes(d), LOY_D[d]);
    }).join("")}
        <div class="srow" data-f="time"><label>\u0417<input id="rF" value="${esc(r.from || "")}" placeholder="15:00"></label><label>\u0414\u043E<input id="rTo" value="${esc(r.to || "")}" placeholder="18:00"></label></div></div>
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
      <label><input type="checkbox" id="rShow" ${r.show ? "checked" : ""} style="width:auto"> \u{1F4E2} \u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044F\u043C (\u0441\u0430\u0439\u0442, \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F)</label>
      <label>\u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u0435\u0439<input id="rDsc" value="${esc(r.d || "")}" placeholder="\u0417\u0430\u043C\u043E\u0432\u043B\u044F\u0454\u0448 2 \u043A\u043E\u043A\u0442\u0435\u0439\u043B\u0456 \u2014 \u043D\u0430 \u0434\u0440\u0443\u0433\u0438\u0439 \u221220%"></label>
      <div class="srow"><label>\u0414\u0456\u0454 \u0437<input id="rD1" type="date" value="${r.d1 || ""}"></label><label>\u043F\u043E<input id="rD2" type="date" value="${r.d2 || ""}"></label></div></div>`;
    const show = () => {
      const t = $("#rT").value, F = { pct: !["nth", "combo"].includes(t), n: ["nth", "pair"].includes(t), min: t === "sum", gift: t === "sum", gifts: t === "combo", bdays: t === "bday", days: ["happy", "pair", "combo", "week"].includes(t), time: ["happy", "pair", "combo"].includes(t), what: ["cat", "happy", "nth", "pair", "combo", "week"].includes(t) };
      $("#rNl").textContent = t === "pair" ? "\u0417\u043D\u0438\u0436\u043A\u0430 \u043D\u0430 \u043A\u043E\u0436\u043D\u0443 N-\u0442\u0443" : "\u041A\u043E\u0436\u043D\u0430 N-\u0442\u0430 \u0432 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A";
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
    let v = await p;
    for (; v === "ok"; v = await new Promise((ok2) => {
      modalResolve = (x) => {
        if (x == null) closeModal();
        ok2(x);
      };
    })) {
      const all = (n) => [...document.querySelectorAll(`#modal input[name=${n}]:checked`)].map((i) => i.value);
      const rule = {
        id: r.id,
        on: (_b2 = r.on) != null ? _b2 : 1,
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
        d2: $("#rD2").value,
        gifts: $("#rGifts").value.split(",").map((s) => s.trim()).filter(Boolean),
        show: $("#rShow").checked ? 1 : 0,
        d: $("#rDsc").value.trim(),
        pre: r.pre || ""
      };
      if (rule.type === "sum" && rule.gift) rule.pct = 0;
      if ($("#rP").closest("[data-f]").hidden) rule.pct = 0;
      if ($("#rF").closest("[data-f]").hidden) rule.from = rule.to = "";
      if (r.pre) {
        const fx = (t) => {
          if (r.pct && rule.pct !== r.pct) t = t.split(r.pct + "%").join(rule.pct + "%");
          if (r.min && rule.min !== r.min) t = t.split(String(r.min)).join(String(rule.min));
          for (const k of ["from", "to"]) if (r[k] && rule[k] && rule[k] !== r[k]) t = t.split(r[k]).join(rule[k]).replace(new RegExp(`(${k === "from" ? "\u0437" : "\u0434\u043E"} )${+r[k].slice(0, 2)}(?!\\d|:)`), `$1${+rule[k].slice(0, 2)}`);
          return t;
        };
        if (rule.name === (r.name || "")) rule.name = fx(rule.name);
        if (rule.d === (r.d || "")) rule.d = fx(rule.d);
      }
      const res = await act("loyRule", { rule }, "\u{1F4BE} \u0410\u043A\u0446\u0456\u044E \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
      if (!res) continue;
      closeModal();
      S.data.loy.cfg = res.cfg;
      renderMain();
      return;
    }
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
    var _a2, _b2;
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
    if (a === "loyPre") {
      const r0 = S.data.loy.cfg.rules.find((x) => x.pre === d.id), r = await act("loyPreset", { pre: d.id, on: (r0 == null ? void 0 : r0.on) ? 0 : 1 });
      if (!r) return;
      if (r.draft) {
        toast("\u270F\uFE0F " + (r.error || "\u0423\u0442\u043E\u0447\u043D\u0456\u0442\u044C") + " \u2014 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0439\u0442\u0435");
        return loyRuleEdit("", r.draft);
      }
      if (r0) Object.assign(r0, r.rule);
      else S.data.loy.cfg.rules.push(r.rule);
      toast(r.rule.on ? "\u2705 \u0410\u043A\u0446\u0456\u044F \u0434\u0456\u0454" : "\u26D4 \u0412\u0438\u043C\u043A\u043D\u0435\u043D\u043E");
      renderMain();
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
      const ph = (_b2 = S.tables[S.open]) == null ? void 0 : _b2.cli;
      if (ph) loyCliCard(ph);
    }
  });
  async function loadCalc() {
    const K = S.sk, t = K.tab;
    if (!S.data.sk || ["stock", "prod", "inv", "cards"].includes(t)) S.data.sk = await api("skData");
    if (t === "buy") S.data.skBuy = await api("skBuy");
    if (t === "sup") S.data.skSup = await api("skSupList");
    if (t === "inv" && !K.draft) S.data.skInv = await api("skInvList", { months: 12 });
    if ((t === "cards" || t === "prod") && isAdmin()) {
      if (!S.menu) await loadMenu();
      S.data.skCost = await api("skCost");
    }
    if (t === "tech") S.data.skTech = await api("skTech");
    if (t === "ex") S.data.skEx = await api("skEx", K.exId ? { id: K.exId } : {});
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
    const sub = { ex: "\u043C\u0430\u0440\u043A\u0438 \u043F\u043B\u044F\u0448\u043E\u043A \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044E: \u043F\u0440\u0438\u0445\u0456\u0434, \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0456 \u043F\u043B\u044F\u0448\u043A\u0438, \u0447\u0435\u043A", sup: "\u043F\u0440\u043E\u0444\u0456\u043B\u0456, \u0431\u043E\u0440\u0433\u0438, \u043E\u043F\u043B\u0430\u0442\u0430, \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F, \u0430\u043A\u0442\u0438 \u0437\u0432\u0456\u0440\u043A\u0438", stock: "\u0437\u0430\u043B\u0438\u0448\u043A\u0438 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0430\u0445 \u041A\u0443\u0445\u043D\u044F \u0456 \u0411\u0430\u0440", buy: "\u0449\u043E \u0434\u043E\u043A\u0443\u043F\u0438\u0442\u0438 \u2014 \u043F\u043E \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u0445", inv: "\u043F\u0440\u0438\u0445\u0456\u0434 \u0442\u043E\u0432\u0430\u0440\u0443: \u0444\u043E\u0442\u043E, \u043A\u043E\u0434 \u0430\u0431\u043E \u0432\u0440\u0443\u0447\u043D\u0443", cards: "\u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0446\u0456\u0439\u043D\u0456 \u043A\u0430\u0440\u0442\u0438 \u0439 \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u0441\u0442\u0440\u0430\u0432", tech: "\u0441\u043A\u043B\u0430\u0434 \u0456 \u0433\u0440\u0430\u043C\u043E\u0432\u043A\u0430 \u0441\u0442\u0440\u0430\u0432", prod: "\u043D\u0430\u043F\u0456\u0432\u0444\u0430\u0431\u0440\u0438\u043A\u0430\u0442\u0438: \u0441\u043E\u0443\u0441\u0438, \u0442\u0456\u0441\u0442\u043E, \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438", count: "\u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0444\u0430\u043A\u0442\u0438\u0447\u043D\u0438\u0445 \u0437\u0430\u043B\u0438\u0448\u043A\u0456\u0432", menu: "\u0441\u0442\u0440\u0430\u0432\u0438, \u0446\u0456\u043D\u0438, \u0444\u043E\u0442\u043E", stop: "\u0449\u043E \u0437\u0430\u0440\u0430\u0437 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F", rep: "\u0444\u0443\u0434\u043A\u043E\u0441\u0442, \u043F\u0440\u0438\u0431\u0443\u0442\u043E\u043A \u0441\u0442\u0440\u0430\u0432, \u043D\u0435\u0441\u0442\u0430\u0447\u0456 \u0439 \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F" }[K.tab];
    const head = `<div class="rhead"><div><h1>\u0421\u043A\u043B\u0430\u0434</h1><span class="muted">${sub}</span></div></div>
      <div class="seg rsec">${tabs.map(([k, l]) => `<button class="${K.tab === k ? "on" : ""}" data-a="skTab" data-t="${k}">${l}</button>`).join("")}</div>`;
    if (!S.data.sk) return head + '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    if (K.card && (K.tab === "cards" || K.tab === "prod")) return head + `<div class="sk">${skCardEdHTML()}</div>`;
    if (K.tab === "menu") return head + `<div class="sk sk-emb">${menuHTML()}</div>`;
    if (K.tab === "stop") return head + `<div class="sk sk-emb">${stopHTML()}</div>`;
    return head + `<div class="sk">${{ stock: skStockHTML, buy: skBuyHTML, inv: skInvHTML, sup: skSupHTML, cards: skCardsHTML, tech: skTechHTML, prod: skProdHTML, count: skCountHTML, rep: skRepHTML, ex: skExHTML }[K.tab]()}</div>`;
  }
  function skStockHTML() {
    const K = S.sk, D = S.data.sk, adm = isAdmin(), q = K.q.trim().toLowerCase(), live = D.ing.filter((x) => !x.off && !x.grp), gq = (x) => x.grp ? x.grp.reduce((a, id) => a + Math.max(0, totQ(D.ing.find((y) => y.id === id) || {})), 0) : totQ(x);
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
      <span class="grow"></span>${adm ? '<button class="btn sm primary" data-a="skIng">\u2795 \u041F\u0440\u043E\u0434\u0443\u043A\u0442</button><button class="btn sm" data-a="skGrp">\u{1F96C} \u0413\u0440\u0443\u043F\u0430</button><button class="btn sm" data-a="skDups">\u{1F50D} \u0414\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0438</button>' : ""}<button class="btn sm" data-a="skOffPick">\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u0442\u0438</button><button class="btn sm" data-a="skJr">\u{1F4DC} \u0420\u0443\u0445</button></div>`;
    const pills = adm ? `<div class="kpis sk-kpis"><div class="kpi accent"><span>\u0422\u043E\u0432\u0430\u0440\u0443 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0430\u0445</span><b class="money">${money(val())}</b><small class="muted">${WHN.k} ${money(val("k"))} \xB7 ${WHN.b} ${money(val("b"))}</small></div>
      <div class="kpi ${low.length ? "red" : ""}${low.length ? " press" : ""}" ${low.length ? 'data-a="skTab" data-t="buy"' : ""}><span>\u041D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443</span><b>${low.length}</b><small class="muted">${low.length ? "\u{1F6D2} \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0437\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044E \u2192" : "\u0443\u0441\u044C\u043E\u0433\u043E \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454"}</small></div>
      <div class="kpi"><span>\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432</span><b>${live.length}</b><small class="muted">${live.filter((x) => !x.cost).length ? `\u0431\u0435\u0437 \u0446\u0456\u043D\u0438: ${live.filter((x) => !x.cost).length}` : "\u0443 \u0432\u0441\u0456\u0445 \u0454 \u0446\u0456\u043D\u0430"}</small></div></div>` : low.length ? `<div class="card sk-low">\u26A0\uFE0F \u041D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443: ${low.map((x) => esc(x.n)).join(", ")}</div>` : "";
    const rowH = (x) => {
      var _a2, _b2, _c, _d;
      if (x.grp) {
        const m = x.grp.map((id) => D.ing.find((y) => y.id === id)).filter(Boolean);
        return `<div class="sk-row"><div class="sk-n${adm ? " press" : ""}" ${adm ? `data-a="skGrp" data-id="${x.id}"` : ""}><b>\u{1F96C} ${esc(x.n)}</b><small class="muted">\u0433\u0440\u0443\u043F\u0430-\u0437\u0430\u043C\u0456\u043D\u043D\u0438\u043A: ${m.map((y) => esc(y.n)).join(", ")}</small></div><div class="sk-q"><b>${fq(gq(x), x.u)}</b><small class="muted">\u0440\u0430\u0437\u043E\u043C</small></div><div class="sk-act"></div></div>`;
      }
      const t = totQ(x), lo = x.min > 0 && t < x.min, both = (((_a2 = x.st) == null ? void 0 : _a2.k) || 0) && (((_b2 = x.st) == null ? void 0 : _b2.b) || 0);
      return `<div class="sk-row${lo ? " low" : ""}${x.off ? " off" : ""}"><div class="sk-n${adm ? " press" : ""}" ${adm ? `data-a="skIng" data-id="${x.id}"` : ""}><b>${x.semi ? "\u{1F373} " : ""}${x.ex ? "\u{1F37E} " : ""}${esc(x.n)}</b><small class="muted">${x.min ? `\u043C\u0456\u043D ${fq(x.min, x.u)}` : ""}${adm && x.cost ? `${x.min ? " \xB7 " : ""}${money(x.cost)} / ${x.u}` : ""}${adm && !x.cost ? `${x.min ? " \xB7 " : ""}<span class="warn">\u043D\u0435\u043C\u0430\u0454 \u0446\u0456\u043D\u0438</span>` : ""}</small></div>
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
      <label class="chk"><input type="checkbox" id="iS" ${x.semi ? "checked" : ""}> \u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u2014 \u0433\u043E\u0442\u0443\u0454\u043C\u043E \u0441\u0430\u043C\u0456 (\u0441\u043E\u0443\u0441, \u0442\u0456\u0441\u0442\u043E\u2026), \u043C\u0430\u0454 \u0441\u0432\u043E\u044E \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443</label>
      ${x.semi ? "" : `<label class="chk"><input type="checkbox" id="iEx" ${x.ex ? "checked" : ""} onchange="document.getElementById('iExF').hidden=!this.checked"> \u{1F37E} \u0410\u043A\u0446\u0438\u0437\u043D\u0438\u0439 (\u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C, \u0442\u044E\u0442\u044E\u043D) \u2014 \u043C\u0430\u0440\u043A\u0430 \u043A\u043E\u0436\u043D\u043E\u0457 \u043F\u043B\u044F\u0448\u043A\u0438, \u043F\u0440\u043E\u0434\u0430\u0436 \u043D\u0435 \u0431\u0456\u043B\u044C\u0448\u0435, \u043D\u0456\u0436 \u0454 \u043C\u0430\u0440\u043E\u043A</label>
      <div class="frow" id="iExF"${x.ex ? "" : " hidden"}><label>\u041E\u0431\u02BC\u0454\u043C \u043F\u043B\u044F\u0448\u043A\u0438 <small>(\u0432 ${x.u || "\u043E\u0434."}, \u043D\u0430\u043F\u0440. 0.5)</small><input id="iVol" inputmode="decimal" value="${x.vol || ""}" placeholder="0.5"></label><label>\u041A\u043E\u0434 \u0423\u041A\u0422 \u0417\u0415\u0414 <small>(\u0434\u043B\u044F \u0447\u0435\u043A\u0430)</small><input id="iUk" inputmode="numeric" value="${esc(x.uk || "")}" placeholder="2208300000"></label></div>`}</div>`;
    const v = await modal({ title: x.id ? "\u{1F4E6} " + x.n : "\u2795 \u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...x.id && !x.off ? [{ label: "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438", val: "merge" }] : [], ...x.id ? [{ label: x.off ? "\u21A9\uFE0F \u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438" : "\u{1F5D1} \u0421\u0445\u043E\u0432\u0430\u0442\u0438", val: "del", cls: x.off ? "" : "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v === "merge") {
      closeModal();
      return skMergeUI(x);
    }
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
    const d = __spreadValues(__spreadValues({
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
    }, $("#iEx") ? { ex: $("#iEx").checked, vol: num("iVol"), uk: $("#iUk").value } : {}), $("#iCost") && num("iCost") !== (x.cost || 0) ? { cost: num("iCost"), setCost: 1 } : {});
    closeModal();
    const r = await act("skIngSave", { x: d }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (!r) return null;
    S.data.sk = await api("skData").catch(() => S.data.sk);
    renderMain();
    return r.x;
  }
  async function skMergeUI(T2, pre = []) {
    const L = S.data.sk.ing.filter((y) => !y.off && !y.grp && y.id !== T2.id && !!y.semi === !!T2.semi).sort((a, b) => a.n.localeCompare(b.n));
    const v = await modal({
      title: "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438 \u0432 \xAB" + T2.n + "\xBB",
      body: `<div class="muted" style="font-size:13px;margin-bottom:8px">\u0412\u0456\u0434\u043C\u0456\u0442\u044C\u0442\u0435 \u0434\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0438 \u2014 \u0446\u0435 \u0442\u043E\u0439 \u0441\u0430\u043C\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043F\u0456\u0434 \u0456\u043D\u0448\u043E\u044E \u043D\u0430\u0437\u0432\u043E\u044E. \u0407\u0445 \u0437\u0430\u043B\u0438\u0448\u043A\u0438 \u043F\u0435\u0440\u0435\u0439\u0434\u0443\u0442\u044C \u0441\u044E\u0434\u0438, \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438 \u0439 \u043C\u0430\u0439\u0431\u0443\u0442\u043D\u0456 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u2014 \u0442\u0435\u0436. \u0414\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0438 \u0441\u0445\u043E\u0432\u0430\u044E\u0442\u044C\u0441\u044F.</div>
      <input id="mgQ" placeholder="\u{1F50E} \u041F\u043E\u0448\u0443\u043A" oninput="const q=this.value.toLowerCase();document.querySelectorAll('.mg-r').forEach(r=>r.hidden=q&&!r.dataset.n.includes(q)&&!r.querySelector('input').checked)">
      <div class="mg-l">${L.map((y) => `<label class="mg-r" data-n="${esc(y.n.toLowerCase())}"><input type="checkbox" class="mgC" value="${y.id}"${pre.includes(y.id) ? " checked" : ""}> <span>${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small></span>${y.u !== T2.u ? `<span class="mg-f">1 ${y.u} = <input class="mgF" data-id="${y.id}" inputmode="decimal" placeholder="?"> ${T2.u}</span>` : ""}</label>`).join("")}</div>`,
      buttons: [{ label: "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
      keep: true
    });
    if (!v) return closeModal();
    const from = [...document.querySelectorAll(".mgC:checked")].map((c) => c.value), f = {};
    document.querySelectorAll(".mgF").forEach((i) => {
      if (i.value) f[i.dataset.id] = +i.value.replace(",", ".");
    });
    closeModal();
    if (!from.length) return toast("\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E");
    if (!await confirmBox(`\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438 ${from.length} \u0432 \xAB${T2.n}\xBB?`, "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043C\u043E\u0436\u043D\u0430 \u043B\u0438\u0448\u0435 \u0432\u0440\u0443\u0447\u043D\u0443")) return;
    const r = await act("skMerge", { to: T2.id, from, f }, "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E");
    if (!r) return;
    toast(`\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E ${r.n}${r.cards ? ` \xB7 \u0442\u0435\u0445\u043A\u0430\u0440\u0442 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E: ${r.cards}` : ""}`);
    S.data.sk = await api("skData").catch(() => S.data.sk);
    renderMain();
  }
  async function skGrpEdit(id) {
    const D = S.data.sk, x = D.ing.find((y) => y.id === id) || { n: "", u: "\u043A\u0433", grp: [] }, L = D.ing.filter((y) => !y.off && !y.grp).sort((a, b) => a.n.localeCompare(b.n));
    const v = await modal({
      title: x.id ? "\u{1F96C} " + x.n : "\u{1F96C} \u041D\u043E\u0432\u0430 \u0433\u0440\u0443\u043F\u0430-\u0437\u0430\u043C\u0456\u043D\u043D\u0438\u043A",
      body: `<div class="form"><div class="muted" style="font-size:13px">\u0420\u0456\u0437\u043D\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438, \u0449\u043E \u0432 \u0441\u0442\u0440\u0430\u0432\u0430\u0445 \u0437\u0430\u043C\u0456\u043D\u044E\u044E\u0442\u044C \u043E\u0434\u0438\u043D \u043E\u0434\u043D\u043E\u0433\u043E (\u043D\u0430\u043F\u0440. \u0410\u0439\u0441\u0431\u0435\u0440\u0433, \u0420\u043E\u043C\u0435\u043D, \u041C\u0456\u043A\u0441). \u041F\u043E\u0441\u0442\u0430\u0432\u0442\u0435 \u0433\u0440\u0443\u043F\u0443 \u0432 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443 \u2014 \u043F\u0440\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0443 \u0441\u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u0442\u043E\u0439, \u044F\u043A\u043E\u0433\u043E \u043D\u0430\u0439\u0431\u0456\u043B\u044C\u0448\u0435.</div>
      <label>\u041D\u0430\u0437\u0432\u0430<input id="gN" value="${esc(x.n)}" placeholder="\u043D\u0430\u043F\u0440. \u0421\u0430\u043B\u0430\u0442 \u043B\u0438\u0441\u0442\u043E\u0432\u0438\u0439"></label>
      <label>\u041E\u0434\u0438\u043D\u0438\u0446\u044F<select id="gU" onchange="document.querySelectorAll('.mg-r').forEach(r=>r.hidden=r.dataset.u!==this.value)">${D.units.map((u2) => `<option ${x.u === u2 ? "selected" : ""}>${u2}</option>`).join("")}</select></label>
      <div class="mg-l">${L.map((y) => `<label class="mg-r" data-u="${y.u}"${y.u !== x.u ? " hidden" : ""}><input type="checkbox" class="gC" value="${y.id}"${x.grp.includes(y.id) ? " checked" : ""}> <span>${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small></span></label>`).join("")}</div></div>`,
      buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "save", cls: "primary" }, ...x.id ? [{ label: "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443", val: "del", cls: "red" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
      keep: true
    });
    if (v === "del") {
      closeModal();
      if (await confirmBox("\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443?", "\u0423 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0430\u0445, \u0434\u0435 \u0432\u043E\u043D\u0430 \u0441\u0442\u043E\u0457\u0442\u044C, \u0437\u0430\u043C\u0456\u043D\u0456\u0442\u044C \u0457\u0457 \u043D\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442") && await act("skIngDel", { id: x.id }, "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E")) loadView();
      return;
    }
    if (v !== "save") return closeModal();
    const u = $("#gU").value, d = { id: x.id, n: $("#gN").value, u, grp: [...document.querySelectorAll(".gC:checked")].filter((c) => c.closest(".mg-r").dataset.u === u).map((c) => c.value) };
    closeModal();
    if (await act("skGrp", { x: d }, "\u{1F96C} \u0413\u0440\u0443\u043F\u0443 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) {
      S.data.sk = await api("skData").catch(() => S.data.sk);
      renderMain();
    }
  }
  async function skDups() {
    toast("\u{1F50D} \u0428\u0443\u043A\u0430\u044E \u0434\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0438\u2026 \u0434\u043E 30 \u0441");
    const r = await act("skDups", {});
    if (!r) return;
    const D = S.data.sk, im = new Map(D.ing.map((y) => [y.id, y])), G = r.groups.map((g2) => g2.map((id) => im.get(id)).filter(Boolean)).filter((g2) => g2.length > 1);
    if (!G.length) return modal({ title: "\u{1F50D} \u0414\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0438", body: '<div class="muted">\u0414\u0443\u0431\u043B\u0456\u043A\u0430\u0442\u0456\u0432 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u{1F44C}</div>', buttons: [{ label: "\u0414\u043E\u0431\u0440\u0435", val: null }] });
    const v = await modal({ title: `\u{1F50D} \u0421\u0445\u043E\u0436\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438 \xB7 ${G.length}`, body: `<div class="muted" style="font-size:13px;margin-bottom:8px">\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435: \u044F\u043A\u0449\u043E \u0446\u0435 \u0441\u043F\u0440\u0430\u0432\u0434\u0456 \u0442\u043E\u0439 \u0441\u0430\u043C\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u2014 \xAB\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438\xBB (\u043F\u0435\u0440\u0448\u0438\u043C \u0431\u0443\u0434\u0435 \u0433\u043E\u043B\u043E\u0432\u043D\u0438\u0439, \u043C\u043E\u0436\u043D\u0430 \u0437\u043C\u0456\u043D\u0438\u0442\u0438). \u0420\u0456\u0437\u043D\u0456 \u0441\u043E\u0440\u0442\u0438 \u2014 \u043D\u0435 \u043E\u0431\u02BC\u0454\u0434\u043D\u0443\u0439\u0442\u0435, \u043A\u0440\u0430\u0449\u0435 \u0437\u0440\u043E\u0431\u0456\u0442\u044C \u{1F96C} \u0433\u0440\u0443\u043F\u0443.</div>${G.map((g2, i) => `<div class="card mg-g"><div>${g2.map((y) => `${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small>`).join("<br>")}</div><div class="btnrow"><button class="btn sm primary" data-mi-v="m${i}">\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438</button><button class="btn sm" data-mi-v="g${i}">\u{1F96C} \u0413\u0440\u0443\u043F\u0430</button></div></div>`).join("")}`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (!v) return;
    const g = G[+v.slice(1)];
    if (v[0] === "m") {
      const main = await choose("\u042F\u043A\u0430 \u043D\u0430\u0437\u0432\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0430?", "", g.map((y) => ({ label: y.n, val: y.id })));
      if (main) return skMergeUI(im.get(main), g.map((y) => y.id).filter((id) => id !== main));
    } else return skGrpNew(g);
  }
  async function skGrpNew(g) {
    const r = await act("skGrp", { x: { n: g[0].n.split(/\s+/)[0] + " (\u0433\u0440\u0443\u043F\u0430)", u: g[0].u, grp: g.filter((y) => y.u === g[0].u).map((y) => y.id) } }, "\u{1F96C} \u0413\u0440\u0443\u043F\u0443 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E \u2014 \u043F\u0435\u0440\u0435\u0439\u043C\u0435\u043D\u0443\u0439\u0442\u0435 \u0437\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438");
    if (r) {
      S.data.sk = await api("skData").catch(() => S.data.sk);
      renderMain();
      skGrpEdit(r.x.id);
    }
  }
  async function skQty(kind, id) {
    var _a2, _b2, _c, _d, _e;
    const x = S.data.sk.ing.find((y) => y.id === id);
    if (!x) return;
    const ttl = { add: "\u2795 \u041E\u043F\u0440\u0438\u0431\u0443\u0442\u043A\u0443\u0432\u0430\u0442\u0438", off: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u0438", mv: "\u21C4 \u041F\u0435\u0440\u0435\u043C\u0456\u0441\u0442\u0438\u0442\u0438" }[kind] + " \xB7 " + x.n;
    const dw = (((_a2 = x.st) == null ? void 0 : _a2.b) || 0) > 0 && !((((_b2 = x.st) == null ? void 0 : _b2.k) || 0) > 0) ? "b" : x.home || "k";
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
      const all = S.data.sk.ing.filter((x) => !x.off && !x.grp && filter(x)).sort((a, b) => a.n.localeCompare(b.n));
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
  async function skJournal(day) {
    day || (day = todayK());
    const r = await act("skJournal", { day });
    if (!r) return;
    const T2 = { in: "\u{1F9FE}", add: "\u2795", off: "\u{1F5D1}", mv: "\u21C4", prod: "\u{1F373}", cnt: "\u{1F4DD}" }, sh = (n) => {
      const d = /* @__PURE__ */ new Date(day + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const NOTE = { in: "\u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430", add: "\u0434\u043E\u0434\u0430\u043D\u043E \u0432\u0440\u0443\u0447\u043D\u0443", off: "\u0441\u043F\u0438\u0441\u0430\u043D\u043E", mv: "\u043F\u0435\u0440\u0435\u043C\u0456\u0449\u0435\u043D\u043D\u044F", prod: "\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430", cnt: "\u0456\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F" };
    const can2 = (x) => {
      var _a2;
      return ["add", "off"].includes(x.t) && !x.undo && !/^(🔗|↩️)/.test(x.note || "") && (isAdmin() || x.by === ((_a2 = S.me) == null ? void 0 : _a2.name) && day === todayK());
    };
    const rows = r.list.map((x, i) => [x, i]).reverse().map(([x, i]) => `<div class="kv${x.undo ? " sk-undo" : ""}"><span>${x.at} ${T2[x.t] || "\u2022"} <b>${esc(x.n)}</b> ${x.q > 0 ? "+" : ""}${fq(x.q, x.u)} <span class="muted">\xB7 ${NOTE[x.t] || ""} \xB7 ${WHN[x.wh] || ""}${x.note ? " \xB7 " + esc(x.note) : ""}${x.by ? " \xB7 " + esc(x.by) : ""}${x.undo ? ` \xB7 \u21A9\uFE0F \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E ${esc(x.undo.by)} ${x.undo.at}` : ""}</span></span><span class="kv-r">${isAdmin() && x.sum ? `<b class="money">${money(x.sum)}</b>` : ""}${can2(x) ? `<button class="btn sm ghost" data-mi-v="u${i}:${x.ts}" title="\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438">\u21A9\uFE0F</button>` : ""}</span></div>`).join("");
    const v = await modal({ title: "\u{1F4DC} \u0420\u0443\u0445 \u0441\u043A\u043B\u0430\u0434\u0443", body: `<div class="zp-top"><button class="btn sm" data-mi-v="d${sh(-1)}">\u25C0</button><b>${day === todayK() ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : day.split("-").reverse().join(".")}</b>${day < todayK() ? `<button class="btn sm" data-mi-v="d${sh(1)}">\u25B6</button>` : "<span></span>"}</div>
      <div class="muted" style="font-size:12px;margin-bottom:6px">\u{1F9FE} \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430 (\u0437 \xAB\u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E\xBB / \xAB\u21A9\uFE0F \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u043E\xBB \u2014 \u043A\u043E\u043B\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 \u0432\u0438\u0434\u0430\u043B\u0438\u043B\u0438 \u0430\u0431\u043E \u0432\u0456\u0434\u043D\u043E\u0432\u0438\u043B\u0438) \xB7 \u2795 \u0434\u043E\u0434\u0430\u043D\u043E \xB7 \u{1F5D1} \u0441\u043F\u0438\u0441\u0430\u043D\u043E \xB7 \u21C4 \u043F\u0435\u0440\u0435\u043C\u0456\u0449\u0435\u043D\u043D\u044F \xB7 \u{1F373} \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \xB7 \u{1F4DD} \u0456\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F. \u041F\u0440\u043E\u0434\u0430\u0436\u0456 \u0437\u0430 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0430\u043C\u0438 \u2014 \u0443 \xAB\u{1F4CA} \u041F\u043B\u044E\u0441\u0438 / \u043C\u0456\u043D\u0443\u0441\u0438\xBB.</div>
      <div class="sk-jr">${rows || '<div class="muted">\u0420\u0443\u0445\u0456\u0432 \u0437\u0430 \u0446\u0435\u0439 \u0434\u0435\u043D\u044C \u043D\u0435\u043C\u0430\u0454</div>'}</div>`, buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (!v) return;
    if (v[0] === "d") return skJournal(v.slice(1));
    if (v[0] === "u" && await confirmBox("\u21A9\uFE0F \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0446\u0435\u0439 \u0440\u0443\u0445?", "\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u043A\u043B\u0430\u0434 \u044F\u043A \u0431\u0443\u043B\u043E") && await act("skJrUndo", { day, i: +v.slice(1).split(":")[0], ts: +v.split(":")[1] }, "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E")) {
      S.data.sk = null;
      loadView();
    }
    return skJournal(day);
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
    var _a2;
    const B = S.data.skBuy, gs2 = gi === "" || gi == null ? B.list : [B.list[+gi]];
    const text = `\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F ${((_a2 = S.brand) == null ? void 0 : _a2.name) || "VARVAR"}:
${gs2.map((g) => `${gs2.length > 1 ? `
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
    const top = `<div class="card"><h3>\u041D\u043E\u0432\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430</h3>${K.busy ? '<div class="sk-busy">\u{1F50E} \u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u044E \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443\u2026 \u0437\u0430\u0437\u0432\u0438\u0447\u0430\u0439 10\u201330 \u0441\u0435\u043A\u0443\u043D\u0434</div>' : `<div class="sk-new"><label class="btn primary sk-scan">\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443<input type="file" id="skPhoto" accept="image/*" capture="environment" hidden></label><label class="btn">\u{1F5BC} \u0417 \u0433\u0430\u043B\u0435\u0440\u0435\u0457<input type="file" id="skPhoto2" accept="image/*" multiple hidden></label><button class="btn" data-a="skLink">\u{1F517} \u041E\u043D\u043B\u0430\u0439\u043D-\u0447\u0435\u043A</button><button class="btn" data-a="skHand">\u270F\uFE0F \u0412\u0440\u0443\u0447\u043D\u0443</button>${isAdmin() ? '<label class="btn sm">\u{1F9EA} \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0428\u0406<input type="file" id="skBench" accept="image/*" multiple hidden></label>' : ""}</div>`}
      <div class="muted" style="font-size:12px;margin-top:8px">\xAB\u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438\xBB \u043E\u0434\u0440\u0430\u0437\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454 \u043A\u0430\u043C\u0435\u0440\u0443 \u2014 \u0441\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0443\u0439\u0442\u0435 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 \u0440\u0456\u0432\u043D\u043E, \u043F\u0440\u0438 \u0433\u0430\u0440\u043D\u043E\u043C\u0443 \u0441\u0432\u0456\u0442\u043B\u0456. \u041A\u0456\u043B\u044C\u043A\u0430 \u0441\u0442\u043E\u0440\u0456\u043D\u043E\u043A \u2014 \xAB\u0417 \u0433\u0430\u043B\u0435\u0440\u0435\u0457\xBB. \u041E\u043D\u043B\u0430\u0439\u043D-\u0447\u0435\u043A (Checkbox, \u0414\u041F\u0421\u2026) \u2014 \u0432\u0441\u0442\u0430\u0432\u0442\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0430\u0431\u043E \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u0439\u043E\u0433\u043E QR. \u0420\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u0454 Gemini \u2014 \u0432\u0438 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u0454\u0442\u0435 \u0439 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0454\u0442\u0435. \u0424\u043E\u0442\u043E \u043D\u0456\u0434\u0435 \u043D\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F.</div></div>`;
    if (!I) return top + '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const debts = Object.entries(I.list.filter((x) => !x.del && x.pay === "debt" && !x.paid && x.total > 0).reduce((m, x) => {
      var _a2;
      (m[_a2 = x.sup] || (m[_a2] = { debt: 0 })).debt += x.total;
      return m;
    }, {}));
    const dH = adm && debts.length ? `<div class="card"><h3>\u{1F4B8} \u0411\u043E\u0440\u0433\u0438 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u043C <span class="muted">\xB7 ${money(debts.reduce((a, [, s]) => a + s.debt, 0))}</span></h3>${debts.map(([n, s]) => `<div class="kv"><span><b>${esc(n)}</b></span><b class="money" style="color:var(--red)">${money(s.debt)}</b></div>${I.list.filter((x) => x.sup === n && !x.del && x.pay === "debt" && !x.paid).map((x) => `<div class="kv" style="padding-left:12px"><span class="press" data-a="skInvView" data-id="${x.id}">${x.day.slice(8)}.${x.day.slice(5, 7)}${x.no ? " \xB7 \u2116" + esc(x.no) : ""}</span><span class="kv-r">${x.total != null ? `<span class="money">${money(x.total)}</span>` : ""}<button class="btn sm red" data-a="skInvPay" data-id="${x.id}">\u{1F4B8} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438</button></span></div>`).join("")}`).join("")}</div>` : "";
    const rows = I.list.filter((x) => x.ts > Date.now() - 62 * 864e5 || x.pay === "debt" && !x.paid && !x.del).map((x) => `<div class="kv rrow${x.del ? " del" : ""}"><span class="press" data-a="skInvView" data-id="${x.id}">${x.day.slice(8)}.${x.day.slice(5, 7)} \xB7 <b>${esc(x.sup)}</b>${x.no ? " \u2116" + esc(x.no) : ""}<br><small class="muted">${x.n} \u043F\u043E\u0437. \xB7 ${esc(x.by)}</small></span>
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
    const d = S.sk.draft, D = S.data.sk, adm = isAdmin(), ing = D.ing.filter((x) => !x.off && !x.grp).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(ing.map((x) => [x.id, x]));
    const sum = d.lines.reduce((a, l) => a + (+l.sum || 0), 0), diff = d.total ? Math.round((d.total - sum) * 100) / 100 : 0;
    const opt = (l) => `<option value="">\u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u2014</option><option value="__new">${l.add ? `\u2795 \u041D\u043E\u0432\u0438\u0439: ${esc(l.add.n)} (${l.add.u})` : "\u2795 \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043D\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u2026"}</option>${ing.map((x) => `<option value="${x.id}" ${l.id === x.id ? "selected" : ""}>${esc(x.n)} (${x.u})</option>`).join("")}`;
    const pkOpt = (l) => {
      var _a3;
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a3 = l.add) == null ? void 0 : _a3.u) || "\u043E\u0434.", pks = [{ n: u, f: 1 }, ...(x == null ? void 0 : x.pk) || []];
      if (l.f && !pks.some((p) => p.f === +l.f)) pks.push({ n: "\xD7" + l.f, f: +l.f });
      return pks.map((p) => `<option value="${p.f}" ${(+l.f || 1) === p.f ? "selected" : ""}>${esc(p.n)}${p.f !== 1 ? ` (${p.f} ${u})` : ""}</option>`).join("") + '<option value="?">\u0456\u043D\u0448\u0430\u2026</option>';
    };
    const rows = d.lines.map((l, i) => {
      var _a3, _b2, _c, _d;
      const st = l.add ? "new" : !l.id ? "none" : l.ok === "guess" ? "guess" : "ok", x = im.get(l.id);
      return `<div class="dl ${st}"><div class="dl-src">${i + 1}. ${l.n ? esc(l.n) : '<i class="muted">\u043D\u043E\u0432\u0438\u0439 \u0440\u044F\u0434\u043E\u043A</i>'}${l.u || l.price ? ` <span class="muted">\xB7 ${esc((_a3 = l.q0) != null ? _a3 : l.q)} ${esc(l.u || "")}${l.price ? " \xD7 " + l.price : ""}</span>` : ""}${st === "guess" ? ` <span class="warn">\u2753 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435${l.sc ? " \xB7 " + Math.round(l.sc * 100) + "%" : ""}</span>` : st === "none" ? ' <span class="warn">\u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442</span>' : ""}</div>
        ${(st === "guess" || st === "new") && ((_b2 = l.c) == null ? void 0 : _b2.length) ? `<div class="chips dl-c">${st === "new" ? '<span class="muted">\u0441\u0445\u043E\u0436\u0435 \u043D\u0430:</span>' : ""}${l.c.map((c) => `<button class="chip ${c.id === l.id ? "on" : ""}" data-a="skDlCand" data-i="${i}" data-id="${c.id}">${esc(c.n)} <small class="muted">${Math.round(c.sc * 100)}%</small></button>`).join("")}${st === "guess" ? `<button class="chip" data-a="skDlCand" data-i="${i}" data-id="__new">\u2795 \u041D\u043E\u0432\u0438\u0439</button>` : ""}</div>` : ""}
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
    var _a2, _b2, _c, _d;
    const d = S.sk.draft, bad = d.lines.findIndex((l) => !(+l.q > 0) || !l.id && !l.add);
    if (!d.lines.length) return toast("\u26A0\uFE0F \u041D\u0435\u043C\u0430\u0454 \u043F\u043E\u0437\u0438\u0446\u0456\u0439");
    if (bad >= 0) return toast(`\u26A0\uFE0F \u0420\u044F\u0434\u043E\u043A ${bad + 1}: \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0456 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C (\u0430\u0431\u043E \u043F\u0440\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0440\u044F\u0434\u043E\u043A \u2715)`);
    const inv = __spreadProps(__spreadValues({ rid: d.rid || (d.rid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)), sup: ((_a2 = $("#dSup")) == null ? void 0 : _a2.value.trim()) || d.sup, no: ((_b2 = $("#dNo")) == null ? void 0 : _b2.value.trim()) || d.no, date: ((_c = $("#dDate")) == null ? void 0 : _c.value.trim()) || d.date, pay, src: d.src }, d.req ? { req: d.req } : {}), { lines: d.lines.map((l) => __spreadValues(__spreadValues({ id: l.id || null, q: +l.q, f: +l.f || 1, sum: +l.sum || 0, src: l.n || "" }, l.chk ? { chk: 1 } : {}), l.add ? { add: l.add } : {})) });
    const r = await act("skInvSave", { inv }, "\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E");
    if (!r) return;
    if (inv.lines.some((l) => {
      var _a3, _b3;
      return (_b3 = (_a3 = S.data.sk) == null ? void 0 : _a3.ing.find((y) => y.id === l.id)) == null ? void 0 : _b3.ex;
    })) await exAfterInv(inv.lines, inv.no);
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
      S.sk.draft = { sup: r.sup, req: r.req, no: r.no, date: r.date, total: r.total, src: "photo", lines: r.lines.map((l) => __spreadProps(__spreadValues({}, l), { q0: l.q, f: l.add || l.f && l.f !== 1 ? l.f : skAutoF(l) })) };
      if (!S.data.skInv) S.data.skInv = await api("skInvList", { months: 12 }).catch(() => null);
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
  async function skCam(on2 = skCode) {
    const box = $("#scCam"), v = $("#scV");
    if (!box || camStop) return;
    box.hidden = false;
    try {
      if ("BarcodeDetector" in window) {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        v.srcObject = st;
        await v.play();
        const bd = new BarcodeDetector();
        let live = true, last = "", lt = 0;
        camStop = () => {
          live = false;
          st.getTracks().forEach((t) => t.stop());
        };
        const loop = async () => {
          var _a2;
          if (!live) return;
          if (!$("#scV")) return camStop == null ? void 0 : camStop();
          try {
            const r = await bd.detect(v);
            const t = (_a2 = r[0]) == null ? void 0 : _a2.rawValue;
            if (t && (t !== last || Date.now() - lt > 2500)) {
              last = t;
              lt = Date.now();
              on2(t);
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
            on2(t);
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
    var _a2, _b2;
    const x = S.data.sk.ing.find((y) => y.id === id);
    if (!x) return 0;
    const sc = x.semi && ((_b2 = (_a2 = S.data.skCost) == null ? void 0 : _a2.cards) == null ? void 0 : _b2["semi:" + id]);
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
      var _a2, _b2;
      return `<div class="kv press sk-cr" data-a="skCard" data-k="${esc(x.key)}"><span>${esc(x.name)}${x.draft ? ' <span class="badge-d">\u2728 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430</span>' : ""}${((_a2 = x.miss) == null ? void 0 : _a2.length) ? `<br><small class="warn">\u043D\u0435\u043C\u0430\u0454 \u0446\u0456\u043D\u0438: ${esc(x.miss.join(", "))}</small>` : ""}</span>
      <span class="kv-r">${x.cost == null ? '<span class="muted">\u043D\u0435\u043C\u0430\u0454 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0438</span>' : `<span class="muted money">${money(x.cost)}</span><b class="${fcc(x.fc)}">${(_b2 = x.fc) != null ? _b2 : "\u2014"}%</b>`}<span class="money" style="min-width:64px;text-align:right">${money(x.price)}</span></span></div>`;
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
    var _a2, _b2, _c, _d;
    const c = S.sk.card, D = S.data.sk, ing = D.ing.filter((x) => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(D.ing.map((x) => [x.id, x])), tgt = ((_b2 = (_a2 = S.data.skCost) == null ? void 0 : _a2.cfg) == null ? void 0 : _b2.foodCost) || 30;
    const cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0), fc = c.price ? Math.round(cost / c.price * 1e3) / 10 : null, rec2 = cost ? Math.ceil(cost / (tgt / 100) / 5) * 5 : 0;
    const per = c.semi && +c.yield > 0 ? cost / +c.yield : null;
    const rows = c.items.map((l, i) => {
      var _a3, _b3, _c2, _d2, _e, _f;
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a3 = l.add) == null ? void 0 : _a3.u) || "\u043A\u0433", k = u === "\u0448\u0442" ? 1 : 1e3, loss = (_c2 = (_b3 = l.loss) != null ? _b3 : x == null ? void 0 : x.loss) != null ? _c2 : 0, net = (+l.q || 0) * (1 - loss / 100);
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
        <div class="kv"><span>\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u0430 \u0446\u0456\u043D\u0430 \u043F\u0440\u0438 \u0444\u0443\u0434\u043A\u043E\u0441\u0442\u0456 ${tgt}%</span><b class="money" id="cRec">${rec2 ? money(rec2) : "\u2014"}</b></div>
        <div class="kv sk-mk"><span>\u{1F4C8} \u041D\u0430\u0446\u0456\u043D\u043A\u0430 (\u043C\u043D\u043E\u0436\u043D\u0438\u043A)<br><small class="muted">\u043D\u0430\u043F\u0440. 4 = \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \xD7 4</small></span><span class="kv-r"><input data-ch="mk" inputmode="decimal" value="${c.mk || ""}" placeholder="\xD74" style="width:80px"></span></div>
        <div class="kv"><span>\u0426\u0456\u043D\u0430 \u0437\u0430 \u043D\u0430\u0446\u0456\u043D\u043A\u043E\u044E</span><b class="money" id="cMk">${+c.mk && cost ? money(Math.ceil(cost * +String(c.mk).replace(",", ".") / 5) * 5) : "\u2014"}</b></div>
        <div class="kv"><span>\u0424\u0430\u043A\u0442\u0438\u0447\u043D\u0430 \u043D\u0430\u0446\u0456\u043D\u043A\u0430 \u0437\u0430 \u0446\u0456\u043D\u043E\u044E \u0432 \u043C\u0435\u043D\u044E</span><b id="cMkF">${cost && c.price ? "\xD7" + Math.round(c.price / cost * 100) / 100 + ` (+${Math.round((c.price / cost - 1) * 100)}%)` : "\u2014"}</b></div>`}
        <div class="btnrow"><button class="btn primary" data-a="skCardSave">\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438</button>${c.isNew ? "" : '<button class="btn red" data-a="skCardDel">\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u0443</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">\u0411\u0440\u0443\u0442\u0442\u043E \u2014 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0431\u0435\u0440\u0435\u0442\u044C\u0441\u044F \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443; \u043D\u0435\u0442\u0442\u043E \u2014 \u043F\u0456\u0441\u043B\u044F \u0447\u0438\u0441\u0442\u043A\u0438 / \u0432\u0430\u0440\u043A\u0438. \u041F\u0440\u043E\u0434\u0430\u0436 \u0441\u0442\u0440\u0430\u0432\u0438 \u0441\u043F\u0438\u0441\u0443\u0454 \u0431\u0440\u0443\u0442\u0442\u043E \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443. \u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0430 AI \u043D\u0435 \u0441\u043F\u0438\u0441\u0443\u0454, \u043F\u043E\u043A\u0438 \u0432\u0438 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u0435.</div></div>`;
  }
  function skMass(c) {
    var _a2, _b2, _c;
    const im = new Map(S.data.sk.ing.map((x) => [x.id, x]));
    let g = 0, n = 0, pc = 0;
    for (const l of c.items) {
      const x = im.get(l.id), u = (x == null ? void 0 : x.u) || ((_a2 = l.add) == null ? void 0 : _a2.u) || "\u043A\u0433", q = +l.q || 0, loss = (_c = (_b2 = l.loss) != null ? _b2 : x == null ? void 0 : x.loss) != null ? _c : 0;
      if (u === "\u0448\u0442") pc += q;
      else {
        g += q * 1e3;
        n += q * (1 - loss / 100) * 1e3;
      }
    }
    return `${Math.round(g)} \u0433${Math.round(n) !== Math.round(g) ? ` \xB7 \u043D\u0435\u0442\u0442\u043E ${Math.round(n)} \u0433` : ""}${pc ? ` + ${r3(pc)} \u0448\u0442` : ""}`;
  }
  const skCardCalc = () => {
    var _a2, _b2;
    const c = S.sk.card;
    if (!c) return;
    const tgt = ((_b2 = (_a2 = S.data.skCost) == null ? void 0 : _a2.cfg) == null ? void 0 : _b2.foodCost) || 30, cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0);
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
    const T2 = S.data.skTech;
    if (!T2) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const q = S.sk.q2.trim().toLowerCase(), l = T2.list.filter((x) => !q || x.name.toLowerCase().includes(q));
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
    var _a2, _b2, _c;
    const D = S.data.sk, adm = isAdmin(), cards = ((_a2 = S.data.skCost) == null ? void 0 : _a2.cards) || {}, semis = D.ing.filter((x) => x.semi && !x.off), calc = (_c = (_b2 = S.cfg) == null ? void 0 : _b2.semiCalc) != null ? _c : 1;
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
      return !x.off && !x.grp && (x.home === wh || (((_a2 = x.st) == null ? void 0 : _a2[wh]) || 0) !== 0);
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
      var _a2, _b2;
      const h = x.cat !== cat ? `<div class="cnt-cat">${esc(cat = x.cat || "\u0406\u043D\u0448\u0435")}</div>` : "";
      return h + `<div class="cnt-r"><span>${x.semi ? "\u{1F373} " : ""}${esc(x.n)}<br><small class="muted">\u0441\u0438\u0441\u0442\u0435\u043C\u0430: ${fq(((_a2 = x.st) == null ? void 0 : _a2[wh]) || 0, x.u)}</small></span><input data-cf="${x.id}" inputmode="decimal" value="${esc((_b2 = K.cf[x.id]) != null ? _b2 : "")}" placeholder="\u0444\u0430\u043A\u0442, ${x.u}"><span class="cnt-d" id="cfd${x.id}">${diffH(x)}</span></div>`;
    }).join("");
    const hist = (S.data.skCnts || []).slice(0, 15).map((c) => `<div class="kv press" data-a="skCntView" data-id="${c.id}"><span>${c.undo ? '<s class="muted">' : ""}${c.day.slice(8)}.${c.day.slice(5, 7)} \xB7 ${WHN[c.wh]} \xB7 ${esc(c.by)} <span class="muted">\xB7 ${c.n} \u043F\u043E\u0437.</span>${c.undo ? " \u21A9\uFE0F</s>" : ""}</span>${adm ? `<span class="kv-r"><b class="neg">${money(c.short)}</b><b class="good">+${money(c.over)}</b></span>` : ""}</div>`).join("");
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
      <div class="muted" style="font-size:12px;margin-top:8px">\u041F\u043E\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0456\u0439: ${d.lines.length} \xB7 ${esc(d.by)}${d.undo ? ` \xB7 \u21A9\uFE0F \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E (${esc(d.undo.by)})` : ""}</div>`, buttons: [...adm && !d.undo && ch.length ? [{ label: "\u21A9\uFE0F \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0456\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044E", val: "undo", cls: "red" }] : [], { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] }).then(async (v) => {
      if (v !== "undo") return;
      if (!await confirmBox("\u21A9\uFE0F \u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0456\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044E?", "\u0417\u0430\u043B\u0438\u0448\u043A\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u044F\u043A \u0431\u0443\u043B\u0438 \u0434\u043E \u043D\u0435\u0457 (\u0440\u0443\u0445 \u043F\u0456\u0441\u043B\u044F \u043D\u0435\u0457 \u2014 \u043F\u0440\u043E\u0434\u0430\u0436\u0456, \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u2014 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u0442\u044C\u0441\u044F). \u0423 \u0436\u0443\u0440\u043D\u0430\u043B\u0456 \u0441\u043A\u043B\u0430\u0434\u0443 \u0437\u02BC\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u0437\u0432\u043E\u0440\u043E\u0442\u043D\u0456 \u0440\u044F\u0434\u043A\u0438.")) return;
      if (await act("skCountUndo", { id: d.id }, "\u21A9\uFE0F \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044E \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E")) loadView();
    });
  }
  function skRepHTML() {
    var _a2;
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
    const loss = ((_a2 = R.loss) == null ? void 0 : _a2.length) ? `<div class="card" style="border-color:var(--red)"><h3>\u{1F6A8} \u041F\u0440\u043E\u0434\u0430\u0436 \u043D\u0438\u0436\u0447\u0435 \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u043E\u0441\u0442\u0456 \xB7 ${R.loss.length}</h3><div class="muted" style="font-size:13px;margin-bottom:6px">\u0426\u0456\u043D\u0430 \u0432 \u043C\u0435\u043D\u044E \u043C\u0435\u043D\u0448\u0430 \u0437\u0430 \u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432 \u0437\u0430 \u0442\u0435\u0445\u043A\u0430\u0440\u0442\u043E\u044E \u2014 \u043A\u043E\u0436\u043D\u0430 \u043F\u043E\u0440\u0446\u0456\u044F \u0432 \u0437\u0431\u0438\u0442\u043E\u043A.</div>${R.loss.map((x) => `<div class="kv"><span>${esc(x.n)}</span><span class="neg">\u0446\u0456\u043D\u0430 ${money(x.price)}, \u0441\u043E\u0431\u0456\u0432. ${money(x.cost)} (\u2212${money(x.loss)})</span></div>`).join("")}</div>` : "";
    return head + loss + kpis + meH + tbl + off;
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
      case "skGrp":
        skGrpEdit(el.dataset.id);
        break;
      case "skDups":
        skDups();
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
        if (!S.data.skInv) S.data.skInv = await api("skInvList", { months: 12 }).catch(() => null);
        K.draft = { sup: "", no: "", date: "", total: 0, src: "hand", lines: [{ id: null, n: "", q: "", f: 1, sum: "" }] };
        renderMain();
        break;
      case "skScan":
        skScan();
        break;
      case "skLink": {
        const u = await ask("\u{1F517} \u041E\u043D\u043B\u0430\u0439\u043D-\u0447\u0435\u043A", "\u0412\u0441\u0442\u0430\u0432\u0442\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0430 \u0447\u0435\u043A (\u0437 SMS, \u043F\u043E\u0448\u0442\u0438 \u0447\u0438 QR)");
        if (u && /^https?:\/\//.test(u.trim())) skCode(u.trim());
        else if (u) toast("\u26A0\uFE0F \u041F\u043E\u0442\u0440\u0456\u0431\u043D\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F, \u0449\u043E \u043F\u043E\u0447\u0438\u043D\u0430\u0454\u0442\u044C\u0441\u044F \u0437 https://");
        break;
      }
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
            l.chk = 1;
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
          l.chk = 1;
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
  const exAge = (t) => t ? new Date(t).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }) : "";
  const exTl = (c) => "\u2026" + String(c || "").slice(-6);
  function skExHTML() {
    const K = S.sk, R = S.data.skEx;
    if (!R) return '<div class="muted" style="margin:16px 4px">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    if (K.exId && R.x) return skExOneHTML(R);
    const help = `<div class="card"><h3>\u{1F37E} \u042F\u043A \u0446\u0435 \u043F\u0440\u0430\u0446\u044E\u0454</h3><div class="muted" style="font-size:13px;line-height:1.5">
      1) \u0423 \u043A\u0430\u0440\u0442\u0446\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 (\u{1F4E6} \u0417\u0430\u043B\u0438\u0448\u043A\u0438 \u2192 \u043D\u0430\u0437\u0432\u0430) \u0443\u0432\u0456\u043C\u043A\u043D\u0456\u0442\u044C \xAB\u{1F37E} \u0410\u043A\u0446\u0438\u0437\u043D\u0438\u0439\xBB, \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u043E\u0431\u02BC\u0454\u043C \u043F\u043B\u044F\u0448\u043A\u0438 \u0439 \u043A\u043E\u0434 \u0423\u041A\u0422 \u0417\u0415\u0414.<br>
      2) \u041F\u0440\u0438\u0439\u0448\u043B\u0430 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430 \u2014 \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0443 \u043D\u0430 \u043A\u043E\u0436\u043D\u0456\u0439 \u043F\u043B\u044F\u0448\u0446\u0456 (\u0441\u043A\u0430\u043D\u0435\u0440\u043E\u043C \u043F\u0456\u0434\u0440\u044F\u0434 \u0430\u0431\u043E \u043A\u0430\u043C\u0435\u0440\u043E\u044E).<br>
      3) \u041F\u0440\u043E\u0434\u0430\u0454\u0442\u0435 \u043F\u043E\u0440\u0446\u0456\u044F\u043C\u0438 \u044F\u043A \u0437\u0430\u0432\u0436\u0434\u0438: \u043C\u0430\u0440\u043A\u0430 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E\u0457 \u043F\u043B\u044F\u0448\u043A\u0438 \u0441\u0430\u043C\u0430 \u043F\u0456\u0434\u0435 \u0432 \u043F\u0435\u0440\u0448\u0438\u0439 \u0444\u0456\u0441\u043A\u0430\u043B\u044C\u043D\u0438\u0439 \u0447\u0435\u043A \u0437 \u043D\u0435\u0457. \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u043B\u0430\u0441\u044C \u043F\u043B\u044F\u0448\u043A\u0430 \u2014 \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454\u0442\u044C\u0441\u044F \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0430, \u0443 \u0441\u0442\u0440\u0456\u0447\u0446\u0456 \u043A\u0430\u0441\u0438 \u0432\u0438\u0434\u043D\u043E \u0457\u0457 \u043C\u0430\u0440\u043A\u0443.<br>
      4) \u041F\u0440\u043E\u0434\u0430\u0442\u0438 \u0431\u0456\u043B\u044C\u0448\u0435, \u043D\u0456\u0436 \u0454 \u043F\u043B\u044F\u0448\u043E\u043A \u0437 \u043C\u0430\u0440\u043A\u0430\u043C\u0438, \u043D\u0435 \u0432\u0438\u0439\u0434\u0435 \u2014 \u043A\u0430\u0441\u0430, \u0431\u043E\u0442 \u0456 \u0441\u0430\u0439\u0442 \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u044F\u0442\u044C.</div></div>`;
    const dd = (d) => d.split("-").reverse().join("."), L = R.lic;
    const lic = `<div class="card${R.licErr || !L ? " sk-low" : ""}"><h3>\u{1F4DC} \u041B\u0456\u0446\u0435\u043D\u0437\u0456\u044F \u043D\u0430 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C</h3>${L ? `<div class="kv"><span>\u2116 ${esc(L.no)}<br><small class="muted">\u0434\u0456\u0439\u0441\u043D\u0430 \u0434\u043E ${dd(L.till)}${R.licLeft >= 0 ? ` \xB7 \u043B\u0438\u0448\u0438\u043B\u043E\u0441\u044C ${R.licLeft} \u0434\u043D.` : ""}</small></span><span class="kv-r">${R.licErr ? `<b class="warn">\u26D4 ${esc(R.licErr)}</b>` : L.ok ? "\u2705 \u043A\u0430\u0441\u0430 \u0432\u043F\u0438\u0441\u0430\u043D\u0430" : ""}</span></div>
      ${R.licErr ? '<div class="warn" style="font-size:13px">\u0410\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F (\u043A\u0430\u0441\u0430, \u0431\u043E\u0442, \u0441\u0430\u0439\u0442), \u0434\u043E\u043A\u0438 \u043D\u0435 \u043E\u043D\u043E\u0432\u0438\u0442\u0435.</div>' : R.licLeft <= 30 ? '<div class="warn" style="font-size:13px">\u26A0\uFE0F \u0421\u043A\u043E\u0440\u043E \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F \u2014 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0442\u0435 \u0439 \u043E\u043D\u043E\u0432\u0456\u0442\u044C \u0434\u0430\u0442\u0443.</div>' : ""}` : '<div class="muted" style="font-size:13px">\u26A0\uFE0F \u041D\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u043E. \u041F\u0440\u043E\u0434\u0430\u0436 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044E \u0447\u0435\u0440\u0435\u0437 \u043A\u0430\u0441\u0443, \u043D\u0435 \u0432\u043F\u0438\u0441\u0430\u043D\u0443 \u0432 \u043B\u0456\u0446\u0435\u043D\u0437\u0456\u044E, \u2014 \u0448\u0442\u0440\u0430\u0444 200%. \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043D\u043E\u043C\u0435\u0440, \u0441\u0442\u0440\u043E\u043A \u0456 \u0447\u0438 \u0432\u043F\u0438\u0441\u0430\u043D\u0430 \u0446\u044F \u043A\u0430\u0441\u0430 \u2014 \u043D\u0430\u0433\u0430\u0434\u0430\u0454\u043C\u043E \u0437\u0430 30 \u0456 7 \u0434\u043D\u0456\u0432 \u0434\u043E \u043A\u0456\u043D\u0446\u044F.</div>'}
      <div class="btnrow"><button class="btn sm" data-a="exLic">${L ? "\u270F\uFE0F \u0417\u043C\u0456\u043D\u0438\u0442\u0438" : "\u{1F4DC} \u0412\u043A\u0430\u0437\u0430\u0442\u0438 \u043B\u0456\u0446\u0435\u043D\u0437\u0456\u044E"}</button></div></div>`;
    if (!R.list.length) return lic + help;
    const row = (x) => {
      const bad = Math.abs(x.cap - x.st) > x.vol * 0.25;
      return `<div class="sk-row${x.short ? " low" : ""}"><div class="sk-n press" data-a="exOne" data-id="${x.id}"><b>\u{1F37E} ${esc(x.n)}</b><small class="muted">${x.open ? `\u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0430 ${exTl(x.open.c)} \xB7 \u043B\u0438\u0448\u0438\u043B\u043E\u0441\u044C ${fq(x.open.left, x.u)}` : "\u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E\u0457 \u043F\u043B\u044F\u0448\u043A\u0438 \u043D\u0435\u043C\u0430\u0454"}${x.uk ? ` \xB7 \u0423\u041A\u0422 \u0417\u0415\u0414 ${esc(x.uk)}` : " \xB7 \u26A0\uFE0F \u0431\u0435\u0437 \u0423\u041A\u0422 \u0417\u0415\u0414"}</small>
        ${x.short ? `<small class="warn">\u26A0\uFE0F \u043F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u043D\u0430\u0434 \u043C\u0430\u0440\u043A\u0438: ${fq(x.short, x.u)} \u2014 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0438</small>` : bad ? `<small class="warn">\u26A0\uFE0F \u0437\u0430 \u043C\u0430\u0440\u043A\u0430\u043C\u0438 ${fq(x.cap, x.u)}, \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0456 ${fq(x.st, x.u)} \u2014 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435</small>` : ""}</div>
        <div class="sk-q"><b>${x.n0}</b><small class="muted">\u043D\u043E\u0432\u0438\u0445 \u043F\u043B\u044F\u0448\u043E\u043A</small></div>
        <div class="sk-act"><button class="btn sm" data-a="exAdd" data-id="${x.id}">\u2795 \u041C\u0430\u0440\u043A\u0438</button></div></div>`;
    };
    return `<div class="kpis sk-kpis"><div class="kpi accent"><span>\u0410\u043A\u0446\u0438\u0437\u043D\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432</span><b>${R.list.length}</b><small class="muted">\u043F\u043B\u044F\u0448\u043E\u043A \u043D\u043E\u0432\u0438\u0445: ${R.list.reduce((a, x) => a + x.n0, 0)}</small></div>
      <div class="kpi ${R.list.some((x) => !x.cap) ? "red" : ""}"><span>\u0411\u0435\u0437 \u043C\u0430\u0440\u043E\u043A</span><b>${R.list.filter((x) => !x.cap).length}</b><small class="muted">\u0457\u0445 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0442\u0438</small></div></div>
      <div class="card"><h3>\u{1F37E} \u0410\u043A\u0446\u0438\u0437\u043D\u0456 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0438</h3>${R.list.map(row).join("")}</div>` + lic + help;
  }
  function skExOneHTML(R) {
    const x = R.x, st = (y) => y.w ? `\u{1F5D1} ${esc(y.w)}` : y.d ? "\u2705 \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u043B\u0430\u0441\u044C" : y.o ? "\u{1F37E} \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0430" : "\u{1F195} \u043D\u043E\u0432\u0430";
    const b = R.b.map((y) => `<div class="kv"><span><b>${exTl(y.c)}</b> <small class="muted">${st(y)}${y.e ? " \xB7 \u0454\u0410\u043A\u0446\u0438\u0437" : ""} \xB7 ${exAge(y.add)}${y.inv ? ` \xB7 \u043D\u0430\u043A\u043B. ${esc(y.inv)}` : ""}${y.fr ? ` \xB7 \u{1F9FE} \u0443 \u0447\u0435\u043A\u0443` : y.o && !y.d ? " \xB7 \u043C\u0430\u0440\u043A\u0430 \u0449\u0435 \u043D\u0435 \u0432 \u0447\u0435\u043A\u0443" : ""}</small></span>
      <span class="kv-r">${y.d ? "" : `<b>${fq(y.left, x.u)}</b> <button class="btn sm" data-a="exOff" data-id="${x.id}" data-c="${esc(y.c)}" data-o="${y.o ? 1 : 0}">${y.o ? "\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u0442\u0438" : "\u2715"}</button>`}</span></div>`).join("");
    return `<div class="btnrow"><button class="btn sm" data-a="exBack">\u2190 \u0423\u0441\u0456 \u0430\u043A\u0446\u0438\u0437\u043D\u0456</button></div>
      <div class="kpis sk-kpis"><div class="kpi accent"><span>${esc(x.n)}</span><b>${fq(x.cap, x.u)}</b><small class="muted">\u043C\u043E\u0436\u043D\u0430 \u043F\u0440\u043E\u0434\u0430\u0442\u0438 \u0437\u0430 \u043C\u0430\u0440\u043A\u0430\u043C\u0438 \xB7 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0456 ${fq(x.st, x.u)}</small></div>
      <div class="kpi"><span>\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0430 \u043F\u043B\u044F\u0448\u043A\u0430</span><b>${x.open ? exTl(x.open.c) : "\u2014"}</b><small class="muted">${x.open ? `\u043B\u0438\u0448\u0438\u043B\u043E\u0441\u044C ${fq(x.open.left, x.u)} \u0437 ${fq(x.vol, x.u)}` : "\u0432\u0456\u0434\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u0437 \u043F\u0435\u0440\u0448\u043E\u044E \u043F\u043E\u0440\u0446\u0456\u0454\u044E"}</small></div>
      <div class="kpi"><span>\u041D\u043E\u0432\u0438\u0445 \u043F\u043B\u044F\u0448\u043E\u043A</span><b>${x.n0}</b><small class="muted">${x.q ? `\u043C\u0430\u0440\u043E\u043A \u0447\u0435\u043A\u0430\u044E\u0442\u044C \u0447\u0435\u043A\u0430: ${x.q}` : "\u043F\u043E " + fq(x.vol, x.u)}</small></div></div>
      ${x.short ? `<div class="card sk-low">\u26A0\uFE0F \u041F\u0440\u043E\u0434\u0430\u043D\u043E \u043F\u043E\u043D\u0430\u0434 \u043C\u0430\u0440\u043A\u0438: ${fq(x.short, x.u)}. \u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0438 \u043F\u043B\u044F\u0448\u043E\u043A, \u0437 \u044F\u043A\u0438\u0445 \u043D\u0430\u043B\u0438\u0432\u0430\u043B\u0438.</div>` : ""}
      <div class="btnrow"><button class="btn primary" data-a="exAdd" data-id="${x.id}">\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043C\u0430\u0440\u043A\u0438</button><button class="btn" data-a="exOpen" data-id="${x.id}">\u{1F37E} \u0412\u0456\u0434\u043A\u0440\u0438\u043B\u0438 \u0456\u043D\u0448\u0443 \u043F\u043B\u044F\u0448\u043A\u0443</button></div>
      <div class="card"><h3>\u041F\u043B\u044F\u0448\u043A\u0438 <span class="muted">\xB7 \u043E\u0441\u0442\u0430\u043D\u043D\u0456 ${R.b.length}</span></h3>${b || '<div class="muted">\u041C\u0430\u0440\u043E\u043A \u0449\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u2795 \u0414\u043E\u0434\u0430\u0442\u0438 \u043C\u0430\u0440\u043A\u0438\xBB</div>'}</div>`;
  }
  async function exReload() {
    const K = S.sk;
    S.data.skEx = await api("skEx", K.exId ? { id: K.exId } : {}).catch(() => S.data.skEx);
    if (S.view === "calc" && K.tab === "ex") renderMain();
  }
  async function exScan(id, need = 0, inv = "") {
    var _a2;
    const D = S.data.sk || (S.data.sk = await api("skData")), x = D.ing.find((y) => y.id === id);
    if (!x) return;
    const got = [], draw = (m) => {
      const el = $("#exRes");
      if (el) el.innerHTML = `<b>${got.length}${need ? " \u0437 " + need : ""}</b> \u043C\u0430\u0440\u043E\u043A${m ? " \xB7 " + m : ""}<br><small class="muted">${got.slice(-5).map(exTl).join(" \xB7 ")}</small>`;
    };
    const pm = modal({
      title: `\u{1F37E} \u041C\u0430\u0440\u043A\u0438: ${x.n}`,
      body: `<div class="form"><input id="exIn" placeholder="\u0412\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0443 \u043D\u0430 \u043F\u043B\u044F\u0448\u0446\u0456 (\u0441\u043A\u0430\u043D\u0435\u0440 \u0430\u0431\u043E \u043A\u043E\u0434 \u0456 Enter)" autocomplete="off"><div id="exRes" class="muted"></div>
      <button class="btn" data-a="exCam">\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043A\u0430\u043C\u0435\u0440\u043E\u044E</button><div id="scCam" class="sc-cam" hidden><video id="scV" playsinline muted></video></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">\u0421\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u043A\u043E\u0436\u043D\u0443 \u043F\u043B\u044F\u0448\u043A\u0443 \u043E\u0434\u0438\u043D \u0440\u0430\u0437 \u2014 \u043F\u043E\u0432\u0442\u043E\u0440 \u043D\u0435 \u0437\u0430\u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F. \u041E\u0431\u02BC\u0454\u043C \u043F\u043B\u044F\u0448\u043A\u0438: ${fq(x.vol || (x.u === "\u043B" ? 0.5 : 1), x.u)}.</div>`,
      buttons: [{ label: "\u2705 \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }]
    });
    const put = (c) => {
      var _a3;
      c = String(c || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
      if (c.length < 6) return draw("\u26A0\uFE0F \u0437\u0430\u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u043A\u043E\u0434");
      if (got.includes(c)) return draw("\u21A9\uFE0F \u0446\u044F \u0432\u0436\u0435 \u0454");
      got.push(c);
      draw("\u2705 " + exTl(c));
      try {
        (_a3 = navigator.vibrate) == null ? void 0 : _a3.call(navigator, 60);
      } catch (e) {
      }
    };
    exCamCb = put;
    setTimeout(() => {
      const i = $("#exIn");
      if (!i) return;
      i.focus();
      i.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        put(i.value);
        i.value = "";
      });
      draw();
    }, 60);
    const v = await pm;
    camStop == null ? void 0 : camStop();
    camStop = null;
    exCamCb = null;
    const left = (_a2 = $("#exIn")) == null ? void 0 : _a2.value;
    if (left) put(left);
    if (!v || !got.length) return;
    const r = await act("skExAdd", { id, codes: got, inv });
    if (!r) return;
    toast(`\u{1F37E} \u0414\u043E\u0434\u0430\u043D\u043E \u043C\u0430\u0440\u043E\u043A: ${r.added}${r.up ? ` \xB7 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0434\u043E \u043F\u043E\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u0434\u0443: ${r.up}` : ""}${r.dup.length ? ` \xB7 \u0434\u0443\u0431\u043B\u0456: ${r.dup.length}` : ""}`);
    if (r.dup.length) modal({ title: "\u21A9\uFE0F \u0426\u0456 \u043C\u0430\u0440\u043A\u0438 \u0432\u0436\u0435 \u0454", text: r.dup.map((d) => `${exTl(d.c)}${d.n ? " \u2014 " + d.n : ""}`).join(" \xB7 "), buttons: [{ label: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E", val: 1, cls: "primary" }] });
    exReload();
  }
  let exCamCb = null;
  async function exAfterInv(lines, no) {
    var _a2;
    const im = new Map((((_a2 = S.data.sk) == null ? void 0 : _a2.ing) || []).map((y) => [y.id, y]));
    for (const l of lines) {
      const x = im.get(l.id);
      if (!(x == null ? void 0 : x.ex)) continue;
      const n = Math.max(1, Math.round((+l.q || 0) * (+l.f || 1) / (x.vol || (x.u === "\u043B" ? 0.5 : 1))));
      if (!await choose(`\u{1F37E} ${x.n}: \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0438 (${n} \u043F\u043B.)`, "\u0411\u0435\u0437 \u043C\u0430\u0440\u043E\u043A \u0446\u0456 \u043F\u043B\u044F\u0448\u043A\u0438 \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0442\u0438", [{ label: "\u{1F4F7} \u0421\u043A\u0430\u043D\u0443\u0432\u0430\u0442\u0438 \u043C\u0430\u0440\u043A\u0438", val: 1 }])) continue;
      await exScan(x.id, n, no);
    }
  }
  document.addEventListener("click", async (e) => {
    var _a2, _b2, _c, _d;
    const el = e.target.closest("[data-a]");
    if (!el || !/^ex[A-Z]/.test(el.dataset.a)) return;
    const a = el.dataset.a, K = S.sk, id = el.dataset.id;
    switch (a) {
      case "exOne":
        if (!id) break;
        K.exId = id;
        S.data.skEx = null;
        renderMain();
        exReload();
        break;
      case "exBack":
        K.exId = "";
        S.data.skEx = null;
        renderMain();
        exReload();
        break;
      case "exAdd":
        if (id) exScan(id);
        break;
      case "exLic": {
        const L = ((_a2 = S.data.skEx) == null ? void 0 : _a2.lic) || {};
        const v = await modal({
          title: "\u{1F4DC} \u041B\u0456\u0446\u0435\u043D\u0437\u0456\u044F \u043D\u0430 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C",
          body: `<div class="form"><label>\u041D\u043E\u043C\u0435\u0440 \u043B\u0456\u0446\u0435\u043D\u0437\u0456\u0457<input id="exLn" value="${esc(L.no || "")}" maxlength="40"></label>
          <label>\u0414\u0456\u0439\u0441\u043D\u0430 \u0434\u043E<input id="exLt" type="date" value="${esc(L.till || "")}"></label>
          <label class="kv"><span>\u2705 \u0426\u044E \u043A\u0430\u0441\u0443 (\u041F\u0420\u0420\u041E) \u0432\u043F\u0438\u0441\u0430\u043D\u043E \u0432 \u043B\u0456\u0446\u0435\u043D\u0437\u0456\u044E</span><input id="exLo" type="checkbox"${L.ok || !L.no ? " checked" : ""}></label>
          <div class="muted" style="font-size:12px">\u0411\u0435\u0437 \u043F\u043E\u0437\u043D\u0430\u0447\u043A\u0438 \u0430\u0431\u043E \u043F\u0456\u0441\u043B\u044F \u0434\u0430\u0442\u0438 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0432\u0430\u0442\u0438\u043C\u0435\u0442\u044C\u0441\u044F \u2014 \u0442\u0430\u043A \u043A\u0430\u0441\u0430 \u0432\u0431\u0435\u0440\u0435\u0436\u0435 \u0432\u0456\u0434 \u0448\u0442\u0440\u0430\u0444\u0443 200%.</div></div>`,
          buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: 1, cls: "primary" }, ...L.no ? [{ label: "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438", val: "off" }] : [], { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }],
          keep: true
        });
        const f = v === 1 ? { no: (_b2 = $("#exLn")) == null ? void 0 : _b2.value.trim(), till: (_c = $("#exLt")) == null ? void 0 : _c.value, ok: ((_d = $("#exLo")) == null ? void 0 : _d.checked) ? 1 : 0 } : null;
        closeModal();
        if (v === "off") {
          if (await confirmBox("\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u043B\u0456\u0446\u0435\u043D\u0437\u0456\u044E?", "\u041F\u0440\u043E\u0434\u0430\u0436 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044E \u043D\u0435 \u0431\u043B\u043E\u043A\u0443\u0432\u0430\u0442\u0438\u043C\u0435\u0442\u044C\u0441\u044F, \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C \u043D\u0435 \u0431\u0443\u0434\u0435.") && await act("skExLic", { off: 1 }, "\u{1F5D1} \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E")) exReload();
          break;
        }
        if (f && await act("skExLic", f, "\u{1F4DC} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) exReload();
        break;
      }
      case "exCam":
        skCam((c) => exCamCb == null ? void 0 : exCamCb(c));
        break;
      case "exOpen": {
        if (!id) break;
        const c = await ask("\u{1F37E} \u042F\u043A\u0443 \u043F\u043B\u044F\u0448\u043A\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u043B\u0438?", "\u0412\u0456\u0434\u0441\u043A\u0430\u043D\u0443\u0439\u0442\u0435 \u043C\u0430\u0440\u043A\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E\u0457 \u043F\u043B\u044F\u0448\u043A\u0438");
        if (!c) break;
        const r = await act("skExOpen", { id, c }, "\u{1F37E} \u0422\u0435\u043F\u0435\u0440 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0430 \u0446\u044F \u043F\u043B\u044F\u0448\u043A\u0430");
        if (r) exReload();
        break;
      }
      case "exOff": {
        const c = el.dataset.c;
        if (!id || !c) break;
        if (el.dataset.o !== "1") {
          if (await confirmBox(`\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u043C\u0430\u0440\u043A\u0443 ${exTl(c)}?`, "\u0414\u043B\u044F \u043F\u043E\u043C\u0438\u043B\u043A\u043E\u0432\u043E \u0432\u0456\u0434\u0441\u043A\u0430\u043D\u043E\u0432\u0430\u043D\u043E\u0457 \u043D\u043E\u0432\u043E\u0457 \u043F\u043B\u044F\u0448\u043A\u0438. \u0421\u043A\u043B\u0430\u0434 \u043D\u0435 \u0437\u043C\u0456\u043D\u044E\u0454\u0442\u044C\u0441\u044F.") && await act("skExOff", { id, c, rm: 1 }, "\u2715 \u041F\u0440\u0438\u0431\u0440\u0430\u043D\u043E")) exReload();
          break;
        }
        const note = await ask(`\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u0442\u0438 \u043F\u043B\u044F\u0448\u043A\u0443 ${exTl(c)}`, "\u041F\u0440\u0438\u0447\u0438\u043D\u0430: \u0440\u043E\u0437\u0431\u0438\u043B\u0430\u0441\u044C, \u0437\u0456\u043F\u0441\u043E\u0432\u0430\u043D\u0430\u2026");
        if (!note) break;
        if (await act("skExOff", { id, c, note }, "\u{1F5D1} \u0421\u043F\u0438\u0441\u0430\u043D\u043E \u0437\u0456 \u0441\u043A\u043B\u0430\u0434\u0443")) exReload();
        break;
      }
    }
  });
  const dm = (d) => d ? `${d.slice(8)}.${d.slice(5, 7)}` : "";
  const supShare = async (text, title) => {
    try {
      if (navigator.share && matchMedia("(hover: none)").matches) await navigator.share({ text, title });
      else {
        await navigator.clipboard.writeText(text);
        toast("\u{1F4CB} \u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E \u2014 \u0432\u0441\u0442\u0430\u0432\u0442\u0435 \u0432 Viber / Telegram");
      }
    } catch (e) {
      prompt("\u0421\u043A\u043E\u043F\u0456\u044E\u0439\u0442\u0435:", text);
    }
  };
  function skSupHTML() {
    var _a2;
    const D = S.data.skSup, adm = isAdmin();
    if (!D) return '<div class="muted">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026</div>';
    const tot = D.list.reduce((a, x) => a + (x.debt || 0), 0), over = D.list.reduce((a, x) => a + (x.over || 0), 0);
    return `${adm ? `<div class="kpis"><div class="kpi ${tot ? "red" : ""}"><span>\u{1F4B8} \u0412\u0438\u043D\u043D\u0456 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u043C</span><b>${money(tot)}</b>${over ? `<small style="color:var(--red)">\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E ${money(over)}</small>` : '<small class="muted">\u0431\u0435\u0437 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u043E\u043A</small>'}</div><div class="kpi"><span>\u{1F3ED} \u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0456\u0432</span><b>${D.list.length}</b></div></div>` : ""}
      <div class="btnrow" style="margin:10px 0">${adm ? '<button class="btn sm primary" data-a="supNew">\u2795 \u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A</button><button class="btn sm" data-a="supPrices">\u2696\uFE0F \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0446\u0456\u043D\u0438</button>' : ""}</div>
      <div class="sup-l">${D.list.map((x) => `<button class="card sup-c press" data-a="supOpen" data-id="${x.id}"><div class="sup-h"><b>${esc(x.n)}</b>${adm && x.debt ? `<span class="money" style="color:var(--red)">\u2212${money(x.debt)}</span>` : ""}</div>
        <small class="muted">${x.cnt} \u043D\u0430\u043A\u043B.${x.last ? " \xB7 \u043E\u0441\u0442\u0430\u043D\u043D\u044F " + new Date(x.last).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }) : ""}${adm && x.n30 ? " \xB7 \u0437\u0430 30 \u0434\u043D. " + money(x.n30) : ""}${x.term ? " \xB7 \u0432\u0456\u0434\u0441\u0442\u0440\u043E\u0447\u043A\u0430 " + x.term + " \u0434\u043D." : ""}</small>${adm && x.over ? `<small style="color:var(--red)">\u23F0 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E ${money(x.over)}</small>` : ""}</button>`).join("") || '<div class="muted">\u0429\u0435 \u043D\u0435\u043C\u0430\u0454 \u2014 \u043F\u0440\u043E\u0444\u0456\u043B\u044C \u0441\u0442\u0432\u043E\u0440\u044E\u0454\u0442\u044C\u0441\u044F \u0441\u0430\u043C, \u043A\u043E\u043B\u0438 \u0441\u043A\u0430\u043D\u0443\u0454\u0442\u044C\u0441\u044F \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0430.</div>'}</div>
      ${adm && ((_a2 = D.loose) == null ? void 0 : _a2.length) ? `<div class="card" style="margin-top:10px"><h3>\u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u0431\u0435\u0437 \u043F\u0440\u043E\u0444\u0456\u043B\u044E</h3><div class="muted set-note">\u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0438 \u0437\u0456 \u0441\u0442\u0430\u0440\u0438\u0445 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 \u2014 \u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u043F\u0440\u043E\u0444\u0456\u043B\u044C \u043E\u0434\u043D\u0438\u043C \u043D\u0430\u0442\u0438\u0441\u043A\u043E\u043C.</div><div class="chips">${D.loose.map((n) => `<button class="chip" data-a="supMake" data-n="${esc(n)}">\u2795 ${esc(n)}</button>`).join("")}</div></div>` : ""}`;
  }
  async function supLoad() {
    S.data.skSup = await api("skSupList");
    if (S.view === "calc" && S.sk.tab === "sup") renderMain();
  }
  async function supOpen(id) {
    var _a2, _b2, _c, _d;
    let c;
    try {
      c = await api("skSupCard", { id });
    } catch (e) {
      return toast("\u26A0\uFE0F " + errText(e.message));
    }
    const p = c.p, adm = isAdmin(), un = c.inv.filter((x) => x.pay === "debt" && !x.paid);
    const row = (l, v2, copy) => v2 ? `<div class="kv"><span>${l}</span><span class="kv-r"><b style="overflow-wrap:anywhere">${esc(v2)}</b>${copy ? `<button class="btn sm" data-mi-v="cp:${esc(v2)}" title="\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438">\u{1F4CB}</button>` : ""}</span></div>` : "";
    const v = await modal({
      title: `\u{1F3ED} ${esc(p.n)}`,
      body: `<div class="sup-card">
      ${adm ? `<div class="kpis"><div class="kpi ${c.debt ? "red" : ""}"><span>\u{1F4B8} \u0412\u0438\u043D\u043D\u0456</span><b>${money(c.debt)}</b><small class="muted">${un.length} \u043D\u0435\u043E\u043F\u043B\u0430\u0447.</small></div><div class="kpi"><span>\u0417\u0430 \u0440\u0456\u043A</span><b>${money(c.year)}</b><small class="muted">${c.inv.length} \u043D\u0430\u043A\u043B. \xB7 \u0441\u0435\u0440. ${money(c.avg)}</small></div></div>` : ""}
      <h4>\u{1F4C7} \u0420\u0435\u043A\u0432\u0456\u0437\u0438\u0442\u0438 \u0439 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0438</h4>${row("\u042E\u0440. \u043D\u0430\u0437\u0432\u0430", p.legal)}${row("\u0404\u0414\u0420\u041F\u041E\u0423 / \u0406\u041F\u041D", p.code, 1)}${(((_a2 = p.ibans) == null ? void 0 : _a2.length) ? p.ibans : p.iban ? [{ v: p.iban }] : []).map((i) => {
        var _a3, _b3, _c2;
        return `<div class="kv" style="${i.v === p.iban && (((_a3 = p.ibans) == null ? void 0 : _a3.length) || 0) > 1 ? "background:color-mix(in srgb,var(--accent) 14%,transparent);border-radius:8px;padding-inline:6px" : ""}"><span>IBAN${i.v === p.iban ? (((_b3 = p.ibans) == null ? void 0 : _b3.length) || 0) > 1 ? " \u2B50 \u043E\u0441\u043D\u043E\u0432\u043D\u0438\u0439" : "" : '<br><small class="muted">\u0441\u0442\u0430\u0440\u0438\u0439</small>'}</span><span class="kv-r" style="flex-wrap:wrap;justify-content:flex-end"><b style="overflow-wrap:anywhere">${esc(i.v)}</b><button class="btn sm" data-mi-v="cp:${esc(i.v)}" title="\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438">\u{1F4CB}</button>${adm && i.v !== p.iban ? `<button class="btn sm" data-mi-v="ib:act:${esc(i.v)}" title="\u0417\u0440\u043E\u0431\u0438\u0442\u0438 \u043E\u0441\u043D\u043E\u0432\u043D\u0438\u043C">\u2B50</button>` : ""}${adm && (((_c2 = p.ibans) == null ? void 0 : _c2.length) || 0) > 1 ? `<button class="btn sm red" data-mi-v="ib:del:${esc(i.v)}" title="\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438">\u{1F5D1}</button>` : ""}</span></div>`;
      }).join("")}${row("\u0422\u0435\u043B\u0435\u0444\u043E\u043D", p.phone, 1)}${row("\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", p.mgr)}${row("Viber / Telegram", p.msg)}${row("\u0410\u0434\u0440\u0435\u0441\u0430", p.addr)}${row("\u0414\u043D\u0456 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438", p.days)}${row("\u0412\u0456\u0434\u0441\u0442\u0440\u043E\u0447\u043A\u0430", p.term ? p.term + " \u0434\u043D." : "")}${row("\u041F\u0440\u0438\u043C\u0456\u0442\u043A\u0438", p.note)}
      ${!p.code && !p.iban && !p.phone ? '<div class="muted set-note">\u0420\u0435\u043A\u0432\u0456\u0437\u0438\u0442\u0438 \u043F\u0456\u0434\u0442\u044F\u0433\u043D\u0443\u0442\u044C\u0441\u044F \u0437 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u043E\u0457 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457 \u2014 \u0430\u0431\u043E \u0432\u043D\u0435\u0441\u0456\u0442\u044C \u0432\u0440\u0443\u0447\u043D\u0443</div>' : ""}${adm ? `<div class="btnrow" style="margin:6px 0"><button class="btn sm${!p.iban ? " primary" : ""}" data-mi-v="edit">\u270F\uFE0F ${p.iban || p.code ? "\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0440\u0435\u043A\u0432\u0456\u0437\u0438\u0442\u0438" : "\u0412\u043D\u0435\u0441\u0442\u0438 \u0440\u0435\u043A\u0432\u0456\u0437\u0438\u0442\u0438"}</button>${p.iban ? '<button class="btn sm" data-mi-v="ib:new">\u2795 \u0429\u0435 \u0440\u0430\u0445\u0443\u043D\u043E\u043A</button>' : ""}</div>` : ""}
      ${adm && un.length ? `<h4>\u{1F4B8} \u041D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u0456</h4>${un.map((x) => `<label class="kv" style="cursor:pointer"><span>${dm(x.day)}${x.no ? " \xB7 \u2116" + esc(x.no) : ""}<br><small class="${x.due != null && x.due < 0 ? "neg" : "muted"}">${x.due == null ? x.age + " \u0434\u043D. \u0442\u043E\u043C\u0443" : x.due < 0 ? `\u23F0 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E ${-x.due} \u0434\u043D.` : x.due === 0 ? "\u23F0 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : `\u0449\u0435 ${x.due} \u0434\u043D.`}</small></span><span class="kv-r"><b class="money">${money(x.total)}</b><input type="checkbox" class="supPk" value="${x.id}" checked style="width:22px;height:22px"></span></label>`).join("")}` : ""}
      <h4>\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456</h4>${c.inv.slice(0, 30).map((x) => `<div class="kv press" data-mi-v="inv:${x.id}"><span>${dm(x.day)}${x.no ? " \xB7 \u2116" + esc(x.no) : ""} <small class="muted">\xB7 ${x.n} \u043F\u043E\u0437.</small></span><span class="kv-r">${x.total != null ? `<b class="money">${money(x.total)}</b>` : ""}<small class="${x.pay === "debt" && !x.paid ? "neg" : "good"}">${x.pay === "debt" && !x.paid ? "\u23F3" : "\u2705"}</small></span></div>`).join("") || '<div class="muted">\u041D\u0435\u043C\u0430\u0454</div>'}
      ${c.prod.length ? `<h4>\u{1F4E6} \u0429\u043E \u0432\u043E\u0437\u0438\u0442\u044C</h4>${c.prod.slice(0, 40).map((x) => `<div class="kv"><span>${esc(x.n)}<br><small class="muted">${fq(x.q, x.u)} \u0437\u0430 \u0440\u0456\u043A${x.day ? " \xB7 " + dm(x.day) : ""}</small></span>${x.last != null ? `<span class="kv-r"><b>${money(x.last)}/${x.u}</b>${x.prev && x.last > x.prev * 1.01 ? `<small class="warn">\u2191${Math.round((x.last / x.prev - 1) * 100)}%</small>` : x.prev && x.last < x.prev * 0.99 ? `<small class="good">\u2193${Math.round((1 - x.last / x.prev) * 100)}%</small>` : ""}</span>` : ""}</div>`).join("")}` : ""}</div>`,
      buttons: [...adm && un.length ? [{ label: "\u{1F4B5} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u043F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0456 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E", val: "pay:cash", cls: "primary" }, { label: "\u{1F4B3} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u043F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0456 \u043A\u0430\u0440\u0442\u043A\u043E\u044E", val: "pay:card" }] : [], { label: "\u{1F6D2} \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", val: "order" }, ...adm ? [{ label: "\u{1F4C4} \u0410\u043A\u0442 \u0437\u0432\u0456\u0440\u043A\u0438", val: "act" }, { label: "\u270F\uFE0F \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438", val: "edit" }, { label: "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438 \u0437 \u0456\u043D\u0448\u0438\u043C", val: "merge" }] : [], { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }],
      keep: true
    });
    if (v == null) return closeModal();
    if (String(v).startsWith("cp:")) {
      await supShare(v.slice(3));
      return supOpen(id);
    }
    if (String(v).startsWith("ib:")) {
      closeModal();
      const [, k, val] = v.split(":");
      if (k === "new") {
        const n = await ask("\u{1F3E6} \u041D\u043E\u0432\u0438\u0439 IBAN", "UA \u0456 27 \u0446\u0438\u0444\u0440 \u2014 \u0441\u0442\u0430\u043D\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u0438\u043C, \u0441\u0442\u0430\u0440\u0438\u0439 \u043B\u0438\u0448\u0438\u0442\u044C\u0441\u044F", "text");
        if (n == null ? void 0 : n.trim()) await act("skSupSave", { p: { id, iban: n } }, "\u{1F3E6} \u0420\u0430\u0445\u0443\u043D\u043E\u043A \u0434\u043E\u0434\u0430\u043D\u043E");
        return supOpen(id);
      }
      if (k === "del" && !await confirmBox("\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A?", val)) return supOpen(id);
      await act("skSupSave", { p: { id, [k === "del" ? "ibanDel" : "ibanAct"]: val } }, k === "del" ? "\u{1F5D1} \u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E" : "\u2B50 \u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439");
      return supOpen(id);
    }
    if (String(v).startsWith("inv:")) {
      closeModal();
      return skInvView(v.slice(4));
    }
    if (String(v).startsWith("pay:")) {
      const ids = [...document.querySelectorAll(".supPk:checked")].map((x) => x.value);
      closeModal();
      if (!ids.length) return toast("\u041F\u043E\u0437\u043D\u0430\u0447\u0442\u0435 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0456");
      const sum = un.filter((x) => ids.includes(x.id)).reduce((a, x) => a + (x.total || 0), 0);
      if (!await confirmBox(`\u{1F4B8} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 ${ids.length} \u043D\u0430\u043A\u043B. \u043D\u0430 ${money(sum)}?`, v === "pay:cash" ? "\u0413\u043E\u0442\u0456\u0432\u043A\u043E\u044E \u0437 \u043A\u0430\u0441\u0438 \u2014 \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u044F\u043A \u0432\u0438\u0442\u0440\u0430\u0442\u0430" : "\u041A\u0430\u0440\u0442\u043A\u043E\u044E \u2014 \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u044C\u0441\u044F \u044F\u043A \u0432\u0438\u0442\u0440\u0430\u0442\u0430 \u0437 \u043A\u0430\u0440\u0442\u043A\u0438")) return supOpen(id);
      const r = await act("skSupPay", { ids, src: v.slice(4) });
      if (r) toast(`\u{1F4B8} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E ${r.n} \xB7 ${money(r.sum)}`);
      supLoad();
      return supOpen(id);
    }
    closeModal();
    if (v === "order") {
      const r = await act("skSupOrder", { id });
      if (!r) return;
      if (!r.text) {
        toast("\u2705 \u0423 \u0446\u044C\u043E\u0433\u043E \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430 \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0454\u0442\u044C\u0441\u044F (\u0437\u0430 \u043C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0438\u043C\u0438 \u0437\u0430\u043B\u0438\u0448\u043A\u0430\u043C\u0438)");
        return supOpen(id);
      }
      const w = await modal({ title: "\u{1F6D2} \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", body: `<textarea id="supOt" rows="10" style="width:100%">${esc(r.text)}</textarea><div class="muted set-note">\u041C\u043E\u0436\u043D\u0430 \u0432\u0438\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \u043A\u0456\u043B\u044C\u043A\u043E\u0441\u0442\u0456. \u0421\u043F\u0438\u0441\u043E\u043A \u2014 \u0437 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u043D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443 (\u0421\u043A\u043B\u0430\u0434 \u2192 \u043C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0456 \u0437\u0430\u043B\u0438\u0448\u043A\u0438).</div>`, buttons: [{ label: "\u{1F4E4} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 / \u0441\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438", val: "go", cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }], keep: true });
      const t = (_b2 = $("#supOt")) == null ? void 0 : _b2.value;
      closeModal();
      if (w === "go" && t) await supShare(t, p.n);
      return;
    }
    if (v === "act") {
      const from = await ask("\u{1F4C4} \u0410\u043A\u0442 \u0437\u0432\u0456\u0440\u043A\u0438 \u0437 \u0434\u0430\u0442\u0438", "\u0420\u0420\u0420\u0420-\u041C\u041C-\u0414\u0414, \u043D\u0430\u043F\u0440. " + (/* @__PURE__ */ new Date()).getFullYear() + "-01-01", "text");
      if (!from) return;
      const r = await act("skSupAct", { id, from: from.trim(), to: todayK() });
      if (!r) return;
      const txt = `\u0410\u043A\u0442 \u0437\u0432\u0456\u0440\u043A\u0438: ${((_c = S.brand) == null ? void 0 : _c.name) || ""} \u2014 ${p.legal || p.n}
\u041F\u0435\u0440\u0456\u043E\u0434: ${r.from} \u2014 ${r.to}

${r.rows.map((x) => `${x.d}  ${x.t}  ${x.plus ? "+" + x.plus : "\u2212" + x.minus}`).join("\n")}

\u041F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E: ${r.plus} \u0433\u0440\u043D \xB7 \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E: ${r.minus} \u0433\u0440\u043D \xB7 \u0421\u0430\u043B\u044C\u0434\u043E (\u043D\u0430\u0448 \u0431\u043E\u0440\u0433): ${r.saldo} \u0433\u0440\u043D`;
      const w = await modal({ title: "\u{1F4C4} \u0410\u043A\u0442 \u0437\u0432\u0456\u0440\u043A\u0438", body: `<div class="kv"><span>\u041F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E</span><b class="money">${money(r.plus)}</b></div><div class="kv"><span>\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</span><b class="money">${money(r.minus)}</b></div><div class="kv tot"><span>\u0421\u0430\u043B\u044C\u0434\u043E \u2014 \u043D\u0430\u0448 \u0431\u043E\u0440\u0433</span><b class="money ${r.saldo > 0 ? "neg" : "good"}">${money(r.saldo)}</b></div><div class="sk-jr">${r.rows.map((x) => `<div class="kv"><span>${dm(x.d)} \xB7 ${esc(x.t)}</span><b class="${x.plus ? "" : "good"}">${x.plus ? "+" + money(x.plus) : "\u2212" + money(x.minus)}</b></div>`).join("") || '<div class="muted">\u0417\u0430 \u043F\u0435\u0440\u0456\u043E\u0434 \u043D\u0456\u0447\u043E\u0433\u043E</div>'}</div>`, buttons: [{ label: "\u{1F4E4} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 / \u0441\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438", val: "go", cls: "primary" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
      if (w === "go") await supShare(txt, "\u0410\u043A\u0442 \u0437\u0432\u0456\u0440\u043A\u0438");
      return;
    }
    if (v === "edit") return supEdit(p);
    if (v === "merge") {
      const l = ((_d = S.data.skSup) == null ? void 0 : _d.list.filter((x) => x.id !== id)) || [];
      if (!l.length) return toast("\u041D\u0435\u043C\u0430\u0454 \u0437 \u043A\u0438\u043C \u043E\u0431\u02BC\u0454\u0434\u043D\u0430\u0442\u0438");
      const o = await choose(`\u{1F517} ${p.n} \u2014 \u0446\u0435 \u0442\u043E\u0439 \u0441\u0430\u043C\u0438\u0439, \u0449\u043E\u2026`, "\u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u0439 \u043D\u0430\u0437\u0432\u0438 \u043F\u0435\u0440\u0435\u0439\u0434\u0443\u0442\u044C \u0443 \u0446\u0435\u0439 \u043F\u0440\u043E\u0444\u0456\u043B\u044C, \u0434\u0443\u0431\u043B\u0456\u043A\u0430\u0442 \u0437\u043D\u0438\u043A\u043D\u0435", l.map((x) => ({ label: x.n, val: x.id })));
      if (!o) return supOpen(id);
      if (await act("skSupMerge", { to: id, from: o }, "\u{1F517} \u041E\u0431\u02BC\u0454\u0434\u043D\u0430\u043D\u043E")) {
        await supLoad();
        return supOpen(id);
      }
    }
  }
  async function supEdit(p = {}) {
    const F = [["n", "\u041D\u0430\u0437\u0432\u0430 (\u044F\u043A \u0443 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445)"], ["legal", "\u042E\u0440\u0438\u0434\u0438\u0447\u043D\u0430 \u043D\u0430\u0437\u0432\u0430 (\u0424\u041E\u041F / \u0422\u041E\u0412)"], ["code", "\u0404\u0414\u0420\u041F\u041E\u0423 / \u0406\u041F\u041D"], ["iban", p.iban ? "IBAN \u2014 \u043D\u043E\u0432\u0438\u0439 \u0434\u043E\u0434\u0430\u0441\u0442\u044C\u0441\u044F, \u0441\u0442\u0430\u0440\u0438\u0439 \u043B\u0438\u0448\u0438\u0442\u044C\u0441\u044F \u0432 \u0441\u043F\u0438\u0441\u043A\u0443" : "IBAN (UA + 27 \u0446\u0438\u0444\u0440)"], ["phone", "\u0422\u0435\u043B\u0435\u0444\u043E\u043D"], ["mgr", "\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440"], ["msg", "Viber / Telegram (\u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0430\u0431\u043E \u043D\u043E\u043C\u0435\u0440)"], ["addr", "\u0410\u0434\u0440\u0435\u0441\u0430"], ["days", "\u0414\u043D\u0456 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438 (\u043D\u0430\u043F\u0440. \u043F\u043D, \u0447\u0442)"], ["term", "\u0412\u0456\u0434\u0441\u0442\u0440\u043E\u0447\u043A\u0430 \u043E\u043F\u043B\u0430\u0442\u0438, \u0434\u043D\u0456\u0432 (0 \u2014 \u043E\u0434\u0440\u0430\u0437\u0443)"], ["note", "\u041F\u0440\u0438\u043C\u0456\u0442\u043A\u0438"]];
    const v = await modal({ title: p.id ? "\u270F\uFE0F " + esc(p.n) : "\u2795 \u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A", body: `<div class="form">${F.map(([k, l]) => {
      var _a2;
      return `<label class="muted" style="font-size:12px">${l}<input id="sp_${k}" value="${esc((_a2 = p[k]) != null ? _a2 : "")}" ${k === "term" ? 'inputmode="numeric"' : ""}></label>`;
    }).join("")}</div>`, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: 1, cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (!v) {
      closeModal();
      return p.id ? supOpen(p.id) : null;
    }
    const b = { id: p.id };
    for (const [k] of F) b[k] = $("#sp_" + k).value;
    closeModal();
    if (!b.n.trim()) return toast("\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443");
    const r = await act("skSupSave", { p: b }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E");
    if (r) {
      await supLoad();
      supOpen(r.p.id);
    } else return supEdit(__spreadValues(__spreadValues({}, p), b));
  }
  async function supPrices() {
    const r = await act("skSupPrices");
    if (!r) return;
    await modal({ title: "\u2696\uFE0F \u041F\u043E\u0440\u0456\u0432\u043D\u044F\u043D\u043D\u044F \u0446\u0456\u043D", body: r.list.length ? `<div class="muted set-note">\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u0438, \u044F\u043A\u0456 \u0432\u043E\u0437\u044F\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0430 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0456\u0432: \u043E\u0441\u0442\u0430\u043D\u043D\u044F \u0446\u0456\u043D\u0430 \u0432 \u043A\u043E\u0436\u043D\u043E\u0433\u043E (\u0437 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0438\u0445 \u0437\u0430 \u0440\u0456\u043A). \u0417\u0432\u0435\u0440\u0445\u0443 \u2014 \u0434\u0435 \u0440\u0456\u0437\u043D\u0438\u0446\u044F \u043D\u0430\u0439\u0431\u0456\u043B\u044C\u0448\u0430.</div>${r.list.slice(0, 60).map((e) => `<div class="card" style="padding:10px 12px;margin-bottom:6px"><b>${esc(e.n)}</b> <small class="muted">\xB7 \u0440\u0456\u0437\u043D\u0438\u0446\u044F ${money(e.save)}/${e.u}</small>${e.by.map((x, i) => `<div class="kv"><span>${i ? "" : "\u2705 "}${esc(x.s)} <small class="muted">${dm(x.day)}</small></span><b class="${i ? "" : "good"}">${money(x.p)}/${e.u}</b></div>`).join("")}</div>`).join("")}` : '<div class="muted">\u041F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0456\u0432, \u044F\u043A\u0456 \u0432\u043E\u0437\u044F\u0442\u044C \u043A\u0456\u043B\u044C\u043A\u0430 \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0456\u0432.</div>', buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || !/^sup[A-Z]/.test(el.dataset.a)) return;
    const a = el.dataset.a;
    if (a === "supOpen") supOpen(el.dataset.id);
    if (a === "supNew") supEdit();
    if (a === "supPrices") supPrices();
    if (a === "supMake") {
      const r = await act("skSupSave", { p: { n: el.dataset.n } }, "\u2795 \u041F\u0440\u043E\u0444\u0456\u043B\u044C \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E");
      if (r) {
        await supLoad();
        supOpen(r.p.id);
      }
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
      var _a2, _b2;
      return s.role !== "courier" && !(G.hide || []).includes(s.name) && (((_a2 = s.pay) == null ? void 0 : _a2.rate) || ((_b2 = s.pay) == null ? void 0 : _b2.pct) || (G.seen || []).includes(s.name) || G.days.some((d) => {
        var _a3, _b3;
        return ((_a3 = G.att[d]) == null ? void 0 : _a3[s.name]) || ((_b3 = G.plan[d]) == null ? void 0 : _b3[s.name]);
      }));
    }).map((s) => s.name);
    const rows = G.rows.filter((r) => people.includes(r.n) || r.paid || r.adv || r.bonus || r.fine), due = rows.reduce((a, r) => a + Math.max(0, r.due), 0), pend = rows.reduce((a, r) => a + r.pending, 0);
    const HR = ["grid", "pay", "ops", "eff"], hr = modOn("hr"), TABS2 = [["grid", "\u{1F4C5} \u0413\u0440\u0430\u0444\u0456\u043A"], ["pay", "\u{1F4B0} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430"], ["ops", "\u{1F9FE} \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457"], ["eff", "\u{1F4CA} \u0415\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u0456\u0441\u0442\u044C"], ["plan", "\u{1F4CB} \u041F\u043B\u0430\u043D"], ["people", "\u{1F465} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438"], ["ideas", "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F"]].filter(([k]) => hr || !HR.includes(k));
    const tab = TABS2.some(([k]) => k === S.zpTab) ? S.zpTab : hr ? "grid" : "people";
    const top = `<div class="zp-top"><button class="btn sm" data-a="zpM" data-d="-1">\u25C0</button><b>${monName(G.m)}</b><button class="btn sm" data-a="zpM" data-d="1">\u25B6</button></div>
      ${["pay", "ops", "eff"].includes(tab) ? `<div class="kpis"><div class="kpi accent"><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(due)}</b></div><div class="kpi"><span>\u0424\u043E\u043D\u0434 \u043E\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(G.fund)}</b><small class="muted">${G.fundPct}% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438</small></div>
        <div class="kpi"><span>\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u043C\u0456\u0441\u044F\u0446\u044F</span><b class="money">${money(G.revenue)}</b></div><div class="kpi ${pend ? "red press" : ""}"${pend ? ' data-a="zpPend"' : ""}><span>\u0427\u0435\u043A\u0430\u0454 \u2705</span><b>${pend}</b><small class="muted">${pend ? "\u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C, \u0449\u043E\u0431 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438" : "\u0443\u0441\u0435 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E"}</small></div></div>
` : ""}
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
            ${S.zpDet = S.zpDet || {}, S.zpDet[r.id] = `${ln(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${r.shifts} \u0437\u043C\u0456\u043D${r.hours ? ` (${r.hours} \u0433\u043E\u0434)` : ""}`, money(r.rate))}${r.pct ? ln(`% \u0432\u0456\u0434 ${money(r.baseSum)}`, money(r.pct)) : ""}${r.dlv ? ln(`\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \xD7 ${r.dlvN}`, money(r.dlv)) : ""}${r.dayB || r.monB ? ln("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(r.dayB + r.monB)) : ""}${r.bonus ? ln("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(r.bonus), "good") : ""}${r.fine ? ln("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(r.fine), "bad") : ""}${r.adv ? ln("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(r.adv)) : ""}${r.paid ? ln("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(r.paid)) : ""}
              ${r.toMon ? `<div class="muted" style="font-size:12px">\u{1F3AF} \u0434\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(r.toMon)}</div>` : ""}${r.tips ? `<div class="muted" style="font-size:12px">\u{1F49D} \u0447\u0430\u0439\u043E\u0432\u0456 \u043E\u043A\u0440\u0435\u043C\u043E: ${money(r.tips)}</div>` : ""}${r.late || r.absent ? `<div class="warn" style="font-size:12px">${r.late ? `\u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u044C ${r.late}` : ""}${r.late && r.absent ? " \xB7 " : ""}${r.absent ? `\u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B\u0456\u0432 ${r.absent}` : ""}</div>` : ""}
              `, ""}${open2 ? `<div class="zp-det"><div class="zp-det-b"><button class="btn sm" data-a="zpOpN" data-t="bonus" data-n="${esc(r.n)}">\u2795 \u041F\u0440\u0435\u043C\u0456\u044F</button><button class="btn sm" data-a="zpOpN" data-t="fine" data-n="${esc(r.n)}">\u2796 \u0428\u0442\u0440\u0430\u0444</button><button class="btn sm" data-a="zpOpN" data-t="adv" data-n="${esc(r.n)}">\u{1F4B5} \u0410\u0432\u0430\u043D\u0441</button><button class="btn sm" data-a="zpSet" data-id="${r.id}">\u2699\uFE0F \u0421\u0442\u0430\u0432\u043A\u0430</button></div></div>` : ""}`;
      }).join("") || '<div class="muted">\u041D\u0435\u043C\u0430\u0454 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0456\u0432 \u0443 \u0433\u0440\u0430\u0444\u0456\u043A\u0443</div>'}
        <div class="muted" style="font-size:12px;margin-top:8px">\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0440\u044F\u0434\u043E\u043A \u2014 \u043F\u0440\u0435\u043C\u0456\u044F, \u0448\u0442\u0440\u0430\u0444, \u0430\u0432\u0430\u043D\u0441, \u0441\u0442\u0430\u0432\u043A\u0430 (\u0443 \xAB\u2699\uFE0F \u0421\u0442\u0430\u0432\u043A\u0430\xBB \u2014 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u0430 \u043F\u0435\u0440\u0456\u043E\u0434). \u{1F4B8} \u2014 \u0432\u0438\u0434\u0430\u0442\u0438 \u0432\u0435\u0441\u044C \u0437\u0430\u043B\u0438\u0448\u043E\u043A (\u0437 \u043A\u0430\u0441\u0438 \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u0438).</div></div>`;
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
      var _a2, _b2;
      const a = (_a2 = G.att[d]) == null ? void 0 : _a2[n], p = (_b2 = G.plan[d]) == null ? void 0 : _b2[n], h = hrs(a);
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
    var _a2, _b2, _c, _d;
    const G = S.data.zp, a = (_a2 = G.att[d]) == null ? void 0 : _a2[n], p = (_b2 = G.plan[d]) == null ? void 0 : _b2[n], fine = (_c = G.cfg) == null ? void 0 : _c.lateFine;
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
    var _a2, _b2;
    const s = S.data.zp.staff.find((x) => x.id === id), p = (s == null ? void 0 : s.pay) || {};
    if (!s) return;
    const body = `<div class="form"><div class="frow"><label>\u0421\u0442\u0430\u0432\u043A\u0430 \u0437\u0430 \u0437\u043C\u0456\u043D\u0443, \u20B4<input id="zR" inputmode="numeric" value="${p.rate || ""}" placeholder="\u043D\u0430\u043F\u0440. 600"></label><label>% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438<input id="zP" inputmode="decimal" value="${p.pct || ""}" placeholder="\u043D\u0430\u043F\u0440. 2"></label></div>
      <label>\u0412\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434<select id="zB"><option value="all" ${p.base !== "own" && p.base !== "kitchen" ? "selected" : ""}>\u0443\u0441\u0456\u0454\u0457 \u0432\u0438\u0440\u0443\u0447\u043A\u0438 \u0434\u043D\u044F (\u0437\u0430 \u0434\u043D\u0456 \u043D\u0430 \u0437\u043C\u0456\u043D\u0456)</option><option value="own" ${p.base === "own" ? "selected" : ""}>\u0441\u0432\u043E\u0457\u0445 \u0447\u0435\u043A\u0456\u0432 (\u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u0441\u0442\u043E\u043B\u0430)</option><option value="kitchen" ${p.base === "kitchen" ? "selected" : ""}>\u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 \u043A\u0443\u0445\u043D\u0456</option></select></label>
      <div class="muted" style="font-size:12px">\u{1F3AF} \u041F\u043B\u0430\u043D \u043F\u0440\u043E\u0434\u0430\u0436\u0456\u0432 (\u0432\u0456\u0434 \u0442\u0456\u0454\u0457 \u0436 \u0431\u0430\u0437\u0438) \u2014 \u043D\u0435\u043E\u0431\u043E\u0432\u02BC\u044F\u0437\u043A\u043E\u0432\u043E:</div>
      <div class="frow"><label>\u0417\u0430 \u0437\u043C\u0456\u043D\u0443 \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zDR" inputmode="numeric" value="${p.dayRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zDB" inputmode="numeric" value="${p.dayBonus || ""}"></label></div>
      <div class="frow"><label>\u0417\u0430 \u043C\u0456\u0441\u044F\u0446\u044C \u0431\u0456\u043B\u044C\u0448\u0435, \u20B4<input id="zMR" inputmode="numeric" value="${p.monRev || ""}"></label><label>\u2192 \u0431\u043E\u043D\u0443\u0441, \u20B4<input id="zMB" inputmode="numeric" value="${p.monBonus || ""}"></label></div>
      <label>\u{1F6F5} \u0417\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443, \u20B4 (\u043A\u0443\u0440'\u0454\u0440\u0443; \u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u044F\u043A \u0443 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u0445)<input id="zDl" inputmode="numeric" value="${(_a2 = p.dlv) != null ? _a2 : ""}"></label>${((_b2 = S.zpDet) == null ? void 0 : _b2[id]) ? `<details class="zp-hist"><summary>\u{1F4DC} \u0420\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0437\u0430 \u043F\u0435\u0440\u0456\u043E\u0434</summary>${S.zpDet[id]}</details>` : ""}</div>`;
    const v = await modal({ title: `\u2699\uFE0F ${s.name}: \u0441\u0442\u0430\u0432\u043A\u0430`, body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    const g = (i) => $("#" + i).value.replace(",", "."), pay = v === "ok" ? { rate: g("zR"), pct: g("zP"), base: $("#zB").value, dayRev: g("zDR"), dayBonus: g("zDB"), monRev: g("zMR"), monBonus: g("zMB"), dlv: $("#zDl").value.trim() } : null;
    closeModal();
    if (pay && await act("zpStaff", { id, pay }, "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) loadView();
  }
  async function zpOpN(t, n, preset) {
    const T2 = { bonus: "\u2795 \u041F\u0440\u0435\u043C\u0456\u044F", fine: "\u2796 \u0428\u0442\u0440\u0430\u0444", adv: "\u{1F4B5} \u0410\u0432\u0430\u043D\u0441", paid: "\u{1F4B8} \u0412\u0438\u0434\u0430\u0442\u0438 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0443" }[t], money_ = t === "adv" || t === "paid";
    const body = `<div class="form"><label>\u0421\u0443\u043C\u0430, \u20B4<input id="oS" inputmode="numeric" value="${preset || ""}"></label><input id="oN" placeholder="${t === "fine" ? "\u0417\u0430 \u0449\u043E (\u043D\u0430\u043F\u0440. \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F)" : "\u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440"}"></div>`;
    const v = await modal({ title: `${T2} \xB7 ${n}`, body, buttons: money_ ? [{ label: "\u{1F4B5} \u0417 \u043A\u0430\u0441\u0438", val: "cash", cls: "primary" }, { label: "\u{1F4B3} \u0417 \u043A\u0430\u0440\u0442\u043A\u0438", val: "card", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }] : [{ label: "OK", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
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
  async function thrMy(hid) {
    var _a2;
    const l = (_a2 = await act("ideaThr", {})) == null ? void 0 : _a2.list;
    if (!l) return;
    const tm = (t) => new Date(t).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    if (!hid) {
      const v2 = await modal({ title: "\u{1F4AC} \u0417\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0434\u043E ATOM", body: l.length ? l.map((x2) => `<button class="kv thr-r" data-mi-v="${x2.hid}" style="width:100%;text-align:left"><span style="min-width:0;overflow-wrap:anywhere">${x2.unr ? "\u{1F534} " : ""}${x2.kind === "help" ? "\u{1F198}" : "\u{1F4A1}"} ${esc(x2.text.slice(0, 90))}<br><small class="muted">${tm(x2.at)}${x2.chat.length ? ` \xB7 \u{1F4AC} ${x2.chat.length}` : ""}</small></span></button>`).join("") : '<div class="muted">\u041F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454. \u041D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \xAB\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F\xBB \u0430\u0431\u043E \xAB\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430\xBB \u0432 \u043F\u0440\u043E\u0444\u0456\u043B\u0456 \u2014 \u0442\u0443\u0442 \u0431\u0443\u0434\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C.</div>', buttons: [{ label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
      if (v2) return thrMy(v2);
      return;
    }
    const x = l.find((y) => y.hid === hid);
    if (!x) return;
    if (x.unr) act("ideaSeen", { hid }).catch(() => {
    });
    const bub = (who, t, at, mine) => `<div class="thr-b${mine ? " me" : ""}"><small class="muted">${who} \xB7 ${tm(at)}</small><div>${esc(t)}</div></div>`;
    const body = `<div class="thr">${bub(esc(x.by), x.text, x.at, 1)}${x.chat.map((c) => bub(c.from === "a" ? "\u{1F451} ATOM" : esc(c.by || x.by), c.text, c.at, c.from !== "a")).join("")}</div>`;
    const v = await modal({ title: x.kind === "help" ? "\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430" : "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F", body, buttons: [{ label: "\u270D\uFE0F \u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0441\u0442\u0438", val: "say" }, { label: "\u2190 \u041D\u0430\u0437\u0430\u0434", val: "back" }] });
    if (v === "back") return thrMy();
    if (v !== "say") return;
    const text = await ask("\u270D\uFE0F \u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0434\u043B\u044F ATOM", "\u0414\u0435\u0442\u0430\u043B\u0456, \u0441\u043A\u0440\u0456\u043D\u0448\u043E\u0442 \u043E\u043F\u0438\u0441\u043E\u043C, \u044F\u043A \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0438\u2026");
    if (!text) return thrMy(hid);
    if (await act("ideaSay", { hid, text }, "\u{1F4AC} \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E")) thrMy(hid);
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
  function supTg(sp) {
    if (!sp.url) return toast("Telegram-\u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0430 \u0449\u0435 \u043D\u0435 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u2014 \u043D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u0443 \xAB\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430\xBB");
    const u = /^https:\/\/t\.me\/[a-z0-9_]+bot$/i.test(sp.url) && VENUE ? sp.url + "?start=v_" + VENUE : sp.url;
    window.open(u, "_blank", "noopener");
    toast("\u{1F6DF} \u041F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0430 " + sp.hrs);
  }
  async function zpMy() {
    var _a2, _b2, _c, _d, _e;
    const r = await act("zpMy", {});
    if (!r) return;
    const w = r.row, me = (_a2 = S.me) == null ? void 0 : _a2.name;
    const lnx = (l, v2) => `<div class="kv"><span>${l}</span><b class="money">${v2}</b></div>`;
    const asks = r.swaps.filter((s) => s.to === me && s.st === "ask");
    const shiftH = `<div class="zp-shift">${onShift() ? `<button class="btn red" data-a="zpOut">\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button><span class="muted">\u043D\u0430 \u0437\u043C\u0456\u043D\u0456 \u0437 ${hhK(S.myAtt.in)}${S.myAtt.ok === 0 ? " \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F" : " \xB7 \u2705"}</span>` : `<button class="btn green" data-a="zpIn">\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443</button>${((_b2 = S.myAtt) == null ? void 0 : _b2.out) ? `<span class="muted">\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 ${hhK(S.myAtt.in)}\u2013${hhK(S.myAtt.out)}</span>` : ""}`}</div>`;
    await loadMyTasks();
    const avH = `<div class="my-av"><button class="my-av-b" data-a="zpAv" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u0444\u043E\u0442\u043E">${VVAV.html((_c = S.me) == null ? void 0 : _c.av, me)}<em>\u{1F4F7}</em></button><div><b>${esc(me)}</b><div class="muted" style="font-size:12px">\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0444\u043E\u0442\u043E, \u0449\u043E\u0431 \u0437\u043C\u0456\u043D\u0438\u0442\u0438${((_d = S.me) == null ? void 0 : _d.av) ? ' \xB7 <button class="linkb" data-a="zpAvDel">\u043F\u0440\u0438\u0431\u0440\u0430\u0442\u0438</button>' : ""}</div></div></div>`;
    const body = avH + shiftH + `<div id="myTasks">${myTasksHTML()}</div>${w ? `<div class="pills zp-my"><div class="pill"><span>\u0417\u043C\u0456\u043D</span><b>${w.shifts}</b><small>${w.hours ? w.hours + " \u0433\u043E\u0434" : ""}</small></div><div class="pill"><span>\u0417\u0430\u0440\u043E\u0431\u043B\u0435\u043D\u043E</span><b class="money">${money(w.earned)}</b></div><div class="pill"><span>\u0414\u043E \u0432\u0438\u043F\u043B\u0430\u0442\u0438</span><b class="money">${money(w.due)}</b></div><div class="pill"><span>\u{1F49D} \u041C\u043E\u0457 \u0447\u0430\u0439\u043E\u0432\u0456</span><b class="money">${money(((_e = S.myTip) == null ? void 0 : _e.sum) || 0)}</b><small>${w.tips ? `\u0437\u0430 \u043C\u0456\u0441\u044F\u0446\u044C ${money(w.tips)}` : "\u0449\u0435 \u043D\u0435 \u0432\u0438\u0434\u0430\u043D\u043E"}</small></div></div>
      ${lnx(`\u0421\u0442\u0430\u0432\u043A\u0430 \xD7 ${w.shifts}`, money(w.rate))}${w.pct ? lnx("% \u0432\u0456\u0434 \u0432\u0438\u0440\u0443\u0447\u043A\u0438", money(w.pct)) : ""}${w.dayB || w.monB ? lnx("\u{1F3AF} \u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043B\u0430\u043D", money(w.dayB + w.monB)) : ""}${w.bonus ? lnx("\u2795 \u041F\u0440\u0435\u043C\u0456\u0457", money(w.bonus)) : ""}${w.fine ? lnx("\u2796 \u0428\u0442\u0440\u0430\u0444\u0438", "\u2212" + money(w.fine)) : ""}${w.adv ? lnx("\u{1F4B5} \u0410\u0432\u0430\u043D\u0441\u0438", "\u2212" + money(w.adv)) : ""}${w.paid ? lnx("\u{1F4B8} \u0412\u0438\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u2212" + money(w.paid)) : ""}
      ${w.toMon ? `<div class="muted" style="font-size:13px;margin-top:6px">\u{1F3AF} \u0414\u043E \u043C\u0456\u0441\u044F\u0447\u043D\u043E\u0433\u043E \u0431\u043E\u043D\u0443\u0441\u0443 \u0449\u0435 ${money(w.toMon)}</div>` : ""}` : '<div class="muted">\u0421\u0442\u0430\u0432\u043A\u0443 \u0449\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E</div>'}
      ${asks.map((s) => `<div class="card zp-ask">\u{1F501} <b>${esc(s.from)}</b> \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u0438\u0439\u0442\u0438 \u0437\u0430 \u043D\u044C\u043E\u0433\u043E ${s.day.slice(8)}.${s.day.slice(5, 7)} \u043E ${s.time}<div class="btnrow"><button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="agree">\u041F\u043E\u0433\u043E\u0434\u0436\u0443\u044E\u0441\u044C</button><button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">\u041D\u0456</button></div></div>`).join("")}
      <h3 style="margin:14px 0 6px">\u0413\u0440\u0430\u0444\u0456\u043A \xB7 ${monName(r.m)}</h3>${gridHTML(r.grid, r.grid.people, false, me)}<div class="muted" style="font-size:11px;margin-top:4px">\u2705 \u0431\u0443\u0432 \xB7 \u25CF \u0437\u0430\u043F\u043B\u0430\u043D\u043E\u0432\u0430\u043D\u043E \xB7 \u{1F553} \u0447\u0435\u043A\u0430\u0454 \xB7 \u23F0 \u0437\u0430\u043F\u0456\u0437\u043D\u0435\u043D\u043D\u044F \xB7 \u{1F6AB} \u043F\u0440\u043E\u0433\u0443\u043B</div>
      ${r.swaps.filter((s) => s.from === me).map((s) => `<div class="muted" style="font-size:12px">\u{1F501} ${s.day.slice(8)}.${s.day.slice(5, 7)} \u2192 ${esc(s.to)}: ${s.st === "ask" ? "\u0447\u0435\u043A\u0430\u0454 \u0437\u0433\u043E\u0434\u0438" : "\u0447\u0435\u043A\u0430\u0454 \u0430\u0434\u043C\u0456\u043D\u0430"}</div>`).join("")}`;
    const v = await modal({ title: `\u{1F464} ${me}`, body, buttons: [{ label: "\u{1F3A8} \u041C\u0456\u0439 \u0432\u0438\u0433\u043B\u044F\u0434", val: "look" }, { label: "\u{1F501} \u041F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0438 \u043E\u0431\u043C\u0456\u043D", val: "swap" }, { label: "\u{1F514} \u0421\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F", val: "push" }, { label: "\u{1F4AC} \u0417\u0432'\u044F\u0437\u043E\u043A \u0437 ATOM", val: "atom" }, { label: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", val: null }] });
    if (v === "look") {
      S.view = "mylook";
      renderNav();
      renderMain();
      return;
    }
    if (v === "push") return pushMenu();
    if (v === "atom") {
      const sp = fetch(API.replace(/\/v\/[^/]+$/, "") + "/api/sup").then((r2) => r2.json()).catch(() => ({}));
      const c = await choose("\u{1F4AC} \u0417\u0432'\u044F\u0437\u043E\u043A \u0437 ATOM", "\u0420\u043E\u0437\u0440\u043E\u0431\u043D\u0438\u043A \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454 \u0442\u0443\u0442, \u0443 \u043A\u0430\u0441\u0456", [{ label: "\u{1F198} \u0414\u043E\u043F\u043E\u043C\u043E\u0433\u0430 \u2014 \u0449\u043E\u0441\u044C \u043D\u0435 \u043F\u0440\u0430\u0446\u044E\u0454", val: "help" }, { label: "\u{1F4A1} \u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u2014 \u0449\u043E \u043F\u043E\u043A\u0440\u0430\u0449\u0438\u0442\u0438", val: "idea" }, { label: "\u{1F4AC} \u041C\u043E\u0457 \u0437\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0439 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456", val: "thr" }, { label: "\u{1F6DF} \u041F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0430 \u0432 Telegram", val: "tg" }]);
      if (c === "tg") return supTg(await sp);
      if (c === "idea") return ideasMy();
      if (c === "help") return helpAsk();
      if (c === "thr") return thrMy();
      return;
    }
    if (v === "idea") return ideasMy();
    if (v === "help") return helpAsk();
    if (v === "thr") return thrMy();
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
    var _a2, _b2, _c;
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
      case "zpAv": {
        const p = VVAV.pick();
        (async () => {
          const d = await p;
          if (!d) return;
          const r = await act("avatar", { data: d }, "\u{1F4F7} \u0424\u043E\u0442\u043E \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
          if (r) {
            S.me = __spreadProps(__spreadValues({}, S.me), { av: r.av });
            store.set("me", S.me);
            closeModal();
            renderNav();
            zpMy();
          }
        })();
        break;
      }
      case "zpAvDel": {
        (async () => {
          const r = await act("avatar", { data: "" }, "\u{1F5D1} \u0424\u043E\u0442\u043E \u043F\u0440\u0438\u0431\u0440\u0430\u043D\u043E");
          if (r) {
            S.me = __spreadProps(__spreadValues({}, S.me), { av: "" });
            store.set("me", S.me);
            closeModal();
            renderNav();
            zpMy();
          }
        })();
        break;
      }
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
          const x = (_b2 = S.data.ideas) == null ? void 0 : _b2.find((y) => y.id === D.id);
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
    if (!el || !/^stf(Name|Pin|Role|Perm)$/.test(el.dataset.a)) return;
    const s = (((_a2 = S.data.staff) == null ? void 0 : _a2.staff) || []).find((x) => x.id === el.dataset.id);
    if (!s) return;
    if (el.dataset.a === "stfPerm") return staffPerms(s);
    let f = null;
    if (el.dataset.a === "stfName") {
      const v = await askVal("\u270F\uFE0F \u041D\u043E\u0432\u0435 \u0456\u043C\u02BC\u044F (\u0433\u0440\u0430\u0444\u0456\u043A, \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 \u0439 \u0447\u0430\u0439\u043E\u0432\u0456 \u043F\u0435\u0440\u0435\u0439\u0434\u0443\u0442\u044C)", s.name);
      if (v && v.trim() !== s.name) f = { name: v.trim() };
    }
    if (el.dataset.a === "stfPin") {
      const v = await ask(`\u{1F511} \u041D\u043E\u0432\u0438\u0439 PIN: ${s.name}`, "4 \u0446\u0438\u0444\u0440\u0438 (\u0430\u0434\u043C\u0456\u043D \u2014 6\u20138) \xB7 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u0432\u0438\u0439\u0434\u0435 \u0437 \u043A\u0430\u0441\u0438", "tel");
      if (v) f = { pin: String(v) };
    }
    if (el.dataset.a === "stfRole") {
      const v = await choose(`\u{1F504} \u0420\u043E\u043B\u044C: ${s.name}`, "\u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u0432\u0438\u0439\u0434\u0435 \u0437 \u043A\u0430\u0441\u0438 \u2014 \u0443\u0432\u0456\u0439\u0434\u0435 \u0437\u043D\u043E\u0432\u0443 \u0437 \u043D\u043E\u0432\u0438\u043C\u0438 \u043F\u0440\u0430\u0432\u0430\u043C\u0438", ROLES.filter(([r]) => r !== (s.role || "waiter")).map(([val, label]) => ({ label, val })));
      if (v) f = { role: v };
    }
    if (f && await act("staffEdit", __spreadValues({ id: s.id }, f), f.name ? "\u270F\uFE0F \u0406\u043C\u02BC\u044F \u0437\u043C\u0456\u043D\u0435\u043D\u043E" : f.pin ? "\u{1F511} PIN \u0437\u043C\u0456\u043D\u0435\u043D\u043E" : "\u{1F504} \u0420\u043E\u043B\u044C \u0437\u043C\u0456\u043D\u0435\u043D\u043E")) loadView();
  });
  async function staffPerms(s) {
    var _a2, _b2, _c, _d;
    const P = ((_a2 = S.data.staff) == null ? void 0 : _a2.perms) || [], SENS = ((_b2 = S.data.staff) == null ? void 0 : _b2.sens) || [], cur = s.perm || {}, adm = s.role === "admin", on2 = (k) => adm ? cur[k] !== 0 : cur[k] === 1;
    const body = `<div class="scrollbox" style="max-height:55vh">${P.map((p) => `<div class="kv"><span>${p.e} ${esc(p.n)}${SENS.includes(p.k) && !adm ? ' <small class="muted">\xB7 \u0437 PIN 6+</small>' : ""}</span><label class="switch"><input type="checkbox" data-pk="${p.k}" ${on2(p.k) ? "checked" : ""}><i></i></label></div>`).join("")}
      <div class="kv"><span>\u{1F3F7} \u041C\u0430\u043A\u0441. \u0437\u043D\u0438\u0436\u043A\u0430, %<br><small class="muted">\u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E \u2014 \u0437\u0430 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u043C \u0437\u0430\u043A\u043B\u0430\u0434\u0443</small></span><input id="pkDisc" type="number" min="0" max="100" inputmode="numeric" value="${(_c = cur.discountMax) != null ? _c : ""}" style="width:80px"></div></div>`;
    const v = await modal({ title: `\u{1F511} \u041F\u0440\u0430\u0432\u0430: ${s.name}`, text: adm ? "\u0410\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u0430\u0454 \u0432\u0441\u0456 \u043F\u0440\u0430\u0432\u0430 \u2014 \u0437\u043D\u0456\u043C\u0456\u0442\u044C \u0437\u0430\u0439\u0432\u0435." : "\u0420\u043E\u043B\u044C \u0434\u0430\u0454 \u0437\u0432\u0438\u0447\u043D\u0456 \u0434\u0456\u0457; \u0433\u0430\u043B\u043E\u0447\u043A\u0438 \u0434\u043E\u0434\u0430\u044E\u0442\u044C \u043F\u043E\u043D\u0430\u0434 \u043D\u0438\u0445. \u0417\u043C\u0456\u043D\u0430 \u0434\u0456\u0454 \u043E\u0434\u0440\u0430\u0437\u0443.", body, buttons: [{ label: "\u{1F4BE} \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438", val: "ok", cls: "primary" }, { label: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438", val: null }], keep: true });
    if (v !== "ok") return;
    const perm = {};
    document.querySelectorAll("#modal [data-pk]").forEach((i) => {
      perm[i.dataset.pk] = i.checked ? 1 : 0;
    });
    const dm2 = (_d = $("#pkDisc")) == null ? void 0 : _d.value;
    if (dm2 !== "" && dm2 != null) perm.discountMax = +dm2;
    closeModal();
    let pin2;
    if (!adm && SENS.some((k) => perm[k] === 1 && cur[k] !== 1)) {
      pin2 = await ask(`\u{1F511} \u041D\u043E\u0432\u0438\u0439 PIN: ${s.name}`, "\u0414\u043B\u044F \u0442\u0430\u043A\u0438\u0445 \u043F\u0440\u0430\u0432 \u2014 6\u20138 \u0446\u0438\u0444\u0440 \xB7 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430 \u0432\u0438\u0439\u0434\u0435 \u0437 \u043A\u0430\u0441\u0438", "tel");
      if (!pin2) return;
    }
    if (await act("staffPerm", __spreadValues({ id: s.id, perm }, pin2 ? { pin: String(pin2) } : {}), "\u{1F511} \u041F\u0440\u0430\u0432\u0430 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")) loadView();
  }
  const zpSL = {};
  new MutationObserver(() => document.querySelectorAll(".zp-grid:not([data-c])").forEach((g) => {
    var _a2;
    g.dataset.c = 1;
    const k = (g.closest("#modal") ? "m" : "v") + (S.zpM || ""), td = g.querySelector("thead th.td");
    if (zpSL[k] != null) g.scrollLeft = zpSL[k];
    else if (td && g.scrollWidth > g.clientWidth) {
      const st = ((_a2 = g.querySelector("tbody th")) == null ? void 0 : _a2.offsetWidth) || 0;
      g.scrollLeft = td.offsetLeft - st - (g.clientWidth - st) / 2 + td.offsetWidth / 2;
    }
    g.addEventListener("scroll", () => {
      zpSL[k] = g.scrollLeft;
    }, { passive: true });
  })).observe(document.body, { childList: true, subtree: true });
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
    const l = D.list, ok2 = l.filter((t) => t.st === "done").length, past = day < todayK(), shift = (n) => {
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
        ${l.length ? `<div class="kpis"><div class="kpi accent"><span>\u0412\u0438\u043A\u043E\u043D\u0430\u043D\u043E</span><b>${ok2} \u0437 ${l.length}</b><small class="muted">${Math.round(ok2 / l.length * 100)}%</small></div>${Object.entries(by).map(([n, [a, b]]) => `<div class="kpi"><span>${esc(n)}</span><b>${a}/${b}</b></div>`).join("")}</div>` : ""}
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
  const COURSE_VID = [];
  const V = (v) => ["view", { v }], T = (a, k, v) => [a, { [k]: v }];
  const CR = [
    // ---------- 🧑‍🍳 офіціант (і всі, хто працює в залі) ----------
    { id: "w-table", r: "w", g: "\u0417\u0430\u043B", ic: "\u{1FA91}", n: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0441\u0442\u0456\u043B \u0456 \u0434\u043E\u0434\u0430\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0438", s: [
      { t: "\u0426\u0435 \u0437\u0430\u043B \u2014 \u043F\u043B\u0438\u0442\u043A\u0438 \u0441\u0442\u043E\u043B\u0456\u0432. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0431\u0443\u0434\u044C-\u044F\u043A\u0438\u0439 \u0441\u0442\u0456\u043B.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u043B\u043E\u0441\u044C \u0432\u0456\u043A\u043D\u043E \u0441\u0442\u043E\u043B\u0443. \u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u041C\u0435\u043D\u044E\xBB \u2014 \u0442\u0443\u0442 \u0443\u0441\u0456 \u0441\u0442\u0440\u0430\u0432\u0438.", sel: '[data-a="tab"][data-m="1"]' },
      { t: "\u041D\u0430\u0442\u0438\u0441\u043A\u0430\u0439\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u0432\u0443 \u2014 \u0432\u043E\u043D\u0430 \u0434\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F \u0432 \u043A\u043E\u0448\u0438\u043A. \u041A\u043E\u0436\u043D\u0435 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u043D\u043D\u044F +1.", sel: '[data-a="add"]' },
      { t: "\u041D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0456 \u043A\u043E\u0448\u0438\u043A \u2014 \u0443 \u0432\u043A\u043B\u0430\u0434\u0446\u0456 \xAB\u0420\u0430\u0445\u0443\u043D\u043E\u043A\xBB.", sel: '[data-a="tab"][data-m="0"]', opt: 1 },
      { t: "\u0413\u043E\u0442\u043E\u0432\u043E? \xAB\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438\xBB \u2014 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0456\u0434\u0435 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E \u0439 \u0431\u0430\u0440.", sel: '[data-a="send"]' }
    ] },
    { id: "w-more", r: "w", g: "\u0417\u0430\u043B", ic: "\u2795", n: "\u0414\u043E\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B, \u0434\u0435 \u0432\u0436\u0435 \u0441\u0438\u0434\u044F\u0442\u044C \u0433\u043E\u0441\u0442\u0456 (\u043F\u043B\u0438\u0442\u043A\u0430 \u0437 \u0441\u0443\u043C\u043E\u044E).", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u0432\u0438 \u0437 \xAB\u041C\u0435\u043D\u044E\xBB \u0456 \u0437\u043D\u043E\u0432\u0443 \xAB\u0412\u0456\u0434\u043F\u0440\u0430\u0432\u0438\u0442\u0438\xBB \u2014 \u043A\u0443\u0445\u043D\u044F \u043F\u043E\u0431\u0430\u0447\u0438\u0442\u044C \u043F\u043E\u0437\u043D\u0430\u0447\u043A\u0443 \xAB\u2795 \u0414\u041E\u0417\u0410\u041C\u041E\u0412\u041B\u0415\u041D\u041D\u042F\xBB.", sel: '[data-a="tab"][data-m="1"]' }
    ] },
    { id: "w-pre", r: "w", g: "\u0417\u0430\u043B", ic: "\u{1F9FE}", n: "\u041F\u0440\u0435\u0447\u0435\u043A \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u044F", s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\xAB\u{1F5A8} \u041F\u0440\u0435\u0447\u0435\u043A\xBB \u0434\u0440\u0443\u043A\u0443\u0454 \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0431\u0435\u0437 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u2014 \u0433\u0456\u0441\u0442\u044C \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u0454 \u0441\u0443\u043C\u0443.", sel: '[data-a="pre"]' }
    ] },
    { id: "w-pay", r: "w", g: "\u0417\u0430\u043B", ic: "\u{1F4B0}", n: "\u041E\u043F\u043B\u0430\u0442\u0430: \u0433\u043E\u0442\u0456\u0432\u043A\u0430, \u043A\u0430\u0440\u0442\u043A\u0430, \u0447\u0430\u0439\u043E\u0432\u0456", danger: 1, s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\xAB\u{1F4B0} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A\xBB \u2192 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438. \u0413\u043E\u0442\u0456\u0432\u043A\u0430 \u2014 \u0432\u0432\u0435\u0434\u0456\u0442\u044C, \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0434\u0430\u0432 \u0433\u0456\u0441\u0442\u044C, \u043A\u0430\u0441\u0430 \u043F\u043E\u0440\u0430\u0445\u0443\u0454 \u0440\u0435\u0448\u0442\u0443. \u0427\u0430\u0439\u043E\u0432\u0456 \u043C\u043E\u0436\u043D\u0430 \u0434\u043E\u0434\u0430\u0442\u0438 \u0442\u0430\u043C \u0436\u0435.", sel: '[data-a="closeT"]' }
    ] },
    { id: "w-split", r: "w", g: "\u0417\u0430\u043B", ic: "\u2702\uFE0F", n: "\u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438 \u0440\u0430\u0445\u0443\u043D\u043E\u043A", s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\xAB\u2702\uFE0F \u0420\u043E\u0437\u0434\u0456\u043B\u0438\u0442\u0438\xBB \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0438, \u0437\u0430 \u044F\u043A\u0456 \u043F\u043B\u0430\u0442\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u0433\u0456\u0441\u0442\u044C. \u0412\u043E\u043D\u0438 \u0441\u0442\u0430\u043D\u0443\u0442\u044C \u043E\u043A\u0440\u0435\u043C\u0438\u043C \u0440\u0430\u0445\u0443\u043D\u043A\u043E\u043C.", sel: '[data-a="split"]' }
    ] },
    { id: "w-move", r: "w", g: "\u0417\u0430\u043B", ic: "\u2194\uFE0F", n: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0441\u0442\u0456\u043B", s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\xAB\u2194\uFE0F \u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438\xBB \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043D\u043E\u0432\u0438\u0439 \u0441\u0442\u0456\u043B. \u0412\u0435\u0441\u044C \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u043F\u0435\u0440\u0435\u0457\u0434\u0435.", sel: '[data-a="move"]' }
    ] },
    { id: "w-tw", r: "w", g: "\u0417\u0430\u043B", ic: "\u{1F961}", n: "\u0417 \u0441\u043E\u0431\u043E\u044E", s: [
      { t: "\u0423 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E\u043C\u0443 \u0441\u0442\u043E\u043B\u0456 \xAB\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E\xBB \u2014 \u043F\u043E\u0437\u043D\u0430\u0447\u0430\u0454 \u0441\u0442\u0440\u0430\u0432\u0438, \u044F\u043A\u0456 \u0442\u0440\u0435\u0431\u0430 \u0437\u0430\u043F\u0430\u043A\u0443\u0432\u0430\u0442\u0438.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u{1F961} \u0417 \u0441\u043E\u0431\u043E\u044E\xBB.", sel: '[data-a="tw"]' }
    ] },
    { id: "w-feed", r: "w", g: "\u0417\u0430\u043B", ic: "\u{1F514}", n: "\u0421\u0442\u0440\u0456\u0447\u043A\u0430: \u0432\u0438\u043A\u043B\u0438\u043A\u0438 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437 QR", s: [
      { t: "\xAB\u{1F514} \u0421\u0442\u0440\u0456\u0447\u043A\u0430\xBB \u2014 \u0433\u043E\u0441\u0442\u0456 \u043A\u043B\u0438\u0447\u0443\u0442\u044C \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0430 \u0439 \u0437\u0430\u043C\u043E\u0432\u043B\u044F\u044E\u0442\u044C \u0437 QR \u043D\u0430 \u0441\u0442\u043E\u043B\u0456. \u0427\u0435\u0440\u0432\u043E\u043D\u0435 \u2014 \u0447\u0435\u043A\u0430\u044E\u0442\u044C \u043F\u043E\u043D\u0430\u0434 \u0445\u0432\u0438\u043B\u0438\u043D\u0443.", sel: ".feed-btn" },
      { t: "\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0433\u043E\u0441\u0442\u044F \u0437 QR \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0439\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432\xBB.", sel: '[data-a="accept"]' }
    ] },
    { id: "w-stop", r: "w", g: "\u0417\u0430\u043B", ic: "\u26D4", n: "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442", s: [
      { t: "\u0422\u0443\u0442 \u0432\u0438\u0434\u043D\u043E, \u0447\u043E\u0433\u043E \u043D\u0435\u043C\u0430\u0454. \u0421\u0442\u0440\u0430\u0432\u0438 \u0437\u0456 \u0441\u0442\u043E\u043F\u0443 \u043D\u0435 \u043C\u043E\u0436\u043D\u0430 \u0434\u043E\u0434\u0430\u0442\u0438, \u0456 \u0433\u043E\u0441\u0442\u0456 \u043D\u0435 \u0431\u0430\u0447\u0430\u0442\u044C \u0457\u0445 \u0443 \u043C\u0435\u043D\u044E.", go: V("stop") }
    ] },
    { id: "w-shift", r: "w", g: "\u042F", ic: "\u{1F7E2}", n: "\u041F\u043E\u0447\u0430\u0442\u0438 \u0439 \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443", s: [
      { t: "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0441\u0432\u043E\u0454 \u0456\u043C\u02BC\u044F \u2014 \u0446\u0435 \u0432\u0430\u0448 \u043A\u0430\u0431\u0456\u043D\u0435\u0442: \u0437\u043C\u0456\u043D\u0430, \u0447\u0430\u0439\u043E\u0432\u0456, \u043F\u043B\u0430\u043D \u043D\u0430 \u0434\u0435\u043D\u044C, \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430.", sel: '[data-a="zpMy"]' },
      { t: "\xAB\u{1F7E2} \u041F\u043E\u0447\u0430\u0442\u0438 \u0437\u043C\u0456\u043D\u0443\xBB \u043D\u0430 \u043F\u043E\u0447\u0430\u0442\u043A\u0443, \xAB\u{1F534} \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443\xBB \u0432 \u043A\u0456\u043D\u0446\u0456 \u2014 \u0437 \u0446\u044C\u043E\u0433\u043E \u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430.", sel: '[data-a="zpIn"],[data-a="zpOut"]' }
    ] },
    // ---------- 🛵 кур'єр ----------
    { id: "c-take", r: "c", g: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", ic: "\u270B", n: "\u0412\u0437\u044F\u0442\u0438 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443", s: [
      { t: "\u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u{1F195} \u041D\u043E\u0432\u0456\xBB \u2014 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u0431\u0435\u0437 \u043A\u0443\u0440'\u0454\u0440\u0430. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u270B \u0411\u0435\u0440\u0443\xBB.", go: V("go"), sel: ".cr-tabs" }
    ] },
    { id: "c-road", r: "c", g: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", ic: "\u{1F6F5}", n: "\u041F\u043E\u0457\u0445\u0430\u0432 \u2192 \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u2192 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E", s: [
      { t: "\xAB\u{1F6F5} \u041C\u043E\u0457\xBB \u2014 \u0432\u0430\u0448\u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438. \u0410\u0434\u0440\u0435\u0441\u0430 \u2014 \u0446\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F: \u0432\u0456\u0434\u043A\u0440\u0438\u0432\u0430\u0454 \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u0443 Google Maps.", go: V("go"), sel: ".cr-addr" },
      { t: "\xAB\u{1F6F5} \u041F\u043E\u0457\u0445\u0430\u0432\xBB \u2014 \u0433\u0456\u0441\u0442\u044C \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F. \u041D\u0430 \u043C\u0456\u0441\u0446\u0456 \u2014 \xAB\u2705 \u0414\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E\xBB \u0456 \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438.", sel: '[data-a="crAct"],[data-a="crDone"]' }
    ] },
    { id: "c-tg", r: "c", g: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430", ic: "\u2708\uFE0F", n: "\u041F\u0456\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0438 Telegram", s: [
      { t: "\xAB\u2708\uFE0F Telegram\xBB \u2014 \u043D\u043E\u0432\u0456 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u0438\u043C\u0443\u0442\u044C \u0443 \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u043D\u0430\u0432\u0456\u0442\u044C \u043A\u043E\u043B\u0438 \u043A\u0430\u0441\u0430 \u0437\u0430\u043A\u0440\u0438\u0442\u0430.", go: V("go"), sel: '[data-a="crTg"]' }
    ] },
    // ---------- 👨‍🍳 кухар ----------
    { id: "k-q", r: "k", g: "\u041A\u0443\u0445\u043D\u044F", ic: "\u{1F468}\u200D\u{1F373}", n: "\u0427\u0435\u0440\u0433\u0430 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C", s: [
      { t: "\u0422\u0443\u0442 \u043D\u043E\u0432\u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u043E \u0447\u0435\u0440\u0437\u0456. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u0432\u0443 \u2014 \u0432\u043E\u043D\u0430 \xAB\u0433\u043E\u0442\u0443\u0454\u0442\u044C\u0441\u044F\xBB.", go: V("kq"), sel: '[data-a="kItem"]' },
      { t: "\u0412\u0441\u0435 \u0433\u043E\u0442\u043E\u0432\u043E \u2014 \xAB\u0413\u043E\u0442\u043E\u0432\u043E\xBB, \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u0438\u0433\u043D\u0430\u043B.", sel: '[data-a="kGo"],[data-a="kAll"]' }
    ] },
    { id: "k-stop", r: "k", g: "\u041A\u0443\u0445\u043D\u044F", ic: "\u26D4", n: "\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u0441\u0442\u0440\u0430\u0432\u0443 \u043D\u0430 \u0441\u0442\u043E\u043F", s: [
      { t: "\u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0432\u0441\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u2014 \u0432\u0438\u043C\u043A\u043D\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0443 \u0442\u0443\u0442. \u0412\u043E\u043D\u0430 \u0437\u043D\u0438\u043A\u043D\u0435 \u0437 \u043C\u0435\u043D\u044E \u0433\u043E\u0441\u0442\u0435\u0439 \u0456 \u043A\u0430\u0441\u0438.", go: V("stop") }
    ] },
    { id: "k-stock", r: "k", g: "\u041A\u0443\u0445\u043D\u044F", ic: "\u{1F4E6}", n: "\u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456 \u0439 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438", s: [
      { t: "\u041F\u0440\u0438\u0432\u0435\u0437\u043B\u0438 \u0442\u043E\u0432\u0430\u0440 \u2014 \xAB\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456\xBB: \u0444\u043E\u0442\u043E \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0457 \u0430\u0431\u043E \u0432\u0440\u0443\u0447\u043D\u0443.", go: T("skTab", "t", "inv") },
      { t: "\u0417\u0440\u043E\u0431\u0438\u043B\u0438 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0443 \u2014 \xAB\u{1F373} \u0417\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438\xBB: \u0441\u043A\u043B\u0430\u0434 \u0441\u0430\u043C \u0441\u043F\u0438\u0448\u0435 \u0441\u0438\u0440\u043E\u0432\u0438\u043D\u0443.", go: T("skTab", "t", "prod") }
    ] },
    // ---------- 👑 адмін: перший тиждень ----------
    { id: "a-site", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 1 \xB7 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", ic: "\u{1F310}", n: "\u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437 \u0441\u0430\u0439\u0442\u0443 \u0439 QR", s: [
      { t: "\u041D\u043E\u0432\u0456 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0437 \u0441\u0430\u0439\u0442\u0443 \u043F\u0440\u0438\u0445\u043E\u0434\u044F\u0442\u044C \u0443 \xAB\u{1F514} \u0421\u0442\u0440\u0456\u0447\u043A\u0443\xBB \u0437\u0456 \u0437\u0432\u0443\u043A\u043E\u043C.", sel: ".feed-btn" },
      { t: "\xAB\u2705 \u041F\u0440\u0438\u0439\u043D\u044F\u0432\xBB \u2014 \u0433\u0456\u0441\u0442\u044C \u0431\u0430\u0447\u0438\u0442\u044C, \u0449\u043E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043F\u0440\u0438\u0439\u043D\u044F\u0442\u0435. \u0412\u0456\u0434\u0445\u0438\u043B\u0438\u0442\u0438 \u2014 \u0437 \u043F\u0440\u0438\u0447\u0438\u043D\u043E\u044E.", sel: '[data-a="accept"]' }
    ] },
    { id: "a-del", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 1 \xB7 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", ic: "\u{1F6F5}", n: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u0439 \u043A\u0443\u0440'\u0454\u0440\u0438", s: [
      { t: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u2014 \u0443 \u0432\u043A\u043B\u0430\u0434\u0446\u0456 \xAB\u{1F468}\u200D\u{1F373} \u041A\u0443\u0445\u043D\u044F\xBB, \u0437\u043D\u0438\u0437\u0443 \xAB\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438\xBB: \u043D\u043E\u0432\u0456, \u0432 \u0434\u043E\u0440\u043E\u0437\u0456, \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456.", go: V("kq"), sel: ".cr-cols" },
      { t: "\xAB\u{1F464} \u041F\u0440\u0438\u0437\u043D\u0430\u0447\u0438\u0442\u0438\xBB \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u043A\u0443\u0440'\u0454\u0440\u0430. \u0412\u0456\u043D \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443 \u0432 \u043A\u0430\u0441\u0456 \u0439 Telegram.", sel: '[data-a="goCourSet"]' },
      { t: "\xAB\u{1F5FA} \u041A\u0430\u0440\u0442\u0430\xBB \u2014 \u0443\u0441\u0456 \u0430\u0434\u0440\u0435\u0441\u0438 \u043D\u0430 \u043E\u0434\u043D\u0456\u0439 \u043A\u0430\u0440\u0442\u0456.", sel: '[data-a="goMap"]' }
    ] },
    { id: "a-book", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 1 \xB7 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F", ic: "\u{1F4C5}", n: "\u0411\u0440\u043E\u043D\u0456", s: [
      { t: "\u0411\u0440\u043E\u043D\u0456 \u0437 \u0441\u0430\u0439\u0442\u0443 \u0439 \u043F\u043E \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443. \u0421\u0442\u0440\u0456\u0447\u043A\u0430 \u0434\u043D\u0456\u0432 \u0437\u0432\u0435\u0440\u0445\u0443.", go: V("books") },
      { t: "\xAB\u2795 \u0411\u0440\u043E\u043D\u044C\xBB \u2014 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0433\u043E\u0441\u0442\u044F, \u044F\u043A\u0438\u0439 \u043F\u043E\u0434\u0437\u0432\u043E\u043D\u0438\u0432.", sel: '[data-a="bkNew"]' },
      { t: "\u0413\u043E\u0441\u0442\u0456 \u043F\u0440\u0438\u0439\u0448\u043B\u0438 \u2014 \xAB\u{1FA91} \u041F\u0440\u0438\u0439\u0448\u043B\u0438\xBB \u0439 \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0442\u0456\u043B: \u043F\u0435\u0440\u0435\u0434\u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u043E\u0434\u0440\u0430\u0437\u0443 \u043F\u0456\u0434\u0435 \u043D\u0430 \u043A\u0443\u0445\u043D\u044E.", sel: '[data-a="bkCame"]' }
    ] },
    { id: "a-cash", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F4B0}", n: "\u041A\u0430\u0441\u0430: \u0432\u043D\u0435\u0441\u0435\u043D\u043D\u044F, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0442\u0440\u0430\u0442\u0438", s: [
      { t: "\u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u{1F4B0} \u041A\u0430\u0441\u0430\xBB \u2014 \u0441\u043A\u0456\u043B\u044C\u043A\u0438 \u0433\u0440\u043E\u0448\u0435\u0439 \u0443 \u0448\u0443\u0445\u043B\u044F\u0434\u0456 \u0437\u0430\u0440\u0430\u0437.", go: V("cash") },
      { t: "\xAB\u2795 \u0412\u043D\u0435\u0441\u0442\u0438\xBB \u2014 \u0440\u043E\u0437\u043C\u0456\u043D \u0437\u0440\u0430\u043D\u043A\u0443. \xAB\u2796 \u0412\u0438\u043B\u0443\u0447\u0438\u0442\u0438\xBB \u2014 \u0456\u043D\u043A\u0430\u0441\u0430\u0446\u0456\u044F.", sel: '[data-a="cMove"]' },
      { t: "\xAB\u{1F4B8} \u0412\u0438\u0442\u0440\u0430\u0442\u0430\xBB \u2014 \u043A\u0443\u043F\u0438\u043B\u0438 \u0449\u043E\u0441\u044C \u0437\u0430 \u0433\u043E\u0442\u0456\u0432\u043A\u0443 \u0437 \u043A\u0430\u0441\u0438 (\u0437 \u0444\u043E\u0442\u043E \u0447\u0435\u043A\u0430).", sel: '[data-a="expense"]' }
    ] },
    { id: "a-z", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F9FE}", n: "\u041A\u0456\u043D\u0435\u0446\u044C \u0434\u043D\u044F: Z-\u0437\u0432\u0456\u0442", danger: 1, s: [
      { t: "\u041F\u0435\u0440\u0435\u0434 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F\u043C \u0443\u0441\u0456 \u0441\u0442\u043E\u043B\u0438 \u043C\u0430\u044E\u0442\u044C \u0431\u0443\u0442\u0438 \u0437\u0430\u043A\u0440\u0438\u0442\u0456.", go: V("cash") },
      { t: "\xAB\u{1F9FE} Z-\u0437\u0432\u0456\u0442\xBB \u2014 \u043F\u0456\u0434\u0441\u0443\u043C\u043E\u043A \u0434\u043D\u044F. \xAB\u{1F5A8} \u041D\u0430\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438\xBB \u043B\u0438\u0448\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 (X-\u0437\u0432\u0456\u0442). \xAB\u{1F512} \u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u0434\u0435\u043D\u044C\xBB \u2014 \u0444\u0456\u043D\u0430\u043B\u044C\u043D\u043E, \u043F\u0456\u0434\u0435 \u0432 Telegram.", sel: '[data-a="zDay"]' }
    ] },
    { id: "a-checks", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F9FE}", n: "\u0427\u0435\u043A\u0438: \u0432\u0438\u043F\u0440\u0430\u0432\u0438\u0442\u0438 \u043E\u043F\u043B\u0430\u0442\u0443, \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F", s: [
      { t: "\xAB\u{1F9FE} \u0427\u0435\u043A\u0438\xBB \u2014 \u0443\u0441\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0456 \u0440\u0430\u0445\u0443\u043D\u043A\u0438 \u0437\u0430 \u0434\u0435\u043D\u044C.", go: T("cashTab", "t", "checks") },
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0447\u0435\u043A, \u0449\u043E\u0431 \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438, \u043F\u0435\u0440\u0435\u0434\u0440\u0443\u043A\u0443\u0432\u0430\u0442\u0438 \u0430\u0431\u043E \u043E\u0444\u043E\u0440\u043C\u0438\u0442\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F.", sel: '[data-a="cEdit"]' }
    ] },
    { id: "a-rep", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F4CA}", n: "\u0417\u0432\u0456\u0442\u0438", s: [
      { t: "\u0412\u0438\u0440\u0443\u0447\u043A\u0430, \u0441\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0447\u0435\u043A, \u0449\u043E \u043F\u0440\u043E\u0434\u0430\u0454\u0442\u044C\u0441\u044F, \u0433\u043E\u0434\u0438\u043D\u0438 \u043F\u0456\u043A, \u0444\u0443\u0434\u043A\u043E\u0441\u0442.", go: V("reports"), sel: '[data-a="rSec"]' }
    ] },
    { id: "a-inv", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 3 \xB7 \u0421\u043A\u043B\u0430\u0434", ic: "\u{1F9FE}", n: "\u041F\u0440\u0438\u0445\u0456\u0434 \u0442\u043E\u0432\u0430\u0440\u0443", s: [
      { t: "\u041F\u0440\u0438\u0432\u0435\u0437\u043B\u0438 \u0442\u043E\u0432\u0430\u0440 \u2014 \xAB\u{1F9FE} \u041D\u0430\u043A\u043B\u0430\u0434\u043D\u0456\xBB: \u0441\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0443\u0439\u0442\u0435 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u0443, \u0428\u0406 \u0441\u0430\u043C \u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u0454 \u043F\u043E\u0437\u0438\u0446\u0456\u0457.", go: T("skTab", "t", "inv") }
    ] },
    { id: "a-stock", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 3 \xB7 \u0421\u043A\u043B\u0430\u0434", ic: "\u{1F4E6}", n: "\u0417\u0430\u043B\u0438\u0448\u043A\u0438 \u0439 \u0437\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044F", s: [
      { t: "\xAB\u{1F4E6} \u0417\u0430\u043B\u0438\u0448\u043A\u0438\xBB \u2014 \u0449\u043E \u0454 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0456. \u0427\u0435\u0440\u0432\u043E\u043D\u0435 \u2014 \u043D\u0438\u0436\u0447\u0435 \u043C\u0456\u043D\u0456\u043C\u0443\u043C\u0443.", go: T("skTab", "t", "stock") },
      { t: "\xAB\u{1F6D2} \u0417\u0430\u043A\u0443\u043F\u0456\u0432\u043B\u044F\xBB \u2014 \u0441\u043F\u0438\u0441\u043E\u043A, \u0449\u043E \u0434\u043E\u043A\u0443\u043F\u0438\u0442\u0438, \u043F\u043E \u043F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430\u0445. \u041C\u043E\u0436\u043D\u0430 \u043E\u0434\u0440\u0430\u0437\u0443 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F.", go: T("skTab", "t", "buy") }
    ] },
    { id: "a-cards", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 3 \xB7 \u0421\u043A\u043B\u0430\u0434", ic: "\u{1F4CB}", n: "\u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438 \u0439 \u0441\u043E\u0431\u0456\u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044C", s: [
      { t: "\xAB\u{1F4CB} \u0422\u0435\u0445\u043A\u0430\u0440\u0442\u0438\xBB \u2014 \u0437 \u0447\u043E\u0433\u043E \u0441\u043A\u043B\u0430\u0434\u0430\u0454\u0442\u044C\u0441\u044F \u0441\u0442\u0440\u0430\u0432\u0430. \u0421\u043A\u043B\u0430\u0434 \u0441\u043F\u0438\u0441\u0443\u0454\u0442\u044C\u0441\u044F \u0441\u0430\u043C \u043F\u0440\u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0456.", go: T("skTab", "t", "cards") }
    ] },
    { id: "a-count", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 3 \xB7 \u0421\u043A\u043B\u0430\u0434", ic: "\u{1F4DD}", n: "\u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F", s: [
      { t: "\xAB\u{1F4DD} \u0406\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0456\u044F\xBB \u2014 \u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0439\u0442\u0435 \u0444\u0430\u043A\u0442\u0438\u0447\u043D\u0456 \u0437\u0430\u043B\u0438\u0448\u043A\u0438. \u0420\u0456\u0437\u043D\u0438\u0446\u044F \u043F\u043E\u0442\u0440\u0430\u043F\u0438\u0442\u044C \u0443 \xAB\u041F\u043B\u044E\u0441\u0438 / \u043C\u0456\u043D\u0443\u0441\u0438\xBB.", go: T("skTab", "t", "count") }
    ] },
    { id: "a-sup", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 3 \xB7 \u0421\u043A\u043B\u0430\u0434", ic: "\u{1F3ED}", n: "\u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0438 \u0439 \u0431\u043E\u0440\u0433\u0438", s: [
      { t: "\xAB\u{1F3ED} \u041F\u043E\u0441\u0442\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0438\xBB \u2014 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0438, \u0431\u043E\u0440\u0433\u0438, \u043E\u043F\u043B\u0430\u0442\u0438, \u0430\u043A\u0442\u0438 \u0437\u0432\u0456\u0440\u043A\u0438.", go: T("skTab", "t", "sup") }
    ] },
    { id: "a-grid", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F4C5}", n: "\u0413\u0440\u0430\u0444\u0456\u043A \u0437\u043C\u0456\u043D", s: [
      { t: "\xAB\u{1F465} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\xBB \u2192 \xAB\u{1F4C5} \u0413\u0440\u0430\u0444\u0456\u043A\xBB \u2014 \u0445\u0442\u043E \u043A\u043E\u043B\u0438 \u043F\u0440\u0430\u0446\u044E\u0454. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043A\u043B\u0456\u0442\u0438\u043D\u043A\u0443, \u0449\u043E\u0431 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u0437\u043C\u0456\u043D\u0443.", go: T("zpTab", "t", "grid") }
    ] },
    { id: "a-pay", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F4B0}", n: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430", s: [
      { t: "\xAB\u{1F4B0} \u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430\xBB \u2014 \u043D\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u0430 \u0437\u043C\u0456\u043D\u0438, \u0432\u0456\u0434\u0441\u043E\u0442\u043A\u0438, \u0447\u0430\u0439\u043E\u0432\u0456, \u0430\u0432\u0430\u043D\u0441\u0438 \u0439 \u0448\u0442\u0440\u0430\u0444\u0438.", go: T("zpTab", "t", "pay") }
    ] },
    { id: "a-plan", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F4CB}", n: "\u041F\u043B\u0430\u043D \u043D\u0430 \u0434\u0435\u043D\u044C", s: [
      { t: "\xAB\u{1F4CB} \u041F\u043B\u0430\u043D\xBB \u2014 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F \u043D\u0430 \u0434\u0435\u043D\u044C (\u043F\u0440\u0438\u0431\u0438\u0440\u0430\u043D\u043D\u044F, \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438). \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438 \u0432\u0456\u0434\u043C\u0456\u0447\u0430\u044E\u0442\u044C \u0443 \u0441\u0432\u043E\u0454\u043C\u0443 \u043A\u0430\u0431\u0456\u043D\u0435\u0442\u0456 \u0430\u0431\u043E \u0432 \u0431\u043E\u0442\u0456.", go: T("zpTab", "t", "plan") }
    ] },
    { id: "a-people", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F465}", n: "\u041D\u043E\u0432\u0438\u0439 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A", s: [
      { t: "\xAB\u{1F465} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438\xBB \u2014 \u0434\u043E\u0434\u0430\u0442\u0438 \u043B\u044E\u0434\u0438\u043D\u0443, \u0440\u043E\u043B\u044C \u0456 PIN. PIN \u0432\u0456\u043D \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043D\u0430 \u0432\u0445\u043E\u0434\u0456 \u0432 \u043A\u0430\u0441\u0443.", go: T("zpTab", "t", "people") }
    ] },
    { id: "a-loy", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F", ic: "\u{1F381}", n: "\u0410\u043A\u0446\u0456\u0457 \u0439 \u0431\u043E\u043D\u0443\u0441\u0438", s: [
      { t: "\xAB\u2699\uFE0F \u041D\u0430\u043B\u0430\u0448\u0442.\xBB \u2192 \xAB\u{1F381} \u041B\u043E\u044F\u043B\u044C\u043D\u0456\u0441\u0442\u044C\xBB \u2014 \u0440\u0456\u0432\u043D\u0456 \u0433\u043E\u0441\u0442\u0435\u0439, \u0431\u043E\u043D\u0443\u0441\u0438, \u0430\u043A\u0446\u0456\u0457, \u0449\u043E \u0441\u0430\u043C\u0456 \u0440\u0430\u0445\u0443\u044E\u0442\u044C\u0441\u044F \u0432 \u0447\u0435\u043A\u0443.", go: T("setTab", "s", "loy") }
    ] },
    { id: "a-gocfg", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F", ic: "\u{1F6F5}", n: "\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", s: [
      { t: "\xAB\u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430\xBB \u2014 \u0437\u043E\u043D\u0438, \u0446\u0456\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438, \u043C\u0456\u043D\u0456\u043C\u0430\u043B\u044C\u043D\u0430 \u0441\u0443\u043C\u0430, \u0447\u0430\u0441.", go: T("setTab", "s", "go") }
    ] },
    { id: "a-rules", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F", ic: "\u2699\uFE0F", n: "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438", s: [
      { t: "\xAB\u2699\uFE0F \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0440\u043E\u0431\u043E\u0442\u0438\xBB \u2014 \u0441\u0442\u043E\u043B\u0438, \u0441\u0435\u0440\u0432\u0456\u0441, \u0437\u043D\u0438\u0436\u043A\u0438, \u0449\u043E \u043C\u043E\u0436\u0435 \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442 \u0431\u0435\u0437 \u0430\u0434\u043C\u0456\u043D\u0430.", go: T("setTab", "s", "rules") }
    ] },
    { id: "a-prn", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F", ic: "\u{1F5A8}", n: "\u041F\u0440\u0438\u043D\u0442\u0435\u0440", s: [
      { t: "\xAB\u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440\xBB \u2014 \u0441\u0442\u0430\u043D \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0430 \u0439 \u0442\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u0434\u0440\u0443\u043A. \u041D\u0435 \u0434\u0440\u0443\u043A\u0443\u0454? \u041F\u043E\u0447\u043D\u0456\u0442\u044C \u0437 \xAB\u0422\u0435\u0441\u0442\xBB.", go: T("setTab", "s", "printer") }
    ] },
    // ---------- дописано сканом функцій ----------
    { id: "w-disc", r: "w", g: "\u0417\u0430\u043B", ic: "%", n: "\u0417\u043D\u0438\u0436\u043A\u0430 \u043D\u0430 \u0440\u0430\u0445\u0443\u043D\u043E\u043A", s: [
      { t: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0441\u0442\u0456\u043B \u0456\u0437 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F\u043C.", go: V("hall"), sel: '[data-a="table"]' },
      { t: "\xAB% \u0417\u043D\u0438\u0436\u043A\u0430\xBB \u2014 \u0432\u0456\u0434\u0441\u043E\u0442\u043E\u043A \u0430\u0431\u043E \u0441\u0443\u043C\u0430. \u0429\u043E \u0434\u043E\u0437\u0432\u043E\u043B\u0435\u043D\u043E \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0443, \u0432\u0438\u0437\u043D\u0430\u0447\u0430\u0454 \u0430\u0434\u043C\u0456\u043D \u0443 \xAB\u041F\u0440\u0430\u0432\u0438\u043B\u0430\u0445 \u0440\u043E\u0431\u043E\u0442\u0438\xBB.", sel: '[data-a="disc"]', opt: 1 }
    ] },
    { id: "w-closed", r: "w", g: "\u042F", ic: "\u{1F9FE}", n: "\u0417\u0430\u043A\u0440\u0438\u0442\u0456 \u0447\u0435\u043A\u0438 \u0437\u0430 \u0434\u0435\u043D\u044C", s: [
      { t: "\u0422\u0443\u0442 \u0443\u0441\u0456 \u0437\u0430\u043A\u0440\u0438\u0442\u0456 \u0440\u0430\u0445\u0443\u043D\u043A\u0438: \u0441\u0443\u043C\u0430, \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438, \u0445\u0442\u043E \u0437\u0430\u043A\u0440\u0438\u0432. \u041A\u043E\u0440\u0438\u0441\u043D\u043E, \u044F\u043A\u0449\u043E \u0433\u0456\u0441\u0442\u044C \u043F\u0438\u0442\u0430\u0454 \u0447\u0435\u043A.", go: V("closed") }
    ] },
    { id: "a-tips", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F49D}", n: "\u0427\u0430\u0439\u043E\u0432\u0456: \u0432\u0438\u043F\u043B\u0430\u0442\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0456", s: [
      { t: "\u0427\u0430\u0439\u043E\u0432\u0456 \u0437 \u043A\u0430\u0440\u0442\u043E\u043A \u043D\u0430\u043A\u043E\u043F\u0438\u0447\u0443\u044E\u0442\u044C\u0441\u044F \u0437\u0430 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u043E\u043C. \u041A\u043E\u043B\u0438 \u0432\u0456\u0434\u0434\u0430\u0454\u0442\u0435 \u0433\u043E\u0442\u0456\u0432\u043A\u043E\u044E \u2014 \u043F\u043E\u0437\u043D\u0430\u0447\u0442\u0435 \xAB\u0412\u0438\u0434\u0430\u043D\u043E\xBB.", go: V("cash"), sel: '[data-a="tipPay"]', opt: 1 }
    ] },
    { id: "a-exch", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u{1F501}", n: "\u041E\u0431\u043C\u0456\u043D \u043C\u0456\u0436 \u043A\u0430\u0441\u0430\u043C\u0438", s: [
      { t: "\xAB\u{1F501} \u041E\u0431\u043C\u0456\u043D\xBB \u2014 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u043B\u0438 \u0433\u0440\u043E\u0448\u0456 \u0437 \u043A\u0430\u0441\u0438 \u0432 \u0441\u0435\u0439\u0444 \u0447\u0438 \u043C\u0456\u0436 \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C\u0438 (\u043D\u0430\u043F\u0440. \u0433\u043E\u0442\u0456\u0432\u043A\u0430 \u2192 \u043A\u0430\u0440\u0442\u0430). \u0420\u0443\u0445 \u0444\u0456\u043A\u0441\u0443\u0454\u0442\u044C\u0441\u044F \u0432 \u0436\u0443\u0440\u043D\u0430\u043B\u0456.", go: V("cash"), sel: '[data-a="cMove"]' }
    ] },
    { id: "a-rfil", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 2 \xB7 \u0413\u0440\u043E\u0448\u0456", ic: "\u2699\uFE0F", n: "\u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u0439 \u043F\u0435\u0440\u0456\u043E\u0434\u0438 \u0437\u0432\u0456\u0442\u0456\u0432", s: [
      { t: "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043F\u0435\u0440\u0456\u043E\u0434 (\u0434\u0435\u043D\u044C / \u0442\u0438\u0436\u0434\u0435\u043D\u044C / \u043C\u0456\u0441\u044F\u0446\u044C) \u0456 \u0440\u043E\u0437\u0434\u0456\u043B \u0437\u0432\u0456\u0442\u0443.", go: V("reports"), sel: '[data-a="rp"],[data-a="rSec"]' },
      { t: "\xAB\u2699\uFE0F \u0424\u0456\u043B\u044C\u0442\u0440\u0438\xBB \u2014 \u043F\u043E \u043E\u0444\u0456\u0446\u0456\u0430\u043D\u0442\u0443, \u0441\u043F\u043E\u0441\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438, \u0437\u0430\u043B\u0443. \xAB\u2715 \u0421\u043A\u0438\u043D\u0443\u0442\u0438\xBB \u043F\u043E\u0432\u0435\u0440\u0442\u0430\u0454 \u0432\u0441\u0435.", sel: '[data-a="rFo"]', opt: 1 }
    ] },
    { id: "a-ops", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F9FE}", n: "\u041F\u0440\u0435\u043C\u0456\u044F, \u0448\u0442\u0440\u0430\u0444, \u0430\u0432\u0430\u043D\u0441", s: [
      { t: "\xAB\u{1F9FE} \u041E\u043F\u0435\u0440\u0430\u0446\u0456\u0457\xBB \u2014 \u043F\u0440\u0435\u043C\u0456\u0457, \u0448\u0442\u0440\u0430\u0444\u0438 \u0439 \u0430\u0432\u0430\u043D\u0441\u0438. \u0412\u043E\u043D\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u043F\u043E\u0442\u0440\u0430\u043F\u043B\u044F\u0442\u044C \u0443 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0443.", go: T("zpTab", "t", "ops") },
      { t: "\u041F\u043E\u043C\u0438\u043B\u0438\u043B\u0438\u0441\u044C \u2014 \u{1F5D1} \u043F\u0440\u0438\u0431\u0438\u0440\u0430\u0454 \u0437\u0430\u043F\u0438\u0441, \u21A9\uFE0F \u043F\u043E\u0432\u0435\u0440\u0442\u0430\u0454.", sel: '[data-a="zpOpDel"]', opt: 1 }
    ] },
    { id: "a-tasks", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u2705", n: "\u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F \u0439 \u0448\u0430\u0431\u043B\u043E\u043D\u0438", s: [
      { t: "\xAB\u{1F4CB} \u041F\u043B\u0430\u043D\xBB \u2192 \xAB\u2795 \u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F\xBB \u2014 \u0440\u0430\u0437\u043E\u0432\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0443 (\u0437 \u0444\u043E\u0442\u043E-\u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F\u043C, \u044F\u043A\u0449\u043E \u0442\u0440\u0435\u0431\u0430).", go: T("zpTab", "t", "plan"), sel: '[data-a="tkAdd"]' },
      { t: "\xAB\u2795 \u0428\u0430\u0431\u043B\u043E\u043D\xBB \u2014 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F, \u0449\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u044E\u0454\u0442\u044C\u0441\u044F \u0449\u043E\u0434\u043D\u044F (\u043F\u0440\u0438\u0431\u0438\u0440\u0430\u043D\u043D\u044F, \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0438).", sel: '[data-a="tkTplEd"]', opt: 1 },
      { t: "\u2705 / \u274C \u2014 \u0432\u0456\u0434\u043C\u0456\u0442\u0438\u0442\u0438 \u0432\u0438\u043A\u043E\u043D\u0430\u043D\u043D\u044F \u0437\u0430 \u043F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0430.", sel: '[data-a="tkMarkA"]', opt: 1 }
    ] },
    { id: "a-ideas", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 4 \xB7 \u041A\u043E\u043C\u0430\u043D\u0434\u0430", ic: "\u{1F4A1}", n: "\u041F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0438", s: [
      { t: "\u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438 \u043B\u0438\u0448\u0430\u044E\u0442\u044C \u043F\u043E\u0431\u0430\u0436\u0430\u043D\u043D\u044F \u0437 \u043A\u0430\u0431\u0456\u043D\u0435\u0442\u0443. \u0412\u0438\u043A\u043E\u043D\u0430\u043B\u0438 \u2014 \u2705.", go: T("zpTab", "t", "ideas") }
    ] },
    { id: "a-cli", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u0413\u043E\u0441\u0442\u0456", ic: "\u{1F465}", n: "\u041A\u043B\u0456\u0454\u043D\u0442\u0438 \u0439 \u0431\u043E\u043D\u0443\u0441\u0438", s: [
      { t: "\xAB\u{1F465} \u041A\u043B\u0456\u0454\u043D\u0442\u0438\xBB \u2014 \u0431\u0430\u0437\u0430 \u0433\u043E\u0441\u0442\u0435\u0439: \u0440\u0456\u0432\u0435\u043D\u044C, \u0431\u043E\u043D\u0443\u0441\u0438, \u0432\u0456\u0437\u0438\u0442\u0438. \u0417\u043D\u0430\u0439\u0434\u0456\u0442\u044C \u0437\u0430 \u043D\u043E\u043C\u0435\u0440\u043E\u043C \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443.", go: T("setTab", "s", "loy"), sel: '[data-a="loyTab"][data-s="cli"]' }
    ] },
    { id: "a-lrule", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u0413\u043E\u0441\u0442\u0456", ic: "\u{1F3AF}", n: "\u0410\u043A\u0446\u0456\u0457 (happy hour, \u043A\u043E\u043C\u0431\u043E)", s: [
      { t: "\xAB\u{1F3AF} \u0410\u043A\u0446\u0456\u0457\xBB \u2014 \u043F\u0440\u0430\u0432\u0438\u043B\u0430, \u0449\u043E \u0441\u0430\u043C\u0456 \u0437\u0430\u0441\u0442\u043E\u0441\u043E\u0432\u0443\u044E\u0442\u044C\u0441\u044F \u0432 \u0447\u0435\u043A\u0443: \u0437\u043D\u0438\u0436\u043A\u0430 \u0437\u0430 \u0447\u0430\u0441\u043E\u043C, \u043A\u043E\u043C\u0431\u043E, \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F.", go: T("setTab", "s", "loy"), sel: '[data-a="loyTab"][data-s="rules"]' },
      { t: "\xAB\u2795 \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438\xBB \u2014 \u043D\u043E\u0432\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u043E; \u043F\u0435\u0440\u0435\u043C\u0438\u043A\u0430\u0447 \u0432\u043C\u0438\u043A\u0430\u0454/\u0432\u0438\u043C\u0438\u043A\u0430\u0454 \u0431\u0435\u0437 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F.", sel: '[data-a="loyRule"]', opt: 1 }
    ] },
    { id: "a-cert", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u0413\u043E\u0441\u0442\u0456", ic: "\u{1F39F}", n: "\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u043E\u0432\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438", s: [
      { t: "\xAB\u{1F39F} \u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043A\u0430\u0442\u0438\xBB \u2014 \u043F\u0440\u043E\u0434\u0430\u0436 \u0456 \u043F\u043E\u0433\u0430\u0448\u0435\u043D\u043D\u044F. \u041E\u043F\u043B\u0430\u0442\u0443 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C \xAB\u{1F4B5} \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E\xBB \u0430\u0431\u043E \u043A\u0430\u0440\u0442\u043A\u043E\u044E.", go: T("setTab", "s", "loy"), sel: '[data-a="certs"]' }
    ] },
    { id: "a-cast", r: "a", g: "\u041F\u0435\u0440\u0448\u0438\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C \u0430\u0434\u043C\u0456\u043D\u0430 \xB7 \u0414\u0435\u043D\u044C 5 \xB7 \u0413\u043E\u0441\u0442\u0456", ic: "\u{1F4E3}", n: "\u0420\u043E\u0437\u0441\u0438\u043B\u043A\u0430 \u0433\u043E\u0441\u0442\u044F\u043C", s: [
      { t: "\u041D\u0430\u043B\u0430\u0448\u0442. \u2192 \xAB\u{1F381} \u041B\u043E\u044F\u043B\u044C\u043D\u0456\u0441\u0442\u044C\xBB \u2192 \xAB\u{1F916} \u0411\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439\xBB.", go: T("setTab", "s", "loy"), sel: '[data-a="loyTab"][data-s="bot"]' },
      { t: "\xAB\u{1F4E3} \u041D\u043E\u0432\u0430 \u0440\u043E\u0437\u0441\u0438\u043B\u043A\u0430\xBB \u2014 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u0431\u043E\u0442 \u0433\u043E\u0441\u0442\u0435\u0439: \u043E\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0435\u0433\u043C\u0435\u043D\u0442 (\u0443\u0441\u0456, \u043D\u0435 \u0431\u0443\u043B\u0438 30+ \u0434\u043D\u0456\u0432, \u0414\u041D).", go: T("loyTab", "s", "bot"), sel: '[data-a="gbCast"]', opt: 1 },
      { t: "\xAB\u2709\uFE0F\xBB \u2014 \u0433\u043E\u0441\u0442\u0456 \u043F\u0438\u0448\u0443\u0442\u044C \u0431\u043E\u0442\u0443; \u0442\u0443\u0442 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454\u0442\u0435 \u0457\u043C.", sel: '[data-a="gbInbox"]', opt: 1 }
    ] }
  ];
  const FAQ = [
    ["\u{1F5A8} \u041D\u0435 \u0434\u0440\u0443\u043A\u0443\u0454 \u043F\u0440\u0438\u043D\u0442\u0435\u0440", "\u041D\u0430\u043B\u0430\u0448\u0442. \u2192 \u{1F5A8} \u041F\u0440\u0438\u043D\u0442\u0435\u0440 \u2192 \u0442\u0435\u0441\u0442. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435, \u0449\u043E \u043A\u043E\u043C\u043F\u02BC\u044E\u0442\u0435\u0440 \u0456\u0437 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043E\u044E \u0434\u0440\u0443\u043A\u0443 \u0443\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u0438\u0439 \u0456 \u0454 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442. \u0427\u0435\u043A\u0438 \u043D\u0435 \u0433\u0443\u0431\u043B\u044F\u0442\u044C\u0441\u044F \u2014 \u043D\u0430\u0434\u0440\u0443\u043A\u0443\u044E\u0442\u044C\u0441\u044F, \u043A\u043E\u043B\u0438 \u043F\u0440\u0438\u043D\u0442\u0435\u0440 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u0442\u044C\u0441\u044F."],
    ["\u21A9\uFE0F \u0413\u0456\u0441\u0442\u044C \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0432 \u0441\u0442\u0440\u0430\u0432\u0443", "\u041A\u0430\u0441\u0430 \u2192 \u{1F9FE} \u0427\u0435\u043A\u0438 \u2192 \u0432\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0447\u0435\u043A \u2192 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F. \u042F\u043A\u0449\u043E \u0440\u0430\u0445\u0443\u043D\u043E\u043A \u0449\u0435 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438\u0439 \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u0432\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0443 \u0437 \u043F\u0440\u0438\u0447\u0438\u043D\u043E\u044E."],
    ["\u{1F4B3} \u041F\u043E\u043C\u0438\u043B\u0438\u043B\u0438\u0441\u044C \u0437\u0456 \u0441\u043F\u043E\u0441\u043E\u0431\u043E\u043C \u043E\u043F\u043B\u0430\u0442\u0438", "\u041A\u0430\u0441\u0430 \u2192 \u{1F9FE} \u0427\u0435\u043A\u0438 \u2192 \u0432\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0447\u0435\u043A \u2192 \u0437\u043C\u0456\u043D\u0456\u0442\u044C \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438. Z-\u0437\u0432\u0456\u0442 \u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0454\u0442\u044C\u0441\u044F."],
    ["\u{1F6F5} \u041A\u0443\u0440'\u0454\u0440 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454", "\u041A\u0443\u0445\u043D\u044F \u2192 \u{1F6F5} \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u2192 \xAB\u{1F464} \u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u0443\u0440'\u0454\u0440\u0430\xBB. \u0413\u0456\u0441\u0442\u044C \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F."],
    ["\u{1F4B0} \u041D\u0435 \u0441\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u043A\u0430\u0441\u0430", "\u041A\u0430\u0441\u0430 \u2192 \u0440\u0443\u0445 \u0433\u0440\u043E\u0448\u0435\u0439: \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0432\u043D\u0435\u0441\u0435\u043D\u043D\u044F, \u0432\u0438\u043B\u0443\u0447\u0435\u043D\u043D\u044F \u0439 \u0432\u0438\u0442\u0440\u0430\u0442\u0438. \u0413\u043E\u0442\u0456\u0432\u043A\u043E\u0432\u0456 \u0447\u0435\u043A\u0438 \u2014 \u0443 \u{1F9FE} \u0427\u0435\u043A\u0438 \u0437 \u0444\u0456\u043B\u044C\u0442\u0440\u043E\u043C."],
    ["\u26D4 \u0417\u0430\u043A\u0456\u043D\u0447\u0438\u0432\u0441\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442", "\u0421\u0442\u043E\u043F-\u043B\u0438\u0441\u0442 \u2192 \u0432\u0438\u043C\u043A\u043D\u0456\u0442\u044C \u0441\u0442\u0440\u0430\u0432\u0443. \u0413\u043E\u0441\u0442\u0456 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 \u0457\u0457 \u0431\u0456\u043B\u044C\u0448\u0435 \u043D\u0435 \u043F\u043E\u0431\u0430\u0447\u0430\u0442\u044C."],
    ["\u{1F511} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A \u0437\u0430\u0431\u0443\u0432 PIN", "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B \u2192 \u{1F465} \u041F\u0440\u0430\u0446\u0456\u0432\u043D\u0438\u043A\u0438 \u2192 \u0437\u043C\u0456\u043D\u0456\u0442\u044C PIN."],
    ["\u{1F4F5} \u0417\u043D\u0438\u043A \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442", "\u041A\u0430\u0441\u0430 \u043F\u043E\u043A\u0430\u0437\u0443\u0454 \u043E\u0441\u0442\u0430\u043D\u043D\u0456 \u0434\u0430\u043D\u0456. \u041D\u043E\u0432\u0456 \u0434\u0456\u0457 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0443\u0442\u044C\u0441\u044F \u0431\u0435\u0437 \u0437\u0432\u02BC\u044F\u0437\u043A\u0443 \u2014 \u0434\u043E\u0447\u0435\u043A\u0430\u0439\u0442\u0435\u0441\u044C, \u0430\u0431\u043E \u0440\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0432\u0440\u0443\u0447\u043D\u0443 \u0439 \u0432\u043D\u0435\u0441\u0456\u0442\u044C \u043F\u0456\u0441\u043B\u044F."]
  ];
  function courseLeft() {
    try {
      const D = crDone();
      return crList().some((l) => !D[l.id]);
    } catch (e) {
      return true;
    }
  }
  const crRole = () => isAdmin() ? "a" : isCook() ? "k" : isCour() ? "c" : "w";
  const crDone = () => store.get("course", {});
  const crList = () => {
    const r = crRole();
    return CR.filter((l) => l.r === r || r === "a" && l.r === "w");
  };
  const crVid = new Set(COURSE_VID);
  window.__CR = CR;
  function courseHTML() {
    const L = crList(), D = crDone(), fl = TR.f;
    TR.f = "", ok = L.filter((l) => D[l.id]).length, gs = [...new Set(L.map((l) => l.g))];
    const pct = L.length ? Math.round(ok / L.length * 100) : 0;
    return `<div class="rhead"><div><h1>\u{1F393} \u041D\u0430\u0432\u0447\u0430\u043D\u043D\u044F</h1><span class="muted">${ok} \u0437 ${L.length} \u0443\u0440\u043E\u043A\u0456\u0432 \xB7 \u25B6\uFE0F \xAB\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438\xBB \u043F\u043E\u043A\u0430\u0436\u0435, \u043A\u0443\u0434\u0438 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u0442\u0438</span></div></div>
      <div class="card"><div class="cr-prog"><i style="width:${pct}%"></i></div>${ok === L.length && L.length ? "<b>\u{1F3C5} \u041A\u0443\u0440\u0441 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E!</b>" : `<span class="muted">\u0406\u0434\u0456\u0442\u044C \u043F\u043E \u043F\u043E\u0440\u044F\u0434\u043A\u0443 \u2014 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0443\u0440\u043E\u043A \u043F\u0456\u0434\u0441\u0432\u0456\u0447\u0435\u043D\u043E.</span>`}</div>
      ${gs.map((g) => `<h3 style="margin:16px 0 6px">${esc(g)}</h3><div class="cr-grid">${L.filter((l) => l.g === g).map((l) => {
      const next = !D[l.id] && L.find((x) => !D[x.id]) === l;
      return `<div class="card cr-l${D[l.id] ? " done" : ""}${next || fl === l.id ? " next" : ""}" id="cr-${l.id}"><div class="cr-lh"><span class="cr-ic">${D[l.id] ? "\u2705" : l.ic}</span><b>${esc(l.n)}</b></div>
          ${crVid.has(l.id) ? `<video class="cr-v" src="img/course/${l.id}.mp4" poster="img/course/${l.id}.jpg" preload="none" muted playsinline controls></video>` : ""}
          <ol class="cr-s">${l.s.map((s) => `<li>${esc(s.t)}</li>`).join("")}</ol>
          ${l.danger ? '<div class="muted" style="font-size:12px">\u26A0\uFE0F \u0421\u043F\u0440\u0430\u0432\u0436\u043D\u0456 \u0433\u0440\u043E\u0448\u0456 \u2014 \u0442\u0443\u0440 \u043B\u0438\u0448\u0435 \u043F\u043E\u043A\u0430\u0437\u0443\u0454, \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u0454 \u0441\u0430\u043C.</div>' : ""}
          <div class="btnrow"><button class="btn sm primary" data-a="crGo" data-id="${l.id}">\u25B6\uFE0F \u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438</button><button class="btn sm${D[l.id] ? " ghost" : ""}" data-a="crOk" data-id="${l.id}">${D[l.id] ? "\u21A9\uFE0F" : "\u2705 \u0417\u0440\u043E\u0437\u0443\u043C\u0456\u0432"}</button></div></div>`;
    }).join("")}</div>`).join("")}
      <h3 style="margin:22px 0 6px">\u2753 \u0429\u043E \u0440\u043E\u0431\u0438\u0442\u0438, \u044F\u043A\u0449\u043E\u2026</h3><div class="card"><input id="crQ" class="inp" type="search" placeholder="\u{1F50D} \u041F\u043E\u0448\u0443\u043A: \u043F\u0440\u0438\u043D\u0442\u0435\u0440, PIN, \u043A\u0430\u0441\u0430\u2026" style="width:100%;margin-bottom:8px">${FAQ.map(([q, a]) => `<details class="cr-faq" data-q="${esc((q + " " + a).toLowerCase())}"><summary>${esc(q)}</summary><div class="muted">${esc(a)}</div></details>`).join("")}</div>`;
  }
  const TR = { l: null, i: 0, tm: 0, f: "" };
  window.__TR = TR;
  function crNav(go) {
    const b = document.createElement("button");
    b.hidden = true;
    b.dataset.a = go[0];
    Object.assign(b.dataset, go[1]);
    document.body.append(b);
    b.click();
    b.remove();
  }
  function crEnd() {
    var _a2, _b2;
    TR.l = null;
    clearInterval(TR.tm);
    (_a2 = $("#crHl")) == null ? void 0 : _a2.remove();
    (_b2 = $("#crTip")) == null ? void 0 : _b2.remove();
  }
  function crStep() {
    const l = TR.l, s = l == null ? void 0 : l.s[TR.i];
    if (!s) {
      const id = l == null ? void 0 : l.id;
      crEnd();
      if (id) {
        const D = crDone();
        D[id] = 1;
        store.set("course", D);
        toast("\u2705 \u0423\u0440\u043E\u043A \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E");
      }
      S.view = courseLeft() ? "course" : navList()[0][0];
      renderNav();
      renderMain();
      return;
    }
    if (s.go) {
      const par = { zpTab: "team", setTab: "settings", cashTab: "cash", loyTab: "settings" }[s.go[0]];
      if (par && S.view !== par) crNav(V(par));
      crNav(s.go);
    }
    let hl = $("#crHl"), tip = $("#crTip");
    if (!hl) {
      hl = document.createElement("div");
      hl.id = "crHl";
      document.body.append(hl);
      tip = document.createElement("div");
      tip.id = "crTip";
      document.body.append(tip);
    }
    const draw = () => {
      const el = s.sel && [...document.querySelectorAll(s.sel)].find((e) => e.offsetParent);
      if (el && TR.sc < 5) {
        const q = el.getBoundingClientRect();
        if (q.top < 60 || q.bottom > innerHeight - 200) {
          TR.sc++;
          el.scrollIntoView({ block: "center" });
        }
      }
      const r = el == null ? void 0 : el.getBoundingClientRect();
      hl.hidden = !r;
      if (r) Object.assign(hl.style, { left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px" });
      const below = !r || r.bottom + 170 < innerHeight;
      tip.style.top = r ? (below ? r.bottom + 14 : Math.max(8, r.top - tip.offsetHeight - 14)) + "px" : "";
      tip.classList.toggle("mid", !r);
      if (s.sel && !el && !TR.miss) {
        TR.miss = Date.now();
      }
      if (s.opt && !el && Date.now() - TR.miss > 600) {
        TR.i++;
        return crStep();
      }
      const miss = s.sel && !el && Date.now() - TR.miss > 1500;
      const h = tip.querySelector(".cr-miss");
      if (h) h.hidden = !miss;
    };
    TR.miss = 0;
    TR.sc = 0;
    tip.innerHTML = `<div class="muted" style="font-size:12px">${esc(l.ic + " " + l.n)} \xB7 \u043A\u0440\u043E\u043A ${TR.i + 1} \u0437 ${l.s.length}</div><div>${esc(s.t)}</div>
      <div class="cr-miss muted" hidden style="font-size:12px">\u041A\u043D\u043E\u043F\u043A\u0438 \u0437\u0430\u0440\u0430\u0437 \u043D\u0435\u043C\u0430\u0454 \u043D\u0430 \u0435\u043A\u0440\u0430\u043D\u0456 (\u043D\u0430\u043F\u0440., \u043D\u0435\u043C\u0430\u0454 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C) \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u0414\u0430\u043B\u0456\xBB.</div>
      <div class="btnrow"><button class="btn sm ghost" data-crx="0">\u2715</button><button class="btn sm primary" data-crx="1">${TR.i + 1 < l.s.length ? "\u0414\u0430\u043B\u0456 \u2192" : "\u2705 \u0413\u043E\u0442\u043E\u0432\u043E"}</button></div>`;
    clearInterval(TR.tm);
    setTimeout(draw, 60);
    TR.tm = setInterval(draw, 300);
  }
  document.addEventListener("click", (e) => {
    const x = e.target.closest("[data-crx]");
    if (x) {
      e.stopPropagation();
      if (x.dataset.crx === "0") crEnd();
      else {
        TR.i++;
        crStep();
      }
      return;
    }
    if (!TR.l) return;
    const s = TR.l.s[TR.i];
    if ((s == null ? void 0 : s.sel) && e.target.closest(s.sel)) setTimeout(() => {
      if (TR.l) {
        TR.i++;
        crStep();
      }
    }, 450);
  }, true);
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a, id = el.dataset.id;
    if (a === "crGo") {
      TR.l = CR.find((l) => l.id === id);
      TR.i = 0;
      crStep();
    }
    if (a === "crOk") {
      const D = crDone();
      if (D[id]) delete D[id];
      else D[id] = 1;
      store.set("course", D);
      if (!courseLeft()) {
        toast("\u{1F3C5} \u041A\u0443\u0440\u0441 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E!");
        S.view = navList()[0][0];
        loadView();
      }
      renderNav();
      renderMain();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "crQ") return;
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".cr-faq").forEach((d) => {
      const hit = !q || d.dataset.q.includes(q);
      d.hidden = !hit;
      d.open = !!q && hit;
    });
  });
  const CR_TAB = { hall: "w-table", closed: "w-closed", stop: "w-stop", go: "c-take", cash: "a-cash", reports: "a-rep", calc: "a-inv", team: "a-grid", books: "a-book", settings: "a-rules" };
  const crFor = (v) => {
    const L = crList();
    if (v === "kq") return L.find((l) => l.id === (isAdmin() ? "a-del" : "k-q"));
    if (v === "calc" && isCook()) return L.find((l) => l.id === "k-stock");
    if (v === "stop" && isCook()) return L.find((l) => l.id === "k-stop");
    return L.find((l) => l.id === CR_TAB[v]);
  };
  function crHelpBtn() {
    const m = $("#main");
    if (!m || !S.view || S.view === "course" || TR.l) return;
    const l = crFor(S.view);
    if (!l) return;
    const b = document.createElement("button");
    b.className = "btn sm ghost cr-q";
    b.dataset.a = "crHelp";
    b.dataset.id = l.id;
    b.title = "\u0423\u0440\u043E\u043A: " + l.n;
    b.textContent = "\u2753";
    b.style.cssText = "position:fixed;right:12px;bottom:84px;z-index:50;border-radius:50%;width:40px;height:40px;padding:0";
    m.append(b);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest('[data-a="crHelp"]');
    if (!b) return;
    e.stopPropagation();
    TR.f = b.dataset.id;
    S.view = "course";
    renderNav();
    renderMain();
    setTimeout(() => {
      var _a2;
      return (_a2 = $("#cr-" + b.dataset.id)) == null ? void 0 : _a2.scrollIntoView({ block: "center" });
    }, 50);
  }, true);
  if (S.token) start();
  else showLogin();
})();
