import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaTrash, FaPlus, FaTable, FaLayerGroup } from 'react-icons/fa';

// Pastikan API_URL sesuai konfigurasi Anda
const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const SatuanHonorarium = () => {
  const [satuanList, setSatuanList] = useState([]);
  const [formData, setFormData] = useState({
    nama_satuan: '',
    alias: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // --- AMBIL DATA SATUAN ---
  const fetchSatuan = async () => {
    try {
      setLoading(true);
      
      // Sesuai route di api.php: Route::get('/satuan-kegiatan', ...)
      const response = await axios.get(`${API_URL}/api/satuan-kegiatan`, {
          headers: getAuthHeaders()
      }); 
      
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        setSatuanList(response.data.data);
      } else {
        setSatuanList([]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
      setLoading(false);
      if (err.response?.status === 401) {
          Swal.fire('Sesi Habis', 'Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.', 'error');
      } else {
          Swal.fire('Error', 'Gagal memuat daftar satuan.', 'error');
      }
    }
  };
  
  useEffect(() => {
    fetchSatuan();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- TAMBAH DATA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nama_satuan) {
      setError("Nama Satuan wajib diisi!");
      return;
    }

    try {
      // Sesuai route di api.php: Route::post('/satuan-kegiatan', ...)
      const response = await axios.post(`${API_URL}/api/satuan-kegiatan`, formData, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Berhasil', 'Satuan berhasil ditambahkan.', 'success');
          setFormData({ nama_satuan: '', alias: '' });
          fetchSatuan();
      }
    } catch (err) {
      const msg = err.response?.data?.errors?.nama_satuan?.[0] || 
                  err.response?.data?.errors?.alias?.[0] ||
                  err.response?.data?.message || 
                  "Terjadi kesalahan saat menyimpan.";
      Swal.fire('Gagal', msg, 'error');
      setError(msg);
    }
  };

  // --- HAPUS DATA ---
  const handleDelete = async (id, nama) => {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus satuan "${nama}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (!result.isConfirmed) return;

    try {
      // Sesuai route di api.php: Route::delete('/satuan-kegiatan/{id}', ...)
      const response = await axios.delete(`${API_URL}/api/satuan-kegiatan/${id}`, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Terhapus!', 'Satuan berhasil dihapus.', 'success');
          fetchSatuan();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus satuan. Pastikan tidak sedang digunakan.";
      Swal.fire('Gagal', msg, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2">
        <FaLayerGroup className='inline mr-3 text-blue-600' /> Manajemen Satuan Honorarium
      </h1>

      {/* --- BAGIAN FORM INPUT (CARD DESIGN) --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 text-gray-800 flex items-center gap-2">
            <FaPlus className='text-blue-600' size={18}/> Tambah Satuan Baru
        </h2>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200 font-medium">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm border border-green-200 font-medium">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Satuan</label>
            <input
              type="text"
              name="nama_satuan"
              value={formData.nama_satuan}
              onChange={handleChange}
              placeholder="Contoh: Orang Bulan"
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Alias / Singkatan</label>
            <input
              type="text"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              placeholder="Contoh: OB"
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-mono uppercase"
            />
          </div>

          <div className="w-full">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-2"
            >
                <FaPlus size={14}/> Simpan Satuan
            </button>
          </div>
        </form>
      </div>

      {/* --- BAGIAN TABEL DATA (CLEANER LOOK) --- */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaTable className='inline text-gray-500' size={18}/> Daftar Satuan Tersedia
          </h2>
          <span className="text-sm font-bold text-gray-600 px-3 py-1 rounded-full bg-gray-200">Total: {satuanList.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '5%' }}>No</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '50%' }}>Nama Satuan</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '30%' }}>Alias</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center" style={{ width: '15%' }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">Memuat data...</td>
                </tr>
              ) : satuanList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500 italic">Belum ada data satuan yang terdaftar.</td>
                </tr>
              ) : (
                satuanList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition">
                    
                    {/* Sel 1: No */}
                    <td className="px-6 py-4 text-sm text-gray-600 align-top">{index + 1}</td>
                    
                    {/* Sel 2: Nama Satuan */}
                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-800 align-top">
                        {item.nama_satuan}
                    </td>

                    {/* Sel 3: Alias */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono font-semibold align-top">
                        {item.alias || '-'}
                    </td>

                    {/* Sel 4: Aksi */}
                    <td className="px-6 py-4 text-center align-top">
                      <button
                        onClick={() => handleDelete(item.id, item.nama_satuan)}
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 shadow-sm flex items-center gap-1 mx-auto"
                      >
                        <FaTrash size={10} /> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SatuanHonorarium;