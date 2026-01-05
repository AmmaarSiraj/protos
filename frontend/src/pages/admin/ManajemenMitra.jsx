import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import * as XLSX from 'xlsx'; 
import Swal from 'sweetalert2';
import { 
  FaDownload, FaFileUpload, 
  FaTimes, FaPlus,
  FaFileExcel, FaCheckCircle, FaCloudUploadAlt, FaChevronDown
} from 'react-icons/fa';
import PartTableMitra from '../../components/admin/PartTabelMitra';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const ManajemenMitra = () => {
  const [mitraList, setMitraList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- HAPUS STATE PAGINATION DI SINI ---
  // const [currentPage, setCurrentPage] = useState(1);  <-- HAPUS
  // const itemsPerPage = 10;                            <-- HAPUS

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  
  const currentYear = new Date().getFullYear();
  const [importYear, setImportYear] = useState(currentYear);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  
  const selectedYearRef = useRef(null);
  const yearsRange = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null); 
  const navigate = useNavigate(); 

  // --- CEK ROLE USER ---
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, []);

  const fetchMitra = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/mitra`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = response.data.data || [];
      if (Array.isArray(data)) {
        setMitraList(data);
      } else {
        setMitraList([]);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data mitra.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMitra(); }, []);

  // --- HAPUS EFFECT RESET PAGE ---
  // useEffect(() => { setCurrentPage(1); }, [mitraList.length]); <-- HAPUS

  useEffect(() => {
    if (showYearDropdown && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: 'center' });
    }
  }, [showYearDropdown]);

  // --- HAPUS LOGICA SLICING DATA ---
  // const indexOfLastItem = currentPage * itemsPerPage;
  // const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // const currentData = mitraList.slice(indexOfFirstItem, indexOfLastItem); <-- HAPUS
  // const totalPages = Math.ceil(mitraList.length / itemsPerPage);

  // const handlePageChange = ... <-- HAPUS

  const handleOpenImport = () => {
    setImportFile(null);
    setImportYear(currentYear);
    setShowImportModal(true);
  };

  const handleSelectYear = (year) => {
    setImportYear(year);
    setShowYearDropdown(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setImportFile(file);
    } else {
      Swal.fire('Format Salah', 'Harap upload file Excel (.xlsx / .xls)', 'error');
    }
  };

  const handleSubmitImport = async () => {
    if (!importFile) return Swal.fire('Gagal', 'Silakan pilih file terlebih dahulu.', 'warning');

    setUploading(true);
    const formData = new FormData();
    const yearToSend = importYear || currentYear;
    
    formData.append('tahun_daftar', yearToSend);
    formData.append('file', importFile);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/mitra/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });

      const { successCount, skipCount, failCount, errors } = res.data;
      
      let msgHTML = `<b>Tahun Aktif: ${yearToSend}</b><br/><br/>
      ✅ Berhasil Diaktifkan: <b>${successCount}</b><br/>
      ℹ️ Sudah Aktif Tahun Ini: <b>${skipCount}</b><br/>
      ❌ Gagal: <b>${failCount}</b>`;
      
      if (errors && errors.length > 0) {
        msgHTML += `<br/><br/><div style="text-align:left; max-height:100px; overflow-y:auto; font-size:12px; background:#f9f9f9; padding:5px;">${errors.slice(0, 3).join('<br/>')}${errors.length > 3 ? '<br/>...' : ''}</div>`;
      }

      setShowImportModal(false);
      Swal.fire({
        title: 'Proses Selesai',
        html: msgHTML,
        icon: failCount > 0 ? 'warning' : 'success'
      });

      fetchMitra(); 
    } catch (err) { 
      Swal.fire('Gagal', err.response?.data?.message || 'Error import.', 'error');
    } finally { 
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "NIK": "1234567890123456",            
        "Nama Lengkap": "Contoh Nama Mitra",
        "Alamat Detail": "Jl. Merdeka No. 45",
        "Jenis Kelamin": "Lk",                
        "Pendidikan": "Tamat D4/S1",
        "Pekerjaan": "Wiraswasta",
        "Deskripsi Pekerjaan Lain": "-",
        "No Telp": "081234567890",
        "SOBAT ID": "12345",
        "Email": "contoh@email.com"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wscols = [
        {wch: 20}, {wch: 25}, {wch: 35}, {wch: 15}, {wch: 20}, 
        {wch: 20}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 25}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Import");
    XLSX.writeFile(wb, "Template_Import_Mitra.xlsx");
  };

  const handleExport = () => { 
    const dataToExport = mitraList.map(m => ({
      "NIK": m.nik,
      "Nama Lengkap": m.nama_lengkap,
      "Alamat Detail": m.alamat,
      "Jenis Kelamin": m.jenis_kelamin || '',
      "Pendidikan": m.pendidikan || '',
      "Pekerjaan": m.pekerjaan || '',
      "Deskripsi Pekerjaan Lain": m.deskripsi_pekerjaan_lain || '',
      "No Telp": m.nomor_hp,
      "SOBAT ID": m.sobat_id || '',
      "Email": m.email || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [
        {wch: 20}, {wch: 30}, {wch: 40}, {wch: 15}, {wch: 15}, 
        {wch: 20}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 25}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Mitra");
    XLSX.writeFile(wb, "Data_Mitra_Export.xlsx");
  };

  const handleDelete = async (id, year) => {
    const result = await Swal.fire({ 
        title: 'Hapus Data?', 
        text: `Jika mitra ini aktif di tahun lain, hanya data tahun ${year} yang dihapus. Jika tidak, data mitra dihapus permanen.`, 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonText: 'Ya, Hapus', 
        confirmButtonColor: '#d33' 
    });

    if (result.isConfirmed) {
      try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/mitra/${id}`, { 
              headers: { Authorization: `Bearer ${token}` },
              params: { tahun: year }
          });
          
          setMitraList(prev => {
             fetchMitra(); 
             return prev;
          });
          
          Swal.fire('Terhapus!', 'Data berhasil diproses.', 'success');
      } catch (err) { 
          Swal.fire('Gagal!', 'Gagal menghapus data.', 'error'); 
      }
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat data...</div>;

  return (
    <div className="w-full pb-20 relative">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-500 text-sm">Database seluruh mitra statistik.</div>
        <div className="flex flex-wrap gap-2 justify-end">
          
          {isAdmin && (
            <button onClick={() => navigate('/admin/mitra/tambah')} className="flex items-center gap-2 px-4 py-2 bg-[#1A2A80] text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition shadow-sm">
              <FaPlus /> Tambah Mitra
            </button>
          )}
          
          {isAdmin && (
            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
              <FaFileExcel /> Template
            </button>
          )}

          <button onClick={handleExport} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm">
            <FaDownload /> Export
          </button>
          
          {isAdmin && (
            <button onClick={handleOpenImport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
              <FaFileUpload /> Import
            </button>
          )}
        </div>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Pass props FULL DATA (mitraList), jangan dicut/slice di sini */}
        <PartTableMitra 
            data={mitraList} 
            onEdit={(id) => navigate(`/admin/mitra/edit/${id}`)}
            onDelete={(id, year) => handleDelete(id, year)}
            onDetail={(id) => navigate(`/admin/mitra/${id}`)}
            readOnly={!isAdmin} 
        />
        
        {/* SECTION PAGINATION DI BAWAH INI SUDAH DIHAPUS, KARENA SUDAH ADA DI DALAM PartTableMitra */}
      </div>

      {showImportModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><FaFileUpload className="text-green-600" /> Import Mitra Excel</h3>
                    <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-red-500 transition"><FaTimes size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tahun Aktif</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={importYear}
                                onChange={(e) => setImportYear(e.target.value)}
                                onFocus={() => setShowYearDropdown(true)}
                                onBlur={() => setTimeout(() => setShowYearDropdown(false), 200)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-700 font-bold bg-white"
                                placeholder={currentYear}
                            />
                            <FaChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none text-xs" />
                            
                            {showYearDropdown && (
                                <ul className="absolute z-50 w-full bg-white border border-gray-300 mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
                                    {yearsRange.map(year => {
                                        const isSelected = year === parseInt(importYear);
                                        return (
                                            <li 
                                                key={year} 
                                                ref={isSelected ? selectedYearRef : null}
                                                onMouseDown={() => handleSelectYear(year)}
                                                className={`px-4 py-2 cursor-pointer hover:bg-green-50 text-sm ${isSelected ? 'bg-green-100 font-bold text-green-800' : 'text-gray-700'}`}
                                            >
                                                {year}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Data yang diimport akan ditandai aktif pada tahun ini.</p>
                    </div>

                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${isDragging ? 'border-green-500 bg-green-50 scale-[1.02]' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'} ${importFile ? 'bg-green-50/50 border-green-500' : 'bg-white'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
                        {importFile ? (
                            <div className="text-green-700 animate-fade-in-up">
                                <FaCheckCircle className="text-4xl mx-auto mb-2" />
                                <p className="font-bold text-sm truncate max-w-[200px]">{importFile.name}</p>
                                <button onClick={(e) => { e.stopPropagation(); setImportFile(null); }} className="mt-3 text-xs text-red-500 hover:underline font-bold">Ganti File</button>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 bg-green-100 text-green-600 rounded-full mb-2"><FaCloudUploadAlt size={32} /></div>
                                <p className="font-bold text-gray-600 text-sm">Klik atau Drag file Excel ke sini</p>
                            </>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold hover:bg-white transition">Batal</button>
                    <button onClick={handleSubmitImport} disabled={uploading || !importFile} className="px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition shadow-lg flex items-center gap-2 disabled:opacity-50">{uploading ? 'Mengupload...' : <><FaFileUpload /> Proses Import</>}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenMitra;