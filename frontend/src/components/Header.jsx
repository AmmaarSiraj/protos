// src/components/Header.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaBars, 
  FaTimes, 
  FaSignOutAlt, 
  FaUserCircle, 
  FaChevronDown,
  FaClipboardList,
  FaChartPie,
  FaHome,
  FaPoll,
  FaBriefcase,
  FaFileSignature,
  FaUsers,
  FaList,
  FaExchangeAlt
} from 'react-icons/fa';
import logoMAKINASIK from '../assets/logo.png';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMitraDropdownOpen, setIsMitraDropdownOpen] = useState(false);
  const [isPerencanaanDropdownOpen, setIsPerencanaanDropdownOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const getMenuClass = (path) => {
    const active = location.pathname === path;
    return `group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
      active 
        ? "text-blue-900 bg-blue-50 font-bold shadow-sm ring-1 ring-blue-100" 
        : "text-gray-600 hover:text-blue-800 hover:bg-gray-50 font-medium"
    }`;
  };

  const getParentMenuClass = (paths) => {
    const active = paths.some(p => location.pathname.startsWith(p));
    return `group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
      active 
        ? "text-blue-900 bg-blue-50 font-bold shadow-sm ring-1 ring-blue-100" 
        : "text-gray-600 hover:text-blue-800 hover:bg-gray-50 font-medium"
    }`;
  };

  return (
    // PERBAIKAN: 
    // 1. z-[999] agar tidak tertimpa layer manapun di Home
    // 2. bg-white (solid) agar tidak transparan/abu saat di atas background gelap
    <header className="sticky top-0 z-[999] w-full bg-white border-b border-gray-200 shadow-md font-sans transition-all duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* --- LOGO SECTION --- */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-2 group">
              <img 
                src={logoMAKINASIK} 
                alt="Logo" 
                className="h-10 w-auto transform group-hover:scale-105 transition-transform duration-300" 
              />
              <div className="flex flex-col leading-none">
                <span className="text-xl font-extrabold text-blue-900 tracking-tight">
                  MAKINASIK
                </span>
              </div>
            </Link>
          </div>
          
          {/* --- DESKTOP MENU --- */}
          <div className="hidden md:flex flex-1 justify-center ml-8">
            <div className="flex items-center space-x-1 lg:space-x-2">
              
              <Link to="/home" className={getMenuClass('/home')}>
                <FaHome className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                <span>Home</span>
              </Link>

              <Link to="/daftar-kegiatan" className={getMenuClass('/daftar-kegiatan')}>
                <FaPoll className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                <span>Survei</span>
              </Link>

              {/* DROPDOWN PERENCANAAN */}
              <div 
                className="relative"
                onMouseEnter={() => setIsPerencanaanDropdownOpen(true)}
                onMouseLeave={() => setIsPerencanaanDropdownOpen(false)}
              >
                <button className={getParentMenuClass(['/perencanaan', '/rekap'])}>
                    <FaClipboardList className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                    <span>Perencanaan</span>
                    <FaChevronDown size={10} className={`ml-1 transition-transform duration-200 ${isPerencanaanDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`absolute left-0 mt-0 w-60 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-200 transform origin-top-left z-[1000] ${isPerencanaanDropdownOpen ? 'opacity-100 scale-100 visible translate-y-0' : 'opacity-0 scale-95 invisible -translate-y-2'}`}>
                    <div className="p-1.5">
                        <Link to="/perencanaan" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 group/item">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-md group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                              <FaClipboardList size={14}/>
                            </div>
                            <div>
                                <span className="block text-sm font-semibold text-gray-700 group-hover/item:text-blue-700">Manajemen Perencanaan</span>
                            </div>
                        </Link>
                        <Link to="/rekap" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 group/item mt-1">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-md group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                              <FaChartPie size={14}/>
                            </div>
                            <div>
                                <span className="block text-sm font-semibold text-gray-700 group-hover/item:text-purple-700">Rekap Perencanaan</span>
                            </div>
                        </Link>
                    </div>
                </div>
              </div>

              <Link to="/penugasan" className={getMenuClass('/penugasan')}>
                <FaBriefcase className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                <span>Penugasan</span>
              </Link>

              <Link to="/spk" className={getMenuClass('/spk')}>
                <FaFileSignature className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                <span>SPK</span>
              </Link>

              {/* DROPDOWN MITRA */}
              <div 
                className="relative"
                onMouseEnter={() => setIsMitraDropdownOpen(true)}
                onMouseLeave={() => setIsMitraDropdownOpen(false)}
              >
                <button className={getParentMenuClass(['/daftar-mitra', '/transaksi-mitra'])}>
                    <FaUsers className="text-xs lg:text-sm opacity-70 group-hover:opacity-100" />
                    <span>Mitra</span>
                    <FaChevronDown size={10} className={`ml-1 transition-transform duration-200 ${isMitraDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`absolute right-0 lg:left-0 mt-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-200 transform origin-top-left z-[1000] ${isMitraDropdownOpen ? 'opacity-100 scale-100 visible translate-y-0' : 'opacity-0 scale-95 invisible -translate-y-2'}`}>
                    <div className="p-1.5">
                        <Link to="/daftar-mitra" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 group/item">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                                <FaList size={14} />
                            </div>
                            <div>
                                <span className="block text-sm font-semibold text-gray-700 group-hover/item:text-emerald-700">Master Mitra</span>
                                <span className="text-[10px] text-gray-400">Database Mitra</span>
                            </div>
                        </Link>
                        <Link to="/transaksi-mitra" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 group/item mt-1">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-md group-hover/item:bg-orange-600 group-hover/item:text-white transition-colors">
                                <FaExchangeAlt size={14} />
                            </div>
                            <div>
                                <span className="block text-sm font-semibold text-gray-700 group-hover/item:text-orange-700">Transaksi Mitra</span>
                                <span className="text-[10px] text-gray-400">Riwayat & Log</span>
                            </div>
                        </Link>
                    </div>
                </div>
              </div>

            </div>
          </div>

          {/* --- USER PROFILE (RIGHT) --- */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200 ml-4">
             <Link to="/lengkapi-profil" className="group flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-700 group-hover:text-blue-800 max-w-[100px] truncate leading-tight">
                        {user.username || 'Guest'}
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight">User</span>
                </div>
                <FaUserCircle className="text-3xl text-gray-300 group-hover:text-blue-600 transition-colors" />
             </Link>
             
             <button 
                onClick={handleLogout} 
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" 
                title="Keluar Aplikasi"
             >
               <FaSignOutAlt size={18} />
             </button>
          </div>

          {/* --- MOBILE TOGGLE --- */}
          <div className="-mr-2 flex md:hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-900 hover:bg-blue-50 focus:outline-none transition duration-200"
            >
              {isOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute top-full left-0 w-full shadow-2xl h-screen overflow-y-auto pb-40 z-[1000]">
          <div className="px-4 py-4 space-y-2">
            
            <Link to="/home" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base ${location.pathname === '/home' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <FaHome /> Home
            </Link>

            <Link to="/daftar-kegiatan" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base ${location.pathname === '/daftar-kegiatan' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <FaPoll /> Survei & Sensus
            </Link>

            {/* Mobile Perencanaan */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <FaClipboardList /> Perencanaan
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                    <Link to="/perencanaan" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-sm ${location.pathname === '/perencanaan' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                         Manajemen Perencanaan
                    </Link>
                    <Link to="/rekap-perencanaan" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-sm ${location.pathname === '/rekap-perencanaan' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                         Rekapitulasi
                    </Link>
                </div>
            </div>

            <Link to="/penugasan" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base ${location.pathname === '/penugasan' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <FaBriefcase /> Penugasan
            </Link>

            <Link to="/spk" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base ${location.pathname === '/spk' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <FaFileSignature /> SPK
            </Link>

            {/* Mobile Mitra */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <FaUsers /> Menu Mitra
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                    <Link to="/daftar-mitra" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-sm ${location.pathname === '/daftar-mitra' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                         Manajemen Mitra
                    </Link>
                    <Link to="/transaksi-mitra" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-sm ${location.pathname === '/transaksi-mitra' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                         Transaksi Mitra
                    </Link>
                </div>
            </div>

            <div className="border-t border-gray-100 my-4 pt-4">
                <Link to="/lengkapi-profil" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                    <FaUserCircle className="text-xl" /> 
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">Profil Saya</span>
                        <span className="text-xs text-gray-400">{user.username}</span>
                    </div>
                </Link>
                <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg font-bold transition mt-1">
                    <FaSignOutAlt /> Keluar Aplikasi
                </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

export default Header;