# GitHub Pages Ready Structure

Upload semua isi folder ini ke root repository GitHub.

Struktur utama:
- index.html                  -> landing page utama di root
- pages/                      -> semua halaman internal
- assets/css/                 -> semua stylesheet
- assets/js/                  -> semua script
- assets/img/                 -> semua gambar/icon
- database.rules.json         -> Firebase Realtime Database rules
- firestore.rules             -> Firestore rules
- firebase.json               -> config Firebase Hosting opsional
- .nojekyll                   -> agar GitHub Pages tidak mengubah folder asset

Cara akses lokal:
1. Extract ZIP
2. Jalankan start-local-server.bat di Windows, atau start-local-server.sh di Linux
3. Buka http://localhost:8000

Catatan:
- Jangan buka langsung pakai file:// karena module JavaScript akan kena CORS.
- Untuk GitHub Pages, aktifkan Pages dari Settings > Pages > Deploy from branch > main/root.
- Tambahkan domain GitHub Pages kamu ke Firebase Authentication > Settings > Authorized domains.
