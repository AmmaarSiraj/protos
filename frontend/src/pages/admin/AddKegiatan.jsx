// src/pages/admin/AddKegiatan.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import PartSubKegiatan from '../../components/admin/PartSubKegiatan';
import { FaArrowLeft, FaPlus, FaCheck, FaLayerGroup, FaArrowRight } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const AddKegiatan = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); 
  const [modeInput, setModeInput] = useState('new'); 
  const [loading, setLoading] = useState(false);

  const [existingKegiatanList, setExistingKegiatanList] = useState([]);
  
  const [indukData, setIndukData] = useState({
    id_selected: '', 
    nama_kegiatan: '', 
    deskripsi: ''
  });

  // State awal sub kegiatan (tanpa periode, open_req, close_req)
  const [subKegiatans, setSubKegiatans] = useState([
    { 
      id: Date.now(), 
      nama_sub_kegiatan: '', 
      deskripsi: '', 
      tanggal_mulai: '', 
      tanggal_selesai: '', 
      honorList: []
    }
  ]);

  useEffect(() => {
    const fetchKeg = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/kegiatan`, { headers: { Authorization: `Bearer ${token}` } });
        setExistingKegiatanList(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchKeg();
  }, []);

  const handleNextStep = () => {
    if (modeInput === 'new' && !indukData.nama_kegiatan) {
        return Swal.fire('Data Belum Lengkap', 'Nama Survei/Sensus Baru wajib diisi', 'warning');
    }
    if (modeInput === 'existing' && !indukData.id_selected) {
        return Swal.fire('Belum Memilih', 'Silakan pilih Survei/Sensus yang sudah ada dari daftar', 'warning');
    }
    
    setStep(2);
    window.scrollTo(0, 0); 
  };

  const addSubCard = () => {
    setSubKegiatans([...subKegiatans, { 
      id: Date.now(), 
      nama_sub_kegiatan: '', 
      deskripsi: '', 
      tanggal_mulai: '', 
      tanggal_selesai: '', 
      honorList: [] 
    }]);
  };

  const handleFinalSubmit = async () => {
    // Validasi Input
    for (const sub of subKegiatans) {
      if (!sub.nama_sub_kegiatan) {
          return Swal.fire('Validasi Gagal', 'Ada nama kegiatan yang masih kosong.', 'error');
      }
      if (!sub.tanggal_mulai) {
          return Swal.fire('Validasi Gagal', `Tanggal Mulai pada "${sub.nama_sub_kegiatan}" wajib diisi.`, 'error');
      }
      for (const h of sub.honorList) {
        if (!h.kode_jabatan) {
            return Swal.fire('Validasi Gagal', `Jabatan pada kegiatan "${sub.nama_sub_kegiatan}" belum dipilih.`, 'error');
        }
        if (h.tarif <= 0) {
            return Swal.fire('Validasi Gagal', `Tarif untuk jabatan pada "${sub.nama_sub_kegiatan}" tidak boleh nol.`, 'error');
        }
      }
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      let idKegiatan = indukData.id_selected;

      // 1. Simpan Kegiatan Induk (Jika Baru)
      if (modeInput === 'new') {
        const resKeg = await axios.post(`${API_URL}/api/kegiatan`, {
          nama_kegiatan: indukData.nama_kegiatan,
          deskripsi: indukData.deskripsi
        }, config);
        idKegiatan = resKeg.data.data.data.kegiatan.id;
      }

      // 2. Simpan Sub Kegiatan & Honorarium
      for (const sub of subKegiatans) {
        // Simpan Sub Kegiatan
        const resSub = await axios.post(`${API_URL}/api/subkegiatan`, {
          mode_kegiatan: 'existing', 
          id_kegiatan: idKegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          deskripsi: sub.deskripsi,
          tanggal_mulai: sub.tanggal_mulai,
          tanggal_selesai: sub.tanggal_selesai
        }, config);

        const newSubId = resSub.data.data.id; 

        // Simpan Honorarium (Looping honorList)
        if (sub.honorList && sub.honorList.length > 0) {
          for (const h of sub.honorList) {
            await axios.post(`${API_URL}/api/honorarium`, {
              id_subkegiatan: newSubId,
              kode_jabatan: h.kode_jabatan,
              tarif: h.tarif,
              id_satuan: h.id_satuan,
              basis_volume: h.basis_volume,
              // PERUBAHAN: Mengirim field beban_anggaran
              beban_anggaran: h.beban_anggaran || null 
            }, config);
          }
        }
      }

      Swal.fire({
        title: 'Berhasil!',
        text: 'Seluruh data survei/sensus tersimpan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/admin/manage-kegiatan');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* HEADER NAVIGASI */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/manage-kegiatan" className="text-gray-500 hover:text-[#1A2A80] transition">
          <FaArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {modeInput === 'new' ? 'Buat Survei/Sensus Baru' : 'Tambah Kegiatan'}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200 text-gray-500'}`}>1. Induk</span>
            <span className="text-gray-300">/</span>
            <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200 text-gray-500'}`}>2. Rincian & Honor</span>
          </p>
        </div>
      </div>

      {/* --- TAHAP 1: KEGIATAN INDUK --- */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-fade-in-up">
          
          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
            <button
              onClick={() => setModeInput('new')}
              className={`px-6 py-4 rounded-xl font-bold border-2 transition flex items-center justify-center gap-3 ${modeInput === 'new' ? 'bg-blue-50 border-[#1A2A80] text-[#1A2A80]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
            >
              <div className={`p-2 rounded-full ${modeInput === 'new' ? 'bg-[#1A2A80] text-white' : 'bg-gray-100'}`}><FaPlus /></div>
              Buat Survei/Sensus Baru
            </button>
            <button
              onClick={() => setModeInput('existing')}
              className={`px-6 py-4 rounded-xl font-bold border-2 transition flex items-center justify-center gap-3 ${modeInput === 'existing' ? 'bg-blue-50 border-[#1A2A80] text-[#1A2A80]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
            >
              <div className={`p-2 rounded-full ${modeInput === 'existing' ? 'bg-[#1A2A80] text-white' : 'bg-gray-100'}`}><FaLayerGroup /></div>
              Pilih Yang Sudah Ada
            </button>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {modeInput === 'existing' ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Survei/Sensus Induk</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none"
                  value={indukData.id_selected}
                  onChange={(e) => setIndukData({...indukData, id_selected: e.target.value})}
                >
                  <option value="">-- Pilih Survei/Sensus --</option>
                  {existingKegiatanList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kegiatan}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Survei/Sensus <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none" 
                    placeholder="Contoh: Sensus Ekonomi 2026" 
                    value={indukData.nama_kegiatan} 
                    onChange={(e) => setIndukData({...indukData, nama_kegiatan: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Singkat</label>
                  <textarea 
                    rows="4" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none resize-none" 
                    placeholder="Jelaskan tujuan survei/sensus ini..."
                    value={indukData.deskripsi} 
                    onChange={(e) => setIndukData({...indukData, deskripsi: e.target.value})} 
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Link to="/admin/manage-kegiatan" className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">
                Batal
            </Link>
            <button 
              onClick={handleNextStep}
              className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg flex items-center gap-2 transform active:scale-95 transition"
            >
              Lanjut Isi Rincian <FaArrowRight size={12}/>
            </button>
          </div>
        </div>
      )}

      {/* --- TAHAP 2: SUB KEGIATAN & HONOR --- */}
      {step === 2 && (
        <div className="animate-fade-in-up">
          
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl mb-8 flex justify-between items-center shadow-sm">
             <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Survei/Sensus Induk Terpilih</span>
                <h2 className="text-xl font-bold text-gray-800 mt-1">
                  {modeInput === 'new' ? indukData.nama_kegiatan : existingKegiatanList.find(k => k.id == indukData.id_selected)?.nama_kegiatan || 'Tidak diketahui'}
                </h2>
             </div>
             <button onClick={() => setStep(1)} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline bg-white px-4 py-2 rounded-lg shadow-sm">
                Ubah Survei/Sensus
             </button>
          </div>

          <PartSubKegiatan 
            subKegiatans={subKegiatans} 
            setSubKegiatans={setSubKegiatans} 
          />

          <button 
            onClick={addSubCard}
            className="w-full mt-8 py-5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:bg-white hover:border-[#1A2A80] hover:text-[#1A2A80] hover:shadow-md transition flex justify-center items-center gap-3 group"
          >
            <div className="bg-gray-200 group-hover:bg-[#1A2A80] text-white p-2 rounded-full transition">
                <FaPlus size={14} />
            </div>
            Tambah Kegiatan Lain
          </button>

          <div className="mt-12 flex justify-between items-center pt-8 border-t border-gray-200">
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition flex items-center gap-2"
            >
              <FaArrowLeft size={12} /> Kembali
            </button>
            <button 
              onClick={handleFinalSubmit}
              disabled={loading}
              className="px-10 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-xl flex items-center gap-3 disabled:opacity-50 transform active:scale-95 transition"
            >
              {loading ? 'Menyimpan Data...' : <><FaCheck /> Selesai & Simpan Semua</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddKegiatan;