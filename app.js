// Firebase SDK dimuat lewat <script> "compat" di index.html (bukan ES module),
// supaya bisa jalan langsung dibuka dari file lokal, dari web hosting, maupun
// di dalam WebView Android tanpa masalah CORS. Variabel global "firebase"
// sudah tersedia dari script itu.

// ---------- KONFIGURASI FIREBASE ----------
const firebaseConfig = {
  apiKey: "AIzaSyDw8AhXns--g4t_vKwI4QAHzw-pvu3OZjY",
  authDomain: "teknisi-skaliska.firebaseapp.com",
  projectId: "teknisi-skaliska",
  storageBucket: "teknisi-skaliska.firebasestorage.app",
  messagingSenderId: "736577586416",
  appId: "1:736577586416:web:cb8017132e829d92226e35"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Batas ukuran gambar barang setelah dikompres, disimpan langsung sebagai
// Base64 di dokumen Firestore (bukan Firebase Storage). Firestore membatasi
// 1 dokumen maksimal ~1 MB, jadi kita jaga gambar tetap kecil.
const MAX_ITEM_IMAGE_CHARS = 700000; // ~700KB string base64, aman untuk 1 dokumen

// ---------- STATE GLOBAL ----------
let currentUser = { name: '', role: '' };
let gudangData = [];
let riwayatData = [];
let usersData = [];
let pendingRequests = [];
let userPinjamanMap = {};
let userPendingReturnMap = {}; // barangId -> true kalau teknisi ybs punya request pengembalian yang masih pending
let unsubscribePinjaman = null;
let unsubscribeUsers = null;
let unsubscribeRequests = null;
let unsubscribeMyReturnRequests = null;
let confirmResolve = null;
let currentFilter = 'semua';
let pendingLogoFile = null;
let currentLogoUrl = '';
let processingIds = new Set(); // kunci sementara biar tombol gak bisa di-spam-klik saat request masih diproses

// ---------- FUNGSI PEMBANTU ----------
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return str.replace(/[&<>'"]/g, m => map[m] || m);
}

function setLoadingState(btnId, isLoading, defaultHtml) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? `<svg class="animate-spin h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="ml-2 font-bold">Proses...</span>`
    : defaultHtml;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const dotColors = { info: '#60A5FA', success: '#34D399', error: '#F87171', warning: '#FBBF24' };
  const dot = `<div style="width:8px;height:8px;border-radius:50%;background:${dotColors[type] || dotColors.info};flex-shrink:0"></div>`;
  toast.className = 'toast-wrap toast-in pointer-events-auto';
  toast.innerHTML = `${dot}<span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

// ---------- KONFIRMASI DIALOG ----------
function showConfirmDialog(message, detail = 'Tindakan ini permanen dan tak bisa dibatalkan.') {
  return new Promise(resolve => {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-detail').textContent = detail;
    document.getElementById('confirm-dialog').classList.remove('hidden');
    confirmResolve = resolve;
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
  });
}

function closeConfirmDialog(result) {
  document.getElementById('confirm-dialog').classList.add('hidden');
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

// ---------- LOGO ----------
// Logo aplikasi tetap bisa di-upload admin kapan saja (disimpan di Firebase
// Storage, URL-nya disimpan di dokumen settings/appConfig). Ini beda dari
// foto barang, yang sekarang disimpan langsung sebagai Base64 di Firestore.
function applyLogo(url) {
  currentLogoUrl = url || '';
  ['login', 'header', 'settings'].forEach(prefix => {
    const svg = document.getElementById(`${prefix}-logo-svg`);
    const img = document.getElementById(`${prefix}-logo-img`);
    if (!svg || !img) return;
    if (url) {
      svg.classList.add('hidden');
      img.src = url;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
      img.removeAttribute('src'); // hindari request kosong ke halaman sendiri
      svg.classList.remove('hidden');
    }
  });
}

function previewLogoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    showToast('File logo harus berupa gambar!', 'error');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Logo maks 2MB!', 'error');
    input.value = '';
    return;
  }
  pendingLogoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('settings-logo-img');
    const svg = document.getElementById('settings-logo-svg');
    img.src = e.target.result;
    img.classList.remove('hidden');
    svg.classList.add('hidden');
  };
  reader.onerror = () => showToast('Gagal membaca file logo.', 'error');
  reader.readAsDataURL(pendingLogoFile);
}

function openSettingsModal() {
  if (currentUser.role !== 'admin') return;
  pendingLogoFile = null;
  document.getElementById('logo-file-input').value = '';
  document.getElementById('logo-upload-progress-wrap').classList.add('hidden');
  const svg = document.getElementById('settings-logo-svg');
  const img = document.getElementById('settings-logo-img');
  if (currentLogoUrl) {
    img.src = currentLogoUrl;
    img.classList.remove('hidden');
    svg.classList.add('hidden');
  } else {
    img.classList.add('hidden');
    img.removeAttribute('src');
    svg.classList.remove('hidden');
  }
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
  pendingLogoFile = null;
}

async function saveLogo() {
  if (!pendingLogoFile) {
    showToast('Pilih file logo dulu!', 'warning');
    return;
  }
  const progressWrap = document.getElementById('logo-upload-progress-wrap');
  const progressBar = document.getElementById('logo-upload-bar');
  const progressPct = document.getElementById('logo-upload-pct');
  progressWrap.classList.remove('hidden');
  setLoadingState('btn-save-logo', true,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>Simpan Logo`);
  try {
    const fileName = `logo_${Date.now()}_${pendingLogoFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    const storageRef = storage.ref(`settings/${fileName}`);
    const uploadTask = storageRef.put(pendingLogoFile);
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        snapshot => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          progressBar.style.width = pct + '%';
          progressPct.textContent = pct + '%';
        },
        reject,
        resolve
      );
    });
    const url = await uploadTask.snapshot.ref.getDownloadURL();
    await db.collection('settings').doc('appConfig').set({ logoUrl: url }, { merge: true });
    showToast('Logo diperbarui!', 'success');
    pendingLogoFile = null;
    closeSettingsModal();
  } catch (e) {
    showToast('Upload gagal: ' + e.message, 'error');
  } finally {
    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';
    setLoadingState('btn-save-logo', false,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>Simpan Logo`);
  }
}

