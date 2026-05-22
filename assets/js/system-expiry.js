(function () {
  'use strict';

  var CONFIG = {
    expiresAt: new Date('2026-06-07T00:00:00+07:00'),
    displayDate: '6 Juni 2026',
    phoneText: '082191847167',
    waUrl: 'https://wa.me/6282191847167',
    storageKey: 'zeppelin_expiry_notice_hidden_v3'
  };

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getDaysLeft(now) {
    var ms = CONFIG.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }

  function isNoticeHidden() {
    return storageGet(CONFIG.storageKey) === '1';
  }

  function hideNotice() {
    storageSet(CONFIG.storageKey, '1');
    var notice = document.querySelector('.system-expiry-notice');
    if (notice) {
      notice.classList.add('is-hiding');
      window.setTimeout(function () { if (notice.parentNode) notice.remove(); }, 220);
    }
  }

  function minimizeNotice() {
    var notice = document.querySelector('.system-expiry-notice');
    if (!notice) return;
    notice.classList.toggle('is-minimized');
    var btn = notice.querySelector('[data-expiry-minimize]');
    if (btn) btn.setAttribute('aria-label', notice.classList.contains('is-minimized') ? 'Buka notice masa aktif' : 'Minimize notice masa aktif');
  }

  function buildNotice(daysLeft) {
    var wrapper = document.createElement('section');
    wrapper.className = 'system-expiry-notice';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-label', 'Informasi masa aktif web');
    wrapper.innerHTML =
      '<div class="system-expiry-notice__head">' +
        '<span class="system-expiry-notice__dot" aria-hidden="true"></span>' +
        '<strong class="system-expiry-notice__title">Masa Aktif Web</strong>' +
        '<span class="system-expiry-notice__badge">' + daysLeft + ' hari</span>' +
        '<button type="button" class="system-expiry-notice__icon" data-expiry-minimize aria-label="Minimize notice masa aktif">−</button>' +
        '<button type="button" class="system-expiry-notice__icon" data-expiry-hide aria-label="Tutup notice masa aktif">×</button>' +
      '</div>' +
      '<div class="system-expiry-notice__body">' +
        '<p class="system-expiry-notice__text">Aktif sampai <b>' + escapeHtml(CONFIG.displayDate) + '</b>. Info lanjut hubungi admin.</p>' +
        '<a class="system-expiry-notice__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">Chat WA</a>' +
      '</div>';
    wrapper.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.closest('[data-expiry-hide]')) hideNotice();
      if (target && target.closest('[data-expiry-minimize]')) minimizeNotice();
    });
    return wrapper;
  }

  function buildLockScreen() {
    var overlay = document.createElement('main');
    overlay.className = 'system-expiry-lock';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Web sedang terkunci');
    overlay.innerHTML =
      '<div class="system-expiry-float system-expiry-float--one">🐾</div>' +
      '<div class="system-expiry-float system-expiry-float--two">✨</div>' +
      '<div class="system-expiry-float system-expiry-float--three">💤</div>' +
      '<div class="system-expiry-lock__card">' +
        '<div class="system-expiry-lock__cat" aria-hidden="true">' +
          '<div class="cat-ear cat-ear--left"></div>' +
          '<div class="cat-ear cat-ear--right"></div>' +
          '<div class="cat-face">' +
            '<div class="cat-eye cat-eye--left"></div>' +
            '<div class="cat-eye cat-eye--right"></div>' +
            '<div class="cat-nose"></div>' +
            '<div class="cat-mouth">ω</div>' +
            '<div class="cat-whisker cat-whisker--left">≋</div>' +
            '<div class="cat-whisker cat-whisker--right">≋</div>' +
          '</div>' +
        '</div>' +
        '<div class="system-expiry-lock__eyebrow">Meong, webnya lagi bobok</div>' +
        '<h1>Web Ini Lagi Istirahat Dulu 😺</h1>' +
        '<p>Masa aktif web sudah selesai pada <span class="system-expiry-lock__date">' + escapeHtml(CONFIG.displayDate) + '</span>.</p>' +
        '<p>Halaman dikunci otomatis untuk menjaga akses dan data tetap aman.</p>' +
        '<a class="system-lock__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">🐱 Chat Admin di WhatsApp</a>' +
        '<p class="system-expiry-lock__note">Butuh akses lagi? Hubungi <strong>' + escapeHtml(CONFIG.phoneText) + '</strong>.</p>' +
      '</div>';
    return overlay;
  }

  function lockPage() {
    document.body.classList.add('system-expired');
    var existingNotice = document.querySelector('.system-expiry-notice');
    if (existingNotice) existingNotice.remove();
    if (!document.querySelector('.system-expiry-lock')) {
      document.body.appendChild(buildLockScreen());
    }
  }

  function init() {
    var now = new Date();
    if (now >= CONFIG.expiresAt) {
      lockPage();
      return;
    }

    if (isNoticeHidden()) return;

    if (!document.querySelector('.system-expiry-notice')) {
      document.body.appendChild(buildNotice(getDaysLeft(now)));
    }
  }

  ready(init);
})();
