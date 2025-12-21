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
  FaCheckCircle,
  FaUndoAlt,
  FaTimes
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://makinasik.web.bps.go.id';
const getToken = () => localStorage.getItem('token');

const Penugasan = () => {
  const navigate = useNavigate();

  const [allPenugasan, setAllPenugasan] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [membersCache, setMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  // --- PERBAIKAN 1: State diganti dari boolean menjadi string (menyimpan nama grup) ---
  const [processingGroup, setProcessingGroup] = useState(null);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importKegiatanList, setImportKegiatanList] = useState([]);
  const [importSubList, setImportSubList] = useState([]);
  
  const [selectedKegiatanId, setSelectedKegiatanId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const fetchPenugasan = async () => {
    setIsLoading(true);
    try {
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resPenugasan, resKelompok] = await Promise.all([
            axios.get(`${API_URL}/api/penugasan`, config),
            axios.get(`${API_URL}/api/kelompok-penugasan`, config)
        ]);
        
        setAllPenugasan(resPenugasan.data.data); 

        const membersMap = {};
        const rawKelompok = resKelompok.data.data || resKelompok.data;

        if (Array.isArray(rawKelompok)) {
            rawKelompok.forEach(member => {
                const cleanMember = {
                    ...member,
                    nama_lengkap: member.nama_lengkap || member.nama_mitra, 
                };
                const pId = member.id_penugasan;
                if (!membersMap[pId]) {
                    membersMap[pId] = [];
                }
                membersMap[pId].push(cleanMember);
            });
        }
        setMembersCache(membersMap);

    } catch (err) {
        console.error("Gagal load data:", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPenugasan();
  }, []);

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
        const res = await axios.post(`${API_URL}/api/penugasan/preview-import`, formData, {
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
                    goToTambahPenugasan(subkegiatan, valid_data);
                }
            });
        } else {
            if (valid_data.length > 0) {
                goToTambahPenugasan(subkegiatan, valid_data);
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

  const goToTambahPenugasan = (subkegiatanData, importedMembers) => {
    navigate('/admin/penugasan/tambah', { 
        state: {
            preSelectedSubKegiatan: subkegiatanData,
            importedMembers: importedMembers
        }
    });
  };

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

  const handleStatusChange = async (e, id, currentStatus) => {
    e.stopPropagation();
    
    const newStatus = currentStatus === 'disetujui' ? 'menunggu' : 'disetujui';

    try {
      setAllPenugasan(prev => prev.map(p => 
        p.id_penugasan === id ? { ...p, status_penugasan: newStatus } : p
      ));

      const token = getToken();
      await axios.put(`${API_URL}/api/penugasan/${id}`, 
        { status_penugasan: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', `Gagal mengubah status.`, 'error');
      fetchPenugasan();
    }
  };

  // --- PERBAIKAN 2: Menerima parameter groupName ---
  const handleGroupStatusChange = async (subItems, groupName) => {
    const allApproved = subItems.every(item => item.status_penugasan === 'disetujui');
    const targetStatus = allApproved ? 'menunggu' : 'disetujui';
    const actionText = targetStatus === 'disetujui' ? 'Menyetujui Semua' : 'Membatalkan Semua';

    const result = await Swal.fire({
        title: `${actionText}?`,
        text: `Akan mengubah status ${subItems.length} penugasan dalam grup ini menjadi '${targetStatus}'.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: targetStatus === 'disetujui' ? '#10B981' : '#F59E0B',
        confirmButtonText: `Ya, ${actionText}`
    });

    if (result.isConfirmed) {
        setProcessingGroup(groupName); // Set grup spesifik yang sedang diproses
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const promises = subItems.map(item => {
                if (item.status_penugasan !== targetStatus) {
                    return axios.put(`${API_URL}/api/penugasan/${item.id_penugasan}`, {
                        status_penugasan: targetStatus
                    }, config);
                }
                return Promise.resolve();
            });

            await Promise.all(promises);

            Swal.fire('Sukses', 'Status grup berhasil diperbarui!', 'success');
            fetchPenugasan();

        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Terjadi kesalahan saat memproses grup.', 'error');
        } finally {
            setProcessingGroup(null); // Reset
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
    navigate(`/admin/penugasan/edit/${id}`);
  };

  const handleDownloadTemplate = () => {
    const rows = [
      { 
        sobat_id: "337322040034", 
        nama_lengkap: "Trian Yunita Hestiarini", 
        posisi: "Petugas Pendataan Lapangan (PPL Survei)" 
      },
      { 
        sobat_id: "337322040036", 
        nama_lengkap: "TRIYANI WIDYASTUTI", 
        posisi: "Petugas Pendataan Lapangan (PPL Survei)" 
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    XLSX.writeFile(workbook, "template_import_penugasan.xlsx");
  };

  if (isLoading) return <div className="text-center py-10 text-gray-500">Memuat data penugasan...</div>;

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">
          Kelola tim dan alokasi mitra untuk setiap kegiatan.
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm">
            <FaDownload /> Template Excel
          </button>
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaFileUpload /> Import Penugasan
          </button>
          <Link to="/admin/penugasan/tambah" className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            <FaPlus /> Buat Manual
          </Link>
        </div>
      </div>

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

      <div className="space-y-6">
        {Object.keys(groupedPenugasan).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
            {searchTerm || filterYear ? 'Tidak ditemukan data yang sesuai filter.' : 'Belum ada data penugasan. Silakan import atau buat baru.'}
          </div>
        ) : (
          Object.entries(groupedPenugasan).map(([kegiatanName, subItems]) => {
            
            const allApproved = subItems.length > 0 && subItems.every(i => i.status_penugasan === 'disetujui');
            
            // --- PERBAIKAN 3: Cek apakah grup ini yang sedang diproses ---
            const isThisGroupProcessing = processingGroup === kegiatanName;

            return (
              <div key={kegiatanName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                   <div className="flex items-center gap-3 flex-1">
                      <span className="text-[#1A2A80]"><FaClipboardList size={18} /></span>
                      <h2 className="text-lg font-bold text-gray-800">{kegiatanName}</h2>
                      <span className="text-xs font-medium bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                          {subItems.length} Tim
                      </span>
                   </div>

                   <button 
                      // Pass nama kegiatan ke fungsi
                      onClick={() => handleGroupStatusChange(subItems, kegiatanName)}
                      // Disable hanya jika grup ini sedang diproses (atau ada grup lain jika Anda ingin strict, tapi umumnya per grup saja cukup)
                      disabled={isThisGroupProcessing || processingGroup !== null}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm 
                        ${allApproved 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                   >
                      {isThisGroupProcessing ? 'Memproses...' : (
                        allApproved ? (
                          <><FaUndoAlt /> Batalkan Semua</>
                        ) : (
                          <><FaCheckCircle /> Setujui Semua</>
                        )
                      )}
                   </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {subItems.map((task) => {
                    const isOpen = expandedTaskId === task.id_penugasan;
                    const members = membersCache[task.id_penugasan] || [];
                    const membersCount = members.length;
                    
                    const isApproved = task.status_penugasan === 'disetujui';

                    return (
                      <div key={task.id_penugasan} className="group">
                        
                        <div 
                          onClick={() => toggleRow(task.id_penugasan)} 
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
                              
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase
                                ${isApproved 
                                  ? 'bg-green-50 text-green-600 border-green-100' 
                                  : 'bg-gray-100 text-gray-500 border-gray-200'}
                              `}>
                                {task.status_penugasan || 'Menunggu'}
                              </span>
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
                                    onClick={(e) => handleStatusChange(e, task.id_penugasan, task.status_penugasan)}
                                    className={`p-2 rounded-full transition ${isApproved ? 'text-amber-500 hover:bg-amber-100' : 'text-green-600 hover:bg-green-100'}`}
                                    title={isApproved ? "Batalkan Persetujuan" : "Setujui Penugasan"}
                                  >
                                    {isApproved ? <FaUndoAlt size={14} /> : <FaCheckCircle size={14} />}
                                  </button>

                                  <button onClick={(e) => handleEdit(e, task.id_penugasan)} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-full transition" title="Edit Penugasan">
                                      <FaEdit size={14} />
                                  </button>
                                  <button onClick={(e) => handleDelete(e, task.id_penugasan)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition" title="Hapus Penugasan">
                                      <FaTrash size={14} />
                                  </button>
                              </div>
                          </div>
                        </div>
                        
                        {isOpen && (
                          <div className="bg-gray-50/30 px-6 py-5 border-t border-gray-100 text-sm animate-fade-in-down pl-6 sm:pl-14">
                             <div className="flex justify-between items-center mb-4">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Anggota Tim:</h4>
                                  <Link 
                                      to={`/admin/penugasan/detail/${task.id_penugasan}`} 
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
                                   {members.map((m, idx) => (
                                     <li key={m.id_mitra || idx} className="flex items-center gap-3 bg-white px-3 py-2.5 rounded-lg border border-gray-200 shadow-sm">
                                       <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                                          {m.nama_lengkap ? m.nama_lengkap.charAt(0) : '?'}
                                       </div>
                                       <div className="overflow-hidden w-full">
                                          <div className="flex justify-between items-center w-full">
                                              <p className="text-gray-700 font-bold text-xs truncate">
                                                  {m.nama_lengkap || m.nama_mitra || 'Nama Tidak Tersedia'}
                                              </p>
                                              {m.volume_tugas > 0 && (
                                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">
                                                      Vol: {m.volume_tugas}
                                                  </span>
                                              )}
                                          </div>
                                          <p className="text-xs text-gray-400 truncate">
                                              {m.nama_jabatan || '-'}
                                          </p>
                                       </div>
                                     </li>
                                   ))}
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

      {showImportModal && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-down">
                <div className="bg-[#1A2A80] p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold">Import Data Penugasan</h3>
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

export default Penugasan;