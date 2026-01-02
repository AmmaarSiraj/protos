// src/layouts/AdminLayout.jsx
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaClipboardList, FaCalendarAlt, FaChartLine, FaTasks, 
  FaBriefcase, FaSlidersH, FaSignOutAlt, FaUserCircle, FaUserCheck, FaBars,
  FaFileContract, FaMoneyBillWave, FaCogs, FaRulerCombined,
  FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';

import logoMAKINASIK from '../assets/logo.png'; 
import PartDetailProfileAdmin from '../components/admin/PartDetailProfileAdmin';

const menuItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: <FaHome /> },
  { path: "/admin/manage-kegiatan", label: "Survei/Sensus", icon: <FaClipboardList /> },
  { path: "/admin/perencanaan", label: "Perencanaan", icon: <FaCalendarAlt /> },
  { path: "/admin/rekap", label: "Rekap Perencanaan", icon: <FaChartLine /> },
  { path: "/admin/penugasan", label: "Penugasan", icon: <FaTasks /> },
  { path: "/admin/manajemen-mitra", label: "Manajemen Mitra", icon: <FaUserCheck /> },
  { path: "/admin/transaksi-mitra", label: "Transaksi Mitra", icon: <FaMoneyBillWave /> },
  { path: "/admin/manajemen-spk", label: "Manajemen SPK", icon: <FaFileContract /> },
  { path: "/admin/manajemen-jabatan", label: "Master Jabatan", icon: <FaBriefcase /> },
  { path: "/admin/manajemen-satuan", label: "Satuan Honor", icon: <FaRulerCombined /> },
  { path: "/admin/batas-honor", label: "Atur Batas Honor", icon: <FaSlidersH /> },
  { path: "/admin/manage-users", label: "Manajemen User", icon: <FaUsers /> },
  { path: "/admin/system-settings", label: "Pengaturan Sistem", icon: <FaCogs /> },
];

