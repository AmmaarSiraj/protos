// src/pages/admin/EditKegiatan.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import PartSubKegiatan from '../../components/admin/PartSubKegiatan';
import { FaArrowLeft, FaCheck, FaArrowRight, FaLayerGroup, FaPlus } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const EditKegiatan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Data
  const [indukData, setIndukData] = useState({ nama_kegiatan: '', deskripsi: '' });
  const [subKegiatans, setSubKegiatans] = useState([]);

  // State untuk melacak ID awal (untuk fitur hapus)
  const [originalSubIds, setOriginalSubIds] = useState([]);
  const [originalHonorIds, setOriginalHonorIds] = useState([]); // [BARU] Melacak honor awal

  // --- FETCH DATA ---
  useEffect(() => {
    fetchData();
  }, [id]);

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

      setIndukData({
        nama_kegiatan: resInduk.data.data.nama_kegiatan,
        deskripsi: resInduk.data.data.deskripsi || ''
      });

      const allHonors = resHonor.data.data;
      
      // [BARU] Simpan semua ID honor yang terkait dengan kegiatan ini sejak awal
      // Kita perlu filter honor yang id_subkegiatan-nya ada di list sub kegiatan kita
      const currentSubIdsFromDb = resSub.data.map(s => s.id);
      const relevantHonors = allHonors.filter(h => currentSubIdsFromDb.includes(h.id_subkegiatan));
      setOriginalHonorIds(relevantHonors.map(h => h.id || h.id_honorarium));

      const mappedSubs = resSub.data.map(sub => {
        const myHonors = allHonors.filter(h => h.id_subkegiatan === sub.id).map(h => ({
          // Pastikan ID tersimpan dengan benar
          id: h.id || h.id_honorarium, 
          kode_jabatan: h.kode_jabatan,
          tarif: Number(h.tarif),
          id_satuan: h.id_satuan,
          basis_volume: h.basis_volume,
          beban_anggaran: h.beban_anggaran || ''
        }));

        return {
          id: sub.id, 
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
      setOriginalSubIds(mappedSubs.map(s => s.id));

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (!indukData.nama_kegiatan) return Swal.fire('Validasi', 'Nama Kegiatan wajib diisi', 'warning');
    setStep(2);
    window.scrollTo(0, 0);
  };

  const addSubCard = () => {
    setSubKegiatans([...subKegiatans, { 
      id: Date.now(), 
      nama_sub_kegiatan: '', 
      deskripsi: '', honorList: [] 
    }]);
  };

  // --- SAVE LOGIC ---
  const handleFinalSubmit = async () => {
    // Validasi Sederhana
    for (const sub of subKegiatans) {
      if (!sub.nama_sub_kegiatan) return Swal.fire('Gagal', 'Nama Kegiatan tidak boleh kosong.', 'error');
    }

    setSaving(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // --- LANGKAH 1: UPDATE KEGIATAN INDUK ---
      await axios.put(`${API_URL}/api/kegiatan/${id}`, indukData, config);

      // --- LANGKAH 2: DETEKSI & HAPUS HONOR YANG DIBUANG ---
      // Kumpulkan ID honor yang masih ada di UI saat ini
      const currentHonorIds = [];
      subKegiatans.forEach(sub => {
        sub.honorList.forEach(h => {
          const hId = h.id || h.id_honorarium;
          // Hanya masukkan ID valid (bukan ID sementara timestamp dari Date.now())
          if (hId && (typeof hId !== 'number' || hId < 9999999999)) { 
            currentHonorIds.push(hId);
          }
        });
      });

      // Bandingkan: ID yang ada di Original tapi TIDAK ada di Current = HARUS DIHAPUS
      // (Ini otomatis mencakup honor yang hilang karena Sub-Kegiatannya dihapus)
      const honorsToDelete = originalHonorIds.filter(oldId => !currentHonorIds.includes(oldId));

      if (honorsToDelete.length > 0) {
        // Hapus honor terlebih dahulu agar Sub-Kegiatan bisa dihapus (Menghindari error FK Constraint)
        await Promise.all(honorsToDelete.map(delId => 
           axios.delete(`${API_URL}/api/honorarium/${delId}`, config).catch(e => console.warn("Skip error delete honor", e))
        ));
      }

      // --- LANGKAH 3: HAPUS SUB KEGIATAN YANG DIBUANG ---
      const currentSubIds = subKegiatans.map(s => s.id);
      const subsToDelete = originalSubIds.filter(oldId => !currentSubIds.includes(oldId));
      
      if (subsToDelete.length > 0) {
          await Promise.all(subsToDelete.map(delId => 
              axios.delete(`${API_URL}/api/subkegiatan/${delId}`, config)
          ));
      }

      // --- LANGKAH 4: UPSERT (INSERT/UPDATE) SUB KEGIATAN & HONOR ---
      for (const sub of subKegiatans) {
        let subId = sub.id;
        
        // Payload Sub Kegiatan
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

        const isNewSub = typeof sub.id === 'number' && sub.id > 999999; 

        if (isNewSub) {
          const res = await axios.post(`${API_URL}/api/subkegiatan`, {
             ...payloadSub, mode_kegiatan: 'existing'
          }, config);
          subId = res.data.data.id; 
        } else {
          await axios.put(`${API_URL}/api/subkegiatan/${subId}/info`, payloadSub, config);
        }

        // Loop Honorarium
        for (const h of sub.honorList) {
          try {
              const payloadHonor = {
                id_subkegiatan: subId, 
                kode_jabatan: h.kode_jabatan,
                tarif: h.tarif,
                id_satuan: h.id_satuan || 1, 
                basis_volume: h.basis_volume || 1,
                beban_anggaran: h.beban_anggaran 
              };

              const hId = h.id || h.id_honorarium;
              const isNewHonor = !hId || (typeof hId === 'number' && hId > 999999999); 

              if (isNewHonor) {
                await axios.post(`${API_URL}/api/honorarium`, payloadHonor, config);
              } else {
                await axios.put(`${API_URL}/api/honorarium/${hId}`, payloadHonor, config);
              }
          } catch (honorErr) {
              console.warn(`Gagal simpan honor ${h.kode_jabatan}`, honorErr);
          }
        }
      }

      Swal.fire({
        title: 'Tersimpan!',
        text: 'Perubahan berhasil disimpan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        navigate('/admin/manage-kegiatan');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Memuat data...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/manage-kegiatan" className="text-gray-500 hover:text-[#1A2A80] transition">
          <FaArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Survei/Sensus</h1>
          <p className="text-sm text-gray-500">Lengkapi data induk dan rincian sub kegiatan.</p>
        </div>
      </div>

      {/* STEP 1: INDUK */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
             <div className="bg-blue-100 text-[#1A2A80] p-2 rounded-lg"><FaLayerGroup /></div>
             <h2 className="text-lg font-bold text-gray-800">Data Induk</h2>
          </div>
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <label className="font-bold text-gray-700">Nama Kegiatan</label>
              <input 
                className="w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none"
                value={indukData.nama_kegiatan}
                onChange={e => setIndukData({...indukData, nama_kegiatan: e.target.value})}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Deskripsi</label>
              <textarea 
                rows="4"
                className="w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none"
                value={indukData.deskripsi}
                onChange={e => setIndukData({...indukData, deskripsi: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={handleNextStep} className="px-6 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg flex items-center gap-2">
              Lanjut Rincian <FaArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RINCIAN */}
      {step === 2 && (
        <div className="animate-fade-in-up">
          <div className="bg-blue-50 p-4 rounded-xl mb-6 flex justify-between items-center border border-blue-200">
             <h2 className="font-bold text-[#1A2A80]">{indukData.nama_kegiatan}</h2>
             <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-bold hover:underline">Edit Induk</button>
          </div>

          <PartSubKegiatan 
            subKegiatans={subKegiatans} 
            setSubKegiatans={setSubKegiatans}
            onRefresh={fetchData} 
          />

          <button onClick={addSubCard} className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-[#1A2A80] hover:text-[#1A2A80] transition flex justify-center items-center gap-2">
            <FaPlus /> Tambah Sub Kegiatan
          </button>

          <div className="mt-8 flex justify-between pt-6 border-t">
            <button onClick={() => setStep(1)} className="text-gray-600 font-bold flex items-center gap-2">
              <FaArrowLeft /> Kembali
            </button>
            <button onClick={handleFinalSubmit} disabled={saving} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Menyimpan...' : <><FaCheck /> Simpan Semua Perubahan</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditKegiatan;