import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const AutoLogout = () => {
  const navigate = useNavigate();
  
  // --- KONFIGURASI WAKTU ---
  // Untuk Testing: 10 detik
  const TIMEOUT_DURATION = 3 * 60 * 60 * 1000; 
  
  //tes maintenence durasi contoh 10*1000

  const STORAGE_KEY = 'lastActivity'; // Kunci untuk simpan waktu di browser

  // Fungsi Logout
  const performLogout = () => {
    // Bersihkan semua data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(STORAGE_KEY);

    Swal.fire({
      title: 'Sesi Berakhir',
      text: 'Anda telah tidak aktif. Silakan login kembali.',
      icon: 'warning',
      confirmButtonColor: '#1A2A80',
      confirmButtonText: 'OK',
      allowOutsideClick: false
    }).then(() => {
      navigate('/');
      window.location.reload();
    });
  };

  // Fungsi Update Waktu Aktif
  const updateActivity = () => {
    // Hanya update jika user sedang login
    if (localStorage.getItem('token')) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  };

  // 1. Cek Status Saat Halaman Dimuat (Initial Check)
  useEffect(() => {
    const checkSessionOnLoad = () => {
      const token = localStorage.getItem('token');
      const lastActivity = localStorage.getItem(STORAGE_KEY);

      // Jika tidak ada token, abaikan (belum login)
      if (!token) return;

      // Jika ada token tapi tidak ada data aktivitas, anggap baru login -> set waktu sekarang
      if (!lastActivity) {
        updateActivity();
        return;
      }

      // HITUNG SELISIH WAKTU (Sekarang - Terakhir Aktif)
      const now = Date.now();
      const timeDiff = now - parseInt(lastActivity, 10);

      // Jika selisih lebih besar dari batas waktu -> Logout Paksa
      if (timeDiff > TIMEOUT_DURATION) {
        performLogout();
      }
    };

    checkSessionOnLoad();
  }, [navigate]);

  // 2. Interval Pengecekan Rutin (Real-time check jika tab terbuka terus)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const token = localStorage.getItem('token');
      const lastActivity = localStorage.getItem(STORAGE_KEY);

      if (token && lastActivity) {
        const now = Date.now();
        if (now - parseInt(lastActivity, 10) > TIMEOUT_DURATION) {
          performLogout();
        }
      }
    }, 1000); // Cek setiap 1 detik

    return () => clearInterval(intervalId);
  }, [navigate]);

  // 3. Event Listener untuk Mendeteksi Aktivitas User
  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'click',
      'scroll',
      'keypress',
      'touchstart' // Support layar sentuh
    ];

    // Setiap ada aksi, update 'lastActivity' di localStorage
    const handleUserActivity = () => {
      updateActivity();
    };

    events.forEach(event => window.addEventListener(event, handleUserActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, []);

  return null;
};

export default AutoLogout;