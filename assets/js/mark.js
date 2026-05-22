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
let filteredData = [];
let selectedId = null;
let transType = 'OUT';
let currentPage = 1;
let pageSize = 10;
let currentUserProfile = null;

const $ = (id) => document.getElementById(id);
const moneyDate = () => new Date().toLocaleString('id-ID');
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

onAuthStateChanged(auth, (user) => {
  if (!user) return window.location.replace('login.html');

  get(ref(db, 'users/' + user.uid)).then((snap) => {
    const u = snap.val() || {};
    currentUserProfile = u;
    const dept = String(u.departemen || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    const isAllowed = dept === 'marketing' || dept === 'pemasaran' || role === 'admin' || user.email === 'root@zeppelin.center';

    if (!isAllowed) {
      alert('AKSES DITOLAK: Halaman ini khusus Departemen Marketing!');
      return window.location.replace('dashboard.html');
    }

    $('zUserName') && ($('zUserName').innerText = u.nama || user.email || 'Admin Zmark');
    $('zUserRole') && ($('zUserRole').innerText = u.departemen || 'Marketing');
    $('loading-screen').classList.add('hidden');
    $('main-content').style.display = 'block';
    initApp();
  }).catch(() => window.location.replace('login.html'));
});

function initApp() {
  onValue(ref(db, 'marketing_inventory'), (snap) => {
    $('inventoryLoader').classList.add('hidden');
    allData = [];
    snap.forEach((child) => allData.push({ id: child.key, ...child.val() }));
    allData.sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));
    updateStats();
    renderList(true);
  }, () => {
    $('inventoryLoader').classList.add('hidden');
    showToast('Gagal memuat data inventory. Cek rules Firebase.', true);
  });

  ['searchInput', 'filterCategory', 'filterLocation', 'filterStatus'].forEach(id => {
    $(id)?.addEventListener('input', () => renderList(true));
    $(id)?.addEventListener('change', () => renderList(true));
  });
  $('resetFilter')?.addEventListener('click', resetFilters);
  $('pageSizeSelect')?.addEventListener('change', (e) => {
    pageSize = Number(e.target.value || 10);
    currentPage = 1;
    renderList(false);
  });
  $('zMenuBtn')?.addEventListener('click', () => document.querySelector('.z-sidebar')?.classList.toggle('open'));
  document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', (e) => { if (e.target === el) closeModals(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
}

function resetFilters() {
  $('searchInput').value = '';
  $('filterCategory').value = 'All';
  $('filterLocation').value = 'All';
  $('filterStatus').value = 'All';
  renderList(true);
}

function getIcon(cat) {
  return ({
    'Kartu Nama': 'fa-solid fa-id-card', 'Cetak': 'fa-solid fa-print', 'Merchandise': 'fa-solid fa-gift',
    'Display': 'fa-solid fa-store', 'Elektronik': 'fa-solid fa-plug', 'Seragam': 'fa-solid fa-shirt',
    'Stationery': 'fa-solid fa-pen-ruler', 'Event': 'fa-solid fa-calendar-star', 'Lainnya': 'fa-solid fa-box-open'
  })[cat] || 'fa-solid fa-box';
}

function getStatus(item) {
  const stok = Number(item.stok || 0);
  if (stok <= 0) return { key: 'empty', label: 'Habis', cls: 'status-empty' };
  if (stok < 10) return { key: 'low', label: 'Stok Rendah', cls: 'status-low' };
  return { key: 'ok', label: 'Tersedia', cls: 'status-ok' };
}

function getFilteredData() {
  const search = $('searchInput').value.toLowerCase().trim();
  const filter = $('filterCategory').value;
  const locFilter = $('filterLocation').value;
  const statusFilter = $('filterStatus').value;
  return allData.filter(item => {
    const status = getStatus(item).key;
    const searchPool = `${item.nama || ''} ${item.sku || ''} ${item.lokasi || ''} ${item.kategori || ''}`.toLowerCase();
    return (!search || searchPool.includes(search)) &&
      (filter === 'All' || item.kategori === filter) &&
      (locFilter === 'All' || (item.lokasi || '-') === locFilter) &&
      (statusFilter === 'All' || status === statusFilter);
  });
}

