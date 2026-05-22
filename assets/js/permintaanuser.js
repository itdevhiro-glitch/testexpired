// Extracted from permintaanuser.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { 
            getDatabase, 
            ref, 
            set, 
            push,
            query,
            orderByChild,
            equalTo,
            onValue,
            get
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

        // UI Elements
        const mainContent = document.getElementById('main-content');
        const loadingScreen = document.getElementById('loading-screen');
        const logoutBtn = document.getElementById('logout-btn');
        const formAlert = document.getElementById('form-alert');
        
        // Form Inputs
        const nameDisplay = document.getElementById('user-name-display');
        const deptDisplay = document.getElementById('user-dept-display');
        
        let currentUserData = null;

        // --- AUTH & LOAD USER ---
        onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = ref(db, 'users/' + user.uid);
                
                get(userRef).then((snapshot) => {
                    // Admin redirect
                    if (user.email === 'root@zeppelin.center') {
                        window.location.href = 'login.html?reason=admin_wrong_page';
                        return;
                    }

                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        if (userData.status === 'approved') {
                            currentUserData = userData; 
                            currentUserData.uid = user.uid;
                            
                            // Auto-fill Readonly Fields
                            nameDisplay.value = userData.nama || user.email;
                            deptDisplay.value = userData.departemen || '-';

                            mainContent.style.display = 'block';
                            loadingScreen.style.display = 'none';
                            
                            // Load History
                            loadUserHistory(user.uid);
                            
                        } else {
                            signOut(auth).then(() => window.location.href = 'login.html?reason=pending');
                        }
                    } else {
                        signOut(auth).then(() => window.location.href = 'login.html?reason=no_data');
                    }
                }).catch((err) => {
                    console.error(err);
                    signOut(auth).then(() => window.location.href = 'login.html?reason=error');
                });
            } else {
                window.location.href = 'login.html';
            }
        });

        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => window.location.href = 'login.html');
        });

        // --- SUBMIT FORM ---
        const requestForm = document.getElementById('request-form');
        const submitButton = document.getElementById('submit-button');

        requestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!currentUserData) return;
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';
            
            const requestData = {
                uid: currentUserData.uid,
                nama: currentUserData.nama,
                email: currentUserData.email,
                departemen: currentUserData.departemen || 'N/A',
                kategori: document.getElementById('req-kategori').value,
                prioritas: document.getElementById('req-prioritas').value,
                detail: document.getElementById('req-detail').value,
                alasan: document.getElementById('req-alasan').value,
                status: 'Pending',
                created_at: new Date().toISOString(),
                admin_notes: ''
            };

            const requestsRef = ref(db, 'device_requests');
            const newRequestRef = push(requestsRef);
            
            set(newRequestRef, requestData)
                .then(() => {
                    showAlert("Permintaan berhasil dikirim! Tim IT akan segera meninjaunya.", "success");
                    requestForm.reset();
                    // Reset readonly fields
                    nameDisplay.value = currentUserData.nama;
                    deptDisplay.value = currentUserData.departemen;
                })
                .catch((error) => {
                    showAlert("Gagal mengirim permintaan: " + error.message, "error");
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Permintaan';
                });
        });

        function showAlert(msg, type) {
            formAlert.style.display = 'block';
            formAlert.textContent = msg;
            formAlert.className = `alert alert-${type}`;
            setTimeout(() => { formAlert.style.display = 'none'; }, 5000);
        }

        // --- LOAD HISTORY ---
        function loadUserHistory(uid) {
            const historyBody = document.getElementById('history-table-body');
            const requestsRef = ref(db, 'device_requests');
            const userRequestsQuery = query(requestsRef, orderByChild('uid'), equalTo(uid));

            onValue(userRequestsQuery, (snapshot) => {
                historyBody.innerHTML = '';
                if (snapshot.exists()) {
                    let requests = [];
                    snapshot.forEach(child => requests.push(child.val()));
                    
                    // Sort Newest First
                    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    
                    requests.forEach(req => {
                        const tr = document.createElement('tr');
                        const dateObj = new Date(req.created_at);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                        // Badge Color Logic
                        let badgeClass = 'badge-pending';
                        if(req.status === 'Approved') badgeClass = 'badge-approved';
                        if(req.status === 'Rejected') badgeClass = 'badge-rejected';
                        if(req.status === 'Done') badgeClass = 'badge-done';

                        tr.innerHTML = `
                            <td>
                                <strong>${dateStr}</strong><br>
                                <small style="color:#9ca3af">${timeStr}</small>
                            </td>
                            <td>${req.kategori}</td>
                            <td>
                                <strong>${req.detail}</strong><br>
                                <small style="color:#6b7280">"${req.alasan}"</small>
                            </td>
                            <td><span class="badge ${badgeClass}">${req.status}</span></td>
                            <td>${req.admin_notes || '<span style="color:#d1d5db">-</span>'}</td>
                        `;
                        historyBody.appendChild(tr);
                    });
                } else {
                    historyBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="empty-state">
                                <i class="fa-solid fa-clipboard-list"></i>
                                <p>Belum ada riwayat permintaan.</p>
                            </td>
                        </tr>`;
                }
            });
        }
