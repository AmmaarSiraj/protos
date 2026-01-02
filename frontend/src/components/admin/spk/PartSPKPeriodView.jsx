// src/components/admin/spk/PartSPKPeriodView.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaPrint, FaEdit, FaUserTie, FaCalendarAlt, FaFileSignature } from 'react-icons/fa';
import ModalSPKSetting from './ModalSPKSetting';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const PartSPKPeriodView = ({ periode, onBack }) => {
  const [mitraList, setMitraList] = useState([]);
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMitra, resSetting] = await Promise.all([
        axios.get(`${API_URL}/api/spk/mitra/${periode}`),
        axios.get(`${API_URL}/api/spk/setting/${periode}`)
      ]);
      setMitraList(resMitra.data);
      setSetting(resSetting.data); // Bisa null jika belum disetting
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periode]);

  const handlePrint = (id_mitra) => {
    if (!setting) {
        alert("Mohon atur Template Surat (Pejabat & Tanggal) terlebih dahulu sebelum mencetak.");
        setShowModal(true);
        return;
    }
    // Navigasi ke halaman cetak (Akan dibuat di Tahap 4)
    navigate(`/admin/spk/print/${periode}/${id_mitra}`);
  };

  // Helper Format Tanggal
  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatPeriodeLabel = (p) => {
    if (!p) return '-';
    const [y, m] = p.split('-');
    return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat data periode...</div>;

  return (
    <div className="animate-fade-in-up">
      
      {/* Header Navigasi */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-bold text-sm">
            <FaArrowLeft /> Kembali ke Daftar Periode
        </button>
        <div className="text-right">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Periode Aktif</span>
            <h2 className="text-2xl font-bold text-[#1A2A80]">{formatPeriodeLabel(periode)}</h2>
        </div>
      </div>

      {/* KARTU PENGATURAN SURAT (Header SPK) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg text-xl">
                    <FaFileSignature />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800">Pejabat Penandatangan (PPK)</h3>
                    {setting ? (
                        <div className="text-sm text-gray-600 mt-1">
                            <p className="font-bold">{setting.nama_ppk}</p>
                            <p>NIP: {setting.nip_ppk}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <FaCalendarAlt /> Tgl Surat: {formatDateIndo(setting.tanggal_surat)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-red-500 italic mt-1 flex items-center gap-1">
                           Belum diatur. Silakan edit template.
                        </p>
                    )}
                </div>
            </div>

            <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm"
            >
                <FaEdit /> {setting ? 'Edit Template Surat' : 'Buat Template Surat'}
            </button>
        </div>
      </div>

      {/* TABEL DAFTAR MITRA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Daftar Penerima SPK ({mitraList.length})</h3>
        </div>
        
        <table className="min-w-full text-sm text-left">
            <thead className="bg-white text-gray-500 border-b border-gray-100">
                <tr>
                    <th className="px-6 py-3">Nama Mitra</th>
                    <th className="px-6 py-3">NIK</th>
                    <th className="px-6 py-3">Bank</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {mitraList.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Tidak ada mitra yang bertugas di periode ini.</td></tr>
                ) : (
                    mitraList.map(m => (
                        <tr key={m.id} className="hover:bg-blue-50/30 transition">
                            <td className="px-6 py-3 font-bold text-gray-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1A2A80] flex items-center justify-center text-xs">
                                    <FaUserTie />
                                </div>
                                {m.nama_lengkap}
                            </td>
                            <td className="px-6 py-3 font-mono text-gray-500">{m.nik}</td>
                            <td className="px-6 py-3 text-gray-600">{m.nama_bank} - {m.no_rekening}</td>
                            <td className="px-6 py-3 text-right">
                                <button 
                                    onClick={() => handlePrint(m.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A2A80] text-white rounded shadow-sm hover:bg-blue-900 transition text-xs font-bold"
                                >
                                    <FaPrint /> Cetak SPK
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {/* MODAL SETTING */}
      <ModalSPKSetting 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        periode={periode} 
        onSuccess={fetchData} 
      />

    </div>
  );
};

export default PartSPKPeriodView;