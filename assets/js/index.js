
// Safe redirect helper: kalau user baru saja login, jangan lempar ulang ke landing intro.
if (sessionStorage.getItem('zeppelin_login_ok') === '1' && location.pathname.endsWith('/index.html')) {
  window.location.href = 'pages/dashboard.html';
}
// Extracted from index.html
window.addEventListener('load', () => {
            const btn = document.getElementById('morph-btn');
            const stateInit = document.getElementById('state-init');
            const stateLoading = document.getElementById('state-loading');
            const stateSuccess = document.getElementById('state-success');
            const card = document.getElementById('main-card');

            setTimeout(() => {
                
                stateInit.classList.remove('visible');
                stateInit.classList.add('hidden');
                
                btn.classList.add('loading-shape');

                setTimeout(() => {
                    stateLoading.classList.remove('hidden');
                    stateLoading.classList.add('visible');
                }, 200);

                setTimeout(() => {

                    stateLoading.classList.remove('visible');
                    stateLoading.classList.add('hidden');

                    btn.classList.remove('loading-shape');
                    btn.classList.add('success-shape');

                    setTimeout(() => {
                        stateSuccess.classList.remove('hidden');
                        stateSuccess.classList.add('visible');
                    }, 200); 

                    setTimeout(() => {
                        card.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = 'pages/login.html';
                        }, 500);
                    }, 1500); 

                }, 2500); 

            }, 800); 
        });
