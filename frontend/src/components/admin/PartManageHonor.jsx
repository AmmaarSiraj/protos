// src/components/admin/PartManageHonor.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCoins, FaTag, FaSave } from 'react-icons/fa';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const PartManageHonor = ({ idSubKegiatan, initialData, onRefresh }) => {
  const [honorList, setHonorList] = useState([]);
  const [jabatanOptions, setJabatanOptions] = useState([]);
  const [satuanOptions, setSatuanOptions] = useState([]);
  
  // State untuk form tambah baru
  const [newHonor, setNewHonor] = useState({
    kode_jabatan: '',
    tarif: 0,
    id_satuan: 1,
    basis_volume: 1,
    beban_anggaran: '' // Pastikan field ini ada di state awal
  });

  // Sinkronisasi data saat props berubah (setelah refresh dari parent)
  useEffect(() => {
    if (initialData) {
      setHonorList(initialData);
    }
  }, [initialData]);

  // Fetch Data Master (Jabatan & Satuan)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resJab, resSat] = await Promise.all([
          axios.get(`${API_URL}/api/jabatan-mitra`, config),
          axios.get(`${API_URL}/api/satuan`, config)
        ]);
        
        setJabatanOptions(resJab.data);
        setSatuanOptions(resSat.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Handle Perubahan pada baris yang sudah ada (Existing)
  const handleExistingChange = (id, field, value) => {
    setHonorList(honorList.map(h => 
      h.id_honorarium === id ? { ...h, [field]: value } : h
    ));
  };

  // Simpan Perubahan per Baris (Update)
  const handleUpdate = async (honor) => {
    try {
      const token = localStorage.getItem('token');
      
      // Payload Update
      const payload = {
        id_subkegiatan: idSubKegiatan,
        kode_jabatan: honor.kode_jabatan,
        tarif: honor.tarif,
        id_satuan: honor.id_satuan,
        basis_volume: honor.basis_volume,
        beban_anggaran: honor.beban_anggaran // Penting: Kirim data ini
      };

      await axios.put(`${API_URL}/api/honorarium/${honor.id_honorarium}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Tersimpan',
        text: 'Perubahan honorarium berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
      
      // Refresh data induk agar tampilan sinkron dengan DB
      if(onRefresh) onRefresh();

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.error || 'Gagal update honor', 'error');
    }
  };

  // Tambah Honor Baru
  const handleAdd = async () => {
    if (!newHonor.kode_jabatan || newHonor.tarif <= 0) {
      return Swal.fire('Validasi', 'Pilih jabatan dan isi tarif dengan benar.', 'warning');
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/honorarium`, {
        id_subkegiatan: idSubKegiatan,
        ...newHonor // Spread operator akan menyertakan beban_anggaran
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Reset Form
      setNewHonor({ kode_jabatan: '', tarif: 0, id_satuan: 1, basis_volume: 1, beban_anggaran: '' });
      
      if(onRefresh) onRefresh();
      
      Swal.fire({ 
        icon: 'success', 
        title: 'Berhasil', 
        text: 'Honorarium ditambahkan.', 
        timer: 1500, 
        showConfirmButton: false, 
        position: 'top-end', 
        toast: true 
      });

    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.error || 'Gagal tambah honor', 'error');
    }
  };

  // Hapus Honor
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus honor ini?',
      text: "Data tidak bisa dikembalikan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/honorarium/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if(onRefresh) onRefresh();
      } catch (err) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* List Honor Existing */}
      {honorList.map((h) => (
        <div key={h.id_honorarium} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-sm transition hover:shadow-md">
           
           {/* Baris 1: Jabatan, Tarif, Volume */}
           <div className="flex flex-col md:flex-row gap-4 mb-3">
              <div className="w-full md:w-1/4">
                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jabatan</label>
                 <select 
                    value={h.kode_jabatan} 
                    disabled 
                    className="w-full px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-500 cursor-not-allowed"
                 >
                    {/* Tampilkan nama jabatan dari data yang ada */}
                    <option value={h.kode_jabatan}>{h.nama_jabatan || h.kode_jabatan}</option>
                 </select>
              </div>
              <div className="w-full md:w-1/4">
                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tarif (Rp)</label>
                 <input 
                    type="number" 
                    value={h.tarif} 
                    onChange={(e) => handleExistingChange(h.id_honorarium, 'tarif', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#1A2A80] outline-none font-bold"
                 />
              </div>
              <div className="w-full md:w-1/4 flex gap-2">
                 <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vol</label>
                    <input 
                        type="number" 
                        value={h.basis_volume} 
                        onChange={(e) => handleExistingChange(h.id_honorarium, 'basis_volume', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:border-[#1A2A80] outline-none"
                    />
                 </div>
                 <div className="flex-[2]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Satuan</label>
                    <select 
                        value={h.id_satuan} 
                        onChange={(e) => handleExistingChange(h.id_honorarium, 'id_satuan', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#1A2A80] outline-none"
                    >
                        {satuanOptions.map(s => <option key={s.id} value={s.id}>{s.nama_satuan}</option>)}
                    </select>
                 </div>
              </div>
           </div>
           
           {/* Baris 2: Beban Anggaran & Tombol Aksi */}
           <div className="flex items-end gap-3 pt-2 border-t border-dashed border-gray-100">
              <div className="flex-1">
                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <FaTag size={10} /> Kode Beban Anggaran
                 </label>
                 <input 
                    type="text" 
                    placeholder="Contoh: 2903.BMA.009.005.521213"
                    // Pastikan value mengambil dari h.beban_anggaran
                    value={h.beban_anggaran || ''} 
                    onChange={(e) => handleExistingChange(h.id_honorarium, 'beban_anggaran', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded font-mono text-gray-600 focus:border-[#1A2A80] outline-none"
                 />
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={() => handleUpdate(h)} 
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-xs font-bold"
                    title="Simpan Perubahan"
                 >
                    <FaSave /> Simpan
                 </button>
                 <button 
                    onClick={() => handleDelete(h.id_honorarium)} 
                    className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition" 
                    title="Hapus"
                 >
                    <FaTrash />
                 </button>
              </div>
           </div>
        </div>
      ))}

      {/* Form Tambah Baru (Bagian Bawah) */}
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 border-dashed mt-4">
         <h5 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
            <FaPlus size={10}/> Tambah Jabatan & Anggaran Baru
         </h5>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {/* Pilih Jabatan */}
            <select 
                value={newHonor.kode_jabatan} 
                onChange={(e) => setNewHonor({...newHonor, kode_jabatan: e.target.value})}
                className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
                <option value="">- Pilih Jabatan -</option>
                {jabatanOptions.map(j => <option key={j.kode_jabatan} value={j.kode_jabatan}>{j.nama_jabatan}</option>)}
            </select>
            
            {/* Input Tarif */}
            <input 
                type="number" 
                placeholder="Tarif (Rp)" 
                value={newHonor.tarif || ''} 
                onChange={(e) => setNewHonor({...newHonor, tarif: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
            
            {/* Input Volume & Satuan */}
            <div className="flex gap-2">
                <input 
                    type="number" 
                    placeholder="Vol" 
                    value={newHonor.basis_volume} 
                    onChange={(e) => setNewHonor({...newHonor, basis_volume: parseInt(e.target.value)})}
                    className="w-1/3 px-3 py-2 border border-blue-200 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <select 
                    value={newHonor.id_satuan} 
                    onChange={(e) => setNewHonor({...newHonor, id_satuan: parseInt(e.target.value)})}
                    className="w-2/3 px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                >
                    {satuanOptions.map(s => <option key={s.id} value={s.id}>{s.nama_satuan}</option>)}
                </select>
            </div>
         </div>

         {/* Input Beban Anggaran Baru */}
         <div className="flex gap-3">
             <input 
                type="text" 
                placeholder="Kode Beban Anggaran (Contoh: 2903.BMA...)" 
                value={newHonor.beban_anggaran} 
                onChange={(e) => setNewHonor({...newHonor, beban_anggaran: e.target.value})}
                className="flex-1 px-3 py-2 border border-blue-200 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
             />
             <button 
                onClick={handleAdd} 
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-700 transition"
             >
                Tambah
             </button>
         </div>
      </div>

    </div>
  );
};

export default PartManageHonor;