// src/components/admin/PartTableMitra.jsx
import React, { useState, useMemo } from 'react';
import { FaUserTie, FaEdit, FaTrash, FaFilter, FaCalendarCheck, FaSearch } from 'react-icons/fa';

const PartTableMitra = ({ data, onEdit, onDelete, onDetail }) => {
  const [selectedYear, setSelectedYear] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // State untuk search

  // 1. Ambil daftar tahun unik dari seluruh data mitra
  const availableYears = useMemo(() => {
    const years = new Set();
    // Selalu tambahkan tahun saat ini agar minimal ada 1 opsi
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

  // 2. Filter Data berdasarkan Tahun DAN Search Query
  const filteredData = useMemo(() => {
    if (!selectedYear) return [];

    // Filter Tahun Dulu
    let results = data.filter(mitra => {
      return mitra.riwayat_tahun && mitra.riwayat_tahun.split(', ').includes(selectedYear);
    });

    // Filter Search (Nama / NIK / Sobat ID)
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        results = results.filter(mitra => 
            mitra.nama_lengkap.toLowerCase().includes(lowerQuery) ||
            mitra.nik.includes(lowerQuery) ||
            (mitra.sobat_id && mitra.sobat_id.toLowerCase().includes(lowerQuery))
        );
    }

    return results;
  }, [data, selectedYear, searchQuery]);

  return (
    <div className="flex flex-col">
      
      {/* HEADER & FILTER */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
         
         {/* Bagian Judul */}
         <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-[#1A2A80] p-2 rounded-lg">
                <FaFilter />
            </div>
            <div>
                {/* GANTI JUDUL DI SINI */}
                <h3 className="text-sm font-bold text-gray-700">Master Data Mitra</h3>
                <p className="text-xs text-gray-500">Pilih tahun untuk melihat daftar mitra aktif.</p>
            </div>
         </div>

         {/* Bagian Filter & Search */}
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaSearch />
                </span>
                <input 
                    type="text" 
                    placeholder="Cari Nama / ID Sobat..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1A2A80] transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Tahun Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                    id="yearFilter"
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

      {/* TABEL DATA */}
      {!selectedYear ? (
         <div className="flex flex-col items-center justify-center py-16 bg-gray-50 text-gray-400">
            <FaCalendarCheck className="text-4xl mb-3 opacity-20" />
            <p className="text-sm font-medium">Silakan pilih <span className="font-bold text-gray-600">Tahun Aktif</span> di atas untuk menampilkan data.</p>
         </div>
      ) : (
         <div className="overflow-x-auto animate-fade-in-up">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nama Lengkap</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">NIK / ID Sobat</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Pekerjaan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Kontak</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic bg-white">
                        {searchQuery ? (
                            <span>Tidak ditemukan data untuk pencarian "<b>{searchQuery}</b>" di tahun <b>{selectedYear}</b>.</span>
                        ) : (
                            <span>Tidak ada mitra aktif di tahun <b>{selectedYear}</b>.</span>
                        )}
                      </td>
                  </tr>
                ) : (
                  filteredData.map((mitra) => (
                    <tr 
                      key={mitra.id} 
                      // onClick dihapus agar tidak redirect ke detail
                      className="hover:bg-gray-50 transition-colors group" // cursor-pointer dihapus
                    >
                      {/* Kolom Nama */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-[#1A2A80] rounded-full transition-colors">
                              <FaUserTie />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 transition-colors">{mitra.nama_lengkap}</div>
                            <div className="text-xs text-gray-500">{mitra.email || '-'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Kolom NIK */}
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        <div className="font-bold text-gray-600">{mitra.nik}</div>
                        {mitra.sobat_id && <div className="text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded w-fit">ID: {mitra.sobat_id}</div>}
                      </td>

                      {/* Kolom Pekerjaan */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{mitra.pekerjaan || '-'}</div>
                        <div className="text-xs text-gray-400">{mitra.pendidikan}</div>
                      </td>

                      {/* Kolom Kontak */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-bold">{mitra.nomor_hp}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {mitra.alamat || '-'}
                        </div>
                      </td>

                      {/* Kolom Aksi */}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         </div>
      )}
    </div>
  );
};

export default PartTableMitra;