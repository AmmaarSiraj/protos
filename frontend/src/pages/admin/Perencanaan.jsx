import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2'; 
import * as XLSX from 'xlsx'; // Import library xlsx
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
  FaMoneyBillWave,
  FaExclamationCircle,
  FaPaperPlane,
  FaTimes
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
        // Menggunakan endpoint preview-import yang sudah diperbaiki di controller
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
    navigate('/admin/perencanaan/tambah', { 
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
    navigate(`/admin/perencanaan/edit/${id}`);
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

  // --- PERUBAHAN DI SINI: Menggunakan XLSX ---
  const handleDownloadTemplate = () => {
    // Data dummy untuk template
    const rows = [
      { 
        sobat_id: "337322040034", 
        nama_lengkap: "Trian Yunita Hestiarini", 
        posisi: "Petugas Pendataan Lapangan (PPL Survei)" 
      },
      { 
        sobat_id: "337322040036", 
        nama_lengkap: "TRIYANI WIDYASTUTI", 
        posisi: "Petugas Pemeriksaan Lapangan (PML Survei)" 
      }
    ];

    // Membuat worksheet dan workbook
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Download file .xlsx
    XLSX.writeFile(workbook, "template_import_perencanaan.xlsx");
  };
  // ------------------------------------------

  if (isLoading) return <div className="text-center py-10 text-gray-500">Memuat data Perencanaan...</div>;

  return (
    <div className="w-full">
      {/* --- HEADER ACTIONS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">
          Kelola tim dan alokasi mitra untuk setiap kegiatan.
        </div>
        <div className="flex gap-2">
          {/* Tombol telah diupdate labelnya */}
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm">
            <FaDownload /> Template Excel
          </button>
          {/* TOMBOL IMPORT MEMBUKA MODAL */}
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaFileUpload /> Import Excel
          </button>
          <Link to="/admin/perencanaan/tambah" className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaPlus /> Buat Manual
          </Link>
        </div>
      </div>

      {/* --- FILTER SECTION --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-1/2">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Survei/Sensus, Kegiatan, atau pengawas..."
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

      {/* --- LIST Perencanaan --- */}
      <div className="space-y-6">
        {Object.keys(groupedPerencanaan).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
            {searchTerm || filterYear ? 'Tidak ditemukan data yang sesuai filter.' : 'Belum ada data Perencanaan. Silakan import atau buat baru.'}
          </div>
        ) : (
          Object.entries(groupedPerencanaan).map(([kegiatanName, subItems]) => (
            <div key={kegiatanName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* HEADER GRUP */}
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <span className="text-[#1A2A80]"><FaClipboardList size={18} /></span>
                    <h2 className="text-lg font-bold text-gray-800">{kegiatanName}</h2>
                    <span className="text-xs font-medium bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                        {subItems.length} Tim
                    </span>
                 </div>

                 {/* TOMBOL TERUSKAN SATU GRUP */}
                 <button 
                    onClick={(e) => handleForwardToPenugasan(e, subItems.map(i => i.id_perencanaan), `Semua Tim ${kegiatanName}`)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition shadow-sm"
                    title="Teruskan semua kegiatan ini ke Penugasan"
                 >
                    <FaPaperPlane /> Teruskan Semua
                 </button>
              </div>

              {/* LIST SUB KEGIATAN */}
              <div className="divide-y divide-gray-100">
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
                    <div key={task.id_perencanaan} className="group">
                      
                      {/* Baris Utama */}
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
                                
                                {/* TOMBOL TERUSKAN PER ITEM */}
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
                      
                      {/* Konten Detail */}
                      {isOpen && (
                        <div className="bg-gray-50/30 px-6 py-5 border-t border-gray-100 text-sm animate-fade-in-down pl-6 sm:pl-14">
                           
                           {/* PROGRESS BAR 1: VOLUME TUGAS */}
                           <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Progres Penugasan</h4>
                                        <p className="text-[10px] text-gray-400">Total volume tugas anggota vs Target Subkegiatan.</p>
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
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Anggota Tim:</h4>
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
                                    // LOGIC HITUNG INCOME & STATUS BATAS
                                    const incomeKey = `${m.id_mitra}-${taskYear}-${taskMonth}`;
                                    const totalMonthlyIncome = incomeStats[incomeKey] || 0;
                                    const percentageIncome = monthlyLimit > 0 ? (totalMonthlyIncome / monthlyLimit) * 100 : 0;
                                    const isOverIncome = monthlyLimit > 0 && totalMonthlyIncome > monthlyLimit;
                                    
                                    return (
                                      <li key={m.id_mitra || idx} className="bg-white px-3 py-3 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold mt-1">
                                                {m.nama_lengkap ? m.nama_lengkap.charAt(0) : '?'}
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <div className="flex justify-between items-center w-full">
                                                    <p className="text-gray-700 font-bold text-xs truncate">
                                                        {m.nama_lengkap || m.nama_mitra}
                                                    </p>
                                                    {m.volume_tugas > 0 && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">
                                                            Jumlah Tugas: {m.volume_tugas}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 truncate">{m.nama_jabatan || '-'}</p>
                                            </div>
                                        </div>

                                        {/* PROGRESS BAR 2: PENDAPATAN MITRA */}
                                        <div className="mt-2 border-t border-gray-100 pt-2">
                                            <div className="flex justify-between items-end text-[10px] mb-1">
                                                <span className="text-gray-500 font-medium">Pendapatan Bulan Ini:</span>
                                                <span className={`font-bold ${isOverIncome ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {formatRupiah(totalMonthlyIncome)}
                                                </span>
                                            </div>
                                            
                                            {monthlyLimit > 0 ? (
                                                <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverIncome ? 'bg-red-500' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(percentageIncome, 100)}%` }}
                                                    ></div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-300 italic">Batas honor belum diset</div>
                                            )}

                                            {monthlyLimit > 0 && (
                                                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                                                    <span>0</span>
                                                    <span>Limit: {formatRupiah(monthlyLimit)}</span>
                                                </div>
                                            )}

                                            {isOverIncome && (
                                                <div className="mt-1 flex items-center gap-1 text-[9px] text-red-500 font-bold">
                                                    <FaExclamationCircle /> Melebihi Batas!
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
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-down">
                <div className="bg-[#1A2A80] p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold">Import Data Perencanaan</h3>
                    <button onClick={() => setShowImportModal(false)} className="hover:text-red-300"><FaTimes /></button>
                </div>

                <div className="p-6 space-y-4">
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Survei/Sensus (Induk)</label>
                        <select 
                            className="w-full border rounded p-2 text-sm"
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
                        <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Kegiatan</label>
                        <select 
                            className="w-full border rounded p-2 text-sm"
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

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition relative">
                        <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls"
                            onChange={(e) => setImportFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2 pointer-events-none">
                            <FaFileUpload className="mx-auto text-gray-400 text-3xl" />
                            {importFile ? (
                                <p className="text-sm font-bold text-green-600">{importFile.name}</p>
                            ) : (
                                <p className="text-sm text-gray-500">Klik atau tarik file Excel/CSV ke sini</p>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-200 text-sm">Batal</button>
                    <button 
                        onClick={handleProcessImport} 
                        disabled={isPreviewing || !selectedSubId || !importFile}
                        className="px-4 py-2 rounded bg-[#1A2A80] text-white hover:bg-blue-900 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPreviewing && <span className="animate-spin">↻</span>}
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