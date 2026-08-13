<script>
(function () {
  // Fungsi utama anti-debugger
  function antiDebugger() {
    const start = performance.now();
    
    // Paksa masuk debugger
    debugger;
    
    const end = performance.now();
    
    // Jika ada jeda yang signifikan (user tekan Play / resume)
    if (end - start > 100) {
      destroyPage();
    }
  }

  // Hancurkan halaman + redirect ke blank
  function destroyPage() {
    try {
      // Hapus semua isi halaman
      document.documentElement.innerHTML = '';
      
      // Redirect ke halaman kosong
      window.location.replace('about:blank');
      
      // Backup (jika replace gagal)
      window.location.href = 'about:blank';
      
      // Tutup tab jika memungkinkan (beberapa browser memblokir)
      window.close();
    } catch (e) {
      // Fallback
      window.location = 'about:blank';
    }
  }

  // Deteksi ukuran window (cara lain mendeteksi DevTools)
  function detectDevToolsBySize() {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    
    if (widthDiff || heightDiff) {
      destroyPage();
    }
  }

  // Jalankan terus menerus
  setInterval(antiDebugger, 500);          // Cek debugger setiap 0.5 detik
  setInterval(detectDevToolsBySize, 800);  // Cek ukuran window

  // Deteksi saat user mencoba menutup DevTools
  window.addEventListener('resize', detectDevToolsBySize);

  // Extra: blokir beberapa shortcut
  document.addEventListener('keydown', function (e) {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'u')
    ) {
      e.preventDefault();
      destroyPage();
    }
  });
})();
</script>
