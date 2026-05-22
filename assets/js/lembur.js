// Extracted from lembur.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
    const loadingScreen = document.getElementById('loading-screen');

    function hideLoadingScreen() {
      if (!loadingScreen) return;
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        hideLoadingScreen();
      } else {
        window.location.href = 'login.html';
      }
    });

    let logoBase64 = null;

    document.getElementById("logoUpload").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        logoBase64 = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    function calculateHours() {
      const start = document.getElementById("startTime").value;
      const end = document.getElementById("endTime").value;

      if (!start || !end) {
        document.getElementById("totalHours").value = "";
        return;
      }

      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

      let startMinutes = sh * 60 + sm;
      let endMinutes = eh * 60 + em;

      // lembur lewat tengah malam
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      const diff = endMinutes - startMinutes;
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;

      let result = "";
      if (hours > 0) result += hours + " jam ";
      if (minutes > 0) result += minutes + " menit";
      if (result.trim() === "") result = "0 jam";

      document.getElementById("totalHours").value = result.trim();
    }

    document.getElementById("startTime").addEventListener("input", calculateHours);
    document.getElementById("endTime").addEventListener("input", calculateHours);

    function formatDateIndo(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);

      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];

      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function resetForm() {
      document.querySelectorAll("input, textarea").forEach(el => {
        if (el.type !== "file") el.value = "";
      });
      document.getElementById("logoUpload").value = "";
      logoBase64 = null;
    }

    async function generatePDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");

      const companyName = document.getElementById("companyName").value || "Nama Perusahaan";
      const companyAddress = document.getElementById("companyAddress").value || "Alamat Perusahaan";

      const employeeName = document.getElementById("employeeName").value || "-";
      const employeePosition = document.getElementById("employeePosition").value || "-";
      const employeeDepartment = document.getElementById("employeeDepartment").value || "-";

      const overtimeDate = formatDateIndo(document.getElementById("overtimeDate").value);
      const startTime = document.getElementById("startTime").value || "-";
      const endTime = document.getElementById("endTime").value || "-";
      const totalHours = document.getElementById("totalHours").value || "-";

      const overtimeReason = document.getElementById("overtimeReason").value || "-";

      const supervisorName = document.getElementById("supervisorName").value || "-";
      const supervisorPosition = document.getElementById("supervisorPosition").value || "-";

      const cityName = document.getElementById("cityName").value || "Kota";

      // ===== HEADER KOP =====
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 15, 12, 22, 22);
        } catch (err) {
          try {
            doc.addImage(logoBase64, "JPEG", 15, 12, 22, 22);
          } catch (e) {}
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(217, 35, 45);
      doc.text(companyName.toUpperCase(), 40, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);

      const addressLines = doc.splitTextToSize(companyAddress, 150);
      doc.text(addressLines, 40, 24);

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.7);
      doc.line(15, 38, 195, 38);

      // ===== JUDUL =====
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text("SURAT PENGAJUAN LEMBUR KERJA", 105, 52, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Tanggal: ${overtimeDate}`, 15, 62);

      doc.setTextColor(55, 65, 81);
      doc.text("Dengan ini saya mengajukan permohonan lembur kerja dengan detail sebagai berikut:", 15, 72);

      // ===== TABLE =====
      doc.autoTable({
        startY: 78,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [217, 35, 45], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 120 }
        },
        head: [["Keterangan", "Detail"]],
        body: [
          ["Nama Karyawan", employeeName],
          ["Jabatan / Divisi", employeePosition],
          ["Departemen", employeeDepartment],
          ["Tanggal Lembur", overtimeDate],
          ["Jam Mulai", startTime],
          ["Jam Selesai", endTime],
          ["Total Lembur", totalHours],
        ]
      });

      let afterTableY = doc.lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text("Alasan / Keterangan Lembur:", 15, afterTableY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);

      const reasonLines = doc.splitTextToSize(overtimeReason, 175);
      doc.text(reasonLines, 15, afterTableY + 7);

      let reasonEndY = afterTableY + 7 + (reasonLines.length * 5);

      doc.text(
        "Demikian surat pengajuan lembur ini dibuat dengan sebenar-benarnya untuk dapat disetujui sebagaimana mestinya.",
        15,
        reasonEndY + 10,
        { maxWidth: 175 }
      );

      // ===== SIGNATURE =====
      let signY = reasonEndY + 35;
      if (signY > 230) signY = 230;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.text(`${cityName}, ${overtimeDate}`, 130, signY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text("Pemohon,", 25, signY + 15);
      doc.text("Mengetahui,", 85, signY + 15);
      doc.text("HRD,", 150, signY + 15);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.text("( " + employeeName + " )", 25, signY + 50);
      doc.text("( " + supervisorName + " )", 85, signY + 50);
      doc.text("( __________________ )", 150, signY + 50);

      doc.setFontSize(9);
      doc.text(employeePosition, 25, signY + 56);
      doc.text(supervisorPosition, 85, signY + 56);

      // ===== FOOTER =====
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Dokumen ini dibuat secara otomatis melalui sistem internal Zeppelin Portal.", 105, 290, { align: "center" });

      doc.save(`Surat_Pengajuan_Lembur_${employeeName.replaceAll(" ", "_")}.pdf`);
    }

    window.generatePDF = generatePDF;
    window.resetForm = resetForm;
