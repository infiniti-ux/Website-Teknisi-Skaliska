<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0060DF">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Teknisi Skaliska</title>
  <!-- Tailwind tetap digunakan untuk utility class -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Custom CSS terpisah -->
  <link rel="stylesheet" href="styles.css">
  <!-- Preconnect untuk font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="antialiased h-screen overflow-hidden flex flex-col">

  <!-- TOAST CONTAINER -->
  <div id="toast-container" class="fixed top-0 right-0 mt-16 mr-4 z-[999] space-y-2 max-w-xs w-full pointer-events-none flex flex-col items-end" style="padding-top: env(safe-area-inset-top)"></div>

  <!-- CONFIRM DIALOG -->
  <div id="confirm-dialog" class="hidden fixed inset-0 z-[900] flex items-center justify-center px-5">
    <div class="absolute inset-0 sheet-overlay" onclick="closeConfirmDialog(false)"></div>
    <div class="confirm-card w-full max-w-xs fade-up relative z-10">
      <div class="flex flex-col items-center mb-6">
        <div id="confirm-icon-wrap" class="w-14 h-14 mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p id="confirm-message" class="text-gray-900 font-bold text-center text-lg leading-snug mb-1">Hapus?</p>
        <p id="confirm-detail" class="text-sm text-gray-400 text-center leading-relaxed font-medium">Tindakan ini permanen dan tak bisa dibatalkan.</p>
      </div>
      <div class="flex gap-3">
        <button id="confirm-cancel" class="flex-1 bg-gray-100 text-gray-700 text-sm font-bold py-3.5 rounded-2xl transition active:scale-95">Batal</button>
        <button id="confirm-yes" class="flex-1 bg-red-500 text-white text-sm font-bold py-3.5 rounded-2xl transition active:scale-95 shadow-lg shadow-red-100">Hapus</button>
      </div>
    </div>
  </div>

  <!-- LOGIN VIEW -->
  <div id="login-view" class="fixed inset-0 z-[800] flex items-center justify-center px-6 login-bg overflow-y-auto">
    <div class="w-full max-w-sm fade-up pb-10 pt-10">
      <div class="absolute top-20 right-10 w-40 h-40 rounded-full border border-white/10 pointer-events-none"></div>
      <div class="absolute top-36 right-4 w-24 h-24 rounded-full border border-white/08 pointer-events-none"></div>
      <div class="login-card p-8 relative">
        <div class="text-center mb-8">
          <div id="login-logo-wrap" class="w-20 h-20 mx-auto mb-5 rounded-3xl bg-white flex items-center justify-center shadow-xl overflow-hidden">
            <svg id="login-logo-svg" class="w-10 h-10" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <img id="login-logo-img" class="hidden w-full h-full object-cover" alt="Logo">
          </div>
          <h1 class="text-2xl font-black text-white mb-1 tracking-tight">Teknisi Skaliska</h1>
          <p class="text-xs text-blue-200 font-bold tracking-widest uppercase">Sistem Inventaris</p>
          <p id="login-error" class="text-red-300 text-sm font-bold mt-3 hidden bg-red-500/15 rounded-xl px-3 py-2"></p>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 ml-1">Username</label>
            <input type="text" id="username" class="login-inp" placeholder="Masukkan username" autocomplete="off" autocorrect="off" autocapitalize="none">
          </div>
          <div id="password-container" class="hidden">
            <label class="block text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input type="password" id="password" class="login-inp" placeholder="••••••••">
          </div>
          <button id="btn-login" onclick="handleLogin()" class="w-full bg-white font-black py-4 rounded-2xl mt-4 text-sm shadow-xl transition active:scale-97 flex items-center justify-center gap-2" style="color:var(--blue)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
            <span>Masuk Sistem</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- APP VIEW -->
  <div id="app-view" class="hidden flex flex-col h-full fade-up relative">
    <!-- Header -->
    <header class="header-wrap text-white safe-top z-20 shrink-0 sticky top-0 pb-5 px-5">
      <div class="pt-2 flex justify-between items-center mb-5">
        <div class="flex items-center gap-3">
          <div id="header-logo-wrap" class="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden">
            <svg id="header-logo-svg" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <img id="header-logo-img" class="hidden w-full h-full object-cover" alt="Logo">
          </div>
          <div>
            <h1 class="font-black text-lg leading-tight tracking-tight">Inventaris</h1>
            <p class="text-blue-200 text-[10px] font-bold tracking-widest uppercase">TKJ • Skaliska</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-settings" onclick="openSettingsModal()" class="hidden w-10 h-10 items-center justify-center text-white bg-white/12 rounded-full transition active:scale-90 border border-white/15">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button onclick="handleLogout()" class="w-10 h-10 flex items-center justify-center text-white bg-white/12 rounded-full transition active:scale-90 border border-white/15">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </div>

      <!-- User info + stat card -->
      <div class="stat-card p-4 flex items-center gap-4">
        <div class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p id="user-display-name" class="font-black text-[15px] text-white truncate">User</p>
            <span id="user-role-badge" class="px-2 py-0.5 rounded-lg text-[9px] font-black bg-white/20 text-white uppercase tracking-widest border border-white/15">Role</span>
          </div>
          <div id="user-pinjaman-info" class="hidden items-center gap-1.5 mt-1 text-[11px] text-blue-100 font-semibold"></div>
        </div>
        <div class="flex flex-col items-end border-l border-white/20 pl-4 shrink-0">
          <p class="text-[9px] text-blue-200 font-black uppercase tracking-widest">Total Item</p>
          <p id="stat-total-items" class="text-2xl font-black text-white" style="animation: countUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both;">0</p>
        </div>
      </div>

      <!-- Alerts -->
      <div id="pending-requests-badge" class="hidden mt-3 bg-amber-400/15 border border-amber-400/25 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:scale-98 transition" onclick="switchTab('riwayat')">
        <div class="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </div>
        <p class="text-sm text-white font-bold"><span id="pending-requests-count" class="font-black">0</span> permintaan pengembalian menunggu →</p>
      </div>

      <div id="stat-low-stock-wrapper" class="hidden mt-3 bg-red-500/15 border border-red-400/25 rounded-2xl p-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <p class="text-sm text-white font-bold"><span id="stat-low-stock" class="font-black">0</span> barang perlu restock segera!</p>
      </div>
    </header>

    <!-- Main scrollable area -->
    <main class="flex-1 overflow-y-auto no-scrollbar" style="-webkit-overflow-scrolling:touch; margin-top:-8px; padding-bottom: calc(var(--nav-h) + 16px)">
      <!-- GUDANG TAB -->
      <div id="gudang-view" class="px-4 pt-5">
        <div class="sticky top-0 z-10 pb-3 pt-1" style="background:var(--surface)">
          <div class="flex gap-2 mb-3">
            <div class="search-wrap flex-1">
              <svg class="search-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" id="search-input" oninput="renderGudangList()" placeholder="Cari nama atau kategori...">
            </div>
            <button id="btn-add" onclick="openBarangModal()" class="hidden btn-borrow px-4 rounded-2xl font-bold text-sm items-center justify-center" style="min-width:48px">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
          <div class="flex gap-2 overflow-x-auto no-scrollbar">
            <button onclick="setFilter('semua')" data-filter="semua" class="filter-pill active">Semua</button>
            <button onclick="setFilter('tersedia')" data-filter="tersedia" class="filter-pill">Tersedia</button>
            <button onclick="setFilter('habis')" data-filter="habis" class="filter-pill">Stok Habis</button>
          </div>
        </div>
        <div id="gudang-list" class="space-y-3 pb-4"></div>
        <div id="gudang-empty" class="hidden text-center py-20 fade-up">
          <div class="empty-icon-wrap"><svg class="w-10 h-10" style="color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg></div>
          <p class="font-black text-lg" style="color:var(--text)">Tidak Ada Data</p>
          <p class="text-sm mt-1 font-medium" style="color:var(--text-3)">Tidak ada barang yang sesuai filter.</p>
        </div>
      </div>

      <!-- RIWAYAT TAB -->
      <div id="riwayat-view" class="hidden px-4 pt-5 pb-4">
        <div class="sticky top-0 z-10 pb-3 pt-1 flex items-center justify-between" style="background:var(--surface)">
          <div class="section-head mb-0">
            <div class="section-head-icon"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
            <h3 class="text-lg font-black tracking-tight">Log Transaksi</h3>
          </div>
          <button id="btn-clear-log" onclick="clearAllLog()" class="hidden items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Hapus Log
          </button>
        </div>
        <div id="pending-requests-section" class="hidden mb-5"></div>
        <div id="riwayat-list"></div>
        <div id="riwayat-empty" class="hidden text-center py-20 fade-up">
          <div class="empty-icon-wrap"><svg class="w-10 h-10" style="color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          <p class="font-black text-lg" style="color:var(--text)">Riwayat Kosong</p>
          <p class="text-sm mt-1 font-medium" style="color:var(--text-3)">Belum ada aktivitas transaksi.</p>
        </div>
      </div>

      <!-- PENGGUNA TAB -->
      <div id="pengguna-view" class="hidden px-4 pt-5 pb-4">
        <div class="sticky top-0 z-10 pb-3 pt-1 flex items-center justify-between" style="background:var(--surface)">
          <div class="section-head mb-0">
            <div class="section-head-icon"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
            <h3 class="text-lg font-black tracking-tight">Kelola Teknisi</h3>
          </div>
          <button onclick="openUserModal()" class="btn-borrow px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            <span>Tambah</span>
          </button>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <p class="text-xs text-blue-700 font-semibold leading-relaxed">Login teknisi menggunakan <strong>nama & password</strong> yang didaftarkan. Password wajib diisi.</p>
        </div>
        <div id="pengguna-list" class="space-y-3"></div>
        <div id="pengguna-empty" class="hidden text-center py-20 fade-up">
          <div class="empty-icon-wrap"><svg class="w-10 h-10" style="color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
          <p class="font-black text-lg" style="color:var(--text)">Belum Ada Teknisi</p>
          <p class="text-sm mt-1 font-medium" style="color:var(--text-3)">Tambah akun teknisi lewat tombol di atas.</p>
        </div>
      </div>
    </main>

    <!-- BOTTOM NAV -->
    <nav class="bottom-nav fixed bottom-0 w-full flex z-30 safe-bottom" style="padding-bottom: max(env(safe-area-inset-bottom), 4px)">
      <button onclick="switchTab('gudang')" id="nav-gudang" class="nav-pill active">
        <div class="nav-indicator"></div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        <span>Gudang</span>
      </button>
      <button onclick="switchTab('riwayat')" id="nav-riwayat" class="nav-pill">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Riwayat</span>
      </button>
      <button onclick="switchTab('pengguna')" id="nav-pengguna" class="hidden nav-pill">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span>Teknisi</span>
      </button>
    </nav>
  </div>

  <!-- MODAL BARANG -->
  <div id="admin-modal" class="hidden fixed inset-0 z-[600] flex items-end sm:items-center justify-center sm:px-4">
    <div class="absolute inset-0 sheet-overlay" onclick="closeBarangModal()"></div>
    <div class="sheet-body w-full max-w-md p-6 slide-sheet relative z-10 safe-bottom">
      <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>
      <h3 id="modal-title" class="text-xl font-black mb-5 tracking-tight">Form Barang</h3>
      <input type="hidden" id="edit-id">
      <input type="hidden" id="edit-image-url">
      <div class="space-y-4 mb-6 max-h-[58vh] overflow-y-auto no-scrollbar">
        <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <div class="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-dashed border-blue-200 bg-blue-50 flex items-center justify-center">
            <img id="image-preview" class="w-full h-full object-cover hidden">
            <svg id="image-placeholder" class="w-6 h-6" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            <input type="file" id="edit-image" accept="image/jpeg,image/png,image/webp" class="absolute inset-0 opacity-0 cursor-pointer" onchange="previewImage(this)">
          </div>
          <div>
            <p class="text-sm font-bold">Foto Barang <span class="text-gray-400 font-medium">(opsional)</span></p>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">JPG/PNG • Maks 2MB</p>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Barang</label>
          <input type="text" id="edit-nama" class="inp" placeholder="Contoh: Kabel UTP Cat6">
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Stok</label>
            <input type="number" id="edit-stok" min="0" class="inp" placeholder="0">
          </div>
          <div class="flex-[2]">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kategori</label>
            <select id="edit-kategori" class="inp appearance-none" style="background-image:url('data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22292%22 height=%22292%22%3E%3Cpath fill=%22%239FABBE%22 d=%22M287 69.4a17.6 17.6 0 0 0-13-5.4H18.4c-5 0-9.3 1.8-12.9 5.4A17.6 17.6 0 0 0 0 82.2c0 5 1.8 9.3 5.4 12.9l128 127.9c3.6 3.6 7.8 5.4 12.8 5.4s9.2-1.8 12.8-5.4L287 95c3.5-3.5 5.4-7.8 5.4-12.8 0-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E'); background-repeat:no-repeat; background-size:10px; background-position:right 14px center;">
              <option value="Jaringan">Jaringan</option>
              <option value="Hardware">Hardware</option>
              <option value="Aksesoris">Aksesoris</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Lokasi Rak</label>
          <input type="text" id="edit-lokasi" class="inp" placeholder="Contoh: Lemari A1">
        </div>
      </div>
      <div class="flex gap-3">
        <button onclick="closeBarangModal()" class="flex-1 bg-gray-100 text-gray-700 text-sm font-bold py-3.5 rounded-2xl transition active:scale-95">Batal</button>
        <button id="modal-delete-btn" onclick="hapusDariModal()" class="hidden flex-1 bg-red-50 text-red-600 text-sm font-bold py-3.5 rounded-2xl transition active:scale-95 border border-red-100">Hapus</button>
        <button id="btn-save-modal" onclick="saveBarang()" class="flex-[2] btn-borrow text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center">Simpan</button>
      </div>
    </div>
  </div>

  <!-- MODAL PENGGUNA -->
  <div id="user-modal" class="hidden fixed inset-0 z-[600] flex items-end sm:items-center justify-center sm:px-4">
    <div class="absolute inset-0 sheet-overlay" onclick="closeUserModal()"></div>
    <div class="sheet-body w-full max-w-md p-6 slide-sheet relative z-10 safe-bottom">
      <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>
      <div class="flex items-center gap-3 mb-5">
        <div class="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg class="w-5 h-5" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
        </div>
        <div>
          <h3 class="text-xl font-black tracking-tight">Tambah Teknisi</h3>
          <p class="text-xs font-semibold" style="color:var(--text-3)">Daftarkan akun baru</p>
        </div>
      </div>
      <div class="space-y-4 mb-5">
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Teknisi</label>
          <input type="text" id="new-user-nama" class="inp" placeholder="Contoh: Budi Santoso" autocorrect="off" autocapitalize="words">
          <p class="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Nama ini digunakan saat login. Case‑sensitive.</p>
        </div>
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
          <input type="text" id="new-user-password" class="inp" placeholder="Minimal 4 karakter" autocomplete="off">
          <p class="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Simpan baik-baik, tidak bisa dilihat lagi.</p>
        </div>
      </div>
      <div class="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-5 flex items-start gap-2">
        <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-[11px] text-amber-700 font-semibold leading-relaxed">Password wajib diisi dan akan digunakan bersama nama untuk login.</p>
      </div>
      <div class="flex gap-3">
        <button onclick="closeUserModal()" class="flex-1 bg-gray-100 text-gray-700 text-sm font-bold py-3.5 rounded-2xl transition active:scale-95">Batal</button>
        <button id="btn-save-user" onclick="saveUser()" class="flex-[2] btn-borrow text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Daftarkan
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL SETTINGS -->
  <div id="settings-modal" class="hidden fixed inset-0 z-[600] flex items-end sm:items-center justify-center sm:px-4">
    <div class="absolute inset-0 sheet-overlay" onclick="closeSettingsModal()"></div>
    <div class="sheet-body w-full max-w-md p-6 slide-sheet relative z-10 safe-bottom">
      <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>
      <div class="flex items-center gap-3 mb-5">
        <div class="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg class="w-5 h-5" style="color:var(--blue)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
        <div>
          <h3 class="text-xl font-black tracking-tight">Pengaturan</h3>
          <p class="text-xs font-semibold" style="color:var(--text-3)">Kustomisasi tampilan</p>
        </div>
      </div>
      <div class="mb-5">
        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Logo Aplikasi</label>
        <div class="flex items-center gap-4">
          <div class="relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg" style="background:var(--blue)">
            <svg id="settings-logo-svg" class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <img id="settings-logo-img" class="hidden w-full h-full object-cover" alt="Logo">
          </div>
          <label class="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50 gap-2 hover:border-blue-300 hover:bg-blue-50 transition">
            <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            <span class="text-xs font-bold text-gray-500 text-center">Tap untuk upload logo</span>
            <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">JPG / PNG / WEBP • Maks 2MB</span>
            <input type="file" id="logo-file-input" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="previewLogoUpload(this)">
          </label>
        </div>
        <div id="logo-upload-progress-wrap" class="hidden mt-4">
          <div class="flex justify-between mb-1.5">
            <p class="text-xs font-bold" style="color:var(--text-2)">Mengupload...</p>
            <p id="logo-upload-pct" class="text-xs font-black" style="color:var(--blue)">0%</p>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5">
            <div id="logo-upload-bar" class="h-1.5 rounded-full transition-all" style="width:0%;background:var(--blue)"></div>
          </div>
        </div>
      </div>
      <div class="mb-5 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-bold">Reset ke Default</p>
          <p class="text-[11px] font-semibold mt-0.5" style="color:var(--text-3)">Hapus logo custom</p>
        </div>
        <button onclick="resetLogo()" class="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl transition active:scale-95">Reset</button>
      </div>
      <div class="flex gap-3">
        <button onclick="closeSettingsModal()" class="flex-1 bg-gray-100 text-gray-700 text-sm font-bold py-3.5 rounded-2xl transition active:scale-95">Tutup</button>
        <button id="btn-save-logo" onclick="saveLogo()" class="flex-[2] btn-borrow text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          Simpan Logo
        </button>
      </div>
    </div>
  </div>

  <!-- JavaScript terpisah -->
  <script type="module" src="app.js"></script>
