import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone'; 
import axios from 'axios';
import Swal from 'sweetalert2'; 
import * as XLSX from 'xlsx'; 
import { 
  FaDownload, 
  FaFileUpload, 
  FaPlus, 
  FaChevronDown, 
  FaUsers, 
  FaArrowRight,
  FaClipboardList,
  FaEdit,   
  FaTrash,
  FaSearch, 
  FaFilter,
  FaPaperPlane,
  FaTimes,
  FaExclamationCircle,
  FaCheck,
  FaArrowLeft,
  FaExclamationTriangle
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';
const getToken = () => localStorage.getItem('token');

const Perencanaan = () => {
  const navigate = useNavigate();

  // --- STATE DATA ---
  const [allPerencanaan, setAllPerencanaan] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE INCOME & LIMIT ---
  const [incomeStats, setIncomeStats] = useState({}); 
  const [limitMap, setLimitMap] = useState({});       

  // --- STATE FILTER & SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // --- STATE UI ---
  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [membersCache, setMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  // --- STATE MODAL IMPORT ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview'
  const [previewData, setPreviewData] = useState([]);
  const [importWarnings, setImportWarnings] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper Format
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // 1. Fetch Data Utama
  const fetchPerencanaan = async () => {
    setIsLoading(true);
    try {
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resPerencanaan, resKelompok, resHonor, resAturan] = await Promise.all([
            axios.get(`${API_URL}/api/perencanaan`, config),
            axios.get(`${API_URL}/api/kelompok-perencanaan`, config),
            axios.get(`${API_URL}/api/honorarium`, config),
            axios.get(`${API_URL}/api/aturan-periode`, config)
        ]);
        
        const perencanaanData = resPerencanaan.data.data;
        setAllPerencanaan(perencanaanData); 

        // Mapping Honor
        const honorMap = {};
        if(resHonor.data.data) {
            resHonor.data.data.forEach(h => {
                honorMap[`${h.id_subkegiatan}-${h.kode_jabatan}`] = Number(h.tarif);
            });
        }

        // Mapping Tanggal
        const planMap = {};
        perencanaanData.forEach(p => {
            if (p.tanggal_mulai) {
                const d = new Date(p.tanggal_mulai);
                planMap[p.id_perencanaan] = {
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    subId: p.id_subkegiatan
                };
            }
        });

        // Mapping Limit
        const limits = {};
        if (resAturan.data.data) {
            resAturan.data.data.forEach(a => {
                const y = a.tahun || a.periode; 
                limits[y] = Number(a.batas_honor);
            });
        }
        setLimitMap(limits);

        // Calculate Income Stats
        const stats = {};
        const rawKelompok = resKelompok.data.data || resKelompok.data;
        const membersMap = {}; 

        if (Array.isArray(rawKelompok)) {
            rawKelompok.forEach(member => {
                const cleanMember = {
                    ...member,
                    nama_lengkap: member.nama_lengkap || member.nama_mitra, 
                };
                const pId = member.id_perencanaan;
                if (!membersMap[pId]) membersMap[pId] = [];
                membersMap[pId].push(cleanMember);

                const planInfo = planMap[pId];
                if (planInfo) {
                    const key = `${member.id_mitra}-${planInfo.year}-${planInfo.month}`;
                    const tariff = honorMap[`${planInfo.subId}-${member.kode_jabatan}`] || 0;
                    const total = tariff * Number(member.volume_tugas || 0);
                    
                    stats[key] = (stats[key] || 0) + total;
                }
            });
        }
        
        setMembersCache(membersMap);
        setIncomeStats(stats);

    } catch (err) {
        console.error("Gagal load data:", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerencanaan();
  }, []);

  // 2. LOGIKA IMPORT
  useEffect(() => {
    if (!showImportModal) {
        setImportStep('upload');
        setPreviewData([]);
        setImportWarnings([]);
        setIsProcessing(false);
    }
  }, [showImportModal]);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsProcessing(true);
    try {
        const token = getToken();
        const res = await axios.post(`${API_URL}/api/perencanaan/preview-import`, formData, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        const { valid_data, warnings } = res.data;
        setPreviewData(valid_data || []);
        setImportWarnings(warnings || []);

        if (valid_data && valid_data.length > 0) {
            setImportStep('preview');
        } else {
            Swal.fire('Gagal', 'Tidak ada data valid yang ditemukan dalam file.', 'error');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'Gagal memproses file.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls'],
        'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleFinalImport = async () => {
    setIsProcessing(true);
    try {
        const token = getToken();
        await axios.post(`${API_URL}/api/perencanaan/store-import`, {
            data: previewData
        }, { headers: { Authorization: `Bearer ${token}` } });

        Swal.fire('Sukses', `${previewData.length} data berhasil diimport!`, 'success');
        setShowImportModal(false);
        fetchPerencanaan();
    } catch (err) {
        Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [
      { 
          "Survei/Sensus": "(SAKERNAS26-TW) SURVEI ANGKATAN KERJA NASIONAL (SAKERNAS) TAHUN 2026", 
          "Kegiatan": "UPDATING/LISTING - TRIWULAN I", 
          "sobat_id": "3373xxx", 
          "jabatan": "Petugas Pendataan Lapangan (PPL Survei)",
          "volume": 1
        },
        { 
          "Survei/Sensus": "(SAKERNAS26-TW) SURVEI ANGKATAN KERJA NASIONAL (SAKERNAS) TAHUN 2026", 
          "Kegiatan": "UPDATING/LISTING - TRIWULAN I", 
          "sobat_id": "3373xxx", 
          "jabatan": "Petugas Pemeriksaan Lapangan (PML Survei)",
          "volume": 1
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_import_perencanaan.xlsx");
  };

  // 3. FILTER & SORT
  const availableYears = useMemo(() => {
    const years = new Set();
    allPerencanaan.forEach(item => {
      if (item.tanggal_mulai) {
        const y = new Date(item.tanggal_mulai).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [allPerencanaan]);

  const groupedPerencanaan = useMemo(() => {
    const filtered = allPerencanaan.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (item.nama_kegiatan || '').toLowerCase().includes(term) ||
        (item.nama_sub_kegiatan || '').toLowerCase().includes(term) ||
        (item.nama_pengawas || '').toLowerCase().includes(term);

      let matchYear = true;
      if (filterYear) {
        if (item.tanggal_mulai) {
          const y = new Date(item.tanggal_mulai).getFullYear();
          matchYear = y.toString() === filterYear.toString();
        } else {
          matchYear = false;
        }
      }
      return matchSearch && matchYear;
    });

    return filtered.reduce((acc, item) => {
      const key = item.nama_kegiatan;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [allPerencanaan, searchTerm, filterYear]);

  const toggleRow = async (id_perencanaan) => {
    if (expandedTaskId === id_perencanaan) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(id_perencanaan);

    if (!membersCache[id_perencanaan]) {
      setLoadingMembers(true);
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/api/perencanaan/${id_perencanaan}/anggota`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMembersCache(prev => ({ ...prev, [id_perencanaan]: res.data }));
      } catch (err) {
        setMembersCache(prev => ({ ...prev, [id_perencanaan]: [] }));
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // ACTIONS
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Hapus Perencanaan?',
      text: "Data anggota dan plotting mitra di dalamnya akan ikut terhapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        await axios.delete(`${API_URL}/api/perencanaan/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Terhapus!', 'Perencanaan berhasil dihapus.', 'success');
        fetchPerencanaan();
      } catch (err) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  const handleEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/admin/perencanaan/edit/${id}`);
  };

  const handleForwardToPenugasan = async (e, idsArray, title) => {
    e.stopPropagation();

    let warningMessages = [];
    
    idsArray.forEach(id => {
        const plan = allPerencanaan.find(p => p.id_perencanaan === id);
        if (!plan) return;

        // Validasi Volume
        if (plan.total_alokasi > plan.target_volume) {
            warningMessages.push(`⚠️ <b>${plan.nama_sub_kegiatan}</b>: Volume melebihi target (${plan.total_alokasi}/${plan.target_volume}).`);
        } else if (plan.total_alokasi < plan.target_volume) {
            warningMessages.push(`⚠️ <b>${plan.nama_sub_kegiatan}</b>: Volume belum terpenuhi (${plan.total_alokasi}/${plan.target_volume}).`);
        }

        // Validasi Pendapatan
        const members = membersCache[id] || [];
        const taskDate = new Date(plan.tanggal_mulai);
        const y = taskDate.getFullYear();
        const m = taskDate.getMonth();
        const monthlyLimit = limitMap[y] || 0;

        if (monthlyLimit > 0) {
            members.forEach(member => {
                const key = `${member.id_mitra}-${y}-${m}`;
                const totalIncome = incomeStats[key] || 0;
                
                if (totalIncome > monthlyLimit) {
                    warningMessages.push(`⚠️ <b>${member.nama_lengkap}</b>: Pendapatan Total (${formatRupiah(totalIncome)}) melebihi batas.`);
                } 
            });
        }
    });

    if (warningMessages.length > 0) {
        const uniqueWarnings = [...new Set(warningMessages)];
        const confirmResult = await Swal.fire({
            title: 'Peringatan Batas/Volume',
            html: `
                <div style="text-align:left; font-size:13px; max-height:200px; overflow-y:auto;">
                    Beberapa data melebihi target atau batas honor:<br/><br/>
                    ${uniqueWarnings.join('<br/>')}
                    <br/><br/>
                    <b>Apakah Anda ingin tetap meneruskan data ini?</b>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b', 
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Tetap Teruskan',
            cancelButtonText: 'Batal'
        });

        if (!confirmResult.isConfirmed) return;
    } else {
        const finalConfirm = await Swal.fire({
            title: 'Teruskan ke Penugasan?',
            html: `Anda akan menyalin data perencanaan <b>${title}</b> ke menu Penugasan.<br/>Data Perencanaan asli tidak akan berubah.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1A2A80',
            confirmButtonText: 'Ya, Teruskan'
        });
        if (!finalConfirm.isConfirmed) return;
    }

    try {
      const token = getToken();
      const response = await axios.post(`${API_URL}/api/penugasan/import-perencanaan`, {
          ids_perencanaan: idsArray
      }, { headers: { Authorization: `Bearer ${token}` } });

      Swal.fire({
          title: 'Berhasil!',
          text: response.data.message,
          icon: 'success'
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal meneruskan data.', 'error');
    }
  };

  if (isLoading) return <div className="text-center py-10 text-gray-500">Memuat data Perencanaan...</div>;

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">
          Kelola tim dan alokasi mitra untuk setiap kegiatan.
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm">
            <FaDownload /> Template Excel
          </button>
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaFileUpload /> Import Excel
          </button>
          <Link to="/admin/perencanaan/tambah" className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaPlus /> Buat Manual
          </Link>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-1/2">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Survei, Kegiatan, atau pengawas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm transition bg-gray-50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-bold"><FaFilter /> Tahun:</div>
            <select
               className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm bg-white cursor-pointer"
               value={filterYear}
               onChange={(e) => setFilterYear(e.target.value)}
            >
               <option value="">Semua</option>
               {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
         </div>
      </div>

      {/* LIST DATA */}
      <div className="space-y-6">
        {Object.keys(groupedPerencanaan).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
            {searchTerm || filterYear ? 'Tidak ditemukan data yang sesuai filter.' : 'Belum ada data Perencanaan. Silakan import atau buat baru.'}
          </div>
        ) : (
          Object.entries(groupedPerencanaan).map(([kegiatanName, subItems]) => (
            <div key={kegiatanName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <span className="text-[#1A2A80]"><FaClipboardList size={18} /></span>
                    <h2 className="text-lg font-bold text-gray-800">{kegiatanName}</h2>
                    <span className="text-xs font-medium bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                        {subItems.length} Tim
                    </span>
                 </div>
                 <button 
                    onClick={(e) => handleForwardToPenugasan(e, subItems.map(i => i.id_perencanaan), `Semua Tim ${kegiatanName}`)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition shadow-sm"
                 >
                    <FaPaperPlane /> Teruskan Semua
                 </button>
              </div>

              <div className="divide-y divide-gray-100">
                {subItems.map((task) => {
                  const isOpen = expandedTaskId === task.id_perencanaan;
                  const members = membersCache[task.id_perencanaan] || [];
                  const membersCount = members.length;
                  
                  const realisasi = task.total_alokasi || 0;
                  const target = task.target_volume || 0;
                  const percentageVolume = target > 0 ? Math.round((realisasi / target) * 100) : 0;
                  let barColorVolume = "bg-blue-600";
                  if (percentageVolume > 100) barColorVolume = "bg-red-500";
                  else if (percentageVolume === 100) barColorVolume = "bg-green-500";

                  const taskDate = new Date(task.tanggal_mulai);
                  const taskYear = taskDate.getFullYear();
                  const taskMonth = taskDate.getMonth();
                  const monthlyLimit = limitMap[taskYear] || 0;

                  return (
                    <div key={task.id_perencanaan} className="group">
                      <div 
                        onClick={() => toggleRow(task.id_perencanaan)} 
                        className={`px-6 py-4 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isOpen ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className={`p-1 rounded-full transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#1A2A80] bg-blue-100' : 'text-gray-400'}`}>
                                <FaChevronDown size={10} />
                            </div>
                            <h3 className={`font-bold text-sm ${isOpen ? 'text-[#1A2A80]' : 'text-gray-700'}`}>
                                {task.nama_sub_kegiatan}
                            </h3>
                          </div>
                          
                          <div className="pl-7 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              📅 {formatDate(task.tanggal_mulai)} - {formatDate(task.tanggal_selesai)}
                            </span>
                            <span className="flex items-center gap-1">
                              👤 Pengawas: <span className="font-medium text-gray-700">{task.nama_pengawas}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 min-w-fit">
                            <div className="text-xs font-medium text-gray-400 group-hover:text-[#1A2A80] transition-colors flex items-center gap-2">
                                <FaUsers /> {membersCount} Anggota
                            </div>
                            <div className="flex items-center gap-1 border-l pl-4 border-gray-200">
                                <button 
                                    onClick={(e) => handleForwardToPenugasan(e, [task.id_perencanaan], task.nama_sub_kegiatan)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition" 
                                    title="Teruskan ke Penugasan"
                                >
                                    <FaPaperPlane size={14} />
                                </button>
                                <button onClick={(e) => handleEdit(e, task.id_perencanaan)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition"><FaEdit size={14} /></button>
                                <button onClick={(e) => handleDelete(e, task.id_perencanaan)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"><FaTrash size={14} /></button>
                            </div>
                        </div>
                      </div>
                      
                      {isOpen && (
                        <div className="bg-gray-50/30 px-6 py-5 border-t border-gray-100 text-sm animate-fade-in-down pl-6 sm:pl-14">
                           
                           <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Progres Volume Kegiatan</h4>
                                        <p className="text-[10px] text-gray-400">Realisasi penugasan vs Target Subkegiatan.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${percentageVolume > 100 ? 'text-red-500' : 'text-[#1A2A80]'}`}>
                                            {realisasi} / {target}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">({percentageVolume}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-500 ${barColorVolume}`} 
                                        style={{ width: `${Math.min(percentageVolume, 100)}%` }}
                                    ></div>
                                </div>
                           </div>
                           
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Anggota Tim & Status Honor Bulanan:</h4>
                                <Link 
                                    to={`/admin/perencanaan/detail/${task.id_perencanaan}`} 
                                    className="text-[#1A2A80] font-bold text-xs hover:underline flex items-center gap-1 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm hover:bg-blue-50 transition"
                                >
                                    Kelola Tim & Print SPK <FaArrowRight size={10} />
                                </Link>
                           </div>

                           {loadingMembers ? (
                             <p className="text-gray-400 italic text-center py-4">Memuat data anggota...</p>
                           ) : (
                             members.length === 0 ? (
                               <div className="text-center py-6 bg-white rounded border border-dashed border-gray-200 text-gray-400 text-xs">
                                 Belum ada anggota di tim ini.
                               </div>
                             ) : (
                               <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                 {members.map((m, idx) => {
                                    const incomeKey = `${m.id_mitra}-${taskYear}-${taskMonth}`;
                                    const totalMonthlyIncome = incomeStats[incomeKey] || 0;
                                    const percentageIncome = monthlyLimit > 0 ? (totalMonthlyIncome / monthlyLimit) * 100 : 0;
                                    const isOverIncome = monthlyLimit > 0 && totalMonthlyIncome > monthlyLimit;
                                    
                                    return (
                                      <li key={m.id_mitra || idx} className="bg-white px-3 py-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                                        
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold mt-1 shrink-0">
                                                {m.nama_lengkap ? m.nama_lengkap.charAt(0) : '?'}
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <div className="flex justify-between items-center w-full">
                                                    <p className="text-gray-700 font-bold text-xs truncate">
                                                        {m.nama_lengkap || m.nama_mitra}
                                                    </p>
                                                    {m.volume_tugas > 0 && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">
                                                            Vol: {m.volume_tugas}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 truncate">{m.nama_jabatan || '-'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-2 border-t border-gray-100 pt-2">
                                            <div className="flex justify-between items-end text-[10px] mb-1">
                                                <span className="text-gray-500 font-medium">Total Honor (Bulan Ini):</span>
                                                <span className={`font-bold ${isOverIncome ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {formatRupiah(totalMonthlyIncome)}
                                                </span>
                                            </div>
                                            
                                            {monthlyLimit > 0 ? (
                                                <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden" title={`Batas: ${formatRupiah(monthlyLimit)}`}>
                                                    <div 
                                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverIncome ? 'bg-red-500' : (percentageIncome > 80 ? 'bg-yellow-400' : 'bg-green-500')}`}
                                                        style={{ width: `${Math.min(percentageIncome, 100)}%` }}
                                                    ></div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-300 italic">Limit belum diset</div>
                                            )}

                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[9px] text-gray-400">Limit: {formatRupiah(monthlyLimit)}</span>
                                                {isOverIncome && (
                                                    <span className="flex items-center gap-1 text-[9px] text-red-500 font-bold">
                                                        <FaExclamationCircle /> Over
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                      </li>
                                    );
                                 })}
                               </ul>
                             )
                           )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-down">
                
                <div className="bg-[#1A2A80] p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg">
                        {importStep === 'upload' ? 'Upload File Perencanaan' : 'Preview Data Import'}
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="hover:text-red-300"><FaTimes /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    
                    {importStep === 'upload' && (
                        <div 
                            {...getRootProps()} 
                            className={`border-3 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all
                                ${isDragActive ? 'border-green-500 bg-green-50 scale-95' : 'border-gray-300 hover:border-[#1A2A80] hover:bg-blue-50'}
                            `}
                        >
                            <input {...getInputProps()} />
                            <FaFileUpload className={`text-5xl mb-4 ${isDragActive ? 'text-green-500' : 'text-gray-400'}`} />
                            {isProcessing ? (
                                <p className="text-gray-600 font-bold animate-pulse">Sedang memproses file...</p>
                            ) : (
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-700">Tarik & Lepas file Excel di sini</p>
                                    <p className="text-sm text-gray-500 mt-1">atau klik untuk memilih file</p>
                                    <p className="text-xs text-gray-400 mt-4">Format: .xlsx, .xls, .csv</p>
                                </div>
                            )}
                        </div>
                    )}

                    {importStep === 'preview' && (
                        <div className="space-y-4">
                            {importWarnings.length > 0 && (
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-sm text-amber-800 mb-4 max-h-32 overflow-y-auto">
                                    <div className="font-bold flex items-center gap-2 mb-1">
                                        <FaExclamationTriangle /> {importWarnings.length} Baris Data Dilewati:
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-700">Preview Data ({previewData.length} Baris)</span>
                                <button 
                                    onClick={() => { setImportStep('upload'); setPreviewData([]); }}
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <FaArrowLeft /> Upload Ulang
                                </button>
                            </div>

                            <div className="border rounded-lg overflow-hidden bg-white">
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="min-w-full text-xs text-left">
                                        {/* --- HEADER DIPISAH SESUAI PERMINTAAN --- */}
                                        <thead className="bg-gray-100 font-bold text-gray-700 uppercase sticky top-0 shadow-sm z-10">
                                            <tr>
                                                <th className="px-4 py-3">Survei/Sensus</th>
                                                <th className="px-4 py-3">Kegiatan</th>
                                                <th className="px-4 py-3">Mitra (Jabatan)</th>
                                                <th className="px-4 py-3 text-center">Simulasi Volume</th>
                                                <th className="px-4 py-3 text-center">Simulasi Honor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {previewData.map((row, idx) => {
                                                const s = row.stats;
                                                
                                                // -- CALC VOLUME --
                                                const totalVol = s.existing_vol + row.volume;
                                                const pctExistVol = s.target_vol > 0 ? (s.existing_vol / s.target_vol) * 100 : 0;
                                                const pctNewVol = s.target_vol > 0 ? (row.volume / s.target_vol) * 100 : 0;
                                                const isVolOver = totalVol > s.target_vol;

                                                // -- CALC INCOME --
                                                const totalInc = s.existing_income + s.new_income;
                                                const pctExistInc = s.limit_honor > 0 ? (s.existing_income / s.limit_honor) * 100 : 0;
                                                const pctNewInc = s.limit_honor > 0 ? (s.new_income / s.limit_honor) * 100 : 0;
                                                const isIncOver = s.limit_honor > 0 && totalInc > s.limit_honor;

                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        
                                                        {/* KOLOM SURVEI/SENSUS (PISAH) */}
                                                        <td className="px-4 py-2">
                                                            <div className="font-bold text-gray-800 truncate max-w-[200px]" title={row.nama_kegiatan}>
                                                                {row.nama_kegiatan}
                                                            </div>
                                                        </td>

                                                        {/* KOLOM KEGIATAN (PISAH) */}
                                                        <td className="px-4 py-2">
                                                            <div className="font-bold text-gray-700 truncate max-w-[200px]" title={row.nama_sub_kegiatan}>
                                                                {row.nama_sub_kegiatan}
                                                            </div>
                                                        </td>

                                                        {/* INFO MITRA */}
                                                        <td className="px-4 py-2">
                                                            <div className="font-bold text-gray-700 font-mono">{row.sobat_id}</div>
                                                            <div className="text-[10px] text-gray-500">
                                                                {row.nama_jabatan} ({row.volume} Unit)
                                                            </div>
                                                        </td>

                                                        {/* BAR VOLUME */}
                                                        <td className="px-4 py-2 align-middle">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span>
                                                                    Real: <b>{s.existing_vol}</b> + <span className="text-blue-600 font-bold">{row.volume}</span>
                                                                </span>
                                                                <span className={isVolOver ? "text-red-600 font-bold" : "text-gray-500"}>
                                                                    Target: {s.target_vol}
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-200 rounded-full flex overflow-hidden">
                                                                <div style={{ width: `${Math.min(pctExistVol, 100)}%` }} className="bg-gray-400 h-full"></div>
                                                                <div 
                                                                    style={{ width: `${Math.min(pctNewVol, 100 - Math.min(pctExistVol, 100))}%` }} 
                                                                    className={`h-full ${isVolOver ? 'bg-red-500' : 'bg-blue-500'} relative`}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                                                                </div>
                                                            </div>
                                                            {isVolOver && <div className="text-[9px] text-red-500 mt-1 font-bold text-center">Over Target!</div>}
                                                        </td>

                                                        {/* BAR INCOME DENGAN LABEL LIMIT */}
                                                        <td className="px-4 py-2 align-middle">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span>
                                                                    Total: <b>{formatRupiah(totalInc)}</b>
                                                                </span>
                                                                <span className="text-gray-400">
                                                                    Limit: {s.limit_honor > 0 ? formatRupiah(s.limit_honor) : '-'}
                                                                </span>
                                                            </div>
                                                            {s.limit_honor > 0 ? (
                                                                <>
                                                                    <div className="w-full h-2 bg-gray-200 rounded-full flex overflow-hidden">
                                                                        <div style={{ width: `${Math.min(pctExistInc, 100)}%` }} className="bg-green-600 h-full"></div>
                                                                        <div 
                                                                            style={{ width: `${Math.min(pctNewInc, 100 - Math.min(pctExistInc, 100))}%` }} 
                                                                            className={`h-full ${isIncOver ? 'bg-red-500' : 'bg-green-400'} relative`}
                                                                        >
                                                                            <div className="absolute inset-0 bg-white/20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                                                                        </div>
                                                                    </div>
                                                                    {isIncOver && <div className="text-[9px] text-red-500 mt-1 font-bold text-center">Melebihi Batas!</div>}
                                                                </>
                                                            ) : (
                                                                <div className="text-[10px] text-gray-400 italic text-center">Tanpa Limit</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button 
                        onClick={() => setShowImportModal(false)} 
                        className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition"
                    >
                        Batal
                    </button>
                    
                    {importStep === 'preview' && (
                        <button 
                            onClick={handleFinalImport}
                            disabled={isProcessing || previewData.length === 0}
                            className="bg-[#1A2A80] hover:bg-blue-900 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? 'Menyimpan...' : <><FaCheck /> Proses Import</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Perencanaan;