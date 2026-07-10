import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==================== KONFIGURASI FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyDw8AhXns--g4t_vKwI4QAHzw-pvu3OZjY",
  authDomain: "teknisi-skaliska.firebaseapp.com",
  projectId: "teknisi-skaliska",
  storageBucket: "teknisi-skaliska.firebasestorage.app",
  messagingSenderId: "736577586416",
  appId: "1:736577586416:web:cb8017132e829d92226e35"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ==================== STATE GLOBAL ====================
let currentUser = { name: '', role: '' };
let gudangData = [], riwayatData = [], usersData = [], pendingRequests = [];
let userPinjamanMap = {};
let unsubscribers = { pinjaman: null, users: null, requests: null, logo: null };
let confirmResolve = null, currentFilter = 'semua', pendingLogoFile = null, currentLogoUrl = '';

// ==================== UTILS ====================
const $ = (id) => document.getElementById(id);
const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

const setLoading = (btn, loading, html) => {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg class="animate-spin h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="ml-2 font-bold">Proses...</span>`
    : html;
};

const showToast = (msg, type = 'info') => {
  const dotColors = { info: '#60A5FA', success: '#34D399', error: '#F87171', warning: '#FBBF24' };
  const el = document.createElement('div');
  el.className = 'toast-wrap toast-in pointer-events-auto';
  el.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:${dotColors[type]};flex-shrink:0"></div><span>${escapeHTML(msg)}</span>`;
  $('toast-container').appendChild(el);
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3000);
};

// ==================== KONFIRMASI ====================
const showConfirmDialog = (msg, detail = 'Tindakan ini permanen.') =>
  new Promise((resolve) => {
    if (confirmResolve) return resolve(false);
    $('confirm-message').textContent = msg;
    $('confirm-detail').textContent = detail;
    $('confirm-dialog').classList.remove('hidden');
    confirmResolve = resolve;
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
  });

const closeConfirmDialog = (result) => {
  $('confirm-dialog').classList.add('hidden');
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
};

// ==================== MODE TOGGLE ====================
function initLayoutMode() {
  const saved = localStorage.getItem('layoutMode');
  if (saved === 'desktop') {
    document.body.classList.add('desktop-mode');
    $('mode-icon-desktop').classList.remove('hidden');
    $('mode-icon-mobile').classList.add('hidden');
  }
}

function toggleLayoutMode() {
  document.body.classList.toggle('desktop-mode');
  const isDesktop = document.body.classList.contains('desktop-mode');
  localStorage.setItem('layoutMode', isDesktop ? 'desktop' : 'mobile');
  $('mode-icon-desktop').classList.toggle('hidden', !isDesktop);
  $('mode-icon-mobile').classList.toggle('hidden', isDesktop);
}