</body>
</html>:root {
  --blue: #0060DF;
  --blue-mid: #0250BB;
  --blue-dark: #023E95;
  --blue-light: #EBF3FF;
  --blue-glow: rgba(0, 96, 223, 0.18);
  --surface: #F2F5FA;
  --card: #FFFFFF;
  --text: #0D1B2A;
  --text-2: #5A6A7E;
  --text-3: #9FABBE;
  --border: rgba(0,0,0,0.07);
  --green: #0BA360;
  --amber: #E07B00;
  --red: #D93025;
  --nav-h: 72px;
  --r-card: 20px;
}
* { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
body { background: var(--surface); overscroll-behavior-y: none; color: var(--text); }

/* === ANIMATIONS === */
@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideSheet { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
@keyframes toastIn { from { opacity:0; transform:translateX(110%); } to { opacity:1; transform:translateX(0); } }
@keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(110%); } }
@keyframes pulse-ring { 0%{transform:scale(1);opacity:.7} 70%{transform:scale(1.25);opacity:0} 100%{transform:scale(1.25);opacity:0} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes countUp { from { opacity:0; transform:scale(.7) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes cardIn { from { opacity:0; transform:translateY(10px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }

.fade-up { animation: fadeUp 0.38s cubic-bezier(0.16,1,0.3,1) both; }
.slide-sheet { animation: slideSheet 0.38s cubic-bezier(0.16,1,0.3,1) both; }
.toast-in { animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
.toast-out { animation: toastOut 0.22s ease-in forwards; }
.card-in { animation: cardIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }

.no-scrollbar::-webkit-scrollbar { display:none; }
.no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }

/* === HEADER === */
.header-wrap {
  background: linear-gradient(145deg, var(--blue-dark) 0%, var(--blue) 60%, #1A80FF 100%);
  border-radius: 0 0 32px 32px;
  box-shadow: 0 8px 32px -8px rgba(0,60,180,0.35), 0 2px 0 rgba(255,255,255,0.08) inset;
  position: relative;
  overflow: hidden;
}
.header-wrap::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}
.header-wrap::after {
  content: '';
  position: absolute;
  bottom: 0; left: -20px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,0,0,0.08) 0%, transparent 70%);
  pointer-events: none;
}

/* === STAT CARD === */
.stat-card {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(12px);
  border-radius: 18px;
  transition: transform 0.15s;
}

/* === INVENTORY CARD === */
.inv-card {
  background: var(--card);
  border-radius: var(--r-card);
  border: 1px solid var(--border);
  box-shadow: 0 2px 12px -2px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset;
  transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s;
  overflow: hidden;
}
.inv-card:active { transform: scale(0.975); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

.item-img-wrap {
  width: 56px; height: 56px;
  border-radius: 14px;
  background: var(--blue-light);
  border: 1.5px solid rgba(0,96,223,0.12);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}

/* === STOCK BADGE === */
.badge-ok { background:#ECFDF5; color:#065F46; border:1.5px solid #A7F3D0; }
.badge-low { background:#FFFBEB; color:#92400E; border:1.5px solid #FDE68A; }
.badge-zero { background:#FEF2F2; color:#991B1B; border:1.5px solid #FECACA; }

/* === ACTION BUTTONS === */
.btn-borrow {
  background: linear-gradient(135deg, var(--blue) 0%, #1A80FF 100%);
  color: white;
  box-shadow: 0 4px 12px -2px var(--blue-glow);
  border: none;
  transition: all 0.15s cubic-bezier(0.34,1.56,0.64,1);
}
.btn-borrow:not(:disabled):active { transform:scale(0.94); box-shadow:0 1px 4px var(--blue-glow); }
.btn-borrow:disabled { background: #E5E8EF; color: #A0AABB; box-shadow: none; }

.btn-return {
  background: #F0F4FA;
  color: var(--text);
  border: 1.5px solid #DCE3F0;
  transition: all 0.15s cubic-bezier(0.34,1.56,0.64,1);
}
.btn-return:not(:disabled):active { transform:scale(0.94); background:#E5EAF7; }
.btn-return:disabled { color: var(--text-3); border-color: #E8EBF2; cursor:not-allowed; }

.btn-edit {
  background: var(--blue-light);
  color: var(--blue);
  border: 1.5px solid rgba(0,96,223,0.15);
  transition: all 0.15s;
}
.btn-edit:active { transform:scale(0.96); background: #D6E8FF; }

/* === NAV === */
.bottom-nav {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
}
.nav-pill {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 10px 8px;
  transition: all 0.2s;
  color: var(--text-3);
  flex: 1;
  gap: 3px;
}
.nav-pill.active { color: var(--blue); }
.nav-pill.active .nav-indicator {
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 32px; height: 3px;
  background: var(--blue);
  border-radius: 0 0 4px 4px;
}
.nav-pill span { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; line-height: 1; }
.nav-pill svg { width: 22px; height: 22px; transition: transform 0.2s; }
.nav-pill.active svg { transform: scale(1.1); }

/* === FILTER PILLS === */
.filter-pill {
  padding: 7px 16px;
  border-radius: 100px;
  font-size: 12px; font-weight: 700;
  white-space: nowrap;
  transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1);
  border: 1.5px solid transparent;
}
.filter-pill.active {
  background: var(--blue);
  color: white;
  box-shadow: 0 4px 12px -2px var(--blue-glow);
}
.filter-pill:not(.active) {
  background: white;
  color: var(--text-2);
  border-color: #DCE3F0;
}

/* === SEARCH === */
.search-wrap {
  position: relative;
  background: white;
  border-radius: 14px;
  border: 1.5px solid #E0E7F0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.2s;
  overflow: hidden;
}
.search-wrap:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(0,96,223,0.08), 0 2px 8px rgba(0,0,0,0.04);
}
.search-wrap input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  padding: 13px 16px 13px 44px;
  font-size: 14px; font-weight: 600;
  color: var(--text);
}
.search-wrap input::placeholder { color: var(--text-3); }
.search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color: var(--text-3); }

/* === INPUT FIELD === */
.inp {
  background: var(--surface);
  border: 1.5px solid transparent;
  border-radius: 13px;
  width: 100%;
  padding: 13px 16px;
  font-size: 14px; font-weight: 600;
  color: var(--text);
  transition: all 0.2s;
  outline: none;
}
.inp:focus {
  background: white;
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(0,96,223,0.08);
}
.inp::placeholder { color: var(--text-3); }

/* === SHEETS === */
.sheet-overlay { background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); }
.sheet-body {
  background: white;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
}

/* === TOAST === */
.toast-wrap {
  background: rgba(10,20,40,0.9);
  backdrop-filter: blur(16px);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  padding: 12px 16px;
  color: white;
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; gap: 10px;
}

/* === LOGIN === */
.login-bg {
  background: linear-gradient(160deg, var(--blue-dark) 0%, var(--blue) 50%, #2090FF 100%);
}
.login-card {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(24px);
  border-radius: 28px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.15) inset;
}
.login-inp {
  background: rgba(255,255,255,0.15);
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 13px;
  width: 100%;
  padding: 14px 16px;
  font-size: 14px; font-weight: 700;
  color: white;
  outline: none;
  transition: all 0.2s;
}
.login-inp::placeholder { color: rgba(255,255,255,0.5); }
.login-inp:focus {
  background: white;
  color: var(--text);
  border-color: white;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.15);
}
.login-inp:focus::placeholder { color: var(--text-3); }

/* === RIWAYAT === */
.log-card {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  transition: transform 0.15s;
}
.log-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* === REQUEST CARD === */
.req-card {
  background: #FFFDF5;
  border: 1.5px solid #FDE68A;
  border-left: 4px solid #F59E0B;
  border-radius: 16px;
  padding: 14px;
}

/* === USER CARD === */
.user-card {
  background: white;
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  padding: 14px 16px;
  display: flex; align-items: center; gap: 14px;
  transition: transform 0.15s;
}

/* === EMPTY STATE === */
.empty-icon-wrap {
  width: 80px; height: 80px;
  border-radius: 24px;
  background: white;
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

/* === PULSE DOT === */
.pulse-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22C55E;
  position: relative;
}
.pulse-dot::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: #22C55E;
  opacity: 0.35;
  animation: pulse-ring 1.8s infinite;
}

/* === SECTION HEADER === */
.section-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px;
}
.section-head-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: var(--blue);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px -2px var(--blue-glow);
}

/* === CONFIRM === */
.confirm-card {
  background: white;
  border-radius: 28px;
  padding: 28px 24px 20px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.18);
}

/* === STAGGER DELAYS === */
.card-in:nth-child(1){animation-delay:0ms}
.card-in:nth-child(2){animation-delay:40ms}
.card-in:nth-child(3){animation-delay:80ms}
.card-in:nth-child(4){animation-delay:120ms}
.card-in:nth-child(5){animation-delay:160ms}
.card-in:nth-child(6){animation-delay:200ms}
.card-in:nth-child(7){animation-delay:240ms}
.card-in:nth-child(8){animation-delay:280ms}

/* misc */
.safe-top { padding-top: max(env(safe-area-inset-top), 16px); }
.safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 12px); }

