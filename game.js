/* ===== army.js ===== */
/* صفحه‌ی ارتش (یگان‌ها، تولید، تحقیق). بعد از اسکریپت اصلی index.html بارگذاری می‌شود و از همان
   تابع‌ها و متغیرهای سراسریِ آن (el, cmEl, cmApi, ECO, GAME, REMOTE, setView, elLoadS, …) استفاده می‌کند.
   با سرور: /api/mil ؛ بدون سرور: همان منطق military.py روی localStorage (حالت محلی). */
(function () {
  "use strict";

  // ---------------- ظاهر (کنار استایل‌های زیرساخت)
  const CSS = `
  .artabs { display: flex; gap: 10px; overflow-x: auto; margin: 0 -14px 12px; padding: 2px 14px 6px; scrollbar-width: none; }
  .artabs::-webkit-scrollbar { display: none; }
  .artab { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 16px;
    color: var(--gold); background: rgba(150,105,30,.12); border: 2px solid rgba(143,168,74,.5); }
  .artab.on { background: linear-gradient(160deg, #f59a3d, #d9701f); border-color: #f59a3d; color: #2a1d00; font-weight: 700; }
  .arhelp { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 16px; color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .arlab { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 0 4px; font-size: 16px; }
  .arlink { display: block; width: 100%; text-align: right; padding: 8px 0 12px; font: inherit; font-size: 14px; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .inbx.tap { cursor: pointer; }
  .inbx .ar-h { display: flex; align-items: center; gap: 8px; color: var(--hint); }
  .aract { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .arres { flex: 1; padding: 14px 8px; font: inherit; font-size: 14px; text-align: center; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .arres.off { color: var(--hint); }
  .arprod { flex: 1.3; padding: 14px 8px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 18px; font-weight: 700; text-align: center;
    color: #4fd9a0; background: rgba(79,217,160,.12); border: 2px solid rgba(79,217,160,.55); }
  .arprod.off { opacity: .5; }
  .ecchip.warn { color: var(--gold); border-color: rgba(143,168,74,.5); }
  .arcitybg { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; background: rgba(0,0,0,.55); }
  .arcity { width: 100%; max-height: 70vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 18px 14px 28px; border-radius: 22px 22px 0 0; background: #121a28; }
  .arcityh { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .arnote { margin-top: 14px; color: #8b909c; font-size: 14px; line-height: 1.8; }
  `;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  // ---------------- جدول‌ها (هم‌اندازه‌ی military.py؛ در حالت سرور فقط برای حالت محلی لازم است)
  const BRANCHES = [["gnd", "زمینی", "🪖"], ["air", "هوایی", "✈️"], ["sea", "دریایی", "🚢"], ["mis", "موشکی", "🚀"], ["def", "پدافند", "📡"], ["sat", "ماهواره", "🛰"]];
  const BASES = { gnd: "armorbase", air: "airport", sea: "port", mis: "missilebase", def: "radar", sat: "space" };
  const UNITS = [
    ["tank", "تانک", "gnd", "🪖", "tankfac", 180000, 30, 600],
    ["launcher", "لانچر موشک", "gnd", "🚛", "tankfac", 200000, 40, 720],
    ["artillery", "پیاده‌نظام", "gnd", "🎯", "tankfac", 50000, 10, 300],
    ["fighter", "جنگنده", "air", "✈️", "airfac", 350000, 55, 900],
    ["bomber", "بمب‌افکن", "air", "🛩", "airfac", 520000, 90, 1200],
    ["heli", "بالگرد جنگی", "air", "🚁", "airfac", 280000, 40, 780],
    ["destroyer", "ناو", "sea", "🚢", "shipyard", 600000, 80, 1500],
    ["submarine", "زیردریایی", "sea", "⚓", "shipyard", 750000, 110, 1800],
    ["frigate", "ناوچه", "sea", "🛥", "shipyard", 350000, 50, 1200],
    ["cruise", "موشک کروز", "mis", "🚀", "missilefac", 250000, 70, 900],
    ["ballistic", "موشک بالستیک", "mis", "☄️", "missilefac", 400000, 120, 1500],
    ["hypersonic", "موشک هایپرسونیک", "mis", "🔥", "missilefac", 700000, 180, 2100],
    ["aadef", "پدافند هوایی", "def", "📡", "airfac", 300000, 40, 900],
    ["amd", "پدافند ضدموشک", "def", "🛡", "airfac", 380000, 55, 1100],
    ["satellite", "ماهواره", "sat", "🛰", "space", 1500000, 0, 3600],
    ["spysat", "ماهواره‌ی جاسوسی", "sat", "🔭", "space", 2500000, 0, 5400],
  ];
  const RANGE = { cruise: 2500, ballistic: 6000, hypersonic: 9000 };   // برد موشک‌ها (کیلومتر)، هم‌اندازه‌ی military.RANGE_KM؛ یگانِ بدونِ برد = نامحدود
  const K = { MAX: 5, DMG: 0.25, COST: 0.20, UP: 0.01, UPS: 0.30, FAC: 0.90, MINP: 30, RMUL: 4, RSECS: 1800 };
  const U = {}; UNITS.forEach(u => { U[u[0]] = u; });
  const r1000 = (n) => Math.floor(n / 1000) * 1000;
  const F = {
    dmg: (k, l) => Math.round(U[k][6] * (1 + K.DMG * (Math.max(1, l) - 1))),
    cost: (k, l) => r1000(U[k][5] * (1 + K.COST * (Math.max(1, l) - 1)) + 1e-6),
    upkeep: (k, l) => Math.round(U[k][5] * K.UP * (1 + K.UPS * (Math.max(1, l) - 1))),
    prod: (k, fl) => Math.max(K.MINP, Math.floor(U[k][7] * 0.25 * Math.pow(K.FAC, Math.max(0, fl - 1)))),   // ×0.25 مثل PROD_TIME_MUL سرور
    rcost: (k, to) => r1000(U[k][5] * K.RMUL * (to - 1)),
    rsecs: (to) => Math.floor(K.RSECS * Math.pow(2, Math.max(0, to - 2))),
  };

  // ---------------- حالت محلی (بدون سرور)
  const LK = () => "ow_mil_" + (typeof season === "undefined" || season === null ? "x" : season) + "_" + (mine || "") + "_" + (typeof EPK === "undefined" ? "" : EPK);
  let lMem = null;
  function lLoad() {
    if (lMem) return lMem;
    let M = null;
    try { M = JSON.parse(localStorage.getItem(LK()) || "null"); } catch (e) { /* ذخیره‌ی خراب */ }
    return (lMem = M && M.units ? M : { units: {}, queue: [], ts: Math.floor(Date.now() / 1000) });
  }
  function lSave(M) { lMem = M; try { localStorage.setItem(LK(), JSON.stringify(M)); } catch (e) { /* بدون ذخیره */ } }
  // شهرهای مجازِ کشورِ بازیکن (همان فهرست سرور)؛ اگر فرانت قدیمی بود [] یعنی بدون انتخاب شهر
  const lCities = () => (typeof CITY_NAMES !== "undefined" && CITY_NAMES[mine]) || [];
  // کم‌کردنِ q یگان از شمارش شهرها (فروش/آگهی در بازار): اول یگان‌های بدون شهر، بعد شهرِ پرجمعیت‌تر — مثل city_remove در military.py
  function lCityTake(v, q) {
    const by = v.cities || {}, tot = Object.keys(by).reduce((s, c) => s + (by[c] || 0), 0);
    let need = q - Math.max(0, (v.n + q) - tot);   // v.n قبلاً کم شده؛ (v.n + q) تعداد قبل از کم‌کردن
    Object.keys(by).filter(c => by[c] > 0).sort((a, b) => by[b] - by[a]).forEach(c => {
      if (need <= 0) return; const t = Math.min(by[c], need); by[c] -= t; need -= t;
    });
    Object.keys(by).forEach(c => { if (by[c] <= 0) delete by[c]; });
  }
  // افزودنِ q یگانِ خریداری‌شده به شمارش شهر (خرید از بازار)
  function lCityAdd(v, q, city) {
    if (!city || q < 1) return;
    v.cities = v.cities || {}; v.cities[city] = (v.cities[city] || 0) + q;
  }
  const lUp = (M) => Object.keys(M.units).reduce((s, k) => s + M.units[k].n * F.upkeep(k, M.units[k].rl), 0);
  function lView(S, M, now) {
    const lv = S.lv, name = (k) => elIBy[k][1];
    const capR = lv.lab ? Math.min(K.MAX, lv.lab + 1) : 1;
    const used = {}, power = {}, count = {}, fbusy = {};
    UNITS.forEach(([k, , br, , fac]) => {
      const v = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 }, q = M.queue.filter(o => o.unit === k).length;
      power[br] = (power[br] || 0) + v.n * F.dmg(k, v.rl); count[br] = (count[br] || 0) + v.n; used[br] = (used[br] || 0) + v.n + q + ((M.esc || {})[k] || 0);   // یگانِ داخل آگهی هنوز جا می‌گیرد
      fbusy[fac] = (fbusy[fac] || 0) + q;
    });
    const units = UNITS.map(([k, nm, br, ic, fac, , , s0]) => {
      const v = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 }, rl = v.rl, fl = lv[fac] || 0;
      const cap = Math.floor(elIBy[BASES[br]][5] * (lv[BASES[br]] || 0)), line = Math.floor(elIBy[fac][5] * fl), price = F.cost(k, rl);
      const why = fl < 1 ? "fac" : used[br] >= cap ? "slots" : (fbusy[fac] || 0) >= line ? "line" : S.cash < price ? "cash" : null;
      const nx = rl + 1;
      const rw = U[k][6] === 0 ? "na" : v.rts ? "busy" : !lv.lab ? "lab" : rl >= K.MAX ? "max" : nx > capR ? "cap" : S.cash < F.rcost(k, nx) ? "cash" : null;
      return {
        key: k, name: nm, branch: br, icon: ic, n: v.n, queued: M.queue.filter(o => o.unit === k).length, level: rl, max: K.MAX,
        dmg: F.dmg(k, rl), range: RANGE[k] || 0, cost: price, secs: fl ? F.prod(k, fl) : s0, upkeep: F.upkeep(k, rl),
        fac: { key: fac, name: name(fac), level: fl }, can: why === null, why,
        queue: M.queue.filter(o => o.unit === k).map(o => ({ until: o.until, secs: o.dur, city: o.city || "" })),
        by_city: Object.keys(v.cities || {}).reduce((a, c) => { if (v.cities[c] > 0) a[c] = v.cities[c]; return a; }, {}),
        research: { to: rl < K.MAX ? nx : null, cost: rl < K.MAX ? F.rcost(k, nx) : null, secs: rl < K.MAX ? F.rsecs(nx) : null,
          can: rw === null, why: rw, until: v.rts || null, dur: v.rdur || null },
      };
    });
    const branches = BRANCHES.map(([k, nm, ic]) => ({ key: k, name: nm, icon: ic, power: power[k] || 0, count: count[k] || 0, used: used[k] || 0,
      cap: Math.floor(elIBy[BASES[k]][5] * (lv[BASES[k]] || 0)), base: BASES[k], base_name: name(BASES[k]), base_level: lv[BASES[k]] || 0 }));
    return { now, cash: S.cash, cities: lCities(), units, branches, lab: lv.lab || 0, lab_cap: capR,
      power: Object.keys(power).reduce((s, k) => s + power[k], 0), count: Object.keys(count).reduce((s, k) => s + count[k], 0), upkeep: lUp(M) };
  }
  function lSync(now) {
    const S = elSync(elLoadS(), now), M = lLoad();
    const due = lUp(M) * Math.max(0, now - M.ts) / 86400;
    if (due >= 1) { const take = Math.min(S.cash, Math.floor(due)); S.cash -= take; M.ts = take >= Math.floor(due) ? now : M.ts + Math.floor(take * 86400 / lUp(M)); } else if (!lUp(M)) M.ts = now;
    M.queue.filter(o => o.until <= now).forEach(o => {
      const v = (M.units[o.unit] = M.units[o.unit] || { n: 0, rl: 1, rts: 0, rdur: 0 }); v.n++;
      if (o.city) { v.cities = v.cities || {}; v.cities[o.city] = (v.cities[o.city] || 0) + 1; }   // مستقر شدن در شهر انتخاب‌شده
    });
    M.queue = M.queue.filter(o => o.until > now);
    Object.keys(M.units).forEach(k => { const v = M.units[k]; if (v.rts && v.rts <= now) { v.rl = Math.min(K.MAX, v.rl + 1); v.rts = 0; v.rdur = 0; } });
    return { S, M };
  }
  // هزینه‌ی جابه‌جایی بین شهرها: مالی برای همه‌ی یگان‌ها + نفت برای ماشین‌های جنگی (همان move_quote در military.py)
  const MV = { RATE: 0.004, MIN_KM: 150, OIL: { gnd: 8, air: 14, sea: 12, mis: 5, def: 4 } };
  function lMoveKm(from, to) {   // فاصله‌ی هوایی دو شهر؛ مبدأ خالی = پایتخت
    const pts = (typeof CITY_DATA !== "undefined" && CITY_DATA[mine]) || [];
    const at = (n) => pts.find(c => c[0] === n) || pts[0], a = at(from), b = at(to);
    if (!a || !b) return 0;
    const r = Math.PI / 180, dp = (b[1] - a[1]) * r, dl = (b[2] - a[2]) * r;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dl / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))));
  }
  function lMoveQuote(k, rl, q, km) {
    const kk = Math.max(km, MV.MIN_KM), br = UNITS.find(u => u[0] === k)[2];
    return { km, money: Math.max(1, Math.ceil(F.cost(k, rl) * MV.RATE * kk / 1000 * q - 1e-9)),
      oil: br === "sat" ? 0 : Math.ceil((MV.OIL[br] || 0) * q * kk / 1000 - 1e-9) };
  }
  function localApi(path, body) {
    const now = Math.floor(Date.now() / 1000), { S, M } = lSync(now);
    const row = () => lView(S, M, now).units.find(u => u.key === (body && body.unit));
    if (path === "/api/mil/move") {   // جابه‌جایی یگان بین شهرها (مثل relocate در military.py)
      const k = body && body.unit; if (!UNITS.some(u => u[0] === k)) throw new Error("یگان نامعتبر است.");
      if (UNITS.some(u => u[0] === k && (u[2] === "mis" || u[2] === "def" || u[2] === "sat"))) throw new Error("این یگان ثابت است و جابه‌جا نمی‌شود.");
      const cs = lCities(), from = String(body.from || ""), to = String(body.to || ""), q = Math.floor(Number(body.n));
      if (!(q >= 1)) throw new Error("تعداد یگان را درست وارد کنید.");
      if (!to || (cs.length && (cs.indexOf(to) < 0 || (from && cs.indexOf(from) < 0)))) throw new Error("شهر را از فهرست شهرهای کشور خود انتخاب کنید.");
      if (from === to) throw new Error("مبدأ و مقصد یکی است.");
      const v = (M.units[k] = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 }), by = (v.cities = v.cities || {});
      const have = from ? (by[from] || 0) : Math.max(0, v.n - Object.keys(by).reduce((a, c) => a + (by[c] || 0), 0));
      if (have < q) throw new Error("در مبدأ فقط " + have + " یگان دارید.");
      const quote = lMoveQuote(k, v.rl, q, lMoveKm(from, to)), oilHave = Math.floor((S.st && S.st.oil) || 0);
      if (body.dry) return { quote, cash: S.cash, oil: oilHave };
      if (S.cash < quote.money) throw new Error("هزینه‌ی جابه‌جایی $" + en(quote.money) + " است و موجودی خزانه کافی نیست.");
      if (oilHave < quote.oil) throw new Error("نفت برای جابه‌جایی کافی نیست: " + en(quote.oil) + " نفت لازم است و شما " + en(oilHave) + " دارید.");
      S.cash -= quote.money; if (S.st) S.st.oil -= quote.oil;
      if (from) { by[from] -= q; if (by[from] <= 0) delete by[from]; }
      by[to] = (by[to] || 0) + q;
      elSave(S); lSave(M); const vw = lView(S, M, now); vw.moved = quote; return vw;
    }
    if (path === "/api/mil/produce" || path === "/api/mil/research") {
      const r = row(); if (!r) throw new Error("یگان نامعتبر است.");
      if (path.endsWith("produce")) {
        if (r.why) throw new Error(WHY[r.why](r));
        const cs = lCities(), city = String((body && body.city) || "");
        if (cs.length && cs.indexOf(city) < 0) throw new Error("شهر مستقر شدن را انتخاب کنید.");
        S.cash -= r.cost; M.queue.push({ unit: r.key, until: now + r.secs, dur: r.secs, city });
      } else {
        const q = r.research; if (!q.can) throw new Error(RWHY[q.why]);
        S.cash -= q.cost; const v = (M.units[r.key] = M.units[r.key] || { n: 0, rl: 1, rts: 0, rdur: 0 }); v.rts = now + q.secs; v.rdur = q.secs;
      }
      elSave(S); lSave(M); return lView(S, M, now);
    }
    elSave(S); lSave(M); return lView(S, M, now);
  }

  // ---------------- پیام‌ها
  const WHY = {
    fac: (r) => "اول " + r.fac.name + " را بسازید.",
    slots: (r) => "جای نگهداری پر است؛ " + (BRANCHES.length && U[r.key] ? elIBy[BASES[r.branch]][1] : "پایگاه") + " را ارتقا دهید.",
    line: () => "صف تولید پر است؛ صبر کنید یا کارخانه را ارتقا دهید.",
    cash: () => "موجودی خزانه کافی نیست.",
    men: (r) => { const m = AR.d && AR.d.manpower; return "نیروی انسانی آزاد کافی نیست" + (m ? ": " + en(r.crew) + " نفر لازم است و " + en(m.free) + " نفر آزاد دارید" : "") + "؛ صبر کنید تا نیروها برگردند یا اقتصاد و رضایت مردم را بهتر کنید."; },
  };
  const RWHY = { na: "این یگان تحقیق‌پذیر نیست.", busy: "تحقیق این یگان در حال انجام است.", lab: "آزمایشگاه ندارید.", max: "این یگان به بالاترین سطح رسیده است.",
    cap: "سطح آزمایشگاه اجازه‌ی تحقیق بیشتر را نمی‌دهد؛ آزمایشگاه را ارتقا دهید.", cash: "موجودی خزانه کافی نیست." };

  // ---------------- وضعیت صفحه
  const AR = { d: null, err: "", busy: false, br: "gnd", skew: 0, rl: 0 };
  const arNow = () => Date.now() + AR.skew;
  // نیروهای مستقر در هر شهر برای نمایش روی نقشه: { شهر: { total, units: [{key, name, icon, n}] } }
  const STN = { map: {}, ts: 0, busy: false };
  function stationsOf(d) {
    const out = {};
    const isSatKey = (k) => UNITS.some(v => v[0] === k && v[2] === "sat");   // ماهواره یگانِ نظامی نیست: روی نقشه نشان داده نمی‌شود
    ((d && d.units) || []).forEach(u => isSatKey(u.key) ? 0 : Object.keys(u.by_city || {}).forEach(ct => {
      const n = u.by_city[ct]; if (!(n > 0)) return;
      const st = out[ct] = out[ct] || { total: 0, units: [], armies: [] };
      st.total += n; st.units.push({ key: u.key, name: u.name, icon: u.icon, n });
    }));
    // ارتش‌های جدای هر شهر (کنار هم، ادغام‌نشده): نقشه برای هر کدام یک نشان می‌کشد
    const nm = {}; ((d && d.units) || []).forEach(u => { nm[u.key] = u; });
    ((d && d.armies) || []).forEach(a => {
      const st = out[a.city]; if (!st) return;
      const us = Object.keys(a.units).filter(k => !isSatKey(k)).map(k => ({ key: k, name: (nm[k] || {}).name || k, icon: (nm[k] || {}).icon || "🪖", n: a.units[k] }));
      if (!us.length) return;   // ارتشی که فقط ماهواره دارد نشان نمی‌گیرد
      st.armies.push({ id: a.id, label: a.label, n: us.reduce((x, y) => x + y.n, 0), units: us });
    });
    return out;
  }
  function arApply(d) {
    AR.d = d; AR.err = ""; AR.skew = d.now * 1000 - Date.now();
    if (d.spy) AR.spy = d.spy;   // دیدِ ماهواره‌ای فقط از /api/mil می‌آید؛ جواب بقیه‌ی درخواست‌ها آن را پاک نکند
    GAME.cash = d.cash; GAME.power = d.power;
    STN.map = stationsOf(d); STN.ts = Date.now();
  }
  // سفرهای در حال انجام برای نقشه؛ هر گروه = یک مبدأ/مقصد/زمان. زمان‌ها ثانیه‌ی سرور هستند (AR.skew اختلاف ساعت را جبران می‌کند)
  function transits() {
    const out = {};
    ((AR.d && AR.d.transit) || []).forEach(t => {
      const k = t.from + ">" + t.to + ">" + t.depart + ">" + t.arrive;
      const o = out[k] = out[k] || { from: t.from, to: t.to, depart: t.depart, arrive: t.arrive, n: 0, route: t.route || [], fp: t.from_pt || null, tp: t.to_pt || null };   // fp/tp = مختصات [عرض، طول] از سرور (برای شهرهای خارجی)
      o.n += t.n;
    });
    return Object.keys(out).map(k => out[k]);
  }
  const srvNow = () => (Date.now() + (AR.skew || 0)) / 1000;
  const spy = () => AR.spy || { level: 0, forces: [] };   // نیروی دشمن که ماهواره‌ها نشان می‌دهند (برای نقشه)
  // شهرهای فتح‌شده (بعد از صلح تحمیلی): جزو خاک من‌اند ولی در فهرست پایه‌ی کشورم نیستند؛ برای نقشه
  const conquered = () => { const base = (typeof CITY_NAMES !== "undefined" && CITY_NAMES[mine]) || [], cs = (AR.d && AR.d.cities) || []; return cs.filter(x => base.indexOf(x) < 0); };
  function stations() {   // نقشه هر فریم صدا می‌زند؛ حداکثر هر ~20 ثانیه یک بار از سرور تازه می‌شود (بعد از رسیدن یک سفر، زودتر)
    const arrived = ((AR.d && AR.d.transit) || []).some(t => t.arrive <= srvNow());
    if (!STN.busy && Date.now() - STN.ts > (arrived ? 4000 : 20000)) {
      STN.busy = true; STN.ts = Date.now();
      cmCall("/api/mil", undefined, localApi).then(arApply).catch(() => {}).then(() => { STN.busy = false; });
    }
    return STN.map;
  }
  async function load() {
    try { arApply(await cmCall("/api/mil", undefined, localApi)); } catch (e) { AR.err = e.message; }
    if (view === "army") build();
  }
  async function act(path, body, okMsg) {
    if (AR.busy) return;
    AR.busy = true;
    try {
      const d = await cmCall(path, body, localApi);
      arApply(d);
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      toast(d.moved ? (d.moved.secs ? "راهی شد 🚚 · ⏱ " + dur(d.moved.secs * 1000) + " · " : okMsg + " · ") + moveCostText(d.moved.money, d.moved.oil) : okMsg);
      ecoLoad();   // خزانه‌ی اقتصاد و زیرساخت هم تازه شود
    } catch (e) { toast(e.message); load(); }
    AR.busy = false; if (view === "army") build();
  }
  function openInfra(cat) { INF.cat = cat; setView("infra"); }

  // ---------------- ساخت صفحه
  function panel(title, big) {
    const p = cmEl("div", "ecpanel"), h = cmEl("div", "inh");
    h.appendChild(title); if (big != null) h.appendChild(cmEl("span", "bg", big));
    p.appendChild(h); return p;
  }
  const bold = (t) => cmEl("b", null, t);
  function unitCard(d, u) {
    const own = u.n > 0, card = cmEl("div", "ecitem " + (own ? "own" : "off") + (u.queue.length ? " bld" : "") + (u.can ? " can" : ""));
    const top = cmEl("div", "top");
    top.appendChild(cmEl("div", "ic", u.icon));
    const mid = cmEl("div", "mid"); mid.appendChild(cmEl("div", "nm", u.name));
    const pips = cmEl("div", "ecpips"); for (let i = 0; i < u.max; i++) pips.appendChild(cmEl("i", i < u.level ? "on" : ""));
    mid.appendChild(pips); top.appendChild(mid);
    const sx = cmEl("div", "st");
    if (own || u.queued) { sx.appendChild(cmEl("b", null, en(u.n))); sx.append(u.queued ? "+ " + en(u.queued) + " در راه" : "یگان"); } else sx.append("ندارید");
    top.appendChild(sx); card.appendChild(top);

    const chips = cmEl("div", "ecchips");
    if (u.dmg) chips.appendChild(cmEl("span", "ecchip", "⚔ آسیب " + en(u.dmg)));
    if (u.range) chips.appendChild(cmEl("span", "ecchip", "🎯 برد " + en(u.range) + " کیلومتر"));
    chips.appendChild(cmEl("span", "ecchip", "🔧 ساخت $" + en(u.cost)));
    if (u.fac.level < 1) chips.appendChild(cmEl("span", "ecchip warn", "🏭 " + u.fac.name + " نداریم"));
    else chips.appendChild(cmEl("span", "ecchip", "⏱ " + bdur(u.secs)));
    const inCity = Object.keys(u.by_city || {}).reduce((a, k) => a + u.by_city[k], 0);
    if (u.n > inCity) chips.appendChild(cmEl("span", "ecchip", "📍 بدون شهر: " + en(u.n - inCity)));   // خرید بازار / قبل از این قابلیت
    Object.keys(u.by_city || {}).forEach(ct => chips.appendChild(cmEl("span", "ecchip", (isSea(ct) ? "🌊 " + seaName(ct) : "📍 " + ct) + ": " + en(u.by_city[ct]))));
    if (own) chips.appendChild(cmEl("span", "ecchip", "🔧 نگهداری $" + en(u.upkeep * u.n) + " در روز"));
    if (u.crew) chips.appendChild(cmEl("span", "ecchip" + (u.why === "men" ? " warn" : ""), "👥 خدمه " + en(u.crew) + " نفر" + (u.recruit ? " · جذب $" + en(u.recruit) : "")));   // نیروی انسانی قابل جذب
    card.appendChild(chips);

    u.queue.forEach(q => card.appendChild(timer("🔨 در حال تولید" + (q.city ? " ← " + seaName(q.city) : ""), q.until, q.secs)));
    if (u.research.until) card.appendChild(timer("🔬 تحقیق سطح " + u.research.to, u.research.until, u.research.dur));

    const row = cmEl("div", "aract"), r = u.research;
    const rb = cmEl("button", "arres" + (r.can ? "" : " off")); rb.type = "button";
    rb.textContent = r.why === "na" ? "—" : r.why === "lab" ? "آزمایشگاه ندارید" : r.why === "busy" ? "⏳ در حال تحقیق…" : r.why === "max" ? "حداکثر سطح ✅"
      : r.why === "cap" ? "آزمایشگاه بالاتر لازم است" : "🔬 تحقیق سطح " + r.to + " · $" + en(r.cost);
    rb.onclick = () => r.can ? act("/api/mil/research", { unit: u.key }, "تحقیق شروع شد ✅") : toast(RWHY[r.why] || "");
    const pb = cmEl("button", "arprod" + (u.can ? "" : " off"), "⚙ تولید"); pb.type = "button";
    pb.onclick = () => {
      if (!u.can) return toast(WHY[u.why](u));
      // اول تعداد، بعد شهرِ استقرار را بپرس (تعدادِ بیشتر از یک فقط با سرور؛ حالت محلی یکی‌یکی می‌سازد)
      const go = (n) => {
        const run = (city) => act("/api/mil/produce", city === undefined ? { unit: u.key, n } : { unit: u.key, city, n }, n > 1 ? n + " یگان در صف تولید رفت ✅" : "تولید شروع شد ✅");
        if (isNaval(u.key) && d.waters) {   // ناو فقط در دریاهای کشور خودتان
          if (!d.waters.length) return toast("کشور شما به دریا ساحل ندارد؛ نیروی دریایی نمی‌تواند داشته باشید.");
          return askPick(d.waters.map(w => [w.id, "🌊 " + w.name]), run, "🌊 ناو در کدام دریا مستقر شود؟");
        }
        if (d.cities && d.cities.length) { const oc = d.occupied || []; askCity(d.cities.concat(oc.filter(x => d.cities.indexOf(x) < 0)), run, null, oc); } else run();
      };
      const mx = u.max_qty;
      if (REMOTE && mx > 1) askQty(mx, go, "چند " + u.name + " تولید شود؟ (حداکثر " + en(mx) + ")" + (u.crew ? " · هر کدام " + en(u.crew) + " نفر خدمه" : "") + (u.lines > 1 ? " · " + en(u.lines) + " خط هم‌زمان" : ""), 1);
      else go(1);
    };
    row.append(rb, pb);
    if (own && u.n > 0 && !isFixed(u.key) && (isNaval(u.key) && d.waters ? d.waters.length > 1 : d.cities && d.cities.length > 1)) {   // جابه‌جایی یگان‌ها بین شهرها (ناو: بین دریاها)
      const mb = cmEl("button", "arres", "📍 جابه‌جایی"); mb.type = "button";
      mb.onclick = () => askMove(u, d.cities);
      row.appendChild(mb);
    }
    card.appendChild(row);
    return card;
  }
  // نیروی دریایی فقط در دریا مستقر می‌شود و حرکت می‌کند (مکان‌هایی مثل sea:PER؛ فهرست مجاز از سرور: d.waters)
  const isSea = (ct) => !!(window.SEA_INFO && window.SEA_INFO[ct]);
  const seaName = (ct) => isSea(ct) ? window.SEA_INFO[ct].name : ct;
  const placeName = (ct) => isSea(ct) ? "🌊 " + seaName(ct) : ct;
  const isNaval = (key) => { const x = UNITS.find(v => v[0] === key); return !!x && x[2] === "sea"; };
  const isFixed = (key) => { const x = UNITS.find(v => v[0] === key); return !!x && (x[2] === "mis" || x[2] === "def" || x[2] === "sat"); };   // موشک، پدافند، ماهواره: ثابت‌اند و جابه‌جا نمی‌شوند
  // پنجره‌ی ساده‌ی انتخاب شهر؛ بعد از انتخاب، onPick(city) صدا زده می‌شود
  function askCity(cities, onPick, title, occ) {   // occ = شهرهای دشمن که اشغال کرده‌اید (🏴)؛ استقرار در آن‌ها هم مجاز است
    const oc = occ || [];
    askPick(cities.map(c => [c, oc.indexOf(c) >= 0 ? "🏴 " + c + " (اشغال‌شده)" : c]), onPick, title || "📍 ارتش در کدام شهر مستقر شود؟");
  }
  // items = [[مقدار، برچسب]]؛ بعد از انتخاب onPick(مقدار) صدا زده می‌شود
  function askPick(items, onPick, title) {
    const bg = cmEl("div", "arcitybg"), box = cmEl("div", "arcity");
    const close = () => bg.remove();
    box.appendChild(cmEl("div", "arcityh", title));
    items.forEach(([v, label]) => {
      const b = cmEl("button", "artab", label); b.type = "button";
      b.onclick = () => { close(); onPick(v); }; box.appendChild(b);
    });
    bg.onclick = (e) => { if (e.target === bg) close(); };
    bg.appendChild(box); document.body.appendChild(bg);
  }
  function askQty(max, onPick, title, def) {
    const bg = cmEl("div", "arcitybg"), box = cmEl("div", "arcity");
    box.appendChild(cmEl("div", "arcityh", title));
    const inp = document.createElement("input"); inp.type = "number"; inp.min = 1; inp.max = max; inp.value = def || max; inp.inputMode = "numeric";
    inp.style.cssText = "width:100%;box-sizing:border-box;padding:10px;margin-bottom:8px;text-align:center;font-size:14px";
    const ok = cmEl("button", "artab okbtn", "تأیید"); ok.type = "button";
    ok.onclick = () => { const q = Math.floor(Number(inp.value)); if (!(q >= 1 && q <= max)) return toast("تعداد باید بین 1 و " + en(max) + " باشد."); bg.remove(); onPick(q); };
    bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
    box.append(inp, ok); bg.appendChild(box); document.body.appendChild(bg);
  }
  const moveCostText = (money, oil) => "هزینه: $" + en(money) + (oil ? " + " + en(oil) + " 🛢 نفت" : "");
  // تأیید هزینه‌ی جابه‌جایی؛ هزینه از خودِ سرور (dry) گرفته می‌شود تا همیشه با قانون سرور یکی باشد. items = [[یگان، تعداد], ...]
  async function confirmMove(items, from, to, go, cancel) {
    let money = 0, oil = 0, km = 0, cash = 0, oilHave = 0, secs = 0, retreat = false, fullMoney = 0, bySea = false;
    try {
      for (const it of items) {
        const r = await cmCall("/api/mil/move", { unit: it[0], from, to, n: it[1], dry: true }, localApi);
        money += r.quote.money; oil += r.quote.oil; km = r.quote.km; secs = Math.max(secs, r.quote.secs || 0); cash = r.cash; oilHave = r.oil; if (r.mode === "sea") bySea = true;
        if (r.quote.retreat) { retreat = true; fullMoney += r.quote.full_money || r.quote.money; }
      }
    } catch (e) { toast(e.message); if (cancel) cancel(); return; }
    // خروج از شهرِ محاصره‌شده به خاک خودی = عقب‌نشینی: هرچه دارید کم می‌شود و اگر نداشته باشید رایگان است (گیر نمی‌افتید)
    const txt = moveCostText(money, oil) + (retreat ? " · 🏳️ عقب‌نشینی" + (fullMoney > money ? " (هزینه‌ی کامل $" + en(fullMoney) + "؛ فقط تا موجودی شما کم می‌شود)" : "") : "") + (km ? " · " + (bySea ? "🌊 مسیر دریایی " : "") + en(km) + " کیلومتر" : "") + (secs ? " · ⏱ " + dur(secs * 1000) + " در راه" : "");
    if (money > cash || oil > oilHave) { toast(txt + " — موجودی خزانه یا نفت کافی نیست."); if (cancel) cancel(); return; }
    askPick([[1, "✅ جابه‌جایی · " + txt], [0, "❌ انصراف"]], (v) => { if (v) go(); else if (cancel) cancel(); }, "🚚 جابه‌جایی ارتش هزینه دارد");
  }
  // مقصدهای مجازِ ارسال نیرو: خاک خودمان + خاک متحدان (🤝) + خاک دشمنِ در جنگ (⚔️)؛ فهرستِ خارجی از سرور می‌آید (d.abroad)
  const abroadCities = () => ((AR.d && AR.d.abroad) || []).reduce((a, g) => a.concat(g.cities.map(ct => ({ city: ct, g }))), []);
  const dstLabel = (ct, extra) => { const a = abroadCities().find(x => x.city === ct); return (a ? (a.g.kind === "ally" ? "🤝 " : "⚔️ ") + ct + " (" + a.g.name + ")" : ct) + (extra || ""); };
  const allCities = (own) => (own || []).concat(abroadCities().map(x => x.city));
  // جابه‌جایی: مبدأ ← مقصد ← تعداد (مبدأ خالی = یگان‌های بدون شهر)
  function askMove(u, cities) {
    const by = u.by_city || {}, inCity = Object.keys(by).reduce((a, k) => a + by[k], 0), free = u.n - inCity - (u.transit_n || 0);
    const src = []; if (free > 0) src.push(["", "بدون شهر (" + en(free) + ")"]);
    Object.keys(by).forEach(c => src.push([c, placeName(c) + " (" + en(by[c]) + ")"]));
    const have = (f) => f ? by[f] : free;
    const nav = isNaval(u.key) && !!(AR.d && AR.d.waters);
    const dsts = (from) => nav ? AR.d.waters.map(w => w.id).filter(c => c !== from) : allCities(cities).filter(c => c !== from);
    const pickDst = (from) => askPick(dsts(from).map(c => [c, nav ? "🌊 " + seaName(c) : dstLabel(c)]), (to) =>
      askQty(have(from), (n) => confirmMove([[u.key, n]], from, to, () => act("/api/mil/move", { unit: u.key, from, to, n }, "جابه‌جا شد ✅")), "چند یگان به " + seaName(to) + " بروند؟"), nav ? "🌊 به کدام دریا منتقل شوند؟ (فقط دریاهای خودتان)" : "📍 به کدام شهر منتقل شوند؟ (خاک خودتان، متحدان 🤝 یا دشمنِ در جنگ ⚔️)");
    if (!src.length) return toast("یگانی برای جابه‌جایی ندارید.");
    if (src.length === 1) return pickDst(src[0][0]);
    askPick(src, pickDst, "📍 از کجا جابه‌جا شوند؟");
  }
  // حرکت ارتش از روی نقشه: from = شهر مبدأ، to = شهر مقصد (هر دو از شهرهای خودمان)
  // درصدی از هر نوع یگانِ شهر from؛ [[یگان، تعداد], ...] (نوع‌هایی که تعدادشان صفر شود حذف می‌شوند)
  const splitItems = (rows, from, pct, army) => rows.map(u => [u.key, Math.floor(armyCnt(u, from, army) * pct / 100)]).filter(x => x[1] > 0);
  // تعداد یگان u در شهر from (from خالی = یگان‌های بدون شهر)
  const cntIn = (u, from) => from ? ((u.by_city || {})[from] || 0) : Math.max(0, u.n - (u.transit_n || 0) - Object.values(u.by_city || {}).reduce((a, b) => a + b, 0));
  // ارتش‌های جدای یک شهر (d.armies: {city, id, label, n, units}؛ id «base» = نیروهای مستقر). army خالی = همه‌ی ارتش‌های شهر
  const armiesIn = (from) => from ? ((AR.d && AR.d.armies) || []).filter(a => a.city === from) : [];
  // تعداد یگان u در شهر from؛ اگر army مشخص باشد فقط در همان ارتش
  const armyCnt = (u, from, army) => army ? ((((armiesIn(from).find(a => a.id === army)) || {}).units || {})[u.key] || 0) : cntIn(u, from);
  // اگر شهر چند ارتش دارد بپرس از کدام ارتش بردارم؛ وگرنه مستقیم cb(null)
  function pickArmy(from, cb) {
    const list = armiesIn(from);
    if (list.length < 2) return cb(null);
    const items = [["*", "🔀 همه‌ی ارتش‌های شهر (" + en(list.reduce((a, x) => a + x.n, 0)) + ")"]];
    list.forEach(a => items.push([a.id, "🪖 " + a.label + " (" + en(a.n) + ")"]));
    askPick(items, (id) => cb(id === "*" ? null : id), "کدام ارتشِ " + from + "؟");
  }
  // لمسِ یک ارتش روی نقشه (وقتی شهر چند ارتش دارد): انتقال یا ادغام با ارتشِ دیگرِ همان شهر
  function armyMenu(city, id) {
    const list = armiesIn(city), me = list.find(a => a.id === id), d = AR.d;
    if (!me || !d) return;
    askPick([["move", "🚚 انتقال این ارتش"], ["merge", "🔗 ادغام با ارتش دیگر"]], (what) => {
      if (what === "move") {
        const sea = isSea(city), dsts = sea ? (d.waters || []).map(w => w.id).filter(c => c !== city) : allCities(d.cities).filter(c => c !== city);
        if (!dsts.length) return toast(sea ? "دریای دیگری برای انتقال نیست." : "شهر دیگری برای انتقال نیست.");
        return askPick(dsts.map(c => [c, sea ? "🌊 " + seaName(c) : dstLabel(c)]), (to) => moveTo(city, to, null, true, 0, null, id), sea ? "🌊 این ناوگان به کدام دریا برود؟" : "📍 این ارتش به کدام شهر برود؟");
      }
      const others = list.filter(a => a.id !== id);
      if (!others.length) return toast("ارتش دیگری در این شهر نیست.");
      askPick(others.map(a => [a.id, "🪖 " + a.label + " (" + en(a.n) + ")"]),
        (b) => act("/api/mil/merge", { city, a: id, b }, "ارتش‌ها ادغام شدند ✅"), "🔗 «" + me.label + "» با کدام ارتش ادغام شود؟");
    }, "🪖 " + seaName(city) + " — " + me.label + " (" + en(me.n) + ")");
  }
  function moveTo(from, to, done, all, pct, picked, army) {
    const fin = () => { if (done) done(); };
    const rows = ((AR.d && AR.d.units) || []).filter(u => !isFixed(u.key) && armyCnt(u, from, army) > 0);
    if (!rows.length) { toast(from ? "در شهر " + from + " یگانی نیست." : "یگانِ بدون شهر ندارید."); return fin(); }
    const run = async (items) => {   // items = [[unit, n], ...]
      if (AR.busy) return fin();
      AR.busy = true;
      let ok = 0, err = "", money = 0, oil = 0, secs = 0;
      const gid = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);   // همه‌ی یگان‌های این انتقال = یک ارتش در مقصد
      for (const it of items) {
        try { const d = await cmCall("/api/mil/move", { unit: it[0], from, to, n: it[1], gid, army: army || undefined }, localApi); arApply(d); ok++; if (d.moved) { money += d.moved.money; oil += d.moved.oil; secs = Math.max(secs, d.moved.secs || 0); } }
        catch (e) { err = e.message; break; }
      }
      AR.busy = false;
      if (tg.HapticFeedback && ok) tg.HapticFeedback.impactOccurred("light");
      // فقط یک پیام: کامل / ناقص (بخشی منتقل شد و بقیه خطا داد) / ناموفق؛ تا دو پیام روی هم نیایند
      toast(ok && err ? "فقط بخشی از ارتش راهیِ " + seaName(to) + " شد ⚠️ · " + moveCostText(money, oil) + " · بقیه نشد: " + err
        : ok ? "ارتش راهیِ " + seaName(to) + " شد 🚚 · " + (secs ? "⏱ " + dur(secs * 1000) + " · " : "") + moveCostText(money, oil) : err || "انتقال انجام نشد.");
      if (ok) ecoLoad(); else load();
      if (view === "army") build();
      fin();
    };
    const ask = (items) => confirmMove(items, from, to, () => run(items), fin);   // اول هزینه را نشان بده و تأیید بگیر
    const one = (u) => askQty(armyCnt(u, from, army), (n) => ask([[u.key, n]]), "چند " + u.name + " از " + (from || "بدون شهر") + " به " + to + " برود؟");
    if (picked) return ask(picked);   // انتخابِ دستیِ نوع و تعداد (transferArmy)
    if (all) return ask(rows.map(u => [u.key, armyCnt(u, from, army)]));   // انتقال کل ارتشِ آن شهر
    if (pct) {   // جدا کردن درصدی از هر نوع یگان (رو به پایین گرد می‌شود)
      const its = splitItems(rows, from, pct, army);
      if (!its.length) { toast("با این درصد یگانی جدا نمی‌شود؛ درصد بیشتری انتخاب کنید."); return fin(); }
      return ask(its);
    }
    if (rows.length === 1) return one(rows[0]);
    const items = [["*", "🔀 همه‌ی یگان‌ها (" + en(rows.reduce((a, u) => a + armyCnt(u, from, army), 0)) + ")"]];
    rows.forEach(u => items.push([u.key, u.icon + " " + u.name + " (" + en(armyCnt(u, from, army)) + ")"]));
    askPick(items, (k) => { if (k === "*") ask(rows.map(u => [u.key, armyCnt(u, from, army)])); else one(rows.find(u => u.key === k)); },
      "ارتشِ " + (from || "بدون شهر") + " ← " + to);
  }
  // دکمه‌ی صفحه‌ی ارتش: کلِ ارتشِ یک شهر (یا یگان‌های بدون شهر) را یک‌جا به شهر دیگر ببر
  function moveArmy() {
    const d = AR.d;
    if (!d || !d.cities || allCities(d.cities).length < 2) return toast("برای انتقال، کشور شما باید دست‌کم دو شهر داشته باشد.");
    const sum = (c) => d.units.reduce((a, u) => a + cntIn(u, c), 0);
    const src = [];
    if (sum("") > 0) src.push(["", "بدون شهر (" + en(sum("")) + ")"]);
    allCities(d.cities).forEach(c => { if (sum(c) > 0) src.push([c, dstLabel(c, " (" + en(sum(c)) + ")")]); });
    if (!src.length) return toast("یگانی برای انتقال ندارید.");
    // شهرهایی که خودشان ارتش دارند اول می‌آیند: ارتشِ رسیده ادغام نمی‌شود و کنار ارتشِ آنجا می‌ماند (قدرتِ دفاعِ شهر جمع می‌شود)
    const pickDst = (from) => askPick(allCities(d.cities).filter(c => c !== from).sort((a, b) => (sum(b) > 0) - (sum(a) > 0))
      .map(c => [c, sum(c) > 0 ? dstLabel(c, " 🔗 کنار ارتش آنجا (" + en(sum(c)) + ")") : dstLabel(c)]), (to) => pickArmy(from, (army) => moveTo(from, to, null, true, 0, null, army)), "📍 کل ارتش به کدام شهر منتقل شود؟ (شهری که ارتش دارد: کنارش می‌نشیند)");
    if (src.length === 1) return pickDst(src[0][0]);
    askPick(src, pickDst, "🚚 ارتشِ کدام شهر منتقل شود؟");
  }
  // دکمه‌ی «انتقال نیرو»: مبدأ ← مقصد ← انتخابِ هم‌زمانِ نوع و تعدادِ هر یگان (چند نوع یگان در یک انتقال)
  function transferArmy() {
    const d = AR.d;
    if (!d || !d.cities || allCities(d.cities).length < 2) return toast("برای انتقال، کشور شما باید دست‌کم دو شهر داشته باشد.");
    const sum = (c) => d.units.reduce((a, u) => a + cntIn(u, c), 0);
    const src = [];
    if (sum("") > 0) src.push(["", "بدون شهر (" + en(sum("")) + ")"]);
    allCities(d.cities).forEach(c => { if (sum(c) > 0) src.push([c, dstLabel(c, " (" + en(sum(c)) + ")")]); });
    if (!src.length) return toast("یگانی برای انتقال ندارید.");
    const pickQty = (from, to, army) => {
      const rows = d.units.filter(u => !isFixed(u.key) && armyCnt(u, from, army) > 0);
      const bg = cmEl("div", "arcitybg"), box = cmEl("div", "arcity");
      box.appendChild(cmEl("div", "arcityh", "🚚 " + (from || "بدون شهر") + " ← " + to));
      box.appendChild(cmEl("div", "arnote", "از هر نوع یگان چند عدد بفرستید؟ (صفر = نفرستید)"));
      const inps = [];
      rows.forEach(u => {
        const have = armyCnt(u, from, army), row = cmEl("div", null);
        row.style.cssText = "display:flex;align-items:center;gap:8px";
        const lab = cmEl("div", null, u.icon + " " + u.name + " (" + en(have) + ")"); lab.style.cssText = "flex:1;font-size:14px";
        const inp = document.createElement("input"); inp.type = "number"; inp.min = 0; inp.max = have; inp.value = 0; inp.inputMode = "numeric";
        inp.style.cssText = "width:84px;box-sizing:border-box;padding:8px;text-align:center;font-size:14px";
        const all = cmEl("button", "artab", "همه"); all.type = "button"; all.style.padding = "8px 12px"; all.onclick = () => { inp.value = have; };
        row.append(lab, inp, all); box.appendChild(row); inps.push([u, inp, have]);
      });
      const go = cmEl("button", "artab", "➡️ ادامه"); go.type = "button";
      go.onclick = () => {
        const items = inps.map(([u, inp, have]) => [u.key, Math.min(have, Math.max(0, Math.floor(Number(inp.value) || 0)))]).filter(x => x[1] > 0);
        if (!items.length) return toast("حداقل از یک نوع یگان تعداد وارد کنید.");
        bg.remove(); moveTo(from, to, null, false, 0, items, army);
      };
      const cancel = cmEl("button", "artab", "❌ انصراف"); cancel.type = "button"; cancel.onclick = () => bg.remove();
      box.append(go, cancel); bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
      bg.appendChild(box); document.body.appendChild(bg);
    };
    const pickDst = (from) => askPick(allCities(d.cities).filter(c => c !== from).map(c => [c, sum(c) > 0 ? dstLabel(c, " 🔗 ارتش دارد (" + en(sum(c)) + ")") : dstLabel(c)]),
      (to) => pickArmy(from, (army) => pickQty(from, to, army)), "📍 به کدام شهر بروند؟");
    if (src.length === 1) return pickDst(src[0][0]);
    askPick(src, pickDst, "🚚 از کدام شهر؟");
  }
  // دکمه‌ی صفحه‌ی ارتش: بخشی از ارتشِ یک شهر را جدا کن و به شهر دیگر بفرست (مثلاً نصف)
  function splitArmy() {
    const d = AR.d;
    if (!d || !d.cities || allCities(d.cities).length < 2) return toast("برای جدا کردن، کشور شما باید دست‌کم دو شهر داشته باشد.");
    const sum = (c) => d.units.reduce((a, u) => a + cntIn(u, c), 0);
    const src = [];
    if (sum("") > 0) src.push(["", "بدون شهر (" + en(sum("")) + ")"]);
    allCities(d.cities).forEach(c => { if (sum(c) > 0) src.push([c, dstLabel(c, " (" + en(sum(c)) + ")")]); });
    if (!src.length) return toast("یگانی برای جدا کردن ندارید.");
    const pickPct = (from, to, army) => {
      const rows = d.units.filter(u => !isFixed(u.key) && armyCnt(u, from, army) > 0);
      const lab = (p, t) => [p, t + " ≈ " + en(splitItems(rows, from, p, army).reduce((a, x) => a + x[1], 0)) + " یگان"];
      askPick([lab(25, "25%"), lab(50, "50% (نصف)"), lab(75, "75%"), [0, "✏️ درصد دلخواه"]], (p) => {
        if (p) return moveTo(from, to, null, false, p, null, army);
        askQty(99, (v) => moveTo(from, to, null, false, v, null, army), "چند درصد از ارتش جدا شود؟ (1 تا 99)", 50);
      }, "✂️ چقدر از ارتشِ " + (from || "بدون شهر") + " به " + to + " برود؟");
    };
    const pickDst = (from) => askPick(allCities(d.cities).filter(c => c !== from).map(c => [c, sum(c) > 0 ? dstLabel(c, " 🔗 ارتش دارد (" + en(sum(c)) + ")") : dstLabel(c)]),
      (to) => pickArmy(from, (army) => pickPct(from, to, army)), "📍 بخش جداشده به کدام شهر برود؟");
    if (src.length === 1) return pickDst(src[0][0]);
    askPick(src, pickDst, "✂️ از ارتشِ کدام شهر جدا شود؟");
  }
  function timer(label, until, secs) {
    const w = cmEl("div", "ecbl"); w.dataset.until = until; w.dataset.secs = secs; w.dataset.ar = "1";
    const t = cmEl("div", "t"); t.append(cmEl("span", null, label), cmEl("span", "r"));
    const bar = cmEl("div", "bar"); bar.appendChild(cmEl("i")); w.append(t, bar); w.style.marginBottom = "4px"; return w;
  }
  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("aavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("acashbar").textContent = "$" + en(GAME.cash);
    const sc = document.scrollingElement, sy0 = sc.scrollTop, body = el("abody"); body.innerHTML = "";
    const box = (t) => body.appendChild(cmEl("div", "rbox dash", t));
    if (!REMOTE) box("📴 حالت محلی: ارتش روی همین گوشی ذخیره و حساب می‌شود؛ با دیگران مشترک نیست.");
    if (!AR.d) { box(AR.err || "در حال بارگذاری ارتش…"); if (!AR.err) load(); return; }
    const d = AR.d;

    // خلاصه‌ی ارتش، آزمایشگاه و پایگاه‌ها
    const t1 = cmEl("span", null); t1.append("🛡 ", bold("ارتش"));
    const q = cmEl("button", "arhelp", "?"); q.type = "button"; q.setAttribute("aria-label", "راهنما");
    q.onclick = () => toast("هر یگان در کارخانه‌ی خودش ساخته می‌شود و در پایگاه نگهداری می‌شود. آزمایشگاه یگان را قوی‌تر می‌کند اما نگهداری روزانه‌اش گران‌تر است و از خزانه کم می‌شود.");
    const p = panel(t1, en(d.power)); p.firstChild.insertBefore(q, p.firstChild.lastChild);
    const lab = cmEl("div", "arlab"); lab.append(cmEl("span", null, "⚗️ آزمایشگاه"), cmEl("span", "mut", d.lab ? "سطح " + d.lab + " · تحقیق تا سطح " + d.lab_cap : "ساخته نشده"));
    p.appendChild(lab);
    const lk = cmEl("button", "arlink", (d.lab ? "ارتقای آزمایشگاه" : "ساخت آزمایشگاه") + " ‹"); lk.type = "button"; lk.onclick = () => openInfra("str"); p.appendChild(lk);
    if (d.cities && d.cities.length > 1) {   // انتقال کلِ ارتش به شهر دیگر
      const tr = cmEl("button", "arlink", "🚚 انتقال نیرو (انتخاب نوع و تعداد) ‹"); tr.type = "button"; tr.onclick = transferArmy; p.appendChild(tr);
      const mv = cmEl("button", "arlink", "🚚 انتقال ارتش به شهر دیگر ‹"); mv.type = "button"; mv.onclick = moveArmy; p.appendChild(mv);
      const sp = cmEl("button", "arlink", "✂️ جدا کردن بخشی از ارتش ‹"); sp.type = "button"; sp.onclick = splitArmy; p.appendChild(sp);
    }
    (d.transit || []).forEach(t => {   // یگان‌های در راه: شمارش معکوس تا رسیدن
      const tm = timer("🚚 " + t.icon + " " + t.name + " ×" + en(t.n) + " · " + seaName(t.from || "بدون شهر") + " ← " + seaName(t.to), t.arrive, Math.max(1, t.arrive - t.depart));
      p.appendChild(tm);
    });
    const g = cmEl("div", "ingrid");
    [["gnd", "🪖"], ["air", "✈️"], ["sea", "🚢"], ["mis", "🚀"], ["def", "📡"]].forEach(([k, ic]) => {
      const b = d.branches.find(x => x.key === k), bx = cmEl("div", "inbx tap");
      const h = cmEl("div", "ar-h"); h.append(ic + " ", b.base_name);
      bx.append(h, bold(b.base_level ? b.used + "/" + b.cap : "—"), cmEl("div", "mut", b.base_level ? "سطح " + b.base_level : "ساخته نشده"));
      bx.onclick = () => openInfra("mil"); g.appendChild(bx);
    });
    p.appendChild(g); body.appendChild(p);

    // نیروی انسانی قابل جذب: سقف از جمعیت، اقتصاد و رضایت؛ جذب یگان از آن کم می‌شود و تلفات به‌مرور برمی‌گردد
    const mp = d.manpower;
    if (mp) {
      const t0 = cmEl("span", null); t0.append("👥 ", bold("نیروی انسانی قابل جذب"));
      const q0 = cmEl("button", "arhelp", "?"); q0.type = "button"; q0.setAttribute("aria-label", "راهنما");
      q0.onclick = () => toast("هر یگان خدمه می‌خواهد. سقف نیرو به جمعیت (" + en(mp.factors.pop) + " نفر پایه)، وضعیت اقتصاد (×" + mp.factors.econ + ") و رضایت مردم (×" + mp.factors.sat + ") بستگی دارد"
        + (mp.factors.hunger ? "؛ گرسنگی آن را کم کرده است" : "") + ". جذب نیرو هزینه دارد و مردمِ کارگر را از کار می‌اندازد: درآمد بخش‌ها و مالیات " + en(mp.labor_hit) + "% کمتر و رضایت " + en(mp.sat_hit) + " امتیاز کمتر. فروش یگان نیرو را برمی‌گرداند؛ تلفات جنگ به‌مرور با رشد جمعیت جبران می‌شود.");
      const pm = panel(t0, en(mp.free) + " نفر آزاد"); pm.firstChild.insertBefore(q0, pm.firstChild.lastChild);
      const bar = cmEl("div", "bar"); bar.style.cssText = "height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0";
      const fill = cmEl("i"); fill.style.cssText = "display:block;height:100%;background:" + (mp.pct > 85 ? "#ff6b5b" : mp.pct > 60 ? "#8fa84a" : "#5fe08a") + ";width:" + Math.min(100, mp.pct + (mp.lost / Math.max(1, mp.cap)) * 100) + "%";
      bar.appendChild(fill); pm.appendChild(bar);
      pm.appendChild(cmEl("div", "sub", "سقف " + en(mp.cap) + " · در خدمت " + en(mp.used) + (mp.lost ? " · تلفات در حال جبران " + en(mp.lost) + (mp.recover_day ? " (روزی ~" + en(mp.recover_day) + " نفر برمی‌گردد)" : "") : "")));
      if (mp.labor_hit || mp.sat_hit) pm.appendChild(cmEl("div", "sub", "⚠ اثر بسیج: درآمد −" + en(mp.labor_hit) + "% · رضایت −" + en(mp.sat_hit)));
      body.appendChild(pm);
    }

    // تب شاخه‌ها
    const tabs = cmEl("div", "artabs");
    d.branches.forEach(b => {
      const t = cmEl("button", "artab" + (AR.br === b.key ? " on" : ""), b.name + " " + b.icon); t.type = "button";
      t.onclick = () => { AR.br = b.key; build(); }; tabs.appendChild(t);
    });
    body.appendChild(tabs);

    // قدرت شاخه
    const br = d.branches.find(b => b.key === AR.br), t2 = cmEl("span", null); t2.append(br.icon + " ", bold("قدرتِ این شاخه"));
    const bp = panel(t2, en(br.power));
    bp.appendChild(cmEl("div", "sub", en(br.count) + " یگان" + (br.cap ? " · جا: " + br.used + "/" + br.cap : "")));
    body.appendChild(bp);

    d.units.filter(u => u.branch === AR.br).forEach(u => body.appendChild(unitCard(d, u)));
    body.appendChild(cmEl("div", "arnote", "هر یگان تا پایان تولید اثری ندارد. نگهداری یگان‌ها روزانه از خزانه کم می‌شود: $" + en(d.upkeep) + " در روز" + (d.salary ? " · 💰 حقوق خدمه (هر نفر $" + en(K.SAL || 40) + "): $" + en(d.salary) + " در روز" : "") + (d.deploy && d.deploy.extra ? " (+ $" + en(d.deploy.extra) + " و " + en(d.deploy.food || 0) + " 🌾 غذا در روز نگهداری اضافیِ یگان‌های اعزام‌شده، چون از مبدأ دور شده‌اند؛ با تمام شدن غذا بخشی از یگان‌های انسانی می‌میرند)" : "")
      + (d.deploy && d.deploy.dead && Object.keys(d.deploy.dead).length ? " ☠ تلفات گرسنگی: " + Object.keys(d.deploy.dead).map(k => { const u = d.units.find(x => x.key === k); return (u ? u.name : k) + " ×" + en(d.deploy.dead[k]); }).join("، ") : "") + ". جای خالی در پایگاه و کارخانه‌ی ساخته‌شده لازم است. جابه‌جایی یگان‌ها بین شهرها هم هزینه دارد: پول برای همه‌ی یگان‌ها و نفت برای ماشین‌های جنگی (هر چه شهرها دورتر، گران‌تر)."));
    tick(); sc.scrollTop = sy0;
    const act_ = tabs.querySelector(".on");   // تب فعال همیشه کامل دیده شود (در RTL از لبه‌ی راست بریده نشود)
    if (act_) tabs.scrollLeft += (act_.getBoundingClientRect().left + act_.getBoundingClientRect().right) / 2 - (tabs.getBoundingClientRect().left + tabs.getBoundingClientRect().right) / 2;
  }
  function tick() {
    if (view !== "army" || !AR.d) return;
    document.querySelectorAll("#abody .ecbl[data-ar]").forEach(b => {
      const until = Number(b.dataset.until) * 1000, total = Number(b.dataset.secs) * 1000, rem = Math.max(0, until - arNow());
      b.querySelector(".r").textContent = rem ? dur(rem) : "تمام شد ✅";
      b.querySelector(".bar i").style.width = Math.min(100, (1 - rem / total) * 100) + "%";
      if (!rem && Date.now() - AR.rl > 3000) { AR.rl = Date.now(); load(); }
    });
  }
  setInterval(tick, 1000);

  window.OWArmy = { build, load, stations, transits, spy, srvNow, conquered, moveTo, armyMenu, F, UNITS, BRANCHES, BASES, K, askCity, askPick, isNaval, L: { cities: lCities, sync: lSync, save: lSave, view: lView, cityTake: lCityTake, cityAdd: lCityAdd } };   // L: برای بازارِ حالت محلی
})();
;

