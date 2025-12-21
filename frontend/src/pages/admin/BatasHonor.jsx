import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaCalendarAlt, FaDollarSign, FaTrash, FaEdit, FaPlus, FaTable, FaInfoCircle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const BatasHonor = () => {
  const [aturanList, setAturanList] = useState([]);
  const [formData, setFormData] = useState({
    periode: '',
    batas_honor: ''
  });
  // editingId sekarang menyimpan ID unik database (e.g., 12), bukan periode (e.g., "2029")
  const [editingId, setEditingId] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const cleanNumber = (formattedValue) => {
    return String(formattedValue).replace(/[Rp.\s,]/g, '');
  };
  
  const formatInputRupiah = (num) => {
    const number = Number(num);
    
    if (String(num) === '' || number === 0) {
        return '';
    }
    if (isNaN(number) || number < 0) return '';
    
    return new Intl.NumberFormat('id-ID', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
  };

  const formatTableRupiah = (num) => {
    const number = Number(num);
    if (isNaN(number) || number === 0) return 'Rp 0';
    
    const formattedNumber = new Intl.NumberFormat('id-ID', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(number);

    return `Rp ${formattedNumber}`;
  };
  
  const fetchAturan = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/api/aturan-periode`, {
          headers: getAuthHeaders()
      }); 
      
      if (response.data && Array.isArray(response.data.data)) {
        const processedList = response.data.data.map(item => {
            const cleanedApiValue = String(item.batas_honor).replace(/\.00$/, '');
            return {
                ...item,
                batas_honor: cleanedApiValue
            }
        }).sort((a, b) => b.periode - a.periode); 

        setAturanList(processedList);
      } else {
        setAturanList([]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Gagal mengambil data aturan honor:", err);
      setLoading(false);
      if (err.response?.status === 401) {
          Swal.fire('Sesi Habis', 'Sesi Anda telah berakhir atau tidak valid.', 'error');
      } else {
          Swal.fire('Error', 'Gagal memuat daftar Batas Honor.', 'error');
      }
    }
  };
  
  useEffect(() => {
    fetchAturan();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'batas_honor') {
        const cleaned = cleanNumber(value);
        setFormData({ ...formData, [name]: cleaned });
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const payload = {
        periode: formData.periode,
        batas_honor: parseFloat(formData.batas_honor)
    };

    if (!payload.periode || isNaN(payload.batas_honor) || payload.batas_honor <= 0) {
      setError("Periode (Tahun) dan Batas Honor wajib diisi dengan nilai positif!");
      return;
    }

    try {
      if (editingId) {
        // Menggunakan editingId (yang sekarang adalah database ID) untuk UPDATE
        await axios.put(`${API_URL}/api/aturan-periode/${editingId}`, payload, {
            headers: getAuthHeaders()
        });
        Swal.fire('Berhasil', 'Aturan Honor berhasil diperbarui.', 'success');
      } else {
        await axios.post(`${API_URL}/api/aturan-periode`, payload, {
            headers: getAuthHeaders()
        });
        Swal.fire('Berhasil', 'Aturan Honor berhasil ditambahkan.', 'success');
      }
      
      setFormData({ periode: '', batas_honor: '' });
      setEditingId(null);
      fetchAturan();

    } catch (err) {
      const msg = err.response?.data?.errors?.periode?.[0] || 
                  err.response?.data?.errors?.batas_honor?.[0] ||
                  err.response?.data?.message || 
                  "Terjadi kesalahan saat menyimpan.";
      Swal.fire('Gagal', msg, 'error');
      setError(msg);
    }
  };
  
  const handleEdit = (item) => {
      // Menyimpan ID unik database (item.id) ke editingId
      setEditingId(item.id); 
      setFormData({
          periode: String(item.periode),
          batas_honor: item.batas_honor 
      });
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setFormData({ periode: '', batas_honor: '' });
  };


  const handleDelete = async (idToDelete, periodeText) => {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus Batas Honor tahun ${periodeText}? (ID: ${idToDelete})`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (!result.isConfirmed) return;

    try {
      // Menggunakan idToDelete (yang merupakan database ID) untuk DELETE
      await axios.delete(`${API_URL}/api/aturan-periode/${idToDelete}`, {
          headers: getAuthHeaders()
      });
      
      Swal.fire('Terhapus!', 'Batas Honor berhasil dihapus.', 'success');
      fetchAturan();
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus aturan. Mungkin sedang digunakan di sistem lain.";
      Swal.fire('Gagal', msg, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 border-b pb-2">
        <FaDollarSign className='inline mr-3 text-green-600' /> Manajemen Batas Honor Mitra
      </h1>
      
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 text-gray-800 flex items-center gap-2">
            {editingId ? 
              // Menampilkan periode untuk informasi yang lebih mudah dibaca
              <><FaEdit className='text-yellow-600' size={18}/> Edit Batas Honor Tahun {formData.periode}</> 
              : 
              <><FaPlus className='text-blue-600' size={18}/> Tambah Batas Honor Baru</>
            }
        </h2>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200 font-medium flex items-center gap-2"><FaInfoCircle/> {error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Periode (Tahun)</label>
            <div className="relative">
                <input
                    type="number"
                    name="periode"
                    value={formData.periode}
                    onChange={handleChange}
                    placeholder="Contoh: 2025"
                    min="2000"
                    max="2100"
                    disabled={!!editingId}
                    className={`w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <FaCalendarAlt className="absolute right-3 top-3 text-gray-400" size={16}/>
            </div>
            </div>

          <div className="w-full md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Batas Honor Maksimum (Setahun)</label>
            <div className="relative">
                <input
                    type="text"
                    name="batas_honor"
                    value={formatInputRupiah(formData.batas_honor)}
                    onChange={handleChange}
                    placeholder="Contoh: 50.000.000"
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-semibold text-right"
                />
                <span className="absolute left-3 top-3 text-gray-600 text-sm font-semibold">Rp</span>
            </div>
          </div>

          <div className="w-full md:w-auto">
            <button
              type="submit"
              className={`w-full font-semibold py-2.5 px-6 rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-2 ${
                  editingId ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
                {editingId ? <><FaEdit size={14}/> Perbarui</> : <><FaPlus size={14}/> Simpan Baru</>}
            </button>
            {editingId && (
                <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2.5 px-6 rounded-lg transition duration-200 text-sm"
                >
                    Batal Edit
                </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaTable className='inline text-gray-500' size={18}/> Daftar Batas Honor
          </h2>
          <span className="text-sm font-bold text-gray-600 px-3 py-1 rounded-full bg-gray-200">Total: {aturanList.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '5%' }}>No</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '20%' }}>Periode (Tahun)</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ width: '45%' }}>Batas Honor (Maksimum)</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center" style={{ width: '20%' }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">Memuat data...</td>
                </tr>
              ) : aturanList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500 italic">Belum ada aturan Batas Honor yang terdaftar.</td>
                </tr>
              ) : (
                aturanList.map((item, index) => (
                  // Menggunakan item.id untuk memeriksa apakah baris ini sedang di-edit
                  <tr key={item.id} className={`hover:bg-blue-50/50 transition ${editingId === item.id ? 'bg-yellow-50' : ''}`}>
                    
                    <td className="px-6 py-4 text-sm text-gray-600 align-top">{index + 1}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 font-mono align-top">
                        {item.periode}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-800 align-top font-bold">
                        {formatTableRupiah(item.batas_honor)}
                    </td>

                    <td className="px-6 py-4 text-center align-top space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        // Menggunakan item.id untuk memeriksa status disabled
                        disabled={editingId === item.id} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 shadow-sm inline-flex items-center gap-1 ${
                            editingId === item.id 
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                            : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-600 hover:text-white'
                        }`}
                      >
                        <FaEdit size={10} /> Edit
                      </button>
                      <button
                        // Mengirim item.id untuk DELETE
                        onClick={() => handleDelete(item.id, item.periode)} 
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 shadow-sm inline-flex items-center gap-1"
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

export default BatasHonor;