// src/pages/admin/TransaksiMitra.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaFilter, FaSearch, FaUserTie, FaIdBadge, FaCalendarAlt } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const TransaksiMitra = () => {
  const navigate = useNavigate();
  
  // --- STATE FILTER ---
  const currentYear = new Date().getFullYear();
  const [filterTahun, setFilterTahun] = useState(currentYear);
  const [filterBulan, setFilterBulan] = useState('all');
  const [search, setSearch] = useState('');

  // --- STATE DATA ---
  const [transaksiData, setTransaksiData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- FETCH TRANSAKSI ---
  useEffect(() => {
    const fetchTransaksi = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = {
          tahun: filterTahun,
          bulan: filterBulan !== 'all' ? filterBulan : undefined
        };

        const res = await axios.get(`${API_URL}/api/transaksi`, {
          headers: { Authorization: `Bearer ${token}` },
          params: params
        });
        setTransaksiData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaksi();
  }, [filterTahun, filterBulan]);

  // --- FILTER SEARCH CLIENT SIDE ---
  const displayData = transaksiData.filter(item => 
    item.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    (item.sobat_id && item.sobat_id.toLowerCase().includes(search.toLowerCase()))
  );

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // Ambil limit dari data pertama (karena seragam per response)
  const currentLimit = transaksiData.length > 0 ? transaksiData[0].limit_periode : 0;

  // Generate Opsi Tahun
  const yearOptions = [];
  for (let i = currentYear + 1; i >= currentYear - 4; i--) {
    yearOptions.push(i);
  }

  const months = [
    { val: '1', label: 'Januari' }, { val: '2', label: 'Februari' }, { val: '3', label: 'Maret' },
    { val: '4', label: 'April' }, { val: '5', label: 'Mei' }, { val: '6', label: 'Juni' },
    { val: '7', label: 'Juli' }, { val: '8', label: 'Agustus' }, { val: '9', label: 'September' },
    { val: '10', label: 'Oktober' }, { val: '11', label: 'November' }, { val: '12', label: 'Desember' }
  ];

  // Tentukan Label Header Kolom Status
  const statusHeaderLabel = filterBulan === 'all' 
    ? "Persentase Pendapatan (Setahun)" 
    : "Status Limit (Bulanan)";

  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Monitoring Transaksi Mitra</h1>
        <p className="text-sm text-gray-500">Pantau akumulasi honor mitra berdasarkan periode waktu.</p>
      </div>

      {/* --- PANEL FILTER --- */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-4 text-[#1A2A80] font-bold text-sm uppercase tracking-wide border-b border-gray-100 pb-2">
            <FaFilter /> Filter Periode
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Filter Tahun */}
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Anggaran</label>
                <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                    <select 
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm font-bold text-gray-700 bg-gray-50 focus:bg-white transition"
                        value={filterTahun}
                        onChange={(e) => setFilterTahun(e.target.value)}
                    >
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Filter Bulan */}
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Bulan (Opsional)</label>
                <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm bg-gray-50 focus:bg-white transition"
                    value={filterBulan}
                    onChange={(e) => setFilterBulan(e.target.value)}
                >
                    <option value="all">-- Akumulasi Satu Tahun --</option>
                    {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
            </div>

        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" /> Hasil Filter ({displayData.length})
            </h3>
            <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-2.5 text-gray-400"><FaSearch /></span>
                <input 
                    type="text" placeholder="Cari Nama / ID..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-900 outline-none transition"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                    <tr>
                        <th className="px-6 py-3">Mitra</th>
                        <th className="px-6 py-3 text-right">Pendapatan ({filterBulan !== 'all' ? months.find(m => m.val == filterBulan)?.label : 'Setahun'})</th>
                        <th className="px-6 py-3 text-center">{statusHeaderLabel}</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan="4" className="text-center py-10 text-gray-400">Memuat data...</td></tr>
                    ) : displayData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-10 text-gray-400 italic">Tidak ada data transaksi yang sesuai filter.</td></tr>
                    ) : (
                        displayData.map(item => (
                            <tr 
                                key={item.id} 
                                onClick={() => navigate(`/admin/mitra/${item.id}`)}
                                className="hover:bg-blue-50/50 transition cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-[#1A2A80] rounded-full"><FaUserTie /></div>
                                        <div>
                                            <p className="font-bold text-gray-700">{item.nama_lengkap}</p>
                                            {item.sobat_id && <p className="text-xs text-gray-400 flex items-center gap-1"><FaIdBadge/> {item.sobat_id}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-800">
                                    {item.pendapatan_terfilter > 0 ? (
                                        <span className="text-green-600">{formatRupiah(item.pendapatan_terfilter)}</span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {/* Progress Bar membandingkan pendapatan terfilter vs LIMIT periode (Bulan atau Tahun*12) */}
                                    {currentLimit > 0 ? (
                                        <div className="w-full max-w-[120px] mx-auto">
                                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                <span className="font-bold text-gray-600">{((item.pendapatan_terfilter / currentLimit) * 100).toFixed(1)}%</span>
                                                {/* Optional: Menampilkan nilai limit untuk info tambahan */}
                                                <span className="text-[9px]">Max: {formatRupiah(currentLimit)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${item.pendapatan_terfilter > currentLimit ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${Math.min((item.pendapatan_terfilter / currentLimit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            {item.pendapatan_terfilter > currentLimit && <span className="text-[10px] text-red-500 font-bold block mt-1">OVER LIMIT</span>}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-400">Limit Unset</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-xs font-bold text-blue-600 hover:underline">Detail</span>
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

export default TransaksiMitra;