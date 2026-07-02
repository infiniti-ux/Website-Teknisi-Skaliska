import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ---------- KONFIGURASI FIREBASE ----------
const firebaseConfig = {
  apiKey: "AIzaSyDw8AhXns--g4t_vKwI4QAHzw-pvu3OZjY",
  authDomain: "teknisi-skaliska.firebaseapp.com",
  projectId: "teknisi-skaliska",
  storageBucket: "teknisi-skaliska.appspot.com",   // ✅ SUDAH BENAR
  messagingSenderId: "736577586416",
  appId: "1:736577586416:web:cb8017132e829d92226e35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------- STATE GLOBAL ----------
let currentUser = { name: '', role: '' };
let gudangData = [];
let riwayatData = [];
let usersData = [];
let pendingRequests = [];
let userPinjamanMap = {};
let unsubscribePinjaman = null;
let unsubscribeUsers = null;
let unsubscribeRequests = null;
let confirmResolve = null;
let currentFilter = 'semua';
let pendingLogoFile = null;
let currentLogoUrl = '';

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
  if (confirmResolve) return Promise.resolve(false);
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
      img.src = '';
      svg.classList.remove('hidden');
    }
  });
}

function previewLogoUpload(input) {
  if (!input.files?.[0]) return;
  if (input.files[0].size > 2 * 1024 * 1024) {
    showToast('Logo maks 2MB!', 'error');
    input.value = '';
    return;
  }
  pendingLogoFile = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('settings-logo-img');
    const svg = document.getElementById('settings-logo-svg');
    img.src = e.target.result;
    img.classList.remove('hidden');
    svg.classList.add('hidden');
  };
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
    const storageRef = ref(storage, `settings/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, pendingLogoFile);
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
    const url = await getDownloadURL(uploadTask.snapshot.ref);
    await setDoc(doc(db, 'settings', 'appConfig'), { logoUrl: url }, { merge: true });
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
    await setDoc(doc(db, 'settings', 'appConfig'), { logoUrl: '' }, { merge: true });
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
    const snapshot = await getDocs(collection(db, 'riwayat'));
    await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'riwayat', d.id))));
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
  if (lowCount > 0) {
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
    const sI = imageUrl ? escapeHTML(imageUrl) : '';

    const badgeCls = stok === 0 ? 'badge-zero' : stok <= 3 ? 'badge-low' : 'badge-ok';
    const badgeLabel = stok === 0 ? 'Habis' : stok <= 3 ? `Sisa ${stok}` : `${stok}`;

    const imgUI = sI
      ? `<img src="${sI}" class="w-full h-full object-cover" loading="lazy">`
      : `<svg class="w-7 h-7" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`;

    let actionUI = '';
    if (currentUser.role === 'admin') {
      actionUI = `<button onclick="openBarangModal('${id}','${sN.replace(/'/g, "\\'")}',${stok},'${sK.replace(/'/g, "\\'")}','${sL.replace(/'/g, "\\'")}','${sI.replace(/'/g, "\\'")}')" class="w-full py-3 text-sm font-bold rounded-2xl transition btn-edit">Edit Barang</button>`;
    } else {
      const returnDisabled = pinjam === 0;
      const pinjamDisabled = stok <= 0;
      actionUI = `
        <button onclick="kembalikanBarang('${id}','${sN.replace(/'/g, "\\'")}',${stok})" class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-return${returnDisabled ? ' cursor-not-allowed' : ''}" ${returnDisabled ? 'disabled' : ''}>${pinjam > 0 ? `Kembali (${pinjam})` : 'Kembali'}</button>
        <button onclick="pinjamBarang('${id}','${sN.replace(/'/g, "\\'")}',${stok})" class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-borrow${pinjamDisabled ? ' !bg-gray-100 !text-gray-400 !shadow-none' : ''}" ${pinjamDisabled ? 'disabled' : ''}>Pinjam</button>
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
                    <button onclick="approveReturn('${req.id}','${sU.replace(/'/g, "\\'")}','${sB.replace(/'/g, "\\'")}','${req.barangId}',${req.jumlah})" class="w-9 h-9 bg-green-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm" title="Setujui"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></button>
                    <button onclick="rejectReturn('${req.id}','${sU.replace(/'/g, "\\'")}','${sB.replace(/'/g, "\\'")}','${req.barangId}')" class="w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm" title="Tolak"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
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
        <button onclick="hapusPengguna('${u.id}','${sN.replace(/'/g, "\\'")}')" class="w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-90 border" style="background:#FEF2F2;border-color:#FECACA">
          <svg class="w-5 h-5" style="color:#EF4444" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

// ---------- PREVIEW GAMBAR ----------
function previewImage(input) {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  if (input.files?.[0]) {
    if (input.files[0].size > 2 * 1024 * 1024) {
      showToast('Gambar maks 2MB!', 'error');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
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
  const q = query(collection(db, 'pinjaman'), where('user', '==', username));
  unsubscribePinjaman = onSnapshot(q, snapshot => {
    const map = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      map[data.barangId] = (map[data.barangId] || 0) + (data.jumlah || 1);
    });
    userPinjamanMap = map;
    updatePinjamanDisplay();
    renderGudangList();
  }, error => {
    console.error('Pinjaman listener error:', error);
    showToast('Gagal sinkronisasi pinjaman.', 'error');
  });
}

function attachUsersListener() {
  if (unsubscribeUsers) unsubscribeUsers();
  unsubscribeUsers = onSnapshot(collection(db, 'users'), snapshot => {
    usersData = [];
    snapshot.forEach(doc => usersData.push({ id: doc.id, ...doc.data() }));
    renderPenggunaList();
  }, error => {
    console.error('Users listener error:', error);
    showToast('Gagal sinkronisasi pengguna.', 'error');
  });
}

function attachRequestsListener() {
  if (unsubscribeRequests) unsubscribeRequests();
  unsubscribeRequests = onSnapshot(collection(db, 'return_requests'), snapshot => {
    pendingRequests = [];
    snapshot.forEach(doc => pendingRequests.push({ id: doc.id, ...doc.data() }));
    renderRiwayatList();
  }, error => {
    console.error('Requests listener error:', error);
    showToast('Gagal sinkronisasi permintaan.', 'error');
  });
}

// ---------- INISIALISASI ADMIN DEFAULT ----------
async function ensureAdminExists() {
  try {
    const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snapshot = await getDocs(adminQuery);
    if (snapshot.empty) {
      await addDoc(collection(db, 'users'), {
        nama: 'min',
        password: 'aezakmi',
        role: 'admin',
        createdAt: Date.now()
      });
      console.log('Admin default created: min / aezakmi');
    }
  } catch (e) {
    console.error('Gagal memastikan admin:', e);
  }
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

    const passContainer = document.getElementById('password-container');
    if (passContainer.classList.contains('hidden')) {
      passContainer.classList.remove('hidden');
      document.getElementById('password').focus();
      return;
    }

    if (!passwordInput) {
      showToast('Masukkan password!', 'warning');
      return;
    }

    setLoadingState('btn-login', true,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`);

    const usersQuery = query(collection(db, 'users'), where('nama', '==', rawUsername));
    const snapshot = await getDocs(usersQuery);

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

    loginSuccess(rawUsername, userData.role || 'user');
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
  userPinjamanMap = {};
  usersData = [];
  pendingRequests = [];
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
function openBarangModal(id = '', nama = '', stok = '', kategori = 'Jaringan', lokasi = '', imageUrl = '') {
  if (currentUser.role !== 'admin') return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-nama').value = nama;
  document.getElementById('edit-stok').value = stok;
  document.getElementById('edit-kategori').value = kategori;
  document.getElementById('edit-lokasi').value = lokasi;
  document.getElementById('edit-image').value = '';
  document.getElementById('edit-image-url').value = imageUrl || '';
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  if (imageUrl) {
    preview.src = imageUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
  document.getElementById('modal-title').textContent = id ? 'Edit Barang' : 'Tambah Barang Baru';
  const deleteBtn = document.getElementById('modal-delete-btn');
  if (id) {
    deleteBtn.classList.remove('hidden');
    deleteBtn.setAttribute('data-delete-id', id);
    deleteBtn.setAttribute('data-delete-nama', nama);
  } else {
    deleteBtn.classList.add('hidden');
  }
  document.getElementById('image-upload-progress-wrap').classList.add('hidden');
  document.getElementById('image-upload-bar').style.width = '0%';
  document.getElementById('image-upload-pct').textContent = '0%';
  document.getElementById('admin-modal').classList.remove('hidden');
}

function closeBarangModal() {
  document.getElementById('admin-modal').classList.add('hidden');
}

// *** saveBarang dengan progress upload gambar ***
async function saveBarang() {
  if (currentUser.role !== 'admin') return;

  const id = document.getElementById('edit-id').value;
  const nama = document.getElementById('edit-nama').value.trim();
  const stok = parseInt(document.getElementById('edit-stok').value);
  const kategori = document.getElementById('edit-kategori').value;
  const lokasi = document.getElementById('edit-lokasi').value.trim() || '-';
  const fileInput = document.getElementById('edit-image');
  let imageUrl = document.getElementById('edit-image-url').value;

  if (!nama || isNaN(stok) || stok < 0) {
    showToast('Cek nama & stok!', 'warning');
    return;
  }

  setLoadingState('btn-save-modal', true, 'Simpan');

  try {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) throw new Error('Gambar maks 2MB!');

      const progressWrap = document.getElementById('image-upload-progress-wrap');
      const progressBar = document.getElementById('image-upload-bar');
      const progressPct = document.getElementById('image-upload-pct');
      progressWrap.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressPct.textContent = '0%';

      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
      const storageRef = ref(storage, `inventory/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

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

      imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
      progressWrap.classList.add('hidden');
    }

    const payload = { nama, stok, kategori, lokasi, imageUrl };

    if (id) {
      await updateDoc(doc(db, 'gudang', id), payload);
    } else {
      await addDoc(collection(db, 'gudang'), payload);
    }

    showToast('Tersimpan!', 'success');
    closeBarangModal();
  } catch (e) {
    showToast(e.message || 'Gagal simpan.', 'error');
  } finally {
    const progressWrap = document.getElementById('image-upload-progress-wrap');
    if (progressWrap) progressWrap.classList.add('hidden');
    setLoadingState('btn-save-modal', false, 'Simpan');
  }
}

async function hapusBarang(id, nama) {
  const ok = await showConfirmDialog(`Hapus ${escapeHTML(nama)}?`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'gudang', id));
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

  const btnHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>Daftarkan`;
  setLoadingState('btn-save-user', true, btnHtml);

  try {
    const duplicate = await getDocs(query(collection(db, 'users'), where('nama', '==', nama)));
    if (!duplicate.empty) {
      showToast(`"${nama}" sudah terdaftar!`, 'error');
      setLoadingState('btn-save-user', false, btnHtml);
      return;
    }
    await addDoc(collection(db, 'users'), { nama, password, createdAt: Date.now() });
    showToast(`Teknisi "${escapeHTML(nama)}" didaftarkan!`, 'success');
    closeUserModal();
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    setLoadingState('btn-save-user', false, btnHtml);
  }
}

async function hapusPengguna(id, nama) {
  if (currentUser.role !== 'admin') return;
  if (nama === currentUser.name) {
    showToast('Tidak bisa menghapus akun sendiri!', 'warning');
    return;
  }
  const ok = await showConfirmDialog(`Hapus akun "${escapeHTML(nama)}"?`, 'Teknisi tidak bisa login setelah dihapus.');
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'users', id));
    showToast(`Akun "${escapeHTML(nama)}" dihapus.`, 'success');
  } catch (e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}

