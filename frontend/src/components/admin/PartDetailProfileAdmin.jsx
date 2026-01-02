// src/components/admin/PartDetailProfileAdmin.jsx
import React from 'react';
import { FaArrowLeft, FaTimes, FaUserCircle, FaEnvelope, FaIdCard, FaUserShield } from 'react-icons/fa';

const PartDetailProfileAdmin = ({ user, onClose }) => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in-up relative overflow-y-auto">
      
      {/* Tombol CLOSE (Kanan Atas) */}
      {/* Di mobile: top-4 right-4, Desktop: top-10 right-10 */}
      <div className="absolute top-4 right-4 md:top-10 md:right-10 z-50">
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            onClose();
          }}
          className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-red-600 transition bg-white/80 backdrop-blur-sm rounded-full hover:bg-red-50 shadow-sm border border-gray-100"
          title="Tutup Profil"
        >
          <FaTimes size={20} />
        </button>
      </div>

      {/* Konten Utama Profile */}
      {/* Padding dikurangi drastis di mobile: p-4 pt-16 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-16 md:p-8 md:pt-24">
        
        {/* Avatar Besar */}
        {/* Mobile: w-24 h-24, Desktop: w-40 h-40 */}
        <div className="w-24 h-24 md:w-40 md:h-40 bg-white rounded-full shadow-xl flex items-center justify-center mb-4 md:mb-6 border-4 border-white text-gray-300 relative">
          <FaUserCircle className="w-full h-full" />
          <div className="absolute bottom-2 right-2 bg-green-500 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-white shadow-sm" title="Online"></div>
        </div>

        {/* Nama & Role */}
        {/* Font size disesuaikan: text-2xl di mobile */}
        <h2 className="text-2xl md:text-5xl font-extrabold text-gray-800 mb-2 md:mb-3 text-center tracking-tight">
            {user.username || 'Admin User'}
        </h2>
        <span className="bg-[#1A2A80] text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold tracking-wide shadow-md mb-8 md:mb-12">
            {user.role === 'admin' ? 'Administrator System' : 'User'}
        </span>

        {/* Grid Detail Informasi */}
        {/* Gap antar kartu diperkecil di mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
            
            {/* Card Email */}
            {/* Padding dalam kartu diperkecil di mobile: p-5 */}
            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3 md:gap-4 hover:shadow-lg transition hover:-translate-y-1">
                <div className="bg-blue-50 text-[#1A2A80] p-3 md:p-5 rounded-xl md:rounded-2xl text-2xl md:text-3xl mb-1 md:mb-2">
                    <FaEnvelope />
                </div>
                <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Terdaftar</p>
                    <p className="text-gray-900 font-bold text-sm md:text-lg break-all">{user.email || 'email@example.com'}</p>
                </div>
            </div>

            {/* Card ID */}
            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3 md:gap-4 hover:shadow-lg transition hover:-translate-y-1">
                <div className="bg-purple-50 text-purple-600 p-3 md:p-5 rounded-xl md:rounded-2xl text-2xl md:text-3xl mb-1 md:mb-2">
                    <FaIdCard />
                </div>
                <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">User ID Sistem</p>
                    <p className="text-gray-900 font-bold text-sm md:text-lg font-mono">#{user.id || 'UID-000'}</p>
                </div>
            </div>

            {/* Card Status */}
            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3 md:gap-4 hover:shadow-lg transition hover:-translate-y-1">
                <div className="bg-green-50 text-green-600 p-3 md:p-5 rounded-xl md:rounded-2xl text-2xl md:text-3xl mb-1 md:mb-2">
                    <FaUserShield />
                </div>
                <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status Akun</p>
                    <div className="flex items-center gap-2 justify-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-green-700 font-bold text-sm md:text-lg">Aktif</p>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer Kecil di bawah */}
        <div className="mt-8 md:mt-16 text-gray-400 text-xs md:text-sm font-medium bg-gray-50 px-4 md:px-6 py-2 rounded-full border border-gray-100 text-center">
            Terakhir login: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

      </div>
    </div>
  );
};

export default PartDetailProfileAdmin;