const AdminHeader = ({ title, toggleSidebar, isProfileExpanded, setIsProfileExpanded, isSidebarCollapsed, toggleCollapse }) => {
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const [userData, setUserData] = useState({ username: 'Admin', role: 'admin', email: '', id: '' });
  const [widgetWidth, setWidgetWidth] = useState(300);
  const [expandedWidth, setExpandedWidth] = useState(window.innerWidth);
  const [headerHeight, setHeaderHeight] = useState(80);
  const widgetContentRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUserData(JSON.parse(storedUser)); } catch (e) { console.error(e); }
    }
  }, []);

  const calculateWidgetSize = () => {
    const width = window.innerWidth;
    const isMobile = width < 768;
    setHeaderHeight(isMobile ? 64 : 80);

    if (widgetContentRef.current) {
      const contentWidth = widgetContentRef.current.getBoundingClientRect().width;
      setWidgetWidth(contentWidth + (isMobile ? 40 : 90));
    }

    const sidebarWidth = isSidebarCollapsed ? 80 : 288;
    setExpandedWidth(isMobile ? width : width - sidebarWidth);
  };

  useLayoutEffect(() => {
    calculateWidgetSize();
    window.addEventListener('resize', calculateWidgetSize);
    return () => window.removeEventListener('resize', calculateWidgetSize);
  }, [userData.username, isSidebarCollapsed]);

  return (
    <header className="flex justify-between items-start pt-2 px-4 md:px-8 bg-transparent relative h-16 md:h-20 z-30 transition-all duration-300">
      
      <div className={`flex items-center gap-4 mt-1 md:mt-2 transition-all duration-500 ${isProfileExpanded ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
        <button onClick={toggleSidebar} className="md:hidden text-gray-600 hover:text-[#1A2A80] text-xl focus:outline-none"><FaBars /></button>
        
        <button 
            onClick={toggleCollapse} 
            className="hidden md:flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-[#1A2A80] hover:bg-blue-50 transition-all shadow-sm"
        >
            {isSidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>

        <div>
          <h2 className="text-xl md:text-3xl font-extrabold text-gray-800 tracking-tight line-clamp-1">{title}</h2>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">{currentDate}</p>
        </div>
      </div>
      
      <div 
        onClick={() => !isProfileExpanded && setIsProfileExpanded(true)}
        style={{
            width: isProfileExpanded ? `${expandedWidth}px` : `${widgetWidth}px`,
            height: isProfileExpanded ? '100vh' : `${headerHeight}px`,
            borderRadius: isProfileExpanded ? '0px' : '0px 0px 0px 40px'
        }}
        className={`bg-gray-100 shadow-sm overflow-hidden fixed top-0 right-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] flex flex-col ${isProfileExpanded ? 'cursor-default' : 'cursor-pointer hover:bg-gray-200'}`}
      >
         <div className="w-full h-full relative">
           {isProfileExpanded ? (
              <PartDetailProfileAdmin user={userData} onClose={() => setIsProfileExpanded(false)} />
           ) : (
              <div className="absolute top-0 right-0 w-full h-full flex items-center justify-end pr-4 md:pr-8 pt-1 md:pt-2">
                  <div ref={widgetContentRef} className="flex items-center gap-3 md:gap-4">
                      <div className="text-right whitespace-nowrap hidden md:block">
                          <p className="text-sm font-bold text-gray-800 leading-tight block select-none">{userData.username}</p>
                          <span className="text-[10px] font-bold text-[#1A2A80] bg-blue-100 px-2 py-0.5 rounded-full select-none inline-block mt-1">
                              {userData.role === 'admin' ? 'Administrator' : 'User'}
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

const Sidebar = ({ handleLogout, onMenuClick, isCollapsed }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // --- LOGIKA FILTER MENU BERDASARKAN ROLE ---
  const [role, setRole] = useState('user'); // Default user

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setRole(parsedUser.role);
      } catch (e) {
        console.error("Gagal membaca role user", e);
      }
    }
  }, []);

  // Daftar menu yang DILARANG untuk User biasa
  const restrictedPaths = [
    '/admin/manage-users',
    '/admin/system-settings',
    '/admin/batas-honor',
    '/admin/manajemen-satuan',
    '/admin/manajemen-jabatan'
  ];

  // Filter menu
  const filteredMenu = menuItems.filter(item => {
    if (role === 'admin') return true; // Admin lihat semua
    // Jika user, sembunyikan path yang ada di restrictedPaths
    return !restrictedPaths.includes(item.path);
  });
  // -------------------------------------------

  return (
    <aside className={`bg-[#1A2A80] text-white flex flex-col overflow-hidden relative z-20 h-full shadow-2xl md:shadow-none transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`}>
      <div className={`p-4 text-center border-b border-white/10 z-10 relative transition-all duration-500 ${isCollapsed ? 'px-2' : 'p-8'}`}>
        <div className="inline-block group">
          <div className={`${isCollapsed ? 'w-12 h-12' : 'w-20 h-20'} rounded-2xl bg-white mx-auto border-2 border-white/20 overflow-hidden shadow-lg p-2 flex items-center justify-center transition-all duration-500`}>
            <img src={logoMAKINASIK} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        {!isCollapsed && (
          <div className="animate-fade-in">
            <h1 className="mt-4 text-2xl font-extrabold tracking-wider">MAKINASIK</h1>
            <p className="text-xs font-medium text-blue-200 mt-1">Manajemen Kinerja dan Administrasi Mitra</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar relative z-10">
        {!isCollapsed && <p className="px-8 text-xs font-bold text-blue-200 uppercase mb-4 tracking-wider animate-fade-in">Menu Utama</p>}
        
        {/* Render Menu yang sudah difilter */}
        {filteredMenu.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMenuClick} 
              title={isCollapsed ? item.label : ""}
              className={`relative group flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} py-4 transition-all duration-300 overflow-hidden ${active ? "text-[#1A2A80]" : "text-blue-200 hover:text-white"}`}
              style={{
                marginLeft: isCollapsed ? '10px' : '20px',
                marginRight: '0px',
                borderTopLeftRadius: '50px',
                borderBottomLeftRadius: '50px',
              }}
            >
              <div className={`absolute inset-0 bg-white z-0 transition-transform duration-500 ${active ? 'translate-x-0' : 'translate-x-full'}`} />
              <span className={`relative z-10 text-xl transition-all duration-300 ${active ? 'scale-110 text-[#1A2A80]' : ''}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className={`relative z-10 text-sm font-medium ml-4 transition-all duration-300 whitespace-nowrap ${active ? 'font-bold translate-x-1' : ''}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-white/10 z-10 bg-[#1A2A80] ${isCollapsed ? 'flex justify-center' : 'p-6'}`}>
        <button onClick={handleLogout} className={`flex items-center gap-3 text-blue-200 hover:text-white transition-colors group ${isCollapsed ? 'justify-center' : 'w-full px-4 py-3 bg-white/5 rounded-xl'}`}>
          <span className="text-lg"><FaSignOutAlt /></span>
          {!isCollapsed && <span className="font-medium text-sm">Keluar</span>}
        </button>
      </div>
    </aside>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const currentItem = menuItems.find(item => item.path === location.pathname);
  const pageTitle = currentItem ? currentItem.label : "Admin Dashboard";

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar Wrapper */}
      <div className={`
        fixed inset-y-0 left-0 z-40 h-full transition-all duration-500 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
      `}>
        <Sidebar 
          handleLogout={handleLogout} 
          onMenuClick={() => setIsSidebarOpen(false)} 
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
        <AdminHeader 
          title={pageTitle} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isProfileExpanded={isProfileExpanded}
          setIsProfileExpanded={setIsProfileExpanded}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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