// ---------- TRANSAKSI (dengan increment) ----------
async function pinjamBarang(id, nama, stok) {
  if (currentUser.role !== 'user' || stok <= 0) return;
  if (navigator.vibrate) navigator.vibrate(20);
  try {
    await updateDoc(doc(db, 'gudang', id), { stok: increment(-1) });
    await addDoc(collection(db, 'pinjaman'), {
      user: currentUser.name,
      barangId: id,
      barangNama: nama,
      jumlah: 1,
      waktu: Date.now()
    });
    await addDoc(collection(db, 'riwayat'), {
      user: currentUser.name,
      aksi: 'pinjam',
      barang: nama,
      waktu: Date.now()
    });
    showToast(`Dipinjam: ${escapeHTML(nama)}`, 'success');
  } catch (e) {
    showToast('Transaksi gagal: ' + e.message, 'error');
  }
}

async function kembalikanBarang(id, nama, stok) {
  if (currentUser.role !== 'user') return;
  if (navigator.vibrate) navigator.vibrate(20);
  try {
    const pinjamanQuery = query(collection(db, 'pinjaman'), where('user', '==', currentUser.name), where('barangId', '==', id));
    const snapshot = await getDocs(pinjamanQuery);
    if (snapshot.empty) {
      showToast('Tidak ada pinjaman untuk barang ini.', 'warning');
      return;
    }
    const pinjamanDoc = snapshot.docs[0];
    await addDoc(collection(db, 'return_requests'), {
      user: currentUser.name,
      barangId: id,
      barangNama: nama,
      jumlah: 1,
      pinjamanDocId: pinjamanDoc.id,
      waktu: Date.now(),
      status: 'pending'
    });
    showToast(`Permintaan pengembalian "${escapeHTML(nama)}" dikirim.`, 'info');
  } catch (e) {
    showToast('Transaksi gagal: ' + e.message, 'error');
  }
}

