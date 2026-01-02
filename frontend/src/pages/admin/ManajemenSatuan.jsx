import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaTrash, 
  FaPlus, 
  FaTable, 
  FaRulerCombined, 
  FaChevronLeft, 
  FaChevronRight 
} from 'react-icons/fa'; // Menambahkan icon navigasi

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const ManajemenSatuan = () => {
  const [satuanList, setSatuanList] = useState([]);
  const [formData, setFormData] = useState({
    nama_satuan: '',
    alias: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // --- Fetch Data Satuan ---
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
      // Reset ke halaman 1 saat data baru diambil
      setCurrentPage(1);
      setLoading(false);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
      setLoading(false);
      if (err.response?.status === 401) {
          Swal.fire('Sesi Habis', 'Sesi Anda telah berakhir. Silakan login kembali.', 'error');
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

  // --- Tambah Data ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nama_satuan) {
      setError("Nama Satuan wajib diisi!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/satuan-kegiatan`, formData, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Berhasil', 'Satuan kegiatan berhasil ditambahkan.', 'success');
          setFormData({ nama_satuan: '', alias: '' }); // Reset form
          fetchSatuan(); // Refresh tabel
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

  // --- Hapus Data ---
  const handleDelete = async (id) => {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus satuan ini?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(`${API_URL}/api/satuan-kegiatan/${id}`, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Terhapus!', 'Satuan kegiatan berhasil dihapus.', 'success');
          fetchSatuan();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus satuan.";
      Swal.fire('Gagal', msg, 'error');
    }
  };

  // --- LOGIKA PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = satuanList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(satuanList.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2">
        <FaRulerCombined className='inline mr-3 text-blue-600' /> Manajemen Satuan Kegiatan
      </h1>

      {/* --- BAGIAN FORM INPUT --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 text-gray-800 flex items-center gap-2">
            <FaPlus className='text-blue-600' size={18}/> Tambah Satuan Baru
        </h2>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200 font-medium">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm border border-green-200 font-medium">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          
          {/* Input Nama Satuan */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Satuan <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="nama_satuan"
              value={formData.nama_satuan}
              onChange={handleChange}
              placeholder="Contoh: Orang Bulan"
              required
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>

          {/* Input Alias */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Kode / Alias (Opsional)</label>
            <input
              type="text"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              placeholder="Contoh: OB, Dok, Keg"
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-mono"
            />
          </div>

          {/* Tombol Simpan */}
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

      {/* --- BAGIAN TABEL DATA --- */}
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
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '45%' }}>Nama Satuan</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '25%' }}>Alias / Kode</th>
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
                currentData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition">
                    
                    {/* No (Dinamis sesuai page) */}
                    <td className="px-6 py-4 text-sm text-gray-600 align-top">
                        {indexOfFirstItem + index + 1}
                    </td>
                    
                    {/* Nama Satuan */}
                    <td className="px-6 py-4 whitespace-normal text-sm font-semibold text-gray-800 align-top">
                        {item.nama_satuan}
                    </td>

                    {/* Alias */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono align-top">
                        {item.alias || '-'}
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4 text-center align-top">
                      <button
                        onClick={() => handleDelete(item.id)}
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

        {/* --- PAGINATION FOOTER --- */}
        {satuanList.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
               <div className="text-xs text-gray-500">
                  Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, satuanList.length)} dari <strong>{satuanList.length}</strong> satuan
               </div>
               
               <div className="flex items-center gap-2">
                  <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                  >
                      <FaChevronLeft size={12} />
                  </button>
                  
                  <span className="text-xs font-bold text-gray-700 px-2">
                      Hal {currentPage} / {totalPages}
                  </span>
                  
                  <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                  >
                      <FaChevronRight size={12} />
                  </button>
               </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ManajemenSatuan;