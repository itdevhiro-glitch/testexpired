// Extracted from user.html
// === KONFIGURASI FIREBASE (v10+) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    update,
    get, 
    onValue, 
    runTransaction, 
    query, 
    orderByChild, 
    equalTo,
    off // (BARU) Untuk mematikan listener
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
  authDomain: "it-support-53eeb.firebaseapp.com",
  databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
  projectId: "it-support-53eeb",
  storageBucket: "it-support-53eeb.firebasestorage.app",
  messagingSenderId: "573924501146",
  appId: "1:573924501146:web:12f34306ed675472322123",
  measurementId: "G-33K6DDE1VR" // <-- Saya tambahkan measurementId yang sepertinya terhapus
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Referensi Database
const reportsRef = ref(db, 'reports'); 
const counterRef = ref(db, 'counter'); 
const usersRef = ref(db, 'users');

/* Cache & State */
let myReportsCache = []; 
let currentUser = null; 
let currentUserData = {};
let dbListener = null; // (BARU) Menyimpan referensi listener

/* DOM Elements */
const loadingScreen = document.getElementById('loading-screen');
const appContent = document.getElementById('app-content');
const userNameDisplay = document.getElementById('userNameDisplay');

/* Utilities */
function nowString(){ return new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }); }
function isoNow(){ return new Date().toISOString(); }

function showToast(txt, t=2500){ 
    const el = document.createElement('div'); 
    el.className='card'; 
    el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; 
    el.style.padding='10px 12px'; el.style.zIndex=99999; 
    el.style.background = 'var(--primary)'; el.style.color = '#fff'; 
    el.textContent = txt; 
    document.body.appendChild(el); 
    setTimeout(()=>el.remove(),t); 
}

/* (BARU) AUTH GUARD (Validasi Sesi) */
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User login, cek status approval
        currentUser = user;
        const userRef = ref(db, 'users/' + user.uid);

        get(userRef).then(snapshot => {
            if (snapshot.exists() && snapshot.val().status === 'approved') {
                // === DISETUJUI ===
                currentUserData = snapshot.val();
                userNameDisplay.textContent = currentUserData.nama;
                
                loadingScreen.style.display = 'none'; 
                appContent.style.display = 'block'; 
                
                // Mulai mendengarkan laporan
                startDbListener(user.uid);
                
            } else if (snapshot.exists() && snapshot.val().status === 'pending') {
                // === PENDING ===
                alert("Akun Anda untuk User Dashboard sedang menunggu persetujuan Admin.");
                signOut(auth).then(() => window.location.href = 'login.html');
            
            } else if (snapshot.exists() && snapshot.val().status === 'rejected') {
                // === DITOLAK ===
                alert("Akun Anda ditolak oleh Admin. Hubungi support.");
                signOut(auth).then(() => window.location.href = 'login.html');
            
            } else {
                // === DATA TIDAK ADA / STATUS KOSONG ===
                alert("Data user tidak ditemukan/valid. Hubungi Admin.");
                signOut(auth).then(() => window.location.href = 'login.html');
            }
        }).catch(err => {
            alert("Gagal memverifikasi data user: " + err.message);
            signOut(auth).then(() => window.location.href = 'login.html');
        });
        
    } else {
      // === USER TIDAK LOGIN ===
      currentUser = null;
      currentUserData = {};
      stopDbListener(); // Matikan listener
      window.location.href = 'login.html'; // Arahkan ke login
    }
});

/* (BARU) Fungsi untuk memulai & menghentikan listener DB */
function startDbListener(uid) {
    if (dbListener) stopDbListener(); // Hentikan listener lama jika ada

    const myReportsQuery = query(reportsRef, orderByChild('uid'), equalTo(uid));
    
    // Simpan referensi fungsi listener
    dbListener = onValue(myReportsQuery, (snapshot) => {
        const dataObj = snapshot.val();
        myReportsCache = dataObj ? Object.keys(dataObj).map(key => ({ ...dataObj[key], id: key })) : [];
        renderTable();
        renderUserDashboard();
        console.log('Laporan saya dimuat dari Firebase (v10).');
    }, (error) => {
        console.error("Firebase read failed:", error);
    });
}

function stopDbListener() {
    if (dbListener) {
        off(dbListener); // (v10) Mematikan listener
        dbListener = null;
        myReportsCache = [];
        renderTable();
        renderUserDashboard();
        console.log('Listener DB dimatikan.');
    }
}


/* (SAMA) Render User Dashboard (Summary Cards) */
function renderUserDashboard() {
    const byStatus = {Open:0,Progress:0,Closed:0};
    myReportsCache.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    document.getElementById('openCount').textContent = byStatus.Open;
    document.getElementById('progressCount').textContent = byStatus.Progress;
    document.getElementById('closedCount').textContent = byStatus.Closed;
}

