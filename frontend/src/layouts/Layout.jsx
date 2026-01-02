// src/layouts/Layout.jsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const Layout = () => {
  const location = useLocation();
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({
    text: '',
    link: '',
    type: 'yellow',
  });

  // Cek apakah halaman saat ini adalah Home
  const isHomePage = location.pathname.replace(/\/+$/, '') === '/home';

  useEffect(() => {
    const checkMitraStatus = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;

        const user = JSON.parse(storedUser);

        // Hanya cek status untuk role 'user'
        if (user && user.role === 'user') {
          
          try {
            // Cek status pengajuan (hanya tampilkan jika Pending atau Ditolak)
           
            
            const { status } = pengajuanRes.data;
            
            if (status === 'pending') {
              setAlertMessage({
                text: 'Status: Pengajuan mitra Anda sedang ditinjau oleh Admin.',
                link: '/lengkapi-profile',
                type: 'blue',
              });
              setShowProfileAlert(true);
            } else if (status === 'rejected') {
              setAlertMessage({
                text: 'Status: Pengajuan mitra Anda ditolak.',
                link: '/lengkapi-profile',
                type: 'yellow',
              });
              setShowProfileAlert(true);
            } else {
              // Jika status Approved atau lainnya, tutup alert
              setShowProfileAlert(false);
            }
            
          } catch (err) {
            // JIKA ERROR (Termasuk 404/Belum punya data), DIAMKAN SAJA (Tutup Alert)
            setShowProfileAlert(false);
          }
        }
      } catch (err) {
        console.error("Error checking mitra status:", err.message);
      }
    };

    checkMitraStatus();
  }, [location.pathname]);

  const alertClasses =
    alertMessage.type === 'yellow'
      ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
      : 'bg-blue-100 border-blue-300 text-blue-800';

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      
      <Header />
      
      {/* Alert hanya muncul jika showProfileAlert = true (Pending/Rejected) */}
      {showProfileAlert && (
        <div className={`border-b-2 text-center p-3 shadow-md ${alertClasses}`}>
          <p>
            <strong>
              {alertMessage.type === 'yellow' ? 'Perhatian:' : 'Info:'}
            </strong>
            <span className="ml-2">{alertMessage.text}</span>
            <Link
              to={alertMessage.link}
              className="font-bold underline ml-2 hover:opacity-80"
            >
              Klik di sini.
            </Link>
          </p>
        </div>
      )}

      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      {!isHomePage && <Footer />}
      
    </div>
  );
};

export default Layout;