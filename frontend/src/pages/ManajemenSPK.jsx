// src/pages/ManajemenSPK.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FaPrint, FaEdit, FaUserTie, FaSearch, FaFileContract, 
  FaExclamationTriangle, FaCheckCircle, FaCalendarAlt, FaPlus, 
  FaTrash, FaEye, FaPencilAlt, FaFilter, FaChevronDown, FaCog
} from 'react-icons/fa';
import ModalSPKSetting from '../components/admin/spk/ModalSPKSetting'; 
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const ManajemenSPK = () => {
  const navigate = useNavigate();

  // --- STATE FILTER ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');

  // --- STATE DATA ---
  const [mitraList, setMitraList] = useState([]);
  const [spkSetting, setSpkSetting] = useState(null); 
  const [templates, setTemplates] = useState([]); 
  const [selectedTemplateId, setSelectedTemplateId] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  // --- STATE MODAL ---
  const [showModal, setShowModal] = useState(false);

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { v: 1, l: 'Januari' }, { v: 2, l: 'Februari' }, { v: 3, l: 'Maret' },
    { v: 4, l: 'April' }, { v: 5, l: 'Mei' }, { v: 6, l: 'Juni' },
    { v: 7, l: 'Juli' }, { v: 8, l: 'Agustus' }, { v: 9, l: 'September' },
    { v: 10, l: 'Oktober' }, { v: 11, l: 'November' }, { v: 12, l: 'Desember' }
  ];

  const getPeriodeString = () => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    const periode = getPeriodeString();
    const headers = getAuthHeader(); 
    
    try {
      const [resMitra, resSetting, resTemplates] = await Promise.allSettled([
        axios.get(`${API_URL}/api/mitra/periode/${periode}`, { headers }),
        axios.get(`${API_URL}/api/spk-setting/periode/${periode}`, { headers }),
        axios.get(`${API_URL}/api/template-spk`, { headers })
      ]);

      // 1. Mitra 
      if (resMitra.status === 'fulfilled') {
        const raw = resMitra.value.data;
        const data = raw.data ? raw.data : raw;
        setMitraList(Array.isArray(data) ? data : []);
      } else {
        if (resMitra.reason.response?.status === 401) navigate('/');
        setMitraList([]);
      }

      // 2. Setting SPK
      if (resSetting.status === 'fulfilled') {
        const raw = resSetting.value.data;
        const data = raw.data ? raw.data : raw;
        setSpkSetting(data || null);
        setSelectedTemplateId(data?.template_id || 'DEFAULT');
      } else {
        setSpkSetting(null);
        setSelectedTemplateId('DEFAULT');
      }

      // 3. Templates
      if (resTemplates.status === 'fulfilled') {
        const raw = resTemplates.value.data;
        const data = raw.data ? raw.data : raw;
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
      }

    } catch (err) {
      console.error("Critical Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  // --- HANDLER TEMPLATE ---
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return Swal.fire('Pilih Template', 'Silakan pilih template terlebih dahulu.', 'warning');

    const periode = getPeriodeString();
    const templateIdToSend = (selectedTemplateId === 'DEFAULT' || selectedTemplateId === '') ? null : selectedTemplateId;

    const defaultData = {
        nama_ppk: '', 
        nip_ppk: '', 
        jabatan_ppk: 'Pejabat Pembuat Komitmen',
        tanggal_surat: new Date().toISOString().split('T')[0],
        nomor_surat_format: '000/33730/SPK.MITRA/MM/YYYY',
        komponen_honor: 'biaya pajak, bea materai, dan jasa pelayanan keuangan'
    };

    const payload = spkSetting 
        ? { ...spkSetting, template_id: templateIdToSend, periode }
        : { ...defaultData, template_id: templateIdToSend, periode };

    try {
        if (spkSetting && spkSetting.id) {
            await axios.put(`${API_URL}/api/spk-setting/${spkSetting.id}`, payload, { headers: getAuthHeader() });
            Swal.fire('Berhasil', 'Template berhasil diperbarui untuk periode ini.', 'success');
        } else {
            await axios.post(`${API_URL}/api/spk-setting`, payload, { headers: getAuthHeader() });
            Swal.fire('Berhasil', 'Template berhasil diterapkan.', 'success');
        }
        fetchData(); 
    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Gagal menyimpan template. ' + (err.response?.data?.message || ''), 'error');
    }
  };

  const handlePreviewTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === 'DEFAULT') return;
    try {
        const res = await axios.get(`${API_URL}/api/template-spk/${selectedTemplateId}`, { headers: getAuthHeader() });
        const data = res.data.data || res.data;
        const { nama_template, bagian_teks, pasal } = data;
        
        const mappedParts = {};
        if (Array.isArray(bagian_teks)) {
            bagian_teks.forEach(part => {
                mappedParts[part.jenis_bagian] = part.isi_teks;
            });
        }

        const finalParts = {
            pembuka: mappedParts.pembuka || '',
            pihak_pertama: mappedParts.pihak_pertama || '',
            pihak_kedua: mappedParts.pihak_kedua || '',
            kesepakatan: mappedParts.kesepakatan || '',
            penutup: mappedParts.penutup || ''
        };
        
        navigate('/spk/templates/preview', {
            state: { 
                header: { nama_template }, 
                parts: finalParts,
                articles: pasal, 
                id: selectedTemplateId 
            }
        });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Gagal memuat template.', 'error');
    }
  };

  const handleEditTemplate = () => {
    if (!selectedTemplateId || selectedTemplateId === 'DEFAULT') return;
    navigate(`/spk/templates/edit/${selectedTemplateId}`);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === 'DEFAULT') return;
    const confirm = await Swal.fire({
        title: 'Hapus?', text: "Tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus!'
    });
    if (confirm.isConfirmed) {
        try {
            await axios.delete(`${API_URL}/api/template-spk/${selectedTemplateId}`, { headers: getAuthHeader() });
            Swal.fire('Terhapus!', '', 'success');
            setSelectedTemplateId('DEFAULT');
            fetchData();
        } catch (error) {
            Swal.fire('Gagal', '', 'error');
        }
    }
  };

  const filteredMitra = useMemo(() => {
    if (!searchQuery) return mitraList;
    const lower = searchQuery.toLowerCase();
    return mitraList.filter(m => m.nama_lengkap.toLowerCase().includes(lower) || m.nik?.includes(lower));
  }, [mitraList, searchQuery]);

  const handlePrint = (id_mitra) => {
    if (!spkSetting) return Swal.fire('Belum Siap', 'Terapkan template dulu!', 'warning');
    navigate(`/spk/print/${getPeriodeString()}/${id_mitra}`);
  };

  const getCurrentTemplateName = () => {
      if (!spkSetting) return null;
      if (!spkSetting.template_id) return 'Default (Sistem)';
      const found = templates.find(t => t.id == spkSetting.template_id);
      return found ? found.nama_template : 'Template Terhapus/Tidak Dikenal';
  };

  return (
    // Container aligned with Design System (max-w-7xl)
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      
      {/* === HEADER SECTION === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                    <FaFileContract size={24} />
                  </div>
                  Manajemen SPK
               </h1>
               <p className="text-gray-500 mt-2 ml-1">
                  Kelola template dan cetak Surat Perjanjian Kerja mitra per periode.
               </p>
            </div>

            <Link 
                to="/spk/templates/create" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A2A80] hover:bg-blue-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
            >
                <FaPlus /> Buat Master Template
            </Link>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* === FILTER & SEARCH BAR === */}
          <div className="flex flex-col md:flex-row gap-4">
             {/* Filter Tahun */}
             <div className="relative min-w-[140px]">
                <FaCalendarAlt className="absolute left-4 top-3.5 text-gray-400" />
                <select
                   className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 cursor-pointer appearance-none font-bold"
                   value={selectedYear}
                   onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                   {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
             </div>

             {/* Filter Bulan */}
             <div className="relative min-w-[160px]">
                <FaCalendarAlt className="absolute left-4 top-3.5 text-gray-400" />
                <select
                   className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 cursor-pointer appearance-none font-bold"
                   value={selectedMonth}
                   onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                   {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
             </div>

             {/* Search */}
             <div className="relative flex-grow">
                <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama mitra atau NIK..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
      </div>

      {/* === PANEL SETTING (STATUS CARD) === */}
      <div className={`rounded-2xl border p-6 flex flex-col lg:flex-row justify-between items-start gap-6 shadow-sm transition-colors ${spkSetting ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl text-2xl shadow-sm border ${spkSetting ? 'bg-white text-emerald-600 border-emerald-100' : 'bg-white text-amber-500 border-amber-100'}`}>
                {spkSetting ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <div>
                <h3 className={`font-extrabold text-lg ${spkSetting ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {spkSetting ? 'SPK Siap Dicetak' : 'Konfigurasi SPK Belum Diatur'}
                </h3>
                <p className={`text-sm mt-1 font-medium ${spkSetting ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {spkSetting ? `Menggunakan Template: "${getCurrentTemplateName()}"` : "Silakan pilih template dan atur detail pejabat untuk periode ini."}
                </p>
                {spkSetting && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-bold bg-white/50 px-3 py-1 rounded-lg border border-emerald-100 w-fit">
                        <FaUserTie /> PPK: {spkSetting.nama_ppk || '-'}
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col gap-3 w-full lg:w-auto min-w-[300px]">
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                <select 
                    value={selectedTemplateId} 
                    onChange={(e) => setSelectedTemplateId(e.target.value)} 
                    className="bg-transparent text-sm outline-none font-bold text-gray-700 w-full px-2 py-1"
                >
                    <option value="DEFAULT">★ Template Default (Sistem)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.nama_template}</option>)}
                </select>
                <button 
                    onClick={handleApplyTemplate} 
                    className="bg-[#1A2A80] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
                >
                    Terapkan
                </button>
            </div>
            
            {selectedTemplateId && selectedTemplateId !== 'DEFAULT' && (
                <div className="flex justify-end gap-2">
                    <button onClick={handlePreviewTemplate} className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-50 shadow-sm flex items-center gap-1 transition"><FaEye /> Lihat</button>
                    <button onClick={handleEditTemplate} className="text-xs font-bold text-orange-600 bg-white px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-50 shadow-sm flex items-center gap-1 transition"><FaPencilAlt /> Edit</button>
                    <button onClick={handleDeleteTemplate} className="text-xs font-bold text-red-600 bg-white px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 shadow-sm flex items-center gap-1 transition"><FaTrash /> Hapus</button>
                </div>
            )}
            
            <button 
                onClick={() => setShowModal(true)} 
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex justify-center gap-2 items-center border transition-all
                    ${spkSetting 
                        ? 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50' 
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50 animate-pulse-slow'
                    }
                `}
            >
                <FaCog /> {spkSetting ? 'Edit Detail Pejabat & Tanggal' : 'Atur Detail Pejabat & Tanggal'}
            </button>
        </div>
      </div>

      {/* === TABLE MITRA === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center gap-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase text-sm tracking-wide">
                <FaUserTie className="text-[#1A2A80]" /> Daftar Mitra Tersedia
            </h3>
            <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500 shadow-sm">
                Total: {filteredMitra.length}
            </span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-white text-gray-500 border-b border-gray-100 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Nama Mitra</th>
                        <th className="px-6 py-4">NIK</th>
                        <th className="px-6 py-4 text-center w-32">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        <tr><td colSpan="3" className="text-center py-10 text-gray-400">Memuat data...</td></tr>
                    ) : filteredMitra.length === 0 ? (
                        <tr>
                            <td colSpan="3" className="text-center py-12">
                                <div className="flex flex-col items-center justify-center text-gray-300">
                                    <FaSearch size={30} className="mb-2 opacity-50" />
                                    <p className="text-sm font-medium text-gray-500">Tidak ada data mitra ditemukan.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredMitra.map(m => (
                            <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1A2A80] flex items-center justify-center font-bold text-xs">
                                            <FaUserTie size={14} />
                                        </div>
                                        <span className="font-bold text-gray-800">{m.nama_lengkap}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{m.nik}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handlePrint(m.id)} 
                                        disabled={!spkSetting} 
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm border
                                            ${spkSetting 
                                                ? 'bg-white text-[#1A2A80] border-blue-100 hover:bg-blue-50 hover:border-blue-200' 
                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}
                                        `}
                                    >
                                        <FaPrint /> Cetak
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <ModalSPKSetting isOpen={showModal} onClose={() => setShowModal(false)} periode={getPeriodeString()} onSuccess={fetchData} />
    </div>
  );
};

export default ManajemenSPK;