/* (SAMA) Render Table */
function renderTable(){
  const tbody = document.querySelector('#reportTable tbody');
  myReportsCache.sort((a,b)=> new Date(b.created_iso) - new Date(a.created_iso));
  
  if (myReportsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted); padding: 20px;">Anda belum membuat laporan.</td></tr>`;
      return;
  }
  tbody.innerHTML = myReportsCache.map(r=>{
    const statusClass = r.status==='Open'?'s-open':(r.status==='Progress'?'s-progress':'s-closed');
    const created = r.created || '-';
    const deskripsi = (r.catatan||'').substring(0, 100) + ((r.catatan||'').length > 100 ? '...' : '');
    const pic = r.pic || '...'; 
    const urgentButton = r.status !== 'Closed' 
      ? `<button class="btn urgent" onclick="markUrgent('${r.id}')" title="Tandai sebagai urgent">🔥 Urgent</button>`
      : '<span>-</span>';
    
    return `<tr>
      <td data-label="ID Laporan">${r.id}</td>
      <td data-label="Jenis Masalah">${r.jenis}</td>
      <td data-label="Deskripsi">${deskripsi}</td>
      <td data-label="PIC">${pic}</td> <td data-label="Status"><span class="status ${statusClass}">${r.status}</span></td>
      <td data-label="Dibuat">${created}</td>
      <td data-label="Aksi">${urgentButton}</td> </tr>`;
  }).join('');
}

/* (DIUBAH) Fungsi Urgent (v10) */
async function markUrgent(id) {
    if (!currentUser) { alert("Sesi Anda berakhir. Silakan login ulang."); return; }
    
    const report = myReportsCache.find(r => r.id === id);
    if (report && report.urgent) {
        alert('Laporan ini sudah ditandai sebagai urgent.');
        return;
    }
    if (!confirm('Anda yakin ingin menandai laporan ini sebagai URGENT? Admin akan segera dinotifikasi.')) return;

    const specificReportRef = ref(db, 'reports/' + id); // (v10)
    const logRef = ref(db, 'reports/' + id + '/logs'); // (v10)
    const now = nowString();
    const iso = isoNow();
    const userName = currentUserData.nama || currentUser.email;

    try {
        await update(specificReportRef, { urgent: true }); // (v10)
        await push(logRef, { // (v10)
            time: now,
            iso: iso,
            detail: `🔥 USER (${userName}) MENANDAI SEBAGAI URGENT.`
        });
        showToast('Laporan ditandai sebagai Urgent! ✅');
    } catch (err) {
        console.error("Gagal menandai urgent:", err);
        alert("Gagal menandai urgent: " + err.message);
    }
}
window.markUrgent = markUrgent; // Expose ke global

/* (DIUBAH) Generate ID (v10) */
async function generateId() {
  try {
    // (v10) Transaksi
    const result = await runTransaction(counterRef, (currentValue) => (currentValue || 0) + 1);
    
    if (result.committed) {
      const nextId = result.snapshot.val();
      return 'ZP-' + String(nextId).padStart(4, '0');
    } else { throw new Error('Gagal mendapatkan ID baru (transaksi dibatalkan).'); }
  } catch (error) {
    console.error("Gagal generate ID:", error);
    alert("Error: Tidak bisa mendapatkan ID baru dari server. Coba lagi.");
    return null;
  }
}

/* (DIUBAH) Init (Tanpa Auth, hanya event listener) */
/* (DIUBAH) Init (Tanpa Auth, hanya event listener) */
(function init(){
  document.getElementById('footerDate').textContent = new Date().toLocaleDateString('id-ID', { year: 'numeric' });
  document.getElementById('newReportBtn').addEventListener('click', ()=>openModal());
  
  // (DISEMPURNAKAN) Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (!confirm('Anda yakin ingin logout?')) return; // Konfirmasi
    try {
        await signOut(auth); // (v10)
        
        // (PERBAIKAN) Mengarahkan ke URL logout yang benar
        window.location.href = 'login.html'; 
        
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Gagal logout: " + error.message);
    }
  });
})();

/* (SAMA) MODAL BUAT LAPORAN */
const modalBackdrop = document.getElementById('modalBackdrop');
const modalForm = document.getElementById('modalForm');

function openModal(){
  modalForm.reset(); 
  document.getElementById('m_nama').value = currentUserData.nama || currentUser.email;
  modalBackdrop.style.display = 'flex';
}
document.getElementById('modalCancel').addEventListener('click', ()=>{ modalBackdrop.style.display='none'; });

/* (DIUBAH) Save Laporan (v10) */
document.getElementById('modalSave').addEventListener('click', async (e)=>{
  e && e.preventDefault();
  
  if (!currentUser) { alert("Sesi Anda berakhir. Silakan login ulang."); return; }
  
  const jenis = document.getElementById('m_jenis').value;
  const catatan = document.getElementById('m_catatan').value;
  
  if(!jenis || !catatan){ alert('Jenis Masalah dan Deskripsi wajib diisi.'); return; }

  const id = await generateId(); 
  if (!id) return; 
  
  const now = nowString();
  const iso = isoNow();
  const userName = currentUserData.nama || currentUser.email; 

  const entry = {
    id: id,
    uid: currentUser.uid, 
    nama: userName,       
    jenis: jenis,
    catatan: catatan,
    status: "Open", 
    pic: null,      
    kategori: null,  
    urgent: false, 
    created: now,
    created_iso: iso,
    updated: null,
    updated_iso: null,
    durationMs: null,
    durationText: '-',
    logs: [
        { time: now, iso: iso, detail: `Laporan dibuat oleh ${userName}.` }
    ]
  };

  try {
    const specificReportRef = ref(db, 'reports/' + id); // (v1DITOLAK10)
    await set(specificReportRef, entry); // (v10)
    showToast('Laporan baru berhasil dikirim ✅');
    modalBackdrop.style.display='none';
  } catch (err) {
    console.error("Gagal menyimpan:", err);
    alert("Gagal mengirim laporan: " + err.message);
  }
});
