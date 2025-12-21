import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaMoneyBillWave, 
  FaFilter, 
  FaSearch, 
  FaCheckCircle, 
  FaExclamationTriangle 
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://makinasik.web.bps.go.id';

const TransaksiMitraUser = () => {
  const navigate = useNavigate();
  const [transaksiList, setTransaksiList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { v: 'all', l: 'Semua Bulan' },
    { v: 1, l: 'Januari' }, { v: 2, l: 'Februari' }, { v: 3, l: 'Maret' },
    { v: 4, l: 'April' }, { v: 5, l: 'Mei' }, { v: 6, l: 'Juni' },
    { v: 7, l: 'Juli' }, { v: 8, l: 'Agustus' }, { v: 9, l: 'September' },
    { v: 10, l: 'Oktober' }, { v: 11, l: 'November' }, { v: 12, l: 'Desember' }
  ];

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const res = await axios.get(`${API_URL}/api/transaksi?tahun=${selectedYear}&bulan=${selectedMonth}`, config);
        setTransaksiList(res.data);
      } catch (err) {
        console.error("Gagal memuat transaksi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  const filteredData = useMemo(() => {
    return transaksiList.filter(item => 
      item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transaksiList, searchTerm]);

  const totalHonorSemua = filteredData.reduce((acc, curr) => acc + Number(curr.total_pendapatan), 0);

  return (
    <div className="container mx-auto pt-8 px-4 py-8 max-w-6xl pb-8 animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaMoneyBillWave className="text-[#1A2A80]" /> Data Transaksi Mitra
            </h1>
            <p className="text-sm text-gray-500 mt-1">Rekapitulasi honorarium mitra statistik.</p>
        </div>
        <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 text-sm font-bold shadow-sm">
            Total Realisasi: {formatRupiah(totalHonorSemua)}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         
         <div className="relative w-full md:w-1/3">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama mitra..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm transition bg-gray-50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <FaFilter className="text-gray-400" />
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent outline-none text-sm font-bold text-gray-700 cursor-pointer"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent outline-none text-sm font-bold text-gray-700 cursor-pointer"
                >
                    {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4">Nama Mitra</th>
                        <th className="px-6 py-4 text-center">Periode</th>
                        <th className="px-6 py-4 text-right">Total Honor</th>
                        <th className="px-6 py-4 text-center">Status Batas</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr>
                            <td colSpan="4" className="text-center py-12 text-gray-400 italic">Memuat data transaksi...</td>
                        </tr>
                    ) : filteredData.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="text-center py-12 text-gray-400 italic bg-gray-50/30">
                                Tidak ada data transaksi untuk periode ini.
                            </td>
                        </tr>
                    ) : (
                        filteredData.map((item, idx) => (
                            <tr 
                                key={idx} 
                                onClick={() => navigate(`/transaksi-mitra/${item.id}`)}
                                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4 font-bold text-gray-800 group-hover:text-[#1A2A80]">
                                    {item.nama_lengkap}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-600">
                                    {selectedMonth === 'all' ? `Tahun ${selectedYear}` : `${months.find(m => m.v == selectedMonth)?.l} ${selectedYear}`}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-medium text-gray-700">
                                    {formatRupiah(item.total_pendapatan)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {item.status_aman ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                            <FaCheckCircle /> Aman
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200" title={`Melebihi batas ${formatRupiah(item.limit_periode)}`}>
                                            <FaExclamationTriangle /> Warning
                                        </span>
                                    )}
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

export default TransaksiMitraUser;