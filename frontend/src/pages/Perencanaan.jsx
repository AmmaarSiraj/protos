// src/pages/Perencanaan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FaExclamationCircle,
  FaPaperPlane,
  FaTimes,
  FaBriefcase,
  FaCalendarAlt,
  FaChartPie
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';
const getToken = () => localStorage.getItem('token');

const Perencanaan = () => {
  const navigate = useNavigate();

  // --- STATE DATA ---
  const [allPerencanaan, setAllPerencanaan] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE INCOME & LIMIT (Untuk Progress Bar) ---
  const [incomeStats, setIncomeStats] = useState({}); // Map: "mitraId-Year-Month" -> TotalIncome
  const [limitMap, setLimitMap] = useState({});       // Map: "Year" -> Limit

  // --- STATE FILTER & SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // --- STATE DROPDOWN & CACHE ---
  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [membersCache, setMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  // --- STATE MODAL IMPORT ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importKegiatanList, setImportKegiatanList] = useState([]);
  const [importSubList, setImportSubList] = useState([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Helper Format Tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Helper Format Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // 1. Fetch Data Lengkap & Kalkulasi
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

        // --- PREPARE CALCULATION MAPS ---
        
        // A. Honor Map
        const honorMap = {};
        if(resHonor.data.data) {
            resHonor.data.data.forEach(h => {
                honorMap[`${h.id_subkegiatan}-${h.kode_jabatan}`] = Number(h.tarif);
            });
        }

        // B. Plan Date Map
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

        // C. Limit Map
        const limits = {};
        if (resAturan.data.data) {
            resAturan.data.data.forEach(a => {
                const y = a.tahun || a.periode; 
                limits[y] = Number(a.batas_honor);
            });
        }
        setLimitMap(limits);

        // D. Calculate Income Stats
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

  // 2. LOGIKA IMPORT (MODAL)
  useEffect(() => {
    if (showImportModal) {
      axios.get(`${API_URL}/api/kegiatan`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(res => setImportKegiatanList(res.data.data || res.data))
        .catch(err => console.error(err));
    }
  }, [showImportModal]);

  const handleKegiatanChange = async (e) => {
    const kId = e.target.value;
    setSelectedKegiatanId(kId);
    setSelectedSubId('');
    setImportSubList([]);
    
    if (kId) {
        try {
            const res = await axios.get(`${API_URL}/api/subkegiatan/kegiatan/${kId}`, { 
                headers: { Authorization: `Bearer ${getToken()}` } 
            });
            setImportSubList(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        }
    }
  };

  const handleProcessImport = async () => {
    if (!selectedSubId || !importFile) {
        Swal.fire('Error', 'Pilih kegiatan dan file terlebih dahulu!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('id_subkegiatan', selectedSubId);

    setIsPreviewing(true);
    try {
        const token = getToken();
        const res = await axios.post(`${API_URL}/api/perencanaan/preview-import`, formData, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}` 
            }
        });

        const { valid_data, warnings, subkegiatan } = res.data;

        setShowImportModal(false);

        if (warnings.length > 0) {
            await Swal.fire({
                title: 'Peringatan Validasi Import',
                html: `
                    <div style="text-align:left; max-height: 200px; overflow-y:auto; font-size:12px;">
                        <p class="font-bold mb-2 text-red-600">${warnings.length} Baris Data Ditolak:</p>
                        <ul class="list-disc pl-4 text-gray-700">
                            ${warnings.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                        <p class="mt-4 font-bold text-green-600">
                            ${valid_data.length} data valid siap diproses. Lanjutkan?
                        </p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Lanjutkan',
                cancelButtonText: 'Batal',
                width: '600px'
            }).then((result) => {
                if (result.isConfirmed && valid_data.length > 0) {
                    goToTambahPerencanaan(subkegiatan, valid_data);
                }
            });
        } else {
            if (valid_data.length > 0) {
                goToTambahPerencanaan(subkegiatan, valid_data);
            } else {
                Swal.fire('Info', 'Tidak ada data valid yang ditemukan dalam file.', 'info');
            }
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan saat memproses file.', 'error');
    } finally {
        setIsPreviewing(false);
    }
  };

  const goToTambahPerencanaan = (subkegiatanData, importedMembers) => {
    navigate('/perencanaan/tambah', { 
        state: {
            preSelectedSubKegiatan: subkegiatanData,
            importedMembers: importedMembers
        }
    });
  };

  // 3. LOGIKA FILTER & SORT
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

  // --- ACTIONS (EDIT/DELETE) ---
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
    navigate(`/perencanaan/edit/${id}`);
  };

  const handleForwardToPenugasan = async (e, idsArray, title) => {
    e.stopPropagation();

    // 1. VALIDASI: Cek Over Limit (Error) & Under Limit (Warning)
    let errorMessages = [];
    let warningMessages = [];

    idsArray.forEach(id => {
        const plan = allPerencanaan.find(p => p.id_perencanaan === id);
        if (!plan) return;

        // A. Validasi Volume Tugas Subkegiatan
        if (plan.total_alokasi > plan.target_volume) {
            errorMessages.push(`❌ <b>${plan.nama_sub_kegiatan}</b>: Volume melebihi target (${plan.total_alokasi}/${plan.target_volume}).`);
        } else if (plan.total_alokasi < plan.target_volume) {
            warningMessages.push(`⚠️ <b>${plan.nama_sub_kegiatan}</b>: Volume belum terpenuhi (${plan.total_alokasi}/${plan.target_volume}).`);
        }

        // B. Validasi Pendapatan Mitra
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
                    errorMessages.push(`❌ <b>${member.nama_lengkap}</b>: Pendapatan (${formatRupiah(totalIncome)}) melebihi batas.`);
                } 
            });
        }
    });

    // 2. JIKA ADA ERROR (BLOCKER)
    if (errorMessages.length > 0) {
        const uniqueErrors = [...new Set(errorMessages)];
        return Swal.fire({
            title: 'Tidak Bisa Meneruskan',
            html: `<div style="text-align:left; font-size:13px;">Terdapat pelanggaran batas:<br/><br/>${uniqueErrors.join('<br/>')}</div>`,
            icon: 'error',
            confirmButtonText: 'Perbaiki Dulu'
        });
    }

    // 3. JIKA ADA WARNING (KONFIRMASI)
    if (warningMessages.length > 0) {
        const uniqueWarnings = [...new Set(warningMessages)];
        const confirmResult = await Swal.fire({
            title: 'Peringatan: Belum Sempurna',
            html: `<div style="text-align:left; font-size:13px;">Data belum mencapai target/batas:<br/><br/>${uniqueWarnings.join('<br/>')}<br/><br/><b>Apakah Anda yakin tetap ingin meneruskan?</b></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b', 
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Teruskan Saja',
            cancelButtonText: 'Batal'
        });

        if (!confirmResult.isConfirmed) return;
    }

    // 4. JIKA LOLOS
    if (warningMessages.length === 0) {
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
      const msg = err.response?.data?.message || 'Gagal meneruskan data.';
      Swal.fire('Gagal', msg, 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [
      { sobat_id: "337322040034", nama_lengkap: "Contoh Nama Mitra", posisi: "Petugas Pendataan Lapangan (PPL Survei)" },
      { sobat_id: "337322040036", nama_lengkap: "Contoh Mitra Dua", posisi: "Petugas Pemeriksaan Lapangan (PML Survei)" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_import_perencanaan.xlsx");
  };

  // --- LOADING STATE ---
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat data perencanaan...</p>
    </div>
  );

  return (
    // Container disesuaikan dengan Layout (max-w-7xl)
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* === HEADER SECTION === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                    <FaChartPie size={24} />
                  </div>
                  Perencanaan Tim
               </h1>
               <p className="text-gray-500 mt-2 ml-1">
                  Kelola alokasi mitra, estimasi honor, dan validasi beban kerja.
               </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
               <button 
                 onClick={handleDownloadTemplate} 
                 className="group inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#1A2A80] hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm text-sm font-bold"
               >
                  <FaDownload className="text-gray-400 group-hover:text-[#1A2A80]" /> 
                  <span className="hidden sm:inline">Template</span>
               </button>
               
               <button 
                 onClick={() => setShowImportModal(true)} 
                 className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-xl transition-all text-sm font-bold"
               >
                  <FaFileUpload /> Import
               </button>
               
               <Link 
                 to="/perencanaan/tambah" 
                 className="inline-flex items-center gap-2 px-5 py-2 bg-[#1A2A80] hover:bg-blue-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
               >
                  <FaPlus /> Buat Manual
               </Link>
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* === FILTER & SEARCH BAR === */}
          <div className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-grow">
                <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari Survei/Sensus, Kegiatan, atau Pengawas..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             <div className="relative min-w-[150px]">
                <FaFilter className="absolute left-4 top-3.5 text-gray-400" />
                <select
                   className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 cursor-pointer appearance-none"
                   value={filterYear}
                   onChange={(e) => setFilterYear(e.target.value)}
                >
                   <option value="">Semua Tahun</option>
                   {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none" />
             </div>
          </div>
      </div>

      {/* --- LIST Perencanaan --- */}
      <div className="space-y-6">
        {Object.keys(groupedPerencanaan).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaClipboardList className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
               {searchTerm || filterYear ? 'Tidak ditemukan data yang sesuai filter.' : 'Belum ada data perencanaan. Silakan import atau buat baru.'}
            </p>
          </div>
        ) : (
          Object.entries(groupedPerencanaan).map(([kegiatanName, subItems]) => (
            <div key={kegiatanName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
              
              {/* HEADER GRUP */}
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-gray-200 rounded-lg text-[#1A2A80] shadow-sm">
                        <FaBriefcase size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{kegiatanName}</h2>
                        <span className="text-xs text-gray-500 font-medium">
                            {subItems.length} Tim Terbentuk
                        </span>
                    </div>
                 </div>

                 {/* TOMBOL TERUSKAN SATU GRUP */}
                 <button 
                    onClick={(e) => handleForwardToPenugasan(e, subItems.map(i => i.id_perencanaan), `Semua Tim ${kegiatanName}`)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition shadow-sm"
                    title="Teruskan semua kegiatan ini ke Penugasan"
                 >
                    <FaPaperPlane /> Teruskan Semua
                 </button>
              </div>

              {/* LIST SUB KEGIATAN */}
              <div className="divide-y divide-gray-50">
                {subItems.map((task) => {
                  const isOpen = expandedTaskId === task.id_perencanaan;
                  const members = membersCache[task.id_perencanaan] || [];
                  const membersCount = members.length;
                  
                  // -- Progress Bar Volume (Realisasi vs Target) --
                  const realisasi = task.total_alokasi || 0;
                  const target = task.target_volume || 0;
                  const percentageVolume = target > 0 ? Math.round((realisasi / target) * 100) : 0;
                  let barColorVolume = "bg-blue-600";
                  if (percentageVolume > 100) barColorVolume = "bg-red-500";
                  else if (percentageVolume === 100) barColorVolume = "bg-green-500";

                  // -- Data untuk Progress Bar Income --
                  const taskDate = new Date(task.tanggal_mulai);
                  const taskYear = taskDate.getFullYear();
                  const taskMonth = taskDate.getMonth();
                  const monthlyLimit = limitMap[taskYear] || 0;

                  return (
                    <div key={task.id_perencanaan} className={`group/item transition-colors ${isOpen ? 'bg-blue-50/10' : 'bg-white hover:bg-gray-50'}`}>
                      
                      {/* Baris Utama */}
                      <div 
                        onClick={() => toggleRow(task.id_perencanaan)} 
                        className="px-6 py-5 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        {/* Kiri: Info Utama */}
                        <div className="flex-1 flex items-start gap-4">
                            <div className={`mt-1 p-1.5 rounded-full transition-transform duration-300 border bg-white ${isOpen ? 'rotate-180 text-[#1A2A80] border-blue-200 shadow-sm' : 'text-gray-400 border-gray-200'}`}>
                                <FaChevronDown size={10} />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-bold text-sm transition-colors ${isOpen ? 'text-[#1A2A80]' : 'text-gray-800'}`}>
                                        {task.nama_sub_kegiatan}
                                    </h3>
                                </div>
                                
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 mt-2">
                                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                      <FaCalendarAlt className="text-gray-400" /> {formatDate(task.tanggal_mulai)} - {formatDate(task.tanggal_selesai)}
                                    </span>
                                    <span className="flex items-center gap-1.5 px-2 py-1">
                                      <span className="text-gray-400">Pengawas:</span>
                                      <span className="font-bold text-gray-700">{task.nama_pengawas}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 px-2 py-1">
                                      <FaUsers className="text-gray-400" />
                                      <span className="font-bold text-gray-700">{membersCount} Anggota</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Kanan: Actions */}
                        <div className="flex items-center gap-2 md:border-l md:pl-6 border-gray-100 self-end md:self-center">
                            
                            {/* TOMBOL TERUSKAN PER ITEM */}
                            <button 
                                onClick={(e) => handleForwardToPenugasan(e, [task.id_perencanaan], task.nama_sub_kegiatan)}
                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition shadow-sm" 
                                title="Teruskan ke Penugasan"
                            >
                                <FaPaperPlane size={14} />
                            </button>

                            <button 
                                onClick={(e) => handleEdit(e, task.id_perencanaan)} 
                                className="p-2 bg-white text-blue-500 border border-gray-200 hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-all shadow-sm"
                            >
                                <FaEdit size={14} />
                            </button>
                            
                            <button 
                                onClick={(e) => handleDelete(e, task.id_perencanaan)} 
                                className="p-2 bg-white text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                      </div>
                      
                      {/* Konten Detail */}
                      {isOpen && (
                        <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-6 pl-6 sm:pl-16 transition-all duration-300 ease-in-out">
                           
                           {/* PROGRESS BAR 1: VOLUME TUGAS */}
                           <div className="mb-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                                            <FaChartPie className="text-[#1A2A80]" /> Progres Volume
                                        </h4>
                                        <p className="text-[10px] text-gray-400">Total volume tugas vs Target Subkegiatan.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-base font-extrabold ${percentageVolume > 100 ? 'text-red-500' : 'text-[#1A2A80]'}`}>
                                            {realisasi} / {target}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1 font-medium">({percentageVolume}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-100">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${barColorVolume}`} 
                                        style={{ width: `${Math.min(percentageVolume, 100)}%` }}
                                    ></div>
                                </div>
                           </div>
                           
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Anggota Tim:</h4>
                                <Link 
                                    to={`/perencanaan/detail/${task.id_perencanaan}`} 
                                    className="text-[#1A2A80] font-bold text-xs hover:text-blue-700 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-blue-200 transition"
                                >
                                    Kelola Tim & Print SPK <FaArrowRight size={10} />
                                </Link>
                           </div>

                           {loadingMembers ? (
                             <div className="text-center py-4 flex flex-col items-center">
                                <div className="w-6 h-6 border-2 border-gray-300 border-t-[#1A2A80] rounded-full animate-spin mb-2"></div>
                                <p className="text-gray-400 text-xs italic">Memuat data anggota...</p>
                             </div>
                           ) : (
                             members.length === 0 ? (
                               <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                                 Belum ada anggota yang ditambahkan ke tim ini.
                               </div>
                             ) : (
                               <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                 {members.map((m, idx) => {
                                    // LOGIC HITUNG INCOME & STATUS BATAS
                                    const incomeKey = `${m.id_mitra}-${taskYear}-${taskMonth}`;
                                    const totalMonthlyIncome = incomeStats[incomeKey] || 0;
                                    const percentageIncome = monthlyLimit > 0 ? (totalMonthlyIncome / monthlyLimit) * 100 : 0;
                                    const isOverIncome = monthlyLimit > 0 && totalMonthlyIncome > monthlyLimit;
                                    
                                    return (
                                      <li key={m.id_mitra || idx} className="bg-white px-4 py-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1A2A80] text-xs font-extrabold shadow-inner">
                                                {m.nama_lengkap ? m.nama_lengkap.charAt(0) : '?'}
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <div className="flex justify-between items-center w-full">
                                                    <p className="text-gray-800 font-bold text-xs truncate" title={m.nama_lengkap}>
                                                        {m.nama_lengkap || m.nama_mitra}
                                                    </p>
                                                    {m.volume_tugas > 0 && (
                                                        <span className="text-[10px] font-bold bg-blue-50 text-[#1A2A80] px-1.5 py-0.5 rounded border border-blue-100">
                                                            Vol: {m.volume_tugas}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 truncate mt-0.5">{m.nama_jabatan || '-'}</p>
                                            </div>
                                        </div>

                                        {/* PROGRESS BAR 2: PENDAPATAN MITRA */}
                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                            <div className="flex justify-between items-end text-[10px] mb-1.5">
                                                <span className="text-gray-500 font-medium">Pendapatan (Bulan Ini)</span>
                                                <span className={`font-bold ${isOverIncome ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {formatRupiah(totalMonthlyIncome)}
                                                </span>
                                            </div>
                                            
                                            {monthlyLimit > 0 ? (
                                                <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                                    <div 
                                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverIncome ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(percentageIncome, 100)}%` }}
                                                    ></div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-300 italic bg-gray-50 px-2 py-1 rounded text-center">Batas honor belum diset</div>
                                            )}

                                            {monthlyLimit > 0 && (
                                                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                                                    <span>0</span>
                                                    <span className="font-medium">Max: {formatRupiah(monthlyLimit)}</span>
                                                </div>
                                            )}

                                            {isOverIncome && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 font-bold">
                                                    <FaExclamationCircle /> Melebihi Batas Honor!
                                                </div>
                                            )}
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

      {/* --- MODAL IMPORT POPUP --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="bg-[#1A2A80] px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FaFileUpload className="text-blue-200" /> Import Perencanaan
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="text-white/70 hover:text-white transition-colors">
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Survei/Sensus (Induk)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent outline-none transition"
                            value={selectedKegiatanId}
                            onChange={handleKegiatanChange}
                        >
                            <option value="">-- Pilih Kegiatan Induk --</option>
                            {importKegiatanList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama_kegiatan}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Kegiatan (Sub)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:text-gray-400"
                            value={selectedSubId}
                            onChange={(e) => setSelectedSubId(e.target.value)}
                            disabled={!selectedKegiatanId}
                        >
                            <option value="">-- Pilih Sub Kegiatan --</option>
                            {importSubList.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.nama_sub_kegiatan}</option>
                            ))}
                        </select>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-blue-50 hover:border-blue-300 transition-colors relative group">
                        <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls"
                            onChange={(e) => setImportFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="space-y-3 pointer-events-none">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-100 transition-colors">
                                <FaFileUpload className="text-gray-400 text-xl group-hover:text-[#1A2A80]" />
                            </div>
                            {importFile ? (
                                <div>
                                    <p className="text-sm font-bold text-[#1A2A80]">{importFile.name}</p>
                                    <p className="text-xs text-green-600 mt-1">File siap diunggah</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Klik atau tarik file Excel/CSV</p>
                                    <p className="text-xs text-gray-400 mt-1">Format: .xlsx, .xls, .csv</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-5 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                    <button 
                        onClick={() => setShowImportModal(false)} 
                        className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-200 text-sm font-bold transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleProcessImport} 
                        disabled={isPreviewing || !selectedSubId || !importFile}
                        className="px-5 py-2.5 rounded-xl bg-[#1A2A80] text-white hover:bg-blue-900 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all"
                    >
                        {isPreviewing && <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                        Proses & Lanjut
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Perencanaan;