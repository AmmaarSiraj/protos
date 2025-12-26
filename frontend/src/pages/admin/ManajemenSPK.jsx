import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FaPrint, FaEdit, FaUserTie, FaSearch, FaFileContract, 
  FaExclamationTriangle, FaCheckCircle, FaCalendarAlt, FaPlus, 
  FaTrash, FaEye, FaPencilAlt 
} from 'react-icons/fa';
import ModalSPKSetting from '../../components/admin/spk/ModalSPKSetting'; 
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';

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
        // Set dropdown sesuai setting yg tersimpan, atau DEFAULT jika null
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

  // --- HANDLER TERAPKAN TEMPLATE ---
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

  // --- [FIX] HANDLER PREVIEW TEMPLATE ---
  const handlePreviewTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === 'DEFAULT') return;
    try {
        const res = await axios.get(`${API_URL}/api/template-spk/${selectedTemplateId}`, { headers: getAuthHeader() });
        const data = res.data.data || res.data;
        const { nama_template, bagian_teks, pasal } = data;
        
        // --- LOGIKA MAPPING ARRAY KE OBJECT ---
        // Kita harus mengubah array [{jenis_bagian: 'pembuka', isi_teks: '...'}]
        // menjadi object { pembuka: '...', ... } agar bisa dibaca di PreviewTemplate.jsx
        
        const mappedParts = {};
        if (Array.isArray(bagian_teks)) {
            bagian_teks.forEach(part => {
                mappedParts[part.jenis_bagian] = part.isi_teks;
            });
        }

        // Pastikan field standar ada (fallback string kosong)
        const finalParts = {
            pembuka: mappedParts.pembuka || '',
            pihak_pertama: mappedParts.pihak_pertama || '',
            pihak_kedua: mappedParts.pihak_kedua || '',
            kesepakatan: mappedParts.kesepakatan || '',
            penutup: mappedParts.penutup || ''
        };
        
        navigate('/admin/spk/templates/preview', {
            state: { 
                header: { nama_template }, 
                parts: finalParts, // Gunakan hasil mapping
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
    navigate(`/admin/spk/templates/edit/${selectedTemplateId}`);
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
    navigate(`/admin/spk/print/${getPeriodeString()}/${id_mitra}`);
  };

  const getCurrentTemplateName = () => {
      if (!spkSetting) return null;
      if (!spkSetting.template_id) return 'Default (Sistem)';
      
      // Cari nama template dari list templates berdasarkan ID yang disimpan di setting
      const found = templates.find(t => t.id == spkSetting.template_id);
      return found ? found.nama_template : 'Template Terhapus/Tidak Dikenal';
  };

  return (
    <div className="w-full pb-20 animate-fade-in-up">
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileContract className="text-[#1A2A80]" /> Manajemen SPK
            </h1>
            <p className="text-sm text-gray-500 mt-1">Kelola dan cetak Surat Perjanjian Kerja mitra per periode.</p>
        </div>
        <Link to="/admin/spk/templates/create" className="bg-[#1A2A80] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 flex items-center gap-2"><FaPlus /> Buat Master Template</Link>
      </div>

      {/* FILTER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tahun</label>
            <select className="w-full border p-2 rounded-lg" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bulan</label>
            <select className="w-full border p-2 rounded-lg" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          {loading && <div className="text-xs text-gray-400 pb-2">Memuat...</div>}
        </div>
      </div>

      {/* PANEL SETTING */}
      <div className={`rounded-xl border p-5 mb-8 flex flex-col lg:flex-row justify-between items-start gap-6 ${spkSetting ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full text-xl ${spkSetting ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {spkSetting ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <div>
                <h3 className={`font-bold text-lg ${spkSetting ? 'text-green-800' : 'text-yellow-800'}`}>
                    {spkSetting ? 'SPK Siap Dicetak' : 'SPK Belum Diatur'}
                </h3>
                <p className={`text-sm mt-1 ${spkSetting ? 'text-green-700' : 'text-yellow-700'}`}>
                    {spkSetting ? `Template Aktif: "${getCurrentTemplateName()}"` : "Pilih template dan klik 'Terapkan'."}
                </p>
            </div>
        </div>
        <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex gap-2 bg-white p-2 rounded-lg border shadow-sm">
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="bg-transparent text-sm outline-none font-medium w-full sm:w-64">
                    <option value="DEFAULT">★ Template Default (Sistem)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.nama_template}</option>)}
                </select>
                <button onClick={handleApplyTemplate} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded">Terapkan</button>
            </div>
            
            {selectedTemplateId && selectedTemplateId !== 'DEFAULT' && (
                <div className="flex justify-end gap-2 text-xs">
                    <button onClick={handlePreviewTemplate} className="text-indigo-700 bg-indigo-50 px-3 py-1 rounded border border-indigo-200 flex items-center gap-1"><FaEye /> Lihat</button>
                    <button onClick={handleEditTemplate} className="text-orange-700 bg-orange-50 px-3 py-1 rounded border border-orange-200 flex items-center gap-1"><FaPencilAlt /> Edit</button>
                    <button onClick={handleDeleteTemplate} className="text-red-700 bg-red-50 px-3 py-1 rounded border border-red-200 flex items-center gap-1"><FaTrash /> Hapus</button>
                </div>
            )}
            
            <button onClick={() => setShowModal(true)} className="w-full mt-1 px-4 py-2 rounded-lg text-sm font-bold shadow-sm bg-white text-green-700 border border-green-200 hover:bg-green-50 flex justify-center gap-2 items-center">
                <FaEdit /> {spkSetting ? 'Edit Detail Pejabat/Tanggal' : 'Atur Detail Pejabat/Tanggal'}
            </button>
        </div>
      </div>

      {/* TABLE MITRA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center gap-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaUserTie className="text-[#1A2A80]" /> Daftar Mitra</h3>
            <input type="text" placeholder="Cari Mitra..." className="pl-4 pr-4 py-2 border rounded-lg text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <table className="min-w-full text-sm text-left">
            <thead className="bg-white text-gray-500 border-b uppercase text-xs font-bold">
                <tr><th className="px-6 py-4">Nama Mitra</th><th className="px-6 py-4">NIK</th><th className="px-6 py-4 text-center">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredMitra.map(m => (
                    <tr key={m.id} className="hover:bg-blue-50">
                        <td className="px-6 py-4 font-bold">{m.nama_lengkap}</td>
                        <td className="px-6 py-4 text-gray-600 font-mono">{m.nik}</td>
                        <td className="px-6 py-4 text-center">
                            <button onClick={() => handlePrint(m.id)} disabled={!spkSetting} className={`px-4 py-2 rounded text-xs font-bold ${spkSetting ? 'bg-[#1A2A80] text-white' : 'bg-gray-200 text-gray-400'}`}><FaPrint /> Cetak</button>
                        </td>
                    </tr>
                ))}
                {filteredMitra.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-gray-400">Tidak ada data.</td></tr>}
            </tbody>
        </table>
      </div>

      <ModalSPKSetting isOpen={showModal} onClose={() => setShowModal(false)} periode={getPeriodeString()} onSuccess={fetchData} />
    </div>
  );
};

export default ManajemenSPK;