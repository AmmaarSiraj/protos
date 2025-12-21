// src/components/admin/PartSubKegiatan.jsx
import React from 'react';
import { FaTrash, FaCalendarAlt } from 'react-icons/fa';
import PartAddHonor from './PartAddHonor';

const PartSubKegiatan = ({ subKegiatans, setSubKegiatans }) => {

  const removeSubKegiatan = (id) => {
    setSubKegiatans(subKegiatans.filter(sub => sub.id !== id));
  };

  const handleChange = (id, field, value) => {
    setSubKegiatans(subKegiatans.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  };

  const handleHonorChange = (subId, newHonorList) => {
    setSubKegiatans(subKegiatans.map(sub => 
      sub.id === subId ? { ...sub, honorList: newHonorList } : sub
    ));
  };

  return (
    <div className="space-y-8">
      {subKegiatans.map((sub, index) => (
        <div key={sub.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden relative">
          
          {/* Header Card */}
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
             <div className="flex items-center gap-3">
               <span className="bg-[#1A2A80] text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shadow-sm">
                  {index + 1}
               </span>
               <h3 className="font-bold text-gray-800 text-lg">Rincian Kegiatan</h3>
             </div>
             <button
               type="button"
               onClick={() => removeSubKegiatan(sub.id)}
               className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
               title="Hapus Kegiatan Ini"
             >
               <FaTrash />
             </button>
          </div>

          <div className="p-6">
            {/* Form Kegiatan */}
            <div className="grid grid-cols-1 gap-5 mb-6">
                
                {/* Baris 1: Nama Kegiatan (Sebelumnya Sub Kegiatan) */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nama Kegiatan <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={sub.nama_sub_kegiatan}
                        onChange={(e) => handleChange(sub.id, 'nama_sub_kegiatan', e.target.value)}
                        placeholder="Contoh: Pencacahan Lapangan"
                        className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm transition outline-none"
                    />
                </div>

                {/* Deskripsi */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi</label>
                    <textarea
                        rows="2"
                        value={sub.deskripsi}
                        onChange={(e) => handleChange(sub.id, 'deskripsi', e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent text-sm transition outline-none resize-none"
                        placeholder="Jelaskan detail pekerjaan..."
                    />
                </div>
                
                {/* Jadwal Pelaksanaan */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-3 uppercase tracking-wide">
                        <FaCalendarAlt className="text-[#1A2A80]" /> Jadwal Pelaksanaan (Acuan Periode)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1">MULAI <span className="text-red-500">*</span></label>
                            <input type="date" className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none" value={sub.tanggal_mulai} onChange={(e) => handleChange(sub.id, 'tanggal_mulai', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1">SELESAI</label>
                            <input type="date" className="w-full text-xs border border-gray-300 rounded p-2 focus:border-[#1A2A80] outline-none" value={sub.tanggal_selesai} onChange={(e) => handleChange(sub.id, 'tanggal_selesai', e.target.value)} />
                        </div>
                    </div>
                </div>

            </div>

            {/* INTEGRASI: PartAddHonor */}
            <div className="border-t border-dashed border-gray-300 pt-5 mt-2">
               <PartAddHonor 
                  honorList={sub.honorList || []} 
                  onChange={(newHonorList) => handleHonorChange(sub.id, newHonorList)}
               />
            </div>
          </div>

        </div>
      ))}
    </div>
  );
};

export default PartSubKegiatan;