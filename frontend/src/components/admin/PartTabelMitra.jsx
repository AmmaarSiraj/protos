import React, { useState, useMemo, useEffect } from 'react';
import { 
    FaUserTie, FaEdit, FaTrash, FaFilter, FaCalendarCheck, 
    FaSearch, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';

const PartTableMitra = ({ 
    data, 
    onEdit, 
    onDelete, 
    onDetail, 
    readOnly,
    keyword, 
    onSearch 
}) => { 
  // --- 1. State ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [localSearch, setLocalSearch] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1); 
  const itemsPerPage = 10; 

  // Cek apakah search dilakukan dari server (props) atau lokal
  const isServerSearch = typeof onSearch === 'function';
  const currentSearch = isServerSearch ? keyword : localSearch;

  // --- 2. Mendapatkan List Tahun yang Tersedia ---
  const availableYears = useMemo(() => {
    const years = new Set();
    years.add(new Date().getFullYear().toString());

    if (data && data.length > 0) {
      data.forEach(mitra => {
        if (mitra.riwayat_tahun) {
          const listTahun = mitra.riwayat_tahun.split(', ');
          listTahun.forEach(y => years.add(y));
        }
      });
    }
    return Array.from(years).sort().reverse();
  }, [data]);

  // --- 3. Filter Data (Search & Tahun) ---
  const filteredData = useMemo(() => {
    if (!selectedYear) return [];

    let results = data || [];

    // Filter berdasarkan Tahun
    results = results.filter(mitra => 
      mitra.riwayat_tahun && mitra.riwayat_tahun.split(', ').includes(selectedYear)
    );

    // Filter berdasarkan Search
    if (!isServerSearch && currentSearch) {
        const lowerQuery = currentSearch.toLowerCase();
        results = results.filter(mitra => 
            mitra.nama_lengkap.toLowerCase().includes(lowerQuery) ||
            mitra.nik.includes(lowerQuery) ||
            (mitra.sobat_id && mitra.sobat_id.toLowerCase().includes(lowerQuery))
        );
    }

    return results;
  }, [data, selectedYear, currentSearch, isServerSearch]);

  // --- 4. Logic Reset Halaman ---
  // Reset ke halaman 1 setiap kali search atau tahun berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [currentSearch, selectedYear]);

  // --- 5. Pagination Data (Slicing) ---
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSearchChange = (e) => {
      const val = e.target.value;
      if (isServerSearch) {
          onSearch(val); 
      } else {
          setLocalSearch(val); 
      }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* BAGIAN HEADER & SEARCH */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-[#1A2A80] p-2 rounded-lg"><FaFilter /></div>
            <div>
                <h3 className="text-sm font-bold text-gray-700">Master Data Mitra</h3>
                <p className="text-xs text-gray-500">Data ditampilkan berdasarkan tahun aktif.</p>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Input Search */}
            <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FaSearch /></span>
                <input 
                    type="text" 
                    placeholder="Cari Nama / NIK..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1A2A80] transition"
                    value={currentSearch}
                    onChange={handleSearchChange}
                />
            </div>

            {/* Dropdown Tahun */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full sm:w-auto border border-gray-300 bg-gray-50 text-gray-800 text-sm rounded-lg focus:ring-[#1A2A80] focus:border-[#1A2A80] block px-4 py-2 outline-none font-bold"
                >
                    <option value="">-- Pilih Tahun --</option>
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
         </div>
      </div>

      {/* BAGIAN KONTEN TABEL */}
      {!selectedYear ? (
         <div className="flex flex-col items-center justify-center py-16 bg-gray-50 text-gray-400">
            <FaCalendarCheck className="text-4xl mb-3 opacity-20" />
            <p className="text-sm font-medium">Silakan pilih <span className="font-bold text-gray-600">Tahun Aktif</span> di atas untuk menampilkan data.</p>
         </div>
      ) : (
         <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nama Lengkap</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">NIK / ID Sobat</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Pekerjaan</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Kontak</th>
                    {!readOnly && <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {filteredData.length === 0 ? (
                        <tr>
                            <td colSpan={readOnly ? 4 : 5} className="px-6 py-12 text-center text-gray-400 italic bg-white">
                                {currentSearch ? (
                                    <span>Tidak ditemukan data untuk pencarian "<b>{currentSearch}</b>" di tahun <b>{selectedYear}</b>.</span>
                                ) : (
                                    <span>Tidak ada mitra aktif di tahun <b>{selectedYear}</b>.</span>
                                )}
                            </td>
                        </tr>
                    ) : (
                        paginatedData.map((mitra) => (
                            <tr key={mitra.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-[#1A2A80] rounded-full transition-colors"><FaUserTie /></div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 transition-colors">{mitra.nama_lengkap}</div>
                                        <div className="text-xs text-gray-500">{mitra.email || '-'}</div>
                                    </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                    <div className="font-bold text-gray-600">{mitra.nik}</div>
                                    {mitra.sobat_id && <div className="text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded w-fit">ID: {mitra.sobat_id}</div>}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div>{mitra.pekerjaan || '-'}</div>
                                    <div className="text-xs text-gray-400">{mitra.pendidikan}</div>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-900">
                                    <div className="font-bold">{mitra.nomor_hp}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[200px]">{mitra.alamat || '-'}</div>
                                </td>

                                {!readOnly && (
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                            onClick={(e) => { e.stopPropagation(); onEdit(mitra.id); }} 
                                            className="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition"
                                            title="Edit Profil"
                                            >
                                            <FaEdit />
                                            </button>
                                            <button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(mitra.id, selectedYear); }} 
                                            className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                                            title={`Hapus dari Tahun ${selectedYear}`}
                                            >
                                            <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>

            {/* --- BAGIAN TOMBOL PAGINATION (STYLE LAMA) --- */}
            {filteredData.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 font-medium">
                        Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari <span className="font-bold text-gray-800">{filteredData.length}</span> data
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
         </>
      )}
    </div>
  );
};

export default PartTableMitra;