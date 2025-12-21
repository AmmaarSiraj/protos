// src/pages/admin/ManageKegiatan.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaDownload, 
  FaFileUpload, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaChevronDown, 
  FaChevronUp,
  FaInfoCircle,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaTimes, // Icon Close Modal
  FaSave   // Icon Save Modal
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://makinasik.web.bps.go.id';

const ManageKegiatan = () => {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State untuk Expand/Collapse
  const [expandedRow, setExpandedRow] = useState(null); 
  
  // State untuk Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // State untuk Import
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // --- STATE BARU: MODAL EDIT SUB ---
  const [editingSub, setEditingSub] = useState(null); // Object sub yang sedang diedit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  // 1. FETCH DATA (Kegiatan + Subkegiatan sekaligus)
  const fetchKegiatan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      if (!token) throw new Error('No auth token found. Please login.');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const res = await axios.get(`${API_URL}/api/kegiatan`, config);

      // Ambil data dari wrapper resource Laravel
      const allKegiatan = res.data.data || [];

      const mergedData = allKegiatan.map(k => {
         // Ambil subkegiatan langsung dari properti relasi yang dikirim backend
         const mySubs = k.subkegiatan || [];
         
         const activeYears = new Set();
         mySubs.forEach(sub => {
            if (sub.tanggal_mulai) {
                const y = new Date(sub.tanggal_mulai).getFullYear();
                if (!isNaN(y)) activeYears.add(y.toString());
            }
         });

         if (activeYears.size === 0 && k.created_at) {
             const createdYear = new Date(k.created_at).getFullYear();
             if (!isNaN(createdYear)) activeYears.add(createdYear.toString());
         }

         return {
             ...k,
             active_years: Array.from(activeYears),
             sub_list: mySubs 
         };
      });

      setKegiatan(mergedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKegiatan();
  }, []);

  // --- LOGIKA FILTER & SEARCH ---
  const filteredKegiatan = useMemo(() => {
    return kegiatan.filter(item => {
      const term = searchTerm.toLowerCase();
      const namaKegiatan = item.nama_kegiatan || '';
      
      const matchParent = namaKegiatan.toLowerCase().includes(term);
      const matchChild = item.sub_list && item.sub_list.some(sub => 
        sub.nama_sub_kegiatan && sub.nama_sub_kegiatan.toLowerCase().includes(term)
      );
      const isMatchSearch = matchParent || matchChild;
      
      const years = item.active_years || [];
      const matchYear = filterYear ? years.includes(filterYear) : true;

      return isMatchSearch && matchYear;
    });
  }, [kegiatan, searchTerm, filterYear]);

  const availableYears = useMemo(() => {
    const years = new Set();
    if (Array.isArray(kegiatan)) {
      kegiatan.forEach(item => {
          const yrs = item.active_years || [];
          if (Array.isArray(yrs)) {
            yrs.forEach(y => years.add(y));
          }
      });
    }
    return [...years].sort((a, b) => b - a);
  }, [kegiatan]);

  // --- HANDLERS KEGIATAN (INDUK) ---

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    const result = await Swal.fire({
      title: 'Hapus Survei/Sensus?',
      text: "Seluruh data terkait (Kegiatan, Penugasan) akan terhapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/kegiatan/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Update state lokal atau refresh data
        setKegiatan(prev => prev.filter(item => item.id !== id));
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
      } catch (err) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  const handleRowClick = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null); 
    } else {
      setExpandedRow(id);
    }
  };

  // --- HANDLERS SUB KEGIATAN (ANAK) ---

  // 1. DELETE SUB KEGIATAN
  const handleDeleteSub = async (e, subId) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Hapus Kegiatan?',
      text: "Data penugasan & honorarium di dalamnya juga akan terhapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/subkegiatan/${subId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Terhapus', 'Kegiatan berhasil dihapus.', 'success');
            // Refresh seluruh data untuk memperbarui tampilan
            fetchKegiatan();
        } catch (err) {
            Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error');
        }
    }
  };

  // 2. BUKA MODAL EDIT
  const handleEditSubClick = (e, sub) => {
    e.stopPropagation();
    // Format tanggal untuk input type="date"
    setEditingSub({
        ...sub,
        tanggal_mulai: sub.tanggal_mulai ? sub.tanggal_mulai.split('T')[0] : '',
        tanggal_selesai: sub.tanggal_selesai ? sub.tanggal_selesai.split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  // 3. SIMPAN EDIT SUB
  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!editingSub.nama_sub_kegiatan || !editingSub.tanggal_mulai) {
        return Swal.fire('Validasi', 'Nama dan Tanggal Mulai wajib diisi.', 'warning');
    }

    setSavingSub(true);
    try {
        const token = localStorage.getItem('token');
        const payload = {
            nama_sub_kegiatan: editingSub.nama_sub_kegiatan,
            deskripsi: editingSub.deskripsi,
            tanggal_mulai: editingSub.tanggal_mulai,
            tanggal_selesai: editingSub.tanggal_selesai
        };

        await axios.put(`${API_URL}/api/subkegiatan/${editingSub.id}/info`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        Swal.fire('Berhasil', 'Data Kegiatan diperbarui.', 'success');
        setIsModalOpen(false);
        // Refresh seluruh data
        fetchKegiatan();

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan.', 'error');
    } finally {
        setSavingSub(false);
    }
  };

  // --- HANDLERS IMPORT/EXPORT ---
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,nama_kegiatan,nama_sub_kegiatan,deskripsi,tanggal_mulai,tanggal_selesai\nSensus Penduduk 2030,Persiapan,Rapat,2030-01-01,2030-01-31";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_kegiatan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => { fileInputRef.current.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/subkegiatan/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      });
      const { successCount, failCount } = response.data;
      Swal.fire('Import Selesai', `Sukses: ${successCount}, Gagal: ${failCount}`, 'info');
      setExpandedRow(null);
      fetchKegiatan(); 
    } catch (err) {
      Swal.fire('Error', 'Gagal import data.', 'error');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  // --- HELPER ---
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const start = new Date(startDate).toLocaleDateString('id-ID', options);
    const end = new Date(endDate).toLocaleDateString('id-ID', options);
    return `${start} - ${end}`;
  };

  const getComputedStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return { label: '?', className: 'bg-gray-100' };
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start) return { label: 'Akan Datang', className: 'bg-blue-100 text-blue-700' };
    if (now > end) return { label: 'Selesai', className: 'bg-green-100 text-green-700' };
    return { label: 'Sedang Proses', className: 'bg-yellow-100 text-yellow-700' };
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat data...</div>;
  if (error) return <div className="text-center py-10 text-red-600">Error: {error}</div>;

  return (
    <div className="w-full relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">Kelola daftar Survei/Sensus.</div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm"><FaDownload /> Template</button>
          <button onClick={handleImportClick} disabled={uploading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50"><FaFileUpload /> {uploading ? '...' : 'Import'}</button>
          <Link to="/admin/manage-kegiatan/tambah" className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm"><FaPlus /> Tambah Baru</Link>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-1/2">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Survei/Sensus, Kegiatan, atau pengawas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm transition bg-gray-50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-bold"><FaFilter /> Tahun:</div>
            <select
               className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm bg-white cursor-pointer"
               value={filterYear}
               onChange={(e) => setFilterYear(e.target.value)}
            >
               <option value="">Semua</option>
               {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
         </div>
      </div>

      {/* LIST KEGIATAN */}
      <div className="space-y-4">
        {kegiatan.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Belum ada data Survei/Sensus.</p>
          </div>
        ) : filteredKegiatan.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Tidak ditemukan Survei/Sensus yang cocok.</p>
            <button onClick={() => {setSearchTerm(''); setFilterYear('')}} className="mt-2 text-[#1A2A80] text-sm underline hover:text-blue-800">Reset Filter</button>
          </div>
        ) : (
          filteredKegiatan.map((item) => {
            const isExpanded = expandedRow === item.id;
            
            return (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100 hover:border-blue-200'}`}>
                {/* Header Row Kegiatan */}
                <div onClick={() => handleRowClick(item.id)} className={`px-6 py-4 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${isExpanded ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full transition-transform duration-200 ${isExpanded ? 'bg-blue-100 text-[#1A2A80]' : 'text-gray-400 bg-gray-100'}`}>
                       {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </div>
                    <div>
                      <h3 className={`text-base font-bold transition-colors ${isExpanded ? 'text-[#1A2A80]' : 'text-gray-800'}`}>{item.nama_kegiatan}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-md">{item.deskripsi || 'Tidak ada deskripsi.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-12 md:pl-0">
                    {/* Edit Kegiatan Induk */}
                    <Link to={`/admin/manage-kegiatan/edit/${item.id}`} onClick={(e) => e.stopPropagation()} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit Survei/Sensus & Atur Honor"><FaEdit /></Link>
                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Hapus Survei/Sensus"><FaTrash /></button>
                  </div>
                </div>

                {/* Sub Kegiatan List (Accordion Content) */}
                {isExpanded && (
                  <div className="bg-gray-50/50 border-t border-gray-100 animate-fade-in-down">
                    {item.sub_list && item.sub_list.length > 0 ? (
                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-left text-sm bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 w-1/3">Nama Kegiatan</th>
                              <th className="px-4 py-3">Jadwal Pelaksanaan</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {item.sub_list.map((sub) => {
                              const statusObj = getComputedStatus(sub.tanggal_mulai, sub.tanggal_selesai);
                              return (
                                <tr key={sub.id} className="hover:bg-blue-50 transition-colors group">
                                  <td className="px-4 py-3 font-medium text-gray-800" onClick={() => navigate(`/admin/manage-kegiatan/detail/${sub.id}`)} style={{cursor: 'pointer'}}>
                                    {sub.nama_sub_kegiatan}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-gray-400"/> 
                                        {formatDateRange(sub.tanggal_mulai, sub.tanggal_selesai)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide shadow-sm ${statusObj.className}`}>{statusObj.label}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Detail Button */}
                                        <button 
                                            onClick={() => navigate(`/admin/manage-kegiatan/detail/${sub.id}`)} 
                                            className="text-gray-400 hover:text-[#1A2A80] p-1.5 rounded hover:bg-blue-50 transition"
                                            title="Lihat Detail"
                                        >
                                            <FaInfoCircle />
                                        </button>
                                        {/* Edit Button - Membuka Modal */}
                                        <button 
                                            onClick={(e) => handleEditSubClick(e, sub)} 
                                            className="text-gray-400 hover:text-green-600 p-1.5 rounded hover:bg-green-50 transition"
                                            title="Edit Info Kegiatan"
                                        >
                                            <FaEdit />
                                        </button>
                                        {/* Delete Button - Hapus Langsung */}
                                        <button 
                                            onClick={(e) => handleDeleteSub(e, sub.id)} 
                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition"
                                            title="Hapus Kegiatan"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-gray-500 italic mb-3">Tidak ada Kegiatan.</p>
                        <Link to={`/admin/manage-kegiatan/edit/${item.id}`} className="inline-flex items-center gap-2 text-[#1A2A80] text-xs font-bold hover:underline bg-blue-50 px-3 py-2 rounded-lg border border-blue-100"><FaPlus size={10} /> Kelola Kegiatan</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL EDIT SUB KEGIATAN --- */}
      {isModalOpen && editingSub && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <FaEdit className="text-[#1A2A80]" /> Edit Kegiatan
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Kegiatan</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                            value={editingSub.nama_sub_kegiatan}
                            onChange={(e) => setEditingSub({...editingSub, nama_sub_kegiatan: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                        <textarea 
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm resize-none"
                            value={editingSub.deskripsi}
                            onChange={(e) => setEditingSub({...editingSub, deskripsi: e.target.value})}
                        ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Mulai</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                                value={editingSub.tanggal_mulai}
                                onChange={(e) => setEditingSub({...editingSub, tanggal_mulai: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Selesai</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                                value={editingSub.tanggal_selesai}
                                onChange={(e) => setEditingSub({...editingSub, tanggal_selesai: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-white transition text-sm">Batal</button>
                    <button onClick={handleSaveSub} disabled={savingSub} className="px-6 py-2 rounded-lg bg-[#1A2A80] text-white font-bold hover:bg-blue-900 transition text-sm shadow-md flex items-center gap-2">
                        {savingSub ? 'Menyimpan...' : <><FaSave /> Simpan</>}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ManageKegiatan;