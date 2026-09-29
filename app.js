/* ==========================================================================
   Commercial Report — app
   The report is computed from the data sheet. The sheet starts from
   window.REPORT_DATA (data.js); edits are saved in this browser.
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
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sales: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    expenses: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
    advances: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    settlement: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
    payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
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
    arrowIn: '<path d="M17 7 7 17M17 17H7V7"/>',
    arrowOut: '<path d="M7 17 17 7M7 7h10v10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
  };
  function icon(name) {
    const t = document.createElement("template");
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
    return t.content.firstChild;
  }

  /* ---------- data store ---------- */
  const SAMPLE = window.REPORT_DATA || { company: {} };
  const STORE_KEY = "cr-sheet-v2";
  const DATASETS = ["leads", "sales", "expenses", "advances", "settlements", "payments"];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function normalize(d) {
    const out = clone(d || {});
    out.company = { ...(SAMPLE.company || {}), ...(out.company || {}) };
    for (const k of DATASETS) if (!Array.isArray(out[k])) out[k] = [];
    return out;
  }
  let LOCAL = false;
  function loadData() {
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
    try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); } catch (e) { toast("Could not save in this browser (storage is blocked). Export to Excel to keep your changes."); }
  }
  function discardLocal() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    D = normalize(SAMPLE);
    LOCAL = false;
    dirty = true;
  }

  /* ---------- formatting & period model (rebuilt when data changes) ---------- */
  let C, COGS, LOC, CUR, fMoney, fMoneyC, fNum, fPct, fDate;
  let MONTHS = [], N = 0, MONTH_INDEX = new Map(), PRESETS = [], SERIES = {};

  const money = (n) => fMoney.format(Math.round(Number(n) || 0));
  const moneyC = (n) => (Math.abs(n) < 10000 ? fMoney.format(Math.round(n)) : fMoneyC.format(n));
  const minus = (n) => (n > 0 ? "−" + money(n) : money(0));
  const num = (n) => fNum.format(n);
  const pct = (n) => (Number.isFinite(n) ? fPct.format(n) : "—");
  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const parseD = (str) => { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, m - 1, d || 1); };
  const fdate = (str) => (isoRe.test(String(str)) ? fDate.format(parseD(str)) : String(str || "—"));
  const pad2 = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  function groupSum(arr, keyFn, valFn = (x) => x.amount) {
    const m = new Map();
    for (const x of arr) { const k = keyFn(x) || "(blank)"; m.set(k, (m.get(k) || 0) + (Number(valFn(x)) || 0)); }
    return m;
  }

  function buildModel() {
    C = D.company;
    const raw = C.cogsCategories ?? C.cogsCategory ?? [];
    COGS = new Set((Array.isArray(raw) ? raw : String(raw).split(",")).map((x) => String(x).trim()).filter(Boolean));

    LOC = C.locale || "en-US";
    CUR = String(C.currency || "ETB").trim().toUpperCase();
    try { new Intl.NumberFormat(LOC); } catch (e) { LOC = "en-US"; }
    try { new Intl.NumberFormat(LOC, { style: "currency", currency: CUR }); } catch (e) { CUR = "ETB"; }
    fMoney = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, maximumFractionDigits: 0 });
    fMoneyC = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, notation: "compact", maximumFractionDigits: 1 });
    fNum = new Intl.NumberFormat(LOC);
    fPct = new Intl.NumberFormat(LOC, { style: "percent", maximumFractionDigits: 1 });
    fDate = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" });

    // Period: blank start = 1 Jan this year; blank end = today, or the latest record (up to a year ahead)
    const today = new Date();
    const dates = DATASETS.flatMap((k) => D[k].map((r) => r.date || r.settlementDate)).filter((x) => isoRe.test(String(x))).sort();
    let start = isoRe.test(C.periodStart || "") ? parseD(C.periodStart) : new Date(today.getFullYear(), 0, 1);
    let end = isoRe.test(C.periodEnd || "") ? parseD(C.periodEnd) : today;
    if (!isoRe.test(C.periodEnd || "") && dates.length) {
      const last = parseD(dates[dates.length - 1]);
      const cap = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      if (last > end) end = last > cap ? cap : last;
    }
    if (end < start) {
      start = dates.length ? parseD(dates[0]) : new Date(today.getFullYear(), 0, 1);
      end = dates.length ? parseD(dates[dates.length - 1]) : today;
    }
    MONTHS = [];
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end && MONTHS.length < 60; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      MONTHS.push({
        key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
        short: d.toLocaleDateString(LOC, { month: "short" }),
        long: d.toLocaleDateString(LOC, { month: "long", year: "numeric" }),
        y: d.getFullYear(),
        q: Math.floor(d.getMonth() / 3) + 1,
      });
    }
    N = MONTHS.length;
    MONTH_INDEX = new Map(MONTHS.map((m, i) => [m.key, i]));
    const multiYear = MONTHS[0].y !== MONTHS[N - 1].y;
    const ytd = !multiYear && start.getMonth() === 0;

    PRESETS = [{ id: "all", label: ytd ? "Year to date" : "All", long: ytd ? "Year to date" : "Full period", idx: MONTHS.map((_, i) => i), prev: null }];
    const qMap = new Map();
    MONTHS.forEach((m, i) => {
      const id = `${m.y}-Q${m.q}`;
      if (!qMap.has(id)) qMap.set(id, { id, label: multiYear ? `Q${m.q} ${m.y}` : `Q${m.q}`, long: `Q${m.q} ${m.y}`, idx: [] });
      qMap.get(id).idx.push(i);
    });
    const quarters = [...qMap.values()];
    quarters.forEach((q, i) => (q.prev = quarters[i - 1] || null));
    if (quarters.length > 1) PRESETS.push(...quarters);

    if (state.month != null && state.month >= N) state.month = null;
    if (!PRESETS.some((p) => p.id === state.preset)) state.preset = "all";

    SERIES = {
      sales: monthly(D.sales),
      expenses: monthly(D.expenses),
      leads: monthly(D.leads, () => true, () => 1),
      cashIn: monthly(D.payments, (p) => p.direction === "In" && p.status === "Completed"),
      cashOut: monthly(D.payments, (p) => p.direction === "Out" && p.status === "Completed"),
    };
  }

  function rangeLabel(idx) {
    const a = MONTHS[idx[0]], b = MONTHS[idx[idx.length - 1]];
    if (a === b) return a.long;
    return a.y === b.y ? `${a.short} – ${b.short} ${b.y}` : `${a.short} ${a.y} – ${b.short} ${b.y}`;
  }

  const state = { preset: "all", month: null, fs: null };
  let SEL = null;

  function selection() {
    let idx, short, prev = null;
    if (state.month != null) {
      idx = [state.month];
      short = MONTHS[state.month].long;
      if (state.month > 0) prev = { idx: [state.month - 1], label: MONTHS[state.month - 1].short };
    } else {
      const p = PRESETS.find((x) => x.id === state.preset) || PRESETS[0];
      idx = p.idx;
      short = p.long;
      if (p.prev) prev = { idx: p.prev.idx, label: p.prev.label };
    }
    const keysOf = (ix) => new Set(ix.map((i) => MONTHS[i].key));
    return {
      idx, set: new Set(idx), keys: keysOf(idx), short, range: rangeLabel(idx),
      prev: prev && { ...prev, keys: keysOf(prev.idx) },
    };
  }

  const inK = (rows, keys, field = "date") => rows.filter((r) => keys.has(String(r[field]).slice(0, 7)));

  function monthly(rows, filter = () => true, val = (r) => r.amount, field = "date") {
    const out = MONTHS.map(() => 0);
    for (const r of rows) {
      if (!filter(r)) continue;
      const i = MONTH_INDEX.get(String(r[field]).slice(0, 7));
      if (i != null) out[i] += Number(val(r)) || 0;
    }
    return out;
  }

  function metrics(keys) {
    const leads = inK(D.leads, keys);
    const sales = inK(D.sales, keys);
    const exps = inK(D.expenses, keys);
    const pays = inK(D.payments, keys);
    const revenue = sum(sales);
    const expenses = sum(exps);
    const cogs = sum(exps.filter((e) => COGS.has(e.category)));
    const won = leads.filter((l) => l.stage === "Won");
    const lost = leads.filter((l) => l.stage === "Lost");
    const recv = pays.filter((p) => p.direction === "In" && p.status !== "Completed");
    return {
      leads, sales, exps, pays, revenue, expenses, cogs,
      opex: expenses - cogs,
      gross: revenue - cogs,
      net: revenue - expenses,
      won, lost,
      conv: leads.length ? won.length / leads.length : NaN,
      winRate: won.length + lost.length ? won.length / (won.length + lost.length) : NaN,
      cashIn: sum(pays.filter((p) => p.direction === "In" && p.status === "Completed")),
      cashOut: sum(pays.filter((p) => p.direction === "Out" && p.status === "Completed")),
      receivables: sum(recv),
      recvCount: recv.length,
    };
  }

  /* ---------- small components ---------- */
  function deltaChip(cur, prev, { upGood = true, pts = false } = {}) {
    if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) return null;
    let change, text;
    if (pts) {
      change = cur - prev;
      text = `${(Math.abs(change) * 100).toFixed(1)} pts`;
    } else {
      if (prev === 0) return null;
      change = (cur - prev) / Math.abs(prev);
      text = pct(Math.abs(change));
    }
    if (Math.abs(change) < 0.0005) return h("span", { class: "delta flat" }, "No change");
    const up = change > 0;
    return h("span", { class: `delta ${up === upGood ? "good" : "bad"}` },
      icon(up ? "arrowUp" : "arrowDown"),
      h("span", { class: "sr-only" }, up ? "up " : "down "),
      text);
  }
  function compare(cur, prev, opts) {
    if (!SEL.prev || prev == null) return null;
    const chip = deltaChip(cur, prev, opts);
    return chip ? [chip, h("span", {}, `vs ${SEL.prev.label}`)] : null;
  }

  const STATUS = {
    Paid: "good", Completed: "good", Settled: "good", Won: "good", "Fully recovered": "good",
    Pending: "warning", "Partially paid": "warning", "Awaiting payment": "warning", "Partially recovered": "warning", "Under review": "warning",
    Unpaid: "serious", Overdue: "critical", Lost: "neutral", Open: "neutral",
  };
  const STATUS_ICON = { good: "check", warning: "clock", serious: "alertTri", critical: "alertCircle", neutral: "circle" };
  function badge(text) {
    const tone = STATUS[text] || "neutral";
    return h("span", { class: `badge ${tone}` }, icon(text === "Lost" ? "xCircle" : STATUS_ICON[tone]), text || "—");
  }

  const STAGES = ["New inquiry", "Site measured", "Design & quote", "Negotiation", "Won", "Lost"];
  const OPEN_STAGES = STAGES.slice(0, 4);
  function stageCell(stage) {
    if (stage === "Won" || stage === "Lost") return badge(stage);
    const i = OPEN_STAGES.indexOf(stage);
    return h("span", { class: "stage" },
      h("span", { class: "stage-dots", "aria-hidden": "true" }, OPEN_STAGES.map((_, j) => h("i", { class: j <= i ? "on" : null }))),
      stage);
  }
  const dirCell = (d) => h("span", { class: `dir ${d === "In" ? "in" : "out"}` }, h("i", {}, icon(d === "In" ? "arrowIn" : "arrowOut")), d === "In" ? "In" : "Out");
  const meterCell = (p) => h("span", { class: "meter-cell" }, h("span", { class: "meter sm", "aria-hidden": "true" }, h("span", { style: `--p:${Math.max(0, Math.min(1, p || 0)).toFixed(4)}` })), pct(p));
  const twoLine = (a, b) => [h("span", { class: "strong" }, a), h("span", { class: "sub" }, b)];

  function emptyState(title = "Nothing in this period", text = "Choose a wider period, or add records in the Data sheet.") {
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
  // left margin that fits the widest tick label
  const tickRoom = (ticks, fmt) => Math.max(34, Math.max(...ticks.map((t) => fmt(t).length)) * 6.4 + 12);

  function colPath(x, yTop, w, yBase) {
    const hgt = yBase - yTop;
    if (hgt <= 0.5) return "";
    const r = Math.min(4, w / 2, hgt);
    return `M${x},${yBase}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${yBase}Z`;
  }

  function axes(svg, { m, W, ph, ticks, y, fmtTick, selected, step }) {
    for (const t of ticks) {
      const yy = Math.round(y(t)) + 0.5;
      svg.append(s("line", { class: t === 0 ? "axis-line" : "grid-line", x1: m.l, x2: W - m.r, y1: yy, y2: yy }));
      svg.append(s("text", { class: "tick", x: m.l - 8, y: yy + 4, "text-anchor": "end" }, fmtTick(t)));
    }
    const partial = selected.size < N;
    const every = Math.max(1, Math.ceil(30 / step));
    MONTHS.forEach((mo, i) => {
      if (i % every && !(partial && selected.has(i))) return;
      svg.append(s("text", {
        class: "x-label" + (partial && selected.has(i) ? " sel" : ""),
        x: m.l + step * (i + 0.5), y: m.t + ph + 20, "text-anchor": "middle",
      }, mo.short));
    });
  }

  const noData = (series) => series.every((se) => se.values.every((v) => !v));
  const chartEmpty = (el) => el.replaceChildren(emptyState("No data yet", "Add records in the Data sheet and this chart fills in."));

  function drawLine(el, { series, selected, fmt, fmtTick, extraRows, label }) {
    if (noData(series)) { chartEmpty(el); return; }
    const W = Math.max(el.clientWidth - 18, 260), H = 272;
    const narrow = W < 520;
    const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((se) => se.values)));
    const endRoom = Math.max(...series.map((se) => fmtTick(se.values[N - 1]).length)) * 6.8 + 16;
    const m = { t: 16, r: narrow ? 12 : endRoom, b: 30, l: tickRoom(ticks, fmtTick) };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / N;
    const x = (i) => m.l + step * (i + 0.5);
    const y = (v) => m.t + ph - (v / top) * ph;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": label });

    const sel = [...selected].sort((a, b) => a - b);
    if (sel.length < N) svg.append(s("rect", { class: "band", x: m.l + step * sel[0], y: m.t, width: step * sel.length, height: ph, rx: 8 }));
    axes(svg, { m, W, ph, ticks, y, fmtTick, selected, step });

    const pts = (vals) => vals.map((v, i) => [x(i), y(v)]);
    const d = (p) => p.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("");
    const first = pts(series[0].values);
    svg.append(s("path", { class: `area k-${series[0].key}`, d: `${d(first)}L${x(N - 1)},${y(0)}L${x(0)},${y(0)}Z` }));
    series.forEach((se) => svg.append(s("path", { class: `line k-${se.key}`, d: d(pts(se.values)) })));

    const ends = series.map((se) => ({ se, v: se.values[N - 1], y: y(se.values[N - 1]) }));
    const collide = ends.some((a, i) => ends.some((b, j) => j > i && Math.abs(a.y - b.y) < 16));
    for (const e of ends) {
      svg.append(s("circle", { class: `dot k-${e.se.key}`, cx: x(N - 1), cy: e.y, r: 4 }));
      if (!narrow && !collide) svg.append(s("text", { class: "end-label", x: x(N - 1) + 10, y: e.y + 4 }, fmtTick(e.v)));
    }

    const cross = s("line", { class: "crosshair", y1: m.t, y2: m.t + ph, visibility: "hidden" });
    const hover = series.map((se) => s("circle", { class: `dot k-${se.key}`, r: 4.5, visibility: "hidden" }));
    const overlay = s("rect", { class: "plot-overlay", x: m.l, y: m.t, width: pw, height: ph, tabindex: 0, "aria-label": `${label}. Use arrow keys to read each month.` });
    svg.append(cross, ...hover, overlay);

    let cur = -1;
    function show(i, cx, cy) {
      cur = i;
      const X = x(i);
      cross.setAttribute("x1", X); cross.setAttribute("x2", X); cross.setAttribute("visibility", "visible");
      hover.forEach((c, j) => { c.setAttribute("cx", X); c.setAttribute("cy", y(series[j].values[i])); c.setAttribute("visibility", "visible"); });
      const rows = series.map((se) => ({ key: se.key, value: fmt(se.values[i]), label: se.name }));
      if (extraRows) rows.push(...extraRows(i));
      if (cx == null) {
        const r = svg.getBoundingClientRect(), k = r.width / W;
        cx = r.left + X * k;
        cy = r.top + y(Math.max(...series.map((se) => se.values[i]))) * k;
      }
      showTip(cx, cy, MONTHS[i].long, rows);
    }
    function hide() {
      cur = -1;
      cross.setAttribute("visibility", "hidden");
      hover.forEach((c) => c.setAttribute("visibility", "hidden"));
      hideTip();
    }
    const fromPointer = (e) => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      show(Math.max(0, Math.min(N - 1, Math.floor((px - m.l) / step))), e.clientX, e.clientY);
    };
    overlay.addEventListener("pointermove", fromPointer);
    overlay.addEventListener("pointerdown", fromPointer);
    overlay.addEventListener("pointerleave", hide);
    overlay.addEventListener("focus", () => show(sel[sel.length - 1]));
    overlay.addEventListener("blur", hide);
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        show(Math.max(0, Math.min(N - 1, (cur < 0 ? N - 1 : cur) + (e.key === "ArrowRight" ? 1 : -1))));
      } else if (e.key === "Escape") hide();
    });
    el.replaceChildren(svg);
  }

  function drawColumns(el, { series, selected, fmt, fmtTick, integer = false, extraRows, label }) {
    if (noData(series)) { chartEmpty(el); return; }
    const W = Math.max(el.clientWidth - 18, 260), H = 252;
    const maxV = Math.max(0, ...series.flatMap((se) => se.values));
    const { top, ticks } = niceScale(maxV, 4, integer);
    const m = { t: 22, r: 10, b: 30, l: tickRoom(ticks, fmtTick) };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / N;
    const k = series.length, gap = 2;
    const colW = Math.max(3, Math.min(24, (step * 0.62 - gap * (k - 1)) / k));
    const groupW = colW * k + gap * (k - 1);
    const y = (v) => m.t + ph - (v / top) * ph;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": label });
    axes(svg, { m, W, ph, ticks, y, fmtTick, selected, step });

    const partial = selected.size < N;
    let peak = -1;
    if (k === 1) peak = series[0].values.indexOf(Math.max(...series[0].values));

    MONTHS.forEach((mo, i) => {
      const cx = m.l + step * (i + 0.5);
      const rows = () => {
        const r = series.map((se) => ({ key: se.key, value: fmt(se.values[i]), label: se.name }));
        if (extraRows) r.push(...extraRows(i));
        return r;
      };
      const hit = s("rect", {
        class: "hit", x: m.l + step * i + 1, y: m.t - 6, width: Math.max(0, step - 2), height: ph + 6, rx: 6, tabindex: 0,
        "aria-label": `${mo.long}: ${series.map((se) => `${se.name} ${fmt(se.values[i])}`).join(", ")}`,
      });
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, mo.long, rows()));
      hit.addEventListener("pointerdown", (e) => showTip(e.clientX, e.clientY, mo.long, rows()));
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("focus", () => { hit.classList.add("focus"); tipAt(hit, mo.long, rows()); });
      hit.addEventListener("blur", () => { hit.classList.remove("focus"); hideTip(); });
      svg.append(hit);
      series.forEach((se, j) => {
        const x0 = cx - groupW / 2 + j * (colW + gap);
        const dim = partial && !selected.has(i);
        svg.append(s("path", { class: `col k-${se.key}${dim ? " dim" : ""}`, d: colPath(x0, y(se.values[i]), colW, y(0)) }));
      });
      if (i === peak && series[0].values[i] > 0) {
        svg.append(s("text", { class: "peak-label", x: cx, y: y(series[0].values[i]) - 7, "text-anchor": "middle" }, fmtTick(series[0].values[i])));
      }
    });
    el.replaceChildren(svg);
  }

  function drawSpark(el, values, selected) {
    const W = Math.max(el.clientWidth, 200), H = 56;
    const step = W / N, colW = Math.min(26, step * 0.58);
    const top = Math.max(...values) || 1;
    const partial = selected.size < N;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Monthly revenue" });
    values.forEach((v, i) => {
      const x0 = step * i + (step - colW) / 2;
      const on = !partial || selected.has(i);
      const hit = s("rect", { class: "hit", x: step * i, y: 0, width: step, height: H, rx: 6 });
      const rows = [{ key: "in", value: money(v), label: "Revenue" }];
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, MONTHS[i].long, rows));
      hit.addEventListener("pointerleave", hideTip);
      svg.append(hit, s("path", { class: `col ${on ? "k-in" : "k-muted"}`, d: colPath(x0, H - 2 - (v / top) * (H - 8), colW, H - 2) }));
    });
    svg.append(s("line", { class: "axis-line", x1: 0, x2: W, y1: H - 1.5, y2: H - 1.5 }));
    el.replaceChildren(svg);
  }

  function drawHBars(el, items, { key = "in", fmt = money, tipFmt = money, share = true, unit = "" } = {}) {
    if (!items.length || items.every((i) => !i.value)) { el.replaceChildren(emptyState()); return; }
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

  function simpleTable({ head, rows, num: numCols = [] }) {
    const cls = (i) => (numCols.includes(i) ? "num" : null);
    return h("div", { class: "table-wrap", style: "border-top:0" },
      h("table", { class: "dt" },
        h("thead", {}, h("tr", {}, head.map((c, i) => h("th", { class: cls(i), scope: "col" }, c)))),
        h("tbody", {}, rows.length
          ? rows.map((r) => h("tr", {}, r.map((c, i) => h("td", { class: cls(i) }, c))))
          : h("tr", {}, h("td", { colspan: head.length }, emptyState())))));
  }

  // chart registry: each card[data-chart] has a draw + table twin
  const CHARTS = {};
  const chart = (id, def) => { CHARTS[id] = def; };
  function drawChart(id) {
    const card = $(`[data-chart="${id}"]`), def = CHARTS[id];
    if (!card || !def) return;
    const view = card.dataset.view || "chart";
    const body = $(".chart-body", card), tbl = $(".chart-table", card), legend = $(".legend", card);
    body.hidden = view !== "chart";
    tbl.hidden = view !== "table";
    if (legend) legend.hidden = view !== "chart";
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
      const input = h("input", { class: "input", type: "search", placeholder: cfg.placeholder || "Search", "aria-label": cfg.placeholder || "Search" });
      input.addEventListener("input", () => { this.q = input.value.trim().toLowerCase(); this.page = 0; this.draw(); });
      bar.append(h("div", { class: "dt-search" }, icon("search"), input));
      for (const f of cfg.filters || []) {
        const sel = h("select", { class: "select", "aria-label": f.label },
          h("option", { value: "" }, `All ${f.plural || f.label.toLowerCase() + "s"}`),
          f.options.map((o) => h("option", { value: o }, o)));
        sel.addEventListener("change", () => { this.filters[f.key] = sel.value; this.page = 0; this.draw(); });
        bar.append(sel);
      }
      bar.append(h("span", { class: "dt-spacer" }));
      const csv = h("button", { class: "btn btn-sm", type: "button", title: "Download the filtered rows as CSV" }, icon("download"), "CSV");
      csv.addEventListener("click", () => this.csv());
      bar.append(csv);
      this.wrap = h("div", { class: "table-wrap" });
      this.foot = h("div", { class: "dt-foot" });
      this.root.replaceChildren(bar, this.wrap, this.foot);
    }
    setRows(rows) { this.rows = rows; this.page = 0; this.draw(); }
    filtered() {
      let r = this.rows;
      if (this.cfg.tabs && this.tab !== "All") r = r.filter((x) => x[this.cfg.tabs.key] === this.tab);
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
        : h("tr", {}, h("td", { colspan: cols.length }, emptyState("No matching records", "Try a different search, filter or period."))));
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
      download(`${this.cfg.name}-${SEL.short.replace(/\s+/g, "-").toLowerCase()}.csv`, "﻿" + lines.join("\n"), "text/csv;charset=utf-8");
    }
  }

  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  const uniq = (arr, key) => [...new Set(arr.map((x) => x[key]).filter((v) => v !== "" && v != null))].sort();
  const totalSummary = (label = "Total") => (rows) => [`${label} `, h("strong", {}, money(sum(rows)))];

  let TABLES = {};
  function buildTables() {
    TABLES = {
      leads: new DataTable($("#leads-table"), {
        name: "leads", placeholder: "Search contact, customer or ID",
        search: ["id", "contact", "company", "owner", "source"],
        filters: [
          { key: "stage", label: "Stage", options: STAGES },
          { key: "source", label: "Source", options: uniq(D.leads, "source") },
          { key: "owner", label: "Sales rep", plural: "sales reps", options: uniq(D.leads, "owner") },
        ],
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "id", label: "ID", cls: "id" },
          { key: "contact", label: "Contact", cell: (r) => twoLine(r.contact, r.company) },
          { key: "source", label: "Source" },
          { key: "stage", label: "Stage", cell: (r) => stageCell(r.stage), sortVal: (r) => STAGES.indexOf(r.stage) },
          { key: "owner", label: "Sales rep" },
          { key: "value", label: "Est. value", num: true, cell: (r) => money(r.value) },
        ],
        summary: (rows) => ["Total est. value ", h("strong", {}, money(sum(rows, (r) => r.value)))],
      }),
      sales: new DataTable($("#sales-table"), {
        name: "sales-invoices", placeholder: "Search invoice, customer or product",
        search: ["id", "customer", "category"],
        filters: [
          { key: "category", label: "Product", options: uniq(D.sales, "category") },
          { key: "status", label: "Status", plural: "statuses", options: ["Paid", "Partially paid", "Unpaid"] },
        ],
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "id", label: "Invoice", cls: "id" },
          { key: "customer", label: "Customer", cls: "strong" },
          { key: "category", label: "Product" },
          { key: "status", label: "Status", cell: (r) => badge(r.status) },
          { key: "amount", label: "Amount", num: true, cell: (r) => money(r.amount) },
        ],
        summary: totalSummary("Total invoiced"),
      }),
      expenses: new DataTable($("#expense-table"), {
        name: "expenses", placeholder: "Search vendor, description or ID",
        search: ["id", "vendor", "description", "category"],
        filters: [{ key: "category", label: "Category", plural: "categories", options: uniq(D.expenses, "category") }],
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "id", label: "ID", cls: "id" },
          { key: "category", label: "Category", cls: "strong" },
          { key: "description", label: "Description" },
          { key: "vendor", label: "Vendor / payee" },
          { key: "amount", label: "Amount", num: true, cell: (r) => money(r.amount) },
        ],
        summary: totalSummary("Total spend"),
      }),
      advances: new DataTable($("#advance-table"), {
        name: "advances", placeholder: "Search party or reference",
        search: ["id", "party", "reference"],
        tabs: { key: "type", label: "Advance type", options: [{ value: "All", label: "All" }, { value: "Received", label: "Customer deposits" }, { value: "Paid", label: "Paid to suppliers" }] },
        sort: { key: "date", dir: -1 },
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "id", label: "ID", cls: "id" },
          { key: "type", label: "Type", cell: (r) => dirCell(r.type === "Received" ? "In" : "Out"), csv: (r) => r.type },
          { key: "party", label: "Party / reference", cell: (r) => twoLine(r.party, r.reference) },
          { key: "contractValue", label: "Contract value", num: true, cell: (r) => money(r.contractValue) },
          { key: "amount", label: "Advance", num: true, cell: (r) => [h("span", { class: "strong" }, money(r.amount)), h("span", { class: "sub" }, `${pct(r.share)} of contract`)] },
          { key: "recPct", label: "Recovered", cell: (r) => meterCell(r.recPct) },
          { key: "balance", label: "Balance", num: true, cell: (r) => money(r.balance) },
          { key: "status", label: "Status", cell: (r) => badge(r.status) },
        ],
        summary: (rows) => ["Advances ", h("strong", {}, money(sum(rows))), " · unrecovered ", h("strong", {}, money(sum(rows, (r) => r.balance)))],
      }),
      payments: new DataTable($("#payment-table"), {
        name: "payments", placeholder: "Search party, reference or ID",
        search: ["id", "party", "reference", "type", "method"],
        tabs: { key: "direction", label: "Direction", options: [{ value: "All", label: "All" }, { value: "In", label: "Money in" }, { value: "Out", label: "Money out" }] },
        filters: [
          { key: "status", label: "Status", plural: "statuses", options: ["Completed", "Pending", "Overdue"] },
          { key: "type", label: "Type", options: uniq(D.payments, "type") },
          { key: "method", label: "Method", options: uniq(D.payments, "method").filter((x) => x !== "—") },
        ],
        sort: { key: "date", dir: -1 },
        pageSize: 10,
        columns: [
          { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
          { key: "id", label: "ID", cls: "id" },
          { key: "direction", label: "Direction", cell: (r) => dirCell(r.direction) },
          { key: "party", label: "Party / type", cell: (r) => twoLine(r.party, r.type) },
          { key: "reference", label: "Reference", cls: "id" },
          { key: "method", label: "Method" },
          { key: "status", label: "Status", cell: (r) => badge(r.status) },
          { key: "amount", label: "Amount", num: true, cell: (r) => money(r.amount) },
        ],
        summary: (rows) => {
          const i = sum(rows.filter((r) => r.direction === "In")), o = sum(rows.filter((r) => r.direction === "Out"));
          return ["In ", h("strong", {}, money(i)), " · Out ", h("strong", {}, money(o))];
        },
      }),
    };
  }

  /* ---------- report sections ---------- */
  const V = {}; // view-model shared with chart draw functions

  function renderOverview() {
    const M = metrics(SEL.keys);
    const P = SEL.prev ? metrics(SEL.prev.keys) : null;
    V.M = M;
    V.P = P;

    const spark = h("div", { class: "hero-spark-bars" });
    $("#hero").replaceChildren(
      h("div", { class: "hero-top" },
        h("span", { class: "hero-label" }, "Revenue ", h("span", {}, `· ${SEL.short}`)),
        h("span", { class: "tile-foot" }, compare(M.revenue, P && P.revenue))),
      h("div", { class: "hero-value", title: money(M.revenue) }, moneyC(M.revenue)),
      h("div", { class: "hero-sub" }, `${money(M.revenue)} from ${num(M.sales.length)} invoices · ${SEL.range}`),
      h("div", { class: "hero-spark" }, spark,
        h("div", { class: "hero-spark-caption" }, h("span", {}, MONTHS[0].short), h("span", {}, "Monthly revenue"), h("span", {}, MONTHS[N - 1].short))));
    V.spark = spark;
    drawSpark(spark, SERIES.sales, SEL.set);

    const tile = (label, value, foot, title) => h("article", { class: "card tile" },
      h("span", { class: "tile-label" }, label),
      h("span", { class: "tile-value", title }, value),
      h("span", { class: "tile-foot" }, foot));
    $("#kpi-tiles").replaceChildren(
      tile("New leads", num(M.leads.length), compare(M.leads.length, P && P.leads.length) || `${num(M.won.length)} won`),
      tile("Conversion rate", pct(M.conv), compare(M.conv, P && P.conv, { pts: true }) || `${num(M.won.length)} of ${num(M.leads.length)} leads won`),
      tile("Expenses", moneyC(M.expenses), compare(M.expenses, P && P.expenses, { upGood: false }) || `${pct(M.expenses / M.revenue)} of revenue`, money(M.expenses)),
      tile("Net profit", moneyC(M.net), compare(M.net, P && P.net) || `${pct(M.net / M.revenue)} margin`, money(M.net)),
      tile("Cash collected", moneyC(M.cashIn), compare(M.cashIn, P && P.cashIn) || "Completed payments in", money(M.cashIn)),
      tile("Receivables due", moneyC(M.receivables), `${num(M.recvCount)} payments pending or overdue`, money(M.receivables)));

    const margin = M.revenue ? M.net / M.revenue : 0;
    const row = (lbl, v, cls, p) => h("div", { class: `pnl-row ${cls || ""}` }, h("span", { class: "lbl" }, lbl), h("span", { class: "v" }, v, p != null ? h("span", { class: "pct" }, pct(p)) : null));
    $("#pnl").replaceChildren(
      h("h3", {}, "Profit & loss"),
      h("p", { class: "card-sub" }, SEL.range),
      h("div", { class: "pnl-rows" },
        row("Revenue", money(M.revenue)),
        row("Materials (cost of goods)", minus(M.cogs)),
        row("Gross profit", money(M.gross), "sub", M.revenue ? M.gross / M.revenue : null),
        row("Workshop & overheads", minus(M.opex)),
        row("Net profit", M.net < 0 ? "−" + money(-M.net) : money(M.net), "net")),
      h("div", { class: "pnl-meter" },
        h("div", { class: "pnl-meter-cap" }, h("span", {}, "Net margin"), h("strong", {}, pct(margin))),
        h("div", { class: "meter", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(margin * 100), "aria-label": "Net margin" },
          h("span", { style: `--p:${Math.max(0, Math.min(1, margin)).toFixed(4)}` }))));
  }

  function renderLeads() {
    const { M, P } = V;
    const open = M.leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const wonValue = sum(M.won, (l) => l.value);
    statStrip($("#leads-stats"), [
      { label: "Leads captured", value: num(M.leads.length), foot: compare(M.leads.length, P && P.leads.length) || SEL.range },
      { label: "Won", value: num(M.won.length), foot: `${money(wonValue)} in value` },
      { label: "Win rate", value: pct(M.winRate), foot: compare(M.winRate, P && P.winRate, { pts: true }) || "Won ÷ (won + lost)" },
      { label: "Open pipeline", value: moneyC(sum(open, (l) => l.value)), title: money(sum(open, (l) => l.value)), foot: `${num(open.length)} open leads` },
      { label: "Avg. won deal", value: M.won.length ? moneyC(wonValue / M.won.length) : "—", foot: "Estimated value" },
    ]);

    V.stages = STAGES.map((st) => {
      const rows = M.leads.filter((l) => l.stage === st);
      return { label: st, value: rows.length, muted: st === "Lost", extra: [{ value: money(sum(rows, (l) => l.value)), label: "est. value" }] };
    });
    V.sources = [...groupSum(M.leads, (l) => l.source, () => 1)].map(([label, value]) => {
      const won = M.leads.filter((l) => (l.source || "(blank)") === label && l.stage === "Won").length;
      return { label, value, extra: [{ value: num(won), label: `won (${pct(won / value)})` }] };
    }).sort((a, b) => b.value - a.value);
    V.reps = [...groupSum(M.won, (l) => l.owner, (l) => l.value)].map(([label, value]) => ({
      label, value, extra: [{ value: num(M.won.filter((l) => (l.owner || "(blank)") === label).length), label: "deals won" }],
    })).sort((a, b) => b.value - a.value);

    TABLES.leads.setRows(M.leads);
  }

  function renderSales() {
    const { M, P } = V;
    const ids = new Set(M.sales.map((x) => x.id));
    const outstanding = sum(D.payments.filter((p) => p.type === "Invoice" && p.status !== "Completed" && ids.has(p.reference)));
    const paidFull = M.sales.filter((x) => x.status === "Paid").length;
    statStrip($("#sales-stats"), [
      { label: "Revenue", value: moneyC(M.revenue), title: money(M.revenue), foot: compare(M.revenue, P && P.revenue) || SEL.range },
      { label: "Invoices raised", value: num(M.sales.length), foot: compare(M.sales.length, P && P.sales.length) || "Sales invoices" },
      { label: "Average invoice", value: M.sales.length ? moneyC(M.revenue / M.sales.length) : "—", foot: "Revenue ÷ invoices" },
      { label: "Paid in full", value: M.sales.length ? pct(paidFull / M.sales.length) : "—", foot: `${num(paidFull)} of ${num(M.sales.length)} invoices` },
      { label: "Still to collect", value: moneyC(outstanding), title: money(outstanding), foot: "On this period's invoices" },
    ]);
    V.categories = [...groupSum(M.sales, (x) => x.category)].map(([label, value]) => ({
      label, value, extra: [{ value: num(M.sales.filter((x) => (x.category || "(blank)") === label).length), label: "invoices" }],
    })).sort((a, b) => b.value - a.value);
    V.customers = [...groupSum(M.sales, (x) => x.customer)].map(([label, value]) => ({
      label, value, extra: [{ value: num(M.sales.filter((x) => (x.customer || "(blank)") === label).length), label: "invoices" }],
    })).sort((a, b) => b.value - a.value).slice(0, 7);
    TABLES.sales.setRows(M.sales);
  }

  function renderExpenses() {
    const { M, P } = V;
    const cats = [...groupSum(M.exps, (e) => e.category)].map(([label, value]) => ({
      label, value, extra: [{ value: pct(value / (M.revenue || 1)), label: "of revenue" }, COGS.has(label) ? { value: "Materials", label: "cost of goods" } : null].filter(Boolean),
    })).sort((a, b) => b.value - a.value);
    V.expenseCats = cats;
    const monthsInSel = SEL.idx.length;
    statStrip($("#expense-stats"), [
      { label: "Total expenses", value: moneyC(M.expenses), title: money(M.expenses), foot: compare(M.expenses, P && P.expenses, { upGood: false }) || SEL.range },
      { label: "Largest category", value: cats[0] ? cats[0].label : "—", title: cats[0] ? cats[0].label : null, foot: cats[0] ? `${money(cats[0].value)} · ${pct(cats[0].value / M.expenses)}` : "" },
      { label: "Materials share", value: M.revenue ? pct(M.cogs / M.revenue) : "—", foot: "Materials ÷ revenue" },
      { label: "Avg. per month", value: moneyC(M.expenses / monthsInSel), title: money(M.expenses / monthsInSel), foot: `${monthsInSel} month${monthsInSel > 1 ? "s" : ""}` },
      { label: "Expenses ÷ revenue", value: M.revenue ? pct(M.expenses / M.revenue) : "—", foot: "Lower is better" },
    ]);
    TABLES.expenses.setRows(M.exps);
  }

  function advanceRows(keys) {
    return inK(D.advances, keys).map((a) => {
      const amount = Number(a.amount) || 0, recovered = Number(a.recovered) || 0;
      const balance = Math.max(0, amount - recovered);
      return {
        ...a,
        balance,
        share: Number(a.contractValue) ? amount / a.contractValue : NaN,
        recPct: amount ? recovered / amount : 0,
        status: amount && balance <= 0 ? "Fully recovered" : recovered > 0 ? "Partially recovered" : "Open",
      };
    });
  }

  function renderAdvances() {
    const rows = advanceRows(SEL.keys);
    const rec = rows.filter((a) => a.type === "Received"), paid = rows.filter((a) => a.type === "Paid");
    statStrip($("#advance-stats"), [
      { label: "Customer deposits", value: moneyC(sum(rec)), title: money(sum(rec)), foot: `${num(rec.length)} deposit${rec.length === 1 ? "" : "s"} received` },
      { label: "Deposits not yet delivered", value: moneyC(sum(rec, (a) => a.balance)), title: money(sum(rec, (a) => a.balance)), foot: "Still to offset against work" },
      { label: "Paid to suppliers", value: moneyC(sum(paid)), title: money(sum(paid)), foot: `${num(paid.length)} purchase order${paid.length === 1 ? "" : "s"}` },
      { label: "Supplier advances open", value: moneyC(sum(paid, (a) => a.balance)), title: money(sum(paid, (a) => a.balance)), foot: "Goods not yet received" },
    ]);
    TABLES.advances.setRows(rows);
  }

  function fsCalc(f) {
    const n = (k) => Number(f[k]) || 0;
    const final = n("contractValue") + n("variations");
    const balance = final - n("advance") - n("interimPaid") - n("penalties");
    const outstanding = Math.max(0, balance - n("amountPaid"));
    const collected = n("advance") + n("interimPaid") + n("amountPaid");
    const due = final - n("penalties");
    return { final, balance, outstanding, collected, due, pctCollected: due ? collected / due : 0 };
  }

  function renderSettlement() {
    const list = inK(D.settlements, SEL.keys, "settlementDate").sort((a, b) => String(b.settlementDate).localeCompare(String(a.settlementDate)));
    const calcs = list.map(fsCalc);
    const settled = list.filter((f) => f.status === "Settled").length;
    statStrip($("#settlement-stats"), [
      { label: "Projects closed", value: num(list.length), foot: `${num(settled)} fully settled` },
      { label: "Final contract value", value: moneyC(sum(calcs, (c) => c.final)), title: money(sum(calcs, (c) => c.final)), foot: "Incl. extra work" },
      { label: "Collected to date", value: moneyC(sum(calcs, (c) => c.collected)), title: money(sum(calcs, (c) => c.collected)), foot: "Deposit + interim + final" },
      { label: "Outstanding", value: moneyC(sum(calcs, (c) => c.outstanding)), title: money(sum(calcs, (c) => c.outstanding)), foot: "Balance still to receive" },
    ]);

    const listEl = $("#fs-list"), doc = $("#statement");
    if (!list.length) {
      listEl.replaceChildren();
      doc.replaceChildren(emptyState("No final settlements in this period", "Pick a later quarter or the full period, or add projects in the Data sheet."));
      return;
    }
    if (!list.some((f) => f.id === state.fs)) state.fs = list[0].id;

    const items = list.map((f, i) => {
      const c = calcs[i];
      const b = h("button", { class: "fs-item", type: "button", role: "option", "aria-selected": String(f.id === state.fs), "data-id": f.id, tabindex: f.id === state.fs ? 0 : -1 },
        h("span", { class: "fs-item-top" },
          h("span", {}, h("span", { class: "fs-item-name" }, f.project), h("br"), h("span", { class: "fs-item-client" }, f.client)),
          badge(f.status)),
        h("span", { class: "meter", "aria-hidden": "true" }, h("span", { style: `--p:${Math.max(0, Math.min(1, c.pctCollected)).toFixed(4)}` })),
        h("span", { class: "fs-item-amt" }, h("span", {}, `Final ${moneyC(c.final)}`), h("span", {}, c.outstanding > 0 ? `Due ${moneyC(c.outstanding)}` : "Nothing due")));
      b.addEventListener("click", () => { state.fs = f.id; renderSettlement(); $(`.fs-item[data-id="${CSS.escape(f.id)}"]`).focus(); });
      b.addEventListener("keydown", (e) => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const nx = list[Math.max(0, Math.min(list.length - 1, i + d))];
        state.fs = nx.id; renderSettlement(); $(`.fs-item[data-id="${CSS.escape(nx.id)}"]`).focus();
      });
      return b;
    });
    listEl.replaceChildren(...items);

    const f = list.find((x) => x.id === state.fs);
    const c = fsCalc(f);
    const line = (lbl, v, cls, note) => h("div", { class: `st-row ${cls || ""}` },
      h("span", { class: "lbl" }, lbl, note ? h("small", {}, note) : null), h("span", { class: "v" }, v));
    const printBtn = h("button", { class: "btn btn-sm", type: "button" }, icon("printer"), "Print statement");
    printBtn.addEventListener("click", () => { document.body.classList.add("print-statement"); window.print(); });
    const pdfBtn = h("button", { class: "btn btn-sm", type: "button" }, icon("download"), "PDF");
    pdfBtn.addEventListener("click", () => withBusy(pdfBtn, () => exportStatementPdf(f)));

    doc.replaceChildren(
      h("div", { class: "st-head" },
        h("div", {},
          h("div", { class: "st-kicker" }, "Final settlement statement"),
          h("h3", { class: "st-title" }, f.project),
          h("p", { class: "st-company" }, `${C.name} → ${f.client}`)),
        h("div", { class: "st-no" }, h("span", { class: "id" }, f.id), badge(f.status), h("div", { class: "st-actions" }, pdfBtn, printBtn))),
      h("div", { class: "st-meta" },
        h("div", {}, h("span", {}, "Customer"), h("strong", {}, f.client)),
        h("div", {}, h("span", {}, "Order date"), h("strong", {}, fdate(f.startDate))),
        h("div", {}, h("span", {}, "Installed"), h("strong", {}, fdate(f.completionDate))),
        h("div", {}, h("span", {}, "Settlement date"), h("strong", {}, fdate(f.settlementDate)))),
      h("div", { class: "st-lines" },
        line("Original contract value", money(f.contractValue)),
        line("Add: design changes & extra work", money(f.variations), "less"),
        line("Final contract value", money(c.final), "total"),
        line("Less: customer deposit", minus(f.advance), "less", "Advance paid when the order was placed"),
        line("Less: interim payments received", minus(f.interimPaid), "less", "On delivery / during installation"),
        line("Less: delay penalties & discounts", minus(f.penalties), "less"),
        line("Balance due on final settlement", money(c.balance), "grand"),
        line("Paid against settlement", minus(f.amountPaid), "less outstanding"),
        line("Outstanding", money(c.outstanding), "outstanding")),
      h("div", { class: "st-progress" },
        h("div", { class: "st-progress-cap" },
          h("span", {}, "Collected ", h("strong", {}, money(c.collected)), ` of ${money(c.due)}`),
          h("strong", {}, pct(c.pctCollected))),
        h("div", { class: "meter", role: "meter", "aria-label": "Share collected", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(c.pctCollected * 100) },
          h("span", { style: `--p:${Math.max(0, Math.min(1, c.pctCollected)).toFixed(4)}` }))),
      h("div", { class: "st-sign" },
        h("div", {}, `Prepared by · ${C.preparedBy || ""}`),
        h("div", {}, "Approved by"),
        h("div", {}, `Customer acknowledgement · ${f.client}`)));
  }

  function renderPayments() {
    const { M } = V;
    const pend = M.pays.filter((p) => p.status === "Pending");
    const over = M.pays.filter((p) => p.status === "Overdue");
    const tile = (ic, cls, label, value, sub, title) => h("article", { class: "card status-tile" },
      h("span", { class: `top ${cls}` }, h("i", {}, icon(ic)), label),
      h("span", { class: "v", title }, value),
      h("span", { class: "s" }, sub));
    const inCount = M.pays.filter((p) => p.direction === "In" && p.status === "Completed").length;
    const outCount = M.pays.filter((p) => p.direction === "Out" && p.status === "Completed").length;
    $("#payment-tiles").replaceChildren(
      tile("arrowIn", "ic-in", "Money in", moneyC(M.cashIn), `${num(inCount)} completed payments`, money(M.cashIn)),
      tile("arrowOut", "ic-out", "Money out", moneyC(M.cashOut), `${num(outCount)} completed payments`, money(M.cashOut)),
      tile("clock", "ic-warning", "Pending", moneyC(sum(pend)), `${num(pend.length)} not yet due`, money(sum(pend))),
      tile("alertCircle", "ic-critical", "Overdue", moneyC(sum(over)), `${num(over.length)} past due date`, money(sum(over))));
    TABLES.payments.setRows(M.pays);
  }

  /* ---------- chart definitions ---------- */
  const monthRows = (cols) => MONTHS.map((m, i) => [m.long, ...cols.map((f) => f(i))]);

  chart("trend", {
    draw: (el) => drawLine(el, {
      label: "Monthly sales and expenses",
      series: [{ name: "Sales", key: "in", values: SERIES.sales }, { name: "Expenses", key: "out", values: SERIES.expenses }],
      selected: SEL.set, fmt: money, fmtTick: moneyC,
      extraRows: (i) => [{ sep: true, value: money(SERIES.sales[i] - SERIES.expenses[i]), label: "Net profit" }],
    }),
    table: () => ({
      head: ["Month", "Sales", "Expenses", "Net profit", "Margin"], num: [1, 2, 3, 4],
      rows: monthRows([(i) => money(SERIES.sales[i]), (i) => money(SERIES.expenses[i]), (i) => money(SERIES.sales[i] - SERIES.expenses[i]), (i) => pct((SERIES.sales[i] - SERIES.expenses[i]) / SERIES.sales[i])]),
    }),
  });
  const barTable = (items, head, fmt) => ({ head: [head, "Value", "Share"], num: [1, 2], rows: items.map((it) => [it.label, fmt(it.value), pct(it.value / (sum(items, (x) => x.value) || 1))]) });
  chart("stages", { fluid: true, draw: (el) => drawHBars(el, V.stages, { fmt: num, tipFmt: num, unit: "leads" }), table: () => barTable(V.stages, "Stage", num) });
  chart("sources", { fluid: true, draw: (el) => drawHBars(el, V.sources, { fmt: num, tipFmt: num, unit: "leads" }), table: () => barTable(V.sources, "Source", num) });
  chart("reps", { fluid: true, draw: (el) => drawHBars(el, V.reps, { fmt: moneyC, unit: "won value" }), table: () => barTable(V.reps, "Sales rep", money) });
  chart("leadsMonthly", {
    draw: (el) => drawColumns(el, { label: "New leads per month", series: [{ name: "New leads", key: "in", values: SERIES.leads }], selected: SEL.set, fmt: num, fmtTick: num, integer: true }),
    table: () => ({ head: ["Month", "New leads"], num: [1], rows: monthRows([(i) => num(SERIES.leads[i])]) }),
  });
  chart("categories", { fluid: true, draw: (el) => drawHBars(el, V.categories, { fmt: moneyC, unit: "revenue" }), table: () => barTable(V.categories, "Product", money) });
  chart("customers", { fluid: true, draw: (el) => drawHBars(el, V.customers, { fmt: moneyC, unit: "invoiced", share: false }), table: () => barTable(V.customers, "Customer", money) });
  chart("expenseCats", { fluid: true, draw: (el) => drawHBars(el, V.expenseCats, { key: "out", fmt: moneyC, unit: "spent" }), table: () => barTable(V.expenseCats, "Category", money) });
  chart("expenseMonthly", {
    draw: (el) => drawColumns(el, { label: "Monthly spend", series: [{ name: "Expenses", key: "out", values: SERIES.expenses }], selected: SEL.set, fmt: money, fmtTick: moneyC }),
    table: () => ({ head: ["Month", "Expenses"], num: [1], rows: monthRows([(i) => money(SERIES.expenses[i])]) }),
  });
  chart("cashflow", {
    draw: (el) => drawColumns(el, {
      label: "Cash in and cash out per month",
      series: [{ name: "Cash in", key: "in", values: SERIES.cashIn }, { name: "Cash out", key: "out", values: SERIES.cashOut }],
      selected: SEL.set, fmt: money, fmtTick: moneyC,
      extraRows: (i) => [{ sep: true, value: money(SERIES.cashIn[i] - SERIES.cashOut[i]), label: "Net cash flow" }],
    }),
    table: () => ({
      head: ["Month", "Cash in", "Cash out", "Net cash flow"], num: [1, 2, 3],
      rows: monthRows([(i) => money(SERIES.cashIn[i]), (i) => money(SERIES.cashOut[i]), (i) => money(SERIES.cashIn[i] - SERIES.cashOut[i])]),
    }),
  });

  /* ---------- period filter ---------- */
  const seg = $("#period-seg");
  const monthSel = $("#month-select");
  function buildFilterUI() {
    seg.replaceChildren(...PRESETS.map((p) => {
      const b = h("button", { type: "button", "data-id": p.id, "aria-pressed": "false" }, p.label);
      b.addEventListener("click", () => { state.preset = p.id; state.month = null; render(); });
      return b;
    }));
    monthSel.replaceChildren(h("option", { value: "" }, "Single month…"), ...MONTHS.map((m, i) => h("option", { value: String(i) }, m.long)));
  }
  monthSel.addEventListener("change", () => { state.month = monthSel.value === "" ? null : Number(monthSel.value); render(); });

  function syncFilterUI() {
    $$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(state.month == null && b.dataset.id === state.preset)));
    monthSel.value = state.month == null ? "" : String(state.month);
    monthSel.classList.toggle("active", state.month != null);
    $("#filter-note").replaceChildren("Showing ", h("strong", {}, state.month == null ? `${SEL.short} (${SEL.range})` : SEL.short),
      SEL.prev ? ` · compared with ${SEL.prev.label}` : "");
    try {
      const url = new URL(location.href);
      const val = state.month != null ? MONTHS[state.month].key : state.preset;
      if (val === "all") url.searchParams.delete("period"); else url.searchParams.set("period", val);
      history.replaceState(null, "", url);
    } catch (e) { /* file:// or sandboxed */ }
  }

  function render() {
    SEL = selection();
    syncFilterUI();
    renderOverview();
    renderLeads();
    renderSales();
    renderExpenses();
    renderAdvances();
    renderSettlement();
    renderPayments();
    Object.keys(CHARTS).forEach(drawChart);
  }

  function applyCompanyText() {
    document.title = `Commercial Report · ${C.name || "Company"}`;
    $("#company-name").textContent = C.name || "Company";
    $("#foot-company").textContent = C.name || "Company";
    $("#eyebrow").textContent = C.name || "Commercial report";
    $("#prepared-by").textContent = C.preparedBy || "—";
    $("#as-of").textContent = fdate(isoRe.test(C.periodEnd || "") ? C.periodEnd : toISO(new Date()));
    $("#lede").textContent = `${C.tagline || "Commercial report"} — leads, sales, expenses, advances, final settlements and payments for ${rangeLabel(PRESETS[0].idx)}.`;
    $("#foot-period").textContent = `${rangeLabel(PRESETS[0].idx)} · amounts in ${CUR}`;
    $("#foot-note").textContent = D.sample
      ? "Figures include sample data. Open the Data sheet to enter or import your own records."
      : "Every number on this page is calculated from the Data sheet. Records are saved on the device they were entered on.";
  }

  function renderBanner() {
    const el = $("#data-banner");
    const openSheet = h("button", { class: "btn btn-sm", type: "button" }, icon("sheet"), "Open Data sheet");
    openSheet.addEventListener("click", () => setView("sheet"));
    const empty = DATASETS.every((k) => !D[k].length);
    let msg = null;
    if (empty) {
      msg = [h("strong", {}, "No records yet. "), "Open the Data sheet and add your leads, sales, expenses, advances and payments. The report fills in as you type."];
    } else if (LOCAL) {
      msg = [h("strong", {}, "Saved on this device. "), "Back up regularly with Export Excel in the Data sheet. To share with others, use Download data.js."];
    } else if (D.sample) {
      msg = [h("strong", {}, "Sample data. "), "These figures are examples. Enter or import your own records in the Data sheet and the whole report updates."];
    }
    el.className = "notice report-only";
    el.hidden = !msg;
    if (msg) el.replaceChildren(icon("info"), h("div", { class: "grow" }, msg), h("div", { class: "acts" }, openSheet));
  }

  function rebuildAll() {
    buildModel();
    applyCompanyText();
    buildFilterUI();
    buildTables();
    render();
    renderBanner();
    dirty = false;
  }

  /* ==========================================================================
     DATA SHEET — spreadsheet-style editor
     ========================================================================== */
  const col = (key, label, type = "text", w = 130, extra = {}) => ({ key, label, type, w, ...extra });
  const SHEETS = [
    { id: "leads", label: "Leads", prefix: "LD-", cols: [
      col("id", "ID", "text", 96), col("date", "Date", "date", 140), col("contact", "Contact person", "text", 150),
      col("company", "Customer / company", "text", 230, { suggest: true }), col("source", "Source", "text", 160, { suggest: true }),
      col("stage", "Stage", "select", 150, { options: STAGES }), col("value", "Est. value", "number", 130),
      col("owner", "Sales rep", "text", 120, { suggest: true }),
    ] },
    { id: "sales", label: "Sales", prefix: "INV-", cols: [
      col("id", "Invoice no.", "text", 110), col("date", "Date", "date", 140), col("customer", "Customer", "text", 200, { suggest: true }),
      col("category", "Product", "text", 190, { suggest: true }), col("amount", "Amount", "number", 140),
      col("status", "Status", "select", 140, { options: ["Paid", "Partially paid", "Unpaid"] }),
    ] },
    { id: "expenses", label: "Expenses", prefix: "EXP-", cols: [
      col("id", "ID", "text", 100), col("date", "Date", "date", 140), col("category", "Category", "text", 190, { suggest: true }),
      col("description", "Description", "text", 250), col("vendor", "Vendor / payee", "text", 190, { suggest: true }),
      col("amount", "Amount", "number", 130),
    ] },
    { id: "advances", label: "Advances", prefix: "ADV-", cols: [
      col("id", "ID", "text", 90), col("date", "Date", "date", 140),
      col("type", "Type", "select", 160, { options: ["Received", "Paid"], labels: { Received: "Received (deposit)", Paid: "Paid (to supplier)" } }),
      col("party", "Customer / supplier", "text", 190, { suggest: true }), col("reference", "Order / PO reference", "text", 250),
      col("contractValue", "Contract value", "number", 130), col("amount", "Advance", "number", 120),
      col("recovered", "Recovered", "number", 120), col("method", "Method", "text", 130, { suggest: true }),
    ] },
    { id: "settlements", label: "Final settlement", prefix: "FS-", aliases: ["settlement", "settlements", "finalsettlements"], cols: [
      col("id", "ID", "text", 84), col("project", "Project", "text", 230), col("client", "Customer", "text", 170, { suggest: true }),
      col("startDate", "Order date", "date", 140), col("completionDate", "Installed", "date", 140), col("settlementDate", "Settlement date", "date", 140),
      col("contractValue", "Contract value", "number", 130), col("variations", "Extra work", "number", 110),
      col("advance", "Deposit", "number", 120), col("interimPaid", "Interim paid", "number", 120),
      col("penalties", "Penalties / discounts", "number", 150), col("amountPaid", "Paid on settlement", "number", 150),
      col("status", "Status", "select", 160, { options: ["Settled", "Awaiting payment", "Under review"] }),
    ] },
    { id: "payments", label: "Payments", prefix: "PAY-", cols: [
      col("id", "ID", "text", 100), col("date", "Date", "date", 140), col("direction", "In / Out", "select", 90, { options: ["In", "Out"] }),
      col("party", "Party", "text", 190, { suggest: true }), col("type", "Type", "text", 160, { suggest: true }),
      col("reference", "Reference", "text", 130), col("method", "Method", "text", 130, { suggest: true }),
      col("amount", "Amount", "number", 130), col("status", "Status", "select", 120, { options: ["Completed", "Pending", "Overdue"] }),
    ] },
  ];
  const SETTINGS = [
    { key: "name", label: "Company name" },
    { key: "tagline", label: "Report subtitle" },
    { key: "currency", label: "Currency code", hint: "ISO code, e.g. ETB, USD, EUR" },
    { key: "preparedBy", label: "Prepared by" },
    { key: "periodStart", label: "Period start", type: "date", hint: "Leave empty for 1 January of this year" },
    { key: "periodEnd", label: "Period end", type: "date", hint: "Leave empty to always run up to today" },
    { key: "cogsCategories", label: "Materials categories (cost of goods)", hint: "Expense categories counted as materials in the profit & loss, separated by commas", wide: true },
  ];

  const sheetUI = { active: "leads", q: "" };
  const normKey = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  function parseNumber(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const t = String(v ?? "").replace(/[^0-9.\-]/g, "");
    const n = parseFloat(t);
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
      let a = +m[1], b = +m[2];
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
      const hit = c.options.find((o) => normKey(o) === normKey(t) || normKey((c.labels || {})[o]) === normKey(t));
      if (hit) t = hit;
    }
    return t;
  }
  function nextId(def) {
    let max = 0;
    for (const r of D[def.id]) {
      const m = String(r.id || "").match(/(\d+)\s*$/);
      if (m) max = Math.max(max, +m[1]);
    }
    const width = Math.max(3, ...D[def.id].map((r) => (String(r.id || "").match(/(\d+)\s*$/) || ["", ""])[1].length));
    return `${def.prefix}${String(max + 1).padStart(width, "0")}`;
  }
  function blankRow(def) {
    const r = {};
    for (const c of def.cols) r[c.key] = c.type === "number" ? 0 : c.type === "date" ? toISO(new Date()) : c.type === "select" ? c.options[0] : "";
    r.id = nextId(def);
    return r;
  }

  function renderSheetTabs() {
    const tabs = $("#sheet-tabs");
    const all = [...SHEETS.map((d) => ({ id: d.id, label: d.label, count: D[d.id].length })), { id: "settings", label: "Settings" }];
    tabs.replaceChildren(...all.map((t) => {
      const b = h("button", { type: "button", role: "tab", "aria-selected": String(t.id === sheetUI.active), "aria-pressed": String(t.id === sheetUI.active) },
        t.label, t.count != null ? h("span", { class: "cnt" }, num(t.count)) : null);
      b.addEventListener("click", () => { sheetUI.active = t.id; sheetUI.q = ""; renderSheetTabs(); renderSheet(); });
      return b;
    }));
  }

  function renderSheetNotice() {
    $("#sheet-notice").replaceChildren(icon("info"),
      h("div", { class: "grow" },
        h("strong", {}, "Changes save automatically in this browser. "),
        "Only you see them. To publish for everyone: click ", h("strong", {}, "Download data.js"),
        ", then upload that file to your GitHub repository (Add file → Upload files). Keep a copy with ", h("strong", {}, "Export Excel"), "."));
  }

  function renderSheet() {
    renderSheetNotice();
    const host = $("#sheet-body");
    if (sheetUI.active === "settings") { renderSettings(host); return; }
    const def = SHEETS.find((d) => d.id === sheetUI.active);
    const rows = D[def.id];

    const search = h("input", { class: "input", type: "search", placeholder: `Search ${def.label.toLowerCase()}`, "aria-label": `Search ${def.label}`, value: sheetUI.q });
    const count = h("span", { class: "count" });
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus"), "Add row");
    const gridWrap = h("div", { class: "sheet-scroll" });
    const datalists = h("div", { hidden: true });

    // suggestions for text columns
    for (const c of def.cols.filter((x) => x.suggest)) {
      datalists.append(h("datalist", { id: `dl-${def.id}-${c.key}` }, uniq(rows, c.key).map((v) => h("option", { value: v }))));
    }

    const drawGrid = () => {
      const q = sheetUI.q.toLowerCase();
      const visible = rows.map((r, i) => [r, i]).filter(([r]) => !q || def.cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)));
      count.textContent = q ? `${num(visible.length)} of ${num(rows.length)} rows` : `${num(rows.length)} rows`;
      if (!rows.length) {
        gridWrap.replaceChildren(h("div", { class: "sheet-empty" }, h("strong", {}, `No ${def.label.toLowerCase()} yet. `), "Click Add row, or import an Excel/CSV file."));
        return;
      }
      const thead = h("thead", {}, h("tr", {},
        h("th", { class: "rn", scope: "col" }, "#"),
        def.cols.map((c) => h("th", { class: c.type === "number" ? "num" : null, scope: "col", style: `min-width:${c.w}px` }, c.label)),
        h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Delete"))));
      const tbody = h("tbody", {}, visible.map(([r, i]) => sheetRow(def, r, i)));
      gridWrap.replaceChildren(h("table", { class: "sheet-grid" }, thead, tbody));
    };

    search.addEventListener("input", () => { sheetUI.q = search.value.trim(); drawGrid(); });
    add.addEventListener("click", () => {
      const r = blankRow(def);
      rows.push(r);
      saveData();
      sheetUI.q = ""; search.value = "";
      drawGrid(); renderSheetTabs();
      gridWrap.scrollTop = gridWrap.scrollHeight;
      const last = $$("tbody tr", gridWrap).pop();
      const first = last && $$(".cell", last)[1];
      if (first) first.focus();
    });

    host.replaceChildren(
      h("div", { class: "sheet-head" }, h("h3", {}, def.label), count, h("span", { class: "dt-spacer" }),
        h("div", { class: "dt-search" }, icon("search"), search), add),
      gridWrap,
      h("div", { class: "sheet-foot" }, "Tip: press Enter to move down a column. Numbers without commas; dates as day / month / year."),
      datalists);
    drawGrid();
  }

  function sheetRow(def, r, index) {
    const tr = h("tr", {});
    tr.append(h("td", { class: "rn" }, String(index + 1)));
    def.cols.forEach((c, ci) => {
      let input;
      const label = `${c.label}, row ${index + 1}`;
      if (c.type === "select") {
        const opts = [...c.options];
        if (r[c.key] && !opts.includes(r[c.key])) opts.push(r[c.key]);
        input = h("select", { class: "cell", "aria-label": label }, opts.map((o) => h("option", { value: o }, (c.labels || {})[o] || o)));
        input.value = r[c.key] ?? c.options[0];
      } else if (c.type === "date") {
        input = h("input", { class: "cell", type: "date", "aria-label": label, value: r[c.key] || "" });
      } else if (c.type === "number") {
        input = h("input", { class: "cell num", type: "text", inputmode: "decimal", "aria-label": label, value: r[c.key] === "" || r[c.key] == null ? "" : String(r[c.key]) });
      } else {
        input = h("input", { class: "cell", type: "text", "aria-label": label, value: r[c.key] ?? "", list: c.suggest ? `dl-${def.id}-${c.key}` : null });
      }
      input.dataset.col = String(ci);
      input.addEventListener("change", () => {
        const v = coerce(c, input.value);
        r[c.key] = v;
        if (c.type === "number") input.value = String(v);
        input.classList.toggle("bad", c.type === "date" && v !== "" && !isoRe.test(v));
        saveData();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.isComposing) return;
        e.preventDefault();
        input.dispatchEvent(new Event("change"));
        const next = (e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling);
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
    tr.append(h("td", {}, del));
    return tr;
  }

  function settingValue(sd) {
    const v = D.company[sd.key];
    return Array.isArray(v) ? v.join(", ") : v ?? "";
  }
  function setSetting(sd, raw) {
    if (sd.key === "cogsCategories") D.company.cogsCategories = String(raw).split(",").map((x) => x.trim()).filter(Boolean);
    else if (sd.key === "currency") D.company.currency = String(raw).trim().toUpperCase();
    else if (sd.type === "date") D.company[sd.key] = parseDateValue(raw);
    else D.company[sd.key] = String(raw).trim();
  }
  function renderSettings(host) {
    const form = h("div", { class: "settings-form" });
    for (const sd of SETTINGS) {
      const id = `set-${sd.key}`;
      const input = h("input", { class: "input", id, type: sd.type === "date" ? "date" : "text", value: settingValue(sd) });
      if (sd.key === "cogsCategories") input.setAttribute("list", "dl-cogs");
      input.addEventListener("change", () => { setSetting(sd, input.value); saveData(); });
      form.append(h("label", { class: `field${sd.wide ? " wide" : ""}`, for: id }, h("span", {}, sd.label), input, sd.hint ? h("small", {}, sd.hint) : null));
    }
    const cats = uniq(D.expenses, "category");
    form.append(h("p", { class: "field wide" }, h("small", {}, `Expense categories in your sheet: ${cats.join(", ") || "none yet"}`)));
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, "Settings")), form);
  }

  /* ---------- Excel / CSV import & export ---------- */
  let xlsxPromise = null;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        el.onload = () => resolve(window.XLSX);
        el.onerror = () => { xlsxPromise = null; reject(new Error("Could not load the Excel tool. Check the internet connection and try again.")); };
        document.head.append(el);
      });
    }
    return xlsxPromise;
  }
  const slug = (t) => String(t || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function exportExcel() {
    try {
      const X = await loadXLSX();
      const wb = X.utils.book_new();
      for (const def of SHEETS) {
        const aoa = [def.cols.map((c) => c.label), ...D[def.id].map((r) => def.cols.map((c) => r[c.key] ?? ""))];
        const ws = X.utils.aoa_to_sheet(aoa);
        ws["!cols"] = def.cols.map((c) => ({ wch: Math.max(10, Math.round(c.w / 7)) }));
        X.utils.book_append_sheet(wb, ws, def.label.slice(0, 31));
      }
      const set = X.utils.aoa_to_sheet([["Setting", "Value"], ...SETTINGS.map((sd) => [sd.label, settingValue(sd)])]);
      set["!cols"] = [{ wch: 36 }, { wch: 60 }];
      X.utils.book_append_sheet(wb, set, "Settings");
      X.writeFile(wb, `${slug(D.company.name)}-report-data.xlsx`);
    } catch (e) { toast(e.message); }
  }

  function colFor(def, header) {
    const k = normKey(header);
    return def.cols.find((c) => normKey(c.key) === k || normKey(c.label) === k);
  }
  function parseRows(X, ws, def) {
    const json = X.utils.sheet_to_json(ws, { defval: "", raw: true });
    const out = [];
    for (const obj of json) {
      const r = {};
      for (const [head, v] of Object.entries(obj)) {
        const c = colFor(def, head);
        if (c) r[c.key] = coerce(c, v, X);
      }
      if (!Object.values(r).some((v) => v !== "" && v !== 0)) continue;
      for (const c of def.cols) if (!(c.key in r)) r[c.key] = c.type === "number" ? 0 : c.type === "select" ? c.options[0] : "";
      out.push(r);
    }
    return out;
  }
  function parseSettings(X, ws) {
    const rows = X.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    const found = {};
    for (const [label, value] of rows) {
      const sd = SETTINGS.find((x) => normKey(x.label) === normKey(label) || normKey(x.key) === normKey(label));
      if (sd) found[sd.key] = sd.type === "date" ? parseDateValue(value, X) : value;
    }
    return found;
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
        if (n === "settings") { settings = parseSettings(X, wb.Sheets[name]); continue; }
        const def = SHEETS.find((d) => normKey(d.id) === n || normKey(d.label) === n || (d.aliases || []).includes(n));
        if (def) plan.push({ def, rows: parseRows(X, wb.Sheets[name], def) });
      }
      if (!plan.length && !settings) {
        const def = SHEETS.find((d) => d.id === sheetUI.active);
        if (!def) { toast("Open the sheet you want to import into (for example Sales), then import again."); return; }
        plan.push({ def, rows: parseRows(X, wb.Sheets[wb.SheetNames[0]], def) });
      }
      const lines = plan.map((p) => `• ${p.def.label}: ${p.rows.length} rows`);
      if (settings) lines.push("• Settings");
      if (!confirm(`Import from "${file.name}"?\n\n${lines.join("\n")}\n\nThis replaces the current rows in these sheets.`)) return;
      for (const p of plan) {
        D[p.def.id] = p.rows;
        for (const r of p.rows) if (!r.id) r.id = nextId(p.def);
      }
      if (settings) for (const [k, v] of Object.entries(settings)) setSetting(SETTINGS.find((x) => x.key === k), v);
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
 * COMMERCIAL REPORT — DATA FILE
 * Exported from the Data sheet on ${toISO(new Date())}.
 * Upload this file to the GitHub repository (replacing data.js) to publish it.
 */
window.REPORT_DATA = {
  sample: ${D.sample ? "true" : "false"},
  company: ${company},
${DATASETS.map((k) => `\n  ${k}: [\n${rows(D[k])}${D[k].length ? "," : ""}\n  ],`).join("\n")}
};
`;
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
    band: [244, 243, 239], in: [42, 120, 214], inSoft: [205, 226, 251], out: [235, 104, 52], outSoft: [249, 212, 196],
    good: [0, 99, 0], bad: [179, 38, 30],
  };
  let pdfLibPromise = null, ethFontB64 = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error("Could not load the PDF tool. Check the internet connection and try again."));
      document.head.append(el);
    });
  }
  function loadPdfLib() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
    if (!pdfLibPromise) {
      pdfLibPromise = PDF_LIBS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve())
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
  const pdfClean = (v) => String(v ?? "").replace(/[  ]/g, " ").replace(/−/g, "-").replace(/→/g, "->");

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
    const k = { doc, W, H, M, y: M, eth };
    k.font = (style, sample) => {
      if (eth && ETH_RE.test(sample)) doc.setFont("Abyssinica", "normal");
      else doc.setFont("helvetica", style || "normal");
    };
    k.text = (str, x, y, { size = 9, style = "normal", color = PC.ink, align = "left", maxWidth } = {}) => {
      const t = pdfClean(str);
      k.font(style, t);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(t, x, y, { align, maxWidth });
    };
    k.width = (str, size, style) => { const t = pdfClean(str); k.font(style, t); doc.setFontSize(size); return doc.getTextWidth(t); };
    k.room = () => H - 52 - k.y;
    k.ensure = (need) => { if (k.room() < need) { doc.addPage(); k.y = M; } };
    k.heading = (numStr, title, sub) => {
      k.ensure(260);
      if (k.y > M) k.y += 10;
      doc.setDrawColor(...PC.grid); doc.setFillColor(...PC.band); doc.setLineWidth(0.5);
      doc.roundedRect(M, k.y - 11, 22, 15, 3, 3, "FD");
      k.text(numStr, M + 11, k.y, { size: 7.5, style: "bold", color: PC.ink2, align: "center" });
      k.text(title, M + 30, k.y + 1, { size: 15, style: "bold" });
      k.y += 15;
      if (sub) { k.text(sub, M + 30, k.y, { size: 8.5, color: PC.ink2 }); k.y += 6; }
      k.y += 14;
    };
    k.sub = (title, note) => {
      k.ensure(60);
      k.text(title, M, k.y, { size: 10, style: "bold" });
      if (note) k.text(note, W - M, k.y, { size: 7.5, color: PC.muted, align: "right" });
      k.y += 8;
    };
    k.none = (text = "No records in this period.") => { k.text(text, M, k.y + 6, { size: 8.5, color: PC.muted }); k.y += 24; };
    k.table = (opts) => {
      const { head, body, align = [], foot, widths = [], margin, startY, fontSize = 8, bold } = opts;
      if (!body.length) { k.none(); return k.y; }
      const columnStyles = {};
      head.forEach((_, i) => {
        columnStyles[i] = { halign: align[i] === "r" ? "right" : "left" };
        if (widths[i]) columnStyles[i].cellWidth = widths[i];
      });
      doc.autoTable({
        head: [head.map(pdfClean)],
        body: body.map((r) => r.map(pdfClean)),
        foot: foot ? [foot.map(pdfClean)] : undefined,
        startY: startY ?? k.y,
        margin: margin || { left: M, right: M, top: M, bottom: 52 },
        theme: "plain",
        styles: { font: "helvetica", fontSize, textColor: PC.ink, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, lineColor: PC.grid, lineWidth: { bottom: 0.5 }, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: PC.band, textColor: PC.ink2, fontStyle: "bold", fontSize: fontSize - 0.5 },
        footStyles: { fillColor: PC.band, textColor: PC.ink, fontStyle: "bold", lineWidth: { top: 0.75, bottom: 0 }, lineColor: PC.rule },
        columnStyles,
        showHead: "everyPage",
        showFoot: "lastPage",
        rowPageBreak: "avoid",
        didParseCell: (data) => {
          if (align[data.column.index] === "r") data.cell.styles.halign = "right";
          if (bold && data.section === "body" && bold(data.row.index)) data.cell.styles.fontStyle = "bold";
          if (opts.fill && data.section === "body" && opts.fill(data.row.index)) data.cell.styles.fillColor = PC.band;
          if (eth && ETH_RE.test(data.cell.text.join(" "))) { data.cell.styles.font = "Abyssinica"; data.cell.styles.fontStyle = "normal"; }
        },
      });
      const end = doc.lastAutoTable.finalY;
      if (startY == null) k.y = end + 20;
      return end;
    };
    // Two short tables next to each other (falls back to stacked if too tall)
    k.pair = (left, right) => {
      const rows = Math.max(left.body.length, right.body.length) + 2;
      const need = rows * 17 + 40;
      if (need > H - 2 * M - 60 || !left.body.length || !right.body.length) {
        k.sub(left.title); k.table(left);
        k.sub(right.title); k.table(right);
        return;
      }
      k.ensure(need);
      const gap = 18, colW = (W - 2 * M - gap) / 2;
      const top = k.y;
      k.text(left.title, M, top, { size: 10, style: "bold" });
      k.text(right.title, M + colW + gap, top, { size: 10, style: "bold" });
      const y0 = top + 8;
      const e1 = k.table({ ...left, startY: y0, margin: { left: M, right: W - M - colW, top: M, bottom: 52 } });
      const e2 = k.table({ ...right, startY: y0, margin: { left: M + colW + gap, right: M, top: M, bottom: 52 } });
      k.y = Math.max(e1, e2) + 20;
    };
    k.kpis = (items) => {
      const cols = 4, gap = 8, w = (W - 2 * M - gap * (cols - 1)) / cols, hgt = 52;
      k.ensure(Math.ceil(items.length / cols) * (hgt + gap) + 10);
      items.forEach((it, i) => {
        const x = M + (i % cols) * (w + gap), y = k.y + Math.floor(i / cols) * (hgt + gap);
        doc.setFillColor(...PC.band); doc.setDrawColor(...PC.grid); doc.setLineWidth(0.5);
        doc.roundedRect(x, y, w, hgt, 6, 6, "FD");
        k.text(it.label, x + 10, y + 15, { size: 7.5, color: PC.ink2 });
        k.text(it.value, x + 10, y + 32, { size: 13.5, style: "bold", maxWidth: w - 16 });
        if (it.note) k.text(it.note, x + 10, y + 44, { size: 7, color: it.color || PC.muted, maxWidth: w - 16 });
      });
      k.y += Math.ceil(items.length / cols) * (hgt + gap) + 12;
    };
    k.chart = ({ title, series, selected, fmtTick, height = 140 }) => {
      if (noData(series)) return;
      k.ensure(height + 60);
      k.text(title, M, k.y, { size: 10, style: "bold" });
      let lx = W - M;
      [...series].reverse().forEach((se) => {
        const tw = k.width(se.name, 7.5);
        lx -= tw;
        k.text(se.name, lx, k.y, { size: 7.5, color: PC.ink2 });
        doc.setFillColor(...PC[se.key]); doc.roundedRect(lx - 11, k.y - 6.5, 7, 7, 1.5, 1.5, "F");
        lx -= 24;
      });
      k.y += 14;
      const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((se) => se.values)));
      const labW = Math.max(...ticks.map((t) => k.width(fmtTick(t), 7))) + 8;
      const x0 = M + labW, x1 = W - M, y0 = k.y, y1 = k.y + height;
      const yv = (v) => y1 - (v / top) * (y1 - y0);
      for (const t of ticks) {
        doc.setDrawColor(...(t === 0 ? PC.rule : PC.grid)); doc.setLineWidth(0.5);
        doc.line(x0, yv(t), x1, yv(t));
        k.text(fmtTick(t), x0 - 6, yv(t) + 2.5, { size: 7, color: PC.muted, align: "right" });
      }
      const step = (x1 - x0) / N, n = series.length, gap = 1.5;
      const colW = Math.max(2, Math.min(14, (step * 0.64 - gap * (n - 1)) / n)), groupW = colW * n + gap * (n - 1);
      const partial = selected.size < N;
      MONTHS.forEach((mo, i) => {
        const cx = x0 + step * (i + 0.5);
        const dim = partial && !selected.has(i);
        series.forEach((se, j) => {
          const v = se.values[i];
          if (!(v > 0)) return;
          const bx = cx - groupW / 2 + j * (colW + gap), by = yv(v), bh = y1 - by;
          const r = Math.min(2, colW / 2, bh / 2);
          doc.setFillColor(...(dim ? PC[se.key + "Soft"] : PC[se.key]));
          doc.roundedRect(bx, by, colW, bh, r, r, "F");
          if (bh > r) doc.rect(bx, y1 - r, colW, r, "F");
        });
        if (step >= 16 || i % 2 === 0) {
          const on = partial && selected.has(i);
          k.text(mo.short, cx, y1 + 11, { size: 7, color: on ? PC.ink : PC.muted, style: on ? "bold" : "normal", align: "center" });
        }
      });
      k.y = y1 + 30;
    };
    k.meter = (p, x, y, w) => {
      doc.setFillColor(...PC.inSoft); doc.roundedRect(x, y, w, 6, 3, 3, "F");
      const fw = Math.max(0, Math.min(1, p)) * w;
      if (fw > 0) { doc.setFillColor(...PC.in); doc.roundedRect(x, y, Math.max(6, fw), 6, 3, 3, "F"); }
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
      k.y += 26;
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

  function deltaNote(cur, prev, { upGood = true, pts = false } = {}) {
    if (!SEL.prev || prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) return null;
    let change, text;
    if (pts) { change = cur - prev; text = `${change >= 0 ? "+" : "-"}${(Math.abs(change) * 100).toFixed(1)} pts`; }
    else { if (prev === 0) return null; change = (cur - prev) / Math.abs(prev); text = `${change >= 0 ? "+" : "-"}${pct(Math.abs(change))}`; }
    return { note: `${text} vs ${SEL.prev.label}`, color: Math.abs(change) < 0.0005 ? PC.muted : (change > 0) === upGood ? PC.good : PC.bad };
  }
  const kpi = (label, value, cur, prev, opts, fallback) => ({ label, value, ...(deltaNote(cur, prev, opts) || { note: fallback }) });

  function statementLines(f) {
    const c = fsCalc(f);
    return {
      c,
      body: [
        ["Original contract value", money(f.contractValue)],
        ["Add: design changes & extra work", money(f.variations)],
        ["Final contract value", money(c.final)],
        ["Less: customer deposit", minus(f.advance)],
        ["Less: interim payments received", minus(f.interimPaid)],
        ["Less: delay penalties & discounts", minus(f.penalties)],
        ["Balance due on final settlement", money(c.balance)],
        ["Paid against settlement", minus(f.amountPaid)],
        ["Outstanding", money(c.outstanding)],
      ],
      bold: (i) => i === 2 || i === 6 || i === 8,
      fill: (i) => i === 6,
    };
  }

  async function exportReportPdf() {
    const k = await newPdf();
    const { W, M: m } = k;
    const R = V.M, P = V.P;
    const range = state.month == null ? `${SEL.short} (${SEL.range})` : SEL.short;
    k.header("Commercial Report", range, `Generated ${fDate.format(new Date())}${SEL.prev ? ` · compared with ${SEL.prev.label}` : ""} · amounts in ${CUR}`);

    // 01 Overview
    k.kpis([
      kpi("Revenue", moneyC(R.revenue), R.revenue, P && P.revenue, {}, `${num(R.sales.length)} invoices`),
      kpi("Expenses", moneyC(R.expenses), R.expenses, P && P.expenses, { upGood: false }, `${pct(R.expenses / R.revenue)} of revenue`),
      kpi("Net profit", moneyC(R.net), R.net, P && P.net, {}, `${pct(R.net / R.revenue)} margin`),
      kpi("Cash collected", moneyC(R.cashIn), R.cashIn, P && P.cashIn, {}, "Completed payments in"),
      kpi("New leads", num(R.leads.length), R.leads.length, P && P.leads.length, {}, `${num(R.won.length)} won`),
      kpi("Conversion rate", pct(R.conv), R.conv, P && P.conv, { pts: true }, `${num(R.won.length)} of ${num(R.leads.length)} leads`),
      kpi("Win rate", pct(R.winRate), R.winRate, P && P.winRate, { pts: true }, "Won / (won + lost)"),
      { label: "Receivables due", value: moneyC(R.receivables), note: `${num(R.recvCount)} pending or overdue` },
    ]);
    k.chart({
      title: "Sales vs expenses by month",
      series: [{ name: "Sales", key: "in", values: SERIES.sales }, { name: "Expenses", key: "out", values: SERIES.expenses }],
      selected: SEL.set, fmtTick: moneyC,
    });
    const pend = R.pays.filter((p) => p.status === "Pending"), over = R.pays.filter((p) => p.status === "Overdue");
    k.pair(
      { title: "Profit & loss", head: ["", "Amount", "%"], align: ["l", "r", "r"], widths: [0, 0, 44],
        body: [
          ["Revenue", money(R.revenue), R.revenue ? "100%" : "—"],
          ["Materials (cost of goods)", minus(R.cogs), pct(R.cogs / R.revenue)],
          ["Gross profit", money(R.gross), pct(R.gross / R.revenue)],
          ["Workshop & overheads", minus(R.opex), pct(R.opex / R.revenue)],
          ["Net profit", R.net < 0 ? "-" + money(-R.net) : money(R.net), pct(R.net / R.revenue)],
        ], bold: (i) => i === 2 || i === 4, fill: (i) => i === 4 },
      { title: "Cash", head: ["", "Amount", "Count"], align: ["l", "r", "r"], widths: [0, 0, 44],
        body: [
          ["Money in (completed)", money(R.cashIn), num(R.pays.filter((p) => p.direction === "In" && p.status === "Completed").length)],
          ["Money out (completed)", money(R.cashOut), num(R.pays.filter((p) => p.direction === "Out" && p.status === "Completed").length)],
          ["Net cash flow", money(R.cashIn - R.cashOut), ""],
          ["Pending", money(sum(pend)), num(pend.length)],
          ["Overdue", money(sum(over)), num(over.length)],
        ], bold: (i) => i === 2, fill: (i) => i === 2 });

    // 02 Leads
    k.heading("02", "Leads", "Customer inquiries and how they move to a signed order.");
    const open = R.leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const wonValue = sum(R.won, (l) => l.value);
    k.kpis([
      { label: "Leads captured", value: num(R.leads.length), note: SEL.range },
      { label: "Won", value: num(R.won.length), note: `${moneyC(wonValue)} in value` },
      { label: "Open pipeline", value: moneyC(sum(open, (l) => l.value)), note: `${num(open.length)} open leads` },
      { label: "Avg. won deal", value: R.won.length ? moneyC(wonValue / R.won.length) : "—", note: "Estimated value" },
    ]);
    k.pair(
      { title: "Pipeline by stage", head: ["Stage", "Leads", "Est. value"], align: ["l", "r", "r"],
        body: V.stages.map((s2) => [s2.label, num(s2.value), s2.extra[0].value]) },
      { title: "Leads by source", head: ["Source", "Leads", "Won"], align: ["l", "r", "r"],
        body: V.sources.map((s2) => [s2.label, num(s2.value), s2.extra[0].value]) });
    if (V.reps.length) { k.sub("Won value by sales rep"); k.table({ head: ["Sales rep", "Won value", "Deals won"], align: ["l", "r", "r"], body: V.reps.map((r) => [r.label, money(r.value), r.extra[0].value]) }); }
    k.sub("Leads register", `${num(R.leads.length)} leads`);
    k.table({
      head: ["Date", "ID", "Contact", "Customer", "Source", "Stage", "Sales rep", "Est. value"], align: ["l", "l", "l", "l", "l", "l", "l", "r"], fontSize: 7.5,
      body: [...R.leads].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((l) => [fdate(l.date), l.id, l.contact, l.company, l.source, l.stage, l.owner, money(l.value)]),
      foot: R.leads.length ? ["Total", "", "", "", "", "", "", money(sum(R.leads, (l) => l.value))] : null,
    });

    // 03 Sales
    k.heading("03", "Sales", "Orders invoiced: which products sell and who buys them.");
    const ids = new Set(R.sales.map((x) => x.id));
    const toCollect = sum(D.payments.filter((p) => p.type === "Invoice" && p.status !== "Completed" && ids.has(p.reference)));
    k.kpis([
      { label: "Revenue", value: moneyC(R.revenue), note: SEL.range },
      { label: "Invoices raised", value: num(R.sales.length), note: "Sales invoices" },
      { label: "Average invoice", value: R.sales.length ? moneyC(R.revenue / R.sales.length) : "—", note: "Revenue / invoices" },
      { label: "Still to collect", value: moneyC(toCollect), note: "On this period's invoices" },
    ]);
    k.pair(
      { title: "Revenue by product", head: ["Product", "Revenue", "Share"], align: ["l", "r", "r"],
        body: V.categories.map((c) => [c.label, money(c.value), pct(c.value / (R.revenue || 1))]) },
      { title: "Top customers", head: ["Customer", "Revenue", "Invoices"], align: ["l", "r", "r"],
        body: V.customers.map((c) => [c.label, money(c.value), c.extra[0].value]) });
    k.sub("Sales invoices", `${num(R.sales.length)} invoices`);
    k.table({
      head: ["Date", "Invoice", "Customer", "Product", "Status", "Amount"], align: ["l", "l", "l", "l", "l", "r"], fontSize: 7.5,
      body: [...R.sales].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((x) => [fdate(x.date), x.id, x.customer, x.category, x.status, money(x.amount)]),
      foot: R.sales.length ? ["Total", "", "", "", "", money(R.revenue)] : null,
    });

    // 04 Expenses
    k.heading("04", "Expenses", "Materials, workshop and overhead costs.");
    k.kpis([
      { label: "Total expenses", value: moneyC(R.expenses), note: SEL.range },
      { label: "Materials", value: moneyC(R.cogs), note: `${pct(R.cogs / R.revenue)} of revenue` },
      { label: "Workshop & overheads", value: moneyC(R.opex), note: `${pct(R.opex / R.revenue)} of revenue` },
      { label: "Expenses / revenue", value: R.revenue ? pct(R.expenses / R.revenue) : "—", note: "Lower is better" },
    ]);
    k.pair(
      { title: "Expenses by category", head: ["Category", "Amount", "Share"], align: ["l", "r", "r"],
        body: V.expenseCats.map((c) => [c.label + (COGS.has(c.label) ? " *" : ""), money(c.value), pct(c.value / (R.expenses || 1))]) },
      { title: "Spend by month", head: ["Month", "Expenses"], align: ["l", "r"],
        body: SEL.idx.map((i) => [MONTHS[i].long, money(SERIES.expenses[i])]) });
    if (V.expenseCats.some((c) => COGS.has(c.label))) { k.text("* counted as materials (cost of goods)", m, k.y - 10, { size: 7, color: PC.muted }); k.y += 4; }
    k.sub("Expense register", `${num(R.exps.length)} entries`);
    k.table({
      head: ["Date", "ID", "Category", "Description", "Vendor / payee", "Amount"], align: ["l", "l", "l", "l", "l", "r"], fontSize: 7.5,
      body: [...R.exps].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((e) => [fdate(e.date), e.id, e.category, e.description, e.vendor, money(e.amount)]),
      foot: R.exps.length ? ["Total", "", "", "", "", money(R.expenses)] : null,
    });

    // 05 Advances
    k.heading("05", "Advances", "Customer deposits received and advances paid to suppliers.");
    const adv = advanceRows(SEL.keys).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const rec = adv.filter((a) => a.type === "Received"), paidAdv = adv.filter((a) => a.type === "Paid");
    k.kpis([
      { label: "Customer deposits", value: moneyC(sum(rec)), note: `${num(rec.length)} received` },
      { label: "Deposits not yet delivered", value: moneyC(sum(rec, (a) => a.balance)), note: "Still to offset against work" },
      { label: "Paid to suppliers", value: moneyC(sum(paidAdv)), note: `${num(paidAdv.length)} purchase orders` },
      { label: "Supplier advances open", value: moneyC(sum(paidAdv, (a) => a.balance)), note: "Goods not yet received" },
    ]);
    k.sub("Advance register", `${num(adv.length)} advances`);
    k.table({
      head: ["Date", "Type", "Party / reference", "Advance", "Recovered", "Balance", "Status"], align: ["l", "l", "l", "r", "r", "r", "l"], fontSize: 7.5,
      widths: [60, 50, 0, 68, 68, 68, 72],
      body: adv.map((a) => [fdate(a.date), a.type === "Received" ? "Deposit" : "To supplier", `${a.party}\n${a.reference}`, money(a.amount), money(a.recovered), money(a.balance), a.status]),
      foot: adv.length ? ["Total", "", "", money(sum(adv)), money(sum(adv, (a) => a.recovered)), money(sum(adv, (a) => a.balance)), ""] : null,
    });

    // 06 Final settlement
    k.heading("06", "Final settlement", "Closing statements for installed projects.");
    const fl = inK(D.settlements, SEL.keys, "settlementDate").sort((a, b) => String(a.settlementDate).localeCompare(String(b.settlementDate)));
    const fc = fl.map(fsCalc);
    k.kpis([
      { label: "Projects closed", value: num(fl.length), note: `${num(fl.filter((f) => f.status === "Settled").length)} fully settled` },
      { label: "Final contract value", value: moneyC(sum(fc, (c) => c.final)), note: "Incl. extra work" },
      { label: "Collected to date", value: moneyC(sum(fc, (c) => c.collected)), note: "Deposit + interim + final" },
      { label: "Outstanding", value: moneyC(sum(fc, (c) => c.outstanding)), note: "Balance still to receive" },
    ]);
    k.sub("Summary", `${num(fl.length)} projects`);
    k.table({
      head: ["ID", "Project", "Customer", "Settled", "Final value", "Collected", "Outstanding", "Status"], align: ["l", "l", "l", "l", "r", "r", "r", "l"], fontSize: 7.5,
      body: fl.map((f, i) => [f.id, f.project, f.client, fdate(f.settlementDate), money(fc[i].final), money(fc[i].collected), money(fc[i].outstanding), f.status]),
    });
    for (const f of fl) {
      const st = statementLines(f);
      k.ensure(250);
      k.text(`${f.id} · ${f.project}`, m, k.y, { size: 10, style: "bold" });
      k.text(f.status, W - m, k.y, { size: 8, style: "bold", color: PC.ink2, align: "right" });
      k.y += 12;
      k.text(`${f.client} · ordered ${fdate(f.startDate)} · installed ${fdate(f.completionDate)} · settled ${fdate(f.settlementDate)}`, m, k.y, { size: 7.5, color: PC.ink2 });
      k.y += 6;
      k.table({ head: ["Statement line", "Amount"], align: ["l", "r"], body: st.body, bold: st.bold, fill: st.fill, fontSize: 8 });
    }

    // 07 Payments
    k.heading("07", "Payments", "Every payment in and out, with what is pending or overdue.");
    k.kpis([
      { label: "Money in", value: moneyC(R.cashIn), note: "Completed" },
      { label: "Money out", value: moneyC(R.cashOut), note: "Completed" },
      { label: "Pending", value: moneyC(sum(pend)), note: `${num(pend.length)} not yet due` },
      { label: "Overdue", value: moneyC(sum(over)), note: `${num(over.length)} past due date`, color: over.length ? PC.bad : PC.muted },
    ]);
    k.chart({
      title: "Cash in vs cash out by month",
      series: [{ name: "Cash in", key: "in", values: SERIES.cashIn }, { name: "Cash out", key: "out", values: SERIES.cashOut }],
      selected: SEL.set, fmtTick: moneyC, height: 120,
    });
    const pays = [...R.pays].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    k.sub("Payment log", `${num(pays.length)} payments`);
    k.table({
      head: ["Date", "In/Out", "Party", "Type", "Reference", "Method", "Status", "Amount"], align: ["l", "l", "l", "l", "l", "l", "l", "r"], fontSize: 7.5,
      body: pays.map((p) => [fdate(p.date), p.direction, p.party, p.type, p.reference, p.method, p.status, money(p.amount)]),
    });

    k.footers(`${C.name || "Company"} · Commercial report · ${range}`);
    k.doc.save(`${slug(C.name)}-commercial-report-${slug(SEL.short)}.pdf`);
  }

  async function exportStatementPdf(f) {
    const k = await newPdf();
    const { doc, W, M: m } = k;
    const st = statementLines(f);
    k.header("Final settlement statement", f.id, `Issued ${fDate.format(new Date())}`);
    k.table({
      head: ["Customer", "Project", "Status"], align: ["l", "l", "l"], fontSize: 9,
      body: [[f.client, f.project, f.status]],
    });
    k.table({
      head: ["Order date", "Installed", "Settlement date"], align: ["l", "l", "l"], fontSize: 9,
      body: [[fdate(f.startDate), fdate(f.completionDate), fdate(f.settlementDate)]],
    });
    k.table({ head: ["Statement line", `Amount (${CUR})`], align: ["l", "r"], body: st.body, bold: st.bold, fill: st.fill, fontSize: 10 });
    k.text(`Collected ${money(st.c.collected)} of ${money(st.c.due)}`, m, k.y, { size: 9, color: PC.ink2 });
    k.text(pct(st.c.pctCollected), W - m, k.y, { size: 9, style: "bold", align: "right" });
    k.meter(st.c.pctCollected, m, k.y + 8, W - 2 * m);
    k.y += 80;
    const colW = (W - 2 * m - 40) / 3;
    ["Prepared by", "Approved by", "Customer acknowledgement"].forEach((label, i) => {
      const x = m + i * (colW + 20);
      doc.setDrawColor(...PC.rule); doc.setLineWidth(0.75); doc.line(x, k.y, x + colW, k.y);
      k.text(label, x, k.y + 12, { size: 8, color: PC.ink2 });
      k.text(i === 0 ? C.preparedBy || "" : i === 2 ? f.client : "", x, k.y + 24, { size: 8 });
    });
    k.footers(`${C.name || "Company"} · Final settlement statement ${f.id}`);
    doc.save(`${slug(f.id)}-final-settlement-${slug(f.client)}.pdf`);
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

  /* ---------- view switching ---------- */
  function setView(v, { scroll = true } = {}) {
    document.body.dataset.view = v;
    $$("#view-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    $$("#nav a").forEach((a) => a.classList.toggle("active", v === "sheet" ? a.classList.contains("nav-sheet") : a.getAttribute("href") === "#overview"));
    hideTip();
    if (v === "sheet") {
      renderSheetTabs();
      renderSheet();
    } else if (dirty) {
      rebuildAll();
    }
    try { history.replaceState(null, "", v === "sheet" ? "#sheet" : location.pathname + location.search); } catch (e) { /* ignore */ }
    if (scroll) scrollTo({ top: 0 });
  }

  /* ---------- one-time wiring ---------- */
  function initOnce() {
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

    $$(".chart-card").forEach((card) => {
      $$(".view-toggle button", card).forEach((b) => b.addEventListener("click", () => {
        card.dataset.view = b.dataset.view;
        $$(".view-toggle button", card).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawChart(card.dataset.chart);
      }));
    });

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
          if (el === V.spark) { drawSpark(el, SERIES.sales, SEL.set); continue; }
          const id = el.closest("[data-chart]")?.dataset.chart;
          if (id && !CHARTS[id].fluid) drawChart(id);
        }
        pending = new Set();
      });
    });
    $$(".chart-body").forEach((el) => ro.observe(el));
    new MutationObserver(() => { if (V.spark) ro.observe(V.spark); }).observe($("#hero"), { childList: true });

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
    addEventListener("afterprint", () => {
      document.body.classList.remove("print-statement");
      Object.values(TABLES).forEach((t) => { t.printAll = false; t.draw(); });
    });

    // View switch
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
      toast("data.js downloaded. Upload it to your GitHub repository to publish.");
    });
    $("#restore-sample").addEventListener("click", () => {
      if (!confirm("Delete everything saved on this device and reload the published data? Tip: Export Excel first if you want to keep a copy.")) return;
      discardLocal(); renderSheetTabs(); renderSheet(); toast("Reset done. Showing the published data.");
    });
    $("#clear-all").addEventListener("click", () => {
      if (!confirm("Start with an empty sheet? All rows will be removed (settings are kept). Tip: Export Excel first to keep a copy.")) return;
      for (const k of DATASETS) D[k] = [];
      D.sample = false;
      saveData(); renderSheetTabs(); renderSheet(); toast("Sheet cleared. Add rows or import your Excel file.");
    });
  }

  function initStateFromURL() {
    try {
      const p = new URL(location.href).searchParams.get("period");
      if (!p) return;
      if (MONTH_INDEX.has(p)) state.month = MONTH_INDEX.get(p);
      else if (PRESETS.some((x) => x.id === p)) state.preset = p;
    } catch (e) { /* ignore */ }
  }

  buildModel();
  initStateFromURL();
  initOnce();
  rebuildAll();
  setView(location.hash === "#sheet" ? "sheet" : "report", { scroll: false });
})();