function renderList(resetPage = false) {
  if (resetPage) currentPage = 1;
  filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredData.slice(start, start + pageSize);
  const listEl = $('inventoryList');
  listEl.innerHTML = '';

  if (pageItems.length === 0) {
    listEl.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-regular fa-folder-open fa-2x"></i><p>Tidak ada barang ditemukan.</p></div></td></tr>`;
    renderPagination();
    return;
  }

  listEl.innerHTML = pageItems.map((item, i) => {
    const status = getStatus(item);
    const unit = item.satuan || 'Pcs';
    const sku = item.sku || `BRG-${String(start + i + 1).padStart(4, '0')}`;
    return `<tr>
      <td>${start + i + 1}</td>
      <td>${esc(sku)}</td>
      <td><b>${esc(item.nama || '-')}</b></td>
      <td>${esc(item.kategori || '-')}</td>
      <td>${esc(item.lokasi || '-')}</td>
      <td><b>${Number(item.stok || 0).toLocaleString('id-ID')}</b></td>
      <td>${esc(unit)}</td>
      <td><span class="status-pill ${status.cls}">${status.label}</span></td>
      <td><div class="action-row">
        <button class="icon-btn view" title="Riwayat" onclick="window.openHistory('${item.id}')"><i class="fa-regular fa-eye"></i></button>
        <button class="icon-btn" title="Stok Masuk" onclick="window.openTrans('${item.id}','IN')"><i class="fa-solid fa-plus"></i></button>
        <button class="icon-btn" title="Stok Keluar" onclick="window.openTrans('${item.id}','OUT')"><i class="fa-solid fa-minus"></i></button>
        <button class="icon-btn edit" title="Edit" onclick="window.openManage('${item.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete" title="Hapus" onclick="window.confirmDelete('${item.id}')"><i class="fa-regular fa-trash-can"></i></button>
      </div></td>
    </tr>`;
  }).join('');
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const box = $('paginationButtons');
  if (!box) return;
  const pages = [];
  const addPage = (p) => pages.push(`<button class="${p === currentPage ? 'active' : ''}" onclick="window.goZPage(${p})">${p}</button>`);
  pages.push(`<button ${currentPage <= 1 ? 'disabled' : ''} onclick="window.goZPage(${currentPage - 1})">‹</button>`);
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  if (start > 1) addPage(1);
  if (start > 2) pages.push(`<button disabled>…</button>`);
  for (let p = start; p <= end; p++) addPage(p);
  if (end < totalPages - 1) pages.push(`<button disabled>…</button>`);
  if (end < totalPages) addPage(totalPages);
  pages.push(`<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.goZPage(${currentPage + 1})">›</button>`);
  box.innerHTML = pages.join('');
}

window.goZPage = (page) => { currentPage = page; renderList(false); };

function updateStats() {
  const total = allData.length;
  const stock = allData.reduce((a, b) => a + Number(b.stok || 0), 0);
  const low = allData.filter(i => Number(i.stok || 0) > 0 && Number(i.stok || 0) < 10).length;
  const empty = allData.filter(i => Number(i.stok || 0) <= 0).length;
  const categories = new Set(allData.map(i => i.kategori).filter(Boolean));
  const locations = [...new Set(allData.map(i => i.lokasi || '-').filter(Boolean))].sort();
  const locSelect = $('filterLocation');
  const currentLoc = locSelect?.value || 'All';
  if (locSelect) {
    locSelect.innerHTML = '<option value="All">Semua Lokasi</option>' + locations.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    if ([...locSelect.options].some(o => o.value === currentLoc)) locSelect.value = currentLoc;
  }
  $('statItems').innerText = total.toLocaleString('id-ID');
  $('statStock').innerText = stock.toLocaleString('id-ID');
  $('statLow').innerText = low.toLocaleString('id-ID');
  $('statEmpty').innerText = empty.toLocaleString('id-ID');
  $('statCategory').innerText = categories.size.toLocaleString('id-ID');
  $('statLocation').innerText = locations.filter(l => l !== '-').length.toLocaleString('id-ID');
  $('notifCount') && ($('notifCount').innerText = String(low + empty));
}

