import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaChevronDown, 
  FaChevronRight,
  FaChevronLeft, 
  FaFilter, 
  FaCalendarAlt,
  FaUserTie,
  FaMoneyBillWave,
  FaInfoCircle,
  FaSave,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';
const getToken = () => localStorage.getItem('token');

// Helper Formatter Rupiah
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
};

const RekapPerencanaan = () => {
  // --- STATE ---
  const [year, setYear] = useState(new Date().getFullYear());
  const [limit, setLimit] = useState(0); 

  // Data Levels
  const [dataBulan, setDataBulan] = useState([]);
  const [dataMitraCache, setDataMitraCache] = useState({});
  const [dataDetailCache, setDataDetailCache] = useState({});

  // Expand States
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedMitra, setExpandedMitra] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);

  // Pagination State untuk Mitra
  const [mitraPage, setMitraPage] = useState(1);
  const itemsPerPage = 10;

  // --- FETCH LEVEL 1 (BULAN) ---
  const fetchBulan = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/api/rekap/bulanan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { year } 
      });
      
      setDataBulan(res.data.data);
      if (res.data.applied_limit) {
          setLimit(res.data.applied_limit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBulan();
    setExpandedMonth(null);
    setExpandedMitra(null);
    setDataMitraCache({});
    setDataDetailCache({});
  }, [year]); 

  // --- FETCH LEVEL 2 (MITRA) ---
  const fetchMitra = async (monthNum) => {
    try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/api/rekap/mitra`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { year, month: monthNum }
        });
        setDataMitraCache(prev => ({ ...prev, [monthNum]: res.data.data }));
    } catch (err) {
        console.error(err);
    }
  };

  const handleExpandMonth = async (monthNum) => {
    if (expandedMonth === monthNum) {
      setExpandedMonth(null);
      return;
    }
    setExpandedMonth(monthNum);
    setMitraPage(1); // Reset pagination ke halaman 1 saat ganti bulan
    await fetchMitra(monthNum); 
  };

  // --- FETCH LEVEL 3 (DETAIL) ---
  const fetchDetail = async (monthNum, mitraId) => {
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/api/rekap/detail`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { year, month: monthNum, mitra_id: mitraId }
        });
        const key = `${monthNum}-${mitraId}`;
        setDataDetailCache(prev => ({ ...prev, [key]: res.data.data }));
      } catch (err) {
        console.error(err);
      }
  };

  const handleExpandMitra = async (e, monthNum, mitraId) => {
    e.stopPropagation(); // Mencegah event bubbling ke parent row
    const key = `${monthNum}-${mitraId}`;
    if (expandedMitra === key) {
      setExpandedMitra(null);
      return;
    }
    setExpandedMitra(key);
    await fetchDetail(monthNum, mitraId);
  };

  // --- ACTION HANDLERS ---
  const handleVolumeChange = (monthNum, mitraId, index, newVal) => {
    const key = `${monthNum}-${mitraId}`;
    const currentData = [...(dataDetailCache[key] || [])];
    
    currentData[index].volume_tugas = newVal;
    currentData[index].total_item = newVal * currentData[index].tarif;
    
    setDataDetailCache(prev => ({ ...prev, [key]: currentData }));
  };

  const handleSaveDetail = async (monthNum, mitraId, item) => {
    if (item.volume_tugas < 1) {
        Swal.fire('Error', 'Jumlah tugas minimal 1.', 'warning');
        return;
    }

    try {
        const token = getToken();
        await axios.put(`${API_URL}/api/kelompok-perencanaan/${item.id_kelompok}`, {
            kode_jabatan: item.kode_jabatan, 
            volume_tugas: item.volume_tugas
        }, { headers: { Authorization: `Bearer ${token}` } });

        Swal.fire({
            icon: 'success',
            title: 'Tersimpan',
            text: 'Volume tugas berhasil diperbarui.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });

        await fetchMitra(monthNum); 
        fetchBulan(); 

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan.', 'error');
    }
  };

  const handleDeleteDetail = async (monthNum, mitraId, idKelompok) => {
      const result = await Swal.fire({
          title: 'Hapus Tugas?',
          text: "Data ini akan dihapus permanen dari perencanaan.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
          try {
              const token = getToken();
              await axios.delete(`${API_URL}/api/kelompok-perencanaan/${idKelompok}`, {
                  headers: { Authorization: `Bearer ${token}` }
              });

              Swal.fire({
                icon: 'success',
                title: 'Terhapus',
                text: 'Tugas berhasil dihapus.',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
              });

              await fetchDetail(monthNum, mitraId); 
              await fetchMitra(monthNum); 
              fetchBulan(); 

          } catch (err) {
              Swal.fire('Error', 'Gagal menghapus data.', 'error');
          }
      }
  };

  // --- RENDERERS ---

  // LEVEL 3: TABEL RINCIAN KEGIATAN
  const renderDetailTable = (monthNum, mitraId) => {
    const key = `${monthNum}-${mitraId}`;
    const data = dataDetailCache[key];

    if (!data) return <div className="p-4 text-center text-gray-400 text-xs italic animate-pulse">Memuat rincian kegiatan...</div>;
    if (data.length === 0) return <div className="p-4 text-center text-gray-400 text-xs italic">Tidak ada rincian tugas.</div>;

    return (
      <div className="bg-gray-50 border-t border-gray-100 p-2 md:p-4 rounded-b-xl animate-fade-in-down">
        <div className="flex items-center gap-2 mb-3 px-1">
            <span className="h-4 w-1 bg-[#1A2A80] rounded-full"></span>
            <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Rincian Penugasan & Edit</h5>
        </div>
        
        {/* RESPONSIVE TABLE CONTAINER */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200 bg-white">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Kegiatan</th>
                <th className="px-4 py-3 whitespace-nowrap">Sub Kegiatan</th>
                <th className="px-4 py-3 whitespace-nowrap">Jabatan</th>
                <th className="px-4 py-3 w-28 text-center whitespace-nowrap">Jml Tugas</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Harga Satuan</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                <th className="px-4 py-3 text-center w-28 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => (
                <tr key={item.id_kelompok || idx} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700">{item.nama_kegiatan}</td>
                  <td className="px-4 py-3 text-gray-600">{item.nama_sub_kegiatan}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                        {item.nama_jabatan}
                    </span>
                  </td>
                  
                  {/* EDITABLE VOLUME */}
                  <td className="px-4 py-3 text-center">
                    <input 
                        type="number"
                        min="1"
                        className="w-16 p-1.5 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                        value={item.volume_tugas}
                        onChange={(e) => handleVolumeChange(monthNum, mitraId, idx, parseInt(e.target.value) || 0)}
                    />
                  </td>
                  
                  <td className="px-4 py-3 text-right text-gray-500">{formatRupiah(item.tarif)}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#1A2A80]">{formatRupiah(item.total_item)}</td>
                  
                  {/* ACTIONS */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                            onClick={() => handleSaveDetail(monthNum, mitraId, item)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Simpan Perubahan"
                        >
                            <FaSave />
                        </button>
                        <button 
                            onClick={() => handleDeleteDetail(monthNum, mitraId, item.id_kelompok)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Hapus Tugas"
                        >
                            <FaTrash />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // LEVEL 2: TABEL MITRA (WITH PAGINATION)
  const renderMitraTable = (monthNum) => {
    const data = dataMitraCache[monthNum];

    if (!data) return <div className="p-6 text-center text-gray-400 text-sm animate-pulse">Memuat data mitra...</div>;
    if (data.length === 0) return <div className="p-6 text-center text-gray-400 text-sm italic border-t">Tidak ada mitra bertugas di bulan ini.</div>;

    // --- LOGIKA PAGINATION ---
    const indexOfLastItem = mitraPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = data.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(data.length / itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setMitraPage(newPage);
        }
    };

    return (
      <div className="bg-blue-50/30 p-3 md:p-5 border-t border-b border-gray-100 shadow-inner">
         <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-[#1A2A80] uppercase flex items-center gap-2">
                <FaUserTie className="text-lg" /> Daftar Mitra ({data.length})
            </h4>
            <span className="text-xs text-gray-500 hidden sm:block">Klik baris untuk melihat detail</span>
         </div>

         {/* RESPONSIVE TABLE CONTAINER */}
         <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-[#1A2A80] text-white font-semibold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">#</th>
                  <th className="px-5 py-3">Nama Mitra</th>
                  <th className="px-5 py-3">NIK</th>
                  <th className="px-5 py-3 text-right">Total Honor</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentData.map((m, idx) => {
                   const isExpanded = expandedMitra === `${monthNum}-${m.id_mitra}`;
                   // Nomor urut continue sesuai page
                   const globalIdx = indexOfFirstItem + idx + 1; 
                   
                   return (
                     <React.Fragment key={m.id_mitra}>
                       <tr 
                          onClick={(e) => handleExpandMitra(e, monthNum, m.id_mitra)}
                          className={`cursor-pointer transition-all duration-200 border-l-4 ${isExpanded ? 'bg-blue-50 border-l-[#1A2A80]' : 'hover:bg-gray-50 border-l-transparent'}`}
                       >
                         <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{globalIdx}</td>
                         <td className="px-5 py-3 font-bold text-gray-700">{m.nama_lengkap}</td>
                         <td className="px-5 py-3 text-gray-500 font-mono text-xs">{m.nik}</td>
                         <td className="px-5 py-3 text-right font-bold text-gray-800">{formatRupiah(m.total_honor)}</td>
                         <td className="px-5 py-3 text-center">
                           <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${m.status === 'Aman' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                             {m.status === 'Aman' ? <FaCheckCircle size={10} /> : <FaExclamationTriangle size={10} />}
                             {m.status}
                           </span>
                         </td>
                         <td className="px-5 py-3 text-center text-gray-400">
                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#1A2A80]' : ''}`}>
                                <FaChevronDown />
                            </div>
                         </td>
                       </tr>
                       {/* Nested Detail Row */}
                       {isExpanded && (
                         <tr>
                           <td colSpan="6" className="p-0 border-b border-gray-200">
                             {renderDetailTable(monthNum, m.id_mitra)}
                           </td>
                         </tr>
                       )}
                     </React.Fragment>
                   );
                })}
              </tbody>
            </table>
         </div>

         {/* --- PAGINATION FOOTER --- */}
         {data.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
                <div className="text-xs text-gray-500">
                    Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, data.length)} dari <strong>{data.length}</strong> mitra
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(mitraPage - 1)}
                        disabled={mitraPage === 1}
                        className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                    >
                        <FaChevronLeft size={12} />
                    </button>
                    <span className="text-xs font-bold text-gray-700 px-2">
                        Hal {mitraPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(mitraPage + 1)}
                        disabled={mitraPage === totalPages}
                        className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                    >
                        <FaChevronRight size={12} />
                    </button>
                </div>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/50 pb-20">
      
      {/* --- HEADER & FILTER SECTION --- */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden">
         {/* Decoration */}
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

         <div className="relative z-10">
            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
                <span className="p-2 bg-[#1A2A80] text-white rounded-lg shadow-md"><FaMoneyBillWave /></span> 
                Rekap Perencanaan
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-1">Monitoring beban kerja, honor mitra, dan status limit bulanan.</p>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto relative z-10">
            {/* Input Limit (Read Only) */}
            <div className="w-full sm:w-auto">
               <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                 Batas Aman (Database) <FaInfoCircle className="text-blue-400 cursor-help" title="Diatur di menu Batas Honor" />
               </label>
               <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">Rp</div>
                   <input 
                     type="text" 
                     className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-gray-100 text-gray-600 cursor-not-allowed font-mono font-bold shadow-inner"
                     value={limit.toLocaleString('id-ID')} 
                     disabled
                   />
               </div>
            </div>

            {/* Filter Tahun */}
            <div className="w-full sm:w-auto">
               <label className="text-xs font-bold text-gray-500 mb-1.5 block">Tahun Anggaran</label>
               <div className="flex gap-2">
                   <select 
                     className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none shadow-sm cursor-pointer transition-all hover:border-gray-400"
                     value={year}
                     onChange={(e) => setYear(e.target.value)}
                   >
                     {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                   <button 
                        onClick={fetchBulan} 
                        className="bg-[#1A2A80] hover:bg-blue-900 text-white px-4 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center" 
                        title="Refresh Data"
                   >
                       <FaFilter />
                   </button>
               </div>
            </div>
         </div>
      </div>

      {/* --- MAIN CONTENT (LEVEL 1: BULAN) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Table 1 */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <FaCalendarAlt /> Ringkasan Bulanan
            </h2>
        </div>

        {/* RESPONSIVE TABLE CONTAINER LEVEL 1 */}
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
                <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Bulan</th>
                        <th className="px-6 py-4 text-center">Jml Mitra</th>
                        <th className="px-6 py-4 text-right">Total Realisasi</th>
                        <th className="px-6 py-4 text-center">Status Global</th>
                        <th className="px-6 py-4 w-10 text-center">Detail</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                        <tr><td colSpan="5" className="text-center py-10 text-gray-400 animate-pulse">Sedang memuat data...</td></tr>
                    ) : dataBulan.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center py-12">
                                <div className="flex flex-col items-center justify-center text-gray-300">
                                    <FaCalendarAlt size={40} className="mb-3 opacity-50" />
                                    <p className="text-sm italic">Tidak ada data perencanaan di tahun {year}.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        dataBulan.map((bulan) => {
                            const isExpanded = expandedMonth === bulan.bulan_angka;
                            return (
                                <React.Fragment key={bulan.bulan_angka}>
                                    <tr 
                                        onClick={() => handleExpandMonth(bulan.bulan_angka)}
                                        className={`cursor-pointer transition-colors duration-200 group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-[#1A2A80]' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                    <FaCalendarAlt />
                                                </div>
                                                <span className="font-bold text-gray-700 text-sm">{bulan.bulan_nama}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                                                {bulan.mitra_count} Orang
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-gray-800 tracking-tight">
                                                {formatRupiah(bulan.total_honor)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${bulan.status === 'Aman' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                {bulan.status === 'Aman' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                                {bulan.status === 'Aman' ? 'Aman' : 'Over Limit'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-400">
                                            <FaChevronRight className={`transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#1A2A80]' : ''}`} />
                                        </td>
                                    </tr>
                                    
                                    {/* EXPANDED CONTENT (LEVEL 2) */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="5" className="p-0 border-b-2 border-blue-100 bg-gray-50">
                                                {renderMitraTable(bulan.bulan_angka)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default RekapPerencanaan;