/* Section divider */
.divider { height: 1px; background: linear-gradient(to right, transparent, var(--border), transparent); margin: 4px 0; } import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ---------- KONFIGURASI FIREBASE ----------
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
  });
}

function attachUsersListener() {
  if (unsubscribeUsers) unsubscribeUsers();
  unsubscribeUsers = onSnapshot(collection(db, 'users'), snapshot => {
    usersData = [];
    snapshot.forEach(doc => usersData.push({ id: doc.id, ...doc.data() }));
    renderPenggunaList();
  });
}

function attachRequestsListener() {
  if (unsubscribeRequests) unsubscribeRequests();
  unsubscribeRequests = onSnapshot(collection(db, 'return_requests'), snapshot => {
    pendingRequests = [];
    snapshot.forEach(doc => pendingRequests.push({ id: doc.id, ...doc.data() }));
    renderRiwayatList();
  });
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
  document.getElementById('admin-modal').classList.remove('hidden');
}

function closeBarangModal() {
  document.getElementById('admin-modal').classList.add('hidden');
}

// *** FUNGSI saveBarang YANG SUDAH DIPERBAIKI ***
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
    // Upload gambar jika ada file baru
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) throw new Error('Gambar maks 2MB!');

      const storageRef = ref(storage, `inventory/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Tunggu upload selesai dengan Promise
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          null,          // progress bisa diabaikan
          reject,        // error
          resolve        // complete
        );
      });

      // Dapatkan URL setelah upload sukses
      imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
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
  if (nama.toLowerCase() === 'min') {
    showToast('"min" reserved untuk Admin!', 'error');
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
  const ok = await showConfirmDialog(`Hapus akun "${escapeHTML(nama)}"?`, 'Teknisi tidak bisa login setelah dihapus.');
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'users', id));
    showToast(`Akun "${escapeHTML(nama)}" dihapus.`, 'success');
  } catch (e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}

// ---------- TRANSAKSI ----------
async function pinjamBarang(id, nama, stok) {
  if (currentUser.role !== 'user' || stok <= 0) return;
  if (navigator.vibrate) navigator.vibrate(20);
  try {
    await updateDoc(doc(db, 'gudang', id), { stok: stok - 1 });
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
    const barangDoc = await getDoc(doc(db, 'gudang', barangId));
    if (barangDoc.exists()) {
      const currentStok = barangDoc.data().stok || 0;
      await updateDoc(doc(db, 'gudang', barangId), { stok: currentStok + jumlah });
    }
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

// ---------- REAL‑TIME LISTENERS ----------
onSnapshot(collection(db, 'gudang'), snapshot => {
  gudangData = [];
  snapshot.forEach(doc => gudangData.push({ id: doc.id, ...doc.data() }));
  renderGudangList();
});

onSnapshot(collection(db, 'riwayat'), snapshot => {
  riwayatData = [];
  snapshot.forEach(doc => riwayatData.push(doc.data()));
  renderRiwayatList();
});

onSnapshot(doc(db, 'settings', 'appConfig'), snapshot => {
  applyLogo(snapshot.exists() ? snapshot.data().logoUrl || '' : '');
});

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
