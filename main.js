/* ============================================================
   INVENTARIS TEKNISI — app.js
   ------------------------------------------------------------
   Struktur data di Firestore:

   koleksi "users"
     { username, password, nama, role: "admin" | "teknisi" }

   koleksi "barang"
     { nama, kode, kategori, kondisi, stokTotal, stokTersedia, foto }

   koleksi "peminjaman"
     { barangId, barangNama, barangKode,
       teknisiId, teknisiUsername, teknisiNama,
       status: "menunggu_pinjam" | "dipinjam" | "menunggu_kembali" | "selesai" | "ditolak",
       diajukanPinjamPada, disetujuiPinjamPada,
       diajukanKembaliPada, selesaiPada,
       catatanAdmin }
   ============================================================ */

/* ---------------- STATE ---------------- */
let currentUser = null;
let activeTab = null;
let unsubscribers = [];

let barangList = [];
let usersList = [];
let peminjamanList = [];

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2' y='2' width='20' height='20' rx='5' fill='%23EAF3FF'/%3E%3Cpath d='M7 9h10M7 12.5h10M7 16h6' stroke='%23AFCBEC' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E";

const STATUS_LABEL = {
  menunggu_pinjam: "Menunggu Persetujuan",
  dipinjam: "Sedang Dipinjam",
  menunggu_kembali: "Menunggu Persetujuan Pengembalian",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const STATUS_BADGE = {
  menunggu_pinjam: "badge-warning",
  dipinjam: "badge-info",
  menunggu_kembali: "badge-warning",
  selesai: "badge-success",
  ditolak: "badge-danger",
};

/* ---------------- HELPERS ---------------- */
function $(id) { return document.getElementById(id); }
function val(id) { return $(id).value; }

function formatTanggal(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showToast(message, type) {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = "toast show" + (type ? " " + type : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = "toast";
  }, 2800);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- MODAL ---------------- */
function showModal(html) {
  $("modal-root").innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-card" data-stop="1">' + html + "</div>" +
    "</div>";
}
function closeModal() {
  $("modal-root").innerHTML = "";
}

/* ---------------- LOGIN / LOGOUT ---------------- */
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = val("login-username").trim();
  const password = val("login-password");
  const errEl = $("login-error");
  const btn = $("login-btn");
  errEl.textContent = "";

  if (!username || !password) return;

  btn.disabled = true;
  btn.textContent = "Memeriksa...";

  try {
    const snap = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snap.empty) {
      errEl.textContent = "Username tidak ditemukan.";
      return;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    if (data.password !== password) {
      errEl.textContent = "Password salah.";
      return;
    }
    currentUser = {
      id: docSnap.id,
      username: data.username,
      nama: data.nama || data.username,
      role: data.role,
    };
    localStorage.setItem("inventaris_user", JSON.stringify(currentUser));
    startApp();
  } catch (err) {
    errEl.textContent = "Gagal masuk: " + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk";
  }
});

$("logout-btn").addEventListener("click", () => {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  currentUser = null;
  activeTab = null;
  localStorage.removeItem("inventaris_user");
  $("login-form").reset();
  $("login-error").textContent = "";
  $("app-screen").classList.remove("active");
  $("login-screen").classList.add("active");
});

/* ---------------- START APP ---------------- */
function startApp() {
  $("login-screen").classList.remove("active");
  $("app-screen").classList.add("active");
  $("current-user-info").textContent =
    currentUser.nama + " \u2014 " + (currentUser.role === "admin" ? "Admin" : "Teknisi");

  renderTabs();
  attachListeners();
}

function renderTabs() {
  const tabs =
    currentUser.role === "admin"
      ? [
          { id: "barang", label: "Barang" },
          { id: "approval-pinjam", label: "Persetujuan Pinjam" },
          { id: "approval-kembali", label: "Persetujuan Kembali" },
          { id: "akun", label: "Akun Teknisi" },
          { id: "riwayat", label: "Riwayat" },
        ]
      : [
          { id: "barang", label: "Daftar Barang" },
          { id: "peminjaman-saya", label: "Peminjaman Saya" },
        ];

  const tabsEl = $("tabs");
  tabsEl.innerHTML = tabs
    .map((t) => '<button class="tab-btn" data-tab="' + t.id + '">' + t.label + "</button>")
    .join("");

  tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  switchTab(tabs[0].id);
}

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  renderMainContent();
}

