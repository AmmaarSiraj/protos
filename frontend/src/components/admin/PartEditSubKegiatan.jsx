// src/components/admin/PartEditSubKegiatan.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaSave, FaTrash, FaCheck } from 'react-icons/fa';
import Swal from 'sweetalert2';
import PartManageHonor from './PartManageHonor';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const PartEditSubKegiatan = ({ sub, onDelete, onUpdateSuccess }) => {
  // State lokal untuk form edit info
  const [formData, setFormData] = useState({
    nama_sub_kegiatan: sub.nama_sub_kegiatan,
    deskripsi: sub.deskripsi || '',
    tanggal_mulai: sub.tanggal_mulai ? sub.tanggal_mulai.split('T')[0] : '',
    tanggal_selesai: sub.tanggal_selesai ? sub.tanggal_selesai.split('T')[0] : ''
  });

  const [loading, setLoading] = useState(false);
  const [isHonorExpanded, setIsHonorExpanded] = useState(false);

  const handleSaveInfo = async () => {
    if (!formData.nama_sub_kegiatan || !formData.tanggal_mulai) {
        return Swal.fire('Validasi', 'Nama Kegiatan dan Tanggal Mulai wajib diisi.', 'warning');
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Panggil endpoint updateSubKegiatanInfo
      await axios.put(`${API_URL}/api/subkegiatan/${sub.id}/info`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Informasi kegiatan diperbarui.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      onUpdateSuccess(); // Refresh data induk
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      
      {/* Header Card */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
         <h3 className="font-bold text-gray-700 text-lg">Edit Kegiatan</h3>
         <button 
            onClick={() => onDelete(sub.id)} 
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
            title="Hapus Kegiatan Ini"
         >
            <FaTrash />
         </button>
      </div>

      <div className="p-6">
         {/* Form Input Dasar */}
         <div className="grid grid-cols-1 gap-5 mb-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nama Kegiatan <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    value={formData.nama_sub_kegiatan}
                    onChange={(e) => setFormData({...formData, nama_sub_kegiatan: e.target.value})}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm outline-none"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi</label>
                <textarea
                    rows="2"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm outline-none resize-none"
                />
            </div>

            {/* Jadwal Pelaksanaan (Tanpa Periode Manual) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-3 uppercase tracking-wide">
                    <FaCalendarAlt className="text-[#1A2A80]" /> Jadwal Pelaksanaan
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-gray-400 font-bold block mb-1">MULAI <span className="text-red-500">*</span></label>
                        <input 
                            type="date" 
                            value={formData.tanggal_mulai}
                            onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})}
                            className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 font-bold block mb-1">SELESAI</label>
                        <input 
                            type="date" 
                            value={formData.tanggal_selesai}
                            onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})}
                            className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none"
                        />
                    </div>
                </div>
            </div>
         </div>

         {/* Tombol Simpan Info */}
         <div className="flex justify-end mb-6">
            <button 
                onClick={handleSaveInfo}
                disabled={loading}
                className="bg-[#1A2A80] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-900 transition flex items-center gap-2"
            >
                {loading ? 'Menyimpan...' : <><FaSave /> Simpan Info Utama</>}
            </button>
         </div>

         {/* Accordion Honorarium */}
         <div className="border-t border-gray-200 pt-4">
            <button 
                onClick={() => setIsHonorExpanded(!isHonorExpanded)}
                className="w-full flex justify-between items-center text-sm font-bold text-gray-700 hover:bg-gray-50 p-3 rounded-lg transition"
            >
                <span>Kelola Aturan Honorarium ({sub.honorList ? sub.honorList.length : 0} item)</span>
                <span>{isHonorExpanded ? 'Tutup ▲' : 'Buka ▼'}</span>
            </button>
            
            {isHonorExpanded && (
                <div className="mt-3 animate-fade-in-down">
                    <PartManageHonor 
                        idSubKegiatan={sub.id} 
                        initialData={sub.honorList || []}
                        onRefresh={onUpdateSuccess}
                    />
                </div>
            )}
         </div>

      </div>
    </div>
  );
};

export default PartEditSubKegiatan;