async function resetLogo() {
  const ok = await showConfirmDialog('Reset logo ke default?', 'Logo custom akan dihapus.');
  if (!ok) return;
  try {
    await db.collection('settings').doc('appConfig').set({ logoUrl: '' }, { merge: true });
    showToast('Logo direset.', 'success');
    closeSettingsModal();
  } catch (e) {
    showToast('Gagal reset: ' + e.message, 'error');
  }
}

// ---------- HAPUS LOG ----------
async function clearAllLog() {
  if (currentUser.role !== 'admin') return;
  const ok = await showConfirmDialog('Hapus semua log?', `${riwayatData.length} entri akan dihapus permanen.`);
  if (!ok) return;
  const btn = document.getElementById('btn-clear-log');
  btn.disabled = true;
  try {
    const snapshot = await db.collection('riwayat').get();
    await Promise.all(snapshot.docs.map(d => db.collection('riwayat').doc(d.id).delete()));
    showToast(`${snapshot.docs.length} log dihapus!`, 'success');
  } catch (e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---------- TAMPILAN PINJAMAN ----------
function updatePinjamanDisplay() {
  const el = document.getElementById('user-pinjaman-info');
  if (currentUser.role === 'user') {
    const total = Object.values(userPinjamanMap).reduce((a, b) => a + b, 0);
    if (total > 0) {
      el.innerHTML = `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg><span>${total} item sedang dipinjam</span>`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  } else {
    el.classList.add('hidden');
  }
}

// ---------- FILTER ----------
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  if (navigator.vibrate) navigator.vibrate(15);
  renderGudangList();
}

// ---------- RENDER GUDANG ----------
// Catatan: tombol per-item cuma membawa ID barang lewat onclick (bukan
// seluruh data termasuk gambar). Data lengkapnya diambil dari gudangData
// saat tombol diklik. Ini penting karena imageUrl sekarang bisa berupa
// string Base64 yang panjang -- kalau ditempel ke atribut HTML langsung,
// halaman jadi berat dan gampang rusak.
function renderGudangList() {
  const list = document.getElementById('gudang-list');
  const empty = document.getElementById('gudang-empty');
  const queryText = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  let filtered = gudangData.filter(item => {
    if (queryText && !item.nama.toLowerCase().includes(queryText) && !(item.kategori || '').toLowerCase().includes(queryText)) return false;
    if (currentFilter === 'tersedia' && item.stok <= 0) return false;
    if (currentFilter === 'habis' && item.stok > 0) return false;
    return true;
  }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  document.getElementById('stat-total-items').textContent = gudangData.length;
  const lowCount = gudangData.filter(i => i.stok > 0 && i.stok <= 3).length;
  const lowWrap = document.getElementById('stat-low-stock-wrapper');
  if (lowCount > 0 && currentUser.role === 'admin') {
    lowWrap.classList.remove('hidden');
    document.getElementById('stat-low-stock').textContent = lowCount;
  } else {
    lowWrap.classList.add('hidden');
  }

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered.map((item, idx) => {
    const { id, nama, stok = 0, kategori = 'Lainnya', lokasi = '-', imageUrl = '' } = item;
    const pinjam = currentUser.role === 'user' ? (userPinjamanMap[id] || 0) : 0;
    const sN = escapeHTML(nama);
    const sK = escapeHTML(kategori);
    const sL = escapeHTML(lokasi);

    const badgeCls = stok === 0 ? 'badge-zero' : stok <= 3 ? 'badge-low' : 'badge-ok';
    const badgeLabel = stok === 0 ? 'Habis' : stok <= 3 ? `Sisa ${stok}` : `${stok}`;

    const imgUI = imageUrl
      ? `<img src="${imageUrl}" class="w-full h-full object-cover" loading="lazy">`
      : `<svg class="w-7 h-7" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`;

    let actionUI = '';
    if (currentUser.role === 'admin') {
      actionUI = `<button onclick="openBarangModal('${id}')" class="w-full py-3 text-sm font-bold rounded-2xl transition btn-edit">Edit Barang</button>`;
    } else {
      const pendingReturn = !!userPendingReturnMap[id];
      const returnDisabled = pinjam === 0 || pendingReturn;
      const pinjamDisabled = stok <= 0;
      const returnLabel = pendingReturn ? 'Menunggu' : (pinjam > 0 ? `Kembali (${pinjam})` : 'Kembali');
      const returnTitle = pendingReturn ? 'title="Menunggu persetujuan admin"' : '';
      actionUI = `
        <button onclick="kembalikanBarang('${id}', this)" ${returnTitle} class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-return${returnDisabled ? ' cursor-not-allowed' : ''}" ${returnDisabled ? 'disabled' : ''}>${returnLabel}</button>
        <button onclick="pinjamBarang('${id}', this)" class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-borrow${pinjamDisabled ? ' !bg-gray-100 !text-gray-400 !shadow-none' : ''}" ${pinjamDisabled ? 'disabled' : ''}>Pinjam</button>
      `;
    }

    return `
      <div class="inv-card card-in" style="animation-delay:${Math.min(idx * 35, 250)}ms">
        <div class="p-4 pb-3">
          <div class="flex items-start gap-3 mb-3">
            <div class="item-img-wrap">${imgUI}</div>
            <div class="flex-1 min-w-0 pt-0.5">
              <h4 class="font-black text-[15px] leading-snug truncate">${sN}</h4>
              <p class="text-[11px] font-bold mt-1 truncate" style="color:var(--text-3)">${sK}<span class="mx-1.5">·</span>${sL}</p>
            </div>
            <span class="text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 mt-0.5 ${badgeCls}">${badgeLabel}</span>
          </div>
        </div>
        <div class="border-t" style="border-color:var(--border)"></div>
        <div class="p-3 flex gap-2">${actionUI}</div>
      </div>
    `;
  }).join('');
}

// ---------- RENDER RIWAYAT ----------
function renderRiwayatList() {
  const list = document.getElementById('riwayat-list');
  const empty = document.getElementById('riwayat-empty');
  const pendingSection = document.getElementById('pending-requests-section');
  const pendingBadge = document.getElementById('pending-requests-badge');
  const pendingCount = document.getElementById('pending-requests-count');

  if (currentUser.role === 'admin') {
    pendingSection.classList.remove('hidden');
    if (pendingRequests.length > 0) {
      pendingBadge.classList.remove('hidden');
      pendingCount.textContent = pendingRequests.length;
      pendingSection.innerHTML = `
        <h4 class="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style="color:#D97706">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          Menunggu Persetujuan (${pendingRequests.length})
        </h4>
        <div class="space-y-3">
          ${pendingRequests.map(req => {
            const sU = escapeHTML(req.user);
            const sB = escapeHTML(req.barangNama);
            return `
              <div class="req-card fade-up">
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold" style="color:var(--text)"><span class="font-black text-amber-700">${sU}</span> ingin mengembalikan <span class="font-black">${sB}</span></p>
                    <p class="text-[10px] font-bold mt-0.5" style="color:var(--text-3)">${new Date(req.waktu).toLocaleString('id-ID')}</p>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <button onclick="approveReturn('${req.id}', this)" class="w-9 h-9 bg-green-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm" title="Setujui"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></button>
                    <button onclick="rejectReturn('${req.id}', this)" class="w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm" title="Tolak"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>`;
    } else {
      pendingBadge.classList.add('hidden');
      pendingSection.innerHTML = '';
    }
  } else {
    pendingSection.classList.add('hidden');
    pendingBadge.classList.add('hidden');
  }

  const sorted = [...riwayatData].sort((a, b) => (b.waktu || 0) - (a.waktu || 0));
  if (sorted.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const todayStr = new Date().toLocaleDateString('id-ID');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('id-ID');
  const grouped = {};
  sorted.forEach(data => {
    const dStr = new Date(data.waktu).toLocaleDateString('id-ID');
    let groupName = new Date(data.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (dStr === todayStr) groupName = 'Hari Ini';
    else if (dStr === yesterdayStr) groupName = 'Kemarin';
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(data);
  });

  list.innerHTML = Object.keys(grouped).map(group => `
    <div class="mb-5 fade-up">
      <p class="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style="color:var(--text-3)">${group}</p>
      <div class="space-y-2">
        ${grouped[group].map(data => {
          const isPinjam = data.aksi === 'pinjam';
          const isReject = data.aksi === 'tolak_kembali';
          const isReturn = data.aksi === 'kembali';
          const time = new Date(data.waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const iconBg = isPinjam ? '#EBF3FF' : isReject ? '#FEF2F2' : '#ECFDF5';
          const iconColor = isPinjam ? 'var(--blue)' : isReject ? '#EF4444' : 'var(--green)';
          const path = isPinjam ? 'M7 11l5-5m0 0l5 5m-5-5v12' : isReject ? 'M6 18L18 6M6 6l12 12' : 'M17 13l-5 5m0 0l-5-5m5 5V6';
          const word = isPinjam ? 'meminjam' : isReturn ? 'mengembalikan' : 'gagal mengembalikan';
          return `
            <div class="log-card">
              <div class="log-icon" style="background:${iconBg}">
                <svg class="w-4 h-4" style="color:${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="${path}"></path></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm leading-snug" style="color:var(--text-2)"><span class="font-black" style="color:var(--text)">${escapeHTML(data.user)}</span> ${word} <span class="font-bold" style="color:var(--text)">${escapeHTML(data.barang)}</span></p>
              </div>
              <p class="text-[11px] font-bold shrink-0" style="color:var(--text-3)">${time}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// ---------- RENDER PENGGUNA ----------
function renderPenggunaList() {
  const list = document.getElementById('pengguna-list');
  const empty = document.getElementById('pengguna-empty');
  if (usersData.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const colors = ['#0060DF', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2'];
  const sorted = [...usersData].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  list.innerHTML = sorted.map((u, i) => {
    const sN = escapeHTML(u.nama || '');
    const initial = (u.nama || '?')[0].toUpperCase();
    return `
      <div class="user-card card-in" style="animation-delay:${i * 40}ms">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style="background:${colors[i % colors.length]}"><span class="text-white font-black text-base">${initial}</span></div>
        <div class="flex-1 min-w-0">
          <p class="font-black text-[15px] truncate">${sN}</p>
          <div class="flex items-center gap-2 mt-1"><div class="pulse-dot"></div><p class="text-[10px] font-bold uppercase tracking-widest" style="color:var(--text-3)">Teknisi Aktif</p></div>
        </div>
        <button onclick="hapusPengguna('${u.id}')" class="w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-90 border" style="background:#FEF2F2;border-color:#FECACA">
          <svg class="w-5 h-5" style="color:#EF4444" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

// ---------- GAMBAR BARANG: KOMPRES KE BASE64 ----------
// Foto barang di-resize & dikompres di browser (pakai <canvas>) sebelum
// disimpan sebagai teks Base64 langsung ke field "imageUrl" di Firestore.
// Jadi tidak perlu Firebase Storage untuk foto barang.
function compressImageToDataURL(file, maxDim = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- PREVIEW GAMBAR BARANG ----------
function previewImage(input) {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  const hiddenUrl = document.getElementById('edit-image-url');

  if (!input.files || !input.files[0]) {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    return;
  }

  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar!', 'error');
    input.value = '';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast('Ukuran file gambar maksimal 8MB!', 'error');
    input.value = '';
    return;
  }

  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');

  compressImageToDataURL(file, 640, 0.72)
    .then(dataUrl => {
      if (dataUrl.length > MAX_ITEM_IMAGE_CHARS) {
        showToast('Gambar masih terlalu besar setelah dikompres, coba foto lain.', 'error');
        input.value = '';
        return;
      }
      hiddenUrl.value = dataUrl;
      preview.src = dataUrl;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    })
    .catch(err => {
      showToast('Gagal memproses gambar: ' + err.message, 'error');
      input.value = '';
    });
}

// ---------- LISTENER PINJAMAN ----------
function attachPinjamanListener(username) {
  if (unsubscribePinjaman) unsubscribePinjaman();
  if (!username) {
    userPinjamanMap = {};
    updatePinjamanDisplay();
    renderGudangList();
    return;
  }
  const q = db.collection('pinjaman').where('user', '==', username);
  unsubscribePinjaman = q.onSnapshot(snapshot => {
    const map = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      map[data.barangId] = (map[data.barangId] || 0) + (data.jumlah || 1);
    });
    userPinjamanMap = map;
    updatePinjamanDisplay();
    renderGudangList();
  }, err => showToast('Gagal memuat data pinjaman: ' + err.message, 'error'));
}

function attachUsersListener() {
  if (unsubscribeUsers) unsubscribeUsers();
  unsubscribeUsers = db.collection('users').onSnapshot(snapshot => {
    usersData = [];
    snapshot.forEach(doc => usersData.push({ id: doc.id, ...doc.data() }));
    renderPenggunaList();
  }, err => showToast('Gagal memuat akun teknisi: ' + err.message, 'error'));
}

function attachRequestsListener() {
  if (unsubscribeRequests) unsubscribeRequests();
  unsubscribeRequests = db.collection('return_requests').onSnapshot(snapshot => {
    pendingRequests = [];
    snapshot.forEach(doc => pendingRequests.push({ id: doc.id, ...doc.data() }));
    renderRiwayatList();
  }, err => showToast('Gagal memuat permintaan pengembalian: ' + err.message, 'error'));
}

// Khusus teknisi: pantau permintaan pengembalian miliknya sendiri yang masih
// pending, supaya tombol "Kembali" di kartu barang otomatis ter-kunci
// (bukan cuma sesaat lewat toast) selama masih menunggu persetujuan admin.
// Ini mencegah teknisi bisa spam klik "Kembalikan" berkali-kali untuk
// barang yang sama.
function attachMyReturnRequestsListener(username) {
  if (unsubscribeMyReturnRequests) unsubscribeMyReturnRequests();
  if (!username) {
    userPendingReturnMap = {};
    renderGudangList();
    return;
  }
  unsubscribeMyReturnRequests = db.collection('return_requests')
    .where('user', '==', username)
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      const map = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        map[data.barangId] = true;
      });
      userPendingReturnMap = map;
      renderGudangList();
    }, err => showToast('Gagal memuat status pengembalian: ' + err.message, 'error'));
}

// ---------- LOGIN ----------
function loginSuccess(name, role) {
  currentUser = { name, role };
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-role-badge').textContent = role === 'admin' ? 'Admin' : 'Teknisi';

  const isAdmin = role === 'admin';
  document.getElementById('btn-add').classList.toggle('hidden', !isAdmin);
  document.getElementById('btn-add').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('nav-pengguna').classList.toggle('hidden', !isAdmin);
  document.getElementById('btn-settings').classList.toggle('hidden', !isAdmin);
  document.getElementById('btn-settings').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('btn-clear-log').style.display = isAdmin ? 'flex' : 'none';

  if (isAdmin) {
    attachPinjamanListener(null);
    attachUsersListener();
    attachRequestsListener();
  } else {
    attachPinjamanListener(name);
    attachMyReturnRequestsListener(name);
  }

  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('password-container').classList.add('hidden');
  document.getElementById('login-error').classList.add('hidden');
  switchTab('gudang');
  showToast(`Selamat datang, ${escapeHTML(name)}!`, 'success');
}

async function handleLogin() {
  try {
    const rawUsername = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');

    if (!rawUsername) {
      showToast('Isi username dulu.', 'warning');
      return;
    }

    if (rawUsername.toLowerCase() === 'min') {
      const passContainer = document.getElementById('password-container');
      if (passContainer.classList.contains('hidden')) {
        passContainer.classList.remove('hidden');
        document.getElementById('password').focus();
        return;
      }
      if (passwordInput === 'aezakmi') {
        loginSuccess('Admin Utama', 'admin');
      } else {
        showToast('Password admin salah!', 'error');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        document.getElementById('password').value = '';
      }
      return;
    }

    setLoadingState('btn-login', true,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);

    const passContainer = document.getElementById('password-container');
    if (passContainer.classList.contains('hidden')) {
      passContainer.classList.remove('hidden');
      setLoadingState('btn-login', false,
        `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
      return;
    }

    if (!passwordInput) {
      showToast('Masukkan password!', 'warning');
      setLoadingState('btn-login', false,
        `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
      return;
    }

    const usersQuery = db.collection('users').where('nama', '==', rawUsername);
    const snapshot = await usersQuery.get();

    if (snapshot.empty) {
      errorEl.textContent = 'Username tidak terdaftar.';
      errorEl.classList.remove('hidden');
      setLoadingState('btn-login', false,
        `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
      return;
    }

    const userData = snapshot.docs[0].data();
    if (userData.password !== passwordInput) {
      errorEl.textContent = 'Password salah. Coba lagi.';
      errorEl.classList.remove('hidden');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setLoadingState('btn-login', false,
        `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
      return;
    }

    loginSuccess(rawUsername, 'user');
    setLoadingState('btn-login', false,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
    setLoadingState('btn-login', false,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);
  }
}

function handleLogout() {
  if (unsubscribePinjaman) unsubscribePinjaman();
  if (unsubscribeUsers) unsubscribeUsers();
  if (unsubscribeRequests) unsubscribeRequests();
  if (unsubscribeMyReturnRequests) unsubscribeMyReturnRequests();
  userPinjamanMap = {};
  userPendingReturnMap = {};
  usersData = [];
  pendingRequests = [];
  processingIds.clear();
  currentUser = { name: '', role: '' };
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}

// ---------- NAVIGASI TAB ----------
function switchTab(tab) {
  ['gudang', 'riwayat', 'pengguna'].forEach(t => {
    const view = document.getElementById(`${t}-view`);
    const nav = document.getElementById(`nav-${t}`);
    if (!view || !nav) return;
    const isActive = t === tab;
    view.classList.toggle('hidden', !isActive);
    nav.classList.toggle('active', isActive);
  });
  if (navigator.vibrate) navigator.vibrate(8);
}

// ---------- MODAL BARANG ----------
// Cukup diberi ID barang -- data lengkapnya (termasuk foto) diambil dari
// gudangData, tidak lagi lewat parameter onclick di HTML.
function openBarangModal(id = '') {
  if (currentUser.role !== 'admin') return;
  const item = id ? gudangData.find(b => b.id === id) : null;

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-nama').value = item ? item.nama : '';
  document.getElementById('edit-stok').value = item ? item.stok : '';
  document.getElementById('edit-kategori').value = item ? (item.kategori || 'Jaringan') : 'Jaringan';
  document.getElementById('edit-lokasi').value = item ? (item.lokasi || '') : '';
  document.getElementById('edit-image').value = '';
  document.getElementById('edit-image-url').value = (item && item.imageUrl) || '';

  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  if (item && item.imageUrl) {
    preview.src = item.imageUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.removeAttribute('src');
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  document.getElementById('modal-title').textContent = id ? 'Edit Barang' : 'Tambah Barang Baru';
  const deleteBtn = document.getElementById('modal-delete-btn');
  if (id) {
    deleteBtn.classList.remove('hidden');
    deleteBtn.setAttribute('data-delete-id', id);
    deleteBtn.setAttribute('data-delete-nama', item ? item.nama : '');
  } else {
    deleteBtn.classList.add('hidden');
  }
  document.getElementById('admin-modal').classList.remove('hidden');
}

function closeBarangModal() {
  document.getElementById('admin-modal').classList.add('hidden');
}

// Foto barang disimpan langsung sebagai Base64 (field imageUrl) di dokumen
// Firestore koleksi "gudang" -- sudah dikompres sebelumnya oleh previewImage().
// Tidak ada lagi upload ke Firebase Storage untuk foto barang.
async function saveBarang() {
  if (currentUser.role !== 'admin') return;

  const id = document.getElementById('edit-id').value;
  const nama = document.getElementById('edit-nama').value.trim();
  const stok = parseInt(document.getElementById('edit-stok').value, 10);
  const kategori = document.getElementById('edit-kategori').value;
  const lokasi = document.getElementById('edit-lokasi').value.trim() || '-';
  const imageUrl = document.getElementById('edit-image-url').value || '';

  if (!nama || isNaN(stok) || stok < 0) {
    showToast('Cek nama & stok!', 'warning');
    return;
  }
  if (imageUrl.length > MAX_ITEM_IMAGE_CHARS) {
    showToast('Gambar terlalu besar, pilih foto lain.', 'error');
    return;
  }

  setLoadingState('btn-save-modal', true, 'Simpan');
  try {
    const payload = { nama, stok, kategori, lokasi, imageUrl };
    if (id) {
      await db.collection('gudang').doc(id).update(payload);
    } else {
      await db.collection('gudang').add(payload);
    }
    showToast('Tersimpan!', 'success');
    closeBarangModal();
  } catch (e) {
    showToast(e.message || 'Gagal simpan.', 'error');
  } finally {
    setLoadingState('btn-save-modal', false, 'Simpan');
  }
}

async function hapusBarang(id, nama) {
  const ok = await showConfirmDialog(`Hapus ${escapeHTML(nama)}?`);
  if (!ok) return;
  try {
    await db.collection('gudang').doc(id).delete();
    showToast('Barang dihapus.', 'success');
  } catch (e) {
    showToast('Gagal hapus.', 'error');
  }
}

async function hapusDariModal() {
  const btn = document.getElementById('modal-delete-btn');
  const id = btn.getAttribute('data-delete-id');
  const nama = btn.getAttribute('data-delete-nama');
  closeBarangModal();
  await hapusBarang(id, nama);
}

// ---------- MODAL PENGGUNA ----------
function openUserModal() {
  if (currentUser.role !== 'admin') return;
  document.getElementById('new-user-nama').value = '';
  document.getElementById('new-user-password').value = '';
  document.getElementById('user-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('new-user-nama').focus(), 300);
}

function closeUserModal() {
  document.getElementById('user-modal').classList.add('hidden');
}

async function saveUser() {
  if (currentUser.role !== 'admin') return;
  const nama = document.getElementById('new-user-nama').value.trim();
  const password = document.getElementById('new-user-password').value.trim();

  if (!nama || nama.length < 2) {
    showToast('Nama min 2 karakter!', 'warning');
    return;
  }
  if (!password || password.length < 4) {
    showToast('Password min 4 karakter!', 'warning');
    return;
  }
  if (nama.toLowerCase() === 'min') {
    showToast('"min" reserved untuk Admin!', 'error');
    return;
  }

  const btnHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>Daftarkan`;
  setLoadingState('btn-save-user', true, btnHtml);

  try {
    const duplicate = await db.collection('users').where('nama', '==', nama).get();
    if (!duplicate.empty) {
      showToast(`"${nama}" sudah terdaftar!`, 'error');
      setLoadingState('btn-save-user', false, btnHtml);
      return;
    }
    await db.collection('users').add({ nama, password, createdAt: Date.now() });
    showToast(`Teknisi "${escapeHTML(nama)}" didaftarkan!`, 'success');
    closeUserModal();
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    setLoadingState('btn-save-user', false, btnHtml);
  }
}

// Cukup diberi ID akun -- nama diambil dari usersData untuk pesan konfirmasi.
async function hapusPengguna(id) {
  if (currentUser.role !== 'admin') return;
  const u = usersData.find(x => x.id === id);
  const nama = u ? u.nama : 'akun ini';
  const ok = await showConfirmDialog(`Hapus akun "${escapeHTML(nama)}"?`, 'Teknisi tidak bisa login setelah dihapus.');
  if (!ok) return;
  try {
    await db.collection('users').doc(id).delete();
    showToast(`Akun "${escapeHTML(nama)}" dihapus.`, 'success');
  } catch (e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}

// ---------- TRANSAKSI ----------
// Peminjaman terjadi langsung (tanpa approval admin) begitu teknisi klik
// "Pinjam" -- stok langsung berkurang. Pengembalian yang butuh approval admin.
//
// Semua fungsi transaksi di bawah ini dilindungi 3 lapis biar gak bisa
// di-spam-klik (misal double klik atau klik cepat berkali-kali):
//   1. processingIds -- kunci sementara di memori, mencegah fungsi yang sama
//      jalan dobel sebelum request sebelumnya selesai
//   2. tombol langsung di-disable begitu diklik (lewat parameter "btnEl")
//   3. Firestore transaction / pengecekan data terbaru sebelum menulis,
//      supaya gak terjadi race condition (misal 2 perangkat pinjam barang
//      yang sama persis di detik yang sama)
async function pinjamBarang(id, btnEl) {
  if (currentUser.role !== 'user') return;
  if (processingIds.has(id)) return;
  processingIds.add(id);
  if (btnEl) btnEl.disabled = true;
  if (navigator.vibrate) navigator.vibrate(20);
  try {
    let namaBarang = '';
    await db.runTransaction(async (tx) => {
      const barangRef = db.collection('gudang').doc(id);
      const barangSnap = await tx.get(barangRef);
      if (!barangSnap.exists) throw new Error('Barang tidak ditemukan.');
      const barang = barangSnap.data();
      if ((barang.stok || 0) <= 0) throw new Error('Stok barang sudah habis.');
      namaBarang = barang.nama;

      tx.update(barangRef, { stok: barang.stok - 1 });
      tx.set(db.collection('pinjaman').doc(), {
        user: currentUser.name,
        barangId: id,
        barangNama: barang.nama,
        jumlah: 1,
        waktu: Date.now()
      });
      tx.set(db.collection('riwayat').doc(), {
        user: currentUser.name,
        aksi: 'pinjam',
        barang: barang.nama,
        waktu: Date.now()
      });
    });
    showToast(`Dipinjam: ${escapeHTML(namaBarang)}`, 'success');
  } catch (e) {
    showToast(e.message || 'Transaksi gagal.', 'error');
  } finally {
    processingIds.delete(id);
    if (btnEl) btnEl.disabled = false;
  }
}

async function kembalikanBarang(id, btnEl) {
  if (currentUser.role !== 'user') return;
  if (processingIds.has(id)) return;
  processingIds.add(id);
  if (btnEl) btnEl.disabled = true;
  if (navigator.vibrate) navigator.vibrate(20);
  try {
    const item = gudangData.find(b => b.id === id);
    const namaBarang = item ? item.nama : 'Barang';

    // Pastikan user memang benar-benar sedang meminjam barang ini --
    // kalau tidak ada record pinjaman miliknya untuk barang ini, tolak.
    const pinjamanQuery = db.collection('pinjaman').where('user', '==', currentUser.name).where('barangId', '==', id);
    const pinjamanSnap = await pinjamanQuery.get();
    if (pinjamanSnap.empty) {
      showToast('Anda tidak sedang meminjam barang ini.', 'warning');
      return;
    }

    // Cegah spam: kalau sudah ada permintaan pengembalian yang masih
    // pending untuk barang ini, jangan buat permintaan baru lagi.
    const existingRequest = await db.collection('return_requests')
      .where('user', '==', currentUser.name)
      .where('barangId', '==', id)
      .where('status', '==', 'pending')
      .get();
    if (!existingRequest.empty) {
      showToast('Permintaan pengembalian barang ini masih menunggu persetujuan admin.', 'warning');
      return;
    }

    const pinjamanDoc = pinjamanSnap.docs[0];
    await db.collection('return_requests').add({
      user: currentUser.name,
      barangId: id,
      barangNama: namaBarang,
      jumlah: 1,
      pinjamanDocId: pinjamanDoc.id,
      waktu: Date.now(),
      status: 'pending'
    });
    showToast(`Permintaan pengembalian "${escapeHTML(namaBarang)}" dikirim.`, 'info');
  } catch (e) {
    showToast('Transaksi gagal: ' + e.message, 'error');
  } finally {
    processingIds.delete(id);
    if (btnEl) btnEl.disabled = false;
  }
}

// Cukup diberi requestId -- detail permintaan diambil dari Firestore saat
// eksekusi. Dilindungi processingIds + transaction supaya admin gak bisa
// tidak sengaja menyetujui permintaan yang sama dua kali (yang tadinya bisa
// bikin stok bertambah dobel).
async function approveReturn(requestId, btnEl) {
  if (currentUser.role !== 'admin') return;
  if (processingIds.has(requestId)) return;
  processingIds.add(requestId);
  if (btnEl) btnEl.disabled = true;
  try {
    let namaBarangHasil = '';
    await db.runTransaction(async (tx) => {
      const reqRef = db.collection('return_requests').doc(requestId);
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new Error('Request tidak ditemukan (mungkin sudah diproses).');
      const reqData = reqSnap.data();
      namaBarangHasil = reqData.barangNama;

      const barangRef = db.collection('gudang').doc(reqData.barangId);
      const barangSnap = await tx.get(barangRef);
      if (barangSnap.exists) {
        const currentStok = barangSnap.data().stok || 0;
        tx.update(barangRef, { stok: currentStok + (reqData.jumlah || 1) });
      }

      if (reqData.pinjamanDocId) {
        tx.delete(db.collection('pinjaman').doc(reqData.pinjamanDocId));
      }
      tx.set(db.collection('riwayat').doc(), {
        user: reqData.user,
        aksi: 'kembali',
        barang: reqData.barangNama,
        waktu: Date.now()
      });
      tx.delete(reqRef);
    });
    showToast(`Pengembalian "${escapeHTML(namaBarangHasil)}" disetujui.`, 'success');
  } catch (e) {
    showToast(e.message || 'Gagal memproses.', 'error');
  } finally {
    processingIds.delete(requestId);
    if (btnEl) btnEl.disabled = false;
  }
}

async function rejectReturn(requestId, btnEl) {
  if (currentUser.role !== 'admin') return;
  if (processingIds.has(requestId)) return;
  processingIds.add(requestId);
  if (btnEl) btnEl.disabled = true;
  try {
    const reqDoc = await db.collection('return_requests').doc(requestId).get();
    const reqData = reqDoc.exists ? reqDoc.data() : null;
    if (reqData) {
      await db.collection('riwayat').add({
        user: reqData.user,
        aksi: 'tolak_kembali',
        barang: reqData.barangNama,
        waktu: Date.now()
      });
    }
    await db.collection('return_requests').doc(requestId).delete();
    showToast('Pengembalian ditolak.', 'warning');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    processingIds.delete(requestId);
    if (btnEl) btnEl.disabled = false;
  }
}

// ---------- EVENT LISTENERS ----------
document.getElementById('confirm-yes').addEventListener('click', () => closeConfirmDialog(true));
document.getElementById('confirm-cancel').addEventListener('click', () => closeConfirmDialog(false));

['username', 'password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  });
});

['new-user-nama', 'new-user-password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveUser();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['admin-modal', 'user-modal', 'settings-modal'].forEach(id => {
      if (!document.getElementById(id).classList.contains('hidden')) {
        document.getElementById(id).classList.add('hidden');
      }
    });
    if (!document.getElementById('confirm-dialog').classList.contains('hidden')) {
      closeConfirmDialog(false);
    }
  }
});

// ---------- REAL-TIME LISTENERS ----------
db.collection('gudang').onSnapshot(snapshot => {
  gudangData = [];
  snapshot.forEach(doc => gudangData.push({ id: doc.id, ...doc.data() }));
  renderGudangList();
}, err => showToast('Gagal memuat data barang: ' + err.message, 'error'));

db.collection('riwayat').onSnapshot(snapshot => {
  riwayatData = [];
  snapshot.forEach(doc => riwayatData.push(doc.data()));
  renderRiwayatList();
}, err => showToast('Gagal memuat riwayat: ' + err.message, 'error'));

db.collection('settings').doc('appConfig').onSnapshot(snapshot => {
  applyLogo(snapshot.exists ? snapshot.data().logoUrl || '' : '');
}, err => console.warn('Gagal memuat pengaturan logo:', err.message));

// ---------- EXPOSE KE WINDOW ----------
window.escapeHTML = escapeHTML;
window.showToast = showToast;
window.setLoadingState = setLoadingState;
window.showConfirmDialog = showConfirmDialog;
window.closeConfirmDialog = closeConfirmDialog;
window.applyLogo = applyLogo;
window.previewLogoUpload = previewLogoUpload;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveLogo = saveLogo;
window.resetLogo = resetLogo;
window.clearAllLog = clearAllLog;
window.setFilter = setFilter;
window.renderGudangList = renderGudangList;
window.previewImage = previewImage;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.switchTab = switchTab;
window.openBarangModal = openBarangModal;
window.closeBarangModal = closeBarangModal;
window.saveBarang = saveBarang;
window.hapusBarang = hapusBarang;
window.hapusDariModal = hapusDariModal;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.hapusPengguna = hapusPengguna;
window.pinjamBarang = pinjamBarang;
window.kembalikanBarang = kembalikanBarang;
window.approveReturn = approveReturn;
window.rejectReturn = rejectReturn;