window.openManageModal = () => window.openManage();
window.openManage = (id = null) => {
  selectedId = id;
  const delBtn = $('btnDelete');
  if (id) {
    const item = allData.find(i => i.id === id);
    if (!item) return showToast('Barang tidak ditemukan', true);
    $('manageTitle').innerText = 'Edit Barang';
    $('itemName').value = item.nama || '';
    $('itemCat').value = item.kategori || 'Lainnya';
    $('itemSku').value = item.sku || '';
    $('itemLoc').value = item.lokasi || '';
    $('itemStock').value = Number(item.stok || 0);
    $('itemStock').disabled = true;
    $('itemUnit').value = item.satuan || 'Pcs';
    delBtn.style.display = 'block';
  } else {
    $('manageTitle').innerText = 'Tambah Barang';
    ['itemName','itemSku','itemLoc'].forEach(id => $(id).value = '');
    $('itemCat').value = 'Kartu Nama';
    $('itemStock').value = 0;
    $('itemStock').disabled = false;
    $('itemUnit').value = 'Pcs';
    delBtn.style.display = 'none';
  }
  openModal('modalManage');
};

window.saveItem = () => {
  const nama = $('itemName').value.trim();
  const kat = $('itemCat').value;
  const stok = Number($('itemStock').value || 0);
  if (!nama) return showToast('Nama barang wajib diisi!', true);
  if (!selectedId && stok < 0) return showToast('Stok awal tidak boleh minus', true);
  const data = {
    nama,
    kategori: kat,
    satuan: $('itemUnit').value,
    sku: $('itemSku').value.trim().toUpperCase(),
    lokasi: $('itemLoc').value.trim(),
    icon: getIcon(kat),
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || '-'
  };
  const task = selectedId ? update(ref(db, 'marketing_inventory/' + selectedId), data) : push(ref(db, 'marketing_inventory'), { ...data, stok, createdAt: new Date().toISOString() });
  task.then(() => { showToast(selectedId ? 'Barang berhasil diupdate!' : 'Barang berhasil ditambahkan!'); closeModals(); })
      .catch(() => showToast('Gagal menyimpan data. Cek koneksi/rules.', true));
};

window.confirmDelete = (id) => { selectedId = id; window.deleteItem(); };
window.deleteItem = () => {
  const item = allData.find(i => i.id === selectedId);
  if (!item) return showToast('Barang tidak ditemukan', true);
  if (confirm(`Hapus barang "${item.nama}" secara permanen?`)) {
    remove(ref(db, 'marketing_inventory/' + selectedId))
      .then(() => { showToast('Barang dihapus!'); closeModals(); })
      .catch(() => showToast('Gagal menghapus data.', true));
  }
};

window.openTrans = (id, type = 'OUT') => {
  selectedId = id;
  const item = allData.find(i => i.id === id);
  if (!item) return showToast('Barang tidak ditemukan', true);
  $('transItemInfo').innerText = `${item.nama} (Stok: ${Number(item.stok || 0).toLocaleString('id-ID')} ${item.satuan || 'Pcs'})`;
  $('transQty').value = '';
  $('transNote').value = '';
  $('transUnit').value = item.satuan || 'Pcs';
  setTransType(type);
  openModal('modalTrans');
};

window.setTransType = setTransType;
function setTransType(type) {
  transType = type;
  const outBtn = $('optOut');
  const inBtn = $('optIn');
  inBtn.classList.toggle('active-in', type === 'IN');
  outBtn.classList.toggle('active-out', type !== 'IN');
}

