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
  FaPaperPlane,
  FaTimes,
  FaExclamationCircle,
  FaCheck,
  FaArrowLeft,
  FaExclamationTriangle,
  FaChartPie,
  FaBriefcase,
  FaCalendarAlt
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';
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

  // --- STATE MODAL IMPORT BARU ---
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

  // 2. LOGIKA IMPORT BARU (DROPZONE & PREVIEW)
  useEffect(() => {
    if (!showImportModal) {
        // Reset state modal saat ditutup
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
        // Backend akan membaca kolom Nama Kegiatan di Excel dan mencari ID-nya otomatis
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
        fetchPerencanaan(); // Refresh Data List
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
      XLSX.writeFile(workbook, "template_import_perencanaan.xlsx");

      Swal.close();

    } catch (error) {
      console.error("Gagal download template:", error);
      Swal.fire('Error', 'Gagal mengambil data master.', 'error');
    }
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

  // 4. ACTION HANDLERS
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
    let warningMessages = []; // Tidak ada blocker, semua warning

    idsArray.forEach(id => {
        const plan = allPerencanaan.find(p => p.id_perencanaan === id);
        if (!plan) return;

        // A. Validasi Volume
        if (plan.total_alokasi > plan.target_volume) {
            warningMessages.push(`⚠️ <b>${plan.nama_sub_kegiatan}</b>: Volume melebihi target (${plan.total_alokasi}/${plan.target_volume}).`);
        } else if (plan.total_alokasi < plan.target_volume) {
            warningMessages.push(`⚠️ <b>${plan.nama_sub_kegiatan}</b>: Volume belum terpenuhi (${plan.total_alokasi}/${plan.target_volume}).`);
        }

        // B. Validasi Pendapatan
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
                    warningMessages.push(`⚠️ <b>${member.nama_lengkap}</b>: Pendapatan Total Bulan Ini (${formatRupiah(totalIncome)}) melebihi batas.`);
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

      {/* --- MODAL IMPORT BARU (BOX & TABLE) --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-down">
                
                {/* HEADER MODAL */}
                <div className="bg-[#1A2A80] p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg">
                        {importStep === 'upload' ? 'Upload File Perencanaan' : 'Preview Data Import'}
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="hover:text-red-300"><FaTimes /></button>
                </div>

                {/* BODY MODAL */}
                <div className="p-6 overflow-y-auto flex-1">
                    
                    {/* TAMPILAN 1: DRAG & DROP BOX */}
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

                    {/* TAMPILAN 2: TABEL PREVIEW */}
                    {importStep === 'preview' && (
                        <div className="space-y-4">
                            {/* Peringatan (Jika Ada) */}
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

                {/* FOOTER MODAL */}
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