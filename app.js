/* ============================================================
   UNIT TEKNISI TKJ SKALISKA — SMK YAPALIS KRIAN
   Interaksi minimal: menu mobile, form, tahun
   ============================================================ */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- MENU MOBILE ---------- */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  if (burger && menu) {
    burger.addEventListener("click", () => {
      const buka = menu.classList.toggle("buka");
      burger.classList.toggle("buka", buka);
      burger.setAttribute("aria-expanded", String(buka));
    });

    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("buka");
        burger.classList.remove("buka");
        burger.setAttribute("aria-expanded", "false");
      })
    );

    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) {
        menu.classList.remove("buka");
        burger.classList.remove("buka");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- FORMULIR (halaman kontak) ---------- */
  const form = document.getElementById("kontak-form");
  const pesanEl = document.getElementById("form-msg");

  function tandaiSalah(el, salah) {
    if (el) el.classList.toggle("salah", salah);
    return salah;
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nama = form.querySelector("#f-nama");
      const wa = form.querySelector("#f-wa");
      const layanan = form.querySelector("#f-layanan");
      const pesan = form.querySelector("#f-pesan");
      const inst = form.querySelector("#f-inst");

      let salah = false;
      salah = tandaiSalah(nama, !nama.value.trim()) || salah;
      salah = tandaiSalah(wa, !wa.value.trim()) || salah;
      salah = tandaiSalah(layanan, !layanan.value) || salah;
      salah = tandaiSalah(pesan, !pesan.value.trim()) || salah;

      if (salah) {
        pesanEl.className = "f-note salah";
        pesanEl.textContent = "Mohon lengkapi kolom yang bertanda (*).";
        return;
      }

      const tautanWA =
        "https://wa.me/6281234567890?text=" +
        encodeURIComponent(
          "Permohonan Layanan — Unit Teknisi TKJ Skaliska\n\n" +
          "Nama: " + nama.value.trim() +
          (inst.value.trim() ? "\nInstitusi: " + inst.value.trim() : "") +
          "\nKontak: " + wa.value.trim() +
          "\nJenis Layanan: " + layanan.value +
          "\nUraian: " + pesan.value.trim()
        );

      pesanEl.className = "f-note ok";
      pesanEl.innerHTML =
        "Permohonan Anda siap dikirim, <strong>" + nama.value.trim() + "</strong>. " +
        'Silakan klik <a href="' + tautanWA + '" target="_blank" rel="noopener">tautan ini</a> ' +
        "untuk melanjutkan melalui WhatsApp.";

      form.reset();
      [nama, wa, layanan, pesan, inst].forEach((el) => el && el.classList.remove("salah"));
    });

    form.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", () => el.classList.remove("salah"));
    });
  }

  /* ---------- TAHUN ---------- */
  const tahun = document.getElementById("year");
  if (tahun) tahun.textContent = new Date().getFullYear();
});
