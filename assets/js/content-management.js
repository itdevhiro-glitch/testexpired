// Extracted from content-management.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { getDatabase, ref, get, set, push, onValue, remove, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app); 

        // Quill Setup
        const quillToolbarOptions = [ [{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline', 'link'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean'] ];
        const quillCreate = new Quill('#quill-editor-container', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
        const quillEdit = new Quill('#quill-editor-container-edit', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });

        let loggedInUserName = "Tamu";
        let deleteType = null; // 'announcement' or 'employee'
        let deleteKey = null;

        // AUTH CHECK
        onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = ref(db, 'users/' + user.uid);
                get(userRef).then((snapshot) => {
                    const userData = snapshot.val();
                    const isRoot = (user.email === 'root@zeppelin.center');
                    const isHR = (userData && userData.status === 'approved' && (userData.departemen === 'HRD' || userData.departemen === 'Human Resources'));
                    
                    if (isRoot || isHR) {
                        loggedInUserName = isRoot ? "Administrator" : userData.nama;
                        document.getElementById('user-display-name').textContent = loggedInUserName;
                        document.getElementById('loading-screen').style.display = 'none';
                        document.getElementById('main-content').style.display = 'flex';
                        
                        // Load Initial Data
                        loadAnnouncements();
                        loadEmployees();
                    } else {
                        alert("Akses Ditolak: Khusus Department HRD.");
                        window.location.href = 'dashboard.html';
                    }
                });
            } else {
                window.location.href = 'login.html';
            }
        });

        // VIEW SWITCHER
        window.switchTab = (tab) => {
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            // Set active class logic specifically based on tab name
            const navs = document.querySelectorAll('.nav-link');
            if(tab === 'announcement') navs[0].classList.add('active');
            if(tab === 'employee') navs[1].classList.add('active');

            document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));
            document.getElementById(`view-${tab}`).classList.remove('hidden');
            
            const titles = { 'announcement': 'Manajemen Konten', 'employee': 'Data Karyawan & Akses' };
            document.getElementById('page-heading').textContent = titles[tab];
        }

        // =======================
        // MANAJEMEN PENGUMUMAN
        // =======================
        
        // Load
        function loadAnnouncements() {
            onValue(ref(db, 'announcements'), (snapshot) => {
                const list = document.getElementById('announcement-list');
                list.innerHTML = '';
                const posts = [];
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        posts.push({ key: child.key, ...child.val() });
                    });
                }
                posts.sort((a, b) => (b.isPinned - a.isPinned) || (b.timestamp - a.timestamp));

                if (posts.length === 0) { list.innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;">Belum ada pengumuman.</div>'; return; }

                posts.forEach(post => {
                    const el = document.createElement('div');
                    el.className = 'announcement-item';
                    let tags = `<span class="tag">${post.category}</span>`;
                    if(post.isPinned) tags += `<span class="tag tag-pin"><i class="fa-solid fa-thumbtack"></i> Pinned</span>`;

                    el.innerHTML = `
                        <div class="ann-content">
                            <div class="ann-title">${escapeHTML(post.title)}</div>
                            <div class="ann-meta"><span><i class="fa-solid fa-user"></i> ${escapeHTML(post.author)}</span><span>${new Date(post.timestamp).toLocaleDateString()}</span></div>
                            <div class="tags">${tags}</div>
                        </div>
                        <div class="actions">
                            <button class="btn-icon edit-btn"><i class="fa-solid fa-pencil"></i></button>
                            <button class="btn-icon delete-btn"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                    el.querySelector('.edit-btn').onclick = () => openEditAnnouncement(post);
                    el.querySelector('.delete-btn').onclick = () => { deleteType='announcement'; deleteKey=post.key; openModal('delete-modal'); };
                    list.appendChild(el);
                });
            });
        }

        // Create
        document.getElementById('create-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-create-btn'); btn.disabled = true; btn.textContent = "Menyimpan...";
            
            push(ref(db, 'announcements'), {
                title: document.getElementById('ann-title').value,
                content: quillCreate.root.innerHTML,
                category: document.getElementById('ann-category').value,
                expiresAt: document.getElementById('ann-expiry').value || null,
                isPinned: document.getElementById('ann-pin').checked,
                author: loggedInUserName,
                timestamp: serverTimestamp()
            }).then(() => {
                showMsg("Pengumuman dipublikasikan!");
                closeModal('create-modal'); document.getElementById('create-form').reset(); quillCreate.root.innerHTML = '';
            }).finally(() => { btn.disabled = false; btn.textContent = "Publikasikan"; });
        });

        // Edit Save
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            update(ref(db, 'announcements/' + id), {
                title: document.getElementById('edit-title').value,
                content: quillEdit.root.innerHTML,
                category: document.getElementById('edit-category').value,
                expiresAt: document.getElementById('edit-expiry').value || null,
                isPinned: document.getElementById('edit-pin').checked
            }).then(() => { showMsg("Perubahan disimpan!"); closeModal('edit-modal'); });
        });

        window.openCreateModal = () => openModal('create-modal');
        function openEditAnnouncement(post) {
            document.getElementById('edit-id').value = post.key;
            document.getElementById('edit-title').value = post.title;
            quillEdit.root.innerHTML = post.content;
            document.getElementById('edit-category').value = post.category;
            document.getElementById('edit-expiry').value = post.expiresAt || '';
            document.getElementById('edit-pin').checked = post.isPinned;
            openModal('edit-modal');
        }


        // =======================
        // MANAJEMEN KARYAWAN (HR)
        // =======================

        // Load Employees (SUDAH DIPERBAIKI LOGIKANYA)
        function loadEmployees() {
            onValue(ref(db, 'users'), (snapshot) => {
                const tbody = document.getElementById('employee-list');
                tbody.innerHTML = '';
                const users = [];
                
                if(snapshot.exists()) {
                    // MENGGUNAKAN KURUNG KURAWAL {} AGAR LOOPING TIDAK BERHENTI
                    snapshot.forEach(child => {
                        users.push({ uid: child.key, ...child.val() });
                    });
                }

                // Filter out Admin (optional) and sort by name
                users.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

                if(users.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data.</td></tr>'; return; }

                users.forEach(u => {
                    const row = document.createElement('tr');
                    
                    // Logic Status
                    let statusClass = 'st-pending';
                    let statusText = 'Pending Approval';
                    if (u.status === 'approved') { statusClass = 'st-approved'; statusText = 'Active'; }
                    else if (u.status === 'rejected' || u.status === 'banned') { statusClass = 'st-rejected'; statusText = 'Suspended/Rejected'; }

                    row.innerHTML = `
                        <td>
                            <div style="font-weight:600;">${escapeHTML(u.nama)}</div>
                            <div style="font-size:0.75rem; color:var(--text-grey);">NIK: ${escapeHTML(u.nik || '-')}</div>
                        </td>
                        <td>${escapeHTML(u.email)}</td>
                        <td>${escapeHTML(u.departemen || '-')}</td>
                        <td>${escapeHTML(u.jobTitle || '-')}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td style="text-align:center;">
                            <div class="actions" style="justify-content:center;">
                                <button class="btn-icon edit-emp-btn" title="Edit Data"><i class="fa-solid fa-pencil"></i></button>
                                ${u.status === 'pending' ? '<button class="btn-icon del-emp-btn" title="Hapus Permintaan"><i class="fa-solid fa-trash"></i></button>' : ''}
                            </div>
                        </td>
                    `;
                    
                    row.querySelector('.edit-emp-btn').onclick = () => openEmpModal(u);
                    if(row.querySelector('.del-emp-btn')) {
                        row.querySelector('.del-emp-btn').onclick = () => { deleteType='employee'; deleteKey=u.uid; openModal('delete-modal'); };
                    }
                    tbody.appendChild(row);
                });
            });
        }

        // Open Modal Employee (Add/Edit)
        window.openEmpModal = (user) => {
            const form = document.getElementById('emp-form');
            form.reset();
            if (user) {
                // Edit Mode
                document.getElementById('emp-modal-title').textContent = "Edit Data Karyawan";
                document.getElementById('emp-uid').value = user.uid;
                document.getElementById('emp-name').value = user.nama || '';
                document.getElementById('emp-email').value = user.email || '';
                document.getElementById('emp-dept').value = user.departemen || '';
                document.getElementById('emp-job').value = user.jobTitle || '';
                document.getElementById('emp-nik').value = user.nik || '';
                // Disable email editing for existing approved users (Admin should handle credential changes)
                document.getElementById('emp-email').readOnly = (user.status === 'approved');
            } else {
                // Add Mode
                document.getElementById('emp-modal-title').textContent = "Tambah Karyawan Baru";
                document.getElementById('emp-uid').value = "";
                document.getElementById('emp-email').readOnly = false;
            }
            openModal('emp-modal');
        }

        // Save Employee (Request)
        document.getElementById('emp-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const uid = document.getElementById('emp-uid').value;
            const name = document.getElementById('emp-name').value;
            const email = document.getElementById('emp-email').value;
            const dept = document.getElementById('emp-dept').value;
            const job = document.getElementById('emp-job').value;
            const nik = document.getElementById('emp-nik').value;

            const btn = document.getElementById('btn-save-emp');
            btn.disabled = true; btn.textContent = "Memproses...";

            if (uid) {
                // UPDATE EXISTING
                update(ref(db, 'users/' + uid), {
                    nama: name,
                    departemen: dept,
                    jobTitle: job,
                    nik: nik
                    // Note: Email tidak diupdate di sini karena terkait Auth, hanya data profile
                }).then(() => {
                    showMsg("Data karyawan diperbarui.");
                    closeModal('emp-modal');
                }).finally(() => btn.disabled = false);
            } else {
                // CREATE NEW REQUEST
                const newRef = push(ref(db, 'users'));
                set(newRef, {
                    uid: newRef.key, 
                    nama: name,
                    email: email,
                    departemen: dept,
                    jobTitle: job,
                    nik: nik,
                    status: 'pending', 
                    role: 'Employee',
                    requestedBy: loggedInUserName,
                    requestDate: serverTimestamp()
                }).then(() => {
                    showMsg("Permintaan akun dikirim ke Admin IT.");
                    closeModal('emp-modal');
                }).finally(() => btn.disabled = false);
            }
        });


        // =======================
        // GENERAL UTILS
        // =======================

        // Global Delete
        document.getElementById('confirm-delete-btn').addEventListener('click', () => {
            if (!deleteKey) return;
            
            let path = '';
            if (deleteType === 'announcement') path = 'announcements/' + deleteKey;
            else if (deleteType === 'employee') path = 'users/' + deleteKey;
            
            if (path) {
                remove(ref(db, path)).then(() => {
                    showMsg("Data berhasil dihapus.");
                    closeModal('delete-modal');
                });
            }
        });

        // Modals
        window.openModal = (id) => document.getElementById(id).style.display = 'flex';
        window.closeModal = (id) => document.getElementById(id).style.display = 'none';

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            signOut(auth).then(() => window.location.href = 'login.html');
        });

        // Message Toast
        function showMsg(msg) {
            const box = document.getElementById('global-msg');
            box.textContent = msg; box.className = 'msg-box msg-success'; box.style.display = 'block';
            setTimeout(() => box.style.display = 'none', 3000);
        }

        function escapeHTML(str) {
            return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])) : '';
        }
