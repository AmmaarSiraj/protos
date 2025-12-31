// src/pages/Mitra.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FaSearch, 
  FaUserTie, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaIdCard,
  FaCalendarAlt,
  FaChevronDown,
  FaUser,
  FaAddressCard,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const Mitra = () => {
  const [mitraList, setMitraList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter
  const currentYear = new Date().getFullYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // --- State Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Opsi Tahun (Mundur 2 tahun, Maju 1 tahun)
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // --- HELPER EKSTRAKSI DATA ---
  const getList = (response) => {
    if (response?.data) {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data.data)) return response.data.data;
    }
    return [];
  };

  // Fetch Data Mitra
  useEffect(() => {
    const fetchMitra = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${API_URL}/api/mitra`, config);
        setMitraList(getList(response));
      } catch (err) {
        console.error("Gagal memuat data mitra:", err);
        setMitraList([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchMitra();
  }, []);

  // Filter Logika Gabungan
  const filteredMitra = useMemo(() => {
    if (!Array.isArray(mitraList)) return [];
    
    const result = mitraList.filter(item => {
      // 1. Cek Tahun Aktif
      const historyYears = item.riwayat_tahun ? String(item.riwayat_tahun).split(',').map(y => y.trim()) : [];
      const isActiveInYear = historyYears.includes(String(selectedYear));

      if (!isActiveInYear) return false;

      // 2. Cek Pencarian Teks
      const term = searchTerm.toLowerCase();
      const isSearchMatch = 
        (item.nama_lengkap && item.nama_lengkap.toLowerCase().includes(term)) ||
        (item.nik && item.nik.includes(term)) ||
        (item.alamat && item.alamat.toLowerCase().includes(term));

      return isSearchMatch;
    });

    // Reset ke halaman 1 setiap kali filter berubah
    setCurrentPage(1);
    return result;
  }, [mitraList, searchTerm, selectedYear]);

  // --- Logika Slice Data untuk Pagination ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredMitra.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMitra.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  // Helper Sensor NIK
  const maskNIK = (nik) => {
    if (!nik || nik.length < 8) return nik;
    return nik.substring(0, 4) + '********' + nik.substring(nik.length - 4);
  };

  // Helper Format Gender
  const formatGender = (gender) => {
    if (!gender) return '-';
    const g = String(gender).toLowerCase().trim();
    if (g === 'lk' || g === 'l') return 'Laki-laki';
    if (g === 'pr' || g === 'p') return 'Perempuan';
    return gender;
  };

  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      
      {/* HEADER & FILTER SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                    <FaAddressCard size={24} />
                  </div>
                  Direktori Mitra
               </h1>
               <p className="text-gray-500 mt-2 ml-1">
                  Daftar lengkap mitra statistik yang aktif pada tahun terpilih.
               </p>
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          <div className="flex flex-col md:flex-row gap-4">
             <div className="relative min-w-[180px]">
                <FaCalendarAlt className="absolute left-4 top-3.5 text-gray-400" />
                <select
                   className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 cursor-pointer appearance-none font-bold"
                   value={selectedYear}
                   onChange={(e) => setSelectedYear(e.target.value)}
                >
                   {yearOptions.map(year => (
                       <option key={year} value={year}>Tahun Aktif: {year}</option>
                   ))}
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
             </div>

             <div className="relative flex-grow">
                <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama mitra, NIK, atau alamat..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center gap-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase text-sm tracking-wide">
                <FaUserTie className="text-[#1A2A80]" /> Hasil Pencarian
            </h3>
            <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500 shadow-sm">
                Total: {filteredMitra.length}
            </span>
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-white text-gray-500 border-b border-gray-100 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4 w-1/3">Profil Mitra</th>
                        <th className="px-6 py-4 w-1/3">Identitas (NIK/ID)</th>
                        <th className="px-6 py-4 w-1/3">Kontak & Alamat</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        <tr>
                            <td colSpan="3" className="text-center py-12 text-gray-400 italic">
                                <div className="flex justify-center items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></span>
                                    Memuat data direktori...
                                </div>
                            </td>
                        </tr>
                    ) : currentData.length === 0 ? (
                        <tr>
                            <td colSpan="3" className="text-center py-16">
                                <div className="flex flex-col items-center justify-center text-gray-300">
                                    <FaUserTie size={30} className="mb-2 opacity-30" />
                                    <p className="text-sm font-medium text-gray-500">
                                        {searchTerm 
                                            ? `Tidak ditemukan mitra "${searchTerm}" di tahun ${selectedYear}.` 
                                            : `Tidak ada mitra aktif pada tahun ${selectedYear}.`
                                        }
                                    </p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        currentData.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-5 align-top">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-[#1A2A80] border border-blue-100 flex items-center justify-center text-sm shadow-sm group-hover:bg-[#1A2A80] group-hover:text-white transition-colors">
                                            <FaUser />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm mb-0.5">{item.nama_lengkap}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                                                {formatGender(item.jenis_kelamin)}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 align-top">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <FaIdCard className="text-gray-400" />
                                            <span className="font-mono text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                {maskNIK(item.nik)}
                                            </span>
                                        </div>
                                        {item.sobat_id && (
                                            <div className="text-xs font-bold pl-6 text-[#1A2A80]">
                                                ID SOBAT: {item.sobat_id}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5 align-top">
                                    <div className="space-y-2">
                                        <p className="flex items-center gap-2 text-gray-700 text-xs font-medium">
                                            <FaPhone className="text-green-600" />
                                            {item.nomor_hp || '-'}
                                        </p>
                                        <p className="flex items-start gap-2 text-gray-500 text-xs leading-relaxed">
                                            <FaMapMarkerAlt className="text-red-500 mt-0.5 flex-shrink-0" />
                                            <span className="line-clamp-2">{item.alamat || '-'}</span>
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* --- SECTION PAGINATION (Sama seperti ManajemenMitra.jsx) --- */}
        {!loading && filteredMitra.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredMitra.length)} dari <span className="font-bold text-gray-800">{filteredMitra.length}</span> data
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <FaChevronLeft size={14} />
              </button>

              <span className="px-4 py-2 text-sm font-bold bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm">
                Halaman {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Mitra;