/* جایگزینی ایموجی‌ها با لوگوی دست‌ساز (SVG). اگر فایلی نبود، ایموجی خودش می‌ماند. */
(function () {
  var MAP = {
    "🛍": "shop", "🎁": "shop", "🏪": "market", "🌐": "globe", "🌍": "globe", "🧭": "compass",
    "👑": "crown", "🏆": "trophy", "🏗": "resources", "📣": "news", "🏁": "event", "🔔": "bell", "🎯": "target", "👥": "population",
    "⚔": "war", "💬": "chat", "🪙": "money", "💸": "money", "📊": "stats", "📈": "market",
    "📜": "statements", "📰": "news", "🎖": "medal", "🏠": "home", "⚡": "power", "🛡": "military", "👷": "worker",
    "🪖": "ground", "🚚": "transport", "🚢": "sea", "✈": "air", "🚀": "missile", "🛰": "satellite",
    "🌾": "food", "🛢": "oil", "🏭": "factory", "💰": "money", "📦": "box",
    "🤝": "diplomacy", "🕊": "peace", "🏛": "government", "📍": "pin", "🏴": "flag", "✅": "ok", "⚠": "warn", "❌": "bad", "⏳": "wait",
    "⚗": "lab", "⚙": "gear", "🔧": "wrench", "🔨": "hammer", "🔬": "microscope"
  };
  // لوگوهایی که زمینه‌ی تیره‌ی گرد‌گوشه‌ی خودشان را دارند؛ داخل کادر/دایره باید کاملاً آن را پر کنند (کلاس ibg)
  var BG = {"air": 1, "bad": 1, "box": 1, "chat": 1, "defense": 1, "diplomacy": 1, "event": 1, "factory": 1, "flag": 1, "food": 1, "gear": 1, "government": 1, "ground": 1, "hammer": 1, "lab": 1, "loan": 1, "market": 1, "medal": 1, "microscope": 1, "military": 1, "mining": 1, "missile": 1, "money": 1, "news": 1, "oil": 1, "ok": 1, "peace": 1, "pin": 1, "play": 1, "population": 1, "power": 1, "resources": 1, "satellite": 1, "sea": 1, "shop": 1, "statements": 1, "stats": 1, "steel": 1, "strategic": 1, "tax": 1, "transport": 1, "uranium": 1, "wait": 1, "war": 1, "warn": 1, "welfare": 1, "wrench": 1};
  var keys = Object.keys(MAP), RE = new RegExp("(" + keys.join("|") + ")\\uFE0F?", "g");
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, TITLE: 1, NOSCRIPT: 1 };
  var busy = false, obs = null;
  function icon(name, ch) {
    var i = document.createElement("img");
    i.className = BG[name] ? "ic ibg" : "ic"; i.src = "icons/" + name + ".svg"; i.alt = ch; i.draggable = false;
    i.onerror = function () { i.replaceWith(document.createTextNode(ch)); };   // فایل نبود ← ایموجی
    return i;
  }
  function fix(node) {
    var t = node.nodeValue; RE.lastIndex = 0;
    if (!t || !RE.test(t)) return;
    RE.lastIndex = 0;
    var frag = document.createDocumentFragment(), last = 0, m;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      frag.appendChild(icon(MAP[m[1]], m[0]));
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    node.replaceWith(frag);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !SKIP[root.parentNode.nodeName]) fix(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (n.parentNode && !SKIP[n.parentNode.nodeName]) list.push(n);
    list.forEach(fix);
  }
  var queue = new Set(), raf = 0;
  function flush() {
    raf = 0; busy = true;
    try { queue.forEach(walk); } catch (e) {}
    queue.clear(); busy = false;
  }
  function start() {
    walk(document.body);
    obs = new MutationObserver(function (ms) {
      if (busy) return;
      ms.forEach(function (m) {
        if (m.type === "characterData") queue.add(m.target);
        else m.addedNodes.forEach(function (a) { queue.add(a); });
      });
      if (!raf && queue.size) raf = requestAnimationFrame(flush);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