// ==================== LOGO ====================
function applyLogo(url) {
  currentLogoUrl = url || '';
  ['login', 'header', 'settings'].forEach((prefix) => {
    const svg = $(`${prefix}-logo-svg`),
      img = $(`${prefix}-logo-img`);
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

// ==================== RENDER ====================
function renderGudangList() {
  const list = $('gudang-list'),
    empty = $('gudang-empty');
  const q = ($('search-input')?.value || '').toLowerCase().trim();

  let filtered = gudangData
    .filter((item) => {
      if (q && !item.nama.toLowerCase().includes(q) && !(item.kategori || '').toLowerCase().includes(q)) return false;
      if (currentFilter === 'tersedia' && item.stok <= 0) return false;
      if (currentFilter === 'habis' && item.stok > 0) return false;
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  $('stat-total-items').textContent = gudangData.length;
  const low = gudangData.filter((i) => i.stok > 0 && i.stok <= 3).length;
  $('stat-low-stock-wrapper').classList.toggle('hidden', low === 0);
  if (low) $('stat-low-stock').textContent = low;

  empty.classList.toggle('hidden', filtered.length > 0);
  if (!filtered.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = filtered
    .map(
      (item, idx) => `
    <div class="inv-card card-in" style="animation-delay:${Math.min(idx * 35, 250)}ms">
      <div class="p-4 pb-3">
        <div class="flex items-start gap-3 mb-3">
          <div class="item-img-wrap">
            ${item.imageUrl ? `<img src="${item.imageUrl}" class="w-full h-full object-cover" loading="lazy">` : `<svg class="w-7 h-7" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`}
          </div>
          <div class="flex-1 min-w-0 pt-0.5">
            <h4 class="font-black text-[15px] leading-snug truncate">${escapeHTML(item.nama)}</h4>
            <p class="text-[11px] font-bold mt-1 truncate" style="color:var(--text-3)">${escapeHTML(item.kategori)}<span class="mx-1.5">·</span>${escapeHTML(item.lokasi)}</p>
          </div>
          <span class="text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 mt-0.5 ${item.stok === 0 ? 'badge-zero' : item.stok <= 3 ? 'badge-low' : 'badge-ok'}">${item.stok === 0 ? 'Habis' : item.stok <= 3 ? `Sisa ${item.stok}` : item.stok}</span>
        </div>
      </div>
      <div class="border-t" style="border-color:var(--border)"></div>
      <div class="p-3 flex gap-2">
        ${
          currentUser.role === 'admin'
            ? `<button onclick="openBarangModal('${item.id}','${escapeHTML(item.nama)}',${item.stok},'${escapeHTML(item.kategori)}','${escapeHTML(item.lokasi)}','${item.imageUrl || ''}')" class="w-full py-3 text-sm font-bold rounded-2xl transition btn-edit">Edit Barang</button>`
            : `<button onclick="kembalikanBarang('${item.id}','${escapeHTML(item.nama)}',${item.stok})" class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-return" ${(userPinjamanMap[item.id] || 0) === 0 ? 'disabled' : ''}>${(userPinjamanMap[item.id] || 0) > 0 ? `Kembali (${userPinjamanMap[item.id]})` : 'Kembali'}</button>
               <button onclick="pinjamBarang('${item.id}','${escapeHTML(item.nama)}',${item.stok})" class="flex-1 py-3 text-sm font-bold rounded-2xl transition btn-borrow" ${item.stok <= 0 ? 'disabled' : ''}>Pinjam</button>`
        }
      </div>
    </div>`
    )
    .join('');
}

function renderRiwayat() {
  const list = $('riwayat-list'),
    empty = $('riwayat-empty');

  // Pending requests
  if (currentUser.role === 'admin') {
    $('pending-requests-section').classList.remove('hidden');
    if (pendingRequests.length) {
      $('pending-requests-badge').classList.remove('hidden');
      $('pending-requests-count').textContent = pendingRequests.length;
      $('pending-requests-section').innerHTML = `
        <h4 class="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style="color:#D97706">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          Menunggu Persetujuan (${pendingRequests.length})
        </h4>
        <div class="space-y-3">
          ${pendingRequests
            .map(
              (req) => `
            <div class="req-card fade-up">
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold"><span class="font-black text-amber-700">${escapeHTML(req.user)}</span> ingin mengembalikan <span class="font-black">${escapeHTML(req.barangNama)}</span></p>
                  <p class="text-[10px] font-bold mt-0.5" style="color:var(--text-3)">${new Date(req.waktu).toLocaleString('id-ID')}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button onclick="approveReturn('${req.id}','${escapeHTML(req.user)}','${escapeHTML(req.barangNama)}','${req.barangId}',${req.jumlah})" class="w-9 h-9 bg-green-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></button>
                  <button onclick="rejectReturn('${req.id}','${escapeHTML(req.user)}','${escapeHTML(req.barangNama)}')" class="w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center transition active:scale-90 shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              </div>
            </div>`
            )
            .join('')}
        </div>`;
    } else {
      $('pending-requests-badge').classList.add('hidden');
      $('pending-requests-section').innerHTML = '';
    }
  } else {
    $('pending-requests-section').classList.add('hidden');
    $('pending-requests-badge').classList.add('hidden');
  }

  const sorted = [...riwayatData].sort((a, b) => (b.waktu || 0) - (a.waktu || 0));
  empty.classList.toggle('hidden', sorted.length > 0);
  if (!sorted.length) {
    list.innerHTML = '';
    return;
  }

  const groups = {};
  const today = new Date().toLocaleDateString('id-ID');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('id-ID');
  sorted.forEach((d) => {
    const ds = new Date(d.waktu).toLocaleDateString('id-ID');
    const key = ds === today ? 'Hari Ini' : ds === yesterday ? 'Kemarin' : new Date(d.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    (groups[key] = groups[key] || []).push(d);
  });

  list.innerHTML = Object.entries(groups)
    .map(
      ([group, items]) => `
    <div class="mb-5 fade-up">
      <p class="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style="color:var(--text-3)">${group}</p>
      <div class="space-y-2">
        ${items
          .map((d) => {
            const isPinjam = d.aksi === 'pinjam',
              isReject = d.aksi === 'tolak_kembali';
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
                  <p class="text-sm leading-snug" style="color:var(--text-2)"><span class="font-black" style="color:var(--text)">${escapeHTML(d.user)}</span> ${word} <span class="font-bold" style="color:var(--text)">${escapeHTML(d.barang)}</span></p>
                </div>
                <p class="text-[11px] font-bold shrink-0" style="color:var(--text-3)">${new Date(d.waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>`;
          })
          .join('')}
      </div>
    </div>`
    )
    .join('');
}

function renderPengguna() {
  const list = $('pengguna-list'),
    empty = $('pengguna-empty');
  if (!usersData.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = [...usersData]
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map(
      (u, i) => `
    <div class="user-card card-in" style="animation-delay:${i * 40}ms">
      <div class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style="background:${['#0060DF', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2'][i % 6]}"><span class="text-white font-black text-base">${(u.nama || '?')[0].toUpperCase()}</span></div>
      <div class="flex-1 min-w-0"><p class="font-black text-[15px] truncate">${escapeHTML(u.nama)}</p><div class="flex items-center gap-2 mt-1"><div class="pulse-dot"></div><p class="text-[10px] font-bold uppercase tracking-widest" style="color:var(--text-3)">Teknisi Aktif</p></div></div>
      <div class="flex gap-1">
        <button onclick="openUserModal('edit','${u.id}','${escapeHTML(u.nama)}','${escapeHTML(u.password || '')}')" class="w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-90 border bg-blue-50 border-blue-100"><svg class="w-4 h-4" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
        <button onclick="hapusPengguna('${u.id}','${escapeHTML(u.nama)}')" class="w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-90 border bg-red-50 border-red-100 ${u.nama === currentUser.name ? 'pointer-events-none opacity-50' : ''}" ${u.nama === currentUser.name ? 'disabled' : ''}><svg class="w-4 h-4" style="color:#EF4444" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
      </div>
    </div>`
    )
    .join('');
}

// ==================== MODAL PENGGUNA ====================
function openUserModal(mode = 'add', id = '', nama = '', password = '') {
  if (currentUser.role !== 'admin') return;
  $('edit-user-id').value = id;
  $('new-user-nama').value = nama;
  $('new-user-password').value = mode === 'edit' && password ? password : '';
  $('user-modal-title').textContent = mode === 'edit' ? 'Edit Teknisi' : 'Tambah Teknisi';
  $('btn-save-user-text').textContent = mode === 'edit' ? 'Update' : 'Daftarkan';
  $('password-hint').textContent = mode === 'edit' ? 'Kosongkan jika tidak ingin mengubah password.' : 'Password wajib diisi (min. 4 karakter).';
  $('user-modal').classList.remove('hidden');
  setTimeout(() => $('new-user-nama').focus(), 300);
}

function closeUserModal() {
  $('user-modal').classList.add('hidden');
}

async function saveUser() {
  if (currentUser.role !== 'admin') return;
  const id = $('edit-user-id').value;
  const nama = $('new-user-nama').value.trim();
  const password = $('new-user-password').value.trim();
  if (!nama || nama.length < 2) return showToast('Nama minimal 2 karakter!', 'warning');
  if (!id && (!password || password.length < 4)) return showToast('Password minimal 4 karakter!', 'warning');
  if (id && password && password.length < 4) return showToast('Password minimal 4 karakter!', 'warning');
  const btnHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>${id ? 'Update' : 'Daftarkan'}`;
  setLoading($('btn-save-user'), true, btnHtml);
  try {
    if (!id) {
      const dup = await getDocs(query(collection(db, 'users'), where('nama', '==', nama)));
      if (!dup.empty) return showToast(`"${nama}" sudah terdaftar!`, 'error'), setLoading($('btn-save-user'), false, btnHtml);
      await addDoc(collection(db, 'users'), { nama, password, createdAt: Date.now() });
    } else {
      const updateData = { nama };
      if (password) updateData.password = password;
      await updateDoc(doc(db, 'users', id), updateData);
    }
    showToast(id ? 'Akun diperbarui!' : `Teknisi "${nama}" didaftarkan!`, 'success');
    closeUserModal();
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    setLoading($('btn-save-user'), false, btnHtml);
  }
}

async function hapusPengguna(id, nama) {
  if (nama === currentUser.name) return showToast('Tidak bisa hapus akun sendiri!', 'warning');
  if (!(await showConfirmDialog(`Hapus akun "${nama}"?`))) return;
  try {
    await deleteDoc(doc(db, 'users', id));
    showToast(`Akun "${nama}" dihapus.`, 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

// ==================== MODAL BARANG ====================
function openBarangModal(id = '', nama = '', stok = '', kategori = 'Jaringan', lokasi = '', imageUrl = '') {
  if (currentUser.role !== 'admin') return;
  $('edit-id').value = id;
  $('edit-nama').value = nama;
  $('edit-stok').value = stok;
  $('edit-kategori').value = kategori;
  $('edit-lokasi').value = lokasi;
  $('edit-image-url').value = imageUrl;
  $('edit-image').value = '';
  const preview = $('image-preview'),
    placeholder = $('image-placeholder');
  if (imageUrl) {
    preview.src = imageUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
  $('modal-title').textContent = id ? 'Edit Barang' : 'Tambah Barang Baru';
  $('modal-delete-btn').classList.toggle('hidden', !id);
  if (id) {
    $('modal-delete-btn').dataset.deleteId = id;
    $('modal-delete-btn').dataset.deleteNama = nama;
  }
  $('image-upload-progress-wrap').classList.add('hidden');
  $('admin-modal').classList.remove('hidden');
}

function closeBarangModal() {
  $('admin-modal').classList.add('hidden');
}

async function saveBarang() {
  const id = $('edit-id').value,
    nama = $('edit-nama').value.trim(),
    stok = parseInt($('edit-stok').value),
    kategori = $('edit-kategori').value,
    lokasi = $('edit-lokasi').value.trim() || '-',
    fileInput = $('edit-image');
  let imageUrl = $('edit-image-url').value;
  if (!nama || isNaN(stok) || stok < 0) return showToast('Cek nama & stok!', 'warning');
  setLoading($('btn-save-modal'), true, 'Simpan');
  try {
    if (fileInput.files.length) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) throw new Error('Gambar maks 2MB!');
      const wrap = $('image-upload-progress-wrap'),
        bar = $('image-upload-bar'),
        pct = $('image-upload-pct');
      wrap.classList.remove('hidden');
      bar.style.width = '0%';
      pct.textContent = '0%';
      const storageRef = ref(storage, `inventory/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise((res, rej) =>
        task.on(
          'state_changed',
          (snap) => {
            const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            bar.style.width = p + '%';
            pct.textContent = p + '%';
          },
          rej,
          res
        )
      );
      imageUrl = await getDownloadURL(task.snapshot.ref);
      wrap.classList.add('hidden');
    }
    const payload = { nama, stok, kategori, lokasi, imageUrl };
    if (id) await updateDoc(doc(db, 'gudang', id), payload);
    else await addDoc(collection(db, 'gudang'), payload);
    showToast('Tersimpan!', 'success');
    closeBarangModal();
  } catch (e) {
    showToast(e.message || 'Gagal simpan.', 'error');
  } finally {
    $('image-upload-progress-wrap')?.classList.add('hidden');
    setLoading($('btn-save-modal'), false, 'Simpan');
  }
}

async function hapusDariModal() {
  const btn = $('modal-delete-btn');
  const id = btn.dataset.deleteId,
    nama = btn.dataset.deleteNama;
  closeBarangModal();
  if (await showConfirmDialog(`Hapus ${nama}?`)) {
    try {
      await deleteDoc(doc(db, 'gudang', id));
      showToast('Barang dihapus.', 'success');
    } catch (e) {
      showToast('Gagal hapus.', 'error');
    }
  }
}

// ==================== TRANSAKSI ====================
async function pinjamBarang(id, nama, stok) {
  if (currentUser.role !== 'user' || stok <= 0) return;
  try {
    await updateDoc(doc(db, 'gudang', id), { stok: increment(-1) });
    await addDoc(collection(db, 'pinjaman'), { user: currentUser.name, barangId: id, barangNama: nama, jumlah: 1, waktu: Date.now() });
    await addDoc(collection(db, 'riwayat'), { user: currentUser.name, aksi: 'pinjam', barang: nama, waktu: Date.now() });
    showToast(`Dipinjam: ${nama}`, 'success');
  } catch (e) {
    showToast('Transaksi gagal: ' + e.message, 'error');
  }
}

async function kembalikanBarang(id, nama) {
  if (currentUser.role !== 'user') return;
  const snap = await getDocs(query(collection(db, 'pinjaman'), where('user', '==', currentUser.name), where('barangId', '==', id)));
  if (snap.empty) return showToast('Tidak ada pinjaman.', 'warning');
  const docPinjam = snap.docs[0];
  await addDoc(collection(db, 'return_requests'), { user: currentUser.name, barangId: id, barangNama: nama, jumlah: 1, pinjamanDocId: docPinjam.id, waktu: Date.now(), status: 'pending' });
  showToast(`Permintaan pengembalian "${nama}" dikirim.`, 'info');
}

async function approveReturn(reqId, user, nama, barangId, jumlah) {
  if (currentUser.role !== 'admin') return;
  try {
    const req = await getDoc(doc(db, 'return_requests', reqId));
    if (!req.exists()) return showToast('Request tidak ditemukan.', 'error');
    const data = req.data();
    await deleteDoc(doc(db, 'pinjaman', data.pinjamanDocId));
    await updateDoc(doc(db, 'gudang', barangId), { stok: increment(jumlah || 1) });
    await addDoc(collection(db, 'riwayat'), { user, aksi: 'kembali', barang: nama, waktu: Date.now() });
    await deleteDoc(doc(db, 'return_requests', reqId));
    showToast(`Pengembalian "${nama}" disetujui.`, 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function rejectReturn(reqId, user, nama) {
  if (currentUser.role !== 'admin') return;
  await addDoc(collection(db, 'riwayat'), { user, aksi: 'tolak_kembali', barang: nama, waktu: Date.now() });
  await deleteDoc(doc(db, 'return_requests', reqId));
  showToast('Pengembalian ditolak.', 'warning');
}

// ==================== AUTH ====================
async function handleLogin() {
  const username = $('username').value.trim(),
    password = $('password').value.trim(),
    errorEl = $('login-error');
  errorEl.classList.add('hidden');
  if (!username) return showToast('Isi username dulu.', 'warning');
  const passContainer = $('password-container');
  if (passContainer.classList.contains('hidden')) {
    passContainer.classList.remove('hidden');
    $('password').focus();
    return;
  }
  if (!password) return showToast('Masukkan password!', 'warning');
  setLoading(
    $('btn-login'),
    true,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`
  );
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('nama', '==', username)));
    if (snap.empty) {
      errorEl.textContent = 'Username tidak terdaftar.';
      errorEl.classList.remove('hidden');
      return;
    }
    const userData = snap.docs[0].data();
    if (userData.password !== password) {
      errorEl.textContent = 'Password salah.';
      errorEl.classList.remove('hidden');
      return;
    }
    currentUser = { name: username, role: userData.role || 'user' };
    $('user-display-name').textContent = username;
    $('user-role-badge').textContent = currentUser.role === 'admin' ? 'Admin' : 'Teknisi';
    const isAdmin = currentUser.role === 'admin';
    ['btn-add', 'nav-pengguna', 'btn-settings', 'btn-clear-log'].forEach((id) => {
      const el = $(id);
      if (el) {
        el.classList.toggle('hidden', !isAdmin);
        el.style.display = isAdmin ? 'flex' : 'none';
      }
    });
    // Unsubscribe sebelumnya
    Object.values(unsubscribers).forEach((u) => u?.());
    if (isAdmin) {
      unsubscribers.users = onSnapshot(collection(db, 'users'), (snap) => {
        usersData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderPengguna();
      });
      unsubscribers.requests = onSnapshot(collection(db, 'return_requests'), (snap) => {
        pendingRequests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderRiwayat();
      });
      userPinjamanMap = {};
    } else {
      unsubscribers.pinjaman = onSnapshot(query(collection(db, 'pinjaman'), where('user', '==', username)), (snap) => {
        const map = {};
        snap.forEach((d) => {
          const data = d.data();
          map[data.barangId] = (map[data.barangId] || 0) + (data.jumlah || 1);
        });
        userPinjamanMap = map;
        renderGudangList();
      });
    }
    $('login-view').classList.add('hidden');
    $('app-view').classList.remove('hidden');
    ['username', 'password'].forEach((id) => ($(id).value = ''));
    passContainer.classList.add('hidden');
    switchTab('gudang');
    showToast(`Selamat datang, ${escapeHTML(username)}!`, 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    setLoading(
      $('btn-login'),
      false,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg><span>Masuk Sistem</span>`
    );
  }
}

function handleLogout() {
  Object.values(unsubscribers).forEach((u) => u?.());
  userPinjamanMap = {};
  usersData = [];
  pendingRequests = [];
  currentUser = { name: '', role: '' };
  $('login-view').classList.remove('hidden');
  $('app-view').classList.add('hidden');
}

// ==================== NAVIGASI ====================
function switchTab(tab) {
  ['gudang', 'riwayat', 'pengguna'].forEach((t) => {
    $(`${t}-view`).classList.toggle('hidden', t !== tab);
    $(`nav-${t}`).classList.toggle('active', t === tab);
  });
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-pill').forEach((b) => b.classList.toggle('active', b.dataset.filter === f));
  renderGudangList();
}

function previewImage(input) {
  if (!input.files?.[0]) return;
  if (input.files[0].size > 2 * 1024 * 1024) {
    showToast('Gambar maks 2MB!', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    $('image-preview').src = e.target.result;
    $('image-preview').classList.remove('hidden');
    $('image-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(input.files[0]);
}

// ==================== LOGO FUNCTIONS ====================
function previewLogoUpload(input) {
  if (!input.files?.[0]) return;
  if (input.files[0].size > 2 * 1024 * 1024) {
    showToast('Logo maks 2MB!', 'error');
    input.value = '';
    return;
  }
  pendingLogoFile = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    $('settings-logo-img').src = e.target.result;
    $('settings-logo-img').classList.remove('hidden');
    $('settings-logo-svg').classList.add('hidden');
  };
  reader.readAsDataURL(pendingLogoFile);
}

function openSettingsModal() {
  if (currentUser.role !== 'admin') return;
  pendingLogoFile = null;
  $('logo-file-input').value = '';
  $('logo-upload-progress-wrap').classList.add('hidden');
  if (currentLogoUrl) {
    $('settings-logo-img').src = currentLogoUrl;
    $('settings-logo-img').classList.remove('hidden');
    $('settings-logo-svg').classList.add('hidden');
  } else {
    $('settings-logo-img').classList.add('hidden');
    $('settings-logo-svg').classList.remove('hidden');
  }
  $('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  $('settings-modal').classList.add('hidden');
  pendingLogoFile = null;
}

async function saveLogo() {
  if (!pendingLogoFile) return showToast('Pilih file logo!', 'warning');
  const wrap = $('logo-upload-progress-wrap'),
    bar = $('logo-upload-bar'),
    pct = $('logo-upload-pct');
  wrap.classList.remove('hidden');
  setLoading(
    $('btn-save-logo'),
    true,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>Simpan Logo`
  );
  try {
    const fileName = `logo_${Date.now()}_${pendingLogoFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    const storageRef = ref(storage, `settings/${fileName}`);
    const task = uploadBytesResumable(storageRef, pendingLogoFile);
    await new Promise((res, rej) =>
      task.on(
        'state_changed',
        (snap) => {
          const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          bar.style.width = p + '%';
          pct.textContent = p + '%';
        },
        rej,
        res
      )
    );
    const url = await getDownloadURL(task.snapshot.ref);
    await setDoc(doc(db, 'settings', 'appConfig'), { logoUrl: url }, { merge: true });
    showToast('Logo diperbarui!', 'success');
    pendingLogoFile = null;
    closeSettingsModal();
  } catch (e) {
    showToast('Upload gagal: ' + e.message, 'error');
  } finally {
    wrap.classList.add('hidden');
    bar.style.width = '0%';
    setLoading(
      $('btn-save-logo'),
      false,
      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>Simpan Logo`
    );
  }
}

async function resetLogo() {
  if (!(await showConfirmDialog('Reset logo ke default?'))) return;
  try {
    await setDoc(doc(db, 'settings', 'appConfig'), { logoUrl: '' }, { merge: true });
    showToast('Logo direset.', 'success');
    closeSettingsModal();
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function clearAllLog() {
  if (currentUser.role !== 'admin') return;
  if (!(await showConfirmDialog('Hapus semua log?', `${riwayatData.length} entri akan dihapus permanen.`))) return;
  const btn = $('btn-clear-log');
  btn.disabled = true;
  try {
    const snap = await getDocs(collection(db, 'riwayat'));
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'riwayat', d.id))));
    showToast(`${snap.docs.length} log dihapus!`, 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  $('confirm-yes').addEventListener('click', () => closeConfirmDialog(true));
  $('confirm-cancel').addEventListener('click', () => closeConfirmDialog(false));
  ['username', 'password'].forEach((id) =>
    $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    })
  );
  ['new-user-nama', 'new-user-password'].forEach((id) =>
    $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveUser();
      }
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['admin-modal', 'user-modal', 'settings-modal'].forEach((id) => $(id).classList.add('hidden'));
      if (!$('confirm-dialog').classList.contains('hidden')) closeConfirmDialog(false);
    }
  });
  initLayoutMode();
});

// ==================== REAL-TIME LISTENERS (Umum) ====================
onSnapshot(collection(db, 'gudang'), (snap) => {
  gudangData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderGudangList();
});
onSnapshot(collection(db, 'riwayat'), (snap) => {
  riwayatData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderRiwayat();
});
onSnapshot(doc(db, 'settings', 'appConfig'), (snap) => applyLogo(snap.exists() ? snap.data().logoUrl : ''));

// ==================== INISIALISASI ADMIN ====================
(async () => {
  const adm = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
  if (adm.empty) await addDoc(collection(db, 'users'), { nama: 'min', password: 'aezakmi', role: 'admin', createdAt: Date.now() });
})();

// ==================== REGISTER WINDOW ====================
window.toggleLayoutMode = toggleLayoutMode;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.hapusPengguna = hapusPengguna;
window.openBarangModal = openBarangModal;
window.closeBarangModal = closeBarangModal;
window.saveBarang = saveBarang;
window.hapusDariModal = hapusDariModal;
window.pinjamBarang = pinjamBarang;
window.kembalikanBarang = kembalikanBarang;
window.approveReturn = approveReturn;
window.rejectReturn = rejectReturn;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.switchTab = switchTab;
window.setFilter = setFilter;
window.previewImage = previewImage;
window.renderGudangList = renderGudangList;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveLogo = saveLogo;
window.resetLogo = resetLogo;
window.previewLogoUpload = previewLogoUpload;
window.clearAllLog = clearAllLog;
window.showConfirmDialog = showConfirmDialog;
window.closeConfirmDialog = closeConfirmDialog;
window.escapeHTML = escapeHTML;
window.showToast = showToast;