/* ===== war.js ===== */
/* صفحه‌ی جنگ (آتش‌بس، ساعت جنگ، اعلان جنگ، اخبار، تاریخچه، دکترین). بعد از اسکریپت اصلی index.html
   بارگذاری می‌شود و از همان تابع‌ها و متغیرهای سراسری آن (el, cmEl, toast, byCode, countries, mine,
   GAME, flagNode, dur, setView, …) استفاده می‌کند. فایل را کنار index.html بگذارید.
   با سرور (REMOTE): همه‌چیز از /api/war می‌آید (اعلان جنگ، نبرد، صلح، دکترین، اخبار) و نتیجه‌ی نبرد سمت سرور حساب می‌شود.
   بدون سرور: فقط اعلان جنگ/دکترین روی همین گوشی (localStorage) ذخیره می‌شود و نبرد وجود ندارد. */
(function () {
  "use strict";

  // ---------------- ظاهر
  const CSS = `
  .wrbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wrbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(143,168,74,.06); }
  .wrbar b { font-size: 18px; cursor: pointer; }
  .wrbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 18px; direction: ltr; }
  .wrbar .whelp { flex: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 16px; color: var(--hint);
    background: none; border: 1.5px solid var(--line); }
  .wcard { display: flex; align-items: center; gap: 14px; padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 1px solid var(--line);
    background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wcard .wic { flex: none; width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;
    border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #d9dde6; }
  .wcard .wic.sq { border-radius: 14px; border-width: 2px; }
  .wcard .wtx { flex: 1; min-width: 0; }
  .wcard h4 { font-size: 18px; margin-bottom: 4px; }
  .wcard p { font-size: 14px; line-height: 1.9; color: #c4c8d1; }
  .wcard .wpill { display: inline-block; margin-inline-start: 8px; padding: 4px 14px; border-radius: 999px; font-size: 14px; font-weight: 400;
    background: rgba(255,255,255,.07); color: #d9dde6; direction: rtl; }
  .wcard.ok { border-color: rgba(79,217,160,.45); }
  .wcard.hot { border-color: rgba(255,122,122,.5); }
  .wtabs { display: flex; gap: 6px; padding: 8px; margin: 0 0 14px; border-radius: 26px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wtab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: 20px; cursor: pointer; font: inherit;
    font-size: 14px; color: var(--hint); background: none; border: 0; }
  .wtab .ti { font-size: 20px; }
  .wtab.on { background: linear-gradient(160deg, #f59a3d, #d9701f); color: #2a1d00; font-weight: 700; }
  .wpanel { border-radius: 28px; padding: 16px; margin-bottom: 14px; border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wpanel h3 { display: flex; align-items: center; gap: 10px; font-size: 20px; margin-bottom: 10px; }
  .wpanel .wlead { font-size: 14px; line-height: 2; color: #c4c8d1; margin-bottom: 14px; }
  .wsearch { width: 100%; box-sizing: border-box; margin-bottom: 14px; }
  .wrow { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 22px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wrow .wflag { flex: none; width: 44px; height: 44px; }
  .wrow .wflag .flag { width: 44px; height: 44px; }
  .wrow .wn { flex: 1; min-width: 0; }
  .wrow .wn b { display: block; font-size: 20px; font-weight: 500; }
  .wrow .wn small { display: block; color: var(--hint); font-size: 13px; margin-top: 2px; }
  .wgo { flex: none; padding: 14px 18px; border-radius: 18px; cursor: pointer; font: inherit; font-size: 16px; color: var(--gold);
    background: rgba(150,105,30,.18); border: 2px solid rgba(143,168,74,.55); }
  .wgo.off { opacity: .45; }
  .wgo.at { color: #ff9d8a; border-color: rgba(255,122,122,.5); background: rgba(255,122,122,.08); }
  .wmore { display: block; width: 100%; padding: 12px; font: inherit; font-size: 14px; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .wnote { margin-top: 14px; color: #8b909c; font-size: 14px; line-height: 1.8; }
  .wsiege { margin-top: 12px; padding: 2px 12px 10px; border: 1px solid rgba(255,107,74,.35); border-radius: 12px; background: rgba(255,107,74,.07); }
  .wsiege .wnote { margin-top: 8px; color: #c9ccd4; }
  .wempty { text-align: center; color: var(--hint); padding: 22px 8px; font-size: 14px; line-height: 2; }
  .wnews { padding: 14px; margin-bottom: 10px; border-radius: 20px; border: 1px solid var(--line); background: rgba(255,255,255,.03); font-size: 14px; line-height: 1.9; }
  .wnews small { display: block; color: var(--hint); font-size: 13px; margin-top: 2px; }
  .wdoc { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 22px; cursor: pointer; border: 2px solid var(--line);
    background: rgba(255,255,255,.03); }
  .wdoc .wi { flex: none; font-size: 30px; }
  .wdoc b { display: block; font-size: 18px; }
  .wdoc p { font-size: 14px; line-height: 1.8; color: #b3b6bd; }
  .wdoc.on { border-color: rgba(143,168,74,.8); background: rgba(143,168,74,.08); box-shadow: 0 0 16px rgba(143,168,74,.15); }

  .wfront { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wfront .wtop { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .wfront .wtop .flag { width: 44px; height: 44px; }
  .wfront .wtop b { display: block; font-size: 20px; font-weight: 500; }
  .wfront .wtop small { display: block; color: var(--hint); font-size: 13px; margin-top: 2px; }
  .wprog { margin: 8px 0 12px; }
  .wprog .wl { display: flex; justify-content: space-between; font-size: 14px; color: #c4c8d1; margin-bottom: 5px; }
  .wprog .wb { height: 10px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
  .wprog .wb i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #d9701f, #f59a3d); }
  .wprog.en .wb i { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wbal { margin: 6px 0 12px; }
  .wbal .wl { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
  .wbal .wl .me { color: #f59a3d; font-weight: 700; }
  .wbal .wl .en { color: #ff7a7a; font-weight: 700; }
  .wbal .wb { position: relative; display: flex; height: 18px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.08); }
  .wbal .wb .me { background: linear-gradient(90deg, #d9701f, #f59a3d); transition: width .4s; }
  .wbal .wb .en { background: linear-gradient(90deg, #ff7a7a, #c0392b); flex: 1; }
  .wbal .wb::after { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; background: rgba(0,0,0,.45); }
  .wbal .wsum { font-size: 13px; margin-top: 5px; text-align: center; color: #c4c8d1; }
  .wbal .wsum.good { color: #f59a3d; }
  .wbal .wsum.bad { color: #ff9d8a; }
  .wscore .wl { direction: ltr; }
  .wmeter { position: relative; direction: ltr; height: 20px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; margin: 4px 0 2px; }
  .wmeter .wfill { position: absolute; top: 0; bottom: 0; transition: left .4s, width .4s; }
  .wmeter .wfill.me { background: linear-gradient(90deg, #d9701f, #f59a3d); }
  .wmeter .wfill.en { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wmeter u { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: rgba(0,0,0,.5); text-decoration: none; }
  .wmeter u.t0 { left: 50%; width: 3px; margin-left: -1.5px; background: rgba(255,255,255,.55); }
  .wmeter u.t90.l { left: 5%; } .wmeter u.t90.r { left: 95%; }
  .wmeter .wpin { position: absolute; top: -2px; bottom: -2px; width: 4px; margin-left: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 6px rgba(0,0,0,.6); transition: left .4s; }
  .wscale { display: flex; justify-content: space-between; direction: ltr; font-size: 12px; color: #8d93a1; margin-bottom: 4px; }
  .wscore .wnum { font-size: 30px; font-weight: 800; text-align: center; direction: ltr; color: #c4c8d1; line-height: 1.3; }
  .wfac { margin: 8px 0 4px; } .wfr { margin-bottom: 8px; }
  .wft { display: flex; justify-content: space-between; font-size: 13px; color: #c4c8d1; margin-bottom: 3px; }
  .wft b { direction: ltr; font-weight: 700; } .wft b.good { color: #f59a3d; } .wft b.bad { color: #ff9d8a; }
  .wfb { position: relative; height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; direction: ltr; }
  .wfb::after { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; background: rgba(255,255,255,.4); }
  .wfb i { position: absolute; top: 0; bottom: 0; } .wfb i.me { background: linear-gradient(90deg, #d9701f, #f59a3d); } .wfb i.en { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wscore .wnum.good { color: #f59a3d; } .wscore .wnum.bad { color: #ff9d8a; }
  .wwhy { font-size: 14px; line-height: 1.8; color: #ff9d8a; margin-bottom: 10px; }
  .wacts { display: flex; gap: 10px; }
  .wact { flex: 1; padding: 14px 8px; border-radius: 18px; cursor: pointer; font: inherit; font-size: 16px; font-weight: 700; text-align: center;
    color: #ff9d8a; background: rgba(255,122,122,.08); border: 2px solid rgba(255,122,122,.5); }
  .wact.peace { color: #4fd9a0; background: rgba(79,217,160,.1); border-color: rgba(79,217,160,.5); }
  .wact.off { opacity: .45; }
  .wchips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
  .wchip { padding: 10px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 14px; color: var(--hint); background: none; border: 2px solid var(--line); }
  .wchip.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #f59a3d, #d9701f); border-color: #f59a3d; }
  .wchip.off { opacity: .4; cursor: not-allowed; }
  .wrep { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 2px solid var(--line); background: rgba(255,255,255,.04); font-size: 14px; line-height: 2; }
  .wrep.win { border-color: rgba(79,217,160,.6); }
  .wrep.lose { border-color: rgba(255,122,122,.6); }
  .wrep h4 { font-size: 20px; margin-bottom: 6px; }
  .wrep .wx { float: left; cursor: pointer; color: var(--hint); font-size: 18px; }
  .wtag { display: inline-block; margin-inline-start: 6px; padding: 2px 10px; border-radius: 999px; font-size: 13px; background: rgba(255,255,255,.08); color: #d9dde6; }
  .wtag.gold { color: var(--gold); background: rgba(143,168,74,.12); }
  .wtag.red { color: #ff9d8a; background: rgba(255,122,122,.1); }
  .wmul { font-size: 13px; color: var(--hint); margin-top: 4px; }
  .wpeace { position: fixed; inset: 0; z-index: 80; overflow-y: auto; -webkit-overflow-scrolling: touch; background: var(--bg, #10131a); padding: 14px 14px 170px; }
  .wpeace .pphead { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .wpeace .ppback { cursor: pointer; font: inherit; font-size: 20px; color: var(--hint); background: none; border: 2px solid var(--line); border-radius: 14px; padding: 6px 14px; }
  .wpeace h2 { font-size: 20px; flex: 1; }
  .wpeace .ppcap { margin: 8px 0 14px; padding: 12px 14px; border-radius: 20px; border: 1px solid var(--line); background: rgba(255,255,255,.04); }
  .wpeace .ppcap .wl { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
  .wpeace .ppcap .wb { height: 14px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; direction: ltr; }
  .wpeace .ppcap .wb i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #d9701f, #f59a3d); transition: width .25s; }
  .wpeace .ppcap.full .wb i { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wpeace .ppreg { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 8px; padding: 12px 14px; text-align: right; cursor: pointer; font: inherit; font-size: 14px;
    color: #d9dde6; border-radius: 18px; border: 2px solid var(--line); background: rgba(255,255,255,.03); }
  .wpeace .ppreg.on { border-color: #f59a3d; background: rgba(143,168,74,.12); }
  .wpeace .ppreg.off { opacity: .45; cursor: not-allowed; }
  .wpeace .ppreg .ck { font-size: 20px; width: 26px; text-align: center; }
  .wpeace .ppreg .nm { flex: 1; line-height: 1.7; }
  .wpeace .ppreg .nm small { display: block; font-size: 13px; color: var(--hint); }
  .wpeace .ppreg .cost { direction: ltr; font-weight: 800; font-size: 16px; color: #f59a3d; white-space: nowrap; }
  .wpeace .ppreg.off .cost { color: var(--hint); }
  .wpeace .pprules { margin: 14px 0; padding: 12px 14px; border-radius: 20px; border: 1px dashed var(--line); font-size: 14px; line-height: 2; color: #c4c8d1; }
  .wpeace .ppfoot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 81; padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--bg, #10131a); border-top: 1px solid var(--line); }
  .wpeace .ppfoot .sum { text-align: center; font-size: 14px; color: #c4c8d1; margin-bottom: 8px; }
  /* --- نوار امتیاز جدید: ‎-100 … 0 … ‎+100 --- */
  .wsm { margin: 6px 0 4px; direction: ltr; padding: 0 16px; }
  .wsm-track { position: relative; height: 26px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: visible; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
  .wsm.big .wsm-track { height: 34px; }
  .wsm-track .z { position: absolute; top: 0; bottom: 0; width: 5%; background: repeating-linear-gradient(135deg, rgba(255,255,255,.2) 0 4px, transparent 4px 8px); }
  .wsm-track .z.zl { left: 0; border-radius: 999px 0 0 999px; } .wsm-track .z.zr { right: 0; border-radius: 0 999px 999px 0; }
  .wsm-fill { position: absolute; top: 3px; bottom: 3px; border-radius: 999px; transition: left .5s, width .5s; }
  .wsm-fill.me { background: linear-gradient(90deg, #d9701f, #f59a3d); } .wsm-fill.en { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wsm-track u { position: absolute; top: 0; bottom: 0; width: 1px; margin-left: -.5px; background: rgba(255,255,255,.18); text-decoration: none; }
  .wsm-track u.t90 { width: 2px; margin-left: -1px; background: rgba(255,255,255,.55); }
  .wsm-track u.t0 { width: 3px; margin-left: -1.5px; top: -5px; bottom: -5px; background: #fff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,.5); }
  .wsm-pin { position: absolute; top: -6px; bottom: -6px; width: 6px; margin-left: -3px; border-radius: 4px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,.7); transition: left .5s; }
  .wsm-pin::after { content: attr(data-v); position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); padding: 1px 9px; border-radius: 999px; font-size: 13px; font-weight: 800; color: #1c1405; background: #fff; white-space: nowrap; }
  .wsm-pin.me::after { background: #f59a3d; } .wsm-pin.en::after { background: #ff9d8a; }
  .wsm-track { margin-top: 26px; }
  .wsm-scale { position: relative; height: 36px; margin-top: 5px; font-size: 12px; color: #8d93a1; }
  .wsm-scale span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
  .wsm-scale span:first-child { transform: none; } .wsm-scale span:last-child { transform: translateX(-100%); }
  .wsm-scale .pk { color: #ffd9a0; font-weight: 700; } .wsm-scale .lo { top: 17px; transform: translateX(-50%) !important; font-size: 12px; } .wsm-scale .ct { color: #fff; font-weight: 700; }
  .wsm-hero { text-align: center; margin: 6px 0 0; }
  .wsm-hero .wnum { font-size: 44px; }
  .wbanner { margin: 10px 0 4px; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.8; text-align: center; font-weight: 700; animation: wbpulse 2s ease-in-out infinite; }
  .wbanner.good { color: #f59a3d; background: rgba(143,168,74,.12); border: 1px solid rgba(143,168,74,.6); }
  .wbanner.bad { color: #ff9d8a; background: rgba(255,122,122,.1); border: 1px solid rgba(255,122,122,.6); }
  @keyframes wbpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 14px 2px rgba(255,255,255,.14); } }
  /* --- سه عامل جدا --- */
  .wfac3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 12px 0 6px; }
  .wfc { padding: 10px 9px; border-radius: 18px; border: 1px solid var(--line); background: rgba(255,255,255,.04); min-width: 0; }
  .wfc.good { border-color: rgba(143,168,74,.45); } .wfc.bad { border-color: rgba(255,122,122,.4); }
  .wfc-top { display: flex; flex-direction: column; gap: 1px; font-size: 13px; font-weight: 700; }
  .wfc-w { font-size: 12px; font-weight: 400; color: var(--hint); }
  .wfc-val { font-size: 24px; font-weight: 800; direction: ltr; text-align: center; color: #c4c8d1; margin: 4px 0; }
  .wfc-val.good { color: #f59a3d; } .wfc-val.bad { color: #ff9d8a; }
  .wfc-pts { margin-top: 6px; font-size: 12px; color: #c4c8d1; text-align: center; direction: rtl; }
  .wfc-det { margin-top: 6px; font-size: 12px; line-height: 1.7; color: var(--hint); }
  .wfc-chev { display: none; }
  @media (max-width: 430px) {
    .wfac3 { grid-template-columns: 1fr; gap: 6px; margin: 8px 0 4px; }
    .wfc { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 10px; row-gap: 5px; padding: 8px 12px; border-radius: 14px; cursor: pointer; }
    .wfc-top { flex-direction: row; align-items: baseline; gap: 6px; font-size: 13px; }
    .wfc-w { font-size: 12px; }
    .wfc-chev { display: inline-block; margin-inline-start: auto; color: var(--hint); font-weight: 400; transition: transform .15s; }
    .wfc.open .wfc-chev { transform: rotate(-90deg); }
    .wfc-val { font-size: 18px; margin: 0; text-align: left; }
    .wfc .wfb { grid-column: 1 / -1; height: 6px; }
    .wfc-pts { grid-column: 1 / -1; margin: 0; font-size: 12px; text-align: right; }
    .wfc-det { display: none; grid-column: 1 / -1; margin: 2px 0 0; padding-top: 6px; border-top: 1px dashed var(--line); font-size: 12px; line-height: 1.8; }
    .wfc.open .wfc-det { display: block; }
  }
  /* --- چرا امتیاز عوض شد؟ --- */
  .wlog { margin-top: 12px; padding: 12px; border-radius: 20px; border: 1px dashed var(--line); }
  .wlog h4 { font-size: 14px; margin-bottom: 8px; }
  .wlog-empty { font-size: 13px; color: var(--hint); line-height: 1.9; }
  .wle { padding: 9px 10px; margin-bottom: 8px; border-radius: 14px; background: rgba(255,255,255,.04); border-inline-start: 4px solid rgba(255,255,255,.2); }
  .wle.good { border-inline-start-color: #f59a3d; } .wle.bad { border-inline-start-color: #ff7a7a; } .wle.al { box-shadow: 0 0 0 1px rgba(255,255,255,.35); }
  .wle-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.7; }
  .wle-t { display: flex; gap: 6px; } .wle-ic { flex: none; }
  .wle-d { flex: none; direction: ltr; font-size: 16px; color: #c4c8d1; } .wle-d.good { color: #f59a3d; } .wle-d.bad { color: #ff9d8a; }
  .wle-s { display: flex; justify-content: space-between; margin-top: 2px; font-size: 12px; color: var(--hint); } .wle-ba { direction: ltr; }
  .wle-al { margin-top: 6px; font-size: 13px; font-weight: 700; color: #fff; }
  .wle-p { margin-top: 6px; display: grid; gap: 4px; }
  .wle-pi { display: grid; grid-template-columns: auto auto 1fr; gap: 8px; align-items: baseline; font-size: 13px; line-height: 1.7; }
  .wle-pi .k { color: #d9dde6; white-space: nowrap; } .wle-pi b { direction: ltr; color: #c4c8d1; } .wle-pi.good b { color: #f59a3d; } .wle-pi.bad b { color: #ff9d8a; } .wle-pi .y { color: var(--hint); }
  /* --- اعلان ±90 --- */
  .walert { position: fixed; inset: 0; z-index: 95; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(4,8,16,.78); backdrop-filter: blur(3px); }
  .walert-box { width: min(420px, 100%); padding: 22px 18px 18px; border-radius: 28px; text-align: center; background: linear-gradient(160deg, #1b2336, #10131a); border: 2px solid var(--line); animation: wapop .35s ease-out; }
  .walert.good .walert-box { border-color: #f59a3d; box-shadow: 0 0 40px rgba(143,168,74,.35); }
  .walert.bad .walert-box { border-color: #ff7a7a; box-shadow: 0 0 40px rgba(255,122,122,.35); }
  .walert-box .wa-ic { font-size: 56px; line-height: 1.2; } .walert-box h3 { font-size: 22px; margin: 4px 0; }
  .walert-box .wa-sc { direction: ltr; font-size: 20px; font-weight: 800; color: #f59a3d; margin: 4px 0 8px; }
  .walert.bad .wa-sc { color: #ff9d8a; }
  .walert-box p { font-size: 14px; line-height: 2; color: #c4c8d1; margin-bottom: 8px; } .walert-box .wa-why { font-size: 13px; color: var(--hint); margin-bottom: 14px; }
  @keyframes wapop { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .wrep .wscl { margin: 8px 0; padding: 10px; border-radius: 16px; background: rgba(255,255,255,.05); }
  .wrep .wscl b { direction: ltr; unicode-bidi: embed; }
  /* --- صفحه‌ی تحمیل صلح: طرح جدید --- */
  .wpeace { background: radial-gradient(120% 40% at 50% 0%, #1c2a44 0%, var(--bg, #10131a) 70%); }
  .wpeace .pphead { gap: 12px; margin-bottom: 12px; }
  .wpeace .ppt { flex: 1; min-width: 0; } .wpeace .ppt h2 { font-size: 22px; } .wpeace .ppt small { color: var(--hint); font-size: 13px; }
  .wpeace .ppbadge { flex: none; direction: ltr; padding: 6px 14px; border-radius: 999px; font-size: 18px; font-weight: 800; color: #1c1405; background: linear-gradient(160deg, #ffb866, #d9701f); }
  .wpeace .ppcap { padding: 16px; border-radius: 26px; border: 1px solid rgba(143,168,74,.4); background: linear-gradient(160deg, rgba(143,168,74,.12), rgba(255,255,255,.03)); }
  .wpeace .ppcap-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
  .wpeace .ppcap-big { display: flex; flex-direction: column; } .wpeace .ppcap-big .n { font-size: 46px; font-weight: 800; color: #f59a3d; direction: ltr; line-height: 1.1; } .wpeace .ppcap-big .u { font-size: 13px; color: #c4c8d1; }
  .wpeace .ppcap-side { font-size: 13px; color: var(--hint); line-height: 1.9; text-align: left; direction: ltr; }
  .wpeace .ppcap-bar { display: flex; height: 16px; margin-top: 12px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.08); direction: ltr; }
  .wpeace .ppcap-bar i { display: block; height: 100%; transition: width .3s; } .wpeace .ppcap-bar .u { background: linear-gradient(90deg, #c0392b, #ff7a7a); } .wpeace .ppcap-bar .r { background: linear-gradient(90deg, #4fd9a0, #86f0c4); }
  .wpeace .ppcap.full .ppcap-big .n { color: #ff9d8a; }
  .wpeace .ppcap-n { margin-top: 10px; font-size: 13px; line-height: 1.8; color: var(--hint); }
  .wpeace .pptools { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 10px; } .wpeace .pptools .wchip { padding: 7px 14px; font-size: 13px; }
  .wpeace .ppgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 10px; }
  .wpeace .ppreg { display: block; margin: 0; padding: 12px; text-align: right; position: relative; border-radius: 20px; }
  .wpeace .ppreg.cap { grid-column: 1 / -1; }
  .wpeace .ppreg .r0 { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .wpeace .ppreg .ck { flex: none; width: 24px; height: 24px; line-height: 20px; border-radius: 50%; border: 2px solid var(--line); font-size: 13px; font-weight: 800; text-align: center; }
  .wpeace .ppreg.on .ck { background: #f59a3d; border-color: #f59a3d; color: #1c1405; } .wpeace .ppreg.lock .ck { border: 0; font-size: 14px; }
  .wpeace .ppreg .nm { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; line-height: 1.5; }
  .wpeace .ppreg .r1 { display: flex; justify-content: space-between; align-items: baseline; } .wpeace .ppreg .r1 .k { font-size: 12px; color: var(--hint); }
  .wpeace .ppreg .r1 .v { direction: ltr; font-size: 24px; font-weight: 800; color: #f59a3d; }
  .wpeace .ppreg.off .r1 .v { color: var(--hint); }
  .wpeace .ppreg .vb { height: 6px; margin: 4px 0 8px; border-radius: 999px; background: rgba(255,255,255,.08); direction: ltr; overflow: hidden; } .wpeace .ppreg .vb i { display: block; height: 100%; background: linear-gradient(90deg, #d9701f, #f59a3d); border-radius: 999px; }
  .wpeace .ppreg .tg { display: flex; flex-wrap: wrap; gap: 4px; } .wpeace .ppreg .tag { padding: 1px 9px; border-radius: 999px; font-size: 12px; background: rgba(255,255,255,.08); color: #d9dde6; }
  .wpeace .ppreg .tag.ok { color: #4fd9a0; background: rgba(79,217,160,.12); } .wpeace .ppreg .tag.lk { color: #ff9d8a; background: rgba(255,122,122,.1); }
  .wpeace .ppreg .why { margin-top: 6px; font-size: 12px; color: #ff9d8a; line-height: 1.6; } .wpeace .ppreg .aft { margin-top: 6px; font-size: 12px; color: #86f0c4; direction: rtl; }
  .wpeace .ppreg.on { box-shadow: 0 0 0 1px #f59a3d, 0 6px 22px rgba(143,168,74,.2); }
  .wpeace .pprules { border-radius: 22px; padding: 14px; } .wpeace .pprules b { display: block; margin-bottom: 4px; font-size: 14px; }
  .wpeace .pprules .li { display: flex; gap: 10px; line-height: 1.9; font-size: 13px; }
  .wpeace .sum3 { display: flex; gap: 8px; margin-bottom: 10px; } .wpeace .sum3 > div { flex: 1; text-align: center; padding: 6px; border-radius: 14px; background: rgba(255,255,255,.05); }
  .wpeace .sum3 small { display: block; font-size: 12px; color: var(--hint); } .wpeace .sum3 b { font-size: 14px; direction: ltr; unicode-bidi: embed; } .wpeace .sum3 .hl b { color: #86f0c4; }
  .wact.go { color: #1c1405; background: linear-gradient(160deg, #ffb866, #d9701f); border-color: #f59a3d; }
  @media (prefers-reduced-motion: reduce) { .wbanner, .walert-box { animation: none; } .wsm-pin, .wsm-fill { transition: none; } }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  // ---------------- ثابت‌ها
  const PAGE = 30;
  const DOCS = [
    ["aggr", "⚔️", "تهاجمی", "فشار و حمله‌ی سریع؛ مناسب کشورهای قوی با ارتش بزرگ."],
    ["def", "🛡️", "تدافعی", "حفظ خاک و پایتخت و دفاع پایدار؛ مناسب کشورهای کم‌قدرت‌تر."],
    ["bal", "⚖️", "متوازن", "ترکیبی از حمله و دفاع؛ انتخاب پیش‌فرض."],
    ["eco", "💰", "اقتصاد جنگی", "اولویت با خزانه و تولید؛ غنیمت بیشتر و تلفات کمتر، ولی حمله ضعیف‌تر."],
  ];
  const BR = { gnd: ["زمینی", "🪖"], air: ["هوایی", "✈️"], sea: ["دریایی", "🚢"], mis: ["موشکی", "🚀"] };
  const WHY = {
    hours: "الان آتش‌بس روزانه است؛ نبرد فقط در ساعت جنگ ممکن است.",
    start: "آتش‌بس آغاز فصل هنوز تمام نشده است.",
    protected: "این کشور بعد از تسخیر در حمایت موقت است.",
    truce: "آتش‌بس 12 ساعته‌ی بعد از صلح برقرار است؛ تا پایانش نبرد و اعلان جنگ ممکن نیست.",
  };
  const REASON = { conquest: "تسخیر", peace: "صلح", gone: "خروج بازیکن" };
  const R = () => typeof REMOTE !== "undefined" && REMOTE;
  
  const TABS_L = [["declare", "⚔️", "اعلان جنگ"], ["news", "📰", "اخبار"], ["hist", "📄", "تاریخچه"], ["cities", "🏙", "شهرها"], ["doc", "🎯", "دکترین"]];

  // ---------------- وضعیت
  const WS = { tab: null, q: "", shown: PAGE, st: null, sv: null, recv: 0, skew: 0, err: "", busy: false, atk: null, fin: null, report: null, reloading: 0 };
  const tabs = () => TABS_L;   // همیشه همین 5 تب؛ جبهه‌های فعال بالای تب «اعلان جنگ» می‌آیند
  const curTab = () => { const t = tabs(); return t.some(x => x[0] === WS.tab) ? WS.tab : t[0][0]; };
  const LK = () => "ow_war_" + (typeof season === "undefined" || season === null ? "x" : season) + "_" + (mine || "") + "_" + (typeof EPK === "undefined" ? "" : EPK);
  function load() {   // حالت محلی
    if (WS.st) return WS.st;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(LK()) || "null"); } catch (e) { /* خالی */ }
    WS.st = s && typeof s === "object" ? s : {};
    WS.st.wars = WS.st.wars || []; WS.st.news = WS.st.news || []; WS.st.doctrine = WS.st.doctrine || "bal";
    return WS.st;
  }
  function save() { try { localStorage.setItem(LK(), JSON.stringify(WS.st)); } catch (e) { /* پر یا بسته */ } }

  // ---------------- سرور
  function apply(d) {
    WS.sv = d; WS.recv = Date.now(); WS.skew = d.now * 1000 - Date.now(); WS.err = "";
    try { scanAlerts(d); } catch (e) { /* اعلان نباید نمایش جنگ را خراب کند */ }
  }
  async function sLoad() {
    if (!R()) return;
    try { apply(await cmApi("/api/war")); } catch (e) { WS.err = e.message; }
    if (view === "war") { drawStatus(); drawPane(); }
  }
  async function act(path, body, okMsg, after) {
    if (WS.busy) return;
    WS.busy = true;
    try {
      const d = await cmApi(path, body);
      if (d.state) { apply(d.state); if (after) after(d); } else apply(d);
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه و ارتش هم تازه شوند
    } catch (e) { toast(e.message); sLoad(); }
    WS.busy = false;
    if (view === "war") { drawStatus(); drawPane(); }
  }

  // ---------------- زمان
  function tehran(now) {
    try {
      const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).formatToParts(new Date(now));
      const g = (t) => Number(p.find(x => x.type === t).value) % 24;
      return { h: g("hour"), m: g("minute"), s: g("second") };
    } catch (e) { const d = new Date(now); return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }; }
  }
  function wHours() {
    const v = WS.sv;
    return v ? [v.war_from, v.war_to] : [DAILY_CEASEFIRE_END, 24];
  }
  function timing(now) {
    const v = WS.sv;
    if (R() && v) {   // ساعت سرور (با گذشتِ زمان از آخرین پاسخ)
      const el_ = now - WS.recv, left = v.toggle_in * 1000 - el_;
      const inWar = left > 0 ? v.in_war : !v.in_war;
      if (left <= 0 && Date.now() - WS.reloading > 5000) { WS.reloading = Date.now(); sLoad(); }
      return { inWar, untilMs: Math.max(0, left), startCf: Math.max(0, v.start_left * 1000 - el_) };
    }
    const t = tehran(now), sec = t.h * 3600 + t.m * 60 + t.s, [F, T] = wHours();
    const inWar = t.h >= F && t.h < T;
    const untilMs = (inWar ? T * 3600 - sec : ((F * 3600 - sec) % 86400 + 86400) % 86400) * 1000;
    const started = endsAt ? endsAt - SD * 86400000 : 0;
    const startCf = started ? Math.max(0, started + START_CEASEFIRE_DAYS * 86400000 - now) : 0;
    return { inWar, untilMs, startCf };
  }
  const nf = (n) => Number(n).toLocaleString("en-US");
  const fmtT = (ts) => new Date(ts).toLocaleString("fa-IR-u-nu-latn", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const srvNow = () => Date.now() + WS.skew;

  // ---------------- ساخت صفحه
  function wcard(cls, ic, title, text, extra) {
    const c = cmEl("div", "wcard " + (cls || ""));
    const i = cmEl("div", "wic" + (extra && extra.sq ? " sq" : ""), ic);
    const tx = cmEl("div", "wtx"), h = cmEl("h4", null, title), p = cmEl("p", null, text);
    if (extra && extra.pill) h.appendChild(cmEl("span", "wpill", extra.pill));
    tx.append(h, p); c.append(tx, i);   // در RTL آیکن سمت راست می‌افتد
    return c;
  }
  function drawStatus() {
    const box = el("wstat"); if (!box) return;
    const T = timing(Date.now()), [F, TO] = wHours(); box.innerHTML = "";
    if (R() && WS.err && !WS.sv) { box.appendChild(wcard("hot", "⚠️", "خطا در اتصال", WS.err)); return; }
    if (T.inWar) box.appendChild(wcard("hot", "⚔️", "ساعت جنگ", "نبرد آزاد است، فرمانده.", { pill: "اکنون" }));
    else box.appendChild(wcard("ok", "⚖️", "آتش‌بس روزانه", "تا ساعت جنگ نبردی درنمی‌گیرد، فرمانده."));
    if (T.startCf > 0) {
      const d = dur(T.startCf);
      box.appendChild(wcard("", "🕒", "آغاز فصل", "اعلان جنگ " + d + " دیگر باز می‌شود. بازار جهانی " + d + " دیگر باز می‌شود.", { sq: true }));
    }
    const remOn = !!(R() && WS.sv && WS.sv.remind);
    const forced = R() && WS.sv && WS.sv.forced;   // حالت دستی ادمین
    const rem = wcard("", forced ? "🛠" : remOn ? "🔔" : T.inWar ? "⏳" : "☐", "ساعت جنگ",
      forced ? (forced === "open" ? "جنگ را ادمین به‌صورت دستی باز کرده است." : "جنگ را ادمین به‌صورت دستی بسته کرده است.")
        : dur(T.untilMs) + (T.inWar ? " تا پایان ساعت جنگ" : " تا شروع ساعت جنگ") + (remOn ? " · یادآوری روشن" : " · برای یادآوری بزنید"),
      { sq: true, pill: forced ? "دستی" : F + ":00 تا " + (TO % 24) + ":00" });
    rem.style.cursor = "pointer";
    rem.onclick = () => {
      if (!R()) { toast("یادآوری فقط در حالت آنلاین کار می‌کند."); return; }
      act("/api/war/remind", { on: !remOn }, remOn ? "یادآوری خاموش شد" : "یادآوری روشن شد 🔔 اول ساعت جنگ پیام می‌گیرید");
    };
    box.appendChild(rem);
    const v = WS.sv;
    if (R() && v && v.damage && (v.damage.pwr > 0 || v.damage.eco > 0))
      box.appendChild(wcard("hot", "💥", "خسارت جنگی", "شبکه‌ی برق " + v.damage.pwr + "% و اقتصاد " + v.damage.eco + "% آسیب دیده؛ درآمد کم می‌شود. هر ساعت حدود " + v.damage.repair_per_hour + "% ترمیم می‌شود."));
    if (R() && v && v.protected_until * 1000 > srvNow())
      box.appendChild(wcard("ok", "🛡️", "حمایت موقت", "کشور شما بعد از تسخیر تا " + dur(v.protected_until * 1000 - srvNow()) + " دیگر در امان است."));
  }
  function drawTabs() {
    const bar = el("wtabs"); bar.innerHTML = ""; const cur = curTab();
    tabs().forEach(([k, ic, nm]) => {
      const b = cmEl("button", "wtab" + (cur === k ? " on" : "")); b.type = "button";
      b.append(cmEl("span", "ti", ic), cmEl("span", null, nm));
      b.onclick = () => { WS.tab = k; WS.q = ""; WS.shown = PAGE; WS.atk = null; drawTabs(); drawPane(); };
      bar.appendChild(b);
    });
  }

  // --- فهرست هدف‌ها
  function candidates() {
    const q = norm(WS.q || "");
    if (R()) {
      const rows = ((WS.sv && WS.sv.targets) || []).map(t => ({ c: byCode[t.code], nb: t.neighbor, t })).filter(x => x.c && (!q || norm(x.c.name).includes(q)));
      return rows.sort((a, b) => (b.nb - a.nb) || a.c.name.localeCompare(b.c.name, "fa"));
    }
    const nb = ((typeof NEIGHBORS !== "undefined" && NEIGHBORS[mine]) || "").split(" ").filter(Boolean);
    const has = (c) => (typeof counts !== "undefined" && counts[c.code] > 0) || c.n > 0;
    return countries.filter(c => c.code !== mine && has(c) && (!q || norm(c.name).includes(q)))
      .sort((a, b) => (nb.includes(b.code) - nb.includes(a.code)) || a.name.localeCompare(b.name, "fa"))
      .map(c => ({ c, nb: nb.includes(c.code), t: null }));
  }
  function declare(c) {
    const T = timing(Date.now());
    if (T.startCf > 0) { toast("اعلان جنگ تا پایان آتش‌بس آغاز فصل باز نمی‌شود."); return; }
    const msg = "به " + c.name + " اعلان جنگ می‌کنید؟ جنگ با یک کشور، جنگ با همه‌ی خاک‌های زیر فرمان آن است.";
    let go;
    if (R()) {
      go = () => act("/api/war/declare", { code: c.code }, "اعلان جنگ به " + c.name + " ثبت شد ⚔️", () => { WS.tab = "declare"; drawTabs(); });
    } else {
      const S = load();
      if (S.wars.some(w => w.code === c.code)) { toast("با " + c.name + " در جنگ هستید."); return; }
      go = () => {
        S.wars.unshift({ code: c.code, t: Date.now() });
        S.news.unshift({ t: Date.now(), text: "شما به " + c.name + " اعلان جنگ کردید ⚔️" });
        save();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("warning");
        toast("اعلان جنگ به " + c.name + " ثبت شد ⚔️");
        drawPane();
      };
    }
    const m2 = msg.length > 250 ? msg.slice(0, 247) + "…" : msg;   // سقف 256 نویسه‌ی تلگرام
    try { if (tg.showConfirm) tg.showConfirm(m2, (ok) => { if (ok) go(); }); else if (window.confirm(m2)) go(); }
    catch (e) { if (window.confirm(m2)) go(); }
  }
  function atWar(code) {
    return R() ? !!(WS.sv && WS.sv.wars.some(w => w.code === code)) : load().wars.some(w => w.code === code);
  }
  const q_empty = () => (WS.q ? "کشوری پیدا نشد." : "فعلاً کشور دیگری بازیکن ندارد.");
  function drawList() {
    const box = el("wlist"); if (!box) return; box.innerHTML = "";
    const T = timing(Date.now()), all = candidates();
    if (!all.length) { box.appendChild(cmEl("div", "wempty", q_empty())); return; }
    all.slice(0, WS.shown).forEach(({ c, nb, t }) => {
      const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c));
      const cap = capitalOf(c.code), bits = [];
      if (nb) bits.push("همسایه");
      if (cap) bits.push("پایتخت: " + cap);
      if (t && t.power != null) bits.push("قدرت: " + nf(t.power));
      n.append(cmEl("b", null, c.name), cmEl("small", null, bits.join(" · ")));
      const trc = t && t.truce_until * 1000 > srvNow();
      const prot = t && t.protected_until * 1000 > srvNow();
      const at = atWar(c.code);
      const b = cmEl("button", "wgo" + (at ? " at" : (T.startCf > 0 || prot || trc) ? " off" : ""), at ? "در جنگ ⚔" : trc ? "آتش‌بس 🕊" : prot ? "در حمایت 🛡" : "اعلان جنگ ⚔"); b.type = "button";
      b.onclick = () => { if (trc) toast("آتش‌بس 12 ساعته‌ی بعد از صلح با " + c.name + " برقرار است؛ " + dur(t.truce_until * 1000 - srvNow()) + " دیگر."); else if (prot) toast(c.name + " فعلاً در حمایت است."); else if (at) toast("با " + c.name + " در جنگ هستید."); else declare(c); };
      row.append(fl, n, b); box.appendChild(row);
    });
    if (all.length > WS.shown) {
      const m = cmEl("button", "wmore", "نمایش بیشتر (" + (all.length - WS.shown) + ") ‹"); m.type = "button";
      m.onclick = () => { WS.shown += PAGE; drawList(); }; box.appendChild(m);
    }
  }

  // --- جبهه‌ها (فقط با سرور)
  const lossText = (loss, names) => {
    const k = Object.keys(loss || {});
    return k.length ? k.map(x => (names && names[x] || x) + " ×" + nf(loss[x])).join("، ") : "بدون تلفات";
  };
  const unitsText = (cnt, names, empty) => {
    const k = Object.keys(cnt || {}).filter(x => cnt[x] > 0).sort((a, b) => cnt[b] - cnt[a]);
    return k.length ? k.map(x => (names && names[x] || x) + " ×" + nf(cnt[x])).join("، ") : (empty || "—");
  };
  // --- نیروی شهرها: {cities:[{city,power,count,units}], free, names}
  const forceUnits = (f, names) => {
    const k = Object.keys(f.units || {}).sort((a, b) => f.units[b] - f.units[a]);
    return k.map(x => ((names && names[x] && names[x][1]) || "") + " " + ((names && names[x] && names[x][0]) || x) + " ×" + nf(f.units[x])).join("، ");
  };
  function cityRows(p, cf, opt) {
    const top = Math.max.apply(null, [1].concat(cf.cities.map(x => x.power)).concat([cf.free.power]));
    const row = (title, f, dim) => {
      const r = cmEl("div", "wcity" + (dim ? " dim" : "")), h = cmEl("div", "wch");
      h.append(cmEl("b", null, title), cmEl("span", "wcp", f.count ? "⚔ " + nf(f.power) : "بدون نیرو"));
      r.appendChild(h);
      if (f.count) {
        const bar = cmEl("div", "wcb"), i = cmEl("i"); i.style.width = Math.max(4, Math.round(f.power / top * 100)) + "%"; bar.appendChild(i); r.appendChild(bar);
        const fu = forceUnits(f, cf.names); if (fu.trim()) r.appendChild(cmEl("small", null, fu));
      }
      p.appendChild(r);
    };
    cf.cities.forEach(x => row("📍 " + x.city, x, !x.count));
    if (cf.free.count) row("📦 بدون شهر", cf.free, false);
  }
  // اطلاعات ماهواره‌ای: هرچه ماهواره بیشتر، ارتش کشورهای دیگر بیشتر دیده می‌شود
  function satNote() {
    const sv = WS.sv || {}, st = sv.sat_steps || [1, 3, 5], n = sv.sats || 0, lv = sv.intel_level || 0;
    const what = ["", "قدرت کل ارتش و خسارت جنگی کشورها", "قدرت هر شهر دشمن در جنگ", "نوع و تعداد یگان‌های هر شهر دشمن"];
    const fa = (x) => Number(x).toLocaleString("en-US");
    let t = "🛰 ماهواره‌های شما: " + fa(n) + (lv ? " — می‌بینید: " + what.slice(1, lv + 1).join("، ") + "." : " — هنوز چیزی از ارتش دشمن نمی‌بینید.");
    if (lv < 3) t += " با " + fa(st[lv]) + " ماهواره " + what[lv + 1] + " هم دیده می‌شود.";
    return cmEl("div", "wnote", t);
  }
  function drawCities(p) {
    if (!R()) { p.appendChild(cmEl("div", "wnote", "📴 نیروی شهرها فقط در حالت آنلاین (با سرور) نمایش داده می‌شود.")); return; }
    const cf = WS.sv && WS.sv.city_forces;
    if (!cf) { p.appendChild(cmEl("div", "wempty", "در حال بارگذاری…")); return; }
    p.appendChild(cmEl("div", "wlead", "هر شهر چه نیرویی دارد، فرمانده. عدد کنار هر شهر مجموع قدرتِ یگان‌های مستقر در آن است (پدافند نصف حساب می‌شود، ماهواره شمرده نمی‌شود). در نبرد فقط یگان‌های شهرِ هدف دفاع می‌کنند و «بدون شهر»ها با نصف قدرت کمک می‌کنند."));
    const oc = WS.sv.occupied || { by_me: [], lost: [] };
    if (oc.by_me.length || oc.lost.length) {
      p.appendChild(cmEl("h3", "wsub", "🏴 مناطق منتقل‌شده (مالکیت)"));
      oc.by_me.forEach(o => { const c = byCode[o.code]; p.appendChild(cmEl("div", "wnote", "✅ " + o.city + " (" + (c ? c.name : o.code) + ") — مالکیتش به شما منتقل شد")); });
      oc.lost.forEach(o => { const c = byCode[o.by]; p.appendChild(cmEl("div", "wnote", "❌ " + o.city + " — مالکیتش به " + (c ? c.name : o.by) + " منتقل شد")); });
    }
    cityRows(p, cf);
    p.appendChild(cmEl("div", "wnote", "برای جابه‌جایی یا استقرار نیرو به صفحه‌ی ارتش بروید."));
    if ((WS.sv.wars || []).length || WS.sv.sats) p.appendChild(satNote());
    const en = (WS.sv.wars || []).filter(w => w.city_forces);
    en.forEach(w => {
      const c = byCode[w.code]; if (!c) return;
      p.appendChild(cmEl("h3", "wsub", "🛰 نیروی شهرهای " + c.name));
      cityRows(p, w.city_forces);
    });
  }
  function drawReport(p) {
    const r = WS.report; if (!r) return;
    const box = cmEl("div", "wrep " + (r.win ? "win" : "lose"));
    const x = cmEl("span", "wx", "✕"); x.onclick = () => { WS.report = null; drawPane(); };
    const en = byCode[r.enemy], nm = en ? en.name : r.enemy;
    box.append(x, cmEl("h4", null, r.finished ? "🏴 صلح تحمیل شد؛ جنگ با " + nm + " تمام شد! " + (r.cities && r.cities.length ? "مالکیت " + nf(r.cities.length) + " منطقه به شما منتقل شد." : "") : r.win ? "✅ پیروزی در برابر " + nm : "❌ عقب‌نشینی از " + nm));
    if (r.finished) {
      box.appendChild(cmEl("div", null, "امتیاز جنگ: " + sgn(r.war_score !== undefined ? r.war_score : r.score)));
      box.appendChild(cmEl("div", null, "🗺 مناطق منتقل‌شده: " + ((r.cities || []).join("، ") || "—")));
      if (r.capacity !== undefined) box.appendChild(cmEl("div", null, "ارزش صلح مصرف‌شده: " + (Math.round(r.spent * 10) / 10) + "% از ظرفیت " + (Math.round(r.capacity * 10) / 10) + "%"));
      box.appendChild(cmEl("div", null, "💰 غنیمت (" + Math.round((r.loot_rate || 0.25) * 100) + "% خزانه‌ی دشمن): $" + nf(r.loot)));
      if (r.truce_until) box.appendChild(cmEl("div", "wnote", "🕊 آتش‌بس 12 ساعته فعال شد؛ تا " + fmtT(r.truce_until * 1000) + " هیچ‌کدام از دو طرف نمی‌تواند به دیگری حمله یا اعلان جنگ کند."));
      p.appendChild(box); return;
    }
    if (r.city) box.appendChild(cmEl("div", null, "📍 شهر هدف: " + r.city));
    if (r.km) box.appendChild(cmEl("div", "wnote", "🚚 فاصله از پایتخت: " + nf(r.km) + " کیلومتر · هزینه‌ی تأمین: $" + nf(r.supply || 0) + " + " + nf(r.food || 0) + " 🌾 غذا"
      + (r.deploy && r.deploy.extra ? " · نگهداری یگان‌های اعزام‌شده ×" + r.deploy.mul + " تا " + fmtT(r.deploy.until * 1000) : "")));
    if (r.terrain && (r.terrain.gnd_def !== 1 || r.terrain.gnd_att !== 1 || r.terrain.air !== 1)) box.appendChild(cmEl("div", "wnote", r.terrain.icon + " زمین (" + r.terrain.name + ")" + (r.terrain.season && r.terrain.season.active ? " · " + r.terrain.season.icon + " " + r.terrain.season.name : "") + ": زمینیِ مدافع ×" + r.terrain.gnd_def + " · زمینیِ مهاجم ×" + r.terrain.gnd_att + " · هوایی ×" + r.terrain.air));
    if (r.home) box.appendChild(cmEl("div", "wnote", "🛡 مزیت دفاع سرزمینی دشمن: آمادگی دفاعی +" + r.home.ready + "% · خطوط تدارکاتی کوتاه‌تر +" + r.home.line + "% (جدا از برتری خانگی پایه)"));
    box.appendChild(cmEl("div", null, "قدرت شما: " + nf(r.a_power) + " — قدرت دشمن: " + nf(r.d_power)));
    if (r.launch_km && Object.keys(r.launch_km).length) box.appendChild(cmEl("div", "wnote", "🚛 موشک‌ها از نزدیک‌ترین لانچر شلیک شدند: " + Object.keys(r.launch_km).map(k => ((r.launch_names && r.launch_names[k]) || k) + " (" + nf(r.launch_km[k]) + " کیلومتر تا هدف)").join("، ")));
    if (r.no_launcher && Object.keys(r.no_launcher).length) box.appendChild(cmEl("div", "wnote", "🚛 بدون لانچر شلیک نشدند (هر لانچر موشک تا چند موشک): " + Object.keys(r.no_launcher).map(k => ((r.no_launcher_names && r.no_launcher_names[k]) || k) + " ×" + nf(r.no_launcher[k])).join("، ")));
    if (r.out_of_range && Object.keys(r.out_of_range).length) box.appendChild(cmEl("div", "wnote", "🎯 خارج از برد (در این حمله شرکت نکردند): " + Object.keys(r.out_of_range).map(k => ((r.out_names && r.out_names[k]) || k) + " ×" + nf(r.out_of_range[k]) + " (برد " + nf((r.range_info || {})[k] || 0) + " کیلومتر)").join("، ")));
    if (r.forward) box.appendChild(cmEl("div", "wnote", "🪖 نیروی زمینیِ مستقر در خودِ شهرِ هدف به شما اجازه‌ی نبرد زمینی در کشورِ غیرهمسایه را داد."));
    if (r.a_allies && Object.keys(r.a_allies).length) box.appendChild(cmEl("div", "wnote", "🤝 متحدانِ مستقر در این شهر کنار شما جنگیدند: " + Object.keys(r.a_allies).map(k => ((r.unit_names && r.unit_names.a && r.unit_names.a[k]) || k) + " ×" + nf(r.a_allies[k])).join("، ")));
    if (r.allies && Object.keys(r.allies).length) box.appendChild(cmEl("div", "wnote", "🤝 متحدانِ مستقر در این شهر کنار مدافعان جنگیدند: " + Object.keys(r.allies).map(k => ((r.unit_names && r.unit_names.d && r.unit_names.d[k]) || k) + " ×" + nf(r.allies[k])).join("، ")));
    if (r.air_cut) box.appendChild(cmEl("div", null, "پدافند دشمن " + Math.round(r.air_cut * 100) + "% از حمله‌ی هوایی و موشکی را رهگیری کرد."));
    if (r.ctrl) {   // قانون کنترل شهرها: تغییر کنترل شهر هدف و امتیاز کل جنگ
      const dl = r.ctrl.delta;
      box.appendChild(cmEl("div", null, "🎯 کنترل " + (r.ctrl.city || "شهر هدف") + ": " + Math.round(r.ctrl.before) + "% ← " + Math.round(r.ctrl.after) + "% (" + (dl > 0 ? "+" : "") + dl + ")"));
      if (r.ctrl.occupied) box.appendChild(cmEl("div", "wnote", "🏴 شهر اشغال شد؛ با رسیدن امتیاز جنگ به 90 به نفع شما می‌توانید صلح را تحمیل کنید و شهرهای دلخواه را بگیرید."));
      if (r.recapture) box.appendChild(cmEl("div", "wnote", "🔄 کامبک: کنترل دشمن روی " + (r.recapture.city || "یکی از شهرهای شما") + " کم شد (" + Math.round(r.recapture.before) + "% ← " + Math.round(r.recapture.after) + "%)" + (r.recapture.liberated ? " و این شهر آزاد شد." : ".")));
      box.appendChild(cmEl("div", null, scoreLine(r.score)));
      if (r.score_log) {   // دلیل تغییر امتیاز همین نبرد
        const sl = r.score_log, bx = cmEl("div", "wscl");
        bx.appendChild(cmEl("div", null, "📊 امتیاز جنگ: " + sgn(shared(sl.before, r.score)) + " ← " + sgn(shared(sl.after, r.score)) + " (" + sgn1(sl.delta) + ")"));
        (sl.parts || []).forEach(p => { const F = FAC[p.f] || { ic: "•", nm: "" }; bx.appendChild(cmEl("div", "wnote", F.ic + " " + F.nm + " " + sgn1(p.d) + " — " + p.why)); });
        if (sl.alert && sl.alert.type === "reach") bx.appendChild(cmEl("div", "wnote", sl.alert.mine ? "🏳️ به آستانه‌ی ‎±90 رسیدید!" : "⚠️ دشمن به آستانه‌ی ‎±90 رسید!"));
        box.appendChild(bx);
      }
    } else if (r.win && !r.finished) box.appendChild(cmEl("div", null, "پیشروی: +" + r.prog + "% · " + scoreLine(r.score)));
    if (r.can_finish) box.appendChild(cmEl("div", "wnote", "🏴 امتیاز جنگ به " + (r.finish_score || 90) + " به نفع شما رسید؛ می‌توانید بدون موافقت دشمن صلح را تحمیل کنید و مناطق دلخواه را بگیرید. جنگ خودکار تمام نمی‌شود: خودتان می‌بندید یا ادامه می‌دهید (تا 100 هم می‌شود رفت و ظرفیت امتیاز بیشتر می‌شود)؛ ولی اگر حریف کامبک بزند و برتری‌تان زیر 90 بیاید، این اجازه از دست می‌رود."));

    box.appendChild(cmEl("div", null, "یگان‌های مهاجم: " + unitsText(r.a_units, r.unit_names && r.unit_names.a)));
    box.appendChild(cmEl("div", null, (r.city ? "🛡 دفاع از " + r.city : "🛡 دفاع") + " — یگان‌های مدافع: " + unitsText(r.d_units, r.unit_names && r.unit_names.d, "بدون یگان")));
    if (r.d_free && Object.keys(r.d_free).length) box.appendChild(cmEl("div", "wnote", "از این یگان‌ها بدون شهر بودند و با " + Math.round((r.free_def || 0.5) * 100) + "% قدرت دفاع کردند: " + unitsText(r.d_free, r.unit_names && r.unit_names.d)));
    box.appendChild(cmEl("div", null, "تلفات شما: " + lossText(r.a_loss, r.loss_names && r.loss_names.a)));
    box.appendChild(cmEl("div", null, "تلفات دشمن: " + lossText(r.d_loss, r.loss_names && r.loss_names.d)));
    const dg = r.damage;
    if (dg && (dg.pwr > 0 || dg.eco > 0) && dg.total)
      box.appendChild(cmEl("div", null, "خسارت به زیرساخت دشمن: برق −" + dg.pwr + "%، اقتصاد −" + dg.eco + "% (جمع: برق " + dg.total.pwr + "%، اقتصاد " + dg.total.eco + "%)"));
    p.appendChild(box);
  }
  function progBar(label, val, enemy) {
    const w = cmEl("div", "wprog" + (enemy ? " en" : "")), l = cmEl("div", "wl"), b = cmEl("div", "wb"), i = cmEl("i");
    l.append(cmEl("span", null, label), cmEl("span", null, Math.round(val) + "%"));
    i.style.width = Math.max(0, Math.min(100, val)) + "%"; b.appendChild(i); w.append(l, b); return w;
  }
  // امتیاز جنگ مشترک (مثل Age of History 3): ‎-100 پیروزی کامل مدافع … 0 توازن … ‎+100 پیروزی کامل مهاجم؛ ±90 = تحمیل صلح
  function sgn(v) { const r = Math.round(v); return (r > 0 ? "+" : r < 0 ? "−" : "") + nf(Math.abs(r)); }
  const STAGE = {
    total_atk: ["🏆", "پیروزی کامل مهاجم"], peace_atk: ["🏳️", "مهاجم می‌تواند صلح را تحمیل کند"], atk: ["▶️", "جنگ به نفع مهاجم است"],
    balance: ["⚖️", "توازن جنگ"],
    def: ["◀️", "جنگ به نفع مدافع است"], peace_def: ["🏳️", "مدافع می‌تواند صلح را تحمیل کند"], total_def: ["🏆", "پیروزی کامل مدافع"]
  };
  function scoreLine(sc) {
    if (!sc) return "";
    const st = STAGE[sc.stage] || STAGE.balance;
    return "امتیاز جنگ: " + sgn(sc.value) + " — " + st[1] + " (" + (sc.side === "attacker" ? "شما مهاجم هستید" : "شما مدافع هستید") + ")";
  }
  // ---------------- نوار امتیاز جنگ (‎-100 … 0 … ‎+100) و عوامل آن
  // سه عامل جدا: 🏴 تصرف (40%) · ⚔️ نبرد (35%) · ⏳ زمان (25%)؛ زیرش «چرا امتیاز عوض شد؟» (تاریخچه‌ی دلیل‌ها) می‌آید.
  const FAC = {
    occupation: { ic: "🏴", nm: "تصرف", w: "40%" },
    battle: { ic: "⚔️", nm: "نبرد", w: "35%" },
    ticking: { ic: "⏳", nm: "زمان", w: "25%" },
  };
  const sgn1 = (v) => { const r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toLocaleString("en-US", { minimumFractionDigits: Math.abs(r) % 1 ? 1 : 0 }); };
  const goodBad = (v) => v > 0.04 ? "good" : v < -0.04 ? "bad" : "";
  const shared = (v, sc) => (sc && sc.side === "defender" ? -v : v) + 0;   // عددِ تاریخچه از دید شما است؛ نوار امتیاز مشترک است (مهاجم +، مدافع −)
  function ago(ts) {
    const s = Math.max(0, Math.round(srvNow() / 1000 - ts));
    if (s < 60) return "هم‌اکنون";
    if (s < 3600) return nf(Math.floor(s / 60)) + " دقیقه پیش";
    if (s < 86400) return nf(Math.floor(s / 3600)) + " ساعت پیش";
    return nf(Math.floor(s / 86400)) + " روز پیش";
  }
  // نوار مرکزی: ‎-100 سمت چپ (مدافع) · 0 وسط · ‎+100 سمت راست (مهاجم)؛ ناحیه‌ی تحمیل صلح در ±90 تا ±100 رنگ جدا دارد
  function scoreMeter(v, meAtk, opt) {
    opt = opt || {};
    v = Math.max(-100, Math.min(100, v));
    const aCls = meAtk ? "me" : "en", dCls = meAtk ? "en" : "me";
    const box = cmEl("div", "wsm" + (opt.big ? " big" : ""));
    const m = cmEl("div", "wsm-track");
    m.append(cmEl("i", "z zl"), cmEl("i", "z zr"));
    const f = cmEl("i", "wsm-fill " + (v >= 0 ? aCls : dCls));
    f.style.left = (v >= 0 ? 50 : 50 + v / 2) + "%"; f.style.width = Math.abs(v) / 2 + "%";
    m.appendChild(f);
    [[5, "t90"], [25, "t50"], [50, "t0"], [75, "t50"], [95, "t90"]].forEach(([p, k]) => { const u = cmEl("u", k); u.style.left = p + "%"; m.appendChild(u); });
    const pin = cmEl("b", "wsm-pin " + (Math.abs(v) < 0.5 ? "" : (v > 0 ? aCls : dCls)));
    pin.style.left = (50 + v / 2) + "%"; pin.dataset.v = sgn(v);
    m.appendChild(pin);
    box.appendChild(m);
    const sc = cmEl("div", "wsm-scale");
    [[0, "−100", ""], [25, "−50", ""], [50, "0", "ct"], [75, "+50", ""], [100, "+100", ""], [5, "−90 ▲", "pk lo"], [95, "+90 ▲", "pk lo"]].forEach(([p, t, k]) => {
      const s = cmEl("span", k, t); s.style.left = p + "%"; sc.appendChild(s);
    });
    box.appendChild(sc);
    return box;
  }
  // نوار کوچک هر عامل: صفر وسط (از دید شما: مثبت = به نفع شما)
  function miniBar(lead) {
    const bar = cmEl("div", "wfb"), i = cmEl("i", lead >= 0 ? "me" : "en");
    i.style.width = Math.min(50, Math.abs(lead) / 2) + "%"; i.style[lead >= 0 ? "left" : "right"] = "50%";
    bar.appendChild(i); return bar;
  }
  function factorDetail(k, w, c) {
    if (k === "occupation") return "کنترل شما بر خاک " + c.name + ": " + nf(Math.round(w.progress || 0)) + "% · کنترل " + c.name + " بر خاک شما: " + nf(Math.round(w.enemy_progress || 0)) + "%";
    if (k === "battle") {
      const b = w.battle;
      if (!b) return "هنوز نبردی ثبت نشده است.";
      return "تلفات وارده به دشمن $" + nf(b.killed) + " · تلفات شما $" + nf(b.lost) + " · پیروزی‌ها " + nf(Math.round(b.wins * 10) / 10) + " در برابر " + nf(Math.round(b.wins_enemy * 10) / 10);
    }
    const mine = (w.cities_ctrl || []).filter(x => x.occupied).length, theirs = (w.my_cities_ctrl || []).filter(x => x.occupied).length;
    return nf(mine) + " شهر دشمن در اشغال شما · " + nf(theirs) + " شهر شما در اشغال دشمن · هرچه اشغال طولانی‌تر باشد (تا 48 ساعت) امتیاز بیشتر";
  }
  function factorCards(w, c) {
    const sc = w.score, wrap = cmEl("div", "wfac3");
    Object.keys(FAC).forEach(k => {
      const x = sc.factors[k], F = FAC[k], card = cmEl("div", "wfc " + goodBad(x.lead));
      const top = cmEl("div", "wfc-top");
      top.append(cmEl("span", "wfc-nm", F.ic + " " + F.nm), cmEl("span", "wfc-w", "وزن " + F.w), cmEl("span", "wfc-chev", "‹"));
      const val = cmEl("div", "wfc-val " + goodBad(x.lead), sgn(x.lead));
      card.append(top, val, miniBar(x.lead));
      card.appendChild(cmEl("div", "wfc-pts", "سهم از امتیاز کل: " + sgn1(x.points * (sc.side === "attacker" ? 1 : -1))));
      card.appendChild(cmEl("div", "wfc-det", factorDetail(k, w, c)));
      // روی گوشی جزئیات پیش‌فرض بسته است و با لمس کارت باز می‌شود (حالت باز بین بازکشی‌ها می‌ماند)
      const WO = (WS.facOpen = WS.facOpen || {}), ok = w.id + ":" + k;
      if (WO[ok]) card.classList.add("open");
      card.onclick = () => { WO[ok] = !WO[ok]; card.classList.toggle("open", !!WO[ok]); };
      wrap.appendChild(card);
    });
    return wrap;
  }
  // «چرا امتیاز عوض شد؟»: هر ردیف یک رویداد (نبرد / فرسایش و برتری زمانی / بازمحاسبه) با تغییر کل و سهم هر عامل و دلیلش
  function scoreLog(w, opt) {
    opt = opt || {};
    const log = w.score_log || [], box = cmEl("div", "wlog");
    box.appendChild(cmEl("h4", null, "🧾 چرا امتیاز تغییر کرد؟"));
    if (!log.length) { box.appendChild(cmEl("div", "wlog-empty", "هنوز تغییری ثبت نشده است. با اولین نبرد یا گذر زمان، دلیل هر تغییر اینجا می‌آید.")); return box; }
    const lim = (WS.logLim = WS.logLim || {})[w.id] || 4;
    log.slice(0, lim).forEach(e => {
      const row = cmEl("div", "wle " + goodBad(e.delta) + (e.alert ? " al" : ""));
      const head = cmEl("div", "wle-h");
      const ic = e.kind === "time" ? "⏳" : e.kind === "adjust" ? "🔄" : "⚔️";
      const left = cmEl("div", "wle-t"); left.append(cmEl("span", "wle-ic", ic), cmEl("span", null, e.reason));
      const dl = cmEl("b", "wle-d " + goodBad(e.delta), sgn1(e.delta));
      head.append(left, dl);
      row.appendChild(head);
      const sub = cmEl("div", "wle-s"); sub.append(cmEl("span", null, ago(e.ts)), cmEl("span", "wle-ba", sgn(shared(e.before, w.score)) + " ← " + sgn(shared(e.after, w.score))));
      row.appendChild(sub);
      if (e.alert) row.appendChild(cmEl("div", "wle-al", e.alert.type === "reach" ? (e.alert.mine ? "🏳️ به آستانه‌ی ‎±90 رسیدید: می‌توانید صلح را تحمیل کنید" : "⚠️ دشمن به ‎±90 رسید: می‌تواند صلح را تحمیل کند") : (e.alert.mine ? "امتیاز از ‎±90 برگشت: اجازه‌ی تحمیل صلح از دست رفت" : "🛡 امتیاز دشمن از ‎±90 برگشت")));
      if (e.parts && e.parts.length) {
        const ps = cmEl("div", "wle-p");
        e.parts.forEach(p => {
          const F = FAC[p.f] || { ic: "•", nm: "" };
          const li = cmEl("div", "wle-pi " + goodBad(p.d));
          li.append(cmEl("span", "k", F.ic + " " + F.nm), cmEl("b", null, sgn1(p.d)), cmEl("span", "y", p.why));
          ps.appendChild(li);
        });
        row.appendChild(ps);
      }
      box.appendChild(row);
    });
    if (log.length > lim) {
      const more = cmEl("button", "wmore", "نمایش دلیل‌های قدیمی‌تر (" + nf(log.length - lim) + ") ‹"); more.type = "button";
      more.onclick = () => { WS.logLim[w.id] = lim + 6; drawPane(); }; box.appendChild(more);
    }
    return box;
  }
  function balanceBar(w, c) {
    const sc = w.score, box = cmEl("div", "wbal wscore");
    if (!sc) return box;
    const meAtk = sc.side === "attacker", v = Math.max(-100, Math.min(100, sc.value));
    const aN = (byCode[w.attacker_code] || {}).name || "مهاجم", dN = (byCode[w.defender_code] || {}).name || "مدافع";
    const aCls = meAtk ? "me" : "en", dCls = meAtk ? "en" : "me";
    const l = cmEl("div", "wl");
    l.append(cmEl("span", dCls, "🛡 مدافع: " + dN + (meAtk ? "" : " (شما)")), cmEl("span", aCls, "⚔️ مهاجم: " + aN + (meAtk ? " (شما)" : "")));
    box.appendChild(l);
    const lead = sc.lead, st = STAGE[sc.stage] || STAGE.balance;
    const cls = Math.abs(sc.value) < 3 ? "" : lead > 0 ? "good" : "bad";
    const hero = cmEl("div", "wsm-hero");
    hero.append(cmEl("div", "wnum " + cls, sgn(sc.value)), cmEl("div", "wsum " + cls, st[0] + " " + st[1] + (sc.stage === "balance" ? "" : lead > 0 ? " — به نفع شما" : " — به نفع " + c.name)));
    box.appendChild(hero);
    box.appendChild(scoreMeter(v, meAtk, { big: true }));
    if (Math.abs(sc.value) >= 90) {   // نوار هشدار: همیشه تا وقتی ±90 برقرار است دیده می‌شود
      const mine = lead > 0, fin = w.finish && w.finish.can;
      const bn = cmEl("div", "wbanner " + (mine ? "good" : "bad"));
      bn.appendChild(cmEl("span", null, mine ? "🏳️ به آستانه‌ی تحمیل صلح رسیده‌اید" + (fin ? "" : " (منطقه‌ای قابل تصرف نیست)") : "⚠️ " + c.name + " می‌تواند صلح را به شما تحمیل کند — با حمله‌ی موفق امتیاز را برگردانید"));
      box.appendChild(bn);
    }
    if (sc.factors) {
      box.appendChild(factorCards(w, c));
      box.appendChild(cmEl("div", "wnote", "امتیاز کل = تصرف×0.4 + نبرد×0.35 + زمان×0.25. با ‎+90 مهاجم و با ‎−90 مدافع می‌تواند صلح را تحمیل کند؛ اعداد کارت‌ها از دید شماست (مثبت = به نفع شما)."));
    } else box.appendChild(cmEl("div", "wnote", "این جنگ با قانون قدیمی (پیشروی) ادامه می‌یابد؛ امتیاز = پیشروی مهاجم − پیشروی مدافع."));
    box.appendChild(scoreLog(w));
    return box;
  }
  // ---------------- اعلان رسیدن امتیاز به ‎±90 (پنجره‌ی اعلان + لرزش + پیام تلگرام از سمت ربات)
  const AL = { q: [], shown: new Set(), open: false };
  const ALK = () => "ow_war_alert_" + (typeof season === "undefined" || season === null ? "x" : season) + "_" + (mine || "");
  function alLocal() { try { return JSON.parse(localStorage.getItem(ALK()) || "{}") || {}; } catch (e) { return {}; } }
  function alSeen() {   // «دیده‌شده» = بیشترینِ مرورگر و سرور (سرور بین دستگاه‌ها مشترک است)
    const m = alLocal(), sv = (WS.sv && WS.sv.alert_seen) || {};
    Object.keys(sv).forEach(k => { if ((m[k] || 0) < sv[k]) m[k] = sv[k]; });
    return m;
  }
  function alMark(war, id) {
    const m = alLocal(); if ((m[war] || 0) < id) { m[war] = id; try { localStorage.setItem(ALK(), JSON.stringify(m)); } catch (e) { /* پر یا بسته */ } }
    if (WS.sv) { WS.sv.alert_seen = WS.sv.alert_seen || {}; if ((WS.sv.alert_seen[war] || 0) < id) WS.sv.alert_seen[war] = id; }
    if (R()) cmApi("/api/war/alert_seen", { war: war, id: id }).catch(() => { /* بعداً دوباره با مرورگر هم‌خوان می‌شود */ });
  }
  function scanAlerts(d) {
    if (!d || !d.wars) return;
    const seen = alSeen();
    d.wars.forEach(w => {
      (w.score_log || []).slice().reverse().forEach(e => {
        if (!e.alert || e.id <= (seen[w.id] || 0) || AL.shown.has(e.id)) return;
        if (e.ts * 1000 < Date.now() - 6 * 3600 * 1000) return;
        AL.shown.add(e.id); AL.q.push({ war: w.id, e: e, code: w.code, sc: w.score });
      });
    });
    showAlert();
  }
  function showAlert() {
    if (AL.open || !AL.q.length) return;
    const a = AL.q.shift(), e = a.e, c = byCode[a.code], nm = c ? c.name : "دشمن";
    AL.open = true;
    const reach = e.alert.type === "reach", mineSide = e.alert.mine;
    const ov = cmEl("div", "walert " + (reach ? (mineSide ? "good" : "bad") : "info")), box = cmEl("div", "walert-box");
    const big = reach ? (mineSide ? "🏳️" : "⚠️") : "🛡";
    const title = reach ? (mineSide ? "به " + sgn(shared(e.after, a.sc)) + " رسیدید!" : nm + " به آستانه‌ی ±90 رسید!") : "امتیاز از ±90 برگشت";
    const text = reach
      ? (mineSide ? "می‌توانید بدون موافقت " + nm + " صلح را تحمیل کنید، مناطق دلخواه را بگیرید و 25% خزانه‌اش را ببرید. امتیاز تا 100 هم بالا می‌رود و ظرفیت گرفتن منطقه بیشتر می‌شود؛ ولی اگر حریف کامبک بزند این اجازه از دست می‌رود."
        : nm + " می‌تواند صلح را به شما تحمیل کند و مناطقی از شما بگیرد. با حمله‌ی موفق یا بازپس‌گیری شهرها امتیاز را به زیر 90 برگردانید.")
      : (mineSide ? "اجازه‌ی تحمیل صلح به " + nm + " فعلاً از دست رفت؛ با نبرد موفق دوباره به ±90 برسید." : "خطر تحمیل صلح از سوی " + nm + " فعلاً برطرف شد.");
    box.append(cmEl("div", "wa-ic", big), cmEl("h3", null, title), cmEl("div", "wa-sc", sgn(shared(e.before, a.sc)) + "  ←  " + sgn(shared(e.after, a.sc))), cmEl("p", null, text));
    if (e.reason) box.appendChild(cmEl("div", "wa-why", "دلیل: " + e.reason));
    const acts = cmEl("div", "wacts");
    const close = () => { alMark(a.war, e.id); ov.remove(); AL.open = false; showAlert(); };
    if (reach && mineSide) {
      const go = cmEl("button", "wact go", "انتخاب مناطق صلح 🏴"); go.type = "button";
      go.onclick = () => { close(); const w = WS.sv && WS.sv.wars.find(x => x.id === a.war); if (w && w.finish && w.finish.can) { WS.fin = { war: w.id, sel: new Set(), sort: "val" }; WS.atk = null; if (view !== "war") setView("war"); else drawPane(); } else toast("فعلاً منطقه‌ی قابل تصرفی نیست."); };
      acts.appendChild(go);
    }
    const ok = cmEl("button", "wact peace", reach && mineSide ? "بعداً" : "متوجه شدم"); ok.type = "button"; ok.onclick = close;
    acts.appendChild(ok); box.appendChild(acts); ov.appendChild(box); document.body.appendChild(ov);
    try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(reach && mineSide ? "success" : "warning"); } catch (x) { /* بی‌اثر */ }
  }
  function whyOf(w, T) {
    if (!T.inWar) return WHY.hours;
    if (T.startCf > 0) return WHY.start;
    if (w.why === "truce") return WHY.truce;
    if (w.why === "protected") return WHY.protected;
    return "";
  }
  function cdLeft(w) { return w.cooldown_until * 1000 - srvNow(); }
  // نیروی زمینی فقط روی خشکی می‌رود: همسایه‌بودن کافی نیست، باید مسیر زمینی تا شهر هدف باشد (land_km از سرور؛ null = دریا بین‌شان است)
  function gndReach(w, city) {
    const L = w.logi, ct = city || (w.cities && w.cities[0]);
    const fwd = !!(L && L.fwd && L.fwd[ct]);
    const land = !(L && L.land_km) || L.land_km[ct] != null;
    return (w.neighbor && land) || fwd;
  }
  function attackBox(w, c) {
    const A = WS.atk, box = cmEl("div");
    box.appendChild(cmEl("div", "wlead", "شاخه‌های حمله را انتخاب کنید:"));
    const chips = cmEl("div", "wchips");
    Object.keys(BR).forEach(k => {
      const off = k === "gnd" && !gndReach(w, A.city);   // نیروی زمینیِ مستقر در همین خشکی، یا همسایه با مسیر زمینی
      const ch = cmEl("button", "wchip" + (A.sel.has(k) && !off ? " on" : "") + (off ? " off" : ""), BR[k][1] + " " + BR[k][0] + (off ? " (فقط همسایه با مسیر خشکی یا با نیروی مستقر روی همان خشکی)" : "")); ch.type = "button";
      ch.onclick = () => { if (off) { toast("نیروی زمینی فقط روی خشکی و به کشورهای همسایه می‌رسد؛ یا باید نیروی زمینی روی همان خشکی مستقر کرده باشید."); return; } if (A.sel.has(k)) A.sel.delete(k); else A.sel.add(k); drawPane(); };
      chips.appendChild(ch);
    });
    box.appendChild(chips);
    if (w.cities && w.cities.length) {
      const cm = {}; (w.cities_ctrl || []).forEach(x => { cm[x.city] = x; });
      const sgd = {}; (w.sieges || []).forEach(x => { if (x.i_attack) sgd[x.city] = x; });   // شهرهایی که خودت محاصره/اشغالِ خودکار می‌کنی: حمله‌ی دستی ندارد
      if (!A.city || w.cities.indexOf(A.city) < 0 || (cm[A.city] && cm[A.city].occupied) || sgd[A.city]) A.city = w.cities.find(x => !(cm[x] && cm[x].occupied) && !sgd[x]) || w.cities[0];
      box.appendChild(cmEl("div", "wlead", "شهر هدف را انتخاب کنید:"));
      const cc = cmEl("div", "wchips");
      const cfm = {}; ((w.city_forces && w.city_forces.cities) || []).forEach(x => { cfm[x.city] = x; });
      w.cities.forEach(ct => {
        const occd = !!(cm[ct] && cm[ct].occupied), siegd = !!sgd[ct];
        const ch = cmEl("button", "wchip" + (A.city === ct ? " on" : "") + (occd || siegd ? " off" : ""), (siegd ? "⚔️ محاصره · " : "") + "📍 " + ct + ((w.terrain && w.terrain[ct]) ? " " + w.terrain[ct].icon : "") + (cfm[ct] ? " · ⚔ " + nf(cfm[ct].power) : "") + (cm[ct] ? (occd ? " · 🏴 اشغال" : " · کنترل " + Math.round(cm[ct].ctrl) + "%") : "")); ch.type = "button";
        ch.onclick = () => { if (occd) { toast("این شهر را قبلاً اشغال کرده‌اید."); return; } if (siegd) { toast("این شهر در محاصره‌ی شماست و نبرد خودکار جریان دارد؛ شهر دیگری را هدف بگیرید."); return; } A.city = ct; drawPane(); };
        cc.appendChild(ch);
      });
      box.appendChild(cc);
      const tr0 = w.terrain && w.terrain[A.city];   // زمینِ شهر هدف: کوه و جنگل به نفع مدافع و بر ضد مهاجم است
      if (tr0) box.appendChild(cmEl("div", "wnote", tr0.icon + " زمین " + A.city + ": " + tr0.name + (tr0.season && tr0.season.active ? " · " + tr0.season.icon + " " + tr0.season.name + " (سرما و گرما و گل‌ولای روی ضرایب اثر می‌گذارد)" : "") + " · زمینیِ مدافع ×" + tr0.gnd_def + " · زمینیِ مهاجم ×" + tr0.gnd_att + " · هوایی ×" + tr0.air));
      if (w.city_forces) {
        const sel = (w.city_forces.cities || []).find(x => x.city === A.city);
        box.appendChild(cmEl("div", "wnote", "🛰 نیروی مستقر در " + A.city + ": " + (sel && sel.count ? (forceUnits(sel, w.city_forces.names).trim() ? forceUnits(sel, w.city_forces.names) + " " : "") + "(قدرت " + nf(sel.power) + ")" : "هیچ یگانی")
          + (w.city_forces.free.count ? " · یگان‌های بدون شهر دشمن (در دفاع از هر شهر با نصف قدرت کمک می‌کنند): " + nf(w.city_forces.free.count) : "")));
      } else box.appendChild(cmEl("div", "wnote", "🛰 با 3 ماهواره قدرت نیروی هر شهر دشمن را می‌بینید."));
    }
    if (w.logi) {   // لجستیک: هرچه شهر هدف از پایتخت شما دورتر باشد، تأمین و نگهداری گران‌تر است
      const L = w.logi, km = L.km[A.city || (w.cities && w.cities[0])] || 0;
      const day = [...A.sel].filter(k => !(k === "gnd" && !gndReach(w, A.city))).reduce((t, k) => t + (L.upkeep[k] || 0), 0);
      const mul = Math.min(L.max_mul, 1 + L.deploy_step * km / 1000);
      box.appendChild(cmEl("div", "wnote", "🚚 فاصله از پایتخت شما: " + nf(km) + " کیلومتر · هزینه‌ی تأمین این حمله: $" + nf(Math.round(day * L.supply_rate * km / 1000)) + " + " + nf(Math.round(Math.round(day * L.supply_rate * km / 1000) * L.food_rate)) + " 🌾 غذا"
        + " · نگهداری یگان‌های اعزام‌شده تا " + nf(L.deploy_hours) + " ساعت بعد ×" + (Math.round(mul * 100) / 100)));
    }
    if (w.logi && w.logi.range && A.sel.has("mis")) {   // برد موشک: موشکی که کوتاه‌تر از فاصله‌ی هدف برد دارد در حمله شرکت نمی‌کند
      const L = w.logi, tc = A.city || (w.cities && w.cities[0]), cap = L.km[tc] || 0;
      const mk = (L.mis_km || {})[tc], km = mk != null ? mk : cap;   // موشک از نزدیک‌ترین لانچر شلیک می‌شود؛ برد با فاصله‌ی آن لانچر تا هدف سنجیده می‌شود
      const parts = Object.keys(L.range).map(k => (L.range_names[k] || k) + " (برد " + nf(L.range[k]) + " کیلومتر، " + nf((L.mis_n || {})[k] || 0) + " عدد): " + (mk == null ? "❌ بدون لانچر" : km <= L.range[k] ? "✅ می‌رسد" : "❌ خارج از برد"));
      box.appendChild(cmEl("div", "wnote", (mk != null ? "🎯 فاصله‌ی نزدیک‌ترین لانچر تا هدف " + nf(km) + " کیلومتر است (از پایتخت: " + nf(cap) + "). " : "🎯 فاصله‌ی هدف از پایتخت " + nf(cap) + " کیلومتر است. ") + parts.join(" · ")));
      const lc = L.launchers || 0, per = L.per_launcher || 3, tot = Object.keys(L.mis_n || {}).reduce((a, k) => a + (L.mis_n[k] || 0), 0);   // موشک به تنهایی شلیک نمی‌شود
      box.appendChild(cmEl("div", "wnote", "🚛 موشک بدون لانچر شلیک نمی‌شود: " + nf(lc) + " لانچر × " + nf(per) + " = " + nf(lc * per) + " موشک قابل شلیک (از " + nf(tot) + " موشک)" + (lc * per < tot ? " · بقیه شلیک نمی‌شوند؛ لانچر بخرید" : "")));
    }
    const acts = cmEl("div", "wacts");
    const go = cmEl("button", "wact", "شروع نبرد ⚔️"); go.type = "button";
    go.onclick = () => {
      const br = [...A.sel].filter(k => !(k === "gnd" && !gndReach(w, A.city)));
      if (!br.length) { toast("حداقل یک شاخه انتخاب کنید."); return; }
      const city = A.city || "";
      WS.atk = null;
      act("/api/war/attack", { war: w.id, branches: br, city: city }, null, (d) => { WS.report = d.report; });
    };
    const cancel = cmEl("button", "wact peace", "انصراف"); cancel.type = "button";
    cancel.onclick = () => { WS.atk = null; drawPane(); };
    acts.append(go, cancel); box.appendChild(acts); return box;
  }
  // ---------------- صفحه‌ی تحمیل صلح (مثل Age of History 3)
  // مهاجم در ‎+90 و مدافع در ‎−90 بدون موافقت طرف مقابل جنگ را تمام می‌کند. هر منطقه «ارزش صلح» دارد (سهم از کل ارزش کشور، %)
  // و جمع ارزش مناطق انتخابی نباید از ظرفیت امتیاز بیشتر شود. با تأیید: مالکیت منتقل، 25% خزانه‌ی دشمن، آتش‌بس 12 ساعته، پایان جنگ.
  function peacePage(w, c) {
    const F = WS.fin, fi = w.finish, regs = fi.regions || [], page = cmEl("div", "wpeace");
    F.sort = F.sort || "val";
    const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const pc = (n) => r1(n) + "%";   // ارزش صلح = سهم منطقه از کل ارزش کشور (%)؛ ظرفیت هم با همین واحد
    const used = regs.filter(r => F.sel.has(r.city)).reduce((a, r) => a + r.cost, 0);
    const left = Math.max(0, fi.capacity - used), over = used > fi.capacity + 1e-9;
    const maxCost = Math.max(1e-9, ...regs.map(r => r.cost));
    // --- سرصفحه
    const head = cmEl("div", "pphead"), back = cmEl("button", "ppback", "→"); back.type = "button";
    back.onclick = () => { WS.fin = null; drawPane(); };
    const ttl = cmEl("div", "ppt"); ttl.append(cmEl("h2", null, "🏴 تحمیل صلح"), cmEl("small", null, "به " + c.name + " · بدون موافقت آن‌ها"));
    const badge = cmEl("div", "ppbadge", sgn(w.score.value)); badge.title = "امتیاز جنگ";
    head.append(back, ttl, badge);
    page.appendChild(head);
    // --- ظرفیت باقی‌مانده (نوار دو‌رنگ: مصرف‌شده + باقی‌مانده)
    const cap = cmEl("div", "ppcap" + (left < 0.05 && fi.capacity > 0 ? " full" : ""));
    const top = cmEl("div", "ppcap-top");
    const big = cmEl("div", "ppcap-big"); big.append(cmEl("span", "n", pc(left)), cmEl("span", "u", "ظرفیت باقی‌مانده"));
    const side = cmEl("div", "ppcap-side");
    side.append(cmEl("div", null, "کل ظرفیت: " + pc(fi.capacity)), cmEl("div", null, "مصرف‌شده: " + pc(used)));
    top.append(big, side);
    const bar = cmEl("div", "ppcap-bar"), seg1 = cmEl("i", "u"), seg2 = cmEl("i", "r");
    const tot = Math.max(fi.capacity, used, 1e-9);
    seg1.style.width = (100 * Math.min(used, tot) / tot) + "%"; seg2.style.width = (100 * left / tot) + "%";
    bar.append(seg1, seg2);
    cap.append(top, bar);
    cap.appendChild(cmEl("div", "ppcap-n", "ظرفیت = برتری شما در امتیاز جنگ (حداکثر 100) × " + nf(Math.round((fi.cap_frac || 0.6) * 100)) + "%. هر منطقه به اندازه‌ی «ارزش صلح»‌اش از آن کم می‌کند."));
    page.appendChild(cap);
    // --- ابزار مرتب‌سازی
    const tools = cmEl("div", "pptools");
    [["val", "بیشترین ارزش"], ["low", "کمترین ارزش"], ["ctrl", "بیشترین کنترل"]].forEach(([k, t]) => {
      const b = cmEl("button", "wchip" + (F.sort === k ? " on" : ""), t); b.type = "button";
      b.onclick = () => { F.sort = k; drawPane(); }; tools.appendChild(b);
    });
    const fb = cmEl("button", "wchip" + (F.only ? " on" : ""), "فقط قابل انتخاب"); fb.type = "button";
    fb.onclick = () => { F.only = !F.only; drawPane(); }; tools.appendChild(fb);
    page.appendChild(tools);
    // --- مناطق
    const fitsNow = (r) => !r.locked && (F.sel.has(r.city) || r.cost <= left + 1e-9);
    let list = regs.slice();
    if (F.only) list = list.filter(fitsNow);
    list.sort((a, b) => F.sort === "low" ? a.cost - b.cost : F.sort === "ctrl" ? (b.ctrl + (b.occupied ? 1000 : 0)) - (a.ctrl + (a.occupied ? 1000 : 0)) : b.cost - a.cost);
    const grid = cmEl("div", "ppgrid");
    if (!list.length) grid.appendChild(cmEl("div", "wempty", "منطقه‌ای با این فیلتر نیست."));
    list.forEach(r => {
      const sel = F.sel.has(r.city), rem = fi.capacity - used;
      const tooBig = !sel && !r.locked && r.cost > rem + 1e-9;
      const maxed = !sel && !r.locked && F.sel.size >= fi.max_take;
      const off = r.locked || tooBig || maxed;
      const b = cmEl("button", "ppreg" + (sel ? " on" : "") + (off ? " off" : "") + (r.locked ? " lock" : "") + (r.capital ? " cap" : "")); b.type = "button";
      const r0 = cmEl("div", "r0");
      r0.append(cmEl("span", "ck", sel ? "✓" : r.locked ? "🔒" : ""), cmEl("span", "nm", (r.capital ? "🏛 " : "") + (r.city || "—")));
      const val = cmEl("div", "r1"), vv = cmEl("span", "v", pc(r.cost));
      val.append(cmEl("span", "k", "ارزش صلح"), vv);
      const vb = cmEl("div", "vb"), vi = cmEl("i"); vi.style.width = Math.max(4, 100 * r.cost / maxCost) + "%"; vb.appendChild(vi);
      const tags = cmEl("div", "tg");
      if (r.locked) tags.appendChild(cmEl("span", "tag lk", w.ctrl_mode === 1 ? "فقط با کنترل کامل پایتخت در همین جنگ" : "فقط با پیروزی کامل 100"));
      else if (r.occupied) tags.appendChild(cmEl("span", "tag ok", "✅ تحت کنترل کامل شما"));
      else if (r.ctrl > 0) tags.appendChild(cmEl("span", "tag", "کنترل شما " + nf(Math.round(r.ctrl)) + "%"));
      else tags.appendChild(cmEl("span", "tag", "بدون اشغال"));
      if (r.origin && r.origin !== c.code) tags.appendChild(cmEl("span", "tag", "اصالتاً خاک " + ((byCode[r.origin] || {}).name || r.origin)));
      b.append(r0, val, vb, tags);
      if (tooBig) b.appendChild(cmEl("div", "why", "ظرفیت کافی نیست: " + pc(r.cost - Math.max(0, rem)) + " کم دارید"));
      else if (maxed) b.appendChild(cmEl("div", "why", c.name + " باید دست‌کم یک منطقه نگه دارد"));
      else if (!off && !sel) b.appendChild(cmEl("div", "aft", "باقی‌مانده پس از انتخاب: " + pc(rem - r.cost)));
      else if (sel) b.appendChild(cmEl("div", "aft", "انتخاب شد · " + pc(r.cost) + " از ظرفیت مصرف می‌شود"));
      b.onclick = () => {
        if (r.locked) { toast(w.ctrl_mode === 1 ? "پایتخت فقط وقتی قابل تصرف است که در همین جنگ کاملاً تحت کنترل شما باشد." : "تصرف پایتخت فقط با امتیاز جنگ 100% ممکن است."); return; }
        if (sel) F.sel.delete(r.city);
        else {
          if (tooBig) { toast("ارزش صلح این منطقه (" + pc(r.cost) + ") از ظرفیت باقی‌مانده‌ی شما (" + pc(Math.max(0, rem)) + ") بیشتر است."); return; }
          if (maxed) { toast("دشمن باید دست‌کم یک منطقه نگه دارد؛ کشور فتح نمی‌شود."); return; }
          F.sel.add(r.city);
        }
        drawPane();
      };
      grid.appendChild(b);
    });
    page.appendChild(grid);
    const rules = cmEl("div", "pprules");
    rules.appendChild(cmEl("b", null, "با تأیید صلح"));
    [["🗺", "مالکیت مناطق انتخابی به شما منتقل می‌شود (تا پایان فصل)."],
     ["💰", Math.round((fi.loot_rate || 0.25) * 100) + "% از خزانه‌ی " + c.name + " به شما می‌رسد."],
     ["🕊", "آتش‌بس " + nf((fi.truce_secs || 43200) / 3600) + " ساعته برای هر دو طرف فعال می‌شود."],
     ["🏁", "جنگ بلافاصله تمام می‌شود."],
     ["🏛", "پایتخت فقط با شرط ویژه قابل تصرف است و " + c.name + " همیشه دست‌کم یک منطقه نگه می‌دارد."]].forEach(([i, t]) => {
      const li = cmEl("div", "li"); li.append(cmEl("span", null, i), cmEl("span", null, t)); rules.appendChild(li);
    });
    page.appendChild(rules);
    if (!fi.must_pick) page.appendChild(cmEl("div", "wnote", "با ظرفیت فعلی منطقه‌ای قابل تصرف نیست؛ می‌توانید فقط صلح را تحمیل کنید (غنیمت و آتش‌بس). برای ظرفیت بیشتر امتیاز را بالاتر ببرید."));
    // --- نوار پایین
    const foot = cmEl("div", "ppfoot");
    const sum = cmEl("div", "sum3");
    [["انتخاب‌شده", nf(F.sel.size) + " / " + nf(fi.max_take)], ["ارزش مصرف‌شده", pc(used) + " / " + pc(fi.capacity)], ["باقی‌مانده", pc(left)]].forEach(([k, v], i) => {
      const x = cmEl("div", i === 2 ? "hl" : ""); x.append(cmEl("small", null, k), cmEl("b", null, v)); sum.appendChild(x);
    });
    foot.appendChild(sum);
    const acts = cmEl("div", "wacts"), go = cmEl("button", "wact go" + (fi.must_pick && !F.sel.size || over ? " off" : ""), "تأیید صلح 🏴"); go.type = "button";
    go.onclick = () => {
      if (fi.must_pick && !F.sel.size) { toast("حداقل یک منطقه برای تصرف انتخاب کنید."); return; }
      const cities = [...F.sel];
      const msg = "صلح را تحمیل می‌کنید؟ " + (cities.length ? "مالکیت " + nf(cities.length) + " منطقه منتقل می‌شود، " : "") + Math.round((fi.loot_rate || 0.25) * 100) + "% خزانه‌ی " + c.name + " به شما می‌رسد، آتش‌بس 12 ساعته شروع می‌شود و جنگ تمام می‌شود.";
      const run = () => { WS.fin = null; act("/api/war/finish", { war: w.id, cities: cities }, null, (d) => { WS.report = Object.assign({ finished: true, win: true, enemy: c.code }, d.report); }); };
      try { if (tg.showConfirm) tg.showConfirm(msg.slice(0, 250), (ok) => { if (ok) run(); }); else if (window.confirm(msg)) run(); }
      catch (e) { if (window.confirm(msg)) run(); }
    };
    const cancel = cmEl("button", "wact peace", "انصراف"); cancel.type = "button";
    cancel.onclick = () => { WS.fin = null; drawPane(); };
    acts.append(go, cancel); foot.appendChild(acts); page.appendChild(foot);
    page.onscroll = () => { F.scroll = page.scrollTop; };
    return page;
  }
  function drawPeacePage(host) {
    const old = document.getElementById("wpeace"); if (old) old.remove();
    if (!WS.fin) return;
    const w = WS.sv && WS.sv.wars.find(x => x.id === WS.fin.war), c = w && byCode[w.code];
    if (!w || !c || !w.finish || !w.finish.can) {
      if (WS.fin && WS.sv) toast("اجازه‌ی تحمیل صلح (امتیاز ‎±90) دیگر برقرار نیست.");
      WS.fin = null; return;
    }
    const F = WS.fin, ok = new Set((w.finish.regions || []).filter(r => !r.locked).map(r => r.city));
    [...F.sel].forEach(ct => { if (!ok.has(ct)) F.sel.delete(ct); });
    const page = peacePage(w, c); page.id = "wpeace";
    host.appendChild(page); page.scrollTop = F.scroll || 0;
  }
  function ctrlBlock(f, w, c) {
    const rows = (list, title, enemy) => {
      const act = (list || []).filter(x => x.ctrl > 0 || x.occupied);
      if (!act.length) return;
      f.appendChild(cmEl("div", "wlead", title));
      act.forEach(x => f.appendChild(progBar("📍 " + (x.city || "—") + (x.capital ? " (پایتخت)" : "") + (x.share ? " · ارزش " + x.share.toLocaleString("en-US") + "%" : "") + (x.occupied ? " 🏴 اشغال" : ""), x.ctrl, enemy)));
    };
    rows(w.cities_ctrl, "کنترل شما بر شهرهای " + c.name + ":", false);
    rows(w.my_cities_ctrl, "کنترل " + c.name + " بر شهرهای شما:", true);
  }
  // نبردِ خودکارِ شهرهای محاصره‌شده: هر ۱۰ دقیقه یک دور تا نابودیِ یک طرف یا خروجِ ارتش از شهر (w.sieges از سرور)
  function siegeBlock(w) {
    const box = cmEl("div", "wsiege");
    (w.sieges || []).forEach(sg => {
      const left = () => Math.max(0, sg.next_at * 1000 - srvNow());
      let head, tip;
      if (sg.undefended) {
        head = (sg.i_attack ? "🏴 اشغال خودکار " : "🏴 شهر شما بی‌مدافع است و اشغال می‌شود: ") + sg.city + " · کنترل " + Math.round(sg.ctrl) + "%";
        tip = sg.i_attack ? "مدافعی نمانده؛ هر دور کنترل بالا می‌رود تا شهر اشغال شود." : "برای جلوگیری، یگان بفرستید یا مهاجم را از شهر بیرون کنید.";
      } else if (sg.i_attack) {
        head = "⚔️ محاصره‌ی " + sg.city + " · یگان‌های شما " + nf(sg.att_units) + " · مدافعان " + nf(sg.def_units);
        tip = "نبردِ خودکار (هر دور هزینه‌ی تأمین دارد). برای توقف، یگان‌هایتان را از شهر خارج کنید؛ عقب‌نشینی به خاک خودتان هزینه‌ی کامل نمی‌گیرد.";
      } else {
        head = "🛡 " + sg.city + " در محاصره‌ی دشمن است · مدافعان شما " + nf(sg.def_units) + " · مهاجمان " + nf(sg.att_units);
        tip = "نبردِ خودکار تا نابودیِ یک طرف ادامه دارد؛ می‌توانید یگان‌هایتان را عقب بکشید یا نیروی کمکی بفرستید.";
      }
      const row = cmEl("div", "wnote");
      row.append(head + " · دور بعد: ");
      const t = cmEl("b", null, dur(left())); t.dataset.sg = String(sg.next_at * 1000); row.appendChild(t);
      row.appendChild(cmEl("div", null, tip)); row.lastChild.style.cssText = "opacity:.75;font-size:12px;margin-top:2px";
      box.appendChild(row);
    });
    return box;
  }
  function drawFronts(pane) {
    const v = WS.sv, T = timing(Date.now());
    if (!v) return;
    drawReport(pane);
    if (!v.wars.length) return;
    const p = cmEl("div", "wpanel"), h = cmEl("h3"); h.append("⚔️ ", "جبهه‌های فعال " + nf(v.wars.length) + " از " + nf(v.max_wars)); p.appendChild(h);
    v.wars.forEach(w => {
      const c = byCode[w.code]; if (!c) return;
      const f = cmEl("div", "wfront"), top = cmEl("div", "wtop"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c));
      const sub = cmEl("small", null, "شروع: " + fmtT(w.ts * 1000) + (w.declared_by_me ? " · شما اعلان کردید" : " · دشمن اعلان کرد"));
      const nm = cmEl("b", null, c.name); if (w.neighbor) nm.appendChild(cmEl("span", "wtag gold", "همسایه"));
      n.append(nm, sub); top.append(fl, n); f.appendChild(top);
      f.appendChild(balanceBar(w, c));
      if (w.ctrl_mode === 1) {
        f.appendChild(cmEl("div", "wnote", "🏳️ با رسیدن امتیاز جنگ به " + nf(w.tiers.full) + " به نفع شما (مهاجم: ‎+90 · مدافع: ‎−90) می‌توانید بدون موافقت دشمن صلح را تحمیل کنید: مناطق دلخواه را از روی «ارزش صلح» هر منطقه (و در حد ظرفیت امتیاز) انتخاب می‌کنید، مالکیتشان منتقل می‌شود، 25% خزانه‌ی دشمن را می‌گیرید و آتش‌بس 12 ساعته شروع می‌شود. پایتخت فقط با شرط ویژه قابل تصرف است و دشمن فتح نمی‌شود."));
        ctrlBlock(f, w, c);
      }
      if (w.sieges && w.sieges.length) f.appendChild(siegeBlock(w));
      const why = whyOf(w, T), cd = cdLeft(w);
      if (why) f.appendChild(cmEl("div", "wwhy", why));
      else if (cd > 0) { const d = cmEl("div", "wwhy", "نیروها در حال آماده‌سازی‌اند: " + dur(cd)); d.dataset.cd = String(w.cooldown_until * 1000); f.appendChild(d); }
      if (WS.atk && WS.atk.war === w.id) f.appendChild(attackBox(w, c));
      else {
        const acts = cmEl("div", "wacts");
        const ok = !why && cd <= 0;
        const at = cmEl("button", "wact" + (ok ? "" : " off"), "حمله ⚔️"); at.type = "button";
        at.onclick = () => {
          if (why) { toast(why); return; }
          if (cdLeft(w) > 0) { toast("نیروها هنوز آماده نیستند."); return; }
          WS.fin = null; WS.atk = { war: w.id, sel: new Set(Object.keys(BR).filter(k => k !== "gnd" || w.neighbor)) }; drawPane();
        };
        const pc = w.peace, early = !!pc.locked;
        const pb = cmEl("button", "wact peace" + (early || pc.mine ? " off" : ""), pc.theirs ? "پذیرش صلح 🕊" : pc.mine ? "پیشنهاد صلح ارسال شد" : "پیشنهاد صلح 🕊"); pb.type = "button";
        pb.onclick = () => {
          if (early) { toast("صلح وقتی ممکن می‌شود که امتیاز یکی از دو طرف (مهاجم یا مدافع) دست‌کم " + nf(pc.min_score || 25) + " شود."); return; }
          if (pc.mine) { toast("منتظر پاسخ " + c.name + " هستید."); return; }
          act("/api/war/peace", { war: w.id }, pc.theirs ? "جنگ با صلح پایان یافت 🕊" : "پیشنهاد صلح فرستاده شد 🕊");
        };
        acts.append(at, pb);
        if (w.finish && w.finish.can) {
          const fb = cmEl("button", "wact", "تحمیل صلح 🏴"); fb.type = "button";
          fb.onclick = () => { WS.fin = { war: w.id, sel: new Set() }; WS.atk = null; drawPane(); };
          acts.appendChild(fb);
        }
        f.appendChild(acts);
      }
      p.appendChild(f);
    });
    pane.appendChild(p);
  }

  // --- تب‌های دیگر
  function newsRows(list, p) {
    if (!list.length) p.appendChild(cmEl("div", "wempty", "هنوز خبری از جبهه‌ها نیست، فرمانده."));
    list.slice(0, 50).forEach(n => { const d = cmEl("div", "wnews", n.text); d.appendChild(cmEl("small", null, fmtT(n.t))); p.appendChild(d); });
  }
  function histRows(p) {
    if (R()) {
      const hs = (WS.sv && WS.sv.history) || [];
      if (!hs.length) p.appendChild(cmEl("div", "wempty", "هنوز جنگی تمام نشده است."));
      hs.forEach(w => {
        const c = byCode[w.code]; if (!c) return;
        const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn"), nm = cmEl("b", null, c.name);
        nm.appendChild(cmEl("span", "wtag " + (w.result === "win" ? "gold" : w.result === "lose" ? "red" : ""), w.result === "win" ? "پیروزی" : w.result === "lose" ? "شکست" : "بدون برنده"));
        fl.appendChild(flagNode(c));
        n.append(nm, cmEl("small", null, (REASON[w.reason] || "پایان") + " · " + nf(w.battles) + " نبرد · " + fmtT(w.ended_ts * 1000)));
        row.append(fl, n); p.appendChild(row);
      });
      return;
    }
    const S = load();
    if (!S.wars.length) p.appendChild(cmEl("div", "wempty", "هنوز با هیچ کشوری وارد جنگ نشده‌اید."));
    S.wars.forEach(w => {
      const c = byCode[w.code]; if (!c) return;
      const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c)); n.append(cmEl("b", null, c.name), cmEl("small", null, "اعلان جنگ: " + fmtT(w.t) + " · در جریان"));
      row.append(fl, n); p.appendChild(row);
    });
  }
  function drawDoctrine(p) {
    const cur = R() ? (WS.sv ? WS.sv.doctrine.key : "bal") : load().doctrine;
    const mul = {}; if (R() && WS.sv) WS.sv.doctrine.list.forEach(d => { mul[d.key] = d; });
    DOCS.forEach(([k, ic, nm, ds]) => {
      const d = cmEl("div", "wdoc" + (cur === k ? " on" : "")), t = cmEl("div"), b = cmEl("b", null, nm);
      t.append(b, cmEl("p", null, ds));
      const m = mul[k];
      if (m) t.appendChild(cmEl("div", "wmul", "حمله ×" + m.atk + " · دفاع ×" + m.def + " · غنیمت ×" + m.loot + " · تلفات ×" + m.loss));
      d.append(cmEl("span", "wi", ic), t);
      d.onclick = () => {
        if (k === cur) return;
        if (R()) {
          const at = WS.sv && WS.sv.doctrine.can_change_at * 1000;
          if (at && srvNow() < at) { toast("دکترین را " + dur(at - srvNow()) + " دیگر می‌شود عوض کرد."); return; }
          act("/api/war/doctrine", { doctrine: k }, "دکترین «" + nm + "» انتخاب شد");
        } else { load().doctrine = k; save(); toast("دکترین «" + nm + "» انتخاب شد"); drawPane(); }
      };
      p.appendChild(d);
    });
    if (R()) p.appendChild(cmEl("div", "wnote", "دکترین بر قدرت حمله و دفاع، غنیمت و تلفات هر نبرد اثر می‌گذارد و هر 12 ساعت یک بار قابل تغییر است."));
    else p.appendChild(cmEl("div", "wnote", "📴 حالت محلی: دکترین فقط روی همین گوشی ذخیره می‌شود و اثری ندارد."));
  }
  function drawPane() {
    const pane = el("wpane"); pane.innerHTML = ""; const tab = curTab();
    drawPeacePage(pane);
    if (tab === "declare") {
      if (R()) drawFronts(pane);
      const p = cmEl("div", "wpanel"), h = cmEl("h3"); h.append("⚔️ ", "اعلان جنگ");
      p.append(h, cmEl("div", "wlead", "برای تسخیر یک کشور، اول به آن اعلان جنگ کنید، فرمانده. جنگ با یک کشور، جنگ با همه‌ی خاک‌های زیر فرمان آن است. با متحد یا طرف پیمان، اول پیمان را در دیپلماسی بشکنید." + (R() ? " فقط کشورهای دارای بازیکن در فهرست‌اند و هر بازیکن حداکثر " + ((WS.sv && WS.sv.max_wars) || 3) + " جنگ هم‌زمان دارد." : "")));
      const q = cmEl("input", "search wsearch"); q.type = "search"; q.placeholder = "🔍 جستجوی کشور…"; q.autocomplete = "off"; q.value = WS.q;
      q.oninput = () => { WS.q = q.value; WS.shown = PAGE; drawList(); };
      p.appendChild(q); p.appendChild(cmEl("div", null)).id = "wlist";
      if (!R()) p.appendChild(cmEl("div", "wnote", "📴 حالت محلی: اعلان‌های جنگ فقط روی همین گوشی ذخیره می‌شوند و نبردی انجام نمی‌شود."));
      pane.appendChild(p); drawList();
      return;
    }
    const p = cmEl("div", "wpanel"), h = cmEl("h3");
    if (tab === "news") { h.append("📰 ", "اخبار جنگ"); p.appendChild(h); newsRows(R() ? ((WS.sv && WS.sv.news) || []).map(n => ({ t: n.ts * 1000, text: n.text })) : load().news, p); }
    else if (tab === "hist") { h.append("📄 ", "تاریخچه‌ی جنگ‌ها"); p.appendChild(h); histRows(p); }
    else if (tab === "cities") { h.append("🏙 ", "نیروی شهرها"); p.appendChild(h); drawCities(p); }
    else { h.append("🎯 ", "دکترین نظامی"); p.appendChild(h); p.appendChild(cmEl("div", "wlead", "شیوه‌ی جنگیدن کشورتان را انتخاب کنید.")); drawDoctrine(p); }
    pane.appendChild(p);
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("wavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("wcash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d && typeof ecoPending === "function" ? ECO.d.cash + ecoPending() : GAME.cash));
    drawStatus(); drawTabs(); drawPane();
    if (R()) sLoad();
  }
  let polls = 0;
  function tick() {
    if (view !== "war") { polls = 0; return; }
    drawStatus();
    if (R()) {
      if (++polls % 20 === 0 && !WS.atk) sLoad();   // هر ~20 ثانیه وضعیت تازه می‌شود
      document.querySelectorAll("[data-cd]").forEach(d => {   // شمارش معکوس آمادگی نیروها
        const left = Number(d.dataset.cd) - srvNow();
        if (left <= 0) drawPane(); else d.textContent = "نیروها در حال آماده‌سازی‌اند: " + dur(left);
      });
      document.querySelectorAll("[data-sg]").forEach(d => {   // شمارش معکوسِ دورِ بعدِ محاصره
        const left = Number(d.dataset.sg) - srvNow();
        if (left > 0) d.textContent = dur(left); else { d.textContent = "اکنون"; if (!WS.atk && polls % 5 === 0) sLoad(); }
      });
    }
  }
  setInterval(tick, 1000);
  // اعلان ±90 در هر صفحه‌ای دیده شود: خارج از صفحه‌ی جنگ هر ~45 ثانیه وضعیت را می‌گیرد (فقط اگر کشور دارید و صفحه دیده می‌شود)
  const bgPoll = () => { if (R() && typeof mine !== "undefined" && mine && view !== "war" && !document.hidden && !WS.busy && !AL.open) sLoad(); };
  setInterval(bgPoll, 45000);
  setTimeout(bgPoll, 4000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(bgPoll, 500); });

  // ---------------- اتصال دکمه‌ها
  el("wavatar").onclick = () => setView("map");
  el("wcup").onclick = () => setView("rank");
  el("wbell").onclick = () => setView("notif");
  el("wgoal").onclick = () => openGoals();
  el("wback").onclick = () => setView("home");
  el("wtitle").onclick = () => setView("home");
  el("whelp").onclick = () => { const [F, T] = wHours(); toast("اعلان جنگ فقط بعد از آتش‌بس آغاز فصل ممکن است و نبردها فقط در ساعت جنگ (" + F + ":00 تا " + (T % 24) + ":00 به وقت تهران) انجام می‌شوند."); };

  // ---- برای کارت سریعِ کشور روی نقشه
  function info(code) {
    const c = byCode[code]; if (!c) return null;
    const now = srvNow(), T = timing(Date.now());
    let t = null, nb = false, known;
    if (R()) {
      t = (WS.sv && WS.sv.targets || []).find(x => x.code === code) || null;
      nb = !!(t && t.neighbor); known = !!t;
    } else {
      nb = ((typeof NEIGHBORS !== "undefined" && NEIGHBORS[mine]) || "").split(" ").includes(code);
      known = (typeof counts !== "undefined" && counts[code] > 0) || c.n > 0;
    }
    const truce = t && t.truce_until * 1000 > now ? t.truce_until * 1000 - now : 0;
    const prot = t && t.protected_until * 1000 > now ? t.protected_until * 1000 - now : 0;
    return { power: t && t.power != null ? t.power : null, nb, known, atWar: atWar(code), truce, prot, ceasefire: T.startCf > 0 };
  }
  async function ensure() { if (R() && (!WS.sv || Date.now() - WS.recv > 15000)) await sLoad(); }
  function tryDeclare(code) {
    const c = byCode[code]; if (!c) return;
    const I = info(code);
    if (I.truce) toast("آتش‌بس 12 ساعته‌ی بعد از صلح با " + c.name + " برقرار است؛ " + dur(I.truce) + " دیگر.");
    else if (I.prot) toast(c.name + " فعلاً در حمایت است.");
    else if (I.atWar) toast("با " + c.name + " در جنگ هستید.");
    else declare(c);
  }
  window.OWWar = { build, info, ensure, tryDeclare };
})();
;

/* ===== shop.js ===== */
/* صفحه‌ی فروشگاه (مثل عکس: نوار پول، توضیح کوتاه، و کارت هر بسته). بعد از اسکریپت اصلی index.html بارگذاری می‌شود.
   فعلاً هیچ بسته‌ای در فروشگاه نیست؛ برای اضافه‌کردن یک بسته فقط یک ردیف به CATALOG زیر اضافه کنید.
   نکته‌ی طراحی: هرچه با پول واقعی خریده می‌شود باید به حساب بازیکن وصل باشد (ظاهر، اشتراک، …) نه به کشور،
   تا با فتح‌شدن کشور از بین نرود. پرداخت هنوز وصل نیست؛ وقتی بسته‌ای اضافه شد، تابع pay() را به پرداخت واقعی وصل کنید. */
(function () {
  "use strict";

  // ---------------- فهرست بسته‌ها (فعلاً خالی)
  // هر مورد: { id: "vip", icon: "👑", title: "اشتراک VIP", desc: "توضیح کوتاه", price: 380000, tier: "gold" | "hex" | "coin",
  //            details: "توضیح کامل که بعد از لمس نشان داده می‌شود" }
  const CATALOG = [
    { id: "worker", icon: "👷", title: "کارگر یک‌ماهه", desc: "کارگرِ اشتراکی؛ هر خرید 30 روز اعتبار دارد. هر کارگر هم‌زمان یک ساخت را انجام می‌دهد.", price: null, tier: "gold",   // قیمت را سرور می‌دهد (loadOrder)؛ تا نرسیده null است و خرید بسته است
      details: "یک کارگر اشتراکی (30 روزه) به حساب شما اضافه می‌شود؛ بعد از 30 روز کارگر کم می‌شود (ساخت‌های در جریان ادامه می‌یابند) و برای ادامه باید دوباره بخرید. برای ساخت و ارتقای زیرساخت یا بخش اقتصادی کارگر لازم است؛ هر کارگر تا پایان ساختِ خودش مشغول می‌ماند و بعد آزاد می‌شود. هر چه بیشتر بخرید، ساخت‌های هم‌زمان بیشتری دارید. هر حساب از ابتدا یک کارگر رایگان دارد و فقط 4 کارگر دیگر قابل خرید است (حداکثر 5 کارگر)." },
  ];

  const CSS = `
  .shbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .shbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(143,168,74,.06); }
  .shbar b { font-size: 18px; cursor: pointer; }
  .shbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 18px; direction: ltr; }
  .shlead { font-size: 16px; line-height: 2; color: #c4c8d1; margin: 0 2px 16px; }
  .shitem { display: flex; align-items: center; gap: 14px; padding: 16px; margin-bottom: 14px; border-radius: 24px; cursor: pointer;
    border: 2px solid rgba(143,168,74,.55); background: linear-gradient(160deg, rgba(150,105,30,.22), var(--card)); }
  .shitem .shic { flex: none; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px;
    border: 1px solid rgba(143,168,74,.55); background: rgba(143,168,74,.08); }
  .shitem.hex .shic { border-radius: 18px; }
  .shitem .shtx { flex: 1; min-width: 0; }
  .shitem h4 { font-size: 20px; margin-bottom: 4px; color: var(--gold); }
  .shitem p { font-size: 14px; line-height: 1.8; color: #c4c8d1; }
  .shitem .shpr { flex: none; font-size: 18px; font-weight: 700; color: #f1e3b8; white-space: nowrap; }
  .shorder { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 2px solid rgba(143,168,74,.55); background: rgba(143,168,74,.07); font-size: 14px; line-height: 2; color: #e6e8ee; }
  .shorder h4 { font-size: 18px; color: var(--gold); margin-bottom: 4px; }
  .shorder .shcard { direction: ltr; text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #f1e3b8; margin: 6px 0; cursor: pointer; }
  .shorder .shnote { font-size: 14px; color: var(--hint); }
  .shorder.bad { border-color: rgba(220,90,90,.6); background: rgba(220,90,90,.07); }
  .shitem .shic.wk { border: none; background: none; padding: 0; }
  .shitem .shic.wk img.ic { width: 64px; height: 64px; vertical-align: 0; }
  .shorder .shrbox { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
  .shorder .shrnote { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: inherit; font: inherit; font-size: 14px; }
  .shorder .shrrow { display: flex; gap: 8px; }
  .shorder .shrbtn { flex: 1; padding: 12px 10px; border-radius: 16px; border: 1px solid var(--gold); background: rgba(143,168,74,.12); color: var(--gold); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .shorder .shrbtn.alt { flex: none; font-weight: 400; background: none; }
  .shorder .shrbtn:disabled { opacity: .45; cursor: default; }
  .shempty { text-align: center; color: var(--hint); padding: 40px 12px; font-size: 16px; line-height: 2.1; border-radius: 24px;
    border: 1px dashed var(--line); background: rgba(255,255,255,.02); }
  .shempty .shbig { font-size: 44px; display: block; margin-bottom: 8px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  const nf = (n) => Number(n).toLocaleString("en-US");

  // پرداخت کارت‌به‌کارت: «کارگر» سفارش می‌شود، کاربر واریز می‌کند و رسید را (از داخل همین صفحه) می‌فرستد؛
  // ادمین در ربات تأیید می‌کند و کارگر روی سرور اضافه می‌شود. TEST_MODE=true فقط برای آزمایش (خرید بدون پرداخت).
  const TEST_MODE = false;
  if (TEST_MODE) CATALOG[0].price = 50000;   // در حالت آزمایشی سروری برای قیمت نیست
  let ORDERS = [];   // سفارش‌های باز و ردشده‌ی اخیر کاربر (از سرور؛ چند سفارش هم‌زمان ممکن است)
  const needServer = async () => { throw new Error("خرید فقط با اتصال به سرور ممکن است."); };
  async function pay(item) {
    if (item.price == null) { toast("قیمت هنوز از سرور نرسیده است ⏳"); return; }
    if (item.id === "worker" && typeof ECO !== "undefined" && ECO.d && ECO.d.workers && ECO.d.workers.total >= 5) { toast("به حداکثر 5 کارگر رسیده‌اید 👷"); return; }
    if (item.id !== "worker") { toast("این مورد هنوز قابل خرید نیست 🚧"); return; }
    try {
      if (TEST_MODE) {
        const d = await cmCall("/api/shop/buy", { item: item.id }, ecoLocal);
        ecoApply(d);
        toast("کارگر خریداری شد 👷 (حالت آزمایشی؛ پرداخت وصل نیست)");
      } else {
        const r = await cmCall("/api/shop/order", { item: item.id }, needServer);
        ORDERS = ORDERS.concat([r.order]);
        toast("سفارش ثبت شد؛ مشخصات کارت را ببینید 💳");
      }
    } catch (e) { toast(e.message); }
    build();
  }
  function open(item) {
    if (item.price == null) { toast("قیمت در حال دریافت است؛ چند لحظه بعد دوباره امتحان کنید ⏳"); loadOrder(); return; }
    // تلگرام پیام showConfirm را حداکثر 256 نویسه می‌پذیرد؛ بیشتر از آن خطا می‌دهد و هیچ پنجره‌ای باز نمی‌شود
    let msg = item.title + " — " + nf(item.price) + " تومان" + (item.id === "worker" ? " / 30 روز" : "") + "\n\n" + (item.desc || "") + "\n\n" + (TEST_MODE ? "تأیید می‌کنید؟" : "سفارش ثبت شود و مشخصات کارت نشان داده شود؟");
    if (msg.length > 250) msg = msg.slice(0, 247) + "…";
    const go = () => pay(item);
    try {
      if (tg.showConfirm) tg.showConfirm(msg, (ok) => { if (ok) go(); });
      else if (window.confirm(msg)) go();
    } catch (e) { if (window.confirm(msg)) go(); }   // اگر پنجره‌ی تلگرام خطا داد، پنجره‌ی ساده‌ی مرورگر
  }
  async function loadOrder() {
    if (TEST_MODE || typeof cmCall !== "function") return;
    try {
      const was = ORDERS.filter((o) => o.status === "pending").map((o) => o.id);
      const cardWas = {}; ORDERS.forEach((o) => { if (o.status === "pending") cardWas[o.id] = o.card; });
      const d = await cmCall("/api/shop/order", undefined, needServer);
      ORDERS = d.orders || [];
      if (ORDERS.some((o) => o.status === "pending" && cardWas[o.id] !== undefined && cardWas[o.id] !== o.card))
        toast("شماره کارت تغییر کرد؛ اگر هنوز واریز نکرده‌اید فقط به کارت جدید واریز کنید 💳");
      const wk = CATALOG.find((x) => x.id === "worker"); if (wk && d.price > 0) wk.price = d.price;   // قیمت را ادمین در ربات تعیین می‌کند
      const open = ORDERS.filter((o) => o.status === "pending").map((o) => o.id);
      if (was.some((id) => !open.includes(id))) {   // ادمین درباره‌ی یکی تصمیم گرفته: شمار کارگرها را تازه کن
        toast(ORDERS.some((o) => o.status === "rejected") ? "سفارشی بررسی شد؛ وضعیت را ببینید" : "پرداخت تأیید شد؛ کارگر اضافه شد 👷");
        if (typeof ecoLoad === "function") ecoLoad();
      }
    } catch (e) { /* بدون سرور: بخش سفارش نشان داده نمی‌شود */ }
    draw();
  }
  function copyCard(num) {
    try { if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(num); toast("شماره کارت کپی شد"); return; } } catch (e) { /* ادامه */ }
    toast(num);
  }
  // ---------------- ارسال رسید از داخل مینی‌اپ (عکس/PDF و/یا شماره پیگیری) ← POST /api/shop/receipt
  const MAX_RCPT = 3;                      // با سقف سمت سرور (economy.MAX_RECEIPTS) یکی است
  const RBUSY = {}, RNOTE = {};            // سفارش ← در حال ارسال؟ / متن شماره پیگیری (با تازه‌شدنِ لیست از بین نرود)
  let RTARGET = null;                      // سفارشی که فایل انتخاب‌شده برایش است
  // عکس را کوچک می‌کند (حداکثر 1600 پیکسل، JPEG) تا زیر حدّ سرور (2 مگابایت) بماند؛ PDF همان‌طور فرستاده می‌شود
  function readReceiptFile(file) {
    return new Promise((resolve, reject) => {
      if (file.type === "application/pdf") {
        if (file.size > 1500000) return reject(new Error("حجم PDF زیاد است (حداکثر 1.5 مگابایت)."));
        const r = new FileReader();
        r.onload = () => resolve(r.result); r.onerror = () => reject(new Error("فایل خوانده نشد."));
        return r.readAsDataURL(file);
      }
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = 0.82, d = c.toDataURL("image/jpeg", q);
        while (d.length > 2500000 && q > 0.3) { q -= 0.15; d = c.toDataURL("image/jpeg", q); }   // باز هم بزرگ بود: کیفیت کمتر
        resolve(d);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("این فایل عکس معتبری نیست.")); };
      img.src = url;
    });
  }
  async function sendReceipt(oid, file, note) {
    if (RBUSY[oid]) return;
    if (typeof cmApi !== "function") { toast("ارسال رسید فقط با اتصال به سرور ممکن است."); return; }
    RBUSY[oid] = true; draw(true);
    try {
      const body = { order_id: oid };
      if (note) body.note = note;
      if (file) body.file = await readReceiptFile(file);
      const d = await cmApi("/api/shop/receipt", body, 60000);
      if (d && d.orders) ORDERS = d.orders;
      RNOTE[oid] = "";
      toast("✅ رسید به ادمین رسید؛ منتظر تأیید بمانید");
    } catch (e) { toast(e.message || "ارسال نشد؛ دوباره تلاش کنید."); }
    RBUSY[oid] = false; draw(true);
  }
  const rfile = document.createElement("input");   // یک ورودی فایلِ ثابت (با تازه‌شدنِ لیست سفارش‌ها نابود نمی‌شود)
  rfile.type = "file"; rfile.accept = "image/*,application/pdf"; rfile.style.display = "none";
  rfile.onchange = () => {
    const f = rfile.files && rfile.files[0], oid = RTARGET; rfile.value = "";
    if (f && oid != null) sendReceipt(oid, f, (RNOTE[oid] || "").trim());
  };
  document.body.appendChild(rfile);

  function orderBox(o) {
    const b = cmEl("div", "shorder" + (o.status === "rejected" ? " bad" : ""));
    if (o.status === "pending") {
      const cd = cmEl("div", "shcard", String(o.card || "").replace(/(\d{4})(?=\d)/g, "$1 ")); cd.onclick = () => copyCard(String(o.card || ""));
      b.append(cmEl("h4", null, "💳 سفارش کارگر #" + o.id),
        "مبلغ " + nf(o.amount) + " تومان را کارت‌به‌کارت به این کارت واریز کنید (برای کپی لمس کنید):", cd,
        "به نام: " + (o.holder || "—"), document.createElement("br"),
        "بعد از واریز، عکس رسید را از همین‌جا بفرستید. بعد از تأیید ادمین، کارگر 30 روزه اضافه می‌شود.",
        cmEl("div", "shnote", o.receipts ? "رسید ارسال‌شده: " + nf(o.receipts) + " از " + nf(MAX_RCPT) : "هنوز رسیدی نفرستاده‌اید."));
      const full = (o.receipts || 0) >= MAX_RCPT, busy = !!RBUSY[o.id], box = cmEl("div", "shrbox");
      const note = document.createElement("input");
      note.type = "text"; note.className = "shrnote"; note.maxLength = 300; note.placeholder = "شماره پیگیری (اختیاری)";
      note.value = RNOTE[o.id] || ""; note.disabled = busy || full; note.oninput = () => { RNOTE[o.id] = note.value; };
      const row = cmEl("div", "shrrow"), pick = cmEl("button", "shrbtn", busy ? "⏳ در حال ارسال…" : "📎 انتخاب و ارسال رسید");
      pick.type = "button"; pick.disabled = busy || full;
      pick.onclick = () => { RTARGET = o.id; rfile.click(); };
      const txt = cmEl("button", "shrbtn alt", "ارسال متن"); txt.type = "button"; txt.disabled = busy || full;
      txt.onclick = () => { const t = (RNOTE[o.id] || "").trim(); if (!t) { toast("شماره پیگیری را بنویسید یا عکس رسید را انتخاب کنید."); return; } sendReceipt(o.id, null, t); };
      row.append(pick, txt); box.append(note, row);
      if (full) box.appendChild(cmEl("div", "shnote", "سقف رسید این سفارش پر شده؛ منتظر بررسی ادمین بمانید."));
      b.appendChild(box);
    } else {
      b.append(cmEl("h4", null, "❌ سفارش #" + o.id + " تأیید نشد"), "اگر واریز کرده‌اید با ادمین در ارتباط باشید.");
    }
    return b;
  }

  function draw(force) {
    const a = document.activeElement;
    if (!force && a && a.classList && a.classList.contains("shrnote")) return;   // کاربر دارد شماره پیگیری می‌نویسد؛ لیست پاک نشود
    const box = el("shlist"); box.innerHTML = "";
    ORDERS.forEach((o) => box.appendChild(orderBox(o)));
    if (!CATALOG.length) {
      const e = cmEl("div", "shempty");
      e.append(cmEl("span", "shbig", "🛍"), "فعلاً چیزی برای فروش نیست، فرمانده.", document.createElement("br"), "بسته‌ها به‌زودی اینجا می‌آیند.");
      box.appendChild(e); return;
    }
    CATALOG.forEach((it) => {
      const isWk = it.id === "worker";
      const c = cmEl("div", "shitem " + (it.tier || "")), ic = cmEl("div", "shic" + (isWk ? " wk" : ""), it.icon || "🛍"), tx = cmEl("div", "shtx");
      const wd = (typeof ECO !== "undefined" && ECO.d && ECO.d.workers && isWk) ? ECO.d.workers : null;
      tx.append(cmEl("h4", null, it.title), cmEl("p", null, (it.desc || "") + (wd ? " — شما: " + nf(wd.total) + " از 5 کارگر (" + nf(wd.free) + " آزاد)" + (wd.total >= 5 ? " ✅ حداکثر" : "") + (() => { const s = ECO.d.wsub; return s && s.exp && s.exp.length ? "؛ اولین اشتراک " + nf(Math.max(1, Math.ceil((s.exp[0] - ECO.d.now) / 86400))) + " روز دیگر تمام می‌شود" : ""; })() : "")));
      const tag = it.tag || (isWk ? "اشتراک ماهانه" : "");
      if (tag) tx.insertBefore(cmEl("span", "shtag", tag), tx.firstChild);
      const pr = it.price == null && isWk ? 50000 : it.price;
      const price = cmEl("div", "shprice");
      price.append(cmEl("b", null, pr == null ? "…" : nf(pr)), cmEl("span", null, pr == null ? "در حال دریافت قیمت" : "تومان" + (isWk ? " / ماه" : "")));
      const buy = cmEl("button", "shbuy", "خرید"); buy.type = "button";
      buy.onclick = (e) => { e.stopPropagation(); open(it); };
      const main = cmEl("div", "shmain"); main.append(ic, tx);
      const foot = cmEl("div", "shfoot"); foot.append(price, buy);
      c.append(main, foot);   // در RTL آیکن سمت راست می‌افتد
      c.onclick = () => open(it);
      box.appendChild(c);
    });
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("savatar2"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("shcash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d && typeof ecoPending === "function" ? ECO.d.cash + ecoPending() : GAME.cash));
    if (typeof ECO !== "undefined" && !ECO.d && !ECO.err && typeof ecoLoad === "function") ecoLoad();   // شمار کارگرها
    draw();
    loadOrder();
  }

  // صفحه‌ی بازِ فروشگاه هر 20 ثانیه سفارش‌ها را تازه می‌کند تا تغییر کارت (یا تصمیم ادمین) را بی‌رفرش ببیند
  if (typeof setInterval === "function") setInterval(() => { if (typeof view !== "undefined" && view === "shop") loadOrder(); }, 20000);
  el("savatar2").onclick = () => setView("map");
  el("shcup").onclick = () => setView("rank");
  el("shbell").onclick = () => setView("notif");
  el("shgoal").onclick = () => openGoals();
  el("shback").onclick = () => setView("home");
  el("shtitle").onclick = () => setView("home");

  window.OWShop = { build };
})();
;

/* ===== market.js ===== */
/* صفحه‌ی بازار جهانی (کالاها، نمودار، مبادله، معامله‌های من). بعد از اسکریپت اصلی index.html بارگذاری می‌شود
   و از همان تابع‌ها و متغیرهای سراسری آن (el, cmEl, toast, cmApi, GAME, mine, dur, setView, ecoLoad, …) استفاده می‌کند.
   با سرور (REMOTE): قیمت‌ها، خرید/فروش منابع و یگان‌ها، مبادله و آگهی بین بازیکن‌ها از /api/market می‌آید و سمت سرور حساب می‌شود.
   بدون سرور (یا وقتی سرور در دسترس نیست): حالت محلی روی همین گوشی؛ خرید/فروش، مبادله و آگهی با خریدار و فروشنده‌ی فرضی (localApi). */
(function () {
  "use strict";

  const CSS = `
  .mkbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .mkbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(143,168,74,.06); }
  .mkbar b { font-size: 18px; cursor: pointer; }
  .mkbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 18px; direction: ltr; }
  .mkinfo { position: relative; padding: 16px; margin-bottom: 14px; border-radius: 26px; border: 2px solid rgba(143,168,74,.5);
    background: linear-gradient(160deg, rgba(150,105,30,.2), var(--card)); }
  .mkinfo h3 { font-size: 20px; margin-bottom: 8px; padding-inline-end: 48px; }
  .mkinfo p { font-size: 14px; line-height: 2; color: #c4c8d1; }
  .mkinfo .mkq { position: absolute; top: 14px; left: 14px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 18px;
    color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .mkidx { display: inline-flex; align-items: center; gap: 10px; margin: 14px 0 4px; padding: 12px 18px; border-radius: 999px;
    border: 1px solid var(--line); background: rgba(255,255,255,.03); font-size: 16px; }
  .mkidx b { font-size: 18px; direction: ltr; }
  .mkclosed { margin-top: 10px; font-size: 14px; line-height: 2; color: #ff9d8a; }
  .up { color: #4fd9a0; } .dn { color: #ff7a7a; } .fl { color: #d9dde6; }
  .mktabs { display: flex; gap: 8px; margin: 0 0 14px; overflow-x: auto; }
  .mktab { flex: none; padding: 12px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 14px; color: var(--gold);
    background: rgba(150,105,30,.14); border: 2px solid rgba(143,168,74,.5); white-space: nowrap; }
  .mktab.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #f59a3d, #d9701f); border-color: #f59a3d; }
  .mkpanel { border-radius: 28px; padding: 16px; margin-bottom: 14px; border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .mkpanel .mkh { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
  .mkpanel .mkh small { font-weight: 400; font-size: 14px; color: var(--hint); cursor: pointer; }
  .mkrow { display: flex; align-items: center; gap: 12px; padding: 12px 2px; cursor: pointer; border-top: 1px solid rgba(255,255,255,.07); }
  .mkrow:first-of-type { border-top: 0; }
  .mkrow.noroute { opacity: .6; } .mkrow.noroute .mkn small { color: #ff9a8a; }
  .mkrow .mki { flex: none; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; font-size: 28px;
    border-radius: 18px; border: 1px solid rgba(143,168,74,.5); background: rgba(143,168,74,.07); }
  .mkrow .mki.rnd { border-radius: 50%; border-color: rgba(120,150,230,.5); background: rgba(120,150,230,.12); }
  .mkrow .mkn { flex: 1; min-width: 0; }
  .mkrow .mkn b { display: block; font-size: 18px; font-weight: 500; }
  .mkrow .mkn small { display: block; color: var(--hint); font-size: 13px; margin-top: 2px; }
  .mkrow .mkspark { flex: none; width: 90px; height: 36px; direction: ltr; }
  .mkrow .mkp { flex: none; width: 96px; text-align: left; direction: ltr; font-size: 18px; font-weight: 700; }
  .mkrow .mkp small { display: block; font-size: 14px; font-weight: 700; }
  .mkempty { text-align: center; color: var(--hint); padding: 22px 8px; font-size: 14px; line-height: 2; }
  .mkchips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 14px; }
  .mkchip { padding: 10px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 14px; color: var(--hint); background: none; border: 2px solid var(--line); }
  .mkchip.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #f59a3d, #d9701f); border-color: #f59a3d; }
  .mklbl { font-size: 14px; color: #c4c8d1; margin: 6px 2px 2px; }
  .mkin { width: 100%; box-sizing: border-box; padding: 14px; border-radius: 16px; font: inherit; font-size: 18px; direction: ltr; text-align: center;
    color: var(--text, #fff); background: rgba(255,255,255,.05); border: 2px solid var(--line); margin: 6px 0 10px; }
  .mkgo { width: 100%; padding: 16px; border: 0; border-radius: 18px; cursor: pointer; font: inherit; font-size: 16px; font-weight: 700; color: #2a1d00;
    background: linear-gradient(160deg, #f59a3d, #d9701f); }
  .mkgo:disabled { opacity: .4; cursor: not-allowed; }
  .mknote { margin-top: 12px; color: #8b909c; font-size: 14px; line-height: 1.9; }
  .mksum { font-size: 14px; line-height: 2; color: #d9dde6; margin-bottom: 10px; }
  .mktr { display: flex; justify-content: space-between; gap: 10px; padding: 12px 2px; border-top: 1px solid rgba(255,255,255,.07); font-size: 14px; line-height: 1.8; }
  .mktr:first-of-type { border-top: 0; }
  .mktr small { display: block; color: var(--hint); font-size: 13px; }
  .mkmask { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,.6); }
  .mksheet { position: fixed; z-index: 901; left: 12px; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 82vh; overflow-y: auto;
    padding: 18px 16px; border-radius: 28px; border: 1px solid var(--line); background: #151925; }
  .mksheet h3 { font-size: 20px; margin-bottom: 4px; }
  .mksheet .mkx { position: absolute; top: 14px; left: 14px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 18px;
    color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .mkad { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .mkad .mkchip { margin: 0; }
  .mkdanger { color: #ff9d8a; border-color: rgba(255,122,122,.5); }
  .mkhelp p { font-size: 17.5px; line-height: 2.1; color: #d9dde6; margin-top: 14px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  // ---------------- قیمت‌ها (همان فرمول market.py؛ فقط برای حالت بدون سرور)
  const DAY = 86400, HIST = 7, FEE = 0.02, VOL = 0.08, FLAT = 0.2, REVERT = 0.08, UMARK = 1.2;
  const RESJ = [["oil", "نفت", "🛢", 0.5], ["steel", "فولاد", "⚙️", 0.5], ["food", "غذا", "🌾", 0.5], ["uranium", "اورانیوم", "⚗️", 0.55]];
  const NAME = {}; RESJ.forEach(r => { NAME[r[0]] = r; });
  const BR_ICON = { gnd: "🪖", air: "✈️", sea: "🚢", mis: "🚀", def: "📡" };
  function rnd(s, idx, day) {
    let x = (Math.imul(s, 73856093) ^ Math.imul(idx, 19349663) ^ Math.imul(day, 83492791)) >>> 0;
    x = Math.imul((x ^ (x >>> 16)) >>> 0, 0x45d9f3b) >>> 0;
    x = Math.imul((x ^ (x >>> 16)) >>> 0, 0x45d9f3b) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function priceOn(s, key, day) {
    const idx = RESJ.findIndex(r => r[0] === key), base = RESJ[idx][3];
    let p = base;
    for (let d = 1; d <= Math.max(0, day); d++) {
      const n = rnd(s, idx + 50, d) < FLAT ? 0 : (rnd(s, idx, d) - 0.5) * 2 * VOL;
      p = p * (1 + n); p += (base - p) * REVERT;
      p = Math.max(base * 0.25, Math.min(base * 4, p)); p = Math.round(p * 10000) / 10000;
    }
    return p;
  }
  const pct = (a, b) => (b ? Math.round((a / b - 1) * 1000) / 10 : 0);
  const indexOn = (s, day) => Math.round(1000 * RESJ.reduce((t, r) => t + priceOn(s, r[0], day) / r[3], 0) / RESJ.length);
  const R = () => typeof REMOTE !== "undefined" && REMOTE;
  const seasonNo = () => (typeof season === "undefined" || season === null ? 0 : Number(season) || 0);
  // ---------------- حالت محلی (بدون سرور)
  // خرید/فروش منابع و یگان و مبادله واقعی‌اند: روی خزانه و انبار اقتصادِ محلی و یگان‌های ارتشِ محلی (همین گوشی) اثر می‌گذارند.
  // آگهی‌ها فرضی‌اند: آگهی‌های «بازیکن‌ها» ساختگی و روزانه‌اند و آگهی خودتان را خریدارِ فرضی (بسته به قیمت) می‌خرد.
  const UBACK = 0.6, LIST_MAX = 5, LIST_H = 48, PLO = 0.5, PHI = 2, NPC_SLOTS = 5;
  const LMK = () => "ow_mkt_" + seasonNo() + "_" + (typeof mine === "undefined" ? "" : mine) + "_" + (typeof EPK === "undefined" ? "" : EPK);
  let wMem = null;
  function wLoad() {
    if (wMem) return wMem;
    let W = null;
    try { W = JSON.parse(localStorage.getItem(LMK()) || "null"); } catch (e) { /* ذخیره‌ی خراب */ }
    return (wMem = W && Array.isArray(W.lists) ? W : { lists: [], trades: [], nid: 1, npc: {} });
  }
  function wSave(W) { wMem = W; try { localStorage.setItem(LMK(), JSON.stringify(W)); } catch (e) { /* بدون ذخیره */ } }
  const startedTs = () => (typeof endsAt !== "undefined" && endsAt ? Math.floor((endsAt - SD * 86400000) / 1000) : 0);
  function timeInfo(now) {
    const st = startedTs();
    return { st, day: st ? Math.max(0, Math.floor((now - st) / DAY)) : 0, left: st ? Math.max(0, st + START_CEASEFIRE_DAYS * DAY - now) : 0 };
  }
  const AL = () => (window.OWArmy && window.OWArmy.L) || null;
  const udef = (k) => window.OWArmy.UNITS.find(u => u[0] === k && u[2] !== "sat");
  const ucost = (k, lvl) => window.OWArmy.F.cost(k, lvl);
  const ubuy = (k, lvl) => Math.round(ucost(k, lvl) * UMARK);
  const usell = (k, lvl) => Math.floor(ucost(k, lvl) * UBACK);
  const refOf = (kind, item, lvl, day) => (kind === "res" ? priceOn(seasonNo(), item, day) : ubuy(item, lvl || 1));
  function wLog(W, ts, kind, item, qty, price, total, who) {
    W.trades.unshift({ ts, kind, item, qty, price, total, item2: who || null, qty2: null });
    if (W.trades.length > 40) W.trades.length = 40;
  }
  function giveBack(S, M, kind, item, qty) {
    if (qty < 1) return;
    if (kind === "res") { S.st = S.st || {}; S.st[item] = (S.st[item] || 0) + qty; return; }
    M.esc[item] = Math.max(0, (M.esc[item] || 0) - qty);
    (M.units[item] = M.units[item] || { n: 0, rl: 1, rts: 0, rdur: 0 }).n += qty;
  }
  // خریدارهای فرضیِ آگهی‌های خودتان + پایان آگهی‌ها
  function wTick(S, M, W, now, tm) {
    const pool = countries.filter(c => c.code !== mine), lvl = (k) => ((M.units[k] || {}).rl || 1);
    W.lists = W.lists.filter(l => {
      const hrs = Math.floor((Math.min(now, l.exp) - l.chk) / 3600);
      if (hrs >= 1 && l.qty > 0) {
        const ref = refOf(l.kind, l.item, lvl(l.item), tm.day), ratio = ref ? l.price / ref : 9;
        if (ratio <= 1.15) {
          l.acc = (l.acc || 0) + l.qty0 * Math.min(0.35, 0.06 + 0.5 * Math.max(0, 1 - ratio)) * hrs;
          const sold = Math.min(l.qty, Math.floor(l.acc));
          if (sold > 0) {
            l.acc -= sold; l.qty -= sold;
            const got = Math.floor(Math.max(1, Math.ceil(l.price * sold - 1e-9)) * (1 - FEE));
            S.cash += got;
            if (l.kind === "unit") M.esc[l.item] = Math.max(0, (M.esc[l.item] || 0) - sold);
            const who = pool.length ? pool[Math.floor(rnd(seasonNo() + l.id, 77, Math.floor(l.chk / 3600) % 100000) * pool.length)].code : "";
            wLog(W, l.chk + hrs * 3600, "lsell", l.item, sold, l.price, got, who);
          }
        }
        l.chk += hrs * 3600;
      }
      if (l.qty <= 0) return false;
      if (now >= l.exp) { giveBack(S, M, l.kind, l.item, l.qty); wLog(W, l.exp, "lexp", l.item, l.qty, 0, 0); return false; }
      return true;
    });
  }
  // آگهی‌های ساختگیِ «بازیکن‌های دیگر»: هر روز چند آگهی، هرکدام 48 ساعت می‌ماند (ثابت برای هر روز و سیزن)
  function npcList(now, tm, W) {
    const A = window.OWArmy, s = seasonNo(), pool = countries.filter(c => c.code !== mine), out = [];
    const us = A.UNITS.filter(u => u[2] !== "sat");
    if (!pool.length) return out;
    const base = tm.st || 0, vday = Math.max(0, Math.floor((now - base) / DAY));
    for (let d = Math.max(0, vday - 2); d <= vday; d++) {
      for (let k = 0; k < NPC_SLOTS; k++) {
        const id = "n" + d + "_" + k, ts = base + d * DAY + Math.floor(rnd(s, 400 + k, d) * 0.5 * DAY);
        if (ts > now || now >= ts + LIST_H * 3600) continue;
        const kind = rnd(s, 300 + k, d) < 0.6 ? "res" : "unit", pd = tm.st ? Math.max(0, d) : 0;
        let item, qty, price;
        if (kind === "res") {
          item = RESJ[Math.floor(rnd(s, 500 + k, d) * RESJ.length)][0]; qty = (1 + Math.floor(rnd(s, 600 + k, d) * 20)) * 5000;
          price = Math.round(priceOn(s, item, pd) * (0.8 + 0.5 * rnd(s, 700 + k, d)) * 1e4) / 1e4;
        } else {
          item = us[Math.floor(rnd(s, 500 + k, d) * us.length)][0]; qty = 1 + Math.floor(rnd(s, 600 + k, d) * 5);
          price = Math.round(ubuy(item, 1) * (0.85 + 0.4 * rnd(s, 700 + k, d)));
        }
        const left = qty - ((W.npc || {})[id] || 0); if (left < 1) continue;
        const c = pool[Math.floor(rnd(s, 800 + k, d) * pool.length)];
        out.push({ id, kind, item, qty: left, price, ts, exp: ts + LIST_H * 3600, code: c.code, name: c.name, mine: false });
      }
    }
    return out;
  }
  function buildLocal(now, tm, S, M, W) {
    const A = window.OWArmy, v = AL().view(S, M, now), s = seasonNo(), day = tm.day;
    const own = W.lists.map(l => Object.assign({}, l, { mine: true, code: mine, name: cname(mine) }));
    const listings = own.concat(npcList(now, tm, W)).sort((a, b) => a.price - b.price || String(a.id).localeCompare(String(b.id)));
    const nBy = {}; listings.forEach(l => { nBy[l.item] = (nBy[l.item] || 0) + 1; });
    const res = RESJ.map(([key, name, icon, base]) => {
      const hist = []; for (let d = Math.max(0, day - HIST + 1); d <= day; d++) hist.push(priceOn(s, key, d));
      const p = hist[hist.length - 1], prev = hist.length > 1 ? hist[hist.length - 2] : p;
      return { key, name, icon, base, price: p, chg: pct(p, prev), hist, buy: p * (1 + FEE), sell: p * (1 - FEE), stock: Math.floor((S.st || {})[key] || 0), listings: nBy[key] || 0 };
    });
    const units = A.UNITS.filter(u => u[2] !== "sat").map(u => {
      const m = M.units[u[0]] || { n: 0, rl: 1 }, lv = m.rl || 1, vu = v.units.find(x => x.key === u[0]) || {}, br = v.branches.find(x => x.key === u[2]) || { cap: 0, used: 0 };
      return { key: u[0], name: u[1], branch: u[2], icon: u[3], chg: 0, listings: nBy[u[0]] || 0, prices: [1, 2, 3, 4, 5].map(l => ubuy(u[0], l)),
        owned: m.n, queued: vu.queued || 0, level: lv, buy: ubuy(u[0], lv), sell: usell(u[0], lv), room: Math.max(0, br.cap - br.used) };
    });
    const branches = A.BRANCHES.filter(b => b[0] !== "sat").map(b => ({ key: b[0], name: b[1], icon: b[2] }));
    return { now, open: tm.left === 0, start_left: tm.left, day, fee: FEE, index: { v: indexOn(s, day), chg: pct(indexOn(s, day), day ? indexOn(s, day - 1) : indexOn(s, 0)) },
      res, units, branches, cities: AL().cities(), levels: 5, trades: W.trades, listings, list: { max: LIST_MAX, hours: LIST_H, lo: PLO, hi: PHI, mine: own.length }, buyback: UBACK, local: false, offline: true };
  }
  function lctx() {
    const al = AL(); if (!al) throw new Error("صفحه‌ی ارتش بارگذاری نشده است.");
    const now = Math.floor(Date.now() / 1000), tm = timeInfo(now), { S, M } = al.sync(now), W = wLoad();
    M.esc = M.esc || {}; S.st = S.st || {}; W.npc = W.npc || {};
    wTick(S, M, W, now, tm);
    const c = { al, now, tm, S, M, W };
    elSave(S); al.save(M); wSave(W);   // پایان آگهی‌ها / فروش‌های فرضی همین‌جا ذخیره می‌شود
    return c;
  }
  function localApi(path, body) {
    const c = lctx(), { al, now, tm, S, M, W } = c, b = body || {}, s = seasonNo();
    const done = () => { elSave(S); al.save(M); wSave(W); return buildLocal(now, tm, S, M, W); };
    const qtyOf = (v) => { const q = Math.floor(Number(v)); if (!(q >= 1) || q > 1e9) throw new Error("تعداد نامعتبر است."); return q; };
    const have = (k) => Math.floor(S.st[k] || 0);
    const mu = (k) => (M.units[k] = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 });
    const cityOk = (city) => {   // مثل _need_city در سرور؛ کشور بدون فهرست شهر نیازی به انتخاب ندارد
      const cs = AL().cities(); if (cs.length && cs.indexOf(city) < 0) throw new Error("شهر مستقر شدن یگان را انتخاب کنید.");
      return cs.length ? city : "";
    };
    const needRoom = (k, q) => {
      const v = al.view(S, M, now), br = v.branches.find(x => x.key === udef(k)[2]);
      if (!br || br.cap < 1) throw new Error("پایگاه این یگان را ندارید؛ اول " + (br ? br.base_name : "پایگاه") + " را بسازید.");
      const room = Math.max(0, br.cap - br.used);
      if (q > room) throw new Error("جای نگهداری کافی نیست (جای خالی: " + room + ")؛ " + br.base_name + " را ارتقا دهید.");
    };
    if (path === "/api/market") return done();
    if (path === "/api/market/cancel") {
      const l = W.lists.find(x => String(x.id) === String(b.id));
      if (!l) throw new Error("آگهی پیدا نشد (شاید فروخته یا بسته شده است).");
      giveBack(S, M, l.kind, l.item, l.qty); W.lists = W.lists.filter(x => x !== l); wLog(W, now, "unlist", l.item, l.qty, l.price, 0);
      return done();
    }
    if (tm.left > 0) throw new Error("بازار جهانی در آغاز فصل بسته است.");
    if (path === "/api/market/trade") {
      const key = b.item, side = b.side;
      if (!NAME[key]) throw new Error("کالای نامعتبر است.");
      if (side !== "buy" && side !== "sell") throw new Error("نوع معامله نامعتبر است.");
      const q = qtyOf(b.qty), price = priceOn(s, key, tm.day);
      if (side === "buy") {
        const total = Math.ceil(price * q * (1 + FEE)); if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
        S.cash -= total; S.st[key] = (S.st[key] || 0) + q; wLog(W, now, "buy", key, q, price, total);
      } else {
        if (have(key) < q) throw new Error("موجودی انبار کافی نیست.");
        const total = Math.floor(price * q * (1 - FEE)); S.cash += total; S.st[key] -= q; wLog(W, now, "sell", key, q, price, total);
      }
      return done();
    }
    if (path === "/api/market/swap") {
      const give = b.give, take = b.take;
      if (!NAME[give] || !NAME[take] || give === take) throw new Error("دو کالای متفاوت انتخاب کنید.");
      const q = qtyOf(b.qty), pg = priceOn(s, give, tm.day), pt = priceOn(s, take, tm.day), got = Math.floor(q * pg * (1 - FEE) / (pt * (1 + FEE)));
      if (got < 1) throw new Error("مقدار برای مبادله خیلی کم است.");
      if (have(give) < q) throw new Error("موجودی انبار کافی نیست.");
      S.st[give] -= q; S.st[take] = (S.st[take] || 0) + got;
      W.trades.unshift({ ts: now, kind: "swap", item: give, qty: q, price: pg, total: 0, item2: take, qty2: got }); if (W.trades.length > 40) W.trades.length = 40;
      return done();
    }
    if (path === "/api/market/unit") {
      const key = b.unit, side = b.side;
      if (!udef(key)) throw new Error("یگان نامعتبر است.");
      if (side !== "buy" && side !== "sell") throw new Error("نوع معامله نامعتبر است.");
      const q = qtyOf(b.qty), lvl = (M.units[key] || {}).rl || 1;
      if (side === "buy") {
        const city = cityOk(b.city); needRoom(key, q); const price = ubuy(key, lvl), total = price * q; if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
        S.cash -= total; mu(key).n += q; AL().cityAdd(mu(key), q, city); wLog(W, now, "buy", key, q, price, total);
      } else {
        const price = usell(key, lvl), total = price * q; if ((M.units[key] || { n: 0 }).n < q) throw new Error("این تعداد یگان ندارید.");
        S.cash += total; mu(key).n -= q; if (window.OWArmy) OWArmy.L.cityTake(mu(key), q); wLog(W, now, "sell", key, q, price, total);
      }
      return done();
    }
    if (path === "/api/market/list") {
      const kind = b.kind, item = b.item;
      if (kind === "res") { if (!NAME[item]) throw new Error("کالای نامعتبر است."); } else if (kind === "unit") { if (!udef(item)) throw new Error("یگان نامعتبر است."); } else throw new Error("نوع آگهی نامعتبر است.");
      const q = qtyOf(b.qty); let p = Number(b.price);
      if (!isFinite(p) || p <= 0) throw new Error("قیمت نامعتبر است.");
      p = kind === "res" ? Math.round(p * 1e4) / 1e4 : Math.round(p);
      if (W.lists.length >= LIST_MAX) throw new Error("حداکثر " + LIST_MAX + " آگهی باز می‌توانید داشته باشید.");
      if (kind === "res") {
        const ref = priceOn(s, item, tm.day), lo = Math.round(ref * PLO * 1e4) / 1e4, hi = Math.round(ref * PHI * 1e4) / 1e4;
        if (!(p >= lo && p <= hi)) throw new Error("قیمت باید بین $" + lo + " و $" + hi + " باشد.");
        if (have(item) < q) throw new Error("موجودی انبار کافی نیست.");
        S.st[item] -= q;
      } else {
        const ref = ubuy(item, (M.units[item] || {}).rl || 1), lo = Math.ceil(ref * PLO), hi = Math.floor(ref * PHI);
        if (!(p >= lo && p <= hi)) throw new Error("قیمت باید بین $" + lo.toLocaleString("en-US") + " و $" + hi.toLocaleString("en-US") + " باشد.");
        if ((M.units[item] || { n: 0 }).n < q) throw new Error("این تعداد یگان ندارید.");
        mu(item).n -= q; if (window.OWArmy) OWArmy.L.cityTake(mu(item), q); M.esc[item] = (M.esc[item] || 0) + q;   // یگانِ داخل آگهی هنوز جای پایگاه را می‌گیرد
      }
      W.lists.push({ id: W.nid++, kind, item, qty: q, qty0: q, price: p, ts: now, exp: now + LIST_H * 3600, chk: now, acc: 0 });
      wLog(W, now, "list", item, q, p, 0);
      return done();
    }
    if (path === "/api/market/buy") {
      const id = String(b.id);
      if (W.lists.some(x => String(x.id) === id)) throw new Error("آگهی خودتان را نمی‌توانید بخرید.");
      const l = npcList(now, tm, W).find(x => x.id === id);
      if (!l) throw new Error("آگهی پیدا نشد (شاید فروخته یا بسته شده است).");
      const q = qtyOf(b.qty); if (q > l.qty) throw new Error("فقط " + l.qty + " عدد در آگهی مانده است.");
      const total = Math.max(1, Math.ceil(l.price * q - 1e-9)); if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
      if (l.kind === "unit") { const city = cityOk(b.city); needRoom(l.item, q); mu(l.item).n += q; AL().cityAdd(mu(l.item), q, city); } else S.st[l.item] = (S.st[l.item] || 0) + q;
      S.cash -= total; W.npc[id] = (W.npc[id] || 0) + q; wLog(W, now, "lbuy", l.item, q, l.price, total, l.code);
      return done();
    }
    throw new Error("درخواست نامعتبر بود.");
  }

  // ---------------- وضعیت
  const MS = { tab: "goods", d: null, err: "", busy: false, lvl: 1, chart: "oil", give: "oil", take: "steel", qty: "", recv: 0, adf: "all" };
  function apply(d) { MS.d = d; MS.recv = Date.now(); MS.err = ""; }
  async function load() {
    try { apply(await cmCall("/api/market", undefined, localApi)); } catch (e) { MS.err = e.message; }
    if (view === "market") { drawHead(); drawPane(); }
  }
  async function act(path, body, okMsg) {
    if (MS.busy) return false;
    MS.busy = true; let ok = false;
    try {
      apply(await cmCall(path, body, localApi)); ok = true;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه و انبار تازه شوند
    } catch (e) { toast(e.message); load(); }
    MS.busy = false;
    if (view === "market") { drawHead(); drawPane(); }
    return ok;
  }

  // ---------------- ابزارهای نمایش
  const nf = (n) => Number(n).toLocaleString("en-US");
  const pf = (p) => "$" + Number(Number(p).toFixed(2)).toString();
  const pf4 = (p) => "$" + Number(Number(p).toFixed(3)).toString();
  const cls = (c) => (c > 0 ? "up" : c < 0 ? "dn" : "fl");
  const chgTxt = (c) => (c > 0 ? "▲ " : c < 0 ? "▼ " : "") + Math.abs(c).toFixed(1) + "%";
  const fmtT = (ts) => new Date(ts * 1000).toLocaleString("fa-IR-u-nu-latn", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const live = () => !!MS.d && !MS.d.local;   // در حالت محلی هم معامله ممکن است (شبیه‌سازی روی همین گوشی)
  const cashNow = () => Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash);
  const isUnit = (k) => k === "unit";
  // خرید یگان: اگر کشور فهرست شهر دارد اول شهرِ استقرار را بپرس، بعد onGo(city) را صدا بزن
  function withCity(kind, onGo, item) {
    const ws = (MS.d && MS.d.waters) || null;
    if (isUnit(kind) && item && window.OWArmy && OWArmy.isNaval && OWArmy.isNaval(item) && ws) {   // ناو فقط در دریاهای کشور خودتان مستقر می‌شود، نه در استان
      if (!ws.length) { toast("کشور شما به دریا ساحل ندارد؛ نیروی دریایی نمی‌تواند داشته باشید."); return; }
      return OWArmy.askPick(ws.map(w => [w.id, "🌊 " + w.name]), (c) => onGo(c), "🌊 ناو در کدام دریا مستقر شود؟");
    }
    const cs = (MS.d && MS.d.cities) || [];
    if (isUnit(kind) && cs.length && window.OWArmy && OWArmy.askCity) return OWArmy.askCity(cs, (c) => onGo(c), "📍 یگان در کدام شهر مستقر شود؟", MS.d.occupied);
    return onGo("");
  }
  function info(kind, item) {
    const d = MS.d, x = d && (isUnit(kind) ? d.units : d.res).find(r => r.key === item);
    return x || { key: item, name: item, icon: "📦" };
  }
  const priceTxt = (kind, p) => (isUnit(kind) ? "$" + nf(p) : pf4(p));
  const total = (kind, p, n) => (isUnit(kind) ? Math.round(p) * n : Math.max(1, Math.ceil(n * p - 1e-9)));
  // بازار عرضه و تقاضا: فشار بازار، رویدادها (جنگ، محاصره، تحریم) و زمان تیک بعد (فقط وقتی سرور فیلدها را بدهد)
  const PRESS = { shortage: "🔺 کمبود", surplus: "🔻 مازاد", balanced: "⚖️ متعادل" };
  const slipOf = (d, r, n) => { const k = (d.slip && d.slip.k) || 0.5, mx = (d.slip && d.slip.max) || 0.1; return r.market ? Math.min(mx, k * n / r.market.ref) : 0; };
  const nextTickMs = () => { const d = MS.d; return d && d.next_tick_in ? Math.max(0, d.next_tick_in * 1000 - (Date.now() - MS.recv)) : 0; };
  const EVN = { blockade: "🚢 محاصره‌ی دریایی", sanction: "⛔ تحریم", war: "⚔️ جنگ", disruption: "⚠️ اختلال تجاری" };
  function evBanner(p, d) {
    (d.events || []).forEach(e => {
      const it = e.item === "*" ? "همه‌ی منابع" : (NAME[e.item] ? NAME[e.item][1] : e.item);
      if (String(e.kind).indexOf("evt:") === 0) { p.appendChild(cmEl("div", "mknote", e.text + " · تا " + fmtT(e.until))); return; }   // رویداد تصادفی جهانی
      p.appendChild(cmEl("div", "mknote", (EVN[e.kind] || "⚠️ رویداد") + " — " + it + (e.supply < 1 ? " · عرضه " + Math.round((e.supply - 1) * 100) + "%" : "") + (e.demand > 1 ? " · تقاضا +" + Math.round((e.demand - 1) * 100) + "%" : "") + " · تا " + fmtT(e.until)));
    });
    if (d.war_count) p.appendChild(cmEl("div", "mknote", "⚔️ " + nf(d.war_count) + " جنگ فعال تقاضای نفت، فولاد و اورانیوم را بالا برده است."));
  }
  const cname = (code) => (typeof byCode !== "undefined" && byCode[code] && byCode[code].name) || code || "";
  const leftMs = () => { const d = MS.d; return d ? Math.max(0, d.start_left * 1000 - (Date.now() - MS.recv)) : 0; };
  const isOpen = () => !!MS.d && (MS.d.start_left === 0 || leftMs() === 0);
  function spark(hist, chg, w, h) {
    // همه‌ی ورودی‌ها عدد می‌شوند تا چیزی جز عدد وارد SVG (innerHTML) نشود
    hist = Array.isArray(hist) && hist.length ? hist.map(Number) : [0]; chg = Number(chg); w = Number(w); h = Number(h);
    const col = chg > 0 ? "#4fd9a0" : chg < 0 ? "#ff7a7a" : "#9aa3c7";
    const hs = hist.length > 1 ? hist : [hist[0], hist[0]], lo = Math.min(...hs), hi = Math.max(...hs), rg = hi - lo || 1;
    const pts = hs.map((v, i) => (i / (hs.length - 1) * (w - 4) + 2).toFixed(1) + "," + (h - 3 - (v - lo) / rg * (h - 6)).toFixed(1)).join(" ");
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"><polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/></svg>';
  }
  function row(icon, rnd_, name, sub, hist, chg, priceTxt, onTap) {
    const r = cmEl("div", "mkrow"), i = cmEl("div", "mki" + (rnd_ ? " rnd" : ""), icon), n = cmEl("div", "mkn");
    n.append(cmEl("b", null, name), cmEl("small", null, sub));
    const sp = cmEl("div", "mkspark"); sp.innerHTML = spark(hist, chg, 90, 36);
    const p = cmEl("div", "mkp", priceTxt); p.appendChild(cmEl("small", cls(chg), chgTxt(chg)));
    r.append(i, n, sp, p); r.onclick = onTap; return r;   // در RTL آیکن سمت راست می‌افتد
  }

  // ---------------- سربرگ
  function drawHead() {
    const box = el("mkhead"), d = MS.d; box.innerHTML = "";
    const c = cmEl("div", "mkinfo"), q = cmEl("button", "mkq", "?"); q.type = "button"; q.setAttribute("aria-label", "راهنما"); q.onclick = help;
    c.append(q, cmEl("h3", null, "🏪 بازار جهانی"), cmEl("p", null, "منابع و یگان‌ها را با قیمت روز بخرید، بفروشید یا با هم عوض کنید."));
    if (d) {
      const ix = cmEl("div", "mkidx"); ix.append("شاخص کالا ", cmEl("b", null, nf(d.index.v)), cmEl("span", cls(d.index.chg), chgTxt(d.index.chg)));
      c.appendChild(ix);
      if (!isOpen()) { const z = cmEl("div", "mkclosed", "🌾 بازار جهانی در آغاز فصل بسته است؛ " + dur(leftMs()) + " دیگر باز می‌شود. قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود."); z.id = "mkclosed"; c.appendChild(z); }
      else if (d.offline) c.appendChild(cmEl("div", "mkclosed", "📴 حالت محلی: خرید و فروش روی همین گوشی انجام می‌شود. قیمت‌ها واقعی‌اند ولی آگهی‌ها و خریدارهای دیگر فرضی‌اند." + (typeof REMOTE_CFG !== "undefined" && REMOTE_CFG ? " سرور در دسترس نیست؛ به‌محض وصل‌شدن خودکار برمی‌گردیم." : "")));
    } else c.appendChild(cmEl("p", null, MS.err || "در حال دریافت قیمت‌ها…"));
    box.appendChild(c);
  }
  // پنجره‌ها
  let mask = null, sheet = null;
  function closeSheet() { if (mask) mask.hidden = true; if (sheet) sheet.hidden = true; }
  function openSheet(build) {
    if (!mask) {
      mask = cmEl("div", "mkmask"); sheet = cmEl("div", "mksheet");
      mask.onclick = closeSheet; document.body.append(mask, sheet);
    }
    sheet.innerHTML = ""; const x = cmEl("button", "mkx", "✕"); x.type = "button"; x.onclick = closeSheet; sheet.appendChild(x);
    build(sheet); mask.hidden = false; sheet.hidden = false;
  }
  function help() {
    openSheet((s) => {
      s.classList.add("mkhelp"); s.appendChild(cmEl("h3", null, "بازار جهانی"));
      s.appendChild(cmEl("p", null, "منابع را به قیمت روز بخرید و بفروشید یا با هم مبادله کنید، فرمانده. قیمت‌ها هر روز کمی تغییر می‌کنند و برای همه‌ی بازیکن‌ها یکسان است."));
      s.appendChild(cmEl("p", null, "هر معامله " + Math.round(((MS.d && MS.d.fee) || FEE) * 100) + "% کارمزد دارد. یگان را فوری و بدون کارخانه می‌توانید از بازار بخرید (گران‌تر از تولید خودتان) یا به بازار بفروشید (کمتر از هزینه‌ی تولید)؛ یگان خریداری‌شده سطح تحقیق خودتان را می‌گیرد و باید در پایگاه جا داشته باشد."));
      s.appendChild(cmEl("p", null, "در تب «آگهی‌ها» می‌توانید منبع یا یگان خود را با قیمتِ دلخواه (نیم تا دو برابر قیمت بازار) برای بازیکن‌های دیگر بگذارید. کالا همان لحظه در آگهی می‌ماند و اگر کسی نخرد " + ((MS.d && MS.d.list && MS.d.list.hours) || 48) + " ساعت بعد برمی‌گردد؛ هر زمان هم می‌توانید لغو کنید."));
      s.appendChild(cmEl("p", null, "بازار در آتش‌بس آغاز فصل بسته است؛ قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود."));
    });
  }

  // ---------------- پنجره‌ی خرید و فروش
  function tradeSheet(r) {
    const d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let side = "buy", qty = "";
      const cash = () => Math.floor((typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash));
      s.appendChild(cmEl("h3", null, r.icon + " " + r.name));
      const info = cmEl("div", "mksum"); s.appendChild(info);
      const chips = cmEl("div", "mkchips"), tb = cmEl("button", "mkchip on", "خرید"), ts = cmEl("button", "mkchip", "فروش");
      tb.type = ts.type = "button"; chips.append(tb, ts); s.appendChild(chips);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const q = cmEl("div", "mkchips"); s.appendChild(q);
      const sum = cmEl("div", "mksum"); s.appendChild(sum);
      const go = cmEl("button", "mkgo", "تأیید"); go.type = "button"; s.appendChild(go);
      if (!d.open && !isOpen()) s.appendChild(cmEl("div", "mknote", "بازار هنوز باز نیست."));
      const unit = () => (side === "buy" ? r.buy : r.sell);
      const lim = () => (r.limit ? r.limit[side] : Infinity);   // سقف حجم شما و موجودی/ظرفیتِ بازار
      const maxQ = () => Math.min(lim(), side === "buy" ? Math.floor(cash() / (unit() * (1 + slipOf(d, r, 1)))) : r.stock);
      function refresh() {
        info.textContent = "قیمت روز " + pf4(r.price) + " · خرید " + pf4(r.buy) + " · فروش " + pf4(r.sell) + " (کارمزد " + Math.round(d.fee * 100) + "%)\n"
          + "موجودی انبار شما: " + nf(r.stock) + " · خزانه: $" + nf(cash())
          + (r.market ? "\nموجودی بازار: " + nf(r.market.stock) + " (" + PRESS[r.market.pressure] + ") · سقف مجاز " + (side === "buy" ? "خرید" : "فروش") + " شما: " + nf(r.limit[side]) + "\nمحدوده‌ی قیمت: " + pf4(r.min) + " تا " + pf4(r.max) : "");
        info.style.whiteSpace = "pre-line";
        tb.className = "mkchip" + (side === "buy" ? " on" : ""); ts.className = "mkchip" + (side === "sell" ? " on" : "");
        const n = Math.floor(Number(qty) || 0);
        const sl = slipOf(d, r, n);
        sum.textContent = n > 0 ? (side === "buy" ? "هزینه: $" : "دریافتی: $") + nf(side === "buy" ? Math.ceil(n * r.price * (1 + d.fee + sl)) : Math.floor(n * r.price * (1 - d.fee - sl))) + (sl > 0.0005 ? " (شامل لغزش قیمت " + (sl * 100).toFixed(1) + "%)" : "") : "";
        const bad = n < 1 || n > maxQ() || !isOpen() || !live();
        go.disabled = bad || MS.busy;
        go.textContent = !live() ? "فقط با سرور بازی" : n > maxQ() ? (r.limit && n > Math.min(r.limit[side], side === "buy" ? Infinity : r.stock) ? "بیشتر از سقف بازار" : side === "buy" ? "خزانه کافی نیست" : "موجودی کافی نیست") : "تأیید " + (side === "buy" ? "خرید" : "فروش");
      }
      tb.onclick = () => { side = "buy"; refresh(); }; ts.onclick = () => { side = "sell"; refresh(); };
      inp.oninput = () => { qty = inp.value; refresh(); };
      [["25%", 0.25], ["50%", 0.5], ["حداکثر", 1]].forEach(([t, f]) => {
        const b = cmEl("button", "mkchip", t); b.type = "button";
        b.onclick = () => { const v = Math.max(0, Math.floor(maxQ() * f)); inp.value = v || ""; qty = inp.value; refresh(); }; q.appendChild(b);
      });
      adLinks(s, "res", r.key);
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        const ok = await act("/api/market/trade", { item: r.key, side, qty: n }, (side === "buy" ? "خرید" : "فروش") + " " + nf(n) + " " + r.name + " انجام شد ✅");
        if (ok) closeSheet();
      };
      refresh();
    });
  }

  // ---------------- لینک آگهی‌ها داخل پنجره‌ها
  function adLinks(s, kind, item) {
    const row_ = cmEl("div", "mkad"), n = ((MS.d && MS.d.listings) || []).filter(l => l.kind === kind && l.item === item && !l.mine).length;
    const a = cmEl("button", "mkchip", "📢 آگهی‌ها (" + nf(n) + ")"), b = cmEl("button", "mkchip", "➕ ثبت آگهی فروش");
    a.type = b.type = "button";
    a.onclick = () => { MS.adf = kind + ":" + item; MS.tab = "ads"; closeSheet(); drawTabs(); drawPane(); };
    b.onclick = () => (live() ? listSheet(kind, item) : toast("آگهی با سرور بازی ممکن است."));
    row_.append(a, b); s.appendChild(row_);
  }
  function qtyChips(box, maxQ, inp, setQ, refresh) {
    const q = cmEl("div", "mkchips"); box.appendChild(q);
    [["25%", 0.25], ["50%", 0.5], ["حداکثر", 1]].forEach(([t, f]) => {
      const b = cmEl("button", "mkchip", t); b.type = "button";
      b.onclick = () => { const v = Math.max(0, Math.floor(maxQ() * f)); inp.value = v || ""; setQ(inp.value); refresh(); }; q.appendChild(b);
    });
  }

  // ---------------- خرید و فروش یگان با بازار
  function unitSheet(u) {
    const d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let side = "buy", qty = "";
      s.appendChild(cmEl("h3", null, u.icon + " " + u.name));
      const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; s.appendChild(inf);
      const chips = cmEl("div", "mkchips"), tb = cmEl("button", "mkchip on", "خرید"), ts = cmEl("button", "mkchip", "فروش");
      tb.type = ts.type = "button"; chips.append(tb, ts); s.appendChild(chips);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "تأیید"); go.type = "button";
      const maxQ = () => (side === "buy" ? Math.max(0, Math.min(u.room, Math.floor(cashNow() / u.buy))) : u.owned);
      function refresh() {
        inf.textContent = "سطح تحقیق شما: " + u.level + " · خرید فوری (بدون کارخانه) $" + nf(u.buy) + " · فروش به بازار $" + nf(u.sell)
          + " (" + Math.round((d.buyback || 0.6) * 100) + "% هزینه‌ی تولید)\nدارید: " + nf(u.owned) + " · جای خالی پایگاه: " + nf(u.room) + " · خزانه: $" + nf(cashNow());
        tb.className = "mkchip" + (side === "buy" ? " on" : ""); ts.className = "mkchip" + (side === "sell" ? " on" : "");
        const n = Math.floor(Number(qty) || 0);
        sum.textContent = n > 0 ? (side === "buy" ? "هزینه: $" : "دریافتی: $") + nf(n * (side === "buy" ? u.buy : u.sell)) : "";
        const bad = n < 1 || n > maxQ() || !isOpen() || !live();
        go.disabled = bad || MS.busy;
        go.textContent = !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است"
          : n > maxQ() ? (side === "sell" ? "یگان کافی ندارید" : u.room < n && u.room * u.buy <= cashNow() ? "جای پایگاه کافی نیست" : "خزانه کافی نیست") : "تأیید " + (side === "buy" ? "خرید" : "فروش");
      }
      tb.onclick = () => { side = "buy"; refresh(); }; ts.onclick = () => { side = "sell"; refresh(); };
      inp.oninput = () => { qty = inp.value; refresh(); };
      s.append(sum); qtyChips(s, maxQ, inp, (v) => { qty = v; }, refresh); s.appendChild(go);
      s.appendChild(cmEl("div", "mknote", "یگانِ خریداری‌شده همان لحظه به پایگاهتان اضافه می‌شود و نگهداری روزانه دارد. تولید در کارخانه‌ی خودتان ارزان‌تر است ولی زمان می‌برد."));
      adLinks(s, "unit", u.key);
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        const run = async (city) => {
          const body = { unit: u.key, side, qty: n }; if (city) body.city = city;
          const ok = await act("/api/market/unit", body, (side === "buy" ? "خرید" : "فروش") + " " + nf(n) + " " + u.name + " انجام شد ✅");
          if (ok) closeSheet();
        };
        if (side === "buy") withCity("unit", run, u.key); else run("");
      };
      refresh();
    });
  }

  // ---------------- آگهی: خرید، ثبت و لغو
  function buyAdSheet(l) {
    const it = info(l.kind, l.item), d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let qty = "";
      s.appendChild(cmEl("h3", null, it.icon + " " + it.name));
      const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; s.appendChild(inf);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "خرید"); go.type = "button";
      const room = () => (isUnit(l.kind) && it.room != null ? it.room : Infinity);
      const shipOil = (n) => (l.km > 0 ? Math.max(1, Math.ceil((l.oil_unit || 0) * n - 1e-9)) : 0);   // همان فرمول سرور (از انبار فروشنده کم می‌شود)
      const maxQ = () => Math.max(0, Math.min(l.qty, room(), Math.floor(cashNow() / l.price)));
      function refresh() {
        inf.textContent = "فروشنده: " + l.name + " · قیمت هر واحد " + priceTxt(l.kind, l.price) + "\nموجود در آگهی: " + nf(l.qty) + " · خزانه: $" + nf(cashNow())
          + (isUnit(l.kind) && it.room != null ? " · جای خالی پایگاه: " + nf(it.room) : "");
        const n = Math.floor(Number(qty) || 0);
        sum.style.whiteSpace = "pre-line";
        sum.textContent = n > 0 ? "هزینه: $" + nf(total(l.kind, l.price, n)) + (l.km > 0 ? "\n" + (l.mode === "sea" ? "🌊 مسیر دریایی · " : "") + "⛽ حمل از " + l.name + " (" + nf(l.km) + " کیلومتر): " + nf(shipOil(n)) + " نفت از انبار فروشنده کم می‌شود (هزینه‌ای برای شما ندارد)" + (isUnit(l.kind) && l.secs > 0 ? "\n⏱ " + dur(l.secs * 1000) + " در راه می‌ماند و تا رسیدن جایی دفاع نمی‌کند؛ مسیرش روی نقشه‌ی کره دیده می‌شود" : "") : "") : (l.km > 0 ? "⛽ حمل از " + l.name + " (" + nf(l.km) + " کیلومتر): نفتِ حمل را فروشنده می‌دهد" : "");
        const bad = l.noroute || n < 1 || n > maxQ() || !isOpen() || !live() || total(l.kind, l.price, Math.max(1, n)) > cashNow();
        go.disabled = bad || MS.busy;
        if (l.noroute) sum.textContent = "⚠️ بین کشور " + l.name + " و کشور شما مسیر دریایی وجود ندارد؛ این یگان دریایی نمی‌رسد.";
        go.textContent = l.noroute ? "مسیر دریایی ندارد" : !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است" : n > l.qty ? "بیشتر از موجودی آگهی" : n > room() ? "جای پایگاه کافی نیست"
          : n > 0 && total(l.kind, l.price, n) > cashNow() ? "خزانه کافی نیست" : "تأیید خرید";
      }
      inp.oninput = () => { qty = inp.value; refresh(); };
      s.append(sum); qtyChips(s, maxQ, inp, (v) => { qty = v; }, refresh); s.appendChild(go);
      s.appendChild(cmEl("div", "mknote", "پول به فروشنده می‌رسد (پس از " + Math.round(d.fee * 100) + "% کارمزد) و کالا همان لحظه برای شما می‌شود." + (isUnit(l.kind) ? " یگان سطح تحقیق شما را می‌گیرد." : "")));
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        withCity(l.kind, async (city) => {
          const body = { id: l.id, qty: n }; if (city) body.city = city;
          const ok = await act("/api/market/buy", body, "خرید " + nf(n) + " " + it.name + " از آگهی انجام شد ✅");
          if (ok) closeSheet();
        }, l.item);
      };
      refresh();
    });
  }
  function myAdSheet(l) {
    const it = info(l.kind, l.item);
    openSheet((s) => {
      s.classList.remove("mkhelp");
      s.appendChild(cmEl("h3", null, it.icon + " آگهی شما"));
      s.appendChild(cmEl("div", "mksum", nf(l.qty) + " " + it.name + " · قیمت هر واحد " + priceTxt(l.kind, l.price) + "\nمانده تا پایان: " + dur(adLeft(l))));
      const go = cmEl("button", "mkgo nock", "لغو آگهی و بازگرداندن کالا"); go.type = "button"; s.appendChild(go);
      go.onclick = async () => { const ok = await act("/api/market/cancel", { id: l.id }, "آگهی لغو شد و کالا برگشت ✅"); if (ok) closeSheet(); };
    });
  }
  function listSheet(kind0, item0) {
    openSheet((s) => {
      s.classList.remove("mkhelp");
      const d = MS.d, L = d.list || { max: 5, lo: 0.5, hi: 2 };
      let kind = kind0 || "res", item = item0 || "oil", qty = "", price = "";
      s.appendChild(cmEl("h3", null, "➕ آگهی فروش"));
      const box = cmEl("div"); s.appendChild(box);
      const ref = () => { const x = info(kind, item); return isUnit(kind) ? x.buy : x.price; };
      const have = () => { const x = info(kind, item); return isUnit(kind) ? (x.owned || 0) : (x.stock || 0); };
      const bounds = () => (isUnit(kind) ? [Math.ceil(ref() * L.lo), Math.floor(ref() * L.hi)] : [Math.round(ref() * L.lo * 1e4) / 1e4, Math.round(ref() * L.hi * 1e4) / 1e4]);
      const defPrice = () => (isUnit(kind) ? String(Math.round(ref())) : String(Math.round(ref() * 1e4) / 1e4));
      function draw() {
        box.innerHTML = "";
        const kc = cmEl("div", "mkchips");
        [["res", "📦 منبع"], ["unit", "🪖 یگان"]].forEach(([k, t]) => {
          const c = cmEl("button", "mkchip" + (kind === k ? " on" : ""), t); c.type = "button";
          c.onclick = () => { if (kind !== k) { kind = k; item = isUnit(k) ? (d.units[0] || {}).key : "oil"; qty = ""; price = defPrice(); draw(); } }; kc.appendChild(c);
        });
        box.appendChild(kc);
        const ic = cmEl("div", "mkchips");
        (isUnit(kind) ? d.units : d.res).forEach(x => {
          const c = cmEl("button", "mkchip" + (x.key === item ? " on" : ""), x.icon + " " + x.name); c.type = "button";
          c.onclick = () => { item = x.key; qty = ""; price = defPrice(); draw(); }; ic.appendChild(c);
        });
        box.appendChild(ic);
        const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; box.appendChild(inf);
        box.appendChild(cmEl("div", "mklbl", "تعداد"));
        const qi = cmEl("input", "mkin"); qi.type = "number"; qi.inputMode = "numeric"; qi.min = "1"; qi.placeholder = "0"; qi.value = qty; box.appendChild(qi);
        box.appendChild(cmEl("div", "mklbl", "قیمت هر واحد ($)"));
        const pi = cmEl("input", "mkin"); pi.type = "number"; pi.inputMode = "decimal"; pi.placeholder = "0"; pi.value = price; box.appendChild(pi);
        const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "ثبت آگهی"); go.type = "button";
        function refresh() {
          const [lo, hi] = bounds(), n = Math.floor(Number(qty) || 0), p = Number(price) || 0;
          inf.textContent = "قیمت بازار " + priceTxt(kind, ref()) + " · بازه‌ی مجاز " + priceTxt(kind, lo) + " تا " + priceTxt(kind, hi) + "\nموجودی شما: " + nf(have())
            + " · آگهی‌های باز: " + nf(d.list ? d.list.mine : 0) + " از " + nf(L.max);
          sum.textContent = n > 0 && p > 0 ? "اگر همه فروخته شود: $" + nf(Math.floor(total(kind, p, n) * (1 - d.fee))) + " (پس از " + Math.round(d.fee * 100) + "% کارمزد)" : "";
          const bad = n < 1 || n > have() || !(p >= lo && p <= hi) || !isOpen() || !live() || (d.list && d.list.mine >= L.max);
          go.disabled = bad || MS.busy;
          go.textContent = !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است" : d.list && d.list.mine >= L.max ? "سقف آگهی پر است" : n > have() ? "موجودی کافی نیست"
            : p > 0 && !(p >= lo && p <= hi) ? "قیمت خارج از بازه" : "ثبت آگهی";
        }
        qi.oninput = () => { qty = qi.value; refresh(); }; pi.oninput = () => { price = pi.value; refresh(); };
        box.append(sum); qtyChips(box, have, qi, (v) => { qty = v; }, refresh); box.appendChild(go);
        go.onclick = async () => {
          const n = Math.floor(Number(qty) || 0), p = Number(price) || 0; if (n < 1 || p <= 0) return;
          const ok = await act("/api/market/list", { kind, item, qty: n, price: p }, "آگهی ثبت شد ✅");
          if (ok) { MS.tab = "ads"; MS.adf = "all"; closeSheet(); drawTabs(); drawPane(); }
        };
        refresh();
      }
      price = defPrice(); draw();
    });
  }
  const adLeft = (l) => Math.max(0, (l.exp - MS.d.now) * 1000 - (Date.now() - MS.recv));

  // ---------------- تب‌ها
  const TABS = [["goods", "🏪", "کالاها"], ["ads", "📢", "آگهی‌ها"], ["chart", "📊", "نمودار"], ["swap", "⇄", "مبادله"], ["mine", "🧾", "معامله‌های من"]];
  function drawTabs() {
    const bar = el("mktabs"); bar.innerHTML = "";
    TABS.forEach(([k, ic, nm]) => {
      const b = cmEl("button", "mktab" + (MS.tab === k ? " on" : ""), ic + " " + nm); b.type = "button";
      b.onclick = () => { MS.tab = k; drawTabs(); drawPane(); }; bar.appendChild(b);
    });
  }
  function goods(pane) {
    const d = MS.d;
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "📦 منابع"));
    if (d.next_tick_in) h.appendChild(cmEl("small", null, "قیمت بعدی " + dur(nextTickMs())));
    p.appendChild(h); evBanner(p, d);
    d.res.forEach(r => p.appendChild(row(r.icon, false, r.name, (r.market ? PRESS[r.market.pressure] + " · بازار " + nf(r.market.stock) : (r.listings ? nf(r.listings) + " آگهی" : "بی‌آگهی")) + (live() ? " · موجودی شما " + nf(r.stock) : ""),
      r.hist, r.chg, pf(r.price), () => tradeSheet(r))));
    pane.appendChild(p);
    if (!d.units.length) { pane.appendChild(cmEl("div", "mkempty", "فهرست یگان‌ها هنوز بارگذاری نشده است.")); return; }
    d.branches.forEach(b => {
      const us = d.units.filter(u => u.branch === b.key); if (!us.length) return;
      const pn = cmEl("div", "mkpanel"), hh = cmEl("div", "mkh");
      const lv = cmEl("small", null, "قیمت سطح " + MS.lvl + " ‹"); lv.onclick = () => { MS.lvl = MS.lvl % d.levels + 1; drawPane(); };
      hh.append(cmEl("span", null, b.icon + " یگان‌های " + b.name), lv); pn.appendChild(hh);
      us.forEach(u => pn.appendChild(row(u.icon, true, u.name, (u.listings ? nf(u.listings) + " آگهی" : "بی‌آگهی") + (live() && u.owned != null ? " · دارید " + nf(u.owned) : ""), [u.prices[MS.lvl - 1], u.prices[MS.lvl - 1]], u.chg,
        "$" + nf(u.prices[MS.lvl - 1]), () => (live() ? unitSheet(u) : toast("خرید و فروش یگان با سرور بازی ممکن است.")))));
      pane.appendChild(pn);
    });
  }
  function adsTab(pane) {
    const d = MS.d, L = d.list || { max: 5, mine: 0 }, f = MS.adf || "all";
    const [fk, fi] = f.split(":");
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"), add = cmEl("small", null, "➕ ثبت آگهی");
    add.onclick = () => (live() ? listSheet() : toast("آگهی با سرور بازی ممکن است."));
    h.append(cmEl("span", null, "📢 آگهی بازیکن‌ها"), add); p.appendChild(h);
    p.appendChild(cmEl("div", "mksum", "آگهی‌های باز شما: " + nf(L.mine || 0) + " از " + nf(L.max) + " · هر آگهی " + nf(L.hours || 48) + " ساعت می‌ماند"));
    const chips = cmEl("div", "mkchips");
    [["all", "همه"], ["res", "📦 منابع"], ["unit", "🪖 یگان‌ها"]].forEach(([k, t]) => {
      const c = cmEl("button", "mkchip" + (f === k ? " on" : ""), t); c.type = "button"; c.onclick = () => { MS.adf = k; drawPane(); }; chips.appendChild(c);
    });
    if (fi) { const it = info(fk, fi), c = cmEl("button", "mkchip on", it.icon + " " + it.name + " ✕"); c.type = "button"; c.onclick = () => { MS.adf = fk; drawPane(); }; chips.appendChild(c); }
    p.appendChild(chips);
    const list = (d.listings || []).filter(l => (fk === "all" || l.kind === fk) && (!fi || l.item === fi));
    if (!list.length) p.appendChild(cmEl("div", "mkempty", live() ? "آگهی‌ای نیست. اولین آگهی را شما بگذارید، فرمانده." : "آگهی‌ها فقط با سرور بازی دیده می‌شوند."));
    list.forEach(l => {
      const it = info(l.kind, l.item), r = cmEl("div", "mkrow"), i = cmEl("div", "mki" + (isUnit(l.kind) ? " rnd" : ""), it.icon), n = cmEl("div", "mkn");
      n.append(cmEl("b", null, nf(l.qty) + " " + it.name), cmEl("small", null, (l.mine ? "آگهی شما" : "فروشنده: " + l.name) + " · " + dur(adLeft(l)) + (l.noroute && !l.mine ? " · ⚠️ مسیر دریایی ندارد" : l.km > 0 && !l.mine ? " · " + (l.mode === "sea" ? "🌊 دریایی · " : "") + "⛽ " + nf(l.km) + " کیلومتر" : "")));
      if (l.noroute && !l.mine) r.classList.add("noroute");
      const pr = cmEl("div", "mkp", priceTxt(l.kind, l.price)); pr.appendChild(cmEl("small", "fl", l.mine ? "لغو ‹" : "هر واحد ‹"));
      r.append(i, n, pr); r.onclick = () => (l.mine ? myAdSheet(l) : buyAdSheet(l)); p.appendChild(r);
    });
    pane.appendChild(p);
  }
  function chart(pane) {
    const d = MS.d, r = d.res.find(x => x.key === MS.chart) || d.res[0];
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "📊 نمودار قیمت"));
    p.appendChild(h);
    const chips = cmEl("div", "mkchips");
    d.res.forEach(x => { const c = cmEl("button", "mkchip" + (x.key === r.key ? " on" : ""), x.icon + " " + x.name); c.type = "button"; c.onclick = () => { MS.chart = x.key; drawPane(); }; chips.appendChild(c); });
    p.appendChild(chips);
    const g = cmEl("div", "mkspark"); g.style.width = "100%"; g.style.height = "170px";
    g.innerHTML = spark(r.hist, r.chg, 320, 170).replace('width="320" height="170"', 'width="100%" height="170" preserveAspectRatio="none"'); p.appendChild(g);
    const lo = Math.min(...r.hist), hi = Math.max(...r.hist);
    evBanner(p, d);
    p.appendChild(cmEl("div", "mksum", "اکنون " + pf4(r.price) + " (" + chgTxt(r.chg) + ") · کمترین " + pf4(lo) + " · بیشترین " + pf4(hi) + " · قیمت پایه " + pf4(r.base) + (r.min ? " · کف " + pf4(r.min) + " · سقف " + pf4(r.max) : "")));
    if (r.market) {
      const sp = r.hist_supply || [], dm = r.hist_demand || [], ls = sp[sp.length - 1] || 0, ld = dm[dm.length - 1] || 0;
      p.appendChild(cmEl("div", "mksum", PRESS[r.market.pressure] + " · موجودی بازار " + nf(r.market.stock) + " از مرجع " + nf(r.market.ref) + " (" + Math.round(r.market.cover * 100) + "%)"
        + (ls || ld ? " · عرضه‌ی آخرین تیک " + nf(Math.round(ls)) + " ، تقاضا " + nf(Math.round(ld)) : "") + (d.next_tick_in ? " · قیمت بعدی " + dur(nextTickMs()) : "")));
    }
    r.hist.slice().reverse().forEach((v, i) => {
      const ts = r.hist_ts && r.hist_ts[r.hist.length - 1 - i];
      const t = cmEl("div", "mktr"); t.append(cmEl("span", null, ts ? fmtT(ts) : (i === 0 ? "امروز" : i + " روز پیش")), cmEl("b", null, pf4(v))); p.appendChild(t);
    });
    pane.appendChild(p);
  }
  function swapTab(pane) {
    const d = MS.d, g = d.res.find(x => x.key === MS.give), t = d.res.find(x => x.key === MS.take);
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "⇄ مبادله‌ی کالا")); p.appendChild(h);
    const pick = (label, cur, set) => {
      p.appendChild(cmEl("div", "mklbl", label)); const ch = cmEl("div", "mkchips");
      d.res.forEach(x => { const c = cmEl("button", "mkchip" + (x.key === cur ? " on" : ""), x.icon + " " + x.name); c.type = "button";
        c.onclick = () => { set(x.key); if (MS.give === MS.take) { const o = RESJ.find(r => r[0] !== MS.give)[0]; if (cur === MS.give) MS.take = o; else MS.give = o; } drawPane(); }; ch.appendChild(c); });
      p.appendChild(ch);
    };
    pick("می‌دهید", MS.give, (k) => { MS.give = k; }); pick("می‌گیرید", MS.take, (k) => { MS.take = k; });
    p.appendChild(cmEl("div", "mklbl", "تعداد از «" + g.name + "» (موجودی شما " + nf(g.stock) + ")"));
    const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; inp.value = MS.qty;
    const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "مبادله"); go.type = "button";
    const calc = () => { const q = Math.floor(Number(MS.qty) || 0); return q > 0 ? Math.floor(q * g.price * (1 - d.fee) / (t.price * (1 + d.fee))) : 0; };
    const refresh = () => {
      const q = Math.floor(Number(MS.qty) || 0), got = calc();
      sum.textContent = q > 0 ? "می‌گیرید: حدود " + nf(got) + " " + t.name + " (کارمزد " + Math.round(d.fee * 100) + "% دو سر حساب شده)" : "";
      go.disabled = MS.busy || q < 1 || got < 1 || q > g.stock || !isOpen() || !live();
      go.textContent = !live() ? "فقط با سرور بازی" : q > g.stock ? "موجودی کافی نیست" : !isOpen() ? "بازار بسته است" : "مبادله";
    };
    inp.oninput = () => { MS.qty = inp.value; refresh(); };
    go.onclick = async () => { const q = Math.floor(Number(MS.qty) || 0); const ok = await act("/api/market/swap", { give: MS.give, take: MS.take, qty: q }, "مبادله انجام شد ✅"); if (ok) { MS.qty = ""; drawPane(); } };
    p.append(inp, sum, go); refresh();
    p.appendChild(cmEl("div", "mknote", "خزانه دست نمی‌خورد؛ فقط انبار منابع جابه‌جا می‌شود."));
    pane.appendChild(p);
  }
  const KIND = { buy: "خرید", sell: "فروش", swap: "مبادله", lbuy: "خرید از آگهی", lsell: "فروش با آگهی", list: "ثبت آگهی", unlist: "لغو آگهی", lexp: "پایان آگهی" };
  const PLUS = { sell: 1, lsell: 1 }, MINUS = { buy: 1, lbuy: 1 };
  function mineTab(pane) {
    const d = MS.d, p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "🧾 معامله‌های من")); p.appendChild(h);
    if (!d.trades.length) p.appendChild(cmEl("div", "mkempty", live() ? "هنوز معامله‌ای نکرده‌اید، فرمانده." : "معامله‌ها فقط با سرور بازی ثبت می‌شوند."));
    d.trades.forEach(t => {
      const a = NAME[t.item] ? NAME[t.item][1] : ((MS.d.units.find(u => u.key === t.item) || {}).name || t.item);
      const b = t.kind === "swap" && t.item2 && NAME[t.item2], row_ = cmEl("div", "mktr"), l = cmEl("span");
      const who = (t.kind === "lbuy" || t.kind === "lsell") && t.item2 ? " · " + (t.kind === "lbuy" ? "از " : "به ") + cname(t.item2) : "";
      l.append((KIND[t.kind] || t.kind) + " " + nf(t.qty) + " " + a + (b ? " ← " + nf(t.qty2) + " " + b[1] : "") + who, cmEl("small", null, fmtT(t.ts)));
      row_.append(l, cmEl("b", null, PLUS[t.kind] ? "+$" + nf(t.total) : MINUS[t.kind] ? "−$" + nf(t.total) : "")); p.appendChild(row_);
    });
    pane.appendChild(p);
  }
  function drawPane() {
    const pane = el("mkpane"); pane.innerHTML = "";
    if (!MS.d) { pane.appendChild(cmEl("div", "mkempty", MS.err || "در حال دریافت قیمت‌ها…")); return; }
    ({ goods, ads: adsTab, chart, swap: swapTab, mine: mineTab }[MS.tab] || goods)(pane);
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("mavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("mkcash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d && typeof ecoPending === "function" ? ECO.d.cash + ecoPending() : GAME.cash));
    drawHead(); drawTabs(); drawPane(); load();
    if (typeof ecoLoad === "function" && R()) ecoLoad();
  }
  let ticks = 0, reloading = 0;
  setInterval(() => {
    if (typeof view === "undefined" || view !== "market") { ticks = 0; return; }
    const cashEl = el("mkcash");
    if (cashEl) cashEl.textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash));
    if (MS.d && MS.d.start_left > 0) {
      const z = el("mkclosed");
      if (leftMs() > 0 && z) z.textContent = "🌾 بازار جهانی در آغاز فصل بسته است؛ " + dur(leftMs()) + " دیگر باز می‌شود. قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود.";
      else if (leftMs() === 0 && Date.now() - reloading > 5000) { reloading = Date.now(); load(); }
    }
    if (++ticks % 60 === 0 && !MS.busy) load();   // هر ~60 ثانیه قیمت‌ها تازه می‌شود
  }, 1000);

  // ---------------- اتصال دکمه‌ها
  el("mavatar").onclick = () => setView("map");
  el("mcup").onclick = () => setView("rank");
  el("mbell").onclick = () => setView("notif");
  el("mgoal").onclick = () => openGoals();
  el("mkback").onclick = () => setView("home");
  el("mktitle").onclick = () => setView("home");

  window.OWMarket = { build, priceOn, indexOn };
})();
;

/* ===== loan.js ===== */
/* صفحه‌ی وام بین کشورها. بک‌اند: loans.py (مسیرهای /api/loan...). فقط با سرور بازی کار می‌کند. */
(function () {
  "use strict";
  const CSS = `
  .lnbox { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin: 0 0 12px; }
  .lnbox h3 { margin: 0 0 10px; font-size: 14px; }
  .lnsum { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .lnsum div { background: var(--card-2); border-radius: 12px; padding: 10px; font-size: 13px; text-align: center; }
  .lnsum b { display: block; font-size: 16px; color: var(--gold); direction: ltr; margin-top: 4px; }
  .lnbox label { display: block; font-size: 13px; margin: 8px 0 4px; opacity: .8; }
  .lnbox input, .lnbox select { width: 100%; box-sizing: border-box; padding: 11px; border-radius: 12px; border: 1px solid var(--line);
    background: var(--card-2); color: inherit; font: inherit; }
  .lnrow2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lnbtn { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--gold); background: var(--gold-soft); color: var(--gold);
    font: inherit; font-weight: 700; cursor: pointer; }
  .lnbtn.full { width: 100%; margin-top: 12px; }
  .lnbtn.red { border-color: #c75454; color: #e98a8a; background: rgba(199,84,84,.12); }
  .lnbtn:disabled { opacity: .5; }
  .lnitem .top { display: flex; justify-content: space-between; align-items: center; font-weight: 700; }
  .lnitem .tag { font-size: 12px; padding: 3px 8px; border-radius: 99px; background: var(--card-2); }
  .lnitem .tag.late { color: #e98a8a; }
  .lnitem p { margin: 6px 0 0; font-size: 13px; opacity: .85; }
  .lnact { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
  .lnact input { flex: 1; min-width: 0; }
  .lnempty { text-align: center; opacity: .6; padding: 14px; font-size: 13px; }
  .lntabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(76px, 1fr)); gap: 8px; margin: 0 0 12px; }
  .lntab { padding: 11px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
  .lntab.on { border-color: var(--gold); background: var(--gold-soft); color: var(--gold); }
  .txrange { width: 100%; margin: 10px 0 4px; accent-color: var(--gold); direction: ltr; }
  .txval { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .txval input { max-width: 110px; text-align: center; direction: ltr; }
  .txpv { margin-top: 10px; display: grid; gap: 6px; }
  .txpv div { display: flex; justify-content: space-between; gap: 8px; background: var(--card-2); border-radius: 12px; padding: 9px 11px; font-size: 13px; }
  .txpv b { direction: ltr; }
  .txpv .good { color: #6fcf8f; } .txpv .bad { color: #e98a8a; }
  .txnote { font-size: 12px; opacity: .75; line-height: 1.8; margin: 10px 0 0; }
  .txtier { display: grid; gap: 6px; margin-top: 10px; }
  .txtier div { display: flex; flex-direction: column; gap: 2px; background: var(--card-2); border-radius: 12px; padding: 9px 11px; font-size: 13px; border: 1px solid transparent; opacity: .6; }
  .txtier div small { font-size: 12px; opacity: .85; }
  .txtier div.on { opacity: 1; border-color: var(--gold); }
  .txtier div.on.bad { border-color: #c75454; background: rgba(199,84,84,.12); }
  .txalert { margin-top: 10px; padding: 10px 12px; border-radius: 12px; font-size: 13px; background: rgba(199,84,84,.14); border: 1px solid #c75454; color: #e98a8a; }
  .evcard { background: var(--card-2); border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; margin-top: 8px; font-size: 13px; line-height: 1.8; }
  .evcard.good { border-color: #4fae7b; } .evcard.bad { border-color: #e07a28; } .evcard.crisis { border-color: #c75454; background: rgba(199,84,84,.12); }
  .evcard b { display: block; font-size: 13px; } .evcard small { display: block; opacity: .75; }
  .gvgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
  .gvopt { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; border-radius: 14px; border: 1px solid var(--line);
    background: var(--card-2); color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
  .gvopt i { font-style: normal; font-size: 22px; }
  .gvopt.on { border-color: var(--gold); background: var(--gold-soft); color: var(--gold); font-weight: 700; }
  .gvopt.pick { border-color: var(--gold); }
  .gvopt:disabled { opacity: .55; }
  .gvdesc { margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--card-2); font-size: 13px; line-height: 1.8; }
  .gvdesc b { color: var(--gold); }
  .mgzone { padding: 10px 12px; border-radius: 12px; font-weight: 700; margin: 8px 0; border: 1px solid var(--line); background: var(--card-2); }
  .mgzone.leaving { border-color: #c75454; background: rgba(199,84,84,.12); color: #e98a8a; }
  .mgzone.magnet { border-color: #4fae7b; background: rgba(79,174,123,.12); color: #6fcf9a; }
  .mgrow { display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 8px 4px; border-bottom: 1px solid var(--line); font-size: 13px; }
  .mgrow.me { color: var(--gold); font-weight: 700; } .mgrow:last-child { border-bottom: 0; }
  .mgrow small { opacity: .7; }
  .gvwait { margin-top: 10px; padding: 9px 12px; border-radius: 12px; font-size: 12px; background: rgba(199,84,84,.12); border: 1px solid #c75454; color: #e98a8a; }`;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const LS = { d: null, err: "", busy: false, tab: "loan", t: null, terr: "", draft: null, g: null, gerr: "", gpick: "", ev: null, everr: "", m: null, merr: "" };
  const nf = (n) => Number(n || 0).toLocaleString("en-US");
  const fl = (code) => (byCode[code] ? byCode[code].flag + " " + byCode[code].name : code);
  const dt = (ts) => new Date(ts * 1000).toLocaleString("fa-IR-u-nu-latn", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const STAT = { offer: "پیشنهاد", active: "فعال", paid: "تسویه‌شده", forgiven: "بخشیده‌شده", defaulted: "نکول" };

  async function load() {
    if (!REMOTE) { LS.err = "وام فقط با سرور بازی کار می‌کند؛ از داخل ربات وارد شوید."; draw(); return; }
    try { LS.d = await cmApi("/api/loan"); LS.err = ""; } catch (e) { LS.err = e.message; }
    try { LS.t = await cmApi("/api/tax"); LS.terr = ""; } catch (e) { LS.terr = e.message; }
    try { LS.g = await cmApi("/api/gov"); LS.gerr = ""; window.OWGovData = LS.g; } catch (e) { LS.gerr = e.message; }
    try { LS.ev = await cmApi("/api/events"); LS.everr = ""; window.OWEvData = LS.ev; } catch (e) { LS.everr = e.message; }
    try { LS.m = await cmApi("/api/mig"); LS.merr = ""; } catch (e) { LS.merr = e.message; }
    if (view === "loan") draw();
  }
  async function actBorder(closed) {
    if (LS.busy) return;
    LS.busy = true;
    try {
      LS.m = await cmApi("/api/mig/border", { closed: closed }); LS.merr = "";
      toast(closed ? "مرزها بسته شد 🚧" : "مرزها باز شد 🛂");
    } catch (e) { toast(e.message); }
    LS.busy = false;
    if (view === "loan") draw();
  }
  async function actGov(gov) {
    if (LS.busy) return;
    LS.busy = true;
    try {
      LS.g = await cmApi("/api/gov/set", { gov: gov }); LS.gerr = ""; LS.gpick = ""; window.OWGovData = LS.g;
      toast("نوع حکومت ثبت شد 🏛");
    } catch (e) { toast(e.message); }
    LS.busy = false;
    if (view === "loan") draw();
  }
  async function actTax(rate) {
    if (LS.busy) return;
    LS.busy = true;
    try {
      LS.t = await cmApi("/api/tax/set", { rate: rate }); LS.terr = ""; LS.draft = null;
      toast(rate > 0 ? "مالیات ثبت شد 🏛" : "مالیات برداشته شد ✅");
      if (typeof ecoLoad === "function") ecoLoad();   // درآمد و رضایت مردم تازه شود
    } catch (e) { toast(e.message); }
    LS.busy = false;
    if (view === "loan") draw();
  }
  async function act(path, body, okMsg) {
    if (LS.busy) return;
    LS.busy = true;
    try {
      LS.d = await cmApi(path, body); LS.err = "";
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه تازه شود
    } catch (e) { toast(e.message); }
    LS.busy = false;
    if (view === "loan") draw();
  }

  function summary(d) {
    const b = cmEl("div", "lnbox"), g = cmEl("div", "lnsum");
    [["⭐ اعتبار شما", d.rating + "/100"], ["📑 وام فعال مجاز", d.limit], ["📤 طلب شما", "$" + nf(d.lent)], ["📥 بدهی شما", "$" + nf(d.debt)]]
      .forEach(([t, v]) => { const x = cmEl("div", null, t); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    b.append(cmEl("h3", null, "💸 وام بین کشورها"), g);
    b.appendChild(cmEl("p", "lnempty", "به کشور دیگر وام بدهید یا پیشنهاد وام بگیرید. دیرکرد جریمه دارد و بعد از چند روز از خزانه برداشت می‌شود."));
    return b;
  }

  function form(d) {
    const b = cmEl("div", "lnbox"), sel = cmEl("select"), amt = cmEl("input"), rate = cmEl("input"), days = cmEl("input");
    b.appendChild(cmEl("h3", null, "➕ پیشنهاد وام به یک کشور"));
    sel.appendChild(new Option("— کشور را انتخاب کنید —", ""));
    countries.filter(c => c.n > 0 && c.code !== mine).forEach(c => sel.appendChild(new Option(c.flag + " " + c.name, c.code)));
    amt.type = "number"; amt.inputMode = "numeric"; amt.placeholder = "مثلاً 50000";
    rate.type = "number"; rate.value = d.rate; rate.min = d.min_rate; rate.max = d.max_rate;
    days.type = "number"; days.value = d.def_days; days.min = 1; days.max = d.max_days;
    const r2 = cmEl("div", "lnrow2"), l1 = cmEl("div"), l2 = cmEl("div");
    l1.append(cmEl("label", null, "سود (%، از " + d.min_rate + " تا " + d.max_rate + ")"), rate);
    l2.append(cmEl("label", null, "مهلت (روز، تا " + d.max_days + ")"), days);
    r2.append(l1, l2);
    const go = cmEl("button", "lnbtn full", "ارسال پیشنهاد"); go.type = "button";
    go.onclick = () => {
      if (!sel.value) { toast("کشور را انتخاب کنید."); return; }
      act("/api/loan/offer", { code: sel.value, amount: amt.value, rate: rate.value, days: days.value }, "پیشنهاد فرستاده شد ✅");
    };
    b.append(cmEl("label", null, "کشور گیرنده (فقط کشورهای دارای بازیکن)"), sel, cmEl("label", null, "مبلغ ($)"), amt, r2, go);
    return b;
  }

  function btn(txt, cls, fn) { const x = cmEl("button", "lnbtn " + cls, txt); x.type = "button"; x.onclick = fn; return x; }

  function card(x, hist) {
    const b = cmEl("div", "lnbox lnitem"), other = x.role === "lender" ? x.to : x.from;
    const top = cmEl("div", "top"); top.append(cmEl("span", null, (x.role === "lender" ? "📤 به " : "📥 از ") + fl(other)));
    top.appendChild(cmEl("span", "tag" + (x.overdue ? " late" : ""), x.overdue ? "دیرکرد" : STAT[x.status] || x.status));
    b.appendChild(top);
    b.appendChild(cmEl("p", null, "اصل $" + nf(x.amount) + " · سود " + x.rate + "% · جمعاً $" + nf(x.owed) + (x.paid ? " · پرداخت‌شده $" + nf(x.paid) : "")));
    if (x.status === "active") {
      b.appendChild(cmEl("p", null, "باقی‌مانده $" + nf(x.left) + (x.late ? " (جریمه $" + nf(x.late) + ")" : "") + " · مهلت تا " + dt(x.due)));
    }
    if (hist) return b;
    const a = cmEl("div", "lnact");
    if (x.status === "offer") {
      if (x.role === "borrower") a.append(btn("✅ قبول", "", () => act("/api/loan/accept", { id: x.id }, "وام دریافت شد 💰")), btn("رد", "red", () => act("/api/loan/cancel", { id: x.id })));
      else a.appendChild(btn("لغو پیشنهاد", "red", () => act("/api/loan/cancel", { id: x.id })));
    } else if (x.role === "borrower") {
      const inp = cmEl("input"); inp.type = "number"; inp.inputMode = "numeric"; inp.placeholder = "خالی = پرداخت کامل";
      a.append(inp, btn("پرداخت", "", () => act("/api/loan/repay", { id: x.id, amount: inp.value || null }, "پرداخت شد ✅")));
    } else a.appendChild(btn("🎁 بخشیدن بدهی", "red", () => { if (confirm("باقی‌مانده‌ی بدهی بخشیده شود؟")) act("/api/loan/forgive", { id: x.id }); }));
    b.appendChild(a);
    return b;
  }

  function tabs() {
    const w = cmEl("div", "lntabs");
    [["loan", "💸 وام"], ["tax", "💰 مالیات"], ["gov", "🏛 حکومت"], ["ev", "🎲 رویداد"], ["mig", "🧳 مهاجرت"]].forEach(([k, t]) => {
      const b = cmEl("button", "lntab" + (LS.tab === k ? " on" : ""), t); b.type = "button";
      b.onclick = () => { LS.tab = k; draw(); };
      w.appendChild(b);
    });
    return w;
  }

  // ----- مالیات: از هر نفر مردم روزانه چند دلار بگیرید؛ جمعیت فقط کمی اثر دارد، مالیات بالا رضایت مردم را کم می‌کند
  // اثر رضایت: بالای 80% بهره‌وری بیشتر · زیر 40% مالیات کمتر · زیر 30% احتمال اعتراض · زیر 20% بحران سیاسی و افت ثبات
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  function taxPreview(t, r) {
    const pen = r / t.max * t.hit * t.cap;                                   // امتیاز رفاهِ ازدست‌رفته
    const satx = clamp(t.base + (100 - t.base) * (t.fx_pts - pen) / t.cap, 0, 100);
    const mult = satx >= t.th.tax ? 1 : t.tax_min + (1 - t.tax_min) * satx / t.th.tax;
    const inc = Math.floor(r * t.payers * mult);
    const lossW = Math.floor(t.raw * pen / 100);
    const lossP = Math.floor(t.raw * ((t.sat_free_x > t.th.prod ? t.prod : 0) - (satx > t.th.prod ? t.prod : 0)) / 100);
    return { inc, satx, sat: Math.round(satx), mult, loss: lossW + lossP, net: inc - lossW - lossP };
  }
  function tiers(t, satx) {
    const fa = (n) => Number(n).toLocaleString("en-US");
    return [
      ["✨ رضایت بالای " + fa(t.th.prod) + "%", "بهره‌وری اقتصادی: +" + fa(t.prod) + "% به درآمد بخش‌ها", satx > t.th.prod, ""],
      ["⚠️ رضایت زیر " + fa(t.th.tax) + "%", "درآمد مالیات کم می‌شود (در رضایت صفر فقط نصفش می‌ماند)", satx < t.th.tax, "bad"],
      ["🪧 رضایت زیر " + fa(t.th.protest) + "%", "احتمال اعتراض؛ هر اعتراض " + fa(Math.round(t.protest_loss * 100)) + "% از درآمد روزانه را از خزانه می‌برد", satx < t.th.protest, "bad"],
      ["🚨 رضایت زیر " + fa(t.th.crisis) + "%", "بحران سیاسی؛ ثبات حکومت کم می‌شود و درآمد بخش‌ها تا 30% افت می‌کند", satx < t.th.crisis, "bad"],
    ];
  }
  function taxPane(box) {
    const t = LS.t;
    if (!t) { box.appendChild(cmEl("div", "lnbox lnempty", LS.terr || "در حال دریافت…")); return; }
    const top = cmEl("div", "lnbox"), g = cmEl("div", "lnsum");
    [["💵 مالیات هر نفر", "$" + nf(t.rate) + " / روز"], ["👥 مالیات‌دهندگان مؤثر", nf(t.payers)], ["💰 درآمد مالیات", "$" + nf(t.income) + " / روز"], ["😊 رضایت مردم", t.sat + "%"],
     ["🏛 ثبات حکومت", Math.round(t.stab) + "%"], ["🪧 اعتراض‌ها", nf(t.protests)]]
      .forEach(([k, v]) => { const x = cmEl("div", null, k); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    top.append(cmEl("h3", null, "🏛 مالیات"), g);
    if (t.crisis) top.appendChild(cmEl("div", "txalert", "🚨 بحران سیاسی در جریان است؛ تا وقتی رضایت زیر " + t.th.crisis + "% باشد ثبات حکومت می‌افتد. ساختمان رفاهی بسازید یا مالیات را کم کنید."));
    else if (t.stab < 100) top.appendChild(cmEl("div", "txalert", "ثبات حکومت کامل نیست و درآمد بخش‌ها را " + Math.round((1 - t.stab_mult) * 100) + "% کم کرده؛ با رضایت بالای " + t.th.crisis + "% کم‌کم برمی‌گردد."));
    top.appendChild(cmEl("p", "txnote", "تعیین کنید از هر نفر مردم کشورتان روزانه چند دلار مالیات بگیرید. جمعیت کشور فقط کمی روی درآمد مالیات اثر دارد. هرچه مالیات بالاتر باشد رضایت مردم کمتر می‌شود و رضایت پایین، پاداش رفاه را از درآمد بخش‌های اقتصادی کم می‌کند."));
    box.appendChild(top);

    const f = cmEl("div", "lnbox"), r0 = LS.draft == null ? t.rate : LS.draft;
    const rng = cmEl("input", "txrange"), num = cmEl("input"), pv = cmEl("div", "txpv"), tr = cmEl("div", "txtier");
    rng.type = "range"; rng.min = 0; rng.max = t.max; rng.step = 1; rng.value = r0;
    num.type = "number"; num.inputMode = "numeric"; num.min = 0; num.max = t.max; num.value = r0;
    const save = cmEl("button", "lnbtn full", "ثبت مالیات"); save.type = "button";
    function show(r) {
      r = clamp(Math.round(Number(r) || 0), 0, t.max);
      LS.draft = r === t.rate ? null : r;
      const p = taxPreview(t, r);
      pv.innerHTML = "";
      [["💰 درآمد مالیات", "+$" + nf(p.inc) + " در روز" + (p.mult < 1 ? " (×" + p.mult.toFixed(2) + ")" : ""), p.mult < 1 ? "bad" : "good"],
       ["😊 رضایت مردم", t.sat_free + "% ← " + p.sat + "%", p.sat < t.sat_free ? "bad" : "good"],
       ["📉 کاهش درآمد بخش‌ها (تخمین)", "−$" + nf(p.loss) + " در روز", p.loss > 0 ? "bad" : ""],
       ["✅ خالص", (p.net >= 0 ? "+$" : "−$") + nf(Math.abs(p.net)) + " در روز", p.net >= 0 ? "good" : "bad"]]
        .forEach(([k, v, c]) => { const d = cmEl("div", null, k); d.appendChild(cmEl("b", c, v)); pv.appendChild(d); });
      tr.innerHTML = "";
      tiers(t, p.satx).forEach(([k, v, on, cls]) => { const d = cmEl("div", (on ? "on " : "") + cls, k); d.appendChild(cmEl("small", null, v)); tr.appendChild(d); });
      save.disabled = r === t.rate;
      return r;
    }
    rng.oninput = () => { num.value = show(rng.value); rng.value = num.value; };
    num.oninput = () => { if (num.value === "") return; rng.value = show(num.value); };
    num.onchange = () => { num.value = rng.value = show(num.value); };
    save.onclick = () => actTax(show(num.value));
    const row = cmEl("div", "txval"); row.append(cmEl("label", null, "مالیات از هر نفر در روز ($، از 0 تا " + t.max + ")"), num);
    f.append(cmEl("h3", null, "⚙️ تعیین مالیات"), row, rng, pv, cmEl("h3", null, "📊 اثر رضایت مردم"), tr, save);
    show(r0);
    f.appendChild(cmEl("p", "txnote", "رضایت پایه " + t.base + "% است؛ ساختمان‌های رفاهی (مترو، مسکن، دانشگاه، پلیس، بیمارستان) آن را تا 100% بالا می‌برند و مالیات پایین می‌آورد. اعتراض و ثبات هر 10 دقیقه بررسی می‌شود. تغییر مالیات از همین لحظه اعمال می‌شود."));
    box.appendChild(f);
  }

  // ----- نوع حکومت: هر کشور یکی از انواع حکومت را برای خودش برمی‌گزیند و همه می‌بینند (فعلاً فقط نمایشی)
  function govPane(box) {
    const g = LS.g;
    if (!g) { box.appendChild(cmEl("div", "lnbox lnempty", LS.gerr || "در حال دریافت…")); return; }
    const f = cmEl("div", "lnbox"), grid = cmEl("div", "gvgrid");
    const cur = g.options.find(o => o.key === g.mine), sel = g.options.find(o => o.key === LS.gpick) || cur || g.options[0];
    f.appendChild(cmEl("h3", null, "🏛 نوع حکومت کشور"));
    f.appendChild(cmEl("p", "lnempty", cur ? "حکومت فعلی: " + cur.icon + " " + cur.name : "هنوز نوع حکومت انتخاب نکرده‌اید."));
    g.options.forEach(o => {
      const b = cmEl("button", "gvopt" + (o.key === g.mine ? " on" : "") + (o.key === LS.gpick && o.key !== g.mine ? " pick" : ""));
      b.type = "button"; b.append(cmEl("i", null, o.icon), document.createTextNode(o.name));
      b.onclick = () => { LS.gpick = o.key; draw(); };
      grid.appendChild(b);
    });
    f.appendChild(grid);
    const ds = cmEl("div", "gvdesc"); ds.append(cmEl("b", null, sel.icon + " " + sel.name + ": "), document.createTextNode(sel.desc));
    f.appendChild(ds);
    if (g.wait > 0) {
      const h = Math.floor(g.wait / 3600), m = Math.floor((g.wait % 3600) / 60);
      f.appendChild(cmEl("div", "gvwait", "تغییر بعدی حکومت " + (h ? h.toLocaleString("en-US") + " ساعت و " : "") + m.toLocaleString("en-US") + " دقیقه‌ی دیگر ممکن می‌شود."));
    }
    const save = cmEl("button", "lnbtn full", g.mine ? "تغییر نوع حکومت" : "ثبت نوع حکومت"); save.type = "button";
    save.disabled = !LS.gpick || LS.gpick === g.mine || g.wait > 0;
    save.onclick = () => { if (!g.mine || confirm("حکومت کشور به «" + sel.name + "» تغییر کند؟ بعد از آن تا " + Math.round(g.cooldown / 3600).toLocaleString("en-US") + " ساعت نمی‌توانید دوباره عوضش کنید.")) actGov(LS.gpick); };
    f.appendChild(save);
    f.appendChild(cmEl("p", "txnote", "نوع حکومت برای همه‌ی بازیکن‌ها روی کارت کشور شما دیده می‌شود و تغییرش در اخبار جهانی اعلام می‌شود. فعلاً فقط نمایشی است و روی درآمد و جنگ اثری ندارد."));
    box.appendChild(f);
  }

  // ----- رویدادها و بحران‌های کشور: تصادفی؛ مثبت‌ها کمک می‌کنند، منفی‌ها و بحران‌ها ضرر می‌زنند (بیمارستان/پلیس/مسکن اثر منفی را کم می‌کنند)
  function evPane(box) {
    const e = LS.ev;
    if (!e) { box.appendChild(cmEl("div", "lnbox lnempty", LS.everr || "در حال دریافت…")); return; }
    const f = cmEl("div", "lnbox");
    f.appendChild(cmEl("h3", null, "🎲 رویدادهای کشور"));
    f.appendChild(cmEl("p", "lnempty", "گاهی برای کشور شما اتفاقی می‌افتد: رویداد مثبت (کشف معدن، رونق گردشگری، برداشت فراوان…)، رویداد منفی (زلزله، سیل، همه‌گیری، اعتصاب…) یا بحران (کودتا، سقوط اقتصادی، قحطی). " +
      "بیمارستان در همه‌گیری، پلیس در اعتصاب و کودتا و شهرک مسکونی در زلزله و سیل اثر بد را تا 60% کم می‌کنند."));
    if (!e.items.length) f.appendChild(cmEl("div", "lnempty", "فعلاً رویدادی نداشته‌اید."));
    e.items.forEach(x => {
      const d = cmEl("div", "evcard " + x.kind), tag = x.kind === "good" ? "رویداد مثبت" : x.kind === "bad" ? "رویداد منفی" : "بحران";
      d.append(cmEl("b", null, x.icon + " " + x.name + (x.active ? " — در جریان" : "")), document.createTextNode(x.text));
      if (x.note) d.appendChild(cmEl("small", null, "اثر: " + x.note));
      d.appendChild(cmEl("small", null, tag + " · " + dt(x.start) + (x.active ? " · تا " + dt(x.until) : "")));
      f.appendChild(d);
    });
    box.appendChild(f);
  }

  // ----- مهاجرت: مردم از کشور ناراضی می‌روند و به کشور راضی می‌آیند؛ جمعیت روی مالیات‌دهندگان و مصرف غذا اثر دارد
  function migPane(box) {
    const m = LS.m;
    if (!m) { box.appendChild(cmEl("div", "lnbox lnempty", LS.merr || "در حال دریافت…")); return; }
    const sgn = (n) => (n > 0 ? "+" : "") + nf(n);
    const hm = (s) => { const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60); return (h ? h.toLocaleString("en-US") + " ساعت و " : "") + mi.toLocaleString("en-US") + " دقیقه"; };
    const f = cmEl("div", "lnbox"), g = cmEl("div", "lnsum");
    [["👥 جمعیت الان", nf(m.pop)], ["🌍 جمعیت پایه", nf(m.base)], ["📊 تغییر مهاجرت", sgn(m.delta) + " (" + (m.pct > 0 ? "+" : "") + m.pct.toLocaleString("en-US") + "%)"],
     ["✨ جذابیت کشور", m.score + " از 100"], ["⬇️ آخرین دور: آمدند", nf(m.last_in)], ["⬆️ آخرین دور: رفتند", nf(m.last_out)],
     ["🧳 کل آمده‌ها", nf(m.tot_in)], ["🚪 کل رفته‌ها", nf(m.tot_out)]]
      .forEach(([k, v]) => { const x = cmEl("div", null, k); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    f.append(cmEl("h3", null, "🧳 مهاجرت"), g);
    const zt = { leaving: "🔴 مردم از کشور شما به کشورهای پررضایت‌تر می‌روند", stay: "🟡 جذابیت کشور شما نزدیک میانگین است؛ مهاجرت زیادی ندارید", magnet: "🟢 کشور شما از کشورهای کم‌رضایت‌تر مهاجر جذب می‌کند" };
    f.appendChild(cmEl("div", "mgzone " + m.zone, m.closed ? "🚧 مرزها بسته است؛ هیچ‌کس نمی‌رود و نمی‌آید" : zt[m.zone]));
    f.appendChild(cmEl("p", "txnote", "جذابیت = رضایت مردم منهای افت ثبات حکومت. مردم از کشور کم‌رضایت‌تر به کشور پررضایت‌تر می‌روند؛ هرچه فاصله‌ی جذابیت بیشتر، مهاجرت بیشتر (فاصله‌ی کمتر از " + m.margin.toLocaleString("en-US") + " امتیاز مهاجرتی ندارد)" +
      (m.avg !== null && m.avg !== undefined ? " و میانگین جذابیت کشورها الان " + m.avg.toLocaleString("en-US") + " است" : "") + ". رضایت را با ساختمان‌های رفاهی بالا و با مالیات پایین می‌برید. هر ساعت یک دور مهاجرت است؛ دور بعدی " + hm(m.next_in) + " دیگر. زاد و ولد و مرگ‌ومیر هر ۲ دقیقه جمعیت را کمی عوض می‌کند. " +
      "همسایه‌ها سهم بیشتری می‌گیرند. از کشور خیلی ناراضی (زیر " + m.push_at.toLocaleString("en-US") + ") کمی هم به خارج از بازی می‌روند. جمعیت هیچ‌وقت بیشتر از " + Math.round(m.shift_max * 100).toLocaleString("en-US") + "% از جمعیت پایه کم یا زیاد نمی‌شود و کم‌کم به حالت عادی برمی‌گردد."));
    const b = cmEl("button", "lnbtn full", m.closed ? "🛂 باز کردن مرزها" : "🚧 بستن مرزها"); b.type = "button"; b.disabled = m.wait > 0;
    b.onclick = () => { if (confirm(m.closed ? "مرزها باز شود؟" : "مرزها بسته شود؟ مهاجرت ورودی و خروجی کشور شما متوقف می‌شود و تا " + Math.round(m.cooldown / 3600).toLocaleString("en-US") + " ساعت نمی‌توانید عوضش کنید.")) actBorder(!m.closed); };
    f.appendChild(b);
    if (m.wait > 0) f.appendChild(cmEl("div", "gvwait", "تغییر بعدی مرز " + hm(m.wait) + " دیگر ممکن می‌شود."));
    box.appendChild(f);
    const r = cmEl("div", "lnbox"); r.appendChild(cmEl("h3", null, "🏆 جذاب‌ترین کشورها"));
    if (!m.all.length) r.appendChild(cmEl("div", "lnempty", "هنوز دورِ مهاجرتی انجام نشده است."));
    m.all.forEach(x => {
      const w = cmEl("div", "mgrow" + (x.mine ? " me" : "")), ic = x.zone === "magnet" ? "🟢" : x.zone === "leaving" ? "🔴" : "🟡";
      w.append(cmEl("span", null, ic + " " + fl(x.code) + (x.closed ? " 🚧" : "")), cmEl("small", null, x.score + " · " + sgn(x.delta)));
      r.appendChild(w);
    });
    box.appendChild(r);
  }

  function draw() {
    const box = el("lnbody"), d = LS.d; box.innerHTML = "";
    const lc = el("lncash"); if (lc && typeof ECO !== "undefined" && ECO.d) lc.textContent = "$" + nf(Math.floor(ECO.d.cash));
    box.appendChild(tabs());
    if (LS.tab === "tax") { taxPane(box); return; }
    if (LS.tab === "gov") { govPane(box); return; }
    if (LS.tab === "ev") { evPane(box); return; }
    if (LS.tab === "mig") { migPane(box); return; }
    if (!d) { box.appendChild(cmEl("div", "lnbox lnempty", LS.err || "در حال دریافت…")); return; }
    box.append(summary(d), form(d));
    const t1 = cmEl("div", "lnbox"); t1.appendChild(cmEl("h3", null, "📋 وام‌های جاری"));
    if (!d.loans.length) t1.appendChild(cmEl("div", "lnempty", "فعلاً وامی ندارید."));
    box.appendChild(t1);
    d.loans.forEach(x => box.appendChild(card(x, false)));
    if (d.history.length) {
      const t2 = cmEl("div", "lnbox"); t2.appendChild(cmEl("h3", null, "🕘 تاریخچه"));
      box.appendChild(t2); d.history.forEach(x => box.appendChild(card(x, true)));
    }
  }

  function build() {
    el("lncash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash : GAME.cash));
    draw(); load();
  }
  el("lnback").onclick = () => setView("home");
  el("lntitle").onclick = () => setView("home");
  setInterval(() => { if (view === "loan" && !document.hidden && !LS.busy && !document.activeElement.matches("input,select")) load(); }, 20000);
  window.OWLoan = { build };
})();


/* ===== dip.js ===== */
/* صفحه‌ی دیپلماسی: پیمان عدم تجاوز و اتحاد. بک‌اند: diplomacy.py (مسیرهای /api/dip...). فقط با سرور بازی کار می‌کند. */
(function () {
  "use strict";
  const CSS = `
  .dpbox { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin: 0 0 12px; }
  .dpbox h3 { margin: 0 0 10px; font-size: 14px; }
  .dpsum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .dpsum div { background: var(--card-2); border-radius: 12px; padding: 10px 6px; font-size: 12px; text-align: center; }
  .dpsum b { display: block; font-size: 16px; color: var(--gold); direction: ltr; margin-top: 4px; }
  .dpbar { height: 8px; border-radius: 99px; background: var(--card-2); overflow: hidden; margin-top: 10px; }
  .dpbar i { display: block; height: 100%; border-radius: 99px; background: var(--gold); }
  .dpbar i.lo { background: #c75454; } .dpbar i.mid { background: #e07a28; } .dpbar i.hi { background: #4fae7b; }
  .dpbox label { display: block; font-size: 13px; margin: 8px 0 4px; opacity: .8; }
  .dpbox select { width: 100%; box-sizing: border-box; padding: 11px; border-radius: 12px; border: 1px solid var(--line);
    background: var(--card-2); color: inherit; font: inherit; }
  .dpkinds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
  .dpkind { padding: 11px 8px; border-radius: 12px; border: 1px solid var(--line); background: var(--card-2); color: inherit;
    font: inherit; font-size: 13px; cursor: pointer; }
  .dpkind.on { border-color: var(--gold); background: var(--gold-soft); color: var(--gold); font-weight: 700; }
  .dphint { font-size: 12px; opacity: .8; margin: 8px 0 0; line-height: 1.7; }
  .dpbtn { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--gold); background: var(--gold-soft); color: var(--gold);
    font: inherit; font-weight: 700; cursor: pointer; }
  .dpbtn.full { width: 100%; margin-top: 12px; }
  .dpbtn.red { border-color: #c75454; color: #e98a8a; background: rgba(199,84,84,.12); }
  .dpbtn:disabled { opacity: .5; }
  .dpitem .top { display: flex; justify-content: space-between; align-items: center; font-weight: 700; gap: 8px; }
  .dpitem .tag { font-size: 12px; padding: 3px 8px; border-radius: 99px; background: var(--card-2); white-space: nowrap; }
  .dpitem .tag.ok { color: #7fd1a3; } .dpitem .tag.warn { color: #e98a8a; }
  .dpitem p { margin: 6px 0 0; font-size: 13px; opacity: .85; line-height: 1.7; }
  .dpact { display: flex; gap: 8px; margin-top: 10px; }
  .dpempty { text-align: center; opacity: .6; padding: 14px; font-size: 13px; }`;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const DS = { d: null, err: "", busy: false, pick: "", kind: "pact", tr: null, trFor: "" };
  const nf = (n) => Number(n || 0).toLocaleString("en-US");
  const fl = (code) => (byCode[code] ? byCode[code].flag + " " + byCode[code].name : code);
  const dt = (ts) => new Date(ts * 1000).toLocaleString("fa-IR-u-nu-latn", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const ICON = { pact: "🕊", alliance: "🤝" };
  const hoursLeft = (ts) => Math.max(1, Math.ceil((ts - Date.now() / 1000) / 3600));
  const tcls = (s) => (s >= 70 ? "hi" : s >= 40 ? "mid" : "lo");
  const tname = (s) => (s >= 70 ? "قابل‌اعتماد" : s >= 40 ? "معمولی" : "پیمان‌شکن");

  async function load() {
    if (!REMOTE) { DS.err = "دیپلماسی فقط با سرور بازی کار می‌کند؛ از داخل ربات وارد شوید."; draw(); return; }
    try { DS.d = await cmApi("/api/dip"); DS.err = ""; } catch (e) { DS.err = e.message; }
    if (view === "dip") draw();
  }
  async function act(path, body, okMsg) {
    if (DS.busy) return;
    DS.busy = true;
    try {
      DS.d = await cmApi(path, body); DS.err = "";
      if (okMsg) toast(okMsg);
    } catch (e) { toast(e.message); }
    DS.busy = false;
    if (view === "dip") draw();
  }
  async function loadTrust(code) {
    DS.tr = null; DS.trFor = code;
    if (!code || !REMOTE) { draw(); return; }
    try { const r = await cmApi("/api/dip/trust", { code }); if (DS.trFor === code) DS.tr = r; } catch (e) { /* اعتماد فقط اطلاعاتی است */ }
    if (view === "dip" && DS.trFor === code) draw();
  }

  const count = (d, kind) => d.treaties.filter(x => x.kind === kind).length;
  const lim = (d, kind) => (d.limits && d.limits[kind]) || 0;

  function summary(d) {
    const b = cmEl("div", "dpbox"), g = cmEl("div", "dpsum");
    [["⭐ اعتماد شما", d.trust + "/100"],
     ["🕊 عدم تجاوز", count(d, "pact") + (lim(d, "pact") ? "/" + lim(d, "pact") : "")],
     ["🤝 اتحاد", count(d, "alliance") + (lim(d, "alliance") ? "/" + lim(d, "alliance") : "")]]
      .forEach(([t, v]) => { const x = cmEl("div", null, t); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    const bar = cmEl("div", "dpbar"), fill = cmEl("i", tcls(d.trust)); fill.style.width = Math.max(3, Math.min(100, d.trust)) + "%"; bar.appendChild(fill);
    b.append(cmEl("h3", null, "📜 دیپلماسی"), g, bar);
    b.appendChild(cmEl("p", "dphint", "وضعیت اعتبار شما: " + tname(d.trust) + ". تا وقتی پیمانی بین دو کشور باشد، اعلان جنگ ممکن نیست. لغو پیمان " + d.notice_hours + " ساعت مهلت دارد و لغوکننده 10 امتیاز اعتماد از دست می‌دهد."));
    return b;
  }

  function form(d) {
    const b = cmEl("div", "dpbox"), sel = cmEl("select");
    b.appendChild(cmEl("h3", null, "➕ پیشنهاد پیمان"));
    sel.appendChild(new Option("— کشور را انتخاب کنید —", ""));
    countries.filter(c => c.n > 0 && c.code !== mine).forEach(c => sel.appendChild(new Option(c.flag + " " + c.name, c.code)));
    sel.value = DS.pick;
    sel.onchange = () => { DS.pick = sel.value; loadTrust(DS.pick); };
    const kinds = cmEl("div", "dpkinds");
    Object.keys(d.kinds).forEach(k => {
      const x = cmEl("button", "dpkind" + (DS.kind === k ? " on" : ""), (ICON[k] || "📜") + " " + d.kinds[k]); x.type = "button";
      x.onclick = () => { DS.kind = k; draw(); };
      kinds.appendChild(x);
    });
    const go = cmEl("button", "dpbtn full", "ارسال پیشنهاد"); go.type = "button";
    const full = lim(d, DS.kind) && count(d, DS.kind) >= lim(d, DS.kind);
    go.disabled = DS.busy || full;
    if (full) go.textContent = "سقف " + d.kinds[DS.kind] + " پر است";
    go.onclick = () => {
      if (!DS.pick) { toast("کشور را انتخاب کنید."); return; }
      act("/api/dip/propose", { code: DS.pick, kind: DS.kind }, "پیشنهاد فرستاده شد ✅");
    };
    b.append(cmEl("label", null, "کشور طرف پیمان (فقط کشورهای دارای بازیکن)"), sel, cmEl("label", null, "نوع پیمان"), kinds);
    if (DS.pick && DS.tr && DS.trFor === DS.pick) {
      b.appendChild(cmEl("p", "dphint", fl(DS.pick) + " — اعتماد " + DS.tr.trust + "/100 (" + tname(DS.tr.trust) + ") · پیمان فعال: " + DS.tr.treaties));
    }
    b.appendChild(cmEl("p", "dphint", "پیشنهاد بی‌پاسخ بعد از " + (d.offer_hours || 24) + " ساعت خودکار بسته می‌شود."));
    b.appendChild(go);
    return b;
  }

  function btn(txt, cls, fn) { const x = cmEl("button", "dpbtn " + cls, txt); x.type = "button"; x.disabled = DS.busy; x.onclick = fn; return x; }

  function card(x, d, hist) {
    const b = cmEl("div", "dpbox dpitem");
    const top = cmEl("div", "top");
    top.append(cmEl("span", null, (ICON[x.kind] || "📜") + " " + x.title + " · " + fl(x.with)));
    let tag = "", cls = "";
    if (x.status === "offer") { tag = x.role === "target" ? "پیشنهاد به شما" : "در انتظار پاسخ"; }
    else if (x.status === "active") { tag = "فعال"; cls = " ok"; }
    else if (x.status === "ending") { tag = "در مهلت لغو"; cls = " warn"; }
    else { tag = { ended: "تمام‌شده", declined: "ردشده", cancel: "پس‌گرفته‌شده", expired: "منقضی" }[x.status] || x.status; }
    top.appendChild(cmEl("span", "tag" + cls, tag));
    b.appendChild(top);
    b.appendChild(cmEl("p", null, "اعتماد این کشور: " + x.trust + "/100 (" + tname(x.trust) + ")"));
    if (x.status === "offer") b.appendChild(cmEl("p", null, "ارسال: " + dt(x.ts) + " · انقضا: " + dt(x.ts + (d.offer_hours || 24) * 3600)));
    if (x.status === "active") b.appendChild(cmEl("p", null, "فعال از " + dt(x.ts)));
    if (x.status === "ending") b.appendChild(cmEl("p", null, "پیمان حدود " + hoursLeft(x.end_at) + " ساعت دیگر تمام می‌شود؛ تا آن موقع جنگ ممنوع است."));
    if (hist) return b;
    const a = cmEl("div", "dpact");
    if (x.status === "offer") {
      if (x.role === "target") a.append(btn("✅ قبول", "", () => act("/api/dip/accept", { id: x.id }, "پیمان بسته شد 🤝")), btn("رد", "red", () => act("/api/dip/cancel", { id: x.id })));
      else a.appendChild(btn("پس‌گرفتن پیشنهاد", "red", () => act("/api/dip/cancel", { id: x.id })));
    } else if (x.status === "active") {
      a.appendChild(btn("لغو پیمان", "red", () => {
        if (confirm("پیمان لغو شود؟ " + d.notice_hours + " ساعت مهلت دارد و 10 امتیاز اعتماد شما کم می‌شود.")) act("/api/dip/break", { id: x.id }, "لغو ثبت شد");
      }));
    }
    if (a.children.length) b.appendChild(a);
    return b;
  }

  function section(title, items, d, empty) {
    const t = cmEl("div", "dpbox"); t.appendChild(cmEl("h3", null, title));
    if (!items.length && empty) t.appendChild(cmEl("div", "dpempty", empty));
    return t;
  }

  function draw() {
    const box = el("dpbody"), d = DS.d; box.innerHTML = "";
    if (!d) { box.appendChild(cmEl("div", "dpbox dpempty", DS.err || "در حال دریافت…")); return; }
    const incoming = d.treaties.filter(x => x.status === "offer" && x.role === "target");
    const sent = d.treaties.filter(x => x.status === "offer" && x.role === "proposer");
    const live = d.treaties.filter(x => x.status !== "offer");
    box.appendChild(summary(d));
    if (incoming.length) { box.appendChild(section("📩 پیشنهادهای رسیده", incoming, d)); incoming.forEach(x => box.appendChild(card(x, d, false))); }
    box.appendChild(form(d));
    if (sent.length) { box.appendChild(section("📤 پیشنهادهای ارسالی", sent, d)); sent.forEach(x => box.appendChild(card(x, d, false))); }
    box.appendChild(section("📋 پیمان‌های جاری", live, d, "فعلاً پیمانی ندارید."));
    live.forEach(x => box.appendChild(card(x, d, false)));
    if (d.history.length) { box.appendChild(section("🕘 تاریخچه", d.history, d)); d.history.forEach(x => box.appendChild(card(x, d, true))); }
  }

  function build() {
    el("dpcash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash : GAME.cash));
    draw(); load();
  }
  el("dpback").onclick = () => setView("home");
  el("dptitle").onclick = () => setView("home");
  setInterval(() => { if (view === "dip" && !document.hidden && !DS.busy && !document.activeElement.matches("input,select")) load(); }, 20000);
  function openFor(code) { DS.pick = code; setView("dip"); loadTrust(code); }
  window.OWDip = { build, openFor };
})();
