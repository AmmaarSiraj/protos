import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; // Import library Excel
import { 
  FaDownload, 
  FaFileUpload, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaChevronDown, 
  FaChevronUp,
  FaInfoCircle,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaTimes, 
  FaSave 
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

// Helper untuk AutoFit Lebar Kolom
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

const ManageKegiatan = () => {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [expandedRow, setExpandedRow] = useState(null); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); 

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [editingSub, setEditingSub] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  const getComputedStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return { label: '?', className: 'bg-gray-100' };
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start) return { label: 'Akan Datang', className: 'bg-blue-100 text-blue-700' };
    if (now > end) return { label: 'Selesai', className: 'bg-green-100 text-green-700' };
    return { label: 'Sedang Proses', className: 'bg-yellow-100 text-yellow-700' };
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const start = new Date(startDate).toLocaleDateString('id-ID', options);
    const end = new Date(endDate).toLocaleDateString('id-ID', options);
    return `${start} - ${end}`;
  };

  const fetchKegiatan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      if (!token) throw new Error('No auth token found. Please login.');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const res = await axios.get(`${API_URL}/api/kegiatan`, config);
      const allKegiatan = res.data.data || [];

      const mergedData = allKegiatan.map(k => {
         const mySubs = k.subkegiatan || [];
         
         const activeYears = new Set();
         mySubs.forEach(sub => {
            if (sub.tanggal_mulai) {
                const y = new Date(sub.tanggal_mulai).getFullYear();
                if (!isNaN(y)) activeYears.add(y.toString());
            }
         });

         if (activeYears.size === 0 && k.created_at) {
             const createdYear = new Date(k.created_at).getFullYear();
             if (!isNaN(createdYear)) activeYears.add(createdYear.toString());
         }

         return {
             ...k,
             active_years: Array.from(activeYears),
             sub_list: mySubs 
         };
      });

      setKegiatan(mergedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKegiatan();
  }, []);

  // --- LOGIKA DOWNLOAD TEMPLATE BARU ---
  const handleDownloadTemplate = async () => {
    // 1. Data Sheet 1: Template Import (Contoh Pengisian)
    // Menggunakan header User-Friendly seperti Penugasan/Perencanaan
    const rows = [
      { 
        "Survei/Sensus": "(SAKERNAS26-TW) SURVEI ANGKATAN KERJA NASIONAL (SAKERNAS) TAHUN 2026", 
        "Kegiatan": "PENDATAAN - TRIWULAN I", 
        "Deskripsi": "Kegiatan Pendataan Lapangan Sakernas",
        "Tanggal Mulai": "01/01/2026",
        "Tanggal Selesai": "28/02/2026",
        "Jabatan": "Petugas Pendataan Lapangan (PPL Survei)", // Mengacu ke Master Jabatan
        "Tarif": 55000,
        "Satuan": "Dokumen", // Mengacu ke Master Satuan
        "Basis Volume": 160,
        "Beban Anggaran": "054.01.019021.521213"
      },
      { 
        "Survei/Sensus": "(SAKERNAS26-TW) SURVEI ANGKATAN KERJA NASIONAL (SAKERNAS) TAHUN 2026", 
        "Kegiatan": "PENDATAAN - TRIWULAN I", 
        "Deskripsi": "Kegiatan Pemeriksaan Lapangan Sakernas",
        "Tanggal Mulai": "01/01/2026",
        "Tanggal Selesai": "28/02/2026",
        "Jabatan": "Petugas Pemeriksaan Lapangan (PML Survei)",
        "Tarif": 19000,
        "Satuan": "Dokumen",
        "Basis Volume": 160,
        "Beban Anggaran": "054.01.019021.521213"
      }
    ];

    try {
        Swal.fire({
            title: 'Menyiapkan Template...',
            text: 'Sedang mengambil data master jabatan dan satuan.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const token = localStorage.getItem('token');
        
        // 2. Ambil Data Referensi (Jabatan & Satuan)
        const [resJabatan, resSatuan] = await Promise.all([
            axios.get(`${API_URL}/api/jabatan`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/satuan-kegiatan`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const jabatanData = resJabatan.data.data || resJabatan.data;
        const satuanData = resSatuan.data.data || resSatuan.data;

        // 3a. Format Master Jabatan
        const jabatanRows = jabatanData
            .map(jab => ({ 
                "Nama Jabatan": jab.nama_jabatan, 
                "Kode": jab.kode_jabatan 
            }))
            .sort((a, b) => a["Nama Jabatan"].localeCompare(b["Nama Jabatan"]));

        // 3b. Format Master Satuan
        const satuanRows = satuanData
            .map(sat => ({ 
                "Nama Satuan": sat.nama_satuan, 
                "Alias": sat.alias || '-' 
            }))
            .sort((a, b) => a["Nama Satuan"].localeCompare(b["Nama Satuan"]));

        // 4. Buat Workbook
        const workbook = XLSX.utils.book_new();

        // --- Sheet 1: Template Import ---
        const wsTemplate = XLSX.utils.json_to_sheet(rows);
        autoFitColumns(rows, wsTemplate);
        if (wsTemplate['!ref']) wsTemplate['!autofilter'] = { ref: wsTemplate['!ref'] };
        XLSX.utils.book_append_sheet(workbook, wsTemplate, "template_import_kegiatan");

        // --- Sheet 2: Master Jabatan Mitra ---
        const wsJabatan = XLSX.utils.json_to_sheet(jabatanRows);
        autoFitColumns(jabatanRows, wsJabatan);
        if (wsJabatan['!ref']) wsJabatan['!autofilter'] = { ref: wsJabatan['!ref'] };
        XLSX.utils.book_append_sheet(workbook, wsJabatan, "master_jabatan_mitra");

        // --- Sheet 3: Master Satuan Honor ---
        const wsSatuan = XLSX.utils.json_to_sheet(satuanRows);
        autoFitColumns(satuanRows, wsSatuan);
        if (wsSatuan['!ref']) wsSatuan['!autofilter'] = { ref: wsSatuan['!ref'] };
        XLSX.utils.book_append_sheet(workbook, wsSatuan, "master_satuan_honor");

        // 5. Download File
        XLSX.writeFile(workbook, "template_import_kegiatan.xlsx");
        
        Swal.close(); 

    } catch (err) {
        console.error("Gagal download template:", err);
        Swal.fire('Error', 'Gagal mengambil data master.', 'error');
    }
  };

  const filteredKegiatan = useMemo(() => {
    return kegiatan.map(item => {
      const years = item.active_years || [];
      const matchYear = filterYear ? years.includes(filterYear) : true;
      
      if (!matchYear) return null;

      const term = searchTerm.toLowerCase();
      const parentMatchesSearch = item.nama_kegiatan.toLowerCase().includes(term);

      const filteredSubs = (item.sub_list || []).filter(sub => {
        let matchesStatus = true;
        if (filterStatus) {
           const statusObj = getComputedStatus(sub.tanggal_mulai, sub.tanggal_selesai);
           matchesStatus = statusObj.label === filterStatus;
        }

        let matchesSearch = true;
        if (searchTerm) {
           if (!parentMatchesSearch) {
              matchesSearch = sub.nama_sub_kegiatan && sub.nama_sub_kegiatan.toLowerCase().includes(term);
           }
        }

        return matchesStatus && matchesSearch;
      });

      if (filterStatus) {
          if (filteredSubs.length > 0) {
              return { ...item, sub_list: filteredSubs };
          }
          return null;
      }

      if (filteredSubs.length > 0) {
          return { ...item, sub_list: filteredSubs };
      } else if (parentMatchesSearch && !filterStatus) {
          return item; 
      }
      
      return null; 
    }).filter(Boolean);
  }, [kegiatan, searchTerm, filterYear, filterStatus]);

  const availableYears = useMemo(() => {
    const years = new Set();
    if (Array.isArray(kegiatan)) {
      kegiatan.forEach(item => {
          const yrs = item.active_years || [];
          if (Array.isArray(yrs)) {
            yrs.forEach(y => years.add(y));
          }
      });
    }
    return [...years].sort((a, b) => b - a);
  }, [kegiatan]);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    const result = await Swal.fire({
      title: 'Hapus Survei/Sensus?',
      text: "Seluruh data terkait (Kegiatan, Penugasan) akan terhapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/kegiatan/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setKegiatan(prev => prev.filter(item => item.id !== id));
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
      } catch (err) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus.', 'error');
      }
    }
  };

  const handleRowClick = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null); 
    } else {
      setExpandedRow(id);
    }
  };

  const handleDeleteSub = async (e, subId) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Hapus Kegiatan?',
      text: "Data penugasan & honorarium di dalamnya juga akan terhapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/subkegiatan/${subId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Terhapus', 'Kegiatan berhasil dihapus.', 'success');
            fetchKegiatan();
        } catch (err) {
            Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error');
        }
    }
  };

  const handleEditSubClick = (e, sub) => {
    e.stopPropagation();
    setEditingSub({
        ...sub,
        tanggal_mulai: sub.tanggal_mulai ? sub.tanggal_mulai.split('T')[0] : '',
        tanggal_selesai: sub.tanggal_selesai ? sub.tanggal_selesai.split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!editingSub.nama_sub_kegiatan || !editingSub.tanggal_mulai) {
        return Swal.fire('Validasi', 'Nama dan Tanggal Mulai wajib diisi.', 'warning');
    }

    setSavingSub(true);
    try {
        const token = localStorage.getItem('token');
        const payload = {
            nama_sub_kegiatan: editingSub.nama_sub_kegiatan,
            deskripsi: editingSub.deskripsi,
            tanggal_mulai: editingSub.tanggal_mulai,
            tanggal_selesai: editingSub.tanggal_selesai
        };

        await axios.put(`${API_URL}/api/subkegiatan/${editingSub.id}/info`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        Swal.fire('Berhasil', 'Data Kegiatan diperbarui.', 'success');
        setIsModalOpen(false);
        fetchKegiatan();

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan.', 'error');
    } finally {
        setSavingSub(false);
    }
  };

  const handleImportClick = () => { fileInputRef.current.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("--- MULAI UPLOAD ---");
    console.log("File Info:", { name: file.name, type: file.type, size: file.size });

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/api/subkegiatan/import`;
      
      console.log(`Mengirim POST ke: ${url}`); 

      const response = await axios.post(url, formData, {
        headers: { 
            'Content-Type': 'multipart/form-data', 
            'Authorization': `Bearer ${token}` 
        }
      });

      console.log("Response Sukses:", response.data);

      const { successCount, failCount, errors } = response.data;
      
      // Update: Menggunakan HTML untuk menampilkan detail error jika ada
      let htmlMessage = `<p>Sukses: <b>${successCount}</b> data.</p>`;
      let iconType = 'success';

      if (failCount > 0) {
        iconType = 'warning';
        htmlMessage += `<p style="color:red; margin-top:5px;">Gagal: <b>${failCount}</b> baris.</p>`;
        
        if (errors && errors.length > 0) {
             const errorList = errors.map(err => `<li>${err}</li>`).join('');
             htmlMessage += `
                <div style="margin-top:10px; text-align:left;">
                    <strong style="font-size:12px; color:#555;">Detail Error:</strong>
                    <ul style="max-height:150px; overflow-y:auto; font-size:11px; color:#dc2626; padding-left:15px; margin-top:5px; border:1px solid #fee2e2; background-color:#fef2f2; border-radius:4px; padding:8px;">
                        ${errorList}
                    </ul>
                </div>
             `;
        }
      }

      Swal.fire({
          title: 'Import Selesai',
          html: htmlMessage, // Menggunakan properti html
          icon: iconType
      });
      
      setExpandedRow(null);
      fetchKegiatan(); 

    } catch (err) {
      console.error("--- ERROR IMPORT ---", err);

      let title = 'Gagal Import';
      let errorMessage = 'Terjadi kesalahan sistem.';

      if (err.response) {
          if (err.response.status === 404) {
              errorMessage = "URL Import tidak ditemukan (404). Cek route backend.";
          } else if (err.response.status === 422) {
              title = 'Validasi Gagal';
              const errorData = err.response.data.errors || err.response.data.message;
              errorMessage = typeof errorData === 'object' 
                  ? JSON.stringify(errorData) 
                  : errorData;
          } else if (err.response.data && err.response.data.message) {
              errorMessage = err.response.data.message;
          }
      } else if (err.request) {
          errorMessage = "Tidak ada respon dari server. Pastikan backend berjalan.";
      } else {
          errorMessage = err.message;
      }

      Swal.fire(title, errorMessage, 'error');
    } finally {
      setUploading(false);
      e.target.value = null; // Reset input file
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat data...</div>;
  if (error) return <div className="text-center py-10 text-red-600">Error: {error}</div>;

  return (
    <div className="w-full relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">Kelola daftar Survei/Sensus.</div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm"><FaDownload /> Template Excel</button>
          <button onClick={handleImportClick} disabled={uploading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50"><FaFileUpload /> {uploading ? '...' : 'Import Kegiatan'}</button>
          <Link to="/admin/manage-kegiatan/tambah" className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm"><FaPlus /> Tambah Baru</Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-1/3">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Survei/Sensus..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm transition bg-gray-50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm font-bold flex items-center gap-1"><FaCalendarAlt /> Tahun:</span>
                <select
                   className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm bg-white cursor-pointer"
                   value={filterYear}
                   onChange={(e) => setFilterYear(e.target.value)}
                >
                   <option value="">Semua</option>
                   {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm font-bold flex items-center gap-1"><FaFilter /> Status:</span>
                <select
                   className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm bg-white cursor-pointer"
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value)}
                >
                   <option value="">Semua Status</option>
                   <option value="Sedang Proses">Sedang Proses</option>
                   <option value="Akan Datang">Akan Datang</option>
                   <option value="Selesai">Selesai</option>
                </select>
            </div>
         </div>
      </div>

      <div className="space-y-4">
        {kegiatan.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Belum ada data Survei/Sensus.</p>
          </div>
        ) : filteredKegiatan.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Tidak ditemukan data yang cocok dengan filter.</p>
            <button onClick={() => {setSearchTerm(''); setFilterYear(''); setFilterStatus('');}} className="mt-2 text-[#1A2A80] text-sm underline hover:text-blue-800">Reset Filter</button>
          </div>
        ) : (
          filteredKegiatan.map((item) => {
            const isExpanded = expandedRow === item.id;
            
            return (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100 hover:border-blue-200'}`}>
                <div onClick={() => handleRowClick(item.id)} className={`px-6 py-4 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${isExpanded ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full transition-transform duration-200 ${isExpanded ? 'bg-blue-100 text-[#1A2A80]' : 'text-gray-400 bg-gray-100'}`}>
                       {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </div>
                    <div>
                      <h3 className={`text-base font-bold transition-colors ${isExpanded ? 'text-[#1A2A80]' : 'text-gray-800'}`}>{item.nama_kegiatan}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-md">{item.deskripsi || 'Tidak ada deskripsi.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-12 md:pl-0">
                    <Link to={`/admin/manage-kegiatan/edit/${item.id}`} onClick={(e) => e.stopPropagation()} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit Survei/Sensus & Atur Honor"><FaEdit /></Link>
                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Hapus Survei/Sensus"><FaTrash /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50/50 border-t border-gray-100 animate-fade-in-down">
                    {item.sub_list && item.sub_list.length > 0 ? (
                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-left text-sm bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 w-1/3">Nama Kegiatan</th>
                              <th className="px-4 py-3">Jadwal Pelaksanaan</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {item.sub_list.map((sub) => {
                              const statusObj = getComputedStatus(sub.tanggal_mulai, sub.tanggal_selesai);
                              return (
                                <tr key={sub.id} className="hover:bg-blue-50 transition-colors group">
                                  <td className="px-4 py-3 font-medium text-gray-800" onClick={() => navigate(`/admin/manage-kegiatan/detail/${sub.id}`)} style={{cursor: 'pointer'}}>
                                    {sub.nama_sub_kegiatan}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-gray-400"/> 
                                        {formatDateRange(sub.tanggal_mulai, sub.tanggal_selesai)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide shadow-sm ${statusObj.className}`}>{statusObj.label}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => navigate(`/admin/manage-kegiatan/detail/${sub.id}`)} 
                                            className="text-gray-400 hover:text-[#1A2A80] p-1.5 rounded hover:bg-blue-50 transition"
                                            title="Lihat Detail"
                                        >
                                            <FaInfoCircle />
                                        </button>
                                        <button 
                                            onClick={(e) => handleEditSubClick(e, sub)} 
                                            className="text-gray-400 hover:text-green-600 p-1.5 rounded hover:bg-green-50 transition"
                                            title="Edit Info Kegiatan"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteSub(e, sub.id)} 
                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition"
                                            title="Hapus Kegiatan"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-gray-500 italic mb-3">Tidak ada Kegiatan.</p>
                        <Link to={`/admin/manage-kegiatan/edit/${item.id}`} className="inline-flex items-center gap-2 text-[#1A2A80] text-xs font-bold hover:underline bg-blue-50 px-3 py-2 rounded-lg border border-blue-100"><FaPlus size={10} /> Kelola Kegiatan</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && editingSub && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <FaEdit className="text-[#1A2A80]" /> Edit Kegiatan
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Kegiatan</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                            value={editingSub.nama_sub_kegiatan}
                            onChange={(e) => setEditingSub({...editingSub, nama_sub_kegiatan: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                        <textarea 
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm resize-none"
                            value={editingSub.deskripsi}
                            onChange={(e) => setEditingSub({...editingSub, deskripsi: e.target.value})}
                        ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Mulai</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                                value={editingSub.tanggal_mulai}
                                onChange={(e) => setEditingSub({...editingSub, tanggal_mulai: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Selesai</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm"
                                value={editingSub.tanggal_selesai}
                                onChange={(e) => setEditingSub({...editingSub, tanggal_selesai: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-white transition text-sm">Batal</button>
                    <button onClick={handleSaveSub} disabled={savingSub} className="px-6 py-2 rounded-lg bg-[#1A2A80] text-white font-bold hover:bg-blue-900 transition text-sm shadow-md flex items-center gap-2">
                        {savingSub ? 'Menyimpan...' : <><FaSave /> Simpan</>}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ManageKegiatan;