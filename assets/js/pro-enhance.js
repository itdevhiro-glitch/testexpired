/* Zeppelin Professional UI Enhancement Layer - safe visual only */
(() => {
  const boot = () => {
    document.documentElement.classList.add('zp-pro-ui');
    if (!document.querySelector('.pro-shell-accent')) {
      const dot = document.createElement('div');
      dot.className = 'pro-shell-accent';
      dot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dot);
    }
    const revealTargets = document.querySelectorAll('.card,.panel,.dashboard-card,.feature-card,.summary-card,.stat-card,.form-card,.doc-card,.table-card,.content-card,.finance-card,.page-header,.hero-section');
    revealTargets.forEach((el, index) => {
      if (!el.classList.contains('zp-reveal')) {
        el.classList.add('zp-reveal');
        el.style.animationDelay = `${Math.min(index * 35, 350)}ms`;
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
