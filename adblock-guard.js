/**
 * AdBlock Guard - Standalone
 * Deteksi adblocker → tampilkan popup + hancurkan video player
 * Jika tidak terdeteksi → script mati total
 */
(function () {
  "use strict";

  // ====================== KONFIGURASI (bisa diubah) ======================
  const CONFIG = {
    checkDelay: 450,                 // jeda sebelum cek (ms)
    maxRetries: 3,                   // berapa kali dicoba
    retryInterval: 600,              // jeda antar percobaan
    destroyPlayer: true,             // true = hancurkan video player
    showPopup: true,                 // true = tampilkan popup
    popupTitle: "AdBlocker Terdeteksi",
    popupMessage: "Silakan nonaktifkan AdBlocker / uBlock / AdGuard agar video bisa diputar.",
    popupButtonText: "Saya Sudah Nonaktifkan",
    // Class bait yang sering diblokir adblocker
    baitClasses: [
      "adsbox",
      "ad-banner",
      "ad-container",
      "adsbygoogle",
      "google-ad",
      "banner-ad",
      "ad-wrapper",
      "textads",
      "sponsor-ad"
    ]
  };
  // ======================================================================

  let detected = false;
  let retryCount = 0;

  // Buat bait element
  function createBait() {
    const bait = document.createElement("div");
    bait.className = CONFIG.baitClasses.join(" ");
    bait.id = "adblock-bait-" + Math.random().toString(36).slice(2);
    bait.style.cssText = `
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
      width: 1px !important;
      height: 1px !important;
      background: transparent !important;
      pointer-events: none !important;
      z-index: -9999 !important;
    `;
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);
    return bait;
  }

  // Cek apakah bait di-blokir
  function isBaitBlocked(bait) {
    if (!bait || !bait.parentNode) return true;

    const style = window.getComputedStyle(bait);
    const rect = bait.getBoundingClientRect();

    // Beberapa kondisi yang menandakan diblokir
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      parseFloat(style.height) === 0 ||
      parseFloat(style.width) === 0 ||
      rect.height === 0 ||
      rect.width === 0 ||
      bait.offsetParent === null
    ) {
      return true;
    }
    return false;
  }

  // Metode tambahan: cek script ad yang umum
  function checkAdScript() {
    return new Promise((resolve) => {
      const testScript = document.createElement("script");
      testScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      testScript.async = true;
      testScript.onload = () => resolve(false);   // berhasil load = tidak diblokir
      testScript.onerror = () => resolve(true);   // error = kemungkinan diblokir
      document.head.appendChild(testScript);

      // Timeout fallback
      setTimeout(() => resolve(true), 1800);
    });
  }

  // Fungsi utama deteksi
  async function detectAdBlock() {
    const bait = createBait();

    // Tunggu sebentar agar adblocker sempat bertindak
    await new Promise(r => setTimeout(r, CONFIG.checkDelay));

    const blockedByBait = isBaitBlocked(bait);

    // Bersihkan bait
    if (bait && bait.parentNode) {
      bait.parentNode.removeChild(bait);
    }

    // Jika bait sudah terblokir, anggap terdeteksi
    if (blockedByBait) {
      return true;
    }

    // Coba metode tambahan (opsional, bisa dimatikan)
    // const blockedByScript = await checkAdScript();
    // return blockedByScript;

    return false;
  }

  // Hancurkan semua elemen video player
  function destroyVideoPlayer() {
    const selectors = [
      "#blogVideo",
      "#playButton",
      ".video-click",
      "#progressContainer",
      "#closeButton",
      "#videoMode",
      ".video-wrapper",
      ".progress-area",
      ".progress-fill",
      ".time-display"
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        try {
          // Putuskan event & source
          if (el.tagName === "VIDEO") {
            el.pause();
            el.removeAttribute("src");
            el.load();
          }
          el.remove();
        } catch (e) {}
      });
    });

    // Extra: hapus juga dari memory jika masih ada referensi global
    if (window.video) window.video = null;
  }

  // Tampilkan popup
  function showBlockedPopup() {
    // Hindari duplikat
    if (document.getElementById("adblock-guard-popup")) return;

    const overlay = document.createElement("div");
    overlay.id = "adblock-guard-popup";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      z-index: 99999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 16px;
        max-width: 420px;
        width: 100%;
        padding: 32px 28px;
        text-align: center;
        color: #fff;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 600;">${CONFIG.popupTitle}</h2>
        <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.55; opacity: 0.85;">
          ${CONFIG.popupMessage}
        </p>
        <button id="adblock-reload-btn" style="
          background: #ff2d55;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">${CONFIG.popupButtonText}</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tombol reload
    document.getElementById("adblock-reload-btn").onclick = function () {
      location.reload();
    };
  }

  // Proses utama
  async function run() {
    // Coba beberapa kali untuk mengurangi false positive
    while (retryCount < CONFIG.maxRetries) {
      const isBlocked = await detectAdBlock();
      if (isBlocked) {
        detected = true;
        break;
      }
      retryCount++;
      if (retryCount < CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, CONFIG.retryInterval));
      }
    }

    // === HASIL ===
    if (detected) {
      // Adblocker aktif → hancurkan player + tampilkan popup
      if (CONFIG.destroyPlayer) {
        destroyVideoPlayer();
      }
      if (CONFIG.showPopup) {
        showBlockedPopup();
      }
    }
    // Jika tidak terdeteksi → script mati total (tidak melakukan apa-apa)
  }

  // Jalankan setelah DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