window.processTransaction = () => {
  const qty = Number($('transQty').value || 0);
  const note = $('transNote').value.trim();
  const tUnit = $('transUnit').value;
  const item = allData.find(i => i.id === selectedId);
  if (!item) return showToast('Barang tidak ditemukan', true);
  if (qty <= 0) return showToast('Jumlah tidak valid', true);
  if (transType === 'OUT' && qty > Number(item.stok || 0)) return showToast('Stok tidak cukup!', true);
  if (!note) return showToast('Catatan wajib diisi!', true);
  const newStok = transType === 'IN' ? Number(item.stok || 0) + qty : Number(item.stok || 0) - qty;
  const logId = push(ref(db, 'marketing_transactions')).key;
  const updates = {};
  updates[`marketing_inventory/${selectedId}/stok`] = newStok;
  updates[`marketing_inventory/${selectedId}/updatedAt`] = new Date().toISOString();
  updates[`marketing_transactions/${logId}`] = {
    itemId: selectedId, itemName: item.nama, type: transType, qty, unit: tUnit, note,
    user: auth.currentUser?.email || '-', date: new Date().toISOString()
  };
  update(ref(db), updates).then(() => { showToast('Transaksi berhasil!'); closeModals(); })
    .catch(() => showToast('Gagal proses transaksi. Cek rules Firebase.', true));
};

window.openHistory = (id) => {
  const item = allData.find(i => i.id === id);
  if (!item) return showToast('Barang tidak ditemukan', true);
  $('histItemName').innerText = item.nama || '-';
  $('histItemSku').innerText = item.sku || 'Tanpa SKU';
  const listContainer = $('historyListContainer');
  const loader = $('historyLoader');
  listContainer.innerHTML = '';
  loader.classList.remove('hidden');
  openModal('modalHistory');
  get(query(ref(db, 'marketing_transactions'), orderByChild('itemId'), equalTo(id))).then((snapshot) => {
    loader.classList.add('hidden');
    if (!snapshot.exists()) {
      listContainer.innerHTML = `<p style="text-align:center;font-size:13px;color:#64748b;padding:20px;">Belum ada riwayat transaksi untuk barang ini.</p>`;
      return;
    }
    const logs = [];
    snapshot.forEach(child => logs.push(child.val()));
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    listContainer.innerHTML = logs.map(log => {
      const isIn = log.type === 'IN';
      return `<div class="history-item"><div style="min-width:34px"><div style="width:30px;height:30px;border-radius:50%;background:${isIn ? '#ecfdf5' : '#fff7ed'};display:grid;place-items:center;color:${isIn ? '#10b981' : '#f97316'}"><i class="fa-solid ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div></div><div class="history-content" style="width:100%"><div style="display:flex;justify-content:space-between;gap:8px"><h5 class="history-title">${Number(log.qty || 0).toLocaleString('id-ID')} ${esc(log.unit || 'Pcs')} <span class="history-badge ${isIn ? 'h-in' : 'h-out'}">${isIn ? 'Restock' : 'Keluar'}</span></h5><span class="history-date">${new Date(log.date).toLocaleString('id-ID')}</span></div><p class="history-note">${esc(log.note || '-')}</p><span class="history-user">Oleh: ${esc(log.user || '-')}</span></div></div>`;
    }).join('');
  }).catch(() => { loader.classList.add('hidden'); showToast('Gagal memuat riwayat.', true); });
};

async function getLogsByPeriod(period) {
  const snap = await get(ref(db, 'marketing_transactions'));
  const logs = [];
  snap.forEach(c => logs.push(c.val()));
  const now = new Date();
  return logs.filter(log => {
    const d = new Date(log.date);
    if (period === 'daily') return d.toDateString() === now.toDateString();
    if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'yearly') return d.getFullYear() === now.getFullYear();
    return true;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));
}

