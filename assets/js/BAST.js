// Extracted from BAST.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, push, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const BAST_DB = 'bastdb';

const loadingScreen = document.getElementById('loadingScreen');
const mainContent = document.getElementById('mainContent');
const namaInput = document.getElementById('namaPenerima');
const nikInput = document.getElementById('nikPenerima');
const deptInput = document.getElementById('deptPenerima');
const lokasiInput = document.getElementById('lokasiPenerima');
const tglInput = document.getElementById('tgl');
const ticketInput = document.getElementById('ticketPenerima');
const keperluanInput = document.getElementById('keperluanPenerima');
const bastMsg = document.getElementById('bast-msg');
const bastHistoryList = document.getElementById('bast-history-list');
const historyButton = document.getElementById('historyButton');
const historyModalBackdrop = document.getElementById('history-modal-backdrop');
const historyModalContent = document.getElementById('history-modal-content');
const historyModalClose = document.getElementById('history-modal-close');
let currentUserUid = null;

window.addEventListener('load', function() {
    setTimeout(function() {
        loadingScreen.classList.add('fade-out');
        mainContent.classList.add('visible');
    }, 1000);
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
        window.location.href = 'login.html';
        return;
    }

    const userData = snapshot.val();
    currentUserUid = user.uid;
    const nama = userData.nama || user.email || '';
    const departemen = userData.departemen || '';

    namaInput.value = nama;
    namaInput.readOnly = true;
    deptInput.value = departemen;
    deptInput.readOnly = true;
    ticketInput.value = await generateTicketNumber();
    ticketInput.readOnly = true;

    document.getElementById("tanggal").innerText =
        "Tanggal : " + new Date().toLocaleDateString("id-ID");

    renderBASTHistory(currentUserUid);
});

function openHistoryModal() {
    if (!currentUserUid) return;
    renderBASTHistory(currentUserUid);
    historyModalBackdrop.classList.add('visible');
    historyModalContent.classList.add('visible');
}

function closeHistoryModal() {
    historyModalBackdrop.classList.remove('visible');
    historyModalContent.classList.remove('visible');
}

historyButton.addEventListener('click', openHistoryModal);
historyModalClose.addEventListener('click', closeHistoryModal);
historyModalBackdrop.addEventListener('click', closeHistoryModal);

function showMessage(message, isError = false) {
    bastMsg.style.display = 'block';
    bastMsg.textContent = message;
    bastMsg.style.color = isError ? '#b91c1c' : '#065f46';
    bastMsg.style.backgroundColor = isError ? '#fef2f2' : '#dcfce7';
    bastMsg.style.border = isError ? '1px solid #fecaca' : '1px solid #a7f3d0';
}

function clearMessage() {
    bastMsg.style.display = 'none';
    bastMsg.textContent = '';
}

function clearValidation() {
    [namaInput, nikInput, deptInput, lokasiInput, tglInput, ticketInput, keperluanInput].forEach((el) => {
        el.classList.remove('input-error');
    });
    const tableInputs = document.querySelectorAll('#deviceBody input');
    tableInputs.forEach((el) => el.classList.remove('input-error'));
}

