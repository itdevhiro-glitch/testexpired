(function () {
  'use strict';

  var CONFIG = {
    expiresAt: new Date('2026-06-07T00:00:00+07:00'),
    displayDate: '6 Juni 2026',
    phoneText: '082191847167',
    waUrl: 'https://wa.me/6282191847167'
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

  function getNoticeKey() {
    var today = new Date().toISOString().slice(0, 10);
    return 'systemExpiryNoticeClosed:' + today;
  }

  function buildNotice(daysLeft) {
    var wrapper = document.createElement('section');
    wrapper.className = 'system-expiry-notice is-compact';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-label', 'Informasi masa aktif web');
    wrapper.innerHTML =
      '<button type="button" class="system-expiry-notice__toggle" aria-label="Buka info masa aktif">' +
        '<span class="system-expiry-notice__dot"></span>' +
        '<span class="system-expiry-notice__mini-text">Aktif sampai ' + escapeHtml(CONFIG.displayDate) + '</span>' +
        '<span class="system-expiry-notice__mini-badge">' + daysLeft + ' hari</span>' +
      '</button>' +
      '<div class="system-expiry-notice__panel" aria-hidden="true">' +
        '<div class="system-expiry-notice__header">' +
          '<div>' +
            '<h3 class="system-expiry-notice__title">Info Masa Aktif Web</h3>' +
            '<p class="system-expiry-notice__text">Aktif sampai <span class="system-expiry-notice__date">' + escapeHtml(CONFIG.displayDate) + '</span>. Setelah tanggal itu, web akan otomatis terkunci untuk keamanan data.</p>' +
          '</div>' +
          '<button type="button" class="system-expiry-notice__close" aria-label="Tutup notice">×</button>' +
        '</div>' +
        '<div class="system-expiry-notice__actions">' +
          '<span class="system-expiry-notice__badge">Sisa ' + daysLeft + ' hari</span>' +
          '<a class="system-expiry-notice__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">Chat WA</a>' +
        '</div>' +
      '</div>';

    var toggle = wrapper.querySelector('.system-expiry-notice__toggle');
    var close = wrapper.querySelector('.system-expiry-notice__close');
    var panel = wrapper.querySelector('.system-expiry-notice__panel');

    function setOpen(isOpen) {
      wrapper.classList.toggle('is-open', isOpen);
      wrapper.classList.toggle('is-compact', !isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      panel.setAttribute('aria-hidden', String(!isOpen));
    }

    toggle.addEventListener('click', function () { setOpen(!wrapper.classList.contains('is-open')); });
    close.addEventListener('click', function () {
      try { localStorage.setItem(getNoticeKey(), '1'); } catch (e) {}
      wrapper.remove();
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
        '<p>Meongmin mendeteksi masa aktif web sudah selesai pada <span class="system-expiry-lock__date">' + escapeHtml(CONFIG.displayDate) + '</span>.</p>' +
        '<p>Jadi halaman ini dikunci otomatis biar datanya aman dan kucingnya bisa rebahan dengan tenang.</p>' +
        '<a class="system-lock__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">🐱 Chat Admin di WhatsApp</a>' +
        '<p class="system-expiry-lock__note">Butuh akses lagi? Hubungi <strong>' + escapeHtml(CONFIG.phoneText) + '</strong>. Jangan lupa kasih ikan virtual buat kucingnya.</p>' +
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

    try {
      if (localStorage.getItem(getNoticeKey()) === '1') return;
    } catch (e) {}

    if (!document.querySelector('.system-expiry-notice')) {
      document.body.appendChild(buildNotice(getDaysLeft(now)));
    }
  }

  ready(init);
})();
