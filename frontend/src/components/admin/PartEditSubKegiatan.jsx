// src/components/admin/PartEditSubKegiatan.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaSave, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import PartManageHonor from './PartManageHonor';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const PartEditSubKegiatan = ({ sub, onDelete, onUpdateSuccess }) => {
  // State lokal untuk form edit info dasar
  const [formData, setFormData] = useState({
    nama_sub_kegiatan: sub.nama_sub_kegiatan,
    deskripsi: sub.deskripsi || '',
    tanggal_mulai: sub.tanggal_mulai ? sub.tanggal_mulai.split('T')[0] : '',
    tanggal_selesai: sub.tanggal_selesai ? sub.tanggal_selesai.split('T')[0] : ''
  });

  const [loading, setLoading] = useState(false);
  const [isHonorExpanded, setIsHonorExpanded] = useState(false);

  // Fungsi Konfirmasi Hapus (SweetAlert)
  const confirmDelete = () => {
    Swal.fire({
      title: 'Hapus Kegiatan Ini?',
      text: "Data sub kegiatan beserta seluruh aturan honorarium di dalamnya akan dihapus permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus Permanen!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        // Panggil prop onDelete yang dikirim dari parent
        onDelete(sub.id);
      }
    });
  };

  // Fungsi Simpan Perubahan Info Utama
  const handleSaveInfo = async () => {
    if (!formData.nama_sub_kegiatan || !formData.tanggal_mulai) {
        return Swal.fire('Validasi', 'Nama Kegiatan dan Tanggal Mulai wajib diisi.', 'warning');
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Panggil endpoint update info sub kegiatan
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
      
      // Refresh data di parent agar tampilan sinkron
      if (onUpdateSuccess) onUpdateSuccess();

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan perubahan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden transition hover:shadow-md">
      
      {/* Header Card */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
         <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            Edit Kegiatan
            <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">ID: {sub.id}</span>
         </h3>
         <button 
            onClick={confirmDelete} 
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
            title="Hapus Kegiatan Ini Secara Permanen"
         >
            <FaTrash />
         </button>
      </div>

      <div className="p-6">
         {/* Form Input Dasar */}
         <div className="grid grid-cols-1 gap-5 mb-6">
            
            {/* Nama Kegiatan */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.nama_sub_kegiatan}
                    onChange={(e) => setFormData({...formData, nama_sub_kegiatan: e.target.value})}
                    placeholder="Contoh: Pencacahan Lapangan"
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm outline-none transition"
                />
            </div>
            
            {/* Deskripsi */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi</label>
                <textarea
                    rows="2"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm outline-none resize-none transition"
                    placeholder="Deskripsi singkat kegiatan..."
                />
            </div>

            {/* Jadwal Pelaksanaan */}
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
                            className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none bg-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 font-bold block mb-1">SELESAI</label>
                        <input 
                            type="date" 
                            value={formData.tanggal_selesai}
                            onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})}
                            className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none bg-white"
                        />
                    </div>
                </div>
            </div>
         </div>

         {/* Tombol Simpan Info Utama */}
         <div className="flex justify-end mb-6 pb-6 border-b border-gray-100">
            <button 
                onClick={handleSaveInfo}
                disabled={loading}
                className="bg-[#1A2A80] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-50"
            >
                {loading ? 'Menyimpan...' : <><FaSave /> Simpan Perubahan Info</>}
            </button>
         </div>

         {/* Accordion Kelola Honorarium */}
         <div>
            <button 
                onClick={() => setIsHonorExpanded(!isHonorExpanded)}
                className={`w-full flex justify-between items-center text-sm font-bold p-3 rounded-lg transition border ${isHonorExpanded ? 'bg-blue-50 border-blue-200 text-[#1A2A80]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
                <span className="flex items-center gap-2">
                    Kelola Aturan Honorarium 
                    <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                        {sub.honorList ? sub.honorList.length : 0} Item
                    </span>
                </span>
                <span>{isHonorExpanded ? 'Tutup ▲' : 'Buka / Kelola ▼'}</span>
            </button>
            
            {isHonorExpanded && (
                <div className="mt-4 animate-fade-in-down pl-1">
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