// src/pages/ManajemenKegiatan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaChevronDown, 
  FaInfoCircle,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaLayerGroup,
  FaClipboardList,
  FaChartLine
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const ManajemenKegiatan = () => {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State untuk Expand/Collapse
  const [expandedRow, setExpandedRow] = useState(null); 
  
  // State untuk Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  // 1. TAMBAHAN: State untuk Filter Status
  const [filterStatus, setFilterStatus] = useState(''); 

  const navigate = useNavigate();

  // --- HELPER EKSTRAKSI DATA ---
  const getList = (response) => {
    if (response?.data) {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data.data)) return response.data.data;
    }
    return [];
  };

  // --- HELPER STATUS (Dipakai juga di Filter) ---
  const getComputedStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return { label: 'Jadwal Belum Lengkap', className: 'bg-gray-100 text-gray-500' };
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start) return { label: 'Akan Datang', className: 'bg-blue-50 text-blue-700 border border-blue-100' };
    if (now > end) return { label: 'Selesai', className: 'bg-gray-100 text-gray-600 border border-gray-200' };
    return { label: 'Sedang Proses', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse' };
  };

  // 1. FETCH DATA
  const fetchKegiatan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [resKeg, resSub] = await Promise.all([
        axios.get(`${API_URL}/api/kegiatan`, config).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/subkegiatan`, config).catch(() => ({ data: [] }))
      ]);

      const allKegiatan = getList(resKeg);
      const allSubs = getList(resSub);
      
      // Mapping Data Induk ke Anak
      const mergedData = allKegiatan.map(k => {
         const mySubs = allSubs.filter(sub => sub.id_kegiatan === k.id);
         
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

      mergedData.sort((a, b) => b.id - a.id);
      setKegiatan(mergedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat daftar kegiatan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKegiatan();
  }, []);

  // --- LOGIKA FILTER & SEARCH ---
  const filteredKegiatan = useMemo(() => {
    return kegiatan
      .map(item => {
        let filteredSubs = [...(item.sub_list || [])];

        // Filter by Year
        if (filterYear) {
          filteredSubs = filteredSubs.filter(sub => {
             if (!sub.tanggal_mulai) return false;
             return new Date(sub.tanggal_mulai).getFullYear().toString() === filterYear;
          });
        }

        // 2. TAMBAHAN: Filter by Status
        if (filterStatus) {
            filteredSubs = filteredSubs.filter(sub => {
                const statusObj = getComputedStatus(sub.tanggal_mulai, sub.tanggal_selesai);
                return statusObj.label === filterStatus;
            });
        }

        // Filter by Search Term
        if (searchTerm) {
           const term = searchTerm.toLowerCase();
           const parentMatches = item.nama_kegiatan && item.nama_kegiatan.toLowerCase().includes(term);
           
           if (!parentMatches) {
              filteredSubs = filteredSubs.filter(sub => 
                 sub.nama_sub_kegiatan && sub.nama_sub_kegiatan.toLowerCase().includes(term)
              );
           }
        }

        return { ...item, sub_list: filteredSubs };
      })
      .filter(item => {
         const term = searchTerm.toLowerCase();
         const parentMatches = item.nama_kegiatan && item.nama_kegiatan.toLowerCase().includes(term);
         const hasSubs = item.sub_list && item.sub_list.length > 0;

         // Jika sedang filter status atau tahun, hanya tampilkan jika punya sub (anak) yang cocok
         if (filterStatus || filterYear) {
             return hasSubs;
         }

         if (searchTerm) {
            return parentMatches || hasSubs;
         }

         return true;
      });
  }, [kegiatan, searchTerm, filterYear, filterStatus]); // Tambahkan filterStatus ke dependency

  // List Tahun untuk Dropdown
  const availableYears = useMemo(() => {
    const years = new Set();
    kegiatan.forEach(item => {
        const yrs = item.active_years || [];
        yrs.forEach(y => years.add(y));
    });
    return [...years].sort((a, b) => b - a);
  }, [kegiatan]);

  // --- HANDLERS ---
  const handleRowClick = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null); 
    } else {
      setExpandedRow(id); 
    }
  };

  // --- HELPER UI ---
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const start = new Date(startDate).toLocaleDateString('id-ID', options);
    const end = new Date(endDate).toLocaleDateString('id-ID', options);
    return `${start} - ${end}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat data survei...</p>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center py-8 px-6 bg-red-50 rounded-xl border border-red-100">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={fetchKegiatan} className="mt-4 text-sm text-red-700 underline hover:text-red-800">Coba Lagi</button>
        </div>
    </div>
  );

  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. HEADER SECTION & FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                        <FaLayerGroup size={24} />
                    </div>
                    Daftar Survei & Sensus
                </h1>
                <p className="text-gray-500 mt-2 ml-1">
                    Cari dan lihat detail jadwal kegiatan statistik BPS.
                </p>
            </div>
            
            <div className="hidden md:flex gap-4">
                <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <span className="block text-xl font-bold text-[#1A2A80]">{kegiatan.length}</span>
                    <span className="text-xs text-gray-500 uppercase font-bold">Survei</span>
                </div>
            </div>
        </div>

        {/* Separator */}
        <hr className="border-gray-100 mb-6" />

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-grow">
                <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
                <input
                type="text"
                placeholder="Cari nama survei, sensus, atau sub-kegiatan..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition-all text-sm text-gray-800 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {/* Filter Tahun */}
            <div className="relative min-w-[150px]">
                <FaCalendarAlt className="absolute left-4 top-3.5 text-gray-400" />
                <select
                    className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition-all text-sm text-gray-800 cursor-pointer appearance-none"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                >
                    <option value="">Semua Tahun</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
            </div>

            {/* 3. TAMBAHAN: Filter Status */}
            <div className="relative min-w-[180px]">
                <FaFilter className="absolute left-4 top-3.5 text-gray-400" />
                <select
                    className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition-all text-sm text-gray-800 cursor-pointer appearance-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">Semua Status</option>
                    <option value="Sedang Proses">Sedang Proses</option>
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Selesai">Selesai</option>
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
            </div>
        </div>
      </div>

      {/* 2. LIST CONTENT */}
      <div className="space-y-4">
        {kegiatan.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaClipboardList className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Belum ada data Survei/Sensus tersedia.</p>
          </div>
        ) : filteredKegiatan.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaSearch className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Tidak ditemukan hasil untuk pencarian Anda.</p>
            <button 
                onClick={() => {setSearchTerm(''); setFilterYear(''); setFilterStatus('');}} 
                className="mt-3 text-[#1A2A80] text-sm font-bold hover:underline"
            >
                Reset Filter
            </button>
          </div>
        ) : (
          filteredKegiatan.map((item) => {
            const isExpanded = expandedRow === item.id;
            
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-200 ring-1 ring-blue-50 shadow-md' : 'border-gray-100 hover:border-blue-100 hover:shadow'}`}
              >
                
                {/* Header Row (Induk) */}
                <div 
                    onClick={() => handleRowClick(item.id)} 
                    className={`px-6 py-5 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none ${isExpanded ? 'bg-blue-50/20' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon Indikator */}
                    <div className={`mt-1 p-2 rounded-lg transition-colors duration-200 ${isExpanded ? 'bg-[#1A2A80] text-white' : 'bg-gray-100 text-gray-400'}`}>
                         <FaChartLine size={16} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-bold transition-colors ${isExpanded ? 'text-[#1A2A80]' : 'text-gray-800'}`}>
                            {item.nama_kegiatan}
                          </h3>
                          {/* Tahun Badge */}
                          {item.active_years && item.active_years.length > 0 && (
                             <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium border border-gray-200">
                                {item.active_years.join(', ')}
                             </span>
                          )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 md:line-clamp-1">
                        {item.deskripsi || 'Kegiatan statistik rutin Badan Pusat Statistik.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="flex items-center gap-4 self-end md:self-auto w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0 pl-14 md:pl-0">
                     <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${isExpanded ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                        {item.sub_list ? item.sub_list.length : 0} Sub-Kegiatan
                     </span>
                     <div className={`text-gray-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#1A2A80]' : ''}`}>
                        <FaChevronDown />
                     </div>
                  </div>
                </div>

                {/* Sub Kegiatan List (Accordion Content) */}
                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-gray-50 border-t border-gray-100 p-4 md:p-6">
                    {item.sub_list && item.sub_list.length > 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-200">
                                <tr>
                                <th className="px-5 py-3 font-semibold w-1/3">Nama Sub-Kegiatan</th>
                                <th className="px-5 py-3 font-semibold">Jadwal Pelaksanaan</th>
                                <th className="px-5 py-3 font-semibold text-center">Status</th>
                                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {item.sub_list.map((sub) => {
                                const statusObj = getComputedStatus(sub.tanggal_mulai, sub.tanggal_selesai);
                                return (
                                    <tr 
                                    key={sub.id} 
                                    className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                                    onClick={() => navigate(`/kegiatan/${sub.id}`)}
                                    >
                                    <td className="px-5 py-4 font-medium text-gray-800">
                                        <div className="flex items-start gap-3">
                                            <FaClipboardList className="mt-0.5 text-gray-300 group-hover:text-[#1A2A80] transition-colors" />
                                            <span className="group-hover:text-[#1A2A80] transition-colors">{sub.nama_sub_kegiatan}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">
                                        <div className="flex items-center gap-2 bg-gray-50 w-fit px-2 py-1 rounded border border-gray-200">
                                            <FaCalendarAlt className="text-gray-400"/> 
                                            {formatDateRange(sub.tanggal_mulai, sub.tanggal_selesai)}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusObj.className}`}>
                                            {statusObj.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button 
                                            className="inline-flex items-center gap-1.5 text-white bg-[#1A2A80] hover:bg-blue-800 px-4 py-1.5 rounded-lg transition text-xs font-bold shadow-sm hover:shadow"
                                        >
                                            <FaInfoCircle /> Detail
                                        </button>
                                    </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                            </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 border-dashed">
                        <p className="text-gray-400 italic text-sm">
                            {filterYear || filterStatus ? `Tidak ada jadwal kegiatan yang cocok dengan filter.` : 'Belum ada sub-kegiatan yang ditambahkan.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default ManajemenKegiatan;