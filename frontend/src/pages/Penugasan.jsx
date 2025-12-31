import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone'; // Import Dropzone
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
  FaTimes,
  FaLayerGroup,
  FaCalendarAlt,
  FaBriefcase,
  FaFileExport,
  FaCheck,
  FaArrowLeft,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaChartPie
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';
const getToken = () => localStorage.getItem('token');

const Penugasan = () => {
  const navigate = useNavigate();

  // --- STATE DATA ---
  const [allPenugasan, setAllPenugasan] = useState([]); 
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
  
  // --- STATE MODAL IMPORT BARU ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview'
  const [previewData, setPreviewData] = useState([]);
  const [importWarnings, setImportWarnings] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // --- API CALLS ---
  const fetchPenugasan = async () => {
    setIsLoading(true);
    try {
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resPenugasan, resKelompok, resHonor, resAturan] = await Promise.all([
            axios.get(`${API_URL}/api/penugasan`, config),
            axios.get(`${API_URL}/api/kelompok-penugasan`, config),
            axios.get(`${API_URL}/api/honorarium`, config),
            axios.get(`${API_URL}/api/aturan-periode`, config)
        ]);
        
        setAllPenugasan(resPenugasan.data.data); 

        // Mapping Honor
        const honorMap = {};
        if(resHonor.data.data) {
            resHonor.data.data.forEach(h => {
                honorMap[`${h.id_subkegiatan}-${h.kode_jabatan}`] = Number(h.tarif);
            });
        }

        // Mapping Tanggal & Limit
        const planMap = {};
        resPenugasan.data.data.forEach(p => {
            if (p.tanggal_mulai) {
                const d = new Date(p.tanggal_mulai);
                planMap[p.id_penugasan] = {
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    subId: p.id_subkegiatan
                };
            }
        });

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
                const pId = member.id_penugasan;
                if (!membersMap[pId]) membersMap[pId] = [];
                membersMap[pId].push(cleanMember);

                // Hitung Income
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
    fetchPenugasan();
  }, []);

  // --- LOGIKA IMPORT BARU ---
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
        // AUTO DETECT via Backend
        const res = await axios.post(`${API_URL}/api/penugasan/preview-import`, formData, {
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
        Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses file.', 'error');
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
        await axios.post(`${API_URL}/api/penugasan/store-import`, {
            data: previewData
        }, { headers: { Authorization: `Bearer ${token}` } });

        Swal.fire('Sukses', `${previewData.length} penugasan berhasil disimpan!`, 'success');
        setShowImportModal(false);
        fetchPenugasan();
    } catch (err) {
        Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

   const autoFitColumns = (jsonData, worksheet) => {
    if (!jsonData || jsonData.length === 0) return;

    const headers = Object.keys(jsonData[0]);
    const objectMaxLength = [];

    headers.forEach((key, i) => {
      objectMaxLength[i] = key.length;
    });

    jsonData.forEach((row) => {
      headers.forEach((key, i) => {
        const value = row[key] ? row[key].toString() : "";
        if (value.length > objectMaxLength[i]) {
          objectMaxLength[i] = value.length;
        }
      });
    });

    worksheet["!cols"] = objectMaxLength.map((w) => ({ wch: w + 5 }));
  };

  const handleDownloadTemplate = async () => {
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

    try {
      Swal.fire({
        title: 'Menyiapkan Template...',
        text: 'Sedang mengambil data master kegiatan, jabatan, dan satuan.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const token = getToken();

      const [resHonor, resJabatan, resSatuan] = await Promise.all([
        axios.get(`${API_URL}/api/honorarium`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/jabatan`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/satuan-kegiatan`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const honorData = resHonor.data.data || resHonor.data;
      const jabatanData = resJabatan.data.data || resJabatan.data;
      const satuanData = resSatuan.data.data || resSatuan.data;

      // ... (Bagian mapping masterRows, jabatanRows, satuanRows tetap sama) ...
      const masterRows = honorData.map(item => ({
        "Survei/Sensus": item.nama_kegiatan || '-',
        "Kegiatan": item.nama_sub_kegiatan || '-',
        "Deskripsi": item.deskripsi || '',
        "Tanggal Mulai": item.tanggal_mulai || '-',
        "Tanggal Selesai": item.tanggal_selesai || '-',
        "Jabatan": item.nama_jabatan || '-',
        "Tarif": item.tarif || 0,
        "Satuan": item.nama_satuan || '-',
        "Basis Volume": item.basis_volume || 0,
        "Beban Anggaran": item.beban_anggaran || '-'
      }));

      const jabatanRows = jabatanData
        .map(jab => ({ "Nama Jabatan": jab.nama_jabatan, "Kode": jab.kode_jabatan }))
        .sort((a, b) => a["Nama Jabatan"].localeCompare(b["Nama Jabatan"]));

      const satuanRows = satuanData
        .map(sat => ({ "Nama Satuan": sat.nama_satuan, "Alias": sat.alias || '-' }))
        .sort((a, b) => a["Nama Satuan"].localeCompare(b["Nama Satuan"]));

      // 4. Buat Workbook
      const workbook = XLSX.utils.book_new();

      // --- Sheet 1: Template Import ---
      const wsTemplate = XLSX.utils.json_to_sheet(rows);
      autoFitColumns(rows, wsTemplate);

      // FITUR TAMBAHAN: AutoFilter (Panah Filter di Header)
      // Kita set filter dari kolom A1 sampai kolom terakhir di baris 1 (Header)
      // Ref "A1:E1" berarti filter aktif di 5 kolom pertama
      if (wsTemplate['!ref']) {
        wsTemplate['!autofilter'] = { ref: wsTemplate['!ref'] };
      }

      XLSX.utils.book_append_sheet(workbook, wsTemplate, "template_import_perencanaan");

      // --- Sheet 2, 3, 4 (Master) ---
      const wsMaster = XLSX.utils.json_to_sheet(masterRows);
      autoFitColumns(masterRows, wsMaster);
      // Tambahkan filter juga di master agar mudah dicari
      if (wsMaster['!ref']) wsMaster['!autofilter'] = { ref: wsMaster['!ref'] };
      XLSX.utils.book_append_sheet(workbook, wsMaster, "master_kegiatan");

      const wsJabatan = XLSX.utils.json_to_sheet(jabatanRows);
      autoFitColumns(jabatanRows, wsJabatan);
      if (wsJabatan['!ref']) wsJabatan['!autofilter'] = { ref: wsJabatan['!ref'] };
      XLSX.utils.book_append_sheet(workbook, wsJabatan, "master_jabatan_mitra");

      const wsSatuan = XLSX.utils.json_to_sheet(satuanRows);
      autoFitColumns(satuanRows, wsSatuan);
      if (wsSatuan['!ref']) wsSatuan['!autofilter'] = { ref: wsSatuan['!ref'] };
      XLSX.utils.book_append_sheet(workbook, wsSatuan, "master_satuan_honor");

      // 5. Download
      XLSX.writeFile(workbook, "template_import_penugasan.xlsx");

      Swal.close();

    } catch (error) {
      console.error("Gagal download template:", error);
      Swal.fire('Error', 'Gagal mengambil data master.', 'error');
    }
  };

  // --- FILTER & SORT ---
  const availableYears = useMemo(() => {
    const years = new Set();
    allPenugasan.forEach(item => {
      if (item.tanggal_mulai) {
        const y = new Date(item.tanggal_mulai).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [allPenugasan]);

  const groupedPenugasan = useMemo(() => {
    const filtered = allPenugasan.filter(item => {
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

  }, [allPenugasan, searchTerm, filterYear]);

  // --- ACTIONS ---
  const toggleRow = async (id_penugasan) => {
    if (expandedTaskId === id_penugasan) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(id_penugasan);

    if (!membersCache[id_penugasan]) {
      setLoadingMembers(true);
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/api/penugasan/${id_penugasan}/anggota`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMembersCache(prev => ({ ...prev, [id_penugasan]: res.data }));
      } catch (err) {
        setMembersCache(prev => ({ ...prev, [id_penugasan]: [] }));
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Hapus Penugasan?',
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
        await axios.delete(`${API_URL}/api/penugasan/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Terhapus!', 'Penugasan berhasil dihapus.', 'success');
        fetchPenugasan();
      } catch (err) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  const handleEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/penugasan/edit/${id}`);
  };

  // --- CEK BLOCKER UNTUK BUTTON IMPORT ---
  const isBlocker = useMemo(() => {
    return previewData.some(row => row.stats.is_over_limit || row.stats.is_over_volume);
  }, [previewData]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat data penugasan...</p>
    </div>
  );

  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* === HEADER SECTION === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-[#1A2A80]">
                    <FaClipboardList size={24} />
                  </div>
                  Manajemen Penugasan
               </h1>
               <p className="text-gray-500 mt-2 ml-1">
                  Kelola tim kerja, alokasi mitra, dan monitoring status penugasan.
               </p>
            </div>

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
                 to="/penugasan/tambah" 
                 className="inline-flex items-center gap-2 px-5 py-2 bg-[#1A2A80] hover:bg-blue-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
               >
                  <FaPlus /> Buat Baru
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
                  placeholder="Cari Survei, Sub-Kegiatan, atau Pengawas..."
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

      {/* === DATA CONTENT === */}
      <div className="space-y-6">
        {Object.keys(groupedPenugasan).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaClipboardList className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
               {searchTerm || filterYear ? 'Tidak ditemukan data yang sesuai filter.' : 'Belum ada data penugasan.'}
            </p>
          </div>
        ) : (
          Object.entries(groupedPenugasan).map(([kegiatanName, subItems]) => {
            return (
              <div key={kegiatanName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                
                {/* --- Group Header --- */}
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
                </div>

                {/* --- List Items --- */}
                <div className="divide-y divide-gray-50">
                  {subItems.map((task) => {
                    const isOpen = expandedTaskId === task.id_penugasan;
                    const members = membersCache[task.id_penugasan] || [];
                    const membersCount = members.length;
                    
                    // Stats for Display
                    const realisasi = task.total_alokasi || 0; // Butuh update controller utk kirim ini ke user view, jika null anggap 0
                    // Catatan: Jika controller belum kirim 'total_alokasi' ke view User, ini mungkin 0.
                    // Namun fokus kita sekarang adalah fitur Import.

                    return (
                      <div key={task.id_penugasan} className={`group/item transition-colors ${isOpen ? 'bg-blue-50/10' : 'bg-white hover:bg-gray-50'}`}>
                        
                        <div 
                          onClick={() => toggleRow(task.id_penugasan)} 
                          className="px-6 py-5 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                          <div className="flex-1 flex items-start gap-4">
                            <div className={`mt-1 p-1.5 rounded-full transition-transform duration-300 border bg-white ${isOpen ? 'rotate-180 text-[#1A2A80] border-blue-200 shadow-sm' : 'text-gray-400 border-gray-200'}`}>
                                <FaChevronDown size={10} />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className={`font-bold text-sm transition-colors ${isOpen ? 'text-[#1A2A80]' : 'text-gray-800'}`}>
                                        {task.nama_sub_kegiatan}
                                    </h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase ${task.status_penugasan === 'disetujui' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        {task.status_penugasan}
                                    </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 mt-2">
                                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                        <FaCalendarAlt className="text-gray-400" /> 
                                        {formatDate(task.tanggal_mulai)} - {formatDate(task.tanggal_selesai)}
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
                                <button 
                                    onClick={(e) => handleEdit(e, task.id_penugasan)} 
                                    className="p-2 bg-white text-indigo-500 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm" 
                                    title="Edit Penugasan"
                                >
                                    <FaEdit size={14} />
                                </button>
                                
                                <button 
                                    onClick={(e) => handleDelete(e, task.id_penugasan)} 
                                    className="p-2 bg-white text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm" 
                                    title="Hapus Penugasan"
                                >
                                    <FaTrash size={14} />
                                </button>
                          </div>
                        </div>
                        
                        {isOpen && (
                          <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-6 pl-6 sm:pl-16 transition-all duration-300 ease-in-out">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                      <FaLayerGroup /> Daftar Anggota Tim
                                  </h4>
                                  <Link 
                                      to={`/penugasan/detail/${task.id_penugasan}`} 
                                      className="group/link text-[#1A2A80] font-bold text-xs hover:text-blue-700 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-blue-200 transition"
                                  >
                                      <FaFileExport /> Detail & Cetak SPK 
                                      <FaArrowRight size={10} className="group-hover/link:translate-x-1 transition-transform" />
                                  </Link>
                             </div>

                             {loadingMembers ? (
                               <div className="text-center py-4 flex flex-col items-center">
                                  <div className="w-6 h-6 border-2 border-gray-300 border-t-[#1A2A80] rounded-full animate-spin mb-2"></div>
                                  <p className="text-gray-400 text-xs italic">Memuat anggota...</p>
                               </div>
                             ) : (
                               members.length === 0 ? (
                                 <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                                   Belum ada anggota yang ditambahkan ke tim ini.
                                 </div>
                               ) : (
                                 <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                   {members.map((m, idx) => {
                                        // LOGIC HITUNG INCOME & STATUS BATAS (Sama seperti Admin)
                                        const taskDate = new Date(task.tanggal_mulai);
                                        const taskYear = taskDate.getFullYear();
                                        const taskMonth = taskDate.getMonth();
                                        const monthlyLimit = limitMap[taskYear] || 0;

                                        const incomeKey = `${m.id_mitra}-${taskYear}-${taskMonth}`;
                                        const totalMonthlyIncome = incomeStats[incomeKey] || 0;
                                        const percentageIncome = monthlyLimit > 0 ? (totalMonthlyIncome / monthlyLimit) * 100 : 0;
                                        const isOverIncome = monthlyLimit > 0 && totalMonthlyIncome > monthlyLimit;

                                     return (
                                       <li key={m.id_mitra || idx} className="bg-white px-4 py-4 rounded-xl border border-gray-200 shadow-sm hover:shadow hover:border-blue-200 transition-all">
                                         <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1A2A80] text-xs font-extrabold shadow-inner">
                                                {m.nama_lengkap ? m.nama_lengkap.charAt(0) : '?'}
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <div className="flex justify-between items-center w-full">
                                                    <p className="text-gray-800 font-bold text-xs truncate" title={m.nama_lengkap}>
                                                        {m.nama_lengkap || m.nama_mitra || 'Nama Tidak Tersedia'}
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

                                         {/* PROGRESS BAR PENDAPATAN MITRA */}
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
            );
          })
        )}
      </div>

      {/* === MODAL IMPORT BARU (SAMA SEPERTI ADMIN) === */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-down">
                
                {/* HEADER MODAL */}
                <div className="bg-[#1A2A80] p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg">
                        {importStep === 'upload' ? 'Upload File Penugasan' : 'Preview Data Import'}
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="hover:text-red-300"><FaTimes /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    
                    {/* STEP 1: DRAG & DROP */}
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

                    {/* STEP 2: PREVIEW TABLE */}
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

                            {/* ALERT BLOCKER JIKA ADA LIMIT YANG DILANGGAR */}
                            {isBlocker && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-800 mb-4 animate-pulse">
                                    <div className="font-bold flex items-center gap-2 mb-1">
                                        <FaExclamationCircle /> IMPORT DITAHAN!
                                    </div>
                                    <p>Terdapat data yang melebihi <b>Target Volume</b> atau <b>Batas Honor Mitra</b>. <br/>Silakan perbaiki data di file Excel Anda sebelum melanjutkan.</p>
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
                                        <thead className="bg-gray-100 font-bold text-gray-700 uppercase sticky top-0 shadow-sm z-10">
                                            <tr>
                                                <th className="px-4 py-3 w-1/4">Survei/Sensus</th>
                                                <th className="px-4 py-3 w-1/5">Kegiatan</th>
                                                <th className="px-4 py-3 w-1/5">Mitra (Jabatan)</th>
                                                <th className="px-4 py-3 w-1/5 text-center">Simulasi Volume</th>
                                                <th className="px-4 py-3 w-1/5 text-center">Simulasi Honor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {previewData.map((row, idx) => {
                                                const s = row.stats;
                                                
                                                // Kalkulasi Persentase Visual
                                                const totalVol = s.existing_vol + row.volume;
                                                const pctExistVol = s.target_vol > 0 ? (s.existing_vol / s.target_vol) * 100 : 0;
                                                const pctNewVol = s.target_vol > 0 ? (row.volume / s.target_vol) * 100 : 0;

                                                const totalInc = s.existing_income + s.new_income;
                                                const pctExistInc = s.limit_honor > 0 ? (s.existing_income / s.limit_honor) * 100 : 0;
                                                const pctNewInc = s.limit_honor > 0 ? (s.new_income / s.limit_honor) * 100 : 0;

                                                return (
                                                    <tr key={idx} className={`hover:bg-gray-50 ${ (s.is_over_limit || s.is_over_volume) ? 'bg-red-50' : ''}`}>
                                                        <td className="px-4 py-2 font-bold text-gray-800 truncate max-w-[150px]" title={row.nama_kegiatan}>
                                                            {row.nama_kegiatan}
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-600 truncate max-w-[150px]" title={row.nama_sub_kegiatan}>
                                                            {row.nama_sub_kegiatan}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="font-bold text-gray-700">{row.nama_mitra}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">{row.sobat_id}</div>
                                                            <div className="text-[10px] text-gray-500">{row.nama_jabatan}</div>
                                                        </td>

                                                        {/* BAR VOLUME */}
                                                        <td className="px-4 py-2 align-middle">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span>Real: <b>{s.existing_vol}</b> + <span className="text-blue-600 font-bold">{row.volume}</span></span>
                                                                <span className={s.is_over_volume ? "text-red-600 font-bold" : "text-gray-500"}>Target: {s.target_vol}</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-200 rounded-full flex overflow-hidden">
                                                                <div style={{ width: `${Math.min(pctExistVol, 100)}%` }} className="bg-gray-400 h-full"></div>
                                                                <div style={{ width: `${Math.min(pctNewVol, 100 - Math.min(pctExistVol, 100))}%` }} className={`h-full ${s.is_over_volume ? 'bg-red-500' : 'bg-blue-500'} relative`}>
                                                                    <div className="absolute inset-0 bg-white/20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                                                                </div>
                                                            </div>
                                                            {s.is_over_volume && <div className="text-[9px] text-red-500 mt-1 font-bold text-center">Melebihi Target!</div>}
                                                        </td>

                                                        {/* BAR HONOR */}
                                                        <td className="px-4 py-2 align-middle">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span>Total: <b>{formatRupiah(totalInc)}</b></span>
                                                                <span className="text-gray-400">Limit: {s.limit_honor > 0 ? formatRupiah(s.limit_honor) : '-'}</span>
                                                            </div>
                                                            {s.limit_honor > 0 ? (
                                                                <>
                                                                    <div className="w-full h-2 bg-gray-200 rounded-full flex overflow-hidden">
                                                                        <div style={{ width: `${Math.min(pctExistInc, 100)}%` }} className="bg-green-600 h-full"></div>
                                                                        <div style={{ width: `${Math.min(pctNewInc, 100 - Math.min(pctExistInc, 100))}%` }} className={`h-full ${s.is_over_limit ? 'bg-red-500' : 'bg-green-400'} relative`}>
                                                                            <div className="absolute inset-0 bg-white/20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                                                                        </div>
                                                                    </div>
                                                                    {s.is_over_limit && <div className="text-[9px] text-red-500 mt-1 font-bold text-center">Melebihi Batas!</div>}
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
                            // DISABLE JIKA BLOCKER AKTIF
                            disabled={isProcessing || previewData.length === 0 || isBlocker}
                            className={`px-6 py-2 rounded-lg font-bold shadow-lg transition flex items-center gap-2
                                ${isBlocker 
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                    : 'bg-[#1A2A80] hover:bg-blue-900 text-white'}
                            `}
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

export default Penugasan;