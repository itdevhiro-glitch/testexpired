// Extracted from mark.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getDatabase, ref, onValue, update, push, remove, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
        let selectedId = null;
        let transType = 'OUT';
        let currentPage = 1;
        let pageSize = 10;
        let lastFiltered = [];
        let chooserType = 'OUT';

        onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = ref(db, 'users/' + user.uid);
                get(userRef).then((snap) => {
                    const u = snap.val();
                    const isAllowed = u && (u.departemen === 'Marketing' || u.departemen === 'Pemasaran' || user.email === 'root@zeppelin.center');
                    
                    if (isAllowed) {
                        document.getElementById('loading-screen').classList.add('hidden');
                        document.getElementById('main-content').style.display = 'block';
                        initApp();
                    } else {
                        alert("AKSES DITOLAK: Halaman ini khusus Departemen Marketing!");
                        window.location.replace('dashboard.html');
                    }
                }).catch(() => {
                    window.location.replace('login.html');
                });
            } else {
                window.location.replace('login.html');
            }
        });

        function initApp() {
            const dbRef = ref(db, 'marketing_inventory');
            onValue(dbRef, (snap) => {
                document.getElementById('inventoryLoader').classList.add('hidden');
                allData = [];
                const val = snap.val();
                if (val) {
                    for (let key in val) {
                        allData.push({ id: key, ...val[key] });
                    }
                }
                updateStats();
                renderList();
            });

            document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; renderList(); });
            document.getElementById('filterCategory').addEventListener('change', () => { currentPage = 1; renderList(); });
            document.getElementById('filterLocation').addEventListener('change', () => { currentPage = 1; renderList(); });
            document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 1; renderList(); });
            document.getElementById('resetFilter').addEventListener('click', () => {
                document.getElementById('searchInput').value = '';
                document.getElementById('filterCategory').value = 'All';
                document.getElementById('filterLocation').value = 'All';
                document.getElementById('filterStatus').value = 'All';
                currentPage = 1;
                renderList();
            });
            const ps = document.getElementById('pageSize');
            if (ps) ps.addEventListener('change', () => { pageSize = Number(ps.value || 10); currentPage = 1; renderList(); });
            const chs = document.getElementById('chooserSearch');
            if (chs) chs.addEventListener('input', renderChooserList);
            const menu = document.getElementById('zMenuBtn');
            if (menu) menu.addEventListener('click', () => document.querySelector('.z-sidebar').classList.toggle('open')); 
        }

        function getIcon(cat) {
            const icons = {
                'Kartu Nama': 'fa-solid fa-id-card',
                'Cetak': 'fa-solid fa-print',
                'Merchandise': 'fa-solid fa-gift',
                'Display': 'fa-solid fa-store',
                'Elektronik': 'fa-solid fa-plug',
                'Seragam': 'fa-solid fa-shirt',
                'Stationery': 'fa-solid fa-pen-ruler',
                'Event': 'fa-solid fa-calendar-star',
                'Lainnya': 'fa-solid fa-box-open'
            };
            return icons[cat] || 'fa-solid fa-box';
        }

        function getStatus(item) {
            const stok = Number(item.stok || 0);
            if (stok <= 0) return { key: 'empty', label: 'Habis', cls: 'status-empty' };
            if (stok < 10) return { key: 'low', label: 'Stok Rendah', cls: 'status-low' };
            return { key: 'ok', label: 'Tersedia', cls: 'status-ok' };
        }

        function safeText(v) {
            return String(v ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
        }

        function getFilteredData() {
            const search = document.getElementById('searchInput').value.toLowerCase().trim();
            const filter = document.getElementById('filterCategory').value;
            const locFilter = document.getElementById('filterLocation').value;
            const statusFilter = document.getElementById('filterStatus').value;
            return allData.filter(item => {
                const status = getStatus(item).key;
                const matchSearch = !search || (item.nama || '').toLowerCase().includes(search) || (item.sku || '').toLowerCase().includes(search) || (item.lokasi || '').toLowerCase().includes(search) || (item.satuan || '').toLowerCase().includes(search);
                const matchFilter = filter === 'All' || item.kategori === filter;
                const matchLoc = locFilter === 'All' || (item.lokasi || '-') === locFilter;
                const matchStatus = statusFilter === 'All' || status === statusFilter;
                return matchSearch && matchFilter && matchLoc && matchStatus;
            });
        }

        function renderList() {
            const listEl = document.getElementById('inventoryList');
            const filtered = getFilteredData();
            lastFiltered = filtered;
            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;
            const startIndex = (currentPage - 1) * pageSize;
            const pageItems = filtered.slice(startIndex, startIndex + pageSize);

            listEl.innerHTML = '';
            if (filtered.length === 0) {
                listEl.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-regular fa-folder-open fa-2x"></i><p>Tidak ada barang ditemukan.</p></div></td></tr>`;
                renderPagination(0, 1);
                return;
            }

            pageItems.forEach((item, index) => {
                const status = getStatus(item);
                const unit = item.satuan || 'Pcs';
                const sku = item.sku || `BRG-${String(startIndex + index + 1).padStart(4, '0')}`;
                listEl.innerHTML += `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td>${safeText(sku)}</td>
                        <td>${safeText(item.nama || '-')}</td>
                        <td>${safeText(item.kategori || '-')}</td>
                        <td>${safeText(item.lokasi || '-')}</td>
                        <td>${Number(item.stok || 0).toLocaleString('id-ID')}</td>
                        <td>${safeText(unit)}</td>
                        <td><span class="status-pill ${status.cls}">${status.label}</span></td>
                        <td>
                            <div class="action-row">
                                <button type="button" class="icon-btn view" title="Riwayat" onclick="window.openHistory('${item.id}')"><i class="fa-regular fa-eye"></i></button>
                                <button type="button" class="icon-btn edit" title="Edit" onclick="window.openManage('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                                <button type="button" class="icon-btn" title="Stok Masuk" onclick="window.openTrans('${item.id}','IN')"><i class="fa-solid fa-plus"></i></button>
                                <button type="button" class="icon-btn" title="Stok Keluar" onclick="window.openTrans('${item.id}','OUT')"><i class="fa-solid fa-minus"></i></button>
                                <button type="button" class="icon-btn delete" title="Hapus" onclick="window.confirmDelete('${item.id}')"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            renderPagination(filtered.length, totalPages);
        }

        function renderPagination(total, totalPages) {
            const holder = document.getElementById('paginationButtons');
            if (!holder) return;
            const mk = (label, page, disabled = false, active = false) => `<button type="button" ${disabled ? 'disabled' : ''} class="${active ? 'active' : ''}" onclick="window.goPage(${page})">${label}</button>`;
            let html = mk('‹', Math.max(1, currentPage - 1), currentPage <= 1);
            const pages = [];
            for (let p = 1; p <= totalPages; p++) {
                if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pages.push(p);
            }
            let prev = 0;
            pages.forEach(p => {
                if (prev && p - prev > 1) html += `<button type="button" disabled>…</button>`;
                html += mk(p, p, false, p === currentPage);
                prev = p;
            });
            html += mk('›', Math.min(totalPages, currentPage + 1), currentPage >= totalPages);
            holder.innerHTML = html;
        }

        window.goPage = (page) => { currentPage = page; renderList(); };

        function updateStats() {
            const total = allData.length;
            const stock = allData.reduce((a, b) => a + Number(b.stok || 0), 0);
            const low = allData.filter(i => Number(i.stok || 0) > 0 && Number(i.stok || 0) < 10).length;
            const empty = allData.filter(i => Number(i.stok || 0) <= 0).length;
            const categories = new Set(allData.map(i => i.kategori).filter(Boolean));
            const locations = [...new Set(allData.map(i => i.lokasi || '-').filter(Boolean))].sort();
            const locSelect = document.getElementById('filterLocation');
            const currentLoc = locSelect.value || 'All';
            locSelect.innerHTML = '<option value="All">Semua Lokasi</option>' + locations.map(l => `<option value="${l}">${l}</option>`).join('');
            if ([...locSelect.options].some(o => o.value === currentLoc)) locSelect.value = currentLoc;
            document.getElementById('statItems').innerText = total.toLocaleString('id-ID');
            document.getElementById('statStock').innerText = stock.toLocaleString('id-ID');
            document.getElementById('statLow').innerText = low.toLocaleString('id-ID');
            document.getElementById('statEmpty').innerText = empty.toLocaleString('id-ID');
            document.getElementById('statCategory').innerText = categories.size.toLocaleString('id-ID');
            document.getElementById('statLocation').innerText = locations.filter(l => l !== '-').length.toLocaleString('id-ID');
        }

        window.openManageModal = () => window.openManage();

        window.openManage = (id = null) => {
            selectedId = id;
            const delBtn = document.getElementById('btnDelete');
            
            if (id) {
                const item = allData.find(i => i.id === id);
                document.getElementById('manageTitle').innerText = "Edit Barang";
                document.getElementById('itemName').value = item.nama;
                document.getElementById('itemCat').value = item.kategori;
                document.getElementById('itemSku').value = item.sku || '';
                document.getElementById('itemLoc').value = item.lokasi || '';
                document.getElementById('itemStock').value = item.stok;
                document.getElementById('itemStock').disabled = true;
                document.getElementById('itemUnit').value = item.satuan || 'Pcs';
                delBtn.style.display = 'block';
            } else {
                document.getElementById('manageTitle').innerText = "Tambah Barang";
                document.getElementById('itemName').value = '';
                document.getElementById('itemCat').value = 'Kartu Nama';
                document.getElementById('itemSku').value = '';
                document.getElementById('itemLoc').value = '';
                document.getElementById('itemStock').value = 0;
                document.getElementById('itemStock').disabled = false;
                document.getElementById('itemUnit').value = 'Pcs';
                delBtn.style.display = 'none';
            }
            openModal('modalManage');
        };

        window.saveItem = () => {
            const nama = document.getElementById('itemName').value;
            const kat = document.getElementById('itemCat').value;
            const satuan = document.getElementById('itemUnit').value;
            
            if (!nama) return showToast("Nama barang wajib diisi!", true);

            const data = {
                nama: nama,
                kategori: kat,
                satuan: satuan,
                sku: document.getElementById('itemSku').value.toUpperCase(),
                lokasi: document.getElementById('itemLoc').value,
                icon: getIcon(kat)
            };

            if (selectedId) {
                update(ref(db, 'marketing_inventory/' + selectedId), data)
                    .then(() => { showToast("Barang diupdate!"); closeModals(); });
            } else {
                data.stok = Number(document.getElementById('itemStock').value);
                push(ref(db, 'marketing_inventory'), data)
                    .then(() => { showToast("Barang ditambahkan!"); closeModals(); });
            }
        };

        window.deleteItem = () => {
            if (!selectedId) return;
            window.confirmDelete(selectedId);
        };

        window.confirmDelete = (id) => {
            const item = allData.find(i => i.id === id);
            if (!item) return showToast('Barang tidak ditemukan', true);
            if (confirm(`Hapus barang "${item.nama || '-'}" secara permanen?`)) {
                remove(ref(db, 'marketing_inventory/' + id))
                    .then(() => { showToast('Barang dihapus!'); closeModals(); });
            }
        };

        window.openHistory = (id) => {
            const item = allData.find(i => i.id === id);
            if(!item) return;

            document.getElementById('histItemName').innerText = item.nama;
            document.getElementById('histItemSku').innerText = item.sku || 'Tanpa SKU';
            
            const listContainer = document.getElementById('historyListContainer');
            const loader = document.getElementById('historyLoader');
            
            listContainer.innerHTML = '';
            loader.classList.remove('hidden');
            openModal('modalHistory');

            const logsRef = query(ref(db, 'marketing_transactions'), orderByChild('itemId'), equalTo(id));
            
            get(logsRef).then((snapshot) => {
                loader.classList.add('hidden');
                if (snapshot.exists()) {
                    const logs = [];
                    snapshot.forEach(child => {
                        logs.push(child.val());
                    });

                    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

                    logs.forEach(log => {
                        const dateObj = new Date(log.date);
                        const dateStr = dateObj.toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', 
                            hour: '2-digit', minute:'2-digit'
                        });
                        
                        const isIn = log.type === 'IN';
                        const badgeClass = isIn ? 'h-in' : 'h-out';
                        const typeLabel = isIn ? 'Restock' : 'Keluar';
                        const icon = isIn ? 'fa-arrow-down' : 'fa-arrow-up';
                        const u = log.unit || 'Unit';

                        listContainer.innerHTML += `
                            <div class="history-item">
                                <div style="display:flex; flex-direction:column; align-items:center; gap:5px; min-width:40px;">
                                    <div style="width:30px; height:30px; border-radius:50%; background:${isIn ? '#ecfdf5' : '#fff7ed'}; display:flex; align-items:center; justify-content:center; color:${isIn ? '#10b981' : '#f97316'}; font-size:12px;">
                                        <i class="fa-solid ${icon}"></i>
                                    </div>
                                </div>
                                <div class="history-content">
                                    <div style="display:flex; justify-content:space-between;">
                                        <h5 class="history-title">${log.qty} ${u} <span class="history-badge ${badgeClass}">${typeLabel}</span></h5>
                                        <span class="history-date">${dateStr}</span>
                                    </div>
                                    <p class="history-note">"${log.note || '-'}"</p>
                                    <span class="history-user">Oleh: ${log.user}</span>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    listContainer.innerHTML = `<p style="text-align:center; font-size:13px; color:var(--gray); padding:20px;">Belum ada riwayat transaksi untuk barang ini.</p>`;
                }
            });
        };

        window.openTrans = (id, type) => {
            selectedId = id;
            const item = allData.find(i => i.id === id);
            document.getElementById('transItemInfo').innerText = `${item.nama} (Stok: ${item.stok} ${item.satuan || 'Pcs'})`;
            document.getElementById('transQty').value = '';
            document.getElementById('transNote').value = '';
            document.getElementById('transUnit').value = item.satuan || 'Pcs';
            setTransType(type);
            closeModals();
            openModal('modalTrans');
        };

        window.setTransType = (type) => {
            transType = type;
            const outBtn = document.getElementById('optOut');
            const inBtn = document.getElementById('optIn');
            
            if (type === 'IN') {
                inBtn.classList.add('active-in');
                outBtn.classList.remove('active-out');
            } else {
                outBtn.classList.add('active-out');
                inBtn.classList.remove('active-in');
            }
        };

        window.processTransaction = () => {
            const qty = Number(document.getElementById('transQty').value);
            const note = document.getElementById('transNote').value;
            const tUnit = document.getElementById('transUnit').value;
            const item = allData.find(i => i.id === selectedId);

            if (qty <= 0) return showToast("Jumlah tidak valid", true);
            if (transType === 'OUT' && qty > item.stok) return showToast("Stok tidak cukup!", true);
            if (!note) return showToast("Catatan wajib diisi!", true);

            const currentStock = Number(item.stok || 0);
            const newStok = transType === 'IN' ? (currentStock + qty) : (currentStock - qty);
            
            const updates = {};
            updates['marketing_inventory/' + selectedId + '/stok'] = newStok;
            
            const logId = push(ref(db, 'marketing_transactions')).key;
            updates['marketing_transactions/' + logId] = {
                itemId: selectedId,
                itemName: item.nama,
                type: transType,
                qty: qty,
                unit: tUnit,
                note: note,
                user: auth.currentUser.email,
                date: new Date().toISOString()
            };

            update(ref(db), updates).then(() => {
                showToast("Transaksi Berhasil!");
                closeModals();
            });
        };

        window.openFilterPanel = () => {
            const panel = document.querySelector('.z-toolbar');
            if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                panel.style.boxShadow = '0 0 0 3px rgba(239,31,37,.12)';
                setTimeout(() => panel.style.boxShadow = '', 900);
            }
            const input = document.getElementById('searchInput');
            if (input) setTimeout(() => input.focus(), 350);
        };

        window.quickFilter = (type) => {
            closeMobileSidebar();
            if (type === 'category') return document.getElementById('filterCategory').focus();
            if (type === 'location' || type === 'rack') return document.getElementById('filterLocation').focus();
            if (type === 'unit') return showInfo('Daftar Satuan', [...new Set(allData.map(i => i.satuan || 'Pcs'))].map(u => `<div class="history-item"><b>${safeText(u)}</b></div>`).join('') || '<p>Belum ada data satuan.</p>');
        };

        window.openMasterInfo = (title) => {
            closeMobileSidebar();
            showInfo(title, `<p style="margin-top:0;color:#64748b">Field ${title} belum ada di struktur data Z-MARK saat ini. Tombol ini tidak lagi mati: dipakai sebagai informasi master, dan bisa dikembangkan menjadi CRUD kalau field ${title} sudah ditambahkan.</p>`);
        };

        function showInfo(title, html) {
            document.getElementById('infoTitle').innerText = title;
            document.getElementById('infoBody').innerHTML = html;
            openModal('modalInfo');
        }

        function closeMobileSidebar(){ const side = document.querySelector('.z-sidebar'); if(side) side.classList.remove('open'); }

        window.openTransactionChooser = (type) => {
            chooserType = type;
            document.getElementById('chooserTitle').innerText = type === 'IN' ? 'Penerimaan / Stok Masuk' : 'Pengeluaran / Stok Keluar';
            document.getElementById('chooserSearch').value = '';
            renderChooserList();
            openModal('modalItemChooser');
            closeMobileSidebar();
        };

        function renderChooserList() {
            const el = document.getElementById('chooserList');
            if (!el) return;
            const q = (document.getElementById('chooserSearch')?.value || '').toLowerCase();
            const rows = allData.filter(i => !q || (i.nama||'').toLowerCase().includes(q) || (i.sku||'').toLowerCase().includes(q) || (i.lokasi||'').toLowerCase().includes(q)).slice(0, 60);
            if (!rows.length) { el.innerHTML = '<p style="text-align:center;color:#64748b">Barang tidak ditemukan.</p>'; return; }
            el.innerHTML = rows.map(i => `
                <button type="button" class="history-item" style="width:100%;text-align:left;cursor:pointer" onclick="window.openTrans('${i.id}','${chooserType}')">
                    <div class="history-content" style="width:100%">
                        <div style="display:flex;justify-content:space-between;gap:10px"><b>${safeText(i.nama || '-')}</b><span class="status-pill ${getStatus(i).cls}">${getStatus(i).label}</span></div>
                        <p class="history-note">${safeText(i.sku || 'Tanpa SKU')} • ${safeText(i.lokasi || '-')} • Stok ${Number(i.stok||0)} ${safeText(i.satuan || 'Pcs')}</p>
                    </div>
                </button>`).join('');
        }

        window.openAllHistory = async () => {
            closeMobileSidebar();
            document.getElementById('infoTitle').innerText = 'Mutasi / Riwayat Transaksi';
            document.getElementById('infoBody').innerHTML = '<div class="z-loader"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat riwayat...</div>';
            openModal('modalInfo');
            const snap = await get(ref(db, 'marketing_transactions'));
            if (!snap.exists()) { document.getElementById('infoBody').innerHTML = '<p>Belum ada mutasi.</p>'; return; }
            const logs = [];
            snap.forEach(c => logs.push(c.val()));
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));
            document.getElementById('infoBody').innerHTML = logs.slice(0,100).map(log => {
                const d = new Date(log.date).toLocaleString('id-ID');
                const inOut = log.type === 'IN' ? 'Masuk' : 'Keluar';
                return `<div class="history-item"><div class="history-content"><h5 class="history-title">${safeText(log.itemName || '-')} - ${inOut} ${Number(log.qty||0)} ${safeText(log.unit || '')}</h5><p class="history-note">${safeText(log.note || '-')}</p><span class="history-date">${d} • ${safeText(log.user || '-')}</span></div></div>`;
            }).join('');
        };

        window.generateReport = async (period) => {
            const loader = document.getElementById('reportLoader');
            loader.style.display = 'block';

            const snap = await get(ref(db, 'marketing_transactions'));
            loader.style.display = 'none';
            closeModals();

            if(!snap.exists()) return showToast("Tidak ada data transaksi", true);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const now = new Date();
            let title = "Laporan Inventaris Marketing";
            
            const logs = [];
            snap.forEach(c => {
                logs.push(c.val());
            });

            const filteredLogs = logs.filter(log => {
                const logDate = new Date(log.date);
                if (period === 'daily') {
                    return logDate.toDateString() === now.toDateString();
                } else if (period === 'monthly') {
                    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
                } else if (period === 'yearly') {
                    return logDate.getFullYear() === now.getFullYear();
                }
                return true;
            });

            if (filteredLogs.length === 0) return showToast("Tidak ada data untuk periode ini", true);

            if (period === 'daily') title += ` (Harian - ${now.toLocaleDateString()})`;
            if (period === 'monthly') title += ` (Bulanan - ${now.toLocaleDateString('id-ID', {month:'long', year:'numeric'})})`;
            if (period === 'yearly') title += ` (Tahunan - ${now.getFullYear()})`;

            doc.setFontSize(16);
            doc.text(title, 14, 20);
            doc.setFontSize(10);
            doc.text(`Dibuat pada: ${now.toLocaleString('id-ID')}`, 14, 28);
            
            doc.text("1. Riwayat Transaksi (In/Out)", 14, 38);

            const tableData = filteredLogs.map(l => [
                new Date(l.date).toLocaleDateString('id-ID'),
                l.itemName,
                l.type === 'IN' ? 'Masuk' : 'Keluar',
                `${l.qty} ${l.unit || ''}`,
                l.note,
                l.user
            ]);

            doc.autoTable({
                startY: 42,
                head: [['Tanggal', 'Barang', 'Tipe', 'Jml', 'Catatan', 'User']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [217, 35, 45] }
            });

            let finalY = doc.lastAutoTable.finalY + 15;
            
            doc.text("2. Ringkasan Stok Tersisa (Semua Barang)", 14, finalY);

            const stockData = allData.map(i => [
                i.nama,
                i.kategori,
                `${i.stok} ${i.satuan || 'Pcs'}`,
                i.lokasi || '-'
            ]);

            doc.autoTable({
                startY: finalY + 4,
                head: [['Nama Barang', 'Kategori', 'Sisa Stok', 'Lokasi']],
                body: stockData,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [40, 40, 40] }
            });

            doc.save(`Laporan_Marketing_${period}_${now.getTime()}.pdf`);
            showToast("PDF Berhasil diunduh");
        };

        // --- FITUR EXCEL (Baru) ---
        window.generateExcel = async (period) => {
            const loader = document.getElementById('reportLoader');
            loader.style.display = 'block';

            // 1. Ambil Data Transaksi
            const snap = await get(ref(db, 'marketing_transactions'));
            loader.style.display = 'none';
            closeModals();

            if(!snap.exists()) return showToast("Tidak ada data transaksi", true);

            const now = new Date();
            const logs = [];
            
            snap.forEach(c => {
                logs.push(c.val());
            });

            // 2. Filter Berdasarkan Periode
            const filteredLogs = logs.filter(log => {
                const logDate = new Date(log.date);
                if (period === 'daily') {
                    return logDate.toDateString() === now.toDateString();
                } else if (period === 'monthly') {
                    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
                } else if (period === 'yearly') {
                    return logDate.getFullYear() === now.getFullYear();
                }
                return true;
            });

            if (filteredLogs.length === 0) return showToast("Tidak ada data untuk periode ini", true);

            // 3. Format Data untuk Excel (Sheet 1: Mutasi)
            const excelDataTrans = filteredLogs.map(l => {
                const d = new Date(l.date);
                // Format YYYY-MM-DD HH:MM agar mudah disortir di Excel
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                
                return {
                    "Tanggal Waktu": dateStr,
                    "Tipe Transaksi": l.type === 'IN' ? 'MASUK (RESTOCK)' : 'KELUAR (PAKAI)',
                    "Nama Barang": l.itemName,
                    "Jumlah": l.qty,
                    "Satuan": l.unit || 'Pcs',
                    "Catatan / Project": l.note || '-',
                    "User Input": l.user
                };
            });

            // 4. Format Data Stok (Sheet 2: Stok Saat Ini)
            const excelDataStock = allData.map(i => {
                return {
                    "SKU": i.sku || '-',
                    "Kategori": i.kategori,
                    "Nama Barang": i.nama,
                    "Sisa Stok": i.stok,
                    "Satuan": i.satuan || 'Pcs',
                    "Lokasi Rak": i.lokasi || '-',
                    "Status": i.stok < 5 ? "MENIPIS" : "AMAN"
                };
            });

            // 5. Buat Workbook Excel
            const wb = XLSX.utils.book_new();
            
            // Sheet 1
            const wsTrans = XLSX.utils.json_to_sheet(excelDataTrans);
            XLSX.utils.book_append_sheet(wb, wsTrans, "Riwayat Transaksi");
            
            // Sheet 2
            const wsStock = XLSX.utils.json_to_sheet(excelDataStock);
            XLSX.utils.book_append_sheet(wb, wsStock, "Stok Saat Ini");

            // 6. Download File
            const fileName = `Laporan_Marketing_${period}_${now.getTime()}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            showToast("Excel Berhasil diunduh!");
        };

        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }
        window.closeModals = () => {
            document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open'));
        };
        
        function showToast(msg, isError = false) {
            const t = document.getElementById('toast');
            document.getElementById('toastMsg').innerText = msg;
            t.className = isError ? 'toast error show' : 'toast show';
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        window.openModal = openModal;
