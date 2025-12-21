// src/layouts/AdminLayout.jsx
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaUsers, 
  FaClipboardList, 
  FaCalendarAlt, // Ganti Icon Perencanaan
  FaChartLine,   // Icon Baru untuk Rekap
  FaTasks,       // Ganti Icon Penugasan
  FaBriefcase,   // Ganti Icon Jabatan
  FaSlidersH,    // Ganti Icon Atur Batas
  FaSignOutAlt, 
  FaUserCircle, 
  FaUserCheck,
  FaBars,
  FaFileContract,
  FaMoneyBillWave,
  FaCogs,
} from 'react-icons/fa';

import logoMAKINASIK from '../assets/logo.png'; 
import PartDetailProfileAdmin from '../components/admin/PartDetailProfileAdmin';

const menuItems = [
  // 1. UTAMA
  { path: "/admin/dashboard", label: "Dashboard", icon: <FaHome /> },
  
  // 2. OPERASIONAL (Alur Kerja)
  { path: "/admin/manage-kegiatan", label: "Survei/Sensus", icon: <FaClipboardList /> },
  { path: "/admin/perencanaan", label: "Perencanaan", icon: <FaCalendarAlt /> },
  { path: "/admin/rekap", label: "Rekap Perencanaan", icon: <FaChartLine /> }, // MENU BARU
  { path: "/admin/penugasan", label: "Penugasan", icon: <FaTasks /> },
  
  // 3. SDM & KEUANGAN
  { path: "/admin/manajemen-mitra", label: "Manajemen Mitra", icon: <FaUserCheck /> },
  { path: "/admin/transaksi-mitra", label: "Transaksi Mitra", icon: <FaMoneyBillWave /> },
  { path: "/admin/manajemen-spk", label: "Manajemen SPK", icon: <FaFileContract /> },
  
  // 4. MASTER DATA & PENGATURAN
  { path: "/admin/manajemen-jabatan", label: "Master Jabatan", icon: <FaBriefcase /> },
  { path: "/admin/batas-honor", label: "Atur Batas Honor", icon: <FaSlidersH /> },
  { path: "/admin/manage-users", label: "Manajemen User", icon: <FaUsers /> },

  { path: "/admin/system-settings", label: "Pengaturan Sistem", icon: <FaCogs /> },
];

