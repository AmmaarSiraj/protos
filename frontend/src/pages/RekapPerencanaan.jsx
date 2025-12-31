// src/pages/RekapPerencanaan.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaChevronDown, 
  FaChevronRight, 
  FaFilter, 
  FaCalendarAlt,
  FaUserTie,
  FaMoneyBillWave,
  FaInfoCircle,
  FaSave,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaChartLine
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';
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
      <div className="bg-gray-50 border-t border-gray-100 p-2 md:p-6 rounded-b-xl animate-fade-in-down">
        <div className="flex items-center gap-2 mb-4 px-1">
            <span className="h-5 w-1.5 bg-[#1A2A80] rounded-full"></span>
            <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Rincian Penugasan & Edit</h5>
        </div>
        
        {/* RESPONSIVE TABLE CONTAINER */}
        <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 bg-white">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">Kegiatan</th>
                <th className="px-5 py-4 whitespace-nowrap">Sub Kegiatan</th>
                <th className="px-5 py-4 whitespace-nowrap">Jabatan</th>
                <th className="px-5 py-4 w-28 text-center whitespace-nowrap">Jml Tugas</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Harga Satuan</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Total</th>
                <th className="px-5 py-4 text-center w-28 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => (
                <tr key={item.id_kelompok || idx} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700">{item.nama_kegiatan}</td>
                  <td className="px-5 py-4 text-gray-600">{item.nama_sub_kegiatan}</td>
                  <td className="px-5 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-bold text-[10px] uppercase">
                        {item.nama_jabatan}
                    </span>
                  </td>
                  
                  {/* EDITABLE VOLUME */}
                  <td className="px-5 py-4 text-center">
                    <input 
                        type="number"
                        min="1"
                        className="w-16 p-1.5 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-[#1A2A80] outline-none transition-all font-bold text-gray-700 bg-gray-50 focus:bg-white"
                        value={item.volume_tugas}
                        onChange={(e) => handleVolumeChange(monthNum, mitraId, idx, parseInt(e.target.value) || 0)}
                    />
                  </td>
                  
                  <td className="px-5 py-4 text-right text-gray-500 font-mono">{formatRupiah(item.tarif)}</td>
                  <td className="px-5 py-4 text-right font-bold text-[#1A2A80] font-mono">{formatRupiah(item.total_item)}</td>
                  
                  {/* ACTIONS */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                            onClick={() => handleSaveDetail(monthNum, mitraId, item)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Simpan Perubahan"
                        >
                            <FaSave />
                        </button>
                        <button 
                            onClick={() => handleDeleteDetail(monthNum, mitraId, item.id_kelompok)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
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

  // LEVEL 2: TABEL MITRA
  const renderMitraTable = (monthNum) => {
    const data = dataMitraCache[monthNum];

    if (!data) return <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Memuat data mitra...</div>;
    if (data.length === 0) return <div className="p-8 text-center text-gray-400 text-sm italic border-t bg-white">Tidak ada mitra bertugas di bulan ini.</div>;

    return (
      <div className="bg-blue-50/40 p-3 md:p-6 border-t border-b border-gray-200 shadow-inner">
         <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="text-sm font-bold text-[#1A2A80] uppercase flex items-center gap-2 tracking-wide">
                <FaUserTie className="text-lg" /> Daftar Mitra ({data.length})
            </h4>
            <span className="text-xs text-gray-500 hidden sm:block italic bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                Klik baris untuk melihat detail & edit
            </span>
         </div>

         {/* RESPONSIVE TABLE CONTAINER */}
         <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-[#1A2A80] text-white font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 w-16 text-center">#</th>
                  <th className="px-6 py-3.5">Nama Mitra</th>
                  <th className="px-6 py-3.5">NIK</th>
                  <th className="px-6 py-3.5 text-right">Total Honor</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((m, idx) => {
                   const isExpanded = expandedMitra === `${monthNum}-${m.id_mitra}`;
                   return (
                     <React.Fragment key={m.id_mitra}>
                       <tr 
                          onClick={(e) => handleExpandMitra(e, monthNum, m.id_mitra)}
                          className={`cursor-pointer transition-all duration-200 border-l-4 ${isExpanded ? 'bg-blue-50 border-l-blue-600' : 'hover:bg-gray-50 border-l-transparent'}`}
                       >
                         <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                         <td className="px-6 py-4 font-bold text-gray-800">{m.nama_lengkap}</td>
                         <td className="px-6 py-4 text-gray-500 font-mono text-xs">{m.nik}</td>
                         <td className="px-6 py-4 text-right font-bold text-[#1A2A80] font-mono">{formatRupiah(m.total_honor)}</td>
                         <td className="px-6 py-4 text-center">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${m.status === 'Aman' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                             {m.status === 'Aman' ? <FaCheckCircle size={10} /> : <FaExclamationTriangle size={10} />}
                             {m.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-center text-gray-400">
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
      </div>
    );
  };

  return (
    // Container aligned with Layout
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* --- HEADER & FILTER SECTION --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
             <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                        <FaMoneyBillWave size={24} />
                    </div>
                    Rekap Perencanaan
                </h1>
                <p className="text-gray-500 mt-2 ml-1">
                    Monitoring beban kerja, honor mitra, dan status limit bulanan.
                </p>
             </div>
         </div>

         <hr className="border-gray-100 mb-6" />

         <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            
            {/* Limit Info Card */}
            <div className="w-full md:w-auto bg-blue-50/50 px-5 py-3 rounded-xl border border-blue-100 flex items-center gap-4">
                <div className="p-2.5 bg-white rounded-full text-blue-500 shadow-sm border border-blue-50">
                    <FaInfoCircle size={18} />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Batas Honor (Database)</p>
                    <p className="text-xl font-extrabold text-[#1A2A80] font-mono leading-tight">
                        {limit > 0 ? formatRupiah(limit) : <span className="text-gray-400 text-sm italic">Belum diset</span>}
                    </p>
                </div>
            </div>

            {/* Filter Tahun */}
            <div className="w-full md:w-auto relative min-w-[220px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider absolute -top-2 left-3 bg-white px-1">Tahun Anggaran</label>
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <FaCalendarAlt className="absolute left-3 top-3.5 text-gray-400" />
                        <select 
                            className="w-full pl-10 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 cursor-pointer appearance-none font-bold shadow-sm"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
                    </div>
                    <button 
                        onClick={fetchBulan} 
                        className="bg-[#1A2A80] hover:bg-blue-900 text-white px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center" 
                        title="Refresh Data"
                    >
                        <FaFilter />
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* --- MAIN CONTENT (LEVEL 1: BULAN) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Table 1 */}
        <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <FaChartLine className="text-[#1A2A80]" /> Ringkasan Bulanan
            </h2>
        </div>

        {/* RESPONSIVE TABLE CONTAINER LEVEL 1 */}
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
                <thead className="bg-white border-b border-gray-100 text-gray-400 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-5">Bulan</th>
                        <th className="px-6 py-5 text-center">Jml Mitra</th>
                        <th className="px-6 py-5 text-right">Total Realisasi</th>
                        <th className="px-6 py-5 text-center">Status Global</th>
                        <th className="px-6 py-5 w-12 text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                        <tr><td colSpan="5" className="text-center py-12 text-gray-400 animate-pulse font-medium">Sedang memuat data...</td></tr>
                    ) : dataBulan.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center py-16">
                                <div className="flex flex-col items-center justify-center text-gray-300">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                                        <FaCalendarAlt size={30} className="opacity-30" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">Tidak ada data perencanaan di tahun {year}.</p>
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
                                        className={`cursor-pointer transition-colors duration-200 group ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-[#1A2A80] text-white shadow-md' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm group-hover:text-[#1A2A80]'}`}>
                                                    <FaCalendarAlt />
                                                </div>
                                                <span className={`font-bold text-sm ${isExpanded ? 'text-[#1A2A80]' : 'text-gray-700'}`}>{bulan.bulan_nama}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="bg-white text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 shadow-sm group-hover:border-blue-200 transition-colors">
                                                {bulan.mitra_count} Orang
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="font-mono font-bold text-gray-800 tracking-tight text-sm">
                                                {formatRupiah(bulan.total_honor)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${bulan.status === 'Aman' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                {bulan.status === 'Aman' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                                {bulan.status === 'Aman' ? 'Aman' : 'Over Limit'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center text-gray-400">
                                            <FaChevronRight className={`transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#1A2A80]' : ''}`} />
                                        </td>
                                    </tr>
                                    
                                    {/* EXPANDED CONTENT (LEVEL 2) */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="5" className="p-0 border-b border-gray-100 bg-white animate-fade-in-down">
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