/* ==========================================================================
   Daily Commercial Report — app
   The report is computed from the data sheet. Records are shared online
   through the Cloudflare server named in config.js (with login and access
   levels), or saved on this device when config.js is empty.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "value") el.value = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // Static, trusted icon markup only.
  const ICONS = {
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    arrowInBox: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    bars: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alertTri: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  };
  function icon(name) {
    const t = document.createElement("template");
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
    return t.content.firstChild;
  }

  /* ---------- lists used by the sheet and the report ---------- */
  const LEAD_STAGES = ["New", "Contacted", "Site visit", "Quotation", "Paid customer", "Lost"];
  const OPEN_STAGES = LEAD_STAGES.slice(0, 4);
  const SOURCES = ["Facebook", "TikTok", "Instagram", "Telegram", "YouTube", "Walk-in", "Referral", "Phone call", "Other"];
  const SOCIAL = ["Facebook", "TikTok", "Instagram", "Telegram", "YouTube"];
  const PRODUCTS = ["Kitchen", "Wardrobe", "Vanity", "TV unit", "Door", "Office", "Other"];
  const PAY_TYPES = ["Advance", "Final", "Other"];
  const METHODS = ["Bank transfer", "Telebirr", "Cash", "Cheque"];
  const EXP_STATUS = ["Expected", "Delayed", "Received", "Cancelled"];
  const PROB_STATUS = ["Open", "In progress", "Solved"];
  const MEAS_STATUS = ["Taken", "Scheduled", "Cancelled"];

  /* ---------- data store ---------- */
  const SAMPLE = window.REPORT_DATA || { company: {} };
  const STORE_KEY = "cr-daily-v1";
  const DATASETS = ["leads", "measurements", "payments", "expAdvance", "expFinal", "problems", "social"];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function normalize(d) {
    const out = clone(d || {});
    out.company = { ...(SAMPLE.company || {}), ...(out.company || {}) };
    for (const k of DATASETS) if (!Array.isArray(out[k])) out[k] = [];
    return out;
  }
  // Online mode: when config.js names the Cloudflare Worker API, records are shared and need a login
  const CFG = window.REPORT_CONFIG || {};
  const CONNECTED = !!(CFG.apiUrl && CFG.dept);
  const ROLE_LABEL = { owner: "Owner", editor: "Enters data", viewer: "View only" };
  let ROLE = null, ME = null;
  const canWrite = () => !CONNECTED || ROLE === "owner" || ROLE === "editor";
  let LOCAL = false;
  function loadData() {
    if (CONNECTED) return normalize({});
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { LOCAL = true; return normalize(JSON.parse(raw)); }
    } catch (e) { /* storage unavailable or corrupt */ }
    LOCAL = false;
    return normalize(SAMPLE);
  }
  let D = loadData();
  let dirty = false;
  function saveData() {
    LOCAL = true;
    dirty = true;
    if (CONNECTED) { scheduleSync(); return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); } catch (e) { toast("Could not save on this device (storage is blocked). Export to Excel to keep your changes."); }
  }

  /* ---------- formatting & dates ---------- */
  let C, LOC, CUR, fMoney, fMoneyC, fNum, fPct, fDate, fDay, fLong;
  function buildFormats() {
    C = D.company;
    LOC = C.locale || "en-US";
    CUR = String(C.currency || "ETB").trim().toUpperCase();
    try { new Intl.NumberFormat(LOC); } catch (e) { LOC = "en-US"; }
    try { new Intl.NumberFormat(LOC, { style: "currency", currency: CUR }); } catch (e) { CUR = "ETB"; }
    fMoney = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, maximumFractionDigits: 0 });
    fMoneyC = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, notation: "compact", maximumFractionDigits: 1 });
    fNum = new Intl.NumberFormat(LOC);
    fPct = new Intl.NumberFormat(LOC, { style: "percent", maximumFractionDigits: 1 });
    fDate = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" });
    fDay = new Intl.DateTimeFormat(LOC, { weekday: "short", day: "numeric", month: "short" });
    fLong = new Intl.DateTimeFormat(LOC, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  const money = (n) => fMoney.format(Math.round(Number(n) || 0));
  const moneyC = (n) => (Math.abs(n) < 10000 ? fMoney.format(Math.round(n)) : fMoneyC.format(n));
  const num = (n) => fNum.format(n);
  const pct = (n) => (Number.isFinite(n) ? fPct.format(n) : "—");
  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const isISO = (v) => isoRe.test(String(v ?? ""));
  const pad2 = (n) => String(n).padStart(2, "0");
  const parseD = (str) => { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, m - 1, d || 1); };
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = () => toISO(new Date());
  const addDays = (iso, n) => { const d = parseD(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const weekStart = (iso) => { const d = parseD(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const fdate = (str) => (isISO(str) ? fDate.format(parseD(str)) : String(str || "—"));
  const fday = (str) => (isISO(str) ? fDay.format(parseD(str)) : String(str || "—"));
  const flong = (str) => (isISO(str) ? fLong.format(parseD(str)) : String(str || "—"));
  const within = (v, a, b) => isISO(v) && v >= a && v <= b;

  const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  function groupSum(arr, keyFn, valFn = (x) => x.amount) {
    const m = new Map();
    for (const x of arr) { const k = keyFn(x) || "(blank)"; m.set(k, (m.get(k) || 0) + (Number(valFn(x)) || 0)); }
    return m;
  }
  const onDay = (rows, f, iso) => rows.filter((r) => r[f] === iso);
  const inRange = (rows, f, a, b) => rows.filter((r) => within(r[f], a, b));

  /* ---------- state ---------- */
  const state = { date: todayISO() };
  let V = {}; // view-model for the report date

  /* ---------- view model ---------- */
  function buildView() {
    const T = state.date;
    const ws = weekStart(T), we = addDays(ws, 6);
    const lws = addDays(ws, -7), lwe = addDays(ws, -1), lwT = addDays(T, -7);
    const weeks = Array.from({ length: 12 }, (_, i) => addDays(ws, (i - 11) * 7));
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const series12 = (rows, dateOf, val = () => 1) => {
      const out = weeks.map(() => 0);
      for (const r of rows) {
        const d = dateOf(r);
        if (!isISO(d) || d > T) continue;
        const i = weeks.indexOf(weekStart(d));
        if (i >= 0) out[i] += Number(val(r)) || 0;
      }
      return out;
    };
    const v = { T, ws, we, lws, lwe, lwT, weeks, days };

    // 01 paid
    const pays = D.payments;
    v.paidToday = onDay(pays, "date", T);
    v.paidWeek = inRange(pays, "date", ws, T);
    v.paidLastTD = inRange(pays, "date", lws, lwT);
    v.paidByDay = days.map((d) => (d > T ? 0 : sum(onDay(pays, "date", d))));
    v.paidTypes = PAY_TYPES.map((t) => ({ label: t, value: sum(v.paidWeek.filter((p) => (p.type || "Other") === t)), extra: [{ value: num(v.paidWeek.filter((p) => (p.type || "Other") === t).length), label: "payments" }] }));

    // 02 leads
    v.leadsToday = onDay(D.leads, "date", T);
    v.leadsWeek = inRange(D.leads, "date", ws, T);
    v.leadsLastTD = inRange(D.leads, "date", lws, lwT);
    v.leadsLastWeek = inRange(D.leads, "date", lws, lwe);
    v.leadSources = [...groupSum(v.leadsWeek, (l) => l.source, () => 1)].map(([label, value]) => ({
      label, value, extra: [{ value: num(v.leadsWeek.filter((l) => (l.source || "(blank)") === label && l.stage === "Paid customer").length), label: "became paid" }],
    })).sort((a, b) => b.value - a.value);
    v.leadStages = LEAD_STAGES.map((st) => ({ label: st, value: v.leadsWeek.filter((l) => l.stage === st).length, muted: st === "Lost" }));

    // 03 pre-measurement
    v.meas = D.measurements.map((m) => {
      const st = m.status || "Scheduled";
      let disp = st;
      if (st === "Scheduled") disp = !isISO(m.date) ? "No date" : m.date < T ? "Missed" : m.date === T ? "Due today" : "Scheduled";
      return { ...m, disp };
    });
    const taken = v.meas.filter((m) => m.status === "Taken");
    v.measToday = taken.filter((m) => m.date === T);
    v.measWeek = taken.filter((m) => within(m.date, ws, T));
    v.measLastTD = taken.filter((m) => within(m.date, lws, lwT));
    v.measUpcoming = v.meas.filter((m) => (m.status || "Scheduled") === "Scheduled" && isISO(m.date) && m.date >= T).sort((a, b) => a.date.localeCompare(b.date));
    v.measMissed = v.meas.filter((m) => m.disp === "Missed");
    v.measSeries = series12(taken, (m) => m.date);
    v.measProducts = [...groupSum(v.measWeek, (m) => m.product, () => 1)].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    // 04 / 05 expected payments
    const expView = (rows, payType) => {
      const list = rows.map((r) => {
        const st = r.status || "Expected";
        let disp = st;
        if (st === "Expected" || st === "Delayed") {
          const d = r.expectedDate;
          if (!isISO(d)) disp = st === "Delayed" ? "Delayed" : "No date";
          else if (d < T) disp = "Overdue";
          else if (d === T) disp = "Due today";
          else if (st === "Delayed") disp = "Delayed";
          else disp = d <= we ? "This week" : "Later";
        }
        const rank = { Overdue: 0, "Due today": 1, Delayed: 2, "This week": 3, Later: 4, "No date": 5, Received: 6, Cancelled: 7 }[disp] ?? 5;
        return { ...r, disp, rank, days: isISO(r.expectedDate) ? daysBetween(T, r.expectedDate) : null };
      });
      const open = list.filter((r) => r.status !== "Received" && r.status !== "Cancelled");
      return {
        list, open,
        overdue: open.filter((r) => r.disp === "Overdue"),
        dueWeek: open.filter((r) => within(r.expectedDate, T, we)),
        receivedWeek: inRange(pays.filter((p) => p.type === payType), "date", ws, T),
      };
    };
    v.adv = expView(D.expAdvance, "Advance");
    v.fin = expView(D.expFinal, "Final");

    // 06 problems
    v.problems = D.problems.filter((p) => !isISO(p.date) || p.date <= T).map((p) => ({
      ...p,
      daysOpen: p.status === "Solved"
        ? (isISO(p.solvedDate) && isISO(p.date) ? Math.max(0, daysBetween(p.date, p.solvedDate)) : null)
        : (isISO(p.date) ? Math.max(0, daysBetween(p.date, T)) : null),
    }));
    v.probOpen = v.problems.filter((p) => (p.status || "Open") === "Open");
    v.probProg = v.problems.filter((p) => p.status === "In progress");
    v.probNewToday = v.problems.filter((p) => p.date === T);
    v.probSolvedWeek = v.problems.filter((p) => p.status === "Solved" && within(p.solvedDate, ws, T));

    // 07 social media
    const socFor = (w) => D.social.filter((r) => isISO(r.week) && weekStart(r.week) === w);
    const agg = (rows) => {
      const m = new Map();
      for (const r of rows) {
        const p = r.platform || "Other";
        const a = m.get(p) || { platform: p, posts: 0, followers: 0, views: 0, inquiries: 0 };
        for (const k of ["posts", "followers", "views", "inquiries"]) a[k] += Number(r[k]) || 0;
        m.set(p, a);
      }
      return m;
    };
    v.socWeek = agg(socFor(ws));
    v.socLast = agg(socFor(lws));
    const tot = (m, k) => [...m.values()].reduce((a, x) => a + x[k], 0);
    v.soc = Object.fromEntries(["posts", "followers", "views", "inquiries"].map((k) => [k, { cur: tot(v.socWeek, k), prev: tot(v.socLast, k) }]));
    v.socialLeads = v.leadsWeek.filter((l) => SOCIAL.includes(l.source)).length;

    // 08 weekly leads
    v.leadSeries = series12(D.leads, (l) => l.date);

    // 09 converted
    const paidDateOf = (l) => (isISO(l.paidDate) ? l.paidDate : l.date);
    v.paidDateOf = paidDateOf;
    const conv = D.leads.filter((l) => l.stage === "Paid customer");
    v.convAll = conv.filter((l) => !isISO(paidDateOf(l)) || paidDateOf(l) <= T);
    v.convWeek = conv.filter((l) => within(paidDateOf(l), ws, T));
    v.convLastTD = conv.filter((l) => within(paidDateOf(l), lws, lwT));
    v.convSeries = series12(conv, paidDateOf);
    const conv12 = conv.filter((l) => within(paidDateOf(l), weeks[0], T));
    const leads12 = inRange(D.leads, "date", weeks[0], T).length;
    v.convRate = leads12 ? conv12.length / leads12 : NaN;
    const dd = conv12.filter((l) => isISO(l.date)).map((l) => daysBetween(l.date, paidDateOf(l))).filter((n) => n >= 0);
    v.convDays = dd.length ? dd.reduce((a, b) => a + b, 0) / dd.length : NaN;

    v.weekLabels = weeks.map((w) => ({ short: fDay.format(parseD(w)).replace(/^[^,]+,\s*/, ""), long: `Week of ${fdate(w)}` }));
    v.dayLabels = days.map((d) => ({ short: fDay.format(parseD(d)).split(",")[0], long: flong(d) }));
    return v;
  }

  /* ---------- small components ---------- */
  function deltaChip(cur, prev, { upGood = true, pts = false } = {}) {
    if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) return null;
    let change, text;
    if (pts) { change = cur - prev; text = `${(Math.abs(change) * 100).toFixed(1)} pts`; }
    else {
      if (prev === 0) return null;
      change = (cur - prev) / Math.abs(prev);
      text = change >= 9 && prev > 0 ? `${num(Math.round(cur / prev))}×` : pct(Math.abs(change));
    }
    if (Math.abs(change) < 0.0005) return h("span", { class: "delta flat" }, "Same");
    const up = change > 0;
    return h("span", { class: `delta ${up === upGood ? "good" : "bad"}` },
      icon(up ? "arrowUp" : "arrowDown"), h("span", { class: "sr-only" }, up ? "up " : "down "), text);
  }
  function compare(cur, prev, opts, label = "last week") {
    const chip = deltaChip(cur, prev, opts);
    return chip ? [chip, h("span", {}, `vs ${label}`)] : null;
  }

  const STATUS = {
    Received: "good", "Paid customer": "good", Solved: "good", Installed: "good", Ready: "good",
    "Due today": "warning", "This week": "warning", "In progress": "warning", Expected: "warning",
    Delayed: "serious", Open: "serious", Overdue: "critical", Missed: "critical", Taken: "good", Scheduled: "warning",
    Lost: "neutral", Later: "neutral", Cancelled: "neutral", "No date": "neutral",
  };
  const STATUS_ICON = { good: "check", warning: "clock", serious: "alertTri", critical: "alertCircle", neutral: "circle" };
  function badge(text) {
    const tone = STATUS[text] || "neutral";
    return h("span", { class: `badge ${tone}` }, icon(text === "Lost" || text === "Cancelled" ? "xCircle" : STATUS_ICON[tone]), text || "—");
  }
  function stageCell(stage) {
    if (!OPEN_STAGES.includes(stage)) return badge(stage || "—");
    const i = OPEN_STAGES.indexOf(stage);
    return h("span", { class: "stage" },
      h("span", { class: "stage-dots", "aria-hidden": "true" }, OPEN_STAGES.map((_, j) => h("i", { class: j <= i ? "on" : null }))),
      stage);
  }
  const twoLine = (a, b) => [h("span", { class: "strong" }, a || "—"), b ? h("span", { class: "sub" }, b) : null];
  const dueText = (r) => {
    if (r.status === "Received" || r.status === "Cancelled" || r.days == null) return "";
    if (r.days < 0) return `${-r.days} day${r.days === -1 ? "" : "s"} late`;
    if (r.days === 0) return "today";
    return `in ${r.days} day${r.days === 1 ? "" : "s"}`;
  };

  function emptyState(title = "Nothing yet", text = "Add records in the Data sheet and this fills in.") {
    return h("div", { class: "empty" }, h("strong", {}, title), text);
  }
  function statStrip(el, items) {
    el.replaceChildren(...items.map((it) => h("div", { class: "stat" },
      h("span", { class: "stat-label" }, it.label),
      h("span", { class: "stat-value", title: it.title || null }, it.value),
      it.foot ? h("span", { class: "stat-foot" }, it.foot) : null)));
  }

  /* ---------- tooltip & toast ---------- */
  const tip = $("#tooltip");
  function showTip(x, y, title, rows) {
    tip.replaceChildren(
      h("div", { class: "tip-title" }, title),
      ...rows.map((r) => h("div", { class: "tip-row" + (r.sep ? " sep" : "") },
        h("span", { class: "tip-key" + (r.key ? " k-" + r.key : "") }),
        h("strong", {}, r.value),
        h("span", {}, r.label || ""))));
    tip.hidden = false;
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let left = x + 14, top = y - ht - 12;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 18;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  function tipAt(el, title, rows) {
    const r = el.getBoundingClientRect();
    showTip(r.left + r.width / 2, r.top, title, rows);
  }
  addEventListener("scroll", hideTip, { passive: true });

  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(text, action) {
    clearTimeout(toastTimer);
    toastEl.replaceChildren(h("span", {}, text));
    if (action) {
      const b = h("button", { type: "button" }, action.label);
      b.addEventListener("click", () => { toastEl.hidden = true; action.run(); });
      toastEl.append(b);
    }
    toastEl.hidden = false;
    toastTimer = setTimeout(() => (toastEl.hidden = true), action ? 7000 : 4000);
  }

  /* ---------- charts ---------- */
  function niceScale(max, count = 4, integer = false) {
    if (!(max > 0)) max = integer ? count : 1;
    const raw = max / count;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const steps = (integer && pow < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).map((m) => Math.max(integer ? 1 : 0, m * pow));
    const step = steps.find((x) => x >= raw) || steps[steps.length - 1];
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    return { top, ticks };
  }
  const tickRoom = (ticks, fmt) => Math.max(30, Math.max(...ticks.map((t) => fmt(t).length)) * 6.4 + 12);
  const noData = (series) => series.every((se) => se.values.every((v) => !v));

  function colPath(x, yTop, w, yBase) {
    const hgt = yBase - yTop;
    if (hgt <= 0.5) return "";
    const r = Math.min(4, w / 2, hgt);
    return `M${x},${yBase}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${yBase}Z`;
  }

  // Column chart over any list of labels ({short, long}); `selected` = Set of highlighted indexes
  function drawColumns(el, { labels, series, selected, fmt, fmtTick, integer = false, extraRows, label, emptyText }) {
    if (noData(series)) { el.replaceChildren(emptyState("No data yet", emptyText || "Add records in the Data sheet and this chart fills in.")); return; }
    const n = labels.length;
    const W = Math.max(el.clientWidth - 18, 260), H = 244;
    const maxV = Math.max(0, ...series.flatMap((se) => se.values));
    const { top, ticks } = niceScale(maxV, 4, integer);
    const m = { t: 22, r: 8, b: 30, l: tickRoom(ticks, fmtTick) };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / n;
    const k = series.length, gap = 2;
    const colW = Math.max(3, Math.min(24, (step * 0.62 - gap * (k - 1)) / k));
    const groupW = colW * k + gap * (k - 1);
    const y = (v) => m.t + ph - (v / top) * ph;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": label });

    for (const t of ticks) {
      const yy = Math.round(y(t)) + 0.5;
      svg.append(s("line", { class: t === 0 ? "axis-line" : "grid-line", x1: m.l, x2: W - m.r, y1: yy, y2: yy }));
      svg.append(s("text", { class: "tick", x: m.l - 8, y: yy + 4, "text-anchor": "end" }, fmtTick(t)));
    }
    const partial = selected.size < n;
    const every = Math.max(1, Math.ceil(34 / step));
    labels.forEach((lb, i) => {
      if (i % every && !selected.has(i) && i !== n - 1) return;
      svg.append(s("text", { class: "x-label" + (partial && selected.has(i) ? " sel" : ""), x: m.l + step * (i + 0.5), y: m.t + ph + 20, "text-anchor": "middle" }, lb.short));
    });

    let peak = -1;
    if (k === 1) peak = series[0].values.indexOf(Math.max(...series[0].values));
    labels.forEach((lb, i) => {
      const cx = m.l + step * (i + 0.5);
      const rows = () => {
        const r = series.map((se) => ({ key: se.key, value: fmt(se.values[i]), label: se.name }));
        if (extraRows) r.push(...extraRows(i));
        return r;
      };
      const hit = s("rect", {
        class: "hit", x: m.l + step * i + 1, y: m.t - 6, width: Math.max(0, step - 2), height: ph + 6, rx: 6, tabindex: 0,
        "aria-label": `${lb.long}: ${series.map((se) => `${se.name} ${fmt(se.values[i])}`).join(", ")}`,
      });
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, lb.long, rows()));
      hit.addEventListener("pointerdown", (e) => showTip(e.clientX, e.clientY, lb.long, rows()));
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("focus", () => { hit.classList.add("focus"); tipAt(hit, lb.long, rows()); });
      hit.addEventListener("blur", () => { hit.classList.remove("focus"); hideTip(); });
      svg.append(hit);
      series.forEach((se, j) => {
        const x0 = cx - groupW / 2 + j * (colW + gap);
        svg.append(s("path", { class: `col k-${se.key}${partial && !selected.has(i) ? " dim" : ""}`, d: colPath(x0, y(se.values[i]), colW, y(0)) }));
      });
      const labelHere = k === 1 && series[0].values[i] > 0 && (i === peak || selected.has(i));
      if (labelHere) svg.append(s("text", { class: "peak-label", x: cx, y: y(series[0].values[i]) - 7, "text-anchor": "middle" }, fmtTick(series[0].values[i])));
    });
    el.replaceChildren(svg);
  }

  function drawSpark(el, values, selected, labels) {
    const n = values.length;
    const W = Math.max(el.clientWidth, 200), H = 56;
    const step = W / n, colW = Math.min(26, step * 0.58);
    const top = Math.max(...values) || 1;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Paid per day this week" });
    values.forEach((v, i) => {
      const x0 = step * i + (step - colW) / 2;
      const hit = s("rect", { class: "hit", x: step * i, y: 0, width: step, height: H, rx: 6 });
      const rows = [{ key: "in", value: money(v), label: "Paid" }];
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, labels[i].long, rows));
      hit.addEventListener("pointerleave", hideTip);
      svg.append(hit, s("path", { class: `col ${selected.has(i) ? "k-in" : "k-muted"}`, d: colPath(x0, H - 2 - (v / top) * (H - 8), colW, H - 2) }));
    });
    svg.append(s("line", { class: "axis-line", x1: 0, x2: W, y1: H - 1.5, y2: H - 1.5 }));
    el.replaceChildren(svg);
  }

  function drawHBars(el, items, { key = "in", fmt = num, tipFmt = fmt, share = true, unit = "" } = {}) {
    if (!items.length || items.every((i) => !i.value)) { el.replaceChildren(emptyState("Nothing this week", "Add records in the Data sheet and this fills in.")); return; }
    const max = Math.max(...items.map((i) => i.value)) || 1;
    const total = sum(items, (i) => i.value);
    const list = h("div", { class: "hb", role: "list" });
    for (const it of items) {
      const k = it.muted ? "muted" : key;
      const rows = () => {
        const r = [{ key: it.muted ? null : key, value: tipFmt(it.value), label: unit }];
        if (share && total) r.push({ value: pct(it.value / total), label: "of total" });
        if (it.extra) r.push(...it.extra);
        return r;
      };
      const bar = h("div", { class: `hb-bar k-${k}`, style: `--p:${Math.max(0, it.value / max).toFixed(4)}` });
      const row = h("div", { class: "hb-row", tabindex: 0, role: "listitem", "aria-label": `${it.label}: ${tipFmt(it.value)}` },
        h("div", { class: "hb-label", title: it.label }, it.label),
        h("div", { class: "hb-track" }, bar, h("span", { class: "hb-val" }, fmt(it.value))));
      row.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, it.label, rows()));
      row.addEventListener("pointerleave", hideTip);
      row.addEventListener("focus", () => tipAt(bar, it.label, rows()));
      row.addEventListener("blur", hideTip);
      list.append(row);
    }
    el.replaceChildren(list);
  }

  function simpleTable({ head, rows, num: numCols = [], foot }) {
    const cls = (i) => (numCols.includes(i) ? "num" : null);
    const t = h("table", { class: "dt" },
      h("thead", {}, h("tr", {}, head.map((c, i) => h("th", { class: cls(i), scope: "col" }, c)))),
      h("tbody", {}, rows.length
        ? rows.map((r) => h("tr", {}, r.map((c, i) => h("td", { class: cls(i) }, c))))
        : h("tr", {}, h("td", { colspan: head.length }, emptyState()))));
    if (foot && rows.length) t.append(h("tfoot", {}, h("tr", {}, foot.map((c, i) => h("td", { class: cls(i) }, c)))));
    return h("div", { class: "table-wrap", style: "border-top:0" }, t);
  }

  // chart registry: each card[data-chart] gets a header, chart body and a table twin
  const CHARTS = {};
  const chart = (id, def) => { CHARTS[id] = def; };
  function buildChartCards() {
    $$(".chart-card[data-chart]").forEach((card) => {
      const toggle = h("div", { class: "seg seg-sm view-toggle", role: "group", "aria-label": "View as" },
        h("button", { type: "button", "data-view": "chart", "aria-pressed": "true" }, "Chart"),
        h("button", { type: "button", "data-view": "table", "aria-pressed": "false" }, "Table"));
      card.replaceChildren(
        h("header", { class: "card-head" }, h("div", {}, h("h3", {}, card.dataset.title), h("p", { class: "card-sub" }, card.dataset.sub || "")), toggle),
        h("div", { class: "chart-body" + (card.hasAttribute("data-hb") ? " hb-body" : "") }),
        h("div", { class: "chart-table", hidden: true }));
      $$("button", toggle).forEach((b) => b.addEventListener("click", () => {
        card.dataset.view = b.dataset.view;
        $$("button", toggle).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawChart(card.dataset.chart);
      }));
    });
  }
  function drawChart(id) {
    const card = $(`[data-chart="${id}"]`), def = CHARTS[id];
    if (!card || !def) return;
    const view = card.dataset.view || "chart";
    const body = $(".chart-body", card), tbl = $(".chart-table", card);
    body.hidden = view !== "chart";
    tbl.hidden = view !== "table";
    if (view === "chart") def.draw(body);
    else tbl.replaceChildren(simpleTable(def.table()));
  }

  /* ---------- report tables ---------- */
  class DataTable {
    constructor(root, cfg) {
      this.root = root;
      this.cfg = cfg;
      this.rows = [];
      this.q = "";
      this.filters = {};
      this.tab = cfg.tabs ? cfg.tabs.options[0].value : null;
      this.page = 0;
      this.sort = cfg.sort || null;
      this.pageSize = cfg.pageSize || 8;
      this.printAll = false;
      this.build();
    }
    build() {
      const cfg = this.cfg;
      const bar = h("div", { class: "dt-toolbar" });
      if (cfg.tabs) {
        const seg = h("div", { class: "seg seg-sm", role: "group", "aria-label": cfg.tabs.label });
        for (const o of cfg.tabs.options) {
          const b = h("button", { type: "button", "aria-pressed": String(o.value === this.tab) }, o.label);
          b.addEventListener("click", () => {
            this.tab = o.value; this.page = 0;
            $$("button", seg).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            this.draw();
          });
          seg.append(b);
        }
        bar.append(seg);
      }
      if (cfg.search) {
        const input = h("input", { class: "input", type: "search", placeholder: cfg.placeholder || "Search", "aria-label": cfg.placeholder || "Search" });
        input.addEventListener("input", () => { this.q = input.value.trim().toLowerCase(); this.page = 0; this.draw(); });
        bar.append(h("div", { class: "dt-search" }, icon("search"), input));
      }
      for (const f of cfg.filters || []) {
        const sel = h("select", { class: "select", "aria-label": f.label },
          h("option", { value: "" }, `All ${f.plural || f.label.toLowerCase() + "s"}`),
          f.options.map((o) => h("option", { value: o }, o)));
        sel.addEventListener("change", () => { this.filters[f.key] = sel.value; this.page = 0; this.draw(); });
        bar.append(sel);
      }
      bar.append(h("span", { class: "dt-spacer" }));
      const csv = h("button", { class: "btn btn-sm", type: "button", title: "Download these rows as CSV" }, icon("download"), "CSV");
      csv.addEventListener("click", () => this.csv());
      bar.append(csv);
      this.wrap = h("div", { class: "table-wrap" });
      this.foot = h("div", { class: "dt-foot" });
      this.root.replaceChildren(bar, this.wrap, this.foot);
    }
    setRows(rows) { this.rows = rows; this.page = 0; this.draw(); }
    filtered() {
      let r = this.rows;
      if (this.cfg.tabs) {
        const opt = this.cfg.tabs.options.find((o) => o.value === this.tab);
        if (opt && opt.match) r = r.filter(opt.match);
        else if (this.tab !== "All") r = r.filter((x) => x[this.cfg.tabs.key] === this.tab);
      }
      for (const [k, v] of Object.entries(this.filters)) if (v) r = r.filter((x) => String(x[k]) === v);
      if (this.q) r = r.filter((x) => this.cfg.search.some((k) => String(x[k] ?? "").toLowerCase().includes(this.q)));
      if (this.sort) {
        const col = this.cfg.columns.find((c) => c.key === this.sort.key);
        const val = col.sortVal || ((x) => x[col.key]);
        r = [...r].sort((a, b) => {
          const A = val(a), B = val(b);
          return (A < B ? -1 : A > B ? 1 : 0) * this.sort.dir;
        });
      }
      return r;
    }
    draw() {
      const cols = this.cfg.columns;
      const all = this.filtered();
      const pages = Math.max(1, Math.ceil(all.length / this.pageSize));
      if (this.page >= pages) this.page = pages - 1;
      const start = this.page * this.pageSize;
      const view = this.printAll ? all : all.slice(start, start + this.pageSize);

      const thead = h("thead", {}, h("tr", {}, cols.map((c) => {
        const active = this.sort && this.sort.key === c.key;
        const btn = h("button", { type: "button" }, c.label, h("span", { class: "arrow", "aria-hidden": "true" }, active ? (this.sort.dir > 0 ? "▲" : "▼") : ""));
        btn.addEventListener("click", () => {
          this.sort = active ? { key: c.key, dir: -this.sort.dir } : { key: c.key, dir: c.num ? -1 : 1 };
          this.draw();
        });
        return h("th", { class: c.num ? "num" : null, scope: "col", "aria-sort": active ? (this.sort.dir > 0 ? "ascending" : "descending") : null }, btn);
      })));
      const tbody = h("tbody", {}, view.length
        ? view.map((r) => h("tr", {}, cols.map((c) => h("td", { class: [c.num ? "num" : "", c.cls || ""].join(" ").trim() || null }, c.cell ? c.cell(r) : r[c.key]))))
        : h("tr", {}, h("td", { colspan: cols.length }, emptyState(this.cfg.emptyTitle || "Nothing here", this.cfg.emptyText || "Add records in the Data sheet."))));
      this.wrap.replaceChildren(h("table", { class: "dt" }, thead, tbody));

      const info = h("span", {}, all.length
        ? [`Showing ${num(this.printAll ? 1 : start + 1)}–${num(this.printAll ? all.length : Math.min(start + this.pageSize, all.length))} of `, h("strong", {}, num(all.length)), this.cfg.summary ? [" · ", this.cfg.summary(all)] : null]
        : "No records");
      const pager = h("div", { class: "pager" });
      const prev = h("button", { type: "button", "aria-label": "Previous page", disabled: this.page === 0 }, "‹");
      const next = h("button", { type: "button", "aria-label": "Next page", disabled: this.page >= pages - 1 }, "›");
      prev.addEventListener("click", () => { this.page--; this.draw(); });
      next.addEventListener("click", () => { this.page++; this.draw(); });
      pager.append(prev, h("span", { class: "pg" }, `${this.page + 1} / ${pages}`), next);
      this.foot.replaceChildren(info, pages > 1 ? pager : h("span"));
    }
    csv() {
      const cols = this.cfg.columns;
      const esc = (v) => { const t = String(v ?? ""); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
      const lines = [cols.map((c) => esc(c.label)).join(",")];
      for (const r of this.filtered()) lines.push(cols.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(","));
      download(`${this.cfg.name}-${state.date}.csv`, "﻿" + lines.join("\n"), "text/csv;charset=utf-8");
    }
  }

  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  const uniq = (arr, key) => [...new Set(arr.map((x) => x[key]).filter((v) => v !== "" && v != null))].sort();
  const openTab = { value: "Open", label: "Open", match: (r) => r.status !== "Received" && r.status !== "Cancelled" };

  let TABLES = {};
  function buildTables() {
    const expCols = [
      { key: "expectedDate", label: "Expected", cell: (r) => fdate(r.expectedDate), cls: "muted" },
      { key: "customer", label: "Customer / project", cell: (r) => twoLine(r.customer, r.project) },
      { key: "amount", label: "Amount", num: true, cell: (r) => money(r.amount) },
      { key: "disp", label: "Status", cell: (r) => badge(r.disp), sortVal: (r) => r.rank * 1e6 + (r.days ?? 5e5), csv: (r) => r.disp },
      { key: "days", label: "When", cell: (r) => dueText(r), cls: "muted", csv: (r) => dueText(r) },
      { key: "note", label: "Note", cls: "wrap muted" },
    ];
    const expCfg = (name) => ({
      name, columns: expCols, sort: { key: "disp", dir: 1 },
      tabs: { key: "status", label: "Show", options: [openTab, { value: "Received", label: "Received" }, { value: "All", label: "All" }] },
      search: ["customer", "project", "note"], placeholder: "Search customer or project",
      summary: (rows) => ["Total ", h("strong", {}, money(sum(rows)))],
      emptyTitle: "No expected payments", emptyText: "Add them in the Data sheet.",
    });
    TABLES = {
      paid: new DataTable($("#paid-table"), {
        name: "paid-today",
        columns: [
          { key: "customer", label: "Customer / project", cell: (r) => twoLine(r.customer, r.project) },
          { key: "type", label: "Type" },
          { key: "method", label: "Method" },
          { key: "note", label: "Note", cls: "wrap muted" },
          { key: "amount", label: "Amount", num: true, cell: (r) => money(r.amount) },
        ],
        sort: { key: "amount", dir: -1 },
        summary: (rows) => ["Total ", h("strong", {}, money(sum(rows)))],
        emptyTitle: "No payments on this day", emptyText: "Payments you record for this date appear here.",
      }),
      leads: new DataTable($("#leads-table"), {
        name: "leads-this-week", search: ["customer", "phone", "source", "rep", "note"], placeholder: "Search customer or phone",
        filters: [{ key: "source", label: "Source", options: SOURCES }, { key: "stage", label: "Stage", options: LEAD_STAGES }],
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fday(r.date), cls: "muted" },
          { key: "customer", label: "Customer", cell: (r) => twoLine(r.customer, r.phone) },
          { key: "source", label: "Source" },
          { key: "product", label: "Product" },
          { key: "stage", label: "Stage", cell: (r) => stageCell(r.stage), sortVal: (r) => LEAD_STAGES.indexOf(r.stage) },
          { key: "rep", label: "Sales rep" },
        ],
        emptyTitle: "No leads this week", emptyText: "New leads you add appear here.",
      }),
      measure: new DataTable($("#measure-table"), {
        name: "pre-measurements", search: ["customer", "phone", "location", "measuredBy", "note"], placeholder: "Search customer, phone or site",
        tabs: { key: "status", label: "Show", options: [
          { value: "Week", label: "Taken this week", match: (r) => r.status === "Taken" && within(r.date, V.ws, V.T) },
          { value: "Scheduled", label: "Scheduled & missed", match: (r) => (r.status || "Scheduled") === "Scheduled" },
          { value: "All", label: "All" }] },
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fday(r.date), cls: "muted" },
          { key: "customer", label: "Customer", cell: (r) => twoLine(r.customer, r.phone) },
          { key: "location", label: "Location / site" },
          { key: "product", label: "Product" },
          { key: "measuredBy", label: "Measured by" },
          { key: "disp", label: "Status", cell: (r) => badge(r.disp), csv: (r) => r.disp },
          { key: "note", label: "Note", cls: "wrap muted" },
        ],
        emptyTitle: "No pre-measurements here", emptyText: "Add them in the Data sheet (Pre-measurement tab).",
      }),
      advance: new DataTable($("#advance-table"), expCfg("expected-advance")),
      final: new DataTable($("#final-table"), expCfg("expected-final")),
      problems: new DataTable($("#problem-table"), {
        name: "problems", search: ["customer", "problem", "owner", "action"], placeholder: "Search problems",
        tabs: { key: "status", label: "Show", options: [
          { value: "Open", label: "Not solved", match: (r) => r.status !== "Solved" },
          { value: "Solved", label: "Solved" }, { value: "All", label: "All" }] },
        sort: { key: "status", dir: 1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "customer", label: "Customer / project", cls: "strong" },
          { key: "problem", label: "Problem", cls: "wrap" },
          { key: "owner", label: "Responsible" },
          { key: "status", label: "Status", cell: (r) => badge(r.status || "Open"), sortVal: (r) => ({ Open: 0, "In progress": 1, Solved: 2 }[r.status || "Open"] ?? 0) * 1e6 - (r.daysOpen ?? 0) },
          { key: "daysOpen", label: "Days", num: true, cell: (r) => (r.daysOpen == null ? "—" : num(r.daysOpen)) },
          { key: "action", label: "Action", cls: "wrap muted" },
        ],
        emptyTitle: "No problems", emptyText: "Good news, or add problems in the Data sheet.",
      }),
      converted: new DataTable($("#convert-table"), {
        name: "new-paid-customers",
        sort: { key: "paid", dir: -1 },
        columns: [
          { key: "paid", label: "Paid date", cell: (r) => fday(r.paid), cls: "muted" },
          { key: "customer", label: "Customer", cell: (r) => twoLine(r.customer, r.phone) },
          { key: "source", label: "Source" },
          { key: "product", label: "Product" },
          { key: "date", label: "Lead date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "days", label: "Days to pay", num: true, cell: (r) => (r.days == null ? "—" : num(r.days)) },
        ],
        emptyTitle: "No new paid customers this week", emptyText: "Set a lead's stage to \"Paid customer\" in the Data sheet.",
      }),
    };
  }

  /* ---------- report sections ---------- */
  function renderGlance() {
    const v = V;
    const spark = h("div", { class: "hero-spark-bars" });
    const todayIdx = v.days.indexOf(v.T);
    $("#hero").replaceChildren(
      h("div", { class: "hero-top" },
        h("span", { class: "hero-label" }, "Paid today ", h("span", {}, `· ${fday(v.T)}`)),
        h("span", { class: "tile-foot" }, `${num(v.paidToday.length)} payment${v.paidToday.length === 1 ? "" : "s"}`)),
      h("div", { class: "hero-value", title: money(sum(v.paidToday)) }, moneyC(sum(v.paidToday))),
      h("div", { class: "hero-sub" }, "This week so far ", h("strong", {}, money(sum(v.paidWeek))), " ", compare(sum(v.paidWeek), sum(v.paidLastTD))),
      h("div", { class: "hero-spark" }, spark,
        h("div", { class: "hero-spark-caption" }, h("span", {}, v.dayLabels[0].short), h("span", {}, "Paid per day this week"), h("span", {}, v.dayLabels[6].short))));
    V.spark = spark;
    drawSpark(spark, v.paidByDay, new Set([todayIdx]), v.dayLabels);

    const tile = (label, value, foot, title) => h("article", { class: "card tile" },
      h("span", { class: "tile-label" }, label), h("span", { class: "tile-value", title }, value), h("span", { class: "tile-foot" }, foot));
    const expFoot = (x) => (x.overdue.length ? h("span", { class: "delta bad" }, icon("alertCircle"), `${money(sum(x.overdue))} overdue`) : `${num(x.dueWeek.length)} due this week`);
    $("#kpi-tiles").replaceChildren(
      tile("New leads today", num(v.leadsToday.length), `${num(v.leadsWeek.length)} this week`),
      tile("New paid customers", num(v.convWeek.length), compare(v.convWeek.length, v.convLastTD.length) || "This week"),
      tile("Pre-measurements this week", num(v.measWeek.length), v.measMissed.length ? h("span", { class: "delta bad" }, icon("alertCircle"), `${num(v.measMissed.length)} missed`) : `${num(v.measToday.length)} today · ${num(v.measUpcoming.length)} scheduled`),
      tile("Expected advance", moneyC(sum(v.adv.dueWeek)), expFoot(v.adv), money(sum(v.adv.dueWeek))),
      tile("Expected final", moneyC(sum(v.fin.dueWeek)), expFoot(v.fin), money(sum(v.fin.dueWeek))),
      tile("Open problems", num(v.probOpen.length + v.probProg.length), v.probNewToday.length ? `${num(v.probNewToday.length)} new today` : `${num(v.probSolvedWeek.length)} solved this week`));
  }

  function renderPaid() {
    const v = V;
    const byType = (t, rows) => sum(rows.filter((p) => (p.type || "Other") === t));
    statStrip($("#paid-stats"), [
      { label: "Paid today", value: moneyC(sum(v.paidToday)), title: money(sum(v.paidToday)), foot: `${num(v.paidToday.length)} payments` },
      { label: "Paid this week", value: moneyC(sum(v.paidWeek)), title: money(sum(v.paidWeek)), foot: compare(sum(v.paidWeek), sum(v.paidLastTD)) || `${num(v.paidWeek.length)} payments` },
      { label: "Advance this week", value: moneyC(byType("Advance", v.paidWeek)), title: money(byType("Advance", v.paidWeek)), foot: "Deposits received" },
      { label: "Final this week", value: moneyC(byType("Final", v.paidWeek)), title: money(byType("Final", v.paidWeek)), foot: "Final payments received" },
    ]);
    $("#paid-table-sub").textContent = flong(v.T);
    TABLES.paid.setRows(v.paidToday);
  }

  function renderLeads() {
    const v = V;
    const top = v.leadSources[0];
    statStrip($("#leads-stats"), [
      { label: "Leads today", value: num(v.leadsToday.length), foot: fday(v.T) },
      { label: "This week so far", value: num(v.leadsWeek.length), foot: compare(v.leadsWeek.length, v.leadsLastTD.length) || `${fday(v.ws)} – ${fday(v.T)}` },
      { label: "Last week", value: num(v.leadsLastWeek.length), foot: `${fday(v.lws)} – ${fday(v.lwe)}` },
      { label: "Top source this week", value: top ? top.label : "—", foot: top ? `${num(top.value)} leads` : "No leads yet" },
    ]);
    TABLES.leads.setRows(v.leadsWeek);
  }

  function renderMeasure() {
    const v = V;
    const next = v.measUpcoming[0];
    statStrip($("#measure-stats"), [
      { label: "Taken today", value: num(v.measToday.length), foot: fday(v.T) },
      { label: "Taken this week", value: num(v.measWeek.length), foot: compare(v.measWeek.length, v.measLastTD.length) || `${fday(v.ws)} – ${fday(v.T)}` },
      { label: "Scheduled", value: num(v.measUpcoming.length), foot: next ? `Next: ${fday(next.date)}, ${next.customer || ""}` : "Nothing booked" },
      { label: "Missed", value: num(v.measMissed.length), foot: v.measMissed.length ? h("span", { class: "delta bad" }, icon("alertCircle"), "Date passed, not taken") : "None" },
    ]);
    TABLES.measure.setRows(v.meas);
  }

  function renderExpected(x, statsSel, table, word) {
    statStrip($(statsSel), [
      { label: `Open ${word}`, value: moneyC(sum(x.open)), title: money(sum(x.open)), foot: `${num(x.open.length)} customers` },
      { label: "Overdue", value: moneyC(sum(x.overdue)), title: money(sum(x.overdue)), foot: x.overdue.length ? h("span", { class: "delta bad" }, icon("alertCircle"), `${num(x.overdue.length)} late`) : "Nothing late" },
      { label: "Due this week", value: moneyC(sum(x.dueWeek)), title: money(sum(x.dueWeek)), foot: `${num(x.dueWeek.length)} from today to ${fday(V.we)}` },
      { label: "Received this week", value: moneyC(sum(x.receivedWeek)), title: money(sum(x.receivedWeek)), foot: `${num(x.receivedWeek.length)} ${word} payments` },
    ]);
    table.setRows(x.list);
  }

  function renderProblems() {
    const v = V;
    const oldest = [...v.probOpen, ...v.probProg].sort((a, b) => (b.daysOpen ?? 0) - (a.daysOpen ?? 0))[0];
    statStrip($("#problem-stats"), [
      { label: "Open", value: num(v.probOpen.length), foot: oldest ? `Oldest: ${num(oldest.daysOpen ?? 0)} days` : "None open" },
      { label: "In progress", value: num(v.probProg.length), foot: "Being solved" },
      { label: "New today", value: num(v.probNewToday.length), foot: fday(v.T) },
      { label: "Solved this week", value: num(v.probSolvedWeek.length), foot: "Closed since Monday" },
    ]);
    TABLES.problems.setRows(v.problems);
  }

  function renderSocial() {
    const v = V;
    const st = (label, k) => ({ label, value: num(v.soc[k].cur), foot: compare(v.soc[k].cur, v.soc[k].prev) || "This week" });
    statStrip($("#social-stats"), [
      st("Posts", "posts"), st("New followers", "followers"), st("Views", "views"), st("Inquiries", "inquiries"),
      { label: "Leads from social media", value: num(v.socialLeads), foot: "From the Leads sheet" },
    ]);
    const platforms = [...new Set([...SOCIAL, ...v.socWeek.keys(), ...v.socLast.keys()])].filter((p) => v.socWeek.has(p) || v.socLast.has(p));
    const rows = platforms.map((p) => {
      const a = v.socWeek.get(p) || { posts: 0, followers: 0, views: 0, inquiries: 0 };
      const b = v.socLast.get(p) || { inquiries: 0 };
      return [p, num(a.posts), num(a.followers), num(a.views), num(a.inquiries), num(b.inquiries)];
    });
    const t = (k) => num(v.soc[k].cur);
    $("#social-table").replaceChildren(simpleTable({
      head: ["Platform", "Posts", "New followers", "Views", "Inquiries", "Inquiries last week"], num: [1, 2, 3, 4, 5],
      rows, foot: ["Total", t("posts"), t("followers"), t("views"), t("inquiries"), num(v.soc.inquiries.prev)],
    }));
    V.socialInq = platforms.map((p) => ({ label: p, value: (v.socWeek.get(p) || {}).inquiries || 0 })).sort((a, b) => b.value - a.value);
    V.socialViews = platforms.map((p) => ({ label: p, value: (v.socWeek.get(p) || {}).views || 0 })).sort((a, b) => b.value - a.value);
  }

  function renderWeekly() {
    const v = V;
    const done = v.leadSeries.slice(0, 11);
    const best = Math.max(...v.leadSeries);
    statStrip($("#weekly-stats"), [
      { label: "This week so far", value: num(v.leadSeries[11]), foot: compare(v.leadsWeek.length, v.leadsLastTD.length, {}, "same days last week") || "Leads" },
      { label: "Last week", value: num(v.leadSeries[10]), foot: `${fday(v.lws)} – ${fday(v.lwe)}` },
      { label: "Average per week", value: done.some(Boolean) ? num(Math.round(sum(done, (x) => x) / 11)) : "—", foot: "Last 11 full weeks" },
      { label: "Best week", value: best ? num(best) : "—", foot: best ? v.weekLabels[v.leadSeries.indexOf(best)].long : "" },
    ]);
  }

  function renderConverted() {
    const v = V;
    statStrip($("#convert-stats"), [
      { label: "New paid customers this week", value: num(v.convWeek.length), foot: compare(v.convWeek.length, v.convLastTD.length) || "Leads changed to paid" },
      { label: "Conversion rate", value: pct(v.convRate), foot: "Paid customers ÷ leads, 12 weeks" },
      { label: "Days from lead to paid", value: Number.isFinite(v.convDays) ? num(Math.round(v.convDays)) : "—", foot: "Average, 12 weeks" },
      { label: "Paid customers in total", value: num(v.convAll.length), foot: "All time" },
    ]);
    TABLES.converted.setRows(v.convWeek.map((l) => {
      const paid = v.paidDateOf(l);
      return { ...l, paid, days: isISO(l.date) && isISO(paid) ? Math.max(0, daysBetween(l.date, paid)) : null };
    }));
  }

  /* ---------- chart definitions ---------- */
  const one = (i) => new Set([i]);
  chart("paidDays", {
    draw: (el) => drawColumns(el, { labels: V.dayLabels, series: [{ name: "Paid", key: "in", values: V.paidByDay }], selected: one(V.days.indexOf(V.T)), fmt: money, fmtTick: moneyC, label: "Paid per day this week", emptyText: "No payments recorded this week yet." }),
    table: () => ({ head: ["Day", "Paid"], num: [1], rows: V.days.map((d, i) => [flong(d), money(V.paidByDay[i])]), foot: ["Total", money(sum(V.paidByDay, (x) => x))] }),
  });
  chart("paidTypes", { fluid: true, draw: (el) => drawHBars(el, V.paidTypes, { fmt: moneyC, tipFmt: money, unit: "paid" }), table: () => ({ head: ["Type", "Paid", "Payments"], num: [1, 2], rows: V.paidTypes.map((t) => [t.label, money(t.value), t.extra[0].value]) }) });
  chart("leadSources", { fluid: true, draw: (el) => drawHBars(el, V.leadSources, { unit: "leads" }), table: () => ({ head: ["Source", "Leads", "Became paid"], num: [1, 2], rows: V.leadSources.map((x) => [x.label, num(x.value), x.extra[0].value]) }) });
  chart("leadStages", { fluid: true, draw: (el) => drawHBars(el, V.leadStages, { unit: "leads" }), table: () => ({ head: ["Stage", "Leads"], num: [1], rows: V.leadStages.map((x) => [x.label, num(x.value)]) }) });
  chart("measWeeks", {
    draw: (el) => drawColumns(el, { labels: V.weekLabels, series: [{ name: "Pre-measurements taken", key: "in", values: V.measSeries }], selected: one(11), fmt: num, fmtTick: num, integer: true, label: "Pre-measurements taken per week" }),
    table: () => ({ head: ["Week", "Taken"], num: [1], rows: V.weekLabels.map((w, i) => [w.long, num(V.measSeries[i])]) }),
  });
  chart("measProducts", { fluid: true, draw: (el) => drawHBars(el, V.measProducts, { unit: "measurements" }), table: () => ({ head: ["Product", "Taken"], num: [1], rows: V.measProducts.map((x) => [x.label, num(x.value)]) }) });
  chart("socialInq", { fluid: true, draw: (el) => drawHBars(el, V.socialInq, { unit: "inquiries" }), table: () => ({ head: ["Platform", "Inquiries"], num: [1], rows: V.socialInq.map((x) => [x.label, num(x.value)]) }) });
  chart("socialViews", { fluid: true, draw: (el) => drawHBars(el, V.socialViews, { fmt: (n) => (n >= 10000 ? new Intl.NumberFormat(LOC, { notation: "compact", maximumFractionDigits: 1 }).format(n) : num(n)), tipFmt: num, unit: "views" }), table: () => ({ head: ["Platform", "Views"], num: [1], rows: V.socialViews.map((x) => [x.label, num(x.value)]) }) });
  chart("leadWeeks", {
    draw: (el) => drawColumns(el, { labels: V.weekLabels, series: [{ name: "Leads", key: "in", values: V.leadSeries }], selected: one(11), fmt: num, fmtTick: num, integer: true, label: "New leads per week",
      extraRows: (i) => [{ sep: true, value: num(V.convSeries[i]), label: "became paid customers" }] }),
    table: () => ({ head: ["Week", "Leads", "Paid customers"], num: [1, 2], rows: V.weekLabels.map((w, i) => [w.long, num(V.leadSeries[i]), num(V.convSeries[i])]) }),
  });
  chart("convertWeeks", {
    draw: (el) => drawColumns(el, { labels: V.weekLabels, series: [{ name: "New paid customers", key: "in", values: V.convSeries }], selected: one(11), fmt: num, fmtTick: num, integer: true, label: "New paid customers per week",
      extraRows: (i) => [{ sep: true, value: V.leadSeries[i] ? pct(V.convSeries[i] / V.leadSeries[i]) : "—", label: "of that week's leads" }] }),
    table: () => ({ head: ["Week", "Paid customers", "Leads", "Share"], num: [1, 2, 3], rows: V.weekLabels.map((w, i) => [w.long, num(V.convSeries[i]), num(V.leadSeries[i]), V.leadSeries[i] ? pct(V.convSeries[i] / V.leadSeries[i]) : "—"]) }),
  });

  /* ---------- date control ---------- */
  const dateInput = $("#report-date");
  function setDate(iso) {
    state.date = isISO(iso) ? iso : todayISO();
    render();
  }

  function render() {
    buildFormats();
    V = buildView();
    dateInput.value = state.date;
    $("#day-today").disabled = state.date === todayISO();
    $("#filter-note").replaceChildren(h("strong", {}, flong(state.date)), ` · week ${fday(V.ws)} – ${fday(V.we)}`);
    $("#as-of").textContent = fdate(state.date);
    try {
      const url = new URL(location.href);
      if (state.date === todayISO()) url.searchParams.delete("date"); else url.searchParams.set("date", state.date);
      history.replaceState(null, "", url);
    } catch (e) { /* file:// or sandboxed */ }
    renderGlance();
    renderPaid();
    renderLeads();
    renderMeasure();
    renderExpected(V.adv, "#advance-stats", TABLES.advance, "advance");
    renderExpected(V.fin, "#final-stats", TABLES.final, "final");
    renderProblems();
    renderSocial();
    renderWeekly();
    renderConverted();
    Object.keys(CHARTS).forEach(drawChart);
  }

  function applyCompanyText() {
    document.title = `Daily Commercial Report · ${C.name || "Company"}`;
    $("#company-name").textContent = C.name || "Company";
    $("#foot-company").textContent = C.name || "Company";
    $("#eyebrow").textContent = C.name || "Daily commercial report";
    $("#prepared-by").textContent = C.preparedBy || "—";
    $("#lede").textContent = `${C.tagline || "Daily commercial report"}: money paid today, leads, pre-measurements, expected advance and final payments, problems, social media and new paid customers.`;
    $("#foot-period").textContent = `amounts in ${CUR}`;
    $("#foot-note").textContent = CONNECTED ? "Every number is calculated from the Data sheet. Records are saved online and shown only to the people with access." : D.sample
      ? "Showing example data. Clear it with Start empty in the Data sheet."
      : "Every number is calculated from the Data sheet. Records are saved on the device they were entered on.";
  }

  function renderBanner() {
    const el = $("#data-banner");
    const openSheet = h("button", { class: "btn btn-sm", type: "button" }, icon("sheet"), "Open Data sheet");
    openSheet.addEventListener("click", () => setView("sheet"));
    const empty = DATASETS.every((k) => !D[k].length);
    let msg = null;
    if (CONNECTED && !empty) { el.hidden = true; return; }
    if (CONNECTED) msg = [h("strong", {}, "No records yet. "), canWrite() ? "Open the Data sheet to add records. Everything you type saves online for the people with access." : "Nothing has been entered yet."];
    else if (empty) msg = [h("strong", {}, "No records yet. "), "Open the Data sheet to add payments, leads, pre-measurements, expected payments, problems and social media. Or tap Try example data to see how the report looks."];
    else if (D.sample) msg = [h("strong", {}, "Example data. "), "These records are made up so you can see the report. Clear them with Start empty in the Data sheet."];
    else if (LOCAL) msg = [h("strong", {}, "Saved on this device. "), "Back up regularly with Export Excel in the Data sheet."];
    el.className = "notice report-only";
    el.hidden = !msg;
    if (msg) el.replaceChildren(icon("info"), h("div", { class: "grow" }, msg), h("div", { class: "acts" }, openSheet));
  }

  function rebuildAll() {
    buildFormats();
    applyCompanyText();
    buildTables();
    render();
    renderBanner();
    dirty = false;
  }

  /* ==========================================================================
     DATA SHEET — spreadsheet-style editor
     ========================================================================== */
  const col = (key, label, type = "text", w = 130, extra = {}) => ({ key, label, type, w, ...extra });
  const expSheet = (id, label, prefix, aliases) => ({ id, label, prefix, aliases, cols: [
    col("id", "ID", "text", 84), col("customer", "Customer", "text", 180, { suggest: true }), col("project", "Project / order", "text", 200, { suggest: true }),
    col("amount", "Amount", "number", 130), col("expectedDate", "Expected date", "date", 150),
    col("status", "Status", "select", 130, { options: EXP_STATUS }), col("note", "Note", "text", 220),
  ] });
  const SHEETS = [
    { id: "payments", label: "Payments received", prefix: "PAY-", aliases: ["payments", "paid", "todaypaid"], cols: [
      col("id", "ID", "text", 96), col("date", "Date", "date", 140), col("customer", "Customer", "text", 180, { suggest: true }),
      col("project", "Project / order", "text", 190, { suggest: true }), col("type", "Type", "select", 110, { options: PAY_TYPES }),
      col("amount", "Amount", "number", 130), col("method", "Method", "select", 140, { options: METHODS }), col("note", "Note", "text", 200),
    ] },
    { id: "leads", label: "Leads", prefix: "LD-", cols: [
      col("id", "ID", "text", 90), col("date", "Date", "date", 140), col("customer", "Customer", "text", 170, { suggest: true }),
      col("phone", "Phone", "text", 130), col("source", "Source", "select", 130, { options: SOURCES }),
      col("product", "Product", "select", 120, { options: PRODUCTS }), col("stage", "Stage", "select", 140, { options: LEAD_STAGES }),
      col("paidDate", "Paid date", "date", 140), col("rep", "Sales rep", "text", 120, { suggest: true }), col("note", "Note", "text", 200),
    ], onChange: (r, key) => {
      if (key === "stage" && r.stage === "Paid customer" && !isISO(r.paidDate)) { r.paidDate = todayISO(); return ["paidDate"]; }
      return [];
    } },
    { id: "measurements", label: "Pre-measurement", prefix: "MS-", aliases: ["premeasurement", "premeasurements", "measurement", "measurements", "sitemeasurement"], cols: [
      col("id", "ID", "text", 90), col("date", "Date", "date", 140), col("customer", "Customer", "text", 170, { suggest: true }),
      col("phone", "Phone", "text", 130), col("location", "Location / site", "text", 170, { suggest: true }),
      col("product", "Product", "select", 120, { options: PRODUCTS }), col("measuredBy", "Measured by", "text", 130, { suggest: true }),
      col("status", "Status", "select", 120, { options: MEAS_STATUS }), col("note", "Note", "text", 220),
    ] },
    expSheet("expAdvance", "Expected advance", "EA-", ["expectedadvance", "advance", "expectadvance"]),
    expSheet("expFinal", "Expected final", "EF-", ["expectedfinal", "final", "expectfinal"]),
    { id: "problems", label: "Problems", prefix: "PR-", aliases: ["problem"], cols: [
      col("id", "ID", "text", 84), col("date", "Date", "date", 140), col("customer", "Customer / project", "text", 180, { suggest: true }),
      col("problem", "Problem", "text", 260), col("owner", "Responsible", "text", 130, { suggest: true }),
      col("status", "Status", "select", 120, { options: PROB_STATUS }), col("solvedDate", "Solved date", "date", 140), col("action", "Action / notes", "text", 220),
    ], onChange: (r, key) => {
      if (key === "status" && r.status === "Solved" && !isISO(r.solvedDate)) { r.solvedDate = todayISO(); return ["solvedDate"]; }
      return [];
    } },
    { id: "social", label: "Social media", prefix: "SM-", aliases: ["socialmedia"], cols: [
      col("id", "ID", "text", 84), col("week", "Week (any date in it)", "date", 170), col("platform", "Platform", "select", 120, { options: SOCIAL }),
      col("posts", "Posts", "number", 90), col("followers", "New followers", "number", 120), col("views", "Views", "number", 110), col("inquiries", "Inquiries", "number", 100),
    ] },
  ];
  const SETTINGS = [
    { key: "name", label: "Company name" },
    { key: "tagline", label: "Report subtitle" },
    { key: "currency", label: "Currency code", hint: "ISO code, e.g. ETB, USD" },
    { key: "preparedBy", label: "Prepared by" },
  ];

  const sheetUI = { active: "payments", q: "" };
  const normKey = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  function parseNumber(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  function parseDateValue(v, X) {
    if (v == null || v === "") return "";
    if (typeof v === "number" && X) {
      const d = X.SSF.parse_date_code(v);
      if (d) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
    }
    if (v instanceof Date && !isNaN(v)) return toISO(v);
    const t = String(v).trim();
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (m) {
      const a = +m[1], b = +m[2];
      const [day, mon] = b > 12 ? [b, a] : [a, b]; // day-first unless impossible
      return `${m[3]}-${pad2(mon)}-${pad2(day)}`;
    }
    const d = new Date(t);
    return isNaN(d) ? t : toISO(d);
  }
  function coerce(c, v, X) {
    if (c.type === "number") return parseNumber(v);
    if (c.type === "date") return parseDateValue(v, X);
    let t = String(v ?? "").trim();
    if (c.type === "select") {
      const hit = c.options.find((o) => normKey(o) === normKey(t));
      if (hit) t = hit;
    }
    return t;
  }
  function nextId(def) {
    if (CONNECTED) return `${def.prefix}${todayISO().slice(2).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    let max = 0, width = 3;
    for (const r of D[def.id]) {
      const m = String(r.id || "").match(/(\d+)\s*$/);
      if (m) { max = Math.max(max, +m[1]); width = Math.max(width, m[1].length); }
    }
    return `${def.prefix}${String(max + 1).padStart(width, "0")}`;
  }
  function blankRow(def) {
    const r = {};
    for (const c of def.cols) r[c.key] = c.type === "number" ? 0 : c.type === "date" ? "" : c.type === "select" ? c.options[0] : "";
    const firstDate = def.cols.find((c) => c.type === "date");
    if (firstDate) r[firstDate.key] = todayISO();
    r.id = nextId(def);
    return r;
  }

  function renderSheetTabs() {
    const tabs = $("#sheet-tabs");
    const all = [...SHEETS.map((d) => ({ id: d.id, label: d.label, count: D[d.id].length })), { id: "settings", label: "Settings" },
      ...(CONNECTED && ROLE === "owner" ? [{ id: "team", label: "Team & access" }] : [])];
    tabs.replaceChildren(...all.map((t) => {
      const b = h("button", { type: "button", role: "tab", "aria-selected": String(t.id === sheetUI.active), "aria-pressed": String(t.id === sheetUI.active) },
        t.label, t.count != null ? h("span", { class: "cnt" }, num(t.count)) : null);
      b.addEventListener("click", () => { sheetUI.active = t.id; sheetUI.q = ""; renderSheetTabs(); renderSheet(); });
      return b;
    }));
  }

  function renderSheetNotice() {
    if (CONNECTED) {
      $("#sheet-notice").replaceChildren(icon("info"), h("div", { class: "grow" }, h("strong", {}, "Connected. "),
        canWrite() ? ["Changes save online automatically and appear for everyone with access. Back up with ", h("strong", {}, "Export Excel"), "."]
          : "You can see the records but not change them. Ask the owner if you need to enter data."));
      return;
    }
    $("#sheet-notice").replaceChildren(icon("info"),
      h("div", { class: "grow" },
        h("strong", {}, "Saved automatically on this device. "),
        "Back up with ", h("strong", {}, "Export Excel"), ". To show the same data on another device, use ", h("strong", {}, "Download data.js"),
        " and upload it into the commercial folder of your GitHub repository (open the folder, then Add file → Upload files)."));
  }

  function renderSheet() {
    renderSheetNotice();
    const host = $("#sheet-body");
    if (sheetUI.active === "settings") { renderSettings(host); return; }
    if (sheetUI.active === "team") { renderTeam(host); return; }
    const def = SHEETS.find((d) => d.id === sheetUI.active);
    const rows = D[def.id];
    const ro = !canWrite();

    const search = h("input", { class: "input", type: "search", placeholder: `Search ${def.label.toLowerCase()}`, "aria-label": `Search ${def.label}`, value: sheetUI.q });
    const count = h("span", { class: "count" });
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus"), "Add row");
    const gridWrap = h("div", { class: "sheet-scroll" });
    const datalists = h("div", { hidden: true });
    for (const c of def.cols.filter((x) => x.suggest)) {
      datalists.append(h("datalist", { id: `dl-${def.id}-${c.key}` }, uniq(rows, c.key).map((v) => h("option", { value: v }))));
    }

    const drawGrid = () => {
      const q = sheetUI.q.toLowerCase();
      const visible = rows.map((r, i) => [r, i]).filter(([r]) => !q || def.cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)));
      count.textContent = q ? `${num(visible.length)} of ${num(rows.length)} rows` : `${num(rows.length)} ${rows.length === 1 ? "row" : "rows"}`;
      if (!rows.length) {
        gridWrap.replaceChildren(h("div", { class: "sheet-empty" }, h("strong", {}, `No ${def.label.toLowerCase()} yet. `), "Tap Add row, or import an Excel/CSV file."));
        return;
      }
      const thead = h("thead", {}, h("tr", {},
        h("th", { class: "rn", scope: "col" }, "#"),
        def.cols.map((c) => h("th", { class: c.type === "number" ? "num" : null, scope: "col", style: `min-width:${c.w}px` }, c.label)),
        h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Delete"))));
      gridWrap.replaceChildren(h("table", { class: "sheet-grid" }, thead, h("tbody", {}, visible.map(([r, i]) => sheetRow(def, r, i, ro)))));
    };

    search.addEventListener("input", () => { sheetUI.q = search.value.trim(); drawGrid(); });
    add.addEventListener("click", () => {
      rows.push(blankRow(def));
      saveData();
      sheetUI.q = ""; search.value = "";
      drawGrid(); renderSheetTabs();
      gridWrap.scrollTop = gridWrap.scrollHeight;
      const last = $$("tbody tr", gridWrap).pop();
      const target = last && ($$(".cell", last).find((c) => c.dataset.key !== "id" && c.type !== "date") || $$(".cell", last)[1]);
      if (target) target.focus();
    });

    host.replaceChildren(
      h("div", { class: "sheet-head" }, h("h3", {}, def.label), ro ? badge("Read-only") : null, count, h("span", { class: "dt-spacer" }),
        h("div", { class: "dt-search" }, icon("search"), search), ro ? null : add),
      gridWrap,
      h("div", { class: "sheet-foot" }, "Tip: press Enter to move down a column. Numbers without commas; dates as day / month / year."),
      datalists);
    drawGrid();
  }

  function sheetRow(def, r, index, ro = false) {
    const tr = h("tr", {});
    tr.append(h("td", { class: "rn" }, String(index + 1)));
    def.cols.forEach((c, ci) => {
      let input;
      const label = `${c.label}, row ${index + 1}`;
      if (c.type === "select") {
        const opts = [...c.options];
        if (r[c.key] && !opts.includes(r[c.key])) opts.push(r[c.key]);
        input = h("select", { class: "cell", "aria-label": label }, opts.map((o) => h("option", { value: o }, o)));
        input.value = r[c.key] || c.options[0];
      } else if (c.type === "date") {
        input = h("input", { class: "cell", type: "date", "aria-label": label, value: r[c.key] || "" });
      } else if (c.type === "number") {
        input = h("input", { class: "cell num", type: "text", inputmode: "decimal", "aria-label": label, value: r[c.key] === "" || r[c.key] == null ? "" : String(r[c.key]) });
      } else {
        input = h("input", { class: "cell", type: "text", "aria-label": label, value: r[c.key] ?? "", list: c.suggest ? `dl-${def.id}-${c.key}` : null });
      }
      input.dataset.col = String(ci);
      input.dataset.key = c.key;
      if (ro) input.disabled = true;
      input.addEventListener("change", () => {
        const v = coerce(c, input.value);
        r[c.key] = v;
        if (c.type === "number") input.value = String(v);
        input.classList.toggle("bad", c.type === "date" && v !== "" && !isISO(v));
        if (def.onChange) for (const k of def.onChange(r, c.key)) { const other = $(`.cell[data-key="${k}"]`, tr); if (other) other.value = r[k]; }
        saveData();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.isComposing) return;
        e.preventDefault();
        input.dispatchEvent(new Event("change"));
        const next = e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling;
        const target = next && $(`.cell[data-col="${ci}"]`, next);
        if (target) target.focus();
      });
      tr.append(h("td", {}, input));
    });
    const del = h("button", { class: "del-btn", type: "button", "aria-label": `Delete row ${index + 1}`, title: "Delete row" }, icon("trash"));
    del.addEventListener("click", () => {
      const arr = D[def.id];
      const at = arr.indexOf(r);
      if (at < 0) return;
      arr.splice(at, 1);
      saveData();
      renderSheet(); renderSheetTabs();
      toast(`Row deleted from ${def.label}.`, { label: "Undo", run: () => { arr.splice(at, 0, r); saveData(); renderSheet(); renderSheetTabs(); } });
    });
    tr.append(h("td", {}, ro ? null : del));
    return tr;
  }

  function renderSettings(host) {
    const form = h("div", { class: "settings-form" });
    for (const sd of SETTINGS) {
      const id = `set-${sd.key}`;
      const input = h("input", { class: "input", id, type: "text", value: D.company[sd.key] ?? "" });
      if (!canWrite()) input.disabled = true;
      input.addEventListener("change", () => {
        D.company[sd.key] = sd.key === "currency" ? input.value.trim().toUpperCase() : input.value.trim();
        saveData();
      });
      form.append(h("label", { class: "field", for: id }, h("span", {}, sd.label), input, sd.hint ? h("small", {}, sd.hint) : null));
    }
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, "Settings")), form);
  }

  /* ---------- Excel / CSV import & export ---------- */
  let xlsxPromise = null;
  function loadScript(src, err) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(err));
      document.head.append(el);
    });
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) {
      xlsxPromise = loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "Could not load the Excel tool. Check the internet connection and try again.")
        .then(() => window.XLSX).catch((e) => { xlsxPromise = null; throw e; });
    }
    return xlsxPromise;
  }
  const slug = (t) => String(t || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function exportExcel() {
    try {
      const X = await loadXLSX();
      const wb = X.utils.book_new();
      for (const def of SHEETS) {
        const ws = X.utils.aoa_to_sheet([def.cols.map((c) => c.label), ...D[def.id].map((r) => def.cols.map((c) => r[c.key] ?? ""))]);
        ws["!cols"] = def.cols.map((c) => ({ wch: Math.max(10, Math.round(c.w / 7)) }));
        X.utils.book_append_sheet(wb, ws, def.label.slice(0, 31));
      }
      const set = X.utils.aoa_to_sheet([["Setting", "Value"], ...SETTINGS.map((sd) => [sd.label, D.company[sd.key] ?? ""])]);
      set["!cols"] = [{ wch: 30 }, { wch: 50 }];
      X.utils.book_append_sheet(wb, set, "Settings");
      X.writeFile(wb, `${slug(D.company.name)}-report-data-${todayISO()}.xlsx`);
    } catch (e) { toast(e.message); }
  }

  function parseRows(X, ws, def) {
    const json = X.utils.sheet_to_json(ws, { defval: "", raw: true });
    const out = [];
    for (const obj of json) {
      const r = {};
      for (const [head, v] of Object.entries(obj)) {
        const k = normKey(head);
        const c = def.cols.find((cc) => normKey(cc.key) === k || normKey(cc.label) === k);
        if (c) r[c.key] = coerce(c, v, X);
      }
      if (!Object.values(r).some((v) => v !== "" && v !== 0)) continue;
      for (const c of def.cols) if (!(c.key in r)) r[c.key] = c.type === "number" ? 0 : c.type === "select" ? c.options[0] : "";
      out.push(r);
    }
    return out;
  }

  async function importFile(file) {
    try {
      const X = await loadXLSX();
      // raw for CSV: keep text as typed so dates are read day-first (not US month-first)
      const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: "array", raw: /\.csv$/i.test(file.name) });
      const plan = [];
      let settings = null;
      for (const name of wb.SheetNames) {
        const n = normKey(name);
        if (n === "settings") {
          settings = {};
          for (const [label, value] of X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: true })) {
            const sd = SETTINGS.find((x) => normKey(x.label) === normKey(label) || normKey(x.key) === normKey(label));
            if (sd) settings[sd.key] = String(value).trim();
          }
          continue;
        }
        const def = SHEETS.find((d) => normKey(d.id) === n || normKey(d.label) === n || (d.aliases || []).includes(n));
        if (def) plan.push({ def, rows: parseRows(X, wb.Sheets[name], def) });
      }
      if (!plan.length && !settings) {
        const def = SHEETS.find((d) => d.id === sheetUI.active);
        if (!def) { toast("Open the sheet you want to import into (for example Leads), then import again."); return; }
        plan.push({ def, rows: parseRows(X, wb.Sheets[wb.SheetNames[0]], def) });
      }
      const lines = plan.map((p) => `• ${p.def.label}: ${p.rows.length} rows`);
      if (settings) lines.push("• Settings");
      if (!confirm(`Import from "${file.name}"?\n\n${lines.join("\n")}\n\nThis replaces the current rows in these sheets.`)) return;
      for (const p of plan) {
        D[p.def.id] = p.rows;
        for (const r of p.rows) if (!r.id) r.id = nextId(p.def);
      }
      if (settings) Object.assign(D.company, settings, settings.currency ? { currency: settings.currency.toUpperCase() } : {});
      D.sample = false;
      saveData();
      if (plan.length === 1) sheetUI.active = plan[0].def.id;
      renderSheetTabs(); renderSheet();
      toast(`Imported ${plan.reduce((a, p) => a + p.rows.length, 0)} rows.`);
    } catch (e) {
      toast(e.message || "Could not read that file.");
    }
  }

  function dataJsText() {
    const rows = (arr) => arr.map((r) => "    " + JSON.stringify(r)).join(",\n");
    const company = JSON.stringify(D.company, null, 2).replace(/\n/g, "\n  ");
    return `/*
 * DAILY COMMERCIAL REPORT — DATA FILE
 * Exported from the Data sheet on ${todayISO()}.
 * Upload this file into the commercial/ folder of the GitHub repository (replacing data.js) to publish it.
 */
window.REPORT_DATA = {
  sample: ${D.sample ? "true" : "false"},
  company: ${company},
${DATASETS.map((k) => `\n  ${k}: [\n${rows(D[k])}${D[k].length ? "," : ""}\n  ],`).join("\n")}
};
`;
  }

  /* ---------- example data (made up, dated around today) ---------- */
  function exampleData() {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const weighted = (pairs) => { let r = rnd() * pairs.reduce((a, p) => a + p[1], 0); for (const [v, w] of pairs) if ((r -= w) <= 0) return v; return pairs[0][0]; };
    const round = (n, st) => Math.round(n / st) * st;
    const T = todayISO();
    const people = ["Dawit A.", "Hanna T.", "Yared M.", "Selamawit G.", "Bereket H.", "Mahlet K.", "Abel S.", "Rahel W.", "Kidus B.", "Tsion D.",
      "Henok F.", "Meklit Y.", "Nahom L.", "Bethlehem Z.", "Robel N.", "Eden A.", "Samrawit E.", "Fitsum G.", "Liya M.", "Mikias T."];
    const reps = ["Sara M.", "Daniel K.", "Liya A.", "Samuel B."];
    const price = { Kitchen: [180000, 950000], Wardrobe: [60000, 320000], Vanity: [25000, 95000], "TV unit": [35000, 140000], Door: [20000, 90000], Office: [80000, 400000], Other: [10000, 60000] };
    const phone = () => `09${Math.floor(10000000 + rnd() * 89999999)}`;
    const d = { sample: true, company: { ...D.company }, leads: [], payments: [], expAdvance: [], expFinal: [], problems: [], social: [], measurements: [] };
    const start = addDays(weekStart(T), -77);
    let n = 0;
    for (let day = start; day <= T; day = addDays(day, 1)) {
      const dow = parseD(day).getDay();
      const count = dow === 0 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 5);
      for (let i = 0; i < count; i++) {
        const age = daysBetween(day, T);
        const product = weighted([["Kitchen", 40], ["Wardrobe", 25], ["Vanity", 10], ["TV unit", 10], ["Door", 5], ["Office", 5], ["Other", 5]]);
        const [lo, hi] = price[product];
        const value = round(lo + rnd() * (hi - lo), 5000);
        let stage = age > 21 ? weighted([["Paid customer", 24], ["Lost", 34], ["Quotation", 14], ["Site visit", 12], ["Contacted", 16]])
          : age > 6 ? weighted([["Paid customer", 12], ["Lost", 10], ["Quotation", 30], ["Site visit", 24], ["Contacted", 24]])
          : weighted([["New", 40], ["Contacted", 30], ["Site visit", 18], ["Quotation", 10], ["Paid customer", 2]]);
        let paidDate = "";
        if (stage === "Paid customer") { paidDate = addDays(day, Math.min(age, 2 + Math.floor(rnd() * 14))); if (paidDate > T) paidDate = T; }
        const lead = { id: `LD-${String(++n).padStart(4, "0")}`, date: day, customer: pick(people), phone: phone(),
          source: weighted([["Facebook", 22], ["TikTok", 20], ["Instagram", 10], ["Telegram", 8], ["Walk-in", 16], ["Referral", 16], ["Phone call", 8]]),
          product, stage, paidDate, rep: pick(reps), note: "", _value: value };
        d.leads.push(lead);
      }
    }
    // paid customers -> advance payments and expected finals
    let pay = 0, ef = 0;
    for (const l of d.leads.filter((x) => x.stage === "Paid customer")) {
      const adv = round(l._value * weighted([[0.5, 3], [0.6, 2], [0.4, 1]]), 1000);
      d.payments.push({ id: `PAY-${String(++pay).padStart(4, "0")}`, date: l.paidDate, customer: l.customer, project: `${l.product} – ${l.customer}`, type: "Advance", amount: adv, method: weighted([["Bank transfer", 55], ["Telebirr", 25], ["Cash", 12], ["Cheque", 8]]), note: "" });
      const install = addDays(l.paidDate, 18 + Math.floor(rnd() * 20));
      const finalAmt = l._value - adv;
      if (install <= addDays(T, -3) && rnd() < 0.88) {
        d.payments.push({ id: `PAY-${String(++pay).padStart(4, "0")}`, date: addDays(install, Math.floor(rnd() * 3)) > T ? T : addDays(install, Math.floor(rnd() * 3)), customer: l.customer, project: `${l.product} – ${l.customer}`, type: "Final", amount: finalAmt, method: "Bank transfer", note: "" });
      } else {
        d.expFinal.push({ id: `EF-${String(++ef).padStart(3, "0")}`, customer: l.customer, project: `${l.product} – ${l.customer}`, amount: finalAmt, expectedDate: install, status: install < T && rnd() < 0.4 ? "Delayed" : "Expected", note: install < T ? "Waiting for installation sign-off" : "" });
      }
    }
    // extra payments today so "today paid" has content
    const todays = d.leads.filter((x) => x.stage === "Quotation").slice(-3);
    todays.forEach((l, i) => {
      if (i === 2) return;
      d.payments.push({ id: `PAY-${String(++pay).padStart(4, "0")}`, date: T, customer: l.customer, project: `${l.product} – ${l.customer}`, type: i ? "Other" : "Advance", amount: round(l._value * (i ? 0.1 : 0.5), 1000), method: i ? "Cash" : "Telebirr", note: i ? "Design fee" : "" });
    });
    // pre-measurements for leads that reached a site visit
    const areas = ["Bole", "CMC", "Ayat", "Summit", "Sarbet", "Old Airport", "Gerji", "Lebu", "Kazanchis", "Megenagna"];
    const measurers = ["Yonas T.", "Kaleb M."];
    for (const l of d.leads) {
      const age = daysBetween(l.date, T);
      const reached = ["Site visit", "Quotation", "Paid customer"].includes(l.stage) || (l.stage === "Lost" && rnd() < 0.4);
      const recent = age < 10 && (l.stage === "New" || l.stage === "Contacted") && rnd() < 0.7;
      if (!reached && !recent) continue;
      const date = addDays(l.date, 1 + Math.floor(rnd() * 5));
      let status = date <= T ? "Taken" : "Scheduled";
      if (recent && date <= T && rnd() < 0.3) status = "Scheduled"; // booked but not done yet
      d.measurements.push({ id: "", date, customer: l.customer, phone: l.phone, location: pick(areas), product: l.product, measuredBy: pick(measurers), status, note: status === "Scheduled" && date < T ? "Customer not home, call again" : "" });
    }
    d.measurements.sort((a, b) => a.date.localeCompare(b.date));
    d.measurements.forEach((m, i) => (m.id = `MS-${String(i + 1).padStart(4, "0")}`));

    // expected advances from quotations
    let ea = 0;
    for (const l of d.leads.filter((x) => x.stage === "Quotation").slice(-14)) {
      const exp = addDays(T, -6 + Math.floor(rnd() * 20));
      d.expAdvance.push({ id: `EA-${String(++ea).padStart(3, "0")}`, customer: l.customer, project: `${l.product} – ${l.customer}`, amount: round(l._value * 0.5, 1000), expectedDate: exp, status: exp < T && rnd() < 0.3 ? "Delayed" : "Expected", note: exp < T ? "Customer asked for one more week" : "" });
    }
    // problems
    const probs = [
      ["Door colour does not match sample", "Production", "Re-spray two doors"], ["Delivery truck late", "Logistics", "Book second truck"],
      ["Missing handles on 3 drawers", "Store", "Order from supplier"], ["Customer wants design change after cutting", "Sales", "Agree extra cost"],
      ["Wall not straight at site", "Installation", "Add filler panel"], ["Edge banding peeling", "Production", "Re-band and check glue"],
      ["Payment promised but not received", "Sales", "Call customer daily"], ["CNC machine stopped", "Workshop", "Technician coming"],
      ["Countertop cracked in transport", "Logistics", "Replace countertop"], ["Hinges too tight", "Installation", "Adjust on site"],
    ];
    probs.forEach(([p, owner, action], i) => {
      const date = addDays(T, -Math.floor(rnd() * 24) - (i < 3 ? 0 : 1));
      const status = i < 3 ? "Open" : i < 6 ? "In progress" : "Solved";
      const client = d.leads.filter((x) => x.stage === "Paid customer")[i] || d.leads[i];
      d.problems.push({ id: `PR-${String(i + 1).padStart(3, "0")}`, date: i === 0 ? T : date, customer: client ? client.customer : "", problem: p, owner, status, solvedDate: status === "Solved" ? addDays(date, 1 + Math.floor(rnd() * 4)) > T ? T : addDays(date, 1 + Math.floor(rnd() * 4)) : "", action });
    });
    // social media per week
    let sm = 0;
    for (let w = start; w <= T; w = addDays(w, 7)) {
      for (const [platform, base] of [["Facebook", 1], ["TikTok", 1.6], ["Instagram", 0.6], ["Telegram", 0.4]]) {
        d.social.push({ id: `SM-${String(++sm).padStart(3, "0")}`, week: w, platform, posts: Math.round((2 + rnd() * 6) * (platform === "TikTok" ? 1.4 : 1)),
          followers: Math.round((40 + rnd() * 160) * base), views: Math.round((3000 + rnd() * 16000) * base), inquiries: Math.round((4 + rnd() * 14) * base) });
      }
    }
    d.leads.forEach((l) => delete l._value);
    return d;
  }

  /* ==========================================================================
     PDF export — jsPDF + AutoTable, loaded only when a PDF is requested.
     Amharic (Ethiopic) text is drawn with Abyssinica SIL (fonts/).
     ========================================================================== */
  const PDF_LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  ];
  const ETH_RE = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;
  const PC = {
    ink: [11, 11, 11], ink2: [82, 81, 78], muted: [137, 135, 129], grid: [225, 224, 217], rule: [195, 194, 183],
    band: [244, 243, 239], in: [42, 120, 214], inSoft: [205, 226, 251], good: [0, 99, 0], bad: [179, 38, 30],
  };
  let pdfLibPromise = null, ethFontB64 = null;
  function loadPdfLib() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
    if (!pdfLibPromise) {
      const err = "Could not load the PDF tool. Check the internet connection and try again.";
      pdfLibPromise = PDF_LIBS.reduce((p, src) => p.then(() => loadScript(src, err)), Promise.resolve())
        .then(() => window.jspdf.jsPDF)
        .catch((e) => { pdfLibPromise = null; throw e; });
    }
    return pdfLibPromise;
  }
  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const pdfClean = (v) => String(v ?? "").replace(/[  ]/g, " ").replace(/−/g, "-").replace(/→/g, "->").replace(/÷/g, "/");

  async function newPdf() {
    const jsPDF = await loadPdfLib();
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    let eth = false;
    if (ETH_RE.test(JSON.stringify(D))) {
      if (!ethFontB64) {
        const res = await fetch("fonts/AbyssinicaSIL-Regular.ttf");
        if (!res.ok) throw new Error("Could not load the Amharic font for the PDF.");
        ethFontB64 = toBase64(await res.arrayBuffer());
      }
      doc.addFileToVFS("AbyssinicaSIL-Regular.ttf", ethFontB64);
      doc.addFont("AbyssinicaSIL-Regular.ttf", "Abyssinica", "normal");
      eth = true;
    }
    return pdfKit(doc, eth);
  }

  function pdfKit(doc, eth) {
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
    const k = { doc, W, H, M, y: M };
    k.font = (style, sample) => {
      if (eth && ETH_RE.test(sample)) doc.setFont("Abyssinica", "normal");
      else doc.setFont("helvetica", style || "normal");
    };
    k.text = (str, x, y, { size = 9, style = "normal", color = PC.ink, align = "left", maxWidth } = {}) => {
      const t = pdfClean(str);
      k.font(style, t); doc.setFontSize(size); doc.setTextColor(...color);
      doc.text(t, x, y, { align, maxWidth });
    };
    k.width = (str, size, style) => { const t = pdfClean(str); k.font(style, t); doc.setFontSize(size); return doc.getTextWidth(t); };
    k.ensure = (need) => { if (H - 52 - k.y < need) { doc.addPage(); k.y = M; } };
    k.heading = (numStr, title, sub, need = 150) => {
      k.ensure(need);
      if (k.y > M) k.y += 8;
      doc.setDrawColor(...PC.grid); doc.setFillColor(...PC.band); doc.setLineWidth(0.5);
      doc.roundedRect(M, k.y - 11, 22, 15, 3, 3, "FD");
      k.text(numStr, M + 11, k.y, { size: 7.5, style: "bold", color: PC.ink2, align: "center" });
      k.text(title, M + 30, k.y + 1, { size: 14, style: "bold" });
      if (sub) k.text(sub, W - M, k.y, { size: 8, color: PC.ink2, align: "right" });
      k.y += 16;
    };
    k.line = (str) => { k.text(str, M, k.y, { size: 8.5, color: PC.ink2 }); k.y += 14; };
    k.none = (text) => { k.text(text || "Nothing recorded.", M, k.y + 4, { size: 8.5, color: PC.muted }); k.y += 20; };
    k.table = (opts) => {
      const { head, body, align = [], foot, widths = [], fontSize = 8, bold, fill, empty } = opts;
      if (!body.length) { k.none(empty); return k.y; }
      const columnStyles = {};
      head.forEach((_, i) => {
        columnStyles[i] = { halign: align[i] === "r" ? "right" : "left" };
        if (widths[i]) columnStyles[i].cellWidth = widths[i];
      });
      doc.autoTable({
        head: [head.map(pdfClean)], body: body.map((r) => r.map(pdfClean)), foot: foot ? [foot.map(pdfClean)] : undefined,
        startY: opts.startY ?? k.y, margin: opts.margin || { left: M, right: M, top: M, bottom: 52 }, theme: "plain",
        styles: { font: "helvetica", fontSize, textColor: PC.ink, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, lineColor: PC.grid, lineWidth: { bottom: 0.5 }, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: PC.band, textColor: PC.ink2, fontStyle: "bold", fontSize: fontSize - 0.5 },
        footStyles: { fillColor: PC.band, textColor: PC.ink, fontStyle: "bold", lineWidth: { top: 0.75, bottom: 0 }, lineColor: PC.rule },
        columnStyles, showHead: "everyPage", showFoot: "lastPage", rowPageBreak: "avoid",
        didParseCell: (data) => {
          if (align[data.column.index] === "r") data.cell.styles.halign = "right";
          if (bold && data.section === "body" && bold(data.row.index)) data.cell.styles.fontStyle = "bold";
          if (fill && data.section === "body" && fill(data.row.index)) data.cell.styles.fillColor = PC.band;
          if (opts.color && data.section === "body") { const c = opts.color(data.row.index, data.column.index); if (c) data.cell.styles.textColor = c; }
          if (eth && ETH_RE.test(data.cell.text.join(" "))) { data.cell.styles.font = "Abyssinica"; data.cell.styles.fontStyle = "normal"; }
        },
      });
      const end = doc.lastAutoTable.finalY;
      if (opts.startY == null) k.y = end + 18;
      return end;
    };
    k.kpis = (items, cols = 4) => {
      const gap = 8, w = (W - 2 * M - gap * (cols - 1)) / cols, hgt = 50;
      k.ensure(Math.ceil(items.length / cols) * (hgt + gap) + 10);
      items.forEach((it, i) => {
        const x = M + (i % cols) * (w + gap), y = k.y + Math.floor(i / cols) * (hgt + gap);
        doc.setFillColor(...PC.band); doc.setDrawColor(...PC.grid); doc.setLineWidth(0.5);
        doc.roundedRect(x, y, w, hgt, 6, 6, "FD");
        k.text(it.label, x + 10, y + 14, { size: 7.5, color: PC.ink2 });
        k.text(it.value, x + 10, y + 31, { size: 13, style: "bold", maxWidth: w - 16 });
        if (it.note) k.text(it.note, x + 10, y + 43, { size: 7, color: it.color || PC.muted, maxWidth: w - 16 });
      });
      k.y += Math.ceil(items.length / cols) * (hgt + gap) + 10;
    };
    k.chart = ({ labels, values, selected, fmtTick, height = 110, title }) => {
      if (values.every((x) => !x)) return;
      k.ensure(height + 50);
      if (title) { k.text(title, M, k.y, { size: 9.5, style: "bold" }); k.y += 12; }
      const { top, ticks } = niceScale(Math.max(0, ...values), 4, !fmtTick);
      const fmtT = fmtTick || ((t) => num(t));
      const labW = Math.max(...ticks.map((t) => k.width(fmtT(t), 7))) + 8;
      const x0 = M + labW, x1 = W - M, y0 = k.y, y1 = k.y + height;
      const yv = (v) => y1 - (v / top) * (y1 - y0);
      for (const t of ticks) {
        doc.setDrawColor(...(t === 0 ? PC.rule : PC.grid)); doc.setLineWidth(0.5);
        doc.line(x0, yv(t), x1, yv(t));
        k.text(fmtT(t), x0 - 6, yv(t) + 2.5, { size: 7, color: PC.muted, align: "right" });
      }
      const step = (x1 - x0) / labels.length, colW = Math.min(16, step * 0.6);
      labels.forEach((lb, i) => {
        const cx = x0 + step * (i + 0.5), v = values[i];
        if (v > 0) {
          const by = yv(v), bh = y1 - by, r = Math.min(2, colW / 2, bh / 2);
          doc.setFillColor(...(selected.has(i) ? PC.in : PC.inSoft));
          doc.roundedRect(cx - colW / 2, by, colW, bh, r, r, "F");
          if (bh > r) doc.rect(cx - colW / 2, y1 - r, colW, r, "F");
          if (selected.has(i)) k.text(fmtT(v), cx, by - 4, { size: 7, style: "bold", color: PC.ink2, align: "center" });
        }
        k.text(lb.short, cx, y1 + 10, { size: 6.5, color: selected.has(i) ? PC.ink : PC.muted, style: selected.has(i) ? "bold" : "normal", align: "center" });
      });
      k.y = y1 + 26;
    };
    k.header = (title, right1, right2) => {
      const x = M, y = k.y;
      doc.setFillColor(...PC.ink); doc.roundedRect(x, y, 30, 30, 7, 7, "F");
      doc.setFillColor(255, 255, 255); doc.rect(x + 8, y + 15, 3.5, 7, "F"); doc.rect(x + 13.5, y + 11, 3.5, 11, "F");
      doc.setFillColor(...PC.in); doc.rect(x + 19, y + 7, 3.5, 15, "F");
      k.text(C.name || "Company", x + 40, y + 11, { size: 9.5, style: "bold", color: PC.ink2 });
      k.text(title, x + 40, y + 29, { size: 19, style: "bold" });
      k.text(right1, W - M, y + 11, { size: 9.5, style: "bold", align: "right" });
      k.text(right2, W - M, y + 24, { size: 7.5, color: PC.muted, align: "right" });
      k.y = y + 42;
      doc.setDrawColor(...PC.in); doc.setLineWidth(1.5); doc.line(M, k.y, W - M, k.y);
      k.y += 24;
    };
    k.footers = (left) => {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...PC.grid); doc.setLineWidth(0.5); doc.line(M, H - 34, W - M, H - 34);
        k.text(left, M, H - 22, { size: 7, color: PC.muted });
        k.text(`Page ${i} of ${pages}`, W - M, H - 22, { size: 7, color: PC.muted, align: "right" });
      }
    };
    return k;
  }

  function pdfDelta(cur, prev, label = "last week") {
    if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev === 0) return null;
    const ch = (cur - prev) / Math.abs(prev);
    return { note: `${ch >= 9 && prev > 0 ? `${num(Math.round(cur / prev))}×` : `${ch >= 0 ? "+" : "-"}${pct(Math.abs(ch))}`} vs ${label}`, color: Math.abs(ch) < 0.0005 ? PC.muted : ch > 0 ? PC.good : PC.bad };
  }

  async function exportReportPdf() {
    const k = await newPdf();
    const v = V;
    const expRows = (x) => [...x.open].sort((a, b) => a.rank - b.rank || (a.days ?? 0) - (b.days ?? 0));
    const expColor = (rows) => (ri, ci) => (ci === 3 && rows[ri] && rows[ri].disp === "Overdue" ? PC.bad : null);
    k.header("Daily Commercial Report", flong(v.T), `Week ${fday(v.ws)} – ${fday(v.we)}`);

    k.kpis([
      { label: "Paid today", value: moneyC(sum(v.paidToday)), note: `${num(v.paidToday.length)} payments` },
      { label: "Paid this week", value: moneyC(sum(v.paidWeek)), ...(pdfDelta(sum(v.paidWeek), sum(v.paidLastTD)) || { note: "So far this week" }) },
      { label: "New leads today", value: num(v.leadsToday.length), note: `${num(v.leadsWeek.length)} this week` },
      { label: "New paid customers", value: num(v.convWeek.length), note: `${pct(v.convRate)} conversion` },
      { label: "Expected advance (week)", value: moneyC(sum(v.adv.dueWeek)), note: v.adv.overdue.length ? `${moneyC(sum(v.adv.overdue))} overdue` : `${num(v.adv.dueWeek.length)} due`, color: v.adv.overdue.length ? PC.bad : null },
      { label: "Expected final (week)", value: moneyC(sum(v.fin.dueWeek)), note: v.fin.overdue.length ? `${moneyC(sum(v.fin.overdue))} overdue` : `${num(v.fin.dueWeek.length)} due`, color: v.fin.overdue.length ? PC.bad : null },
      { label: "Open problems", value: num(v.probOpen.length + v.probProg.length), note: `${num(v.probNewToday.length)} new today` },
      { label: "Pre-measurements (week)", value: num(v.measWeek.length), note: v.measMissed.length ? `${num(v.measMissed.length)} missed` : `${num(v.measUpcoming.length)} scheduled`, color: v.measMissed.length ? PC.bad : null },
    ]);

    // 01 Today paid
    k.heading("01", "Today paid", `Total ${money(sum(v.paidToday))}`);
    k.table({ head: ["Customer", "Project / order", "Type", "Method", "Amount"], align: ["l", "l", "l", "l", "r"],
      body: [...v.paidToday].sort((a, b) => b.amount - a.amount).map((p) => [p.customer, p.project, p.type, p.method, money(p.amount)]),
      foot: v.paidToday.length ? ["Total", "", "", "", money(sum(v.paidToday))] : null, empty: "No payments recorded on this date." });
    k.chart({ title: "Paid per day this week", labels: v.dayLabels, values: v.paidByDay, selected: new Set([v.days.indexOf(v.T)]), fmtTick: moneyC, height: 90 });

    // 02 Leads
    k.heading("02", "Leads", `${num(v.leadsToday.length)} today · ${num(v.leadsWeek.length)} this week`);
    k.table({ head: ["Date", "Customer", "Phone", "Source", "Product", "Stage", "Sales rep"], align: ["l", "l", "l", "l", "l", "l", "l"], fontSize: 7.5,
      body: [...v.leadsWeek].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((l) => [fday(l.date), l.customer, l.phone, l.source, l.product, l.stage, l.rep]),
      empty: "No leads this week." });
    if (v.leadSources.length) k.line(`By source this week: ${v.leadSources.map((x) => `${x.label} ${x.value}`).join(" · ")}`);

    // 03 Pre-measurement
    k.heading("03", "Pre-measurement", `${num(v.measToday.length)} today · ${num(v.measWeek.length)} this week · ${num(v.measUpcoming.length)} scheduled · ${num(v.measMissed.length)} missed`);
    const mrows = [...v.meas.filter((m) => m.status === "Taken" && within(m.date, v.ws, v.T)), ...v.meas.filter((m) => (m.status || "Scheduled") === "Scheduled")]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    k.table({ head: ["Date", "Customer", "Phone", "Location / site", "Product", "Measured by", "Status"], align: ["l", "l", "l", "l", "l", "l", "l"], fontSize: 7.5,
      body: mrows.map((m) => [fday(m.date), m.customer, m.phone, m.location, m.product, m.measuredBy, m.disp]),
      color: (ri, ci) => (ci === 6 && mrows[ri] && mrows[ri].disp === "Missed" ? PC.bad : null),
      empty: "No pre-measurements taken this week and none scheduled." });

    // 04 / 05 expected
    for (const [no, title, x] of [["04", "Expected advance", v.adv], ["05", "Expected final", v.fin]]) {
      const rows = expRows(x);
      k.heading(no, title, `Open ${money(sum(x.open))} · overdue ${money(sum(x.overdue))} · received this week ${money(sum(x.receivedWeek))}`);
      k.table({ head: ["Expected", "Customer", "Project / order", "Status", "When", "Amount"], align: ["l", "l", "l", "l", "l", "r"], fontSize: 7.5,
        body: rows.map((r) => [fdate(r.expectedDate), r.customer, r.project, r.disp, dueText(r), money(r.amount)]),
        foot: rows.length ? ["Total", "", "", "", "", money(sum(rows))] : null, color: expColor(rows), empty: "No open expected payments." });
    }

    // 06 Problems
    const probs = v.problems.filter((p) => p.status !== "Solved").sort((a, b) => (b.daysOpen ?? 0) - (a.daysOpen ?? 0));
    k.heading("06", "Problems", `${num(v.probOpen.length)} open · ${num(v.probProg.length)} in progress · ${num(v.probSolvedWeek.length)} solved this week`);
    k.table({ head: ["Date", "Customer / project", "Problem", "Responsible", "Status", "Days", "Action"], align: ["l", "l", "l", "l", "l", "r", "l"], fontSize: 7.5,
      widths: [52, 82, 0, 62, 54, 30, 0],
      body: probs.map((p) => [fdate(p.date), p.customer, p.problem, p.owner, p.status || "Open", p.daysOpen == null ? "—" : num(p.daysOpen), p.action]),
      empty: "No open problems." });

    // 07 Social media
    k.heading("07", "Social media", `${num(v.socialLeads)} leads from social media this week`);
    const plats = [...new Set([...SOCIAL, ...v.socWeek.keys()])].filter((p) => v.socWeek.has(p) || v.socLast.has(p));
    k.table({ head: ["Platform", "Posts", "New followers", "Views", "Inquiries", "Inquiries last week"], align: ["l", "r", "r", "r", "r", "r"],
      body: plats.map((p) => { const a = v.socWeek.get(p) || { posts: 0, followers: 0, views: 0, inquiries: 0 }; const b = v.socLast.get(p) || { inquiries: 0 }; return [p, num(a.posts), num(a.followers), num(a.views), num(a.inquiries), num(b.inquiries)]; }),
      foot: plats.length ? ["Total", num(v.soc.posts.cur), num(v.soc.followers.cur), num(v.soc.views.cur), num(v.soc.inquiries.cur), num(v.soc.inquiries.prev)] : null,
      empty: "No social media numbers for this week." });

    // 08 + 09 weekly leads and conversion
    k.heading("08", "Weekly total leads", `This week ${num(v.leadSeries[11])} · last week ${num(v.leadSeries[10])}`, 200);
    k.chart({ labels: v.weekLabels, values: v.leadSeries, selected: new Set([11]), height: 90 });
    k.heading("09", "Changed to paid customer", `${num(v.convWeek.length)} this week · ${pct(v.convRate)} of leads (12 weeks)`);
    k.table({ head: ["Week", "Leads", "Paid customers", "Share"], align: ["l", "r", "r", "r"],
      body: v.weekLabels.map((w, i) => [w.long, num(v.leadSeries[i]), num(v.convSeries[i]), v.leadSeries[i] ? pct(v.convSeries[i] / v.leadSeries[i]) : "—"]).reverse().slice(0, 6),
      bold: (i) => i === 0 });
    const conv = v.convWeek.map((l) => ({ ...l, paid: v.paidDateOf(l) }));
    k.table({ head: ["Paid date", "Customer", "Source", "Product", "Lead date"], align: ["l", "l", "l", "l", "l"],
      body: conv.map((l) => [fday(l.paid), l.customer, l.source, l.product, fdate(l.date)]), empty: "No new paid customers this week." });

    k.footers(`${C.name || "Company"} · Daily commercial report · ${flong(v.T)} · amounts in ${CUR} · printed ${fdate(todayISO())}`);
    k.doc.save(`${slug(C.name)}-daily-report-${v.T}.pdf`);
  }

  async function withBusy(btn, fn) {
    if (btn.disabled) return;
    const kids = [...btn.childNodes];
    btn.disabled = true;
    btn.replaceChildren(icon("clock"), "Preparing PDF…");
    try { await fn(); toast("PDF downloaded."); }
    catch (e) { console.error(e); toast(e.message || "Could not create the PDF."); }
    finally { btn.disabled = false; btn.replaceChildren(...kids); }
  }

  /* ==========================================================================
     ONLINE MODE — Cloudflare Worker API: login, shared records, live updates
     ========================================================================== */
  const authEl = $("#auth");
  const TOKEN_KEY = "kr-session"; // shared by every department page, so one sign-in works on all of them
  const API_BASE = `${String(CFG.apiUrl || "").replace(/\/+$/, "")}/api/${CFG.dept}`;
  const DEPT_LABEL = CFG.label || $(".topbar h1").textContent.trim();
  let TOKEN = null, REV = 0, pollTimer = 0;
  let snap = new Map(), setSnap = "";
  let syncTimer = 0, retryTimer = 0, syncing = false, syncAgain = false, pending = false;
  const keyOf = (ds, rid) => `${ds}\u0000${rid}`;
  try { TOKEN = localStorage.getItem(TOKEN_KEY); } catch (e) { /* storage blocked */ }
  function saveToken(t) { TOKEN = t; try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
  async function api(path, body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctl.signal,
      });
    } catch (e) {
      throw new Error(e.name === "AbortError" ? "The server did not answer in time" : "No internet connection");
    } finally { clearTimeout(timer); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (res.status === 401 && TOKEN && path !== "/login") {
      saveToken(null); ROLE = null; clearInterval(pollTimer);
      showAuth("signin", (data && data.error) || "Your session ended. Please sign in again.");
      throw Object.assign(new Error("Signed out"), { quiet: true });
    }
    if (!res.ok) throw Object.assign(new Error((data && data.error) || `Server error ${res.status}`), { status: res.status });
    return data;
  }
  function takeSnapshot() {
    snap = new Map();
    for (const ds of DATASETS) for (const r of D[ds]) snap.set(keyOf(ds, r.id), JSON.stringify(r));
    setSnap = JSON.stringify(D.company);
  }
  function setSyncState(st, detail) {
    const el = $("#sync-state");
    if (!el) return;
    el.className = `sync-state ${st}`;
    el.replaceChildren(icon(st === "saved" ? "check" : st === "saving" ? "clock" : "alertCircle"), st === "saved" ? "Saved" : st === "saving" ? "Saving…" : "Not saved");
    el.title = detail || (st === "saved" ? "All changes are saved online" : "");
  }
  function scheduleSync() {
    if (!ROLE || !canWrite()) return;
    pending = true;
    setSyncState("saving");
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 500);
  }
  async function syncNow() {
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    try {
      const ups = [], seen = new Set();
      for (const ds of DATASETS) {
        const def = SHEETS.find((d) => d.id === ds) || { prefix: `${ds.slice(0, 2).toUpperCase()}-` };
        for (const r of D[ds]) {
          if (!/^[A-Za-z0-9._:-]{1,80}$/.test(String(r.id || ""))) r.id = nextId(def);
          const k = keyOf(ds, r.id);
          seen.add(k);
          const js = JSON.stringify(r);
          if (snap.get(k) !== js) ups.push({ dataset: ds, rid: r.id, data: r, js });
        }
      }
      const dels = [...snap.keys()].filter((k) => !seen.has(k)).map((k) => { const [dataset, rid] = k.split("\u0000"); return { dataset, rid }; });
      const setJs = JSON.stringify(D.company);
      const settings = setJs !== setSnap ? D.company : null;
      const jobs = [...ups.map((u) => ["u", u]), ...dels.map((d) => ["d", d])];
      for (let i = 0; i < Math.max(jobs.length, settings ? 1 : 0); i += 200) {
        const part = jobs.slice(i, i + 200);
        const body = { upserts: part.filter((j) => j[0] === "u").map(([, u]) => ({ dataset: u.dataset, rid: u.rid, data: u.data })), deletes: part.filter((j) => j[0] === "d").map(([, d]) => d) };
        if (i === 0 && settings) body.settings = settings;
        await api("/sync", body);
        for (const [kind, x] of part) { if (kind === "u") snap.set(keyOf(x.dataset, x.rid), x.js); else snap.delete(keyOf(x.dataset, x.rid)); }
        if (i === 0 && settings) setSnap = setJs;
      }
      pending = false;
      setSyncState("saved");
    } catch (e) {
      if (e.quiet) return;
      console.error(e);
      setSyncState("error", e.message || String(e));
      if (e.status === 403) { toast("Your access has changed. Reloading…"); setTimeout(() => location.reload(), 1500); return; }
      toast(`Not saved online (${e.message || e}). It will try again by itself.`, { label: "Try now", run: () => scheduleSync() });
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { if (pending) scheduleSync(); }, 15000);
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; scheduleSync(); }
    }
  }
  async function loadAll() {
    const res = await api("/data");
    const d = { company: res.settings || {} };
    for (const k of DATASETS) d[k] = [];
    for (const r of res.records || []) if (d[r.dataset]) d[r.dataset].push({ ...r.data, id: r.rid });
    D = normalize(d);
    D.sample = false;
    REV = res.rev || 0;
    takeSnapshot();
  }
  let renderQueued = false;
  function queueRemoteRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => {
      const a = document.activeElement;
      if (a && a.classList && a.classList.contains("cell")) { a.addEventListener("blur", () => setTimeout(run, 60), { once: true }); return; }
      renderQueued = false;
      if (document.body.dataset.view === "sheet") { renderSheetTabs(); renderSheet(); dirty = true; } else rebuildAll();
    };
    setTimeout(run, 200);
  }
  async function poll() {
    if (!ROLE || pending || syncing || document.visibilityState !== "visible") return;
    try {
      let changed = false, more = true;
      while (more) {
        const res = await api(`/changes?since=${REV}`);
        for (const r of res.records || []) {
          const arr = D[r.dataset];
          if (!arr) continue;
          const k = keyOf(r.dataset, r.rid), at = arr.findIndex((x) => x.id === r.rid);
          if (r.deleted) { if (at >= 0) { arr.splice(at, 1); changed = true; } snap.delete(k); continue; }
          const rec = { ...r.data, id: r.rid }, js = JSON.stringify(rec);
          if (snap.get(k) === js) continue;
          if (at >= 0) arr[at] = rec; else arr.push(rec);
          snap.set(k, js);
          changed = true;
        }
        if (res.settings) {
          D.company = normalize({ company: res.settings }).company;
          const js = JSON.stringify(D.company);
          if (js !== setSnap) { setSnap = js; changed = true; }
        }
        REV = res.rev || REV;
        more = !!res.more;
      }
      if (changed) queueRemoteRender();
    } catch (e) {
      if (e.status === 403) { ROLE = null; clearInterval(pollTimer); applyRoleUI(); showAuth("waiting"); }
      /* otherwise offline: try again next time */
    }
  }
  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, 15000);
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") poll(); });
  function renderAccountChip() {
    const el = $("#account-chip");
    if (!CONNECTED || !ROLE) { el.hidden = true; return; }
    const pass = h("button", { class: "btn btn-sm btn-ghost", type: "button", title: "Change your password" }, "Password");
    pass.addEventListener("click", () => showAuth("changepass"));
    const out = h("button", { class: "btn btn-sm btn-ghost", type: "button", title: "Sign out" }, "Sign out");
    out.addEventListener("click", signOut);
    el.replaceChildren(...[canWrite() ? h("span", { class: "sync-state saved", id: "sync-state" }) : null, h("span", { class: "who" }, h("strong", {}, ME.name || ME.email), h("span", {}, ROLE_LABEL[ROLE] || ROLE)), pass, out].filter(Boolean));
    el.hidden = false;
    setSyncState(pending ? "saving" : "saved");
  }
  async function signOut() {
    try { await api("/logout", {}); } catch (e) { /* already signed out */ }
    saveToken(null);
    location.reload();
  }
  function applyRoleUI() {
    document.body.dataset.role = CONNECTED ? ROLE || "none" : "local";
    for (const id of ["#load-example", "#clear-all", "#export-js"]) $(id).hidden = CONNECTED;
    $("#import-btn").hidden = CONNECTED && !canWrite();
    renderAccountChip();
  }
  function closeAuth() { authEl.hidden = true; document.body.classList.remove("locked"); }
  function showAuth(mode, message) {
    document.body.classList.add("locked");
    authEl.hidden = false;
    const err = h("p", { class: "auth-error", role: "alert" }, message || "");
    const field = (label, attrs) => { const i = h("input", { class: "input", ...attrs }); return [h("label", { class: "field" }, h("span", {}, label), i), i]; };
    const mark = $(".brand .brand-mark") ? $(".brand .brand-mark").cloneNode(true) : null;
    const head = h("div", { class: "auth-head" }, mark, h("div", {}, h("strong", {}, C.name || "Company"), h("span", {}, DEPT_LABEL)));
    const link = (text, fn) => { const b = h("button", { class: "linkish", type: "button" }, text); b.addEventListener("click", fn); return b; };
    const busy = async (btn, fn) => { btn.disabled = true; err.textContent = ""; try { await fn(); } catch (x) { if (!x.quiet) err.textContent = x.message || String(x); btn.disabled = false; } };
    let body = [];
    if (mode === "loading") body = [h("p", { class: "muted" }, "Loading…")];
    else if (mode === "error") {
      const again = h("button", { class: "btn btn-primary", type: "button" }, "Try again");
      again.addEventListener("click", () => location.reload());
      body = [h("h2", {}, "Could not connect"), h("p", {}, message || "Something went wrong."), again];
    }
    else if (mode === "signin" || mode === "signup") {
      const [fName, iName] = field("Your name", { type: "text", autocomplete: "name" });
      const [fEmail, iEmail] = field("Email", { type: "email", autocomplete: "email", required: true });
      const [fPass, iPass] = field("Password", { type: "password", autocomplete: mode === "signin" ? "current-password" : "new-password", required: true, minlength: 8 });
      const go = h("button", { class: "btn btn-primary", type: "submit" }, mode === "signin" ? "Sign in" : "Create account");
      const form = h("form", { class: "auth-form" }, mode === "signup" ? fName : null, fEmail, fPass, err, go);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        busy(go, async () => {
          const email = iEmail.value.trim().toLowerCase(), password = iPass.value;
          const res = mode === "signin" ? await api("/login", { email, password }) : await api("/signup", { email, password, name: iName.value.trim() });
          saveToken(res.token);
          await afterLogin(res.me);
        });
      });
      body = [h("h2", {}, mode === "signin" ? "Sign in" : "Create your account"),
        h("p", { class: "muted" }, mode === "signin" ? "Use the email the owner gave access to." : "Use the email the owner added in Team & access. Choose a password of at least 8 characters."),
        form,
        h("p", { class: "auth-links" }, mode === "signin"
          ? [link("First time? Create your account", () => showAuth("signup")), " · ", link("Forgot password?", () => { err.textContent = "Ask the owner to set a new password for you in Team & access."; })]
          : link("I already have an account", () => showAuth("signin")))];
    } else if (mode === "changepass") {
      const [fCur, iCur] = field("Current password", { type: "password", autocomplete: "current-password" });
      const [fNew, iNew] = field("New password (at least 8 characters)", { type: "password", autocomplete: "new-password", minlength: 8 });
      const go = h("button", { class: "btn btn-primary", type: "submit" }, "Save new password");
      const form = h("form", { class: "auth-form" }, fCur, fNew, err, go);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        busy(go, async () => { await api("/password", { current: iCur.value, next: iNew.value }); closeAuth(); toast("Password changed."); });
      });
      body = [h("h2", {}, "Change your password"), form, h("p", { class: "muted" }, "The new password works on every department page you have access to."), h("p", { class: "auth-links" }, link("Cancel", closeAuth))];
    } else if (mode === "claim") {
      const [fName, iName] = field("Your name", { type: "text", value: ME.name || "" });
      const go = h("button", { class: "btn btn-primary", type: "button" }, "Set up as owner");
      go.addEventListener("click", () => busy(go, async () => { const res = await api("/claim-owner", { name: iName.value.trim() }); await afterLogin(res.me); }));
      body = [h("h2", {}, "First-time setup"), h("p", {}, `Signed in as ${ME.email}. Nobody manages the ${DEPT_LABEL} yet. The first person becomes the owner: they see everything and decide who else gets access.`), fName, err, go,
        h("p", { class: "auth-links" }, link("Sign out", signOut))];
    } else if (mode === "waiting") {
      const again = h("button", { class: "btn btn-primary", type: "button" }, "Check again");
      again.addEventListener("click", () => busy(again, async () => { const res = await api("/me"); await afterLogin(res.me); }));
      body = [h("h2", {}, "Waiting for access"), h("p", {}, `You are signed in as ${ME.email}, but this email has no access to the ${DEPT_LABEL} yet. Ask the owner to add it in Team & access, then tap Check again.`), err, again,
        h("p", { class: "auth-links" }, link("Sign out", signOut))];
    }
    authEl.replaceChildren(h("div", { class: "auth-card" }, head, ...body));
    const firstInput = $("input", authEl);
    if (firstInput) firstInput.focus();
  }
  async function afterLogin(me) {
    ME = me;
    if (!me.role) { showAuth(me.hasOwner ? "waiting" : "claim"); return; }
    showAuth("loading");
    ROLE = me.role;
    try { await loadAll(); } catch (x) { if (!x.quiet) showAuth("error", `Could not load the records: ${x.message || x}.`); return; }
    startPolling();
    closeAuth();
    applyRoleUI();
    rebuildAll();
    setView(location.hash === "#sheet" ? "sheet" : "report", { scroll: false });
  }
  async function bootConnected() {
    document.body.classList.add("locked");
    applyRoleUI();
    if (!TOKEN) { showAuth("signin"); return; }
    showAuth("loading");
    try {
      const res = await api("/me");
      await afterLogin(res.me);
    } catch (x) {
      if (!x.quiet) showAuth("signin", `Could not reach the server: ${x.message || x}`);
    }
  }
  async function renderTeam(host) {
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, "Team & access")), h("div", { class: "sheet-empty" }, "Loading…"));
    let data;
    try { data = await api("/members"); } catch (x) { if (!x.quiet) host.replaceChildren(h("div", { class: "sheet-empty" }, h("strong", {}, "Could not load the team. "), x.message)); return; }
    const me = (ME.email || "").toLowerCase();
    const roleSelect = (value, disabled) => { const sel = h("select", { class: "select", disabled }, ["owner", "editor", "viewer"].map((r) => h("option", { value: r }, ROLE_LABEL[r]))); sel.value = value; return sel; };
    const iName = h("input", { class: "input", type: "text", placeholder: "Name", "aria-label": "Name" });
    const iEmail = h("input", { class: "input", type: "email", placeholder: "name@example.com", "aria-label": "Email" });
    const iRole = roleSelect("editor", false);
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus"), "Give access");
    add.addEventListener("click", async () => {
      try {
        await api("/members", { email: iEmail.value.trim(), name: iName.value.trim(), role: iRole.value });
        toast(`${iEmail.value.trim()} can now create an account. Send them the link; they tap "First time? Create your account".`);
        renderTeam(host);
      } catch (x) { if (!x.quiet) toast(x.message); }
    });
    const pill = (ok) => h("span", { class: `badge ${ok ? "good" : "warning"}` }, icon(ok ? "check" : "clock"), ok ? "Account created" : "Not signed up yet");
    const rows = (data.members || []).map((m) => {
      const self = m.email.toLowerCase() === me;
      const sel = roleSelect(m.role, self);
      sel.addEventListener("change", async () => { try { await api("/members", { email: m.email, role: sel.value }); toast(`${m.email}: ${ROLE_LABEL[sel.value]}.`); } catch (x) { if (!x.quiet) toast(x.message); renderTeam(host); } });
      const actions = h("div", { class: "team-acts" });
      if (!self && m.hasAccount && m.role !== "owner") {
        const reset = h("button", { class: "btn btn-sm", type: "button" }, "Set password");
        reset.addEventListener("click", async () => {
          const pw = prompt(`New password for ${m.email} (at least 8 characters). Tell them the new password; they can change it after signing in.`);
          if (!pw) return;
          try { await api("/members/password", { email: m.email, password: pw }); toast(`New password set for ${m.email}.`); } catch (x) { if (!x.quiet) toast(x.message); }
        });
        actions.append(reset);
      }
      if (!self) {
        const rm = h("button", { class: "btn btn-sm btn-ghost danger", type: "button" }, "Remove");
        rm.addEventListener("click", async () => {
          if (!confirm(`Remove access for ${m.email}? They will no longer see this report.`)) return;
          try { await api("/members/delete", { email: m.email }); renderTeam(host); } catch (x) { if (!x.quiet) toast(x.message); }
        });
        actions.append(rm);
      }
      return h("tr", {}, h("td", {}, h("strong", {}, m.name || "—")), h("td", {}, m.email), h("td", {}, sel), h("td", {}, pill(m.hasAccount)), h("td", {}, self ? h("span", { class: "muted" }, "You") : actions));
    });
    host.replaceChildren(
      h("div", { class: "sheet-head" }, h("h3", {}, "Team & access"), h("span", { class: "count" }, `${num(rows.length)} ${rows.length === 1 ? "person" : "people"}`)),
      h("div", { class: "team-add" }, iName, iEmail, iRole, add),
      h("div", { class: "table-wrap" }, h("table", { class: "dt" }, h("thead", {}, h("tr", {}, ["Name", "Email", "Access", "Status", ""].map((t) => h("th", { scope: "col" }, t)))), h("tbody", {}, rows))),
      h("div", { class: "sheet-foot" }, "Owner: sees everything and manages access. Enters data: adds and edits records and settings. View only: sees the report and records but cannot change them. Forgotten password: tap Set password and tell the person the new one. One account works on every department page the person has access to."));
  }

  /* ---------- view switching ---------- */
  function setView(v, { scroll = true } = {}) {
    document.body.dataset.view = v;
    $$("#view-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    $$("#nav a").forEach((a) => a.classList.toggle("active", v === "sheet" ? a.classList.contains("nav-sheet") : a.getAttribute("href") === "#paid"));
    hideTip();
    if (v === "sheet") { renderSheetTabs(); renderSheet(); }
    else if (dirty) rebuildAll();
    try { history.replaceState(null, "", v === "sheet" ? location.pathname + location.search + "#sheet" : location.pathname + location.search); } catch (e) { /* ignore */ }
    if (scroll) scrollTo({ top: 0 });
  }

  /* ---------- one-time wiring ---------- */
  function initOnce() {
    buildChartCards();
    $$("#nav a").forEach((a, i) => {
      a.prepend(icon(a.dataset.icon));
      if (!a.classList.contains("nav-sheet")) a.append(h("span", { class: "n" }, String(i + 1).padStart(2, "0")));
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        e.preventDefault();
        if (id === "sheet") { setView("sheet"); return; }
        if (document.body.dataset.view === "sheet") setView("report", { scroll: false });
        document.getElementById(id).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    });
    const links = new Map($$("#nav a").map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      if (document.body.dataset.view === "sheet") return;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove("active"));
        const a = links.get(e.target.id);
        if (a) { a.classList.add("active"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      }
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".section").forEach((sec) => io.observe(sec));

    // Redraw SVG charts when their width changes (also when they become visible)
    const widths = new WeakMap();
    let pending = new Set(), raf = 0;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (widths.get(e.target) === w) continue;
        widths.set(e.target, w);
        if (w > 0) pending.add(e.target);
      }
      if (!pending.size || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        for (const el of pending) {
          if (el === V.spark) { drawSpark(el, V.paidByDay, new Set([V.days.indexOf(V.T)]), V.dayLabels); continue; }
          const id = el.closest("[data-chart]")?.dataset.chart;
          if (id && !CHARTS[id].fluid) drawChart(id);
        }
        pending = new Set();
      });
    });
    $$(".chart-body").forEach((el) => ro.observe(el));
    new MutationObserver(() => { if (V.spark) ro.observe(V.spark); }).observe($("#hero"), { childList: true });

    // Date control
    dateInput.addEventListener("change", () => setDate(dateInput.value));
    $("#day-prev").addEventListener("click", () => setDate(addDays(state.date, -1)));
    $("#day-next").addEventListener("click", () => setDate(addDays(state.date, 1)));
    $("#day-today").addEventListener("click", () => setDate(todayISO()));

    $("#theme-btn").addEventListener("click", () => {
      const root = document.documentElement;
      const current = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("cr-theme", next); } catch (e) { /* storage unavailable */ }
    });

    const pdfTop = $("#pdf-btn");
    pdfTop.addEventListener("click", () => {
      if (document.body.dataset.view === "sheet") setView("report", { scroll: false });
      withBusy(pdfTop, exportReportPdf);
    });
    $("#print-btn").addEventListener("click", () => {
      if (document.body.dataset.view === "sheet") setView("report");
      requestAnimationFrame(() => window.print());
    });
    addEventListener("beforeprint", () => { Object.values(TABLES).forEach((t) => { t.printAll = true; t.draw(); }); });
    addEventListener("afterprint", () => { Object.values(TABLES).forEach((t) => { t.printAll = false; t.draw(); }); });

    $$("#view-seg button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

    // Sheet actions
    const importBtn = $("#import-btn"), fileIn = $("#import-file");
    importBtn.replaceChildren(icon("upload"), "Import Excel / CSV");
    importBtn.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) importFile(f); });
    $("#export-xlsx").replaceChildren(icon("download"), "Export Excel");
    $("#export-xlsx").addEventListener("click", exportExcel);
    $("#export-js").replaceChildren(icon("code"), "Download data.js");
    $("#export-js").addEventListener("click", () => {
      download("data.js", dataJsText(), "text/javascript;charset=utf-8");
      toast("data.js downloaded. Upload it into the commercial folder on GitHub to publish.");
    });
    $("#load-example").addEventListener("click", () => {
      const has = DATASETS.some((k) => D[k].length) && !D.sample;
      if (has && !confirm("Replace the rows on this device with example data? Export Excel first if you want to keep your rows.")) return;
      D = normalize(exampleData());
      saveData(); renderSheetTabs(); renderSheet(); toast("Example data loaded. Tap Report to see it.");
    });
    $("#clear-all").addEventListener("click", () => {
      if (!confirm("Start with an empty sheet? All rows on this device will be removed (settings are kept). Tip: Export Excel first to keep a copy.")) return;
      for (const k of DATASETS) D[k] = [];
      D.sample = false;
      saveData(); renderSheetTabs(); renderSheet(); toast("Sheet cleared. Tap Add row to start.");
    });
  }

  function initStateFromURL() {
    try {
      const d = new URL(location.href).searchParams.get("date");
      if (isISO(d)) state.date = d;
    } catch (e) { /* ignore */ }
  }

  buildFormats();
  initStateFromURL();
  initOnce();
  rebuildAll();
  if (CONNECTED) bootConnected();
  else { applyRoleUI(); setView(location.hash === "#sheet" ? "sheet" : "report", { scroll: false }); }
})();