async function approveReturn(requestId, user, barangNama, barangId, jumlah) {
  if (currentUser.role !== 'admin') return;
  try {
    const reqDoc = await getDoc(doc(db, 'return_requests', requestId));
    if (!reqDoc.exists()) {
      showToast('Request tidak ditemukan.', 'error');
      return;
    }
    const reqData = reqDoc.data();
    await deleteDoc(doc(db, 'pinjaman', reqData.pinjamanDocId));
    await updateDoc(doc(db, 'gudang', barangId), { stok: increment(jumlah || 1) });
    await addDoc(collection(db, 'riwayat'), {
      user: user,
      aksi: 'kembali',
      barang: barangNama,
      waktu: Date.now()
    });
    await deleteDoc(doc(db, 'return_requests', requestId));
    showToast(`Pengembalian "${escapeHTML(barangNama)}" disetujui.`, 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function rejectReturn(requestId, user, barangNama) {
  if (currentUser.role !== 'admin') return;
  try {
    await addDoc(collection(db, 'riwayat'), {
      user: user,
      aksi: 'tolak_kembali',
      barang: barangNama,
      waktu: Date.now()
    });
    await deleteDoc(doc(db, 'return_requests', requestId));
    showToast('Pengembalian ditolak.', 'warning');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
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

// ---------- REAL‑TIME LISTENERS (dengan retry terkendali) ----------
let gudangRetryCount = 0;
let riwayatRetryCount = 0;
let gudangToastShown = false;
let riwayatToastShown = false;

function startGudangListener() {
  return onSnapshot(collection(db, 'gudang'), snapshot => {
    gudangData = [];
    snapshot.forEach(doc => gudangData.push({ id: doc.id, ...doc.data() }));
    renderGudangList();
    gudangRetryCount = 0;
    gudangToastShown = false;
  }, error => {
    console.error('Gudang listener error:', error);
    if (!gudangToastShown) {
      showToast('Gagal sinkronisasi data barang. Periksa koneksi & aturan Firebase.', 'error');
      gudangToastShown = true;
    }
    const delay = Math.min(5000 * Math.pow(2, gudangRetryCount), 30000);
    gudangRetryCount++;
    setTimeout(startGudangListener, delay);
  });
}

function startRiwayatListener() {
  return onSnapshot(collection(db, 'riwayat'), snapshot => {
    riwayatData = [];
    snapshot.forEach(doc => riwayatData.push({ id: doc.id, ...doc.data() }));
    renderRiwayatList();
    riwayatRetryCount = 0;
    riwayatToastShown = false;
  }, error => {
    console.error('Riwayat listener error:', error);
    if (!riwayatToastShown) {
      showToast('Gagal sinkronisasi riwayat. Periksa aturan Firestore.', 'error');
      riwayatToastShown = true;
    }
    const delay = Math.min(5000 * Math.pow(2, riwayatRetryCount), 30000);
    riwayatRetryCount++;
    setTimeout(startRiwayatListener, delay);
  });
}

function startSettingsListener() {
  return onSnapshot(doc(db, 'settings', 'appConfig'), snapshot => {
    applyLogo(snapshot.exists() ? snapshot.data().logoUrl || '' : '');
  }, error => {
    console.error('Settings listener error:', error);
  });
}

// ---------- INISIALISASI APLIKASI ----------
(async () => {
  await ensureAdminExists();
  startGudangListener();
  startRiwayatListener();
  startSettingsListener();
})();

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
