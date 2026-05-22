// Extracted from login.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
        const firebaseConfig = {
            apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
            authDomain: "it-support-53eeb.firebaseapp.com",
            databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
            projectId: "it-support-53eeb",
            storageBucket: "it-support-53eeb.firebasestorage.app",
            messagingSenderId: "573924501146",
            appId: "1:573924501146:web:12f34306ed675472322123"
        };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);
        window.togglePanel = () => {
            document.getElementById('main-container').classList.toggle('right-panel-active');
        };
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.email === 'root@zeppelin.center') window.location.href = 'dashboard.html';
                else {
                    get(ref(db, 'users/' + user.uid)).then((snap) => {
                        if (snap.exists() && snap.val().status === 'approved') window.location.href = 'dashboard.html';
                    });
                }
            }
        });
        function showMsg(id, text, isError = true) {
            const el = document.getElementById(id);
            el.innerHTML = text;
            el.className = isError ? 'msg-box msg-error' : 'msg-box msg-success';
            el.style.display = 'block';
        }
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.innerText = "Memproses...";
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                const user = userCredential.user;
                if (user.email === 'root@zeppelin.center') {
                    window.location.href = 'dashboard.html';
                    return;
                }
                const snapshot = await get(ref(db, 'users/' + user.uid));
                if (snapshot.exists() && snapshot.val().status === 'approved') {
                    window.location.href = 'dashboard.html';
                } else {
                    const status = snapshot.exists() ? snapshot.val().status : 'unknown';
                    showMsg('login-msg', status === 'pending' ? "Akun menunggu persetujuan Admin." : "Akses ditolak.");
                    signOut(auth);
                }
            } catch (error) {
                showMsg('login-msg', "Email atau Password salah.");
            } finally {
                btn.disabled = false;
                btn.innerText = "Masuk Workspace";
            }
        });
        document.getElementById('reg-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const dept = document.getElementById('reg-dept').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const btn = document.getElementById('reg-btn');
            if(pass.length < 6) { showMsg('reg-msg', "Password minimal 6 karakter."); return; }
            btn.disabled = true;
            btn.innerText = "Mendaftarkan...";
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                const uid = userCredential.user.uid;
                await set(ref(db, 'users/' + uid), {
                    uid: uid, nama: name, departemen: dept, email: email, status: 'pending', createdAt: Date.now()
                });
                showMsg('reg-msg', "Berhasil! Silakan hubungi admin untuk aktivasi.", false);
                document.getElementById('reg-form').reset();
                setTimeout(() => { togglePanel(); }, 3000);
            } catch (error) {
                let msg = "Gagal mendaftar.";
                if (error.code === 'auth/email-already-in-use') msg = "Email sudah digunakan.";
                showMsg('reg-msg', msg);
            } finally {
                btn.disabled = false;
                btn.innerText = "Ajukan Akses";
            }
        });
