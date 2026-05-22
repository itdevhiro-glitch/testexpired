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

  function buildNotice(daysLeft) {
    var wrapper = document.createElement('section');
    wrapper.className = 'system-expiry-notice';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-label', 'Informasi masa aktif sistem');
    wrapper.innerHTML =
      '<div class="system-expiry-notice__inner">' +
        '<div>' +
          '<h3 class="system-expiry-notice__title">Pemberitahuan Masa Aktif Sistem</h3>' +
          '<p class="system-expiry-notice__text">Masa aktif web ini berlaku sampai <span class="system-expiry-notice__date">' + escapeHtml(CONFIG.displayDate) + '</span>. Setelah tanggal tersebut, akses sistem akan dikunci otomatis. Untuk informasi lebih lanjut hubungi <strong>' + escapeHtml(CONFIG.phoneText) + '</strong>.</p>' +
        '</div>' +
        '<div class="system-expiry-notice__actions">' +
          '<span class="system-expiry-notice__badge">Sisa ' + daysLeft + ' hari</span>' +
          '<a class="system-expiry-notice__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">Hubungi WA</a>' +
        '</div>' +
      '</div>';
    return wrapper;
  }

  function buildLockScreen() {
    var overlay = document.createElement('main');
    overlay.className = 'system-expiry-lock';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Akses sistem dikunci');
    overlay.innerHTML =
      '<div class="system-expiry-lock__card">' +
        '<div class="system-expiry-lock__eyebrow">System Access Locked</div>' +
        '<h1>Masa Aktif Sistem Telah Berakhir</h1>' +
        '<p>Web ini sudah melewati masa aktif pada <span class="system-expiry-lock__date">' + escapeHtml(CONFIG.displayDate) + '</span>. Akses ke halaman dan fitur sistem telah dinonaktifkan secara otomatis.</p>' +
        '<p>Silakan hubungi administrator untuk informasi lanjutan, aktivasi ulang, atau kebutuhan operasional lainnya.</p>' +
        '<a class="system-lock__wa" href="' + CONFIG.waUrl + '" target="_blank" rel="noopener">Hubungi WhatsApp ' + escapeHtml(CONFIG.phoneText) + '</a>' +
        '<p class="system-expiry-lock__note">Restricted system. Unauthorized access is not permitted.</p>' +
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

    if (!document.querySelector('.system-expiry-notice')) {
      document.body.appendChild(buildNotice(getDaysLeft(now)));
    }
  }

  ready(init);
})();
