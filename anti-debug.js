(function() {
  'use strict';

  // ===== KONFIGURASI =====
  const REDIRECT_URL = 'about:blank';
  const THRESHOLD = 160; // px untuk deteksi ukuran

  // ===== FUNGSI DESTROY =====
  function destroy() {
    try {
      // Hapus semua konten
      document.documentElement.innerHTML = '';
      document.body && (document.body.innerHTML = '');

      // Hapus history biar tidak bisa back
      history.pushState(null, '', REDIRECT_URL);
      history.replaceState(null, '', REDIRECT_URL);

      // Redirect paksa
      window.location.replace(REDIRECT_URL);
      window.location.href = REDIRECT_URL;

      // Coba tutup tab
      window.close();

      // Infinite loop sebagai fallback (bikin tab hang)
      while (true) {}
    } catch (e) {
      window.location = REDIRECT_URL;
    }
  }

  // ===== 1. Debugger Timing (paling susah di-bypass) =====
  function debuggerCheck() {
    const start = performance.now();
    // Pakai Function constructor biar lebih sulit di-disable
    (function(){}).constructor('debugger')();
    const end = performance.now();

    if (end - start > 80) {
      destroy();
    }
  }

  // ===== 2. Window Size Detection =====
  function sizeCheck() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > THRESHOLD || heightDiff > THRESHOLD) {
      destroy();
    }
  }

  // ===== 3. Console Getter Trap =====
  function consoleTrap() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'id', {
      get: function() {
        destroy();
        return '';
      }
    });
    // Trigger saat DevTools terbuka
    console.log(el);
    console.clear();
  }

  // ===== 4. RegExp / Date toString Trap =====
  function toStringTrap() {
    const re = /./;
    re.toString = function() {
      destroy();
      return '';
    };
    console.log(re);
    console.clear();

    const d = new Date();
    d.toString = function() {
      destroy();
      return '';
    };
    console.log(d);
    console.clear();
  }

  // ===== 5. Self Protection (deteksi override) =====
  function selfProtect() {
    // Cek apakah setInterval masih asli
    if (window.setInterval.toString().indexOf('[native code]') === -1) {
      destroy();
    }
    // Cek Function constructor
    if (Function.prototype.constructor.toString().indexOf('[native code]') === -1) {
      destroy();
    }
  }

  // ===== JALANKAN SEMUA DETEKSI =====
  // Pakai beberapa interval dengan delay berbeda + random
  function startProtection() {
    // Debugger check (paling agresif)
    setInterval(debuggerCheck, 400 + Math.random() * 200);
    setInterval(debuggerCheck, 700 + Math.random() * 300);

    // Size check
    setInterval(sizeCheck, 600 + Math.random() * 400);
    window.addEventListener('resize', sizeCheck);

    // Console & toString trap
    setInterval(consoleTrap, 1200 + Math.random() * 800);
    setInterval(toStringTrap, 1500 + Math.random() * 1000);

    // Self protect
    setInterval(selfProtect, 2000);

    // Extra: cek terus menerus dengan requestAnimationFrame
    function rafCheck() {
      debuggerCheck();
      sizeCheck();
      requestAnimationFrame(rafCheck);
    }
    requestAnimationFrame(rafCheck);
  }

  // Mulai setelah sedikit delay (biar page load dulu)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startProtection);
  } else {
    startProtection();
  }

  // Blokir shortcut umum
  document.addEventListener('keydown', function(e) {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && e.key.toLowerCase() === 'u')
    ) {
      e.preventDefault();
      e.stopPropagation();
      destroy();
    }
  }, true);

})();
