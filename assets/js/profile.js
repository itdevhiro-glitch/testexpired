// Extracted from profile.html
const firebaseConfig = {
        apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
        authDomain: "it-support-53eeb.firebaseapp.com",
        databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
        projectId: "it-support-53eeb",
        storageBucket: "it-support-53eeb.firebasestorage.app",
        messagingSenderId: "573924501146",
        appId: "1:573924501146:web:12f34306ed675472322123",
        measurementId: "G-33K6DDE1VR"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();
    const firestore = firebase.firestore();

    let currentUserData = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserData(user.uid);
            loadUserTickets(user.uid);
            loadUserAssets(user.uid);
        } else {
            window.location.href = '../index.html'; 
        }
    });

    async function loadUserData(uid) {
        try {
            const snap = await db.ref('users/' + uid).get();
            if (snap.exists()) {
                currentUserData = snap.val();
                
                document.getElementById('sb_name').textContent = currentUserData.nama || "User";
                document.getElementById('sb_role').textContent = currentUserData.departemen || 'Employee';
                
                const initial = currentUserData.nama ? currentUserData.nama.charAt(0).toUpperCase() : '';
                const avatarEl = document.getElementById('sb_avatar');
                if(initial) {
                    avatarEl.textContent = initial;
                    avatarEl.style.color = "var(--primary)";
                    avatarEl.style.fontWeight = "800";
                }
                
                document.getElementById('p_name').value = currentUserData.nama || "";
                document.getElementById('p_phone').value = currentUserData.phone || "";
                document.getElementById('p_dept').value = currentUserData.departemen || "Belum diatur";
            }
            document.getElementById('loading-screen').style.display = 'none';
        } catch (error) {
            console.error(error);
            alert("Gagal memuat profil.");
            document.getElementById('loading-screen').style.display = 'none';
        }
    }

    function loadUserTickets(uid) {
        db.ref('reports').orderByChild('uid').equalTo(uid).on('value', snap => {
            const tbody = document.getElementById('ticketTableBody');
            tbody.innerHTML = '';
            
            if (snap.exists()) {
                const data = snap.val();
                const tickets = Object.keys(data).map(key => ({...data[key], key})).reverse();

                tickets.forEach(t => {
                    const row = `
                        <tr>
                            <td style="font-family:'JetBrains Mono', monospace; font-weight:700; color:var(--primary); letter-spacing:-0.5px;">${t.id || t.key}</td>
                            <td>
                                <div style="font-weight:700; color:var(--text-primary); margin-bottom:2px;">${t.jenis}</div>
                                <div style="font-size:11px; color:var(--text-secondary);">${t.kategori}</div>
                            </td>
                            <td><span class="badge status-${t.status}">${t.status}</span></td>
                            <td style="color:var(--text-secondary); font-size:13px;">${new Date(t.created_iso).toLocaleDateString()}</td>
                            <td style="font-weight:500;">${t.pic || '-'}</td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding:40px;">Belum ada tiket support.</td></tr>';
            }
        });
    }

    function loadUserAssets(uid) {
        firestore.collection('assets').where('assigned_uid', '==', uid).onSnapshot(snap => {
            const container = document.getElementById('assetList');
            container.innerHTML = '';

            if (snap.empty) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:var(--text-secondary); background:white; border-radius:12px; border:1px solid var(--border-subtle);">
                        <i class="ri-computer-line" style="font-size:32px; color:var(--text-tertiary); margin-bottom:8px; display:block;"></i>
                        Tidak ada aset yang terdaftar atas nama Anda.
                    </div>`;
                return;
            }

            snap.forEach(doc => {
                const a = doc.data();
                const iconClass = a.type === 'Laptop' ? 'ri-macbook-line' : (a.type === 'PC' ? 'ri-computer-line' : 'ri-device-line');
                
                const html = `
                    <div class="asset-card">
                        <div class="asset-icon">
                            <i class="${iconClass}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700; color:var(--text-primary); font-size:15px;">${a.brand} ${a.name}</div>
                            <div style="font-size:12px; color:var(--text-secondary); font-family:monospace; margin-top:2px;">Tag: <span style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${a.tag}</span></div>
                        </div>
                        <div class="badge status-Open">Aktif</div>
                    </div>
                `;
                container.innerHTML += html;
            });
        });
    }

    window.switchView = (viewName) => {
        ['tickets', 'assets', 'settings'].forEach(v => {
            document.getElementById(`view-${v}`).classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));

        document.getElementById(`view-${viewName}`).classList.remove('hidden');
        
        const navItems = document.querySelectorAll('.nav-item');
        if(viewName === 'settings') navItems[0].classList.add('active');
        if(viewName === 'tickets') navItems[1].classList.add('active');
        if(viewName === 'assets') navItems[2].classList.add('active');

        const mobItems = document.querySelectorAll('.mobile-nav-item');
        if(viewName === 'settings') mobItems[1].classList.add('active');
        if(viewName === 'tickets') mobItems[2].classList.add('active');
    };

    window.updateProfile = async (e) => {
        e.preventDefault();
        const uid = auth.currentUser.uid;
        const btnSave = e.target.querySelector('button');
        
        btnSave.disabled = true;
        btnSave.textContent = "Menyimpan...";

        const updates = {
            phone: document.getElementById('p_phone').value
        };

        try {
            await db.ref('users/' + uid).update(updates);
            alert("Nomor HP berhasil diperbarui!");
        } catch (err) {
            alert("Gagal update: " + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ri-save-line"></i> Simpan No HP';
        }
    };

    window.changePassword = async (e) => {
        e.preventDefault();
        const p1 = document.getElementById('p_pass').value;
        const p2 = document.getElementById('p_pass_conf').value;

        if (p1 !== p2) return alert("Password konfirmasi tidak sama!");

        const btnPass = e.target.querySelector('button');
        btnPass.disabled = true;
        btnPass.textContent = "Memproses...";

        try {
            await auth.currentUser.updatePassword(p1);
            alert("Password berhasil diganti! Silakan login ulang.");
            auth.signOut().then(() => window.location.href = '../index.html');
        } catch (err) {
            alert("Error: " + err.message);
            if(err.code === 'auth/requires-recent-login') {
                alert("Untuk keamanan, silakan Logout dan Login kembali sebelum mengganti password.");
            }
        } finally {
            btnPass.disabled = false;
            btnPass.innerHTML = '<i class="ri-lock-password-line"></i> Update Password';
        }
    };

    window.logout = () => {
        if(confirm("Yakin ingin keluar?")) {
            auth.signOut().then(() => window.location.href = '../index.html');
        }
    };