/* ---------------- FIRESTORE LISTENERS ---------------- */
function attachListeners() {
  unsubscribers.push(
    db.collection("barang").orderBy("nama").onSnapshot(
      (snap) => {
        barangList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderMainContent();
      },
      (err) => showToast("Gagal memuat barang: " + err.message, "error")
    )
  );

  unsubscribers.push(
    db.collection("peminjaman").orderBy("diajukanPinjamPada", "desc").onSnapshot(
      (snap) => {
        peminjamanList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderMainContent();
      },
      (err) => showToast("Gagal memuat data peminjaman: " + err.message, "error")
    )
  );

  if (currentUser.role === "admin") {
    unsubscribers.push(
      db.collection("users").where("role", "==", "teknisi").onSnapshot(
        (snap) => {
          usersList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          renderMainContent();
        },
        (err) => showToast("Gagal memuat akun teknisi: " + err.message, "error")
      )
    );
  }
}

/* ---------------- RENDER ROUTER ---------------- */
function renderMainContent() {
  if (!currentUser) return;
  switch (activeTab) {
    case "barang":
      renderBarangView();
      break;
    case "approval-pinjam":
      renderApprovalPinjamView();
      break;
    case "approval-kembali":
      renderApprovalKembaliView();
      break;
    case "akun":
      renderAkunView();
      break;
    case "riwayat":
      renderRiwayatView();
      break;
    case "peminjaman-saya":
      renderPeminjamanSayaView();
      break;
  }
}

