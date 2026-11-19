/* نسخه‌ی وب: وقتی صفحه داخل تلگرام باز نشده، یک «تلگرامِ ساختگی» می‌سازد تا بقیه‌ی برنامه بدون خطا کار کند. */
(function () {
  if (window.Telegram && window.Telegram.WebApp) return;   // داخل تلگرام: همان اصلی
  var noop = function () {};
  var backBtn = null, backCb = null;
  function showBack(on) {
    if (!backBtn) {
      if (!on || !document.body) return;
      backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.textContent = "→ بازگشت";
      backBtn.style.cssText = "position:fixed;top:10px;right:10px;z-index:9000;padding:8px 14px;border:0;border-radius:10px;" +
        "background:#2b3440;color:#f2efe8;font:600 14px Vazirmatn,Tahoma,system-ui,sans-serif;box-shadow:0 2px 10px #0008;cursor:pointer";
      backBtn.onclick = function () { if (backCb) backCb(); };
      document.body.appendChild(backBtn);
    }
    if (backBtn) backBtn.style.display = on ? "block" : "none";
  }
  window.Telegram = { WebApp: {
    initData: "", initDataUnsafe: {}, platform: "web", isWebShim: true,
    ready: noop, expand: noop, setHeaderColor: noop, setBackgroundColor: noop,
    close: function () { try { window.close(); } catch (e) {} },
    openLink: function (u) { window.open(u, "_blank", "noopener"); },
    openTelegramLink: function (u) { window.open(u, "_blank", "noopener"); },
    sendData: function () { alert("این کار فقط از داخل ربات تلگرام ممکن است. به ربات برگردید و از دکمه‌ی داخل ربات استفاده کنید."); },
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    MainButton: { hide: noop, show: noop, setText: noop, onClick: noop },
    BackButton: { show: function () { showBack(true); }, hide: function () { showBack(false); }, onClick: function (f) { backCb = f; } }
  } };
})();