window.generateReport = async (period) => {
  const loader = $('reportLoader');
  loader.style.display = 'block';
  try {
    const logs = await getLogsByPeriod(period);
    loader.style.display = 'none';
    closeModals();
    if (!logs.length) return showToast('Tidak ada data untuk periode ini', true);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const now = new Date();
    const title = `Laporan Inventaris Marketing - ${period.toUpperCase()}`;
    doc.setFontSize(16); doc.text(title, 14, 15);
    doc.setFontSize(9); doc.text(`Dibuat: ${moneyDate()}`, 14, 21);
    doc.autoTable({ startY: 27, head: [['Tanggal', 'Barang', 'Tipe', 'Jumlah', 'Catatan', 'User']], body: logs.map(l => [new Date(l.date).toLocaleString('id-ID'), l.itemName || '-', l.type === 'IN' ? 'Masuk' : 'Keluar', `${l.qty} ${l.unit || ''}`, l.note || '-', l.user || '-']), theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [239, 31, 37] } });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [['SKU', 'Nama Barang', 'Kategori', 'Stok', 'Satuan', 'Lokasi', 'Status']], body: allData.map(i => [i.sku || '-', i.nama || '-', i.kategori || '-', i.stok || 0, i.satuan || 'Pcs', i.lokasi || '-', getStatus(i).label]), theme: 'striped', styles: { fontSize: 8 }, headStyles: { fillColor: [17, 24, 39] } });
    doc.save(`Laporan_ZMARK_${period}_${Date.now()}.pdf`);
    showToast('PDF berhasil diunduh');
  } catch (e) { loader.style.display = 'none'; showToast('Gagal membuat PDF.', true); }
};

window.generateExcel = async (period) => {
  const loader = $('reportLoader');
  loader.style.display = 'block';
  try {
    const logs = await getLogsByPeriod(period);
    loader.style.display = 'none'; closeModals();
    if (!logs.length) return showToast('Tidak ada data untuk periode ini', true);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map(l => ({ 'Tanggal Waktu': new Date(l.date).toLocaleString('id-ID'), 'Tipe': l.type === 'IN' ? 'MASUK' : 'KELUAR', 'Nama Barang': l.itemName || '-', 'Jumlah': l.qty || 0, 'Satuan': l.unit || 'Pcs', 'Catatan': l.note || '-', 'User': l.user || '-' }))), 'Riwayat Transaksi');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.map(i => ({ 'SKU': i.sku || '-', 'Nama Barang': i.nama || '-', 'Kategori': i.kategori || '-', 'Sisa Stok': i.stok || 0, 'Satuan': i.satuan || 'Pcs', 'Lokasi Rak': i.lokasi || '-', 'Status': getStatus(i).label }))), 'Stok Saat Ini');
    XLSX.writeFile(wb, `Laporan_ZMARK_${period}_${Date.now()}.xlsx`);
    showToast('Excel berhasil diunduh!');
  } catch (e) { loader.style.display = 'none'; showToast('Gagal membuat Excel.', true); }
};

function openModal(id) { $(id)?.classList.add('open'); }
window.closeModals = closeModals;
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open')); }

function showToast(msg, isError = false) {
  const t = $('toast');
  $('toastMsg').innerText = msg;
  t.className = isError ? 'toast error show' : 'toast show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

window.openModal = openModal;
window.showZmarkInfo = (msg) => showToast(msg);
window.showZmarkNotif = () => {
  const low = allData.filter(i => Number(i.stok || 0) > 0 && Number(i.stok || 0) < 10).length;
  const empty = allData.filter(i => Number(i.stok || 0) <= 0).length;
  showToast(`${low} stok rendah, ${empty} stok habis.`);
};
window.focusZSearch = () => { document.querySelector('.z-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('searchInput')?.focus(), 250); };
window.focusZFilter = (id) => { document.querySelector('.z-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $(id)?.focus(), 250); };
window.openQuickTransaction = (type) => {
  const first = filteredData[0] || allData[0];
  if (!first) return showToast('Belum ada barang. Tambahkan barang dulu.', true);
  window.openTrans(first.id, type);
};