/* ================= VIEW: BARANG ================= */
function renderBarangView() {
  const isAdmin = currentUser.role === "admin";
  const main = $("main-content");

  let html = '<div class="section-head"><h2>' + (isAdmin ? "Barang Inventaris" : "Daftar Barang") + "</h2>";
  if (isAdmin) {
    html += '<button class="btn btn-primary btn-small" data-action="tambah-barang">Tambah Barang</button>';
  }
  html += "</div>";

  if (barangList.length === 0) {
    html += '<div class="empty-state">Belum ada barang.</div>';
  } else {
    html += barangList
      .map((b) => {
        const foto = b.foto ? escapeHtml(b.foto) : PLACEHOLDER_IMG;
        let actions = "";
        if (isAdmin) {
          actions =
            '<button class="btn btn-ghost btn-small" data-action="edit-barang" data-id="' + b.id + '">Edit</button>' +
            '<button class="btn btn-ghost btn-small" data-action="hapus-barang" data-id="' + b.id + '">Hapus</button>';
        } else {
          const habis = (b.stokTersedia ?? 0) <= 0;
          actions =
            '<button class="btn btn-primary btn-small" data-action="pinjam" data-id="' + b.id + '" ' +
            (habis ? "disabled" : "") + ">" + (habis ? "Stok Habis" : "Pinjam") + "</button>";
        }
        return (
          '<div class="item-card">' +
          '<img class="item-thumb" src="' + foto + '" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'" alt="" />' +
          '<div class="item-info">' +
          "<strong>" + escapeHtml(b.nama) + "</strong>" +
          '<span class="item-meta">' + escapeHtml(b.kode || "-") + " \u00b7 " + escapeHtml(b.kategori || "-") + "</span>" +
          '<span class="badge badge-neutral" style="margin-top:4px">' + escapeHtml(b.kondisi || "-") + "</span>" +
          "</div>" +
          '<div class="item-stock"><b>' + (b.stokTersedia ?? 0) + "/" + (b.stokTotal ?? 0) + "</b>tersedia</div>" +
          '<div class="item-actions">' + actions + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  main.innerHTML = html;
}

function openBarangForm(existing) {
  const isEdit = !!existing;
  showModal(
    "<h2>" + (isEdit ? "Edit Barang" : "Tambah Barang") + "</h2>" +
    '<form id="barang-form">' +
    '<div class="f-group"><label>Nama Barang</label><input type="text" id="bf-nama" required value="' + escapeHtml(existing?.nama) + '" /></div>' +
    '<div class="field-row">' +
    '<div class="f-group"><label>Kode / SN</label><input type="text" id="bf-kode" value="' + escapeHtml(existing?.kode) + '" /></div>' +
    '<div class="f-group"><label>Kategori</label><input type="text" id="bf-kategori" value="' + escapeHtml(existing?.kategori) + '" /></div>' +
    "</div>" +
    '<div class="field-row">' +
    '<div class="f-group"><label>Kondisi</label><select id="bf-kondisi">' +
    ["Baik", "Rusak Ringan", "Rusak Berat"]
      .map((k) => '<option value="' + k + '" ' + (existing?.kondisi === k ? "selected" : "") + ">" + k + "</option>")
      .join("") +
    "</select></div>" +
    '<div class="f-group"><label>Jumlah Stok</label><input type="number" min="0" id="bf-stok" required value="' +
    (existing ? existing.stokTotal : 1) + '" /></div>' +
    "</div>" +
    '<div class="f-group"><label>Nama File Gambar (opsional)</label>' +
    '<input type="text" id="bf-foto" placeholder="contoh: obeng.jpg" value="' + escapeHtml(existing?.foto) + '" />' +
    '<span class="hint">Taruh file gambar ini di folder yang sama dengan index.html di Android Studio (folder assets).</span>' +
    "</div>" +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>' +
    '<button type="submit" class="btn btn-primary">' + (isEdit ? "Simpan Perubahan" : "Tambah") + "</button>" +
    "</div>" +
    "</form>"
  );

  $("barang-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const stokTotal = parseInt(val("bf-stok"), 10) || 0;
    const data = {
      nama: val("bf-nama").trim(),
      kode: val("bf-kode").trim(),
      kategori: val("bf-kategori").trim(),
      kondisi: val("bf-kondisi"),
      foto: val("bf-foto").trim(),
      stokTotal: stokTotal,
    };
    try {
      if (isEdit) {
        const stokTerpakai = existing.stokTotal - existing.stokTersedia;
        data.stokTersedia = Math.max(0, stokTotal - stokTerpakai);
        await db.collection("barang").doc(existing.id).update(data);
        showToast("Barang berhasil diperbarui", "success");
      } else {
        data.stokTersedia = stokTotal;
        data.dibuatPada = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("barang").add(data);
        showToast("Barang berhasil ditambahkan", "success");
      }
      closeModal();
    } catch (err) {
      showToast("Gagal menyimpan barang: " + err.message, "error");
    }
  });
}

async function hapusBarang(id) {
  if (!confirm("Hapus barang ini? Tindakan tidak dapat dibatalkan.")) return;
  try {
    await db.collection("barang").doc(id).delete();
    showToast("Barang dihapus", "success");
  } catch (err) {
    showToast("Gagal menghapus: " + err.message, "error");
  }
}

async function ajukanPinjam(barangId) {
  const barang = barangList.find((b) => b.id === barangId);
  if (!barang || (barang.stokTersedia ?? 0) <= 0) {
    showToast("Stok barang tidak tersedia", "error");
    return;
  }
  try {
    await db.collection("peminjaman").add({
      barangId: barang.id,
      barangNama: barang.nama,
      barangKode: barang.kode || "",
      teknisiId: currentUser.id,
      teknisiUsername: currentUser.username,
      teknisiNama: currentUser.nama,
      status: "menunggu_pinjam",
      diajukanPinjamPada: firebase.firestore.FieldValue.serverTimestamp(),
      disetujuiPinjamPada: null,
      diajukanKembaliPada: null,
      selesaiPada: null,
      catatanAdmin: "",
    });
    showToast("Permohonan peminjaman diajukan, menunggu persetujuan admin", "success");
  } catch (err) {
    showToast("Gagal mengajukan peminjaman: " + err.message, "error");
  }
}

/* ================= VIEW: AKUN TEKNISI (ADMIN) ================= */
function renderAkunView() {
  const main = $("main-content");
  let html =
    '<div class="section-head"><h2>Akun Teknisi</h2>' +
    '<button class="btn btn-primary btn-small" data-action="tambah-teknisi">Tambah Akun</button></div>';

  if (usersList.length === 0) {
    html += '<div class="empty-state">Belum ada akun teknisi.</div>';
  } else {
    html += usersList
      .map(
        (u) =>
          '<div class="list-row">' +
          '<div class="list-row-top">' +
          '<div><div class="list-row-title">' + escapeHtml(u.nama) + '</div>' +
          '<div class="list-row-sub">Username: ' + escapeHtml(u.username) + "</div></div>" +
          '<span class="badge badge-info">Teknisi</span>' +
          "</div>" +
          '<div class="list-row-actions">' +
          '<button class="btn btn-ghost btn-small" data-action="edit-teknisi" data-id="' + u.id + '">Edit</button>' +
          '<button class="btn btn-ghost btn-small" data-action="hapus-teknisi" data-id="' + u.id + '">Hapus</button>' +
          "</div>" +
          "</div>"
      )
      .join("");
  }
  main.innerHTML = html;
}

function openTeknisiForm(existing) {
  const isEdit = !!existing;
  showModal(
    "<h2>" + (isEdit ? "Edit Akun Teknisi" : "Tambah Akun Teknisi") + "</h2>" +
    '<form id="teknisi-form">' +
    '<div class="f-group"><label>Nama Lengkap</label><input type="text" id="tf-nama" required value="' + escapeHtml(existing?.nama) + '" /></div>' +
    '<div class="f-group"><label>Username</label><input type="text" id="tf-username" required value="' + escapeHtml(existing?.username) + '" /></div>' +
    '<div class="f-group"><label>Password</label><input type="text" id="tf-password" required value="' + escapeHtml(existing?.password) + '" />' +
    '<span class="hint">Password ditampilkan sebagai teks biasa agar mudah dikelola admin.</span></div>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>' +
    '<button type="submit" class="btn btn-primary">' + (isEdit ? "Simpan Perubahan" : "Tambah") + "</button>" +
    "</div>" +
    "</form>"
  );

  $("teknisi-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      nama: val("tf-nama").trim(),
      username: val("tf-username").trim(),
      password: val("tf-password"),
      role: "teknisi",
    };
    try {
      const dupSnap = await db.collection("users").where("username", "==", data.username).get();
      const conflict = dupSnap.docs.find((d) => d.id !== (existing ? existing.id : null));
      if (conflict) {
        showToast("Username sudah dipakai akun lain", "error");
        return;
      }
      if (isEdit) {
        await db.collection("users").doc(existing.id).update(data);
        showToast("Akun teknisi diperbarui", "success");
      } else {
        await db.collection("users").add(data);
        showToast("Akun teknisi ditambahkan", "success");
      }
      closeModal();
    } catch (err) {
      showToast("Gagal menyimpan akun: " + err.message, "error");
    }
  });
}

async function hapusTeknisi(id) {
  if (!confirm("Hapus akun teknisi ini?")) return;
  try {
    await db.collection("users").doc(id).delete();
    showToast("Akun teknisi dihapus", "success");
  } catch (err) {
    showToast("Gagal menghapus akun: " + err.message, "error");
  }
}

/* ================= VIEW: PERSETUJUAN PEMINJAMAN (ADMIN) ================= */
function renderApprovalPinjamView() {
  const main = $("main-content");
  const list = peminjamanList.filter((p) => p.status === "menunggu_pinjam");
  let html = '<div class="section-head"><h2>Persetujuan Peminjaman</h2></div>';

  if (list.length === 0) {
    html += '<div class="empty-state">Tidak ada permohonan peminjaman yang menunggu.</div>';
  } else {
    html += list.map((p) => renderPeminjamanRow(p, "admin-pinjam")).join("");
  }
  main.innerHTML = html;
}

/* ================= VIEW: PERSETUJUAN PENGEMBALIAN (ADMIN) ================= */
function renderApprovalKembaliView() {
  const main = $("main-content");
  const list = peminjamanList.filter((p) => p.status === "menunggu_kembali");
  let html = '<div class="section-head"><h2>Persetujuan Pengembalian</h2></div>';

  if (list.length === 0) {
    html += '<div class="empty-state">Tidak ada permohonan pengembalian yang menunggu.</div>';
  } else {
    html += list.map((p) => renderPeminjamanRow(p, "admin-kembali")).join("");
  }
  main.innerHTML = html;
}

/* ================= VIEW: RIWAYAT (ADMIN) ================= */
function renderRiwayatView() {
  const main = $("main-content");
  let html = '<div class="section-head"><h2>Riwayat Peminjaman</h2></div>';

  if (peminjamanList.length === 0) {
    html += '<div class="empty-state">Belum ada riwayat.</div>';
  } else {
    html += peminjamanList.map((p) => renderPeminjamanRow(p, "riwayat")).join("");
  }
  main.innerHTML = html;
}

/* ================= VIEW: PEMINJAMAN SAYA (TEKNISI) ================= */
function renderPeminjamanSayaView() {
  const main = $("main-content");
  const list = peminjamanList.filter((p) => p.teknisiId === currentUser.id);
  let html = '<div class="section-head"><h2>Peminjaman Saya</h2></div>';

  if (list.length === 0) {
    html += '<div class="empty-state">Anda belum pernah mengajukan peminjaman.</div>';
  } else {
    html += list.map((p) => renderPeminjamanRow(p, "teknisi")).join("");
  }
  main.innerHTML = html;
}

/* ---------------- ROW RENDERER (dipakai di semua view peminjaman) ---------------- */
function renderPeminjamanRow(p, context) {
  const badgeClass = STATUS_BADGE[p.status] || "badge-neutral";
  const badgeLabel = STATUS_LABEL[p.status] || p.status;

  let meta = '<span>Diajukan: ' + formatTanggal(p.diajukanPinjamPada) + "</span>";
  if (p.disetujuiPinjamPada) meta += '<span>Disetujui: ' + formatTanggal(p.disetujuiPinjamPada) + "</span>";
  if (p.diajukanKembaliPada) meta += '<span>Ajukan Kembali: ' + formatTanggal(p.diajukanKembaliPada) + "</span>";
  if (p.selesaiPada) meta += '<span>Selesai: ' + formatTanggal(p.selesaiPada) + "</span>";

  let actions = "";
  if (context === "admin-pinjam") {
    actions =
      '<button class="btn btn-primary btn-small" data-action="approve-pinjam" data-id="' + p.id + '">Setujui</button>' +
      '<button class="btn btn-danger btn-small" data-action="tolak-pinjam" data-id="' + p.id + '">Tolak</button>';
  } else if (context === "admin-kembali") {
    actions =
      '<button class="btn btn-primary btn-small" data-action="approve-kembali" data-id="' + p.id + '">Setujui Pengembalian</button>' +
      '<button class="btn btn-danger btn-small" data-action="tolak-kembali" data-id="' + p.id + '">Tolak</button>';
  } else if (context === "teknisi" && p.status === "dipinjam") {
    actions = '<button class="btn btn-primary btn-small" data-action="ajukan-kembali" data-id="' + p.id + '">Kembalikan</button>';
  }

  const subInfo =
    context === "teknisi"
      ? escapeHtml(p.barangKode || "-")
      : "Teknisi: " + escapeHtml(p.teknisiNama || p.teknisiUsername || "-");

  return (
    '<div class="list-row">' +
    '<div class="list-row-top">' +
    '<div><div class="list-row-title">' + escapeHtml(p.barangNama) + '</div>' +
    '<div class="list-row-sub">' + subInfo + "</div></div>" +
    '<span class="badge ' + badgeClass + '">' + badgeLabel + "</span>" +
    "</div>" +
    '<div class="list-row-meta">' + meta + "</div>" +
    (p.catatanAdmin ? '<div class="list-row-sub">Catatan admin: ' + escapeHtml(p.catatanAdmin) + "</div>" : "") +
    (actions ? '<div class="list-row-actions">' + actions + "</div>" : "") +
    "</div>"
  );
}

/* ---------------- AKSI PERSETUJUAN (TRANSACTION) ---------------- */
async function approvePinjam(id) {
  try {
    await db.runTransaction(async (tx) => {
      const pinjamRef = db.collection("peminjaman").doc(id);
      const pinjamSnap = await tx.get(pinjamRef);
      if (!pinjamSnap.exists) throw new Error("Data peminjaman tidak ditemukan");
      const pinjam = pinjamSnap.data();
      if (pinjam.status !== "menunggu_pinjam") throw new Error("Status sudah berubah");

      const barangRef = db.collection("barang").doc(pinjam.barangId);
      const barangSnap = await tx.get(barangRef);
      if (!barangSnap.exists) throw new Error("Barang tidak ditemukan");
      const barang = barangSnap.data();
      if ((barang.stokTersedia ?? 0) <= 0) throw new Error("Stok barang habis");

      tx.update(barangRef, { stokTersedia: barang.stokTersedia - 1 });
      tx.update(pinjamRef, {
        status: "dipinjam",
        disetujuiPinjamPada: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    showToast("Peminjaman disetujui", "success");
  } catch (err) {
    showToast("Gagal menyetujui: " + err.message, "error");
  }
}

async function tolakPinjam(id) {
  const alasan = prompt("Alasan penolakan (opsional):", "") || "";
  try {
    await db.collection("peminjaman").doc(id).update({
      status: "ditolak",
      catatanAdmin: alasan,
    });
    showToast("Peminjaman ditolak", "success");
  } catch (err) {
    showToast("Gagal menolak: " + err.message, "error");
  }
}

async function ajukanKembali(id) {
  try {
    await db.collection("peminjaman").doc(id).update({
      status: "menunggu_kembali",
      diajukanKembaliPada: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast("Pengembalian diajukan, menunggu persetujuan admin", "success");
  } catch (err) {
    showToast("Gagal mengajukan pengembalian: " + err.message, "error");
  }
}

async function approveKembali(id) {
  try {
    await db.runTransaction(async (tx) => {
      const pinjamRef = db.collection("peminjaman").doc(id);
      const pinjamSnap = await tx.get(pinjamRef);
      if (!pinjamSnap.exists) throw new Error("Data peminjaman tidak ditemukan");
      const pinjam = pinjamSnap.data();
      if (pinjam.status !== "menunggu_kembali") throw new Error("Status sudah berubah");

      const barangRef = db.collection("barang").doc(pinjam.barangId);
      const barangSnap = await tx.get(barangRef);
      if (barangSnap.exists) {
        const barang = barangSnap.data();
        tx.update(barangRef, { stokTersedia: (barang.stokTersedia ?? 0) + 1 });
      }
      tx.update(pinjamRef, {
        status: "selesai",
        selesaiPada: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    showToast("Pengembalian disetujui", "success");
  } catch (err) {
    showToast("Gagal menyetujui pengembalian: " + err.message, "error");
  }
}

async function tolakKembali(id) {
  const alasan = prompt("Alasan penolakan pengembalian (opsional):", "") || "";
  try {
    await db.collection("peminjaman").doc(id).update({
      status: "dipinjam",
      catatanAdmin: alasan,
    });
    showToast("Pengembalian ditolak, status kembali ke dipinjam", "success");
  } catch (err) {
    showToast("Gagal menolak pengembalian: " + err.message, "error");
  }
}

/* ---------------- EVENT DELEGATION GLOBAL ---------------- */
document.addEventListener("click", (e) => {
  const backdrop = e.target.closest(".modal-backdrop");
  const card = e.target.closest(".modal-card");
  if (backdrop && !card) {
    closeModal();
    return;
  }

  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;

  switch (action) {
    case "close-modal":
      closeModal();
      break;
    case "tambah-barang":
      openBarangForm(null);
      break;
    case "edit-barang":
      openBarangForm(barangList.find((b) => b.id === id));
      break;
    case "hapus-barang":
      hapusBarang(id);
      break;
    case "pinjam":
      ajukanPinjam(id);
      break;
    case "tambah-teknisi":
      openTeknisiForm(null);
      break;
    case "edit-teknisi":
      openTeknisiForm(usersList.find((u) => u.id === id));
      break;
    case "hapus-teknisi":
      hapusTeknisi(id);
      break;
    case "approve-pinjam":
      approvePinjam(id);
      break;
    case "tolak-pinjam":
      tolakPinjam(id);
      break;
    case "ajukan-kembali":
      ajukanKembali(id);
      break;
    case "approve-kembali":
      approveKembali(id);
      break;
    case "tolak-kembali":
      tolakKembali(id);
      break;
  }
});

/* ---------------- AUTO LOGIN DARI SESI TERSIMPAN ---------------- */
(function initSession() {
  const saved = localStorage.getItem("inventaris_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      startApp();
    } catch (e) {
      localStorage.removeItem("inventaris_user");
    }
  }
})();
