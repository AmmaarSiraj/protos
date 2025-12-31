import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaTrash, 
  FaPlus, 
  FaTable, 
  FaTag, 
  FaChevronLeft, 
  FaChevronRight 
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const ManajemenJabatan = () => {
  const [jabatanList, setJabatanList] = useState([]);
  const [formData, setFormData] = useState({
    kode_jabatan: '',
    nama_jabatan: ''
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

  const fetchJabatan = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/api/jabatan`, {
          headers: getAuthHeaders()
      }); 
      
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        setJabatanList(response.data.data);
      } else {
        setJabatanList([]);
      }
      // Reset ke halaman 1 saat data baru diambil
      setCurrentPage(1);
      setLoading(false);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
      setLoading(false);
      if (err.response?.status === 401) {
          Swal.fire('Sesi Habis', 'Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.', 'error');
      } else {
          Swal.fire('Error', 'Gagal memuat daftar jabatan.', 'error');
      }
    }
  };
  
  useEffect(() => {
    fetchJabatan();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.kode_jabatan || !formData.nama_jabatan) {
      setError("Kode dan Nama Jabatan wajib diisi!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/jabatan`, formData, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Berhasil', 'Jabatan berhasil ditambahkan.', 'success');
          setFormData({ kode_jabatan: '', nama_jabatan: '' });
          fetchJabatan();
      }
    } catch (err) {
      const msg = err.response?.data?.errors?.kode_jabatan?.[0] || 
                  err.response?.data?.errors?.nama_jabatan?.[0] ||
                  err.response?.data?.message || 
                  "Terjadi kesalahan saat menyimpan.";
      Swal.fire('Gagal', msg, 'error');
      setError(msg);
    }
  };

  const handleDelete = async (kode) => {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus jabatan dengan kode ${kode}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(`${API_URL}/api/jabatan/${kode}`, {
          headers: getAuthHeaders()
      });
      
      if (response.data.status === 'success') {
          Swal.fire('Terhapus!', 'Jabatan berhasil dihapus.', 'success');
          fetchJabatan();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus jabatan. Pastikan jabatan tidak sedang digunakan di Honorarium.";
      Swal.fire('Gagal', msg, 'error');
    }
  };

  // --- LOGIKA PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = jabatanList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jabatanList.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2">
        <FaTag className='inline mr-3 text-blue-600' /> Manajemen Jabatan Mitra
      </h1>

      {/* --- BAGIAN FORM INPUT (CARD DESIGN) --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 text-gray-800 flex items-center gap-2">
            <FaPlus className='text-blue-600' size={18}/> Tambah Jabatan Baru
        </h2>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200 font-medium">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm border border-green-200 font-medium">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Jabatan</label>
            <input
              type="text"
              name="kode_jabatan"
              value={formData.kode_jabatan}
              onChange={handleChange}
              placeholder="Contoh: PPL-01"
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-mono uppercase"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Jabatan</label>
            <input
              type="text"
              name="nama_jabatan"
              value={formData.nama_jabatan}
              onChange={handleChange}
              placeholder="Contoh: Petugas Pencacah Lapangan"
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>

          <div className="w-full">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-2"
            >
                <FaPlus size={14}/> Simpan Jabatan
            </button>
          </div>
        </form>
      </div>

      {/* --- BAGIAN TABEL DATA (CLEANER LOOK) --- */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaTable className='inline text-gray-500' size={18}/> Daftar Jabatan Tersedia
          </h2>
          <span className="text-sm font-bold text-gray-600 px-3 py-1 rounded-full bg-gray-200">Total: {jabatanList.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '5%' }}>No</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '25%' }}>Kode Jabatan</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '45%' }}>Nama Jabatan</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center" style={{ width: '15%' }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">Memuat data...</td>
                </tr>
              ) : jabatanList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500 italic">Belum ada data jabatan yang terdaftar.</td>
                </tr>
              ) : (
                currentData.map((item, index) => (
                  <tr key={item.kode_jabatan} className="hover:bg-blue-50/50 transition">
                    
                    {/* Sel 1: No (Disesuaikan dengan Pagination) */}
                    <td className="px-6 py-4 text-sm text-gray-600 align-top" style={{ width: '5%' }}>
                        {indexOfFirstItem + index + 1}
                    </td>
                    
                    {/* Sel 2: Kode Jabatan */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 font-mono align-top" style={{ width: '25%' }}>
                        {item.kode_jabatan}
                    </td>
                    
                    {/* Sel 3: Nama Jabatan */}
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-800 align-top" style={{ width: '45%' }}>
                        {item.nama_jabatan}
                    </td>

                    {/* Sel 4: Aksi */}
                    <td className="px-6 py-4 text-center align-top" style={{ width: '15%' }}>
                      <button
                        onClick={() => handleDelete(item.kode_jabatan)}
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
        {jabatanList.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
               <div className="text-xs text-gray-500">
                  Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, jabatanList.length)} dari <strong>{jabatanList.length}</strong> jabatan
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

export default ManajemenJabatan;