async function generateTicketNumber() {
    try {
        const snapshot = await get(ref(db, BAST_DB));
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        return `BAST-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
        console.error('Gagal generate ticket:', error);
        return `BAST-${Date.now()}`;
    }
}

function renderBASTHistory(userUid) {
    bastHistoryList.innerHTML = '<div class="history-empty">Memuat riwayat BAST...</div>';
    get(ref(db, BAST_DB)).then((snapshot) => {
        const history = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const key in data) {
                if (data[key].createdByUid === userUid) {
                    history.push({ id: key, ...data[key] });
                }
            }
        }
        if (history.length === 0) {
            bastHistoryList.innerHTML = '<div class="history-empty">Belum ada riwayat BAST.</div>';
            return;
        }

        history.sort((a, b) => b.createdAt - a.createdAt);
        bastHistoryList.innerHTML = '';
        history.forEach((item) => {
            const date = new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const card = document.createElement('div');
            card.className = 'history-item';
            card.innerHTML = `
                <div>
                    <h4>${item.noTicket || item.tanggal}</h4>
                    <span>${date}</span>
                    <span>${item.lokasi || 'Lokasi belum diisi'}</span>
                </div>
                <div style="text-align:right; min-width:140px;">
                    <span>${item.status || 'submitted'}</span>
                    <span>${item.perangkat ? item.perangkat.length + ' perangkat' : '0 perangkat'}</span>
                </div>
            `;
            card.addEventListener('click', () => openBASTRecord(item));
            bastHistoryList.appendChild(card);
        });
    }).catch((error) => {
        console.error(error);
        bastHistoryList.innerHTML = '<div class="history-empty">Gagal memuat riwayat.</div>';
    });
}

function openBASTRecord(item) {
    closeHistoryModal();

    namaInput.value = item.nama || '';
    nikInput.value = item.nik || '';
    deptInput.value = item.departemen || '';
    lokasiInput.value = item.lokasi || '';
    tglInput.value = item.tanggal || '';
    ticketInput.value = item.noTicket || '';
    keperluanInput.value = item.keperluan || '';
    document.getElementById('docNo').innerText = 'No : ' + (item.noTicket || '');
    document.getElementById('tanggal').innerText = 'Tanggal : ' + (item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : new Date(item.createdAt).toLocaleDateString('id-ID'));

    const tbody = document.getElementById('deviceBody');
    tbody.innerHTML = '';
    if (item.perangkat && item.perangkat.length) {
        item.perangkat.forEach((device, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input value="${device.jenis || ''}"></td>
                <td><input value="${device.serial || ''}"></td>
                <td><input type="number" value="${device.qty || 1}"></td>
                <td><input value="${device.keterangan || ''}"></td>
            `;
        });
    } else {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>1</td>
            <td><input></td>
            <td><input></td>
            <td><input type="number" value="1"></td>
            <td><input></td>
        `;
    }
}

function getDeviceRows() {
    const rows = [];
    document.querySelectorAll('#deviceBody tr').forEach((row) => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 4) {
            rows.push({
                jenis: inputs[0].value.trim(),
                serial: inputs[1].value.trim(),
                qty: Number(inputs[2].value) || 0,
                keterangan: inputs[3].value.trim(),
                rowInputs: inputs
            });
        }
    });
    return rows;
}

function validateForm() {
    clearValidation();
    clearMessage();

    let valid = true;

    if (!namaInput.value.trim()) {
        namaInput.classList.add('input-error');
        valid = false;
    }
    if (!deptInput.value.trim()) {
        deptInput.classList.add('input-error');
        valid = false;
    }
    if (!lokasiInput.value.trim()) {
        lokasiInput.classList.add('input-error');
        valid = false;
    }
    if (!tglInput.value) {
        tglInput.classList.add('input-error');
        valid = false;
    }
    if (!ticketInput.value.trim()) {
        ticketInput.classList.add('input-error');
        valid = false;
    }
    if (!keperluanInput.value.trim()) {
        keperluanInput.classList.add('input-error');
        valid = false;
    }

    const devices = getDeviceRows();
    if (devices.length === 0) {
        showMessage('Silakan tambahkan minimal 1 perangkat.', true);
        return false;
    }

    devices.forEach((device, index) => {
        if (!device.jenis) {
            device.rowInputs[0].classList.add('input-error');
            valid = false;
        }
        if (!device.serial) {
            device.rowInputs[1].classList.add('input-error');
            valid = false;
        }
        if (device.qty <= 0) {
            device.rowInputs[2].classList.add('input-error');
            valid = false;
        }
    });

    if (!valid) {
        showMessage('Periksa kembali data form. Semua field wajib diisi dengan benar.', true);
    }

    return valid;
}

async function saveBAST() {
    if (!validateForm()) return;

    clearMessage();
    const devices = getDeviceRows().map((device) => ({
        jenis: device.jenis,
        serial: device.serial,
        qty: device.qty,
        keterangan: device.keterangan
    }));

    const payload = {
        nama: namaInput.value.trim(),
        nik: nikInput.value.trim(),
        departemen: deptInput.value.trim(),
        lokasi: lokasiInput.value.trim(),
        tanggal: tglInput.value,
        noTicket: ticketInput.value.trim(),
        keperluan: keperluanInput.value.trim(),
        perangkat: devices,
        createdAt: Date.now(),
        createdBy: namaInput.value.trim(),
        createdByUid: currentUserUid,
        status: 'submitted'
    };

    try {
        const newBASTRef = push(ref(db, BAST_DB));
        await set(newBASTRef, payload);
        showMessage('Data BAST berhasil disimpan ke database.');
        ticketInput.value = await generateTicketNumber();
        if (currentUserUid) renderBASTHistory(currentUserUid);
    } catch (error) {
        console.error(error);
        showMessage('Terjadi kesalahan saat menyimpan data. Coba lagi.', true);
    }
}

function addRow() {
    const table = document.getElementById('deviceBody');
    const row = table.insertRow();
    const no = table.rows.length;
    row.innerHTML = `
        <td>${no}</td>
        <td><input></td>
        <td><input></td>
        <td><input type="number" value="1"></td>
        <td><input></td>
    `;
}

window.addRow = addRow;
window.saveBAST = saveBAST;
