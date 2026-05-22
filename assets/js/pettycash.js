// Extracted from pettycash.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

        let allData = [];
        let currentFilter = 'all';

        const CAT_EXPENSE = ["Operasional", "Konsumsi", "ATK", "Transport", "Maintenance", "Lainnya"];
        const CAT_INCOME = ["Top Up Kas", "Reimbursement", "Refund", "Sisa Project", "Lainnya"];

        onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = ref(db, 'users/' + user.uid);
                get(userRef).then((snapshot) => {
                    const data = snapshot.val();
                    const isFinance = (data.departemen && (data.departemen.includes('Finance') || data.departemen.includes('Accounting') || user.email === 'root@zeppelin.center'));
                    
                    if (isFinance) {
                        document.getElementById('user-display').textContent = data.nama || "Finance Team";
                        document.getElementById('loading-screen').style.opacity = '0';
                        setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 400);
                        initListener();
                    } else {
                        alert("Akses Ditolak. Khusus Finance.");
                        window.location.href = 'dashboard.html';
                    }
                });
            } else {
                window.location.href = 'login.html';
            }
        });

        function initListener() {
            const pcRef = ref(db, 'finance_pettycash');
            onValue(pcRef, (snapshot) => {
                allData = [];
                const data = snapshot.val();
                if (data) {
                    Object.keys(data).forEach(key => {
                        const item = data[key];
                        if(!item.type) item.type = 'expense';
                        allData.push({ id: key, ...item });
                    });
                }
                allData.sort((a, b) => new Date(b.date) - new Date(a.date));
                calculateStats();
                renderTable();
            });
        }

        function calculateStats() {
            let totalInc = 0;
            let totalExp = 0;

            allData.forEach(item => {
                const amt = parseInt(item.amount) || 0;
                if(item.type === 'income') totalInc += amt;
                else totalExp += amt;
            });

            const balance = totalInc - totalExp;
            document.getElementById('stat-balance').textContent = "Rp " + balance.toLocaleString('id-ID');
            document.getElementById('stat-income').textContent = "Rp " + totalInc.toLocaleString('id-ID');
            document.getElementById('stat-expense').textContent = "Rp " + totalExp.toLocaleString('id-ID');
        }

        window.setFilter = (filterType) => {
            currentFilter = filterType;
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            renderTable();
        };

        function renderTable() {
            const tbody = document.getElementById('pc-table-body');
            const emptyState = document.getElementById('empty-state');
            const term = document.getElementById('search-input').value.toLowerCase();
            tbody.innerHTML = '';

            const filtered = allData.filter(item => {
                if(currentFilter !== 'all' && item.type !== currentFilter) return false;
                const match = item.desc.toLowerCase().includes(term) || 
                              item.category.toLowerCase().includes(term) ||
                              item.amount.toString().includes(term);
                return match;
            });

            if (filtered.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            } else {
                emptyState.classList.add('hidden');
            }

            filtered.forEach(item => {
                const tr = document.createElement('tr');
                const isInc = item.type === 'income';
                
                const dateStr = new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const moneyStr = parseInt(item.amount).toLocaleString('id-ID');
                
                const sign = isInc ? "+" : "-";
                const moneyClass = isInc ? "text-inc" : "text-exp";
                const iconClass = isInc ? "type-inc" : "type-exp";
                const icon = isInc ? "fa-arrow-up" : "fa-arrow-down";

                tr.innerHTML = `
                    <td>
                        <div class="type-badge ${iconClass}">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                    </td>
                    <td style="color: #64748b; font-size: 0.85rem;">${dateStr}</td>
                    <td style="font-weight: 500;">${item.desc}</td>
                    <td><span class="category-badge">${item.category}</span></td>
                    <td class="col-money ${moneyClass}">${sign} Rp ${moneyStr}</td>
                    <td style="text-align: right;">
                        <button onclick="window.editTrx('${item.id}')" class="action-btn edit"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="window.deleteTrx('${item.id}')" class="action-btn delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('search-input').addEventListener('input', renderTable);

        window.openModal = () => {
            document.getElementById('trx-id').value = '';
            document.getElementById('trx-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('trx-desc').value = '';
            document.getElementById('trx-amount').value = '';
            
            window.setFormType('expense');
            
            document.getElementById('modal-backdrop').classList.add('active');
            document.getElementById('modal-content').classList.add('active');
        };

        window.closeModal = () => {
            document.getElementById('modal-backdrop').classList.remove('active');
            document.getElementById('modal-content').classList.remove('active');
        };

        window.setFormType = (type) => {
            const btnExp = document.getElementById('btn-type-exp');
            const btnInc = document.getElementById('btn-type-inc');
            const inpType = document.getElementById('trx-type');
            
            inpType.value = type;

            if(type === 'expense') {
                btnExp.className = "type-option selected-exp";
                btnInc.className = "type-option";
                populateCats(CAT_EXPENSE);
            } else {
                btnExp.className = "type-option";
                btnInc.className = "type-option selected-inc";
                populateCats(CAT_INCOME);
            }
        };

        function populateCats(cats) {
            const select = document.getElementById('trx-cat');
            select.innerHTML = '';
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                select.appendChild(opt);
            });
        }

        window.saveTransaction = () => {
            const id = document.getElementById('trx-id').value;
            const type = document.getElementById('trx-type').value;
            const date = document.getElementById('trx-date').value;
            const desc = document.getElementById('trx-desc').value;
            const cat = document.getElementById('trx-cat').value;
            const amount = document.getElementById('trx-amount').value;

            if(!date || !desc || !amount) return alert("Mohon lengkapi data.");

            const dataObj = { type, date, desc, category: cat, amount: parseInt(amount) };

            if(id) {
                set(ref(db, 'finance_pettycash/' + id), dataObj).then(() => {
                    window.closeModal();
                    showToast("Data diperbarui!");
                });
            } else {
                push(ref(db, 'finance_pettycash'), dataObj).then(() => {
                    window.closeModal();
                    showToast("Transaksi disimpan!");
                });
            }
        };

        window.editTrx = (id) => {
            const item = allData.find(i => i.id === id);
            if(item) {
                document.getElementById('trx-id').value = id;
                document.getElementById('trx-date').value = item.date;
                document.getElementById('trx-desc').value = item.desc;
                document.getElementById('trx-amount').value = item.amount;
                
                window.setFormType(item.type);
                document.getElementById('trx-cat').value = item.category;
                
                document.getElementById('modal-backdrop').classList.add('active');
                document.getElementById('modal-content').classList.add('active');
            }
        };

        window.deleteTrx = (id) => {
            if(confirm("Hapus data ini permanen?")) {
                remove(ref(db, 'finance_pettycash/' + id));
            }
        };

        function showToast(message) {
            const t = document.getElementById('toast');
            document.getElementById('toast-msg').textContent = message;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        document.getElementById('modal-backdrop').addEventListener('click', window.closeModal);
