// src/pages/admin/EditKegiatan.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import PartSubKegiatan from '../../components/admin/PartSubKegiatan';
import { FaArrowLeft, FaCheck, FaArrowRight, FaLayerGroup, FaPlus } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const EditKegiatan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State untuk Data Induk Kegiatan
  const [indukData, setIndukData] = useState({
    nama_kegiatan: '', 
    deskripsi: ''
  });

  // State untuk Daftar Sub Kegiatan & Honorarium
  const [subKegiatans, setSubKegiatans] = useState([]);

  // State untuk Melacak ID Asli (Database) guna logika Hapus/Update
  const [originalSubIds, setOriginalSubIds] = useState([]);
  const [originalHonorIds, setOriginalHonorIds] = useState([]);

  // --- 1. FETCH DATA (LOAD) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resInduk, resSub, resHonor] = await Promise.all([
          axios.get(`${API_URL}/api/kegiatan/${id}`, { headers }),
          axios.get(`${API_URL}/api/subkegiatan/kegiatan/${id}`, { headers }),
          axios.get(`${API_URL}/api/honorarium`, { headers }) 
        ]);

        // Set Data Induk
        setIndukData({
          nama_kegiatan: resInduk.data.data.nama_kegiatan,
          deskripsi: resInduk.data.data.deskripsi || ''
        });

        const allHonors = resHonor.data.data;

        // Mapping Sub Kegiatan & Honorarium
        const mappedSubs = resSub.data.map(sub => {
          // Filter honorarium milik sub kegiatan ini
          const myHonors = allHonors.filter(h => h.id_subkegiatan === sub.id).map(h => ({
            id: h.id_honorarium, 
            kode_jabatan: h.kode_jabatan,
            tarif: Number(h.tarif),
            id_satuan: h.id_satuan,
            basis_volume: h.basis_volume,
            beban_anggaran: h.beban_anggaran || '' // [FIX 1] Load beban_anggaran
          }));

          return {
            id: sub.id, // ID Sub (String jika dari DB)
            nama_sub_kegiatan: sub.nama_sub_kegiatan,
            deskripsi: sub.deskripsi || '',
            periode: sub.periode || '',
            tanggal_mulai: sub.tanggal_mulai ? sub.tanggal_mulai.split('T')[0] : '',
            tanggal_selesai: sub.tanggal_selesai ? sub.tanggal_selesai.split('T')[0] : '',
            open_req: sub.open_req ? sub.open_req.split('T')[0] : '',
            close_req: sub.close_req ? sub.close_req.split('T')[0] : '',
            honorList: myHonors
          };
        });

        setSubKegiatans(mappedSubs);

        // Simpan ID Asli untuk pelacakan penghapusan
        setOriginalSubIds(mappedSubs.map(s => s.id));
        
        const allHonorIds = [];
        mappedSubs.forEach(s => s.honorList.forEach(h => allHonorIds.push(h.id)));
        setOriginalHonorIds(allHonorIds);

      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memuat data survei/sensus.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // --- HANDLERS ---

  const handleNextStep = () => {
    if (!indukData.nama_kegiatan) {
        return Swal.fire('Validasi Gagal', 'Nama Survei/Sensus wajib diisi', 'warning');
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const addSubCard = () => {
    setSubKegiatans([...subKegiatans, { 
      id: Date.now(), // ID Sementara (Number)
      nama_sub_kegiatan: '', 
      deskripsi: '', 
      periode: '', 
      tanggal_mulai: '', 
      tanggal_selesai: '', 
      open_req: '', 
      close_req: '',
      honorList: [] 
    }]);
  };

  // --- 2. HANDLE SUBMIT (SAVE/UPDATE/DELETE) ---
  const handleFinalSubmit = async () => {
    // Validasi Frontend Sederhana
    for (const sub of subKegiatans) {
      if (!sub.nama_sub_kegiatan) return Swal.fire('Gagal', 'Nama Kegiatan tidak boleh kosong.', 'error');
      for (const h of sub.honorList) {
        if (!h.kode_jabatan) return Swal.fire('Gagal', `Jabatan pada kegiatan "${sub.nama_sub_kegiatan}" belum dipilih.`, 'error');
        if (h.tarif <= 0) return Swal.fire('Gagal', `Tarif pada kegiatan "${sub.nama_sub_kegiatan}" tidak valid.`, 'error');
      }
    }

    setSaving(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // --- A. LOGIKA PENGHAPUSAN (DELETE) ---
      // Bandingkan data di form saat ini dengan data asli (originalIds)
      
      // 1. Hapus Honorarium yang hilang
      const currentHonorIds = subKegiatans.flatMap(s => s.honorList.map(h => h.id));
      const honorsToDelete = originalHonorIds.filter(oldId => !currentHonorIds.includes(oldId));
      
      if (honorsToDelete.length > 0) {
          await Promise.all(honorsToDelete.map(hId => 
              axios.delete(`${API_URL}/api/honorarium/${hId}`, config)
          ));
      }

      // 2. Hapus Sub Kegiatan yang hilang
      const currentSubIds = subKegiatans.map(s => s.id);
      const subsToDelete = originalSubIds.filter(oldId => !currentSubIds.includes(oldId));
      
      if (subsToDelete.length > 0) {
          await Promise.all(subsToDelete.map(delId => 
              axios.delete(`${API_URL}/api/subkegiatan/${delId}`, config)
          ));
      }

      // --- B. UPDATE KEGIATAN INDUK ---
      await axios.put(`${API_URL}/api/kegiatan/${id}`, indukData, config);

      // --- C. UPSERT SUB KEGIATAN & HONORARIUM ---
      for (const sub of subKegiatans) {
        let subId = sub.id;
        
        const payloadSub = {
          id_kegiatan: id,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          deskripsi: sub.deskripsi,
          periode: sub.periode,
          tanggal_mulai: sub.tanggal_mulai,
          tanggal_selesai: sub.tanggal_selesai,
          open_req: sub.open_req,
          close_req: sub.close_req
        };

        // Cek ID Sub Kegiatan: Number (Date.now) = BARU, String (DB ID) = LAMA
        if (typeof sub.id === 'number') {
          // INSERT Sub Baru
          const res = await axios.post(`${API_URL}/api/subkegiatan`, {
             ...payloadSub, 
             mode_kegiatan: 'existing'
          }, config);
          subId = res.data.data.id; // Dapatkan ID baru dari server
        } else {
          // UPDATE Sub Lama
          await axios.put(`${API_URL}/api/subkegiatan/${subId}/info`, payloadSub, config);
        }

        // Proses Honorarium di dalam Sub tersebut
        for (const h of sub.honorList) {
          const payloadHonor = {
            id_subkegiatan: subId, // Gunakan ID Sub yang valid (baru/lama)
            kode_jabatan: h.kode_jabatan,
            tarif: h.tarif,
            id_satuan: h.id_satuan || 1, 
            basis_volume: h.basis_volume || 1,
            beban_anggaran: h.beban_anggaran // [FIX 2] Kirim beban_anggaran
          };

          // [FIX 3] Logika Cek Update vs Insert Honorarium
          // Gunakan originalHonorIds untuk memastikan ID berasal dari DB
          if (originalHonorIds.includes(h.id)) {
            // UPDATE: Jika ID ada di daftar asli
            await axios.put(`${API_URL}/api/honorarium/${h.id}`, payloadHonor, config);
          } else {
            // INSERT: Jika ID tidak ada di daftar asli (ID sementara dari Date.now)
            await axios.post(`${API_URL}/api/honorarium`, payloadHonor, config);
          }
        }
      }

      Swal.fire({
        title: 'Tersimpan!',
        text: 'Perubahan survei/sensus berhasil disimpan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/admin/manage-kegiatan');
      });

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Terjadi kesalahan saat menyimpan.';
      Swal.fire('Gagal', msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Memuat data survei/sensus...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/manage-kegiatan" className="text-gray-500 hover:text-[#1A2A80] transition">
          <FaArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Survei/Sensus</h1>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200 text-gray-500'}`}>1. Induk</span>
            <span className="text-gray-300">/</span>
            <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200 text-gray-500'}`}>2. Rincian & Honor</span>
          </p>
        </div>
      </div>

      {/* STEP 1: FORM INDUK */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
             <div className="bg-blue-100 text-[#1A2A80] p-2 rounded-lg"><FaLayerGroup /></div>
             <h2 className="text-lg font-bold text-gray-800">Informasi Dasar Survei/Sensus</h2>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nama Survei/Sensus</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none" 
                value={indukData.nama_kegiatan} 
                onChange={(e) => setIndukData({...indukData, nama_kegiatan: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Singkat</label>
              <textarea 
                rows="4" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none resize-none" 
                value={indukData.deskripsi} 
                onChange={(e) => setIndukData({...indukData, deskripsi: e.target.value})} 
              />
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Link to="/admin/manage-kegiatan" className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">
                Batal
            </Link>
            <button 
              onClick={handleNextStep}
              className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg flex items-center gap-2 transform active:scale-95 transition"
            >
              Lanjut Edit Rincian <FaArrowRight size={12}/>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FORM SUB KEGIATAN & HONOR */}
      {step === 2 && (
        <div className="animate-fade-in-up">
          
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl mb-8 flex justify-between items-center shadow-sm">
             <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Sedang Mengedit</span>
                <h2 className="text-xl font-bold text-gray-800 mt-1">{indukData.nama_kegiatan}</h2>
             </div>
             <button onClick={() => setStep(1)} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline bg-white px-4 py-2 rounded-lg shadow-sm">
                Edit Induk
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
              disabled={saving}
              className="px-10 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-xl flex items-center gap-3 disabled:opacity-50 transform active:scale-95 transition"
            >
              {saving ? 'Menyimpan...' : <><FaCheck /> Simpan Perubahan</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EditKegiatan;