const AdminHeader = ({ title, toggleSidebar, isProfileExpanded, setIsProfileExpanded }) => {
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const [userData, setUserData] = useState({ username: 'Admin', role: 'admin', email: '', id: '' });
  
  // State Ukuran Widget
  const [widgetWidth, setWidgetWidth] = useState(300); // Lebar saat tertutup
  const [expandedWidth, setExpandedWidth] = useState(window.innerWidth); // Lebar saat terbuka
  const [headerHeight, setHeaderHeight] = useState(80);
  const widgetContentRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserData(user);
      } catch (e) {
        console.error("Gagal parse user", e);
      }
    }
  }, []);

  // -- FUNGSI KALKULASI UKURAN RESPONSIF --
  const calculateWidgetSize = () => {
    const width = window.innerWidth;
    const isMobile = width < 768; // Breakpoint md Tailwind
    
    // 1. Tentukan Tinggi Header
    setHeaderHeight(isMobile ? 64 : 80);

    // 2. Hitung Lebar Widget saat TERTUTUP (Collapsed)
    if (widgetContentRef.current) {
      const contentWidth = widgetContentRef.current.getBoundingClientRect().width;
      const buffer = isMobile ? 40 : 90; 
      setWidgetWidth(contentWidth + buffer);
    }

    // 3. Hitung Lebar Widget saat TERBUKA (Expanded)
    const sidebarWidth = 288;
    setExpandedWidth(isMobile ? width : width - sidebarWidth);
  };

  // Jalankan kalkulasi saat mount, user berubah, atau window resize
  useLayoutEffect(() => {
    calculateWidgetSize();
    window.addEventListener('resize', calculateWidgetSize);
    return () => window.removeEventListener('resize', calculateWidgetSize);
  }, [userData.username]);

  const handleProfileClick = () => {
    if (!isProfileExpanded) {
      setIsProfileExpanded(true);
    }
  };

  const handleCloseProfile = () => {
    setIsProfileExpanded(false);
  };

  return (
    <header className="flex justify-between items-start pt-2 px-4 md:px-8 bg-transparent relative h-16 md:h-20 z-30 transition-all duration-300">
      
      {/* JUDUL HALAMAN */}
      <div className={`flex items-center gap-4 mt-1 md:mt-2 transition-all duration-500 ${isProfileExpanded ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
        <button 
          onClick={toggleSidebar}
          className="md:hidden text-gray-600 hover:text-[#1A2A80] text-xl focus:outline-none"
        >
          <FaBars />
        </button>

        <div>
          <h2 className="text-xl md:text-3xl font-extrabold text-gray-800 tracking-tight line-clamp-1">{title}</h2>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">{currentDate}</p>
        </div>
      </div>
      
      {/* WIDGET PROFIL */}
      <div 
        onClick={handleProfileClick}
        style={{
            width: isProfileExpanded ? `${expandedWidth}px` : `${widgetWidth}px`,
            height: isProfileExpanded ? '100vh' : `${headerHeight}px`,
            borderRadius: isProfileExpanded ? '0px' : '0px 0px 0px 40px'
        }}
        className={`
            bg-gray-100 shadow-sm overflow-hidden
            fixed top-0 right-0 z-[100]
            transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)]
            flex flex-col
            ${isProfileExpanded ? 'cursor-default' : 'cursor-pointer hover:bg-gray-200'}
        `}
      >
         <div className="w-full h-full relative">
           {isProfileExpanded ? (
              <PartDetailProfileAdmin user={userData} onClose={handleCloseProfile} />
           ) : (
              // KONTEN DALAM KEADAAN TERTUTUP
              <div className="absolute top-0 right-0 w-full h-full flex items-center justify-end pr-4 md:pr-8 pt-1 md:pt-2">
                  
                  <div ref={widgetContentRef} className="flex items-center gap-3 md:gap-4">
                      {/* Teks Nama & Role */}
                      <div className="text-right whitespace-nowrap hidden md:block">
                          <p className="text-sm font-bold text-gray-800 leading-tight block select-none">
                              {userData.username}
                          </p>
                          <span className="text-[10px] font-bold text-[#1A2A80] bg-blue-100 px-2 py-0.5 rounded-full select-none inline-block mt-1">
                              {userData.role === 'admin' ? 'Administrator' : 'Mitra'}
                          </span>
                      </div>

                      <div className="bg-white p-1 rounded-full shadow-sm flex-shrink-0">
                          <FaUserCircle className="text-3xl md:text-4xl text-gray-400" />
                      </div>
                  </div>

              </div>
           )}
         </div>
      </div>
    </header>
  );
};

const Sidebar = ({ handleLogout, onMenuClick }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-72 bg-[#1A2A80] text-white flex flex-col overflow-hidden relative z-20 h-full shadow-2xl md:shadow-none">
      <div className="p-8 text-center border-b border-white/10 z-10 relative">
        <div className="inline-block group">
          <div className="w-20 h-20 rounded-2xl bg-white mx-auto border-2 border-white/20 overflow-hidden shadow-lg p-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <img 
              src={logoMAKINASIK} 
              alt="Logo MAKINASIK" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-wider">MAKINASIK</h1>
        <p className="text-xs font-medium text-blue-200 mt-1">Manajemen Kinerja dan Administrasi Mitra Statistik</p>
      </div>

      <nav className="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar relative z-10">
        <p className="px-8 text-xs font-bold text-blue-200 uppercase mb-4 tracking-wider">Menu Utama</p>
        
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMenuClick} 
              className={`
                relative group flex items-center gap-4 px-8 py-4 transition-colors duration-300 overflow-hidden
                ${active ? "text-[#1A2A80]" : "text-blue-200 hover:text-white"}
              `}
              style={{
                marginLeft: '20px',
                marginRight: '0px',
                borderTopLeftRadius: '50px',
                borderBottomLeftRadius: '50px',
                borderTopRightRadius: '0px',
                borderBottomRightRadius: '0px',
              }}
            >
              <div 
                className={`
                  absolute inset-0 bg-white z-0
                  transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${active ? 'translate-x-0' : 'translate-x-full'} 
                `}
              />
              <span className={`relative z-10 text-lg transition-transform duration-300 ${active ? 'scale-110 text-[#1A2A80]' : ''}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 text-sm font-medium transition-all duration-300 ${active ? 'font-bold translate-x-1' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/10 z-10 bg-[#1A2A80]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform"><FaSignOutAlt /></span>
          <span className="font-medium text-sm">Keluar Aplikasi</span>
        </button>
      </div>
    </aside>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const handleNavigation = () => {
    setIsSidebarOpen(false);
    setIsProfileExpanded(false);
  };

  const currentItem = menuItems.find(item => item.path === location.pathname);
  const pageTitle = currentItem ? currentItem.label : "Admin Dashboard";

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden relative">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 h-full transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          handleLogout={handleLogout} 
          onMenuClick={handleNavigation} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative z-10 pl-0 min-w-0">
        <AdminHeader 
          title={pageTitle} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isProfileExpanded={isProfileExpanded}
          setIsProfileExpanded={setIsProfileExpanded}
        />

        <main className="flex-1 overflow-y-auto p-4 md:pr-6 md:pb-6 md:pl-0 scrollbar-hide pt-0">
          <div className="bg-white rounded-3xl md:rounded-r-3xl md:rounded-tl-[40px] md:rounded-bl-[40px] min-h-full p-4 md:p-10 relative overflow-hidden border border-gray-50 shadow-sm mt-4">
             <div className="relative z-10">
               <Outlet />
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;