// Extracted from finance.html
// CONFIG FIREBASE SAMA PERSIS (TIDAK DIUBAH)
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

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.database();

        let customersData = {};
        let invoicesData = {};
        let reimburseData = {};
        let pettyCashData = {};
        let chartInstance = null;
        let expenseChartInstance = null;
        let currentEditingId = null;

        function formatRupiah(amount) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
        }

        function showNotification(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icon = type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation';
            const color = type === 'success' ? 'var(--success-green)' : 'var(--primary-red)';
            
            toast.innerHTML = `
                <i class="fa-solid ${icon} toast-icon" style="color:${color}"></i>
                <span class="toast-msg">${message}</span>
            `;
            container.appendChild(toast);
            void toast.offsetWidth;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function openModal(type, editId = null) {
            const modal = document.getElementById('modal-'+type);
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            
            if (type === 'topup') {
                document.getElementById('topup-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('topup-amount').value = '';
                document.getElementById('topup-desc').value = '';
            }

            if(type === 'customer') {
                if (editId) {
                    currentEditingId = editId;
                    const data = customersData[editId];
                    document.getElementById('modal-title-cust').textContent = "Edit Pelanggan";
                    document.getElementById('btn-save-cust').textContent = "Update";
                    document.getElementById('cust-name').value = data.name || '';
                    document.getElementById('cust-npwp').value = data.npwp || '';
                    document.getElementById('cust-pic').value = data.pic || '';
                    document.getElementById('cust-email').value = data.email || '';
                    document.getElementById('cust-phone').value = data.phone || '';
                    document.getElementById('cust-addr').value = data.addr || '';
                } else {
                    currentEditingId = null;
                    document.getElementById('modal-title-cust').textContent = "Pelanggan Baru";
                    document.getElementById('btn-save-cust').textContent = "Simpan";
                    ['cust-name','cust-npwp','cust-pic','cust-email','cust-phone','cust-addr'].forEach(id => document.getElementById(id).value = '');
                }
            }
            if(type === 'invoice') updateCustomerDropdown();
        }

        function closeModals() {
            document.querySelectorAll('.modal-backdrop').forEach(m => {
                m.classList.remove('show');
                setTimeout(() => {
                    if(!m.classList.contains('show')) m.style.display = 'none';
                }, 300);
            });
        }

        // UPDATE TAB SWITCHER TO HANDLE BOTTOM NAV
        function switchTab(tabName) {
            // Panels
            document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('panel-' + tabName).classList.add('active');
            
            // Desktop Sidebar
            document.querySelectorAll('.sidebar .menu-item').forEach(m => m.classList.remove('active'));
            const map = { 'overview': 0, 'customers': 1, 'invoice': 2, 'reimburse': 3, 'calculator': 4 };
            const sidebarMenus = document.querySelectorAll('.sidebar .menu-item');
            if(map[tabName] !== undefined && sidebarMenus[map[tabName]]) sidebarMenus[map[tabName]].classList.add('active');

            // Mobile Bottom Nav
            document.querySelectorAll('.bottom-nav .nav-item').forEach(m => m.classList.remove('active'));
            const navMap = { 'overview': 0, 'customers': 1, 'invoice': 2, 'reimburse': 3, 'calculator': 4 };
            const bottomNavs = document.querySelectorAll('.bottom-nav .nav-item');
            if(navMap[tabName] !== undefined && bottomNavs[navMap[tabName]]) bottomNavs[navMap[tabName]].classList.add('active');
            
            window.scrollTo(0,0);
            if(tabName === 'overview') renderCharts();
        }

        auth.onAuthStateChanged((user) => {
            if (user) {
                db.ref('users/' + user.uid).get().then((snapshot) => {
                    const data = snapshot.val();
                    const isFinance = (data.departemen && (data.departemen.includes('Finance') || data.departemen.includes('Accounting') || user.email === 'root@zeppelin.center'));
                    
                    if(isFinance) {
                        document.getElementById('user-display').textContent = (data.nama || "Finance Officer").split(' ')[0]; // Ambil nama depan saja biar rapi di HP
                        document.getElementById('loading-screen').classList.add('fade-out');
                        initData();
                    } else {
                        alert("Akses Terbatas.");
                        window.location.href = 'dashboard.html';
                    }
                });
            } else {
                window.location.href = 'login.html';
            }
        });

        function initData() {
            const promises = [
                new Promise(resolve => db.ref('finance_customers').on('value', snap => { customersData = snap.val() || {}; renderCustomerTable(); updateOverview(); resolve(); })),
                new Promise(resolve => db.ref('finance_invoices').on('value', snap => { invoicesData = snap.val() || {}; renderInvoiceTable(); renderCustomerTable(); updateOverview(); resolve(); })),
                new Promise(resolve => db.ref('finance_reimbursement').on('value', snap => { reimburseData = snap.val() || {}; renderReimburseTable(); resolve(); })),
                new Promise(resolve => db.ref('finance_pettycash').on('value', snap => { pettyCashData = snap.val() || {}; updateOverview(); renderCharts(); resolve(); }))
            ];
        }

        function renderCustomerTable() {
            const tbody = document.getElementById('customer-table');
            tbody.innerHTML = '';
            
            if(Object.keys(customersData).length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" align="center" style="padding: 20px;">Belum ada data pelanggan.</td></tr>';
                return;
            }

            Object.keys(customersData).forEach(key => {
                const c = customersData[key];
                let totalPurchase = 0;
                Object.values(invoicesData).forEach(inv => {
                    if(inv.customerId === key) totalPurchase += parseInt(inv.amount || 0);
                });

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:600; color:#0f172a;">${c.name}</td>
                    <td>
                        <div style="font-weight:600; font-size:0.85rem;">${c.pic || '-'}</div>
                    </td>
                    <td style="font-family:monospace; color:#64748b;">${c.npwp || '-'}</td>
                    <td style="color:#0f172a; font-weight:700;">${formatRupiah(totalPurchase)}</td>
                    <td style="text-align:right;">
                        <button onclick="openModal('customer', '${key}')" style="color:var(--info-blue); border:none; background:#eff6ff; border-radius:6px; cursor:pointer; padding:6px 10px; margin-right:5px;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="deleteCustomer('${key}')" style="color:#ef4444; border:none; background:#fef2f2; border-radius:6px; cursor:pointer; padding:6px 10px;"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderInvoiceTable() {
            const tbody = document.getElementById('invoice-table');
            tbody.innerHTML = '';
            
            if(Object.keys(invoicesData).length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" align="center" style="padding: 20px;">Tidak ada invoice aktif.</td></tr>';
                return;
            }

            const sortedKeys = Object.keys(invoicesData).sort((a,b) => new Date(invoicesData[b].timestamp) - new Date(invoicesData[a].timestamp));

            sortedKeys.forEach(key => {
                const item = invoicesData[key];
                const custName = customersData[item.customerId] ? customersData[item.customerId].name : 'Unknown';
                const isPaid = item.status === 'Paid';
                const due = new Date(item.dueDate);
                const diffTime = due - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                let statusHtml = '';
                let actionHtml = '';

                if(isPaid) {
                    statusHtml = `<span class="status-badge badge-paid"><i class="fa-solid fa-check"></i> LUNAS</span>`;
                    actionHtml = `<span style="font-size:0.75rem; color:#10b981; font-weight:600;">${new Date(item.paidDate).toLocaleDateString()}</span>`;
                } else {
                    if(diffDays < 0) {
                        statusHtml = `<span class="status-badge badge-overdue">-${Math.abs(diffDays)} Hr</span>`;
                    } else {
                        statusHtml = `<span style="color:#d97706; font-weight:600; font-size:0.8rem;">${diffDays} Hr Lagi</span>`;
                    }
                    actionHtml = `
                        <button onclick="markInvoicePaid('${key}')" style="color:#059669; border:none; background:#ecfdf5; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:bold; margin-right:5px; font-size:0.8rem;">
                             Bayar
                        </button>
                        <button onclick="deleteInvoice('${key}')" style="color:#ef4444; border:none; background:#fef2f2; padding:6px 10px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    `;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; font-weight:700; color:var(--primary-red); font-size:0.85rem;">${item.no}</td>
                    <td style="font-weight:600;">${custName}</td>
                    <td style="color:#64748b; font-size:0.85rem;">${due.toLocaleDateString('id-ID')}</td>
                    <td style="font-weight:bold; color:#0f172a;">${formatRupiah(parseInt(item.amount))}</td>
                    <td>${statusHtml}</td>
                    <td style="text-align:right;">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderReimburseTable() {
            const tbody = document.getElementById('reimburse-table');
            tbody.innerHTML = '';
            
            if(Object.keys(reimburseData).length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" align="center">Tidak ada pengajuan.</td></tr>';
                return;
            }

            const sortedKeys = Object.keys(reimburseData).sort((a,b) => new Date(reimburseData[b].date) - new Date(reimburseData[a].date));
            sortedKeys.forEach(key => {
                const item = reimburseData[key];
                let badgeClass = 'badge-pending';
                if(item.status === 'Approved') badgeClass = 'badge-approved';
                if(item.status === 'Rejected') badgeClass = 'badge-rejected';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:#64748b; font-size:0.85rem;">${new Date(item.date).toLocaleDateString('id-ID')}</td>
                    <td style="font-weight:600;">${item.employee}</td>
                    <td>${item.desc}</td>
                    <td style="font-weight:bold;">${formatRupiah(parseInt(item.amount))}</td>
                    <td><span class="status-badge ${badgeClass}">${item.status}</span></td>
                    <td style="text-align:right;">
                        ${item.status === 'Pending' ? `
                        <button onclick="approveReim('${key}')" title="Approve" style="color:#16a34a; margin-right:8px; border:none; background:#f0fdf4; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="fa-solid fa-check"></i></button>
                        <button onclick="rejectReim('${key}')" title="Reject" style="color:#dc2626; border:none; background:#fef2f2; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                        ` : '-'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderCharts() {
            renderCashFlowChart();
            renderExpenseChart();
        }

        function renderCashFlowChart() {
            const ctx = document.getElementById('financeChart');
            if(!ctx) return;
            
            let pcIncome = 0;
            let pcExpense = 0;
            let paidInvoiceTotal = 0;

            Object.values(pettyCashData).forEach(item => {
                const amt = parseInt(item.amount || 0);
                if (item.type === 'income') pcIncome += amt;
                else pcExpense += amt;
            });

            Object.values(invoicesData).forEach(inv => {
                if(inv.status === 'Paid') paidInvoiceTotal += parseInt(inv.amount || 0);
            });

            const totalIncome = pcIncome + paidInvoiceTotal;

            if(chartInstance) chartInstance.destroy();

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Pemasukan', 'Pengeluaran'],
                    datasets: [{
                        label: 'Total (Rp)',
                        data: [totalIncome, pcExpense],
                        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(217, 35, 45, 0.8)'],
                        borderRadius: 8,
                        barThickness: 50
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: {size: 10} } },
                        x: { grid: { display: false }, ticks: { font: {size: 11, weight:'bold'} } }
                    }
                }
            });
        }

        function renderExpenseChart() {
            const ctx = document.getElementById('expenseChart');
            if(!ctx) return;

            const categories = {};
            Object.values(pettyCashData).forEach(item => {
                if(item.type === 'expense') {
                    const cat = item.category || 'Lainnya';
                    categories[cat] = (categories[cat] || 0) + parseInt(item.amount || 0);
                }
            });

            const labels = Object.keys(categories);
            const dataVal = Object.values(categories);
            const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280'];

            if(expenseChartInstance) expenseChartInstance.destroy();

            expenseChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.length ? labels : ['Belum ada data'],
                    datasets: [{
                        data: dataVal.length ? dataVal : [1],
                        backgroundColor: dataVal.length ? colors.slice(0, labels.length) : ['#f1f5f9'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { size: 11 } } }
                    },
                    cutout: '70%'
                }
            });
        }

        function updateOverview() {
            let pcIncome = 0;
            let pcExpense = 0;
            Object.values(pettyCashData).forEach(item => {
                const amt = parseInt(item.amount || 0);
                if (item.type === 'income') pcIncome += amt;
                else pcExpense += amt;
            });
            const pcBalance = pcIncome - pcExpense;

            let totalAR = 0;
            let overdueCount = 0;
            const today = new Date();

            Object.values(invoicesData).forEach(inv => {
                if(inv.status !== 'Paid') {
                    totalAR += parseInt(inv.amount || 0);
                    if(new Date(inv.dueDate) < today) overdueCount++;
                }
            });

            document.getElementById('pc-balance').textContent = formatRupiah(pcBalance);
            document.getElementById('ov-total-ar').textContent = formatRupiah(totalAR);
            document.getElementById('ov-overdue-count').textContent = overdueCount;
        }

        function saveTopUp() {
            const date = document.getElementById('topup-date').value;
            const amount = document.getElementById('topup-amount').value;
            const desc = document.getElementById('topup-desc').value;

            if(!date || !amount || !desc) return showNotification("Lengkapi data top up", "error");

            const dataObj = { type: 'income', category: 'Top Up Kas', date: date, amount: parseInt(amount), desc: desc };

            db.ref('finance_pettycash').push(dataObj).then(() => {
                showNotification("Saldo berhasil ditambahkan!");
                closeModals();
            }).catch(err => showNotification("Gagal menyimpan", "error"));
        }

        function saveCustomer() {
            const name = document.getElementById('cust-name').value;
            if(!name) return showNotification("Nama Perusahaan wajib diisi!", "error");
            
            const payload = {
                name: name,
                npwp: document.getElementById('cust-npwp').value || '-',
                pic: document.getElementById('cust-pic').value,
                email: document.getElementById('cust-email').value,
                phone: document.getElementById('cust-phone').value,
                addr: document.getElementById('cust-addr').value
            };

            if (currentEditingId) {
                db.ref('finance_customers/' + currentEditingId).update(payload).then(() => {
                    showNotification("Data diupdate");
                    closeModals();
                });
            } else {
                payload.createdAt = new Date().toISOString();
                db.ref('finance_customers').push(payload).then(() => {
                    showNotification("Pelanggan ditambahkan");
                    closeModals();
                });
            }
        }

        function deleteCustomer(id) {
            if(confirm("Hapus data pelanggan ini?")) {
                db.ref('finance_customers/'+id).remove().then(() => showNotification("Pelanggan dihapus"));
            }
        }

        function updateCustomerDropdown() {
            const select = document.getElementById('inv-cust-select');
            select.innerHTML = '<option value="">-- Pilih Customer --</option>';
            Object.keys(customersData).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = customersData[key].name;
                select.appendChild(option);
            });
        }

        function saveInvoice() {
            const no = document.getElementById('inv-no').value;
            const custId = document.getElementById('inv-cust-select').value;
            const amt = document.getElementById('inv-amount').value;
            
            if(!no || !custId || !amt) return showNotification("Lengkapi data invoice", "error");

            const newInv = {
                no: no, customerId: custId, dueDate: document.getElementById('inv-date').value,
                amount: amt, status: 'Unpaid', timestamp: new Date().toISOString()
            };

            db.ref('finance_invoices').push(newInv).then(() => {
                showNotification("Invoice diterbitkan");
                closeModals();
                document.getElementById('inv-no').value = '';
                document.getElementById('inv-amount').value = '';
            });
        }

        function markInvoicePaid(id) {
            if(confirm("Konfirmasi pembayaran invoice ini diterima?")) {
                db.ref('finance_invoices/'+id).update({ status: 'Paid', paidDate: new Date().toISOString() })
                .then(() => showNotification("Pembayaran dicatat", "success"));
            }
        }

        function deleteInvoice(id) {
            if(confirm("Hapus invoice ini?")) {
                db.ref('finance_invoices/'+id).remove().then(() => showNotification("Invoice dihapus"));
            }
        }

        function saveReimburse() {
            const name = document.getElementById('reim-name').value;
            const amt = document.getElementById('reim-amount').value;
            if(!name || !amt) return showNotification("Data klaim tidak lengkap", "error");

            db.ref('finance_reimbursement').push({
                employee: name, desc: document.getElementById('reim-desc').value,
                amount: amt, date: new Date().toISOString(), status: 'Pending'
            }).then(() => {
                showNotification("Klaim diajukan");
                closeModals();
                document.getElementById('reim-name').value = '';
                document.getElementById('reim-amount').value = '';
            });
        }

        function approveReim(id) { 
            db.ref('finance_reimbursement/'+id).update({status: 'Approved'}).then(() => showNotification("Klaim disetujui")); 
        }
        function rejectReim(id) { 
            db.ref('finance_reimbursement/'+id).update({status: 'Rejected'}).then(() => showNotification("Klaim ditolak", "error")); 
        }

        function calculateTax() {
            const base = parseFloat(document.getElementById('calc-base').value) || 0;
            const isInc = document.getElementById('calc-include-ppn').checked;
            let dpp, ppn, total;

            if(isInc) {
                dpp = base / 1.11; ppn = base - dpp; total = base;
            } else {
                dpp = base; ppn = base * 0.11; total = base + ppn;
            }
            document.getElementById('res-dpp').textContent = formatRupiah(dpp);
            document.getElementById('res-ppn').textContent = formatRupiah(ppn);
            document.getElementById('res-total').textContent = formatRupiah(total);
        }

        function downloadExcel(type) {
            let data = [];
            let name = "";
            const todayStr = new Date().toISOString().split('T')[0];

            if(type === 'customer') {
                name = "Database_Pelanggan_" + todayStr;
                Object.values(customersData).forEach(c => data.push({ "Nama Perusahaan": c.name, "NPWP": c.npwp, "PIC": c.pic, "Email": c.email, "Telepon": c.phone, "Alamat": c.addr }));
            } else if(type === 'invoice') {
                name = "Laporan_Invoice_" + todayStr;
                Object.values(invoicesData).forEach(i => {
                    const cName = customersData[i.customerId] ? customersData[i.customerId].name : '-';
                    data.push({ "No Invoice": i.no, "Customer": cName, "Tgl Jatuh Tempo": i.dueDate, "Nominal": parseInt(i.amount), "Status": i.status === 'Paid' ? 'Lunas' : 'Belum Lunas' });
                });
            } else if(type === 'reimburse') {
                name = "Laporan_Reimburse_" + todayStr;
                Object.values(reimburseData).forEach(r => data.push({ "Tanggal": r.date.split('T')[0], "Karyawan": r.employee, "Keperluan": r.desc, "Nominal": parseInt(r.amount), "Status": r.status }));
            }

            if(data.length === 0) return showNotification("Tidak ada data", "error");
            
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, name+".xlsx");
            showNotification("Download dimulai...");
        }
