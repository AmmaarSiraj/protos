// src/pages/DetailKegiatanUser.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FaArrowLeft, 
  FaUserTag, 
  FaLayerGroup, 
  FaCalendarAlt, 
  FaCoins, 
  FaBoxOpen, 
  FaInfoCircle 
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';

const DetailKegiatanUser = () => {
  const { id } = useParams(); // ID Sub Kegiatan

  const [subData, setSubData] = useState(null);
  const [honorList, setHonorList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};

          const [resSub, resHon] = await Promise.all([
              axios.get(`${API_URL}/api/subkegiatan/${id}`, { headers }),
              axios.get(`${API_URL}/api/subkegiatan/${id}/honorarium`, { headers }),
          ]);

          setSubData(resSub.data.data);
          setHonorList(resHon.data.data); 

      } catch (err) {
          console.error("Error fetching data:", err);
          setError(err.response?.data?.message || err.message || "Gagal memuat data.");
      } finally {
          setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getComputedStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return { label: 'Jadwal Belum Lengkap', className: 'bg-gray-100 text-gray-500' };
    
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start) {
        return { label: 'Akan Datang', className: 'bg-blue-100 text-blue-700 border border-blue-200' };
    } else if (now > end) {
        return { label: 'Selesai', className: 'bg-gray-100 text-gray-600 border border-gray-200' };
    } else {
        return { label: 'Sedang Proses', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat detail kegiatan...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 px-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block border border-red-100">
            {error}
        </div>
        <div className="mt-4">
            <Link to="/daftar-kegiatan" className="text-[#1A2A80] hover:underline font-bold text-sm">Kembali</Link>
        </div>
    </div>
  );
  
  if (!subData) return <div className="text-center py-10 text-gray-500">Data tidak ditemukan.</div>;

  const statusObj = getComputedStatus(subData.tanggal_mulai, subData.tanggal_selesai);

  return (
    <div className="w-full mx-auto max-w-5xl space-y-8 pt-8 px-4 sm:px-6 pb-20">
      
      {/* --- TOMBOL KEMBALI (Updated Style) --- */}
      <div>
        <Link 
          to="/daftar-kegiatan" 
          className="group inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#1A2A80] hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md text-sm font-bold"
        >
          <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors duration-300">
             <FaArrowLeft size={10} className="text-gray-500 group-hover:text-[#1A2A80] transition-colors" />
          </div>
          Kembali ke Daftar Survei & Sensus
        </Link>
      </div>

      {/* === BAGIAN 1: Header Informasi Kegiatan === */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100 relative">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${
            statusObj.label === 'Selesai' ? 'bg-gray-400' : 
            statusObj.label === 'Sedang Proses' ? 'bg-yellow-500' : 
            'bg-[#1A2A80]'
        }`}></div>
        
        <div className="p-6 md:p-8 pl-8 md:pl-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{subData.nama_sub_kegiatan}</h1>
              </div>
              
              <p className="text-gray-600 leading-relaxed mb-6 text-sm md:text-base">
                {subData.deskripsi || 'Tidak ada deskripsi rinci untuk kegiatan ini.'}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                 <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <FaCalendarAlt className="text-[#1A2A80]" /> 
                    <span className="font-bold text-gray-700">Pelaksanaan:</span> 
                    {formatDate(subData.tanggal_mulai)} - {formatDate(subData.tanggal_selesai)}
                 </div>
              </div>
            </div>
            
            {/* Status Display */}
            <div className="flex flex-col items-end gap-2 min-w-fit">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status Saat Ini</span>
              <div className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold shadow-sm ${statusObj.className}`}>
                <FaInfoCircle /> {statusObj.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === BAGIAN 2: Daftar Jabatan & Honorarium === */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FaUserTag className="text-[#1A2A80]" /> Daftar Posisi & Honorarium
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Jabatan yang tersedia beserta estimasi honorarium.
                </p>
            </div>
            <span className="bg-[#1A2A80] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {honorList.length} Posisi
            </span>
        </div>
        
        <div className="p-0">
            {honorList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white">
                    <div className="mb-3 text-gray-200 text-5xl flex justify-center"><FaUserTag /></div>
                    <p className="text-sm font-medium text-gray-500">Belum ada informasi honorarium untuk kegiatan ini.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">Nama Jabatan</th>
                                <th className="px-6 py-4 text-left">Nominal Honor</th>
                                <th className="px-6 py-4 text-left">Volume Kerja</th>
                                <th className="px-6 py-4 text-center">Kode</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {honorList.map((honor) => (
                                <tr key={honor.id_honorarium} className="hover:bg-blue-50/30 transition-colors">
                                    {/* Kolom Jabatan */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#1A2A80]">
                                                <FaUserTag size={14} />
                                            </div>
                                            <span className="text-sm font-bold text-gray-800">
                                                {honor.nama_jabatan || 'Jabatan Umum'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Kolom Tarif */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <FaCoins className="text-yellow-500" />
                                            <span className="text-sm font-bold text-gray-800">
                                                {formatRupiah(honor.tarif)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Kolom Satuan */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md w-fit border border-gray-200">
                                            <FaBoxOpen className="text-gray-400" />
                                            <span>Per <strong>{honor.basis_volume}</strong> {honor.nama_satuan}</span>
                                        </div>
                                    </td>

                                    {/* Kolom Kode */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">
                                            {honor.kode_jabatan}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        
        {/* Footer Card */}
        {honorList.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-2">
              <FaLayerGroup /> *Besaran honor dapat berubah sewaktu-waktu sesuai kebijakan BPS.
            </div>
        )}
      </div>

    </div>
  );
};

export default DetailKegiatanUser;