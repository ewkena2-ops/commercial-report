/* ==========================================================================
   Commercial Report — app
   Everything is computed from window.REPORT_DATA (data.js).
   ========================================================================== */
(() => {
  "use strict";

  const D = window.REPORT_DATA;
  const C = D.company;
  const COGS = C.cogsCategory || "Cost of goods";

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
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
    check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alertTri: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrowIn: '<path d="M17 7 7 17M17 17H7V7"/>',
    arrowOut: '<path d="M7 17 17 7M7 7h10v10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
  };
  function icon(name) {
    const t = document.createElement("template");
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
    return t.content.firstChild;
  }

  /* ---------- formatting ---------- */
  const LOC = C.locale || "en-US";
  const CUR = C.currency || "USD";
  const fMoney = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, maximumFractionDigits: 0 });
  const fMoneyC = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, notation: "compact", maximumFractionDigits: 1 });
  const fNum = new Intl.NumberFormat(LOC);
  const fPct = new Intl.NumberFormat(LOC, { style: "percent", maximumFractionDigits: 1 });
  const fDate = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" });

  const money = (n) => fMoney.format(Math.round(n));
  const moneyC = (n) => (Math.abs(n) < 10000 ? fMoney.format(Math.round(n)) : fMoneyC.format(n));
  const minus = (n) => (n > 0 ? "−" + money(n) : money(0));
  const num = (n) => fNum.format(n);
  const pct = (n) => (Number.isFinite(n) ? fPct.format(n) : "—");
  const parseD = (str) => { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, m - 1, d || 1); };
  const fdate = (str) => fDate.format(parseD(str));

  const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  function groupSum(arr, keyFn, valFn = (x) => x.amount) {
    const m = new Map();
    for (const x of arr) { const k = keyFn(x); m.set(k, (m.get(k) || 0) + valFn(x)); }
    return m;
  }

  /* ---------- period model ---------- */
  const pStart = parseD(C.periodStart);
  const pEnd = parseD(C.periodEnd);
  const MONTHS = [];
  for (let d = new Date(pStart.getFullYear(), pStart.getMonth(), 1); d <= pEnd; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    MONTHS.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      short: d.toLocaleDateString(LOC, { month: "short" }),
      long: d.toLocaleDateString(LOC, { month: "long", year: "numeric" }),
      y: d.getFullYear(),
      q: Math.floor(d.getMonth() / 3) + 1,
    });
  }
  const N = MONTHS.length;
  const multiYear = MONTHS[0].y !== MONTHS[N - 1].y;
  const MONTH_INDEX = new Map(MONTHS.map((m, i) => [m.key, i]));

  function rangeLabel(idx) {
    const a = MONTHS[idx[0]], b = MONTHS[idx[idx.length - 1]];
    if (a === b) return a.long;
    return a.y === b.y ? `${a.short} – ${b.short} ${b.y}` : `${a.short} ${a.y} – ${b.short} ${b.y}`;
  }

  const PRESETS = [{
    id: "all",
    label: !multiYear && pStart.getMonth() === 0 ? "Year to date" : "All",
    long: !multiYear && pStart.getMonth() === 0 ? "Year to date" : "Full period",
    idx: MONTHS.map((_, i) => i),
    prev: null,
  }];
  const qMap = new Map();
  MONTHS.forEach((m, i) => {
    const id = `${m.y}-Q${m.q}`;
    if (!qMap.has(id)) qMap.set(id, { id, label: multiYear ? `Q${m.q} ${m.y}` : `Q${m.q}`, long: `Q${m.q} ${m.y}`, idx: [] });
    qMap.get(id).idx.push(i);
  });
  const QUARTERS = [...qMap.values()];
  QUARTERS.forEach((q, i) => (q.prev = QUARTERS[i - 1] || null));
  PRESETS.push(...QUARTERS);

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
      if (i != null) out[i] += val(r);
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
    const cogs = sum(exps.filter((e) => e.category === COGS));
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

  // Monthly series (full period — charts show context and highlight the selection)
  const SERIES = {
    sales: monthly(D.sales),
    expenses: monthly(D.expenses),
    leads: monthly(D.leads, () => true, () => 1),
    cashIn: monthly(D.payments, (p) => p.direction === "In" && p.status === "Completed"),
    cashOut: monthly(D.payments, (p) => p.direction === "Out" && p.status === "Completed"),
  };

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
    return h("span", { class: `badge ${tone}` }, icon(text === "Lost" ? "xCircle" : STATUS_ICON[tone]), text);
  }

  const OPEN_STAGES = ["New", "Contacted", "Qualified", "Proposal"];
  const STAGES = [...OPEN_STAGES, "Won", "Lost"];
  function stageCell(stage) {
    if (stage === "Won" || stage === "Lost") return badge(stage);
    const i = OPEN_STAGES.indexOf(stage);
    return h("span", { class: "stage" },
      h("span", { class: "stage-dots", "aria-hidden": "true" }, OPEN_STAGES.map((_, j) => h("i", { class: j <= i ? "on" : null }))),
      stage);
  }
  const dirCell = (d) => h("span", { class: `dir ${d === "In" ? "in" : "out"}` }, h("i", {}, icon(d === "In" ? "arrowIn" : "arrowOut")), d === "In" ? "In" : "Out");
  const meterCell = (p) => h("span", { class: "meter-cell" }, h("span", { class: "meter sm", "aria-hidden": "true" }, h("span", { style: `--p:${Math.max(0, Math.min(1, p)).toFixed(4)}` })), pct(p));
  const twoLine = (a, b) => [h("span", { class: "strong" }, a), h("span", { class: "sub" }, b)];

  function emptyState(title = "Nothing in this period", text = "Choose a wider period to see data here.") {
    return h("div", { class: "empty" }, h("strong", {}, title), text);
  }

  function statStrip(el, items) {
    el.replaceChildren(...items.map((it) => h("div", { class: "stat" },
      h("span", { class: "stat-label" }, it.label),
      h("span", { class: "stat-value", title: it.title || null }, it.value),
      it.foot ? h("span", { class: "stat-foot" }, it.foot) : null)));
  }

  /* ---------- tooltip ---------- */
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
    const every = step < 30 ? 2 : 1;
    MONTHS.forEach((mo, i) => {
      if (i % every && !(partial && selected.has(i))) return;
      svg.append(s("text", {
        class: "x-label" + (partial && selected.has(i) ? " sel" : ""),
        x: m.l + step * (i + 0.5), y: m.t + ph + 20, "text-anchor": "middle",
      }, mo.short));
    });
  }

  function drawLine(el, { series, selected, fmt, fmtTick, extraRows, label }) {
    const W = Math.max(el.clientWidth - 18, 260), H = 272;
    const narrow = W < 520;
    const m = { t: 16, r: narrow ? 12 : 62, b: 30, l: 52 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / N;
    const x = (i) => m.l + step * (i + 0.5);
    const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((se) => se.values)));
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
    const W = Math.max(el.clientWidth - 18, 260), H = 252;
    const m = { t: 22, r: 10, b: 30, l: 48 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / N;
    const k = series.length, gap = 2;
    const colW = Math.max(3, Math.min(24, (step * 0.62 - gap * (k - 1)) / k));
    const groupW = colW * k + gap * (k - 1);
    const maxV = Math.max(0, ...series.flatMap((se) => se.values));
    const { top, ticks } = niceScale(maxV, 4, integer);
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
      const bar = h("div", { class: `hb-bar k-${k}`, style: `--p:${(it.value / max).toFixed(4)}` });
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

  /* ---------- data tables ---------- */
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
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = h("a", { href: URL.createObjectURL(blob), download: `${this.cfg.name}-${SEL.short.replace(/\s+/g, "-").toLowerCase()}.csv` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  }

  const uniq = (arr, key) => [...new Set(arr.map((x) => x[key]))].sort();
  const totalSummary = (label = "Total") => (rows) => [`${label} `, h("strong", {}, money(sum(rows)))];

  const TABLES = {
    leads: new DataTable($("#leads-table"), {
      name: "leads", placeholder: "Search contact, company or ID",
      search: ["id", "contact", "company", "owner"],
      filters: [
        { key: "stage", label: "Stage", options: STAGES },
        { key: "source", label: "Source", options: uniq(D.leads, "source") },
        { key: "owner", label: "Owner", options: uniq(D.leads, "owner") },
      ],
      sort: { key: "date", dir: -1 },
      columns: [
        { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
        { key: "id", label: "ID", cls: "id" },
        { key: "contact", label: "Contact", cell: (r) => twoLine(r.contact, r.company) },
        { key: "source", label: "Source" },
        { key: "stage", label: "Stage", cell: (r) => stageCell(r.stage), sortVal: (r) => STAGES.indexOf(r.stage) },
        { key: "owner", label: "Owner" },
        { key: "value", label: "Est. value", num: true, cell: (r) => money(r.value) },
      ],
      summary: (rows) => ["Total est. value ", h("strong", {}, money(sum(rows, (r) => r.value)))],
    }),
    sales: new DataTable($("#sales-table"), {
      name: "sales-invoices", placeholder: "Search invoice or customer",
      search: ["id", "customer", "category"],
      filters: [
        { key: "category", label: "Category", plural: "categories", options: uniq(D.sales, "category") },
        { key: "status", label: "Status", plural: "statuses", options: ["Paid", "Partially paid", "Unpaid"] },
      ],
      sort: { key: "date", dir: -1 },
      columns: [
        { key: "date", label: "Date", cell: (r) => fdate(r.date), cls: "muted" },
        { key: "id", label: "Invoice", cls: "id" },
        { key: "customer", label: "Customer", cls: "strong" },
        { key: "category", label: "Category" },
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
      tabs: { key: "type", label: "Advance type", options: [{ value: "All", label: "All" }, { value: "Received", label: "Received from clients" }, { value: "Paid", label: "Paid to suppliers" }] },
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

  /* ---------- sections ---------- */
  const V = {}; // view-model shared with chart draw functions

  function renderOverview() {
    const M = metrics(SEL.keys);
    const P = SEL.prev ? metrics(SEL.prev.keys) : null;
    V.M = M;

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
        row("Cost of goods sold", minus(M.cogs)),
        row("Gross profit", money(M.gross), "sub", M.revenue ? M.gross / M.revenue : null),
        row("Operating expenses", minus(M.opex)),
        row("Net profit", M.net < 0 ? "−" + money(-M.net) : money(M.net), "net")),
      h("div", { class: "pnl-meter" },
        h("div", { class: "pnl-meter-cap" }, h("span", {}, "Net margin"), h("strong", {}, pct(margin))),
        h("div", { class: "meter", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(margin * 100), "aria-label": "Net margin" },
          h("span", { style: `--p:${Math.max(0, Math.min(1, margin)).toFixed(4)}` }))));
  }

  function renderLeads() {
    const M = V.M;
    const P = SEL.prev ? metrics(SEL.prev.keys) : null;
    const open = M.leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const wonValue = sum(M.won, (l) => l.value);
    statStrip($("#leads-stats"), [
      { label: "Leads captured", value: num(M.leads.length), foot: compare(M.leads.length, P && P.leads.length) || SEL.range },
      { label: "Won", value: num(M.won.length), foot: `${money(wonValue)} in value` },
      { label: "Win rate", value: pct(M.winRate), foot: compare(M.winRate, P && P.winRate, { pts: true }) || "Won ÷ (won + lost)" },
      { label: "Open pipeline", value: moneyC(sum(open, (l) => l.value)), title: money(sum(open, (l) => l.value)), foot: `${num(open.length)} open leads` },
      { label: "Avg. won deal", value: M.won.length ? moneyC(wonValue / M.won.length) : "—", foot: "Estimated value" },
    ]);

    const byStage = STAGES.map((st) => {
      const rows = M.leads.filter((l) => l.stage === st);
      return { label: st, value: rows.length, muted: st === "Lost", extra: [{ value: money(sum(rows, (l) => l.value)), label: "est. value" }] };
    });
    V.stages = byStage;
    const bySource = [...groupSum(M.leads, (l) => l.source, () => 1)].map(([label, value]) => {
      const won = M.leads.filter((l) => l.source === label && l.stage === "Won").length;
      return { label, value, extra: [{ value: num(won), label: `won (${pct(won / value)})` }] };
    }).sort((a, b) => b.value - a.value);
    V.sources = bySource;
    V.reps = [...groupSum(M.won, (l) => l.owner, (l) => l.value)].map(([label, value]) => ({
      label, value, extra: [{ value: num(M.won.filter((l) => l.owner === label).length), label: "deals won" }],
    })).sort((a, b) => b.value - a.value);

    TABLES.leads.setRows(M.leads);
  }

  function renderSales() {
    const M = V.M;
    const P = SEL.prev ? metrics(SEL.prev.keys) : null;
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
      label, value, extra: [{ value: num(M.sales.filter((x) => x.category === label).length), label: "invoices" }],
    })).sort((a, b) => b.value - a.value);
    V.customers = [...groupSum(M.sales, (x) => x.customer)].map(([label, value]) => ({
      label, value, extra: [{ value: num(M.sales.filter((x) => x.customer === label).length), label: "invoices" }],
    })).sort((a, b) => b.value - a.value).slice(0, 7);
    TABLES.sales.setRows(M.sales);
  }

  function renderExpenses() {
    const M = V.M;
    const P = SEL.prev ? metrics(SEL.prev.keys) : null;
    const cats = [...groupSum(M.exps, (e) => e.category)].map(([label, value]) => ({
      label, value, extra: [{ value: pct(value / (M.revenue || 1)), label: "of revenue" }],
    })).sort((a, b) => b.value - a.value);
    V.expenseCats = cats;
    const monthsInSel = SEL.idx.length;
    statStrip($("#expense-stats"), [
      { label: "Total expenses", value: moneyC(M.expenses), title: money(M.expenses), foot: compare(M.expenses, P && P.expenses, { upGood: false }) || SEL.range },
      { label: "Largest category", value: cats[0] ? cats[0].label : "—", title: cats[0] ? cats[0].label : null, foot: cats[0] ? `${money(cats[0].value)} · ${pct(cats[0].value / M.expenses)}` : "" },
      { label: "Expenses ÷ revenue", value: M.revenue ? pct(M.expenses / M.revenue) : "—", foot: "Lower is better" },
      { label: "Avg. per month", value: moneyC(M.expenses / monthsInSel), title: money(M.expenses / monthsInSel), foot: `${monthsInSel} month${monthsInSel > 1 ? "s" : ""}` },
      { label: "Entries", value: num(M.exps.length), foot: "Expense records" },
    ]);
    TABLES.expenses.setRows(M.exps);
  }

  function advanceRows(keys) {
    return inK(D.advances, keys).map((a) => {
      const balance = Math.max(0, a.amount - a.recovered);
      return {
        ...a,
        balance,
        share: a.contractValue ? a.amount / a.contractValue : NaN,
        recPct: a.amount ? a.recovered / a.amount : 0,
        status: balance <= 0 ? "Fully recovered" : a.recovered > 0 ? "Partially recovered" : "Open",
      };
    });
  }

  function renderAdvances() {
    const rows = advanceRows(SEL.keys);
    const rec = rows.filter((a) => a.type === "Received"), paid = rows.filter((a) => a.type === "Paid");
    statStrip($("#advance-stats"), [
      { label: "Received from clients", value: moneyC(sum(rec)), title: money(sum(rec)), foot: `${num(rec.length)} advance${rec.length === 1 ? "" : "s"}` },
      { label: "Client advances to recover", value: moneyC(sum(rec, (a) => a.balance)), title: money(sum(rec, (a) => a.balance)), foot: "Still to offset on invoices" },
      { label: "Paid to suppliers", value: moneyC(sum(paid)), title: money(sum(paid)), foot: `${num(paid.length)} purchase order${paid.length === 1 ? "" : "s"}` },
      { label: "Supplier advances open", value: moneyC(sum(paid, (a) => a.balance)), title: money(sum(paid, (a) => a.balance)), foot: "Not yet offset on bills" },
    ]);
    TABLES.advances.setRows(rows);
  }

  function fsCalc(f) {
    const final = f.contractValue + f.variations;
    const balance = final - f.advance - f.interimPaid - f.penalties;
    const outstanding = Math.max(0, balance - f.amountPaid);
    const collected = f.advance + f.interimPaid + f.amountPaid;
    const due = final - f.penalties;
    return { final, balance, outstanding, collected, due, pctCollected: due ? collected / due : 0 };
  }

  function renderSettlement() {
    const list = inK(D.settlements, SEL.keys, "settlementDate").sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
    const calcs = list.map(fsCalc);
    const settled = list.filter((f) => f.status === "Settled").length;
    statStrip($("#settlement-stats"), [
      { label: "Projects closed", value: num(list.length), foot: `${num(settled)} fully settled` },
      { label: "Final contract value", value: moneyC(sum(calcs, (c) => c.final)), title: money(sum(calcs, (c) => c.final)), foot: "Incl. approved variations" },
      { label: "Collected to date", value: moneyC(sum(calcs, (c) => c.collected)), title: money(sum(calcs, (c) => c.collected)), foot: "Advance + interim + final" },
      { label: "Outstanding", value: moneyC(sum(calcs, (c) => c.outstanding)), title: money(sum(calcs, (c) => c.outstanding)), foot: "Balance still to receive" },
    ]);

    const listEl = $("#fs-list"), doc = $("#statement");
    if (!list.length) {
      listEl.replaceChildren();
      doc.replaceChildren(emptyState("No final settlements in this period", "Pick a later quarter or Year to date to see closing statements."));
      return;
    }
    if (!list.some((f) => f.id === state.fs)) state.fs = list[0].id;

    const items = list.map((f, i) => {
      const c = calcs[i];
      const b = h("button", { class: "fs-item", type: "button", role: "option", "aria-selected": String(f.id === state.fs), "data-id": f.id, tabindex: f.id === state.fs ? 0 : -1 },
        h("span", { class: "fs-item-top" },
          h("span", {}, h("span", { class: "fs-item-name" }, f.project), h("br"), h("span", { class: "fs-item-client" }, f.client)),
          badge(f.status)),
        h("span", { class: "meter", "aria-hidden": "true" }, h("span", { style: `--p:${Math.min(1, c.pctCollected).toFixed(4)}` })),
        h("span", { class: "fs-item-amt" }, h("span", {}, `Final ${moneyC(c.final)}`), h("span", {}, c.outstanding > 0 ? `Due ${moneyC(c.outstanding)}` : "Nothing due")));
      b.addEventListener("click", () => { state.fs = f.id; renderSettlement(); $(`.fs-item[data-id="${f.id}"]`).focus(); });
      b.addEventListener("keydown", (e) => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const nx = list[Math.max(0, Math.min(list.length - 1, i + d))];
        state.fs = nx.id; renderSettlement(); $(`.fs-item[data-id="${nx.id}"]`).focus();
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

    doc.replaceChildren(
      h("div", { class: "st-head" },
        h("div", {},
          h("div", { class: "st-kicker" }, "Final settlement statement"),
          h("h3", { class: "st-title" }, f.project),
          h("p", { class: "st-company" }, `${C.name} → ${f.client}`)),
        h("div", { class: "st-no" }, h("span", { class: "id" }, f.id), badge(f.status), h("div", { class: "st-actions" }, printBtn))),
      h("div", { class: "st-meta" },
        h("div", {}, h("span", {}, "Client"), h("strong", {}, f.client)),
        h("div", {}, h("span", {}, "Contract start"), h("strong", {}, fdate(f.startDate))),
        h("div", {}, h("span", {}, "Completion"), h("strong", {}, fdate(f.completionDate))),
        h("div", {}, h("span", {}, "Settlement date"), h("strong", {}, fdate(f.settlementDate)))),
      h("div", { class: "st-lines" },
        line("Original contract value", money(f.contractValue)),
        line("Add: approved variations", money(f.variations), "less"),
        line("Final contract value", money(c.final), "total"),
        line("Less: advance payment", minus(f.advance), "less", "Recovered through progress invoices"),
        line("Less: interim payments received", minus(f.interimPaid), "less"),
        line("Less: penalties & deductions", minus(f.penalties), "less"),
        line("Balance due on final settlement", money(c.balance), "grand"),
        line("Paid against settlement", minus(f.amountPaid), "less outstanding"),
        line("Outstanding", money(c.outstanding), "outstanding")),
      h("div", { class: "st-progress" },
        h("div", { class: "st-progress-cap" },
          h("span", {}, "Collected ", h("strong", {}, money(c.collected)), ` of ${money(c.due)}`),
          h("strong", {}, pct(c.pctCollected))),
        h("div", { class: "meter", role: "meter", "aria-label": "Share collected", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(c.pctCollected * 100) },
          h("span", { style: `--p:${Math.min(1, c.pctCollected).toFixed(4)}` }))),
      h("div", { class: "st-sign" },
        h("div", {}, `Prepared by · ${C.preparedBy || ""}`),
        h("div", {}, "Approved by"),
        h("div", {}, `Acknowledged by · ${f.client}`)));
  }

  function renderPayments() {
    const M = V.M;
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
  chart("categories", { fluid: true, draw: (el) => drawHBars(el, V.categories, { fmt: moneyC, unit: "revenue" }), table: () => barTable(V.categories, "Category", money) });
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

  /* ---------- filter UI ---------- */
  const seg = $("#period-seg");
  const monthSel = $("#month-select");
  for (const p of PRESETS) {
    const b = h("button", { type: "button", "data-id": p.id, "aria-pressed": "false" }, p.label);
    b.addEventListener("click", () => { state.preset = p.id; state.month = null; render(); });
    seg.append(b);
  }
  monthSel.append(h("option", { value: "" }, "Single month…"), ...MONTHS.map((m, i) => h("option", { value: String(i) }, m.long)));
  monthSel.addEventListener("change", () => { state.month = monthSel.value === "" ? null : Number(monthSel.value); render(); });

  function syncFilterUI() {
    $$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(state.month == null && b.dataset.id === state.preset)));
    monthSel.value = state.month == null ? "" : String(state.month);
    monthSel.classList.toggle("active", state.month != null);
    const note = $("#filter-note");
    note.replaceChildren("Showing ", h("strong", {}, state.month == null ? `${SEL.short} (${SEL.range})` : SEL.short),
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

  /* ---------- static chrome ---------- */
  function initChrome() {
    document.title = `Commercial Report · ${C.name}`;
    $("#company-name").textContent = C.name;
    $("#foot-company").textContent = C.name;
    $("#eyebrow").textContent = C.name;
    $("#prepared-by").textContent = C.preparedBy || "—";
    $("#as-of").textContent = fdate(C.periodEnd);
    $("#lede").textContent = `${C.tagline || "Commercial report"} — leads, sales, expenses, advances, final settlements and payments for ${rangeLabel(PRESETS[0].idx)}.`;
    $("#foot-period").textContent = `${fdate(C.periodStart)} – ${fdate(C.periodEnd)}`;

    $$("#nav a").forEach((a, i) => {
      a.prepend(icon(a.dataset.icon));
      a.append(h("span", { class: "n" }, String(i + 1).padStart(2, "0")));
    });
    const links = new Map($$("#nav a").map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove("active"));
        const a = links.get(e.target.id);
        if (a) { a.classList.add("active"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      }
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".section").forEach((sec) => io.observe(sec));
    links.get("overview").classList.add("active");

    // Chart / table toggles
    $$(".chart-card").forEach((card) => {
      $$(".view-toggle button", card).forEach((b) => b.addEventListener("click", () => {
        card.dataset.view = b.dataset.view;
        $$(".view-toggle button", card).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawChart(card.dataset.chart);
      }));
    });

    // Redraw SVG charts when their width changes
    const widths = new WeakMap();
    let pending = new Set(), raf = 0;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (widths.get(e.target) === w) continue;
        widths.set(e.target, w);
        pending.add(e.target);
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
    const heroObs = new MutationObserver(() => { if (V.spark) ro.observe(V.spark); });
    heroObs.observe($("#hero"), { childList: true });

    // Theme
    $("#theme-btn").addEventListener("click", () => {
      const root = document.documentElement;
      const current = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("cr-theme", next); } catch (e) { /* storage unavailable */ }
    });

    // Print
    $("#print-btn").addEventListener("click", () => window.print());
    addEventListener("beforeprint", () => { Object.values(TABLES).forEach((t) => { t.printAll = true; t.draw(); }); });
    addEventListener("afterprint", () => {
      document.body.classList.remove("print-statement");
      Object.values(TABLES).forEach((t) => { t.printAll = false; t.draw(); });
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

  initChrome();
  initStateFromURL();
  render();
})();
